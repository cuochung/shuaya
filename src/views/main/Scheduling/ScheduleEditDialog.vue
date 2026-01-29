<template>
  <v-dialog v-model="dialogModel" max-width="900px" scrollable persistent @keydown.esc="handleCancel">
    <v-card class="dialog-card" elevation="24">
      <!-- 對話框標題 -->
      <v-card-title class="dialog-title dialog-title--add d-flex align-center justify-space-between px-6 py-4">
        <div class="d-flex align-center">
          <v-avatar color="white" size="40" class="mr-3">
            <v-icon color="primary" size="24">mdi-calendar-edit</v-icon>
          </v-avatar>
          <div>
            <div class="text-h6 font-weight-bold">編輯排班</div>
            <div class="text-caption text-white">
              {{ localEditingItem?.machineName || localEditingItem?.機台名稱 }}
              <v-chip v-if="localEditingItem?.shift" size="x-small" color="white" variant="outlined" class="ml-2">
                {{ localEditingItem.shift }}班
              </v-chip>
            </div>
          </div>
        </div>
        <v-btn icon="mdi-close" variant="text" color="white" @click="handleCancel" size="small"></v-btn>
      </v-card-title>

      <v-divider></v-divider>

      <!-- 對話框內容 -->
      <v-card-text class="dialog-content pa-4" style="max-height: 65vh; overflow-y: auto;">
        <div v-if="localEditingItem && localEditingItem.products">
          <!-- 品號統計資訊 -->
          <v-alert v-if="localEditingItem.products.length > 0" 
            type="info" 
            variant="tonal" 
            density="compact" 
            class="mb-3"
            border="start">
            <div class="d-flex align-center justify-space-between text-body-2">
              <span>共有 <strong>{{ localEditingItem.products.length }}</strong> 個品號</span>
              <v-chip size="x-small" color="primary" variant="flat">
                <v-icon start size="x-small">mdi-account-group</v-icon>
                {{ totalOperatorCount }} 人
              </v-chip>
            </div>
          </v-alert>

          <!-- 品號列表 -->
          <v-expansion-panels v-model="expandedPanels" multiple variant="accordion">
            <v-expansion-panel 
              v-for="(product, pIdx) in localEditingItem.products" 
              :key="`edit-product-${pIdx}`"
              class="mb-3 product-panel"
              :class="`product-panel--${pIdx % 4}`"
              elevation="2">
              
              <!-- 品號面板標題 -->
              <v-expansion-panel-title class="panel-title py-2">
                <div class="d-flex align-center justify-space-between w-100 pr-2">
                  <div class="d-flex align-center">
                    <v-chip 
                      :color="getProductCardColor(pIdx)" 
                      variant="flat"
                      class="mr-3 font-weight-bold"
                      size="default">
                      <v-icon start size="small">mdi-package-variant</v-icon>
                      {{ product.productCode || '未設定' }}
                    </v-chip>
                    <div class="d-flex align-center gap-2">
                      <v-chip 
                        size="small" 
                        :color="getLaborCodeColor(product.laborCode)"
                        variant="tonal">
                        <v-icon start size="x-small">mdi-code-tags</v-icon>
                        {{ product.laborCode || '無代碼' }}
                      </v-chip>
                      <v-chip 
                        size="small" 
                        :color="getStatusColor(product.status)" 
                        variant="flat">
                        {{ product.status || '待排' }}
                      </v-chip>
                    </div>
                  </div>
                  <div class="d-flex align-center">
                    <v-chip size="small" color="grey-darken-1" variant="text">
                      <v-icon start size="small">mdi-account-multiple</v-icon>
                      {{ product.operators?.length || 0 }}
                    </v-chip>
                    <v-btn 
                      v-if="localEditingItem.products.length > 1"
                      icon="mdi-delete-outline" 
                      size="small" 
                      variant="text" 
                      color="error"
                      @click.stop="confirmRemoveProduct(pIdx)">
                    </v-btn>
                  </div>
                </div>
              </v-expansion-panel-title>

              <!-- 品號面板內容 -->
              <v-expansion-panel-text class="panel-content pt-2">
                <!-- 基本資訊區 -->
                <v-card variant="flat" class="mb-2 info-card">
                  <v-card-text class="pa-3">
                    <v-row dense>
                      <!-- 品號選擇 -->
                      <v-col cols="12" md="6">
                        <v-autocomplete 
                          label="品號" 
                          v-model="product.productCode" 
                          :items="productCodeOptions"
                          density="compact" 
                          variant="outlined" 
                          clearable
                          hide-details
                          prepend-inner-icon="mdi-barcode"
                          :menu-props="{ maxHeight: 300 }"
                          @update:model-value="(val) => onProductCodeChange(pIdx, val)">
                        </v-autocomplete>
                      </v-col>

                      <!-- 優先級 -->
                      <v-col cols="6" md="3">
                        <v-select 
                          label="優先級" 
                          v-model="product.priority" 
                          :items="priorityOptions"
                          density="compact" 
                          variant="outlined"
                          hide-details
                          prepend-inner-icon="mdi-flag">
                          <template v-slot:selection="{ item }">
                            <v-icon :color="getPriorityColor(item.value)" size="small" class="mr-1">
                              {{ getPriorityIcon(item.value) }}
                            </v-icon>
                            <span class="text-caption">{{ item.value }}</span>
                          </template>
                        </v-select>
                      </v-col>

                      <!-- 人力代碼 -->
                      <v-col cols="6" md="3">
                        <v-text-field 
                          label="人力代碼" 
                          v-model="product.laborCode" 
                          density="compact"
                          variant="outlined"
                          hide-details
                          prepend-inner-icon="mdi-code-tags"
                          readonly>
                        </v-text-field>
                      </v-col>
                    </v-row>
                  </v-card-text>
                </v-card>

                <!-- 操作人員區 -->
                <v-card variant="flat" class="mb-2 operator-card">
                  <v-card-text class="pa-3">
                    <div class="text-caption text-grey mb-2 d-flex align-center">
                      <v-icon size="small" class="mr-1">mdi-account-group</v-icon>
                      操作人員 ({{ product.operators?.length || 0 }})
                    </div>
                    
                    <!-- 操作人員列表 -->
                    <div v-if="product.operators && product.operators.length > 0" class="mb-2">
                      <div 
                        v-for="(operator, opIdx) in product.operators" 
                        :key="`op-${pIdx}-${opIdx}`"
                        class="operator-item-compact d-flex align-center pa-2 mb-2"
                        style="border: 1px solid #e0e0e0; border-radius: 6px; background: white;">
                        <!-- 人員資訊 -->
                        <v-avatar color="indigo" size="32" class="mr-3">
                          <span class="text-white text-body-2 font-weight-bold">{{ operator.name.substring(0, 1) }}</span>
                        </v-avatar>
                        
                        <!-- 姓名 -->
                        <div class="text-body-1 font-weight-medium" style="min-width: 80px;">
                          {{ operator.name }}
                        </div>
                        
                        <!-- 時間顯示 -->
                        <div class="d-flex align-center mx-3 flex-grow-1">
                          <span class="text-caption text-grey mr-2" style="min-width: 60px;">工作時間</span>
                          <v-chip size="small" color="success" variant="tonal" class="mr-2">
                            <v-icon start size="small">mdi-clock-start</v-icon>
                            {{ operator.startTime || '--:--' }}
                          </v-chip>
                          <v-icon size="small" color="grey">mdi-arrow-right</v-icon>
                          <v-chip size="small" color="error" variant="tonal" class="ml-2">
                            <v-icon start size="small">mdi-clock-end</v-icon>
                            {{ operator.endTime || '--:--' }}
                          </v-chip>
                        </div>
                        
                        <!-- 操作按鈕 -->
                        <div class="d-flex gap-1">
                          <v-btn 
                            icon="mdi-clock-edit-outline" 
                            size="small" 
                            variant="tonal" 
                            color="primary"
                            @click="openTimeEditor(pIdx, opIdx)">
                          </v-btn>
                          <v-btn 
                            icon="mdi-delete-outline" 
                            size="small" 
                            variant="tonal" 
                            color="error"
                            @click="confirmRemoveOperator(pIdx, opIdx, operator.name)">
                          </v-btn>
                        </div>
                      </div>
                    </div>

                    <!-- 無操作人員提示 -->
                    <div v-else class="text-caption text-grey text-center py-2 mb-2" style="background: #f5f5f5; border-radius: 4px;">
                      尚未添加操作人員
                    </div>

                    <!-- 新增操作人員 -->
                    <v-autocomplete 
                      label="新增操作人員" 
                      :items="availableOperatorNames" 
                      v-model="newOperatorNames[pIdx]"
                      @update:model-value="(val) => handleAddOperator(pIdx, val)" 
                      density="compact" 
                      variant="outlined" 
                      clearable
                      hide-details
                      prepend-inner-icon="mdi-account-plus"
                      placeholder="選擇操作人員">
                    </v-autocomplete>
                  </v-card-text>
                </v-card>

                <!-- 備註區 -->
                <v-card variant="flat" class="remark-card">
                  <v-card-text class="pa-3">
                    <v-textarea 
                      label="備註" 
                      v-model="product.remark" 
                      density="compact" 
                      variant="outlined" 
                      rows="2"
                      auto-grow
                      hide-details
                      prepend-inner-icon="mdi-note-text"
                      placeholder="輸入備註...">
                    </v-textarea>
                  </v-card-text>
                </v-card>
              </v-expansion-panel-text>
            </v-expansion-panel>
          </v-expansion-panels>

          <!-- 新增品號按鈕 -->
          <v-btn 
            color="primary" 
            variant="outlined" 
            prepend-icon="mdi-plus-circle"
            block
            class="mt-3 add-product-btn"
            @click="addProduct">
            新增品號
          </v-btn>
        </div>

        <!-- 空狀態 -->
        <v-empty-state
          v-else
          icon="mdi-package-variant-closed"
          title="無品號資料"
          text="請先新增品號以開始排班">
        </v-empty-state>
      </v-card-text>

      <v-divider></v-divider>

      <!-- 對話框操作按鈕 -->
      <v-card-actions class="pa-4 bg-grey-lighten-5">
        <v-spacer></v-spacer>
        <v-btn 
          color="grey-darken-1" 
          variant="text" 
          prepend-icon="mdi-close"
          @click="handleCancel">
          取消
        </v-btn>
        <v-btn 
          color="primary" 
          variant="flat" 
          prepend-icon="mdi-content-save"
          :loading="saving"
          @click="handleSave">
          儲存變更
        </v-btn>
      </v-card-actions>
    </v-card>

    <!-- 時間編輯對話框 -->
    <v-dialog v-model="timeEditorDialog" max-width="500px">
      <v-card v-if="editingOperator">
        <v-card-title class="bg-primary text-white">
          <v-icon start>mdi-clock-edit-outline</v-icon>
          編輯工作時間
        </v-card-title>
        <v-card-text class="pa-6">
          <div class="mb-4">
            <v-chip color="indigo" variant="flat" prepend-icon="mdi-account">
              {{ editingOperator.name }}
            </v-chip>
          </div>
          <v-row dense>
            <v-col cols="6">
              <v-text-field 
                label="開始時間" 
                v-model="editingOperator.startTime" 
                type="time" 
                density="comfortable" 
                variant="outlined"
                prepend-inner-icon="mdi-clock-start">
              </v-text-field>
            </v-col>
            <v-col cols="6">
              <v-text-field 
                label="結束時間" 
                v-model="editingOperator.endTime" 
                type="time" 
                density="comfortable" 
                variant="outlined"
                prepend-inner-icon="mdi-clock-end">
              </v-text-field>
            </v-col>
          </v-row>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn variant="text" @click="closeTimeEditor">取消</v-btn>
          <v-btn color="primary" variant="flat" @click="saveTimeEditor">確定</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-dialog>
