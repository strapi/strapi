import React, { useState, useRef } from 'react';
import PropTypes from 'prop-types';
import { useClickAwayListener } from '@buffetjs/hooks';
import { useGlobalContext } from 'strapi-helper-plugin';
import DoubleFile from '../../icons/DoubleFile';
import File from '../../icons/File';
import Padded from '../Padded';
import Button from './Button';
import Spacer from './Spacer';
import CardControl from '../CardControl';
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
      <CardControl
        color="#6DBB1A"
        onClick={handleToggle}
        type="check"
        title={title}
        iconStyle={{ height: '1.4rem', width: '1.4rem' }}
      />
      <CustomDropdownSection isOpen={isOpen}>
        <Padded left right bottom top size="15px">
          <Button onClick={handleClick}>
            <File style={{ height: '2rem' }} />
            {formatMessage({ id: getTrad('checkControl.crop-original') })}
          </Button>
          <Spacer />
          <Button onClick={handleClickDuplicate}>
            <DoubleFile style={{ height: '1.8rem' }} />
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
