import React from 'react';

import { Typography, VisuallyHidden } from '@strapi/design-system';
import { ChevronLeft, ChevronRight } from '@strapi/icons';
import PropTypes from 'prop-types';
import { styled } from 'styled-components';

import { usePagination } from './PaginationContext';

const PaginationText = styled(Typography)`
  line-height: revert;
`;

const LinkWrapper = styled.button`
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

LinkWrapper.defaultProps = { type: 'button' };

const PageLinkWrapper = styled(LinkWrapper)`
  color: ${({ theme, $active }) => ($active ? theme.colors.primary700 : theme.colors.neutral800)};
  background: ${({ theme, $active }) => ($active ? theme.colors.neutral0 : undefined)};

  &:hover {
    box-shadow: ${({ theme }) => theme.shadows.filterShadow};
  }
`;

const ActionLinkWrapper = styled(LinkWrapper)`
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
      <PageLinkWrapper {...props} $active={isActive}>
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
    <DotsWrapper {...props} tag="div">
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
