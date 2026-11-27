import type { Core } from '@strapi/types';

import {
  getReadParams,
  getTrackedFields,
  getTrackedValues,
  type GetComponent,
  type Schema,
} from '../domain/fields';

import type { Target } from './provenance';

type Entry = Record<string, any>;

/**
 * Reads tracked values through the Document Service, in the shape their hashes are computed
 * from. Every read that feeds a hash goes through here, so hashes stay comparable.
 */
export const createValuesService = ({ strapi }: { strapi: Core.Strapi }) => {
  const getComponent: GetComponent = (uid) => strapi.components[uid as never] as Schema | undefined;
  const getSchema = (uid: string) => strapi.contentTypes[uid as never] as unknown as Schema;
  const getTracked = (uid: string) => getTrackedFields(getSchema(uid));

  return {
    getTracked,

    /**
     * Tracked values of one version of an entry, or `null` when it does not exist.
     * `extra` adds fields and populate that are returned as is, for instance the locale.
     */
    async read(
      target: Target,
      {
        fields = getTracked(target.uid),
        extra = {},
      }: { fields?: string[]; extra?: { fields?: string[]; populate?: Entry } } = {}
    ): Promise<Entry | null> {
      const schema = getSchema(target.uid);
      const params = getReadParams(schema, fields, getComponent);

      const entry = (await strapi.documents(target.uid as any).findOne({
        documentId: target.documentId,
        locale: target.locale ?? undefined,
        status: target.status,
        fields: [...params.fields, ...(extra.fields ?? [])],
        populate: { ...params.populate, ...extra.populate },
      } as any)) as Entry | null;

      if (!entry) {
        return null;
      }

      return { ...entry, ...getTrackedValues(schema, entry, fields, getComponent) };
    },

    /**
     * Tracked values of several entries in one locale and status, by documentId, with the
     * locale they are stored under (`locale: null` reads the default locale).
     */
    async readMany({
      uid,
      documentIds,
      locale,
      status,
    }: Omit<Target, 'documentId'> & { documentIds: string[] }) {
      const schema = getSchema(uid);
      const fields = getTracked(uid);
      const params = getReadParams(schema, fields, getComponent);
      const localized = 'locale' in schema.attributes;

      const entries = (await strapi.documents(uid as any).findMany({
        filters: { documentId: { $in: documentIds } },
        locale: locale ?? undefined,
        status,
        fields: [...params.fields, ...(localized ? ['locale'] : [])],
        populate: params.populate,
      } as any)) as Entry[];

      return new Map<string, { locale: string | null; values: Entry }>(
        entries.map((entry) => [
          entry.documentId,
          {
            locale: (entry.locale as string | undefined) ?? null,
            values: getTrackedValues(schema, entry, fields, getComponent),
          },
        ])
      );
    },
  };
};

export type ValuesService = ReturnType<typeof createValuesService>;
