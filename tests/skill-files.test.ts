import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { mirrorFolder } from '../src/extension/bootstrap/skill-files';

describe('mirrorFolder', () => {
  let root: string;
  let source: string;
  let target: string;

  const write = (file: string, content: string) => {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, content);
  };
  const read = (file: string) => fs.readFileSync(file, 'utf8');

  beforeEach(() => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), 'apleno-skill-'));
    source = path.join(root, 'source');
    target = path.join(root, 'target');
    write(path.join(source, 'SKILL.md'), 'skill');
    write(path.join(source, 'reference', 'api.md'), 'api');
  });

  afterEach(() => {
    fs.rmSync(root, { recursive: true, force: true });
  });

  it('copies all files, including nested ones', async () => {
    expect(await mirrorFolder(source, target)).toBe(2);
    expect(read(path.join(target, 'SKILL.md'))).toBe('skill');
    expect(read(path.join(target, 'reference', 'api.md'))).toBe('api');
  });

  it('only writes changed files', async () => {
    await mirrorFolder(source, target);
    expect(await mirrorFolder(source, target)).toBe(0);

    write(path.join(source, 'SKILL.md'), 'skill v2');
    expect(await mirrorFolder(source, target)).toBe(1);
    expect(read(path.join(target, 'SKILL.md'))).toBe('skill v2');
  });

  it('removes files that are no longer in the source', async () => {
    write(path.join(target, 'reference', 'old.md'), 'old');
    await mirrorFolder(source, target);
    expect(fs.existsSync(path.join(target, 'reference', 'old.md'))).toBe(false);
  });

  it('refuses an empty or missing source, to never wipe the installed skill', async () => {
    await mirrorFolder(source, target);
    await expect(mirrorFolder(path.join(root, 'missing'), target)).rejects.toThrow();
    expect(read(path.join(target, 'SKILL.md'))).toBe('skill');
  });
});
