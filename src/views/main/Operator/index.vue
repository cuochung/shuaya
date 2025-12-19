<template>
  <div class="operator-list pa-6">
    <v-container fluid class="pa-0">
      <v-row>
        <v-col cols="12">
          <v-sheet class="operator-hero" elevation="0" rounded="xl">
            <div class="d-flex flex-column flex-md-row align-center justify-space-between">
              <div class="d-flex align-center mb-4 mb-md-0">
                <v-avatar color="primary" variant="tonal" size="48" class="mr-3">
                  <v-icon color="primary">mdi-account-hard-hat</v-icon>
                </v-avatar>
                <div>
                  <h2 class="hero-title mb-1">操作人員管理面板</h2>
                  <p class="hero-subtitle mb-0">管理機台操作人員，設定時段與技術能力。</p>
                </div>
              </div>
              <div class="d-flex align-center gap-3">
                <v-chip class="hero-chip" prepend-icon="mdi-account-group" size="small" variant="outlined">
                  總人數: {{ totalCount }} | 上班: {{ workingCount }}
                </v-chip>
                <v-btn class="ml-2" color="primary" variant="tonal" size="small" prepend-icon="mdi-refresh"
                  @click="getAllData">
                  重新整理
                </v-btn>
              </div>
            </div>
          </v-sheet>
        </v-col>
      </v-row>

      <v-row class="mt-4">
        <v-col cols="12">
          <v-sheet class="operator-toolbar" elevation="0" rounded="xl">
            <v-row align="center" no-gutters>
              <v-col cols="12" md="8">
                <v-text-field v-model="searchKey" label="搜尋操作人員關鍵字" density="comfortable" variant="outlined"
                  prepend-inner-icon="mdi-magnify" hide-details single-line></v-text-field>
              </v-col>
              <v-col cols="12" md="4" class="d-flex justify-end mt-3 mt-md-0">
                <popupadd ref="childFn" :usingDatabase="usingDatabase" :operatorItems="items"
                  :productCodeItems="productCodeItems" class="ml-md-2" @getAllData="getAllData"></popupadd>
              </v-col>
            </v-row>
          </v-sheet>
        </v-col>
      </v-row>

      <v-card class="operator-table-card">
        <v-card-text>
          <PaginatedIterator :items="searchfilter" v-model:page="currentPage" v-model:items-per-page="itemsPerPage"
            :items-per-page-options="itemsPerPageOptions">
            <template #default="{ items }">
              <v-table fixed-header class="text-no-wrap" hide-default-footer>
                <template #default>
                  <thead class="title text-h6">
                    <tr>
                      <th class="text-left"></th>
                      <th class="text-left">人員名稱</th>
                      <th class="text-left">性別</th>
                      <th class="text-left">可上班時段</th>
                      <th class="text-left">狀態</th>
                      <th class="text-left">對應品號</th>
                      <th class="text-left">不合對象</th>
                      <th class="text-left">創建紀錄</th>
                      <th class="text-left">修改紀錄</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="(item, index) in items" :key="index">
                      <td>
                        <v-menu transition="scale-transition" offset-y>
                          <template v-slot:activator="{ props }">
                            <v-btn icon v-bind="props">
                              <img src="@/assets/gear.svg" alt="" />
                            </v-btn>
                          </template>
                          <v-list>
                            <v-list-item @click="edit(item.raw)">
                              <v-list-item-title>修改</v-list-item-title>
                            </v-list-item>
                            <v-list-item @click="del(item.raw)">
                              <v-list-item-title>刪除</v-list-item-title>
                            </v-list-item>
                          </v-list>
                        </v-menu>
                      </td>
                      <td>{{ item.raw.人員名稱 }}</td>
                      <td>
                        <v-chip :color="item.raw.性別 === '男' ? 'blue' : 'pink'" size="small" variant="tonal">
                          {{ item.raw.性別 }}
                        </v-chip>
                      </td>
                      <td>
                        <div class="d-flex flex-wrap gap-1">
                          <v-chip v-for="shift in shiftOptions" :key="shift" size="default"
                            :color="item.raw.可上班時段.includes(shift) ? getShiftColor(shift) : 'grey-lighten-2'" 
                            :variant="item.raw.可上班時段.includes(shift) ? 'flat' : 'outlined'"
                            :class="['shift-chip', { 'shift-chip--inactive': !item.raw.可上班時段.includes(shift) }]"
                            @click="toggleShift(item.raw, shift)">
                            <v-icon v-if="item.raw.可上班時段.includes(shift)" size="14" class="mr-1">mdi-check-circle</v-icon>
                            {{ shift }}
                          </v-chip>
                        </div>
                      </td>
                      <td>
                        <div class="d-flex flex-wrap gap-1">
                          <v-chip v-for="status in statusOptions" :key="status" size="default"
                            :color="item.raw.狀態 === status ? getStatusColor(status) : 'grey-lighten-2'"
                            :variant="item.raw.狀態 === status ? 'flat' : 'outlined'"
                            :class="['status-chip', { 'status-chip--inactive': item.raw.狀態 !== status }]"
                            @click="changeStatus(item.raw, status)">
                            <v-icon v-if="item.raw.狀態 === status" size="14" class="mr-1">mdi-check-circle</v-icon>
                            {{ status }}
                        </v-chip>
                        </div>
                      </td>
                      <td>
                        <div class="d-flex flex-wrap gap-1">
                          <v-chip v-for="(code, idx) in item.raw.對應品號" :key="idx" size="small" color="primary"
                            variant="outlined">
                            {{ code }}
                          </v-chip>
                        </div>
                      </td>
                      <td>
                        <div v-if="item.raw.不合對象 && item.raw.不合對象.length > 0">
                          <v-chip v-for="(snkey, idx) in item.raw.不合對象" :key="idx" size="small" color="red"
                            variant="tonal" class="ma-1">
                            {{ getOperatorName(snkey) }}
                          </v-chip>
                        </div>
                        <span v-else class="text-grey">無</span>
                      </td>
                      <td>
                        {{ `${item.raw.createInfo.name}(${item.raw.createInfo.time})` }}
                      </td>
                      <td>
                        <div v-if="item.raw.editInfo && item.raw.editInfo.length > 0" class="text-truncate"
                          style="max-width: 400px">
                          <span v-for="(i, index) in item.raw.editInfo" :key="index">
                            {{ `${i.name}(${i.time})` }}
                          </span>
                        </div>
                      </td>
                    </tr>
                  </tbody>
                </template>
              </v-table>
            </template>
          </PaginatedIterator>
        </v-card-text>
      </v-card>
    </v-container>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useStore } from '@/stores/useStore'
