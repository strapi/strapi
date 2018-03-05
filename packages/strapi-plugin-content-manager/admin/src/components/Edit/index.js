/**
 *
 * Edit
 *
 */

import React from 'react';
import PropTypes from 'prop-types';
import {
  findIndex,
  get,
  has,
  isEmpty,
  isFunction,
  merge,
  omit,
  upperFirst,
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
    case 'file':
    case 'files':
      return 'file';
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
    const displayedFields = merge(this.getUploadRelations(props), get(currentLayout), omit(props.schema.fields, 'id'));

    this.setState({ currentLayout, displayedFields });
  }

  getInputErrors = (attr) => {
    const index = findIndex(this.props.formErrors, ['name', attr]);
    return index !== -1 ? this.props.formErrors[index].errors : [];
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

  /**
   * Retrieve the input's validations
   * @param  {String} attr
   * @return {Object}
   */
  getInputValidations = (attr) => {
    const { formValidations } = this.props;
    const index = findIndex(formValidations, ['name', attr]);

    return get(formValidations, [index, 'validations'], {});
  }

  /**
   * Retrieve all relations made with the upload plugin
   * @param  {Object} props
   * @return {Object}
   */
  getUploadRelations = (props) => (
    Object.keys(get(props.schema, 'relations', {})).reduce((acc, current) => {
      if (get(props.schema, ['relations', current, 'plugin']) === 'upload') {
        acc[current] = {
          description: '',
          label: upperFirst(current),
          type: 'file',
        };
      }

      return acc;
    }, {})
  )

  fileRelationAllowMultipleUpload = (relationName) => has(this.props.schema, ['relations', relationName, 'collection']);

  // orderAttributes = (displayedFields) => Object.keys(displayedFields).sort(name => Object.keys(this.getUploadRelations(this.props)).includes(name));
  orderAttributes = (displayedFields) => Object.keys(displayedFields);

  render(){
    return (
      <div className={styles.form}>
        <div className="row">
          {this.orderAttributes(this.state.displayedFields).map((attr, key) => {
            const details = this.state.displayedFields[attr];
            // Retrieve the input's bootstrapClass from the layout
            const layout = this.getInputLayout(attr);

            return (
              <Input
                autoFocus={key === 0}
                customBootstrapClass={get(layout, 'className')}
                didCheckErrors={this.props.didCheckErrors}
                errors={this.getInputErrors(attr)}
                key={attr}
                label={get(layout, 'label') || details.label || ''}
                multiple={this.fileRelationAllowMultipleUpload(attr)}
                name={attr}
                onChange={this.props.onChange}
                selectOptions={get(this.props.attributes, [attr, 'enum'])}
                placeholder={get(layout, 'placeholder') || details.placeholder}
                type={get(layout, 'type', getInputType(details.type))}
                validations={this.getInputValidations(attr)}
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
  formErrors: [],
  formValidations: [],
  layout: {},
  onChange: () => {},
  record: {},
  schema: {},
};

Edit.propTypes = {
  attributes: PropTypes.object,
  didCheckErrors: PropTypes.bool.isRequired,
  formErrors: PropTypes.array,
  formValidations: PropTypes.array,
  layout: PropTypes.object,
  onChange: PropTypes.func,
  record: PropTypes.object,
  schema: PropTypes.object,
};

export default Edit;
