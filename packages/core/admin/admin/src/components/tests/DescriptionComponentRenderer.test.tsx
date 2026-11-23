// Must stay the first import, see the file for why.
import './neverIdle';

import * as React from 'react';

import { render, screen } from '@testing-library/react';

import {
  DescriptionComponentRenderer,
  type DescriptionComponent,
} from '../DescriptionComponentRenderer';

interface Props {
  label: string;
}

interface Description {
  label: string;
}

const Publish = ({ label }: Props): Description => ({ label: `Publish ${label}` });

const Delete = ({ label }: Props): Description => ({ label: `Delete ${label}` });

const Hidden = (_props: Props): Description | null => null;

/**
 * Resolves after mount, like an action that waits for a permission check.
 */
const AddToRelease = ({ label }: Props): Description | null => {
  const [allowed, setAllowed] = React.useState(false);

  React.useEffect(() => {
    Promise.resolve().then(() => setAllowed(true));
  }, []);

  return allowed ? { label: `Add ${label} to release` } : null;
};

const renderDescriptions = (descriptions: Array<DescriptionComponent<Props, Description>>) =>
  render(
    <DescriptionComponentRenderer props={{ label: 'entries' }} descriptions={descriptions}>
      {(items) => (
        <ul>
          {items.map((item) => (
            <li key={item.id}>{item.label}</li>
          ))}
        </ul>
      )}
    </DescriptionComponentRenderer>
  );

describe('DescriptionComponentRenderer', () => {
  it('renders the descriptions without waiting for the browser to be idle', async () => {
    renderDescriptions([Publish, Hidden, Delete]);

    expect(await screen.findByText('Publish entries')).toBeInTheDocument();
    expect(screen.getByText('Delete entries')).toBeInTheDocument();
    expect(screen.getAllByRole('listitem')).toHaveLength(2);
  });

  it('renders a description that becomes available after mount', async () => {
    renderDescriptions([Publish, AddToRelease]);

    expect(await screen.findByText('Add entries to release')).toBeInTheDocument();
    expect(screen.getByText('Publish entries')).toBeInTheDocument();
  });
});
