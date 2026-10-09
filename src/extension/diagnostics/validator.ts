import Ajv, { type ErrorObject, type ValidateFunction } from 'ajv';
import { findNodeAtLocation, getNodeValue, type Node, type ParseError, parseTree, printParseErrorCode } from 'jsonc-parser';

/**
 * Validation of Apleno files (.ppro, .pseq, .pgui) against their JSON Schemas,
 * plus the checks a schema cannot express (unique ids, existing targets...).
 * This module does not depend on VS Code so it can be unit tested.
 */

export type AplenoFileKind = 'ppro' | 'pseq' | 'pgui';

type JSONPath = (string | number)[];

export interface Problem {
  message: string;
  severity: 'error' | 'warning';
  offset: number;
  length: number;
}

/**
 * A file referenced by the validated file, which must exist in the project.
 */
export interface FileReference {
  path: string;
  offset: number;
  length: number;
}

export interface ValidationResult {
  problems: Problem[];
  references: FileReference[];
}

export function getFileKind(fileName: string): AplenoFileKind | null {
  const match = /\.(ppro|pseq|pgui)$/i.exec(fileName);
  return match ? match[1].toLowerCase() as AplenoFileKind : null;
}

function isObject(value: unknown): value is Record<string, any> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Format a JSON path like `widgets[0].data.subType`.
 */
function formatPath(path: JSONPath): string {
  if (path.length === 0) {
    return '(root)';
  }
  return path.map((segment, i) => typeof segment === 'number' ? `[${segment}]` : (i === 0 ? segment : `.${segment}`)).join('');
}

/**
 * Convert an Ajv instancePath (JSON pointer) to a JSON path.
 */
function pointerToPath(pointer: string): JSONPath {
  if (pointer.length === 0) {
    return [];
  }
  return pointer.split('/').slice(1).map(s => {
    const segment = s.replace(/~1/g, '/').replace(/~0/g, '~');
    return /^\d+$/.test(segment) ? parseInt(segment) : segment;
  });
}

class FileValidation {
  public readonly problems: Problem[] = [];
  public readonly references: FileReference[] = [];

  constructor(private readonly root: Node) { }

  /**
   * Range of a value for reporting: the value itself if it's a scalar, its
   * property name if it's an object or array (to not underline whole blocks).
   */
  private rangeOf(path: JSONPath, propertyName = false): { offset: number, length: number } {
    const node = findNodeAtLocation(this.root, path);
    if (node === undefined) {
      return path.length > 0 ? this.rangeOf(path.slice(0, -1)) : { offset: this.root.offset, length: 1 };
    }
    const key = node.parent?.type === 'property' ? node.parent.children?.[0] : undefined;
    if (key && (propertyName || node.type === 'object' || node.type === 'array')) {
      return { offset: key.offset, length: key.length };
    }
    if (node.type === 'object' || node.type === 'array') {
      return { offset: node.offset, length: 1 };
    }
    return { offset: node.offset, length: node.length };
  }

  public add(path: JSONPath, message: string, severity: 'error' | 'warning' = 'error', propertyName = false) {
    const offset = this.rangeOf(path, propertyName);
    if (this.problems.some(p => p.offset === offset.offset && p.message.endsWith(message))) {
      return;
    }
    this.problems.push({ message: `${formatPath(path)}: ${message}`, severity, ...offset });
  }

  public addReference(path: JSONPath, filePath: unknown) {
    if (typeof filePath === 'string' && filePath.trim().length > 0) {
      this.references.push({ path: filePath, ...this.rangeOf(path) });
    }
  }
}

export class AplenoValidator {
  private readonly validators: Record<AplenoFileKind, ValidateFunction>;

  constructor(schemas: Record<AplenoFileKind, object>) {
    const ajv = new Ajv({ allErrors: true, verbose: true, strict: false });
    this.validators = {
      ppro: ajv.compile(schemas.ppro),
      pseq: ajv.compile(schemas.pseq),
      pgui: ajv.compile(schemas.pgui)
    };
  }

