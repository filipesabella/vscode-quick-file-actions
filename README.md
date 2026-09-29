# vscode-quick-file-actions

Quickly create, move, copy, and delete files from the keyboard.

![In action](image.gif)

## Features

Every action prompts for a path, relative to the workspace folder of the
current file. A path ending in `/` means a directory.

In every prompt, `tab` completes directory and file names, like a shell: a
unique match is completed, and several matches are completed up to their
common prefix and listed below the input. Dotfiles are only offered once you
type a `.`.

Actions go through VS Code itself, so they work in remote workspaces too.
Creating and moving files can be undone like any other edit, and moving a file
lets language extensions update imports, just like dragging it in the Explorer
does.

### Create

`ctrl+alt+f n`

Creates a new file, starting from the directory of the current file, or the
workspace root if no file is open. A path ending in `/` creates a directory
instead. Missing parent directories are created.

### Move

`ctrl+alt+f m`

Moves the current file. If the new location is a directory, the file is moved
into it, otherwise it's moved and renamed to the given path.

### Copy

`ctrl+alt+f c`

Copies the current file. If the new location is a directory, the file is copied
into it, otherwise it's copied and renamed to the given path.

### Delete

`ctrl+alt+f d`

Deletes a file or directory, starting from the current file. By default it's
moved to the trash bin; where there is no trash bin, e.g. in some remote
workspaces, it offers to delete permanently instead. Deleting a directory
always asks for confirmation.

When creating, moving, or copying onto a path that already exists, you're asked
to confirm the replacement.

## Extension Settings

| Setting                                | Description                                                                                            | Default |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------ | ------- |
| `quick-file-actions.moveToTrash`       | Whether deleting moves the file or directory to the trash bin, or permanently deletes it.              | `true`  |
| `quick-file-actions.confirmOnDelete`   | Whether to ask for confirmation when deleting files. Directories always ask.                           | `true`  |
| `quick-file-actions.confirmOnReplace`  | Whether to ask for confirmation when creating, moving, or copying onto a path that already exists.     | `true`  |

## Development

```sh
yarn install
yarn test     # unit tests, with vitest
yarn check    # type check and dprint formatting check
yarn fmt      # format with dprint
yarn package  # build a .vsix
```

Press `F5` in VS Code to run the extension in a new window.

## Release Notes

### 2.0.0

- Requires VS Code 1.138 or later.
- Tab completion of paths in every prompt.
- File actions go through VS Code: undo for create and move, import updates on
  move, and support for remote workspaces.
- Paths are relative to the current file's workspace folder, fixing
  multi-root workspaces.
- Typing a trailing `/` works as a directory on Windows too.

### 1.0.0

Initial release.
