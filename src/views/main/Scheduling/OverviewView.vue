<template>
  <div class="overview-view">
    <!-- 移除人員拖放區 (浮動) -->
    <Teleport to="body">
      <Transition name="fade">
        <div v-if="isDragging" class="remove-drop-zone-floating"
          @dragover.prevent="onRemoveZoneDragOver($event)"
          @dragleave="onRemoveZoneDragLeave($event)"
          @drop="onRemoveZoneDrop($event)">
          <v-icon size="28" color="red">mdi-account-remove</v-icon>
          <span class="text-subtitle-2 font-weight-bold text-red ml-2">拖放到此處移除人員</span>
        </div>
      </Transition>
    </Teleport>

    <v-card class="overview-card" elevation="0" rounded="xl">
      <v-card-title class="d-flex align-center justify-space-between">
        <span>排班總覽 - {{ actualDate }}</span>
        <v-btn color="primary" variant="tonal" size="small" prepend-icon="mdi-refresh" @click="loadAllShifts"
          :loading="loading">
          重新載入
        </v-btn>
      </v-card-title>
      <v-card-text>
        <v-table fixed-header class="overview-table text-no-wrap">
          <thead>
            <tr>
              <th class="text-left shift-header" style="width: 80px;">時段</th>
              <th class="text-left" v-for="machine in machines" :key="machine.snkey" style="min-width: 120px;">
                <div class="machine-header">
                  <div class="text-caption text-grey">{{ machine.機台編號 }}</div>
                  <div>{{ machine.機台名稱 }}</div>
                </div>
              </th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="shift in shiftOptions" :key="shift" :class="'shift-row--' + shift">
              <td class="shift-cell">
                <v-chip :color="getShiftColor(shift)" variant="flat" size="default">
                  {{ shift }}
                </v-chip>
              </td>
              <td
                v-for="machine in machines"
                :key="machine.snkey"
                class="machine-cell"
              >
                <!-- 使用新格式資料顯示多品號（以品號區塊為單位） -->
                <div
                  v-if="getScheduleDataNew(shift, machine.snkey)"
                  class="cell-content text-no-wrap"
                >
                  <div
                    v-for="(product, pIdx) in getScheduleDataNew(shift, machine.snkey).products"
                    :key="`ov-${shift}-${machine.snkey}-${pIdx}`"
                    class="product-section product-drop-zone mb-2"
                    @dragover.prevent="onProductDragOver($event)"
                    @dragleave="onProductDragLeave($event)"
                    @drop.stop="onProductDrop($event, shift, machine.snkey, pIdx)"
                    @click="!isDragging && editItem(shift, machine.snkey)"
                  >
                    <!-- 多品號時顯示品號序號 -->
                    <div v-if="getScheduleDataNew(shift, machine.snkey).products.length > 1"
                         class="d-flex align-center mb-1">
                      <v-chip size="x-small" color="primary" variant="tonal" class="mr-1">
                        品號 {{ pIdx + 1 }}
                      </v-chip>
                    </div>

                    <!-- 品號 -->
                    <div class="d-flex align-center mb-1">
                      <v-icon size="small" class="mr-1">mdi-barcode</v-icon>
                      <span class="text-caption">品號:</span>
                      <span class="font-weight-medium text-primary ml-1 text-body-2">
                        {{ product.productCode || '-' }}
                      </span>
                    </div>

                    <!-- 優先 -->
                    <div class="d-flex align-center mb-1">
                      <v-icon size="small" class="mr-1">mdi-flag-variant</v-icon>
                      <span class="text-caption">優先:</span>
                      <v-chip v-if="product.priority" size="x-small"
                              :color="getPriorityColor(product.priority)"
                              variant="flat" class="ml-1">
                        <v-icon start size="x-small">{{ getPriorityIcon(product.priority) }}</v-icon>
                        {{ product.priority }}
                      </v-chip>
                      <span v-else class="text-caption text-grey ml-1">空白</span>
                    </div>

                    <!-- 人力代碼 -->
                    <div class="d-flex align-center mb-1">
                      <v-icon size="small" class="mr-1">mdi-wrench</v-icon>
                      <span class="text-caption">代碼:</span>
                      <span v-if="product.laborCode"
                            class="font-weight-bold ml-1 text-body-2"
                            :class="'text-' + getLaborCodeColor(product.laborCode)">
                        {{ product.laborCode }}
                      </span>
                      <span v-else class="text-caption text-grey ml-1">無</span>
                    </div>

                    <!-- 操作人員（以品號區塊為單位） -->
                    <div class="operator-drop-zone mt-1">
                      <div
                        v-if="product.operators && product.operators.length > 0"
                        v-for="(operator, opIdx) in product.operators"
                        :key="`op-${pIdx}-${opIdx}`"
                        class="d-flex align-center mb-1"
                      >
                        <v-chip
                          size="small"
                          color="indigo"
                          variant="elevated"
                          class="draggable-chip"
                          :draggable="true"
                          @dragstart="onDragStart($event, operator, shift, machine.snkey, pIdx, opIdx)"
                          @dragend="onDragEnd"
                          @click.stop
                        >
                          {{ operator.name }}
                        </v-chip>
                        <v-chip
                          v-if="operator.startTime || operator.endTime"
                          size="x-small"
                          color="teal"
                          variant="tonal"
                          class="ml-2"
                        >
                          <v-icon start size="x-small">mdi-clock-outline</v-icon>
                          {{ getOperatorTimeFromOperator(operator) }}
                        </v-chip>
                      </div>
                      <span
                        v-else
                        class="text-caption text-grey"
                      >
                        未分配
                      </span>
                    </div>

                    <!-- 狀態（使用新格式 product.status） -->
                    <v-chip v-if="shouldShowStatus(product.status)"
                            size="x-small"
                            :color="getStatusColor(product.status)"
                            variant="tonal" class="mt-1">
                      {{ product.status }}
                    </v-chip>

                    <!-- 備註，套用與列表相同的顏色規則 -->
                    <div v-if="product.remark" class="text-caption mt-1"
                         :class="
                           product.remark.includes('手1-空白預設值')
                             ? 'text-red'
                             : product.remark.includes('自12')
                               ? 'text-blue'
                               : 'text-grey'
                         ">
                      {{ product.remark }}
                    </div>

                    <v-divider v-if="pIdx < getScheduleDataNew(shift, machine.snkey).products.length - 1"
                               class="my-2" :thickness="1" color="primary" opacity="0.2" />
                  </div>
                </div>
                <div
                  v-else
                  class="text-center text-grey-lighten-1 empty-drop-zone"
                  @dragover.prevent="onEmptyCellDragOver($event)"
                  @dragleave="onEmptyCellDragLeave($event)"
                  @drop="onEmptyCellDrop($event, shift, machine.snkey)"
                >
                  -
                </div>
              </td>
            </tr>
          </tbody>
        </v-table>
      </v-card-text>
    </v-card>

    <!-- 複製/移動/交換選擇對話框（與列表相同） -->
    <v-dialog v-model="copyMoveDialog" max-width="500px" persistent>
      <v-card>
        <v-card-title class="dialog-title">
          <span>選擇操作方式</span>
        </v-card-title>
        <v-card-text class="pt-4">
          <div class="text-body-1 mb-4">
            <template v-if="pendingDropData?.isSameMachine">
              在 <strong class="text-primary">{{ pendingDropData?.sourceItem?.machineName }}</strong> 內操作
              <strong class="text-primary">{{ pendingDropData?.operator?.name }}</strong>
              <span class="text-caption text-grey">（{{ pendingDropData?.sourceShift }}班）</span>
            </template>
            <template v-else>
              將 <strong class="text-primary">{{ pendingDropData?.operator?.name }}</strong>
              從 <strong class="text-primary">{{ pendingDropData?.sourceItem?.machineName }}</strong>
              <span class="text-caption text-grey">（{{ pendingDropData?.sourceShift }}班）</span>
              到 <strong class="text-primary">{{ pendingDropData?.targetItem?.machineName }}</strong>
              <span class="text-caption text-grey">（{{ pendingDropData?.targetShift }}班）</span>
            </template>
          </div>
          <v-radio-group v-model="dropAction">
            <v-radio value="move" color="primary">
              <template #label>
                <div class="operation-option">
                  <div class="d-flex align-center">
                    <v-icon color="primary" class="mr-2">mdi-arrow-right-bold</v-icon>
                    <span class="font-weight-bold">移動</span>
                  </div>
                  <div class="text-caption text-grey ml-8">
                    <template v-if="pendingDropData?.isSameMachine">人員從來源品號移除，加入目標品號</template>
                    <template v-else>人員從來源機台移除，加入目標機台</template>
                  </div>
                </div>
              </template>
            </v-radio>
            <v-radio value="copy" color="primary">
              <template #label>
                <div class="operation-option">
                  <div class="d-flex align-center">
                    <v-icon color="success" class="mr-2">mdi-content-copy</v-icon>
                    <span class="font-weight-bold">複製</span>
                  </div>
                  <div class="text-caption text-grey ml-8">
                    <template v-if="pendingDropData?.isSameMachine">人員保留在來源品號，同時加入目標品號</template>
                    <template v-else>人員同時存在於兩個機台</template>
                  </div>
                </div>
              </template>
            </v-radio>
            <v-radio value="swap" color="warning">
              <template #label>
                <div class="operation-option">
                  <div class="d-flex align-center">
                    <v-icon color="warning" class="mr-2">mdi-swap-horizontal</v-icon>
                    <span class="font-weight-bold">交換</span>
                  </div>
                  <div class="text-caption text-grey ml-8">
                    <template v-if="pendingDropData?.isSameMachine">兩個品號的所有操作人員互相交換</template>
                    <template v-else>兩個機台指定品號的所有操作人員互相交換</template>
                  </div>
                </div>
              </template>
            </v-radio>
          </v-radio-group>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn color="grey" variant="text" @click="cancelDrop">取消</v-btn>
          <v-btn color="primary" variant="flat" @click="confirmDrop">確認</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- 共用編輯排班對話框 -->
    <schedule-edit-dialog
      v-model="editDialog"
      :editing-item="editingItem"
      :product-codes="productCodes"
      :operators="operators"
      @save="handleEditSave"
      @cancel="editDialog = false"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, getCurrentInstance } from 'vue'
