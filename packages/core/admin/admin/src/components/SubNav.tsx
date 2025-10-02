import { useId, useState } from 'react';

import {
  Box,
  SubNav as DSSubNav,
  Flex,
  Typography,
  IconButton,
  Badge,
} from '@strapi/design-system';
import { ChevronDown, Cross, Plus } from '@strapi/icons';
import { NavLink } from 'react-router-dom';
import { styled } from 'styled-components';

import { useHistory } from '../features/BackButton';

import { tours } from './GuidedTour/Tours';

const MainSubNav = styled(DSSubNav)`
  width: 100%;
  height: 100%;
  overflow: hidden;
  background-color: ${({ theme }) => theme.colors.neutral0};
  display: flex;
  flex-direction: column;
  border-right: 0;
  box-shadow: none;
  position: fixed;
  top: 0;
  left: 0;
  z-index: 4;
  width: 100%;
  height: 100%;

  ${({ theme }) => theme.breakpoints.medium} {
    position: sticky;
    border-right: 1px solid ${({ theme }) => theme.colors.neutral150};
  }
`;

const Main = ({ children, ...props }: { children: React.ReactNode }) => (
  <MainSubNav data-strapi-sidenav {...props}>
    {children}
  </MainSubNav>
);

const StyledLink = styled(NavLink)`
  display: flex;
  align-items: center;
  justify-content: space-between;
  text-decoration: none;
  height: 32px;

  color: ${({ theme }) => theme.colors.neutral800};

  &.active > div {
    ${({ theme }) => {
      return `
        background-color: ${theme.colors.primary100};
        color: ${theme.colors.primary700};
        font-weight: 500;
      `;
    }}
  }

  &:hover.active > div {
    ${({ theme }) => {
      return `
        background-color: ${theme.colors.primary100};
      `;
    }}
  }

  &:hover > div {
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

const Link = (
  props: Omit<React.ComponentProps<typeof StyledLink>, 'label'> & {
    label: React.ReactNode;
    endAction?: React.ReactNode;
    handleClick?: () => void;
  }
) => {
  const { label, endAction, handleClick, ...rest } = props;

  return (
    <StyledLink {...rest} onClick={handleClick}>
      <Box width={'100%'} paddingLeft={3} paddingRight={3} borderRadius={1}>
        <Flex justifyContent="space-between" width="100%" gap={1}>
          <Typography
            tag="div"
            lineHeight="32px"
            width="100%"
            overflow="hidden"
            style={{ textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
          >
            {label}
          </Typography>
          <Flex gap={2}>{endAction}</Flex>
        </Flex>
      </Box>
    </StyledLink>
  );
};

const StyledHeader = styled(Flex)`
  flex: 0 0 5.6rem;
`;

const CloseButton = styled(IconButton)`
  display: block;
  ${({ theme }) => theme.breakpoints.medium} {
    display: none;
  }
