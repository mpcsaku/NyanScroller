// 拡張機能がインストールされた時に一度だけ実行
chrome.runtime.onInstalled.addListener(() => {
  console.log('Nyan Scroller がインストールされました。');
});

// タブの状態が更新されたときに実行される、より強力な監視システム
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url && (tab.url.startsWith("https://www.youtube.com/watch") || tab.url.startsWith("https://www.youtube.com/shorts/"))) {
    console.log(`%cNyan Scroller [background]: YouTubeの動画ページを検知しました。スクリプトを注入します...`, "color: blue; font-weight: bold;");

    chrome.scripting.insertCSS({
      target: { tabId: tabId },
      files: ["onpage-styles.css"]
    }).catch(err => console.error("CSSの注入に失敗:", err));

    chrome.scripting.executeScript({
      target: { tabId: tabId },
      files: ["content.js"]
    }).catch(err => console.error("content.jsの注入に失敗:", err));
  }
});

// 🔥 ショートカットキーの処理（Manifest V3 commands）
chrome.commands.onCommand.addListener((command) => {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const currentTab = tabs[0];
    if (!currentTab || !currentTab.url) return;

    const { pathname, search } = new URL(currentTab.url);
    const videoIdMatch = pathname.match(/^\/(?:shorts|watch)\/([^/?]+)/) || search.match(/[?&]v=([^&]+)/);
    const videoId = videoIdMatch?.[1];
    if (!videoId) return;

    if (command === "get-thumbnail") {
      const thumbnailUrl = `https://i.ytimg.com/vi/${videoId}/sddefault.jpg`;
      chrome.tabs.create({ url: thumbnailUrl });
    }

    if (command === "open-regular-video" && currentTab.url.includes("/shorts/")) {
      const newUrl = `https://www.youtube.com/watch?v=${videoId}`;
      chrome.tabs.create({ url: newUrl });
    }
  });
});
