/**
*
* LocaleToggle
*
*/

import React from 'react';
import PropTypes from 'prop-types';

import ToggleOption from 'components/ToggleOption';

import styles from './styles.scss';

function Toggle(props) { // eslint-disable-line react/prefer-stateless-function
  let content = (<option>--</option>);

  // If we have items, render them
  if (props.values) {
    content = props.values.map((value) => (
      <ToggleOption key={value} value={value} message={props.messages[value]} />
    ));
  }

  return (
    <select onChange={props.onToggle} className={styles.toggle} defaultValue={props.value}>
      {content}
    </select>
  );
}

Toggle.propTypes = {
  messages: PropTypes.object.isRequired,
  onToggle: PropTypes.func.isRequired,
  value: PropTypes.string.isRequired,
  values: PropTypes.array.isRequired,
};

export default Toggle;
