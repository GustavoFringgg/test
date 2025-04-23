var express = require('express');
var router = express.Router();
const format = require('string-format');
var db = require('../../config/DB_Connect');
var request = require("request");

//Get Pantone Color
router.post('/Get_Pantone_Color',  function (req, res, next) {
   console.log("Call Get_Pantone_Color Api:");
   
   req.body.Pantone_No = req.body.Pantone_No ? `${req.body.Pantone_No.trim().substring(0,40).replace(/'/g, '')}` : '';     
   var strSQL = format(`
   SELECT Pantone_No
   , Color_Name
   , Hex
   FROM Pantone_Color pc WITH (NoLock, NoWait) 
   WHERE pc.Pantone_No = '{Pantone_No}';
   `, req.body) ;
   //console.log(strSQL)
   db.sql(req.Enterprise, strSQL)
      .then((result) => {         

         var buffer = new Array();
         var buffer1;
         request({
            url: `https://www.pantone.com/connect/${req.body.Pantone_No}`,
            method: "GET"
          }, function(e,r,body) {
            var data = ''
            if(!e) {

            }
            res.send({DB:result.recordset, Web: data, body:body})
          });      

      }).catch((err) => {
         console.log(err);
         res.status(500).send(err);
      })
});

//Get Material_List
router.post('/Material_List',  function (req, res, next) {
    console.log("Call Material_List Api:",req.body);
    
    req.body.Material_ColorID = req.body.Material_ColorID ? req.body.Material_ColorID : 0;
    req.body.Material_Category = req.body.Material_Category ? `${req.body.Material_Category.trim().substring(0,150).replace(/'/g, '')}` : '';
    req.body.L2_Material_Category = req.body.L2_Material_Category ? `${req.body.L2_Material_Category.trim().substring(0,150).replace(/'/g, '')}` : '';
    req.body.Material_Specific = req.body.Material_Specific ? `${req.body.Material_Specific.trim().substring(0,150).replace(/'/g, '')}` : '';
    req.body.Color = req.body.Color ? `${req.body.Color.trim().substring(0,60).replace(/'/g, '')}` : '';    
    req.body.Remark = req.body.Remark ? `${req.body.Remark.trim().substring(0,50).replace(/'/g, '')}` : '';
    req.body.Unit = req.body.Unit ? `${req.body.Unit.trim().substring(0,10).replace(/'/g, '')}` : '';
    req.body.SupplierID = req.body.SupplierID ? `${req.body.SupplierID.trim().substring(0,15).replace(/'/g, '')}` : '';
    req.body.Pantone_No = req.body.Pantone_No ? `${req.body.Pantone_No.trim().substring(0,15).replace(/'/g, '')}` : '';
    req.body.Update_From = req.body.Update_From ? `${req.body.Update_From.trim().substring(0,10).replace(/'/g, '')}` : '';
    req.body.Update_To = req.body.Update_To ? `${req.body.Update_To.trim().substring(0,10).replace(/'/g, '')}` : '';
    req.body.Update_User = req.body.Update_User ? `${req.body.Update_User.trim().substring(0,20).replace(/'/g, '')}` : '';
    req.body.Material_History = req.body.Material_History ? 1 : 0;
    req.body.Only_Composites = req.body.Only_Composites ? 1 : 0;
    
/*
    var Search = req.body.Material ? req.body.Material.replace(/'/g, "''").split(" "):[];
    req.body.strSQL_Search = ''
    Search.forEach((item, idx) => {
      var condition = format(` And ( charindex(N'{0}', (isnull(m.Material_Category,'') + SPACE(1) + isnull(md.Material_Specific,'')), 0) > 0 ) 
      `, item);
      req.body.strSQL_Search += condition;
   });
 */
    var strSQL = format(`
    SELECT Top 2000
    mc.Material_ColorID
    , ISNULL(mc.Material_Color, '') AS Material_Color
    , md.Material_DetailID
    , ISNULL(md.Material_Specific, '') AS Material_Specific
    , m.MaterialID
    , ISNULL(m.Material_Category, '') AS Material_Category
    , ISNULL(m.L2_Material_Category, '') AS L2_Material_Category
    , isnull(m.Material_Category,'') + SPACE(1) + isnull(md.Material_Specific,'') AS Material
    , isnull(mc.Remark,'') as Remark
    , ISNULL(mc.SupplierID, '') AS SupplierID
    , isnull(mc.Photo_Month,'') as Photo_Month
    , mc.Photo_Upload
    , CASE WHEN mc.Photo_Month IS NULL OR mc.Photo_Month = '' THEN '/Datas/Images/System/Blank.png' ELSE '/Datas/Images/Materials/Photos/' + mc.Photo_Month + '/Thumb/' + LTRIM(mc.Material_ColorID) + '.jpg?tmp=' + CONVERT(varchar(25), GetDate(), 126) END AS Photo
    , ISNULL(mc.Pantone_No, N'') AS Pantone_No
    , case when mc.Update_Date is not null then convert(varchar(10),mc.Update_Date,111) else '' end Update_Date
    , ISNULL(mc.Update_User, '') AS Update_User
    , ISNULL(mc.Currency, '') AS Currency
    , mc.Unit_Price
    , mc.Purchase_Price
    , m.Unit
    , CAST(isnull(mc.Composite,0) AS int) AS Composite_Flag
    , case when m.History_Date is not null or md.History_Date is not null or mc.History_Date is not null then 1 else 0 end Material_Lock_Flag
    , case when m.History_Date is not null then convert(varchar(10), m.History_Date, 111) 
      when md.History_Date is not null then convert(varchar(10), md.History_Date, 111) 
      when mc.History_Date is not null then convert(varchar(10), mc.History_Date, 111) else '' End as Material_History
    , case when isnull(mc.Price_Approve,'') = '' then 0 else 1 end as Price_Approve
    FROM Material m WITH (NoLock, NoWait)
    Left Outer JOIN Material_Detail md WITH (NoLock, NoWait) ON md.MaterialID = m.MaterialID
    Left Outer JOIN Material_Color mc WITH (NoLock, NoWait) ON mc.Material_DetailID = md.Material_DetailID 
    WHERE ( 0 = {Only_Composites} or CAST(isnull(mc.Composite,0) AS int) = 1)
    --And ( 0 = {Material_History} or (m.History_Date is not null or md.History_Date is not null or mc.History_Date is not null))
    And ( 1 = {Material_History} or (m.History_Date is null and md.History_Date is null and mc.History_Date is null))  
    ${ req.body.Approve_Type == 'Approve' ? "And isnull(mc.Price_Approve, N'') <> N'' " :  req.body.Approve_Type == 'NotApprove' ? "And isnull(mc.Price_Approve, N'') = N'' " : '' }
    AND (N'{Material_Category}' = '' or ISNULL(m.Material_Category, N'') like N'%{Material_Category}%')
    AND (N'{L2_Material_Category}' = '' or ISNULL(m.L2_Material_Category, N'') like N'%{L2_Material_Category}%')
    AND (N'{Material_Specific}' = '' or ISNULL(md.Material_Specific, N'') like N'%{Material_Specific}%')
    AND ({Material_ColorID} = 0 or [Material_ColorID] = {Material_ColorID})
    AND (N'{Color}' = '' or ISNULL(mc.Material_Color, N'') like N'%{Color}%')
    AND (N'{Remark}' = '' or ISNULL(mc.Remark, N'') like N'%{Remark}%')
    AND (N'{Unit}' = '' or ISNULL(m.Unit, N'') like N'%{Unit}%')
    AND (N'{SupplierID}' = '' or ISNULL(mc.SupplierID, N'') like N'%{SupplierID}%')
    AND (N'{Pantone_No}' = '' or ISNULL(mc.Pantone_No, N'') like N'%{Pantone_No}%')
    AND (('{Update_From}'='' or '{Update_To}'='') or convert(varchar(10),mc.Update_Date,111) between '{Update_From}' AND '{Update_To}') 
    AND (N'{Update_User}' = '' or ISNULL(mc.Update_User, N'') like N'%{Update_User}%')
    Order by m.Material_Category;
    `, req.body) ;
    //console.log(strSQL)
    db.sql(req.Enterprise, strSQL)
       .then((result) => {
          res.send(result.recordset);
       }).catch((err) => {
          console.log(err);
          res.status(500).send(err);
       })
});
 
 //Get Material_Info
 router.post('/Material_Info',  function (req, res, next) {
   console.log("Call Material_Info Api:",req.body);
 
   req.body.MaterialID = req.body.MaterialID ? req.body.MaterialID : 0;
   req.body.Material_DetailID = req.body.Material_DetailID ? req.body.Material_DetailID : 0;
   req.body.Mode = req.body.Mode ? req.body.Mode : 0;
   var strSQL = "";
   //Mode == 0 Get Material, Material_Detail, Material_CCC_Code, Material And Program_Tip Data
   //Mode == 1 Get Material Data
   //Mode == 2 Get Material_Detail Data
   //Mode == 3 Get Material_CCC_Code Data
   //Mode == 4 Get Program_Tip Data
   
   strSQL = format(`
    Declare @Mode int = {Mode} , @MaterialID int = {MaterialID};
    if(@Mode = 0 or @Mode = 1)
    Begin
      SELECT p.[MaterialID]
      , p.[Material_Category]
      , p.[L2_Material_Category]
      , p.[L3_Material_Category]
      , p.[Material_ControlID]
      , c.[Material_Control]
      , c.[Material_Category] as Material_Category_F
      , c.[Material_Specific] as Material_Specific_F
      , c.[Material_Color] as Material_Color_F
      , c.[Material_GroupID]
      , g.[Material_Group]
      , p.[Unit]
      , p.[Packing_Unit]
      , p.[isIBL]
      , case when isnull(p.Create_Date,'') = '' then '' else Convert(varchar(20), p.[Create_Date],120) End as [Create_Date]
      , case when isnull(p.History_Date,'') = '' then '' else Convert(varchar(20), p.[History_Date],120) End as [History_Date]
      , iif(isnull(p.History_Date,'') = '', 'unlock','lock') as History_Flag
      FROM Material p WITH (NoLock, NoWait)
      Left Outer Join Material_Control c with(NoLock,NoWait) on p.Material_ControlID = c.Material_ControlID
      Left Outer Join Material_Group g with(NoLock,NOWait) on c.Material_GroupID = g.Material_GroupID
      WHERE p.MaterialID = @MaterialID;
    End
    if(@Mode = 0 or @Mode = 2)
    Begin
      SELECT [Material_DetailID]
      ,[MaterialID]
      ,[Material_Specific]
      ,[L2_Material_Specific]
      ,[L3_Material_Specific]
      ,[Update_User]
      , case when isnull(p.Date,'') = '' then '' else Convert(varchar(20), p.[Date],120) End as [Date]
      ,[History_User]
      , case when isnull(p.History_Date,'') = '' then '' else Convert(varchar(20), p.[History_Date],120) End as [History_Date]
      , iif(isnull(p.History_Date,'') = '', 'unlock','lock') as History_Flag
      , case when isnull((select count(*) From Material_Color mc Where mc.Material_DetailID = p.Material_DetailID),0) = 0 then 1 else 0 end as Edit_Flag
      FROM Material_Detail p WITH (NoLock, NoWait)
      WHERE p.MaterialID = @MaterialID;    
    End
    if(@Mode = 0 or @Mode = 3)
    Begin
      SELECT p.[ID]
      , p.[MaterialID]
      , p.[CCC_CodeID]
      , c.[Region]
      , c.[CCC_Code]
      , c.[Description]
      , c.[Unit]          
      , case when isnull(p.Update_Date,'') = '' then '' else Convert(varchar(20), p.[Update_Date],120) End as [Update_Date]
      FROM Material_CCC_Code p WITH (NoLock, NoWait)
      Inner Join CCC_Code c with(NoLock,NoWait) on p.CCC_CodeID = c.CCC_CodeID
      WHERE p.MaterialID = @MaterialID;
    End
    if(@Mode = 0 or @Mode = 4)
    Begin
      SELECT [Program_TipID]
          ,[Tip_Name]
          ,[Tip]
      FROM [dbo].[Program_Tip]
      WHERE Program_TipID = 1
    End
    `, req.body) ;        

   //console.log(strSQL)
   db.sql(req.Enterprise, strSQL)
      .then((result) => {
         var DataSet = {Material_Info: (req.body.Mode == 0 || req.body.Mode == 1) ? result.recordsets[0] : []
           , Material_Detail_Info: (req.body.Mode == 0) ? result.recordsets[1] : (req.body.Mode == 2 ? result.recordsets[0] : [])
           , Material_CCC_Code_Info: (req.body.Mode == 0) ? result.recordsets[2] : (req.body.Mode == 3 ? result.recordsets[0] : [])
           , Program_Tip: (req.body.Mode == 0) ? result.recordsets[3] : (req.body.Mode == 4 ? result.recordsets[0] : [])
        };
        
        //console.log(DataSet)
        res.send(DataSet);
      }).catch((err) => {
         console.log(err);
         res.status(500).send(err);
      })
});

 //Get Material_Color_Info
 router.post('/Material_Color_Info',  function (req, res, next) {
  console.log("Call Material_Color_Info Api:",req.body);

  req.body.Material_DetailID = req.body.Material_DetailID ? req.body.Material_DetailID : 0;
  var strSQL = "";
  //Get Material_Color Data
  
  strSQL = format(`
   Declare @Material_DetailID int = {Material_DetailID};

     SELECT [Material_ColorID]
     ,[Material_DetailID]
     ,[Material_Color]
     ,[L2_Material_Color]
     ,[L3_Material_Color]
     ,[Pantone_No]
     ,[Net_Weight]
     ,[Packaging_Weight]
     ,[Width]
     ,[Length]
     ,[Height]
     ,[Stock_Qty]
     ,[Order_Qty]
     ,[Booking_QTY]
     ,[Require_Qty]
     ,[Photo_Month]
     ,[Photo_Upload]
     ,[Photo_Uploader]
     ,[Swatch]
     ,[Component_PhotoID]
     ,[SupplierID]
     ,[Currency]
     ,[Unit_Price]
     ,[Purchase_Price]
     ,[Remark]
     , case when isnull(p.Update_Date,'') = '' then '' else Convert(varchar(20), p.[Update_Date],120) End as [Update_Date]
     ,[Update_User]
     ,[Price_Approve]
     ,[Composite]
     , case when isnull(p.Date,'') = '' then '' else Convert(varchar(20), p.[Date],120) End as [Date]
     ,[History_User]
     , case when isnull(p.History_Date,'') = '' then '' else Convert(varchar(20), p.[History_Date],120) End as [History_Date]
     , iif(isnull(p.History_Date,'') = '', 'unlock','lock') as History_Flag
     , case when isnull((Select count(*) From Product_Structure ps with(NoLock,NoWait) Where ps.Material_ColorID = p.Material_ColorID),0) = 0 
     and isnull((Select count(*) From Product_Technical_Sheet_Detail pd with(NoLock,NoWait) Where pd.Material_ColorID = p.Material_ColorID),0) = 0 
     then 1 else 0 end as Edit_Flag
     FROM Material_Color p WITH (NoLock, NoWait)
     WHERE p.Material_DetailID = @Material_DetailID;
   
   `, req.body) ;        

  //console.log(strSQL)
  db.sql(req.Enterprise, strSQL)
     .then((result) => {
        var DataSet = { Material_Color_Info: result.recordsets[0] 
       };
       
       DataSet.Material_Color_Info.forEach((item,idx) => {        
         item.Net_Weight = Math.round((item.Net_Weight)*1000)/1000;
         item.Packaging_Weight = Math.round((item.Packaging_Weight)*1000)/1000;
         item.Stock_Qty = Math.round((item.Stock_Qty)*1000)/1000;
         item.Order_Qty = Math.round((item.Order_Qty)*1000)/1000;
         item.Booking_QTY = Math.round((item.Booking_QTY)*1000)/1000;
         item.Require_Qty = Math.round((item.Require_Qty)*1000)/1000;
         item.Unit_Price = Math.round((item.Unit_Price)*1000)/1000;
         item.Purchase_Price = Math.round((item.Purchase_Price)*1000)/1000;
       });  
       //console.log(DataSet)
       res.send(DataSet);
     }).catch((err) => {
        console.log(err);
        res.status(500).send(err);
     })
});

