import * as React from 'react';

import { LoadingIndicatorPage, useQueryParams, useStrapiApp } from '@strapi/helper-plugin';
import produce from 'immer';

import { HOOKS } from '../../constants';
import { useTypedDispatch, useTypedSelector } from '../../core/store/hooks';
import { useSyncRbac } from '../hooks/useSyncRbac';

import { ProtectedEditViewPage, ProtectedEditViewPageProps } from './EditView/EditViewPage';

import type { FormattedLayouts } from '../utils/layouts';

const { MUTATE_EDIT_VIEW_LAYOUT } = HOOKS;

/* -------------------------------------------------------------------------------------------------
 * EditViewLayoutManager
 * -----------------------------------------------------------------------------------------------*/
interface EditViewLayoutManagerProps extends ProtectedEditViewPageProps {
  layout: FormattedLayouts;
}

const EditViewLayoutManager = ({ layout, ...rest }: EditViewLayoutManagerProps) => {
  const currentLayout = useTypedSelector(
    (state) => state['content-manager_editViewLayoutManager'].currentLayout
  );
  const dispatch = useTypedDispatch();
  const [{ query }] = useQueryParams();
  const { runHookWaterfall } = useStrapiApp();
  const { permissions, isValid: isValidPermissions } = useSyncRbac(
    query,
    rest.match.params.slug,
    'editView'
  );

  React.useEffect(() => {
    // Allow the plugins to extend the edit view layout
    const mutatedLayout = runHookWaterfall(MUTATE_EDIT_VIEW_LAYOUT, { layout, query });

    dispatch(setLayout(mutatedLayout.layout, query));

    return () => {
      dispatch(resetProps());
    };
  }, [layout, dispatch, query, runHookWaterfall]);

  if (!currentLayout.contentType || !isValidPermissions) {
    return <LoadingIndicatorPage />;
  }

  return <ProtectedEditViewPage {...rest} userPermissions={permissions ?? []} />;
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
  layout: EditViewLayoutManagerProps['layout'];
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
    components: EditViewLayoutManagerProps['layout']['components'];
    contentType: EditViewLayoutManagerProps['layout']['contentType'] | null;
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

export { EditViewLayoutManager, reducer };
export type { EditViewLayoutManagerProps, EditViewLayoutManagerState };
