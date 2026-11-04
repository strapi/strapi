import { type IntlFormatters, useIntl } from 'react-intl';

interface EnforceImpactMessageProps {
  /** What the change adds, from `GET /security-settings/impact`: accounts newly required, and how
   * many of those already have two-factor authentication. */
  impact: { affected: number; enrolled: number };
  graceDays: number;
}

const enforceImpactText = (
  impact: EnforceImpactMessageProps['impact'],
  graceDays: number,
  formatMessage: IntlFormatters['formatMessage']
): string => {
  const pending = Math.max(impact.affected - impact.enrolled, 0);

  if (impact.affected === 0) {
    return formatMessage({
      id: 'Settings.security.mfa.enforce.none',
      defaultMessage:
        'Nobody new will be asked to set up two-factor authentication: this change adds no active user who logs in with a password.',
    });
  }

  if (pending === 0) {
    return formatMessage(
      {
        id: 'Settings.security.mfa.enforce.allEnrolled',
        defaultMessage:
          '{enrolled, plural, one {The # user this adds already uses} other {All # users this adds already use}} two-factor authentication. Nobody will be asked to set it up.',
      },
      { enrolled: impact.enrolled }
    );
  }

  return formatMessage(
    {
      id: 'Settings.security.mfa.enforce.body',
      defaultMessage:
        '{pending, plural, one {# user} other {# users}} will be asked to set up two-factor authentication.{enrolled, plural, =0 {} one { # more already uses it.} other { # more already use it.}} Each has {graceDays, plural, one {# day} other {# days}} from their next login to set it up. After that, password login is locked until an administrator unlocks the account.',
    },
    { pending, enrolled: impact.enrolled, graceDays }
  );
};

/**
 * The body of the "Require two-factor authentication?" dialog, shared by the Security page and the
 * role page. It counts the users who still have to set it up (`affected - enrolled`) rather than
 * saying "3 users will be asked, and 3 of them already have it", which read as a contradiction.
 */
const EnforceImpactMessage = ({ impact, graceDays }: EnforceImpactMessageProps) => {
  const { formatMessage } = useIntl();
  return <>{enforceImpactText(impact, graceDays, formatMessage)}</>;
};

export { EnforceImpactMessage };
