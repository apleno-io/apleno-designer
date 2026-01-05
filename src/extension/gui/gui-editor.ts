import * as vscode from 'vscode';
import { Disposable, disposeAll } from '../dispose';
import { getNonce } from '../util';
import { GUIInterface, normalizeGUI } from '../../common/gui';

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
class PGMInterfaceDocument extends Disposable implements vscode.CustomDocument {
  static async create(uri: vscode.Uri, backupId: string | undefined, delegate: PGMInterfaceDocumentDelegate): Promise<PGMInterfaceDocument | PromiseLike<PGMInterfaceDocument>> {
    // If we have a backup, read that. Otherwise read the resource from the workspace
    const dataFile = typeof backupId === 'string' ? vscode.Uri.parse(backupId) : uri;
    const fileData = await PGMInterfaceDocument.readFile(dataFile);
    return new PGMInterfaceDocument(uri, fileData, delegate);
  }

  private static async readFile(uri: vscode.Uri): Promise<GUIInterface> {
    const defaultFile: GUIInterface = {
      widgets: [],
      displaySubmitButton: true,
      language: 'r'
    };

    if (uri.scheme === 'untitled') {
      return defaultFile;
    }

    let content = null;
    try {
      const readData: Uint8Array = await vscode.workspace.fs.readFile(uri);
      content = Buffer.from(readData).toString('utf8');
    } catch (e) {
      vscode.window.showErrorMessage('Could not load the UI file.');
      return defaultFile;
    }

    if (content.trim().length === 0) {
      return defaultFile;
    }

    let JSONContent = null;
    try {
      JSONContent = JSON.parse(content);
    } catch (e) {
      vscode.window.showErrorMessage('Could not load the UI file. It is not a valid JSON file.');
      return defaultFile;
    }

    try {
      const sanitized: GUIInterface | null = normalizeGUI(JSONContent);
      if (sanitized === null) {
        return defaultFile;
      }
      return sanitized;
    } catch (e: any) {
      vscode.window.showErrorMessage(`Could not load the UI file: ${e.message}`);
      return defaultFile;
    }
  }

  private readonly _uri: vscode.Uri;

  private _documentData: GUIInterface;
  private _edits: PGMInterfaceDocumentEdit[] = [];
  private _savedEdits: PGMInterfaceDocumentEdit[] = [];

  private readonly _delegate: PGMInterfaceDocumentDelegate;

  private constructor(uri: vscode.Uri, initialContent: GUIInterface, delegate: PGMInterfaceDocumentDelegate) {
    super();
    this._uri = uri;
    this._documentData = initialContent;
    this._delegate = delegate;
  }

  public get uri() {
    return this._uri;
  }

  public get documentData(): GUIInterface {
    return this._documentData;
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
    const diskContent = await PGMInterfaceDocument.readFile(this.uri);
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
export class PGMInterfaceFileEditorProvider implements vscode.CustomEditorProvider<PGMInterfaceDocument>/*, vscode.DocumentDropEditProvider*/ {

  private static newFileId = 1;

  public static register(context: vscode.ExtensionContext): vscode.Disposable {
    vscode.commands.registerCommand('pgm.pgui.new', () => {
      const workspaceFolders = vscode.workspace.workspaceFolders;
      if (!workspaceFolders) {
        vscode.window.showErrorMessage("Creating new PGM interface file currently requires opening a workspace");
        return;
      }

      const uri = vscode.Uri.joinPath(workspaceFolders[0].uri, `new-${PGMInterfaceFileEditorProvider.newFileId++}.pgui`)
        .with({ scheme: 'untitled' });

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

  private static readonly viewType = 'pgm.pgui';

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

  async resolveCustomEditor(document: PGMInterfaceDocument, webviewPanel: vscode.WebviewPanel, _token: vscode.CancellationToken): Promise<void> {
    // Add the webview to our internal set of active webviews
    this.webviews.add(document.uri, webviewPanel);

    // Setup initial content for the webview
    webviewPanel.webview.options = { enableScripts: true };
    webviewPanel.webview.html = await this.getHtmlForWebview(webviewPanel.webview);
    webviewPanel.webview.onDidReceiveMessage(e => this.onMessage(document, e));

    // Wait for the webview to be properly ready before we init
    webviewPanel.webview.onDidReceiveMessage(async e => {
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
      else if (e.type === 'GetFileRelative') {
        if (typeof e.path === 'string' && e.path.length > 0) {
          this.postMessage(webviewPanel, 'GetFileRelativeResponse', vscode.workspace.asRelativePath(e.path));
        }
      }
      else if (e.type === 'CheckFiles') {
        if (!Array.isArray(e.paths) || vscode.workspace.workspaceFolders === undefined || vscode.workspace.workspaceFolders?.length === 0) {
          this.postMessage(webviewPanel, 'CheckFilesResponse', {});
          return;
        }

        const results = [];
        for (let i = 0; i < e.paths.length; ++i) {
          try {
            const result = await vscode.workspace.fs.stat(vscode.Uri.joinPath(vscode.workspace.workspaceFolders[0].uri, e.paths[i]));
            results.push({ path: e.paths[i], exists: result && result.type === vscode.FileType.File });
          }
          catch {
            results.push({ path: e.paths[i], exists: false });
          }
        }
        this.postMessage(webviewPanel, 'CheckFilesResponse', results);
      }
    });
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

  private async onMessage(document: PGMInterfaceDocument, message: any) {
    if (message.type === 'OnDidChange') {
      document.makeEdit(message.edit as PGMInterfaceDocumentEdit);
      return;
    }
    else if (message.type === 'response') {
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