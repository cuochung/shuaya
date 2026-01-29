<template>
  <div class="list-view">
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

    <v-card class="schedule-list-card">
      <v-card-title>
        <div class="d-flex align-center justify-space-between">
          <span>排班列表</span>
          <v-chip v-if="selectedDate && selectedShift" color="primary" variant="flat" size="small">
            {{ selectedDate }} {{ selectedShift }}班
          </v-chip>
        </div>
      </v-card-title>
      <v-card-text>
        <v-row>
          <v-col v-for="(item, index) in sortedResults" :key="index" cols="12" sm="6" md="4" lg="3">
            <v-card class="machine-card" :class="`machine-card--${getOverallStatus(item)}`" elevation="2">
              <v-card-title class="d-flex align-center pa-3" @click="editItem(item)" style="cursor: pointer;">
                <span class="text-h6 font-weight-bold">{{ item.machineNumber }} - {{ item.machineName }}</span>
              </v-card-title>
              <v-divider></v-divider>
              <v-card-text class="pa-3" @click="!isDragging && editItem(item)" style="cursor: pointer;">
                <!-- 新格式：顯示所有品號 -->
                <div v-if="item.products && item.products.length > 0">
                  <div v-for="(product, pIdx) in item.products" :key="`product-${pIdx}`" 
                    class="product-section product-drop-zone" 
                    :class="{ 'mt-2': pIdx > 0 }"
                    @dragover.prevent="onProductDragOver($event, item, pIdx)"
                    @dragleave="onProductDragLeave($event)"
                    @drop.stop="onProductDrop($event, item, pIdx)"
                    @click="!isDragging && editItem(item)">
                    
                    <!-- 品號標題區塊 (多品號時顯示) -->
                    <div v-if="item.products.length > 1" class="product-header mb-2">
                      <v-icon size="small" class="mr-1">mdi-package-variant</v-icon>
                      <span class="text-caption font-weight-bold">品號 {{ pIdx + 1 }}</span>
                    </div>
                    
                    <!-- 品號內容區塊 -->
                    <div class="product-content">
                      <!-- 品號資訊 -->
                      <div class="info-row">
                        <v-icon size="default" class="mr-2">mdi-barcode</v-icon>
                        <span class="text-body-2">品號:</span>
                        <span class="font-weight-medium text-primary ml-1 text-body-1">
                          {{ product.productCode || '-' }}
                        </span>
                      </div>

                      <!-- 優先級 -->
                      <div class="info-row mt-2">
                        <v-icon size="default" class="mr-2">mdi-flag-variant</v-icon>
                        <span class="text-body-2">優先:</span>
                        <v-chip v-if="product.priority" size="small" :color="getPriorityColor(product.priority)" variant="flat"
                          class="ml-1">
                          <v-icon start size="small">{{ getPriorityIcon(product.priority) }}</v-icon>
                          {{ product.priority }}
                        </v-chip>
                      </div>

                      <!-- 人力代碼 -->
                      <div class="info-row mt-2">
                        <v-icon size="default" class="mr-2">mdi-wrench</v-icon>
                        <span class="text-body-2">代碼:</span>
                        <span v-if="product.laborCode" class="font-weight-bold ml-1 text-body-1" 
                          :class="'text-' + getLaborCodeColor(product.laborCode)">
                          {{ product.laborCode }}
                        </span>
                      </div>

                      <!-- 操作人員 -->
                      <div class="operators-section mt-2">
                        <div class="d-flex align-center mb-1">
                          <v-icon size="default" class="mr-2">mdi-account</v-icon>
                          <span class="text-body-2">操作人員:</span>
                        </div>
                        <div v-if="product.operators && product.operators.length > 0" class="mt-1">
                          <div v-for="(operator, opIdx) in product.operators" :key="`op-${pIdx}-${opIdx}`" 
                            class="d-flex align-center mb-1">
                            <v-chip size="default" color="indigo"
                              variant="elevated" class="draggable-chip"
                              :draggable="true"
                              @dragstart="onDragStart($event, operator, item, pIdx, opIdx)"
                              @dragend="onDragEnd"
                              @click.stop>
                              <v-icon start size="small">mdi-account</v-icon>
                              {{ operator.name }}
                            </v-chip>
                            <v-chip v-if="operator.startTime || operator.endTime" size="small" color="teal" variant="tonal" class="ml-2">
                              <v-icon start size="x-small">mdi-clock-outline</v-icon>
                              {{ formatTime(operator.startTime, operator.endTime) }}
                            </v-chip>
                          </div>
                        </div>
                        <span v-else class="text-body-2 text-grey">未分配</span>
                      </div>

                      <!-- 備註 -->
                      <div v-if="product.remark" class="mt-2">
                        <v-icon size="default" class="mr-2">mdi-note-text</v-icon>
                        <span class="text-body-2 text-grey">{{ product.remark }}</span>
                      </div>
                    </div>

                    <!-- 品號分隔線（多品號時顯示） -->
                    <v-divider v-if="pIdx < item.products.length - 1" class="my-3" :thickness="2" color="primary" opacity="0.3"></v-divider>
                  </div>
                </div>
                <div v-else class="text-grey text-center py-4">
                  無品號資料
                </div>
              </v-card-text>
            </v-card>
          </v-col>
        </v-row>
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
              <strong class="text-primary">{{ pendingDropData?.operator?.name }}</strong>
            </template>
            <template v-else>
              將 <strong class="text-primary">{{ pendingDropData?.operator?.name }}</strong> 
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
import { ref, computed, onMounted, watch, getCurrentInstance } from 'vue'
import api from '@/assets/js/api.js'
import { useStore } from '@/stores/useStore'
import dayjs from 'dayjs'
import { convertBatchToNew } from '@/utils/scheduleDataAdapter'
import ScheduleEditDialog from './ScheduleEditDialog.vue'

