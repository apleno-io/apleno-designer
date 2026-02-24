import fs from 'fs';
import path from 'path';
import vscode from 'vscode';
import { Services } from '../services';
import { RuntimeManager } from './runtime-manager';
import { ConfigManager } from './config';

export interface PreviewConfigGeneratorResult {
  bin: string;
  app: string;
  r: string;
  python: string;
  conda: string;
}

interface PythonPrefix {
  type: 'venv' | 'conda';
  prefix: string;
}

export class PreviewConfigGenerator {
  /**
   * Return a sanitized path for using in a raw command line argument
   */
  private static getSanitizedCommandPath(cmd: string): string {
    return cmd.includes(' ') ? `"${cmd.replace(/\\/g, '\\\\')}"` : cmd;
  }

  private static async doesFileExist(path: string): Promise<boolean> {
    try {
      await fs.promises.access(path);
      return true;
    }
    catch {
      return false;
    }
  }

  /**
   * @returns object|null {type: 'conda'|'venv'|null, prefix?: string}
   */
  private static async getPythonEnvPrefix(pythonPath: string, pathConda: string | null): Promise<PythonPrefix | null> {
    // Detect if the python.exe is within a python environnement
    const pythonFolder = path.dirname(pythonPath);
    if (await this.doesFileExist(path.join(pythonFolder, 'activate'))) {
      if (process.platform === 'win32') {
        return { type: 'venv', prefix: `${this.getSanitizedCommandPath(path.join(pythonFolder, (process.env.ComSpec as string).endsWith('cmd.exe') ? 'activate.bat' : 'Activate.ps1'))} && ` };
      }
      else {
        return { type: 'venv', prefix: `source ${this.getSanitizedCommandPath(path.join(pythonFolder, 'activate'))} && ` };
      }
    }

    // Detect if the python.exe is within a Conda environnement
    if (pathConda && await this.doesFileExist(path.join(pythonFolder, 'conda-meta'))) {
      const condaActivateScript = path.join(path.dirname(pathConda), process.platform === 'win32' ? 'activate.bat' : 'activate');
      return { type: 'conda', prefix: `${this.getSanitizedCommandPath(condaActivateScript)} ${this.getSanitizedCommandPath(path.normalize(pythonFolder))} && ` };
    }

    return null;
  }

  /**
   * Please note that here, the app directory and the output directory are both the project folder.
   */
  public static async load(): Promise<PreviewConfigGeneratorResult | null> {
    // Log
    const logger = Services.Logger;
    logger.info('[instance] Launching the app');

    // Runtime
    if ((await RuntimeManager.getRuntimeVersion()) === null) {
      logger.error('[instance] No runtime found.');
    }

    // Get project folder
    const workspace = vscode.workspace.workspaceFolders?.[0];
    if (workspace === undefined) {
      logger.error('[instance] Could not find the workspace folder.');
      return null;
    }

    return {
      bin: path.join(RuntimeManager.getRuntimeFolder(), 'RPGM.exe'),
      app: workspace.uri.fsPath,
      r: await ConfigManager.getExecutablePath('r') || '',
      python: await ConfigManager.getExecutablePath('python') || '',
      conda: await ConfigManager.getExecutablePath('conda') || ''
    };
  }
}