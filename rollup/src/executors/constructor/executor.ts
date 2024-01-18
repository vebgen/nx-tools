import { ConstructorExecutorSchema } from './schema';

export async function runConstructorExecutor(
    options: ConstructorExecutorSchema
) {
    console.log('Executor ran for Constructor', options);
    return {
        success: true,
    };
}
export default runConstructorExecutor;
