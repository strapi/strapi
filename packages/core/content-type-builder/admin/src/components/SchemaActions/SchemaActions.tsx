import { useEffect, useState } from 'react';

import { ConfirmDialog, tours } from '@strapi/admin/strapi-admin';
import { Button, Dialog, Flex, Menu, Typography, VisuallyHidden } from '@strapi/design-system';
import { ArrowClockwise, Cross, More } from '@strapi/icons';
import { useIntl } from 'react-intl';
import { styled } from 'styled-components';

import { getTrad } from '../../utils/getTrad';
import { useDataManager } from '../DataManager/useDataManager';

const ArrowCounterClockwise = styled(ArrowClockwise)`
  transform: scaleX(-1);
`;

/**
 * A menu item's label, dimmed when the item is.
 *
 * The design system wraps a plain child in its own Typography, which sets a
 * colour of its own — so the item's disabled state reached the start icon and
 * stopped at the words, leaving them at full strength beside a greyed icon.
 */
const Label = styled(Typography)<{ $disabled?: boolean }>`
  color: ${({ theme, $disabled }) =>
    $disabled ? theme.colors.neutral400 : theme.colors.neutral800};
`;

const DiscardAllMenuItem = styled(Menu.Item)`
  color: ${({ theme }) => theme.colors.danger600};

  &:hover {
    background: ${({ theme, disabled }) => !disabled && theme.colors.danger100};
  }
`;

/**
 * Save, and the history menu that belongs with it.
 *
 * Lived at the top of the sidebar, which made the sidebar a toolbar as well as
 * a list. It sits in the page header now — the same place every other page of
 * the admin keeps its actions, and the same slot the index uses for "Create
 * new". The keyboard shortcuts come along: they are global, and they always
 * were.
 */
export const SchemaActions = () => {
  const { formatMessage } = useIntl();
  const { saveSchema, isModified, history, isInDevelopmentMode } = useDataManager();
  const [menuIsOpen, setMenuIsOpen] = useState(false);
  const [discardConfirmationModalIsOpen, setDiscardConfirmationModalIsOpen] = useState(false);

  const canUndo = history.canUndo && isInDevelopmentMode;
  const canRedo = history.canRedo && isInDevelopmentMode;
  const canDiscardAll = history.canDiscardAll && isInDevelopmentMode;

  useEffect(() => {
    if (!isInDevelopmentMode) {
      return;
    }

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        if (e.key === 'Enter') {
          if (isModified) {
            e.preventDefault();
            saveSchema();
          }
        } else if (e.key === 'z' && !e.shiftKey) {
          e.preventDefault(); // Prevent browser default undo (e.g., in input fields)
          history.undo();
        } else if (e.key === 'y' || (e.shiftKey && e.key === 'z') || e.key === 'Z') {
          e.preventDefault(); // Prevent browser default redo (e.g., in input fields)
          history.redo();
        }
      }
    };

    document.addEventListener('keydown', onKeyDown);

    return () => {
      document.removeEventListener('keydown', onKeyDown);
    };
  });

  const discardChanges = () => {
    setMenuIsOpen(false);
    setDiscardConfirmationModalIsOpen(false);
    history.discardAllChanges();
  };

  return (
    <tours.contentTypeBuilder.Save>
      <Flex gap={2}>
        <Button
          onClick={(e) => {
            e.preventDefault();
            saveSchema();
          }}
          type="submit"
          disabled={!isModified || !isInDevelopmentMode}
        >
          {formatMessage({ id: 'global.save', defaultMessage: 'Save' })}
        </Button>

        <Menu.Root open={menuIsOpen} onOpenChange={setMenuIsOpen}>
          <Menu.Trigger
            endIcon={null}
            paddingTop="7px"
            paddingLeft="9px"
            paddingRight="9px"
            variant="tertiary"
          >
            <More fill="neutral500" aria-hidden focusable={false} />
            <VisuallyHidden tag="span">
              {formatMessage({ id: 'global.more.actions', defaultMessage: 'More actions' })}
            </VisuallyHidden>
          </Menu.Trigger>
          <Menu.Content zIndex={2}>
            <Menu.Item
              disabled={!canUndo}
              onSelect={() => history.undo()}
              startIcon={<ArrowCounterClockwise />}
            >
              <Label $disabled={!canUndo}>
                {formatMessage({
                  id: 'global.last-change.undo',
                  defaultMessage: 'Undo last change',
                })}
              </Label>
            </Menu.Item>
            <Menu.Item
              disabled={!canRedo}
              onSelect={() => history.redo()}
              startIcon={<ArrowClockwise />}
            >
              <Label $disabled={!canRedo}>
                {formatMessage({
                  id: 'global.last-change.redo',
                  defaultMessage: 'Redo last change',
                })}
              </Label>
            </Menu.Item>
            <Menu.Separator />
            <DiscardAllMenuItem
              disabled={!canDiscardAll}
              onSelect={() => setDiscardConfirmationModalIsOpen(true)}
            >
              <Flex gap={2}>
                <Cross />
                <Typography textColor={canDiscardAll ? 'danger600' : 'neutral400'}>
                  {formatMessage({
                    id: 'global.last-changes.discard',
                    defaultMessage: 'Discard last changes',
                  })}
                </Typography>
              </Flex>
            </DiscardAllMenuItem>
          </Menu.Content>
        </Menu.Root>

        <Dialog.Root
          open={discardConfirmationModalIsOpen}
          onOpenChange={setDiscardConfirmationModalIsOpen}
        >
          <ConfirmDialog onConfirm={discardChanges}>
            {formatMessage({
              id: getTrad('popUpWarning.discardAll.message'),
              defaultMessage: 'Are you sure you want to discard all changes?',
            })}
          </ConfirmDialog>
        </Dialog.Root>
      </Flex>
    </tours.contentTypeBuilder.Save>
  );
};
