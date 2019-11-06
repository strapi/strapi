import React from 'react';
import PropTypes from 'prop-types';
import { FormattedMessage } from 'react-intl';
import { isEmpty, isObject, map } from 'lodash';
import cn from 'classnames';
import Div from './Div';

function InputErrors(props) {
  const divStyle = Object.assign({ display: 'block' }, props.style);

  return (
    <div>
      {map(props.errors, (error, key) => {
        const displayError =
          isObject(error) && error.id ? (
            <FormattedMessage
              {...error}
              values={{ errorMessage: error.errorMessage }}
            />
          ) : (
            error
          );

        return (
          <Div
            className={cn(
              'form-control-feedback',
              'invalid-feedback',
              !isEmpty(props.className) && props.className
            )}
            id={`errorOf${props.name}`}
            key={key}
            style={divStyle}
          >
            {displayError}
          </Div>
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
