import { ExtensionContext, commands, window, workspace } from 'vscode';
import { FileOperations } from './FileOperations';
import * as path from 'path';

const fileOperations = new FileOperations(
  workspace.rootPath,
  openDocument,
  getConfiguration,
  showConfirmationDialog);

function newFile() {
  const currentEditorPath = window.activeTextEditor ? path.dirname(window.activeTextEditor.document.fileName) : '';
  const currentPath = currentEditorPath === '.' ? '' : currentEditorPath;
  let relativeCurrentPath = workspace.asRelativePath(currentPath);
  // when the current path is at the root of the workspace, ^ this function returns the input :/
  relativeCurrentPath = relativeCurrentPath === currentPath ? '' : relativeCurrentPath;

  window
    .showInputBox({
      placeHolder: 'New file name',
      prompt: 'New file name, relative to the workspace',
      value: relativeCurrentPath !== '' ? relativeCurrentPath + path.sep : relativeCurrentPath,
      validateInput: validatedInput
    })
    .then(ignoringEmptyInput(catchingError(newPath => fileOperations.create(newPath))));
}

function removeFile(): void {
  doFileAction(
    'File or directory to be deleted',
    'File or directory to be deleted, relative to the workspace',
    (_, newPath) => fileOperations.remove(newPath));
}

function doFileAction(placeHolder: string, prompt: string, fn: (relativeCurrentPath: string, newPath: string) => Promise<void>): void {
  currentEditorPath().map(relativeCurrentPath =>
    window
      .showInputBox({
        placeHolder: placeHolder,
        prompt: prompt,
        value: relativeCurrentPath,
        validateInput: validatedInput
      })
      .then(ignoringEmptyInput(catchingError(newPath => fn(relativeCurrentPath, newPath)))));
}

function catchingError(fn: (s: string) => Promise<void>) {
  return (value: string) => fn(value).catch(e => window.showErrorMessage(e));
}

function ignoringEmptyInput(fn: (s: string) => Promise<void>) {
  return (value: string) => value === null || value === undefined ? Promise.resolve() : fn(value);
}

function currentEditorPath(): { map: (fn: (relativeCurrentPath: string) => void) => void } {
  // wannabe Option
  if (window.activeTextEditor && window.activeTextEditor.document.fileName) {
    return {
      map: (fn: (relativeCurrentPath: string) => void) => {
        const currentPath = window.activeTextEditor.document.fileName;
        fn(workspace.asRelativePath(currentPath));
      }
    };
  } else {
    return {
      map: (fn: (relativeCurrentPath: string) => void) => { }
    };
  }
}

function validatedInput(s: string): string | null {
  return s.trim() === '' ? 'Enter a value' : null;
}

function getConfiguration(key: string, defaultVaulue: boolean): boolean {
  return workspace.getConfiguration().get(key, defaultVaulue);
}

function openDocument(file: string): void {
  workspace.openTextDocument(file).then(window.showTextDocument);
}

async function showConfirmationDialog(message: string, action: () => Promise<void>): Promise<void> {
  const button = 'Confirm';
  const clickedButton = await window.showWarningMessage(message, { modal: true }, button);
  return clickedButton === button ? action() : Promise.resolve();
}

export { newFile, removeFile };
