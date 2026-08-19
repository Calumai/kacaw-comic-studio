# ARCHITECTURE.md

## Project Structure

```text
mock-exam-video-project/
  README.md
  AGENTS.md
  ARCHITECTURE.md
  TESTING.md
  CHANGELOG.md
  docs/
    01_PROJECT_BRIEF.md
    02_STYLE_GUIDE.md
    03_WORKFLOW.md
    04_ACCEPTANCE_CRITERIA.md
    05_TASKS.md
    06_DECISIONS.md
    07_PROMPTS.md
  assets/
    audio/
    images/
    music/
    video/
  scripts/
    narration/
    questions/
    storyboard/
  exports/
    drafts/
    final/
```

## Content Model

- 題目資料：題號、題幹、選項、正解、解析、作答秒數
- 影片腳本：開場、規則說明、題目段落、答案段落、結尾
- 分鏡資料：畫面內容、旁白、字幕、音效、時間長度
- 素材資料：背景、圖示、音樂、音效、字體、模板
- 輸出資料：草稿影片、最終影片、字幕檔、縮圖

## Recommended File Flow

1. 先建立題目資料。
2. 再產生影片腳本。
3. 再拆成分鏡與時間軸。
4. 再製作素材與旁白。
5. 最後剪輯、檢查、輸出。

