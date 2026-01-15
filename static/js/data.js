function persistData() {
  if (state.loadError) {
    return;
  }
  clearTimeout(persistData._timeout);
  persistData._timeout = setTimeout(() => {
    fetch("/api/data", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(state.data),
    });
  }, 300);
}

function toggleEditLine(lineId, enabled) {
  state.editingLineId = enabled ? lineId : null;
  refreshSources();
}

function deleteLine(lineId) {
  state.data.lines = state.data.lines.filter((item) => item.id !== lineId);
  if (state.selectedLineId === lineId) {
    clearSelection();
  }
  if (state.editingLineId === lineId) {
    state.editingLineId = null;
  }
  refreshSources();
  persistData();
  refreshLists();
}

function deleteLight(lightId) {
  state.data.trafficLights = state.data.trafficLights.filter((item) => item.id !== lightId);
  refreshSources();
  persistData();
  refreshLists();
}

function newLineFeature(points) {
  return {
    id: `line_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
    geometry: { type: "LineString", coordinates: points },
    visible: true,
    properties: {
      name: "",
      totalLanes: null,
      lanesForward: null,
      lanesBackward: null,
      oneWay: false,
      arrowDirection: 1,
      busLane: "none",
    },
  };
}

function addTrafficLight(lngLat) {
  state.data.trafficLights.push({
    id: `light_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
    geometry: { type: "Point", coordinates: [lngLat.lng, lngLat.lat] },
    visible: true,
  });
  refreshSources();
  persistData();
  refreshLists();
}

function finalizeDrawing() {
  if (state.drawing.points.length < 2) {
    state.drawing.active = false;
    state.drawing.points = [];
    refreshDrawing();
    showMessage("Line discarded.");
    return;
  }
  state.data.lines.push(newLineFeature(state.drawing.points.slice()));
  state.drawing.active = false;
  state.drawing.points = [];
  refreshDrawing();
  refreshSources();
  persistData();
  refreshLists();
}
