<template>
  <div class="scheduling-main pa-6">
    <!-- 左側人員出勤 Sidebar -->
    <AttendanceDrawer v-model="showAttendanceDrawer" :operators="operators" @updated="loadOperators" />
    <v-container fluid class="pa-0">
      <!-- 標題區 -->
      <v-row>
        <v-col cols="12">
          <v-sheet class="scheduling-hero" elevation="0" rounded="xl">
            <div class="d-flex flex-column flex-md-row align-center justify-space-between">
              <div class="d-flex align-center mb-4 mb-md-0">
                <v-avatar color="primary" variant="tonal" size="48" class="mr-3">
                  <v-icon color="primary">mdi-calendar-clock</v-icon>
                </v-avatar>
                <div>
                  <h2 class="hero-title mb-1">排班管理系統</h2>
                  <p class="hero-subtitle mb-0">自動化排班，優化人力配置。</p>
                </div>
              </div>
              <div class="d-flex align-center gap-3">
                <v-chip v-if="scheduleResults.length > 0" class="hero-chip" prepend-icon="mdi-information" size="small"
                  variant="outlined">
                  已排: {{ statistics.已排 }} / 總數: {{ statistics.total }}
                </v-chip>
              </div>
            </div>
          </v-sheet>
        </v-col>
      </v-row>

      <!-- Tab 切換區 -->
      <v-row class="mt-4">
        <v-col cols="12">
          <v-card class="tab-card" elevation="0" rounded="xl">
            <v-tabs v-model="activeTab" color="primary" align-tabs="start">
              <v-tab value="input">
                <v-icon start>mdi-format-list-bulleted</v-icon>
                步驟 1：設定各機台的品號
              </v-tab>
              <v-tab value="result" :disabled="scheduleResults.length === 0">
                <v-icon start>mdi-clipboard-check</v-icon>
                排班詳細資訊
                <v-chip v-if="scheduleResults.length > 0" size="x-small" color="success" class="ml-2">
                  {{ statistics.已排 }}/{{ statistics.total }}
                </v-chip>
              </v-tab>
            </v-tabs>

            <v-window v-model="activeTab">
              <!-- 步驟1: 機台列表 - 輸入品號 -->
              <v-window-item value="input">
                <v-card-title class="scheduling-toolbar-in-card pt-4 pb-3">
                  <!-- 第一列：說明 + 暫存區 -->
                  <div class="toolbar-row toolbar-row-head">
                    <span class="text-body-2 text-medium-emphasis">設定各機台的品號、生產優先及備註</span>
                    <div class="toolbar-group toolbar-group-storage">
                      <v-btn color="secondary" variant="tonal" size="small" prepend-icon="mdi-content-save"
                        @click="saveToLocalStorage">
                        暫存
                      </v-btn>
                      <v-btn color="info" variant="tonal" size="small" prepend-icon="mdi-download"
                        @click="loadFromLocalStorage">
                        讀取暫存
                      </v-btn>
                    </div>
                  </div>
                  <!-- 第二列：日期時段 + 排班操作 -->
                  <div class="toolbar-row toolbar-row-actions">
                    <div class="toolbar-group toolbar-group-filter">
                      <v-text-field v-model="selectedDate" type="date" label="選擇日期" density="compact"
                        variant="outlined" hide-details prepend-inner-icon="mdi-calendar" class="toolbar-field-date" />
                      <v-select v-model="selectedShift" :items="shiftOptions" label="選擇時段" density="compact"
                        variant="outlined" hide-details prepend-inner-icon="mdi-clock-outline" class="toolbar-field-shift" />
                    </div>
                    <div class="toolbar-divider" aria-hidden="true" />
                    <div class="toolbar-group toolbar-group-buttons">
                      <v-btn color="secondary" variant="elevated" size="small" prepend-icon="mdi-account-clock"
                        @click="showAttendanceDrawer = true">
                        <span class="d-none d-sm-inline">出勤人員管理</span>
                        <span class="d-inline d-sm-none">出勤</span>
                      </v-btn>
                      <v-btn color="primary" variant="elevated" size="small" prepend-icon="mdi-auto-fix"
                        @click="autoSchedule" :loading="loading">
                        <span class="d-none d-sm-inline">自動排班</span>
                        <span class="d-inline d-sm-none">排班</span>
                      </v-btn>
                      <v-btn color="info" variant="elevated" size="small" prepend-icon="mdi-database-import"
                        @click="loadSchedule" :loading="loadingSchedule">
                        <span class="d-none d-md-inline">讀取指定日期及時段排班資料</span>
                        <span class="d-none d-sm-inline d-md-none">讀取排班</span>
                        <span class="d-inline d-sm-none">讀取</span>
                      </v-btn>
                      <v-btn color="error" variant="elevated" size="small" prepend-icon="mdi-delete"
                        @click="confirmDeleteSchedule" :loading="deleting">
                        <span class="d-none d-md-inline">刪除指定日期及時段排班資料</span>
                        <span class="d-none d-sm-inline d-md-none">刪除排班</span>
                        <span class="d-inline d-sm-none">刪除</span>
                      </v-btn>
                    </div>
                  </div>
                </v-card-title>
                <v-card-text>
                  <v-table fixed-header class="machine-table" height="calc(100vh - 400px)">
                    <thead>
                      <tr>
                        <th class="text-left" style="width: 80px;">機台編號</th>
                        <th class="text-left" style="width: 120px;">機台名稱</th>
                        <th class="text-left" style="width: 250px;">品號</th>
                        <th class="text-left" style="width: 150px;">人力代碼</th>
                        <th class="text-left" style="width: 120px;">生產優先</th>
                        <th class="text-left" style="width: 200px;">備註</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr v-for="(machine, index) in machineInputList" :key="machine.snkey"
                        :class="{ 'editing-row': editingIndex === index }" @click="startEdit(index)">
                        <td class="font-weight-bold">{{ machine.機台編號 }}</td>
                        <td class="font-weight-bold">{{ machine.機台名稱 }}</td>
                        <td>
                          <template v-if="editingIndex === index">
                            <v-combobox :ref="el => setComboboxRef(el, index)" v-model="machine.輸入品號"
                              :items="productCodeOptions" label="輸入或選擇品號" density="compact" variant="outlined"
                              hide-details clearable @update:modelValue="onProductCodeChange(index)"
                              @click.stop></v-combobox>
                          </template>
                          <template v-else>
                            <span v-if="machine.輸入品號" class="text-primary font-weight-bold text-body-1">
                              {{ machine.輸入品號 }}
                            </span>
                            <span v-else class="text-grey text-caption">點擊輸入</span>
                          </template>
                        </td>
                        <td>
                          <span v-if="machine.人力代碼" class="font-weight-bold"
                            :class="'text-' + getLaborCodeColor(machine.人力代碼)">
                            {{ machine.人力代碼 }}
                          </span>
                          <span v-else class="text-grey">-</span>
                        </td>
                        <td>
                          <template v-if="editingIndex === index">
                            <v-select v-model="machine.生產優先" :items="priorityOptions" label="優先" density="compact"
                              variant="outlined" hide-details @click.stop>
                              <template v-slot:item="{ item, props }">
                                <v-list-item v-bind="props">
                                  <template v-slot:prepend>
                                    <v-icon :color="getPriorityColor(item.value)" size="small">
                                      {{ getPriorityIcon(item.value) }}
                                    </v-icon>
                                  </template>
                                </v-list-item>
                              </template>
                              <template v-slot:selection="{ item }">
                                <v-icon :color="getPriorityColor(item.value)" size="small" class="mr-1">
                                  {{ getPriorityIcon(item.value) }}
                                </v-icon>
                                {{ item.value }}
                              </template>
                            </v-select>
                          </template>
                          <template v-else>
                            <v-chip v-if="machine.生產優先" size="default" :color="getPriorityColor(machine.生產優先)"
                              variant="flat" class="priority-chip">
                              <v-icon start size="18">{{ getPriorityIcon(machine.生產優先) }}</v-icon>
                              {{ machine.生產優先 }}
                            </v-chip>
                            <span v-else class="text-grey">-</span>
                          </template>
                        </td>
                        <td>
                          <template v-if="editingIndex === index">
                            <v-text-field v-model="machine.備註" label="備註" density="compact" variant="outlined"
                              hide-details @click.stop></v-text-field>
                          </template>
                          <template v-else>
                            <span v-if="machine.備註">{{ machine.備註 }}</span>
                            <span v-else class="text-grey">-</span>
                          </template>
                        </td>
                      </tr>
                    </tbody>
                  </v-table>
                </v-card-text>
              </v-window-item>

              <!-- 排班結果顯示區 -->
              <v-window-item value="result">
                <!-- 統計資訊區 -->
                <v-card-text>
                  <div class="d-flex justify-end mb-4">
                    <v-btn-toggle v-model="viewMode" mandatory color="primary" variant="outlined" divided>
                      <!-- <v-btn value="table" size="small">
                        <v-icon start>mdi-table</v-icon>
                        表格
                      </v-btn> -->
                      <v-btn value="list" size="small">
                        <v-icon start>mdi-view-list</v-icon>
                        列表
                      </v-btn>
                      <v-btn value="overview" size="small">
                        <v-icon start>mdi-view-grid</v-icon>
                        總覽
                      </v-btn>
                    </v-btn-toggle>
                  </div>
                  <v-row v-if="scheduleResults.length > 0" dense class="mb-4">
                    <v-col cols="6" sm="2">
                      <v-card class="stat-card" color="success" variant="tonal">
                        <v-card-text class="d-flex align-center pa-3">
                          <v-icon size="28" class="mr-2">mdi-check-circle</v-icon>
                          <div>
                            <div class="text-caption">已排機台</div>
                            <div class="text-h6 font-weight-bold">{{ statistics.已排 }}</div>
                          </div>
                        </v-card-text>
                      </v-card>
                    </v-col>
                    <v-col cols="6" sm="2">
                      <v-card class="stat-card" :color="unscheduledCount > 0 ? 'grey' : 'success'" variant="tonal">
                        <v-card-text class="d-flex align-center pa-3">
                          <v-icon size="28" class="mr-2">mdi-clock-outline</v-icon>
                          <div>
                            <div class="text-caption">未排機台</div>
                            <div class="text-h6 font-weight-bold">{{ unscheduledCount }}</div>
                          </div>
                        </v-card-text>
                      </v-card>
                    </v-col>
                    <v-col cols="6" sm="2">
                      <v-card class="stat-card" color="warning" variant="tonal">
                        <v-card-text class="d-flex align-center pa-3">
                          <v-icon size="28" class="mr-2">mdi-alert</v-icon>
                          <div>
                            <div class="text-caption">人力不足/無可用</div>
                            <div class="text-h6 font-weight-bold">{{ (statistics.人力不足 || 0) + (statistics.無可用人力 || 0) }}
                            </div>
                          </div>
                        </v-card-text>
                      </v-card>
                    </v-col>
                    <v-col cols="6" sm="2">
                      <v-card class="stat-card" color="info" variant="tonal">
                        <v-card-text class="d-flex align-center pa-3">
                          <v-icon size="28" class="mr-2">mdi-robot</v-icon>
                          <div>
                            <div class="text-caption">自動機台</div>
                            <div class="text-h6 font-weight-bold">{{ statistics.自動 || 0 }}</div>
                          </div>
                        </v-card-text>
                      </v-card>
                    </v-col>
                    <v-col cols="6" sm="2">
                      <v-card class="stat-card" color="primary" variant="tonal">
                        <v-card-text class="d-flex align-center pa-3">
                          <v-icon size="28" class="mr-2">mdi-account-group</v-icon>
                          <div>
                            <div class="text-caption">已分配人數</div>
                            <div class="text-h6 font-weight-bold">{{ statistics.已分配人數 }}</div>
                          </div>
                        </v-card-text>
                      </v-card>
                    </v-col>
                    <v-col cols="6" sm="2">
                      <v-card class="stat-card stat-card--clickable" :color="statistics.剩餘人力 > 0 ? 'teal' : 'error'"
                        variant="tonal" @click="showRemainingOperators = !showRemainingOperators">
                        <v-card-text class="d-flex align-center pa-3">
                          <v-icon size="28" class="mr-2">mdi-account-clock</v-icon>
                          <div>
                            <div class="text-caption">剩餘人力</div>
                            <div class="text-h6 font-weight-bold">{{ statistics.剩餘人力 }}</div>
                          </div>
                          <v-icon size="20" class="ml-auto">{{ showRemainingOperators ? 'mdi-chevron-up' :
                            'mdi-chevron-down'
                            }}</v-icon>
                        </v-card-text>
                      </v-card>
                    </v-col>
                  </v-row>

                  <!-- 剩餘人力列表 -->
                  <v-expand-transition>
                    <v-sheet v-if="showRemainingOperators && remainingOperators.length > 0"
                      class="remaining-operators-sheet mb-4" rounded="lg" color="teal-lighten-5">
                      <div class="pa-3">
                        <div class="text-subtitle-2 font-weight-bold mb-2 text-teal-darken-2">
                          <v-icon size="18" class="mr-1">mdi-account-question</v-icon>
                          尚未排入的可用人員 ({{ remainingOperators.length }}人) - 可拖拉至機台
                        </div>
                        <div class="d-flex flex-wrap gap-2">
                          <v-chip v-for="op in remainingOperators" :key="op.snkey"
                            :color="op.性別 === '男' ? 'blue' : 'pink'" variant="elevated" size="default"
                            class="draggable-remaining-chip" :draggable="true"
                            @dragstart="onRemainingDragStart($event, op)">
                            <v-avatar start :color="op.性別 === '男' ? 'blue-darken-2' : 'pink-darken-2'" size="24">
                              <span class="text-white text-caption">{{ op.性別 }}</span>
                            </v-avatar>
                            {{ op.人員名稱 }}
                          </v-chip>
                        </div>
                      </div>
                    </v-sheet>
                  </v-expand-transition>

                  <!-- 排班結果表格 -->
                  <table-view v-if="viewMode === 'table'" ref="tableViewRef" :selectedDate="selectedDate"
                    :selectedShift="selectedShift" :operators="operators" :productCodes="productCodes"
                    @update="updateScheduleItem"></table-view>
                  <list-view v-if="viewMode === 'list'" ref="listViewRef" :selectedDate="selectedDate"
                    :selectedShift="selectedShift" :operators="operators" :productCodes="productCodes"
                    @update="updateScheduleItem"></list-view>
                  <overview-view v-if="viewMode === 'overview'" ref="overviewViewRef" :selectedDate="selectedDate"
                    :machines="machines" :operators="operators" :productCodes="productCodes"
                    @update="updateScheduleItem"></overview-view>
                </v-card-text>
              </v-window-item>
            </v-window>
          </v-card>
        </v-col>
      </v-row>
    </v-container>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch, nextTick } from 'vue'
