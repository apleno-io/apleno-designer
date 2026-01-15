import fs from 'fs';
import path from 'path';
import { ExtensionContext } from 'vscode';

export interface StorageConfig {
  lastExportFolder?: string;
}

export const Storage = new class {
  private _configPath: string | null = null;

  public async initialize(context: ExtensionContext): Promise<boolean> {
    // Create folder
    try {
      await fs.promises.mkdir(context.globalStorageUri.fsPath, { recursive: true });
    }
    catch {
      return false;
    }

    this._configPath = path.join(context.globalStorageUri.fsPath, 'config.json');
    return true;
  }

  public async getConfig(): Promise<StorageConfig> {
    if (this._configPath === null) {
      return {};
    }

    try {
      return JSON.parse((await fs.promises.readFile(this._configPath, 'utf8')));
    }
    catch {
      return {};
    }
  }

  public async setConfig(content: StorageConfig): Promise<boolean> {
    if (this._configPath === null) {
      return false;
    }

    try {
      await fs.promises.writeFile(this._configPath, JSON.stringify(content, null, '\t'), 'utf8');
    }
    catch {
      return false;
    }
    return true;
  }
};