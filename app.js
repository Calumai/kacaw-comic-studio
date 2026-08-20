(function () {
  "use strict";

  const C = window.AnchorCore;
  const $ = (selector) => document.querySelector(selector);
  const $$ = (selector) => Array.from(document.querySelectorAll(selector));

  const els = {
    app: $("#app"),
    imageInput: $("#imageInput"),
    screenInput: $("#screenInput"),
    projectInput: $("#projectInput"),
    openImageButton: $("#openImageButton"),
    screenButton: $("#screenButton"),
    screenToggleButton: $("#screenToggleButton"),
    emptyOpenButton: $("#emptyOpenButton"),
    undoButton: $("#undoButton"),
    redoButton: $("#redoButton"),
    fitButton: $("#fitButton"),
    actualButton: $("#actualButton"),
    zoomOutput: $("#zoomOutput"),
    exportMenuButton: $("#exportMenuButton"),
    exportMenu: $("#exportMenu"),
    deleteButton: $("#deleteButton"),
    stagePanel: $("#stagePanel"),
    canvas: $("#stageCanvas"),
    emptyState: $("#emptyState"),
    dropOverlay: $("#dropOverlay"),
    toastRegion: $("#toastRegion"),
    annotationCount: $("#annotationCount"),
    clearAllButton: $("#clearAllButton"),
    annotationList: $("#annotationList"),
    inspector: $("#inspector"),
    selectedBadge: $("#selectedBadge"),
    selectedType: $("#selectedType"),
    copySelectedButton: $("#copySelectedButton"),
    operationInput: $("#operationInput"),
    noteInput: $("#noteInput"),
    arrowMeaningField: $("#arrowMeaningField"),
    arrowMeaningInput: $("#arrowMeaningInput"),
    geometryFields: $("#geometryFields"),
    copyCoordinatesButton: $("#copyCoordinatesButton"),
    normalizedOutput: $("#normalizedOutput"),
    globalRulesInput: $("#globalRulesInput"),
    promptOutput: $("#promptOutput"),
    copyAllButton: $("#copyAllButton"),
    downloadJsonButton: $("#downloadJsonButton"),
    importJsonButton: $("#importJsonButton"),
    imageStatusDot: $("#imageStatusDot"),
    imageStatus: $("#imageStatus"),
    cursorOutput: $("#cursorOutput"),
    statusZoom: $("#statusZoom"),
    confirmDialog: $("#confirmDialog"),
    dialogTitle: $("#dialogTitle"),
    dialogMessage: $("#dialogMessage"),
  };

  const ctx = els.canvas.getContext("2d");
  const overlayColors = ["#ffb11b", "#6ad3d0", "#ff6b5d", "#ad8cff", "#77d56a"];
  let doc = null;
  let image = null;
  let imageDataUrl = "";
  let screenOverlay = null;
  let history = new C.History(null, 80);
  let selectedId = null;
  let hoveredId = null;
  let activeTool = "select";
  let view = { scale: 1, panX: 0, panY: 0 };
  let interaction = null;
  let draft = null;
  let pointerWorld = null;
  let spacePressed = false;
  let dragDepth = 0;
  let resizeObserver = null;
  let saveTimer = null;

  function toast(message, kind = "info") {
    const item = document.createElement("div");
    item.className = `toast${kind === "error" ? " is-error" : ""}`;
    item.textContent = message;
    els.toastRegion.appendChild(item);
    window.setTimeout(() => item.remove(), 2800);
  }

  function setDisabledState() {
    const ready = Boolean(doc && image);
    els.fitButton.disabled = !ready;
    els.actualButton.disabled = !ready;
    els.exportMenuButton.disabled = !ready;
    els.screenButton.disabled = !ready || !selectedAnnotation() || selectedAnnotation().type !== "rect";
    els.screenToggleButton.disabled = !ready || !screenOverlay;
    els.screenToggleButton.hidden = !screenOverlay;
    els.screenToggleButton.textContent = screenOverlay?.visible ? "顯示漫畫" : "顯示真實畫面";
    els.copyAllButton.disabled = !ready || doc.annotations.length === 0;
    els.downloadJsonButton.disabled = !ready;
    els.deleteButton.disabled = !ready || !selectedId;
    els.clearAllButton.disabled = !ready || doc.annotations.length === 0;
    els.undoButton.disabled = !history.canUndo();
    els.redoButton.disabled = !history.canRedo();
  }

  function selectedAnnotation() {
    return doc?.annotations.find((item) => item.id === selectedId) || null;
  }

  function markChanged(nextDoc, options = {}) {
    nextDoc.updatedAt = new Date().toISOString();
    doc = C.deepClone(nextDoc);
    if (options.history !== false) history.push(doc);
    renderAll();
    scheduleSave();
  }

  function scheduleSave() {
    window.clearTimeout(saveTimer);
    saveTimer = window.setTimeout(() => {
      if (!doc) return;
      try {
        localStorage.setItem("image-coordinate-workbench:last-document", JSON.stringify(doc));
      } catch (_) {
        // Local storage is a convenience only. Large images are never stored here.
      }
    }, 180);
  }

  function canvasMetrics() {
    const rect = els.canvas.getBoundingClientRect();
    return { rect, width: rect.width, height: rect.height };
  }

  function resizeCanvas() {
    const { width, height } = canvasMetrics();
    const dpr = window.devicePixelRatio || 1;
    const targetWidth = Math.max(1, Math.round(width * dpr));
    const targetHeight = Math.max(1, Math.round(height * dpr));
    if (els.canvas.width !== targetWidth || els.canvas.height !== targetHeight) {
      els.canvas.width = targetWidth;
      els.canvas.height = targetHeight;
    }
    draw();
  }

  function drawCheckerboard(context, x, y, width, height, scale) {
    const size = Math.max(6, 12 * scale);
    context.save();
    context.beginPath();
    context.rect(x, y, width, height);
    context.clip();
    for (let py = y; py < y + height; py += size) {
      for (let px = x; px < x + width; px += size) {
        const odd = (Math.floor((px - x) / size) + Math.floor((py - y) / size)) % 2;
        context.fillStyle = odd ? "#cdd2d0" : "#f4f5f4";
        context.fillRect(px, py, size, size);
      }
    }
    context.restore();
  }

  function draw() {
    const { width, height } = canvasMetrics();
    const dpr = window.devicePixelRatio || 1;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);
    if (!doc || !image) return;

    const ix = view.panX;
    const iy = view.panY;
    const iw = doc.image.width * view.scale;
    const ih = doc.image.height * view.scale;
    drawCheckerboard(ctx, ix, iy, iw, ih, view.scale);
    ctx.drawImage(image, ix, iy, iw, ih);
    if (screenOverlay?.visible && screenOverlay.image && screenOverlay.targetId) {
      const target = doc.annotations.find((item) => item.id === screenOverlay.targetId && item.type === "rect");
      if (target) {
        const g = target.geometry;
        ctx.save();
        ctx.beginPath();
        ctx.rect(ix + g.x * view.scale, iy + g.y * view.scale, g.width * view.scale, g.height * view.scale);
        ctx.clip();
        ctx.drawImage(screenOverlay.image, ix + g.x * view.scale, iy + g.y * view.scale, g.width * view.scale, g.height * view.scale);
        ctx.restore();
      }
    }
    ctx.save();
    ctx.strokeStyle = "rgb(255 255 255 / 0.36)";
    ctx.lineWidth = 1;
    ctx.strokeRect(ix - 0.5, iy - 0.5, iw + 1, ih + 1);
    ctx.restore();

    const annotations = [...doc.annotations];
    if (draft) annotations.push(draft);
    annotations.forEach((annotation) => drawAnnotation(ctx, annotation, {
      selected: annotation.id === selectedId && annotation !== draft,
      hovered: annotation.id === hoveredId,
      draft: annotation === draft,
    }));
  }

  function annotationLabelPosition(annotation, gapInWorldPixels = 26 / view.scale) {
    const bounds = C.annotationBounds(annotation);
    return { x: bounds.x, y: Math.max(0, bounds.y - gapInWorldPixels) };
  }

  function drawAnnotation(context, annotation, state = {}, exportScale = null) {
    const useView = exportScale === null;
    const scale = useView ? view.scale : exportScale;
    const offsetX = useView ? view.panX : 0;
    const offsetY = useView ? view.panY : 0;
    const toX = (value) => value * scale + offsetX;
    const toY = (value) => value * scale + offsetY;
    const color = annotation.color || "#ffb11b";
    const exportUiScale = useView
      ? 1
      : Math.max(1, Math.min(doc.image.width, doc.image.height) / 700);
    const lineWidth = (state.selected ? 3 : 2) * exportUiScale;
    const g = annotation.geometry;
    context.save();
    context.lineJoin = "round";
    context.lineCap = "round";
    context.strokeStyle = color;
    context.fillStyle = color;
    context.lineWidth = lineWidth;
    if (state.hovered) {
      context.shadowColor = color;
      context.shadowBlur = 10;
    }

    if (annotation.type === "point") {
      const x = toX(g.x);
      const y = toY(g.y);
      const radius = (state.selected ? 10 : 8) * exportUiScale;
      context.beginPath();
      context.arc(x, y, radius, 0, Math.PI * 2);
      context.stroke();
      context.beginPath();
      context.moveTo(x - 15 * exportUiScale, y);
      context.lineTo(x + 15 * exportUiScale, y);
      context.moveTo(x, y - 15 * exportUiScale);
      context.lineTo(x, y + 15 * exportUiScale);
      context.stroke();
    } else if (annotation.type === "rect") {
      const x = toX(g.x);
      const y = toY(g.y);
      const width = g.width * scale;
      const height = g.height * scale;
      context.fillStyle = `${color}22`;
      context.fillRect(x, y, width, height);
      context.strokeStyle = color;
      context.setLineDash(state.draft ? [8, 5] : []);
      context.strokeRect(x, y, width, height);
      if (state.selected && useView) drawRectHandles(context, annotation);
    } else if (annotation.type === "arrow") {
      drawArrow(context, toX(g.x1), toY(g.y1), toX(g.x2), toY(g.y2), color, lineWidth);
      if (state.selected && useView) {
        drawHandle(context, toX(g.x1), toY(g.y1), color);
        drawHandle(context, toX(g.x2), toY(g.y2), color);
      }
    }

    const labelGap = useView ? 26 / view.scale : 26 * exportUiScale;
    const lp = annotationLabelPosition(annotation, labelGap);
    drawBadge(
      context,
      annotation.id,
      toX(lp.x),
      toY(lp.y),
      color,
      useView ? 1 : exportUiScale,
      {
        x: offsetX,
        y: offsetY,
        width: doc.image.width * scale,
        height: doc.image.height * scale,
      },
    );
    context.restore();
  }

  function drawArrow(context, x1, y1, x2, y2, color, width) {
    const angle = Math.atan2(y2 - y1, x2 - x1);
    const head = width * 8.5;
    context.strokeStyle = color;
    context.fillStyle = color;
    context.lineWidth = width;
    context.beginPath();
    context.moveTo(x1, y1);
    context.lineTo(x2, y2);
    context.stroke();
    context.beginPath();
    context.moveTo(x2, y2);
    context.lineTo(x2 - head * Math.cos(angle - Math.PI / 6), y2 - head * Math.sin(angle - Math.PI / 6));
    context.lineTo(x2 - head * Math.cos(angle + Math.PI / 6), y2 - head * Math.sin(angle + Math.PI / 6));
    context.closePath();
    context.fill();
  }

  function drawBadge(context, text, x, y, color, scale = 1, bounds = null) {
    const fontSize = Math.max(12, 12 * scale);
    context.font = `800 ${fontSize}px ui-monospace, monospace`;
    const paddingX = 6 * scale;
    const height = 22 * scale;
    const width = context.measureText(text).width + paddingX * 2;
    if (bounds) {
      x = C.clamp(x, bounds.x, Math.max(bounds.x, bounds.x + bounds.width - width));
      y = C.clamp(y, bounds.y, Math.max(bounds.y, bounds.y + bounds.height - height));
    }
    context.fillStyle = color;
    context.beginPath();
    context.roundRect(x, y, width, height, 4 * scale);
    context.fill();
    context.fillStyle = "#1e1607";
    context.textBaseline = "middle";
    context.fillText(text, x + paddingX, y + height / 2);
  }

  function rectHandlePoints(annotation) {
    const g = annotation.geometry;
    const left = g.x;
    const top = g.y;
    const right = g.x + g.width;
    const bottom = g.y + g.height;
    const midX = (left + right) / 2;
    const midY = (top + bottom) / 2;
    return [
      ["nw", left, top], ["n", midX, top], ["ne", right, top],
      ["e", right, midY], ["se", right, bottom], ["s", midX, bottom],
      ["sw", left, bottom], ["w", left, midY],
    ];
  }

  function drawRectHandles(context, annotation) {
    rectHandlePoints(annotation).forEach(([, x, y]) => {
      const point = C.worldToScreen({ x, y }, view);
      drawHandle(context, point.x, point.y, annotation.color);
    });
  }

  function drawHandle(context, x, y, color) {
    context.save();
    context.fillStyle = "#f7faf7";
    context.strokeStyle = color;
    context.lineWidth = 2;
    context.beginPath();
    context.rect(x - 5, y - 5, 10, 10);
    context.fill();
    context.stroke();
    context.restore();
  }

  function screenPoint(event) {
    const rect = els.canvas.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  }

  function eventWorldPoint(event, clampToImage = false) {
    const world = C.screenToWorld(screenPoint(event), view);
    return clampToImage && doc ? C.clampPoint(world, doc.image) : world;
  }

  function pointInsideImage(point) {
    return doc && point.x >= 0 && point.y >= 0 && point.x < doc.image.width && point.y < doc.image.height;
  }

  function distanceToSegment(point, a, b) {
    const vx = b.x - a.x;
    const vy = b.y - a.y;
    const length2 = vx * vx + vy * vy;
    if (!length2) return Math.hypot(point.x - a.x, point.y - a.y);
    const t = C.clamp(((point.x - a.x) * vx + (point.y - a.y) * vy) / length2, 0, 1);
    return Math.hypot(point.x - (a.x + t * vx), point.y - (a.y + t * vy));
  }

  function hitTest(world, selectedFirst = true) {
    if (!doc) return null;
    const tolerance = 9 / view.scale;
    const annotations = [...doc.annotations].reverse();
    if (selectedFirst && selectedId) {
      const selected = annotations.find((item) => item.id === selectedId);
      if (selected) {
        const handle = hitHandle(world, selected, tolerance);
        if (handle) return { annotation: selected, part: handle };
      }
    }
    for (const annotation of annotations) {
      const g = annotation.geometry;
      if (annotation.type === "point") {
        if (Math.hypot(world.x - g.x, world.y - g.y) <= tolerance * 1.5) return { annotation, part: "body" };
      } else if (annotation.type === "rect") {
        if (world.x >= g.x - tolerance && world.x <= g.x + g.width + tolerance && world.y >= g.y - tolerance && world.y <= g.y + g.height + tolerance) {
          return { annotation, part: "body" };
        }
      } else if (annotation.type === "arrow") {
        if (Math.hypot(world.x - g.x1, world.y - g.y1) <= tolerance * 1.5) return { annotation, part: "start" };
        if (Math.hypot(world.x - g.x2, world.y - g.y2) <= tolerance * 1.5) return { annotation, part: "end" };
        if (distanceToSegment(world, { x: g.x1, y: g.y1 }, { x: g.x2, y: g.y2 }) <= tolerance) return { annotation, part: "body" };
      }
    }
    return null;
  }

  function hitHandle(world, annotation, tolerance) {
    if (annotation.type === "rect") {
      for (const [name, x, y] of rectHandlePoints(annotation)) {
        if (Math.hypot(world.x - x, world.y - y) <= tolerance) return `handle:${name}`;
      }
    }
    if (annotation.type === "arrow") {
      const g = annotation.geometry;
      if (Math.hypot(world.x - g.x1, world.y - g.y1) <= tolerance) return "start";
      if (Math.hypot(world.x - g.x2, world.y - g.y2) <= tolerance) return "end";
    }
    return null;
  }

  function setTool(tool) {
    activeTool = tool;
    els.app.dataset.tool = tool;
    $$(".tool-button[data-tool]").forEach((button) => {
      const active = button.dataset.tool === tool;
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-pressed", String(active));
    });
    els.canvas.style.cursor = tool === "pan" ? "grab" : tool === "select" ? "default" : "crosshair";
    els.canvas.focus({ preventScroll: true });
  }

  function newAnnotation(type, geometry) {
    const id = C.nextAnnotationId(doc);
    return {
      id,
      type,
      operation: type === "rect" ? "remove_inpaint" : "modify",
      note: "",
      color: overlayColors[(doc.nextAnnotationNumber - 1) % overlayColors.length],
      arrowMeaning: "target",
      geometry,
    };
  }

  function addAnnotation(annotation) {
    const next = C.deepClone(doc);
    next.annotations.push(C.clampAnnotation(annotation, next.image));
    next.nextAnnotationNumber += 1;
    selectedId = annotation.id;
    markChanged(next);
    window.setTimeout(() => els.noteInput.focus(), 0);
  }

  function pointerDown(event) {
    if (!doc || !image) return;
    els.canvas.setPointerCapture?.(event.pointerId);
    const screen = screenPoint(event);
    const world = eventWorldPoint(event, true);
    const navigation = activeTool === "pan" || spacePressed || event.button === 1;
    if (navigation) {
      interaction = { kind: "pan", startScreen: screen, startView: { ...view } };
      els.canvas.style.cursor = "grabbing";
      event.preventDefault();
      return;
    }
    if (!pointInsideImage(eventWorldPoint(event, false))) return;

    if (activeTool === "point") {
      addAnnotation(newAnnotation("point", { x: Math.round(world.x), y: Math.round(world.y) }));
      return;
    }
    if (activeTool === "rect" || activeTool === "arrow") {
      interaction = { kind: `create-${activeTool}`, startWorld: world };
      draft = activeTool === "rect"
        ? newAnnotation("rect", { x: world.x, y: world.y, width: 0, height: 0 })
        : newAnnotation("arrow", { x1: world.x, y1: world.y, x2: world.x, y2: world.y });
      draw();
      return;
    }
    if (activeTool === "select") {
      const hit = hitTest(world);
      if (!hit) {
        selectedId = null;
        renderAll();
        return;
      }
      selectedId = hit.annotation.id;
      interaction = {
        kind: hit.part.startsWith("handle:") ? "resize-rect" : hit.part === "start" || hit.part === "end" ? "move-endpoint" : "move",
        part: hit.part,
        startWorld: world,
        original: C.deepClone(hit.annotation),
      };
      renderAll();
    }
  }

  function pointerMove(event) {
    if (!doc || !image) return;
    const screen = screenPoint(event);
    const rawWorld = C.screenToWorld(screen, view);
    pointerWorld = pointInsideImage(rawWorld) ? rawWorld : null;
    updateCursorOutput();
    if (!interaction) {
      const hit = activeTool === "select" && pointerWorld ? hitTest(pointerWorld) : null;
      const nextHover = hit?.annotation.id || null;
      if (nextHover !== hoveredId) {
        hoveredId = nextHover;
        draw();
        renderAnnotationList();
      }
      return;
    }
    event.preventDefault();
    if (interaction.kind === "pan") {
      view.panX = interaction.startView.panX + (screen.x - interaction.startScreen.x);
      view.panY = interaction.startView.panY + (screen.y - interaction.startScreen.y);
      renderZoom();
      draw();
      return;
    }
    const world = interaction.kind === "create-rect" || interaction.kind === "resize-rect"
      ? C.clampExtentPoint(rawWorld, doc.image)
      : C.clampPoint(rawWorld, doc.image);
    if (interaction.kind === "create-rect") {
      draft.geometry = C.normalizeRect(
        interaction.startWorld.x,
        interaction.startWorld.y,
        world.x,
        world.y,
        doc.image.width,
        doc.image.height,
      );
      draw();
      return;
    }
    if (interaction.kind === "create-arrow") {
      draft.geometry.x2 = world.x;
      draft.geometry.y2 = world.y;
      draw();
      return;
    }

    const index = doc.annotations.findIndex((item) => item.id === selectedId);
    if (index < 0) return;
    const next = C.deepClone(doc);
    if (interaction.kind === "move") {
      next.annotations[index] = C.moveAnnotation(
        interaction.original,
        world.x - interaction.startWorld.x,
        world.y - interaction.startWorld.y,
        doc.image,
      );
    } else if (interaction.kind === "resize-rect") {
      next.annotations[index].geometry = C.resizeRectFromHandle(
        interaction.original.geometry,
        interaction.part.replace("handle:", ""),
        world,
        doc.image,
      );
    } else if (interaction.kind === "move-endpoint") {
      if (interaction.part === "start") {
        next.annotations[index].geometry.x1 = world.x;
        next.annotations[index].geometry.y1 = world.y;
      } else {
        next.annotations[index].geometry.x2 = world.x;
        next.annotations[index].geometry.y2 = world.y;
      }
    }
    doc = next;
    renderInspector();
    renderPrompt();
    draw();
  }

  function pointerUp(event) {
    if (!interaction) return;
    const finished = interaction;
    interaction = null;
    els.canvas.style.cursor = activeTool === "pan" ? "grab" : activeTool === "select" ? "default" : "crosshair";
    if (finished.kind === "create-rect" && draft) {
      const annotation = draft;
      draft = null;
      if (annotation.geometry.width < 2 || annotation.geometry.height < 2) {
        toast("框選太小，請改用點位工具。", "error");
        draw();
      } else {
        addAnnotation(annotation);
      }
      return;
    }
    if (finished.kind === "create-arrow" && draft) {
      const annotation = draft;
      draft = null;
      const g = annotation.geometry;
      if (Math.hypot(g.x2 - g.x1, g.y2 - g.y1) < 3) {
        toast("箭頭太短，請重新拖曳。", "error");
        draw();
      } else {
        addAnnotation(annotation);
      }
      return;
    }
    if (["move", "resize-rect", "move-endpoint"].includes(finished.kind)) {
      doc.updatedAt = new Date().toISOString();
      history.push(doc);
      renderAll();
      scheduleSave();
    }
  }

  function wheel(event) {
    if (!doc || !image) return;
    event.preventDefault();
    const factor = Math.exp(-event.deltaY * 0.0015);
    view = C.zoomAtPoint(view, screenPoint(event), view.scale * factor);
    renderZoom();
    draw();
  }

  function fitImage() {
    if (!doc) return;
    const { width, height } = canvasMetrics();
    view = C.fitView(doc.image.width, doc.image.height, width, height, 42);
    renderZoom();
    draw();
  }

  function actualSize() {
    if (!doc) return;
    const { width, height } = canvasMetrics();
    view = { scale: 1, panX: (width - doc.image.width) / 2, panY: (height - doc.image.height) / 2 };
    renderZoom();
    draw();
  }

  function renderZoom() {
    const label = `${Math.round(view.scale * 100)}%`;
    els.zoomOutput.textContent = label;
    els.statusZoom.textContent = label;
  }

  function updateCursorOutput() {
    els.cursorOutput.textContent = pointerWorld
      ? `x ${Math.round(pointerWorld.x)}, y ${Math.round(pointerWorld.y)}`
      : "x -, y -";
  }

  function renderAnnotationList() {
    const count = doc?.annotations.length || 0;
    els.annotationCount.textContent = `${count} 個定位`;
    if (!count) {
      els.annotationList.innerHTML = '<div class="list-empty"><strong>還沒有標註</strong><span>用左側的點位、框選或箭頭開始。</span></div>';
      return;
    }
    els.annotationList.replaceChildren(...doc.annotations.map((annotation) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = `annotation-item${annotation.id === selectedId ? " is-selected" : ""}`;
      if (annotation.id === hoveredId) button.style.background = "#293234";
      const bounds = C.annotationBounds(annotation);
      const coord = annotation.type === "point"
        ? `x ${Math.round(bounds.x)}, y ${Math.round(bounds.y)}`
        : `${Math.round(bounds.width)} × ${Math.round(bounds.height)}`;
      button.innerHTML = `
        <span class="annotation-badge" style="background:${annotation.color}">${annotation.id}</span>
        <span class="annotation-item-copy"><strong>${C.OPERATION_LABELS[annotation.operation] || "修改"}</strong><span>${escapeHtml(annotation.note || "尚未填寫修改說明")}</span></span>
        <code>${coord}</code>`;
      button.addEventListener("click", () => {
        selectedId = annotation.id;
        renderAll();
      });
      button.addEventListener("mouseenter", () => { hoveredId = annotation.id; draw(); });
      button.addEventListener("mouseleave", () => { hoveredId = null; draw(); });
      return button;
    }));
  }

  function escapeHtml(value) {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function geometryConfig(annotation) {
    if (annotation.type === "point") return [["x", "X"], ["y", "Y"]];
    if (annotation.type === "rect") return [["x", "X"], ["y", "Y"], ["width", "W"], ["height", "H"]];
    return [["x1", "X1"], ["y1", "Y1"], ["x2", "X2"], ["y2", "Y2"]];
  }

  function renderInspector() {
    const annotation = selectedAnnotation();
    els.inspector.hidden = !annotation;
    if (!annotation) return;
    els.selectedBadge.textContent = annotation.id;
    els.selectedBadge.style.background = annotation.color;
    els.selectedType.textContent = C.TYPE_LABELS[annotation.type];
    els.operationInput.value = annotation.operation;
    if (document.activeElement !== els.noteInput) els.noteInput.value = annotation.note || "";
    els.arrowMeaningField.hidden = annotation.type !== "arrow";
    els.arrowMeaningInput.value = annotation.arrowMeaning || "target";
    const fieldElements = geometryConfig(annotation).map(([key, label]) => {
      const wrapper = document.createElement("label");
      wrapper.className = "number-field";
      const caption = document.createElement("span");
      caption.textContent = label;
      const input = document.createElement("input");
      input.type = "number";
      input.step = "1";
      input.dataset.geometryKey = key;
      input.value = String(Math.round(annotation.geometry[key]));
      input.addEventListener("change", geometryInputChanged);
      wrapper.append(caption, input);
      return wrapper;
    });
    els.geometryFields.replaceChildren(Object.assign(document.createElement("legend"), { textContent: "原圖像素座標" }), ...fieldElements);
    els.normalizedOutput.textContent = C.geometryLines(annotation, doc.image).slice(-1)[0].replace("Normalized：", "");
  }

  function geometryInputChanged(event) {
    const annotation = selectedAnnotation();
    if (!annotation) return;
    const key = event.target.dataset.geometryKey;
    const value = Number(event.target.value);
    if (!Number.isFinite(value)) {
      event.target.value = String(Math.round(annotation.geometry[key]));
      toast("請輸入有效的數字。", "error");
      return;
    }
    const next = C.deepClone(doc);
    const index = next.annotations.findIndex((item) => item.id === annotation.id);
    const candidate = next.annotations[index];
    candidate.geometry[key] = value;
    const clamped = C.clampAnnotation(candidate, next.image);
    if (clamped.type === "rect" && (clamped.geometry.width < 2 || clamped.geometry.height < 2)) {
      event.target.value = String(Math.round(annotation.geometry[key]));
      toast("矩形寬高至少需要 2 px。", "error");
      return;
    }
    if (clamped.type === "arrow") {
      const g = clamped.geometry;
      if (Math.hypot(g.x2 - g.x1, g.y2 - g.y1) < 3) {
        event.target.value = String(Math.round(annotation.geometry[key]));
        toast("箭頭長度至少需要 3 px。", "error");
        return;
      }
    }
    next.annotations[index] = clamped;
    markChanged(next);
  }

  function cancelInteraction() {
    if (!interaction) {
      draft = null;
      draw();
      return;
    }
    if (["move", "resize-rect", "move-endpoint"].includes(interaction.kind) && interaction.original && doc) {
      const index = doc.annotations.findIndex((item) => item.id === interaction.original.id);
      if (index >= 0) {
        const next = C.deepClone(doc);
        next.annotations[index] = C.deepClone(interaction.original);
        doc = next;
      }
    }
    interaction = null;
    draft = null;
    renderAll();
  }

  function renderPrompt() {
    if (document.activeElement !== els.globalRulesInput) {
      els.globalRulesInput.value = doc?.globalRules || "只修改標註範圍；未標註區域、人物造型、構圖、分鏡框線、配色與畫風保持不變。";
    }
    els.promptOutput.value = doc ? C.documentPrompt(doc) : "載入圖片並建立標註後，這裡會產生可貼給 AI 的工作單。";
  }

  function renderImageStatus() {
    if (!doc) {
      els.imageStatus.textContent = "尚未載入圖片";
      els.imageStatusDot.classList.remove("is-ready");
      return;
    }
    if (!image) {
      els.imageStatus.textContent = `等待原圖 · ${doc.image.width} × ${doc.image.height}px`;
      els.imageStatusDot.classList.remove("is-ready");
      return;
    }
    els.imageStatus.textContent = `${doc.image.fileName} · ${doc.image.width} × ${doc.image.height}px`;
    els.imageStatusDot.classList.add("is-ready");
  }

  function renderAll() {
    els.emptyState.hidden = Boolean(doc && image);
    renderImageStatus();
    renderAnnotationList();
    renderInspector();
    renderPrompt();
    renderZoom();
    setDisabledState();
    draw();
  }

  async function requestConfirmation(title, message) {
    if (!els.confirmDialog.showModal) return window.confirm(`${title}\n\n${message}`);
    els.dialogTitle.textContent = title;
    els.dialogMessage.textContent = message;
    els.confirmDialog.showModal();
    return new Promise((resolve) => {
      const handler = () => {
        els.confirmDialog.removeEventListener("close", handler);
        resolve(els.confirmDialog.returnValue === "confirm");
      };
      els.confirmDialog.addEventListener("close", handler);
    });
  }

  async function loadImageFile(file) {
    if (!file || !["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
      toast("目前僅支援 PNG、JPG、WebP。", "error");
      return;
    }
    const fileHash = await hashFile(file);
    const dataUrl = await readAsDataUrl(file);
    const loaded = await decodeImage(dataUrl);
    const sameSizeAsWaitingDocument = Boolean(
      doc && !image
      && doc.image.width === loaded.naturalWidth
      && doc.image.height === loaded.naturalHeight,
    );
    const matchesWaitingDocument = sameSizeAsWaitingDocument && (
      doc.image.sha256 && fileHash
        ? doc.image.sha256 === fileHash
        : doc.image.fileName === file.name
    );
    if (matchesWaitingDocument) {
      image = loaded;
      imageDataUrl = dataUrl;
      doc.image.fileName = file.name || doc.image.fileName;
      doc.image.mime = file.type || doc.image.mime;
      doc.updatedAt = new Date().toISOString();
      history = new C.History(doc, 80);
      renderAll();
      fitImage();
      scheduleSave();
      toast(`已重新掛載原圖，保留 ${doc.annotations.length} 個定位`);
      return;
    }
    if (sameSizeAsWaitingDocument) {
      const expected = doc.image.fileName || "原圖";
      const confirmed = await requestConfirmation(
        "圖片識別不相符",
        `定位專案原本使用「${expected}」。這張圖尺寸相同但檔案不同，座標可能套錯頁。仍要套用並保留標註嗎？`,
      );
      if (!confirmed) return;
      image = loaded;
      imageDataUrl = dataUrl;
      doc.image.fileName = file.name || doc.image.fileName;
      doc.image.mime = file.type || doc.image.mime;
      doc.image.sha256 = fileHash;
      doc.updatedAt = new Date().toISOString();
      history = new C.History(doc, 80);
      renderAll();
      fitImage();
      scheduleSave();
      toast(`已掛載圖片，保留 ${doc.annotations.length} 個定位`);
      return;
    }
    if (doc?.annotations.length) {
      const mismatch = !image
        ? `這張圖片是 ${loaded.naturalWidth} × ${loaded.naturalHeight}px，與定位專案的 ${doc.image.width} × ${doc.image.height}px 不同。`
        : "目前的標註會被清除。";
      const confirmed = await requestConfirmation("要更換圖片嗎？", `${mismatch} 建議先匯出 JSON。`);
      if (!confirmed) return;
    }
    if (loaded.naturalWidth * loaded.naturalHeight > 100_000_000) {
      toast("圖片超過 1 億像素，為避免瀏覽器凍結，本版不載入。", "error");
      return;
    }
    image = loaded;
    imageDataUrl = dataUrl;
    doc = C.createDocument({
      fileName: file.name || `clipboard-${Date.now()}.png`,
      mime: file.type,
      width: loaded.naturalWidth,
      height: loaded.naturalHeight,
      sha256: fileHash,
    });
    history = new C.History(doc, 80);
    selectedId = null;
    draft = null;
    renderAll();
    fitImage();
    scheduleSave();
    toast(`已載入 ${doc.image.width} × ${doc.image.height}px`);
  }

  function readAsDataUrl(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(new Error("讀取圖片失敗。"));
      reader.readAsDataURL(file);
    });
  }

  function decodeImage(dataUrl) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("圖片損壞或無法解碼。"));
      img.src = dataUrl;
    });
  }

  async function hashFile(file) {
    if (!globalThis.crypto?.subtle) return null;
    const digest = await globalThis.crypto.subtle.digest("SHA-256", await file.arrayBuffer());
    return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
  }

  function deleteSelected() {
    if (!doc || !selectedId) return;
    const next = C.deepClone(doc);
    next.annotations = next.annotations.filter((item) => item.id !== selectedId);
    selectedId = null;
    markChanged(next);
  }

  async function clearAll() {
    if (!doc?.annotations.length) return;
    const confirmed = await requestConfirmation("清除全部標註？", "圖片會保留，但所有座標與說明都會移除。");
    if (!confirmed) return;
    const next = C.deepClone(doc);
    next.annotations = [];
    selectedId = null;
    markChanged(next);
  }

  function undo() {
    const value = history.undo();
    if (value === null) return;
    doc = value;
    if (!doc?.annotations.some((item) => item.id === selectedId)) selectedId = null;
    renderAll();
    scheduleSave();
  }

  function redo() {
    const value = history.redo();
    if (value === null) return;
    doc = value;
    if (!doc?.annotations.some((item) => item.id === selectedId)) selectedId = null;
    renderAll();
    scheduleSave();
  }

  async function copyText(text, successMessage) {
    try {
      if (navigator.clipboard?.writeText && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
      } else {
        const area = document.createElement("textarea");
        area.value = text;
        area.style.position = "fixed";
        area.style.opacity = "0";
        document.body.appendChild(area);
        area.select();
        const copied = document.execCommand("copy");
        area.remove();
        if (!copied) throw new Error("copy command unavailable");
      }
      toast(successMessage);
    } catch (_) {
      switchTab("output");
      els.promptOutput.value = text;
      els.promptOutput.focus();
      els.promptOutput.select();
      toast("瀏覽器未允許自動複製；文字已選取，請按 Ctrl+C。", "error");
    }
  }

  function downloadBlob(blob, fileName) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 2000);
  }

  function baseName() {
    return (doc?.image.fileName || "image").replace(/\.[^.]+$/, "");
  }

  function exportJson() {
    if (!doc) return;
    downloadBlob(new Blob([JSON.stringify(doc, null, 2)], { type: "application/json" }), `${baseName()}-anchors.json`);
    toast("已下載定位 JSON");
  }

  function exportPrompt() {
    if (!doc) return;
    downloadBlob(new Blob([C.documentPrompt(doc)], { type: "text/plain;charset=utf-8" }), `${baseName()}-ai-edit-instructions.txt`);
    toast("已下載 AI 修改指令");
  }

  function exportPng(overlayOnly = false) {
    if (!doc || !image) return;
    const maxPixels = 100_000_000;
    if (doc.image.width * doc.image.height > maxPixels) {
      toast("圖片太大，瀏覽器可能無法匯出完整 PNG。", "error");
      return;
    }
    const out = document.createElement("canvas");
    out.width = doc.image.width;
    out.height = doc.image.height;
    const outCtx = out.getContext("2d");
    if (!overlayOnly) outCtx.drawImage(image, 0, 0, out.width, out.height);
    if (!overlayOnly && screenOverlay?.visible && screenOverlay.image && screenOverlay.targetId) {
      const target = doc.annotations.find((item) => item.id === screenOverlay.targetId && item.type === "rect");
      if (target) {
        const g = target.geometry;
        outCtx.drawImage(screenOverlay.image, g.x, g.y, g.width, g.height);
      }
    }
    doc.annotations.forEach((annotation) => drawAnnotation(outCtx, annotation, {}, 1));
    out.toBlob((blob) => {
      if (!blob) {
        toast("PNG 匯出失敗。", "error");
        return;
      }
      const suffix = overlayOnly ? "anchor-overlay" : screenOverlay?.visible ? "real-screen-composite" : "annotated";
      downloadBlob(blob, `${baseName()}-${suffix}.png`);
      toast(overlayOnly ? "已下載透明標註層" : screenOverlay?.visible ? "已下載漫畫＋真實畫面合成圖" : "已下載帶標註 PNG");
    }, "image/png");
  }

  async function loadScreenFile(file) {
    if (!file || !image || !doc) return;
    const target = selectedAnnotation();
    if (!target || target.type !== "rect") {
      toast("請先選取一個矩形螢幕區域，再載入真實畫面。", "error");
      return;
    }
    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
      toast("真實畫面目前僅支援 PNG、JPG、WebP。", "error");
      return;
    }
    const dataUrl = await readAsDataUrl(file);
    const loaded = await decodeImage(dataUrl);
    screenOverlay = { image: loaded, dataUrl, fileName: file.name, targetId: target.id, visible: true };
    renderAll();
    toast(`已將「${file.name}」套入 ${target.id} 螢幕區域`);
  }

  async function importProject(file) {
    try {
      const raw = JSON.parse(await file.text());
      const imported = C.migrateDocument(raw);
      if (doc?.annotations.length) {
        const confirmed = await requestConfirmation("匯入定位專案？", "目前的標註將由 JSON 內容取代。建議先匯出現有 JSON。");
        if (!confirmed) return;
      }
      const sameSize = Boolean(image && imported.image.width === image.naturalWidth && imported.image.height === image.naturalHeight);
      const sameIdentity = sameSize && (
        imported.image.sha256 && doc?.image?.sha256
          ? imported.image.sha256 === doc.image.sha256
          : imported.image.fileName === doc?.image?.fileName
      );
      if (!sameIdentity) {
        doc = imported;
        history = new C.History(doc, 80);
        selectedId = doc.annotations[0]?.id || null;
        image = null;
        imageDataUrl = "";
        renderAll();
        toast(`已匯入座標，請重新載入原圖「${doc.image.fileName}」（${doc.image.width} × ${doc.image.height}px）。`);
        return;
      }
      doc = imported;
      history = new C.History(doc, 80);
      selectedId = doc.annotations[0]?.id || null;
      renderAll();
      toast("已匯入定位 JSON");
    } catch (error) {
      toast(error.message || "JSON 匯入失敗。", "error");
    }
  }

  function switchTab(name) {
    $$(".tab").forEach((tab) => {
      const active = tab.dataset.tab === name;
      tab.classList.toggle("is-active", active);
      tab.setAttribute("aria-selected", String(active));
    });
    $("#annotationsPanel").hidden = name !== "annotations";
    $("#outputPanel").hidden = name !== "output";
  }

  function bindEvents() {
    els.inspector.addEventListener("submit", (event) => event.preventDefault());
    els.openImageButton.addEventListener("click", () => els.imageInput.click());
    els.emptyOpenButton.addEventListener("click", () => els.imageInput.click());
    els.imageInput.addEventListener("change", () => {
      loadImageFile(els.imageInput.files[0]).catch((error) => toast(error.message, "error"));
      els.imageInput.value = "";
    });
    els.screenInput.addEventListener("change", () => {
      loadScreenFile(els.screenInput.files[0]).catch((error) => toast(error.message, "error"));
      els.screenInput.value = "";
    });
    els.screenButton.addEventListener("click", () => els.screenInput.click());
    els.screenToggleButton.addEventListener("click", () => {
      if (!screenOverlay) return;
      screenOverlay.visible = !screenOverlay.visible;
      renderAll();
      toast(screenOverlay.visible ? "已顯示真實操作畫面" : "已切回漫畫畫面");
    });
    els.projectInput.addEventListener("change", () => {
      if (els.projectInput.files[0]) importProject(els.projectInput.files[0]);
      els.projectInput.value = "";
    });
    els.importJsonButton.addEventListener("click", () => els.projectInput.click());
    els.undoButton.addEventListener("click", undo);
    els.redoButton.addEventListener("click", redo);
    els.fitButton.addEventListener("click", fitImage);
    els.actualButton.addEventListener("click", actualSize);
    els.deleteButton.addEventListener("click", deleteSelected);
    els.clearAllButton.addEventListener("click", clearAll);
    els.canvas.addEventListener("pointerdown", pointerDown);
    els.canvas.addEventListener("pointermove", pointerMove);
    els.canvas.addEventListener("pointerup", pointerUp);
    els.canvas.addEventListener("pointercancel", cancelInteraction);
    els.canvas.addEventListener("pointerleave", () => { pointerWorld = null; updateCursorOutput(); });
    els.canvas.addEventListener("wheel", wheel, { passive: false });
    $$(".tool-button[data-tool]").forEach((button) => button.addEventListener("click", () => setTool(button.dataset.tool)));
    $$(".tab").forEach((button) => button.addEventListener("click", () => switchTab(button.dataset.tab)));

    els.operationInput.addEventListener("change", () => {
      const next = C.deepClone(doc);
      const annotation = next.annotations.find((item) => item.id === selectedId);
      if (!annotation) return;
      annotation.operation = els.operationInput.value;
      markChanged(next);
    });
    els.noteInput.addEventListener("input", () => {
      const next = C.deepClone(doc);
      const annotation = next.annotations.find((item) => item.id === selectedId);
      if (!annotation) return;
      annotation.note = els.noteInput.value;
      doc = next;
      renderAnnotationList();
      renderPrompt();
      scheduleSave();
    });
    els.noteInput.addEventListener("change", () => history.push(doc));
    els.arrowMeaningInput.addEventListener("change", () => {
      const next = C.deepClone(doc);
      const annotation = next.annotations.find((item) => item.id === selectedId);
      if (!annotation) return;
      annotation.arrowMeaning = els.arrowMeaningInput.value;
      markChanged(next);
    });
    els.globalRulesInput.addEventListener("input", () => {
      if (!doc) return;
      doc.globalRules = els.globalRulesInput.value;
      renderPrompt();
      scheduleSave();
    });
    els.globalRulesInput.addEventListener("change", () => history.push(doc));
    els.copySelectedButton.addEventListener("click", () => {
      const annotation = selectedAnnotation();
      if (annotation) copyText(C.documentPrompt(doc, [annotation.id]), `已複製 ${annotation.id}`);
    });
    els.copyCoordinatesButton.addEventListener("click", () => {
      const annotation = selectedAnnotation();
      if (annotation) copyText(C.geometryLines(annotation, doc.image).join("\n"), "已複製座標");
    });
    els.copyAllButton.addEventListener("click", () => copyText(C.documentPrompt(doc), "已複製全部 AI 指令"));
    els.downloadJsonButton.addEventListener("click", exportJson);

    els.exportMenuButton.addEventListener("click", (event) => {
      event.stopPropagation();
      els.exportMenu.hidden = !els.exportMenu.hidden;
    });
    els.exportMenu.addEventListener("click", (event) => {
      const action = event.target.dataset.export;
      if (!action) return;
      els.exportMenu.hidden = true;
      if (action === "annotated") exportPng(false);
      if (action === "composite") {
        if (!screenOverlay?.visible) {
          toast("請先載入並顯示真實操作畫面。", "error");
        } else {
          exportPng(false);
        }
      }
      if (action === "overlay") exportPng(true);
      if (action === "json") exportJson();
      if (action === "prompt") exportPrompt();
    });
    document.addEventListener("click", () => { els.exportMenu.hidden = true; });

    document.addEventListener("paste", (event) => {
      const item = Array.from(event.clipboardData?.items || []).find((entry) => entry.type.startsWith("image/"));
      if (item) loadImageFile(item.getAsFile()).catch((error) => toast(error.message, "error"));
    });
    window.addEventListener("dragenter", (event) => {
      if (Array.from(event.dataTransfer?.types || []).includes("Files")) {
        dragDepth += 1;
        els.dropOverlay.hidden = false;
      }
    });
    window.addEventListener("dragleave", () => {
      dragDepth = Math.max(0, dragDepth - 1);
      if (!dragDepth) els.dropOverlay.hidden = true;
    });
    window.addEventListener("dragover", (event) => event.preventDefault());
    window.addEventListener("drop", (event) => {
      event.preventDefault();
      dragDepth = 0;
      els.dropOverlay.hidden = true;
      const file = Array.from(event.dataTransfer?.files || []).find((entry) => entry.type.startsWith("image/"));
      if (file) loadImageFile(file).catch((error) => toast(error.message, "error"));
    });

    window.addEventListener("keydown", (event) => {
      const typing = ["INPUT", "TEXTAREA", "SELECT"].includes(document.activeElement?.tagName);
      if (event.code === "Space" && !typing) {
        spacePressed = true;
        els.canvas.style.cursor = "grab";
        event.preventDefault();
      }
      if (typing) return;
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "z") {
        event.preventDefault();
        event.shiftKey ? redo() : undo();
      } else if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "y") {
        event.preventDefault();
        redo();
      } else if (event.key === "Delete" || event.key === "Backspace") {
        event.preventDefault();
        deleteSelected();
      } else if (event.key === "Escape") {
        cancelInteraction();
      } else {
        const keyMap = { v: "select", p: "point", r: "rect", a: "arrow", h: "pan" };
        const tool = keyMap[event.key.toLowerCase()];
        if (tool) setTool(tool);
        if (event.key === "0") actualSize();
        if (event.key.toLowerCase() === "f") fitImage();
      }
    });
    window.addEventListener("keyup", (event) => {
      if (event.code === "Space") {
        spacePressed = false;
        els.canvas.style.cursor = activeTool === "pan" ? "grab" : activeTool === "select" ? "default" : "crosshair";
      }
    });

    resizeObserver = new ResizeObserver(() => {
      resizeCanvas();
      if (doc && !interaction && (view.scale === 1 && view.panX === 0 && view.panY === 0)) fitImage();
    });
    resizeObserver.observe(els.stagePanel);
  }

  function init() {
    bindEvents();
    setTool("select");
    try {
      const saved = localStorage.getItem("image-coordinate-workbench:last-document");
      if (saved) {
        doc = C.migrateDocument(JSON.parse(saved));
        history = new C.History(doc, 80);
        selectedId = doc.annotations[0]?.id || null;
      }
    } catch (_) {
      localStorage.removeItem("image-coordinate-workbench:last-document");
    }
    renderAll();
    resizeCanvas();
    window.AnchorWorkbench = {
      getDocument: () => C.deepClone(doc),
      setDocument: (value) => {
        doc = C.migrateDocument(value);
        history = new C.History(doc, 80);
        selectedId = doc.annotations[0]?.id || null;
        renderAll();
      },
      getView: () => ({ ...view }),
      screenToWorld: (point) => C.screenToWorld(point, view),
      worldToScreen: (point) => C.worldToScreen(point, view),
    };
  }

  init();
})();
