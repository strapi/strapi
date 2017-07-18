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
        <div>
          <FormattedMessage {...{id: this.props.content.name}} />
        </div>
        <FormattedMessage {...{id: this.props.content.description}} />
      </div>
    );
  }
}

ContentHeader.propTypes = {
  content: React.PropTypes.object,
};

export default ContentHeader;
