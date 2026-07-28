const form = document.getElementById("search-form");
const keywordInput = document.getElementById("keyword");
const areaInput = document.getElementById("area");
const geoButton = document.getElementById("geo-button");
const searchButton = document.getElementById("search-button");
const warningsEl = document.getElementById("warnings");
const messageEl = document.getElementById("message");
const resultsEl = document.getElementById("results");
const wishlistListEl = document.getElementById("wishlist-list");
const boxesListEl = document.getElementById("boxes-list");
const newBoxButton = document.getElementById("new-box-button");

const WISHLIST_KEY = "restaurant-url-finder:wishlist";
const BOXES_KEY = "restaurant-url-finder:boxes";

// --- 永続化(行きたい店 / 共有ボックス) ---
function loadWishlist() {
  try {
    return JSON.parse(localStorage.getItem(WISHLIST_KEY)) || [];
  } catch {
    return [];
  }
}
function persistWishlist(list) {
  localStorage.setItem(WISHLIST_KEY, JSON.stringify(list));
}

function loadBoxes() {
  try {
    return JSON.parse(localStorage.getItem(BOXES_KEY)) || [];
  } catch {
    return [];
  }
}
function persistBoxes(boxes) {
  localStorage.setItem(BOXES_KEY, JSON.stringify(boxes));
}

function candidateKey(candidate) {
  return candidate.url;
}

function isInWishlist(candidate) {
  return loadWishlist().some((c) => candidateKey(c) === candidateKey(candidate));
}

function addToWishlist(candidate) {
  const list = loadWishlist();
  if (!list.some((c) => candidateKey(c) === candidateKey(candidate))) {
    list.push(candidate);
    persistWishlist(list);
  }
  renderWishlist();
}

function removeFromWishlist(url) {
  persistWishlist(loadWishlist().filter((c) => c.url !== url));
  renderWishlist();
}

