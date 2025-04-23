const express = require("express");
const router = express.Router();
const format = require("string-format");
const db = require("../../config/DB_Connect");

router.get("/Product_Size", function (req, res, next) {
  const strSQL = `SELECT [SizeID],[Size_Name],[Data_Updater],[Data_Update] FROM [dbo].[Product_Size2] WITH (NOLOCK) ORDER BY SizeID`;

  db.sql(req.SiteDB, strSQL)
    .then((result) => {
      console.log("result", result.rowsAffected);
      res.send(result.recordset);
    })
    .catch((err) => {
      console.log("查詢錯誤", err);
      res.status(500).send({ error: "失敗" });
    });
});

module.exports = router;
