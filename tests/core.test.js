"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const Core = require("../core.js");

function assertPointClose(actual, expected, epsilon = 1e-9) {
  assert.ok(Math.abs(actual.x - expected.x) <= epsilon, `x: expected ${expected.x}, got ${actual.x}`);
  assert.ok(Math.abs(actual.y - expected.y) <= epsilon, `y: expected ${expected.y}, got ${actual.y}`);
}

test("screen/world coordinates round-trip across representative views", () => {
  const points = [
    { x: 0, y: 0 },
    { x: 512.25, y: 768.75 },
    { x: 4095, y: 2160 },
  ];
  const views = [
    { scale: 1, panX: 0, panY: 0 },
    { scale: 0.25, panX: 93.5, panY: -41.25 },
    { scale: 4, panX: -1300, panY: 875 },
    { scale: 31.5, panX: 12.75, panY: 48.125 },
  ];

  for (const view of views) {
    for (const point of points) {
      const screen = Core.worldToScreen(point, view);
      assertPointClose(Core.screenToWorld(screen, view), point);
    }
  }
});

test("zoomAtPoint preserves the world coordinate beneath the screen anchor", () => {
  const view = { scale: 0.75, panX: 140, panY: -85 };
  const anchor = { x: 623.5, y: 311.25 };
  const before = Core.screenToWorld(anchor, view);

  for (const requestedScale of [0.001, 0.1, 1, 8, 100]) {
    const zoomed = Core.zoomAtPoint(view, anchor, requestedScale);
    assert.ok(zoomed.scale >= 0.02 && zoomed.scale <= 32);
    assertPointClose(Core.screenToWorld(anchor, zoomed), before);
  }
});

test("fitView follows imported image dimensions without enlarging small images", () => {
  assert.deepEqual(
    Core.fitView(320, 240, 1200, 800, 40),
    { scale: 1, panX: 440, panY: 280 },
  );

  const large = Core.fitView(2400, 1200, 1200, 800, 40);
  assert.equal(large.scale, 1120 / 2400);
  assert.equal(large.panX, 40);
  assert.equal(large.panY, 120);
});

test("normalizeRect handles reverse dragging, fractional pixels, and image bounds", () => {
  assert.deepEqual(
    Core.normalizeRect(900.2, 700.8, 100.7, 50.1, 1024, 768),
    { x: 100, y: 50, width: 801, height: 651 },
  );

  assert.deepEqual(
    Core.normalizeRect(1200, 900, -20.2, -9.8, 1024, 768),
    { x: 0, y: 0, width: 1024, height: 768 },
  );
});

test("clamp helpers keep points, rectangles, and arrow endpoints inside the image", () => {
  const image = { width: 100, height: 80 };

  assert.deepEqual(Core.clampPoint({ x: -12, y: 96 }, image), { x: 0, y: 79 });
  assert.deepEqual(Core.clampExtentPoint({ x: -12, y: 96 }, image), { x: 0, y: 80 });

  assert.deepEqual(
    Core.clampAnnotation(
      { type: "rect", geometry: { x: -10, y: 70, width: -120, height: 30 } },
      image,
    ).geometry,
    { x: 0, y: 50, width: 100, height: 30 },
  );

  assert.deepEqual(
    Core.clampAnnotation(
      { type: "arrow", geometry: { x1: -2, y1: 99, x2: 140, y2: -5 } },
      image,
    ).geometry,
    { x1: 0, y1: 79, x2: 99, y2: 0 },
  );
});

test("normalizedGeometry converts point, rectangle, and arrow coordinates to 0-1 space", () => {
  const image = { width: 1000, height: 500 };

  assert.deepEqual(
    Core.normalizedGeometry({ type: "point", geometry: { x: 250, y: 125 } }, image),
    { x: 0.25, y: 0.25 },
  );
  assert.deepEqual(
    Core.normalizedGeometry(
      { type: "rect", geometry: { x: 100, y: 50, width: 200, height: 100 } },
      image,
    ),
    { x: 0.1, y: 0.1, width: 0.2, height: 0.2 },
  );
  assert.deepEqual(
    Core.normalizedGeometry(
      { type: "arrow", geometry: { x1: 100, y1: 50, x2: 900, y2: 450 } },
      image,
    ),
    { x1: 0.1, y1: 0.1, x2: 0.9, y2: 0.9 },
  );
});

