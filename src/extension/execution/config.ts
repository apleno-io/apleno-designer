import fs from 'fs';
import path from 'path';
import * as vscode from 'vscode';
import { FinderPython } from './finder-python';
import { FinderR } from './finder-r';
import { Conda } from './finder-conda';

export const ConfigManager = new class {
  private getConfigPath(): string | null {
    const ws = vscode.workspace.workspaceFolders;
    return ws && ws.length > 0 ? path.join(ws[0].uri.toString(), '.vscode', 'pgm.json') : null;
  }

  /**
   * Create default spawn config.
   */
  public createDefaultConfig(): void {
    const configPath = this.getConfigPath();
    if (configPath === null) {
      return;
    }

    this.saveConfig({});
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
  public async getConfig(): Promise<{ [key: string]: any }> {
    const configPath = this.getConfigPath();
    if (configPath === null) {
      return {};
    }

    this.createDefaultConfigIfNotExist();
    try {
      const content = await fs.promises.readFile(configPath, 'utf8');
      return JSON.parse(content);
    }
    catch (err: any) {
      return {};
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

  public async getExecutablePath(type: 'r' | 'python' | 'conda'): Promise<string | null> {
    const config = await this.getConfig();

    // Get current settings
    const executablePath: string = config[type]?.path;

    // Check if valid and if it exists
    if (typeof executablePath === 'string' && executablePath.trim().length > 0) {
      try {
        await fs.promises.access(executablePath);
        return executablePath;
      }
      catch { }
    }

    // Find all paths
    let installPaths: string[] = [];
    if (type === 'r') {
      installPaths = (await FinderR.getAllPaths()).map(i => i.path);
    }
    else if (type === 'python') {
      installPaths = (await FinderPython.getAllPaths()).map(i => i.path);
    }
    else if (type === 'conda') {
      installPaths = (await Conda.getAllCondaPaths());
    }

    // Get one & save
    if (installPaths.length > 0) {
      if (!(type in config)) {
        config[type] = {};
      }
      config[type].path = installPaths[0];
      await this.saveConfig(config);
      return installPaths[0];
    }

    return null;
  }
};