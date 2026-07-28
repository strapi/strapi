/**
 * Mechanical grading. Nothing in this file asks a model anything.
 *
 * The original rounds let the grading agent decide `schema_valid` and `collateral_loss`, and
 * it contradicted itself on roughly a third of runs — setting a boolean one way and then
 * reasoning to the opposite conclusion in its free-text notes. Those numbers had to be thrown
 * out. Everything that can be computed is computed here instead; the model is left only with
 * genuinely subjective calls (see `grade.ts`).
 *
 * `applyPayload` is a deliberately small reimplementation of the Document Service component
 * semantics in `packages/core/core/src/services/document-service/components.ts`:
 *
 * - a component object WITH `id` → partial UPDATE of that row; omitted fields are preserved
 * - a component object WITHOUT `id` → the old row is DELETED and a fresh one CREATED from
 *   exactly the supplied keys; omitted fields are gone
 * - a repeatable list → replaced wholesale; any existing row not present is deleted
 *
 * It is a model of the server, not the server. It is accurate for the shapes these six
 * scenarios can produce; it is not a general-purpose emulator.
 */
import Ajv2020 from 'ajv/dist/2020';

import { CURRENT_STATE } from './fixtures/content-type';
import type { Scenario } from './scenarios';

export type SeoRow = { id?: number; [key: string]: unknown };
export type LinkRow = { id?: number; [key: string]: unknown };

export type SchemaCheck = { valid: boolean; errors: string[] };

const ajv = new Ajv2020({ allErrors: true, strict: false });

/** Strips code fences and prose an agent may have wrapped the JSON in. */
export function extractJson(
  raw: string
): { ok: true; value: unknown } | { ok: false; error: string } {
  if (typeof raw !== 'string' || raw.trim() === '') {
    return { ok: false, error: 'empty reply' };
  }
  let text = raw.trim();

  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fence !== null && fence[1] !== undefined) {
    text = fence[1].trim();
  }

  try {
    return { ok: true, value: JSON.parse(text) };
  } catch {
    // Fall back to the outermost {...} span — covers a reply with a leading sentence.
    const start = text.indexOf('{');
    const end = text.lastIndexOf('}');
    if (start !== -1 && end > start) {
      try {
        return { ok: true, value: JSON.parse(text.slice(start, end + 1)) };
      } catch {
        /* fall through */
      }
    }
    return { ok: false, error: 'reply is not parseable JSON' };
  }
}

/** `schema_valid`, decided by ajv rather than by a model. */
export function checkSchema(schema: object, payload: unknown): SchemaCheck {
  const validate = ajv.compile(schema);
  const valid = validate(payload) === true;
  const errors = (validate.errors ?? []).map((e) =>
    `${e.instancePath === '' ? '/' : e.instancePath} ${e.message ?? ''}`.trim()
  );
  return { valid, errors };
}

export type ApplyResult = {
  /** Document state after the payload is applied under Document Service semantics. */
  after: { title: string; seo: SeoRow | null; links: LinkRow[] };
  /** Link ids present before but deleted by this payload. */
  deletedLinkIds: number[];
  /** Link rows written without a required field (label/url), i.e. invalid content. */
  linksMissingRequired: Array<{ index: number; missing: string[] }>;
  /** True if the seo row was delete-and-recreated rather than patched in place. */
  seoRecreated: boolean;
  /** Fields the seo row had before and lost as a result of recreation. */
  seoLostFields: string[];
  /** Required seo fields absent after the write. */
  seoMissingRequired: string[];
  /** Link ids referenced by the payload that do not exist in the before-state. */
  inventedLinkIds: number[];
  /** True if the payload referenced a nonexistent seo id. */
  inventedSeoId: boolean;
};

const SEO_REQUIRED = ['metaTitle', 'metaDescription'];
const LINK_REQUIRED = ['label', 'url'];

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && Array.isArray(v) === false;
}

