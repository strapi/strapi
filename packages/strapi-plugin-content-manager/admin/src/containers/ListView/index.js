import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { bindActionCreators, compose } from 'redux';
import { get, sortBy } from 'lodash';
import { FormattedMessage } from 'react-intl';
import { useLocation } from 'react-router-dom';
import { Header } from '@buffetjs/custom';
import {
  PopUpWarning,
  generateFiltersFromSearch,
  useGlobalContext,
  request,
  CheckPermissions,
  useUserPermissions,
  useQuery,
} from 'strapi-helper-plugin';
import pluginId from '../../pluginId';
import pluginPermissions from '../../permissions';
import { generatePermissionsObject, getRequestUrl } from '../../utils';

import DisplayedFieldsDropdown from '../../components/DisplayedFieldsDropdown';
import Container from '../../components/Container';
import CustomTable from '../../components/CustomTable';
import FilterPicker from '../../components/FilterPicker';
import Search from '../../components/Search';
import ListViewProvider from '../ListViewProvider';
import { onChangeListLabels, resetListLabels } from '../Main/actions';
import { AddFilterCta, FilterIcon, Wrapper } from './components';
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
  resetProps,
  setModalLoadingState,
  toggleModalDelete,
  toggleModalDeleteAll,
} from './actions';

import makeSelectListView from './selectors';

/* eslint-disable react/no-array-index-key */

