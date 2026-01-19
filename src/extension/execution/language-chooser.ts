import vscode from 'vscode';
import { FinderR } from './finder-r';
import { FinderPython } from './finder-python';
import { Conda } from './finder-conda';
import { ConfigManager } from './config';

export class LanguageChooser {
  public initialize(context: vscode.ExtensionContext) {
    context.subscriptions.push(vscode.commands.registerCommand(
      'pgm.language.choose.r',
      async () => {
        this.chooseLanguage('r');
      }
    ));
    context.subscriptions.push(vscode.commands.registerCommand(
      'pgm.language.choose.python',
      async () => {
        this.chooseLanguage('python');
      }
    ));
    context.subscriptions.push(vscode.commands.registerCommand(
      'pgm.language.choose.conda',
      async () => {
        this.chooseLanguage('conda');
      }
    ));
  }

  private async chooseLanguage(lang: 'r' | 'python' | 'conda') {
    // Get all paths
    let installPaths: string[] = [];
    if (lang === 'r') {
      installPaths = (await FinderR.getAllPaths()).map(i => i.path);
    }
    else if (lang === 'python') {
      installPaths = (await FinderPython.getAllPaths()).map(i => i.path);
    }
    else if (lang === 'conda') {
      installPaths = (await Conda.getAllCondaPaths());
    }

    // Choose
    const res = await vscode.window.showQuickPick(installPaths, {
      title: 'Choose ' + lang.toUpperCase() + ' path',
      canPickMany: false
    });
    if (res === undefined) {
      return;
    }

    // Save
    const config = await ConfigManager.getConfig();
    config[lang].path = res;
    await ConfigManager.saveConfig(config);
  }
}