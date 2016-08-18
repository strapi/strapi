/**
*
* LocaleToggle
*
*/

import React from 'react';

// import { FormattedMessage } from 'react-intl';
import styles from './styles.css';
import ToggleOption from '../ToggleOption';

function Toggle(props) {  // eslint-disable-line react/prefer-stateless-function
  let content = (<option>--</option>);

  // If we have items, render them
  if (props.values) {
    content = props.values.map((value) => (
      <ToggleOption key={value} value={value} message={props.messages[value]} />
    ));
  }

  return (
    <select onChange={props.onToggle} className={styles.toggle}>
      {content}
    </select>
  );
}

Toggle.propTypes = {
  onToggle: React.PropTypes.func,
  values: React.PropTypes.array,
  messages: React.PropTypes.object,
};

export default Toggle;
