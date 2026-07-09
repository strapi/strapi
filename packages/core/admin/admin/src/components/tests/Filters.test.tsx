import { fireEvent, render as renderRTL, screen, waitFor } from '@tests/utils';
import { useLocation } from 'react-router-dom';

import { Filters } from '../Filters';
import { useField } from '../Form';

import type { InputProps } from '../FormInputs/types';
import type { RenderOptions } from '@tests/utils';

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
  {
    name: 'updatedAt',
    label: 'Updated At',
    type: 'datetime',
  },
] satisfies Filters.Filter[];

const LocationDisplay = () => {
  const location = useLocation();

  return <input aria-label="location" data-testid="location" readOnly value={location.search} />;
};

const DateTimeTextInput = ({ 'aria-label': ariaLabel, label, name }: InputProps) => {
  const field = useField<string>(name);

  return (
    <input
      aria-label={ariaLabel ?? label ?? name}
      name={name}
      onChange={(event) => field.onChange(name, event.target.value)}
      value={field.value ?? ''}
    />
  );
};

describe('Filters', () => {
  const render = ({ initialEntries, ...props }: Partial<Filters.Props> & RenderOptions = {}) =>
    renderRTL(
      <>
        <Filters.Root options={DEFAULT_FILTERS} {...props}>
          <Filters.Trigger />
          <Filters.Popover />
          <Filters.List />
        </Filters.Root>
        <LocationDisplay />
      </>,
      { initialEntries }
    );

  const renderWithTextDateTimeInput = (props: Partial<Filters.Props> & RenderOptions = {}) =>
    render({
      ...props,
      options: DEFAULT_FILTERS.map((filter) =>
        filter.name === 'updatedAt' ? { ...filter, input: DateTimeTextInput } : filter
      ),
    });

  const getDayRange = (value: string) => {
    const start = new Date(value);
    start.setHours(0, 0, 0, 0);

    const end = new Date(start);
    end.setDate(end.getDate() + 1);

    return { start: start.toISOString(), end: end.toISOString() };
  };

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

  it('should not render the popover content when no filters are provided', async () => {
    const { user } = render({ options: [] });

    await user.click(screen.getByRole('button', { name: 'Filters' }));

    expect(screen.queryByRole('combobox', { name: 'Select field' })).not.toBeInTheDocument();
    expect(screen.queryByRole('combobox', { name: 'Select filter' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Add filter' })).not.toBeInTheDocument();
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

  it('should convert exact datetime equality filters to a day range', async () => {
    const { user } = renderWithTextDateTimeInput();
    const selectedDate = '2026-06-13T10:15:00.000Z';
    const { start, end } = getDayRange(selectedDate);

    await user.click(screen.getByRole('button', { name: 'Filters' }));
    await user.click(await screen.findByRole('combobox', { name: 'Select field' }));
    await user.click(await screen.findByRole('option', { name: 'Updated At' }));
    await user.click(await screen.findByRole('combobox', { name: 'Select filter' }));

    expect(await screen.findByRole('option', { name: 'is' })).toBeInTheDocument();
    expect(await screen.findByRole('option', { name: 'is not' })).toBeInTheDocument();
    expect(await screen.findByRole('option', { name: 'is null' })).toBeInTheDocument();
    expect(await screen.findByRole('option', { name: 'is greater than' })).toBeInTheDocument();

    await user.click(screen.getByRole('option', { name: 'is' }));
    await user.type(screen.getByRole('textbox', { name: 'Updated At' }), selectedDate);
    fireEvent.click(screen.getByRole('button', { name: 'Add filter' }));

    await waitFor(() =>
      expect(screen.getByTestId('location')).toHaveValue(
        expect.stringContaining('filters[$and][0][updatedAt][$gte]')
      )
    );

    const search = screen.getByTestId('location').getAttribute('value') ?? '';
    const searchParams = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search);

    expect(searchParams.get('filters[$and][0][updatedAt][$gte]')).toEqual(start);
    expect(searchParams.get('filters[$and][0][updatedAt][$lt]')).toEqual(end);
    expect(searchParams.has('filters[$and][0][updatedAt][$eq]')).toBe(false);
    expect(await screen.findByText(/Updated At \$eq/)).toBeInTheDocument();
  });

  it('should convert exact datetime non-equality filters to an outside-day range', async () => {
    const { user } = renderWithTextDateTimeInput();
    const selectedDate = '2026-06-13T10:15:00.000Z';
    const { start, end } = getDayRange(selectedDate);

    await user.click(screen.getByRole('button', { name: 'Filters' }));
    await user.click(await screen.findByRole('combobox', { name: 'Select field' }));
    await user.click(await screen.findByRole('option', { name: 'Updated At' }));
    await user.click(await screen.findByRole('combobox', { name: 'Select filter' }));
    await user.click(await screen.findByRole('option', { name: 'is not' }));
    await user.type(screen.getByRole('textbox', { name: 'Updated At' }), selectedDate);
    fireEvent.click(screen.getByRole('button', { name: 'Add filter' }));

    await waitFor(() =>
      expect(screen.getByTestId('location')).toHaveValue(
        expect.stringContaining('filters[$and][0][$or][0][updatedAt][$lt]')
      )
    );

    const search = screen.getByTestId('location').getAttribute('value') ?? '';
    const searchParams = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search);

    expect(searchParams.get('filters[$and][0][$or][0][updatedAt][$lt]')).toEqual(start);
    expect(searchParams.get('filters[$and][0][$or][1][updatedAt][$gte]')).toEqual(end);
    expect(searchParams.has('filters[$and][0][updatedAt][$ne]')).toBe(false);
    expect(await screen.findByText(/Updated At \$ne/)).toBeInTheDocument();
  });

  it('should reset the operator and value when changing fields', async () => {
    const { user } = renderWithTextDateTimeInput();

    await user.click(screen.getByRole('button', { name: 'Filters' }));
    await user.type(await screen.findByRole('textbox', { name: 'Name' }), 'Jimbob');
    await user.click(await screen.findByRole('combobox', { name: 'Select field' }));
    await user.click(await screen.findByRole('option', { name: 'Updated At' }));

    expect(await screen.findByRole('combobox', { name: 'Select filter' })).toHaveTextContent('is');
    expect(screen.queryByRole('textbox', { name: 'Name' })).not.toBeInTheDocument();
    expect(screen.getByLabelText('Updated At')).toBeInTheDocument();

    await user.type(screen.getByLabelText('Updated At'), '2026-06-13T10:15:00.000Z');
    fireEvent.click(screen.getByRole('button', { name: 'Add filter' }));

    await screen.findByText(/Updated At \$eq/);
    expect(screen.queryByText(/Jimbob/)).not.toBeInTheDocument();
  });

  it('should remove a generated datetime range as one filter', async () => {
    const selectedDate = '2026-06-13T10:15:00.000Z';
    const { start, end } = getDayRange(selectedDate);
    render({
      initialEntries: [
        {
          pathname: '/',
          search:
            `filters[$and][0][updatedAt][$gte]=${encodeURIComponent(start)}&` +
            `filters[$and][0][updatedAt][$lt]=${encodeURIComponent(end)}&` +
            'page=1',
        },
      ],
    });

    fireEvent.click(await screen.findByRole('button', { name: /Updated At \$eq/ }));

    await waitFor(() => expect(screen.queryByText(/Updated At \$eq/)).not.toBeInTheDocument());
    expect(screen.getByTestId('location')).toHaveValue('?page=1');
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
