import { render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';

import { Providers } from '../../content-manager/tests/Fixtures';
import { PastePrompt } from '../PastePrompt';

const renderPrompt = (fields: string[]) => {
  const onQualify = jest.fn();
  const onOpenDetails = jest.fn();

  render(
    <PastePrompt
      fields={fields}
      disabled={false}
      onQualify={onQualify}
      onOpenDetails={onOpenDetails}
    />,
    { wrapper: Providers }
  );

  return { onQualify, onOpenDetails };
};

describe('<PastePrompt />', () => {
  it('renders nothing without pasted fields', () => {
    renderPrompt([]);

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('asks where the pasted text comes from', () => {
    renderPrompt(['title', 'body']);

    expect(screen.getByRole('dialog', { name: 'Pasted text' })).toHaveTextContent(
      'Did the text pasted in title and body come from an AI assistant?'
    );
  });

  it('reports the answer for every pasted field', async () => {
    const { onQualify, onOpenDetails } = renderPrompt(['title']);

    await userEvent.click(screen.getByRole('button', { name: 'AI' }));
    expect(onQualify).toHaveBeenLastCalledWith('ai');

    await userEvent.click(screen.getByRole('button', { name: 'Other source' }));
    expect(onQualify).toHaveBeenLastCalledWith('other');

    await userEvent.click(screen.getByRole('button', { name: 'Dismiss' }));
    expect(onQualify).toHaveBeenLastCalledWith('other');

    await userEvent.click(screen.getByRole('button', { name: 'Field by field' }));
    expect(onOpenDetails).toHaveBeenCalled();
  });
});
