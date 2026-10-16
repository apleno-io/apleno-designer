import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import pguiSchema from '../schemas/pgui.schema.json';
import pseqSchema from '../schemas/pseq.schema.json';
import pproSchema from '../schemas/ppro.schema.json';
import { AplenoValidator, getFileKind } from '../src/extension/diagnostics/validator';

// The example apps are part of the AI skill: they must be valid
const validator = new AplenoValidator({ ppro: pproSchema, pseq: pseqSchema, pgui: pguiSchema });
const examplesFolder = path.join(__dirname, '..', 'examples');

const files = fs.readdirSync(examplesFolder, { withFileTypes: true })
  .filter(entry => entry.isDirectory())
  .flatMap(app => fs.readdirSync(path.join(examplesFolder, app.name))
    .filter(name => getFileKind(name) !== null)
    .map(name => path.join(app.name, name)));

describe('example apps', () => {
  it('has examples', () => {
    expect(files.length).toBeGreaterThan(0);
  });

  it.each(files)('%s is valid and its referenced files exist', (file) => {
    const fullPath = path.join(examplesFolder, file);
    const result = validator.validate(getFileKind(file)!, fs.readFileSync(fullPath, 'utf8'));
    const problems = result.problems.map(p => `${p.severity}: ${p.message}`);
    const missing = result.references
      .filter(reference => !fs.existsSync(path.join(path.dirname(fullPath), reference.path)))
      .map(reference => `missing file: ${reference.path}`);
    expect([...problems, ...missing]).toEqual([]);
  });
});
