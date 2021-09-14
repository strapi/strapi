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
} from '@strapi/parts/Card';
import { IconButton } from '@strapi/parts/IconButton';
import EditIcon from '@strapi/icons/EditIcon';
import { useIntl } from 'react-intl';
import { getTrad } from '../../../utils';

const Extension = styled.span`
  text-transform: uppercase;
`;

export const ImageAssetCard = ({ name, extension, height, width, thumbnail }) => {
  const { formatMessage } = useIntl();

  return (
    <Card>
      <CardHeader>
        <CardCheckbox value />
        <CardAction position="end">
          <IconButton
            label={formatMessage({ id: getTrad('control-card.edit'), defaultMessage: 'Edit' })}
            icon={<EditIcon />}
          />
        </CardAction>
        <CardAsset src={`http://localhost:1337${thumbnail}`} />
      </CardHeader>
      <CardBody>
        <CardContent>
          <CardTitle as="h2">{name}</CardTitle>
          <CardSubtitle>
            <Extension>{extension.replace('.', '')}</Extension> - {height}✕{width}
          </CardSubtitle>
        </CardContent>
        <CardBadge>
          {formatMessage({ id: getTrad('settings.section.image.label'), defaultMessage: 'Image' })}
        </CardBadge>
      </CardBody>
    </Card>
  );
};

ImageAssetCard.propTypes = {
  extension: PropTypes.string.isRequired,
  height: PropTypes.number.isRequired,
  name: PropTypes.string.isRequired,
  width: PropTypes.number.isRequired,
  thumbnail: PropTypes.string.isRequired,
};
