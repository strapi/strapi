import React from 'react';
import PropTypes from 'prop-types';
import styled from 'styled-components';
import {
  Card,
  CardAction,
  CardAsset,
  CardBadge,
  CardBody,
  CardCheckbox,
  CardContent,
  CardHeader,
  CardTitle,
  CardSubtitle,
} from '@strapi/design-system/Card';
import { IconButton } from '@strapi/design-system/IconButton';
import Pencil from '@strapi/icons/Pencil';
import Trash from '@strapi/icons/Trash';
import { useIntl } from 'react-intl';
import { Box } from '@strapi/design-system/Box';
import { AudioPreview } from './AudioPreview';
import { getTrad } from '../../utils';

const Extension = styled.span`
  text-transform: uppercase;
`;

const AudioPreviewWrapper = styled(Box)`
  canvas,
  audio {
    display: block;
    max-width: 100%;
    max-height: ${({ size }) => (size === 'M' ? 164 / 16 : 88 / 16)}rem;
  }
`;

export const AudioAssetCard = ({
  name,
  extension,
  url,
  selected,
  onSelect,
  onEdit,
  onRemove,
  size,
}) => {
  const { formatMessage } = useIntl();

  return (
    <Card height="100%">
      <CardHeader>
        <CardAsset size={size}>
          <AudioPreviewWrapper size={size}>
            <AudioPreview url={url} alt={name} />
          </AudioPreviewWrapper>
        </CardAsset>
        {onSelect && <CardCheckbox value={selected} onValueChange={onSelect} />}
        {(onRemove || onEdit) && (
          <CardAction position="end">
            {onRemove && (
              <IconButton
                label={formatMessage({
                  id: getTrad('control-card.remove-selection'),
                  defaultMessage: 'Remove from selection',
                })}
                icon={<Trash />}
                onClick={onRemove}
              />
            )}

            {onEdit && (
              <IconButton
                label={formatMessage({ id: getTrad('control-card.edit'), defaultMessage: 'Edit' })}
                icon={<Pencil />}
                onClick={onEdit}
              />
            )}
          </CardAction>
        )}
      </CardHeader>
      <CardBody>
        <CardContent>
          <Box paddingTop={1}>
            <CardTitle as="h2">{name}</CardTitle>
          </Box>
          <CardSubtitle>
            <Extension>{extension}</Extension>
          </CardSubtitle>
        </CardContent>
        <CardBadge>
          {formatMessage({ id: getTrad('settings.section.audio.label'), defaultMessage: 'Audio' })}
        </CardBadge>
      </CardBody>
    </Card>
  );
};

AudioAssetCard.defaultProps = {
  onSelect: undefined,
  onEdit: undefined,
  onRemove: undefined,
  selected: false,
  size: 'M',
};

AudioAssetCard.propTypes = {
  extension: PropTypes.string.isRequired,
  name: PropTypes.string.isRequired,
  onSelect: PropTypes.func,
  onEdit: PropTypes.func,
  onRemove: PropTypes.func,
  url: PropTypes.string.isRequired,
  selected: PropTypes.bool,
  size: PropTypes.oneOf(['S', 'M']),
};