import { useStore } from '@/stores/useStore'
import { getCurrentInstance } from 'vue'
import { generateSchedule, getScheduleStatistics } from '@/services/schedulingService'
import { convertOldToNew, convertBatchToNew } from '@/utils/scheduleDataAdapter'
import TableView from './TableView.vue'
import ListView from './ListView.vue'
import OverviewView from './OverviewView.vue'
import AttendanceDrawer from './AttendanceDrawer.vue'
import dayjs from "dayjs"
import api from '@/assets/js/api.js'

const { proxy } = getCurrentInstance()
const store = useStore()

// 響應式數據
const selectedDate = ref(dayjs().format('YYYY-MM-DD'))
const selectedShift = ref('早')
const viewMode = ref('list')
const scheduleResults = ref([])
const loading = ref(false)
const saving = ref(false)
const loadingSchedule = ref(false)
const deleting = ref(false)
const showAttendanceDrawer = ref(false)
const showRemainingOperators = ref(false)
const activeTab = ref('input')

// 子組件 refs
const tableViewRef = ref(null)
const listViewRef = ref(null)
const overviewViewRef = ref(null)

// 基礎資料
const machines = ref([])
const operators = ref([])
const productCodes = ref([])

// 機台輸入列表 (步驟1使用)
const machineInputList = ref([])

