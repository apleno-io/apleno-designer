export interface SequenceFileStep {
  id: number;
  type: 'start' | 'gui' | 'script' | 'condition' | 'sequence' | 'end';
  x: number;
  y: number;
  customId?: string;
  customName?: string;
  parameters: {
    file?: string;
    language?: 'r' | 'python';
    code?: string;
    target?: number;
    targetOnFalse?: number;
  };
}

export interface SequenceFile {
  _version: number;
  cameraX: number;
  cameraY: number;
  cameraZoom: number;
  steps: SequenceFileStep[];
}

function findInfoByID(infos: any, customId: string): any {
  for (let i = 0; i < infos.steps.length; ++i) {
    if (infos.steps[i].id === customId) {
      return infos.steps[i];
    }
  }
  return null;
}

export class SequenceFileUtils {
  public static sanitize(manifest: any): SequenceFile | null {
    // Is an object
    if (typeof manifest !== 'object' || manifest === null) {
      return null;
    }

    // Future version
    if (typeof manifest._version === 'number' && manifest._version > 4) {
      throw new Error('This sequence file is from a newer version of the software and cannot be loaded.');
    }

    // Update if needed
    const manifestV4 = !('_version' in manifest) ? this.V3toV4(this.V2toV3(manifest)) : manifest;
    return this.sanitizeV4(manifestV4);
  }

  private static V2toV3(infos: any): any {
    // Check steps
    infos.steps = Array.isArray(infos.steps) ? infos.steps.filter((s: any) => typeof s === 'object' && s !== null) : [];

    // Get highest UUID
    let nextuuid: number = 0;
    infos.steps.forEach((step: any) => {
      if (step.uuid && step.uuid > nextuuid) {
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

    // RPGM2 compatibility
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
        const target: any = findInfoByID(infos, step.nextStep);
        if (target) {
          step.target = target.uuid;
        }
      }
      delete step.nextStep;

      if (step.onFalse) {
        const target: any = findInfoByID(infos, step.onFalse);
        if (target !== null) {
          step.falsetarget = target.uuid;
        }
      }
      delete step.onFalse;
    });

    return infos;
  }

  private static V3toV4(infos: any): SequenceFile {
    // we have a v3 step here
    // v3 step is:
    // - id (custom user id), uuid (unique id), type, name
    // - r, target, falsetarget, language, file

    // Check steps
    infos.steps = Array.isArray(infos.steps) ? infos.steps.filter((s: any) => typeof s === 'object' && s !== null) : [];

    infos.steps.forEach((step: any) => {
      if (step.id) {
        step.customId = step.id;
        delete step.id;
      }
      if (step.uuid) {
        step.id = step.uuid;
        delete step.uuid;
      }
      if (step.name) {
        step.customName = step.name;
        delete step.name;
      }

      if (!('type' in step) || step.type === 'report') {
        step.type = 'end';
      }
      if (step.type === 'rscript') {
        step.type = 'script';
      }
      if (!['start', 'gui', 'script', 'condition', 'sequence', 'end'].includes(step.type)) {
        step.type = 'end';
      }

      if (!('parameters' in step) || typeof step.parameters !== 'object') {
        step.parameters = {};
      }

      if (step.file) {
        step.parameters.file = step.file;
        delete step.file;
      }
      if (step.r) {
        step.parameters.code = step.r;
        delete step.r;
      }
      if (step.target) {
        step.parameters.target = step.target;
        delete step.target;
      }
      if (step.falsetarget) {
        step.parameters.targetOnFalse = step.falsetarget;
        delete step.falsetarget;
      }
      step.parameters.language = 'language' in step && step.language === 'python' ? 'python' : 'r';
      delete step.language;
    });

    // mark as v4
    infos._version = 4;

    return infos as SequenceFile;
  };

  private static sanitizeV4(info: any): SequenceFile | null {
    info._version = typeof info._version === 'number' ? info._version : 4;
    info.cameraX = typeof info.cameraX === 'number' ? info.cameraX : 0;
    info.cameraY = typeof info.cameraY === 'number' ? info.cameraY : 0;
    info.cameraZoom = typeof info.cameraZoom === 'number' ? info.cameraZoom : 1;
    info.steps = Array.isArray(info.steps) ? info.steps.filter((s: any) => typeof s === 'object' && s !== null) : [];

    info.steps = info.steps.map((step: any) => {
      // Is an object with parameters key
      if (typeof step !== 'object' || step === null) {
        return null;
      }
      if (!('parameters' in step) || typeof step.parameters !== 'object') {
        step.parameters = {};
      }

      // Sanitize
      if (typeof step.id !== 'number' || step.id < 0) {
        return null;
      }
      if (typeof step.type !== 'string' || !['start', 'gui', 'script', 'condition', 'sequence', 'end'].includes(step.type)) {
        return null;
      }
      if (typeof step.x !== 'number') {
        step.x = 0;
      }
      if (typeof step.y !== 'number') {
        step.y = 0;
      }
      if ('customId' in step && typeof step.customId !== 'string') {
        step.customId = '';
      }
      if ('customName' in step && typeof step.customName !== 'string') {
        step.customName = '';
      }
      if ('parameters' in step) {
        const parameters = step.parameters;
        if ('file' in parameters && typeof parameters.file !== 'string') {
          parameters.file = '';
        }
        if ('language' in parameters && !['r', 'python'].includes(parameters.language)) {
          parameters.language = 'r';
        }
        if ('code' in parameters && typeof parameters.code !== 'string') {
          parameters.code = '';
        }
        if ('target' in parameters && typeof parameters.target !== 'number') {
          parameters.target = 0;
        }
        if ('targetOnFalse' in parameters && typeof parameters.targetOnFalse !== 'number') {
          parameters.targetOnFalse = 0;
        }
      }

      return step as SequenceFileStep;
    });

    // Second pass to remove null values
    info.steps = info.steps.filter((s: any) => typeof s === 'object' && s !== null);

    return info as SequenceFile;
  }
}