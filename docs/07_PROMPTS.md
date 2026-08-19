# Prompts

## 工具輸出的 AI 修改工作單

```text
請編輯附上的原圖。

原圖：{fileName}
圖片尺寸：{width} × {height} px
座標規則：原點在左上角，x 向右、y 向下；請以原圖像素為準，不要以聊天視窗中的預覽尺寸計算。

[A01｜矩形｜移除並補背景]
像素：x={x}, y={y}, width={width}, height={height}
範圍：x1={x1}, y1={y1}, x2={x2}, y2={y2}（右下邊界 exclusive）
Normalized：x={nx}, y={ny}, w={nw}, h={nh}
修改：{note}

全域保留規則：
只修改標註範圍；未標註區域、人物造型、構圖、分鏡框線、配色與畫風保持不變。
```

## 交給 Codex 的功能工作單

```text
背景：image-coordinate-workbench 是純靜態本機 Canvas 定位工具。
目標：{本次要完成的單一功能}
修改範圍：只修改 image-coordinate-workbench 專案內必要檔案。
不可變更：原圖像素為 canonical、schema version 1、local-only、無 CDN、無 SVG 輸出。
完成條件：對應驗收項目通過，核心邏輯有測試，file:// 與 127.0.0.1 smoke 正常。
測試：依 TESTING.md 執行並回報實際結果。
輸出：列出修改檔案、測試結果、已知限制與文件更新。
```

## QA Prompt

```text
請以挑錯模式驗收這個定位工具：
1. 驗證縮放和平移前後座標不漂移。
2. 驗證矩形反向拖曳、邊界、箭頭方向與直接輸入座標。
3. 驗證 PNG 尺寸、透明層、JSON 回匯與 AI 工作單內容。
4. 驗證 file:// 與 127.0.0.1、剪貼簿 fallback、本機隱私。
5. 每個問題提供重現步驟、期望、實際、嚴重度與建議修正。
```
