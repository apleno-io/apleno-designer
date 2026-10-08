import { describe, it, expect } from 'vitest';
import Ajv from 'ajv';
import pguiSchema from '../schemas/pgui.schema.json';
import pseqSchema from '../schemas/pseq.schema.json';
import pproSchema from '../schemas/ppro.schema.json';
import { normalizeGUI, WidgetProperties, WidgetSubTypes } from '../src/common/gui';
import { SequenceFileUtils } from '../src/common/sequence';
import { ProjectFileUtils } from '../src/common/project';

const ajv = new Ajv({ allErrors: true });
const validatePgui = ajv.compile(pguiSchema);
const validatePseq = ajv.compile(pseqSchema);
const validatePpro = ajv.compile(pproSchema);

// Round-trip through JSON like the editors do when saving
function asSaved(value: unknown): unknown {
  return JSON.parse(JSON.stringify(value));
}

function errorsOf(validate: { errors?: unknown }): string {
  return JSON.stringify(validate.errors, null, 2);
}

describe('pgui schema', () => {
  const definitions = pguiSchema.definitions as Record<string, any>;

  it('declares exactly the data properties of each widget type', () => {
    for (const [type, props] of Object.entries(WidgetProperties)) {
      const dataDef = definitions[`data-${type}`];
      expect(dataDef, `missing definition data-${type}`).toBeDefined();
      expect(Object.keys(dataDef.properties).sort()).toEqual([...props].sort());
    }
    expect(definitions.widget.properties.type.enum.sort()).toEqual(Object.keys(WidgetProperties).sort());
  });

  it('declares exactly the subtypes of each widget type', () => {
    for (const [type, subTypes] of Object.entries(WidgetSubTypes)) {
      expect(definitions[`data-${type}`].properties.subType.enum).toEqual(subTypes);
    }
  });

  it('accepts a normalized interface containing every widget type', () => {
    let id = 1;
    const leaves = Object.keys(WidgetProperties)
      .filter(type => !['box', 'columns', 'tabs'].includes(type))
      .map(type => ({ id: id++, customId: `w_${type}`, type, data: {} }));
    const box = () => ({ id: id++, customId: '', type: 'box', data: { labelPosition: 'hidden', boxDesign: 'none' }, widgets: [] });
    const gui = normalizeGUI({
      language: 'python',
      displaySubmitButton: false,
      widgets: [
        { id: id++, type: 'box', data: { boxHeader: 'Inputs' }, widgets: leaves },
        { id: id++, type: 'columns', data: { columnsWidths: [6, 6] }, widgets: [box(), box()] },
        { id: id++, type: 'tabs', data: { tabsNames: ['A'] }, widgets: [box()] }
      ]
    });

    expect(validatePgui(asSaved(gui)), errorsOf(validatePgui)).toBe(true);
  });

  it('accepts editor output where cleared number inputs became null', () => {
    const gui = normalizeGUI({ widgets: [{ id: 1, type: 'number', data: {} }] });
    gui.widgets[0].data.marginTop = NaN;
    gui.widgets[0].data.numberMinValue = NaN;

    expect(validatePgui(asSaved(gui)), errorsOf(validatePgui)).toBe(true);
  });

  it('rejects unknown types, properties and subtypes', () => {
    const base = () => ({ widgets: [{ id: 1, customId: '', type: 'text', data: { subType: 'text' } as any }] });

    const unknownType = base();
    (unknownType.widgets[0] as any).type = 'slider';
    expect(validatePgui(unknownType)).toBe(false);

    const unknownProp = base();
    unknownProp.widgets[0].data.buttonCode = 'x';
    expect(validatePgui(unknownProp)).toBe(false);

    const wrongSubType = base();
    wrongSubType.widgets[0].data.subType = 'slider';
    expect(validatePgui(wrongSubType)).toBe(false);
  });

  it('rejects children on non-container widgets and non-box slots in columns', () => {
    expect(validatePgui({
      widgets: [{ id: 1, type: 'text', data: {}, widgets: [] }]
    })).toBe(false);
    expect(validatePgui({
      widgets: [{ id: 1, type: 'columns', data: { columnsWidths: [12] }, widgets: [{ id: 2, type: 'text', data: {} }] }]
    })).toBe(false);
  });
});

describe('pseq schema', () => {
  const sequence = () => ({
    _version: 4,
    cameraX: 0,
    cameraY: 0,
    cameraZoom: 1,
    steps: [
      { id: 0, type: 'start', x: 0, y: 0, parameters: { target: 1 } },
      { id: 1, type: 'script', x: 0, y: 150, customId: 'load', customName: 'Load data', parameters: { file: 'scripts/load.R', target: 2 } },
      { id: 2, type: 'gui', x: 0, y: 300, customId: 'form', customName: 'Form', parameters: { file: 'form.pgui', target: 3 } },
      { id: 3, type: 'condition', x: 0, y: 450, parameters: { language: 'r', code: 'isTRUE(ok)', target: 4, targetOnFalse: 2 } },
      { id: 4, type: 'sequence', x: 0, y: 600, parameters: { file: 'sub.pseq', target: 5 } },
      { id: 5, type: 'end', x: 0, y: 750, parameters: {} }
    ]
  });

  it('accepts a complete sequence, also after sanitization', () => {
    expect(validatePseq(sequence()), errorsOf(validatePseq)).toBe(true);
    expect(validatePseq(asSaved(SequenceFileUtils.sanitize(sequence()))), errorsOf(validatePseq)).toBe(true);
  });

  it('rejects a sequence without start step', () => {
    const seq = sequence();
    seq.steps.shift();
    expect(validatePseq(seq)).toBe(false);
  });

  it('rejects steps with missing exits, files or condition code', () => {
    const noTarget = sequence();
    delete (noTarget.steps[1].parameters as any).target;
    expect(validatePseq(noTarget)).toBe(false);

    const wrongFile = sequence();
    wrongFile.steps[2].parameters.file = 'form.R';
    expect(validatePseq(wrongFile)).toBe(false);

    const noCode = sequence();
    noCode.steps[3].parameters.code = '';
    expect(validatePseq(noCode)).toBe(false);
  });
});

describe('ppro schema', () => {
  it('accepts a sanitized project file', () => {
    const project = ProjectFileUtils.sanitize({ name: 'My app', customFiles: ['style.css'] });
    expect(validatePpro(asSaved(project)), errorsOf(validatePpro)).toBe(true);
  });

  it('rejects invalid enum values and unknown keys', () => {
    const project: any = ProjectFileUtils.sanitize({ name: 'My app' });
    expect(validatePpro({ ...project, stepListType: 'sidebar' })).toBe(false);
    expect(validatePpro({ ...project, start: 'main.pseq' })).toBe(false);
  });
});