</template>

<script setup>
import { ref, computed, watch, getCurrentInstance } from 'vue'
import { useStore } from '@/stores/useStore'
import dayjs from 'dayjs'
import api from '@/assets/js/api.js'

const { proxy } = getCurrentInstance()
const store = useStore()

// Props
const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  },
  editingItem: {
    type: Object,
    default: null
  },
  productCodes: {
    type: Array,
    default: () => []
  },
  operators: {
    type: Array,
    default: () => []
  }
})

// Emits
const emit = defineEmits(['update:modelValue', 'save', 'cancel'])

// 內部狀態
const localEditingItem = ref(null)
const newOperatorNames = ref({})
const expandedPanels = ref([])
const saving = ref(false)
const timeEditorDialog = ref(false)
const editingOperator = ref(null)
const editingOperatorIndex = ref({ productIdx: -1, operatorIdx: -1 })

// 計算屬性：dialog 的雙向綁定
const dialogModel = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val)
})

// 監聽 props.productCodes 變化
watch(() => props.productCodes, (newVal) => {
  console.log('[ScheduleEditDialog-watch] productCodes 變化:', newVal?.length, '筆')
}, { immediate: true })

// 監聽 editingItem 變化，深拷貝到本地
watch(() => props.editingItem, (newVal) => {
  console.log('[ScheduleEditDialog-watch] editingItem 變化:', newVal)
  if (newVal) {
    localEditingItem.value = JSON.parse(JSON.stringify(newVal))
    
    // 確保 products 陣列存在
    if (!localEditingItem.value.products) {
      localEditingItem.value.products = []
    }
    
    // 如果沒有品號，新增一個空品號
    if (localEditingItem.value.products.length === 0) {
      localEditingItem.value.products.push(createEmptyProduct())
    }
    
    // 初始化每個品號的新操作人員輸入框
    localEditingItem.value.products.forEach((_, idx) => {
      if (!newOperatorNames.value[idx]) {
        newOperatorNames.value[idx] = null
      }
    })

    // 預設全部展開
    expandedPanels.value = Array.from({ length: localEditingItem.value.products.length }, (_, i) => i)
  } else {
    localEditingItem.value = null
    newOperatorNames.value = {}
    expandedPanels.value = []
  }
}, { immediate: true })

