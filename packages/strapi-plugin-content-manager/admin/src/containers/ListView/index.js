import React, { memo, useCallback, useEffect } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { bindActionCreators, compose } from 'redux';
import { capitalize, get } from 'lodash';

import { PluginHeader, getQueryParameters } from 'strapi-helper-plugin';

import pluginId from '../../pluginId';

import Container from '../../components/Container';
import Search from '../../components/Search';

import { getData, resetProps } from './actions';
import reducer from './reducer';
import saga from './saga';
import makeSelectListView from './selectors';

function ListView({
  count,
  emitEvent,
  location: { search },
  getData,
  layouts,
  isLoading,
  history: { push },
  match: {
    params: { slug },
  },
  resetProps,
}) {
  strapi.useInjectReducer({ key: 'listView', reducer, pluginId });
  strapi.useInjectSaga({ key: 'listView', saga, pluginId });

  const getLayoutSetting = useCallback(
    settingName => get(layouts, [slug, 'settings', settingName], ''),
    [layouts, slug]
  );

  const generateSearchParams = useCallback(
    (updatedParams = {}) => {
      return {
        _limit:
          getQueryParameters(search, '_limit') || getLayoutSetting('pageSize'),
        _page: getQueryParameters(search, '_page') || 1,
        _q: getQueryParameters(search, '_q') || '',
        _sort:
          getQueryParameters(search, '_sort') ||
          `${getLayoutSetting('defaultSortBy')}:${getLayoutSetting(
            'defaultSortOrder'
          )}`,
        source: getQueryParameters(search, 'source'),
        ...updatedParams,
      };
    },
    [getLayoutSetting, search]
  );

  useEffect(() => {
    getData(slug, generateSearchParams());

    return () => {
      resetProps();
    };
    /* eslint-disable-next-line react-hooks/exhaustive-deps */
  }, [slug]);
  console.log(getLayoutSetting('layouts.list'));

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
  const handleChangeParams = ({ target: { name, value } }) => {
    const updatedSearch = generateSearchParams({ [name]: value });
    const newSearch = Object.keys(updatedSearch)
      .map(key => `${key}=${updatedSearch[key]}`)
      .join('&');

    push({ search: newSearch });
    resetProps();
    getData(slug, updatedSearch);
  };

  return (
    <>
      <Container>
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
        {getLayoutSetting('searchable') && (
          <Search
            changeParams={handleChangeParams}
            initValue={getQueryParameters(search, '_q') || ''}
            model={slug}
            value={getQueryParameters(search, '_q') || ''}
          />
        )}
      </Container>
    </>
  );
}
ListView.defaultProps = {
  layouts: {},
};

ListView.propTypes = {
  count: PropTypes.number.isRequired,
  emitEvent: PropTypes.func.isRequired,
  layouts: PropTypes.object,
  location: PropTypes.shape({
    search: PropTypes.string.isRequired,
  }),
  getData: PropTypes.func.isRequired,
  isLoading: PropTypes.bool.isRequired,
  match: PropTypes.shape({
    params: PropTypes.shape({
      slug: PropTypes.string.isRequired,
    }),
  }),
  resetProps: PropTypes.func.isRequired,
};

const mapStateToProps = makeSelectListView();

export function mapDispatchToProps(dispatch) {
  return bindActionCreators(
    {
      getData,
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
