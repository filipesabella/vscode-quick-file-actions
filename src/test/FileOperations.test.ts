import * as assert from 'assert';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import {
  afterAll,
  beforeEach,
  describe,
  it,
} from 'vitest';
import * as fileOperations from '../main/FileOperations';

const root = fs.mkdtempSync(path.join(os.tmpdir(), 'quick-file-actions-'));
const p = (relativePath: string): string => path.join(root, relativePath);

let configs: Record<string, boolean> = {};
let confirm = false;
let openDocumentCalled = false;
let trashAvailable = true;
let trashed: string[] = [];

const nodeFileSystem: fileOperations.FileSystem = {
  exists: async path => fs.existsSync(path),
  isDirectory: async path => fs.statSync(path).isDirectory(),
  createDirectory: async path => {
    fs.mkdirSync(path, { recursive: true });
  },
  createFile: async file => {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, '');
  },
  move: async (from, to) => {
    fs.mkdirSync(path.dirname(to), { recursive: true });
    fs.rmSync(to, { recursive: true, force: true });
    fs.renameSync(from, to);
  },
  copy: async (from, to) => {
    fs.mkdirSync(path.dirname(to), { recursive: true });
    fs.cpSync(from, to, { recursive: true, force: true });
  },
  remove: async (path, useTrash) => {
    if (useTrash && !trashAvailable) throw new Error('no trash bin');
    if (useTrash) trashed = [...trashed, path];
    fs.rmSync(path, { recursive: true });
  },
};

beforeEach(() => {
  configs = {
    'quick-file-actions.confirmOnReplace': false,
    'quick-file-actions.confirmOnDelete': false,
    'quick-file-actions.moveToTrash': false,
  };

  confirm = false;
  openDocumentCalled = false;
  trashAvailable = true;
  trashed = [];

  fs.rmSync(root, { recursive: true, force: true });
  fs.mkdirSync(p('ccc'), { recursive: true });
  fs.mkdirSync(p('ddd/fff'), { recursive: true });
  fs.writeFileSync(p('aaa'), 'aaa');
  fs.writeFileSync(p('bbb'), 'bbb');
  fs.writeFileSync(p('ddd/eee'), 'eee');
  fs.writeFileSync(p('ddd/fff/ggg'), 'ggg');
});
afterAll(() => fs.rmSync(root, { recursive: true, force: true }));

