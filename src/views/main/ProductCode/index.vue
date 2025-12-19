<template>
  <div class="productcode-list pa-6">
    <v-container fluid class="pa-0">
      <v-row>
        <v-col cols="12">
          <v-sheet class="productcode-hero" elevation="0" rounded="xl">
            <div class="d-flex flex-column flex-md-row align-center justify-space-between">
              <div class="d-flex align-center mb-4 mb-md-0">
                <v-avatar color="primary" variant="tonal" size="48" class="mr-3">
                  <v-icon color="primary">mdi-barcode</v-icon>
                </v-avatar>
                <div>
                  <h2 class="hero-title mb-1">品號資料庫</h2>
                  <p class="hero-subtitle mb-0">管理品號與人力代碼對應關係。</p>
                </div>
              </div>
              <div class="d-flex align-center gap-3">
                <v-chip class="hero-chip" prepend-icon="mdi-database" size="small" variant="outlined">
                  品號總數: {{ totalCount }}
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
          <v-sheet class="productcode-toolbar" elevation="0" rounded="xl">
            <v-row align="center" no-gutters>
              <v-col cols="12" md="6">
                <v-text-field v-model="searchKey" label="搜尋品號關鍵字" density="comfortable" variant="outlined"
                  prepend-inner-icon="mdi-magnify" hide-details single-line></v-text-field>
              </v-col>
              <v-col cols="12" md="6" class="d-flex justify-end mt-3 mt-md-0 gap-2">
                <import-product-code @getAllData="getAllData"></import-product-code>
                <v-btn color="primary" variant="elevated" prepend-icon="mdi-plus" @click="openAddDialog">
                  新增品號
                </v-btn>
              </v-col>
            </v-row>
          </v-sheet>
        </v-col>
      </v-row>

      <v-card class="productcode-table-card">
        <v-card-text>
          <PaginatedIterator :items="searchfilter" v-model:page="currentPage" v-model:items-per-page="itemsPerPage"
            :items-per-page-options="itemsPerPageOptions">
            <template #default="{ items }">
              <v-table fixed-header class="text-no-wrap" hide-default-footer>
                <template #default>
                  <thead class="title text-h6">
                    <tr>
                      <th class="text-left"></th>
                      <th class="text-left">NO</th>
                      <th class="text-left">品號</th>
                      <th class="text-left">人力代碼</th>
                      <th class="text-left">品名</th>
                      <th class="text-left">客戶</th>
                      <th class="text-left">鍵檔日期</th>
                      <th class="text-left">主機台</th>
                      <th class="text-left">副機台</th>
                      <th class="text-left">模穴數</th>
                      <th class="text-left">週期</th>
                      <th class="text-left">模穴重</th>
                      <th class="text-left">廠內用料</th>
                      <th class="text-left">顏色</th>
                      <th class="text-left">分類碼</th>
                      <th class="text-left">有無截流塊</th>
                      <th class="text-left">有分模</th>
                      <th class="text-left">灌包件</th>
                      <th class="text-left">專用箱</th>
                      <th class="text-left">模具編號</th>
                      <th class="text-left">替換模仁</th>
                      <th class="text-left">分模編號</th>
                      <th class="text-left">備註</th>
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
                      <td>{{ item.raw.NO || '-' }}</td>
                      <td class="font-weight-bold">{{ item.raw.品號 }}</td>
                      <td>{{ Array.isArray(item.raw.人力代碼) ? item.raw.人力代碼.join(', ') : (item.raw.人力代碼 || '-') }}</td>
                      <td>{{ item.raw.品名 || '-' }}</td>
                      <td>{{ item.raw.客戶 || '-' }}</td>
                      <td>{{ item.raw.鍵檔日期 || '-' }}</td>
                      <td>{{ item.raw.主機台 || '-' }}</td>
                      <td>{{ item.raw.副機台 || '-' }}</td>
                      <td>{{ item.raw.模穴數 || '-' }}</td>
                      <td>{{ item.raw.週期 || '-' }}</td>
                      <td>{{ item.raw.模穴重 || '-' }}</td>
                      <td>{{ item.raw.廠內用料 || '-' }}</td>
                      <td>{{ item.raw.顏色 || '-' }}</td>
                      <td>{{ item.raw.分類碼 || '-' }}</td>
                      <td>{{ item.raw.有無截流塊 || '-' }}</td>
                      <td>{{ item.raw.有分模 || '-' }}</td>
                      <td>{{ item.raw.灌包件 || '-' }}</td>
                      <td>{{ item.raw.專用箱 || '-' }}</td>
                      <td>{{ item.raw.模具編號 || '-' }}</td>
                      <td>{{ item.raw.替換模仁 || '-' }}</td>
                      <td>{{ item.raw.分模編號 || '-' }}</td>
                      <td>{{ item.raw.備註 || '-' }}</td>
                    </tr>
                  </tbody>
                </template>
              </v-table>
            </template>
          </PaginatedIterator>
        </v-card-text>
      </v-card>
    </v-container>

    <!-- 新增/編輯對話框 -->
    <v-dialog v-model="addDialog" max-width="800px" persistent>
      <v-card>
        <v-card-title class="dialog-title">
          <span class="text-h6">{{ dialogTitle }}</span>
        </v-card-title>
        <v-card-text class="pt-4" style="max-height: 70vh; overflow-y: auto;">
          <v-form ref="form">
            <v-row>
              <v-col cols="6">
                <v-text-field label="NO" v-model="editItem.NO" variant="outlined" density="comfortable"></v-text-field>
              </v-col>
              <v-col cols="6">
                <v-text-field label="品號" v-model="editItem.品號" :rules="emptyRules" variant="outlined" density="comfortable"></v-text-field>
              </v-col>
              <v-col cols="6">
                <v-text-field label="人力代碼" v-model="editItem.人力代碼Text" variant="outlined" density="comfortable" hint="多個代碼用逗號分隔" persistent-hint></v-text-field>
              </v-col>
              <v-col cols="6">
                <v-text-field label="品名" v-model="editItem.品名" variant="outlined" density="comfortable"></v-text-field>
              </v-col>
              <v-col cols="6">
                <v-text-field label="客戶" v-model="editItem.客戶" variant="outlined" density="comfortable"></v-text-field>
              </v-col>
              <v-col cols="6">
                <v-text-field label="鍵檔日期" v-model="editItem.鍵檔日期" variant="outlined" density="comfortable"></v-text-field>
              </v-col>
              <v-col cols="6">
                <v-text-field label="主機台" v-model="editItem.主機台" variant="outlined" density="comfortable"></v-text-field>
              </v-col>
              <v-col cols="6">
                <v-text-field label="副機台" v-model="editItem.副機台" variant="outlined" density="comfortable"></v-text-field>
              </v-col>
              <v-col cols="6">
                <v-text-field label="模穴數" v-model="editItem.模穴數" variant="outlined" density="comfortable"></v-text-field>
              </v-col>
              <v-col cols="6">
                <v-text-field label="週期" v-model="editItem.週期" variant="outlined" density="comfortable"></v-text-field>
              </v-col>
              <v-col cols="6">
                <v-text-field label="模穴重" v-model="editItem.模穴重" variant="outlined" density="comfortable"></v-text-field>
              </v-col>
              <v-col cols="6">
                <v-text-field label="廠內用料" v-model="editItem.廠內用料" variant="outlined" density="comfortable"></v-text-field>
              </v-col>
              <v-col cols="6">
                <v-text-field label="顏色" v-model="editItem.顏色" variant="outlined" density="comfortable"></v-text-field>
              </v-col>
              <v-col cols="6">
                <v-text-field label="分類碼" v-model="editItem.分類碼" variant="outlined" density="comfortable"></v-text-field>
              </v-col>
              <v-col cols="6">
                <v-text-field label="有無截流塊" v-model="editItem.有無截流塊" variant="outlined" density="comfortable"></v-text-field>
              </v-col>
              <v-col cols="6">
                <v-text-field label="有分模" v-model="editItem.有分模" variant="outlined" density="comfortable"></v-text-field>
              </v-col>
              <v-col cols="6">
                <v-text-field label="灌包件" v-model="editItem.灌包件" variant="outlined" density="comfortable"></v-text-field>
              </v-col>
              <v-col cols="6">
                <v-text-field label="專用箱" v-model="editItem.專用箱" variant="outlined" density="comfortable"></v-text-field>
              </v-col>
              <v-col cols="6">
                <v-text-field label="模具編號" v-model="editItem.模具編號" variant="outlined" density="comfortable"></v-text-field>
              </v-col>
              <v-col cols="6">
                <v-text-field label="替換模仁" v-model="editItem.替換模仁" variant="outlined" density="comfortable"></v-text-field>
              </v-col>
              <v-col cols="6">
                <v-text-field label="分模編號" v-model="editItem.分模編號" variant="outlined" density="comfortable"></v-text-field>
              </v-col>
              <v-col cols="12">
                <v-text-field label="備註" v-model="editItem.備註" variant="outlined" density="comfortable"></v-text-field>
              </v-col>
            </v-row>
          </v-form>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn color="grey" variant="text" @click="addDialog = false">取消</v-btn>
          <v-btn color="primary" variant="flat" @click="saveItem">儲存</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useStore } from '@/stores/useStore'
