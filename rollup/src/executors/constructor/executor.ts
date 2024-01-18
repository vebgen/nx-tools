import { ConstructorExecutorSchema } from './schema';

export default async function runExecutor(options: ConstructorExecutorSchema) {
    console.log('Executor ran for Constructor', options);
    return {
        success: true,
    };
}
