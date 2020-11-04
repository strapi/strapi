import React, { memo, useCallback, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { ButtonDropdown } from 'reactstrap';
import { FormattedMessage } from 'react-intl';
import { LayoutIcon, useGlobalContext } from 'strapi-helper-plugin';
import pluginId from '../../pluginId';
import InputCheckbox from '../InputCheckbox';
import DropdownItemLink from './DropdownItemLink';
import DropdownWrapper from './DropdownWrapper';
import ItemDropdown from './ItemDropdown';
import ItemDropdownReset from './ItemDropdownReset';
import LayoutWrapper from './LayoutWrapper';
import MenuDropdown from './MenuDropdown';
import Toggle from './Toggle';

const DisplayedFieldsDropdown = ({ displayedHeaders, items, onChange, onClickReset, slug }) => {
  const { emitEvent } = useGlobalContext();
  const emitEventRef = useRef(emitEvent);

  const [isOpen, setIsOpen] = useState(false);

  const toggle = useCallback(
    () =>
      setIsOpen(prev => {
        if (prev === false) {
          emitEventRef.current('willChangeListFieldsSettings');
        }

        return !prev;
      }),
    []
  );

  return (
    <DropdownWrapper>
      <ButtonDropdown isOpen={isOpen} toggle={toggle} direction="down">
        {/* Fix React warning unrecognize prop */}
        <Toggle isopen={isOpen.toString()} />
        <MenuDropdown isopen={isOpen.toString()}>
          <DropdownItemLink>
            <LayoutWrapper
              to={`${slug}/ctm-configurations/list-settings`}
              onClick={() => emitEvent('willEditListLayout')}
            >
              <LayoutIcon />
              <FormattedMessage id="app.links.configure-view" />
            </LayoutWrapper>
          </DropdownItemLink>
          <FormattedMessage id={`${pluginId}.containers.ListPage.displayedFields`}>
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
          {items.map(headerName => {
            const value = displayedHeaders.findIndex(({ name }) => name === headerName) !== -1;
            const handleChange = () => onChange({ name: headerName, value });

            return (
              <ItemDropdown key={headerName} toggle={false} onClick={handleChange}>
                <div>
                  <InputCheckbox onChange={handleChange} name={headerName} value={value} />
                </div>
              </ItemDropdown>
            );
          })}
        </MenuDropdown>
      </ButtonDropdown>
    </DropdownWrapper>
  );
};

DisplayedFieldsDropdown.propTypes = {
  displayedHeaders: PropTypes.array.isRequired,
  items: PropTypes.array.isRequired,
  onChange: PropTypes.func.isRequired,
  onClickReset: PropTypes.func.isRequired,
  slug: PropTypes.string.isRequired,
};

export default memo(DisplayedFieldsDropdown);
