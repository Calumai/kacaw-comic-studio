# Testing

## 環境

- Windows 10/11
- Chrome 或 Edge 最新穩定版
- 自動測試使用 CalumAi portable Node.js 22.22.0

```powershell
$nodeRoot = 'C:\Users\asd81\Documents\CalumAi\OS\Runtimes\node-v22.22.0-win-x64'
$env:Path = "$nodeRoot;$env:Path"
```

## 自動檢查

在專案根目錄執行：

```powershell
node --check core.js
node --check app.js
node --test tests/core.test.js
```

核心測試至少涵蓋：

- screen/world 座標雙向換算與游標中心縮放。
- 適合畫面在橫圖、直圖、極端長寬比下不溢位。
- 矩形四種拖曳方向都得到非負寬高及正確邊界。
- 點位、矩形、箭頭移動或調整後不得超出允許範圍。
- normalized 值依原圖尺寸計算，不受 view scale 影響。
- 復原、重做、分支修改與 80 步上限。
- schema version、未知類型、缺少尺寸及尺寸不符的失敗處理。
- AI 工作單包含原圖尺寸、座標規則、操作、說明與保留規則。

## 瀏覽器 Smoke Test

直接雙擊 `index.html`，並用 `啟動圖片定位製作台.cmd` 再測一次：

1. 載入一張已知尺寸的 PNG、JPG、WebP；拖放與 Ctrl+V 也各測一次。
2. 在 100% 與非 100% 縮放下建立點位、矩形、箭頭，確認數值相同。
3. 平移畫布後再新增定位，確認仍以原圖左上為原點。
4. 拖曳標註、調整矩形控制點與箭頭端點，確認邊界限制有效。
5. 修改操作、說明、箭頭語意與全域規則，確認即時工作單同步。
6. 執行復原、重做、刪除與全部清除；取消確認時資料不得改變。
7. 複製單筆座標、單筆指令與全部指令。
8. 匯出帶標註 PNG、透明標註層 PNG、JSON、TXT；PNG 尺寸必須等於原圖。
9. 匯入 JSON；相同尺寸圖片可恢復，未掛圖或尺寸不同時必須要求重新載入。
10. 重新整理頁面；文字與定位文件可恢復，但工具不得聲稱保存了原圖。

## 驗收證據

收工時記錄瀏覽器版本、自動測試結果、file:// 與 HTTP smoke 結果，以及尚未涵蓋的風險。不得只寫「看起來正常」。

## 已知測試缺口

- 尚未建立跨瀏覽器自動 E2E。
- 超大圖片能力受各瀏覽器 Canvas 上限與可用記憶體影響。
