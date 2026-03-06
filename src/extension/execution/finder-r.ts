/**
 * Default installation folders
 *   - Windows
 *     - Standard: C:\Program Files\R\
 *     - Chocolatey: C:\ProgramData\Chocolatey\
 *   - MacOS
 *     - Standard: /Library/Frameworks/R.framework/Versions
 *     - Brew: /usr/local/Cellar/r
 *   - Linux
 *     - Repo: /usr/bin/R
 */

import * as fs from 'fs';
import * as path from 'path';
import { ChildProcessHelper } from './process';

export interface RFinderInstance {
  path: string;
  version: string;
  shortPath: string;
}

/**
 * This class searchs all R installations on Windows, Mac and Linux
 */
export const FinderR = new class {
  /**
   * Finds R installs from the Windows registry
   * @returns 
   */
  private async findWindowsRegedit(): Promise<RFinderInstance[]> {
    // Reg executable
    const regPath: string = path.join(process.env.windir as string, 'system32', 'reg.exe');

    // Fetch main reg folder
    const rVersions: string[] = [];
    const result: string[] = (await ChildProcessHelper.execute(regPath, ['QUERY', `HKLM\\SOFTWARE\\R-core\\R`])).split('\n').map(l => l.trim()).filter(l => l.length > 0);
    const regexFolder: RegExp = /^HKEY_LOCAL_MACHINE\\SOFTWARE\\R-core\\R\\([\d.]+)$/m;
    for (let i: number = 0; i < result.length; ++i) {
      const r: RegExpExecArray | null = regexFolder.exec(result[i]);
      if (r && r.length > 1 && r[1].trim().length > 0) {
        rVersions.push(r[1].trim());
      }
    }

    // Fetch each version paths
    const instances: RFinderInstance[] = [];
    const regexVersion: RegExp = /^InstallPath\s+REG_SZ\s+(.*?)$/m;
    for (let i: number = 0; i < rVersions.length; ++i) {
      const resultVersions: string[] = (await ChildProcessHelper.execute(regPath, ['QUERY', `HKLM\\SOFTWARE\\R-core\\R\\${rVersions[i]}`])).split('\n').map(l => l.trim()).filter(l => l.length > 0);
      for (let j: number = 0; j < resultVersions.length; ++j) {
        const r: RegExpExecArray | null = regexVersion.exec(resultVersions[j]);
        if (r && r.length > 1 && r[1].trim().length > 0) {
          try {
            // Check if actually exists
            await fs.promises.access(path.join(r[1].trim(), '/bin/R.exe'));
            instances.push({
              path: path.join(r[1].trim(), '/bin/R.exe'),
              version: rVersions[i],
              shortPath: r[1].trim()
            });
          }
          catch { }
        }
      }
    }

    return instances;
  }

  /**
   * Finds R installs through the Windows PATH
   * @returns 
   */
  private async findWindowsPath(): Promise<RFinderInstance[]> {
    const instances: RFinderInstance[] = [];
    const paths: string[] = process.env.PATH ? process.env.PATH.split(';').map(p => p.trim()).filter(p => p.length > 0) : [];
    for (let i = 0; i < paths.length; ++i) {
      try {
        const filepath: string = path.join(paths[i], 'R.exe');
        await fs.promises.access(filepath);
        const folder: string = path.dirname(filepath);
        const version: RegExpExecArray | null = /(\d+\.\d+\.\d+)/.exec(filepath);
        instances.push({
          path: filepath,
          version: version ? version[1] : '',
          shortPath: folder
        });
      }
      catch { }
    }
    return instances;
  }

  /**
   * Finds all R installs on Windows
   * @returns 
   */
  private async getAllWindowsPaths(): Promise<RFinderInstance[]> {
    return (await this.findWindowsRegedit()).concat(await this.findWindowsPath());
  }

  /**
   * Finds all mac installs by looking in common installs folders
   * @returns 
   */
  private async getAllDarwinPaths(): Promise<RFinderInstance[]> {
    const installs: RFinderInstance[] = [];

    // Read Frameworks folder
    const frameworksFolder: string = '/Library/Frameworks/R.framework/Versions';
    try {
      const folders: string[] = await fs.promises.readdir(frameworksFolder);
      folders.forEach((v) => {
        if (v.startsWith('.')) {
          return;
        }

        installs.push({
          path: path.join(frameworksFolder, v, 'Resources'),
          version: v,
          shortPath: `R.framework/Versions/${v}`
        });
      });
    }
    catch { }

    // brew installs
    const brewFolder = '/usr/local/Cellar/r';
    try {
      const folders: string[] = await fs.promises.readdir(brewFolder);
      folders.forEach((v) => {
        if (v.startsWith('.')) {
          return;
        }

        installs.push({
          path: path.join(frameworksFolder, v, 'lib/R'),
          version: v,
          shortPath: `Cellar/r/${v}`
        });
      });
    }
    catch { }

    return installs;
  }

  /**
   * Finds all unix installs by looking in common installs folders
   * @returns 
   */
  private async getAllUnixPaths(): Promise<RFinderInstance[]> {
    const installs: RFinderInstance[] = [];

    // Read Frameworks folder
    try {
      await fs.promises.access('/usr/bin/R');
      installs.push({
        path: '/usr/lib/R',
        version: '',
        shortPath: '/usr/lib'
      });
    }
    catch { }

    return installs;
  }

  /**
   * Returns all available R paths on the OS
   * @returns an array of path strings
   */
  public async getAllPaths(): Promise<RFinderInstance[]> {
    let installs: RFinderInstance[] = [];

    // Fetch paths
    if (process.platform === 'win32') {
      installs = await this.getAllWindowsPaths();
    }
    else if (process.platform === 'darwin') {
      installs = await this.getAllDarwinPaths();
    }
    else {
      installs = await this.getAllUnixPaths();
    }

    // Sort by version
    installs = installs.sort((a: RFinderInstance, b: RFinderInstance) => {
      const aParts: string[] = a.version.trim().split('.');
      const bParts: string[] = b.version.trim().split('.');

      if (aParts.length !== 3 || bParts.length !== 3) {
        // At least one version is not valid
        return aParts.length === 3 ? 1 : -1;
      }

      // Both have three parts
      const aNumbers: number[] = aParts.map(a => parseInt(a));
      const bNumbers: number[] = bParts.map(a => parseInt(a));

      if (aNumbers.some(a => isNaN(a)) || bNumbers.some(b => isNaN(b))) {
        // At least one does not have only numbers
        return bNumbers.some(a => isNaN(a)) ? 1 : -1;
      }

      for (let i = 0; i < 3; ++i) {
        const diff: number = aNumbers[i] - bNumbers[i];
        if (diff !== 0) {
          return diff;
        }
      }

      return 0;
    }).reverse();

    // Remove duplicates
    const installsSingle: RFinderInstance[] = [];
    installs.forEach(i => {
      const pathLower: string = i.path.toLowerCase();
      if (!installsSingle.some(ii => ii.path.toLowerCase() === pathLower)) {
        installsSingle.push(i);
      }
    });

    return installsSingle;
  }
};