import { useNotification, useStrapiApp } from '@strapi/helper-plugin';
import { Pencil } from '@strapi/icons';
import { useIntl } from 'react-intl';
import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';

import { DescriptionComponentRenderer } from '../../../../components/DescriptionComponentRenderer';
import { useDocumentRBAC } from '../../../features/DocumentRBAC';
import { Document, useDoc } from '../../../hooks/useDocument';
import { DocumentActionsMenu } from '../../EditView/components/DocumentActions';

import type {
  ContentManagerPlugin,
  DocumentActionComponent,
  DocumentActionProps,
} from '../../../../core/apis/content-manager';

/* -------------------------------------------------------------------------------------------------
 * TableActions
 * -----------------------------------------------------------------------------------------------*/

interface TableActionsProps {
  id: Document['id'];
  document: Document;
}

const TableActions = ({ id, document }: TableActionsProps) => {
  const { formatMessage } = useIntl();
  const { model, collectionType } = useDoc();
  const { plugins } = useStrapiApp();

  const props: DocumentActionProps = {
    activeTab: null,
    model,
    // @ts-expect-error – this will be solved when we make `id` only a string.
    id,
    collectionType,
    document,
  };

  return (
    <DescriptionComponentRenderer
      props={props}
      descriptions={(
        plugins['content-manager'].apis as ContentManagerPlugin['config']['apis']
      ).getDocumentActions()}
    >
      {(actions) => {
        const tableRowActions = actions.filter((action) => {
          const positions = Array.isArray(action.position) ? action.position : [action.position];
          return positions.includes('table-row');
        });

        return (
          <DocumentActionsMenu
            actions={tableRowActions}
            label={formatMessage({
              id: 'content-manager.containers.list.table.row-actions',
              defaultMessage: 'Row action',
            })}
            variant="ghost"
          />
        );
      }}
    </DescriptionComponentRenderer>
  );
};

/* -------------------------------------------------------------------------------------------------
 * TableActionComponents
 * -----------------------------------------------------------------------------------------------*/

const EditAction: DocumentActionComponent = ({ id }) => {
  const navigate = useNavigate();
  const { formatMessage } = useIntl();
  const { canRead } = useDocumentRBAC('EditAction', ({ canRead }) => ({ canRead }));
  const toggleNotification = useNotification();

  return {
    disabled: !canRead,
    icon: <StyledPencil />,
    label: formatMessage({
      id: 'content-manager.actions.edit.label',
      defaultMessage: 'Edit',
    }),
    position: 'table-row',
    onClick: async () => {
      if (!id) {
        console.error(
          "You're trying to edit a document without an id, this is likely a bug with Strapi. Please open an issue."
        );

        toggleNotification({
          message: formatMessage({
            id: 'content-manager.actions.edit.error',
            defaultMessage: 'An error occurred while trying to edit the document.',
          }),
          type: 'warning',
        });

        return;
      }

      navigate(id);
    },
  };
};

EditAction.type = 'edit';

/**
 * Because the icon system is completely broken, we have to do
 * this to remove the fill from the cog.
 */
const StyledPencil = styled(Pencil)`
  path {
    fill: currentColor;
  }
`;

const DEFAULT_TABLE_ROW_ACTIONS = [EditAction];

export { TableActions, DEFAULT_TABLE_ROW_ACTIONS };
