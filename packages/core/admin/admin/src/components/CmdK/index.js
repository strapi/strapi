import React, { useRef, useEffect, useState, useMemo } from 'react';
import { useHistory } from 'react-router-dom';
import { Command } from 'cmdk';
import { Badge, Flex } from '@strapi/design-system';

import Container from './Container';
import { CommandContext } from './context';
import ContentManager from './ContentManager';
import ContentTypeBuilder from './ContentTypeBuilder';
import Main from './Main';

export default function CommandK() {
  const [open, setOpen] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [pages, setPages] = React.useState([]);
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

  return (
    <CommandContext.Provider value={context}>
      <Container open={open}>
        <Command.Dialog
          open={open}
          onOpenChange={setOpen}
          label="Global Command Menu"
          container={containerElement.current}
        >
          <Flex gap={2}>
            {['home'].concat(pages).map((page) => (
              <Badge key={page}>{page}</Badge>
            ))}
          </Flex>
          <Command.Input
            autoFocus
            placeholder="What do you need?"
            onValueChange={setInputValue}
            value={inputValue}
            onKeyDown={onInputKeyDown}
          />
          <Command.List>
            <Command.Empty>No results found.</Command.Empty>
            {!page && <Main />}
            {page === 'content-manager' && <ContentManager />}
            {page === 'content-type-builder' && <ContentTypeBuilder />}
          </Command.List>
        </Command.Dialog>
        <div className="container" ref={containerElement} />
      </Container>
    </CommandContext.Provider>
  );
}
