import * as React from 'react';

import { useNotification } from '@strapi/admin/strapi-admin';
import {
  Box,
  Button,
  Field,
  Flex,
  FocusTrap,
  IconButton,
  NumberInput,
  Portal,
  Typography,
} from '@strapi/design-system';
import { ArrowsHorizontal, ArrowsVertical, Crop, Link } from '@strapi/icons';
import { useIntl } from 'react-intl';
import { styled, useTheme } from 'styled-components';

import { prefixFileUrlWithBackendUrl } from '../../../../utils/files';
import { getTranslationKey } from '../../../../utils/translations';

import { resolveCornerResize, useCropImg } from './useCropImg';

import type {
  AssetWithPopulatedCreatedBy,
  FocalPoint,
} from '../../../../../../../shared/contracts/files';

const FOCAL_DIAMETER_REM = 5.6;
const HANDLE_PX = 12;

/* -------------------------------------------------------------------------------------------------
 * Styled
 * -----------------------------------------------------------------------------------------------*/

// Full-viewport takeover with a small inset so the editor reads as a card.
const Overlay = styled(Flex)`
  position: fixed;
  z-index: 1200;
  flex-direction: column;
  top: ${({ theme }) => theme.spaces[1]};
  left: ${({ theme }) => theme.spaces[1]};
  right: ${({ theme }) => theme.spaces[1]};
  bottom: ${({ theme }) => theme.spaces[1]};
  border-radius: ${({ theme }) => theme.borderRadius};
  border: 1px solid ${({ theme }) => theme.colors.neutral150};
  background: ${({ theme }) => theme.colors.neutral0};
  /* Focused programmatically on open (tabIndex -1) — no visible ring needed. */
  outline: none;
`;

const HeaderBar = styled(Flex)`
  width: 100%;
  gap: ${({ theme }) => theme.spaces[2]};
  padding: ${({ theme }) => `${theme.spaces[3]} ${theme.spaces[5]}`};
  border-bottom: 1px solid ${({ theme }) => theme.colors.neutral150};
  background: ${({ theme }) => theme.colors.neutral0};
`;

// Fills the remaining space between header/footer; checkerboard pattern.
// The horizontal padding keeps the image off the viewport edges — the corner
// handles overhang the image by half their size, and on narrow (mobile)
// screens an edge-to-edge image leaves nothing to grab.
const Body = styled(Box)`
  width: 100%;
  position: relative;
  flex: 1;
  min-height: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  padding: 0 ${({ theme }) => theme.spaces[4]};
  background: repeating-conic-gradient(
      ${({ theme }) => theme.colors.neutral100} 0% 25%,
      ${({ theme }) => theme.colors.neutral0} 0% 50%
    )
    50% / 20px 20px;
`;

// Wrapper sized to the image's natural aspect ratio so the <img> inside fills
// it without letterboxing. Percentage-based positioning of the crop overlay
// then maps directly to natural-px coordinates.
const CropArea = styled.div<{ $aspect?: number }>`
  position: relative;
  max-width: 100%;
  max-height: 100%;
  ${({ $aspect }) => ($aspect ? `aspect-ratio: ${$aspect};` : '')}

  img {
    display: block;
    width: 100%;
    height: 100%;
    user-select: none;
    -webkit-user-drag: none;
  }
`;

// Crop selection rectangle, positioned by % of CropArea. Inverts the dim
// outside via box-shadow so the focused area shows full color.
const CropOverlay = styled.div`
  position: absolute;
  border: 1px dashed ${({ theme }) => theme.colors.primary600};
  box-shadow: 0 0 0 9999px rgba(33, 33, 52, 0.5);
  cursor: move;
  /* Without this, touch browsers claim the gesture for scrolling and fire
     pointercancel mid-drag — the crop drag dies while the finger is down. */
  touch-action: none;
`;

const ResizeHandle = styled.button<{ $cursor: string }>`
  position: absolute;
  width: ${HANDLE_PX}px;
  height: ${HANDLE_PX}px;
  margin: -${HANDLE_PX / 2}px;
  padding: 0;
  border: 1px solid ${({ theme }) => theme.colors.primary600};
  border-radius: 2px;
  background: ${({ theme }) => theme.colors.neutral0};
  cursor: ${({ $cursor }) => $cursor};
  touch-action: none;
`;

