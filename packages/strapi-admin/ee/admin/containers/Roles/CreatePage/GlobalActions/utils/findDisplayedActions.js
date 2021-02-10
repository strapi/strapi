import { sortBy } from 'lodash';

const findDisplayedActions = actions =>
  sortBy(
    actions.filter(({ subjects }) => subjects && subjects.length),
    'label'
  );

export default findDisplayedActions;
