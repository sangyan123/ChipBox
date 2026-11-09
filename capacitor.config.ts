import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.chipbox.app',
  appName: '芯匣',
  webDir: 'dist',
  android: {
    // Android 15+ 强制全屏绘制时，自动给 WebView 加系统栏边距
    adjustMarginsForEdgeToEdge: 'auto'
  }
};

export default config;
