import React, { useState } from 'react';
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
  CardTimer,
} from '@strapi/parts/Card';
import { IconButton } from '@strapi/parts/IconButton';
import EditIcon from '@strapi/icons/EditIcon';
import { useIntl } from 'react-intl';
import { VideoPreview } from './VideoPreview';
import { getTrad, formatDuration } from '../../utils';

const Extension = styled.span`
  text-transform: uppercase;
`;

export const VideoAssetCard = ({ name, extension, url, mime }) => {
  const { formatMessage } = useIntl();
  const [duration, setDuration] = useState();
  const formattedDuration = duration ? formatDuration(duration) : undefined;

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
        <CardAsset>
          <VideoPreview url={url} mime={mime} onLoadDuration={setDuration} />
        </CardAsset>
        <CardTimer>{formattedDuration || '...'}</CardTimer>
      </CardHeader>
      <CardBody>
        <CardContent>
          <CardTitle as="h2">{name}</CardTitle>
          <CardSubtitle>
            <Extension>{extension}</Extension>
          </CardSubtitle>
        </CardContent>
        <CardBadge>
          {formatMessage({ id: getTrad('settings.section.video.label'), defaultMessage: 'Doc' })}
        </CardBadge>
      </CardBody>
    </Card>
  );
};

VideoAssetCard.propTypes = {
  extension: PropTypes.string.isRequired,
  mime: PropTypes.string.isRequired,
  name: PropTypes.string.isRequired,
  url: PropTypes.string.isRequired,
};
