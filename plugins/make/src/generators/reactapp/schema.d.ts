import { CommonGeneratorSchema } from '../../lib/common-schema';


/**
 * The options provided for the React application generator.
 */
export interface ReactAppGeneratorSchema extends CommonGeneratorSchema {
    name: string;
}
