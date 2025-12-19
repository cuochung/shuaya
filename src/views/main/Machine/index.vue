<template>
  <div class="machine-list pa-6">
    <v-container fluid class="pa-0">
      <v-row>
        <v-col cols="12">
          <v-sheet class="machine-hero" elevation="0" rounded="xl">
            <div class="d-flex flex-column flex-md-row align-center justify-space-between">
              <div class="d-flex align-center mb-4 mb-md-0">
                <v-avatar color="primary" variant="tonal" size="48" class="mr-3">
                  <v-icon color="primary">mdi-factory</v-icon>
                </v-avatar>
                <div>
                  <h2 class="hero-title mb-1">機台管理面板</h2>
                  <p class="hero-subtitle mb-0">管理生產機台資訊，設定品號與優先級。</p>
                </div>
              </div>
              <div class="d-flex align-center gap-3">
                <v-chip class="hero-chip" prepend-icon="mdi-cog" size="small" variant="outlined">
                  機台總數: {{ totalCount }}
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
          <v-sheet class="machine-toolbar" elevation="0" rounded="xl">
            <v-row align="center" no-gutters>
              <v-col cols="12" md="8">
                <v-text-field v-model="searchKey" label="搜尋機台關鍵字" density="comfortable" variant="outlined"
                  prepend-inner-icon="mdi-magnify" hide-details single-line></v-text-field>
              </v-col>
              <v-col cols="12" md="4" class="d-flex justify-end mt-3 mt-md-0">
                <popupadd ref="childFn" :usingDatabase="usingDatabase" :machineItems="items"
                  class="ml-md-2" @getAllData="getAllData"></popupadd>
              </v-col>
            </v-row>
          </v-sheet>
        </v-col>
      </v-row>

      <v-card class="machine-table-card">
        <v-card-text>
          <PaginatedIterator :items="searchfilter" v-model:page="currentPage" v-model:items-per-page="itemsPerPage"
            :items-per-page-options="itemsPerPageOptions">
            <template #default="{ items }">
              <v-table fixed-header class="text-no-wrap" hide-default-footer>
                <template #default>
                  <thead class="title text-h6">
                    <tr>
                      <th class="text-left"></th>
                      <th class="text-left">機台編號</th>
                      <th class="text-left">機台名稱</th>
                      <th class="text-left">生產優先</th>
                      <th class="text-left">週邊機台</th>
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
                      <td>{{ item.raw.機台編號 }}</td>
                      <td>{{ item.raw.機台名稱 }}</td>
                      <td>
                        <v-chip :color="getPriorityColor(item.raw.生產優先)" size="small" variant="flat">
                          {{ item.raw.生產優先 }}
                        </v-chip>
                      </td>
                      <td>
                        <div v-if="item.raw.週邊機台 && item.raw.週邊機台.length > 0">
                          <v-chip v-for="(snkey, idx) in item.raw.週邊機台" :key="idx" size="small" color="secondary"
                            variant="tonal" class="ma-1">
                            {{ getMachineName(snkey) }}
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
const usingDatabase = ref("machine")
const searchKey = ref("")

// 分頁相關
const currentPage = ref(1);
const itemsPerPage = ref(10);
const itemsPerPageOptions = [
  { value: 12, title: '12' },
  { value: 24, title: '24' },
  { value: 36, title: '36' },
];

const totalCount = computed(() => items.value.length)

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

const getMachineName = (snkey) => {
  const machine = items.value.find(m => m.snkey === snkey)
  return machine ? machine.機台名稱 : snkey
}

// 生命週期鉤子
onMounted(async () => {
  await getAllData()
})
</script>

<style scoped lang="scss">
.machine-list {
  min-height: 100%;
  background: linear-gradient(135deg, rgba(168, 197, 181, 0.18), rgba(123, 163, 184, 0.1));
}

.machine-hero {
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

.machine-toolbar {
  background: rgba(255, 255, 255, 0.92);
  border: 1px solid var(--daycare-divider-light);
  padding: 18px 24px;
  box-shadow: 0 8px 24px var(--daycare-shadow-light);
}

.machine-table-card {
  border-radius: 24px;
  box-shadow: 0 14px 40px rgba(74, 107, 95, 0.14);
  border: 1px solid rgba(91, 143, 163, 0.16);
  margin-top: 24px;
}
</style>

