import * as React from 'react';

import {
  DescriptionComponentRenderer,
  useForm,
  BackButton,
  useNotification,
  useStrapiApp,
  useQueryParams,
  useIsDesktop,
  useDebounce,
  RESPONSIVE_DEFAULT_SPACING,
  useIsMobile,
} from '@strapi/admin/strapi-admin';
import {
  Box,
  Flex,
  SingleSelect,
  SingleSelectOption,
  Typography,
  IconButton,
  Dialog,
  Popover,
} from '@strapi/design-system';
import { ListPlus, Pencil, Trash, WarningCircle } from '@strapi/icons';
import { useIntl } from 'react-intl';
import { useMatch, useNavigate, useParams } from 'react-router-dom';

import { RelativeTime } from '../../../components/RelativeTime';
import {
  CREATED_AT_ATTRIBUTE_NAME,
  CREATED_BY_ATTRIBUTE_NAME,
  PUBLISHED_AT_ATTRIBUTE_NAME,
  PUBLISHED_BY_ATTRIBUTE_NAME,
  UPDATED_AT_ATTRIBUTE_NAME,
  UPDATED_BY_ATTRIBUTE_NAME,
} from '../../../constants/attributes';
import { COLLECTION_TYPES, SINGLE_TYPES } from '../../../constants/collections';
import { useDocumentRBAC } from '../../../features/DocumentRBAC';
import { useDoc } from '../../../hooks/useDocument';
import { useDocumentActions } from '../../../hooks/useDocumentActions';
import { CLONE_PATH, LIST_PATH } from '../../../router';
import { getDisplayName } from '../../../utils/users';

import { DocumentActionsMenu } from './DocumentActions';
import { DocumentStatus } from './DocumentStatus';

import type { ContentManagerPlugin, DocumentActionComponent } from '../../../content-manager';

/* -------------------------------------------------------------------------------------------------
 * Header
 * -----------------------------------------------------------------------------------------------*/

interface HeaderProps {
  isCreating?: boolean;
  status?: 'draft' | 'published' | 'modified';
  title?: string;
}

const Header = ({ isCreating, status, title: documentTitle = 'Untitled' }: HeaderProps) => {
  const { formatMessage } = useIntl();
  const isCloning = useMatch(CLONE_PATH) !== null;
  const isMobile = useIsMobile();
  const params = useParams<{ collectionType: string; slug: string }>();
  const [
    {
      query: { status: activeTab = 'draft' },
    },
  ] = useQueryParams<{ status: 'draft' | 'published' }>();

  const title = isCreating
    ? formatMessage({
        id: 'content-manager.containers.edit.title.new',
        defaultMessage: 'Create an entry',
      })
    : documentTitle;

  return (
    <Flex
      direction="column"
      alignItems="flex-start"
      paddingLeft={RESPONSIVE_DEFAULT_SPACING}
      paddingRight={RESPONSIVE_DEFAULT_SPACING}
      paddingTop={{
        initial: 4,
        medium: 6,
      }}
      paddingBottom={4}
      gap={2}
    >
      {!isMobile && (
        <BackButton
          fallback={
            params.collectionType === SINGLE_TYPES
              ? undefined
              : `../${COLLECTION_TYPES}/${params.slug}`
          }
        />
      )}
      <Flex
        width="100%"
        justifyContent="space-between"
        gap={{
          initial: 2,
          medium: '8rem',
        }}
        alignItems="flex-start"
        direction={{
          initial: 'column-reverse',
          medium: 'row',
        }}
      >
        <Flex
          gap={2}
          justifyContent="space-between"
          alignItems="flex-start"
          width="100%"
          overflow="hidden"
        >
          <Typography variant="alpha" tag="h1" overflow="hidden">
            {title}
          </Typography>
          <Box display={{ initial: 'block', medium: 'none' }}>
            <HeaderDocumentActions activeTab={activeTab} isCloning={isCloning} />
          </Box>
        </Flex>
        <Flex width={{ initial: '100%', medium: 'auto' }} gap={3} justifyContent="space-between">
          {isMobile && (
            <BackButton
              fallback={
                params.collectionType === SINGLE_TYPES
                  ? undefined
                  : `../${COLLECTION_TYPES}/${params.slug}`
              }
            />
          )}
          <HeaderToolbar activeTab={activeTab} isCloning={isCloning} />
        </Flex>
      </Flex>
      {status ? (
        <Box marginTop={1}>
          <DocumentStatus status={isCloning ? 'draft' : status} />
        </Box>
      ) : null}
    </Flex>
  );
};

