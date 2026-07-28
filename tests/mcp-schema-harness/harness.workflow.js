/**
 * MCP component-schema ergonomics harness.
 *
 * Runs blind sub-agents against the generated schemas, then grades every reply mechanically
 * (ajv + a model of the Document Service) before a model ever sees it. The model is asked only
 * for judgment calls it is actually qualified to make.
 *
 * Run it:
 *   Workflow({ scriptPath: 'tests/mcp-schema-harness/harness.workflow.js' })
 *   Workflow({ scriptPath: '...', args: { variants: ['current'], scenarios: ['S3','S6'], reps: 3 } })
 *
 * args (all optional):
 *   variants  — subset of ['current','flat','proposed']   (default: ['current','flat'])
 *   scenarios — subset of ['S1'…'S6']                     (default: all six)
 *   reps      — repetitions per variant × scenario        (default: 3)
 *   model     — model tier for the *scenario* agents      (default: inherit)
 *
 * Prerequisite: `npx tsx tests/mcp-schema-harness/prepare.ts` writes `.schemas.json`, because a
 * workflow script cannot import TypeScript or touch the filesystem itself.
 */

export const meta = {
  name: 'mcp-component-schema-harness',
  description:
    'Blind-test MCP component update schemas across scenarios; mechanical grading, model used only for judgment calls',
  phases: [{ title: 'Run scenarios' }, { title: 'Judge' }, { title: 'Synthesize' }],
};

// --- inputs ----------------------------------------------------------------

const cfg = args ?? {};
const VARIANTS = cfg.variants ?? ['current', 'flat'];
const SCENARIO_KEYS = cfg.scenarios ?? ['S1', 'S2', 'S3', 'S4', 'S5', 'S6'];
const REPS = cfg.reps ?? 3;
const SCENARIO_MODEL = cfg.model;

// `prepare.ts` inlines these — the script is self-contained once generated.
const BUNDLE = cfg.bundle;
if (!BUNDLE || !BUNDLE.schemas || !BUNDLE.scenarios) {
  throw new Error(
    'Missing bundle. Run: npx tsx tests/mcp-schema-harness/prepare.ts — then pass the ' +
      'printed JSON as args.bundle, or use `npm run harness` which does both.'
  );
}

const { schemas, scenarios, currentState } = BUNDLE;

function buildPrompt(schema, task) {
  return `You are calling a Strapi MCP tool named \`update_article\`. It updates one existing article document.

Here is the JSON Schema for the tool's \`data\` parameter:

${JSON.stringify(schema, null, 2)}

Current state of the article you are updating:

${JSON.stringify(currentState, null, 2)}

Task: ${task}

Reply with ONLY the JSON value you would pass as \`data\`. No explanation, no code fences.`;
}

const runs = [];
for (const variant of VARIANTS) {
  for (const key of SCENARIO_KEYS) {
    const scenario = scenarios.find((s) => s.key === key);
    if (!scenario) throw new Error(`Unknown scenario ${key}`);
    for (let rep = 1; rep <= REPS; rep += 1) {
      runs.push({ variant, scenario, rep });
    }
  }
}

log(
  `${runs.length} runs — variants [${VARIANTS.join(', ')}] × scenarios [${SCENARIO_KEYS.join(', ')}] × ${REPS} reps`
);

// --- phase 1: blind scenario calls -----------------------------------------
// The agent is told only that it is calling a tool. It is never told a schema design is under
// evaluation: that framing makes it reason like a reviewer rather than a tool caller, and the
// resulting payloads stop being representative.

phase('Run scenarios');

const executed = await pipeline(runs, async (item) => {
  const schema = schemas[item.variant];
  const opts = {
    label: `${item.variant}/${item.scenario.key}#${item.rep}`,
    phase: 'Run scenarios',
  };
  if (SCENARIO_MODEL) opts.model = SCENARIO_MODEL;
  const reply = await agent(buildPrompt(schema, item.scenario.task), opts);
  return { ...item, reply };
});

const completed = executed.filter(Boolean);
log(`${completed.length}/${runs.length} scenario calls returned`);

// --- phase 2: judgment-only grading ----------------------------------------
// Mechanical facts (schema validity, deleted rows, lost fields, invented ids) are computed by
// `validate.ts` *after* this workflow returns — deterministic, so there is no reason to spend a
// model call on them, and the earlier rounds proved a model will contradict itself if asked.
//
// The model is left with two things it is genuinely better at than a parser: deciding whether
// the payload actually expresses the requested intent, and spotting hesitation/hedging. The
// rubric forces evidence to be quoted BEFORE the verdict field, so a verdict cannot silently
// disagree with its own reasoning the way it did in round 1.

