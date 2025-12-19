<template>
  <div class="import-productcode">
    <v-dialog v-model="dialog" max-width="800" persistent>
      <template #activator="{ props }">
        <v-btn v-bind="props" color="success" variant="elevated" prepend-icon="mdi-file-import" rounded="pill"
          elevation="6" @click="openDialog">
          匯入 Excel
        </v-btn>
      </template>

      <v-card class="import-dialog" rounded="xl">
        <v-card-title class="d-flex dialog-title dialog-title--import" primary-title>
          <div class="text-h6 font-weight-bold">匯入品號資料</div>
          <v-spacer></v-spacer>
          <v-btn icon="mdi-close" class="ml-2" variant="text" color="white" @click="closeDialog"></v-btn>
        </v-card-title>

        <v-card-text class="pt-6">
          <v-sheet class="info-section" color="primary-lighten-5" variant="tonal" rounded="lg">
            <div class="info-section__header mb-4">
              <v-icon color="primary" size="24">mdi-file-excel</v-icon>
              <span class="text-subtitle-1 font-weight-bold text-primary ml-2">選擇 Excel 檔案</span>
            </div>

            <v-file-input v-model="selectedFile" label="選擇 Excel 檔案" accept=".xlsx,.xls" prepend-icon="mdi-file-excel"
              variant="outlined" density="comfortable" :rules="fileRules" @update:model-value="onFileSelected">
            </v-file-input>

            <v-alert v-if="selectedFileName" type="info" variant="tonal" class="mt-4">
              <div class="d-flex align-center">
                <v-icon class="mr-2">mdi-file-check</v-icon>
                <span>已選擇檔案: {{ selectedFileName }}</span>
              </div>
            </v-alert>

            <v-alert type="info" variant="tonal" class="mt-4">
              <div class="text-subtitle-2 mb-2">Excel 格式說明：</div>
              <ul class="text-caption">
                <li>工作表名稱必須為：<strong>人力代碼資料表</strong></li>
                <li>第五列為欄位標題，第六列開始為資料</li>
                <li>欄位：NO、品號.規格、品名、客戶、鍵檔日期、主機台、副機台、模穴數、週期、模穴重、廠內用料、顏色、分類碼、有無截流塊、有分模、灌包件、專用箱、<strong>人力代碼</strong>、模具編號、替換模仁、分模編號、備註</li>
              </ul>
            </v-alert>
          </v-sheet>

          <v-sheet v-if="datas.length > 0" class="data-preview mt-4" color="success-lighten-5" variant="tonal"
            rounded="lg">
            <div class="info-section__header mb-3">
              <v-icon color="success" size="24">mdi-check-circle</v-icon>
              <span class="text-subtitle-1 font-weight-bold text-success ml-2">
                資料預覽 (共 {{ datas.length }} 筆)
              </span>
            </div>

            <v-alert type="success" variant="tonal" class="mb-4">
              資料已成功解析，共 {{ datas.length }} 筆記錄
            </v-alert>

            <v-table density="compact" class="preview-table">
              <thead>
                <tr>
                  <th>品號</th>
                  <th>人力代碼</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(item, index) in datas.slice(0, 10)" :key="index">
                  <td>{{ item.品號 || '-' }}</td>
                  <td>
                    <div class="d-flex flex-wrap gap-1">
                      <v-chip v-for="(code, idx) in item.人力代碼" :key="idx" size="x-small"
                        :color="getLaborCodeColor(code)" variant="tonal">
                        {{ code }}
                      </v-chip>
                    </div>
                  </td>
                </tr>
              </tbody>
            </v-table>
            <div v-if="datas.length > 10" class="text-caption text-center mt-2 pa-2">
              僅顯示前 10 筆，共 {{ datas.length }} 筆資料將被匯入
            </div>
          </v-sheet>

          <v-alert v-if="errorMessage" type="error" variant="tonal" class="mt-4" closable @click:close="errorMessage = ''">
            <div class="d-flex align-center">
              <v-icon class="mr-2">mdi-alert-circle</v-icon>
              <span>{{ errorMessage }}</span>
            </div>
          </v-alert>
        </v-card-text>

        <v-divider></v-divider>

        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn color="grey" variant="text" @click="closeDialog" :disabled="loading">
            取消
          </v-btn>
          <v-btn color="primary" variant="flat" @click="processImport" :disabled="datas.length === 0 || loading"
            :loading="loading">
            確認匯入
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useStore } from '@/stores/useStore'
import { getCurrentInstance } from 'vue'
import dayjs from "dayjs"
import api from '@/assets/js/api'
import * as XLSX from 'xlsx'

