import { styled } from 'styled-components';

// Keep component-row for css specificity
export const Tr = styled.tr<{
  $isFromDynamicZone?: boolean;
  $isChildOfDynamicZone?: boolean;
}>`
  &.component-row,
  &.dynamiczone-row {
    position: relative;
    border-top: none !important;

    table tr:first-child {
      border-top: none;
    }

    > td:first-of-type {
      padding: 0 0 0 2rem;
      position: relative;

      &::before {
        content: '';
        width: 0.4rem;
        height: calc(100% - 40px);
        position: absolute;
        top: -7px;
        left: 2.6rem;
        border-radius: 4px;

        ${({ $isFromDynamicZone, $isChildOfDynamicZone, theme }) => {
          if ($isChildOfDynamicZone) {
            return `background-color: ${theme.colors.primary200};`;
          }

          if ($isFromDynamicZone) {
            return `background-color: ${theme.colors.primary200};`;
          }

          return `background: ${theme.colors.neutral150};`;
        }}
      }
    }
  }

  &.dynamiczone-row > td:first-of-type {
    padding: 0;
  }
`;
