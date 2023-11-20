import {
  Button,
  ModalBody,
  ModalFooter,
  ModalLayout,
  ModalHeader,
  TextInput,
  Typography,
} from '@strapi/design-system';
import { useAPIErrorHandler, useNotification } from '@strapi/helper-plugin';
import { Formik, Form } from 'formik';
import { useIntl } from 'react-intl';
import { useHistory } from 'react-router-dom';
import * as yup from 'yup';

import { useCreateReleaseMutation } from '../modules/releaseSlice';
import { isErrorAxiosError } from '../utils/errors';

const RELEASE_SCHEMA = yup.object({
  name: yup.string().required(),
});

interface FormValues {
  name: string;
}

const INITIAL_VALUES = {
  name: '',
} satisfies FormValues;

interface AddReleaseDialogProps {
  handleClose: () => void;
}

export const AddReleaseDialog = ({ handleClose }: AddReleaseDialogProps) => {
  const { formatMessage } = useIntl();
  const toggleNotification = useNotification();
  const { push } = useHistory();
  const { formatAPIError } = useAPIErrorHandler();

  const [createRelease, { isLoading }] = useCreateReleaseMutation();

  const handleSubmit = async (values: FormValues) => {
    const response = await createRelease({
      name: values.name,
    });

    if ('data' in response) {
      // When the response returns an object with 'data', handle success
      toggleNotification({
        type: 'success',
        message: formatMessage({
          id: 'content-releases.modal.release-created-notification-success',
          defaultMessage: 'Release created.',
        }),
      });

      push(`/plugins/content-releases/${response.data.data.id}`);
    } else if (isErrorAxiosError(response.error)) {
      // When the response returns an object with 'error', handle axios error
      toggleNotification({
        type: 'warning',
        message: formatAPIError(response.error),
      });
    } else {
      // Otherwise, the response returns an object with 'error', handle a generic error
      toggleNotification({
        type: 'warning',
        message: formatMessage({ id: 'notification.error', defaultMessage: 'An error occurred' }),
      });
    }
  };

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
        initialValues={INITIAL_VALUES}
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
                <Button name="submit" loading={isLoading} disabled={!values.name} type="submit">
                  {formatMessage({
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
