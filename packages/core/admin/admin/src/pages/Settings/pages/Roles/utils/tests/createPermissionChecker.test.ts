import {
  createFieldPermissionChecker,
  createDynamicActionPermissionChecker,
} from '../createPermissionChecker';

import type { Permission as AuthPermission } from '../../../../../../features/Auth';

const ACTION_ID = 'plugin::content-manager.explorer.create';
const SUBJECT = 'api::article.article';

const makePermission = (
  action: string,
  subject?: string | null,
  fields?: string[] | undefined
): AuthPermission => ({
  action,
  subject,
  properties: fields !== undefined ? { fields } : {},
});

// ---------------------------------------------------------------------------
// createFieldPermissionChecker
// ---------------------------------------------------------------------------

describe('createFieldPermissionChecker', () => {
  describe('Role editing mode (userPermissions === undefined)', () => {
    it('returns undefined', () => {
      const result = createFieldPermissionChecker(ACTION_ID, SUBJECT, undefined);
      expect(result).toBeUndefined();
    });
  });

  describe('returns a checker function when userPermissions is provided', () => {
    it('returns a function', () => {
      const result = createFieldPermissionChecker(ACTION_ID, SUBJECT, []);
      expect(typeof result).toBe('function');
    });
  });

  describe('checker function - no matching permission', () => {
    it('returns false when no permission matches the action', () => {
      const permissions: AuthPermission[] = [makePermission('other.action', SUBJECT)];
      const check = createFieldPermissionChecker(ACTION_ID, SUBJECT, permissions)!;
      expect(check(['fields', 'title'])).toBe(false);
    });

    it('returns false when permission action matches but subject differs', () => {
      const permissions: AuthPermission[] = [makePermission(ACTION_ID, 'api::other.other')];
      const check = createFieldPermissionChecker(ACTION_ID, SUBJECT, permissions)!;
      expect(check(['fields', 'title'])).toBe(false);
    });

    it('returns false when permission subject is null but expected subject is not', () => {
      const permissions: AuthPermission[] = [makePermission(ACTION_ID, null)];
      const check = createFieldPermissionChecker(ACTION_ID, SUBJECT, permissions)!;
      expect(check(['fields', 'title'])).toBe(false);
    });

    it('returns true when action and subject both match (positive anchor)', () => {
      const permissions: AuthPermission[] = [makePermission(ACTION_ID, SUBJECT, ['title'])];
      const check = createFieldPermissionChecker(ACTION_ID, SUBJECT, permissions)!;
      expect(check(['fields', 'title'])).toBe(true);
    });
  });

  describe('checker function - matching permission found', () => {
    describe('non-field paths (no "fields" segment)', () => {
      it('returns true for a path without "fields"', () => {
        const permissions: AuthPermission[] = [makePermission(ACTION_ID, SUBJECT)];
        const check = createFieldPermissionChecker(ACTION_ID, SUBJECT, permissions)!;
        expect(check(['contentType', 'enabled'])).toBe(true);
      });

      it('returns true for an empty path', () => {
        const permissions: AuthPermission[] = [makePermission(ACTION_ID, SUBJECT)];
        const check = createFieldPermissionChecker(ACTION_ID, SUBJECT, permissions)!;
        expect(check([])).toBe(true);
      });

      it('returns true when "fields" is the last segment (no field name follows)', () => {
        const permissions: AuthPermission[] = [makePermission(ACTION_ID, SUBJECT)];
        const check = createFieldPermissionChecker(ACTION_ID, SUBJECT, permissions)!;
        expect(check(['contentType', 'fields'])).toBe(true);
      });
    });

    describe('field paths - unrestricted permission (fields null/undefined)', () => {
      it('returns true when properties.fields is null', () => {
        const permissions: AuthPermission[] = [makePermission(ACTION_ID, SUBJECT)];
        const check = createFieldPermissionChecker(ACTION_ID, SUBJECT, permissions)!;
        expect(check(['fields', 'title'])).toBe(true);
      });

      it('returns true when properties.fields is undefined (no properties key)', () => {
        const permissions: AuthPermission[] = [makePermission(ACTION_ID, SUBJECT, undefined)];
        const check = createFieldPermissionChecker(ACTION_ID, SUBJECT, permissions)!;
        expect(check(['fields', 'title'])).toBe(true);
      });
    });

    describe('field paths - restricted permission (fields is an array)', () => {
      it('returns false when fields array is empty', () => {
        const permissions: AuthPermission[] = [makePermission(ACTION_ID, SUBJECT, [])];
        const check = createFieldPermissionChecker(ACTION_ID, SUBJECT, permissions)!;
        expect(check(['fields', 'title'])).toBe(false);
      });

      it('returns true for an exact field match', () => {
        const permissions: AuthPermission[] = [makePermission(ACTION_ID, SUBJECT, ['title'])];
        const check = createFieldPermissionChecker(ACTION_ID, SUBJECT, permissions)!;
        expect(check(['fields', 'title'])).toBe(true);
      });

      it('returns false for a field not in the allowed list', () => {
        const permissions: AuthPermission[] = [makePermission(ACTION_ID, SUBJECT, ['title'])];
        const check = createFieldPermissionChecker(ACTION_ID, SUBJECT, permissions)!;
        expect(check(['fields', 'body'])).toBe(false);
      });

      it('returns true for a nested field that starts with an allowed prefix', () => {
        const permissions: AuthPermission[] = [makePermission(ACTION_ID, SUBJECT, ['author'])];
        const check = createFieldPermissionChecker(ACTION_ID, SUBJECT, permissions)!;
        // path: ['fields', 'author', 'name'] → fieldPath = 'author.name'
        expect(check(['fields', 'author', 'name'])).toBe(true);
      });

      it('returns false for a field that is a prefix of an allowed field (not a descendant)', () => {
        const permissions: AuthPermission[] = [makePermission(ACTION_ID, SUBJECT, ['authorName'])];
        const check = createFieldPermissionChecker(ACTION_ID, SUBJECT, permissions)!;
        // 'author' !== 'authorName' and 'author' does not start with 'authorName.'
        expect(check(['fields', 'author'])).toBe(false);
      });

      it('returns true when multiple fields are allowed and the queried one matches', () => {
        const permissions: AuthPermission[] = [
          makePermission(ACTION_ID, SUBJECT, ['title', 'body', 'author']),
        ];
        const check = createFieldPermissionChecker(ACTION_ID, SUBJECT, permissions)!;
        expect(check(['fields', 'body'])).toBe(true);
      });
    });

    describe('subject === null (plugins/settings)', () => {
      it('matches when subject is null', () => {
        const permissions: AuthPermission[] = [makePermission(ACTION_ID, null, ['title'])];
        const check = createFieldPermissionChecker(ACTION_ID, null, permissions)!;
        expect(check(['fields', 'title'])).toBe(true);
      });
    });
  });
});

