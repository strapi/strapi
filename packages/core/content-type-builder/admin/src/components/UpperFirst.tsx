import upperFirst from 'lodash/upperFirst';

export const UpperFirst = ({ content }: { content: string }) => <>{upperFirst(content)}</>;
