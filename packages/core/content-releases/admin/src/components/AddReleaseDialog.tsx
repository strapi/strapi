import {
  Button,
  Grid,
  GridItem,
  ModalBody,
  ModalFooter,
  ModalLayout,
  ModalHeader,
  TextInput,
  Typography,
} from '@strapi/design-system';
import { useNotification } from '@strapi/helper-plugin';
import { Formik, Form } from 'formik';
import { useIntl } from 'react-intl';
import * as yup from 'yup';

const releaseSchema = yup.object({
  name: yup.string().required(),
});

const initialValues = {
  name: '',
};

export const AddReleaseDialog = ({ handleClose }: { handleClose: () => void }) => {
  const { formatMessage } = useIntl();
  const toggleNotification = useNotification();

  const handleSubmit = () => {
    handleClose();

    toggleNotification({
      type: 'success',
      message: formatMessage({
        id: 'content-releases.modal.release-created-notification-success',
        defaultMessage: 'Release created.',
      }),
    });
  };

  return (
    <ModalLayout onClose={() => handleClose()} labelledBy="title">
      <Formik
        validateOnChange={false}
        onSubmit={handleSubmit}
        initialValues={initialValues}
        validationSchema={releaseSchema}
      >
        {({ values, errors, handleChange }) => (
          <Form>
            <ModalHeader>
              <Typography id="title" fontWeight="bold" textColor="neutral800">
                {formatMessage({
                  id: 'content-releases.modal.add-release-title',
                  defaultMessage: 'New release',
                })}
              </Typography>
            </ModalHeader>
            <ModalBody>
              <Grid gap={4}>
                <GridItem xs={12} col={12}>
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
                </GridItem>
              </Grid>
            </ModalBody>
            <ModalFooter
              startActions={
                <Button onClick={handleClose} variant="tertiary" name="cancel">
                  {formatMessage({ id: 'cancel', defaultMessage: 'Cancel' })}
                </Button>
              }
              endActions={
                <Button name="submit" disabled={!values.name} type="submit">
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