const { proxy } = getCurrentInstance()
const store = useStore()

// Emits
const emit = defineEmits(['getAllData'])

// Refs
const dialog = ref(false)
const selectedFile = ref(null)
const selectedFileName = ref('')
const datas = ref([])
const errorMessage = ref('')
const loading = ref(false)

// Validation rules
const fileRules = [
  v => !!v || '請選擇檔案',
  v => !v || v.size < 10000000 || '檔案大小不能超過 10MB',
]

// 欄位對應 (Excel 欄位名稱可能帶有空格)
const fieldMapping = {
  '品號': '品號',
  '人力代碼': '人力代碼',
}

// Excel 表頭欄位順序 (第5列)
const excelHeaders = [
  'NO', '品 號 . 規 格', '品  名(模號/圖號)', '客戶', '鍵檔日期', '主機台', '副機台',
  '模穴數', '週期(SEC/模)', '模穴重(g)', '廠內用料', '顏色', '分類碼', '有無截流塊',
  '有分模', '灌包件', '專用箱', '人力代碼', '模具編號', '替換模仁', '分模編號', '備註(EO內容註記)'
]

// Methods
const openDialog = () => {
  dialog.value = true
  resetForm()
}

const closeDialog = () => {
  if (loading.value) return
  dialog.value = false
  resetForm()
}

const resetForm = () => {
  selectedFile.value = null
  selectedFileName.value = ''
  datas.value = []
  errorMessage.value = ''
  loading.value = false
}

const onFileSelected = async (file) => {
  if (!file) {
    selectedFileName.value = ''
    datas.value = []
    errorMessage.value = ''
    return
  }

  selectedFileName.value = file.name
  errorMessage.value = ''
  datas.value = []

  try {
    await parseExcelFile(file)
  } catch (error) {
    console.error('Excel parsing error:', error)
    errorMessage.value = `解析 Excel 檔案時發生錯誤: ${error.message}`
    datas.value = []
  }
}

