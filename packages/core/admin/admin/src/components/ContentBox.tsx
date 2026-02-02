import {
  Flex,
  FlexComponent,
  FlexProps,
  Typography,
  TypographyComponent,
} from '@strapi/design-system';
import { styled } from 'styled-components';

interface ContentBoxProps {
  title?: string;
  subtitle?: string;
  icon?: FlexProps['children'];
  iconBackground?: FlexProps['background'];
  endAction?: FlexProps['children'];
  titleEllipsis?: boolean;
}

const ContentBox = ({
  title,
  subtitle,
  icon,
  iconBackground,
  endAction,
  titleEllipsis = false,
}: ContentBoxProps) => {
  if (title && title.length > 70 && titleEllipsis) {
    title = `${title.substring(0, 70)}...`;
  }

  return (
    <Flex shadow="tableShadow" hasRadius padding={6} background="neutral0">
      <IconWrapper background={iconBackground} hasRadius padding={3}>
        {icon}
      </IconWrapper>
      <Flex direction="column" alignItems="stretch" gap={endAction ? 0 : 1}>
        <Flex>
          <TypographyWordBreak fontWeight="semiBold" variant="pi">
            {title}
          </TypographyWordBreak>
          {endAction}
        </Flex>
        <Typography textColor="neutral600">{subtitle}</Typography>
      </Flex>
    </Flex>
  );
};

const IconWrapper = styled<FlexComponent>(Flex)`
  margin-right: ${({ theme }) => theme.spaces[6]};

  svg {
    width: 3.2rem;
    height: 3.2rem;
  }
`;

const TypographyWordBreak = styled<TypographyComponent>(Typography)`
  color: ${({ theme }) => theme.colors.neutral800};
  word-break: break-all;
`;

export { ContentBox };
export type { ContentBoxProps };
