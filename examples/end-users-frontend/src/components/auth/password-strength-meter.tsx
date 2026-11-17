import { evaluatePasswordStrength, type PasswordStrengthLevel } from '@better-auth-ui/core';
import { useAuth } from '@better-auth-ui/react';

import { cn } from 'cn';

/** Fixed segment identities, so the bars keep their own React keys. */
const STRENGTH_SEGMENTS = [1, 2, 3, 4] as const;

type FilledLevel = Exclude<PasswordStrengthLevel, 'empty'>;

const segmentColors: Record<FilledLevel, string> = {
  weak: 'bg-destructive',
  fair: 'bg-amber-500',
  good: 'bg-sky-500',
  strong: 'bg-emerald-500',
};

export type PasswordStrengthMeterProps = {
  /** The password as typed. Renders nothing while it is empty. */
  password: string;
  className?: string;
};

/**
 * Four-segment strength hint shown while someone picks a new password.
 *
 * Renders nothing when `emailAndPassword.strengthMeter` is off or the field is
 * empty. The score never gates submission: your server rules stay the
 * authority on what is acceptable.
 */
export function PasswordStrengthMeter({ password, className }: PasswordStrengthMeterProps) {
  const { emailAndPassword, localization } = useAuth();

  if (!emailAndPassword?.strengthMeter) return null;

  const { score, level } = evaluatePasswordStrength(password, {
    minLength: emailAndPassword.minPasswordLength,
  });

  if (level === 'empty') return null;

  const levelLabels: Record<FilledLevel, string> = {
    weak: localization.auth.passwordWeak,
    fair: localization.auth.passwordFair,
    good: localization.auth.passwordGood,
    strong: localization.auth.passwordStrong,
  };

  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      {/* Decorative: the live region below is what gets announced. */}
      <div aria-hidden="true" className="flex gap-1">
        {STRENGTH_SEGMENTS.map((segment) => (
          <span
            key={segment}
            className={cn(
              'h-1 flex-1 rounded-full bg-muted transition-colors',
              segment <= score && segmentColors[level]
            )}
          />
        ))}
      </div>

      <p aria-live="polite" className="text-muted-foreground text-xs">
        {localization.auth.passwordStrength}:{' '}
        <span className="font-medium text-foreground">{levelLabels[level]}</span>
      </p>
    </div>
  );
}
