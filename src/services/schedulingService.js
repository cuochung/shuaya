/**
 * 排班核心服務
 * 實現自動排班演算法，考慮約束條件
 */

import { parseLaborCode } from '@/utils/laborCodeParser'
import { sortByPriority } from '@/utils/prioritySorter'

/**
 * 生成排班結果（新資料結構：支援多品號）
 * @param {string} date - 日期 (YYYY-MM-DD)
 * @param {string} shift - 時段 ('早'|'中上'|'中下'|'晚')
 * @param {Array<Object>} machines - 機台陣列
 * @param {Array<Object>} operators - 操作人員陣列
 * @param {Array<Object>} productCodes - 品號陣列
 * @returns {Array<Object>} - 排班結果陣列（新格式：包含 products 陣列）
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
  
  console.log('[排班服務] 可用操作人員數量:', availableOperators.length, availableOperators.map(op => op.人員名稱))

  // 建立已分配人員的追蹤
  const assignedOperators = new Set()
  
  // 追蹤「自12」類型的共享人力群組 (同一組人可以操作多台機台)
  // key: 人力代碼, value: { operators: [], machineCount: 0, maxMachines: 3 }
  const sharedLaborGroups = new Map()

  // 儲存排班結果（新格式）
  const scheduleResults = []

  // 3. 對每個機台進行排班
  for (const machine of sortedMachines) {
    // 支援兩種格式：使用者輸入的品號 (輸入品號) 或原有的執行品號
    const inputProductCode = machine.輸入品號 || (machine.執行品號 && machine.執行品號.length > 0 ? machine.執行品號[0] : '')
    const inputLaborCode = machine.人力代碼 || ''
    const inputRemark = machine.備註 || ''

    // 新資料結構：機台層級
    const scheduleResult = {
      date,
      shift,
      machineSnkey: machine.snkey,
      machineNumber: machine.機台編號 || '',
      machineName: machine.機台名稱,
      products: [] // 品號陣列（新格式）
    }
    
    // 品號層級的物件
    const productItem = {
      productCode: inputProductCode,
      priority: machine.生產優先,
      laborCode: inputLaborCode,
      operators: [], // 操作人員陣列（新格式：物件陣列）
      status: '待排',
      remark: inputRemark
    }

    // 如果沒有品號，跳過此機台
    if (!inputProductCode) {
      productItem.status = '無品號'
      scheduleResult.products.push(productItem)
      scheduleResults.push(scheduleResult)
      continue
    }

    // 取得人力代碼 (優先使用已設定的，否則從品號資料庫查詢；使用英文欄位)
    let laborCode = inputLaborCode
    if (!laborCode) {
      const productCodeData = productCodes.find(pc => pc.productCode === inputProductCode)
      if (!productCodeData || !productCodeData.laborCodes || productCodeData.laborCodes.length === 0) {
        productItem.status = '無人力代碼'
        scheduleResult.products.push(productItem)
        scheduleResults.push(scheduleResult)
        continue
      }
      laborCode = productCodeData.laborCodes[0]
      productItem.laborCode = laborCode
    }

    // 解析人力代碼，取得需要的人數
    const laborInfo = parseLaborCode(laborCode)

    // 如果是全自動，不需要人
    if (laborInfo.type === 'auto') {
      productItem.status = '自動'
      productItem.remark = inputRemark || '全自動運行，無需人力'
      scheduleResult.products.push(productItem)
      scheduleResults.push(scheduleResult)
      continue
    }

    // 需要的人數
    const requiredCount = laborInfo.count
    
    // 處理「自12」類型：2人可操作3機台 (共享人力)；依週邊機台判斷中間機台，中間雙人、兩端各一人
    if (laborInfo.type === 'semi-auto' && laborInfo.machines > 1) {
      const groupKey = laborCode
      const maxMachines = laborInfo.machines

      if (!sharedLaborGroups.has(groupKey)) {
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
            maxMachines,
            pending: [{ machine, productItem }]
          })
          productItem.status = '已排'
          productItem.remark = inputRemark ? `${inputRemark} | ${laborCode}: 共享人力 (1/${maxMachines})` : `${laborCode}: 共享人力 (1/${maxMachines})`
          matchedOperators.forEach(op => assignedOperators.add(op.snkey))
        } else if (matchedOperators.length > 0) {
          productItem.operators = matchedOperators.map(op => opToOperatorItem(op))
          productItem.status = '人力不足'
          productItem.remark = inputRemark || `需要${requiredCount}人，目前僅${matchedOperators.length}人`
          matchedOperators.forEach(op => assignedOperators.add(op.snkey))
        } else {
          productItem.status = '無可用人力'
          productItem.remark = inputRemark || `需要${requiredCount}人，但無可用人力`
        }
      } else {
        const group = sharedLaborGroups.get(groupKey)
        if (group.machineCount < group.maxMachines) {
          group.machineCount++
          group.pending.push({ machine, productItem })
          productItem.status = '已排'
          productItem.remark = inputRemark ? `${inputRemark} | ${laborCode}: 共享人力 (${group.machineCount}/${maxMachines})` : `${laborCode}: 共享人力 (${group.machineCount}/${maxMachines})`
          if (group.machineCount === 3) {
            assignSelf12Group(group)
            sharedLaborGroups.delete(groupKey)
          }
        } else {
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
              maxMachines,
              pending: [{ machine, productItem }]
            })
            productItem.status = '已排'
            productItem.remark = inputRemark ? `${inputRemark} | ${laborCode}: 共享人力 (1/${maxMachines})` : `${laborCode}: 共享人力 (1/${maxMachines})`
            matchedOperators.forEach(op => assignedOperators.add(op.snkey))
          } else if (matchedOperators.length > 0) {
            productItem.operators = matchedOperators.map(op => opToOperatorItem(op))
            productItem.status = '人力不足'
            productItem.remark = inputRemark || `需要${requiredCount}人，目前僅${matchedOperators.length}人`
            matchedOperators.forEach(op => assignedOperators.add(op.snkey))
          } else {
            productItem.status = '無可用人力'
            productItem.remark = inputRemark || `需要${requiredCount}人，但無可用人力`
          }
        }
      }
      scheduleResult.products.push(productItem)
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
      productItem.operators = matchedOperators.map(op => ({
        snkey: op.snkey,
        name: op.人員名稱,
        startTime: '',
        endTime: ''
      }))
      productItem.status = '已排'
      
      // 標記為已分配
      matchedOperators.forEach(op => assignedOperators.add(op.snkey))
    } else if (matchedOperators.length > 0) {
      // 部分分配
      productItem.operators = matchedOperators.map(op => ({
        snkey: op.snkey,
        name: op.人員名稱,
        startTime: '',
        endTime: ''
      }))
      productItem.status = '人力不足'
      productItem.remark = inputRemark || `需要${requiredCount}人，目前僅${matchedOperators.length}人`
      
      // 標記為已分配
      matchedOperators.forEach(op => assignedOperators.add(op.snkey))
    } else {
      // 無法分配
      productItem.status = '無可用人力'
      productItem.remark = inputRemark || `需要${requiredCount}人，但無可用人力`
    }

    scheduleResult.products.push(productItem)
    scheduleResults.push(scheduleResult)
  }

  // 迴圈結束後，對未滿 3 台的自12 群組做整組寫入（兩台或一台都給整組 2 人）
  for (const [, group] of sharedLaborGroups) {
    if (group.pending && group.pending.length > 0) {
      flushIncompleteSelf12Group(group)
    }
  }

  console.log('[排班服務] 產生的排班結果（新格式）:', scheduleResults)
  return scheduleResults
}

/**
 * 自12 群組：找出「中間機台」索引（週邊機台包含另外兩台 snkey 的那一台）
 * @param {Array<{ machine: Object, productItem: Object }>} pending - 長度 3
 * @returns {number} middleIdx 0、1 或 2；若無符合則回傳 -1
 */
