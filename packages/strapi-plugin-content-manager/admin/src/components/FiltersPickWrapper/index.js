/**
 *
 * FiltersPickWrapper
 */

import React from 'react';
import moment from 'moment';
import PropTypes from 'prop-types';
import { FormattedMessage } from 'react-intl';
import { isObject } from 'lodash';

import FilterOptions from 'components/FilterOptions/Loadable';

// You can find these components in either
// ./node_modules/strapi-helper-plugin/lib/src
// or strapi/packages/strapi-helper-plugin/lib/src
import PluginHeader from 'components/PluginHeader';
import SlideDown from 'components/SlideDown';

import Div from './Div';
import Flex from './Flex';
import SpanStyled from './SpanStyled';
import Wrapper from './Wrapper';

class FiltersPickWrapper extends React.PureComponent {
  componentDidMount() {
    // Display the first filter
    if (this.props.appliedFilters.length === 0) {
      this.handleClickAdd();
    }
  }

  // Since the component is never unmounted we need this hook
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
          setTimeout(() => { // We need the timeout here because of the animation
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
    let value = target.value;

    // Reset the filter value when changing the field of the schema
    if (split[1] === 'attr') {
      // Always set the filter to true when the field is a boolean
      const valueToChange = this.props.schema[target.value].type === 'boolean' ? true : '';
      this.props.onChange(split[0], 'value', valueToChange);
    }

    if (split[1] === 'value' && isObject(target.value) && target.value._isAMomentObject === true ) {
      value = moment(target.value, 'YYYY-MM-DD HH:mm:ss').format();
    }

    this.props.onChange(split[0], split[1], value);
  }

  handleClickAdd = () => {
    const { addFilter, schema } = this.props;
    const filter = { attr: Object.keys(schema)[0], filter: '=', value: '' };

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
          <SpanStyled>
            {message}
          </SpanStyled>
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
              <Wrapper>
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
              </Wrapper>
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
