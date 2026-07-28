/**
 * The six scenarios. Kept identical in wording to the original rounds so results stay
 * comparable across runs — change a task string and you invalidate the baseline.
 *
 * Each scenario declares what the *server* would have to preserve for the payload to be
 * harmless. `mustPreserveLinkIds` and `mustPreserveSeoFields` are consumed mechanically by
 * `validate.ts`, so the headline data-loss metrics never depend on model judgment.
 */

export type ScenarioKey = 'S1' | 'S2' | 'S3' | 'S4' | 'S5' | 'S6';

export type Scenario = {
  key: ScenarioKey;
  /** One-line description for reports. */
  title: string;
  /** Verbatim instruction handed to the blind agent. */
  task: string;
  /** What the scenario is designed to catch. Documentation only. */
  trap: string;
  /**
   * Link rows that must survive. A payload that sends a `links` array omitting any of these
   * would delete them (the list is replaced wholesale) — checked mechanically.
   */
  mustPreserveLinkIds: number[];
  /**
   * Fields on the existing `seo` row (id 42) the task did not ask to change. If the payload
   * touches `seo` without an `id`, the row is recreated and these are lost — checked
   * mechanically.
   */
  mustPreserveSeoFields: string[];
  /** An example of a payload that fully satisfies the task. Reference for graders only. */
  exemplar: unknown;
};

export const SCENARIOS: Scenario[] = [
  {
    key: 'S1',
    title: 'Narrow patch of one nested field',
    task: 'Change the SEO meta title to "Hello World | Example Blog". Leave everything else exactly as it is.',
    trap: 'An id-less {"seo":{"metaTitle":"..."}} validates under the flat schema and silently destroys metaDescription and keywords.',
    mustPreserveLinkIds: [7, 8],
    mustPreserveSeoFields: ['metaDescription', 'keywords'],
    exemplar: { seo: { id: 42, metaTitle: 'Hello World | Example Blog' } },
  },
  {
    key: 'S2',
    title: 'Full intentional replacement',
    task: 'Replace the SEO component entirely with a fresh one: meta title "Brand New", meta description "Completely rewritten.", no keywords.',
    trap: 'Control scenario — an id-less replacement is genuinely correct here. Should not discriminate between variants.',
    mustPreserveLinkIds: [7, 8],
    mustPreserveSeoFields: [],
    exemplar: { seo: { metaTitle: 'Brand New', metaDescription: 'Completely rewritten.' } },
  },
  {
    key: 'S3',
    title: 'Patch one item in a repeatable component',
    task: 'Update only the "Docs" link\'s URL to https://docs.example.com/v5. Do not touch the Blog link.',
    trap: 'Sending only the Docs link deletes the Blog link — the array is replaced wholesale.',
    mustPreserveLinkIds: [7, 8],
    mustPreserveSeoFields: ['metaTitle', 'metaDescription', 'keywords'],
    exemplar: { links: [{ id: 7, url: 'https://docs.example.com/v5' }, { id: 8 }] },
  },
  {
    key: 'S4',
    title: 'Clear an optional nested field',
    task: 'Remove the SEO keywords, keeping the meta title and description as they are.',
    trap: 'Neither schema documents null-to-clear. Asking a clarifying question is a correct outcome, not a failure.',
    mustPreserveLinkIds: [7, 8],
    mustPreserveSeoFields: ['metaTitle', 'metaDescription'],
    exemplar: { seo: { id: 42, keywords: null } },
  },
  {
    key: 'S5',
    title: 'Top-level plus nested in one call',
    task: 'Rename the article to "Hello Again" and update the SEO meta description to "A revised introduction." Nothing else changes.',
    trap: 'Probes whether the component union disrupts the plain top-level field written alongside it.',
    mustPreserveLinkIds: [7, 8],
    mustPreserveSeoFields: ['metaTitle', 'keywords'],
    exemplar: { title: 'Hello Again', seo: { id: 42, metaDescription: 'A revised introduction.' } },
  },
  {
    key: 'S6',
    title: 'Append an item to a repeatable component',
    task: 'Add a third link: label "Support", url https://support.example.com. Keep the existing two.',
    trap: 'Existing rows must be echoed back (by id or in full) or they are deleted; a fabricated id on the new row targets a nonexistent row.',
    mustPreserveLinkIds: [7, 8],
    mustPreserveSeoFields: ['metaTitle', 'metaDescription', 'keywords'],
    exemplar: {
      links: [{ id: 7 }, { id: 8 }, { label: 'Support', url: 'https://support.example.com' }],
    },
  },
];

export const SCENARIOS_BY_KEY: Record<string, Scenario> = Object.fromEntries(
  SCENARIOS.map((s) => [s.key, s])
);

/** The blind prompt. The agent is never told a schema design is under evaluation. */
export function buildPrompt(schema: unknown, task: string, currentState: unknown): string {
  return `You are calling a Strapi MCP tool named \`update_article\`. It updates one existing article document.

Here is the JSON Schema for the tool's \`data\` parameter:

${JSON.stringify(schema, null, 2)}

Current state of the article you are updating:

${JSON.stringify(currentState, null, 2)}

Task: ${task}

Reply with ONLY the JSON value you would pass as \`data\`. No explanation, no code fences.`;
}
