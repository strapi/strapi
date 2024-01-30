import { FormattedComponentLayout } from '../../../../../../utils/layouts';
import { ComponentPickerProps } from '../ComponentPicker';

export const layoutData = {
  component1: {
    category: 'myComponents',
    info: {
      singularName: 'component1',
      pluralName: 'component1',
      displayName: 'component1',
      icon: undefined,
    },
    apiID: '',
    isDisplayed: false,
    layouts: {
      edit: [],
    },
    modelType: 'contentType',
    kind: 'singleType',
    attributes: {},
  },
  component2: {
    category: 'myComponents',
    info: {
      singularName: 'component2',
      pluralName: 'component2',
      displayName: 'component2',
      icon: undefined,
    },
    apiID: '',
    isDisplayed: false,
    layouts: {
      edit: [],
    },
    modelType: 'contentType',
    kind: 'singleType',
    attributes: {},
  },
  component3: {
    category: 'otherComponents',
    info: {
      singularName: 'component3',
      pluralName: 'component3',
      displayName: 'component3',
      icon: undefined,
    },
    apiID: '',
    isDisplayed: false,
    layouts: {
      edit: [],
    },
    modelType: 'contentType',
    kind: 'singleType',
    attributes: {},
  },
} as unknown as Record<string, FormattedComponentLayout>;

export const dynamicComponentsByCategory = {
  blog: [
    {
      uid: 'blog.test-como',
      displayName: 'component',
    },
  ],
} satisfies ComponentPickerProps['dynamicComponentsByCategory'];
