# Architecture

## 系統範圍

單機、無後端的圖片定位 SPA。主要模式為直接開啟 `index.html`；可選 launcher 只提供本機 HTTP，不傳送資料到外部。

## 模組

| 檔案 | 責任 |
| --- | --- |
| `index.html` | 語意結構、工具列、Canvas、檢查器與輸出面板 |
| `styles.css` | 桌面工作台版面、狀態與響應式規則 |
| `core.js` | 無 DOM 的座標換算、標註資料、歷史紀錄與工作單生成 |
| `app.js` | 檔案載入、Canvas 繪製、指標互動、快捷鍵、匯入與匯出 |
| `server.js` | 只綁定 127.0.0.1 的零相依靜態伺服器 |
| `啟動圖片定位製作台.cmd` | Windows 雙擊入口 |

不得引入 CDN、外部字型或執行期網路依賴。

## 資料流

```text
本機圖片 → FileReader/Image → Canvas 顯示
                         ↓
           原圖座標 annotation document
              ↓        ↓         ↓
           JSON      AI TXT     PNG 預覽
```

圖片像素只存在瀏覽器記憶體。`localStorage` 只保存 document，不保存圖片 Data URL。

## 定位文件

schema version `1` 的核心欄位：

```json
{
  "schemaVersion": 1,
  "image": { "fileName": "page.png", "width": 1024, "height": 1536 },
  "coordinateSystem": {
    "origin": "top-left",
    "xAxis": "right",
    "yAxis": "down",
    "unit": "px",
    "lowerRightBoundary": "exclusive"
  },
  "globalRules": "未標註區域保持不變。",
  "annotations": []
}
```

標註類型：

- point：`{ x, y }`
- rect：`{ x, y, width, height }`
- arrow：`{ x1, y1, x2, y2 }`

每筆標註另有穩定 ID、操作類型、修改說明、顏色，以及箭頭語意。ID 不因刪除或排序重用。

## 座標系統

資料座標稱為 world，顯示座標稱為 screen：

```text
screenX = worldX × scale + panX
screenY = worldY × scale + panY
worldX  = (screenX - panX) ÷ scale
worldY  = (screenY - panY) ÷ scale
```

所有新增、拖曳、縮放控制點與命中測試都先轉回 world。矩形反向拖曳時正規化成左上角加正寬高；輸出時像素取整，比例座標保留四位小數。

## 繪製與匯出

- 工作 Canvas 依 device pixel ratio 調整，但資料仍使用原圖座標。
- 載入圖片時以瀏覽器解碼後的 `naturalWidth`、`naturalHeight` 建立文件尺寸，不使用固定專案尺寸。
- 預設顯示時，小於工作區的圖片維持 100% 原始大小；較大的圖片才等比例縮小，不改變長寬比與座標基準。
- 帶標註 PNG 以原圖尺寸重新繪製，不截取目前視窗。
- 透明標註層使用同尺寸透明 Canvas。
- JSON 可匯回；若尚未載入相同尺寸圖片，先保留定位資料並要求重新掛載原圖。
- AI 工作單同時輸出像素、比例座標、操作、說明及全域保留規則。

## 狀態與失敗處理

- 歷史紀錄最多 80 個狀態。
- 更換已有標註的圖片、清除全部標註前要確認。
- 不支援的圖片類型、JSON schema、標註類型或缺少尺寸時要顯示錯誤。
- 超過一億像素時提示效能／匯出風險，不默默縮圖。
