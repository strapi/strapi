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
import { useLocation } from 'react-router-dom';

import { RELEASE_SCHEMA } from '../../../shared/validation-schemas';
import { pluginId } from '../pluginId';

export interface FormValues {
  name: string;
}

interface ReleaseModalProps {
  handleClose: () => void;
  handleSubmit: (values: FormValues) => void;
  isLoading?: boolean;
  initialValues: FormValues;
}

export const ReleaseModal = ({
  handleClose,
  handleSubmit,
  initialValues,
  isLoading = false,
}: ReleaseModalProps) => {
  const { formatMessage } = useIntl();
  const { pathname } = useLocation();
  const isCreatingRelease = pathname === `/plugins/${pluginId}`;

  return (
    <ModalLayout onClose={handleClose} labelledBy="title">
      <ModalHeader>
        <Typography id="title" fontWeight="bold" textColor="neutral800">
          {formatMessage(
            {
              id: 'content-releases.modal.title',
              defaultMessage:
                '{isCreatingRelease, select, true {New release} other {Edit release}}',
            },
            { isCreatingRelease: isCreatingRelease }
          )}
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
                  disabled={!values.name || values.name === initialValues.name}
                  type="submit"
                >
                  {formatMessage(
                    {
                      id: 'content-releases.modal.form.button.submit',
                      defaultMessage: '{isCreatingRelease, select, true {Continue} other {Save}}',
                    },
                    { isCreatingRelease: isCreatingRelease }
                  )}
                </Button>
              }
            />
          </Form>
        )}
      </Formik>
    </ModalLayout>
  );
};
