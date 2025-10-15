import {
  Box,
  Card,
  CardBody,
  CardCheckbox,
  CardContent,
  CardHeader,
  CardAction,
  CardTitle,
  IconButton,
} from '@strapi/design-system';
import { Expand } from '@strapi/icons';
import { styled } from 'styled-components';

import { ANIMATIONS } from './animations';
import { Base64Img } from './Base64Image';
import { FullScreenImage } from './FullScreenImage';

interface Base64ImageProps {
  imageUrl: string;
  imageName: string;
  selected?: boolean;
  onSelect?: (selected: boolean) => void;
}

const ImageContainer = styled(Box)`
  display: flex;
  align-items: center;
  justify-content: center;
  height: 160px;
  width: 100%;
  border-radius: 4px 4px 0 0;
  overflow: hidden;
  cursor: pointer;
`;

const StyledImg = styled(Base64Img)`
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
  // make it appear gracefully when first rendering
  animation: ${ANIMATIONS.fadeIn} 0.3s ease;
`;

const CardContainer = styled(Card)<{ $selected?: boolean }>`
  height: 100%;
  width: 100%;
  ${({ $selected, theme }) =>
    $selected
      ? `
      border: 2px solid ${theme.colors.primary600};
      outline: 0px solid transparent;
    `
      : `
      border: 2px solid transparent;
      outline: 1px solid ${theme.colors.neutral200};
    `}
  transition: all 0.2s ease-in-out;
`;

export const ImagePreview = ({
  imageUrl,
  imageName,
  selected = false,
  onSelect,
}: Base64ImageProps) => {
  return (
    <FullScreenImage.Root src={imageUrl} alt={imageName}>
      <CardContainer role="button" $selected={selected}>
        <CardHeader>
          <CardCheckbox checked={selected} onCheckedChange={onSelect} />
          <CardAction position="end">
            <FullScreenImage.Trigger>
              <IconButton label="Preview" type="button">
                <Expand />
              </IconButton>
            </FullScreenImage.Trigger>
          </CardAction>
          <ImageContainer onClick={onSelect}>
            <StyledImg src={imageUrl} alt={imageName} />
          </ImageContainer>
        </CardHeader>

        <CardBody>
          <CardContent>
            <CardTitle>{imageName}</CardTitle>
          </CardContent>
        </CardBody>
      </CardContainer>
    </FullScreenImage.Root>
  );
};
