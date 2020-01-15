import React, { useState, useRef, useCallback } from 'react';
import MapGL from 'react-map-gl';
import { Editor, EditorModes, simplifyPath } from 'react-map-gl-draw';
import styled from 'styled-components';
import { getFeatureStyle, getEditHandleStyle } from './style';

const MAP_STYLE = 'mapbox://styles/mapbox/light-v9';

const DEFAULT_VIEWPORT = {
  width: 800,
  height: 600,
  longitude: -122.45,
  latitude: 37.78,
  zoom: 14
};

const Button = styled.button`
  padding: 10px 20px;
  position: absolute;
  z-index: 100;
  left: 20px;
  top: 20px;
  width: 85px;
`;

const Delete = styled.button`
  padding: 10px 20px;
  position: absolute;
  z-index: 100;
  left: 20px;
  top: 60px;
  width: 85px;
`;

export const MyApp = () => {
  const editorRef = useRef(null);
  const [viewport, setViewport] = useState(DEFAULT_VIEWPORT);
  const [editorMode, setEditorMode] = useState(EditorModes.READ_ONLY);
  // const [selectedIndex, setSelectedIndex] = useState(-1);

  let featuresCount = 0;

  if (editorRef && editorRef.current && editorRef.current.getFeatures) {
    featuresCount = editorRef.current.getFeatures().length;
  }

  const handleDrawClick = useCallback(
    () => {
      if (editorMode === EditorModes.READ_ONLY) {
        // setEditorMode(EditorModes.EDITING);
        setEditorMode(EditorModes.DRAW_POLYGON);
        // onToggleMenu(true);
      } else {
        setEditorMode(EditorModes.READ_ONLY);
        // onToggleMenu(false);
      }
    },
    [editorMode]
  );

  const handleOnSelectFeature = useCallback(
    options => {
      if (options && options.selectedFeatureIndex !== null) {
        // setSelectedIndex(options.selectedFeatureIndex);
        // setEditorMode(EditorModes.EDITING);
      } else {
        // setSelectedIndex(-1);
        // eslint-disable-next-line no-lonely-if
        if (featuresCount < 5) {
          // enable drawing when unselecting:
          setEditorMode(EditorModes.DRAW_POLYGON);
        } else {
          // warnMaxPolygons();
        }
      }
    },
    [featuresCount]
  );

  const handleOnDone = useCallback(() => {
    setEditorMode(EditorModes.READ_ONLY);
    // onToggleMenu(false);
    // const features = editorRef.current.getFeatures();
    // onDone(features);
  }, []);

  const handleOnUpdateFeature = useCallback(
    ({ editType, data }) => {
      if (editType === 'addFeature') {
        if (data && data.length) {
          const newFeature = data[data.length - 1];

          // mapbox polygons always have the last point equal to the first,
          // so we have to remove the last point to simplify
          const points = newFeature.geometry.coordinates[0].slice(
            0,
            newFeature.geometry.coordinates[0].length - 1
          );

          const simplifiedFeature = {
            type: 'Feature',
            geometry: {
              coordinates: [simplifyPath(points, 0.001)],
              type: 'Polygon'
            },
            properties: { renderType: 'Polygon' }
          };

          editorRef.current.deleteFeatures(featuresCount);
          editorRef.current.addFeatures(simplifiedFeature);
        }
        if (featuresCount < 5) {
          handleOnDone();
        }
      }
    },
    [featuresCount, handleOnDone]
  );

  const deleteAllFeatures = () => {
    const features = editorRef.current.getFeatures();
    let deleted = 0;
    if (features.length) {
      deleted = features.length;
      editorRef.current.deleteFeatures(features.map((f, i) => i));
    }
    return deleted;
  };

  const handleClearAll = useCallback(() => {
    // const deleted = deleteAllFeatures();
    deleteAllFeatures();
    setEditorMode(EditorModes.READ_ONLY);
  }, []);

  const canDragMap = editorMode === EditorModes.READ_ONLY || !editorMode;

  const getCursor = useCallback(() => (canDragMap ? 'grab' : 'crosshair'), [canDragMap]);

  return (
    <MapGL
      {...viewport}
      width="100%"
      height="100%"
      mapStyle={MAP_STYLE}
      editHandleShape="circle"
      onViewportChange={v => setViewport(v)}
      dragPan={canDragMap}
      getCursor={getCursor}
    >
      <Editor
        ref={editorRef}
        clickRadius={12}
        mode={editorMode}
        onSelect={handleOnSelectFeature}
        onUpdate={handleOnUpdateFeature}
        editHandleShape="circle"
        featureStyle={getFeatureStyle({ editorMode })}
        editHandleStyle={getEditHandleStyle({ editorMode })}
        maxFeatures={3}
      />
      <Button onClick={handleDrawClick}>{canDragMap ? 'Draw' : 'Drawing'}</Button>
      <Delete onClick={handleClearAll}>Clear all</Delete>
    </MapGL>
  );
};
