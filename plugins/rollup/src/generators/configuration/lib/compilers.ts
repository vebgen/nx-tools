import {
    GeneratorCallback,
    Tree,
    addDependenciesToPackageJson,
} from '@nx/devkit';
import * as rootPackage from '../../../../../package.json';

/**
 * Ensures that the compiler dependencies are added to the destination
 * project's `package.json` file.
 *
 * @param tree The file system tree.
 * @param compiler The compiler to use.
 * @returns A callback that will be invoked after the file system has been
 *         updated.
 */
export function ensureCompilerDependencies(
    tree: Tree,
    compiler: 'babel' | 'swc' | 'tsc'
): GeneratorCallback {
    if (compiler === 'swc') {
        return addDependenciesToPackageJson(
            tree,
            {},
            {
                '@swc/helpers': rootPackage.devDependencies['@swc/helpers'],
                '@swc/core': rootPackage.devDependencies['@swc/core'],
                'swc-loader': rootPackage.devDependencies['swc-loader'],
            }
        );
    }

    return addDependenciesToPackageJson(
        tree,
        {},
        {
            tslib: rootPackage.devDependencies['tslib'],
        }
    );
}
