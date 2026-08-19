# Workflow

## 使用者流程

1. 直接開啟 `index.html`，或執行 `啟動圖片定位製作台.cmd`。
2. 選擇、拖入或貼上一張圖片。
3. 用點位、矩形或箭頭標出要修改的位置。
4. 在右側選擇操作並填寫修改說明。
5. 必要時拖曳、調整控制點或直接輸入像素座標。
6. 在輸出頁籤確認全域保留規則與即時工作單。
7. 複製工作單，並匯出標註 PNG 與 JSON 留存。
8. 把原圖、標註 PNG 和工作單一併交給 AI。

## AI／開發流程

1. 讀取 Brief、驗收、任務與 Decisions。
2. 先修改 `core.js` 的純邏輯並補單元測試。
3. 再修改 `app.js` 的 Canvas 或 DOM 行為。
4. 執行語法檢查與核心測試。
5. 在 file:// 與 127.0.0.1 執行瀏覽器 smoke test。
6. 檢查所有匯出檔尺寸、內容與重新匯入結果。
7. 更新 Tasks、Decisions、Testing、Changelog 與專案卡。

## 交付組合

每次正式交辦圖片修改至少包含：

- 原圖。
- `*-annotated.png` 或 `*-anchor-overlay.png`。
- `*-ai-edit-instructions.txt`。
- 需要後續調整時加上 `*-anchors.json`。
