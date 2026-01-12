import fs from 'fs';
import path from 'path';
import os from 'os';
import { ChildProcessWithoutNullStreams, spawn } from 'child_process';
import { Logger } from './logger';
import { GetFreePort } from './free-port';
import { Conda } from './finder-conda';

interface PythonPrefix {
  type: 'venv' | 'conda';
  prefix: string;
}

export class RPGMApp {
  private _currentProcess: ChildProcessWithoutNullStreams | null = null;
  private _isRunning: boolean = false;

  private currentPort: number = 0;
  private appFolder: string | null = null;

  private getRunnerServerFolder(): string {
    return 8;
  }

  /**
   * Return a sanitized path for using in a raw command line argument
   */
  private getSanitizedCommandPath(cmd: string): string {
    return cmd.includes(' ') ? `"${cmd.replace(/\\/g, '\\\\')}"` : cmd;
  }

  private async doesFileExist(path: string): Promise<boolean> {
    try {
      await fs.promises.access(path);
      return true;
    }
    catch {
      return false;
    }
  }

  private async getPythonPath(overridePython: string | null = null) {
    const pythonPath = overridePython || await PythonFinder.getPath();

    // Check path
    if (typeof pythonPath !== 'string' || pythonPath.length === 0 || (!(await this.doesFileExist(pythonPath)) && pythonPath.includes('WindowsApps'))) {
      return null;
    }

    return pythonPath;
  }

  /**
   * @returns object|null {type: 'conda'|'venv'|null, prefix?: string}
   */
  private async getPythonEnvPrefix(pythonPath: string): Promise<PythonPrefix | null> {
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
    const condaPath = await Conda.getCondaPath();
    if (condaPath && await this.doesFileExist(path.join(pythonFolder, 'conda-meta'))) {
      const condaActivateScript = path.join(path.dirname(condaPath), process.platform === 'win32' ? 'activate.bat' : 'activate');
      return { type: 'conda', prefix: `${this.getSanitizedCommandPath(condaActivateScript)} ${this.getSanitizedCommandPath(path.normalize(pythonFolder))} && ` };
    }

    return null;
  }

  public async load(appPath: string): Promise<number> {
    this.dispose();

    // Read .rcode file for overwriting values
    const rcodeContent: any = await Listing.getRCodeFile(appPath);

    // Port
    this.currentPort = await GetFreePort();

    // Temp folder
    let tempDir: string = Store.get('settings')['runner:tempDir'];
    if (typeof tempDir !== 'string' || tempDir.trim().length === 0) {
      tempDir = os.tmpdir();
    }
    else {
      tempDir = path.normalize(tempDir);
    }

    try {
      this.appFolder = await fs.promises.mkdtemp(path.join(tempDir, 'rpgm-'));
    }
    catch (err) {
      Logger.error(`Could not create temporary directory in ${tempDir}!`);
      Logger.error(`Details > ${err}`);
      throw new Error(`CouldNotCreateTempDir`);
    }

    // R Path
    let rPath: string = path.normalize(Store.get('settings')['r:path']);
    if (process.platform === 'win32' && rPath.endsWith('\\bin\\R.exe')) {
      rPath = rPath.substring(0, rPath.length - 10);
    }
    Logger.info(`Using R path: ${rPath}`);

    // Python Path
    let pythonPath = await this.getPythonPath();
    if (rcodeContent && 'pythonPath' in rcodeContent && rcodeContent.pythonPath.length > 0) {
      Logger.info('Python overriding .rcode setting for Python path detected.');
      pythonPath = rcodeContent.pythonPath;
    }
    Logger.info(`Using python path: ${pythonPath}`);

    // Python env
    const pythonPrefix = pythonPath ? await this.getPythonEnvPrefix(pythonPath) : null;
    Logger.info(`Using python prefix: ${pythonPrefix ? pythonPrefix.prefix : 'null'}`);

    const pgmRunnerConfig: any = {
      /** The path to the pgm file */
      appPath,
      /** Auth token */
      authToken: '0000',
      /** A comma separated of stuff to debug: 'app', 'rcom', 'packets', 'ws', 'sequence', 'all' */
      debugMode: '',
      /** Folder where the app is unzipped */
      folderApp: this.appFolder,
      /** Folder where output files and temps files of the instance will go, a sub-folder will be created */
      folderOutput: Store.get('settings').outputFolder,
      /** On server, will prepend all folder/file widget with this value */
      folderUser: '',
      /** Port of the Web Socket server */
      port: this.currentPort,
      /** Path to python binary & env */
      pythonPath: pythonPath,
      pythonPrefix: pythonPrefix ? pythonPrefix.prefix : null,
      /** Path to the pycom script */
      pythonComPath: path.join(this.getRunnerServerFolder(), 'resources/pycom/pycom.py'),
      /** Path to the RCom binary */
      rComPath: path.join(this.getRunnerServerFolder(), 'resources'),
      /** Path to R */
      rPath: rPath,
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
      xlsxPath: path.join(this.getRunnerServerFolder(), 'resources/xlsx/rpgm-xlsx.exe')
    };

    // Write config file
    const configFilepath: string = path.join(os.tmpdir(), 'rpgmboot.json');
    await fs.promises.writeFile(configFilepath, JSON.stringify(pgmRunnerConfig), 'utf8');

    Logger.info('Starting instance...');
    this._isRunning = true;
    this._currentProcess = spawn(path.join(this.getRunnerServerFolder(), 'runner-win-x64.exe'), [configFilepath]);
    this._currentProcess.stdout.on('data', (data: any) => {
      Logger.info(`${data}`.replace(/[\s\r\n]*$/, ''));
    });
    this._currentProcess.stderr.on('data', (data: any) => {
      Logger.info(`${data}`.replace(/[\s\r\n]*$/, ''));
    });
    this._currentProcess.on('close', () => {
      this._isRunning = false;
      Logger.info('event: close');
    });
    this._currentProcess.on('exit', async () => {
      this._isRunning = false;
      if (this.appFolder) {
        try {
          await fs.promises.rm(this.appFolder, { force: true, recursive: true });
        }
        catch (err) {
          Logger.error(`Could not delete temporary directory ${this.appFolder}!`);
          Logger.error((err as Error).message);
        }
        this.appFolder = null;
      }
      Logger.info('event: exit');
    });

    return this.currentPort;
  }

  public async dispose(): Promise<void> {
    if (this._currentProcess) {
      this._currentProcess.kill();
      this._currentProcess = null;
    }
  }

  public isRunning(): boolean {
    return this._isRunning;
  }
}