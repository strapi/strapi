import {
  applyConditionsFormChange,
  getNewStateFromChangedValues,
  getSelectedValues,
  mergeConditionsForm,
} from '../conditions-form';

const ACTION_NAME = 'api::article.article.read';

const OPTIONS = [
  [
    'default',
    [{ id: 'admin::is-creator', displayName: 'Is creator', category: 'default' }],
  ],
  [
    'My Category',
    [{ id: 'admin::my-condition', displayName: 'My condition', category: 'My Category' }],
  ],
] as Array<[string, Array<{ id: string; displayName: string; category: string }>]>;

/** Builds the modal's initial state the same way createDefaultConditionsForm does. */
const createInitialState = () => ({
  [ACTION_NAME]: {
    default: { 'admin::is-creator': false },
    'My Category': { 'admin::my-condition': false },
  },
});

describe('conditions-form', () => {
  describe('custom condition categories (#27461)', () => {
    it('persists a condition selected in a custom category through change -> submit', () => {
      // Tick "My condition" (custom category) in the modal.
      const values = getNewStateFromChangedValues(OPTIONS, ['admin::my-condition']);

      const nextState = applyConditionsFormChange(
        createInitialState(),
        ACTION_NAME,
        values,
        OPTIONS
      );
      const submitted = mergeConditionsForm(nextState);

      expect(submitted[ACTION_NAME]).toEqual({
        'admin::is-creator': false,
        'admin::my-condition': true,
      });
    });

    it('persists a deselected custom-category condition as false', () => {
      const initialState = {
        [ACTION_NAME]: {
          default: { 'admin::is-creator': false },
          'My Category': { 'admin::my-condition': true },
        },
      };

      // Untick "My condition".
      const values = getNewStateFromChangedValues(OPTIONS, []);
      const nextState = applyConditionsFormChange(initialState, ACTION_NAME, values, OPTIONS);
      const submitted = mergeConditionsForm(nextState);

      expect(submitted[ACTION_NAME]).toEqual({
        'admin::is-creator': false,
        'admin::my-condition': false,
      });
    });

    it('does not count a selected condition twice across category buckets', () => {
      // The condition was persisted before, so its own category bucket holds `true`.
      const initialState = {
        [ACTION_NAME]: {
          default: { 'admin::is-creator': false },
          'My Category': { 'admin::my-condition': true },
        },
      };

      // Re-apply with "My condition" still ticked.
      const values = getNewStateFromChangedValues(OPTIONS, ['admin::my-condition']);

      const nextState = applyConditionsFormChange(initialState, ACTION_NAME, values, OPTIONS);

      // Before the fix, the change was written into the `default` bucket while the
      // custom category bucket kept its own copy, so the selected id appeared twice
      // ("2 currently selected" with one checkbox ticked).
      expect(getSelectedValues(nextState[ACTION_NAME]).sort()).toEqual(['admin::my-condition']);
    });

    it('keeps default-category conditions working', () => {
      const values = getNewStateFromChangedValues(OPTIONS, ['admin::is-creator']);

      const nextState = applyConditionsFormChange(
        createInitialState(),
        ACTION_NAME,
        values,
        OPTIONS
      );
      const submitted = mergeConditionsForm(nextState);

      expect(submitted[ACTION_NAME]).toEqual({
        'admin::is-creator': true,
        'admin::my-condition': false,
      });
    });
  });
});
