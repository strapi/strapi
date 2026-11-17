import { createQrCodeSvgData, getEmailProviderLink } from '@better-auth-ui/core';
import { useAuth } from '@better-auth-ui/react';
import type { VariantProps } from 'class-variance-authority';
import { QrCode } from 'lucide-react';
import { useMemo } from 'react';

import { buttonVariants } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from 'cn';

export type OpenEmailButtonProps = {
  /** Email address used to detect the provider, e.g. from the verify-email flow. */
  email: string;
  className?: string;
  /**
   * Button variant. Defaults to the primary style for dead-end views where
   * opening the inbox is the only action; pass `"secondary"` where it sits
   * beside a submit button that should stay the primary call to action.
   */
  variant?: VariantProps<typeof buttonVariants>['variant'];
};

/**
 * Render a button that opens the user's email provider login page in a new
 * tab. Hovering or focusing the button reveals a QR code for opening the same
 * provider on another device.
 *
 * The provider is resolved from the email domain via the curated
 * `@mikkelscheike/email-provider-links` dataset (Gmail, Outlook, GMX, etc.).
 * Renders nothing when the domain is empty or not a known provider.
 *
 * @param email - Email address to resolve the provider from.
 * @param className - Additional CSS classes applied to the button.
 * @param variant - Button variant. Defaults to the primary style.
 * @returns The open-email button, or `null` when no provider matches.
 */
export function OpenEmailButton({ email, className, variant }: OpenEmailButtonProps) {
  const { localization } = useAuth();

  const provider = getEmailProviderLink(email);
  const loginUrl = provider?.loginUrl;
  const qrCode = useMemo(() => (loginUrl ? createQrCodeSvgData(loginUrl) : null), [loginUrl]);

  if (!provider || !qrCode) return null;

  const scanLabel = localization.auth.scanToOpenEmailProvider.replace(
    '{{provider}}',
    provider.companyProvider
  );

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger
          type="button"
          className={cn(buttonVariants({ variant }), 'w-full', className)}
          onClick={() => window.open(provider.loginUrl, '_blank', 'noopener,noreferrer')}
        >
          {localization.auth.openEmailProvider.replace('{{provider}}', provider.companyProvider)}
          <QrCode data-icon="inline-end" />
        </TooltipTrigger>
        <TooltipContent sideOffset={8} className="flex-col items-center gap-2 p-3">
          <svg
            viewBox={`0 0 ${qrCode.size} ${qrCode.size}`}
            aria-hidden="true"
            focusable="false"
            className="size-40"
          >
            <path fill="white" d={`M0 0h${qrCode.size}v${qrCode.size}H0z`} />
            <path fill="black" d={qrCode.path} shapeRendering="crispEdges" />
          </svg>
          <p className="max-w-40 text-center leading-snug">{scanLabel}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
