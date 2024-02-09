import * as React from 'react';

import { LoadingIndicatorPage, useQueryParams, useStrapiApp } from '@strapi/helper-plugin';
import produce from 'immer';
import { useParams } from 'react-router-dom';

import { HOOKS } from '../../constants';
import { useTypedDispatch, useTypedSelector } from '../../core/store/hooks';
import { useContentTypeLayout } from '../hooks/useLayouts';
import { useSyncRbac } from '../hooks/useSyncRbac';

import { ProtectedEditViewPage } from './EditView/EditViewPage';

import type { FormattedLayouts } from '../utils/layouts';

const { MUTATE_EDIT_VIEW_LAYOUT } = HOOKS;

/* -------------------------------------------------------------------------------------------------
 * EditViewLayoutManager
 * -----------------------------------------------------------------------------------------------*/

const EditViewLayoutManager = () => {
  const currentLayout = useTypedSelector(
    (state) => state['content-manager_editViewLayoutManager'].currentLayout
  );
  const dispatch = useTypedDispatch();
  const [{ query }] = useQueryParams();
  const { runHookWaterfall } = useStrapiApp();
  const { slug } = useParams<{ slug: string }>();
  const { isLoading, layout } = useContentTypeLayout(slug);
  const { permissions, isValid: isValidPermissions } = useSyncRbac(query, slug, 'editView');

  React.useEffect(() => {
    if (layout) {
      // Allow the plugins to extend the edit view layout
      const mutatedLayout = runHookWaterfall(MUTATE_EDIT_VIEW_LAYOUT, { layout, query });

      dispatch(setLayout(mutatedLayout.layout, query));
    }

    return () => {
      dispatch(resetProps());
    };
  }, [layout, dispatch, query, runHookWaterfall]);

  if (isLoading || !currentLayout.contentType || !isValidPermissions) {
    return <LoadingIndicatorPage />;
  }

  return <ProtectedEditViewPage userPermissions={permissions ?? []} />;
};

/* -------------------------------------------------------------------------------------------------
 * Reducer
 * -----------------------------------------------------------------------------------------------*/

const RESET_PROPS = 'ContentManager/EditViewLayoutManager/RESET_PROPS';

interface ResetPropsAction {
  type: typeof RESET_PROPS;
}

const resetProps = () => ({ type: RESET_PROPS } satisfies ResetPropsAction);

const SET_LAYOUT = 'ContentManager/EditViewLayoutManager/SET_LAYOUT';

interface SetLayoutAction {
  type: typeof SET_LAYOUT;
  layout: FormattedLayouts;
  query: object;
}

const setLayout = (layout: SetLayoutAction['layout'], query: SetLayoutAction['query']) =>
  ({
    type: SET_LAYOUT,
    layout,
    query,
  } satisfies SetLayoutAction);

interface EditViewLayoutManagerState {
  currentLayout: {
    components: FormattedLayouts['components'];
    contentType: FormattedLayouts['contentType'] | null;
  };
}

const initialState = {
  currentLayout: {
    components: {},
    contentType: null,
  },
} satisfies EditViewLayoutManagerState;

type Action = ResetPropsAction | SetLayoutAction;

const reducer = (state: EditViewLayoutManagerState = initialState, action: Action) =>
  produce(state, (draftState) => {
    switch (action.type) {
      case RESET_PROPS: {
        draftState.currentLayout = initialState.currentLayout;
        break;
      }
      case SET_LAYOUT: {
        draftState.currentLayout = action.layout;
        break;
      }
      default:
        return draftState;
    }
  });

export { EditViewLayoutManager, reducer, setLayout };
export type { EditViewLayoutManagerState };
