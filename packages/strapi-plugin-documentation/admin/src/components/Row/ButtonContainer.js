import React from 'react';
import PropTypes from 'prop-types';
import { FormattedMessage } from 'react-intl';
import cn from 'classnames';

import Button from 'components/Button';
import openWithNewTab from '../../utils/openWithNewTab';
import styles from './styles.scss';

const ButtonContainer = ({ currentDocVersion, isHeader, onClick, onClickDelete, version }) => {
  if (isHeader) {
    return <div />;
  }
  const classname = version === currentDocVersion ? styles.marged : styles.buttonTrash;

  return (
    <div>
      <Button className={cn(styles.rowButton, styles.buttonOutline)} onClick={() => openWithNewTab(`/documentation/v${version}`)}>
        <FormattedMessage id="documentation.components.Row.open" />
      </Button>
      <Button className={cn(styles.rowButton, styles.buttonRegenerate)} onClick={() => onClick(version)}>
        <FormattedMessage id="documentation.components.Row.regenerate" />
      </Button>
      <Button className={cn(styles.rowButton, classname)} onClick={() => onClickDelete(version)} />
    </div>
  );
};


ButtonContainer.defaultProps = {
  currentDocVersion: '1.0.0',
  isHeader: false,
  onClick: () => {},
  onClickDelete: () => {},
  version: '',
};

ButtonContainer.propTypes = {
  currentDocVersion: PropTypes.string,
  isHeader: PropTypes.bool,
  onClick: PropTypes.func,
  onClickDelete: PropTypes.func,
  version: PropTypes.string,
};

export default ButtonContainer;
