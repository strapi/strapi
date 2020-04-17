import React from 'react';
import PropTypes from 'prop-types';
import { components } from 'react-select';
import { useGlobalContext } from 'strapi-helper-plugin';
import { CheckboxWrapper, Label } from '@buffetjs/styles';
import getTrad from '../../utils/getTrad';
import SelectCheckbox from '../SelectCheckbox';
import SubUl from '../SelectMenuSubUl';
import UpperFirst from '../UpperFirst';
import Ul from '../SelectMenuUl';
import Text from './Text';

const MenuList = ({ selectProps: { changeMediaAllowedTypes, value }, ...rest }) => {
  const { formatMessage } = useGlobalContext();
  const Component = components.MenuList;
  const areAllAllowedTypesSelected = value.value && value.value.length === 3;
  const someChecked = value.value && !areAllAllowedTypesSelected && value.value.length > 0;
  const options = [
    {
      name: 'images',
      infos: '(JPEG, PNG, GIF, SVG, TIFF, ICO, DVU)',
    },
    {
      name: 'videos',
      infos: '(MPEG, MP4, Quicktime, WMV, AVI, FLV)',
    },

    {
      name: 'files',
      infos: '(CSV, ZIP, MP3, PDF, Excel, JSON, ...)',
    },
  ];

  return (
    <Component {...rest}>
      <Ul>
        <li className="li-multi-menu">
          <div style={{ marginTop: 3 }}>
            <CheckboxWrapper>
              <Label
                htmlFor="overrideReactSelectBehavior"
                onClick={() => {
                  changeMediaAllowedTypes({
                    target: { name: 'all', value: !areAllAllowedTypesSelected },
                  });
                }}
              >
                <SelectCheckbox
                  id="checkAll"
                  checked={areAllAllowedTypesSelected}
                  someChecked={someChecked}
                  name="all"
                  onChange={() => {}}
                />
                <UpperFirst content="All" />
              </Label>
            </CheckboxWrapper>
          </div>
          <SubUl tad="ul" isOpen>
            {options.map(({ name, infos }) => {
              const isChecked = value.value && value.value.includes(name);
              const target = { name, value: !isChecked };

              return (
                <li key={name}>
                  <CheckboxWrapper>
                    <Label
                      htmlFor={name}
                      onClick={() => {
                        changeMediaAllowedTypes({ target });
                      }}
                    >
                      <SelectCheckbox
                        id="check"
                        name={name}
                        // Remove the handler
                        onChange={() => {}}
                        checked={isChecked}
                      />
                      <Text>
                        <UpperFirst
                          content={formatMessage({
                            id: getTrad(`form.attribute.media.allowed-types.option-${name}`),
                          })}
                        />
                      </Text>
                      <Text fontSize="sm" color="#B3B5B9" textTransform="italic">
                        &nbsp;{infos}
                      </Text>
                    </Label>
                  </CheckboxWrapper>
                </li>
              );
            })}
          </SubUl>
        </li>
      </Ul>
    </Component>
  );
};

MenuList.defaultProps = {
  selectProps: {
    value: {},
  },
};

MenuList.propTypes = {
  selectProps: PropTypes.shape({
    changeMediaAllowedTypes: PropTypes.func.isRequired,
    value: PropTypes.object,
  }),
};

export default MenuList;
