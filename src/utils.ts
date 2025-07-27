import { commands, window } from "vscode";
import { env } from "process";
import { join } from "path";

export const HOME = env.HOME || env.USERPROFILE;
if (!HOME) throw Error("No $HOME found");

export const fromHome = (path: string) => join(HOME, path);

export const say = (str: string) => window.showInformationMessage(str);

export const cmd = commands.executeCommand;

type CommandFn = Parameters<typeof commands.registerCommand>[1];
export const registerCmd = (cmd: CommandFn) =>
  commands.registerCommand(`elicode.${cmd.name}`, cmd);
type TextCommandFn = Parameters<typeof commands.registerTextEditorCommand>[1];
export const registerEditCmd = (cmd: TextCommandFn) =>
  commands.registerTextEditorCommand(`elicode.${cmd.name}`, cmd);
