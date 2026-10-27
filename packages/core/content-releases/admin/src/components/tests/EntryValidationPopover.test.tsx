import { render, screen } from '@tests/utils';

import { EntryValidationPopover, ReleaseActionOutcomeStatus } from '../EntryValidationPopover';

const schema = {
  kind: 'collectionType',
  uid: 'api::article.article',
  hasReviewWorkflow: true,
  stageRequiredToPublish: { id: 'stage1', name: 'Done' },
};

const entry = {
  documentId: 'doc-1',
  locale: 'en',
};

const notApprovedReason = {
  stage: {
    entryStage: { id: 'stage2', name: 'In review' },
    requiredStage: { id: 'stage1', name: 'Done' },
  },
};

const invalidReason = {
  validation: {
    errors: [
      { path: ['title'], message: 'title must be defined.' },
      { path: ['slug'], message: 'slug must be defined.' },
    ],
  },
};

describe('EntryValidationPopover', () => {
  const defaultProps = {
    action: 'publish' as const,
    schema,
    entry,
    status: 'draft' as const,
    isEntryValid: true,
    reason: null,
  };

  it('shows a ready entry', async () => {
    const { user } = render(
      // @ts-expect-error - We only define schema props we are interested in
      <EntryValidationPopover {...defaultProps} />
    );

    await user.click(screen.getByRole('button', { name: 'Ready to publish' }));

    await screen.findByText('Fields');
    expect(screen.getByText('All fields are filled correctly')).toBeInTheDocument();
    expect(
      screen.getByText('This entry is at the required stage for publishing (Done)')
    ).toBeInTheDocument();
  });

  it('shows the stored validation errors, not a live check', async () => {
    const { user } = render(
      // @ts-expect-error - We only define schema props we are interested in
      <EntryValidationPopover {...defaultProps} isEntryValid={false} reason={invalidReason} />
    );

    await user.click(screen.getByRole('button', { name: 'Not ready to publish' }));

    await screen.findByText('2 errors on fields');
    expect(screen.getByRole('link', { name: 'See errors' })).toHaveAttribute(
      'href',
      '/content-manager/collection-types/api::article.article/doc-1?plugins%5Bi18n%5D%5Blocale%5D=en'
    );
    expect(
      screen.getByText('This entry is at the required stage for publishing (Done)')
    ).toBeInTheDocument();
  });

  it('shows the stage the entry should be at', async () => {
    const { user } = render(
      // @ts-expect-error - We only define schema props we are interested in
      <EntryValidationPopover {...defaultProps} isEntryValid={false} reason={notApprovedReason} />
    );

    await user.click(screen.getByRole('button', { name: 'Not ready to publish' }));

    await screen.findByText('This entry is not at the required stage for publishing (Done)');
    expect(screen.getByText('All fields are filled correctly')).toBeInTheDocument();
  });

  it('counts an entry never validated as not ready', () => {
    render(
      // @ts-expect-error - We only define schema props we are interested in
      <EntryValidationPopover {...defaultProps} isEntryValid={null} />
    );

    expect(screen.getByRole('button', { name: 'Not ready to publish' })).toBeInTheDocument();
  });

  it('shows the error a check hit', async () => {
    const { user } = render(
      <EntryValidationPopover
        {...defaultProps}
        // @ts-expect-error - We only define schema props we are interested in
        schema={schema}
        isEntryValid={false}
        reason={{ error: { name: 'TypeError' } }}
      />
    );

    await user.click(screen.getByRole('button', { name: 'Not ready to publish' }));

    await screen.findByText('Couldn’t be checked: TypeError');
    expect(screen.queryByText('Fields')).not.toBeInTheDocument();
  });
});

describe('ReleaseActionOutcomeStatus', () => {
  const defaultProps = {
    schema,
    entry,
    reason: null,
    isOutcomeUnknown: false,
  };

  it.each([
    ['published', 'Done'],
    ['unpublished', 'Done'],
    ['skipped_held', 'Skipped: Waiting on other entries'],
    ['skipped_missed', 'Skipped: Server unavailable'],
  ] as const)('shows %s as "%s" without details', (outcome, label) => {
    render(
      // @ts-expect-error - We only define schema props we are interested in
      <ReleaseActionOutcomeStatus {...defaultProps} outcome={outcome} />
    );

    expect(screen.getByText(label)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Details' })).not.toBeInTheDocument();
  });

  it('shows what the run saw for an invalid entry', async () => {
    const { user } = render(
      <ReleaseActionOutcomeStatus
        {...defaultProps}
        // @ts-expect-error - We only define schema props we are interested in
        schema={schema}
        outcome="skipped_invalid"
        reason={{ ...invalidReason, ...notApprovedReason }}
      />
    );

    expect(screen.getByText('Skipped: Validation error')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Details' }));

    await screen.findByText('2 errors on fields');
    expect(
      screen.getByText('This entry is not at the required stage for publishing (Done)')
    ).toBeInTheDocument();
  });

  it("doesn't link to an entry deleted since the run", async () => {
    const { user } = render(
      <ReleaseActionOutcomeStatus
        {...defaultProps}
        // @ts-expect-error - We only define schema props we are interested in
        schema={schema}
        entry={null}
        outcome="skipped_invalid"
        reason={invalidReason}
      />
    );

    await user.click(screen.getByRole('button', { name: 'Details' }));

    await screen.findByText('2 errors on fields');
    expect(screen.queryByRole('link', { name: 'See errors' })).not.toBeInTheDocument();
  });

  it('shows the error name for an entry the run failed on', async () => {
    const { user } = render(
      <ReleaseActionOutcomeStatus
        {...defaultProps}
        // @ts-expect-error - We only define schema props we are interested in
        schema={schema}
        outcome="skipped_error"
        reason={{ error: { name: 'KnexTimeoutError' } }}
      />
    );

    expect(screen.getByText('Skipped: Error')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Details' }));

    await screen.findByText('Couldn’t be published: KnexTimeoutError');
  });

  it('shows "Unknown" for a release that failed before the upgrade', () => {
    render(
      <ReleaseActionOutcomeStatus
        {...defaultProps}
        // @ts-expect-error - We only define schema props we are interested in
        schema={schema}
        outcome="skipped_missed"
        isOutcomeUnknown
      />
    );

    expect(screen.getByText('Unknown')).toBeInTheDocument();
    expect(screen.queryByText('Skipped: Server unavailable')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Details' })).not.toBeInTheDocument();
  });
});
