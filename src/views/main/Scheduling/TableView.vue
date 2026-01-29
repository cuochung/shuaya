<template>
  <div class="table-view">
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

    <v-card class="schedule-table-card">
      <v-card-title class="d-flex align-center justify-space-between">
        <div class="d-flex align-center gap-2">
          <span>排班詳細資訊</span>
          <v-chip v-if="selectedDate && selectedShift" color="primary" variant="flat" size="small">
            {{ selectedDate }} {{ selectedShift }}班
          </v-chip>
          <v-btn color="primary" variant="tonal" size="small" prepend-icon="mdi-refresh" @click="loadSchedule"
            :loading="loading">
            重新載入
          </v-btn>
        </div>
        <v-text-field v-model="searchKey" label="搜尋" density="compact" variant="outlined" hide-details
          prepend-inner-icon="mdi-magnify" style="max-width: 300px;"></v-text-field>
      </v-card-title>
      <v-card-text>
        <v-table fixed-header class="schedule-table" height="calc(100vh - 450px)">
          <thead>
            <tr>
              <th class="text-left">機台編號</th>
              <th class="text-left">機台名稱</th>
              <th class="text-left">品號</th>
              <th class="text-left">人力代碼</th>
              <th class="text-left">生產優先</th>
              <th class="text-left">操作人員</th>
              <th class="text-left">狀態</th>
              <th class="text-left">備註</th>
              <th class="text-left">操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(item, index) in filteredResults" :key="index"
              :class="{'highlight-row': getOverallStatus(item) === '人力不足' || getOverallStatus(item) === '無可用人力'}">
              <td class="font-weight-bold">{{ item.machineNumber }}</td>
              <td class="font-weight-bold">{{ item.machineName }}</td>
              <td>
                <div v-if="item.products && item.products.length > 0">
                  <div v-for="(product, pIdx) in item.products" :key="`product-${index}-${pIdx}`" 
                    class="mb-1" :class="{'mt-2': pIdx > 0}">
                    <span v-if="product.productCode" class="font-weight-medium text-primary">
                      {{ product.productCode }}
                    </span>
                    <span v-else class="text-grey text-caption">（未設定）</span>
                  </div>
                </div>
                <span v-else class="text-grey">-</span>
              </td>
              <td>
                <div v-if="item.products && item.products.length > 0">
                  <div v-for="(product, pIdx) in item.products" :key="`labor-${index}-${pIdx}`" 
                    class="mb-1" :class="{'mt-2': pIdx > 0}">
                    <span v-if="product.laborCode" class="font-weight-bold" :class="'text-' + getLaborCodeColor(product.laborCode)">
                      {{ product.laborCode }}
                    </span>
                    <span v-else class="text-grey text-caption">-</span>
                  </div>
                </div>
                <span v-else class="text-grey">-</span>
              </td>
              <td>
                <div v-if="item.products && item.products.length > 0">
                  <div v-for="(product, pIdx) in item.products" :key="`priority-${index}-${pIdx}`" 
                    class="mb-1" :class="{'mt-2': pIdx > 0}">
                    <v-chip v-if="product.priority" size="small" :color="getPriorityColor(product.priority)" variant="flat">
                      <v-icon start size="x-small">{{ getPriorityIcon(product.priority) }}</v-icon>
                      {{ product.priority }}
                    </v-chip>
                    <span v-else class="text-grey text-caption">-</span>
                  </div>
                </div>
              </td>
              <td>
                <div class="operator-drop-zone">
                  <!-- 按品號分組顯示操作人員 -->
                  <template v-if="item.products && item.products.length > 0">
                    <div v-for="(product, pIdx) in item.products" :key="`product-operators-${index}-${pIdx}`" 
                      class="product-operator-zone mb-2" 
                      :class="{'mt-2': pIdx > 0}"
                      @dragover.prevent="onProductDragOver($event, item, pIdx)"
                      @dragleave="onProductDragLeave($event)"
                      @drop.stop="onProductDrop($event, item, pIdx)">
                      <div v-if="product.operators && product.operators.length > 0">
                        <div v-for="(operator, opIdx) in product.operators" :key="`op-${index}-${pIdx}-${opIdx}`" 
                          class="d-flex align-center mb-1">
                          <v-tooltip location="top">
                            <template #activator="{ props: tooltipProps }">
                              <v-chip size="default" color="indigo"
                                variant="elevated" class="draggable-chip" :draggable="true"
                                v-bind="tooltipProps"
                                @dragstart="onDragStart($event, operator.name, item, pIdx, opIdx)"
                                @dragend="onDragEnd">
                                <v-icon start size="small">mdi-account</v-icon>
                                {{ operator.name }}
                                <v-chip v-if="item.products.length > 1" size="x-small" color="info" variant="flat" class="ml-1">
                                  {{ pIdx + 1 }}
                                </v-chip>
                              </v-chip>
                            </template>
                            <div>
                              <div v-if="product.productCode" class="font-weight-bold mb-1">品號：{{ product.productCode }}</div>
                              <div v-if="getOperatorSkills(operator.snkey)">
                                <div class="font-weight-bold mb-1">精通品號：</div>
                                <div>{{ getOperatorSkills(operator.snkey) }}</div>
                              </div>
                              <div v-else>無精通品號</div>
                            </div>
                          </v-tooltip>
                          <v-chip v-if="operator.startTime || operator.endTime" size="small" color="teal" variant="tonal" class="ml-2">
                            <v-icon start size="x-small">mdi-clock-outline</v-icon>
                            {{ formatOperatorTime(operator.startTime, operator.endTime) }}
                          </v-chip>
                        </div>
                      </div>
                    </div>
                  </template>
                  <span v-if="getAllOperators(item).length === 0" class="text-grey drop-hint">-</span>
                </div>
              </td>
              <td>
                <v-chip size="default" :color="getStatusColor(getOverallStatus(item))" variant="flat">
                  {{ getOverallStatus(item) }}
                </v-chip>
              </td>
              <td>
                <div v-if="item.products && item.products.length > 0">
                  <div v-for="(product, pIdx) in item.products" :key="`remark-${index}-${pIdx}`" 
                    class="mb-1" :class="{'mt-2': pIdx > 0}">
                    <span v-if="product.remark" class="text-caption">{{ product.remark }}</span>
                    <span v-else class="text-grey text-caption">-</span>
                  </div>
                </div>
                <span v-else class="text-grey">-</span>
              </td>
              <td>
                <v-btn icon="mdi-pencil" size="x-small" variant="text" @click="editItem(item)"></v-btn>
              </td>
            </tr>
          </tbody>
        </v-table>
      </v-card-text>
    </v-card>

    <!-- 複製/移動/交換選擇對話框 -->
    <v-dialog v-model="copyMoveDialog" max-width="500px" persistent>
      <v-card>
        <v-card-title class="dialog-title">
          <span>選擇操作方式</span>
        </v-card-title>
        <v-card-text class="pt-4">
          <div class="text-body-1 mb-4">
            <template v-if="pendingDropData?.isSameMachine">
              在 <strong class="text-primary">{{ pendingDropData?.sourceItem?.machineName }}</strong> 內操作 
              <strong class="text-primary">{{ pendingDropData?.name }}</strong>
            </template>
            <template v-else>
              將 <strong class="text-primary">{{ pendingDropData?.name }}</strong> 
              從 <strong class="text-primary">{{ pendingDropData?.sourceItem?.machineName }}</strong> 
              到 <strong class="text-primary">{{ pendingDropData?.targetItem?.machineName }}</strong>
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
                    <template v-if="pendingDropData?.isSameMachine">
                      人員從來源品號移除，加入目標品號
                    </template>
                    <template v-else>
                      人員從來源機台移除，加入目標機台
                    </template>
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
                    <template v-if="pendingDropData?.isSameMachine">
                      人員保留在來源品號，同時加入目標品號
                    </template>
                    <template v-else>
                      人員同時存在於兩個機台
                    </template>
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
                    <template v-if="pendingDropData?.isSameMachine">
                      兩個品號的所有操作人員互相交換
                    </template>
                    <template v-else>
                      兩個機台指定品號的所有操作人員互相交換
                    </template>
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

    <!-- 品號選擇對話框（從剩餘人力拖入時） -->
    <v-dialog v-model="productSelectDialog" max-width="500px" persistent>
      <v-card>
        <v-card-title class="dialog-title">
          <v-icon class="mr-2">mdi-package-variant</v-icon>
          <span>選擇要加入的品號</span>
        </v-card-title>
        <v-card-text class="pt-4">
          <div class="text-body-1 mb-4">
            將 <strong class="text-primary">{{ pendingRemainingData?.operatorName }}</strong> 
            加入到 <strong class="text-primary">{{ pendingRemainingData?.targetItem?.machineName }}</strong> 的哪個品號？
          </div>
          <v-radio-group v-model="selectedProductIdx" class="product-radio-group">
            <v-radio 
              v-for="(product, idx) in pendingRemainingData?.targetItem?.products" 
              :key="idx" 
              :value="idx" 
              color="primary">
              <template #label>
                <div class="product-option">
                  <div class="d-flex align-center mb-1">
                    <v-chip size="small" color="primary" variant="tonal" class="mr-2">
                      品號 {{ idx + 1 }}
                    </v-chip>
                    <span class="font-weight-bold text-h6">{{ product.productCode || '(未設定)' }}</span>
                  </div>
                  <div class="text-caption text-grey ml-1">
                    <v-icon size="x-small" class="mr-1">mdi-flag-variant</v-icon>
                    優先: {{ product.priority || '空白' }}
                    <v-icon size="x-small" class="ml-2 mr-1">mdi-wrench</v-icon>
                    代碼: {{ product.laborCode || '無' }}
                    <v-icon size="x-small" class="ml-2 mr-1">mdi-account</v-icon>
                    人員: {{ product.operators?.length || 0 }}人
                  </div>
                </div>
              </template>
            </v-radio>
          </v-radio-group>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn color="grey" variant="text" @click="cancelProductSelect">取消</v-btn>
          <v-btn color="primary" variant="flat" @click="confirmProductSelect" :disabled="selectedProductIdx === null">
            確認加入
          </v-btn>
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
import { ref, computed, onMounted, watch } from 'vue'
import api from '@/assets/js/api.js'
import { useStore } from '@/stores/useStore'
import dayjs from 'dayjs'
import ScheduleEditDialog from './ScheduleEditDialog.vue'
// 不再使用格式轉換，統一使用新格式

