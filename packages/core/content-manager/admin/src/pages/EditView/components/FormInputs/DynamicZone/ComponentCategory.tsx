import * as React from 'react';

import {
  Accordion,
  Box,
  Flex,
  FlexComponent,
  Popover,
  Tooltip,
  Typography,
} from '@strapi/design-system';
import { Duplicate } from '@strapi/icons';
import upperFirst from 'lodash/upperFirst';
import { useIntl } from 'react-intl';
import { css, styled } from 'styled-components';

import { ComponentIcon } from '../../../../../components/ComponentIcon';
import { resolvePreviewImageUrl } from '../../../../../utils/previewImage';
import { getTranslation } from '../../../../../utils/translations';

import type { Struct } from '@strapi/types';

interface ComponentCategoryProps {
  category: string;
  components?: Array<{
    uid: string;
    displayName: string;
    icon?: string;
    preview?: Struct.PreviewImageValue;
  }>;
  onAddComponent: (
    componentUid: string
  ) => React.MouseEventHandler<HTMLButtonElement> & React.MouseEventHandler<HTMLDivElement>;
  onCopyComponent?: (componentUid: string) => React.MouseEventHandler<HTMLButtonElement>;
  variant?: Accordion.Variant;
}

interface ComponentPreviewImageProps {
  src: string;
  alt: string;
  onError?: React.ReactEventHandler<HTMLImageElement>;
}

/**
 * Renders a small preview thumbnail inside the component picker tile and, on hover,
 * a larger portaled preview so authors can read the component at a glance without picking it.
 * Uses a controlled Popover anchored to the thumbnail — the content is portaled, so it escapes
 * the accordion's overflow clipping.
 */
const ComponentPreviewImage = ({ src, alt, onError }: ComponentPreviewImageProps) => {
  const [open, setOpen] = React.useState(false);

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Anchor>
        <Box
          tag="img"
          src={src}
          alt={alt}
          loading="lazy"
          width="100%"
          height="5.2rem"
          hasRadius
          style={{ objectFit: 'cover' }}
          onMouseEnter={() => setOpen(true)}
          onMouseLeave={() => setOpen(false)}
          onError={onError}
        />
      </Popover.Anchor>
      <Popover.Content
        side="top"
        sideOffset={4}
        onOpenAutoFocus={(e) => e.preventDefault()}
        style={{ pointerEvents: 'none' }}
      >
        <Box padding={2}>
          <Box
            tag="img"
            src={src}
            alt={alt}
            hasRadius
            style={{
              display: 'block',
              maxWidth: 'min(60rem, 90vw)',
              maxHeight: 'min(45rem, 80vh)',
              objectFit: 'contain',
            }}
          />
        </Box>
      </Popover.Content>
    </Popover.Root>
  );
};

interface ComponentTileVisualProps {
  previewUrl?: string;
  icon?: string;
  displayName: string;
}

/**
 * Holds per-tile load-error state: when the preview image fails to load (missing file,
 * unreachable CDN…), the tile falls back to the component icon instead of a broken image.
 */
const ComponentTileVisual = ({ previewUrl, icon, displayName }: ComponentTileVisualProps) => {
  const [hasLoadError, setHasLoadError] = React.useState(false);

  if (!previewUrl || hasLoadError) {
    return <ComponentIcon color="currentColor" background="primary200" icon={icon} />;
  }

  return (
    <ComponentPreviewImage
      src={previewUrl}
      alt={displayName}
      onError={() => setHasLoadError(true)}
    />
  );
};

