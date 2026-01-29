# 排班系統資料結構遷移指南

## ✅ 已完成的變更

### 1. 資料結構重新設計
- **舊格式**：一個機台一個時段只能有一個品號
- **新格式**：一個機台一個時段可以有多個品號
- **key 命名**：全部改為英文 key

詳見 `dataStructure.md`

### 2. 排班服務核心邏輯更新

**檔案**：`src/services/schedulingService.js`

#### 變更內容：
- ✅ `generateSchedule()` - 產生新格式的排班結果
  - 機台層級：包含 `products` 陣列
  - 品號層級：每個品號包含 `operators` 陣列
  - 操作人員層級：完整的物件結構 `{snkey, name, startTime, endTime}`

- ✅ `getScheduleStatistics()` - 統計函數更新
  - 遍歷 `products` 陣列進行統計
  - 正確計算已分配人數

- ✅ `validateSchedule()` - 驗證函數更新
  - 支援新格式的重複分配檢查

### 3. 資料轉換工具

**檔案**：`src/utils/scheduleDataAdapter.js`

#### 功能：
- ✅ `isNewFormat()` - 判斷資料格式
- ✅ `convertOldToNew()` - 舊格式轉新格式
- ✅ `convertNewToOld()` - 新格式轉舊格式（向後兼容）
- ✅ `convertBatchToNew()` - 批次轉換
- ✅ `getProductSummary()` - 取得品號摘要
- ✅ `getAllOperatorNames()` - 取得所有操作人員
- ✅ `getOverallStatus()` - 取得整體狀態

### 4. 主頁面更新

**檔案**：`src/views/main/Scheduling/index.vue`

#### 變更內容：
- ✅ 引入資料轉換工具
- ✅ `loadSchedule()` - 讀取時自動轉換舊格式為新格式
- ✅ `autoSchedule()` - 使用更新後的排班服務（已自動產生新格式）

## ⏳ 待完成的變更

### 5. 顯示組件需要更新

以下組件需要更新以支援新資料結構：

#### ListView.vue
- [ ] 更新卡片顯示邏輯以支援多品號
- [ ] 更新編輯對話框以支援多品號編輯
- [ ] 更新操作人員顯示（從 operators 陣列讀取）
- [ ] 更新拖拉功能以支援新格式

#### TableView.vue
- [ ] 更新表格顯示邏輯以支援多品號
- [ ] 更新編輯對話框以支援多品號編輯
- [ ] 更新操作人員顯示（從 operators 陣列讀取）
- [ ] 更新拖拉功能以支援新格式

#### OverviewView.vue
- [ ] 更新總覽顯示邏輯以支援多品號
- [ ] 更新編輯對話框以支援多品號編輯
- [ ] 更新操作人員顯示（從 operators 陣列讀取）

### 6. 統計資訊顯示

**檔案**：`src/views/main/Scheduling/index.vue`

- [ ] 更新統計卡片顯示邏輯
- [ ] 更新剩餘人力計算邏輯

## 📊 新舊資料結構對照

### 舊格式範例
```json
{
  "date": "2026-01-20",
  "shift": "早",
  "machineSnkey": "2",
  "機台編號": "1",
  "機台名稱": "機台1號",
  "執行品號": "1005490",
  "生產優先": "空白",
  "人力代碼": "自12",
  "操作人員名稱": ["人員2號", "人員3號"],
  "operatorSnkeys": ["2", "3"],
  "狀態": "已排",
  "備註": "自12: 共享人力 (1/3)"
}
```

### 新格式範例
```json
{
  "date": "2026-01-20",
  "shift": "早",
  "machineSnkey": "2",
  "machineNumber": "1",
  "machineName": "機台1號",
  "products": [
    {
      "productCode": "1005490",
      "priority": "空白",
      "laborCode": "自12",
      "operators": [
        {
          "snkey": "2",
          "name": "人員2號",
          "startTime": "",
          "endTime": ""
        },
        {
          "snkey": "3",
          "name": "人員3號",
          "startTime": "",
          "endTime": ""
        }
      ],
      "status": "已排",
      "remark": "自12: 共享人力 (1/3)"
    }
  ],
  "createInfo": {...},
  "editInfo": []
}
```

## 🔄 向後兼容性

系統已實作自動轉換功能：

1. **讀取舊資料**：`loadSchedule()` 會自動將舊格式轉換為新格式
2. **顯示新資料**：所有新產生的排班都使用新格式
3. **儲存資料**：使用新格式儲存（舊資料在讀取時會被轉換）

## 🚀 測試建議

### 1. 自動排班測試
```javascript
// 執行自動排班後，檢查產生的資料格式
console.log(scheduleResults.value)
// 應該看到新格式：包含 products 陣列
```

### 2. 資料轉換測試
```javascript
import { convertOldToNew, isNewFormat } from '@/utils/scheduleDataAdapter'

// 測試舊資料轉換
const oldData = { 機台名稱: '機台1號', 執行品號: '1005490', ... }
const newData = convertOldToNew(oldData)
console.log(isNewFormat(newData)) // 應該是 true
```

### 3. 讀取舊資料測試
```javascript
// 從資料庫讀取舊格式資料
// loadSchedule() 應該自動轉換為新格式
```

## 📝 注意事項

1. **資料庫中的舊資料**：
   - 系統會在讀取時自動轉換
   - 下次存檔時會使用新格式覆蓋

2. **顯示組件更新**：
   - 目前顯示組件尚未更新，可能無法正確顯示多品號
   - 建議優先更新 ListView.vue

3. **API 呼叫**：
   - 儲存和讀取的 API 不需要修改
   - 資料轉換在前端完成

## 下一步驟

1. 更新 ListView.vue 以支援新格式顯示
2. 更新 TableView.vue 以支援新格式顯示
3. 更新 OverviewView.vue 以支援新格式顯示
4. 全面測試新舊資料的兼容性
5. 更新使用文檔