test("documentPrompt emits complete, precise AI editing instructions", () => {
  const doc = Core.createDocument({
    fileName: "comic-p03.png",
    mime: "image/png",
    width: 1024,
    height: 1536,
  });
  doc.globalRules = "只修改 A03，其他區域保持不變。";
  doc.annotations = [
    {
      id: "A03",
      type: "rect",
      operation: "remove_inpaint",
      note: "移除對話框與尾巴，補回牆面。",
      color: "#ffb11b",
      arrowMeaning: "target",
      geometry: { x: 614, y: 138, width: 254, height: 201 },
    },
    {
      id: "A04",
      type: "point",
      operation: "preserve",
      note: "保留角色表情。",
      color: "#6ad3d0",
      arrowMeaning: "target",
      geometry: { x: 300, y: 400 },
    },
  ];

  const prompt = Core.documentPrompt(doc, ["A03"]);
  assert.match(prompt, /原圖：comic-p03\.png/);
  assert.match(prompt, /圖片尺寸：1024 × 1536 px/);
  assert.match(prompt, /原點在左上角，x 向右、y 向下/);
  assert.match(prompt, /\[A03｜矩形｜移除並補背景\]/);
  assert.match(prompt, /像素：x=614, y=138, width=254, height=201/);
  assert.match(prompt, /x2=868, y2=339（右下邊界 exclusive）/);
  assert.match(prompt, /Normalized：x=0\.5996, y=0\.0898, w=0\.2480, h=0\.1309/);
  assert.match(prompt, /修改：移除對話框與尾巴，補回牆面。/);
  assert.match(prompt, /全域保留規則：\n只修改 A03，其他區域保持不變。/);
  assert.doesNotMatch(prompt, /A04/);
});

test("History supports fifty undo and redo steps in order", () => {
  const history = new Core.History({ step: 0 }, 80);

  for (let step = 1; step <= 50; step += 1) {
    assert.equal(history.push({ step }), true);
  }
  assert.equal(history.canUndo(), true);

  for (let expected = 49; expected >= 0; expected -= 1) {
    assert.deepEqual(history.undo(), { step: expected });
  }
  assert.equal(history.canUndo(), false);
  assert.equal(history.undo(), null);

  for (let expected = 1; expected <= 50; expected += 1) {
    assert.deepEqual(history.redo(), { step: expected });
  }
  assert.equal(history.canRedo(), false);
  assert.equal(history.redo(), null);
});

test("migrateDocument validates schema, supplies defaults, clamps geometry, and advances IDs", () => {
  const raw = {
    schemaVersion: Core.SCHEMA_VERSION,
    name: "legacy",
    image: { fileName: "legacy.png", mime: "image/png", width: 100, height: 80 },
    annotations: [
      { id: "A07", type: "point", geometry: { x: 130, y: -4 } },
      {
        id: "A12",
        type: "rect",
        operation: "add",
        geometry: { x: 90, y: 70, width: 40, height: 30 },
      },
    ],
  };
  const snapshot = structuredClone(raw);
  const migrated = Core.migrateDocument(raw);

  assert.deepEqual(raw, snapshot, "migration must not mutate imported JSON");
  assert.equal(migrated.nextAnnotationNumber, 13);
  assert.equal(Core.nextAnnotationId(migrated), "A13");
  assert.equal(migrated.globalRules, "未標註區域保持不變。");
  assert.deepEqual(migrated.annotations[0].geometry, { x: 99, y: 0 });
  assert.equal(migrated.annotations[0].operation, "modify");
  assert.equal(migrated.annotations[0].note, "");
  assert.equal(migrated.annotations[0].color, "#ffb11b");
  assert.equal(migrated.annotations[0].arrowMeaning, "target");
  assert.deepEqual(migrated.annotations[1].geometry, { x: 60, y: 50, width: 40, height: 30 });

  assert.throws(
    () => Core.migrateDocument({ ...raw, schemaVersion: 999 }),
    /不支援的 schemaVersion/,
  );
  assert.throws(
    () => Core.migrateDocument({ schemaVersion: Core.SCHEMA_VERSION }),
    /缺少原圖尺寸/,
  );
  assert.throws(
    () => Core.migrateDocument({ ...raw, image: { ...raw.image, width: -20 } }),
    /缺少原圖尺寸/,
  );
  assert.throws(
    () => Core.migrateDocument({
      ...raw,
      annotations: [{ id: "A01", type: "rect", geometry: { x: 0, y: 0, width: 0, height: 20 } }],
    }),
    /至少需要 2 × 2 px/,
  );
  assert.throws(
    () => Core.migrateDocument({
      ...raw,
      annotations: [{ id: "A01", type: "polygon", geometry: {} }],
    }),
    /不支援的標註類型/,
  );
});
