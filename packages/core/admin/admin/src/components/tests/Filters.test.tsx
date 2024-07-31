import { fireEvent, render as renderRTL, screen, waitFor } from '@tests/utils';

import { Filters } from '../Filters';

const DEFAULT_FILTERS = [
  {
    name: 'name',
    label: 'Name',
    type: 'string',
  },
  {
    name: 'status',
    label: 'Status',
    options: [
      { label: 'Draft', value: 'draft' },
      { label: 'Modified', value: 'modified' },
      { label: 'Published', value: 'published' },
    ],
    type: 'enumeration',
  },
  {
    name: 'createdAt',
    label: 'Created At',
    type: 'date',
  },
] satisfies Filters.Filter[];

describe('Filters', () => {
  const render = (props?: Partial<Filters.Props>) =>
    renderRTL(
      <Filters.Root options={DEFAULT_FILTERS} {...props}>
        <Filters.Trigger />
        <Filters.Popover />
        <Filters.List />
      </Filters.Root>
    );

  it('should open the popover when the trigger is clicked', async () => {
    const { user } = render();

    expect(screen.getByRole('button', { name: 'Filters' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Filters' }));

    expect(screen.getByRole('combobox', { name: 'Select field' })).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'Select field' })).toHaveTextContent('Name');
    expect(screen.getByRole('combobox', { name: 'Select filter' })).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'Select filter' })).toHaveTextContent('is');
    expect(screen.getByRole('textbox', { name: 'Name' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Add filter' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Add filter' })).toBeDisabled();
  });

  it("should add a filter to the list when the 'Add filter' button is clicked & close the popover", async () => {
    const { user } = render();

    await user.click(screen.getByRole('button', { name: 'Filters' }));
    await user.type(screen.getByRole('textbox', { name: 'Name' }), 'Jimbob');
    fireEvent.click(screen.getByRole('button', { name: 'Add filter' }));

    await screen.findByText('Name $eq Jimbob');

    expect(screen.queryByRole('combobox', { name: 'Select field' })).not.toBeInTheDocument();
    expect(screen.queryByRole('combobox', { name: 'Select filter' })).not.toBeInTheDocument();
    expect(screen.queryByRole('textbox', { name: 'Name' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Add filter' })).not.toBeInTheDocument();
  });

  it("should remove a filter from the list when the 'Remove filter' button is clicked", async () => {
    const { user } = render();

    await user.click(screen.getByRole('button', { name: 'Filters' }));
    await user.type(screen.getByRole('textbox', { name: 'Name' }), 'Jimbob');
    fireEvent.click(screen.getByRole('button', { name: 'Add filter' }));

    const filter = await screen.findByText('Name $eq Jimbob');

    fireEvent.click(filter);

    await waitFor(() =>
      expect(screen.queryByRole('button', { name: 'Name $eq Jimbob' })).not.toBeInTheDocument()
    );
  });

  it('should display a list of the filter names when the combobox named Select field is pressed', async () => {
    const { user } = render();

    await user.click(screen.getByRole('button', { name: 'Filters' }));
    await user.click(screen.getByRole('combobox', { name: 'Select field' }));

    expect(screen.getByRole('option', { name: 'Name' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Status' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Created At' })).toBeInTheDocument();
  });

  it("should display a list of the operators when the combobox named Select filter is pressed & the 'Status' filter is selected", async () => {
    const { user } = render();

    await user.click(screen.getByRole('button', { name: 'Filters' }));
    await user.click(screen.getByRole('combobox', { name: 'Select field' }));
    await user.click(screen.getByRole('option', { name: 'Status' }));
    await user.click(screen.getByRole('combobox', { name: 'Select filter' }));

    expect(screen.getByRole('option', { name: 'is' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'is not' })).toBeInTheDocument();
  });

  it('should correctly show the options passed to an enumeration type filter', async () => {
    const { user } = render();

    await user.click(screen.getByRole('button', { name: 'Filters' }));
    await user.click(screen.getByRole('combobox', { name: 'Select field' }));
    await user.click(screen.getByRole('option', { name: 'Status' }));
    await user.click(screen.getByRole('combobox', { name: 'Status' }));

    expect(screen.getByRole('option', { name: 'Draft' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Modified' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Published' })).toBeInTheDocument();
  });
});
