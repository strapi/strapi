import { render, screen } from '@tests/utils';

import { PlannedActionStatus, ReleasedActionStatus } from '../ReleaseActionStatus';

describe('PlannedActionStatus', () => {
  it.each([
    ['publish', true],
    ['unpublish', false],
    ['unpublish', null],
  ] as const)(
    'shows a %s action with validity %s as "Ready", with nothing to open',
    (action, isEntryValid) => {
      render(
        <PlannedActionStatus
          action={action}
          isEntryValid={isEntryValid}
          entryName="West Ham match"
          onOpenReason={jest.fn()}
        />
      );

      expect(screen.getByText('Ready')).toBeInTheDocument();
      expect(screen.queryByRole('button')).not.toBeInTheDocument();
    }
  );

  it.each([false, null])(
    'opens the reason of a publish whose validity is %s',
    async (isEntryValid) => {
      const onOpenReason = jest.fn();
      const { user } = render(
        <PlannedActionStatus
          action="publish"
          isEntryValid={isEntryValid}
          entryName="West Ham match"
          onOpenReason={onOpenReason}
        />
      );

      const button = screen.getByRole('button', { name: 'Why West Ham match isn’t ready' });
      expect(button).toHaveTextContent('Not ready');
      expect(button).toHaveAttribute('aria-haspopup', 'dialog');

      await user.click(button);

      expect(onOpenReason).toHaveBeenCalledTimes(1);
    }
  );
});

describe('ReleasedActionStatus', () => {
  const defaultProps = {
    isOutcomeUnknown: false,
    entryName: 'West Ham match',
    onOpenReason: jest.fn(),
  };

  it.each(['published', 'unpublished'] as const)(
    'shows %s as "Done", with nothing to open',
    (outcome) => {
      render(<ReleasedActionStatus {...defaultProps} outcome={outcome} />);

      expect(screen.getByText('Done')).toBeInTheDocument();
      expect(screen.queryByRole('button')).not.toBeInTheDocument();
    }
  );

  it.each([
    'skipped_invalid',
    'skipped_not_approved',
    'skipped_error',
    'skipped_held',
    'skipped_missed',
  ] as const)('shows %s as "Skipped", opening its reason', async (outcome) => {
    const onOpenReason = jest.fn();
    const { user } = render(
      <ReleasedActionStatus {...defaultProps} outcome={outcome} onOpenReason={onOpenReason} />
    );

    const button = screen.getByRole('button', { name: 'Why West Ham match was skipped' });
    expect(button).toHaveTextContent('Skipped');

    await user.click(button);

    expect(onOpenReason).toHaveBeenCalledTimes(1);
  });

  it('shows "Unknown" for a release that failed before the upgrade', () => {
    render(<ReleasedActionStatus {...defaultProps} outcome="skipped_missed" isOutcomeUnknown />);

    expect(screen.getByText('Unknown')).toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('shows "Unknown" when the run recorded no outcome', () => {
    render(<ReleasedActionStatus {...defaultProps} outcome={null} />);

    expect(screen.getByText('Unknown')).toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});