//Maintain Material
router.post('/Material_Maintain',  function (req, res, next) {
  console.log("Call Material_Maintain Api:",req.body);
 
  // req.body.Mode === 0 表示新增
  // req.body.Mode === 1 表示修改 
  // req.body.Mode === 2 表示刪除   
  req.body.MaterialID = req.body.MaterialID != null ? req.body.MaterialID : null;

  var strSQL = format(`Declare  @ROWCOUNT int = 0, @MaterialID int = {MaterialID}; 
    `, req.body);
  
  switch(req.body.Mode){
     case 0:
        req.body.Material_Category = req.body.Material_Category != null ? `N'${req.body.Material_Category.trim().substring(0,65).replace(/'/g, '')}'` : `''`;
        req.body.L2_Material_Category = req.body.L2_Material_Category != null ? `N'${req.body.L2_Material_Category.trim().substring(0,65).replace(/'/g, '')}'` : `''`;
        req.body.Material_ControlID = req.body.Material_ControlID != null ? req.body.Material_ControlID : null;
        req.body.Unit = req.body.Unit != null ? `N'${req.body.Unit.trim().substring(0,30).replace(/'/g, '')}'` : `''`;
        req.body.Packing_Unit = req.body.Packing_Unit != null ? `N'${req.body.Packing_Unit.trim().substring(0,65535).replace(/'/g, '')}'` : `''`;

        strSQL += format(`
        Insert into [dbo].[Material] ([Material_Category], [L2_Material_Category], [Material_ControlID], [Unit], [Packing_Unit], [isIBL], [Create_Date])
        Select {Material_Category} as Material_Category
        , {L2_Material_Category} as L2_Material_Category
        , {Material_ControlID} as Material_ControlID
        , {Unit} as Unit
        , {Packing_Unit} as Packing_Unit
        , 0 as [isIBL]
        , GetDate() as Create_Date

        Set @ROWCOUNT = @@ROWCOUNT;
        Set @MaterialID = scope_identity();
        `, req.body);
        break;
     case 1:
      var Size = 0;
      switch(req.body.Name){
        case 'Material_Category':
        case 'L2_Material_Category':
           Size = 35;
        break;
        case 'Unit':
        case 'Packing_Unit':
            Size = 10;
        break;
        case 'Material_ControlID':
            Size = 4;
        break;
        default:
        break;
      }
      req.body.Value = Size == 0 ? (req.body.Value != null ? req.body.Value : null) : (req.body.Value != null ? `N'${req.body.Value.trim().replace(/'/g, "''")}'` : `''`);

      strSQL += format(`     
        Update [dbo].[Material] Set [{Name}] = ${Size == 0 ? '{Value}': `substring({Value},1,${Size})`} 
        where MaterialID = @MaterialID
        And (Select count(*) From Material_Detail md where md.MaterialID = @MaterialID) = 0;
        Set @ROWCOUNT = @@ROWCOUNT;
        `, req.body);

        break;
     case 2:
        strSQL += format(`    
        Delete FROM [dbo].[Material]
        where MaterialID = @MaterialID
        And (Select count(*) From Material_Detail md where md.MaterialID = @MaterialID) = 0;
        Set @ROWCOUNT = @@ROWCOUNT;
        `, req.body);      
        break;
  }

  strSQL += format(`    
    Select @ROWCOUNT as Flag, @MaterialID as MaterialID;
    `, req.body);       
  console.log(strSQL)
  db.sql(req.Enterprise, strSQL)
     .then((result) => {
        //console.log(result)
        var DataSet = {Flag: result.recordsets[0][0].Flag > 0, MaterialID: result.recordsets[0][0].MaterialID} ;
        res.send(DataSet);
     }).catch((err) => {
        console.log(err);
        res.status(500).send(err);
     })

});

