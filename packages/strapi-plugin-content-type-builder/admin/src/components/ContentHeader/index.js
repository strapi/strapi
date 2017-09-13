/**
*
* ContentHeader
*
*/

import React from 'react';
import { isEmpty, map, startCase } from 'lodash';
import { FormattedMessage } from 'react-intl';
import { router } from 'app';
import Button from 'components/Button';
import styles from './styles.scss';

/* eslint-disable jsx-a11y/no-static-element-interactions */
class ContentHeader extends React.Component { // eslint-disable-line react/prefer-stateless-function
  edit = () => {
    router.push(this.props.editPath);
  }

  renderButtonContainer = () => {
    if (this.props.isLoading) {
      return (
        <div className={styles.buttonContainer}>
          <Button type="submit" lg primary loader />
        </div>
      );
    }

    return (
      <div className={styles.buttonContainer}>
        {map(this.props.buttonsContent, (button, key) => (
          <Button key={key} type={button.type} label={button.label} kind={button.kind} onClick={button.handleClick} />
        ))}
      </div>
    )
  }

  renderContentHeader = () => {
    const description = isEmpty(this.props.description) ? '' : <FormattedMessage id={this.props.description} />;
    const buttons = this.props.addButtons ? this.renderButtonContainer() : '';
    return (
      <div className={styles.contentHeader} style={this.props.styles}>
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
    const description = isEmpty(this.props.description) ? '' : <FormattedMessage id={this.props.description} />;
    const buttons = this.props.addButtons ? this.renderButtonContainer() : '';

    if (this.props.editIcon) return this.renderContentHeader();
    return (
      <div className={styles.contentHeader} style={this.props.styles}>
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
  buttonsContent: React.PropTypes.array,
  description: React.PropTypes.string,
  editIcon: React.PropTypes.bool,
  editPath: React.PropTypes.string,
  icoType: React.PropTypes.string,
  isLoading: React.PropTypes.bool,
  name: React.PropTypes.string,
  styles: React.PropTypes.object,
};

export default ContentHeader;
