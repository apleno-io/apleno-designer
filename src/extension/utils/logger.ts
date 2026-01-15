import * as vscode from 'vscode';

export const Logger = new class {
  private channel: vscode.LogOutputChannel | null = null;

  public initialize() {
    this.channel = vscode.window.createOutputChannel('PGM', { log: true });
  }

  public info(message: string) {
    this.channel?.info(message);
  }

  public error(message: string) {
    this.channel?.error(message);
  }

  public show() {
    this.channel?.show();
  }
};