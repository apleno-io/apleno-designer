import AdmZip from 'adm-zip';
import fs from 'fs';
import path from 'path';
import vscode from 'vscode';
import { Storage } from '../utils/storage';

export class Exporter {
  /**
   * Register the export command.
   */
  public static registerCommand(context: vscode.ExtensionContext): vscode.Disposable {
    return vscode.commands.registerCommand('pgm.export', this.selectAndExport.bind(this));
  }

  /**
   * Open a save dialog and export the project to a file.
   */
  public static async selectAndExport(): Promise<boolean> {
    const config = await Storage.getConfig();
    const uri = await vscode.window.showSaveDialog({
      filters: {
        'PGM': ['pgm']
      },
      defaultUri: config.lastExportFolder ? vscode.Uri.file(config.lastExportFolder) : undefined,
      title: 'Export PGM app'
    });
    if (typeof uri === 'undefined') {
      return false;
    }
    config.lastExportFolder = uri.fsPath;
    await Storage.setConfig(config);
    return await this.export(uri.fsPath);
  }

  /**
   * Export the current workspace folder to a destination file.
   */
  public static async export(destination: string): Promise<boolean> {
    return new Promise(async (resolve) => {
      // Get folder
      const folder = vscode.workspace.workspaceFolders?.[0];
      if (folder === undefined) {
        return;
      }

      // Get .pgmignore
      const ignore: string[] = ['.git/**/*'];
      try {
        const ignoreContent = await fs.promises.readFile(path.join(folder.uri.fsPath, '.pgmignore'), 'utf8');
        ignore.push(...ignoreContent.replace(/\r\n/g, '\n').split('\n').map(l => l.trim()).filter(l => l.length > 0 && !l.startsWith('#')));
      }
      catch { }

      // List files
      const files = await vscode.workspace.findFiles('**/*', `{${ignore.join(',')}}`);

      // Create zip
      const zip = new AdmZip();

      // Add files
      files.forEach((x: vscode.Uri) => {
        const relative = path.relative(folder.uri.fsPath, x.fsPath);
        const dirRelative = path.dirname(relative);
        if (dirRelative !== '.') {
          zip.addLocalFile(x.fsPath, dirRelative);
        }
        else {
          zip.addLocalFile(x.fsPath);
        }
      });

      // Write zip
      await fs.promises.writeFile(destination, zip.toBuffer());
      resolve(true);
    });
  }
}