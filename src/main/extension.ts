import { ExtensionContext, commands } from 'vscode';
import { newFile, removeFile, moveFile } from "./QuickFileActions";

export function activate(context: ExtensionContext) {
  context.subscriptions.push(commands.registerCommand('extension.quick-file-actions.new', newFile));
  context.subscriptions.push(commands.registerCommand('extension.quick-file-actions.delete', removeFile));
  context.subscriptions.push(commands.registerCommand('extension.quick-file-actions.move', moveFile));
}
