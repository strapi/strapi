import { pluginId } from '../pluginId';

const getTranslation = (id: string) => `${pluginId}.${id}`;

export { getTranslation };
