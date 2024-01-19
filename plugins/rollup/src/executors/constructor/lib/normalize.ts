import { basename, dirname, join, relative, resolve } from 'path';
import { statSync } from 'fs';
import { ExecutorContext, normalizePath } from '@nx/devkit';
import { createEntryPoints } from '@nx/js';
import { AssetGlobPattern, ConstructorExecutorSchema } from '../schema';

/**
 * The normalized options resulted from those provided by the user
 * in `project.json`.
 */
export interface NormalizedRollupExecutorOptions
    extends ConstructorExecutorSchema {
    /**
     * The path of the directory containing the `main` file.
     */
    entryRoot: string;

    /**
     * The root directory for the package.
     */
    projectRoot: string;

    /**
     * List of static assets.
     */
    assets: AssetGlobPattern[];

    /**
     * Path to functions which takes a rollup config and returns an
     * updated rollup config.
     */
    rollupConfig: string[];
}

/**
 * Normalize the options provided by the user in `project.json`.
 * @param options The options provided by the user.
 * @param context The context of the executor.
 * @param sourceRoot The root directory of the project.
 * @returns The normalized options.
 */
export function normalizeRollupExecutorOptions(
    options: ConstructorExecutorSchema,
    context: ExecutorContext,
    sourceRoot: string
): NormalizedRollupExecutorOptions {
    // Get the root of the workspace.
    const { root } = context;

    // The path to the entry file is relative to workspace.
    const main = `${root}/${options.main}`;

    // Compute the path of the containing directory.
    const entryRoot = dirname(main);

    // Compute the path to the project's package.json file.
    // If not provided in options, use the package.json file at the top level.
    const project = options.project
        ? `${root}/${options.project}`
        : join(root, 'package.json');

    // Compute the root directory for the package.
    const projectRoot = dirname(project);

    // Compute the output path for the generated files.
    const outputPath = `${root}/${options.outputPath}`;

    return {
        ...options,

        // de-dupe formats
        format: Array.from(new Set(options.format)),

        // Shallow-copy the array, eliminate empty strings, and compute
        // the absolute path to each plugin.
        rollupConfig: []
            .concat(options.rollupConfig)
            .filter(Boolean)
            .map((p) => normalizePluginPath(p, root)),

        // Convert string assets to AssetGlobPattern objects.
        assets: options.assets
            ? options.assets.map((asset) =>
                  normalizeAsset(asset, root, sourceRoot)
              )
            : undefined,

        additionalEntryPoints: createEntryPoints(
            options.additionalEntryPoints,
            context.root
        ),

        // And the rest.
        main,
        entryRoot,
        project,
        projectRoot,
        outputPath,
        skipTypeCheck: options.skipTypeCheck || false,
    };
}

/**
 * Compute the absolute path to the plugin.
 *
 * The function attempts to resolve the plugin as a package first.
 * If that fails, it attempts to resolve it as an absolute path.
 *
 * @param pluginPath The input path.
 * @param root The root directory of the workspace.
 */
export function normalizePluginPath(pluginPath: string, root: string) {
    // This possibility has already been handled by `.filter(Boolean)`.
    // if (!pluginPath) {
    //     return '';
    // }
    try {
        // Attempt to resolve it as a package.
        return require.resolve(pluginPath);
    } catch {
        // Fall back to resolving it as an absolute path.
        return resolve(root, pluginPath);
    }
}

/**
 * Create a standard asset record.
 *
 * The user may input a string or detailed information. For string input
 * the function creates an asset object.
 *
 * @param asset The asset input.
 * @param root The root directory of the workspace.
 * @param sourceRoot The root directory of the project.
 * @returns The normalized asset.
 */
export function normalizeAsset(
    asset: string | AssetGlobPattern,
    root: string,
    sourceRoot: string
): AssetGlobPattern {
    if (typeof asset === 'string') {
        // Convert to a unix style path.
        const assetPath = normalizePath(asset);

        // Get the absolute path.
        const resolvedAssetPath = resolve(root, assetPath);

        // Get the absolute path to the project source root.
        const resolvedSourceRoot = resolve(root, sourceRoot);

        // Ensure the asset path starts with the project source root.
        if (!resolvedAssetPath.startsWith(resolvedSourceRoot)) {
            throw new Error(
                `The ${resolvedAssetPath} asset path must start with the ` +
                    `project source root: ${sourceRoot}`
            );
        }

        // Compute the proper asset entry.
        const isDirectory = statSync(resolvedAssetPath).isDirectory();
        const input = isDirectory
            ? resolvedAssetPath
            : dirname(resolvedAssetPath);
        const output = relative(resolvedSourceRoot, resolve(root, input));
        const glob = isDirectory ? '**/*' : basename(resolvedAssetPath);
        return {
            input,
            output,
            glob,
        };
    } else {
        if (asset.output.startsWith('..')) {
            throw new Error(
                'An asset cannot be written to a location outside of the output path.'
            );
        }

        // Convert to a unix style path.
        const assetPath = normalizePath(asset.input);

        return {
            ...asset,

            // Get the absolute path.
            input: resolve(root, assetPath),

            // Now we remove starting slash to make Webpack place
            // it from the output root.
            output: asset.output.replace(/^\//, ''),
        };
    }
}