  public validate(kind: AplenoFileKind, text: string): ValidationResult {
    // Empty files are opened as new files by the editors
    if (text.trim().length === 0) {
      return { problems: [], references: [] };
    }

    // JSON syntax, as strict as JSON.parse() used by the editors
    const parseErrors: ParseError[] = [];
    const root = parseTree(text, parseErrors, { disallowComments: true, allowTrailingComma: false });
    if (parseErrors.length > 0 || root === undefined) {
      // The first error is the meaningful one, the next ones are usually consequences
      return {
        problems: parseErrors.slice(0, 1).map(e => ({
          message: `Invalid JSON: ${printParseErrorCode(e.error)}. The file cannot be opened by the Apleno editor.`,
          severity: 'error',
          offset: e.offset,
          length: Math.max(e.length, 1)
        })),
        references: []
      };
    }

    const data = getNodeValue(root);
    const validation = new FileValidation(root);

    // Sequence format of the extension 1.0.x, unknown to the runtime: one clear error instead of many
    if (kind === 'pseq' && isObject(data) && '_version' in data) {
      validation.add(['_version'], 'this sequence uses the format of Apleno Designer 1.0.x, which the Apleno runtime cannot read. Rewrite it in the current format: steps with "uuid", "id", "type" ("rscript" for scripts), "file", "target", and "r"/"language"/"falsetarget" for conditions.', 'error', true);
      return { problems: validation.problems, references: [] };
    }
    const v4Key = ['version', 'widgets', 'displaySubmitButton'].find(key => isObject(data) && key in data);
    if (kind === 'pgui' && v4Key !== undefined) {
      validation.add([v4Key], 'this interface uses the format of Apleno Designer 1.0.x, which the Apleno runtime cannot read. Rewrite it in the current format: "language", "submitbutton" and "elements" at the top level; widgets with "id", "type", "data" (Apleno 3.x property names like "labeltext", "isr") and "elements" for children.', 'error', true);
      return { problems: validation.problems, references: [] };
    }

    // Schema
    const validate = this.validators[kind];
    if (!validate(data)) {
      for (const error of validate.errors ?? []) {
        this.addSchemaError(validation, kind, data, error);
      }
    }

    // Checks not expressible in the schema
    if (kind === 'pgui' && isObject(data) && Array.isArray(data.elements)) {
      this.checkInterface(validation, data.elements);
    }
    else if (kind === 'pseq' && isObject(data) && Array.isArray(data.steps)) {
      this.checkSequence(validation, data.steps);
    }
    else if (kind === 'ppro' && isObject(data)) {
      this.checkProject(validation, data);
    }

    return { problems: validation.problems, references: validation.references };
  }

  private addSchemaError(validation: FileValidation, kind: AplenoFileKind, data: unknown, error: ErrorObject) {
    const path = pointerToPath(error.instancePath);
    switch (error.keyword) {
      // The errors of the "then" branch are reported on their own
      case 'if':
        return;
      case 'additionalProperties': {
        const property: string = error.params.additionalProperty;
        const allowed = Object.keys(error.parentSchema?.properties ?? {});
        let context = '';
        if (kind === 'pgui' && path[path.length - 1] === 'data') {
          const widget = path.slice(0, -1).reduce((value: any, segment) => value?.[segment], data);
          context = typeof widget?.type === 'string' ? ` for a "${widget.type}" widget` : '';
        }
        validation.add([...path, property], `unknown property "${property}"${context}. Allowed properties: ${allowed.join(', ')}.`, 'error', true);
        return;
      }
      case 'required':
        validation.add(path, `missing required property "${error.params.missingProperty}".`);
        return;
      case 'enum':
        validation.add(path, `must be one of: ${(error.params.allowedValues as unknown[]).map(v => JSON.stringify(v)).join(', ')}.`);
        return;
      case 'const':
        validation.add(path, `must be ${JSON.stringify(error.params.allowedValue)}.`);
        return;
      case 'type':
        validation.add(path, `must be of type ${[error.params.type].flat().join(' or ')}.`);
        return;
      case 'pattern':
        validation.add(path, `must match the pattern ${error.params.pattern} (wrong file extension?).`);
        return;
      case 'contains':
        validation.add(path, kind === 'pseq' ? 'a sequence needs a step of type "start".' : (error.message ?? 'invalid value.'));
        return;
      case 'not':
        validation.add([...path, 'elements'], 'only container widgets (box, columns, tabs) can have child widgets.', 'error', true);
        return;
      default:
        validation.add(path, `${error.message ?? 'invalid value'}.`);
    }
  }

