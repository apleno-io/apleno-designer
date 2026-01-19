import { RPGMApp } from "./execution/instance";
import { LanguageChooser } from "./execution/language-chooser";
import { Logger } from "./utils/logger";

export const Services = {
  LanguageChooser: new LanguageChooser(),
  Logger: new Logger(),
  App: new RPGMApp()
};