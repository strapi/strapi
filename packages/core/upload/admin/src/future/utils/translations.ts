import { pluginId } from '../../pluginId';

export const getTranslationKey = (id: string) => `${pluginId}.${id}`;
