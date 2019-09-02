/**
*
* EmptyAttributesBlock
*
*/

import React from 'react';
import PropTypes from 'prop-types';
import { FormattedMessage } from 'react-intl';
import Button from '../Button';
import styles from './styles.scss';

function EmptyAttributesBlock({ description, label, onClick, title, id }) {
  return (
    <div className={styles.emptyAttributesBlock}>
      <div>
        <FormattedMessage id={title}>
          {(msg) => <div className={styles.title}>{msg}</div>}
        </FormattedMessage>
        <FormattedMessage id={description}>
          {(msg) => <div className={styles.description}>{msg}</div>}
        </FormattedMessage>
        <div className={styles.buttonContainer}>
          <Button
            onClick={onClick}
            primaryAddShape
            label={label}
            id={id}
          />
        </div>
      </div>
    </div>
  );
}

EmptyAttributesBlock.defaultProps = {
  description: 'app.utils.defaultMessage',
  id: '',
  label: 'app.utils.defaultMessage',
  onClick: () => {},
  title: 'app.components.EmptyAttributes.title',
};

EmptyAttributesBlock.propTypes = {
  description: PropTypes.string,
  id: PropTypes.string,
  label: PropTypes.string,
  onClick: PropTypes.func,
  title: PropTypes.string,
};

export default EmptyAttributesBlock;
