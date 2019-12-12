import React, { memo, useState } from 'react';
import { FormattedMessage } from 'react-intl';
import PropTypes from 'prop-types';
import { Plus } from '@buffetjs/icons';
import {
  ButtonDropdown,
  DropdownToggle,
  DropdownMenu,
  DropdownItem,
} from 'reactstrap';
import getTrad from '../../utils/getTrad';
import { Wrapper } from './components';

function Add({ data, isRelation, onClick, pStyle, style }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Wrapper isOpen={isOpen} notAllowed={data.length === 0} style={style}>
      <ButtonDropdown
        isOpen={isOpen}
        toggle={() => {
          if (data.length > 0) {
            setIsOpen(prevState => !prevState);
          }
        }}
      >
        <DropdownToggle>
          <FormattedMessage
            id={getTrad(
              `containers.SettingPage.${
                isRelation ? 'add.relational-field' : 'add.field'
              }`
            )}
          >
            {msg => (
              <p style={pStyle}>
                <Plus fill="#007eff" height="11px" width="11px" />
                {msg}
              </p>
            )}
          </FormattedMessage>
        </DropdownToggle>
        <DropdownMenu>
          {data.map(item => (
            <DropdownItem
              key={item}
              onClick={() => {
                onClick(item);
              }}
            >
              {item}
            </DropdownItem>
          ))}
        </DropdownMenu>
      </ButtonDropdown>
    </Wrapper>
  );
}

Add.defaultProps = {
  data: [],
  isRelation: false,
  onClick: () => {},
  pStyle: {},
  style: {},
};

Add.propTypes = {
  data: PropTypes.array,
  isRelation: PropTypes.bool,
  onClick: PropTypes.func,
  pStyle: PropTypes.object,
  style: PropTypes.object,
};

export default memo(Add);