/* -------------------------------------------------------------------------------------------------
 * HeaderToolbar
 * -----------------------------------------------------------------------------------------------*/

interface DialogOptions {
  type: 'dialog';
  title: string;
  content?: React.ReactNode;
  footer?: React.ReactNode;
}

interface HeaderActionDescription {
  disabled?: boolean;
  label: string;
  icon?: React.ReactNode;
  type?: 'icon' | 'default';
  onClick?: (event: React.SyntheticEvent) => Promise<boolean | void> | boolean | void;
  dialog?: DialogOptions;
  options?: Array<{
    disabled?: boolean;
    label: string;
    startIcon?: React.ReactNode;
    textValue?: string;
    value: string;
    /**
     * @internal
     * @description
     * Internal SelectOption renderer used to display the status of AI translation background jobs
     */
    _render?: () => React.ReactNode;
  }>;
  /**
   * @internal
   * @description
   * Internal document header action to display the status of AI translation background jobs
   */
  _status?: {
    message: React.ReactNode;
    tooltip?: React.ReactNode;
  };
  onSelect?: (value: string) => void;
  value?: string;
  customizeContent?: (value: string) => React.ReactNode;
}

interface HeaderDocumentActionsProps {
  activeTab: 'draft' | 'published';
  isCloning: boolean;
}

const HeaderDocumentActions = ({ activeTab, isCloning }: HeaderDocumentActionsProps) => {
  const { model, id, document, meta, collectionType } = useDoc();
  const { formatMessage } = useIntl();
  const plugins = useStrapiApp('HeaderToolbar', (state) => state.plugins);
  return (
    <DescriptionComponentRenderer
      props={{
        activeTab,
        model,
        documentId: id,
        document: isCloning ? undefined : document,
        meta: isCloning ? undefined : meta,
        collectionType,
      }}
      descriptions={(
        plugins['content-manager'].apis as ContentManagerPlugin['config']['apis']
      ).getDocumentActions('header')}
    >
      {(actions) => {
        const headerActions = actions.filter((action) => {
          const positions = Array.isArray(action.position) ? action.position : [action.position];
          return positions.includes('header');
        });

        return (
          <DocumentActionsMenu
            actions={headerActions}
            label={formatMessage({
              id: 'content-manager.containers.edit.header.more-actions',
              defaultMessage: 'More actions',
            })}
          >
            <Information activeTab={activeTab} />
          </DocumentActionsMenu>
        );
      }}
    </DescriptionComponentRenderer>
  );
};

/**
 * @description Contains the document actions that have `position: header`, if there are
 * none we still render the menu because we render the information about the document there.
 */
const HeaderToolbar = ({ activeTab, isCloning }: HeaderDocumentActionsProps) => {
  const { model, id, document, meta, collectionType } = useDoc();
  const plugins = useStrapiApp('HeaderToolbar', (state) => state.plugins);

  return (
    <Flex gap={2}>
      <DescriptionComponentRenderer
        props={{
          activeTab,
          model,
          documentId: id,
          document: isCloning ? undefined : document,
          meta: isCloning ? undefined : meta,
          collectionType,
        }}
        descriptions={(
          plugins['content-manager'].apis as ContentManagerPlugin['config']['apis']
        ).getHeaderActions()}
      >
        {(actions) => {
          if (actions.length > 0) {
            return <HeaderActions actions={actions} />;
          } else {
            return null;
          }
        }}
      </DescriptionComponentRenderer>
      <Box display={{ initial: 'none', medium: 'block' }}>
        <HeaderDocumentActions activeTab={activeTab} isCloning={isCloning} />
      </Box>
    </Flex>
  );
};

interface InformationProps {
  activeTab: 'draft' | 'published';
}

