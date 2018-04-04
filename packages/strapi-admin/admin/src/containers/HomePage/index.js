/*
 *
 * HomePage
 *
 */

import React from 'react';
import { connect } from 'react-redux';
import Helmet from 'react-helmet';
import { FormattedMessage } from 'react-intl';
// import PropTypes from 'prop-types';
import cn from 'classnames';

import Block from 'components/HomePageBlock/Loadable';
import Button from 'components/Button';
import Sub from 'components/Sub/Loadable';

import BlockLink from './BlockLink';
import CreateContent from './CreateContent';
import WelcomeContent from './WelcomeContent';

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

const FIRST_BLOCK_LINKS = [
  {
    link: 'https://strapi.io/documentation/',
    content: {
      id: 'app.components.BlockLink.documentation.content',
    },
    isDocumentation: true,
    title: {
      id: 'app.components.BlockLink.documentation',
    },
  },
  {
    link: 'https://github.com/strapi/strapi-examples',
    content: {
      id: 'app.components.BlockLink.code.content',
    },
    isDocumentation: false,
    title: {
      id: 'app.components.BlockLink.code',
    },
  },
];

export class HomePage extends React.Component {
  // eslint-disable-line react/prefer-stateless-function
  render() {
    return (
      <div className={cn('container-fluid', styles.containerFluid)}>
        <Helmet title="Home Page" />
        <div className="row">
          <div className="col-md-8 col-lg-8">
            <Block>
              {FIRST_BLOCK.map((value, key) => <Sub key={key} {...value} underline={key === 0} />)}
              <a href="https://strapi.io/getting-started" target="_blank">
                <Button className={styles.homePageTutorialButton} primary>
                  <FormattedMessage id="app.components.HomePage.button.quickStart" />
                </Button>
              </a>
              <div className={styles.homePageLinkWrapper}>
                {FIRST_BLOCK_LINKS.map((value, key) => <BlockLink {...value} key={key} />)}
              </div>
            </Block>
          </div>
          <div className="col-lg-4 col-md-4">
            <Block className={styles.blockShirt}>
              <div>
                <FormattedMessage id="app.components.HomePage.support" />
                <FormattedMessage id="app.components.HomePage.support.content">
                  {message => <p>{message}</p>}
                </FormattedMessage>
                <FormattedMessage id="app.components.HomePage.support.link">
                  {message => (
                    <a href="https://strapi.io/shop" target="_blank">
                      {message}
                    </a>
                  )}
                </FormattedMessage>
              </div>
            </Block>
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