const parseExcelFile = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result)
        const workbook = XLSX.read(data, { type: 'array' })

        // 尋找「人力代碼資料表」工作表
        const targetSheetName = '人力代碼資料表'
        if (!workbook.SheetNames.includes(targetSheetName)) {
          reject(new Error(`找不到工作表「${targetSheetName}」，現有工作表：${workbook.SheetNames.join(', ')}`))
          return
        }
        const worksheet = workbook.Sheets[targetSheetName]

        // 將工作表轉換為 JSON
        const jsonData = XLSX.utils.sheet_to_json(worksheet, {
          header: 1,
          defval: ''
        })

        // 第5列(索引4)為標題，第6列(索引5)開始為資料
        if (jsonData.length < 6) {
          reject(new Error('Excel 檔案至少需要包含標題行(第5列)和一行資料(第6列開始)'))
          return
        }

        // 第5列是欄位標題 (索引 4)
        const headers = jsonData[4]

        // 建立欄位索引映射 (欄位名稱可能含有空格)
        const columnIndexMap = {}
        headers.forEach((header, index) => {
          const cleanHeader = String(header).replace(/\s+/g, '')
          if (cleanHeader === 'NO') {
            columnIndexMap['NO'] = index
          } else if (cleanHeader.includes('品號') && cleanHeader.includes('規格')) {
            columnIndexMap['品號'] = index
          } else if (cleanHeader.includes('品名')) {
            columnIndexMap['品名'] = index
          } else if (cleanHeader === '客戶') {
            columnIndexMap['客戶'] = index
          } else if (cleanHeader === '鍵檔日期') {
            columnIndexMap['鍵檔日期'] = index
          } else if (cleanHeader === '主機台') {
            columnIndexMap['主機台'] = index
          } else if (cleanHeader === '副機台') {
            columnIndexMap['副機台'] = index
          } else if (cleanHeader === '模穴數') {
            columnIndexMap['模穴數'] = index
          } else if (cleanHeader.includes('週期')) {
            columnIndexMap['週期'] = index
          } else if (cleanHeader.includes('模穴重')) {
            columnIndexMap['模穴重'] = index
          } else if (cleanHeader === '廠內用料') {
            columnIndexMap['廠內用料'] = index
          } else if (cleanHeader === '顏色') {
            columnIndexMap['顏色'] = index
          } else if (cleanHeader === '分類碼') {
            columnIndexMap['分類碼'] = index
          } else if (cleanHeader === '有無截流塊') {
            columnIndexMap['有無截流塊'] = index
          } else if (cleanHeader === '有分模') {
            columnIndexMap['有分模'] = index
          } else if (cleanHeader === '灌包件') {
            columnIndexMap['灌包件'] = index
          } else if (cleanHeader === '專用箱') {
            columnIndexMap['專用箱'] = index
          } else if (cleanHeader === '人力代碼') {
            columnIndexMap['人力代碼'] = index
          } else if (cleanHeader === '模具編號') {
            columnIndexMap['模具編號'] = index
          } else if (cleanHeader === '替換模仁') {
            columnIndexMap['替換模仁'] = index
          } else if (cleanHeader === '分模編號') {
            columnIndexMap['分模編號'] = index
          } else if (cleanHeader.includes('備註')) {
            columnIndexMap['備註'] = index
          }
        })
        
        console.log('[匯入] 欄位索引映射:', columnIndexMap)

        if (columnIndexMap['品號'] === undefined) {
          reject(new Error('找不到「品 號 . 規 格」欄位'))
          return
        }
        if (columnIndexMap['人力代碼'] === undefined) {
          reject(new Error('找不到「人力代碼」欄位'))
          return
        }

        // 轉換資料：從第6列開始（索引 5）
        const parsedData = []
        for (let i = 5; i < jsonData.length; i++) {
          const row = jsonData[i]

          // 跳過空行
          if (row.every(cell => !cell || cell.toString().trim() === '')) {
            continue
          }

          const dataItem = {}

          // 讀取所有欄位
          const getCell = (key) => {
            const idx = columnIndexMap[key]
            return idx !== undefined && row[idx] ? String(row[idx]).trim() : ''
          }

          dataItem['NO'] = getCell('NO')
          dataItem['品號'] = getCell('品號')
          dataItem['品名'] = getCell('品名')
          dataItem['客戶'] = getCell('客戶')
          dataItem['鍵檔日期'] = getCell('鍵檔日期')
          dataItem['主機台'] = getCell('主機台')
          dataItem['副機台'] = getCell('副機台')
          dataItem['模穴數'] = getCell('模穴數')
          dataItem['週期'] = getCell('週期')
          dataItem['模穴重'] = getCell('模穴重')
          dataItem['廠內用料'] = getCell('廠內用料')
          dataItem['顏色'] = getCell('顏色')
          dataItem['分類碼'] = getCell('分類碼')
          dataItem['有無截流塊'] = getCell('有無截流塊')
          dataItem['有分模'] = getCell('有分模')
          dataItem['灌包件'] = getCell('灌包件')
          dataItem['專用箱'] = getCell('專用箱')
          dataItem['模具編號'] = getCell('模具編號')
          dataItem['替換模仁'] = getCell('替換模仁')
          dataItem['分模編號'] = getCell('分模編號')
          dataItem['備註'] = getCell('備註')

          // 人力代碼（可能包含多個，用逗號、分號或換行分隔）
          const laborCodeRaw = getCell('人力代碼')

          // 分隔人力代碼
          let laborCodes = []
          if (laborCodeRaw) {
            // 支援逗號、分號、換行分隔
            laborCodes = laborCodeRaw.split(/[,;，；\n]/).map(c => c.trim()).filter(c => c)
          }
          dataItem['人力代碼'] = laborCodes

          // 檢查必要欄位
          if (!dataItem['品號'] || dataItem['人力代碼'].length === 0) {
            continue // 跳過不完整的資料
          }

          parsedData.push(dataItem)
        }

        if (parsedData.length === 0) {
          reject(new Error('Excel 檔案中沒有有效的資料行'))
          return
        }

        datas.value = parsedData
        resolve(parsedData)
      } catch (error) {
        reject(error)
      }
    }

    reader.onerror = () => {
      reject(new Error('讀取檔案時發生錯誤'))
    }

    reader.readAsArrayBuffer(file)
  })
}

