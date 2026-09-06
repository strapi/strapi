import { render, screen, waitFor } from '@tests/utils';
import { useLocation } from 'react-router-dom';

import { Table } from '../Table';

type MockRow = { id: number; short_text: string };
type MockHeader = Table.Header<MockRow, object>;

const mockHeaders = [
  {
    name: 'id',
    label: 'id',
    sortable: true,
  },
  {
    name: 'short_text',
    label: 'short_text',
    sortable: true,
  },
] as const satisfies MockHeader[];

const mockRows: MockRow[] = [
  { id: 1, short_text: 'hello' },
  { id: 2, short_text: 'there' },
];

const LocationDisplay = () => {
  const location = useLocation();

  return <div data-testid="location">{location.search}</div>;
};

describe('Table', () => {
  it('should render with content', () => {
    render(
      <Table.Root rows={[]} headers={mockHeaders} isLoading={false}>
        <Table.Content>
          <tbody>
            <tr>
              <td>content</td>
            </tr>
          </tbody>
        </Table.Content>
      </Table.Root>
    );

    expect(screen.getByRole('cell', { name: 'content' })).toBeInTheDocument();
    expect(screen.queryByText('Loading content')).not.toBeInTheDocument();
  });

  it('should render with loading body', () => {
    render(
      <Table.Root rows={[]} headers={mockHeaders} isLoading={true}>
        <Table.Content>
          <Table.Loading />
        </Table.Content>
      </Table.Root>
    );

    expect(screen.getByText('Loading content')).toBeInTheDocument();
  });

  it('should render with empty body', () => {
    render(
      <Table.Root rows={[]} headers={mockHeaders} isLoading={false}>
        <Table.Content>
          <Table.Empty />
        </Table.Content>
      </Table.Root>
    );

    expect(screen.getByText('No content found')).toBeInTheDocument();
  });

  it('should render table data succesfully', () => {
    render(
      <Table.Root rows={mockRows} headers={mockHeaders} isLoading={false}>
        <Table.Content>
          <Table.Head>
            {/* Bulk action select all checkbox */}
            <Table.HeaderCheckboxCell />
            {mockHeaders.map((header) => (
              <Table.HeaderCell key={header.name} {...header} />
            ))}
          </Table.Head>
          <Table.Body>
            {mockRows.map((row) => (
              <Table.Row key={row.id}>
                <Table.Cell>{row.id}</Table.Cell>
                <Table.Cell>{row.short_text}</Table.Cell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table.Content>
      </Table.Root>
    );

    expect(screen.getByRole('checkbox', { name: 'Select all entries' })).toBeInTheDocument();

    expect(screen.getByRole('gridcell', { name: '1' })).toBeInTheDocument();
    expect(screen.getByRole('gridcell', { name: 'hello' })).toBeInTheDocument();
    expect(screen.getByRole('gridcell', { name: '2' })).toBeInTheDocument();
    expect(screen.getByRole('gridcell', { name: 'there' })).toBeInTheDocument();
  });

  const renderSortableHeaders = (search: string) =>
    render(
      <Table.Root rows={mockRows} headers={mockHeaders} isLoading={false}>
        <Table.Content>
          <Table.Head>
            {mockHeaders.map((header) => (
              <Table.HeaderCell key={header.name} {...header} />
            ))}
          </Table.Head>
          <Table.Body>
            {mockRows.map((row) => (
              <Table.Row key={row.id}>
                <Table.Cell>{row.id}</Table.Cell>
                <Table.Cell>{row.short_text}</Table.Cell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table.Content>
      </Table.Root>,
      {
        initialEntries: [{ search }],
        renderOptions: {
          wrapper({ children }) {
            return (
              <>
                {children}
                <LocationDisplay />
              </>
            );
          },
        },
      }
    );

  it('should keep an applied filter containing an ampersand when sorting', async () => {
    const encoded = `filters[$and][0][name][$eq]=${encodeURIComponent('a&b')}`;
    const { user } = renderSortableHeaders(`?${encoded}`);

    await user.click(screen.getByRole('gridcell', { name: 'id' }));

    await waitFor(() => {
      expect(screen.getByTestId('location')).toHaveTextContent('sort=id:ASC');
    });

    expect(screen.getByTestId('location')).toHaveTextContent(encoded);
  });

  it('should keep a search term containing an ampersand when sorting', async () => {
    const encoded = `_q=${encodeURIComponent('R&D')}`;
    const { user } = renderSortableHeaders(`?${encoded}`);

    await user.click(screen.getByRole('gridcell', { name: 'id' }));

    await waitFor(() => {
      expect(screen.getByTestId('location')).toHaveTextContent('sort=id:ASC');
    });

    expect(screen.getByTestId('location')).toHaveTextContent(encoded);
  });
});
