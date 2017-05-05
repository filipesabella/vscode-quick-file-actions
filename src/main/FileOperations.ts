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
