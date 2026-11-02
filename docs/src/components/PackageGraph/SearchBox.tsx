import { useId, useState, type KeyboardEvent, type ReactNode } from 'react';
import clsx from 'clsx';

import type { WorkspacePackage } from '@site/plugins/workspace-packages/types';

import styles from './styles.module.css';

const MAX_SUGGESTIONS = 8;

type Props = {
  packages: WorkspacePackage[];
  onSelect: (packageName: string) => void;
};

/** Combobox matching package names and paths; picking a suggestion focuses the package. */
export default function SearchBox({ packages, onSelect }: Props): ReactNode {
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const listId = useId();

  const normalizedQuery = query.trim().toLowerCase();
  const matches =
    normalizedQuery === ''
      ? []
      : packages
          .filter(
            (pkg) =>
              pkg.name.toLowerCase().includes(normalizedQuery) === true ||
              pkg.path.includes(normalizedQuery) === true
          )
          .slice(0, MAX_SUGGESTIONS);
  // The list shows while the input is in use and has matches; blur, Escape and selection close it.
  const isExpanded = isOpen === true && matches.length > 0;

  const select = (packageName: string) => {
    onSelect(packageName);
    setQuery('');
    setActiveIndex(0);
    setIsOpen(false);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown' && isExpanded === true) {
      event.preventDefault();
      setActiveIndex((index) => Math.min(index + 1, matches.length - 1));
    } else if (event.key === 'ArrowUp' && isExpanded === true) {
      event.preventDefault();
      setActiveIndex((index) => Math.max(index - 1, 0));
    } else if (event.key === 'Enter' && isExpanded === true) {
      event.preventDefault();
      select(matches[Math.min(activeIndex, matches.length - 1)].name);
    } else if (event.key === 'Escape') {
      setQuery('');
      setIsOpen(false);
    }
  };

  return (
    <div className={styles.search}>
      <input
        type="search"
        role="combobox"
        className={styles.searchInput}
        placeholder="Find a package…"
        aria-label="Find a package"
        aria-autocomplete="list"
        aria-expanded={isExpanded}
        aria-controls={listId}
        aria-activedescendant={isExpanded === true ? `${listId}-${activeIndex}` : undefined}
        value={query}
        onChange={(event) => {
          setQuery(event.target.value);
          setActiveIndex(0);
          setIsOpen(true);
        }}
        onFocus={() => setIsOpen(true)}
        onBlur={() => setIsOpen(false)}
        onKeyDown={onKeyDown}
      />
      {isExpanded === true && (
        <ul id={listId} role="listbox" className={styles.suggestions}>
          {matches.map((pkg, index) => (
            <li
              key={pkg.name}
              id={`${listId}-${index}`}
              role="option"
              aria-selected={index === activeIndex}
              className={clsx(styles.suggestion, index === activeIndex && styles.suggestionActive)}
              data-pkg-group={pkg.group}
              onMouseDown={(event) => {
                // Keep the input focused and select before the blur.
                event.preventDefault();
                select(pkg.name);
              }}
              onMouseEnter={() => setActiveIndex(index)}
            >
              <span className={styles.swatch} aria-hidden="true" />
              <span className={styles.suggestionName}>{pkg.name}</span>
              <span className={styles.suggestionPath}>{pkg.path}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
