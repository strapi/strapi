export default function isSingleRelation(type) {
  return ['oneToOne', 'manyToOne', 'oneToOneMorph'].includes(type);
}