// 目前編輯中的列索引
const editingIndex = ref(-1)

// combobox refs
const comboboxRefs = ref({})

const setComboboxRef = (el, index) => {
  if (el) {
    comboboxRefs.value[index] = el
  }
}

// 開始編輯
const startEdit = (index) => {
  editingIndex.value = index
  nextTick(() => {
    const combobox = comboboxRefs.value[index]
    if (combobox) {
      combobox.focus()
    }
  })
}

// 結束編輯
const finishEdit = () => {
  editingIndex.value = -1
}

// localStorage key (依時段區分)
const getStorageKey = () => `scheduling_machine_input_${selectedShift.value}`

// 暫存到 localStorage
const saveToLocalStorage = () => {
  const dataToSave = machineInputList.value.map(m => ({
    snkey: m.snkey,
    輸入品號: m.輸入品號,
    人力代碼: m.人力代碼,
    生產優先: m.生產優先,
    備註: m.備註
  }))
  localStorage.setItem(getStorageKey(), JSON.stringify(dataToSave))
  proxy.$swal({ icon: "success", title: `已暫存 (${selectedShift.value}班)`, timer: 1500 })
}

// 從 localStorage 讀取
const loadFromLocalStorage = () => {
  const saved = localStorage.getItem(getStorageKey())
  if (!saved) {
    proxy.$swal({ icon: "warning", title: `${selectedShift.value}班 無暫存資料`, timer: 1500 })
    return
  }

  try {
    const savedData = JSON.parse(saved)
    // 將暫存資料套用到 machineInputList
    savedData.forEach(saved => {
      const machine = machineInputList.value.find(m => m.snkey === saved.snkey)
      if (machine) {
        machine.輸入品號 = saved.輸入品號 || ''
        machine.人力代碼 = saved.人力代碼 || ''
        machine.生產優先 = saved.生產優先 || machine.生產優先
        machine.備註 = saved.備註 || ''
      }
    })
    proxy.$swal({ icon: "success", title: `已讀取 ${selectedShift.value}班 暫存`, timer: 1500 })
  } catch (e) {
    console.error('讀取暫存資料失敗:', e)
    proxy.$swal({ icon: "error", title: "讀取失敗" })
  }
}