import api from '@/assets/js/api.js'
import { useStore } from '@/stores/useStore'
import dayjs from 'dayjs'
import { convertBatchToNew, convertNewToOld } from '@/utils/scheduleDataAdapter'
import ScheduleEditDialog from './ScheduleEditDialog.vue'

const { proxy } = getCurrentInstance()
const store = useStore()

// Props
const props = defineProps({
  selectedDate: {
    type: String,
    required: true
  },
  machines: {
    type: Array,
    default: () => []
  },
  operators: {
    type: Array,
    default: () => []
  },
  // 傳入品號資料，供編輯時選擇品號用
  productCodes: {
    type: Array,
    default: () => []
  }
})

// Emits
const emit = defineEmits(['update'])

// 響應式數據
const loading = ref(false)
// allScheduleNew：新格式（含 products 陣列，與 TableView / ListView 相同）
const allScheduleNew = ref([])
// allScheduleData：舊格式（供現有畫面與拖拉邏輯使用）
const allScheduleData = ref([])
const shiftOptions = ['早', '中上', '中下', '晚']
const dragData = ref(null)
const isDragging = ref(false)
const copyMoveDialog = ref(false)
const dropAction = ref('move')
const pendingDropData = ref(null)
const editDialog = ref(false)
const editingItem = ref(null)

