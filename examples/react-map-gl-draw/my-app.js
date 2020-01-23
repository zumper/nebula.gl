import React, { useState, useRef, useCallback } from 'react';
import MapGL from 'react-map-gl';
import { Editor, EditorModes } from 'react-map-gl-draw';
import styled from 'styled-components';
import { getFeatureStyle, getEditHandleStyle } from './style';
import { simplifyPath } from './simplify-path';
import { useIsMouseDown } from './useMouseDown';

const MAP_STYLE = 'mapbox://styles/mapbox/light-v9';

const DEFAULT_VIEWPORT = {
  width: 800,
  height: 600,
  longitude: -122.45,
  latitude: 37.78,
  zoom: 12
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

export const simplifyPolygon = (points, zoom, polygonMaxLength) => {
  // reduce path using douglas-peucker
  // scale tolerance by zoom, the more zoomed out, the less tolerance to use
  // 'seems nice' at 1e4 @ zoom 12, gets 'chunky' above 4e-4
  const peucker = 1e-4;
  const tolerance = peucker * 0.75 ** (zoom - 12);

  // https://developers.google.com/maps/documentation/utilities/polylinealgorithm genius
  let reducedPath = simplifyPath(points, tolerance);

  // try to reduce the path by increasing tolerance. Give up after 15 times.
  let i = 0;
  while (i < 15 && reducedPath.length > polygonMaxLength) {
    i += 1;
    reducedPath = simplifyPath(points, tolerance + i * peucker);
  }

  return reducedPath;
};

export const MyApp = () => {
  const editorRef = useRef(null);
  const [viewport, setViewport] = useState(DEFAULT_VIEWPORT);
  const [editorMode, setEditorMode] = useState(EditorModes.READ_ONLY);
  const { zoom } = viewport;
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
        setEditorMode(EditorModes.EDITING);
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

          const coordinates = simplifyPolygon(points, zoom, 100);

          const simplifiedFeature = {
            type: 'Feature',
            geometry: {
              coordinates: [coordinates],
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

  const isMouseDown = useIsMouseDown();

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
        featureStyle={getFeatureStyle({ editorMode, isMouseDown })}
        editHandleStyle={getEditHandleStyle({ editorMode, isMouseDown })}
        maxFeatures={5}
        onMaxFeatures={() => console.log('max features')}
      />
      <Button onClick={handleDrawClick}>{canDragMap ? 'Draw' : 'Drawing'}</Button>
      <Delete onClick={handleClearAll}>Clear all</Delete>
    </MapGL>
  );
};
