import React, { memo, useCallback, useEffect, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { bindActionCreators, compose } from 'redux';
import { capitalize, get, isEmpty, sortBy } from 'lodash';
import { FormattedMessage } from 'react-intl';
import {
  ButtonDropdown,
  DropdownToggle,
  DropdownMenu,
  DropdownItem,
} from 'reactstrap';
import {
  PluginHeader,
  PopUpWarning,
  getQueryParameters,
} from 'strapi-helper-plugin';
import pluginId from '../../pluginId';
import { ListViewProvider } from '../../contexts/ListView';
import FilterLogo from '../../assets/images/icon_filter.png';
import Container from '../../components/Container';
import CustomTable from '../../components/CustomTable';
import FilterPicker from '../../components/FilterPicker';
import InputCheckbox from '../../components/InputCheckbox';
import Search from '../../components/Search';
import {
  generateFiltersFromSearch,
  generateSearchFromFilters,
} from '../../utils/search';
import { onChangeListLabels, resetListLabels } from '../Main/actions';
import { AddFilterCta, DropDownWrapper, Img, Wrapper } from './components';
import {
  getData,
  onChangeBulk,
  onChangeBulkSelectall,
  onDeleteSeveralData,
  resetProps,
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
  location: { search },
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
  onDeleteSeveralData,
  resetListLabels,
  resetProps,
  shouldRefetchData,
  showWarningDeleteAll,
  toggleModalDeleteAll,
}) {
  strapi.useInjectReducer({ key: 'listView', reducer, pluginId });
  strapi.useInjectSaga({ key: 'listView', saga, pluginId });

  const getLayoutSettingRef = useRef();
  const [isLabelPickerOpen, setLabelPickerState] = useState(false);
  const [isFilterPickerOpen, setFilterPickerState] = useState(false);

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
        ...generateFiltersFromSearch(search),
        ...updatedParams,
      };
    },
    [getLayoutSettingRef, search]
  );
  useEffect(() => {
    getData(slug, getSearchParams());

    return () => {
      resetProps();
    };
    /* eslint-disable-next-line react-hooks/exhaustive-deps */
  }, [slug, shouldRefetchData]);

  const toggleLabelPickerState = () =>
    setLabelPickerState(prevState => !prevState);
  const toggleFilterPickerState = () =>
    setFilterPickerState(prevState => !prevState);

  // Helpers
  const getMetaDatas = (path = []) =>
    get(layouts, [slug, 'metadata', ...path], {});
  const getListLayout = () => get(layouts, [slug, 'layouts', 'list'], []);
  const getAllLabels = () => {
    return sortBy(
      Object.keys(getMetaDatas())
        .filter(key => !isEmpty(getMetaDatas([key, 'list'])))
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

    push({ search: newSearch });
    resetProps();
    getData(slug, updatedSearch);
  };

  const handleSubmit = () => {
    emitEvent('didFilterEntries');
    toggleFilterPickerState();
  };

  const filterPickerActions = [
    {
      label: `${pluginId}.components.FiltersPickWrapper.PluginHeader.actions.clearAll`,
      kind: 'secondary',
      onClick: () => {
        toggleFilterPickerState();
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
      },
    },
  ];

  return (
    <>
      <ListViewProvider
        data={data}
        entriesToDelete={entriesToDelete}
        firstSortableElement={getFirstSortableElement()}
        onChangeBulk={onChangeBulk}
        onChangeBulkSelectall={onChangeBulkSelectall}
        onChangeParams={handleChangeParams}
        onDeleteSeveralData={onDeleteSeveralData}
        searchParams={getSearchParams()}
        slug={slug}
        toggleModalDeleteAll={toggleModalDeleteAll}
      >
        <FilterPicker
          actions={filterPickerActions}
          isOpen={isFilterPickerOpen}
          name={slug}
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
            <div className="row">
              <div className="col-10">
                <AddFilterCta type="button" onClick={toggleFilterPickerState}>
                  <Img src={FilterLogo} alt="filter_logo" />
                  <FormattedMessage
                    id={`${pluginId}.components.AddFilterCTA.add`}
                  />
                </AddFilterCta>
              </div>
              <div className="col-2">
                <DropDownWrapper>
                  <ButtonDropdown
                    isOpen={isLabelPickerOpen}
                    toggle={toggleLabelPickerState}
                    direction="left"
                  >
                    <DropdownToggle />
                    <DropdownMenu>
                      <FormattedMessage id="content-manager.containers.ListPage.displayedFields">
                        {msg => (
                          <DropdownItem
                            onClick={() => {
                              resetListLabels(slug);
                            }}
                          >
                            <div
                              style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                              }}
                            >
                              <span>{msg}</span>
                              <FormattedMessage id="content-manager.containers.Edit.reset" />
                            </div>
                          </DropdownItem>
                        )}
                      </FormattedMessage>
                      {getAllLabels().map(label => {
                        //
                        return (
                          <DropdownItem
                            key={label.name}
                            toggle={false}
                            onClick={() => handleChangeListLabels(label)}
                          >
                            <div>
                              <InputCheckbox
                                onChange={() => handleChangeListLabels(label)}
                                name={label.name}
                                value={label.value}
                              />
                            </div>
                          </DropdownItem>
                        );
                      })}
                    </DropdownMenu>
                  </ButtonDropdown>
                </DropDownWrapper>
              </div>
            </div>
            <div className="row" style={{ paddingTop: '36px' }}>
              <div className="col-12">
                <CustomTable
                  data={data}
                  headers={getTableHeaders()}
                  isBulkable={getLayoutSettingRef.current('bulkable')}
                  onChangeParams={handleChangeParams}
                  slug={slug}
                />
              </div>
            </div>
          </Wrapper>
        </Container>
        <PopUpWarning
          isOpen={showWarningDeleteAll}
          toggleModal={toggleModalDeleteAll}
          content={{
            title: 'content-manager.popUpWarning.title',
            // message: this.getPopUpDeleteAllMsg(),
            cancel: 'content-manager.popUpWarning.button.cancel',
            confirm: 'content-manager.popUpWarning.button.confirm',
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
  onDeleteSeveralData: PropTypes.func.isRequired,
  resetListLabels: PropTypes.func.isRequired,
  resetProps: PropTypes.func.isRequired,
  shouldRefetchData: PropTypes.bool.isRequired,
  showWarningDeleteAll: PropTypes.bool.isRequired,
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
      onDeleteSeveralData,
      resetListLabels,
      resetProps,
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
