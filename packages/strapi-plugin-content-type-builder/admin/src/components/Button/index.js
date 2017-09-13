/**
*
* Button
*
*/

import React from 'react';
import { isEmpty } from 'lodash';
import { FormattedMessage } from 'react-intl';
import cn from 'classnames';

import styles from './styles.scss';

function Button(props) {
  if (props.loader) {
    return (
      <button
        type="button"
        className={cn(
          styles.loader,
          props.primary && styles.primary,
          props.secondary && styles.secondary,
          props.secondaryHotline && styles.secondaryHotline,
          props.primaryAddShape && styles.primaryAddShape,
          props.kind && styles[props.kind],
          props.className,

        )}
        disabled
        {...props}
      >
        <div className={styles.saving}>
          <span>.</span><span>.</span><span>.</span>
        </div>
      </button>
    );
  }

  const label = !isEmpty(props.label) && !props.children ? <FormattedMessage id={props.label} /> : props.children;
  return (
    <button
      className={cn(
        styles.button,
        props.primary && styles.primary,
        props.secondary && styles.secondary,
        props.secondaryHotline && styles.secondaryHotline,
        props.secondaryHotlineAdd && styles.secondaryHotlineAdd,
        props.primaryAddShape && styles.primaryAddShape,
        props.kind && styles[props.kind],
        props.className,
      )}
      type={props.type || 'button'}
      {...props}
    >
      {label}
    </button>
  );
}

Button.propTypes = {
  children: React.PropTypes.node,
  className: React.PropTypes.any,
  kind: React.PropTypes.bool,
  label: React.PropTypes.string,
  loader: React.PropTypes.bool,
  primary: React.PropTypes.bool,
  primaryAddShape: React.PropTypes.bool,
  secondary: React.PropTypes.bool,
  secondaryHotline: React.PropTypes.bool,
  secondaryHotlineAdd: React.PropTypes.bool,
  type: React.PropTypes.string,
};

export default Button;
