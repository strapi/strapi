import React, { memo, useCallback, useEffect, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { bindActionCreators, compose } from 'redux';
import { capitalize, get, sortBy } from 'lodash';
import { FormattedMessage } from 'react-intl';
import {
  PluginHeader,
  PopUpWarning,
  getQueryParameters,
} from 'strapi-helper-plugin';
import pluginId from '../../pluginId';
import { ListViewProvider } from '../../contexts/ListView';
import DisplayedFieldsDropdown from '../../components/DisplayedFieldsDropdown';
import FilterLogo from '../../assets/images/icon_filter.png';
import Container from '../../components/Container';
import CustomTable from '../../components/CustomTable';
import FilterPicker from '../../components/FilterPicker';
import Search from '../../components/Search';
import {
  generateFiltersFromSearch,
  generateSearchFromFilters,
} from '../../utils/search';
import { onChangeListLabels, resetListLabels } from '../Main/actions';
import { AddFilterCta, Img, Wrapper } from './components';
import Filter from './Filter';
import Footer from './Footer';
import {
  getData,
  onChangeBulk,
  onChangeBulkSelectall,
  onDeleteData,
  onDeleteSeveralData,
  resetProps,
  toggleModalDelete,
  toggleModalDeleteAll,
} from './actions';
import reducer from './reducer';
import saga from './saga';
import makeSelectListView from './selectors';

function ListView({
  count,
  data,
  emitEvent,
  entriesToDelete,
  location: { pathname, search },
  getData,
  layouts,
  isLoading,
  history: { push },
  match: {
    params: { slug },
  },
  onChangeBulk,
  onChangeBulkSelectall,
  onChangeListLabels,
  onDeleteData,
  onDeleteSeveralData,
  resetListLabels,
  resetProps,
  shouldRefetchData,
  showWarningDelete,
  toggleModalDelete,
  showWarningDeleteAll,
  toggleModalDeleteAll,
}) {
  strapi.useInjectReducer({ key: 'listView', reducer, pluginId });
  strapi.useInjectSaga({ key: 'listView', saga, pluginId });

  const getLayoutSettingRef = useRef();
  const [isLabelPickerOpen, setLabelPickerState] = useState(false);
  const [isFilterPickerOpen, setFilterPickerState] = useState(false);
  const [idToDelete, setIdToDelete] = useState(null);

  getLayoutSettingRef.current = settingName =>
    get(layouts, [slug, 'settings', settingName], '');

  const getSearchParams = useCallback(
    (updatedParams = {}) => {
      return {
        _limit:
          getQueryParameters(search, '_limit') ||
          getLayoutSettingRef.current('pageSize'),
        _page: getQueryParameters(search, '_page') || 1,
        _q: getQueryParameters(search, '_q') || '',
        _sort:
          getQueryParameters(search, '_sort') ||
          `${getLayoutSettingRef.current(
            'defaultSortBy'
          )}:${getLayoutSettingRef.current('defaultSortOrder')}`,
        source: getQueryParameters(search, 'source'),
        filters: generateFiltersFromSearch(search),
        ...updatedParams,
      };
    },
    [getLayoutSettingRef, search]
  );
  useEffect(() => {
    getData(slug, getSearchParams());

    return () => {
      resetProps();
      setFilterPickerState(false);
    };
    /* eslint-disable-next-line react-hooks/exhaustive-deps */
  }, [slug, shouldRefetchData]);

  const toggleLabelPickerState = () => {
    if (!isLabelPickerOpen) {
      emitEvent('willChangeDisplayedFields');
    }

    setLabelPickerState(prevState => !prevState);
  };
  const toggleFilterPickerState = () => {
    setFilterPickerState(prevState => !prevState);
  };

  // Helpers
  const getMetaDatas = (path = []) =>
    get(layouts, [slug, 'metadatas', ...path], {});
  const getListLayout = () => get(layouts, [slug, 'layouts', 'list'], []);
  const getAllLabels = () => {
    return sortBy(
      Object.keys(getMetaDatas())
        .filter(
          key =>
            !['json', 'group', 'relation', 'richtext'].includes(
              get(layouts, [slug, 'schema', 'attributes', key, 'type'], '')
            )
        )
        .map(label => ({
          name: label,
          value: getListLayout().includes(label),
        })),
      ['label', 'name']
    );
  };
  const getFirstSortableElement = (name = '') => {
    return get(
      getListLayout().filter(h => {
        return h !== name && getMetaDatas([h, 'list', 'sortable']) === true;
      }),
      ['0'],
      'id'
    );
  };
  const getTableHeaders = () => {
    return getListLayout().map(label => {
      return { ...getMetaDatas([label, 'list']), name: label };
    });
  };
  const handleChangeListLabels = ({ name, value }) => {
    const currentSort = getSearchParams()._sort;

    if (value && getListLayout().length === 1) {
      strapi.notification.error(
        'content-manager.notification.error.displayedFields'
      );

      return;
    }

    if (currentSort.split(':')[0] === name && value) {
      emitEvent('didChangeDisplayedFields');
      handleChangeParams({
        target: {
          name: '_sort',
          value: `${getFirstSortableElement(name)}:ASC`,
        },
      });
    }
    onChangeListLabels({
      target: { name: `${slug}.${name}`, value: !value },
    });
  };

  const handleChangeParams = ({ target: { name, value } }) => {
    const updatedSearch = getSearchParams({ [name]: value });
    const newSearch = generateSearchFromFilters(updatedSearch);

    if (name === '_limit') {
      emitEvent('willChangeNumberOfEntriesPerPage');
    }

    push({ search: newSearch });
    resetProps();
    getData(slug, updatedSearch);
  };
  const handleClickDelete = id => {
    setIdToDelete(id);
    toggleModalDelete();
  };
  const handleSubmit = (filters = []) => {
    emitEvent('didFilterEntries');
    toggleFilterPickerState();
    handleChangeParams({ target: { name: 'filters', value: filters } });
  };

  const filterPickerActions = [
    {
      label: `${pluginId}.components.FiltersPickWrapper.PluginHeader.actions.clearAll`,
      kind: 'secondary',
      onClick: () => {
        toggleFilterPickerState();
        handleChangeParams({ target: { name: 'filters', value: [] } });
      },
    },
    {
      label: `${pluginId}.components.FiltersPickWrapper.PluginHeader.actions.apply`,
      kind: 'primary',
      type: 'submit',
    },
  ];
  const pluginHeaderActions = [
    {
      id: 'addEntry',
      label: 'content-manager.containers.List.addAnEntry',
      labelValues: {
        entity: capitalize(slug) || 'Content Manager',
      },
      kind: 'primaryAddShape',
      onClick: () => {
        emitEvent('willCreateEntry');
        push({
          pathname: `${pathname}/create`,
          search: `redirectUrl=${pathname}${search}`,
        });
      },
    },
  ];

  return (
    <>
      <ListViewProvider
        data={data}
        count={count}
        entriesToDelete={entriesToDelete}
        emitEvent={emitEvent}
        firstSortableElement={getFirstSortableElement()}
        onChangeBulk={onChangeBulk}
        onChangeBulkSelectall={onChangeBulkSelectall}
        onChangeParams={handleChangeParams}
        onClickDelete={handleClickDelete}
        onDeleteSeveralData={onDeleteSeveralData}
        schema={get(layouts, [slug, 'schema'], {})}
        searchParams={getSearchParams()}
        slug={slug}
        toggleModalDeleteAll={toggleModalDeleteAll}
      >
        <FilterPicker
          actions={filterPickerActions}
          isOpen={isFilterPickerOpen}
          name={slug}
          toggleFilterPickerState={toggleFilterPickerState}
          onSubmit={handleSubmit}
        />
        <Container className="container-fluid">
          {!isFilterPickerOpen && (
            <PluginHeader
              actions={pluginHeaderActions}
              description={{
                id:
                  count > 1
                    ? `${pluginId}.containers.List.pluginHeaderDescription`
                    : `${pluginId}.containers.List.pluginHeaderDescription.singular`,
                values: {
                  label: count,
                },
              }}
              title={{
                id: slug || 'Content Manager',
              }}
              withDescriptionAnim={isLoading}
            />
          )}
          {getLayoutSettingRef.current('searchable') && (
            <Search
              changeParams={handleChangeParams}
              initValue={getQueryParameters(search, '_q') || ''}
              model={slug}
              value={getQueryParameters(search, '_q') || ''}
            />
          )}
          <Wrapper>
            <div className="row" style={{ marginBottom: '6px' }}>
              <div className="col-10">
                <div className="row" style={{ marginLeft: 0, marginRight: 0 }}>
                  {getLayoutSettingRef.current('filterable') && (
                    <>
                      <AddFilterCta
                        type="button"
                        onClick={toggleFilterPickerState}
                      >
                        <Img src={FilterLogo} alt="filter_logo" />
                        <FormattedMessage
                          id={`${pluginId}.components.AddFilterCTA.add`}
                        />
                      </AddFilterCta>
                      {getSearchParams().filters.map((filter, key) => (
                        <Filter
                          {...filter}
                          changeParams={handleChangeParams}
                          filters={getSearchParams().filters}
                          index={key}
                          schema={get(layouts, [slug, 'schema'], {})}
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
                <DisplayedFieldsDropdown
                  isOpen={isLabelPickerOpen}
                  items={getAllLabels()}
                  onChange={handleChangeListLabels}
                  onClickReset={() => {
                    resetListLabels(slug);
                  }}
                  toggle={toggleLabelPickerState}
                />
              </div>
            </div>
            <div className="row" style={{ paddingTop: '30px' }}>
              <div className="col-12">
                <CustomTable
                  data={data}
                  headers={getTableHeaders()}
                  isBulkable={getLayoutSettingRef.current('bulkable')}
                  onChangeParams={handleChangeParams}
                  slug={slug}
                />
                <Footer />
              </div>
            </div>
          </Wrapper>
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
          popUpWarningType="danger"
          onConfirm={() => {
            onDeleteData(idToDelete, slug, getSearchParams().source, emitEvent);
          }}
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
          onConfirm={() => {
            onDeleteSeveralData(
              entriesToDelete,
              slug,
              getSearchParams().source
            );
          }}
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
  emitEvent: PropTypes.func.isRequired,
  entriesToDelete: PropTypes.array.isRequired,
  layouts: PropTypes.object,
  location: PropTypes.shape({
    pathname: PropTypes.string.isRequired,
    search: PropTypes.string.isRequired,
  }),
  getData: PropTypes.func.isRequired,
  isLoading: PropTypes.bool.isRequired,
  history: PropTypes.shape({
    push: PropTypes.func.isRequired,
  }),
  match: PropTypes.shape({
    params: PropTypes.shape({
      slug: PropTypes.string.isRequired,
    }),
  }),
  onChangeBulk: PropTypes.func.isRequired,
  onChangeBulkSelectall: PropTypes.func.isRequired,
  onChangeListLabels: PropTypes.func.isRequired,
  onDeleteData: PropTypes.func.isRequired,
  onDeleteSeveralData: PropTypes.func.isRequired,
  resetListLabels: PropTypes.func.isRequired,
  resetProps: PropTypes.func.isRequired,
  shouldRefetchData: PropTypes.bool.isRequired,
  showWarningDelete: PropTypes.bool.isRequired,
  showWarningDeleteAll: PropTypes.bool.isRequired,
  toggleModalDelete: PropTypes.func.isRequired,
  toggleModalDeleteAll: PropTypes.func.isRequired,
};

const mapStateToProps = makeSelectListView();

export function mapDispatchToProps(dispatch) {
  return bindActionCreators(
    {
      getData,
      onChangeBulk,
      onChangeBulkSelectall,
      onChangeListLabels,
      onDeleteData,
      onDeleteSeveralData,
      resetListLabels,
      resetProps,
      toggleModalDelete,
      toggleModalDeleteAll,
    },
    dispatch
  );
}
const withConnect = connect(
  mapStateToProps,
  mapDispatchToProps
);

export default compose(
  withConnect,
  memo
)(ListView);
