/* global map */


/* line color */
const ROUTE_STYLE = {
  lineColor: "#1F6AE1",


  /* line color */
  lineWidth: 6,

  /* arrow color */
  arrowColor: "#FFFFFF",

  /* line color */
  arrowStrokeColor: "#1F6AE1",
  arrowSize: 8,
  arrowSpacing: 48,
};

const ArrowCanvasOverlay = (() => {
  let canvas = null;
  let ctx = null;
  let mapContainer = null;
  let lastSize = { w: 0, h: 0, ratio: 1 };
  let getPolylines = null;
  let rafId = null;

  function init(options = {}) {
    if (!map) return;
    getPolylines = options.getPolylines || defaultGetPolylines;
    mapContainer = getMapContainer();
    if (!mapContainer) return;

    canvas = document.createElement("canvas");
    canvas.style.position = "absolute";
    canvas.style.top = "0";
    canvas.style.left = "0";
    canvas.style.pointerEvents = "none";
    canvas.style.zIndex = "10";
    if (window.getComputedStyle(mapContainer).position === "static") {
      mapContainer.style.position = "relative";
    }
    mapContainer.appendChild(canvas);

    ctx = canvas.getContext("2d");
    resize();
    bindMapEvents();
    scheduleRedraw();
  }

  function getMapContainer() {
    if (map.getContainer) return map.getContainer();
    if (map._container) return map._container;
    return null;
  }

  function bindMapEvents() {
    const redrawEvents = ["move", "zoom", "resize"];
    redrawEvents.forEach((evt) => {
      if (map.on) map.on(evt, scheduleRedraw);
    });
  }

  function resize() {
    if (!mapContainer || !canvas) return;
    const rect = mapContainer.getBoundingClientRect();
    const w = Math.round(rect.width);
    const h = Math.round(rect.height);
    const ratio = window.devicePixelRatio || 1;
    if (w === lastSize.w && h === lastSize.h && ratio === lastSize.ratio) return;
    lastSize = { w, h, ratio };
    canvas.width = Math.max(1, Math.round(w * ratio));
    canvas.height = Math.max(1, Math.round(h * ratio));
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  }

  function scheduleRedraw() {
    if (rafId !== null) return;
    rafId = requestAnimationFrame(() => {
      rafId = null;
      redraw();
    });
  }

  function projectLatLngToPoint(lat, lng) {
    if (map.project) {
      const pt = map.project({ lng, lat });
      return { x: pt.x, y: pt.y };
    }
    if (map.latLngToContainerPoint) {
      const pt = map.latLngToContainerPoint([lat, lng]);
      return { x: pt.x, y: pt.y };
    }
    return { x: 0, y: 0 };
  }

  function drawArrow(ctx, x, y, angle) {
    const size = ROUTE_STYLE.arrowSize;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle + Math.PI / 2);
    ctx.fillStyle = ROUTE_STYLE.arrowColor;
    ctx.beginPath();
    ctx.moveTo(0, -size);
    ctx.lineTo(size * 0.7, size);
    ctx.lineTo(-size * 0.7, size);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = ROUTE_STYLE.arrowStrokeColor;
    ctx.lineWidth = Math.max(1, size * 0.15);
    ctx.stroke();
    ctx.restore();
  }

  function drawArrowsAlongPolyline(ctx, points) {
    if (!points || points.length < 2) return;

    const projected = points.map((pt) => projectLatLngToPoint(pt.lat, pt.lng));
    let distanceRemainder = 0;

    for (let i = 0; i < projected.length - 1; i += 1) {
      const p0 = projected[i];
      const p1 = projected[i + 1];
      const dx = p1.x - p0.x;
      const dy = p1.y - p0.y;
      const segLen = Math.hypot(dx, dy);
      if (segLen === 0) continue;

      const angle = Math.atan2(dy, dx);
      let segPos = ROUTE_STYLE.arrowSpacing - distanceRemainder;

      while (segPos <= segLen) {
        const t = segPos / segLen;
        const x = p0.x + dx * t;
        const y = p0.y + dy * t;
        drawArrow(ctx, x, y, angle);
        segPos += ROUTE_STYLE.arrowSpacing;
      }

      const overshoot = segPos - segLen;
      distanceRemainder = overshoot % ROUTE_STYLE.arrowSpacing;
    }
  }

  function redraw() {
    if (!ctx || !canvas) return;
    resize();
    if (lastSize.w === 0 || lastSize.h === 0) return;
    ctx.clearRect(0, 0, lastSize.w, lastSize.h);

    const polylines = getPolylines();
    polylines.forEach((polyline) => {
      drawArrowsAlongPolyline(ctx, polyline);
    });

  }

  function defaultGetPolylines() {
    if (!window.state || !state.data || !state.data.lines) return [];
    return state.data.lines.map((line) =>
      line.geometry.coordinates.map((coord) => ({
        lng: coord[0],
        lat: coord[1],
      }))
    );
  }

  return {
    init,
    redraw: scheduleRedraw,
    projectLatLngToPoint,
    drawArrow,
    drawArrowsAlongPolyline,
  };
})();

ArrowCanvasOverlay.init({
  getPolylines: () => {
    if (!window.state || !state.data || !state.data.lines) return [];
    return state.data.lines
      .filter((line) => line.visible !== false)
      .filter((line) => line.properties && line.properties.oneWay)
      .map((line) => {
        const coords = line.geometry.coordinates.slice();
        if (line.properties && line.properties.arrowDirection === -1) {
          coords.reverse();
        }
        return coords.map((coord) => ({
          lng: coord[0],
          lat: coord[1],
        }));
      });
  },
});
