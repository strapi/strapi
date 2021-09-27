import React from 'react';
import AddIcon from '@strapi/icons/AddIcon';
import { Box } from '@strapi/parts/Box';
import {
  SubNav,
  SubNavHeader,
  SubNavLink,
  SubNavLinkSection,
  SubNavSection,
  SubNavSections,
} from '@strapi/parts/SubNav';
import { TextButton } from '@strapi/parts/TextButton';
import upperFirst from 'lodash/upperFirst';
import { useIntl } from 'react-intl';
import useContentTypeBuilderMenu from './useContentTypeBuilderMenu';
import getTrad from '../../utils/getTrad';

const ContentTypeBuilderNav = () => {
  const { menu, searchValue, onSearchChange } = useContentTypeBuilderMenu();
  const { formatMessage } = useIntl();

  return (
    <SubNav
      ariaLabel={formatMessage({
        id: `${getTrad('plugin.name')}`,
        defaultMessage: 'Content-Types Builder',
      })}
    >
      <SubNavHeader
        searchable
        value={searchValue}
        onClear={() => onSearchChange('')}
        onChange={e => onSearchChange(e.target.value)}
        label={formatMessage({
          id: `${getTrad('plugin.name')}`,
          defaultMessage: 'Content-Types Builder',
        })}
        searchLabel="Search..."
      />
      <SubNavSections>
        {menu.map(section => {
          const title = `${section.title.id}${section.links.length > 1 ? 'plural' : 'singular'}`;

          return (
            <React.Fragment key={section.name}>
              <SubNavSection
                label={formatMessage({ id: title, defaultMessage: title.defaultMessage })}
                collapsable
                badgeLabel={section.links.length.toString()}
              >
                {section.links.map(link => {
                  if (link.links) {
                    return (
                      <SubNavLinkSection key={link.name} label={upperFirst(link.title)}>
                        {link.links.map(subLink => (
                          <SubNavLink to={subLink.to} active={subLink.active} key={subLink.name}>
                            {upperFirst(
                              formatMessage({ id: subLink.name, defaultMessage: subLink.title })
                            )}
                          </SubNavLink>
                        ))}
                      </SubNavLinkSection>
                    );
                  }

                  return (
                    <SubNavLink to={link.to} active={link.active} key={link.name}>
                      {upperFirst(formatMessage({ id: link.name, defaultMessage: link.title }))}
                    </SubNavLink>
                  );
                })}
              </SubNavSection>
              {section.customLink && (
                <Box as="li" paddingLeft={7}>
                  <TextButton onClick={section.customLink.onClick} startIcon={<AddIcon />}>
                    {formatMessage({
                      id: section.customLink.id,
                      defaultMessage: section.customLink.defaultMessage,
                    })}
                  </TextButton>
                </Box>
              )}
            </React.Fragment>
          );
        })}
      </SubNavSections>
    </SubNav>
  );
};

export default ContentTypeBuilderNav;