// 品號選項
const productCodeOptions = computed(() => {
  console.log('[ScheduleEditDialog] 計算 productCodeOptions')
  console.log('[ScheduleEditDialog] props.productCodes:', props.productCodes)
  console.log('[ScheduleEditDialog] props.productCodes.length:', props.productCodes?.length)

  if (!props.productCodes || props.productCodes.length === 0) {
    console.log('[ScheduleEditDialog] ❌ productCodeOptions: 無資料')
    return []
  }

  const options = props.productCodes
    .map(pc => pc.productCode)
    .filter(Boolean)
    .filter((value, index, self) => self.indexOf(value) === index)
  
  console.log('[ScheduleEditDialog] ✅ productCodeOptions:', options.length, '個選項')
  console.log('[ScheduleEditDialog] 前5個選項:', options.slice(0, 5))
  
  return options
})

// 可用操作人員名稱
const availableOperatorNames = computed(() => {
  if (props.operators && props.operators.length > 0) {
    return props.operators.map(op => op.人員名稱 || op.名稱).filter(Boolean)
  }
  return []
})

// 總操作人員數
const totalOperatorCount = computed(() => {
  if (!localEditingItem.value || !localEditingItem.value.products) return 0
  return localEditingItem.value.products.reduce((sum, product) => {
    return sum + (product.operators?.length || 0)
  }, 0)
})

