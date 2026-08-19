# CHANGELOG.md

## 2026-08-12 Kacaw 漫畫九頁定稿交付

- 完成 P01-P09 依序生成與逐頁驗收；P07 沿用既有核准錨點，未重新生成。
- 每頁採「無字圖 → 固定像素錨點 → Noto Sans TC raster 排字 → 獨立內容／視覺／技術驗收」。
- P03 修正老師格外氣泡尾巴與兩個遮蔽欄位；P04 修正小安氣泡尾巴；P05 修正過早暗示成功的表情。
- 通過整本漫畫連續性、講義因果、兩道老師權限、自動儲存鏈與最終交付稽核。
- 交付九張 1024x1536 RGB PNG、九頁 PDF、機器可讀 manifest 與 ZIP 套件；output 內無 SVG。
- 最終 PDF：`output/pdf/kacaw-voice-comic-final.pdf`。
- 最終套件：`output/comic/kacaw-voice-comic-final-package.zip`。

## 2026-08-12 Kacaw 操作漫畫正式腳本

- 完整核對 115 年度學生操作步驟講義 11 頁。
- 依使用者回饋淘汰飛鼠造型，Kacaw 正式改為電腦娃娃；新增 assets/comic/characters/kacaw-computer-doll-reference-v1.png，飛鼠稿移入 assets/comic/rejected/。
- 電腦娃娃基準稿已完成正面、側面、背面、指引與阻止五姿勢，並通過獨立技術驗收；造型美術仍由使用者掌舵確認。
- 依使用者指定，將全書畫風改為昭和復古科幻漫畫／早期彩色賽璐璐動畫語言；新增 Kacaw 與小安 v2 角色稿，保留原創輪廓並排除既有角色招牌造型。
- 使用者指出 SVG 與復古仿舊畫面偏離目標；撤回 SVG 紋樣文件與資產，第一輪樣張不加入文化裝飾。
- 美術改為乾淨鮮明的現代復古科幻漫畫；正式樣張改用 PNG，氣泡與繁體中文固定座標光柵後製。
- 新增 P07 實際漫畫無字底圖 `assets/comic/pages/p07-art-no-text-v2.png`；依使用者回饋將兩位背景學生改為低飽和珊瑚橘與鼠尾草綠，小安保留唯一亮黃主角色。
- P07 v3 將疑似按鈕的方形介面改為中性滑桿，手指與游標保持明顯距離，通過「尚未點擊／不虛構開始鍵」獨立驗收。
- 新增固定座標光柵排字程式 `scripts/storyboard/render_p07_lettering.py`、P07 排字 PNG v7 與機器驗證報告；鎖定 Noto Sans TC 字型檔、人工換行、文字框、Kacaw 氣泡尾巴與 SHA-256。
- 將原先 10 頁／32 格的操作清單式草稿改寫為有衝突、選擇與成長的正式故事《Kacaw！我的聲音去哪了？》。
- 新版由故事節拍推導為 9 頁／28 格，保留第一次播放異常、無字停頓、差點亂按、主動舉手、重新錄音與清楚播放等必要節拍。
- 重建 docs/08_COMIC_SCRIPT.md，補齊逐格功能、景別、動作、台詞、文字預留、UI 保護區與因果。
- 重建 docs/09_COMIC_LETTERING_MANIFEST.yaml；先鎖文字與保護項，座標延後到灰階分鏡完成後回填。
- 新增 docs/10_CHARACTER_BIBLE.md，鎖定 Kacaw、小安與老師的角色外觀、文化紅線與基準圖驗收。
- P07 v7 已通過內容忠實、漫畫閱讀與技術排字三項獨立驗收；1024×1536 與 360×540 均可讀，重跑 SHA-256 一致。下一關為使用者確認後製作 P06 或推進全書。
- 新增 `docs/12_COMIC_IMAGE_ANCHOR_MANIFEST.yaml`，將 P07 v7、角色身分、場景、配色、UI 與排字鎖成全書錨點；後續按 P01 → P09 逐頁生成與驗收，P07 不再重生。
- P01 封面依錨點生成 `p01-art-no-text-v1.png`，以固定座標輸出 `p01-lettered-v1.png`；內容、漫畫視覺、技術排字三項驗收均通過，批次推進 P02。

## 2026-07-17 AI 族語備課小妙招 #001 Storyboard
- 新增 `hyperframes-ai-tribal-prep-001/STORYBOARD.md`，先完成導演用分鏡規劃，不進行 HTML 實作。
- Storyboard 依 5 分鐘教學影片規劃，逐 Scene 定義畫面內容、鏡頭運鏡、滑鼠移動、Zoom、Highlight、旁白、字幕與秒數。
- 標記若沿用較短林 J 音檔需重錄或擴寫，不建議以加速方式硬套時長。

## 2026-07-17 AI 族語備課小妙招 #001 預覽版

