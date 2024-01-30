import * as React from 'react';

import { LoadingIndicatorPage, useQueryParams } from '@strapi/helper-plugin';
import produce from 'immer';
import { useNavigate, useParams } from 'react-router-dom';

import { useTypedDispatch } from '../../core/store/hooks';
import { useFindRedirectionLink } from '../hooks/useFindRedirectionLink';
import { useContentTypeLayout } from '../hooks/useLayouts';
import { useSyncRbac } from '../hooks/useSyncRbac';
import { FormattedLayouts, ListLayoutRow } from '../utils/layouts';

import { ProtectedListViewPage } from './ListView/ListViewPage';

/* -------------------------------------------------------------------------------------------------
 * ListViewLayoutManager
 * -----------------------------------------------------------------------------------------------*/

const ListViewLayoutManager = () => {
  const dispatch = useTypedDispatch();
  const navigate = useNavigate();
  const { slug } = useParams<{ slug: string }>();
  const [{ query, rawQuery }] = useQueryParams();
  const { permissions, isValid: isValidPermissions } = useSyncRbac(query, slug, 'listView');
  const { isLoading, layout } = useContentTypeLayout(slug);
  const redirectionLink = useFindRedirectionLink(slug ?? '');

  React.useEffect(() => {
    if (!rawQuery) {
      navigate(redirectionLink, { replace: true });
    }
  }, [rawQuery, navigate, redirectionLink]);

  React.useEffect(() => {
    if (layout) {
      dispatch(setLayout(layout));
    }
  }, [dispatch, layout]);

  React.useEffect(() => {
    return () => {
      dispatch(resetProps());
    };
  }, [dispatch]);

  if (isLoading) {
    return <LoadingIndicatorPage />;
  }

  if (!isValidPermissions || !layout) {
    return null;
  }

  return <ProtectedListViewPage layout={layout} permissions={permissions} />;
};

/* -------------------------------------------------------------------------------------------------
 * Reducer
 * -----------------------------------------------------------------------------------------------*/

const RESET_PROPS = 'ContentManager/ListView/RESET_PROPS';
const ON_CHANGE_LIST_HEADERS = 'ContentManager/ListView/ON_CHANGE_LIST_HEADERS ';
const ON_RESET_LIST_HEADERS = 'ContentManager/ListView/ON_RESET_LIST_HEADERS ';
const SET_LIST_LAYOUT = 'ContentManager/ListView/SET_LIST_LAYOUT ';

interface ListViewLayoutManagerState {
  contentType: FormattedLayouts['contentType'] | null;
  components: FormattedLayouts['components'];
  displayedHeaders: ListLayoutRow[];
  initialDisplayedHeaders: ListLayoutRow[];
}

const initialState = {
  components: {},
  contentType: null,
  initialDisplayedHeaders: [],
  displayedHeaders: [],
} satisfies ListViewLayoutManagerState;

interface onResetListHeadersAction {
  type: typeof ON_RESET_LIST_HEADERS;
}

const onResetListHeaders = () =>
  ({ type: ON_RESET_LIST_HEADERS } satisfies onResetListHeadersAction);

interface ResetPropsAction {
  type: typeof RESET_PROPS;
}

function resetProps() {
  return { type: RESET_PROPS } satisfies ResetPropsAction;
}

interface SetLayoutAction
  extends Pick<ListViewLayoutManagerState, 'components' | 'displayedHeaders'> {
  type: typeof SET_LIST_LAYOUT;
  contentType: NonNullable<ListViewLayoutManagerState['contentType']>;
}

const setLayout = ({
  components,
  contentType,
}: Pick<SetLayoutAction, 'components' | 'contentType'>) =>
  ({
    contentType,
    components,
    displayedHeaders: contentType.layouts.list,
    type: SET_LIST_LAYOUT,
  } satisfies SetLayoutAction);

interface OnChangeListHeadersAction {
  type: typeof ON_CHANGE_LIST_HEADERS;
  target: {
    name: string;
    value: boolean;
  };
}

const onChangeListHeaders = (target: OnChangeListHeadersAction['target']) =>
  ({ type: ON_CHANGE_LIST_HEADERS, target } satisfies OnChangeListHeadersAction);

type Action =
  | ResetPropsAction
  | SetLayoutAction
  | OnChangeListHeadersAction
  | onResetListHeadersAction;

const reducer = (state: ListViewLayoutManagerState = initialState, action: Action) =>
  produce(state, (draftState) => {
    switch (action.type) {
      case ON_CHANGE_LIST_HEADERS: {
        const {
          target: { name, value },
        } = action;

        if (!value && state.contentType) {
          const { metadatas, attributes, uid } = state.contentType;
          const metas = metadatas[name].list;
          const header = {
            name,
            fieldSchema: attributes[name],
            metadatas: metas,
            key: `__${name}_key__`,
          } satisfies ListLayoutRow;

          const attribute = attributes[name];

          switch (attribute.type) {
            case 'component': {
              const componentName = attribute.component;

              const mainFieldName = state.components[componentName]?.settings.mainField ?? null;
              const mainFieldAttribute = state.components[componentName]?.attributes[mainFieldName];

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
                // @ts-expect-error – i don't think we need this anymore...
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
          const headerIndexToRemove = state.displayedHeaders.findIndex(
            (head) => head.name === name
          );

          draftState.displayedHeaders.splice(headerIndexToRemove, 1);
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

export { ListViewLayoutManager, reducer, onChangeListHeaders, onResetListHeaders };
export type { ListViewLayoutManagerState };
