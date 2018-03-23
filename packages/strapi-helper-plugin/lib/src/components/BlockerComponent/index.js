/**
*
* BlockerComponent
*
*/

import React from 'react';
import { FormattedMessage } from 'react-intl';
import cn from 'classnames';
import PropTypes from 'prop-types';

import styles from './styles.scss';

/* eslint-disable react/require-default-props */
function BlockerComponent({ blockerComponentTitle, blockerComponentDescription, blockerComponentIcon, blockerComponentContent = '' }) {
  let content;

  switch (blockerComponentContent) {
    case 'renderIde':
      content = renderIde();
      break;
    case 'renderButton':
      content = renderButton();
      break;
    default:
      content = '';
  }

  return (
    <div className={styles.blockerComponent}>
      <div className={styles.header}>
        <div className={styles.icoContainer}>
          <i className={cn('fa', blockerComponentIcon)} />
        </div>
        <div>
          <h4>
            <FormattedMessage id={blockerComponentTitle} />
          </h4>
          <p>
            <FormattedMessage id={blockerComponentDescription} />
          </p>
          {content}
        </div>
      </div>
    </div>
  );
}

const renderIde = () => (
  <div className={styles.ide}>
    <p>./config/environments/development/server.json</p>
    <div>
      <pre style={{ whiteSpace: 'pre-wrap'}}>
        <code>
          &#123;
          <br />
          &nbsp;"host": "localhost",
          <br />
          &nbsp;"port": 1337,
          <br />
          <span style={{ color: '#006EE7'}}>
            &nbsp;"autoReload": true,
          </span>
          <br />
          &nbsp;"proxi": &#123;
          <br />
          &nbsp;&nbsp;"enabled": true
          <br />
          &nbsp;&#125;,
          <br />
          &nbsp;"cron": &#123;
          <br />
          &nbsp;&nbsp;"enabled": false
          <br />
          &nbsp;&#125;
          <br />
          &#125;
        </code>
      </pre>
    </div>
  </div>
);

const renderButton = () => (
  <div className={styles.buttonContainer}>
    <a className={cn(styles.primary, 'btn')} href="http://strapi.io" target="_blank">Read the documentation</a>
  </div>
);

BlockerComponent.propTypes = {
  blockerComponentContent: PropTypes.string.isRequired,
  blockerComponentDescription: PropTypes.string.isRequired,
  blockerComponentIcon: PropTypes.string.isRequired,
  blockerComponentTitle: PropTypes.string.isRequired,
};

export default BlockerComponent;
