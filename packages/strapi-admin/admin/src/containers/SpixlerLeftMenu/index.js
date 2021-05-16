import React, { memo, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import PropTypes from 'prop-types';
import Wrapper from './Wrapper';
import useMenuSections from '../LeftMenu/useMenuSections';
import SpixlerLeftMenuSection from '../../components/SpixlerLeftMenu/SpixlerLeftMenuSection';

const SpixlerLeftMenu = ({ shouldUpdateStrapi, plugins, setUpdateMenu }) => {
  const {
    state: {
      // isLoading,
      collectionTypesSectionLinks,
      singleTypesSectionLinks,
      generalSectionLinks,
      pluginsSectionLinks,
    },
    toggleLoading,
    generateMenu,
  } = useMenuSections(plugins, shouldUpdateStrapi);

  const filteredCollectionTypeLinks = collectionTypesSectionLinks.filter(
    ({ isDisplayed }) => isDisplayed
  );
  const filteredSingleTypeLinks = singleTypesSectionLinks.filter(({ isDisplayed }) => isDisplayed);

  const links = [...filteredSingleTypeLinks, ...filteredCollectionTypeLinks];
  const icons = [...generalSectionLinks, ...pluginsSectionLinks];

  links.sort(function(a, b) {
    const nameA = a.label.toUpperCase();
    const nameB = b.label.toUpperCase();

    if (nameA < nameB) {
      return -1;
    }
    if (nameA > nameB) {
      return 1;
    }

    return 0;
  });

  // Groupping links by domains
  const groups = {
    common: [],
  };
  links.forEach(link => {
    const matches = link.label.match(/^([a-zA-Z.]+)\s+-\s([a-zA-Z ]+)$/);

    if (matches !== null) {
      const groupName = matches[1];
      const itemName = matches[2];

      if (typeof groups[groupName] === 'undefined') {
        groups[groupName] = [];
      }
      groups[groupName].push({ ...link, label: itemName });
    } else {
      groups.common.push(link);
    }
  });

  useEffect(() => {
    setUpdateMenu(() => {
      toggleLoading();
      generateMenu();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Wrapper>
      <div>
        <div className="logo">
          <img
            src="https://ik.imagekit.io/spixler/tr:w-400,q-80/spixler_logo_white_4edbc147ef.png"
            alt="logo"
          />
        </div>
        <div className="menu">
          {Object.keys(groups).map(title => (
            <SpixlerLeftMenuSection key={title} title={title} links={groups[title]} />
          ))}
        </div>
        <div className="icons">
          <ul>
            {icons.map(link => (
              <li key={link.destination}>
                <Link
                  to={{
                    pathname: link.destination,
                    search: link.search,
                  }}
                >
                  <FontAwesomeIcon icon={link.icon} />
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </Wrapper>
  );
};

SpixlerLeftMenu.propTypes = {
  shouldUpdateStrapi: PropTypes.bool.isRequired,
  plugins: PropTypes.object.isRequired,
  setUpdateMenu: PropTypes.func.isRequired,
};

export default memo(SpixlerLeftMenu);
