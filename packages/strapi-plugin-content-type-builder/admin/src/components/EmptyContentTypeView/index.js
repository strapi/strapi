/**
*
* EmptyContentTypeView
*
*/

import React from 'react';
import { FormattedMessage } from 'react-intl';
import Button from 'components/Button';
import styles from './styles.scss';

class EmptyContentTypeView extends React.Component { // eslint-disable-line react/prefer-stateless-function
  render() {
    return (
      <div className={styles.emptyContentTypeView}>
        <div>
          <FormattedMessage {...{id: 'home.emptyContentType.title'}}>
            {(title) => <div className={styles.title}>{title}</div>}
          </FormattedMessage>
          <FormattedMessage {...{id: 'home.emptyContentType.description'}}>
            {(description) => <div className={styles.description}>{description}</div>}
          </FormattedMessage>
          <div className={styles.buttonContainer}>
            <Button
              onClick={this.props.handleClick}
              buttonBackground={'primary'}
              label={'button.contentType.create'}
              addShape
              handlei18n
            />
          </div>
        </div>
      </div>
    );
  }
}

EmptyContentTypeView.propTypes = {
  handleClick: React.PropTypes.func,
};

export default EmptyContentTypeView;
