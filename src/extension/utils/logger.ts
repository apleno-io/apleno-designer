import * as vscode from 'vscode';

class Logger {
  private channel: vscode.LogOutputChannel | null = null;

  private get ch(): vscode.LogOutputChannel {
    if (!this.channel) {
      this.channel = vscode.window.createOutputChannel('Apleno', { log: true });
    }
    return this.channel;
  }

  public info(message: string, showNotification = false) {
    this.ch.info(message);
    if (showNotification) { vscode.window.showInformationMessage(message); }
  }

  public error(message: string, showNotification = false) {
    this.ch.error(message);
    if (showNotification) { vscode.window.showErrorMessage(message); }
  }

  public show() {
    this.ch.show();
  }
}

export const logger = new Logger();
