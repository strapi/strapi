/*
 *
 * LeftMenu
 *
 */

import React from 'react';
import { connect } from 'react-redux';
import LeftMenuHeader from 'components/LeftMenuHeader';
import LeftMenuLinkContainer from 'components/LeftMenuLinkContainer';
import LeftMenuFooter from 'components/LeftMenuFooter';
import styles from './styles.scss';

export class LeftMenu extends React.Component { // eslint-disable-line react/prefer-stateless-function
  render() {
    return (
      <div className={styles.leftMenu}>
        <LeftMenuHeader></LeftMenuHeader>
        <LeftMenuLinkContainer {...this.props}></LeftMenuLinkContainer>
        <LeftMenuFooter plugins={this.props.plugins}></LeftMenuFooter>
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
