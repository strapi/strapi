import * as React from 'react';

import { createContext } from '@radix-ui/react-context';
import {
  Box,
  Button,
  ButtonProps,
  Card,
  CardAsset,
  CardBadge,
  CardBody,
  CardContent,
  CardHeader,
  CardSubtitle,
  CardTitle,
  CarouselActions,
  CarouselInput,
  CarouselInputProps,
  CarouselSlide,
  Divider,
  Field,
  FieldError,
  FieldInput,
  Flex,
  Icon,
  IconButton,
  ModalFooter,
  ModalHeader,
  ModalLayout,
  Tab,
  TabGroup,
  TabPanel,
  TabPanels,
  Tabs,
  TextInput,
  TextInputProps,
  Typography,
} from '@strapi/design-system';
import { pxToRem } from '@strapi/helper-plugin';
import { PicturePlus, Plus, Refresh } from '@strapi/icons';
import axios, { AxiosError } from 'axios';
import { useIntl } from 'react-intl';
import styled from 'styled-components';

import { ConfigurationProviderProps } from '../../../../../features/Configuration';
import { ACCEPTED_FORMAT, DIMENSION, SIZE } from '../utils/constants';
import { ImageAsset, ParsingFileError, parseFileMetadatas } from '../utils/files';

/* -------------------------------------------------------------------------------------------------
 * LogoInputContext
 * -----------------------------------------------------------------------------------------------*/

interface LogoInputContextValue {
  localImage: ImageAsset | undefined;
  goToStep: (step: Step) => void;
  onClose: () => void;
  setLocalImage: (asset: ImageAsset | undefined) => void;
}

const [LogoInputContextProvider, useLogoInputContext] =
  createContext<LogoInputContextValue>('LogoInput');

/* -------------------------------------------------------------------------------------------------
 * LogoInput
 * -----------------------------------------------------------------------------------------------*/

interface LogoInputProps
  extends Pick<PendingLogoDialogProps, 'onChangeLogo'>,
    Pick<CarouselInputProps, 'label' | 'hint'> {
  canUpdate: boolean;
  customLogo?: ConfigurationProviderProps['authLogo']['custom'];
  defaultLogo: string;
}

type Step = 'pending' | 'upload' | undefined;

const LogoInput = ({
  canUpdate,
  customLogo,
  defaultLogo,
  hint,
  label,
  onChangeLogo,
}: LogoInputProps) => {
  const [localImage, setLocalImage] = React.useState<ImageAsset | undefined>();
  const [currentStep, setCurrentStep] = React.useState<Step>();
  const { formatMessage } = useIntl();

  const handleClose = () => {
    setLocalImage(undefined);
    setCurrentStep(undefined);
  };

  return (
    <LogoInputContextProvider
      setLocalImage={setLocalImage}
      localImage={localImage}
      goToStep={setCurrentStep}
      onClose={handleClose}
    >
      <CarouselInput
        label={label}
        selectedSlide={0}
        hint={hint}
        // Carousel is used here for a single media,
        // we don't need previous and next labels but these props are required
        previousLabel=""
        nextLabel=""
        onNext={() => {}}
        onPrevious={() => {}}
        secondaryLabel={customLogo?.name || 'logo.png'}
        actions={
          <CarouselActions>
            <IconButton
              disabled={!canUpdate}
              onClick={() => setCurrentStep('upload')}
              label={formatMessage({
                id: 'Settings.application.customization.carousel.change-action',
                defaultMessage: 'Change logo',
              })}
              icon={<Plus />}
            />
            {customLogo?.url && (
              <IconButton
                disabled={!canUpdate}
                onClick={() => onChangeLogo(null)}
                label={formatMessage({
                  id: 'Settings.application.customization.carousel.reset-action',
                  defaultMessage: 'Reset logo',
                })}
                icon={<Refresh />}
              />
            )}
          </CarouselActions>
        }
      >
        <CarouselSlide
          label={formatMessage({
            id: 'Settings.application.customization.carousel-slide.label',
            defaultMessage: 'Logo slide',
          })}
        >
          <Box
            maxHeight="40%"
            maxWidth="40%"
            as="img"
            src={customLogo?.url || defaultLogo}
            alt={formatMessage({
              id: 'Settings.application.customization.carousel.title',
              defaultMessage: 'Logo',
            })}
          />
        </CarouselSlide>
      </CarouselInput>
      {currentStep ? (
        <ModalLayout labelledBy="modal" onClose={handleClose}>
          <ModalHeader>
            <Typography fontWeight="bold" as="h2" id="modal">
              {formatMessage(
                currentStep === 'upload'
                  ? {
                      id: 'Settings.application.customization.modal.upload',
                      defaultMessage: 'Upload logo',
                    }
                  : {
                      id: 'Settings.application.customization.modal.pending',
                      defaultMessage: 'Pending logo',
                    }
              )}
            </Typography>
          </ModalHeader>
          {currentStep === 'upload' ? (
            <AddLogoDialog />
          ) : (
            <PendingLogoDialog onChangeLogo={onChangeLogo} />
          )}
        </ModalLayout>
      ) : null}
    </LogoInputContextProvider>
  );
};

