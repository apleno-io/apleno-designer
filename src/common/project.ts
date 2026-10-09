export interface ProjectFileChangelog {
  date: string;
  author: string;
  version: string;
  message: string;
}

export interface ProjectFile {
  name: string;
  company: string;
  description: string;
  changelog: ProjectFileChangelog[];
  icon: string;
  sequenceStart: string;
  defaultWorkingDirectory: 'app' | 'output';
  outputFolderName: string;
  sidebarLogo: string;
  customCSSLightCode: string;
  customCSSDarkCode: string;
  customCSSLightFile: string;
  customCSSDarkFile: string;
  customFiles: string[];
  stepListType: 'hidden' | 'shown';
  consoleAccess: 'enabled' | 'disabled';
  dateCreated: number;
}

const CHANGELOG_KEYS = new Set(['date', 'author', 'version', 'message']);
function checkChangelogEntry(entry: unknown): entry is ProjectFileChangelog {
  if (typeof entry !== 'object' || entry === null) {
    return false;
  }
  const e = entry as Record<string, unknown>;
  return Object.keys(e).every(k => CHANGELOG_KEYS.has(k) && typeof e[k] === 'string');
}

export class ProjectFileUtils {
  public static sanitize(manifest: any): ProjectFile {
    const result: ProjectFile = {
      changelog: [],
      company: '',
      consoleAccess: 'disabled',
      customCSSDarkCode: '',
      customCSSDarkFile: '',
      customCSSLightCode: '',
      customCSSLightFile: '',
      customFiles: [],
      dateCreated: Date.now(),
      defaultWorkingDirectory: 'app',
      description: '',
      icon: '',
      name: '',
      outputFolderName: '{{name}}_{{datetime}}',
      sequenceStart: 'main.pseq',
      sidebarLogo: '',
      stepListType: 'hidden'
    };

    // Is an object
    if (typeof manifest !== 'object' || manifest === null) {
      return result;
    }

    // Apleno 2.x compatibility
    if (manifest.settings) {
      result.sidebarLogo = manifest.settings.topLogo || '';
      result.stepListType = !('listType' in manifest.settings) || manifest.settings.listType === 'sidebar' ? 'shown' : 'hidden';
      result.defaultWorkingDirectory = 'output';
    }

    // Apleno 3.x compatibility
    if (manifest.start) {
      result.consoleAccess = ['r', 'enabled'].includes(manifest.rconsole) ? 'enabled' : 'disabled';
      result.customCSSDarkCode = manifest.css || '';
      result.customCSSLightCode = manifest.css || '';
      const created = typeof manifest.created === 'string' ? Date.parse(manifest.created) : manifest.created;
      result.dateCreated = typeof created === 'number' && !isNaN(created) ? created : Date.now();
      result.defaultWorkingDirectory = ['app', 'program'].includes(manifest.wd) ? 'app' : 'output';
      result.outputFolderName = manifest.outputfolder || '';
      result.sequenceStart = manifest.start || '';
      result.sidebarLogo = manifest.logo || '';
      result.stepListType = !('list' in manifest) || ['shown', 'sidebar'].includes(manifest.list) ? 'shown' : 'hidden';
    }

    // history => changelog (Apleno 3.x entries have a 'changelog' key instead of 'message')
    if (Array.isArray(manifest.history)) {
      result.changelog = manifest.history.map((entry: any) => {
        if (typeof entry !== 'object' || entry === null || !('changelog' in entry)) {
          return entry;
        }
        const { changelog, ...rest } = entry;
        return 'message' in rest ? rest : { ...rest, message: changelog };
      });
    }

    // All keys
    for (const key of Object.keys(manifest)) {
      if (key in result) {
        (result as any)[key] = manifest[key];
      }
    }

    // Final sanitization
    result.name = typeof result.name === 'string' ? result.name : '';
    result.company = typeof result.company === 'string' ? result.company : '';
    result.description = typeof result.description === 'string' ? result.description : '';
    result.sequenceStart = typeof result.sequenceStart === 'string' ? result.sequenceStart : 'main.pseq';
    result.defaultWorkingDirectory = ['app', 'output'].includes(result.defaultWorkingDirectory) ? result.defaultWorkingDirectory : 'app';
    result.outputFolderName = typeof result.outputFolderName === 'string' ? result.outputFolderName : '{{name}}_{{datetime}}';
    result.customFiles = Array.isArray(result.customFiles) ? result.customFiles : [];
    result.customFiles = result.customFiles.filter((file: any) => typeof file === 'string');
    result.consoleAccess = ['enabled', 'disabled'].includes(result.consoleAccess) ? result.consoleAccess : 'disabled';
    result.icon = typeof result.icon === 'string' ? result.icon : '';
    result.sidebarLogo = typeof result.sidebarLogo === 'string' ? result.sidebarLogo : '';
    result.stepListType = ['hidden', 'shown'].includes(result.stepListType) ? result.stepListType : 'hidden';
    result.dateCreated = typeof result.dateCreated === 'number' ? result.dateCreated : Date.now();
    // CSS
    result.customCSSLightCode = typeof result.customCSSLightCode === 'string' ? result.customCSSLightCode : '';
    result.customCSSDarkCode = typeof result.customCSSDarkCode === 'string' ? result.customCSSDarkCode : '';
    result.customCSSDarkFile = typeof result.customCSSDarkFile === 'string' ? result.customCSSDarkFile : '';
    result.customCSSLightFile = typeof result.customCSSLightFile === 'string' ? result.customCSSLightFile : '';
    // Changelog
    result.changelog = Array.isArray(result.changelog) ? result.changelog : [];
    result.changelog = result.changelog.filter(checkChangelogEntry);

    return result;
  }
}