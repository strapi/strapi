import React from 'react';
import PropTypes from 'prop-types';

import createMatrix from '../../utils/createMatrix';

import Card from '../Card';
import Wrapper from './Wrapper';

const List = ({ data }) => {
  const matrix = createMatrix(data);

  return (
    <Wrapper>
      {matrix.map(({ key, rowContent }) => {
        return (
          <div className="row" key={key}>
            {rowContent.map(item => (
              <div
                className="col-xs-12 col-md-6 col-xl-3"
                key={JSON.stringify(item)}
              >
                <Card isSmall {...item} />
              </div>
            ))}
          </div>
        );
      })}
    </Wrapper>
  );
};

List.defaultProps = {
  data: [
    {
      file: {
        name: 'Chat paysage',
        size: 17329,
        type: 'image/png',
        url:
          'https://images.pexels.com/photos/20787/pexels-photo.jpg?auto=compress&cs=tinysrgb&h=350',
      },
    },
    {
      file: {
        name: 'Chat portrait',
        size: 17329,
        type: 'image/png',
        url:
          'https://emiliedammedumoulin.com/wp-content/uploads/2018/07/contact-chat-accueil.jpg',
      },
    },
    {
      file: {
        name: 'Gif',
        size: 17329,
        type: 'image/png',
        url:
          'https://user-images.githubusercontent.com/879561/51321923-54024f00-1a64-11e9-8c37-3308350a59c4.gif',
      },
    },
    {
      file: {
        name: 'Paysage',
        size: 17329,
        type: 'image/png',
        url:
          'https://encrypted-tbn0.gstatic.com/images?q=tbn%3AANd9GcSyHCXO8D0QQrPDuGstvH9dEwhhB7Qv-3mDMWGpLExyY1CF84cL',
      },
    },
    {
      file: {
        name:
          'That kitten is so beautiful that I am not sure to have the place to describe it',
        size: 17329,
        type: 'image/png',
        url:
          'https://images.pexels.com/photos/1643457/pexels-photo-1643457.jpeg?auto=compress&cs=tinysrgb&dpr=1&w=500',
      },
    },
    {
      file: {
        name: 'pdf file',
        type: 'pdf',
      },
    },
    {
      file: {
        name: 'Zip file',
        type: 'zip',
      },
    },
    {
      file: {
        name: 'Doc file',
        type: 'docx',
      },
    },
  ],
};

List.propTypes = {
  data: PropTypes.array,
};

export default List;
