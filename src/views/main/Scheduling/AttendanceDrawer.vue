<template>
  <v-navigation-drawer v-model="drawer" temporary location="left" width="520">
    <v-card flat>
      <v-card-title class="d-flex align-center justify-space-between attendance-drawer-title">
        <div class="d-flex align-center">
          <v-icon class="mr-2">mdi-account-clock</v-icon>
          <span>人員出勤設定</span>
        </div>
        <v-btn icon="mdi-close" variant="text" size="small" color="white" @click="drawer = false"></v-btn>
      </v-card-title>
      
      <!-- 統計區 -->
      <div class="stats-section pa-2">
        <div class="d-flex flex-nowrap gap-2">
          <v-chip v-for="status in statusOptions" :key="status" color="grey-darken-2" 
            variant="tonal" size="small" class="stats-chip">
            {{ status }} {{ statusCounts[status] || 0 }}
          </v-chip>
          <v-divider vertical></v-divider>
          <v-chip v-for="shift in shiftOptions" :key="shift" color="primary" 
            variant="tonal" size="small" class="stats-chip">
            {{ shift }} {{ shiftCounts[shift] || 0 }}
          </v-chip>
        </div>
      </div>
      
      <v-divider></v-divider>
      <v-card-text class="pa-0">
        <v-text-field v-model="searchKey" label="搜尋人員" density="compact" variant="outlined"
          prepend-inner-icon="mdi-magnify" hide-details clearable class="ma-3"></v-text-field>
        
<v-list density="compact" class="attendance-list">
          <div v-for="op in filteredOperators" :key="op.snkey" class="attendance-item">
            <div class="d-flex align-center w-100">
              <!-- 左側：頭像 + 名稱（上下排列） -->
              <div class="d-flex flex-column align-center mr-3">
                <v-avatar :color="op.性別 === '男' ? 'blue' : 'pink'" size="36">
                  <span class="text-white text-body-2 font-weight-bold">{{ op.性別 }}</span>
                </v-avatar>
                <div class="font-weight-bold text-caption mt-1">{{ op.人員名稱 }}</div>
              </div>
              
              <!-- 狀態 -->
              <div class="d-flex gap-2">
                <v-chip v-for="status in statusOptions" :key="status" 
                  :color="op.狀態 === status ? getStatusColor(status) : 'grey-lighten-2'"
                  :variant="op.狀態 === status ? 'flat' : 'outlined'"
                  size="small"
                  class="status-chip"
                  @click="changeStatus(op, status)">
                  {{ status }}
                </v-chip>
              </div>
              
              <v-spacer></v-spacer>
              
              <!-- 時段 -->
              <div class="d-flex gap-2">
                <v-chip v-for="shift in shiftOptions" :key="shift" 
                  :color="op.可上班時段?.includes(shift) ? getShiftColor(shift) : 'grey-lighten-2'"
                  :variant="op.可上班時段?.includes(shift) ? 'flat' : 'outlined'"
                  size="small"
                  class="shift-chip"
                  @click="toggleShift(op, shift)">
                  {{ shift }}
                </v-chip>
              </div>
            </div>
          </div>
        </v-list>
      </v-card-text>
    </v-card>
  </v-navigation-drawer>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useStore } from '@/stores/useStore'
import { getCurrentInstance } from 'vue'
import dayjs from "dayjs"
import api from '@/assets/js/api.js'

const { proxy } = getCurrentInstance()
const store = useStore()

// Props
const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  },
  operators: {
    type: Array,
    default: () => []
  }
})

// Emits
const emit = defineEmits(['update:modelValue', 'updated'])

// 響應式數據
const searchKey = ref('')
const shiftOptions = ['早', '中上', '中下', '晚']
const statusOptions = ['上班', '休假', '請假', '離職']

// 雙向綁定 drawer
const drawer = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val)
})

// 過濾後的操作人員
const filteredOperators = computed(() => {
  if (!searchKey.value) return props.operators
  const keyword = searchKey.value.toUpperCase()
  return props.operators.filter(op => 
    op.人員名稱?.toUpperCase().includes(keyword)
  )
})

