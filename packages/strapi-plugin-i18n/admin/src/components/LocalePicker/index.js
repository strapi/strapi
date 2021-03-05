import React, { useState } from 'react';
import { useSelector } from 'react-redux';
import { Picker, Padded, Text, Flex } from '@buffetjs/core';
import { Carret } from 'strapi-helper-plugin';
import styled from 'styled-components';

const List = styled.ul`
  list-style-type: none;
  padding: 0;
  margin: 0;
`;

const ListItem = styled.li`
  margin-top: 0;
  margin-bottom: 0;
  margin-left: -10px;
  margin-right: -10px;
  padding-left: 10px;
  padding-right: 10px;
  height: 36px;
  line-height: 36px;

  &:hover {
    background: ${props => props.theme.main.colors.lightGrey};
  }
`;

const EllipsisParagraph = styled(Text)`
  width: ${props => props.width};
  text-overflow: ellipsis;
  overflow: hidden;
  white-space: nowrap;
  text-align: left;
`;

const LocalePicker = () => {
  const locales = useSelector(state => state.get('i18n_locales').locales);
  const [selected, setSelected] = useState(locales && locales[0]);

  if (!locales || locales.length === 0) {
    return null;
  }

  return (
    <Picker
      position="right"
      renderButtonContent={isOpen => (
        <Flex>
          <EllipsisParagraph width="20ch">{selected.name}</EllipsisParagraph>

          <Padded left size="sm">
            <Carret fill={isOpen ? '#007eff' : '#292b2c'} isUp={isOpen} />
          </Padded>
        </Flex>
      )}
      renderSectionContent={onToggle => {
        const handleClick = locale => {
          setSelected(locale);
          onToggle();
        };

        return (
          <Padded top left right bottom>
            <List>
              {locales.map(locale => (
                <ListItem key={locale.id}>
                  <button onClick={() => handleClick(locale)} type="button">
                    <EllipsisParagraph width="200px">{locale.name}</EllipsisParagraph>
                  </button>
                </ListItem>
              ))}
            </List>
          </Padded>
        );
      }}
    />
  );
};

export default LocalePicker;
