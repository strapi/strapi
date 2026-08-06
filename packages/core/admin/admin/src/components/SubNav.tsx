import { useEffect, useId, useRef, useState, useMemo } from 'react';

import {
  Badge,
  Box,
  Flex,
  IconButton,
  Menu,
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
import { SubNavFolder } from './SubNavFolder';

const MainSubNav = styled(DSSubNav)<{ $isFullPage?: boolean }>`
  width: 100%;
  height: 100%;
  overflow: ${({ $isFullPage }) => ($isFullPage ? 'visible' : 'hidden')};
  background-color: ${({ theme }) => theme.colors.neutral0};
  display: flex;
  flex-direction: column;
  border-right: 0;
  box-shadow: none;
  position: relative;

  ${({ theme }) => theme.breakpoints.medium} {
    width: ${WIDTH_SIDE_NAVIGATION};
    position: sticky;
    top: 0;
    overflow: hidden;
    border-right: 1px solid ${({ theme }) => theme.colors.neutral150};
    overscroll-behavior: contain;
  }
`;

const Main = ({
  children,
  isFullPage,
  ...props
}: {
  children: React.ReactNode;
  isFullPage?: boolean;
}) => (
  <MainSubNav $isFullPage={isFullPage} {...props}>
    {children}
  </MainSubNav>
);

const StyledLink = styled(NavLink)<{ $depth?: number }>`
  display: flex;
  align-items: center;
  justify-content: space-between;
  text-decoration: none;
  height: 32px;

  color: ${({ theme }) => theme.colors.neutral800};

  & > div {
    padding-left: ${({ theme, $depth = 0 }) =>
      `calc(${$depth} * ${theme.spaces[6]} + ${theme.spaces[3]})`};
  }

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

const LinkBullet = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 16px;

  &::before {
    content: '';
    width: 4px;
    height: 4px;
    border-radius: 50%;
    background-color: currentColor;
  }
`;

const Link = (
  props: Omit<React.ComponentProps<typeof StyledLink>, 'label' | '$depth'> & {
    endAction?: React.ReactNode;
    handleClick?: () => void;
    label: React.ReactNode;
    depth?: number;
  }
) => {
  const { label, endAction, handleClick, depth, ...rest } = props;

  return (
    <StyledLink {...rest} $depth={depth} onClick={handleClick}>
      <Box
        width={'100%'}
        paddingRight={3}
        paddingTop={{ initial: 1, large: 0 }}
        paddingBottom={{ initial: 1, large: 0 }}
        borderRadius={1}
      >
        <Flex justifyContent="space-between" width="100%" gap={{ initial: 2, large: 1 }}>
          <Flex gap={2} flex="1" minWidth="0" alignItems="center">
            <LinkBullet aria-hidden />
            <Typography
              tag="div"
              lineHeight="32px"
              overflow="hidden"
              style={{ textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, minWidth: 0 }}
            >
              {label}
            </Typography>
          </Flex>
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

type SectionMenuItem = {
  startIcon?: React.ReactNode;
  onSelect: () => void;
  label: string;
};

type SectionLink = {
  label: string;
  onClick?: () => void;
  menu?: SectionMenuItem[];
  /**
   * This suppresses the default behavior, where input focus returns to the "+" trigger when the popover closes.
   * This allows popover actions to change the focused element without it being immediately undone.
   */
  suppressFocusCaptureOnMenuClose?: boolean;
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
  link?: SectionLink;
  sectionId?: string;
  badgeLabel?: string;
}) => {
  const listId = useId();

  // Used to track the selection of an item within the popover menu (as opposed to a menu dismissal via escape, click outside, etc.)
  const popoverMenuItemClicked = useRef(false);

  const linkButton = useMemo(() => {
    if (!link) return;

    if (!link.menu) {
      return (
        <GuidedTourTooltip sectionId={sectionId}>
          <IconButton
            onClick={link.onClick}
            label={link.label}
            variant="ghost"
            withTooltip
            size="XS"
          >
            <Plus />
          </IconButton>
        </GuidedTourTooltip>
      );
    }

    const onCloseMenuAutoFocus = (event: Event): void => {
      // If the result of a popover menu close deliberately shifts focus, the default Radix behavior (immediately restore focus on the popover's trigger element when the popover closes) would compete.
      if (link.suppressFocusCaptureOnMenuClose && popoverMenuItemClicked.current) {
        event.preventDefault();
      }

      popoverMenuItemClicked.current = false;
    };

    return (
      <GuidedTourTooltip sectionId={sectionId}>
        <Menu.Root>
          <Menu.Trigger
            label={link.label}
            tag={IconButton}
            icon={<Plus />}
            variant="ghost"
            endIcon={null}
            size="XS"
          />
          <Menu.Content onCloseAutoFocus={onCloseMenuAutoFocus} zIndex={2}>
            {link.menu.map((item) => {
              const onSelectMenuItem = () => {
                popoverMenuItemClicked.current = true;
                item.onSelect();
              };

              return (
                <Menu.Item onSelect={onSelectMenuItem} startIcon={item.startIcon} key={item.label}>
                  {item.label}
                </Menu.Item>
              );
            })}
          </Menu.Content>
        </Menu.Root>
      </GuidedTourTooltip>
    );
  }, [link, sectionId]);

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
          <Flex gap={2} alignItems="center" minWidth={0}>
            <Typography variant="sigma" textColor="neutral600">
              {label}
            </Typography>
            {badgeLabel && (
              <Badge backgroundColor="neutral150" textColor="neutral600">
                {badgeLabel}
              </Badge>
            )}
          </Flex>
          <Flex gap={1}>{linkButton}</Flex>
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
  width: 100%;

  ${MainSubNav} {
    background-color: transparent;
    border-right: none;
  }

  ${({ theme }) => theme.breakpoints.medium} {
    overflow: hidden;

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
  Folder: SubNavFolder,
  PageWrapper,
};