// 從載入的資料中取得實際日期
const actualDate = computed(() => {
  if (allScheduleNew.value.length > 0 && allScheduleNew.value[0].date) {
    return allScheduleNew.value[0].date
  }
  return props.selectedDate || ''
})

// 載入所有時段的排班
const loadAllShifts = async () => {
  loading.value = true
  try {
    const rs = await api.get('schedule')
    if (rs && rs.length > 0) {
      // 過濾出符合日期的所有排班
      let filtered = rs
        .map(i => ({
          ...JSON.parse(i.datalist),
          snkey: i.snkey
        }))
        .filter(item => item.date === props.selectedDate)
      
      if (filtered.length > 0) {
        // 先轉換為新格式（統一結構），並保留每筆 snkey 供後續 POST 使用
        console.log('[OverviewView-loadAllShifts] 讀取到的資料:', filtered)
        const newFormatData = convertBatchToNew(filtered)
        newFormatData.forEach((n, i) => {
          if (filtered[i]?.snkey != null) n.snkey = filtered[i].snkey
        })
        console.log('[OverviewView-loadAllShifts] 轉換為新格式後:', newFormatData)
        allScheduleNew.value = newFormatData
        // 再轉成舊格式供既有畫面 / 拖拉邏輯使用
        allScheduleData.value = newFormatData.map(convertNewToOld)
        console.log('[OverviewView-loadAllShifts] 轉換為舊格式後:', allScheduleData.value)
      } else {
        allScheduleNew.value = []
        allScheduleData.value = []
      }
    } else {
      allScheduleNew.value = []
      allScheduleData.value = []
    }
  } catch (error) {
    console.error('載入排班錯誤:', error)
    allScheduleNew.value = []
    allScheduleData.value = []
  } finally {
    loading.value = false
  }
}

