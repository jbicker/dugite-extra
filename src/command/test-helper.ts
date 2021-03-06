import * as path from 'path';
import * as fs from 'fs-extra';
import { git } from '../core/git';

/**
 * Initializes a new Git repository to the destination folder. On demand, creates the desired folder structure and commits the changes.
 *
 * @param path the desired destination folder for the new Git repository.
 * @param add `true` if all the repository content has to be added to the index.
 * @param commit `true` if the directory structure has to be committed.
 */
export async function initRepository(path: string, add?: boolean, commit?: boolean): Promise<string> {
    if ((await git(['init'], path, 'init')).exitCode !== 0) {
        throw new Error(`Error while initializing a repository under ${path}.`);
    }
    if ((await git(['config', 'user.email', '"jon@doe.com"'], path, 'config')).exitCode !== 0) {
        throw new Error(`Error while setting user email to the Git configuration.`);
    }
    if ((await git(['config', 'user.name', '"Jon Doe"'], path, 'config')).exitCode !== 0) {
        throw new Error(`Error while setting user name to the Git configuration.`);
    }
    if (add) {
        if ((await git(['add', '.'], path, 'add')).exitCode !== 0) {
            throw new Error(`Error while staging changes into the repository.`);
        }
        if (commit) {
            if ((await git(['commit', '-F', '-'], path, 'createCommit', { stdin: 'Initial commit.' })).exitCode !== 0) {
                throw new Error(`Error while committing changes into the repository`);
            }
        }
    }
    return path;
}

export async function createTestRepository(root: string): Promise<string> {
    fs.mkdirSync(path.join(root, 'folder'));
    fs.writeFileSync(path.join(root, 'A.txt'), 'A', { encoding: 'utf8' });
    fs.writeFileSync(path.join(root, 'B.txt'), 'B', { encoding: 'utf8' });
    fs.writeFileSync(path.join(root, 'folder', 'C.txt'), 'C', { encoding: 'utf8' });
    await initRepository(root, true, true);
    return root;
}

export async function usesLocalGit(): Promise<boolean> {
    return process.env.USE_LOCAL_GIT === 'true';
}

export function remove(repositoryPath: string, filesToDelete: string | string[]): string[] {
    const files = (Array.isArray(filesToDelete) ? filesToDelete : [filesToDelete]).map(f => path.join(repositoryPath, f));
    for (const f of files) {
        if (!fs.existsSync(f)) {
            throw new Error(`Cannot delete file ${f}, it does not exist.`);
        }
        if (!fs.statSync(f).isFile()) {
            throw new Error(`Only files can be deleted, directories not: ${f}.`);
        }
        fs.unlinkSync(f);
        if (fs.existsSync(f)) {
            throw new Error(`Cannot delete file: ${f}.`);
        }
    }
    return files;
}

export function add(repositoryPath: string, filesToCreate: { path: string, data?: string } | { path: string, data?: string }[]): string[] {
    const files = (Array.isArray(filesToCreate) ? filesToCreate : [filesToCreate]).map(f => {
        return { path: path.join(repositoryPath, f.path), data: f.data || '' }
    });
    for (const f of files) {
        if (fs.existsSync(f.path)) {
            throw new Error(`File ${f.path}, already exists.`);
        }
        fs.writeFileSync(f.path, f.data);
        if (!fs.existsSync(f.path)) {
            throw new Error(`Cannot create new file: ${f.path}.`);
        }
    }
    return files.map(f => f.path);
}

export function modify(repositoryPath: string, filesToModify: { path: string, data: string } | { path: string, data: string }[]): string[] {
    const files = (Array.isArray(filesToModify) ? filesToModify : [filesToModify]).map(f => {
        return { path: path.join(repositoryPath, f.path), data: f.data }
    });
    for (const f of files) {
        if (!fs.existsSync(f.path)) {
            throw new Error(`Cannot modify the content of the file ${f.path}, it does not exist.`);
        }
        if (!fs.statSync(f.path).isFile()) {
            throw new Error(`Only files can be modified, directories not: ${f.path}.`);
        }
        fs.writeFileSync(f.path, f.data);
        if (!fs.existsSync(f.path) || fs.readFileSync(f.path, 'utf-8') !== f.data) {
            throw new Error(`Cannot modify the file content file: ${f.path}.`);
        }
    }
    return files.map(f => f.path);
}

export function rename(repositoryPath: string, filesToRename: { oldPath: string, newPath: string } | { oldPath: string, newPath: string }[]): string[] {
    const files = (Array.isArray(filesToRename) ? filesToRename : [filesToRename]).map(f => {
        return { oldPath: path.join(repositoryPath, f.oldPath), newPath: path.join(repositoryPath, f.newPath) }
    });
    for (const f of files) {
        if (!fs.existsSync(f.oldPath)) {
            throw new Error(`Cannot rename the file ${f.oldPath}, it does not exist.`);
        }
        if (fs.existsSync(f.newPath)) {
            throw new Error(`Cannot rename the file ${f.oldPath}, a file already exists in the destination: ${f.newPath}.`);
        }
        if (!fs.statSync(f.oldPath).isFile()) {
            throw new Error(`Only files can be renamed, directories not: ${f.oldPath}.`);
        }
        fs.renameSync(f.oldPath, f.newPath);
        if (!fs.existsSync(f.newPath) || fs.existsSync(f.oldPath)) {
            throw new Error(`Cannot rename file: ${f.oldPath} -> ${f.newPath}.`);
        }
    }
    return [...files.map(f => f.oldPath), ...files.map(f => f.newPath)];
}
