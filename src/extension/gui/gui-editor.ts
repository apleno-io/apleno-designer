import * as vscode from 'vscode';
import { Disposable, disposeAll } from '../dispose';
import { getNonce } from '../util';
import { type GUIInterface, GUIFileUtils } from '../../common/gui';
import { GUICommands } from './gui-commands';
import { type ExternallyEditableDocument, watchExternalChanges } from '../utils/external-changes';

/**
 * Define the type of edits used in pgui files.
 */
interface PGMInterfaceDocumentEdit {
  readonly state: GUIInterface;
}

interface PGMInterfaceDocumentDelegate {
  getFileData(): Promise<Uint8Array>;
}

/**
 * Define the document (the data model) used in pgui files.
 */
class PGMInterfaceDocument extends Disposable implements vscode.CustomDocument, ExternallyEditableDocument {
  static async create(uri: vscode.Uri, backupId: string | undefined, delegate: PGMInterfaceDocumentDelegate): Promise<PGMInterfaceDocument | PromiseLike<PGMInterfaceDocument>> {
    // If we have a backup, read that. Otherwise read the resource from the workspace
    const isBackup = typeof backupId === 'string';
    const dataFile = isBackup ? vscode.Uri.parse(backupId) : uri;
    const file = await PGMInterfaceDocument.readFile(dataFile);
    return new PGMInterfaceDocument(uri, file.data, isBackup ? null : file.raw, delegate);
  }

  private static async readFile(uri: vscode.Uri): Promise<{ data: GUIInterface, raw: Uint8Array | null }> {
    const defaultFile: GUIInterface = {
      widgets: [],
      displaySubmitButton: true,
      language: 'r'
    };

    if (uri.scheme === 'untitled') {
      return { data: defaultFile, raw: null };
    }

    let raw: Uint8Array;
    let content = null;
    try {
      raw = await vscode.workspace.fs.readFile(uri);
      content = Buffer.from(raw).toString('utf8');
    } catch (e) {
      vscode.window.showErrorMessage('Could not load the UI file.');
      return { data: defaultFile, raw: null };
    }

    if (content.trim().length === 0) {
      return { data: defaultFile, raw };
    }

    let JSONContent = null;
    try {
      JSONContent = JSON.parse(content);
    } catch (e) {
      vscode.window.showErrorMessage('Could not load the UI file. It is not a valid JSON file.');
      return { data: defaultFile, raw };
    }

    try {
      const sanitized: GUIInterface | null = GUIFileUtils.read(JSONContent);
      if (sanitized === null) {
        return { data: defaultFile, raw };
      }
      return { data: sanitized, raw };
    } catch (e: any) {
      vscode.window.showErrorMessage(`Could not load the UI file: ${e.message}`);
      return { data: defaultFile, raw };
    }
  }

  private readonly _uri: vscode.Uri;

  private _documentData: GUIInterface;
  private _edits: PGMInterfaceDocumentEdit[] = [];
  private _savedEdits: PGMInterfaceDocumentEdit[] = [];

  /** Content last read from or written to disk, null if unknown (untitled or restored from a backup) */
  private _diskContent: Uint8Array | null;
  /** Incremented when the content is reloaded from disk, to invalidate the older undo/redo entries */
  private _generation = 0;

  private readonly _delegate: PGMInterfaceDocumentDelegate;

  private constructor(uri: vscode.Uri, initialContent: GUIInterface, diskContent: Uint8Array | null, delegate: PGMInterfaceDocumentDelegate) {
    super();
    this._uri = uri;
    this._documentData = initialContent;
    this._diskContent = diskContent;
    this._delegate = delegate;
  }

  public get uri() {
    return this._uri;
  }

  public get documentData(): GUIInterface {
    return this._documentData;
  }

  public get isDirty(): boolean {
    return this._diskContent === null
      || this._edits.length !== this._savedEdits.length
      || this._edits.some((edit, i) => edit !== this._savedEdits[i]);
  }

