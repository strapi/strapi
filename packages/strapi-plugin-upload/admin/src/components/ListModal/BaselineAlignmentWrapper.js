import styled from 'styled-components';

// You can see in the index.js file that I used the design system to do the UI integration but
// sometimes, we need to create some "temporary" custom style to fix the baseline alignment.
// -----
// TODO : remove this component. I think that this kind components should not exist in Strapi.
// I create it to temporary fix the baseline alignment until we have the design system.
const BaselineAlignmentWrapper = styled.div`
  margin-top: -0.7rem;
`;

export default BaselineAlignmentWrapper;
