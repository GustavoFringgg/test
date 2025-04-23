var express = require('express');
var router = express.Router();
var sql = require("mssql");
var WebServer = require('../../config/WebServer');
var fs = require('fs');
var multer = require('multer');
var moment = require('moment');
const format = require('string-format');
const sharp = require('sharp');

var db = require('../../config/DB_Connect');
var smb2 = require('../../config/smb2');


var storage = multer.memoryStorage({
  // destination: function (req, file, cb) {
  //   cb(null, './upload')
  // },
  filename: function (req, file, cb) {
    cb(null, file.originalname)
  }
})
var upload = multer({
  storage: storage
})


/* Mark-Wang API Begin */
//取得Product_Concept_Diagram
router.get('/Product_Concept_Diagram/:Product_No', function (req, res, next) {
  console.log("Call Product_Concept_Diagra Api Product_No:", req.params.Product_No);
  var strSQL = format(`Select '{0}/Datas/Images/System/Product_Composition_Templates/Product_Photo_Template.png' AS Photo_error
             , isnull('{0}/Datas/Images/System/Product_Composition_Templates/'+ s.Category + '.jpg?tmp=' + convert(varchar(20), getDate(),120), '{0}/Datas/Images/System/Product_Composition_Templates/Product_Photo_Template.png') AS Photo
       From Style as s WITH (NoWait, NoLock)
       Inner Join Product as p WITH (NoWait, NoLock) on p.Style_No = s.Style_No
       Where p.Product_No = '{1}'
 `, WebServer.url, req.params.Product_No);

  db.sql(req.Enterprise, strSQL)
  .then((result)=>{
    res.send(result.recordset);
  }).catch((err)=>{
    console.log(err);
    res.status(500).send(err);
  })
});

//取得相同Style的Product_No資料
router.post('/Load_Product_Data', function (req, res, next) {
  console.log("Call Load_Product_Data Api Product_No:", req.body);
  var strSQL = format(`With tmp_Product(Style_No) as(
      Select Style_No
      From Product as p WITH (NoWait, Nolock) 
      Where p.Product_No = '{Product_No}'
    )
    SELECT p.Product_No 
       FROM Product as p WITH (NoWait, Nolock) 
       Inner Join tmp_Product as s WITH (NoWait, Nolock) on p.style_No = s.style_No 
       Where p.Product_No != '{Product_No}' 
         And ('{ImportType}'= 'Sample' or p.Structure_Completed is not null)
       ;`, req.body);

//console.log(strSQL)       

  db.sql(req.Enterprise, strSQL)
  .then((result)=>{
    res.send(result.recordset);
  }).catch((err)=>{
    console.log(err);
    res.status(500).send(err);
  })
});

//取得Product_Attention資料
router.get('/Product_Attention/:Product_No', function (req, res, next) {
  console.log("Call Product_Attention Api Product_No:", req.params.Product_No);
  var strSQL = format(`SELECT p.Product_Attention FROM Product as p WITH (NoWait, Nolock) Where Product_No = '{Product_No}'`, req.params);
  db.sql(req.Enterprise, strSQL)
  .then((result)=>{
    res.send(result.recordset);
  }).catch((err)=>{
    console.log(err);
    res.status(500).send(err);
  })

});

//取得Product資料
router.get('/Product_Info/:Product_No', function (req, res, next) {
  console.log("Call Product_Info Api Product_No:", req.params.Product_No);
  var Product_No = req.params.Product_No;
  var strSQL = format(`SELECT s.Style_No, p.Product_No, s.Brand, p.Customer_Product_No, isnull(p.Color_Code,'') as Color_Code, isnull(p.Color,'') as Color, p.Name
  , s.Pattern_No, s.Category, s.Gender, s.Size_Mode, s.Size_Run, s.Sample_Size, s.Construction, s.Last_No, s.Outsole_No, s.Main_Material, p.Product_Attention
  , Convert(varchar(10),p.Date,111) as Create_Date
  , isnull(Photo_Month,'') as Photo_Month
  , isnull(Sketch_Month,'') as Sketch_Month
  , Convert(varchar(20),p.Technical_Sheet_Update,120) as Technical_Sheet_Update
  , isnull(p.Technical_Sheet_Maker,'') as Technical_Sheet_Maker
  , case when isnull(p.Structure_Completed,'') = '' then '' else convert(varchar(20),p.Structure_Completed,120) end as Structure_Completed
  , isnull(p.Structure_Approver,'') as Structure_Approver
  , case when isnull(p.Structure_Approve,'') = '' then '' else convert(varchar(20),p.Structure_Approve,120) end as Structure_Approve
  , case when Photo_Month is null then case when Sketch_Month is null then '{0}/datas/Images/System/Blank.png' else '{0}/datas/Images/Products/Sketches/' + Sketch_Month + '/Large/' + Product_No end else '{0}/datas/Images/Products/Photos/' + Photo_Month + '/Large/' + Product_No end + '.jpg?tmp=' + convert(varchar(20), getDate(),120) AS Structure_Photo
  , ISNULL('{0}/datas/Images/Products/Sketches/' + Sketch_Month + '/Thumb/' + Product_No + '.jpg?tmp=' + convert(varchar(20), getDate(),120), '{0}/datas/Images/System/Blank.png') AS Photo_Thumb
  , ISNULL('{0}/datas/Images/Products/Sketches/' + Sketch_Month + '/' + Product_No + '.jpg?tmp=' + convert(varchar(20), getDate(),120), '{0}/datas/Images/System/Blank.png') AS Photo
  , ISNULL('{0}/datas/Images/Products/Sketches/' + Sketch_Month + '/Large/' + Product_No + '.jpg?tmp=' + convert(varchar(20), getDate(),120), '{0}/datas/Images/System/Blank.png') AS Photo_Large
  , '{0}/datas/Images/System/Blank.png' AS Photo_error
  FROM Product as p WITH (NoWait, Nolock) 
  Inner Join Style as s WITH (NoLock, NoWait) on p.Style_No = s.Style_No
  Where Product_No = '{1}'`, WebServer.url, Product_No);

  db.sql(req.Enterprise, strSQL)
  .then((result)=>{
    //console.log(result)
    res.send(result.recordset);
  }).catch((err)=>{
    console.log(err);
    res.status(500).send(err);
  })
});

//取得Sample Sheet資料
router.get('/Sample_Sheet_Info/:Product_No', function (req, res, next) {
  console.log("Call Sample_Sheet_Info Api Product_No:", req.params.Product_No);

  var strSQL = format(`
    SELECT isnull(S.SortID,'ZZZ') as GroupSort, p.SortID, isnull(p.Component_GroupID,0) as Component_GroupID, isnull(s.Component_Group,'Description') as Component_Group,
    case when p.ComponentID is null then isnull(p.Component,'') else c.Component end + case when len(isnull(C_Rmk,'')) = 0 then '' else ' ('+ C_Rmk +')' end + '.' + ' ' + case when p.Material_DetailID is null then p.Material else isnull(m.Material_Category,'') + ' ' + isnull(md.Material_Specific,'') end + ' ' + ISNULL(Color, '') + ' ' + ISNULL(Remark, '') AS Description
  , ISNULL(Material_Code,'') as Material_Code, ISNULL(cast(p.ComponentID as varchar(max)),'') as ComponentID, ISNULL(p.Component,'') + case when len(isnull(C_Rmk,'')) = 0 then '' else ' ('+ C_Rmk +')' end as Component, ISNULL(Material, '') as Material, ISNULL(Color, '') as Color, Material_ColorID, ISNULL(Remark, '') as Remark
    FROM Product_Technical_Sheet_Detail as p WITH (NoWait, Nolock)
     left outer Join Product_Component_Group as s WITH (NoLock, NoWait) on p.Component_GroupID = s.Component_GroupID
     Left outer Join Product_Component as c WITH (NoWait, Nolock) on c.ComponentID = p.ComponentID
     Left outer Join Material_Detail as md WITH (NoWait, Nolock) on p.Material_DetailID = md.Material_DetailID
     Left outer Join Material as m with(NoWait, NoLock) on m.MaterialID = md.MaterialID
     Where Product_No = '{Product_No}'
    ORDER BY GroupSort,  p.SortID , p.ComponentID , C_Rmk
/*     
    ORDER BY GroupSort, case when p.MaterialID is Null then '' else Material_Category end,
                        case when p.Material_DetailID is Null then '' else Material_Specific end,
                        case when p.Material_ColorID is Null then '' else Color end,
                        case when p.Material_ColorID is Null then p.SortID else p.ComponentID end,
                        C_Rmk 
*/`, req.params);
    // console.log(strSQL)
    db.sql(req.Enterprise, strSQL)
    .then((result)=>{
      res.send(result.recordset);
    }).catch((err)=>{
      console.log(err);
      res.status(500).send(err);
    });
  });

