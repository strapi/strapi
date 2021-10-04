import styled from 'styled-components';
import { Box } from '@strapi/parts/Box';
import { Row } from '@strapi/parts/Row';
import { Badge } from '@strapi/parts/Badge';

export const RelativeBox = styled(Box)`
  position: relative;
`;

export const Wrapper = styled.div`
  position: relative;

  img {
    margin: 0;
    padding: 0;
    max-height: 100%;
    max-width: 100%;
  }
`;

export const ActionRow = styled(Row)`
  height: ${52 / 16}rem;
  background-color: ${({ blurry }) => (blurry ? `rgba(33, 33, 52, 0.4)` : undefined)};
`;

export const CroppingActionRow = styled(Row)`
  z-index: 1;
  height: ${52 / 16}rem;
  position: absolute;
  background-color: rgba(33, 33, 52, 0.4);
  width: 100%;
`;

// TODO: fix in parts, this shouldn't happen
export const BadgeOverride = styled(Badge)`
  span {
    color: inherit;
    font-weight: ${({ theme }) => theme.fontWeights.regular};
  }
`;

export const UploadProgressWrapper = styled.div`
  position: absolute;
  z-index: 2;
  height: 100%;
  width: 100%;
`;
