import { describe, it, expect } from 'vitest';
import { GUIFileUtils, normalizeGUI } from '../src/common/gui';

describe('GUIFileUtils', () => {
  // An Apleno 3.x file, as the runtime reads it
  const v3 = () => ({
    language: 'python',
    submitbutton: false,
    elements: [
      { id: 'eta', type: 'number', data: { subtype: 'float', value: '0.1', isr: false, margintop: '10', labeltext: 'Eta', condition: 'eta > 0' } },
      {
        id: 'results', type: 'tabs', data: { tabsnames: ['A'], tabscurrent: '0' }, elements: [
          { id: '', type: 'box', data: { boxdesign: 'none' }, elements: [
            { id: 'graph_oc', type: 'graph', data: { graph: 'graph_oc(alpha)', graphheight: '400' } }
          ] }
        ]
      }
    ]
  });

  it('reads a v3 file, keeping the widget ids', () => {
    const gui = GUIFileUtils.read(v3());
    expect(gui.language).toBe('python');
    expect(gui.displaySubmitButton).toBe(false);
    expect(gui.widgets[0].customId).toBe('eta');
    expect(typeof gui.widgets[0].id).toBe('number');
    expect(gui.widgets[0].data).toMatchObject({ subType: 'float', value: '0.1', marginTop: 10, labelText: 'Eta', conditionOnSubmit: 'eta > 0' });
    expect(gui.widgets[1].widgets![0].widgets![0]).toMatchObject({ customId: 'graph_oc', data: { graphVariable: 'graph_oc(alpha)', graphHeight: 400 } });
  });

  it('saves the v3 format with the 3.x property names', () => {
    const file = GUIFileUtils.toV3(GUIFileUtils.read(v3()));
    expect(Object.keys(file)).toEqual(['language', 'submitbutton', 'elements']);
    expect(file.elements[0]).toMatchObject({ id: 'eta', type: 'number', data: { subtype: 'float', isr: false, margintop: 10, labeltext: 'Eta', condition: 'eta > 0' } });
    expect(file.elements[0]).not.toHaveProperty('elements');
    expect(file.elements[1].elements![0].elements![0]).toMatchObject({ id: 'graph_oc', data: { graph: 'graph_oc(alpha)', graphheight: 400 } });
  });

  it('gives the same file when saved twice', () => {
    const once = GUIFileUtils.toV3(GUIFileUtils.read(v3()));
    expect(GUIFileUtils.toV3(GUIFileUtils.read(JSON.parse(JSON.stringify(once))))).toEqual(once);
  });

  it('keeps the internal model unchanged when normalized again (as the webview does)', () => {
    const gui = GUIFileUtils.read(v3());
    expect(normalizeGUI(structuredClone(gui))).toEqual(gui);
  });

  it('keeps grid settings when normalized again', () => {
    const gui = GUIFileUtils.read({ elements: [{ id: 'g', type: 'grid', data: { gridtype: 'integer', gridstylingrules: [{ code: 'true', css: 'color: red' }] } }] });
    const again = normalizeGUI(structuredClone(gui));
    expect(again.widgets[0].data.gridType).toBe('integer');
    expect(again.widgets[0].data.gridStylingRules).toEqual([{ code: 'true', css: 'color: red' }]);
  });

  it('rejects the 1.0.x format', () => {
    expect(() => GUIFileUtils.read({ version: 50000, language: 'r', displaySubmitButton: true, widgets: [] })).toThrow(/1\.0\.x/);
  });
});
