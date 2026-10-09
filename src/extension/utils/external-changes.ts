import * as path from 'path';
import * as vscode from 'vscode';

/**
 * A custom document that can be reloaded when its file is modified by another program.
 */
export interface ExternallyEditableDocument {
  readonly uri: vscode.Uri;

  /**
   * True if the document has changes not saved to disk.
   */
  readonly isDirty: boolean;

  /**
   * True if `content` is what the document last read from or wrote to disk.
   */
  isSameAsDisk(content: Uint8Array): boolean;

  /**
   * Replace the document content by the file content, dropping unsaved changes.
   */
  reloadFromDisk(): Promise<void>;
}

/**
 * Watch the file of a custom document and reload the document when the file is
 * modified outside of the editor (AI agents, git, another editor...). If the
 * document has unsaved changes, the user chooses between reloading and keeping
 * their changes.
 */
export function watchExternalChanges(document: ExternallyEditableDocument): vscode.Disposable {
  if (document.uri.scheme !== 'file') {
    return new vscode.Disposable(() => { });
  }

  const fileName = path.posix.basename(document.uri.path);
  const watcher = vscode.workspace.createFileSystemWatcher(
    new vscode.RelativePattern(vscode.Uri.joinPath(document.uri, '..'), fileName),
    false, false, true
  );

  let timeout: NodeJS.Timeout | undefined;
  let isPrompting = false;
  let keptContent: Uint8Array | null = null;

  const check = async () => {
    let content: Uint8Array;
    try {
      content = await vscode.workspace.fs.readFile(document.uri);
    } catch {
      return;
    }

    // Our own save, or the user already chose to keep their version of this content
    if (document.isSameAsDisk(content) || (keptContent !== null && Buffer.from(content).equals(keptContent))) {
      return;
    }

    if (!document.isDirty) {
      await document.reloadFromDisk();
      return;
    }

    if (isPrompting) {
      return;
    }
    isPrompting = true;
    const choice = await vscode.window.showWarningMessage(
      `${fileName} was changed outside of the editor. Reload it and lose your unsaved changes?`,
      'Reload',
      'Keep my changes'
    );
    isPrompting = false;

    if (choice === 'Reload') {
      keptContent = null;
      await document.reloadFromDisk();
    }
    else {
      keptContent = content;
    }
  };

  // Writers often emit several events for one write: wait for the file to settle
  const onEvent = () => {
    clearTimeout(timeout);
    timeout = setTimeout(check, 150);
  };

  const listeners = [
    watcher,
    watcher.onDidChange(onEvent),
    watcher.onDidCreate(onEvent)
  ];

  return new vscode.Disposable(() => {
    clearTimeout(timeout);
    listeners.forEach(l => l.dispose());
  });
}
