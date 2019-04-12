/**
*
* EmptyContentTypeView
*
*/

import React from 'react';
import PropTypes from 'prop-types';
import { FormattedMessage } from 'react-intl';
import Button from 'components/Button';
import Brush from '../../assets/images/paint_brush.svg';
import styles from './styles.scss';

/* istanbul ignore next */
class EmptyContentTypeView extends React.Component { // eslint-disable-line react/prefer-stateless-function
  render() {
    return (
      <div className={styles.emptyContentTypeView}>
        <img src={Brush} alt="brush" />
        <div>
          <FormattedMessage id="content-type-builder.home.emptyContentType.title">
            {(title) => <div className={styles.title}>{title}</div>}
          </FormattedMessage>
          <FormattedMessage id="content-type-builder.home.emptyContentType.description">
            {(description) => <div className={styles.description}>{description}</div>}
          </FormattedMessage>
          <div className={styles.buttonContainer}>
            <Button
              primaryAddShape
              label="content-type-builder.button.contentType.create"
              onClick={this.props.handleButtonClick}
            />
          </div>
        </div>

      </div>
    );
  }
}

EmptyContentTypeView.propTypes = {
  handleButtonClick: PropTypes.func.isRequired,
};

export default EmptyContentTypeView;
