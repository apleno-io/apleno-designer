/**
 * Sequence files (.pseq).
 *
 * The runtime reads the v3 format: a `steps` list where each step has its user
 * `id`, a numeric `uuid` referenced by `target`/`falsetarget`, and its settings
 * at the step level (`file`, `r`, `language`). The editor works on its own
 * internal model (SequenceState), converted from the file when reading and
 * back to v3 when saving (SequenceFileUtils.toV3).
 */

export type SequenceStepType = 'start' | 'gui' | 'script' | 'condition' | 'sequence' | 'end';

/**
 * Step of the editor's internal model.
 */
export interface SequenceStep {
  /** uuid of the step in the file */
  id: number;
  type: SequenceStepType;
  x: number;
  y: number;
  /** id of the step in the file */
  customId?: string;
  /** name of the step in the file */
  customName?: string;
  parameters: {
    file?: string;
    language?: 'r' | 'python';
    code?: string;
    target?: number;
    targetOnFalse?: number;
  };
}

/**
 * Editor's internal model of a sequence.
 */
export interface SequenceState {
  cameraX: number;
  cameraY: number;
  cameraZoom: number;
  steps: SequenceStep[];
}

/**
 * Step of a v3 sequence file, as read by the runtime.
 */
export interface SequenceFileStepV3 {
  id?: string;
  uuid: number;
  name?: string;
  x: number;
  y: number;
  type: 'start' | 'gui' | 'rscript' | 'condition' | 'sequence' | 'end';
  file?: string;
  r?: string;
  language?: 'r' | 'python';
  target?: number;
  falsetarget?: number;
}

/**
 * v3 sequence file. The camera keys are only used by the editor.
 */
export interface SequenceFileV3 {
  cameraX: number;
  cameraY: number;
  cameraZoom: number;
  steps: SequenceFileStepV3[];
}

const STEP_TYPES: SequenceStepType[] = ['start', 'gui', 'script', 'condition', 'sequence', 'end'];

function findInfoByCustomId(infos: any, customId: string): any {
  for (let i = 0; i < infos.steps.length; ++i) {
    if (infos.steps[i].id === customId) {
      return infos.steps[i];
    }
  }
  return null;
}

export class SequenceFileUtils {
  public static getDefaultFile(): SequenceState {
    return {
      cameraX: 0,
      cameraY: 0,
      cameraZoom: 1,
      steps: [{
        id: 1,
        type: 'start',
        x: 0,
        y: 0,
        parameters: {}
      }]
    };
  }

  /**
   * Read the content of a sequence file (v2 or v3 format) into the internal model.
   */
  public static sanitize(manifest: any): SequenceState | null {
    // Is an object
    if (typeof manifest !== 'object' || manifest === null) {
      return null;
    }

    // Format of the Apleno Designer extension 1.0.x, not supported by the runtime
    if ('_version' in manifest) {
      throw new Error('This sequence file uses the format of Apleno Designer 1.0.x, which the Apleno runtime cannot read. Please recreate it.');
    }

    return this.sanitizeState(this.V3toState(this.V2toV3(manifest)));
  }

  /**
   * Convert the internal model to the v3 file format, keeping only the keys
   * meaningful for each step type.
   */
  public static toV3(state: SequenceState): SequenceFileV3 {
    return {
      cameraX: state.cameraX,
      cameraY: state.cameraY,
      cameraZoom: state.cameraZoom,
      steps: state.steps.map(step => {
        const p = step.parameters;
        const isEdge = step.type === 'start' || step.type === 'end';
        const result: SequenceFileStepV3 = {
          ...(isEdge ? {} : { id: step.customId ?? '', name: step.customName ?? '' }),
          uuid: step.id,
          x: step.x,
          y: step.y,
          type: step.type === 'script' ? 'rscript' : step.type
        };
        if (['script', 'gui', 'sequence'].includes(step.type)) {
          result.file = p.file ?? '';
        }
        if (step.type === 'condition') {
          result.r = p.code ?? '';
          result.language = p.language === 'python' ? 'python' : 'r';
        }
        if (step.type !== 'end' && step.type !== 'sequence' && typeof p.target === 'number') {
          result.target = p.target;
        }
        if (step.type === 'condition' && typeof p.targetOnFalse === 'number') {
          result.falsetarget = p.targetOnFalse;
        }
        return result;
      })
    };
  }

