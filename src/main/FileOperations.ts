import * as fsExtra from 'fs-extra';
import * as fs from 'fs';
import * as path from 'path';
const trash = require('trash');

class FileOperations {
  constructor(
    private readonly root: string,
    private readonly openDocument: (file: string) => void,
    private readonly getConfiguration: (key: string, defaultValue: boolean) => boolean,
    private readonly showConfirmationDialog: (message: string, action: () => Promise<void>) => Promise<void>) { }

  create(newPath: string): Promise<void> {
    if (newPath.endsWith(path.sep)) {
      return fsExtra.mkdirp(this.absolutise(newPath));
    } else {
      return this.checkingDestination('', newPath, (newPath) => fsExtra
        .mkdirp(path.dirname(newPath))
        .then(() => fsExtra
          .writeFile(newPath, '')
          .then(() => this.openDocument(newPath))));
    }
  }

  move(originalPath: string, newPath: string): Promise<void> {
    // if the user is moving the file to a directory, append the original file name
    // to the path
    newPath = newPath.endsWith(path.sep) ? newPath + path.basename(originalPath) : newPath;

    return this.checkingDestination(originalPath, newPath, (newPath) =>
      fsExtra
        .move(this.absolutise(originalPath), newPath, { overwrite: true })
        .then(() => this.openDocument(newPath)));
  }

  copy(originalPath: string, newPath: string): Promise<void> {
    // if the user is copying the file to a directory, append the original file name
    // to the path
    newPath = newPath.endsWith(path.sep) ? newPath + path.basename(originalPath) : newPath;

    return this.checkingDestination(originalPath, newPath, (newPath) =>
      fsExtra
        .copy(this.absolutise(originalPath), newPath)
        .then(() => this.openDocument(newPath)));
  }

  remove(relativePathToRemove: string): Promise<void> {
    const pathToRemove = this.absolutise(relativePathToRemove);
    if (fsExtra.existsSync(pathToRemove)) {
      return fsExtra.lstat(pathToRemove)
        .then(stats => {
          const isDirectory = stats.isDirectory();

          const moveToTrash = this.getConfiguration('quick-file-actions.moveToTrash', true);

          const message = moveToTrash ? 'move ' + relativePathToRemove + ' to the trash bin' : 'permanently delete ' + pathToRemove;
          const deleteFn = moveToTrash ? trash : fsExtra.remove;

          return this.confirming(
            'quick-file-actions.confirmOnDelete',
            'Are you sure you want to ' + message + '?',
            () => deleteFn(pathToRemove),
            isDirectory); // always ask for confirmation when deleting directories
        });
    } else {
      return Promise.reject('Path to delete does not exist');
    }
  }


  private absolutise(relativePath: string): string {
    return path.resolve(this.root, relativePath);
  }

  private checkingDestination(originalPath: string, newPath, action: (newPath: string) => Promise<void>): Promise<void> {
    if (originalPath === newPath) return Promise.resolve(); // ignore

    let absoluteNewPath = this.absolutise(newPath);
    if (fsExtra.existsSync(absoluteNewPath)) {
      return this.confirming('quick-file-actions.confirmOnReplace', 'Destination path already exists, override?', () => action(absoluteNewPath));
    } else {
      return action(absoluteNewPath);
    }
  }

  private confirming(configKey: string, message: string, action: () => Promise<void>, alwaysConfirm: boolean = false): Promise<void> {
    if (alwaysConfirm || this.getConfiguration(configKey, true) === true) {
      return this.showConfirmationDialog(message, action);
    } else {
      return action();
    }
  }
}

export { FileOperations };
