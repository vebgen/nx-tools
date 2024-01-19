import { ExecutorContext, logger } from '@nx/devkit';
import { from, of } from 'rxjs';
import * as rollup from 'rollup';
import { NormalizedRollupExecutorOptions } from './normalize';
import { updatePackageJson } from './update-package-json';
import { RollupExecutorEvent } from './common';
import { catchError, concatMap, last, scan, tap } from 'rxjs/operators';
import { runRollup } from './run-rollup';


export async function runPlain(
    outfile: string | undefined,
    rollupOptions: rollup.RollupWatchOptions[],
    context: ExecutorContext,
    options: NormalizedRollupExecutorOptions,
    packageJson: any
) {
    logger.info(`Bundling ${context.projectName}...`);
    const start = process.hrtime.bigint();

    // Creates an Observable from the rollupOptions.
    // An Observable is a stream of data that you can subscribe
    // to and react to changes on.
    return from(rollupOptions)
        // Chain multiple operators (pure functions).
        .pipe(
            // Project each option to an Observable which is
            // merged in the output Observable, in a serialized fashion
            // waiting for each one to complete before merging the next.
            concatMap((opts) =>
                runRollup(opts).pipe(
                    // This operator catches errors on the observable to
                    // be handled by returning a new observable or
                    // throwing an error.
                    catchError((e) => {
                        logger.error(`Error during bundle: ${e}`);
                        return of({ success: false });
                    })
                )
            ),
            // Applies a function over the Observable sequence and
            // returns the cumulative result.
            scan<RollupExecutorEvent, RollupExecutorEvent>(
                (acc, result) => {
                    if (!acc.success) return acc;
                    return result;
                },
                { success: true, outfile }
            ),

            //This operator emits only the last item emitted by the Observable.
            last(),

            // Side effects: logging and updating the package.json file.
            tap({
                next: (result) => {
                    if (result.success) {
                        const end = process.hrtime.bigint();
                        const dif = Number(end - start);
                        const duration = `${(dif / 1_000_000_000).toFixed(2)}s`;

                        updatePackageJson(options, packageJson);
                        logger.info(`⚡ Done in ${duration}`);
                    } else {
                        logger.error(`Bundle failed: ${context.projectName}`);
                    }
                },
            })
        )
        .toPromise();
}
