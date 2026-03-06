import { LanguageChooser } from "./execution/language-chooser";
import { ProjectCreator } from "./bootstrap/project-creator";
import { Logger } from "./utils/logger";

export const Services = {
  LanguageChooser: new LanguageChooser(),
  Logger: new Logger(),
  ProjectCreator: new ProjectCreator()
};