//Maintain Material_Detail
router.post('/Material_Detail_Maintain',  function (req, res, next) {
  console.log("Call Material_Detail_Maintain Api:",req.body);
 
  // req.body.Mode === 0 表示新增
  // req.body.Mode === 1 表示修改 
  // req.body.Mode === 2 表示刪除   
  // req.body.Mode === 3 表示上鎖/解鎖

  req.body.MaterialID = req.body.MaterialID != null ? req.body.MaterialID : null;
  req.body.Material_DetailID = req.body.Material_DetailID != null ? req.body.Material_DetailID : null;

  var strSQL = format(`Declare  @ROWCOUNT int = 0, @Material_DetailID int = {Material_DetailID}; 
    `, req.body);
  
  switch(req.body.Mode){
     case 0:
        req.body.Material_Specific = req.body.Material_Specific != null ? `N'${req.body.Material_Specific.trim().substring(0,100).replace(/'/g, '')}'` : `''`;

        strSQL += format(`
        Insert into [dbo].[Material_Detail] ([MaterialID], [Material_Specific], [Update_User], [Date])
        Select {MaterialID} as MaterialID
        , {Material_Specific} as Material_Specific
        , N'${req.UserID}' as Update_User
        , GetDate() as [Date]

        Set @ROWCOUNT = @@ROWCOUNT;
        Set @Material_DetailID = scope_identity();
        `, req.body);
        break;
     case 1:
      var Size = 0;
      switch(req.body.Name){
        case 'Material_Specific':
        case 'L2_Material_Specific':
           Size = 100;
        break;
        default:
        break;
      }
      req.body.Value = Size == 0 ? (req.body.Value != null ? req.body.Value : null) : (req.body.Value != null ? `N'${req.body.Value.trim().replace(/'/g, "''")}'` : `''`);

      strSQL += format(`     
        Update [dbo].[Material_Detail] Set [{Name}] = ${Size == 0 ? '{Value}': `substring({Value},1,${Size})`} 
        where Material_DetailID = @Material_DetailID
        And (Select count(*) From Material_Color mc where mc.Material_DetailID = @Material_DetailID) = 0;
        Set @ROWCOUNT = @@ROWCOUNT;
        `, req.body);

        break;
     case 2:
        strSQL += format(`    
        Delete FROM [dbo].[Material_Detail]
        where Material_DetailID = @Material_DetailID
        And (Select count(*) From Material_Color mc where mc.Material_DetailID = @Material_DetailID) = 0;
        Set @ROWCOUNT = @@ROWCOUNT;
        `, req.body);      
        break;
     case 3:
        strSQL += format(`     
        Update [dbo].[Material_Detail] Set [History_Date] = iif([History_Date] is null, GetDate(), null)
        , History_User = N'${req.UserID}'
        , Update_User = N'${req.UserID}'
        , [Date] = GetDate()
        where Material_DetailID = @Material_DetailID;
        Set @ROWCOUNT = @@ROWCOUNT;
        `, req.body);
        break;
  }

  strSQL += format(`    
    Select @ROWCOUNT as Flag, @Material_DetailID as Material_DetailID;
    `, req.body);       
  //console.log(strSQL)
  db.sql(req.Enterprise, strSQL)
     .then((result) => {
        //console.log(result)
        var DataSet = {Flag: result.recordsets[0][0].Flag > 0, Material_DetailID: result.recordsets[0][0].Material_DetailID} ;
        res.send(DataSet);
     }).catch((err) => {
        console.log(err);
        res.status(500).send(err);
     })

});

