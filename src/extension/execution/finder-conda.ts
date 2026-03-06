import * as ChildProcess from 'child_process';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';

interface ShellResult {
  output: string;
  code: number;
}

function executeShell(cmd: string): Promise<ShellResult> {
  return new Promise(resolve => {
    const subprocess = ChildProcess.spawn(cmd, [], { shell: true });
    let output = '';
    subprocess.stdout.on('data', (data: any) => {
      output += `${data}`;
    });
    subprocess.stderr.on('data', (data: any) => {
      output += `${data}`;
    });
    subprocess.on('close', (code: number) => {
      resolve({ output, code });
    });
  });
}

export const Conda = new class {
  /**
   * Returns all conda environments
   */
  public async getCondaEnvs(condaPath: string): Promise<string[]> {
    try {
      const envs: string = (await executeShell(`${condaPath} env list --json`)).output;
      return (JSON.parse(envs) as any).envs;
    }
    catch {
      return [];
    }
  }

  public async getAllCondaPaths(): Promise<string[]> {
    const paths: string[] = [];
    if (await this.testGlobalConda()) {
      paths.push('conda');
    }
    paths.push(...(await this.findCondaFromPaths()));
    return paths;
  }

  private async testGlobalConda(): Promise<boolean> {
    return (await executeShell('conda -V')).code === 0;
  }

  /**
   * Returns a list of conda executable
   */
  private async findCondaFromPaths(): Promise<string[]> {
    // Search for any folder containing "conda" in various place
    const placesToSearch: string[] = [];
    const userHome: string = os.homedir();
    placesToSearch.push(userHome);
    if (process.platform === 'win32') {
      placesToSearch.push(process.env.PROGRAMDATA as string);
      placesToSearch.push(path.join(process.env.LOCALAPPDATA as string, 'Continuum'));
    }
    else {
      placesToSearch.push(path.join(userHome, 'opt'), '/usr/share', '/opt', '/usr/local/share');
    }

    // Actually search in these folders for a "conda" directory
    const actualCondas: string[] = [];
    for (const place in placesToSearch) {
      let entries: string[] = [];
      try {
        entries = (await fs.readdir(placesToSearch[place])).filter(e => e.toLowerCase().includes('conda'));
      }
      catch {
        continue;
      }

      for (const entry in entries) {
        const exe: string = path.join(placesToSearch[place], entries[entry], process.platform === 'win32' ? 'Scripts/conda.exe' : 'bin/conda.exe');
        try {
          await fs.stat(exe);
          actualCondas.push(exe);
        }
        catch { }
      }
    }

    return actualCondas;
  }
};