const FocalPointHandle = styled.button`
  position: absolute;
  width: ${FOCAL_DIAMETER_REM}rem;
  height: ${FOCAL_DIAMETER_REM}rem;
  margin: ${-FOCAL_DIAMETER_REM / 2}rem 0 0 ${-FOCAL_DIAMETER_REM / 2}rem;
  border-radius: 50%;
  border: 1px solid ${({ theme }) => theme.colors.neutral800};
  background: transparent;
  cursor: grab;
  padding: 0;
  touch-action: none;

  &::before {
    content: '';
    position: absolute;
    top: 50%;
    left: 50%;
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background: rgba(0, 0, 0, 0.16);
    transform: translate(-50%, -50%);
  }
  &::after {
    content: '';
    position: absolute;
    top: 50%;
    left: 50%;
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: ${({ theme }) => theme.colors.neutral800};
    transform: translate(-50%, -50%);
  }

  &:active {
    cursor: grabbing;
  }
`;

const InfoBox = styled(Box)`
  position: absolute;
  right: ${({ theme }) => theme.spaces[1]};
  bottom: ${({ theme }) => theme.spaces[1]};
  width: 100%;
  max-width: 32rem;
  padding: ${({ theme }) => theme.spaces[3]};
  border-radius: ${({ theme }) => theme.borderRadius};
  background: ${({ theme }) =>
    theme.colorScheme === 'dark' ? theme.colors.neutral150 : theme.colors.neutral900};
  z-index: 20;
`;

const FooterBar = styled(Flex)`
  width: 100%;
  justify-content: space-between;
  padding: ${({ theme }) => `${theme.spaces[3]} ${theme.spaces[5]}`};
  border-top: 1px solid ${({ theme }) => theme.colors.neutral150};
  background: ${({ theme }) => theme.colors.neutral0};
`;

const FieldRow = styled(Field.Root)`
  flex-direction: row;
  align-items: center;
`;

const FieldNumberInput = styled(NumberInput)`
  width: 8.4rem;
`;

const LabelIcon = styled(Field.Label)`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 1.6rem;
  height: 1.6rem;
`;

const BackgroundPreserveRatioContainer = styled(Box)`
  position: absolute;
  top: 50%;
  left: 0;
  transform: translateY(-50%);

  svg {
    display: block;
  }
`;

const BackgroundPreserveRatio = () => (
  <BackgroundPreserveRatioContainer>
    <svg width="17" height="49" viewBox="0 0 17 49" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M0.5 0.5H8.5C12.9183 0.5 16.5 4.08172 16.5 8.5M0.5 48.5H8.5C12.9183 48.5 16.5 44.9183 16.5 40.5"
        stroke="#666687"
        strokeLinecap="round"
      />
    </svg>
  </BackgroundPreserveRatioContainer>
);

/* -------------------------------------------------------------------------------------------------
 * AssetCropEditor
 * -----------------------------------------------------------------------------------------------*/

interface AssetCropEditorProps {
  asset: AssetWithPopulatedCreatedBy;
  isBusy?: boolean;
  onClose: () => void;
  onApply: (file: globalThis.File, focalPoint: FocalPoint) => void;
  onSaveAsCopy: (file: globalThis.File, focalPoint: FocalPoint) => void;
  /**
   * "Save as copy" creates a new asset (`assets.create`), a different permission
   * from cropping in place (`assets.update`). Hidden when the user lacks it, so
   * an update-only role can't trigger a 403.
   */
  canSaveAsCopy: boolean;
}

type Corner = 'tl' | 'tr' | 'bl' | 'br';

