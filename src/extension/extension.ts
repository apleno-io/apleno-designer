import * as vscode from 'vscode';
import { PGMProjectFileEditorProvider } from './pproEditor';
import { PGMSequenceFileEditorProvider } from './sequencer/pseqEditor';

export function activate(context: vscode.ExtensionContext) {
	context.subscriptions.push(PGMProjectFileEditorProvider.register(context));
	context.subscriptions.push(PGMSequenceFileEditorProvider.register(context));
}

export function deactivate() { }