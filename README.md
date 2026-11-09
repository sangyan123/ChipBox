# 芯匣 (ChipBox) - 极简本地密码管理器

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![React](https://img.shields.io/badge/React-19-blue.svg)
![Android](https://img.shields.io/badge/Android-Capacitor%207-green.svg)

**芯匣 (ChipBox)** 是一款专为移动端设计的单机极简账号密码存储应用。数据经 **AES-256-GCM** 加密后仅保存在本地，不上传任何服务器。

## ✨ 功能特点

- 🔐 **加密存储**：账号数据经 AES-256-GCM 加密落盘，访问密码（PIN）通过 PBKDF2-SHA256（310000 次迭代 + 随机盐）派生密钥
- 🔒 **锁屏保护**：PIN 解锁、自动锁定（1/5/10/30 分钟可配）、手动立即锁定
- 🎲 **强密码生成**：加密安全随机数（CSPRNG），可调长度/字符类型，带强度指示
- 📂 **分类管理**：预设分类 + 自定义分类
- ⭐ **收藏置顶 + 多种排序**；🔍 搜索标题/账号/备注
- 🗑️ **回收站**：删除先入回收站，可恢复或彻底删除
- 📤 **备份导出/导入**：JSON 格式，兼容旧版本备份
- 🌓 **深色模式**：跟随系统或手动切换
- 📱 **移动端适配**：刘海屏、手势条、Android 15+ 状态栏避让
- 🌐 **PWA**：Web 版可安装到主屏幕离线使用

## 🛠️ 技术栈

React 19 · TypeScript · Vite 6 · Tailwind CSS · Capacitor 7（Android）· WebCrypto

## 🚀 快速开始

```bash
git clone https://github.com/sangyan123/ChipBox.git
cd chipbox
npm install
npm run dev      # 本地开发 http://localhost:3000
npm test         # 存储加密/回收站等功能测试（30 项）
npm run build    # 生产构建（Web 版，输出 dist/）
```

## 📱 构建 Android APK

要求：JDK 21（Capacitor 7 需要）、Android SDK（platform 36 + build-tools 36）

```bash
npm run build
npx cap sync android
cd android
./gradlew assembleDebug    # 输出 app-debug.apk
./gradlew assembleRelease  # 输出已签名 app-release.apk（需先配置签名）
```

### 正式签名（可选）

签名密钥不提交到仓库。在 `android/` 下创建 `keystore.properties`：

```properties
storeFile=chipbox-release.jks
storePassword=你的密码
keyAlias=chipbox
keyPassword=你的密码
```

生成密钥库：

```bash
keytool -genkeypair -v -keystore chipbox-release.jks -alias chipbox \
  -keyalg RSA -keysize 2048 -validity 10950
```

> ⚠️ `keystore.properties` 和 `.jks` 已在 .gitignore 中排除，**请务必自行备份**——丢失后无法对同一应用发布更新。

## 🤖 CI

推送到 `main` 或打 `v*` 标签时，GitHub Actions 自动执行测试 + 构建 APK；打标签会自动创建 Release 并附上 APK。

## 📦 部署

Web 版为纯静态应用，`dist/` 可部署到 GitHub Pages / Vercel / Netlify / Cloudflare Pages。

## ⚠️ 安全说明

1. 访问密码**遗忘后数据无法恢复**（真加密的固有代价），请牢记 PIN 并定期导出备份
2. 备份文件为明文 JSON，请妥善保管
3. 复制的密码 30 秒后自动清除剪贴板
4. 本项目用于学习与日常非敏感账号管理

## 📜 开源协议

[MIT](LICENSE)
