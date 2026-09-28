import { execFile } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import semver from 'semver';
import { logger } from '../utils/logger';
import * as vscode from 'vscode';

export const RuntimeManager = new class {
  /**
   * Get the runtime installation folder.
   */
  public getRuntimeFolder(): string {
    if (process.platform === "win32") {
      return path.join(process.env.LOCALAPPDATA as string, 'aplenoruntime');
    }
    else if (process.platform === "darwin") {
      return path.join(os.homedir(), "Library", "Application Support", 'aplenoruntime');
    }

    // Linux / BSD: XDG if possible
    const xdgData = process.env.XDG_DATA_HOME || path.join(os.homedir(), ".local", "share");
    return path.join(xdgData, 'aplenoruntime');
  }

  /**
   * Get the installed runtime version or null if runtime wasn't found or invalid.
   */
  public async getRuntimeVersion(): Promise<string | null> {
    try {
      const data = JSON.parse(await fs.promises.readFile(path.join(this.getRuntimeFolder(), 'version.json'), 'utf8'));
      return data && data.version ? data.version : null;
    }
    catch {
      return null;
    }
  }

  /**
   * Get if a new runtime version is available. Null if no current version, can't check or no new version.
   */
  public async checkUpdateAvailable(): Promise<string | null> {
    // don't check update if no current version
    const current = await this.getRuntimeVersion();
    if (current === null) {
      return null;
    }

    try {
      const res = await fetch('https://files.pgm-solutions.com/runtime/latest.json');
      if (!res.ok) {
        throw new Error(`Bad server response: ${res.status}`);
      }

      const data: any = await res.json();
      if (data && data.version && semver.lt(current, data.version)) {
        return data.version;
      }
    }
    catch (err) {
      logger.error(`Apleno: Could not fetch if an update of the runtime exists: ${err}`, true);
    }
    return null;
  }

  /**
   * Download and install the latest runtime.
   */
  public async downloadRuntime(): Promise<boolean> {
    logger.info('Checking runtime folder...');

    try {
      await fs.promises.mkdir(this.getRuntimeFolder(), { recursive: true });
    }
    catch (err) {
      logger.error(`Could not create runtime folder: ${err}`, true);
      return false;
    }

    return vscode.window.withProgress({
      title: "Installing Apleno Runtime...",
      location: vscode.ProgressLocation.Notification,
    }, async (_progress) => {
      // Download & unzip
      try {
        const file = path.join(this.getRuntimeFolder(), 'latest.zip');
        logger.info(`Downloading latest runtime in ${this.getRuntimeFolder()}...`);
        let platform = 'linux';
        if (process.platform === 'win32') {
          platform = 'win';
        }
        else if (process.platform === 'darwin') {
          platform = 'mac';
        }

        // Get version
        const resVersion = await fetch('https://files.pgm-solutions.com/runtime/latest.json');
        if (!resVersion.ok) {
          throw new Error(`Could not download latest version`);
        }
        const dataVersion: unknown = await resVersion.json();
        if (typeof dataVersion !== 'object' || dataVersion === null || !('version' in dataVersion)) {
          throw new Error(`Invalid latest version to download: ${dataVersion}`);
        }

        // Actually download
        const runtimeURL = `https://files.pgm-solutions.com/runtime/client-${platform}-${dataVersion.version}.zip`;
        const res = await fetch(runtimeURL);
        if (!res.ok) {
          throw new Error(`Could not download or install runtime ${runtimeURL}. Status: ${res.status}`);
        }

        // Extract
        logger.info('Extracting runtime...');
        await fs.promises.writeFile(file, Buffer.from(await res.arrayBuffer()));
        await new Promise<void>((resolve, reject) => {
          if (process.platform === 'win32') {
            execFile('powershell.exe', ['-NoProfile', '-Command', `Expand-Archive -Force -LiteralPath '${file}' -DestinationPath '${this.getRuntimeFolder()}'`], (err) => err ? reject(err) : resolve());
          } else {
            execFile('unzip', ['-o', file, '-d', this.getRuntimeFolder()], (err) => err ? reject(err) : resolve());
          }
        });
        await fs.promises.rm(file, { force: true });

        // Version file
        await fs.promises.writeFile(path.join(this.getRuntimeFolder(), 'version.json'), JSON.stringify({ version: dataVersion.version }), 'utf8');

        logger.info('Runtime correctly installed...');
        return true;
      }
      catch (err) {
        logger.error(`Apleno: Could not download or install runtime: ${err}`, true);
        return false;
      }
    });
  }
};