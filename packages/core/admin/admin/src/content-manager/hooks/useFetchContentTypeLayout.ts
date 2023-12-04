import { useCallback, useEffect, useReducer, useRef } from 'react';

import { useFetchClient } from '@strapi/helper-plugin';
import { Contracts } from '@strapi/plugin-content-manager/_internal/shared';
import axios, { CancelTokenSource } from 'axios';
import produce from 'immer';

import { useTypedSelector } from '../../core/store/hooks';
import { selectModelAndComponentSchemas } from '../pages/App/reducer';
import { FormattedLayouts, formatLayouts } from '../utils/layouts';

/* -------------------------------------------------------------------------------------------------
 * useFetchContentTypeLayout
 * -----------------------------------------------------------------------------------------------*/

/**
 * TODO: this needs a huge refactor. It's purely based on when it's rendered which *will* lead
 * to bugs and issues.
 */
const useFetchContentTypeLayout = (contentTypeUID: string) => {
  const [{ error, isLoading, layout, layouts }, dispatch] = useReducer(reducer, initialState);
  const { schemas } = useTypedSelector(selectModelAndComponentSchemas);
  const isMounted = useRef(true);
  const { get } = useFetchClient();

  const getData = useCallback(
    async (uid: string, source: CancelTokenSource) => {
      if (layouts[uid]) {
        dispatch({ type: 'SET_LAYOUT_FROM_STATE', uid });

        return;
      }
      dispatch({ type: 'GET_DATA' });

      try {
        const {
          data: { data },
        } = await get<Contracts.ContentTypes.FindContentTypeConfiguration.Response>(
          `/content-manager/content-types/${uid}/configuration`,
          {
            cancelToken: source.token,
          }
        );

        dispatch({
          type: 'GET_DATA_SUCCEEDED',
          data: formatLayouts(data, schemas),
        });
      } catch (error) {
        if (axios.isCancel(error)) {
          return;
        }
        if (isMounted.current) {
          console.error(error);
        }

        if (isMounted.current) {
          dispatch({ type: 'GET_DATA_ERROR', error });
        }
      }
    },
    [layouts, schemas, get]
  );

  useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);

  useEffect(() => {
    const CancelToken = axios.CancelToken;
    const source = CancelToken.source();

    getData(contentTypeUID, source);

    return () => {
      source.cancel('Operation canceled by the user.');
    };
  }, [contentTypeUID, getData]);

  const updateLayout = useCallback(
    (data: Contracts.ContentTypes.FindContentTypeConfiguration.Response['data']) => {
      dispatch({
        type: 'UPDATE_LAYOUT',
        newLayout: formatLayouts(data, schemas),
      });
    },
    [schemas]
  );

  return {
    error,
    isLoading,
    layout,
    updateLayout,
  };
};

/* -------------------------------------------------------------------------------------------------
 * Reducer
 * -----------------------------------------------------------------------------------------------*/

interface ContentTypeLayoutState {
  error: null | unknown;
  isLoading: boolean;
  layout: FormattedLayouts | null;
  layouts: Record<string, FormattedLayouts>;
}

const initialState = {
  error: null,
  isLoading: true,
  layout: null,
  layouts: {},
} satisfies ContentTypeLayoutState;

interface GetDataAction {
  type: 'GET_DATA';
}

interface GetDataSucceededAction {
  type: 'GET_DATA_SUCCEEDED';
  data: NonNullable<ContentTypeLayoutState['layout']>;
}

interface GetDataErrorAction {
  type: 'GET_DATA_ERROR';
  error: ContentTypeLayoutState['error'];
}

interface SetLayoutFromStateAction {
  type: 'SET_LAYOUT_FROM_STATE';
  uid: string;
}

interface UpdateLayoutAction {
  type: 'UPDATE_LAYOUT';
  newLayout: NonNullable<ContentTypeLayoutState['layout']>;
}

type Action =
  | GetDataAction
  | GetDataSucceededAction
  | GetDataErrorAction
  | SetLayoutFromStateAction
  | UpdateLayoutAction;

const reducer = (state: ContentTypeLayoutState = initialState, action: Action) =>
  produce(state, (draftState) => {
    switch (action.type) {
      case 'GET_DATA': {
        draftState.isLoading = true;
        draftState.error = null;
        draftState.layout = null;
        break;
      }
      case 'GET_DATA_SUCCEEDED': {
        const contentTypeUid = action.data.contentType.uid;

        draftState.layout = action.data;
        draftState.layouts[contentTypeUid] = action.data;
        draftState.isLoading = false;
        break;
      }
      case 'GET_DATA_ERROR': {
        draftState.isLoading = false;
        draftState.error = action.error;
        break;
      }
      case 'SET_LAYOUT_FROM_STATE': {
        draftState.error = null;
        draftState.layout = state.layouts[action.uid];
        break;
      }
      case 'UPDATE_LAYOUT': {
        const oldLayout = state.layout!;

        draftState.layout = {
          ...oldLayout,
          contentType: action.newLayout.contentType,
        };
        draftState.layouts[oldLayout.contentType.uid] = {
          ...oldLayout,
          contentType: action.newLayout.contentType,
        };
        break;
      }
      default:
        return draftState;
    }
  });

export { useFetchContentTypeLayout };
