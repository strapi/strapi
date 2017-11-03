/*
 *
 * HomePage
 *
 */

import React from 'react';
import { connect } from 'react-redux';
import Helmet from 'react-helmet';
import { FormattedMessage } from 'react-intl';
import PropTypes from 'prop-types';
import { map } from 'lodash';

import Button from 'components/Button';

import Logo from 'assets/images/background_welcome_homepage.png';

import messages from './messages.json';
import styles from './styles.scss';

/* eslint-disable  jsx-a11y/anchor-has-content */
export class HomePage extends React.Component { // eslint-disable-line react/prefer-stateless-function
  render() {
    const links = ['https://stackoverflow.com/questions/tagged/strapi', 'https://github.com/strapi/strapi/issues', 'https://slack.strapi.io/'];
    return (
      <div className={styles.wrapper}>
        <Helmet
          title="Home Page"
        />
        <img src={Logo} alt="homepage_logo" />
        <h1><FormattedMessage {...messages.welcome} /></h1>
        <p><FormattedMessage id="app.components.HomePage.description.part1" /></p>
        <p><FormattedMessage id="app.components.HomePage.description.part2" /></p>
        <div className={styles.buttonContainer}>
          <Button className={styles.button} label="app.components.HomePage.button" onClick={() => this.props.history.push('/plugins/content-type-builder')} />
        </div>
        <p><FormattedMessage id="app.components.HomePage.feedback" /></p>
        <div className={styles.linkContainer}>
          {map(links, (value) => <a key={value} href={value} target="_blank" />)}
        </div>
      </div>
    );
  }
}

HomePage.propTypes = {
  history: PropTypes.object.isRequired,
};

function mapDispatchToProps(dispatch) {
  return {
    dispatch,
  };
}

export default connect(mapDispatchToProps)(HomePage);
