import * as path from 'path';
import {
    addDependenciesToPackageJson,
    addProjectConfiguration,
    formatFiles,
    generateFiles,
    GeneratorCallback,
    joinPathFragments,
    removeDependenciesFromPackageJson,
    runTasksInSerial,
    Tree,
} from '@nx/devkit';
import { addTsConfigPath, initGenerator as jsInitGenerator } from '@nx/js';
import { Linter, lintProjectGenerator } from '@nx/eslint';
import {
    addExtendsToLintConfig,
    isEslintConfigSupported,
} from '@nx/eslint/src/generators/utils/eslint-file';
import { extraEslintDependencies } from '@nx/react/src/utils/lint';
import { TsLibraryGeneratorSchema } from './schema';
import {
    normalizeOptions as normalizeOptionsCommon
} from '../../lib/common-schema';
import { TsLibraryGeneratorData } from './data';
import * as nxToolsPackage from '../../../package.json';


/**
 * Generator entry point.
 */
export async function tsLibraryGenerator(
    tree: Tree,
    options: TsLibraryGeneratorSchema
) {
    // Initialize the context data.
    const data: TsLibraryGeneratorData = {
        tasks: [] as GeneratorCallback[],
        options,
        norm: normalizeOptions(options),
    }

    // Run the basic JS generator.
    // - ensures that there is a tsconfig.base.json in workspace root
    // - ensures that there is a .prettierrc (or a variant of it) in
    //   workspace root
    // - updates top level development dependencies to include
    //   prettier, nx and typescript
    data.tasks.push(await jsInitGenerator(tree, {
        skipFormat: true,
    }));

    // Make sure that the development dependencies are installed
    // in proper place.
    data.tasks.push(removeDependenciesFromPackageJson(tree, [
        '@nx/js', '@vebgen/nxp-make'
    ], []));
    data.tasks.push(addDependenciesToPackageJson(tree, {}, {
        '@nx/js': nxToolsPackage.devDependencies['@nx/js'],
        '@vebgen/nxp-make': nxToolsPackage.version,
    }));

    // Create the project.json.
    addProjectConfiguration(tree, options.name, {
        root: data.norm.projectDir,
        projectType: 'library',
        sourceRoot: joinPathFragments(data.norm.projectDir, 'src'),
        targets: {},
    });

    // Add EsLint.
    data.tasks.push(await lintProjectGenerator(tree, {
        linter: Linter.EsLint,
        project: options.name,
        tsConfigPaths: [
            joinPathFragments(data.norm.projectDir, 'tsconfig.lib.json'),
        ],
        unitTestRunner: 'jest',
        skipFormat: true,
        skipPackageJson: false,

        // We do not do this for lint performance reasons.
        setParserOptionsProject: false,
    }));

    // True if the EsLint config file at the root of the workspace exists
    // and has .json or .config.js extensions.
    if (isEslintConfigSupported(tree)) {
        // Import from the @nx/eslint-plugin package the configuration
        // named @nx/react which is actually the sum of @nx/react-base,
        // @nx/react-jsx and @nx/react-typescript
        addExtendsToLintConfig(tree, data.norm.projectDir, 'plugin:@nx/react');
    }

    // Add eslint dependencies.
    data.tasks.push(addDependenciesToPackageJson(
        tree,
        extraEslintDependencies.dependencies,
        extraEslintDependencies.devDependencies
    ));

    // Create files from templates.
    generateFiles(
        tree, path.join(__dirname, 'files'),
        data.norm.projectDir, data.norm
    );

    // Formats all the created or updated files using Prettier.
    await formatFiles(tree);

    // We return the list of tasks to be executed after the tree has been
    // updated.
    return runTasksInSerial(...data.tasks);
}


/**
 * Normalizes the options provided by the user.
 *
 * @param options The options provided by the user.
 * @returns The normalized options.
 */
export function normalizeOptions(options: TsLibraryGeneratorSchema) {
    return {
        ...normalizeOptionsCommon(options, false),
    };
}


export default tsLibraryGenerator;