import { getCurrentInstance } from 'vue'
import popupadd from "./Add.vue"
import PaginatedIterator from '@/components/PaginatedIterator.vue'
import dayjs from "dayjs"
import api from '@/assets/js/api.js'

const { proxy } = getCurrentInstance()
const store = useStore()
const childFn = ref(null)

// 響應式數據
const items = ref([])
const productCodeItems = ref([])
const usingDatabase = ref("operator")
const searchKey = ref("")
const shiftOptions = ['早', '中上', '中下', '晚']
const statusOptions = ['上班', '休假', '請假', '離職']

// 分頁相關
const currentPage = ref(1);
const itemsPerPage = ref(10);
const itemsPerPageOptions = [
  { value: 12, title: '12' },
  { value: 24, title: '24' },
  { value: 36, title: '36' },
];

const totalCount = computed(() => items.value.length)
const workingCount = computed(() => items.value.filter(i => i.狀態 === '上班').length)

const searchfilter = computed(() => {
  const keys = searchKey.value.split(" ")
  let str = ""

  return keys.reduce((prev, element) => {
    return prev.filter((item) => {
      str = JSON.stringify(item).toUpperCase()
      if (str.includes(element.toUpperCase())) {
        return item
      }
    })
  }, items.value)
})

// 方法
const getAllData = async () => {
  await api.get(usingDatabase.value).then((rs) => {
    if (rs && rs.length > 0) {
      items.value = rs.map((i) => ({
        ...JSON.parse(i.datalist),
        snkey: i.snkey,
      }))
    } else {
      items.value = []
    }
  })
}

const getProductCodeData = async () => {
  await api.get('productcode').then((rs) => {
    if (rs && rs.length > 0) {
      productCodeItems.value = rs.map((i) => ({
        ...JSON.parse(i.datalist),
        snkey: i.snkey,
      }))
    } else {
      productCodeItems.value = []
    }
  })
}

const edit = (item) => {
  childFn.value.editProcess(item)
}

