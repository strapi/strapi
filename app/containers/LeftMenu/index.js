/*
 *
 * LeftMenu
 *
 */

import React from 'react';
import { connect } from 'react-redux';
import styles from './styles.css';
import { Link } from 'react-router';
import classNames from 'classnames';

export class LeftMenu extends React.Component { // eslint-disable-line react/prefer-stateless-function
  render() {
    const links = this.props.plugins.map(plugin => {
      const className = classNames({
        active: this.props.params && this.props.params.plugin && this.props.params.plugin === plugin.id,
      });
      return <li className={className}><Link to={`/plugins/${plugin.id}`}>{plugin.name}</Link></li>;
    });

    return (
      <ul className={styles.leftMenu}>
        {links}
      </ul>
    );
  }
}

LeftMenu.propTypes = {
  plugins: React.PropTypes.object,
  params: React.PropTypes.object,
};

function mapDispatchToProps(dispatch) {
  return {
    dispatch,
  };
}

export default connect(mapDispatchToProps)(LeftMenu);
