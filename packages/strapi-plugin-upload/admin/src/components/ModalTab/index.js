/**
 *
 * ModalTab
 *
 */

import React from 'react';
import PropTypes from 'prop-types';
import { FormattedMessage } from 'react-intl';
import getTrad from '../../utils/getTrad';
import Wrapper from './Wrapper';

const ModalTab = ({ isDisabled, label, to, isActive, onClick }) => {
  const handleClick = e => {
    if (isDisabled) {
      e.preventDefault();

      return;
    }

    onClick(to);
  };

  return (
    <Wrapper isActive={isActive} isDisabled={isDisabled} onClick={handleClick}>
      <FormattedMessage id={getTrad(`modal.nav.${label}`)} />
    </Wrapper>
  );
};

ModalTab.defaultProps = {
  isActive: false,
  isDisabled: false,
  onClick: () => {},
};

ModalTab.propTypes = {
  to: PropTypes.string.isRequired,
  isActive: PropTypes.bool,
  isDisabled: PropTypes.bool,
  label: PropTypes.string.isRequired,
  onClick: PropTypes.func,
};

export default ModalTab;