// 品號選項 (用於下拉選單，使用英文欄位 productCode)
const productCodeOptions = computed(() => {
  return productCodes.value.map(pc => pc.productCode).filter(Boolean)
})

// 生產優先選項
const priorityOptions = ['方塊', '大圈', '小圈', '大三角', '小三角', '空白']

// 生產優先顏色
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

// 生產優先 icon
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

// 時段選項
const shiftOptions = ['早', '中上', '中下', '晚']

// 可用操作人員數量
const availableOperatorCount = computed(() => {
  return operators.value.filter(op => {
    if (op.狀態 && op.狀態 !== '上班') return false
    if (op.可上班時段 && op.可上班時段.length > 0 && !op.可上班時段.includes(selectedShift.value)) return false
    return true
  }).length
})

// 統計資訊
const statistics = computed(() => {
  if (scheduleResults.value.length === 0) return {}
  return getScheduleStatistics(scheduleResults.value, availableOperatorCount.value)
})

// 未排機台數量
const unscheduledCount = computed(() => {
  return statistics.value.total - (statistics.value.已排 || 0) - (statistics.value.自動 || 0)
})

// 剩餘可用人員（已上班且符合時段，但未被排入）
const remainingOperators = computed(() => {
  // 已被分配的人員 snkey（新格式：從 products[].operators[] 收集）
  const assignedSnkeys = new Set()
  scheduleResults.value.forEach(result => {
    // 新格式：遍歷 products 陣列
    if (result.products && result.products.length > 0) {
      result.products.forEach(product => {
        if (product.operators && product.operators.length > 0) {
          product.operators.forEach(op => assignedSnkeys.add(op.snkey))
        }
      })
    }
    
    // 舊格式相容（如果有的話）
    if (result.operatorSnkeys && result.operatorSnkeys.length > 0) {
      result.operatorSnkeys.forEach(snkey => assignedSnkeys.add(snkey))
    }
  })

  // 過濾出可用但未被分配的人員
  return operators.value.filter(op => {
    // 只看上班狀態
    if (op.狀態 && op.狀態 !== '上班') return false
    // 檢查時段
    if (op.可上班時段 && op.可上班時段.length > 0 && !op.可上班時段.includes(selectedShift.value)) return false
    // 未被分配
    return !assignedSnkeys.has(op.snkey)
  })
})

