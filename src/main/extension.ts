import { ExtensionContext, commands } from 'vscode';
import { newFile } from './QuickFileActions';

export function activate(context: ExtensionContext) {
  context.subscriptions.push(commands.registerCommand('extension.quick-file-actions.new', newFile));
}
