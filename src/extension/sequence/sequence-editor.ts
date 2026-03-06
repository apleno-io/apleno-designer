import * as vscode from 'vscode';
import { Disposable, disposeAll } from '../dispose';
import { getNonce } from '../util';
import { type SequenceFile, SequenceFileUtils } from '../../common/sequence';

/**
 * Define the type of edits used in pseq files.
 */
interface PGMSequenceDocumentEdit {
  readonly state: SequenceFile;
}

interface PGMSequenceDocumentDelegate {
  getFileData(): Promise<Uint8Array>;
}

/**
 * Define the document (the data model) used in pseq files.
 */
class PGMSequenceDocument extends Disposable implements vscode.CustomDocument {
  static async create(uri: vscode.Uri, backupId: string | undefined, delegate: PGMSequenceDocumentDelegate): Promise<PGMSequenceDocument | PromiseLike<PGMSequenceDocument>> {
    // If we have a backup, read that. Otherwise read the resource from the workspace
    const dataFile = typeof backupId === 'string' ? vscode.Uri.parse(backupId) : uri;
    const fileData = await PGMSequenceDocument.readFile(dataFile);
    return new PGMSequenceDocument(uri, fileData, delegate);
  }

  private static async readFile(uri: vscode.Uri): Promise<SequenceFile> {
    const defaultFile = SequenceFileUtils.getDefaultFile();

    if (uri.scheme === 'untitled') {
      return defaultFile;
    }

    let content = null;
    try {
      const readData: Uint8Array = await vscode.workspace.fs.readFile(uri);
      content = Buffer.from(readData).toString('utf8');
    } catch (e) {
      vscode.window.showErrorMessage('Could not load the sequence file.');
      return defaultFile;
    }

    if (content.trim().length === 0) {
      return defaultFile;
    }

    let JSONContent = null;
    try {
      JSONContent = JSON.parse(content);
    } catch (e) {
      vscode.window.showErrorMessage('Could not load the sequence file. It is not a valid JSON file.');
      return defaultFile;
    }

    try {
      const sanitized: SequenceFile | null = SequenceFileUtils.sanitize(JSONContent);
      if (sanitized === null) {
        return defaultFile;
      }
      return sanitized;
    } catch (e: any) {
      vscode.window.showErrorMessage(`Could not load the sequence file: ${e.message}`);
      return defaultFile;
    }
  }

  private readonly _uri: vscode.Uri;

  private _documentData: SequenceFile;
  private _edits: PGMSequenceDocumentEdit[] = [];
  private _savedEdits: PGMSequenceDocumentEdit[] = [];

  private readonly _delegate: PGMSequenceDocumentDelegate;

  private constructor(uri: vscode.Uri, initialContent: SequenceFile, delegate: PGMSequenceDocumentDelegate) {
    super();
    this._uri = uri;
    this._documentData = initialContent;
    this._delegate = delegate;
  }

  public get uri() {
    return this._uri;
  }

  public get documentData(): SequenceFile {
    return this._documentData;
  }

  private readonly _onDidDispose = this._register(new vscode.EventEmitter<void>());

  /**
   * Fired when the document is disposed of.
   */
  public readonly onDidDispose = this._onDidDispose.event;

