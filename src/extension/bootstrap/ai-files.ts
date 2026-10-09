import * as vscode from 'vscode';
import { logger } from '../utils/logger';

/**
 * Files helping AI assistants (Claude, Copilot...) to work on an Apleno project:
 * - .apleno/schemas/*.schema.json: JSON Schemas of the Apleno files. They belong
 *   to the extension and are refreshed when the extension is updated.
 * - AGENTS.md and CLAUDE.md: instructions. They belong to the user once created
 *   and are never modified.
 */

const SCHEMAS = ['ppro', 'pseq', 'pgui'];
const SCHEMAS_FOLDER = '.apleno/schemas';

export interface AIFilesResult {
  /** Files created or updated */
  written: string[];
  /** Existing files left untouched */
  kept: string[];
  /** CLAUDE.md exists but does not import AGENTS.md */
  claudeMissingImport: boolean;
}

async function readFileOrNull(uri: vscode.Uri): Promise<Uint8Array | null> {
  try {
    return await vscode.workspace.fs.readFile(uri);
  }
  catch {
    return null;
  }
}

/**
 * Write a file only if its content changed, to not create useless changes in
 * the user's version control. Return true if written.
 */
async function writeIfChanged(uri: vscode.Uri, content: Uint8Array): Promise<boolean> {
  const current = await readFileOrNull(uri);
  if (current !== null && Buffer.from(current).equals(content)) {
    return false;
  }
  await vscode.workspace.fs.writeFile(uri, content);
  return true;
}

/**
 * Copy the schemas shipped with the extension into the project.
 */
async function writeSchemas(context: vscode.ExtensionContext, projectFolder: vscode.Uri): Promise<string[]> {
  const written: string[] = [];
  for (const kind of SCHEMAS) {
    const fileName = `${SCHEMAS_FOLDER}/${kind}.schema.json`;
    const content = await vscode.workspace.fs.readFile(vscode.Uri.joinPath(context.extensionUri, 'schemas', `${kind}.schema.json`));
    if (await writeIfChanged(vscode.Uri.joinPath(projectFolder, fileName), content)) {
      written.push(fileName);
    }
  }
  return written;
}

/**
 * Create or update the AI assistant files of a project.
 */
export async function writeAIFiles(context: vscode.ExtensionContext, projectFolder: vscode.Uri): Promise<AIFilesResult> {
  const result: AIFilesResult = { written: await writeSchemas(context, projectFolder), kept: [], claudeMissingImport: false };

  const agentsUri = vscode.Uri.joinPath(projectFolder, 'AGENTS.md');
  if (await readFileOrNull(agentsUri) === null) {
    await vscode.workspace.fs.writeFile(agentsUri, await vscode.workspace.fs.readFile(vscode.Uri.joinPath(context.extensionUri, 'templates', 'AGENTS.md')));
    result.written.push('AGENTS.md');
  }
  else {
    result.kept.push('AGENTS.md');
  }

  const claudeUri = vscode.Uri.joinPath(projectFolder, 'CLAUDE.md');
  const claude = await readFileOrNull(claudeUri);
  if (claude === null) {
    await vscode.workspace.fs.writeFile(claudeUri, Buffer.from('@AGENTS.md\n', 'utf8'));
    result.written.push('CLAUDE.md');
  }
  else {
    result.kept.push('CLAUDE.md');
    result.claudeMissingImport = !Buffer.from(claude).toString('utf8').includes('@AGENTS.md');
  }

  return result;
}

/**
 * Workspace folders that are Apleno projects (a .ppro file at their root).
 */
async function getProjectFolders(): Promise<vscode.WorkspaceFolder[]> {
  const projects: vscode.WorkspaceFolder[] = [];
  for (const folder of vscode.workspace.workspaceFolders ?? []) {
    try {
      const entries = await vscode.workspace.fs.readDirectory(folder.uri);
      if (entries.some(([name, type]) => type === vscode.FileType.File && name.endsWith('.ppro'))) {
        projects.push(folder);
      }
    }
    catch {
      // unreadable folder: not a project
    }
  }
  return projects;
}

export class AIFiles {
  public initialize(context: vscode.ExtensionContext) {
    context.subscriptions.push(vscode.commands.registerCommand('apleno.ai.setup', () => this.setup(context)));
    this.refreshSchemas(context).catch(e => logger.error(`Apleno: could not refresh the AI schemas: ${e}`));
  }

  /**
   * Keep the schemas of the projects up to date with the installed extension.
   * Only projects already set up are updated: nothing is created silently.
   */
  private async refreshSchemas(context: vscode.ExtensionContext): Promise<void> {
    for (const folder of await getProjectFolders()) {
      try {
        await vscode.workspace.fs.stat(vscode.Uri.joinPath(folder.uri, SCHEMAS_FOLDER));
      }
      catch {
        continue;
      }
      const written = await writeSchemas(context, folder.uri);
      if (written.length > 0) {
        logger.info(`Apleno: updated ${written.join(', ')} in ${folder.name}`);
      }
    }
  }

  /**
   * Command: set up the AI assistant files in an existing project.
   */
  private async setup(context: vscode.ExtensionContext): Promise<void> {
    const projects = await getProjectFolders();
    if (projects.length === 0) {
      vscode.window.showErrorMessage('No Apleno project found: open a folder containing a .ppro file.');
      return;
    }

    let project: vscode.WorkspaceFolder | undefined = projects[0];
    if (projects.length > 1) {
      project = (await vscode.window.showQuickPick(
        projects.map(folder => ({ label: folder.name, description: folder.uri.fsPath, folder })),
        { title: 'Set up AI assistant files', placeHolder: 'Select the Apleno project' }
      ))?.folder;
      if (!project) {
        return;
      }
    }

    const result = await writeAIFiles(context, project.uri);
    const messages: string[] = [
      result.written.length > 0 ? `AI assistant files written: ${result.written.join(', ')}.` : 'AI assistant files are already up to date.'
    ];
    if (result.kept.length > 0) {
      messages.push(`Existing ${result.kept.join(' and ')} kept unchanged.`);
    }
    if (result.claudeMissingImport) {
      messages.push('Add the line "@AGENTS.md" to CLAUDE.md so Claude reads the Apleno instructions.');
    }

    const open = 'Open AGENTS.md';
    if (await vscode.window.showInformationMessage(messages.join(' '), open) === open) {
      await vscode.window.showTextDocument(vscode.Uri.joinPath(project.uri, 'AGENTS.md'));
    }
  }
}
