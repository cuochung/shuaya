<template>
  <div class="operatoradd">
    <v-dialog v-model="dialog" fullscreen persistent>
      <template #activator="{ props }">
        <v-btn v-bind="props" class="operator-add-btn" color="primary" variant="elevated"
          prepend-icon="mdi-account-hard-hat" rounded="pill" elevation="6" @click="addProcess">
          新增操作人員
        </v-btn>
      </template>

      <v-card class="operator-dialog" rounded="xl">
        <v-card-title class="d-flex" :class="titleStyle" primary-title>
          <div class="text-h6 font-weight-bold">{{ title }}</div>
          <v-spacer></v-spacer>
          <v-btn icon="mdi-close" class="ml-2" variant="text" color="white" @click="dialog = false"></v-btn>
        </v-card-title>

        <v-card-text class="pt-6">
          <v-form ref="form">
            <v-sheet class="info-section" color="primary-lighten-5" variant="tonal" rounded="lg">
              <div class="info-section__header">
                <v-icon color="primary" size="24">mdi-account-details</v-icon>
                <span class="text-subtitle-1 font-weight-bold text-primary ml-2">人員基本資料</span>
              </div>
              <v-row dense class="mt-2">
                <v-col cols="12" md="6">
                  <v-text-field label="人員名稱" prepend-icon="mdi-account" v-model="list.人員名稱" :rules="emptyRules"
                    autofocus density="comfortable" variant="outlined"></v-text-field>
                </v-col>
                <v-col cols="12" md="6">
                  <v-select label="性別" prepend-icon="mdi-gender-male-female" v-model="list.性別" :items="genderOptions"
                    :rules="emptyRules" density="comfortable" variant="outlined"></v-select>
                </v-col>
                <v-col cols="12" md="6">
                  <div class="d-flex align-center">
                    <v-icon class="mr-2" color="grey-darken-1">mdi-account-check</v-icon>
                    <span class="text-body-2 text-grey-darken-1">狀態</span>
                  </div>
                  <v-radio-group v-model="list.狀態" :rules="emptyRules" inline class="mt-1">
                    <v-radio v-for="status in statusOptions" :key="status" :label="status" :value="status"
                      :color="getStatusColor(status)"></v-radio>
                  </v-radio-group>
                </v-col>
                <v-col cols="12" md="6">
                  <div class="d-flex align-center">
                    <v-icon class="mr-2" color="grey-darken-1">mdi-clock-outline</v-icon>
                    <span class="text-body-2 text-grey-darken-1">可上班時段（可多選）</span>
                  </div>
                  <div class="d-flex flex-wrap mt-1">
                    <v-checkbox v-for="shift in shiftOptions" :key="shift" v-model="list.可上班時段" :label="shift"
                      :value="shift" :color="getShiftColor(shift)" hide-details density="compact"
                      class="mr-4" :rules="emptyRules"></v-checkbox>
                  </div>
                  <div v-if="list.可上班時段.length === 0 && showShiftError" class="text-caption text-error mt-1">不可空白</div>
                </v-col>
              </v-row>
            </v-sheet>

            <v-sheet class="info-section mt-4" color="orange-lighten-5" variant="tonal" rounded="lg">
              <div class="info-section__header">
                <v-icon color="orange" size="24">mdi-tools</v-icon>
                <span class="text-subtitle-1 font-weight-bold text-orange ml-2">技術能力與限制</span>
              </div>
              <v-row dense class="mt-2">
                <v-col cols="12">
                  <v-autocomplete label="對應品號（技術能力）" prepend-icon="mdi-certificate" v-model="list.對應品號"
                    :items="productCodeOptions" multiple chips closable-chips density="comfortable" variant="outlined"
                    hint="該人員擅長操作的品號，優先排入此品號生產" persistent-hint>
                  </v-autocomplete>
                </v-col>
                <v-col cols="12">
                  <v-autocomplete label="不合對象" prepend-icon="mdi-account-alert" v-model="list.不合對象"
                    :items="operatorOptions" item-title="text" item-value="value" multiple chips closable-chips
                    density="comfortable" variant="outlined" hint="透過機台的週邊機台設定，避免與不合對象排在相鄰機台"
                    persistent-hint>
                    <template v-slot:chip="{ props, item }">
                      <v-chip v-bind="props" color="red" size="small">
                        {{ item.title }}
                      </v-chip>
                    </template>
                  </v-autocomplete>
                </v-col>
              </v-row>
            </v-sheet>
          </v-form>
        </v-card-text>

        <v-divider></v-divider>

        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn color="primary" variant="flat" class="text-white" @click="addOK"
            v-if="processType == 'add'">確認新增</v-btn>
          <v-btn color="success" variant="flat" class="text-white" @click="editOK"
            v-if="processType == 'edit'">確認修改</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup>
import { ref, computed, nextTick, getCurrentInstance } from 'vue'
import { useStore } from '@/stores/useStore'
import dayjs from "dayjs"
import api from '@/assets/js/api'

const { proxy } = getCurrentInstance()
const store = useStore()