function createBox(name) {
  const boxes = loadBoxes();
  const box = { id: `box-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, name, items: [] };
  boxes.push(box);
  persistBoxes(boxes);
  return box;
}

function deleteBox(boxId) {
  persistBoxes(loadBoxes().filter((b) => b.id !== boxId));
  renderBoxes();
}

function addToBox(boxId, candidate) {
  const boxes = loadBoxes();
  const box = boxes.find((b) => b.id === boxId);
  if (!box) return;
  if (!box.items.some((c) => candidateKey(c) === candidateKey(candidate))) {
    box.items.push(candidate);
    persistBoxes(boxes);
  }
  renderBoxes();
}

function removeFromBox(boxId, url) {
  const boxes = loadBoxes();
  const box = boxes.find((b) => b.id === boxId);
  if (!box) return;
  box.items = box.items.filter((c) => c.url !== url);
  persistBoxes(boxes);
  renderBoxes();
}

// --- カード描画 ---
function badgeClass(source) {
  return source === "hotpepper" ? "hotpepper" : source === "tabelog" ? "tabelog" : "google";
}

function buildCard(candidate, actionsBuilder) {
  const card = document.createElement("div");
  card.className = "card";

  const img = document.createElement("img");
  img.src = candidate.photo || "";
  img.alt = candidate.name || "";
  img.loading = "lazy";
  if (!candidate.photo) img.style.display = "none";
  card.appendChild(img);

  const body = document.createElement("div");
  body.className = "card-body";

  const badge = document.createElement("span");
  badge.className = `badge ${badgeClass(candidate.source)}`;
  badge.textContent = candidate.sourceLabel || candidate.source;
  body.appendChild(badge);

  const title = document.createElement("div");
  title.className = "card-title";
  title.textContent = candidate.name || "(名称不明)";
  body.appendChild(title);

  const metaParts = [candidate.address, candidate.budget, candidate.genre, candidate.snippet].filter(Boolean);
  if (candidate.googleRating != null) metaParts.push(`★${candidate.googleRating}`);
  const meta = document.createElement("div");
  meta.className = "card-meta";
  meta.textContent = metaParts.join(" / ");
  if (meta.textContent) body.appendChild(meta);

  const actions = document.createElement("div");
  actions.className = "card-actions";

  const openLink = document.createElement("a");
  openLink.href = candidate.url;
  openLink.target = "_blank";
  openLink.rel = "noopener noreferrer";
  openLink.textContent = "URLを開く";
  actions.appendChild(openLink);

  actionsBuilder(actions, candidate);

  body.appendChild(actions);
  card.appendChild(body);

  if (!candidate.photo && candidate.url) {
    fetch(`/api/ogp?url=${encodeURIComponent(candidate.url)}`)
      .then((r) => r.json())
      .then((ogp) => {
        if (ogp?.image) {
          img.src = ogp.image;
          img.style.display = "";
        }
      })
      .catch(() => {});
  }

  return card;
}

// 検索結果カード: 行きたい店に追加
function buildSearchCard(candidate) {
  return buildCard(candidate, (actions) => {
    const addBtn = document.createElement("button");
    const already = isInWishlist(candidate);
    addBtn.textContent = already ? "追加済み" : "♡ 行きたい店に追加";
    addBtn.disabled = already;
    addBtn.addEventListener("click", () => {
      addToWishlist(candidate);
      addBtn.textContent = "追加済み";
      addBtn.disabled = true;
    });
    actions.appendChild(addBtn);
  });
}

// 行きたい店カード: ボックスへ追加 + 削除
function buildWishlistCard(candidate) {
  return buildCard(candidate, (actions) => {
    const select = document.createElement("select");
    const placeholder = document.createElement("option");
    placeholder.textContent = "ボックスへ追加...";
    placeholder.value = "";
    select.appendChild(placeholder);

    loadBoxes().forEach((box) => {
      const opt = document.createElement("option");
      opt.value = box.id;
      opt.textContent = box.name;
      select.appendChild(opt);
    });

    const newOpt = document.createElement("option");
    newOpt.value = "__new__";
    newOpt.textContent = "+ 新しいボックス";
    select.appendChild(newOpt);

    select.addEventListener("change", () => {
      if (select.value === "__new__") {
        const name = prompt("ボックスの名前(例: 〇〇さん用)");
        if (name && name.trim()) {
          const box = createBox(name.trim());
          addToBox(box.id, candidate);
        }
      } else if (select.value) {
        addToBox(select.value, candidate);
      }
      select.value = "";
    });
    actions.appendChild(select);

    const removeBtn = document.createElement("button");
    removeBtn.className = "remove";
    removeBtn.textContent = "削除";
    removeBtn.addEventListener("click", () => removeFromWishlist(candidate.url));
    actions.appendChild(removeBtn);
  });
}

// ボックス内カード: 削除のみ
function buildBoxItemCard(boxId, candidate) {
  return buildCard(candidate, (actions) => {
    const removeBtn = document.createElement("button");
    removeBtn.className = "remove";
    removeBtn.textContent = "削除";
    removeBtn.addEventListener("click", () => removeFromBox(boxId, candidate.url));
    actions.appendChild(removeBtn);
  });
}

function renderWishlist() {
  const list = loadWishlist();
  wishlistListEl.innerHTML = "";
  list.forEach((candidate) => wishlistListEl.appendChild(buildWishlistCard(candidate)));
}

// --- 共有リンク(box単位) ---
function toShareable(candidate) {
  const { source, sourceLabel, name, url, address, budget, genre, photo, googleRating } = candidate;
  return { source, sourceLabel, name, url, address, budget, genre, photo, googleRating };
}

function encodeShareData(list) {
  const json = JSON.stringify(list.map(toShareable));
  const bytes = new TextEncoder().encode(json);
  let binary = "";
  bytes.forEach((b) => (binary += String.fromCharCode(b)));
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function renderBoxes() {
  const boxes = loadBoxes();
  boxesListEl.innerHTML = "";

  boxes.forEach((box) => {
    const card = document.createElement("div");
    card.className = "box-card";

    const header = document.createElement("div");
    header.className = "box-header";

    const title = document.createElement("div");
    title.className = "box-title";
    title.textContent = box.name;
    const count = document.createElement("span");
    count.className = "box-count";
    count.textContent = ` (${box.items.length}件)`;
    title.appendChild(count);
    header.appendChild(title);

    const deleteBtn = document.createElement("button");
    deleteBtn.className = "box-delete";
    deleteBtn.textContent = "ボックスを削除";
    deleteBtn.addEventListener("click", () => {
      if (confirm(`「${box.name}」を削除しますか?`)) deleteBox(box.id);
    });
    header.appendChild(deleteBtn);

    card.appendChild(header);

    if (box.items.length === 0) {
      const empty = document.createElement("div");
      empty.className = "box-empty";
      empty.textContent = "まだお店がありません。「行きたい店」から追加してください。";
      card.appendChild(empty);
    } else {
      const itemsGrid = document.createElement("div");
      itemsGrid.className = "box-items";
      box.items.forEach((candidate) => itemsGrid.appendChild(buildBoxItemCard(box.id, candidate)));
      card.appendChild(itemsGrid);
    }

    const shareBox = document.createElement("div");
    shareBox.className = "share-box";
    const shareBtn = document.createElement("button");
    shareBtn.textContent = "共有リンクを作成";
    shareBtn.disabled = box.items.length === 0;
    shareBox.appendChild(shareBtn);

    const shareOutput = document.createElement("div");
    shareOutput.className = "share-output";
    shareOutput.hidden = true;
    const shareUrlInput = document.createElement("input");
    shareUrlInput.type = "text";
    shareUrlInput.className = "share-url";
    shareUrlInput.readOnly = true;
    const copyBtn = document.createElement("button");
    copyBtn.className = "copy-button";
    copyBtn.textContent = "コピー";
    shareOutput.appendChild(shareUrlInput);
    shareOutput.appendChild(copyBtn);
    shareBox.appendChild(shareOutput);

    shareBtn.addEventListener("click", () => {
      const encoded = encodeShareData(box.items);
      shareUrlInput.value = `${location.origin}/share.html#d=${encoded}`;
      shareOutput.hidden = false;
    });

    copyBtn.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(shareUrlInput.value);
        copyBtn.textContent = "コピーしました";
      } catch {
        shareUrlInput.select();
      } finally {
        setTimeout(() => (copyBtn.textContent = "コピー"), 1500);
      }
    });

    card.appendChild(shareBox);
    boxesListEl.appendChild(card);
  });
}

