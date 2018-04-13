/*
 *
 * LeftMenu
 *
 */

import React from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';

import LeftMenuHeader from 'components/LeftMenuHeader';
import LeftMenuLinkContainer from 'components/LeftMenuLinkContainer';
import LeftMenuFooter from 'components/LeftMenuFooter';

import styles from './styles.scss';

export class LeftMenu extends React.Component { // eslint-disable-line react/prefer-stateless-function
  render() {
    return (
      <div className={styles.leftMenu}>
        <LeftMenuHeader />
        <LeftMenuLinkContainer {...this.props} />
        <LeftMenuFooter plugins={this.props.plugins} version={this.props.version} />
      </div>
    );
  }
}

LeftMenu.defaultProps = {
  version: '3',
};

LeftMenu.propTypes = {
  plugins: PropTypes.object.isRequired,
  version: PropTypes.string,
};

function mapDispatchToProps(dispatch) {
  return {
    dispatch,
  };
}

export default connect(mapDispatchToProps)(LeftMenu);
