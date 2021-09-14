import React, { memo, useCallback, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import isEqual from 'react-fast-compare';
import { bindActionCreators, compose } from 'redux';
import { useIntl } from 'react-intl';
import { useHistory, useLocation } from 'react-router-dom';
import get from 'lodash/get';
import isEmpty from 'lodash/isEmpty';
import { stringify } from 'qs';
import {
  NoPermissions,
  // CheckPermissions,
  Search,
  useFocusWhenNavigate,
  useQueryParams,
  useNotification,
  useRBACProvider,
  useTracking,
} from '@strapi/helper-plugin';
import { Main } from '@strapi/parts/Main';
import { ActionLayout, ContentLayout, HeaderLayout } from '@strapi/parts/Layout';
import { useNotifyAT } from '@strapi/parts/LiveRegions';
import { Button } from '@strapi/parts/Button';
import Add from '@strapi/icons/Add';
import axios from 'axios';
import { axiosInstance } from '../../../core/utils';
import { InjectionZone } from '../../../shared/components';
import DynamicTable from '../../components/DynamicTable';
// import permissions from '../../../permissions';
import {
  // formatFiltersFromQuery,
  getRequestUrl,
  getTrad,
} from '../../utils';
// import Container from '../../components/Container';
// import ListViewProvider from '../../components/ListViewProvider';
// import { Wrapper } from './components';
// import FieldPicker from './FieldPicker';
// import Filter from './Filter';
import PaginationFooter from './PaginationFooter';
import { getData, getDataSucceeded, onChangeListHeaders, onResetListHeaders } from './actions';
import makeSelectListView from './selectors';
import {
  // getAllAllowedHeaders,
  // getFirstSortableHeader,
  buildQueryString,
} from './utils';
import AttributeFilter from '../../components/AttributeFilter';

// const cmPermissions = permissions.contentManager;

/* eslint-disable react/no-array-index-key */
function ListView({
  canCreate,
  canDelete,
  canRead,
  // onChangeBulk,
  // onChangeBulkSelectall,
  data,
  getData,
  getDataSucceeded,
  isLoading,
  layout,
  pagination,
  // onChangeListHeaders,
  // onResetListHeaders,
  slug,
}) {
  const { total } = pagination;
  const {
    contentType: {
      // attributes,
      metadatas,
      settings: { bulkable: isBulkable, filterable: isFilterable, searchable: isSearchable },
    },
  } = layout;

  const toggleNotification = useNotification();
  const { trackUsage } = useTracking();
  const { refetchPermissions } = useRBACProvider();
  const trackUsageRef = useRef(trackUsage);
  const fetchPermissionsRef = useRef(refetchPermissions);
  const { notifyStatus } = useNotifyAT();

  useFocusWhenNavigate();

  const [{ query }] = useQueryParams();
  const params = buildQueryString(query);

  const { pathname } = useLocation();
  const { push } = useHistory();
  const { formatMessage } = useIntl();

  // const [isFilterPickerOpen, setFilterPickerState] = useState(false);
  const contentType = layout.contentType;
  const hasDraftAndPublish = get(contentType, 'options.draftAndPublish', false);
  // TODO
  // const allAllowedHeaders = useMemo(() => getAllAllowedHeaders(attributes), [attributes]);

  // const filters = useMemo(() => {
  //   return formatFiltersFromQuery(query);
  // }, [query]);

  // FIXME
  // Using a ref to avoid requests being fired multiple times on slug on change
  // We need it because the hook as mulitple dependencies so it may run before the permissions have checked
  const requestUrlRef = useRef('');

  const fetchData = useCallback(
    async (endPoint, source) => {
      getData();

      try {
        const opts = source ? { cancelToken: source.token } : null;
        const {
          data: { results, pagination: paginationResult },
        } = await axiosInstance.get(endPoint, opts);

        notifyStatus(
          formatMessage(
            {
              id: getTrad('utils.data-loaded'),
              defaultMessage:
                '{number, plural, =1 {# entry has} other {# entries have}} successfully been loaded',
            },
            // Using the plural form
            { number: paginationResult.count }
          )
        );

        getDataSucceeded(paginationResult, results);
      } catch (err) {
        if (axios.isCancel(err)) {
          return;
        }

        const resStatus = get(err, 'response.status', null);

        if (resStatus === 403) {
          await fetchPermissionsRef.current();

          toggleNotification({
            type: 'info',
            message: { id: getTrad('permissions.not-allowed.update') },
          });

          push('/');

          return;
        }

        console.error(err);
        toggleNotification({
          type: 'warning',
          message: { id: getTrad('error.model.fetch') },
        });
      }
    },
    [formatMessage, getData, getDataSucceeded, notifyStatus, push, toggleNotification]
  );

  // const handleChangeListLabels = useCallback(
  //   ({ name, value }) => {
  //     // Display a notification if trying to remove the last displayed field

  //     if (value && displayedHeaders.length === 1) {
  //       toggleNotification({
  //         type: 'warning',
  //         message: { id: 'content-manager.notification.error.displayedFields' },
  //       });
  //     } else {
  //       trackUsageRef.current('didChangeDisplayedFields');

  //       onChangeListHeaders({ name, value });
  //     }
  //   },
  //   [displayedHeaders, onChangeListHeaders, toggleNotification]
  // );

  const handleConfirmDeleteAllData = useCallback(
    async ids => {
      try {
        await axiosInstance.post(getRequestUrl(`collection-types/${slug}/actions/bulkDelete`), {
          ids,
        });

        const requestUrl = getRequestUrl(`collection-types/${slug}${params}`);
        fetchData(requestUrl);
        trackUsageRef.current('didBulkDeleteEntries');
      } catch (err) {
        toggleNotification({
          type: 'warning',
          message: { id: getTrad('error.record.delete') },
        });
      }
    },
    [fetchData, params, slug, toggleNotification]
  );

  const handleConfirmDeleteData = useCallback(
    async idToDelete => {
      try {
        let trackerProperty = {};

        if (hasDraftAndPublish) {
          const dataToDelete = data.find(obj => obj.id.toString() === idToDelete.toString());
          const isDraftEntry = isEmpty(dataToDelete.published_at);
          const status = isDraftEntry ? 'draft' : 'published';

          trackerProperty = { status };
        }

        trackUsageRef.current('willDeleteEntry', trackerProperty);

        await axiosInstance.delete(getRequestUrl(`collection-types/${slug}/${idToDelete}`));

        const requestUrl = getRequestUrl(`collection-types/${slug}${params}`);
        fetchData(requestUrl);

        toggleNotification({
          type: 'success',
          message: { id: getTrad('success.record.delete') },
        });

        trackUsageRef.current('didDeleteEntry', trackerProperty);
      } catch (err) {
        const errorMessage = get(
          err,
          'response.payload.message',
          formatMessage({ id: getTrad('error.record.delete') })
        );

        toggleNotification({
          type: 'warning',
          message: errorMessage,
        });
      }
    },
    [hasDraftAndPublish, slug, params, fetchData, toggleNotification, data, formatMessage]
  );

  useEffect(() => {
    const CancelToken = axios.CancelToken;
    const source = CancelToken.source();

    const shouldSendRequest = canRead;
    const requestUrl = getRequestUrl(`collection-types/${slug}${params}`);

    if (shouldSendRequest && requestUrl.includes(requestUrlRef.current)) {
      fetchData(requestUrl, source);
    }

    return () => {
      requestUrlRef.current = slug;

      source.cancel('Operation canceled by the user.');
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canRead, getData, slug, params, getDataSucceeded, fetchData]);

  // const toggleFilterPickerState = useCallback(() => {
  //   setFilterPickerState(prevState => {
  //     if (!prevState) {
  //       trackUsageRef.current('willFilterEntries');
  //     }

  //     return !prevState;
  //   });
  // }, []);

  const defaultHeaderLayoutTitle = formatMessage({
    id: getTrad('header.name'),
    defaultMessage: 'Content',
  });
  const headerLayoutTitle = formatMessage({
    id: contentType.info.label,
    defaultMessage: contentType.info.label || defaultHeaderLayoutTitle,
  });
  const subtitle = canRead
    ? formatMessage(
        {
          id: getTrad('pages.ListView.header-subtitle'),
          defaultMessage: '{number, plural, =0 {# entries} one {# entry} other {# entries}} found',
        },
        { number: total }
      )
    : null;

  const createAction = canCreate ? (
    <Button
      onClick={() => {
        const trackerProperty = hasDraftAndPublish ? { status: 'draft' } : {};

        trackUsageRef.current('willCreateEntry', trackerProperty);
        push({
          pathname: `${pathname}/create`,
          search: query.plugins ? stringify({ plugins: query.plugins }, { encode: false }) : '',
        });
      }}
      startIcon={<Add />}
    >
      {formatMessage({
        id: getTrad('HeaderLayout.button.label-add-entry'),
        defaultMessage: 'Add new entry',
      })}
    </Button>
  ) : null;

  return (
    <Main aria-busy={isLoading}>
      <HeaderLayout primaryAction={createAction} subtitle={subtitle} title={headerLayoutTitle} />
      {!canRead && (
        <ActionLayout endActions={<InjectionZone area="contentManager.listView.actions" />} />
      )}
      {canRead && (isSearchable || isFilterable) && (
        <ActionLayout
          endActions={<InjectionZone area="contentManager.listView.actions" />}
          startActions={
            <>
              {isSearchable && (
                <Search
                  label={formatMessage(
                    { id: 'app.component.search.label', defaultMessage: 'Search for {target}' },
                    { target: headerLayoutTitle }
                  )}
                  trackedEvent="didSearch"
                />
              )}
              {isFilterable && (
                <AttributeFilter contentType={contentType} slug={slug} metadatas={metadatas} />
              )}
            </>
          }
        />
      )}
      <ContentLayout>
        {canRead ? (
          <>
            <DynamicTable
              canCreate={canCreate}
              canDelete={canDelete}
              contentTypeName={headerLayoutTitle}
              onConfirmDeleteAll={handleConfirmDeleteAllData}
              onConfirmDelete={handleConfirmDeleteData}
              isBulkable={isBulkable}
              isLoading={isLoading}
              // FIXME: remove the layout props drilling
              layout={layout}
              rows={data}
            />
            <PaginationFooter pagination={{ pageCount: pagination?.pageCount || 1 }} />
          </>
        ) : (
          <NoPermissions />
        )}
      </ContentLayout>
    </Main>
  );

  // return (
  //   <>
  //     <ListViewProvider
  //       _q={_q}
  //       sort={sort}
  //       data={data}
  //       entriesToDelete={entriesToDelete}
  //       filters={filters}
  //       firstSortableHeader={firstSortableHeader}
  //       label={label}
  //       onChangeBulk={onChangeBulk}
  //       onChangeBulkSelectall={onChangeBulkSelectall}
  //       onClickDelete={handleClickDelete}
  //       slug={slug}
  //       toggleModalDeleteAll={handleToggleModalDeleteAll}
  //       setQuery={setQuery}
  //     >
  //       <Container className="container-fluid">
  //         {!isFilterPickerOpen && <Header {...headerProps} isLoading={isLoading && canRead} />}
  //         {isSearchable && canRead && (
  //           <Search
  //             changeParams={setQuery}
  //             initValue={_q}
  //             model={label}
  //             value={_q}
  //             trackUsage={trackUsage}
  //           />
  //         )}

  //         {!canRead && (
  //           <Flex justifyContent="flex-end">
  //             <Padded right size="sm">
  //               <InjectionZone area="contentManager.listView.actions" />
  //             </Padded>
  //           </Flex>
  //         )}

  //         {canRead && (
  //           <Wrapper>
  //             <div className="row" style={{ marginBottom: '5px' }}>
  //               <div className="col-9">
  //                 <div className="row" style={{ marginLeft: 0, marginRight: 0 }}>
  //                   {isFilterable && (
  //                     <>
  //                       <Padded right size="sm">
  // <AttributeFilter
  //   contentType={contentType}
  //   slug={slug}
  //   metaData={metadatas}
  // />
  //                       </Padded>
  //                       {filters.map(({ filter: filterName, name, value }, key) => (
  //                         <Filter
  //                           contentType={contentType}
  //                           filterName={filterName}
  //                           filters={filters}
  //                           index={key}
  //                           key={key}
  //                           metadatas={metadatas}
  //                           name={name}
  //                           toggleFilterPickerState={toggleFilterPickerState}
  //                           isFilterPickerOpen={isFilterPickerOpen}
  //                           setQuery={setQuery}
  //                           value={value}
  //                         />
  //                       ))}
  //                     </>
  //                   )}
  //                 </div>
  //               </div>

  //               <div className="col-3">
  //                 <Flex justifyContent="flex-end">
  //                   <Padded right size="sm">
  //                     <InjectionZone area="contentManager.listView.actions" />
  //                   </Padded>

  //                   <CheckPermissions permissions={cmPermissions.collectionTypesConfigurations}>
  //                     <FieldPicker
  //                       displayedHeaders={displayedHeaders}
  //                       items={allAllowedHeaders}
  //                       onChange={handleChangeListLabels}
  //                       onClickReset={onResetListHeaders}
  //                       slug={slug}
  //                     />
  //                   </CheckPermissions>
  //                 </Flex>
  //               </div>
  //             </div>
  //             <div className="row" style={{ paddingTop: '12px' }}>
  //               <div className="col-12">
  //                 <CustomTable
  //                   data={data}
  //                   canCreate={canCreate}
  //                   canDelete={canDelete}
  //                   canUpdate={canUpdate}
  //                   displayedHeaders={tableHeaders}
  //                   hasDraftAndPublish={hasDraftAndPublish}
  //                   isBulkable={isBulkable}
  //                   setQuery={setQuery}
  //                   showLoader={isLoading}
  //                 />
  //                 <Footer count={total} params={query} onChange={setQuery} />
  //               </div>
  //             </div>
  //           </Wrapper>
  //         )}
  //       </Container>
  //     </ListViewProvider>
  //   </>
  // );
}

ListView.propTypes = {
  canCreate: PropTypes.bool.isRequired,
  canDelete: PropTypes.bool.isRequired,
  canRead: PropTypes.bool.isRequired,
  data: PropTypes.array.isRequired,
  layout: PropTypes.exact({
    components: PropTypes.object.isRequired,
    contentType: PropTypes.shape({
      attributes: PropTypes.object.isRequired,
      metadatas: PropTypes.object.isRequired,
      info: PropTypes.shape({ label: PropTypes.string.isRequired }).isRequired,
      layouts: PropTypes.shape({
        list: PropTypes.array.isRequired,
        editRelations: PropTypes.array,
      }).isRequired,
      options: PropTypes.object.isRequired,
      settings: PropTypes.object.isRequired,
    }).isRequired,
  }).isRequired,
  isLoading: PropTypes.bool.isRequired,
  getData: PropTypes.func.isRequired,
  getDataSucceeded: PropTypes.func.isRequired,
  // onChangeListHeaders: PropTypes.func.isRequired,
  // onResetListHeaders: PropTypes.func.isRequired,
  pagination: PropTypes.shape({ total: PropTypes.number.isRequired, pageCount: PropTypes.number })
    .isRequired,
  slug: PropTypes.string.isRequired,
};

const mapStateToProps = makeSelectListView();

export function mapDispatchToProps(dispatch) {
  return bindActionCreators(
    {
      getData,
      getDataSucceeded,
      onChangeListHeaders,
      onResetListHeaders,
    },
    dispatch
  );
}
const withConnect = connect(mapStateToProps, mapDispatchToProps);

export default compose(withConnect)(memo(ListView, isEqual));
