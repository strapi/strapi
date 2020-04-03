import React, { useState, useRef } from 'react';
import PropTypes from 'prop-types';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useClickAwayListener } from '@buffetjs/hooks';
import { useGlobalContext } from 'strapi-helper-plugin';
import DoubleFile from '../../icons/DoubleFile';
import File from '../../icons/File';
import Padded from '../Padded';
import Button from './Button';
import Spacer from './Spacer';
import StyledCardControl from './StyledCardControl';
import CustomDropdownSection from './CustomDropdownSection';
import { getTrad } from '../../utils';

const CheckControl = ({ title, onSubmitEdit }) => {
  const [isOpen, setIsOpen] = useState(false);
  const { formatMessage } = useGlobalContext();
  const dropdownRef = useRef();

  useClickAwayListener(dropdownRef, () => setIsOpen(false));

  const handleClick = e => {
    e.persist();
    setIsOpen(false);
    onSubmitEdit(e);
  };

  const handleClickDuplicate = e => {
    e.persist();
    setIsOpen(false);
    onSubmitEdit(e, true);
  };

  const handleToggle = () => {
    setIsOpen(v => !v);
  };

  return (
    <div ref={dropdownRef}>
      <StyledCardControl
        title={formatMessage({ id: getTrad(`control-card.${title}`) })}
        color="#ffffff"
        onClick={handleToggle}
      >
        <FontAwesomeIcon icon="check" />
      </StyledCardControl>
      <CustomDropdownSection isOpen={isOpen}>
        <Padded left right bottom top size="15px">
          <Button onClick={handleClick}>
            <File />
            {formatMessage({ id: getTrad('checkControl.crop-original') })}
          </Button>
          <Spacer />
          <Button onClick={handleClickDuplicate}>
            <DoubleFile />
            {formatMessage({ id: getTrad('checkControl.crop-duplicate') })}
          </Button>
        </Padded>
      </CustomDropdownSection>
    </div>
  );
};

CheckControl.defaultProps = {
  onSubmitEdit: () => {},
  title: null,
};

CheckControl.propTypes = {
  onSubmitEdit: PropTypes.func,
  title: PropTypes.string,
};

export default CheckControl;
