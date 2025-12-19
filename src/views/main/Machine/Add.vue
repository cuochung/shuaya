<template>
  <div class="machineadd">
    <v-dialog v-model="dialog" fullscreen persistent>
      <template #activator="{ props }">
        <v-btn v-bind="props" class="machine-add-btn" color="primary" variant="elevated" prepend-icon="mdi-factory"
          rounded="pill" elevation="6" @click="addProcess">
          新增機台
        </v-btn>
      </template>

      <v-card class="machine-dialog" rounded="xl">
        <v-card-title class="d-flex" :class="titleStyle" primary-title>
          <div class="text-h6 font-weight-bold">{{ title }}</div>
          <v-spacer></v-spacer>
          <v-btn icon="mdi-close" class="ml-2" variant="text" color="white" @click="dialog = false"></v-btn>
        </v-card-title>

        <v-card-text class="pt-6">
          <v-form ref="form">
            <v-sheet class="info-section" color="primary-lighten-5" variant="tonal" rounded="lg">
              <div class="info-section__header">
                <v-icon color="primary" size="24">mdi-factory</v-icon>
                <span class="text-subtitle-1 font-weight-bold text-primary ml-2">機台基本資料</span>
              </div>
              <v-row dense class="mt-2">
                <v-col cols="12" md="6">
                  <v-text-field label="機台編號" prepend-icon="mdi-numeric" v-model="list.機台編號"
                    :rules="emptyRules" density="comfortable" variant="outlined"></v-text-field>
                </v-col>
                <v-col cols="12" md="6">
                  <v-text-field ref="machineNameField" label="機台名稱" prepend-icon="mdi-tag-outline" v-model="list.機台名稱"
                    :rules="emptyRules" density="comfortable" variant="outlined"></v-text-field>
                </v-col>
                <v-col cols="12">
                  <div class="d-flex align-center">
                    <v-icon color="primary" class="mr-2">mdi-flag-variant</v-icon>
                    <span class="text-body-2 mr-4">生產優先</span>
                    <v-radio-group v-model="list.生產優先" :rules="emptyRules" inline hide-details>
                      <v-radio v-for="option in priorityOptions" :key="option" :label="option" :value="option"
                        :color="getPriorityColor(option)"></v-radio>
                    </v-radio-group>
                  </div>
                </v-col>
                <v-col cols="12">
                  <v-autocomplete label="週邊機台（處理人員不合情況）" prepend-icon="mdi-arrow-split-horizontal"
                    v-model="list.週邊機台" :items="machineOptions" item-title="text" item-value="value" multiple chips
                    closable-chips density="comfortable" variant="outlined"
                    hint="用於判斷不合對象是否需要避開此機台" persistent-hint>
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
  machineItems: Array
})

// Emits
const emit = defineEmits(['getAllData'])

// Refs
const dialog = ref(false)
const list = ref({
  機台編號: '',
  機台名稱: '',
  週邊機台: [],
  生產優先: '空白',
  createInfo: {},
  editInfo: []
})
const processType = ref('')
const title = ref('')
const titleStyle = ref('')
const form = ref(null)
const machineNameField = ref(null)

// Validation rules
const emptyRules = [(v) => !!v || "不可空白"]

// 生產優先選項
const priorityOptions = ['方塊', '大圈', '小圈', '大三角', '小三角', '空白']

// Computed
const machineOptions = computed(() => {
  return props.machineItems
    .filter(m => m.snkey !== list.value.snkey) // 排除自己
    .map(m => ({
      text: m.機台名稱,
      value: m.snkey
    }))
})

// Methods
const addProcess = () => {
  processType.value = "add"
  title.value = "新增機台資料"
  titleStyle.value = "dialog-title dialog-title--add"
  const nextNumber = props.machineItems.length + 1
  list.value = {
    機台編號: String(nextNumber),
    機台名稱: '',
    週邊機台: [],
    生產優先: '空白',
    createInfo: {},
    editInfo: []
  }
  nextTick(() => {
    form.value.resetValidation()
    setTimeout(() => {
      machineNameField.value?.focus()
    }, 100)
  })
}

const editProcess = (item) => {
  processType.value = "edit"
  title.value = "修改機台資料"
  titleStyle.value = "dialog-title dialog-title--edit"
  list.value = { ...item }
  dialog.value = true
}

const addOK = async () => {
  // 新增時機台編號不可重覆
  const match = props.machineItems.find(i => i.機台編號 == list.value.機台編號)
  if (match) {
    proxy.$swal({ icon: "error", title: "機台編號不可重覆!!" })
    return false
  }

  // 確認新增
  const { valid } = await form.value.validate()
  if (valid) {
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
  if (valid) {
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

defineExpose({
  editProcess
})
</script>

<style scoped lang="scss">
.machine-add-btn {
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

.machine-dialog {
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
  margin-bottom: 20px;

  &__header {
    display: flex;
    align-items: center;
  }
}
</style>

