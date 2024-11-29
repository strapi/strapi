import * as React from 'react';

import { useTracking } from '@strapi/admin/strapi-admin';
import { Button, VisuallyHidden, ButtonProps } from '@strapi/design-system';
import { useIntl } from 'react-intl';

import { getTrad } from '../../utils';

interface ReplaceMediaButtonProps extends ButtonProps {
  acceptedMime: string;
  onSelectMedia: (file?: File) => void;
  trackedLocation?: string;
}

export const ReplaceMediaButton = ({
  onSelectMedia,
  acceptedMime,
  trackedLocation,
  ...props
}: ReplaceMediaButtonProps) => {
  const { formatMessage } = useIntl();
  const inputRef = React.useRef<HTMLInputElement>(null);
  const { trackUsage } = useTracking();

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();

    if (trackedLocation) {
      trackUsage('didReplaceMedia', { location: trackedLocation });
    }

    inputRef.current?.click();
  };

  const handleChange = () => {
    const file = inputRef.current?.files?.[0];

    onSelectMedia(file);
  };

  return (
    <>
      <Button variant="secondary" onClick={handleClick} {...props}>
        {formatMessage({
          id: getTrad('control-card.replace-media'),
          defaultMessage: 'Replace media',
        })}
      </Button>
      <VisuallyHidden>
        <input
          accept={acceptedMime}
          type="file"
          name="file"
          data-testid="file-input"
          tabIndex={-1}
          ref={inputRef}
          onChange={handleChange}
          aria-hidden
        />
      </VisuallyHidden>
    </>
  );
};
