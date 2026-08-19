(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.AnchorCore = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const SCHEMA_VERSION = 1;

  const OPERATION_LABELS = Object.freeze({
    modify: "修改",
    remove_inpaint: "移除並補背景",
    add: "新增",
    move: "移動",
    preserve: "保留不動",
  });

  const TYPE_LABELS = Object.freeze({
    point: "點位",
    rect: "矩形",
    arrow: "箭頭",
  });

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function deepClone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function createDocument(image) {
    return {
      schemaVersion: SCHEMA_VERSION,
      id: typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : `doc-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      name: image.fileName || "未命名圖片",
      image: {
        fileName: image.fileName || "image.png",
        mime: image.mime || "image/png",
        width: Number(image.width),
        height: Number(image.height),
        sha256: image.sha256 || null,
        orientation: "normalized",
      },
      coordinateSystem: {
        origin: "top-left",
        xAxis: "right",
        yAxis: "down",
        unit: "px",
        lowerRightBoundary: "exclusive",
      },
      globalRules:
        "只修改標註範圍；未標註區域、人物造型、構圖、分鏡框線、配色與畫風保持不變。",
      annotations: [],
      nextAnnotationNumber: 1,
      updatedAt: new Date().toISOString(),
    };
  }

  function nextAnnotationId(doc) {
    const number = Math.max(1, Number(doc.nextAnnotationNumber) || 1);
    return `A${String(number).padStart(2, "0")}`;
  }

  function normalizeRect(x1, y1, x2, y2, imageWidth, imageHeight) {
    const left = clamp(Math.floor(Math.min(x1, x2)), 0, imageWidth);
    const top = clamp(Math.floor(Math.min(y1, y2)), 0, imageHeight);
    const right = clamp(Math.ceil(Math.max(x1, x2)), 0, imageWidth);
    const bottom = clamp(Math.ceil(Math.max(y1, y2)), 0, imageHeight);
    return {
      x: left,
      y: top,
      width: Math.max(0, right - left),
      height: Math.max(0, bottom - top),
    };
  }

  function screenToWorld(point, view) {
    return {
      x: (point.x - view.panX) / view.scale,
      y: (point.y - view.panY) / view.scale,
    };
  }

  function worldToScreen(point, view) {
    return {
      x: point.x * view.scale + view.panX,
      y: point.y * view.scale + view.panY,
    };
  }

  function fitView(imageWidth, imageHeight, viewportWidth, viewportHeight, padding = 48) {
    const usableWidth = Math.max(1, viewportWidth - padding * 2);
    const usableHeight = Math.max(1, viewportHeight - padding * 2);
    const scale = clamp(
      // Keep small imports at their native pixel size. Large images are scaled
      // down only as much as needed to fit the viewport, without changing ratio.
      Math.min(1, usableWidth / imageWidth, usableHeight / imageHeight),
      0.02,
      1,
    );
    return {
      scale,
      panX: (viewportWidth - imageWidth * scale) / 2,
      panY: (viewportHeight - imageHeight * scale) / 2,
    };
  }

  function zoomAtPoint(view, screenPoint, nextScale) {
    const scale = clamp(nextScale, 0.02, 32);
    const world = screenToWorld(screenPoint, view);
    return {
      scale,
      panX: screenPoint.x - world.x * scale,
      panY: screenPoint.y - world.y * scale,
    };
  }

  function clampPoint(point, image) {
    return {
      x: clamp(point.x, 0, Math.max(0, image.width - 1)),
      y: clamp(point.y, 0, Math.max(0, image.height - 1)),
    };
  }

  function clampExtentPoint(point, image) {
    return {
      x: clamp(point.x, 0, image.width),
      y: clamp(point.y, 0, image.height),
    };
  }

  function annotationBounds(annotation) {
    const g = annotation.geometry;
    if (annotation.type === "point") {
      return { x: g.x, y: g.y, width: 0, height: 0 };
    }
    if (annotation.type === "rect") {
      return { x: g.x, y: g.y, width: g.width, height: g.height };
    }
    if (annotation.type === "arrow") {
      return {
        x: Math.min(g.x1, g.x2),
        y: Math.min(g.y1, g.y2),
        width: Math.abs(g.x2 - g.x1),
        height: Math.abs(g.y2 - g.y1),
      };
    }
    throw new Error(`Unsupported annotation type: ${annotation.type}`);
  }

  function clampAnnotation(annotation, image) {
    const copy = deepClone(annotation);
    if (copy.type === "point") {
      copy.geometry = clampPoint(copy.geometry, image);
      return copy;
    }
    if (copy.type === "rect") {
      const width = clamp(Math.abs(copy.geometry.width), 0, image.width);
      const height = clamp(Math.abs(copy.geometry.height), 0, image.height);
      copy.geometry.width = width;
      copy.geometry.height = height;
      copy.geometry.x = clamp(copy.geometry.x, 0, image.width - width);
      copy.geometry.y = clamp(copy.geometry.y, 0, image.height - height);
      return copy;
    }
    if (copy.type === "arrow") {
      const p1 = clampPoint({ x: copy.geometry.x1, y: copy.geometry.y1 }, image);
      const p2 = clampPoint({ x: copy.geometry.x2, y: copy.geometry.y2 }, image);
      copy.geometry = { x1: p1.x, y1: p1.y, x2: p2.x, y2: p2.y };
      return copy;
    }
    throw new Error(`Unsupported annotation type: ${copy.type}`);
  }

  function moveAnnotation(annotation, dx, dy, image) {
    const copy = deepClone(annotation);
    if (copy.type === "point") {
      copy.geometry.x += dx;
      copy.geometry.y += dy;
      return clampAnnotation(copy, image);
    }
    if (copy.type === "rect") {
      copy.geometry.x += dx;
      copy.geometry.y += dy;
      return clampAnnotation(copy, image);
    }
    if (copy.type === "arrow") {
      const bounds = annotationBounds(copy);
      const boundedDx = clamp(dx, -bounds.x, image.width - (bounds.x + bounds.width));
      const boundedDy = clamp(dy, -bounds.y, image.height - (bounds.y + bounds.height));
      copy.geometry.x1 += boundedDx;
      copy.geometry.y1 += boundedDy;
      copy.geometry.x2 += boundedDx;
      copy.geometry.y2 += boundedDy;
      return copy;
    }
    return copy;
  }

  function resizeRectFromHandle(original, handle, point, image) {
    const left = original.x;
    const top = original.y;
    const right = original.x + original.width;
    const bottom = original.y + original.height;
    let x1 = left;
    let y1 = top;
    let x2 = right;
    let y2 = bottom;
    if (handle.includes("w")) x1 = point.x;
    if (handle.includes("e")) x2 = point.x;
    if (handle.includes("n")) y1 = point.y;
    if (handle.includes("s")) y2 = point.y;
    return normalizeRect(x1, y1, x2, y2, image.width, image.height);
  }

  function normalizedGeometry(annotation, image) {
    const g = annotation.geometry;
    if (annotation.type === "point") {
      return { x: g.x / image.width, y: g.y / image.height };
    }
    if (annotation.type === "rect") {
      return {
        x: g.x / image.width,
        y: g.y / image.height,
        width: g.width / image.width,
        height: g.height / image.height,
      };
    }
    if (annotation.type === "arrow") {
      return {
        x1: g.x1 / image.width,
        y1: g.y1 / image.height,
        x2: g.x2 / image.width,
        y2: g.y2 / image.height,
      };
    }
    throw new Error(`Unsupported annotation type: ${annotation.type}`);
  }

  function roundPixel(value) {
    return Math.round(Number(value));
  }

  function f4(value) {
    return Number(value).toFixed(4);
  }

  function geometryLines(annotation, image) {
    const g = annotation.geometry;
    const n = normalizedGeometry(annotation, image);
    if (annotation.type === "point") {
      return [
        `像素：x=${roundPixel(g.x)}, y=${roundPixel(g.y)}`,
        `Normalized：x=${f4(n.x)}, y=${f4(n.y)}`,
      ];
    }
    if (annotation.type === "rect") {
      const x = roundPixel(g.x);
      const y = roundPixel(g.y);
      const width = roundPixel(g.width);
      const height = roundPixel(g.height);
      return [
        `像素：x=${x}, y=${y}, width=${width}, height=${height}`,
        `範圍：x1=${x}, y1=${y}, x2=${x + width}, y2=${y + height}（右下邊界 exclusive）`,
        `Normalized：x=${f4(n.x)}, y=${f4(n.y)}, w=${f4(n.width)}, h=${f4(n.height)}`,
      ];
    }
    if (annotation.type === "arrow") {
      return [
        `像素：起點 x1=${roundPixel(g.x1)}, y1=${roundPixel(g.y1)}；終點 x2=${roundPixel(g.x2)}, y2=${roundPixel(g.y2)}`,
        `Normalized：x1=${f4(n.x1)}, y1=${f4(n.y1)}, x2=${f4(n.x2)}, y2=${f4(n.y2)}`,
        `箭頭語意：${annotation.arrowMeaning === "move" ? "從起點移動到終點" : "終點指向要修改的位置"}`,
      ];
    }
    return [];
  }

  function annotationPrompt(annotation, image) {
    const type = TYPE_LABELS[annotation.type] || annotation.type;
    const operation = OPERATION_LABELS[annotation.operation] || annotation.operation || "修改";
    const note = String(annotation.note || "請依標註範圍修改。" ).trim();
    return [
      `[${annotation.id}｜${type}｜${operation}]`,
      ...geometryLines(annotation, image),
      `修改：${note || "請依標註範圍修改。"}`,
    ].join("\n");
  }

  function documentPrompt(doc, annotationIds) {
    const ids = Array.isArray(annotationIds) ? new Set(annotationIds) : null;
    const annotations = doc.annotations.filter((item) => !ids || ids.has(item.id));
    const body = annotations.length
      ? annotations.map((item) => annotationPrompt(item, doc.image)).join("\n\n")
      : "目前沒有標註。";
    return [
      "請編輯附上的原圖。",
      "",
      `原圖：${doc.image.fileName}`,
      `圖片尺寸：${doc.image.width} × ${doc.image.height} px`,
      "座標規則：原點在左上角，x 向右、y 向下；請以原圖像素為準，不要以聊天視窗中的預覽尺寸計算。",
      "",
      body,
      "",
      "全域保留規則：",
      String(doc.globalRules || "未標註區域保持不變。"),
    ].join("\n");
  }

  function migrateDocument(raw) {
    if (!raw || typeof raw !== "object") throw new Error("JSON 不是有效的專案物件。");
    if (Number(raw.schemaVersion) !== SCHEMA_VERSION) {
      throw new Error(`不支援的 schemaVersion：${raw.schemaVersion}`);
    }
    const rawWidth = Number(raw.image?.width);
    const rawHeight = Number(raw.image?.height);
    if (!Number.isFinite(rawWidth) || !Number.isFinite(rawHeight) || rawWidth <= 0 || rawHeight <= 0) {
      throw new Error("JSON 缺少原圖尺寸。");
    }
    const doc = deepClone(raw);
    doc.image.width = Math.floor(rawWidth);
    doc.image.height = Math.floor(rawHeight);
    doc.annotations = Array.isArray(doc.annotations) ? doc.annotations : [];
    doc.nextAnnotationNumber = Math.max(
      Number(doc.nextAnnotationNumber) || 1,
      ...doc.annotations.map((item) => Number(String(item.id || "").replace(/\D/g, "")) + 1 || 1),
    );
    doc.globalRules = doc.globalRules || "未標註區域保持不變。";
    const seenIds = new Set();
    doc.annotations = doc.annotations.map((item) => {
      if (!item || typeof item !== "object") throw new Error("JSON 含有無效標註。");
      if (!TYPE_LABELS[item.type]) throw new Error(`不支援的標註類型：${item.type}`);
      if (!/^A\d+$/.test(String(item.id || "")) || seenIds.has(item.id)) {
        throw new Error(`標註編號無效或重複：${item.id || "(空白)"}`);
      }
      seenIds.add(item.id);
      item.operation = item.operation || "modify";
      if (!OPERATION_LABELS[item.operation]) throw new Error(`不支援的操作類型：${item.operation}`);
      item.note = item.note || "";
      item.color = item.color || "#ffb11b";
      if (!/^#[0-9a-fA-F]{6}$/.test(item.color)) throw new Error(`標註 ${item.id} 的顏色格式無效。`);
      item.arrowMeaning = item.arrowMeaning || "target";
      if (!item.geometry || typeof item.geometry !== "object") throw new Error(`標註 ${item.id} 缺少座標。`);
      const geometryKeys = item.type === "point"
        ? ["x", "y"]
        : item.type === "rect"
          ? ["x", "y", "width", "height"]
          : ["x1", "y1", "x2", "y2"];
      geometryKeys.forEach((key) => {
        const value = Number(item.geometry[key]);
        if (!Number.isFinite(value)) throw new Error(`標註 ${item.id} 的 ${key} 不是有效數字。`);
        item.geometry[key] = value;
      });
      if (item.type === "rect" && (item.geometry.width < 2 || item.geometry.height < 2)) {
        throw new Error(`標註 ${item.id} 的矩形至少需要 2 × 2 px。`);
      }
      if (item.type === "arrow") {
        if (!["target", "move"].includes(item.arrowMeaning)) throw new Error(`標註 ${item.id} 的箭頭語意無效。`);
        if (Math.hypot(item.geometry.x2 - item.geometry.x1, item.geometry.y2 - item.geometry.y1) < 3) {
          throw new Error(`標註 ${item.id} 的箭頭至少需要 3 px。`);
        }
      }
      return clampAnnotation(item, doc.image);
    });
    return doc;
  }

  class History {
    constructor(initialValue, limit = 80) {
      this.limit = limit;
      this.past = [];
      this.present = deepClone(initialValue);
      this.future = [];
    }

    push(value) {
      const next = deepClone(value);
      if (JSON.stringify(next) === JSON.stringify(this.present)) return false;
      this.past.push(this.present);
      if (this.past.length > this.limit) this.past.shift();
      this.present = next;
      this.future = [];
      return true;
    }

    undo() {
      if (!this.past.length) return null;
      this.future.unshift(this.present);
      this.present = this.past.pop();
      return deepClone(this.present);
    }

    redo() {
      if (!this.future.length) return null;
      this.past.push(this.present);
      this.present = this.future.shift();
      return deepClone(this.present);
    }

    canUndo() {
      return this.past.length > 0;
    }

    canRedo() {
      return this.future.length > 0;
    }
  }

  return {
    SCHEMA_VERSION,
    OPERATION_LABELS,
    TYPE_LABELS,
    clamp,
    deepClone,
    createDocument,
    nextAnnotationId,
    normalizeRect,
    screenToWorld,
    worldToScreen,
    fitView,
    zoomAtPoint,
    clampPoint,
    clampExtentPoint,
    annotationBounds,
    clampAnnotation,
    moveAnnotation,
    resizeRectFromHandle,
    normalizedGeometry,
    geometryLines,
    annotationPrompt,
    documentPrompt,
    migrateDocument,
    History,
  };
});
