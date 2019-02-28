/**
*
* ContentHeader
*
*/

import React from 'react';
import PropTypes from 'prop-types';
import { isEmpty, map, startCase } from 'lodash';
import { FormattedMessage } from 'react-intl';
import { router } from 'app';

import Button from 'components/Button';
import styles from './styles.scss';

/* eslint-disable jsx-a11y/no-static-element-interactions */
/* eslint-disable jsx-a11y/click-events-have-key-events */
class ContentHeader extends React.Component { // eslint-disable-line react/prefer-stateless-function
  handleEdit = () => {
    // Send event.
    this.context.emitEvent('willEditNameOfContentType');
    // Open modal.
    router.push(this.props.editPath);
  }

  renderButtonContainer = () => {
    if (this.props.isLoading) {
      return (
        <div className={styles.buttonContainer}>
          <Button type="submit" primary loader />
        </div>
      );
    }

    return (
      <div className={styles.buttonContainer}>
        {map(this.props.buttonsContent, (button, key) => (
          <Button key={key} type={button.type} label={button.label} kind={button.kind} id={button.id} onClick={button.handleClick} />
        ))}
      </div>
    );
  }

  renderContentHeader = () => {
    const description = isEmpty(this.props.description) ? '' : <FormattedMessage id={this.props.description} defaultMessage='{description}' values={{ description: this.props.description}} />;
    const buttons = this.props.addButtons ? this.renderButtonContainer() : '';
    
    return (
      <div className={styles.contentHeader} style={this.props.styles}>
        <div>
          <div className={`${styles.title} ${styles.flex}`}>
            <span>{startCase(this.props.name)}</span>
            <i className={`fa fa-${this.props.icoType}`} id="editCTName" onClick={this.handleEdit} role="button" />
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

ContentHeader.contextTypes = {
  emitEvent: PropTypes.func,
}; 

ContentHeader.propTypes = {
  addButtons: PropTypes.bool,
  buttonsContent: PropTypes.array,
  description: PropTypes.string,
  editIcon: PropTypes.bool,
  editPath: PropTypes.string,
  icoType: PropTypes.string,
  isLoading: PropTypes.bool,
  name: PropTypes.string,
  styles: PropTypes.object,
};

ContentHeader.defaultProps = {
  addButtons: false,
  buttonsContent: [],
  description: '',
  editIcon: false,
  editPath: '',
  icoType: 'pencil',
  isLoading: false,
  name: '',
  styles: {},
};

export default ContentHeader;
