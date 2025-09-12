# MiniGameHub

一个基于 Vue 3 和 TypeScript 的 H5 小游戏平台，提供游戏大厅和沉浸式游戏体验。

## 技术栈
- **前端框架**: Vue 3 (Composition API + `<script setup>`)
- **构建工具**: Vite
- **路由管理**: Vue Router
- **语言**: TypeScript
- **样式**: CSS / SCSS
- **部署**: Vercel

## 项目结构
```
src/
├── assets/          # 静态资源
├── components/      # 可复用组件
├── composables/     # 逻辑复用
├── games/           # 游戏核心逻辑
├── router/          # 路由配置
├── stores/          # 状态管理
├── types/           # 类型定义
├── views/           # 路由级别组件
├── App.vue
├── main.ts
└── style.css        # 全局样式
```

## 快速开始
1. **安装依赖**
   ```bash
   npm install
   ```

2. **启动开发服务器**
   ```bash
   npm run dev
   ```

3. **构建生产环境**
   ```bash
   npm run build
   ```

4. **预览生产环境**
   ```bash
   npm run preview
   ```

## 部署
项目可直接部署到 Vercel 或其他静态文件托管服务。