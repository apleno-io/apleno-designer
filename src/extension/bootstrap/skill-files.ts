import * as fs from 'fs/promises';
import * as os from 'os';
import * as path from 'path';

/**
 * Location and synchronization of the Apleno skill for AI assistants. This
 * module does not depend on VS Code: it is also used by the uninstall script.
 */

/**
 * Folders where the skill is installed. ~/.claude/skills is read by Claude Code
 * and by GitHub Copilot in VS Code. Claude Code can be configured to use another
 * folder with CLAUDE_CONFIG_DIR.
 */
export function getSkillFolders(): string[] {
  const folders = [path.join(os.homedir(), '.claude', 'skills', 'apleno')];
  const claudeConfigDir = process.env.CLAUDE_CONFIG_DIR;
  if (claudeConfigDir) {
    const folder = path.join(claudeConfigDir, 'skills', 'apleno');
    if (!folders.includes(folder)) {
      folders.push(folder);
    }
  }
  return folders;
}

/**
 * Relative paths of all the files of a folder, with '/' separators.
 */
async function listFiles(folder: string): Promise<string[]> {
  try {
    const entries = await fs.readdir(folder, { recursive: true, withFileTypes: true });
    return entries
      .filter(entry => entry.isFile())
      .map(entry => path.relative(folder, path.join(entry.parentPath, entry.name)).replace(/\\/g, '/'));
  }
  catch {
    return [];
  }
}

/**
 * Make `target` an exact copy of `source`, writing only the changed files and
 * deleting the files that are not in `source`. Return the number of changes.
 */
export async function mirrorFolder(source: string, target: string): Promise<number> {
  const sourceFiles = await listFiles(source);
  if (sourceFiles.length === 0) {
    throw new Error(`Nothing to copy from ${source}`);
  }
  let changes = 0;

  for (const file of sourceFiles) {
    const content = await fs.readFile(path.join(source, file));
    const destination = path.join(target, file);
    const current = await fs.readFile(destination).catch(() => null);
    if (current === null || !current.equals(content)) {
      await fs.mkdir(path.dirname(destination), { recursive: true });
      await fs.writeFile(destination, content);
      changes++;
    }
  }

  const kept = new Set(sourceFiles);
  for (const file of await listFiles(target)) {
    if (!kept.has(file)) {
      await fs.rm(path.join(target, file), { force: true });
      changes++;
    }
  }

  return changes;
}
