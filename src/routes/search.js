const express = require("express");
const { searchPlaces } = require("../services/googlePlaces");
const { searchHotpepper } = require("../services/hotpepper");

const router = express.Router();

function normalize(s) {
  return (s || "").replace(/\s+/g, "").toLowerCase();
}

function namesMatch(a, b) {
  const na = normalize(a);
  const nb = normalize(b);
  if (!na || !nb) return false;
  return na.includes(nb) || nb.includes(na);
}

// Googleを起点に候補を検索し(キーワード+エリア、または現在地)、各候補について
// ホットペッパーに同名店舗があればホットペッパー側の情報(画像・予算・ジャンル)を優先表示する。
router.get("/search", async (req, res) => {
  const keyword = (req.query.keyword || "").trim();
  const area = (req.query.area || "").trim();
  const lat = req.query.lat !== undefined ? parseFloat(req.query.lat) : null;
  const lng = req.query.lng !== undefined ? parseFloat(req.query.lng) : null;
  const hasLocation = lat !== null && lng !== null && !Number.isNaN(lat) && !Number.isNaN(lng);

  if (!keyword && !area && !hasLocation) {
    return res.status(400).json({ error: "キーワード・エリアのいずれか、または現在地情報が必要です" });
  }

  const query = [keyword, area].filter(Boolean).join(" ") || "レストラン";
  const warnings = [];

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

    const candidates = await Promise.all(
      places.map(async (place) => {
        try {
          const hp = await searchHotpepper({ name: place.name, area: "" });
          if (hp.configured) {
            const match = hp.candidates.find((c) => namesMatch(c.name, place.name));
            if (match) {
              return { ...match, googleRating: place.rating, googleMapUrl: place.mapUrl };
            }
          }
        } catch {
          // ホットペッパー突合に失敗しても、Google側の情報だけで候補化を続ける
        }
        return {
          source: "google",
          sourceLabel: "Google",
          name: place.name,
          url: place.mapUrl,
          address: place.address,
          googleRating: place.rating,
          photo: null,
        };
      })
    );

    return res.json({ candidates, warnings });
  } catch (err) {
    console.error(err);
    return res.status(502).json({ error: "検索中にエラーが発生しました。しばらくしてから再度お試しください。" });
  }
});

module.exports = router;
