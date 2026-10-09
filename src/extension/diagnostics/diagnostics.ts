import * as path from 'path';
import * as vscode from 'vscode';
import { logger } from '../utils/logger';
import { type AplenoFileKind, AplenoValidator, getFileKind } from './validator';

const FILES_GLOB = '**/*.{ppro,pseq,pgui}';
// Dependencies, and the example apps of the AI skill (their data files are not included)
const EXCLUDE_GLOB = '{**/node_modules/**,**/.claude/skills/**}';
const EXCLUDE_PATH = /\/(node_modules|\.claude\/skills)\//;

/**
 * Show the errors of the Apleno files of the workspace in the Problems panel,
 * where users and AI assistants can see them. Files are validated from their
 * content on disk, when the workspace opens and each time they change.
 */
export class FileDiagnostics {
  private static collection: vscode.DiagnosticCollection;
  private static validator: AplenoValidator | null = null;
  private static validateAllTimeout: NodeJS.Timeout | undefined;

  public static initialize(context: vscode.ExtensionContext): void {
    this.collection = vscode.languages.createDiagnosticCollection('apleno');
    context.subscriptions.push(this.collection);
    this.start(context).catch(e => logger.error(`Apleno: could not start file validation: ${e}`));
  }

  private static async start(context: vscode.ExtensionContext): Promise<void> {
    const schemas: Partial<Record<AplenoFileKind, object>> = {};
    for (const kind of ['ppro', 'pseq', 'pgui'] as AplenoFileKind[]) {
      const content = await vscode.workspace.fs.readFile(vscode.Uri.joinPath(context.extensionUri, 'schemas', `${kind}.schema.json`));
      schemas[kind] = JSON.parse(Buffer.from(content).toString('utf8'));
    }
    this.validator = new AplenoValidator(schemas as Record<AplenoFileKind, object>);

    // Apleno files
    const watcher = vscode.workspace.createFileSystemWatcher(FILES_GLOB);
    // Any created or deleted file can fix or break a file referenced by a sequence or project
    const anyFileWatcher = vscode.workspace.createFileSystemWatcher('**/*', false, true, false);
    context.subscriptions.push(
      watcher,
      watcher.onDidCreate(uri => this.validateFile(uri)),
      watcher.onDidChange(uri => this.validateFile(uri)),
      watcher.onDidDelete(uri => this.collection.delete(uri)),
      anyFileWatcher,
      anyFileWatcher.onDidCreate(() => this.scheduleValidateAll()),
      anyFileWatcher.onDidDelete(() => this.scheduleValidateAll()),
      vscode.workspace.onDidChangeWorkspaceFolders(() => this.scheduleValidateAll()),
      new vscode.Disposable(() => clearTimeout(this.validateAllTimeout))
    );

    await this.validateAll();
  }

  private static scheduleValidateAll(): void {
    clearTimeout(this.validateAllTimeout);
    this.validateAllTimeout = setTimeout(() => this.validateAll(), 500);
  }

  private static async validateAll(): Promise<void> {
    const uris = await vscode.workspace.findFiles(FILES_GLOB, EXCLUDE_GLOB);
    const found = new Set(uris.map(uri => uri.toString()));
    this.collection.forEach(uri => {
      if (!found.has(uri.toString())) {
        this.collection.delete(uri);
      }
    });
    await Promise.all(uris.map(uri => this.validateFile(uri)));
  }

  private static async validateFile(uri: vscode.Uri): Promise<void> {
    const kind = getFileKind(uri.path);
    if (kind === null || this.validator === null || EXCLUDE_PATH.test(uri.path)) {
      return;
    }

    let text: string;
    try {
      text = Buffer.from(await vscode.workspace.fs.readFile(uri)).toString('utf8');
    } catch {
      this.collection.delete(uri);
      return;
    }

    const result = this.validator.validate(kind, text);
    const lines = new LineIndex(text);
    const diagnostics = result.problems.map(problem => this.createDiagnostic(
      lines.range(problem.offset, problem.length),
      problem.message,
      problem.severity === 'error' ? vscode.DiagnosticSeverity.Error : vscode.DiagnosticSeverity.Warning
    ));

    // Referenced files, relative to the project root
    const projectRoot = vscode.workspace.getWorkspaceFolder(uri)?.uri ?? vscode.Uri.joinPath(uri, '..');
    await Promise.all(result.references.map(async reference => {
      const target = path.isAbsolute(reference.path) ? vscode.Uri.file(reference.path) : vscode.Uri.joinPath(projectRoot, reference.path);
      let exists = false;
      try {
        exists = (await vscode.workspace.fs.stat(target)).type === vscode.FileType.File;
      } catch {
        exists = false;
      }
      if (!exists) {
        diagnostics.push(this.createDiagnostic(
          lines.range(reference.offset, reference.length),
          `File "${reference.path}" not found. Paths are relative to the project root folder.`,
          vscode.DiagnosticSeverity.Error
        ));
      }
    }));

    this.collection.set(uri, diagnostics);
  }

  private static createDiagnostic(range: vscode.Range, message: string, severity: vscode.DiagnosticSeverity): vscode.Diagnostic {
    const diagnostic = new vscode.Diagnostic(range, message, severity);
    diagnostic.source = 'Apleno';
    return diagnostic;
  }
}

/**
 * Convert offsets of a text to line/character positions.
 */
class LineIndex {
  private readonly lineStarts: number[] = [0];

  constructor(text: string) {
    for (let i = 0; i < text.length; ++i) {
      if (text[i] === '\n') {
        this.lineStarts.push(i + 1);
      }
    }
  }

  private position(offset: number): vscode.Position {
    let low = 0;
    let high = this.lineStarts.length - 1;
    while (low < high) {
      const middle = Math.ceil((low + high) / 2);
      if (this.lineStarts[middle] <= offset) {
        low = middle;
      }
      else {
        high = middle - 1;
      }
    }
    return new vscode.Position(low, offset - this.lineStarts[low]);
  }

  public range(offset: number, length: number): vscode.Range {
    return new vscode.Range(this.position(offset), this.position(offset + length));
  }
}
