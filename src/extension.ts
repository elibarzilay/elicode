import * as vscode from "vscode";
import { dirname, join } from "path";
import { writeFileSync } from "fs";
import { env } from "process";

const cmd = (name: string, args?: any) =>
  vscode.commands.executeCommand(name, args);

const say = (str: string) =>
  vscode.window.showInformationMessage(str);

const updateConfig = async () => {
  const conf = vscode.workspace.getConfiguration();
  const name = "terminal.integrated.commandsToSkipShell";
  const val = conf.get(name);
  if (!Array.isArray(val)) return;
  if (val.includes("elicode.shellEnter")) return;
  await conf.update(
    name, [...val, "elicode.shellEnter"], vscode.ConfigurationTarget.Global);
  console.log(`Updated ${name} setting`);
};

const cursorMove = async (
  editor: vscode.TextEditor, _edit: vscode.TextEditorEdit, opts: any
) => {
  const sels = editor.selections.filter(s => !s.isEmpty);
  if (sels.length && !opts?.select) {
    // await cmd("cancelSelection");
    editor.selections = sels.map(s => new vscode.Selection(s.active, s.active));
  }
  return cmd("cursorMove", opts);
};

// Doesn't work because I can't figure out how to change the config options
const _reindentSelectionWithSpaces = async () => {
  const editor = vscode.window.activeTextEditor;
  if (!editor) return;
  const qp = vscode.window.createQuickPick();
  qp.items = "12345678".split("").map(n => ({ label: n }));
  qp.placeholder = "Select indentation level";
  qp.activeItems = [qp.items[1]]; // Default to "2"
  const spaces = await new Promise<number>((res) => {
    const ret = (n: number) => { qp.dispose(); res(n); };
    qp.onDidAccept(() => ret(parseInt(qp.selectedItems[0]?.label || "0")));
    qp.onDidHide(() => ret(-1));
    qp.show();
  });
  if (spaces === -1) return;
  Object.assign(editor.options, { tabSize: spaces, insertSpaces: true });
  await cmd("editor.action.reindentselectedlines");
};

type ShellArgs = { sync?: boolean, new?: boolean, inTerm?: boolean };
let syncShellTimeout: NodeJS.Timeout | null = null;
const openShell = async (args: ShellArgs) => {
  const home = env.HOME;
  if (!home) return;
  const uri = vscode.window.activeTextEditor?.document.uri;
  const file = uri ? uri.path : "";
  const wdir =
    uri && vscode.workspace.getWorkspaceFolder(uri)?.uri.path
    || vscode.workspace.workspaceFolders?.[0]?.uri.path
    || "";
  let term = vscode.window.activeTerminal;
  // Shell context info
  const shQuote = (str: string) => str.replace(/'/g, "'\\''");
  writeFileSync(join(home, ".vscode-sync"), [
    `file='${shQuote(file)}'`,
    `wdir='${shQuote(wdir ?? "")}'`,
    `chdir='yes'`,
  ].join("\n") + "\n");
  if (args?.inTerm) {
    if (!syncShellTimeout) {
      return await cmd("workbench.action.terminal.toggleTerminal");
    } else {
      clearTimeout(syncShellTimeout);
      syncShellTimeout = null;
    }
  } else if (!term || args?.new) {
    term = vscode.window.createTerminal({ cwd: dirname(file) });
  } else if (args?.sync && term) {
    // Notify shell to sync info after a cancelable delay
    if (syncShellTimeout) clearTimeout(syncShellTimeout);
    syncShellTimeout = setTimeout(async () => {
      syncShellTimeout = null;
      const pid = await term?.processId;
      if (pid) process.kill(pid, "SIGUSR1");
    }, 500);
  }
  return term?.show(false);
};

type DelayedCommandArgs = { delay: number, command: string, args: object };
const delayedCommand = (args: DelayedCommandArgs) =>
  new Promise<void>((res) => {
    setTimeout(() => {
      cmd(args.command, args.args ?? {});
      res();
    }, args.delay);
  });

const commands = [
  openShell,
  delayedCommand,
  // reindentSelectionWithSpaces,
];
const editorCommands = [
  cursorMove,
];

export const activate = async (context: vscode.ExtensionContext) => {
  await updateConfig();
  commands.forEach(c =>
    context.subscriptions.push(vscode.commands.registerCommand(
      `elicode.${c.name}`, c)));
  editorCommands.forEach(c =>
    context.subscriptions.push(vscode.commands.registerTextEditorCommand(
      `elicode.${c.name}`, c)));
};

export const deactivate = () => {};
