import * as vscode from 'vscode';
import { PGMProjectFileEditorProvider } from './pproEditor';

export function activate(context: vscode.ExtensionContext) {
	context.subscriptions.push(PGMProjectFileEditorProvider.register(context));
}

export function deactivate() { }