// 狀態統計
const statusCounts = computed(() => {
  const counts = {}
  statusOptions.forEach(status => {
    counts[status] = props.operators.filter(op => op.狀態 === status).length
  })
  return counts
})

// 時段統計
const shiftCounts = computed(() => {
  const counts = {}
  shiftOptions.forEach(shift => {
    counts[shift] = props.operators.filter(op => 
      op.可上班時段 && op.可上班時段.includes(shift)
    ).length
  })
  return counts
})

// 切換狀態
const changeStatus = async (op, status) => {
  if (op.狀態 === status) return
  
  op.狀態 = status

  // 更新到資料庫
  try {
    op.editInfo = op.editInfo || []
    op.editInfo.unshift({
      snkey: store.state.pData.snkey,
      name: store.state.pData.username,
      time: dayjs().format("YYYY-MM-DD HH:mm:ss")
    })

    const postData = {
      snkey: op.snkey,
      datalist: JSON.stringify(op),
      updateTime: dayjs().format("YYYY-MM-DD HH:mm:ss")
    }

    await api.post('operator', postData)
    emit('updated')
  } catch (err) {
    console.error('更新人員狀態失敗:', err)
    proxy.$swal({ icon: "error", title: "更新失敗: " + err })
  }
}

// 切換時段
const toggleShift = async (op, shift) => {
  if (!op.可上班時段) {
    op.可上班時段 = []
  }
  
  const index = op.可上班時段.indexOf(shift)
  if (index > -1) {
    // 至少保留一個時段
    if (op.可上班時段.length <= 1) {
      proxy.$swal({ icon: "warning", title: "至少需選擇一個時段", timer: 1500 })
      return
    }
    op.可上班時段.splice(index, 1)
  } else {
    op.可上班時段.push(shift)
  }

  // 更新到資料庫
  try {
    op.editInfo = op.editInfo || []
    op.editInfo.unshift({
      snkey: store.state.pData.snkey,
      name: store.state.pData.username,
      time: dayjs().format("YYYY-MM-DD HH:mm:ss")
    })

    const postData = {
      snkey: op.snkey,
      datalist: JSON.stringify(op),
      updateTime: dayjs().format("YYYY-MM-DD HH:mm:ss")
    }

    await api.post('operator', postData)
    emit('updated')
  } catch (err) {
    console.error('更新人員時段失敗:', err)
    proxy.$swal({ icon: "error", title: "更新失敗: " + err })
  }
}

const getStatusColor = (status) => {
  const colorMap = {
    '上班': 'success',
    '休假': 'info',
    '請假': 'warning',
    '離職': 'error'
  }
  return colorMap[status] || 'grey'
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
</script>

<style scoped lang="scss">
.attendance-drawer-title {
  background: linear-gradient(135deg, rgba(74, 107, 95, 0.95), rgba(123, 163, 184, 0.85));
  color: white;
  padding: 16px;
}

.stats-section {
  background-color: rgba(74, 107, 95, 0.05);
}

.stats-chip {
  font-size: 0.95rem !important;
  font-weight: 600;
}

.attendance-list {
  max-height: calc(100vh - 140px);
  overflow-y: auto;
}

.attendance-item {
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);
  padding: 12px 16px;
  
  &:hover {
    background-color: rgba(74, 107, 95, 0.04);
  }
}

.operator-info {
  min-width: 80px;
}

.shift-chip {
  cursor: pointer;
  min-width: 44px;
  justify-content: center;
  font-weight: 600;
  font-size: 0.9rem !important;
  transition: all 0.2s ease;
  
  &:hover {
    transform: scale(1.05);
  }
}

.status-chip {
  cursor: pointer;
  font-size: 0.85rem !important;
  transition: all 0.2s ease;
  
  &:hover {
    transform: scale(1.05);
  }
}

:deep(.v-chip--variant-outlined) {
  opacity: 0.7;
  border: 2px dashed #aaa !important;
  background-color: #f5f5f5 !important;
  color: #666 !important;
  transition: all 0.2s ease;
  
  &:hover {
    opacity: 1;
    background-color: #e0e0e0 !important;
    color: #333 !important;
    border-color: #888 !important;
  }
}
</style>

