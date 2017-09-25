/**
*
* ContentHeader
*
*/

import React from 'react';
import PropTypes from 'prop-types';
import { FormattedMessage } from 'react-intl';
import styles from './styles.scss';

class ContentHeader extends React.Component { // eslint-disable-line react/prefer-stateless-function
  render() {
    return (
      <div className={styles.contentHeader}>
        <div className={styles.title}>
          <FormattedMessage id={`settings-manager.${this.props.name }`} />
        </div>
        <div className={styles.subTitle}><FormattedMessage id={`settings-manager.${this.props.description}`} /></div>
      </div>
    );
  }
}

ContentHeader.propTypes = {
  description: PropTypes.string.isRequired,
  name: PropTypes.string.isRequired,
};

export default ContentHeader;