export const AssetCropEditor = ({
  asset,
  isBusy = false,
  onClose,
  onApply,
  onSaveAsCopy,
  canSaveAsCopy,
}: AssetCropEditorProps) => {
  const { formatMessage } = useIntl();
  const { toggleNotification } = useNotification();
  // The InfoBox is a fixed dark surface in both themes, so its text can't use a
  // single neutral token (those invert with the scheme). Pick the scheme's white
  // and a muted grey explicitly.
  const theme = useTheme();
  const isDark = theme.colorScheme === 'dark';
  const infoTextColor = isDark ? 'neutral1000' : 'neutral0';
  const infoMutedColor = isDark ? 'neutral600' : 'neutral200';
  const imgRef = React.useRef<HTMLImageElement>(null);
  const cropAreaRef = React.useRef<HTMLDivElement>(null);
  const overlayRef = React.useRef<HTMLDivElement>(null);

  // FocusTrap's auto-focus lands on the first focusable element — the crop
  // width NumberInput — which pops the keyboard on mobile the moment the
  // editor opens. Focus the (tabIndex -1) overlay instead: keyboard users are
  // one Tab away from the first control, Escape still reaches the trap.
  React.useEffect(() => {
    overlayRef.current?.focus();
  }, []);

  const {
    init,
    crop,
    naturalSize,
    aspectRatio,
    setCropSize,
    setCropPosition,
    setAspectRatio,
    produceFile,
    width,
    height,
  } = useCropImg();

  const [aspectLocked, setAspectLocked] = React.useState(false);
  // Focal point as a percentage of the crop area (matches the {x,y} contract).
  const [focal, setFocal] = React.useState<FocalPoint>(asset.focalPoint ?? { x: 50, y: 50 });

  // The crop editor reads pixels from a canvas (useCropImg -> toBlob), so its
  // <img> must be CORS-clean and always sets crossOrigin="anonymous" (see the
  // img below) — even for unsigned URLs, which AssetPreview leaves unset because
  // it only displays. That difference is why the crop URL is kept DISTINCT from
  // the thumbnail's: identical URL + different crossOrigin collide in the HTTP
  // cache (#26581), and the crop's anonymous request could otherwise reuse the
  // thumbnail's non-CORS cached response and taint the canvas. So the buster
  // uses `updatedAt` where AssetPreview uses `v`, giving each its own entry
  // (mirrors the legacy PreviewBox fix).
  // Signed URLs get no param at all — a presigned S3 URL breaks if you add one,
  // and on the signed side AssetPreview also loads anonymous, so the identical
  // URL there shares one CORS-consistent entry, which is fine.
  const rawImageUrl = prefixFileUrlWithBackendUrl(asset.url) as string;
  const cacheKey =
    asset.updatedAt && !asset.isUrlSigned ? new Date(asset.updatedAt).getTime() : undefined;
  const imageUrl =
    cacheKey !== undefined
      ? `${rawImageUrl}${rawImageUrl.includes('?') ? '&' : '?'}updatedAt=${cacheKey}`
      : rawImageUrl;

  const handleImageLoad = () => {
    if (imgRef.current) {
      init(imgRef.current);
    }
  };

  // Map a pointer event to natural-px coordinates inside the image.
  const pointerToNatural = (event: PointerEvent | React.PointerEvent) => {
    const rect = cropAreaRef.current?.getBoundingClientRect();
    if (!rect || !naturalSize.width || !naturalSize.height) return null;
    const ratioX = naturalSize.width / rect.width;
    const ratioY = naturalSize.height / rect.height;
    return {
      x: (event.clientX - rect.left) * ratioX,
      y: (event.clientY - rect.top) * ratioY,
    };
  };

  // Teardown for the drag currently in flight, so it can be run both on pointer
  // release AND on unmount. Without the unmount path, closing the editor mid-drag
  // (Escape, drawer close, a re-render dropping the overlay) would never fire a
  // pointer event, leaking the window listeners and letting a stale `onMove`
  // call `setCropPosition` on an unmounted component.
  const activeDragCleanupRef = React.useRef<(() => void) | null>(null);

  React.useEffect(() => {
    return () => {
      activeDragCleanupRef.current?.();
    };
  }, []);

  // Track a pointer drag until the pointer is released or the browser cancels
  // it. The pointer is captured so the drag follows the finger even once it
  // leaves the (12px) handle it started on, and pointercancel is treated as
  // release so an interrupted touch never leaves stale window listeners.
  const trackPointerDrag = (event: React.PointerEvent, onMove: (e: PointerEvent) => void) => {
    event.preventDefault();
    event.stopPropagation();
    const { pointerId } = event;
    try {
      event.currentTarget.setPointerCapture(pointerId);
    } catch {
      // Unsupported environment (jsdom) — window listeners still track the drag.
    }
    const move = (e: PointerEvent) => {
      if (e.pointerId !== pointerId) return;
      onMove(e);
    };
    const cleanup = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', end);
      window.removeEventListener('pointercancel', end);
      activeDragCleanupRef.current = null;
    };
    const end = (e: PointerEvent) => {
      if (e.pointerId !== pointerId) return;
      cleanup();
    };
    // Only one drag is ever live at a time; tear down any previous one first.
    activeDragCleanupRef.current?.();
    activeDragCleanupRef.current = cleanup;
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', end);
    window.addEventListener('pointercancel', end);
  };

  // Drag the entire crop rectangle.
  const handleMovePointerDown = (event: React.PointerEvent) => {
    const start = pointerToNatural(event);
    if (!start) return;
    const startCrop = { ...crop };
    trackPointerDrag(event, (e) => {
      const next = pointerToNatural(e);
      if (!next) return;
      setCropPosition({
        x: startCrop.x + (next.x - start.x),
        y: startCrop.y + (next.y - start.y),
      });
    });
  };

  // Resize from a corner; the opposite corner stays anchored.
  const handleResizePointerDown = (corner: Corner) => (event: React.PointerEvent) => {
    const startCrop = { ...crop };
    const anchorX =
      corner === 'tl' || corner === 'bl' ? startCrop.x + startCrop.width : startCrop.x;
    const anchorY =
      corner === 'tl' || corner === 'tr' ? startCrop.y + startCrop.height : startCrop.y;
    trackPointerDrag(event, (e) => {
      const point = pointerToNatural(e);
      if (!point) return;
      const {
        x,
        y,
        width: w,
        height: h,
      } = resolveCornerResize({
        anchorX,
        anchorY,
        point,
        aspectRatio: aspectLocked ? aspectRatio : null,
      });
      setCropPosition({ x, y });
      setCropSize({ width: w, height: h });
    });
  };

  const toggleAspectLock = () => {
    setAspectLocked((locked) => {
      const next = !locked;
      setAspectRatio(next && height ? width / height : null);
      return next;
    });
  };

  // Drag the focal handle within the crop rectangle, clamped 0–100.
  const handleFocalPointerDown = (event: React.PointerEvent) => {
    trackPointerDrag(event, (e) => {
      const point = pointerToNatural(e);
      if (!point) return;
      // Convert pointer to a percentage of the current crop area.
      const px = ((point.x - crop.x) / crop.width) * 100;
      const py = ((point.y - crop.y) / crop.height) * 100;
      setFocal({
        x: Math.round(Math.min(100, Math.max(0, px))),
        y: Math.round(Math.min(100, Math.max(0, py))),
      });
    });
  };

  const focalPxX = Math.round((focal.x / 100) * width);
  const focalPxY = Math.round((focal.y / 100) * height);

  const setFocalPx = (axis: 'x' | 'y', value: number) => {
    const dim = axis === 'x' ? width : height;
    if (!dim) return;
    const pct = Math.min(100, Math.max(0, (value / dim) * 100));
    setFocal((prev) => ({ ...prev, [axis]: Math.round(pct) }));
  };

  const cropPercents =
    naturalSize.width && naturalSize.height
      ? {
          left: (crop.x / naturalSize.width) * 100,
          top: (crop.y / naturalSize.height) * 100,
          width: (crop.width / naturalSize.width) * 100,
          height: (crop.height / naturalSize.height) * 100,
        }
      : null;

  // The crop is only usable once the image has loaded and `init()` has seeded
  // the natural size. Until then the produce/export path would reject.
  const isReady = cropPercents !== null;

  const handleAction = async (action: 'apply' | 'copy') => {
    if (!isReady) return;

    let file: globalThis.File;
    try {
      file = await produceFile(asset.name, asset.mime ?? 'image/png', asset.updatedAt);
    } catch {
      toggleNotification({
        type: 'danger',
        message: formatMessage({
          id: getTranslationKey('asset-details.crop.export-error'),
          defaultMessage: 'Could not process the cropped image.',
        }),
      });
      return;
    }

    const roundedFocal = { x: Math.round(focal.x), y: Math.round(focal.y) };
    if (action === 'apply') {
      onApply(file, roundedFocal);
    } else {
      onSaveAsCopy(file, roundedFocal);
    }
  };

  return (
    <Portal>
      <FocusTrap onEscape={onClose} skipAutoFocus>
        <Overlay ref={overlayRef} tabIndex={-1}>
          <HeaderBar alignItems="center">
            <Crop aria-hidden />
            <Typography variant="omega" fontWeight="bold">
              {formatMessage({
                id: getTranslationKey('asset-details.crop.title'),
                defaultMessage: 'Crop & Focus area',
              })}
            </Typography>
          </HeaderBar>

          <Body>
            <CropArea
              ref={cropAreaRef}
              $aspect={
                naturalSize.width && naturalSize.height
                  ? naturalSize.width / naturalSize.height
                  : undefined
              }
            >
              <img
                ref={imgRef}
                src={imageUrl}
                alt={asset.name}
                // Always anonymous, unlike AssetPreview/AssetsGrid which gate it:
                // the editor reads pixels via canvas (useCropImg -> toBlob), which
                // taints on a cross-origin image loaded without CORS, so every
                // remote image must be fetched CORS-clean.
                crossOrigin="anonymous"
                onLoad={handleImageLoad}
                draggable={false}
              />

              {cropPercents ? (
                <CropOverlay
                  style={{
                    left: `${cropPercents.left}%`,
                    top: `${cropPercents.top}%`,
                    width: `${cropPercents.width}%`,
                    height: `${cropPercents.height}%`,
                  }}
                  onPointerDown={handleMovePointerDown}
                >
                  <ResizeHandle
                    type="button"
                    aria-label={formatMessage({
                      id: getTranslationKey('asset-details.crop.resize.top-left'),
                      defaultMessage: 'Resize top-left',
                    })}
                    $cursor="nwse-resize"
                    style={{ left: 0, top: 0 }}
                    onPointerDown={handleResizePointerDown('tl')}
                  />
                  <ResizeHandle
                    type="button"
                    aria-label={formatMessage({
                      id: getTranslationKey('asset-details.crop.resize.top-right'),
                      defaultMessage: 'Resize top-right',
                    })}
                    $cursor="nesw-resize"
                    style={{ right: 0, top: 0 }}
                    onPointerDown={handleResizePointerDown('tr')}
                  />
                  <ResizeHandle
                    type="button"
                    aria-label={formatMessage({
                      id: getTranslationKey('asset-details.crop.resize.bottom-left'),
                      defaultMessage: 'Resize bottom-left',
                    })}
                    $cursor="nesw-resize"
                    style={{ left: 0, bottom: 0 }}
                    onPointerDown={handleResizePointerDown('bl')}
                  />
                  <ResizeHandle
                    type="button"
                    aria-label={formatMessage({
                      id: getTranslationKey('asset-details.crop.resize.bottom-right'),
                      defaultMessage: 'Resize bottom-right',
                    })}
                    $cursor="nwse-resize"
                    style={{ right: 0, bottom: 0 }}
                    onPointerDown={handleResizePointerDown('br')}
                  />

                  <FocalPointHandle
                    type="button"
                    aria-label={formatMessage({
                      id: getTranslationKey('asset-details.crop.focal-point'),
                      defaultMessage: 'Focal point',
                    })}
                    style={{ left: `${focal.x}%`, top: `${focal.y}%` }}
                    onPointerDown={handleFocalPointerDown}
                  />
                </CropOverlay>
              ) : null}
            </CropArea>

            <InfoBox>
              <Flex direction="column" alignItems="stretch" gap={1} paddingBottom={3}>
                <Typography variant="omega" fontWeight="bold" textColor={infoTextColor}>
                  {formatMessage({
                    id: getTranslationKey('asset-details.crop.title'),
                    defaultMessage: 'Crop & Focus area',
                  })}
                </Typography>
                <Typography variant="pi" textColor={infoMutedColor}>
                  {formatMessage({
                    id: getTranslationKey('asset-details.crop.hint'),
                    defaultMessage:
                      'Set the crop area with the rectangle. Pin the always-visible area with the circle.',
                  })}
                </Typography>
              </Flex>

              <Flex gap={6} alignItems="center">
                <Flex alignItems="center" gap={2}>
                  <Flex direction="column" gap={2}>
                    <FieldRow name="crop-width" gap={2}>
                      <LabelIcon textColor={infoTextColor}>
                        <ArrowsHorizontal />
                      </LabelIcon>
                      <FieldNumberInput
                        aria-label={formatMessage({
                          id: getTranslationKey('asset-details.crop.width'),
                          defaultMessage: 'Width (px)',
                        })}
                        value={width}
                        min={1}
                        max={naturalSize.width || undefined}
                        onValueChange={(next) => {
                          if (next !== undefined) setCropSize({ width: next });
                        }}
                      />
                    </FieldRow>
                    <FieldRow name="crop-height" gap={2}>
                      <LabelIcon textColor={infoTextColor}>
                        <ArrowsVertical />
                      </LabelIcon>
                      <FieldNumberInput
                        aria-label={formatMessage({
                          id: getTranslationKey('asset-details.crop.height'),
                          defaultMessage: 'Height (px)',
                        })}
                        value={height}
                        min={1}
                        max={naturalSize.height || undefined}
                        onValueChange={(next) => {
                          if (next !== undefined) setCropSize({ height: next });
                        }}
                      />
                    </FieldRow>
                  </Flex>

                  <Flex position="relative">
                    <IconButton
                      label={formatMessage({
                        id: getTranslationKey('asset-details.crop.aspect-lock'),
                        defaultMessage: 'Lock aspect ratio',
                      })}
                      variant={aspectLocked ? 'secondary' : 'ghost'}
                      onClick={toggleAspectLock}
                    >
                      <Link />
                    </IconButton>
                    <BackgroundPreserveRatio />
                  </Flex>
                </Flex>

                <Flex direction="column" gap={2} marginLeft={'auto'}>
                  <FieldRow name="focal-x" gap={2}>
                    <Field.Label textColor={infoTextColor}>
                      {formatMessage({
                        id: getTranslationKey('asset-details.crop.focal-x-axis'),
                        defaultMessage: 'X',
                      })}
                    </Field.Label>
                    <FieldNumberInput
                      aria-label={formatMessage({
                        id: getTranslationKey('asset-details.crop.focal-x'),
                        defaultMessage: 'Focal point X (px)',
                      })}
                      value={focalPxX}
                      onValueChange={(next) => {
                        if (next !== undefined) setFocalPx('x', next);
                      }}
                    />
                  </FieldRow>
                  <FieldRow name="focal-y" gap={2}>
                    <Field.Label textColor={infoTextColor}>
                      {formatMessage({
                        id: getTranslationKey('asset-details.crop.focal-y-axis'),
                        defaultMessage: 'Y',
                      })}
                    </Field.Label>
                    <FieldNumberInput
                      aria-label={formatMessage({
                        id: getTranslationKey('asset-details.crop.focal-y'),
                        defaultMessage: 'Focal point Y (px)',
                      })}
                      value={focalPxY}
                      onValueChange={(next) => {
                        if (next !== undefined) setFocalPx('y', next);
                      }}
                    />
                  </FieldRow>
                </Flex>
              </Flex>
            </InfoBox>
          </Body>

          <FooterBar alignItems="center">
            <Button variant="tertiary" onClick={onClose} disabled={isBusy}>
              {formatMessage({ id: 'app.components.Button.cancel', defaultMessage: 'Cancel' })}
            </Button>
            <Flex gap={2}>
              {canSaveAsCopy && (
                <Button
                  variant="secondary"
                  onClick={() => handleAction('copy')}
                  loading={isBusy}
                  disabled={!isReady}
                >
                  {formatMessage({
                    id: getTranslationKey('asset-details.crop.save-as-copy'),
                    defaultMessage: 'Save as copy',
                  })}
                </Button>
              )}
              <Button
                variant="default"
                onClick={() => handleAction('apply')}
                loading={isBusy}
                disabled={!isReady}
              >
                {formatMessage({
                  id: getTranslationKey('asset-details.crop.apply'),
                  defaultMessage: 'Apply',
                })}
              </Button>
            </Flex>
          </FooterBar>
        </Overlay>
      </FocusTrap>
    </Portal>
  );
};
