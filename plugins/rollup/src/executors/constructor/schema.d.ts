type Compiler = 'babel' | 'swc';

/**
 * The components of a single asset glob pattern.
 */
export interface AssetGlobPattern {
    /**
     * The pattern to match.
     */
    glob: string;

    /**
     * The input directory path in which to apply `glob`.
     *
     * @default the project root.
     */
    input: string;

    /**
     * Relative path within the output folder.
     */
    output: string;

    /**
     * The glob patterns to exclude.
     */
    ignore?: string[];
}


// export interface Globals {
//     moduleId: string;
//     global: string;
// }


/**
 * The options provided by the user in `project.json`.
 */
export interface ConstructorExecutorSchema {
    /**
     * The path to project's package.json file.
     *
     * The path is relative to the root directory of the workspace.
     *
     * If this value is an empty string the package at the top (workspace)
     * level will be used.
     */
    project: string;

    /**
     * The path to the entry file, relative to project directory.
     *
     * The project directory is the directory where the package.json file
     * is located.
     */
    main: string;

    /**
     * The output path of the generated files.
     *
     * The path is relative to the root directory of the workspace.
     */
    outputPath: string;

    /**
     * Name of the main output file.
     *
     * @default the basename of the 'main' file.
     */
    outputFileName?: string;

    /**
     * Delete the output path before building.
     */
    deleteOutputPath?: boolean;

    /**
     * The path to tsconfig file.
     *
     * The path is relative to the root directory of the workspace.
     */
    tsConfig: string;

    /**
     * Allow JavaScript files to be compiled.
     */
    allowJs?: boolean;

    /**
     * List of module formats to output.
     *
     * Defaults to matching format from tsconfig (e.g. CJS for CommonJS,
     * and ESM otherwise).
     */
    format?: ('cjs' | 'esm')[];

    /**
     * A list of external modules that will not be bundled.
     *
     * The final list always includes the `dependencies` and `peerDependencies`
     * from the project's `package.json` file. If this options is `none then
     * this is the final list.
     *
     * If this option is an array, it will be concatenated to the default list.
     * If this is option `'all'`, all modules will be external.
     * Example: `react`, `react-dom`.
     */
    external?: string[] | 'all' | 'none';

    /**
     * Enable re-building when files change.
     */
    watch?: boolean;

    /**
     * Config adjusters.
     *
     * The value or each member of the array is the path to a module (evaluated
     * using `resolve`). The default export of each module is a function
     * with following signature:
     * ```ts
     * (
     *     config: RollupWatchOptions,
     *     options: NormalizedRollupExecutorOptions
     * ) => RollupWatchOptions
     * ```
     */
    rollupConfig?: string | string[];

    /**
     * CSS files will be extracted to the output folder.
     *
     * Alternatively custom filename can be provided (e.g. styles.css).
     */
    extractCss?: boolean | string;

    /**
     * List of static assets.
     */
    assets?: (string | AssetGlobPattern)[];

    /**
     * Which compiler to use.
     */
    compiler?: 'babel' | 'tsc' | 'swc';

    /**
     * Whether to set rootmode to upward.
     *
     * @see https://babeljs.io/docs/en/options#rootmode
     */
    babelUpwardRootMode?: boolean;

    /**
     * Sets `javascriptEnabled` option for the less loader.
     */
    javascriptEnabled?: boolean;

    /**
     * Update the output package.json file's 'exports' field.
     *
     * This field is used by Node and bundles.
     */
    generateExportsField?: boolean;

    /**
     * Additional entry-points to add to exports field in the package.json file.
     */
    additionalEntryPoints?: string[];

    /**
     * Whether to skip TypeScript type checking.
     */
    skipTypeCheck?: boolean;

    /**
     * Prevents 'type' field from being added to compiled package.json file.
     *
     * Use this if you are having an issue with this field.
     */
    skipTypeField?: boolean;
}
