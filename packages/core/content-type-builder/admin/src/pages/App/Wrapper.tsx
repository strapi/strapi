// @ts-expect-error check were sizes should be imported from and defined
import { sizes } from '@strapi/helper-plugin';
import styled from 'styled-components';

export const Wrapper = styled.div`
  min-height: calc(100vh - ${sizes.header.height});
  .centered {
    position: fixed;
    top: calc(50% - 13px);
    right: calc(50% - 13px);
  }
`;
