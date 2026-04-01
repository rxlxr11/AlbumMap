import { createRouter, createWebHistory } from 'vue-router'

const HomePage = () => import('../pages/HomePage.vue')
const UploadPage = () => import('../pages/UploadPage.vue')

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', name: 'home', component: HomePage },
    { path: '/upload', name: 'upload', component: UploadPage },
  ],
})