  private checkInterface(validation: FileValidation, elements: unknown[]) {
    const ids = new Set<string>();

    const walk = (list: unknown[], path: JSONPath) => list.forEach((widget, i) => {
      if (!isObject(widget)) {
        return;
      }
      const widgetPath = [...path, i];

      if (typeof widget.id === 'string' && widget.id.length > 0) {
        if (ids.has(widget.id)) {
          validation.add([...widgetPath, 'id'], `id "${widget.id}" is already used by another widget.`, 'warning');
        }
        ids.add(widget.id);
      }

      if ((widget.type === 'columns' || widget.type === 'tabs') && Array.isArray(widget.elements) && isObject(widget.data)) {
        const property = widget.type === 'columns' ? 'columnswidths' : 'tabsnames';
        const expected = widget.data[property];
        if (Array.isArray(expected) && expected.length !== widget.elements.length) {
          validation.add([...widgetPath, 'elements'], `a "${widget.type}" widget needs exactly one child "box" widget per entry of data.${property} (${expected.length}), found ${widget.elements.length}.`, 'error', true);
        }
      }

      if (Array.isArray(widget.elements)) {
        walk(widget.elements, [...widgetPath, 'elements']);
      }
    });
    walk(elements, ['elements']);
  }

  private checkSequence(validation: FileValidation, steps: unknown[]) {
    const uuids = new Set(steps.filter(isObject).map(s => s.uuid).filter(uuid => typeof uuid === 'number'));
    const seenUuids = new Set<number>();
    const ids = new Set<string>();
    let hasStart = false;

    steps.forEach((step, i) => {
      if (!isObject(step)) {
        return;
      }
      const stepPath: JSONPath = ['steps', i];

      if (typeof step.uuid === 'number') {
        if (seenUuids.has(step.uuid)) {
          validation.add([...stepPath, 'uuid'], `duplicate step uuid ${step.uuid}. Step uuids must be unique (next free uuid: ${Math.max(...uuids) + 1}).`);
        }
        seenUuids.add(step.uuid);
      }

      if (step.type === 'start') {
        if (hasStart) {
          validation.add([...stepPath, 'type'], 'a sequence must have exactly one "start" step.');
        }
        hasStart = true;
      }

      if (step.type !== 'start' && step.type !== 'end' && typeof step.id === 'string' && step.id.length > 0) {
        if (ids.has(step.id)) {
          validation.add([...stepPath, 'id'], `id "${step.id}" is already used by another step.`);
        }
        ids.add(step.id);
      }

      for (const key of ['target', 'falsetarget']) {
        const target = step[key];
        if (typeof target !== 'number') {
          continue;
        }
        if (target === step.uuid) {
          validation.add([...stepPath, key], `${key} points to the step itself.`);
        }
        else if (!uuids.has(target)) {
          validation.add([...stepPath, key], `${key} points to uuid ${target}, which does not exist.`);
        }
      }

      if (['rscript', 'script', 'gui', 'sequence'].includes(step.type)) {
        validation.addReference([...stepPath, 'file'], step.file);
      }
    });
  }

  private checkProject(validation: FileValidation, project: Record<string, any>) {
    validation.addReference(['sequenceStart'], project.sequenceStart);
    validation.addReference(['icon'], project.icon);
    validation.addReference(['sidebarLogo'], project.sidebarLogo);
    if (Array.isArray(project.customFiles)) {
      project.customFiles.forEach((file: unknown, i: number) => validation.addReference(['customFiles', i], file));
    }
  }
}
