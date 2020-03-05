import React from 'react';
import PropTypes from 'prop-types';

import createMatrix from '../../utils/createMatrix';

import Card from '../Card';
import Wrapper from './Wrapper';

const List = ({ data, onChange, selectedItems }) => {
  const matrix = createMatrix(data);

  return (
    <Wrapper>
      {matrix.map(({ key, rowContent }) => {
        return (
          <div className="row" key={key}>
            {rowContent.map(item => {
              return (
                <div className="col-xs-12 col-md-6 col-xl-3" key={JSON.stringify(item)}>
                  <Card
                    small
                    selected={selectedItems.includes(item.id)}
                    onChange={onChange}
                    {...item}
                  />
                </div>
              );
            })}
          </div>
        );
      })}
    </Wrapper>
  );
};

List.defaultProps = {
  data: [
    {
      id: '0',
      file: {
        name: 'Chat paysage',
        size: 17329,
        type: 'image/png',
        url:
          'https://images.pexels.com/photos/20787/pexels-photo.jpg?auto=compress&cs=tinysrgb&h=350',
      },
    },
    {
      id: '1',
      file: {
        name: 'Chat portrait',
        size: 17329,
        type: 'image/png',
        url: 'https://emiliedammedumoulin.com/wp-content/uploads/2018/07/contact-chat-accueil.jpg',
      },
    },
    {
      id: '2',
      file: {
        name: 'Gif',
        size: 17329,
        type: 'image/png',
        url:
          'https://user-images.githubusercontent.com/879561/51321923-54024f00-1a64-11e9-8c37-3308350a59c4.gif',
      },
    },
    {
      id: '3',
      file: {
        name: 'Paysage',
        size: 17329,
        type: 'image/png',
        url:
          'https://encrypted-tbn0.gstatic.com/images?q=tbn%3AANd9GcSyHCXO8D0QQrPDuGstvH9dEwhhB7Qv-3mDMWGpLExyY1CF84cL',
      },
    },
    {
      id: '4',
      file: {
        name: 'That kitten is so beautiful that I am not sure to have the place to describe it',
        size: 17329,
        type: 'image/png',
        url:
          'https://images.pexels.com/photos/1643457/pexels-photo-1643457.jpeg?auto=compress&cs=tinysrgb&dpr=1&w=500',
      },
    },
    {
      id: '5',
      file: {
        name: 'pdf file',
        type: 'pdf',
      },
    },
    {
      id: '6',
      file: {
        name: 'Zip file',
        type: 'zip',
      },
    },
    {
      id: '7',
      file: {
        name: 'Doc file',
        type: 'docx',
      },
    },
  ],
  onChange: () => {},
  selectedItems: [],
};

List.propTypes = {
  data: PropTypes.array,
  onChange: PropTypes.func,
  selectedItems: PropTypes.array,
};

export default List;