// 生產優先選項
const priorityOptions = ['方塊', '大圈', '小圈', '大三角', '小三角', '空白']

// 建立空品號
const createEmptyProduct = () => ({
  productCode: '',
  priority: '空白',
  laborCode: '',
  operators: [],
  status: '待排',
  remark: ''
})

// 新增品號
const addProduct = () => {
  if (!localEditingItem.value || !localEditingItem.value.products) return
  
  localEditingItem.value.products.push(createEmptyProduct())
  
  // 初始化新品號的操作人員輸入框
  const newIdx = localEditingItem.value.products.length - 1
  newOperatorNames.value[newIdx] = null
  
  // 展開新品號
  expandedPanels.value.push(newIdx)

  proxy.$swal({ 
    icon: "success", 
    title: "已新增品號", 
    timer: 1500, 
    showConfirmButton: false 
  })
}

// 確認移除品號
const confirmRemoveProduct = async (productIdx) => {
  const product = localEditingItem.value.products[productIdx]
  const productName = product.productCode || '未命名品號'
  
  const result = await proxy.$swal({
    title: `確認要刪除品號 ${productName} 嗎？`,
    text: '此操作無法復原',
    icon: 'warning',
    toast: false,
    timer: null,
    showConfirmButton: true,
    showCancelButton: true,
    position: 'center'
  })

  if (result.isConfirmed) {
    removeProduct(productIdx)
  }
}

