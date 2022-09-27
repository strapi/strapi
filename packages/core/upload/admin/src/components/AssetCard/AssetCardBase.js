import React from 'react';
import PropTypes from 'prop-types';
import styled from 'styled-components';
import { Box } from '@strapi/design-system/Box';
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
import { IconButton } from '@strapi/design-system/IconButton';
import Pencil from '@strapi/icons/Pencil';
import Trash from '@strapi/icons/Trash';
import { useIntl } from 'react-intl';

import { getTrad } from '../../utils';

const Extension = styled.span`
  text-transform: uppercase;
`;

const CardActionsContainer = styled(CardAction)``;

const CardContainer = styled(Card)`
  ${CardActionsContainer} {
    display: none;
  }

  &:hover {
    ${CardActionsContainer} {
      display: block;
    }
  }
`;

export const AssetCardBase = ({
  children,
  name,
  extension,
  selected,
  onSelect,
  onRemove,
  onEdit,
  subtitle,
  variant,
}) => {
  const { formatMessage } = useIntl();

  return (
    <CardContainer height="100%">
      <CardHeader>
        {onSelect && <CardCheckbox value={selected} onValueChange={onSelect} />}
        {(onRemove || onEdit) && (
          <CardActionsContainer position="end">
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
          </CardActionsContainer>
        )}
        {children}
      </CardHeader>
      <CardBody>
        <CardContent>
          <Box paddingTop={1}>
            <CardTitle as="h2">{name}</CardTitle>
          </Box>
          <CardSubtitle>
            <Extension>{extension}</Extension>
            {subtitle}
          </CardSubtitle>
        </CardContent>
        <CardBadge>
          {formatMessage({
            id: getTrad(`settings.section.${variant.toLowerCase()}.label`),
            defaultMessage: variant,
          })}
        </CardBadge>
      </CardBody>
    </CardContainer>
  );
};

AssetCardBase.defaultProps = {
  selected: false,
  onEdit: undefined,
  onSelect: undefined,
  onRemove: undefined,
  subtitle: '',
  variant: 'Image',
};

AssetCardBase.propTypes = {
  children: PropTypes.node.isRequired,
  extension: PropTypes.string.isRequired,
  name: PropTypes.string.isRequired,
  onEdit: PropTypes.func,
  onSelect: PropTypes.func,
  onRemove: PropTypes.func,
  selected: PropTypes.bool,
  subtitle: PropTypes.string,
  variant: PropTypes.oneOf(['Image', 'Video', 'Audio', 'Doc']),
};