//取得Component資料
router.get('/Component_Info/:Product_No/:Lang', function (req, res, next) {
  console.log("Call Component_Info Api Product_No:", req.params.Product_No);
  var Product_No = req.params.Product_No;
  var strSQL = format(`With tmp_Style_Comp (SortID, Style_WorkshopID, Style_ProcessID, Brand ,ComponentID, Component_Group, Component, C_Rmk, Workshop, Queue_No) as (
      SELECT pcg.SortID, sw.Style_WorkshopID, sp.Style_ProcessID, s.Brand, sp.ComponentID, pcg.Component_Group, pc.Component, isnull(sp.C_Rmk,'') as C_Rmk, w.Workshop, sw.Queue_No
      FROM Style as s WITH (NoWait, Nolock) 
      Inner Join Product as p WITH (NoWait, Nolock) on p.style_No = s.style_No
      Inner Join Style_Process as sp WITH (NoWait, Nolock) On sp.Style_No = s.Style_No
      Inner Join Style_Workshop as sw WITH (NoWait, Nolock) On sw.Style_ProcessID = sp.Style_ProcessID
      Inner Join Workshop as w WITH (NoWait, Nolock) On w.WorkshopID = sw.WorkshopID
      Inner Join Product_Component as pc WITH (NoWait, Nolock) On pc.ComponentID = sp.ComponentID
      Inner Join Product_Component_Group as pcg WITH (NoWait, NoLock) on pcg.Component_GroupID = pc.Component_GroupID
      Where p.Product_No = '{1}'
      Group By pcg.SortID, s.Brand, sw.Style_WorkshopID, sp.Style_ProcessID, sp.ComponentID, Component_Group, pc.Component, sp.C_Rmk, w.Workshop, sw.Queue_No
      ), 
      tmp_Product_Process (Style_ProcessID, Product_ProcessID, Memo, Photo_Thumb, Photo, Photo_Large, Component_PhotoID, Data_Updater, Data_Update) as (
          Select pp.Style_ProcessID, pp.Product_ProcessID, cast(isnull(pp.Memo,'') as nvarchar(max)) as Memo
              , ISNULL('{0}/datas/Images/Products/Components/' + pcp.Photo_Month + '/Thumb/' + CONVERT(varchar(50), pcp.Component_PhotoID) + '.jpg?tmp=' + convert(varchar(20), getDate(),120), '{0}/datas/Images/System/Blank.png') AS Photo_Thumb
              , ISNULL('{0}/datas/Images/Products/Components/' + pcp.Photo_Month + '/' + CONVERT(varchar(50), pcp.Component_PhotoID) + '.jpg?tmp=' + convert(varchar(20), getDate(),120), '{0}/datas/Images/System/Blank.png') AS Photo
              , ISNULL('{0}/datas/Images/Products/Components/' + pcp.Photo_Month + '/Large/' + CONVERT(varchar(50), pcp.Component_PhotoID) + '.jpg?tmp=' + convert(varchar(20), getDate(),120), '{0}/datas/Images/System/Blank.png') AS Photo_Large      
              , pp.Component_PhotoID
              , isnull(pp.Data_Updater,'') as Data_Updater
              , case when pp.Data_Update is not null then Convert(varchar(20),pp.Data_Update,120) else '' end as Data_Update
          From Product_Process as pp WITH (NoWait, NoLock)
          Left Outer Join Product_Component_Photo as pcp WITH (NoWait, Nolock) on pp.Component_PhotoID = pcp.Component_PhotoID
          Where pp.Product_No = '{1}'
      )
      Select c.SortID, c.Style_WorkshopID, c.Style_ProcessID, c.Queue_No, c.Workshop, c.Brand, c.ComponentID, c.Component_Group, c.Component, c.Component + case when Len(c.C_Rmk) > 0 then '(' + c.C_Rmk + ')' else '' end as Component_Title, c.C_Rmk, isnull(cast(s.Product_ProcessID as varchar),'') as Product_ProcessID, isnull(s.Memo,'') as Memo, isnull(s.Photo_Large,'') as Photo_Large, isnull(s.Photo,'') as Photo, '{0}/datas/Images/System/Blank.png' AS Photo_error , isnull(cast(s.Component_PhotoID as varchar),'') as Component_PhotoID, s.Data_Updater, s.Data_Update
      , (Select Count(ComponentID) from Product_Structure where ComponentID = c.ComponentID and Product_No = '{1}') as componentCount
      From tmp_Style_Comp as c 
      left outer join tmp_Product_Process as s on c.Style_ProcessID = s.Style_ProcessID
      Order by c.ComponentID, c.C_Rmk, c.Queue_No, SortID
   `, WebServer.url, Product_No);
  // console.log(strSQL);
  db.sql(req.Enterprise, strSQL)
  .then((result)=>{
    let Component_Info = [...result.recordsets[0].reduce((r, e) => {
      let k = `${e.Style_ProcessID}`;
      if (!r.has(k)) {
        r.set(k, {
          ...e,
        })
      } else {
        r.get(k).Workshop += `+${e.Workshop}`
      }
      return r;
    }, new Map).values()]
    res.send(Component_Info);
  }).catch((err)=>{
    console.log(err);
    res.status(500).send(err);
  });

});



