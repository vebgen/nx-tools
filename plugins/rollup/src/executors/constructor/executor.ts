import { ExecutorContext, readJsonFile } from '@nx/devkit';
import {
    calculateProjectBuildableDependencies,
    computeCompilerOptionsPaths,
    DependentBuildableProjectNode,
} from '@nx/js/src/utils/buildable-libs-utils';

import { createRollupOptions } from './lib/options-massage';
import { runWatch } from './lib/watch';
import { runPlain } from './lib/no-watch';
import { deleteOutputDir } from './lib/fs';
import { resolveOutfile } from './lib/options-utils';
import { ConstructorExecutorSchema } from './schema';
import { normalizeRollupExecutorOptions } from './lib';
import { ExecutorData } from './lib/common';


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

    // Put everything in one object.
    const executorData: ExecutorData = {
        options,
        dependencies,
        context,
        packageJson,
        sourceRoot,
        npmDeps,
    };

    // Create the rollup options from raw options and allow each
    // plugin to adjust the result.
    const rollupOptions = createRollupOptions(executorData);

    // Get the name for cjs format (undefined if no cjs format).
    const outfile = resolveOutfile(context, options);

    // Delete output path before bundling
    if (options.deleteOutputPath) {
        deleteOutputDir(context.root, options.outputPath);
    }

    if (options.watch) {
        return runWatch(
            outfile, rollupOptions, context, options, packageJson
        );
    } else {
        return runPlain(
            outfile, rollupOptions, context, options, packageJson
        );
    }
}


export default runConstructorExecutor;