function ListView({
  count,
  data,
  didDeleteData,
  emitEvent,
  entriesToDelete,
  isLoading,
  location: { pathname },
  getData,
  getDataSucceeded,
  layouts,
  history: { push },
  onChangeBulk,
  onChangeBulkSelectall,
  onChangeListLabels,
  onDeleteDataError,
  onDeleteDataSucceeded,
  onDeleteSeveralDataSucceeded,
  resetListLabels,
  resetProps,
  setModalLoadingState,
  showWarningDelete,
  showModalConfirmButtonLoading,
  showWarningDeleteAll,
  slug,
  toggleModalDelete,
  toggleModalDeleteAll,
}) {
  const viewPermissions = useMemo(() => generatePermissionsObject(slug), [slug]);
  const {
    isLoading: isLoadingForPermissions,
    allowedActions: { canCreate, canRead, canUpdate, canDelete },
  } = useUserPermissions(viewPermissions);
  const query = useQuery();
  const { search } = useLocation();
  const isFirstRender = useRef(true);
  const { formatMessage } = useGlobalContext();

  const [isLabelPickerOpen, setLabelPickerState] = useState(false);
  const [isFilterPickerOpen, setFilterPickerState] = useState(false);
  const [idToDelete, setIdToDelete] = useState(null);
  const contentTypePath = useMemo(() => {
    return [slug, 'contentType'];
  }, [slug]);

  const getLayoutSetting = useCallback(
    settingName => {
      return get(layouts, [...contentTypePath, 'settings', settingName], '');
    },
    [contentTypePath, layouts]
  );

  // Related to the search
  const defaultSort = useMemo(() => {
    return `${getLayoutSetting('defaultSortBy')}:${getLayoutSetting('defaultSortOrder')}`;
  }, [getLayoutSetting]);

  const filters = useMemo(() => {
    const currentSearch = new URLSearchParams(search);

    // Delete all params that are not related to the filters
    const paramsToDelete = ['_limit', '_page', '_sort', '_q'];

    for (let i = 0; i < paramsToDelete.length; i++) {
      currentSearch.delete(paramsToDelete[i]);
    }

    return generateFiltersFromSearch(currentSearch.toString());
  }, [search]);
  const _limit = useMemo(() => {
    return parseInt(query.get('_limit') || getLayoutSetting('pageSize'), 10);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [getLayoutSetting, query.get('_limit')]);
  const _q = useMemo(() => {
    return query.get('_q') || '';
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query.get('_q')]);
  const _page = useMemo(() => {
    return parseInt(query.get('_page') || 1, 10);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query.get('_page')]);
  const _sort = useMemo(() => {
    return query.get('_sort') || defaultSort;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [defaultSort, query.get('_sort')]);
  const _start = useMemo(() => {
    return (_page - 1) * parseInt(_limit, 10);
  }, [_limit, _page]);
  const searchToSendForRequest = useMemo(() => {
    const currentSearch = new URLSearchParams(search);

    currentSearch.set('_limit', _limit);
    currentSearch.set('_sort', _sort);
    currentSearch.set('_start', _start);
    currentSearch.delete('_page');

    return currentSearch.toString();
  }, [_limit, _sort, _start, search]);

  const getDataActionRef = useRef(getData);
  const getDataSucceededRef = useRef(getDataSucceeded);

  // Settings
  const isBulkable = useMemo(() => {
    return getLayoutSetting('bulkable');
  }, [getLayoutSetting]);
  const isFilterable = useMemo(() => {
    return getLayoutSetting('filterable');
  }, [getLayoutSetting]);
  const isSearchable = useMemo(() => {
    return getLayoutSetting('searchable');
  }, [getLayoutSetting]);
  const shouldSendRequest = useMemo(() => {
    return !isLoadingForPermissions && canRead;
  }, [canRead, isLoadingForPermissions]);

  const fetchData = async (search = searchToSendForRequest) => {
    try {
      getDataActionRef.current();
      const [{ count }, data] = await Promise.all([
        request(getRequestUrl(`explorer/${slug}/count?${search}`), {
          method: 'GET',
        }),
        request(getRequestUrl(`explorer/${slug}?${search}`), {
          method: 'GET',
        }),
      ]);

      getDataSucceededRef.current(count, data);
    } catch (err) {
      strapi.notification.error(`${pluginId}.error.model.fetch`);
    }
  };

  const getMetaDatas = useCallback(
    (path = []) => {
      return get(layouts, [...contentTypePath, 'metadatas', ...path], {});
    },
    [contentTypePath, layouts]
  );

  const listLayout = useMemo(() => {
    return get(layouts, [...contentTypePath, 'layouts', 'list'], []);
  }, [contentTypePath, layouts]);

  const listSchema = useMemo(() => {
    return get(layouts, [...contentTypePath, 'schema'], {});
  }, [layouts, contentTypePath]);

  const label = useMemo(() => {
    return get(listSchema, ['info', 'name'], '');
  }, [listSchema]);

  const tableHeaders = useMemo(() => {
    return listLayout.map(label => {
      return { ...getMetaDatas([label, 'list']), name: label };
    });
  }, [getMetaDatas, listLayout]);

  const getFirstSortableElement = useCallback(
    (name = '') => {
      return get(
        listLayout.filter(h => {
          return h !== name && getMetaDatas([h, 'list', 'sortable']) === true;
        }),
        ['0'],
        'id'
      );
    },
    [getMetaDatas, listLayout]
  );

  const allLabels = useMemo(() => {
    return sortBy(
      Object.keys(getMetaDatas())
        .filter(
          key =>
            !['json', 'component', 'dynamiczone', 'relation', 'richtext'].includes(
              get(listSchema, ['attributes', key, 'type'], '')
            )
        )
        .map(label => ({
          name: label,
          value: listLayout.includes(label),
        })),
      ['label', 'name']
    );
  }, [getMetaDatas, listLayout, listSchema]);

  useEffect(() => {
    return () => {
      isFirstRender.current = true;
    };
  }, [slug]);

  useEffect(() => {
    if (!isFirstRender.current) {
      fetchData(searchToSendForRequest);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchToSendForRequest]);

  useEffect(() => {
    return () => {
      resetProps();
      setFilterPickerState(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  useEffect(() => {
    if (shouldSendRequest) {
      fetchData();
    }

    return () => {
      isFirstRender.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shouldSendRequest]);

  const handleConfirmDeleteData = useCallback(async () => {
    try {
      emitEvent('willDeleteEntry');
      setModalLoadingState();

      await request(getRequestUrl(`explorer/${slug}/${idToDelete}`), {
        method: 'DELETE',
      });

      strapi.notification.success(`${pluginId}.success.record.delete`);

      // Close the modal and refetch data
      onDeleteDataSucceeded();
      emitEvent('didDeleteEntry');
    } catch (err) {
      const errorMessage = get(
        err,
        'response.payload.message',
        formatMessage({ id: `${pluginId}.error.record.delete` })
      );

      strapi.notification.error(errorMessage);
      // Close the modal
      onDeleteDataError();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setModalLoadingState, slug, idToDelete, onDeleteDataSucceeded]);

  const handleConfirmDeleteAllData = useCallback(async () => {
    const params = Object.assign(entriesToDelete);

    try {
      setModalLoadingState();

      await request(getRequestUrl(`explorer/deleteAll/${slug}`), {
        method: 'DELETE',
        params,
      });

      onDeleteSeveralDataSucceeded();
    } catch (err) {
      strapi.notification.error(`${pluginId}.error.record.delete`);
    }
  }, [entriesToDelete, onDeleteSeveralDataSucceeded, slug, setModalLoadingState]);

  const handleChangeListLabels = ({ name, value }) => {
    const currentSort = _sort;

    // Display a notification if trying to remove the last displayed field
    if (value && listLayout.length === 1) {
      strapi.notification.error('content-manager.notification.error.displayedFields');

      return;
    }

    // Update the sort when removing the displayed one
    if (currentSort.split(':')[0] === name && value) {
      emitEvent('didChangeDisplayedFields');
      handleChangeSearch({
        target: {
          name: '_sort',
          value: `${getFirstSortableElement(name)}:ASC`,
        },
      });
    }

    // Update the Main reducer
    onChangeListLabels({
      target: {
        name,
        slug,
        value: !value,
      },
    });
  };

  const handleChangeFilters = ({ target: { value } }) => {
    const newSearch = new URLSearchParams();

    // Set the default params
    newSearch.set('_limit', _limit);
    newSearch.set('_sort', _sort);
    newSearch.set('_page', 1);

    value.forEach(({ filter, name, value: filterValue }) => {
      const filterType = filter === '=' ? '' : filter;
      const filterName = `${name}${filterType}`;

      newSearch.append(filterName, filterValue);
    });

    push({ search: newSearch.toString() });
  };

  const handleChangeSearch = async ({ target: { name, value } }) => {
    const currentSearch = new URLSearchParams(searchToSendForRequest);

    // Pagination
    currentSearch.delete('_start');

    if (value === '') {
      currentSearch.delete(name);
    } else {
      currentSearch.set(name, value);
    }

    const searchToString = currentSearch.toString();

    push({ search: searchToString });
  };

  const handleClickDelete = id => {
    setIdToDelete(id);
    toggleModalDelete();
  };

  const handleModalClose = () => {
    if (didDeleteData) {
      fetchData();
    }
  };

  const handleSubmit = (filters = []) => {
    emitEvent('didFilterEntries');
    toggleFilterPickerState();
    handleChangeFilters({ target: { name: 'filters', value: filters } });
  };

  const toggleFilterPickerState = () => {
    if (!isFilterPickerOpen) {
      emitEvent('willFilterEntries');
    }

    setFilterPickerState(prevState => !prevState);
  };

  const toggleLabelPickerState = () => {
    if (!isLabelPickerOpen) {
      emitEvent('willChangeListFieldsSettings');
    }

    setLabelPickerState(prevState => !prevState);
  };

  const filterPickerActions = [
    {
      label: `${pluginId}.components.FiltersPickWrapper.PluginHeader.actions.clearAll`,
      kind: 'secondary',
      onClick: () => {
        toggleFilterPickerState();
        // Delete all filters
        handleChangeFilters({ target: { name: 'filters', value: [] } });
      },
    },
    {
      label: `${pluginId}.components.FiltersPickWrapper.PluginHeader.actions.apply`,
      kind: 'primary',
      type: 'submit',
    },
  ];

  const headerAction = useMemo(
    () => {
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
            emitEvent('willCreateEntry');
            push({
              pathname: `${pathname}/create`,
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
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [label, pathname, search, canCreate, formatMessage]
  );

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
                count > 1
                  ? `${pluginId}.containers.List.pluginHeaderDescription`
                  : `${pluginId}.containers.List.pluginHeaderDescription.singular`,
            },
            { label: count }
          )
        : null,
      actions: headerAction,
    };
    /* eslint-enable indent */
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [count, headerAction, label, canRead, formatMessage]);

  return (
    <>
      <ListViewProvider
        data={data}
        count={count}
        entriesToDelete={entriesToDelete}
        emitEvent={emitEvent}
        firstSortableElement={getFirstSortableElement()}
        label={label}
        onChangeBulk={onChangeBulk}
        onChangeBulkSelectall={onChangeBulkSelectall}
        onChangeSearch={handleChangeSearch}
        onClickDelete={handleClickDelete}
        schema={listSchema}
        slug={slug}
        toggleModalDeleteAll={toggleModalDeleteAll}
        _limit={_limit}
        _page={_page}
        filters={filters}
        _q={_q}
        _sort={_sort}
      >
        <FilterPicker
          actions={filterPickerActions}
          isOpen={isFilterPickerOpen}
          name={label}
          toggleFilterPickerState={toggleFilterPickerState}
          onSubmit={handleSubmit}
        />
        <Container className="container-fluid">
          {!isFilterPickerOpen && <Header {...headerProps} isLoading={isLoading && canRead} />}
          {isSearchable && canRead && (
            <Search changeParams={handleChangeSearch} initValue={_q} model={label} value={_q} />
          )}
          {canRead && (
            <Wrapper>
              <div className="row" style={{ marginBottom: '5px' }}>
                <div className="col-10">
                  <div className="row" style={{ marginLeft: 0, marginRight: 0 }}>
                    {isFilterable && (
                      <>
                        <AddFilterCta type="button" onClick={toggleFilterPickerState}>
                          <FilterIcon />
                          <FormattedMessage id="app.utils.filters" />
                        </AddFilterCta>
                        {filters.map((filter, key) => (
                          <Filter
                            {...filter}
                            changeParams={handleChangeFilters}
                            filters={filters}
                            index={key}
                            schema={listSchema}
                            key={key}
                            toggleFilterPickerState={toggleFilterPickerState}
                            isFilterPickerOpen={isFilterPickerOpen}
                          />
                        ))}
                      </>
                    )}
                  </div>
                </div>
                <div className="col-2">
                  <CheckPermissions permissions={pluginPermissions.collectionTypesConfigurations}>
                    <DisplayedFieldsDropdown
                      isOpen={isLabelPickerOpen}
                      items={allLabels}
                      onChange={handleChangeListLabels}
                      onClickReset={() => {
                        resetListLabels(slug);
                      }}
                      slug={slug}
                      toggle={toggleLabelPickerState}
                    />
                  </CheckPermissions>
                </div>
              </div>
              <div className="row" style={{ paddingTop: '12px' }}>
                <div className="col-12">
                  <CustomTable
                    data={data}
                    canDelete={canDelete}
                    canUpdate={canUpdate}
                    headers={tableHeaders}
                    isBulkable={isBulkable}
                    onChangeParams={handleChangeSearch}
                    showLoader={isLoading}
                  />
                  <Footer />
                </div>
              </div>
            </Wrapper>
          )}
        </Container>
        <PopUpWarning
          isOpen={showWarningDelete}
          toggleModal={toggleModalDelete}
          content={{
            title: `${pluginId}.popUpWarning.title`,
            message: `${pluginId}.popUpWarning.bodyMessage.contentType.delete`,
            cancel: `${pluginId}.popUpWarning.button.cancel`,
            confirm: `${pluginId}.popUpWarning.button.confirm`,
          }}
          onConfirm={handleConfirmDeleteData}
          popUpWarningType="danger"
          onClosed={handleModalClose}
          isConfirmButtonLoading={showModalConfirmButtonLoading}
        />
        <PopUpWarning
          isOpen={showWarningDeleteAll}
          toggleModal={toggleModalDeleteAll}
          content={{
            title: `${pluginId}.popUpWarning.title`,
            message: `${pluginId}.popUpWarning.bodyMessage.contentType.delete${
              entriesToDelete.length > 1 ? '.all' : ''
            }`,
            cancel: `${pluginId}.popUpWarning.button.cancel`,
            confirm: `${pluginId}.popUpWarning.button.confirm`,
          }}
          popUpWarningType="danger"
          onConfirm={handleConfirmDeleteAllData}
          onClosed={handleModalClose}
          isConfirmButtonLoading={showModalConfirmButtonLoading}
        />
      </ListViewProvider>
    </>
  );
}
ListView.defaultProps = {
  layouts: {},
};

ListView.propTypes = {
  count: PropTypes.number.isRequired,
  data: PropTypes.array.isRequired,
  didDeleteData: PropTypes.bool.isRequired,
  emitEvent: PropTypes.func.isRequired,
  entriesToDelete: PropTypes.array.isRequired,
  isLoading: PropTypes.bool.isRequired,
  layouts: PropTypes.object,
  location: PropTypes.shape({
    pathname: PropTypes.string.isRequired,
    search: PropTypes.string.isRequired,
  }).isRequired,
  models: PropTypes.array.isRequired,
  getData: PropTypes.func.isRequired,
  getDataSucceeded: PropTypes.func.isRequired,
  history: PropTypes.shape({
    push: PropTypes.func.isRequired,
  }).isRequired,
  onChangeBulk: PropTypes.func.isRequired,
  onChangeBulkSelectall: PropTypes.func.isRequired,
  onChangeListLabels: PropTypes.func.isRequired,
  onDeleteDataError: PropTypes.func.isRequired,
  onDeleteDataSucceeded: PropTypes.func.isRequired,
  onDeleteSeveralDataSucceeded: PropTypes.func.isRequired,
  resetListLabels: PropTypes.func.isRequired,
  resetProps: PropTypes.func.isRequired,
  setModalLoadingState: PropTypes.func.isRequired,
  showModalConfirmButtonLoading: PropTypes.bool.isRequired,
  showWarningDelete: PropTypes.bool.isRequired,
  showWarningDeleteAll: PropTypes.bool.isRequired,
  slug: PropTypes.string.isRequired,
  toggleModalDelete: PropTypes.func.isRequired,
  toggleModalDeleteAll: PropTypes.func.isRequired,
};

const mapStateToProps = makeSelectListView();

export function mapDispatchToProps(dispatch) {
  return bindActionCreators(
    {
      getData,
      getDataSucceeded,
      onChangeBulk,
      onChangeBulkSelectall,
      onChangeListLabels,
      onDeleteDataError,
      onDeleteDataSucceeded,
      onDeleteSeveralDataSucceeded,
      resetListLabels,
      resetProps,
      setModalLoadingState,
      toggleModalDelete,
      toggleModalDeleteAll,
    },
    dispatch
  );
}
const withConnect = connect(mapStateToProps, mapDispatchToProps);

export default compose(withConnect, memo)(ListView);
