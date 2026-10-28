import { Checkbox, Box, CheckboxProps } from '@strapi/design-system';

import { useFolderCard } from '../contexts/FolderCard';

export const FolderCardCheckbox = (props: CheckboxProps) => {
  const { id } = useFolderCard();

  return (
    <Box position="relative" zIndex={2}>
      <Checkbox aria-labelledby={`${id}-title`} {...props} />
    </Box>
  );
};
