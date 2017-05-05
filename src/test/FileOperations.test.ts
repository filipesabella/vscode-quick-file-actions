import * as assert from 'assert';
import * as fsExtra from 'fs-extra';
import * as fs from 'fs';
import { FileOperations } from '../main/FileOperations';
const mockFs = require('mock-fs');

let configs = {};
let confirm = false;
let openDocumentCalled = false;
let openDocumentCalledWith = '';

beforeEach(() => {
  configs = {
    'quick-file-actions.confirmOnReplace': false,
    'quick-file-actions.confirmOnDelete': false,
    'quick-file-actions.moveToTrash': false,
  };

  confirm = false;
  openDocumentCalled = false;

  mockFs({
    'project/': {
      'aaa': 'aaa',
      'bbb': 'bbb',
      'ccc': {},
      'ddd': {
        'eee': 'eee',
        'fff': {
          'ggg': 'ggg'
        }
      }
    }
  });
});
afterEach(mockFs.restore);

describe('FileOperations', () => {
  const openDocument = (file: string): void => { openDocumentCalled = true; };
  const getConfiguration = (key: string, defaultValue: boolean): boolean => { return configs[key]; };
  const showConfirmationDialog = (message: string, action: () => Promise<void>): Promise<void> => {
    return confirm ? action() : Promise.resolve();
  };

  const fileOperations = new FileOperations('project/', openDocument, getConfiguration, showConfirmationDialog);

  describe('#create', () => {
    it('creates on the root', async () => {
      await fileOperations.create('zzz');
      assert.equal(fs.existsSync('project/zzz'), true);
      assert.equal(openDocumentCalled, true);
    });

    it('creates in a subdir that exists', async () => {
      await fileOperations.create('ddd/fff/zzz');
      assert.equal(fs.existsSync('project/ddd/fff/zzz'), true);
      assert.equal(openDocumentCalled, true);
    });

    it('creates in a subdir that does not exist', async () => {
      await fileOperations.create('jjj/kkk/lll');
      assert.equal(fs.existsSync('project/jjj/kkk/lll'), true);
      assert.equal(openDocumentCalled, true);
    });

    it('simply creates the directories when path ends with /', async () => {
      await fileOperations.create('jjj/kkk/lll/');
      assert.equal(fsExtra.pathExistsSync('project/jjj/kkk/lll/'), true);
      assert.equal(openDocumentCalled, false);
    });
  });

  describe('#remove', () => {
    describe('when it is not needed to confirm', () => {
      it('removes the root', async () => {
        await fileOperations.remove('aaa');
        assert.equal(fs.existsSync('project/aaa'), false);
      });

      it('removes a in subdir', async () => {
        await fileOperations.remove('ddd/fff/ggg');
        assert.equal(fs.existsSync('project/ddd/fff/ggg'), false);
      });

      describe('and the user is deleting a directory, it requires confirmation anyway', () => {
        it('removes a non-empty subdir when confirming', async () => {
          confirm = true;
          await fileOperations.remove('ddd/fff/');
          assert.equal(fsExtra.pathExistsSync('project/ddd/'), true);
          assert.equal(fsExtra.pathExistsSync('project/ddd/fff'), false);
        });

        it('does not remove a non-empty subdir when not confirming', async () => {
          confirm = false;
          await fileOperations.remove('ddd/fff/');
          assert.equal(fsExtra.pathExistsSync('project/ddd/'), true);
          assert.equal(fsExtra.pathExistsSync('project/ddd/fff'), true);
        });
      });
    });

    describe('when it is needed to confirm', () => {
      it('removes on the root when confirming', async () => {
        configs['quick-file-actions.confirmOnDelete'] = true;
        confirm = true;
        await fileOperations.remove('aaa');
        assert.equal(fs.existsSync('project/aaa'), false);
      });

      it('does not remove on the root when not confirming', async () => {
        configs['quick-file-actions.confirmOnDelete'] = true;
        confirm = false;
        await fileOperations.remove('aaa');
        assert.equal(fs.existsSync('project/aaa'), true);
      });
    });
  });
});
