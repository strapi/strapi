import * as React from 'react';

import { Dialog, Modal, useCallbackRef } from '@strapi/design-system';
import { useFormikContext } from 'formik';
import { useIntl } from 'react-intl';

import { ConfirmDialog } from './ConfirmDialog';
import { createContext } from './Context';

/* -------------------------------------------------------------------------------------------------
 * UnsavedChangesModalContext
 * -----------------------------------------------------------------------------------------------*/

interface UnsavedChangesModalContextValue {
  /**
   * Records whether the caller identified by `id` has unsaved changes.
   * Returns a function that removes the entry.
   */
  register: (id: string, isDirty: boolean) => () => void;
}

const [UnsavedChangesModalProvider, useUnsavedChangesModalContext] =
  createContext<UnsavedChangesModalContextValue>('UnsavedChangesModal');

/* -------------------------------------------------------------------------------------------------
 * UnsavedChangesModal
 * -----------------------------------------------------------------------------------------------*/

interface UnsavedChangesModalProps extends Omit<Modal.Props, 'defaultOpen' | 'open'> {
  /**
   * The modal must be controlled: in uncontrolled mode Radix closes itself before
   * `onOpenChange` is called, so the close could not be cancelled.
   */
  open: boolean;
  /**
   * Unsaved changes held by the component rendering the modal, which sits above it and so
   * cannot use `useUnsavedChangesModalDirty`. Combined with anything registered from inside.
   */
  hasUnsavedChanges?: boolean;
}

/**
 * @beta
 * @public
 * @description A drop-in replacement for `Modal.Root` that asks the user to confirm before the
 * modal is dismissed while it holds unsaved changes. Every dismissal Radix knows about (Escape,
 * clicking outside, the header close button, `Modal.Close`) goes through the guard.
 *
 * Setting `open` to `false` from the parent is not guarded, so save handlers can keep closing
 * the modal directly.
 *
 * A Strapi `Form` rendered inside the modal registers its unsaved changes automatically. Other
 * forms register with `useUnsavedChangesModalDirty` (or `FormikUnsavedChangesRegistrar` inside
 * a `<Formik>`). State owned by the component that renders the modal goes in `hasUnsavedChanges`.
 * @example
 * ```tsx
 * const EditModal = ({ open, onOpenChange }) => {
 *   const [name, setName] = React.useState('');
 *
 *   return (
 *     <UnsavedChangesModal open={open} onOpenChange={onOpenChange}>
 *       <Modal.Content>
 *         <NameField value={name} onChange={setName} />
 *         <Modal.Footer>
 *           <Modal.Close>
 *             <Button variant="tertiary">Cancel</Button>
 *           </Modal.Close>
 *           <Button onClick={() => save(name).then(() => onOpenChange(false))}>Save</Button>
 *         </Modal.Footer>
 *       </Modal.Content>
 *     </UnsavedChangesModal>
 *   );
 * };
 *
 * const NameField = ({ value, onChange }) => {
 *   useUnsavedChangesModalDirty(value !== '');
 *
 *   return <TextInput value={value} onChange={(e) => onChange(e.target.value)} />;
 * };
 * ```
 */
const UnsavedChangesModal = ({
  open,
  onOpenChange,
  hasUnsavedChanges = false,
  children,
  ...restProps
}: UnsavedChangesModalProps) => {
  const { formatMessage } = useIntl();
  // A ref rather than state: registering on every keystroke must not re-render the modal.
  const registryRef = React.useRef(new Map<string, boolean>());
  const [isConfirmOpen, setIsConfirmOpen] = React.useState(false);

  const register = React.useCallback((id: string, isDirty: boolean) => {
    registryRef.current.set(id, isDirty);

    return () => {
      registryRef.current.delete(id);
    };
  }, []);

  const handleOpenChange = useCallbackRef((nextOpen: boolean) => {
    const isDirty = hasUnsavedChanges || Array.from(registryRef.current.values()).some(Boolean);

    if (!nextOpen && isDirty) {
      setIsConfirmOpen(true);
      return;
    }

    onOpenChange?.(nextOpen);
  });

  React.useEffect(() => {
    if (!open) {
      setIsConfirmOpen(false);
    }
  }, [open]);

  return (
    <UnsavedChangesModalProvider register={register}>
      <Modal.Root {...restProps} open={open} onOpenChange={handleOpenChange}>
        {children}
        <Dialog.Root open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
          <ConfirmDialog variant="danger" onConfirm={() => onOpenChange?.(false)}>
            {formatMessage({
              id: 'global.prompt.unsaved-modal',
              defaultMessage:
                'You have unsaved changes. Are you sure you want to close? All your modifications will be lost.',
            })}
          </ConfirmDialog>
        </Dialog.Root>
      </Modal.Root>
    </UnsavedChangesModalProvider>
  );
};

/* -------------------------------------------------------------------------------------------------
 * useUnsavedChangesModalDirty
 * -----------------------------------------------------------------------------------------------*/

/**
 * @beta
 * @public
 * @description Tells the nearest `UnsavedChangesModal` whether this component holds unsaved
 * changes. Does nothing when there is no `UnsavedChangesModal` above, so it is safe to call from
 * components that are also rendered outside a modal.
 */
const useUnsavedChangesModalDirty = (isDirty: boolean): void => {
  const register = useUnsavedChangesModalContext(
    'useUnsavedChangesModalDirty',
    (context) => context.register,
    false
  );
  const id = React.useId();

  React.useEffect(() => {
    if (!register) {
      return;
    }

    return register(id, isDirty);
  }, [register, id, isDirty]);
};

/* -------------------------------------------------------------------------------------------------
 * FormikUnsavedChangesRegistrar
 * -----------------------------------------------------------------------------------------------*/

/**
 * @beta
 * @public
 * @description Registers the enclosing Formik form with the nearest `UnsavedChangesModal`.
 * Renders nothing; place it anywhere inside `<Formik>`.
 */
const FormikUnsavedChangesRegistrar = () => {
  const { dirty, isSubmitting } = useFormikContext();

  useUnsavedChangesModalDirty(dirty && !isSubmitting);

  return null;
};

export { UnsavedChangesModal, useUnsavedChangesModalDirty, FormikUnsavedChangesRegistrar };
export type { UnsavedChangesModalProps };
