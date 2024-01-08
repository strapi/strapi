import {
  Button,
  ModalBody,
  ModalFooter,
  ModalLayout,
  ModalHeader,
  TextInput,
  Typography,
} from '@strapi/design-system';
import { Formik, Form } from 'formik';
import { useIntl } from 'react-intl';

import { RELEASE_SCHEMA } from '../../../shared/validation-schemas';

export interface FormValues {
  name: string;
}

interface ReleaseModalProps {
  handleClose: () => void;
  handleSubmit: (values: FormValues) => void;
  isLoading?: boolean;
  initialValues: FormValues;
  isOnUpdate?: boolean;
}

export const ReleaseModal = ({
  handleClose,
  handleSubmit,
  initialValues,
  isLoading = false,
  isOnUpdate = false,
}: ReleaseModalProps) => {
  const { formatMessage } = useIntl();

  return (
    <ModalLayout onClose={handleClose} labelledBy="title">
      <ModalHeader>
        <Typography id="title" fontWeight="bold" textColor="neutral800">
          {formatMessage({
            id: 'content-releases.modal.add-release-title',
            defaultMessage: 'New release',
          })}
        </Typography>
      </ModalHeader>
      <Formik
        validateOnChange={false}
        onSubmit={handleSubmit}
        initialValues={initialValues}
        validationSchema={RELEASE_SCHEMA}
      >
        {({ values, errors, handleChange }) => (
          <Form>
            <ModalBody>
              <TextInput
                label={formatMessage({
                  id: 'content-releases.modal.form.input.label.release-name',
                  defaultMessage: 'Name',
                })}
                name="name"
                value={values.name}
                error={errors.name}
                onChange={handleChange}
                required
              />
            </ModalBody>
            <ModalFooter
              startActions={
                <Button onClick={handleClose} variant="tertiary" name="cancel">
                  {formatMessage({ id: 'cancel', defaultMessage: 'Cancel' })}
                </Button>
              }
              endActions={
                <Button
                  name="submit"
                  loading={isLoading}
                  disabled={
                    isOnUpdate ? !values.name || values.name === initialValues.name : !values.name
                  }
                  type="submit"
                >
                  {isOnUpdate
                    ? formatMessage({
                        id: 'content-releases.modal.form.button.submit-update',
                        defaultMessage: 'Save',
                      })
                    : formatMessage({
                        id: 'content-releases.modal.form.button.submit',
                        defaultMessage: 'Continue',
                      })}
                </Button>
              }
            />
          </Form>
        )}
      </Formik>
    </ModalLayout>
  );
};
