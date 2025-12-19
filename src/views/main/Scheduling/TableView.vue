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
              :class="{'highlight-row': item.狀態 === '人力不足' || item.狀態 === '無可用人力'}">
              <td class="font-weight-bold">{{ item.機台編號 }}</td>
              <td class="font-weight-bold">{{ item.機台名稱 }}</td>
              <td>
                <span v-if="item.執行品號" class="font-weight-medium text-primary">
                  {{ item.執行品號 }}
                </span>
                <span v-else class="text-grey">-</span>
              </td>
              <td>
                <span v-if="item.人力代碼" class="font-weight-bold" :class="'text-' + getLaborCodeColor(item.人力代碼)">
                  {{ item.人力代碼 }}
                </span>
                <span v-else class="text-grey">-</span>
              </td>
              <td>
                <v-chip v-if="item.生產優先" size="default" :color="getPriorityColor(item.生產優先)" variant="flat">
                  <v-icon start size="small">{{ getPriorityIcon(item.生產優先) }}</v-icon>
                  {{ item.生產優先 }}
                </v-chip>
              </td>
              <td>
                <div class="operator-drop-zone d-flex flex-wrap gap-1"
                  @dragover.prevent="onDragOver($event)"
                  @dragleave="onDragLeave($event)"
                  @drop="onDrop($event, item)">
                  <v-tooltip v-for="(name, idx) in item.操作人員名稱" :key="idx" location="top">
                    <template #activator="{ props: tooltipProps }">
                      <v-chip size="default" color="indigo"
                        variant="elevated" class="draggable-chip" :draggable="true"
                        v-bind="tooltipProps"
                        @dragstart="onDragStart($event, name, item, idx)"
                        @dragend="onDragEnd">
                        <v-icon start size="small">mdi-account</v-icon>
                        {{ name }}
                      </v-chip>
                    </template>
                    <div v-if="getOperatorSkills(item.operatorSnkeys && item.operatorSnkeys[idx])">
                      <div class="font-weight-bold mb-1">精通品號：</div>
                      <div>{{ getOperatorSkills(item.operatorSnkeys[idx]) }}</div>
                    </div>
                    <div v-else>無精通品號</div>
                  </v-tooltip>
                  <span v-if="!item.操作人員名稱 || item.操作人員名稱.length === 0" class="text-grey drop-hint">-</span>
                </div>
              </td>
              <td>
                <v-chip size="default" :color="getStatusColor(item.狀態)" variant="flat">
                  {{ item.狀態 }}
                </v-chip>
              </td>
              <td>
                <span v-if="item.備註" class="text-caption">{{ item.備註 }}</span>
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

    <!-- 快速編輯對話框 -->
    <v-dialog v-model="editDialog" max-width="600px">
      <v-card>
        <v-card-title class="dialog-title">
          <span>編輯排班 - {{ editingItem?.機台名稱 }}</span>
        </v-card-title>
        <v-card-text class="pt-4">
          <v-row>
            <v-col cols="12">
              <v-text-field label="品號" v-model="editingItem.執行品號" readonly density="comfortable"
                variant="outlined"></v-text-field>
            </v-col>
            <v-col cols="12">
              <v-autocomplete label="操作人員" v-model="editingItem.操作人員名稱" :items="availableOperatorNames" multiple
                chips closable-chips density="comfortable" variant="outlined"></v-autocomplete>
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
import { ref, computed, onMounted, watch } from 'vue'
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
  selectedShift: {
    type: String,
    required: true
  },
  operators: {
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

// 拖拉相關
const dragData = ref(null)
const isDragging = ref(false)

// 載入排班資料
const loadSchedule = async () => {
  if (!props.selectedDate || !props.selectedShift) return
  
  loading.value = true
  try {
    const rs = await api.get('schedule')
    if (rs && rs.length > 0) {
      // 過濾出符合日期和時段的排班
      scheduleResults.value = rs
        .map(i => ({
          ...JSON.parse(i.datalist),
          snkey: i.snkey
        }))
        .filter(item => item.date === props.selectedDate && item.shift === props.selectedShift)
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

// 可用操作人員名稱（從 props.operators 獲取所有操作人員）
const availableOperatorNames = computed(() => {
  if (props.operators && props.operators.length > 0) {
    return props.operators.map(op => op.人員名稱 || op.名稱).filter(Boolean)
  }
  return []
})

// 過濾後的結果（按機台編號排序）
const filteredResults = computed(() => {
  let results = [...scheduleResults.value]
  
  // 按機台編號排序
  results.sort((a, b) => {
    const numA = parseInt(a.機台編號) || 0
    const numB = parseInt(b.機台編號) || 0
    return numA - numB
  })
  
  if (!searchKey.value) return results

  const keyword = searchKey.value.toUpperCase()
  return results.filter(item => {
    const str = JSON.stringify(item).toUpperCase()
    return str.includes(keyword)
  })
})

// 方法
const editItem = (item) => {
  editingItem.value = { ...item }
  editDialog.value = true
}

const saveEdit = async () => {
  if (!editingItem.value) return
  
  // 將操作人員名稱轉換為 snkey
  if (editingItem.value.操作人員名稱 && editingItem.value.操作人員名稱.length > 0) {
    editingItem.value.operatorSnkeys = editingItem.value.操作人員名稱.map(name => {
      const operator = props.operators.find(op => (op.人員名稱 || op.名稱) === name)
      return operator ? operator.snkey : null
    }).filter(Boolean)
  } else {
    editingItem.value.operatorSnkeys = []
  }
  
  // 更新狀態：根據操作人員數量
  if (!editingItem.value.操作人員名稱 || editingItem.value.操作人員名稱.length === 0) {
    editingItem.value.狀態 = '待排'
  } else if (editingItem.value.狀態 === '待排' || editingItem.value.狀態 === '無可用人力' || editingItem.value.狀態 === '人力不足') {
    editingItem.value.狀態 = '已排'
  }
  
  // 更新本地資料
  const index = scheduleResults.value.findIndex(r => r.machineSnkey === editingItem.value.machineSnkey)
  if (index !== -1) {
    scheduleResults.value[index] = { ...editingItem.value }
  }
  
  // 透過 API 更新資料庫
  if (editingItem.value.snkey) {
    console.log('--- [表格-編輯儲存] 開始更新 ---')
    console.log('機台:', editingItem.value.機台名稱, ', snkey:', editingItem.value.snkey)
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
      console.log('[表格-編輯儲存] POST payload:', payload)
      const rs = await api.post('schedule', payload)
      console.log('[表格-編輯儲存] POST 結果:', rs)
      console.log('--- [表格-編輯儲存] 更新完成 ---')
    } catch (error) {
      console.error('[表格-編輯儲存] 更新失敗:', error)
    }
  }
  
  emit('update', editingItem.value)
  editDialog.value = false
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

// 拖拉方法
const onDragStart = (event, name, sourceItem, idx) => {
  dragData.value = { name, sourceItem, idx }
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
  
  const { name, sourceItem, idx } = dragData.value
  
  // 從來源機台移除人員
  if (sourceItem && sourceItem.操作人員名稱) {
    sourceItem.操作人員名稱.splice(idx, 1)
    if (sourceItem.operatorSnkeys) {
      sourceItem.operatorSnkeys.splice(idx, 1)
    }
    // 更新狀態
    if (sourceItem.操作人員名稱.length === 0) {
      sourceItem.狀態 = '待排'
    }
    
    // 如果有 snkey，透過 API 更新資料庫
    if (sourceItem.snkey) {
      console.log('--- [移除人員] 開始更新 ---')
      console.log('機台:', sourceItem.機台名稱, ', snkey:', sourceItem.snkey)
      console.log('移除人員:', name)
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
  
  dragData.value = null
}

const onDragOver = (event) => {
  event.currentTarget.classList.add('drag-over')
}

const onDragLeave = (event) => {
  event.currentTarget.classList.remove('drag-over')
}

const onDrop = async (event, targetItem) => {
  event.currentTarget.classList.remove('drag-over')
  
  // 檢查是否從剩餘人力拖入
  const remainingData = event.dataTransfer.getData('remainingOperator')
  if (remainingData) {
    const { snkey, name } = JSON.parse(remainingData)
    
    // 目標已有此人員則跳過
    if (targetItem.操作人員名稱 && targetItem.操作人員名稱.includes(name)) return
    
    // 加到目標
    if (!targetItem.操作人員名稱) {
      targetItem.操作人員名稱 = []
    }
    if (!targetItem.operatorSnkeys) {
      targetItem.operatorSnkeys = []
    }
    targetItem.操作人員名稱.push(name)
    targetItem.operatorSnkeys.push(snkey)
    
    // 更新狀態：如果原本是待排、無可用人力或人力不足，加入人員後改為已排
    if (targetItem.狀態 === '待排' || targetItem.狀態 === '無可用人力' || targetItem.狀態 === '人力不足') {
      targetItem.狀態 = '已排'
    }
    
    // 透過 API 更新資料庫
    if (targetItem.snkey) {
      console.log('--- [從剩餘人力拖入] 開始更新 ---')
      console.log('目標機台:', targetItem.機台名稱)
      console.log('新增人員:', name)
      console.log('目標 snkey:', targetItem.snkey)
      try {
        const payload = {
          snkey: targetItem.snkey,
          datalist: JSON.stringify({
            ...targetItem,
            editInfo: [...(targetItem.editInfo || []), {
              name: store.state.pData?.username || 'system',
              time: dayjs().format('YYYY-MM-DD HH:mm:ss'),
              action: '新增人員'
            }]
          })
        }
        console.log('POST payload:', payload)
        const rs = await api.post('schedule', payload)
        console.log('POST 結果:', rs)
        console.log('--- [從剩餘人力拖入] 更新完成 ---')
      } catch (error) {
        console.error('更新資料庫失敗:', error)
      }
    }
    
    // 發送更新事件
    emit('update', targetItem)
    return
  }
  
  if (!dragData.value) return
  
  const { name, sourceItem, idx } = dragData.value
  
  // 不能拖到同一個機台
  if (sourceItem.機台名稱 === targetItem.機台名稱) return
  
  // 目標已有此人員則跳過
  if (targetItem.操作人員名稱 && targetItem.操作人員名稱.includes(name)) return
  
  // 從來源移除
  const sourceIdx = sourceItem.operatorSnkeys ? sourceItem.operatorSnkeys[idx] : null
  sourceItem.操作人員名稱.splice(idx, 1)
  if (sourceItem.operatorSnkeys) {
    sourceItem.operatorSnkeys.splice(idx, 1)
  }
  
  // 更新來源狀態
  if (sourceItem.操作人員名稱.length === 0) {
    sourceItem.狀態 = '待排'
  }
  
  // 加到目標
  if (!targetItem.操作人員名稱) {
    targetItem.操作人員名稱 = []
  }
  if (!targetItem.operatorSnkeys) {
    targetItem.operatorSnkeys = []
  }
  targetItem.操作人員名稱.push(name)
  if (sourceIdx) {
    targetItem.operatorSnkeys.push(sourceIdx)
  }
  
  // 更新目標狀態：如果原本是待排、無可用人力或人力不足，加入人員後改為已排
  if (targetItem.狀態 === '待排' || targetItem.狀態 === '無可用人力' || targetItem.狀態 === '人力不足') {
    targetItem.狀態 = '已排'
  }
  
  // 透過 API 更新來源資料
  console.log('--- [機台間拖拉] 開始更新 ---')
  console.log('來源機台:', sourceItem.機台名稱, ', snkey:', sourceItem.snkey)
  console.log('目標機台:', targetItem.機台名稱, ', snkey:', targetItem.snkey)
  console.log('移動人員:', name)
  
  if (sourceItem.snkey) {
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
  
  // 透過 API 更新目標資料
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
            action: '新增人員'
          }]
        })
      }
      console.log('[目標機台] POST payload:', payload)
      const rs = await api.post('schedule', payload)
      console.log('[目標機台] POST 結果:', rs)
    } catch (error) {
      console.error('[目標機台] 更新失敗:', error)
    }
  }
  console.log('--- [機台間拖拉] 更新完成 ---')
  
  // 發送更新事件
  emit('update', sourceItem)
  emit('update', targetItem)
  
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
</style>