// 方法：僅載入人員資料（人員出勤更新後使用，不重載機台與品號）
const loadOperators = async () => {
  try {
    const operatorRs = await api.get('operator')
    if (operatorRs && operatorRs.length > 0) {
      operators.value = operatorRs.map(i => ({
        ...JSON.parse(i.datalist),
        snkey: i.snkey
      }))
    }
  } catch (error) {
    console.error('載入人員資料錯誤:', error)
    proxy.$swal({ icon: "error", title: "載入人員資料失敗" })
  }
}

const loadBaseData = async () => {
  try {
    // 載入機台資料
    const machineRs = await api.get('machine')
    if (machineRs && machineRs.length > 0) {
      machines.value = machineRs.map(i => ({
        ...JSON.parse(i.datalist),
        snkey: i.snkey
      }))
      // 初始化機台輸入列表
      machineInputList.value = machines.value.map(m => ({
        snkey: m.snkey,
        機台編號: m.機台編號 || '',
        機台名稱: m.機台名稱,
        輸入品號: '',
        人力代碼: '',
        備註: '',
        生產優先: m.生產優先,
        週邊機台: m.週邊機台
      }))
      // 按機台編號排序
      machineInputList.value.sort((a, b) => {
        const numA = parseInt(a.機台編號) || 0
        const numB = parseInt(b.機台編號) || 0
        return numA - numB
      })
    }

    // 載入操作人員資料
    const operatorRs = await api.get('operator')
    if (operatorRs && operatorRs.length > 0) {
      operators.value = operatorRs.map(i => ({
        ...JSON.parse(i.datalist),
        snkey: i.snkey
      }))
    }

    // 載入品號資料（需要進行欄位名稱轉換）
    const productCodeRs = await api.get('productcode')
    if (productCodeRs && productCodeRs.length > 0) {
      // 欄位對應：舊的中文欄位名 -> 新的英文欄位名
      const fieldMapping = {
        '品號': 'productCode',
        '品名': 'productName',
        '客戶': 'customer',
        '鍵檔日期': 'entryDate',
        '主機台': 'mainMachine',
        '副機台': 'subMachine',
        '模穴數': 'cavityCount',
        '週期': 'cycleTime',
        '模穴重': 'cavityWeight',
        '廠內用料': 'internalMaterial',
        '顏色': 'color',
        '分類碼': 'categoryCode',
        '有無截流塊': 'hasRunnerBlock',
        '有分模': 'hasSplitMold',
        '灌包件': 'gatePart',
        '專用箱': 'specialBox',
        '人力代碼': 'laborCodes',
        '模具編號': 'moldNumber',
        '替換模仁': 'replaceMoldCore',
        '分模編號': 'splitMoldNumber',
        '備註': 'remark',
      }
      
      productCodes.value = productCodeRs.map(i => {
        const raw = JSON.parse(i.datalist || '{}')
        
        // 將舊的中文欄位名轉成新的英文欄位名，避免舊資料壞掉
        const normalized = {}
        Object.entries(raw).forEach(([key, value]) => {
          const mappedKey = fieldMapping[key] || key
          normalized[mappedKey] = value
        })
        
        return {
          ...normalized,
          snkey: i.snkey
        }
      })
      
      console.log('[Scheduling-index] 載入品號資料:', productCodes.value.length, '筆')
      if (productCodes.value.length > 0) {
        console.log('[Scheduling-index] 第一筆品號資料結構:', productCodes.value[0])
      }
    }
  } catch (error) {
    console.error('載入基礎資料錯誤:', error)
    proxy.$swal({ icon: "error", title: "載入資料失敗" })
  }
}

// 當品號改變時，自動取得人力代碼
const onProductCodeChange = (index) => {
  const machine = machineInputList.value[index]
  const productCode = machine.輸入品號

  if (!productCode) {
    machine.人力代碼 = ''
    return
  }

  // 從品號資料中找對應的人力代碼（使用英文欄位）
  const productCodeData = productCodes.value.find(pc => pc.productCode === productCode)
  if (productCodeData && productCodeData.laborCodes && productCodeData.laborCodes.length > 0) {
    machine.人力代碼 = productCodeData.laborCodes[0]
  } else {
    machine.人力代碼 = ''
  }
}

// 人力代碼顏色
const getLaborCodeColor = (code) => {
  if (!code) return 'grey'
  if (code.includes('手')) return 'deep-orange'
  if (code === '自') return 'teal'
  if (code.includes('自')) return 'cyan'
  return 'grey'
}

