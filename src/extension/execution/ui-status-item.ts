import vscode from 'vscode';

export class ExecutionStatusItemManager {
  private static _statusItem: vscode.StatusBarItem | null = null;

  /**
   * Create the status bar item.
   */
  public static register(): vscode.Disposable {
    this._statusItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
    return this._statusItem;
  }

  /**
   * Change status bar text. If null, hide the item.
   */
  public static setText(text: string | null) {
    if (this._statusItem === null) {
      return;
    }

    if (text === null) {
      this._statusItem.hide();
    }
    else {
      this._statusItem.text = text;
      this._statusItem.show();
    }
  }
}