function findMiddleIndexInSelf12Group(pending) {
  if (!pending || pending.length !== 3) return -1
  const snkeys = pending.map(p => p.machine.snkey)
  for (let i = 0; i < 3; i++) {
    const adj = pending[i].machine.週邊機台 || []
    const otherSnkeys = snkeys.filter((_, j) => j !== i)
    if (otherSnkeys.length === 2 && otherSnkeys.every(s => adj.includes(s))) return i
  }
  return -1
}

/**
 * 將 operator 轉成新格式單人陣列
 */
function opToOperatorItem(op) {
  return { snkey: op.snkey, name: op.人員名稱, startTime: '', endTime: '' }
}

/**
 * 自12 群組滿 3 台時：依中間／兩端寫入 productItem.operators
 * 兩端：第一端 [op0]、第二端 [op1]；中間：[op0, op1]
 */
function assignSelf12Group(group) {
  const { operators, pending } = group
  if (!pending || pending.length !== 3 || !operators || operators.length < 2) return
  const op0 = operators[0]
  const op1 = operators[1]
  const middleIdx = findMiddleIndexInSelf12Group(pending)
  const laborCode = pending[0].productItem.laborCode || '自12'
  const maxMachines = 3
  if (middleIdx === -1) {
    // fallback：無符合中間機台時，三台都給整組 2 人
    pending.forEach((p, idx) => {
      p.productItem.operators = [opToOperatorItem(op0), opToOperatorItem(op1)]
      p.productItem.remark = p.productItem.remark || `${laborCode}: 共享人力 (${idx + 1}/${maxMachines})`
    })
    return
  }
  const ends = [0, 1, 2].filter(i => i !== middleIdx)
  pending[ends[0]].productItem.operators = [opToOperatorItem(op0)]
  pending[ends[0]].productItem.remark = pending[ends[0]].productItem.remark || `${laborCode}: 共享人力-兩端 (${ends[0] + 1}/${maxMachines})`
  pending[ends[1]].productItem.operators = [opToOperatorItem(op1)]
  pending[ends[1]].productItem.remark = pending[ends[1]].productItem.remark || `${laborCode}: 共享人力-兩端 (${ends[1] + 1}/${maxMachines})`
  pending[middleIdx].productItem.operators = [opToOperatorItem(op0), opToOperatorItem(op1)]
  pending[middleIdx].productItem.remark = pending[middleIdx].productItem.remark || `${laborCode}: 共享人力-中間 (雙人操作)`
}

