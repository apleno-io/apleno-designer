import * as vscode from 'vscode';

/**
 * Class for bootstraping a new Apleno project.
 */
export class ProjectCreator {
  /**
   * Initialize this class and subscribe the initialize command.
   */
  public initialize(context: vscode.ExtensionContext) {
    context.subscriptions.push(vscode.commands.registerCommand(
      'apleno.initialize',
      async () => {
        // get target
        const targetFolder: vscode.Uri | undefined = await this.askTargetFolder();
        if (!targetFolder) {
          return;
        }

        // check if already initialize
        const entries = await vscode.workspace.fs.readDirectory(targetFolder);
        if (entries.some(([name, type]) => type === vscode.FileType.File && name.endsWith(".ppro"))) {
          const choice = await vscode.window.showWarningMessage(
            "This folder already contains an Apleno project.",
            "Cancel",
            "Continue anyway"
          );

          if (choice !== "Continue anyway") {
            return;
          }
        }

        // create project.ppro, main.pseq, start.pgui, launch.json and apleno.json
        await this.writeFile(targetFolder, 'project.ppro', JSON.stringify({ start: 'main.pseq' }, null, '\t'));
        await this.writeFile(targetFolder, 'main.pseq', JSON.stringify({
          steps: [{
            id: 'start',
            name: 'Start',
            type: 'start',
            x: 0,
            y: 0,
            uuid: 1
          }]
        }, null, '\t'));
        await this.writeFile(targetFolder, '.vscode/launch.json', JSON.stringify({
          "version": "0.2.0",
          "configurations": [
            {
              "type": "apleno",
              "request": "launch",
              "name": "Apleno preview"
            }
          ]
        }, null, '\t'));
        await this.writeFile(targetFolder, '.vscode/apleno.json', JSON.stringify({}, null, '\t'));

        // open project if different
        if (!vscode.workspace.getWorkspaceFolder(targetFolder)) {
          await vscode.commands.executeCommand(
            "vscode.openFolder",
            targetFolder,
            { forceNewWindow: false }
          );
        }
        return;
      }
    ));
  }

  /**
   * Ask the user a target folder to bootstrap the project.
   */
  private async askTargetFolder(): Promise<vscode.Uri | undefined> {
    const folders = vscode.workspace.workspaceFolders;

    // not in a workspace => dialog
    if (!folders || folders.length === 0) {
      return await this.pickFolder();
    }

    // if one workspace => quickpick to ask here or choose (dialog)
    if (folders.length === 1) {
      const wsRoot = folders[0].uri;
      const choice = await vscode.window.showQuickPick(
        [
          { label: "Initialize in this workspace folder", description: vscode.workspace.asRelativePath(wsRoot), uri: wsRoot },
          { label: "Choose another folder...", description: "", uri: undefined },
        ],
        {
          title: "Initialize a new Apleno project",
          placeHolder: "Select a folder",
        },
      );

      if (!choice) {
        return undefined;
      }
      if (choice.uri) {
        return choice.uri;
      }

      return await this.pickFolder();
    }

    // multi workspace
    const pickedRoot = await vscode.window.showQuickPick(
      [
        ...folders.map((f) => ({
          label: f.name,
          description: f.uri.fsPath,
          uri: f.uri,
        })),
        { label: "Choose another folder...", description: "", uri: undefined as unknown as vscode.Uri },
      ],
      { title: "Choose the folder to initialize the Apleno project" },
    );

    if (!pickedRoot) {
      return undefined;
    }
    if (pickedRoot.uri && pickedRoot.uri.scheme) {
      return pickedRoot.uri;
    }

    return await this.pickFolder();
  }

  /**
   * Show the open dialog to choose a folder.
   */
  private async pickFolder(): Promise<vscode.Uri | undefined> {
    const picked = await vscode.window.showOpenDialog({
      canSelectFiles: false,
      canSelectFolders: true,
      canSelectMany: false,
      openLabel: "Initialize",
      title: "Select a folder for the project",
    });
    return picked?.[0];
  }

  /**
   * Write a file in the project.
   */
  private async writeFile(folder: vscode.Uri, fileName: string, content: string) {
    const fileUri = vscode.Uri.joinPath(folder, fileName);
    const encoder = new TextEncoder();
    await vscode.workspace.fs.writeFile(
      fileUri,
      encoder.encode(content)
    );
  }
}