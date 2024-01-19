import { TranslateExecutorSchema } from './schema';

export default async function runExecutor(options: TranslateExecutorSchema) {
    console.log('Executor ran for Translate', options);
    return {
        success: true,
    };
}
