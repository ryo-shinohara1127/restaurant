const express = require("express");
const { shortenUrl } = require("../services/urlShortener");

const router = express.Router();

router.get("/shorten", async (req, res) => {
  const url = (req.query.url || "").trim();
  if (!url) {
    return res.status(400).json({ error: "urlが必要です" });
  }
  try {
    const shortUrl = await shortenUrl(url);
    return res.json({ shortUrl });
  } catch (err) {
    console.error(err);
    return res.status(502).json({ error: "短縮に失敗しました" });
  }
});

module.exports = router;
