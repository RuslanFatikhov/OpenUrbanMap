function refreshLists() {
  const linesList = document.getElementById("lines-list");
  const lightsList = document.getElementById("lights-list");

  linesList.innerHTML = "";
  lightsList.innerHTML = "";

  state.data.lines.forEach((line, idx) => {
    const item = document.createElement("div");
    item.className = "layer-item";
    const name = line.properties.name || `Line ${idx + 1}`;
    item.innerHTML = `<div class="layer-item-title">${name}</div>`;
    item.addEventListener("click", () => {
      state.editingLineId = null;
      map.setFilter("line-selected", ["all", ["==", ["get", "visible"], true], ["==", ["get", "id"], line.id]]);
      openModalForLine(line.id);
      refreshSources();
    });

    const actions = document.createElement("div");
    actions.className = "layer-actions";
    actions.appendChild(actionButton("Edit", "/static/icon/pen.svg", () => {
      map.setFilter("line-selected", ["all", ["==", ["get", "visible"], true], ["==", ["get", "id"], line.id]]);
      openModalForLine(line.id);
      toggleEditLine(line.id, true);
    }));
    const visibilityIcon = line.visible === false ? "/static/icon/close.svg" : "/static/icon/open.svg";
    actions.appendChild(actionButton("Hide", visibilityIcon, () => {
      line.visible = line.visible === false ? true : false;
      refreshSources();
      persistData();
      refreshLists();
    }));
    actions.appendChild(actionButton("Delete", "/static/icon/trash.svg", () => {
      deleteLine(line.id);
    }));

    item.appendChild(actions);
    linesList.appendChild(item);
  });

  state.data.trafficLights.forEach((light, idx) => {
    const item = document.createElement("div");
    item.className = "layer-item";
    item.innerHTML = `<div class="layer-item-title">Traffic light ${idx + 1}</div>`;

    const actions = document.createElement("div");
    actions.className = "layer-actions";
    const lightVisibilityIcon = light.visible === false ? "/static/icon/close.svg" : "/static/icon/open.svg";
    actions.appendChild(actionButton("Hide", lightVisibilityIcon, () => {
      light.visible = light.visible === false ? true : false;
      refreshSources();
      persistData();
      refreshLists();
    }));
    actions.appendChild(actionButton("Delete", "/static/icon/trash.svg", () => {
      deleteLight(light.id);
    }));

    item.appendChild(actions);
    lightsList.appendChild(item);
  });
}

function actionButton(text, iconPath, handler) {
  const btn = document.createElement("button");
  btn.className = "tool-button";
  btn.setAttribute("aria-label", text);
  const img = document.createElement("img");
  img.src = iconPath;
  img.alt = "";
  img.className = "tool-icon";
  btn.appendChild(img);
  btn.addEventListener("click", (event) => {
    event.stopPropagation();
    handler();
  });
  return btn;
}
