const express = require("express");
const app = express();
const handler = require("./handler");

app.get("/api/org", handler);

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