const autoSchedule = async () => {
  if (!selectedDate.value) {
    proxy.$swal({ icon: "warning", title: "請選擇日期" })
    return
  }

  if (machineInputList.value.length === 0) {
    proxy.$swal({ icon: "warning", title: "請先建立機台資料" })
    return
  }

  if (operators.value.length === 0) {
    proxy.$swal({ icon: "warning", title: "請先建立操作人員資料" })
    return
  }

  // 檢查是否有輸入品號
  const machinesWithProductCode = machineInputList.value.filter(m => m.輸入品號)
  if (machinesWithProductCode.length === 0) {
    proxy.$swal({ icon: "warning", title: "請至少為一個機台輸入品號" })
    return
  }

  loading.value = true

  try {
    // 使用 machineInputList (使用者輸入的品號) 進行排班
    const results = await generateSchedule(
      selectedDate.value,
      selectedShift.value,
      machineInputList.value,
      operators.value,
      productCodes.value
    )

    scheduleResults.value = results

    // 自動切換到排班結果頁籤，並設定為列表視圖
    activeTab.value = 'result'
    viewMode.value = 'list'

    // 自動執行存檔
    await saveSchedule()

    // 重新載入子組件的資料
    await reloadChildComponents()

    proxy.$swal({
      icon: "success",
      title: "排班完成並已存檔",
      text: `已排 ${statistics.value.已排} 個機台`,
      timer: 2000
    })
  } catch (error) {
    console.error('自動排班錯誤:', error)
    proxy.$swal({ icon: "error", title: "排班失敗: " + error.message })
  } finally {
    loading.value = false
  }
}

const saveSchedule = async () => {
  saving.value = true

  try {
    // 1. 先查詢當日是否已有排班資料
    console.log('[saveSchedule] Step 1: 查詢當日排班資料...')
    console.log('[saveSchedule] 查詢日期:', selectedDate.value)
    console.log('[saveSchedule] 查詢時段:', selectedShift.value)

    const payload = {
      key: 'date',
      value: selectedDate.value,
    }
    const url = `byjson/searchByKeyValue/${store.state.databaseName}/schedule`
    console.log('[saveSchedule] API URL:', url)
    console.log('[saveSchedule] API Payload:', payload)

    const existingData = await api.options(url, payload)
    console.log('[saveSchedule] Step 1 完成: 查詢結果', existingData)
    console.log('[saveSchedule] 查詢到的資料筆數:', existingData?.length || 0)

    // 2. 過濾出同時段的資料並刪除
    console.log('[saveSchedule] Step 2: 過濾同時段資料...')
    if (existingData && existingData.length > 0) {
      const sameShiftData = existingData.filter(item => {
        const parsed = JSON.parse(item.datalist)
        return parsed.shift === selectedShift.value
      })
      console.log('[saveSchedule] 同時段資料筆數:', sameShiftData.length)

      // 刪除同日期同時段的舊資料
      if (sameShiftData.length > 0) {
        console.log('[saveSchedule] Step 2.1: 開始刪除舊資料...')
        for (const item of sameShiftData) {
          console.log('[saveSchedule] 刪除 snkey:', item.snkey)
          const deleteData = {
            snkey: item.snkey,
            tablename: 'schedule',
            datalist: item.datalist
          }
          const deleteResult = await api.delete('schedule', deleteData)
          console.log('[saveSchedule] 刪除結果:', deleteResult)
        }
        console.log('[saveSchedule] Step 2.1 完成: 舊資料已刪除')
      } else {
        console.log('[saveSchedule] 無同時段舊資料需刪除')
      }
    } else {
      console.log('[saveSchedule] 當日無任何排班資料')
    }

    // 3. 準備儲存的排班資料
    console.log('[saveSchedule] Step 3: 準備新資料...')
    const scheduleDataToSave = scheduleResults.value.map(result => ({
      ...result,
      createInfo: {
        snkey: store.state.pData.snkey,
        name: store.state.pData.username,
        time: dayjs().format("YYYY-MM-DD HH:mm:ss")
      },
      editInfo: []
    }))
    console.log('[saveSchedule] 準備儲存的資料筆數:', scheduleDataToSave.length)

    // 4. 批次新增
    console.log('[saveSchedule] Step 4: 批次新增資料...')
    const postDataArray = scheduleDataToSave.map(item => ({
      datalist: JSON.stringify(item)
    }))
    console.log('[saveSchedule] postDataArray:', postDataArray)

    const rs = await api.addMulti('schedule', postDataArray)
    console.log('[saveSchedule] Step 4 完成: 新增結果', rs)

    if (rs.state == 1) {
      console.log('[saveSchedule] 儲存成功!')
      proxy.$swal({
        icon: "success",
        title: "排班結果已儲存",
        text: `${selectedDate.value} ${selectedShift.value}班`,
        timer: 2000
      })
    } else {
      console.log('[saveSchedule] 儲存失敗, rs:', rs)
    }
  } catch (error) {
    console.error('[saveSchedule] 發生錯誤:', error)
    proxy.$swal({ icon: "error", title: "儲存失敗: " + error.message })
  } finally {
    saving.value = false
    console.log('[saveSchedule] 流程結束')
  }
}

const updateScheduleItem = (updatedItem) => {
  const index = scheduleResults.value.findIndex(r => r.machineSnkey === updatedItem.machineSnkey)
  if (index !== -1) {
    scheduleResults.value[index] = updatedItem
  }
}

