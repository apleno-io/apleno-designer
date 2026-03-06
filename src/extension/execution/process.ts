import { type ChildProcessWithoutNullStreams, spawn } from "child_process";

export const ChildProcessHelper = new class {
  public execute(executable: string, parameters: string[]): Promise<string> {
    return new Promise(resolve => {
      const outputs: string[] = [];
      const child: ChildProcessWithoutNullStreams = spawn(executable, parameters, {
        cwd: undefined,
        env: process.env
      });
      child.stdout.on('data', (data) => {
        outputs.push(`${data}`);
      });
      child.stderr.on('data', (data) => {
        outputs.push(`${data}`);
      });
      child.on('close', () => {
        resolve(outputs.join(''));
      });
    });
  }
};