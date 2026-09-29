import * as assert from 'assert';
import * as path from 'path';
import {
  describe,
  it,
} from 'vitest';
import { complete } from '../main/Completion';
import type {
  Entry,
  ReadDirectory,
} from '../main/Completion';

const root = path.resolve('/project');
const sep = path.sep;

const tree: Record<string, Entry[]> = {
  [root]: [
    { name: 'src', isDirectory: true },
    { name: 'spec', isDirectory: true },
    { name: 'README.md', isDirectory: false },
    { name: '.gitignore', isDirectory: false },
  ],
  [path.join(root, 'src')]: [
    { name: 'main.ts', isDirectory: false },
    { name: 'main.test.ts', isDirectory: false },
  ],
};

const readDirectory: ReadDirectory = async directory => {
  const entries = tree[directory];
  if (!entries) throw new Error('not found');
  return entries;
};

const completing = (value: string) => complete(root, value, readDirectory);

describe('complete', () => {
  it('completes a single directory match with a separator', async () => {
    assert.deepEqual(await completing('sr'), {
      value: 'src' + sep,
      candidates: [],
    });
  });

  it('completes a single file match', async () => {
    assert.deepEqual(await completing('R'), {
      value: 'README.md',
      candidates: [],
    });
  });

  it('completes up to the common prefix and lists candidates', async () => {
    assert.deepEqual(await completing('s'), {
      value: 's',
      candidates: ['spec' + sep, 'src' + sep],
    });
    assert.deepEqual(await completing('src/m'), {
      value: 'src/main.t',
      candidates: ['main.test.ts', 'main.ts'],
    });
  });

  it('lists the whole directory when nothing is typed after a separator', async () => {
    assert.deepEqual(await completing('src/'), {
      value: 'src/main.t',
      candidates: ['main.test.ts', 'main.ts'],
    });
  });

  it('only offers dotfiles when the segment starts with a dot', async () => {
    assert.deepEqual((await completing('')).candidates, [
      'README.md',
      'spec' + sep,
      'src' + sep,
    ]);
    assert.deepEqual(await completing('.'), {
      value: '.gitignore',
      candidates: [],
    });
  });

  it('leaves the value alone when nothing matches', async () => {
    assert.deepEqual(await completing('zzz'), { value: 'zzz', candidates: [] });
  });

  it('leaves the value alone when the directory does not exist', async () => {
    assert.deepEqual(await completing('nope/a'), {
      value: 'nope/a',
      candidates: [],
    });
  });
});