const processImport = async () => {
  if (datas.value.length === 0) {
    errorMessage.value = '沒有可匯入的資料'
    return
  }

  // 警告確認
  const confirmResult = await proxy.$swal({
    title: '確認要匯入嗎?',
    text: '匯入前將會清空所有原有的品號資料，此操作無法復原',
    icon: 'warning',
    toast: false,
    timer: null,
    showConfirmButton: true,
    showCancelButton: true,
    position: 'center'
  })

  if (!confirmResult.isConfirmed) {
    return
  }

  loading.value = true

  try {
    console.log('[匯入] 開始處理，共', datas.value.length, '筆')
    console.log('[匯入] store.state.pData:', store.state.pData)

    // 先清空 productcode 資料表
    console.log('[匯入] 清空 productcode 資料表...')
    const truncateRs = await api.options(`general/truncateTable/${store.state.databaseName}/productcode`)
    console.log('[匯入] 清空回應:', truncateRs)
    
    if (truncateRs.state != 1) {
      errorMessage.value = `清空資料表失敗: ${truncateRs.message || truncateRs.msg || JSON.stringify(truncateRs)}`
      return
    }
    console.log('[匯入] 清空成功，開始匯入資料...')
    
    // 準備匯入資料
    const importData = datas.value.map((item, idx) => {
      console.log(`[匯入] 第${idx + 1}筆:`, item)
      return {
        ...item,
        createInfo: {
          snkey: store.state.pData?.snkey || '',
          name: store.state.pData?.username || '',
          time: dayjs().format("YYYY-MM-DD HH:mm:ss")
        },
        editInfo: []
      }
    })

    console.log('[匯入] 準備的資料:', importData)

    // 轉換為 datalist 格式
    const postDataArray = importData.map(item => ({
      datalist: JSON.stringify(item)
    }))
    console.log('[匯入] postDataArray:', postDataArray)

    // 批次新增
    // const postData = {
    //   datalist: JSON.stringify(postDataArray)
    // }

    console.log('[匯入] 準備發送資料:', postDataArray)
    const rs = await api.addMulti('productcode', postDataArray)
    console.log('[匯入] API 回應:', rs)

    // 判斷回傳陣列中是否全部都是 state: true
    const allSuccess = Array.isArray(rs) && rs.every(item => item.state === true)
    const failedCount = Array.isArray(rs) ? rs.filter(item => item.state !== true).length : 0

    if (allSuccess) {
      proxy.$swal({
        icon: "success",
        title: `成功匯入 ${datas.value.length} 筆品號資料`,
        confirmButtonText: '確定',
        confirmButtonColor: '#3085d6',
      })
      emit('getAllData')
      dialog.value = false
    } else {
      errorMessage.value = `匯入失敗: ${failedCount} 筆失敗，回應: ${JSON.stringify(rs)}`
    }
  } catch (error) {
    console.error('Import error:', error)
    errorMessage.value = '匯入過程中發生錯誤: ' + error.message
  } finally {
    loading.value = false
  }
}

const getLaborCodeColor = (code) => {
  if (code.startsWith('手')) return 'orange'
  if (code === '自') return 'green'
  if (code.startsWith('自')) return 'light-green'
  return 'grey'
}
</script>

<style scoped lang="scss">
.import-dialog {
  background: rgba(255, 255, 255, 0.96);
  border: 1px solid var(--daycare-divider-light);
  box-shadow: 0 24px 60px rgba(74, 107, 95, 0.22);
}

.dialog-title {
  padding: 18px 24px;
  font-size: 1.15rem;
  color: #ffffff;

  &--import {
    background: linear-gradient(135deg, rgba(76, 175, 80, 0.95), rgba(56, 142, 60, 0.85));
  }
}

.info-section {
  padding: 18px 20px;
  background-color: rgba(255, 255, 255, 0.86) !important;
  border: 1px solid rgba(123, 163, 184, 0.25);
  box-shadow: 0 8px 22px rgba(74, 107, 95, 0.12);

  &__header {
    display: flex;
    align-items: center;
  }
}

.data-preview {
  padding: 18px 20px;
  background-color: rgba(255, 255, 255, 0.86) !important;
  border: 1px solid rgba(76, 175, 80, 0.25);
  box-shadow: 0 8px 22px rgba(76, 175, 80, 0.12);
}

.preview-table {
  background: white;
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid rgba(0, 0, 0, 0.1);
}
</style>

