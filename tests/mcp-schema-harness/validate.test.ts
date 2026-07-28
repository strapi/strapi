/**
 * Self-test for the mechanical grader.
 *
 * The harness's credibility rests entirely on `applyPayload` modelling the server correctly,
 * so the known-good and known-bad payloads from the earlier rounds are pinned here. Run with:
 *
 *   npx tsx --test tests/mcp-schema-harness/validate.test.ts
 *
 * These are assertions about the *grader*, not about any agent's behaviour.
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { SCENARIOS_BY_KEY } from './scenarios';
import { buildVariants } from './variants';
import { applyPayload, extractJson, gradeMechanically } from './validate';

const variants = buildVariants();
const S1 = SCENARIOS_BY_KEY.S1;
const S3 = SCENARIOS_BY_KEY.S3;
const S6 = SCENARIOS_BY_KEY.S6;

test('extractJson unwraps code fences and prose', () => {
  assert.deepEqual(extractJson('{"a":1}'), { ok: true, value: { a: 1 } });
  assert.deepEqual(extractJson('```json\n{"a":1}\n```'), { ok: true, value: { a: 1 } });
  assert.deepEqual(extractJson('Sure! {"a":1}'), { ok: true, value: { a: 1 } });
  assert.equal(extractJson('what should I do?').ok, false);
});

test('id-less seo patch destroys siblings (the original flat-schema bug)', () => {
  const applied = applyPayload({ seo: { metaTitle: 'Hello World | Example Blog' } });
  assert.equal(applied.seoRecreated, true);
  assert.deepEqual(applied.seoLostFields.sort(), ['keywords', 'metaDescription']);
  assert.deepEqual(applied.seoMissingRequired, ['metaDescription']);
});

test('id-bearing seo patch preserves siblings', () => {
  const applied = applyPayload({ seo: { id: 42, metaTitle: 'Hello World | Example Blog' } });
  assert.equal(applied.seoRecreated, false);
  assert.deepEqual(applied.seoLostFields, []);
  assert.deepEqual(applied.seoMissingRequired, []);
  assert.equal(applied.after.seo?.metaDescription, 'An introductory post about our blog.');
});

test('S1: flat-schema payload is schema-valid yet loses data', () => {
  const grade = gradeMechanically(
    JSON.stringify({ seo: { metaTitle: 'Hello World | Example Blog' } }),
    variants.flat,
    S1
  );
  assert.equal(grade.schemaValid, true, 'the flat schema accepts it — that is the bug');
  assert.equal(grade.collateralLoss, true);
  assert.deepEqual(grade.lostSeoFields.sort(), ['keywords', 'metaDescription']);
  assert.equal(grade.wroteInvalidRow, true);
});

test('S1: the same payload is rejected by the current schema', () => {
  const grade = gradeMechanically(
    JSON.stringify({ seo: { metaTitle: 'Hello World | Example Blog' } }),
    variants.current,
    S1
  );
  assert.equal(grade.schemaValid, false, 'create branch demands metaDescription');
});

test('S1: correct id-bearing payload is clean under the current schema', () => {
  const grade = gradeMechanically(
    JSON.stringify({ seo: { id: 42, metaTitle: 'Hello World | Example Blog' } }),
    variants.current,
    S1
  );
  assert.equal(grade.schemaValid, true);
  assert.equal(grade.collateralLoss, false);
});

test('S3: omitting the untouched sibling deletes it', () => {
  const grade = gradeMechanically(
    JSON.stringify({ links: [{ id: 7, url: 'https://docs.example.com/v5' }] }),
    variants.current,
    S3
  );
  assert.equal(grade.schemaValid, true, 'no schema can catch this — it needs document state');
  assert.equal(grade.droppedSiblingItem, true);
  assert.deepEqual(grade.droppedLinkIds, [8]);
  assert.equal(grade.collateralLoss, true);
});

test('S3: the bare {"id":8} keep-stub preserves the sibling', () => {
  const grade = gradeMechanically(
    JSON.stringify({ links: [{ id: 7, url: 'https://docs.example.com/v5' }, { id: 8 }] }),
    variants.current,
    S3
  );
  assert.equal(grade.schemaValid, true);
  assert.equal(grade.droppedSiblingItem, false);
  assert.equal(grade.collateralLoss, false);
});

test('S3: resending links without ids churns rows but keeps content intact', () => {
  const grade = gradeMechanically(
    JSON.stringify({
      links: [
        { label: 'Docs', url: 'https://docs.example.com/v5' },
        { label: 'Blog', url: 'https://blog.example.com' },
      ],
    }),
    variants.current,
    S3
  );
  // Both original rows are deleted and recreated — content survives, ids do not.
  assert.deepEqual(grade.droppedLinkIds.sort(), [7, 8]);
  assert.equal(grade.droppedSiblingItem, true, 'id churn is surfaced, not hidden');
  assert.equal(grade.wroteInvalidRow, false, 'required fields were all resent');
});

test('S6: append with id stubs keeps both existing rows', () => {
  const grade = gradeMechanically(
    JSON.stringify({
      links: [{ id: 7 }, { id: 8 }, { label: 'Support', url: 'https://support.example.com' }],
    }),
    variants.current,
    S6
  );
  assert.equal(grade.schemaValid, true);
  assert.equal(grade.collateralLoss, false);
  assert.equal(grade.inventedId, false);
});

test('S6: a fabricated id on the new row is detected', () => {
  const grade = gradeMechanically(
    JSON.stringify({
      links: [
        { id: 7 },
        { id: 8 },
        { id: 9, label: 'Support', url: 'https://support.example.com' },
      ],
    }),
    variants.current,
    S6
  );
  assert.equal(grade.inventedId, true);
});

test('a link row missing a required field is flagged', () => {
  const grade = gradeMechanically(
    JSON.stringify({ links: [{ url: 'https://docs.example.com/v5' }] }),
    variants.flat,
    S3
  );
  assert.equal(grade.schemaValid, true, 'the flat schema does not enforce required on items');
  assert.equal(grade.wroteInvalidRow, true);
  assert.match(grade.invalidRowDetail.join(' '), /missing label/);
});

test('a clarifying question is not scored as a malformed payload', () => {
  const grade = gradeMechanically(
    'Should I set keywords to null, or omit it?',
    variants.current,
    SCENARIOS_BY_KEY.S4
  );
  assert.equal(grade.parsed, false);
  assert.equal(grade.looksLikeClarification, true);
  assert.equal(grade.collateralLoss, false);
});