//Maintain Material_Color
router.post('/Material_Color_Maintain',  function (req, res, next) {
  console.log("Call Material_Color_Maintain Api:",req.body);
 
  // req.body.Mode === 0 表示新增
  // req.body.Mode === 1 表示修改 
  // req.body.Mode === 2 表示刪除   
  // req.body.Mode === 3 表示上鎖/解鎖  
  req.body.Material_DetailID = req.body.Material_DetailID != null ? req.body.Material_DetailID : null;
  req.body.Material_ColorID = req.body.Material_ColorID != null ? req.body.Material_ColorID : null;

  var strSQL = format(`Declare  @ROWCOUNT int = 0, @Material_ColorID int = {Material_ColorID}; 
    `, req.body);
  
  switch(req.body.Mode){
     case 0:
        req.body.Material_Color = req.body.Material_Color != null ? `N'${req.body.Material_Color.trim().substring(0,70).replace(/'/g, '')}'` : `''`;
        req.body.SupplierID = req.body.SupplierID != null ? `N'${req.body.SupplierID.trim().substring(0,15).replace(/'/g, '')}'` : `''`;
        req.body.Currency = req.body.Currency != null ? `N'${req.body.Currency.trim().substring(0,4).replace(/'/g, '')}'` : `''`;
        req.body.Unit_Price = req.body.Unit_Price != null ? req.body.Unit_Price : null;
        req.body.Purchase_Price = req.body.Purchase_Price != null ? req.body.Purchase_Price : null;

        strSQL += format(`
        Insert into [dbo].[Material_Color] ([Material_DetailID], [Material_Color], SupplierID, Currency, Unit_Price, Purchase_Price, [Update_User], [Update_Date], [Date])
        Select {Material_DetailID} as [Material_DetailID]
        , {Material_Color} as [Material_Color]
        , {SupplierID} as SupplierID
        , {Currency} as Currency
        , {Unit_Price} as Unit_Price 
        , {Purchase_Price} as Purchase_Price 
        , N'${req.UserID}' as [Update_User]
        , GetDate() as [Update_Date]
        , GetDate() as [Date]

        Set @ROWCOUNT = @@ROWCOUNT;
        Set @Material_ColorID = scope_identity();
        `, req.body);
        break;
     case 1:
      var Size = 0;
      switch(req.body.Name){
        case 'Material_Color':
           Size = 100;
        break;
        case 'SupplierID':
           Size = 25;
        break;
        case 'Currency':
           Size = 10;
        break;
        default:
        break;
      }
      req.body.Value = Size == 0 ? (req.body.Value != null ? req.body.Value : null) : (req.body.Value != null ? `N'${req.body.Value.trim().replace(/'/g, "''")}'` : `''`);

      strSQL += format(`     
        Update [dbo].[Material_Color] Set [{Name}] = ${Size == 0 ? '{Value}': `substring({Value},1,${Size})`} 
        where Material_ColorID = @Material_ColorID
        And (Select count(*) From Product_Structure mc where mc.Material_ColorID = @Material_ColorID) = 0
        And (Select count(*) From Product_Technical_Sheet_Detail mc where mc.Material_ColorID = @Material_ColorID) = 0 ;
        Set @ROWCOUNT = @@ROWCOUNT;
        `, req.body);

        break;
     case 2:
        strSQL += format(`    
        Delete FROM [dbo].[Material_Color]
        where Material_ColorID = @Material_ColorID
        And (Select count(*) From Product_Structure mc where mc.Material_ColorID = @Material_ColorID) = 0
        And (Select count(*) From Product_Technical_Sheet_Detail mc where mc.Material_ColorID = @Material_ColorID) = 0 ;
        Set @ROWCOUNT = @@ROWCOUNT;
        `, req.body);      
        break;
     case 3:
        strSQL += format(`     
        Update [dbo].[Material_Color] Set [History_Date] = iif([History_Date] is null, GetDate(), null)
        , History_User = N'${req.UserID}'        
        , Update_User = N'${req.UserID}'
        , [Date] = GetDate()
        where Material_ColorID = @Material_ColorID;
        Set @ROWCOUNT = @@ROWCOUNT;
        `, req.body);
        break;

  }

  strSQL += format(`    
    Select @ROWCOUNT as Flag, @Material_ColorID as Material_ColorID;
    `, req.body);       
  // console.log(strSQL)
  db.sql(req.Enterprise, strSQL)
     .then((result) => {
        //console.log(result)
        var DataSet = {Flag: result.recordsets[0][0].Flag > 0, Material_ColorID: result.recordsets[0][0].Material_ColorID} ;
        res.send(DataSet);
     }).catch((err) => {
        console.log(err);
        res.status(500).send(err);
     })

});

