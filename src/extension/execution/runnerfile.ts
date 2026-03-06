import path from 'path';
import vscode from 'vscode';
import { logger } from '../utils/logger';
import { RuntimeManager } from './runtime-manager';
import { ConfigManager } from './config';

export interface PreviewConfigGeneratorResult {
  bin: string;
  app: string;
  r: string;
  python: string;
  conda: string;
}

export class PreviewConfigGenerator {
  /**
   * Please note that here, the app directory and the output directory are both the project folder.
   */
  public static async load(): Promise<PreviewConfigGeneratorResult | null> {
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
      bin: path.join(RuntimeManager.getRuntimeFolder(), process.platform === 'win32' ? 'RPGM.exe' : 'RPGM'),
      app: workspace.uri.fsPath,
      r: await ConfigManager.getExecutablePath('r') || '',
      python: await ConfigManager.getExecutablePath('python') || '',
      conda: await ConfigManager.getExecutablePath('conda') || ''
    };
  }
}