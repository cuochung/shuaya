/**
 * 排班資料格式轉換工具
 * 處理舊格式與新格式之間的轉換
 */

/**
 * 檢查是否為新格式（有 products 欄位且使用英文 key）
 * @param {Object} data - 排班資料
 * @returns {boolean}
 */
export function isNewFormat(data) {
  return data && Array.isArray(data.products) && data.machineName !== undefined
}

/**
 * 將舊格式轉換為新格式
 * @param {Object} oldData - 舊格式資料
 * @returns {Object} - 新格式資料
 */
export function convertOldToNew(oldData) {
  if (isNewFormat(oldData)) {
    return oldData // 已經是新格式
  }

  console.log('[資料轉換] 舊格式 -> 新格式:', oldData)

  // 建立新格式的基本結構
  const newData = {
    date: oldData.date,
    shift: oldData.shift,
    machineSnkey: oldData.machineSnkey,
    machineNumber: oldData.機台編號 || '',
    machineName: oldData.機台名稱 || '',
    products: [],
    createInfo: oldData.createInfo || {},
    editInfo: oldData.editInfo || []
  }

  // 建立品號項目
  const productItem = {
    productCode: oldData.執行品號 || '',
    priority: oldData.生產優先 || '',
    laborCode: oldData.人力代碼 || '',
    operators: [],
    status: oldData.狀態 || '待排',
    remark: oldData.備註 || ''
  }

  // 轉換操作人員資料
  if (oldData.操作人員名稱 && Array.isArray(oldData.操作人員名稱)) {
    productItem.operators = oldData.操作人員名稱.map((name, idx) => ({
      snkey: oldData.operatorSnkeys && oldData.operatorSnkeys[idx] || '',
      name: name,
      startTime: oldData.操作人員時間 && oldData.操作人員時間[idx] && oldData.操作人員時間[idx].startTime || '',
      endTime: oldData.操作人員時間 && oldData.操作人員時間[idx] && oldData.操作人員時間[idx].endTime || ''
    }))
  }

  newData.products.push(productItem)

  console.log('[資料轉換] 轉換結果:', newData)
  return newData
}

/**
 * 將新格式轉換為舊格式（用於向後兼容）
 * @param {Object} newData - 新格式資料
 * @returns {Object} - 舊格式資料
 */
export function convertNewToOld(newData) {
  if (!isNewFormat(newData)) {
    return newData // 已經是舊格式
  }

  console.log('[資料轉換] 新格式 -> 舊格式:', newData)

  // 取第一個品號作為主要資料
  const firstProduct = newData.products && newData.products.length > 0 
    ? newData.products[0] 
    : {}

  const oldData = {
    date: newData.date,
    shift: newData.shift,
    machineSnkey: newData.machineSnkey,
    snkey: newData.snkey, // 保留 snkey 供更新使用
    機台編號: newData.machineNumber || '',
    機台名稱: newData.machineName || '',
    執行品號: firstProduct.productCode || '',
    生產優先: firstProduct.priority || '',
    人力代碼: firstProduct.laborCode || '',
    狀態: firstProduct.status || '待排',
    備註: firstProduct.remark || '',
    operatorSnkeys: [],
    操作人員名稱: [],
    操作人員時間: [],
    createInfo: newData.createInfo || {},
    editInfo: newData.editInfo || []
  }

  // 轉換操作人員資料
  if (firstProduct.operators && Array.isArray(firstProduct.operators)) {
    oldData.操作人員名稱 = firstProduct.operators.map(op => op.name)
    oldData.operatorSnkeys = firstProduct.operators.map(op => op.snkey)
    oldData.操作人員時間 = firstProduct.operators.map(op => ({
      startTime: op.startTime || '',
      endTime: op.endTime || ''
    }))
  }

  console.log('[資料轉換] 轉換結果:', oldData)
  return oldData
}

/**
 * 批次轉換為新格式
 * @param {Array<Object>} dataArray - 資料陣列
 * @returns {Array<Object>}
 */
export function convertBatchToNew(dataArray) {
  if (!Array.isArray(dataArray)) return []
  return dataArray.map(convertOldToNew)
}

/**
 * 取得品號摘要（用於顯示）
 * @param {Object} scheduleData - 排班資料（新格式）
 * @returns {string} - 品號摘要字串
 */
export function getProductSummary(scheduleData) {
  if (!scheduleData.products || scheduleData.products.length === 0) {
    return '無品號'
  }
  
  if (scheduleData.products.length === 1) {
    return scheduleData.products[0].productCode
  }
  
  return `${scheduleData.products[0].productCode} 等 ${scheduleData.products.length} 項`
}

/**
 * 取得操作人員摘要（用於顯示）
 * @param {Object} scheduleData - 排班資料（新格式）
 * @returns {Array<string>} - 所有操作人員名稱陣列
 */
export function getAllOperatorNames(scheduleData) {
  if (!scheduleData.products || scheduleData.products.length === 0) {
    return []
  }
  
  const allOperators = []
  scheduleData.products.forEach(product => {
    if (product.operators && product.operators.length > 0) {
      product.operators.forEach(op => {
        if (!allOperators.includes(op.name)) {
          allOperators.push(op.name)
        }
      })
    }
  })
  
  return allOperators
}

/**
 * 取得整體狀態（用於顯示）
 * @param {Object} scheduleData - 排班資料（新格式）
 * @returns {string} - 狀態
 */
export function getOverallStatus(scheduleData) {
  if (!scheduleData.products || scheduleData.products.length === 0) {
    return '待排'
  }
  
  // 如果有任何一個是已排，就顯示已排
  if (scheduleData.products.some(p => p.status === '已排')) {
    return '已排'
  }
  
  // 如果有任何一個是人力不足
  if (scheduleData.products.some(p => p.status === '人力不足')) {
    return '人力不足'
  }
  
  // 如果全部都是自動
  if (scheduleData.products.every(p => p.status === '自動')) {
    return '自動'
  }
  
  // 返回第一個品號的狀態
  return scheduleData.products[0].status
}

export default {
  isNewFormat,
  convertOldToNew,
  convertNewToOld,
  convertBatchToNew,
  getProductSummary,
  getAllOperatorNames,
  getOverallStatus
}
