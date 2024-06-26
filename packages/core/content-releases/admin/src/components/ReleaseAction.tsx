import * as React from 'react';

import { type BulkActionComponent } from '@strapi/admin/strapi-admin';
import {
  Box,
  Button,
  FieldLabel,
  Flex,
  SingleSelect,
  SingleSelectOption,
  ModalBody,
  ModalFooter,
} from '@strapi/design-system';
import {
  useAPIErrorHandler,
  useCMEditViewDataManager,
  useNotification,
  useRBAC,
} from '@strapi/helper-plugin';
import { Common } from '@strapi/types';
import { isAxiosError } from 'axios';
import { Formik, Form } from 'formik';
import { useIntl } from 'react-intl';

import { CreateManyReleaseActions } from '../../../shared/contracts/release-actions';
import { PERMISSIONS as releasePermissions } from '../constants';
import { useCreateManyReleaseActionsMutation, useGetReleasesQuery } from '../services/release';

import { type FormValues, INITIAL_VALUES, RELEASE_ACTION_FORM_SCHEMA } from './CMReleasesContainer';
import { NoReleases } from './CMReleasesContainer';
import { ReleaseActionOptions } from './ReleaseActionOptions';

const getContentPermissions = (subject: string) => {
  const permissions = {
    publish: [
      {
        action: 'plugin::content-manager.explorer.publish',
        subject,
        id: '',
        actionParameters: {},
        properties: {},
        conditions: [],
      },
    ],
  };

  return permissions;
};

const ReleaseAction: BulkActionComponent = ({ ids, model }) => {
  const { formatMessage } = useIntl();
  const toggleNotification = useNotification();
  const { formatAPIError } = useAPIErrorHandler();
  const { modifiedData } = useCMEditViewDataManager();
  const contentPermissions = getContentPermissions(model);
  const {
    allowedActions: { canPublish },
  } = useRBAC(contentPermissions);
  const {
    allowedActions: { canCreate },
  } = useRBAC(releasePermissions);

  // Get all the releases not published
  const response = useGetReleasesQuery();
  const releases = response.data?.data;
  const [createManyReleaseActions, { isLoading }] = useCreateManyReleaseActionsMutation();

  const handleSubmit = async (values: FormValues) => {
    const locale = modifiedData.locale as string | undefined;
    const releaseActionEntries: CreateManyReleaseActions.Request['body'] = ids.map((id) => ({
      type: values.type,
      entry: {
        contentType: model as Common.UID.ContentType,
        id,
        locale,
      },
    }));

    const response = await createManyReleaseActions({
      body: releaseActionEntries,
      params: { releaseId: values.releaseId },
    });

    if ('data' in response) {
      // Handle success

      const notificationMessage = formatMessage(
        {
          id: 'content-releases.content-manager-list-view.add-to-release.notification.success.message',
          defaultMessage:
            '{entriesAlreadyInRelease} out of {totalEntries} entries were already in the release.',
        },
        {
          entriesAlreadyInRelease: response.data.meta.entriesAlreadyInRelease,
          totalEntries: response.data.meta.totalEntries,
        }
      );

      const notification = {
        type: 'success' as const,
        title: formatMessage(
          {
            id: 'content-releases.content-manager-list-view.add-to-release.notification.success.title',
            defaultMessage: 'Successfully added to release.',
          },
          {
            entriesAlreadyInRelease: response.data.meta.entriesAlreadyInRelease,
            totalEntries: response.data.meta.totalEntries,
          }
        ),
        message: response.data.meta.entriesAlreadyInRelease ? notificationMessage : '',
      };

      toggleNotification(notification);

      return true;
    }

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

  if (!canCreate || !canPublish) return null;

  return {
    actionType: 'release',
    variant: 'tertiary',
    label: formatMessage({
      id: 'content-manager-list-view.add-to-release',
      defaultMessage: 'Add to Release',
    }),
    dialog: {
      type: 'modal',
      title: formatMessage({
        id: 'content-manager-list-view.add-to-release',
        defaultMessage: 'Add to Release',
      }),
      content: ({ onClose }) => {
        return (
          <Formik
            onSubmit={async (values) => {
              const data = await handleSubmit(values);
              if (data) {
                return onClose();
              }
            }}
            validationSchema={RELEASE_ACTION_FORM_SCHEMA}
            initialValues={INITIAL_VALUES}
          >
            {({ values, setFieldValue }) => (
              <Form>
                {releases?.length === 0 ? (
                  <NoReleases />
                ) : (
                  <ModalBody>
                    <Flex direction="column" alignItems="stretch" gap={2}>
                      <Box paddingBottom={6}>
                        <SingleSelect
                          required
                          label={formatMessage({
                            id: 'content-releases.content-manager-list-view.add-to-release.select-label',
                            defaultMessage: 'Select a release',
                          })}
                          placeholder={formatMessage({
                            id: 'content-releases.content-manager-list-view.add-to-release.select-placeholder',
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
                          id: 'content-releases.content-manager-list-view.add-to-release.action-type-label',
                          defaultMessage: 'What do you want to do with these entries?',
                        })}
                      </FieldLabel>
                      <ReleaseActionOptions
                        selected={values.type}
                        handleChange={(e) => setFieldValue('type', e.target.value)}
                        name="type"
                      />
                    </Flex>
                  </ModalBody>
                )}
                <ModalFooter
                  startActions={
                    <Button onClick={onClose} variant="tertiary" name="cancel">
                      {formatMessage({
                        id: 'content-releases.content-manager-list-view.add-to-release.cancel-button',
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
                        id: 'content-releases.content-manager-list-view.add-to-release.continue-button',
                        defaultMessage: 'Continue',
                      })}
                    </Button>
                  }
                />
              </Form>
            )}
          </Formik>
        );
      },
    },
  };
};

export { ReleaseAction };
