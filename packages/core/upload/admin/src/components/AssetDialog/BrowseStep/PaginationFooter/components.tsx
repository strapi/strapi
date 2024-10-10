import { Typography, VisuallyHidden } from '@strapi/design-system';
import { ChevronLeft, ChevronRight } from '@strapi/icons';
import { styled, css } from 'styled-components';

import { usePagination } from './PaginationContext';

const PaginationText = styled(Typography)`
  line-height: revert;
`;

const linkWrapperStyles = css<{ $active?: boolean }>`
  padding: ${({ theme }) => theme.spaces[3]};
  border-radius: ${({ theme }) => theme.borderRadius};
  box-shadow: ${({ $active, theme }) => ($active ? theme.shadows.filterShadow : undefined)};
  text-decoration: none;
  display: flex;
  position: relative;
  outline: none;

  &:after {
    transition-property: all;
    transition-duration: 0.2s;
    border-radius: 8px;
    content: '';
    position: absolute;
    top: -4px;
    bottom: -4px;
    left: -4px;
    right: -4px;
    border: 2px solid transparent;
  }

  &:focus-visible {
    outline: none;

    &:after {
      border-radius: 8px;
      content: '';
      position: absolute;
      top: -5px;
      bottom: -5px;
      left: -5px;
      right: -5px;
      border: 2px solid ${(props) => props.theme.colors.primary600};
    }
  }
`;

const LinkWrapperButton = styled.button<{ $active?: boolean }>`
  ${linkWrapperStyles}
`;

const LinkWrapperDiv = styled.div<{ $active?: boolean }>`
  ${linkWrapperStyles}
`;

LinkWrapperButton.defaultProps = { type: 'button' };

const PageLinkWrapper = styled(LinkWrapperButton)`
  color: ${({ theme, $active }) => ($active ? theme.colors.primary700 : theme.colors.neutral800)};
  background: ${({ theme, $active }) => ($active ? theme.colors.neutral0 : undefined)};

  &:hover {
    box-shadow: ${({ theme }) => theme.shadows.filterShadow};
  }
`;

const ActionLinkWrapper = styled(LinkWrapperButton)`
  font-size: 1.1rem;
  svg path {
    fill: ${(p) => (p['aria-disabled'] ? p.theme.colors.neutral300 : p.theme.colors.neutral600)};
  }

  &:focus,
  &:hover {
    svg path {
      fill: ${(p) => (p['aria-disabled'] ? p.theme.colors.neutral300 : p.theme.colors.neutral700)};
    }
  }

  ${(p) =>
    p['aria-disabled']
      ? `
  pointer-events: none;
    `
      : undefined}
`;

const DotsWrapper = styled(LinkWrapperDiv)`
  color: ${({ theme }) => theme.colors.neutral800};
`;

interface PaginationLinkProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
}

interface PageLinkProps extends PaginationLinkProps {
  number: number;
}

export const PreviousLink = ({ children, ...props }: PaginationLinkProps) => {
  const { activePage } = usePagination();

  const disabled = activePage === 1;

  return (
    <li>
      <ActionLinkWrapper aria-disabled={disabled} tabIndex={disabled ? -1 : undefined} {...props}>
        <VisuallyHidden>{children}</VisuallyHidden>
        <ChevronLeft aria-hidden />
      </ActionLinkWrapper>
    </li>
  );
};

export const NextLink = ({ children, ...props }: PaginationLinkProps) => {
  const { activePage, pageCount } = usePagination();

  const disabled = activePage === pageCount;

  return (
    <li>
      <ActionLinkWrapper aria-disabled={disabled} tabIndex={disabled ? -1 : undefined} {...props}>
        <VisuallyHidden>{children}</VisuallyHidden>
        <ChevronRight aria-hidden />
      </ActionLinkWrapper>
    </li>
  );
};

export const PageLink = ({ number, children, ...props }: PageLinkProps) => {
  const { activePage } = usePagination();

  const isActive = activePage === number;

  return (
    <li>
      <PageLinkWrapper {...props} $active={isActive}>
        <VisuallyHidden>{children}</VisuallyHidden>
        <PaginationText aria-hidden variant="pi" fontWeight={isActive ? 'bold' : ''}>
          {number}
        </PaginationText>
      </PageLinkWrapper>
    </li>
  );
};

interface DotsProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export const Dots = ({ children, ...props }: DotsProps) => (
  <li>
    <DotsWrapper {...props} as="div">
      <VisuallyHidden>{children}</VisuallyHidden>
      <PaginationText aria-hidden small>
        …
      </PaginationText>
    </DotsWrapper>
  </li>
);
