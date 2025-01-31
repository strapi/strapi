import { Fragment } from 'react';

import {
  Box,
  TextButton,
  SubNav,
  SubNavLink,
  SubNavLinkSection,
  SubNavSection,
  SubNavSections,
  TextInput,
  Button,
  Flex,
  Typography,
} from '@strapi/design-system';
import { Plus, Search } from '@strapi/icons';
import upperFirst from 'lodash/upperFirst';
import { useIntl } from 'react-intl';
import { NavLink } from 'react-router-dom';
import { styled } from 'styled-components';

import { getTrad } from '../../utils/getTrad';
import { useDataManager } from '../DataManager/useDataManager';
import { Status } from '../Status';

import { useContentTypeBuilderMenu } from './useContentTypeBuilderMenu';

const SubNavCustom = styled(SubNav)`
  scrollbar-width: none;
  -ms-overflow-style: none;

  &::-webkit-scrollbar {
    display: none;
  }
`;

const SubNavLinkCustom = styled(SubNavLink)`
  width: 100%;

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

const NavHeader = styled(Box)`
  border-bottom: 1px solid ${({ theme }) => theme.colors.neutral150};
  padding: ${({ theme }) => `${theme.spaces[6]} ${theme.spaces[3]}`};
`;

const TypeLabel = ({ label, status }: { label: string; status: string }) => {
  return (
    <Flex justifyContent="space-between" paddingRight={4}>
      {label}
      <Status status={status} />
    </Flex>
  );
};

export const ContentTypeBuilderNav = () => {
  const { menu, search } = useContentTypeBuilderMenu();
  const { saveSchema, isModified } = useDataManager();
  const { formatMessage } = useIntl();

  const pluginName = formatMessage({
    id: getTrad('plugin.name'),
    defaultMessage: 'Content-Type Builder',
  });

  return (
    <SubNavCustom aria-label={pluginName}>
      <NavHeader>
        <Typography variant="beta">{pluginName}</Typography>
      </NavHeader>
      <Flex padding={4} gap={4} direction={'column'}>
        <Button
          onClick={(e) => {
            e.preventDefault();
            saveSchema();
          }}
          type="submit"
          disabled={!isModified}
          fullWidth
          size="S"
        >
          {formatMessage({
            id: 'global.save',
            defaultMessage: 'Save',
          })}
        </Button>

        <TextInput
          startAction={<Search />}
          value={search.value}
          onChange={(e) => search.onChange(e.target.value)}
          aria-label="Search"
          placeholder={formatMessage({
            id: getTrad('search.placeholder'),
            defaultMessage: 'Search',
          })}
          size="S"
        />
      </Flex>
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
                const linkLabel = upperFirst(
                  formatMessage({ id: link.name, defaultMessage: link.title })
                );

                if (link.links) {
                  return (
                    <SubNavLinkSection key={link.name} label={upperFirst(link.title)}>
                      {link.links.map((subLink: any) => {
                        const label = upperFirst(
                          formatMessage({ id: subLink.name, defaultMessage: subLink.title })
                        );

                        return (
                          <SubNavLinkCustom
                            tag={NavLink}
                            to={subLink.to}
                            active={subLink.active}
                            key={subLink.name}
                            isSubSectionChild
                          >
                            <TypeLabel label={label} status={subLink.status} />
                          </SubNavLinkCustom>
                        );
                      })}
                    </SubNavLinkSection>
                  );
                }

                return (
                  <SubNavLinkCustom tag={NavLink} to={link.to} active={link.active} key={link.name}>
                    <TypeLabel label={linkLabel} status={link.status} />
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
    </SubNavCustom>
  );
};
