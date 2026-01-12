import fs from 'fs';
import path from 'path';
import * as vscode from 'vscode';

export const ConfigManager = new class {
  private getConfigPath(): string | null {
    const ws = vscode.workspace.workspaceFolders;
    return ws && ws.length > 0 ? path.join(ws[0].uri.toString(), '.vscode', 'launch.json') : null;
  }

  /**
   * Create default spawn config.
   */
  public createDefaultConfig(): void {
    const configPath = this.getConfigPath();
    if (configPath === null) {
      return;
    }

    this.saveConfig({
      version: '0.2.0',
      configurations: [
        {
          type: "pgm",
          request: "launch",
          name: "RPGM preview"
        }
      ]
    });
  }

  /**
   * Create default spawn config if it does not exists.
   */
  public createDefaultConfigIfNotExist(): void {
    const configPath = this.getConfigPath();
    if (configPath === null) {
      return;
    }

    if (!fs.existsSync(configPath)) {
      this.createDefaultConfig();
    }
  }

  /**
   * Get spawn config.
   */
  public async getConfig() {
    const configPath = this.getConfigPath();
    if (configPath === null) {
      return;
    }

    this.createDefaultConfigIfNotExist();
    try {
      const content = await fs.promises.readFile(configPath, 'utf8');
      return JSON.parse(content);
    }
    catch (err: any) {
      return null;
    }
  }

  /**
   * Save a new config.
   */
  public async saveConfig(content: any) {
    const configPath = this.getConfigPath();
    if (configPath === null) {
      return;
    }

    await fs.promises.mkdir(path.dirname(configPath), { recursive: true });
    await fs.promises.writeFile(configPath, JSON.stringify(content, null, 2));
  }
};