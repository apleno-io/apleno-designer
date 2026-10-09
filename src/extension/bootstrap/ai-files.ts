import * as vscode from 'vscode';
import { logger } from '../utils/logger';
import { getSkillFolders, mirrorFolder } from './skill-files';

/**
 * Files helping AI assistants (Claude, Copilot...) to work on Apleno apps:
 * - The Apleno skill (references, JSON schemas and example apps), installed for
 *   the user in ~/.claude/skills/apleno where Claude Code and Copilot find it.
 *   It belongs to the extension: it is synchronized on each activation and
 *   removed when the extension is uninstalled (see uninstall.ts).
 * - AGENTS.md and CLAUDE.md in each project: instructions. They belong to the
 *   user once created and are never modified.
 */

export interface AIFilesResult {
  /** Files created */
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
 * Install or update the Apleno skill in the user's skill folders.
 */
async function syncSkill(context: vscode.ExtensionContext): Promise<void> {
  const source = vscode.Uri.joinPath(context.extensionUri, 'dist', 'skill', 'apleno').fsPath;
  for (const folder of getSkillFolders()) {
    const changes = await mirrorFolder(source, folder);
    if (changes > 0) {
      logger.info(`Apleno: updated the AI assistant skill in ${folder} (${changes} files)`);
    }
  }
}

/**
 * Create the AI assistant instructions of a project, if they don't exist.
 */
export async function writeAIFiles(context: vscode.ExtensionContext, projectFolder: vscode.Uri): Promise<AIFilesResult> {
  const result: AIFilesResult = { written: [], kept: [], claudeMissingImport: false };

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
    syncSkill(context).catch(e => logger.error(`Apleno: could not install the AI assistant skill: ${e}`));
  }

  /**
   * Command: create the AI assistant instructions in an existing project.
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
      result.written.length > 0 ? `AI assistant files written: ${result.written.join(', ')}.` : 'AI assistant files are already set up.'
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
