import React from 'react';
import PropTypes from 'prop-types';
import { ButtonDropdown } from 'reactstrap';
import { FormattedMessage } from 'react-intl';
import { LayoutIcon } from 'strapi-helper-plugin';
import pluginId from '../../pluginId';
import InputCheckbox from '../InputCheckbox';
import DropdownItemLink from './DropdownItemLink';
import DropdownWrapper from './DropdownWrapper';
import ItemDropdown from './ItemDropdown';
import ItemDropdownReset from './ItemDropdownReset';
import LayoutWrapper from './LayoutWrapper';
import MenuDropdown from './MenuDropdown';
import Toggle from './Toggle';

const DisplayedFieldsDropdown = ({
  isOpen,
  items,
  onChange,
  onClickReset,
  toggle,
}) => {
  return (
    <DropdownWrapper>
      <ButtonDropdown isOpen={isOpen} toggle={toggle} direction="bottom">
        {/* Fix React warning unrecognize prop */}
        <Toggle isopen={isOpen.toString()} />
        <MenuDropdown isopen={isOpen.toString()}>
          <DropdownItemLink>
            <LayoutWrapper to="/">
              <LayoutIcon />
              <FormattedMessage id="app.links.configure-view" />
            </LayoutWrapper>
          </DropdownItemLink>
          <FormattedMessage
            id={`${pluginId}.containers.ListPage.displayedFields`}
          >
            {msg => (
              <ItemDropdownReset onClick={onClickReset}>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                  }}
                >
                  <span>{msg}</span>
                  <FormattedMessage id={`${pluginId}.containers.Edit.reset`} />
                </div>
              </ItemDropdownReset>
            )}
          </FormattedMessage>
          {items.map(item => (
            <ItemDropdown
              key={item.name}
              toggle={false}
              onClick={() => onChange(item)}
            >
              <div>
                <InputCheckbox
                  onChange={() => onChange(item)}
                  name={item.name}
                  value={item.value}
                />
              </div>
            </ItemDropdown>
          ))}
        </MenuDropdown>
      </ButtonDropdown>
    </DropdownWrapper>
  );
};

DisplayedFieldsDropdown.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  items: PropTypes.array.isRequired,
  onChange: PropTypes.func.isRequired,
  onClickReset: PropTypes.func.isRequired,
  toggle: PropTypes.func.isRequired,
};

export default DisplayedFieldsDropdown;
