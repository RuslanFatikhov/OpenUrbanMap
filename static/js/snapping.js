function collectRoadLayerIds() {
  const style = map.getStyle();
  state.roadLayerIds = style.layers
    .filter((layer) => layer.type === "line" && layer.id.includes("road"))
    .map((layer) => layer.id);
}

function snapToRoadOrEndpoint(lngLat) {
  // Snapping logic: find nearest allowed OSM road centerline within 20m,
  // or snap to existing line endpoints if they are closer (supports extending lines).
  const maxDistance = 20;
  const clickMeters = lngLatToMeters(lngLat.lng, lngLat.lat);

  let closestEndpoint = null;
  state.data.lines.forEach((line) => {
    const coords = line.geometry.coordinates;
    [coords[0], coords[coords.length - 1]].forEach((point) => {
      const meters = lngLatToMeters(point[0], point[1]);
      const dist = Math.hypot(clickMeters[0] - meters[0], clickMeters[1] - meters[1]);
      if (!closestEndpoint || dist < closestEndpoint.distance) {
        closestEndpoint = { distance: dist, coord: point };
      }
    });
  });

  const zoom = map.getZoom();
  const pixelRadius = maxDistance / metersPerPixel(lngLat.lat, zoom);
  const screenPoint = map.project(lngLat);
  const bbox = [
    [screenPoint.x - pixelRadius, screenPoint.y - pixelRadius],
    [screenPoint.x + pixelRadius, screenPoint.y + pixelRadius],
  ];

  const features = map.queryRenderedFeatures(bbox, { layers: state.roadLayerIds });
  const allowedClasses = new Set(["trunk", "primary", "secondary", "residential", "service"]);

  let closestRoad = null;

  features.forEach((feature) => {
    const roadClass = feature.properties && feature.properties.class;
    if (!allowedClasses.has(roadClass)) {
      return;
    }
    const geom = feature.geometry;
    const lines = geom.type === "LineString" ? [geom.coordinates] : geom.coordinates;
    lines.forEach((lineCoords) => {
      const candidate = nearestPointOnLine(lngLat, lineCoords);
      if (!candidate) {
        return;
      }
      if (!closestRoad || candidate.distance < closestRoad.distance) {
        closestRoad = { distance: candidate.distance, coord: metersToLngLat(...candidate.meters) };
      }
    });
  });

  const endpointOk = closestEndpoint && closestEndpoint.distance <= maxDistance;
  const roadOk = closestRoad && closestRoad.distance <= maxDistance;

  if (endpointOk && roadOk) {
    return closestEndpoint.distance <= closestRoad.distance ? closestEndpoint.coord : closestRoad.coord;
  }
  if (endpointOk) {
    return closestEndpoint.coord;
  }
  if (roadOk) {
    return closestRoad.coord;
  }
  return null;
}
