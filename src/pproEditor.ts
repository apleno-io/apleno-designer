import * as vscode from 'vscode';
import { Disposable, disposeAll } from './dispose';
import { getNonce } from './util';
import { normalizeProject, ProjectFile } from './normalizers/normalizeProject';

/**
 * Define the type of edits used in ppro files.
 */
interface PGMProDocumentEdit {
	readonly state: ProjectFile;
}

interface PGMProDocumentDelegate {
	getFileData(): Promise<Uint8Array>;
}

/**
 * Define the document (the data model) used in ppro files.
 */
class PGMProDocument extends Disposable implements vscode.CustomDocument {
	static async create(uri: vscode.Uri, backupId: string | undefined, delegate: PGMProDocumentDelegate): Promise<PGMProDocument | PromiseLike<PGMProDocument>> {
		// If we have a backup, read that. Otherwise read the resource from the workspace
		const dataFile = typeof backupId === 'string' ? vscode.Uri.parse(backupId) : uri;
		const fileData = await PGMProDocument.readFile(dataFile);
		return new PGMProDocument(uri, fileData, delegate);
	}

	private static async readFile(uri: vscode.Uri): Promise<ProjectFile> {
		if (uri.scheme === 'untitled') {
			return normalizeProject({});
		}
		const readData: Uint8Array = await vscode.workspace.fs.readFile(uri);
		try {
			return normalizeProject(JSON.parse(Buffer.from(readData).toString('utf8')));
		} catch (e) {
			console.error(e);
			return normalizeProject({});
		}
	}

	private readonly _uri: vscode.Uri;

	private _documentData: ProjectFile;
	private _edits: PGMProDocumentEdit[] = [];
	private _savedEdits: PGMProDocumentEdit[] = [];

	private readonly _delegate: PGMProDocumentDelegate;

	private constructor(uri: vscode.Uri, initialContent: ProjectFile, delegate: PGMProDocumentDelegate) {
		super();
		this._uri = uri;
		this._documentData = initialContent;
		this._delegate = delegate;
	}

	public get uri() {
		return this._uri;
	}

	public get documentData(): ProjectFile {
		return this._documentData;
	}

	private readonly _onDidDispose = this._register(new vscode.EventEmitter<void>());

	/**
	 * Fired when the document is disposed of.
	 */
	public readonly onDidDispose = this._onDidDispose.event;

	private readonly _onDidChangeDocument = this._register(new vscode.EventEmitter<{
		readonly content?: ProjectFile;
		readonly edits: readonly PGMProDocumentEdit[];
	}>());

	/**
	 * Fired to notify webviews that the document has changed.
	 */
	public readonly onDidChangeContent = this._onDidChangeDocument.event;

	private readonly _onDidChange = this._register(new vscode.EventEmitter<{
		readonly label: string,
		undo(): void,
		redo(): void,
	}>());

	/**
	 * Fired to tell VS Code that an edit has occurred in the document.
	 *
	 * This updates the document's dirty indicator.
	 */
	public readonly onDidChange = this._onDidChange.event;

	/**
	 * Called by VS Code when there are no more references to the document.
	 *
	 * This happens when all editors for it have been closed.
	 */
	dispose(): void {
		this._onDidDispose.fire();
		super.dispose();
	}

	/**
	 * Called when the user edits the document in a webview.
	 *
	 * This fires an event to notify VS Code that the document has been edited.
	 */
	makeEdit(edit: PGMProDocumentEdit) {
		this._edits.push(edit);

		this._onDidChange.fire({
			label: 'Edit',
			undo: async () => {
				this._edits.pop();
				this._onDidChangeDocument.fire({
					edits: this._edits,
				});
			},
			redo: async () => {
				this._edits.push(edit);
				this._onDidChangeDocument.fire({
					edits: this._edits,
				});
			}
		});
	}

	/**
	 * Called by VS Code when the user saves the document.
	 */
	async save(cancellation: vscode.CancellationToken): Promise<void> {
		await this.saveAs(this.uri, cancellation);
		this._savedEdits = Array.from(this._edits);
	}

	/**
	 * Called by VS Code when the user saves the document to a new location.
	 */
	async saveAs(targetResource: vscode.Uri, cancellation: vscode.CancellationToken): Promise<void> {
		const fileData = await this._delegate.getFileData();
		if (cancellation.isCancellationRequested) {
			return;
		}
		await vscode.workspace.fs.writeFile(targetResource, fileData);
	}

