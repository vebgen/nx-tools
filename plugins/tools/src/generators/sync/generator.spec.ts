import { createTreeWithEmptyWorkspace, createTree, } from '@nx/devkit/testing';
import { Tree, readProjectConfiguration } from '@nx/devkit';
import { writeJson } from '@nx/devkit';
import { syncGenerator } from './generator';
import { SyncGeneratorSchema } from './schema';


describe('With an empty workspace', () => {
    let tree: Tree;
    const options: SyncGeneratorSchema = {
        version: true,
        devDeps: true,
    };

    beforeEach(() => {
        tree = createTreeWithEmptyWorkspace();
    });

    it('should run successfully', async () => {
        await syncGenerator(tree, options);
    });
});

describe('With a non-empty workspace', () => {
    let tree: Tree;
    const options: SyncGeneratorSchema = {
        version: true,
        devDeps: true,
    };

    beforeEach(() => {
        tree = createTree();
    });

    it('should throw an error if there is no package.json', async () => {
        try {
            await syncGenerator(tree, options);
            expect(false).toBe(true);
        } catch (e) {
            expect(e.message).toMatch(/The workspace/);
        }
    });

    it('should run successfully', async () => {
        writeJson(tree, 'package.json', {
            name: 'my-package',
            version: '1.2.3',
            dependencies: {
                react: '^17.0.0',
                'react-dom': '^17.0.0',
            },
            devDependencies: {
                lorem: '^17.18.19',
                ipsum: 'dolor',
            },
            scripts: {
                start: 'node index.js',
                test: 'jest',
            },
        });
        await syncGenerator(tree, options);
        expect(() => readProjectConfiguration(tree, 'test')).toThrow();
    });
});

