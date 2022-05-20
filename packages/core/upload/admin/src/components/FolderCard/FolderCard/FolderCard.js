import React, { useState, useRef } from 'react';
import PropTypes from 'prop-types';
import styled from 'styled-components';

import { pxToRem } from '@strapi/helper-plugin';
import { Box } from '@strapi/design-system/Box';
import { CardAction } from '@strapi/design-system/Card';
import { Stack } from '@strapi/design-system/Stack';
import Folder from '@strapi/icons/Folder';

import { FolderCardContext } from '../contexts/FolderCard';
import useId from '../hooks/useId';

const FauxClickWrapper = styled.button`
  height: 100%;
  left: 0;
  position: absolute;
  opacity: 0;
  top: 0;
  width: 100%;

  &:hover,
  &:focus {
    text-decoration: none;
  }
`;

const StyledFolder = styled(Folder)`
  path {
    fill: currentColor;
  }
`;

export const FolderCard = ({
  children,
  id,
  startAction,
  cardActions,
  ariaLabel,
  onClick,
  ...props
}) => {
  const generatedId = useId(id);
  const cardRef = useRef();
  const [showCardAction, setShowCardAction] = useState(false);

  const handleBlur = event => {
    if (!cardRef.current.contains(event.relatedTarget)) {
      setShowCardAction(false);
    }
  };

  return (
    <FolderCardContext.Provider value={{ id: generatedId }}>
      <Box
        position="relative"
        onMouseEnter={() => setShowCardAction(true)}
        onMouseLeave={() => setShowCardAction(false)}
        onFocus={() => setShowCardAction(true)}
        onBlur={handleBlur}
        ref={cardRef}
        tabIndex={0}
        {...props}
      >
        <FauxClickWrapper
          type="button"
          onClick={onClick}
          zIndex={1}
          tabIndex={-1}
          aria-label={ariaLabel}
          aria-hidden
        />

        <Stack
          hasRadius
          background="neutral0"
          shadow="tableShadow"
          paddingBottom={3}
          paddingLeft={4}
          paddingRight={4}
          paddingTop={3}
          spacing={3}
          horizontal
          cursor="pointer"
        >
          {startAction}

          <Box
            hasRadius
            background="secondary100"
            color="secondary500"
            paddingBottom={2}
            paddingLeft={3}
            paddingRight={3}
            paddingTop={2}
          >
            <StyledFolder width={pxToRem(20)} height={pxToRem(18)} />
          </Box>

          {children}

          {cardActions && showCardAction && (
            <Box zIndex={3}>
              <CardAction right={4}>{cardActions}</CardAction>
            </Box>
          )}
        </Stack>
      </Box>
    </FolderCardContext.Provider>
  );
};

FolderCard.defaultProps = {
  id: undefined,
};

FolderCard.propTypes = {
  ariaLabel: PropTypes.string.isRequired,
  children: PropTypes.node.isRequired,
  id: PropTypes.string,
  onClick: PropTypes.func.isRequired,
  startAction: PropTypes.element.isRequired,
  cardActions: PropTypes.element.isRequired,
};
