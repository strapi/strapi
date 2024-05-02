import { Box, Flex, Typography, LinkButton } from '@strapi/design-system';
import { Plus } from '@strapi/icons';
import { EmptyDocuments } from '@strapi/icons/symbols';
import * as qs from 'qs';
import { useIntl } from 'react-intl';
import { Link } from 'react-router-dom';
import { styled } from 'styled-components';

import { getTrad } from '../../utils';

const EmptyCard = styled(Box)`
  background: ${({ theme }) =>
    `linear-gradient(180deg, rgba(234, 234, 239, 0) 0%, ${theme.colors.neutral150} 100%)`};
  opacity: 0.33;
`;

export const EmptyCardGrid = () => {
  return (
    <Flex wrap="wrap" gap={4}>
      {[...Array(4)].map((_, idx) => {
        return (
          <EmptyCard
            // eslint-disable-next-line react/no-array-index-key
            key={`empty-card-${idx}`}
            height="138px"
            width="375px"
            hasRadius
          />
        );
      })}
    </Flex>
  );
};

export const EmptyAttributes = () => {
  const { formatMessage } = useIntl();

  return (
    <Box position="relative">
      <EmptyCardGrid />
      <Box position="absolute" top={6} width="100%">
        <Flex alignItems="center" justifyContent="center" direction="column">
          <EmptyDocuments width="160px" height="88px" />
          <Box paddingTop={6} paddingBottom={4}>
            <Box textAlign="center">
              <Typography variant="delta" tag="p" textColor="neutral600">
                {formatMessage({
                  id: getTrad('modalForm.empty.heading'),
                  defaultMessage: 'Nothing in here yet.',
                })}
              </Typography>
              <Box paddingTop={4}>
                <Typography variant="delta" tag="p" textColor="neutral600">
                  {formatMessage({
                    id: getTrad('modalForm.empty.sub-heading'),
                    defaultMessage:
                      'Find what you are looking for through a wide range of extensions.',
                  })}
                </Typography>
              </Box>
            </Box>
          </Box>
          <LinkButton
            tag={Link}
            to={`/marketplace?${qs.stringify({ categories: ['Custom fields'] })}`}
            variant="secondary"
            startIcon={<Plus />}
          >
            {formatMessage({
              id: getTrad('modalForm.empty.button'),
              defaultMessage: 'Add custom fields',
            })}
          </LinkButton>
        </Flex>
      </Box>
    </Box>
  );
};
