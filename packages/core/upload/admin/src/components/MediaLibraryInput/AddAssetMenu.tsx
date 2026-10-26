import { Menu } from '@strapi/design-system';
import { ChevronDown, Images, Link, Upload } from '@strapi/icons';
import { useIntl } from 'react-intl';
import { styled } from 'styled-components';

import { useMediaLibraryPermissions } from '../../hooks/useMediaLibraryPermissions';
import { ActionsMenuContent } from '../../pages/Assets/components/ActionsMenuContent';
import { getTranslationKey } from '../../utils/translations';

import { FieldMenuItem } from './FieldControls';

// The trigger reads as a link on the label row, not as a button: no padding, no
// ghost background, primary text. `Menu.Trigger` takes no `textColor`, so the
// colour is set here and forced past the design system's own span rule.
const AddAssetTrigger = styled(Menu.Trigger)`
  padding: 0;

  // No hover treatment at all: this reads as a link on the label row, and the
  // design system's ghost button paints a primary100 plate behind it (also while
  // the menu is open, via data-state).
  &,
  &:hover,
  &[data-state='open'] {
    background: transparent;
    background-color: transparent;
  }

  &,
  & span,
  &:hover span {
    color: ${({ theme }) => theme.colors.primary600};
  }

  & span {
    font-weight: ${({ theme }) => theme.fontWeights.regular};
  }

  // The chevron needs the fill, not the colour: the design system paints button
  // icons with its own "svg path { fill }" rule per variant, and repaints them
  // again on hover — both beat an inherited color and the icon's own
  // fill="currentColor". Doubled specificity so these land after those rules
  // whatever order they are injected in.
  && svg path,
  &&:hover svg path {
    fill: ${({ theme }) => theme.colors.primary600};
  }

  // The design system's disabled button is a bordered grey plate; this stays a
  // greyed-out link instead.
  &&[aria-disabled='true'] {
    border-color: transparent;
    background: transparent;
  }

  &[aria-disabled='true'],
  &[aria-disabled='true'] span {
    color: ${({ theme }) => theme.colors.neutral500};
  }

  &&[aria-disabled='true'] svg path {
    fill: ${({ theme }) => theme.colors.neutral500};
  }
`;

interface AddAssetMenuProps {
  disabled?: boolean;
  onBrowseLibrary: () => void;
  onUploadFromDevice: () => void;
  onUploadFromUrl: () => void;
}

/**
 * The field's "Add asset" menu, on the label row.
 *
 * Browsing needs the Media Library's read permission, the two upload entries
 * `assets.create`; each entry disappears without its permission, and the
 * trigger itself goes when nothing is left to offer, rather than opening an
 * empty menu.
 *
 * The drop zone below keeps working whatever this shows — it is a second way
 * in, not the only one.
 */
export const AddAssetMenu = ({
  disabled = false,
  onBrowseLibrary,
  onUploadFromDevice,
  onUploadFromUrl,
}: AddAssetMenuProps) => {
  const { formatMessage } = useIntl();
  const { canRead, canCreate, isLoading } = useMediaLibraryPermissions();

  // `useRBAC` starts every instance at `isLoading: true` with the flags false.
  // Until it settles, every entry shows but none can be picked: hiding them
  // would flash a smaller menu, enabling them would lead to a 403.
  const canBrowse = isLoading || canRead;
  const canUpload = isLoading || canCreate;

  if (!canBrowse && !canUpload) {
    return null;
  }

  return (
    <Menu.Root>
      <AddAssetTrigger variant="ghost" disabled={disabled} endIcon={<ChevronDown aria-hidden />}>
        {formatMessage({
          id: getTranslationKey('content-manager.input.add-asset'),
          defaultMessage: 'Add asset',
        })}
      </AddAssetTrigger>

      <ActionsMenuContent popoverPlacement="bottom-end" zIndex={2} minWidth="22rem">
        {canBrowse && (
          <FieldMenuItem startIcon={<Images />} disabled={isLoading} onSelect={onBrowseLibrary}>
            {formatMessage({
              id: getTranslationKey('content-manager.input.add-asset.browse'),
              defaultMessage: 'Browse library',
            })}
          </FieldMenuItem>
        )}

        {canUpload && (
          <>
            <FieldMenuItem
              startIcon={<Upload />}
              disabled={isLoading}
              onSelect={onUploadFromDevice}
            >
              {formatMessage({
                id: getTranslationKey('content-manager.input.add-asset.device'),
                defaultMessage: 'Upload from device',
              })}
            </FieldMenuItem>

            <FieldMenuItem startIcon={<Link />} disabled={isLoading} onSelect={onUploadFromUrl}>
              {formatMessage({
                id: getTranslationKey('content-manager.input.add-asset.url'),
                defaultMessage: 'Upload from URL',
              })}
            </FieldMenuItem>
          </>
        )}
      </ActionsMenuContent>
    </Menu.Root>
  );
};
