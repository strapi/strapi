import { Fragment, useId, useState } from 'react';

import {
  Box,
  SubNav,
  TextInput,
  Button,
  Flex,
  Typography,
  Divider,
  IconButton,
} from '@strapi/design-system';
import { ChevronDown, Plus, Search } from '@strapi/icons';
import upperFirst from 'lodash/upperFirst';
import { useIntl } from 'react-intl';
import { NavLink } from 'react-router-dom';
import { styled } from 'styled-components';

import { getTrad } from '../../utils/getTrad';
import { useDataManager } from '../DataManager/useDataManager';
import { Status } from '../Status';

import { useContentTypeBuilderMenu } from './useContentTypeBuilderMenu';

const SubNavCustom = styled(SubNav)`
  background-color: ${({ theme }) => theme.colors.neutral0};

  scrollbar-width: none;
  -ms-overflow-style: none;

  &::-webkit-scrollbar {
    display: none;
  }
`;

const SubNavLinkCustom = styled(NavLink)`
  display: flex;
  align-items: center;
  justify-content: space-between;
  text-decoration: none;
  height: 32px;

  color: ${({ theme }) => theme.colors.neutral800};

  &.active div {
    ${({ theme }) => {
      return `
        background-color: ${theme.colors.primary100};
        color: ${theme.colors.primary700};
        font-weight: 500;
      `;
    }}
  }

  &:hover.active div {
    ${({ theme }) => {
      return `
        background-color: ${theme.colors.primary100};
      `;
    }}
  }

  &:hover div {
    ${({ theme }) => {
      return `
        background-color: ${theme.colors.neutral100};
      `;
    }}
  }

  &:focus-visible {
    outline-offset: -2px;
  }
`;

const NavHeader = styled(Box)`
  height: 56px;
  display: flex;
  align-items: center;
  padding-left: ${({ theme }) => theme.spaces[5]};
`;

const TypeLabel = ({ label, status }: { label: string; status: string }) => {
  return (
    <Flex justifyContent="space-between">
      <Typography lineHeight="32px">{label}</Typography>
      <Box tag="span" textAlign="center" width={'24px'}>
        <Status status={status} />
      </Box>
    </Flex>
  );
};

const Sections = ({ children, ...props }: { children: React.ReactNode[]; [key: string]: any }) => {
  return (
    <Box paddingBottom={4}>
      <Flex tag="ol" gap="5" direction="column" alignItems="stretch" {...props}>
        {children.map((child, index) => {
          return <li key={index}>{child}</li>;
        })}
      </Flex>
    </Box>
  );
};

const Section = ({
  label,
  children,
  link,
}: {
  label: string;
  children: React.ReactNode[];
  link?: { label: string; onClik: () => void };
}) => {
  const listId = useId();

  return (
    <Flex direction="column" alignItems="stretch" gap={2}>
      <Box paddingLeft={5} paddingRight={5}>
        <Flex position="relative" justifyContent="space-between">
          <Flex>
            <Box>
              <Typography variant="sigma" textColor="neutral600">
                {label}
              </Typography>
            </Box>
          </Flex>
          {link && (
            <IconButton
              label={link.label}
              variant="ghost"
              withTooltip
              onClick={link.onClik}
              size="XS"
            >
              <Plus />
            </IconButton>
          )}
        </Flex>
      </Box>
      {/*
            TODO: flex / column / gap 2
      */}
      <Flex
        tag="ol"
        id={listId}
        direction="column"
        gap="2px"
        alignItems={'stretch'}
        marginLeft={2}
        marginRight={2}
      >
        {children.map((child, index) => {
          return <li key={index}>{child}</li>;
        })}
      </Flex>
    </Flex>
  );
};

const SubNavLinkSectionButton = styled.button`
  cursor: pointer;
  width: 100%;
  border: none;
  padding: 0;
  background: transparent;
  display: flex;
  align-items: center;
`;

const SubSection = ({ label, children }: { label: string; children: React.ReactNode[] }) => {
  const [isOpen, setOpenLinks] = useState(true);
  const listId = useId();

  const handleClick = () => {
    setOpenLinks((prev) => !prev);
  };

  return (
    <Box>
      <Box paddingLeft={3} paddingTop={2} paddingBottom={2} paddingRight={3}>
        <Flex justifyContent="space-between">
          <SubNavLinkSectionButton
            onClick={handleClick}
            aria-expanded={isOpen}
            aria-controls={listId}
          >
            <ChevronDown
              aria-hidden
              fill="neutral500"
              style={{ transform: `rotateX(${isOpen ? '0deg' : '180deg'})` }}
            />
            <Box paddingLeft={2}>
              <Typography tag="span" fontWeight="semiBold" textColor="neutral800">
                {label}
              </Typography>
            </Box>
          </SubNavLinkSectionButton>
        </Flex>
      </Box>
      {isOpen && (
        <Flex tag="ul" id={listId} direction="column" gap="2px" alignItems={'stretch'}>
          {children.map((child, index) => {
            return <li key={index}>{child}</li>;
          })}
        </Flex>
      )}
    </Box>
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
      <Divider background="neutral200" />
      <Flex padding={5} gap={3} direction={'column'}>
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
      <Sections>
        {menu.map((section) => (
          <Fragment key={section.name}>
            <Section
              label={formatMessage({
                id: section.title.id,
                defaultMessage: section.title.defaultMessage,
              })}
              link={
                section.customLink && {
                  label: formatMessage({
                    id: section.customLink?.id,
                    defaultMessage: section.customLink?.defaultMessage,
                  }),
                  onClik: section.customLink?.onClick,
                }
              }
            >
              {section.links.map((link) => {
                const linkLabel = upperFirst(
                  formatMessage({ id: link.name, defaultMessage: link.title })
                );

                if (link.links) {
                  return (
                    <SubSection key={link.name} label={upperFirst(link.title)}>
                      {link.links.map((subLink: any) => {
                        const label = upperFirst(
                          formatMessage({ id: subLink.name, defaultMessage: subLink.title })
                        );

                        return (
                          <SubNavLinkCustom to={subLink.to} key={subLink.name}>
                            <Box
                              width={'100%'}
                              paddingLeft="36px"
                              paddingRight={3}
                              borderRadius={1}
                            >
                              <TypeLabel label={label} status={subLink.status} />
                            </Box>
                          </SubNavLinkCustom>
                        );
                      })}
                    </SubSection>
                  );
                }

                return (
                  <SubNavLinkCustom to={link.to} key={link.name}>
                    <Box width={'100%'} paddingLeft={3} paddingRight={3} borderRadius={1}>
                      <TypeLabel label={linkLabel} status={link.status} />
                    </Box>
                  </SubNavLinkCustom>
                );
              })}
            </Section>
          </Fragment>
        ))}
      </Sections>
    </SubNavCustom>
  );
};
