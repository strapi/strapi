import React, { useRef, useEffect, useState, useMemo } from 'react';
import { useHistory } from 'react-router-dom';
import { Command } from 'cmdk';
import { useIntl } from 'react-intl';
import { Badge, Flex } from '@strapi/design-system';

import Container from './Container';
import { CommandContext } from './context';
import Main from './Main';
import ContentManager from './pages/ContentManager';
import ContentTypeBuilder from './pages/ContentTypeBuilder';
import Theme from './pages/Theme';
import Settings from './pages/Settings';

export default function CommandK() {
  const [open, setOpen] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [pages, setPages] = useState([]);
  const page = pages[pages.length - 1];
  const history = useHistory();

  const containerElement = useRef(null);

  // Toggle the menu when ⌘K is pressed
  useEffect(() => {
    const down = (e) => {
      if (e.key === 'k' && e.metaKey) {
        setOpen((open) => !open);
      }
    };

    document.addEventListener('keydown', down);

    return () => document.removeEventListener('keydown', down);
  }, []);

  const onInputKeyDown = (e) => {
    if (pages.length === 0) {
      return;
    }

    if ((e.key === 'Backspace' && !inputValue) || e.key === 'Escape') {
      e.preventDefault();
      setPages((pages) => pages.slice(0, -1));
    }
  };

  const context = useMemo(() => {
    return {
      page,
      pages,
      changePage(page) {
        setPages((pages) => [...pages, page]);
        setInputValue('');
      },
      goTo(path) {
        setOpen(false);
        setInputValue('');
        setPages([]);
        history.push(path);
      },
    };
  }, [history, page, pages]);

  const { formatMessage } = useIntl();

  return (
    <CommandContext.Provider value={context}>
      <Container open={open}>
        <Command.Dialog
          open={open}
          onOpenChange={setOpen}
          label={formatMessage({ id: 'command-palette.Dialog.label' })}
          container={containerElement.current}
        >
          <Flex gap={2}>
            {['home'].concat(pages).map((page) => (
              <Badge key={page}>{page}</Badge>
            ))}
          </Flex>
          <Command.Input
            autoFocus
            placeholder={formatMessage({ id: 'command-palette.Input.placeholder' })}
            onValueChange={setInputValue}
            value={inputValue}
            onKeyDown={onInputKeyDown}
          />
          <Command.List>
            <Command.Empty>No results found.</Command.Empty>
            {!page && <Main />}
            {page === 'content-manager' && <ContentManager />}
            {page === 'content-type-builder' && <ContentTypeBuilder />}
            {page === 'theme' && <Theme />}
            {page === 'settings' && <Settings />}
          </Command.List>
        </Command.Dialog>
        <div ref={containerElement} />
      </Container>
    </CommandContext.Provider>
  );
}
