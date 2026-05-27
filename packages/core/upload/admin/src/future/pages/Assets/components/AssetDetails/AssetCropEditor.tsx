import * as React from 'react';

import {
  Box,
  Button,
  Field,
  Flex,
  FocusTrap,
  IconButton,
  Portal,
  TextInput,
  Typography,
} from '@strapi/design-system';
import { Crop, Link } from '@strapi/icons';
// Raw cropperjs stylesheet, injected via createGlobalStyle. Without it the
// cropper container collapses and the image/crop box don't render.
import cropperCss from 'cropperjs/dist/cropper.css?raw';
import { useIntl } from 'react-intl';
import { createGlobalStyle, styled } from 'styled-components';

import { prefixFileUrlWithBackendUrl } from '../../../../utils/files';
import { getTranslationKey } from '../../../../utils/translations';

import { useCropImg } from './useCropImg';

import type {
  AssetWithPopulatedCreatedBy,
  FocalPoint,
} from '../../../../../../../shared/contracts/files';

const FOCAL_DIAMETER_REM = 5.6;

const CropperGlobalStyle = createGlobalStyle`${cropperCss}`;

/* -------------------------------------------------------------------------------------------------
 * Styled
 * -----------------------------------------------------------------------------------------------*/

// Full-viewport takeover. z-index clears the whole theme ladder (tooltip 1000)
// so nothing from the drawer beneath bleeds through.
const Overlay = styled(Flex)`
  position: fixed;
  inset: 0;
  z-index: 1200;
  flex-direction: column;
  background: ${({ theme }) => theme.colors.neutral0};
`;

const HeaderBar = styled(Flex)`
  flex-shrink: 0;
  gap: ${({ theme }) => theme.spaces[2]};
  padding: ${({ theme }) => `${theme.spaces[3]} ${theme.spaces[5]}`};
  border-bottom: 1px solid ${({ theme }) => theme.colors.neutral150};
`;

const Body = styled(Box)`
  position: relative;
  flex: 1;
  min-height: 0;
  overflow: hidden;
  background: repeating-conic-gradient(
      ${({ theme }) => theme.colors.neutral100} 0% 25%,
      transparent 0% 50%
    )
    50% / 20px 20px;
`;

// cropperjs replaces this <img>; the wrapper just centers it before init.
const CropArea = styled.div`
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;

  img {
    max-width: 100%;
    max-height: 100%;
  }
`;

const FocalPointHandle = styled.button`
  position: absolute;
  width: ${FOCAL_DIAMETER_REM}rem;
  height: ${FOCAL_DIAMETER_REM}rem;
  margin: ${-FOCAL_DIAMETER_REM / 2}rem 0 0 ${-FOCAL_DIAMETER_REM / 2}rem;
  border-radius: 50%;
  border: 2px solid ${({ theme }) => theme.colors.neutral0};
  background: transparent;
  box-shadow: 0 0 0 1px ${({ theme }) => theme.colors.neutral800};
  cursor: grab;
  z-index: 10;
  padding: 0;

  &::after {
    content: '';
    position: absolute;
    top: 50%;
    left: 50%;
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: ${({ theme }) => theme.colors.neutral0};
    transform: translate(-50%, -50%);
  }

  &:active {
    cursor: grabbing;
  }
`;

const InfoBox = styled(Box)`
  position: absolute;
  right: ${({ theme }) => theme.spaces[6]};
  bottom: ${({ theme }) => theme.spaces[6]};
  width: 30rem;
  padding: ${({ theme }) => theme.spaces[4]};
  border-radius: ${({ theme }) => theme.borderRadius};
  background: ${({ theme }) => theme.colors.neutral800};
  z-index: 20;
`;

const FooterBar = styled(Flex)`
  flex-shrink: 0;
  justify-content: space-between;
  padding: ${({ theme }) => `${theme.spaces[3]} ${theme.spaces[5]}`};
  border-top: 1px solid ${({ theme }) => theme.colors.neutral150};
`;

/* -------------------------------------------------------------------------------------------------
 * AssetCropEditor
 * -----------------------------------------------------------------------------------------------*/

