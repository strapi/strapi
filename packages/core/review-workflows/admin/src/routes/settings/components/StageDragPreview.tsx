import { Flex, Typography } from '@strapi/design-system';
import { CaretDown } from '@strapi/icons';

interface StageDragPreviewType {
  name: string | null;
}

const StageDragPreview = ({ name }: StageDragPreviewType) => {
  return (
    <Flex
      background="primary100"
      borderStyle="dashed"
      borderColor="primary600"
      borderWidth="1px"
      gap={3}
      hasRadius
      padding={3}
      shadow="tableShadow"
      width="30rem"
    >
      <Flex
        alignItems="center"
        background="neutral200"
        borderRadius="50%"
        height={6}
        justifyContent="center"
        width={6}
      >
        <CaretDown width="0.8rem" fill="neutral600" />
      </Flex>

      <Typography fontWeight="bold">{name}</Typography>
    </Flex>
  );
};

export { StageDragPreview };
export type { StageDragPreviewType };
