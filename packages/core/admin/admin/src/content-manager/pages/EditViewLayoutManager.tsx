import * as React from 'react';

import { LoadingIndicatorPage, useQueryParams, useStrapiApp } from '@strapi/helper-plugin';
import produce from 'immer';

import { HOOKS } from '../../constants';
import { useTypedDispatch, useTypedSelector } from '../../core/store/hooks';
import { useSyncRbac } from '../hooks/useSyncRbac';

import { ProtectedEditViewPage, ProtectedEditViewPageProps } from './EditView/EditViewPage';

import type { Contracts } from '@strapi/plugin-content-manager/_internal/shared';
import type { Attribute, Schema } from '@strapi/types';

const { MUTATE_EDIT_VIEW_LAYOUT } = HOOKS;

/* -------------------------------------------------------------------------------------------------
 * EditViewLayoutManager
 * -----------------------------------------------------------------------------------------------*/

type Configuration = Contracts.ContentTypes.Configuration;

type NonRelationLayout = Contracts.ContentTypes.Layouts['edit'][number][number] & {
  fieldSchema: Pick<Exclude<Attribute.Any, { type: 'relation' }>, 'pluginOptions' | 'type'>;
  /**
   * why is this trying to beplural? You don't pluralize metadata.
   *
   * TODO: does this object come from somewhere else in the codebase?
   */
  metadatas: {
    description: string;
    editable: boolean;
    label: string;
    placeholder: string;
    visible: boolean;
  };
};

interface RelationLayout extends Omit<NonRelationLayout, 'fieldSchema'> {
  fieldSchema: Pick<
    Extract<Attribute.Any, { type: 'relation' }>,
    'pluginOptions' | 'relation' | 'type'
  > & {
    mappedBy: string;
    relationType: string;
    target: string;
    targetModel: string;
  };
  queryInfos: {
    shouldDisplayRelationLink: boolean;
    defaultParams: {
      locale?: string;
      [key: string]: string | undefined;
    };
  };
  targetModelPluginOptions: object;
}

interface CMAdminConfiguration
  extends Omit<Configuration, 'layouts'>,
    Omit<Schema.ContentType, 'uid' | 'collectionName' | 'globalId' | 'modelName'> {
  apiID: string;
  isDisplayed: boolean;
  layouts: {
    list: null;
    edit: Array<RelationLayout | NonRelationLayout>[];
  };
}

interface EditViewLayoutManager extends ProtectedEditViewPageProps {
  layout: {
    components: Record<string, CMAdminConfiguration>;
    contentType: CMAdminConfiguration;
  };
}

const EditViewLayoutManager = ({ layout, ...rest }: EditViewLayoutManager) => {
  const currentLayout = useTypedSelector(
    (state) => state['content-manager_editViewLayoutManager'].currentLayout
  );
  const dispatch = useTypedDispatch();
  const [{ query }] = useQueryParams();
  const { runHookWaterfall } = useStrapiApp();
  const { permissions, isValid: isValidPermissions } = useSyncRbac(query, rest.slug, 'editView');

  React.useEffect(() => {
    // Allow the plugins to extend the edit view layout
    const mutatedLayout = runHookWaterfall(MUTATE_EDIT_VIEW_LAYOUT, { layout, query });

    dispatch(setLayout(mutatedLayout.layout, query));

    return () => {
      dispatch(resetProps());
    };
  }, [layout, dispatch, query, runHookWaterfall]);

  if (!currentLayout || !isValidPermissions) {
    return <LoadingIndicatorPage />;
  }

  return <ProtectedEditViewPage {...rest} userPermissions={permissions} />;
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
  layout: EditViewLayoutManager['layout'] | null;
  query: object;
}

const setLayout = (layout: SetLayoutAction['layout'], query: SetLayoutAction['query']) =>
  ({
    type: SET_LAYOUT,
    layout,
    query,
  } satisfies SetLayoutAction);

interface EditViewState {
  currentLayout: unknown | null;
}

const initialState = {
  currentLayout: null,
} satisfies EditViewState;

type Action = ResetPropsAction | SetLayoutAction;

const reducer = (state: EditViewState = initialState, action: Action) =>
  produce(state, (draftState) => {
    switch (action.type) {
      case RESET_PROPS: {
        draftState.currentLayout = null;
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
