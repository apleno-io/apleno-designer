import * as vscode from 'vscode';
import { ExecutionStatusItemManager } from '../execution/ui-status-item';

export class Logger {
  private channel: vscode.LogOutputChannel | null = null;

  public initialize(context: vscode.ExtensionContext) {
    // Output channel
    this.channel = vscode.window.createOutputChannel('PGM', { log: true });
    this.channel.info('PGM Extension loading...');
    context.subscriptions.push(this.channel);

    // Command
    context.subscriptions.push(vscode.commands.registerCommand('pgm.logs', this.show.bind(this)));
  }

  public info(message: string, showNotification: boolean = false) {
    this.channel?.info(message);
    if (showNotification) {
      vscode.window.showInformationMessage(message);
    }
  }

  public error(message: string, showNotification: boolean = false) {
    this.channel?.error(message);
    if (showNotification) {
      vscode.window.showErrorMessage(message);
    }
  }

  public show() {
    ExecutionStatusItemManager.setText(null);
    this.channel?.show();
  }
};