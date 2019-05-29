/**
 *
 * EmptyContentTypeView
 *
 */

import React from 'react';
import PropTypes from 'prop-types';
import { FormattedMessage } from 'react-intl';
import { Button } from 'strapi-helper-plugin';
import Brush from '../../assets/images/paint_brush.svg';
import styles from './styles.scss';

/* istanbul ignore next */
function EmptyContentTypeView({ handleButtonClick }) {
  return (
    <div className={styles.emptyContentTypeView}>
      <img src={Brush} alt="brush" />
      <div>
        <FormattedMessage id="content-type-builder.home.emptyContentType.title">
          {title => <div className={styles.title}>{title}</div>}
        </FormattedMessage>
        <FormattedMessage id="content-type-builder.home.emptyContentType.description">
          {description => (
            <div className={styles.description}>{description}</div>
          )}
        </FormattedMessage>
        <div className={styles.buttonContainer}>
          <Button
            primaryAddShape
            label="content-type-builder.button.contentType.create"
            onClick={handleButtonClick}
          />
        </div>
      </div>
    </div>
  );
}

EmptyContentTypeView.propTypes = {
  handleButtonClick: PropTypes.func.isRequired,
};

export default EmptyContentTypeView;
