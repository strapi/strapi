/**
 *
 * InputGJSON
 *
 */


import React from 'react';
import PropTypes from 'prop-types';
import mapboxgl from 'mapbox-gl';
import ge from '@mapbox/geojson-extent';
import MapboxDraw from '@mapbox/mapbox-gl-draw/dist/mapbox-gl-draw';
import { isEmpty } from 'lodash';
import styles from './styles.scss';
import MapboxGenericGeocoder from './geocoder';

const parse = JSON.parse;

class InputGJSON extends React.Component {
  constructor(props) {
    super(props);
    this.fileInput = React.createRef();
    this.handleUploadFile = this.handleUploadFile.bind(this);
    this.loadGeometries = this.loadGeometries.bind(this);

    this.state = { error: false };
  }


  componentDidMount() {
    // Init Map component
    this.loadMap();
  }


  componentDidUpdate() {
    if(!isEmpty(this.props.value)) {
      this.loadGeometries(this.props.value);
    }
  }

  geocodeNominatimRequest(query, mapBounds, options) {
    var params = { format: 'json', q: query, limit: options.limit };
    var urlParams = new URLSearchParams(Object.entries(params));

      return fetch('http://nominatim.openstreetmap.org/search?' + urlParams).then(function(response) { //eslint-disable-line
      if(response.ok) {
        return response.json();
      } else {
        return [];
      }
    }).then(function(json) {
      return json.map(function(result) {
        return {
          name: result.display_name,
          lat: result.lat,
          lon: result.lon,
          bbox: [result.boundingbox[2], result.boundingbox[0], result.boundingbox[3], result.boundingbox[1]],
        };
      });
    });
  }


  handleUploadFile(e) {
    e.preventDefault();
    const {handleChange, loadGeometries, draw} = this;
    const file = this.fileInput.current.files[0];
    if (file) {
        var reader = new FileReader(); //eslint-disable-line
      reader.readAsText(file, 'UTF-8');
      reader.onload = function (evt) {
        draw.deleteAll();
        loadGeometries(parse(evt.target.result));
        handleChange(parse(evt.target.result));
      };
      reader.onerror = function () {
      };
    }
  }



  loadMap() {
    // mapboxgl.accessToken =
    // 'pk.eyJ1IjoiYXJrb2Jsb2ciLCJhIjoiY2pmZ2RsNGpqNDE1OTJxazdrNzVxNnl2ZSJ9.Qj1ryjt2_OWUmlTKlcEmtA';
    const map = new mapboxgl.Map({
      container: this.mapContainer, // container id
      // style: 'https://maps.tilehosting.com/styles/basic/style.json?key=FqtjYUJi4HGcp4dogscf', // stylesheet location
      style: {
        'version': 8,
        'sources': {
          'raster-tiles': {
            'type': 'raster',
            'tiles': [
              'http://a.tile.openstreetmap.org/{z}/{x}/{y}.png',
              'http://b.tile.openstreetmap.org/{z}/{x}/{y}.png',
            ],
            'tileSize': 256,
          },
        },
        'layers': [{
          'id': 'simple-tiles',
          'type': 'raster',
          'source': 'raster-tiles',
          'minzoom': 0,
          'maxzoom': 22,
        }]},
    });

    // Add zoom, drawing and rotation controls to the map.
    const draw = new MapboxDraw({ //eslint-disable-line
      controls: {
        point: true,
        line_string: true,
        polygon: true,
        trash: true,
        combine_features: false,
        uncombine_features: false,
      },
    });

    const geocoder = new MapboxGenericGeocoder({}, this.geocodeNominatimRequest);

    map.addControl(draw, 'top-left');
    map.addControl(geocoder);
    map.addControl(new mapboxgl.NavigationControl(), 'top-left');
    // map.addControl(new mapboxgl.AttributionControl());
    map.scrollZoom.disable();
    map.on('load', () => {
      map.on('draw.create', () => {this.handleChange(draw.getAll());});
      map.on('draw.update', () => { this.handleChange(draw.getAll());});
      map.on('draw.delete', () => { this.handleChange(draw.getAll());});

    });
    this.map = map;
    this.draw = draw;
  }


  loadGeometries(geometry) {
    const { draw, map } = this;

    const add = (geometry) => {
      geometry.features.map((feature)=>{
        draw.add(feature);
      });
    };

    map.on('load', () => {
      geometry.features.length > 0 && add(geometry);
    });

    map.loaded() ? (geometry.features.length > 0 && draw.getAll().features.length===0) && add(geometry):null;
    geometry.features.length > 0 && map.fitBounds(ge(geometry), {padding:100});

  }


  handleChange = (json) => {
    const { name, onChange} = this.props;

    onChange({
      target: {
        name,
        value:  {...json, features: json.features.map((item)=>{return {...item, properties: {id:item.id}};})},
        type: 'geojson',
      },
    });
  }

  render() {
    if (this.state.error) {
      return <div>error json</div>;
    }

    return (
      <div>
        <div className={styles.jsonWrapper}>
          <div style={{width:'100%'}}>
            <div
              className="map-container"
              id="geojson-add"
              style={{
                height: '60vh',
              }}
            ref={el => this.mapContainer = el} //eslint-disable-line
            >
              <div
                style={{
                  position:'absolute',
                  bottom: 0,
                  right: 0,
                  zIndex: 20,
                  backgroundColor: 'rgba(255,255,255,0.5)',
                  padding:'0.5rem',
                }}
              >
                <a href="https://www.mapbox.com/about/maps/">Mapbox</a> | &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors
              </div>
            </div>
          </div>
          <div style={{backgroundColor:'#e5e5e5', padding:'10px'}}>
          Use the map to add shapes, or upload your own file: {' '}
            <input type="file" accept=".geojson" onChange={this.handleUploadFile} ref={this.fileInput} />
          </div>
        </div>
      </div>
    );
  }
}

InputGJSON.defaultProps = {
  onChange: () => {},
  value: null,
};

InputGJSON.propTypes = {
  name: PropTypes.string.isRequired,
  onChange: PropTypes.func,
  value: PropTypes.object,
};

export default InputGJSON;