- 新增 HyperFrames 專案 `hyperframes-ai-tribal-prep-001`，製作 `AI 族語備課小妙招 #001：今天，我們一起認識 AI！`。
- 優先盤點並沿用既有素材：暖色 BGM、母語巢 logo、臺北市政府原民會 logo。
- 建立 6 段可編輯 CSS/SVG 風格場景：溫暖教室開場、備課資料堆疊、AI 整理教材、ChatGPT/Gemini/NotebookLM 三位小助手、合作流程、結尾完成提示。
- 依使用者腳本產出林 J 聲音旁白，合併為 `hyperframes-ai-tribal-prep-001/assets/narration/linj_narration.wav`。
- 將預覽長度設定為 122 秒，因原稿實際配音長度約 110 秒；若要達到 5 分鐘，需下一版擴寫腳本。
- 完成 HyperFrames check 與段落快照，快照位於 `hyperframes-ai-tribal-prep-001/snapshots/`。
- 依使用者回饋新增卡通飛鼠 IP 主視覺 `assets/flying-squirrel-computer-hero.png`，並更新開場與結尾畫面，取代較粗糙的 CSS 老師角色。
- 重新執行 HyperFrames check，通過且無 warning；重新產生開場與結尾快照。

## 2026-07-16

- 依照使用者提供的直式影片外框 `2-1080x1920.png`，轉成橫式瀏覽器框視覺：紫色網址列、兩側圖騰、底部紫色裝飾與右下人物。
- 新增外框來源與裁切人物素材：`assets/browser-frame-portrait-source.png`、`assets/browser-frame-person.png`。
- 調整主影片、字幕、步驟字卡與進度 HUD 位置，讓畫面放進橫式外框且不遮擋主要操作區。
- 依照回饋移除右上角小圖彈出、連接線與爆點動畫，避免遮擋主要操作畫面。
- 重新整理 `hyperframes-mock-exam-video/index.html`，保留原始錄影、正式旁白音檔、字幕、左下步驟字卡與底部進度 HUD。
- 將步驟字卡改為跟正式旁白字幕同步：公告頁確認資料、進入系統、登入、麥克風測試、錄音、播放確認、開始測驗。
- 更新 `hyperframes-mock-exam-video/video-spec.md`，明確記錄不使用右上彈出小圖，且畫面提示必須與音檔文字內容一致。
- 建立模擬測驗影片專案資料夾。
- 加入基礎文件架構、任務入口、製作流程與驗收標準。
- 建立 HyperFrames 說明影片 preview 專案 `hyperframes-mock-exam-video`。
- 將 `111年線上族語模擬測驗-系統說明手冊.pdf` 轉成 19 張 300 DPI PNG，存入 `hyperframes-mock-exam-video/assets/`。
- 完成 76 秒橫式 1920x1080 預覽 composition，每頁約 4 秒，含左滑縮放轉場、第一頁標題動畫與全程進度條。
- 依使用者提供的 `2024-11-18 23-04-49.mp4` 改為影片參考版 preview：保留原影片作主畫面，加入開場標題動畫、底部進度 HUD、時間提示與細微動態節奏。
- 加入 8 個操作步驟字卡，依影片時間顯示「操作進度、步驟標題、提醒文字」。
- 依 `video-spec-builder` 的用途建立 `hyperframes-mock-exam-video/video-spec.md`，整理影片目標、風格、時間軸、字卡與驗收標準。
- 依使用者回饋移除中文 AI 旁白，停用原影片局部放大效果。
- 從螢幕錄影擷取 7 張重要畫面，存入 `hyperframes-mock-exam-video/assets/key_screens/`，並產生 `contact_sheet.jpg` 供確認。
- 下一版重點提示將先改用截圖卡片、箭頭、框線或暫停說明，不直接放大原影片局部。
- 依使用者選擇 B 方案，建立 6 張局部截圖卡片素材於 `hyperframes-mock-exam-video/assets/callouts/`，並加入右側彈出提示卡時間軸。
- 依使用者回饋重置小視窗圖片為完整 16:9 瀏覽器視窗風格，新增來源點光圈與連接線，讓提示卡像從原畫面中彈出。
- 加入使用者提供的旁白音檔 `muyuchao_radio_episode.mp3` 與字幕檔 `audio.mp3.srt`，字幕已嵌入 HyperFrames 時間軸，原影片音量降至背景參考音量。
- 更換正式旁白檔案為 `Neo_諭書_開心-這段影片會示.mp3`，專案內保存為 `hyperframes-mock-exam-video/assets/narration/official_narration.mp3`，長度 50.08 秒，與現有 SRT 字幕時間軸吻合。

## 2026-07-16 片頭動畫更新

- 為 `hyperframes-mock-exam-video` 新增 10 秒橫式片頭動畫，參考 `800x800華語.jpg` 的視覺語言，但移除原圖中間白底資訊文字。
- 將全片長度調整為 64.42 秒：0-10 秒為片頭，10 秒後接原本 54.42 秒教學螢幕錄影與正式旁白。
- 新增片頭素材 `assets/intro-source-800.jpg`、`assets/intro-left-character.png`、`assets/intro-right-character.png`。
- 更新 `video-spec.md`，補上片頭腳本、時間配置、視覺規格與驗收標準。

## 2026-07-16 片頭字體與音效更新

- 調整片頭主標與副標字體風格，移除過厚描邊與笨重陰影，改為乾淨粗黑標題層次。
- 新增低音量 UI 音效：瀏覽器彈出、主標 pop、副標 pop、片頭轉場 chime。
- 音效檔放置於 `hyperframes-mock-exam-video/assets/sfx/`，並以 `<audio>` 直接掛在 HyperFrames root 下。
