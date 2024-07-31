import {
  Grid,
  Flex,
  TypographyComponent,
  Typography,
  FlexComponent,
  Box,
} from '@strapi/design-system';
import { Key, List, Images, Stack, SquaresFour, Earth, User, Typhoon } from '@strapi/icons';
import { useIntl } from 'react-intl';
import { styled } from 'styled-components';

import type { KeyNumbers as KeyNumbersType } from '../../../../server/src/services/statistics';

const IconWrapper = styled<FlexComponent>(Flex)`
  margin-right: ${({ theme }) => theme.spaces[6]};

  svg {
    width: 2.6rem;
    height: 2.6rem;
  }
`;

const TypographyWordBreak = styled<TypographyComponent>(Typography)`
  color: ${({ theme }) => theme.colors.neutral800};
  word-break: break-all;
`;

const ListIcon = styled(List)`
  background-color: ${({ theme }) => theme.colors.primary600};
  border-radius: 4px;
  padding: 0.3rem;
`;

const ImagesIcon = styled(Images)`
  background-color: ${({ theme }) => theme.colors.warning600};
  border-radius: 4px;
  padding: 0.3rem;
`;

const StackIcon = styled(Stack)`
  background-color: ${({ theme }) => theme.colors.secondary500};
  border-radius: 4px;
  padding: 0.3rem;
`;

const SquaresFourIcon = styled(SquaresFour)`
  background-color: ${({ theme }) => theme.colors.alternative600};
  border-radius: 4px;
  padding: 0.3rem;
`;

const EarthIcon = styled(Earth)`
  background-color: ${({ theme }) => theme.colors.success500};
  border-radius: 4px;
  padding: 0.3rem;
`;

const UserIcon = styled(User)`
  background-color: ${({ theme }) => theme.colors.danger600};
  border-radius: 4px;
  padding: 0.3rem;
`;

const SparkleIcon = styled(Typhoon)`
  background-color: ${({ theme }) => theme.colors.alternative500};
  border-radius: 4px;
  padding: 0.3rem;
`;

const KeyIcon = styled(Key)`
  background-color: ${({ theme }) => theme.colors.neutral1000};
  border-radius: 4px;
  padding: 0.3rem;
`;

export const KeyNumbers = ({ data }: { data: KeyNumbersType | undefined }) => {
  const { formatNumber, formatMessage } = useIntl();

  const getStatistics = (data: KeyNumbersType | undefined) => {
    return [
      {
        label: 'Entries',
        value: data?.entries || 0,
        icon: <ListIcon fill="neutral0" />,
        iconBackground: 'primary100',
      },
      {
        label: 'Assets',
        value: data?.assets || 0,
        icon: <ImagesIcon fill="neutral0" />,
        iconBackground: 'warning100',
      },
      {
        label: 'Content types',
        value: data?.contentTypes || 0,
        icon: <StackIcon fill="neutral0" />,
        iconBackground: 'secondary100',
      },
      {
        label: 'Components',
        value: data?.components || 0,
        icon: <SquaresFourIcon fill="neutral0" />,
        iconBackground: 'alternative100',
      },
      {
        label: 'Locales',
        value: data?.locales || 0,
        icon: <EarthIcon fill="neutral0" />,
        iconBackground: 'success100',
      },
      {
        label: 'Admins',
        value: data?.admin_users || 0,
        icon: <UserIcon fill="neutral0" />,
        iconBackground: 'danger100',
      },
      {
        label: 'Webhooks',
        value: data?.webhooks || 0,
        icon: <SparkleIcon fill="neutral0" />,
        iconBackground: 'alternative100',
      },
      {
        label: 'API tokens',
        value: data?.apiTokens || 0,
        icon: <KeyIcon fill="neutral0" />,
        iconBackground: 'neutral150',
      },
    ];
  };

  const keyNumbers = getStatistics(data);
  return (
    <Box paddingBottom={10}>
      <Typography color="neutral0" fontSize={3} fontWeight="bold">
        {formatMessage({
          id: 'app.components.HomePage.statistics.sectionTitle',
          defaultMessage: 'Project statistics',
        })}
      </Typography>
      <Grid.Root gap={6} marginTop={4}>
        {keyNumbers.map((keyNumber) => {
          return (
            <Grid.Item key={keyNumber.label} col={3} s={6}>
              <Flex shadow="tableShadow" hasRadius padding={5} background="neutral0">
                <IconWrapper background={keyNumber.iconBackground} hasRadius padding={2}>
                  {keyNumber.icon}
                </IconWrapper>
                <Flex direction="column" alignItems="stretch" gap={1}>
                  <TypographyWordBreak fontWeight="bold" variant="delta">
                    {keyNumber.label}
                  </TypographyWordBreak>
                  <Typography textColor="neutral600">{formatNumber(keyNumber.value)}</Typography>
                </Flex>
              </Flex>
            </Grid.Item>
          );
        })}
      </Grid.Root>
    </Box>
  );
};
