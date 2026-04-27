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

    const selectFieldCombobox = await screen.findByRole('combobox', { name: 'Select field' });
    expect(selectFieldCombobox).toBeInTheDocument();
    expect(selectFieldCombobox).toHaveTextContent('Name');
    const selectFilterCombobox = await screen.findByRole('combobox', { name: 'Select filter' });
    expect(selectFilterCombobox).toBeInTheDocument();
    expect(selectFilterCombobox).toHaveTextContent('is');
    expect(await screen.findByRole('textbox', { name: 'Name' })).toBeInTheDocument();
    const addFilterButton = await screen.findByRole('button', { name: 'Add filter' });
    expect(addFilterButton).toBeInTheDocument();
    expect(addFilterButton).toBeDisabled();
  });

  it("should add a filter to the list when the 'Add filter' button is clicked & close the popover", async () => {
    const { user } = render();

    await user.click(screen.getByRole('button', { name: 'Filters' }));
    await user.type(await screen.findByRole('textbox', { name: 'Name' }), 'Jimbob');
    fireEvent.click(await screen.findByRole('button', { name: 'Add filter' }));

    await screen.findByText('Name $eq Jimbob');

    expect(screen.queryByRole('combobox', { name: 'Select field' })).not.toBeInTheDocument();
    expect(screen.queryByRole('combobox', { name: 'Select filter' })).not.toBeInTheDocument();
    expect(screen.queryByRole('textbox', { name: 'Name' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Add filter' })).not.toBeInTheDocument();
  });

  it("should remove a filter from the list when the 'Remove filter' button is clicked", async () => {
    const { user } = render();

    await user.click(screen.getByRole('button', { name: 'Filters' }));
    await user.type(await screen.findByRole('textbox', { name: 'Name' }), 'Jimbob');
    fireEvent.click(await screen.findByRole('button', { name: 'Add filter' }));

    await screen.findByText('Name $eq Jimbob');

    const removeButton = screen.getByRole('button', { name: 'Name $eq Jimbob' });
    fireEvent.click(removeButton);

    await waitFor(() => expect(screen.queryByText('Name $eq Jimbob')).not.toBeInTheDocument());
  });

  it('should display a list of the filter names when the combobox named Select field is pressed', async () => {
    const { user } = render();

    await user.click(screen.getByRole('button', { name: 'Filters' }));
    await user.click(await screen.findByRole('combobox', { name: 'Select field' }));

    expect(await screen.findByRole('option', { name: 'Name' })).toBeInTheDocument();
    expect(await screen.findByRole('option', { name: 'Status' })).toBeInTheDocument();
    expect(await screen.findByRole('option', { name: 'Created At' })).toBeInTheDocument();
  });

  it("should display a list of the operators when the combobox named Select filter is pressed & the 'Status' filter is selected", async () => {
    const { user } = render();

    await user.click(screen.getByRole('button', { name: 'Filters' }));
    await user.click(await screen.findByRole('combobox', { name: 'Select field' }));
    await user.click(await screen.findByRole('option', { name: 'Status' }));
    await user.click(await screen.findByRole('combobox', { name: 'Select filter' }));

    expect(await screen.findByRole('option', { name: 'is' })).toBeInTheDocument();
    expect(await screen.findByRole('option', { name: 'is not' })).toBeInTheDocument();
  });

  it('should correctly show the options passed to an enumeration type filter', async () => {
    const { user } = render();

    await user.click(screen.getByRole('button', { name: 'Filters' }));
    await user.click(await screen.findByRole('combobox', { name: 'Select field' }));
    await user.click(await screen.findByRole('option', { name: 'Status' }));
    await user.click(await screen.findByRole('combobox', { name: 'Status' }));

    expect(await screen.findByRole('option', { name: 'Draft' })).toBeInTheDocument();
    expect(await screen.findByRole('option', { name: 'Modified' })).toBeInTheDocument();
    expect(await screen.findByRole('option', { name: 'Published' })).toBeInTheDocument();
  });

  it('should replace existing filter when editing instead of adding a duplicate', async () => {
    const { user } = render();

    await user.click(screen.getByRole('button', { name: 'Filters' }));
    await user.type(screen.getByRole('textbox', { name: 'Name' }), 'Jimbob');
    fireEvent.click(screen.getByRole('button', { name: 'Add filter' }));

    const filterTagWithJimbob = await screen.findByText(/Jimbob/);
    await user.click(filterTagWithJimbob);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Update filter' })).toBeInTheDocument();
    });

    const nameInput = screen.getByRole('textbox', { name: 'Name' });
    await user.clear(nameInput);
    await user.type(nameInput, 'Jane');
    fireEvent.click(screen.getByRole('button', { name: 'Update filter' }));

    await waitFor(() => {
      expect(screen.getByText(/Jane/)).toBeInTheDocument();
    });
    expect(screen.queryByText(/Jimbob/)).not.toBeInTheDocument();
    expect(screen.queryAllByText(/Jane/)).toHaveLength(1);
  });

  it('should correctly match filter when value is URL-encoded (decoded comparison)', async () => {
    const { user } = render();

    await user.click(screen.getByRole('button', { name: 'Filters' }));
    await user.type(screen.getByRole('textbox', { name: 'Name' }), 'hello world');
    fireEvent.click(screen.getByRole('button', { name: 'Add filter' }));

    const filterTag = await screen.findByText(/hello world/);
    await user.click(filterTag);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Update filter' })).toBeInTheDocument();
    });

    const nameInput = screen.getByRole('textbox', { name: 'Name' });
    await user.clear(nameInput);
    await user.type(nameInput, 'hello there');
    fireEvent.click(screen.getByRole('button', { name: 'Update filter' }));

    await waitFor(() => {
      expect(screen.getByText(/hello there/)).toBeInTheDocument();
    });
    expect(screen.queryByText(/hello world/)).not.toBeInTheDocument();
    expect(screen.queryAllByText(/hello there/)).toHaveLength(1);
  });
});