// 確認刪除排班
const confirmDeleteSchedule = () => {
  proxy.$swal({
    title: `確認刪除 ${selectedDate.value} ${selectedShift.value}班 排班資料？`,
    text: '此操作無法復原',
    icon: 'warning',
    toast: false,
    timer: null,
    showConfirmButton: true,
    showCancelButton: true,
    position: 'center'
  }).then((result) => {
    if (result.isConfirmed) {
      deleteSchedule()
    }
  })
}

// 刪除指定日期時段的排班
const deleteSchedule = async () => {
  deleting.value = true
  console.log('--- [刪除排班] 開始 ---')
  console.log('日期:', selectedDate.value, ', 時段:', selectedShift.value)

  try {
    // 1. 查詢當日排班資料
    console.log('[刪除排班] Step 1: 查詢當日排班資料...')
    const payload = {
      key: 'date',
      value: selectedDate.value,
    }
    const url = `byjson/searchByKeyValue/${store.state.databaseName}/schedule`
    const existingSchedules = await api.options(url, payload)
    console.log('[刪除排班] 查詢結果:', existingSchedules)

    if (!existingSchedules || existingSchedules.length === 0) {
      console.log('[刪除排班] 當日無排班資料')
      proxy.$swal({ icon: "info", title: "無資料", text: "當日無排班資料可刪除" })
      return
    }

    // 2. 過濾出同時段的資料
    console.log('[刪除排班] Step 2: 過濾同時段資料...')
    const schedulesToDelete = existingSchedules.filter(item => {
      const datalist = JSON.parse(item.datalist)
      return datalist.shift === selectedShift.value
    })
    console.log('[刪除排班] 符合時段的資料筆數:', schedulesToDelete.length)

    if (schedulesToDelete.length === 0) {
      console.log('[刪除排班] 該時段無排班資料')
      proxy.$swal({ icon: "info", title: "無資料", text: `${selectedShift.value}班無排班資料可刪除` })
      return
    }

    // 3. 逐筆刪除
    console.log('[刪除排班] Step 3: 開始刪除...')
    for (const item of schedulesToDelete) {
      console.log('[刪除排班] 刪除 snkey:', item.snkey)
      const deleteData = {
        snkey: item.snkey,
        datalist: JSON.stringify({
          delInfo: {
            name: store.state.pData?.username || 'system',
            time: dayjs().format("YYYY-MM-DD HH:mm:ss")
          }
        })
      }
      const deleteResult = await api.delete('schedule', deleteData)
      console.log('[刪除排班] 刪除結果:', deleteResult)
    }

    console.log('[刪除排班] 刪除完成!')

    // 清空畫面上的排班結果
    scheduleResults.value = []

    // 重新載入子組件的資料
    await reloadChildComponents()

    proxy.$swal({
      icon: "success",
      title: "刪除成功",
      text: `已刪除 ${schedulesToDelete.length} 筆 ${selectedDate.value} ${selectedShift.value}班 排班資料`,
      timer: 2000
    })

  } catch (error) {
    console.error('[刪除排班] 發生錯誤:', error)
    proxy.$swal({ icon: "error", title: "刪除失敗: " + error.message })
  } finally {
    deleting.value = false
    console.log('--- [刪除排班] 結束 ---')
  }
}

// 重新載入子組件的資料
const reloadChildComponents = async () => {
  // 根據當前視圖模式重新載入對應的子組件
  if (viewMode.value === 'table' && tableViewRef.value && tableViewRef.value.loadSchedule) {
    await tableViewRef.value.loadSchedule()
  } else if (viewMode.value === 'list' && listViewRef.value && listViewRef.value.loadSchedule) {
    await listViewRef.value.loadSchedule()
  } else if (viewMode.value === 'overview' && overviewViewRef.value && overviewViewRef.value.loadAllShifts) {
    await overviewViewRef.value.loadAllShifts()
  }
}

// 從剩餘人力拖拉開始
const onRemainingDragStart = (event, op) => {
  event.dataTransfer.setData('remainingOperator', JSON.stringify({
    snkey: op.snkey,
    name: op.人員名稱
  }))
  event.dataTransfer.effectAllowed = 'copy'
}


const loadSchedule = async () => {
  if (!selectedDate.value) {
    proxy.$swal({ icon: "warning", title: "請選擇日期" })
    return
  }

  loadingSchedule.value = true

  try {
    const rs = await api.get('schedule')
    if (rs && rs.length > 0) {
      // 過濾出符合日期和時段的排班
      let filtered = rs
        .map(i => ({
          ...JSON.parse(i.datalist),
          snkey: i.snkey
        }))
        .filter(item => item.date === selectedDate.value && item.shift === selectedShift.value)

      if (filtered.length > 0) {
        // 自動轉換舊格式為新格式
        console.log('[loadSchedule] 讀取到的資料:', filtered)
        scheduleResults.value = convertBatchToNew(filtered)
        console.log('[loadSchedule] 轉換後的資料:', scheduleResults.value)

        // 自動切換到排班結果頁籤，並設定為列表視圖
        activeTab.value = 'result'
        viewMode.value = 'list'

        // 重新載入子組件的資料
        await reloadChildComponents()

        proxy.$swal({
          icon: "success",
          title: "讀取成功",
          text: `已讀取 ${filtered.length} 筆排班資料`,
          timer: 2000
        })
      } else {
        proxy.$swal({
          icon: "info",
          title: "無資料",
          text: `${selectedDate.value} ${selectedShift.value}班 無已儲存的排班`
        })
      }
    } else {
      proxy.$swal({ icon: "info", title: "資料庫無排班資料" })
    }
  } catch (error) {
    console.error('讀取排班錯誤:', error)
    proxy.$swal({ icon: "error", title: "讀取失敗: " + error.message })
  } finally {
    loadingSchedule.value = false
  }
}

