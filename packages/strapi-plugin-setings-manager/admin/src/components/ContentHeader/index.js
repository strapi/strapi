/**
*
* ContentHeader
*
*/

import React from 'react';
import { FormattedMessage } from 'react-intl';
import styles from './styles.scss';

class ContentHeader extends React.Component { // eslint-disable-line react/prefer-stateless-function
  render() {
    return (
      <div className={styles.contentHeader}>
        <div className={styles.title}>
          <FormattedMessage {...{id: this.props.name }} />
        </div>
        <span><FormattedMessage {...{id: this.props.description}} /></span>
      </div>
    );
  }
}

ContentHeader.propTypes = {
  description: React.PropTypes.string,
  name: React.PropTypes.string,
};

export default ContentHeader;
