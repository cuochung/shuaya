/**
 * 人力代碼解析器
 * 解析品號對應的人力代碼，返回所需人數和機台數
 */

/**
 * 解析人力代碼
 * @param {string} code - 人力代碼 (手1, 手2, 手3, 自12, 自01, 自)
 * @returns {Object} - { type: string, count: number, machines: number }
 *   - type: 'manual' (手動) | 'semi-auto' (半自動) | 'auto' (自動)
 *   - count: 需要的人數
 *   - machines: 對應的機台數
 */
export function parseLaborCode(code) {
  if (!code || typeof code !== 'string') {
    return { type: 'unknown', count: 0, machines: 1 }
  }

  const trimmedCode = code.trim()

  // 手3: 3人操作1機台 (先檢查手3，避免被手1匹配)
  if (trimmedCode.includes('手3')) {
    return {
      type: 'manual',
      count: 3,
      machines: 1
    }
  }

  // 手2: 2人操作1機台
  if (trimmedCode.includes('手2')) {
    return {
      type: 'manual',
      count: 2,
      machines: 1
    }
  }

  // 手1: 1人操作1機台
  if (trimmedCode.includes('手1')) {
    return {
      type: 'manual',
      count: 1,
      machines: 1
    }
  }

  // 自12: 2人操作3機台
  if (trimmedCode.includes('自12')) {
    return {
      type: 'semi-auto',
      count: 2,
      machines: 3
    }
  }

  // 自01: 1人操作1機台（自動或1人）
  if (trimmedCode.includes('自01')) {
    return {
      type: 'semi-auto',
      count: 1,
      machines: 1
    }
  }

  // 自: 全自動，不需要人 (只有單獨的「自」才算全自動)
  if (trimmedCode === '自') {
    return {
      type: 'auto',
      count: 0,
      machines: 1
    }
  }

  // 未知代碼
  return {
    type: 'unknown',
    count: 0,
    machines: 1
  }
}

/**
 * 批次解析多個人力代碼
 * @param {Array<string>} codes - 人力代碼陣列
 * @returns {Array<Object>} - 解析結果陣列
 */
export function parseLaborCodes(codes) {
  if (!Array.isArray(codes)) {
    return []
  }

  return codes.map(code => ({
    code,
    ...parseLaborCode(code)
  }))
}

/**
 * 計算總需求人數
 * @param {Array<string>} codes - 人力代碼陣列
 * @returns {number} - 總需求人數
 */
export function calculateTotalPersonnel(codes) {
  if (!Array.isArray(codes)) {
    return 0
  }

  return codes.reduce((total, code) => {
    const parsed = parseLaborCode(code)
    return total + parsed.count
  }, 0)
}

/**
 * 判斷是否需要人力
 * @param {string} code - 人力代碼
 * @returns {boolean} - 是否需要人力
 */
export function requiresPersonnel(code) {
  const parsed = parseLaborCode(code)
  return parsed.count > 0
}

/**
 * 取得人力代碼的描述
 * @param {string} code - 人力代碼
 * @returns {string} - 描述文字
 */
export function getLaborCodeDescription(code) {
  const parsed = parseLaborCode(code)
  
  switch (parsed.type) {
    case 'manual':
      return `${parsed.count}人操作${parsed.machines}機台`
    case 'semi-auto':
      return parsed.code === '自01' 
        ? '自動或1人操作' 
        : `${parsed.count}人操作${parsed.machines}機台`
    case 'auto':
      return '全自動，無需人力'
    default:
      return '未知人力代碼'
  }
}

export default {
  parseLaborCode,
  parseLaborCodes,
  calculateTotalPersonnel,
  requiresPersonnel,
  getLaborCodeDescription
}

