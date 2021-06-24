import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { bindActionCreators, compose } from 'redux';
import { get, isEmpty } from 'lodash';
import { FormattedMessage, useIntl } from 'react-intl';
import { useHistory, useLocation } from 'react-router-dom';
import { Header } from '@buffetjs/custom';
import { Flex, Padded } from '@buffetjs/core';
import isEqual from 'react-fast-compare';
import { stringify } from 'qs';
import {
  CheckPermissions,
  PopUpWarning,
  useTracking,
  useNotification,
  useQueryParams,
  useRBACProvider,
  useStrapiApp,
} from '@strapi/helper-plugin';
import axios from 'axios';
import { axiosInstance } from '../../../core/utils';
import { InjectionZone } from '../../../shared/components';
import { INJECT_COLUMN_IN_TABLE } from '../../../exposedHooks';
import pluginPermissions from '../../permissions';
import { formatFiltersFromQuery, getRequestUrl, getTrad } from '../../utils';
import Container from '../../components/Container';
import CustomTable from '../../components/CustomTable';
import FilterPicker from '../../components/FilterPicker';
import Search from '../../components/Search';
import ListViewProvider from '../../components/ListViewProvider';
import InjectionZoneList from '../../components/InjectionZoneList';
import { AddFilterCta, FilterIcon, Wrapper } from './components';
import FieldPicker from './FieldPicker';
import Filter from './Filter';
import Footer from './Footer';
import {
  getData,
  getDataSucceeded,
  onChangeBulk,
  onChangeBulkSelectall,
  onDeleteDataError,
  onDeleteDataSucceeded,
  onDeleteSeveralDataSucceeded,
  setModalLoadingState,
  toggleModalDelete,
  toggleModalDeleteAll,
  setLayout,
  onChangeListHeaders,
  onResetListHeaders,
} from './actions';
import makeSelectListView from './selectors';
import { getAllAllowedHeaders, getFirstSortableHeader, buildQueryString } from './utils';

