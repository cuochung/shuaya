/**
 * 優先級排序器
 * 按生產優先級對機台進行排序
 */

// 優先級對應的數值（數值越小優先級越高）
const PRIORITY_MAP = {
  '方塊': 1,
  '大圈': 2,
  '小圈': 3,
  '大三角': 4,
  '小三角': 5,
  '空白': 6
}

/**
 * 取得優先級的數值
 * @param {string} priority - 優先級名稱
 * @returns {number} - 優先級數值
 */
export function getPriorityValue(priority) {
  return PRIORITY_MAP[priority] || 999
}

/**
 * 按生產優先級排序機台
 * @param {Array<Object>} machines - 機台陣列
 * @returns {Array<Object>} - 排序後的機台陣列
 */
export function sortByPriority(machines) {
  if (!Array.isArray(machines)) {
    return []
  }

  return [...machines].sort((a, b) => {
    const priorityA = getPriorityValue(a.生產優先)
    const priorityB = getPriorityValue(b.生產優先)
    
    // 優先級相同時，按機台名稱排序
    if (priorityA === priorityB) {
      return (a.機台名稱 || '').localeCompare(b.機台名稱 || '')
    }
    
    return priorityA - priorityB
  })
}

/**
 * 過濾指定優先級的機台
 * @param {Array<Object>} machines - 機台陣列
 * @param {string} priority - 優先級名稱
 * @returns {Array<Object>} - 過濾後的機台陣列
 */
export function filterByPriority(machines, priority) {
  if (!Array.isArray(machines)) {
    return []
  }

  return machines.filter(m => m.生產優先 === priority)
}

/**
 * 按優先級分組機台
 * @param {Array<Object>} machines - 機台陣列
 * @returns {Object} - 按優先級分組的機台物件
 */
export function groupByPriority(machines) {
  if (!Array.isArray(machines)) {
    return {}
  }

  const groups = {
    '方塊': [],
    '大圈': [],
    '小圈': [],
    '大三角': [],
    '小三角': [],
    '空白': []
  }

  machines.forEach(machine => {
    const priority = machine.生產優先
    if (groups[priority]) {
      groups[priority].push(machine)
    }
  })

  return groups
}

/**
 * 取得優先級名稱陣列（由高到低）
 * @returns {Array<string>} - 優先級名稱陣列
 */
export function getPriorityLevels() {
  return ['方塊', '大圈', '小圈', '大三角', '小三角', '空白']
}

/**
 * 判斷優先級是否較高
 * @param {string} priority1 - 優先級1
 * @param {string} priority2 - 優先級2
 * @returns {boolean} - priority1 是否比 priority2 優先級高
 */
export function isHigherPriority(priority1, priority2) {
  return getPriorityValue(priority1) < getPriorityValue(priority2)
}

/**
 * 取得優先級的顏色
 * @param {string} priority - 優先級名稱
 * @returns {string} - 顏色代碼
 */
export function getPriorityColor(priority) {
  const colorMap = {
    '方塊': 'red',
    '大圈': 'orange',
    '小圈': 'yellow-darken-2',
    '大三角': 'light-green',
    '小三角': 'light-blue',
    '空白': 'grey'
  }
  return colorMap[priority] || 'grey'
}

export default {
  sortByPriority,
  filterByPriority,
  groupByPriority,
  getPriorityValue,
  getPriorityLevels,
  isHigherPriority,
  getPriorityColor
}




