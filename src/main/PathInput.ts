import {
  commands,
  window,
} from 'vscode';
import { complete } from './Completion';
import { readDirectory } from './VscodeFileSystem';

// set while a path input is open, so the tab keybinding only applies there
const contextKey = 'quickFileActions.pathInput';

// completes the path in the open input, if any; bound to tab
let completeActiveInput: () => Promise<void> = async () => {};

function completePathInput(): Promise<void> {
  return completeActiveInput();
}

// An input box like window.showInputBox, with tab completion of paths
// relative to root. Resolves to undefined when cancelled.
function showPathInput(
  root: string,
  options: { placeHolder: string, prompt: string, value: string },
): Promise<string | undefined> {
  const input = window.createInputBox();
  input.placeholder = options.placeHolder;
  input.prompt = options.prompt;
  input.value = options.value;

  // the value last set by a completion, whose candidates are in the prompt
  let completedValue: string | undefined;

  return new Promise(resolve => {
    input.onDidChangeValue(value => {
      input.validationMessage = validatedInput(value);
      if (value !== completedValue) input.prompt = options.prompt;
    });

    input.onDidAccept(() => {
      if (validatedInput(input.value)) return;
      resolve(input.value);
      input.hide();
    });

    input.onDidHide(() => {
      resolve(undefined);
      completeActiveInput = async () => {};
      commands.executeCommand('setContext', contextKey, false);
      input.dispose();
    });

    completeActiveInput = async () => {
      const { value, candidates } = await complete(
        root,
        input.value,
        readDirectory,
      );
      completedValue = value;
      input.value = value;
      input.valueSelection = [value.length, value.length];
      input.prompt = candidates.length > 0
        ? candidates.join('   ')
        : options.prompt;
    };

    commands.executeCommand('setContext', contextKey, true);
    input.show();
  });
}

function validatedInput(s: string): string | undefined {
  return s.trim() === '' ? 'Enter a value' : undefined;
}

export { completePathInput, showPathInput };
