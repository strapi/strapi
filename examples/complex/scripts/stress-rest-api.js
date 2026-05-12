#!/usr/bin/env node
/**
 * Fire many Content API requests against a *running* Strapi (complex example) to generate
 * HTTP / document-service / DB telemetry quickly (e.g. OTLP → Jaeger + collector).
 *
 * Covers all collection types listed in `scripts/rest-stress-targets.json` (basics, basic-dps,
 * i18n + draft types, relations, hc-m2m, …) — rotates list + findOne across them.
 *
 * Prerequisites
 * ---------------
 * - Strapi already up (e.g. `yarn develop` or `yarn develop:postgres` from this directory).
 * - Run `yarn seed:rest` once: grants Public **find** / **findOne** / **create** on those types.
 *
 * Usage (from examples/complex)
 * -----------------------------
 *   yarn stress:rest
 *   yarn stress:rest -- --base http://127.0.0.1:1337/api -n 800 -c 25
 *   STRESS_REST_WRITES=1 yarn stress:rest -- -n 400 -c 10
 *
 * Env (defaults in parentheses)
 * -----------------------------
 *   STRESS_REST_BASE_URL   API root including /api (http://127.0.0.1:1337/api)
 *   STRESS_REST_TOTAL      total requests (300)
 *   STRESS_REST_CONCURRENCY in-flight per batch (15)
 *   STRESS_REST_WRITES     if 1/true, ~10% POST (rotates across types)
 *   STRESS_REST_LOCALE     optional override for i18n `locale` query (else each target's JSON `locale`)
 */

const path = require('node:path');
const REST_TARGETS = require(path.join(__dirname, 'rest-stress-targets.json'));

function makeCreatePayload(uid, salt) {
  const stamp = `${Date.now()}-${salt}`;
  switch (uid) {
    case 'api::basic.basic':
      return { data: { stringField: `s-${stamp}`, textField: 'stress-rest-api.js' } };
    case 'api::basic-dp.basic-dp':
      return { data: { stringField: `s-${stamp}` } };
    case 'api::basic-dp-i18n.basic-dp-i18n':
      return { data: { stringField: `s-${stamp}` } };
    case 'api::relation.relation':
      return { data: { name: `r-${stamp}` } };
    case 'api::relation-dp.relation-dp':
      return { data: { name: `r-${stamp}` } };
    case 'api::relation-dp-i18n.relation-dp-i18n':
      return { data: { name: `r-${stamp}` } };
    case 'api::hc-m2m-source.hc-m2m-source':
      return { data: { label: `src-${stamp}` } };
    case 'api::hc-m2m-target.hc-m2m-target':
      return { data: { label: `tgt-${stamp}` } };
    default:
      return { data: {} };
  }
}

function parseArgs(argv) {
  const out = {
    base: process.env.STRESS_REST_BASE_URL || 'http://127.0.0.1:1337/api',
    total: Math.max(1, parseInt(process.env.STRESS_REST_TOTAL || '300', 10) || 300),
    concurrency: Math.max(1, parseInt(process.env.STRESS_REST_CONCURRENCY || '15', 10) || 15),
    writes: process.env.STRESS_REST_WRITES === '1' || process.env.STRESS_REST_WRITES === 'true',
    locale: undefined,
  };

  for (let k = 0; k < argv.length; k++) {
    const a = argv[k];
    if (a === '--base' && argv[k + 1]) {
      out.base = argv[++k].replace(/\/+$/, '');
    } else if (a === '-n' && argv[k + 1]) {
      out.total = Math.max(1, parseInt(argv[++k], 10) || out.total);
    } else if (a === '-c' && argv[k + 1]) {
      out.concurrency = Math.max(1, parseInt(argv[++k], 10) || out.concurrency);
    } else if (a === '--writes' || a === '-w') {
      out.writes = true;
    } else if (a === '--locale' && argv[k + 1]) {
      out.locale = argv[++k];
    } else if (a === '--help' || a === '-h') {
      out.help = true;
    }
  }

  return out;
}

