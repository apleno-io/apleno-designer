import { describe, it, expect } from 'vitest';
import { SequenceFileUtils } from '../src/common/sequence';

describe('SequenceFileUtils', () => {
  const v3 = () => ({
    cameraX: 10,
    cameraY: 20,
    cameraZoom: 1.5,
    steps: [
      { uuid: 1, type: 'start', x: 0, y: 0, target: 2 },
      { uuid: 2, id: 'load', name: 'Load', type: 'rscript', x: 0, y: 150, file: 'load.R', target: 3 },
      { uuid: 3, id: 'check', name: 'Check', type: 'condition', x: 0, y: 300, r: 'ok == True', language: 'python', target: 4, falsetarget: 2 },
      { uuid: 4, type: 'end', x: 0, y: 450 }
    ]
  });

  it('reads a v3 file into the internal model', () => {
    const state = SequenceFileUtils.sanitize(v3())!;
    expect(state.cameraZoom).toBe(1.5);
    expect(state.steps[1]).toEqual({ id: 2, type: 'script', x: 0, y: 150, customId: 'load', customName: 'Load', parameters: { file: 'load.R', target: 3 } });
    expect(state.steps[2].parameters).toEqual({ code: 'ok == True', language: 'python', target: 4, targetOnFalse: 2 });
  });

  it('saves the v3 format with only the meaningful keys', () => {
    expect(SequenceFileUtils.toV3(SequenceFileUtils.sanitize(v3())!)).toEqual(v3());
  });

  it('accepts "script" as an alias of "rscript" and saves "rscript"', () => {
    const file = v3();
    file.steps[1].type = 'script';
    expect(SequenceFileUtils.toV3(SequenceFileUtils.sanitize(file)!).steps[1].type).toBe('rscript');
  });

  it('keeps a step with uuid 0 and the links to it', () => {
    const file = { steps: [{ uuid: 0, type: 'start', x: 0, y: 0, target: 1 }, { uuid: 1, type: 'rscript', file: 'a.R', x: 0, y: 150, target: 0 }] };
    const saved = SequenceFileUtils.toV3(SequenceFileUtils.sanitize(file)!);
    expect(saved.steps.map(s => [s.uuid, s.target])).toEqual([[0, 1], [1, 0]]);
  });

  it('reads Apleno 3.x files with empty keys', () => {
    const file = { steps: [
      { id: 'start', name: 'Start', type: 'start', x: 0, y: 0, uuid: 1, target: 2 },
      { id: '', name: '', file: '', target: '', type: 'end', x: 0, y: 100, uuid: 2 }
    ] };
    expect(SequenceFileUtils.toV3(SequenceFileUtils.sanitize(file)!).steps).toEqual([
      { uuid: 1, type: 'start', x: 0, y: 0, target: 2 },
      { uuid: 2, type: 'end', x: 0, y: 100 }
    ]);
  });

  it('rejects the 1.0.x format', () => {
    expect(() => SequenceFileUtils.sanitize({ _version: 4, steps: [] })).toThrow(/1\.0\.x/);
  });

  it('creates a valid default file', () => {
    expect(SequenceFileUtils.toV3(SequenceFileUtils.getDefaultFile())).toEqual({
      cameraX: 0, cameraY: 0, cameraZoom: 1, steps: [{ uuid: 1, type: 'start', x: 0, y: 0 }]
    });
  });
});