// 取得特定時段和機台的排班資料（舊格式，供畫面與拖拉使用）
const getScheduleData = (shift, machineSnkey) => {
  return allScheduleData.value.find(
    item => item.shift === shift && item.machineSnkey === machineSnkey
  )
}

// 取得新格式資料（含 products），供「編輯排班」使用
const getScheduleDataNew = (shift, machineSnkey) => {
  return allScheduleNew.value.find(
    item => item.shift === shift && item.machineSnkey === machineSnkey
  )
}


const getShiftColor = (shift) => {
  const colorMap = {
    '早': 'light-blue',
    '中上': 'teal',
    '中下': 'orange',
    '晚': 'deep-purple'
  }
  return colorMap[shift] || 'grey'
}

const getStatusColor = (status) => {
  const colorMap = {
    '已排': 'success',
    '待排': 'grey',
    '人力不足': 'warning',
    '自動': 'info',
    '無品號': 'grey-lighten-1',
    '無人力代碼': 'grey-lighten-1',
    '無可用人力': 'error'
  }
  return colorMap[status] || 'grey'
}

// 取得操作人員時間顯示（新格式：直接從 operator 物件）
const getOperatorTimeFromOperator = (operator) => {
  if (!operator) return ''
  const startTime = operator.startTime
  const endTime = operator.endTime
  if (startTime && endTime) return `${startTime} - ${endTime}`
  if (startTime) return `${startTime} -`
  if (endTime) return `- ${endTime}`
  return ''
}

const getLaborCodeColor = (code) => {
  if (!code) return 'grey'
  if (code.includes('手')) return 'deep-orange'
  if (code === '自') return 'teal'
  if (code.includes('自')) return 'cyan'
  return 'grey'
}

