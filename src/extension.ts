import {
  commands, window, workspace,
  ConfigurationTarget, ExtensionContext, TextEditor, TextEditorEdit, Selection,
} from "vscode";
import { fromHome, cmd, registerCmd, registerEditCmd, say } from "./utils";
import { writeFileSync } from "fs";
import { dirname } from "path";

const updateConfig = async () => {
  const conf = workspace.getConfiguration();
  const name = "terminal.integrated.commandsToSkipShell";
  const val = conf.get(name);
  if (!Array.isArray(val)) return;
  if (val.includes("elicode.shellEnter")) return;
  await conf.update(
    name, [...val, "elicode.shellEnter"], ConfigurationTarget.Global);
  console.log(`Updated ${name} setting`);
};

const cursorMove = async (
  editor: TextEditor, _edit: TextEditorEdit, opts: any
) => {
  const sels = editor.selections.filter(s => !s.isEmpty);
  if (sels.length && !opts?.select) {
    // await cmd("cancelSelection");
    editor.selections = sels.map(s => new Selection(s.active, s.active));
  }
  return cmd("cursorMove", opts);
};

const reindentSelectionWithSpaces = async () => {
  const editor = window.activeTextEditor;
  if (!editor) return;
  const qp = window.createQuickPick();
  qp.items = "12345678".split("").map(n => ({ label: n }));
  qp.placeholder = "Select indentation level";
  qp.activeItems = [qp.items[1]]; // Default to "2"
  const spaces = await new Promise<number>((res) => {
    const ret = (n: number) => { res(n); qp.dispose(); };
    qp.onDidAccept(() => ret(parseInt(qp.selectedItems[0]?.label || "0")));
    qp.onDidHide(() => ret(-1));
    qp.show();
  });
  if (spaces === -1) return;
  Object.assign(editor.options, {
    tabSize: spaces, insertSpaces: true, indentSize: "tabSize" });
  say(`Indentation set to ${spaces} spaces`);
  await cmd("editor.action.reindentselectedlines");
};

type ShellArgs = { sync?: boolean, new?: boolean, inTerm?: boolean };
let syncShellTimeout: NodeJS.Timeout | null = null;
const openShell = async (args: ShellArgs) => {
  const uri = window.activeTextEditor?.document.uri;
  const file = uri ? uri.path : "";
  const wdir =
    uri && workspace.getWorkspaceFolder(uri)?.uri.path
    || workspace.workspaceFolders?.[0]?.uri.path
    || "";
  let term = window.activeTerminal;
  // Shell context info
  const shQuote = (str: string) => str.replace(/'/g, "'\\''");
  writeFileSync(fromHome(".vscode-sync"), [
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
    term = window.createTerminal({ cwd: dirname(file) });
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

let lastMoveCursorLineToTime = 0, moveCursorLineToTimes = 0;
const moveCursorLineTo = () => {
  const lineNumber = window.activeTextEditor?.selection.active.line;
  if (!lineNumber) return;
  const now = Date.now();
  if (now - lastMoveCursorLineToTime < 1000) moveCursorLineToTimes++;
  else moveCursorLineToTimes = 0;
  const at = ["center", "top", "bottom"][moveCursorLineToTimes % 3];
  lastMoveCursorLineToTime = now;
  cmd("revealLine", { lineNumber, at });
};

type DelayedCommandArgs = { delay: number, command: string, args: object };
const delayedCommand = (args: DelayedCommandArgs) =>
  new Promise<void>((res) => {
    setTimeout(() => {
      cmd(args.command, args.args ?? {});
      res();
    }, args.delay);
  });

const simpleCommands = [
  openShell,
  moveCursorLineTo,
  delayedCommand,
  reindentSelectionWithSpaces,
];
const editorCommands = [
  cursorMove,
];

export const activate = async (context: ExtensionContext) => {
  await updateConfig();
  simpleCommands.forEach(c => context.subscriptions.push(registerCmd(c)));
  editorCommands.forEach(c => context.subscriptions.push(registerEditCmd(c)));
};

export const deactivate = () => {};