// 移除品號
const removeProduct = (productIdx) => {
  if (!localEditingItem.value || !localEditingItem.value.products) return
  
  if (localEditingItem.value.products.length > 1) {
    localEditingItem.value.products.splice(productIdx, 1)
    delete newOperatorNames.value[productIdx]
    
    // 重新索引
    const newNames = {}
    localEditingItem.value.products.forEach((_, idx) => {
      newNames[idx] = newOperatorNames.value[idx] || null
    })
    newOperatorNames.value = newNames

    proxy.$swal({ 
      icon: "success", 
      title: "已刪除品號", 
      timer: 1500, 
      showConfirmButton: false 
    })
  } else {
    // 至少保留一個品號，但可以清空
    localEditingItem.value.products[0] = createEmptyProduct()
    proxy.$swal({ 
      icon: "info", 
      title: "已清空品號", 
      text: "至少需保留一個品號",
      timer: 2000, 
      showConfirmButton: false 
    })
  }
}

// 品號改變時
const onProductCodeChange = (productIdx, productCode) => {
  if (!productCode || !localEditingItem.value || !localEditingItem.value.products[productIdx]) return
  
  const product = localEditingItem.value.products[productIdx]
  const productCodeData = props.productCodes.find(pc => pc.productCode === productCode)
  
  if (productCodeData && productCodeData.laborCodes && productCodeData.laborCodes.length > 0) {
    product.laborCode = productCodeData.laborCodes[0]
  } else {
    product.laborCode = ''
  }
}

// 處理新增操作人員
const handleAddOperator = (productIdx, name) => {
  if (name) {
    addOperator(productIdx, name)
    newOperatorNames.value[productIdx] = null
  }
}

// 新增操作人員
const addOperator = (productIdx, name) => {
  if (!name || !localEditingItem.value || !localEditingItem.value.products[productIdx]) return
  
  const product = localEditingItem.value.products[productIdx]
  
  // 檢查是否已存在
  if (product.operators.some(op => op.name === name)) {
    proxy.$swal({ 
      icon: "warning", 
      title: "人員已存在", 
      text: `${name} 已在此品號的操作人員列表中`,
      timer: 2000 
    })
    return
  }
  
  const operator = props.operators.find(op => (op.人員名稱 || op.名稱) === name)
  product.operators.push({
    name,
    snkey: operator ? operator.snkey : '',
    startTime: '',
    endTime: ''
  })

  proxy.$swal({ 
    icon: "success", 
    title: "已新增操作人員", 
    text: name,
    timer: 1500, 
    showConfirmButton: false 
  })
}

