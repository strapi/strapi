import * as React from 'react';

import {
  useForm,
  useQueryParams,
  useTracking,
  ConfirmDialog,
  useNotification,
  useAPIErrorHandler,
} from '@strapi/admin/strapi-admin';
import { Button, Dialog, Flex, Radio, Typography } from '@strapi/design-system';
import { WarningCircle } from '@strapi/icons';
import { UID } from '@strapi/types';
import { stringify } from 'qs';
import { useIntl } from 'react-intl';
import { Link, useLocation, useNavigate } from 'react-router-dom';

import { type PanelComponent } from '../../content-manager';
import { useDoc } from '../../hooks/useDocument';
import { useDocumentActions } from '../../hooks/useDocumentActions';
import { transformData } from '../../pages/EditView/components/DocumentActions';
import { isBaseQueryError, buildValidParams } from '../../utils/api';
import { useGetPreviewUrlQuery } from '../services/preview';

/* -------------------------------------------------------------------------------------------------
 * UnsavedChangesDialog
 * -----------------------------------------------------------------------------------------------*/

const DIALOG_OPTIONS = {
  SAVE: 'save',
  CONTINUE: 'continue',
};

interface UnsavedChangesDialogProps extends Pick<Dialog.Props, 'open' | 'onOpenChange'> {
  navigateToPreview: () => void;
}

const UnsavedChangesDialog = ({
  open,
  onOpenChange,
  navigateToPreview,
}: UnsavedChangesDialogProps) => {
  const { formatMessage } = useIntl();
  const { toggleNotification } = useNotification();

  // Dialog form state
  const [shouldSave, setShouldSave] = React.useState(true);

  // Edit view form management
  const document = useForm('UpdateAction', ({ values }) => values);
  const validate = useForm('UpdateAction', (state) => state.validate);
  const setErrors = useForm('UpdateAction', (state) => state.setErrors);
  const resetForm = useForm('PublishAction', ({ resetForm }) => resetForm);

  // Params needed by the update action
  const [{ query }] = useQueryParams();
  const params = React.useMemo(() => buildValidParams(query), [query]);
  const { collectionType, model, id: documentId } = useDoc();

  const { _unstableFormatValidationErrors: formatValidationErrors } = useAPIErrorHandler();
  const { update } = useDocumentActions();

  const handleConfirm = async () => {
    if (shouldSave) {
      try {
        const { errors } = await validate(true, {
          status: 'draft',
        });

        if (errors) {
          toggleNotification({
            type: 'danger',
            message: formatMessage({
              id: 'content-manager.validation.error',
              defaultMessage:
                'There are validation errors in your document. Please fix them before saving.',
            }),
          });

          return;
        }

        const res = await update(
          {
            collectionType,
            model,
            documentId,
            params,
          },
          transformData(document)
        );

        if ('error' in res && isBaseQueryError(res.error) && res.error.name === 'ValidationError') {
          setErrors(formatValidationErrors(res.error));
        } else {
          resetForm();
        }
      } catch (e) {
        toggleNotification({
          type: 'danger',
          message: formatMessage({
            id: 'anErrorOccurred',
          }),
        });
      }
    }

    navigateToPreview();
  };

  const handleOptionChange = (value: string) => {
    setShouldSave(value === DIALOG_OPTIONS.SAVE);
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <ConfirmDialog onConfirm={handleConfirm}>
        <Flex direction="column" gap={6} alignItems="flex-start">
          <Flex
            direction="column"
            alignItems="center"
            justifyContent="center"
            gap={2}
            textAlign="center"
          >
            <WarningCircle width="32px" height="32px" fill="danger600" />
            <Typography>
              {formatMessage({
                id: 'content-manager.preview.panel.dialog.description',
                defaultMessage:
                  'Some changes were not saved. If you open the preview without saving, these changes will be lost.',
              })}
            </Typography>
          </Flex>
          <Radio.Group
            aria-label={formatMessage({
              id: 'content-manager.preview.panel.dialog.radio-label',
              defaultMessage: 'Choose an option to open the preview.',
            })}
            value={shouldSave ? DIALOG_OPTIONS.SAVE : DIALOG_OPTIONS.CONTINUE}
            onValueChange={handleOptionChange}
          >
            <Radio.Item checked={shouldSave} value={DIALOG_OPTIONS.SAVE}>
              {formatMessage({
                id: 'content-manager.preview.panel.dialog.option-save',
                defaultMessage: 'Save and open preview',
              })}
            </Radio.Item>
            <Radio.Item checked={!shouldSave} value={DIALOG_OPTIONS.CONTINUE}>
              {formatMessage({
                id: 'content-manager.preview.panel.dialog.option-continue',
                defaultMessage: 'Open preview without saving',
              })}
            </Radio.Item>
          </Radio.Group>
        </Flex>
      </ConfirmDialog>
    </Dialog.Root>
  );
};

/* -------------------------------------------------------------------------------------------------
 * PreviewSidePanel
 * -----------------------------------------------------------------------------------------------*/

const PreviewSidePanel: PanelComponent = ({ model, documentId, document }) => {
  const { formatMessage } = useIntl();
  const { trackUsage } = useTracking();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [{ query }] = useQueryParams();
  const isModified = useForm('PreviewSidePanel', (state) => state.modified);
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);

  /**
   * The preview URL isn't used in this component, we just fetch it to know if preview is enabled
   * for the content type. If it's not, the panel is not displayed. If it is, we display a link to
   * /preview, and the URL will already be loaded in the RTK query cache.
   */
  const { data, error } = useGetPreviewUrlQuery({
    params: {
      contentType: model as UID.ContentType,
    },
    query: {
      documentId,
      locale: document?.locale,
      status: document?.status,
    },
  });

  if (!data?.data?.url || error) {
    return null;
  }

  const trackNavigation = () => {
    // Append /preview to the current URL
    const destinationPathname = pathname.replace(/\/$/, '') + '/preview';
    trackUsage('willNavigate', { from: pathname, to: destinationPathname });
  };

  const linkDestination = { pathname: 'preview', search: stringify(query, { encode: false }) };

  const navigateToPreview = () => {
    trackNavigation();
    navigate(linkDestination);
  };

  const handleClick = (e: React.MouseEvent) => {
    if (isModified) {
      // Prevent default link behavior if there are unsaved changes
      e.preventDefault();
      // Instead go through the dialog instead to have the option to save before leaving the page.
      setIsDialogOpen(true);
    } else {
      // Rely on the default link behavior, but add tracking event
      trackNavigation();
    }
  };

  return {
    title: formatMessage({ id: 'content-manager.preview.panel.title', defaultMessage: 'Preview' }),
    content: (
      <>
        <Flex gap={2} width="100%">
          <Button
            variant="tertiary"
            tag={Link}
            to={linkDestination}
            onClick={handleClick}
            flex="auto"
          >
            {formatMessage({
              id: 'content-manager.preview.panel.button',
              defaultMessage: 'Open preview',
            })}
          </Button>
        </Flex>
        <UnsavedChangesDialog
          open={isDialogOpen}
          onOpenChange={setIsDialogOpen}
          navigateToPreview={navigateToPreview}
        />
      </>
    ),
  };
};

export { PreviewSidePanel };
