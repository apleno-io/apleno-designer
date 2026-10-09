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

  it('accepts legacy files once normalized, with numbers stored as strings', () => {
    const gui = normalizeGUI({ elements: [{ type: 'label', uid: 1, data: { margintop: '20', fontsize: '', value: 'Hi' } }] });
    expect(gui.widgets[0].data.marginTop).toBe(20);
    expect(gui.widgets[0].data.textSize).toBe(14);
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
    cameraX: 0,
    cameraY: 0,
    cameraZoom: 1,
    steps: [
      { uuid: 1, type: 'start', x: 0, y: 0, target: 2 } as any,
      { uuid: 2, id: 'load', name: 'Load data', type: 'rscript', x: 0, y: 150, file: 'scripts/load.R', target: 3 },
      { uuid: 3, id: 'form', name: 'Form', type: 'gui', x: 0, y: 300, file: 'form.pgui', target: 4 },
      { uuid: 4, id: 'check', name: 'Check', type: 'condition', x: 0, y: 450, r: 'isTRUE(ok)', language: 'r', target: 5, falsetarget: 3 },
      { uuid: 5, id: 'sub', name: 'Sub', type: 'sequence', x: 0, y: 600, file: 'sub.pseq', target: 6 },
      { uuid: 6, type: 'end', x: 0, y: 750 }
    ]
  });

  it('accepts a complete sequence, also as saved by the editor', () => {
    expect(validatePseq(sequence()), errorsOf(validatePseq)).toBe(true);
    const saved = SequenceFileUtils.toV3(SequenceFileUtils.sanitize(sequence())!);
    expect(validatePseq(asSaved(saved)), errorsOf(validatePseq)).toBe(true);
    expect(saved).toEqual(sequence());
  });

  it('accepts "script" as an alias of "rscript"', () => {
    const seq = sequence();
    seq.steps[1].type = 'script';
    expect(validatePseq(seq), errorsOf(validatePseq)).toBe(true);
  });

  it('rejects the 1.0.x format', () => {
    expect(validatePseq({ _version: 4, ...sequence() })).toBe(false);
  });

  it('rejects a sequence without start step', () => {
    const seq = sequence();
    seq.steps.shift();
    expect(validatePseq(seq)).toBe(false);
  });

  it('rejects steps with missing exits, files or condition code', () => {
    const noTarget = sequence();
    delete noTarget.steps[1].target;
    expect(validatePseq(noTarget)).toBe(false);

    const wrongFile = sequence();
    wrongFile.steps[2].file = 'form.R';
    expect(validatePseq(wrongFile)).toBe(false);

    const noCode = sequence();
    noCode.steps[3].r = '';
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
