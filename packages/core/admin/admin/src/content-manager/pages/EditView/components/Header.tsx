import { Flex, Status, Typography } from '@strapi/design-system';
import { Link } from '@strapi/design-system/v2';
import { useQueryParams, useStrapiApp } from '@strapi/helper-plugin';
import { ArrowLeft, Cog, ExclamationMarkCircle, Pencil, Trash } from '@strapi/icons';
import { useIntl } from 'react-intl';
import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';

import { DescriptionComponentRenderer } from '../../../../components/DescriptionComponentRenderer';
import { capitalise } from '../../../../utils/strings';
import { useDocumentRBAC } from '../../../features/DocumentRBAC';
import { useDoc } from '../../../hooks/useDocument';
import { useDocumentActions } from '../../../hooks/useDocumentActions';
import { getTranslation } from '../../../utils/translations';

import { DocumentActionsMenu } from './DocumentActions';

import type {
  ContentManagerPlugin,
  DocumentActionComponent,
  DocumentActionProps,
} from '../../../../core/apis/content-manager';

/* -------------------------------------------------------------------------------------------------
 * Header
 * -----------------------------------------------------------------------------------------------*/

interface HeaderProps {
  isCreating?: boolean;
  status?: 'draft' | 'published' | 'modified';
  title?: string;
}

const Header = ({
  isCreating,
  status = 'draft',
  title: documentTitle = 'Untitled',
}: HeaderProps) => {
  const { formatMessage } = useIntl();

  const title = isCreating
    ? formatMessage({
        id: getTranslation('containers.Edit.pluginHeader.title.new'),
        defaultMessage: 'Create an entry',
      })
    : documentTitle;

  const statusVariant =
    status === 'draft' ? 'primary' : status === 'published' ? 'success' : 'alternative';

  return (
    <Flex direction="column" alignItems="flex-start" paddingTop={8} paddingBottom={4} gap={3}>
      {/* TODO: implement back button behaviour, track issue - https://strapi-inc.atlassian.net/browse/CONTENT-2173 */}
      <Link startIcon={<ArrowLeft />}>
        {formatMessage({
          id: 'global.back',
          defaultMessage: 'Back',
        })}
      </Link>
      <Flex width="100%" justifyContent="space-between" paddingTop={1}>
        <Typography variant="alpha" as="h1">
          {title}
        </Typography>
        <HeaderActions />
      </Flex>
      <Status showBullet={false} size={'S'} variant={statusVariant}>
        <Typography as="span" variant="omega" fontWeight="bold">
          {capitalise(status)}
        </Typography>
      </Status>
    </Flex>
  );
};

/* -------------------------------------------------------------------------------------------------
 * HeaderActions
 * -----------------------------------------------------------------------------------------------*/

/**
 * @description Contains the document actions that have `position: header`, if there are
 * none we still render the menu because we render the information about the document there.
 */
const HeaderActions = () => {
  const [
    {
      query: { status = 'draft' },
    },
  ] = useQueryParams<{ status: 'draft' | 'published' }>();
  const { model, id, document, meta, collectionType } = useDoc();
  const { plugins } = useStrapiApp();

  const props = {
    activeTab: status,
    model,
    id,
    document,
    meta,
    collectionType,
  } satisfies DocumentActionProps;

  return (
    <Flex gap={2}>
      <DescriptionComponentRenderer
        props={props}
        descriptions={(
          plugins['content-manager'].apis as ContentManagerPlugin['config']['apis']
        ).getDocumentActions()}
      >
        {(actions) => {
          const headerActions = actions.filter((act) => act.position === 'header');
          return <DocumentActionsMenu actions={headerActions} />;
        }}
      </DescriptionComponentRenderer>
    </Flex>
  );
};

/* -------------------------------------------------------------------------------------------------
 * DocumentActionComponents
 * -----------------------------------------------------------------------------------------------*/

const ConfigureTheViewAction: DocumentActionComponent = ({ collectionType, model }) => {
  const navigate = useNavigate();
  const { formatMessage } = useIntl();

  return {
    label: formatMessage({
      id: 'app.links.configure-view',
      defaultMessage: 'Configure the view',
    }),
    icon: <StyledCog />,
    onClick: () => {
      navigate(`../${collectionType}/${model}/configurations/edit`);
    },
    position: 'header',
  };
};

ConfigureTheViewAction.type = 'configure-the-view';

/**
 * Because the icon system is completely broken, we have to do
 * this to remove the fill from the cog.
 */
const StyledCog = styled(Cog)`
  path {
    fill: none;
    stroke: currentColor;
  }
`;

const EditTheModelAction: DocumentActionComponent = ({ model }) => {
  const navigate = useNavigate();
  const { formatMessage } = useIntl();

  return {
    label: formatMessage({
      id: 'content-manager.link-to-ctb',
      defaultMessage: 'Edit the model',
    }),
    icon: <StyledPencil />,
    onClick: () => {
      navigate(`/plugins/content-type-builder/content-types/${model}`);
    },
    position: 'header',
  };
};

EditTheModelAction.type = 'edit-the-model';

/**
 * Because the icon system is completely broken, we have to do
 * this to remove the fill from the cog.
 */
const StyledPencil = styled(Pencil)`
  path {
    fill: none;
    stroke: currentColor;
  }
`;

const DeleteAction: DocumentActionComponent = ({ id, model, collectionType }) => {
  const navigate = useNavigate();
  const { formatMessage } = useIntl();
  const canDelete = useDocumentRBAC('DeleteAction', (state) => state.canDelete);
  const { delete: deleteAction } = useDocumentActions();

  return {
    disabled: !canDelete,
    label: formatMessage({
      id: 'app.utils.delete',
      defaultMessage: 'Delete document',
    }),
    icon: <StyledTrash />,
    dialog: {
      type: 'dialog',
      title: formatMessage({
        id: 'app.components.ConfirmDialog.title',
        defaultMessage: 'Confirmation',
      }),
      content: (
        <Flex>
          <ExclamationMarkCircle />
          <Typography as="p" variant="omega">
            {formatMessage({
              id: 'content-manager.actions.delete.dialog.body',
              defaultMessage: 'Are you sure?',
            })}
          </Typography>
        </Flex>
      ),
      onConfirm: async () => {},
    },
    variant: 'danger',
    position: 'header',
  };
};

DeleteAction.type = 'delete';

/**
 * Because the icon system is completely broken, we have to do
 * this to remove the fill from the cog.
 */
const StyledTrash = styled(Trash)`
  path {
    fill: none;
    stroke: currentColor;
  }
`;

const DEFAULT_HEADER_ACTIONS = [EditTheModelAction, ConfigureTheViewAction, DeleteAction];

export { Header, DEFAULT_HEADER_ACTIONS };
export type { HeaderProps };
