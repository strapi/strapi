import React from 'react';
import PropTypes from 'prop-types';
import styled from 'styled-components';
import { Box } from '@strapi/design-system/Box';
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
import { getTrad } from '../../utils';

const Extension = styled.span`
  text-transform: uppercase;
`;

export const ImageAssetCard = ({
  name,
  extension,
  height,
  width,
  thumbnail,
  selected,
  onSelect,
  onEdit,
  onRemove,
  size,
  alt,
}) => {
  const { formatMessage } = useIntl();

  // Prevents the browser from caching the URL for all sizes and allow react-query to make a smooth update
  // instead of a full refresh
  const optimizedCachingThumbnail =
    width && height ? `${thumbnail}?width=${width}&height=${height}` : thumbnail;

  return (
    <Card height="100%">
      <CardHeader>
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
        <CardAsset src={optimizedCachingThumbnail} size={size} alt={alt} />
      </CardHeader>
      <CardBody>
        <CardContent>
          <Box paddingTop={1}>
            <CardTitle as="h2">{name}</CardTitle>
          </Box>
          <CardSubtitle>
            <Extension>{extension}</Extension>
            {height && width && ` - ${width}✕${height}`}
          </CardSubtitle>
        </CardContent>
        <CardBadge>
          {formatMessage({ id: getTrad('settings.section.image.label'), defaultMessage: 'Image' })}
        </CardBadge>
      </CardBody>
    </Card>
  );
};

ImageAssetCard.defaultProps = {
  height: undefined,
  width: undefined,
  selected: false,
  onEdit: undefined,
  onSelect: undefined,
  onRemove: undefined,
  size: 'M',
};

ImageAssetCard.propTypes = {
  alt: PropTypes.string.isRequired,
  extension: PropTypes.string.isRequired,
  height: PropTypes.number,
  name: PropTypes.string.isRequired,
  onEdit: PropTypes.func,
  onSelect: PropTypes.func,
  onRemove: PropTypes.func,
  width: PropTypes.number,
  thumbnail: PropTypes.string.isRequired,
  selected: PropTypes.bool,
  size: PropTypes.oneOf(['S', 'M']),
};
