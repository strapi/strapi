import getDraftRelations from '../getDraftRelations';
import components from './data/compos-schema.json';
import ct from './data/ct-schema.json';
import data from './data/entry.json';
import dataCompo from './data/entry-compos.json';
import dataDZ from './data/entry-dz.json';
import dataSimple from './data/entry-simple.json';

describe('CONTENT MANAGER | CONTAINERS | EditView | utils | getDraftRelations', () => {
  it('should return the number of not published relations', () => {
    expect(getDraftRelations(dataSimple, ct, components)).toEqual(2);
    expect(getDraftRelations(dataDZ, ct, components)).toEqual(6);
    expect(getDraftRelations(dataCompo, ct, components)).toEqual(8);
    expect(getDraftRelations(data, ct, components)).toEqual(16);
    expect(
      getDraftRelations(
        {
          id: 1,
          name: 'teststest',
          slug: 'teststest',
          price_range: 'very_cheap',
          contact_email: 'contact@email.com',
          stars: 1,
          averagePrice: 1,
        },
        ct,
        components
      )
    ).toEqual(0);
  });
});