//Maintain Material_CCC_Code
router.post('/Material_CCC_Code_Maintain',  function (req, res, next) {
  console.log("Call Material_CCC_Code_Maintain Api:",req.body);
 
  // req.body.Mode === 0 表示新增
  // req.body.Mode === 1 表示修改 
  // req.body.Mode === 2 表示刪除   
  req.body.MaterialID = req.body.MaterialID != null ? req.body.MaterialID : null;
  req.body.ID = req.body.ID != null ? req.body.ID : null;

  var strSQL = format(`Declare  @ROWCOUNT int = 0, @ID int = {ID}; 
    `, req.body);
  
  switch(req.body.Mode){
     case 0:
        req.body.CCC_CodeID = req.body.CCC_CodeID != null ? req.body.CCC_CodeID : null;

        strSQL += format(`
        Insert into [dbo].[Material_CCC_Code] ([MaterialID], [CCC_CodeID],[Update_Date])
        Select {MaterialID} as [MaterialID]
        , {CCC_CodeID} as [CCC_CodeID]
        , GetDate() as [Update_Date]

        Set @ROWCOUNT = @@ROWCOUNT;
        Set @ID = scope_identity();
        `, req.body);
        break;
     case 1:
      var Size = 0;
      switch(req.body.Name){
        case 'Material_Color':
           Size = 100;
        break;
        case 'SupplierID':
           Size = 25;
        break;
        case 'Currency':
           Size = 10;
        break;
        default:
        break;
      }
      req.body.Value = Size == 0 ? (req.body.Value != null ? req.body.Value : null) : (req.body.Value != null ? `N'${req.body.Value.trim().replace(/'/g, "''")}'` : `''`);

      strSQL += format(`     
        Update [dbo].[Material_CCC_Code] Set [{Name}] = ${Size == 0 ? '{Value}': `substring({Value},1,${Size})`} 
        where ID = @ID;

        Set @ROWCOUNT = @@ROWCOUNT;
        `, req.body);

        break;
     case 2:
        strSQL += format(`    
        Delete FROM [dbo].[Material_CCC_Code]
        where ID = @ID;

        Set @ROWCOUNT = @@ROWCOUNT;
        `, req.body);      
        break;
  }

  strSQL += format(`    
    Select @ROWCOUNT as Flag, @ID as ID;
    `, req.body);       
  //console.log(strSQL)
  db.sql(req.Enterprise, strSQL)
     .then((result) => {
        //console.log(result)
        var DataSet = {Flag: result.recordsets[0][0].Flag > 0, ID: result.recordsets[0][0].ID} ;
        res.send(DataSet);
     }).catch((err) => {
        console.log(err);
        res.status(500).send(err);
     })

});