const { proxy } = getCurrentInstance()
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
const editDialog = ref(false)
const editingItem = ref(null)
const isDragging = ref(false)
const dragData = ref(null)
const copyMoveDialog = ref(false)
const dropAction = ref('move')
const pendingDropData = ref(null)

// 品號選擇對話框相關
const productSelectDialog = ref(false)
const pendingRemainingData = ref(null)
const selectedProductIdx = ref(null)

// 監聽 props.productCodes 變化
watch(() => props.productCodes, (newVal) => {
  console.log('[ListView-watch] productCodes 變化:', newVal?.length, '筆')
  if (newVal && newVal.length > 0) {
    console.log('[ListView-watch] 第一筆資料:', newVal[0])
  }
}, { immediate: true })

// 載入排班資料
const loadSchedule = async () => {
  if (!props.selectedDate || !props.selectedShift) return
  
  loading.value = true
  try {
    const rs = await api.get('schedule')
    if (rs && rs.length > 0) {
      // 過濾出符合日期和時段的排班
      let filtered = rs
        .map(i => ({
          ...JSON.parse(i.datalist),
          snkey: i.snkey
        }))
        .filter(item => item.date === props.selectedDate && item.shift === props.selectedShift)
      
      if (filtered.length > 0) {
        // 轉換為新格式（統一格式），ListView 使用新格式顯示
        console.log('[ListView-loadSchedule] 讀取到的資料:', filtered)
        scheduleResults.value = convertBatchToNew(filtered)
        console.log('[ListView-loadSchedule] 轉換為新格式後:', scheduleResults.value)
      } else {
        scheduleResults.value = []
      }
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

// 按機台編號排序的結果
const sortedResults = computed(() => {
  return [...scheduleResults.value].sort((a, b) => {
    const numA = parseInt(a.machineNumber) || 0
    const numB = parseInt(b.machineNumber) || 0
    return numA - numB
  })
})


// 方法（新格式）
const editItem = (item) => {
  console.log('[ListView-editItem] 開始編輯機台（新格式）:', item.machineName, '品號數:', item.products?.length)
  editingItem.value = JSON.parse(JSON.stringify(item)) // 深拷貝避免直接修改原資料
  
  // 確保 products 陣列存在
  if (!editingItem.value.products) {
    editingItem.value.products = []
  }
  
  // 如果沒有品號，新增一個空品號
  if (editingItem.value.products.length === 0) {
    editingItem.value.products.push({
      productCode: '',
      priority: '空白',
      laborCode: '',
      operators: [],
      status: '待排',
      remark: ''
    })
  }
  
  console.log('[ListView-editItem] 編輯資料:', editingItem.value)
  editDialog.value = true
}

// 新增品號
const addProduct = () => {
  if (!editingItem.value || !editingItem.value.products) return
  
  editingItem.value.products.push({
    productCode: '',
    priority: '空白',
    laborCode: '',
    operators: [],
    status: '待排',
    remark: ''
  })
}

// 移除品號
const removeProduct = (productIdx) => {
  if (!editingItem.value || !editingItem.value.products) return
  
  if (editingItem.value.products.length > 1) {
    editingItem.value.products.splice(productIdx, 1)
  } else {
    proxy.$swal({ icon: "warning", title: "至少需要保留一個品號" })
  }
}

// 新增操作人員（新格式：需要指定品號索引）
const addOperator = (productIdx, name) => {
  if (!name || !editingItem.value || !editingItem.value.products[productIdx]) return
  
  const product = editingItem.value.products[productIdx]
  
  // 檢查是否已存在
  if (product.operators.some(op => op.name === name)) {
    return
  }
  
  const operator = props.operators.find(op => (op.人員名稱 || op.名稱) === name)
  product.operators.push({
    name,
    snkey: operator ? operator.snkey : '',
    startTime: '',
    endTime: ''
  })
}


// 移除操作人員（新格式：需要指定品號索引和操作人員索引）
const removeOperator = (productIdx, operatorIdx) => {
  if (!editingItem.value || !editingItem.value.products[productIdx]) return
  
  editingItem.value.products[productIdx].operators.splice(operatorIdx, 1)
}

// 處理編輯儲存（從共用組件回傳）
const handleEditSave = (dataToSave) => {
  console.log('[ListView-handleEditSave] 收到儲存資料:', dataToSave)
  
  // 更新本地資料
  const index = scheduleResults.value.findIndex(r => r.machineSnkey === dataToSave.machineSnkey)
  if (index !== -1) {
    console.log('[ListView-handleEditSave] 找到索引:', index)
    Object.assign(scheduleResults.value[index], dataToSave)
    console.log('[ListView-handleEditSave] 更新後的資料:', scheduleResults.value[index])
  } else {
    console.error('[ListView-handleEditSave] 找不到對應的機台索引，machineSnkey:', dataToSave.machineSnkey)
  }
  
  // 通知父層更新
  emit('update', dataToSave)
}

const getShiftColor = (shift) => {
  const colorMap = {
    '早': 'light-blue',
    '中上': 'amber',
    '中下': 'orange',
    '晚': 'deep-purple'
  }
  return colorMap[shift] || 'grey'
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

// 取得整體狀態（新格式）
const getOverallStatus = (item) => {
  if (!item.products || item.products.length === 0) {
    return '待排'
  }
  
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
  
  // 如果有無可用人力
  if (item.products.some(p => p.status === '無可用人力')) {
    return '無可用人力'
  }
  
  // 返回第一個品號的狀態
  return item.products[0].status || '待排'
}

// 格式化時間顯示
const formatTime = (startTime, endTime) => {
  if (startTime && endTime) {
    return `${startTime} - ${endTime}`
  } else if (startTime) {
    return `${startTime} -`
  } else if (endTime) {
    return `- ${endTime}`
  }
  return ''
}

// 拖拉方法（新格式：支援品號索引和操作人員索引）
const onDragStart = (event, operator, sourceItem, productIdx, operatorIdx) => {
  dragData.value = { 
    operator,  // 新格式：完整的 operator 物件
    sourceItem, 
    productIdx,  // 品號索引
    operatorIdx  // 操作人員索引
  }
  event.dataTransfer.effectAllowed = 'move'
  event.target.classList.add('dragging')
  isDragging.value = true
}

const onDragEnd = () => {
  isDragging.value = false
  dragData.value = null
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
  
  const { operator, sourceItem, productIdx, operatorIdx } = dragData.value
  
  // 從來源機台移除人員（新格式）
  if (sourceItem && sourceItem.products && sourceItem.products[productIdx]) {
    const product = sourceItem.products[productIdx]
    
    // 確認操作人員陣列存在
    if (!product.operators || !Array.isArray(product.operators)) {
      console.error('[列表-移除人員] 操作人員陣列不存在')
      dragData.value = null
      return
    }
    
    // 從品號中移除操作人員
    product.operators.splice(operatorIdx, 1)
    
    // 更新品號狀態
    if (product.operators.length === 0) {
      product.status = '待排'
    }
    
    // 透過 API 更新資料庫
    if (sourceItem.snkey) {
      console.log('--- [列表-移除人員] 開始更新 ---')
      console.log('機台:', sourceItem.machineName, ', snkey:', sourceItem.snkey)
      console.log('品號:', product.productCode)
      console.log('移除人員:', operator.name)
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
        console.log('[列表-移除人員] POST payload:', payload)
        const rs = await api.post('schedule', payload)
        console.log('[列表-移除人員] POST 結果:', rs)
        console.log('--- [列表-移除人員] 更新完成 ---')
        
        // 顯示成功訊息
        proxy.$swal({ 
          icon: "success", 
          title: "移除成功", 
          text: `已從 ${sourceItem.machineName} 的品號 ${product.productCode} 中移除 ${operator.name}`
        })
      } catch (error) {
        console.error('[列表-移除人員] 更新失敗:', error)
        proxy.$swal({ 
          icon: "error", 
          title: "移除失敗", 
          text: error.message || '未知錯誤'
        })
      }
    }
    
    emit('update', sourceItem)
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
  
  const { operator, sourceItem, productIdx: sourcePIdx, operatorIdx } = dragData.value
  
  // 檢查是否拖到同一機台的同一品號
  if (sourceItem.machineSnkey === targetItem.machineSnkey && sourcePIdx === productIdx) {
    // 同機台同品號，不允許操作
    dragData.value = null
    return
  }
  
  // 如果是不同機台，檢查目標機台是否已有此人員
  if (sourceItem.machineSnkey !== targetItem.machineSnkey) {
    const operatorName = operator.name
    const hasOperator = targetItem.products?.some(p => 
      p.operators?.some(op => op.name === operatorName)
    )
    
    if (hasOperator) {
      proxy.$swal({ 
        icon: "warning", 
        title: "無法操作", 
        text: `${operatorName} 已存在於目標機台中`
      })
      dragData.value = null
      return
    }
  }
  
  // 保存拖放資訊，顯示選擇對話框（移動或複製）
  pendingDropData.value = {
    operator,
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
    
    // 確保目標機台有 products 陣列
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
  
  if (!dragData.value) return
  
  const { operator, sourceItem, productIdx, operatorIdx } = dragData.value
  
  // 不能拖到同一個機台
  if (sourceItem.machineSnkey === targetItem.machineSnkey) {
    dragData.value = null
    return
  }
  
  // 檢查目標機台是否已有此人員（在任何品號中）
  const operatorName = operator.name
  const hasOperator = targetItem.products?.some(p => 
    p.operators?.some(op => op.name === operatorName)
  )
  
  if (hasOperator) {
    proxy.$swal({ 
      icon: "warning", 
      title: "無法操作", 
      text: `${operatorName} 已存在於目標機台中`
    })
    dragData.value = null
    return
  }
  
  // 保存拖放資訊，顯示選擇對話框
  pendingDropData.value = {
    operator,
    sourceItem: { ...sourceItem },
    targetItem: { ...targetItem },
    productIdx,
    operatorIdx,
    action: dropAction.value
  }
  dropAction.value = 'move' // 預設為移動
  copyMoveDialog.value = true
}

// 確認拖放操作（新格式）
const confirmDrop = async () => {
  if (!pendingDropData.value) {
    copyMoveDialog.value = false
    return
  }
  
  const { operator, sourceItem: sourceItemData, targetItem: targetItemData, productIdx, operatorIdx, targetProductIdx, isSameMachine } = pendingDropData.value
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
  
  // 確保目標機台有 products 陣列
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
  
  // 使用指定的品號索引，如果沒有指定則使用第一個品號
  const targetPIdx = targetProductIdx !== undefined ? targetProductIdx : 0
  const targetProduct = targetItem.products[targetPIdx]
  if (!targetProduct.operators) {
    targetProduct.operators = []
  }
  
  // 檢查是否為交換操作
  const isSwap = dropAction.value === 'swap'
  
  // 只有在不是交換時，才執行移動/複製邏輯
  if (!isSwap) {
    // 複製操作人員資料
    const newOperator = {
      name: operator.name,
      snkey: operator.snkey || '',
      startTime: operator.startTime || '',
      endTime: operator.endTime || ''
    }
    targetProduct.operators.push(newOperator)
    
    // 更新目標品號狀態
    if (targetProduct.status === '待排' || targetProduct.status === '無可用人力' || targetProduct.status === '人力不足') {
      targetProduct.status = '已排'
    }
    
    // 如果是移動（非複製），從來源移除
    if (!isCopy) {
      const sourceProduct = sourceItem.products[productIdx]
      if (sourceProduct && sourceProduct.operators) {
        sourceProduct.operators.splice(operatorIdx, 1)
        
        // 更新來源品號狀態
        if (sourceProduct.operators.length === 0) {
          sourceProduct.status = '待排'
        }
      }
    }
  }
  
  // 透過 API 更新資料
  if (isSameMachine) {
    // 同機台內的品號間操作
    const isSwap = dropAction.value === 'swap'
    const operationType = isSwap ? '交換' : (isCopy ? '複製' : '移動')
    
    console.log(`--- [列表-同機台品號間${operationType}] 開始更新 ---`)
    console.log('機台:', sourceItem.machineName)
    console.log(`從品號 ${productIdx + 1} ${operationType}到品號 ${targetPIdx + 1}`)
    if (!isSwap) console.log('人員:', operator.name)
    
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
          actionText = `${isCopy ? '複製' : '移動'}人員 - ${operator.name} (${sourceProduct.productCode || '品號' + (productIdx + 1)} → ${targetProduct.productCode || '品號' + (targetPIdx + 1)})`
          successText = `已將 ${operator.name} 從品號 ${sourceProduct.productCode || (productIdx + 1)} ${isCopy ? '複製' : '移動'}到品號 ${targetProduct.productCode || (targetPIdx + 1)}`
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
        console.log('[列表-同機台] POST payload:', payload)
        const rs = await api.post('schedule', payload)
        console.log('[列表-同機台] POST 結果:', rs)
        
        // 顯示成功訊息
        proxy.$swal({ 
          icon: "success", 
          title: `${operationType}成功`, 
          text: successText
        })
      } catch (error) {
        console.error('[列表-同機台] 更新失敗:', error)
        proxy.$swal({ icon: "error", title: "更新失敗", text: error.message })
      }
    }
    console.log(`--- [列表-同機台品號間${operationType}] 更新完成 ---`)
    
    // 發送更新事件
    emit('update', sourceItem)
  } else {
    // 不同機台間的操作
    const isSwap = dropAction.value === 'swap'
    const operationType = isSwap ? '交換' : (isCopy ? '複製' : '移動')
    
    console.log(`--- [列表-機台間${operationType}] 開始更新 ---`)
    console.log('來源機台:', sourceItem.machineName, ', snkey:', sourceItem.snkey)
    console.log('目標機台:', targetItem.machineName, ', snkey:', targetItem.snkey)
    if (!isSwap) console.log(`${isCopy ? '複製' : '移動'}人員:`, operator.name)
    
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
        console.log('[列表-來源機台] 準備 POST...')
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
          console.log('[列表-來源機台] POST payload:', payload)
          const rs = await api.post('schedule', payload)
          console.log('[列表-來源機台] POST 結果:', rs)
        } catch (error) {
          console.error('[列表-來源機台] 更新失敗:', error)
          proxy.$swal({ icon: "error", title: "更新來源機台失敗", text: error.message })
        }
      }
      
      // 更新目標機台資料
      if (targetItem.snkey) {
        console.log('[列表-目標機台] 準備 POST...')
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
          console.log('[列表-目標機台] POST payload:', payload)
          const rs = await api.post('schedule', payload)
          console.log('[列表-目標機台] POST 結果:', rs)
        } catch (error) {
          console.error('[列表-目標機台] 更新失敗:', error)
          proxy.$swal({ icon: "error", title: "更新目標機台失敗", text: error.message })
        }
      }
      
      // 顯示成功訊息
      proxy.$swal({ 
        icon: "success", 
        title: "交換成功", 
        text: `已交換 ${sourceItem.machineName} 的品號 ${sourceProduct.productCode || (productIdx + 1)} 和 ${targetItem.machineName} 的品號 ${targetProduct.productCode || (targetPIdx + 1)} 的操作人員`
      })
      
      console.log(`--- [列表-機台間交換] 更新完成 ---`)
      
      // 發送更新事件
      emit('update', sourceItem)
      emit('update', targetItem)
    } else {
      // 移動或複製邏輯（原有的）
      // 如果是移動，更新來源資料
      if (!isCopy && sourceItem.snkey) {
        console.log('[列表-來源] 準備 POST...')
        try {
          const payload = {
            snkey: sourceItem.snkey,
            datalist: JSON.stringify({
              ...sourceItem,
              editInfo: [...(sourceItem.editInfo || []), {
                name: store.state.pData?.username || 'system',
                time: dayjs().format('YYYY-MM-DD HH:mm:ss'),
                action: `移出人員 - ${operator.name}`
              }]
            })
          }
          console.log('[列表-來源] POST payload:', payload)
          const rs = await api.post('schedule', payload)
          console.log('[列表-來源] POST 結果:', rs)
        } catch (error) {
          console.error('[列表-來源] 更新失敗:', error)
          proxy.$swal({ icon: "error", title: "更新來源失敗", text: error.message })
        }
      }
      
      // 更新目標資料
      if (targetItem.snkey) {
        console.log('[列表-目標] 準備 POST...')
        try {
          const payload = {
            snkey: targetItem.snkey,
            datalist: JSON.stringify({
              ...targetItem,
              editInfo: [...(targetItem.editInfo || []), {
                name: store.state.pData?.username || 'system',
                time: dayjs().format('YYYY-MM-DD HH:mm:ss'),
                action: `${isCopy ? '複製' : '新增'}人員 - ${operator.name}`
              }]
            })
          }
          console.log('[列表-目標] POST payload:', payload)
          const rs = await api.post('schedule', payload)
          console.log('[列表-目標] POST 結果:', rs)
          
          // 顯示成功訊息
          proxy.$swal({ 
            icon: "success", 
            title: `${isCopy ? '複製' : '移動'}成功`, 
            text: `已將 ${operator.name} ${isCopy ? '複製' : '移動'}到 ${targetItem.machineName}`
          })
        } catch (error) {
          console.error('[列表-目標] 更新失敗:', error)
          proxy.$swal({ icon: "error", title: "更新目標失敗", text: error.message })
        }
      }
      console.log(`--- [列表-機台間拖拉-${isCopy ? '複製' : '移動'}] 更新完成 ---`)
      
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

// 將操作人員加入指定品號（從剩餘人力）
const addOperatorToProduct = async (targetItem, productIdx, operatorSnkey, operatorName) => {
  // 找到實際的資料引用
  const actualTargetItem = scheduleResults.value.find(r => r.machineSnkey === targetItem.machineSnkey)
  
  if (!actualTargetItem || !actualTargetItem.products || !actualTargetItem.products[productIdx]) {
    console.error('[列表-從剩餘人力拖入] 找不到目標品號')
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
    snkey: operatorSnkey,
    startTime: '',
    endTime: ''
  })
  
  // 更新品號狀態
  if (targetProduct.status === '待排' || targetProduct.status === '無可用人力' || targetProduct.status === '人力不足') {
    targetProduct.status = '已排'
  }
  
  // 透過 API 更新資料庫
  if (actualTargetItem.snkey) {
    console.log('--- [列表-從剩餘人力拖入] 開始更新 ---')
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
      console.log('[列表-從剩餘人力拖入] POST payload:', payload)
      const rs = await api.post('schedule', payload)
      console.log('[列表-從剩餘人力拖入] POST 結果:', rs)
      console.log('--- [列表-從剩餘人力拖入] 更新完成 ---')
      
      // 顯示成功訊息
      proxy.$swal({ 
        icon: "success", 
        title: "加入成功", 
        text: `已將 ${operatorName} 加入到 ${actualTargetItem.machineName} 的品號 ${targetProduct.productCode || (productIdx + 1)}`
      })
    } catch (error) {
      console.error('[列表-從剩餘人力拖入] 更新失敗:', error)
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
    console.error('[列表-品號選擇] 找不到目標機台')
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
</script>

<style scoped lang="scss">
.list-view {
  width: 100%;
}

.schedule-list-card {
  border-radius: 24px;
  box-shadow: 0 14px 40px rgba(74, 107, 95, 0.14);
  border: 1px solid rgba(91, 143, 163, 0.16);
}

.machine-card {
  border-radius: 12px;
  transition: all 0.3s ease;
  cursor: pointer;
  border: 2px solid transparent;

  &:hover {
    transform: translateY(-4px);
    box-shadow: 0 8px 24px rgba(74, 107, 95, 0.2);
  }

  &--已排 {
    border-color: rgba(76, 175, 80, 0.3);
    background: rgba(76, 175, 80, 0.02);
  }

  &--人力不足 {
    border-color: rgba(255, 152, 0, 0.3);
    background: rgba(255, 152, 0, 0.02);
  }

  &--無可用人力 {
    border-color: rgba(244, 67, 54, 0.3);
    background: rgba(244, 67, 54, 0.02);
  }

  &--自動 {
    border-color: rgba(33, 150, 243, 0.3);
    background: rgba(33, 150, 243, 0.02);
  }
}

.info-row {
  display: flex;
  align-items: center;
}

.operators-section {
  min-height: 40px;
}

.product-section {
  padding: 12px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.5);
  border: 1px solid rgba(0, 0, 0, 0.08);
  transition: all 0.3s ease;
  
  &:not(:first-child) {
    margin-top: 12px;
  }
  
  // 當機台只有一個品號時，使用更簡潔的樣式
  &:only-child {
    background: transparent;
    border: none;
    padding: 8px 0;
  }
  
  // 品號區域可拖放樣式
  &.product-drop-zone {
    cursor: pointer;
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
        padding: 8px 16px;
        border-radius: 8px;
        font-weight: bold;
        font-size: 14px;
        pointer-events: none;
        z-index: 10;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
      }
    }
  }
}

.product-header {
  display: flex;
  align-items: center;
  padding: 4px 8px;
  background: linear-gradient(135deg, rgba(63, 81, 181, 0.08), rgba(33, 150, 243, 0.08));
  border-radius: 6px;
  border-left: 3px solid #3f51b5;
  color: #3f51b5;
}

.product-content {
  // 內容區域的樣式
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

.machine-card.drag-over {
  border-color: #3f51b5 !important;
  background-color: rgba(63, 81, 181, 0.1) !important;
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