const getPriorityColor = (priority) => {
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

const getPriorityIcon = (priority) => {
  const iconMap = {
    '方塊': 'mdi-square',
    '大圈': 'mdi-circle',
    '小圈': 'mdi-circle-small',
    '大三角': 'mdi-triangle',
    '小三角': 'mdi-triangle-small-up',
    '空白': 'mdi-checkbox-blank-outline'
  }
  return iconMap[priority] || 'mdi-help'
}

// 判斷是否應該顯示狀態 chip（不顯示待排、無可用人力、自動、已排）
const shouldShowStatus = (status) => {
  if (!status) return false
  const hiddenStatuses = ['待排', '無可用人力', '自動', '已排']
  return !hiddenStatuses.includes(status)
}

// 拖拉方法（以品號區塊為單位）
// 拖拉方法（與列表一致：以品號區塊為單位，存 sourceItem 引用）
const onDragStart = (event, operator, shift, machineSnkey, productIdx, operatorIdx) => {
  const sourceItem = getScheduleDataNew(shift, machineSnkey)
  if (!sourceItem) return
  dragData.value = {
    operator,
    sourceItem,
    productIdx,
    operatorIdx
  }
  event.dataTransfer.effectAllowed = 'move'
  event.target.classList.add('dragging')
  isDragging.value = true
}

const onDragEnd = () => {
  isDragging.value = false
  dragData.value = null
  document.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'))
  document.querySelectorAll('.product-drag-over').forEach(el => el.classList.remove('product-drag-over'))
  document.querySelectorAll('.dragging').forEach(el => el.classList.remove('dragging'))
}

// 移除區域事件
const onRemoveZoneDragOver = (event) => {
  event.currentTarget.classList.add('remove-zone-active')
}

const onRemoveZoneDragLeave = (event) => {
  event.currentTarget.classList.remove('remove-zone-active')
}

// 移除區域：與列表相同邏輯（從來源品號移除人員並 POST）
const onRemoveZoneDrop = async (event) => {
  event.currentTarget.classList.remove('remove-zone-active')
  isDragging.value = false

  if (!dragData.value) return

  const { operator, sourceItem, productIdx, operatorIdx } = dragData.value

  if (!sourceItem?.products?.[productIdx]) {
    dragData.value = null
    return
  }
  const product = sourceItem.products[productIdx]
  if (!product.operators || !Array.isArray(product.operators)) {
    dragData.value = null
    return
  }

  product.operators.splice(operatorIdx, 1)
  if (product.operators.length === 0) {
    product.status = '待排'
  }

  const sourceOld = convertNewToOld(sourceItem)
  const idxOld = allScheduleData.value.findIndex(
    r => r.machineSnkey === sourceOld.machineSnkey && r.shift === sourceOld.shift
  )
  if (idxOld !== -1) {
    allScheduleData.value[idxOld] = sourceOld
  }

  // POST 須送新格式（完整 products），否則會覆蓋掉多品號
  if (sourceItem.snkey) {
    try {
      const payload = {
        snkey: sourceItem.snkey,
        datalist: JSON.stringify({
          ...sourceItem,
          editInfo: [...(sourceItem.editInfo || []), {
            name: store.state.pData?.username || 'system',
            time: dayjs().format('YYYY-MM-DD HH:mm:ss'),
            action: `移除人員 - ${product.productCode}`
          }]
        })
      }
      await api.post('schedule', payload)
      proxy.$swal({
        icon: 'success',
        title: '移除成功',
        text: `已從 ${sourceItem.machineName} 的品號 ${product.productCode} 中移除 ${operator.name}`
      })
    } catch (error) {
      console.error('[總覽-移除人員] 更新失敗:', error)
      proxy.$swal({ icon: 'error', title: '移除失敗', text: error.message || '未知錯誤' })
    }
  }

  emit('update', sourceItem)
  dragData.value = null
}


// 品號區塊拖放事件（以品號為單位）
const onProductDragOver = (event) => {
  event.currentTarget.classList.add('product-drag-over')
}

const onProductDragLeave = (event) => {
  event.currentTarget.classList.remove('product-drag-over')
}

// 品號區塊 drop：與列表相同（一律以區塊為單位，顯示選擇操作方式）
const onProductDrop = (event, targetShift, targetMachineSnkey, targetProductIdx) => {
  event.currentTarget.classList.remove('product-drag-over')

  if (!dragData.value) return

  const { operator, sourceItem, productIdx: sourcePIdx, operatorIdx } = dragData.value
  const targetItem = getScheduleDataNew(targetShift, targetMachineSnkey)

  if (!sourceItem || !targetItem) {
    dragData.value = null
    return
  }

  // 不能拖到同一個品號區塊（同時段同機台同品號）
  const isSameBlock =
    sourceItem.shift === targetShift &&
    sourceItem.machineSnkey === targetMachineSnkey &&
    sourcePIdx === targetProductIdx
  if (isSameBlock) {
    dragData.value = null
    return
  }

  const sourceProduct = sourceItem.products?.[sourcePIdx]
  const targetProduct = targetItem.products?.[targetProductIdx]
  if (!sourceProduct || !targetProduct) {
    dragData.value = null
    return
  }

  pendingDropData.value = {
    operator,
    sourceItem,
    targetItem,
    productIdx: sourcePIdx,
    operatorIdx,
    targetProductIdx,
    isSameMachine: sourceItem.machineSnkey === targetMachineSnkey,
    sourceShift: sourceItem.shift,
    targetShift
  }
  dropAction.value = 'move'
  copyMoveDialog.value = true
}

// 空白格拖放（只標記為拖入該機台，此時沒有既有排班紀錄，不處理實際更新）
const onEmptyCellDragOver = (event) => {
  event.currentTarget.classList.add('drag-over')
}

const onEmptyCellDragLeave = (event) => {
  event.currentTarget.classList.remove('drag-over')
}

const onEmptyCellDrop = (event, targetShift, targetMachineSnkey) => {
  event.currentTarget.classList.remove('drag-over')
  // 目前總覽視圖僅支援對已存在品號的拖放，空白格不處理
  dragData.value = null
}

// 確認拖放操作（與列表相同邏輯：區塊移動/複製/交換）
const confirmDrop = async () => {
  if (!pendingDropData.value) {
    copyMoveDialog.value = false
    return
  }

  const {
    operator,
    sourceItem,
    targetItem,
    productIdx,
    operatorIdx,
    targetProductIdx,
    isSameMachine
  } = pendingDropData.value
  const isCopy = dropAction.value === 'copy'
  const isSwap = dropAction.value === 'swap'

  if (!sourceItem || !targetItem) {
    copyMoveDialog.value = false
    pendingDropData.value = null
    dragData.value = null
    return
  }

  const targetPIdx = targetProductIdx !== undefined ? targetProductIdx : 0
  const sourceProduct = sourceItem.products?.[productIdx]
  const targetProduct = targetItem.products?.[targetPIdx]

  if (!sourceProduct || !targetProduct) {
    copyMoveDialog.value = false
    pendingDropData.value = null
    dragData.value = null
    return
  }
  
  // 交換邏輯：互換兩個品號下的所有人員
  if (isSwap) {
    const sourceOperators = Array.isArray(sourceProduct.operators) ? [...sourceProduct.operators] : []
    const targetOperators = Array.isArray(targetProduct.operators) ? [...targetProduct.operators] : []

    sourceProduct.operators = targetOperators
    targetProduct.operators = sourceOperators

    // 更新狀態
    sourceProduct.status = sourceProduct.operators.length > 0 ? '已排' : '待排'
    targetProduct.status = targetProduct.operators.length > 0 ? '已排' : '待排'

    console.log('--- [總覽-交換人員-品號] 開始更新 ---')

    // 更新來源（新格式 -> 舊格式）
    const sourceOld = convertNewToOld(sourceItem)
    const idxOldSrc = allScheduleData.value.findIndex(
      r => r.machineSnkey === sourceOld.machineSnkey && r.shift === sourceOld.shift
    )
    if (idxOldSrc !== -1) {
      allScheduleData.value[idxOldSrc] = sourceOld
    }

    // POST 須送新格式（完整 products），否則會覆蓋掉多品號
    if (sourceItem.snkey) {
      try {
        const payload = {
          snkey: sourceItem.snkey,
          datalist: JSON.stringify({
            ...sourceItem,
            editInfo: [...(sourceItem.editInfo || []), {
              name: store.state.pData?.username || 'system',
              time: dayjs().format('YYYY-MM-DD HH:mm:ss'),
              action: '交換人員'
            }]
          })
        }
        console.log('[總覽-交換人員-品號] 來源 POST payload:', payload)
        const rs = await api.post('schedule', payload)
        console.log('[總覽-交換人員-品號] 來源 POST 結果:', rs)
      } catch (error) {
        console.error('[總覽-交換人員-品號] 更新來源失敗:', error)
      }
    }

    // 更新目標（新格式 -> 舊格式，僅供 allScheduleData 同步）
    const targetOld = convertNewToOld(targetItem)
    const idxOldTgt = allScheduleData.value.findIndex(
      r => r.machineSnkey === targetOld.machineSnkey && r.shift === targetOld.shift
    )
    if (idxOldTgt !== -1) {
      allScheduleData.value[idxOldTgt] = targetOld
    }

    // POST 須送新格式（完整 products）
    if (targetItem.snkey) {
      try {
        const payload = {
          snkey: targetItem.snkey,
          datalist: JSON.stringify({
            ...targetItem,
            editInfo: [...(targetItem.editInfo || []), {
              name: store.state.pData?.username || 'system',
              time: dayjs().format('YYYY-MM-DD HH:mm:ss'),
              action: '交換人員'
            }]
          })
        }
        console.log('[總覽-交換人員-品號] 目標 POST payload:', payload)
        const rs = await api.post('schedule', payload)
        console.log('[總覽-交換人員-品號] 目標 POST 結果:', rs)
      } catch (error) {
        console.error('[總覽-交換人員-品號] 更新目標失敗:', error)
      }
    }

    console.log('--- [總覽-交換人員-品號] 更新完成 ---')

    emit('update', { source: sourceItem, target: targetItem })

    copyMoveDialog.value = false
    pendingDropData.value = null
    dragData.value = null
    return
  }

  // 一般移動 / 複製：與列表相同（以品號區塊為單位）
  if (!targetProduct.operators) {
    targetProduct.operators = []
  }
  const newOperator = {
    snkey: operator.snkey,
    name: operator.name,
    startTime: operator.startTime || '',
    endTime: operator.endTime || ''
  }
  const alreadyInTarget = targetProduct.operators.some(op => op.snkey === operator.snkey)
  if (!alreadyInTarget) {
    targetProduct.operators.push(newOperator)
  }
  if (
    targetProduct.status === '待排' ||
    targetProduct.status === '無可用人力' ||
    targetProduct.status === '人力不足'
  ) {
    targetProduct.status = '已排'
  }
  if (!isCopy && sourceProduct.operators && sourceProduct.operators[operatorIdx]) {
    sourceProduct.operators.splice(operatorIdx, 1)
    if (sourceProduct.operators.length === 0) {
      sourceProduct.status = '待排'
    }
  }

  // 來源：同步 allScheduleData（舊格式），POST 須送新格式以保留多品號
  if (!isCopy) {
    const sourceOld = convertNewToOld(sourceItem)
    const idxOldSrc = allScheduleData.value.findIndex(
      r => r.machineSnkey === sourceOld.machineSnkey && r.shift === sourceOld.shift
    )
    if (idxOldSrc !== -1) {
      allScheduleData.value[idxOldSrc] = sourceOld
    }

    if (sourceItem.snkey) {
      try {
        const payload = {
          snkey: sourceItem.snkey,
          datalist: JSON.stringify({
            ...sourceItem,
            editInfo: [...(sourceItem.editInfo || []), {
              name: store.state.pData?.username || 'system',
              time: dayjs().format('YYYY-MM-DD HH:mm:ss'),
              action: '移出人員'
            }]
          })
        }
        console.log('[總覽-品號間拖拉] 來源 POST payload:', payload)
        const rs = await api.post('schedule', payload)
        console.log('[總覽-品號間拖拉] 來源 POST 結果:', rs)
      } catch (error) {
        console.error('[總覽-品號間拖拉] 更新來源失敗:', error)
      }
    }
  }

  // 目標：同步 allScheduleData，POST 須送新格式以保留多品號
  const targetOld = convertNewToOld(targetItem)
  const idxOldTgt = allScheduleData.value.findIndex(
    r => r.machineSnkey === targetOld.machineSnkey && r.shift === targetOld.shift
  )
  if (idxOldTgt !== -1) {
    allScheduleData.value[idxOldTgt] = targetOld
  }

  if (targetItem.snkey) {
    try {
      const payload = {
        snkey: targetItem.snkey,
        datalist: JSON.stringify({
          ...targetItem,
          editInfo: [...(targetItem.editInfo || []), {
            name: store.state.pData?.username || 'system',
            time: dayjs().format('YYYY-MM-DD HH:mm:ss'),
            action: isCopy ? '複製人員' : '新增人員'
          }]
        })
      }
      console.log('[總覽-品號間拖拉] 目標 POST payload:', payload)
      const rs = await api.post('schedule', payload)
      console.log('[總覽-品號間拖拉] 目標 POST 結果:', rs)
    } catch (error) {
      console.error('[總覽-品號間拖拉] 更新目標失敗:', error)
    }
  }
  console.log(`--- [總覽-品號間拖拉-${isCopy ? '複製' : '移動'}] 更新完成 ---`)
  
  // 發送更新事件
  if (!isCopy) {
    emit('update', { source: sourceItem, target: targetItem })
  } else {
    emit('update', { source: null, target: targetItem })
  }
  
  // 重置
  copyMoveDialog.value = false
  pendingDropData.value = null
  dragData.value = null
}

// 取消拖放操作
const cancelDrop = () => {
  copyMoveDialog.value = false
  pendingDropData.value = null
  dragData.value = null
}

// 編輯相關方法（使用共用組件）
const editItem = (shift, machineSnkey) => {
  const scheduleNew = getScheduleDataNew(shift, machineSnkey)
  if (!scheduleNew) return

  // 深拷貝避免直接改到原資料
  editingItem.value = JSON.parse(JSON.stringify(scheduleNew))
  console.log('[OverviewView-editItem] 編輯資料（新格式）:', editingItem.value)
  editDialog.value = true
}

// 處理編輯儲存（從共用組件回傳）
const handleEditSave = (dataToSave) => {
  console.log('[OverviewView-handleEditSave] 收到儲存資料:', dataToSave)

  // 更新本地的新格式陣列
  const idxNew = allScheduleNew.value.findIndex(
    r => r.machineSnkey === dataToSave.machineSnkey && r.shift === dataToSave.shift
  )
  if (idxNew !== -1) {
    Object.assign(allScheduleNew.value[idxNew], dataToSave)
  }

  // 同步更新舊格式陣列，供畫面 / 拖拉使用
  const convertedOld = convertNewToOld(dataToSave)
  const idxOld = allScheduleData.value.findIndex(
    r => r.machineSnkey === convertedOld.machineSnkey && r.shift === convertedOld.shift
  )
  if (idxOld !== -1) {
    allScheduleData.value[idxOld] = convertedOld
  }

  // 通知父層更新
  emit('update', dataToSave)
}

// 生命週期
onMounted(() => {
  loadAllShifts()
})

// 暴露方法給父元件
defineExpose({
  loadAllShifts
})
</script>

<style scoped lang="scss">
.overview-view {
  width: 100%;
}

.overview-card {
  background: rgba(255, 255, 255, 0.92);
  border: 1px solid rgba(91, 143, 163, 0.16);
  box-shadow: 0 14px 40px rgba(74, 107, 95, 0.14);
}

.overview-table {
  font-size: 0.95rem;

  th {
    background-color: rgba(74, 107, 95, 0.08) !important;
    font-weight: 600;
    white-space: nowrap;
    position: sticky;
    top: 0;
    z-index: 1;
  }

  td {
    vertical-align: top;
    padding: 8px 12px !important;
    border-right: 1px solid rgba(0, 0, 0, 0.05);
  }
}

.shift-header {
  position: sticky;
  left: 0;
  z-index: 2;
  background-color: rgba(74, 107, 95, 0.08) !important;
}

.shift-cell {
  position: sticky;
  left: 0;
  z-index: 1;
  background-color: white;
  font-weight: 600;
}

.machine-header {
  text-align: center;
}

.machine-cell {
  min-height: 60px;
  background-color: rgba(255, 255, 255, 0.95);
}

.cell-content {
  min-width: 100px;
}

// 品號區塊樣式（參照列表視圖）
.product-section {
  padding: 8px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.5);
  border: 1px solid rgba(0, 0, 0, 0.08);
  transition: all 0.3s ease;

  // 品號區域可拖放樣式
  &.product-drop-zone {
    cursor: pointer;
    position: relative;

    &:hover {
      background: rgba(63, 81, 181, 0.05);
      border-color: rgba(63, 81, 181, 0.2);
    }

    // 拖拉經過時的樣式（與列表一致）
    &.product-drag-over {
      background: rgba(63, 81, 181, 0.15) !important;
      border: 2px dashed #3f51b5 !important;
      box-shadow: 0 0 12px rgba(63, 81, 181, 0.3);
      transform: scale(1.02);

      &::after {
        content: '放開以加入此品號';
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: rgba(63, 81, 181, 0.95);
        color: white;
        padding: 6px 12px;
        border-radius: 8px;
        font-weight: bold;
        font-size: 12px;
        pointer-events: none;
        z-index: 10;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
      }
    }
  }
}

