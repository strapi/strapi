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
import IconDocumentation from '@strapi/icons/IconDocumentation';
import { useIntl } from 'react-intl';
import { getTrad } from '../../utils';

const Extension = styled.span`
  text-transform: uppercase;
`;

const IconWrapper = styled.span`
  svg {
    font-size: 3rem;
  }
`;

export const DocAssetCard = ({ name, extension }) => {
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
        <CardAsset>
          <IconWrapper>
            <IconDocumentation aria-label={name} />
          </IconWrapper>
        </CardAsset>
      </CardHeader>
      <CardBody>
        <CardContent>
          <CardTitle as="h2">{name}</CardTitle>
          <CardSubtitle>
            <Extension>{extension}</Extension>
          </CardSubtitle>
        </CardContent>
        <CardBadge>
          {formatMessage({ id: getTrad('settings.section.doc.label'), defaultMessage: 'Doc' })}
        </CardBadge>
      </CardBody>
    </Card>
  );
};

DocAssetCard.propTypes = {
  extension: PropTypes.string.isRequired,
  name: PropTypes.string.isRequired,
};
