import React, { memo, useReducer } from 'react';
import { withRouter } from 'react-router';
import PropTypes from 'prop-types';
import { capitalize, get } from 'lodash';
import { Collapse } from 'reactstrap';
import { FormattedMessage } from 'react-intl';
import { PluginHeader } from 'strapi-helper-plugin';

import pluginId from '../../pluginId';
import { useListView } from '../../contexts/ListView';
import Container from '../Container';

import getFilterType from '../FilterPickerOption/utils';
import { Flex, Span, Wrapper } from './components';
import FilterPickerOption from '../FilterPickerOption';

import init from './init';
import reducer, { initialState } from './reducer';

const NOT_ALLOWED_FILTERS = ['json', 'group', 'relation', 'media', 'richtext'];

function FilterPicker({
  actions,
  isOpen,
  name,
  onSubmit,
  toggleFilterPickerState,
}) {
  const { schema, searchParams } = useListView();
  const allowedAttributes = Object.keys(get(schema, ['attributes']), {})
    .filter(attr => {
      const current = get(schema, ['attributes', attr], {});

      return (
        !NOT_ALLOWED_FILTERS.includes(current.type) &&
        current.type !== undefined
      );
    })
    .sort()
    .map(attr => {
      const current = get(schema, ['attributes', attr], {});

      return { name: attr, type: current.type };
    });

  const [state, dispatch] = useReducer(reducer, initialState, () =>
    init(initialState, allowedAttributes[0])
  );
  const modifiedData = state.get('modifiedData').toJS();
  const handleChange = ({ target: { name, value } }) => {
    dispatch({
      type: 'ON_CHANGE',
      keys: name.split('.'),
      value,
    });
  };

  const renderTitle = () => (
    <FormattedMessage
      id={`${pluginId}.components.FiltersPickWrapper.PluginHeader.title.filter`}
    >
      {message => (
        <span>
          {capitalize(name)}&nbsp;-&nbsp;
          <span>{message}</span>
        </span>
      )}
    </FormattedMessage>
  );

  // Generate the first filter for adding a new one or at initial state
  const getInitialFilter = () => {
    const type = get(allowedAttributes, [0, 'type'], '');
    const [filter] = getFilterType(type);
    let value = '';

    if (type === 'boolean') {
      value = 'true';
    } else if (type === 'number') {
      value = 0;
    }
    const initFilter = {
      name: get(allowedAttributes, [0, 'name'], ''),
      filter: filter.value,
      value,
    };

    return initFilter;
  };
  // Set the filters when the collapse is opening
  const handleEntering = () => {
    const currentFilters = searchParams.filters;
    const initialFilters =
      currentFilters.length > 0 ? currentFilters : [getInitialFilter()];

    dispatch({
      type: 'SET_FILTERS',
      initialFilters,
      attributes: get(schema, 'attributes', {}),
    });
  };

  const addFilter = () => {
    dispatch({
      type: 'ADD_FILTER',
      filter: getInitialFilter(),
    });
  };

  return (
    <Collapse isOpen={isOpen} onEntering={handleEntering}>
      <Container style={{ backgroundColor: 'white', paddingBottom: 0 }}>
        <form
          onSubmit={e => {
            e.preventDefault();

            onSubmit(modifiedData);
          }}
        >
          <PluginHeader
            actions={actions}
            title={renderTitle}
            description={{
              id: `${pluginId}.components.FiltersPickWrapper.PluginHeader.description`,
            }}
          />
          <Wrapper>
            {modifiedData.map((filter, key) => (
              <FilterPickerOption
                {...filter}
                allowedAttributes={allowedAttributes}
                index={key}
                modifiedData={modifiedData}
                onChange={handleChange}
                onClickAddFilter={addFilter}
                onRemoveFilter={index => {
                  if (index === 0 && modifiedData.length === 1) {
                    toggleFilterPickerState();

                    return;
                  }

                  dispatch({
                    type: 'REMOVE_FILTER',
                    index,
                  });
                }}
                type={get(schema, ['attributes', filter.name, 'type'], '')}
                showAddButton={key === modifiedData.length - 1}
                key={key}
              />
            ))}
          </Wrapper>
          <Flex>
            <Span onClick={toggleFilterPickerState}>
              <FormattedMessage id="content-manager.components.FiltersPickWrapper.hide" />
              &nbsp;
            </Span>
          </Flex>
        </form>
      </Container>
    </Collapse>
  );
}

FilterPicker.defaultProps = {
  actions: [],
  isOpen: false,
  name: '',
};

FilterPicker.propTypes = {
  actions: PropTypes.array,
  isOpen: PropTypes.bool,
  location: PropTypes.shape({
    search: PropTypes.string.isRequired,
  }),

  name: PropTypes.string,
  onSubmit: PropTypes.func.isRequired,
  toggleFilterPickerState: PropTypes.func.isRequired,
};

export default withRouter(memo(FilterPicker));
