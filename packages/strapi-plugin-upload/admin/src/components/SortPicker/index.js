import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { FormattedMessage } from 'react-intl';

import getTrad from '../../utils/getTrad';

import DropdownButton from '../DropdownButton';
import DropdownSection from '../DropdownSection';
import Wrapper from './Wrapper';
import SortList from './SortList';
import SortListItem from './SortListItem';

const SortPicker = ({ onChange, value }) => {
  const [isOpen, setIsOpen] = useState(false);

  const orders = {
    created_at_asc: 'created_at:ASC',
    created_at_desc: 'created_at:DESC',
    name_asc: 'name:ASC',
    name_desc: 'name:DESC',
    updated_at_asc: 'updated_at:ASC',
    updated_at_desc: 'updated_at:DESC',
  };

  const handleChange = value => {
    onChange({ target: { value } });

    hangleToggle();
  };

  const hangleToggle = () => {
    setIsOpen(!isOpen);
  };

  return (
    <Wrapper>
      <DropdownButton onClick={hangleToggle} isActive={isOpen}>
        <FormattedMessage id={getTrad('sort.label')} />
      </DropdownButton>
      <DropdownSection isOpen={isOpen}>
        <SortList>
          {Object.keys(orders).map(order => {
            return (
              <SortListItem
                key={order}
                isActive={orders[order] === value}
                onClick={() => {
                  handleChange(orders[order]);
                }}
              >
                <FormattedMessage id={getTrad(`sort.${order}`)} />
              </SortListItem>
            );
          })}
        </SortList>
      </DropdownSection>
    </Wrapper>
  );
};

SortPicker.defaultProps = {
  onChange: () => {},
  value: null,
};

SortPicker.propTypes = {
  onChange: PropTypes.func,
  value: PropTypes.string,
};

export default SortPicker;
