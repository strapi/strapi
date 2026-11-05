import { pluginId } from '../pluginId';

/** Prefixes a translation key with the users-permissions plugin identifier. */
const getTrad = (id: string) => `${pluginId}.${id}`;

export { getTrad };
