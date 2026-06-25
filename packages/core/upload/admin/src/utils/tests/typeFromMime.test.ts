import { AssetTypes, DocTypes } from '../../enums';
import { typeFromMime } from '../typeFromMime';

describe('typeFromMime', () => {
  it('gives a type of image when the mime contains "image"', () => {
    const type = typeFromMime('image/png');

    expect(type).toBe(AssetTypes.Image);
  });

  it('gives a type of video when the mime contains "video"', () => {
    const type = typeFromMime('video/mp4');

    expect(type).toBe(AssetTypes.Video);
  });

  it('gives a type of pdf when the mime contains "pdf"', () => {
    const type = typeFromMime('application/pdf');

    expect(type).toBe(DocTypes.Pdf);
  });

  it('gives a type of csv when the mime contains "csv"', () => {
    const type = typeFromMime('text/csv');

    expect(type).toBe(DocTypes.Csv);
  });

  it('gives a type of xls when the mime contains "excel"', () => {
    const type = typeFromMime('application/vnd.ms-excel');

    expect(type).toBe(DocTypes.Xls);
  });

  it('gives a type of zip when the mime contains "zip"', () => {
    const type = typeFromMime('application/zip');

    expect(type).toBe(DocTypes.Zip);
  });

  it('gives a type of document as the default when the doc type is not recognised and handled', () => {
    const type = typeFromMime('application/random-document-type');

    expect(type).toBe(AssetTypes.Document);
  });
});
