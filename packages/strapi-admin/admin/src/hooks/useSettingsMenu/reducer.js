import produce from 'immer';
import { set, unset } from 'lodash';

const initialState = {
  menu: [],
  isLoading: true,
};

const reducer = (state, action) =>
  // eslint-disable-next-line consistent-return
  produce(state, draftState => {
    switch (action.type) {
      case 'CHECK_PERMISSIONS_SUCCEEDED': {
        action.data.forEach(checkedPermissions => {
          if (checkedPermissions.hasPermission) {
            set(
              draftState,
              ['menu', ...checkedPermissions.path.split('.'), 'isDisplayed'],
              checkedPermissions.hasPermission
            );
          } else {
            unset(draftState, ['menu', ...checkedPermissions.path.split('.')]);
          }
        });

        draftState.isLoading = false;
        break;
      }

      default:
        return draftState;
    }
  });

export default reducer;
export { initialState };
