import styled from 'styled-components';
import { Box } from '@strapi/design-system';
/* eslint-disable */
/* stylelint-disable */
const EditorWrapper = styled.div`
  cursor: ${({ disabled }) => (disabled ? 'not-allowed !important' : 'auto')};
  /* BASICS */

  .colored {
    background-color: yellow;
    color: black !important;
  }

  > div {
    border-radius: 3px;
    > div:last-of-type {
      min-height: 253px;
      max-height: 506px;
    }
  }

  .CodeMirror {
    /* Set height, width, borders, and global font properties here */
    font-size: ${14 / 16}rem;
    direction: ltr;
    z-index: 0;
  }
`;

const StyledBox = styled(Box)`
  border-radius: ${({ theme }) => theme.borderRadius};
  border: 1px solid ${({ theme, error }) => (error ? theme.colors.danger600 : 'transparent')};
`;

export { EditorWrapper, StyledBox };
