import React from 'react';
import PropTypes from 'prop-types';
import { components } from 'react-select';
import { useGlobalContext } from 'strapi-helper-plugin';
import { Checkbox, CheckboxWrapper, Label } from '@buffetjs/styles';
import getTrad from '../../utils/getTrad';
import UpperFirst from '../UpperFirst';
import SubUl from '../SelectMenuSubUl';
import Ul from '../SelectMenuUl';

const MenuList = ({ selectProps: { changeMediaAllowedTypes, value }, ...rest }) => {
  const { formatMessage } = useGlobalContext();
  const Component = components.MenuList;
  const areAllAllowedTypesSelected = value.value.length === 3;
  const someChecked = !areAllAllowedTypesSelected && value.value.length > 1;

  // getTrad('form.attribute.media.allowed-types.option-images')

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
      <Ul
        style={{
          maxHeight: 150,
        }}
      >
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
                <Checkbox
                  id="checkAll"
                  checked={areAllAllowedTypesSelected}
                  someChecked={someChecked}
                  name="all"
                  onChange={() => {}}
                  style={{ marginRight: 10 }}
                />
                <UpperFirst content="All" />
              </Label>
            </CheckboxWrapper>
          </div>
          <SubUl tad="ul" isOpen>
            {options.map(({ name, infos }) => {
              const isChecked = value.value.includes(name);
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
                      <Checkbox
                        id="check"
                        name={name}
                        // Remove the handler
                        onChange={() => {}}
                        checked={isChecked}
                        style={{ marginRight: 10 }}
                      />
                      <span style={{ display: 'contents' }}>
                        <UpperFirst
                          content={formatMessage({
                            id: getTrad(`form.attribute.media.allowed-types.option-${name}`),
                          })}
                        />
                      </span>
                      <span
                        style={{
                          display: 'contents',
                          fontSize: 11,
                          color: '#B3B5B9',
                          textTransform: 'italic',
                        }}
                      >
                        &nbsp;{infos}
                      </span>
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
