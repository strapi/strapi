import contentTypes from '..';
import challenge from '../mfa-challenge';
import recoveryCode from '../mfa-recovery-code';
import event from '../mfa-event';
import User from '../User';
import roleContentType from '../Role';

const schemas = { challenge, recoveryCode, event };

describe('mfa content types', () => {
  test('are registered under the expected keys', () => {
    expect(contentTypes['mfa-challenge'].schema).toBe(challenge);
    expect(contentTypes['mfa-recovery-code'].schema).toBe(recoveryCode);
    expect(contentTypes['mfa-event'].schema).toBe(event);
  });

  test.each(Object.entries(schemas))(
    '%s is hidden from the content manager and CTB',
    (_, schema) => {
      expect(schema.pluginOptions['content-manager'].visible).toBe(false);
      expect(schema.pluginOptions['content-type-builder'].visible).toBe(false);
    }
  );

  test.each(Object.entries(schemas))(
    '%s marks every attribute private, non-configurable, and non-searchable',
    (_, schema) => {
      for (const [name, attribute] of Object.entries(schema.attributes)) {
        const attr = attribute as {
          private?: boolean;
          configurable?: boolean;
          searchable?: boolean;
        };
        expect({
          name,
          private: attr.private,
          configurable: attr.configurable,
          searchable: attr.searchable,
        }).toEqual({
          name,
          private: true,
          configurable: false,
          searchable: false,
        });
      }
    }
  );

  test('challenge token is unique so it can be looked up directly', () => {
    expect(challenge.attributes.token.unique).toBe(true);
  });

  test('user gains the three mfa columns, all private and non-configurable', () => {
    for (const name of ['mfaSecret', 'mfaEnabledAt', 'mfaLastUsedStep']) {
      const attribute = User.attributes[name as keyof typeof User.attributes] as {
        private?: boolean;
        configurable?: boolean;
        searchable?: boolean;
      };
      expect(attribute).toBeDefined();
      expect(attribute.private).toBe(true);
      expect(attribute.configurable).toBe(false);
      expect(attribute.searchable).toBe(false);
    }
  });

  test('mfa columns are hidden in the user config, like the reset token', () => {
    expect(User.config.attributes.mfaSecret.hidden).toBe(true);
  });

  describe('cycle 2 enforcement columns', () => {
    test('admin::user declares the three enforcement columns as private datetimes/strings', () => {
      const { attributes } = User;
      expect(attributes.mfaPendingSecret).toEqual({
        type: 'string',
        configurable: false,
        private: true,
        searchable: false,
      });
      expect(attributes.mfaGraceUntil).toEqual({
        type: 'datetime',
        configurable: false,
        private: true,
        searchable: false,
      });
      expect(attributes.mfaLockedAt).toEqual({
        type: 'datetime',
        configurable: false,
        private: true,
        searchable: false,
      });
    });

    test('admin::role declares mfaRequired as a non-configurable boolean defaulting to false', () => {
      expect(roleContentType.attributes.mfaRequired).toEqual({
        type: 'boolean',
        default: false,
        configurable: false,
      });
    });
  });
});