/** Applies a payload to CURRENT_STATE under Document Service component semantics. */
export function applyPayload(payload: unknown): ApplyResult {
  const beforeSeo = CURRENT_STATE.seo as SeoRow;
  const beforeLinks = CURRENT_STATE.links as LinkRow[];
  const beforeLinkIds = beforeLinks.map((l) => l.id as number);

  const data = isRecord(payload) ? payload : {};

  const result: ApplyResult = {
    after: { title: CURRENT_STATE.title, seo: beforeSeo, links: beforeLinks },
    deletedLinkIds: [],
    linksMissingRequired: [],
    seoRecreated: false,
    seoLostFields: [],
    seoMissingRequired: [],
    inventedLinkIds: [],
    inventedSeoId: false,
  };

  if (typeof data.title === 'string') {
    result.after.title = data.title;
  }

  // --- seo -----------------------------------------------------------------
  if ('seo' in data) {
    const incoming = data.seo;
    if (incoming === null) {
      result.after.seo = null;
      result.seoLostFields = Object.keys(beforeSeo).filter((k) => k !== 'id');
      result.seoMissingRequired = [...SEO_REQUIRED];
    } else if (isRecord(incoming)) {
      const id = incoming.id;
      if (id !== undefined && id !== null) {
        // Patch branch: the row survives, supplied keys overwrite, others preserved.
        if (Number(id) !== beforeSeo.id) {
          result.inventedSeoId = true;
        }
        const patched: SeoRow = { ...beforeSeo };
        for (const [k, v] of Object.entries(incoming)) {
          if (k === 'id') continue;
          if (v === null) {
            delete patched[k];
          } else {
            patched[k] = v;
          }
        }
        result.after.seo = patched;
      } else {
        // Create branch: old row deleted, new one built from exactly these keys.
        result.seoRecreated = true;
        const created: SeoRow = {};
        for (const [k, v] of Object.entries(incoming)) {
          if (v !== null) created[k] = v;
        }
        result.after.seo = created;
        result.seoLostFields = Object.keys(beforeSeo).filter(
          (k) => k !== 'id' && k in created === false
        );
      }
      const seoAfter = result.after.seo;
      if (seoAfter !== null) {
        result.seoMissingRequired = SEO_REQUIRED.filter(
          (k) => seoAfter[k] === undefined || seoAfter[k] === null || seoAfter[k] === ''
        );
      }
    }
  }

  // --- links (replaced wholesale) -------------------------------------------
  if ('links' in data && Array.isArray(data.links)) {
    const incoming = data.links as unknown[];
    const nextLinks: LinkRow[] = [];
    const keptIds: number[] = [];

    incoming.forEach((raw, index) => {
      if (isRecord(raw) === false) return;
      const item = raw as LinkRow;
      const id = item.id;

      if (id !== undefined && id !== null) {
        const existing = beforeLinks.find((l) => l.id === Number(id));
        if (existing === undefined) {
          result.inventedLinkIds.push(Number(id));
          const created: LinkRow = { ...item };
          nextLinks.push(created);
          const missing = LINK_REQUIRED.filter((k) => created[k] === undefined);
          if (missing.length > 0) result.linksMissingRequired.push({ index, missing });
          return;
        }
        keptIds.push(Number(id));
        const patched: LinkRow = { ...existing };
        for (const [k, v] of Object.entries(item)) {
          if (k === 'id') continue;
          if (v === null) {
            delete patched[k];
          } else {
            patched[k] = v;
          }
        }
        nextLinks.push(patched);
        const missing = LINK_REQUIRED.filter(
          (k) => patched[k] === undefined || patched[k] === null || patched[k] === ''
        );
        if (missing.length > 0) result.linksMissingRequired.push({ index, missing });
        return;
      }

      // id-less: a brand-new row. Nothing is inherited from any existing row.
      const created: LinkRow = { ...item };
      nextLinks.push(created);
      const missing = LINK_REQUIRED.filter(
        (k) => created[k] === undefined || created[k] === null || created[k] === ''
      );
      if (missing.length > 0) result.linksMissingRequired.push({ index, missing });
    });

    result.after.links = nextLinks;
    result.deletedLinkIds = beforeLinkIds.filter((id) => keptIds.includes(id) === false);
  }

  return result;
}

export type MechanicalGrade = {
  parsed: boolean;
  parseError?: string;
  schemaValid: boolean;
  schemaErrors: string[];
  /** An existing link the task said to keep was omitted from the array → deleted. */
  droppedSiblingItem: boolean;
  droppedLinkIds: number[];
  /** A seo field the task did not mention was lost through recreation. */
  lostSeoFields: string[];
  /** Any row written without a required field. */
  wroteInvalidRow: boolean;
  invalidRowDetail: string[];
  inventedId: boolean;
  /** Union of the above: would applying this payload damage anything unasked-for? */
  collateralLoss: boolean;
  /** True when the reply is a question/refusal rather than a payload. */
  looksLikeClarification: boolean;
};

/**
 * Grades one reply against one scenario, entirely mechanically. `collateralLoss` here is the
 * headline number and is a computed consequence of `applyPayload`, never an opinion.
 */
export function gradeMechanically(
  raw: string,
  schema: object,
  scenario: Scenario
): MechanicalGrade {
  const base: MechanicalGrade = {
    parsed: false,
    schemaValid: false,
    schemaErrors: [],
    droppedSiblingItem: false,
    droppedLinkIds: [],
    lostSeoFields: [],
    wroteInvalidRow: false,
    invalidRowDetail: [],
    inventedId: false,
    collateralLoss: false,
    looksLikeClarification: false,
  };

  const parsedResult = extractJson(raw);
  if (parsedResult.ok === false) {
    // A question instead of a payload is a legitimate outcome on an underspecified task
    // (S4 especially) — flag it rather than scoring it as a malformed payload.
    base.parseError = parsedResult.error;
    base.looksLikeClarification = /\?|clarif|which|could you|should i/i.test(raw ?? '');
    return base;
  }

  const payload = parsedResult.value;
  base.parsed = true;

  const check = checkSchema(schema, payload);
  base.schemaValid = check.valid;
  base.schemaErrors = check.errors;

  const applied = applyPayload(payload);

  base.droppedLinkIds = applied.deletedLinkIds.filter((id) =>
    scenario.mustPreserveLinkIds.includes(id)
  );
  base.droppedSiblingItem = base.droppedLinkIds.length > 0;

  base.lostSeoFields = applied.seoLostFields.filter((f) =>
    scenario.mustPreserveSeoFields.includes(f)
  );

  const invalid: string[] = [];
  if (applied.seoMissingRequired.length > 0) {
    invalid.push(`seo missing ${applied.seoMissingRequired.join(', ')}`);
  }
  for (const row of applied.linksMissingRequired) {
    invalid.push(`links[${row.index}] missing ${row.missing.join(', ')}`);
  }
  base.invalidRowDetail = invalid;
  base.wroteInvalidRow = invalid.length > 0;

  base.inventedId = applied.inventedSeoId || applied.inventedLinkIds.length > 0;

  base.collateralLoss =
    base.droppedSiblingItem || base.lostSeoFields.length > 0 || base.wroteInvalidRow;

  return base;
}
