import React, { forwardRef, memo, useImperativeHandle } from 'react';
import PropTypes from 'prop-types';
import { Tabs } from '../../../../../../admin/src/components/Roles';
import { roleTabsLabel as TAB_LABELS } from '../../../../../../admin/src/utils';
import ContentTypes from '../ContentTypes';
import layout from '../temp/fakeData';

const Permissions = forwardRef(({ layout }, ref) => {
  useImperativeHandle(ref, () => {
    return {
      getPermissions: () => {
        console.log('todo');
      },
      resetForm: () => {
        console.log('todo');
      },
    };
  });

  return (
    <Tabs tabsLabel={TAB_LABELS}>
      <ContentTypes layout={layout.sections.collectionTypes} />
      <ContentTypes layout={layout.sections.singleTypes} />
      <div>Plugins</div>
      <div>Settings</div>
    </Tabs>
  );
});

Permissions.defaultProps = {
  layout,
};
Permissions.propTypes = {
  // Todo
  layout: PropTypes.object,
};

export default memo(Permissions);
