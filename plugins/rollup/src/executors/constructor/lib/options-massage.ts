import * as ts from 'typescript';
import * as rollup from 'rollup';
import { dirname, join, parse } from 'path';
import { joinPathFragments, names } from '@nx/devkit';
import { typeDefinitions } from '@nx/js/src/plugins/rollup/type-definitions';
import nodeResolve from '@rollup/plugin-node-resolve';
import { getBabelInputPlugin } from '@rollup/plugin-babel';
import * as peerDepsExternal from 'rollup-plugin-peer-deps-external';
import * as autoprefixer from 'autoprefixer';

import {
    computeExternalDeps, convertCopyAssetsToRollupOptions,
    createTsCompilerOptions, readCompatibleFormats
} from './options-utils';
import { swc } from '../plugins/swc-plugin';
import { analyze } from '../plugins/analyze-plugin';
import { ExecutorData } from './common';


// These use require because the ES import isn't correct.
const commonjs = require('@rollup/plugin-commonjs');
const image = require('@rollup/plugin-image');
const json = require('@rollup/plugin-json');
const copy = require('rollup-plugin-copy');
const postcss = require('rollup-plugin-postcss');


// The extensions that we want to support.
const fileExtensions = ['.js', '.jsx', '.ts', '.tsx'];


/**
 * Compute one set of rollup options for each format.
 *
 * @param options The options provided by the user, normalized.
 * @param dependencies The dependencies of the project.
 * @param context The executor context.
 * @param packageJson The package.json file content.
 * @param sourceRoot The source root of the project.
 * @param npmDeps The `npm:` dependencies of the project.
 */
export function createRollupOptions(
    executorData: ExecutorData
): rollup.RollupWatchOptions[] {
    const { context, options } = executorData;

    // Get the full path to the tsconfig file.
    const tsConfigPath = joinPathFragments(context.root, options.tsConfig);

    // Read the tsconfig file.
    const configFile = ts.readConfigFile(tsConfigPath, ts.sys.readFile);

    // Parse the contents of the config file (tsconfig.json).
    executorData.tsConfig = ts.parseJsonConfigFileContent(
        configFile.config,
        ts.sys,
        dirname(tsConfigPath)
    );

    // If the user did not provide a format, provide a default based on the
    // module type in tsconfig.json.
    if (!options.format || !options.format.length) {
        options.format = readCompatibleFormats(executorData.tsConfig);
    }

    // Create a set of input options for each format.
    return options.format.map(
        (format: rollup.ModuleFormat) => optionsForFormat(format, executorData)
    );
}


/**
 * Create a set of input options for a format.
 *
 * @param format The format to create the options for.
 * @param options The options provided by the user, normalized.
 * @param packageJson The package.json file content.
 * @param context The executor context.
 * @param dependencies The dependencies of the project.
 * @param sourceRoot The source root of the project.
 * @param npmDeps The `npm:` dependencies of the project.
 */
function optionsForFormat(
    format: rollup.ModuleFormat,
    executorData: ExecutorData
): rollup.RollupWatchOptions {
    const {
        options, dependencies, context, packageJson, npmDeps, sourceRoot
    } = executorData;

    const useBabel = options.compiler === 'babel';
    const useTsc = options.compiler === 'tsc';
    const useSwc = options.compiler === 'swc';

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
                compilerOptions: createTsCompilerOptions(executorData),
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
                // Ignoring type checks for caller since we have custom
                // attributes
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
            // pre-flight check may yield false positives and also slows
            // down the build
            skipPreflightCheck: true,
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

    // Accumulates the entry points.
    const input: Record<string, string> = {};

    // Derive the name of the main entry file and add it as entry point.
    const mainEntryFileName = parse(
        options.outputFileName || options.main
    ).name;
    input[mainEntryFileName] = options.main;

    // Add all other entry points defined in options.
    options.additionalEntryPoints.forEach((entry) => {
        input[parse(entry).name] = entry;
    });

    // Create the initial rollup config.
    const rollupConfig: rollup.RollupWatchOptions = {
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
                (name: string) => id === name || id.startsWith(`${name}/`)
            ); // Could be a deep import
        },
        plugins,
    };

    // Go through each plugin and apply it to the rollup config.
    // The final result is returned to the caller.
    return options.rollupConfig.reduce(
        (currentConfig: rollup.RollupWatchOptions, plugin: string) => {
            return require(plugin)(currentConfig, options);
        }, rollupConfig
    );
}
