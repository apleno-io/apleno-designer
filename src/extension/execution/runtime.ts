import AdmZip from 'adm-zip';
import fs from 'fs';
import os from 'os';
import path from 'path';
import semver from 'semver';
import { Services } from '../services';
import vscode from 'vscode';

export const RuntimeManager = new class {
  /**
   * Get the runtime installation folder.
   */
  public getRuntimeFolder(): string {
    if (process.platform === "win32") {
      return path.join(process.env.LOCALAPPDATA as string, 'pgmruntime');
    }
    else if (process.platform === "darwin") {
      return path.join(os.homedir(), "Library", "Application Support", 'pgmruntime');
    }

    // Linux / BSD: XDG if possible
    const xdgData = process.env.XDG_DATA_HOME || path.join(os.homedir(), ".local", "share");
    return path.join(xdgData, 'pgmruntime');
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
      const res = await fetch('https://pgm-solutions.com/files/runtime/latest.json');
      if (!res.ok) {
        throw new Error(`Bad server response: ${res.status}`);
      }

      const data: any = await res.json();
      if (data && data.version && semver.lt(current, data.version)) {
        return data.version;
      }
    }
    catch (err) {
      Services.Logger.error(`PGM: Could not fetch if an update of the runtime exists: ${err}`, true);
    }
    return null;
  }

  /**
   * Download and install the latest runtime.
   */
  public downloadRuntime(): Promise<boolean> {
    return new Promise(async (resolve) => {
      // Check runtime folder exists
      try {
        await fs.promises.mkdir(this.getRuntimeFolder(), { recursive: true });
      }
      catch {
        resolve(false);
        return;
      }

      // Download & unzip
      try {
        const file = path.join(this.getRuntimeFolder(), 'latest.zip');
        const res = await fetch('https://pgm-solutions.com/files/runtime/latest.zip');
        if (res.ok) {
          await fs.promises.writeFile(file, Buffer.from(await res.arrayBuffer()));
          const zip = new AdmZip(file);
          zip.extractAllToAsync(this.getRuntimeFolder(), true, false, (err: Error | undefined) => {
            resolve(true);
          });
        }
        resolve(false);
      }
      catch (err) {
        Services.Logger.error(`PGM: Could not download or install runtime: ${err}`, true);
        resolve(false);
      }
    });
  }
};