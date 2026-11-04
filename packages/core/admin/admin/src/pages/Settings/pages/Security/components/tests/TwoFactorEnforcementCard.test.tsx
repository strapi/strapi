import * as React from 'react';

import { render, screen } from '@tests/utils';

import { TwoFactorEnforcementCard, type MfaEnforcementDraft } from '../TwoFactorEnforcementCard';

import type { AdminRole } from '../../../../../../hooks/useAdminRoles';

const ROLES = [
  { id: 1, name: 'Super Admin', code: 'strapi-super-admin', usersCount: 1 },
  { id: 2, name: 'Editor', code: 'strapi-editor', usersCount: 3 },
  { id: 3, name: 'Author', code: 'strapi-author', usersCount: 0 },
] as unknown as AdminRole[];

const DRAFT: MfaEnforcementDraft = { mode: 'optional', graceDays: 7, requiredRoles: ['2'] };

/** The card is controlled; this keeps its value in state so interactions read back. */
const Harness = ({
  initial = DRAFT,
  onChange,
  ...props
}: Partial<React.ComponentProps<typeof TwoFactorEnforcementCard>> & {
  initial?: MfaEnforcementDraft;
}) => {
  const [value, setValue] = React.useState(initial);
  return (
    <TwoFactorEnforcementCard
      value={value}
      onChange={(next) => {
        setValue(next);
        onChange?.(next);
      }}
      roles={ROLES}
      canUpdate
      {...props}
    />
  );
};

describe('TwoFactorEnforcementCard', () => {
  it('shows the requirement as a select with the three modes', async () => {
    const onChange = jest.fn();
    const { user } = render(<Harness onChange={onChange} />);

    const select = screen.getByRole('combobox', { name: 'Requirement' });
    expect(select).toHaveTextContent('Required for selected roles');

    await user.click(select);
    expect(screen.getByRole('option', { name: 'Not required' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Required for selected roles' })).toBeInTheDocument();
    await user.click(screen.getByRole('option', { name: 'Required for everyone' }));

    expect(onChange).toHaveBeenLastCalledWith({ ...DRAFT, mode: 'required' });
    expect(screen.getByRole('combobox', { name: 'Requirement' })).toHaveTextContent(
      'Required for everyone'
    );
  });

  it('shows the role picker only under "Required for selected roles"', async () => {
    const { user } = render(<Harness />);

    expect(screen.getByRole('combobox', { name: 'Require for these roles' })).toBeInTheDocument();

    await user.click(screen.getByRole('combobox', { name: 'Requirement' }));
    await user.click(screen.getByRole('option', { name: 'Required for everyone' }));

    expect(
      screen.queryByRole('combobox', { name: 'Require for these roles' })
    ).not.toBeInTheDocument();
  });

  it('says the roles can also be set on each role page, with a link to the roles', () => {
    render(<Harness />);

    expect(screen.getByText(/You can also set this on each role's page in/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Settings > Roles' })).toHaveAttribute(
      'href',
      '/settings/roles'
    );
  });

  it('lists every role with its user count and adds the one picked', async () => {
    const onChange = jest.fn();
    const { user } = render(<Harness onChange={onChange} />);

    await user.click(screen.getByRole('combobox', { name: 'Require for these roles' }));
    expect(screen.getByRole('option', { name: 'Super Admin (1 user)' })).toBeInTheDocument();
    await user.click(screen.getByRole('option', { name: 'Author (0 users)' }));

    expect(onChange).toHaveBeenLastCalledWith({ ...DRAFT, requiredRoles: ['2', '3'] });
  });

  it('shows the grace period only while something is required', () => {
    const { rerender } = render(<Harness initial={{ ...DRAFT, mode: 'off' }} />);

    expect(
      screen.queryByRole('spinbutton', { name: 'Grace period (days)' })
    ).not.toBeInTheDocument();
    expect(
      screen.getByText('Users who already set up two-factor authentication still enter a code.')
    ).toBeInTheDocument();

    rerender(<Harness initial={{ ...DRAFT, mode: 'required' }} key="required" />);

    expect(screen.getByRole('spinbutton', { name: 'Grace period (days)' })).toHaveValue(7);
    expect(
      screen.getByText(
        'Days a user has to set up two-factor authentication after their next login.'
      )
    ).toBeInTheDocument();
  });

  it('reports an emptied grace period as null, not as zero', async () => {
    const onChange = jest.fn();
    const { user } = render(<Harness onChange={onChange} />);

    await user.clear(screen.getByRole('spinbutton', { name: 'Grace period (days)' }));

    expect(onChange).toHaveBeenLastCalledWith({ ...DRAFT, graceDays: null });
  });

  it('shows the field errors and the save error it is given', () => {
    render(
      <Harness
        errors={{ requiredRoles: 'Select at least one role.', graceDays: 'Bad grace' }}
        saveError="Refused"
      />
    );

    expect(screen.getByText('Select at least one role.')).toBeInTheDocument();
    expect(screen.getByText('Bad grace')).toBeInTheDocument();
    expect(screen.getByText('Refused')).toBeInTheDocument();
  });

  it('says to set up two-factor authentication first, with a link to the profile', () => {
    render(<Harness mustEnrolFirst />);

    expect(
      screen.getByText(/Set up two-factor authentication on your own account before requiring it/)
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Go to your profile' })).toHaveAttribute('href', '/me');
  });

  it('disables every control without the update permission', () => {
    render(<Harness canUpdate={false} />);

    // the design system's select trigger is a div, so it is disabled through `aria-disabled`
    expect(screen.getByRole('combobox', { name: 'Requirement' })).toHaveAttribute(
      'aria-disabled',
      'true'
    );
    expect(screen.getByRole('combobox', { name: 'Require for these roles' })).toHaveAttribute(
      'aria-disabled',
      'true'
    );
    expect(screen.getByRole('spinbutton', { name: 'Grace period (days)' })).toBeDisabled();
  });
});
