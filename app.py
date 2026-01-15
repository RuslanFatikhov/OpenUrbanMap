import io
import json
import os
import zipfile
from datetime import datetime

from dotenv import load_dotenv
from flask import Flask, jsonify, render_template, request, send_file

load_dotenv()

app = Flask(__name__)

DATA_PATH = os.path.join(os.path.dirname(__file__), "data", "store.json")

# Assumption: drawing is only allowed between these zooms.
DRAW_ZOOM_MIN = 14
DRAW_ZOOM_MAX = 20

# Almaty bounding box: [west, south, east, north]
ALMATY_BOUNDS = [76.7, 43.0, 77.2, 43.4]


# Storage format: a single JSON object with "lines" and "trafficLights" arrays.
# Each line includes geometry (LineString), attributes, and a "visible" flag.
def default_data():
    return {
        "lines": [],
        "trafficLights": [],
    }


def load_data():
    if not os.path.exists(DATA_PATH):
        return default_data(), None
    try:
        with open(DATA_PATH, "r", encoding="utf-8") as f:
            return json.load(f), None
    except json.JSONDecodeError as exc:
        return None, f"Corrupted data file: {exc}"


def save_data(payload):
    os.makedirs(os.path.dirname(DATA_PATH), exist_ok=True)
    with open(DATA_PATH, "w", encoding="utf-8") as f:
        json.dump(payload, f, ensure_ascii=False, indent=2)


def kml_escape(value):
    return (
        str(value)
        .replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
    )


def build_kml(data):
    lines = data.get("lines", [])
    lights = data.get("trafficLights", [])

    placemarks = []

    for line in lines:
        props = line.get("properties", {})
        name = props.get("name") or "Без имени"
        coords = line.get("geometry", {}).get("coordinates", [])
        coord_text = " ".join([f"{lng},{lat},0" for lng, lat in coords])
        extended = {
            "totalLanes": props.get("totalLanes"),
            "lanesForward": props.get("lanesForward"),
            "lanesBackward": props.get("lanesBackward"),
            "oneWay": props.get("oneWay"),
            "arrowDirection": props.get("arrowDirection"),
            "busLane": props.get("busLane"),
            "visible": line.get("visible", True),
        }
        extended_xml = "".join(
            f"<Data name=\"{k}\"><value>{kml_escape(v)}</value></Data>"
            for k, v in extended.items()
        )
        placemarks.append(
            """
            <Placemark>
              <name>{name}</name>
              <ExtendedData>{extended}</ExtendedData>
              <LineString>
                <tessellate>1</tessellate>
                <coordinates>{coords}</coordinates>
              </LineString>
            </Placemark>
            """.format(
                name=kml_escape(name),
                extended=extended_xml,
                coords=coord_text,
            )
        )

    for idx, light in enumerate(lights, start=1):
        coords = light.get("geometry", {}).get("coordinates", [0, 0])
        name = f"Traffic light {idx}"
        placemarks.append(
            """
            <Placemark>
              <name>{name}</name>
              <Point>
                <coordinates>{lng},{lat},0</coordinates>
              </Point>
            </Placemark>
            """.format(
                name=kml_escape(name),
                lng=coords[0],
                lat=coords[1],
            )
        )

    return """<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <name>OpenUrbanMap Export</name>
    {placemarks}
  </Document>
</kml>
""".format(
        placemarks="\n".join(placemarks)
    )


@app.route("/")
def index():
    return render_template(
        "index.html",
        mapbox_token=os.getenv("MAPBOX_TOKEN", ""),
        draw_zoom_min=DRAW_ZOOM_MIN,
        draw_zoom_max=DRAW_ZOOM_MAX,
        bounds=ALMATY_BOUNDS,
    )


@app.route("/api/data", methods=["GET"])
def get_data():
    data, error = load_data()
    if error:
        return jsonify({"ok": False, "error": error}), 200
    return jsonify({"ok": True, "data": data})


@app.route("/api/data", methods=["POST"])
def post_data():
    payload = request.get_json(silent=True)
    if payload is None:
        return jsonify({"ok": False, "error": "Invalid JSON"}), 400
    save_data(payload)
    return jsonify({"ok": True})


@app.route("/api/export/kmz", methods=["GET"])
def export_kmz():
    data, error = load_data()
    if error:
        return jsonify({"ok": False, "error": error}), 400
    kml = build_kml(data)
    mem = io.BytesIO()
    with zipfile.ZipFile(mem, "w", zipfile.ZIP_DEFLATED) as zf:
        zf.writestr("doc.kml", kml)
    mem.seek(0)
    filename = "openurbanmap_{}.kmz".format(datetime.utcnow().strftime("%Y%m%d_%H%M%S"))
    return send_file(
        mem,
        mimetype="application/vnd.google-earth.kmz",
        as_attachment=True,
        download_name=filename,
    )


@app.route("/api/export/geojson", methods=["GET"])
def export_geojson():
    data, error = load_data()
    if error:
        return jsonify({"ok": False, "error": error}), 400

    features = []
    for line in data.get("lines", []):
        features.append(
            {
                "type": "Feature",
                "geometry": line.get("geometry"),
                "properties": {"featureType": "line", **line.get("properties", {})},
            }
        )
    for light in data.get("trafficLights", []):
        features.append(
            {
                "type": "Feature",
                "geometry": light.get("geometry"),
                "properties": {"featureType": "trafficLight"},
            }
        )

    return jsonify({"type": "FeatureCollection", "features": features})


if __name__ == "__main__":
    app.run(debug=True)
