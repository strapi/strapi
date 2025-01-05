import { GridDirection } from "./types";

/**
 * Global plugin settings, not used at the moment
 */
export interface Settings {
  alwaysShowFieldTypeInList: boolean;
}

/**
 * User settings, stored in localStorage, contains configurations per content type
 */
export interface LocalSettings {
  configs: Record<string, LocalConfig>;
}

/**
 * User settings, stored in localStorage for specific content type
 */
export interface LocalConfig {
  chosenMediaField: string;
  chosenTitleField: string;
  chosenSubtitleField: string;
  rowHeight2d: number;
  rowHeightMultilineRem: number;
  multilineUnsortedColumns: number;
  multilineShowUnsortedOnTop: boolean;
}

/**
 * Order content field configuration
 */
export interface OrderFieldConfiguration {
  groupField: string;
  columnsNumber: number;
  order2dDirection: GridDirection;
}