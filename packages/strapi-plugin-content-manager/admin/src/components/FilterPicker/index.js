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
import {  Flex, Span, Wrapper } from './components';
import FilterPickerOption from '../FilterPickerOption';

import init from './init';
import reducer, { initialState } from './reducer';

function FilterPicker({ actions, isOpen, name, onSubmit }) {
  const { schema, searchParams } = useListView();
  const allowedAttributes = Object.keys(get(schema, ['attributes']), {})
    .filter(attr => {
      const current = get(schema, ['attributes', attr], {});

      return current.type !== 'json' && current.type !== undefined;
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

  // Set the filters when the collapse is opening
  const handleEntering = () => {
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
    const currentFilters = searchParams.filters;
    const initialFilters =
      currentFilters.length > 0 ? currentFilters : [initFilter];

    dispatch({
      type: 'SET_FILTERS',
      initialFilters,
    });
  };

  return (
    <Collapse isOpen={isOpen} onEntering={handleEntering}>
      <Container style={{ backgroundColor: 'white' }}>
        <form
          onSubmit={e => {
            e.preventDefault();

            onSubmit();
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
                type={get(schema, ['attributes', filter.name, 'type'], '')}
                key={key}
              />
            ))}
          </Wrapper>
          <Flex>
            <Span onClick={actions[0].onClick}>
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
};

export default withRouter(memo(FilterPicker));
