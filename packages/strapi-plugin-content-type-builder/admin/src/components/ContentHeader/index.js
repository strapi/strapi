import React from 'react';
import { FormattedMessage } from 'react-intl';
import styles from './styles.scss';

class ContentHeader extends React.Component { // eslint-disable-line react/prefer-stateless-function
  render() {
    const containerClass = this.props.noMargin ? styles.contentHeaderNoMargin : styles.contentHeader;
    return (
      <div className={containerClass}>
        <div className={styles.title}>
          <FormattedMessage {...{id: this.props.name }} />
        </div>
        <div className={styles.subTitle}><FormattedMessage {...{id: this.props.description}} /></div>
      </div>
    );
  }
}

ContentHeader.propTypes = {
  description: React.PropTypes.string,
  name: React.PropTypes.string,
  noMargin: React.PropTypes.bool,
};

export default ContentHeader;
