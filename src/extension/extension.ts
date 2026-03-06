import * as vscode from 'vscode';
import { PGMProjectFileEditorProvider } from './project/project-editor';
import { PGMSequenceFileEditorProvider } from './sequence/sequence-editor';
import { PGMInterfaceFileEditorProvider } from './gui/gui-editor';
import { PGMRunner } from './execution/run';
import { Storage } from './utils/storage';
import { Exporter } from './export/export';
import { ExecutionStatusItemManager } from './execution/ui-status-item';
import { Services } from './services';
import { logger } from './utils/logger';

export function activate(context: vscode.ExtensionContext) {
	// Services
	Storage.initialize(context);
	Services.ProjectCreator.initialize(context);
	context.subscriptions.push(vscode.commands.registerCommand('pgm.logs', () => {
		ExecutionStatusItemManager.setText(null);
		logger.show();
	}));

	// Editors
	context.subscriptions.push(PGMProjectFileEditorProvider.register(context));
	context.subscriptions.push(PGMSequenceFileEditorProvider.register(context));
	context.subscriptions.push(PGMInterfaceFileEditorProvider.register(context));

	// Run / Debug
	Services.LanguageChooser.initialize(context);
	context.subscriptions.push(Exporter.registerCommand(context));
	ExecutionStatusItemManager.initialize(context);
	PGMRunner.initialize(context);
}

export function deactivate() { }