const store = useStore()

// Props
const props = defineProps({
  selectedDate: {
    type: String,
    required: true
  },
  selectedShift: {
    type: String,
    required: true
  },
  operators: {
    type: Array,
    default: () => []
  },
  productCodes: {
    type: Array,
    default: () => []
  }
})

// Emits
const emit = defineEmits(['update'])

// 響應式數據
const scheduleResults = ref([])
const loading = ref(false)
const searchKey = ref('')
const editDialog = ref(false)
const editingItem = ref(null)

// 監聽 props.productCodes 變化
watch(() => props.productCodes, (newVal) => {
  console.log('[TableView-watch] productCodes 變化:', newVal?.length, '筆')
  if (newVal && newVal.length > 0) {
    console.log('[TableView-watch] 第一筆資料:', newVal[0])
  }
}, { immediate: true })

// 拖拉相關
const dragData = ref(null)
const isDragging = ref(false)
const copyMoveDialog = ref(false)
const dropAction = ref('move')
const pendingDropData = ref(null)

// 品號選擇對話框相關
const productSelectDialog = ref(false)
const pendingRemainingData = ref(null)
const selectedProductIdx = ref(null)

// 載入排班資料
const loadSchedule = async () => {
  if (!props.selectedDate || !props.selectedShift) return
  
  loading.value = true
  try {
    const rs = await api.get('schedule')
    if (rs && rs.length > 0) {
      // 過濾出符合日期和時段的排班，直接使用新格式
      scheduleResults.value = rs
        .map(i => ({
          ...JSON.parse(i.datalist),
          snkey: i.snkey
        }))
        .filter(item => item.date === props.selectedDate && item.shift === props.selectedShift)
      
      console.log('[TableView-loadSchedule] 讀取到的資料（新格式）:', scheduleResults.value)
    } else {
      scheduleResults.value = []
    }
  } catch (error) {
    console.error('載入排班錯誤:', error)
    scheduleResults.value = []
  } finally {
    loading.value = false
  }
}

