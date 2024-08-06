import { Badge, Box, Flex } from '@strapi/design-system';
import { styled } from 'styled-components';

export const RelativeBox = styled(Box)`
  position: relative;
`;

export const Wrapper = styled.div`
  position: relative;
  display: flex;
  justify-content: center;
  background: repeating-conic-gradient(
      ${({ theme }) => theme.colors.neutral100} 0% 25%,
      transparent 0% 50%
    )
    50% / 20px 20px;

  svg {
    font-size: 4.8rem;
    height: 26.4rem;
  }

  img,
  video {
    margin: 0;
    padding: 0;
    max-height: 26.4rem;
    max-width: 100%;
  }
`;

export const ActionRow = styled(Flex)`
  height: 5.2rem;
  background-color: ${({ $blurry }) => ($blurry ? `rgba(33, 33, 52, 0.4)` : undefined)};
`;

export const CroppingActionRow = styled(Flex)`
  z-index: 1;
  height: 5.2rem;
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
