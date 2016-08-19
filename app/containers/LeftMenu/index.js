/*
 *
 * LeftMenu
 *
 */

import React from 'react';
import { connect } from 'react-redux';
import styles from './styles.css';

export class LeftMenu extends React.Component { // eslint-disable-line react/prefer-stateless-function
  render() {
    const links = this.props.plugins.map(plugin => <li>{plugin.name}</li>);

    return (
      <div>
        <p>Links</p>
        <ul className={styles.leftMenu}>
          {links}
        </ul>
      </div>

    );
  }
}

LeftMenu.propTypes = {
  plugins: React.PropTypes.object,
};

function mapDispatchToProps(dispatch) {
  return {
    dispatch,
  };
}

export default connect(mapDispatchToProps)(LeftMenu);
