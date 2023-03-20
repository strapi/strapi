import React from 'react';
import styled from 'styled-components';
import PropTypes from 'prop-types';
import { ChevronLeft, ChevronRight } from '@strapi/icons';
import { Typography, buttonFocusStyle, VisuallyHidden } from '@strapi/design-system';
import { usePagination } from './PaginationContext';

const PaginationText = styled(Typography)`
  line-height: revert;
`;

const LinkWrapper = styled.button`
  padding: ${({ theme }) => theme.spaces[3]};
  border-radius: ${({ theme }) => theme.borderRadius};
  box-shadow: ${({ active, theme }) => (active ? theme.shadows.filterShadow : undefined)};
  text-decoration: none;
  display: flex;

  ${buttonFocusStyle}
`;

LinkWrapper.defaultProps = { type: 'button' };

const PageLinkWrapper = styled(LinkWrapper)`
  color: ${({ theme, active }) => (active ? theme.colors.primary700 : theme.colors.neutral800)};
  background: ${({ theme, active }) => (active ? theme.colors.neutral0 : undefined)};

  &:hover {
    box-shadow: ${({ theme }) => theme.shadows.filterShadow};
  }
`;

const ActionLinkWrapper = styled(LinkWrapper)`
  font-size: 0.7rem;
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

const DotsWrapper = styled(LinkWrapper)`
  color: ${({ theme }) => theme.colors.neutral800};
`;

export const PreviousLink = ({ children, ...props }) => {
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

export const NextLink = ({ children, ...props }) => {
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

export const PageLink = ({ number, children, ...props }) => {
  const { activePage } = usePagination();

  const isActive = activePage === number;

  return (
    <li>
      <PageLinkWrapper {...props} active={isActive}>
        <VisuallyHidden>{children}</VisuallyHidden>
        <PaginationText aria-hidden variant="pi" fontWeight={isActive ? 'bold' : ''}>
          {number}
        </PaginationText>
      </PageLinkWrapper>
    </li>
  );
};

export const Dots = ({ children, ...props }) => (
  <li>
    <DotsWrapper {...props} as="div">
      <VisuallyHidden>{children}</VisuallyHidden>
      <PaginationText aria-hidden small>
        …
      </PaginationText>
    </DotsWrapper>
  </li>
);

PageLink.propTypes = {
  children: PropTypes.node.isRequired,
  number: PropTypes.number.isRequired,
};

const sharedPropTypes = {
  children: PropTypes.node.isRequired,
};

NextLink.propTypes = sharedPropTypes;
PreviousLink.propTypes = sharedPropTypes;

Dots.propTypes = {
  children: PropTypes.node.isRequired,
};
