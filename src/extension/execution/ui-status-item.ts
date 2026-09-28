import * as vscode from 'vscode';

export class ExecutionStatusItemManager {
  private static _statusItem: vscode.StatusBarItem | null = null;

  /**
   * Create the status bar item.
   */
  public static initialize(context: vscode.ExtensionContext): void {
    this._statusItem = vscode.window.createStatusBarItem('apleno', vscode.StatusBarAlignment.Left, 1);
    this._statusItem.tooltip = 'Show Apleno logs';
    this._statusItem.command = 'apleno.logs';
    context.subscriptions.push(this._statusItem);
  }

  /**
   * Change status bar text. If null, hide the item.
   */
  public static setText(text: string | null, color: 'red' | null = null) {
    if (this._statusItem === null) {
      return;
    }

    if (text === null) {
      this._statusItem.hide();
    }
    else {
      this._statusItem.text = text;
      if (color === 'red') {
        this._statusItem.backgroundColor = new vscode.ThemeColor('statusBarItem.errorBackground');
      }
      else {
        this._statusItem.backgroundColor = undefined;
      }
      this._statusItem.show();
    }
  }
}