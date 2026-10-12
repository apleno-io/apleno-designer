import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';
import { logger } from '../utils/logger';

/**
 * Save the output of the last preview in .apleno/last-run.log of the project,
 * so that AI assistants can read the errors of the app after the user ran it.
 * The file is rewritten at each run. The .apleno folder ignores itself in git.
 */
export class RunLog {
  public static initialize(context: vscode.ExtensionContext): void {
    context.subscriptions.push(vscode.debug.registerDebugAdapterTrackerFactory('apleno', {
      createDebugAdapterTracker: (session) => this.createTracker(session)
    }));
  }

  private static createTracker(session: vscode.DebugSession): vscode.DebugAdapterTracker | undefined {
    const folder = session.workspaceFolder?.uri.fsPath;
    if (folder === undefined) {
      return undefined;
    }

    const logFolder = path.join(folder, '.apleno');
    let stream: fs.WriteStream | null = null;
    const write = (text: string) => stream?.write(text);
    const close = (footer: string) => {
      write(`\n--- ${footer} at ${new Date().toISOString()} ---\n`);
      stream?.end();
      stream = null;
    };

    return {
      onWillStartSession: () => {
        try {
          fs.mkdirSync(logFolder, { recursive: true });
          // Keep the folder out of git without touching the user's .gitignore
          const gitignore = path.join(logFolder, '.gitignore');
          if (!fs.existsSync(gitignore)) {
            fs.writeFileSync(gitignore, '*\n');
          }
          stream = fs.createWriteStream(path.join(logFolder, 'last-run.log'), { flags: 'w', encoding: 'utf8' });
          stream.on('error', (e) => logger.error(`Apleno: could not write the run log: ${e}`));
          write(`--- Apleno preview started at ${new Date().toISOString()} ---\n`);
        }
        catch (e) {
          logger.error(`Apleno: could not create the run log: ${e}`);
        }
      },
      onDidSendMessage: (message: any) => {
        if (message?.type !== 'event') {
          return;
        }
        if (message.event === 'output' && typeof message.body?.output === 'string') {
          write(message.body.category === 'stderr' ? `[stderr] ${message.body.output}` : message.body.output);
        }
        else if (message.event === 'exited') {
          close(`Apleno preview exited with code ${message.body?.exitCode ?? 'unknown'}`);
        }
      },
      onError: (error) => write(`\n[debugger error] ${error.message}\n`),
      onWillStopSession: () => close('Apleno preview stopped'),
      onExit: (code) => close(`Apleno preview ended${typeof code === 'number' ? ` with code ${code}` : ''}`)
    };
  }
}
