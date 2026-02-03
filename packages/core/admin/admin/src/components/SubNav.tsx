import { useEffect, useId, useRef, useState } from 'react';

import {
  Badge,
  Box,
  Flex,
  IconButton,
  ScrollArea,
  SubNav as DSSubNav,
  Typography,
} from '@strapi/design-system';
import { ChevronDown, Plus } from '@strapi/icons';
import { NavLink } from 'react-router-dom';
import { styled } from 'styled-components';

import {
  HEIGHT_TOP_NAVIGATION,
  HEIGHT_TOP_NAVIGATION_MEDIUM,
  WIDTH_SIDE_NAVIGATION,
} from '../constants/theme';

import { tours } from './GuidedTour/Tours';

const MainSubNav = styled(DSSubNav)`
  width: 100%;
  height: calc(100dvh - ${HEIGHT_TOP_NAVIGATION} - 1px);
  overflow: hidden;
  background-color: ${({ theme }) => theme.colors.neutral0};
  display: flex;
  flex-direction: column;
  border-right: 0;
  box-shadow: none;
  position: fixed;
  top: calc(${HEIGHT_TOP_NAVIGATION} + 1px);
  left: 0;
  z-index: 2;

  ${({ theme }) => theme.breakpoints.medium} {
    width: ${WIDTH_SIDE_NAVIGATION};
    position: sticky;
    top: 0;
    border-right: 1px solid ${({ theme }) => theme.colors.neutral150};
  }
  ${({ theme }) => theme.breakpoints.large} {
    height: 100dvh;
  }
`;

const Main = ({ children, ...props }: { children: React.ReactNode; isFullPage?: boolean }) => (
  <MainSubNav {...props}>{children}</MainSubNav>
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
      <Box
        width={'100%'}
        paddingLeft={3}
        paddingRight={3}
        paddingTop={{ initial: 1, large: 0 }}
        paddingBottom={{ initial: 1, large: 0 }}
        borderRadius={1}
      >
        <Flex justifyContent="space-between" width="100%" gap={{ initial: 2, large: 1 }}>
          <Typography
            tag="div"
            lineHeight="32px"
            width={{ initial: '80dvw', medium: '100%' }}
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
  flex: 0 0 ${HEIGHT_TOP_NAVIGATION};
  height: ${HEIGHT_TOP_NAVIGATION};

  ${({ theme }) => theme.breakpoints.medium} {
    flex: 0 0 ${HEIGHT_TOP_NAVIGATION_MEDIUM};
    height: ${HEIGHT_TOP_NAVIGATION_MEDIUM};
  }
`;

const Header = ({ label }: { label: string }) => {
  return (
    <StyledHeader justifyContent="space-between" paddingLeft={5} paddingRight={5}>
      <Typography variant="beta" tag="h2">
        {label}
      </Typography>
    </StyledHeader>
  );
};

const Sections = ({
  children,
  ...props
}: {
  children: React.ReactNode[];
  [key: string]: unknown;
}) => {
  return (
    <Box
      paddingTop={{ initial: 5, large: 4 }}
      paddingBottom={{ initial: 5, large: 4 }}
      paddingLeft={{ initial: 3, large: 0 }}
      paddingRight={{ initial: 3, large: 0 }}
      maxWidth={{ initial: '100%', medium: WIDTH_SIDE_NAVIGATION }}
    >
      <Flex tag="ul" gap={6} direction="column" alignItems="stretch" {...props}>
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
      <Box
        paddingLeft={{
          initial: 3,
          large: 5,
        }}
        paddingRight={{
          initial: 3,
          large: 5,
        }}
      >
        <Flex position="relative" justifyContent="space-between" gap={2}>
          <Flex>
            <Box>
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
        gap={{ initial: 2, large: '2px' }}
        alignItems={'stretch'}
        marginLeft={{
          initial: 0,
          large: 2,
        }}
        marginRight={{
          initial: 0,
          large: 2,
        }}
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
  const [contentHeight, setContentHeight] = useState(0);
  const listId = useId();
  const contentRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (contentRef.current) {
      setContentHeight(contentRef.current.scrollHeight);
    }
  }, [children]);

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
      <Flex
        ref={contentRef}
        tag="ul"
        id={listId}
        direction="column"
        gap="2px"
        alignItems={'stretch'}
        style={{
          maxHeight: isOpen ? `${contentHeight}px` : 0,
          overflow: 'hidden',
          transition: 'max-height 0.5s cubic-bezier(0, 1, 0, 1)',
        }}
      >
        {children.map((child, index) => {
          return <SubSectionLinkWrapper key={index}>{child}</SubSectionLinkWrapper>;
        })}
      </Flex>
    </Box>
  );
};

const PageWrapper = styled(Box)`
  ${MainSubNav} {
    background-color: transparent;
    border-right: none;
  }

  ${({ theme }) => theme.breakpoints.medium} {
    ${MainSubNav} {
      top: 0;
    }
  }
`;

const Content = ({ children }: { children: React.ReactNode }) => {
  return <ScrollArea>{children}</ScrollArea>;
};

export const SubNav = {
  Main,
  Content,
  Header,
  Link,
  Sections,
  Section,
  SubSection,
  PageWrapper,
};
