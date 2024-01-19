import chalk from 'chalk';
import { Plugin } from 'rollup';
import { logger } from '@nx/devkit';


const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Byte';
    const k = 1000;
    const dm = 3;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};


export function analyze(): Plugin {
    return {
        name: 'rollup-plugin-nx-analyzer',
        renderChunk(source, chunk) {
            const sourceBytes = formatBytes(source.length);
            const fileName = chunk.fileName;
            logger.info(`  ${chalk.bold(fileName)} ${chalk.cyan(sourceBytes)}`);
        },
    };
}