const Information = ({ activeTab }: InformationProps) => {
  const { formatMessage } = useIntl();
  const { document, meta } = useDoc();

  if (!document || !document.id) {
    return null;
  }

  /**
   * Because in the backend separate entries are made for draft and published
   * documents, the creator fields are different for each of them. For example,
   * you could make your draft in January and then publish it for the first time
   * in Feb. This would make the createdAt value for the published entry in Feb
   * but really we want to show the document as a whole. The draft entry will also
   * never have the publishedAt values.
   *
   * So, we decipher which document to show the creator for based on the activeTab.
   */

  const createAndUpdateDocument =
    activeTab === 'draft'
      ? document
      : meta?.availableStatus.find((status) => status.publishedAt === null);

  const publishDocument =
    activeTab === 'published'
      ? document
      : meta?.availableStatus.find((status) => status.publishedAt !== null);

  const creator = createAndUpdateDocument?.[CREATED_BY_ATTRIBUTE_NAME]
    ? getDisplayName(createAndUpdateDocument[CREATED_BY_ATTRIBUTE_NAME])
    : null;

  const updator = createAndUpdateDocument?.[UPDATED_BY_ATTRIBUTE_NAME]
    ? getDisplayName(createAndUpdateDocument[UPDATED_BY_ATTRIBUTE_NAME])
    : null;

  const information: Array<{ isDisplayed?: boolean; label: string; value: React.ReactNode }> = [
    {
      isDisplayed: !!publishDocument?.[PUBLISHED_AT_ATTRIBUTE_NAME],
      label: formatMessage({
        id: 'content-manager.containers.edit.information.last-published.label',
        defaultMessage: 'Published',
      }),
      value: formatMessage(
        {
          id: 'content-manager.containers.edit.information.last-published.value',
          defaultMessage: `{time}{isAnonymous, select, true {} other { by {author}}}`,
        },
        {
          time: (
            <RelativeTime timestamp={new Date(publishDocument?.[PUBLISHED_AT_ATTRIBUTE_NAME])} />
          ),
          isAnonymous: !publishDocument?.[PUBLISHED_BY_ATTRIBUTE_NAME],
          author: publishDocument?.[PUBLISHED_BY_ATTRIBUTE_NAME]
            ? getDisplayName(publishDocument?.[PUBLISHED_BY_ATTRIBUTE_NAME])
            : null,
        }
      ),
    },
    {
      isDisplayed: !!createAndUpdateDocument?.[UPDATED_AT_ATTRIBUTE_NAME],
      label: formatMessage({
        id: 'content-manager.containers.edit.information.last-draft.label',
        defaultMessage: 'Updated',
      }),
      value: formatMessage(
        {
          id: 'content-manager.containers.edit.information.last-draft.value',
          defaultMessage: `{time}{isAnonymous, select, true {} other { by {author}}}`,
        },
        {
          time: (
            <RelativeTime
              timestamp={new Date(createAndUpdateDocument?.[UPDATED_AT_ATTRIBUTE_NAME])}
            />
          ),
          isAnonymous: !updator,
          author: updator,
        }
      ),
    },
    {
      isDisplayed: !!createAndUpdateDocument?.[CREATED_AT_ATTRIBUTE_NAME],
      label: formatMessage({
        id: 'content-manager.containers.edit.information.document.label',
        defaultMessage: 'Created',
      }),
      value: formatMessage(
        {
          id: 'content-manager.containers.edit.information.document.value',
          defaultMessage: `{time}{isAnonymous, select, true {} other { by {author}}}`,
        },
        {
          time: (
            <RelativeTime
              timestamp={new Date(createAndUpdateDocument?.[CREATED_AT_ATTRIBUTE_NAME])}
            />
          ),
          isAnonymous: !creator,
          author: creator,
        }
      ),
    },
  ].filter((info) => info.isDisplayed);

  return (
    <Flex
      borderWidth="1px 0 0 0"
      borderStyle="solid"
      borderColor="neutral150"
      direction="column"
      marginTop={2}
      tag="dl"
      padding={5}
      gap={3}
      alignItems="flex-start"
      /**
       * The menu content has a padding of 4px, but we want our divider (the border top applied) to
       * be flush with the menu content. So we need to adjust the margin & width to account for the padding.
       */
      marginLeft="-0.4rem"
      marginRight="-0.4rem"
      width="calc(100% + 8px)"
    >
      {information.map((info) => (
        <Flex gap={1} direction="column" alignItems="flex-start" key={info.label}>
          <Typography tag="dt" variant="pi" fontWeight="bold">
            {info.label}
          </Typography>
          <Typography tag="dd" variant="pi" textColor="neutral600">
            {info.value}
          </Typography>
        </Flex>
      ))}
    </Flex>
  );
};

