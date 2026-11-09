// 复制并在 N 秒后自动清除剪贴板（若期间用户未复制其他内容）
export const copyWithAutoClear = async (text: string, seconds = 30): Promise<void> => {
  await navigator.clipboard.writeText(text);
  window.setTimeout(() => {
    void (async () => {
      try {
        const cur = await navigator.clipboard.readText();
        if (cur === text) await navigator.clipboard.writeText('');
      } catch {
        // 剪贴板读取权限不可用时静默跳过
      }
    })();
  }, seconds * 1000);
};