  public isSameAsDisk(content: Uint8Array): boolean {
    return this._diskContent !== null && Buffer.from(content).equals(this._diskContent);
  }

  private readonly _onDidDispose = this._register(new vscode.EventEmitter<void>());

  /**
   * Fired when the document is disposed of.
   */
  public readonly onDidDispose = this._onDidDispose.event;

  private readonly _onDidChangeDocument = this._register(new vscode.EventEmitter<{
    readonly content?: GUIInterface;
    readonly edits: readonly PGMInterfaceDocumentEdit[];
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
  makeEdit(edit: PGMInterfaceDocumentEdit) {
    this._edits.push(edit);
    const generation = this._generation;

    this._onDidChange.fire({
      label: 'Edit',
      undo: async () => {
        if (generation !== this._generation) {
          return;
        }
        this._edits.pop();
        this._onDidChangeDocument.fire({
          edits: this._edits,
        });
      },
      redo: async () => {
        if (generation !== this._generation) {
          return;
        }
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
    if (targetResource.toString() === this.uri.toString()) {
      this._diskContent = fileData;
    }
    await vscode.workspace.fs.writeFile(targetResource, fileData);
  }

  /**
   * Called by VS Code when the user calls `revert` on a document.
   */
  async revert(_cancellation: vscode.CancellationToken): Promise<void> {
    await this.reloadFromDisk();
  }

  /**
   * Replace the content by the file content. The reloaded content becomes the
   * new initial state: older undo/redo entries are ignored.
   */
  async reloadFromDisk(): Promise<void> {
    const file = await PGMInterfaceDocument.readFile(this.uri);
    this._documentData = file.data;
    this._diskContent = file.raw;
    this._generation++;
    this._edits = [];
    this._savedEdits = [];
    this._onDidChangeDocument.fire({
      content: file.data,
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
export class PGMInterfaceFileEditorProvider implements vscode.CustomEditorProvider<PGMInterfaceDocument>/*, vscode.DocumentDropEditProvider*/ {

  private static newFileId = 1;

  public static register(context: vscode.ExtensionContext): vscode.Disposable {
    vscode.commands.registerCommand('apleno.pgui.new', () => {
      const workspaceFolders = vscode.workspace.workspaceFolders;
      if (!workspaceFolders) {
        vscode.window.showErrorMessage("Creating a new Apleno interface file currently requires opening a workspace");
        return;
      }

      const uri = vscode.Uri.joinPath(workspaceFolders[0].uri, `new-${PGMInterfaceFileEditorProvider.newFileId++}.pgui`).with({ scheme: 'untitled' });
      vscode.commands.executeCommand('vscode.openWith', uri, PGMInterfaceFileEditorProvider.viewType);
    });

    return vscode.window.registerCustomEditorProvider(
      PGMInterfaceFileEditorProvider.viewType,
      new PGMInterfaceFileEditorProvider(context),
      {
        webviewOptions: {
          retainContextWhenHidden: true, // Keeps the webview alive when not visible, should be set to false
        },
        supportsMultipleEditorsPerDocument: false,
      });
  }

  private static readonly viewType = 'apleno.pgui';

  /**
   * Tracks all known webviews
   */
  private readonly webviews = new WebviewCollection();

  constructor(
    private readonly _context: vscode.ExtensionContext
  ) { }

  //#region CustomEditorProvider

  async openCustomDocument(uri: vscode.Uri, openContext: { backupId?: string }, _token: vscode.CancellationToken): Promise<PGMInterfaceDocument> {
    const document: PGMInterfaceDocument = await PGMInterfaceDocument.create(uri, openContext.backupId, {
      getFileData: async () => {
        const webviewsForDocument = Array.from(this.webviews.get(document.uri));
        if (!webviewsForDocument.length) {
          throw new Error('Could not find webview to save for');
        }
        const panel = webviewsForDocument[0];
        const response = await this.postMessageWithResponse<GUIInterface>(panel, 'getFileData', {});

        // The runtime reads the v3 format
        return Buffer.from(JSON.stringify(GUIFileUtils.toV3(response), null, '\t'), 'utf8');
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

    listeners.push(watchExternalChanges(document));

    document.onDidDispose(() => disposeAll(listeners));

    return document;
  }

  async resolveCustomEditor(document: PGMInterfaceDocument, webviewPanel: vscode.WebviewPanel, _token: vscode.CancellationToken): Promise<void> {
    // Add the webview to our internal set of active webviews
    this.webviews.add(document.uri, webviewPanel);

    // Setup initial content for the webview
    webviewPanel.webview.options = { enableScripts: true };
    webviewPanel.webview.html = await this.getHtmlForWebview(webviewPanel.webview);
    webviewPanel.webview.onDidReceiveMessage(e => this.onMessage(document, webviewPanel, e));
  }

  private readonly _onDidChangeCustomDocument = new vscode.EventEmitter<vscode.CustomDocumentEditEvent<PGMInterfaceDocument>>();
  public readonly onDidChangeCustomDocument = this._onDidChangeCustomDocument.event;

  public saveCustomDocument(document: PGMInterfaceDocument, cancellation: vscode.CancellationToken): Thenable<void> {
    return document.save(cancellation);
  }

  public saveCustomDocumentAs(document: PGMInterfaceDocument, destination: vscode.Uri, cancellation: vscode.CancellationToken): Thenable<void> {
    return document.saveAs(destination, cancellation);
  }

  public revertCustomDocument(document: PGMInterfaceDocument, cancellation: vscode.CancellationToken): Thenable<void> {
    return document.revert(cancellation);
  }

  public backupCustomDocument(document: PGMInterfaceDocument, context: vscode.CustomDocumentBackupContext, cancellation: vscode.CancellationToken): Thenable<vscode.CustomDocumentBackup> {
    return document.backup(context.destination, cancellation);
  }

  //#endregion

  /**
   * Get the static HTML used for in our editor's webviews.
   */
  private async getHtmlForWebview(webview: vscode.Webview): Promise<string> {
    const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(this._context.extensionUri, 'media/gui/gui.min.js'));
    const styleMainUri = webview.asWebviewUri(vscode.Uri.joinPath(this._context.extensionUri, 'media/gui/gui.min.css'));
    const nonce = getNonce(); // Use a nonce to whitelist scripts

    // Get content of JS for iframe
    let iframeJS = '';
    let iframeCSS = '';
    try {
      iframeJS = Buffer.from(await vscode.workspace.fs.readFile(vscode.Uri.joinPath(this._context.extensionUri, 'media/gui-iframe/gui-iframe.min.js'))).toString('utf8');
      iframeCSS = Buffer.from(await vscode.workspace.fs.readFile(vscode.Uri.joinPath(this._context.extensionUri, 'media/gui-iframe/gui-iframe.min.css'))).toString('utf8');
    } catch (e) { }

    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src ${webview.cspSource} blob:; style-src * 'unsafe-inline'; script-src * 'unsafe-inline';">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <link href="${styleMainUri}" rel="stylesheet" />
        <title></title>
      </head>
      <body>
        <script>
          window.IFRAME_JS = \`${iframeJS.replace(/`/g, '\\`').replace(/\$/g, '\\\$')}\`;
          window.IFRAME_CSS = \`${iframeCSS}\`;
          window.CSP_SOURCE = "${webview.cspSource}";
          window.CSP_NONCE = "${nonce}";
        </script>
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

  private async onMessage(document: PGMInterfaceDocument, webviewPanel: vscode.WebviewPanel, message: any) {
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
    if (message.type === 'OnDidChange') {
      document.makeEdit(message.edit as PGMInterfaceDocumentEdit);
      return;
    }
    if (message.type === 'onDidPressCommand') {
      GUICommands.manageCommand(message.payload);
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