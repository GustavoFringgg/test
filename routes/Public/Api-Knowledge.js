var express = require('express');
var router = express.Router();
const format = require('string-format');
var db = require('../../config/DB_Connect');
var smb2 = require('../../config/smb2');
var WebServer = require('../../config/WebServer');
var multer = require('multer');

function checkFolder(Doc_Month, KnowledgeID, Knowledge_DetailID, next) {
  smb2.exists(`Knowledge`, function (err, exists) {
    if (err) {
      console.log(err)
      smb2.disconnect();
      return res.status(503).send('Service Unavailable!');
    } else {
      smb2.exists(`Knowledge\\${Doc_Month}`, function (err, exists) {
        if (!exists) {
          smb2.mkdir(`Knowledge\\${Doc_Month}`, (err) => {
            if (err) {
              console.log(`無法建立: Knowledge\\${Doc_Month}`);
              return res.status(503).send('Service Unavailable!');
            } else {
              console.log(`已建立: Knowledge\\${Doc_Month}`);
              smb2.mkdir(`Knowledge\\${Doc_Month}\\${KnowledgeID}`, (err) => {
                if (err) {
                  console.log(`無法建立: Knowledge\\${Doc_Month}\\${KnowledgeID}`);
                  return res.status(503).send('Service Unavailable!');
                } else {
                  console.log(`已建立: Knowledge\\${Doc_Month}\\${KnowledgeID}`);
                  if (Knowledge_DetailID !== null) {
                    next()
                  } else {
                    smb2.mkdir(`Knowledge\\${Doc_Month}\\${KnowledgeID}\\${Knowledge_DetailID}`, (err) => {
                      if (err) {
                        console.log(`無法建立: Knowledge\\${Doc_Month}\\${KnowledgeID}\\${Knowledge_DetailID}`)
                        return res.status(503).send('Service Unavailable!');
                      } else {
                        console.log(`已建立: Knowledge\\${Doc_Month}\\${KnowledgeID}\\${Knowledge_DetailID}`)
                        next()             
                      }
                    })
                  }
                }
              });
            }
          });
        } else {
          smb2.exists(`Knowledge\\${Doc_Month}\\${KnowledgeID}`, function (err, exists) {
            if (!exists) {
              smb2.mkdir(`Knowledge\\${Doc_Month}\\${KnowledgeID}`, (err) => {
                if (err) {
                  console.log(`無法建立: Knowledge\\${Doc_Month}\\${KnowledgeID}`);
                  return res.status(503).send('Service Unavailable!');
                } else {
                  console.log(`已建立: Knowledge\\${Doc_Month}\\${KnowledgeID}`);
                  next();
                }
              });
            } else {
              if (Knowledge_DetailID !== null) {
                smb2.exists(`Knowledge\\${Doc_Month}\\${KnowledgeID}\\${Knowledge_DetailID}`,(err, exists) => {
                  if (!exists) {
                    smb2.mkdir(`Knowledge\\${Doc_Month}\\${KnowledgeID}\\${Knowledge_DetailID}`, (err) => {
                      if (err) {
                        console.log(`無法建立: Knowledge\\${Doc_Month}\\${KnowledgeID}\\${Knowledge_DetailID}`);
                        return res.status(503).send('Service Unavailable!');
                      } else {
                        console.log(`已建立: Knowledge\\${Doc_Month}\\${KnowledgeID}\\${Knowledge_DetailID}`);
                        next();
                      }
                    });
                  } else {
                    console.log(`已建立: Knowledge\\${Doc_Month}\\${KnowledgeID}`);
                    next();
                  }
                })
              } else {
                next();
              }
            }
          })
        }
      })
    }
  })
}

var storage = multer.memoryStorage({
  filename: function (req, file, cb) {
    cb(null, file.originalname)
  }
})
var upload = multer({
  storage: storage
})

/* Mark-Wang API Begin */

/* Mark-Wang API End */


/* Darren-Chang API Begin */

