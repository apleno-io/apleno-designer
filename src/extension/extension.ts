import * as vscode from 'vscode';
import { PGMProjectFileEditorProvider } from './project/project-editor';
import { PGMSequenceFileEditorProvider } from './sequence/sequence-editor';
import { PGMInterfaceFileEditorProvider } from './gui/gui-editor';
import { PGMDebug, PGMRunner } from './execution/run';

export function activate(context: vscode.ExtensionContext) {
	// Editors
	context.subscriptions.push(PGMProjectFileEditorProvider.register(context));
	context.subscriptions.push(PGMSequenceFileEditorProvider.register(context));
	context.subscriptions.push(PGMInterfaceFileEditorProvider.register(context));

	// Run / Debug
	context.subscriptions.push(PGMRunner.registerCommand(context));
	context.subscriptions.push(vscode.debug.registerDebugConfigurationProvider('pgm', new PGMDebug()));
}

export function deactivate() { }