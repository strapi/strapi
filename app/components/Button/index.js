/**
 *
 * Button.react.js
 *
 * A common button, if you pass it a prop "route" it'll render a link to a react-router route
 * otherwise it'll render a link with an onclick
 */

import React, { PropTypes, Children } from 'react';

import styles from './styles.css';

function Button(props) {
  const className = props.className ? props.className : styles.button;

  // Render an anchor tag
  let button = (
    <a className={className} href={props.href} onClick={props.onClick}>
      {Children.toArray(props.children)}
    </a>
  );

  // If the Button has a handleRoute prop, we want to render a button
  if (props.handleRoute) {
    button = (
      <button className={className} onClick={props.handleRoute}>
        {Children.toArray(props.children)}
      </button>
    );
  }

  return (
    <div className={styles.buttonWrapper}>
      {button}
    </div>
  );
}

Button.propTypes = {
  className: PropTypes.string,
  handleRoute: PropTypes.func,
  href: PropTypes.string,
  onClick: PropTypes.func,
  children: PropTypes.node.isRequired,
};

export default Button;
