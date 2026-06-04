import { styled } from 'styled-components';

/**
 * Shared row styling for the Media Library sidebar — used for the Home entry
 * and for each folder node. Matches `SubNav.Link` from the design system so
 * the rail feels consistent with the rest of Strapi's left-rail navigations.
 */
export const RowButton = styled.button<{ $isActive: boolean }>`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spaces[2]};
  width: 100%;
  min-height: 3.2rem;
  padding: ${({ theme }) => `${theme.spaces[1]} ${theme.spaces[2]}`};
  border: 0;
  background: ${({ $isActive, theme }) => ($isActive ? theme.colors.primary100 : 'transparent')};
  color: ${({ $isActive, theme }) =>
    $isActive ? theme.colors.primary700 : theme.colors.neutral800};
  border-radius: ${({ theme }) => theme.borderRadius};
  cursor: pointer;
  text-align: left;
  font: inherit;

  &:hover {
    background: ${({ $isActive, theme }) =>
      $isActive ? theme.colors.primary100 : theme.colors.neutral100};
  }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.primary600};
    outline-offset: -2px;
  }
`;