import { getCurrentInstance } from 'vue'
import ImportProductCode from "./importProductCode.vue"
import PaginatedIterator from '@/components/PaginatedIterator.vue'
import dayjs from "dayjs"
import api from '@/assets/js/api.js'

const { proxy } = getCurrentInstance()
const store = useStore()

// 響應式數據
const items = ref([])
const usingDatabase = ref("productcode")
const searchKey = ref("")
const addDialog = ref(false)
const dialogTitle = ref("")
const editItem = ref({
  NO: '',
  品號: '',
  人力代碼: [],
  人力代碼Text: '',
  品名: '',
  客戶: '',
  鍵檔日期: '',
  主機台: '',
  副機台: '',
  模穴數: '',
  週期: '',
  模穴重: '',
  廠內用料: '',
  顏色: '',
  分類碼: '',
  有無截流塊: '',
  有分模: '',
  灌包件: '',
  專用箱: '',
  模具編號: '',
  替換模仁: '',
  分模編號: '',
  備註: '',
  createInfo: {},
  editInfo: []
})
const form = ref(null)
const isEditing = ref(false)

// 分頁相關
const currentPage = ref(1);
const itemsPerPage = ref(10);
const itemsPerPageOptions = [
  { value: 12, title: '12' },
  { value: 24, title: '24' },
  { value: 36, title: '36' },
];

