import React, { memo, useCallback, useEffect, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { bindActionCreators, compose } from 'redux';
import { capitalize, get, sortBy } from 'lodash';
import { FormattedMessage } from 'react-intl';
import { Header } from '@buffetjs/custom';
import {
  PopUpWarning,
  getQueryParameters,
  useGlobalContext,
} from 'strapi-helper-plugin';

import pluginId from '../../pluginId';
import DisplayedFieldsDropdown from '../../components/DisplayedFieldsDropdown';
import Container from '../../components/Container';
import CustomTable from '../../components/CustomTable';
import FilterPicker from '../../components/FilterPicker';
import Search from '../../components/Search';
import {
  generateFiltersFromSearch,
  generateSearchFromFilters,
} from '../../utils/search';
import ListViewProvider from '../ListViewProvider';
import { onChangeListLabels, resetListLabels } from '../Main/actions';
import { AddFilterCta, FilterIcon, Wrapper } from './components';
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

/* eslint-disable react/no-array-index-key */

function ListView({
  count,
  data,
  emitEvent,
  entriesToDelete,
  location: { pathname, search },
  getData,
  layouts,
  history: { push },
  onChangeBulk,
  onChangeBulkSelectall,
  onChangeListLabels,
  onDeleteData,
  onDeleteSeveralData,
  resetListLabels,
  resetProps,
  shouldRefetchData,
  showWarningDelete,
  slug,
  toggleModalDelete,
  showWarningDeleteAll,
  toggleModalDeleteAll,
}) {
  strapi.useInjectReducer({ key: 'listView', reducer, pluginId });
  strapi.useInjectSaga({ key: 'listView', saga, pluginId });
  const { formatMessage } = useGlobalContext();
  const getLayoutSettingRef = useRef();
  const [isLabelPickerOpen, setLabelPickerState] = useState(false);
  const [isFilterPickerOpen, setFilterPickerState] = useState(false);
  const [idToDelete, setIdToDelete] = useState(null);
  const contentTypePath = [slug, 'contentType'];

  getLayoutSettingRef.current = settingName =>
    get(layouts, [...contentTypePath, 'settings', settingName], '');

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug, shouldRefetchData]);

  const toggleLabelPickerState = () => {
    if (!isLabelPickerOpen) {
      emitEvent('willChangeListFieldsSettings');
    }

    setLabelPickerState(prevState => !prevState);
  };
  const toggleFilterPickerState = () => {
    if (!isFilterPickerOpen) {
      emitEvent('willFilterEntries');
    }

    setFilterPickerState(prevState => !prevState);
  };

  // Helpers
  const getMetaDatas = (path = []) =>
    get(layouts, [...contentTypePath, 'metadatas', ...path], {});

  const getListLayout = () =>
    get(layouts, [...contentTypePath, 'layouts', 'list'], []);

  const getListSchema = () => get(layouts, [...contentTypePath, 'schema'], {});

  const getName = () => {
    return get(getListSchema(), ['info', 'name'], '');
  };

  const getAllLabels = () => {
    return sortBy(
      Object.keys(getMetaDatas())
        .filter(
          key =>
            ![
              'json',
              'component',
              'dynamiczone',
              'relation',
              'richtext',
            ].includes(get(getListSchema(), ['attributes', key, 'type'], ''))
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
      target: {
        name,
        slug,
        value: !value,
      },
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

  const headerAction = [
    {
      label: formatMessage(
        {
          id: 'content-manager.containers.List.addAnEntry',
        },
        {
          entity: capitalize(getName()) || 'Content Manager',
        }
      ),
      onClick: () => {
        emitEvent('willCreateEntry');
        push({
          pathname: `${pathname}/create`,
          search: `redirectUrl=${pathname}${search}`,
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

  const headerProps = {
    title: {
      label: getName() || 'Content Manager',
    },
    content: formatMessage(
      {
        id:
          count > 1
            ? `${pluginId}.containers.List.pluginHeaderDescription`
            : `${pluginId}.containers.List.pluginHeaderDescription.singular`,
      },
      { label: count }
    ),
    actions: headerAction,
  };

  return (
    <>
      <ListViewProvider
        data={data}
        count={count}
        entriesToDelete={entriesToDelete}
        emitEvent={emitEvent}
        firstSortableElement={getFirstSortableElement()}
        label={getName()}
        onChangeBulk={onChangeBulk}
        onChangeBulkSelectall={onChangeBulkSelectall}
        onChangeParams={handleChangeParams}
        onClickDelete={handleClickDelete}
        onDeleteSeveralData={onDeleteSeveralData}
        schema={getListSchema()}
        searchParams={getSearchParams()}
        slug={slug}
        toggleModalDeleteAll={toggleModalDeleteAll}
      >
        <FilterPicker
          actions={filterPickerActions}
          isOpen={isFilterPickerOpen}
          name={getName()}
          toggleFilterPickerState={toggleFilterPickerState}
          onSubmit={handleSubmit}
        />
        <Container className="container-fluid">
          {!isFilterPickerOpen && <Header {...headerProps} />}
          {getLayoutSettingRef.current('searchable') && (
            <Search
              changeParams={handleChangeParams}
              initValue={getQueryParameters(search, '_q') || ''}
              model={getName()}
              value={getQueryParameters(search, '_q') || ''}
            />
          )}
          <Wrapper>
            <div className="row" style={{ marginBottom: '5px' }}>
              <div className="col-10">
                <div className="row" style={{ marginLeft: 0, marginRight: 0 }}>
                  {getLayoutSettingRef.current('filterable') && (
                    <>
                      <AddFilterCta
                        type="button"
                        onClick={toggleFilterPickerState}
                      >
                        <FilterIcon />
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
                          schema={getListSchema()}
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
                  slug={slug}
                  toggle={toggleLabelPickerState}
                />
              </div>
            </div>
            <div className="row" style={{ paddingTop: '12px' }}>
              <div className="col-12">
                <CustomTable
                  data={data}
                  headers={getTableHeaders()}
                  isBulkable={getLayoutSettingRef.current('bulkable')}
                  onChangeParams={handleChangeParams}
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
            onDeleteData(idToDelete, slug, emitEvent);
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
            onDeleteSeveralData(entriesToDelete, slug);
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
  }).isRequired,
  models: PropTypes.array.isRequired,
  getData: PropTypes.func.isRequired,
  history: PropTypes.shape({
    push: PropTypes.func.isRequired,
  }).isRequired,
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
  slug: PropTypes.string.isRequired,
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
