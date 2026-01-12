import { promises as fsPromises } from 'fs';
import * as path from 'path';
import * as ChildProcess from 'child_process';
import { Conda } from './finder-conda';

interface PythonInstallCandidate {
  file: string;
  folder: string;
}

export interface PythonInstall {
  type: 'base' | 'env' | 'conda';
  path: string;
}

/**
 * This class searchs all Python installations on Windows, Mac and Linux
 */
export const FinderPython = new class {
  /**
   * Finds Python in PATH
   * @returns 
   */
  public async getAllPaths(): Promise<PythonInstall[]> {
    const found: PythonInstallCandidate[] = [];

    // Files to search
    let filesToSearch: string[] = ['python', 'python3'];
    if (process.platform === 'win32') {
      filesToSearch = filesToSearch.map(x => `${x}.exe`);
    }

    // Go through path
    const envPath: string[] = process.env.PATH ? process.env.PATH.split(process.platform === 'win32' ? ';' : ':').map(x => x.trim()) : [];
    for (let i = 0; i < envPath.length; ++i) {
      for (let f = 0; f < filesToSearch.length; ++f) {
        try {
          const filepath: string = path.join(envPath[i], filesToSearch[f]);
          await fsPromises.access(filepath);
          const folder: string = path.dirname(filepath).toLowerCase();
          if (!found.some(x => x.folder === folder)) {
            found.push({ file: filepath, folder });
          }
        }
        catch { }
      }
    }

    let foundPaths: PythonInstall[] = found.map(x => { return { type: 'base', path: x.file }; });

    // If results are empty, tests on Windows for a py.exe in Windows
    if (process.platform === 'win32' && (foundPaths.length === 0 || foundPaths.every(p => p.path.includes('WindowsApps')))) {
      try {
        await fsPromises.access('C:/Windows/py.exe');
        foundPaths.push({ type: 'base', path: 'C:/Windows/py.exe' });
      }
      catch { }
    }

    // If not ALL installations are in WindowsApps, remove WindowsApps as we don't really want it
    if (process.platform === 'win32' && !foundPaths.every(p => p.path.includes('WindowsApps'))) {
      foundPaths = foundPaths.filter(p => !p.path.includes('WindowsApps'));
    }

    // If there is still a WindowApps, check if it's a real one of not.
    // The WindowsApps fake python.exe returns a non-zero code when passing
    // argument.
    if (process.platform === 'win32') {
      const windowsApp: PythonInstall | undefined = foundPaths.find(p => p.path.includes('WindowsApp'));
      if (windowsApp) {
        const result = await this.getPythonReturnCode(windowsApp.path);
        if (result !== 0) {
          foundPaths = foundPaths.filter(p => !p.path.includes('WindowsApps'));
        }
      }
    }

    // Add conda environment
    const condaEnvs: PythonInstall[] = (await Conda.getCondaEnvs()).map(e => { return { type: 'conda', path: path.join(e, process.platform === 'win32' ? 'python.exe' : 'python') }; });
    foundPaths.push(...condaEnvs);

    return foundPaths;
  }

  private getPythonReturnCode(path: string): Promise<number> {
    return new Promise(resolve => {
      const subprocess: ChildProcess.ChildProcessWithoutNullStreams = ChildProcess.spawn(`${path} -V`, [], { shell: true });
      subprocess.on('close', (code) => {
        resolve(code || 1);
      });
    });
  }
};