const express = require("express");
const { fetchOgp } = require("../services/ogp");

const router = express.Router();

// 候補カードに画像が無い場合、フロントエンドが個別に呼び出してOGP画像を遅延取得する。
router.get("/ogp", async (req, res) => {
  const url = (req.query.url || "").trim();
  if (!url) {
    return res.status(400).json({ error: "urlが必要です" });
  }
  const ogp = await fetchOgp(url);
  if (!ogp) {
    return res.json({ image: null, title: null, description: null });
  }
  return res.json(ogp);
});

module.exports = router;
