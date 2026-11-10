import * as React from 'react';

import { Button, Combobox, ComboboxOption, Field, Modal } from '@strapi/design-system';
import { useIntl } from 'react-intl';

import { getTranslation } from '../../utils/getTranslation';

import type { ProviderSummary } from '../../../../shared/contracts/providers';

/** The picker's choice for a provider that is not in the list */
const CUSTOM_OIDC = '__custom-oidc__';

interface ProviderPickerProps {
  open: boolean;
  /** The providers that are not configured yet */
  available: ProviderSummary[];
  onClose: () => void;
  /** The id of the provider chosen, or `CUSTOM_OIDC` */
  onPick: (value: string) => void;
}

/** Where a provider to add is chosen: a search over the ones the plugin knows, by name */
const ProviderPicker = ({ open, available, onClose, onPick }: ProviderPickerProps) => {
  const { formatMessage } = useIntl();

  const sorted = React.useMemo(
    () => [...available].sort((a, b) => a.name.localeCompare(b.name)),
    [available]
  );

  return (
    <Modal.Root open={open} onOpenChange={(isOpen: boolean) => !isOpen && onClose()}>
      <Modal.Content>
        <Modal.Header>
          <Modal.Title>
            {formatMessage({
              id: getTranslation('providers.picker.title'),
              defaultMessage: 'Add a provider',
            })}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Field.Root name="provider">
            <Field.Label>
              {formatMessage({
                id: getTranslation('providers.picker.label'),
                defaultMessage: 'Provider',
              })}
            </Field.Label>
            <Combobox
              autocomplete={{ type: 'list', filter: 'contains' }}
              placeholder={formatMessage({
                id: getTranslation('providers.picker.placeholder'),
                defaultMessage: 'Search providers',
              })}
              noOptionsMessage={() =>
                formatMessage({
                  id: getTranslation('providers.picker.no-match'),
                  defaultMessage: 'No provider matches.',
                })
              }
              onChange={(value?: string | number) => {
                if (typeof value === 'string' && value !== '') {
                  onPick(value);
                }
              }}
            >
              {sorted.map((provider) => (
                <ComboboxOption key={provider.id} value={provider.id}>
                  {provider.name}
                </ComboboxOption>
              ))}
              <ComboboxOption value={CUSTOM_OIDC}>
                {formatMessage({
                  id: getTranslation('providers.custom-oidc'),
                  defaultMessage: 'Custom OIDC',
                })}
              </ComboboxOption>
            </Combobox>
          </Field.Root>
        </Modal.Body>
        <Modal.Footer>
          <Modal.Close>
            <Button variant="tertiary">
              {formatMessage({ id: 'app.components.Button.cancel', defaultMessage: 'Cancel' })}
            </Button>
          </Modal.Close>
        </Modal.Footer>
      </Modal.Content>
    </Modal.Root>
  );
};

export { CUSTOM_OIDC, ProviderPicker };
