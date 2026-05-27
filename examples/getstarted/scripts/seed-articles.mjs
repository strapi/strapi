#!/usr/bin/env node
/* eslint-disable no-console */
// One-off seed script: inserts a wide spread of dummy articles directly into the SQLite DB
// so the day-only datetime filter can be tested against varied createdAt values.
//
// Strapi's HTTP API strips createdAt on writes (see core/document-service/repository.ts:453),
// so the seed runs at the DB layer. Dates are computed using local-time constructors, so the
// rows show up under their intended calendar day in whatever timezone your browser uses.

import { fileURLToPath } from 'node:url';
import path from 'node:path';
import Database from 'better-sqlite3';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbPath = path.resolve(__dirname, '..', '.tmp', 'data.db');

const ALPHABET = 'abcdefghijklmnopqrstuvwxyz0123456789';
const randomDocumentId = () => {
  let out = '';
  for (let i = 0; i < 24; i += 1) {
    out += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  }
  return out;
};

const slugify = (title, suffix) =>
  `${title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')}-${suffix}`;

// Each entry: [year, month (1-12), day, hour, minute, title, author, publish?]
// "publish: true" creates a second row representing the Published version.
const ARTICLES = [
  // March 2026
  [2026, 3, 15, 9, 0, 'Annual report draft', 'Maria Janssen', false],
  [2026, 3, 15, 11, 30, 'Office renovation update', 'Pieter de Vries', true],
  [2026, 3, 15, 16, 45, 'Spring break announcement', 'Sanne Bakker', true],
  [2026, 3, 15, 20, 0, 'Evening newsletter', 'Joost Hendriks', false],

  // DST transition (last Sunday in March 2026 — winter → summer time in Europe)
  [2026, 3, 29, 1, 30, 'Pre-DST early-hours post', 'Liesbeth de Boer', false],
  [2026, 3, 29, 14, 0, 'Post-DST afternoon', 'Tom van Dijk', true],
  [2026, 3, 29, 23, 59, 'End of DST transition day', 'Femke Visser', false],

  // April 2026
  [2026, 4, 20, 8, 15, 'Q2 kickoff', 'Bram Mulder', true],
  [2026, 4, 20, 13, 45, 'Lunchtime announcement', 'Eva Smit', false],
  [2026, 4, 20, 17, 30, 'After-work update', 'Lars Jansen', false],
  [2026, 4, 20, 21, 0, 'Late evening dispatch', 'Ilse de Wit', false],

  // May 1 (Labour Day)
  [2026, 5, 1, 9, 0, 'Labour Day reminder', 'Sofie Maas', true],
  [2026, 5, 1, 12, 0, 'Holiday office hours', 'Daan Peters', false],

  // May 15 — varied hours including local midnight to test the trade-off
  [2026, 5, 15, 0, 0, 'Midnight scheduled post', 'Iris Bakker', false],
  [2026, 5, 15, 6, 30, 'Early morning briefing', 'Robin Vermeer', false],
  [2026, 5, 15, 9, 30, 'Standup recap', 'Anouk Verhoeven', true],
  [2026, 5, 15, 14, 0, 'Afternoon roadmap', 'Niels Kuipers', false],
  [2026, 5, 15, 18, 45, 'Evening release notes', 'Hanna Vos', true],
  [2026, 5, 15, 23, 59, 'Last-minute update', 'Jeroen Smits', false],

  // May 26 (the day in your screenshot) — dense day with many entries
  [2026, 5, 26, 7, 0, 'Tuesday morning roundup', 'Linde Klaassen', false],
  [2026, 5, 26, 9, 15, 'Stakeholder meeting prep', 'Mark Hofman', false],
  [2026, 5, 26, 10, 30, 'Marketing campaign launch', 'Suzanne Brouwer', true],
  [2026, 5, 26, 12, 0, 'Lunch break thoughts', 'Wouter de Wit', false],
  [2026, 5, 26, 14, 38, 'Afternoon page update', 'Maxime Vink', true],
  [2026, 5, 26, 16, 38, 'Late afternoon edit', 'Joris Kaiser', false],
  [2026, 5, 26, 19, 22, 'Evening wrap-up', 'Else van Leeuwen', false],
  [2026, 5, 26, 22, 50, 'Late night thoughts', 'Bart Wolff', false],

  // May 27 (today)
  [2026, 5, 27, 8, 0, 'Wednesday morning standup', 'Roos van der Berg', false],
  [2026, 5, 27, 11, 45, 'Mid-morning announcement', 'Sem de Lange', true],
  [2026, 5, 27, 15, 0, 'Afternoon retrospective', 'Tess Postma', false],

  // June 2026
  [2026, 6, 10, 9, 0, 'Summer event planning', 'Lotte Dekker', false],
  [2026, 6, 10, 13, 30, 'Q3 preview', 'Stijn Bos', true],
  [2026, 6, 10, 17, 0, 'End of day summary', 'Mila Hoekstra', false],
  [2026, 6, 25, 10, 0, 'Midsummer notice', 'Kai Vermeer', false],

  // July 2026
  [2026, 7, 4, 10, 0, 'Summer holiday notice', 'Levi Schouten', true],
  [2026, 7, 4, 16, 30, 'Vacation reminder', 'Veerle Koster', false],
];

const db = new Database(dbPath);

const insert = db.prepare(`
  INSERT INTO articles
    (document_id, title, author_name, slug, created_at, updated_at, published_at, locale)
  VALUES
    (@document_id, @title, @author_name, @slug, @created_at, @updated_at, @published_at, @locale)
`);

const seed = db.transaction((rows) => {
  let drafts = 0;
  let publishedPairs = 0;

  for (let i = 0; i < rows.length; i += 1) {
    const [year, month, day, hour, minute, title, author, publish] = rows[i];
    // Construct in local time so the row lands on the intended calendar day regardless of TZ.
    const createdAt = new Date(year, month - 1, day, hour, minute, 0, 0).getTime();
    const documentId = randomDocumentId();
    const slug = slugify(title, documentId.slice(0, 6));

    insert.run({
      document_id: documentId,
      title,
      author_name: author,
      slug,
      created_at: createdAt,
      updated_at: createdAt,
      published_at: null,
      locale: 'en',
    });
    drafts += 1;

    if (publish) {
      insert.run({
        document_id: documentId,
        title,
        author_name: author,
        slug,
        created_at: createdAt,
        updated_at: createdAt,
        // Publish a few seconds after creation, matching how Strapi itself writes the pair.
        published_at: createdAt + 5000,
        locale: 'en',
      });
      publishedPairs += 1;
    }
  }

  return { drafts, publishedPairs };
});

const { drafts, publishedPairs } = seed(ARTICLES);

console.log(
  `Seeded ${ARTICLES.length} documents → ${drafts} draft rows + ${publishedPairs} published rows ` +
    `(${drafts + publishedPairs} rows total).`
);

db.close();