newBoxButton.addEventListener("click", () => {
  const name = prompt("ボックスの名前(例: 〇〇さん用)");
  if (name && name.trim()) {
    createBox(name.trim());
    renderBoxes();
  }
});

// --- 検索 ---
async function runSearch(params) {
  searchButton.disabled = true;
  geoButton.disabled = true;
  warningsEl.textContent = "";
  messageEl.textContent = "";
  resultsEl.innerHTML = "";

  try {
    const qs = new URLSearchParams();
    if (params.keyword) qs.set("keyword", params.keyword);
    if (params.area) qs.set("area", params.area);
    if (params.lat != null) {
      qs.set("lat", params.lat);
      qs.set("lng", params.lng);
    }

    const res = await fetch(`/api/search?${qs.toString()}`);
    const data = await res.json();

    if (!res.ok) {
      messageEl.textContent = data.error || "検索に失敗しました";
      return;
    }
    if (data.warnings?.length) {
      warningsEl.textContent = data.warnings.join(" / ");
    }
    if (!data.candidates?.length) {
      messageEl.textContent = data.message || "候補が見つかりませんでした";
      return;
    }
    data.candidates.forEach((candidate) => resultsEl.appendChild(buildSearchCard(candidate)));
  } catch {
    messageEl.textContent = "通信エラーが発生しました";
  } finally {
    searchButton.disabled = false;
    geoButton.disabled = false;
  }
}

form.addEventListener("submit", (e) => {
  e.preventDefault();
  const keyword = keywordInput.value.trim();
  const area = areaInput.value.trim();
  if (!keyword && !area) {
    messageEl.textContent = "キーワードかエリアのどちらかを入力してください";
    return;
  }
  runSearch({ keyword, area });
});

geoButton.addEventListener("click", () => {
  if (!navigator.geolocation) {
    messageEl.textContent = "このブラウザは位置情報に対応していません";
    return;
  }
  geoButton.textContent = "現在地を取得中...";
  geoButton.disabled = true;
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      geoButton.textContent = "現在地から探す";
      runSearch({ keyword: keywordInput.value.trim(), lat: pos.coords.latitude, lng: pos.coords.longitude });
    },
    (err) => {
      geoButton.textContent = "現在地から探す";
      geoButton.disabled = false;
      messageEl.textContent = `位置情報を取得できませんでした: ${err.message}`;
    }
  );
});

renderWishlist();
renderBoxes();
