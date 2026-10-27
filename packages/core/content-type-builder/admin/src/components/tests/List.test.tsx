import { render, screen } from '@strapi/admin/strapi-admin/test';

import { List } from '../List';

import type { ContentType } from '../../types';

// Without the update permission, the data manager sets isInDevelopmentMode to false
jest.mock('../DataManager/useDataManager', () => ({
  useDataManager: jest.fn(() => ({ isInDevelopmentMode: false, moveAttribute() {} })),
}));
jest.mock('../CTBSession/ctbSession', () => ({
  useCTBTracking: () => ({ trackUsage() {} }),
}));
jest.mock('../FormModalNavigation/useFormModalNavigation', () => ({
  useFormModalNavigation: () => ({ onOpenModalAddField() {} }),
}));

it('shows a read-only empty state for a type with no fields', () => {
  const type = {
    uid: 'api::empty.empty',
    modelType: 'contentType',
    status: 'UNCHANGED',
    attributes: [],
  } as unknown as ContentType; // only the fields that List reads

  render(<List isMain type={type} />);

  expect(screen.getByText('This content type has no fields yet')).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Add new field' })).not.toBeInTheDocument();
});