const del = async (item) => {
  proxy.$swal({
    title: '確認要刪除嗎?',
    text: '此操作無法復原',
    icon: 'warning',
    toast: false,
    timer: null,
    showConfirmButton: true,
    showCancelButton: true,
    position: 'center'
  }).then(async (result) => {
    if (result.isConfirmed) {
      item.delInfo = {
        name: store.state.pData.username,
        time: dayjs().format("YYYY-MM-DD HH:mm:ss"),
      }

      const postData = {
        snkey: item.snkey,
        tablename: usingDatabase.value,
        datalist: JSON.stringify(item),
      }

      const rs = await api.delete(usingDatabase.value, postData)
      if (rs.state == 1) {
        proxy.$swal({
          icon: "success",
          title: "刪除成功",
          confirmButtonText: '確定',
          confirmButtonColor: '#3085d6',
          allowEscapeKey: false
        })
        await getAllData();
      }
    }
  })
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
    '上班': 'success',
    '休假': 'info',
    '請假': 'warning',
    '離職': 'error'
  }
  return colorMap[status] || 'grey'
}

const getOperatorName = (snkey) => {
  const operator = items.value.find(o => o.snkey === snkey)
  return operator ? operator.人員名稱 : snkey
}

const changeStatus = async (item, status) => {
  if (item.狀態 === status) return
  
  item.狀態 = status

  // 更新資料庫
  item.editInfo = item.editInfo || []
  item.editInfo.unshift({
    snkey: store.state.pData.snkey,
    name: store.state.pData.username,
    time: dayjs().format("YYYY-MM-DD HH:mm:ss")
  })

  const postData = {
    snkey: item.snkey,
    datalist: JSON.stringify(item),
    updateTime: dayjs().format("YYYY-MM-DD HH:mm:ss")
  }

  try {
    await api.post(usingDatabase.value, postData)
  } catch (err) {
    proxy.$swal({ icon: "error", title: "更新失敗: " + err })
    await getAllData()
  }
}

const toggleShift = async (item, shift) => {
  const index = item.可上班時段.indexOf(shift)
  if (index > -1) {
    // 至少保留一個時段
    if (item.可上班時段.length <= 1) {
      proxy.$swal({ icon: "warning", title: "至少需選擇一個時段" })
      return
    }
    item.可上班時段.splice(index, 1)
  } else {
    item.可上班時段.push(shift)
  }

  // 更新資料庫
  item.editInfo = item.editInfo || []
  item.editInfo.unshift({
    snkey: store.state.pData.snkey,
    name: store.state.pData.username,
    time: dayjs().format("YYYY-MM-DD HH:mm:ss")
  })

  const postData = {
    snkey: item.snkey,
    datalist: JSON.stringify(item),
    updateTime: dayjs().format("YYYY-MM-DD HH:mm:ss")
  }

  try {
    await api.post(usingDatabase.value, postData)
  } catch (err) {
    proxy.$swal({ icon: "error", title: "更新失敗: " + err })
    await getAllData()
  }
}

// 生命週期鉤子
onMounted(async () => {
  await getAllData()
  await getProductCodeData()
})
</script>

<style scoped lang="scss">
.operator-list {
  min-height: 100%;
  background: linear-gradient(135deg, rgba(168, 197, 181, 0.18), rgba(123, 163, 184, 0.1));
}

.operator-hero {
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

.operator-toolbar {
  background: rgba(255, 255, 255, 0.92);
  border: 1px solid var(--daycare-divider-light);
  padding: 18px 24px;
  box-shadow: 0 8px 24px var(--daycare-shadow-light);
}

.operator-table-card {
  border-radius: 24px;
  box-shadow: 0 14px 40px rgba(74, 107, 95, 0.14);
  border: 1px solid rgba(91, 143, 163, 0.16);
  margin-top: 24px;
  
  :deep(table) {
    font-size: 1.05rem;
    
    th {
      font-size: 1.1rem;
    }
    
    td {
      padding: 12px 16px;
    }
  }
}

.shift-chip {
  cursor: pointer;
  transition: all 0.2s ease;
  font-weight: 600;
  font-size: 0.95rem !important;
  
  &:hover {
    transform: scale(1.05);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
  }
  
  &--inactive {
    opacity: 0.85;
    border: 2px dashed #bbb !important;
    background-color: #f5f5f5 !important;
  }
}

.status-chip {
  cursor: pointer;
  transition: all 0.2s ease;
  font-weight: 600;
  font-size: 0.95rem !important;
  
  &:hover {
    transform: scale(1.05);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
  }
  
  &--inactive {
    opacity: 0.85;
    border: 2px dashed #bbb !important;
    background-color: #f5f5f5 !important;
  }
}
</style>

