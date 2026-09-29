// The file system operations FileOperations needs, all on absolute paths.
// Creating, moving and copying overwrite the destination and create any
// missing parent directories.
type FileSystem = {
  exists: (path: string) => Promise<boolean>,
  isDirectory: (path: string) => Promise<boolean>,
  createDirectory: (path: string) => Promise<void>,
  createFile: (path: string) => Promise<void>,
  move: (from: string, to: string) => Promise<void>,
  copy: (from: string, to: string) => Promise<void>,
  remove: (path: string, useTrash: boolean) => Promise<void>,
};

export type { FileSystem };