function normalizeApiBase(raw) {
  let u = raw.trim().replace(/\/+$/, '');
  if (!u.includes('/api')) {
    u = `${u}/api`;
  }
  return u;
}

function firstDocumentIdFromListJson(listJson) {
  const first = Array.isArray(listJson.data) ? listJson.data[0] : null;
  return first?.documentId ?? first?.id ?? null;
}

function effectiveLocale(target, opts) {
  if (opts?.locale) {
    return opts.locale;
  }
  return process.env.STRESS_REST_LOCALE || target.locale || null;
}

function buildListUrl(base, target, variantIndex, opts) {
  const url = new URL(`${base}/${target.pluralPath}`);
  url.searchParams.set('pagination[pageSize]', '8');
  url.searchParams.set('sort', 'createdAt:desc');
  const loc = effectiveLocale(target, opts);
  if (loc) {
    url.searchParams.set('locale', loc);
  }
  if (target.draftAndPublish) {
    const status = variantIndex % 2 === 0 ? 'draft' : 'published';
    url.searchParams.set('status', status);
  }
  return url;
}

function buildFindOneUrl(base, target, documentId, opts) {
  const url = new URL(`${base}/${target.pluralPath}/${documentId}`);
  const loc = effectiveLocale(target, opts);
  if (loc) {
    url.searchParams.set('locale', loc);
  }
  if (target.draftAndPublish) {
    url.searchParams.set('status', 'draft');
  }
  url.searchParams.set('fields[0]', 'documentId');
  return url;
}

function buildCreateUrl(base, target, opts) {
  const url = new URL(`${base}/${target.pluralPath}`);
  const loc = effectiveLocale(target, opts);
  if (loc) {
    url.searchParams.set('locale', loc);
  }
  return url;
}

async function tryListFirstDocumentId(base, target, opts) {
  for (let v = 0; v < (target.draftAndPublish ? 2 : 1); v++) {
    const url = buildListUrl(base, target, v, opts);
    const res = await fetch(url);
    const text = await res.text();
    if (!res.ok) {
      continue;
    }
    let json;
    try {
      json = JSON.parse(text);
    } catch {
      continue;
    }
    const id = firstDocumentIdFromListJson(json);
    if (id) {
      return id;
    }
  }
  return null;
}

async function tryPostCreate(base, target, opts, salt) {
  const url = buildCreateUrl(base, target, opts);
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(makeCreatePayload(target.uid, salt)),
  });
  const text = await res.text();
  if (!res.ok) {
    return null;
  }
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    return null;
  }
  return json.data?.documentId ?? json.data?.id ?? null;
}

