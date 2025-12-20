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
              <td v-for="machine in machines" :key="machine.snkey" class="machine-cell"
                  @dragover.prevent="onDragOver($event)"
                  @dragleave="onDragLeave($event)"
                  @drop="onDrop($event, shift, machine.snkey)"
                  @click="editItem(shift, machine.snkey)">
                <div v-if="getScheduleData(shift, machine.snkey)" class="cell-content text-no-wrap" style="cursor: pointer;">
                  <div class="d-flex align-center mb-1">
                    <v-icon v-if="getScheduleData(shift, machine.snkey).生產優先" 
                      :color="getPriorityColor(getScheduleData(shift, machine.snkey).生產優先)" 
                      size="small" class="mr-1">
                      {{ getPriorityIcon(getScheduleData(shift, machine.snkey).生產優先) }}
                    </v-icon>
                    <span class="text-body-2 font-weight-bold text-primary" v-if="getScheduleData(shift, machine.snkey).執行品號">
                      {{ getScheduleData(shift, machine.snkey).執行品號 }}
                    </span>
                  </div>
                  <div class="text-caption mb-1" :class="'text-' + getLaborCodeColor(getScheduleData(shift, machine.snkey).人力代碼)" 
                    v-if="getScheduleData(shift, machine.snkey).人力代碼">
                    {{ getScheduleData(shift, machine.snkey).人力代碼 }}
                  </div>
                  <div class="operator-drop-zone">
                    <div v-for="(name, idx) in getScheduleData(shift, machine.snkey).操作人員名稱" :key="idx" class="d-flex align-center mb-1">
                      <v-chip size="small" color="indigo" variant="elevated" class="draggable-chip"
                        :draggable="true"
                        @dragstart="onDragStart($event, name, shift, machine.snkey, idx)"
                        @dragend="onDragEnd"
                        @click.stop>
                        {{ name }}
                      </v-chip>
                      <v-chip v-if="getOperatorTime(getScheduleData(shift, machine.snkey), idx)" size="x-small" color="teal" variant="tonal" class="ml-2">
                        <v-icon start size="x-small">mdi-clock-outline</v-icon>
                        {{ getOperatorTime(getScheduleData(shift, machine.snkey), idx) }}
                      </v-chip>
                    </div>
                  </div>
                  <v-chip v-if="shouldShowStatus(getScheduleData(shift, machine.snkey).狀態)" size="x-small" 
                    :color="getStatusColor(getScheduleData(shift, machine.snkey).狀態)"
                    variant="tonal" class="mt-1">
                    {{ getScheduleData(shift, machine.snkey).狀態 }}
                  </v-chip>
                  <div v-if="getScheduleData(shift, machine.snkey).備註" class="text-caption text-grey mt-1">
                    {{ getScheduleData(shift, machine.snkey).備註 }}
                  </div>
                </div>
                <div v-else class="text-center text-grey-lighten-1 empty-drop-zone"
                  @dragover.prevent="onDragOver($event)"
                  @dragleave="onDragLeave($event)"
                  @drop="onDrop($event, shift, machine.snkey)">
                  -
                </div>
              </td>
            </tr>
          </tbody>
        </v-table>
      </v-card-text>
    </v-card>

    <!-- 複製/移動選擇對話框 -->
    <v-dialog v-model="copyMoveDialog" max-width="400px" persistent>
      <v-card>
        <v-card-title class="dialog-title">
          <span>選擇操作方式</span>
        </v-card-title>
        <v-card-text class="pt-4">
          <div class="text-body-1 mb-4">
            將 <strong>{{ pendingDropData?.name }}</strong> 從 <strong>{{ pendingDropData?.sourceShift }} - {{ pendingDropData?.sourceItem?.機台名稱 }}</strong> 
            {{ pendingDropData?.action === 'copy' ? '複製' : '移動' }}到 <strong>{{ pendingDropData?.targetShift }} - {{ pendingDropData?.targetItem?.機台名稱 }}</strong>？
          </div>
          <v-radio-group v-model="dropAction" inline>
            <v-radio label="複製（保留原位置）" value="copy" color="primary">
              <template #label>
                <div>
                  <div class="font-weight-bold">複製</div>
                  <div class="text-caption text-grey">人員會同時存在於兩個機台</div>
                </div>
              </template>
            </v-radio>
            <v-radio label="移動（從原位置移除）" value="move" color="primary">
              <template #label>
                <div>
                  <div class="font-weight-bold">移動</div>
                  <div class="text-caption text-grey">人員會從原機台移除</div>
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

    <!-- 快速編輯對話框 -->
    <v-dialog v-model="editDialog" max-width="600px">
      <v-card>
        <v-card-title class="dialog-title">
          <span>編輯排班 - {{ editingItem?.機台名稱 }} ({{ editingItem?.shift }})</span>
        </v-card-title>
        <v-card-text class="pt-4">
          <v-row>
            <v-col cols="12">
              <v-text-field label="品號" v-model="editingItem.執行品號" readonly density="comfortable"
                variant="outlined"></v-text-field>
            </v-col>
            <v-col cols="12">
              <div class="text-body-2 mb-2">操作人員</div>
              <div v-for="(operator, idx) in editingItem.操作人員列表" :key="idx" class="mb-3 pa-3" style="border: 1px solid rgba(0,0,0,0.12); border-radius: 8px;">
                <div class="d-flex align-center justify-space-between mb-2">
                  <v-chip size="default" color="indigo" variant="flat">
                    <v-icon start size="small">mdi-account</v-icon>
                    {{ operator.name }}
                  </v-chip>
                  <v-btn icon="mdi-close" size="x-small" variant="text" @click="removeOperator(idx)"></v-btn>
                </div>
                <v-row>
                  <v-col cols="6">
                    <v-text-field label="開始時間" v-model="operator.startTime" type="time" density="comfortable"
                      variant="outlined" hide-details></v-text-field>
                  </v-col>
                  <v-col cols="6">
                    <v-text-field label="結束時間" v-model="operator.endTime" type="time" density="comfortable"
                      variant="outlined" hide-details></v-text-field>
                  </v-col>
                </v-row>
              </div>
              <v-autocomplete label="新增操作人員" :items="availableOperatorNames" v-model="newOperatorName"
                @update:model-value="(val) => { if (val) { addOperator(val); newOperatorName = null } }" 
                density="comfortable" variant="outlined" clearable>
              </v-autocomplete>
            </v-col>
            <v-col cols="12">
              <v-textarea label="備註" v-model="editingItem.備註" density="comfortable" variant="outlined" rows="3">
              </v-textarea>
            </v-col>
          </v-row>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn color="grey" variant="text" @click="editDialog = false">取消</v-btn>
          <v-btn color="primary" variant="flat" @click="saveEdit">儲存</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import api from '@/assets/js/api.js'
