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
import Button from 'components/Button';
import Sub from 'components/Sub/Loadable';

import WelcomeContent from './WelcomeContent';
import CreateContent from './CreateContent';

import styles from './styles.scss';

const FIRST_BLOCK = [
  {
    title: {
      id: 'app.components.HomePage.welcome',
    },
    content: () => <WelcomeContent />,
  },
  {
    title: {
      id: 'app.components.HomePage.create',
    },
    content: () => <CreateContent />,
  },
];

export class HomePage extends React.Component { // eslint-disable-line react/prefer-stateless-function
  render() {
    return (
      <div className={cn('container-fluid', styles.containerFluid)}>
        <Helmet title="Home Page" />
        <div className="row">
          <div className="col-md-9 col-lg-9">
            <Block>
              {FIRST_BLOCK.map((value, key) => <Sub key={key} {...value} underline={key === 0} />)}
              <Button className={styles.homePageTutorialButton} primary>START THE QUICK TUTORIAL</Button>
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
