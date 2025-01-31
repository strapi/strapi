import * as React from 'react';
import {
  Box,
  TextButton,
  SubNav,
  SubNavHeader,
  SubNavLink,
  SubNavLinkSection,
  SubNavSection,
  SubNavSections,
} from '@strapi/design-system';
import { Plus } from '@strapi/icons';
import upperFirst from 'lodash/upperFirst';
import { useIntl } from 'react-intl';
import { NavLink } from 'react-router-dom';
import { styled } from 'styled-components';

import { getTrad } from '../../utils/getTrad';
import { useContentTypeBuilderMenu } from './useContentTypeBuilderMenu';
import usePreventScroll from '../../hooks/usePreventScroll';
const SubNavLinkCustom = styled(SubNavLink)`
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  width: 100%;
  display: block; 
  div {
    width: inherit;
    span:nth-child(2) {
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      width: inherit;
    }
  }
`;

const SubNavLinkSectionCustom = styled(SubNavLinkSection)`
  overflow: hidden;
  max-width: 100%;
`;

export const ContentTypeBuilderNav = () => {
  const { menu, searchValue, onSearchChange } = useContentTypeBuilderMenu();
  const { formatMessage } = useIntl();
  const sidebarRef = React.useRef<HTMLDivElement>(null);
  usePreventScroll(sidebarRef);

  const pluginName = formatMessage({
    id: getTrad('plugin.name'),
    defaultMessage: 'Content-Type Builder',
  });

  return (
    <SubNav  ref={sidebarRef} aria-label={pluginName}> 
      <SubNavHeader 
        searchable
        value={searchValue}
        onClear={() => onSearchChange('')}
        onChange={(e) => onSearchChange(e.target.value)}
        label={pluginName}
        searchLabel={formatMessage({
          id: 'global.search',
          defaultMessage: 'Search',
        })}
      />
      <SubNavSections>
        {menu.map((section) => (
          <React.Fragment key={section.name}>
            <SubNavSection
              label={formatMessage({
                id: section.title.id,
                defaultMessage: section.title.defaultMessage,
              })}
              collapsable
              badgeLabel={section.linksCount.toString()}
            >
              {section.links.map((link) => {
                if (link.links) {
                  return (
                    <SubNavLinkSectionCustom key={link.name} label={upperFirst(link.title)}>
                    {link.links.map((subLink: any) => (
                      <SubNavLinkCustom
                        tag={NavLink}
                        to={subLink.to}
                        active={subLink.active}
                        key={subLink.name}
                        isSubSectionChild
                      >
                        {upperFirst(
                          formatMessage({ id: subLink.name, defaultMessage: subLink.title })
                        )}
                      </SubNavLinkCustom>
                    ))}
                  </SubNavLinkSectionCustom>                  
                  );
                }

                return (
                  <SubNavLinkCustom
                    tag={NavLink}
                    to={link.to}
                    active={link.active}
                    key={link.name}
                    width="100%"
                  >
                    {upperFirst(formatMessage({ id: link.name, defaultMessage: link.title }))}
                  </SubNavLinkCustom>
                );
              })}
            </SubNavSection>
            {section.customLink && (
              <Box paddingLeft={7}>
                <TextButton
                  onClick={section.customLink.onClick}
                  startIcon={<Plus width="0.8rem" height="0.8rem" />}
                  marginTop={2}
                  cursor="pointer"
                >
                  {formatMessage({
                    id: section.customLink.id,
                    defaultMessage: section.customLink.defaultMessage,
                  })}
                </TextButton>
              </Box>
            )}
          </React.Fragment>
        ))}
      </SubNavSections>
    </SubNav>
  );
};
