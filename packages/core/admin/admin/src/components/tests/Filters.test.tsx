import { fireEvent, render as renderRTL, screen, waitFor } from '@tests/utils';
import { useLocation } from 'react-router-dom';

import { Filters } from '../Filters';

/**
 * Captures the current query string so tests can assert that the rendered chips and the
 * `$and` array in the URL agree.
 *
 * Deliberately renders nothing: putting the query string in the DOM makes text queries
 * like `findByText(/Jimbob/)` match both the chip and the spy.
 */
let currentSearch = '';

const LocationSpy = () => {
  currentSearch = useLocation().search;

  return null;
};

const getAppliedFilters = () => {
  const params = new URLSearchParams(currentSearch);

  return [...params.keys()].filter((key) => key.startsWith('filters[$and]'));
};

/**
 * The `$and` entries as `key=value` pairs, so a test can assert *which* entry changed
 * rather than only how many there are.
 */
const getAppliedFilterEntries = () => {
  const params = new URLSearchParams(currentSearch);

  return [...params.entries()]
    .filter(([key]) => key.startsWith('filters[$and]'))
    .map(([key, value]) => `${key}=${value}`);
};

beforeEach(() => {
  currentSearch = '';
});

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
    name: 'author',
    label: 'Author',
    mainField: { name: 'name', type: 'string' },
    type: 'relation',
  },
] satisfies Filters.Filter[];

