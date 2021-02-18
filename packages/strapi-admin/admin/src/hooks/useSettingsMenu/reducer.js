import produce from 'immer';
import { set } from 'lodash';

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
          }
        });

        // Remove the not needed links in each section
        draftState.menu.forEach((section, sectionIndex) => {
          draftState.menu[sectionIndex].links = section.links.filter(
            link => link.isDisplayed === true
          );
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