	/**
	 * Called by VS Code when the user calls `revert` on a document.
	 */
	async revert(_cancellation: vscode.CancellationToken): Promise<void> {
		const diskContent = await PGMProDocument.readFile(this.uri);
		this._documentData = diskContent;
		this._edits = this._savedEdits;
		this._onDidChangeDocument.fire({
			content: diskContent,
			edits: this._edits,
		});
	}

	/**
	 * Called by VS Code to backup the edited document.
	 *
	 * These backups are used to implement hot exit.
	 */
	async backup(destination: vscode.Uri, cancellation: vscode.CancellationToken): Promise<vscode.CustomDocumentBackup> {
		await this.saveAs(destination, cancellation);

		return {
			id: destination.toString(),
			delete: async () => {
				try {
					await vscode.workspace.fs.delete(destination);
				} catch {
					// noop
				}
			}
		};
	}
}

/**
 */
export class PGMProjectFileEditorProvider implements vscode.CustomEditorProvider<PGMProDocument>/*, vscode.DocumentDropEditProvider*/ {

	private static newFileId = 1;

	public static register(context: vscode.ExtensionContext): vscode.Disposable {
		vscode.commands.registerCommand('pgm.ppro.new', () => {
			const workspaceFolders = vscode.workspace.workspaceFolders;
			if (!workspaceFolders) {
				vscode.window.showErrorMessage("Creating new PGM Project file currently requires opening a workspace");
				return;
			}

			const uri = vscode.Uri.joinPath(workspaceFolders[0].uri, `new-${PGMProjectFileEditorProvider.newFileId++}.ppro`)
				.with({ scheme: 'untitled' });

			vscode.commands.executeCommand('vscode.openWith', uri, PGMProjectFileEditorProvider.viewType);
		});

		return vscode.window.registerCustomEditorProvider(
			PGMProjectFileEditorProvider.viewType,
			new PGMProjectFileEditorProvider(context),
			{
				webviewOptions: {
					retainContextWhenHidden: true, // Keeps the webview alive when not visible, should be set to false
				},
				supportsMultipleEditorsPerDocument: false,
			});
	}

	private static readonly viewType = 'pgm.ppro';

	/**
	 * Tracks all known webviews
	 */
	private readonly webviews = new WebviewCollection();

	constructor(
		private readonly _context: vscode.ExtensionContext
	) { }

	//#region CustomEditorProvider

	async openCustomDocument(uri: vscode.Uri, openContext: { backupId?: string }, _token: vscode.CancellationToken): Promise<PGMProDocument> {
		const document: PGMProDocument = await PGMProDocument.create(uri, openContext.backupId, {
			getFileData: async () => {
				const webviewsForDocument = Array.from(this.webviews.get(document.uri));
				if (!webviewsForDocument.length) {
					throw new Error('Could not find webview to save for');
				}
				const panel = webviewsForDocument[0];
				const response = await this.postMessageWithResponse<ProjectFile>(panel, 'getFileData', {});

				return Buffer.from(JSON.stringify(response, null, '\t'), 'utf8');
			}
		});

		const listeners: vscode.Disposable[] = [];

		listeners.push(document.onDidChange(e => {
			// Tell VS Code that the document has been edited by the use.
			this._onDidChangeCustomDocument.fire({
				document,
				...e,
			});
		}));

		listeners.push(document.onDidChangeContent(e => {
			// Update all webviews when the document changes
			for (const webviewPanel of this.webviews.get(document.uri)) {
				this.postMessage(webviewPanel, 'update', {
					edits: e.edits,
					content: e.content,
				});
			}
		}));

		document.onDidDispose(() => disposeAll(listeners));

		return document;
	}

	async resolveCustomEditor(document: PGMProDocument, webviewPanel: vscode.WebviewPanel, _token: vscode.CancellationToken): Promise<void> {
		// Add the webview to our internal set of active webviews
		this.webviews.add(document.uri, webviewPanel);

		// Setup initial content for the webview
		webviewPanel.webview.options = { enableScripts: true };
		webviewPanel.webview.html = this.getHtmlForWebview(webviewPanel.webview);
		webviewPanel.webview.onDidReceiveMessage(e => this.onMessage(document, e));

		// Wait for the webview to be properly ready before we init
		webviewPanel.webview.onDidReceiveMessage(e => {
			if (e.type === 'ready') {
				if (document.uri.scheme === 'untitled') {
					this.postMessage(webviewPanel, 'init', {
						untitled: true,
						editable: true
					});
				} else {
					const editable = vscode.workspace.fs.isWritableFileSystem(document.uri.scheme);
					this.postMessage(webviewPanel, 'init', {
						value: document.documentData,
						editable
					});
				}
			}
		});
	}

