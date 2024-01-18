/**
 * Options for the generator.
 */
export interface ConfigurationGeneratorSchema {

    /**
     * Skip formatting all the created or updated files using Prettier.
     */
    skipFormat?: boolean;

    /**
     * Wether to skip validation of the name of the build target inside
     * the destination project.
     *
     * If this is false and a target with this name already exists, the
     * generator will throw an error.
     */
    skipValidation?: boolean;

    /**
     * Wether to skip adding this plug-in and other dependencies to the
     * development dependencies section of the destination project's
     * `package.json` file.
     */
    skipPackageJson?: boolean;

    /**
     * The unique identifier of the project where the build target will be
     * added.
     */
    project: string;

    /**
     * The name of the build target to be added to the target project.
     */
    buildTarget?: string;

    /**
     * The compiler to use to build source.
     */
    compiler?: 'babel' | 'swc' | 'tsc';

    /**
     * The name of the library to be created.
     *
     * This is the value that will be used in the `name` field of the
     * `package.json` file.
     *
     * If a value is not provided a default will be computed from the scope
     * of the root `package.json`'s `name` property and the name of the
     * target project.
     *
     * This property is only used of the target project does not have a
     * `package.json` file.
     */
    importPath?: string;

}