/**
 * 自12 群組未滿 3 台時：每台都寫入整組 2 人
 */
function flushIncompleteSelf12Group(group) {
  const { operators, pending } = group
  if (!pending || pending.length === 0 || !operators) return
  const laborCode = pending[0].productItem.laborCode || '自12'
  pending.forEach((p, idx) => {
    p.productItem.operators = operators.map(op => opToOperatorItem(op))
    p.productItem.status = '已排'
    p.productItem.remark = p.productItem.remark || `${laborCode}: 共享人力 (${idx + 1}/${pending.length})`
  })
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
 * 驗證排班結果（新資料結構）
 * @param {Array<Object>} scheduleResults - 排班結果（新格式）
 * @returns {Object} - 驗證結果 { valid: boolean, errors: Array<string> }
 */
export function validateSchedule(scheduleResults) {
  const errors = []
  
  // 檢查重複分配
  const assignedOperators = new Map()
  
  scheduleResults.forEach((result, index) => {
    // 新格式：遍歷 products 陣列
    if (result.products && result.products.length > 0) {
      result.products.forEach((product, productIndex) => {
        if (product.operators && product.operators.length > 0) {
          product.operators.forEach(op => {
            if (assignedOperators.has(op.snkey)) {
              const prevAssignment = assignedOperators.get(op.snkey)
              errors.push(`人員 ${op.name} 被重複分配到機台 ${prevAssignment} 和 ${result.machineName} (品號: ${product.productCode})`)
            } else {
              assignedOperators.set(op.snkey, `${result.machineName} (品號: ${product.productCode})`)
            }
          })
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
 * 取得排班統計（新資料結構）
 * @param {Array<Object>} scheduleResults - 排班結果（新格式）
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
    // 新格式：遍歷 products 陣列
    if (result.products && result.products.length > 0) {
      result.products.forEach(product => {
        // 統計狀態
        stats[product.status] = (stats[product.status] || 0) + 1
        
        // 統計已分配人員
        if (product.operators && product.operators.length > 0) {
          product.operators.forEach(op => assignedOperators.add(op.snkey))
        }
      })
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

