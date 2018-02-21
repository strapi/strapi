/**
 *
 * Edit
 *
 */

import React from 'react';
import PropTypes from 'prop-types';
import {
  // findIndex,
  get,
  isEmpty,
  isFunction,
  merge,
  omit,
} from 'lodash';

// You can find these components in either
// ./node_modules/strapi-helper-plugin/lib/src
// or strapi/packages/strapi-helper-plugin/lib/src
import Input from 'components/InputsIndex';

import styles from './styles.scss';

const getInputType = (type = '') => {
  switch (type.toLowerCase()) {
    case 'boolean':
      return 'checkbox';
    case 'bigint':
    case 'decimal':
    case 'float':
    case 'integer':
      return 'number';
    case 'date':
    case 'datetime':
      return 'date';
    case 'email':
      return 'email';
    case 'enumeration':
      return 'select';
    case 'password':
      return 'password';
    case 'string':
      return 'text';
    case 'text':
      return 'textarea';
    default:
      return 'text';
  }
};

class Edit extends React.PureComponent {
  state = { currentLayout: {}, displayedFields: {} };

  componentDidMount() {
    this.setLayout(this.props);
  }

  componentWillReceiveProps(nextProps) {
    if (isEmpty(this.props.layout) && !isEmpty(nextProps.layout)) {
      this.setLayout(nextProps);
    }
  }

  setLayout = (props) => {
    const currentLayout = get(props.layout, [props.modelName, 'attributes']);
    const displayedFields = merge(get(currentLayout), omit(props.schema.fields, 'id'));

    this.setState({ currentLayout, displayedFields });
  }

  /**
   * Retrieve the Input layout
   * @param  {String} attr [description]
   * @return {Object}      Object containing the Input's label customBootstrapClass, ...
   */
  getInputLayout = (attr) => (
    Object.keys(get(this.state.currentLayout, attr, {})).reduce((acc, current) => {
      acc[current] = isFunction(this.state.currentLayout[attr][current]) ?
        this.state.currentLayout[attr][current](this) :
        this.state.currentLayout[attr][current];
      return acc;
    }, {})
  )

  render(){
    return (
      <div className={styles.form}>
        <div className="row">
          {Object.keys(this.state.displayedFields).map((attr, key) => {
            const details = this.state.displayedFields[attr];
            // Retrieve the input's bootstrapClass from the layout
            const layout = this.getInputLayout(attr);

            return (
              <Input
                autoFocus={key === 0}
                customBootstrapClass={get(layout, 'className')}
                didCheckErrors={this.props.didCheckErrors}
                key={attr}
                label={get(layout, 'label') || details.label || ''}
                name={attr}
                onChange={this.props.onChange}
                selectOptions={get(this.props.attributes, [attr, 'enum'])}
                placeholder={get(layout, 'placeholder') || details.placeholder}
                type={get(layout, 'type', getInputType(details.type))}
                value={this.props.record[attr]}
              />
            );
          })}
        </div>
      </div>
    );
  }
}

Edit.defaultProps = {
  attributes: {},
  layout: {},
  onChange: () => {},
  record: {},
};

Edit.propTypes = {
  attributes: PropTypes.object,
  didCheckErrors: PropTypes.bool.isRequired,
  layout: PropTypes.object,
  onChange: PropTypes.func,
  record: PropTypes.object,
};

export default Edit;
