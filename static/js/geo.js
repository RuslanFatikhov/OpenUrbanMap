function metersPerPixel(lat, zoom) {
  return (156543.03392 * Math.cos((lat * Math.PI) / 180)) / Math.pow(2, zoom);
}

function lngLatToMeters(lng, lat) {
  const originShift = (2 * Math.PI * 6378137) / 2;
  const mx = (lng * originShift) / 180;
  let my = Math.log(Math.tan(((90 + lat) * Math.PI) / 360)) / (Math.PI / 180);
  my = (my * originShift) / 180;
  return [mx, my];
}

function metersToLngLat(mx, my) {
  const originShift = (2 * Math.PI * 6378137) / 2;
  const lng = (mx / originShift) * 180;
  let lat = (my / originShift) * 180;
  lat = (180 / Math.PI) * (2 * Math.atan(Math.exp((lat * Math.PI) / 180)) - Math.PI / 2);
  return [lng, lat];
}

function nearestPointOnSegment(px, py, ax, ay, bx, by) {
  const dx = bx - ax;
  const dy = by - ay;
  if (dx === 0 && dy === 0) {
    return { x: ax, y: ay, t: 0 };
  }
  const t = ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy);
  const clamped = Math.max(0, Math.min(1, t));
  return { x: ax + clamped * dx, y: ay + clamped * dy, t: clamped };
}

function nearestPointOnLine(clickLngLat, coordinates) {
  const [px, py] = lngLatToMeters(clickLngLat.lng, clickLngLat.lat);
  let best = null;
  for (let i = 0; i < coordinates.length - 1; i += 1) {
    const [ax, ay] = lngLatToMeters(coordinates[i][0], coordinates[i][1]);
    const [bx, by] = lngLatToMeters(coordinates[i + 1][0], coordinates[i + 1][1]);
    const candidate = nearestPointOnSegment(px, py, ax, ay, bx, by);
    const dist = Math.hypot(px - candidate.x, py - candidate.y);
    if (!best || dist < best.distance) {
      best = { distance: dist, meters: [candidate.x, candidate.y] };
    }
  }
  return best;
}
