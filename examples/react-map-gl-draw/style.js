/**
 * @author      hugo@zumper.com (Hugo Pineda)
 * @copyright   Copyright (c) 2019, Zumper
 */

import { RenderStates } from 'react-map-gl-draw';

export const getEditHandleStyle = ({ isStateZoom, editorMode }) => ({ feature, state }) => {
  if (isStateZoom) {
    return {
      fillOpacity: 0,
      strokeOpacity: 0
    };
  }
  switch (state) {
    case RenderStates.SELECTED:
    case RenderStates.HOVERED:
    case RenderStates.UNCOMMITTED:
      return {
        fill: 'rgb(251, 176, 59)',
        fillOpacity: 1,
        stroke: 'rgb(255, 255, 255)',
        strokeWidth: 2,
        r: 7
      };

    default:
      return {
        fill: 'rgb(251, 176, 59)',
        fillOpacity: 1,
        stroke: 'rgb(255, 255, 255)',
        strokeWidth: 2,
        r: 5
      };
  }
};

export const getFeatureStyle = ({ isStateZoom, editorMode }) => ({ feature, index, state }) => {
  if (isStateZoom) {
    return {
      fillOpacity: 0,
      strokeOpacity: 0
    };
  }

  const defaultStyle = {
    stroke: 'rgb(60, 178, 208)',
    strokeWidth: 2,
    fill: 'rgb(60, 178, 208)',
    fillOpacity: 0.1
  };
  switch (state) {
    case RenderStates.SELECTED:
    case RenderStates.HOVERED:
      return {
        ...defaultStyle,
        stroke: 'rgb(251, 176, 59)',
        fill: 'rgb(251, 176, 59)'
      };
    case RenderStates.UNCOMMITTED:
      return {
        stroke: 'rgb(251, 176, 59)',
        strokeWidth: 2,
        fill: 'rgb(251, 176, 59)',
        fillOpacity: 0,
        strokeDasharray: '4,2'
      };
    case RenderStates.CLOSING:
      return {
        stroke: 'rgb(251, 176, 59)',
        strokeWidth: 2,
        strokeOpacity: 0,
        fill: 'rgb(251, 176, 59)',
        fillOpacity: 0.3,
        strokeDasharray: '4,2'
      };

    default:
      return defaultStyle;
  }
};
