/**
*
* EmptyAttributesView
*
*/

import React from 'react';
import PropTypes from 'prop-types';
import { FormattedMessage } from 'react-intl';
import Button from 'components/Button';
import styles from './styles.scss';

class EmptyAttributesView extends React.Component { // eslint-disable-line react/prefer-stateless-function
  render() {
    return (
      <div className={styles.emptyAttributesView}>
        <div>
          <FormattedMessage id="content-type-builder.home.emptyAttributes.title">
            {(title) => <div className={styles.title}>{title}</div>}
          </FormattedMessage>
          <FormattedMessage id="content-type-builder.home.emptyAttributes.description">
            {(description) => <div className={styles.description}>{description}</div>}
          </FormattedMessage>
          <div className={styles.buttonContainer}>
            <Button
              onClick={this.props.onClickAddAttribute}
              primaryAddShape
              label={'content-type-builder.button.attributes.add'}
            />
          </div>
        </div>
      </div>
    );
  }
}

EmptyAttributesView.propTypes = {
  onClickAddAttribute: PropTypes.func.isRequired,
};

export default EmptyAttributesView;
