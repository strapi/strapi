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
import { isEmpty } from 'lodash';
import cn from 'classnames';

import Block from 'components/HomePageBlock/Loadable';
import Button from 'components/Button';
import Sub from 'components/Sub/Loadable';
import Input from 'components/InputText';

import validateInput from 'utils/inputsValidations';

import BlockLink from './BlockLink';
import CommunityContent from './CommunityContent';
import CreateContent from './CreateContent';
import SocialLink from './SocialLink';
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

const SECOND_BLOCK = {
  title: {
    id: 'app.components.HomePage.community',
  },
  content: () => <CommunityContent />,
};

const SOCIAL_LINKS = [
  {
    name: 'Github',
    link: 'https://github.com/strapi/strapi/',
  },
  {
    name: 'Slack',
    link: 'https://slack.strapi.io/',
  },
  {
    name: 'Medium',
    link: 'https://medium.com/@strapi',
  },
  {
    name: 'Twitter',
    link: 'https://twitter.com/strapijs',
  },
  {
    name: 'Reddit',
    link: 'https://www.reddit.com/r/node/search?q=strapi',
  },
  {
    name: 'Stack Overflow',
    link: 'https://stackoverflow.com/questions/tagged/strapi',
  },
];

export class HomePage extends React.Component {
  // eslint-disable-line react/prefer-stateless-function
  state = { value: '', errors: [] };

  handleChange = ({ target }) => this.setState({ value: target.value });

  handleSubmit = e => {
    e.preventDefault();
    const errors = validateInput(this.state.value, { required: true }, 'email');
    this.setState({ errors });
  };

  render() {
    return (
      <div className={cn('container-fluid', styles.containerFluid)}>
        <Helmet title="Home Page" />
        <div className="row">
          <div className="col-md-8 col-lg-8">
            <Block>
              {FIRST_BLOCK.map((value, key) => (
                <Sub key={key} {...value} underline={key === 0} bordered={key === 0} />
              ))}
              <a href="https://strapi.io/getting-started" target="_blank">
                <Button className={styles.homePageTutorialButton} primary>
                  <FormattedMessage id="app.components.HomePage.button.quickStart" />
                </Button>
              </a>
              <div className={styles.homePageFlex}>
                {FIRST_BLOCK_LINKS.map((value, key) => <BlockLink {...value} key={key} />)}
              </div>
            </Block>
            <Block>
              <Sub {...SECOND_BLOCK} />
              <div className={styles.homePageFlex}>
                <div className="row" style={{ width: '100%', marginRight: '0' }}>
                  {SOCIAL_LINKS.map((value, key) => <SocialLink key={key} {...value} />)}
                </div>
                <div className={styles.newsLetterWrapper}>
                  <div>
                    <FormattedMessage id="app.components.HomePage.newsLetter" />
                  </div>
                  <form onSubmit={this.handleSubmit}>
                    <div className={cn(styles.homePageForm, 'row')}>
                      <div className="col-md-6">
                        <Input
                          value={this.state.value}
                          onChange={this.handleChange}
                          name=""
                          placeholder="johndoe@gmail.com"
                          error={!isEmpty(this.state.errors)}
                        />
                      </div>
                      <div className="col-md-6">
                        <FormattedMessage id="app.components.HomePage.cta">
                          {message => <button type="submit">{message}</button>}
                        </FormattedMessage>
                      </div>
                    </div>
                  </form>
                </div>
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
