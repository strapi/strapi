import React, { memo, useMemo, useReducer } from 'react';
import { withRouter } from 'react-router';
import PropTypes from 'prop-types';
import { capitalize, get } from 'lodash';
import { Collapse } from 'reactstrap';
import { FormattedMessage } from 'react-intl';
import {
  PluginHeader,
  getFilterType,
  useUser,
  findMatchingPermissions,
} from 'strapi-helper-plugin';

import pluginId from '../../pluginId';
import useListView from '../../hooks/useListView';
import Container from '../Container';
import FilterPickerOption from '../FilterPickerOption';
import { Flex, Span, Wrapper } from './components';
import init from './init';
import reducer, { initialState } from './reducer';

const NOT_ALLOWED_FILTERS = ['json', 'component', 'relation', 'media', 'richtext', 'dynamiczone'];

function FilterPicker({ actions, isOpen, name, onSubmit, toggleFilterPickerState }) {
  const { schema, filters, slug } = useListView();
  const userPermissions = useUser();
  const readActionAllowedFields = useMemo(() => {
    const matchingPermissions = findMatchingPermissions(userPermissions, [
      {
        action: 'plugins::content-manager.explorer.read',
        subject: slug,
      },
    ]);

    return get(matchingPermissions, ['0', 'fields'], []);
  }, [userPermissions, slug]);
  let timestamps = get(schema, ['options', 'timestamps']);

  if (!Array.isArray(timestamps)) {
    timestamps = [];
  }

  const allowedAttributes = Object.keys(get(schema, ['attributes']), {})
    .filter(attr => {
      const current = get(schema, ['attributes', attr], {});

      if (!readActionAllowedFields.includes(attr) && attr !== 'id' && !timestamps.includes(attr)) {
        return false;
      }

      return !NOT_ALLOWED_FILTERS.includes(current.type) && current.type !== undefined;
    })
    .sort()
    .map(attr => {
      const current = get(schema, ['attributes', attr], {});

      return { name: attr, type: current.type, options: current.enum || null };
    });

  const [state, dispatch] = useReducer(reducer, initialState, () =>
    init(initialState, allowedAttributes[0] || {})
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
    <FormattedMessage id={`${pluginId}.components.FiltersPickWrapper.PluginHeader.title.filter`}>
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
    } else if (type === 'enumeration') {
      value = get(allowedAttributes, [0, 'options', 0], '');
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
    const currentFilters = filters;
    const initialFilters = currentFilters.length > 0 ? currentFilters : [getInitialFilter()];

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
                // eslint-disable-next-line react/no-array-index-key
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
  }).isRequired,
  name: PropTypes.string,
  onSubmit: PropTypes.func.isRequired,
  toggleFilterPickerState: PropTypes.func.isRequired,
};

export default withRouter(memo(FilterPicker));
