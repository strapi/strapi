import React from 'react';
import PropTypes from 'prop-types';
import { useIntl } from 'react-intl';
import styled from 'styled-components';
import { Box } from '@strapi/parts/Box';
import { Row } from '@strapi/parts/Row';
import { Stack } from '@strapi/parts/Stack';
import { IconButton } from '@strapi/parts/IconButton';
import DeleteIcon from '@strapi/icons/DeleteIcon';
import DownloadIcon from '@strapi/icons/DownloadIcon';
import Resize from '@strapi/icons/Resize';
import LinkIcon from '@strapi/icons/LinkIcon';
import getTrad from '../../utils/getTrad';

const Wrapper = styled.div`
  img {
    margin: 0;
    padding: 0;
    max-height: 100%;
    max-width: 100%;
  }
`;

const ActionRow = styled(Row)`
  height: ${52 / 16}rem;
`;

export const PreviewBox = ({ children }) => {
  const { formatMessage } = useIntl();

  return (
    <Box hasRadius background="neutral150" borderColor="neutral200">
      <ActionRow paddingLeft={3} paddingRight={3} justifyContent="flex-end">
        <Stack size={1} horizontal>
          <IconButton
            label={formatMessage({ id: getTrad('control-card.delete'), defaultMessage: 'Delete' })}
            icon={<DeleteIcon />}
          />
          <IconButton
            label={formatMessage({
              id: getTrad('control-card.download'),
              defaultMessage: 'Download',
            })}
            icon={<DownloadIcon />}
          />
          <IconButton
            label={formatMessage({
              id: getTrad('control-card.copy-link'),
              defaultMessage: 'Copy link',
            })}
            icon={<LinkIcon />}
          />
          <IconButton
            label={formatMessage({ id: getTrad('control-card.crop'), defaultMessage: 'Crop' })}
            icon={<Resize />}
          />
        </Stack>
      </ActionRow>
      <Wrapper>{children}</Wrapper>
      <ActionRow paddingLeft={3} paddingRight={3} />
    </Box>
  );
};

PreviewBox.propTypes = {
  children: PropTypes.node.isRequired,
};
