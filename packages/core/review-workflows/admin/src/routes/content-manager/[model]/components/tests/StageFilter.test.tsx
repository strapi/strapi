import { Form } from '@strapi/admin/strapi-admin';
import { render as renderRTL, screen } from '@tests/utils';
import { Route, Routes } from 'react-router-dom';

import { StageFilter, StageFilterProps } from '../StageFilter';

/**
 * Filters are not currently supported
 */
describe.skip('StageFilter', () => {
  const render = (props?: Partial<StageFilterProps>) =>
    renderRTL(
      <StageFilter aria-label="Pick a stage" type="enumeration" name="stage" {...props} />,
      {
        initialEntries: ['/content-manager/collection-types/api::address.address'],
        renderOptions: {
          wrapper({ children }) {
            return (
              <Routes>
                <Route
                  path="/content-manager/:collectionType/:slug"
                  element={
                    <Form method="PUT" initialValues={{ stage: '' }}>
                      {children}
                    </Form>
                  }
                />
              </Routes>
            );
          },
        },
      }
    );
  it('should display stages', async () => {
    const { user } = render();

    await user.click(screen.getByRole('combobox'));

    await screen.findByText('To Review');
  });

  it('should use the stage name as filter value', async () => {
    const { user } = render();

    await user.click(screen.getByRole('combobox'));
    await user.click(screen.getByRole('option', { name: 'To Review' }));

    expect(screen.getByRole('combobox')).toHaveTextContent('To Review');
  });
});
