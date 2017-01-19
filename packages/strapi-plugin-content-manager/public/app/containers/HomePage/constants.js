/*
 * Constants
 * Each action has a corresponding type, which the reducer knows and picks up on.
 * To avoid weird typos between the reducer and the actions, we save them as
 * constants here. We prefix them with 'yourplugin/YourComponent' so we avoid
 * reducers accidentally picking up actions they shouldn't.
 *
 * Follow this format:
 * export const YOUR_ACTION_CONSTANT = 'your-plugin/YourContainer/YOUR_ACTION_CONSTANT';
 */

export const LOAD_SUCCESS = 'contentManager/HomePage/LOAD_SUCCESS';
export const LOAD = 'contentManager/HomePage/LOAD';
