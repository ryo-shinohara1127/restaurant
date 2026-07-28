require("dotenv").config();
const path = require("path");
const express = require("express");

const searchRouter = require("./src/routes/search");
const ogpRouter = require("./src/routes/ogp");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname, "public")));
app.use("/api", searchRouter);
app.use("/api", ogpRouter);

app.listen(PORT, () => {
  console.log(`restaurant-url-finder listening on http://localhost:${PORT}`);
});
