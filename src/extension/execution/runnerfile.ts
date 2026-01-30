import fs from 'fs';
import path from 'path';
import os from 'os';
import vscode from 'vscode';
import { Services } from '../services';
import { RuntimeManager } from './runtime-manager';
import { GetFreePort } from './free-port';
import { ConfigManager } from './config';

export interface PreviewConfigGeneratorResult {
  executable: string;
  configFile: string;
}

interface PythonPrefix {
  type: 'venv' | 'conda';
  prefix: string;
}

export class PreviewConfigGenerator {
  /**
   * Return a sanitized path for using in a raw command line argument
   */
  private static getSanitizedCommandPath(cmd: string): string {
    return cmd.includes(' ') ? `"${cmd.replace(/\\/g, '\\\\')}"` : cmd;
  }

  private static async doesFileExist(path: string): Promise<boolean> {
    try {
      await fs.promises.access(path);
      return true;
    }
    catch {
      return false;
    }
  }

  /**
   * @returns object|null {type: 'conda'|'venv'|null, prefix?: string}
   */
  private static async getPythonEnvPrefix(pythonPath: string, pathConda: string | null): Promise<PythonPrefix | null> {
    // Detect if the python.exe is within a python environnement
    const pythonFolder = path.dirname(pythonPath);
    if (await this.doesFileExist(path.join(pythonFolder, 'activate'))) {
      if (process.platform === 'win32') {
        return { type: 'venv', prefix: `${this.getSanitizedCommandPath(path.join(pythonFolder, (process.env.ComSpec as string).endsWith('cmd.exe') ? 'activate.bat' : 'Activate.ps1'))} && ` };
      }
      else {
        return { type: 'venv', prefix: `source ${this.getSanitizedCommandPath(path.join(pythonFolder, 'activate'))} && ` };
      }
    }

    // Detect if the python.exe is within a Conda environnement
    if (pathConda && await this.doesFileExist(path.join(pythonFolder, 'conda-meta'))) {
      const condaActivateScript = path.join(path.dirname(pathConda), process.platform === 'win32' ? 'activate.bat' : 'activate');
      return { type: 'conda', prefix: `${this.getSanitizedCommandPath(condaActivateScript)} ${this.getSanitizedCommandPath(path.normalize(pythonFolder))} && ` };
    }

    return null;
  }

  /**
   * Please note that here, the app directory and the output directory are both the project folder.
   */
  public static async load(): Promise<PreviewConfigGeneratorResult | null> {
    // Log
    const logger = Services.Logger;
    logger.info('[instance] Launching the app');

    // Runtime
    if ((await RuntimeManager.getRuntimeVersion()) === null) {
      logger.error('[instance] No runtime found.');
    }

    // Get project folder
    const workspace = vscode.workspace.workspaceFolders?.[0];
    if (workspace === undefined) {
      logger.error('[instance] Could not find the workspace folder.');
      return null;
    }
    const projectFolder = workspace.uri.fsPath;

    // Port
    logger.info('[instance] Getting instance port...');
    const port = await GetFreePort();
    if (port === null) {
      return null;
    }

    // Get R / Python / Conda
    logger.info('[instance] Getting paths...');
    let pathR = await ConfigManager.getExecutablePath('r');
    if (pathR && process.platform === 'win32' && pathR.endsWith('\\bin\\R.exe')) {
      pathR = pathR.substring(0, pathR.length - 10);
    }
    logger.info(`[instance] Using R path: ${pathR}`);

    const pathPython = await ConfigManager.getExecutablePath('python');
    logger.info(`[instance] Using python path: ${pathPython}`);
    const pathConda = await ConfigManager.getExecutablePath('conda');
    const pythonPrefix = pathPython ? await this.getPythonEnvPrefix(pathPython, pathConda) : null;
    logger.info(`[instance] Using python prefix: ${pythonPrefix ? pythonPrefix.prefix : 'null'}`);

    const pgmRunnerConfig: any = {
      /** The path to the pgm file */
      appPath: null,
      /** Auth token */
      authToken: '0000',
      /** A comma separated of stuff to debug: 'app', 'rcom', 'packets', 'ws', 'sequence', 'all' */
      debugMode: '',
      /** Folder where the app is unzipped */
      folderApp: projectFolder,
      /** Folder where output files and temps files of the instance will go, a sub-folder will be created */
      folderOutput: projectFolder,
      /** If true, no sub folder will be created in the output folder */
      folderOutputRoot: true,
      /** On server, will prepend all folder/file widget with this value */
      folderUser: '',
      http: true,
      httpResourcesFolder: path.join(RuntimeManager.getRuntimeFolder(), 'client'),
      /** Port of the Web Socket server */
      port: port,
      /** Path to python binary & env */
      pythonPath: pathPython,
      pythonPrefix: pythonPrefix ? pythonPrefix.prefix : null,
      /** Path to the pycom script */
      pythonComPath: path.join(RuntimeManager.getRuntimeFolder(), 'server/resources/pycom/pycom.py'),
      /** Path to the RCom binary */
      rComPath: path.join(RuntimeManager.getRuntimeFolder(), 'server/resources'),
      /** Path to R */
      rPath: pathR,
      /** '32' or '64' bits */
      rVersion: '64',
      /** 'client' or 'server' */
      serverMode: 'client',
      /** Version of RPGM Client or Server */
      serverVersion: '4.0.0',
      /** SMTP ip/host */
      smtpHost: '',
      /** SMTP user password */
      smtpPassword: '',
      /** SMTP Server port */
      smtpPort: 0,
      /** Is the SMTP connection secure? */
      smtpSecure: false,
      /** Sender's email address */
      smtpSender: '',
      /** User for SMTP */
      smtpUser: '',
      /** Base URL for the files in the app. If empty, local file will be generated */
      urlApp: '',
      /** Base URL for the output folder's files. If empty, local file will be generated */
      urlOutput: '',
      /** Email of the user executing the instance */
      userEmail: '',
      /** Name of the user executing the instance */
      userName: '',
      /** Path to the XLSX tool binary */
      xlsxPath: path.join(RuntimeManager.getRuntimeFolder(), 'server/resources/xlsx/rpgm-xlsx.exe')
    };

    // Write config file
    logger.info('[instance] Creating instance config file...');
    const configFilepath: string = path.join(os.tmpdir(), 'rpgmboot.json');
    await fs.promises.writeFile(configFilepath, JSON.stringify(pgmRunnerConfig), 'utf8');

    return { executable: path.join(RuntimeManager.getRuntimeFolder(), 'server/runner-win-x64.exe'), configFile: configFilepath };
  }
}