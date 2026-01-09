// TODO: find a better naming convention for the file that was an index file before
import * as React from 'react';

import {
  Page,
  useNotification,
  useFetchClient,
  Layouts,
  ConfirmDialog,
} from '@strapi/admin/strapi-admin';
import { useAIAvailability } from '@strapi/admin/strapi-admin/ee';
import {
  Box,
  Button,
  Dialog,
  Flex,
  Grid,
  Toggle,
  Typography,
  Field,
  Status,
  Divider,
  StatusProps,
} from '@strapi/design-system';
import { Check, Sparkle } from '@strapi/icons';
import isEqual from 'lodash/isEqual';
import { useIntl } from 'react-intl';
import { useMutation, useQuery } from 'react-query';
import { styled } from 'styled-components';

import { AIMetadataJob } from '../../../../shared/contracts/ai-metadata-jobs';
import { UpdateSettings } from '../../../../shared/contracts/settings';
import { PERMISSIONS } from '../../constants';
import { useAIMetadataJob } from '../../hooks/useAIMetadataJob';
import { useSettings } from '../../hooks/useSettings';
import { getTrad } from '../../utils';

import { init } from './init';
import { initialState, reducer } from './reducer';

import type { InitialState } from './reducer';

/* -------------------------------------------------------------------------------------------------
 * MetadataAction
 * -----------------------------------------------------------------------------------------------*/

const GenerateMetadataButton = styled(Button)`
  > span {
    color: ${({ theme }) => theme.colors.primary600};
  }

  &:disabled {
    background: transparent;
    border: none;
  }
`;

const BetaStatus = (props: Omit<StatusProps, 'children'>) => {
  const { formatMessage } = useIntl();

  return (
    <Status
      size="S"
      variant="alternative"
      style={{ textTransform: 'uppercase', display: 'flex' }}
      {...props}
    >
      <Typography tag="span" variant="pi" fontWeight="bold">
        {formatMessage({
          id: 'app.components.Status.beta',
          defaultMessage: 'Beta',
        })}
      </Typography>
    </Status>
  );
};

interface MetadataActionProps {
  jobStatus: AIMetadataJob | null;
  metadataCount: number;
  isConfirmDialogOpen: boolean;
  onConfirmDialogChange: (open: boolean) => void;
  onGenerate: () => Promise<void>;
}

const MetadataAction = ({
  jobStatus,
  metadataCount,
  isConfirmDialogOpen,
  onConfirmDialogChange,
  onGenerate,
}: MetadataActionProps) => {
  const { formatMessage } = useIntl();

  // If there's an active job processing
  if (jobStatus?.status === 'processing') {
    return (
      <Flex gap={2} alignItems="center">
        <Typography variant="pi" textColor="neutral600">
          {formatMessage({
            id: getTrad('settings.form.aiMetadata.generatingMetadata'),
            defaultMessage: 'AI is generating your metadata',
          })}
        </Typography>
      </Flex>
    );
  }

  // Only show completed state when all images have metadata
  if (metadataCount === 0) {
    return (
      <Typography variant="pi" textColor="primary600">
        <Flex gap={2} alignItems="center">
          <Check width="16px" height="16px" />
          {formatMessage({
            id: getTrad('settings.form.aiMetadata.metadataGenerated'),
            defaultMessage: 'Your metadata has been generated',
          })}
        </Flex>
      </Typography>
    );
  }

  return (
    <Dialog.Root open={isConfirmDialogOpen} onOpenChange={onConfirmDialogChange}>
      <Dialog.Trigger>
        <GenerateMetadataButton variant="ghost">
          {formatMessage({
            id: getTrad('settings.form.aiMetadata.generateButton'),
            defaultMessage: 'Generate metadata',
          })}
        </GenerateMetadataButton>
      </Dialog.Trigger>
      <ConfirmDialog
        variant="success-light"
        onConfirm={onGenerate}
        title={
          <Flex gap={2}>
            <BetaStatus />
            {formatMessage({
              id: getTrad('settings.form.aiMetadata.confirmDialog.title'),
              defaultMessage: 'Generate AI Metadata',
            })}
          </Flex>
        }
      >
        {formatMessage(
          {
            id: getTrad('settings.form.aiMetadata.confirmDialog.message'),
            defaultMessage:
              'This will generate captions and alternative text for {count, plural, one {# image} other {# images}}. AI can make mistakes, be sure to review the generated content. ',
          },
          { count: metadataCount }
        )}
      </ConfirmDialog>
    </Dialog.Root>
  );
};