.shift-row--早 {
  background-color: rgba(3, 169, 244, 0.03);
}

.shift-row--中上 {
  background-color: rgba(0, 150, 136, 0.03);
}

.shift-row--中下 {
  background-color: rgba(255, 152, 0, 0.03);
}

.shift-row--晚 {
  background-color: rgba(103, 58, 183, 0.03);
}

.draggable-chip {
  cursor: grab;
  transition: all 0.2s ease;
  
  &:hover {
    transform: scale(1.05);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.25);
  }
  
  &.dragging {
    opacity: 0.5;
    cursor: grabbing;
  }
}

.machine-cell {
  transition: all 0.2s ease;
  
  &.drag-over {
    background-color: rgba(63, 81, 181, 0.15) !important;
    border: 2px dashed #3f51b5 !important;
  }
}

.empty-drop-zone {
  min-height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  
  &.drag-over {
    background-color: rgba(63, 81, 181, 0.15);
    border: 2px dashed #3f51b5;
    border-radius: 8px;
  }
}

.remove-drop-zone-floating {
  position: fixed;
  top: 80px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 9999;
  background: rgba(255, 235, 238, 0.95);
  border: 3px dashed #ef5350;
  border-radius: 16px;
  padding: 24px 60px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 20px rgba(239, 83, 80, 0.3);
  backdrop-filter: blur(8px);
  transition: all 0.3s ease;
  width: calc(100vw - 100px);
  max-width: 1200px;
  
  &.remove-zone-active {
    border-color: #d32f2f;
    background-color: rgba(239, 83, 80, 0.3);
    transform: translateX(-50%) scale(1.05);
    box-shadow: 0 6px 28px rgba(239, 83, 80, 0.5);
  }
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease, transform 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(-20px);
}

.operation-option {
  padding: 8px 0;
  width: 100%;
}

.dialog-title {
  background: linear-gradient(135deg, rgba(74, 107, 95, 0.95), rgba(123, 163, 184, 0.85));
  color: white;
}

</style>

