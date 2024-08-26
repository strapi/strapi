import { Fragment } from 'react';

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

const SubNavLinkCustom = styled(SubNavLink)`
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

export const ContentTypeBuilderNav = () => {
  const { menu, searchValue, onSearchChange } = useContentTypeBuilderMenu();
  const { formatMessage } = useIntl();

  const pluginName = formatMessage({
    id: getTrad('plugin.name'),
    defaultMessage: 'Content-Type Builder',
  });

  return (
    <SubNav aria-label={pluginName}>
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
          <Fragment key={section.name}>
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
                    <SubNavLinkSection key={link.name} label={upperFirst(link.title)}>
                      {link.links.map((subLink: any) => (
                        <SubNavLink
                          tag={NavLink}
                          to={subLink.to}
                          active={subLink.active}
                          key={subLink.name}
                          isSubSectionChild
                        >
                          {upperFirst(
                            formatMessage({ id: subLink.name, defaultMessage: subLink.title })
                          )}
                        </SubNavLink>
                      ))}
                    </SubNavLinkSection>
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
          </Fragment>
        ))}
      </SubNavSections>
    </SubNav>
  );
};
