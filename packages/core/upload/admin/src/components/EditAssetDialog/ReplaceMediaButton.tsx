import * as React from 'react';

import { useTracking } from '@strapi/admin/strapi-admin';
import { Button, VisuallyHidden } from '@strapi/design-system';
import { useIntl } from 'react-intl';

// TODO: replace with the import from the index file when it will be migrated to TypeScript
import { getTrad } from '../../utils/getTrad';

interface ReplaceMediaButtonProps {
  onSelectMedia: (file: File) => void;
  acceptedMime: string;
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
    if (!inputRef.current?.files) {
      return;
    }
    const file = inputRef.current?.files[0];

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
          tabIndex={-1}
          ref={inputRef}
          onChange={handleChange}
          aria-hidden
        />
      </VisuallyHidden>
    </>
  );
};
