/**
 * Common options for all generators.
 */
export interface CommonGeneratorSchema {
    /**
     * The name of the project (library or application).
     */
    name: string;

    /**
     * The description added in the package.json and to README.md.
     */
    description?: string;

    /**
     * The path to the project relative to the root of the workspace.
     *
     * Defaults to `packages/${name}` or `apps/${name}`.
     */
    projectDir?: string;

    /**
     * The name under which this project is imported and published.
     *
     * This should include the scope if applicable, e.g. `@scope/name`.
     *
     * You will be able to import the project using this name inside the
     * workspace.
     */
    importPath?: string;

    /**
     * Should this be a publishable package?
     */
    publishable?: boolean;

}


/**
 * Common normalized options for all generators.
 */
export interface CommonGeneratorNorm extends CommonGeneratorSchema {
    /**
     * The description added in the package.json and to README.md.
     */
    description: string;

    /**
     * The path to the project relative to the root of the workspace.
     */
    projectDir: string;
}


/**
 * Common preprocessing applied to raw options for all generators.
 *
 * @param options The options provided by the user.
 * @returns The normalized options.
 */
export function normalizeOptions(
    options: CommonGeneratorSchema,
    isApp: boolean
): CommonGeneratorNorm {
    if (options.publishable && !options.importPath) {
        throw new Error(
            'You must specify an import path when generating a ' +
            'publishable library.'
        );
    }
    return {
        ...options,
        name: options.name.toLowerCase(),
        description: options.description ?? '',
        projectDir: options.projectDir ?? (
            isApp ? `apps/${options.name}` : `packages/${options.name}`
        ),
        publishable: options.publishable === undefined
            ? !isApp
            : options.publishable,
    };
}
