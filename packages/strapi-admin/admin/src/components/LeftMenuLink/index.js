/**
 *
 * LeftMenuLink
 *
 */

import React from 'react';
import { upperFirst } from 'lodash';
import PropTypes from 'prop-types';

import LeftMenuLinkContent from './LeftMenuLinkContent';
import Plugin from './Plugin';

const LeftMenuLink = ({
  destination,
  iconName,
  label,
  location,
  source,
  suffixUrlToReplaceForLeftMenuHighlight,
}) => {
  const plugin =
    source !== 'content-manager' && source !== '' ? (
      <Plugin>
        <span>{upperFirst(source.split('-').join(' '))}</span>
      </Plugin>
    ) : (
      ''
    );

  return (
    <>
      <LeftMenuLinkContent
        destination={destination}
        iconName={iconName}
        label={label}
        location={location}
        source={source}
        suffixUrlToReplaceForLeftMenuHighlight={
          suffixUrlToReplaceForLeftMenuHighlight
        }
      />
      {plugin}
    </>
  );
};

LeftMenuLink.propTypes = {
  destination: PropTypes.string.isRequired,
  iconName: PropTypes.string,
  label: PropTypes.string.isRequired,
  location: PropTypes.shape({
    pathname: PropTypes.string,
  }).isRequired,
  source: PropTypes.string,
  suffixUrlToReplaceForLeftMenuHighlight: PropTypes.string,
};

LeftMenuLink.defaultProps = {
  iconName: 'circle',
  source: '',
  suffixUrlToReplaceForLeftMenuHighlight: '',
};

export default LeftMenuLink;
