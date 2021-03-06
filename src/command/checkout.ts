import * as Path from 'path';
import { git, IGitExecutionOptions } from '../core/git'
import { ChildProcess } from 'child_process'
import { ICheckoutProgress, CheckoutProgressParser, progressProcessCallback } from '../progress'

type ProcessCallback = (process: ChildProcess) => void
export type ProgressCallback = (progress: ICheckoutProgress) => void

/**
 * Check out the given branch.
 *
 * @param repository - The repository in which the branch checkout should
 *                     take place
 *
 * @param name       - The branch name that should be checked out
 *
 * @param progressCallback - An optional function which will be invoked
 *                           with information about the current progress
 *                           of the checkout operation. When provided this
 *                           enables the '--progress' command line flag for
 *                           'git checkout'.
 */
export async function checkoutBranch(repositoryPath: string, name: string, options?: IGitExecutionOptions, progressCallback?: ProgressCallback): Promise<void> {
    let processCallback: ProcessCallback | undefined = undefined
    if (progressCallback) {
        const title = `Checking out branch ${name}`
        const kind = 'checkout'
        const targetBranch = name

        processCallback = progressProcessCallback(
            new CheckoutProgressParser(),
            progress => {
                if (progress.kind === 'progress') {
                    const description = progress.details.text
                    const value = progress.percent

                    progressCallback({ kind, title, description, value, targetBranch })
                }
            }
        )

        // Initial progress
        progressCallback({ kind, title, value: 0, targetBranch })
    }

    const args = processCallback
        ? ['checkout', '--progress', name, '--']
        : ['checkout', name, '--']

    const opts = {
        ...options,
        processCallback
    }
    await git(args, repositoryPath, 'checkoutBranch', opts);
}

/** Check out the paths at HEAD. */
export async function checkoutPaths(repositoryPath: string, paths: string[], options?: IGitExecutionOptions): Promise<void> {
    await checkout(repositoryPath, paths, 'HEAD', false, false, options);
}

/**
 * Reverts the state of the file to the specified one.
 *
 * @param repositoryPath the local Git clone or its FS path.
 * @param paths the absolute file paths of the resources that have to be checked out.
 * @param treeish the commit SHA to check out. If not given, `HEAD` will be checked out.
 * @param merge when checking out paths from the index, this option lets you recreate the conflicted merge in the specified paths.
 * @param force when checking out paths from the index, do not fail upon unmerged entries; instead, unmerged entries are ignored.
 */
export async function checkout(repositoryPath: string, paths: string[], commitSHA: string, merge?: boolean, force?: boolean, options?: IGitExecutionOptions): Promise<void> {
    const args = ['checkout'];
    if (commitSHA) {
        args.push(commitSHA);
    }
    if (merge) {
        args.push('-m');
    }
    if (force) {
        args.push('-f');
    }
    args.push('--');
    args.push(...paths.map(p => Path.relative(repositoryPath, p)));
    await git(args, repositoryPath, 'checkoutPaths', options);
}