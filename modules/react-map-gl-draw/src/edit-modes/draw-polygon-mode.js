// @flow
import type { ClickEvent, FeatureCollection, StopDraggingEvent } from '@nebula.gl/edit-modes';
import uuid from 'uuid/v1';

import type { ModeProps } from '../types';
import {
  EDIT_TYPE,
  GEOJSON_TYPE,
  GUIDE_TYPE,
  MIN_PX_DISTANCE_BETWEEN_POINTS,
  RENDER_TYPE
} from '../constants';
import { getFeatureCoordinates, distanceInMiles, milesToPixels } from './utils';
import BaseMode from './base-mode';

export default class DrawPolygonMode extends BaseMode {
  freeDrawClosed = false;
  didFreeDraw = false;

  handleStopDragging(event: StopDraggingEvent, props: ModeProps<FeatureCollection>) {
    const { data, isPointerDown } = props;

    this.freeDrawClosed = false;

    if (!isPointerDown && this.didFreeDraw) {
      let tentativeFeature = this.getTentativeFeature();
      const coordinates = getFeatureCoordinates(tentativeFeature);

      if (!coordinates) {
        return;
      }

      this.setTentativeFeature(null);

      coordinates.push(coordinates[0]);

      let id;
      if (tentativeFeature && tentativeFeature.properties && tentativeFeature.properties.id) {
        id = tentativeFeature.properties.id;
      } else {
        id = uuid();
      }

      tentativeFeature = {
        type: 'Feature',
        properties: {
          id,
          renderType: RENDER_TYPE.POLYGON
        },
        geometry: {
          type: GEOJSON_TYPE.POLYGON,
          coordinates: [coordinates]
        }
      };

      const updatedData = data.addFeature(tentativeFeature).getObject();

      props.onEdit({
        editType: EDIT_TYPE.ADD_FEATURE,
        updatedData,
        editContext: null
      });

      this.freeDrawClosed = true;
      this.didFreeDraw = false;
    }
  }

  handleClick = (event: ClickEvent, props: ModeProps<FeatureCollection>) => {
    const picked = event.picks && event.picks[0];
    const { data, viewport, isPointerDown } = props;
    const zoom = viewport && viewport.zoom ? viewport.zoom : 14;

    if (isPointerDown) {
      this.didFreeDraw = true;
    }

    // const isFromClicking = !isPointerDown && !this.didFreeDraw && !this.freeDrawClosed;
    const isFromDrawing = isPointerDown && !this.freeDrawClosed;

    // update tentative feature
    let tentativeFeature = this.getTentativeFeature();

    // add position to tentativeFeature
    // if click the first editHandle, commit tentativeFeature to featureCollection
    if (tentativeFeature) {
      const pickedObject = picked && picked.object;
      // clicked an editHandle of a tentative feature

      if (
        !isFromDrawing &&
        pickedObject &&
        pickedObject.type === 'editHandle' &&
        pickedObject.index === 0
      ) {
        this.setTentativeFeature(null);

        // append point to the tail, close the polygon
        const coordinates = getFeatureCoordinates(tentativeFeature);
        if (!coordinates) {
          return;
        }

        coordinates.push(coordinates[0]);

        tentativeFeature = {
          type: 'Feature',
          properties: {
            // TODO deprecate id
            id: tentativeFeature.properties.id,
            renderType: RENDER_TYPE.POLYGON
          },
          geometry: {
            type: GEOJSON_TYPE.POLYGON,
            coordinates: [coordinates]
          }
        };

        const updatedData = data.addFeature(tentativeFeature).getObject();

        props.onEdit({
          editType: EDIT_TYPE.ADD_FEATURE,
          updatedData,
          editContext: null
        });
      } else {
        // update tentativeFeature

        let pixels = MIN_PX_DISTANCE_BETWEEN_POINTS;

        if (isFromDrawing) {
          const lastPoint =
            tentativeFeature.geometry.coordinates[tentativeFeature.geometry.coordinates.length - 1];
          const distance = distanceInMiles(lastPoint, event.mapCoords);

          pixels = milesToPixels(zoom, distance);
        }

        if (pixels >= MIN_PX_DISTANCE_BETWEEN_POINTS) {
          tentativeFeature = {
            ...tentativeFeature,
            geometry: {
              type: GEOJSON_TYPE.LINE_STRING,
              coordinates: [...tentativeFeature.geometry.coordinates, event.mapCoords]
            }
          };
          this.setTentativeFeature(tentativeFeature);
        }
      }
    } else {
      // create a tentativeFeature

      tentativeFeature = {
        type: 'Feature',
        properties: {
          // TODO deprecate id
          id: uuid(),
          renderType: RENDER_TYPE.POLYGON,
          guideType: GUIDE_TYPE.TENTATIVE
        },
        geometry: {
          type: GEOJSON_TYPE.POINT,
          coordinates: [event.mapCoords]
        }
      };

      this.setTentativeFeature(tentativeFeature);
    }

    this.freeDrawClosed = false;
  };

  getGuides = (props: ModeProps<FeatureCollection>) => {
    let tentativeFeature = this.getTentativeFeature();
    const coordinates = getFeatureCoordinates(tentativeFeature);

    if (!coordinates) {
      return null;
    }

    const event = props.lastPointerMoveEvent;

    // existing editHandles + cursorEditHandle
    const editHandles = this.getEditHandlesFromFeature(tentativeFeature) || [];
    const cursorEditHandle = {
      type: 'Feature',
      properties: {
        guideType: GUIDE_TYPE.CURSOR_EDIT_HANDLE,
        // TODO remove renderType
        renderType: RENDER_TYPE.POLYGON,
        positionIndexes: [editHandles.length]
      },
      geometry: {
        type: GEOJSON_TYPE.POINT,
        coordinates: [event.mapCoords]
      }
    };
    editHandles.push(cursorEditHandle);

    // tentativeFeature
    tentativeFeature = {
      ...tentativeFeature,
      geometry: {
        type: GEOJSON_TYPE.LINE_STRING,
        coordinates: [...coordinates, event.mapCoords]
      }
    };

    return {
      tentativeFeature,
      editHandles
    };
  };
}
