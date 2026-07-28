const sharedListEl = document.getElementById("shared-list");
const sharedMessageEl = document.getElementById("shared-message");

function decodeShareData(encoded) {
  const padded = encoded.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(padded);
  const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
  const json = new TextDecoder().decode(bytes);
  return JSON.parse(json);
}

function badgeClass(source) {
  return source === "hotpepper" ? "hotpepper" : source === "tabelog" ? "tabelog" : "google";
}

function buildReadOnlyCard(candidate) {
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

  const metaParts = [candidate.address, candidate.budget, candidate.genre].filter(Boolean);
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
  body.appendChild(actions);

  const snsRow = document.createElement("div");
  snsRow.className = "card-actions sns-actions";
  const igLink = document.createElement("a");
  igLink.href = `https://www.instagram.com/explore/search/keyword/?q=${encodeURIComponent(candidate.name || "")}`;
  igLink.target = "_blank";
  igLink.rel = "noopener noreferrer";
  igLink.textContent = "Instagramで見る";
  const ttLink = document.createElement("a");
  ttLink.href = `https://www.tiktok.com/search?q=${encodeURIComponent(candidate.name || "")}`;
  ttLink.target = "_blank";
  ttLink.rel = "noopener noreferrer";
  ttLink.textContent = "TikTokで見る";
  snsRow.appendChild(igLink);
  snsRow.appendChild(ttLink);
  body.appendChild(snsRow);

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

function render() {
  const hash = location.hash.startsWith("#") ? location.hash.slice(1) : "";
  const params = new URLSearchParams(hash);
  const encoded = params.get("d");

  if (!encoded) {
    sharedMessageEl.textContent = "共有データが見つかりませんでした。共有リンクを確認してください。";
    return;
  }

  try {
    const list = decodeShareData(encoded);
    if (!Array.isArray(list) || !list.length) {
      sharedMessageEl.textContent = "共有データが空でした。";
      return;
    }
    list.forEach((candidate) => sharedListEl.appendChild(buildReadOnlyCard(candidate)));
  } catch {
    sharedMessageEl.textContent = "共有データが読み取れませんでした。リンクが壊れている可能性があります。";
  }
}

render();
