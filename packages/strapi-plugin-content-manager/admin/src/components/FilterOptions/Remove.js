import FilterOptionsCTA from 'components/FilterOptionsCTA';

const Remove = FilterOptionsCTA.extend`
  &:after {
    content: '\f068';
    font-family: FontAwesome;
    font-size: 8px;
    color: #007EFF;
  }
`;

export default Remove;
