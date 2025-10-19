// popup.js (ゴミ掃除後・完成版)

document.addEventListener("DOMContentLoaded", () => {
  // --- 操作するHTML要素を取得 ---
  const secondsInput = document.getElementById("seconds");
  const saveButton = document.getElementById("save");
  const statusDiv = document.getElementById("status");
  const watchRegularButton = document.getElementById("watchRegularButton");
  const getThumbnailButton = document.getElementById("getThumbnailButton");
  const autoExpandCommentsCheckbox =
    document.getElementById("autoExpandComments");

  // 言語グローバル化
  // data-i18n → テキストノード
  document.querySelectorAll("[data-i18n]").forEach((el) => {
    const key = el.getAttribute("data-i18n");
    const msg = chrome.i18n.getMessage(key);
    if (msg) el.textContent = msg;
  });

  // --- 秒数設定の読み込みと保存 ---
  chrome.storage.sync.get({ seekSeconds: 2 }, (items) => {
    secondsInput.value = items.seekSeconds;
  });

  saveButton.addEventListener("click", () => {
    const seconds = parseFloat(secondsInput.value);
    if (seconds && seconds > 0) {
      chrome.storage.sync.set({ seekSeconds: seconds }, () => {
        statusDiv.textContent = chrome.i18n.getMessage("MessageSettingsSaved");
        statusDiv.classList.add("show");
        setTimeout(() => {
          statusDiv.classList.remove("show");
        }, 2000);
      });
    } else {
      statusDiv.textContent = chrome.i18n.getMessage("ErrorInvalidSecondsInput");
      statusDiv.classList.add("show");
      statusDiv.style.color = "red";
      setTimeout(() => {
        statusDiv.classList.remove("show");
        statusDiv.style.color = "#2eff7b";
      }, 2000);
    }
  });

  // マウスホイール操作のコード
  secondsInput.addEventListener("wheel", (e) => {
    e.preventDefault();
    let currentValue = parseFloat(secondsInput.value);
    const step = parseFloat(secondsInput.step) || 0.1;
    if (e.deltaY > 0) {
      currentValue -= step;
    } else {
      currentValue += step;
    }
    const min = parseFloat(secondsInput.min);
    if (!isNaN(min) && currentValue < min) {
      currentValue = min;
    }
    secondsInput.value = currentValue.toFixed(1);
  });

  // --- URLチェックとボタン無効化 ---
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const currentTab = tabs[0];
    const isYoutubeVideo =
      currentTab &&
      currentTab.url &&
      (currentTab.url.includes("/shorts/") ||
        currentTab.url.includes("/watch"));

    if (!isYoutubeVideo) {
      watchRegularButton.disabled = true;
      getThumbnailButton.disabled = true;
      const message = "😹";
      watchRegularButton.textContent = message;
      getThumbnailButton.textContent = message;
    }

    if (currentTab && currentTab.url && !currentTab.url.includes("/shorts/")) {
      watchRegularButton.disabled = true;
    }
  });

  // --- 各ボタンのクリック処理 ---
  watchRegularButton.addEventListener("click", () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const currentTab = tabs[0];
      if (currentTab && currentTab.url) {
        const videoId = currentTab.url.split("/shorts/")[1];
        if (videoId) {
          const newUrl = `https://www.youtube.com/watch?v=${videoId}`;
          chrome.tabs.create({ url: newUrl });
        }
      }
    });
  });

  getThumbnailButton.addEventListener("click", () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const currentTab = tabs[0];
      if (currentTab && currentTab.url) {
        const { pathname, search } = new URL(currentTab.url);
        let videoIdMatch =
          pathname.match(/^\/(?:shorts|watch)\/([^/?]+)/) ||
          search.match(/[?&]v=([^&]+)/);

        if (videoIdMatch && videoIdMatch[1]) {
          const videoId = videoIdMatch[1];
          const thumbnailUrl = `https://i.ytimg.com/vi/${videoId}/sddefault.jpg`;
          chrome.tabs.create({ url: thumbnailUrl });
        }
      }
    });
  });


  // --- コメント自動展開設定の読み込みと保存 ---
  chrome.storage.sync.get({ autoExpandComments: true }, (items) => {
    autoExpandCommentsCheckbox.checked = items.autoExpandComments;
  });

  autoExpandCommentsCheckbox.addEventListener("change", () => {
    chrome.storage.sync.set(
      { autoExpandComments: autoExpandCommentsCheckbox.checked },
      () => {
        statusDiv.textContent = autoExpandCommentsCheckbox.checked
          ? chrome.i18n.getMessage("MessageCommentExpandEnabled")
          :chrome.i18n.getMessage("MessageCommentExpandDisabled");
        statusDiv.classList.add("show");
        statusDiv.style.color = "#2eff7b";
        setTimeout(() => {
          statusDiv.classList.remove("show");
          statusDiv.style.color = "#2eff7b";
        }, 2000);
      }
    );
  });
});
