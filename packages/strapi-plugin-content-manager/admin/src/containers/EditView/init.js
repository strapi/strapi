import { fromJS } from 'immutable';
import { get } from 'lodash';

const setDefaultForm = attributes => {
  return Object.keys(attributes).reduce((acc, current) => {
    const defaultValue = get(attributes, [current, 'default']);

    if (defaultValue !== undefined) {
      acc[current] = defaultValue;
    }

    return acc;
  }, {});
};

function init(initialState, layout, isCreatingEntry) {
  if (isCreatingEntry) {
    const defaultForm = setDefaultForm(
      get(layout, ['schema', 'attributes'], {})
    );

    return initialState
      .update('initialData', () => fromJS(defaultForm))
      .update('modifiedData', () => fromJS(defaultForm));
  }

  return initialState;
}

export default init;
