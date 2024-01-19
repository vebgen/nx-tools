import * as ts from 'typescript';

export type RollupExecutorEvent = {
    success: boolean;
    outfile?: string;
};

export interface RollupCopyAssetOption {
    src: string;
    dest: string;
}

export interface ExecutorData {
    /**
     * The options provided by the user, normalized.
     */
    options: NormalizedRollupExecutorOptions;

    /**
     * The dependencies of the project.
     */
    dependencies: DependentBuildableProjectNode[];

    /**
     * The executor context.
     */
    context: ExecutorContext;

    /**
     * The package.json file content.
     */
    packageJson: any;

    /**
     * The source root of the project.
     */
    sourceRoot: string;

    /**
     * The `npm:` dependencies of the project.
     */
    npmDeps: string[];

    /**
     * The tsconfig file content.
     */
    tsConfig?: ts.ParsedCommandLine;
}
