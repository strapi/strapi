import {
  SubNav,
  SubNavHeader,
  SubNavLink,
  SubNavLinkSection,
  SubNavSection,
  SubNavSections,
  Box,
} from '@strapi/parts';
import { TextButton } from '@strapi/parts/TextButton';
import { AddIcon } from '@strapi/icons';
import upperFirst from 'lodash/upperFirst';
import React from 'react';
import { useIntl } from 'react-intl';
import useContentTypeBuilderMenu from './useContentTypeBuilderMenu';
import pluginId from '../../pluginId';

// ! ASK SOUP ABOUT THE WAIT + TOGGLEPROMPT
const wait = () => new Promise(resolve => setTimeout(resolve, 100));

const ContentTypeBuilderNav = () => {
  const { menu, searchValue, onSearchChange } = useContentTypeBuilderMenu({ wait });
  const { formatMessage } = useIntl();

  return (
    <SubNav ariaLabel={`${pluginId}.plugin.name`}>
      <SubNavHeader
        searchable
        value={searchValue}
        onClear={() => onSearchChange('')}
        onChange={e => onSearchChange(e.target.value)}
        label={formatMessage({ id: `${pluginId}.plugin.name` })}
        searchLabel="Search..."
      />
      <SubNavSections>
        {menu.map(section => {
          const title = `${section.title.id}${section.links.length > 1 ? 'plural' : 'singular'}`;

          return (
            <>
              <SubNavSection
                key={section.name}
                label={formatMessage({ id: title, defaultMessage: title.defaultMessage })}
                collapsable
                badgeLabel={section.links.length.toString()}
              >
                {section.links.map(link => {
                  if (link.links) {
                    return (
                      <SubNavLinkSection key={link.title} label={upperFirst(link.title)}>
                        {link.links.map(subLink => (
                          <SubNavLink to={subLink.to} active={subLink.active} key={subLink.uid}>
                            {upperFirst(
                              formatMessage({ id: subLink.name, defaultMessage: subLink.title })
                            )}
                          </SubNavLink>
                        ))}
                      </SubNavLinkSection>
                    );
                  }

                  return (
                    <SubNavLink to={link.to} active={link.active} key={link.uid}>
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
                      defaultMessage: section.customLink.id,
                    })}
                  </TextButton>
                </Box>
              )}
            </>
          );
        })}
      </SubNavSections>
    </SubNav>
  );
};

export default ContentTypeBuilderNav;
