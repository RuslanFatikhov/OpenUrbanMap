map.on("load", () => {
  collectRoadLayerIds();

  map.addSource("lines", {
    type: "geojson",
    data: { type: "FeatureCollection", features: [] },
  });
  map.addSource("trafficLights", {
    type: "geojson",
    data: { type: "FeatureCollection", features: [] },
  });
  map.addSource("drawing-line", {
    type: "geojson",
    data: { type: "FeatureCollection", features: [] },
  });
  map.addSource("line-vertices", {
    type: "geojson",
    data: { type: "FeatureCollection", features: [] },
  });

  map.addLayer({
    id: "lines",
    type: "line",
    source: "lines",
    paint: {
      "line-color": "#2f5d62",
      "line-width": 4,
    },
    filter: ["==", ["get", "visible"], true],
  });

  map.addLayer({
    id: "line-selected",
    type: "line",
    source: "lines",
    paint: {
      "line-color": "#b0562c",
      "line-width": 6,
    },
    filter: ["all", ["==", ["get", "visible"], true], ["==", ["get", "id"], ""]],
  });

  map.addLayer({
    id: "line-arrows",
    type: "symbol",
    source: "lines",
    layout: {
      "symbol-placement": "line",
      "text-field": ["get", "arrowGlyph"],
      "text-size": 14,
      "text-rotation-alignment": "map",
    },
    paint: {
      "text-color": "#1c1b19",
    },
    filter: [
      "all",
      ["==", ["get", "visible"], true],
      ["==", ["get", "oneWay"], true],
    ],
  });

  map.addLayer({
    id: "line-labels",
    type: "symbol",
    source: "lines",
    layout: {
      "symbol-placement": "line",
      "text-field": ["get", "displayName"],
      "text-size": 12,
      "text-offset": [0, 0.8],
    },
    paint: {
      "text-color": "#1c1b19",
      "text-halo-color": "#fffaf1",
      "text-halo-width": 1,
    },
    filter: ["==", ["get", "visible"], true],
  });

  map.addLayer({
    id: "drawing-line",
    type: "line",
    source: "drawing-line",
    paint: {
      "line-color": "#b0562c",
      "line-width": 3,
      "line-dasharray": [1.5, 1.5],
    },
  });

  map.addLayer({
    id: "line-vertices",
    type: "circle",
    source: "line-vertices",
    paint: {
      "circle-radius": 5,
      "circle-color": "#b0562c",
      "circle-stroke-width": 2,
      "circle-stroke-color": "#fffaf1",
    },
  });

  fetch("/static/icon/streetlight.svg")
    .then((res) => res.text())
    .then((svgText) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        if (!map.hasImage("streetlight-icon")) {
          map.addImage("streetlight-icon", imageData);
        }
        map.addLayer({
          id: "traffic-lights",
          type: "symbol",
          source: "trafficLights",
          layout: {
            "icon-image": "streetlight-icon",
            "icon-size": 0.6,
            "icon-allow-overlap": true,
          },
          filter: ["==", ["get", "visible"], true],
        });
      };
      img.onerror = () => {
        showMessage("Streetlight icon failed to load.");
      };
      img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgText)}`;
    })
    .catch(() => {
      showMessage("Streetlight icon failed to load.");
    });

  fetch("/api/data")
    .then((res) => res.json())
    .then((payload) => {
      if (!payload.ok) {
        state.loadError = payload.error;
        showMessage("Data file error. Working without persistence.");
        return;
      }
      state.data = payload.data;
      refreshSources();
      refreshLists();
    });
});

map.on("click", (event) => {
  const hitFeatures = map.queryRenderedFeatures(event.point, { layers: ["lines", "line-labels"] });
  if (hitFeatures.length > 0) {
    const lineId = hitFeatures[0].properties.id;
    state.editingLineId = null;
    map.setFilter("line-selected", ["all", ["==", ["get", "visible"], true], ["==", ["get", "id"], lineId]]);
    openModalForLine(lineId);
    return;
  }
  hideModal();

  if (!isWithinBounds(event.lngLat)) {
    showMessage("Interaction is limited to Almaty.");
    return;
  }

  if (state.currentTool === "line") {
    if (!isZoomAllowed()) {
      showMessage(`Zoom between ${zoomMin} and ${zoomMax} to draw.`);
      return;
    }
    const snapped = snapToRoadOrEndpoint(event.lngLat);
    if (!snapped) {
      showMessage("No eligible road within 20m.");
      return;
    }
    if (!state.drawing.active) {
      state.drawing.active = true;
    }
    state.drawing.points.push([snapped[0], snapped[1]]);
    refreshDrawing();
  }

  if (state.currentTool === "light") {
    addTrafficLight(event.lngLat);
  }
});

map.on("mousedown", "line-vertices", (event) => {
  const feature = event.features && event.features[0];
  if (!feature || state.editingLineId === null) return;
  map.getCanvas().style.cursor = "grabbing";
  state.draggingVertex = {
    lineId: state.editingLineId,
    index: feature.properties.index,
  };
});

map.on("mousedown", "traffic-lights", (event) => {
  const feature = event.features && event.features[0];
  if (!feature) return;
  map.getCanvas().style.cursor = "grabbing";
  state.draggingLightId = feature.properties.id;
});

map.on("mousemove", (event) => {
  if (state.draggingVertex) {
    const line = state.data.lines.find((item) => item.id === state.draggingVertex.lineId);
    if (!line) return;
    line.geometry.coordinates[state.draggingVertex.index] = [event.lngLat.lng, event.lngLat.lat];
    refreshSources();
  }
  if (state.draggingLightId) {
    const light = state.data.trafficLights.find((item) => item.id === state.draggingLightId);
    if (!light) return;
    light.geometry.coordinates = [event.lngLat.lng, event.lngLat.lat];
    refreshSources();
  }
});

map.on("mouseup", () => {
  if (state.draggingVertex || state.draggingLightId) {
    map.getCanvas().style.cursor = "";
    state.draggingVertex = null;
    state.draggingLightId = null;
    persistData();
  }
});

window.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && state.drawing.active) {
    finalizeDrawing();
  }
});

const modalInputs = [
  "line-name",
  "line-total-lanes",
  "line-forward-lanes",
  "line-backward-lanes",
  "line-oneway",
  "line-bus-lane",
];

modalInputs.forEach((id) => {
  document.getElementById(id).addEventListener("input", updateDraftFromModal);
  document.getElementById(id).addEventListener("change", updateDraftFromModal);
});

document.getElementById("reverse-direction").addEventListener("click", () => {
  if (!state.modalDraft) return;
  state.modalDraft.arrowDirection = state.modalDraft.arrowDirection === -1 ? 1 : -1;
  if (!state.modalDraft.oneWay) {
    const temp = state.modalDraft.lanesForward;
    state.modalDraft.lanesForward = state.modalDraft.lanesBackward;
    state.modalDraft.lanesBackward = temp;
    document.getElementById("line-forward-lanes").value = state.modalDraft.lanesForward ?? "";
    document.getElementById("line-backward-lanes").value = state.modalDraft.lanesBackward ?? "";
  }
});

document.getElementById("save-line").addEventListener("click", (event) => {
  event.preventDefault();
  saveModalChanges();
});

document.getElementById("edit-geometry").addEventListener("click", () => {
  if (!state.selectedLineId) return;
  toggleEditLine(state.selectedLineId, true);
});

document.getElementById("delete-line").addEventListener("click", () => {
  if (!state.selectedLineId) return;
  deleteLine(state.selectedLineId);
});

document.getElementById("close-modal").addEventListener("click", (event) => {
  event.preventDefault();
  event.stopPropagation();
  closeModalDiscard();
});

function setTool(tool) {
  state.currentTool = tool;
  updateToolButtons();
  hideModal();
}

document.getElementById("tool-line").addEventListener("click", () => setTool("line"));
document.getElementById("tool-light").addEventListener("click", () => setTool("light"));

document.getElementById("export-kmz").addEventListener("click", () => {
  hideModal();
  window.location.href = "/api/export/kmz";
});

document.getElementById("export-geojson").addEventListener("click", () => {
  hideModal();
  window.location.href = "/api/export/geojson";
});

document.getElementById("screenshot").addEventListener("click", () => {
  hideModal();
  const dataUrl = map.getCanvas().toDataURL("image/jpeg");
  const link = document.createElement("a");
  link.href = dataUrl;
  link.download = "openurbanmap.jpg";
  link.click();
});

updateToolButtons();
