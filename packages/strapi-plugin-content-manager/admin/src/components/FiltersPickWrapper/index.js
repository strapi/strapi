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
import Flex from './Flex';

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

  generateActions = () => ([
    {
      label: 'content-manager.components.FiltersPickWrapper.PluginHeader.actions.clearAll',
      kind: 'secondary',
      onClick: () => {
        return new Promise(resolve => {
          this.props.close();
          setTimeout(() => {
            this.props.removeAllFilters();
            resolve();
          }, 600);
        });
      },
    },
    {
      label: 'content-manager.components.FiltersPickWrapper.PluginHeader.actions.apply',
      kind: 'primary',
      type: 'submit',
      onClick: this.props.onSubmit,
    },
  ]);

  handleChange = ({ target }) => {
    const split = target.name.split('.');
    this.props.onChange(split[0], split[1], target.value);
  }

  handleClickAdd = () => {
    const { addFilter, schema } = this.props;
    const filter = { model: Object.keys(schema)[0], filter: '=', value: '' };

    return addFilter(filter);
  }

  handleClickClose = () => this.props.close();

  handleClickRemove = (index) => {
    if (this.props.appliedFilters.length == 1) {
      this.props.close();

      return new Promise(resolve => {
        setTimeout(() => {
          this.props.removeFilter(index);
          this.props.onSubmit();
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
    const { appliedFilters, schema, show } = this.props;

    return (
      <form onSubmit={this.handleSubmit}>
        <SlideDown on={show}>
          <Div>
            <div>
              <PluginHeader
                actions={this.generateActions()}
                description={{
                  id: 'content-manager.components.FiltersPickWrapper.PluginHeader.description',
                }}
                title={this.renderTitle()}
              />
              <div style={{ marginTop: '-13px' }}>
                {appliedFilters.map((filter, key) => (
                  <FilterOptions
                    key={key}
                    filter={filter}
                    index={key}
                    onChange={this.handleChange}
                    onClickAdd={this.handleClickAdd}
                    onClickRemove={this.handleClickRemove}
                    schema={schema}
                    showAddButton={this.shouldDisplayAddButton(key)}
                  />
                ))}
              </div>
            </div>
            <Flex>
              <span onClick={this.handleClickClose}>
                <FormattedMessage id="content-manager.components.FiltersPickWrapper.hide" />
                &nbsp;
              </span>
            </Flex>
          </Div>
        </SlideDown>
      </form>
    );
  }
}

FiltersPickWrapper.defaultProps = {
  appliedFilters: [],
  modelName: '',
  schema: {},
};

FiltersPickWrapper.propTypes = {
  addFilter: PropTypes.func.isRequired,
  appliedFilters: PropTypes.array,
  close: PropTypes.func.isRequired,
  modelName: PropTypes.string,
  onChange: PropTypes.func.isRequired,
  onSubmit: PropTypes.func.isRequired,
  removeAllFilters: PropTypes.func.isRequired,
  removeFilter: PropTypes.func.isRequired,
  schema: PropTypes.object,
  show: PropTypes.bool.isRequired,
};

export default FiltersPickWrapper;
