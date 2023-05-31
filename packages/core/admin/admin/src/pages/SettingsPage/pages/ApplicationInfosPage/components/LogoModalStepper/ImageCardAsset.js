import React from 'react';
import { useIntl } from 'react-intl';
import PropTypes from 'prop-types';
import {
  Card,
  CardAsset,
  CardBadge,
  CardBody,
  CardContent,
  CardHeader,
  CardTitle,
  CardSubtitle,
} from '@strapi/design-system';

const ImageCardAsset = ({ asset }) => {
  const { formatMessage } = useIntl();

  return (
    <Card>
      <CardHeader>
        <CardAsset size="S" src={asset.url} />
      </CardHeader>
      <CardBody>
        <CardContent>
          <CardTitle>{asset.name}</CardTitle>
          <CardSubtitle>
            {`${asset.ext.toUpperCase()} - ${asset.width}✕${asset.height}`}
          </CardSubtitle>
        </CardContent>
        <CardBadge>
          {formatMessage({
            id: 'Settings.application.customization.modal.pending.card-badge',
            defaultMessage: 'image',
          })}
        </CardBadge>
      </CardBody>
    </Card>
  );
};

ImageCardAsset.propTypes = {
  asset: PropTypes.shape({
    name: PropTypes.string,
    url: PropTypes.string,
    width: PropTypes.number,
    height: PropTypes.number,
    ext: PropTypes.string,
  }).isRequired,
};

export default ImageCardAsset;