// Get Knowledge PlayList Data via KnowledgeID
router.get('/PlayList/:KnowledgeID', function (req, res, next) {
  console.log("Call PlayList Api, KnowledgeID:", req.params.KnowledgeID);
  // req.body.UserID = req.UserID
  // console.log(req.UserID)
  req.body.KnowledgeID = req.params.KnowledgeID

  let strSQL = format(`
  SELECT 
    KnowledgeID, 
    Title, 
    Knowledge_Author, 
    '${WebServer.url}' + '/Datas/Knowledge/Author_Photo/' + Knowledge_Author + '.png' as Author_Photo
  FROM [Knowledge] WHERE KnowledgeID = {KnowledgeID}

  SELECT 
    kd.Knowledge_DetailID, 
    k.KnowledgeID, 
    kd.Title as Title, 
    Tags, HTML_Draft, 
    Convert(varchar(20), kd.Data_Update, 120) as Data_Update, 
    Convert(varchar(20), kd.Publication_Date, 120) as Publication_Date, 
    kdp.Description as Version_Description, 
    '${WebServer.url}' +  isnull('/Datas/Knowledge/' + k.Doc_Month + '/' + CONVERT(varchar(3), k.KnowledgeID) + '/' + Image_Source + '?tmp=' + convert(varchar(20), getDate(),120), '/datas/Images/System/Blank.png') AS poster, 
    '${WebServer.url}' + '/Datas/Knowledge/' + k.Doc_Month + '/' + CONVERT(varchar(3), k.KnowledgeID) + '/' + kd.Video_Source + '?tmp=' + convert(varchar(20), getDate(),120) AS Video_Source, 
    kd.Video_Type, 
    kd.SortID, 
    Image_Always_On, 
    isnull(kd.Description, '') AS Description, 
    ks.Knowledge_SubDetailID, 
    ks.Subtitle, 
    '${WebServer.url}' + '/Datas/Knowledge/' + k.Doc_Month + '/' + CONVERT(varchar(3), k.KnowledgeID) + '/' + CONVERT(varchar(3), kd.Knowledge_DetailID) + '/' + ks.Video_Source + '?tmp=' + convert(varchar(20), getDate(),120) AS Sub_Video_Source, 
    ks.Video_Type as Sub_Video_Type, 
    ks.SortID as Sub_SortID, 
    ks.Description as Sub_Description,
    ks.Data_Updater as Sub_Data_Updater,
    Convert(varchar(20), ks.Data_Update, 120) as Sub_Data_Update,
    Convert(varchar(20), ks.Publication_Date, 120) as Detail_Publication_Date,
    ksdp.Knowledge_SubDetail_PublicationID as Sub_Knowledge_SubDetail_PublicationID,
    ksdp.Description as Sub_Version_Description,
    ksdp.Publisher as Sub_Publisher,
    Convert(varchar(20), ksdp.Publication_Date, 120) as Sub_Publication_Date
  FROM Knowledge as k
  LEFT JOIN Knowledge_Detail as kd ON kd.KnowledgeID = k.KnowledgeID
  LEFT JOIN Knowledge_Detail_Publication as kdp ON kdp.Knowledge_DetailID = kd.Knowledge_DetailID AND kdp.Publication_Date = kd.Publication_Date
  LEFT JOIN [ENTERPRISE].[dbo].[Knowledge_SubDetail] as ks ON ks.Knowledge_DetailID = kd.Knowledge_DetailID
  LEFT JOIN Knowledge_SubDetail_Publication as ksdp ON ksdp.Knowledge_SubDetailID = ks.Knowledge_SubDetailID
  WHERE k.KnowledgeID = {KnowledgeID}
  ORDER BY kd.SortID, ks.SortID, ksdp.Publication_Date DESC; \r\n`, req.body);
  // console.log(strSQL)
  db.sql(req.Enterprise, strSQL)
    .then((result) => {
      let DataSet = {
        Title: result.recordsets[0][0].Title,
        Author_Photo: result.recordsets[0][0].Author_Photo,
        Knowledge_Author: result.recordsets[0][0].Knowledge_Author,
        List: result.recordsets[1],
      }
      // 整理成巢狀結構
      DataSet.List = Object.values(
        DataSet.List.reduce((acc, curr) => {
          if (!acc[curr.Knowledge_DetailID]) {
            acc[curr.Knowledge_DetailID] = {
              Data_Update: curr.Data_Update,
              Description: curr.Description,
              HTML_Draft: curr.HTML_Draft,
              Image_Always_On: curr.Image_Always_On,
              KnowledgeID: curr.KnowledgeID,
              Knowledge_DetailID: curr.Knowledge_DetailID,
              Publication_Date: curr.Publication_Date,
              SortID: curr.SortID,
              Tags: curr.Tags,
              Title: curr.Title,
              Version_Description: curr.Version_Description,
              poster: curr.poster,
              source: {
                src: curr.Video_Source,
                type:curr.Video_Type
              },
              subDetails: [],
            }
          }
          
          if (
            curr.Knowledge_SubDetailID &&
            !acc[curr.Knowledge_DetailID].subDetails.some(e => e.Knowledge_SubDetailID === curr.Knowledge_SubDetailID)
          ) {
            acc[curr.Knowledge_DetailID].subDetails.push({
              Knowledge_DetailID: curr.Knowledge_DetailID,
              Knowledge_SubDetailID: curr.Knowledge_SubDetailID,
              Subtitle: curr.Subtitle,
              Description: curr.Sub_Description,
              SortID: curr.Sub_SortID,
              Data_Update: curr.Sub_Data_Update,
              Data_Updater: curr.Sub_Data_Updater,
              Publication_Date: curr.Detail_Publication_Date,
              Sub_Version_Description: curr.Sub_Version_Description,
              Publications: [],
              source: {
                src: curr.Sub_Video_Source,
                type:curr.Sub_Video_Type
              }
            })
          }
          const _datas = acc[curr.Knowledge_DetailID].subDetails

          for (let data of _datas) {
            if (
              data.Knowledge_DetailID === curr.Knowledge_DetailID &&
              data.Knowledge_SubDetailID === curr.Knowledge_SubDetailID &&
              curr.Sub_Knowledge_SubDetail_PublicationID !== null &&
              !data.Publications.some(e => e.Knowledge_SubDetail_PublicationID === curr.Sub_Knowledge_SubDetail_PublicationID)
            ) {
              data.Publications.push({
                Knowledge_SubDetail_PublicationID: curr.Sub_Knowledge_SubDetail_PublicationID,
                Knowledge_SubDetailID: curr.Knowledge_SubDetailID,
                Description: curr.Sub_Version_Description,
                Publisher: curr.Sub_Publisher,
                Publication_Date: curr.Sub_Publication_Date
              })
            }
          }
          return acc
        }, {})
      )
      DataSet.List.sort((a, b) => {
        return a.SortID - b.SortID
      })
      res.send(DataSet);
    }).catch((err) => {
      console.log(err);
      res.status(500).send(err);
    })
});

// Get Knowledge TutorList Data via ProgramID or KnowledgeID
router.post('/TutorList/', function (req, res, next) {
  console.log("Call TutorList Api:", req.body);

  let strSQL = format(`
  SELECT kd.Knowledge_DetailID, k.KnowledgeID, kd.Title as title
  FROM Knowledge as k
  LEFT JOIN Knowledge_Detail as kd ON k.KnowledgeID = kd.KnowledgeID
  ${req.body.ProgramID ? `
  LEFT JOIN Program as p ON p.KnowledgeID = kd.KnowledgeID
  WHERE p.ProgramID = {ProgramID} AND (p.Knowledge_DetailID is NULL or p.Knowledge_DetailID = kd.Knowledge_DetailID)`: ''}
  ${req.body.KnowledgeID ? `
  WHERE kd.KnowledgeID = {KnowledgeID}`: ''}
  AND kd.Publication_Date is not NULL
  ORDER BY kd.SortID;
  `, req.body);

  // console.log(strSQL)
  db.sql(req.Enterprise, strSQL)
    .then((result) => {
      // console.log(result.recordset)
      res.send(result.recordset);
    }).catch((err) => {
      console.log(err);
      res.status(500).send(err);
    })
});

// Get Knowledge Tutor Data via Knowledge_DetailID
router.get('/Tutor/:Knowledge_DetailID', function (req, res, next) {
  console.log("Call Tutor Api, Knowledge_DetailID:", req.params.Knowledge_DetailID);

  let strSQL = format(`
  SELECT Knowledge_DetailID, k.KnowledgeID, k.Title as kTitle, kd.Title as kdTitle, Tags,
  Convert(varchar(10), kd.Publication_Date, 120) as Publication_Date,
  '${WebServer.url}' + '/Datas/Knowledge/' + k.Doc_Month + '/' + CONVERT(varchar(3), k.KnowledgeID) + '/' + Video_Source + '?tmp=' + convert(varchar(20), getDate(),120) AS Video_Source, 
  Video_Type, SortID, isnull(kd.Description, '') AS Description FROM Knowledge as k
  LEFT JOIN Knowledge_Detail as kd ON k.KnowledgeID = kd.KnowledgeID
  WHERE kd.Knowledge_DetailID = {Knowledge_DetailID}
  `, req.params);

  // console.log(strSQL)
  db.sql(req.Enterprise, strSQL)
    .then((result) => {
      // console.log(result.recordset)
      res.send(result.recordset[0]);
    }).catch((err) => {
      console.log(err);
      res.status(500).send(err);
    })
});

