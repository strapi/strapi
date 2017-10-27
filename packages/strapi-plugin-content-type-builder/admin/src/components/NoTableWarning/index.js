/*
*
* NoTableWarning
*
*/

import React from 'react';
import { FormattedMessage } from 'react-intl';
import PropTypes from 'prop-types';

import WarningLogo from 'assets/icons/icon_warning.svg';
import styles from './styles.scss';

function NoTableWarning({ modelName }) {
  return (
    <div className={styles.noTableWarning}>
      <div className={styles.contentContainer}>
        <img src={WarningLogo} alt="warning_logo" />
        <FormattedMessage id="content-type-builder.noTableWarning.description" values={{ modelName }} />
      </div>
      <div className={styles.buttonContainer}>
        <a href="https://strapi.io/documentation/guides/models.html#bookshelf" target="_blank">
          <button>
            <FormattedMessage id="content-type-builder.noTableWarning.infos" />
          </button>
        </a>
      </div>
    </div>
  );
}

NoTableWarning.propTypes = {
  modelName: PropTypes.string,
};

NoTableWarning.defaultProps = {
  modelName: '',
};

export default NoTableWarning;
