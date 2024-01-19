import { TranslateExecutorSchema } from './schema';
import executor from './executor';

const options: TranslateExecutorSchema = {};

describe('Translate Executor', () => {
    it('can run', async () => {
        const output = await executor(options);
        expect(output.success).toBe(true);
    });
});