`;

const Header = ({ label }: { label: string }) => {
  const goBack = useHistory('CloseNavButton', (state) => state.goBack);
  return (
    <StyledHeader justifyContent="space-between" paddingLeft={5} paddingRight={5}>
      <Typography variant="beta" tag="h2">
        {label}
      </Typography>
      <CloseButton
        onClick={goBack}
        label="Close side navigation" // TODO: translate
        type="button"
      >
        <Cross display="block" />
      </CloseButton>
    </StyledHeader>
  );
};

const Sections = ({ children, ...props }: { children: React.ReactNode[]; [key: string]: any }) => {
  return (
    <Box paddingTop={4} paddingBottom={4}>
      <Flex tag="ol" gap="5" direction="column" alignItems="stretch" {...props}>
        {children.map((child, index) => {
          return <li key={index}>{child}</li>;
        })}
      </Flex>
    </Box>
  );
};

/**
 * TODO:
 * This would be better in the content-type-builder package directly but currently
 * the SubNav API does not expose a way to wrap the link, instead it wraps the link and the list
 */
const GuidedTourTooltip = ({
  sectionId,
  children,
}: {
  sectionId?: string;
  children: React.ReactNode;
}) => {
  switch (sectionId) {
    case 'models':
      return (
        <tours.contentTypeBuilder.CollectionTypes>
          <tours.contentTypeBuilder.YourTurn>{children}</tours.contentTypeBuilder.YourTurn>
        </tours.contentTypeBuilder.CollectionTypes>
      );
    case 'singleTypes':
      return (
        <tours.contentTypeBuilder.SingleTypes>{children}</tours.contentTypeBuilder.SingleTypes>
      );
    case 'components':
      return <tours.contentTypeBuilder.Components>{children}</tours.contentTypeBuilder.Components>;
    default:
      return children;
  }
};

const Section = ({
  label,
  children,
  link,
  sectionId,
  badgeLabel,
}: {
  label: string;
  children: React.ReactNode[];
  link?: { label: string; onClick: () => void };
  sectionId?: string;
  badgeLabel?: string;
}) => {
  const listId = useId();

  return (
    <Flex direction="column" alignItems="stretch" gap={2}>
      <Box paddingLeft={5} paddingRight={5}>
        <Flex position="relative" justifyContent="space-between" gap={2}>
          <Flex>
            <Box paddingRight={1}>
              <Typography variant="sigma" textColor="neutral600">
                {label}
              </Typography>
            </Box>
          </Flex>
          <Flex gap={1}>
            {badgeLabel && (
              <Badge backgroundColor="neutral150" textColor="neutral600">
                {badgeLabel}
              </Badge>
            )}
            {link && (
              <GuidedTourTooltip sectionId={sectionId}>
                <IconButton
                  label={link.label}
                  variant="ghost"
                  withTooltip
                  onClick={link.onClick}
                  size="XS"
                >
                  <Plus />
                </IconButton>
              </GuidedTourTooltip>
            )}
          </Flex>
        </Flex>
      </Box>
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

const SubSectionHeader = styled.button`
  cursor: pointer;
  width: 100%;
  border: none;
  padding: 0;
  background: transparent;
  display: flex;
  align-items: center;
  border-radius: ${({ theme }) => theme.borderRadius};
  padding-left: ${({ theme }) => theme.spaces[3]};
  padding-right: ${({ theme }) => theme.spaces[3]};
  padding-top: ${({ theme }) => theme.spaces[2]};
  padding-bottom: ${({ theme }) => theme.spaces[2]};

  &:hover {
    background-color: ${({ theme }) => theme.colors.neutral100};
  }
`;

const SubSectionLinkWrapper = styled.li`
  ${StyledLink} > div {
    padding-left: 36px;
  }
`;

const SubSection = ({ label, children }: { label: string; children: React.ReactNode[] }) => {
  const [isOpen, setOpenLinks] = useState(true);
  const listId = useId();

  const handleClick = () => {
    setOpenLinks((prev) => !prev);
  };

  return (
    <Box>
      <Flex justifyContent="space-between">
        <SubSectionHeader onClick={handleClick} aria-expanded={isOpen} aria-controls={listId}>
          <ChevronDown
            aria-hidden
            fill="neutral500"
            style={{
              transform: `rotate(${isOpen ? '0deg' : '-90deg'})`,
              transition: 'transform 0.5s',
            }}
          />
          <Box paddingLeft={2}>
            <Typography tag="span" fontWeight="semiBold" textColor="neutral800">
              {label}
            </Typography>
          </Box>
        </SubSectionHeader>
      </Flex>
      {
        <Flex
          tag="ul"
          id={listId}
          direction="column"
          gap="2px"
          alignItems={'stretch'}
          style={{
            maxHeight: isOpen ? '1000px' : 0,
            overflow: 'hidden',
            transition: isOpen
              ? 'max-height 1s ease-in-out'
              : 'max-height 0.5s cubic-bezier(0, 1, 0, 1)',
          }}
        >
          {children.map((child, index) => {
            return <SubSectionLinkWrapper key={index}>{child}</SubSectionLinkWrapper>;
          })}
        </Flex>
      }
    </Box>
  );
};

export const SubNav = {
  Main,
  Header,
  Link,
  Sections,
  Section,
  SubSection,
};