// 人力代碼建議
const laborCodeSuggestions = ['手1', '手2', '手3', '自12', '自01', '自']

// Validation rules
const emptyRules = [(v) => {
  if (Array.isArray(v)) {
    return v.length > 0 || "不可空白"
  }
  return !!v || "不可空白"
}]

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
    console.log('[品號資料庫] API 原始回應:', rs)
    if (rs && rs.length > 0) {
      items.value = rs.map((i) => ({
        ...JSON.parse(i.datalist),
        snkey: i.snkey,
      }))
      console.log('[品號資料庫] 解析後資料:', items.value)
      if (items.value.length > 0) {
        console.log('[品號資料庫] 第一筆資料結構:', items.value[0])
      }
    } else {
      items.value = []
    }
  })
}

const openAddDialog = () => {
  isEditing.value = false
  dialogTitle.value = "新增品號"
  editItem.value = {
    NO: '',
    品號: '',
    人力代碼: [],
    人力代碼Text: '',
    品名: '',
    客戶: '',
    鍵檔日期: '',
    主機台: '',
    副機台: '',
    模穴數: '',
    週期: '',
    模穴重: '',
    廠內用料: '',
    顏色: '',
    分類碼: '',
    有無截流塊: '',
    有分模: '',
    灌包件: '',
    專用箱: '',
    模具編號: '',
    替換模仁: '',
    分模編號: '',
    備註: '',
    createInfo: {},
    editInfo: []
  }
  addDialog.value = true
}

