/**
*
* CustomCheckbox
*
*/

import React from 'react';
import PropTypes from 'prop-types';
import { FormattedMessage } from 'react-intl';

import InputNumber from 'components/InputNumberWithErrors';

// import styles from './styles.scss';

class CustomCheckbox extends React.Component { // eslint-disable-line react/prefer-stateless-function
  state = { isChecked: this.props.value !== null && this.props.value !== undefined };

  handleChange = ({ target: { checked } }) => {
    this.setState({ isChecked: checked });

    if (!checked) {
      const { name, onChange } = this.props;
      const target = { name, value: null };

      onChange({ target });
    }
  }

  handleInputNumberChange = ({ target: { value } }) => {
    const { name, onChange } = this.props;
    const target = {
      name,
      type: 'number',
      value: parseInt(value, 10),
    };

    onChange({ target });
  }

  render() {
    const { isChecked } = this.state;
    const { label, name, value} = this.props;

    return (
      <div className="col-md-12" style={{ marginTop: -4, marginBottom: 9 }}>
        <FormattedMessage id={label.id}>
          {msg => (
            <label htmlFor={name} style={{ fontWeight: 'bold', cursor: 'pointer' }}>
              <input
                style={{ marginLeft: 0, marginRight: 13 }}
                checked={isChecked}
                name={name}
                id={name}
                onChange={this.handleChange}
                type="checkbox"
              />
              {msg}
            </label>
          )}
        </FormattedMessage>
        {isChecked && (
          <InputNumber
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
  label: {
    id: 'app.utils.defaultMessage',
  },
  name: '',
  value: null,
};

CustomCheckbox.propTypes = {
  label: PropTypes.shape({
    id: PropTypes.string,
  }),
  name: PropTypes.string,
  onChange: PropTypes.func.isRequired,
  value: PropTypes.number,
};

export default CustomCheckbox;