import { useStore } from '@/stores/useStore'
import dayjs from 'dayjs'

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
  }
})

// Emits
const emit = defineEmits(['update'])

// 響應式數據
const loading = ref(false)
const allScheduleData = ref([])
const shiftOptions = ['早', '中上', '中下', '晚']
const dragData = ref(null)
const isDragging = ref(false)
const copyMoveDialog = ref(false)
const dropAction = ref('move')
const pendingDropData = ref(null)
const editDialog = ref(false)
const editingItem = ref(null)
const newOperatorName = ref(null)

// 從載入的資料中取得實際日期
const actualDate = computed(() => {
  if (allScheduleData.value.length > 0 && allScheduleData.value[0].date) {
    return allScheduleData.value[0].date
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
      allScheduleData.value = rs
        .map(i => ({
          ...JSON.parse(i.datalist),
          snkey: i.snkey
        }))
        .filter(item => item.date === props.selectedDate)
    } else {
      allScheduleData.value = []
    }
  } catch (error) {
    console.error('載入排班錯誤:', error)
  } finally {
    loading.value = false
  }
}

// 取得特定時段和機台的排班資料
const getScheduleData = (shift, machineSnkey) => {
  return allScheduleData.value.find(
    item => item.shift === shift && item.machineSnkey === machineSnkey
  )
}

// 可用操作人員名稱（從 props.operators 獲取所有操作人員）
const availableOperatorNames = computed(() => {
  if (props.operators && props.operators.length > 0) {
    return props.operators.map(op => op.人員名稱 || op.名稱).filter(Boolean)
  }
  return []
})

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

