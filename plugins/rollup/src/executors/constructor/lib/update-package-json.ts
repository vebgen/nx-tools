import { writeFileSync } from 'fs';
import { basename, join, parse } from 'path';
import { writeJsonFile } from 'nx/src/utils/fileutils';
import { PackageJson } from 'nx/src/utils/package-json';
import { stripIndents } from '@nx/devkit';

import { NormalizedRollupExecutorOptions } from './normalize';


/**
 * Updates the package.json file for the ESM format.
 *
 * @param options The user options, normalized.
 * @param packageJson The package.json file to update.
 */
export function updatePackageJsonEsm(
    options: NormalizedRollupExecutorOptions,
    packageJson: PackageJson
) {
    const hasCjsFormat = options.format.includes('cjs');

    // Compute the ESM exports.
    const esmExports = getExports({
        ...options,
        fileExt: '.esm.js',
    });

    // Save the entry point.
    packageJson.module = esmExports['.'];

    if (!hasCjsFormat) {
        if (!options.skipTypeField) packageJson.type = 'module';
        packageJson.main ??= esmExports['.'];
    }

    if (options.generateExportsField) {
        for (const [exportEntry, filePath] of Object.entries(esmExports)) {
            // If CJS format is used, make sure `import` (from Node)
            // points to same instance of the package.
            // Otherwise, packages that are required to be singletons
            // (like React, RxJS, etc.) will break.
            // Reserve `module` entry for bundlers to accommodate
            // tree-shaking.

            // TODO: this is likely a bug as it checks hasCjsFormat twice.
            packageJson.exports[exportEntry] = hasCjsFormat
                ? { [hasCjsFormat ? 'module' : 'import']: filePath }
                : filePath;
        }
    }
}


/**
 * Updates the package.json file for a single entry in the exports list.
 *
 * @param options The user options, normalized.
 * @param packageJson The package.json file to update.
 * @param exportEntry The export entry to update.
 * @param filePath The file path in the exports list.
 */
export function updatePackageJsonCjsEntry(
    options: NormalizedRollupExecutorOptions,
    packageJson: PackageJson,
    exportEntry: string,
    filePath: string
) {
    const hasEsmFormat = options.format.includes('esm');
    if (hasEsmFormat) {
        // If ESM format used, make sure `import` (from Node) points to a
        // wrapped version of CJS file to ensure the package remains a
        // singleton.
        const relativeFile = parse(filePath).base;
        const fauxEsmFilePath = filePath.replace(/\.cjs\.js$/, '.cjs.mjs');
        packageJson.exports[exportEntry]['import'] ??= fauxEsmFilePath;
        packageJson.exports[exportEntry]['default'] ??= filePath;
        // Re-export from relative CJS file, and Node will synthetically export
        // it as ESM. Make sure both ESM and CJS point to same instance of the
        // package because libs like React, RxJS, etc. requires it. Also need a
        // special .cjs.default.js file that re-exports the `default` from CJS,
        // or else default import in Node will not work.
        writeFileSync(
            join(
                options.outputPath,
                filePath.replace(/\.cjs\.js$/, '.cjs.default.js')
            ),
            `exports._default = require('./${parse(filePath).base}').default;`
        );

        // Re-export from relative CJS file, and Node will synthetically
        // export it as ESM.
        const defaultFile = relativeFile.replace(
            /\.cjs\.js$/, '.cjs.default.js'
        );
        writeFileSync(
            join(options.outputPath, fauxEsmFilePath),
            stripIndents`
                export * from './${relativeFile}';
                export { _default as default } from './${defaultFile}';
            `
        );
    } else {
        packageJson.exports[exportEntry] = filePath;
    }
}


/**
 * Updates the package.json file for the CJS format.
 *
 * @param options The user options, normalized.
 * @param packageJson The package.json file to update.
 */
export function updatePackageJsonCjs(
    options: NormalizedRollupExecutorOptions,
    packageJson: PackageJson
) {
    const hasEsmFormat = options.format.includes('esm');

    // Compute the CJS exports.
    const cjsExports = getExports({
        ...options,
        fileExt: '.cjs.js',
    });

    // Save the entry point.
    packageJson.main = cjsExports['.'];

    if (!hasEsmFormat) {
        packageJson.type = 'commonjs';
    }

    if (options.generateExportsField) {
        for (const [exportEntry, filePath] of Object.entries(cjsExports)) {
            updatePackageJsonCjsEntry(
                options, packageJson, exportEntry, filePath
            );
        }
    }
}


/**
 * Updates the package.json file regarding the exports and writes it.
 *
 * @param options The user options, normalized.
 * @param packageJson The package.json content to update and write.
 */
export function updatePackageJson(
    options: NormalizedRollupExecutorOptions,
    packageJson: PackageJson
) {
    const hasEsmFormat = options.format.includes('esm');
    const hasCjsFormat = options.format.includes('cjs');

    if (options.generateExportsField) {
        packageJson.exports =
            typeof packageJson.exports === 'string' ? {} : {
                ...packageJson.exports
            };
        packageJson.exports['./package.json'] = './package.json';
    }

    if (hasEsmFormat) {
        updatePackageJsonEsm(options, packageJson);
    }

    if (hasCjsFormat) {
        updatePackageJsonCjs(options, packageJson);
    }

    writeJsonFile(`${options.outputPath}/package.json`, packageJson);
}


/**
 * The result of the `getExports` function.
 */
interface Exports {
    /**
     * The entry point for the package.
     */
    '.': string;

    /**
     * Additional entry points for the package.
     */
    [name: string]: string;
}


/**
 * The options provided to the `getExports` function.
 */
type GetExportOptions = Pick<
    NormalizedRollupExecutorOptions,
    'main' | 'projectRoot' | 'outputFileName' | 'additionalEntryPoints'
> & {
    fileExt: string;
};


/**
 * Gets the exports for the package.
 *
 * @param options The options provided to the function.
 * @returns The exports for the package.
 */
function getExports(options: GetExportOptions): Exports {
    // Compute the name from the output file name or the main entry point.
    // Removes .js and .ts extensions.
    const mainFilePrefix = options.outputFileName
        ? options.outputFileName.replace(/\.[tj]s$/, '')
        : basename(options.main).replace(/\.[tj]s$/, '');

    // Create the main entry point.
    const exports: Exports = {
        '.': './' + mainFilePrefix + options.fileExt,
    };

    // Do the same for any additional entry points.
    if (options.additionalEntryPoints) {
        // TODO: should we remove .js/.ts extensions here?
        for (const file of options.additionalEntryPoints) {
            const { name: fileName } = parse(file);
            exports['./' + fileName] = './' + fileName + options.fileExt;
        }
    }

    return exports;
}
