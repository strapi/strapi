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
import { PluginHeader, getQueryParameters } from 'strapi-helper-plugin';

import pluginId from '../../pluginId';

import FilterLogo from '../../assets/images/icon_filter.png';

import Container from '../../components/Container';
import CustomTable from '../../components/CustomTable';
import FilterPicker from '../../components/FilterPicker';
import InputCheckbox from '../../components/InputCheckbox';
import Search from '../../components/Search';

import { onChangeListLabels, resetListLabels } from '../Main/actions';

import { AddFilterCta, DropDownWrapper, Img, Wrapper } from './components';

import { getData, resetProps } from './actions';
import reducer from './reducer';
import saga from './saga';
import makeSelectListView from './selectors';
const generateSearchFilters = search => {
  return search
    .split('&')
    .filter(
      x =>
        !x.includes('_limit') &&
        !x.includes('_page') &&
        !x.includes('_sort') &&
        !x.includes('source') &&
        !x.includes('_q=')
    )
    .reduce((acc, current) => {
      const [name, value] = current.split('=');
      acc[name] = value;

      return acc;
    }, {});
};

function ListView({
  count,
  data,
  emitEvent,
  location: { search },
  getData,
  layouts,
  isLoading,
  history: { push },
  match: {
    params: { slug },
  },
  onChangeListLabels,
  resetListLabels,
  resetProps,
}) {
  strapi.useInjectReducer({ key: 'listView', reducer, pluginId });
  strapi.useInjectSaga({ key: 'listView', saga, pluginId });

  const [isLabelPickerOpen, setLabelPickerState] = useState(false);
  const [isFilterPickerOpen, setFilterPickerState] = useState(false);
  const getLayoutSettingRef = useRef();
  getLayoutSettingRef.current = settingName =>
    get(layouts, [slug, 'settings', settingName], '');

  const generateSearchParams = useCallback(
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
        ...generateSearchFilters(search),
        ...updatedParams,
      };
    },
    [getLayoutSettingRef, search]
  );

  const toggleLabelPickerState = () =>
    setLabelPickerState(prevState => !prevState);
  const toggleFilterPickerState = () =>
    setFilterPickerState(prevState => !prevState);

  useEffect(() => {
    getData(slug, generateSearchParams());

    return () => {
      resetProps();
    };
    /* eslint-disable-next-line react-hooks/exhaustive-deps */
  }, [slug]);

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
  const getAllLabels = () => {
    const metadatas = get(layouts, [slug, 'metadata'], {});

    return sortBy(
      Object.keys(metadatas)
        .filter(key => !isEmpty(get(layouts, [slug, 'metadata', key, 'list'])))
        .map(label => ({
          name: label,
          value: get(layouts, [slug, 'layouts', 'list'], []).includes(label),
        })),
      ['label', 'name']
    );
  };

  const handleChangeParams = ({ target: { name, value } }) => {
    const updatedSearch = generateSearchParams({ [name]: value });
    const newSearch = Object.keys(updatedSearch)
      .map(key => `${key}=${updatedSearch[key]}`)
      .join('&');

    push({ search: newSearch });
    resetProps();
    getData(slug, updatedSearch);
  };
  const handleChangeListLabels = ({ name, value }) => {
    const currentSort = generateSearchParams()._sort;
    const displayedLabels = getTableHeaders();

    if (value && displayedLabels.length === 1) {
      strapi.notification.error(
        'content-manager.notification.error.displayedFields'
      );

      return;
    }

    if (currentSort.split(':')[0] === name && value) {
      const firstSortableElement = get(
        displayedLabels.filter(h => h.name !== name && h.sortable === true),
        ['0', 'name'],
        'id'
      );

      emitEvent('didChangeDisplayedFields');
      handleChangeParams({
        target: { name: '_sort', value: `${firstSortableElement}:ASC` },
      });
    }

    onChangeListLabels({
      target: { name: `${slug}.${name}`, value: !value },
    });
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

  const handleSubmit = () => {
    emitEvent('didFilterEntries');
    toggleFilterPickerState();
  };
  const getTableHeaders = useCallback(() => {
    const metadatas = get(layouts, [slug, 'metadata'], {});

    return get(layouts, [slug, 'layouts', 'list'], []).map(label => {
      const infos = get(metadatas, [label, 'list'], {});

      return { ...infos, name: label };
    });
  }, [layouts, slug]);

  return (
    <>
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
                defaultSortBy={getLayoutSettingRef.current('defaultSortBy')}
                defaultSortOrder={getLayoutSettingRef.current(
                  'defaultSortOrder'
                )}
                headers={getTableHeaders()}
                isBulkable={getLayoutSettingRef.current('bulkable')}
                onChangeParams={handleChangeParams}
                slug={slug}
              />
            </div>
          </div>
        </Wrapper>
      </Container>
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
  onChangeListLabels: PropTypes.func.isRequired,
  resetListLabels: PropTypes.func.isRequired,
  resetProps: PropTypes.func.isRequired,
};

const mapStateToProps = makeSelectListView();

export function mapDispatchToProps(dispatch) {
  return bindActionCreators(
    {
      getData,
      onChangeListLabels,
      resetListLabels,
      resetProps,
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