// Props
const props = defineProps({
  usingDatabase: String,
  operatorItems: Array,
  productCodeItems: Array
})

// Emits
const emit = defineEmits(['getAllData'])

// Refs
const dialog = ref(false)
const list = ref({
  人員名稱: '',
  可上班時段: [],
  性別: '',
  不合對象: [],
  對應品號: [],
  狀態: '',
  createInfo: {},
  editInfo: []
})
const processType = ref('')
const title = ref('')
const titleStyle = ref('')
const form = ref(null)
const showShiftError = ref(false)

// Validation rules
const emptyRules = [(v) => {
  if (Array.isArray(v)) {
    return v.length > 0 || "不可空白"
  }
  return !!v || "不可空白"
}]

// 選項
const genderOptions = ['男', '女']
const statusOptions = ['上班', '休假', '請假', '離職']
const shiftOptions = ['早', '中上', '中下', '晚']

// Computed
const operatorOptions = computed(() => {
  return props.operatorItems
    .filter(o => o.snkey !== list.value.snkey) // 排除自己
    .map(o => ({
      text: o.人員名稱,
      value: o.snkey
    }))
})

const productCodeOptions = computed(() => {
  return props.productCodeItems.map(p => p.品號)
})

// Methods
const addProcess = () => {
  processType.value = "add"
  title.value = "新增操作人員資料"
  titleStyle.value = "dialog-title dialog-title--add"
  list.value = {
    人員名稱: '',
    可上班時段: [],
    性別: '',
    不合對象: [],
    對應品號: [],
    狀態: '上班',
    createInfo: {},
    editInfo: []
  }
  showShiftError.value = false
  nextTick(() => {
    form.value.resetValidation()
  })
}

const editProcess = (item) => {
  processType.value = "edit"
  title.value = "修改操作人員資料"
  titleStyle.value = "dialog-title dialog-title--edit"
  list.value = { ...item }
  dialog.value = true
}

const addOK = async () => {
  // 新增時人員名稱不可重覆
  const match = props.operatorItems.find(i => i.人員名稱 == list.value.人員名稱)
  if (match) {
    proxy.$swal({ icon: "error", title: "人員名稱不可重覆!!" })
    return false
  }

  // 確認新增
  const { valid } = await form.value.validate()
  showShiftError.value = list.value.可上班時段.length === 0
  if (valid && list.value.可上班時段.length > 0) {
    list.value.createInfo = {
      snkey: store.state.pData.snkey,
      name: store.state.pData.username,
      time: dayjs().format("YYYY-MM-DD HH:mm:ss")
    }

    const postData = {
      datalist: JSON.stringify(list.value)
    }

    try {
      const rs = await api.add(props.usingDatabase, postData)
      if (rs.state == 1) {
        proxy.$swal({ icon: "success", title: "已新增" })
        emit("getAllData")
        dialog.value = false
      }
    } catch (err) {
      proxy.$swal({ icon: "error", title: "資料存取錯誤!!內容:" + err })
    }
  } else {
    proxy.$swal({ icon: "error", title: "資料輸入不完整!!請再次確認!!" })
  }
}

const editOK = async () => {
  // 確認修改
  const { valid } = await form.value.validate()
  showShiftError.value = list.value.可上班時段.length === 0
  if (valid && list.value.可上班時段.length > 0) {
    list.value.editInfo.unshift({
      snkey: store.state.pData.snkey,
      name: store.state.pData.username,
      time: dayjs().format("YYYY-MM-DD HH:mm:ss")
    })

    const postData = {
      snkey: list.value.snkey,
      datalist: JSON.stringify(list.value),
      updateTime: dayjs().format("YYYY-MM-DD HH:mm:ss")
    }

    const rs = await api.post(props.usingDatabase, postData)
    if (rs.state == 1) {
      proxy.$swal({
        icon: "success",
        title: "已修改"
      })
      emit("getAllData")
      dialog.value = false
    }
  } else {
    proxy.$swal({ icon: "error", title: "資料輸入不完整!!請再次確認!!" })
  }
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

defineExpose({
  editProcess
})
</script>

<style scoped lang="scss">
.operator-add-btn {
  padding-inline: 22px;
  font-weight: 600;
  letter-spacing: 0.05em;
  text-transform: none;
  background: linear-gradient(135deg, rgba(74, 107, 95, 0.95), rgba(123, 163, 184, 0.92));
  color: #ffffff;

  &:hover {
    box-shadow: 0 10px 24px rgba(90, 122, 111, 0.32);
  }
}

.operator-dialog {
  background: rgba(255, 255, 255, 0.96);
  border: 1px solid var(--daycare-divider-light);
  box-shadow: 0 24px 60px rgba(74, 107, 95, 0.22);
}

.dialog-title {
  padding: 18px 24px;
  font-size: 1.15rem;
  color: #ffffff;

  &--add {
    background: linear-gradient(135deg, rgba(74, 107, 95, 0.95), rgba(123, 163, 184, 0.85));
  }

  &--edit {
    background: linear-gradient(135deg, rgba(107, 154, 138, 0.95), rgba(123, 163, 184, 0.85));
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
</style>

