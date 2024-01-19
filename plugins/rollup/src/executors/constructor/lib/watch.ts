import { ExecutorContext, logger } from '@nx/devkit';
import * as rollup from 'rollup';
import { Observable, Subscriber } from 'rxjs';
import { eachValueFrom } from '@nx/devkit/src/utils/rxjs-for-await';
import { NormalizedRollupExecutorOptions } from './normalize';
import { updatePackageJson } from './update-package-json';
import { RollupExecutorEvent } from './common';


/**
 * Run the build in watch mode.
 *
 * @param outfile The path to the output file.
 * @param rollupOptions The rollup options computed from options.
 * @param context The executor context.
 * @param options The normalized options provided by the user in `project.json`.
 * @param packageJson The project's package.json file.
 *
 * @returns An observable of the build result.
 */
export async function* runWatch(
    outfile: string | undefined,
    rollupOptions: rollup.RollupWatchOptions[],
    context: ExecutorContext,
    options: NormalizedRollupExecutorOptions,
    packageJson: any
) {
    // Create the watcher.
    const watcher = rollup.watch(rollupOptions);

    return yield* eachValueFrom(
        new Observable<RollupExecutorEvent>((
            obs: Subscriber<RollupExecutorEvent>
        ) => {
            watcher.on('event', (data) => {
                if (data.code === 'START') {
                    logger.info(`Bundling ${context.projectName}...`);

                } else if (data.code === 'END') {
                    updatePackageJson(options, packageJson);
                    logger.info(
                        'Bundle complete. Watching for file changes...'
                    );
                    obs.next({ success: true, outfile });

                } else if (data.code === 'ERROR') {
                    logger.error(`Error during bundle: ${data.error.message}`);
                    obs.next({ success: false });
                }
            });

            // Teardown logic. Close watcher when unsubscribed.
            return () => watcher.close();
        })
    );
}
