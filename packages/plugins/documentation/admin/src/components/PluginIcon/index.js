/**
 *
 * PluginIcon
 *
 */

import React from 'react';
import { Icon } from '@strapi/parts/Icon';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

const PluginIcon = () => <Icon as={() => <FontAwesomeIcon icon="book" />} width="16px" />;

export default PluginIcon;
