/*
 *
 * HomePage
 *
 */

import React from 'react';
import { connect } from 'react-redux';
import Helmet from 'react-helmet';
// import { FormattedMessage } from 'react-intl';
// import PropTypes from 'prop-types';
import cn from 'classnames';

import Block from 'components/HomePageBlock/Loadable';

import styles from './styles.scss';

export class HomePage extends React.Component { // eslint-disable-line react/prefer-stateless-function
  render() {
    return (
      <div className={cn('container-fluid', styles.containerFluid)}>
        <Helmet title="Home Page" />
        <div className="row">
          <div className="col-md-9 col-lg-9">
            <Block>
              toto
            </Block>
          </div>
          <div className="col-lg-3 col-md-3">
            <Block>tata</Block>
          </div>
        </div>
      </div>
    );
  }
}

HomePage.propTypes = {
  // history: PropTypes.object.isRequired,
};

function mapDispatchToProps(dispatch) {
  return {
    dispatch,
  };
}

export default connect(mapDispatchToProps)(HomePage);
