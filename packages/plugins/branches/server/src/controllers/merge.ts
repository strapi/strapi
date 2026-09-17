import type { Core } from '@strapi/types';
import { errors } from '@strapi/utils';

import { getService } from '../utils';

import type { MergeResolutions } from '../services/merge';

const { NotFoundError, ValidationError } = errors;

const isChoice = (value: unknown): value is 'branch' | 'parent' =>
  value === 'branch' || value === 'parent';

const parseResolutions = (raw: unknown): MergeResolutions => {
  if (raw === undefined || raw === null) {
    return {};
  }
  if (typeof raw !== 'object' || Array.isArray(raw)) {
    throw new ValidationError('`resolutions` must be an object');
  }
  const out: MergeResolutions = {};
  for (const [uid, byDocument] of Object.entries(raw as Record<string, unknown>)) {
    if (!byDocument || typeof byDocument !== 'object') {
      continue;
    }
    out[uid] = {};
    for (const [documentId, byLocale] of Object.entries(byDocument as Record<string, unknown>)) {
      if (!byLocale || typeof byLocale !== 'object') {
        continue;
      }
      out[uid][documentId] = {};
      for (const [locale, byAttribute] of Object.entries(byLocale as Record<string, unknown>)) {
        if (!byAttribute || typeof byAttribute !== 'object') {
          continue;
        }
        out[uid][documentId][locale] = {};
        for (const [attribute, choice] of Object.entries(byAttribute as Record<string, unknown>)) {
          if (!isChoice(choice)) {
            throw new ValidationError(
              `Resolution for ${uid}/${documentId}/${attribute} must be "branch" or "parent"`
            );
          }
          out[uid][documentId][locale][attribute] = choice;
        }
      }
    }
  }
  return out;
};

const merge = ({ strapi }: { strapi: Core.Strapi }) => ({
  /** POST /branches/:id/merge — body `{ resolutions? }`. */
  async merge(ctx: any) {
    const id = Number(ctx.params?.id);
    if (!Number.isInteger(id)) {
      throw new ValidationError('Invalid branch id');
    }
    const branch = await getService('branches').getById(id);
    if (!branch) {
      throw new NotFoundError(`Unknown branch: ${id}`);
    }
    const resolutions = parseResolutions((ctx.request?.body ?? {}).resolutions);
    const summary = await getService('merge').merge(branch, resolutions);
    strapi.telemetry.send('didMergeContentBranch');
    ctx.body = summary;
  },
});

export default merge;
