import { ConstructorExecutorSchema } from './schema';
import executor from './executor';

const options: ConstructorExecutorSchema = {};

describe('Constructor Executor', () => {
    it('can run', async () => {
        const output = await executor(options);
        expect(output.success).toBe(true);
    });
});