async function warmUpCaches(base, targets, opts) {
  const idByUid = new Map();
  for (const t of targets) {
    let id = await tryListFirstDocumentId(base, t, opts);
    if (!id) {
      id = await tryPostCreate(base, t, opts, `bootstrap-${t.uid}`);
    }
    if (id) {
      idByUid.set(t.uid, id);
    }
  }
  if (idByUid.size === 0) {
    throw new Error(
      'Could not read or create any sample documents. Run `yarn seed:rest` (grants Public API on all stress types).'
    );
  }
  const skipped = targets.filter((t) => !idByUid.has(t.uid));
  if (skipped.length) {
    console.warn(
      `Warm-up: ${skipped.length} type(s) skipped (no rows / 403): ${skipped.map((s) => s.pluralPath).join(', ')}`
    );
  }
  return idByUid;
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  if (opts.help) {
    console.log(`Usage: node scripts/stress-rest-api.js [options]

Rotates across collection types in scripts/rest-stress-targets.json (not only basics).

Options:
  --base <url>     API root (default: http://127.0.0.1:1337/api or STRESS_REST_BASE_URL)
  -n <number>      total requests (STRESS_REST_TOTAL, default 300)
  -c <number>      concurrency per batch (STRESS_REST_CONCURRENCY, default 15)
  -w, --writes     ~10% POST across types (needs Public create; STRESS_REST_WRITES=1)
  --locale <code>  override i18n locale (else STRESS_REST_LOCALE or rest-stress-targets.json per type)

Example:
  yarn stress:rest -- --base http://127.0.0.1:1337/api -n 1000 -c 30
`);
    return;
  }

  const base = normalizeApiBase(opts.base);
  const targets = REST_TARGETS;
  console.log(`Target: ${base}`);
  console.log(
    `Content types: ${targets.map((t) => t.pluralPath).join(', ')} (${targets.length} plural roots)`
  );
  console.log(
    `Plan: ${opts.total} requests, batch concurrency ${opts.concurrency}, writes=${opts.writes}`
  );

  const idByUid = await warmUpCaches(base, targets, opts);
  console.log(`Warm-up: cached documentId for ${idByUid.size} type(s).`);

  let ok = 0;
  let fail = 0;
  const errors = [];

  async function oneRequest(i) {
    const t = targets[i % targets.length];
    const useWrite = opts.writes && i % 10 === 0;
    try {
      if (useWrite) {
        const url = buildCreateUrl(base, t, opts);
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(makeCreatePayload(t.uid, i)),
        });
        const text = await res.text();
        if (!res.ok) {
          throw new Error(`POST ${t.pluralPath} ${res.status}: ${text.slice(0, 200)}`);
        }
        const json = JSON.parse(text);
        const newId = json.data?.documentId ?? json.data?.id;
        if (newId) {
          idByUid.set(t.uid, newId);
        }
      } else if (Math.floor(i / targets.length) % 2 === 0) {
        const url = buildListUrl(base, t, i, opts);
        const res = await fetch(url);
        const text = await res.text();
        if (!res.ok) {
          throw new Error(`GET list ${t.pluralPath} ${res.status}: ${text.slice(0, 200)}`);
        }
        const json = JSON.parse(text);
        const newId = firstDocumentIdFromListJson(json);
        if (newId) {
          idByUid.set(t.uid, newId);
        }
      } else {
        const id = idByUid.get(t.uid);
        if (!id) {
          const url = buildListUrl(base, t, i, opts);
          const res = await fetch(url);
          const text = await res.text();
          if (!res.ok) {
            throw new Error(`GET list ${t.pluralPath} ${res.status}: ${text.slice(0, 200)}`);
          }
        } else {
          const url = buildFindOneUrl(base, t, id, opts);
          const res = await fetch(url);
          const text = await res.text();
          if (!res.ok) {
            throw new Error(`GET one ${t.pluralPath} ${res.status}: ${text.slice(0, 200)}`);
          }
        }
      }
      ok++;
    } catch (e) {
      fail++;
      if (errors.length < 12) {
        errors.push(`${t.pluralPath}: ${e.message || e}`);
      }
    }
  }

  const t0 = Date.now();
  for (let offset = 0; offset < opts.total; offset += opts.concurrency) {
    const batch = [];
    for (let j = 0; j < opts.concurrency && offset + j < opts.total; j++) {
      batch.push(oneRequest(offset + j));
    }
    await Promise.all(batch);
  }
  const ms = Date.now() - t0;

  console.log(`\nDone in ${ms} ms (${(opts.total / (ms / 1000)).toFixed(1)} req/s)`);
  console.log(`OK: ${ok}  FAIL: ${fail}`);
  if (errors.length) {
    console.log('Sample errors:');
    for (const line of errors) {
      console.log(`  - ${line}`);
    }
  }
  if (fail > 0) {
    console.log(
      '\nHint: 403 → run `yarn seed:rest` once (grants Public find/findOne/create on all types in rest-stress-targets.json).'
    );
    process.exitCode = 1;
  } else {
    console.log('\n✅ Stress run complete — check Jaeger / collector for new traces and metrics.');
  }
}

if (require.main === module) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
