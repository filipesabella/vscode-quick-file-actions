import * as path from 'path';
import {
  Uri,
  window,
  workspace,
} from 'vscode';
import * as fileOperations from './FileOperations';
import type { Dependencies } from './FileOperations';
import { vscodeFileSystem } from './VscodeFileSystem';

type Context = {
  deps: Dependencies,
  // the active file, relative to root when inside it, absolute otherwise
  currentFile: string | undefined,
};

// Resolved per command: the workspace folder of the active file, falling back
// to the first folder, or to the file's own directory when no folder is open.
function currentContext(): Context | undefined {
  const uri = window.activeTextEditor?.document.uri;
  const fileUri = uri?.scheme === 'file' ? uri : undefined;
  const fileFolder = fileUri && workspace.getWorkspaceFolder(fileUri);
  const root = (fileFolder ?? workspace.workspaceFolders?.[0])?.uri.fsPath
    ?? (fileUri && path.dirname(fileUri.fsPath));

  if (root === undefined) return undefined;

  return {
    deps: {
      root,
      fileSystem: vscodeFileSystem,
      openDocument,
      getConfiguration,
      showConfirmationDialog,
    },
    currentFile: fileUri && (fileFolder
      ? path.relative(root, fileUri.fsPath)
      : fileUri.fsPath),
  };
}

async function newFile(): Promise<void> {
  const context = currentContext();
  if (!context) {
    window.showErrorMessage('Open a folder or a file first');
    return;
  }

  const currentDir = context.currentFile && path.dirname(context.currentFile);
  const value = currentDir && currentDir !== '.' ? currentDir + path.sep : '';

  const newPath = await window.showInputBox({
    placeHolder: 'New file name',
    prompt: 'New file name, relative to the workspace',
    value,
    validateInput: validatedInput,
  });

  await runAction(
    newPath,
    newPath => fileOperations.create(context.deps, newPath),
  );
}

function removeFile(): Promise<void> {
  return doFileAction(
    'File or directory to be deleted',
    'File or directory to be deleted, relative to the workspace',
    (deps, _, newPath) => fileOperations.remove(deps, newPath),
  );
}

function moveFile(): Promise<void> {
  return doFileAction(
    'File or directory to move the current file to',
    'File or directory to move the current file to, relative to the workspace',
    (deps, currentFile, newPath) =>
      fileOperations.move(deps, currentFile, newPath),
  );
}

function copyFile(): Promise<void> {
  return doFileAction(
    'File or directory to copy the current file to',
    'File or directory to copy the current file to, relative to the workspace',
    (deps, currentFile, newPath) =>
      fileOperations.copy(deps, currentFile, newPath),
  );
}

async function doFileAction(
  placeHolder: string,
  prompt: string,
  fn: (
    deps: Dependencies,
    currentFile: string,
    newPath: string,
  ) => Promise<void>,
): Promise<void> {
  const context = currentContext();
  const currentFile = context?.currentFile;
  if (!context || currentFile === undefined) return;

  const newPath = await window.showInputBox({
    placeHolder,
    prompt,
    value: currentFile,
    validateInput: validatedInput,
  });

  await runAction(
    newPath,
    newPath => fn(context.deps, currentFile, newPath),
  );
}

// ignores a cancelled input box, and reports errors instead of throwing
async function runAction(
  input: string | undefined,
  action: (input: string) => Promise<void>,
): Promise<void> {
  if (input === undefined) return;
  try {
    await action(input);
  } catch (e) {
    window.showErrorMessage(e instanceof Error ? e.message : String(e));
  }
}

function validatedInput(s: string): string | null {
  return s.trim() === '' ? 'Enter a value' : null;
}

function getConfiguration(key: string, defaultValue: boolean): boolean {
  return workspace.getConfiguration().get(key, defaultValue);
}

async function openDocument(file: string): Promise<void> {
  await window.showTextDocument(Uri.file(file));
}

async function showConfirmationDialog(
  message: string,
  action: () => Promise<void>,
): Promise<void> {
  const button = 'Confirm';
  const clickedButton = await window.showWarningMessage(message, {
    modal: true,
  }, button);
  return clickedButton === button ? action() : undefined;
}

export { copyFile, moveFile, newFile, removeFile };
