/*
 * AppConstants
 * Each action has a corresponding type, which the reducer knows and picks up on.
 * To avoid weird typos between the reducer and the actions, we save them as
 * constants here. We prefix them with 'yourplugin/YourComponent' so we avoid
 * reducers accidentally picking up actions they shouldn't.
 *
 * Follow this format:
 * export const YOUR_ACTION_CONSTANT = 'yourplugin/YourContainer/YOUR_ACTION_CONSTANT';
 */

export const LOAD_GENERAL_SETTINGS = 'settingsmanager/HomePage/LOAD_GENERAL_SETTINGS';
export const LOAD_GENERAL_SETTINGS_SUCCESS = 'settingsmanager/HomePage/LOAD_GENERAL_SETTINGS_SUCCESS';
export const LOAD_GENERAL_SETTINGS_ERROR = 'settingsmanager/HomePage/LOAD_GENERAL_SETTINGS_ERROR';
export const CHANGE_NAME = 'settingsmanager/HomePage/CHANGE_NAME';
export const CHANGE_DESCRIPTION = 'settingsmanager/HomePage/CHANGE_DESCRIPTION';
export const CHANGE_VERSION = 'settingsmanager/HomePage/CHANGE_VERSION';
export const UPDATE_GENERAL_SETTINGS = 'settingsmanager/HomePage/UPDATE_GENERAL_SETTINGS';
export const UPDATE_GENERAL_SETTINGS_SUCCESS = 'settingsmanager/HomePage/UPDATE_GENERAL_SETTINGS_SUCCESS';
export const UPDATE_GENERAL_SETTINGS_ERROR = 'settingsmanager/HomePage/UPDATE_GENERAL_SETTINGS_ERROR';
export const CANCEL_GENERAL_SETTINGS = 'settingsmanager/HomePage/CANCEL_GENERAL_SETTINGS';

