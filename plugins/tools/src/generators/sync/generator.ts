import {
    getProjects,
    ProjectConfiguration,
    readJson,
    writeJson,
    Tree,
    joinPathFragments,
} from '@nx/devkit';
import { SyncGeneratorSchema } from './schema';


/**
 * Generator entry point.
 */
export async function syncGenerator(tree: Tree, options: SyncGeneratorSchema) {
    // Make sure there's anything to do.
    if (!options.version && !options.devDeps) {
        throw new Error('At least one option must be selected.');
    }

    // Make sure the workspace has a package.json file.
    if (!tree.exists('package.json')) {
        throw new Error('The workspace must have a package.json file.');
    }

    // Read workspace package.json.
    const workspacePackageJson = readJson(tree, 'package.json');

    // Go through each project and update its package.json.
    getProjects(tree).forEach((project: ProjectConfiguration) => {
        // Skip the root project.
        if (project.root === '.') {
            return;
        }

        // Determine the path to the project's package.json.
        const filePath = joinPathFragments(project.root, 'package.json')

        // Read the project's package.json.
        const packageJson = readJson(tree, filePath);

        // Update the version.
        if (options.version) {
            packageJson.version = workspacePackageJson.version;
        }

        // Update the devDependencies.
        if (options.devDeps) {
            if (!packageJson.devDependencies) {
                packageJson.devDependencies = {};
            }
            for (
                const [name, version] of
                Object.entries(workspacePackageJson.devDependencies)
            ) {
                packageJson.devDependencies[name] = version;
            }
        }

        // Update the package.json file.
        writeJson(tree, filePath, packageJson);
    });
}

export default syncGenerator;
