import { UID } from '@strapi/types';
import { Entity } from '../../../shared/types';

export type TreeNodeProps = Omit<ReleaseTreeNode, '_depth' | 'children'>;

export type EntriesInRelease = {
  releaseDocumentId: string;
  contentType: UID.ContentType;
  locale?: string;
  type: 'publish' | 'unpublish';
  entry: Entity & {
    [key: string]: unknown;
    locale?: string;
  };
};

export interface ReleaseTreeNode {
  id: string;
  documentId: string;
  contentType: string;
  children: ReleaseTreeNode[];
  _depth: number;
  type: 'publish' | 'unpublish';
  locale?: string;
}

class Node {
  data: TreeNodeProps;

  children: Node[];

  _depth: number;

  constructor(data: TreeNodeProps, depth = 0) {
    this.data = data;
    this.children = [];
    this._depth = depth;
  }

  add(childData: TreeNodeProps): Node {
    const child = new Node(childData, this._depth + 1);
    this.children.push(child);
    return child;
  }

  remove(data: TreeNodeProps): void {
    this.children = this.children.filter((child) => !Node.matches(child.data, data));
  }

  setDepthRecursive(baseDepth: number): void {
    this._depth = baseDepth;
    this.children.forEach((child) => child.setDepthRecursive(baseDepth + 1));
  }

  static matches(a: TreeNodeProps, b: TreeNodeProps): boolean {
    return (
      a.contentType === b.contentType && a.id === b.id && (a.locale ?? '') === (b.locale ?? '')
    );
  }

  getKey(): string {
    return Tree.makeKey(this.data);
  }
}

export class Tree {
  root: Node[];

  constructor() {
    this.root = [];
  }

  add(data: TreeNodeProps): Node {
    const node = new Node(data, 0);
    this.root.push(node);
    return node;
  }

  traverseTree(fn: (node: Node) => void): void {
    const queue: Node[] = [...this.root];
    while (queue.length) {
      const current = queue.shift()!;
      fn(current);
      queue.push(...current.children);
    }
  }

  find(key: { contentType: string; id: string; locale?: string }): Node | null {
    const targetKey = Tree.makeKey(key);

    let found: Node | null = null;
    this.traverseTree((node) => {
      if (node.getKey() === targetKey && !found) {
        found = node;
      }
    });

    return found;
  }

  moveToChildOf(
    childKey: { contentType: string; id: string; locale?: string },
    parentKey: { contentType: string; id: string; locale?: string }
  ): boolean {
    const child = this.find(childKey);
    const parent = this.find(parentKey);

    if (!child || !parent) return false;

    this.root = this.root.filter((node) => node !== child);

    child.setDepthRecursive(parent._depth + 1);
    parent.children.push(child);
    return true;
  }

  static makeKey({
    contentType,
    id,
    locale,
  }: {
    contentType: string;
    id: string;
    locale?: string;
  }): string {
    return `${contentType}:${id}${locale ? `:${locale}` : ''}`;
  }

  private convertNodeToReleaseTreeNode = (node: Node): ReleaseTreeNode => ({
    ...node.data,
    _depth: node._depth,
    children: node.children.map((child) => this.convertNodeToReleaseTreeNode(child)),
  });

  toReleaseTree(): ReleaseTreeNode[] {
    return this.root.map((node) => this.convertNodeToReleaseTreeNode(node));
  }
}
