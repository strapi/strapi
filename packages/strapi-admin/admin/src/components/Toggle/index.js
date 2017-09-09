/**
*
* LocaleToggle
*
*/

import React from 'react';

import ToggleOption from 'components/ToggleOption';

import styles from './styles.scss';

function Toggle(props) { // eslint-disable-line react/prefer-stateless-function
  let content = (<option>--</option>);

  // If we have items, render them
  if (props.values) {
    content = props.values.map((value) => (
      <ToggleOption key={value} value={value} message={props.messages[value]} selected={value === props.value} />
    ));
  }

  return (
    <select onChange={props.onToggle} className={styles.toggle}>
      {content}
    </select>
  );
}

Toggle.propTypes = {
  messages: React.PropTypes.object.isRequired,
  onToggle: React.PropTypes.func.isRequired,
  value: React.PropTypes.string.isRequired,
  values: React.PropTypes.array.isRequired,
};

export default Toggle;