const edit = (item) => {
  isEditing.value = true
  dialogTitle.value = "修改品號"
  editItem.value = { 
    ...item,
    人力代碼Text: Array.isArray(item.人力代碼) ? item.人力代碼.join(', ') : (item.人力代碼 || '')
  }
  addDialog.value = true
}

const saveItem = async () => {
  const { valid } = await form.value.validate()
  if (!valid) {
    proxy.$swal({ icon: "error", title: "資料輸入不完整!!請再次確認!!" })
    return
  }

  if (!isEditing.value) {
    // 新增
    const matchNO = items.value.find(i => i.NO == editItem.value.NO)
    if (matchNO && editItem.value.NO) {
      proxy.$swal({ icon: "error", title: "NO已存在!!" })
      return
    }
    const match = items.value.find(i => i.品號 == editItem.value.品號)
    if (match) {
      proxy.$swal({ icon: "error", title: "品號已存在!!" })
      return
    }

    // 將人力代碼文字轉為陣列
    editItem.value.人力代碼 = editItem.value.人力代碼Text 
      ? editItem.value.人力代碼Text.split(/[,，]/).map(c => c.trim()).filter(c => c)
      : []

    editItem.value.createInfo = {
      snkey: store.state.pData.snkey,
      name: store.state.pData.username,
      time: dayjs().format("YYYY-MM-DD HH:mm:ss")
    }

    // 移除臨時欄位
    const saveData = { ...editItem.value }
    delete saveData.人力代碼Text

    const postData = {
      datalist: JSON.stringify(saveData)
    }

    try {
      const rs = await api.add(usingDatabase.value, postData)
      if (rs.state == 1) {
        proxy.$swal({ icon: "success", title: "已新增" })
        await getAllData()
        addDialog.value = false
      }
    } catch (err) {
      proxy.$swal({ icon: "error", title: "資料存取錯誤!!內容:" + err })
    }
  } else {
    // 修改
    // 將人力代碼文字轉為陣列
    editItem.value.人力代碼 = editItem.value.人力代碼Text 
      ? editItem.value.人力代碼Text.split(/[,，]/).map(c => c.trim()).filter(c => c)
      : []

    editItem.value.editInfo.unshift({
      snkey: store.state.pData.snkey,
      name: store.state.pData.username,
      time: dayjs().format("YYYY-MM-DD HH:mm:ss")
    })

    // 移除臨時欄位
    const saveData = { ...editItem.value }
    delete saveData.人力代碼Text

    const postData = {
      snkey: editItem.value.snkey,
      datalist: JSON.stringify(saveData),
      updateTime: dayjs().format("YYYY-MM-DD HH:mm:ss")
    }

    const rs = await api.post(usingDatabase.value, postData)
    if (rs.state == 1) {
      proxy.$swal({ icon: "success", title: "已修改" })
      await getAllData()
      addDialog.value = false
    }
  }
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

const getLaborCodeColor = (code) => {
  if (code.startsWith('手')) return 'orange'
  if (code === '自') return 'green'
  if (code.startsWith('自')) return 'light-green'
  return 'grey'
}

// 生命週期鉤子
onMounted(async () => {
  await getAllData()
})
</script>

<style scoped lang="scss">
.productcode-list {
  min-height: 100%;
  background: linear-gradient(135deg, rgba(168, 197, 181, 0.18), rgba(123, 163, 184, 0.1));
}

.productcode-hero {
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

.productcode-toolbar {
  background: rgba(255, 255, 255, 0.92);
  border: 1px solid var(--daycare-divider-light);
  padding: 18px 24px;
  box-shadow: 0 8px 24px var(--daycare-shadow-light);
}

.productcode-table-card {
  border-radius: 24px;
  box-shadow: 0 14px 40px rgba(74, 107, 95, 0.14);
  border: 1px solid rgba(91, 143, 163, 0.16);
  margin-top: 24px;
}

.dialog-title {
  background: linear-gradient(135deg, rgba(74, 107, 95, 0.95), rgba(123, 163, 184, 0.85));
  color: white;
}
</style>

