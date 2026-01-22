import { RPGMApp } from "./execution/instance";
import { LanguageChooser } from "./execution/language-chooser";
import { ProjectCreator } from "./bootstrap/project-creator";
import { Logger } from "./utils/logger";

export const Services = {
  App: new RPGMApp(),
  LanguageChooser: new LanguageChooser(),
  Logger: new Logger(),
  ProjectCreator: new ProjectCreator()
};