import { ExecutorContext, joinPathFragments } from "@nx/devkit";
import { SyncGeneratorSchema } from "../../generators/sync/schema";
import { join } from "path";
import { readFileSync, writeFileSync } from "fs";
import { update } from "../../generators/sync/generator";


/**
 * Executor entry point.
 */
export default async function runExecutor(
    options: SyncGeneratorSchema,
    context: ExecutorContext
) {
    // Make sure there's anything to do.
    if (!options.version && !options.devDeps) {
        throw new Error('At least one option must be selected.');
    }

    // Make sure the workspace has a package.json file.
    const rootPath = join(context.root, 'package.json');

    // Read workspace package.json.
    const workspacePackageJson = JSON.parse(readFileSync(rootPath, {
        encoding: 'utf-8'
    }))

    // Go through each project and update its package.json.
    for (
        const [name, project] of
        Object.entries(context.projectsConfigurations.projects)
    ) {
        // Skip the root project.
        if (project.root === '.') {
            continue;
        }

        // Determine the path to the project's package.json.
        const filePath = joinPathFragments(project.root, 'package.json')

        // Read the project's package.json.
        const packageJson = JSON.parse(readFileSync(filePath, {
            encoding: 'utf-8'
        }))

        // Update the version.
        update(options, workspacePackageJson, packageJson);

        // Update the package.json file.
        writeFileSync(filePath, JSON.stringify(packageJson, null, 2));
    };

    return {
        success: true,
    };
}
