"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const projectRoot = path.resolve(__dirname, "..");

function read(relativePath) {
  return fs.readFileSync(path.join(projectRoot, relativePath), "utf8");
}

const html = read("index.html");
const appSource = read("app.js");
const productionSources = ["index.html", "styles.css", "app.js", "core.js"];

test("index contains every DOM id required by app.js and the MVP shell", () => {
  const selectorIds = new Set(
    [...appSource.matchAll(/\$\("#([A-Za-z][\w:-]*)"\)/g)].map((match) => match[1]),
  );
  const essentialIds = [
    "app",
    "imageInput",
    "openImageButton",
    "stagePanel",
    "stageCanvas",
    "emptyState",
    "annotationsTab",
    "outputTab",
    "annotationList",
    "inspector",
    "geometryFields",
    "promptOutput",
    "exportMenuButton",
    "confirmDialog",
    "toastRegion",
  ];

  for (const id of essentialIds) selectorIds.add(id);
  assert.ok(selectorIds.size >= essentialIds.length, "expected DOM selector ids from app.js");

  for (const id of selectorIds) {
    const escaped = id.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    assert.match(html, new RegExp(`\\bid=["']${escaped}["']`), `missing DOM id #${id}`);
  }
});

test("production page has no external network references", () => {
  assert.doesNotMatch(html, /\b(?:src|href)\s*=\s*["'](?:https?:)?\/\//i);
  assert.doesNotMatch(html, /\bhttps?:\/\//i);
  assert.doesNotMatch(html, /<link\b[^>]*\brel=["'](?:preconnect|dns-prefetch)["']/i);
});

test("production sources contain no SVG markup, MIME type, or file reference", () => {
  for (const relativePath of productionSources) {
    const source = read(relativePath);
    assert.doesNotMatch(source, /<\s*svg\b/i, `${relativePath} contains inline SVG`);
    assert.doesNotMatch(source, /image\/svg\+xml/i, `${relativePath} accepts SVG MIME data`);
    assert.doesNotMatch(source, /\.svg(?:\b|[?#])/i, `${relativePath} references an SVG file`);
  }
});

test("every local script referenced by index exists and no remote script is used", () => {
  const scriptSources = [...html.matchAll(/<script\b[^>]*\bsrc=["']([^"']+)["'][^>]*>/gi)]
    .map((match) => match[1]);

  assert.deepEqual(scriptSources, ["core.js", "app.js"]);
  for (const source of scriptSources) {
    assert.equal(/^https?:\/\//i.test(source), false, `remote script is not allowed: ${source}`);
    assert.equal(fs.existsSync(path.join(projectRoot, source)), true, `missing script: ${source}`);
  }
});

test("new documents and PNG exports use the imported image's real dimensions", () => {
  assert.match(appSource, /width:\s*loaded\.naturalWidth/);
  assert.match(appSource, /height:\s*loaded\.naturalHeight/);
  assert.match(appSource, /out\.width\s*=\s*doc\.image\.width/);
  assert.match(appSource, /out\.height\s*=\s*doc\.image\.height/);
});