  private static V2toV3(infos: any): any {
    // Check steps
    infos.steps = Array.isArray(infos.steps) ? infos.steps.filter((s: any) => typeof s === 'object' && s !== null) : [];

    // Get highest UUID
    let nextuuid: number = 0;
    infos.steps.forEach((step: any) => {
      if (typeof step.uuid === 'number' && step.uuid > nextuuid) {
        nextuuid = step.uuid;
      }
    });
    ++nextuuid;

    // Add an UUID and empty ID if not present
    infos.steps.forEach((step: any) => {
      if (!('uuid' in step)) {
        step.uuid = nextuuid++;
      }
      if (!('id' in step)) {
        step.id = '';
      }
    });

    // Apleno 2.x compatibility
    // - Remove 'start' root key
    delete infos.start;
    // - For each steps
    infos.steps.forEach((step: any) => {
      // - Remove sub 'data' key
      if (typeof step.data === 'object' && step.data !== null) {
        if (step.data.file) {
          step.file = step.data.file;
        }
        if (step.data.nextStepOnFalse) {
          step.onFalse = step.data.nextStepOnFalse;
        }
        if (step.data.r) {
          step.r = step.data.r;
        }
        delete step.data;
      }
      // - Connect steps by UUID and not by user ID
      if (step.nextStep) {
        const target: any = findInfoByCustomId(infos, step.nextStep);
        if (target) {
          step.target = target.uuid;
        }
      }
      delete step.nextStep;

      if (step.onFalse) {
        const target: any = findInfoByCustomId(infos, step.onFalse);
        if (target !== null) {
          step.falsetarget = target.uuid;
        }
      }
      delete step.onFalse;
    });

    return infos;
  }

  /**
   * Convert v3 steps to the internal model:
   * - id (custom user id), uuid (unique id), type, name
   * - r, target, falsetarget, language, file
   */
  private static V3toState(infos: any): any {
    const steps = Array.isArray(infos.steps) ? infos.steps.filter((s: any) => typeof s === 'object' && s !== null) : [];

    return {
      cameraX: infos.cameraX,
      cameraY: infos.cameraY,
      cameraZoom: infos.cameraZoom,
      steps: steps.map((step: any) => {
        let type = step.type;
        if (type === 'rscript') {
          type = 'script';
        }
        if (!STEP_TYPES.includes(type)) {
          type = 'end';
        }

        const parameters: SequenceStep['parameters'] = {};
        if (typeof step.file === 'string' && step.file.length > 0) {
          parameters.file = step.file;
        }
        if (typeof step.r === 'string' && step.r.length > 0) {
          parameters.code = step.r;
        }
        // End and sequence steps have no exit: entering a sequence is definitive
        if (typeof step.target === 'number' && type !== 'end' && type !== 'sequence') {
          parameters.target = step.target;
        }
        if (typeof step.falsetarget === 'number') {
          parameters.targetOnFalse = step.falsetarget;
        }
        if (type === 'condition') {
          parameters.language = step.language === 'python' ? 'python' : 'r';
        }

        return {
          id: step.uuid,
          type,
          x: step.x,
          y: step.y,
          customId: typeof step.id === 'string' && step.id.length > 0 ? step.id : undefined,
          customName: typeof step.name === 'string' && step.name.length > 0 ? step.name : undefined,
          parameters
        };
      })
    };
  }

  private static sanitizeState(info: any): SequenceState {
    const state: SequenceState = {
      cameraX: typeof info.cameraX === 'number' ? info.cameraX : 0,
      cameraY: typeof info.cameraY === 'number' ? info.cameraY : 0,
      cameraZoom: typeof info.cameraZoom === 'number' ? info.cameraZoom : 1,
      steps: []
    };

    for (const step of info.steps) {
      // Steps without a valid uuid can't be linked
      if (typeof step.id !== 'number' || step.id < 0) {
        continue;
      }
      if (typeof step.x !== 'number') {
        step.x = 0;
      }
      if (typeof step.y !== 'number') {
        step.y = 0;
      }
      if (step.customId === undefined) {
        delete step.customId;
      }
      if (step.customName === undefined) {
        delete step.customName;
      }
      state.steps.push(step as SequenceStep);
    }

    // if no step: default start step
    if (state.steps.length === 0) {
      state.steps.push(this.getDefaultFile().steps[0]);
    }

    return state;
  }
}