// 確認移除操作人員
const confirmRemoveOperator = async (productIdx, operatorIdx, operatorName) => {
  const result = await proxy.$swal({
    title: `確認要移除操作人員 ${operatorName} 嗎？`,
    text: '此操作無法復原',
    icon: 'warning',
    toast: false,
    timer: null,
    showConfirmButton: true,
    showCancelButton: true,
    position: 'center'
  })

  if (result.isConfirmed) {
    removeOperator(productIdx, operatorIdx)
  }
}

// 移除操作人員
const removeOperator = (productIdx, operatorIdx) => {
  if (!localEditingItem.value || !localEditingItem.value.products[productIdx]) return
  
  const operator = localEditingItem.value.products[productIdx].operators[operatorIdx]
  localEditingItem.value.products[productIdx].operators.splice(operatorIdx, 1)

  proxy.$swal({ 
    icon: "success", 
    title: "已移除操作人員", 
    text: operator.name,
    timer: 1500, 
    showConfirmButton: false 
  })
}

// 開啟時間編輯器
const openTimeEditor = (productIdx, operatorIdx) => {
  const operator = localEditingItem.value.products[productIdx].operators[operatorIdx]
  editingOperator.value = { ...operator }
  editingOperatorIndex.value = { productIdx, operatorIdx }
  timeEditorDialog.value = true
}

// 關閉時間編輯器
const closeTimeEditor = () => {
  timeEditorDialog.value = false
  editingOperator.value = null
  editingOperatorIndex.value = { productIdx: -1, operatorIdx: -1 }
}

// 儲存時間編輯
const saveTimeEditor = () => {
  const { productIdx, operatorIdx } = editingOperatorIndex.value
  if (productIdx >= 0 && operatorIdx >= 0) {
    const operator = localEditingItem.value.products[productIdx].operators[operatorIdx]
    operator.startTime = editingOperator.value.startTime
    operator.endTime = editingOperator.value.endTime
  }
  closeTimeEditor()
  proxy.$swal({ 
    icon: "success", 
    title: "時間已更新", 
    timer: 1500, 
    showConfirmButton: false 
  })
}

// 儲存
const handleSave = async () => {
  if (!localEditingItem.value) return
  
  saving.value = true

  try {
    // 組出要儲存的新格式資料
    const dataToSave = {
      date: localEditingItem.value.date,
      shift: localEditingItem.value.shift,
      machineSnkey: localEditingItem.value.machineSnkey,
      machineNumber: localEditingItem.value.machineNumber || '',
      machineName: localEditingItem.value.machineName || '',
      products: [],
      createInfo: localEditingItem.value.createInfo || {},
      editInfo: [...(localEditingItem.value.editInfo || [])]
    }
    
    // 處理每個品號
    localEditingItem.value.products.forEach(product => {
      // 過濾掉空的品號
      if (!product.productCode) return
      
      // 更新狀態
      let status = product.status || '待排'
      if (!product.operators || product.operators.length === 0) {
        status = '待排'
      } else if (status === '待排' || status === '無可用人力' || status === '人力不足') {
        status = '已排'
      }
      
      // 確保 operators 陣列格式正確
      const operators = (product.operators || []).map(op => ({
        snkey: String(op.snkey || ''),
        name: op.name || '',
        startTime: op.startTime || '',
        endTime: op.endTime || ''
      }))
      
      dataToSave.products.push({
        productCode: product.productCode,
        priority: product.priority || '空白',
        laborCode: product.laborCode || '',
        operators,
        status,
        remark: product.remark || ''
      })
    })
    
    // 如果沒有品號，至少保留一個空品號
    if (dataToSave.products.length === 0) {
      dataToSave.products.push(createEmptyProduct())
    }
    
    // 添加編輯資訊
    dataToSave.editInfo.push({
      name: store.state.pData?.username || 'system',
      time: dayjs().format('YYYY-MM-DD HH:mm:ss'),
      action: '編輯排班'
    })
    
    // 透過 API 更新資料庫
    if (localEditingItem.value.snkey) {
      const payload = {
        snkey: localEditingItem.value.snkey,
        datalist: JSON.stringify(dataToSave)
      }
      await api.post('schedule', payload)
    }
    
    // 先關閉視窗並通知父層更新
    emit('save', dataToSave)
    dialogModel.value = false
    
    // 再顯示儲存成功提示約 1.5 秒
    await proxy.$swal({ 
      icon: "success", 
      title: "儲存成功", 
      text: "排班資料已更新",
      timer: 1500, 
      showConfirmButton: false 
    })
  } catch (error) {
    console.error('[編輯排班-儲存] 更新失敗:', error)
    proxy.$swal({ 
      icon: "error", 
      title: "儲存失敗", 
      text: error.message || "請稍後再試"
    })
  } finally {
    saving.value = false
  }
}

