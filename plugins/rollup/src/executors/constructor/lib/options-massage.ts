import * as ts from 'typescript';
import * as rollup from 'rollup';
import { NormalizedRollupExecutorOptions } from './normalize';
import {
    calculateProjectBuildableDependencies,
    computeCompilerOptionsPaths,
    DependentBuildableProjectNode,
} from '@nx/js/src/utils/buildable-libs-utils';
import { ExecutorContext, joinPathFragments } from '@nx/devkit';
import { dirname, parse, resolve } from 'path';

export function createRollupOptions(
    options: NormalizedRollupExecutorOptions,
    dependencies: DependentBuildableProjectNode[],
    context: ExecutorContext,
    packageJson: any,
    sourceRoot: string,
    npmDeps: string[]
): InputOptions[] {
    const useBabel = options.compiler === 'babel';
    const useTsc = options.compiler === 'tsc';
    const useSwc = options.compiler === 'swc';

    // Get the full path to the tsconfig file.
    const tsConfigPath = joinPathFragments(context.root, options.tsConfig);

    // Read the tsconfig file.
    const configFile = ts.readConfigFile(tsConfigPath, ts.sys.readFile);

    // Parse the contents of the config file (tsconfig.json).
    const config = ts.parseJsonConfigFileContent(
        configFile.config,
        ts.sys,
        dirname(tsConfigPath)
    );

    // If the user did not provide a format, provide a default based on the
    // module type in tsconfig.json.
    if (!options.format || !options.format.length) {
        options.format = readCompatibleFormats(config);
    }

    // Create a set of input options for each format.
    return options.format.map((format) =>
        optionsForFormat(
            format,
            options,
            packageJson,
            context,
            dependencies,
            npmDeps
        )
    );
}

/**
 * Create a set of input options for a format.
 */
function optionsForFormat(
    format: string,
    options: NormalizedRollupExecutorOptions,
    packageJson: any,
    context: ExecutorContext,
    dependencies: DependentBuildableProjectNode[],
    npmDeps: string[]
): rollup.InputOptions {
    // Either we're generating only one format, so we should bundle types
    // OR we are generating dual formats, so only bundle types for CJS.
    const shouldBundleTypes = options.format.length === 1 || format === 'cjs';

    const plugins = [
        copy({
            targets: convertCopyAssetsToRollupOptions(
                options.outputPath,
                options.assets
            ),
        }),
        image(),
        json(),
        (useTsc || shouldBundleTypes) &&
            require('rollup-plugin-typescript2')({
                check: !options.skipTypeCheck,
                tsconfig: options.tsConfig,
                tsconfigOverride: {
                    compilerOptions: createTsCompilerOptions(
                        config,
                        dependencies,
                        options
                    ),
                },
            }),
        shouldBundleTypes &&
            typeDefinitions({
                main: options.main,
                projectRoot: options.projectRoot,
            }),
        peerDepsExternal({
            packageJsonPath: options.project,
        }),
        postcss({
            inject: true,
            extract: options.extractCss,
            autoModules: true,
            plugins: [autoprefixer],
            use: {
                less: {
                    javascriptEnabled: options.javascriptEnabled,
                },
            },
        }),
        nodeResolve({
            preferBuiltins: true,
            extensions: fileExtensions,
        }),
        useSwc && swc(),
        useBabel &&
            getBabelInputPlugin({
                // Lets `@nx/js/babel` preset know that we are packaging.
                caller: {
                    // @ts-ignore
                    // Ignoring type checks for caller since we have custom attributes
                    isNxPackage: true,
                    // Always target esnext and let rollup handle cjs
                    supportsStaticESM: true,
                    isModern: true,
                },
                cwd: join(context.root, sourceRoot),
                rootMode: options.babelUpwardRootMode ? 'upward' : undefined,
                babelrc: true,
                extensions: fileExtensions,
                babelHelpers: 'bundled',
                skipPreflightCheck: true, // pre-flight check may yield false positives and also slows down the build
                exclude: /node_modules/,
                plugins: [
                    format === 'esm'
                        ? undefined
                        : require.resolve(
                              'babel-plugin-transform-async-to-promises'
                          ),
                ].filter(Boolean),
            }),
        commonjs(),
        analyze(),
    ];

    // Compute the external dependencies.
    const externalPackages = computeExternalDeps(
        packageJson,
        dependencies,
        npmDeps,
        options
    );

    const mainEntryFileName = options.outputFileName || options.main;
    const input: Record<string, string> = {};
    input[parse(mainEntryFileName).name] = options.main;
    options.additionalEntryPoints.forEach((entry) => {
        input[parse(entry).name] = entry;
    });

    const rollupConfig = {
        input,
        output: {
            format,
            dir: `${options.outputPath}`,
            name: names(context.projectName).className,
            entryFileNames: `[name].${format}.js`,
            chunkFileNames: `[name].${format}.js`,
        },
        external: (id: string) => {
            return externalPackages.some(
                (name) => id === name || id.startsWith(`${name}/`)
            ); // Could be a deep import
        },
        plugins,
    };

    return options.rollupConfig.reduce((currentConfig, plugin) => {
        return require(plugin)(currentConfig, options);
    }, rollupConfig);
}

/**
 * Detects the compatible formats based on the tsconfig file's module type.
 *
 * @param config The parsed tsconfig file.
 * @returns The compatible formats (CommonJs or ESM).
 */
export function readCompatibleFormats(
    config: ts.ParsedCommandLine
): ('cjs' | 'esm')[] {
    switch (config.options.module) {
        case ts.ModuleKind.CommonJS:
        case ts.ModuleKind.UMD:
        case ts.ModuleKind.AMD:
            return ['cjs'];
        default:
            return ['esm'];
    }
}

/**
 *
 */
export function resolveOutfile(
    context: ExecutorContext,
    options: NormalizedRollupExecutorOptions
) {
    if (!options.format?.includes('cjs')) return undefined;
    const { name } = parse(options.outputFileName ?? options.main);
    return resolve(context.root, options.outputPath, `${name}.cjs.js`);
}

/**
 * Compute external dependencies.
 *
 * @param packageJson The package.json file.
 * @param dependencies The dependencies of the project.
 * @param npmDeps The npm dependencies of the project.
 * @param options The options provided by the user.
 * @returns The list of unique external dependencies.
 */
export function computeExternalDeps(
    packageJson: any,
    dependencies: DependentBuildableProjectNode[],
    npmDeps: string[],
    options: NormalizedRollupExecutorOptions
) {
    // Include all dependencies and peerDependencies in externalPackages.
    // If external=None than the result will include only these dependencies.
    let externalPackages = [
        ...Object.keys(packageJson.dependencies || {}),
        ...Object.keys(packageJson.peerDependencies || {}),
    ];

    if (options.external === 'all') {
        externalPackages = externalPackages
            .concat(dependencies.map((d) => d.name))
            .concat(npmDeps);
    } else if (Array.isArray(options.external) && options.external.length > 0) {
        externalPackages = externalPackages.concat(options.external);
    }

    return [...new Set(externalPackages)];
}
