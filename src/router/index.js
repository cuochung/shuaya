import { createRouter, createWebHistory } from 'vue-router'

const routes = [
  {
    path: '/',
    redirect: '/login'
  },
  {
    path: '/login',
    name: 'login',
    component: () => import('@/views/login/index.vue'),
    meta: { title: 'Login' },
  },
  {
    path: '/main',
    name: 'main',
    component: () => import('@/views/main/Main.vue'),
    // meta: { title: '主畫面' },
    children: [
      { path: 'functionlist', name: 'functionlist', component: () => import('@/views/main/FunctionList.vue') },
      { path: 'Personnel', name: 'Personnel', component: () => import('@/views/main/Personnel/index.vue') },
      
      // 排班系統路由
      { path: 'Machine', name: 'Machine', component: () => import('@/views/main/Machine/index.vue') },
      { path: 'Operator', name: 'Operator', component: () => import('@/views/main/Operator/index.vue') },
      { path: 'ProductCode', name: 'ProductCode', component: () => import('@/views/main/ProductCode/index.vue') },
      { path: 'Scheduling', name: 'Scheduling', component: () => import('@/views/main/Scheduling/index.vue') },
    ]
  },

  //列印區
  // { path: '/NursingplanPrint', name: 'NursingplanPrint', component: () => import('@/views/main/Documents/Nursingplan/PrintPage.vue') },
  // { path: '/NursingrecordPrint', name: 'NursingrecordPrint', component: () => import('@/views/main/Documents/Nursingrecord/PrintPage.vue') },
  // {
  //   path: '/orderpage',
  //   name: 'orderpage',
  //   component: () => import('@/views/orderpage/index.vue'),
  //   meta: { title: '會員功能' },
  // },
  // 將 404 路由放在最後
  { path: '/:pathMatch(.*)*', redirect: '/' },

]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
})

router.beforeEach((to, from, next) => {
  if (to.meta.title != undefined) {
    window.document.title = to.meta.title
  } else {
    window.document.title = '山亞實業'
  }
  next()
})

export default router
