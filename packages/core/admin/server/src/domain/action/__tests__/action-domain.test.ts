import domain from '..';

describe('Action Domain', () => {
  describe('appliesToProperty', () => {
    test('Should return false when action.options.applyToProperties is Nil', () => {
      const action: any = { options: {} };
      const property: any = 'foo';

      const result = domain.appliesToProperty(property, action);

      expect(result).toBe(false);
    });

    test('Should return true when action.options.applyToProperties contains the property', () => {
      const action: any = { options: { applyToProperties: ['foo', 'bar'] } };
      const property: any = 'foo';

      const result = domain.appliesToProperty(property, action);

      expect(result).toBe(true);
    });

    test('Should allow currying (arity of 2)', () => {
      const action: any = { options: { applyToProperties: ['foo', 'bar'] } };
      const property: any = 'foo';

      const curriedForProperty = domain.appliesToProperty(property);
      const result = curriedForProperty(action);

      expect(result).toBe(true);
    });
  });

  describe('appliesToSubject', () => {
    test('Should return false when action.subjects is not an array (applies to no subjects)', () => {
      const action: any = {};
      const subject: any = 'foo';

      const result = domain.appliesToSubject(subject, action);

      expect(result).toBe(false);
    });

    test('Should return true when action.subjects contains the subject', () => {
      const action: any = { subjects: ['foo', 'bar'] };
      const subject: any = 'foo';

      const result = domain.appliesToSubject(subject, action);

      expect(result).toBe(true);
    });

    test(`Should return false when action.subjects doesn't contains the subject`, () => {
      const action: any = { subjects: ['foo', 'bar'] };
      const subject: any = 'foobar';

      const result = domain.appliesToSubject(subject, action);

      expect(result).toBe(false);
    });

    test('Should allow currying (arity of 2)', () => {
      const action: any = { subjects: ['foo', 'bar'] };
      const subject: any = 'foo';

      const curriedForSubject = domain.appliesToSubject(subject);
      const result = curriedForSubject(action);

      expect(result).toBe(true);
    });
  });

  describe('assignActionId', () => {
    test('Create a new action with an actionId attribute. Prevent mutation on original object', () => {
      const action: any = { uid: 'foobar' };

      const newAction = domain.assignActionId(action);

      // Original action shouldn't be mutated
      expect(action).not.toHaveProperty('actionId');
      // The new action should match the original one and add a new actionId attribute
      expect(newAction).toMatchObject(action);
      expect(newAction).toHaveProperty('actionId', 'api::foobar');
    });
  });

  describe('assignOrOmitSubCategory', () => {
    test('Should keep the subCategory property if action.section is "settings"', () => {
      const action: any = { section: 'settings', subCategory: 'foo' };

      const newAction = domain.assignOrOmitSubCategory(action);

      expect(newAction).toHaveProperty('subCategory', 'foo');
    });

    test('Should keep the subCategory property if action.section is "plugins"', () => {
      const action: any = { section: 'plugins', subCategory: 'foo' };

      const newAction = domain.assignOrOmitSubCategory(action);

      expect(newAction).toHaveProperty('subCategory', 'foo');
    });

    test('Should add a generic subCategory property if action.section is "settings" or "plugins" and action.subCategory is not defined', () => {
      const action: any = { section: 'settings' };

      const newAction = domain.assignOrOmitSubCategory(action);

      expect(newAction).toHaveProperty('subCategory', 'general');
    });

    test(`Shouldn't add the subCategory property if action.section is not "settings" or "plugins"`, () => {
      const action: any = { section: 'contentTypes' };

      const newAction = domain.assignOrOmitSubCategory(action);

      expect(newAction).not.toHaveProperty('subCategory');
    });

    test(`Should omit the subCategory property if action.section is not "settings" or "plugins"`, () => {
      const action: any = { section: 'contentTypes', subCategory: 'foo' };

      const newAction = domain.assignOrOmitSubCategory(action);

      expect(newAction).not.toHaveProperty('subCategory');
    });
  });

  describe('create', () => {
    test('Should register an action with the minimum amount of information', () => {
      const action: any = { section: 'contentTypes', uid: 'foo' };
      const expected: any = { section: 'contentTypes', actionId: 'api::foo' };

      const result = domain.create(action);

      expect(result).toMatchObject(expected);
    });

    test('Should handle multiple step of transformation', () => {
      const action: any = {
        section: 'settings',
        uid: 'foo',
        pluginName: 'bar',
        subCategory: 'foobar',
        invalidAttribute: 'foobar',
      };

      const expected = {
        section: 'settings',
        pluginName: 'bar',
        actionId: 'plugin::bar.foo',
        subCategory: 'foobar',
      };

      const result = domain.create(action);

      expect(result).toMatchObject(expected);
    });
  });

  describe('computeActionId', () => {
    test('Should return an actionId prefixed with "api::" when there is no pluginName', () => {
      const attributes: any = { uid: 'foobar' };

      const actionId = domain.computeActionId(attributes);

      expect(actionId).toBe('api::foobar');
    });

    test('Should return an actionId prefixed with "admin::" when the pluginName is "admin"', () => {
      const attributes: any = { uid: 'foobar', pluginName: 'admin' };

      const actionId = domain.computeActionId(attributes);

      expect(actionId).toBe('admin::foobar');
    });

    test('Should return an actionId prefixed with "plugin::" when there is a pluginName (other than admin)', () => {
      const attributes: any = { uid: 'foobar', pluginName: 'myPlugin' };

      const actionId = domain.computeActionId(attributes);

      expect(actionId).toBe('plugin::myPlugin.foobar');
    });
  });

  describe('getDefaultActionAttributes', () => {
    test(`Default action attributes contains only elements from domain.actionFields`, () => {
      const defaultAction = domain.getDefaultActionAttributes();
      const attributes = Object.keys(defaultAction);

      attributes.forEach((attribute) => expect(domain.actionFields).toContain(attribute));
    });
  });

  describe('sanitizeActionAttributes', () => {
    const getSortedAttributes = (object: any) => Object.keys(object).sort();

    test(`It shouldn't remove attributes contained in domain.actionFields`, () => {
      const action: any = domain.actionFields.reduce(
        (attrs, attrName) => ({ ...attrs, [attrName]: 'foo' }),
        {}
      );

      const sanitizedAction = domain.sanitizeActionAttributes(action);

      expect(sanitizedAction).toMatchObject(action);
      expect(getSortedAttributes(sanitizedAction)).toEqual(getSortedAttributes(action));
    });

    test('It should remove attributes not contained in domain.actionFields', () => {
      const invalidAttributes = ['foo', 'bar'];
      const action: any = domain.actionFields
        .concat(invalidAttributes as any)
        .reduce((attrs, attrName) => ({ ...attrs, [attrName]: 'foo' }), {});

      const sanitizedAction = domain.sanitizeActionAttributes(action);

      expect(getSortedAttributes(sanitizedAction)).not.toEqual(getSortedAttributes(action));
      invalidAttributes.forEach((attribute) =>
        expect(sanitizedAction).not.toHaveProperty(attribute)
      );
    });
  });
});
