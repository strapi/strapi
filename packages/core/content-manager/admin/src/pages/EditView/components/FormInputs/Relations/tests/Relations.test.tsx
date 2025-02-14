import { Form } from '@strapi/admin/strapi-admin';
import { RenderOptions, fireEvent, render as renderRTL, screen } from '@tests/utils';
import { Route, Routes } from 'react-router-dom';

import { RelationsInput, RelationsFieldProps } from '../Relations';

const render = ({
  initialEntries,
  ...props
}: Partial<RelationsFieldProps> & Pick<RenderOptions, 'initialEntries'> = {}) =>
  renderRTL(
    <RelationsInput
      attribute={{
        type: 'relation',
        relation: 'manyToMany',
        target: 'api::category.category',
        inversedBy: 'relation_locales',
        // @ts-expect-error – this is what the API returns
        targetModel: 'api::category.category',
        relationType: 'manyToMany',
      }}
      label="relations"
      mainField={{ name: 'name', type: 'string' }}
      name="relations"
      type="relation"
      {...props}
    />,
    {
      renderOptions: {
        wrapper: ({ children }) => (
          <Routes>
            <Route
              path="/content-manager/:collectionType/:slug/:id"
              element={
                <Form
                  method="PUT"
                  initialValues={{
                    relations: {
                      connect: [],
                      disconnect: [],
                    },
                  }}
                >
                  {children}
                </Form>
              }
            />
          </Routes>
        ),
      },
      initialEntries: initialEntries ?? [
        '/content-manager/collection-types/api::address.address/12345',
      ],
    }
  );

describe('Relations', () => {
  /**
   * TODO: for some reason, we're not getting any data from MSW.
   */
  it.skip('should by default render just the combobox', async () => {
    const { user } = render({
      initialEntries: ['/content-manager/collection-types/api::address.address/create'],
    });

    expect(screen.getByLabelText('relations')).toBe(screen.getByRole('combobox'));

    await user.click(screen.getByRole('combobox'));

    expect(await screen.findAllByRole('option')).toHaveLength(3);
  });

  it('should by render the relations list when there is data from the API', async () => {
    render();

    expect(screen.getByLabelText('relations')).toBe(screen.getByRole('combobox'));
    expect(await screen.findAllByRole('listitem')).toHaveLength(3);

    expect(screen.getByLabelText('relations (3)')).toBe(screen.getByRole('combobox'));

    expect(screen.getByRole('link', { name: 'Relation entity 1' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Relation entity 2' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Relation entity 3' })).toBeInTheDocument();
  });

  it('should be disabled when the prop is passed', async () => {
    render({ disabled: true });

    expect(await screen.findAllByRole('listitem')).toHaveLength(3);

    expect(screen.getByRole('combobox')).toBeDisabled();
  });

  it('should render a hint when the prop is passed', async () => {
    render({ hint: 'This is a hint' });

    expect(await screen.findAllByRole('listitem')).toHaveLength(3);

    expect(screen.getByText('This is a hint')).toBeInTheDocument();
  });

  it.todo(
    'should show the load more button when the is a pageCount greater than 1 of the fetched data and fetch more data when pressed'
  );

  it.todo('should connect a relation');

  it.todo('should disconnect a relation');

  describe.skip('Accessibility', () => {
    it('should have have description text', () => {
      const { getByText } = render();

      expect(getByText('Press spacebar to grab and re-order')).toBeInTheDocument();
    });

    it('should update the live text when an item has been grabbed', async () => {
      const { getByText, getAllByText } = render();

      const [draggedItem] = getAllByText('Drag');

      fireEvent.keyDown(draggedItem, { key: ' ', code: 'Space' });

      expect(
        getByText(/Press up and down arrow to change position, Spacebar to drop, Escape to cancel/)
      ).toBeInTheDocument();
    });

    it('should change the live text when an item has been moved', () => {
      const { getByText, getAllByText } = render();

      const [draggedItem] = getAllByText('Drag');

      fireEvent.keyDown(draggedItem, { key: ' ', code: 'Space' });
      fireEvent.keyDown(draggedItem, { key: 'ArrowDown', code: 'ArrowDown' });

      expect(getByText(/New position in list/)).toBeInTheDocument();
    });

    it('should change the live text when an item has been dropped', () => {
      const { getByText, getAllByText } = render();

      const [draggedItem] = getAllByText('Drag');

      fireEvent.keyDown(draggedItem, { key: ' ', code: 'Space' });
      fireEvent.keyDown(draggedItem, { key: 'ArrowDown', code: 'ArrowDown' });
      fireEvent.keyDown(draggedItem, { key: ' ', code: 'Space' });

      expect(getByText(/Final position in list/)).toBeInTheDocument();
    });

    it('should change the live text after the reordering interaction has been cancelled', () => {
      const { getAllByText, getByText } = render();

      const [draggedItem] = getAllByText('Drag');

      fireEvent.keyDown(draggedItem, { key: ' ', code: 'Space' });
      fireEvent.keyDown(draggedItem, { key: 'Escape', code: 'Escape' });

      expect(getByText(/Re-order cancelled/)).toBeInTheDocument();
    });
  });
});
