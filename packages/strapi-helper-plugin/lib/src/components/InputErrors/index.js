import React from 'react';
import PropTypes from 'prop-types';
import { FormattedMessage } from 'react-intl';
import { isEmpty, isObject, map } from 'lodash';
import cn from 'classnames';

import styles from './styles.scss';

function InputErrors(props) {
  const divStyle = Object.assign({ display: 'block' }, props.style);

  return (
    <div>
      {map(props.errors, (error, key) => {
        const displayError = isObject(error) && error.id ?
          <FormattedMessage {...error} values={{ errorMessage: error.errorMessage }} /> : error;

        return (
          <div
            className={cn(
              'form-control-feedback',
              'invalid-feedback',
              styles.errorContainer,
              !isEmpty(props.className) && props.className,
            )}
            id={`errorOf${props.name}`}
            key={key}
            style={divStyle}
          >
            {displayError}
          </div>
        );
      })}
    </div>
  );
}

InputErrors.defaultProps = {
  className: '',
  errors: [],
  name: '',
  style: {},
};

InputErrors.propTypes = {
  className: PropTypes.string,
  errors: PropTypes.array,
  name: PropTypes.string,
  style: PropTypes.object,
};

export default InputErrors;