// 取得操作人員時間顯示
const getOperatorTime = (item, idx) => {
  if (!item) return ''
  if (item.操作人員時間 && item.操作人員時間[idx]) {
    const time = item.操作人員時間[idx]
    if (time.startTime && time.endTime) {
      return `${time.startTime} - ${time.endTime}`
    } else if (time.startTime) {
      return `${time.startTime} -`
    } else if (time.endTime) {
      return `- ${time.endTime}`
    }
  }
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

// 拖拉方法
const onDragStart = (event, name, shift, machineSnkey, idx) => {
  dragData.value = { name, shift, machineSnkey, idx }
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
  
  const { name, shift, machineSnkey, idx } = dragData.value
  
  // 取得來源資料
  const sourceData = getScheduleData(shift, machineSnkey)
  
  if (sourceData && sourceData.操作人員名稱) {
    sourceData.操作人員名稱.splice(idx, 1)
    if (sourceData.operatorSnkeys) {
      sourceData.operatorSnkeys.splice(idx, 1)
    }
    // 更新狀態
    if (sourceData.操作人員名稱.length === 0) {
      sourceData.狀態 = '待排'
    }
    
    // 透過 API 更新資料庫
    if (sourceData.snkey) {
      console.log('--- [總覽-移除人員] 開始更新 ---')
      console.log('時段:', shift, ', 機台 snkey:', machineSnkey)
      console.log('移除人員:', name)
      try {
        const payload = {
          snkey: sourceData.snkey,
          tablename: 'schedule',
          datalist: JSON.stringify({
            ...sourceData,
            editInfo: [...(sourceData.editInfo || []), {
              name: store.state.pData?.username || 'system',
              time: dayjs().format('YYYY-MM-DD HH:mm:ss'),
              action: '移除人員'
            }]
          })
        }
        console.log('[總覽-移除人員] POST payload:', payload)
        const rs = await api.post('schedule', payload)
        console.log('[總覽-移除人員] POST 結果:', rs)
        console.log('--- [總覽-移除人員] 更新完成 ---')
      } catch (error) {
        console.error('[總覽-移除人員] 更新失敗:', error)
      }
    }
    
    emit('update', sourceData)
  }
  
  dragData.value = null
}

const onDragOver = (event) => {
  event.currentTarget.classList.add('drag-over')
}

const onDragLeave = (event) => {
  event.currentTarget.classList.remove('drag-over')
}

const onDrop = async (event, targetShift, targetMachineSnkey) => {
  event.currentTarget.classList.remove('drag-over')
  
  if (!dragData.value) return
  
  const { name, shift: sourceShift, machineSnkey: sourceMachineSnkey, idx } = dragData.value
  
  // 不能拖到同一格
  if (sourceShift === targetShift && sourceMachineSnkey === targetMachineSnkey) {
    dragData.value = null
    return
  }
  
  // 取得來源和目標資料
  const sourceData = getScheduleData(sourceShift, sourceMachineSnkey)
  const targetData = getScheduleData(targetShift, targetMachineSnkey)
  
  if (!sourceData) {
    dragData.value = null
    return
  }
  
  // 目標已有此人員則跳過
  if (targetData && targetData.操作人員名稱 && targetData.操作人員名稱.includes(name)) {
    dragData.value = null
    return
  }
  
  // 保存拖放資訊，顯示選擇對話框
  pendingDropData.value = {
    name,
    sourceShift,
    targetShift,
    sourceMachineSnkey,
    targetMachineSnkey,
    sourceItem: sourceData ? { ...sourceData } : null,
    targetItem: targetData ? { ...targetData } : null,
    idx,
    action: dropAction.value
  }
  dropAction.value = 'move' // 預設為移動
  copyMoveDialog.value = true
}

// 確認拖放操作
const confirmDrop = async () => {
  if (!pendingDropData.value) {
    copyMoveDialog.value = false
    return
  }
  
  const { name, sourceShift, targetShift, sourceMachineSnkey, targetMachineSnkey, sourceItem: sourceItemData, targetItem: targetItemData, idx } = pendingDropData.value
  const isCopy = dropAction.value === 'copy'
  
  // 取得實際的資料
  const sourceData = getScheduleData(sourceShift, sourceMachineSnkey)
  let targetData = getScheduleData(targetShift, targetMachineSnkey)
  
  if (!sourceData) {
    copyMoveDialog.value = false
    pendingDropData.value = null
    dragData.value = null
    return
  }
  
  // 如果目標不存在，需要創建（但這種情況在總覽中應該不會發生，因為總覽顯示的是已存在的排班）
  // 加到目標
  if (targetData) {
    if (!targetData.操作人員名稱) {
      targetData.操作人員名稱 = []
    }
    if (!targetData.operatorSnkeys) {
      targetData.operatorSnkeys = []
    }
    targetData.操作人員名稱.push(name)
    
    // 如果是複製，需要找到操作人員的 snkey（總覽視圖中沒有 operators prop，需要從其他地方獲取）
    if (isCopy) {
      // 複製時，使用來源的 snkey（因為是同一個人）
      const sourceSnkey = sourceData.operatorSnkeys ? sourceData.operatorSnkeys[idx] : null
      if (sourceSnkey) {
        targetData.operatorSnkeys.push(sourceSnkey)
      }
    } else {
      // 移動：使用來源的 snkey
      const sourceSnkey = sourceData.operatorSnkeys ? sourceData.operatorSnkeys[idx] : null
      if (sourceSnkey) {
        targetData.operatorSnkeys.push(sourceSnkey)
      }
      
      // 從來源移除
      sourceData.操作人員名稱.splice(idx, 1)
      if (sourceData.operatorSnkeys) {
        sourceData.operatorSnkeys.splice(idx, 1)
      }
      
      // 更新來源狀態
      if (sourceData.操作人員名稱.length === 0) {
        sourceData.狀態 = '待排'
      }
    }
    
    // 更新狀態：如果原本是待排、無可用人力或人力不足，加入人員後改為已排
    if (targetData.狀態 === '待排' || targetData.狀態 === '無可用人力' || targetData.狀態 === '人力不足') {
      targetData.狀態 = '已排'
    }
  }
  
  // 透過 API 更新資料
  console.log(`--- [總覽-機台間拖拉-${isCopy ? '複製' : '移動'}] 開始更新 ---`)
  console.log('來源時段:', sourceShift, ', 來源機台 snkey:', sourceMachineSnkey)
  console.log('目標時段:', targetShift, ', 目標機台 snkey:', targetMachineSnkey)
  console.log(`${isCopy ? '複製' : '移動'}人員:`, name)
  
  // 如果是移動，更新來源資料
  if (!isCopy && sourceData.snkey) {
    console.log('[總覽-來源] 準備 POST...')
    try {
      const payload = {
        snkey: sourceData.snkey,
        datalist: JSON.stringify({
          ...sourceData,
          editInfo: [...(sourceData.editInfo || []), {
            name: store.state.pData?.username || 'system',
            time: dayjs().format('YYYY-MM-DD HH:mm:ss'),
            action: '移出人員'
          }]
        })
      }
      console.log('[總覽-來源] POST payload:', payload)
      const rs = await api.post('schedule', payload)
      console.log('[總覽-來源] POST 結果:', rs)
    } catch (error) {
      console.error('[總覽-來源] 更新失敗:', error)
    }
  }
  
  // 更新目標資料
  if (targetData && targetData.snkey) {
    console.log('[總覽-目標] 準備 POST...')
    try {
      const payload = {
        snkey: targetData.snkey,
        datalist: JSON.stringify({
          ...targetData,
          editInfo: [...(targetData.editInfo || []), {
            name: store.state.pData?.username || 'system',
            time: dayjs().format('YYYY-MM-DD HH:mm:ss'),
            action: isCopy ? '複製人員' : '新增人員'
          }]
        })
      }
      console.log('[總覽-目標] POST payload:', payload)
      const rs = await api.post('schedule', payload)
      console.log('[總覽-目標] POST 結果:', rs)
    } catch (error) {
      console.error('[總覽-目標] 更新失敗:', error)
    }
  }
  console.log(`--- [總覽-機台間拖拉-${isCopy ? '複製' : '移動'}] 更新完成 ---`)
  
  // 發送更新事件
  if (!isCopy) {
    emit('update', { source: sourceData, target: targetData })
  } else {
    emit('update', { source: null, target: targetData })
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

// 編輯相關方法
const editItem = (shift, machineSnkey) => {
  const scheduleData = getScheduleData(shift, machineSnkey)
  if (scheduleData) {
    editingItem.value = { ...scheduleData, shift, machineSnkey }
    
    // 初始化操作人員列表（如果不存在）
    if (!editingItem.value.操作人員列表) {
      editingItem.value.操作人員列表 = []
      if (editingItem.value.操作人員名稱 && editingItem.value.操作人員名稱.length > 0) {
        editingItem.value.操作人員名稱.forEach((name, idx) => {
          const snkey = editingItem.value.operatorSnkeys && editingItem.value.operatorSnkeys[idx] 
            ? editingItem.value.operatorSnkeys[idx] 
            : null
          editingItem.value.操作人員列表.push({
            name,
            snkey,
            startTime: editingItem.value.操作人員時間 && editingItem.value.操作人員時間[idx] 
              ? editingItem.value.操作人員時間[idx].startTime || '' 
              : '',
            endTime: editingItem.value.操作人員時間 && editingItem.value.操作人員時間[idx] 
              ? editingItem.value.操作人員時間[idx].endTime || '' 
              : ''
          })
        })
      }
    }
    
    editDialog.value = true
  }
}

// 新增操作人員
const addOperator = (name) => {
  if (!name || !editingItem.value) return
  
  // 檢查是否已存在
  if (editingItem.value.操作人員列表.some(op => op.name === name)) {
    return
  }
  
  const operator = props.operators.find(op => (op.人員名稱 || op.名稱) === name)
  editingItem.value.操作人員列表.push({
    name,
    snkey: operator ? operator.snkey : null,
    startTime: '',
    endTime: ''
  })
}

// 移除操作人員
const removeOperator = (idx) => {
  if (editingItem.value && editingItem.value.操作人員列表) {
    editingItem.value.操作人員列表.splice(idx, 1)
  }
}

const saveEdit = async () => {
  if (!editingItem.value) return
  
  // 從操作人員列表轉換為操作人員名稱和operatorSnkeys
  if (editingItem.value.操作人員列表 && editingItem.value.操作人員列表.length > 0) {
    editingItem.value.操作人員名稱 = editingItem.value.操作人員列表.map(op => op.name)
    editingItem.value.operatorSnkeys = editingItem.value.操作人員列表.map(op => op.snkey).filter(Boolean)
    editingItem.value.操作人員時間 = editingItem.value.操作人員列表.map(op => ({
      startTime: op.startTime || '',
      endTime: op.endTime || ''
    }))
  } else {
    editingItem.value.操作人員名稱 = []
    editingItem.value.operatorSnkeys = []
    editingItem.value.操作人員時間 = []
  }
  
  // 更新狀態：根據操作人員數量
  if (!editingItem.value.操作人員名稱 || editingItem.value.操作人員名稱.length === 0) {
    editingItem.value.狀態 = '待排'
  } else if (editingItem.value.狀態 === '待排' || editingItem.value.狀態 === '無可用人力' || editingItem.value.狀態 === '人力不足') {
    editingItem.value.狀態 = '已排'
  }
  
  // 更新本地資料
  const index = allScheduleData.value.findIndex(
    item => item.shift === editingItem.value.shift && item.machineSnkey === editingItem.value.machineSnkey
  )
  if (index !== -1) {
    allScheduleData.value[index] = { ...editingItem.value }
  }
  
  // 透過 API 更新資料庫
  if (editingItem.value.snkey) {
    console.log('--- [總覽-編輯儲存] 開始更新 ---')
    console.log('時段:', editingItem.value.shift, ', 機台:', editingItem.value.機台名稱, ', snkey:', editingItem.value.snkey)
    try {
      const payload = {
        snkey: editingItem.value.snkey,
        datalist: JSON.stringify({
          ...editingItem.value,
          editInfo: [...(editingItem.value.editInfo || []), {
            name: store.state.pData?.username || 'system',
            time: dayjs().format('YYYY-MM-DD HH:mm:ss'),
            action: '編輯排班'
          }]
        })
      }
      console.log('[總覽-編輯儲存] POST payload:', payload)
      const rs = await api.post('schedule', payload)
      console.log('[總覽-編輯儲存] POST 結果:', rs)
      console.log('--- [總覽-編輯儲存] 更新完成 ---')
    } catch (error) {
      console.error('[總覽-編輯儲存] 更新失敗:', error)
    }
  }
  
  emit('update', editingItem.value)
  editDialog.value = false
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

.dialog-title {
  background: linear-gradient(135deg, rgba(74, 107, 95, 0.95), rgba(123, 163, 184, 0.85));
  color: white;
}
</style>