//Get CCC_Code_List
router.post('/CCC_Code_List',  function (req, res, next) {
  console.log("Call CCC_Code_List Api:",req.body);
  
  req.body.Region = req.body.Region != null ? `${req.body.Region.trim().substring(0,50).replace(/'/g, '')}` : ``;
  req.body.CCC_CodeID = req.body.CCC_CodeID != null ? req.body.CCC_CodeID : '';
  req.body.CCC_Code = req.body.CCC_Code != null ? `${req.body.CCC_Code.trim().substring(0,13).replace(/'/g, '')}` : ``;
  req.body.Description = req.body.Description != null ? `${req.body.Description.trim().substring(0,50).replace(/'/g, '')}` : ``;
  req.body.Unit = req.body.Unit != null ? `${req.body.Unit.trim().substring(0,10).replace(/'/g, '')}` : ``;

  var strSQL = format(`
  SELECT TOP (1000) [CCC_CodeID]
  ,[Region]
  ,[CCC_Code]
  ,[Description]
  ,[Unit]
  , iif((Select count(*) From Material_CCC_Code mc where mc.CCC_CodeID = [CCC_Code].CCC_CodeID) = 0, 1, 0) as Edit_Flag
  FROM [dbo].[CCC_Code]
  WHERE (N'%{Region}%' = '' or ISNULL(Region, N'') like N'%{Region}%')
  And ('{CCC_CodeID}' = '' or [CCC_CodeID] like '%{CCC_CodeID}%')
  AND (N'%{CCC_Code}%' = '' or ISNULL(CCC_Code, N'') like N'%{CCC_Code}%')
  AND (N'%{Description}%' = '' or ISNULL(Description, N'') like N'%{Description}%')
  AND (N'%{Unit}%' = '' or ISNULL(Unit, N'') like N'%{Unit}%')
  Order by Description, CCC_Code;
  `, req.body) ;
  //console.log(strSQL)
  db.sql(req.Enterprise, strSQL)
     .then((result) => {
        res.send( {Material_CCC_Code_List:result.recordset});
     }).catch((err) => {
        console.log(err);
        res.status(500).send(err);
     })
});

//Maintain CCC_Code
router.post('/CCC_Code_Maintain',  function (req, res, next) {
  console.log("Call CCC_Code_Maintain Api:",req.body);
 
  // req.body.Mode === 0 表示新增
  // req.body.Mode === 1 表示修改 
  // req.body.Mode === 2 表示刪除   
  req.body.CCC_CodeID = req.body.CCC_CodeID != null ? req.body.CCC_CodeID : null;

  var strSQL = format(`Declare  @ROWCOUNT int = 0, @CCC_CodeID int = {CCC_CodeID}; 
    `, req.body);
  
  switch(req.body.Mode){
     case 0:
        req.body.Region = req.body.Region != null ? `N'${req.body.Region.trim().substring(0,50).replace(/'/g, '')}'` : `''`;
        req.body.CCC_Code = req.body.CCC_Code != null ? `N'${req.body.CCC_Code.trim().substring(0,13).replace(/'/g, '')}'` : `''`;
        req.body.Description = req.body.Description != null ? `N'${req.body.Description.trim().substring(0,50).replace(/'/g, '')}'` : `''`;
        req.body.Unit = req.body.Unit != null ? `N'${req.body.Unit.trim().substring(0,10).replace(/'/g, '')}'` : `''`;

        strSQL += format(`
        Insert into [dbo].[CCC_Code] ([Region], [CCC_Code],[Description], [Unit])
        Select {Region} as [Region]
        , {CCC_Code} as [CCC_Code]
        , {Description} as [Description]
        , {Unit} as [Unit]

        Set @ROWCOUNT = @@ROWCOUNT;
        Set @CCC_CodeID = scope_identity();
        `, req.body);
        break;
     case 1:
      var Size = 0;
      switch(req.body.Name){
        case 'Region':
        case 'Description':
           Size = 50;
        break;
        case 'CCC_Code':
           Size = 13;
        break;
        case 'Unit':
           Size = 10;
        break;
        default:
        break;
      }
      req.body.Value = Size == 0 ? (req.body.Value != null ? req.body.Value : null) : (req.body.Value != null ? `N'${req.body.Value.trim().replace(/'/g, "''")}'` : `''`);

      strSQL += format(`     
        Update [dbo].[CCC_Code] Set [{Name}] = ${Size == 0 ? '{Value}': `substring({Value},1,${Size})`} 
        where CCC_CodeID = @CCC_CodeID;

        Set @ROWCOUNT = @@ROWCOUNT;
        `, req.body);

        break;
     case 2:
        strSQL += format(`    
        Delete FROM [dbo].[CCC_Code]
        where CCC_CodeID = @CCC_CodeID
        And (Select count(*) From Material_CCC_Code mc where mc.CCC_CodeID = @CCC_CodeID) = 0;

        Set @ROWCOUNT = @@ROWCOUNT;
        `, req.body);      
        break;
  }

  strSQL += format(`    
    Select @ROWCOUNT as Flag, @CCC_CodeID as CCC_CodeID;
    `, req.body);       
  console.log(strSQL)
  db.sql(req.Enterprise, strSQL)
     .then((result) => {
        //console.log(result)
        var DataSet = {Flag: result.recordsets[0][0].Flag > 0, CCC_CodeID: result.recordsets[0][0].CCC_CodeID} ;
        res.send(DataSet);
     }).catch((err) => {
        console.log(err);
        res.status(500).send(err);
     })

});