describe('FileOperations', () => {
  const openDocument = async (file: string): Promise<void> => {
    openDocumentCalled = true;
  };
  const getConfiguration = (key: string, defaultValue: boolean): boolean => {
    return configs[key];
  };
  const showConfirmationDialog = (
    message: string,
    action: () => Promise<void>,
  ): Promise<void> => {
    return confirm ? action() : Promise.resolve();
  };

  const deps: fileOperations.Dependencies = {
    root,
    fileSystem: nodeFileSystem,
    openDocument,
    getConfiguration,
    showConfirmationDialog,
  };

  describe('#create', () => {
    it('creates on the root', async () => {
      await fileOperations.create(deps, 'zzz');
      assert.equal(fs.existsSync(p('zzz')), true);
      assert.equal(openDocumentCalled, true);
    });

    it('creates in a subdir that exists', async () => {
      await fileOperations.create(deps, 'ddd/fff/zzz');
      assert.equal(fs.existsSync(p('ddd/fff/zzz')), true);
      assert.equal(openDocumentCalled, true);
    });

    it('creates in a subdir that does not exist', async () => {
      await fileOperations.create(deps, 'jjj/kkk/lll');
      assert.equal(fs.existsSync(p('jjj/kkk/lll')), true);
      assert.equal(openDocumentCalled, true);
    });

    it('simply creates the directories when path ends with /', async () => {
      await fileOperations.create(deps, 'jjj/kkk/lll/');
      assert.equal(fs.existsSync(p('jjj/kkk/lll/')), true);
      assert.equal(openDocumentCalled, false);
    });
  });

  describe('#remove', () => {
    describe('when it is not needed to confirm', () => {
      it('removes the root', async () => {
        await fileOperations.remove(deps, 'aaa');
        assert.equal(fs.existsSync(p('aaa')), false);
      });

      it('removes a in subdir', async () => {
        await fileOperations.remove(deps, 'ddd/fff/ggg');
        assert.equal(fs.existsSync(p('ddd/fff/ggg')), false);
      });

      describe('and the user is deleting a directory, it requires confirmation anyway', () => {
        it('removes a non-empty subdir when confirming', async () => {
          confirm = true;
          await fileOperations.remove(deps, 'ddd/fff/');
          assert.equal(fs.existsSync(p('ddd/')), true);
          assert.equal(fs.existsSync(p('ddd/fff')), false);
        });

        it('does not remove a non-empty subdir when not confirming', async () => {
          confirm = false;
          await fileOperations.remove(deps, 'ddd/fff/');
          assert.equal(fs.existsSync(p('ddd/')), true);
          assert.equal(fs.existsSync(p('ddd/fff')), true);
        });
      });
    });

    describe('when it is needed to confirm', () => {
      it('removes on the root when confirming', async () => {
        configs['quick-file-actions.confirmOnDelete'] = true;
        confirm = true;
        await fileOperations.remove(deps, 'aaa');
        assert.equal(fs.existsSync(p('aaa')), false);
      });

      it('does not remove on the root when not confirming', async () => {
        configs['quick-file-actions.confirmOnDelete'] = true;
        confirm = false;
        await fileOperations.remove(deps, 'aaa');
        assert.equal(fs.existsSync(p('aaa')), true);
      });
    });
  });

  describe('#remove with moveToTrash', () => {
    beforeEach(() => {
      configs['quick-file-actions.moveToTrash'] = true;
    });

    it('moves to the trash bin', async () => {
      await fileOperations.remove(deps, 'aaa');
      assert.deepEqual(trashed, [p('aaa')]);
      assert.equal(fs.existsSync(p('aaa')), false);
    });

    describe('when there is no trash bin', () => {
      beforeEach(() => {
        trashAvailable = false;
      });

      it('permanently deletes when confirming', async () => {
        confirm = true;
        await fileOperations.remove(deps, 'aaa');
        assert.equal(fs.existsSync(p('aaa')), false);
      });

      it('does not delete when not confirming', async () => {
        confirm = false;
        await fileOperations.remove(deps, 'aaa');
        assert.equal(fs.existsSync(p('aaa')), true);
      });
    });
  });

  describe('#move', () => {
    it('moves on the root', async () => {
      await fileOperations.move(deps, 'aaa', 'zzz');
      assert.equal(fs.existsSync(p('aaa')), false);
      assert.equal(fs.existsSync(p('zzz')), true);
      assert.equal(fs.readFileSync(p('zzz')), 'aaa');
      assert.equal(openDocumentCalled, true);
    });

    it('moves to existing subdir specifying the file', async () => {
      await fileOperations.move(deps, 'aaa', 'ccc/zzz');
      assert.equal(fs.existsSync(p('aaa')), false);
      assert.equal(fs.existsSync(p('ccc/zzz')), true);
      assert.equal(fs.readFileSync(p('ccc/zzz')), 'aaa');
      assert.equal(openDocumentCalled, true);
    });

    it('moves to existing subdir without specifying the file', async () => {
      await fileOperations.move(deps, 'aaa', 'ccc/');
      assert.equal(fs.existsSync(p('aaa')), false);
      assert.equal(fs.existsSync(p('ccc/aaa')), true);
      assert.equal(fs.readFileSync(p('ccc/aaa')), 'aaa');
      assert.equal(openDocumentCalled, true);
    });

    it('moves to non-existing subdir specifying the file', async () => {
      await fileOperations.move(deps, 'aaa', 'jjj/kkk/lll');
      assert.equal(fs.existsSync(p('aaa')), false);
      assert.equal(fs.existsSync(p('jjj/kkk/lll')), true);
      assert.equal(fs.readFileSync(p('jjj/kkk/lll')), 'aaa');
      assert.equal(openDocumentCalled, true);
    });

    it('moves to non-existing subdir without specifying the file', async () => {
      await fileOperations.move(deps, 'aaa', 'jjj/kkk/');
      assert.equal(fs.existsSync(p('aaa')), false);
      assert.equal(fs.existsSync(p('jjj/kkk/aaa')), true);
      assert.equal(fs.readFileSync(p('jjj/kkk/aaa')), 'aaa');
      assert.equal(openDocumentCalled, true);
    });

    it('moves to existing subsubdir without specifying the file', async () => {
      await fileOperations.move(deps, 'aaa', 'ddd/fff/');
      assert.equal(fs.existsSync(p('aaa')), false);
      assert.equal(fs.existsSync(p('ddd/fff/aaa')), true);
      assert.equal(fs.readFileSync(p('ddd/fff/aaa')), 'aaa');
      assert.equal(openDocumentCalled, true);
    });

    describe('when overriding', () => {
      describe('and it is not needed to confirm', () => {
        it('overrides', async () => {
          await fileOperations.move(deps, 'ddd/fff/ggg', 'aaa');
          assert.equal(fs.existsSync(p('ddd/fff/ggg')), false);
          assert.equal(fs.readFileSync(p('aaa')), 'ggg');
          assert.equal(openDocumentCalled, true);
        });
      });

      describe('and it is needed to confirm', () => {
        describe('and the user does not confirm', () => {
          it('does nothing', async () => {
            configs['quick-file-actions.confirmOnReplace'] = true;
            confirm = false;

            await fileOperations.move(deps, 'aaa', 'bbb');
            assert.equal(fs.existsSync(p('aaa')), true);
            assert.equal(fs.existsSync(p('bbb')), true);
            assert.equal(fs.readFileSync(p('aaa')), 'aaa');
            assert.equal(fs.readFileSync(p('bbb')), 'bbb');
            assert.equal(openDocumentCalled, false);
          });
        });

        describe('and the user confirms', () => {
          it('overrides', async () => {
            configs['quick-file-actions.confirmOnReplace'] = true;
            confirm = true;

            await fileOperations.move(deps, 'aaa', 'bbb');
            assert.equal(fs.existsSync(p('aaa')), false);
            assert.equal(fs.existsSync(p('bbb')), true);
            assert.equal(fs.readFileSync(p('bbb')), 'aaa');
            assert.equal(openDocumentCalled, true);
          });
        });
      });
    });
  });

  describe('#copy', () => {
    it('copies on the root', async () => {
      await fileOperations.copy(deps, 'aaa', 'zzz');
      assert.equal(fs.existsSync(p('aaa')), true);
      assert.equal(fs.existsSync(p('zzz')), true);
      assert.equal(fs.readFileSync(p('aaa')), 'aaa');
      assert.equal(fs.readFileSync(p('zzz')), 'aaa');
      assert.equal(openDocumentCalled, true);
    });

    it('copies to existing subdir specifying the file', async () => {
      await fileOperations.copy(deps, 'aaa', 'ccc/zzz');
      assert.equal(fs.existsSync(p('aaa')), true);
      assert.equal(fs.existsSync(p('ccc/zzz')), true);
      assert.equal(fs.readFileSync(p('aaa')), 'aaa');
      assert.equal(fs.readFileSync(p('ccc/zzz')), 'aaa');
      assert.equal(openDocumentCalled, true);
    });

    it('copies to existing subdir without specifying the file', async () => {
      await fileOperations.copy(deps, 'aaa', 'ccc/');
      assert.equal(fs.existsSync(p('aaa')), true);
      assert.equal(fs.existsSync(p('ccc/aaa')), true);
      assert.equal(fs.readFileSync(p('aaa')), 'aaa');
      assert.equal(fs.readFileSync(p('ccc/aaa')), 'aaa');
      assert.equal(openDocumentCalled, true);
    });

    it('copies to non-existing subdir specifying the file', async () => {
      await fileOperations.copy(deps, 'aaa', 'jjj/kkk/lll');
      assert.equal(fs.existsSync(p('aaa')), true);
      assert.equal(fs.existsSync(p('jjj/kkk/lll')), true);
      assert.equal(fs.readFileSync(p('aaa')), 'aaa');
      assert.equal(fs.readFileSync(p('jjj/kkk/lll')), 'aaa');
      assert.equal(openDocumentCalled, true);
    });

    it('copies to non-existing subdir without specifying the file', async () => {
      await fileOperations.copy(deps, 'aaa', 'jjj/kkk/');
      assert.equal(fs.existsSync(p('aaa')), true);
      assert.equal(fs.existsSync(p('jjj/kkk/aaa')), true);
      assert.equal(fs.readFileSync(p('aaa')), 'aaa');
      assert.equal(fs.readFileSync(p('jjj/kkk/aaa')), 'aaa');
      assert.equal(openDocumentCalled, true);
    });

    it('copies to existing subsubdir without specifying the file', async () => {
      await fileOperations.copy(deps, 'aaa', 'ddd/fff/');
      assert.equal(fs.existsSync(p('aaa')), true);
      assert.equal(fs.existsSync(p('ddd/fff/aaa')), true);
      assert.equal(fs.readFileSync(p('aaa')), 'aaa');
      assert.equal(fs.readFileSync(p('ddd/fff/aaa')), 'aaa');
      assert.equal(openDocumentCalled, true);
    });

    describe('when overriding', () => {
      describe('and it is not needed to confirm', () => {
        it('overrides', async () => {
          await fileOperations.copy(deps, 'ddd/fff/ggg', 'aaa');
          assert.equal(fs.existsSync(p('ddd/fff/ggg')), true);
          assert.equal(fs.readFileSync(p('aaa')), 'ggg');
          assert.equal(fs.readFileSync(p('ddd/fff/ggg')), 'ggg');
          assert.equal(openDocumentCalled, true);
        });
      });

      describe('and it is needed to confirm', () => {
        describe('and the user does not confirm', () => {
          it('does nothing', async () => {
            configs['quick-file-actions.confirmOnReplace'] = true;
            confirm = false;

            await fileOperations.copy(deps, 'aaa', 'bbb');
            assert.equal(fs.existsSync(p('aaa')), true);
            assert.equal(fs.existsSync(p('bbb')), true);
            assert.equal(fs.readFileSync(p('aaa')), 'aaa');
            assert.equal(fs.readFileSync(p('bbb')), 'bbb');
            assert.equal(openDocumentCalled, false);
          });
        });

        describe('and the user confirms', () => {
          it('overrides', async () => {
            configs['quick-file-actions.confirmOnReplace'] = true;
            confirm = true;

            await fileOperations.copy(deps, 'aaa', 'bbb');
            assert.equal(fs.existsSync(p('aaa')), true);
            assert.equal(fs.existsSync(p('bbb')), true);
            assert.equal(fs.readFileSync(p('aaa')), 'aaa');
            assert.equal(fs.readFileSync(p('bbb')), 'aaa');
            assert.equal(openDocumentCalled, true);
          });
        });
      });
    });
  });
});
