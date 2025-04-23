var express = require('express');
var router = express.Router();
const format = require('string-format');
var db = require('../../config/DB_Connect');

//Get Program_Tip 
router.get('/Program_Tip', function (req, res, next) {
   console.log("Call Program_Tip Api");
   var strSQL = `SELECT [Program_TipID]
                       ,[Tip_Name]
                       ,[Tip]
                   FROM [ENTERPRISE].[dbo].[Program_Tip]
                   WHERE Program_TipID = 1`

   db.sql(req.Enterprise, strSQL)
      .then((result) => {
         res.send(result.recordset);
      }).catch((err) => {
         console.log(err);
         res.status(500).send(err);
      })

});

/* Mark-Wang API Begin */
//Get Material_Info
router.post('/Material_Info', function (req, res, next) {
   console.log("Call Material_Info Api Product_No:", req.body);

   var Search = [];
   Search = req.body.Search ? req.body.Search.replace(/'/g, "''").split(" ") : Search;
   var strSQL = `
   SELECT top 1000 m.[MaterialID] 
   , md.[Material_DetailID]
   , mc.[Material_ColorID]  
   , mc.[Unit_Price] 
   , mc.[Purchase_Price]
   , m.[Unit] 
   , mc.[Composite]
   , isnull(m.[Material_Category],'') as Material_Category
   , isnull(m.[L2_Material_Category],'') as L2_Material_Category
   , isnull(md.[Material_Specific],'') as Material_Specific 
   , isnull(mc.[Material_Color],'') as Material_Color 
   , isnull(mc.[SupplierID],'') as SupplierID
   , isnull(mc.[Currency],'') as Currency
   , isnull(mc.[Material_Color],'') + ' ' +  isnull(mc.[SupplierID],'') + ' ' + isnull(mc.[Currency],'') as Material_Color_Info
   , '' as Selected
   , (isnull(m.[Material_Category],'') + ' ' + isnull(m.[L2_Material_Category],'') + ' ' + isnull(md.[Material_Specific],'') + ' ' + isnull(mc.[Material_Color],'') + ' ' +  isnull(mc.[SupplierID],'') + ' ' + isnull(mc.[Currency],''))  as Combine
     FROM Material as m with(NoLock, NoWait)
     Inner Join Material_Detail md with(NoLock, NoWait) on m.MaterialID = md.MaterialID
     Inner Join Material_Color mc with(NoLock, NoWait) on md.Material_DetailID = mc.Material_DetailID
     where (m.History_Date is null And md.History_Date is null And mc.History_Date is null)
     `;
   strSQL = strSQL + (req.body.Composite ? " And isnull(mc.Composite,0) = 0 " : "")
   strSQL += req.body.isOnlyComposites ? " And mc.Composite = 1 " : ""

   var strSQL_Search = strSQL;
   Search.forEach((item, idx) => {
/*      
      var condition = format(` And ((m.[Material_Category] like '%'+REPLACE('{0}',' ','%')+'%') 
      or (m.[L2_Material_Category] like '%'+REPLACE('{0}',' ','%')+'%') 
      or (md.[Material_Specific] like '%'+REPLACE('{0}',' ','%')+'%') 
      or (mc.[Material_Color] like '%'+REPLACE('{0}',' ','%')+'%') 
      or (mc.[SupplierID] like '%'+REPLACE('{0}',' ','%')+'%') 
      or (mc.[Currency] like '%'+REPLACE('{0}',' ','%')+'%')
      or (cast(mc.[Material_ColorID] as varchar) like '%'+REPLACE('{0}',' ','%')+'%'))`, item);
*/
      var condition = format(`
      And (charindex('{0}', '[' + isnull(cast(mc.Material_ColorID as nvarchar),'') + ']'
      + ' ' + isnull(m.Material_Category,'') 
      + ' ' + isnull(m.L2_Material_Category,'') 
      + ' ' + isnull(md.Material_Specific,'') 
      + ' ' + isnull(mc.Material_Color,'') 
      + ' ' + isnull(mc.Currency,'') 
      + ' ' + isnull(mc.SupplierID,'') 
      ) > 0) 
      `,item);
      strSQL_Search += condition;
   });
   strSQL_Search += " order by (isnull(m.[Material_Category],'') + ' ' + isnull(m.[L2_Material_Category],'') + ' ' + isnull(md.[Material_Specific],'') + ' ' + isnull(mc.[Material_Color],'') + ' ' +  isnull(mc.[SupplierID],'') + ' ' + isnull(mc.[Currency],''))"

    //console.log(strSQL_Search);
   db.sql(req.Enterprise, strSQL_Search)
      .then((result) => {
         console.log("DataRows:", result.rowsAffected)
         res.send(result.recordset);
      }).catch((err) => {
         console.log(err);
         res.status(500).send(err);
      })


});

 //Get Material
router.post('/Material',  function (req, res, next) {
   console.log("Call Material Api Product_No:",req.body);
   req.body.Search = req.body.Search ? req.body.Search.replace(/'/g,"''") :'';
   var strSQL = req.body.isOnlyComposites ? format(`
   SELECT DISTINCT m.[MaterialID], m.[Material_Category], m.[L2_Material_Category], m.[Material_ControlID], m.[Unit], m.[Packing_Unit], m.[History_Date], m.[Material_Category]+' (' + m.[L2_Material_Category] + ')'AS Combine
   , mc.Material_Specific as Material_Specific_EditStyle
   , mc.Material_Color as Material_Color_EditStyle
   FROM Material as m with(NoLock, NoWait)
   Inner Join Material_Control as mc with(NoLock, NoWait) on m.Material_ControlID = mc.Material_ControlID
   Inner Join Material_Detail as md with(NoLock, NoWait) on m.MaterialID = md.MaterialID
   Inner Join Material_Color as mcr with(NoLock, NoWait) on md.Material_DetailID = mcr.Material_DetailID
   where (isnull(m.History_Date,'') = '') and mcr.Composite = 1 {0}
    Order by m.Material_Category ;`
   , req.body.Search ? format("And m.[Material_Category]+' '+ m.[L2_Material_Category] like '%'+REPLACE('{Search}',' ','%')+'%'", req.body) : ''
   ) : format(`
   SELECT m.[MaterialID], m.[Material_Category], m.[L2_Material_Category], m.[Material_ControlID], m.[Unit], m.[Packing_Unit], m.[History_Date], m.[Material_Category]+' (' + m.[L2_Material_Category] + ')'AS Combine
   , mc.Material_Specific as Material_Specific_EditStyle
   , mc.Specific_Remark
   , mc.Material_Color as Material_Color_EditStyle
   , mc.Color_Remark
   FROM Material as m with(NoLock, NoWait)
   Inner Join Material_Control as mc with(NoLock, NoWait) on m.Material_ControlID = mc.Material_ControlID
   where (isnull(History_Date,'') = '') {0}
   Order by m.Material_Category ;`
   , req.body.Search ? format("And m.[Material_Category]+' '+ m.[L2_Material_Category] like '%'+REPLACE('{Search}',' ','%')+'%'", req.body) : ''
   )
   // console.log(strSQL)
   db.sql(req.Enterprise, strSQL)
      .then((result) => {
         console.log("DataRows:", result.rowsAffected)
         res.send(result.recordset);
      }).catch((err) => {
         console.log(err);
         res.status(500).send(err);
      })

});

//Get Material_Detail
router.post('/Material_Detail', function (req, res, next) {
   console.log("Call Material_Detail Api Product_No:", req.body);
   req.body.Search = req.body.Search ? req.body.Search.replace(/'/g, "''") : '';
   var strSQL = format(`
   SELECT DISTINCT p.[Material_DetailID] ,p.[MaterialID] ,p.[Material_Specific] ,p.[L2_Material_Specific] ,p.[L3_Material_Specific] ,p.[Date]  ,p.[Update_User] ,p.[History_Date] ,p.[History_User]
     FROM Material_Detail as p with(NoLock, NoWait) {0}
     where (isnull(p.History_Date,'') = '') {1} {2} {3}`
      , req.body.isOnlyComposites ? format("Inner Join Material_Color as mc with(NoLock, NoWait) on p.Material_DetailID = mc.Material_DetailID") : ''
      , req.body.MaterialID ? format("And (MaterialID = {MaterialID})", req.body) : ''
      , req.body.isOnlyComposites ? format("And mc.Composite = 1") : ''
      , req.body.Search ? format("And [Material_Specific] like '%'+REPLACE('{Search}',' ','%')+'%'", req.body) : '');
   //console.log(strSQL);  
   db.sql(req.Enterprise, strSQL)
      .then((result) => {
         res.send(result.recordset);
      }).catch((err) => {
         console.log(err);
         res.status(500).send(err);
      })

});

//Get Material_Color
router.post('/Material_Color', function (req, res, next) {
   console.log("Call Material_Color Api Product_No:", req.body);
   req.body.Search = req.body.Search ? req.body.Search.replace(/'/g, "''") : '';
   var strSQL = format(`
   SELECT DISTINCT p.[Material_ColorID] ,p.[Material_Color] ,p.[SupplierID] ,p.[Currency] ,p.[Unit_Price]  ,p.[Purchase_Price] , isnull(p.[Material_Color],'') + ' ' + p.[SupplierID] + ' ' + p.[Currency]  + ' ' + cast(p.[Unit_Price] as varchar(max)) as Combine,
          p.[Pantone_No], p.[Stock_Qty], p.[Remark], p.[Update_User]
     FROM Material_Color as p with(NoLock, NoWait)
     where (isnull(History_Date,'') = '') {0} {1} {2} `
      , req.body.Material_DetailID ? format("And (Material_DetailID = {0})", req.body.Material_DetailID) : ''
      , req.body.Search ? format("And (isnull(p.[Material_Color],'') + ' ' + p.[SupplierID] + ' ' + p.[Currency]  + ' ' + cast(p.[Unit_Price] as varchar(max))) like '%'+REPLACE('{Search}',' ','%')+'%'", req.body) : ''
      , req.body.isOnlyComposites ? format("And p.Composite = 1") : '');
   // console.log(strSQL);  

   db.sql(req.Enterprise, strSQL)
      .then((result) => {
         res.send(result.recordset);
      }).catch((err) => {
         console.log(err);
         res.status(500).send(err);
      })

});

//Get Supplier
router.post('/Supplier', function (req, res, next) {
   console.log("Call Supplier Api :", req.body);
   req.body.Search = req.body.Search ? req.body.Search.replace(/'/g, "''") : '';

   var strSQL = format(`
   SELECT p.[SupplierID], p.[Supplier_Name], (isnull(p.[SupplierID],'') ) as Combine
     FROM Supplier as p with(NoLock, NoWait)
     where (isnull(History_Date,'') = '') {0} {1} `
      , req.body.Search ? format("And (isnull(p.[SupplierID],'') ) like '%'+REPLACE('{Search}',' ','%')+'%'", req.body) : ''
      , req.body.Composite ? ' And ABS(isnull(Internal,0)) = 1 ' : ''
   );
   //console.log(strSQL);  

   db.sql(req.Enterprise, strSQL)
      .then((result) => {
         res.send(result.recordset);
      }).catch((err) => {
         console.log(err);
         res.status(500).send(err);
      })

});

//Get Currency
router.post('/Currency', function (req, res, next) {
   console.log("Call Currency Api :", req.body);
   req.body.Search = req.body.Search ? req.body.Search.replace(/'/g, "''") : '';
   var strSQL = format(`
   SELECT p.[Currency]
   , (isnull(p.[Currency],'') + ' ' + isnull(p.[Zh_tw],'')) as Combine
   , c.Currency_Rate
     FROM Currency as p with(NoLock, NoWait)
   inner Join [dbo].[@Currency_Rate] c on c.Currency = p.Currency And c.Exchange_Date = convert(Date,GetDate())
     where (1=1) {0} `
      , req.body.Search ? format("And (isnull(p.[Currency],'') + ' ' + isnull(p.[Zh_tw],'')) like '%'+REPLACE('{Search}',' ','%')+'%'", req.body) : '');
   //console.log(strSQL);  

   db.sql(req.Enterprise, strSQL)
      .then((result) => {
         res.send(result.recordset);
      }).catch((err) => {
         console.log(err);
         res.status(500).send(err);
      })

});

//Create Material_Detail
router.post('/Create_Material_Detail', function (req, res, next) {
   console.log("Call Create_Material_Detail Api Product_No:", req.body);
   req.body.UserID = req.UserID;
   req.body.Material_Specific = req.body.Material_Specific ? req.body.Material_Specific.replace(/'/g, "''") : '';
   //req.body.L2_Material_Specific = req.body.L2_Material_Specific ? req.body.L2_Material_Specific.replace(/'/g,"''") :'';
   var strSQL = format(`
   Insert Material_Detail (MaterialID , Material_Specific, [Date], Update_User)
   Select {MaterialID} as MaterialID, N'{Material_Specific}' as Material_Specific, GetDate() as [Date], '{UserID}' as Update_User; \r\n`
      , req.body);

   strSQL += `SELECT TOP (1) [Material_DetailID]
               ,[MaterialID]
               ,[Material_Specific]
               ,[L2_Material_Specific]
               ,[L3_Material_Specific]
               ,[Date]
               ,[Update_User]
               ,[History_Date]
               ,[History_User]
            FROM Material_Detail
            ORDER BY [Material_DetailID] DESC`
   //console.log(strSQL);  

   //res.send('success');


   db.sql(req.Enterprise, strSQL)
      .then((result) => {
         res.send(result.recordset[0]);
      }).catch((err) => {
         console.log(err);
         res.status(500).send(err);
      })

});

//Create Material_Detail
router.post('/Create_Material_Color', function (req, res, next) {
   console.log("Call Create_Material_Color Api Product_No:", req.body);
   var param = {};
   param.Material_Color = req.body.Material_Color ? req.body.Material_Color.replace(/'/g, "''") : '';
   param.Material_DetailID = req.body.Material_DetailID ? req.body.Material_DetailID : 'null';
   param.SupplierID = req.body.SupplierID ? req.body.SupplierID : '';
   param.Currency = req.body.Currency ? req.body.Currency : '';
   param.Unit_Price = req.body.Unit_Price ? req.body.Unit_Price : '0';
   param.Purchase_Price = req.body.Purchase_Price ? req.body.Purchase_Price : '0';
   param.Remark = req.body.Remark ? req.body.Remark.replace(/'/g, "''") : '';
   param.UserID = req.UserID
   var strSQL = format(`
   Insert Material_Color (Material_Color, Material_DetailID , SupplierID, Currency, Unit_Price, Purchase_Price, [Date], Update_User, Remark)
   Select N'{Material_Color}' as Material_Color, {Material_DetailID} as Material_DetailID, N'{SupplierID}' as SupplierID, '{Currency}' as Currency, {Unit_Price} as Unit_Price, {Purchase_Price} as Purchase_Price, 
   GetDate() as [Date], '{UserID}' as Update_User, N'{Remark}' as Remark; \r\n`
      , param);
   strSQL += `SELECT TOP (1) [Material_ColorID]
            ,[Material_Color]
            ,[SupplierID]
            ,[Currency]
            ,[Unit_Price]
            ,[Purchase_Price]
            ,[Remark]
            , isnull([Material_Color],'') + ' ' + [SupplierID] + ' ' + [Currency]  + ' ' + cast([Unit_Price] as varchar(max)) as Combine
            FROM [ENTERPRISE].[dbo].[Material_Color]
            ORDER BY [Material_ColorID] DESC`
   // console.log(strSQL);  

   //res.send('success');


   db.sql(req.Enterprise, strSQL)
      .then((result) => {
         res.send(result.recordset[0]);
      }).catch((err) => {
         console.log(err);
         res.status(500).send(err);
      })

});

//Get Component 
router.post('/Component', function (req, res, next) {
   console.log("Call Component Api Product_No:");
   var strSQL = format(`
   SELECT [ComponentID], [Component], [L2_Component], CONVERT([nvarchar] ,[ComponentID])+' '+[Component]+' ('+[L2_Component]+')' as Combine 
     FROM Product_Component as p with(NoLock, NoWait) 
     WHERE Component_GroupID = {Component_GroupID} {0}`
      , req.body.Search ? format("And CONVERT([nvarchar] ,[ComponentID])+' '+[Component]+' ('+[L2_Component]+')' like '%'+REPLACE('{Search}',' ','%')+'%'", req.body) : '');

   //console.log(strSQL);  
   db.sql(req.Enterprise, strSQL)
      .then((result) => {
         res.send(result.recordset);
      }).catch((err) => {
         console.log(err);
         res.status(500).send(err);
      })

});

//Get Product_Technical_Sheet_Detail's Component
router.post('/Component_Detail', function (req, res, next) {
   console.log("Call Component_Detail Api Product_No:");
   req.body.Material = req.body.Material ? req.body.Material.replace(/'/g, "''") : '';
   var strSQL = req.body.Target_Flag == 0 ?
      format(`
   SELECT Sheet_DetailID, ComponentID, Component, C_Rmk 
     FROM Product_Technical_Sheet_Detail as p with(NoLock, NoWait)
   where Product_No = '{Product_No}' And Material = N'{Material}' 
     And Component_GroupID = {Component_GroupID} ` , req.body)

      : format(`
   SELECT StructureID, ComponentID, Component, C_Rmk 
     FROM Product_Structure as p with(NoLock, NoWait)
   where Product_No = '{Product_No}' And MaterialID = '{MaterialID}' And Material_DetailID = '{Material_DetailID}' `
         , req.body);
   var Material_Code = (req.body.Material_Code) ? `'${req.body.Material_Code}'` : `'' or Material_Code IS NULL`
   strSQL += req.body.isMultiEdit && !req.body.isMaterialEdit ? `And (Material_Code = ${Material_Code}); ` : `;`
   // console.log(strSQL);  
   db.sql(req.Enterprise, strSQL)
      .then((result) => {
         res.send(result.recordset);
      }).catch((err) => {
         console.log(err);
         res.status(500).send(err);
      })

});

//Save Product_Technical_Sheet_Detail Component
router.post('/SaveData', function (req, res, next) {
   console.log("Call SaveData Api Product_No:", req.body.condition.Product_No);
   // console.log('req.body:\n',req.body);
   req.body.condition.Material = req.body.condition.Material ? req.body.condition.Material.replace(/'/g, "''") : '';
   var BaseData = [];
   var Material_Code = (req.body.Material_Code ? req.body.Material_Code.toUpperCase() : '');
   var Material = (req.body.Material.MaterialID ? req.body.Material.Material_Category : '')
      + (req.body.MDetail.Material_DetailID ? (' ' + req.body.MDetail.Material_Specific) : '');
   Material = Material ? Material.replace(/'/g, "''") : '-';
   var MaterialID = req.body.Material.MaterialID ? req.body.Material.MaterialID : 'null';
   var Material_DetailID = req.body.MDetail.Material_DetailID ? req.body.MDetail.Material_DetailID : 'null';
   var Material_ColorID = req.body.MColor.Material_ColorID ? req.body.MColor.Material_ColorID : 'null';
   var Material_Color = req.body.MColor.Material_Color ? req.body.MColor.Material_Color.replace(/'/g, "''") : '';
   var SupplierID = req.body.MColor.SupplierID ? ` (${req.body.MColor.SupplierID})` : '';

   var ComponentID = req.body.Technical_Sheet_Detail.length == 0 ? '' : req.body.Technical_Sheet_Detail[0].ComponentID;
   var Component = req.body.Technical_Sheet_Detail.length == 0 ? '' : req.body.Technical_Sheet_Detail[0].Component;
   var C_Rmk = req.body.Technical_Sheet_Detail.length == 0 ? '' : req.body.Technical_Sheet_Detail[0].C_Rmk;
   // console.log('Material_Code:',Material_Code);   
   // console.log('Material:',Material);   
   // console.log('MaterialID:',MaterialID);   
   // console.log('Material_DetailID:',Material_DetailID);   
   // console.log('Material_ColorID:',Material_ColorID);   
   // console.log('Material_Color:',Material_Color);   


   //取得資料庫中相同材料的component


   var strSQL = format(`
     SELECT Sheet_DetailID, ComponentID, Component, C_Rmk 
     FROM Product_Technical_Sheet_Detail as p with(NoLock, NoWait)
     where Product_No = '{Product_No}' And Material = N'{Material}' 
     And Component_GroupID = {Component_GroupID} `
      , req.body.condition);
   if (req.body.isMultiEdit && !req.body.isMaterialEdit) {
      var Base_Material_Code = req.body.condition.Material_Code
      strSQL += `And ('${Base_Material_Code}' = 'null' or isnull(Material_Code,'') = '${Base_Material_Code}'); `
   } else if (req.body.isMultiEdit && req.body.isMaterialEdit) {
      strSQL += `;`
   } else {
      strSQL += `And Sheet_DetailID = ${req.body.condition.Sheet_DetailID};`
   }
   // strSQL += req.body.isMultiEdit ? ';' : `And Sheet_DetailID = ${req.body.condition.Sheet_DetailID};`
   // console.log(`BaseData:${strSQL}`);  

   db.sql(req.Enterprise, strSQL)
      .then((result) => {

         var Resort = 0;
         BaseData = result.recordset;
         var deleteArray = [];
         var updateArray = [];
         if (req.body.isMultiEdit && !req.body.isMaterialEdit) {
            BaseData.forEach((Data) => {
               var flag = 0 // flag 0:代表使用者已經於介面上將Component刪除   1:代表需更新的Component
               req.body.Technical_Sheet_Detail.forEach((item) => {
                  if (Data.Sheet_DetailID == item.Sheet_DetailID) {
                     flag = 1;
                     item.C_Rmk = item.C_Rmk ? item.C_Rmk : '';
                     updateArray.push(item);
                  }
               });
               if (flag == 0) {
                  deleteArray.push(Data.Sheet_DetailID);
               }
            });
         }
         // console.log('DataBase:',BaseData);
         // console.log(' \r\n');
         // console.log('Technical_Sheet_Detail:',req.body.Technical_Sheet_Detail);
         // console.log(' \r\n');
         // console.log('deleteArray:',deleteArray);


         var idx = 0;
         strSQL = '';
         //處理使用者於介面上新增的Component
         req.body.Technical_Sheet_Detail.forEach((item, index) => {
            if (!item.Sheet_DetailID) {
               strSQL += idx == 0 ? 'Insert Product_Technical_Sheet_Detail (SortID, Product_No, Component_GroupID, C_Rmk, Component, ComponentID, Material_Code, Material, MaterialID, Material_DetailID, Material_ColorID, Color)' : 'union all';
               strSQL += `
            select (Select isnull(Max(SortID),0) + ${idx++} From Product_Technical_Sheet_Detail Where Product_No='${req.body.condition.Product_No}' And Component_GroupID = ${req.body.condition.Component_GroupID}) as SortID
            , '${req.body.condition.Product_No}' as Product_No
            , '${req.body.condition.Component_GroupID}' as Component_GroupID
            , N'${item.C_Rmk}' as C_Rmk
            , N'${item.Component}' as Component
            , '${item.ComponentID}' as ComponentID
            , '${Material_Code}' as Material_Code
            , N'${Material}' as Material
            ,  ${MaterialID} as MaterialID
            ,  ${Material_DetailID} as Material_DetailID
            ,  ${Material_ColorID} as Material_ColorID
            , N'${Material_Color}${SupplierID}' as Color
               `;
               Resort = 1;
            }
            if (req.body.Technical_Sheet_Detail.length - 1 == index)
               strSQL += '; \r\n';
         });

         //處理使用者新增材料但沒有Component的部分
         if (BaseData.length == 0 && req.body.Technical_Sheet_Detail.length == 0 && Material_Code && MaterialID && Material_DetailID) {
            strSQL += `Insert Product_Technical_Sheet_Detail (SortID, Product_No, Component_GroupID, Material_Code, Material, MaterialID, Material_DetailID, Material_ColorID, Color)
                     Select (Select isnull(Max(SortID),0) + 1 From Product_Technical_Sheet_Detail Where Product_No='${req.body.condition.Product_No}' And Component_GroupID = ${req.body.condition.Component_GroupID}) as SortID
                     , '${req.body.condition.Product_No}' as Product_No
                     , '${req.body.condition.Component_GroupID}' as Component_GroupID
                     , '${Material_Code}' as Material_Code
                     , N'${Material}' as Material
                     ,  ${MaterialID} as MaterialID
                     ,  ${Material_DetailID} as Material_DetailID
                     ,  ${Material_ColorID} as Material_ColorID
                     , N'${Material_Color}${SupplierID}' as Color
                     ; \r\n`
            Resort = 1;
         }

         //處理使用者刪除的Component
         if (deleteArray.length > 0) {
            Resort = 1;
            strSQL += `delete from Product_Technical_Sheet_Detail where Sheet_DetailID in (${deleteArray}); \r\n`
         }
         //處理Component C_Mrk與材料更新
         if (req.body.isMultiEdit && !req.body.isMaterialEdit) {
            updateArray.forEach((item) => { // 多選編輯狀態
               strSQL += `
               update Product_Technical_Sheet_Detail set 
               Material_Code = '${Material_Code}',
               Material = N'${Material}', 
               MaterialID = ${MaterialID},
               Material_DetailID = ${Material_DetailID}, 
               Material_ColorID = ${Material_ColorID}, 
               Color = N'${Material_Color}${SupplierID}',
               C_Rmk = N'${item.C_Rmk}'
               where Sheet_DetailID = ${item.Sheet_DetailID} ;  \r\n`;
            })
         } else if (req.body.isMultiEdit && req.body.isMaterialEdit) { // 只編輯 Material 的狀態
            strSQL += `
            update Product_Technical_Sheet_Detail set 
            Material = N'${Material}', 
            MaterialID = ${MaterialID},
            Material_DetailID = ${Material_DetailID}, 
            Material_ColorID = ${Material_ColorID}, 
            Color = N'${Material_Color}${SupplierID}'
            where Product_No = '${req.body.condition.Product_No}' And Material = N'${req.body.condition.Material}' 
            And Component_GroupID = ${req.body.condition.Component_GroupID};   \r\n`;
         } else { // 單一編輯狀態（加入 Update Component 相關資料）
            Component = (typeof Component === 'object') ? Component : `N'${Component}'`
            C_Rmk = (typeof C_Rmk === 'object') ? C_Rmk : `N'${C_Rmk}'`
            strSQL += `update Product_Technical_Sheet_Detail set
        Material_Code = '${Material_Code}',
        Material = N'${Material}', 
        MaterialID = ${MaterialID},
        Material_DetailID = ${Material_DetailID}, 
        Material_ColorID = ${Material_ColorID}, 
        Color = N'${Material_Color}${SupplierID}',
        ComponentID = ${ComponentID},
        Component = ${Component},
        C_Rmk = ${C_Rmk}
        where Sheet_DetailID = ${req.body.condition.Sheet_DetailID} ;  \r\n`
         }
         strSQL += ` Update Product set Technical_Sheet_Maker = isnull(Technical_Sheet_Maker,'${req.UserID}') , Technical_Sheet_Updater = '${req.UserID}', Technical_Sheet_Update = Getdate()
      Where Product_No = '${req.body.condition.Product_No}' \r\n `

         //重整此component Group ID的SortID
         if (Resort)
            strSQL += ` Update Product_Technical_Sheet_Detail set SortID = tmp.SortID
      From Product_Technical_Sheet_Detail p
      Inner Join ( SELECT row_number() over(order by SortID) as SortID, Sheet_DetailID
      FROM Product_Technical_Sheet_Detail as p with(NoLock, NoWait)
      where Product_No = '${req.body.condition.Product_No}' And Component_GroupID = ${req.body.condition.Component_GroupID}) tmp on tmp.Sheet_DetailID = p.Sheet_DetailID`
         // console.log('--------------------------------------------------');  
         // console.log(strSQL);          
         // console.log('--------------------------------------------------');  

         db.sql(req.Enterprise, strSQL)
            .then((result) => {
               res.send('success');
            }).catch((err) => {
               console.log(err);
               res.status(500).send(err);
            })

      }).catch((err) => {
         console.log(err);
         res.status(500).send(err);
      })

});


//Insert Product_Technical_Sheet_Detail Component
router.post('/InsertComop', function (req, res, next) {
   console.log("Call InsertComop Api Product_No:", req.body);
   req.body.UserID = req.UserID
   var strSQL = format(`
   Insert Product_Technical_Sheet_Detail (SortID, Product_No, Component_GroupID, Component, ComponentID, Material_Code, Material, Material_DetailID) 
   Select (Select isnull(Max(SortID),0) + 1 From Product_Technical_Sheet_Detail Where Product_No='{Product_No}' And Component_GroupID = {Component_GroupID}) as SortID
   , '{Product_No}' as Product_No
   , '{Component_GroupID}' as Component_GroupID
   , N'{Component}' as Component
   , '{ComponentID}' as ComponentID
   ,  case when '{Material_Code}' = 'null' or len('{Material_Code}') = 0 then '' else '{Material_Code}' end as Material_Code
   , N'{Material}' as Material
   , '{Material_DetailID}' as Material_DetailID;

   Update Product set Technical_Sheet_Maker = isnull(Technical_Sheet_Maker,'{UserID}'), Technical_Sheet_Updater = '{UserID}', Technical_Sheet_Update = Getdate()
   Where Product_No = '{Product_No}'   
      `, req.body);
   //console.log(strSQL);  

   db.sql(req.Enterprise, strSQL)
      .then((result) => {
         res.send('success');
      }).catch((err) => {
         console.log(err);
         res.status(500).send(err);
      })
});

//Delete Product_Technical_Sheet_Detail Component
router.post('/DeleteComop', function (req, res, next) {
   console.log("Call DeleteComop Api Product_No:");
   req.body.UserID = req.UserID
   var strSQL = format(`
   Delete FROM Product_Technical_Sheet_Detail where Sheet_DetailID = {Sheet_DetailID};

   Update Product set Technical_Sheet_Maker = isnull(Technical_Sheet_Maker,'{UserID}'), Technical_Sheet_Updater = '{UserID}', Technical_Sheet_Update = Getdate()
   Where Product_No = '{Product_No}'
      `, req.body);
   //console.log(strSQL);  

   db.sql(req.Enterprise, strSQL)
      .then((result) => {
         res.send('success');
      }).catch((err) => {
         console.log(err);
         res.status(500).send(err);
      })

});

//Updat Component C_MRK
router.post('/Update_C_Rmk', function (req, res, next) {
   console.log("Call Update_C_Rmk Api Product_No:");

   var strSQL = format(`
   Update Product_Technical_Sheet_Detail set C_Rmk = '{C_Rmk}' where Sheet_DetailID = {Sheet_DetailID};  
   Update Product set Technical_Sheet_Updater = isnull(Technical_Sheet_Updater,'${req.UserID}') , Technical_Sheet_Updater = '${req.UserID}', Technical_Sheet_Update = Getdate()
   Where Product_No = '{Product_No}'
      `, req.body);
   //console.log(strSQL);  
   db.sql(req.Enterprise, strSQL)
      .then((result) => {
         res.send('success');
      }).catch((err) => {
         console.log(err);
         res.status(500).send(err);
      })

});


//Get Material Composite
router.post('/Composite_Material_Info', function (req, res, next) {
   console.log("Call Composite Material:");

   var items = { Main_Info: [{ Material_ColorID: null, Main_Material: '' }], Detail_Info: [{ Material_CompositeID: null, Detail_ColorID: null, detail_Maerial: '', Net_Consist: null, SortID: null }] };
   var strSQL = format(`
   Select mc.Material_ColorID as Master_ColorID
   , md.[Material_DetailID] as Material_DetailID 
   , m.[MaterialID] as MaterialID 
   , (m.Material_Category + ' ' + md.Material_Specific + ' ' + mc.Material_Color) as main_Maerial
   , isnull(m.[Material_Category],'') as Material_Category
   , isnull(md.[Material_Specific],'') as Material_Specific
   , isnull(mc.[Material_Color],'') as Material_Color 
   , isnull(mc.[SupplierID],'') as SupplierID
   , isnull(mc.[Currency],'') as Currency
   , isnull(mc.[Unit_Price],'') as Unit_Price
   , isnull(mc.[Purchase_Price],'') as Purchase_Price
   , isnull(mc.[Price_Approve],'') as Price_Approve
   , isnull(m.[Unit],'') as Unit
   , c.[Currency_Rate]
   , case when isnull(mc.Update_User,'') = '' then '' else mc.Update_User end as Update_User
   , case when isnull(mc.Update_Date,'') = '' then '' else convert(varchar(20),mc.Update_Date,120) end as Update_Date
   From Material_Color mc with(NoLock, NoWait)
     Inner Join Material_Detail md with(NoLock, NoWait) on mc.Material_DetailID = md.Material_DetailID
     Inner Join Material m with(NoLock, NoWait) on m.MaterialID = md.MaterialID
     Left Outer Join [dbo].[@Currency_Rate] c on c.Currency = mc.Currency And c.Exchange_Date = convert(Date,GetDate())
   Where Material_ColorID = {Master_ColorID};
      
   Select tmp.[Material_CompositeID]
   , tmp.[Detail_ColorID]
   , m.[MaterialID] as MaterialID
   , (m.Material_Category + ' ' + md.Material_Specific) as Material
   , tmp.[Net_Consist]
   , tmp.[SortID] 
   , isnull(m.[Material_Category],'') as Material_Category 
   , isnull(md.[Material_Specific],'') as Material_Specific
   , isnull(mc.[Material_ColorID],'') as Material_ColorID
   , isnull(mc.[Material_Color],'') as Material_Color 
   , isnull(mc.[SupplierID],'') as SupplierID
   , isnull(mc.[Currency],'') as Currency
   , isnull(mc.[Unit_Price],'') as Unit_Price
   , isnull(mc.[Purchase_Price],'') as Purchase_Price
   , isnull(m.[Unit],'') as Unit
   , c.[Currency_Rate], mc.[History_Date]
   , isnull(mc.[Unit_Price],0) * c.[Currency_Rate] as Unit_Price_TWD
   From (Select [Material_CompositeID], [Detail_ColorID], [Net_Consist], row_number() Over(Order By SortID) AS [SortID] from Material_Composite Where Master_ColorID = {Master_ColorID} ) tmp
     inner Join Material_Color mc with(NoLock, NoWait) on mc.Material_ColorID = tmp.[Detail_ColorID]
     Inner Join Material_Detail md with(NoLock, NoWait) on md.Material_DetailID = mc.Material_DetailID
     Inner Join Material m with(NoLock, NoWait) on m.MaterialID = md.MaterialID
     Left Outer Join [dbo].[@Currency_Rate] c on c.Currency = mc.Currency And c.Exchange_Date = convert(Date,GetDate())
   Order by [SortID];

   Select cast((case when ((Select Count(Material_ColorID) From Product_Structure with(NoLock, NoWait) Where Material_ColorID = {Master_ColorID}) = 0 
         --And isnull((Select Sum(Stock_Qty) From Stock_Detail with(NoLock, NoWait) Where Material_ColorID = {Master_ColorID}),0) = 0 
         ) then 1 else 0 end) as bit) as Edit_Flag;

      `, req.body);

   //console.log(strSQL);  
   db.sql(req.Enterprise, strSQL)
      .then((result) => {
         var DataSet = {Main_Info: result.recordsets[0], Detail_Info: result.recordsets[1], Edit_Flag:result.recordsets[2][0].Edit_Flag }
         //var DataSet = { Main_Info: result.recordsets[0], Detail_Info: result.recordsets[1], Edit_Flag: 1 }
         //console.log(DataSet)
         res.send(DataSet);
      }).catch((err) => {
         console.log(err);
         res.status(500).send(err);
      })

});


//Save Composite Material
router.post('/Composite_Material_Save', function (req, res, next) {
   console.log("Call Composite_Material_Save Api:");

   var strSQL = format(`
   Declare @Material_ColorID int = ${req.body.Main_Info[0].Master_ColorID && req.body.Main_Info[0].Master_ColorID != 0 ? req.body.Main_Info[0].Master_ColorID : null},
   @MaterialID int = ${req.body.Main_Info[0].Material_Category.MaterialID ? req.body.Main_Info[0].Material_Category.MaterialID:req.body.Main_Info[0].MaterialID},
   @Material_DetailID int = ${req.body.Main_Info[0].Material_DetailID ? req.body.Main_Info[0].Material_DetailID : null},
   @Material_Category nvarchar(35) = '',
   @Material_Specific nvarchar(100) = substring(N'${req.body.Main_Info[0].Material_Specific.replace(/'/g, "''").trim()}', 1, 100),
   @Material_Color nvarchar(70) = substring(N'${req.body.Main_Info[0].Material_Color.replace(/'/g, "''").trim()}', 1, 70),
   @SupplierID nvarchar(15) = N'${req.body.Main_Info[0].SupplierID.SupplierID ? req.body.Main_Info[0].SupplierID.SupplierID : req.body.Main_Info[0].SupplierID}',
   @Currency varchar(4) = '${req.body.Currency.Currency.Currency ? req.body.Currency.Currency.Currency : req.body.Currency.Currency}',
   @Unit_Price money = ${req.body.Main_Info[0].Unit_Price},
   @Purchase_Price money = ${req.body.Main_Info[0].Purchase_Price},
   @Edit_Flag int = 0

   Select @Material_Category = Material_Category From Material md with(NoLock, NoWait) Where md.MaterialID = @MaterialID

   if(@Material_ColorID is null)
   begin
      Select @Material_DetailID = Material_DetailID From Material_Detail md with(NoLock, NoWait) Where md.MaterialID = @MaterialID And md.Material_Specific = @Material_Specific
      if(@Material_DetailID is null)
      begin
         Insert Material_Detail (MaterialID, Material_Specific, Date, Update_User)
         Select @MaterialID as MaterialID, @Material_Specific as Material_Specific, GetDate() as Date, '${req.UserID}' as Update_User
         set @Material_DetailID = SCOPE_IDENTITY();  
      end
      Select @Material_ColorID = Material_ColorID From Material_Color md with(NoLock, NoWait) Where md.Material_DetailID = @Material_DetailID And md.Material_Color = @Material_Color And md.SupplierID = @SupplierID And md.Currency = @Currency
      if(@Material_ColorID is null)
      begin
         Insert Material_Color (Material_DetailID, Material_Color, Date, SupplierID, Currency, Unit_Price, Purchase_Price, Update_Date, Update_User, Composite)
         Select @Material_DetailID, @Material_Color, GetDate() as Date, @SupplierID, @Currency, @Unit_Price, @Purchase_Price, GetDate() as Update_Date, '${req.UserID}' as Update_User, 1 as Composite
         set @Material_ColorID = SCOPE_IDENTITY();  
         goto finish
      end 
      else 
      begin
         goto UpDate_Material_Color;
      end
   end
   else
   begin 
      Set @Material_DetailID = (Select Material_DetailID From Material_Detail md with(NoLock, NoWait) Where md.MaterialID = @MaterialID And md.Material_Specific = @Material_Specific)
      
      if(@Material_DetailID is null)
      begin
         Insert Material_Detail (MaterialID, Material_Specific, Date, Update_User)
         Select @MaterialID as MaterialID, @Material_Specific as Material_Specific, GetDate() as Date, '${req.UserID}' as Update_User
         set @Material_DetailID = SCOPE_IDENTITY();  
      end

      goto UpDate_Material_Color;            
   end
   
   UpDate_Material_Color:

      Update Material_Detail set MaterialID = @MaterialID 
      , Material_Specific = @Material_Specific, Date = GetDate(), Update_User = '${req.UserID}'   
      Where Material_DetailID = @Material_DetailID 

      Update Material_Color set Material_DetailID = @Material_DetailID, Material_Color = @Material_Color, SupplierID = @SupplierID, Currency = @Currency
      , Composite = case when ${req.body.Detail_Info.length} = 0 then 0 else 1 end 
      , Update_Date = GetDate(), Update_User = '${req.UserID}'
      Where Material_ColorID = @Material_ColorID 
      --And (Select Count(Material_ColorID) From Product_Structure with(NoLock, NoWait) Where Material_ColorID = @Material_ColorID) = 0  
      --And isnull((Select Sum(Stock_Qty) From Stock_Detail with(NoLock, NoWait) Where Material_ColorID = @Material_ColorID),0) = 0;
      
      Update Product_Structure set MaterialID = @MaterialID, Material_Category = @Material_Category, 
      Material_DetailID = @Material_DetailID, Material_Specific = @Material_Specific, 
      Material_Color = @Material_Color, 
      SupplierID = @SupplierID, Currency = @Currency
      Where Material_ColorID = @Material_ColorID

      Update Product_Technical_Sheet_Detail set MaterialID = @MaterialID, Material_DetailID = @Material_DetailID,
      Material = @Material_Category + ' ' + @Material_Specific,
      Color = @Material_Color +' ('+ @SupplierID + ')'
      Where Material_ColorID = @Material_ColorID

   finish:
      Select @Material_ColorID as Material_ColorID, @Material_DetailID as Material_DetailID, 
     cast(
        (case when ((Select Count(Material_ColorID) From Product_Structure with(NoLock, NoWait) Where Material_ColorID = @Material_ColorID) = 0  
         --And isnull((Select Sum(Stock_Qty) From Stock_Detail with(NoLock, NoWait) Where Material_ColorID = @Material_ColorID),0) = 0 
         ) then 1 else 0 end) as bit
     ) as Edit_Flag

`);

   // console.log("Process Composite_Material Main Data:");   
   // console.log('--------------------------------------------------');  
   // console.log(strSQL);
   // console.log('--------------------------------------------------');  

   db.sql(req.Enterprise, strSQL)
      .then((result) => {
         req.body.Main_Info[0].Master_ColorID = result.recordset[0].Material_ColorID;
         req.body.Main_Info[0].Material_DetailID = result.recordset[0].Material_DetailID;
         req.body.Main_Info[0].Edit_Flag = result.recordset[0].Edit_Flag;         
         next();
      }).catch((err) => {
         console.log(err);
         res.status(500).send(err);
      })

}, function (req, res, next) {
   console.log("Process Composite_Material Detail Data:");
   //console.log('req.body.Main_Info=',req.body.Main_Info)
   //console.log('req.body.Detail_Info=',req.body.Detail_Info)
   var Master_ColorID = req.body.Main_Info[0].Master_ColorID;
   var Material_DetailID = req.body.Main_Info[0].Material_DetailID;
   var Edit_Flag = req.body.Main_Info[0].Edit_Flag;
   var strSQL = format(`
      Select [Material_CompositeID],[Detail_ColorID] ,[Net_Consist], [SortID]
      from Material_Composite with(NoLock, NoWait)
      Where Master_ColorID = {Master_ColorID}
      --and (Select Count(Material_ColorID) From Product_Structure with(NoLock, NoWait) Where Material_ColorID = {Master_ColorID}) = 0  
      --And isnull((Select Sum(Stock_Qty) From Stock_Detail with(NoLock, NoWait) Where Material_ColorID = {Master_ColorID}),0) = 0;   
   `, req.body.Main_Info[0]);

   //console.log(strSQL);

   db.sql(req.Enterprise, strSQL)
      .then((result) => {
         var BaseData = result.recordset;
         var deleteArray = [];
         var updateArray = [];

         BaseData.forEach((Data) => {
            var flag = 0 // flag 0:代表使用者已經於介面上將Component刪除   1:代表需更新的Component
            req.body.Detail_Info.forEach((item) => {
               if (Data.Material_CompositeID == item.Material_CompositeID) {
                  flag = 1;
                  if ((Data.Detail_ColorID != item.Detail_ColorID) || (Data.Net_Consist != item.Net_Consist) || (Data.SortID != item.SortID)) updateArray.push(item);
               }
            });
            if (flag == 0) {
               deleteArray.push(Data.Material_CompositeID);
            }
         });

         strSQL = '';
         //處理使用者於介面上刪除的Material Composite
         if (deleteArray.length > 0) {
            strSQL += ` Delete from Material_Composite where Material_CompositeID in (${deleteArray}); \r\n`
         }

         //處理使用者於介面上更新的Material Composite
         updateArray.forEach((item, index) => {
            strSQL += ` Update Material_Composite set 
                  Detail_ColorID = ${item.Detail_ColorID}, 
                  Net_Consist = ${item.Net_Consist},
                  SortID = ${item.SortID}
               Where Material_CompositeID = ${item.Material_CompositeID}; \r\n           
            `;
         });

         var idx = 0;
         //處理使用者於介面上新增的Material Composite
         req.body.Detail_Info.forEach((item) => {
            if (!item.Material_CompositeID) {
               strSQL += idx++ == 0 ? ' Insert Material_Composite (Master_ColorID, Detail_ColorID, Net_Consist, SortID) ' : 'union all';
               strSQL += `
                  Select ${Master_ColorID} as Master_ColorID,
                  ${item.Detail_ColorID} as Detail_ColorID, 
                  ${item.Net_Consist} as Net_Consist,
                  ${item.SortID} as SortID    
               `;
            }
            if (req.body.Detail_Info.length == idx)
               strSQL += '; \r\n';
         });

         strSQL += ` Update Material_Composite Set SortID = tmp.SortID
         From Material_Composite mc 
         inner join (Select [Material_CompositeID], row_number() Over(Order By SortID) AS [SortID] from Material_Composite Where Master_ColorID = ${Master_ColorID} ) tmp on tmp.Material_CompositeID = mc.Material_CompositeID
         Where mc.Master_ColorID = ${Master_ColorID}  \r\n
         `
         //  console.log('--------------------------------------------------');  
         //  console.log(strSQL);          
         //  console.log('--------------------------------------------------');  

         //      res.send('success');
         db.sql(req.Enterprise, strSQL)
            .then((result) => {
               res.send({ Flag: 'success', Master_ColorID: Master_ColorID, Material_DetailID: Material_DetailID, Edit_Flag: Edit_Flag });
            }).catch((err) => {
               console.log(err);
               res.status(500).send(err);
            })

      }).catch((err) => {
         console.log(err);
         res.status(500).send(err);
      })

});

//Delete Composite_Material
router.post('/Composite_Material_Del', function (req, res, next) {
   console.log("Call Composite_Material_Del Api Master_ColorID:", req.body.Master_ColorID);

   var strSQL = format(`
   Delete From Material_Color 
   where Material_ColorID = {Master_ColorID}
   And isnull((Select Count(Material_ColorID) From Product_Structure with(NoLock, NoWait) Where Material_ColorID = {Master_ColorID}),0) = 0  
   And isnull((Select Sum(Stock_Qty) From Stock_Detail with(NoLock, NoWait) Where Material_ColorID = {Master_ColorID}),0) = 0 ;  
      `, req.body);
   //console.log(strSQL);  
   db.sql(req.Enterprise, strSQL)
      .then((result) => {
         res.send({Flag:'success'});
      }).catch((err) => {
         console.log(err);
         res.status(500).send(err);
      })

});


/* Mark-Wang API End */


/* Darren-Chang API Begin */

// 判斷 Material Detail 是否可以刪除
router.post('/Material_Detail_isDelete', function (req, res, next) {
   console.log("Call Material_Detail_isDelete Api,", req.body);

   var strSQL = format(`
  SELECT TOP (1) md.Material_DetailID, mc.Material_DetailID, Material_Specific, mc.Material_Color,
  case when (mc.Material_DetailID IS NULL and mc.Material_Color IS NULL) then 1 else 0 end AS isDelete
  FROM Material_Detail as md
  LEFT JOIN Material_Color as mc
  ON md.Material_DetailID = mc.Material_DetailID
  WHERE md.Material_DetailID = {Material_DetailID}`, req.body);
   // console.log(strSQL);  
   db.sql(req.Enterprise, strSQL)
      .then((result) => {
         // console.log(result)
         res.send(result.recordset);
      }).catch((err) => {
         console.log(err);
         res.status(500).send(err);
      })
});

// 刪除指定的 Material Detail ID
router.post('/Delete_Material_Detail', function (req, res, next) {
   console.log("Call Delete_Material_Detail Api,", req.body);
   // SELECT Material_ColorID, Material_Color
   var strSQL = format(`
  DELETE
  FROM Material_Detail
  WHERE Material_DetailID = {Material_DetailID} 
  and (Select Count(Material_DetailID) from Material_Color WHERE Material_DetailID = {Material_DetailID}) = 0
  `, req.body);
   // console.log(strSQL);  
   db.sql(req.Enterprise, strSQL)
      .then((result) => {
         // console.log(result)
         res.send('delete ok');
      }).catch((err) => {
         console.log(err);
         res.status(500).send(err);
      })
});

// 判斷 Material Color 是否可以刪除
router.post('/Material_Color_isDelete', function (req, res, next) {
   console.log("Call Material_Color_isDelete Api,", req.body);

   var strSQL = format(`
  DECLARE @checkColor TABLE(Material_ColorID INT)

  INSERT INTO @checkColor 
  VALUES ({Material_ColorID})

  SELECT DISTINCT cc.Material_ColorID,
  case when (
  (Select Count(Material_ColorID) from Product_Structure WHERE Material_ColorID = {Material_ColorID}) = 0
  and isnull((Select Sum(Stock_Qty) from Stock_Detail WHERE Material_ColorID = {Material_ColorID}) ,0) = 0
  and (Select Price_Approve from Material_Color WHERE Material_ColorID = {Material_ColorID}) is NULL
  and (Select Count(Detail_ColorID) from Material_Composite WHERE Detail_ColorID = {Material_ColorID}) = 0
  and (Select Count(Material_ColorID) from Product_Technical_Sheet_Detail WHERE Material_ColorID = {Material_ColorID}) = 0 )
  then 1 else 0 end AS isDelete
  FROM @checkColor as cc`, req.body);
   // console.log(strSQL);  
   db.sql(req.Enterprise, strSQL)
      .then((result) => {
         res.send(result.recordset);
      }).catch((err) => {
         console.log(err);
         res.status(500).send(err);
      })
});

// 刪除指定的 Material Color ID
router.post('/Delete_Material_Color', function (req, res, next) {
   console.log("Call Delete_Material_Color Api,", req.body);
   // SELECT Material_ColorID, Material_Color
   var strSQL = format(`
  DELETE
  FROM Material_Color
  WHERE Material_ColorID = {Material_ColorID}
  and (Select Count(Material_ColorID) from Product_Structure WHERE Material_ColorID = {Material_ColorID}) = 0
  and isnull((Select Sum(Stock_Qty) from Stock_Detail WHERE Material_ColorID = {Material_ColorID}),0) = 0
  and isnull((Select Price_Approve from Material_Color WHERE Material_ColorID = {Material_ColorID}), 0) = 0
  and (Select Count(Detail_ColorID) from Material_Composite WHERE Detail_ColorID = {Material_ColorID}) = 0
  and (Select Count(Material_ColorID) from Product_Technical_Sheet_Detail WHERE Material_ColorID = {Material_ColorID}) = 0 
  `, req.body);
   // console.log(strSQL);  
   db.sql(req.Enterprise, strSQL)
      .then((result) => {
         // console.log(result)
         res.send('delete ok');
      }).catch((err) => {
         console.log(err);
         res.status(500).send(err);
      })
});

/* Darren-Chang API End */

module.exports = router;