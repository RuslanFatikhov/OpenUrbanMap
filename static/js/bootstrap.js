/* global mapboxgl */

const config = window.APP_CONFIG;

mapboxgl.accessToken = config.MAPBOX_TOKEN;

const state = {
  data: { lines: [], trafficLights: [] },
  currentTool: "line",
  drawing: { active: false, points: [] },
  selectedLineId: null,
  editingLineId: null,
  draggingVertex: null,
  draggingLightId: null,
  roadLayerIds: [],
  loadError: null,
  modalDraft: null,
};

const bounds = config.BOUNDS;
const zoomMin = config.DRAW_ZOOM_MIN;
const zoomMax = config.DRAW_ZOOM_MAX;

const map = new mapboxgl.Map({
  container: "map",
  style: "mapbox://styles/mapbox/streets-v11",
  center: [76.95, 43.25],
  zoom: 12.5,
  maxBounds: [
    [bounds[0], bounds[1]],
    [bounds[2], bounds[3]],
  ],
});

map.addControl(new mapboxgl.NavigationControl({ showCompass: false }));

const messageEl = document.getElementById("message");

function showMessage(text) {
  messageEl.textContent = text;
  messageEl.classList.remove("is-hidden");
  clearTimeout(showMessage._timeout);
  showMessage._timeout = setTimeout(() => {
    messageEl.classList.add("is-hidden");
  }, 2500);
}

function isWithinBounds(lngLat) {
  return (
    lngLat.lng >= bounds[0] &&
    lngLat.lng <= bounds[2] &&
    lngLat.lat >= bounds[1] &&
    lngLat.lat <= bounds[3]
  );
}

function isZoomAllowed() {
  const zoom = map.getZoom();
  return zoom >= zoomMin && zoom <= zoomMax;
}

function updateToolButtons() {
  document.getElementById("tool-line").classList.toggle("active", state.currentTool === "line");
  document.getElementById("tool-light").classList.toggle("active", state.currentTool === "light");
}