// 監聽日期和時段變化，重新載入資料
watch([() => props.selectedDate, () => props.selectedShift], () => {
  loadSchedule()
}, { immediate: false })

// 生命週期
onMounted(() => {
  loadSchedule()
})

// 暴露方法給父元件
defineExpose({
  loadSchedule
})


// 過濾後的結果（按機台編號排序）
const filteredResults = computed(() => {
  let results = [...scheduleResults.value]
  
  // 按機台編號排序（新格式使用 machineNumber）
  results.sort((a, b) => {
    const numA = parseInt(a.machineNumber) || 0
    const numB = parseInt(b.machineNumber) || 0
    return numA - numB
  })
  
  if (!searchKey.value) return results

  const keyword = searchKey.value.toUpperCase()
  return results.filter(item => {
    const str = JSON.stringify(item).toUpperCase()
    return str.includes(keyword)
  })
})

// 輔助函數：取得第一個品號
const getFirstProductCode = (item) => {
  if (!item.products || item.products.length === 0) return ''
  return item.products[0].productCode || ''
}

// 取得第一個人力代碼
const getFirstLaborCode = (item) => {
  if (!item.products || item.products.length === 0) return ''
  return item.products[0].laborCode || ''
}

// 取得第一個優先級
const getFirstPriority = (item) => {
  if (!item.products || item.products.length === 0) return ''
  return item.products[0].priority || ''
}

// 取得第一個備註
const getFirstRemark = (item) => {
  if (!item.products || item.products.length === 0) return ''
  return item.products[0].remark || ''
}

// 取得所有操作人員（跨所有品號）
const getAllOperators = (item) => {
  if (!item.products || item.products.length === 0) return []
  const allOperators = []
  item.products.forEach((product, pIdx) => {
    if (product.operators && product.operators.length > 0) {
      product.operators.forEach((op, opIdx) => {
        allOperators.push({
          ...op,
          productIdx: pIdx,
          opIdx: opIdx
        })
      })
    }
  })
  return allOperators
}

// 取得整體狀態
const getOverallStatus = (item) => {
  if (!item.products || item.products.length === 0) return '待排'
  
  // 如果有任何一個是已排，就顯示已排
  if (item.products.some(p => p.status === '已排')) {
    return '已排'
  }
  
  // 如果有任何一個是人力不足
  if (item.products.some(p => p.status === '人力不足')) {
    return '人力不足'
  }
  
  // 如果全部都是自動
  if (item.products.every(p => p.status === '自動')) {
    return '自動'
  }
  
  // 返回第一個品號的狀態
  return item.products[0].status || '待排'
}

// 格式化操作人員時間
const formatOperatorTime = (startTime, endTime) => {
  if (startTime && endTime) {
    return `${startTime} - ${endTime}`
  } else if (startTime) {
    return `${startTime} -`
  } else if (endTime) {
    return `- ${endTime}`
  }
  return ''
}

// 方法
const editItem = (item) => {
  console.log('[TableView-editItem] 開始編輯機台:', item.machineName)
  // 直接使用新格式，深拷貝
  editingItem.value = JSON.parse(JSON.stringify(item))
  editDialog.value = true
}

