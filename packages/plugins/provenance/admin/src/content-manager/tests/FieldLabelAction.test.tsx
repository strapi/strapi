import { act, render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';

import { fieldsStore } from '../../store/fields';
import { FieldLabelAction } from '../FieldLabelAction';

import { field, Providers, setFieldsState } from './Fixtures';

// The design system provider renders live regions: check that the action rendered nothing
const expectNothing = () => {
  expect(screen.queryByRole('button')).not.toBeInTheDocument();
  expect(screen.queryByText(/AI/)).not.toBeInTheDocument();
};

const renderAction = (name: string) =>
  render(<FieldLabelAction name={name} />, { wrapper: Providers });

describe('<FieldLabelAction />', () => {
  afterEach(() => {
    act(() => fieldsStore.set(null));
  });

  it('renders nothing outside the edit view of a tracked entry', () => {
    renderAction('title');

    expectNothing();
  });

  it('lets the editor mark a field as AI', async () => {
    const state = setFieldsState();
    renderAction('title');

    await userEvent.click(screen.getByRole('button', { name: 'Mark as AI' }));

    expect(state.markAsAi).toHaveBeenCalledWith('title');
  });

  it('shows the AI badge of an AI field, warning until reviewed', () => {
    setFieldsState();
    renderAction('body');

    expect(screen.getByText('AI generated')).toBeInTheDocument();
    expect(screen.getByLabelText('Not reviewed')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Mark as AI' })).not.toBeInTheDocument();
  });

  it('names the reviewer of a reviewed AI field', () => {
    setFieldsState({
      provenance: {
        locale: 'en',
        status: 'draft',
        publishRequiresReview: false,
        fields: { body: field('ai-assisted', { byId: '1', by: 'Ada', at: '2026-10-27' }) },
      },
    });
    renderAction('body');

    expect(screen.getByText('AI assisted')).toBeInTheDocument();
    expect(screen.getByLabelText('Reviewed by Ada')).toBeInTheDocument();
  });

  it('offers to cancel a declaration waiting for the next save', async () => {
    const state = setFieldsState({ pending: [{ field: 'title', decision: 'ai' }] });
    renderAction('title');

    expect(screen.getByText('AI on save')).toBeInTheDocument();

    await userEvent.click(
      screen.getByRole('button', { name: 'Marked as AI when you save. Click to cancel.' })
    );

    expect(state.cancel).toHaveBeenCalledWith('title');
  });

  it('asks about a paste', () => {
    setFieldsState({ pending: [{ field: 'title', decision: 'undecided' }] });
    renderAction('title');

    expect(screen.getByRole('button', { name: 'Pasted text: mark it as AI' })).toHaveTextContent(
      'AI?'
    );
  });

  it('allows a component when the user may update a field inside it', () => {
    setFieldsState();
    renderAction('seo');

    expect(screen.getByRole('button', { name: 'Mark as AI' })).toBeInTheDocument();
  });

  it('hides the action from users who cannot update the field', () => {
    setFieldsState({ canUpdateFields: ['body'] });
    renderAction('title');

    expectNothing();
  });

  it('hides the action on the read-only published version', () => {
    setFieldsState({ canEdit: false });
    renderAction('title');

    expectNothing();
  });
});
