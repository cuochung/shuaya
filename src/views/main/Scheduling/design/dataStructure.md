# 排班資料結構設計

## 新資料結構（全英文 key）

### 完整排班記錄格式

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
    },
    {
      "productCode": "1005491",
      "priority": "方塊",
      "laborCode": "手1",
      "operators": [
        {
          "snkey": "4",
          "name": "人員4號",
          "startTime": "08:00",
          "endTime": "12:00"
        }
      ],
      "status": "已排",
      "remark": ""
    }
  ],
  "createInfo": {
    "snkey": "34",
    "name": "系統管理員",
    "time": "2026-01-20 19:55:31"
  },
  "editInfo": []
}
```

## 欄位對照表

### 機台層級（Machine Level）

| 中文 key | 英文 key | 說明 |
|---------|---------|------|
| 機台編號 | machineNumber | 機台編號 |
| 機台名稱 | machineName | 機台名稱 |
| - | machineSnkey | 機台的 snkey |
| - | date | 日期 (YYYY-MM-DD) |
| - | shift | 時段 (早/中上/中下/晚) |
| - | products | 品號陣列 |

### 品號層級（Product Level）

| 中文 key | 英文 key | 說明 |
|---------|---------|------|
| 執行品號 | productCode | 品號 |
| 生產優先 | priority | 生產優先級 |
| 人力代碼 | laborCode | 人力代碼 |
| 操作人員列表 | operators | 操作人員陣列 |
| 狀態 | status | 狀態 (已排/待排/人力不足/自動/無可用人力) |
| 備註 | remark | 備註 |

### 操作人員層級（Operator Level）

| 中文 key | 英文 key | 說明 |
|---------|---------|------|
| - | snkey | 操作人員的 snkey |
| 人員名稱 | name | 操作人員名稱 |
| 開始時間 | startTime | 開始時間 (HH:mm) |
| 結束時間 | endTime | 結束時間 (HH:mm) |

## 資料模型變更重點

1. **多品號支援**：同一機台同一時段可以有多個品號 (products 陣列)
2. **操作人員結構化**：每個品號下的操作人員改為完整物件陣列
3. **全英文 key**：所有 key 改為英文，提升國際化和資料交換相容性
4. **時間記錄**：操作人員可以記錄開始和結束時間
