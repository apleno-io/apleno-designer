import { describe, it, expect } from 'vitest';
import pguiSchema from '../schemas/pgui.schema.json';
import pseqSchema from '../schemas/pseq.schema.json';
import pproSchema from '../schemas/ppro.schema.json';
import { AplenoValidator, getFileKind } from '../src/extension/diagnostics/validator';

const validator = new AplenoValidator({ ppro: pproSchema, pseq: pseqSchema, pgui: pguiSchema });

// Format like the editors save files
function json(value: unknown): string {
  return JSON.stringify(value, null, '\t');
}

// Text underlined by a problem or a reference
function underlined(text: string, item: { offset: number, length: number }): string {
  return text.substring(item.offset, item.offset + item.length);
}

function sequence(steps: unknown[]) {
  return { cameraX: 0, cameraY: 0, cameraZoom: 1, steps };
}

describe('getFileKind', () => {
  it('detects Apleno files', () => {
    expect(getFileKind('/app/main.pseq')).toBe('pseq');
    expect(getFileKind('/app/form.PGUI')).toBe('pgui');
    expect(getFileKind('/app/script.R')).toBeNull();
  });
});

describe('AplenoValidator', () => {
  it('accepts empty files, which the editors open as new files', () => {
    expect(validator.validate('pgui', '  \n').problems).toEqual([]);
  });

  it('reports invalid JSON at the error position', () => {
    const text = '{\n\t"widgets": [],\n}';
    const { problems } = validator.validate('pgui', text);
    expect(problems).toHaveLength(1);
    expect(problems[0].message).toMatch(/^Invalid JSON/);
    expect(underlined(text, problems[0])).toBe('}');
  });

  it('reports unknown widget properties with the widget type and the allowed properties', () => {
    const text = json({ elements: [{ id: 'name', type: 'text', data: { subtype: 'text', onpress: 'x' } }] });
    const { problems } = validator.validate('pgui', text);
    expect(problems).toHaveLength(1);
    expect(problems[0].message).toContain('elements[0].data.onpress: unknown property "onpress" for a "text" widget');
    expect(problems[0].message).toContain('Allowed properties: subtype, value,');
    expect(underlined(text, problems[0])).toBe('"onpress"');
  });

  it('reports invalid enum values with the allowed values', () => {
    const text = json({ elements: [{ id: '', type: 'button', data: { buttonsize: 'xl' } }] });
    const { problems } = validator.validate('pgui', text);
    expect(problems).toHaveLength(1);
    expect(problems[0].message).toBe('elements[0].data.buttonsize: must be one of: "sm", "md", "lg", "fw".');
    expect(underlined(text, problems[0])).toBe('"xl"');
  });

  it('reports duplicate widget ids, also in nested widgets', () => {
    const text = json({
      elements: [
        { id: '', type: 'box', data: {}, elements: [{ id: 'age', type: 'number', data: {} }] },
        { id: 'age', type: 'text', data: {} }
      ]
    });
    const { problems } = validator.validate('pgui', text);
    expect(problems).toHaveLength(1);
    expect(problems[0].message).toBe('elements[1].id: id "age" is already used by another widget.');
    expect(problems[0].severity).toBe('warning');
  });

  it('reports children on non-container widgets and wrong children count', () => {
    const text = json({
      elements: [
        { id: '', type: 'text', data: {}, elements: [] },
        { id: '', type: 'tabs', data: { tabsnames: ['A', 'B'] }, elements: [{ id: '', type: 'box', data: {}, elements: [] }] }
      ]
    });
    const messages = validator.validate('pgui', text).problems.map(p => p.message);
    expect(messages).toContain('elements[0].elements: only container widgets (box, columns, tabs) can have child widgets.');
    expect(messages).toContain('elements[1].elements: a "tabs" widget needs exactly one child "box" widget per entry of data.tabsnames (2), found 1.');
  });

  it('reports the 1.0.x interface format with a single explanation', () => {
    const text = json({ version: 50000, language: 'r', displaySubmitButton: true, widgets: [{ id: 1, customId: '', type: 'label', data: {} }] });
    const { problems } = validator.validate('pgui', text);
    expect(problems).toHaveLength(1);
    expect(problems[0].message).toContain('format of Apleno Designer 1.0.x');
  });

  it('accepts a valid sequence and returns its file references', () => {
    const text = json(sequence([
      { uuid: 1, type: 'start', x: 0, y: 0, target: 2 },
      { uuid: 2, id: 'form', name: 'Form', type: 'gui', x: 0, y: 150, file: 'form.pgui', target: 3 },
      { uuid: 3, type: 'end', x: 0, y: 300 }
    ]));
    const result = validator.validate('pseq', text);
    expect(result.problems).toEqual([]);
    expect(result.references.map(r => r.path)).toEqual(['form.pgui']);
    expect(underlined(text, result.references[0])).toBe('"form.pgui"');
  });

  it('reports sequence graph errors', () => {
    const text = json(sequence([
      { uuid: 1, type: 'start', x: 0, y: 0, target: 9 },
      { uuid: 2, type: 'start', x: 0, y: 0, target: 2 },
      { uuid: 2, id: 'a', type: 'rscript', file: 'a.R', x: 0, y: 0, target: 1 },
      { uuid: 3, id: 'a', type: 'rscript', file: 'b.R', x: 0, y: 0, target: 1 }
    ]));
    const messages = validator.validate('pseq', text).problems.map(p => p.message);
    expect(messages).toEqual(expect.arrayContaining([
      'steps[0].target: target points to uuid 9, which does not exist.',
      'steps[1].type: a sequence must have exactly one "start" step.',
      'steps[1].target: target points to the step itself.',
      'steps[2].uuid: duplicate step uuid 2. Step uuids must be unique (next free uuid: 4).',
      'steps[3].id: id "a" is already used by another step.'
    ]));
  });

  it('reports a missing start step and a missing target', () => {
    const text = json(sequence([{ uuid: 1, type: 'rscript', x: 0, y: 0, file: 'a.R' }]));
    const messages = validator.validate('pseq', text).problems.map(p => p.message);
    expect(messages).toContain('steps: a sequence needs a step of type "start".');
    expect(messages).toContain('steps[0]: missing required property "target".');
  });

  it('reports the 1.0.x sequence format with a single explanation', () => {
    const text = json({ _version: 4, steps: [{ id: 1, type: 'start', x: 0, y: 0, parameters: {} }] });
    const { problems } = validator.validate('pseq', text);
    expect(problems).toHaveLength(1);
    expect(problems[0].message).toContain('format of Apleno Designer 1.0.x');
    expect(underlined(text, problems[0])).toBe('"_version"');
  });

  it('returns the files referenced by a project', () => {
    const text = json({ name: 'App', sequenceStart: 'main.pseq', icon: '', customFiles: ['style.css'] });
    const result = validator.validate('ppro', text);
    expect(result.problems).toEqual([]);
    expect(result.references.map(r => r.path)).toEqual(['main.pseq', 'style.css']);
  });
});