/* -------------------------------------------------------------------------------------------------
 * SettingsPage
 * -----------------------------------------------------------------------------------------------*/

export const SettingsPage = () => {
  const { formatMessage } = useIntl();
  const { toggleNotification } = useNotification();
  const { put, post, get } = useFetchClient();
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = React.useState(false);

  const [{ initialData, modifiedData }, dispatch] = React.useReducer(reducer, initialState, init);

  const { data, isLoading, refetch } = useSettings();
  const isAIAvailable = useAIAvailability();

  const { data: metadataCountData, isLoading: isLoadingMetadataCount } = useQuery<
    { count: number },
    { message: string }
  >(
    ['ai-metadata-count'],
    async () => {
      const { data } = await get('/upload/actions/generate-ai-metadata/count');
      return data;
    },
    {
      enabled: isAIAvailable && !!data?.aiMetadata,
      retry: false,
    }
  );

  const metadataCount = metadataCountData?.count ?? 0;

  React.useEffect(() => {
    if (data) {
      dispatch({
        type: 'GET_DATA_SUCCEEDED',
        data,
      });
    }
  }, [data]);

  const isSaveButtonDisabled = isEqual(initialData, modifiedData);

  const { mutateAsync, isLoading: isSubmitting } = useMutation<
    UpdateSettings.Response['data'],
    UpdateSettings.Response['error'],
    UpdateSettings.Request['body']
  >(
    async (body) => {
      const { data } = await put('/upload/settings', body);

      return data;
    },
    {
      onSuccess() {
        refetch();

        toggleNotification({
          type: 'success',
          message: formatMessage({ id: 'notification.form.success.fields' }),
        });
      },
      onError(err: any) {
        toggleNotification({
          type: 'danger',
          message: err.message || formatMessage({ id: 'notification.error' }),
        });
      },
    }
  );

  // Poll for latest active job - notifications are handled inside the hook
  const { data: jobStatus, refetch: refetchJobStatus } = useAIMetadataJob();

  const { mutateAsync: startGenerateAIMetadata } = useMutation<
    {
      jobId: number;
      status: string;
      totalFiles: number;
    },
    { message: string },
    void
  >(
    async () => {
      const { data } = await post('/upload/actions/generate-ai-metadata', {});
      return data;
    },
    {
      onSuccess() {
        setIsConfirmDialogOpen(false);
        // Refetch job status to start polling the new job
        refetchJobStatus();
      },
      onError(err) {
        toggleNotification({
          type: 'danger',
          message: err.message || formatMessage({ id: 'notification.error' }),
        });
        setIsConfirmDialogOpen(false);
      },
    }
  );

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (isSaveButtonDisabled) {
      return;
    }

    await mutateAsync(modifiedData!);
  };

  const handleChange = ({
    target: { name, value },
  }: {
    target: { name: keyof NonNullable<InitialState['initialData']>; value: boolean };
  }) => {
    dispatch({
      type: 'ON_CHANGE',
      keys: name,
      value,
    });
  };

  if (isLoading) {
    return <Page.Loading />;
  }

  return (
    <Page.Main tabIndex={-1}>
      <Page.Title>
        {formatMessage({
          id: getTrad('page.title'),
          defaultMessage: 'Settings - Media Library',
        })}
      </Page.Title>
      <form onSubmit={handleSubmit}>
        <Layouts.Header
          title={formatMessage({
            id: getTrad('settings.header.label'),
            defaultMessage: 'Media Library',
          })}
          primaryAction={
            <Button
              disabled={isSaveButtonDisabled}
              loading={isSubmitting}
              type="submit"
              startIcon={<Check />}
              size="S"
            >
              {formatMessage({
                id: 'global.save',
                defaultMessage: 'Save',
              })}
            </Button>
          }
          subtitle={formatMessage({
            id: getTrad('settings.sub-header.label'),
            defaultMessage: 'Configure the settings for the Media Library',
          })}
        />
        <Layouts.Content>
          <Layouts.Root>
            <Flex direction="column" alignItems="stretch" gap={4}>
              {/* AI features section when ai is available */}
              {isAIAvailable && (
                <Box background="neutral0" padding={6} shadow="filterShadow" hasRadius>
                  <Flex direction="column" alignItems="stretch" gap={1}>
                    <Grid.Root gap={6}>
                      <Grid.Item col={8} xs={12} direction="column" alignItems="stretch">
                        <Flex gap={2}>
                          <Box color="alternative700">
                            <Sparkle />
                          </Box>
                          <Typography variant="delta" tag="h2">
                            {formatMessage({
                              id: getTrad('settings.form.aiMetadata.label'),
                              defaultMessage:
                                'Generate AI captions and alt texts automatically on upload!',
                            })}
                          </Typography>
                        </Flex>
                        <Flex paddingTop={1}>
                          <Typography variant="pi" textColor="neutral600">
                            {formatMessage({
                              id: getTrad('settings.form.aiMetadata.description'),
                              defaultMessage:
                                'Enable this feature to save time, optimize your SEO and increase accessibility by letting our AI generate captions and alternative texts for you.',
                            })}
                          </Typography>
                        </Flex>
                      </Grid.Item>
                      <Grid.Item
                        col={4}
                        xs={12}
                        direction="column"
                        alignItems="end"
                        justifyContent={'center'}
                      >
                        <Field.Root name="aiMetadata" minWidth="200px">
                          <Toggle
                            checked={modifiedData?.aiMetadata}
                            offLabel={formatMessage({
                              id: 'app.components.ToggleCheckbox.disabled-label',
                              defaultMessage: 'Disabled',
                            })}
                            onLabel={formatMessage({
                              id: 'app.components.ToggleCheckbox.enabled-label',
                              defaultMessage: 'Enabled',
                            })}
                            onChange={(e) => {
                              handleChange({
                                target: { name: 'aiMetadata', value: e.target.checked },
                              });
                            }}
                          />
                        </Field.Root>
                      </Grid.Item>
                    </Grid.Root>
                    {/* Retroactive metadata generation when aiMetadata is enabled */}
                    {initialData?.aiMetadata && !isLoadingMetadataCount && (
                      <>
                        <Divider marginTop={4} marginBottom={4} />
                        <Flex justifyContent="space-between" alignItems="center" gap={2}>
                          <Flex gap={2}>
                            <BetaStatus size="XS" />
                            <Typography variant="pi" textColor="neutral500">
                              {metadataCount === 0
                                ? formatMessage({
                                    id: getTrad('settings.form.aiMetadata.allAssetsHaveMetadata'),
                                    defaultMessage: 'All assets have caption and alt text',
                                  })
                                : formatMessage(
                                    {
                                      id: getTrad('settings.form.aiMetadata.imagesWithoutMetadata'),
                                      defaultMessage:
                                        '{count, plural, one {# image lacks captions or alternative text} other {# images lack captions or alternative text}}',
                                    },
                                    { count: metadataCount }
                                  )}
                            </Typography>
                          </Flex>
                          <MetadataAction
                            jobStatus={jobStatus ?? null}
                            metadataCount={metadataCount}
                            isConfirmDialogOpen={isConfirmDialogOpen}
                            onConfirmDialogChange={setIsConfirmDialogOpen}
                            onGenerate={async () => {
                              await startGenerateAIMetadata();
                            }}
                          />
                        </Flex>
                      </>
                    )}
                  </Flex>
                </Box>
              )}

              <Box background="neutral0" padding={6} shadow="filterShadow" hasRadius>
                <Flex direction="column" alignItems="stretch" gap={4}>
                  <Flex>
                    <Typography variant="delta" tag="h2">
                      {formatMessage({
                        id: getTrad('settings.blockTitle'),
                        defaultMessage: 'Asset management',
                      })}
                    </Typography>
                  </Flex>
                  <Grid.Root gap={6}>
                    <Grid.Item col={6} xs={12} direction="column" alignItems="stretch">
                      <Field.Root
                        hint={formatMessage({
                          id: getTrad('settings.form.responsiveDimensions.description'),
                          defaultMessage:
                            'Enabling this option will generate multiple formats (small, medium and large) of the uploaded asset.',
                        })}
                        name="responsiveDimensions"
                      >
                        <Field.Label>
                          {formatMessage({
                            id: getTrad('settings.form.responsiveDimensions.label'),
                            defaultMessage: 'Responsive friendly upload',
                          })}
                        </Field.Label>
                        <Toggle
                          checked={modifiedData?.responsiveDimensions}
                          offLabel={formatMessage({
                            id: 'app.components.ToggleCheckbox.off-label',
                            defaultMessage: 'Off',
                          })}
                          onLabel={formatMessage({
                            id: 'app.components.ToggleCheckbox.on-label',
                            defaultMessage: 'On',
                          })}
                          onChange={(e) => {
                            handleChange({
                              target: { name: 'responsiveDimensions', value: e.target.checked },
                            });
                          }}
                        />
                        <Field.Hint />
                      </Field.Root>
                    </Grid.Item>
                    <Grid.Item col={6} xs={12} direction="column" alignItems="stretch">
                      <Field.Root
                        hint={formatMessage({
                          id: getTrad('settings.form.sizeOptimization.description'),
                          defaultMessage:
                            'Enabling this option will reduce the image size and slightly reduce its quality.',
                        })}
                        name="sizeOptimization"
                      >
                        <Field.Label>
                          {formatMessage({
                            id: getTrad('settings.form.sizeOptimization.label'),
                            defaultMessage: 'Size optimization',
                          })}
                        </Field.Label>
                        <Toggle
                          checked={modifiedData?.sizeOptimization}
                          offLabel={formatMessage({
                            id: 'app.components.ToggleCheckbox.off-label',
                            defaultMessage: 'Off',
                          })}
                          onLabel={formatMessage({
                            id: 'app.components.ToggleCheckbox.on-label',
                            defaultMessage: 'On',
                          })}
                          onChange={(e) => {
                            handleChange({
                              target: { name: 'sizeOptimization', value: e.target.checked },
                            });
                          }}
                        />
                        <Field.Hint />
                      </Field.Root>
                    </Grid.Item>
                    <Grid.Item col={6} xs={12} direction="column" alignItems="stretch">
                      <Field.Root
                        hint={formatMessage({
                          id: getTrad('settings.form.autoOrientation.description'),
                          defaultMessage:
                            'Enabling this option will automatically rotate the image according to EXIF orientation tag.',
                        })}
                        name="autoOrientation"
                      >
                        <Field.Label>
                          {formatMessage({
                            id: getTrad('settings.form.autoOrientation.label'),
                            defaultMessage: 'Auto orientation',
                          })}
                        </Field.Label>
                        <Toggle
                          checked={modifiedData?.autoOrientation}
                          offLabel={formatMessage({
                            id: 'app.components.ToggleCheckbox.off-label',
                            defaultMessage: 'Off',
                          })}
                          onLabel={formatMessage({
                            id: 'app.components.ToggleCheckbox.on-label',
                            defaultMessage: 'On',
                          })}
                          onChange={(e) => {
                            handleChange({
                              target: { name: 'autoOrientation', value: e.target.checked },
                            });
                          }}
                        />
                        <Field.Hint />
                      </Field.Root>
                    </Grid.Item>
                  </Grid.Root>
                </Flex>
              </Box>
            </Flex>
          </Layouts.Root>
        </Layouts.Content>
      </form>
    </Page.Main>
  );
};

export const ProtectedSettingsPage = () => (
  <Page.Protect permissions={PERMISSIONS.settings}>
    <SettingsPage />
  </Page.Protect>
);
