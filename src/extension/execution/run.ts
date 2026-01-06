import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { spawn } from 'child_process';

function startRunner(folder: string) {
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

  vscode.window.showInformationMessage(`Lancement du projet custom ${folder}`);

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