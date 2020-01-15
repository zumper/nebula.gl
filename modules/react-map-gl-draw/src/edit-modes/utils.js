// @flow

import type { MjolnirEvent } from 'mjolnir.js';
import type { Feature, Position } from '@nebula.gl/edit-modes';

import { GEOJSON_TYPE } from '../constants';

export function isNumeric(val: any) {
  return !Array.isArray(val) && !isNaN(parseFloat(val)) && isFinite(val);
}

export function parseEventElement(evt: MjolnirEvent) {
  const elem = evt.target;
  if (!elem || !elem.dataset || !elem.dataset.type) {
    return null;
  }

  const type = elem.dataset.type;
  const featureIndex = elem.dataset.featureIndex;
  const index = elem.dataset.index;

  return {
    object: {
      type,
      index: isNumeric(index) ? Number(index) : undefined,
      featureIndex: isNumeric(featureIndex) ? Number(featureIndex) : undefined
    },
    index
  };
}

export function getScreenCoords(evt: MjolnirEvent) {
  const {
    offsetCenter: { x, y }
  } = evt;
  return [Number(x), Number(y)];
}

export function findClosestPointOnLineSegment(p1: Position, p2: Position, p: Position) {
  // line
  const k = (p2[1] - p1[1]) / (p2[0] - p1[0]);
  const b = p1[1] - k * p1[0];

  // vertical line
  if (!isFinite(k)) {
    const q = [p1[0], p[1]];
    return inBounds(p1, p2, q) ? q : null;
  }

  // p is on line [p1, p2]
  if (p[0] * k + b - p[1] === 0) {
    return inBounds(p1, p2, p) ? p : null;
  }

  const qx = (k * p[1] + p[0] - k * b) / (k * k + 1);
  const qy = k * qx + b;

  return inBounds(p1, p2, [qx, qy]) ? [qx, qy] : null;
}

export function getFeatureCoordinates(feature: Feature) {
  const coordinates = feature && feature.geometry && feature.geometry.coordinates;
  if (!coordinates) {
    return null;
  }

  const isPolygonal = feature.geometry.type === GEOJSON_TYPE.POLYGON;
  return isPolygonal ? coordinates[0] : coordinates;
}

export function updateRectanglePosition(
  feature: Feature,
  editHandleIndex: number,
  mapCoords: Position
) {
  const coordinates = getFeatureCoordinates(feature);
  if (!coordinates) {
    return null;
  }

  const points = coordinates.slice(0, 4);
  points[editHandleIndex % 4] = mapCoords;

  /*
  *   p0.x, p0.y (p0) ------ p2.x, p0.y (p1)
  *       |                      |
  *       |                      |
  *   p0.x, p2.y (p3) ----- p2.x, p2.y (p2)
  */
  const p0 = points[(editHandleIndex + 2) % 4];
  const p2 = points[editHandleIndex % 4];
  points[(editHandleIndex + 1) % 4] = [p2[0], p0[1]];
  points[(editHandleIndex + 3) % 4] = [p0[0], p2[1]];

  return feature.geometry.type === GEOJSON_TYPE.POLYGON ? [[...points, points[0]]] : points;
}

function inBounds(p1: Position, p2: Position, p: Position) {
  const bounds = [
    Math.min(p1[0], p2[0]),
    Math.max(p1[0], p2[0]),
    Math.min(p1[1], p2[1]),
    Math.max(p1[1], p2[1])
  ];

  return p[0] >= bounds[0] && p[0] <= bounds[1] && p[1] >= bounds[2] && p[1] <= bounds[3];
}

// https://www.geodatasource.com/developers/javascript
export function distanceInMiles(p1: Position, p2: Position) {
  const lat1 = p1[1];
  const lon1 = p1[0];
  const lat2 = p2[1];
  const lon2 = p2[0];

  if (lat1 === lat2 && lon1 === lon2) {
    return 0;
  }

  const radlat1 = (Math.PI * lat1) / 180;
  const radlat2 = (Math.PI * lat2) / 180;
  const theta = lon1 - lon2;
  const radtheta = (Math.PI * theta) / 180;
  let dist =
    Math.sin(radlat1) * Math.sin(radlat2) +
    Math.cos(radlat1) * Math.cos(radlat2) * Math.cos(radtheta);
  if (dist > 1) {
    dist = 1;
  }
  dist = Math.acos(dist);
  dist = (dist * 180) / Math.PI;
  dist = dist * 60 * 1.1515;
  // dist = dist * 1.609344;  // <- if we need kilometers...
  return dist;
}

// http://blog.madebylotus.com/blog/creating-static-distance-circles-in-map-box-how-many-miles-are-in-a-pixel
export function milesToPixels(zoom: number, miles: number) {
  return (Math.pow(2, zoom) * miles) / 97.2618456;
}