// 處理編輯儲存（從共用組件回傳）
const handleEditSave = (dataToSave) => {
  console.log('[TableView-handleEditSave] 收到儲存資料:', dataToSave)
  
  // 更新本地資料
  const index = scheduleResults.value.findIndex(r => r.machineSnkey === dataToSave.machineSnkey)
  if (index !== -1) {
    console.log('[TableView-handleEditSave] 找到索引:', index)
    Object.assign(scheduleResults.value[index], dataToSave)
    console.log('[TableView-handleEditSave] 更新後的資料:', scheduleResults.value[index])
  } else {
    console.error('[TableView-handleEditSave] 找不到對應的機台索引，machineSnkey:', dataToSave.machineSnkey)
  }
  
  // 通知父層更新
  emit('update', dataToSave)
}

const getLaborCodeColor = (code) => {
  if (!code) return 'grey'
  if (code.includes('手')) return 'deep-orange'
  if (code === '自') return 'teal'
  if (code.includes('自')) return 'cyan'
  return 'grey'
}

const getLaborCodeIcon = (code) => {
  if (!code) return 'mdi-help'
  if (code.includes('手')) return 'mdi-hand-back-right'
  if (code.includes('自')) return 'mdi-robot'
  return 'mdi-cog'
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

const getOperatorSkills = (snkey) => {
  if (!snkey) return ''
  const operator = props.operators.find(op => op.snkey === snkey)
  if (operator && operator.對應品號 && operator.對應品號.length > 0) {
    return operator.對應品號.join(', ')
  }
  return ''
}

// 已移除，使用 formatOperatorTime 代替

// 拖拉方法（新格式：需要品號索引和操作人員索引）
const onDragStart = (event, name, sourceItem, productIdx, opIdx) => {
  dragData.value = { name, sourceItem, productIdx, opIdx }
  event.dataTransfer.effectAllowed = 'move'
  event.target.classList.add('dragging')
  isDragging.value = true
}

const onDragEnd = (event) => {
  dragData.value = null
  isDragging.value = false
  document.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'))
  document.querySelectorAll('.dragging').forEach(el => el.classList.remove('dragging'))
}

// 移除區域事件
const onRemoveZoneDragOver = (event) => {
  event.currentTarget.classList.add('remove-zone-active')
}

const onRemoveZoneDragLeave = (event) => {
  event.currentTarget.classList.remove('remove-zone-active')
}

const onRemoveZoneDrop = async (event) => {
  event.currentTarget.classList.remove('remove-zone-active')
  isDragging.value = false
  
  if (!dragData.value) return
  
  const { name, sourceItem, productIdx, opIdx } = dragData.value
  
  // 從來源機台的指定品號移除人員（新格式）
  if (sourceItem && sourceItem.products && sourceItem.products[productIdx]) {
    const product = sourceItem.products[productIdx]
    if (product.operators && product.operators[opIdx]) {
      product.operators.splice(opIdx, 1)
      
      // 更新品號狀態
      if (product.operators.length === 0) {
        product.status = '待排'
      }
      
      // 如果有 snkey，透過 API 更新資料庫
      if (sourceItem.snkey) {
        console.log('--- [移除人員] 開始更新 ---')
        console.log('機台:', sourceItem.machineName, ', snkey:', sourceItem.snkey)
        console.log('移除人員:', name, ', 品號:', product.productCode)
        try {
          const payload = {
            snkey: sourceItem.snkey,
            datalist: JSON.stringify({
              ...sourceItem,
              editInfo: [...(sourceItem.editInfo || []), {
                name: store.state.pData?.username || 'system',
                time: dayjs().format('YYYY-MM-DD HH:mm:ss'),
                action: '移除人員'
              }]
            })
          }
          console.log('[移除人員] POST payload:', payload)
          const rs = await api.post('schedule', payload)
          console.log('[移除人員] POST 結果:', rs)
          console.log('--- [移除人員] 更新完成 ---')
        } catch (error) {
          console.error('[移除人員] 更新失敗:', error)
        }
      }
      
      emit('update', sourceItem)
    }
  }
  
  dragData.value = null
}

const onDragOver = (event) => {
  event.currentTarget.classList.add('drag-over')
}

const onDragLeave = (event) => {
  event.currentTarget.classList.remove('drag-over')
}

// 品號區域拖放事件
const onProductDragOver = (event, targetItem, productIdx) => {
  event.currentTarget.classList.add('product-drag-over')
}

const onProductDragLeave = (event) => {
  event.currentTarget.classList.remove('product-drag-over')
}

const onProductDrop = async (event, targetItem, productIdx) => {
  event.currentTarget.classList.remove('product-drag-over')
  
  // 檢查是否從剩餘人力拖入
  const remainingData = event.dataTransfer.getData('remainingOperator')
  if (remainingData) {
    const { snkey, name } = JSON.parse(remainingData)
    
    // 檢查目標機台是否已有此人員（在任何品號中）
    const hasOperator = targetItem.products?.some(p => 
      p.operators?.some(op => op.name === name)
    )
    
    if (hasOperator) {
      proxy.$swal({ 
        icon: "warning", 
        title: "無法操作", 
        text: `${name} 已存在於此機台中`
      })
      return
    }
    
    // 直接加入到指定的品號
    await addOperatorToProduct(targetItem, productIdx, snkey, name)
    return
  }
  
  // 檢查是否從機台間拖拉（人員 chip）
  if (!dragData.value) return
  
  const { name, snkey, sourceItem, productIdx: sourcePIdx, operatorIdx } = dragData.value
  
  // 檢查是否拖到同一機台的同一品號
  if (sourceItem.machineSnkey === targetItem.machineSnkey && sourcePIdx === productIdx) {
    // 同機台同品號，不允許操作
    dragData.value = null
    return
  }
  
  // 如果是不同機台，檢查目標機台是否已有此人員
  if (sourceItem.machineSnkey !== targetItem.machineSnkey) {
    const hasOperator = targetItem.products?.some(p => 
      p.operators?.some(op => op.name === name)
    )
    
    if (hasOperator) {
      proxy.$swal({ 
        icon: "warning", 
        title: "無法操作", 
        text: `${name} 已存在於此機台中`
      })
      dragData.value = null
      return
    }
  }
  
  // 保存拖放資訊，顯示選擇對話框（移動或複製）
  pendingDropData.value = {
    name,
    snkey,
    sourceItem: { ...sourceItem },
    targetItem: { ...targetItem },
    productIdx: sourcePIdx,
    operatorIdx,
    targetProductIdx: productIdx, // 記錄目標品號索引
    action: dropAction.value,
    isSameMachine: sourceItem.machineSnkey === targetItem.machineSnkey // 標記是否同機台
  }
  dropAction.value = 'move' // 預設為移動
  copyMoveDialog.value = true
}

const onDrop = async (event, targetItem) => {
  event.currentTarget.classList.remove('drag-over')
  
  // 檢查是否從剩餘人力拖入
  const remainingData = event.dataTransfer.getData('remainingOperator')
  if (remainingData) {
    const { snkey, name } = JSON.parse(remainingData)
    
    // 檢查目標機台是否已有此人員（在任何品號中）
    const hasOperator = targetItem.products?.some(p => 
      p.operators?.some(op => op.name === name)
    )
    
    if (hasOperator) {
      proxy.$swal({ 
        icon: "warning", 
        title: "無法操作", 
        text: `${name} 已存在於此機台中`
      })
      return
    }
    
    // 確保目標有 products 陣列
    if (!targetItem.products || targetItem.products.length === 0) {
      targetItem.products = [{
        productCode: '',
        priority: '空白',
        laborCode: '',
        operators: [],
        status: '待排',
        remark: ''
      }]
    }
    
    // 如果有多個品號，顯示選擇對話框
    if (targetItem.products.length > 1) {
      pendingRemainingData.value = {
        operatorSnkey: snkey,
        operatorName: name,
        targetItem: JSON.parse(JSON.stringify(targetItem)) // 深拷貝用於顯示
      }
      selectedProductIdx.value = 0 // 預設選擇第一個品號
      productSelectDialog.value = true
    } else {
      // 只有一個品號，直接加入
      await addOperatorToProduct(targetItem, 0, snkey, name)
    }
    
    return
  }
  
  // 以下是原本的機台間拖拉邏輯
  if (!dragData.value) return
  
  const { name, snkey, sourceItem, productIdx, operatorIdx } = dragData.value
  
  // 檢查是否已存在（在任何品號中）
  const hasOperator = targetItem.products?.some(p => 
    p.operators?.some(op => op.name === name)
  )
  
  if (hasOperator) {
    proxy.$swal({ 
      icon: "warning", 
      title: "無法操作", 
      text: `${name} 已存在於此機台中`
    })
    dragData.value = null
    return
  }
  
  // 保存拖放資訊，顯示選擇對話框
  pendingDropData.value = {
    name,
    snkey,
    sourceItem: { ...sourceItem },
    targetItem: { ...targetItem },
    productIdx,
    operatorIdx,
    action: dropAction.value
  }
  dropAction.value = 'move' // 預設為移動
  copyMoveDialog.value = true
}

// 將操作人員加入指定品號（從剩餘人力）
const addOperatorToProduct = async (targetItem, productIdx, operatorSnkey, operatorName) => {
  // 找到實際的資料引用
  const actualTargetItem = scheduleResults.value.find(r => r.machineSnkey === targetItem.machineSnkey)
  
  if (!actualTargetItem || !actualTargetItem.products || !actualTargetItem.products[productIdx]) {
    console.error('[表格-從剩餘人力拖入] 找不到目標品號')
    proxy.$swal({ icon: "error", title: "操作失敗", text: "找不到目標品號" })
    return
  }
  
  const targetProduct = actualTargetItem.products[productIdx]
  
  // 確保 operators 陣列存在
  if (!targetProduct.operators) {
    targetProduct.operators = []
  }
  
  // 加入操作人員
  targetProduct.operators.push({
    name: operatorName,
    snkey: String(operatorSnkey || ''),
    startTime: '',
    endTime: ''
  })
  
  // 更新品號狀態
  if (targetProduct.status === '待排' || targetProduct.status === '無可用人力' || targetProduct.status === '人力不足') {
    targetProduct.status = '已排'
  }
  
  // 透過 API 更新資料庫
  if (actualTargetItem.snkey) {
    console.log('--- [表格-從剩餘人力拖入] 開始更新 ---')
    console.log('目標機台:', actualTargetItem.machineName)
    console.log('品號索引:', productIdx, ', 品號:', targetProduct.productCode)
    console.log('新增人員:', operatorName)
    try {
      const payload = {
        snkey: actualTargetItem.snkey,
        datalist: JSON.stringify({
          ...actualTargetItem,
          editInfo: [...(actualTargetItem.editInfo || []), {
            name: store.state.pData?.username || 'system',
            time: dayjs().format('YYYY-MM-DD HH:mm:ss'),
            action: `新增人員 - ${targetProduct.productCode || '品號' + (productIdx + 1)} - ${operatorName}`
          }]
        })
      }
      console.log('[表格-從剩餘人力拖入] POST payload:', payload)
      const rs = await api.post('schedule', payload)
      console.log('[表格-從剩餘人力拖入] POST 結果:', rs)
      console.log('--- [表格-從剩餘人力拖入] 更新完成 ---')
      
      // 顯示成功訊息
      proxy.$swal({ 
        icon: "success", 
        title: "加入成功", 
        text: `已將 ${operatorName} 加入到 ${actualTargetItem.machineName} 的品號 ${targetProduct.productCode || (productIdx + 1)}`
      })
    } catch (error) {
      console.error('[表格-從剩餘人力拖入] 更新失敗:', error)
      proxy.$swal({ 
        icon: "error", 
        title: "更新失敗", 
        text: error.message || '未知錯誤'
      })
    }
  }
  
  emit('update', actualTargetItem)
}

// 確認品號選擇（從剩餘人力拖入）
const confirmProductSelect = async () => {
  if (!pendingRemainingData.value || selectedProductIdx.value === null) {
    productSelectDialog.value = false
    return
  }
  
  const { operatorSnkey, operatorName, targetItem } = pendingRemainingData.value
  
  // 找到實際的目標機台
  const actualTargetItem = scheduleResults.value.find(r => r.machineSnkey === targetItem.machineSnkey)
  
  if (!actualTargetItem) {
    console.error('[表格-品號選擇] 找不到目標機台')
    productSelectDialog.value = false
    pendingRemainingData.value = null
    selectedProductIdx.value = null
    return
  }
  
  // 加入人員到選定的品號
  await addOperatorToProduct(actualTargetItem, selectedProductIdx.value, operatorSnkey, operatorName)
  
  // 重置
  productSelectDialog.value = false
  pendingRemainingData.value = null
  selectedProductIdx.value = null
}

// 取消品號選擇
const cancelProductSelect = () => {
  productSelectDialog.value = false
  pendingRemainingData.value = null
  selectedProductIdx.value = null
}

// 確認拖放操作（新格式）
const confirmDrop = async () => {
  if (!pendingDropData.value) {
    copyMoveDialog.value = false
    return
  }
  
  const { name, sourceItem: sourceItemData, targetItem: targetItemData, productIdx, opIdx, targetProductIdx, isSameMachine } = pendingDropData.value
  const isCopy = dropAction.value === 'copy'
  
  // 找到實際的資料引用
  const sourceItem = scheduleResults.value.find(r => r.machineSnkey === sourceItemData.machineSnkey)
  const targetItem = scheduleResults.value.find(r => r.machineSnkey === targetItemData.machineSnkey)
  
  if (!sourceItem || !targetItem) {
    copyMoveDialog.value = false
    pendingDropData.value = null
    dragData.value = null
    return
  }
  
  // 確保目標有 products 陣列
  if (!targetItem.products || targetItem.products.length === 0) {
    targetItem.products = [{
      productCode: '',
      priority: '空白',
      laborCode: '',
      operators: [],
      status: '待排',
      remark: ''
    }]
  }
  
  const sourceProduct = sourceItem.products[productIdx]
  // 使用指定的品號索引，如果沒有指定則使用第一個品號
  const targetPIdx = targetProductIdx !== undefined ? targetProductIdx : 0
  const targetProduct = targetItem.products[targetPIdx]
  
  if (!sourceProduct || !sourceProduct.operators || !sourceProduct.operators[opIdx]) {
    copyMoveDialog.value = false
    pendingDropData.value = null
    dragData.value = null
    return
  }
  
  const sourceOperator = sourceProduct.operators[opIdx]
  
  // 確保目標品號有 operators 陣列
  if (!targetProduct.operators) {
    targetProduct.operators = []
  }
  
  // 檢查是否為交換操作
  const isSwap = dropAction.value === 'swap'
  
  // 只有在不是交換時，才執行移動/複製邏輯
  if (!isSwap) {
    // 添加到目標品號
    targetProduct.operators.push({
      snkey: String(sourceOperator.snkey || ''),
      name: sourceOperator.name,
      startTime: sourceOperator.startTime || '',
      endTime: sourceOperator.endTime || ''
    })
    
    // 如果不是複製，從來源移除
    if (!isCopy) {
      sourceProduct.operators.splice(opIdx, 1)
      
      // 更新來源品號狀態
      if (sourceProduct.operators.length === 0) {
        sourceProduct.status = '待排'
      }
    }
    
    // 更新目標品號狀態：如果原本是待排、無可用人力或人力不足，加入人員後改為已排
    if (targetProduct.status === '待排' || targetProduct.status === '無可用人力' || targetProduct.status === '人力不足') {
      targetProduct.status = '已排'
    }
  }
  
  // 透過 API 更新資料
  if (isSameMachine) {
    // 同機台內的品號間操作
    const isSwap = dropAction.value === 'swap'
    const operationType = isSwap ? '交換' : (isCopy ? '複製' : '移動')
    
    console.log(`--- [表格-同機台品號間${operationType}] 開始更新 ---`)
    console.log('機台:', sourceItem.machineName)
    console.log(`從品號 ${productIdx + 1} ${operationType}到品號 ${targetPIdx + 1}`)
    if (!isSwap) console.log('人員:', name)
    
    if (sourceItem.snkey) {
      try {
        const sourceProduct = sourceItem.products[productIdx]
        const targetProduct = sourceItem.products[targetPIdx]
        
        let actionText = ''
        let successText = ''
        
        if (isSwap) {
          // 交換邏輯：互換兩個品號的所有操作人員
          const sourceOperators = [...(sourceProduct.operators || [])]
          const targetOperators = [...(targetProduct.operators || [])]
          
          sourceProduct.operators = targetOperators
          targetProduct.operators = sourceOperators
          
          // 更新兩個品號的狀態
          sourceProduct.status = sourceOperators.length > 0 ? '已排' : '待排'
          targetProduct.status = targetOperators.length > 0 ? '已排' : '待排'
          
          actionText = `交換品號人員 (${sourceProduct.productCode || '品號' + (productIdx + 1)} ⇄ ${targetProduct.productCode || '品號' + (targetPIdx + 1)})`
          successText = `已交換 ${sourceProduct.productCode || '品號' + (productIdx + 1)} 和 ${targetProduct.productCode || '品號' + (targetPIdx + 1)} 的操作人員`
        } else {
          // 移動或複製邏輯（原有的）
          actionText = `${isCopy ? '複製' : '移動'}人員 - ${name} (${sourceProduct.productCode || '品號' + (productIdx + 1)} → ${targetProduct.productCode || '品號' + (targetPIdx + 1)})`
          successText = `已將 ${name} 從品號 ${sourceProduct.productCode || (productIdx + 1)} ${isCopy ? '複製' : '移動'}到品號 ${targetProduct.productCode || (targetPIdx + 1)}`
        }
        
        const payload = {
          snkey: sourceItem.snkey,
          datalist: JSON.stringify({
            ...sourceItem,
            editInfo: [...(sourceItem.editInfo || []), {
              name: store.state.pData?.username || 'system',
              time: dayjs().format('YYYY-MM-DD HH:mm:ss'),
              action: actionText
            }]
          })
        }
        console.log('[表格-同機台] POST payload:', payload)
        const rs = await api.post('schedule', payload)
        console.log('[表格-同機台] POST 結果:', rs)
        
        // 顯示成功訊息
        proxy.$swal({ 
          icon: "success", 
          title: `${operationType}成功`, 
          text: successText
        })
      } catch (error) {
        console.error('[表格-同機台] 更新失敗:', error)
        proxy.$swal({ icon: "error", title: "更新失敗", text: error.message })
      }
    }
    console.log(`--- [表格-同機台品號間${operationType}] 更新完成 ---`)
    
    // 發送更新事件
    emit('update', sourceItem)
  } else {
    // 不同機台間的操作
    const isSwap = dropAction.value === 'swap'
    const operationType = isSwap ? '交換' : (isCopy ? '複製' : '移動')
    
    console.log(`--- [表格-機台間${operationType}] 開始更新 ---`)
    console.log('來源機台:', sourceItem.machineName, ', snkey:', sourceItem.snkey)
    console.log('目標機台:', targetItem.machineName, ', snkey:', targetItem.snkey)
    if (!isSwap) console.log(`${isCopy ? '複製' : '移動'}人員:`, name)
    
    if (isSwap) {
      // 交換邏輯：互換兩個機台指定品號的所有操作人員
      const sourceProduct = sourceItem.products[productIdx]
      const targetProduct = targetItem.products[targetPIdx]
      
      const sourceOperators = [...(sourceProduct.operators || [])]
      const targetOperators = [...(targetProduct.operators || [])]
      
      sourceProduct.operators = targetOperators
      targetProduct.operators = sourceOperators
      
      // 更新兩個品號的狀態
      sourceProduct.status = sourceOperators.length > 0 ? '已排' : '待排'
      targetProduct.status = targetOperators.length > 0 ? '已排' : '待排'
      
      // 更新來源機台資料
      if (sourceItem.snkey) {
        console.log('[表格-來源機台] 準備 POST...')
        try {
          const payload = {
            snkey: sourceItem.snkey,
            datalist: JSON.stringify({
              ...sourceItem,
              editInfo: [...(sourceItem.editInfo || []), {
                name: store.state.pData?.username || 'system',
                time: dayjs().format('YYYY-MM-DD HH:mm:ss'),
                action: `交換品號人員 - ${sourceProduct.productCode || '品號' + (productIdx + 1)} ⇄ ${targetItem.machineName} 的 ${targetProduct.productCode || '品號' + (targetPIdx + 1)}`
              }]
            })
          }
          console.log('[表格-來源機台] POST payload:', payload)
          const rs = await api.post('schedule', payload)
          console.log('[表格-來源機台] POST 結果:', rs)
        } catch (error) {
          console.error('[表格-來源機台] 更新失敗:', error)
          proxy.$swal({ icon: "error", title: "更新來源機台失敗", text: error.message })
        }
      }
      
      // 更新目標機台資料
      if (targetItem.snkey) {
        console.log('[表格-目標機台] 準備 POST...')
        try {
          const payload = {
            snkey: targetItem.snkey,
            datalist: JSON.stringify({
              ...targetItem,
              editInfo: [...(targetItem.editInfo || []), {
                name: store.state.pData?.username || 'system',
                time: dayjs().format('YYYY-MM-DD HH:mm:ss'),
                action: `交換品號人員 - ${targetProduct.productCode || '品號' + (targetPIdx + 1)} ⇄ ${sourceItem.machineName} 的 ${sourceProduct.productCode || '品號' + (productIdx + 1)}`
              }]
            })
          }
          console.log('[表格-目標機台] POST payload:', payload)
          const rs = await api.post('schedule', payload)
          console.log('[表格-目標機台] POST 結果:', rs)
        } catch (error) {
          console.error('[表格-目標機台] 更新失敗:', error)
          proxy.$swal({ icon: "error", title: "更新目標機台失敗", text: error.message })
        }
      }
      
      // 顯示成功訊息
      proxy.$swal({ 
        icon: "success", 
        title: "交換成功", 
        text: `已交換 ${sourceItem.machineName} 的品號 ${sourceProduct.productCode || (productIdx + 1)} 和 ${targetItem.machineName} 的品號 ${targetProduct.productCode || (targetPIdx + 1)} 的操作人員`
      })
      
      console.log(`--- [表格-機台間交換] 更新完成 ---`)
      
      // 發送更新事件
      emit('update', sourceItem)
      emit('update', targetItem)
    } else {
      // 移動或複製邏輯（原有的）
      // 如果是移動，更新來源資料
      if (!isCopy && sourceItem.snkey) {
        console.log('[來源機台] 準備 POST...')
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
          console.log('[來源機台] POST payload:', payload)
          const rs = await api.post('schedule', payload)
          console.log('[來源機台] POST 結果:', rs)
        } catch (error) {
          console.error('[來源機台] 更新失敗:', error)
        }
      }
      
      // 更新目標資料
      if (targetItem.snkey) {
        console.log('[目標機台] 準備 POST...')
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
          console.log('[目標機台] POST payload:', payload)
          const rs = await api.post('schedule', payload)
          console.log('[目標機台] POST 結果:', rs)
          
          // 顯示成功訊息
          proxy.$swal({ 
            icon: "success", 
            title: `${isCopy ? '複製' : '移動'}成功`, 
            text: `已將 ${name} ${isCopy ? '複製' : '移動'}到 ${targetItem.machineName}`
          })
        } catch (error) {
          console.error('[目標機台] 更新失敗:', error)
          proxy.$swal({ icon: "error", title: "更新失敗", text: error.message })
        }
      }
      console.log(`--- [機台間拖拉-${isCopy ? '複製' : '移動'}] 更新完成 ---`)
      
      // 發送更新事件
      if (!isCopy) {
        emit('update', sourceItem)
      }
      emit('update', targetItem)
    }
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
</script>

<style scoped lang="scss">
.table-view {
  width: 100%;
}

.schedule-table-card {
  border-radius: 24px;
  box-shadow: 0 14px 40px rgba(74, 107, 95, 0.14);
  border: 1px solid rgba(91, 143, 163, 0.16);
}

.schedule-table {
  font-size: 1rem;
  
  th {
    background-color: rgb(240, 245, 243) !important;
    font-weight: 600;
    white-space: nowrap;
    font-size: 1rem;
  }

  td {
    font-size: 1rem;
    padding: 12px 16px;
  }

  tbody tr:hover {
    background-color: rgba(74, 107, 95, 0.04);
  }
}

.highlight-row {
  background-color: rgba(255, 152, 0, 0.08);
}

.dialog-title {
  background: linear-gradient(135deg, rgba(74, 107, 95, 0.95), rgba(123, 163, 184, 0.85));
  color: white;
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

.operator-drop-zone {
  min-height: 36px;
  min-width: 80px;
  padding: 4px;
  border-radius: 8px;
  border: 2px dashed transparent;
  transition: all 0.2s ease;
  
  &.drag-over {
    border-color: #3f51b5;
    background-color: rgba(63, 81, 181, 0.1);
  }
}

// 品號操作人員區域拖放樣式
.product-operator-zone {
  min-height: 36px;
  padding: 8px;
  border-radius: 8px;
  border: 2px dashed transparent;
  transition: all 0.3s ease;
  position: relative;
  
  &:hover {
    background: rgba(63, 81, 181, 0.05);
    border-color: rgba(63, 81, 181, 0.2);
  }
  
  // 拖拉經過時的樣式
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
      border-radius: 6px;
      font-weight: bold;
      font-size: 12px;
      pointer-events: none;
      z-index: 10;
      white-space: nowrap;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    }
  }
}

.drop-hint {
  line-height: 28px;
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

// 品號選擇對話框樣式
.product-radio-group {
  .product-option {
    padding: 8px 12px;
    border-radius: 8px;
    transition: all 0.2s ease;
    
    &:hover {
      background: rgba(63, 81, 181, 0.05);
    }
  }
}

// 操作方式選項樣式
.operation-option {
  padding: 8px 0;
  width: 100%;
}

</style>