interface AssetCropEditorProps {
  asset: AssetWithPopulatedCreatedBy;
  isBusy?: boolean;
  onClose: () => void;
  onApply: (file: globalThis.File, focalPoint: FocalPoint) => void;
  onSaveAsCopy: (file: globalThis.File, focalPoint: FocalPoint) => void;
}

export const AssetCropEditor = ({
  asset,
  isBusy = false,
  onClose,
  onApply,
  onSaveAsCopy,
}: AssetCropEditorProps) => {
  const { formatMessage } = useIntl();
  const imgRef = React.useRef<HTMLImageElement>(null);
  const bodyRef = React.useRef<HTMLDivElement>(null);

  const {
    crop,
    stopCropping,
    produceFile,
    setCropSize,
    setAspectRatio,
    getCropBoxData,
    width,
    height,
  } = useCropImg();

  const [aspectLocked, setAspectLocked] = React.useState(false);
  // Focal point as a percentage of the crop area (matches the {x,y} contract).
  const [focal, setFocal] = React.useState<FocalPoint>(asset.focalPoint ?? { x: 50, y: 50 });
  const [cropBox, setCropBox] = React.useState({ left: 0, top: 0, width: 0, height: 0 });

  const imageUrl = prefixFileUrlWithBackendUrl(asset.url) as string;

  // Mount cropper once the <img> has loaded, then mirror the crop box rect so
  // the focal handle can be overlaid on it.
  const refreshCropBox = React.useCallback(() => {
    const data = getCropBoxData();
    if (data) {
      setCropBox({
        left: data.left ?? 0,
        top: data.top ?? 0,
        width: data.width ?? 0,
        height: data.height ?? 0,
      });
    }
  }, [getCropBoxData]);

  const handleImageLoad = () => {
    if (imgRef.current) {
      crop(imgRef.current);
      // cropperjs dispatches `crop` on the <img> on every box change.
      imgRef.current.addEventListener('crop', refreshCropBox);
    }
  };

  React.useEffect(() => {
    const img = imgRef.current;
    return () => {
      img?.removeEventListener('crop', refreshCropBox);
      stopCropping();
    };
  }, [refreshCropBox, stopCropping]);

  const toggleAspectLock = () => {
    setAspectLocked((locked) => {
      const next = !locked;
      setAspectRatio(next && height ? width / height : null);
      return next;
    });
  };

  // Drag the focal handle, clamped to the crop box.
  const handleFocalPointerDown = (event: React.PointerEvent) => {
    event.preventDefault();
    const move = (e: PointerEvent) => {
      const box = bodyRef.current?.getBoundingClientRect();
      if (!box) return;
      const px = e.clientX - box.left - cropBox.left;
      const py = e.clientY - box.top - cropBox.top;
      const x = Math.min(100, Math.max(0, (px / cropBox.width) * 100));
      const y = Math.min(100, Math.max(0, (py / cropBox.height) * 100));
      setFocal({ x: Math.round(x), y: Math.round(y) });
    };
    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };

  const focalPxX = Math.round((focal.x / 100) * width);
  const focalPxY = Math.round((focal.y / 100) * height);

  const setFocalPx = (axis: 'x' | 'y', value: number) => {
    const dim = axis === 'x' ? width : height;
    if (!dim) return;
    const pct = Math.min(100, Math.max(0, (value / dim) * 100));
    setFocal((prev) => ({ ...prev, [axis]: Math.round(pct) }));
  };

  const handleAction = async (action: 'apply' | 'copy') => {
    const file = await produceFile(asset.name, asset.mime ?? 'image/png', asset.updatedAt);
    const roundedFocal = { x: Math.round(focal.x), y: Math.round(focal.y) };
    if (action === 'apply') {
      onApply(file, roundedFocal);
    } else {
      onSaveAsCopy(file, roundedFocal);
    }
  };

  return (
    <Portal>
      <CropperGlobalStyle />
      <FocusTrap onEscape={onClose}>
        <Overlay>
          <HeaderBar alignItems="center">
            <Crop aria-hidden />
            <Typography variant="omega" fontWeight="bold">
              {formatMessage({
                id: getTranslationKey('asset-details.crop.title'),
                defaultMessage: 'Crop & Focus area',
              })}
            </Typography>
          </HeaderBar>

          <Body ref={bodyRef}>
            <CropArea>
              <img ref={imgRef} src={imageUrl} alt={asset.name} onLoad={handleImageLoad} />
            </CropArea>

            {cropBox.width > 0 ? (
              <FocalPointHandle
                type="button"
                aria-label={formatMessage({
                  id: getTranslationKey('asset-details.crop.focal-point'),
                  defaultMessage: 'Focal point',
                })}
                style={{
                  left: cropBox.left + (focal.x / 100) * cropBox.width,
                  top: cropBox.top + (focal.y / 100) * cropBox.height,
                }}
                onPointerDown={handleFocalPointerDown}
              />
            ) : null}

            <InfoBox>
              <Flex direction="column" alignItems="stretch" gap={1} paddingBottom={3}>
                <Typography variant="omega" fontWeight="bold" textColor="neutral0">
                  {formatMessage({
                    id: getTranslationKey('asset-details.crop.title'),
                    defaultMessage: 'Crop & Focus area',
                  })}
                </Typography>
                <Typography variant="pi" textColor="neutral200">
                  {formatMessage({
                    id: getTranslationKey('asset-details.crop.hint'),
                    defaultMessage:
                      'Set the crop area with the rectangle. Pin the always-visible area with the circle.',
                  })}
                </Typography>
              </Flex>

              <Flex gap={3} alignItems="flex-end">
                <Flex direction="column" gap={2}>
                  <Field.Root name="crop-width">
                    <Field.Label textColor="neutral0">↔</Field.Label>
                    <TextInput
                      type="number"
                      aria-label={formatMessage({
                        id: getTranslationKey('asset-details.crop.width'),
                        defaultMessage: 'Width (px)',
                      })}
                      value={width}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setCropSize({ width: Number(e.target.value) })
                      }
                    />
                  </Field.Root>
                  <Field.Root name="crop-height">
                    <Field.Label textColor="neutral0">↕</Field.Label>
                    <TextInput
                      type="number"
                      aria-label={formatMessage({
                        id: getTranslationKey('asset-details.crop.height'),
                        defaultMessage: 'Height (px)',
                      })}
                      value={height}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setCropSize({ height: Number(e.target.value) })
                      }
                    />
                  </Field.Root>
                </Flex>

                <IconButton
                  label={formatMessage({
                    id: getTranslationKey('asset-details.crop.aspect-lock'),
                    defaultMessage: 'Lock aspect ratio',
                  })}
                  variant={aspectLocked ? 'secondary' : 'tertiary'}
                  onClick={toggleAspectLock}
                >
                  <Link />
                </IconButton>

                <Flex direction="column" gap={2}>
                  <Field.Root name="focal-x">
                    <Field.Label textColor="neutral0">fa-x</Field.Label>
                    <TextInput
                      type="number"
                      aria-label={formatMessage({
                        id: getTranslationKey('asset-details.crop.focal-x'),
                        defaultMessage: 'Focal point X (px)',
                      })}
                      value={focalPxX}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setFocalPx('x', Number(e.target.value))
                      }
                    />
                  </Field.Root>
                  <Field.Root name="focal-y">
                    <Field.Label textColor="neutral0">fa-y</Field.Label>
                    <TextInput
                      type="number"
                      aria-label={formatMessage({
                        id: getTranslationKey('asset-details.crop.focal-y'),
                        defaultMessage: 'Focal point Y (px)',
                      })}
                      value={focalPxY}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setFocalPx('y', Number(e.target.value))
                      }
                    />
                  </Field.Root>
                </Flex>
              </Flex>
            </InfoBox>
          </Body>

          <FooterBar alignItems="center">
            <Button variant="tertiary" onClick={onClose} disabled={isBusy}>
              {formatMessage({ id: 'app.components.Button.cancel', defaultMessage: 'Cancel' })}
            </Button>
            <Flex gap={2}>
              <Button variant="secondary" onClick={() => handleAction('copy')} loading={isBusy}>
                {formatMessage({
                  id: getTranslationKey('asset-details.crop.save-as-copy'),
                  defaultMessage: 'Save as copy',
                })}
              </Button>
              <Button variant="default" onClick={() => handleAction('apply')} loading={isBusy}>
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
