/**
 * 排班核心服務
 * 實現自動排班演算法，考慮約束條件
 */

import { parseLaborCode } from '@/utils/laborCodeParser'
import { sortByPriority } from '@/utils/prioritySorter'

/**
 * 生成排班結果
 * @param {string} date - 日期 (YYYY-MM-DD)
 * @param {string} shift - 時段 ('早'|'中上'|'中下'|'晚')
 * @param {Array<Object>} machines - 機台陣列
 * @param {Array<Object>} operators - 操作人員陣列
 * @param {Array<Object>} productCodes - 品號陣列
 * @returns {Array<Object>} - 排班結果陣列
 */
export async function generateSchedule(date, shift, machines, operators, productCodes) {
  // 1. 按優先級排序機台
  const sortedMachines = sortByPriority(machines)

  // 2. 過濾可用操作人員
  const availableOperators = operators.filter(op => {
    // 只使用"上班"狀態的人員 (如果有狀態欄位的話)
    if (op.狀態 && op.狀態 !== '上班') return false
    
    // 檢查時段可用性 (如果有可上班時段欄位的話)
    if (op.可上班時段 && op.可上班時段.length > 0 && !op.可上班時段.includes(shift)) return false
    
    return true
  })
  
  console.log('可用操作人員數量:', availableOperators.length, availableOperators.map(op => op.人員名稱))

  // 建立已分配人員的追蹤
  const assignedOperators = new Set()
  
  // 追蹤「自12」類型的共享人力群組 (同一組人可以操作多台機台)
  // key: 人力代碼, value: { operators: [], machineCount: 0, maxMachines: 3 }
  const sharedLaborGroups = new Map()

  // 儲存排班結果
  const scheduleResults = []

  // 3. 對每個機台進行排班
  for (const machine of sortedMachines) {
    // 支援兩種格式：使用者輸入的品號 (輸入品號) 或原有的執行品號
    const inputProductCode = machine.輸入品號 || (machine.執行品號 && machine.執行品號.length > 0 ? machine.執行品號[0] : '')
    const inputLaborCode = machine.人力代碼 || ''
    const inputRemark = machine.備註 || ''

    const scheduleResult = {
      date,
      shift,
      machineSnkey: machine.snkey,
      機台編號: machine.機台編號 || '',
      機台名稱: machine.機台名稱,
      執行品號: inputProductCode,
      生產優先: machine.生產優先,
      operatorSnkeys: [],
      操作人員名稱: [],
      人力代碼: inputLaborCode,
      狀態: '待排',
      備註: inputRemark
    }

    // 如果沒有品號，跳過此機台
    if (!inputProductCode) {
      scheduleResult.狀態 = '無品號'
      scheduleResults.push(scheduleResult)
      continue
    }

    // 取得人力代碼 (優先使用已設定的，否則從品號資料庫查詢)
    let laborCode = inputLaborCode
    if (!laborCode) {
      const productCodeData = productCodes.find(pc => pc.品號 === inputProductCode)
      if (!productCodeData || !productCodeData.人力代碼 || productCodeData.人力代碼.length === 0) {
        scheduleResult.狀態 = '無人力代碼'
        scheduleResults.push(scheduleResult)
        continue
      }
      laborCode = productCodeData.人力代碼[0]
      scheduleResult.人力代碼 = laborCode
    }

    // 解析人力代碼，取得需要的人數
    const laborInfo = parseLaborCode(laborCode)

    // 如果是全自動，不需要人
    if (laborInfo.type === 'auto') {
      scheduleResult.狀態 = '自動'
      scheduleResult.備註 = inputRemark || '全自動運行，無需人力'
      scheduleResults.push(scheduleResult)
      continue
    }

    // 需要的人數
    const requiredCount = laborInfo.count
    
    // 處理「自12」類型：2人可操作3機台 (共享人力)
    if (laborInfo.type === 'semi-auto' && laborInfo.machines > 1) {
      const groupKey = laborCode // 使用人力代碼作為群組 key
      
      if (!sharedLaborGroups.has(groupKey)) {
        // 第一台機台，需要找新的操作人員
        const matchedOperators = findBestOperators(
          machine,
          inputProductCode,
          requiredCount,
          availableOperators,
          assignedOperators,
          sortedMachines,
          productCodes
        )
        
        if (matchedOperators.length >= requiredCount) {
          // 建立新群組
          sharedLaborGroups.set(groupKey, {
            operators: matchedOperators,
            machineCount: 1,
            maxMachines: laborInfo.machines
          })
          
          scheduleResult.operatorSnkeys = matchedOperators.map(op => op.snkey)
          scheduleResult.操作人員名稱 = matchedOperators.map(op => op.人員名稱)
          scheduleResult.狀態 = '已排'
          scheduleResult.備註 = inputRemark ? `${inputRemark} | ${laborCode}: 共享人力 (1/${laborInfo.machines})` : `${laborCode}: 共享人力 (1/${laborInfo.machines})`
          
          // 標記為已分配
          matchedOperators.forEach(op => assignedOperators.add(op.snkey))
        } else if (matchedOperators.length > 0) {
          scheduleResult.operatorSnkeys = matchedOperators.map(op => op.snkey)
          scheduleResult.操作人員名稱 = matchedOperators.map(op => op.人員名稱)
          scheduleResult.狀態 = '人力不足'
          scheduleResult.備註 = inputRemark || `需要${requiredCount}人，目前僅${matchedOperators.length}人`
          matchedOperators.forEach(op => assignedOperators.add(op.snkey))
        } else {
          scheduleResult.狀態 = '無可用人力'
          scheduleResult.備註 = inputRemark || `需要${requiredCount}人，但無可用人力`
        }
      } else {
        // 已有群組，檢查是否還能加入
        const group = sharedLaborGroups.get(groupKey)
        
        if (group.machineCount < group.maxMachines) {
          // 可以共享同一組人
          group.machineCount++
          
          scheduleResult.operatorSnkeys = group.operators.map(op => op.snkey)
          scheduleResult.操作人員名稱 = group.operators.map(op => op.人員名稱)
          scheduleResult.狀態 = '已排'
          scheduleResult.備註 = inputRemark ? `${inputRemark} | ${laborCode}: 共享人力 (${group.machineCount}/${group.maxMachines})` : `${laborCode}: 共享人力 (${group.machineCount}/${group.maxMachines})`
          
          // 如果達到上限，重置群組讓下一批機台找新的人
          if (group.machineCount >= group.maxMachines) {
            sharedLaborGroups.delete(groupKey)
          }
        } else {
          // 超過上限，需要找新的一組人
          sharedLaborGroups.delete(groupKey)
          
          const matchedOperators = findBestOperators(
            machine,
            inputProductCode,
            requiredCount,
            availableOperators,
            assignedOperators,
            sortedMachines,
            productCodes
          )
          
          if (matchedOperators.length >= requiredCount) {
            sharedLaborGroups.set(groupKey, {
              operators: matchedOperators,
              machineCount: 1,
              maxMachines: laborInfo.machines
            })
            
            scheduleResult.operatorSnkeys = matchedOperators.map(op => op.snkey)
            scheduleResult.操作人員名稱 = matchedOperators.map(op => op.人員名稱)
            scheduleResult.狀態 = '已排'
            scheduleResult.備註 = inputRemark ? `${inputRemark} | ${laborCode}: 共享人力 (1/${laborInfo.machines})` : `${laborCode}: 共享人力 (1/${laborInfo.machines})`
            
            matchedOperators.forEach(op => assignedOperators.add(op.snkey))
          } else if (matchedOperators.length > 0) {
            scheduleResult.operatorSnkeys = matchedOperators.map(op => op.snkey)
            scheduleResult.操作人員名稱 = matchedOperators.map(op => op.人員名稱)
            scheduleResult.狀態 = '人力不足'
            scheduleResult.備註 = inputRemark || `需要${requiredCount}人，目前僅${matchedOperators.length}人`
            matchedOperators.forEach(op => assignedOperators.add(op.snkey))
          } else {
            scheduleResult.狀態 = '無可用人力'
            scheduleResult.備註 = inputRemark || `需要${requiredCount}人，但無可用人力`
          }
        }
      }
      
      scheduleResults.push(scheduleResult)
      continue
    }

    // 一般情況：每台機台需要獨立的人員
    const matchedOperators = findBestOperators(
      machine,
      inputProductCode,
      requiredCount,
      availableOperators,
      assignedOperators,
      sortedMachines,
      productCodes
    )

    if (matchedOperators.length >= requiredCount) {
      // 分配成功
      scheduleResult.operatorSnkeys = matchedOperators.map(op => op.snkey)
      scheduleResult.操作人員名稱 = matchedOperators.map(op => op.人員名稱)
      scheduleResult.狀態 = '已排'
      
      // 標記為已分配
      matchedOperators.forEach(op => assignedOperators.add(op.snkey))
    } else if (matchedOperators.length > 0) {
      // 部分分配
      scheduleResult.operatorSnkeys = matchedOperators.map(op => op.snkey)
      scheduleResult.操作人員名稱 = matchedOperators.map(op => op.人員名稱)
      scheduleResult.狀態 = '人力不足'
      scheduleResult.備註 = inputRemark || `需要${requiredCount}人，目前僅${matchedOperators.length}人`
      
      // 標記為已分配
      matchedOperators.forEach(op => assignedOperators.add(op.snkey))
    } else {
      // 無法分配
      scheduleResult.狀態 = '無可用人力'
      scheduleResult.備註 = inputRemark || `需要${requiredCount}人，但無可用人力`
    }

    scheduleResults.push(scheduleResult)
  }

  return scheduleResults
}

