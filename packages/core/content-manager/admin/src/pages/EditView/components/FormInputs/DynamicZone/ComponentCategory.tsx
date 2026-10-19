import * as React from 'react';

import {
  Accordion,
  Box,
  Flex,
  FlexComponent,
  Menu,
  Popover,
  Tooltip,
  Typography,
} from '@strapi/design-system';
import upperFirst from 'lodash/upperFirst';
import { useIntl } from 'react-intl';
import { styled } from 'styled-components';

import { ComponentIcon } from '../../../../../components/ComponentIcon';
import { resolvePreviewImageUrl } from '../../../../../utils/previewImage';
import { AddComponentMenuContent } from '../Component/AddComponentMenu';

import type { Struct } from '@strapi/types';

interface ComponentCategoryProps {
  category: string;
  components?: Array<{
    uid: string;
    displayName: string;
    icon?: string;
    preview?: Struct.PreviewImageValue;
  }>;
  onAddComponent: (componentUid: string) => () => void;
  /**
   * When set, picking a component offers to add it empty or to copy it from another entry.
   */
  onCopyComponent?: (componentUid: string) => () => void;
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
            const name = formatMessage({ id: uid, defaultMessage: displayName ?? uid });

            const tile = (
              <Flex
                tag="span"
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

                <Tooltip label={name}>
                  <Typography tag="span" variant="pi" fontWeight="bold" ellipsis width="100%">
                    {name}
                  </Typography>
                </Tooltip>
              </Flex>
            );

            if (onCopyComponent) {
              return (
                <Menu.Root key={uid}>
                  <ComponentMenuTrigger endIcon={null}>{tile}</ComponentMenuTrigger>
                  <AddComponentMenuContent
                    kind="component"
                    onAddEmpty={onAddComponent(uid)}
                    onCopy={onCopyComponent(uid)}
                  />
                </Menu.Root>
              );
            }

            return (
              <ComponentBox
                key={uid}
                tag="button"
                type="button"
                background="neutral100"
                justifyContent="center"
                onClick={onAddComponent(uid)}
                hasRadius
                height="8.4rem"
                shrink={0}
                borderColor="neutral200"
              >
                {tile}
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

const ComponentBox = styled<FlexComponent<'button'>>(Flex)`
  color: ${({ theme }) => theme.colors.neutral600};
  cursor: pointer;

  @media (prefers-reduced-motion: no-preference) {
    transition: color 120ms ${(props) => props.theme.motion.easings.easeOutQuad};
  }

  &:focus,
  &:hover {
    border: 1px solid ${({ theme }) => theme.colors.primary200};
    background: ${({ theme }) => theme.colors.primary100};
    color: ${({ theme }) => theme.colors.primary600};
  }
`;

/**
 * Same tile as `ComponentBox`, as the trigger of the menu offering to add the component empty or
 * to copy it from another entry. The trigger is a button of the design system, hence the
 * overrides.
 */
const ComponentMenuTrigger = styled(Menu.Trigger)`
  && {
    width: 100%;
    height: 8.4rem;
    padding: 0;
    justify-content: center;
    border: 1px solid ${({ theme }) => theme.colors.neutral200};
    border-radius: ${({ theme }) => theme.borderRadius};
    background: ${({ theme }) => theme.colors.neutral100};
    color: ${({ theme }) => theme.colors.neutral600};
  }

  /* the wrapper of the tile content */
  && > span {
    flex: 1;
    min-width: 0;
  }

  @media (prefers-reduced-motion: no-preference) {
    transition: color 120ms ${(props) => props.theme.motion.easings.easeOutQuad};
  }

  &&:focus,
  &&:hover,
  &&[data-state='open'] {
    border-color: ${({ theme }) => theme.colors.primary200};
    background: ${({ theme }) => theme.colors.primary100};
    color: ${({ theme }) => theme.colors.primary600};
  }
`;

export { ComponentCategory };
export type { ComponentCategoryProps };
