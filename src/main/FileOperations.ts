import * as fsExtra from 'fs-extra';
import * as path from 'path';

class FileOperations {
  constructor(
    private readonly root: string,
    private readonly openDocument: (file: string) => Promise<void>,
    private readonly getConfiguration: (
      key: string,
      defaultValue: boolean,
    ) => boolean,
    private readonly showConfirmationDialog: (
      message: string,
      action: () => Promise<void>,
    ) => Promise<void>,
  ) {}

  async create(newPath: string): Promise<void> {
    if (isDirectoryPath(newPath)) {
      await fsExtra.mkdirp(this.absolutise(newPath));
    } else {
      await this.checkingDestination('', newPath, async newPath => {
        await fsExtra.mkdirp(path.dirname(newPath));
        await fsExtra.writeFile(newPath, '');
        await this.openDocument(newPath);
      });
    }
  }

  move(originalPath: string, newPath: string): Promise<void> {
    const destination = inDirectory(originalPath, newPath);
    return this.checkingDestination(
      originalPath,
      destination,
      async newPath => {
        await fsExtra.move(this.absolutise(originalPath), newPath, {
          overwrite: true,
        });
        await this.openDocument(newPath);
      },
    );
  }

  copy(originalPath: string, newPath: string): Promise<void> {
    const destination = inDirectory(originalPath, newPath);
    return this.checkingDestination(
      originalPath,
      destination,
      async newPath => {
        await fsExtra.copy(this.absolutise(originalPath), newPath);
        await this.openDocument(newPath);
      },
    );
  }

  async remove(relativePathToRemove: string): Promise<void> {
    const pathToRemove = this.absolutise(relativePathToRemove);
    if (!fsExtra.existsSync(pathToRemove)) {
      throw new Error('Path to delete does not exist');
    }

    const stats = await fsExtra.lstat(pathToRemove);
    const moveToTrash = this.getConfiguration(
      'quick-file-actions.moveToTrash',
      true,
    );

    const message = moveToTrash
      ? 'move ' + relativePathToRemove + ' to the trash bin'
      : 'permanently delete ' + pathToRemove;
    const deleteFn = moveToTrash ? moveToTrashBin : fsExtra.remove;

    await this.confirming(
      'quick-file-actions.confirmOnDelete',
      'Are you sure you want to ' + message + '?',
      () => deleteFn(pathToRemove),
      stats.isDirectory(), // always ask for confirmation when deleting directories
    );
  }

  private absolutise(relativePath: string): string {
    return path.resolve(this.root, relativePath);
  }

  private checkingDestination(
    originalPath: string,
    newPath: string,
    action: (newPath: string) => Promise<void>,
  ): Promise<void> {
    if (originalPath === newPath) return Promise.resolve(); // ignore

    const absoluteNewPath = this.absolutise(newPath);
    return fsExtra.existsSync(absoluteNewPath)
      ? this.confirming(
        'quick-file-actions.confirmOnReplace',
        'Destination path already exists, override?',
        () => action(absoluteNewPath),
      )
      : action(absoluteNewPath);
  }

  private confirming(
    configKey: string,
    message: string,
    action: () => Promise<void>,
    alwaysConfirm: boolean = false,
  ): Promise<void> {
    return alwaysConfirm || this.getConfiguration(configKey, true)
      ? this.showConfirmationDialog(message, action)
      : action();
  }
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

// trash is ESM-only, so it has to be loaded with a dynamic import
function moveToTrashBin(pathToRemove: string): Promise<void> {
  return import('trash').then(({ default: trash }) => trash(pathToRemove));
}

export { FileOperations };
