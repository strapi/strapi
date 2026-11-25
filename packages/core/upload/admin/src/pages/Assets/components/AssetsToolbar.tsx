import { Box, Flex } from '@strapi/design-system';
import { styled } from 'styled-components';

export const AssetsToolbar = styled(Flex)`
  flex-wrap: wrap;
  align-items: center;
  gap: ${({ theme }) => theme.spaces[3]};
`;

// While searching, the basis reserves room for the scope controls, so the view
// group moves to its own row at once instead of wrapping piece by piece. The
// grow factor keeps the view group packed when it shares the row.
export const SearchGroup = styled(Flex)<{ $isSearching: boolean }>`
  flex: 9999 1 ${({ $isSearching }) => ($isSearching ? '60rem' : 'auto')};
  flex-wrap: wrap;
  align-items: center;
  gap: ${({ theme }) => theme.spaces[3]};
`;

export const ViewGroup = styled(Flex)`
  flex: 1 0 auto;
  justify-content: space-between;
  align-items: center;
  gap: ${({ theme }) => theme.spaces[3]};
`;

export const SearchSlot = styled(Box)`
  flex: 1;
  min-width: 20rem;

  ${({ theme }) => theme.breakpoints.large} {
    flex: 0 1 auto;
  }
`;

export const SearchScopeSlot = styled(Box)`
  flex-basis: 100%;

  ${({ theme }) => theme.breakpoints.medium} {
    flex: 0 0 auto;
  }
`;
