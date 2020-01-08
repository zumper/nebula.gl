// @flow

import destination from '@turf/destination';
import bearing from '@turf/bearing';
import lineIntersect from '@turf/line-intersect';
import turfDistance from '@turf/distance';
import { point, lineString } from '@turf/helpers';
import { generatePointsParallelToLinePoints, getEditHandlesForGeometry } from '../utils';
import type { ClickEvent, PointerMoveEvent, ModeProps, GuideFeatureCollection } from '../types.js';
import type { Polygon, Position, FeatureCollection } from '../geojson-types.js';
import { BaseGeoJsonEditMode, getPickedEditHandle } from './geojson-edit-mode.js';

export class Draw90DegreePolygonMode extends BaseGeoJsonEditMode {
  getGuides(props: ModeProps<FeatureCollection>): GuideFeatureCollection {
    const guides: GuideFeatureCollection = {
      type: 'FeatureCollection',
      features: []
    };

    const tentativeFeature = this.getTentativeFeature();
    if (tentativeFeature) {
      guides.features.push(tentativeFeature);

      guides.features = guides.features.concat(
        getEditHandlesForGeometry(tentativeFeature.geometry, -1)
      );
      // Slice off the handles that are are next to the pointer
      if (tentativeFeature && tentativeFeature.geometry.type === 'LineString') {
        // Remove the last existing handle
        guides.features = guides.features.slice(0, -1);
      } else if (tentativeFeature && tentativeFeature.geometry.type === 'Polygon') {
        // Remove the last existing handle
        guides.features = guides.features.slice(0, -1);
      }
    }

    return guides;
  }

  handlePointerMove({ mapCoords }: PointerMoveEvent, props: ModeProps<FeatureCollection>) {
    props.onUpdateCursor('cell');

    const clickSequence = this.getClickSequence();

    if (clickSequence.length === 0) {
      // nothing to do yet
      return;
    }

    const tentativeFeature = this.getTentativeFeature();
    if (tentativeFeature && tentativeFeature.geometry.type === 'Polygon') {
      clickSequence[clickSequence.length - 1] =
        tentativeFeature.geometry.coordinates[0][clickSequence.length - 1];
    } else if (tentativeFeature && tentativeFeature.geometry.type === 'LineString') {
      clickSequence[clickSequence.length - 1] =
        tentativeFeature.geometry.coordinates[clickSequence.length - 1];
    }

    let p3;
    if (clickSequence.length === 1) {
      p3 = mapCoords;
    } else {
      const p1 = clickSequence[clickSequence.length - 2];
      const p2 = clickSequence[clickSequence.length - 1];
      [p3] = generatePointsParallelToLinePoints(p1, p2, mapCoords);
    }

    if (clickSequence.length < 3) {
      // Draw a LineString connecting all the clicked points with the hovered point
      this._setTentativeFeature({
        type: 'Feature',
        properties: {
          guideType: 'tentative'
        },
        geometry: {
          type: 'LineString',
          coordinates: [...clickSequence, p3]
        }
      });
    } else {
      // Draw a Polygon connecting all the clicked points with the hovered point
      this._setTentativeFeature({
        type: 'Feature',
        properties: {
          guideType: 'tentative'
        },
        geometry: {
          type: 'Polygon',
          coordinates: [[...clickSequence, p3, clickSequence[0]]]
        }
      });
    }
  }

  handleClick(event: ClickEvent, props: ModeProps<FeatureCollection>) {
    this.addClickSequence(event);

    const { picks } = event;
    const tentativeFeature = this.getTentativeFeature();

    const clickedEditHandle = getPickedEditHandle(picks);

    if (tentativeFeature && tentativeFeature.geometry.type === 'Polygon') {
      const polygon: Polygon = tentativeFeature.geometry;

      if (
        clickedEditHandle &&
        clickedEditHandle.featureIndex === -1 &&
        (clickedEditHandle.positionIndexes[1] === 0 ||
          clickedEditHandle.positionIndexes[1] === polygon.coordinates[0].length - 3)
      ) {
        // They clicked the first or last point (or double-clicked), so complete the polygon
        const polygonToAdd: Polygon = {
          type: 'Polygon',
          coordinates: this.finalizedCoordinates([...polygon.coordinates[0]])
        };

        this.resetClickSequence();
        this._setTentativeFeature(null);

        const editAction = this.getAddFeatureOrBooleanPolygonAction(polygonToAdd, props);

        if (editAction) {
          props.onEdit(editAction);
        }
      }
    }

    // Trigger pointer move right away in order for it to update edit handles (to support double-click)
    const fakePointerMoveEvent = {
      screenCoords: [-1, -1],
      mapCoords: event.mapCoords,
      picks: [],
      isDragging: false,
      pointerDownPicks: null,
      pointerDownScreenCoords: null,
      pointerDownMapCoords: null,
      sourceEvent: null
    };
    this.handlePointerMove(fakePointerMoveEvent, props);
  }

  finalizedCoordinates(coords: Position[]) {
    // Remove the hovered position
    let coordinates = [[...coords.slice(0, -2), coords[0]]];
    let pt = this.getIntermediatePoint([...coords]);
    if (!pt) {
      // if intermediate point with 90 degree not available
      // try remove the last clicked point and get the intermediate point.
      const tc = [...coords];
      tc.splice(-3, 1);
      pt = this.getIntermediatePoint([...tc]);
      if (pt) {
        coordinates = [[...coords.slice(0, -3), pt, coords[0]]];
      }
    } else {
      coordinates = [[...coords.slice(0, -2), pt, coords[0]]];
    }
    return coordinates;
  }

  getIntermediatePoint(coordinates: Position[]) {
    let pt;
    if (coordinates.length > 4) {
      const [p1, p2] = [...coordinates];
      const angle1 = bearing(p1, p2);
      const p3 = coordinates[coordinates.length - 3];
      const p4 = coordinates[coordinates.length - 4];
      const angle2 = bearing(p3, p4);

      const angles = { first: [], second: [] };
      // calculate 3 right angle points for first and last points in lineString
      [1, 2, 3].forEach(factor => {
        const newAngle1 = angle1 + factor * 90;
        // convert angles to 0 to -180 for anti-clock and 0 to 180 for clock wise
        angles.first.push(newAngle1 > 180 ? newAngle1 - 360 : newAngle1);
        const newAngle2 = angle2 + factor * 90;
        angles.second.push(newAngle2 > 180 ? newAngle2 - 360 : newAngle2);
      });

      const distance = turfDistance(point(p1), point(p3));
      // Draw imaginary right angle lines for both first and last points in lineString
      // If there is intersection point for any 2 lines, will be the 90 degree point.
      [0, 1, 2].forEach(indexFirst => {
        const line1 = lineString([
          p1,
          destination(p1, distance, angles.first[indexFirst]).geometry.coordinates
        ]);
        [0, 1, 2].forEach(indexSecond => {
          const line2 = lineString([
            p3,
            destination(p3, distance, angles.second[indexSecond]).geometry.coordinates
          ]);
          const fc = lineIntersect(line1, line2);
          if (fc && fc.features.length) {
            // found the intersect point
            pt = fc.features[0].geometry.coordinates;
          }
        });
      });
    }
    return pt;
  }
}