// 上傳影片檔案
router.post('/Video_Add/:Title', upload.single('filepond'), function (req, res, next) {
  console.log("Call Video_Add Api Title:", req.params.Title);
  // console.log(req.file)
  // req.params.UserID = req.UserID

  var strSQL = format(`SELECT KnowledgeID, Doc_Month FROM Knowledge WHERE Title = '{Title}';`, req.params);
  // console.log(strSQL)

  db.sql(req.Enterprise, strSQL)
    .then((result) => {
      res.locals.smbDir = `Knowledge\\${result.recordset[0].Doc_Month}\\${result.recordset[0].KnowledgeID}`
      res.locals.Doc_Month = result.recordset[0].Doc_Month
      res.locals.KnowledgeID = result.recordset[0].KnowledgeID
      next();
    }).catch((err) => {
      console.log(err);
      res.status(500).send(err);
    })

}, function (req, res, next) {

  let Doc_Month = res.locals.Doc_Month
  let KnowledgeID = res.locals.KnowledgeID
  // 確認資料夾是否存在 (影片嵌入 Knowledge_Detail， Knowledge_DetailID 代入 null)
  checkFolder(Doc_Month, KnowledgeID, null, next)

}, function (req, res, next) {
  res.locals.Title = req.file.originalname.replace(/'/g, "''")
  res.locals.mimetype = req.file.mimetype

  var strSQL = format(`INSERT INTO Knowledge_Detail (KnowledgeID, Title, Video_Type, SortID, Image_Always_On)
  VALUES ({KnowledgeID}, '{Title}', '{mimetype}', (Select isnull(Max(SortID),0) + 1 From Knowledge_Detail Where KnowledgeID = {KnowledgeID}), 0)

  UPDATE Knowledge_Detail SET Video_Source = CONVERT(varchar, (SELECT SCOPE_IDENTITY())) + '.mp4'
  WHERE Knowledge_DetailID = (SELECT SCOPE_IDENTITY())

  SELECT SCOPE_IDENTITY() AS Knowledge_DetailID;`, res.locals);
  // console.log(strSQL)

  db.sql(req.Enterprise, strSQL)
    .then((result) => {
      res.locals.Knowledge_DetailID = result.recordset[0].Knowledge_DetailID
      next();
    }).catch((err) => {
      console.log(err);
      res.status(500).send(err);
    })

}, function (req, res, next) {
  var smbDir = res.locals.smbDir
  var Knowledge_DetailID = res.locals.Knowledge_DetailID
  var data = req.file.buffer;
  smb2.exists(`${smbDir}`, function (err, exists) {
    if (err) {
      console.log(err)
      smb2.disconnect();
      res.status(503).send('Service Unavailable!');
      return;
    } else {
      smb2.writeFile(`${smbDir}\\${Knowledge_DetailID}.mp4`, data, {
        flags: 'w'
      }, function (err) {
        if (err) {
          console.log(`${Knowledge_DetailID}.mp4 writeFile Error!`);
          console.log(err);
          smb2.disconnect();
          return res.status(503).send('Service Unavailable!');
        } else {
          console.log(`${smbDir}\\${Knowledge_DetailID}.mp4 儲存成功`);
          res.send('upload ok');
        }
      });
    }
  })
});


// 編輯影片檔案
router.post('/Video_Edit/:Knowledge_DetailID', upload.single('filepond'), function (req, res, next) {
  console.log("Call Video_Edit Api, Knowledge_DetailID:", req.params.Knowledge_DetailID);
  // console.log(req.file)

  req.params.Title = req.file.originalname.replace(/'/g, "''")
  // req.params.UserID = req.UserID

  var strSQL = format(`
    SELECT kd.KnowledgeID, Doc_Month FROM Knowledge as k
    LEFT JOIN Knowledge_Detail as kd ON k.KnowledgeID = kd.KnowledgeID
    WHERE Knowledge_DetailID = {Knowledge_DetailID};
  `, req.params);
  // console.log(strSQL)

  db.sql(req.Enterprise, strSQL)
    .then((result) => {
      res.locals.smbDir = `Knowledge\\${result.recordset[0].Doc_Month}\\${result.recordset[0].KnowledgeID}`
      next();
    }).catch((err) => {
      console.log(err);
      res.status(500).send(err);
    })

}, function (req, res, next) {
  var smbDir = res.locals.smbDir
  var data = req.file.buffer;
  var Knowledge_DetailID = req.params.Knowledge_DetailID
  var strSQL = format(`
    BEGIN TRANSACTION
    BEGIN TRY
      UPDATE Knowledge_Detail SET 
        Video_Source = '{Knowledge_DetailID}.mp4', 
        Data_Updater = N'${req.UserID}', 
        Data_Update = GetDate()
      WHERE 
        Knowledge_DetailID = {Knowledge_DetailID};

      UPDATE K SET 
        K.UserID = ISNULL(K.UserID, N'${req.UserID}')
      FROM [ENTERPRISE].[dbo].[Knowledge] K
      WHERE K.KnowledgeID IN (
        SELECT KD.KnowledgeID 
        FROM [ENTERPRISE].[dbo].[Knowledge_Detail] KD
        WHERE KD.Knowledge_DetailID = {Knowledge_DetailID}
      );
      COMMIT TRANSACTION
    END TRY
    BEGIN CATCH
      ROLLBACK
      PRINT 'ROLLBACK'
    END CATCH
  `, req.params);

  smb2.exists(`${smbDir}`, function (err, exists) {
    if (err) {
      console.log(err)
      smb2.disconnect();
      res.status(503).send('Service Unavailable!');
      return;
    } else {
      smb2.writeFile(`${smbDir}\\${Knowledge_DetailID}.mp4`, data, {
        flags: 'w'
      }, function (err) {
        if (err) {
          console.log(`${smbDir}\\${Knowledge_DetailID}.mp4 writeFile Error!`);
          console.log(err);
          smb2.disconnect();
          res.status(503).send('Service Unavailable!');
        } else {
          console.log(`${smbDir}\\${Knowledge_DetailID}.mp4 儲存成功`);
          db.sql(req.Enterprise, strSQL)
            .then((result) => {
              res.send('upload ok');
            }).catch((err) => {
              console.log(err);
              res.status(500).send(err);
            })
        }
      });
    }
  })
});

// 編輯圖片檔案
router.post('/Photo_Edit/:Knowledge_DetailID', upload.single('filepond'), function (req, res, next) {
  console.log("Call Photo_Edit Api, Knowledge_DetailID:", req.params.Knowledge_DetailID);
  // console.log(req.file)

  // req.params.UserID = req.UserID

  var strSQL = format(`
    SELECT 
      kd.KnowledgeID, 
      Doc_Month, Knowledge_DetailID 
    FROM 
      Knowledge_Detail AS kd
    LEFT JOIN Knowledge AS k ON kd.KnowledgeID = k.KnowledgeID
    WHERE Knowledge_DetailID = {Knowledge_DetailID};
  `, req.params);
  // console.log(strSQL)

  db.sql(req.Enterprise, strSQL)
    .then((result) => {
      res.locals.smbDir = `Knowledge\\${result.recordset[0].Doc_Month}\\${result.recordset[0].KnowledgeID}`
      res.locals.Knowledge_DetailID = result.recordset[0].Knowledge_DetailID
      next();
    }).catch((err) => {
      console.log(err);
      res.status(500).send(err);
    })

}, function (req, res, next) {
  var smbDir = res.locals.smbDir
  var Knowledge_DetailID = res.locals.Knowledge_DetailID
  var data = req.file.buffer;
  var strSQL = format(`
    BEGIN TRANSACTION
    BEGIN TRY
      UPDATE Knowledge_Detail SET 
        Image_Source = '{Knowledge_DetailID}.jpg', 
        Data_Updater = N'${req.UserID}', 
        Data_Update = GetDate()
      WHERE 
        Knowledge_DetailID = {Knowledge_DetailID}

      UPDATE K SET 
        K.UserID = ISNULL(K.UserID, N'${req.UserID}')
      FROM [ENTERPRISE].[dbo].[Knowledge] K
      WHERE K.KnowledgeID IN (
        SELECT KD.KnowledgeID 
        FROM [ENTERPRISE].[dbo].[Knowledge_Detail] KD
        WHERE KD.Knowledge_DetailID = {Knowledge_DetailID}
      );
      COMMIT TRANSACTION
    END TRY
    BEGIN CATCH
      ROLLBACK
      PRINT 'ROLLBACK'
    END CATCH
  `, res.locals);
  // console.log(smbDir, strSQL)

  smb2.exists(`${smbDir}`, function (err, exists) {
    if (err) {
      console.log(err)
      smb2.disconnect();
      res.status(503).send('Service Unavailable!');
      return;
    } else {
      smb2.writeFile(`${smbDir}\\${Knowledge_DetailID}.jpg`, data, {
        flags: 'w'
      }, function (err) {
        if (err) {
          console.log(`${smbDir}\\${Knowledge_DetailID}.jpg writeFile Error!`);
          console.log(err);
          smb2.disconnect();
          res.status(503).send('Service Unavailable!');
        } else {
          console.log(`${smbDir}\\${Knowledge_DetailID}.jpg 儲存成功`);
          db.sql(req.Enterprise, strSQL)
            .then((result) => {
              res.send('upload ok');
            }).catch((err) => {
              console.log(err);
              res.status(500).send(err);
            })
        }
      });
    }
  })
});

// 儲存 Description
router.post('/Description_Save/:Knowledge_DetailID', function (req, res, next) {
  console.log("Call Description_Save Api, Knowledge_DetailID:", req.params.Knowledge_DetailID);

  if (req.body['Description'] != null)
    req.body['Description'] = req.body['Description'].replace(/'/g, "''");
  req.body.Knowledge_DetailID = req.params.Knowledge_DetailID

  var strSQL = format(`
    Update Knowledge_Detail set 
      Description = N'{Description}', 
      Data_Updater = N'${req.UserID}', 
      Data_Update = GetDate(),
      Publication_Date = NULL
    Where 
      Knowledge_DetailID = {Knowledge_DetailID};
    Select 
      isnull(Description, '') AS Description From Knowledge_Detail 
    Where 
      Knowledge_DetailID = {Knowledge_DetailID}

    UPDATE K
    SET K.UserID = ISNULL(K.UserID, N'${req.UserID}')
    FROM [ENTERPRISE].[dbo].[Knowledge] K
    WHERE K.KnowledgeID IN (
        SELECT KD.KnowledgeID 
        FROM [ENTERPRISE].[dbo].[Knowledge_Detail] KD
        WHERE KD.Knowledge_DetailID = {Knowledge_DetailID}
    );
  `, req.body);

  db.sql(req.Enterprise, strSQL)
    .then((result) => {
      res.send(result.recordset[0].Description);
    }).catch((err) => {
      console.log(err);
      res.status(500).send(err);
    })
});

// 修改 Title
router.post('/Title_Modify/:Knowledge_DetailID', function (req, res, next) {
  console.log("Call Title_Modify Api, Knowledge_DetailID:", req.params.Knowledge_DetailID, "Title:", req.body.Title);

  req.body.Title = req.body.Title.replace(/'/g, "''").trim();
  req.body.Knowledge_DetailID = req.params.Knowledge_DetailID

  var strSQL = format(`Update Knowledge_Detail set Title = N'{Title}', Data_Updater = N'${req.UserID}', Data_Update = GetDate()
   Where Knowledge_DetailID = {Knowledge_DetailID};
   Select Title From Knowledge_Detail Where Knowledge_DetailID = {Knowledge_DetailID}
   `, req.body);
  //  console.log(strSQL)

  db.sql(req.Enterprise, strSQL)
    .then((result) => {
      res.send(result.recordset[0].Title);
    }).catch((err) => {
      console.log(err);
      res.status(500).send(err);
    })
});

// 修改 Tags
router.post('/Tags_Modify/:Knowledge_DetailID', function (req, res, next) {
  console.log("Call Tags_Modify Api, Knowledge_DetailID:", req.params.Knowledge_DetailID, "Tags:", req.body.Tags);

  req.body.Tags = req.body.Tags.replace(/'/g, "''").trim();
  req.body.Knowledge_DetailID = req.params.Knowledge_DetailID

  var strSQL = format(`Update Knowledge_Detail set Tags = N'{Tags}', Data_Updater = N'${req.UserID}', Data_Update = GetDate()
   Where Knowledge_DetailID = {Knowledge_DetailID};
   Select Tags From Knowledge_Detail Where Knowledge_DetailID = {Knowledge_DetailID}
   `, req.body);
  //  console.log(strSQL)

  db.sql(req.Enterprise, strSQL)
    .then((result) => {
      res.send(result.recordset[0].Tags);
    }).catch((err) => {
      console.log(err);
      res.status(500).send(err);
    })
});

// 修改 HTML_Draft
router.post('/HTML_Modify/:Knowledge_DetailID', function (req, res, next) {
  console.log("Call HTML_Modify Api, Knowledge_DetailID:", req.params.Knowledge_DetailID, "HTML_Draft:", req.body.HTML_Draft);

  req.body.HTML_Draft = req.body.HTML_Draft.replace(/'/g, "''").trim();
  req.body.Knowledge_DetailID = req.params.Knowledge_DetailID

  var strSQL = format(`Update Knowledge_Detail set HTML_Draft = N'{HTML_Draft}', Data_Updater = N'${req.UserID}', Data_Update = GetDate()
  Where Knowledge_DetailID = {Knowledge_DetailID};

  Declare @Flag int;
  Set @Flag = @@ROWCOUNT;
  Select @Flag as Flag;
   
  `, req.body);

  // console.log(strSQL)
  db.sql(req.Enterprise, strSQL)
    .then((result) => {
      console.log(result.recordsets)
      res.send(result.recordsets[0][0].Flag > 0);
    }).catch((err) => {
      console.log(err);
      res.status(500).send(err);
    })
});

// change Image Always On
router.post('/Image_Always_On/:Knowledge_DetailID', function (req, res, next) {
  console.log("Call Image_Always_On Api, Knowledge_DetailID:", req.params.Knowledge_DetailID);

  req.body.Knowledge_DetailID = req.params.Knowledge_DetailID

  var strSQL = format(`Update Knowledge_Detail set Image_Always_On = {Image_Always_On}, Data_Updater = N'${req.UserID}', Data_Update = GetDate()
   Where Knowledge_DetailID = {Knowledge_DetailID};
   Select Image_Always_On From Knowledge_Detail Where Knowledge_DetailID = {Knowledge_DetailID}
   `, req.body);
  //  console.log(strSQL)

  db.sql(req.Enterprise, strSQL)
    .then((result) => {
      res.send(200, result.recordset[0].Image_Always_On);
    }).catch((err) => {
      console.log(err);
      res.status(500).send(err);
    })
});

// Reorder SortID
router.post('/Reorder_SortID/:KnowledgeID', function (req, res, next) {
  console.log("Call Reorder_SortID Api, KnowledgeID:", req.params.KnowledgeID, req.body);

  var strSQL = `DECLARE @tmp TABLE (SortID INT, Knowledge_DetailID INT)
  insert into @tmp values `
  req.body.PlayList_Detail.forEach((element, key) => {
    strSQL += (`(${element.SortID}, ${element.Knowledge_DetailID}),`)
    if (Object.is(req.body.PlayList_Detail.length - 1, key)) { // execute last item logic
      strSQL = strSQL.substring(0, strSQL.length - 1)
      strSQL += `; \r\n`
      // console.log(`Last callback call at index ${key} with value ${element.Knowledge_DetailID}` ); 
    }
  });
  strSQL += `Update Knowledge_Detail SET SortID = tmp.SortID From Knowledge_Detail as kd
  Inner Join (Select SortID, Knowledge_DetailID from @tmp) AS tmp ON tmp.Knowledge_DetailID = kd.Knowledge_DetailID`
  // console.log(strSQL)
  db.sql(req.Enterprise, strSQL)
    .then((result) => {
      res.send('reorder ok!');
    }).catch((err) => {
      console.log(err);
      res.status(500).send(err);
    })
});

router.post('/Reorder_SortID_SubDetailID/:Knowledge_DetailID', async (req, res, next) => {
  console.log("Call Reorder_SortID_SubDetailID Api, Knowledge_DetailID:", req.params.Knowledge_DetailID);
  let strSQL = `
    DECLARE @tmp TABLE (SortID INT, Knowledge_SubDetailID INT)
    insert into @tmp values
  `
  req.body.subDetails.forEach((element, key) => {
    strSQL += (`(${element.SortID}, ${element.Knowledge_SubDetailID}),`)
    if (Object.is(req.body.subDetails.length - 1, key)) { // execute last item logic
      strSQL = strSQL.substring(0, strSQL.length - 1)
      strSQL += `; \r\n`
    }
  })
  strSQL += `
    Update Knowledge_SubDetail SET SortID = tmp.SortID From Knowledge_SubDetail as ks
    Inner Join (Select SortID, Knowledge_SubDetailID from @tmp) AS tmp ON tmp.Knowledge_SubDetailID = ks.Knowledge_SubDetailID`
    // console.log('strSQL', strSQL)
  try {
    await db.sql(req.Enterprise, strSQL)
    res.send('reorder ok!');
  }
  catch (err) {
    console.log(err);
    res.status(500).send(err);
  }

})


// 增加 Detail SQL 敘述 without Video
router.post('/Detail_Add/:KnowledgeID', function (req, res, next) {
  console.log("Call Detail_Add Api, KnowledgeID:", req.params.KnowledgeID);

  var strSQL = format(`
    SELECT 
      KnowledgeID, Doc_Month 
    FROM 
      Knowledge 
    WHERE 
      KnowledgeID = {KnowledgeID};
  `, req.params);
  console.log(strSQL)

  db.sql(req.Enterprise, strSQL)
    .then((result) => {
      res.locals.smbDir = `Knowledge\\${result.recordset[0].Doc_Month}\\${result.recordset[0].KnowledgeID}`
      res.locals.Doc_Month = result.recordset[0].Doc_Month
      res.locals.KnowledgeID = result.recordset[0].KnowledgeID
      next();
    }).catch((err) => {
      console.log(err);
      res.status(500).send(err);
    })

}, function (req, res, next) {

  let Doc_Month = res.locals.Doc_Month
  let KnowledgeID = res.locals.KnowledgeID
  // 確認資料夾是否存在 (影片嵌入 Knowledge_Detail， Knowledge_DetailID 代入 null)
  checkFolder(Doc_Month, KnowledgeID, null, next)

}, function (req, res, next) {
  // req.body.UserID = req.UserID
  // console.log(req.UserID)
  req.body.KnowledgeID = req.params.KnowledgeID

  var strSQL = format(`
    BEGIN TRANSACTION
    BEGIN TRY
      INSERT INTO Knowledge_Detail (
        KnowledgeID, 
        Title, 
        [Description], 
        Video_Type, 
        SortID, 
        Image_Always_On,
        Publication_Date
      )
      VALUES (
        {KnowledgeID}, 
        '{Title}', 
        '{Description}', 
        'video/mp4 ', 
        (
          Select isnull(Max(SortID),0) + 1 
          From 
            Knowledge_Detail 
          Where 
            KnowledgeID = {KnowledgeID}
        ),
        0,
        GETDATE()
      )
      
      UPDATE K 
      SET UserID = isnull(K.UserID, N'${req.UserID}')
      FROM [ENTERPRISE].[dbo].[Knowledge] K
      WHERE KnowledgeID = {KnowledgeID}

      COMMIT TRANSACTION
    END TRY
    BEGIN CATCH
      ROLLBACK
      PRINT 'ROLLBACK'
    END CATCH
  `, req.body);
  // console.log(strSQL)

  // const content = await smb2.readFile('Knowledge\\2004\\28\\1.jpg');
  // console.log(content);

  db.sql(req.Enterprise, strSQL)
    .then((result) => {
      // console.log(result.recordset)
      res.send('add ok');
    }).catch((err) => {
      console.log(err);
      res.status(500).send(err);
    })
});

// 刪除 Detail 檔案與 SQL 紀錄
router.delete('/Detail_Delete/:Knowledge_DetailID', function (req, res, next) {
  console.log("Call Detail_Delete Api, Knowledge_DetailID:", req.params.Knowledge_DetailID);
  // req.params.UserID = req.UserID

  var strSQL = format(`SELECT kd.KnowledgeID, Doc_Month, Knowledge_DetailID, Image_Source, Video_Source FROM Knowledge_Detail AS kd
  LEFT JOIN Knowledge AS k ON kd.KnowledgeID = k.KnowledgeID
  WHERE Knowledge_DetailID = {Knowledge_DetailID};`, req.params);
  console.log(strSQL)

  db.sql(req.Enterprise, strSQL)
    .then((result) => {
      res.locals.smbDir = `Knowledge\\${result.recordset[0].Doc_Month}\\${result.recordset[0].KnowledgeID}`
      res.locals.Image_Source = `${res.locals.smbDir}\\${result.recordset[0].Image_Source}`
      res.locals.Video_Source = `${res.locals.smbDir}\\${result.recordset[0].Video_Source}`
      res.locals.Knowledge_DetailID = result.recordset[0].Knowledge_DetailID
      console.log(res.locals)
      next();
    }).catch((err) => {
      console.log(err);
      res.status(500).send(err);
    })

}, function (req, res, next) {
  var Image_Source = res.locals.Image_Source

  smb2.exists(`${Image_Source}`, function (err, exists) {
    if (err) {
      console.log(err)
      smb2.disconnect();
      res.status(503).send('Service Unavailable!');
      return;
    } else {
      if (exists) {
        smb2.unlink(`${Image_Source}`, function (err) {
          if (err) {
            console.log(`${Image_Source} deleteFile Error!`);
            console.log(err);
            res.status(503).send('Service Unavailable!');
            return;
          } else {
            console.log(`已刪除: ${Image_Source}`);
            next();
          }
        });
      } else {
        console.log(`${Image_Source} 路徑不存在!`);
        next();
      }
    }
  })
}, function (req, res, next) {
  var Video_Source = res.locals.Video_Source

  smb2.exists(`${Video_Source}`, function (err, exists) {
    if (err) {
      console.log(err)
      smb2.disconnect();
      res.status(503).send('Service Unavailable!');
      return;
    } else {
      if (exists) {
        smb2.unlink(`${Video_Source}`, function (err) {
          if (err) {
            console.log(`${Video_Source} deleteFile Error!`);
            console.log(err);
            res.status(503).send('Service Unavailable!');
            return;
          } else {
            console.log(`已刪除: ${Video_Source}`);
            next();
          }
        });
      } else {
        console.log(`${Video_Source} 路徑不存在!`);
        next();
      }
    }
  })
}, function (req, res, next) {
  var strSQL = format(`Delete FROM Knowledge_Detail
  WHERE Knowledge_DetailID = {Knowledge_DetailID}`, res.locals);
  console.log(strSQL)

  db.sql(req.Enterprise, strSQL)
    .then((result) => {
      res.send('delete ok');
    }).catch((err) => {
      console.log(err);
      res.status(500).send(err);
    })
});

// Get Knowledge Detail Data
router.get('/Knowledge_Detail_Publication/:Knowledge_DetailID', function (req, res, next) {
  console.log("Call Knowledge_Detail_Publication Api, Knowledge_DetailID:", req.params.Knowledge_DetailID);

  req.body.Knowledge_DetailID = req.params.Knowledge_DetailID

  let strSQL = format(`
    SELECT
      [Knowledge_Detail_PublicationID], 
      kdp.[Knowledge_DetailID], 
      Convert(VARCHAR(10), kdp.[Publication_Date], 111) AS Publication_Date, 
      kdp.[Description], 
      [Publisher],
      case when (kdp.[Publication_Date] = kd.[Publication_Date] ) then 1 else 0 end AS Public_Flag
    FROM [dbo].[Knowledge_Detail_Publication] kdp
    Inner Join [dbo].[Knowledge_Detail] kd ON kd.Knowledge_DetailID = kdp.Knowledge_DetailID
    WHERE kdp.Knowledge_DetailID = {Knowledge_DetailID}
    ORDER BY Publication_Date DESC
  `, req.params);

  // console.log(strSQL)
  db.sql(req.Enterprise, strSQL)
  .then((result) => {
    res.send(result.recordset);
  }).catch((err) => {
      console.log(err);
      res.status(500).send(err);
    })
});

router.post('/Knowledge_Detail_Publication/:Knowledge_DetailID', async (req, res, next) => {
  console.log("Call POST Knowledge_Detail_Publication Api:", req.params.Knowledge_DetailID);

  if (req.body['Publication_Date'] != null)
    req.body['Publication_Date'] = `N'${req.body['Publication_Date'].replace(/'/g, "''")}'`;
  let strSQL = format(`
    UPDATE [ENTERPRISE].[dbo].[Knowledge_Detail] SET
      Publication_Date = {Publication_Date}
    WHERE Knowledge_DetailID = {Knowledge_DetailID}
  `, {...req.params, ...req.body});
  try {
    const dbRes = db.sql(req.Enterprise, strSQL)
    res.send(dbRes)
  }
  catch (_err) {
    res.status(500).send(_err)
  }
})

// Knowledge Detail Publication Maintain
router.post('/Knowledge_Detail_Publication_Maintain', function (req, res, next) {
  console.log("Call Knowledge_Detail_Publication_Maintain Api:", req.body);
  // req.body.Mode === 0 表示新增
  // req.body.Mode === 1 表示修改
  // req.body.Mode === 2 表示刪除 
  strSQL = format(` Declare @ROWCOUNT int = 0; `, req.body);

  switch (req.body.Mode) {
    case 0:
      strSQL += format(`
        INSERT INTO [dbo].[Knowledge_Detail_Publication] (Knowledge_DetailID)
        VALUES ({Knowledge_DetailID})

        Set @ROWCOUNT = @@ROWCOUNT; 
        `, req.body);
      break;
    case 1:
      switch (req.body.Name) {
        case 'Publisher':
          req.body.Value = req.UserID
        default:
          req.body.Value = req.body.Value ? `N'${req.body.Value.trim().replace(/'/g, "''")}'` : `''`;
          break;
      }

      strSQL += format(`     
        Update [dbo].[Knowledge_Detail_Publication] Set [{Name}] = {Value}
        Where Knowledge_Detail_PublicationID = {Knowledge_Detail_PublicationID};
        
        Set @ROWCOUNT = @@ROWCOUNT; 
        if('${req.body.Name}' = 'Publisher')
        begin
          Update [dbo].[Knowledge_Detail] set Publication_Date = N'{Publication_Date}'
          Where Knowledge_DetailID = {Knowledge_DetailID};

          Update [dbo].[Knowledge_Detail_Publication] Set Publisher = {Value}
          Where Knowledge_Detail_PublicationID = {Knowledge_Detail_PublicationID};
        End
        `, req.body);
      break;
    case 2:
      req.body.Produce_DailyID = req.body.Produce_DailyID ? req.body.Produce_DailyID : 0;
      strSQL += format(`
        Delete FROM [dbo].[Knowledge_Detail_Publication]
        Where Knowledge_Detail_PublicationID = {Knowledge_Detail_PublicationID};

        Set @ROWCOUNT = @@ROWCOUNT;
        `, req.body);
      break;
  }

  strSQL += format(`Select @ROWCOUNT as Flag;`);
  // console.log(strSQL)
  // res.send({ Flag: true });
  db.sql(req.Enterprise, strSQL)
    .then((result) => {
      res.send({ Flag: result.recordsets[0][0].Flag > 0 });
    }).catch((err) => {
      console.log(err);
      res.status(500).send(err);
    })

});
/* Darren-Chang API End */

// 閱讀權限
router.post('/isReader', async (req, res, next) => {
  console.log("Call KnowledgeIsReader Api isReader:", req.UserID);

  strSQL = format(`
    SELECT 
      ASP.LoweredRoleName
    FROM [ENTERPRISE].[dbo].[Knowledge] K
    LEFT JOIN [ENTERPRISE].[dbo].[Knowledge_In_Roles] KR ON KR.KnowledgeID = K.KnowledgeID
    LEFT JOIN [ENTERPRISE].[dbo].[aspnet_Roles] ASP ON KR.RoleId = ASP.RoleId
    LEFT JOIN [ENTERPRISE].[dbo].[Knowledge_Detail] KD ON KD.KnowledgeID = K.KnowledgeID
    WHERE K.KnowledgeID = ${req.body.KnowledgeID}
  `, req.body)

  try {
    const _res = await db.sql(req.Enterprise, strSQL)
    const _arr = Array.from(new Set(_res.recordsets[0].map(_val => _val.LoweredRoleName)))
    res.send(_arr)
  }
  catch(err) {
    console.log(err)
  }
})

router.post('/Knowledge_SubDetailID', async (req, res, next) => {
  console.log("Call Knowledge_SubDetailID Api:", req.UserID);
  // req.body.Mode === 0 表示新增
  // req.body.Mode === 1 表示修改
  // req.body.Mode === 2 表示刪除 
  // req.body.Mode === 3 表示查詢
  if (req.body['Subtitle'] != null)
    req.body['Subtitle'] = `N'${req.body['Subtitle'].replace(/'/g, "''")}'`;
  if (req.body['Description'] != null)
    req.body['Description'] = `N'${req.body['Description'].replace(/'/g, "''")}'`;

  let strSQL = ''
  switch (req.body.mode) {
    case 0:
      strSQL = format(`
        INSERT INTO [ENTERPRISE].[dbo].[Knowledge_SubDetail] (
          Knowledge_DetailID,
          Subtitle,
          SortID,
          Description,
          Data_Updater,
          Data_Update,
          Publication_Date
        )
        OUTPUT INSERTED.*
        VALUES (
          {Knowledge_DetailID},
          {Subtitle},
          (Select isnull(Max(SortID),0) + 1 From [ENTERPRISE].[dbo].[Knowledge_SubDetail] Where Knowledge_DetailID = {Knowledge_DetailID}),
          {Description},
          N'${req.UserID}',
          GETDATE(),
          NULL
        )

      `, req.body)
      break
    case 1:
      if (req.body.target === 'subTitle') {
        strSQL = format(`
          UPDATE [ENTERPRISE].[dbo].[Knowledge_SubDetail] 
          SET
            [Subtitle] = {Subtitle},
            [Description] = {Description},
            [Data_Updater] = N'${req.UserID}',
            [Data_Update] = GETDATE()
          WHERE Knowledge_SubDetailID = {Knowledge_SubDetailID}
        `, req.body)  
      }
      if (req.body.target !== 'subTitle') {
        strSQL = format(`
          UPDATE [ENTERPRISE].[dbo].[Knowledge_SubDetail] 
          SET
            [Subtitle] = {Subtitle},
            [Description] = {Description},
            [Data_Updater] = N'${req.UserID}',
            [Data_Update] = GETDATE(),
            [Publication_Date] = NULL
          WHERE Knowledge_SubDetailID = {Knowledge_SubDetailID}
        `, req.body)
      }
      break
    case 2:
      strSQL = format(`
        DELETE [ENTERPRISE].[dbo].[Knowledge_SubDetail]
        WHERE Knowledge_SubDetailID = {Knowledge_SubDetailID}
      `, req.body)
      break
    case 3:
      strSQL = format(`
        SELECT * FROM [ENTERPRISE].[dbo].[Knowledge_SubDetail]
        WHERE Knowledge_DetailID = {Knowledge_DetailID}
      `, req.body)
      break
  }
  try {
    const _res = await db.sql(req.Enterprise, strSQL)
    if (req.body.mode === 0) return res.json(_res.recordset[0])
    res.send(_res)
  }
  catch(err) {
    console.log(err)
  }
})

// subDetail上傳影片檔案
router.post('/Sub_Video_edit/:KnowledgeID/:Knowledge_DetailID/:Knowledge_SubDetailID', upload.single('filepond'), async (req, res, next) => {
  console.log("Call Sub_Video_Edit Api KnowledgeID:", req.params);
  // 索取 Doc_Month 欄位資料，checkFolder 要用
  let strSQL = format(`
    SELECT 
      KnowledgeID, 
      Doc_Month
    FROM Knowledge WHERE KnowledgeID = {KnowledgeID};
  `, req.params);
  console.log(strSQL)
    
  db.sql(req.Enterprise, strSQL)
    .then((result) => {
      res.locals.smbDir = `Knowledge\\${result.recordset[0].Doc_Month}\\${req.params.KnowledgeID}\\${req.params.Knowledge_DetailID}`
      res.locals.Doc_Month = result.recordset[0].Doc_Month
      res.locals.KnowledgeID = result.recordset[0].KnowledgeID
      res.locals.Knowledge_DetailID = req.params.Knowledge_DetailID
      res.locals.Knowledge_SubDetailID = req.params.Knowledge_SubDetailID
      next();
    }).catch((err) => {
      console.log(err);
      res.status(500).send(err);
    })

}, async (req, res, next) => {
  let Doc_Month = res.locals.Doc_Month
  let KnowledgeID = res.locals.KnowledgeID
  let Knowledge_DetailID = res.locals.Knowledge_DetailID
  // 確認資料夾是否存在 (影片嵌入 Knowledge_SubDetail，Knowledge_DetailID 要代入值)
  checkFolder(Doc_Month, KnowledgeID, Knowledge_DetailID, next)

}, async (req, res, next) => {

  res.locals.mimetype = req.file.mimetype

  let strSQL = format(`
    UPDATE Knowledge_SubDetail SET 
      Video_Source = '${res.locals.Knowledge_SubDetailID}.mp4',
      Video_Type = '{mimetype}',
      Data_Updater = N'${req.UserID}',
      Data_Update = GETDATE()
    WHERE Knowledge_SubDetailID = ${res.locals.Knowledge_SubDetailID}
  `, res.locals);
  try {
    await db.sql(req.Enterprise, strSQL)
    next();
  } catch (err) {
    console.log(err);
    res.status(500).send(err);
  }
}, 
async (req, res, next) => {
  const smbDir = res.locals.smbDir
  const Knowledge_SubDetailID = res.locals.Knowledge_SubDetailID
  const data = req.file.buffer;
  smb2.exists(`${smbDir}`, function (err, exists) {
    if (err) {
      console.log(err)
      smb2.disconnect();
      res.status(503).send('Service Unavailable!');
      return;
    } else {
      smb2.writeFile(`${smbDir}\\${Knowledge_SubDetailID}.mp4`, data, {
        flags: 'w'
      }, function (err) {
        if (err) {
          console.log(`${Knowledge_SubDetailID}.mp4 writeFile Error!`);
          console.log(err);
          smb2.disconnect();
          return res.status(503).send('Service Unavailable!');
        } else {
          console.log(`${smbDir}\\${Knowledge_SubDetailID}.mp4 儲存成功`);
          res.send('upload ok');
        }
      });
    }
  })
}
);

// TAG: Knowledge_SubDetail_Publication 版本紀錄
router.post('/Knowledge_SubDetail_Publication/:Knowledge_SubDetailID', async (req, res, next) => {
  console.log("Call Knowledge_SubDetail_Publication Api Knowledge_SubDetailID:", req.params.Knowledge_SubDetailID);
  if (req.body['Description'] != null)
    req.body['Description'] = `N'${req.body['Description'].replace(/'/g, "''")}'`;
  if (req.body['Publication_Date'] != null)
    req.body['Publication_Date'] = `N'${req.body['Publication_Date'].replace(/'/g, "''")}'`;
  if (req.body['act'] != null)
    req.body['act'] = `'${req.body['act'].replace(/'/g, "''")}'`;
  // console.log('req.body', req.body)

  let strSQL = ''
  switch (req.body.mode) {
    case 0:
      strSQL = format(`
        INSERT INTO [ENTERPRISE].[dbo].[Knowledge_SubDetail_Publication] (
          Knowledge_SubDetailID,
          Publication_Date,
          Description
        )
        OUTPUT INSERTED.*
        VALUES (
          ${req.params.Knowledge_SubDetailID},
          GETDATE(),
          {Description}
        )
      `, req.body)
      break
    case 1:
      strSQL = format(`
        UPDATE Knowledge_SubDetail_Publication SET
          Publication_Date = {Publication_Date},
          Description = {Description},
          Publisher = CASE WHEN {act} = 'announce' THEN N'${req.UserID}' END
        WHERE Knowledge_SubDetail_PublicationID = {Knowledge_SubDetail_PublicationID}

        IF ({act} = 'announce')
        BEGIN
          UPDATE [dbo].[Knowledge_SubDetail] SET
            Publication_Date = {Publication_Date}
          WHERE
            Knowledge_SubDetailID = {Knowledge_SubDetailID}
        END
      `, req.body)
      break
    case 2:
      strSQL = format(`
        UPDATE [dbo].[Knowledge_SubDetail] SET
            Publication_Date = NULL
        WHERE
            Knowledge_SubDetailID = ${req.params.Knowledge_SubDetailID}

        DELETE [ENTERPRISE].[dbo].[Knowledge_SubDetail_Publication]
        WHERE Knowledge_SubDetail_PublicationID = {Knowledge_SubDetail_PublicationID}

      `, req.body)
      break
    }
  try {
    const _res = await db.sql(req.Enterprise, strSQL)
    console.log(_res)
    res.send(_res)
  }
  catch (_err) {
    console.log(_err)
    res.status(500).send(_err)
  }
})


module.exports = router;