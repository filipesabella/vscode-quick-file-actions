import {
  FileSystemError,
  FileType,
  Uri,
  workspace,
  WorkspaceEdit,
} from 'vscode';
import type { FileSystem } from './FileOperations';

// Creating and moving go through a WorkspaceEdit, so they can be undone and
// fire the same events as the Explorer, e.g. letting TypeScript update
// imports when a file is moved.
const vscodeFileSystem: FileSystem = {
  exists: async path => {
    try {
      await workspace.fs.stat(Uri.file(path));
      return true;
    } catch (e) {
      if (e instanceof FileSystemError && e.code === 'FileNotFound') {
        return false;
      }
      throw e;
    }
  },

  isDirectory: async path => {
    const { type } = await workspace.fs.stat(Uri.file(path));
    return (type & FileType.Directory) !== 0;
  },

  createDirectory: async path => {
    await workspace.fs.createDirectory(Uri.file(path));
  },

  createFile: path =>
    applyEdit(
      'create ' + path,
      edit => edit.createFile(Uri.file(path), { overwrite: true }),
    ),

  move: (from, to) =>
    applyEdit(
      'move ' + from + ' to ' + to,
      edit =>
        edit.renameFile(Uri.file(from), Uri.file(to), { overwrite: true }),
    ),

  copy: async (from, to) => {
    await workspace.fs.copy(Uri.file(from), Uri.file(to), { overwrite: true });
  },

  remove: async (path, useTrash) => {
    await workspace.fs.delete(Uri.file(path), { recursive: true, useTrash });
  },
};

// applyEdit reports failure by resolving to false rather than rejecting
async function applyEdit(
  description: string,
  build: (edit: WorkspaceEdit) => void,
): Promise<void> {
  const edit = new WorkspaceEdit();
  build(edit);
  if (!(await workspace.applyEdit(edit))) {
    throw new Error('Could not ' + description);
  }
}

export { vscodeFileSystem };
