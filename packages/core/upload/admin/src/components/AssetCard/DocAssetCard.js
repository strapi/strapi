import React from 'react';
import PropTypes from 'prop-types';
import styled from 'styled-components';
import {
  Card,
  CardAction,
  CardBadge,
  CardBody,
  CardCheckbox,
  CardContent,
  CardHeader,
  CardTitle,
  CardSubtitle,
} from '@strapi/design-system/Card';
import { Flex } from '@strapi/design-system/Flex';
import { IconButton } from '@strapi/design-system/IconButton';
import Pencil from '@strapi/icons/Pencil';
import FileIcon from '@strapi/icons/File';
import FilePdfIcon from '@strapi/icons/FilePdf';
import { pxToRem } from '@strapi/helper-plugin';
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

const CardAsset = styled(Flex)`
  border-radius: ${({ theme }) => theme.borderRadius} ${({ theme }) => theme.borderRadius} 0 0;
  background: linear-gradient(180deg, #ffffff 0%, #f6f6f9 121.48%);
`;

export const DocAssetCard = ({ name, extension, selected, onSelect, onEdit, size }) => {
  const { formatMessage } = useIntl();

  return (
    <Card>
      <CardHeader>
        {onSelect && <CardCheckbox value={selected} onValueChange={onSelect} />}
        {onEdit && (
          <CardAction position="end">
            <IconButton
              label={formatMessage({ id: getTrad('control-card.edit'), defaultMessage: 'Edit' })}
              icon={<Pencil />}
              onClick={onEdit}
            />
          </CardAction>
        )}
        <CardAsset
          width="100%"
          height={size === 'S' ? pxToRem(88) : pxToRem(164)}
          justifyContent="center"
        >
          <IconWrapper>
            {extension === 'pdf' ? (
              <FilePdfIcon aria-label={name} />
            ) : (
              <FileIcon aria-label={name} />
            )}
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

DocAssetCard.defaultProps = {
  selected: false,
  onEdit: undefined,
  onSelect: undefined,
  size: 'M',
};

DocAssetCard.propTypes = {
  extension: PropTypes.string.isRequired,
  name: PropTypes.string.isRequired,
  onEdit: PropTypes.func,
  onSelect: PropTypes.func,
  selected: PropTypes.bool,
  size: PropTypes.oneOf(['S', 'M']),
};