//更新Component_Photo  Memo 欄位
router.post('/Save_Product_Process_Memo', function (req, res, next) {
  console.log("Call Save_Product_Process_Memo API ==> ", req.body);
  req.body['Memo'] = req.body['Memo'].replace(/'/g, "''");
  req.body['UserID'] = req.UserID;
  
  var strSQL = format(`Update Product_Process set Memo = N'{Memo}', Data_Updater = '{UserID}', Data_Update = GetDate()
  Where Product_ProcessID = {Product_ProcessID};
  `, req.body);

  db.sql(req.Enterprise, strSQL)
  .then((result)=>{
    res.send("success");
  }).catch((err)=>{
    console.log(err);
    res.status(500).send(err);
  })

});


//儲存Product Attention
router.post('/Product_Attention_Save', function (req, res, next) {
  console.log("Call Product_Attention_Save Api Product_No:", req.body.Product_No);
  if(req.body['Product_Attention'] != null)
    req.body['Product_Attention'] = req.body['Product_Attention'].replace(/'/g, "''");
  var strSQL = format(`Update Product set Product_Attention = N'{Product_Attention}'
  , Technical_Sheet_Maker = isnull(Technical_Sheet_Maker,'${req.UserID}') 
  , Technical_Sheet_Updater = '${req.UserID}'
  , Technical_Sheet_Update = Getdate()
   Where Product_No = '{Product_No}'`, req.body);
  //  console.log(strSQL)
   db.sql(req.Enterprise, strSQL)
   .then((result)=>{
     res.send("success");
   }).catch((err)=>{
     console.log(err);
     res.status(500).send(err);
   }) 
});

//匯入Product Attention
router.post('/Import_Product_Attention', function (req, res, next) {
  console.log("Call Import_Product_Attention Api Product_No:", req.body.Product_No);
  var strSQL = format(`Update Product set Product_Attention = (Select Product_Attention From Product Where Product_No='{1}')
  , Technical_Sheet_Maker = isnull(Technical_Sheet_Maker,'${req.UserID}')
  , Technical_Sheet_Updater = '${req.UserID}'
  , Technical_Sheet_Update = Getdate()  
   Where Product_No = '{0}';

   Select @@ROWCOUNT as Flag
   `
   , req.body.Product_No, req.body.selected.Product_No);

   db.sql(req.Enterprise, strSQL)
   .then((result)=>{     
     //res.send("success");
     res.send({Flag:result.recordsets[0][0].Flag > 0, Name:'Attention'});
   }).catch((err)=>{
     console.log(err);
     res.status(500).send(err);
   }) 

});

//匯入樣品圖
router.post('/Import_Sketches', function (req, res, next) {
  console.log("Call Import_Sketches Api", req.body.Product_No);
  var file_d = format(`{0}.jpg`, req.body.Product_No);
  // var Sketch_Month_Old = req.body.Sketch_Month;
  var Sketch_Month_d = moment().format("YYMM");
  var Sketch_Month_s = '';
  var Selected_Product_No = req.body.selected.Product_No
  var file_s = format(`{0}.jpg`, Selected_Product_No);
  var Photo_Size = ['', '\\Thumb', '\\Large'];
  var Sketches_path = "Images\\Products\\Sketches"
  var path = "Images\\Products\\Sketches"

  var strSQL = format(` Declare @Sketch_Month_s varchar(4), @Sketch_Month_d varchar(4)
    SELECT @Sketch_Month_s = Sketch_Month From Product with(Nolock,NoWait) where Product_No='${Selected_Product_No}'
    SELECT @Sketch_Month_d = isnull([Sketch_Month],'${Sketch_Month_d}') FROM Product WHERE Product_No = '${req.body.Product_No}'
    UPDATE Product SET [Sketch_Month] = @Sketch_Month_d, Sketch_Uploader = '${req.UserID}', Sketch_Upload = Getdate() WHERE Product_No = '${req.body.Product_No}'    
    Select @Sketch_Month_s as Sketch_Month_s, @Sketch_Month_d as Sketch_Month_d
  `);

  function MKDir(path) {
    return new Promise(function(resolve, reject) {
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

  function DelFile(path) {
    return new Promise( function(resolve, reject) {
      smb2.exists(path, function (err, exists) {
        if (err) reject(err);
        if (exists) {
            smb2.unlink(path, (err) => {
            if (err) {
              console.log(`${path}:無法刪除`);
              reject(err);
            } else {
              console.log(`${path}:已刪除`);
              resolve('success');
            }
          });
        } else {
          console.log(`${path}:檔案不存在`);
          resolve(`${path}:檔案不存在`);
        }
      });
    });
  }
  function WritePhotoFile(dest, data) {
    return new Promise(function(resolve, reject) {
      smb2.writeFile(dest, data, {flags: 'w'}, function (err, callback) {
        if (err) {
          console.log('WRITE ERROR!')
          reject(err);
        } else {
          // console.log(callback)
          resolve(callback);
        }
      });
    })
  }

  function ReadPhotoFile(src) {
    return new Promise(function (resolve, reject) {
      smb2.readFile(src, function (err, data) {
        if (err) {
          reject(err);
        } else {
          resolve(data);
        }
      });
    })
  }

  async function CopyFile(src, dest) {
    try {
      let data = await ReadPhotoFile(src)
      await WritePhotoFile(dest, data)
    } catch (error) {
      console.error(error);
    }
  }

  db.sql(req.Enterprise, strSQL)
  .then((result)=>{
    Sketch_Month_s = result.recordset[0].Sketch_Month_s;
    Sketch_Month_d = result.recordset[0].Sketch_Month_d;
  
    if (Sketch_Month_s.length <= 0) {
      console.log('Soruce Sketch Month null!')
      res.status(500).send('Something Wrong!');
      return;
    }
    
    smb2.exists(`${Sketches_path}`, function (err, exists) { // 執行檢查資料夾及建立檔案
      if (err) {
        console.log(err)
        smb2.disconnect();
        res.status(503).send('Service Unavailable!')
      } else {
        const Smb2Practice = async () => {
          try {
            console.log(format('Save photo to Server:{0}', path));
            await MKDir(`${path}\\${Sketch_Month_d}\\Large`);
            console.log(format('Copy photo From {0} to {1}', `${path}\\${Sketch_Month_s}\\Large\\${file_s}`, `${path}\\${Sketch_Month_d}\\Large\\${file_d}`));
            await CopyFile(`${path}\\${Sketch_Month_s}\\Large\\${file_s}`, `${path}\\${Sketch_Month_d}\\Large\\${file_d}`);
            await MKDir(`${path}\\${Sketch_Month_d}`);
            console.log(format('Copy photo From {0} to {1}', `${path}\\${Sketch_Month_s}\\${file_s}`, `${path}\\${Sketch_Month_d}\\${file_d}`));
            await CopyFile(`${path}\\${Sketch_Month_s}\\${file_s}`, `${path}\\${Sketch_Month_d}\\${file_d}`);
            await MKDir(`${path}\\${Sketch_Month_d}\\Thumb`);
            console.log(format('Copy photo From {0} to {1}', `${path}\\${Sketch_Month_s}\\Thumb\\${file_s}`, `${path}\\${Sketch_Month_d}\\Thumb\\${file_d}`));
            await CopyFile(`${path}\\${Sketch_Month_s}\\Thumb\\${file_s}`, `${path}\\${Sketch_Month_d}\\Thumb\\${file_d}`);
            await res.send("success");
          } catch (error) {
            console.log(error)
            res.status(503).send('Service Unavailable!')
          }
        }
        Smb2Practice()
      }
    })    
  }).catch((err)=>{
    console.log(err);
    res.status(500).send(err);
  }) 


});

//匯入樣品單細項
router.post('/Import_Technical_Sheet_Detail', function (req, res, next) {
  console.log("Call Import_Technical_Sheet_Detail Api Product_No:", req.body.Product_No);
  var strSQL = format(` Delete From Product_Technical_Sheet_Detail Where Product_No = '{0}';
      insert Product_Technical_Sheet_Detail ([Product_No] ,[Component_GroupID],[SortID],[ComponentID] ,[Component] ,[C_Rmk] ,[Material_Code] ,[MaterialID] ,[Material_DetailID] ,[Material] ,[Material_ColorID] ,[Color] ,[Remark])
      Select '{0}' as [Product_No] ,[Component_GroupID],[SortID],[ComponentID] ,[Component] ,[C_Rmk] ,[Material_Code] ,[MaterialID] ,[Material_DetailID] ,[Material] ,[Material_ColorID] ,[Color] ,[Remark]
      FROM Product_Technical_Sheet_Detail as p WITH (NoWait, Nolock) 
      Where Product_No = '{1}';

      Update Product set Technical_Sheet_Maker = isnull(Technical_Sheet_Maker, '${req.UserID}'), Technical_Sheet_Updater = '${req.UserID}', Technical_Sheet_Update = GetDate() 
      Where Product_No = '{0}';
      `, req.body.Product_No, req.body.selected.Product_No );

  db.sql(req.Enterprise, strSQL)
  .then((result)=>{
    res.send("success");
  }).catch((err)=>{
    console.log(err);
    res.status(500).send(err);
  })       

});

//匯入樣品單細項
router.post('/Import_Product_Process', function (req, res, next) {
  console.log("Call Import_Product_Process Api Product_No:", req.body.Product_No);
  var strSQL = format(` Declare @ROWCOUNT int = 0;
      Delete From Product_Process Where Product_No = '{0}';
      set @ROWCOUNT = @ROWCOUNT + case when @@ROWCOUNT > 0 then 1 else 0 end;

      insert Product_Process ([Product_No] ,[Style_ProcessID] ,[Component_PhotoID] ,[Memo] ,[Data_Updater] ,[Data_Update])
      Select '{0}' as [Product_No], p.[Style_ProcessID], p.[Component_PhotoID], p.[Memo], '${req.UserID}' as [Data_Updater], GetDate() as [Data_Update]
      FROM Product_Process as p WITH (NoWait, Nolock) 
      Where Product_No = '{1}' 
      and (Select count(*) From Product_Process Where Product_No = '{0}') = 0;

      set @ROWCOUNT = @ROWCOUNT + case when @@ROWCOUNT > 0 then 1 else 0 end;

      Update Product set Technical_Sheet_Maker = isnull(Technical_Sheet_Maker, '${req.UserID}'), Technical_Sheet_Updater = '${req.UserID}', Technical_Sheet_Update = GetDate() 
      Where Product_No = '{0}' and @ROWCOUNT > 0;

      Select case when @ROWCOUNT > 0 then 1 else 0 end as Flag;
      `, req.body.Product_No, req.body.selected.Product_No );
  //console.log(strSQL)
  db.sql(req.Enterprise, strSQL)
  .then((result)=>{
    //res.send("success");
    res.send({Flag:result.recordset[0].Flag, Name:'Process'});
  }).catch((err)=>{
    console.log(err);
    res.status(500).send(err);
  })       

});


// 點選加工部位說明圖檔後，新增一筆 Product_Process
router.post('/Add_Product_Process', function (req, res, next) {
  console.log("Call Add_Product_Process Api Product_No:", req.body.Product_No);
  req.body.UserID = req.UserID
  var strSQL = format(`
  begin try
    INSERT INTO [dbo].[Product_Process] ([Product_No], [Style_ProcessID], Data_Updater, Data_Update )
    Select '{Product_No}' as [Product_No], {Style_ProcessID} as [Style_ProcessID], '{UserID}' as [Data_Updater], Getdate() as Data_Update ;
    SELECT SCOPE_IDENTITY() AS Product_ProcessID;      
  end try
  begin catch
   SELECT Product_ProcessID from [dbo].[Product_Process] Where '{Product_No}' = [Product_No] and {Style_ProcessID} = [Style_ProcessID];     
  end catch   
      `, req.body);

  // console.log(strSQL)
  db.sql(req.Enterprise, strSQL)
  .then((result)=>{
    res.send(result.recordset);
  }).catch((err)=>{
    console.log(err);
    res.status(500).send(err);
  })       

});

/* Mark-Wang API End */


/* Darren-Chang API Begin */

// 上傳原始樣品單 image 檔案
router.post('/Spec_Sheet/:Product_No', upload.single('Product_No'), function (req, res, next) {
  console.log("Call Spec_Sheet Photo Save Api Product_No:", req.params.Product_No);
  req.params.UserID = req.UserID
  req.params.Sketch_Month = moment().format('YYMM')

  var strSQL = format(` Declare @Sketch_Month varchar(4)
  SELECT @Sketch_Month = isnull([Sketch_Month],'{Sketch_Month}') FROM Product WHERE Product_No = '{Product_No}'
  UPDATE Product SET [Sketch_Month] = @Sketch_Month, Orig_Sketch_Uploader = '{UserID}', Orig_Sketch_Upload = GetDate()
  WHERE Product_No = '{Product_No}'
  Select @Sketch_Month as Sketch_Month
  `,req.params);      

  db.sql(req.Enterprise, strSQL)
  .then((result)=>{
    console.log(`UPDATE Product_No: ${req.params.Product_No} Sketch_Month Done, ${result.rowsAffected} row(s) Affected.`)
    res.locals.Sketch_Month = result.recordset[0].Sketch_Month
    next();
  }).catch((err)=>{
    console.log(err);
    res.status(500).send(err);
  })       

}, function (req, res, next) {
  var smbDir = 'Documents\\Develop\\Spec_Sheet\\'
  var data = req.file.buffer;
  let Sketch_Month = res.locals.Sketch_Month

  smb2.exists(`${smbDir}${Sketch_Month}`, function (err, exists) { // 執行檢查資料夾及儲存圖片
    if (err) {
      console.log(err)
      smb2.disconnect();
      res.status(503).send('Service Unavailable!');
      return;
    } else if (exists) {
      smb2.writeFile(`${smbDir}${Sketch_Month}\\${req.params.Product_No}.jpg`, data, {flags: 'w'}, function (err) {
        if (err) {
          console.log(`${req.params.Product_No} writeFile Error!`);
          console.log(err);
          res.status(503).send('Service Unavailable!');
        } else {
          console.log(`${smbDir}${Sketch_Month}\\${req.params.Product_No}.jpg儲存成功`);
          res.send('upload ok');
        }
      });
    } else { // SpecSheet_Month 資料夾不存在
      smb2.mkdir(`${smbDir}${Sketch_Month}`, function (err) { // 建立 SpecSheet_Month 資料夾
        if (err) {
          console.log(err);
          smb2.disconnect();
          res.status(503).send('Service Unavailable!');
        } else {
          console.log(`SpecSheet_Month(${Sketch_Month}) Folder created!`);
          smb2.writeFile(`${smbDir}${Sketch_Month}\\${req.params.Product_No}.jpg`, data, {flags: 'w'}, function (err) {
            if (err) {
              console.log(`${req.params.Product_No} writeFile Error!`);
              console.log(err);
              res.status(503).send('Service Unavailable!');
            } else {
              console.log(`${smbDir}${Sketch_Month}\\${req.params.Product_No}.jpg 儲存成功`);
              res.send('upload ok');
            }
          });
        }
      });
    }
  })
});

// 取得原始樣品單 image 檔案路徑
router.get('/Spec_Sheet/:Product_No', function (req, res, next) {
  // var tempFileDir = "./upload/" + req.params.Product_No + ".pdf";
  // var data;
  // fs.existsSync(tempFileDir) == true ? data = fs.readFileSync(tempFileDir) : data = ''
  var smbDir = 'Documents\\Develop\\Spec_Sheet\\'
  var strSQL = format(`SELECT [Product_No], [Sketch_Month]
  , ISNULL('${WebServer.url}/datas/Documents/Develop/Spec_Sheet/' + Sketch_Month + '/' + Product_No + '.jpg?tmp=' + convert(varchar(20), getDate(),120), '') AS Photo
  FROM Product WHERE Product_No = '${req.params.Product_No}'`)

  db.sql(req.Enterprise, strSQL)
  .then((result)=>{
    res.send(result.recordset);
  }).catch((err)=>{
    console.log(err);
    res.status(500).send(err);
  })
  
});
// 取得原始樣品單 image 實體檔案
router.get('/Spec_Sheet/:Product_No/Data', function (req, res, next) {
  console.log('Call Spec_Sheet/Data API Product_No:', req.params.Product_No);
  // var tempFileDir = "./upload/" + req.params.Product_No + ".pdf";
  // var data;
  // fs.existsSync(tempFileDir) == true ? data = fs.readFileSync(tempFileDir) : data = ''
  var smbDir = 'Documents\\Develop\\Spec_Sheet\\'

  var strSQL = format(`SELECT [Product_No], [Sketch_Month]
  , ISNULL('${WebServer.url}/datas/Documents/Develop/Spec_Sheet/' + Sketch_Month + '/' + Product_No + '.jpg?tmp=' + convert(varchar(20), getDate(),120), '') AS Photo
  FROM Product WHERE Product_No = '${req.params.Product_No}'`)

  db.sql(req.Enterprise, strSQL)
  .then((result)=>{
    let Sketch_Month = result.recordset[0].Sketch_Month ? result.recordset[0].Sketch_Month : ''
    let blackImg = `R0lGODlhAQABAIAAAP///wAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw==`
    let blackBuffer = Buffer.from(blackImg, 'base64');
    smb2.exists(`${smbDir}${Sketch_Month}\\${req.params.Product_No}.jpg`, function (err, exists) {
      if (err) {
        console.log(err)
        smb2.disconnect();
        res.status(503).send('Service Unavailable!');
      } else {
        exists ? smb2.readFile(`${smbDir}${Sketch_Month}\\${req.params.Product_No}.jpg`, function (err, data) {
            if (err) console.log(err);
            res.type('.jpg');
            res.send(data);
          }) :
          res.send(blackBuffer);
      }
    })

  }).catch((err)=>{
    console.log(err);
    res.status(500).send(err);
  }) 

});
// 刪除原始樣品單 image 檔案
/**
router.delete('/Spec_Sheet/:Product_No', function (req, res, next) {
  // var tempFileDir = "./upload/" + req.params.Product_No + ".pdf";
  // fs.unlinkSync(tempFileDir)
  var smbDir = 'Documents\\Develop\\Spec_Sheet\\'

  sql.connect(db.Enterprise, function (err) {
    if (err)
      console.log(err);
    var request = new sql.Request();
    request.query(`SELECT [Product_No], [Sketch_Month]
       FROM Product WHERE Product_No = '${req.params.Product_No}'`, function (err, result) {
      sql.close();
      if (err) {
        res.status(500).send('Something Wrong!');
      } else if (result.rowsAffected[0]) { // 若資料庫有撈到值
        let Sketch_Month = result.recordset[0].Sketch_Month ? result.recordset[0].Sketch_Month : '' // 取得 Sketch_Month 的值
        smb2.exists(`${smbDir}${Sketch_Month}\\${req.params.Product_No}.jpg`, function (err, exists) {
          // console.log(`Sketch_Month: ${Sketch_Month}`)
          // console.log(`exists: ${exists}`)
          if (err) {
            res.status(503).send('Service Unavailable!');
            smb2.disconnect();
            return
          } else if (exists) {
            smb2.unlink(`${smbDir}${Sketch_Month}\\${req.params.Product_No}.jpg`, function (err) { // 若檔案存在就刪檔
              // if (err) {
              //   res.status(500).send('Something Wrong!');
              // } else {
              res.send('delete ok');
              // }
            })
          } else {
            res.status(500).send('Something Wrong!');
          }
        });
      } else {
        res.status(500).send('Something Wrong!');
      }
    });
  });

  sql.connect(db.Enterprise, function (err) {
    if (err)
      console.log(err);
    var request = new sql.Request();
    request.query(`SELECT [Product_No], [Sketch_Month]
       FROM Product WHERE Product_No = '${req.params.Product_No}'`, function (err, result) {
      sql.close();
      if (err) {
        console.log(err);
        res.status(500).send('Something Wrong!');
      } else if (result.rowsAffected[0]) { // 若資料庫有撈到值
        let Sketch_Month = result.recordset[0].Sketch_Month ? result.recordset[0].Sketch_Month : '' // 取得 Sketch_Month 的值
        smb2.exists(`${smbDir}${Sketch_Month}\\${req.params.Product_No}.jpg`, function (err, exists) {
          if (err) {
            console.log(err);
            res.status(500).send('Something Wrong!');
          } else if (exists) {
            smb2.unlink(`${smbDir}${Sketch_Month}\\${req.params.Product_No}.jpg`, function (err) {
              if (err) {
                console.log(err)
                res.status(500).send('Something Wrong!');
              } else {
                console.log(`${smbDir}${Sketch_Month}\\${req.params.Product_No}.jpg 刪除成功`);
                res.send('delete Spec_Sheet Done');
              }
            })
          } else {
            res.status(500).send('Something Wrong!');
          }
        });
      } else {
        res.status(500).send('Something Wrong!');
      }
    });
  });
});
*/
// 取得 Material 的全部資料
router.get('/Sample_Sheet_Detail_Edit/Material', function (req, res, next) {
  // console.log('Call Get All Material API Product_No:', req.params.Product_No)
  var strSQL = format(`SELECT [MaterialID]  ,[Material_Category]  ,[L2_Material_Category]  ,[Material_ControlID]  ,[Unit]  ,[Packing_Unit]  ,[History_Date]  ,[Material_Category]+' ('+[L2_Material_Category]+')' AS Combine
  FROM Material
  ORDER by Material_Category`)

  db.sql(req.Enterprise, strSQL)
  .then((result)=>{
    res.send(result.recordset);
  }).catch((err)=>{
    console.log(err);
    res.status(500).send(err);
  })

});

// 取得 Material_Detail 的全部資料（限定 MaterialID）
router.get('/Sample_Sheet_Detail_Edit/Material/:MaterialID', function (req, res, next) {
  // console.log('Call Get All Material_Detail API MaterialID:', req.params.MaterialID)

  var strSQL = format(` SELECT [Material_DetailID]  ,[MaterialID]  ,[Material_Specific]  ,[L2_Material_Specific]  ,[L3_Material_Specific]  ,[Date]  ,[Update_User]  ,[History_Date]  ,[History_User]  
  FROM Material_Detail  WHERE MaterialID = '{MaterialID}' And (isnull(History_Date,'') = '') `, req.params)

  db.sql(req.Enterprise, strSQL)
  .then((result)=>{
    res.send(result.recordset);
  }).catch((err)=>{
    console.log(err);
    res.status(500).send(err);
  })

});

 // 取得 Product_Component_Group 的頁籤資料
router.get('/Sample_Sheet_Detail_Edit/Product_Component_Group/:Product_No', function (req, res, next) {
  console.log('Call Product_Component_Group, Product_No:', req.params.Product_No)

  var strSQL = format(`SELECT [Component_GroupID] ,[Component_Group] ,[SortID]
                        FROM Product_Component_Group as pcg WITH (NoLock, NoWait)
                        LEFT JOIN Style as s WITH (NoLock, NoWait) on CHARINDEX(s.Product_Type, pcg.Product_Type) > 0
                        LEFT JOIN Product as p WITH (NoLock, NoWait) on p.Style_No = s.Style_No
                        WHERE p.Product_No = '{Product_No}'
                        ORDER BY SortID `, req.params)
  // console.log(strSQL)
  db.sql(req.Enterprise, strSQL)
  .then((result)=>{
    res.send(result.recordset);
  }).catch((err)=>{
    console.log(err);
    res.status(500).send(err);
  })
});

// 取得 Product_Component 的資料（限定 Component_GroupID）
router.get('/Sample_Sheet_Detail_Edit/Product_Component/:Component_GroupID', function (req, res, next) {
  // console.log('Call Get All Product_Component API Component_GroupID:', req.params.Component_GroupID)

  var strSQL = format(`SELECT [ComponentID], [Component], [L2_Component], CONVERT([nvarchar] ,[ComponentID])+'_'+[Component]+' ('+[L2_Component]+')' as Combine 
  FROM Product_Component 
  WHERE ${req.params.Component_GroupID == 0 ? '1=1' : 'Component_GroupID = {Component_GroupID}'}  
  `, req.params)

  // console.log(strSQL)
  db.sql(req.Enterprise, strSQL)
  .then((result)=>{
    res.send(result.recordset);
  }).catch((err)=>{
    console.log(err);
    res.status(500).send(err);
  })

});

// 取得 Product_Technical_Sheet_Detail 的所有資料（限定 Product_No 及 Component_GroupID）
router.get('/Sample_Sheet_Detail_Edit/:Product_No/:Component_GroupID', function (req, res, next) {

  var strSQL = format(`SELECT Sheet_DetailID, Product_No, Component_GroupID, SortID, ComponentID, Component, C_Rmk, 
  (Component + case when len(isnull(C_Rmk,'')) = 0 then '' else ' ('+ C_Rmk +')' end)  as Component_Rmk, 
  Material_Code, p.Material_DetailID, Material, p.MaterialID, p.Material_ColorID, Color, p.Remark, ISNULL(mc.Composite, 0) as Composite,
  case when md.Material_DetailID IS NOT NULL or p.Material_DetailID IS NULL then 'true' else 'false' end as isDetailIDExist,
  case when mc.Material_ColorID IS NOT NULL or p.Material_ColorID IS NULL then 'true' else 'false' end as isColorIDExist
  FROM Product_Technical_Sheet_Detail as p
  LEFT JOIN Material_Detail as md
  ON p.Material_DetailID = md.Material_DetailID
  LEFT JOIN Material_Color as mc
  ON p.Material_ColorID = mc.Material_ColorID
  Where Product_No = '{Product_No}' and (Component_GroupID = {Component_GroupID} OR Component_GroupID IS NULL)
  Order By SortID`, req.params)

  db.sql(req.Enterprise, strSQL)
  .then((result)=>{
    res.send(result.recordset);
  }).catch((err)=>{
    console.log(err);
    res.status(500).send(err);
  })

});

// 增加新的一筆資料
router.post('/Sample_Sheet_Detail_Edit/:Product_No/:Component_GroupID', function (req, res, next) {

  req.body.PTSD.UserID = req.UserID
  req.body.PTSD.Product_No = req.params.Product_No
  req.body.PTSD.Component_GroupID = req.params.Component_GroupID
  var strSQL = format(`INSERT INTO Product_Technical_Sheet_Detail 
        ([Product_No],[Component_GroupID],[SortID],[ComponentID],[Component],[C_Rmk],[Material_Code]
        ,[Material_DetailID],[MaterialID],[Material],[Material_ColorID],[Color],[Remark]) VALUES 
        ('{Product_No}', '{Component_GroupID}','{SortID}','{ComponentID}','{Component}', N'{C_Rmk}', '{Material_Code}',
        '{Material_DetailID}','{MaterialID}', N'{Material}', '{Material_ColorID}', N'{Color}', N'{Remark}');

        Update Product SET Technical_Sheet_Maker = isnull(Technical_Sheet_Maker, '{UserID}'), Technical_Sheet_Updater = '{UserID}', Technical_Sheet_Update = Getdate() 
        WHERE Product_No = '{Product_No}';     
        
        SELECT Sheet_DetailID, Product_No, Component_GroupID, SortID, ComponentID, Component, C_Rmk, (Component + case when len(isnull(C_Rmk,'')) = 0 then '' else ' ('+ C_Rmk +')' end)  as Component_Rmk, Material_Code, Material_DetailID, Material, [Material_ColorID], MaterialID, Color, Remark FROM Product_Technical_Sheet_Detail 
        WHERE Product_No = '{Product_No}' and Component_GroupID = '{Component_GroupID}' 
        order by SortID
        `, req.body.PTSD);      

  db.sql(req.Enterprise, strSQL)
  .then((result)=>{
    res.send(result.recordset);
  }).catch((err)=>{
    console.log(err);
    res.status(500).send(err);
  })

});

// 表格內編輯的資料更新，整列 Sort ID 一起更新
router.post('/Sample_Sheet_Detail_Edit/dataUpdate', function (req, res, next) {
  console.log('Call dataUpdate API Product_No:', req.body.Product_No)
    req.body.Component = req.body.Component ? `N'${req.body.Component.replace(/'/g, "''")}'` : `''`
    req.body.Material = req.body.Material ? `N'${req.body.Material.replace(/'/g, "''")}'` : `'-'`
    req.body.Color = req.body.Color ? `N'${req.body.Color.replace(/'/g, "''")}'` : `''`
    req.body.Remark = req.body.Remark ? `N'${req.body.Remark.replace(/'/g, "''")}'` : `''`
    req.body.UserID = req.UserID

    var strSQL = format(`UPDATE Product_Technical_Sheet_Detail 
          SET Component = {Component}, Material = {Material}, Color = {Color}, Remark = {Remark}
          WHERE Sheet_DetailID = {Sheet_DetailID}; \r\n

          Update Product SET Technical_Sheet_Maker = isnull(Technical_Sheet_Maker, '{UserID}'), Technical_Sheet_Updater = '{UserID}', Technical_Sheet_Update = Getdate() 
    WHERE Product_No = '{Product_No}'; \r\n
           `, req.body);
    //console.log(strSQL);
    db.sql(req.Enterprise, strSQL)
    .then((result)=>{
      console.log(`Update Done, ${result.rowsAffected} row Affected.`)
      res.send('update ok')
    }).catch((err)=>{
      console.log(err);
      res.status(500).send(err);
    })

});

// 拖曳後的資料更新，只更新 SortID 排序
router.post('/Sample_Sheet_Detail_Edit/:Product_No/:Component_GroupID/dragUpdate', function (req, res, next) {
  console.log(`Call dragUpdate API Product_No:`, req.params.Product_No)
  req.body.Product_No = req.params.Product_No
  req.body.Component_GroupID = req.params.Component_GroupID == 0 ? 'IS NULL' : ` = ${req.params.Component_GroupID}`

  var strSQLA = format(`UPDATE Product_Technical_Sheet_Detail SET SortID = '{newSortID}'
                         WHERE (Sheet_DetailID = '{Sheet_DetailID}')`, req.body);
  var strSQLB = ''
  if (req.body.oldSortID > req.body.newSortID) { // 舊>新，代表由後往前拉
    strSQLB = format(`UPDATE Product_Technical_Sheet_Detail SET SortID = SortID+1 
        WHERE (Product_No = '{Product_No}') AND (SortID BETWEEN '{newSortID}' AND '{oldSortID}') 
        AND (Component_GroupID {Component_GroupID}) AND (Sheet_DetailID <> '{Sheet_DetailID}')`, req.body);
  } else { // 由前往後拉
    req.body.oldSortID++
    strSQLB = format(`UPDATE Product_Technical_Sheet_Detail SET SortID = SortID-1 
        WHERE (Product_No = '{Product_No}') AND (SortID BETWEEN '{oldSortID}' AND '{newSortID}') 
        AND (Component_GroupID {Component_GroupID}) AND (Sheet_DetailID <> '{Sheet_DetailID}')`, req.body);
  }

  var strSQLC = format(` Update Product SET Technical_Sheet_Maker = isnull(Technical_Sheet_Maker, '${req.UserID}'), Technical_Sheet_Updater = '${req.UserID}', Technical_Sheet_Update = Getdate() 
  WHERE Product_No = '{Product_No}'; \r\n `, req.body);

  strSQLC += format(`SELECT Sheet_DetailID, Product_No, Component_GroupID, SortID, ComponentID, Component, C_Rmk, 
  (Component + case when len(isnull(C_Rmk,'')) = 0 then '' else ' ('+ C_Rmk +')' end)  as Component_Rmk, 
  Material_Code, p.Material_DetailID, Material, p.MaterialID, p.Material_ColorID, Color, p.Remark, ISNULL(mc.Composite, 0) as Composite,
  case when md.Material_DetailID IS NOT NULL or p.Material_DetailID IS NULL then 'true' else 'false' end as isDetailIDExist,
  case when mc.Material_ColorID IS NOT NULL or p.Material_ColorID IS NULL then 'true' else 'false' end as isColorIDExist
  FROM Product_Technical_Sheet_Detail as p
  LEFT JOIN Material_Detail as md
  ON p.Material_DetailID = md.Material_DetailID
  LEFT JOIN Material_Color as mc
  ON p.Material_ColorID = mc.Material_ColorID
  Where Product_No = '{Product_No}' and (Component_GroupID = {Component_GroupID} OR Component_GroupID IS NULL)
  Order By SortID; `, req.params);

  db.sql(req.Enterprise, strSQLA)
  .then((result)=>{
      db.sql(req.Enterprise, strSQLB)
      .then((result)=>{
          console.log(`Dragged Done, ${result.rowsAffected} row(s) Affected.`)      
          db.sql(req.Enterprise, strSQLC)
          .then((result)=>{ res.send(result.recordset) })
          .catch((err)=>{console.log(err); res.status(500).send(err); })  
      }).catch((err)=>{
        console.log(err);
        res.status(500).send(err);
      })     
  }).catch((err)=>{
    console.log(err);
    res.status(500).send(err);
  })

});
// 拖曳頁籤後的資料更新，更新 Component_GroupID 及 SortID 並排序
router.post('/Sample_Sheet_Detail_Edit/:Product_No/:Component_GroupID/dragTabUpdate', function (req, res, next) {
  console.log(`Call dragTabUpdate API Product_No:`, req.params.Product_No)
  req.body.Product_No = req.params.Product_No
  req.body.oldGroupID = req.params.Component_GroupID == 0 ? 'IS NULL' : ` = ${req.params.Component_GroupID}` // url 傳來的
  req.body.newGroupID = req.body.Component_GroupID 
  req.body.UserID = req.UserID
  // 前端 post 傳來的
  var strSQL = format(`UPDATE Product_Technical_Sheet_Detail 
  SET SortID = (Select isnull(MAX(SortID),0) +1 From Product_Technical_Sheet_Detail Where Product_No = '{Product_No}' And Component_GroupID = {Component_GroupID}),
      Component_GroupID = {newGroupID}
  WHERE (Sheet_DetailID = {Sheet_DetailID}); \r\n
  
  Update Product_Technical_Sheet_Detail SET SortID = tmp.SortID
    From Product_Technical_Sheet_Detail p
      Inner Join (SELECT row_number() Over(Order By SortID) AS SortID, Sheet_DetailID
                    FROM Product_Technical_Sheet_Detail AS p with(NoLock, NoWait)
                    WHERE Product_No = '{Product_No}' 
                    AND Component_GroupID {oldGroupID} ) AS tmp 
                    ON tmp.Sheet_DetailID = p.Sheet_DetailID; \r\n 
  Update Product SET Technical_Sheet_Maker = isnull(Technical_Sheet_Maker, '{UserID}'), Technical_Sheet_Updater = '{UserID}', Technical_Sheet_Update = Getdate() 
  WHERE Product_No = '{Product_No}'; \r\n `, req.body);
              

  strSQL += format(`SELECT Sheet_DetailID, Product_No, Component_GroupID, SortID, ComponentID, Component, C_Rmk, 
  (Component + case when len(isnull(C_Rmk,'')) = 0 then '' else ' ('+ C_Rmk +')' end)  as Component_Rmk, 
  Material_Code, p.Material_DetailID, Material, p.MaterialID, p.Material_ColorID, Color, p.Remark, ISNULL(mc.Composite, 0) as Composite,
  case when md.Material_DetailID IS NOT NULL or p.Material_DetailID IS NULL then 'true' else 'false' end as isDetailIDExist,
  case when mc.Material_ColorID IS NOT NULL or p.Material_ColorID IS NULL then 'true' else 'false' end as isColorIDExist
  FROM Product_Technical_Sheet_Detail as p
  LEFT JOIN Material_Detail as md
  ON p.Material_DetailID = md.Material_DetailID
  LEFT JOIN Material_Color as mc
  ON p.Material_ColorID = mc.Material_ColorID
  Where Product_No = '{Product_No}' and (Component_GroupID = {Component_GroupID} OR Component_GroupID IS NULL)
  Order By SortID; `, req.params);

    db.sql(req.Enterprise, strSQL)
    .then((result)=>{
      res.send(result.recordset);
    }).catch((err)=>{
      console.log(err);
      res.status(500).send(err);
    })

});

// 刪除指定的 Sort ID，並且補齊排序空格，原先要使用 Delete Method，但 Delete 沒辦法傳參數
router.post('/Sample_Sheet_Detail_Edit/:Product_No/:Component_GroupID/dataDelete', function (req, res, next) {
  console.log(`Call dataDelete API Product_No:`, req.params.Product_No)
  req.body.Product_No = req.params.Product_No
  req.body.Component_GroupID = req.params.Component_GroupID == 0 ? 'IS NULL' : ` = ${req.params.Component_GroupID}`
  req.body.UserID = req.UserID
var strSQL = format(`DELETE FROM Product_Technical_Sheet_Detail
  WHERE (Sheet_DetailID = '{Sheet_DetailID}') AND (Product_No = '{Product_No}'); \r\n 
  
Update Product_Technical_Sheet_Detail SET SortID = tmp.SortID
 From Product_Technical_Sheet_Detail p
 Inner Join 
 (SELECT row_number() Over(Order By SortID) AS SortID, Sheet_DetailID
 FROM Product_Technical_Sheet_Detail AS p with(NoLock, NoWait)
 WHERE Product_No = '{Product_No}' 
 AND Component_GroupID {Component_GroupID} ) AS tmp 
 ON tmp.Sheet_DetailID = p.Sheet_DetailID; \r\n 

 Update Product SET Technical_Sheet_Maker = isnull(Technical_Sheet_Maker, '{UserID}'), Technical_Sheet_Updater = '{UserID}', Technical_Sheet_Update = Getdate() 
WHERE Product_No = '{Product_No}'; \r\n `, req.body);
 
strSQL += format(`SELECT Sheet_DetailID, Product_No, Component_GroupID, SortID, ComponentID, Component, C_Rmk, (Component + case when len(isnull(C_Rmk,'')) = 0 then '' else ' ('+ C_Rmk +')' end)  as Component_Rmk, Material_Code, Material_DetailID, Material, MaterialID, Material_ColorID, Color, Remark FROM Product_Technical_Sheet_Detail 
  WHERE Product_No = '{Product_No}' and (Component_GroupID = {Component_GroupID} OR Component_GroupID IS NULL)
  order by SortID`, req.params);

  db.sql(req.Enterprise, strSQL)
  .then((result)=>{
    res.send(result.recordset);
  }).catch((err)=>{
    console.log(err);
    res.status(500).send(err);
  })

});

// 刪除全部 sample sheet 資料
router.delete('/Sample_Sheet_Detail_Edit/:Product_No', function (req, res, next) {
  console.log('Call delete All Data API Product_No:', req.params.Product_No)
  req.params.UserID = req.UserID
  var strSQL = format(`DELETE FROM Product_Technical_Sheet_Detail WHERE Product_No = '{Product_No}';
  Update Product SET Technical_Sheet_Maker = isnull(Technical_Sheet_Maker, '{UserID}'), Technical_Sheet_Updater = '{UserID}', Technical_Sheet_Update = Getdate() 
  WHERE Product_No = '{Product_No}';         
        `, req.params);    

  db.sql(req.Enterprise, strSQL)
  .then((result)=>{
    console.log(`Delete sample sheet detail Done, ${result.rowsAffected} row Affected.`)
    res.send('Delete All ok')
  }).catch((err)=>{
    console.log(err);
    res.status(500).send(err);
  })
      
});

// 儲存圖片
router.post('/Sketch_Edit/:Product_No/', function (req, res, next) {
  console.log('Call Sketch_Edit Save_Photo API Product_No:', req.params.Product_No)
  req.params.Sketch_Month = moment().format('YYMM')
  req.params.UserID = req.UserID
  var strSQL = format(` Declare @Sketch_Month varchar(4)
  SELECT @Sketch_Month = isnull([Sketch_Month],'{Sketch_Month}') FROM Product WHERE Product_No = '{Product_No}'
  UPDATE Product SET [Sketch_Month] = @Sketch_Month, Sketch_Uploader = '{UserID}', Sketch_Upload = GetDate()
  WHERE Product_No = '{Product_No}'
  Select @Sketch_Month as Sketch_Month
  `,req.params);    
//console.log(strSQL)
  db.sql(req.Enterprise, strSQL)
  .then((result)=>{
    res.locals.Sketch_Month = result.recordset[0].Sketch_Month
    next();
  }).catch((err)=>{
    console.log(err);
    res.status(500).send(err);
  })
}, function (req, res, next) {
  var smbDir = 'Images\\Products\\Sketches\\'
  var imgData = req.body.largeImg;
  var base64Data = imgData.replace(/^data:image\/\w+;base64,/, "");
  var sourceBuffer = Buffer.from(base64Data, 'base64');
  var Sketch_Month = res.locals.Sketch_Month

  smb2.exists(`${smbDir}`, function (err, exists) { // 執行檢查資料夾及建立檔案
    if (err) {
      console.log(err)
      smb2.disconnect();
      res.status(503).send('Service Unavailable!')
    } else {
      const Smb2Practice = async () => {
        try {
          await folderCreate(smbDir, Sketch_Month)
          await imgWriteFile(smbDir, Sketch_Month)
          res.send('upload ok')
        } catch(error) {
          console.log(error)
          res.status(503).send('Service Unavailable!');
        }
      }
      Smb2Practice();
    }
  });

  // methods:
  function folderCreate(smbDir, Sketch_Month) {
    return new Promise(function (resolve, reject) {
      smb2.exists(`${smbDir}${Sketch_Month}`, function (err, exists) { // 先作所有的資料夾檢查
        if (err) reject(err)
        if (!exists) { // 如果 Sketch_Month 資料夾不存在
          smb2.mkdir(`${smbDir}${Sketch_Month}`, function (err) { // 建立 Sketch_Month 資料夾
            if (err) reject(err)
            console.log(`Sketch_Month(${Sketch_Month}) Folder created!`);
          });
          smb2.mkdir(`${smbDir}${Sketch_Month}\\Large`, function (err) { // 建立 Sketch_Month/Large 資料夾
            if (err) reject(err)
            console.log('Large Folder created!');
          });
          smb2.mkdir(`${smbDir}${Sketch_Month}\\Thumb`, function (err) { // 建立 Sketch_Month/Thumb 資料夾
            if (err) reject(err)
            console.log('Thumb Folder created!');
            resolve();
          });
        } else { // 如果 Sketch_Month 資料夾存在，則檢查 Large/Thumb 資料夾
          smb2.exists(`${smbDir}${Sketch_Month}\\Large`, function (err, existL) { // 檢查 Sketch_Month/Large 資料夾
            if (err) reject(err)
            smb2.exists(`${smbDir}${Sketch_Month}\\Thumb`, function (err, existT) {
              if (err) reject(err)
              if (existL && existT) { // 若兩個資料夾都在，就回傳 resolve
                resolve();
              } else if (!existL && existT) { // 若沒有 Large 資料夾，就建立
                smb2.mkdir(`${smbDir}${Sketch_Month}\\Large`, function (err) { // 建立 Sketch_Month/Large 資料夾
                  if (err) reject(err)
                  console.log('Large Folder created!');
                  resolve();
                });
              } else if (existL && !existT) { // 若沒有 Thumb 資料夾，就建立
                smb2.mkdir(`${smbDir}${Sketch_Month}\\Thumb`, function (err) { // 建立 Sketch_Month/Thumb 資料夾
                  if (err) reject(err)
                  console.log('Thumb Folder created!');
                  resolve();
                });
              } else { // 若 L/T 都不存在，就都建立
                smb2.mkdir(`${smbDir}${Sketch_Month}\\Large`, function (err) { // 建立 Sketch_Month/Large 資料夾
                  if (err) reject(err)
                  console.log('Large Folder created!');
                  smb2.mkdir(`${smbDir}${Sketch_Month}\\Thumb`, function (err) { // 建立 Sketch_Month/Thumb 資料夾
                    if (err) reject(err)
                    console.log('Thumb Folder created!');
                    resolve();
                  });
                });
              }
            });
          });
        }
      });
    })
  }
  function imgWriteFile(smbDir, Sketch_Month) {
    // return new Promise(function (resolve, reject) {
    let largeBuffer = new Promise((resolve, reject) => {
      sharp(sourceBuffer).resize(2400, 2400, {
        fit: sharp.fit.inside, withoutEnlargement: true // 若原圖尺寸沒超過設定的大小，則不壓縮
      }).jpeg( {quality: 85} ).toBuffer().then(L_Buffer => {
        smb2.writeFile(`${smbDir}${Sketch_Month}\\Large\\${req.params.Product_No}.jpg`, L_Buffer, {flags: 'w'}, function (err) {
          if (err) {
            reject(err)
          } else {
            console.log(req.params.Product_No, Sketch_Month, "Sketch largeImg 儲存成功");
            resolve();
          }
        });
      });
    }); 
    let mediumBuffer = new Promise((resolve, reject) => {
      sharp(sourceBuffer).resize(480, 480, {
        fit: sharp.fit.inside, withoutEnlargement: true // 若原圖尺寸沒超過設定的大小，則不壓縮
      }).jpeg( {quality: 85} ).toBuffer().then(M_Buffer => {
        smb2.writeFile(`${smbDir}${Sketch_Month}\\${req.params.Product_No}.jpg`, M_Buffer, {flags: 'w'}, function (err) {
          if (err) {
            console.log(err);
            reject(err)
          } else {
            console.log(req.params.Product_No, Sketch_Month, "Sketch mediumImg 儲存成功");
            resolve();
          }
        });
      });
    }); 
    let thumbBuffer = new Promise((resolve, reject) => {
      sharp(sourceBuffer).resize(120, 120, {
        fit: sharp.fit.inside, withoutEnlargement: true // 若原圖尺寸沒超過設定的大小，則不壓縮
      }).jpeg( {quality: 85} ).toBuffer().then(T_Buffer => {
        smb2.writeFile(`${smbDir}${Sketch_Month}\\Thumb\\${req.params.Product_No}.jpg`, T_Buffer, {flags: 'w'}, function (err) {
          if (err) {
            console.log(err);
            reject(err)
          } else {
            console.log(req.params.Product_No, Sketch_Month, "Sketch thumbImg 儲存成功");
            resolve();
          }
        });
      });
    }); 
    return new Promise(function (resolve, reject) {
      Promise.all([largeBuffer, mediumBuffer, thumbBuffer]).then(results => {
        resolve();
      }).catch(err => { 
        console.log(err)
        reject();
      });
    })
  }

});

// 取得 Sketch 圖片
router.get('/Sketch_Edit/:Product_No/', function (req, res, next) {
  console.log('Call Sketch_Edit');
  var smbDir = 'Images\\Products\\Sketches\\'
  var blackImg = `R0lGODlhAQABAIAAAP///wAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw==`
  var blackBuffer = Buffer.from(blackImg, 'base64');
  var strSQL = format(`SELECT [Sketch_Month] FROM Product WHERE Product_No = '${req.params.Product_No}'`)

  db.sql(req.Enterprise, strSQL)
  .then((result)=>{
    let Sketch_Month = result.recordset[0].Sketch_Month ? result.recordset[0].Sketch_Month : ''
    
    smb2.exists(`${smbDir}${Sketch_Month}\\Large\\${req.params.Product_No}.jpg`, function (err, exists) {
      if (err) {
        console.log(err);
        res.send(blackBuffer);
      } else if (exists) {
        smb2.readFile(`${smbDir}${Sketch_Month}\\Large\\${req.params.Product_No}.jpg`, function (err, data) {
          if (err) {
            console.log(err);
            res.send(blackBuffer);
          } else {
            res.type('.jpg');
            res.send(data);
          }
        })
      } else {
        res.send(blackBuffer);
      }
    })    

  }).catch((err)=>{
    console.log(err);
    res.send(blackBuffer);
  })
  
});

// 刪除 Product_Process 資料表內的 PhotoID 
router.post('/Delete_Product_ProcessPhoto/:Product_No/', function (req, res, next) {
  console.log("Call Delete_Product_ProcessPhoto Api Product_No:", req.params.Product_No);
  req.body.UserID = req.UserID

  var strSQL = format(`Update Product_Process set Component_PhotoID = Null, Data_Updater = '{UserID}', Data_Update = GetDate()
  Where Product_ProcessID = {Product_ProcessID};
  `, req.body);

  // console.log(strSQL)
  db.sql(req.Enterprise, strSQL)
  .then((result)=>{
    res.send("delete ok");
  }).catch((err)=>{
    console.log(err);
    res.status(500).send(err);
  })       
});

/* Darren-Chang API End */

module.exports = router;