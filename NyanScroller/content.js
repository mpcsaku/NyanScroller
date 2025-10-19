if (typeof window.nyanScrollerInjected === "undefined") {
  window.nyanScrollerInjected = true;
  console.log("NyanScroller読み込み😸");

  // --- グローバル変数 ---
  let lastVideoId = null;
  let currentDislikeCount = null;
  let lastPathname = null;
  let autoExpandCommentsEnabled = true;
  let currentViewCount = null;
  // ★ 修正点 ★ コメント入力で自動スクロールをロックするためのスイッチ
  let isAutoScrollLocked = false;

  // --- ヘルパー関数 ---
  const fetchDislikeCount = async (videoId) => {
    try {
      const response = await fetch(
        `https://returnyoutubedislikeapi.com/votes?videoId=${videoId}`
      );
      if (!response.ok) return null;
      const data = await response.json();
      return data.dislikes;
    } catch (error) {
      console.error("低評価数の取得に失敗:", error);
      return null;
    }
  };
  const formatDate = (iso) => {
    return new Date(iso).toLocaleDateString("ja-JP", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
  };
  const showDateBadge = (text) => {
    const activePlayer = document.querySelector(
      "ytd-reel-video-renderer[is-active]"
    );
    if (!activePlayer) {
      removeDateBadge();
      return;
    }
    let badge = document.getElementById("shorts-published-badge");
    if (!badge) {
      badge = document.createElement("div");
      badge.id = "shorts-published-badge";
      badge.className = "shorts-date-badge";
      activePlayer.appendChild(badge);
    } else {
      if (badge.parentElement !== activePlayer) {
        activePlayer.appendChild(badge);
      }
    }
    badge.textContent = `😸 ${text}`;
  };
  const removeDateBadge = () => {
    const badge = document.getElementById("shorts-published-badge");
    if (badge) badge.remove();
  };
  const fetchAndDisplayDateAndViews = async (id) => {
    try {
      const res = await fetch(
        `https://asia-northeast1-chromeextension0206.cloudfunctions.net/Get-Youtube-Info?videoId=${id}&fields=publishedAt,viewCount`
      );
      if (!res.ok) {
        throw new Error(`Server responded with status: ${res.status}`);
      }
      const data = await res.json();
      const iso = data.publishedAt;
      const viewCount = data.viewCount;
      let badgeText = "";
      if (iso) {
        badgeText += formatDate(iso);
      }
      if (viewCount) {
        currentViewCount = parseInt(viewCount, 10);
        badgeText += ` | ${formatCount(currentViewCount)} 回視聴`;
      } else {
        currentViewCount = null;
      }
      if (badgeText) {
        showDateBadge(badgeText);
      } else {
        removeDateBadge();
      }
    } catch (err) {
      console.error("投稿日時または再生数の取得に失敗:", err);
      removeDateBadge();
      currentViewCount = null;
    }
  };
  const formatCount = (num) => {
    if (num === null || num === undefined) return "";
    return new Intl.NumberFormat("ja-JP", {
      notation: "compact",
      maximumFractionDigits: 1,
    }).format(num);
  };
  const maintainDislikeDisplay = () => {
    if (!lastVideoId) return;
    const isShorts = window.location.pathname.startsWith("/shorts/");
    const selector = isShorts
      ? "ytd-reel-video-renderer[is-active] #dislike-button"
      : "#actions-inner dislike-button-view-model button";
    const dislikeButton = document.querySelector(selector);
    if (!dislikeButton) return;
    const spanClassName = "nyan-dislike-count";
    if (currentDislikeCount === null) {
      if (isShorts) {
        const label = dislikeButton.querySelector("#text");
        if (label) label.textContent = "";
        const spans = document.querySelectorAll(
          "span.yt-core-attributed-string"
        );
        for (const span of spans) {
          if (span.classList.contains("nyan-dislike-label")) {
            span.textContent = "低く評価";
          }
        }
      } else {
        const span = dislikeButton.querySelector(`.${spanClassName}`);
        if (span) span.textContent = "";
      }
      return;
    }
    const dislikeText = formatCount(currentDislikeCount);
    if (isShorts) {
      const label = dislikeButton.querySelector("#text");
      if (label && label.textContent !== dislikeText) {
        label.textContent = dislikeText;
      }
      const spans = document.querySelectorAll("span.yt-core-attributed-string");
      for (const span of spans) {
        if (span.textContent?.trim() === "低く評価") {
          span.textContent = `${dislikeText}`;
          span.classList.add("nyan-dislike-label");
          break;
        }
      }
    } else {
      let span = dislikeButton.querySelector(`.${spanClassName}`);
      if (!span) {
        span = document.createElement("span");
        span.className = spanClassName;
        dislikeButton.appendChild(span);
      }
      span.textContent = dislikeText;
      dislikeButton.setAttribute(
        "style",
        ` display: inline-flex !important; align-items: center !important; overflow: visible !important; min-width: 75px !important; `
      );
      span.setAttribute(
        "style",
        ` margin-left: 6px !important; font-size: 1.4rem !important; white-space: nowrap !important; pointer-events: none !important; `
      );
    }
  };
  const loadSettings = async () => {
    const result = await chrome.storage.sync.get(["autoExpandComments"]);
    autoExpandCommentsEnabled =
      result.autoExpandComments !== undefined
        ? result.autoExpandComments
        : true;
  };
  loadSettings();
  chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === "sync") {
      if (changes.autoExpandComments) {
        autoExpandCommentsEnabled = changes.autoExpandComments.newValue;
        console.log("コメント自動展開設定:", autoExpandCommentsEnabled);
        if (
          !autoExpandCommentsEnabled &&
          window.location.pathname.startsWith("/shorts/")
        ) {
          const commentSection = document.querySelector(
            'ytd-engagement-panel-section-list-renderer[visibility="ENGAGEMENT_PANEL_VISIBILITY_VISIBLE"]'
          );
          const closeButton = commentSection?.querySelector(
            'yt-icon-button button[aria-label="閉じる"]'
          );
          if (closeButton) closeButton.click();
        }
      }
    }
  });
  function openShortsComments() {
    if (window.innerWidth <= 1465) return;
    if (!autoExpandCommentsEnabled || !location.pathname.startsWith("/shorts/"))
      return;
    const btn = document.querySelector(
      'ytd-reel-video-renderer[is-active] button[aria-label*="コメント"]'
    );
    if (btn && btn.offsetParent !== null) {
      btn.click();
      console.log("✅ Shortsのコメント欄を自動で開いたよ");
    }
  }

  // ★ メイン処理：URLや動画IDをチェックして、必要な処理を呼び出す司令塔 ★
  const mainProcess = () => {
    const { pathname, search } = window.location;
    const isShortsPage = pathname.startsWith("/shorts/");

    if (isShortsPage) {
      activateShortsFeatures();
    } else {
      deactivateShortsFeatures();
    }

    if (pathname !== lastPathname) {
      lastPathname = pathname;
      lastVideoId = null;
    }

    const videoIdMatch = pathname.match(/^\/shorts\/([^/?]+)/);
    const currentVideoId = videoIdMatch
      ? videoIdMatch[1]
      : new URLSearchParams(search).get("v");

    if (currentVideoId && currentVideoId !== lastVideoId) {
      lastVideoId = currentVideoId;

      // ★ 新しい動画になったら、前の動画の低評価数を即座にリセット
      currentDislikeCount = null;
      // ★ 新しい動画になったら、自動スクロール禁止スイッチを必ずリセット
      isAutoScrollLocked = false;

      fetchDislikeCount(currentVideoId).then((result) => {
        currentDislikeCount = result;
      });

      if (isShortsPage) {
        fetchAndDisplayDateAndViews(currentVideoId);
        setTimeout(openShortsComments, 1000);
      }
    }
  };

  // ★「読み込み完了」を賢く待ってから、メイン処理を実行する！ ★
  const waitForElement = (selector, callback) => {
    const maxTries = 50;
    let tries = 0;
    const interval = setInterval(() => {
      const element = document.querySelector(selector);
      if (element) {
        clearInterval(interval);
        callback();
      } else {
        tries++;
        if (tries > maxTries) {
          clearInterval(interval);
        }
      }
    }, 100);
  };

  const onPageChanged = () => {
    const { pathname } = window.location;
    if (pathname.startsWith("/shorts/")) {
      waitForElement("ytd-reel-video-renderer[is-active]", mainProcess);
    } else if (pathname.startsWith("/watch")) {
      waitForElement("ytd-watch-flexy", mainProcess);
    } else {
      mainProcess();
    }
  };

  const pageObserver = new MutationObserver(() => {
    if (window.location.pathname !== lastPathname) {
      onPageChanged();
    }
  });

  pageObserver.observe(document.body, { childList: true, subtree: true });

  onPageChanged();

  setInterval(maintainDislikeDisplay, 200);

  // --- Shorts専用機能 ---
  let shortsIntervalId = null;
  let keydownListener = null;
  const activateShortsFeatures = () => {
    if (shortsIntervalId) return;
    let seekSeconds = 2;
    chrome.storage.sync.get({ seekSeconds: 2 }, (items) => {
      seekSeconds = items.seekSeconds;
    });
    keydownListener = (e) => {
      if (
        e.target.isContentEditable ||
        ["INPUT", "TEXTAREA"].includes(e.target.tagName)
      )
        return;
      const video = document.querySelector(
        "ytd-reel-video-renderer[is-active] video"
      );
      if (video) {
        if (e.key === "ArrowLeft") {
          e.preventDefault();
          video.currentTime -= seekSeconds;
        }
        if (e.key === "ArrowRight") {
          e.preventDefault();
          video.currentTime += seekSeconds;
        }
      }
    };
    document.addEventListener("keydown", keydownListener);
    shortsIntervalId = setInterval(() => {
      const activePlayer = document.querySelector(
        "ytd-reel-video-renderer[is-active]"
      );
      if (!activePlayer) return;
      const actionsContainer = activePlayer.querySelector("#actions");
      if (
        actionsContainer &&
        !actionsContainer.querySelector(".nyan-onpage-container")
      ) {
        document
          .querySelectorAll(".nyan-onpage-container")
          .forEach((e) => e.remove());
        const container = document.createElement("div");
        container.className = "nyan-onpage-container";
        const createButton = (text, title, onClick) => {
          const button = document.createElement("button");
          button.className = "nyan-onpage-button";
          button.textContent = text;
          button.title = title;
          button.addEventListener("click", onClick);
          return button;
        };
        const openAsRegularVideo = () => {
          const match = window.location.pathname.match(/^\/shorts\/([^/?]+)/);
          if (match?.[1])
            window.open(`https://www.youtube.com/watch?v=${match[1]}`);
        };
        const getThumbnail = () => {
          const match = window.location.pathname.match(/^\/shorts\/([^/?]+)/);
          if (match?.[1])
            window.open(`https://i.ytimg.com/vi/${match[1]}/sddefault.jpg`);
        };
        container.appendChild(
          createButton("🎬", "通常動画で開く", openAsRegularVideo)
        );
        container.appendChild(
          createButton("🖼️", "サムネイルを取得", getThumbnail)
        );
        actionsContainer.prepend(container);
      }
      const activeVideo = activePlayer.querySelector("video");
      if (!activeVideo) return;
      if (activeVideo.hasAttribute("loop")) {
        activeVideo.removeAttribute("loop");
      }

      // ★ 修正点 ★ コメント入力欄へのフォーカスを監視
      const focusedElement = document.activeElement;
      if (
        focusedElement &&
        (focusedElement.isContentEditable ||
          ["INPUT", "TEXTAREA"].includes(focusedElement.tagName))
      ) {
        // 一度でもフォーカスされたら、この動画の自動スクロールを禁止する
        isAutoScrollLocked = true;
      }

      if (
        activeVideo.duration > 0 &&
        activeVideo.duration - activeVideo.currentTime < 0.1
      ) {
        // ★ 修正点 ★ スクロール直前に、禁止スイッチがONになっていないかチェック
        if (isAutoScrollLocked) {
          // 禁止されていたら、何もしないで処理を終了
          return;
        }

        document
          .querySelector(
            'button[aria-label="次の動画"], #navigation-button-down button'
          )
          ?.click();
      }
    }, 100);
  };
  const deactivateShortsFeatures = () => {
    if (!shortsIntervalId) return;
    clearInterval(shortsIntervalId);
    shortsIntervalId = null;
    if (keydownListener) {
      document.removeEventListener("keydown", keydownListener);
      keydownListener = null;
    }
    document
      .querySelectorAll(".nyan-onpage-container")
      .forEach((e) => e.remove());
    removeDateBadge();
    currentViewCount = null;
  };
}
