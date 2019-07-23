import React, { memo, useState } from 'react';
import { FormattedMessage } from 'react-intl';
import PropTypes from 'prop-types';

import {
  ButtonDropdown,
  DropdownToggle,
  DropdownMenu,
  DropdownItem,
} from 'reactstrap';

import { Wrapper } from './components';

function Add({ data, onClick, pStyle, style }) {
  const [state, setState] = useState(false);

  return (
    <Wrapper isOpen={state} notAllowed={data.length === 0} style={style}>
      <ButtonDropdown
        isOpen={state}
        toggle={() => {
          if (data.length > 0) {
            setState(prevState => !prevState);
          }
        }}
      >
        <DropdownToggle>
          <FormattedMessage id="content-manager.containers.SettingPage.addField">
            {msg => (
              <p style={pStyle}>
                <span />
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
  onClick: () => {},
  pStyle: {},
  style: {},
};

Add.propTypes = {
  data: PropTypes.array,
  onClick: PropTypes.func,
  pStyle: PropTypes.object,
  style: PropTypes.object,
};

export default memo(Add);