const ComponentCategory = ({
  category,
  components = [],
  variant = 'primary',
  onAddComponent,
  onCopyComponent,
}: ComponentCategoryProps) => {
  const { formatMessage } = useIntl();

  return (
    <Accordion.Item value={category}>
      <Accordion.Header variant={variant}>
        <Accordion.Trigger>
          {formatMessage({ id: category, defaultMessage: upperFirst(category) })}
        </Accordion.Trigger>
      </Accordion.Header>
      <ResponsiveAccordionContent>
        <Grid paddingTop={4} paddingBottom={4} paddingLeft={3} paddingRight={3}>
          {components.map(({ uid, displayName, icon, preview }) => {
            const previewUrl = resolvePreviewImageUrl(preview);

            return (
              <ComponentBox
                key={uid}
                background="neutral100"
                justifyContent="center"
                hasRadius
                shrink={0}
                borderColor="neutral200"
                direction="column"
                alignItems="stretch"
              >
                <ComponentAddButton type="button" onClick={onAddComponent(uid)}>
                  <Flex
                    direction="column"
                    gap={1}
                    alignItems="center"
                    justifyContent="center"
                    width="100%"
                    paddingLeft={2}
                    paddingRight={2}
                  >
                    <ComponentTileVisual
                      previewUrl={previewUrl}
                      icon={icon}
                      displayName={displayName}
                    />

                    <Tooltip label={formatMessage({ id: uid, defaultMessage: displayName ?? uid })}>
                      <Typography variant="pi" fontWeight="bold" ellipsis width="100%">
                        {formatMessage({ id: uid, defaultMessage: displayName ?? uid })}
                      </Typography>
                    </Tooltip>
                  </Flex>
                </ComponentAddButton>
                {onCopyComponent && (
                  <Tooltip
                    label={formatMessage({
                      id: getTranslation('components.copy-from-existing'),
                      defaultMessage: 'Copy from existing',
                    })}
                    // below the tile, so the name of the component stays visible
                    side="bottom"
                  >
                    <ComponentCopyButton type="button" onClick={onCopyComponent(uid)}>
                      <Duplicate aria-hidden width="1.2rem" height="1.2rem" />
                      <Typography variant="pi" fontWeight="bold">
                        {formatMessage({
                          id: getTranslation('components.copy-from-existing.short'),
                          defaultMessage: 'Copy',
                        })}
                      </Typography>
                    </ComponentCopyButton>
                  </Tooltip>
                )}
              </ComponentBox>
            );
          })}
        </Grid>
      </ResponsiveAccordionContent>
    </Accordion.Item>
  );
};

const ResponsiveAccordionContent = styled(Accordion.Content)`
  container-type: inline-size;
`;

/**
 * TODO:
 * JSDOM cannot handle container queries.
 * This is a temporary workaround so that tests do not fail in the CI when jestdom throws an error
 * for failing to parse the stylesheet.
 */
const Grid =
  process.env.NODE_ENV !== 'test'
    ? styled(Box)`
        display: grid;
        grid-template-columns: repeat(auto-fill, 100%);
        grid-gap: 12px;

        ${({ theme }) => theme.breakpoints.medium} {
          grid-template-columns: repeat(auto-fill, 14rem);
          grid-gap: 4px;
        }
      `
    : styled(Box)`
        display: grid;
        grid-template-columns: repeat(auto-fill, 100%);
        grid-gap: 12px;

        ${({ theme }) => theme.breakpoints.medium} {
          grid-gap: 4px;
        }
      `;

const ComponentBox = styled<FlexComponent>(Flex)`
  /* keeps the background of the actions within the rounded corners */
  overflow: hidden;

  @media (prefers-reduced-motion: no-preference) {
    transition: border-color 120ms ${(props) => props.theme.motion.easings.easeOutQuad};
  }

  &:focus-within,
  &:hover {
    border-color: ${({ theme }) => theme.colors.primary200};
  }
`;

/**
 * A tile holds up to two actions, adding the component and copying it from another entry.
 * Each one is highlighted on its own so it's clear which one is about to be triggered.
 */
const tileActionStyles = css`
  width: 100%;
  border: 0;
  background: transparent;
  cursor: pointer;

  @media (prefers-reduced-motion: no-preference) {
    transition:
      background-color 120ms ${(props) => props.theme.motion.easings.easeOutQuad},
      color 120ms ${(props) => props.theme.motion.easings.easeOutQuad};
  }

  &:focus-visible,
  &:hover {
    background: ${({ theme }) => theme.colors.primary100};
  }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.primary600};
    outline-offset: -2px;
  }
`;

const ComponentAddButton = styled.button`
  ${tileActionStyles}
  /* 8.4rem tile (as without a copy action) minus the tile's 1px borders */
  min-height: 8.2rem;
  color: ${({ theme }) => theme.colors.neutral600};

  &:focus-visible,
  &:hover {
    color: ${({ theme }) => theme.colors.primary600};
  }
`;

const ComponentCopyButton = styled.button`
  ${tileActionStyles}
  display: flex;
  align-items: center;
  justify-content: center;
  gap: ${({ theme }) => theme.spaces[1]};
  padding: ${({ theme }) => theme.spaces[1]} ${({ theme }) => theme.spaces[2]};
  border-top: 1px solid ${({ theme }) => theme.colors.neutral200};
  color: ${({ theme }) => theme.colors.primary600};

  &:focus-visible,
  &:hover {
    color: ${({ theme }) => theme.colors.primary700};
  }
`;

export { ComponentCategory };
export type { ComponentCategoryProps };
