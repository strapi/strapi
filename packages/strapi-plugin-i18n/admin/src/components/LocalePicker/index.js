import React, { useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Picker, Padded, Text, Flex } from '@buffetjs/core';
import { Carret, useQueryParams } from 'strapi-helper-plugin';
import { useRouteMatch } from 'react-router-dom';
import styled from 'styled-components';
import get from 'lodash/get';
import useContentTypePermissions from '../../hooks/useContentTypePermissions';
import useHasI18n from '../../hooks/useHasI18n';
import selectI18NLocales from '../../selectors/selectI18nLocales';
import getInitialLocale from '../../utils/getInitialLocale';

const List = styled.ul`
  list-style-type: none;
  padding: 3px 0;
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
  display: flex;
  justify-content: center;

  &:hover {
    background: ${props => props.theme.main.colors.mediumGrey};
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
  const dispatch = useDispatch();
  const locales = useSelector(selectI18NLocales);
  const [{ query }, setQuery] = useQueryParams();
  const {
    params: { slug },
  } = useRouteMatch('/plugins/content-manager/collectionType/:slug');
  const isFieldLocalized = useHasI18n();
  const { createPermissions, readPermissions } = useContentTypePermissions(slug);

  const initialLocale = getInitialLocale(query, locales);
  const [selected, setSelected] = useState(initialLocale);

  if (!isFieldLocalized) {
    return null;
  }

  if (!locales || locales.length === 0) {
    return null;
  }

  const displayedLocales = locales.filter(locale => {
    const canCreate = createPermissions.find(({ properties }) => {
      return get(properties, 'locales', []).includes(locale.code);
    });
    const canRead = readPermissions.find(({ properties }) =>
      get(properties, 'locales', []).includes(locale.code)
    );

    return canCreate || canRead;
  });

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
          dispatch({ type: 'ContentManager/RBACManager/RESET_PERMISSIONS' });
          setSelected(locale);

          setQuery({
            plugins: { ...query.plugins, i18n: { locale: locale.code } },
          });
          onToggle();
        };

        const hasMultipleLocales = displayedLocales.length > 1;

        return hasMultipleLocales ? (
          <Padded left right>
            <List>
              {displayedLocales.map(locale => {
                if (locale.id === selected.id) {
                  return null;
                }

                return (
                  <ListItem key={locale.id}>
                    <button onClick={() => handleClick(locale)} type="button">
                      <EllipsisParagraph width="200px">
                        {locale.name || locale.code}
                      </EllipsisParagraph>
                    </button>
                  </ListItem>
                );
              })}
            </List>
          </Padded>
        ) : null;
      }}
    />
  );
};

export default LocalePicker;