/* -------------------------------------------------------------------------------------------------
 * HeaderActions
 * -----------------------------------------------------------------------------------------------*/

interface HeaderActionsProps {
  actions: Array<HeaderActionDescription & { id: string }>;
}

const HeaderActions = ({ actions }: HeaderActionsProps) => {
  const [dialogId, setDialogId] = React.useState<string | null>(null);

  const handleClick =
    (action: HeaderActionDescription & { id: string }) => async (e: React.MouseEvent) => {
      if (!('options' in action)) {
        const { onClick = () => false, dialog, id } = action;

        const muteDialog = await onClick(e);

        if (dialog && !muteDialog) {
          e.preventDefault();
          setDialogId(id);
        }
      }
    };

  const handleClose = () => {
    setDialogId(null);
  };

  return (
    <Flex gap={1}>
      {actions.map((action) => {
        if (action.options) {
          return (
            <SingleSelect
              key={action.id}
              size="S"
              // @ts-expect-error – the DS will handle numbers, but we're not allowing the API.
              onChange={action.onSelect}
              aria-label={action.label}
              {...action}
            >
              {action.options.map(({ label, ...option }) => {
                if (option._render) {
                  return option._render();
                }

                return (
                  <SingleSelectOption key={option.value} {...option}>
                    {label}
                  </SingleSelectOption>
                );
              })}
            </SingleSelect>
          );
        } else if (action._status) {
          return (
            <HeaderActionStatus tooltip={action._status?.tooltip} key={action.id}>
              {action._status.message}
            </HeaderActionStatus>
          );
        } else {
          return (
            <React.Fragment key={action.id}>
              <IconButton
                disabled={action.disabled}
                label={action.label}
                size="S"
                onClick={handleClick(action)}
              >
                {action.icon}
              </IconButton>
              {action.dialog ? (
                <HeaderActionDialog
                  {...action.dialog}
                  isOpen={dialogId === action.id}
                  onClose={handleClose}
                />
              ) : null}
            </React.Fragment>
          );
        }
      })}
    </Flex>
  );
};

/* -------------------------------------------------------------------------------------------------
 * HeaderActionStatus
 * -----------------------------------------------------------------------------------------------*/

interface HeaderActionStatusProps {
  tooltip: React.ReactNode;
  children: React.ReactNode;
}

const HeaderActionStatus = ({ tooltip, children }: HeaderActionStatusProps) => {
  const [open, setOpen] = React.useState(false);
  // Debounce the open/close so the user can hover over the popover content before it closes
  const debouncedOpen = useDebounce(open, 100);

  const handleMouseEnter = () => {
    if (tooltip) {
      setOpen(true);
    }
  };
  const handleMouseLeave = () => {
    if (tooltip) {
      setOpen(false);
    }
  };

  return (
    <Popover.Root open={debouncedOpen} onOpenChange={setOpen}>
      <Popover.Anchor
        style={{ alignSelf: 'stretch' }}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        aria-describedby="document-header-action-status"
      >
        <Box height="100%">{children}</Box>
      </Popover.Anchor>
      <Popover.Content
        role="tooltip"
        id="document-header-action-status"
        side="bottom"
        align="center"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {tooltip}
      </Popover.Content>
    </Popover.Root>
  );
};

/* -------------------------------------------------------------------------------------------------
 * HeaderActionDialog
 * -----------------------------------------------------------------------------------------------*/
interface HeaderActionDialogProps {
  onClose: () => void;
  onCancel?: () => Promise<void>;
  title: string;
  content?: React.ReactNode | ((props: { onClose: () => void }) => React.ReactNode);
  isOpen: boolean;
}

const HeaderActionDialog = ({
  onClose,
  onCancel,
  title,
  content: Content,
  isOpen,
}: HeaderActionDialogProps) => {
  const handleClose = async () => {
    if (onCancel) {
      await onCancel();
    }

    onClose();
  };

  return (
    <Dialog.Root open={isOpen} onOpenChange={handleClose}>
      <Dialog.Content>
        <Dialog.Header>{title}</Dialog.Header>
        {typeof Content === 'function' ? <Content onClose={handleClose} /> : Content}
      </Dialog.Content>
    </Dialog.Root>
  );
};

