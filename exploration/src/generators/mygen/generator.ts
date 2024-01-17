/**
 * This is the entry-point of the generator.
 */
import {
    addProjectConfiguration,
    formatFiles,
    generateFiles,
    Tree,
} from '@nx/devkit';
import * as path from 'path';
import { MygenGeneratorSchema } from './schema';


/**
 * Called to perform manipulations on a tree that represents the file system.
 *
 * The generator function may return a callback function that is executed
 * after changes to the file system have been applied.
 *
 * @param tree The file system tree
 * @param options The options passed to the generator
 */
export async function mygenGenerator(
    tree: Tree,
    options: MygenGeneratorSchema
) {
    const projectRoot = `libs/${options.name}`;
    addProjectConfiguration(tree, options.name, {
        root: projectRoot,
        projectType: 'library',
        sourceRoot: `${projectRoot}/src`,
        targets: {},
    });
    generateFiles(tree, path.join(__dirname, 'files'), projectRoot, options);
    await formatFiles(tree);
}

export default mygenGenerator;
