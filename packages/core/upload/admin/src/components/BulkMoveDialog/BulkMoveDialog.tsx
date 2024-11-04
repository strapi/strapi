import { Button, Flex, Grid, Field, Loader, Modal, Typography } from '@strapi/design-system';
import { Form, Formik, FormikErrors } from 'formik';
import isEmpty from 'lodash/isEmpty';
import { useIntl } from 'react-intl';

import { File } from '../../../../shared/contracts/files';
import { useBulkMove } from '../../hooks/useBulkMove';
import { useFolderStructure } from '../../hooks/useFolderStructure';
import { getTrad, normalizeAPIError } from '../../utils';
import { SelectTree } from '../SelectTree/SelectTree';

import type { Folder } from '../../../../shared/contracts/folders';
import type { OptionSelectTree } from '../SelectTree/SelectTree';
import type { FetchError } from '@strapi/admin/strapi-admin';

type InitialFormData = {
  destination:
    | {
        value: string | number;
        label: string;
      }
    | string;
};

interface FolderWithType extends Folder {
  type: string;
}

interface FileWithType extends File {
  type: string;
}

export interface BulkMoveDialogProps {
  onClose: () => void;
  selected?: Array<FolderWithType | FileWithType>;
  currentFolder?: FolderWithType;
}

export const BulkMoveDialog = ({ onClose, selected = [], currentFolder }: BulkMoveDialogProps) => {
  const { formatMessage } = useIntl();
  const { data: folderStructure, isLoading } = useFolderStructure();
  const { move } = useBulkMove();

  if (!folderStructure) {
    return null;
  }

  const handleSubmit = async (
    values: InitialFormData,
    { setErrors }: { setErrors: (errors: FormikErrors<InitialFormData>) => void }
  ) => {
    try {
      if (typeof values.destination !== 'string') {
        const destinationValue = values.destination.value;
        await move(destinationValue, selected);
        onClose();
      }
    } catch (error) {
      const normalizedError = normalizeAPIError(error as FetchError)!;

      if (normalizedError && 'errors' in normalizedError) {
        const formikErrors = normalizedError.errors?.reduce<Record<string, string>>(
          (acc, error) => {
            acc[error.values?.path?.length || 'destination'] = error.defaultMessage;

            return acc;
          },
          {}
        );

        if (!isEmpty(formikErrors)) {
          setErrors(formikErrors);
        }
      }
    }
  };

  if (isLoading) {
    return (
      <Modal.Content>
        <Modal.Body>
          <Flex justifyContent="center" paddingTop={4} paddingBottom={4}>
            <Loader>
              {formatMessage({
                id: getTrad('content.isLoading'),
                defaultMessage: 'Content is loading.',
              })}
            </Loader>
          </Flex>
        </Modal.Body>
      </Modal.Content>
    );
  }

  const initialFormData: InitialFormData = {
    destination: {
      value: currentFolder?.id || '',
      label: currentFolder?.name || folderStructure[0].label,
    },
  };

  return (
    <Modal.Content>
      <Formik validateOnChange={false} onSubmit={handleSubmit} initialValues={initialFormData}>
        {({ values, errors, setFieldValue }) => (
          <Form noValidate>
            <Modal.Header>
              <Modal.Title>
                {formatMessage({
                  id: getTrad('modal.folder.move.title'),
                  defaultMessage: 'Move elements to',
                })}
              </Modal.Title>
            </Modal.Header>

            <Modal.Body>
              <Grid.Root gap={4}>
                <Grid.Item xs={12} col={12} direction="column" alignItems="stretch">
                  <Field.Root id="folder-destination">
                    <Field.Label>
                      {formatMessage({
                        id: getTrad('form.input.label.folder-location'),
                        defaultMessage: 'Location',
                      })}
                    </Field.Label>

                    <SelectTree
                      options={folderStructure as OptionSelectTree[]}
                      onChange={(value: Record<string, string | number>) => {
                        setFieldValue('destination', value);
                      }}
                      defaultValue={
                        typeof values.destination !== 'string' ? values.destination : undefined
                      }
                      name="destination"
                      menuPortalTarget={document.querySelector('body')}
                      inputId="folder-destination"
                      error={errors?.destination}
                      ariaErrorMessage="destination-error"
                    />

                    {errors.destination && (
                      <Typography variant="pi" tag="p" textColor="danger600">
                        {errors.destination}
                      </Typography>
                    )}
                  </Field.Root>
                </Grid.Item>
              </Grid.Root>
            </Modal.Body>

            <Modal.Footer>
              <Modal.Close>
                <Button variant="tertiary" name="cancel">
                  {formatMessage({ id: 'cancel', defaultMessage: 'Cancel' })}
                </Button>
              </Modal.Close>
              <Button type="submit" loading={isLoading}>
                {formatMessage({ id: 'modal.folder.move.submit', defaultMessage: 'Move' })}
              </Button>
            </Modal.Footer>
          </Form>
        )}
      </Formik>
    </Modal.Content>
  );
};