/**
 * 尋找最佳操作人員
 * @param {Object} machine - 機台
 * @param {string} productCode - 品號
 * @param {number} requiredCount - 需要人數
 * @param {Array<Object>} availableOperators - 可用操作人員
 * @param {Set} assignedOperators - 已分配人員集合
 * @param {Array<Object>} allMachines - 所有機台
 * @returns {Array<Object>} - 匹配的操作人員陣列
 */
function findBestOperators(machine, productCode, requiredCount, availableOperators, assignedOperators, allMachines, allProductCodes = []) {
  // 過濾出未分配且符合條件的人員
  const candidates = availableOperators.filter(op => {
    // 如果已經被分配，則不可用
    if (assignedOperators.has(op.snkey)) return false
    
    // 檢查不合對象
    if (hasConflict(op, machine, assignedOperators, allMachines)) return false
    
    return true
  })

  // 如果沒有候選人，返回空陣列
  if (candidates.length === 0) return []

  // 取得所有待排機台的品號列表（用於判斷是否保留人員）
  const pendingProductCodes = allMachines
    .filter(m => m.輸入品號 && !m._assigned)
    .map(m => m.輸入品號)

  // 按優先級排序候選人
  // 1. 精通此品號的人員優先
  // 2. 沒有精通品號的人員次之
  // 3. 精通其他品號的人員最後（保留給其他機台）
  const prioritized = [...candidates].sort((a, b) => {
    const aHasSkill = a.對應品號 && a.對應品號.includes(productCode)
    const bHasSkill = b.對應品號 && b.對應品號.includes(productCode)
    
    // 精通此品號的人員最優先
    if (aHasSkill && !bHasSkill) return -1
    if (!aHasSkill && bHasSkill) return 1
    
    // 都精通或都不精通此品號時，檢查是否精通其他待排品號
    const aHasOtherSkill = a.對應品號 && a.對應品號.some(code => 
      code !== productCode && pendingProductCodes.includes(code)
    )
    const bHasOtherSkill = b.對應品號 && b.對應品號.some(code => 
      code !== productCode && pendingProductCodes.includes(code)
    )
    
    // 精通其他待排品號的人員往後排（保留給其他機台）
    if (aHasOtherSkill && !bHasOtherSkill) return 1
    if (!aHasOtherSkill && bHasOtherSkill) return -1
    
    // 優先級相同，按名稱排序
    return (a.人員名稱 || '').localeCompare(b.人員名稱 || '')
  })

  // 返回所需數量的人員
  return prioritized.slice(0, requiredCount)
}