	private readonly _onDidChangeCustomDocument = new vscode.EventEmitter<vscode.CustomDocumentEditEvent<PGMProDocument>>();
	public readonly onDidChangeCustomDocument = this._onDidChangeCustomDocument.event;

	public saveCustomDocument(document: PGMProDocument, cancellation: vscode.CancellationToken): Thenable<void> {
		return document.save(cancellation);
	}

	public saveCustomDocumentAs(document: PGMProDocument, destination: vscode.Uri, cancellation: vscode.CancellationToken): Thenable<void> {
		return document.saveAs(destination, cancellation);
	}

	public revertCustomDocument(document: PGMProDocument, cancellation: vscode.CancellationToken): Thenable<void> {
		return document.revert(cancellation);
	}

	public backupCustomDocument(document: PGMProDocument, context: vscode.CustomDocumentBackupContext, cancellation: vscode.CancellationToken): Thenable<vscode.CustomDocumentBackup> {
		return document.backup(context.destination, cancellation);
	}

	//#endregion

	/**
	 * Get the static HTML used for in our editor's webviews.
	 */
	private getHtmlForWebview(webview: vscode.Webview): string {
		// Local path to script and css for the webview
		const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(this._context.extensionUri, 'media', 'ppro.js'));
		const styleResetUri = webview.asWebviewUri(vscode.Uri.joinPath(this._context.extensionUri, 'media', 'reset.css'));
		const styleVSCodeUri = webview.asWebviewUri(vscode.Uri.joinPath(this._context.extensionUri, 'media', 'vscode.css'));
		const styleMainUri = webview.asWebviewUri(vscode.Uri.joinPath(this._context.extensionUri, 'media', 'ppro.css'));

		// Use a nonce to whitelist which scripts can be run
		const nonce = getNonce();

