import * as path from 'path';

type Entry = { name: string, isDirectory: boolean };

type ReadDirectory = (path: string) => Promise<Entry[]>;

type Completion = {
  value: string,
  // only when the completion is ambiguous
  candidates: string[],
};

// Shell-like completion of the last segment of a path relative to root:
// a single match is completed fully, with a trailing separator for
// directories, several matches are completed up to their common prefix.
// Dotfiles are only offered when the segment starts with a dot.
async function complete(
  root: string,
  value: string,
  readDirectory: ReadDirectory,
): Promise<Completion> {
  const separatorIndex = Math.max(
    value.lastIndexOf('/'),
    value.lastIndexOf(path.sep),
  );
  const directory = value.slice(0, separatorIndex + 1);
  const prefix = value.slice(separatorIndex + 1);

  const entries = await readDirectory(path.resolve(root, directory))
    .catch((): Entry[] => []);
  const names = entries
    .filter(({ name }) =>
      name.startsWith(prefix)
      && (prefix.startsWith('.') || !name.startsWith('.'))
    )
    .map(({ name, isDirectory }) => isDirectory ? name + path.sep : name)
    .sort();

  if (names.length === 0) return { value, candidates: [] };
  if (names.length === 1) {
    return { value: directory + names[0], candidates: [] };
  }
  return { value: directory + commonPrefix(names), candidates: names };
}

function commonPrefix(strings: string[]): string {
  return strings.reduce((prefix, s) => {
    const length = prefix.split('').findIndex((c, i) => s[i] !== c);
    return length === -1 ? prefix : prefix.slice(0, length);
  });
}

export { complete };
export type { Entry, ReadDirectory };
