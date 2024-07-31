import { Grid, Flex, Typography, TypographyComponent } from '@strapi/design-system';
import { useIntl } from 'react-intl';
import { styled } from 'styled-components';

const TypographyBigNumber = styled<TypographyComponent>(Typography)`
  color: ${({ theme }) => theme.colors.neutral800};
  font-size: 80px;
`;

interface BigNumberProps {
  number: number | string;
  text: string;
  col?: number;
  s?: number;
}

export const BigNumber: React.FC<BigNumberProps> = ({ number, text, col, s }) => {
  const { formatMessage } = useIntl();

  return (
    <Grid.Item col={col || 3} s={s || 6}>
      <Flex
        justifyContent="center"
        shadow="tableShadow"
        hasRadius
        padding={6}
        background="neutral0"
        direction="column"
        gap={4}
        height="100%"
      >
        <TypographyBigNumber fontWeight="bold" variant="delta">
          {number || 0}
        </TypographyBigNumber>
        <Typography fontWeight="bold" variant="delta">
          {formatMessage(
            {
              id: 'app.components.HomePage.dashboard.chart.bigNumber.text',
              defaultMessage: 'Entries',
            },
            {
              text,
            }
          )}
        </Typography>
      </Flex>
    </Grid.Item>
  );
};
