/**
 *
 * EditForm
 *
 */

// Dependencies.
import React from 'react';
import _ from 'lodash';

// Components.
import Input from 'components/Input';

// Styles.
import styles from './styles.scss';

class EditForm extends React.Component {
  constructor(props) {
    super(props);
  }

  getInputType = (type) => {
    switch (type.toLowerCase()) {
      case 'boolean':
        return 'checkbox';
      case 'text':
        return 'textarea';
      case 'string':
        return 'text';
      default:
        return 'text';
    }
  }

  render() {
    // Remove `id` field
    const displayedFields = _.omit(this.props.schema[this.props.currentModelName].fields, 'id');

    // List fields inputs
    const fields = Object.keys(displayedFields).map(attr => {
      const details = displayedFields[attr];

      return (
        <Input
          key={attr}
          type={this.getInputType(details.type)}
          name={details.label}
          target={attr}
          value={this.props.record && this.props.record.get(attr)}
          placeholder={details.placeholder || details.label || attr}
          handleChange={this.props.handleChange}
          validations={{}}
        />
      );
    });

    return (
      <div>
        <form className={styles.form}>
          {fields}
        </form>
      </div>
    );
  }
}

EditForm.propTypes = {
  currentModelName: React.PropTypes.string.isRequired,
  handleChange: React.propTypes.func.isRequired,
  record: React.PropTypes.oneOfType([
    React.PropTypes.object,
    React.PropTypes.bool,
  ]).isRequired,
  schema: React.PropTypes.object.isRequired,
};

export default EditForm;
