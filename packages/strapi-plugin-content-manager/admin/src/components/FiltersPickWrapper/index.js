/**
 *
 * FiltersPickWrapper
 */

import React from 'react';
import PropTypes from 'prop-types';
import { FormattedMessage } from 'react-intl';

import FilterOptions from 'components/FilterOptions/Loadable';

// You can find these components in either
// ./node_modules/strapi-helper-plugin/lib/src
// or strapi/packages/strapi-helper-plugin/lib/src
import PluginHeader from 'components/PluginHeader';
import SlideDown from 'components/SlideDown';

import Div from './Div';

const spanStyle = {
  color: '#787E8F',
  fontSize: '20px',
  fontWeight: '500',
};

class FiltersPickWrapper extends React.PureComponent {
  componentDidMount() {
    if (this.props.appliedFilters.length === 0) {
      this.handleClickAdd();
    }
  }

  componentDidUpdate(prevProps) {
    const { appliedFilters, show } = this.props;

    if (prevProps.show !== show && show && appliedFilters.length === 0) {
      this.handleClickAdd();
    }
  }

  handleClickAdd = () => {
    const { addFilter, schema } = this.props;
    const filter = { model: Object.keys(schema)[0], filter: '=', value: '', attrType: 'string' };

    return addFilter(filter);
  }

  handleClickRemove = (index) => {
    if (this.props.appliedFilters.length == 1) {
      this.props.close();

      return new Promise(resolve => {
        setTimeout(() => {
          this.props.removeFilter(index);
          resolve();
        }, 600);
      });
    }

    return this.props.removeFilter(index);
  }

  shouldDisplayAddButton = (index) => {
    const { appliedFilters } = this.props;

    return appliedFilters.length === 1 || index === appliedFilters.length - 1;
  }

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
    const { actions, appliedFilters, schema, show } = this.props;

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
              {appliedFilters.map((filter, key) => (
                <FilterOptions
                  key={key}
                  filter={filter}
                  index={key}
                  onClickAdd={this.handleClickAdd}
                  onClickRemove={this.handleClickRemove}
                  schema={schema}
                  showAddButton={this.shouldDisplayAddButton(key)}
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
  schema: {},
};

FiltersPickWrapper.propTypes = {
  actions: PropTypes.array,
  addFilter: PropTypes.func.isRequired,
  appliedFilters: PropTypes.array,
  close: PropTypes.func.isRequired,
  modelName: PropTypes.string,
  removeFilter: PropTypes.func.isRequired,
  schema: PropTypes.object,
  show: PropTypes.bool.isRequired,
};

export default FiltersPickWrapper;
