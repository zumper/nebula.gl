import { simplifyPath } from './simplify-path';

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
