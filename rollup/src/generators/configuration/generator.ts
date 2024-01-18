import {
    addDependenciesToPackageJson,
    formatFiles,
    GeneratorCallback,
    runTasksInSerial,
    Tree,
} from '@nx/devkit';
import { ConfigurationGeneratorSchema } from './schema';
import {
    addBuildTarget, checkForTargetConflicts, ensureCompilerDependencies
} from './lib';
import * as packageData from '../../../package.json';


/**
 * Generator entry point.
 *
 * The generator makes sure there is a `package.json` file in the target
 * project and adds a build target to it, with target options based on the
 * user's choices.
 */
export async function configurationGenerator(
    tree: Tree,
    options: ConfigurationGeneratorSchema
) {

    // The list of callbacks to be invoked after changes to the file system
    // have been applied.
    const tasks: GeneratorCallback[] = [];

    // Add dependencies.
    if (!options.skipPackageJson) {
        // Add this plug-in to the development dependencies of the project.
        tasks.push(addDependenciesToPackageJson(
            tree, {}, { '@vebgen/rollup': packageData.version }
        ));
        tasks.push(ensureCompilerDependencies(tree, options.compiler));
    }

    // Make sure that the build target name is set and does not conflict with
    // any existing target in the destination project.
    options.buildTarget ??= 'build';
    checkForTargetConflicts(tree, options);

    // Add the build target to the target project.
    addBuildTarget(tree, options);

    if (!options.skipFormat) {
        // Formats all the created or updated files using Prettier.
        await formatFiles(tree);
    }

    // We return the list of tasks to be executed after the tree has been
    // updated.
    return runTasksInSerial(...tasks);
}

export default configurationGenerator;
