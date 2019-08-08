/**
 *
 * EmptyContentTypeView
 *
 */

import React, { memo } from 'react';
import PropTypes from 'prop-types';
import { FormattedMessage } from 'react-intl';
import { Button } from 'strapi-helper-plugin';
import Brush from '../../assets/images/paint_brush.svg';
import pluginId from '../../pluginId';
import styles from './styles.scss';

/* istanbul ignore next */
function EmptyContentTypeView({ handleButtonClick, type }) {
  return (
    <div className={styles.emptyContentTypeView}>
      <img src={Brush} alt="brush" />
      <div>
        <FormattedMessage id={`${pluginId}.home.empty.${type}.title`}>
          {title => <div className={styles.title}>{title}</div>}
        </FormattedMessage>
        <FormattedMessage id={`${pluginId}.home.empty.${type}.description`}>
          {description => (
            <div className={styles.description}>{description}</div>
          )}
        </FormattedMessage>
        <div className={styles.buttonContainer}>
          <Button
            primaryAddShape
            label={`${pluginId}.button.${type}.create`}
            onClick={handleButtonClick}
          />
        </div>
      </div>
    </div>
  );
}

EmptyContentTypeView.defaultProps = {
  type: 'models',
};

EmptyContentTypeView.propTypes = {
  handleButtonClick: PropTypes.func.isRequired,
  type: PropTypes.string,
};

export default memo(EmptyContentTypeView);
export { EmptyContentTypeView };
