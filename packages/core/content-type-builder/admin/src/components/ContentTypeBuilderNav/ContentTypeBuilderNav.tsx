import { Fragment, useState, useEffect } from 'react';

import { ConfirmDialog, SubNav } from '@strapi/admin/strapi-admin';
import {
  Box,
  TextInput,
  Button,
  Flex,
  Typography,
  Divider,
  Menu,
  VisuallyHidden,
  Dialog,
  IconButton,
} from '@strapi/design-system';
import { ArrowClockwise, Cross, More, Search } from '@strapi/icons';
import { useIntl } from 'react-intl';
import { styled } from 'styled-components';

import { getTrad } from '../../utils/getTrad';
import { useDataManager } from '../DataManager/useDataManager';
import { Status } from '../Status';

import { useContentTypeBuilderMenu } from './useContentTypeBuilderMenu';

const ArrowCounterClockwise = styled(ArrowClockwise)`
  transform: scaleX(-1);
`;

const DiscardAllMenuItem = styled(Menu.Item)`
  color: ${({ theme }) => theme.colors.danger600};

  &:hover {
    background: ${({ theme, disabled }) => !disabled && theme.colors.danger100};
  }
`;

export const ContentTypeBuilderNav = () => {
  const { menu, search } = useContentTypeBuilderMenu();
  const { saveSchema, isModified, history, isInDevelopmentMode } = useDataManager();

  const { formatMessage } = useIntl();

  const [menuIsOpen, setMenuIsOpen] = useState(false);
  const [discardConfirmationModalIsOpen, setDiscardConfirmationModalIsOpen] = useState(false);

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

  const discardHandler = () => {
    setDiscardConfirmationModalIsOpen(true);
  };

  const discardChanges = () => {
    setMenuIsOpen(false);
    setDiscardConfirmationModalIsOpen(false);
    history.discardAllChanges();
  };

  const undoHandler = () => {
    history.undo();
  };

  const redoHandler = () => {
    history.redo();
  };

  const pluginName = formatMessage({
    id: getTrad('plugin.name'),
    defaultMessage: 'Content-Type Builder',
  });

  return (
    <SubNav.Main aria-label={pluginName}>
      <SubNav.Header label={pluginName} />
      <Divider background="neutral150" />
      <Flex padding={5} gap={3} direction={'column'} alignItems={'stretch'}>
        <Flex gap={2}>
          <Button
            flex={1}
            onClick={(e) => {
              e.preventDefault();
              saveSchema();
            }}
            type="submit"
            disabled={!isModified || !isInDevelopmentMode}
            fullWidth
            size="S"
          >
            {formatMessage({
              id: 'global.save',
              defaultMessage: 'Save',
            })}
          </Button>
          <Menu.Root open={menuIsOpen} onOpenChange={setMenuIsOpen}>
            <Menu.Trigger
              size="S"
              endIcon={null}
              paddingTop="4px"
              paddingLeft="7px"
              paddingRight="7px"
              variant="tertiary"
            >
              <More fill="neutral500" aria-hidden focusable={false} />
              <VisuallyHidden tag="span">
                {formatMessage({
                  id: 'global.more.actions',
                  defaultMessage: 'More actions',
                })}
              </VisuallyHidden>
            </Menu.Trigger>
            <Menu.Content zIndex={1}>
              <Menu.Item disabled={!history.canUndo || !isInDevelopmentMode} onSelect={undoHandler}>
                <Flex gap={2}>
                  <ArrowCounterClockwise fill="neutral500" />
                  <Typography>Undo last change</Typography>
                </Flex>
              </Menu.Item>
              <Menu.Item disabled={!history.canRedo || !isInDevelopmentMode} onSelect={redoHandler}>
                <Typography>
                  <Flex gap={2}>
                    <ArrowClockwise fill="neutral500" />
                    <Typography>Redo last change</Typography>
                  </Flex>
                </Typography>
              </Menu.Item>
              <Menu.Separator />
              <DiscardAllMenuItem
                disabled={!history.canDiscardAll || !isInDevelopmentMode}
                onSelect={discardHandler}
              >
                <Flex gap={2}>
                  <Cross />
                  <Typography>Discard all changes</Typography>
                </Flex>
              </DiscardAllMenuItem>
            </Menu.Content>
          </Menu.Root>
        </Flex>

        <TextInput
          startAction={<Search fill="neutral500" />}
          value={search.value}
          onChange={(e) => search.onChange(e.target.value)}
          aria-label="Search"
          placeholder={formatMessage({
            id: getTrad('search.placeholder'),
            defaultMessage: 'Search',
          })}
          endAction={
            <IconButton
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                search.onChange('');
              }}
              label="clear"
              variant="ghost"
              type="button"
              style={{ padding: 0 }}
            >
              <Cross />
            </IconButton>
          }
          size="S"
        />
      </Flex>
      <SubNav.Sections>
        {menu.map((section) => (
          <Fragment key={section.name}>
            <SubNav.Section
              label={formatMessage({
                id: section.title.id,
                defaultMessage: section.title.defaultMessage,
              })}
              link={
                section.customLink && {
                  label: formatMessage({
                    id: section.customLink?.id,
                    defaultMessage: section.customLink?.defaultMessage,
                  }),
                  onClik: section.customLink?.onClick,
                }
              }
            >
              {section.links.map((link) => {
                const linkLabel = formatMessage({ id: link.name, defaultMessage: link.title });

                if ('links' in link) {
                  return (
                    <SubNav.SubSection key={link.name} label={link.title}>
                      {link.links.map((subLink) => {
                        const label = formatMessage({
                          id: subLink.name,
                          defaultMessage: subLink.title,
                        });

                        return (
                          <SubNav.Link
                            to={subLink.to}
                            key={subLink.name}
                            label={label}
                            endAction={
                              <Box tag="span" textAlign="center" width={'24px'}>
                                <Status status={subLink.status} />
                              </Box>
                            }
                          />
                        );
                      })}
                    </SubNav.SubSection>
                  );
                }

                return (
                  <SubNav.Link
                    to={link.to}
                    key={link.name}
                    label={linkLabel}
                    endAction={
                      <Box tag="span" textAlign="center" width={'24px'}>
                        <Status status={link.status} />
                      </Box>
                    }
                  />
                );
              })}
            </SubNav.Section>
          </Fragment>
        ))}
      </SubNav.Sections>
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
    </SubNav.Main>
  );
};
