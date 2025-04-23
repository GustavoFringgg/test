var express = require('express');
var router = express.Router();
var moment = require('moment');
const format = require('string-format');
var db = require('../../config/DB_Connect');



/* Mark-Wang API Begin */

//取得Style資料
router.post('/Import_By_Style', function (req, res, next) {
   console.log("Call Import_By_Style Api:", req.body);
 
   req.body.Style_No = req.body.Style_No ? req.body.Style_No.replace(/'/g, "''") : '';
 
   var strSQL = format(` SELECT s.Style_No
   FROM [dbo].[Style] s WITH (NoWait, Nolock) 
   Inner Join Product_Size_Match sm WITH (NoWait, Nolock) on sm.Style_No = s.Style_No
   Where Pattern_No = (Select Pattern_No From Style s1 WITH (NoWait, Nolock) Where s1.Style_No = N'{Style_No}')
   And s.Style_No <> N'{Style_No}'
   Group by s.Style_No
   `, req.body);
 
   //console.log(strSQL)
   db.sql(req.Enterprise, strSQL)
   .then((result)=>{
     //console.log(result)
     res.send(result.recordset);
   }).catch((err)=>{
     console.log(err);
     res.status(500).send(err);
   })
 });

//Get Style_Size_Match_Info
router.post('/Style_Size_Match_Info',  function (req, res, next) {
  console.log("Call Style_Size_Match_Info Api:",req.body); 
  var strSQL = "";
  req.body.Style_No = req.body.Style_No ? `N'${req.body.Style_No.replace(/'/g, "''")}'` : `''`;

  strSQL = format(`
   Declare @tmpTable table (SizeID real, Size_Name varchar(10));

   Insert @tmpTable
   Select SizeID, Size_Name From Product_Size with(NoLock,NoWait);

   Select [Product_Structure_SizeID]
   , [Shoe_Size] as [SizeID]
   , (Select Size_Name From @tmpTable t Where t.SizeID = p.[Shoe_Size]) as [Shoe_Size]
   ,  (Select Size_Name From @tmpTable t Where t.SizeID = p.[Cutting_Die_Size]) as [Cutting_Die_Size]
   ,  (Select Size_Name From @tmpTable t Where t.SizeID = p.[Last_Size]) as [Last_Size]
   ,  (Select Size_Name From @tmpTable t Where t.SizeID = p.[Outsole_Size]) as [Outsole_Size]
   ,  (Select Size_Name From @tmpTable t Where t.SizeID = p.[Middle_Sole_Size]) as [Middle_Sole_Size]
   ,  (Select Size_Name From @tmpTable t Where t.SizeID = p.[Counter_Size]) as [Counter_Size]
   , [Prerange]
   FROM [dbo].[Product_Size_Match] p with(NoLock,NoWait)
   Where Style_No = {Style_No};

   Select Style_No
   , Gender
   , Size_Mode
   , Sample_Size
   , Size_Run
   , Size_Match_Updater
   , convert(varchar(20), Size_Match_Update, 120) as Size_Match_Update
   FROM [dbo].[Style] with(NoLock,NoWait)
   Where Style_No = {Style_No};
  `,req.body);

  db.sql(req.Enterprise, strSQL)
  .then( (result)=>{
     //console.log(result.recordsets[0])
     res.send({Size_Match_Info:result.recordsets[0], Style_Info:result.recordsets[1]});
  }).catch((err)=>{
    console.log(err);
    res.status(500).send(err);
  }) 


});

//Maintain Style Size Match
router.post('/Style_Size_Match_Maintain',  function (req, res, next) {
  console.log("Call Style_Size_Match_Maintain Api:",req.body); 
  var strSQL = "";
  
  // req.body.Mode === 0 表示新增 
  // req.body.Mode === 1 表示修改
  // req.body.Mode === 2 表示刪除
  // req.body.Mode === 3 表示刪除全部
  // req.body.Mode === 4 表示Fill-UP All
  // req.body.Mode === 5 表示Fill-UP One field Asd or Dec
  // req.body.Mode === 6 表示由其他型體匯入
  req.body.Style_No = req.body.Style_No ? `N'${req.body.Style_No.replace(/'/g, "''")}'` : `''`;      
 
  strSQL = format(`
  Declare @RowCount int= 0;
  `,req.body);

   switch(req.body.Mode){      
      case 0:
         var strSQL1 = '';

         req.body.Size.forEach((item)=>{
            strSQL1 += format(`Insert into @tmpTable (Size) values ({0});`,item)
         })

         strSQL += format(`
            Declare @tmpTable table(RecNo int IDENTITY(1,1), Size real)

            ${strSQL1}

            Insert into [Product_Size_Match] (Style_No, Shoe_Size, Cutting_Die_Size, Last_Size, Outsole_Size, Middle_Sole_Size, Counter_Size, Prerange)
            Select {Style_No} as Style_No, t.Size as Shoe_Size, t.Size as Cutting_Die_Size, t.Size as Last_Size, t.Size as Outsole_Size, t.Size as Middle_Sole_Size, t.Size as Counter_Size, 0 as Prerange
            From @tmpTable t
            Left outer Join Product_Size_Match os WITH (NoWait, Nolock) on t.Size = os.Shoe_Size And os.Style_No = {Style_No}
            Where os.Shoe_Size is null;
            set @RowCount = @@ROWCOUNT;
            `,req.body);
      break;
      case 1:
         strSQL += format(`
            Update [Product_Size_Match] Set [{Name}] = {Value}
            where Product_Structure_SizeID = {Product_Structure_SizeID}
            ${req.body.Name == 'Shoe_Size' ? 'And (Select count(Shoe_Size) From [Product_Size_Match] Where Shoe_Size = {Value} And Style_No = {Style_No}) = 0':''};
            set @RowCount = @@ROWCOUNT;
         `,req.body);
      break;
      case 2:
         strSQL += format(`
            Delete From Product_Size_Match 
            Where Product_Structure_SizeID = {Product_Structure_SizeID};
            set @RowCount = @@ROWCOUNT;
         `,req.body);
      break;
      case 3:
         strSQL += format(`
            Delete From Product_Size_Match
            Where Style_No = {Style_No};
            set @RowCount = @@ROWCOUNT;
      `,req.body);
      break;
      case 4:
         strSQL += format(`
            Update [Product_Size_Match] Set 
            Cutting_Die_Size = case when (Shoe_Size + {Value}) < -10 then -10 else case when (Shoe_Size + {Value}) > 54 then 54 else case when (Shoe_Size + {Value}) < 1 then Round((Shoe_Size + {Value}),0) else (Shoe_Size + {Value}) end  end end,
            Last_Size = case when (Shoe_Size + {Value}) < -10 then -10 else case when (Shoe_Size + {Value}) > 54 then 54 else case when (Shoe_Size + {Value}) < 1 then Round((Shoe_Size + {Value}),0) else (Shoe_Size + {Value}) end  end end,
            Outsole_Size = case when (Shoe_Size + {Value}) < -10 then -10 else case when (Shoe_Size + {Value}) > 54 then 54 else case when (Shoe_Size + {Value}) < 1 then Round((Shoe_Size + {Value}),0) else (Shoe_Size + {Value}) end  end end,
            Middle_Sole_Size = case when (Shoe_Size + {Value}) < -10 then -10 else case when (Shoe_Size + {Value}) > 54 then 54 else case when (Shoe_Size + {Value}) < 1 then Round((Shoe_Size + {Value}),0) else (Shoe_Size + {Value}) end  end end,
            Counter_Size = case when (Shoe_Size + {Value}) < -10 then -10 else case when (Shoe_Size + {Value}) > 54 then 54 else case when (Shoe_Size + {Value}) < 1 then Round((Shoe_Size + {Value}),0) else (Shoe_Size + {Value}) end  end end
            where Style_No = {Style_No};
            set @RowCount = @@ROWCOUNT;
         `,req.body);
      break;
      case 5:
         strSQL += format(`
            Update [Product_Size_Match] Set [{Name}] = case when (Shoe_Size + {Value}) < -10 then -10 else case when (Shoe_Size + {Value}) > 54 then 54 else case when (Shoe_Size + {Value}) < 1 then Round((Shoe_Size + {Value}),0) else (Shoe_Size + {Value}) end  end end
            where Style_No = {Style_No};
            set @RowCount = @@ROWCOUNT;                         
         `,req.body);
      break;
      case 6:
         strSQL += format(`
         
            Delete From Product_Size_Match Where Style_No = {Style_No};
            Insert into [Product_Size_Match] (Style_No, Shoe_Size, Cutting_Die_Size, Last_Size, Outsole_Size, Middle_Sole_Size, Counter_Size, Prerange)
            Select {Style_No} as Style_No, Shoe_Size, Cutting_Die_Size, Last_Size, Outsole_Size, Middle_Sole_Size, Counter_Size, Prerange
            From Product_Size_Match t WITH (NoWait, Nolock) 
            Where t.Style_No = N'{Style_No_F}';
            set @RowCount = @@ROWCOUNT;
            `,req.body);
      break;
   }
  
  strSQL += format(`
  Select @RowCount as Flag;
  if(@RowCount > 0 )
  Begin
     Update [dbo].[Style] Set UserID = isnull(UserID, N'${req.UserID}'), Size_Match_Updater = N'${req.UserID}'
     , Size_Match_Update = GetDate()
     , Size_Run = Size_Group.Size_Run
     FROM Style AS TableA Left JOIN (SELECT Product_Size_Run.Style_No, '#' + REPLACE(dbo.Product_Size.Size_Name, ' ', '') 
                                 + '-' + REPLACE(Product_Size_1.Size_Name, ' ', '') AS Size_Run
     FROM dbo.Product_Size INNER JOIN
                                     (SELECT          Style_No, REPLACE(REPLACE(REPLACE(MAX(CASE WHEN Shoe_Size <= 0 THEN  Replicate(' ', ABS(Shoe_Size)) 
                                 + CONVERT(varchar, Shoe_Size)  
                                 ELSE (CASE WHEN ABS(Prerange) = 1 THEN 'P' + Replicate(' ', 4 - Len(CONVERT(INT, Shoe_Size))) 
                                 + CONVERT(varchar, Shoe_Size) ELSE 'Z' + Replicate(' ', 4 - Len(CONVERT(INT, Shoe_Size))) + CONVERT(varchar, 
                                 Shoe_Size) END) END), 'P', ''), 'Z', ''), ' ', '') AS Max, 
                                 REPLACE(REPLACE(REPLACE(MIN(CASE WHEN Shoe_Size <= 0 THEN  Replicate(' ', ABS(Shoe_Size)) 
                                 + CONVERT(varchar, Shoe_Size)  
                                 ELSE (CASE WHEN ABS(Prerange) = 1 THEN 'P' + Replicate(' ', 4 - Len(CONVERT(INT, Shoe_Size))) 
                                 + CONVERT(varchar, Shoe_Size) ELSE 'Z' + Replicate(' ', 4 - Len(CONVERT(INT, Shoe_Size))) + CONVERT(varchar, 
                                 Shoe_Size) END) END), 'P', ''), 'Z', ''), ' ', '') AS Min
     FROM              dbo.Product_Size_Match
     GROUP BY   Style_No) AS Product_Size_Run ON dbo.Product_Size.SizeID = Product_Size_Run.Min INNER JOIN
                                 dbo.Product_Size AS Product_Size_1 ON Product_Size_Run.Max = Product_Size_1.SizeID) As Size_Group 
        ON TableA.Style_No = Size_Group.style_No
     where TableA.Style_No = {Style_No}
  End
  `, req.body)    
   //console.log(strSQL)

  db.sql(req.Enterprise, strSQL)
     .then((result) => {
      //console.log(result.recordsets[0][0].Flag > 0)
        res.send({Flag:result.recordsets[0][0].Flag > 0});
     }).catch((err) => {
        console.log(err);
        res.status(500).send(err);
     })
  
});

/* Mark-Wang API End */


/* Darren-Chang API Begin */

/* Darren-Chang API End */

module.exports = router;