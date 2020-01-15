/**
 * @author        yewon@zumper.com (Yewon Lee)
 * @copyright     Copyright (c) 2019, Zumper
 * @description   simplifyPath
 */

// https://en.wikipedia.org/wiki/Distance_from_a_point_to_a_line
function Line(p1, p2) {
  this.p1Lat = p1[1];
  this.p1Lng = p1[0];
  this.p2Lat = p2[1];
  this.p2Lng = p2[0];
  this.dy = this.p2Lng - this.p1Lng;
  this.dx = this.p2Lat - this.p1Lat;
  this.mag = Math.sqrt(this.dy * this.dy + this.dx * this.dx);

  this.distanceToPoint = point => {
    return (
      Math.abs(
        this.dy * point[1] - this.dx * point[0] + this.p2Lat * this.p1Lng - this.p2Lng * this.p1Lat
      ) / this.mag
    );
  };
}

const douglasPeucker = (pts, splitDist) => {
  if (pts.length <= 2) {
    return pts;
  }
  // make line from start to end
  // find the largest distance from intermediate pts to this line
  const line = new Line(pts[0], pts[pts.length - 1]);
  let maxDistance = -1;
  let maxDistanceIndex = 0;
  for (let end = pts.length - 1, i = 1; i < end; ++i) {
    const distance = line.distanceToPoint(pts[i]);
    if (distance > maxDistance) {
      maxDistance = distance;
      maxDistanceIndex = i;
    }
  }
  // check if the max distance is greater than our tolerance allows
  if (maxDistance >= splitDist) {
    // split the line and recur. then join the result: removing the duplicate pivot point
    // that is shared by both sub-lines.
    const left = douglasPeucker(pts.slice(0, maxDistanceIndex + 1), splitDist);
    const right = douglasPeucker(pts.slice(maxDistanceIndex), splitDist);
    left.pop();
    Array.prototype.push.apply(left, right);
    return left;
  }
  // discard all intermediate pts. keep only the line
  return [pts[0], pts[pts.length - 1]];
};

// reference: https://gist.github.com/adammiller/826148 (this gist has much broken code)
// https://en.wikipedia.org/wiki/Ramer%E2%80%93Douglas%E2%80%93Peucker_algorithm
export const simplifyPath = (points, tolerance) => {
  const arr = douglasPeucker(points, tolerance);
  // close the path so that first/last point is equal.
  if (points[0] !== points[points.length - 1]) {
    arr.push(points[0]);
  }
  return arr;
};

export default simplifyPath;
