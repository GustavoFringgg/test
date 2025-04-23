var express = require('express');
var router = express.Router();
var sql = require("mssql");
var config = require('../../config/DB_Setup');


router.get('/product', function (req, res, next) {
   var connection1 = new sql.ConnectionPool(config.Enterprise, function (err) {
      if (err)
         console.log(err);
      var request = new sql.Request(connection1);

      request.query(`SELECT TOP (500) 
      p.Product_No, 
      ISNULL(s.Style_No, N'') AS Style_No, 
      p.Date, 
      ISNULL(s.Brand, N'') AS Brand, 
      ISNULL(p.Name, N'') AS Product_Name, 
      ISNULL(s.Category, N'') AS Category, 
      ISNULL(s.Gender, N'') AS Gender, 
      ISNULL(s.Last_No, N'') + ISNULL(s.Outsole_No, N'') AS Last_And_Outsole, 
      s.Last_No, 
      s.Outsole_No, 
      ISNULL(p.Photo_Month, N'') AS Photo_Month, 
      ISNULL(s.Pattern_No, N'') AS Pattern_No, 
      ISNULL(p.Customer_Product_No, N'') AS Customer_Product_No, 
      p.Color,
      p.Sketch_Month,
      ISNULL(p.Structure_Maker, N'') AS Structure_Maker 
      
      FROM Product AS p WITH (NoWait , Nolock) 
      INNER JOIN 
      Style AS s WITH (NoWait , Nolock) 
      ON s.Style_No = p.Style_No 
      ORDER BY p.Date DESC`, function (err, result) {
         if (err)
            console.log(err);
         res.send(result.recordset);
      });
   });
});

router.post('/product',  function (req, res, next) {
   var connection1 = new sql.ConnectionPool(config.Enterprise, function (err) {
      if (err)
         console.log(err);
      var request = new sql.Request(connection1);
      req.body.Product_No == "" ? request.input('Product_No', sql.NVarChar(), '%%') : request.input('Product_No', sql.NVarChar(), '%' + req.body.Product_No + '%')
      req.body.Photo == "" ? request.input('Photo', sql.NVarChar(), '%%') : request.input('Photo', sql.NVarChar(), '%' + req.body.Photo + '%')
      req.body.Pattern_No == "" ? request.input('Pattern_No', sql.NVarChar(), '%%') : request.input('Pattern_No', sql.NVarChar(), '%' + req.body.Pattern_No + '%')
      req.body.date_start == "" ? request.input('date_start', sql.NVarChar(), '1900/1/1') : request.input('date_start', sql.NVarChar(), req.body.date_start)
      req.body.date_end == "" ? request.input('date_end', sql.NVarChar(), '3000/1/1') : request.input('date_end', sql.NVarChar(), req.body.date_end)
      req.body.Brand == "" ? request.input('Brand', sql.NVarChar(), '%%') : request.input('Brand', sql.NVarChar(), '%' + req.body.Brand + '%')
      req.body.Product_Name == "" ? request.input('Product_Name', sql.NVarChar(), '%%') : request.input('Product_Name', sql.NVarChar(), '%' + req.body.Product_Name + '%')
      req.body.Gender == "" ? request.input('Gender', sql.NVarChar(), '%%') : request.input('Gender', sql.NVarChar(), '%' + req.body.Gender + '%')
      req.body.Category == "" ? request.input('Category', sql.NVarChar(), '%%') : request.input('Category', sql.NVarChar(), '%' + req.body.Category + '%')
      req.body.Last_And_Outsole == "" ? request.input('Last_And_Outsole', sql.NVarChar(), '%%') : request.input('Last_And_Outsole', sql.NVarChar(), '%' + req.body.Last_And_Outsole + '%')
      req.body.Customer_Product_No == "" ? request.input('Customer_Product_No', sql.NVarChar(), '%%') : request.input('Customer_Product_No', sql.NVarChar(), '%' + req.body.Customer_Product_No + '%')

      console.log(request)

      request.query(`SELECT TOP (500) p.Product_No, 
      ISNULL(s.Style_No, N'') AS Style_No, 
      p.Date, 
      ISNULL(s.Brand, N'') AS Brand, 
      ISNULL(p.Name, N'') AS Product_Name, 
      ISNULL(s.Category, N'') AS Category, 
      ISNULL(s.Gender, N'') AS Gender, 
      ISNULL(s.Last_No, N'') + ISNULL(s.Outsole_No, N'') AS Last_And_Outsole, 
      s.Last_No, 
      s.Outsole_No, 
      ISNULL(p.Photo_Month, N'') AS Photo_Month, 
      ISNULL(s.Pattern_No, N'') AS Pattern_No, 
      ISNULL(p.Customer_Product_No, N'') AS Customer_Product_No, 
      p.Color,
      p.Sketch_Month,
      ISNULL(p.Structure_Maker, N'') AS Structure_Maker  

      FROM Product AS p WITH (NoWait , Nolock) 
      INNER JOIN 
      Style AS s WITH (NoWait , Nolock) 
      ON s.Style_No = p.Style_No 
      
      WHERE (p.Date >= @date_start) 
      AND (p.Date <= @date_end) 
      AND (p.Product_No LIKE @Product_No ) 
      AND (ISNULL(s.Category, N'') LIKE @Category ) 
      AND (ISNULL(s.Gender, N'') LIKE @Gender ) 
      AND (ISNULL(s.Brand, N'') LIKE @Brand ) 
      AND (ISNULL(p.Photo_Month, N'') LIKE @Photo ) 
      AND (ISNULL(s.Pattern_No, N'') LIKE @Pattern_No ) 
      AND (ISNULL(p.Customer_Product_No, N'') LIKE @Customer_Product_No) 
      AND (ISNULL(s.Last_No, N'') + ISNULL(s.Outsole_No, N'') LIKE @Last_And_Outsole ) 
      AND (ISNULL(p.Name, N'') LIKE @Product_Name ) 
      ORDER BY p.Date DESC`, function (err, result) {
         if (err)
            console.log(err);
         res.send(result.recordset);
      });
   });
});




module.exports = router;