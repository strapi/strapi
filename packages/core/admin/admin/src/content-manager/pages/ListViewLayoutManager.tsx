import * as React from 'react';

import { useQueryParams } from '@strapi/helper-plugin';
import { Contracts } from '@strapi/plugin-content-manager/_internal/shared';
import produce from 'immer';
import { useHistory } from 'react-router-dom';

import { useTypedDispatch } from '../../core/store/hooks';
import { useFindRedirectionLink } from '../hooks/useFindRedirectionLink';
import { useSyncRbac } from '../hooks/useSyncRbac';
import { FormattedLayouts, ListLayoutRow } from '../utils/layouts';

import { ProtectedListViewPageProps, ProtectedListViewPage } from './ListView/ListViewPage';

/* -------------------------------------------------------------------------------------------------
 * ListViewLayoutManager
 * -----------------------------------------------------------------------------------------------*/

interface ListViewLayoutManagerProps extends ProtectedListViewPageProps {}

const ListViewLayoutManager = ({ layout, ...props }: ListViewLayoutManagerProps) => {
  const dispatch = useTypedDispatch();
  const { replace } = useHistory();
  const [{ query, rawQuery }] = useQueryParams();
  const { permissions, isValid: isValidPermissions } = useSyncRbac(query, props.slug, 'listView');
  const redirectionLink = useFindRedirectionLink(props.slug);

  React.useEffect(() => {
    if (!rawQuery) {
      replace(redirectionLink);
    }
  }, [rawQuery, replace, redirectionLink]);

  React.useEffect(() => {
    dispatch(setLayout(layout));
  }, [dispatch, layout]);

  React.useEffect(() => {
    return () => {
      dispatch(resetProps());
    };
  }, [dispatch]);

  if (!isValidPermissions) {
    return null;
  }

  return <ProtectedListViewPage {...props} layout={layout} permissions={permissions} />;
};

/* -------------------------------------------------------------------------------------------------
 * Reducer
 * -----------------------------------------------------------------------------------------------*/

const GET_DATA = 'ContentManager/ListView/GET_DATA';
const GET_DATA_SUCCEEDED = 'ContentManager/ListView/GET_DATA_SUCCEEDED';
const RESET_PROPS = 'ContentManager/ListView/RESET_PROPS';
const ON_CHANGE_LIST_HEADERS = 'ContentManager/ListView/ON_CHANGE_LIST_HEADERS ';
const ON_RESET_LIST_HEADERS = 'ContentManager/ListView/ON_RESET_LIST_HEADERS ';
const SET_LIST_LAYOUT = 'ContentManager/ListView/SET_LIST_LAYOUT ';

interface ListViewLayoutManagerState {
  contentType: FormattedLayouts['contentType'] | null;
  components: FormattedLayouts['components'];
  data: Contracts.CollectionTypes.Find.Response['results'];
  displayedHeaders: ListLayoutRow[];
  initialDisplayedHeaders: ListLayoutRow[];
  isLoading: boolean;
  pagination: Contracts.CollectionTypes.Find.Response['pagination'];
}

const initialState = {
  data: [],
  isLoading: true,
  components: {},
  contentType: null,
  initialDisplayedHeaders: [],
  displayedHeaders: [],
  pagination: {
    page: 0,
    pageCount: 0,
    pageSize: 0,
    total: 0,
  },
} satisfies ListViewLayoutManagerState;

interface GetDataAction {
  type: typeof GET_DATA;
}

const getData = () => ({ type: GET_DATA } satisfies GetDataAction);

interface GetDataSucceededAction extends Pick<ListViewLayoutManagerState, 'data' | 'pagination'> {
  type: typeof GET_DATA_SUCCEEDED;
}

const getDataSucceeded = (
  pagination: GetDataSucceededAction['pagination'],
  data: GetDataSucceededAction['data']
) =>
  ({
    type: GET_DATA_SUCCEEDED,
    pagination,
    data,
  } satisfies GetDataSucceededAction);

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
  | GetDataAction
  | GetDataSucceededAction
  | ResetPropsAction
  | SetLayoutAction
  | OnChangeListHeadersAction
  | onResetListHeadersAction;

const reducer = (state: ListViewLayoutManagerState = initialState, action: Action) =>
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

export {
  ListViewLayoutManager,
  reducer,
  getData,
  getDataSucceeded,
  onChangeListHeaders,
  onResetListHeaders,
};
export type { ListViewLayoutManagerState, ListViewLayoutManagerProps };
