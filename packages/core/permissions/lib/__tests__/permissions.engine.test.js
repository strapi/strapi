'use strict';

const permissions = require('../');

describe('Permissions Engine', () => {
  let engine;

  const providers = {
    action: { get: jest.fn() },
    condition: { values: jest.fn(() => []) },
  };

  const permissionList = [
    { action: 'read' },
    { action: 'delete', subject: 'foo' },
    { action: 'update', subject: 'bar', properties: { fields: ['foobar'] } },
    {
      action: 'create',
      subject: 'foo',
      properties: { fields: ['foobar'] },
      conditions: ['isAuthor'],
    },
  ];

  beforeEach(async () => {
    engine = permissions.engine.new({ providers });
    jest.spyOn(engine, 'generateAbility');
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('generateAbility', () => {
    it('successfully generates', async () => {
      const ability = await engine.generateAbility(permissionList);
      expect(ability).not.toBeUndefined();
      expect(typeof ability).toBe('object');
    });
  });

  describe('ability', () => {
    let ability;
    beforeAll(async () => {
      ability = await engine.generateAbility(permissionList);
      expect(engine.generateAbility).toHaveBeenCalled();
      jest.spyOn(ability, 'can');
    });

    describe('can', () => {
      it('returns true when action matches', async () => {
        expect(ability.can('read')).toBeTruthy();
      });
      it('returns false for actions that do not exist', async () => {
        expect(ability.can('i_dont_exist')).toBeFalsy();
        expect(ability.can('foo')).toBeFalsy();
        expect(ability.can('bar')).toBeFalsy();
        expect(ability.can('isAuthor')).toBeFalsy();
        expect(ability.can('foobar')).toBeFalsy();
      });
      it('returns false when subject does not match', async () => {
        expect(ability.can('delete', 'bar')).toBeFalsy();
      });
      it('returns true when subject matches', async () => {
        expect(ability.can('delete', 'foo')).toBeTruthy();
      });
    });
  });
});
