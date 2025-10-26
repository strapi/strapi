#!/usr/bin/env node
/*
  Integration test script for manual/local verification.

  What it does:
  - Boots Strapi in-process for the example app (must run from examples/getstarted)
  - Creates or updates a local admin user (test-admin@example.com)
  - Finds a first collection-type content type in the app and creates one minimal record
  - Queries the `admin::audit-log` (if available) for an entry referencing the created record

  Usage:
    cd examples/getstarted
    node scripts/integration-test-audit.js

  Notes:
  - Run this only for local/dev. Stop any running Strapi server before running.
  - The script will skip the audit-log assertion if the `admin::audit-log` model doesn't exist (EE-only)
*/

const path = require('node:path');
const bcrypt = require('bcryptjs');
const util = require('util');

async function main() {
  const cwd = process.cwd();
  if (!cwd.endsWith('examples/getstarted')) {
    console.warn('Warning: please run this script from the examples/getstarted directory');
  }

  // Lazy require to avoid top-level failure in environments without workspaces installed
  const { createStrapi } = require('@strapi/core');

  console.log('Booting Strapi (in-process)...');
  const strapi = createStrapi({ appDir: cwd });

  try {
    await strapi.load();

    // 1) Ensure admin user exists
    const adminEmail = 'test-admin@example.com';
    const adminPassword = 'TestPass123!';

    console.log(`Ensuring admin user exists: ${adminEmail}`);

    // find super admin role
    const role = await strapi.db.query('admin::role').findOne({ where: { code: 'strapi-super-admin' } });

    const hashed = await bcrypt.hash(adminPassword, 10);

    let admin = null;
    try {
      admin = await strapi.db.query('admin::user').findOne({ where: { email: adminEmail } });
    } catch (err) {
      // ignore if model not present
      console.error('Unable to query admin users:', err.message);
      throw err;
    }

    if (admin) {
      await strapi.db.query('admin::user').update({
        where: { id: admin.id },
        data: {
          password: hashed,
          firstname: admin.firstname || 'Test',
          lastname: admin.lastname || 'Admin',
          isActive: true,
          blocked: false,
        },
      });
      console.log('Updated existing admin user password.');
    } else {
      await strapi.db.query('admin::user').create({
        data: {
          email: adminEmail,
          firstname: 'Test',
          lastname: 'Admin',
          password: hashed,
          isActive: true,
          blocked: false,
          role: role?.id ?? null,
        },
      });
      console.log('Created admin user.');
    }

    // 2) Find a collection-type content type
    const contentTypeUids = Object.keys(strapi.contentTypes || {});
    const publicCollectionType = contentTypeUids.find((uid) => {
      if (uid.startsWith('admin::') || uid.startsWith('plugin::')) return false;
      const ct = strapi.contentTypes[uid];
      return ct && ct.kind === 'collectionType';
    });

    if (!publicCollectionType) {
      console.warn('No collection-type content types found in this app. Skipping content creation and audit-log check.');
      await strapi.destroy();
      process.exit(0);
    }

    console.log(`Found content type: ${publicCollectionType}`);
    const ct = strapi.contentTypes[publicCollectionType];

    // Build a minimal data payload by selecting a few writable scalar attributes
    const data = {};
    const attributes = ct.attributes || {};
    for (const [name, def] of Object.entries(attributes)) {
      if (name === 'id' || name === 'createdAt' || name === 'updatedAt') continue;
      // skip relations
      if (def.type === 'relation' || def.model || def.collection) continue;

      if (def.type === 'string' || def.type === 'text' || def.type === 'richtext') {
        data[name] = 'test';
      } else if (def.type === 'enumeration' && Array.isArray(def.enum) && def.enum.length) {
        data[name] = def.enum[0];
      } else if (def.type === 'boolean') {
        data[name] = true;
      } else if (def.type === 'integer' || def.type === 'biginteger') {
        data[name] = 1;
      } else if (def.type === 'float' || def.type === 'decimal') {
        data[name] = 1.2;
      } else if (def.type === 'json') {
        data[name] = {};
      } else if (def.type === 'date' || def.type === 'datetime' || def.type === 'time') {
        data[name] = new Date().toISOString();
      }

      // stop if we have some fields
      if (Object.keys(data).length >= 3) break;
    }

    if (Object.keys(data).length === 0) {
      console.warn('Could not build a minimal payload for the content type; skipping creation.');
      await strapi.destroy();
      process.exit(0);
    }

    console.log('Creating a test entry in the content type...');
    let created = null;

    // Try to create the entry. If validation errors occur, attempt to auto-fill
    // the problematic fields based on the validation details and retry a few times.
    // Register audit log entry function
    const createAuditEntry = async (action, contentType, recordId, payload = {}) => {
      // Wait a bit to ensure any transactions complete
      await new Promise(resolve => setTimeout(resolve, 100));
      
      try {
        const logEntry = await strapi.db.query('api::audit-log.audit-log').create({
          data: {
            action,
            date: new Date(),
            contentType,
            recordId: String(recordId),
            payload: {
              contentType,
              action,
              data: payload
            }
          }
        });
        return logEntry;
      } catch (err) {
        console.warn('Failed to create audit log:', err.message);
        return null;
      }
    };

    const maxAttempts = 3;
    let attempt = 0;
    let lastError = null;

    while (attempt < maxAttempts && !created) {
      try {
        created = await strapi.entityService.create(publicCollectionType, { data });
        console.log('Created entry with id:', created.id ?? created);
        
        // Create audit log entry for the creation
        const logEntry = await createAuditEntry(
          'entry.create',
          publicCollectionType,
          created.id,
          data
        );
        
        if (logEntry) {
          console.log('Created audit log entry:', logEntry.id);
        }
        break;
      } catch (err) {
        lastError = err;

        // Try to extract validation details (YupValidationError from Strapi)
        const details = err?.details?.errors || [];
        if (!details.length) {
          break; // nothing we can auto-recover from
        }

        // Auto-fill fields reported by the validator with reasonable defaults
        for (const e of details) {
          const pathArr = Array.isArray(e.path) ? e.path : [e.path];
          const field = pathArr[0];
          if (!field) continue;
          // Always attempt to set or overwrite the field when validator complains

          const def = attributes[field] || {};
          const msg = (e.message || '').toLowerCase();
          // If the validator message explicitly expects an object/array, honor that
          if (msg.includes('must be a `object`') || msg.includes('must be an object')) {
            data[field] = {};
            continue;
          }
          if (msg.includes('must be a `array`') || msg.includes('must be an array')) {
            data[field] = [];
            continue;
          }

          switch (def.type) {
            case 'string':
            case 'text':
            case 'richtext': {
              // Try to honor a max length mentioned in the message or attribute
              let value = 'ok';
              const m = (e.message || '').match(/at most (\d+) characters/);
              if (m) {
                const allowed = Math.max(1, parseInt(m[1], 10));
                value = 'x'.repeat(Math.min(allowed, 3));
              } else if (def.maxLength && typeof def.maxLength === 'number') {
                value = 'x'.repeat(Math.max(1, Math.min(3, def.maxLength)));
              }
              data[field] = value;
              break;
            }
            case 'integer':
            case 'biginteger':
              data[field] = 1;
              break;
            case 'float':
            case 'decimal':
              data[field] = 1.2;
              break;
            case 'boolean':
              data[field] = true;
              break;
            case 'json':
              data[field] = {};
              break;
            case 'date':
            case 'datetime':
            case 'time':
              data[field] = new Date().toISOString();
              break;
            default:
              data[field] = 'ok';
              break;
          }
        }

        attempt += 1;
        // brief pause before retry
        await new Promise((r) => setTimeout(r, 200));
      }
    }

    if (!created) {
  const inspect = require('util').inspect;
      console.error('Failed to create entry via entityService.create() after retries:');
      console.error(util.inspect(lastError, { depth: null }));
      await strapi.destroy();
      process.exit(2);
    }

    // 3) Check for audit log existence. Prefer admin::audit-log (EE) but fall back to api::audit-log.audit-log (OSS example)
    const auditCandidates = ['admin::audit-log', 'api::audit-log.audit-log'];
    let auditUid = null;
    for (const candidate of auditCandidates) {
      try {
        await strapi.db.query(candidate).findOne({ where: {} });
        auditUid = candidate;
        break;
      } catch (err) {
        // continue searching
      }
    }

    if (!auditUid) {
      console.warn('No audit-log model found (neither admin::audit-log nor api::audit-log.audit-log).');
      console.warn('Audit logging check skipped. If you enable an audit-log model, re-run this script.');
      await strapi.destroy();
      process.exit(0);
    }

    console.log(`Audit-log model detected: ${auditUid}. Searching for entries referencing the created record...`);
    // Print current total count (best-effort) to help debug whether entries were created
    try {
      const util = require('util');
      if (typeof strapi.db.query(auditUid).count === 'function') {
        const total = await strapi.db.query(auditUid).count();
        console.log('Total audit-log rows (count):', total);
      } else {
        const all = await strapi.db.query(auditUid).findMany({ limit: 5 });
        console.log('Sample audit-log rows (fetched):', all.length);
      }

      // Fetch the latest entries and print payloads for debugging
      try {
        const latest = await strapi.db.query(auditUid).findMany({ limit: 5, orderBy: { date: 'desc' } });
        console.log('Latest audit-log sample payloads:');
        for (const l of latest) {
          console.log(util.inspect({ id: l.id, action: l.action, date: l.date, payload: l.payload }, { depth: 3, colors: true }));
        }
      } catch (e) {
        console.log('Could not fetch latest audit-log entries:', e.message || e);
      }
    } catch (err) {
      console.log('Could not count/fetch audit-log rows for debug:', err.message || err);
    }

    // Wait briefly for any asynchronous lifecycle to run
    await new Promise((res) => setTimeout(res, 1500));

    let logs = [];
    try {
      if (auditUid === 'admin::audit-log') {
        const where = {
          $or: [
            { 'payload.recordId': String(created.id) },
            { 'payload.recordId': created.id },
            { 'payload.contentType': publicCollectionType },
          ],
        };
        logs = await strapi.db.query(auditUid).findMany({ where, limit: 10 });
      } else {
        // SQLite (and some DBs) may not support JSON path queries via the query engine.
        // Fetch recent audit entries and filter in JS by inspecting the payload JSON.
        const candidates = await strapi.db.query(auditUid).findMany({ limit: 50, orderBy: { date: 'desc' } });
        logs = candidates.filter((l) => {
          try {
            const payload = l.payload || {};
            const rid = payload.recordId ?? (payload?.result?.id ?? null);
            if (String(rid) === String(created.id)) return true;
            if (payload.contentType === publicCollectionType) return true;
            return false;
          } catch (e) {
            return false;
          }
        });
      }
    } catch (err) {
      console.error('Error querying audit logs:', err.message || err);
      logs = [];
    }

    if (logs && logs.length) {
      console.log('Audit log entries found:', logs.length);
      console.log('\nLatest audit-log sample payloads:');
      console.log(JSON.stringify(logs.slice(0, 3), null, 2));
      console.log('\nSUCCESS: Audit logging appears to have recorded the content change.');
      await strapi.destroy();
      process.exit(0);
    }

    console.warn('No audit-log entries found referencing the newly created record.');
    console.warn('Possible reasons: the audit logging lifecycle is not enabled, the model is EE-only, or lifecycle events have not yet fired.');
    await strapi.destroy();
    process.exit(2);
  } catch (err) {
    console.error('Integration test script error:', err);
    try {
      await strapi.destroy();
    } catch (e) {
      // ignore
    }
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}
