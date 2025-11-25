import type { Core, Data, UID } from '@strapi/types';
import { async as asyncMap } from '@strapi/utils';

declare const strapi: Core.Strapi;

const hasDraftAndPublish = (uid: UID.Schema) => {
  const model = strapi.getModel(uid);
  return contentTypes.hasDraftAndPublish(model);
};

const encodeKey = (obj: Record<string, any>) => {
  if (!hasDraftAndPublish(obj.uid)) {
    delete obj.status;
  }
  const keys = Object.keys(obj).sort((a, b) => a.localeCompare(b));
  return keys.map((k) => `${k}:::${obj[k]}`).join('&&');
};

interface KeyFields {
  uid: string;
  documentId: Data.ID;
  locale?: string | null;
  status?: 'draft' | 'published';
}

export interface IdMap {
  add(fields: KeyFields): void;
  load(): Promise<void>;
  get(fields: KeyFields): string | undefined;
  clear(): void;
}

const getEffectiveLocale = (input: string | null | undefined, uid: UID.Schema): string | undefined => {
  if (input) return input;
  const model = strapi.getModel(uid);
  const isLocalized = !!model?.pluginOptions?.i18n?.localized;
  return isLocalized ? 'en' : undefined;
};

const createIdMap = (): IdMap => {
  const loaded = new Map<string, string>();
  const toLoad = new Map<string, KeyFields>();

  return {
    add(fields: KeyFields) {
      const locale = getEffectiveLocale(fields.locale ?? null, fields.uid as UID.Schema);
      const key = encodeKey({
        uid: fields.uid,
        documentId: fields.documentId,
        locale: locale ?? null,
        status: fields.status ?? 'published',
      });

      if (loaded.has(key) || toLoad.has(key)) return;
      toLoad.set(key, { ...fields, locale });
    },

    async load() {
      const entries = Array.from(toLoad.entries());
      const grouped: Record<string, any> = {};

      for (const [key, fields] of entries) {
        const groupKey = encodeKey({
          uid: fields.uid,
          locale: fields.locale ?? null,
          status: fields.status ?? 'published',
        });
        if (!grouped[groupKey]) {
          grouped[groupKey] = { ...fields, documentIds: [] };
        }
        grouped[groupKey].documentIds.push(fields.documentId);
      }

      await asyncMap(Object.values(grouped), async (group: any) => {
        const locale = getEffectiveLocale(group.locale ?? null, group.uid);
        const where: any = { documentId: { $in: group.documentIds } };
        if (locale !== undefined) where.locale = locale;
        if (hasDraftAndPublish(group.uid)) {
          where.publishedAt = group.status === 'draft' ? null : { $ne: null };
        }

        const results = await strapi.db.query(group.uid).findMany({
          select: ['id', 'documentId', 'locale', 'publishedAt'],
          where,
        });

        for (const r of results) {
          const key = encodeKey({
            uid: group.uid,
            documentId: r.documentId,
            locale: r.locale ?? locale,
            status: r.publishedAt ? 'published' : 'draft',
          });
          loaded.set(key, r.id);
        }
      });

      toLoad.clear();
    },

    get(fields: KeyFields) {
      const locale = getEffectiveLocale(fields.locale ?? null, fields.uid as UID.Schema);
      const key = encodeKey({
        uid: fields.uid,
        documentId: fields.documentId,
        locale: locale ?? null,
        status: fields.status ?? 'published',
      });
      return loaded.get(key);
    },

    clear() {
      loaded.clear();
      toLoad.clear();
    },
  };
};

export { createIdMap };