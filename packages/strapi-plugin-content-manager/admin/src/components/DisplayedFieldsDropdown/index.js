import React from 'react';
import PropTypes from 'prop-types';
import { ButtonDropdown, DropdownItem } from 'reactstrap';
import { FormattedMessage } from 'react-intl';
import { LayoutIcon } from 'strapi-helper-plugin';
import DropdownWrapper from './DropdownWrapper';
import LayoutWrapper from './LayoutWrapper';
import MenuDropdown from './MenuDropdown';
import Toggle from './Toggle';

const DisplayedFieldsDropdown = ({ isOpen, toggle }) => {
  return (
    <DropdownWrapper>
      <ButtonDropdown isOpen={isOpen} toggle={toggle} direction="bottom">
        {/* Fix React warning unrecognize prop */}
        <Toggle isopen={isOpen.toString()} />
        <MenuDropdown isopen={isOpen.toString()}>
          <DropdownItem>
            <LayoutWrapper to="/">
              <LayoutIcon />
              <FormattedMessage id="app.links.configure-view" />
            </LayoutWrapper>
          </DropdownItem>
        </MenuDropdown>
      </ButtonDropdown>
    </DropdownWrapper>
  );
};

DisplayedFieldsDropdown.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  toggle: PropTypes.func.isRequired,
};

export default DisplayedFieldsDropdown;
