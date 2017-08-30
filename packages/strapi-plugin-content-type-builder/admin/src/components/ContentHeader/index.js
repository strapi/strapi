/**
*
* ContentHeader
*
*/

import React from 'react';
import { isEmpty, startCase } from 'lodash';
import { FormattedMessage } from 'react-intl';
import { router } from 'app';
import Button from 'components/Button';
import styles from './styles.scss';

/* eslint-disable jsx-a11y/no-static-element-interactions */
class ContentHeader extends React.Component { // eslint-disable-line react/prefer-stateless-function
  edit = () => {
    router.push(this.props.editPath);
  }

  renderButtonContainer = () => (
    <div className={styles.buttonContainer}>
      <FormattedMessage id="form.button.cancel">
        {(message) => (
          <Button type="button" label={message} buttonSize={"buttonMd"} buttonBackground={"secondary"} onClick={this.props.handleCancel} />
        )}
      </FormattedMessage>
      <FormattedMessage id="form.button.save">
        {(message) => (
          <Button type="submit" label={message} buttonSize={"buttonLg"} buttonBackground={"primary"} onClick={this.props.handleSubmit} />
        )}
      </FormattedMessage>
    </div>
  )

  renderContentHeader = () => {
    const containerClass = this.props.noMargin ? styles.contentHeaderNoMargin : styles.contentHeader;
    const description = this.props.description || <FormattedMessage id="modelPage.contentHeader.emptyDescription.description" />;
    const buttons = this.props.addButtons ? this.renderButtonContainer() : '';
    return (
      <div className={containerClass}>
        <div>
          <div className={`${styles.title} ${styles.flex}`}>
            <span>{startCase(this.props.name)}</span>
            <i className={`fa fa-${this.props.icoType}`} onClick={this.edit} role="button" />
          </div>
          <div className={styles.subTitle}>{description}</div>
        </div>
        {buttons}
      </div>
    );
  }

  render() {
    const containerClass = this.props.noMargin ? styles.contentHeaderNoMargin : styles.contentHeader;
    const description = isEmpty(this.props.description) ? '' : <FormattedMessage id={this.props.description} />;
    const buttons = this.props.addButtons ? this.renderButtonContainer() : '';

    if (this.props.editIcon) return this.renderContentHeader();
    return (
      <div className={containerClass}>
        <div>
          <div className={styles.title}>
            <FormattedMessage id={this.props.name} />
          </div>
          <div className={styles.subTitle}>{description}</div>
        </div>
        {buttons}
      </div>
    );
  }
}

ContentHeader.propTypes = {
  addButtons: React.PropTypes.bool,
  description: React.PropTypes.string,
  editIcon: React.PropTypes.bool,
  editPath: React.PropTypes.string,
  handleCancel: React.PropTypes.func,
  handleSubmit: React.PropTypes.func,
  icoType: React.PropTypes.string,
  name: React.PropTypes.string,
  noMargin: React.PropTypes.bool,
};

export default ContentHeader;
