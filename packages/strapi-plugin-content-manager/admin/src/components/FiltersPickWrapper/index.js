/**
 *
 * FiltersPickWrapper
 */

import React from 'react';
import PropTypes from 'prop-types';
import { FormattedMessage } from 'react-intl';
import { cloneDeep } from 'lodash';

import FilterOptions from 'components/FilterOptions/Loadable';

// You can find these components in either
// ./node_modules/strapi-helper-plugin/lib/src
// or strapi/packages/strapi-helper-plugin/lib/src
import PluginHeader from 'components/PluginHeader';
import SlideDown from 'components/SlideDown/Loadable';

import Div from './Div';

const spanStyle = {
  color: '#787E8F',
  fontSize: '20px',
  fontWeight: '500',
};

const FILTER = { model: '', filter: '', value: '', attrType: 'string' };

class FiltersPickWrapper extends React.PureComponent {
  state = { filters: this.props.appliedFilters.concat(FILTER) };

  handleClickAdd = () => this.setState(prevState => ({ filters: prevState.filters.concat(FILTER) }));

  handleClickRemove = (index) => {
    const filters = cloneDeep(this.state.filters);
    filters.splice(index, 1);

    this.setState({ filters });
  }

  shouldDisplayAddButton = (index) => index === this.state.filters.length - 1;

  shouldDisplayRemoveButton = (index) => index < this.state.filters.length - 1;

  renderTitle = () => (
    <FormattedMessage id="content-manager.components.FiltersPickWrapper.PluginHeader.title.filter">
      {message => (
        <span>
          {this.props.modelName}&nbsp;-&nbsp;
          <span style={spanStyle}>
            {message}
          </span>
        </span>
      )}
    </FormattedMessage>
  );

  render() {
    const { actions, show } = this.props;

    return (
      <SlideDown on={show}>
        <Div>
          <div>
            <PluginHeader
              actions={actions}
              description={{
                id: 'content-manager.components.FiltersPickWrapper.PluginHeader.description',
              }}
              title={this.renderTitle()}
            />
            <div style={{ marginTop: '-10px' }}>
              {this.state.filters.map((filter, key) => (
                <FilterOptions
                  key={key}
                  filter={filter}
                  index={key}
                  onClickAdd={this.handleClickAdd}
                  onClickRemove={this.handleClickRemove}
                  showAddButton={this.shouldDisplayAddButton(key)}
                  showRemoveButton={this.shouldDisplayRemoveButton(key)}
                />
              ))}
            </div>
          </div>
        </Div>
      </SlideDown>
    );
  }
}

FiltersPickWrapper.defaultProps = {
  actions: [],
  appliedFilters: [],
  modelName: '',
};

FiltersPickWrapper.propTypes = {
  actions: PropTypes.array,
  appliedFilters: PropTypes.array,
  modelName: PropTypes.string,
  show: PropTypes.bool.isRequired,
};

export default FiltersPickWrapper;
