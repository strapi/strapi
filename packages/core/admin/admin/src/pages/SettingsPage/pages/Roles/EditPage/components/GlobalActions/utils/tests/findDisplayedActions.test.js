import findDisplayedActions from '../findDisplayedActions';

describe('ADMIN | COMPONENTS | Permissions | GlobalActions | utils', () => {
  describe('findDisplayedActions', () => {
    it('should return an empty array', () => {
      expect(findDisplayedActions([])).toHaveLength(0);
    });

    it('should filter the actions that have no subjects', () => {
      const actions = [
        { label: 'Create' },
        { label: 'Read', subject: [] },
        { label: 'Update', subjects: ['test'] },
      ];

      expect(findDisplayedActions(actions)).toHaveLength(1);
      expect(findDisplayedActions(actions)[0]).toEqual({ label: 'Update', subjects: ['test'] });
    });
  });
});
