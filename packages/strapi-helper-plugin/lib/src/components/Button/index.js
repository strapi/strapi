/**
 *
 * Button
 *
 */

import React from 'react';
import PropTypes from 'prop-types';
import { isEmpty } from 'lodash';
import { FormattedMessage } from 'react-intl';
import StyledButton from './StyledButton';

/* eslint-disable react/require-default-props */
function Button(props) {
  const label =
    !isEmpty(props.label) && !props.children ? (
      <FormattedMessage id={props.label} values={props.labelValues} />
    ) : (
      props.children
    );

  return (
    <StyledButton {...props} type={props.type || 'button'}>
      {!props.loader && label}
      {props.loader && (
        <div className="saving">
          <span>.</span>
          <span>.</span>
          <span>.</span>
        </div>
      )}
    </StyledButton>
  );
}

Button.propTypes = {
  children: PropTypes.node,
  className: PropTypes.any,
  kind: PropTypes.oneOfType([PropTypes.string, PropTypes.bool]),
  label: PropTypes.string,
  labelValues: PropTypes.object,
  loader: PropTypes.bool,
  primary: PropTypes.bool,
  primaryAddShape: PropTypes.bool,
  secondary: PropTypes.bool,
  secondaryHotline: PropTypes.bool,
  secondaryHotlineAdd: PropTypes.bool,
  type: PropTypes.string,
};

export default Button;