/* -------------------------------------------------------------------------------------------------
 * AddLogoDialog
 * -----------------------------------------------------------------------------------------------*/

const AddLogoDialog = () => {
  const { formatMessage } = useIntl();

  return (
    <TabGroup
      label={formatMessage({
        id: 'Settings.application.customization.modal.tab.label',
        defaultMessage: 'How do you want to upload your assets?',
      })}
      variant="simple"
    >
      <Box paddingLeft={8} paddingRight={8}>
        <Tabs>
          <Tab>
            {formatMessage({
              id: 'Settings.application.customization.modal.upload.from-computer',
              defaultMessage: 'From computer',
            })}
          </Tab>
          <Tab>
            {formatMessage({
              id: 'Settings.application.customization.modal.upload.from-url',
              defaultMessage: 'From url',
            })}
          </Tab>
        </Tabs>
        <Divider />
      </Box>
      <TabPanels>
        <TabPanel>
          <ComputerForm />
        </TabPanel>
        <TabPanel>
          <URLForm />
        </TabPanel>
      </TabPanels>
    </TabGroup>
  );
};

/* -------------------------------------------------------------------------------------------------
 * URLForm
 * -----------------------------------------------------------------------------------------------*/

const URLForm = () => {
  const { formatMessage } = useIntl();
  const [logoUrl, setLogoUrl] = React.useState('');
  const [error, setError] = React.useState<string>();
  const { setLocalImage, goToStep, onClose } = useLogoInputContext('URLForm');

  const handleChange: TextInputProps['onChange'] = (e) => {
    setLogoUrl(e.target.value);
  };

  const handleSubmit: React.FormEventHandler<HTMLFormElement> = async (event) => {
    event.preventDefault();

    const data = new FormData(event.target as HTMLFormElement);

    const url = data.get('logo-url');

    if (!url) {
      return;
    }

    try {
      const res = await axios.get(url.toString(), { responseType: 'blob', timeout: 8000 });

      const file = new File([res.data], res.config.url ?? '', {
        type: res.headers['content-type'],
      });

      const asset = await parseFileMetadatas(file);

      setLocalImage(asset);
      goToStep('pending');
    } catch (err) {
      if (err instanceof AxiosError) {
        setError(
          formatMessage({
            id: 'Settings.application.customization.modal.upload.error-network',
            defaultMessage: 'Network error',
          })
        );
      } else if (err instanceof ParsingFileError) {
        setError(formatMessage(err.displayMessage, { size: SIZE, dimension: DIMENSION }));
      } else {
        throw err;
      }
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <Box paddingLeft={8} paddingRight={8} paddingTop={6} paddingBottom={6}>
        <TextInput
          label={formatMessage({
            id: 'Settings.application.customization.modal.upload.from-url.input-label',
            defaultMessage: 'URL',
          })}
          error={error}
          onChange={handleChange}
          value={logoUrl}
          name="logo-url"
        />
      </Box>
      <ModalFooter
        startActions={
          <Button onClick={onClose} variant="tertiary">
            {formatMessage({ id: 'app.components.Button.cancel', defaultMessage: 'Cancel' })}
          </Button>
        }
        endActions={
          <Button type="submit">
            {formatMessage({
              id: 'Settings.application.customization.modal.upload.next',
              defaultMessage: 'Next',
            })}
          </Button>
        }
      />
    </form>
  );
};

/* -------------------------------------------------------------------------------------------------
 * ComputerForm
 * -----------------------------------------------------------------------------------------------*/

const ComputerForm = () => {
  const { formatMessage } = useIntl();
  const [dragOver, setDragOver] = React.useState(false);
  const [fileError, setFileError] = React.useState<string>();
  const inputRef = React.useRef<HTMLInputElement>(null!);
  const id = React.useId();

  const { setLocalImage, goToStep, onClose } = useLogoInputContext('ComputerForm');

  const handleDragEnter = () => setDragOver(true);
  const handleDragLeave = () => setDragOver(false);

  const handleClick: ButtonProps['onClick'] = (e) => {
    e.preventDefault();
    inputRef.current.click();
  };

  const handleChange = async () => {
    handleDragLeave();

    if (!inputRef.current.files) {
      return;
    }

    const [file] = inputRef.current.files;

    try {
      const asset = await parseFileMetadatas(file);
      setLocalImage(asset);
      goToStep('pending');
    } catch (err) {
      if (err instanceof ParsingFileError) {
        setFileError(formatMessage(err.displayMessage, { size: SIZE, dimension: DIMENSION }));
        inputRef.current.focus();
      } else {
        throw err;
      }
    }
  };

  return (
    <>
      <form>
        <Box paddingLeft={8} paddingRight={8} paddingTop={6} paddingBottom={6}>
          <Field name={id} error={fileError}>
            <Flex direction="column" alignItems="stretch" gap={2}>
              <Flex
                paddingTop={9}
                paddingBottom={7}
                hasRadius
                justifyContent="center"
                direction="column"
                background={dragOver ? 'primary100' : 'neutral100'}
                borderColor={dragOver ? 'primary500' : fileError ? 'danger600' : 'neutral300'}
                borderStyle="dashed"
                borderWidth="1px"
                position="relative"
                onDragEnter={handleDragEnter}
                onDragLeave={handleDragLeave}
              >
                <Icon
                  color="primary600"
                  width={pxToRem(60)}
                  height={pxToRem(60)}
                  as={PicturePlus}
                  aria-hidden
                />
                <Box paddingTop={3} paddingBottom={5}>
                  <Typography variant="delta" as="label" htmlFor={id}>
                    {formatMessage({
                      id: 'Settings.application.customization.modal.upload.drag-drop',
                      defaultMessage: 'Drag and Drop here or',
                    })}
                  </Typography>
                </Box>
                <FileInput
                  accept={ACCEPTED_FORMAT.join(', ')}
                  type="file"
                  name="files"
                  tabIndex={-1}
                  onChange={handleChange}
                  ref={inputRef}
                  id={id}
                />
                <Button type="button" onClick={handleClick}>
                  {formatMessage({
                    id: 'Settings.application.customization.modal.upload.cta.browse',
                    defaultMessage: 'Browse files',
                  })}
                </Button>
                <Box paddingTop={6}>
                  <Typography variant="pi" textColor="neutral600">
                    {formatMessage(
                      {
                        id: 'Settings.application.customization.modal.upload.file-validation',
                        defaultMessage:
                          'Max dimension: {dimension}x{dimension}, Max size: {size}KB',
                      },
                      { size: SIZE, dimension: DIMENSION }
                    )}
                  </Typography>
                </Box>
              </Flex>
              <FieldError />
            </Flex>
          </Field>
        </Box>
      </form>
      <ModalFooter
        startActions={
          <Button onClick={onClose} variant="tertiary">
            {formatMessage({
              id: 'Settings.application.customization.modal.cancel',
              defaultMessage: 'Cancel',
            })}
          </Button>
        }
      />
    </>
  );
};

const FileInput = styled(FieldInput)`
  opacity: 0;
  position: absolute;
  top: 0;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 1;
`;

/* -------------------------------------------------------------------------------------------------
 * PendingLogoDialog
 * -----------------------------------------------------------------------------------------------*/

interface PendingLogoDialogProps {
  onChangeLogo: (file: ImageAsset | null) => void;
}

const PendingLogoDialog = ({ onChangeLogo }: PendingLogoDialogProps) => {
  const { formatMessage } = useIntl();
  const { localImage, setLocalImage, goToStep, onClose } = useLogoInputContext('PendingLogoDialog');

  const handleGoBack = () => {
    setLocalImage(undefined);
    goToStep('upload');
  };

  const handleUpload = () => {
    if (localImage) {
      onChangeLogo(localImage);
    }
    onClose();
  };

  return (
    <>
      <Box paddingLeft={8} paddingRight={8} paddingTop={6} paddingBottom={6}>
        <Flex justifyContent="space-between" paddingBottom={6}>
          <Flex direction="column" alignItems="flex-start">
            <Typography variant="pi" fontWeight="bold">
              {formatMessage({
                id: 'Settings.application.customization.modal.pending.title',
                defaultMessage: 'Logo ready to upload',
              })}
            </Typography>
            <Typography variant="pi" textColor="neutral500">
              {formatMessage({
                id: 'Settings.application.customization.modal.pending.subtitle',
                defaultMessage: 'Manage the chosen logo before uploading it',
              })}
            </Typography>
          </Flex>
          <Button onClick={handleGoBack} variant="secondary">
            {formatMessage({
              id: 'Settings.application.customization.modal.pending.choose-another',
              defaultMessage: 'Choose another logo',
            })}
          </Button>
        </Flex>
        <Box maxWidth={pxToRem(180)}>
          {localImage?.url ? <ImageCardAsset asset={localImage} /> : null}
        </Box>
      </Box>
      <ModalFooter
        startActions={
          <Button onClick={onClose} variant="tertiary">
            {formatMessage({
              id: 'Settings.application.customization.modal.cancel',
              defaultMessage: 'Cancel',
            })}
          </Button>
        }
        endActions={
          <Button onClick={handleUpload}>
            {formatMessage({
              id: 'Settings.application.customization.modal.pending.upload',
              defaultMessage: 'Upload logo',
            })}
          </Button>
        }
      />
    </>
  );
};

/* -------------------------------------------------------------------------------------------------
 * ImageCardAsset
 * -----------------------------------------------------------------------------------------------*/

interface ImageCardAssetProps {
  asset: ImageAsset;
}

const ImageCardAsset = ({ asset }: ImageCardAssetProps) => {
  const { formatMessage } = useIntl();

  return (
    <Card>
      <CardHeader>
        <CardAsset size="S" src={asset.url} />
      </CardHeader>
      <CardBody>
        <CardContent>
          <CardTitle>{asset.name}</CardTitle>
          <CardSubtitle>
            {`${asset.ext?.toUpperCase()} - ${asset.width}✕${asset.height}`}
          </CardSubtitle>
        </CardContent>
        <CardBadge>
          {formatMessage({
            id: 'Settings.application.customization.modal.pending.card-badge',
            defaultMessage: 'image',
          })}
        </CardBadge>
      </CardBody>
    </Card>
  );
};

export { LogoInput };
export type { LogoInputProps };
