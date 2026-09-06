import { render, screen } from '@strapi/admin/strapi-admin/test';

import { TabForm } from '../TabForm';

describe('CTB | TabForm', () => {
  it('treats a null condition value as no condition', () => {
    render(
      <TabForm
        form={[
          {
            sectionTitle: null,
            items: [
              {
                name: 'conditions',
                type: 'condition-form',
                intlLabel: { id: 'conditions', defaultMessage: 'Conditions' },
              },
            ],
          },
        ]}
        formErrors={{}}
        genericInputProps={{
          attributeName: 'subtitle',
          contentTypeSchema: {
            attributes: [{ name: 'isFeatured', type: 'boolean' }],
          },
        }}
        modifiedData={{ name: 'subtitle', conditions: null }}
        onChange={jest.fn()}
      />
    );

    expect(screen.getByRole('button', { name: /apply condition/i })).toBeInTheDocument();
  });
});