/* -------------------------------------------------------------------------------------------------
 * DocumentActionComponents
 * -----------------------------------------------------------------------------------------------*/

const ConfigureTheViewAction: DocumentActionComponent = ({ collectionType, model }) => {
  const navigate = useNavigate();
  const { formatMessage } = useIntl();
  const isDesktop = useIsDesktop();

  return isDesktop
    ? {
        label: formatMessage({
          id: 'app.links.configure-view',
          defaultMessage: 'Configure the view',
        }),
        icon: <ListPlus />,
        onClick: () => {
          navigate(`../${collectionType}/${model}/configurations/edit`);
        },
        position: 'header',
      }
    : null;
};

ConfigureTheViewAction.type = 'configure-the-view';
ConfigureTheViewAction.position = 'header';

const EditTheModelAction: DocumentActionComponent = ({ model }) => {
  const navigate = useNavigate();
  const { formatMessage } = useIntl();
  const isDesktop = useIsDesktop();

  return isDesktop
    ? {
        label: formatMessage({
          id: 'content-manager.link-to-ctb',
          defaultMessage: 'Edit the model',
        }),
        icon: <Pencil />,
        onClick: () => {
          navigate(`/plugins/content-type-builder/content-types/${model}`);
        },
        position: 'header',
      }
    : null;
};

EditTheModelAction.type = 'edit-the-model';
EditTheModelAction.position = 'header';

const DeleteAction: DocumentActionComponent = ({ documentId, model, collectionType, document }) => {
  const navigate = useNavigate();
  const { formatMessage } = useIntl();
  const listViewPathMatch = useMatch(LIST_PATH);
  const canDelete = useDocumentRBAC('DeleteAction', (state) => state.canDelete);
  const { delete: deleteAction, isLoading } = useDocumentActions();
  const { toggleNotification } = useNotification();
  const setSubmitting = useForm('DeleteAction', (state) => state.setSubmitting);
  const isLocalized = document?.locale != null;

  return {
    disabled: !canDelete || !document,
    label: formatMessage(
      {
        id: 'content-manager.actions.delete.label',
        defaultMessage: 'Delete entry{isLocalized, select, true { (all locales)} other {}}',
      },
      { isLocalized }
    ),
    icon: <Trash />,
    dialog: {
      type: 'dialog',
      title: formatMessage({
        id: 'app.components.ConfirmDialog.title',
        defaultMessage: 'Confirmation',
      }),
      content: (
        <Flex direction="column" gap={2}>
          <WarningCircle width="24px" height="24px" fill="danger600" />
          <Typography tag="p" variant="omega" textAlign="center">
            {formatMessage({
              id: 'content-manager.actions.delete.dialog.body',
              defaultMessage: 'Are you sure?',
            })}
          </Typography>
        </Flex>
      ),
      loading: isLoading,
      onConfirm: async () => {
        /**
         * If we have a match, we're in the list view
         * and therefore not in a form and shouldn't be
         * trying to set the submitting value.
         */
        if (!listViewPathMatch) {
          setSubmitting(true);
        }
        try {
          if (!documentId && collectionType !== SINGLE_TYPES) {
            console.error(
              "You're trying to delete a document without an id, this is likely a bug with Strapi. Please open an issue."
            );

            toggleNotification({
              message: formatMessage({
                id: 'content-manager.actions.delete.error',
                defaultMessage: 'An error occurred while trying to delete the document.',
              }),
              type: 'danger',
            });

            return;
          }

          const res = await deleteAction({
            documentId,
            model,
            collectionType,
            params: {
              locale: '*',
            },
          });

          if (!('error' in res)) {
            navigate({ pathname: `../${collectionType}/${model}` }, { replace: true });
          }
        } finally {
          if (!listViewPathMatch) {
            setSubmitting(false);
          }
        }
      },
    },
    variant: 'danger',
    position: ['header', 'table-row'],
  };
};

DeleteAction.type = 'delete';
DeleteAction.position = ['header', 'table-row'];

const DEFAULT_HEADER_ACTIONS = [EditTheModelAction, ConfigureTheViewAction, DeleteAction];

export { Header, DEFAULT_HEADER_ACTIONS };
export type { HeaderProps, HeaderActionDescription };
