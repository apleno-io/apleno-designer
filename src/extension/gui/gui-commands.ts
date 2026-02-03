import * as vscode from 'vscode';

type Payload = {
  key: string; // normalized ("a", "escape"...)
  code: string; // "KeyS"
  ctrlKey: boolean;
  metaKey: boolean;
  altKey: boolean;
  shiftKey: boolean;
  repeat: boolean;
};

const comboToCommand: Record<string, string> = {
  // Essentials
  "mod+s": "workbench.action.files.save",
  "mod+shift+s": "workbench.action.files.saveAs",
  "mod+z": "undo",
  "mod+shift+z": "redo",
  "mod+y": "redo",

  // Command palette
  "mod+shift+p": "workbench.action.showCommands",
  "f1": "workbench.action.showCommands",

  // Quick open
  "mod+p": "workbench.action.quickOpen",

  // Problems / terminal
  "mod+shift+m": "workbench.actions.view.problems",
  "mod+`": "workbench.action.terminal.toggleTerminal",

  // Tab / editor management
  "mod+w": "workbench.action.closeActiveEditor",

  // Zoom
  "mod+=": "workbench.action.zoomIn",
  "mod+-": "workbench.action.zoomOut",
  "mod+0": "workbench.action.zoomReset",
};

export class GUICommands {
  private static payloadToComboString(payload: Payload): string {
    const parts = [];

    // mods
    if (payload.ctrlKey || payload.metaKey) {
      parts.push('mod');
    }
    if (payload.shiftKey) {
      parts.push('shift');
    }
    if (payload.altKey) {
      parts.push('alt');
    }

    // key
    if (payload.key) {
      parts.push(payload.key);
    }
    else if (payload.code) {
      parts.push(payload.code);
    }

    return parts.join("+");
  }

  public static async manageCommand(payload: Payload) {
    const combo: string = this.payloadToComboString(payload);
    const command = comboToCommand[combo];
    if (!command) {
      return;
    }

    try {
      await vscode.commands.executeCommand(command);
    } catch { }
  }
}