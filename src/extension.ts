import * as vscode from "vscode";
import { dirname, join } from "path";
import { writeFileSync } from "fs";
import { env } from "process";

const updateConfig = async () => {
  const conf = vscode.workspace.getConfiguration();
  const name = "terminal.integrated.commandsToSkipShell";
  const val = conf.get(name);
  if (!Array.isArray(val)) return;
  if (val.includes("elicode.shellEnter")) return;
  await conf.update(name, [...val, "elicode.shellEnter"], vscode.ConfigurationTarget.Global);
  console.log(`Updated ${name} setting`);
};

export const activate = async (context: vscode.ExtensionContext) => {
  await updateConfig();
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
    vscode.commands.registerCommand(
      "elicode.openShell",
      () => {
        const home = env.HOME;
        const uri = vscode.window.activeTextEditor?.document.uri;
        if (!uri || !home) return;
        const path = uri.path;
        const wdir = vscode.workspace.getWorkspaceFolder(uri)?.uri.path;
        let term = vscode.window.activeTerminal;
        writeFileSync(join(home, ".vscode-path"),
                      path + "\0" + (wdir ?? ""));
        if (term) {
          term.sendText("\x1b[9;9V", false);
        } else {
          term = vscode.window.createTerminal({ cwd: dirname(path) });
        }
        term.show(false);
      }),
    // vscode.commands.registerCommand(
    //   "elicode.shellEnter",
    //   () => {
    //     // vscode.window.showInformationMessage(`FOO`);
    //     const term = vscode.window.activeTerminal;
    //     if (!term) return;
    //     const home = env.HOME;
    //     const path = vscode.window.activeTextEditor?.document.uri.fsPath;
    //     if (path && home) {
    //       writeFileSync(
    //         join(home, ".preexec"),
    //         `F='${path.replace(/'/g, "'\"'\"'")}'\n`);
    //     }
    //     term.sendText("");
    //   }),
  );
};

export const deactivate = () => { };