		return `
			<!DOCTYPE html>
			<html lang="en">
			<head>
				<meta charset="UTF-8">

				<!--
				Use a content security policy to only allow loading images from https or from our extension directory,
				and only allow scripts that have a specific nonce.
				-->
				<meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src ${webview.cspSource} blob:; style-src ${webview.cspSource}; script-src 'nonce-${nonce}';">

				<meta name="viewport" content="width=device-width, initial-scale=1.0">

				<link href="${styleResetUri}" rel="stylesheet" />
				<link href="${styleVSCodeUri}" rel="stylesheet" />
				<link href="${styleMainUri}" rel="stylesheet" />

				<title>P</title>
			</head>
			<body>
				<div id="ppro-editor">
					<h2>Main Settings</h2>

					<div class="ppro-setting">
						<label for="project-name">App Name</label>
						<input type="text" id="project-name" value="" />
					</div>

					<div class="ppro-setting">
						<label for="project-author">Company Name or Author</label>
						<input type="text" id="project-author" value="" />
					</div>

					<div class="ppro-setting">
						<label for="project-description">App Description</label>
						<input type="text" id="project-description" />
					</div>

					<div class="ppro-setting">
						<label for="project-sequence">Starting Sequence</label>
						<div class="row">
								<div class="col-10"><input type="text" id="project-seq" value="" /></div>
								<div class="col-2 col-padding-left"><button class="success fullwidth btn-form" id="project-btn-sequence">Browse</button></div>
						</div>
					</div>

					<div class="ppro-setting">
						<label for="project-wd">Languages Default Working Directory</label>
						<div class="ppro-setting-help">This option is for the compatibility of RPGM 1 and 2 programs as the working directory was by default in the output folder.</div>
						<select id="project-wd">
							<option value="program">App folder</option>
							<option value="output">Output folder (RPGM 2 default)</option>
						</select>
					</div>

					<div class="ppro-setting">
						<label for="project-outputfolder">Output Folder Name</label>
						<div class="ppro-setting-help">Name of the sub-directory for generated files during execution. If empty, a random string will be used.</div>
						<div class="ppro-setting-help">Special values can be used: {{name}} for the name of the program, {{datetime}} for the current date and time.</div>
						<input type="text" id="project-outputfolder" value="" />
					</div>

					<div class="ppro-setting">
						<label for="project-customFiles">Custom JS/CSS Files</label>
						<div class="ppro-setting-help">One file per line, with its relative path to the root folder of the project. The JS and CSS files will be loaded and executed with the app.</div>
						<textarea id="project-customFiles"></textarea>
					</div>

					<div class="ppro-setting">
						<label for="project-console">Allow user to access languages consoles</label>
						<select id="project-console">
								<option value="enabled">Allow</option>
								<option value="disabled">Disallow</option>
						</select>
					</div>

					<h2>Design</h2>

					<div class="ppro-setting">
						<label for="project-logo">Top menu logo</label>
						<div class="row">
								<div class="col-10"><input type="text" id="project-logo" value="" /></div>
								<div class="col-2 col-padding-left"><button class="success fullwidth btn-form" id="project-btn-logo">Browser</button></div>
						</div>
					</div>

					<div class="ppro-setting">
						<label for="project-steps">Show steps list</label>
						<select id="project-steps">
								<option value="sidebar">Show</option>
								<option value="hide">Hide</option>
						</select>
					</div>
				</div>

				<div id="drop-zone">
					<p>Drag one or more files to this <i>drop zone</i>.</p>
				</div>
				
				<script nonce="${nonce}" src="${scriptUri}"></script>
			</body>
			</html>`;
	}

	/*async provideDocumentDropEdits(_document: vscode.TextDocument, _position: vscode.Position, dataTransfer: vscode.DataTransfer, token: vscode.CancellationToken): Promise<vscode.DocumentDropEdit | undefined> {
		console.log('YO')
		// Check the data transfer to see if we have dropped a list of uris
		const dataTransferItem = dataTransfer.get('text/uri-list');
		if (!dataTransferItem) {
			return undefined;
		}

		// 'text/uri-list' contains a list of uris separated by new lines.
		// Parse this to an array of uris.
		const urlList = await dataTransferItem.asString();
		if (token.isCancellationRequested) {
			return undefined;
		}

		const uris: vscode.Uri[] = [];
		for (const resource of urlList.split('\n')) {
			try {
				uris.push(vscode.Uri.parse(resource));
			} catch {
				// noop
			}
		}

		if (!uris.length) {
			return undefined;
		}

		const snippet = new vscode.SnippetString();
		uris.forEach((uri, index) => {
			snippet.appendText(`${index + 1}. ${uri.path}`);
			snippet.appendTabstop();

			if (index <= uris.length - 1 && uris.length > 1) {
				snippet.appendText('\n');
			}
		});

		return new vscode.DocumentDropEdit(snippet);
	}*/

	private _requestId = 1;
	private readonly _callbacks = new Map<number, (response: any) => void>();

	private postMessageWithResponse<R = unknown>(panel: vscode.WebviewPanel, type: string, body: any): Promise<R> {
		const requestId = this._requestId++;
		const p = new Promise<R>(resolve => this._callbacks.set(requestId, resolve));
		panel.webview.postMessage({ type, requestId, body });
		return p;
	}

	private postMessage(panel: vscode.WebviewPanel, type: string, body: any): void {
		panel.webview.postMessage({ type, body });
	}

	private onMessage(document: PGMProDocument, message: any) {
		switch (message.type) {
			case 'edit':
				document.makeEdit(message as PGMProDocumentEdit);
				return;

			case 'response':
				{
					const callback = this._callbacks.get(message.requestId);
					callback?.(message.body);
					return;
				}
		}
	}
}

/**
 * Tracks all webviews.
 */
class WebviewCollection {

	private readonly _webviews = new Set<{
		readonly resource: string;
		readonly webviewPanel: vscode.WebviewPanel;
	}>();

	/**
	 * Get all known webviews for a given uri.
	 */
	public *get(uri: vscode.Uri): Iterable<vscode.WebviewPanel> {
		const key = uri.toString();
		for (const entry of this._webviews) {
			if (entry.resource === key) {
				yield entry.webviewPanel;
			}
		}
	}

	/**
	 * Add a new webview to the collection.
	 */
	public add(uri: vscode.Uri, webviewPanel: vscode.WebviewPanel) {
		const entry = { resource: uri.toString(), webviewPanel };
		this._webviews.add(entry);
		webviewPanel.onDidDispose(() => {
			this._webviews.delete(entry);
		});
	}
}