import { Tree, joinPathFragments, readProjectConfiguration, updateProjectConfiguration, writeJson } from "@nx/devkit";
import { ConfigurationGeneratorSchema } from "../schema";
import { getImportPath } from '@nx/js/src/utils/get-import-path';
import { ConstructorExecutorSchema } from "rollup/src/executors";

/**
 * Reads the target project and makes sure the build target doesn't already
 * exist.
 *
 * @param tree The file system tree.
 * @param options The generator options provided by the user.
 * @throws If the build target already exists.
 */
export function checkForTargetConflicts(
    tree: Tree,
    options: ConfigurationGeneratorSchema
) {
    // Bail out early.
    if (options.skipValidation) return;

    // Read the target project.
    const project = readProjectConfiguration(tree, options.project);

    // Check if it already has a build target with the same name.
    if (project.targets?.[options.buildTarget]) {
        throw new Error(
            `Project "${options.project}" already has a ` +
            `${options.buildTarget} target. Pass --skipValidation to ` +
            `ignore this error.`
        );
    }
}


/**
 * Adds a build target to the target project.
 */
export function addBuildTarget(tree: Tree, options: ConfigurationGeneratorSchema) {
    // Read the target project.
    const project = readProjectConfiguration(tree, options.project);

    // Compute the path to the package.json file.
    const packageJsonPath = joinPathFragments(project.root, 'package.json');

    // If the project has no package.json file, create one.
    if (!tree.exists(packageJsonPath)) {
        const importPath = (
            options.importPath ||
            getImportPath(tree, options.project)
        );
        writeJson(tree, packageJsonPath, {
            name: importPath,
            version: '0.0.1', // TODO use same version as root package.json
        });
    }

    // Read the options for this target from the project.
    const prevBuildOptions = project.targets?.[options.buildTarget]?.options;

    // Construct default build options that will be written to the project.
    // The user will be able to change these options later.
    const buildOptions: ConstructorExecutorSchema = {
        main:
            options.main ??
            prevBuildOptions?.main ??
            joinPathFragments(project.root, 'src/main.ts'),
        outputPath:
            prevBuildOptions?.outputPath ??
            joinPathFragments(
                'dist',
                project.root === '.' ? project.name : project.root
            ),
        tsConfig:
            options.tsConfig ??
            prevBuildOptions?.tsConfig ??
            joinPathFragments(project.root, 'tsconfig.lib.json'),
        additionalEntryPoints: prevBuildOptions?.additionalEntryPoints,
        generateExportsField: prevBuildOptions?.generateExportsField,
        compiler: options.compiler ?? 'babel',
        project: `${project.root}/package.json`,
        external: options.external,
        format: options.format,
    };

    if (options.rollupConfig) {
        buildOptions.rollupConfig = options.rollupConfig;
    }

    if (tree.exists(joinPathFragments(project.root, 'README.md'))) {
        buildOptions.assets = [
            {
                glob: `${project.root}/README.md`,
                input: '.',
                output: '.',
            },
        ];
    }


    // Updates the configuration of an existing project.
    updateProjectConfiguration(tree, options.project, {
        ...project,
        targets: {
            ...project.targets,
            [options.buildTarget]: {
                executor: '@nx/rollup:rollup',
                outputs: ['{options.outputPath}'],
                defaultConfiguration: 'production',
                options: buildOptions,
                configurations: {
                    production: {
                        optimization: true,
                        sourceMap: false,
                        namedChunks: false,
                        extractLicenses: true,
                        vendorChunk: false,
                    },
                },
            },
        },
    });
}
