import * as path from 'path';
import type { FileSystem } from './FileSystem';

type Dependencies = {
  root: string,
  fileSystem: FileSystem,
  openDocument: (file: string) => Promise<void>,
  getConfiguration: (key: string, defaultValue: boolean) => boolean,
  showConfirmationDialog: (
    message: string,
    action: () => Promise<void>,
  ) => Promise<void>,
};

async function create(deps: Dependencies, newPath: string): Promise<void> {
  if (isDirectoryPath(newPath)) {
    await deps.fileSystem.createDirectory(absolutise(deps, newPath));
  } else {
    await checkingDestination(deps, '', newPath, async newPath => {
      await deps.fileSystem.createFile(newPath);
      await deps.openDocument(newPath);
    });
  }
}

function move(
  deps: Dependencies,
  originalPath: string,
  newPath: string,
): Promise<void> {
  return checkingDestination(
    deps,
    originalPath,
    inDirectory(originalPath, newPath),
    async newPath => {
      await deps.fileSystem.move(absolutise(deps, originalPath), newPath);
      await deps.openDocument(newPath);
    },
  );
}

function copy(
  deps: Dependencies,
  originalPath: string,
  newPath: string,
): Promise<void> {
  return checkingDestination(
    deps,
    originalPath,
    inDirectory(originalPath, newPath),
    async newPath => {
      await deps.fileSystem.copy(absolutise(deps, originalPath), newPath);
      await deps.openDocument(newPath);
    },
  );
}

async function remove(
  deps: Dependencies,
  relativePathToRemove: string,
): Promise<void> {
  const pathToRemove = absolutise(deps, relativePathToRemove);
  if (!(await deps.fileSystem.exists(pathToRemove))) {
    throw new Error('Path to delete does not exist');
  }

  const isDirectory = await deps.fileSystem.isDirectory(pathToRemove);
  const moveToTrash = deps.getConfiguration(
    'quick-file-actions.moveToTrash',
    true,
  );

  const message = moveToTrash
    ? 'move ' + relativePathToRemove + ' to the trash bin'
    : 'permanently delete ' + pathToRemove;

  await confirming(
    deps,
    'quick-file-actions.confirmOnDelete',
    'Are you sure you want to ' + message + '?',
    () =>
      moveToTrash
        ? trashing(deps, relativePathToRemove, pathToRemove)
        : deps.fileSystem.remove(pathToRemove, false),
    isDirectory, // always ask for confirmation when deleting directories
  );
}

// not every file system has a trash bin, e.g. remote ones, so offer to
// delete permanently instead
async function trashing(
  deps: Dependencies,
  relativePathToRemove: string,
  pathToRemove: string,
): Promise<void> {
  try {
    await deps.fileSystem.remove(pathToRemove, true);
  } catch (e) {
    await deps.showConfirmationDialog(
      'Could not move ' + relativePathToRemove + ' to the trash bin ('
        + (e instanceof Error ? e.message : String(e))
        + '). Permanently delete it instead?',
      () => deps.fileSystem.remove(pathToRemove, false),
    );
  }
}

function absolutise(deps: Dependencies, relativePath: string): string {
  return path.resolve(deps.root, relativePath);
}

async function checkingDestination(
  deps: Dependencies,
  originalPath: string,
  newPath: string,
  action: (newPath: string) => Promise<void>,
): Promise<void> {
  if (originalPath === newPath) return; // ignore

  const absoluteNewPath = absolutise(deps, newPath);
  return (await deps.fileSystem.exists(absoluteNewPath))
    ? confirming(
      deps,
      'quick-file-actions.confirmOnReplace',
      'Destination path already exists, override?',
      () => action(absoluteNewPath),
    )
    : action(absoluteNewPath);
}

function confirming(
  deps: Dependencies,
  configKey: string,
  message: string,
  action: () => Promise<void>,
  alwaysConfirm: boolean = false,
): Promise<void> {
  return alwaysConfirm || deps.getConfiguration(configKey, true)
    ? deps.showConfirmationDialog(message, action)
    : action();
}

// users may type '/' regardless of platform
function isDirectoryPath(p: string): boolean {
  return p.endsWith('/') || p.endsWith(path.sep);
}

// if the destination is a directory, keep the original file name
function inDirectory(originalPath: string, newPath: string): string {
  return isDirectoryPath(newPath)
    ? newPath + path.basename(originalPath)
    : newPath;
}

export { copy, create, move, remove };
export type { Dependencies };
