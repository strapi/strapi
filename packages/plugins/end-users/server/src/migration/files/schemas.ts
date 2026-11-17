import type { CodeFinding } from '../../../../shared/contracts/migration';
import { PROFILE_UID, USER_UID } from '../../constants';
import profileContentType from '../../content-types/profile';
import type { FileChange, FilesPlan } from './types';

const UP_USER_UID = 'plugin::users-permissions.user';
const UP_ROLE_UID = 'plugin::users-permissions.role';

const UP_EXTENSION_DIR = 'src/extensions/users-permissions/';
const UP_USER_SCHEMA = `${UP_EXTENSION_DIR}content-types/user/schema.json`;
const PROFILE_SCHEMA = 'src/extensions/end-users/content-types/profile/schema.json';

const API_SCHEMA = /^src\/api\/([^/]+)\/content-types\/([^/]+)\/schema\.json$/;
const COMPONENT_SCHEMA = /^src\/components\/.+\.json$/;
const STRAPI_SERVER = /^src\/extensions\/users-permissions\/strapi-server\.[cm]?[jt]s$/;

/** What Users & Permissions' own user type declares: these stay behind, everything else moves */
export const UP_STOCK_USER_ATTRIBUTES: readonly string[] = [
  'username',
  'email',
  'provider',
  'password',
  'resetPasswordToken',
  'confirmationToken',
  'confirmed',
  'blocked',
  'role',
];

type Attribute = Record<string, unknown>;
type Schema = Record<string, unknown> & { attributes?: Record<string, Attribute> };

interface ParsedFile {
  path: string;
  /** The type's UID; null for a component or the user extensions */
  uid: string | null;
  original: string;
  schema: Schema;
  changed: boolean;
}

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const parse = (source: string): Schema | null => {
  try {
    const value: unknown = JSON.parse(source);

    return isObject(value) ? (value as Schema) : null;
  } catch {
    // Not valid JSON: Strapi refuses to start on it, so it is not this plan's to fix
    return null;
  }
};

const serialize = (schema: Schema, original: string) =>
  `${JSON.stringify(schema, null, 2)}${original.endsWith('\n') ? '\n' : ''}`;

const attributesOf = (schema: Schema): Record<string, Attribute> =>
  isObject(schema.attributes) ? (schema.attributes as Record<string, Attribute>) : {};

const retargetToUser = (attribute: Attribute) => {
  attribute.target = USER_UID;
  delete attribute.inversedBy;
  delete attribute.mappedBy;
};

/**
 * Plans the project's schema files for a move from Users & Permissions: its user extension becomes
 * the end-users profile extension, and the relations that name the old user are retargeted. A pure
 * function of `files` (project-relative path to content); nothing is written here.
 */
export const planSchemaChanges = (files: ReadonlyMap<string, string>): FilesPlan => {
  const findings: CodeFinding[] = [];
  const changes: FileChange[] = [];

  for (const path of files.keys()) {
    if (STRAPI_SERVER.test(path)) {
      findings.push({
        path,
        line: null,
        rule: 'strapi-server',
        message:
          'Customizes the users-permissions plugin, which the end-users plugin does not read: move what it does to the end-users plugin or to your own routes.',
      });
    }
  }

  const schemaFiles: ParsedFile[] = [];

  for (const [path, original] of files) {
    const api = API_SCHEMA.exec(path);

    if (!api && !COMPONENT_SCHEMA.test(path)) {
      continue;
    }

    const schema = parse(original);

    if (schema) {
      schemaFiles.push({
        path,
        uid: api ? `api::${api[1]}.${api[2]}` : null,
        original,
        schema,
        changed: false,
      });
    }
  }

  const upSource = files.get(UP_USER_SCHEMA);
  const upSchema = upSource === undefined ? null : parse(upSource);
  const moved: Array<[string, Attribute]> = [];

  if (upSchema) {
    for (const [name, attribute] of Object.entries(attributesOf(upSchema))) {
      if (UP_STOCK_USER_ATTRIBUTES.includes(name)) {
        continue;
      }

      if (attribute.type === 'relation' && attribute.mappedBy !== undefined) {
        // The inverse of a relation another type owns: the end-users user cannot carry one
        findings.push({
          path: UP_USER_SCHEMA,
          line: null,
          rule: 'inverse-dropped',
          message: `"${name}" is the inverse side of a relation another type owns, so it is not moved; the owning side now targets ${USER_UID} without an inverse.`,
        });
        continue;
      }

      moved.push([name, attribute]);
    }
  }

  // The other side of a moved relation follows it to the profile
  for (const [name, attribute] of moved) {
    if (attribute.type !== 'relation' || typeof attribute.inversedBy !== 'string') {
      continue;
    }

    const other = schemaFiles.find((file) => file.uid === attribute.target);
    const inverse = other ? attributesOf(other.schema)[attribute.inversedBy] : undefined;

    if (other && inverse?.target === UP_USER_UID && inverse.mappedBy === name) {
      inverse.target = PROFILE_UID;
      other.changed = true;
    }
  }

  const retarget = (attributes: Record<string, Attribute>, path: string): boolean => {
    let changed = false;

    for (const [name, attribute] of Object.entries(attributes)) {
      if (attribute.type !== 'relation') {
        continue;
      }

      if (attribute.target === UP_ROLE_UID) {
        findings.push({
          path,
          line: null,
          rule: 'role-relation',
          message: `"${name}" relates to ${UP_ROLE_UID}, which the end-users plugin replaces with its own roles; it is left as it is and needs a decision.`,
        });
      } else if (attribute.target === UP_USER_UID) {
        retargetToUser(attribute);
        changed = true;
      }
    }

    return changed;
  };

  for (const file of schemaFiles) {
    file.changed = retarget(attributesOf(file.schema), file.path) || file.changed;

    if (file.changed) {
      changes.push({
        path: file.path,
        before: file.original,
        after: serialize(file.schema, file.original),
      });
    }
  }

  if (upSchema && upSource !== undefined) {
    const movedAttributes: Record<string, Attribute> = {};

    for (const [name, attribute] of moved) {
      movedAttributes[name] = attribute;
    }

    // A moved relation that names the old user or role follows the same rules
    retarget(movedAttributes, UP_USER_SCHEMA);

    const existingSource = files.get(PROFILE_SCHEMA);
    const existing = existingSource === undefined ? null : parse(existingSource);
    const base: Schema =
      existing ?? (JSON.parse(JSON.stringify(profileContentType.schema)) as Schema);
    const stockAttributes = (profileContentType.schema as unknown as Schema).attributes ?? {};
    const attributes: Record<string, Attribute> = { user: { ...stockAttributes.user } };
    const own = attributesOf(base);

    for (const [name, attribute] of Object.entries(own)) {
      if (name !== 'user') {
        attributes[name] = attribute;
      }
    }

    for (const [name, attribute] of Object.entries(movedAttributes)) {
      if (name in attributes) {
        findings.push({
          path: existing ? PROFILE_SCHEMA : UP_USER_SCHEMA,
          line: null,
          rule: 'profile-clash',
          message: `"${name}" is on both the users-permissions user and the profile; the profile's is kept and the user's is not moved.`,
        });
      } else {
        attributes[name] = attribute;
      }
    }

    const after = serialize({ ...base, attributes }, existingSource ?? '\n');

    if (after !== existingSource) {
      changes.push({ path: PROFILE_SCHEMA, before: existingSource ?? null, after });
    }

    changes.push({ path: UP_USER_SCHEMA, before: upSource, after: null });
  }

  return { changes, findings };
};