describe('Filters', () => {
  const render = (props?: Partial<Filters.Props>) =>
    renderRTL(
      <Filters.Root options={DEFAULT_FILTERS} {...props}>
        <Filters.Trigger />
        <Filters.Popover />
        <Filters.List />
        <LocationSpy />
      </Filters.Root>
    );

  /**
   * Adds `Status is <option>` through the popover, the same way a user would.
   */
  const addStatusFilter = async (user: ReturnType<typeof render>['user'], option: string) => {
    await user.click(screen.getByRole('button', { name: 'Filters' }));
    await user.click(await screen.findByRole('combobox', { name: 'Select field' }));
    await user.click(await screen.findByRole('option', { name: 'Status' }));
    await user.click(await screen.findByRole('combobox', { name: 'Status' }));
    await user.click(await screen.findByRole('option', { name: option }));
    fireEvent.click(await screen.findByRole('button', { name: 'Add filter' }));

    await waitFor(() => {
      expect(screen.queryByRole('button', { name: 'Add filter' })).not.toBeInTheDocument();
    });
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

  /**
   * EE-75 — duplicate filter chips.
   *
   * Filter entries used to be identified by their `(name, operator, value)` tuple rather than
   * by their position in the `$and` array. Because two identical filters are a legal query,
   * the tuple did not uniquely identify an entry: one ✕ click removed every copy, and the
   * duplicate React keys left a phantom chip behind.
   */
  describe('duplicate filters (EE-75)', () => {
    it('should remove only the clicked chip when two identical filters are applied', async () => {
      const { user } = render();

      await addStatusFilter(user, 'Draft');
      await addStatusFilter(user, 'Draft');

      await waitFor(() => {
        expect(screen.queryAllByText('Status $eq draft')).toHaveLength(2);
      });
      expect(getAppliedFilters()).toHaveLength(2);

      // ✕ the first of the two identical chips
      fireEvent.click(screen.getAllByRole('button', { name: 'Status $eq draft' })[0]);

      await waitFor(() => {
        expect(screen.queryAllByText('Status $eq draft')).toHaveLength(1);
      });
      expect(getAppliedFilters()).toHaveLength(1);
    });

    it('should keep the chips in sync with the query while removing them one at a time', async () => {
      const { user } = render();

      // The issue's exact repro: the same filter added twice, with others in between.
      await addStatusFilter(user, 'Draft');
      await addStatusFilter(user, 'Modified');
      await addStatusFilter(user, 'Published');
      await addStatusFilter(user, 'Draft');

      await waitFor(() => {
        expect(getAppliedFilters()).toHaveLength(4);
      });

      // Removing the first `draft` must drop exactly one entry, not both copies.
      fireEvent.click(screen.getAllByRole('button', { name: 'Status $eq draft' })[0]);

      await waitFor(() => {
        expect(getAppliedFilters()).toHaveLength(3);
      });
      // Chips and query must agree — this is where the phantom chip used to appear.
      expect(screen.queryAllByText(/^Status \$eq/)).toHaveLength(3);

      fireEvent.click(screen.getByRole('button', { name: 'Status $eq modified' }));

      await waitFor(() => {
        expect(getAppliedFilters()).toHaveLength(2);
      });
      expect(screen.queryAllByText(/^Status \$eq/)).toHaveLength(2);

      fireEvent.click(screen.getByRole('button', { name: 'Status $eq published' }));

      await waitFor(() => {
        expect(getAppliedFilters()).toHaveLength(1);
      });
      expect(screen.queryAllByText(/^Status \$eq/)).toHaveLength(1);
      expect(screen.getByText('Status $eq draft')).toBeInTheDocument();
    });

    it('should leave no phantom chip once every filter has been removed', async () => {
      const { user } = render();

      await addStatusFilter(user, 'Draft');
      await addStatusFilter(user, 'Draft');

      await waitFor(() => {
        expect(getAppliedFilters()).toHaveLength(2);
      });

      fireEvent.click(screen.getAllByRole('button', { name: 'Status $eq draft' })[0]);
      await waitFor(() => {
        expect(getAppliedFilters()).toHaveLength(1);
      });

      fireEvent.click(screen.getByRole('button', { name: 'Status $eq draft' }));

      // Zero filters in the URL *and* zero chips on screen.
      await waitFor(() => {
        expect(getAppliedFilters()).toHaveLength(0);
      });
      expect(screen.queryByText(/^Status \$eq/)).not.toBeInTheDocument();
    });

    it('should edit only the clicked chip when two identical filters are applied', async () => {
      const { user } = render();

      await addStatusFilter(user, 'Draft');
      await addStatusFilter(user, 'Draft');

      await waitFor(() => {
        expect(screen.queryAllByText('Status $eq draft')).toHaveLength(2);
      });

      // Click the chip body (not the ✕) to edit the first duplicate.
      await user.click(screen.getAllByText('Status $eq draft')[0]);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Update filter' })).toBeInTheDocument();
      });

      await user.click(await screen.findByRole('combobox', { name: 'Status' }));
      await user.click(await screen.findByRole('option', { name: 'Published' }));
      fireEvent.click(screen.getByRole('button', { name: 'Update filter' }));

      // The clicked entry changed and the other kept its original value & position.
      await waitFor(() => {
        expect(screen.getByText('Status $eq published')).toBeInTheDocument();
      });
      expect(screen.queryAllByText('Status $eq draft')).toHaveLength(1);
      expect(getAppliedFilterEntries()).toEqual([
        'filters[$and][0][status][$eq]=published',
        'filters[$and][1][status][$eq]=draft',
      ]);
    });

    it('should handle a URL that already contains duplicate filters', async () => {
      // A shared link or bookmark — this path never goes through `handleSubmit`.
      renderRTL(
        <Filters.Root options={DEFAULT_FILTERS}>
          <Filters.Trigger />
          <Filters.Popover />
          <Filters.List />
          <LocationSpy />
        </Filters.Root>,
        {
          initialEntries: [
            '/?filters[$and][0][status][$eq]=draft&filters[$and][1][status][$eq]=draft',
          ],
        }
      );

      await waitFor(() => {
        expect(screen.queryAllByText('Status $eq draft')).toHaveLength(2);
      });

      fireEvent.click(screen.getAllByRole('button', { name: 'Status $eq draft' })[0]);

      await waitFor(() => {
        expect(screen.queryAllByText('Status $eq draft')).toHaveLength(1);
      });
      expect(getAppliedFilters()).toHaveLength(1);
    });

    it('should remove one of two identical relation filters', async () => {
      // Relation entries nest the operator under `mainField`, so they exercise a different
      // branch of `getFilterDetails` than scalar filters.
      renderRTL(
        <Filters.Root options={DEFAULT_FILTERS}>
          <Filters.Trigger />
          <Filters.Popover />
          <Filters.List />
          <LocationSpy />
        </Filters.Root>,
        {
          initialEntries: [
            '/?filters[$and][0][author][name][$eq]=Bob&filters[$and][1][author][name][$eq]=Bob',
          ],
        }
      );

      await waitFor(() => {
        expect(screen.queryAllByText('Author $eq Bob')).toHaveLength(2);
      });

      fireEvent.click(screen.getAllByRole('button', { name: 'Author $eq Bob' })[0]);

      await waitFor(() => {
        expect(screen.queryAllByText('Author $eq Bob')).toHaveLength(1);
      });
      expect(getAppliedFilterEntries()).toEqual(['filters[$and][0][author][name][$eq]=Bob']);
    });

    it('should edit one of two identical $null filters without touching the other', async () => {
      // `$null`/`$notNull` carry no value, so the deleted `isFilterMatch` matched them on
      // `(name, operator)` alone — duplicates were maximally ambiguous.
      const { user } = renderRTL(
        <Filters.Root options={DEFAULT_FILTERS}>
          <Filters.Trigger />
          <Filters.Popover />
          <Filters.List />
          <LocationSpy />
        </Filters.Root>,
        {
          initialEntries: [
            '/?filters[$and][0][name][$null]=true&filters[$and][1][name][$null]=true',
          ],
        }
      );

      await waitFor(() => {
        expect(screen.queryAllByText('Name $null')).toHaveLength(2);
      });

      // Edit the first of the two, switching it to `is not null`.
      await user.click(screen.getAllByText('Name $null')[0]);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Update filter' })).toBeInTheDocument();
      });

      await user.click(await screen.findByRole('combobox', { name: 'Select filter' }));
      await user.click(await screen.findByRole('option', { name: 'is not null' }));
      fireEvent.click(screen.getByRole('button', { name: 'Update filter' }));

      await waitFor(() => {
        expect(getAppliedFilterEntries()).toEqual([
          'filters[$and][0][name][$notNull]=true',
          'filters[$and][1][name][$null]=true',
        ]);
      });
    });

    it('should remove one of two identical chips rendered by a custom input', async () => {
      // Custom inputs resolve the chip label through their own `options`, a separate code path
      // from the default renderer.
      const CUSTOM_FILTERS = [
        {
          name: 'owner',
          label: 'Owner',
          input: () => null,
          options: [{ label: 'Ada Lovelace', value: 'ada' }],
          type: 'enumeration',
        },
      ] satisfies Filters.Filter[];

      renderRTL(
        <Filters.Root options={CUSTOM_FILTERS}>
          <Filters.Trigger />
          <Filters.Popover />
          <Filters.List />
          <LocationSpy />
        </Filters.Root>,
        {
          initialEntries: ['/?filters[$and][0][owner][$eq]=ada&filters[$and][1][owner][$eq]=ada'],
        }
      );

      await waitFor(() => {
        expect(screen.queryAllByText('Owner $eq Ada Lovelace')).toHaveLength(2);
      });

      fireEvent.click(screen.getAllByRole('button', { name: 'Owner $eq Ada Lovelace' })[0]);

      await waitFor(() => {
        expect(screen.queryAllByText('Owner $eq Ada Lovelace')).toHaveLength(1);
      });
      expect(getAppliedFilters()).toHaveLength(1);
    });
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
