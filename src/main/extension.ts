import {
  commands,
  ExtensionContext,
} from 'vscode';
import { completePathInput } from './PathInput';
import {
  copyFile,
  moveFile,
  newFile,
  removeFile,
} from './QuickFileActions';

export function activate(context: ExtensionContext) {
  context.subscriptions.push(
    commands.registerCommand('extension.quick-file-actions.new', newFile),
  );
  context.subscriptions.push(
    commands.registerCommand('extension.quick-file-actions.delete', removeFile),
  );
  context.subscriptions.push(
    commands.registerCommand('extension.quick-file-actions.move', moveFile),
  );
  context.subscriptions.push(
    commands.registerCommand('extension.quick-file-actions.copy', copyFile),
  );
  context.subscriptions.push(
    commands.registerCommand(
      'extension.quick-file-actions.complete',
      completePathInput,
    ),
  );
}
