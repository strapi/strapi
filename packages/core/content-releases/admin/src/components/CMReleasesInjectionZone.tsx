import * as React from 'react';

import {
  Box,
  Button,
  FieldLabel,
  Flex,
  ModalBody,
  ModalHeader,
  ModalLayout,
  SingleSelect,
  SingleSelectOption,
  Typography,
  ModalFooter,
} from '@strapi/design-system';
import {
  CheckPermissions,
  useAPIErrorHandler,
  useCMEditViewDataManager,
  useNotification,
} from '@strapi/helper-plugin';
import { Plus } from '@strapi/icons';
import { isAxiosError } from 'axios';
import { Formik, Form } from 'formik';
import { useIntl } from 'react-intl';
import { useParams } from 'react-router-dom';
import * as yup from 'yup';

import { CreateReleaseAction } from '../../../shared/contracts/release-actions';
import { PERMISSIONS } from '../constants';
import { useCreateReleaseActionMutation, useGetReleasesQuery } from '../services/release';

import { ReleaseActionOptions } from './ReleaseActionOption';

const RELEASE_ACTION_FORM_SCHEMA = yup.object().shape({
  type: yup.string().oneOf(['publish', 'unpublish']).required(),
  releaseId: yup.string().required(),
});

interface FormValues {
  type: CreateReleaseAction.Request['body']['type'];
  releaseId: CreateReleaseAction.Request['params']['releaseId'];
}

const INITIAL_VALUES = {
  type: 'publish',
  releaseId: '',
} satisfies FormValues;

interface AddActionToReleaseModalProps {
  handleClose: () => void;
}

const AddActionToReleaseModal = ({ handleClose }: AddActionToReleaseModalProps) => {
  const { formatMessage } = useIntl();
  const toggleNotification = useNotification();
  const { formatAPIError } = useAPIErrorHandler();
  const params = useParams<{ id?: string }>();
  const {
    allLayoutData: { contentType },
  } = useCMEditViewDataManager();
  // Get all 'pending' releases
  const { data } = useGetReleasesQuery({
    filters: {
      $and: [
        {
          releasedAt: {
            $null: true,
          },
        },
      ],
    },
  });
  const releases = data?.data;
  const [createReleaseAction, { isLoading }] = useCreateReleaseActionMutation();

  const handleSubmit = async (values: FormValues) => {
    /**
     * contentType uid and entry id are not provided by the form but required to create a Release Action.
     * Optimistically we expect them to always be provided via params and CMEditViewDataManager.
     * In the event they are not, we should throw an error.
     */
    if (!contentType?.uid || !params.id) {
      toggleNotification({
        type: 'warning',
        message: formatMessage({
          id: 'content-releases.content-manager.notification.entry-error',
          defaultMessage: 'Failed to get entry',
        }),
      });

      return;
    }

    const releaseActionEntry = {
      contentType: contentType.uid,
      id: params.id,
    };
    const response = await createReleaseAction({
      body: { type: values.type, entry: releaseActionEntry },
      params: { releaseId: values.releaseId },
    });

    // When 'data' is in the response
    if ('data' in response) {
      // Handle success
      toggleNotification({
        type: 'success',
        message: formatMessage({
          id: 'content-releases.content-manager-edit-view.add-to-release.notification.success',
          defaultMessage: 'Entry added to release',
        }),
      });
    }
    // When 'error' is in the response
    if ('error' in response) {
      if (isAxiosError(response.error)) {
        // Handle axios error
        toggleNotification({
          type: 'warning',
          message: formatAPIError(response.error),
        });
      } else {
        // Handle generic error
        toggleNotification({
          type: 'warning',
          message: formatMessage({ id: 'notification.error', defaultMessage: 'An error occurred' }),
        });
      }
    }
  };

  return (
    <ModalLayout onClose={handleClose} labelledBy="title">
      <ModalHeader>
        <Typography id="title" fontWeight="bold" textColor="neutral800">
          {formatMessage({
            id: 'content-releases.content-manager-edit-view.add-to-release',
            defaultMessage: 'Add to release',
          })}
        </Typography>
      </ModalHeader>
      <Formik
        onSubmit={handleSubmit}
        validationSchema={RELEASE_ACTION_FORM_SCHEMA}
        initialValues={INITIAL_VALUES}
      >
        {({ values, setFieldValue }) => {
          return (
            <Form>
              <ModalBody>
                <Flex direction="column" alignItems="stretch" gap={2}>
                  <Box paddingBottom={6}>
                    <SingleSelect
                      required
                      label={formatMessage({
                        id: 'content-releases.content-manager-edit-view.add-to-release.select-label',
                        defaultMessage: 'Select a release',
                      })}
                      placeholder={formatMessage({
                        id: 'content-releases.content-manager-edit-view.add-to-release.select-placeholder',
                        defaultMessage: 'Select',
                      })}
                      onChange={(value) => setFieldValue('releaseId', value)}
                      value={values.releaseId}
                    >
                      {releases?.map((release) => (
                        <SingleSelectOption key={release.id} value={release.id}>
                          {release.name}
                        </SingleSelectOption>
                      ))}
                    </SingleSelect>
                  </Box>
                  <FieldLabel>
                    {formatMessage({
                      id: 'content-releases.content-manager-edit-view.add-to-release.action-type-label',
                      defaultMessage: 'What do you want to do with this entry?',
                    })}
                  </FieldLabel>

                  <Flex>
                    <ReleaseActionOptions
                      selected={values.type}
                      handleChange={(e) => setFieldValue('type', e.target.value)}
                    />
                  </Flex>
                </Flex>
              </ModalBody>
              <ModalFooter
                startActions={
                  <Button onClick={handleClose} variant="tertiary" name="cancel">
                    {formatMessage({
                      id: 'content-releases.content-manager-edit-view.add-to-release.cancel-button',
                      defaultMessage: 'Cancel',
                    })}
                  </Button>
                }
                endActions={
                  /**
                   * TODO: Ideally we would use isValid from Formik to disable the button, however currently it always returns true
                   * for yup.string().required(), even when the value is falsy (including empty string)
                   */
                  <Button type="submit" disabled={!values.releaseId} loading={isLoading}>
                    {formatMessage({
                      id: 'content-releases.content-manager-edit-view.add-to-release.continue-button',
                      defaultMessage: 'Continue',
                    })}
                  </Button>
                }
              />
            </Form>
          );
        }}
      </Formik>
    </ModalLayout>
  );
};

