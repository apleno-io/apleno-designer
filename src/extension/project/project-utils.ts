/**
 * This module normalizes a project file content while
 * also converting from RPGM2 / RPGM3 format if necessary.
 * It always returns a correct project object.
 */
import { ProjectFile, ProjectFileChangelog } from '../../common/project';

function checkChangelogEntry(entry: any): entry is ProjectFileChangelog {
  return typeof entry === 'object' &&
    entry !== null &&
    Object.keys(entry).length === 4 &&
    typeof entry.date === 'string' &&
    typeof entry.author === 'string' &&
    typeof entry.version === 'string' &&
    typeof entry.message === 'string';
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

    // RPGM2 compatibility
    if (manifest.settings) {
      result.sidebarLogo = manifest.settings.topLogo || '';
      result.stepListType = !('listType' in manifest.settings) || manifest.settings.listType === 'sidebar' ? 'shown' : 'hidden';
      result.defaultWorkingDirectory = 'output';
    }

    // RPGM3 compatibility
    if (manifest.start) {
      result.consoleAccess = ['r', 'enabled'].includes(manifest.rconsole) ? 'enabled' : 'disabled';
      result.customCSSDarkCode = manifest.css || '';
      result.customCSSLightCode = manifest.css || '';
      result.dateCreated = manifest.created || Date.now();
      result.defaultWorkingDirectory = ['app', 'program'].includes(manifest.wd) ? 'app' : 'output';
      result.outputFolderName = manifest.outputfolder || '';
      result.sequenceStart = manifest.start || '';
      result.sidebarLogo = manifest.logo || '';
      result.stepListType = !('list' in manifest) || ['shown', 'sidebar'].includes(manifest.list) ? 'shown' : 'hidden';
    }

    // history => changelog
    if (manifest.history) {
      result.changelog = manifest.history;
    }

    // All keys
    for (let key in manifest) {
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

    return result as ProjectFile;
  }
}