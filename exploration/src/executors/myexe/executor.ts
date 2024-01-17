/**
 * https://nx.dev/extending-nx/recipes/local-executors
 */
import { MyexeExecutorSchema } from './schema';

export default async function runExecutor(options: MyexeExecutorSchema) {
    console.log('Executor ran for Myexe', options);
    return {
        success: true,
    };
}
