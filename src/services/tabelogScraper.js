const cheerio = require("cheerio");

const LIST_URL = "https://tabelog.com/rstLst/";
// 個人利用・低頻度の前提。同じ検索語の連続リクエストを避けるための簡易キャッシュ。
const CACHE_TTL_MS = 10 * 60 * 1000;
const cache = new Map();

// 一覧・検索結果ページ(/rstLst/)はrobots.txtで禁止されていない(口コミ詳細ページ等は別途禁止)。
// 評点順(SrtT=rt)で取得し、食べログ自身の評価順をそのまま候補の並びに使う。
async function searchTabelogRanking({ query, area }) {
  const q = area ? `${query} ${area}` : query;
  const cacheKey = q.trim();
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.at < CACHE_TTL_MS) {
    return cached.candidates;
  }

  const params = new URLSearchParams({ sw: q, SrtT: "rt" });
  const res = await fetch(`${LIST_URL}?${params.toString()}`, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
      "Accept-Language": "ja,en-US;q=0.9,en;q=0.8",
      Referer: "https://tabelog.com/",
    },
  });
  if (!res.ok) {
    throw new Error(`Tabelog list fetch error: ${res.status}`);
  }
  const html = await res.text();
  const candidates = parseRankingList(html);
  cache.set(cacheKey, { at: Date.now(), candidates });
  return candidates;
}

function parseRankingList(html) {
  const $ = cheerio.load(html);
  const candidates = [];
  $(".list-rst").each((_, el) => {
    const $el = $(el);
    const url = $el.attr("data-detail-url");
    const name = $el.find(".list-rst__rst-name-target").first().text().trim();
    if (!url || !name) return;
    const ratingText = $el.find(".c-rating__val").first().text().trim();
    const areaGenre = $el.find(".list-rst__area-genre").first().text().trim();
    candidates.push({
      source: "tabelog",
      sourceLabel: "食べログ",
      name,
      url,
      snippet: areaGenre || null,
      tabelogRating: ratingText ? parseFloat(ratingText) : null,
      photo: null,
    });
  });
  return candidates;
}

module.exports = { searchTabelogRanking };
