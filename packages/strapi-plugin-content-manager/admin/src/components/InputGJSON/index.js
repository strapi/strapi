/**
 *
 * InputGJSON
 *
 */


import React from 'react';
import PropTypes from 'prop-types';
import mapboxgl from 'mapbox-gl';
import cm from 'codemirror';
import ge from '@mapbox/geojson-extent';
import MapboxDraw from "@mapbox/mapbox-gl-draw/dist/mapbox-gl-draw";



import 'codemirror/lib/codemirror.css';
import 'codemirror/mode/javascript/javascript';
import 'codemirror/addon/lint/lint';
import 'codemirror/addon/lint/javascript-lint';
import 'codemirror/addon/edit/closebrackets';
import 'codemirror/addon/selection/mark-selection';
import 'codemirror/theme/liquibyte.css';
import 'codemirror/theme/xq-dark.css';
import 'codemirror/theme/3024-day.css';
import 'codemirror/theme/3024-night.css';
import 'codemirror/theme/blackboard.css';
import 'codemirror/theme/monokai.css';
import 'codemirror/theme/cobalt.css';
import 'codemirror/theme/neat.css';

import { isEmpty, isObject, trimStart } from 'lodash';
import jsonlint from './jsonlint';
import styles from './styles.scss';
import MapboxGenericGeocoder from './geocoder';

// const WAIT = 600;
const stringify = JSON.stringify;
const parse = JSON.parse;
const DEFAULT_THEME = 'monokai';
const THEMES = ['neat','blackboard', 'cobalt', 'monokai', '3024-day', '3024-night', 'liquibyte', 'xq-dark'];

class InputGJSON extends React.Component {
  constructor(props) {
    super(props);
    this.editor = React.createRef();
    this.fileInput = React.createRef();
    this.handleUploadFile = this.handleUploadFile.bind(this);
    this.loadGeometries = this.loadGeometries.bind(this);

    this.state = { error: false, markedText: null };
  }


  componentDidMount() {
    // Init Map component
    this.loadMap();
    // Init codemirror component
    this.codeMirror = cm.fromTextArea(this.editor.current, {
      autoCloseBrackets: true,
      lineNumbers: true,
      matchBrackets: true,
      mode: 'application/json',
      smartIndent: true,
      styleSelectedText: true,
      tabSize: 2,
      readOnly:true,
      theme: DEFAULT_THEME,
    });
    // this.codeMirror.on('change', this.handleChange);
    this.codeMirror.on('blur', this.handleBlur);

    this.setSize();
    this.setInitValue();


  }

  componentDidUpdate(prevProps) {
    if (isEmpty(prevProps.value) && !isEmpty(this.props.value) && !this.state.hasInitValue) {
      this.setInitValue();
    } else {
      this.updateValue();
    }
  }



  setInitValue = () => {
    const { value } = this.props;

    if (isObject(value) && value !== null) {
      try {
        parse(stringify(value));
        this.setState({ hasInitValue: true });
        return value;
      } catch(err) {
        return this.setState({ error: true });
      }
    }
  }

  setSize = () => this.codeMirror.setSize('100%', 'auto');

  setTheme = (theme) => this.codeMirror.setOption('theme', theme);

  getContentAtLine = (line) => this.codeMirror.getLine(line);

  getEditorOption = (opt) => this.codeMirror.getOption(opt);

  getValue = () => this.codeMirror.getValue();



  updateValue  = () => {
    const { value } = this.props;

    if (isObject(value) && value !== null) {
      try {
        this.loadGeometries(value);
        this.codeMirror.setValue(stringify(value, null, 2));
        return value;
      } catch(err) {
        // Silent
      }
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
    mapboxgl.accessToken =
    'pk.eyJ1IjoiYXJrb2Jsb2ciLCJhIjoiY2pmZ2RsNGpqNDE1OTJxazdrNzVxNnl2ZSJ9.Qj1ryjt2_OWUmlTKlcEmtA';
    const map = new mapboxgl.Map({
      container: this.mapContainer, // container id
      style: 'https://maps.tilehosting.com/styles/basic/style.json?key=FqtjYUJi4HGcp4dogscf', // stylesheet location
      // center: [84.2596, 28.0744],
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



    this.draw = draw;
    map.addControl(draw, 'top-left');
    map.addControl(geocoder);
    map.addControl(new mapboxgl.NavigationControl(), 'top-left');



    this.map = map;
    this.map.scrollZoom.disable();
    this.map.on('load', () => {

      map.on('draw.create', () => {
        this.codeMirror.setValue(stringify(draw.getAll()));
        this.handleChange(draw.getAll());
      });
      map.on('draw.update', () => {
        this.codeMirror.setValue(stringify(draw.getAll()));
        this.handleChange(draw.getAll());
      });
      map.on('draw.delete', () => {
        this.codeMirror.setValue(stringify(draw.getAll()));
        this.handleChange(draw.getAll());
      });

    });
  }


  loadGeometries(geometry) {
    const { draw, map } = this;
    // const feature = { type: 'Point', coordinates: [85.16097227146378,27.72834090166741] };
    // var bounds = new mapboxgl.LngLatBounds();
    const add = (geometry) => {
      geometry.features.map((feature)=>{
        draw.add(feature);
      });
    };

    map.on('load', () => {
      add(geometry);
    });

    map.loaded() ? add(geometry):null;
    map.fitBounds(ge(geometry), {padding:100});

  }


  markSelection = ({ message }) => {
    let line = parseInt(
      message
        .split(':')[0]
        .split('line ')[1],
      10,
    ) - 1;

    let content = this.getContentAtLine(line);

    if (content === '{') {
      line = line + 1;
      content = this.getContentAtLine(line);
    }
    const chEnd = content.length;
    const chStart = chEnd - trimStart(content, ' ').length;
    const markedText = this.codeMirror.markText({ line, ch: chStart }, { line, ch: chEnd }, { className: styles.colored });
    this.setState({ markedText });
  }

  timer = null;

  handleBlur = ({ target }) => {
    const { name, onBlur } = this.props;

    if (target === undefined) { // codemirror catches multiple events
      onBlur({
        target: {
          name,
          type: 'geojson',
          value: this.getValue(),
        },
      });

    }
  }

  handleChange = (json) => {
    const { hasInitValue } = this.state;
    const { name, onChange } = this.props;

    // Update the parent
    onChange({
      target: {
        name,
        value: json,
        type: 'geojson',
      },
    });

    if (!hasInitValue) {
      this.setState({ hasInitValue: true });
    }

    // Remove higlight error
    if (this.state.markedText) {
      this.state.markedText.clear();
      this.setState({ markedText: null, error: null });
    }

    // clearTimeout(this.timer);
    // this.timer = setTimeout(() => this.testJSON(this.codeMirror.getValue()), WAIT);
  }

  testJSON = (value) => {
    try {
      jsonlint.parse(value);
    } catch(err) {
      this.markSelection(err);
    }
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
            </div>
          </div>
          <div style={{display:'none'}}>
            <textarea  ref={this.editor} autoComplete='off' id={this.props.name} defaultValue="" />
            <select className={styles.select} onChange={({ target }) => this.setTheme(target.value)} defaultValue={DEFAULT_THEME}>
              {THEMES.sort().map(theme => <option key={theme} value={theme}>{theme}</option>)}
            </select>
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
  onBlur: () => {},
  onChange: () => {},
  value: null,
};

InputGJSON.propTypes = {
  name: PropTypes.string.isRequired,
  onBlur: PropTypes.func,
  onChange: PropTypes.func,
  value: PropTypes.object,
};

export default InputGJSON;
