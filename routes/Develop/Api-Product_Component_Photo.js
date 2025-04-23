var express = require('express');
var router = express.Router();
var db = require('../../config/DB_Connect');
var WebServer = require('../../config/WebServer');
const format = require('string-format');
var formidable = require('formidable');
var smb2 = require('../../config/smb2');
const sharp = require('sharp');
var moment = require('moment');


//取得 Product Component
router.get('/Product_Component', function (req, res, next) {
  console.log("Call Product_Component API ==> Load_Component_Data")
  var strSQL = format(`SELECT ComponentID
   , Component
   FROM  Product_Component 
   ORDER BY ComponentID `);

  db.sql(req.Enterprise, strSQL)
    .then((result) => {
      res.send(result.recordset);
    }).catch((err) => {
      console.log(err);
      res.status(500).send(err);
    })

});

//取得 Style Brand
router.get('/Brand', function (req, res, next) {
  console.log("Call Brand API ==> Load_Brand_Data")
  var strSQL = format(`SELECT Brand, BrandID
   FROM  Brand 
   ORDER BY BrandID `);

  db.sql(req.Enterprise, strSQL)
    .then((result) => {
      res.send(result.recordset);
    }).catch((err) => {
      console.log(err);
      res.status(500).send(err);
    })

});

//取得 Product Component List
router.post('/', function (req, res, next) {
  console.log("Call Product Component Photo API ==> Load_Data")
  req.body['WebServer'] = WebServer.url;
  req.body['Component'] = req.body['Component'].replace(/'/g, "''");
  req.body['Brand'] = req.body['Brand'].replace(/'/g, "''");
  req.body['Memo'] = req.body['Memo'].replace(/'/g, "''");
  req.body.UserID = req.UserID;
  var strSQL = format(`SELECT top 1000 Component_PhotoID
   , Brand
   , Component
   , Photo_Month
   , '{WebServer}/datas/Images/System/Blank.png' AS Photo_error
   , ISNULL('{WebServer}/datas/Images/Products/Components/' + Photo_Month + '/Thumb/' + CONVERT(varchar(50), Component_PhotoID) + '.jpg?tmp=' + convert(varchar(20), getDate(),120) , '{WebServer}/datas/Images/System/Blank.png') AS Photo_Thumb
   , ISNULL('{WebServer}/datas/Images/Products/Components/' + Photo_Month + '/' + CONVERT(varchar(50), Component_PhotoID) + '.jpg?tmp=' + convert(varchar(20), getDate(),120), '{WebServer}/datas/Images/System/Blank.png') AS Photo
   , ISNULL('{WebServer}/datas/Images/Products/Components/' + Photo_Month + '/Large/' + CONVERT(varchar(50), Component_PhotoID) + '.jpg?tmp=' + convert(varchar(20), getDate(),120), '{WebServer}/datas/Images/System/Blank.png') AS Photo_Large
   , Color
   , ISNULL(Memo, '') AS Memo
   , Photo_Uploader
--   , ISNULL(Photo_Upload, CONVERT(DATETIME, '1991-01-01 00:00:00', 111)) AS Photo_Upload
   , CONVERT(varchar(20),ISNULL(Photo_Upload, '1991-01-01 00:00:00'), 120) AS Photo_Upload
   , Component_PhotoID AS SortID
--   , cast((case when (Photo_Uploader = '{UserID}' or isnull(Photo_Uploader,'') = '') then 1 else 0 end) as bit) as EdtFlag   
   , cast(1 as bit) as EdtFlag   
   , cast((case when (Photo_Uploader = '{UserID}' or isnull(Photo_Uploader,'') = '') and (Select count(Component_PhotoID) From Product_Process ps with(NoLock, NoWait) Where ps.Component_PhotoID = p.Component_PhotoID) = 0 and (Select count(Component_PhotoID) From Product_Structure ps with(NoLock, NoWait) Where ps.Component_PhotoID = p.Component_PhotoID) = 0 then 1 else 0 end) as bit) as DelFlag   
   FROM  Product_Component_Photo p with(NoLock, NoWait)
   WHERE (cast(Component_PhotoID as varchar) LIKE '%{Component_PhotoID}%') 
   And (Component LIKE '%{Component}%') 
   AND (Brand LIKE '%{Brand}%')  
   AND (ISNULL(Memo, '') LIKE '%{Memo}%')
   ORDER BY SortID DESC`, req.body);
  //console.log(strSQL)

  db.sql(req.Enterprise, strSQL)
    .then((result) => {
      res.send(result.recordset);
    }).catch((err) => {
      console.log(err);
      res.status(500).send(err);
    })

});

//儲存Product component 資料與圖檔
router.post('/SaveData', function (req, res, next) {
  console.log("Call Component Photo SaveData API")
  var form = new formidable.IncomingForm();
  var File = [];
  var Fields = {};
  //var path = "Z:\\Images\\Products\\Components";
  form.parse(req);
  form.on('field', function (name, value) {
    Fields = JSON.parse(value);
    Fields.Photo_Month = Fields.Photo_Month === null ? moment().format('YYMM') : Fields.Photo_Month;
    Fields['Component'] = Fields['Component'].replace(/'/g, "''");
    Fields['Brand'] = Fields['Brand'].replace(/'/g, "''");
    Fields['Memo'] = Fields['Memo'].replace(/'/g, "''");
    Fields['UserID'] = req.UserID;
    Fields['WebServer'] = WebServer.url;
  });

  form.on('file', function (name, file) {
    File.push(file.path);
  });

  form.on('end', function () {
    var file = format(`{0}.jpg`, Fields.Component_PhotoID);
    var comp_path = `Images\\Products\\Components`;
    var path = format("{0}\\{1}", comp_path, Fields.Photo_Month);
    var strSQL = Fields.Component_PhotoID.length === 0 ?
    format(`Insert Product_Component_Photo (Component, Brand, Memo, Photo_Uploader, Photo_Upload)
    Select N'{Component}' as Component, N'{Brand}' as Brand, N'{Memo}' as Memo, '{UserID}' as Photo_Uploader, GetDate() as Photo_Upload;` , Fields) :
    format(`Update Product_Component_Photo set Component = N'{Component}', Brand = N'{Brand}', Memo = N'{Memo}', Photo_Month = '{Photo_Month}', Photo_Uploader = '{UserID}', Photo_Upload = getdate()
    Where Component_PhotoID = {Component_PhotoID};
    --And (Photo_Uploader = '{UserID}' or isnull(Photo_Uploader,'') = ''); `, Fields);
    
    strSQL += format(`
    SELECT top 1000 Component_PhotoID, Brand, Component, Photo_Month
    , '{WebServer}/datas/Images/System/Blank.png' AS Photo_error
    , ISNULL('{WebServer}/datas/Images/Products/Components/' + Photo_Month + '/Thumb/' + CONVERT(varchar(50), Component_PhotoID) + '.jpg?tmp=' + convert(varchar(20), getDate(),120) , '{WebServer}/datas/Images/System/Blank.png') AS Photo_Thumb
    , ISNULL('{WebServer}/datas/Images/Products/Components/' + Photo_Month + '/' + CONVERT(varchar(50), Component_PhotoID) + '.jpg?tmp=' + convert(varchar(20), getDate(),120), '{WebServer}/datas/Images/System/Blank.png') AS Photo
    , ISNULL('{WebServer}/datas/Images/Products/Components/' + Photo_Month + '/Large/' + CONVERT(varchar(50), Component_PhotoID) + '.jpg?tmp=' + convert(varchar(20), getDate(),120), '{WebServer}/datas/Images/System/Blank.png') AS Photo_Large
    , Color, ISNULL(Memo, '') AS Memo, Photo_Uploader
    , CONVERT(varchar(20),ISNULL(Photo_Upload, '1991-01-01 00:00:00'), 120) AS Photo_Upload
    , Component_PhotoID AS SortID, cast(1 as bit) as EdtFlag   
    , cast((case when (Photo_Uploader = '{UserID}' or isnull(Photo_Uploader,'') = '') and (Select count(Component_PhotoID) From Product_Process ps with(NoLock, NoWait) Where ps.Component_PhotoID = p.Component_PhotoID) = 0 and (Select count(Component_PhotoID) From Product_Structure ps with(NoLock, NoWait) Where ps.Component_PhotoID = p.Component_PhotoID) = 0 then 1 else 0 end) as bit) as DelFlag   
    FROM Product_Component_Photo p with(NoLock, NoWait)
    ORDER BY SortID DESC;`, Fields)

    // console.log(strSQL);
    db.sql(req.Enterprise, strSQL)
      .then((result) => {
        smb2.exists(`${comp_path}`, function (err, exists) { // 執行檢查資料夾及建立檔案
          if (err) {
            console.log(err)
            smb2.disconnect();
            res.status(503).send('Service Unavailable!')
          } else {
            const Smb2Practice = async () => {
              try {
                if (File.length > 0) {
                  console.log(format('Save photo to Server:{0}', path));
                  await MKDir(path);
                  await MKDir(`${path}\\Large`);
                  await MKDir(`${path}\\Thumb`);
                  await imgWriteFile(1500, File[0], `${path}\\Large\\${file}`);
                  await imgWriteFile(320, File[0], `${path}\\${file}`);
                  await imgWriteFile(120, File[0], `${path}\\Thumb\\${file}`);
                  await res.send({
                    flag: "success",
                    items: result.recordset
                  });
                } else {
                  res.send({
                    flag: "success",
                    items: result.recordset
                  });
                }
              } catch (error) {
                console.log(error)
                res.status(503).send('Service Unavailable!');
              }
            }
            Smb2Practice()
          }
        });
      }).catch((err) => {
        console.log(err);
        res.status(500).send(err);
      })

    function MKDir(path) {
      return new Promise((resolve, reject) => {
        smb2.exists(path, function (err, exists) {
          if (err) reject(err);
          if (!exists) {
            smb2.mkdir(path, (err) => {
              if (err) {
                console.log(`${path}:無法建立`);
                reject(err);
              } else {
                console.log(`${path}:已建立`);
                resolve('success');
              }
            });
          } else {
            console.log(`${path}:已存在`);
            resolve(`${path}:已存在`);
          }
        });
      });
    }

    function imgWriteFile(size, src, dest) {
      return new Promise(function (resolve, reject) {
        sharp(src).resize(size, size, {
          fit: sharp.fit.inside,
          withoutEnlargement: true // 若原圖尺寸沒超過設定的大小，則不壓縮
        }).jpeg({
          quality: 85
        }).toBuffer().then(mBuffer => {
          smb2.writeFile(dest, mBuffer, {
            flags: 'w'
          }, function (err) {
            if (err) {
              reject(err);
            } else {
              console.log(format("{0} 儲存成功", dest));
              resolve(format("{0} 儲存成功", dest));
            }
          });
        });
      })
    }
  });
});


//更新Product_Process Component_PhotoID 與 Memo 欄位
router.post('/AddComp', function (req, res, next) {
  console.log("Call Product Component Photo API ==> AddComp");
  req.body['Memo'] = req.body['Memo'].replace(/'/g, "''");
  req.body.UserID = req.UserID;
  var strSQL = format(`Update Product_Process set Component_PhotoID={Component_PhotoID}
  , Memo = case when len(isnull(cast(Memo as nvarchar(max)),'')) = 0 then N'{Memo}' else Memo end
  , Data_Updater = '{UserID}'
  , Data_Update = GetDate() 
   Where Product_ProcessID = {Product_ProcessID}
   `, req.body);

  db.sql(req.Enterprise, strSQL)
    .then((result) => {
      res.send('success');
    }).catch((err) => {
      console.log(err);
      res.status(500).send(err);
    })
});

//刪除Product_Component_Photo 
router.delete('/:Component_PhotoID', function (req, res, next) {
  console.log("Call Product Component Photo API ==> DeleteData")
  req.params.UserID = req.UserID
  var strSQL = format(`delete from Product_Component_Photo  
  Where Component_PhotoID = {Component_PhotoID} 
  And (Photo_Uploader = '{UserID}' or isnull(Photo_Uploader,'') = '') 
  And (Select count(Component_PhotoID) From Product_Process ps with(NoLock, NoWait) Where ps.Component_PhotoID = {Component_PhotoID}) = 0 
  And (Select count(Component_PhotoID) From Product_Structure ps with(NoLock, NoWait) Where ps.Component_PhotoID = {Component_PhotoID}) = 0  
  `, req.params);

  //console.log(strSQL)

  db.sql(req.Enterprise, strSQL)
    .then((result) => {
      res.send('success');
    }).catch((err) => {
      console.log(err);
      res.status(500).send(err);
    })

});

module.exports = router;