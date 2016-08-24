/*
 *
 * LeftMenu
 *
 */

import React from 'react';
import { connect } from 'react-redux';
import styles from './styles.scss';
import LeftMenuHeader from 'components/LeftMenuHeader';
import LeftMenuLinkContainer from 'components/LeftMenuLinkContainer';

export class LeftMenu extends React.Component { // eslint-disable-line react/prefer-stateless-function
  render() {
    return (
      <div className={styles.leftMenu}>
        <LeftMenuHeader></LeftMenuHeader>
        <LeftMenuLinkContainer plugins={this.props.plugins}></LeftMenuLinkContainer>
      </div>
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
