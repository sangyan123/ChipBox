# 芯匣 (ChipBox) - 极简本地密码管理器

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![React](https://img.shields.io/badge/React-19-blue.svg)
![Vite](https://img.shields.io/badge/Vite-Modern-646CFF.svg)

**芯匣 (ChipBox)** 是一款专为移动端设计的单机极简账号密码存储应用。它完全运行在浏览器本地，不上传任何数据到服务器，确保您的隐私安全。

## ✨ 功能特点

- 📱 **移动端优先**：针对刘海屏、状态栏、底部手势操作进行了深度 UI 适配。
- 🔒 **全本地存储**：数据仅存储在浏览器的 `LocalStorage` 中，无需联网。
- 🛡️ **访问锁定**：设置独立的 PIN 码，保护您的敏感信息不被窥视。
- 🎲 **强密码生成**：内置可自定义规则的强密码生成器。
- 📂 **分类管理**：支持社交、银行、办公等多种预设分类。
- 📤 **备份与导出**：支持 JSON 格式的数据导出备份及一键重置。

## 🛠️ 技术栈

- **框架**: [React 19](https://react.dev/)
- **构建**: [Vite](https://vitejs.dev/)
- **语言**: [TypeScript](https://www.typescriptlang.org/)
- **样式**: [Tailwind CSS](https://tailwindcss.com/)
- **图标**: [Lucide React](https://lucide.dev/)
- **路由**: [React Router 7](https://reactrouter.com/)

## 🚀 快速开始

### 1. 克隆项目
```bash
git clone https://github.com/your-username/chipbox.git
cd chipbox
```

### 2. 安装依赖
```bash
npm install
```

### 3. 本地开发
```bash
npm run dev
```

### 4. 生产构建
```bash
npm run build
```
构建后的文件将生成在 `dist` 目录中。

## 📦 部署建议

由于本项目是纯静态应用，您可以轻松部署到以下平台：
- **GitHub Pages**
- **Vercel**
- **Netlify**
- **Cloudflare Pages**

## ⚠️ 安全警告

1. **非加密存储**：当前版本主要用于学习和日常非敏感账号管理，使用的是 `LocalStorage`。请注意，清除浏览器缓存或更换设备会导致数据丢失，**请务必定期导出 JSON 备份**。
2. **简单验证**：访问密码（PIN）采用简单哈希验证，建议仅作为防窥手段使用。

## 📜 开源协议

本项目采用 [MIT License](LICENSE) 开源协议。