/* eslint-disable react/no-array-index-key */
function ListView({
  canCreate,
  canDelete,
  canRead,
  canUpdate,
  didDeleteData,
  entriesToDelete,
  onChangeBulk,
  onChangeBulkSelectall,
  onDeleteDataError,
  onDeleteDataSucceeded,
  onDeleteSeveralDataSucceeded,
  setModalLoadingState,
  showWarningDelete,
  showModalConfirmButtonLoading,
  showWarningDeleteAll,
  toggleModalDelete,
  toggleModalDeleteAll,
  data,
  displayedHeaders,
  getData,
  getDataSucceeded,
  isLoading,
  layout,
  onChangeListHeaders,
  onResetListHeaders,
  pagination: { total },
  slug,
}) {
  const {
    contentType: {
      attributes,
      metadatas,
      settings: { bulkable: isBulkable, filterable: isFilterable, searchable: isSearchable },
    },
  } = layout;
  const toggleNotification = useNotification();
  const { trackUsage } = useTracking();
  const { refetchPermissions } = useRBACProvider();
  const trackUsageRef = useRef(trackUsage);
  const fetchPermissionsRef = useRef(refetchPermissions);

  const { runHookWaterfall } = useStrapiApp();

  const tableHeaders = useMemo(() => {
    const headers = runHookWaterfall(INJECT_COLUMN_IN_TABLE, { displayedHeaders, layout });

    return headers;
  }, [runHookWaterfall, displayedHeaders, layout]);

  const [{ query }, setQuery] = useQueryParams();
  const params = buildQueryString(query);

  const { pathname } = useLocation();
  const { push } = useHistory();
  const { formatMessage } = useIntl();

  const [isFilterPickerOpen, setFilterPickerState] = useState(false);
  const [idToDelete, setIdToDelete] = useState(null);
  const contentType = layout.contentType;
  const hasDraftAndPublish = get(contentType, 'options.draftAndPublish', false);
  const allAllowedHeaders = useMemo(() => getAllAllowedHeaders(attributes), [attributes]);

  const filters = useMemo(() => {
    return formatFiltersFromQuery(query);
  }, [query]);

  const _sort = query._sort;
  const _q = query._q || '';

  const label = contentType.info.label;

  const firstSortableHeader = useMemo(() => getFirstSortableHeader(displayedHeaders), [
    displayedHeaders,
  ]);

  useEffect(() => {
    setFilterPickerState(false);
  }, []);

  // Using a ref to avoid requests being fired multiple times on slug on change
  // We need it because the hook as mulitple dependencies so it may run before the permissions have checked
  const requestUrlRef = useRef('');

  const fetchData = useCallback(
    async (endPoint, source) => {
      getData();

      try {
        const opts = source ? { cancelToken: source.token } : null;
        const {
          data: { results, pagination },
        } = await axiosInstance.get(endPoint, opts);

        getDataSucceeded(pagination, results);
      } catch (err) {
        if (axios.isCancel(err)) {
          return;
        }

        const resStatus = get(err, 'response.status', null);
        console.log(err);

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
    [getData, getDataSucceeded, push, toggleNotification]
  );

  const handleChangeListLabels = useCallback(
    ({ name, value }) => {
      // Display a notification if trying to remove the last displayed field

      if (value && displayedHeaders.length === 1) {
        toggleNotification({
          type: 'warning',
          message: { id: 'content-manager.notification.error.displayedFields' },
        });
      } else {
        trackUsageRef.current('didChangeDisplayedFields');

        onChangeListHeaders({ name, value });
      }
    },
    [displayedHeaders, onChangeListHeaders, toggleNotification]
  );

  const handleConfirmDeleteAllData = useCallback(async () => {
    try {
      setModalLoadingState();

      await axiosInstance.post(getRequestUrl(`collection-types/${slug}/actions/bulkDelete`), {
        ids: entriesToDelete,
      });

      onDeleteSeveralDataSucceeded();
      trackUsageRef.current('didBulkDeleteEntries');
    } catch (err) {
      toggleNotification({
        type: 'warning',
        message: { id: getTrad('error.record.delete') },
      });
    }
  }, [
    entriesToDelete,
    onDeleteSeveralDataSucceeded,
    slug,
    setModalLoadingState,
    toggleNotification,
  ]);

  const handleConfirmDeleteData = useCallback(async () => {
    try {
      let trackerProperty = {};

      if (hasDraftAndPublish) {
        const dataToDelete = data.find(obj => obj.id.toString() === idToDelete.toString());
        const isDraftEntry = isEmpty(dataToDelete.published_at);
        const status = isDraftEntry ? 'draft' : 'published';

        trackerProperty = { status };
      }

      trackUsageRef.current('willDeleteEntry', trackerProperty);
      setModalLoadingState();

      await axiosInstance.delete(getRequestUrl(`collection-types/${slug}/${idToDelete}`));

      toggleNotification({
        type: 'success',
        message: { id: getTrad('success.record.delete') },
      });

      // Close the modal and refetch data
      onDeleteDataSucceeded();
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
      // Close the modal
      onDeleteDataError();
    }
  }, [
    toggleNotification,
    hasDraftAndPublish,
    setModalLoadingState,
    slug,
    idToDelete,
    onDeleteDataSucceeded,
    data,
    formatMessage,
    onDeleteDataError,
  ]);

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

  const handleClickDelete = id => {
    setIdToDelete(id);
    toggleModalDelete();
  };

  const handleModalClose = useCallback(() => {
    if (didDeleteData) {
      const requestUrl = getRequestUrl(`collection-types/${slug}${params}`);

      fetchData(requestUrl);
    }
  }, [fetchData, didDeleteData, slug, params]);

  const toggleFilterPickerState = useCallback(() => {
    setFilterPickerState(prevState => {
      if (!prevState) {
        trackUsageRef.current('willFilterEntries');
      }

      return !prevState;
    });
  }, []);

  const headerAction = useMemo(() => {
    if (!canCreate) {
      return [];
    }

    return [
      {
        label: formatMessage(
          {
            id: 'content-manager.containers.List.addAnEntry',
          },
          {
            entity: label || 'Content Manager',
          }
        ),
        onClick: () => {
          const trackerProperty = hasDraftAndPublish ? { status: 'draft' } : {};

          trackUsageRef.current('willCreateEntry', trackerProperty);
          push({
            pathname: `${pathname}/create`,
            search: query.plugins ? stringify({ plugins: query.plugins }, { encode: false }) : '',
          });
        },
        color: 'primary',
        type: 'button',
        icon: true,
        style: {
          paddingLeft: 15,
          paddingRight: 15,
          fontWeight: 600,
        },
      },
    ];
  }, [label, pathname, canCreate, formatMessage, hasDraftAndPublish, push, query]);

  const headerProps = useMemo(() => {
    /* eslint-disable indent */
    return {
      title: {
        label: label || 'Content Manager',
      },
      content: canRead
        ? formatMessage(
            {
              id:
                total > 1
                  ? getTrad('containers.List.pluginHeaderDescription')
                  : getTrad('containers.List.pluginHeaderDescription.singular'),
            },
            { label: total }
          )
        : null,
      actions: headerAction,
    };
  }, [total, headerAction, label, canRead, formatMessage]);

  const handleToggleModalDeleteAll = e => {
    trackUsageRef.current('willBulkDeleteEntries');
    toggleModalDeleteAll(e);
  };

  return (
    <>
      <ListViewProvider
        _q={_q}
        _sort={_sort}
        data={data}
        entriesToDelete={entriesToDelete}
        filters={filters}
        firstSortableHeader={firstSortableHeader}
        label={label}
        onChangeBulk={onChangeBulk}
        onChangeBulkSelectall={onChangeBulkSelectall}
        onClickDelete={handleClickDelete}
        slug={slug}
        toggleModalDeleteAll={handleToggleModalDeleteAll}
        setQuery={setQuery}
      >
        <FilterPicker
          contentType={contentType}
          filters={filters}
          isOpen={isFilterPickerOpen}
          metadatas={metadatas}
          name={label}
          toggleFilterPickerState={toggleFilterPickerState}
          setQuery={setQuery}
          slug={slug}
        />
        <Container className="container-fluid">
          {!isFilterPickerOpen && <Header {...headerProps} isLoading={isLoading && canRead} />}
          {isSearchable && canRead && (
            <Search
              changeParams={setQuery}
              initValue={_q}
              model={label}
              value={_q}
              trackUsage={trackUsage}
            />
          )}

          {!canRead && (
            <Flex justifyContent="flex-end">
              <Padded right size="sm">
                <InjectionZone area="contentManager.listView.actions" />
              </Padded>
            </Flex>
          )}

          {canRead && (
            <Wrapper>
              <div className="row" style={{ marginBottom: '5px' }}>
                <div className="col-9">
                  <div className="row" style={{ marginLeft: 0, marginRight: 0 }}>
                    {isFilterable && (
                      <>
                        <AddFilterCta type="button" onClick={toggleFilterPickerState}>
                          <FilterIcon />
                          <FormattedMessage id="app.utils.filters" />
                        </AddFilterCta>
                        {filters.map(({ filter: filterName, name, value }, key) => (
                          <Filter
                            contentType={contentType}
                            filterName={filterName}
                            filters={filters}
                            index={key}
                            key={key}
                            metadatas={metadatas}
                            name={name}
                            toggleFilterPickerState={toggleFilterPickerState}
                            isFilterPickerOpen={isFilterPickerOpen}
                            setQuery={setQuery}
                            value={value}
                          />
                        ))}
                      </>
                    )}
                  </div>
                </div>

                <div className="col-3">
                  <Flex justifyContent="flex-end">
                    <Padded right size="sm">
                      <InjectionZone area="contentManager.listView.actions" />
                    </Padded>

                    <CheckPermissions permissions={pluginPermissions.collectionTypesConfigurations}>
                      <FieldPicker
                        displayedHeaders={displayedHeaders}
                        items={allAllowedHeaders}
                        onChange={handleChangeListLabels}
                        onClickReset={onResetListHeaders}
                        slug={slug}
                      />
                    </CheckPermissions>
                  </Flex>
                </div>
              </div>
              <div className="row" style={{ paddingTop: '12px' }}>
                <div className="col-12">
                  <CustomTable
                    data={data}
                    canCreate={canCreate}
                    canDelete={canDelete}
                    canUpdate={canUpdate}
                    displayedHeaders={tableHeaders}
                    hasDraftAndPublish={hasDraftAndPublish}
                    isBulkable={isBulkable}
                    setQuery={setQuery}
                    showLoader={isLoading}
                  />
                  <Footer count={total} params={query} onChange={setQuery} />
                </div>
              </div>
            </Wrapper>
          )}
        </Container>
        <PopUpWarning
          isOpen={showWarningDelete}
          toggleModal={toggleModalDelete}
          content={{
            message: getTrad('popUpWarning.bodyMessage.contentType.delete'),
          }}
          onConfirm={handleConfirmDeleteData}
          popUpWarningType="danger"
          onClosed={handleModalClose}
          isConfirmButtonLoading={showModalConfirmButtonLoading}
        >
          <InjectionZoneList area="contentManager.listView.deleteModalAdditionalInfos" />
        </PopUpWarning>
        <PopUpWarning
          isOpen={showWarningDeleteAll}
          toggleModal={toggleModalDeleteAll}
          content={{
            message: getTrad(
              `popUpWarning.bodyMessage.contentType.delete${
                entriesToDelete.length > 1 ? '.all' : ''
              }`
            ),
          }}
          popUpWarningType="danger"
          onConfirm={handleConfirmDeleteAllData}
          onClosed={handleModalClose}
          isConfirmButtonLoading={showModalConfirmButtonLoading}
        >
          <InjectionZoneList area="contentManager.listView.deleteModalAdditionalInfos" />
        </PopUpWarning>
      </ListViewProvider>
    </>
  );
}

ListView.defaultProps = {
  permissions: [],
};

ListView.propTypes = {
  canCreate: PropTypes.bool.isRequired,
  canDelete: PropTypes.bool.isRequired,
  canRead: PropTypes.bool.isRequired,
  canUpdate: PropTypes.bool.isRequired,
  displayedHeaders: PropTypes.array.isRequired,
  data: PropTypes.array.isRequired,
  didDeleteData: PropTypes.bool.isRequired,
  entriesToDelete: PropTypes.array.isRequired,
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
  onChangeBulk: PropTypes.func.isRequired,
  onChangeBulkSelectall: PropTypes.func.isRequired,
  onChangeListHeaders: PropTypes.func.isRequired,
  onDeleteDataError: PropTypes.func.isRequired,
  onDeleteDataSucceeded: PropTypes.func.isRequired,
  onDeleteSeveralDataSucceeded: PropTypes.func.isRequired,
  onResetListHeaders: PropTypes.func.isRequired,
  pagination: PropTypes.shape({ total: PropTypes.number.isRequired }).isRequired,
  setModalLoadingState: PropTypes.func.isRequired,
  showModalConfirmButtonLoading: PropTypes.bool.isRequired,
  showWarningDelete: PropTypes.bool.isRequired,
  showWarningDeleteAll: PropTypes.bool.isRequired,
  slug: PropTypes.string.isRequired,
  toggleModalDelete: PropTypes.func.isRequired,
  toggleModalDeleteAll: PropTypes.func.isRequired,
  setLayout: PropTypes.func.isRequired,
  permissions: PropTypes.arrayOf(
    PropTypes.shape({
      action: PropTypes.string.isRequired,
      subject: PropTypes.string.isRequired,
      properties: PropTypes.object,
      conditions: PropTypes.arrayOf(PropTypes.string),
    })
  ),
};

const mapStateToProps = makeSelectListView();

export function mapDispatchToProps(dispatch) {
  return bindActionCreators(
    {
      getData,
      getDataSucceeded,
      onChangeBulk,
      onChangeBulkSelectall,
      onChangeListHeaders,
      onDeleteDataError,
      onDeleteDataSucceeded,
      onDeleteSeveralDataSucceeded,
      onResetListHeaders,
      setModalLoadingState,
      toggleModalDelete,
      toggleModalDeleteAll,
      setLayout,
    },
    dispatch
  );
}
const withConnect = connect(mapStateToProps, mapDispatchToProps);

export default compose(withConnect)(memo(ListView, isEqual));
