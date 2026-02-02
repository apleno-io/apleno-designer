import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { RuntimeManager } from './runtime-manager';
import { Services } from '../services';
import { ExecutionStatusItemManager } from './ui-status-item';
import { PreviewConfigGenerator } from './runnerfile';

async function debugPreChecks(folder: string): Promise<boolean> {
  // Default launch.json
  const launchPath = path.join(folder, '.vscode', 'launch.json');
  if (!fs.existsSync(launchPath)) {
    const config = {
      version: '0.2.0',
      configurations: [
        {
          type: "pgm",
          request: "launch",
          name: "RPGM preview"
        }
      ]
    };
    fs.mkdirSync(path.dirname(launchPath), { recursive: true });
    fs.writeFileSync(launchPath, JSON.stringify(config, null, 2));
  }

  // Logging
  Services.Logger.info('Starting PGM instance...');
  ExecutionStatusItemManager.setText('Starting PGM instance...');

  // Runtime installation management
  const version = await RuntimeManager.getRuntimeVersion();
  if (version === null) {
    // no runtime, offer to download in modal
    Services.Logger.info('No runtime installed.');
    const wantInstall = await vscode.window.showInformationMessage('To execute a PGM app, you need the PGM runtime installed on your computer. Do you want to install it now?', { modal: true }, ...['Download']);
    if (wantInstall === 'Cancel') {
      return false;
    }

    // download
    const success = await RuntimeManager.downloadRuntime(); // manage error messages in RuntimeManager
    if (!success) {
      return false;
    }
  }
  else {
    // check update
    const update = await RuntimeManager.checkUpdateAvailable();
    if (update) {
      // non-modal: offer to update in notification
      const wantInstall = await vscode.window.showInformationMessage(`A PGM runtime update is available (installed: ${version}, available: ${update}). Do you want to download and install the update?`, { modal: true }, ...['Download']);
      if (wantInstall === 'Download') {
        // download
        const success = await RuntimeManager.downloadRuntime(); // manage error messages in RuntimeManager
        if (!success) {
          return false;
        }
      }
    }
  }

  return true;
}

export class PGMRunner {
  public static initialize(context: vscode.ExtensionContext): void {
    context.subscriptions.push(vscode.debug.registerDebugConfigurationProvider('pgm', new PGMDebugConfigurationProvider()));
    context.subscriptions.push(vscode.commands.registerCommand(
      'pgm.run',
      async () => {
        try {
          // normal debug if no ppro project
          const files = await vscode.workspace.findFiles('*.ppro', null, 1);
          if (files.length === 0) {
            return;
          }

          // get workspace folder
          const folder = vscode.workspace.getWorkspaceFolder(files[0]);
          if (folder === undefined) {
            vscode.window.showErrorMessage('Could not get the workspace folder.');
            return;
          }

          debugPreChecks(folder.uri.fsPath);
          return;
        } catch (err) {
          vscode.window.showErrorMessage(`Error while launching: ${(err as Error).message}`);
        }
      }
    ));
    vscode.debug.onDidReceiveDebugSessionCustomEvent((e) => {
      if (e.session.type === 'pgm' && e.event === 'pgm/started' && e.body?.port) {
        vscode.env.openExternal(vscode.Uri.parse(`http://localhost:${e.body?.port}`));
      }
    });
  }
}

export class PGMDebugConfigurationProvider implements vscode.DebugConfigurationProvider {
  provideDebugConfigurations(
    folder: vscode.WorkspaceFolder | undefined
  ): vscode.ProviderResult<vscode.DebugConfiguration[]> {
    return [
      {
        type: "pgm",
        request: "launch",
        name: "RPGM preview"
      }
    ];
  }

  async resolveDebugConfiguration(folder: vscode.WorkspaceFolder | undefined, config: vscode.DebugConfiguration): Promise<vscode.DebugConfiguration | undefined> {
    if (!vscode.workspace.workspaceFolders || folder === undefined) {
      vscode.window.showErrorMessage(`PGM: Could not launch debug. You need to be in a workspace.`);
      return undefined;
    }

    // test if project file
    const files = await vscode.workspace.findFiles('*.ppro', null, 1);
    if (files.length === 0) {
      vscode.window.showErrorMessage(`PGM: Could not launch debug. No project file found.`);
      return undefined;
    }

    // prechecks
    const resChecks = await debugPreChecks(folder.uri.fsPath);
    if (!resChecks) {
      return undefined;
    }

    const res = await PreviewConfigGenerator.load();
    if (res === null) {
      vscode.window.showErrorMessage(`PGM: Could not launch debug.`);
      return undefined;
    }

    // undefined prevent continuing vscode debug
    config.type = 'pgm';
    config.name = 'RPGM preview';
    config.request = 'launch';
    config.debugExePath = res.executable;
    config.debugConfigPath = res.configFile;
    return config;
  }
}