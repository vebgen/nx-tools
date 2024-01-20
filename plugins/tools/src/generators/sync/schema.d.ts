export interface SyncGeneratorSchema {
    /**
     * Copy the version from the workspace to all projects inside the workspace.
     */
    version: boolean;

    /**
     * Copy development dependencies from the workspace to all projects
     * inside the workspace.
     */
    devDeps: boolean;
}