export const CMReleasesInectionZone = () => {
  const [showModal, setShowModal] = React.useState(false);
  const { formatMessage } = useIntl();
  const { isCreatingEntry } = useCMEditViewDataManager();

  const toggleAddActionToReleaseModal = () => setShowModal((prev) => !prev);

  // Impossible to add an entry to a release before the entry exists
  if (isCreatingEntry) {
    return null;
  }

  return (
    <CheckPermissions permissions={PERMISSIONS.main}>
      <Box
        as="aside"
        aria-label={formatMessage({
          id: 'content-releases.plugin.name',
          defaultMessage: 'Releases',
        })}
        background="neutral0"
        borderColor="neutral150"
        hasRadius
        padding={4}
        shadow="tableShadow"
      >
        <Flex direction="column" alignItems="stretch" gap={4}>
          <Typography variant="sigma" textColor="neutral600">
            {formatMessage({
              id: 'content-releases.plugin.name',
              defaultMessage: 'RELEASES',
            }).toUpperCase()}
          </Typography>
          <CheckPermissions permissions={PERMISSIONS.createAction}>
            <Button
              justifyContent="center"
              paddingLeft={4}
              paddingRight={4}
              color="neutral700"
              variant="tertiary"
              startIcon={<Plus />}
              onClick={toggleAddActionToReleaseModal}
            >
              {formatMessage({
                id: 'content-releases.content-manager-edit-view.add-to-release',
                defaultMessage: 'Add to release',
              })}
            </Button>
          </CheckPermissions>
        </Flex>
        {showModal && <AddActionToReleaseModal handleClose={toggleAddActionToReleaseModal} />}
      </Box>
    </CheckPermissions>
  );
};
