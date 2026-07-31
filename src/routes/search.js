const express = require("express");
const { searchPlaces } = require("../services/googlePlaces");
const { searchHotpepper } = require("../services/hotpepper");
const { searchTabelogRanking } = require("../services/tabelogScraper");

const router = express.Router();

const VALID_SOURCES = ["hotpepper", "tabelog", "google"];
const DEFAULT_PRIORITY = ["hotpepper", "tabelog", "google"];

function normalize(s) {
  return (s || "").replace(/\s+/g, "").toLowerCase();
}

function namesMatch(a, b) {
  const na = normalize(a);
  const nb = normalize(b);
  if (!na || !nb) return false;
  return na.includes(nb) || nb.includes(na);
}

// クライアント側でソースごとに「使わない/1番目/2番目/3番目」を選べるため、
// ここで受け取るpriorityは全ソースを含むとは限らない(意図的な絞り込みとして扱う)。
function parsePriority(raw) {
  if (!raw) return DEFAULT_PRIORITY;
  const parsed = [...new Set(
    raw
      .split(",")
      .map((s) => s.trim().toLowerCase())
      .filter((s) => VALID_SOURCES.includes(s))
  )];
  return parsed.length ? parsed : DEFAULT_PRIORITY;
}

function googleCandidate(place) {
  return {
    source: "google",
    sourceLabel: "Google",
    name: place.name,
    url: place.mapUrl,
    address: place.address,
    googleRating: place.rating,
    photo: null,
  };
}

// 各ソースの「この場所に該当する候補を1件探す」チェッカー。google以外はマッチしなければnullを返す。
const SOURCE_CHECKERS = {
  async hotpepper(place) {
    const hp = await searchHotpepper({ name: place.name, area: "" });
    if (!hp.configured) return null;
    const match = hp.candidates.find((c) => namesMatch(c.name, place.name));
    if (!match) return null;
    return { ...match, googleRating: place.rating, googleMapUrl: place.mapUrl };
  },
  async tabelog(place) {
    const candidates = await searchTabelogRanking({ query: place.name, area: "" });
    const match = candidates.find((c) => namesMatch(c.name, place.name));
    if (!match) return null;
    return { ...match, googleRating: place.rating, googleMapUrl: place.mapUrl };
  },
  async google(place) {
    return googleCandidate(place);
  },
};

// Googleを起点に候補を検索し(キーワード+エリア、または現在地)、各候補について
// priorityで指定された順にホットペッパー→食べログ→Googleを確認し、最初に見つかった情報を採用する
// (ただし食べログが1番目の場合は下記の通り食べログ自身の評価順リストを直接使う)。
router.get("/search", async (req, res) => {
  const genre = (req.query.genre || "").trim();
  const keyword = (req.query.keyword || "").trim();
  const area = (req.query.area || "").trim();
  const lat = req.query.lat !== undefined ? parseFloat(req.query.lat) : null;
  const lng = req.query.lng !== undefined ? parseFloat(req.query.lng) : null;
  const hasLocation = lat !== null && lng !== null && !Number.isNaN(lat) && !Number.isNaN(lng);
  const priority = parsePriority(req.query.priority);

  if (!genre && !keyword && !area && !hasLocation) {
    return res.status(400).json({ error: "ジャンル・キーワード・エリアのいずれか、または現在地情報が必要です" });
  }

  const query = [genre, keyword, area].filter(Boolean).join(" ") || "レストラン";
  const textQuery = [genre, keyword, area].filter(Boolean).join(" ");
  const warnings = [];

  // 食べログが1番目に選ばれていて、かつテキストのクエリがある場合は、
  // Google起点のクロスマッチではなく食べログ自身の評価順リストをそのまま候補として使う。
  // 取得に失敗した場合(食べログ側のBot検知など)はエラーで止めず、
  // 通常のGoogle起点フローにフォールバックする。
  if (priority[0] === "tabelog" && textQuery) {
    try {
      const candidates = await searchTabelogRanking({ query: textQuery });
      if (!candidates.length) {
        return res.json({
          candidates: [],
          warnings,
          message: "候補が見つかりませんでした。キーワードやエリアを変えて再検索してください。",
        });
      }
      return res.json({ candidates, warnings });
    } catch (err) {
      console.error(err);
      warnings.push("食べログの評価順リストを取得できなかったため、他のソースで検索しました");
    }
  }

  try {
    const { configured, places } = await searchPlaces(
      hasLocation ? { query, lat, lng } : { query }
    );

    if (!configured) {
      warnings.push("Googleが未設定のためスキップしました(GOOGLE_PLACES_KEYを.envに設定してください)");
      return res.json({ candidates: [], warnings, message: "Google検索が未設定です" });
    }

    if (!places.length) {
      return res.json({
        candidates: [],
        warnings,
        message: "候補が見つかりませんでした。キーワードやエリアを変えて再検索してください。",
      });
    }

    const resolved = await Promise.all(
      places.map(async (place) => {
        for (const source of priority) {
          try {
            const result = await SOURCE_CHECKERS[source](place);
            if (result) return result;
          } catch {
            // このソースの取得に失敗しても、次の優先順位のソースを試す
          }
        }
        // 選択されたどのソースにも該当しなかった場所は結果から除外する
        return null;
      })
    );
    const candidates = resolved.filter(Boolean);

    if (!candidates.length) {
      return res.json({
        candidates: [],
        warnings,
        message: "選択したソースに該当する候補が見つかりませんでした。ソースの選択やキーワードを変えて再検索してください。",
      });
    }

    return res.json({ candidates, warnings });
  } catch (err) {
    console.error(err);
    return res.status(502).json({ error: "検索中にエラーが発生しました。しばらくしてから再度お試しください。" });
  }
});

module.exports = router;
