import * as rollup from 'rollup';
import { from } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';


/**
 * Run rollup with the provided options and write resulted bundles.
 *
 * @param rollupOptions The rollup options.
 * @returns An observable of the build result.
 */
export function runRollup(rollupOptions: rollup.RollupOptions) {
    return from(
        // Convert the Promise returned by rollup to an Observable.
        rollup.rollup(rollupOptions)
    ).pipe(

        switchMap((bundle: rollup.RollupBuild) => {
            const outputOptions = Array.isArray(rollupOptions.output)
                ? rollupOptions.output
                : [rollupOptions.output];
            return from(
                Promise.all((<Array<rollup.OutputOptions>>outputOptions).map(
                    (o) => bundle.write(o)
                ))
            );
        }),

        map(() => ({ success: true }))
    );
}
