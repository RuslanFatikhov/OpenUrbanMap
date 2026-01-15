function openModalForLine(lineId) {
  const modal = document.getElementById("line-modal");
  const line = state.data.lines.find((item) => item.id === lineId);
  if (!line) {
    return;
  }
  state.selectedLineId = lineId;
  state.modalDraft = {
    name: line.properties.name || "",
    totalLanes: line.properties.totalLanes ?? null,
    lanesForward: line.properties.lanesForward ?? null,
    lanesBackward: line.properties.lanesBackward ?? null,
    oneWay: !!line.properties.oneWay,
    arrowDirection: line.properties.arrowDirection ?? 1,
    originalArrowDirection: line.properties.arrowDirection ?? 1,
    busLane: line.properties.busLane || "none",
  };
  syncModalFields();
  modal.classList.add("is-open");
}

function hideModal() {
  state.modalDraft = null;
  document.getElementById("line-modal").classList.remove("is-open");
}

function closeModalDiscard() {
  if (state.modalDraft && state.selectedLineId) {
    const line = state.data.lines.find((item) => item.id === state.selectedLineId);
    if (line) {
      line.properties.arrowDirection = state.modalDraft.originalArrowDirection;
      refreshSources();
      if (typeof ArrowCanvasOverlay !== "undefined") {
        ArrowCanvasOverlay.redraw();
      }
    }
  }
  hideModal();
}

function clearSelection() {
  closeModalDiscard();
  state.selectedLineId = null;
  state.editingLineId = null;
  if (map.getLayer("line-selected")) {
    map.setFilter("line-selected", ["all", ["==", ["get", "visible"], true], ["==", ["get", "id"], ""]]);
  }
}

function numberValue(id) {
  const value = document.getElementById(id).value;
  return value === "" ? null : Number(value);
}

function syncModalFields() {
  if (!state.modalDraft) return;
  document.getElementById("line-name").value = state.modalDraft.name;
  document.getElementById("line-total-lanes").value = state.modalDraft.totalLanes ?? "";
  document.getElementById("line-forward-lanes").value = state.modalDraft.lanesForward ?? "";
  document.getElementById("line-backward-lanes").value = state.modalDraft.lanesBackward ?? "";
  document.getElementById("line-oneway").checked = !!state.modalDraft.oneWay;
  document.getElementById("line-backward-lanes").disabled = !!state.modalDraft.oneWay;
  const busLaneSelect = document.getElementById("line-bus-lane");
  if (busLaneSelect) {
    busLaneSelect.value = state.modalDraft.busLane || "none";
  }
}

function updateDraftFromModal() {
  if (!state.modalDraft) return;
  state.modalDraft.name = document.getElementById("line-name").value.trim();
  state.modalDraft.totalLanes = numberValue("line-total-lanes");
  state.modalDraft.lanesForward = numberValue("line-forward-lanes");
  state.modalDraft.lanesBackward = numberValue("line-backward-lanes");
  const onewayChecked = document.getElementById("line-oneway").checked;
  state.modalDraft.oneWay = onewayChecked;
  const busLaneSelect = document.getElementById("line-bus-lane");
  if (busLaneSelect) {
    state.modalDraft.busLane = busLaneSelect.value;
  }
  if (onewayChecked) {
    state.modalDraft.lanesBackward = 0;
    document.getElementById("line-backward-lanes").value = "0";
  }
  document.getElementById("line-backward-lanes").disabled = onewayChecked;
}

function saveModalChanges() {
  const line = state.data.lines.find((item) => item.id === state.selectedLineId);
  if (!line || !state.modalDraft) {
    hideModal();
    return;
  }
  line.properties.name = state.modalDraft.name;
  line.properties.totalLanes = state.modalDraft.totalLanes;
  line.properties.lanesForward = state.modalDraft.lanesForward;
  line.properties.lanesBackward = state.modalDraft.oneWay ? 0 : state.modalDraft.lanesBackward;
  line.properties.oneWay = state.modalDraft.oneWay;
  line.properties.arrowDirection = state.modalDraft.arrowDirection;
  line.properties.busLane = state.modalDraft.busLane;
  refreshSources();
  persistData();
  refreshLists();
  hideModal();
}

const modalCloseButton = document.getElementById("close-modal");
if (modalCloseButton) {
  modalCloseButton.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    closeModalDiscard();
  });
}
