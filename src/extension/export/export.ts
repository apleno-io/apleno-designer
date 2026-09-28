import AdmZip from 'adm-zip';
import * as fs from 'fs';
import mm from 'micromatch';
import * as path from 'path';
import * as vscode from 'vscode';
import { Storage } from '../utils/storage';

export class Exporter {
  /**
   * Register the export command.
   */
  public static registerCommand(context: vscode.ExtensionContext): vscode.Disposable {
    return vscode.commands.registerCommand('apleno.export', this.selectAndExport.bind(this));
  }

  /**
   * Open a save dialog and export the project to a file.
   */
  public static async selectAndExport(): Promise<boolean> {
    const config = await Storage.getConfig();
    const uri = await vscode.window.showSaveDialog({
      filters: {
        'Apleno app': ['pgm']
      },
      defaultUri: config.lastExportFolder ? vscode.Uri.file(config.lastExportFolder) : undefined,
      title: 'Export Apleno app'
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
    // Get folder
    const folder = vscode.workspace.workspaceFolders?.[0];
    if (folder === undefined) {
      return false;
    }

    // Get .aplenoignore
    const ignore: string[] = ['!.git/**/*', '!.aplenoignore'];
    try {
      const ignoreContent = await fs.promises.readFile(path.join(folder.uri.fsPath, '.aplenoignore'), 'utf8');
      ignore.push(...ignoreContent.replace(/\r\n/g, '\n').split('\n').map(l => l.trim()).filter(l => l.length > 0 && !l.startsWith('#')).map(l => `!${l.startsWith('./') ? l.substring(2) : l}`));
    }
    catch { }

    // List files
    const files = (await vscode.workspace.findFiles('**/*')).map(e => path.relative(folder.uri.fsPath, e.fsPath).replace(/\\/g, '/'));//, `{${ignore.join(',')}}`);
    const filesFiltered = mm(files, ignore);

    // Create zip
    const zip = new AdmZip();

    // Add files
    filesFiltered.forEach((relativePath: string) => {
      const absoluteFilePath = path.join(folder.uri.fsPath, relativePath);
      const dirRelative = path.dirname(relativePath);
      if (dirRelative !== '.') {
        zip.addLocalFile(absoluteFilePath, dirRelative);
      }
      else {
        zip.addLocalFile(absoluteFilePath);
      }
    });

    // Write zip
    try {
      await fs.promises.writeFile(destination, zip.toBuffer());
    }
    catch (err) {
      vscode.window.showErrorMessage(`Apleno: Could not export project: ${err}`);
      return false;
    }
    vscode.window.showInformationMessage(`Apleno: Project correctly exported.`);
    return true;
  }
}