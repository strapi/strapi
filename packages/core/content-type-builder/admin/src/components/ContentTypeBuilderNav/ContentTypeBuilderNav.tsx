import { useState, useEffect, useMemo, ReactNode } from 'react';

import { ConfirmDialog, SubNav, tours } from '@strapi/admin/strapi-admin';
import {
  Box,
  Searchbar,
  Button,
  Flex,
  Typography,
  Divider,
  Menu,
  VisuallyHidden,
  Dialog,
} from '@strapi/design-system';
import { ArrowClockwise, Cross, More } from '@strapi/icons';
import { useIntl } from 'react-intl';
import { styled } from 'styled-components';

import { getTrad } from '../../utils/getTrad';
import { useDataManager } from '../DataManager/useDataManager';
import { Status } from '../Status';

import { FolderNavSection } from './components/FolderNav/FolderNavSection';
import { useContentTypeBuilderMenu } from './hooks/useContentTypeBuilderMenu';

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
  const { flatSections, search, folderSections } = useContentTypeBuilderMenu();
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

  const subNavSections = useMemo(() => {
    const sections: ReactNode[] = []; // SubNav.Sections wraps its children in a <li>, and multiple {x.maps()} produce multiple react fragments. So we need to collect sections into a single array of children.

    for (const section of folderSections) {
      sections.push(
        <FolderNavSection
          key={section.section}
          section={section.section}
          sectionId={section.sectionId}
          title={section.title}
          links={section.links}
          createTypeLabel={section.createTypeLabel}
          onCreateContentType={section.onCreateContentType}
          searchValue={search.value}
        />
      );
    }

    for (const section of flatSections) {
      if (section.name === 'components') {
        sections.push(
          <SubNav.Section
            key={section.name}
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
                onClick: section.customLink?.onClick,
              }
            }
            sectionId={section.name}
          >
            {section.links.map((link) => {
              const linkLabel = formatMessage({
                id: link.name,
                defaultMessage: link.title,
              });

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
        );
      }
    }

    return sections;
  }, [folderSections, flatSections, formatMessage, search.value]);

  return (
    <SubNav.Main aria-label={pluginName}>
      <SubNav.Header label={pluginName} />
      <Divider background="neutral150" />
      <Flex padding={5} gap={3} direction={'column'} alignItems={'stretch'}>
        <tours.contentTypeBuilder.Save>
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
                <Menu.Item
                  disabled={!history.canUndo || !isInDevelopmentMode}
                  onSelect={undoHandler}
                  startIcon={<ArrowCounterClockwise />}
                >
                  {formatMessage({
                    id: 'global.last-change.undo',
                    defaultMessage: 'Undo last change',
                  })}
                </Menu.Item>
                <Menu.Item
                  disabled={!history.canRedo || !isInDevelopmentMode}
                  onSelect={redoHandler}
                  startIcon={<ArrowClockwise />}
                >
                  {formatMessage({
                    id: 'global.last-change.redo',
                    defaultMessage: 'Redo last change',
                  })}
                </Menu.Item>
                <Menu.Separator />
                <DiscardAllMenuItem
                  disabled={!history.canDiscardAll || !isInDevelopmentMode}
                  onSelect={discardHandler}
                >
                  <Flex gap={2}>
                    <Cross />
                    <Typography>
                      {formatMessage({
                        id: 'global.last-changes.discard',
                        defaultMessage: 'Discard last changes',
                      })}
                    </Typography>
                  </Flex>
                </DiscardAllMenuItem>
              </Menu.Content>
            </Menu.Root>
          </Flex>
        </tours.contentTypeBuilder.Save>

        <Searchbar
          value={search.value}
          onChange={(e) => search.onChange(e.target.value)}
          onClear={() => search.onChange('')}
          placeholder={formatMessage({
            id: getTrad('search.placeholder'),
            defaultMessage: 'Search',
          })}
          size="S"
          // eslint-disable-next-line react/no-children-prop
          children={undefined}
          name={'search_contentType'}
          clearLabel={formatMessage({ id: 'clearLabel', defaultMessage: 'Clear' })}
          aria-label={formatMessage({
            id: getTrad('search.placeholder'),
            defaultMessage: 'Search',
          })}
        />
      </Flex>
      <SubNav.Content>
        <SubNav.Sections>{subNavSections}</SubNav.Sections>
      </SubNav.Content>
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
