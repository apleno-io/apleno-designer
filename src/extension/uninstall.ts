import * as fs from 'fs';
import * as path from 'path';
import { getSkillFolders } from './bootstrap/skill-files';

/**
 * Run by VS Code with Node when the extension is uninstalled (package.json
 * "vscode:uninstall" script): remove the Apleno skill installed for AI assistants.
 */
for (const folder of getSkillFolders()) {
  try {
    // Only remove a folder that is our skill
    if (fs.readFileSync(path.join(folder, 'SKILL.md'), 'utf8').includes('name: apleno')) {
      fs.rmSync(folder, { recursive: true, force: true });
    }
  }
  catch {
    // not installed
  }
}