//Get Material_Purchase_History
router.post('/Material_Purchase_History_Info',  async function (req, res, next) {
   console.log("Call Material_Purchase_History_Info Api:",req.body);
   
   req.body.Material_ColorID = req.body.Material_ColorID ? req.body.Material_ColorID : 0;

   var DataSet = {Sample_Sheet_Info:[]
      , Product_Structure_Info:[]
      , Material_Color_Info:[]
      , Produce_Info:[]
      , Purchase_Project_Info:[]};

   var strSQL = format(`Declare @Material_ColorID int = {Material_ColorID}

   --Sample_Sheet_Info
   Select pd.Product_No  
   From Product_Technical_Sheet_Detail pd with(NoWait,NoLock)  
   Where pd.Material_ColorID = @Material_ColorID 
   Group by pd.Product_No;

   --Product_Structure_Info
   Select ps.Product_No  
   From Product_Structure ps with(NoWait,NoLock)  
   Where ps.Material_ColorID = @Material_ColorID 
   Group by ps.Product_No
   union
   Select ps.Product_No  
   From Product_Structure ps with(NoWait,NoLock)
   Inner Join Material_Composite mc with(NoWait,NoLock) on mc.Master_ColorID = ps.Material_ColorID 
   Where mc.Detail_ColorID = @Material_ColorID 
   Group by ps.Product_No;

   --Material_Color_Info
   Select isnull(mc.Stock_Qty,0) as Stock_Qty
   , isnull(mc.Order_Qty,0) as Order_Qty
   , isnull(mc.Stock_Qty,0) + isnull(mc.Order_Qty,0) as On_Hand_Qty
   , isnull(mc.Require_Qty,0) as Require_Qty
   , isnull(mc.Stock_Qty,0) + isnull(mc.Order_Qty,0) - isnull(mc.Require_Qty,0) as Count_Qty
   From Material_Color mc with(NoWait,NoLock)
   Where mc.Material_ColorID = @Material_ColorID;

   `, req.body) ;
   //console.log(strSQL)
   await db.sql(req.Enterprise, strSQL)
   .then((result) => {
      DataSet.Sample_Sheet_Info = result.recordsets[0];
      DataSet.Product_Structure_Info = result.recordsets[1];
      DataSet.Material_Color_Info = result.recordsets[2];

      DataSet.Material_Color_Info.forEach((item,idx) => {
         item.Stock_Qty = Math.round((item.Stock_Qty)*100)/100;
         item.Order_Qty = Math.round((item.Order_Qty)*100)/100;
         item.On_Hand_Qty = Math.round((item.On_Hand_Qty)*100)/100;
         item.Require_Qty = Math.round((item.Require_Qty)*100)/100;
         item.Count_Qty = Math.round((item.Count_Qty)*100)/100;
      });

   }).catch((err) => {
      console.log(err);
      res.status(500).send(err);
   });

   strSQL = format(`Declare @Material_ColorID int = {Material_ColorID}

   --Produce Info
   SELECT distinct p.Produce_No
   , p.Product_No
   , p.Material_Update
   FROM dbo.Produce_Detail pd with(NoLock,NoWait)
   INNER JOIN dbo.Produce p with(NoLock,NoWait) ON pd.Produce_No = p.Produce_No
   Where pd.Material_ColorID = @Material_ColorID
   ORDER BY p.Produce_No desc;

   --Purchase Project Info
   Select pd.Purchase_DetailID 
   , CONVERT(varchar(10), p.Purchase_Date, 111) AS Purchase_Date
   , p.Currency
   , isnull(pd.Unit_Price,0) as Price
   , pd.Purchase_Project_No
   , isnull(pd.Project_Qty,0) as Project_Qty
   , p.Purchase_No
   , p.WarehouseID
   , isnull(pd.Qty,0) as Qty
   , StockIn.WarehouseID as WarehouseID_In
   , isnull(StockIn.In_Qty,0) as In_Qty
   , StockOut.WarehouseID as WarehouseID_Out
   , isnull(StockOut.Out_Qty,0) as Out_Qty
   From Purchase_Detail pd with(NoLock,NoWait)
   Left Outer Join Purchase p with(NoLock,NoWait) on pd.Purchase_No = p.Purchase_No
   Left Outer Join (
       Select  si.WarehouseID, sid.Purchase_DetailID, sum(sid.In_Qty) as In_Qty
       From Stock_In_Detail sid with(NoLock,NoWait) 
       Inner Join Stock_In si with(NoLock,NoWait) on si.Stock_In_No = sid.Stock_In_No 
       Where sid.Material_ColorID = @Material_ColorID
       Group by  si.WarehouseID, sid.Purchase_DetailID
   ) StockIn on StockIn.Purchase_DetailID = pd.Purchase_DetailID 
   Left Outer Join (
       Select so.WarehouseID, sod.Purchase_DetailID, sum(sod.Out_Qty) as Out_Qty
       From Stock_Out_Detail sod with(NoLock,NoWait) 
       Inner Join Stock_Out so with(NoLock,NoWait) on so.Stock_Out_No = sod.Stock_Out_No 
       Where sod.Material_ColorID = @Material_ColorID
       Group by  so.WarehouseID, sod.Purchase_DetailID
   ) StockOut on StockOut.Purchase_DetailID = pd.Purchase_DetailID and StockOut.WarehouseID = p.WarehouseID
   Where pd.Material_ColorID = @Material_ColorID
   Order by pd.Purchase_DetailID desc;
   `, req.body) ;
   //console.log(strSQL)

   await db.sql(req.SiteDB, strSQL)
      .then((result) => {
         DataSet.Produce_Info = result.recordsets[0];
         DataSet.Purchase_Project_Info = result.recordsets[1];

         DataSet.Purchase_Project_Info.forEach((item,idx) => {
            item.Price = Math.round((item.Price)*100)/100;
            item.Project_Qty = Math.round((item.Project_Qty)*100)/100;
            item.Qty = Math.round((item.Qty)*100)/100;
            item.In_Qty = Math.round((item.In_Qty)*100)/100;
            item.Out_Qty = Math.round((item.Out_Qty)*100)/100;
         });
   
      }).catch((err) => {
         console.log(err);
         res.status(500).send(err);
      })

   res.send(DataSet);   
});

 //Get Material_Price_Approve_Info
 router.post('/Material_Price_Approve_Info',  function (req, res, next) {
  console.log("Call Material_Price_Approve_Info Api:",req.body);

  req.body.Mode = req.body.Mode ? req.body.Mode : 0;
  req.body.Material_DetailID = req.body.Material_DetailID ? req.body.Material_DetailID : 0;
  req.body.Material_ColorID = req.body.Material_ColorID ? req.body.Material_ColorID : 0;

  var strSQL = "";
  //Mode == 0 Get Material_Color Data query by Material_ColorID and Material_Color data query by Material_DetailID And Purchase_Detail data query by Material_ColorID
  //Mode == 1 Get Material_Color Data query by Material_ColorID
  //Mode == 2 Get Material_Color data query by Material_DetailID
  //Mode == 3 Get Purchase_Detail data query by Material_ColorID
  
  strSQL = format(`
   Declare @Mode int = {Mode} , @Material_ColorID int = {Material_ColorID} , @Material_DetailID int = {Material_DetailID};
   if(@Mode = 0 or @Mode = 1)
   Begin
     SELECT [SupplierID]
     ,[Currency]
     ,[Unit_Price]
     ,[Purchase_Price]
     ,[Remark]
     , isnull(Price_Approve,'') as Price_Approve
     , iif(isnull(Price_Approve,'')='', 0, 1)  as Price_Approve_Flag
     FROM Material_Color p WITH (NoLock, NoWait)
     WHERE p.Material_ColorID = @Material_ColorID;
   End
   if(@Mode = 0 or @Mode = 2)
   Begin
     SELECT [Material_ColorID]
     ,[Material_Color]
     ,[SupplierID]
     ,[Currency]
     ,[Unit_Price]
     ,[Purchase_Price]
     FROM Material_Color p WITH (NoLock, NoWait)
     WHERE p.Material_DetailID = @Material_DetailID
     And ('{Material_Color}' = '' or Material_Color like N'%{Material_Color}%')
     And ('{SupplierID}' = '' or SupplierID like N'%{SupplierID}%')
     And ('{Currency}' = '' or Currency = '{Currency}');
   End
   if(@Mode = 0 or @Mode = 3)
   Begin
     SELECT p.Purchase_Project_No, cast(round(sum(p.Project_Qty),4) as money) as Project_Qty, p.[Unit_Price]          
     FROM Purchase_Detail p WITH (NoLock, NoWait)
     WHERE p.Material_ColorID = @Material_ColorID
     Group by p.Purchase_Project_No, p.[Unit_Price]
     Order by p.Purchase_Project_No;
   End
   `, req.body) ;        

  //console.log(strSQL)
  db.sql(req.SiteDB, strSQL)
     .then((result) => {
        var DataSet = {Material_Price_Info: (req.body.Mode == 0 || req.body.Mode == 1) ? result.recordsets[0] : []
          , Material_Color_Info: (req.body.Mode == 0) ? result.recordsets[1] : (req.body.Mode == 2 ? result.recordsets[0] : [])
          , Purchase_Project_Info: (req.body.Mode == 0) ? result.recordsets[2] : (req.body.Mode == 3 ? result.recordsets[0] : [])
       };
       
       //console.log(DataSet)
       res.send(DataSet);
     }).catch((err) => {
        console.log(err);
        res.status(500).send(err);
     })
});

