import { GeneratorCallback } from "@nx/devkit";
import { CommonGeneratorNorm, CommonGeneratorSchema } from "./common-schema";


/**
 * Common context for all generators.
 */
export interface CommonGeneratorData {
    /**
     * The list of callbacks to be invoked after changes to the file system
     * have been applied.
     */
    tasks: GeneratorCallback[];

    /**
     * The options passed in by the user.
     */
    options: CommonGeneratorSchema;

    /**
     * The options after preprocessing.
     */
    norm: CommonGeneratorNorm;
}