const JUDGE_SCHEMA = {
  type: 'object',
  properties: {
    quoted_payload: {
      type: 'string',
      description: 'The exact JSON payload you are judging, copied verbatim from the reply.',
    },
    intent_evidence: {
      type: 'string',
      description:
        'Before judging: state which requested change each part of the payload accomplishes, and name anything the task asked for that the payload does not do. Facts only.',
    },
    achieves_intent: {
      type: 'boolean',
      description:
        'Derived strictly from intent_evidence: does the payload express the change the task asked for? Ignore data-loss concerns entirely — those are computed separately. If intent_evidence names an unmet part of the task, this MUST be false.',
    },
    is_clarifying_question: {
      type: 'boolean',
      description: 'True if the reply is a question or refusal rather than a JSON payload.',
    },
    verbosity: {
      type: 'string',
      enum: ['minimal', 'resent-unchanged-fields', 'resent-everything'],
      description:
        'minimal = only what changed; resent-unchanged-fields = echoed siblings inside a touched component/array; resent-everything = echoed the whole document.',
    },
    hedging: {
      type: 'boolean',
      description:
        'True only if the reply contains prose, caveats, or commentary outside the JSON value. A bare payload is not hedging.',
    },
    note: {
      type: 'string',
      description: 'One sentence. No retractions — revise the fields instead.',
    },
  },
  required: [
    'quoted_payload',
    'intent_evidence',
    'achieves_intent',
    'is_clarifying_question',
    'verbosity',
    'hedging',
  ],
};

phase('Judge');

const judged = await pipeline(completed, (run) => {
  const prompt = `Judge one MCP tool-call payload on INTENT ONLY.

The task the agent was given:
"${run.scenario.task}"

Document state before the call:
${JSON.stringify(currentState, null, 2)}

The agent's raw reply:
${run.reply}

Fill the fields in order. \`intent_evidence\` comes first and must be pure observation: walk the
payload and say what each part does, then name anything the task asked for that is absent.
\`achieves_intent\` must follow mechanically from what you wrote — if your evidence names an
unmet requirement, \`achieves_intent\` is false. Do not reason your way to a different
conclusion in \`note\`; if you change your mind, change the fields.

Scope limits — these are computed mechanically elsewhere, so ignore them completely here:
- whether the payload validates against the JSON Schema
- whether applying it would delete rows, lose fields, or write invalid content

Judge only: does it express the requested change, is it a question instead of a payload, how
verbose is it, and does it hedge with prose around the JSON?`;
  return agent(prompt, {
    label: `judge:${run.variant}/${run.scenario.key}#${run.rep}`,
    phase: 'Judge',
    schema: JUDGE_SCHEMA,
  }).then((judgment) => ({ ...run, judgment }));
});

const results = judged.filter(Boolean).map((r) => ({
  variant: r.variant,
  scenario: r.scenario.key,
  rep: r.rep,
  reply: r.reply,
  judgment: r.judgment,
}));

log(`${results.length} runs judged; mechanical grading happens after the workflow returns`);

// --- phase 3: qualitative synthesis ----------------------------------------
// Deliberately NOT asked for rates or counts: those are computed from the mechanical grades by
// `score.ts`. Round 1's headline percentages came from model-tallied booleans and had to be
// retracted. This agent reads payloads and reports patterns.

phase('Synthesize');

const synthesis = await agent(
  `You are summarizing qualitative patterns in how AI agents filled out an MCP tool-call payload
for updating a Strapi document with components.

Context: repeatable components are replaced wholesale server-side (an omitted row is deleted),
and a component object without an "id" is delete-and-recreated rather than patched. Variants:
- "current": the real schema on this branch — components are an anyOf of a patch branch
  (requires "id", other fields optional) and a create branch (no id, required fields enforced),
  and array fields carry a hint that the list is replaced wholesale.
- "flat": the historical schema — components are plain objects with no "id" at all.
- "proposed": the hand-rolled anyOf from the review, before it was upstreamed.

Runs (variant, scenario, rep, raw reply, and an intent-only judgment):
${JSON.stringify(results, null, 2)}

Do NOT compute or estimate rates, counts, or percentages — those are calculated mechanically
from the same runs and any number you produce here will conflict with them. Report patterns and
quote payloads.

Cover:
1. Strategies per variant: how did agents express "keep this row"? Bare {"id":N} stubs, full
   re-sends, or omission? Quote representative payloads.
2. Whether the wholesale-replace hint visibly changed behaviour on the array scenarios (S3, S6),
   and whether agents appear to trust that a bare {"id":N} preserves the row's other fields.
3. Any confusion cost specific to the anyOf variants: invented ids, malformed branches, prose
   hedging, or clarification requests that the flat variant did not show.
4. The open question for the PR author: is a bare {"id":N} keep-stub something the schema should
   explicitly bless in its wording? Say what the evidence suggests.`,
  { phase: 'Synthesize', label: 'synthesis' }
);

return { config: { variants: VARIANTS, scenarios: SCENARIO_KEYS, reps: REPS }, results, synthesis };