/**
 * 檢查是否有不合對象衝突
 * @param {Object} operator - 操作人員
 * @param {Object} machine - 機台
 * @param {Set} assignedOperators - 已分配人員集合
 * @param {Array<Object>} allMachines - 所有機台
 * @returns {boolean} - 是否有衝突
 */
function hasConflict(operator, machine, assignedOperators, allMachines) {
  // 如果操作人員沒有不合對象，則無衝突
  if (!operator.不合對象 || operator.不合對象.length === 0) {
    return false
  }

  // 取得機台的週邊機台
  const adjacentMachines = machine.週邊機台 || []

  // 檢查週邊機台是否有不合對象
  for (const adjacentMachineSnkey of adjacentMachines) {
    // 檢查這個週邊機台是否已分配了不合對象
    for (const conflictSnkey of operator.不合對象) {
      if (assignedOperators.has(conflictSnkey)) {
        // 需要檢查這個不合對象是否被分配到週邊機台
        // 這裡簡化處理，假設已分配的不合對象可能在週邊機台
        // 實際應用中需要更精確的判斷
        return true
      }
    }
  }

  return false
}

/**
 * 驗證排班結果
 * @param {Array<Object>} scheduleResults - 排班結果
 * @returns {Object} - 驗證結果 { valid: boolean, errors: Array<string> }
 */
export function validateSchedule(scheduleResults) {
  const errors = []
  
  // 檢查重複分配
  const assignedOperators = new Map()
  
  scheduleResults.forEach((result, index) => {
    if (result.operatorSnkeys && result.operatorSnkeys.length > 0) {
      result.operatorSnkeys.forEach(snkey => {
        if (assignedOperators.has(snkey)) {
          errors.push(`人員 ${snkey} 被重複分配到機台 ${assignedOperators.get(snkey)} 和 ${result.機台名稱}`)
        } else {
          assignedOperators.set(snkey, result.機台名稱)
        }
      })
    }
  })

  return {
    valid: errors.length === 0,
    errors
  }
}

/**
 * 取得排班統計
 * @param {Array<Object>} scheduleResults - 排班結果
 * @returns {Object} - 統計資訊
 */
export function getScheduleStatistics(scheduleResults, availableOperatorCount = 0) {
  const stats = {
    total: scheduleResults.length,
    已排: 0,
    待排: 0,
    人力不足: 0,
    自動: 0,
    無品號: 0,
    無人力代碼: 0,
    無可用人力: 0,
    已分配人數: 0,
    可用人數: availableOperatorCount,
    剩餘人力: 0
  }

  const assignedOperators = new Set()

  scheduleResults.forEach(result => {
    stats[result.狀態] = (stats[result.狀態] || 0) + 1
    
    if (result.operatorSnkeys && result.operatorSnkeys.length > 0) {
      result.operatorSnkeys.forEach(snkey => assignedOperators.add(snkey))
    }
  })

  stats.已分配人數 = assignedOperators.size
  stats.剩餘人力 = availableOperatorCount - stats.已分配人數

  return stats
}

export default {
  generateSchedule,
  validateSchedule,
  getScheduleStatistics
}

