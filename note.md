## 2026.02.09 本日修改內容

### API（api.js）
- **批次操作**：新增 `editMulti(database, data)`（修改多筆資料）、`deleteMulti(database, data)`（刪除多筆資料），分別呼叫後端 `general/editMulti/...`、`general/delMultiv3/...`。
- 刪除舊檔 `src/assets/js/api old.js`。

### 全域設定（useStore.js）
- **Base URL**：改為線上主機 `https://www.pddtvgame.com`（原 localhost 測試改為註解）。
- **選單順序**：將「排班管理」選單項移至「機台管理」之前（authKeys 陣列中排班管理置頂）。

### 品號匯入（importProductCode.vue）
- **匯入資料**：每筆寫入時加入 `createTime`、`updateTime`（dayjs 格式 `YYYY-MM-DD HH:mm:ss`）。
- 說明區欄位列表與錯誤 alert 的排版微調；多處程式碼格式整理（空白、逗號、結尾空行）。

### 排班頁面（Scheduling/index.vue）
- **出勤更新回呼**：`AttendanceDrawer` 的 `@updated` 由 `loadBaseData` 改為 `loadOperators`，出勤更新後僅重載人員資料，不重載機台與品號。
- **loadOperators**：新增方法，只呼叫 `api.get('operator')` 並更新 `operators`，供出勤抽屜更新後使用。
- **機台表格樣式**：表頭改為 `thead th`、背景色改為不透明 `#f2f5f3`，字重與字型維持不變。

---

## 2026.01.29 本日修改內容

### 排班頁面（Scheduling）
- **工具列**：將排班工具列（選擇日期、時段、出勤管理、自動排班、讀取/刪除排班）移入「步驟 1」tab 卡片的 `v-card-title` 內；版面改為兩列（第一列：說明＋暫存/讀取暫存，第二列：日期時段＋排班操作按鈕）。
- **列表視圖（ListView）**：
  - 機台卡片點擊可正常開啟編輯排班視窗（修正 `product-section` 的 `@click.stop` 阻擋問題）。
  - 移除卡片標題上的狀態 chip（已排/待排等）。
  - 移除標題區右側時段 chip（早/中上/中下/晚）；保留左側「排班列表」與「日期 時段班」chip，並改為左右對齊（`justify-space-between`）。
  - 移除「重新載入」按鈕。

### 編輯排班對話框（ScheduleEditDialog）
- **標題配色**：改為與「新增機台」對話框相同（`.dialog-title.dialog-title--add` 綠青漸層、白字）。
- **儲存流程**：先關閉視窗並通知父層更新，再顯示「儲存成功」提示約 1.5 秒。

### 機台管理（Machine）
- **新增/編輯機台（Add.vue）**：移除「生產優先」整列（單選：方塊/大圈/小圈/大三角/小三角/空白）及未使用的 `priorityOptions`、`getPriorityColor`；`list.生產優先` 仍保留預設「空白」以配合後端。
- **機台列表（index.vue）**：移除表格「生產優先」欄（th 與對應 td）及未使用的 `getPriorityColor`。

### 排班條件與自12 邏輯
- **排班條件.md**：於 `src/services/` 新增排班條件說明文件（人員篩選、機台品號、人力代碼、優先級、人員挑選順序、不合對象、共享人力、結果狀態、相關檔案）。
- **自12 中間機台雙人條件**（[schedulingService.js](src/services/schedulingService.js)）：
  - 同一自12 群組 3 台時：依機台「週邊機台」判斷**中間機台**（週邊機台包含另外兩台 snkey 者）；中間機台分配 **2 人**同時操作，**兩端機台**各分配 **1 人**（第一台→人員1、第三台→人員2）。
  - 未滿 3 台時：每台仍分配整組 2 人。
  - 新增輔助函式：`findMiddleIndexInSelf12Group`、`opToOperatorItem`、`assignSelf12Group`、`flushIncompleteSelf12Group`；群組結構加入 `pending`，滿 3 台時一次分配，迴圈結束後對剩餘群組做未滿 3 台的整組寫入。
- **排班條件.md**：更新「自12」與「七、共享人力（自12）規則」說明，對應上述邏輯。

---

## 2025.12.20 初版完成
## 2025.12.16 山亞 - 自動排班系統 開始開發