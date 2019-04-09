/**
 *
 * CustomCheckbox
 *
 */

import React from 'react';
import PropTypes from 'prop-types';
import { FormattedMessage } from 'react-intl';

import InputNumber from 'components/InputNumberWithErrors';

class CustomCheckbox extends React.Component {
  // eslint-disable-line react/prefer-stateless-function
  state = {
    isChecked: this.props.value !== null && this.props.value !== undefined,
  };

  handleChange = ({ target: { checked } }) => {
    this.setState({ isChecked: checked });

    const { name, onChange } = this.props;
    const value = checked ? '' : null;
    const target = { name, value };

    onChange({ target });
  };

  handleInputNumberChange = ({ target: { value } }) => {
    const { name, onChange } = this.props;
    const target = {
      name,
      type: 'number',
      value: parseInt(value, 10),
    };

    onChange({ target });
  };

  render() {
    const { isChecked } = this.state;
    const { didCheckErrors, errors, label, name, value } = this.props;

    // TODO: remove inline after migrating to Buffet
    return (
      <div className='col-md-12' style={{ marginTop: -4, marginBottom: 9 }}>
        <FormattedMessage id={label.id}>
          {msg => (
            <label
              htmlFor={name}
              style={{ fontWeight: '500', fontSize: 12, cursor: 'pointer' }}
            >
              <input
                style={{ marginLeft: 0, marginRight: 13 }}
                checked={isChecked}
                name={name}
                id={name}
                onChange={this.handleChange}
                type='checkbox'
              />
              {msg}
            </label>
          )}
        </FormattedMessage>
        {isChecked && (
          <InputNumber
            didCheckErrors={didCheckErrors}
            errors={errors}
            name={name}
            onChange={this.handleInputNumberChange}
            value={value || ''}
            style={{ marginTop: -15 }}
          />
        )}
      </div>
    );
  }
}

CustomCheckbox.defaultProps = {
  didCheckErrors: false,
  errors: [],
  label: {
    id: 'app.utils.defaultMessage',
  },
  name: '',
  value: null,
};

CustomCheckbox.propTypes = {
  didCheckErrors: PropTypes.bool,
  errors: PropTypes.array,
  label: PropTypes.shape({
    id: PropTypes.string,
  }),
  name: PropTypes.string,
  onChange: PropTypes.func.isRequired,
  value: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
};

export default CustomCheckbox;
