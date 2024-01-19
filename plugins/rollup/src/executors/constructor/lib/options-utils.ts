import * as ts from 'typescript';
import { join, parse, resolve } from 'path';
import {
    DependentBuildableProjectNode, computeCompilerOptionsPaths,
} from '@nx/js/src/utils/buildable-libs-utils';
import { ExecutorContext } from '@nx/devkit';

import { AssetGlobPattern } from '../schema';
import { ExecutorData, RollupCopyAssetOption } from './common';
import { NormalizedRollupExecutorOptions } from './normalize';


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
 * For cjs returns the same name as the output file with the .cjs.js suffix.
 *
 * @param context The executor context.
 * @param options The options provided by the user.
 * @returns The name of the output file or `undefined` if the format is not cjs.
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


/**
 * Create explicit input-output object for rollup from options.
 *
 * @param outputPath The path to the output directory.
 * @param assets The options provided by the user.
 *
 * @returns The list of rollup options.
 */
export function convertCopyAssetsToRollupOptions(
    outputPath: string,
    assets: AssetGlobPattern[]
): RollupCopyAssetOption[] {
    return assets
        ? assets.map((a) => ({
            src: join(a.input, a.glob).replace(/\\/g, '/'),
            dest: join(outputPath, a.output).replace(/\\/g, '/'),
        }))
        : undefined;
}


export function createTsCompilerOptions(executorData: ExecutorData) {
    const { options, dependencies, tsConfig } = executorData;
    const compilerOptionPaths = computeCompilerOptionsPaths(
        tsConfig, dependencies
    );
    const compilerOptions = {
        rootDir: options.projectRoot,
        allowJs: options.allowJs,
        declaration: true,
        paths: compilerOptionPaths,
    };
    if (tsConfig.options.module === ts.ModuleKind.CommonJS) {
        compilerOptions['module'] = 'ESNext';
    }
    if (options.compiler === 'swc') {
        compilerOptions['emitDeclarationOnly'] = true;
    }
    return compilerOptions;
}
