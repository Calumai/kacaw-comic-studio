# Agent Map

## 開工順序

1. 閱讀 `README.md`、`docs/01_PROJECT_BRIEF.md`。
2. 閱讀 `docs/04_ACCEPTANCE_CRITERIA.md`、`docs/05_TASKS.md`。
3. 檢查 `core.js`、`app.js`、Git 狀態與 `TESTING.md`。

## 專案邊界

- 本專案是純靜態 HTML、CSS、JavaScript Canvas 工具。
- 不新增後端、登入、資料庫、遙測、CDN、外部字型或圖片上傳。
- 不修改 CalumAi OS、其他專案或使用者原圖。
- 不以 SVG 作為標註或預覽輸出。

## 必守規則

- 所有標註以原圖像素座標為準，畫面縮放不得污染資料座標。
- JSON schema、座標定義或匯出格式若改動，必須更新 `ARCHITECTURE.md`、測試與 `docs/06_DECISIONS.md`。
- 圖片不得寫入 `localStorage`；只可暫存定位文件與文字。
- 危險操作要確認；尺寸不符的定位 JSON 與圖片不可靜默合併。
- 重要決策寫入 `docs/06_DECISIONS.md`，完成前更新 `CHANGELOG.md`。

## 完成條件

- 執行 `TESTING.md` 的自動與人工驗證。
- 檢查 file:// 與 127.0.0.1 兩種啟動方式。
- 更新任務、驗收、變更紀錄與 CalumAi 專案卡。

<!-- CALUMAI_SUBAGENT_POLICY_START -->
## CalumAi 子代理規則

- 未取得使用者在當次工作中的明確同意，不得啟動、委派、恢復或喚醒任何子代理。
- 啟動前先說明用途、數量與分工；過去的同意不延續到新工作。
- 子代理完成、失敗、取消或不再需要後立即完全關閉，並關閉其下層代理。
- 交付前不得留下仍為 open、running 或 completed-but-not-closed 的子代理。
- 不在 session 開始時預啟動、掃描或喚醒子代理；一般程序、測試與網站後台不算子代理。
- 完整規格：`C:\Users\asd81\Documents\CalumAi\OS\04_SUBAGENT_POLICY.md`。
<!-- CALUMAI_SUBAGENT_POLICY_END -->
