function refreshSources() {
  const lineFeatures = state.data.lines.map((line) => ({
    type: "Feature",
    geometry: line.geometry,
    properties: {
      id: line.id,
      name: line.properties.name,
      displayName: line.properties.name || "Без имени",
      oneWay: line.properties.oneWay,
      arrowGlyph: line.properties.arrowDirection === -1 ? "<" : ">",
      visible: line.visible !== false,
    },
  }));

  const lightsFeatures = state.data.trafficLights.map((light) => ({
    type: "Feature",
    geometry: light.geometry,
    properties: {
      id: light.id,
      visible: light.visible !== false,
    },
  }));

  map.getSource("lines").setData({ type: "FeatureCollection", features: lineFeatures });
  map.getSource("trafficLights").setData({ type: "FeatureCollection", features: lightsFeatures });

  if (state.editingLineId) {
    const line = state.data.lines.find((item) => item.id === state.editingLineId);
    if (line) {
      const pointFeatures = line.geometry.coordinates.map((coord, idx) => ({
        type: "Feature",
        geometry: { type: "Point", coordinates: coord },
        properties: { index: idx },
      }));
      map.getSource("line-vertices").setData({ type: "FeatureCollection", features: pointFeatures });
    }
  } else {
    map.getSource("line-vertices").setData({ type: "FeatureCollection", features: [] });
  }
}

function refreshDrawing() {
  const features = state.drawing.active
    ? [{ type: "Feature", geometry: { type: "LineString", coordinates: state.drawing.points } }]
    : [];
  map.getSource("drawing-line").setData({ type: "FeatureCollection", features });
}
