/*
 * HomePage
 *
 * This is the first thing users see of our App, at the '/' route
 *
 * NOTE: while this component should technically be a stateless functional
 * component (SFC), hot reloading does not currently support SFCs. If hot
 * reloading is not a neccessity for you then you can refactor it and remove
 * the linting exception.
 */

import React from 'react';
import { connect } from 'react-redux';
import { createSelector } from 'reselect';
import { selectPlugins } from 'containers/App/selectors';
import LeftMenu from 'containers/LeftMenu';
import Header from 'components/Header/index';
import Content from 'containers/Content';
import styles from './syles.scss';

export class HomePage extends React.Component { // eslint-disable-line react/prefer-stateless-function

  render() {
    return (
      <div className={styles.homePage}>
        <LeftMenu {...this.props}></LeftMenu>
        <div className={styles.homePageRightWrapper}>
          <Header></Header>
          <Content {...this.props}></Content>
        </div>
      </div>
    );
  }
}

HomePage.propTypes = {
  plugins: React.PropTypes.object,
  onRegisterPluginClicked: React.PropTypes.func,
};

const mapStateToProps = createSelector(
  selectPlugins(),
  (plugins) => ({ plugins })
);

function mapDispatchToProps(dispatch) {
  return {
    dispatch,
  };
}

export default connect(mapStateToProps, mapDispatchToProps)(HomePage);
