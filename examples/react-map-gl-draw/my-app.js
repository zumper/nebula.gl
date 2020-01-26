import React, { useState, useRef, useCallback } from 'react';
import MapGL from 'react-map-gl';
import cloneDeep from 'lodash/cloneDeep';
import { Editor, EditorModes, EditTypes } from 'react-map-gl-draw';
import styled from 'styled-components';
import { getFeatureStyle, getEditHandleStyle } from './style';
import { simplifyPath } from './simplify-path';
import { useIsMouseDown } from './useMouseDown';
import { simplifyPolygon } from './simplifyPolygon';
import isLine from './isLine';

const MAP_STYLE = 'mapbox://styles/mapbox/light-v9';

const DEFAULT_VIEWPORT = {
  width: 800,
  height: 600,
  longitude: -122.45,
  latitude: 37.78,
  zoom: 12
};

const Button = styled.button`
  background-color: aliceblue;
  border: solid 1px #cfd7de;
  padding: 10px 20px;
  position: absolute;
  z-index: 100;
  left: 20px;
  top: 20px;
  width: 95px;
`;

const Delete = styled.button`
  background-color: aliceblue;
  border: solid 1px #cfd7de;
  padding: 10px 20px;
  position: absolute;
  z-index: 100;
  left: 20px;
  top: 60px;
  width: 95px;
`;

const Undo = styled.button`
  background-color: aliceblue;
  border: solid 1px #cfd7de;
  padding: 10px 20px;
  position: absolute;
  z-index: 100;
  left: 20px;
  top: 100px;
  width: 95px;
`;

export const MyApp = () => {
  const editorRef = useRef(null);
  const [viewport, setViewport] = useState(DEFAULT_VIEWPORT);
  const [editorMode, setEditorMode] = useState(EditorModes.READ_ONLY);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [selectedFeatureBackup, setSelectedFeatureBackup] = useState(null);
  const [undoEnabled, setUndoEnabled] = useState(false);
  const { zoom } = viewport;

  let featuresCount = 0;

  if (editorRef && editorRef.current && typeof editorRef.current.getFeatures === 'function') {
    const features = editorRef.current.getFeatures();
    if (features) {
      featuresCount = features.length;
    }
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
        setSelectedIndex(options.selectedFeatureIndex);
        const backupFeat = cloneDeep(editorRef.current.getFeatures()[options.selectedFeatureIndex]);
        setSelectedFeatureBackup(backupFeat);

        setEditorMode(EditorModes.EDITING);
      } else {
        setSelectedFeatureBackup(null);
        setSelectedIndex(-1);
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
      if (editType === EditTypes.ADD_FEATURE) {
        if (data && data.length) {
          const newFeature = data[data.length - 1];
          const newFeatCoordinates = newFeature.geometry.coordinates[0];

          // mapbox polygon first and last points are always the same. We need to remove one for the simplify function to work
          const points = newFeatCoordinates.slice(0, newFeatCoordinates.length - 1);
          const coordinates = simplifyPolygon(points, zoom, 100);
          const line = isLine(coordinates);

          if (line) {
            console.log('is line');
            editorRef.current.deleteFeatures(featuresCount);
            setEditorMode(EditorModes.READ_ONLY);
            setTimeout(() => {
              setEditorMode(EditorModes.DRAW_POLYGON);
            }, 0);
            return;
          }

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
      } else if (
        editType === EditTypes.ADD_POSITION ||
        editType === EditTypes.FINISH_MOVE_POSITION ||
        editType === EditTypes.REMOVE_POSITION
      ) {
        setUndoEnabled(true);
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

  const handleUndo = useCallback(
    () => {
      editorRef.current.deleteFeatures(selectedIndex);
      setSelectedIndex(-1);
      setSelectedFeatureBackup(null);
      setUndoEnabled(false);
      setEditorMode(EditorModes.DRAW_POLYGON);
      setTimeout(() => {
        editorRef.current.addFeatures(selectedFeatureBackup);
      }, 0);
    },
    [selectedIndex, selectedFeatureBackup]
  );

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
      <Undo onClick={handleUndo} disabled={!undoEnabled}>
        Undo
      </Undo>
    </MapGL>
  );
};
