import React, { memo, useMemo } from 'react';
import PropTypes from 'prop-types';
import isEqual from 'react-fast-compare';
import styled from 'styled-components';
import { useIntl } from 'react-intl';
import { Accordion, AccordionToggle, AccordionContent } from '@strapi/parts/Accordion';
import { IconButton } from '@strapi/parts/IconButton';
import { FocusTrap } from '@strapi/parts/FocusTrap';
import { Box } from '@strapi/parts/Box';
import { Stack } from '@strapi/parts/Stack';
import DeleteIcon from '@strapi/icons/DeleteIcon';
import DownIcon from '@strapi/icons/DownIcon1';
import UpIcon from '@strapi/icons/UpIcon1';
// import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useContentTypeLayout } from '../../../../hooks';
import { getTrad } from '../../../../utils';
import FieldComponent from '../../../FieldComponent';
import Rectangle from './Rectangle';

// FIXME
// Temporary workaround to remove the overflow until we migrate the react-select for the relations
// to the DS one
const StyledBox = styled(Box)`
  > div {
    overflow: visible;
  }
`;

const Component = ({
  componentUid,
  index,
  isOpen,
  isFieldAllowed,
  moveComponentDown,
  moveComponentUp,
  name,
  onToggle,
  removeComponentFromDynamicZone,
  showDownIcon,
  showUpIcon,
}) => {
  const { formatMessage } = useIntl();
  const { getComponentLayout } = useContentTypeLayout();
  const { icon, friendlyName } = useMemo(() => {
    const {
      info: { icon, name },
    } = getComponentLayout(componentUid);

    return { friendlyName: name, icon };
  }, [componentUid, getComponentLayout]);

  const handleMoveComponentDown = () => moveComponentDown(name, index);

  const handleMoveComponentUp = () => moveComponentUp(name, index);

  const handleRemove = () => removeComponentFromDynamicZone(name, index);

  const downLabel = formatMessage({
    id: getTrad('components.DynamicZone.move-down-label'),
    defaultMessage: 'Move component down',
  });
  const upLabel = formatMessage({
    id: getTrad('components.DynamicZone.move-up-label'),
    defaultMessage: 'Move component down',
  });
  const deleteLabel = formatMessage(
    {
      id: getTrad('components.DynamicZone.delete-label'),
      defaultMessage: 'Delete {name}',
    },
    { name: friendlyName }
  );

  return (
    <StyledBox>
      <Rectangle />

      <Accordion expanded={isOpen} toggle={() => onToggle(index)}>
        <AccordionToggle
          action={
            <Stack horizontal size={2}>
              {showDownIcon && (
                <IconButton
                  label={downLabel}
                  onClick={handleMoveComponentDown}
                  icon={<DownIcon />}
                />
              )}
              {showUpIcon && (
                <IconButton label={upLabel} onClick={handleMoveComponentUp} icon={<UpIcon />} />
              )}
              {isFieldAllowed && (
                <IconButton label={deleteLabel} onClick={handleRemove} icon={<DeleteIcon />} />
              )}
            </Stack>
          }
          title={friendlyName}
          togglePosition="left"
        />
        <AccordionContent>
          <FocusTrap onEscape={() => onToggle(index)}>
            <FieldComponent
              componentUid={componentUid}
              icon={icon}
              name={`${name}.${index}`}
              isFromDynamicZone
            />
          </FocusTrap>
        </AccordionContent>
      </Accordion>
    </StyledBox>
  );
};

Component.propTypes = {
  componentUid: PropTypes.string.isRequired,
  index: PropTypes.number.isRequired,
  isFieldAllowed: PropTypes.bool.isRequired,
  isOpen: PropTypes.bool.isRequired,
  moveComponentDown: PropTypes.func.isRequired,
  moveComponentUp: PropTypes.func.isRequired,
  name: PropTypes.string.isRequired,
  onToggle: PropTypes.func.isRequired,
  removeComponentFromDynamicZone: PropTypes.func.isRequired,
  showDownIcon: PropTypes.bool.isRequired,
  showUpIcon: PropTypes.bool.isRequired,
};

export default memo(Component, isEqual);
