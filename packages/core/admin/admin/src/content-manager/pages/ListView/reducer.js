/**
 *
 * listView reducer
 */

import produce from 'immer';
import get from 'lodash/get';

import {
  GET_DATA,
  GET_DATA_SUCCEEDED,
  ON_CHANGE_LIST_HEADERS,
  ON_RESET_LIST_HEADERS,
  RESET_PROPS,
  SET_LIST_LAYOUT,
} from './constants';

export const initialState = {
  data: [],
  isLoading: true,
  contentType: {},
  components: [],
  initialDisplayedHeaders: [],
  displayedHeaders: [],
  pagination: {
    total: 0,
  },
};

const listViewReducer = (state = initialState, action) =>
  // eslint-disable-next-line consistent-return
  produce(state, (draftState) => {
    switch (action.type) {
      case GET_DATA: {
        return {
          ...initialState,
          contentType: state.contentType,
          components: state.components,
          initialDisplayedHeaders: state.initialDisplayedHeaders,
          displayedHeaders: state.displayedHeaders,
        };
      }

      case GET_DATA_SUCCEEDED: {
        draftState.pagination = action.pagination;
        draftState.data = action.data;
        draftState.isLoading = false;
        break;
      }

      case ON_CHANGE_LIST_HEADERS: {
        const {
          target: { name, value },
        } = action;

        if (!value) {
          const { metadatas, attributes, uid } = state.contentType;
          const metas = metadatas[name].list;
          const header = {
            name,
            fieldSchema: attributes[name],
            metadatas: metas,
            key: `__${name}_key__`,
          };

          switch (attributes[name].type) {
            case 'component': {
              const componentName = attributes[name].component;
              const mainFieldName = get(
                state,
                ['components', componentName, 'settings', 'mainField'],
                null
              );
              const mainFieldAttribute = get(state, [
                'components',
                componentName,
                'attributes',
                mainFieldName,
              ]);

              draftState.displayedHeaders.push({
                ...header,
                metadatas: {
                  ...metas,
                  mainField: {
                    ...mainFieldAttribute,
                    name: mainFieldName,
                  },
                },
              });
              break;
            }

            case 'relation':
              draftState.displayedHeaders.push({
                ...header,
                queryInfos: {
                  defaultParams: {},
                  endPoint: `collection-types/${uid}`,
                },
              });
              break;

            default:
              draftState.displayedHeaders.push(header);
          }
        } else {
          draftState.displayedHeaders = state.displayedHeaders.filter(
            (header) => header.name !== name
          );
        }

        break;
      }
      case ON_RESET_LIST_HEADERS: {
        draftState.displayedHeaders = state.initialDisplayedHeaders;
        break;
      }
      case RESET_PROPS: {
        return initialState;
      }
      case SET_LIST_LAYOUT: {
        const { contentType, components, displayedHeaders } = action;

        draftState.contentType = contentType;
        draftState.components = components;
        draftState.displayedHeaders = displayedHeaders;
        draftState.initialDisplayedHeaders = displayedHeaders;

        break;
      }
      default:
        return draftState;
    }
  });

export default listViewReducer;
