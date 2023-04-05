import React from 'react';
import Items from './Items';
import Group from './Group';

const Groups = ({ items }) => {
  const groups = new Map();

  items.forEach((item) => {
    if (!groups.has(item.group)) {
      groups.set(item.group, {
        title: item.group,
        items: [],
      });
    }

    groups.get(item.group).items.push(item);
  });

  return (
    <>
      {[...groups].map(([, group]) => {
        return (
          <Group key={group.title} heading={group.title}>
            <Items items={group.items} />
          </Group>
        );
      })}
    </>
  );
};

Groups.propTypes = Items.propTypes;
Groups.defaultProps = Items.defaultProps;

export default Groups;