// 取消
const handleCancel = () => {
  emit('cancel')
  dialogModel.value = false
}

// 取得品號卡片的顏色
const getProductCardColor = (idx) => {
  const colors = ['primary', 'teal', 'orange', 'purple']
  return colors[idx % 4]
}

// 取得狀態顏色
const getStatusColor = (status) => {
  const colorMap = {
    '已排': 'success',
    '待排': 'warning',
    '無可用人力': 'error',
    '人力不足': 'orange',
    '自動': 'info'
  }
  return colorMap[status] || 'grey'
}

// 取得人力代碼顏色
const getLaborCodeColor = (code) => {
  if (!code) return 'grey'
  if (code.includes('手')) return 'deep-orange'
  if (code.includes('自')) return 'blue'
  return 'green'
}

// 取得優先級顏色
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

// 取得優先級圖示
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
</script>

<style scoped lang="scss">
// 對話框樣式（與新增機台對話框標題同配色）
.dialog-card {
  border-radius: 16px !important;
  overflow: hidden;
  border: 1px solid var(--daycare-divider-light);
}

.dialog-title {
  padding: 18px 24px;
  font-size: 1.15rem;
  color: #ffffff;

  &--add {
    background: linear-gradient(135deg, rgba(74, 107, 95, 0.95), rgba(123, 163, 184, 0.85));
  }
}

.dialog-content {
  background: linear-gradient(to bottom, #f8f9fa 0%, #ffffff 100%);
}

// 品號面板樣式
.product-panel {
  border-radius: 12px !important;
  overflow: hidden;
  transition: all 0.3s ease;
  
  &--0 {
    border-left: 4px solid rgb(var(--v-theme-primary)) !important;
  }
  
  &--1 {
    border-left: 4px solid rgb(var(--v-theme-teal)) !important;
  }
  
  &--2 {
    border-left: 4px solid rgb(var(--v-theme-orange)) !important;
  }
  
  &--3 {
    border-left: 4px solid rgb(var(--v-theme-purple)) !important;
  }
  
  &:hover {
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1) !important;
  }
}

.panel-title {
  min-height: 56px;
  background: linear-gradient(to right, rgba(0, 0, 0, 0.02), transparent);
}

.panel-content {
  background: #fafafa;
}

// 資訊卡片
.info-card,
.operator-card,
.remark-card {
  border-radius: 8px !important;
  overflow: hidden;
}

// 操作人員項目（單列版）
.operator-item-compact {
  transition: all 0.2s ease;
  min-height: 56px;
  
  &:hover {
    background: #f8f9fa !important;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    transform: translateY(-1px);
  }
}

// 按鈕間距
.gap-1 {
  gap: 4px;
}

// Chip 間距
.gap-2 {
  gap: 8px;
}

// 新增品號按鈕
.add-product-btn {
  border: 2px dashed rgb(var(--v-theme-primary)) !important;
  border-radius: 8px !important;
  transition: all 0.3s ease;
  
  &:hover {
    background: rgba(var(--v-theme-primary), 0.05) !important;
    border-style: solid !important;
  }
}

// 動畫效果
@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.v-expansion-panel {
  animation: fadeIn 0.3s ease;
}
</style>
