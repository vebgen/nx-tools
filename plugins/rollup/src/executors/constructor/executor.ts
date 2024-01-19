import { ExecutorContext, readJsonFile } from '@nx/devkit';
import { ConstructorExecutorSchema } from './schema';
import {
    calculateProjectBuildableDependencies,
    computeCompilerOptionsPaths,
    DependentBuildableProjectNode,
} from '@nx/js/src/utils/buildable-libs-utils';
import { normalizeRollupExecutorOptions } from './lib';

/**
 * Executor entry point.
 */
export async function* runConstructorExecutor(
    rawOptions: ConstructorExecutorSchema,
    context: ExecutorContext
) {
    // Default to production mode.
    process.env.NODE_ENV ??= 'production';

    // Get the project configuration.
    const project =
        context.projectsConfigurations.projects[context.projectName];

    // The location of project's sources relative to the root of the workspace.
    const sourceRoot = project.sourceRoot;

    // Get the dependencies.
    const { target, dependencies } = calculateProjectBuildableDependencies(
        context.taskGraph,
        context.projectGraph,
        context.root,
        context.projectName,
        context.targetName,
        context.configurationName,
        true // shallow
    );

    // Normalize the options.
    const options = normalizeRollupExecutorOptions(
        rawOptions,
        context,
        sourceRoot
    );

    // Get the project's package.json file.
    const packageJson = readJsonFile(options.project);

    // Get a list of alias dependencies.
    const npmDeps = (
        context.projectGraph.dependencies[context.projectName] ?? []
    )
        .filter((d) => d.target.startsWith('npm:'))
        .map((d) => d.target.slice(4));

    const rollupOptions = createRollupOptions(
        options,
        dependencies,
        context,
        packageJson,
        sourceRoot,
        npmDeps
    );

    console.log('Executor ran for Constructor', options);
    return {
        success: true,
    };
}
export default runConstructorExecutor;
