/**
 *
 * listView reducer
 */

import produce from 'immer';
import {
  GET_DATA,
  GET_DATA_SUCCEEDED,
  RESET_PROPS,
  ON_CHANGE_LIST_HEADERS,
  ON_RESET_LIST_HEADERS,
  SET_LIST_LAYOUT,
} from './constants';

export const initialState = {
  data: [],
  isLoading: true,
  contentType: {},
  initialDisplayedHeaders: [],
  displayedHeaders: [],
  pagination: {
    total: 0,
  },
};

const listViewReducer = (state = initialState, action) =>
  // eslint-disable-next-line consistent-return
  produce(state, drafState => {
    switch (action.type) {
      case GET_DATA: {
        return {
          ...initialState,
          contentType: state.contentType,
          initialDisplayedHeaders: state.initialDisplayedHeaders,
          displayedHeaders: state.displayedHeaders,
        };
      }

      case GET_DATA_SUCCEEDED: {
        drafState.pagination = action.pagination;
        drafState.data = action.data;
        drafState.isLoading = false;
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

          if (attributes[name].type === 'relation') {
            drafState.displayedHeaders.push({
              ...header,
              queryInfos: {
                defaultParams: {},
                endPoint: `collection-types/${uid}`,
              },
            });
          } else {
            drafState.displayedHeaders.push(header);
          }
        } else {
          drafState.displayedHeaders = state.displayedHeaders.filter(
            header => header.name !== name
          );
        }

        break;
      }
      case ON_RESET_LIST_HEADERS: {
        drafState.displayedHeaders = state.initialDisplayedHeaders;
        break;
      }
      case RESET_PROPS: {
        return initialState;
      }
      case SET_LIST_LAYOUT: {
        const { contentType, displayedHeaders } = action;

        drafState.contentType = contentType;
        drafState.displayedHeaders = displayedHeaders;
        drafState.initialDisplayedHeaders = displayedHeaders;

        break;
      }
      default:
        return drafState;
    }
  });

export default listViewReducer;