  private readonly _onDidChangeDocument = this._register(new vscode.EventEmitter<{
    readonly content?: SequenceFile;
    readonly edits: readonly PGMSequenceDocumentEdit[];
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
  makeEdit(edit: PGMSequenceDocumentEdit) {
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
    const diskContent = await PGMSequenceDocument.readFile(this.uri);
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
export class PGMSequenceFileEditorProvider implements vscode.CustomEditorProvider<PGMSequenceDocument>/*, vscode.DocumentDropEditProvider*/ {

  private static newFileId = 1;

  public static register(context: vscode.ExtensionContext): vscode.Disposable {
    vscode.commands.registerCommand('pgm.pseq.new', () => {
      const workspaceFolders = vscode.workspace.workspaceFolders;
      if (!workspaceFolders) {
        vscode.window.showErrorMessage("Creating new PGM sequence file currently requires opening a workspace");
        return;
      }

      const uri = vscode.Uri.joinPath(workspaceFolders[0].uri, `new-${PGMSequenceFileEditorProvider.newFileId++}.pseq`)
        .with({ scheme: 'untitled' });

      vscode.commands.executeCommand('vscode.openWith', uri, PGMSequenceFileEditorProvider.viewType);
    });

    return vscode.window.registerCustomEditorProvider(
      PGMSequenceFileEditorProvider.viewType,
      new PGMSequenceFileEditorProvider(context),
      {
        webviewOptions: {
          retainContextWhenHidden: true, // Keeps the webview alive when not visible, should be set to false
        },
        supportsMultipleEditorsPerDocument: false,
      });
  }

  private static readonly viewType = 'pgm.pseq';

  /**
   * Tracks all known webviews
   */
  private readonly webviews = new WebviewCollection();

  constructor(
    private readonly _context: vscode.ExtensionContext
  ) { }

  //#region CustomEditorProvider

  async openCustomDocument(uri: vscode.Uri, openContext: { backupId?: string }, _token: vscode.CancellationToken): Promise<PGMSequenceDocument> {
    const document: PGMSequenceDocument = await PGMSequenceDocument.create(uri, openContext.backupId, {
      getFileData: async () => {
        const webviewsForDocument = Array.from(this.webviews.get(document.uri));
        if (!webviewsForDocument.length) {
          throw new Error('Could not find webview to save for');
        }
        const panel = webviewsForDocument[0];
        const response = await this.postMessageWithResponse<SequenceFile>(panel, 'getFileData', {});

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

  async resolveCustomEditor(document: PGMSequenceDocument, webviewPanel: vscode.WebviewPanel, _token: vscode.CancellationToken): Promise<void> {
    // Add the webview to our internal set of active webviews
    this.webviews.add(document.uri, webviewPanel);

    // Setup initial content for the webview
    webviewPanel.webview.options = { enableScripts: true };
    webviewPanel.webview.html = this.getHtmlForWebview(webviewPanel.webview);
    webviewPanel.webview.onDidReceiveMessage(e => this.onMessage(document, webviewPanel, e));
  }

  private readonly _onDidChangeCustomDocument = new vscode.EventEmitter<vscode.CustomDocumentEditEvent<PGMSequenceDocument>>();
  public readonly onDidChangeCustomDocument = this._onDidChangeCustomDocument.event;

  public saveCustomDocument(document: PGMSequenceDocument, cancellation: vscode.CancellationToken): Thenable<void> {
    return document.save(cancellation);
  }

  public saveCustomDocumentAs(document: PGMSequenceDocument, destination: vscode.Uri, cancellation: vscode.CancellationToken): Thenable<void> {
    return document.saveAs(destination, cancellation);
  }

  public revertCustomDocument(document: PGMSequenceDocument, cancellation: vscode.CancellationToken): Thenable<void> {
    return document.revert(cancellation);
  }

  public backupCustomDocument(document: PGMSequenceDocument, context: vscode.CustomDocumentBackupContext, cancellation: vscode.CancellationToken): Thenable<vscode.CustomDocumentBackup> {
    return document.backup(context.destination, cancellation);
  }

  //#endregion

  /**
   * Get the static HTML used for in our editor's webviews.
   */
  private getHtmlForWebview(webview: vscode.Webview): string {
    const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(this._context.extensionUri, 'media/sequence/sequence.min.js'));
    const styleMainUri = webview.asWebviewUri(vscode.Uri.joinPath(this._context.extensionUri, 'media/sequence/sequence.min.css'));
    const nonce = getNonce(); // Use a nonce to whitelist scripts

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

        <link href="${styleMainUri}" rel="stylesheet" />

        <title>P</title>
      </head>
      <body>
        <script nonce="${nonce}" src="${scriptUri}"></script>
      </body>
      </html>`;
  }

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

  private async onMessage(document: PGMSequenceDocument, webviewPanel: vscode.WebviewPanel, message: any) {
    if (message.type === 'ready') {
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
      return;
    }
    if (message.type === 'GetFileRelative') {
      if (typeof message.path === 'string' && message.path.length > 0) {
        this.postMessage(webviewPanel, 'GetFileRelativeResponse', vscode.workspace.asRelativePath(message.path));
      }
      return;
    }
    if (message.type === 'CheckFiles') {
      if (!Array.isArray(message.paths) || vscode.workspace.workspaceFolders === undefined || vscode.workspace.workspaceFolders?.length === 0) {
        this.postMessage(webviewPanel, 'CheckFilesResponse', {});
        return;
      }

      const results = [];
      for (let i = 0; i < message.paths.length; ++i) {
        try {
          const result = await vscode.workspace.fs.stat(vscode.Uri.joinPath(vscode.workspace.workspaceFolders[0].uri, message.paths[i]));
          results.push({ path: message.paths[i], exists: result && result.type === vscode.FileType.File });
        }
        catch {
          results.push({ path: message.paths[i], exists: false });
        }
      }
      this.postMessage(webviewPanel, 'CheckFilesResponse', results);
      return;
    }
    if (message.type === 'OnDidChange') {
      document.makeEdit(message.edit as PGMSequenceDocumentEdit);
      return;
    }
    if (message.type === 'response') {
      const callback = this._callbacks.get(message.requestId);
      callback?.(message.body);
      return;
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