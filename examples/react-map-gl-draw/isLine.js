/**
 * @author        yewon@zumper.com (Yewon Lee)
 * @copyright     Copyright (c) 2019, Zumper
 * @description   isLine
 */

// givens a list of points, check whether all the points lie on a single line
// check whether pt is between the startPt and endPt
const isPointBetweenPoints = (pt, beginPt, endPt) => {
  const ptLat = pt[1];

  const ptLng = pt[0];
  const beginPtLat = beginPt[1];

  const beginPtLng = beginPt[0];
  const endPtLat = endPt[1];

  const endPtLng = endPt[0];

  const dxc = ptLat - beginPtLat;
  const dyc = ptLng - beginPtLng;

  const dxl = endPtLat - beginPtLat;
  const dyl = endPtLng - beginPtLng;

  const cross = dxc * dyl - dyc * dxl;

  // Your point lies on the line if and only if cross is equal to zero.
  if (cross !== 0) {
    return false;
  }

  // now that we know the point does lie on the line, let's check whether this point lies between
  // the first and last points
  if (Math.abs(dxl) >= Math.abs(dyl)) {
    return dxl > 0
      ? beginPtLat <= ptLat && ptLat <= endPtLat
      : endPtLat <= ptLat && ptLat <= beginPtLat;
  }
  return dyl > 0
    ? beginPtLng <= ptLng && ptLng <= endPtLng
    : endPtLng <= ptLng && ptLng <= beginPtLng;
};

const comparePoints = (p1, p2) => {
  return p1[0] === p2[0] && p1[1] === p2[1];
};

const isLine = points => {
  const first = points[0];
  const len = points.length;
  let last = points[len - 1];
  for (let i = len - 1; i >= 0 && comparePoints(first, last); --i) {
    last = points[i];
  }

  if (first && last && first !== last && !comparePoints(first, last)) {
    for (let i = 1; i < len - 1; ++i) {
      if (!isPointBetweenPoints(points[i], first, last)) {
        return false;
      }
    }
  }
  return true;
};

export default isLine;
