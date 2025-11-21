import { ComponentPickerProps } from '@content-manager/admin/pages/EditView/components/FormInputs/DynamicZone/ComponentPicker';

export const dynamicComponentsByCategory = {
  blog: [
    {
      uid: 'blog.test-como',
      displayName: 'component',
    },
  ],
} satisfies ComponentPickerProps['dynamicComponentsByCategory'];