// 生命週期
onMounted(async () => {
  console.log('[Scheduling-index] onMounted 開始')
  await loadBaseData()
  console.log('[Scheduling-index] loadBaseData 完成，productCodes.value.length:', productCodes.value.length)
})
</script>

<style scoped lang="scss">
.scheduling-main {
  min-height: 100%;
  background: linear-gradient(135deg, rgba(168, 197, 181, 0.18), rgba(123, 163, 184, 0.1));
}

.scheduling-hero {
  background: linear-gradient(135deg, rgba(74, 107, 95, 0.18), rgba(123, 163, 184, 0.2));
  border: 1px solid var(--daycare-divider-light);
  box-shadow: 0 10px 24px rgba(74, 107, 95, 0.18);
  padding: 24px;
}

.hero-title {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--daycare-primary);
}

.hero-subtitle {
  color: rgba(74, 107, 95, 0.78);
}

.hero-chip {
  border-color: rgba(90, 122, 111, 0.35) !important;
  color: var(--daycare-primary) !important;
  background-color: rgba(90, 122, 111, 0.1);
}

.scheduling-toolbar-in-card {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding-right: 16px;

  .toolbar-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    flex-wrap: wrap;
  }

  .toolbar-row-head {
    padding-bottom: 8px;
    border-bottom: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  }

  .toolbar-row-actions {
    align-items: center;
  }

  .toolbar-group {
    display: flex;
    align-items: center;
    gap: 10px;
    flex-wrap: wrap;
  }

  .toolbar-group-filter {
    .toolbar-field-date {
      min-width: 150px;
      max-width: 160px;
    }
    .toolbar-field-shift {
      min-width: 120px;
      max-width: 140px;
    }
  }

  .toolbar-group-storage {
    flex-shrink: 0;
  }

  .toolbar-group-buttons {
    flex: 1;
    min-width: 0;
  }

  .toolbar-divider {
    width: 1px;
    height: 28px;
    background: rgba(var(--v-border-color), var(--v-border-opacity));
    flex-shrink: 0;
  }

  @media (max-width: 599px) {
    .toolbar-divider {
      display: none;
    }
    .toolbar-row-actions {
      flex-direction: column;
      align-items: stretch;
    }
    .toolbar-group-filter {
      .toolbar-field-date,
      .toolbar-field-shift {
        min-width: 0;
        max-width: none;
        flex: 1;
      }
    }
  }
}

.scheduling-toolbar {
  background: rgba(255, 255, 255, 0.92);
  border: 1px solid var(--daycare-divider-light);
  padding: 18px 24px;
  box-shadow: 0 8px 24px var(--daycare-shadow-light);
}

.toolbar-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;

  .toolbar-btn {
    flex: 1 1 auto;
    min-width: 0; // 允許按鈕縮小
  }

  // 小螢幕（手機）
  @media (max-width: 599px) {
    .toolbar-btn {
      flex: 1 1 calc(50% - 4px); // 每行兩個按鈕
      min-width: 120px;
    }
  }

  // 平板
  @media (min-width: 600px) and (max-width: 959px) {
    .toolbar-btn {
      flex: 1 1 calc(50% - 4px); // 每行兩個按鈕
    }
  }

  // 桌面
  @media (min-width: 960px) {
    .toolbar-btn {
      flex: 0 1 auto; // 按內容寬度
    }
  }
}

.stat-card {
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.tab-card {
  background: rgba(255, 255, 255, 0.92);
  border: 1px solid var(--daycare-divider-light);
  box-shadow: 0 8px 24px var(--daycare-shadow-light);
}

.machine-table {
  font-size: 1rem;

  thead th {
    background-color: #f2f5f3 !important; /* 不透明表頭 */
    font-weight: 600;
    white-space: nowrap;
    font-size: 1rem;
  }

  td {
    font-size: 1rem;
    padding: 12px 16px;
  }

  tbody tr {
    cursor: pointer;

    &:hover {
      background-color: rgba(74, 107, 95, 0.04);
    }
  }
}

.editing-row {
  background-color: rgba(74, 107, 95, 0.08) !important;
}

.priority-chip {
  font-size: 0.95rem !important;
  font-weight: 600;
}

.stat-card--clickable {
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 16px rgba(0, 0, 0, 0.15);
  }
}

.remaining-operators-sheet {
  border: 1px solid rgba(0, 150, 136, 0.3);
}

.draggable-remaining-chip {
  cursor: grab;
  transition: all 0.2s ease;

  &:hover {
    transform: scale(1.05);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
  }

  &:active {
    cursor: grabbing;
  }
}
</style>
