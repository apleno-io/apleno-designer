import { RPGMApp } from "./execution/instance";
import { Logger } from "./utils/logger";

export const Services = {
  Logger: new Logger(),
  App: new RPGMApp()
};