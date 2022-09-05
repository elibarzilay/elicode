import * as vscode from "vscode";

export const activate = (context: vscode.ExtensionContext) => {
  context.subscriptions.push(
    vscode.commands.registerTextEditorCommand(
      "elicode.cursorMove",
      async (editor, _edit, opts) => {
        const sels = editor.selections.filter(s => !s.isEmpty);
        if (sels.length && !opts?.select) {
          // await vscode.commands.executeCommand("cancelSelection");
          editor.selections = sels.map(s => new vscode.Selection(s.active, s.active));
        }
        return vscode.commands.executeCommand("cursorMove", opts);
      }),
    vscode.commands.registerTextEditorCommand(
      "elicode.shellCommand",
      async (editor, _edit, _opts) => {
        // vscode.window.activeTerminal.
        vscode.window.showInformationMessage(`Not implemented yet! ${editor.document.fileName}`);
      }),
  );
};

export const deactivate = () => { };
