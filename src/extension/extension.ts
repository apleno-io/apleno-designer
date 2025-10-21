import * as vscode from 'vscode';
import { PGMProjectFileEditorProvider } from './project/project-editor';
import { PGMSequenceFileEditorProvider } from './sequence/sequence-editor';
import { PGMInterfaceFileEditorProvider } from './gui/gui-editor';

export function activate(context: vscode.ExtensionContext) {
	context.subscriptions.push(PGMProjectFileEditorProvider.register(context));
	context.subscriptions.push(PGMSequenceFileEditorProvider.register(context));
	context.subscriptions.push(PGMInterfaceFileEditorProvider.register(context));
}

export function deactivate() { }