//Maintain Material_Price_Approve
router.post('/Material_Price_Approve_Maintain',  function (req, res, next) {
  console.log("Call Material_Price_Approve_Maintain Api:",req.body);
 
  // req.body.Mode === 0 表示新增
  // req.body.Mode === 1 表示修改 
  // req.body.Mode === 2 表示刪除   
  req.body.Material_DetailID = req.body.Material_DetailID != null ? req.body.Material_DetailID : null;
  req.body.Material_ColorID = req.body.Material_ColorID != null ? req.body.Material_ColorID : null;

  var strSQL = format(`Declare  @ROWCOUNT int = 0, @Material_ColorID int = {Material_ColorID}; 
    `, req.body);
  
  switch(req.body.Mode){
     case 0:
        req.body.Material_Color = req.body.Material_Color != null ? `N'${req.body.Material_Color.trim().substring(0,70).replace(/'/g, '')}'` : `''`;
        req.body.SupplierID = req.body.SupplierID != null ? `N'${req.body.SupplierID.trim().substring(0,15).replace(/'/g, '')}'` : `''`;
        req.body.Currency = req.body.Currency != null ? `N'${req.body.Currency.trim().substring(0,4).replace(/'/g, '')}'` : `''`;
        req.body.Unit_Price = req.body.Unit_Price != null ? req.body.Unit_Price : null;
        req.body.Purchase_Price = req.body.Purchase_Price != null ? req.body.Purchase_Price : null;

        strSQL += format(`
        Insert into [dbo].[Material_Color] ([Material_DetailID], [Material_Color], SupplierID, Currency, Unit_Price, Purchase_Price, [Update_User], [Update_Date], [Date])
        Select {Material_DetailID} as [Material_DetailID]
        , {Material_Color} as [Material_Color]
        , {SupplierID} as SupplierID
        , {Currency} as Currency
        , {Unit_Price} as Unit_Price 
        , {Purchase_Price} as Purchase_Price 
        , N'${req.UserID}' as [Update_User]
        , GetDate() as [Update_Date]
        , GetDate() as [Date]

        Set @ROWCOUNT = @@ROWCOUNT;
        Set @Material_ColorID = scope_identity();
        `, req.body);
        break;
     case 1:
      var Size = 0;
      switch(req.body.Name){
        case 'Remark':
           Size = 50;
           req.body.Value = Size == 0 ? (req.body.Value != null ? req.body.Value : null) : (req.body.Value != null ? `N'${req.body.Value.trim().replace(/'/g, "''")}'` : `''`);

           strSQL += format(`     
             Update [dbo].[Material_Color] Set [{Name}] = ${Size == 0 ? '{Value}': `substring({Value},1,${Size})`} 
             where Material_ColorID = @Material_ColorID ;
             Set @ROWCOUNT = @@ROWCOUNT;
             `, req.body);     
        break;
        case 'Unit_Price':
          strSQL += format(`     
            Update [dbo].[Material_Color] Set [Unit_Price] = {Value}
            , Purchase_Price = iif({Value} < Purchase_Price, {Value}, Purchase_Price)
            where Material_ColorID = @Material_ColorID ;
            Set @ROWCOUNT = @@ROWCOUNT;
            `, req.body);     
        break;
        case 'Purchase_Price':
          strSQL += format(`     
            Update [dbo].[Material_Color] Set Purchase_Price = iif({Value} > [Unit_Price], [Unit_Price], {Value})
            where Material_ColorID = @Material_ColorID ;
            Set @ROWCOUNT = @@ROWCOUNT;
            `, req.body);     
        break;
        case 'Price_Approve':
          strSQL += format(`
            Update [dbo].[Material_Color] Set Price_Approve = iif({Value}=1, N'${req.UserID}', null)
            where Material_ColorID = @Material_ColorID;
            Set @ROWCOUNT = @@ROWCOUNT;
            `, req.body);    
        break;
        default:
        break;
      }

        break;
     case 2:
        strSQL += format(`    
        Delete FROM [dbo].[Material_Color]
        where Material_ColorID = @Material_ColorID
        And (Select count(*) From Product_Structure mc where mc.Material_ColorID = @Material_ColorID) = 0
        And (Select count(*) From Product_Technical_Sheet_Detail mc where mc.Material_ColorID = @Material_ColorID) = 0 ;
        Set @ROWCOUNT = @@ROWCOUNT;
        `, req.body);      
        break;

  }

  strSQL += format(`    
    Select @ROWCOUNT as Flag, @Material_ColorID as Material_ColorID;
    `, req.body);       
   //console.log(strSQL)
  db.sql(req.Enterprise, strSQL)
     .then((result) => {
        //console.log(result)
        var DataSet = {Flag: result.recordsets[0][0].Flag > 0, Material_ColorID: result.recordsets[0][0].Material_ColorID} ;
        res.send(DataSet);
     }).catch((err) => {
        console.log(err);
        res.status(500).send(err);
     })

});

 module.exports = router;