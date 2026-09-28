import * as vscode from 'vscode';
import { FinderR } from './finder-r';
import { FinderPython } from './finder-python';
import { Conda } from './finder-conda';
import { ConfigManager } from './config';

export class LanguageChooser {
  public initialize(context: vscode.ExtensionContext) {
    context.subscriptions.push(vscode.commands.registerCommand(
      'apleno.language.choose.r',
      async () => {
        this.chooseLanguage('r');
      }
    ));
    context.subscriptions.push(vscode.commands.registerCommand(
      'apleno.language.choose.python',
      async () => {
        this.chooseLanguage('python');
      }
    ));
    context.subscriptions.push(vscode.commands.registerCommand(
      'apleno.language.choose.conda',
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

    // Stop if none or only one
    if (installPaths.length === 0) {
      vscode.window.showInformationMessage(`No intallation found for ${this.languageFullName(lang)}.`);
      return;
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
    if (!(lang in config)) {
      config[lang] = {};
    }
    config[lang].path = res;
    await ConfigManager.saveConfig(config);
  }

  private languageFullName(lang: 'r' | 'python' | 'conda') {
    if (lang === 'r') {
      return 'R';
    }
    else if (lang === 'python') {
      return 'Python';
    }
    else if (lang === 'conda') {
      return 'Conda';
    }
  }
}