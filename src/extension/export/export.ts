import AdmZip from 'adm-zip';
import fs from 'fs';
import path from 'path';
import vscode from 'vscode';

// TODO: read .pgmignore

export function ExportProjet(destination: string) {
  return new Promise(async (resolve) => {
    // List files
    const folder = vscode.workspace.workspaceFolders?.[0];
    if (folder === undefined) {
      return;
    }
    const files = await vscode.workspace.findFiles('**/*', '{.git/**/*}');

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
};