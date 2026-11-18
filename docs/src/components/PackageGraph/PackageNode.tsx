import { memo, type ReactNode } from 'react';
import clsx from 'clsx';
import { Handle, Position, type NodeProps } from '@xyflow/react';

import { DOC_STATE_LABELS } from '@site/src/lib/workspace-packages';

import { NODE_HEIGHT, NODE_WIDTH, type PackageNodeType } from './graph';
import styles from './styles.module.css';

const SCOPE = '@strapi/';

const getShortName = (name: string): string =>
  name.startsWith(SCOPE) === true ? name.slice(SCOPE.length) : name;

function PackageNode({ data }: NodeProps<PackageNodeType>): ReactNode {
  const { pkg, groupLabel, docState, direction, emphasis } = data;
  const isHorizontal = direction === 'LR';

  return (
    <div
      className={clsx(styles.node, styles[`emphasis-${emphasis}`])}
      data-pkg-group={pkg.group}
      style={{ width: NODE_WIDTH, height: NODE_HEIGHT }}
      title={`${pkg.name}${pkg.description === '' ? '' : `\n${pkg.description}`}`}
    >
      <Handle
        type="target"
        position={isHorizontal === true ? Position.Left : Position.Top}
        isConnectable={false}
        className={styles.handle}
      />
      <span className={styles.nodeName}>{getShortName(pkg.name)}</span>
      <span className={styles.nodeMeta}>
        <span>{groupLabel}</span>
        <span className={clsx(styles.nodeStatus, styles[`status-${docState}`])}>
          {DOC_STATE_LABELS[docState]}
        </span>
      </span>
      <Handle
        type="source"
        position={isHorizontal === true ? Position.Right : Position.Bottom}
        isConnectable={false}
        className={styles.handle}
      />
    </div>
  );
}

export default memo(PackageNode);
