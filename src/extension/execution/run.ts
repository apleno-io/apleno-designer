import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { spawn } from 'child_process';
import { RuntimeManager } from './runtime';
import { Services } from '../services';
import { ExecutionStatusItemManager } from './ui-status-item';

async function startRunner(folder: string) {
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
    const wantInstall = await vscode.window.showInformationMessage('To execute a PGM app, you need the PGM runtime installed on your computer. Do you want to install it now?', { modal: true }, ...['Download', 'Cancel']);
    if (wantInstall === 'Cancel') {
      return;
    }

    // download
    const success = await RuntimeManager.downloadRuntime(); // manage error messages in RuntimeManager
    if (!success) {
      return;
    }
  }
  else {
    // check update
    const update = await RuntimeManager.checkUpdateAvailable();
    if (update) {
      // non-modal: offer to update in notification
      const wantInstall = await vscode.window.showInformationMessage(`A PGM runtime update is available (installed: ${version}, available: ${update}). Do you want to download and install the update?`, ...['Download', 'Cancel']);
      if (wantInstall === 'Download') {
        // download
        const success = await RuntimeManager.downloadRuntime(); // manage error messages in RuntimeManager
        if (!success) {
          return;
        }
      }
    }
  }

  // TODO: Launch instance


  // Chemin de l’exécutable
  /*const exePath = 'C:/MonExecutable/custom.exe';
  const args: string[] = []; // à personnaliser si nécessaire

  // Lance le processus
  const proc = spawn(exePath, args, { cwd: folder.uri.fsPath });

  proc.stdout.on('data', data => console.log(`[stdout] ${data}`));
  proc.stderr.on('data', data => console.error(`[stderr] ${data}`));

  proc.on('close', code => {
    vscode.window.showInformationMessage(`Exécutable terminé avec code ${code}`);
  });

  proc.on('error', err => {
    vscode.window.showErrorMessage(`Erreur lors du lancement : ${err.message}`);
  });*/
}

export class PGMRunner {
  public static registerCommand(context: vscode.ExtensionContext): vscode.Disposable {
    return vscode.commands.registerCommand(
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

          startRunner(folder.uri.fsPath);
          return;
        } catch (err) {
          vscode.window.showErrorMessage(`Error while launching: ${(err as Error).message}`);
        }
      }
    );
  }
}

export class PGMDebug implements vscode.DebugConfigurationProvider {
  async resolveDebugConfiguration(folder: vscode.WorkspaceFolder | undefined, config: vscode.DebugConfiguration): Promise<vscode.DebugConfiguration | undefined> {
    if (!vscode.workspace.workspaceFolders || folder === undefined) {
      return config; // no workspace opened
    }

    // test if project file
    const files = await vscode.workspace.findFiles('*.ppro', null, 1);
    if (files.length === 0) {
      return config;
    }

    startRunner(folder.uri.fsPath);

    // undefined prevent continuing vscode debug
    return undefined;
  }
}