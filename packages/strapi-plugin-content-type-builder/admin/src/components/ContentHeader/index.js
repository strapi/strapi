/**
*
* ContentHeader
*
*/

import React from 'react';
import { isEmpty, startCase } from 'lodash';
import { FormattedMessage } from 'react-intl';
import { router } from 'app';
import styles from './styles.scss';

/* eslint-disable jsx-a11y/no-static-element-interactions */
class ContentHeader extends React.Component { // eslint-disable-line react/prefer-stateless-function
  edit = () => {
    router.push(this.props.editPath);
  }

  renderContentHeader = () => {
    const containerClass = this.props.noMargin ? styles.contentHeaderNoMargin : styles.contentHeader;
    const editIcon = this.props.editIcon ?
      <i className="fa fa-pencil" onClick={this.edit} role="button" />
       : '';

    const description = this.props.description || <FormattedMessage id={'modelPage.contentHeader.emptyDescription.description'} />
    return (
      <div className={containerClass}>
        <div className={`${styles.title} ${styles.flex}`}>
          <span>{startCase(this.props.name)}</span>
          {editIcon}
        </div>
        <div className={styles.subTitle}>{description}</div>
      </div>
    );
  }

  render() {
    const containerClass = this.props.noMargin ? styles.contentHeaderNoMargin : styles.contentHeader;
    const description = isEmpty(this.props.description) ? '' : <FormattedMessage {...{id: this.props.description}} />;

    if (this.props.noI18n) return this.renderContentHeader();
    return (
      <div className={containerClass}>
        <div className={styles.title}>
          <FormattedMessage {...{id: this.props.name }} />
        </div>
        <div className={styles.subTitle}>{description}</div>
      </div>
    );
  }
}

ContentHeader.propTypes = {
  description: React.PropTypes.string,
  editIcon: React.PropTypes.bool,
  editPath: React.PropTypes.string,
  name: React.PropTypes.string,
  noI18n: React.PropTypes.bool,
  noMargin: React.PropTypes.bool,
};

export default ContentHeader;