// ---------------------------------------------------------------------------
// createDynamicActionPermissionChecker
// ---------------------------------------------------------------------------

describe('createDynamicActionPermissionChecker', () => {
  describe('Role editing mode / undefined subject', () => {
    it('returns undefined when userPermissions is undefined', () => {
      const result = createDynamicActionPermissionChecker(SUBJECT, ACTION_ID, undefined);
      expect(result).toBeUndefined();
    });

    it('returns undefined when subject is undefined', () => {
      const result = createDynamicActionPermissionChecker(undefined, ACTION_ID, []);
      expect(result).toBeUndefined();
    });
  });

  describe('returns a checker function when both subject and userPermissions are provided', () => {
    it('returns a function', () => {
      const result = createDynamicActionPermissionChecker(SUBJECT, ACTION_ID, []);
      expect(typeof result).toBe('function');
    });
  });

  describe('checker function - action resolved from context', () => {
    it('returns false when no matching permission exists for the contextual actionId', () => {
      const permissions: AuthPermission[] = [makePermission('other.action', SUBJECT)];
      const check = createDynamicActionPermissionChecker(SUBJECT, ACTION_ID, permissions)!;
      expect(check(['someField'])).toBe(false);
    });

    it('returns true for a non-field path when permission matches', () => {
      const permissions: AuthPermission[] = [makePermission(ACTION_ID, SUBJECT)];
      const check = createDynamicActionPermissionChecker(SUBJECT, ACTION_ID, permissions)!;
      expect(check(['enabled'])).toBe(true);
    });

    it('returns true for an empty path when permission matches', () => {
      const permissions: AuthPermission[] = [makePermission(ACTION_ID, SUBJECT)];
      const check = createDynamicActionPermissionChecker(SUBJECT, ACTION_ID, permissions)!;
      expect(check([])).toBe(true);
    });
  });

  describe('checker function - action extracted from path (actionIdFromContext is undefined)', () => {
    it('extracts a plugin:: action from path[0] and allows a non-field path', () => {
      const pluginAction = 'plugin::content-manager.explorer.read';
      const permissions: AuthPermission[] = [makePermission(pluginAction, SUBJECT)];
      const check = createDynamicActionPermissionChecker(SUBJECT, undefined, permissions)!;
      expect(check([pluginAction, 'enabled'])).toBe(true);
    });

    it('extracts an admin:: action from path[0] and allows a non-field path', () => {
      const adminAction = 'admin::roles.create';
      const permissions: AuthPermission[] = [makePermission(adminAction, SUBJECT)];
      const check = createDynamicActionPermissionChecker(SUBJECT, undefined, permissions)!;
      expect(check([adminAction, 'enabled'])).toBe(true);
    });

    it('returns false when path[0] is not a plugin:: or admin:: action and no contextual action', () => {
      const permissions: AuthPermission[] = [makePermission(ACTION_ID, SUBJECT)];
      const check = createDynamicActionPermissionChecker(SUBJECT, undefined, permissions)!;
      // path[0] is plain text - cannot extract an action
      expect(check(['regularField'])).toBe(false);
    });

    it('returns false when path is empty and no contextual action', () => {
      const permissions: AuthPermission[] = [makePermission(ACTION_ID, SUBJECT)];
      const check = createDynamicActionPermissionChecker(SUBJECT, undefined, permissions)!;
      expect(check([])).toBe(false);
    });
  });

  describe('checker function - field-level restrictions', () => {
    it('returns true when fields is null (unrestricted)', () => {
      const permissions: AuthPermission[] = [makePermission(ACTION_ID, SUBJECT)];
      const check = createDynamicActionPermissionChecker(SUBJECT, ACTION_ID, permissions)!;
      expect(check(['fields', 'title'])).toBe(true);
    });

    it('returns false when fields is an empty array', () => {
      const permissions: AuthPermission[] = [makePermission(ACTION_ID, SUBJECT, [])];
      const check = createDynamicActionPermissionChecker(SUBJECT, ACTION_ID, permissions)!;
      expect(check(['fields', 'title'])).toBe(false);
    });

    it('returns true for an exact field match', () => {
      const permissions: AuthPermission[] = [makePermission(ACTION_ID, SUBJECT, ['title'])];
      const check = createDynamicActionPermissionChecker(SUBJECT, ACTION_ID, permissions)!;
      expect(check(['fields', 'title'])).toBe(true);
    });

    it('returns false for a field not in the allowed list', () => {
      const permissions: AuthPermission[] = [makePermission(ACTION_ID, SUBJECT, ['title'])];
      const check = createDynamicActionPermissionChecker(SUBJECT, ACTION_ID, permissions)!;
      expect(check(['fields', 'body'])).toBe(false);
    });

    it('returns true for a nested field that starts with an allowed prefix', () => {
      const permissions: AuthPermission[] = [makePermission(ACTION_ID, SUBJECT, ['author'])];
      const check = createDynamicActionPermissionChecker(SUBJECT, ACTION_ID, permissions)!;
      expect(check(['fields', 'author', 'name'])).toBe(true);
    });

    it('returns true when "fields" is the last segment (no field name follows)', () => {
      const permissions: AuthPermission[] = [makePermission(ACTION_ID, SUBJECT, ['title'])];
      const check = createDynamicActionPermissionChecker(SUBJECT, ACTION_ID, permissions)!;
      expect(check(['fields'])).toBe(true);
    });

    describe('action extracted from path with field checking', () => {
      it('checks fields against the adjusted path (after slicing the action segment)', () => {
        const pluginAction = 'plugin::content-manager.explorer.read';
        const permissions: AuthPermission[] = [makePermission(pluginAction, SUBJECT, ['title'])];
        const check = createDynamicActionPermissionChecker(SUBJECT, undefined, permissions)!;
        // path: [pluginAction, 'fields', 'title'] → adjustedPath = ['fields', 'title']
        expect(check([pluginAction, 'fields', 'title'])).toBe(true);
        expect(check([pluginAction, 'fields', 'body'])).toBe(false);
      });
    });
  });

  describe('subject is null (plugins/settings)', () => {
    it('matches when subject is null', () => {
      const permissions: AuthPermission[] = [makePermission(ACTION_ID, null, ['title'])];
      const check = createDynamicActionPermissionChecker(null, ACTION_ID, permissions)!;
      expect(check(['fields', 'title'])).toBe(true);
    });
  });
});
