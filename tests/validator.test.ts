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
  return { _version: 4, cameraX: 0, cameraY: 0, cameraZoom: 1, steps };
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
    const text = json({ widgets: [{ id: 1, customId: 'name', type: 'text', data: { subType: 'text', buttonCode: 'x' } }] });
    const { problems } = validator.validate('pgui', text);
    expect(problems).toHaveLength(1);
    expect(problems[0].message).toContain('widgets[0].data.buttonCode: unknown property "buttonCode" for a "text" widget');
    expect(problems[0].message).toContain('Allowed properties: subType, value,');
    expect(underlined(text, problems[0])).toBe('"buttonCode"');
  });

  it('reports invalid enum values with the allowed values', () => {
    const text = json({ widgets: [{ id: 1, type: 'button', data: { buttonSize: 'xl' } }] });
    const { problems } = validator.validate('pgui', text);
    expect(problems).toHaveLength(1);
    expect(problems[0].message).toBe('widgets[0].data.buttonSize: must be one of: "sm", "md", "lg", "fw".');
    expect(underlined(text, problems[0])).toBe('"xl"');
  });

  it('reports duplicate widget ids, also in nested widgets', () => {
    const text = json({
      widgets: [
        { id: 1, type: 'box', data: {}, widgets: [{ id: 2, type: 'label', data: {} }] },
        { id: 2, type: 'label', data: {} }
      ]
    });
    const { problems } = validator.validate('pgui', text);
    expect(problems).toHaveLength(1);
    expect(problems[0].message).toContain('widgets[1].id: duplicate widget id 2');
    expect(problems[0].message).toContain('next free id: 3');
  });

  it('reports children on non-container widgets and wrong children count', () => {
    const text = json({
      widgets: [
        { id: 1, type: 'text', data: {}, widgets: [] },
        { id: 2, type: 'tabs', data: { tabsNames: ['A', 'B'] }, widgets: [{ id: 3, type: 'box', data: {}, widgets: [] }] }
      ]
    });
    const messages = validator.validate('pgui', text).problems.map(p => p.message);
    expect(messages).toContain('widgets[0].widgets: only container widgets (box, columns, tabs) can have child widgets.');
    expect(messages).toContain('widgets[1].widgets: a "tabs" widget needs exactly one child "box" widget per entry of data.tabsNames (2), found 1.');
  });

  it('accepts a valid sequence and returns its file references', () => {
    const text = json(sequence([
      { id: 0, type: 'start', x: 0, y: 0, parameters: { target: 1 } },
      { id: 1, type: 'gui', x: 0, y: 150, customId: 'form', parameters: { file: 'form.pgui', target: 2 } },
      { id: 2, type: 'end', x: 0, y: 300, parameters: {} }
    ]));
    const result = validator.validate('pseq', text);
    expect(result.problems).toEqual([]);
    expect(result.references.map(r => r.path)).toEqual(['form.pgui']);
    expect(underlined(text, result.references[0])).toBe('"form.pgui"');
  });

  it('reports sequence graph errors', () => {
    const text = json(sequence([
      { id: 0, type: 'start', x: 0, y: 0, parameters: { target: 9 } },
      { id: 1, type: 'start', x: 0, y: 0, parameters: { target: 1 } },
      { id: 1, type: 'end', x: 0, y: 0, parameters: {} }
    ]));
    const messages = validator.validate('pseq', text).problems.map(p => p.message);
    expect(messages).toEqual(expect.arrayContaining([
      'steps[0].parameters.target: target points to step 9, which does not exist.',
      'steps[1].type: a sequence must have exactly one "start" step.',
      'steps[1].parameters.target: target points to the step itself.',
      'steps[2].id: duplicate step id 1. Step ids must be unique (next free id: 2).'
    ]));
  });

  it('reports a missing start step and a missing target', () => {
    const text = json(sequence([{ id: 0, type: 'script', x: 0, y: 0, parameters: { file: 'a.R' } }]));
    const messages = validator.validate('pseq', text).problems.map(p => p.message);
    expect(messages).toContain('steps: a sequence needs a step of type "start".');
    expect(messages).toContain('steps[0].parameters: missing required property "target".');
  });

  it('returns the files referenced by a project', () => {
    const text = json({ name: 'App', sequenceStart: 'main.pseq', icon: '', customFiles: ['style.css'] });
    const result = validator.validate('ppro', text);
    expect(result.problems).toEqual([]);
    expect(result.references.map(r => r.path)).toEqual(['main.pseq', 'style.css']);
  });
});
