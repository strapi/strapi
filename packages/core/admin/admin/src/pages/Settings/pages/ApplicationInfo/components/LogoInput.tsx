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
  Field,
  Flex,
  IconButton,
  Modal,
  Tabs,
  TextInput,
  TextInputProps,
  Typography,
} from '@strapi/design-system';
import { PlusCircle, Plus, ArrowClockwise } from '@strapi/icons';
import axios, { AxiosError } from 'axios';
import { useIntl } from 'react-intl';
import { styled } from 'styled-components';

import { ConfigurationContextValue } from '../../../../../features/Configuration';
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
  customLogo?: ConfigurationContextValue['logos']['auth']['custom'];
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
    <Modal.Root
      open={!!currentStep}
      onOpenChange={(state) => {
        if (state === false) {
          handleClose();
        }
      }}
    >
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
              <Modal.Trigger>
                <IconButton
                  disabled={!canUpdate}
                  onClick={() => setCurrentStep('upload')}
                  label={formatMessage({
                    id: 'Settings.application.customization.carousel.change-action',
                    defaultMessage: 'Change logo',
                  })}
                >
                  <Plus />
                </IconButton>
              </Modal.Trigger>
              {customLogo?.url && (
                <IconButton
                  disabled={!canUpdate}
                  onClick={() => onChangeLogo(null)}
                  label={formatMessage({
                    id: 'Settings.application.customization.carousel.reset-action',
                    defaultMessage: 'Reset logo',
                  })}
                >
                  <ArrowClockwise />
                </IconButton>
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
              tag="img"
              src={customLogo?.url || defaultLogo}
              alt={formatMessage({
                id: 'Settings.application.customization.carousel.title',
                defaultMessage: 'Logo',
              })}
            />
          </CarouselSlide>
        </CarouselInput>
        <Modal.Content>
          <Modal.Header>
            <Modal.Title>
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
            </Modal.Title>
          </Modal.Header>
          {currentStep === 'upload' ? (
            <AddLogoDialog />
          ) : (
            <PendingLogoDialog onChangeLogo={onChangeLogo} />
          )}
        </Modal.Content>
      </LogoInputContextProvider>
    </Modal.Root>
  );
};

/* -------------------------------------------------------------------------------------------------
 * AddLogoDialog
 * -----------------------------------------------------------------------------------------------*/

const AddLogoDialog = () => {
  const { formatMessage } = useIntl();

  return (
    <Tabs.Root variant="simple" defaultValue="computer">
      <Box paddingLeft={8} paddingRight={8}>
        <Tabs.List
          aria-label={formatMessage({
            id: 'Settings.application.customization.modal.tab.label',
            defaultMessage: 'How do you want to upload your assets?',
          })}
        >
          <Tabs.Trigger value="computer">
            {formatMessage({
              id: 'Settings.application.customization.modal.upload.from-computer',
              defaultMessage: 'From computer',
            })}
          </Tabs.Trigger>
          <Tabs.Trigger value="url">
            {formatMessage({
              id: 'Settings.application.customization.modal.upload.from-url',
              defaultMessage: 'From url',
            })}
          </Tabs.Trigger>
        </Tabs.List>
      </Box>
      <Tabs.Content value="computer">
        <ComputerForm />
      </Tabs.Content>
      <Tabs.Content value="url">
        <URLForm />
      </Tabs.Content>
    </Tabs.Root>
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
        <Field.Root error={error} name="logo-url">
          <Field.Label>
            {formatMessage({
              id: 'Settings.application.customization.modal.upload.from-url.input-label',
              defaultMessage: 'URL',
            })}
          </Field.Label>
          <TextInput onChange={handleChange} value={logoUrl} />
          <Field.Error />
        </Field.Root>
      </Box>
      <Modal.Footer>
        <Button onClick={onClose} variant="tertiary">
          {formatMessage({ id: 'app.components.Button.cancel', defaultMessage: 'Cancel' })}
        </Button>
        <Button type="submit">
          {formatMessage({
            id: 'Settings.application.customization.modal.upload.next',
            defaultMessage: 'Next',
          })}
        </Button>
      </Modal.Footer>
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

  const handleDragEnter = () => {
    setDragOver(true);
  };
  const handleDragLeave = () => {
    setDragOver(false);
  };

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
          <Field.Root name={id} error={fileError}>
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
                <PlusCircle fill="primary600" width="6rem" height="6rem" aria-hidden />
                <Box paddingTop={3} paddingBottom={5}>
                  <Typography variant="delta" tag="label" htmlFor={id}>
                    {formatMessage({
                      id: 'Settings.application.customization.modal.upload.drag-drop',
                      defaultMessage: 'Drag and Drop here or',
                    })}
                  </Typography>
                </Box>
                <Box position="relative">
                  <FileInput
                    accept={ACCEPTED_FORMAT.join(', ')}
                    type="file"
                    name="files"
                    tabIndex={-1}
                    onChange={handleChange}
                    ref={inputRef}
                    id={id}
                  />
                </Box>
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
              <Field.Error />
            </Flex>
          </Field.Root>
        </Box>
      </form>
      <Modal.Footer>
        <Button onClick={onClose} variant="tertiary">
          {formatMessage({ id: 'app.components.Button.cancel', defaultMessage: 'Cancel' })}
        </Button>
      </Modal.Footer>
    </>
  );
};

const FileInput = styled(Field.Input)`
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
      <Modal.Body>
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
          <Box maxWidth={`18rem`}>
            {localImage?.url ? <ImageCardAsset asset={localImage} /> : null}
          </Box>
        </Box>
      </Modal.Body>
      <Modal.Footer>
        <Modal.Close>
          <Button onClick={onClose} variant="tertiary">
            {formatMessage({
              id: 'Settings.application.customization.modal.cancel',
              defaultMessage: 'Cancel',
            })}
          </Button>
        </Modal.Close>
        <Button onClick={handleUpload}>
          {formatMessage({
            id: 'Settings.application.customization.modal.pending.upload',
            defaultMessage: 'Upload logo',
          })}
        </Button>
      </Modal.Footer>
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
