var express = require('express');
var router = express.Router();
const format = require('string-format');
var db = require('../../config/DB_Connect');
let moment = require('moment');

//Get Purchase Project Target
router.post('/Get_PP_Target',  function (req, res, next) {
   console.log("Call Get_PP_Target Api:",req.body);

   var strSQL = format(` 
   SELECT CustomerID FROM Customer with(NoLock,NoWait)
   union
   SELECT Brand as CustomerID FROM Brand with(NoLock,NoWait)
   ORDER BY CustomerID;
   `, req.body) ;
   //console.log(strSQL)
   db.sql(req.Enterprise, strSQL)
      .then((result) => {
         //console.log(result.recordset[0].RecCount <= 0)
         res.send(result.recordsets[0]);
      }).catch((err) => {
         console.log(err);
         res.status(500).send(err);
      })

});

//Get Factory
router.post('/Get_Factory',  function (req, res, next) {
   console.log("Call Get_Factory Api:",req.body);

   var strSQL = format(` 
   SELECT DISTINCT f.FactoryID
   FROM Factory f with(NoLock,NoWait)
   INNER JOIN Factory_Sub fs on fs.FactoryID = f.FactoryID
   WHERE fs.OrganizationID Is Not Null
   ORDER BY f.FactoryID;   
   `, req.body) ;
   //console.log(strSQL)
   db.sql(req.SiteDB, strSQL)
      .then((result) => {
         //console.log(result.recordset[0].RecCount <= 0)
         res.send(result.recordsets[0]);
      }).catch((err) => {
         console.log(err);
         res.status(500).send(err);
      })

});

//Get Factory
router.post('/Get_Factory_Sub',  function (req, res, next) {
  console.log("Call Get_Factory_Sub Api:",req.body);

  var strSQL = format(` 
  SELECT fs.Factory_SubID
  FROM Factory_Sub fs 
  --WHERE fs.OrganizationID = (Select OrganizationID From Control)
  WHERE fs.OrganizationID Is Not Null
  ORDER BY fs.Factory_SubID;   
  `, req.body) ;
  //console.log(strSQL)
  db.sql(req.SiteDB, strSQL)
     .then((result) => {
        //console.log(result.recordset[0].RecCount <= 0)
        res.send(result.recordsets[0]);
     }).catch((err) => {
        console.log(err);
        res.status(500).send(err);
     })

});


//Get Country
router.post('/Get_Country',  function (req, res, next) {
   console.log("Call Get_Country Api:",req.body);

   req.body.Purchase_Project_No = req.body.Purchase_Project_No ? `N'${req.body.Purchase_Project_No.trim().replace(/'/g, '')}'` : `''`;

   var strSQL = format(` 
   Declare @Purchase_Project_No varchar(15) = {Purchase_Project_No}

   SELECT distinct s.Country
   FROM Purchase_Detail pd with(NoLock,NoWait)
   INNER JOIN Supplier s with(NoLock,NoWait) on pd.SupplierID = s.SupplierID 
   Where pd.Purchase_Project_No = @Purchase_Project_No   
   ORDER BY s.Country; 
   `, req.body) ;
   //console.log(strSQL)
   db.sql(req.SiteDB, strSQL)
      .then((result) => {
         //console.log(result.recordset[0].RecCount <= 0)
         res.send(result.recordsets[0]);
      }).catch((err) => {
         console.log(err);
         res.status(500).send(err);
      })

});

//Get PP Supplier
router.post('/Get_PP_Supplier',  function (req, res, next) {
   console.log("Call Get_PP_Supplier Api:",req.body);

   req.body.Purchase_Project_No = req.body.Purchase_Project_No ? `N'${req.body.Purchase_Project_No.trim().replace(/'/g, '')}'` : `''`;

   var strSQL = format(` 
   Declare @Purchase_Project_No varchar(15) = {Purchase_Project_No}

   SELECT distinct s.SupplierID, s.Supplier_Name, s.Address
   FROM Purchase_Detail pd with(NoLock,NoWait)
   INNER JOIN Supplier s with(NoLock,NoWait) on pd.SupplierID = s.SupplierID 
   Where pd.Purchase_Project_No = @Purchase_Project_No   
   ORDER BY s.SupplierID; 
   `, req.body) ;
   //console.log(strSQL)
   db.sql(req.SiteDB, strSQL)
      .then((result) => {
         //console.log(result.recordset[0].RecCount <= 0)
         res.send(result.recordsets[0]);
      }).catch((err) => {
         console.log(err);
         res.status(500).send(err);
      })

});

//Get PP Product
router.post('/Get_PP_Product',  function (req, res, next) {
   console.log("Call Get_PP_Product Api:",req.body);

   req.body.Purchase_Project_No = req.body.Purchase_Project_No ? `N'${req.body.Purchase_Project_No.trim().replace(/'/g, '')}'` : `''`;

   var strSQL = format(` 
   Declare @Purchase_Project_No varchar(15) = {Purchase_Project_No}

   SELECT distinct p.Product_No
   FROM Produce p with(NoLock,NoWait)   
   Where p.Purchase_Project_No = @Purchase_Project_No   
   ORDER BY p.Product_No; 
   `, req.body) ;
   //console.log(strSQL)
   db.sql(req.SiteDB, strSQL)
      .then((result) => {
         //console.log(result.recordset[0].RecCount <= 0)
         res.send(result.recordsets[0]);
      }).catch((err) => {
         console.log(err);
         res.status(500).send(err);
      })

});

//取得 Department (OrganizationID) 資料
router.post('/Department', function (req, res, next) {
   console.log("Call Department Api Department:", req.body);

   var strSQL = format(`
   SELECT isnull([Department_Code],'') + ' (' + d.OrganizationID + ')' as Label
   , [Department_Code] as Value
   FROM [Department] d WITH (NoWait, Nolock) 
   --Inner Join Control c WITH (NoWait, Nolock) on d.OrganizationID = c.OrganizationID
   where d.Department_Code is not null
   --And Department_Category = 'Sales'
   And d.History is null
   Order by SortID
   `, req.body);
 
   //console.log(strSQL)
   db.sql(req.SiteDB, strSQL)
   .then((result)=>{
     //console.log(result)
     res.send(result.recordset);
   }).catch((err)=>{
     console.log(err);
     res.status(500).send(err);
   })
 });

//Check Purchase_Project_No
router.post('/Check_Purchase_Project_No',  function (req, res, next) {
   console.log("Call Check_Purchase_Project_No Api:",req.body);

   req.body.Purchase_Project_No = req.body.Purchase_Project_No ? `${req.body.Purchase_Project_No.trim().replace(/'/g, '')}` : '';

   var strSQL = format(` Declare @RecCount int, @LenCounter int;
   Set @LenCounter = Len(N'{Purchase_Project_No}');

   SELECT @RecCount = Count(*)
   FROM [dbo].[Purchase_Project] With(Nolock,NoWait)
   where ([Purchase_Project_No] = N'{Purchase_Project_No}');

   Select case when @LenCounter > 15 then @LenCounter else @RecCount end as RecCount;
   `, req.body) ;
   //console.log(strSQL)
   db.sql(req.SiteDB, strSQL)
      .then((result) => {
         //console.log(result.recordset[0].RecCount <= 0)
         res.send({Flag: result.recordset[0].RecCount <= 0});
      }).catch((err) => {
         console.log(err);
         res.status(500).send(err);
      })

});

//Check_Purchase_Data_Maintain_Status
router.post('/Check_Purchase_Data_Maintain_Status',  function (req, res, next) {
   console.log("Call Check_Purchase_Data_Maintain_Status Api:",req.body);

   req.body.Purchase_Project_No = req.body.Purchase_Project_No ? `'${req.body.Purchase_Project_No.trim().replace(/'/g, '')}'` : '';

   var strSQL = format(`
   SELECT isnull(p.PPIC_User,'') as PPIC_User
   , case when isnull(p.PPIC_Date,'') = '' then '' else Convert(varchar(20), p.[PPIC_Date],120) End as [PPIC_Date]
   FROM Purchase_Project p WITH (NoLock, NoWait)
   WHERE p.Purchase_Project_No = {Purchase_Project_No}

   SELECT cast((case when count(*) > 0 then 1 else 0 end) as bit) as Flag
   , isnull(Purchase.UserID,'') as UserID
   , count(*) as RecCount
   FROM Purchase_Detail INNER JOIN Purchase ON Purchase_Detail.Purchase_No = Purchase.Purchase_No
   WHERE ((DateAdd(day,30,IIf([Expected_Delivery] is null,[Delivery_Date],[Expected_Delivery])) < GetDate()) AND (Purchase_Detail.Close_Date Is Null) AND (Purchase.Delivery_Date Is Not Null))
   AND (Purchase.UserID = N'${req.UserID}')
   Group by Purchase.UserID ;
   `, req.body) ;
   //console.log(strSQL)
   db.sql(req.SiteDB, strSQL)
      .then((result) => {
         //console.log(result.recordsets[0].length)
         res.send({PPIC_User: result.recordsets[0].length ? result.recordsets[0][0].PPIC_User : ''
            , PPIC_Date: result.recordsets[0].length ? result.recordsets[0][0].PPIC_Date : ''
            , Purchase_Data_Maintain_Flag: result.recordsets[1].length ? result.recordsets[1][0].Flag : ''
            , UserID: result.recordsets[1].length ? result.recordsets[1][0].UserID : ''
            , RecCount: result.recordsets[1].length ? result.recordsets[1][0].RecCount : ''
          });
      }).catch((err) => {
         console.log(err);
         res.status(500).send(err);
      })

});

//Get Purchase_Project_No
router.post('/Purchase_Project',  function (req, res, next) {
   console.log("Call Purchase_Project Api:",req.body);

   var strSQL = format(` 
   SELECT pp.Purchase_Project_No
   FROM [dbo].[Purchase_Project] pp With(Nolock,NoWait)
   where pp.ACC_Close is null 
   And pp.Close_Date is null
   And pp.Require_Date is not null;
   `, req.body) ;
   //console.log(strSQL)
   db.sql(req.SiteDB, strSQL)
      .then((result) => {
         //console.log(result.recordset[0].RecCount <= 0)
         res.send(result.recordsets[0]);
      }).catch((err) => {
         console.log(err);
         res.status(500).send(err);
      })

});

//Get Purchase_Project Produce_No
router.post('/Get_Purchase_Project_Produce_No',  function (req, res, next) {
   console.log("Call Get_Purchase_Project_Produce_No Api:",req.body);

   req.body.Purchase_Project_No = req.body.Purchase_Project_No ? `${req.body.Purchase_Project_No.trim().replace(/'/g, '')}` : '';
   req.body.Purchase_DetailID = req.body.Purchase_DetailID ? req.body.Purchase_DetailID : 0;

   var strSQL = format(` 
   Declare @Purchase_Project_No varchar(20) = {Purchase_Project_No}
   Declare @Purchase_DetailID int = {Purchase_DetailID}
   
   SELECT p.Produce_No, 
   FROM [dbo].[Produce] p With(Nolock,NoWait)
   Left Outer Join Purchase_Detail_Sub ps With(Nolock,NoWait) on ps.Produce_No = p.Produce_No and ps.Purchase_DetailID = @Purchase_DetailID
   where p.Purchase_Project_No = @Purchase_Project_No
   And ps.Produce_No is null;
   `, req.body) ;
   //console.log(strSQL)
   db.sql(req.SiteDB, strSQL)
      .then((result) => {
         //console.log(result.recordset[0].RecCount <= 0)
         res.send(result.recordsets[0]);
      }).catch((err) => {
         console.log(err);
         res.status(500).send(err);
      })

});

//Get Purchase_Project_List
router.post('/Purchase_Project_List',  function (req, res, next) {
    console.log("Call Purchase_Project_List Api:");
    
    req.body.Purchase_Project_No = req.body.Purchase_Project_No ? `${req.body.Purchase_Project_No.trim().substring(0,15).replace(/'/g, '')}` : '';
    req.body.Apply_Date = req.body.Apply_Date ? `${req.body.Apply_Date.trim().substring(0,10).replace(/'/g, '')}` : '';
    req.body.Season = req.body.Season ? `${req.body.Season.trim().substring(0,10).replace(/'/g, '')}` : '';    
    req.body.Target = req.body.Target ? `${req.body.Target.trim().substring(0,20).replace(/'/g, '')}` : '';
    req.body.Category = req.body.Category ? `${req.body.Category.trim().substring(0,15).replace(/'/g, '')}` : '';
    req.body.Require_Date = req.body.Require_Date ? `${req.body.Require_Date.trim().substring(0,10).replace(/'/g, '')}` : '';
    req.body.Close_Date = req.body.Close_Date ? `${req.body.Close_Date.trim().substring(0,10).replace(/'/g, '')}` : '';
    req.body.ACC_Close = req.body.ACC_Close ? `${req.body.ACC_Close.trim().substring(0,10).replace(/'/g, '')}` : '';
    req.body.Department = req.body.Department ? `${req.body.Department.trim().substring(0,5).replace(/'/g, '')}` : '';
    req.body.Factory_SubID = req.body.Factory_SubID ? `${req.body.Factory_SubID.trim().substring(0,15).replace(/'/g, '')}` : '';
    req.body.Purpose = req.body.Purpose ? `${req.body.Purpose.trim().substring(0,11).replace(/'/g, '')}` : '';
    req.body.PPIC_User = req.body.PPIC_User ? `${req.body.PPIC_User.trim().substring(0,20).replace(/'/g, '')}` : '';
    req.body.Engineer = req.body.Engineer ? `${req.body.Engineer.trim().substring(0,20).replace(/'/g, '')}` : '';
    req.body.Purchaser = req.body.Purchaser ? `${req.body.Purchaser.trim().substring(0,20).replace(/'/g, '')}` : '';
    req.body.Manager = req.body.Manager ? `${req.body.Manager.trim().substring(0,20).replace(/'/g, '')}` : '';
 
    var strSQL = format(`
    SELECT Top 1000 IIf([Close_Date] is null,'99999999', convert(varchar(10),[Close_Date],112)) + IIf([Require_Date] is null And [Purpose]='merchandise','99999999','00000000') + (convert(varchar(10),[Apply_Date],112)) as SortID
    , [Purchase_Project_No]
    ,  Convert(varchar(10), [Apply_Date],111) as Apply_Date
    , isnull([Season],'') as [Season]
    , isnull([CustomerID],'') as Target
    , isnull([Category],'') as [Category]
    , iif([Require_Date] is null, '', Convert(varchar(10), [Require_Date],111)) as Require_Date
    , iif([Close_Date] is null, '', Convert(varchar(10), [Close_Date],111)) as Close_Date
    , iif([ACC_Close] is null, '', Convert(varchar(10), [ACC_Close],111)) as ACC_Close
    , isnull([Accounting],'') as [Accounting]
    , isnull([Department],'') as [Department]
    , isnull([Factory_SubID],'') as [Factory_SubID]
    , isnull([Purpose],'') as [Purpose]
    , isnull([PPIC_User],'') as [PPIC_User]
    , iif([PPIC_Date] is null, '', Convert(varchar(10), [PPIC_Date],111)) as PPIC_Date
    , isnull([Engineer],'') as [Engineer]
    , iif([Engineer_Date] is null, '', Convert(varchar(10), [Engineer_Date],111)) as Engineer_Date
    , isnull([Purchaser],'') as [Purchaser]
    , isnull([Manager],'') as [Manager]
    , isnull([MTR_Declare_Rate],0.7) as [MTR_Declare_Rate]
    FROM [dbo].[Purchase_Project] pp With(Nolock,NoWait)
    where (N'{Purchase_Project_No}' = '' or [Purchase_Project_No] like N'%{Purchase_Project_No}%')
    And (N'{Apply_Date}' = '' or CONVERT (varchar(10), [Apply_Date], 111) LIKE N'{Apply_Date}%')
    And (N'{Season}' = '' or [Season] like N'{Season}%')    
    And (N'{Target}' = '' or [CustomerID] like N'%{Target}%')
    And (N'{Category}' = '' or [Category] like N'%{Category}%')
    And (N'{Require_Date}' = '' or CONVERT (varchar(10), [Require_Date], 111) LIKE N'{Require_Date}%')
    And (N'{Close_Date}' = '' or CONVERT (varchar(10), [Close_Date], 111) LIKE N'{Close_Date}%')
    And (N'{ACC_Close}' = '' or CONVERT (varchar(10), [ACC_Close], 111) LIKE N'{ACC_Close}%')       
    And (N'{Department}' = '' or [Department] like N'%{Department}%')
    And (N'{Factory_SubID}' = '' or [Factory_SubID] like N'%{Factory_SubID}%')
    And (N'{Purpose}' = '' or [Purpose] like N'%{Purpose}%')
    And (N'{PPIC_User}' = '' or [PPIC_User] like N'%{PPIC_User}%')
    And (N'{Engineer}' = '' or [Engineer] like N'%{Engineer}%')
    And (N'{Purchaser}' = '' or [Purchaser] like N'%{Purchaser}%')
    And (N'{Manager}' = '' or [Manager] like N'%{Manager}%')
    ORDER BY IIf([Close_Date] is null,'99999999', convert(varchar(10),[Close_Date],112)) + IIf([Require_Date] is null And [Purpose]='merchandise','99999999','00000000') + (convert(varchar(10),[Apply_Date],112)) desc;
    `, req.body) ;
    //console.log(strSQL)
    db.sql(req.SiteDB, strSQL)
       .then((result) => {
          res.send(result.recordset);
       }).catch((err) => {
          console.log(err);
          res.status(500).send(err);
       })
 });

 //Get Purchase_Project_Info
router.post('/Purchase_Project_Info',  function (req, res, next) {
   console.log("Call Purchase_Project_Info Api:",req.body);
  
   req.body.Mode = req.body.Mode ? req.body.Mode : 0;
   req.body.Purchase_Project_No = req.body.Purchase_Project_No ? `N'${req.body.Purchase_Project_No.trim().substring(0,15).replace(/'/g, '')}'` : `''`;
   //req.body.QueryData = req.body.QueryData ? `N'${req.body.QueryData.trim().replace(/'/g, "''")}'` : `''`;
   req.body.Sort_Info = req.body.Sort_Info.length > 0 ? req.body.Sort_Info : 'Master_Purchase_DetailID DESC , abs(isnull(Master_Purchase_Item,0)) DESC, abs(isnull(Sub_Purchase_Item,0)) DESC, Purchase_DetailID DESC, Composites_SortID, Material_Category, Material_Specific, Material_Color, M_Rmk';
   req.body.Composite = req.body.Composite ? 1 : 0;
   req.body.Purchasing = req.body.Purchasing ? 1 : 0;
   req.body.Supplement = req.body.Supplement ? 1 : 0;
   req.body.Purchased = req.body.Purchased ? 1 : 0;
   req.body.Confirm = req.body.Confirm ? 1 : 0;
   req.body.Approaching = req.body.Approaching ? 1 : 0;
   req.body.Delay = req.body.Delay ? 1 : 0;
   req.body.Active = req.body.Active ? 1 : 0;
   req.body.QueryData = req.body.QueryData != null ? `N'${req.body.QueryData.replace(/'/g, "''")}'` : `''`;

   //Mode == 0 Get Purchase_Project, Purchase_Detail, Produce and currency Info
   //Mode == 1 Get Purchase_Project Data
   //Mode == 2 Get Purchase_Detail Data
   //Mode == 3 Get Produce Data
   //Mode == 4 Get currency Info
   //Mode == 5 Check User Purchase Data Maintain Status
      
   var strSQL = format(`
   Declare @Mode int = {Mode};
 
   if(@Mode = 0 or @Mode = 1)
   Begin
      SELECT p.[Purchase_Project_No]
      , p.Season
      , p.CustomerID
      , isnull(p.Purpose,'') as Purpose
      , isnull(p.Category,'') as Category
      , Convert(varchar(10), [Apply_Date],120) as [Apply_Date]
      , case when iif( isnull(p.Purpose,'') = 'Others', DateAdd(month, 12, cast(Apply_Date as Date)), DateAdd(month, 6, cast(Apply_Date as Date)) ) >= cast(GetDate() as Date) then 1 else 0 end as Add_Purchase_Detail_Flag
      , Convert(varchar(10), [Require_Date],111) as [Require_Date]
      , Convert(varchar(20), [Close_Date],120) as [Close_Date]
      , Convert(varchar(20), p.[ACC_Close],120) as [ACC_Close]
      , cast(case when p.[Close_Date] is null then 0 else 1 end as bit) as Project_Close_Flag
      , cast(case when p.[ACC_Close] is null then 0 else 1 end as bit) as ACC_Close_Flag
      , isnull(p.Department,'') as Department
      , iif(isnull(p.Department,'') = '', '', (Select distinct isnull(p.Department,'') + ' (' + OrganizationID + ')' From Department d with(NoLock,NoWait) Where d.Department_Code = isnull(p.Department,''))  ) as Department_D
      , isnull(p.MTR_Declare_Rate,0.7) as MTR_Declare_Rate
      , isnull(p.Engineer,'') as Engineer
      , isnull(p.PPIC_User,'') as PPIC_User
      , isnull(p.Purchaser,'') as Purchaser
      , isnull(p.Manager,'') as Manager
      , cast(case when p.[Engineer_Date] is null then 0 else 1 end as bit) as Engineer_Flag
      , cast(case when p.[Update_Date] is null then 0 else 1 end as bit) as Purchaser_Flag
      , cast(case when p.[Manager] is null then 0 else 1 end as bit) as Manager_Flag      
      , case when isnull(p.Engineer_Date,'') = '' then '' else Convert(varchar(20), p.[Engineer_Date],120) End as [Engineer_Date]
      , case when isnull(p.PPIC_Date,'') = '' then '' else Convert(varchar(20), p.[PPIC_Date],120) End as [PPIC_Date]
      , case when isnull(p.Update_Date,'') = '' then '' else Convert(varchar(20), p.[Update_Date],120) End as [Purchaser_Date]
      , isnull(p.Accounting,'') as Accounting
      , ABS(isnull(p.[Import_With_Composites],0)) as Import_With_Composites
      , p.Factory_SubID 
      , (Select Default_WarehouseID From Control) as Default_WarehouseID
      FROM Purchase_Project p WITH (NoLock, NoWait)
      WHERE p.Purchase_Project_No = {Purchase_Project_No}
   End
   if(@Mode = 0 or @Mode = 2)
   Begin
      SELECT pd.Purchase_DetailID
      , abs(isnull(pd.Master_Purchase_Item,0)) as Master_Purchase_Item
      , abs(isnull(pd.Sub_Purchase_Item,0)) as Sub_Purchase_Item
      , case when abs(isnull(pd.Master_Purchase_Item,0)) = 1 then 'Master_Material'
         else 
            case when abs(isnull(pd.Master_Purchase_Item,0)) = 0 and abs(isnull(pd.Sub_Purchase_Item,0)) = 1 then 'Sub_Material' 
            else 
               ''
            End
         end as Material_Type
      , pd.Master_Purchase_DetailID
      , pd.Orig_Master_Purchase_DetailID
      , pd.Composites_SortID
      , pd.Purchase_Project_No
      , pd.Purchase_No
      , isnull(convert(varchar(10),p.Purchase_Date,111), '') as Purchase_Date
      , Convert(varchar(05), p.Purchase_Date,22) as Purchase_Date_S
      , isnull(convert(varchar(10),p.Delivery_Date,111), '') as Delivery_Date
      , isnull(convert(varchar(10),p.Delivery_Date,111), '') as Org_Delivery_Date
      , Convert(varchar(05), p.Delivery_Date,22) as Delivery_Date_S
      , p.WarehouseID
      , pr.Purchase_Responsible
      , pd.Purchase_ResponsibleID
      , pd.SupplierID
      , iif(s.History_Date Is Null,0,1) as Supplier_History_Flag
      , isnull(pd.isIBL,0) as isIBL
      , pd.MaterialID
      , pd.Material_DetailID
      , pd.Material_ColorID
      , mc.Swatch
      , pd.Material_Category
      , pd.Material_Specific
      , pd.Material_Color
      , pd.Orig_Material_ColorID
      , isnull(cast(pd.Material_ColorID as nvarchar),'')
      + iif(isnull(cast(pd.Orig_Material_ColorID as nvarchar),'') = '', '', ' ('+ isnull(cast(pd.Orig_Material_ColorID as nvarchar),'') + ') ') 
      + ' ' + isnull(pd.Material_Category,'') + ' ' + isnull(pd.Material_Specific,'') + ' ' + isnull(pd.Material_Color,'') as Material
      , pd.M_Rmk
      , pd.Currency
      , isnull(pd.Quot_Price,0) as Quot_Price
      , isnull(pd.Orig_Price,0) as Orig_Price
      , isnull(pd.Unit_Price,0) as Unit_Price
      , isnull(mc.Purchase_Price,0) as Purchase_Price
      , case when Round(isnull(pd.[Unit_Price] / nullif(mc.[Purchase_Price], 0 ) ,0),2) * 100 <> 0 
         then cast(Round(isnull(pd.[Unit_Price] / nullif(mc.[Purchase_Price], 0 ) ,0),2) * 100 as varchar)+'%'
         else '' End as Price_Rate
      , pd.Unit
      , isnull(pd.Project_Qty,0) as Project_Qty
      , isnull(pd.Cost_Qty,0) as Cost_Qty
      , IIf(abs(isnull(pd.Sub_Purchase_Item,0)) = 1, 0, pd.[Cost_Qty]) as MCost_Qty
      , isnull(pd.Qty,0) as Qty
      , isnull(pd.Purchase_In_Qty,0) as Purchase_In_Qty
      , isnull(pd.Project_In_Qty,0) as Project_In_Qty
      , isnull(pd.Stock_In_Qty,0) as Stock_In_Qty
      , isnull(pd.Qty,0) - isnull(pd.Stock_In_Qty,0) - isnull(pd.Short_Qty,0)  as Not_In_Qty
      , isnull(pd.Charge_In_Qty,0) as Charge_In_Qty
      , isnull(pd.Stock_Out_Qty,0) as Stock_Out_Qty
      , isnull(pd.Qty,0) - isnull(pd.Stock_Out_Qty,0) - isnull(pd.Short_Qty,0) as Not_Out_Qty
      , isnull(pd.Charge_Out_Qty,0) as Charge_Out_Qty
      , case when abs(isnull(pd.Master_Purchase_Item,0)) = 0 then isnull(pd.Project_Qty,0) * isnull(pd.[Unit_Price],0) * isnull(c.Currency_Rate,0) else 0 end as Project_Amount
      , case when abs(isnull(pd.Master_Purchase_Item,0)) = 0 then isnull(pd.Cost_Qty,0) * isnull(pd.[Unit_Price],0) * isnull(c.Currency_Rate,0) else 0 end as Cost_Amount
      , case when abs(isnull(pd.Master_Purchase_Item,0)) = 0 then isnull(pd.Stock_In_Qty,0) * isnull(pd.[Unit_Price],0) * isnull(c.Currency_Rate,0) else 0 end as Stock_In_Amount
      , case when abs(isnull(pd.Master_Purchase_Item,0)) = 0 then isnull(pd.Charge_In_Qty,0) * isnull(pd.[Unit_Price],0) * isnull(c.Currency_Rate,0) else 0 end as Stock_In_Cost
      , case when abs(isnull(pd.Master_Purchase_Item,0)) = 0 then isnull(pd.Stock_Out_Qty,0) * isnull(pd.[Unit_Price],0) * isnull(c.Currency_Rate,0) else 0 end as Stock_Out_Amount
      , case when abs(isnull(pd.Master_Purchase_Item,0)) = 0 then isnull(pd.Charge_Out_Qty,0) * isnull(pd.[Unit_Price],0) * isnull(c.Currency_Rate,0) else 0 end as Stock_Out_Cost
      , case when abs(isnull(pd.Master_Purchase_Item,0)) = 0 then (isnull(pd.Qty,0) - isnull(pd.Stock_Out_Qty,0) - isnull(pd.Short_Qty,0)) * isnull(pd.[Unit_Price],0) * isnull(c.Currency_Rate,0) else 0 end as Not_Out_Amount
      , case when abs(isnull(pd.Master_Purchase_Item,0)) = 0 then (isnull(pd.Cost_Qty,0) - isnull(pd.Charge_Out_Qty,0)) * isnull(pd.[Unit_Price],0) * isnull(c.Currency_Rate,0) else 0 end as Not_Out_Cost
      , case when abs(isnull(pd.Master_Purchase_Item,0)) = 0 then isnull(pd.Use_Stock_Qty,0) * isnull(pd.[Unit_Price],0) * isnull(c.Currency_Rate,0) else 0 end as Use_Stock_Cost
      , pd.Use_Stock_WarehouseID
      , pd.Use_Stock_Season
      , cast(isnull(pd.Use_Stock_Qty,0) as decimal(18, 4)) as Use_Stock_Qty
      , isnull(pd.Short_Qty,0) as Short_Qty
      , cast(isnull(pd.Memo,'') as nvarchar) as Memo
      , isnull(pd.Unpurchase,0) as Unpurchase
      , isnull(pd.Supplement,0) as Supplement
      , isnull(convert(varchar(10),pd.Expected_Delivery,111), '') as Expected_Delivery
      , isnull(convert(varchar(10),pd.Expected_Delivery,111), '') as Org_Expected_Delivery
      , Convert(varchar(05), pd.Expected_Delivery,22) as Expected_Delivery_S
      , isnull(convert(varchar(10),pd.Close_Date,111), '') as Close_Date
      , Convert(varchar(05), pd.Close_Date,22) as Close_Date_S
      , pd.Orig_Purchase_DetailID
      , pd.Transfer_Purchase_DetailID
      , pd.JudgeID
      , isnull(pd.Update_User,'') as Update_User
      , case when isnull(pd.Update_Time,'') = '' then '' else Convert(varchar(20), pd.Update_Time,120) End as Update_Time
      --, Cast(Case when (isnull(pp.Update_Date,'') <> '' or isnull(pp.Engineer_Date,'') = '') And isnull(tmp.Recount,0) = 0 And (ABS(isnull(pd.Master_Purchase_Item,0)) = 1 or pd.Master_Purchase_DetailID is null) And pd.Orig_Material_ColorID is null and pd.Purchase_No is null and pd.Close_Date is null and pp.Close_Date is null and pp.ACC_Close is null And isnull(pd.Stock_In_Qty,0) = 0 then 1 else 0 end as bit) as Material_Change_Flag      
      , Cast(Case when (isnull(pp.Update_Date,'') <> '' or isnull(pp.Engineer_Date,'') = '') And isnull(tmp.Recount,0) = 0 And (ABS(isnull(pd.Master_Purchase_Item,0)) = 1 or pd.Master_Purchase_DetailID is null) And pd.Purchase_No is null and pd.Close_Date is null and pp.Close_Date is null and pp.ACC_Close is null And isnull(pd.Stock_In_Qty,0) = 0 then 1 else 0 end as bit) as Material_Change_Flag            
      , Cast(Case when (isnull(pp.Update_Date,'') <> '' or isnull(pp.Engineer_Date,'') = '') And isnull(tmp.Recount,0) = 0 And pd.Purchase_No is null And (ABS(isnull(pd.Master_Purchase_Item,0)) = 1 or pd.Master_Purchase_DetailID is null) and pp.Close_Date is null and pp.ACC_Close is null then 1 else 0 end as bit) as Edit_Supplement_Flag
      , Cast(Case when (isnull(pp.Update_Date,'') <> '' or isnull(pp.Engineer_Date,'') = '') And isnull(tmp.Recount,0) = 0 And pd.Close_Date is null and pp.Close_Date is null and pp.ACC_Close is null then 1 else 0 end as bit) as Edit_Project_Qty_Flag
      , Cast(Case when (isnull(pp.Update_Date,'') <> '' or isnull(pp.Engineer_Date,'') = '') And pd.Purchase_No is null And ABS(isnull(pd.Master_Purchase_Item,0)) = 0 And isnull(pd.Stock_In_Qty,0) = 0 And pp.Close_Date is null and pp.ACC_Close is null then 1 else 0 end as bit) as Edit_Unpurchase_Flag      
      , Cast(Case when (isnull(pp.Update_Date,'') <> '' or isnull(pp.Engineer_Date,'') = '') And ABS(isnull(pd.Master_Purchase_Item,0)) = 0 And isnull(pd.Stock_In_Qty,0) = 0 And ABS(isnull(pd.Unpurchase,0)) = 0 and pp.Close_Date is null and pp.ACC_Close is null then 1 else 0 end as bit) as Edit_Use_Stock_Qty_Flag
      , Cast(Case when (isnull(pp.Update_Date,'') <> '' or isnull(pp.Engineer_Date,'') = '') And (isnull(tmp.Recount,0) <> 0 or pd.Purchase_No is not null) And (ABS(isnull(pd.Master_Purchase_Item,0)) = 1 or pd.Master_Purchase_DetailID is null) and pp.Close_Date is null and pp.ACC_Close is null then 1 else 0 end as bit) as Edit_Purchase_Qty_Flag
      , Cast(Case when (isnull(pp.Update_Date,'') <> '' or isnull(pp.Engineer_Date,'') = '') And pd.Close_Date is null And pp.Close_Date is null and pp.ACC_Close is null then 1 else 0 end as bit) as Edit_Responsible_Flag
      , Cast(Case when (isnull(pp.Update_Date,'') <> '' or isnull(pp.Engineer_Date,'') = '') And ABS(isnull(pd.Master_Purchase_Item,0)) = 0 And pd.Purchase_No is not null and pp.Close_Date is null And pp.ACC_Close is null then 1 else 0 end as bit) as Edit_Short_Qty_Flag
      , Cast(Case when (isnull(pp.Update_Date,'') <> '' or isnull(pp.Engineer_Date,'') = '') And ABS(isnull(pd.Master_Purchase_Item,0)) = 0 And pd.Purchase_No is not null And isnull(tmp_Purchase.Stock_in_Qty,0) = 0 And pd.Close_Date is null and pp.Close_Date is null And pp.ACC_Close is null then 1 else 0 end as bit) as Edit_Delivery_Flag
      , Cast(Case when (isnull(pp.Update_Date,'') <> '' or isnull(pp.Engineer_Date,'') = '') And ABS(isnull(pd.Master_Purchase_Item,0)) = 0 And pd.Close_Date is null and pp.Close_Date is null And pp.ACC_Close is null then 1 else 0 end as bit) as Edit_Expected_Delivery_Flag      
      , Cast(Case when isnull(mc.Composite,0) = 0 and ABS(isnull(pd.Master_Purchase_Item,0)) = 0 And pd.Close_Date is null and pp.Close_Date is null and pp.ACC_Close is null then 1 else 0 end as bit) as Material_Price_Update_Flag
      , Cast(Case when (isnull(pp.Update_Date,'') <> '' or isnull(pp.Engineer_Date,'') = '') And isnull(tmp.Recount,0) = 0 And (ABS(isnull(pd.Master_Purchase_Item,0)) = 1 or pd.Master_Purchase_DetailID is null) And pd.Orig_Material_ColorID is null and pd.Purchase_No is null and pd.Close_Date is null and pp.Close_Date is null and pp.ACC_Close is null then 1 else 0 end as bit) as Edit_Flag
      , Cast(Case when (isnull(pp.Update_Date,'') <> '' or isnull(pp.Engineer_Date,'') = '') And isnull(tmp.Recount,0) = 0 And (ABS(isnull(pd.Master_Purchase_Item,0)) = 1 or pd.Master_Purchase_DetailID is null) And pd.Orig_Material_ColorID is null and pd.Purchase_No is null and pd.Close_Date is null and pp.Close_Date is null and pp.ACC_Close is null And isnull(pd.Stock_In_Qty,0) = 0 then 1 else 0 end as bit) as Del_Flag      
      , s.History_Date as Supplier_History_Date
      , isnull(s.Sample_Discount,'') as Sample_Discount
      , isnull(mc.Price_Approve,'') as Price_Approve
      FROM Purchase_Detail pd WITH(NoLock, NoWait)
      Inner Join Purchase_Project pp with(NoLock,NoWait) on pp.Purchase_Project_No = pd.Purchase_Project_No
      Left Outer Join Purchase p with(NoLock,NoWait) on p.Purchase_No = pd.Purchase_No
      Left Outer JOIN dbo.[@Currency_Rate] c WITH(NoLock, NoWait) ON Convert(Date, pp.[Apply_Date]) = c.Exchange_Date and c.Currency = pd.Currency
      Left Outer Join Purchase_Responsible pr with(NoLock,NoWait) on pr.Purchase_ResponsibleID = pd.Purchase_ResponsibleID
      Left Outer Join Supplier s with(NoLock,NoWait) on s.SupplierID = pd.SupplierID      
      Left Outer Join Material_Color mc on pd.Material_ColorID = mc.Material_ColorID
      Left Outer Join (
         Select Master_Purchase_DetailID as Purchase_DetailID, Count(*) as Recount
         From Purchase_Detail WITH(NoLock, NoWait)
         Where Purchase_Project_No = {Purchase_Project_No}
         And Purchase_No is not null
         Group by Master_Purchase_DetailID
      ) tmp on tmp.Purchase_DetailID = pd.Purchase_DetailID
      Left Outer Join (
         Select Purchase_No, Sum(Stock_In_Qty) as Stock_In_Qty
         From Purchase_Detail WITH(NoLock, NoWait)
         Where Purchase_Project_No = {Purchase_Project_No}
         And Purchase_No is not null
         Group by Purchase_No
      ) tmp_Purchase on tmp_Purchase.Purchase_No = pd.Purchase_No
      WHERE pd.Purchase_Project_No = {Purchase_Project_No}
      AND (0 = {Composite} OR pd.Master_Purchase_Item <> 0 OR pd.Sub_Purchase_Item <> 0) 
      AND (0 = {Purchasing} OR pd.Unpurchase <> 0)
      AND (0 = {Supplement} OR pd.Supplement <> 0)
      AND (0 = {Purchased} OR pd.Qty > 0) 
      AND (0 = {Confirm} OR (DATEPART(HH, pd.Expected_Delivery) <> '00' AND pd.Unpurchase = 0 AND pd.Close_Date IS NULL)) 
      AND (0 = {Approaching} OR (ISNULL(pd.Expected_Delivery, p.Delivery_Date) <= GETDATE() + 7 AND ISNULL(pd.Expected_Delivery, p.Delivery_Date) > GETDATE() AND pd.Close_Date IS NULL))
      AND (0 = {Delay} OR (ISNULL(pd.Expected_Delivery, p.Delivery_Date) < GETDATE() AND ROUND(pd.Qty - ISNULL(pd.Stock_In_Qty, 0), 2) > 0 AND pd.Close_Date IS NULL)) 
      AND (0 = {Active} OR pd.Close_Date IS NULL) 
      And ({QueryData} = '' or charindex({QueryData}, cast(pd.Purchase_DetailID as varchar) 
      + ' ' + case when pd.Purchase_No is null then '' else cast(pd.Purchase_No as varchar) end 
      + ' ' + isnull(cast(pd.Material_ColorID as nvarchar),'') + ' ' + isnull(pd.Material_Category,'') + ' ' + isnull(pd.Material_Specific,'') + ' ' + isnull(pd.Material_Color,'')
      + ' ' + isnull(convert(varchar(10),pd.Expected_Delivery,111), '')  
      + ' ' + isnull(convert(varchar(10),pd.Close_Date,111), '') 
      + ' ' + isnull(pd.Currency,'') 
      + ' ' + isnull(pd.Unit,'') 
      + ' ' + isnull(p.WarehouseID,'') 
      + ' ' + isnull(pd.SupplierID,'') 
      + ' ' + isnull(pd.M_Rmk,'') 
      + ' ' + isnull(pd.Memo,'') 
      + ' ' + isnull(pr.Purchase_Responsible,'') 
      ) > 0)
      ORDER BY {Sort_Info}
   End
   if(@Mode = 0 or @Mode = 3)
   Begin
      Declare @Purpose varchar(20) = (Select p.Purpose From Purchase_Project p with(NoLock,NoWait) where p.Purchase_Project_No = {Purchase_Project_No})
      if(@Purpose = 'Merchandise')
      Begin
         Select cast(1 as bit) as Flag
         , p.Produce_No
         , SUM(od.Qty) as Order_Qty
         , isnull(p.Qty,0) as Qty
         , isnull(p.PP_Combine_Qty,0) as PP_Combine_Qty
         , case when Min(od.Est_Shipping_Date) is null then '' else  Convert(varchar(10), Min(od.Est_Shipping_Date),111) End as Est_Shipping_Date
         , case when p.PP_Combine_Date is null then '' else  Convert(varchar(10), p.PP_Combine_Date,111) End as PP_Combine_Date
         , case when p.BOM_Completed is null then '' else  Convert(varchar(10), p.BOM_Completed,111) End as BOM_Completed
         , p.BOM_Maker      
         , case when p.Material_Update is null then '' else  Convert(varchar(10), p.Material_Update,111) End as Material_Update
         , p.Material_Update_User
         , ABS(isnull(p.Shipmented,0)) as Shipmented         
         , p.Produce_Purpose
         from Produce p with(NoLock,NoWait)
         Left Outer Join Order_Detail od with(NoLock,NoWait) on p.Produce_No = od.Produce_No
         Left Outer Join Orders o with(NoLock,NoWait) on o.Order_No = od.Order_No
         where p.Purchase_Project_No = {Purchase_Project_No}
         Group by p.Produce_No
         , isnull(p.Qty,0)
         , isnull(p.PP_Combine_Qty,0)      
         , case when p.PP_Combine_Date is null then '' else  Convert(varchar(10), p.PP_Combine_Date,111) End
         , case when p.BOM_Completed is null then '' else  Convert(varchar(10), p.BOM_Completed,111) End
         , p.BOM_Maker
         , case when p.Material_Update is null then '' else  Convert(varchar(10), p.Material_Update,111) End
         , p.Material_Update_User
         , ABS(isnull(p.Shipmented,0))      
         , p.Produce_Purpose
         Order by Produce_No
      End
      if(@Purpose = 'Sample')
      Begin
         Select cast(1 as bit) as Flag
         , p.Produce_No
         , SUM(isnull(od.Qty,0) + isnull(od.Agent_Qty,0) + isnull(od.Keep_Qty,0)) as Order_Qty
         , isnull(p.Qty,0) as Qty
         , isnull(p.PP_Combine_Qty,0) as PP_Combine_Qty
         , case when Min(o.Require_Date) is null then '' else  Convert(varchar(10), Min(o.Require_Date),111) End as Est_Shipping_Date
         , case when p.PP_Combine_Date is null then '' else  Convert(varchar(10), p.PP_Combine_Date,111) End as PP_Combine_Date
         , case when p.BOM_Completed is null then '' else  Convert(varchar(10), p.BOM_Completed,111) End as BOM_Completed
         , p.BOM_Maker      
         , case when p.Material_Update is null then '' else  Convert(varchar(10), p.Material_Update,111) End as Material_Update
         , p.Material_Update_User
         , ABS(isnull(p.Shipmented,0)) as Shipmented         
         , p.Produce_Purpose
         from Produce p with(NoLock,NoWait)
         Left Outer Join Sample_Detail od with(NoLock,NoWait) on p.Produce_No = od.Produce_No
         Left Outer Join Samples o with(NoLock,NoWait) on o.ProduceID = od.ProduceID
         where p.Purchase_Project_No = {Purchase_Project_No}
         Group by p.Produce_No
         , isnull(p.Qty,0)
         , isnull(p.PP_Combine_Qty,0)      
         , case when p.PP_Combine_Date is null then '' else  Convert(varchar(10), p.PP_Combine_Date,111) End
         , case when p.BOM_Completed is null then '' else  Convert(varchar(10), p.BOM_Completed,111) End
         , p.BOM_Maker
         , case when p.Material_Update is null then '' else  Convert(varchar(10), p.Material_Update,111) End
         , p.Material_Update_User
         , ABS(isnull(p.Shipmented,0))         
         , p.Produce_Purpose
         Order by Produce_No   
      End

      if(@Purpose = 'Others')
      Begin
         Select '' as Produce_No
         Where 1 = 0
      End

   End
   if(@Mode = 0 or @Mode = 4)
   Begin
      Select c.Currency, b.Currency_Symbol, c.Currency_Rate, b.Country
      From Purchase_Project p
      INNER JOIN dbo.[@Currency_Rate] c WITH(NoLock, NoWait) ON Convert(Date, p.[Apply_Date]) = c.Exchange_Date
      Inner Join dbo.Currency b On c.Currency = b.Currency
      Where p.Purchase_Project_No = {Purchase_Project_No}
   End

   `, req.body) ;
   //console.log(strSQL)
   db.sql(req.SiteDB, strSQL)
      .then((result) => {
         var DataSet = {Purchase_Project: (req.body.Mode == 0 || req.body.Mode == 1) ? result.recordsets[0] : []
           , Purchase_Detail: (req.body.Mode == 0) ? result.recordsets[1] : (req.body.Mode == 2 ? result.recordsets[0] : [])
           , Produce: (req.body.Mode == 0) ? result.recordsets[2] : (req.body.Mode == 3 ? result.recordsets[0] : [])
           , Currency: (req.body.Mode == 0) ? result.recordsets[3] : (req.body.Mode == 4 ? result.recordsets[0] : [])
           , Produce_Total: {RecCount:0, O_Qty:0, P_Qty:0, PP_Qty:0, Est_Shipping_Date:''}
           , Purchase_Detail_Total: {Project_Amount:0, Cost_Amount:0, Stock_In_Amount:0, Stock_In_Cost:0, Stock_Out_Amount:0, Stock_Out_Cost:0, Not_Out_Amount:0, Not_Out_Cost:0, Use_Stock_Cost:0}
        };
       
        DataSet.Purchase_Detail.forEach((item,idx) => {
            DataSet.Purchase_Detail_Total.Project_Amount += item.Project_Amount;
            DataSet.Purchase_Detail_Total.Cost_Amount += item.Cost_Amount;
            DataSet.Purchase_Detail_Total.Stock_In_Amount += item.Stock_In_Amount;
            DataSet.Purchase_Detail_Total.Stock_In_Cost += item.Stock_In_Cost;
            DataSet.Purchase_Detail_Total.Stock_Out_Amount += item.Stock_Out_Amount;
            DataSet.Purchase_Detail_Total.Stock_Out_Cost += item.Stock_Out_Cost;
            DataSet.Purchase_Detail_Total.Not_Out_Amount += item.Not_Out_Amount;
            DataSet.Purchase_Detail_Total.Not_Out_Cost += item.Not_Out_Cost;
            DataSet.Purchase_Detail_Total.Use_Stock_Cost += item.Use_Stock_Cost;

            item.Project_Amount = Math.round((item.Project_Amount)*1000)/1000;
            item.Cost_Amount = Math.round((item.Cost_Amount)*1000)/1000;
            item.Stock_In_Amount = Math.round((item.Stock_In_Amount)*1000)/1000;
            item.Stock_In_Cost = Math.round((item.Stock_In_Cost)*1000)/1000;
            item.Stock_Out_Amount = Math.round((item.Stock_Out_Amount)*1000)/1000;
            item.Stock_Out_Cost = Math.round((item.Stock_Out_Cost)*1000)/1000;
            item.Not_Out_Amount = Math.round((item.Not_Out_Amount)*1000)/1000;
            item.Not_Out_Cost = Math.round((item.Not_Out_Cost)*1000)/1000;
            item.Use_Stock_Cost = Math.round((item.Use_Stock_Cost)*1000)/1000;
        });


        DataSet.Produce.forEach((item,idx) => {
            item.Order_Qty = Math.round((item.Order_Qty)*10000)/10000;
            item.Qty = Math.round((item.Qty)*10000)/10000;
            item.PP_Combine_Qty = Math.round((item.PP_Combine_Qty)*10000)/10000;
            DataSet.Produce_Total.O_Qty += item.Order_Qty;
            DataSet.Produce_Total.P_Qty += item.Qty;
            DataSet.Produce_Total.PP_Qty += item.PP_Combine_Qty;
            DataSet.Produce_Total.Est_Shipping_Date = idx == 0 ? item.Est_Shipping_Date: ((DataSet.Produce_Total.Est_Shipping_Date < item.Est_Shipping_Date || item.Est_Shipping_Date == '' ) ? DataSet.Produce_Total.Est_Shipping_Date : item.Est_Shipping_Date)            
            
        });

        DataSet.Produce_Total.RecCount = DataSet.Produce.length;
        DataSet.Produce_Total.O_Qty = Math.round((DataSet.Produce_Total.O_Qty)*10000)/10000;
        DataSet.Produce_Total.P_Qty = Math.round((DataSet.Produce_Total.P_Qty)*10000)/10000;
        DataSet.Produce_Total.PP_Qty = Math.round((DataSet.Produce_Total.PP_Qty)*10000)/10000;
        
        DataSet.Purchase_Detail_Total.Project_Amount = Math.round((DataSet.Purchase_Detail_Total.Project_Amount));
        DataSet.Purchase_Detail_Total.Cost_Amount = Math.round((DataSet.Purchase_Detail_Total.Cost_Amount));
        DataSet.Purchase_Detail_Total.Stock_In_Amount = Math.round((DataSet.Purchase_Detail_Total.Stock_In_Amount));
        DataSet.Purchase_Detail_Total.Stock_In_Cost = Math.round((DataSet.Purchase_Detail_Total.Stock_In_Cost));
        DataSet.Purchase_Detail_Total.Stock_Out_Amount = Math.round((DataSet.Purchase_Detail_Total.Stock_Out_Amount));
        DataSet.Purchase_Detail_Total.Stock_Out_Cost = Math.round((DataSet.Purchase_Detail_Total.Stock_Out_Cost));
        DataSet.Purchase_Detail_Total.Not_Out_Amount = Math.round((DataSet.Purchase_Detail_Total.Not_Out_Amount));
        DataSet.Purchase_Detail_Total.Not_Out_Cost = Math.round((DataSet.Purchase_Detail_Total.Not_Out_Cost));
        DataSet.Purchase_Detail_Total.Use_Stock_Cost = Math.round((DataSet.Purchase_Detail_Total.Use_Stock_Cost));
        //console.log(DataSet)
        res.send(DataSet);
      }).catch((err) => {
         console.log(err);
         res.status(500).send(err);
      })
});

//Get Purchase Detail Add List
router.post('/Purchase_Detail_Add_List',  function (req, res, next) {
   console.log("Call Purchase_Detail_Add_List Api:",req.body);  
    
   req.body.Factory_SubID = req.body.Factory_SubID ? `N'${req.body.Factory_SubID.trim().replace(/'/g, '')}'` : `''`;
   req.body.Produce_LineID = req.body.Produce_LineID ? `N'${req.body.Produce_LineID.trim().replace(/'/g, '')}'` : `''`;
   req.body.Produce_No = req.body.Produce_No ? `N'${req.body.Produce_No.trim().replace(/'/g, '')}'` : `''`;
   req.body.Require_Date = req.body.Require_Date ? `N'${req.body.Require_Date.trim().replace(/'/g, '')}'` : `''`;
   req.body.Brand = req.body.Brand ? `N'${req.body.Brand.trim().replace(/'/g, '')}'` : `''`;
   req.body.Product_No = req.body.Product_No ? `N'${req.body.Product_No.trim().replace(/'/g, '')}'` : `''`;
   req.body.Category = req.body.Category ? `N'${req.body.Category.trim().replace(/'/g, '')}'` : `''`;
   req.body.Qty = req.body.Qty ? `'${req.body.Qty}'` : `''`;
   req.body.Purpose = req.body.Purpose ? `N'${req.body.Purpose.trim().replace(/'/g, '')}'` : `''`;
   
   var strSQL = format(`Declare @CustomerID varchar(20) = '{CustomerID}'
   , @Purpose varchar(20) = isnull((Select case when Purpose = 'Merchandise' then 'Order' else Purpose end From Purchase_Project p Where p.Purchase_Project_No = '{Purchase_Project_No}'),'Order')

   SELECT distinct 
   0 as Flag
   , p.Factory_SubID
   , p.Produce_No
   , p.Produce_LineID
   , p.Produce_Purpose
   , case when p.Produce_Purpose = 'Order' then o.Purpose 
      else 
      (Select tg.Sample_Type_Group 
         From Sample_Type st 
         Inner Join Sample_Type_Group tg on st.Sample_Type_GroupID = tg.Sample_Type_GroupID 
         Where st.Sample_TypeID = sd.Sample_TypeID) 
      end as Purpose
   , p.Qty
   , p.Product_No
   , p.Purchase_Project_No
   , p.Material_Update_User
   , p.Material_Require_Date AS Require_Date
   , p.PP_Combine_Date
   , s.Category
   , s.Brand
   , p.PP_Combine_Qty
   , IIf((o.[Purpose]='Official' And c.[OrganizationID] Is Not Null),0,1) AS ISOutSide
   , p.BOM_Completed AS ISCompleted
   , Abs(p.[Shipmented]) AS ISShipmented
   , Abs(p.[UnProduce]) AS ISUnProduce
   , IIf((o.[Purpose]='Official' And oa.[Approve_Date] Is Null),0,1) AS ISApprove
   FROM Produce p with(Nolock,NoWait)
   INNER JOIN Product pt with(Nolock,NoWait) ON p.Product_No = pt.Product_No 
   INNER JOIN Style s with(Nolock,NoWait) ON pt.Style_No = s.Style_No 
   INNER JOIN Factory_Sub fs with(Nolock,NoWait) ON p.Factory_SubID = fs.Factory_SubID 
   LEFT Outer JOIN [Control] c with(Nolock,NoWait) ON fs.OrganizationID = c.OrganizationID 
   LEFT Outer JOIN Order_Detail od with(Nolock,NoWait) ON p.Produce_No = od.Produce_No 
   LEFT Outer JOIN Orders o with(Nolock,NoWait) ON od.Order_No = o.Order_No 
   LEFT Outer JOIN Order_Approve oa with(Nolock,NoWait) ON p.Order_ApproveID = oa.Order_ApproveID 
   LEFT Outer JOIN Sample_Detail sd with(Nolock,NoWait) ON p.Produce_No = sd.Produce_No  
   LEFT Outer JOIN Samples so with(Nolock,NoWait) ON sd.ProduceID = so.ProduceID  
   WHERE (p.Purchase_Project_No Is Null) 
   And p.Produce_Purpose = @Purpose
   AND (p.Material_Update_User Is not Null)
   AND (p.BOM_Completed Is Not Null)
   AND (s.Brand Like @CustomerID + '%')
   AND (IIf((o.[Purpose]='Official' And c.[OrganizationID] Is Not Null),0,1) = 1)
   AND (Abs(p.[Shipmented]) <> 1)
   AND (Abs(p.[UnProduce]) <> 1)
   AND (IIf((o.[Purpose]='Official' And oa.[Approve_Date] Is Null),0,1) = 1)
   And ({Factory_SubID} = '' or p.Factory_SubID like {Factory_SubID}+'%')
   And ({Produce_LineID} = '' or p.Produce_LineID like {Produce_LineID}+'%')
   And ({Produce_No} = '' or p.Produce_No like {Produce_No}+'%')
   And ({Require_Date} = '' or Convert(varchar(10),p.Material_Require_Date,111) like {Require_Date}+'%')
   And ({Brand} = '' or s.Brand Like {Brand}+'%')
   And ({Product_No} = '' or p.Product_No like {Product_No}+'%')
   And ({Category} = '' or s.Category like {Category}+'%')
   And ({Qty} = '' or isnull(p.Qty,'') like {Qty} + '%')
   And ({Purpose} = '' or 
      (case when p.Produce_Purpose = 'Order' then 
         o.Purpose 
         else ( Select tg.Sample_Type_Group 
                 From Sample_Type st 
                 Inner Join Sample_Type_Group tg on st.Sample_Type_GroupID = tg.Sample_Type_GroupID 
                 Where st.Sample_TypeID = sd.Sample_TypeID) 
      end) like {Purpose}+'%')  
   ORDER BY p.Factory_SubID, p.Produce_No DESC;
   `, req.body) ;
   //console.log(strSQL)
   db.sql(req.SiteDB, strSQL)
      .then((result) => {
         var DataSet = {Detail_Add_List: result.recordsets[0]};
         //console.log(DataSet)
         res.send(DataSet);
      }).catch((err) => {
         console.log(err);
         res.status(500).send(err);
      })
});

//PP_Combine_Maintain 
router.post('/PP_Combine_Maintain',  function (req, res, next) {
   console.log("Call PP_Combine_Maintain Api:",req.body);

   // req.body.Mode === 0 表示新增
   // req.body.Mode === 1 表示修改   
   var Size = 0;
   req.body.Mode = req.body.Mode ? req.body.Mode : 0;
   req.body.Purchase_Project_No = req.body.Purchase_Project_No ? `N'${req.body.Purchase_Project_No.trim().substring(0,15).replace(/'/g, '')}'` : `''`;
   req.body.Detail = req.body.Detail ? req.body.Detail : [];
   
   var strSQL = format(`Declare @ROWCOUNT int=0, @Engineer varchar(255), @Engineer_Date varchar(20), 
   @PPIC_User varchar(255), @Purchaser varchar(255), @Update_Date varchar(20), @Project_Close DateTime, @ACC_Close DateTime ;   

   Select @Engineer = isnull(Engineer,'') 
   , @Engineer_Date = case When Engineer_Date is null then '' else cast(Engineer_Date as varchar) end
   , @PPIC_User = isnull(PPIC_User,'')
   , @Purchaser = isnull(Purchaser,'') 
   , @Update_Date = case When Update_Date is null then '' else cast(Update_Date as varchar) end
   , @Project_Close = isnull(pp.Close_Date,'') 
   , @ACC_Close = isnull(pp.ACC_Close,'')
   From Purchase_Project pp with(NoLock,NoWait)
   Where pp.Purchase_Project_No = {Purchase_Project_No}
   
   if(@Engineer_Date <> '' or @Update_Date <> '' or @Project_Close <> '' or @ACC_Close <> '' or @PPIC_User <> ''
     or (select count(*) from Purchase_Detail pd with(NoLock,NoWait) Where pd.Purchase_Project_No = {Purchase_Project_No}) > 0 )
   Begin
      Select @ROWCOUNT as Flag;
      return;
   End
   `, req.body);

   switch(req.body.Mode){
      case 0:         
         strSQL += format(`
         Update Produce set Purchase_Project_No = {Purchase_Project_No}
         Where Produce_No IN ('${req.body.Detail.join("','")}');
         
         Set @ROWCOUNT = @@ROWCOUNT;
         `, req.body);
      break;
      case 1:
         req.body.Produce_No = req.body.Produce_No ? `N'${req.body.Produce_No.trim().substring(0,20).replace(/'/g, '')}'` : `''`;
         strSQL += format(`
         Update Produce set Purchase_Project_No = null
         Where Produce_No = {Produce_No};
         
         Set @ROWCOUNT = @@ROWCOUNT;
         `, req.body);
      break;        
   }

   strSQL += format(`
   Select @ROWCOUNT as Flag;  
   `, req.body);
   //console.log(strSQL)
   db.sql(req.SiteDB, strSQL)
      .then((result) => {
         //console.log(result.recordsets[0])
         //res.send({Flag:result.recordsets[0][0].Flag > 0});
         res.send({Flag:result.recordsets[0][0].Flag > 0});  
      }).catch((err) => {
         console.log(err);
         res.status(500).send(err);
      })
});

//Batch Process Maintain
router.post('/Batch_Process_Maintain',  function (req, res, next) {
   console.log("Call Batch_Process_Maintain Api:",req.body);

   // req.body.Mode === 0 表示刪除全部 PPIC 製造令採購細項
   // req.body.Mode === 1 表示匯入PPIC製造令採購細項
   // req.body.Mode === 2 表示自動產生採購單
   // req.body.Mode === 3 表示批次刪除採購單

   var Size = 0;
   req.body.Mode = req.body.Mode ? req.body.Mode : 0;
   req.body.Import_With_Composites = req.body.Import_With_Composites ? req.body.Import_With_Composites : 0;
   req.body.Purchase_Project_No = req.body.Purchase_Project_No ? `N'${req.body.Purchase_Project_No.trim().substring(0,15).replace(/'/g, '')}'` : `''`;
   
   var strSQL = format(`Declare @ROWCOUNT int = 0, @ROWCOUNT1 int = 0, @ROWCOUNT2 int = 0, @ROWCOUNT3 int = 0, @Purchase_Project_No varchar(15) = {Purchase_Project_No} 
   Declare @tmpDetail Table (Purchase_No int, Delivery_Date DateTime, Purchase_DetailID Int, Material_ColorID Int, Qty float);

   Declare @Engineer varchar(255), @Engineer_Date varchar(20), @Purchaser varchar(255), @Update_Date varchar(20), @Close_Date varchar(20), @ACC_Close varchar(20)
   Select @Engineer = isnull(Engineer,'') 
   , @Engineer_Date = case When Engineer_Date is null then '' else cast(Engineer_Date as varchar) end
   , @Purchaser = isnull(Purchaser,'') 
   , @Update_Date = case When Update_Date is null then '' else cast(Update_Date as varchar) end
   , @Close_Date = case When Close_Date is null then '' else cast(Close_Date as varchar) end
   , @ACC_Close = case When ACC_Close is null then '' else cast(ACC_Close as varchar) end
   From [dbo].[Purchase_Project] d with(NoLock,NoWait) 
   Where Purchase_Project_No = @Purchase_Project_No;
   
   if(@Close_Date <> ''or @ACC_Close <> '')
   Begin
      Select @ROWCOUNT + @ROWCOUNT1 + @ROWCOUNT2 + @ROWCOUNT3 as Flag;
      Select Material_ColorID, Sum(Qty) as Qty From @tmpDetail Group by Material_ColorID;
      Return;
   End   
   `, req.body);
   switch(req.body.Mode){
      case 0:
         req.body.Name = req.body.Name ? req.body.Name : 'Require_Qty';
         strSQL += format(`
         if @Engineer_Date <> '' or @Update_Date <> ''
         Begin
            Select @ROWCOUNT + @ROWCOUNT1 + @ROWCOUNT2 + @ROWCOUNT3 as Flag;
            Select Material_ColorID, Sum(Qty) as Qty From @tmpDetail Group by Material_ColorID;   
            return
         End

         Insert @tmpDetail (Purchase_No, Purchase_DetailID, Material_ColorID, Qty )
         Select pd.Purchase_No
         , pd.Purchase_DetailID
         , pd.Material_ColorID
         , Round(isnull(pd.Project_Qty,0) - isnull(pd.Stock_Out_Qty,0), 0) * -1 as Qty
         From Purchase_Detail pd
         INNER JOIN Purchase_Project pp on pd.Purchase_Project_No = pp.Purchase_Project_No
         where pp.Purchase_Project_No = @Purchase_Project_No
         And isnull(pd.Purchase_No,'') = ''
         And pd.Close_Date is null
         And isnull(pd.Stock_In_Qty,0) = 0
         And pp.Engineer_Date is null
         And isnull(pp.Purchaser,'') = ''
         And pp.Close_Date is null
         And pp.ACC_Close is null;

         Delete FROM [dbo].[Purchase_Detail] 
		   Where Purchase_DetailID in (Select Purchase_DetailID from @tmpDetail);
         
         Set @ROWCOUNT = @@ROWCOUNT;

         if(@ROWCOUNT > 0)
         Begin
            Update Purchase_Project Set Engineer = null
            Where Purchase_Project_No = @Purchase_Project_No
         End
         `, req.body);
      break;
      case 1:
         req.body.Name = req.body.Name ? req.body.Name : 'Require_Qty';         
         
         strSQL += format(`
         Declare @Import_With_Composites int = 0

         if (@Engineer_Date <> '' or @Update_Date <> ''
            or (Select count(*) from Produce p with(NoLock,NoWait) Where p.Purchase_Project_No = @Purchase_Project_No) = 0
            or (Select count(*) from Purchase_Detail pd with(NoLock,NoWait) Where Purchase_Project_No = @Purchase_Project_No) > 0
            )
         Begin
            Select @ROWCOUNT + @ROWCOUNT1 + @ROWCOUNT2 + @ROWCOUNT3 as Flag;
            Select Material_ColorID, Sum(Qty) as Qty From @tmpDetail Group by Material_ColorID;   
            return
         End

         BEGIN TRANSACTION;
         BEGIN TRY

            -- @Import_With_Composites = 0: Exclude composite Material when import Lot data into purchase detail.
            if @Import_With_Composites = {Import_With_Composites}
            Begin	
               INSERT INTO Purchase_Detail (Purchase_Project_No, SupplierID, isIBL, MaterialID, Material_DetailID, Material_ColorID, Orig_Material_ColorID, Material_Category, Material_Specific, Material_Color, [Currency], Quot_Price, Orig_Price, Unit_Price, Unit, UserID, Create_Date)
               SELECT @Purchase_Project_No AS Purchase_Project_No
               , Max(pd.SupplierID) AS SupplierID
               , isnull(m.isIBL,0) as isIBL
               , pd.MaterialID
               , pd.Material_DetailID
               , pd.Material_ColorID
               , pd.Material_ColorID as Orig_Material_ColorID
               , pd.Material_Category
               , pd.Material_Specific
               , pd.Material_Color
               , pd.Currency
               , Min(pd.Quot_Price) AS Quot_Price
               , Min(pd.Unit_Price) AS Orig_Price
               , Min(pd.Unit_Price) AS Unit_Price
               , pd.Unit
               , '${req.UserID}' as UserID, GetDate() as Create_Date
               FROM Produce_Detail pd with(NoLock,NoWait)
               Inner Join Produce p with(NoLock,NoWait) ON pd.Produce_No = p.Produce_No
               Left Outer Join Material m with(NoLock, NoWait) on pd.MaterialID = m.MaterialID
               WHERE p.Purchase_Project_No = @Purchase_Project_No
               And Abs([Master_Purchase_Item]) <> 1
               And pd.Material_Category Not Like 'Process%'
               GROUP BY isnull(m.isIBL,0), pd.MaterialID, pd.Material_DetailID, pd.Material_ColorID, pd.Material_Category, pd.Material_Specific, pd.Material_Color, pd.Unit, pd.Currency
               
               Set @ROWCOUNT = @@ROWCOUNT;

               INSERT INTO Purchase_Detail_Sub ( Purchase_DetailID, Produce_No, Qty)
               SELECT tmp.Purchase_DetailID, t.Produce_No, t.Qty 
               FROM (
                  SELECT pd.Material_ColorID, pd.Produce_No, Sum(pd.T_Net_Qty) AS Qty
                  FROM Produce_Detail pd with(NoLock,NoWait)
                  Inner Join Produce p with(NoLock,NoWait) ON pd.Produce_No = p.Produce_No
                  WHERE p.Purchase_Project_No = @Purchase_Project_No
                  And Abs([Master_Purchase_Item]) <> 1
                  And pd.Material_Category Not Like 'Process%'
                  GROUP BY pd.Material_ColorID, pd.Produce_No
               ) as t
               INNER JOIN (
                  SELECT Material_ColorID, Purchase_DetailID 
                  FROM Purchase_Detail pd with(NoLock,NoWait)
                  Where pd.Purchase_Project_No = @Purchase_Project_No 
                  GROUP BY Material_ColorID, Purchase_DetailID 
               ) tmp on tmp.Material_ColorID = t.Material_ColorID

               Set @ROWCOUNT1 = @@ROWCOUNT;
            End
            else
            Begin
               INSERT INTO Purchase_Detail ( Purchase_Project_No, SupplierID, isIBL, MaterialID, Material_DetailID, Material_ColorID, Master_Purchase_Item, Sub_Purchase_Item, Master_Purchase_DetailID, Orig_Master_Purchase_DetailID, Composites_SortID, Material_Category, Material_Specific, Orig_Material_ColorID, Material_Color, Quot_Price, Orig_Price, Unit_Price, Unit, [Currency], UserID, Create_Date ) 
               Select Purchase_Project_No, SupplierID, isIBL, MaterialID, Material_DetailID, Material_ColorID, Master_Purchase_Item, Sub_Purchase_Item, Master_Purchase_DetailID, Orig_Master_Purchase_DetailID, Composites_SortID, Material_Category, Material_Specific, Orig_Material_ColorID, Material_Color, Quot_Price, Orig_Price, Unit_Price, Unit, [Currency], '${req.UserID}' as UserID, GetDate() as Create_Date
               From 
               (
                  SELECT @Purchase_Project_No AS Purchase_Project_No
                  , [Material_ColorID] + ' ' + [Master_Purchase_Item] + ' ' + [Sub_Purchase_Item] + ' ' + [Master_Purchase_DetailID] AS [KEY]
                  , Max(pd.SupplierID) AS SupplierID
                  , isnull(m.isIBL,0) as isIBL
                  , pd.MaterialID
                  , pd.Material_DetailID
                  , pd.Material_ColorID
                  , pd.Master_Purchase_Item
                  , pd.Sub_Purchase_Item
                  , pd.Master_Purchase_DetailID
                  , pd.Master_Purchase_DetailID as Orig_Master_Purchase_DetailID
                  , pd.Composites_SortID
                  , pd.Material_Category
                  , pd.Material_Specific
                  , pd.Material_ColorID as Orig_Material_ColorID
                  , pd.Material_Color
                  , Min(pd.Quot_Price) AS Quot_Price
                  , Min(pd.Unit_Price) AS Orig_Price
                  , Min(pd.Unit_Price) AS Unit_Price
                  , pd.Unit
                  , pd.Currency
                  FROM Produce_Detail pd with(NoLock,NoWait)
                  INNER JOIN Produce p with(NoLock,NoWait) ON pd.Produce_No = p.Produce_No
                  Left Outer Join Material m with(NoLock, NoWait) on pd.MaterialID = m.MaterialID
                  Where p.Purchase_Project_No = @Purchase_Project_No
                  GROUP BY [Material_ColorID] + ' ' + [Master_Purchase_Item] + ' ' + [Sub_Purchase_Item] + ' ' + [Master_Purchase_DetailID], pd.Master_Purchase_Item, pd.Sub_Purchase_Item, pd.Master_Purchase_DetailID, isnull(m.isIBL,0), pd.MaterialID, pd.Material_DetailID, pd.Material_ColorID, pd.Material_Category, pd.Material_Specific, pd.Material_Color, pd.Composites_SortID, pd.Unit, pd.Currency
               ) tmp
      
               Set @ROWCOUNT = @@ROWCOUNT;

               INSERT INTO Purchase_Detail_Sub ( Purchase_DetailID, Produce_No, Qty ) 
               SELECT tmp.Purchase_DetailID, t.Produce_No, t.Qty
               FROM (
                  SELECT cast(isnull([Material_ColorID],0) as varchar) + ' ' + cast(isnull([Master_Purchase_Item],0) as varchar) + ' ' + cast(isnull([Sub_Purchase_Item],0) as varchar) + ' ' + cast(isnull([Master_Purchase_DetailID],0) as varchar) AS [KEY]
                  , pd.Produce_No
                  , Sum(pd.T_Net_Qty) AS Qty
                  FROM Produce_Detail pd with(NoLock,NoWait)
                  INNER JOIN Produce p with(NoLock,NoWait) ON pd.Produce_No = p.Produce_No
                  Where p.Purchase_Project_No = @Purchase_Project_No
                  GROUP BY cast(isnull([Material_ColorID],0) as varchar) + ' ' + cast(isnull([Master_Purchase_Item],0) as varchar) + ' ' + cast(isnull([Sub_Purchase_Item],0) as varchar) + ' ' + cast(isnull([Master_Purchase_DetailID],0) as varchar)
                  , pd.Produce_No
               ) as t
               INNER JOIN (
                  SELECT cast(isnull([Material_ColorID],0) as varchar) + ' ' + cast(isnull([Master_Purchase_Item],0) as varchar) + ' ' + cast(isnull([Sub_Purchase_Item],0) as varchar) + ' ' + cast(isnull([Master_Purchase_DetailID],0) as varchar) AS [KEY]
                  , pd.Material_ColorID, pd.Purchase_DetailID, pd.Master_Purchase_Item, pd.Sub_Purchase_Item, pd.Master_Purchase_DetailID
                  FROM Purchase_Detail pd
                  Where pd.Purchase_Project_No = @Purchase_Project_No
                  GROUP BY cast(isnull([Material_ColorID],0) as varchar) + ' ' + cast(isnull([Master_Purchase_Item],0) as varchar) + ' ' + cast(isnull([Sub_Purchase_Item],0) as varchar) + ' ' + cast(isnull([Master_Purchase_DetailID],0) as varchar)
                  , pd.Material_ColorID, pd.Purchase_DetailID, pd.Master_Purchase_Item, pd.Sub_Purchase_Item, pd.Master_Purchase_DetailID
               ) as tmp ON t.[KEY] = tmp.[KEY];

               Set @ROWCOUNT1 = @@ROWCOUNT;

               --更新Purchase_Detail複合材料群組
               Update Purchase_Detail set Master_Purchase_DetailID = tmp.Purchase_DetailID
               From Purchase_Detail p 
               Inner Join (
                  Select Purchase_DetailID, Master_Purchase_DetailID
                  From Purchase_Detail  
                  Where Purchase_Project_No = @Purchase_Project_No
                  And ABS(isnull(Master_Purchase_Item,0)) = 1
                  And ABS(isnull(Sub_Purchase_Item,0)) = 0
                  And Master_Purchase_DetailID is not null
                  And Orig_Material_ColorID is not null
               ) tmp on p.Master_Purchase_DetailID = tmp.Master_Purchase_DetailID
               Where Purchase_Project_No = @Purchase_Project_No
               And p.Master_Purchase_DetailID is not null
               And p.Orig_Material_ColorID is not null;               

            End
            
            -- Update Purchase Detail Project_Qty and Purchase_ResponsibleID
            Update Purchase_Detail set Project_Qty = tmp.S_Qty, Cost_Qty = 0, Purchase_ResponsibleID = isnull(s.Purchase_ResponsibleID,0)
            From Purchase_Detail u
            Inner Join (
               SELECT pd.Purchase_DetailID, Sum(pds.[Qty]) AS S_Qty 
               FROM Purchase_Detail pd with(NoLock,NoWait)
               Left Outer Join Purchase_Detail_Sub pds with(NoLock,NoWait) ON pds.Purchase_DetailID = pd.Purchase_DetailID 
               WHERE Purchase_Project_No = @Purchase_Project_No
               GROUP BY pd.Purchase_DetailID
            ) tmp on u.Purchase_DetailID = tmp.Purchase_DetailID
            Left Outer Join Supplier s on  s.SupplierID = u.SupplierID;
            
            Set @ROWCOUNT2 = @@ROWCOUNT;

            -- Update Produce PP_Combine_Qty and PP_Combine_Date
            Update Produce set PP_Combine_Qty = Qty
            , PP_Combine_Date = GetDate()
            WHERE Purchase_Project_No = @Purchase_Project_No;

            Set @ROWCOUNT3 = @@ROWCOUNT;
  
            Insert @tmpDetail (Purchase_No, Purchase_DetailID, Material_ColorID, Qty )
            Select pd.Purchase_No
            , pd.Purchase_DetailID
            , pd.Material_ColorID
            , Round(isnull(pd.Project_Qty,0), 0) as Qty
            From Purchase_Detail pd
            where pd.Purchase_Project_No = @Purchase_Project_No;

            COMMIT;
         END TRY
         BEGIN CATCH
            Select @ROWCOUNT = 0, @ROWCOUNT1 = 0, @ROWCOUNT2 = 0, @ROWCOUNT3 = 0;
            ROLLBACK;
         END CATCH
            
         if(@ROWCOUNT > 0)
         Begin
            Update Purchase_Project Set Engineer = N'${req.UserID}'
            Where Purchase_Project_No = @Purchase_Project_No
         End
         `, req.body);

      break;
      case 2:
         req.body.Name = req.body.Name ? req.body.Name : 'Order_Qty';
         req.body.WarehouseID = req.body.WarehouseID ? `N'${req.body.WarehouseID.trim().substring(0,10).replace(/'/g, '')}'` : `''`;
         req.body.OrganizationID = req.body.OrganizationID ? `N'${req.body.OrganizationID.trim().substring(0,10).replace(/'/g, '')}'` : `''`;
                 
         strSQL += format(`Declare @WarehouseID varchar(10) = {WarehouseID}, @OrganizationID varchar(10) = {OrganizationID}
         if @Engineer = '' or @Purchaser = ''
         Begin
         Select @ROWCOUNT + @ROWCOUNT1 + @ROWCOUNT2 + @ROWCOUNT3 as Flag;
            Select Material_ColorID, Sum(Qty) as Qty From @tmpDetail Group by Material_ColorID;   
            return
         End

         BEGIN TRANSACTION;
         BEGIN TRY

            Delete from Purchase Where Purchase_No in (
               Select p.Purchase_No
               From Purchase p
               Left Outer Join Purchase_Detail pd on p.Purchase_No = pd.Purchase_No
               Where p.Purchase_Project_No = @Purchase_Project_No
               And pd.Purchase_No is null
            )

            Set @ROWCOUNT = @@ROWCOUNT;

            INSERT Purchase ( Purchase_Date, Purchase_Project_No, SupplierID, OrganizationID, WarehouseID, Delivery_Date, Approve, UserID, Data_Updater, Data_Update, Currency )
            SELECT distinct GetDate() AS Purchase_Date
            , pp.Purchase_Project_No
            , pd.SupplierID
            , @OrganizationID as OrganizationID
            , iif(isnull(@WarehouseID,'')='', (Select Default_WarehouseID From Control), @WarehouseID) as WarehouseID
            , cast(IIf(pp.[Require_Date] is null, DateAdd(day, 7, GetDate()), IIf(pp.[Require_Date] < DateAdd(day, 5, GetDate()), DateAdd(day, 7, GetDate()), DateAdd(day, -5, pp.[Require_Date]))) as Date) AS Delivery_Date
            , IIf(pp.[Manager] Is Not Null,pp.[Manager], Null) AS Approve
            --, IIf(pd.[Orig_Material_ColorID] Is Not Null, pp.[Manager] ,Null) AS Approve
            , N'${req.UserID}' AS UserID
            , N'${req.UserID}' as Data_Updater
            , GetDate() as Data_Update
            , pd.Currency
            FROM Purchase_Project pp with(Nolock,NoWait)
            Inner Join Purchase_Detail pd with(NoLock, NoWait) on pp.Purchase_Project_No = pd.Purchase_Project_No
            INNER JOIN Material_Color mc with(NoLock, NoWait) on pd.Material_ColorID = mc.Material_ColorID
            INNER JOIN Supplier s with(NoLock,NoWait) on pd.SupplierID = s.SupplierID 
            WHERE pp.Purchase_Project_No = @Purchase_Project_No
            And Abs(isnull(pd.[Master_Purchase_Item],0))<>1
            And Abs(isnull(pd.[Unpurchase],0)) <> 1
            And pd.Transfer_Purchase_DetailID Is Null
            And pd.Purchase_No Is Null
            And mc.Price_Approve Is Not Null
            And pd.SupplierID Is Not Null
            And s.History_Date Is Null
            And pd.Currency = mc.[Currency]
            And pd.Close_Date Is Null
            And CEILING(isnull(pd.Project_Qty,0)) - isnull(pd.Use_Stock_Qty,0) > 0
            And isnull(pd.Stock_In_Qty,0) = 0
            And pp.Update_Date is not null
            And pp.Close_Date Is Null
            And pp.ACC_Close Is Null;            

            Set @ROWCOUNT1 = @@ROWCOUNT;
            
            Insert @tmpDetail (Purchase_No, Delivery_Date, Purchase_DetailID, Material_ColorID, Qty )
            Select p.Purchase_No
            , p.Delivery_Date
            , pd.Purchase_DetailID
            , pd.Material_ColorID
            , CEILING(isnull(pd.Project_Qty,0) - isnull(pd.Use_Stock_Qty,0)) as Qty
            From Purchase_Detail pd
            INNER JOIN Purchase p on p.Currency = pd.Currency AND (p.Purchase_Project_No = pd.Purchase_Project_No) AND (p.SupplierID = pd.SupplierID)
            INNER JOIN Material_Color mc ON pd.Material_ColorID = mc.Material_ColorID
            INNER JOIN Purchase_Project pp ON pd.Purchase_Project_No = pp.Purchase_Project_No
            WHERE pd.Purchase_Project_No = @Purchase_Project_No
            AND Abs(isnull(pd.[Master_Purchase_Item],0)) <> 1
            AND Abs(isnull(pd.[Unpurchase],0)) <> 1
            AND pd.Transfer_Purchase_DetailID Is Null
            AND pd.Purchase_No Is Null
            AND mc.Price_Approve Is Not Null
            AND pd.Currency = mc.[Currency]         
            --AND (IIf(p.[Approve] Is Null,0,1) = IIf(pp.[Manager] Is Not Null And pd.[Orig_Material_ColorID] Is Not Null,1,0))
            AND p.UserID = '${req.UserID}'
            AND cast(p.[Purchase_Date] as date) = cast(GetDate() as date)            
            And pd.Close_Date Is Null
            And CEILING(isnull(pd.Project_Qty,0) - isnull(pd.Use_Stock_Qty,0)) > 0
            And pp.Update_Date is not null
            And pp.Close_Date Is Null
            And pp.ACC_Close Is Null
            Order by p.Purchase_No desc;

            UPDATE Purchase_Detail SET Purchase_No = (Select top 1 [Purchase_No] From @tmpDetail t where t.Purchase_DetailID = p.Purchase_DetailID)
            , Expected_Delivery = p.Delivery_Date
            , Qty = p.Qty
            From Purchase_Detail pd
            Inner Join (Select distinct Purchase_DetailID, Delivery_Date, Qty From @tmpDetail) p on p.Purchase_DetailID = pd.Purchase_DetailID

            Set @ROWCOUNT2 = @@ROWCOUNT;

            COMMIT;
         END TRY
         BEGIN CATCH
            Select @ROWCOUNT = 0, @ROWCOUNT1 = 0, @ROWCOUNT2 = 0, @ROWCOUNT3 = 0;
            ROLLBACK;
         END CATCH
            
         `, req.body);
      break;
      case 3:
         req.body.Name = req.body.Name ? req.body.Name : 'Order_Qty';
         strSQL += format(`
         if @Engineer = '' or @Purchaser = ''
         Begin
         Select @ROWCOUNT + @ROWCOUNT1 + @ROWCOUNT2 + @ROWCOUNT3 as Flag;
            Select Material_ColorID, Sum(Qty) as Qty From @tmpDetail Group by Material_ColorID;   
            return
         End

         BEGIN TRANSACTION;
         BEGIN TRY

            Insert @tmpDetail (Purchase_No, Purchase_DetailID, Material_ColorID, Qty )
            Select p.Purchase_No
            , pd.Purchase_DetailID
            , pd.Material_ColorID
            , Round(isnull(pd.Project_Qty,0) - isnull(pd.Use_Stock_Qty,0), 0) * -1 as Qty
            From Purchase_Detail pd
            INNER JOIN Purchase p on p.Currency = pd.Currency AND p.Purchase_Project_No = pd.Purchase_Project_No AND p.SupplierID = pd.SupplierID And p.Purchase_No = pd.Purchase_No
            INNER JOIN Purchase_Project pp ON pd.Purchase_Project_No = pp.Purchase_Project_No
            WHERE pd.Purchase_Project_No = @Purchase_Project_No
            And pd.[Close_Date] Is Null
            And pp.Update_Date is not null
            --And pp.[Manager] Is Null
            And pp.[Close_Date] Is Null
            And pp.[ACC_Close] Is Null
            And (Select count(*) from Stock_In_Detail si where si.Purchase_DetailID = pd.Purchase_DetailID) = 0
            And (Select count(*) from Stock_Out_Detail si where si.Purchase_DetailID = pd.Purchase_DetailID) = 0;
         
            UPDATE Purchase_Detail SET Purchase_No = null
            , Qty = 0
            --, Use_Stock_Qty = 0
            From Purchase_Detail pd
            Inner Join @tmpDetail p on p.Purchase_DetailID = pd.Purchase_DetailID;

            Set @ROWCOUNT = @@ROWCOUNT;

            Delete from Purchase Where Purchase_No in (
               Select p.Purchase_No
               From Purchase p
               Left Outer Join Purchase_Detail pd on p.Purchase_No = pd.Purchase_No
               Where p.Purchase_Project_No = @Purchase_Project_No
               And pd.Purchase_No is null
            )

            Set @ROWCOUNT1 = @@ROWCOUNT;

            COMMIT;
         END TRY
         BEGIN CATCH
            Select @ROWCOUNT = 0, @ROWCOUNT1 = 0, @ROWCOUNT2 = 0, @ROWCOUNT3 = 0;
            ROLLBACK;
         END CATCH

         `, req.body);
      break;
   }

   strSQL += format(`
   Select @ROWCOUNT + @ROWCOUNT1 + @ROWCOUNT2 + @ROWCOUNT3 as Flag;
   Select Material_ColorID, Sum(Qty) as Qty From @tmpDetail Group by Material_ColorID;
   `, req.body);
   //console.log(strSQL)

      req.body.Flag = false;
      db.sql(req.SiteDB, strSQL)
         .then((result) => {
            //console.log(result.recordsets[0])
            //res.send({Flag:result.recordsets[0][0].Flag > 0});
            req.body.Flag = result.recordsets[0][0].Flag > 0
            req.body.Purchase_Detail =  result.recordsets[1]
            next();
         }).catch((err) => {
            console.log(err);
            next();
         })
   
   },  function (req, res, next) {
      //console.log("Call Purchase_Order_Detail_Maintain Api:",req.body);
     
      var strSQL = `Declare @ROWCOUNT int=0; 
      Declare @tmpDetail Table (Material_ColorID Int, Qty float); `;
   
      req.body.Purchase_Detail.forEach((item)=>{
         strSQL += format(` Insert into @tmpDetail (Material_ColorID, Qty) values ({Material_ColorID}, {Qty}); `,item)
      })
   
      strSQL += format(`
      Update [dbo].[Material_Color] set [{Name}] = isnull([{Name}],0) + isnull(t.Qty,0)
      , Date = GetDate()
      From [dbo].[Material_Color] mc      
      Inner Join (Select Material_ColorID, sum(Qty) as Qty From @tmpDetail Group by Material_ColorID) t on mc.Material_ColorID = t.Material_ColorID;
         
      Set @ROWCOUNT = @@ROWCOUNT;
      `, req.body);   
      //console.log(strSQL)
      db.sql(req.Enterprise, strSQL)
         .then((result) => {
            //console.log(result.recordsets[0])                        
            res.send({Flag:req.body.Flag > 0 });
         }).catch((err) => {
            console.log(err);
            res.status(500).send(err);
         })
});

//Maintain Purchase_Project
router.post('/Purchase_Project_Maintain', async function (req, res, next) {
   console.log("Call Purchase_Project_Maintain Api:",req.body);

   // req.body.Mode === 0 表示新增
   // req.body.Mode === 1 表示修改
   // req.body.Mode === 2 表示刪除
   // req.body.Mode === 3 表示取消Color Swatch
   // req.body.Mode === 4 表示勾選 UnPurchase

   var Size = 0;
   req.body.Purchase_Project_No = req.body.Purchase_Project_No ? `N'${req.body.Purchase_Project_No.trim().substring(0,15).replace(/'/g, '')}'` : `''`;
   req.body.QueryData = req.body.QueryData ? `N'${req.body.QueryData.replace(/'/g, "''")}'` : `''`;
   req.body.Mode = req.body.Mode ? req.body.Mode : 0;
   
   var strSQL = format(`Declare @ROWCOUNT int = 0, @Purchase_Project_No varchar(15) = {Purchase_Project_No}; 
   Declare @tmpTable Table(Material_ColorID int);
   `, req.body);
   switch(req.body.Mode){
      case 0:
         req.body.Season = req.body.Season ? `N'${req.body.Season.trim().substring(0,10).replace(/'/g, "''")}'` : `'${moment().format('YYYY')} ${moment().format('MM') > '06' ? 'FW':'SS'  }'`;
         req.body.CustomerID = req.body.CustomerID ? `N'${req.body.CustomerID.trim().substring(0,20).replace(/'/g, "''")}'` : `''`;
         req.body.Purpose = req.body.Purpose ? `'${req.body.Purpose.trim().substring(0,11)}'` : `'Merchandise'`;

         strSQL += format(`
         Declare @Department nvarchar(50), @OrganizationID nvarchar(50)
            
         Select @Department = d.Department_Code, @OrganizationID = d.OrganizationID
         from Employee e 
            Inner Join Department d on e.DepartmentID = d.DepartmentID
            Inner Join aspnet_Users au on e.EmployeeID = au.EmployeeID
         Where au.LoweredUserName = N'${req.UserID}'

         Insert [dbo].[Purchase_Project] (Purchase_Project_No, Season, Department, CustomerID, Purpose, Category, Apply_Date, Engineer, MTR_Declare_Rate)
         Select {Purchase_Project_No} as Purchase_Project_No, {Season} as Season, @Department as Department, {CustomerID} as CustomerID
         , {Purpose} as Purpose
         , 'CASUAL' as Category
         , GetDate() as Apply_Date
         , '${req.UserID}' as Engineer, (Select isnull([MTR_Declare_Rate],0.7) From [dbo].[Control])
 
         Set @ROWCOUNT = @@ROWCOUNT;
         `, req.body);
       break;
      case 1:
         switch(req.body.Name){
            case 'CustomerID':
               Size = 20;
            break;
            case 'Purchase_Project_No':
            case 'Factory_SubID':
            case 'Category':
               Size = 15;
            break;
            case 'Season':
            case 'Apply_Date':
            case 'Require_Date':
               Size = 10;
            break;
            case 'Department':
               Size = 5;
            break;
            case 'Purpose':
               Size = 11;
            break;
            default:
            break;
         }
         req.body.Value = Size == 0 ? (req.body.Value != null ? req.body.Value : null) : (req.body.Value != null ? `N'${req.body.Value.trim().replace(/'/g, "''")}'` : '');
         
         switch(req.body.Name){
            case 'Engineer_Date':
               strSQL += format(`
                  Update [dbo].[Purchase_Project] Set [{Name}] = ${(req.body.Value ? 'GetDate()': 'null')} 
                  , Engineer = N'${req.UserID}'
                  where Purchase_Project_No = @Purchase_Project_No
                  And Update_Date is null
                  And Manager is null
                  And ACC_Close is null 
                  And Close_Date is null;
   
                  Set @ROWCOUNT = @@ROWCOUNT;
               `, req.body);
            break;
            case 'Update_Date':
               strSQL += format(`
                  Update [dbo].[Purchase_Project] Set [{Name}] = ${(req.body.Value ? 'GetDate()': 'null')} 
                  ${(`, Purchaser = ${req.body.Value ? `N'${req.UserID}'`:'null'}`) } 
                  where Purchase_Project_No = @Purchase_Project_No
                  And Engineer_Date is not null
                  And Manager is null
                  And ACC_Close is null 
                  And Close_Date is null ;
   
                  Set @ROWCOUNT = @@ROWCOUNT;
               `, req.body);
            break;
            case 'Manager':
               strSQL += format(`
                  Update [dbo].[Purchase_Project] Set [{Name}] = ${(req.body.Value ? `N'${req.UserID}'` : 'null' ) }                      
                  where Purchase_Project_No = @Purchase_Project_No
                  And ACC_Close is null 
                  And Close_Date is null ;
   
                  Set @ROWCOUNT = @@ROWCOUNT;
               `, req.body);
            break;
            case 'Require_Date':
               strSQL += format(`
                  Update [dbo].[Purchase_Project] Set [{Name}] = ${(req.body.Value == '' ? 'null': ` case when convert(varchar(10),Apply_Date,111) > {Value} then convert(varchar(10),Apply_Date,111) else {Value} end `) } 
                  --, Purchaser = ${req.body.Value == '' ? 'null': `Purchaser`}
                  --, Update_Date = ${req.body.Value == '' ? 'null': `Update_Date`}
                  , Manager = ${req.body.Value == '' ? 'null': `N'${req.UserID}'`}
                  where Purchase_Project_No = @Purchase_Project_No
                   And ACC_Close is null 
                   And Close_Date is null 
                   And Engineer_Date is not null;

                  Set @ROWCOUNT = @@ROWCOUNT;
               `, req.body);   
            break;
            case 'Purchase_Project_No':
               strSQL += format(`
                  Update [dbo].[Purchase_Project] Set [{Name}] = substring({Value},1,${Size})
                  where Purchase_Project_No = @Purchase_Project_No
                  And PPIC_User is null
                  And ACC_Close is null 
                  And Close_Date is null 
                  And (Select Count(*) From [dbo].[Purchase_Project] d with(NoLock,NoWait) Where Purchase_Project_No = {Value}) = 0 ;

                  Set @ROWCOUNT = @@ROWCOUNT;
                  if(@ROWCOUNT > 0)
                  Begin
                     set @Purchase_Project_No = substring({Value},1,${Size})
                  End

               `, req.body);   
            break;
            case 'Close_Date':
               strSQL += format(`
                  Update [dbo].[Purchase_Project] Set [{Name}] = case when {Value} = 1 then GetDate() else null end
                  where Purchase_Project_No = @Purchase_Project_No
                  And iif({Value} = 1, (Select count(*) From Purchase_Detail pd Where Purchase_Project_No = @Purchase_Project_No And pd.Close_Date is null), 0) = 0
                  And ACC_Close is null;
      
                  Set @ROWCOUNT = @@ROWCOUNT;
               `, req.body);
   
            break;
            case 'Purpose':
            case 'CustomerID':
               strSQL += format(`
                  Update [dbo].[Purchase_Project] Set [{Name}] = ${(Size == 0 ? '{Value}': `substring({Value},1,${Size})`)}
                  where Purchase_Project_No = @Purchase_Project_No
                  And isnull(PPIC_User,'') = ''
                  And (Select count(*) From Produce p with(NoLock,NoWait) where p.Purchase_Project_No = @Purchase_Project_No) = 0
                  And ACC_Close is null 
                  And Close_Date is null;

                  Set @ROWCOUNT = @@ROWCOUNT;
               `, req.body);   
            break;
            default:
               strSQL += format(`
                  Update [dbo].[Purchase_Project] Set [{Name}] = ${(Size == 0 ? '{Value}': `substring({Value},1,${Size})`)}
                  where Purchase_Project_No = @Purchase_Project_No
                  And ACC_Close is null 
                  And Close_Date is null 
                  ;   
                  Set @ROWCOUNT = @@ROWCOUNT;
               `, req.body);   
            break;
         }         
      break;
      case 2:
         strSQL += format(`
            Delete FROM [dbo].[Purchase_Project] 
            where Purchase_Project_No = @Purchase_Project_No
            And isnull(PPIC_Date,'') = ''
            And isnull(Purchaser,'') = ''
            And Engineer_Date is null
            And Close_Date is null
            And ACC_Close is null
            And (Select count(*) From Produce p with(NoLock,NoWait) Where p.Purchase_Project_No = @Purchase_Project_No) = 0
            And (Select count(*) From Purchase_Detail si with(NoLock,NoWait) Where si.Purchase_Project_No = @Purchase_Project_No) = 0;
            
            Set @ROWCOUNT = @@ROWCOUNT;
         `, req.body);
      break;
      case 3:
         strSQL += format(`
         Insert @tmpTable(Material_ColorID)
         Select distinct Material_ColorID
         From Purchase_Detail pd with(NoLock,NoWait)
         Where pd.Purchase_Project_No = @Purchase_Project_No

         Set @ROWCOUNT = @@ROWCOUNT;
         `, req.body);
      break;
      case 4:
      strSQL += format(`         
         Update Purchase_Detail Set Unpurchase = 1
         , Use_Stock_Qty = Project_Qty 
         , Update_User = N'${req.UserID}'
         , Update_Time = GetDate()
         From Purchase_Detail pd
         Left Outer Join Purchase_Responsible pr with(NoLock,NoWait) on pr.Purchase_ResponsibleID = pd.Purchase_ResponsibleID
         Where pd.Purchase_Project_No = @Purchase_Project_No
         And ({QueryData} = '' or charindex({QueryData}, cast(pd.Purchase_DetailID as varchar) 
         + ' ' + case when pd.Purchase_No is null then '' else cast(pd.Purchase_No as varchar) end 
         + ' ' + isnull(cast(pd.Material_ColorID as nvarchar),'') + ' ' + isnull(pd.Material_Category,'') + ' ' + isnull(pd.Material_Specific,'') + ' ' + isnull(pd.Material_Color,'')
         + ' ' + isnull(convert(varchar(10),pd.Expected_Delivery,111), '')  
         + ' ' + isnull(convert(varchar(10),pd.Close_Date,111), '') 
         + ' ' + isnull(pd.Currency,'') 
         + ' ' + isnull(pd.Unit,'') 
         + ' ' + isnull(pd.SupplierID,'') 
         + ' ' + isnull(pd.M_Rmk,'') 
         + ' ' + isnull(pd.Memo,'') 
         + ' ' + isnull(pr.Purchase_Responsible,'') 
         ) > 0)         
         And abs(isnull(pd.Master_Purchase_Item,0)) = 0
         And pd.Purchase_No is null
         And isnull(pd.Stock_In_Qty,0) = 0;

         Set @ROWCOUNT = @@ROWCOUNT;
      `, req.body);
   break;
   }

   strSQL += format(`   
   Select @ROWCOUNT as Flag,  @Purchase_Project_No as Purchase_Project_No;
   Select Material_ColorID From @tmpTable;
   `, req.body);
   //console.log(strSQL)

   var DataSet = {Flag: false, Purchase_Project_No: null};
   var Flag = false;
   var Message = '';
   var tmpTable = []
   await db.sql(req.SiteDB, strSQL)
      .then((result) => {
         //console.log(result.recordsets)
         Flag = true;
         DataSet.Flag = result.recordsets[0][0].Flag > 0;
         DataSet.Purchase_Project_No = result.recordsets[0][0].Purchase_Project_No;
         tmpTable = result.recordsets[1].map((item)=>(item.Material_ColorID))
      }).catch((err) => {
         Message = err
         console.log(err);
      })
      
   req.body.Mode == 3 ? await db.sql(req.Enterprise, `Update Material_Color Set Swatch = null Where Material_ColorID IN ('${tmpTable.join("','")}');`):null;
   
   Flag ? res.send(DataSet) : res.status(500).send(Message); 

});

//Maintain Purchase_Detail
router.post('/Purchase_Project_Detail_Maintain',  async function (req, res, next) {
   console.log("Call Purchase_Project_Detail_Maintain Api:",req.body);

   // req.body.Mode === 0 表示新增採購細項材料
   // req.body.Mode === 1 表示修改採購細項
   // req.body.Mode === 2 表示刪除採購細項材料
   // req.body.Mode === 3 表示修改採購細項材料   
   var Size = 0;
   req.body.Purchase_Project_No = req.body.Purchase_Project_No ? `N'${req.body.Purchase_Project_No.trim().substring(0,15).replace(/'/g, '')}'` : `''`;
   req.body.Purchase_DetailID = req.body.Purchase_DetailID ? req.body.Purchase_DetailID : null;
   req.body.Mode = req.body.Mode ? req.body.Mode : 0;
   req.body.Name = req.body.Name ? req.body.Name : '';
   
   var strSQL = format(`Declare @Mode int = {Mode}, @Name nvarchar(50) = '{Name}'
   , @ROWCOUNT int = 0, @ROWCOUNT1 int = 0, @ROWCOUNT2 int = 0, @ROWCOUNT3 int = 0
   , @Purchase_Project_No varchar(15) = {Purchase_Project_No}, @Purchase_DetailID int = {Purchase_DetailID}
   Declare @Engineer varchar(255), @Engineer_Date varchar(20)
   , @Purchaser varchar(255), @Update_Date varchar(20)
   , @Close_Date varchar(20), @ACC_Close varchar(20)
   , @Apply_Date varchar(20)

   Select @Purchaser = isnull(Purchaser,'') 
   , @Update_Date = case When Update_Date is null then '' else cast(Update_Date as varchar) end   
   , @Engineer_Date = case When Engineer_Date is null then '' else cast(Engineer_Date as varchar) end
   , @Engineer = isnull(Engineer,'') 
   , @Apply_Date = case When Apply_Date is null then '' else cast(iif(isnull(Purpose,'') = 'Others', DateAdd(month, 12, Apply_Date), DateAdd(month, 6, Apply_Date) ) as varchar) end
   , @Close_Date = case When Close_Date is null then '' else cast(Close_Date as varchar) end
   , @ACC_Close = case When ACC_Close is null then '' else cast(ACC_Close as varchar) end   
   From [dbo].[Purchase_Project] d with(NoLock,NoWait) 
   Where Purchase_Project_No = @Purchase_Project_No;

   if((@Mode <> 1 And (@Name <> 'M_Rmk' or @Name <> 'Memo') And @Engineer_Date <> '' And @Update_Date = '') 
      --or (@Engineer_Date <> '') 
      or (@Mode <> 1 And (@Name <> 'M_Rmk' or @Name <> 'Memo') And @Engineer = '') 
      or @Close_Date <> ''or @ACC_Close <> '')
   Begin
      Select @ROWCOUNT + @ROWCOUNT1 + @ROWCOUNT2 + @ROWCOUNT3 as Flag,  @Purchase_DetailID as Purchase_DetailID;
      Return;
   End

   Declare @tmpTable Table(Composite int, Purchase_Project_No varchar(15), Purchase_ResponsibleID int
   , isIBL smallint, MaterialID int, Material_Category nvarchar(35), Unit varchar(10), Material_DetailID int, Material_Specific nvarchar(100), Material_ColorID int, Material_Color nvarchar(70)
   , SupplierID nvarchar(15), Currency varchar(4)
   , Quot_Price float, Orig_Price float, Unit_Price float );

   `, req.body);

   switch(req.body.Mode){
      case 0:
         req.body.Material_ColorID = req.body.Material_ColorID ? req.body.Material_ColorID : 0;
         strSQL += format(`Declare @Master_Purchase_DetailID int

         BEGIN TRANSACTION;
         BEGIN TRY 

            Insert @tmpTable
            Select mc.Composite, @Purchase_Project_No as Purchase_Project_No, isnull(s.Purchase_ResponsibleID,0) as Purchase_ResponsibleID
            , isnull(m.isIBL,0) as isIBL, m.MaterialID, m.Material_Category, m.Unit, md.Material_DetailID, md.Material_Specific, mc.Material_ColorID, mc.Material_Color
            , mc.SupplierID, mc.Currency
            , isnull(mc.Unit_Price,0) as Quot_Price, isnull(mc.Purchase_Price,0) as Orig_Price, isnull(mc.Purchase_Price,0) as Unit_Price         
            From Material_Color mc with(NoLock,NoWait) 
            Inner Join Material_Detail md with(NoLock,NoWait) on mc.Material_DetailID = md.Material_DetailID
            Inner Join Material m with(NoLock,NoWait) on m.MaterialID = md.MaterialID
            Inner Join Supplier s with(NoWait,NoLock) on s.SupplierID = mc.SupplierID
            Where cast(@Apply_Date as Date) >= cast(GetDate() as Date)
            And (mc.Material_ColorID = {Material_ColorID} 
            or mc.Material_ColorID in (
               Select mcp.Detail_ColorID 
               From Material_Composite mcp 
               where mcp.Master_ColorID = {Material_ColorID} ))
            Order by mc.Composite desc; 

            Insert into [dbo].[Purchase_Detail] (Master_Purchase_Item, Sub_Purchase_Item, Master_Purchase_DetailID, Purchase_Project_No, Purchase_ResponsibleID
               , isIBL, MaterialID, Material_Category, Unit, Material_DetailID, Material_Specific, Material_ColorID, Material_Color
               , SupplierID, Currency
               , Quot_Price, Orig_Price, Unit_Price
               , Supplement
               , UserID, Create_Date
               , Update_User, Update_Time)
            Select 1 as Master_Purchase_Item, 0 as Sub_Purchase_Item, Material_ColorID as Master_Purchase_DetailID, Purchase_Project_No, Purchase_ResponsibleID
            , isIBL, MaterialID, Material_Category, Unit, Material_DetailID, Material_Specific, Material_ColorID, Material_Color
            , SupplierID, Currency
            , Quot_Price, Orig_Price, Unit_Price
            , 1 as Supplement
            , N'${req.UserID}' as UserID, GetDate() as Create_Date
            , N'${req.UserID}' as Update_User, GetDate() as Update_Time
            From @tmpTable t
            Where t.Composite = 1;

            Set @ROWCOUNT = @@ROWCOUNT;

            set @Master_Purchase_DetailID = scope_identity();

            Update [dbo].[Purchase_Detail] set Master_Purchase_DetailID = @Master_Purchase_DetailID
            Where Purchase_DetailID = @Master_Purchase_DetailID
            And @ROWCOUNT > 0;

            Insert into [dbo].[Purchase_Detail] (Master_Purchase_Item, Sub_Purchase_Item, Master_Purchase_DetailID, Purchase_Project_No, Purchase_ResponsibleID
               , isIBL, MaterialID, Material_Category, Unit, Material_DetailID, Material_Specific, Material_ColorID, Material_Color
               , SupplierID, Currency
               , Quot_Price, Orig_Price, Unit_Price
               , Supplement
               , UserID, Create_Date
               , Update_User, Update_Time)
            Select 0 as Master_Purchase_Item, case when @ROWCOUNT > 0 then 1 else 0 end as Sub_Purchase_Item, case when @ROWCOUNT > 0 then @Master_Purchase_DetailID else null end as Master_Purchase_DetailID, Purchase_Project_No, Purchase_ResponsibleID
            , isIBL, MaterialID, Material_Category, Unit, Material_DetailID, Material_Specific, Material_ColorID, Material_Color
            , SupplierID, Currency
            , Quot_Price, Orig_Price, Unit_Price
            , 1 as Supplement
            , N'${req.UserID}' as UserID, GetDate() as Create_Date
            , N'${req.UserID}' as Update_User, GetDate() as Update_Time
            From @tmpTable t
            Where t.Composite = 0;
            
            Set @ROWCOUNT1 = @@ROWCOUNT;
            Set @Purchase_DetailID = case when @ROWCOUNT > 0 then @Master_Purchase_DetailID else scope_identity() end;

         COMMIT;
         END TRY
         BEGIN CATCH
            Select @ROWCOUNT = 0, @ROWCOUNT1 = 0;
            ROLLBACK;
         END CATCH      

         
         `, req.body);
      break;
      case 1:
         req.body.Material_ColorID = req.body.Material_ColorID ? req.body.Material_ColorID : 0;
         switch(req.body.Name){
            case 'Use_Stock_Season':
               Size = 10;
            break;
            case 'M_Rmk':
               Size = 40;
            break;
            case 'Memo':
               Size = 40;
            break;
            case 'Delivery_Date':
            case 'Expected_Delivery':
                  Size = 10;
            break;
            default:
            break;
         }
         req.body.Value = Size == 0 ? (req.body.Value != null  ? req.body.Value : null) : (req.body.Value != null ? `N'${req.body.Value.trim().replace(/'/g, "''")}'` : `''`);

         switch(req.body.Name){
            case 'Swatch':
               strSQL += format(`
               Update [dbo].[Material_Color] Set [{Name}] = {Value}
               Where Material_ColorID = {Material_ColorID};
   
               Set @ROWCOUNT = @@ROWCOUNT;
               `, req.body);
            break;
            case 'Unpurchase':
               strSQL += format(`
/*
               Update [dbo].[Purchase_Detail] Set [{Name}] = ${Size == 0 ? '{Value}': `substring({Value},1,${Size})`} 
               , Use_Stock_Qty = case when {Value} = 1 then Project_Qty else Use_Stock_Qty end
               , Update_User = N'${req.UserID}'
               , Update_Time = GetDate()
               From Purchase_Detail pd with(NoLock,NoWait)
               Left outer Join (
                  Select mcp.Detail_ColorID, mcp.Net_Consist
                  From Material_Composite mcp 
                  where mcp.Master_ColorID = {Material_ColorID} 
                ) mc on mc.Detail_ColorID = pd.Material_ColorID
               Where (pd.Master_Purchase_DetailID = @Purchase_DetailID or pd.Purchase_DetailID = @Purchase_DetailID); 
*/   
               Update [dbo].[Purchase_Detail] Set [{Name}] = ${Size == 0 ? '{Value}': `substring({Value},1,${Size})`} 
               , Use_Stock_Qty = case when {Value} = 1 then Project_Qty else 0 end
               , Update_User = N'${req.UserID}'
               , Update_Time = GetDate()
               From Purchase_Detail pd with(NoLock,NoWait)
               Where (pd.Purchase_DetailID = @Purchase_DetailID) 
               And abs(isnull(pd.Master_Purchase_Item,0)) = 0
               And Purchase_No is null
               And isnull(pd.Stock_In_Qty,0) = 0; 

               Set @ROWCOUNT = @@ROWCOUNT;
               `, req.body);
            break;
            case 'isIBL':
               strSQL += format(`
               Update [dbo].[Purchase_Detail] Set [{Name}] = {Value}
               , Update_User = N'${req.UserID}'
               , Update_Time = GetDate()
               From Purchase_Detail pd with(NoLock,NoWait)
               Where pd.Purchase_DetailID = @Purchase_DetailID
   
               Set @ROWCOUNT = @@ROWCOUNT;
               `, req.body);               
            break;
            case 'Supplement':
               strSQL += format(`
               Update [dbo].[Purchase_Detail] Set [{Name}] = ${Size == 0 ? '{Value}': `substring({Value},1,${Size})`} 
               , Update_User = N'${req.UserID}'
               , Update_Time = GetDate()
               From Purchase_Detail pd with(NoLock,NoWait)
               Left outer Join (
                  Select mcp.Detail_ColorID, mcp.Net_Consist
                  From Material_Composite mcp 
                  where mcp.Master_ColorID = {Material_ColorID} 
                ) mc on mc.Detail_ColorID = pd.Material_ColorID
               Where (pd.Master_Purchase_DetailID = @Purchase_DetailID or pd.Purchase_DetailID = @Purchase_DetailID)
               And Orig_Material_ColorID is null
               And (
                  Select count(*)
                  From Purchase_Detail d with(NoLock,NoWait)
                  Where (d.Master_Purchase_DetailID = @Purchase_DetailID or d.Purchase_DetailID = @Purchase_DetailID)
                  And d.Purchase_No is not null
               ) = 0;                
               
   
               Set @ROWCOUNT = @@ROWCOUNT;
               `, req.body);
            break;
            case 'Use_Stock_Season':
               strSQL += format(`
               Update [dbo].[Purchase_Detail] Set [{Name}] = ${Size == 0 ? '{Value}': `substring({Value},1,${Size})`} 
               , Update_User = N'${req.UserID}'
               , Update_Time = GetDate()
               where Purchase_DetailID = @Purchase_DetailID
   
               Set @ROWCOUNT = @@ROWCOUNT;
               `, req.body);
            break;
            case 'Purchase_ResponsibleID':
               strSQL += format(`
               Update [dbo].[Purchase_Detail] Set [{Name}] = ${Size == 0 ? '{Value}': `substring({Value},1,${Size})`} 
               , Update_User = N'${req.UserID}'
               , Update_Time = GetDate()
               where Purchase_DetailID = @Purchase_DetailID
               And Close_Date is null;
   
               Set @ROWCOUNT = @@ROWCOUNT;
               `, req.body);
            break;
            case 'Qty':
               
               strSQL += format(`
               Update Purchase_Detail Set Qty = case when isnull(Project_Qty,0) >= isnull(Use_Stock_Qty,0) + isnull({Value},0) then isnull({Value},0) else isnull(Project_Qty,0) - isnull(Use_Stock_Qty,0) end * case when abs(isnull(pd.Master_Purchase_Item,0)) = 1 or abs(isnull(pd.Sub_Purchase_Item,0)) = 0 then 1 else isnull(mc.Net_Consist,0) end 
               , Update_User = N'${req.UserID}'
               , Update_Time = GetDate()
               From Purchase_Detail pd with(NoLock,NoWait)	  
               Left outer Join (
                  Select mcp.Detail_ColorID, mcp.Net_Consist
                  From Material_Composite mcp 
                  where mcp.Master_ColorID = {Material_ColorID} 
                ) mc on mc.Detail_ColorID = pd.Material_ColorID
               Where (pd.Master_Purchase_DetailID = @Purchase_DetailID or pd.Purchase_DetailID = @Purchase_DetailID)
               And (
                  Select count(*)
                  From Purchase_Detail d with(NoLock,NoWait)
                  Where (d.Master_Purchase_DetailID = @Purchase_DetailID or d.Purchase_DetailID = @Purchase_DetailID)
                  And d.Purchase_No is not null
               ) > 0; 

               Set @ROWCOUNT = @@ROWCOUNT;
               `, req.body);               
            break;
            case 'Short_Qty':
               req.body.Material_ColorID = req.body.Material_ColorID ? req.body.Material_ColorID : 0;
               strSQL += format(`
               Update Purchase_Detail Set Short_Qty = case when isnull(pd.Short_Qty,0) = 0 And (isnull(pd.Qty,0) - isnull(pd.Stock_In_Qty,0)) > 0 then 
                  isnull(pd.Qty,0) - isnull(pd.Stock_In_Qty,0) 
               else 
                  0 
               end
               , Update_User = N'${req.UserID}'
               , Update_Time = GetDate()
               From Purchase_Detail pd with(NoLock,NoWait)	  
               Where pd.Purchase_DetailID = @Purchase_DetailID
               And isnull(pd.Purchase_No,0) <> 0               
               And abs(isnull(pd.Master_Purchase_Item,0)) = 0; 

               Set @ROWCOUNT = @@ROWCOUNT;
               `, req.body);

            break;
            case 'Use_Stock_Qty':
               req.body.Material_ColorID = req.body.Material_ColorID ? req.body.Material_ColorID : 0;
               strSQL += format(`
/*
               Update Purchase_Detail Set Use_Stock_Qty = case when 
                  isnull(Project_Qty,0) >= isnull({Value},0) * (case when abs(isnull(pd.Master_Purchase_Item,0)) = 1 or abs(isnull(pd.Sub_Purchase_Item,0)) = 0 then 1 else isnull(mc.Net_Consist,0) end) + isnull(Qty,0) 
               then 
                  isnull({Value},0) * case when abs(isnull(pd.Master_Purchase_Item,0)) = 1 or abs(isnull(pd.Sub_Purchase_Item,0)) = 0 then 1 else isnull(mc.Net_Consist,0) end 
               else 
                  isnull(Project_Qty,0) - isnull(Qty,0) 
               end
               , Update_User = N'${req.UserID}'
               , Update_Time = GetDate()
               From Purchase_Detail pd with(NoLock,NoWait)
               Left outer Join (
                  Select mcp.Detail_ColorID, mcp.Net_Consist
                  From Material_Composite mcp 
                  where mcp.Master_ColorID = {Material_ColorID} 
                ) mc on mc.Detail_ColorID = pd.Material_ColorID
               Where (pd.Master_Purchase_DetailID = @Purchase_DetailID or pd.Purchase_DetailID = @Purchase_DetailID)
               And (
                  Select count(*)
                  From Purchase_Detail d with(NoLock,NoWait)
                  Where (d.Master_Purchase_DetailID = @Purchase_DetailID or d.Purchase_DetailID = @Purchase_DetailID)
                  And d.Purchase_No is not null
               ) = 0; 
*/

               Update Purchase_Detail Set Use_Stock_Qty = case when isnull(Project_Qty,0) >= isnull({Value},0) then isnull({Value},0) else isnull(Project_Qty,0) end
               , Unpurchase = case when isnull(Project_Qty,0) <= isnull({Value},0) then 1 else 0 end
               , Update_User = N'${req.UserID}'
               , Update_Time = GetDate()
               From Purchase_Detail pd with(NoLock,NoWait)
               Where pd.Purchase_DetailID = @Purchase_DetailID
               And abs(isnull(pd.Master_Purchase_Item,0)) = 0
               --And pd.Purchase_No is null
               And isnull(pd.Stock_In_Qty,0) = 0;

               Set @ROWCOUNT = @@ROWCOUNT;
               `, req.body);
            break;
            case 'Delivery_Date':
               strSQL += format(`
               Declare @TmpDate DateTime; 
                             
               Select @TmpDate = case when {Value} = '' then Delivery_Date else iif({Value} >= Purchase_Date, {Value}, Purchase_Date) end 
               From Purchase p with(NoLock,NoWait)
               where p.Purchase_No = {Purchase_No} 

               Update [dbo].[Purchase] Set Delivery_Date = @TmpDate
               , Data_Updater = N'${req.UserID}'
               , Data_Update = GetDate()
               where Purchase_No = {Purchase_No} 
               And (Select Sum(pd.Stock_In_Qty)
                     From Purchase_Detail pd with(NoLock,NoWait) 
                     Where pd.Purchase_No = {Purchase_No} 
                  ) = 0;
   
               Set @ROWCOUNT = @@ROWCOUNT;

               if(@ROWCOUNT > 0)
               Begin
                  Update [dbo].[Purchase_Detail] Set Expected_Delivery = @TmpDate
                  , Update_User = N'${req.UserID}'
                  , Update_Time = GetDate()
                  where Purchase_No = {Purchase_No} 
                  And (Select Sum(pd.Stock_In_Qty)
                        From Purchase_Detail pd with(NoLock,NoWait) 
                        Where pd.Purchase_No = {Purchase_No} 
                     ) = 0;
               End
               
               `, req.body);
            break;
            case 'Expected_Delivery':
               strSQL += format(`
               Update [dbo].[Purchase_Detail] Set Expected_Delivery = case when isnull(Purchase_No,'') = '' then 
                     iif({Value} = '', null, {Value}) 
                  else 
                     iif({Value} = '', Expected_Delivery, {Value}) 
                  end
               , Update_User = N'${req.UserID}'
               , Update_Time = GetDate()
               where Purchase_DetailID = @Purchase_DetailID
               And Close_Date is null;
   
               Set @ROWCOUNT = @@ROWCOUNT;
               `, req.body);
            break;
            case 'Memo':
               strSQL += format(`
               Update [dbo].[Purchase_Detail] Set [{Name}] = ${Size == 0 ? '{Value}': `substring({Value},1,${Size})`} 
               , Update_User = N'${req.UserID}'
               , Update_Time = GetDate()
               where Purchase_DetailID = @Purchase_DetailID;
   
               Set @ROWCOUNT = @@ROWCOUNT;
               `, req.body);
            break;
            default:
               strSQL += format(`
               Update [dbo].[Purchase_Detail] Set [{Name}] = ${Size == 0 ? '{Value}': `substring({Value},1,${Size})`} 
               , Update_User = N'${req.UserID}'
               , Update_Time = GetDate()
               where Purchase_DetailID = @Purchase_DetailID
               And Close_Date is null;
   
               Set @ROWCOUNT = @@ROWCOUNT;
               `, req.body);
            break;
         }
         
      break;
      case 2:
         strSQL += format(`
            Delete FROM [dbo].[Purchase_Detail] 
            where (Purchase_DetailID = @Purchase_DetailID or Master_Purchase_DetailID = @Purchase_DetailID)
            And isnull(Purchase_No,'') = ''
            And isnull(Stock_In_Qty,0) = 0
            And isnull(Orig_Material_ColorID,'') = ''
            And Close_Date is null;
            
            Set @ROWCOUNT = @@ROWCOUNT;
         `, req.body);
      break;
      case 3:
         req.body.Material_ColorID = req.body.Material_ColorID ? req.body.Material_ColorID : 0;
         strSQL += format(`Declare @Material_Composite table(Detail_ColorID int, Net_Consist float);

         Insert @Material_Composite(Detail_ColorID, Net_Consist)
         Select mcp.Detail_ColorID, mcp.Net_Consist 
         From Material_Composite mcp 
         where mcp.Master_ColorID = {Material_ColorID}

         Insert @tmpTable
         Select mc.Composite, @Purchase_Project_No as Purchase_Project_No, isnull(s.Purchase_ResponsibleID,0) as Purchase_ResponsibleID
         , isnull(m.isIBL,0) as isIBL, m.MaterialID, m.Material_Category, m.Unit, md.Material_DetailID, md.Material_Specific, mc.Material_ColorID, mc.Material_Color
         , mc.SupplierID, mc.Currency
         , isnull(mc.Unit_Price,0) as Quot_Price, isnull(mc.Purchase_Price,0) as Orig_Price, isnull(mc.Purchase_Price,0) as Unit_Price            
         From Material_Color mc with(NoLock,NoWait) 
         Inner Join Material_Detail md with(NoLock,NoWait) on mc.Material_DetailID = md.Material_DetailID
         Inner Join Material m with(NoLock,NoWait) on m.MaterialID = md.MaterialID
         Inner Join Supplier s with(NoWait,NoLock) on s.SupplierID = mc.SupplierID
         Where mc.Material_ColorID = {Material_ColorID} 
         or mc.Material_ColorID in (
            Select Detail_ColorID 
            From @Material_Composite
          )
         Order by mc.Composite desc;

         BEGIN TRANSACTION;
         BEGIN TRY
            if( (Select count(*) From @tmpTable t Where t.Composite = 1) > 0)
            Begin 
            Declare @Orig_Material_ColorID int = (Select Orig_Material_ColorID From Purchase_Detail pd with(NoLock,NoWait) Where pd.Purchase_DetailID = @Purchase_DetailID)

               Update [dbo].[Purchase_Detail] set Master_Purchase_Item = tmp.Master_Purchase_Item
               , Sub_Purchase_Item = tmp.Sub_Purchase_Item
               , Master_Purchase_DetailID = tmp.Master_Purchase_DetailID
               , Purchase_ResponsibleID = tmp.Purchase_ResponsibleID
               , isIBL = tmp.isIBL
               , MaterialID = tmp.MaterialID
               , Material_Category = tmp.Material_Category
               , Unit = tmp.Unit
               , Material_DetailID = tmp.Material_DetailID
               , Material_Specific = tmp.Material_Specific
               , Material_ColorID = tmp.Material_ColorID
               , Material_Color = tmp.Material_Color
               , SupplierID = tmp.SupplierID
               , Currency = tmp.Currency
               , Quot_Price = tmp.Quot_Price
               , Orig_Price = tmp.Orig_Price
               , Unit_Price = tmp.Unit_Price
               , Update_User = tmp.Update_User
               , Update_Time = tmp.Update_Time
               From [dbo].[Purchase_Detail] pd 
               Inner Join (
                  Select @Purchase_DetailID as Purchase_DetailID, 1 as Master_Purchase_Item, 0 as Sub_Purchase_Item, @Purchase_DetailID as Master_Purchase_DetailID, Purchase_Project_No, Purchase_ResponsibleID
                  , isIBL, MaterialID, Material_Category, Unit, Material_DetailID, Material_Specific, Material_ColorID, Material_Color
                  , SupplierID, Currency
                  , Quot_Price, Orig_Price, Unit_Price
                  , N'${req.UserID}' as Update_User, GetDate() as Update_Time
                  From @tmpTable t
                  Where t.Composite = 1            
               ) tmp on tmp.Purchase_DetailID = pd.Purchase_DetailID
               Where pd.Purchase_DetailID = @Purchase_DetailID
               And pd.Purchase_No is null
               And pd.Close_Date is null
               --And pd.Orig_Material_ColorID is null
               ;

               Set @ROWCOUNT = @@ROWCOUNT;

               Delete From [dbo].[Purchase_Detail]
               Where Master_Purchase_DetailID = @Purchase_DetailID
               And ABS(isnull(Master_Purchase_Item,0)) = 0
               And ABS(isnull(Sub_Purchase_Item,0)) = 1
               And Purchase_No is null
               And Close_Date is null
               --And Orig_Material_ColorID is null
               ;
               
               Insert into [dbo].[Purchase_Detail] (Master_Purchase_Item, Sub_Purchase_Item, Master_Purchase_DetailID, Purchase_Project_No, Purchase_ResponsibleID
                  , isIBL, MaterialID, Material_Category, Unit, Material_DetailID, Material_Specific, Material_ColorID, Material_Color
                  , Orig_Material_ColorID
                  , SupplierID, Currency
                  , Quot_Price, Orig_Price, Unit_Price
                  , UserID, Create_Date
                  , Update_User, Update_Time)
               Select 0 as Master_Purchase_Item, 1 as Sub_Purchase_Item, @Purchase_DetailID as Master_Purchase_DetailID, Purchase_Project_No, Purchase_ResponsibleID
               , isIBL, MaterialID, Material_Category, Unit, Material_DetailID, Material_Specific, Material_ColorID, Material_Color
               , @Orig_Material_ColorID as Orig_Material_ColorID
               , SupplierID, Currency
               , Quot_Price, Orig_Price, Unit_Price
               , N'${req.UserID}' as UserID, GetDate() as Create_Date
               , N'${req.UserID}' as Update_User, GetDate() as Update_Time
               From @tmpTable t
               Where t.Composite = 0;

               Set @ROWCOUNT1 = @@ROWCOUNT;

               Insert [dbo].[Purchase_Detail_Sub] (Produce_No, Purchase_DetailID, Qty, In_Qty, Update_Date, Update_User)
               Select pds.Produce_No, pd.Purchase_DetailID, pds.Qty * isnull(t.Net_Consist,1) as Qty, 0 as In_Qty, GetDate() as Update_Date, N'${req.UserID}' as Update_User
               From [dbo].[Purchase_Detail] pd with(NoLock,NoWait)
               Inner Join [dbo].[Purchase_Detail_Sub] pds on pds.Purchase_DetailID = @Purchase_DetailID
               Left Outer Join @Material_Composite t on pd.Material_ColorID = t.Detail_ColorID
               Where pd.Master_Purchase_DetailID = @Purchase_DetailID
			      And pd.Purchase_DetailID <> @Purchase_DetailID;

               Set @ROWCOUNT2 = @@ROWCOUNT;
               
               Update Purchase_Detail Set Project_Qty = tmp.Qty
               From Purchase_Detail t 
               Inner Join (
                  Select pd.Purchase_DetailID, sum(pds.Qty) as Qty
                  From [dbo].[Purchase_Detail] pd with(NoLock,NoWait)
                  Inner Join [dbo].[Purchase_Detail_Sub] pds on pds.Purchase_DetailID = pd.Purchase_DetailID
                  Where pd.Master_Purchase_DetailID = @Purchase_DetailID
                  And pd.Purchase_DetailID <> @Purchase_DetailID
                  Group by pd.Purchase_DetailID
               ) tmp on tmp.Purchase_DetailID = t.Purchase_DetailID
               Where t.Master_Purchase_DetailID = @Purchase_DetailID
               And t.Purchase_DetailID <> @Purchase_DetailID;

               Set @ROWCOUNT3 = @@ROWCOUNT;

            End
            Else
            Begin            
               Update [dbo].[Purchase_Detail] set Master_Purchase_Item = tmp.Master_Purchase_Item
               , Sub_Purchase_Item = tmp.Sub_Purchase_Item
               , Master_Purchase_DetailID = tmp.Master_Purchase_DetailID
               , Purchase_ResponsibleID = tmp.Purchase_ResponsibleID
               , isIBL = tmp.isIBL
               , MaterialID = tmp.MaterialID
               , Material_Category = tmp.Material_Category
               , Unit = tmp.Unit
               , Material_DetailID = tmp.Material_DetailID
               , Material_Specific = tmp.Material_Specific
               , Material_ColorID = tmp.Material_ColorID
               , Material_Color = tmp.Material_Color
               , SupplierID = tmp.SupplierID
               , Currency = tmp.Currency
               , Quot_Price = tmp.Quot_Price
               , Orig_Price = tmp.Orig_Price
               , Unit_Price = tmp.Unit_Price
               , Update_User = tmp.Update_User
               , Update_Time = tmp.Update_Time
               From [dbo].[Purchase_Detail] pd 
               Inner Join (
                  Select @Purchase_DetailID as Purchase_DetailID, 0 as Master_Purchase_Item, 0 as Sub_Purchase_Item, null as Master_Purchase_DetailID, Purchase_Project_No, Purchase_ResponsibleID
                  , isIBL, MaterialID, Material_Category, Unit, Material_DetailID, Material_Specific, Material_ColorID, Material_Color
                  , SupplierID, Currency
                  , Quot_Price, Orig_Price, Unit_Price
                  , N'${req.UserID}' as Update_User, GetDate() as Update_Time
                  From @tmpTable t
                  Where t.Composite = 0
               ) tmp on tmp.Purchase_DetailID = pd.Purchase_DetailID
               Where pd.Purchase_DetailID = @Purchase_DetailID
               And pd.Purchase_No is null
               And pd.Close_Date is null
               --And pd.Orig_Material_ColorID is null
               ;
               
               Set @ROWCOUNT = @@ROWCOUNT;

               Delete From [dbo].[Purchase_Detail]
               Where Master_Purchase_DetailID = @Purchase_DetailID
               And ABS(isnull(Master_Purchase_Item,0)) = 0
               And ABS(isnull(Sub_Purchase_Item,0)) = 1
               And Purchase_No is null
               And Close_Date is null
               --And Orig_Material_ColorID is null
               And @ROWCOUNT > 0;

            End

            COMMIT;
         END TRY
         BEGIN CATCH
            Select @ROWCOUNT = 0, @ROWCOUNT1 = 0, @ROWCOUNT2 = 0, @ROWCOUNT3 = 0;
            ROLLBACK;
         END CATCH      
                        
         `, req.body);
      break;
   }

   strSQL += format(`
   Select @ROWCOUNT + @ROWCOUNT1 + @ROWCOUNT2 + @ROWCOUNT3 as Flag,  @Purchase_DetailID as Purchase_DetailID;

   Select Material_ColorID From @tmpTable;
   `, req.body);
   //console.log(strSQL)

   var DataSet = {Flag: false, Purchase_DetailID: null};
   var Flag = false;
   var Message = '';
   var tmpTable = []
   await db.sql(req.SiteDB, strSQL)
      .then((result) => {
         //console.log(result.recordsets)
         Flag = true;
         DataSet.Flag = result.recordsets[0][0].Flag > 0;
         DataSet.Purchase_DetailID = result.recordsets[0][0].Purchase_DetailID;
         tmpTable = result.recordsets[1].map((item)=>(item.Material_ColorID))
      }).catch((err) => {
         Message = err
         console.log(err);
      })
   
   req.body.Mode == 0 || req.body.Mode == 3 ? await db.sql(req.Enterprise, `Update Material_Color Set Date = GetDate() Where Material_ColorID IN ('${tmpTable.join("','")}');`):null;
   
   Flag ? res.send(DataSet) : res.status(500).send(Message);      
});

//Get PP_Request_Detail_Info
router.post('/PP_Request_Detail_Info',  function (req, res, next) {
   console.log("Call PP_Request_Detail_Info Api:",req.body);
 
   req.body.Mode = req.body.Mode ? req.body.Mode : 0;
   req.body.Purchase_Project_No = req.body.Purchase_Project_No ? `N'${req.body.Purchase_Project_No.trim().substring(0,15).replace(/'/g, '')}'` : `''`;
   req.body.Purchase_DetailID = req.body.Purchase_DetailID ? req.body.Purchase_DetailID : 0;
   req.body.Material_ColorID = req.body.Material_ColorID ? req.body.Material_ColorID : 0;
   req.body.SupplierID = req.body.SupplierID ? `N'${req.body.SupplierID.trim().substring(0,15).replace(/'/g, '')}'` : `''`;

       
   var strSQL = format(`
Declare @Mode int = {Mode}
, @Purchase_Project_No varchar(15) = {Purchase_Project_No}
, @Purchase_DetailID int = {Purchase_DetailID}
, @Material_ColorID int = {Material_ColorID}
, @SupplierID nvarchar(15) = {SupplierID}
--, @Edit_Flag int = isnull((Select case when ABS(isnull(Sub_Purchase_Item,0)) = 1 or isnull(pd.Purchase_No,0) > 0 or isnull(pd.Close_Date,'') != '' then 0 else 1 end From Purchase_Detail pd with(NoLock,NoWait) Where pd.Purchase_DetailID = {Purchase_DetailID}),0)
, @Edit_Flag int = isnull(
      (
         Select case when ABS(isnull(Sub_Purchase_Item,0)) = 1 or isnull(tmp.Recount,0) > 0 or isnull(pd.Stock_In_Qty,0) > 0 or isnull(pd.Close_Date,'') != '' then 0 else 1 end 
         From Purchase_Detail pd with(NoLock,NoWait) 
         Left Outer Join (
            Select Master_Purchase_DetailID as Purchase_DetailID, Count(*) as Recount
            From Purchase_Detail WITH(NoLock, NoWait)
            Where Purchase_Project_No = {Purchase_Project_No}
            And Purchase_No is not null
            And Master_Purchase_DetailID = {Purchase_DetailID}
            Group by Master_Purchase_DetailID
         ) tmp on tmp.Purchase_DetailID = pd.Purchase_DetailID
         Where pd.Purchase_DetailID = {Purchase_DetailID}
      ),0)
if(@Mode = 0 or @Mode = 1)
Begin
   SELECT pds.Purchase_Detail_SubID
   , @Edit_Flag as Edit_Flag
   , pds.Produce_No
   , pds.Qty
   , pds.In_Qty
   , convert(varchar(20),pds.Update_Date,120) as Update_Date
   , pds.Update_User
   FROM Purchase_Detail_Sub pds with(NoLock,NoWait) 
   WHERE pds.Purchase_DetailID = @Purchase_DetailID
   ORDER BY pds.Produce_No;
End
if(@Mode = 0 or @Mode = 2)
Begin
   Declare @tmpProduce table(Produce_No nvarchar(20), Shipmented int)
   
   Insert @tmpProduce(Produce_No, Shipmented)
   Select Produce_No, ABS(isnull(p.Shipmented,0)) as Shipmented
   From Produce p with(NoLock,NoWait)
   Where p.Purchase_Project_No = @Purchase_Project_No

   if((Select count(*) From @tmpProduce) > 0)
   Begin
      SELECT 0 as Flag
      , iif(@Edit_Flag = 1 and p.Shipmented = 0 , 1 ,0  ) as Edit_Flag
      , p.Produce_No
      , tmp.T_Net_Qty
      FROM @tmpProduce p
      Left Outer Join (
         Select pd.Produce_No, sum(pd.T_Net_Qty) as T_Net_Qty
         From Produce p with(NoLock,NoWait)
         Inner Join Produce_Detail pd with(NoLock,NoWait) on p.Produce_No = pd.Produce_No
         Where p.Purchase_Project_No = @Purchase_Project_No
         And pd.Material_ColorID = @Material_ColorID
         --And pd.SupplierID = @SupplierID
         Group by pd.Produce_No
      ) tmp on p.Produce_No = tmp.Produce_No
      Order by Produce_No
   End
   Else
   Begin      
      SELECT 0 as Flag
      , @Edit_Flag as Edit_Flag
      , '[None]' as Produce_No
      , 0 as T_Net_Qty
   End
End
   `, req.body) ;
   //console.log(strSQL)
   db.sql(req.SiteDB, strSQL)
      .then((result) => {
         var DataSet = { PP_Purchase_Detail: (req.body.Mode == 0 || req.body.Mode == 1 ) ? result.recordsets[0] : []
           , PP_Produce_Detail: (req.body.Mode == 0 ) ? result.recordsets[1] : (req.body.Mode == 2 ? result.recordsets[0] : [{Flag:0, Produce_No: '[None]', T_Net_Qty:0}])
           , PP_G_Total_Project_Qty:0
           , PP_G_Total_In_Qty:0
           , PP_G_Total_Net_Qty:0
        };
        
        DataSet.PP_Purchase_Detail.forEach((item,idx) => {
            DataSet.PP_G_Total_Project_Qty += item.Qty;
            DataSet.PP_G_Total_In_Qty += item.In_Qty;
            item.Qty = Math.round((item.Qty)*1000)/1000;
            item.In_Qty = Math.round((item.In_Qty)*1000)/1000;
        });


        DataSet.PP_Produce_Detail.forEach((item,idx) => {
            item.Display_Flag = item.Edit_Flag && !DataSet.PP_Purchase_Detail.some((data)=>(item.Produce_No == data.Produce_No))
            DataSet.PP_G_Total_Net_Qty += item.T_Net_Qty;
            item.T_Net_Qty = Math.round((item.T_Net_Qty)*10000)/10000;
        });

        DataSet.PP_G_Total_Project_Qty = Math.round((DataSet.PP_G_Total_Project_Qty)*10000)/10000;
        DataSet.PP_G_Total_In_Qty = Math.round((DataSet.PP_G_Total_In_Qty)*10000)/10000;
        DataSet.PP_G_Total_Net_Qty = Math.round((DataSet.PP_G_Total_Net_Qty)*10000)/10000;
        
        //console.log(DataSet)
        res.send(DataSet);
      }).catch((err) => {
         console.log(err);
         res.status(500).send(err);
      })
});

//PP_Request_Detail_Maintain 
router.post('/PP_Request_Detail_Maintain', function (req, res, next) {
   console.log("Call PP_Request_Detail_Maintain Api:",req.body);

   // req.body.Mode === 0 表示新增
   // req.body.Mode === 1 表示修改
   // req.body.Mode === 2 表示刪除
   // req.body.Mode === 3 表示材料總數依據製令數量比例分配
   var Size = 0;
   
   req.body.Mode = req.body.Mode ? req.body.Mode : 0;
   req.body.Purchase_Project_No = req.body.Purchase_Project_No ? `N'${req.body.Purchase_Project_No.trim().substring(0,15).replace(/'/g, '')}'` : `''`;
   req.body.Purchase_DetailID = req.body.Purchase_DetailID ? req.body.Purchase_DetailID : 0;
   req.body.Material_ColorID = req.body.Material_ColorID ? req.body.Material_ColorID : 0;
   req.body.Purchase_Detail_SubID = req.body.Purchase_Detail_SubID ? req.body.Purchase_Detail_SubID : 0;
   req.body.Produce_No = req.body.Produce_No ? `N'${req.body.Produce_No.trim().substring(0,20).replace(/'/g, '')}'` : `''`;
   req.body.Detail = req.body.Detail ? req.body.Detail : [];
   
   var strSQL = format(`Declare @ROWCOUNT int=0, @ROWCOUNT1 int=0, @Purchase_Project_No varchar(15) = {Purchase_Project_No},
   @Material_ColorID int = {Material_ColorID}, @Purchase_DetailID int = {Purchase_DetailID}, 
   @Purchase_Detail_SubID int = {Purchase_Detail_SubID}, @Produce_No varchar(20) = {Produce_No}, 
   @Engineer varchar(255), @Engineer_Date varchar(20), 
   @PPIC_User varchar(255), @Purchaser varchar(255), @Update_Date varchar(20), @Project_Close DateTime, @ACC_Close DateTime ;
   Declare @tmpDetail Table (Produce_No varchar(20), Purchase_DetailID Int, Material_ColorID Int, Qty money, Qty_New money);

   Select @Engineer = isnull(Engineer,'') 
   , @Engineer_Date = case When Engineer_Date is null then '' else cast(Engineer_Date as varchar) end
   , @PPIC_User = isnull(PPIC_User,'')
   , @Purchaser = isnull(Purchaser,'') 
   , @Update_Date = case When Update_Date is null then '' else cast(Update_Date as varchar) end
   , @Project_Close = isnull(pp.Close_Date,'') 
   , @ACC_Close = isnull(pp.ACC_Close,'')
   From Purchase_Project pp with(NoLock,NoWait)
   Where pp.Purchase_Project_No = @Purchase_Project_No
  
   if((@Engineer_Date <> '' And @Update_Date = '') or @Project_Close <> '' or @ACC_Close <> '' 
   --or ( Select count(*) From Purchase_Detail pd where pd.Purchase_DetailID = @Purchase_DetailID And isnull(pd.Purchase_No,'') = '' And pd.Close_Date is null) = 0 
   --or isnull((Select case when ABS(isnull(Sub_Purchase_Item,0)) = 1 or isnull(pd.Stock_In_Qty,0) > 0 or isnull(pd.Close_Date,'') != '' then 0 else 1 end From Purchase_Detail pd with(NoLock,NoWait) Where pd.Purchase_DetailID = {Purchase_DetailID}),0) = 0
   or isnull(
      (
         Select case when ABS(isnull(Sub_Purchase_Item,0)) = 1 or isnull(tmp.Recount,0) > 0 or isnull(pd.Stock_In_Qty,0) > 0 or isnull(pd.Close_Date,'') != '' then 0 else 1 end 
         From Purchase_Detail pd with(NoLock,NoWait) 
         Left Outer Join (
            Select Master_Purchase_DetailID as Purchase_DetailID, Count(*) as Recount
            From Purchase_Detail WITH(NoLock, NoWait)
            Where Purchase_Project_No = @Purchase_Project_No
            And Purchase_No is not null
            And Master_Purchase_DetailID = @Purchase_DetailID
            Group by Master_Purchase_DetailID
         ) tmp on tmp.Purchase_DetailID = pd.Purchase_DetailID
         Where pd.Purchase_DetailID = @Purchase_DetailID
      ),0) = 0
   ) 
   Begin
      Select @ROWCOUNT as Flag;
      Select Material_ColorID, Sum(Qty) as Qty From @tmpDetail Group by Material_ColorID;
      return;
   End
   `, req.body);

   switch(req.body.Mode){
      case 0:
      strSQL += format(`
      Insert @tmpDetail (Produce_No, Purchase_DetailID, Material_ColorID, Qty)
      SELECT p.Produce_No
      , @Purchase_DetailID as Purchase_DetailID
      , @Material_ColorID as Material_ColorID
      , isnull(tmp.Qty,0) as Qty
      FROM Produce p with(NoLock,NoWait)
      Left Outer Join (
         Select pd.Produce_No, sum(pd.T_Net_Qty) as Qty
         From Produce_Detail pd with(NoLock,NoWait)
         Where pd.Produce_No IN ('${req.body.Detail.join("','")}')
         And pd.Material_ColorID = @Material_ColorID
         Group by pd.Produce_No
      ) tmp on p.Produce_No = tmp.Produce_No
      Left Outer Join Purchase_Detail_Sub pds on pds.Produce_No = p.Produce_No and pds.Purchase_DetailID = @Purchase_DetailID
      Where p.Produce_No IN ('${req.body.Detail.join("','")}')
      And pds.Produce_No is null
      And ABS(isnull(p.Shipmented,0)) = 0
      Order by p.Produce_No;

      if((select count(*) From @tmpDetail) = 0)
      Begin
         Insert @tmpDetail (Produce_No, Purchase_DetailID, Material_ColorID, Qty)
         SELECT '[None]' as Produce_No
         , @Purchase_DetailID as Purchase_DetailID
         , @Material_ColorID as Material_ColorID
         , 0 as Qty
      End      

      Insert @tmpDetail (Produce_No, Purchase_DetailID, Material_ColorID, Qty)
      Select t.Produce_No, pd.Purchase_DetailID, pd.Material_ColorID, isnull(t.Qty,0) * isnull(mc.Net_Consist,0) as Qty
      From Purchase_Detail pd with(NoLock,NoWait)
      Inner Join @tmpDetail t on t.Purchase_DetailID = pd.Master_Purchase_DetailID
      Inner Join (
         Select mcp.Detail_ColorID, mcp.Net_Consist
         From Material_Composite mcp 
         where mcp.Master_ColorID = @Material_ColorID
       ) mc on mc.Detail_ColorID = pd.Material_ColorID
      Where pd.Purchase_DetailID <> @Purchase_DetailID;

      Insert Purchase_Detail_Sub (Produce_No, Purchase_DetailID, Qty)
      Select Produce_No, Purchase_DetailID, Qty
      From @tmpDetail
     
      Set @ROWCOUNT = @@ROWCOUNT;

      `, req.body);

      break;
      case 1:
         req.body.Value = req.body.Value ? req.body.Value : 0;         
         strSQL += format(`
         Declare @Qty float = isnull((Select Qty From Purchase_Detail_Sub pds where pds.Purchase_Detail_SubID = @Purchase_Detail_SubID),0)

         Insert @tmpDetail (Produce_No, Purchase_DetailID, Material_ColorID, Qty, Qty_New)
         Select @Produce_No as Produce_No
         , pd.Purchase_DetailID
         , pd.Material_ColorID
         , ({Value} - @Qty) * case when abs(isnull(pd.Master_Purchase_Item,0)) = 1 or abs(isnull(pd.Sub_Purchase_Item,0)) = 0 then 1 else isnull(mc.Net_Consist,0) end as Qty
         , {Value} * case when abs(isnull(pd.Master_Purchase_Item,0)) = 1 or abs(isnull(pd.Sub_Purchase_Item,0)) = 0 then 1 else isnull(mc.Net_Consist,0) end as Qty_New
         From Purchase_Detail pd with(NoLock,NoWait)	  
         Left outer Join (
         Select mcp.Detail_ColorID, mcp.Net_Consist
          From Material_Composite mcp 
          where mcp.Master_ColorID = @Material_ColorID ) mc on mc.Detail_ColorID = pd.Material_ColorID
         Where pd.Master_Purchase_DetailID = @Purchase_DetailID
         or pd.Purchase_DetailID = @Purchase_DetailID

         Update Purchase_Detail_Sub set Qty = t.Qty_New
         From Purchase_Detail_Sub pds
         Inner Join @tmpDetail t on pds.Produce_No = t.Produce_No and pds.Purchase_DetailID = t.Purchase_DetailID;
         
         Set @ROWCOUNT = @@ROWCOUNT;

         `, req.body);
      break;
      case 2:
         
         strSQL += format(`
         Declare @Qty float = isnull((Select Qty From Purchase_Detail_Sub pds where pds.Purchase_Detail_SubID = @Purchase_Detail_SubID),0)

         Insert @tmpDetail (Produce_No, Purchase_DetailID, Material_ColorID, Qty)
         Select @Produce_No as Produce_No
         , pd.Purchase_DetailID
         , pd.Material_ColorID
         , @Qty * case when abs(isnull(pd.Master_Purchase_Item,0)) = 1 or abs(isnull(pd.Sub_Purchase_Item,0)) = 0 then 1 else isnull(mc.Net_Consist,0) end  * -1 as Qty
         From Purchase_Detail pd with(NoLock,NoWait)	  
         Left outer Join (
         Select mcp.Detail_ColorID, mcp.Net_Consist
          From Material_Composite mcp 
          where mcp.Master_ColorID = @Material_ColorID ) mc on mc.Detail_ColorID = pd.Material_ColorID
         Where pd.Master_Purchase_DetailID = @Purchase_DetailID
         or pd.Purchase_DetailID = @Purchase_DetailID

         Delete From Purchase_Detail_Sub 
         From Purchase_Detail_Sub pds
         Inner Join @tmpDetail t on pds.Produce_No = t.Produce_No and pds.Purchase_DetailID = t.Purchase_DetailID;
         
         Set @ROWCOUNT = @@ROWCOUNT;

         `, req.body);
      break;      
      case 3:

      var strDetail=''

      req.body.Detail.forEach((item,idx,array)=>{
         if(idx == 0)
            strDetail += `Select '${item.Produce_No}' as Produce_No, @Purchase_DetailID as Purchase_DetailID, @Material_ColorID as Material_ColorID, ${item.Qty} as Qty`
          else 
            strDetail += ` union Select '${item.Produce_No}' as Produce_No, @Purchase_DetailID as Purchase_DetailID, @Material_ColorID as Material_ColorID, ${item.Qty} as Qty`
        })

      strSQL += format(`
      Insert @tmpDetail (Produce_No, Purchase_DetailID, Material_ColorID, Qty)
      ${ strDetail}

      if((select count(*) From @tmpDetail) = 0)
      Begin
         Insert @tmpDetail (Produce_No, Purchase_DetailID, Material_ColorID, Qty)
         SELECT '[None]' as Produce_No
         , @Purchase_DetailID as Purchase_DetailID
         , @Material_ColorID as Material_ColorID
         , 0 as Qty
      End      

      Insert @tmpDetail (Produce_No, Purchase_DetailID, Material_ColorID, Qty)
      Select t.Produce_No, pd.Purchase_DetailID, pd.Material_ColorID, isnull(t.Qty,0) * isnull(mc.Net_Consist,0) as Qty
      From Purchase_Detail pd with(NoLock,NoWait)
      Inner Join @tmpDetail t on t.Purchase_DetailID = pd.Master_Purchase_DetailID
      Inner Join (
         Select mcp.Detail_ColorID, mcp.Net_Consist
         From Material_Composite mcp 
         where mcp.Master_ColorID = @Material_ColorID
       ) mc on mc.Detail_ColorID = pd.Material_ColorID
      Where pd.Purchase_DetailID <> @Purchase_DetailID;


      Update Purchase_Detail_Sub set Qty = isnull(t.Qty,0)
      From Purchase_Detail_Sub ps
      Inner Join @tmpDetail t on ps.Produce_No = t.Produce_No and ps.Purchase_DetailID = t.Purchase_DetailID
      Set @ROWCOUNT = @@ROWCOUNT;

      Insert Purchase_Detail_Sub (Produce_No, Purchase_DetailID, Qty)
      Select t.Produce_No, t.Purchase_DetailID, t.Qty
      From @tmpDetail t 
      Left Outer Join Purchase_Detail_Sub ps on ps.Produce_No = t.Produce_No and ps.Purchase_DetailID = t.Purchase_DetailID
      Where ps.Produce_No is null
     
      Set @ROWCOUNT1 = @@ROWCOUNT;

      `, req.body);

      break;
   }

   strSQL += format(`
   Select @ROWCOUNT + @ROWCOUNT1 as Flag;
   Select Material_ColorID, Sum(Qty) as Qty From @tmpDetail Group by Material_ColorID;

   if(@ROWCOUNT + @ROWCOUNT1 > 0)
   Begin
      Update Purchase_Detail Set Project_Qty = isnull(tmp.Qty,0)
      
      , Qty = case when pd.Purchase_No is null then pd.Qty
         else
            case when CEILING(isnull(tmp.Qty,0)) >= isnull(pd.Qty,0) then isnull(pd.Qty,0) else CEILING(isnull(tmp.Qty,0)) end
         end
      , Use_Stock_Qty = case when pd.Purchase_No is null then pd.Use_Stock_Qty
         else
            case when (isnull(tmp.Qty,0) - isnull(pd.Qty,0)) <= 0 then 0 else isnull(tmp.Qty,0) - isnull(pd.Qty,0) end
         end
         
      , Update_User = '${req.UserID}'
      , Update_Time = GetDate()
      From Purchase_Detail pd
      Inner Join (Select distinct Purchase_DetailID From @tmpDetail) t on t.Purchase_DetailID = pd.Purchase_DetailID
      Left outer Join (
         Select Purchase_DetailID, Sum(Qty) as Qty
         From Purchase_Detail_Sub
         Where Purchase_DetailID in (Select distinct Purchase_DetailID From @tmpDetail)
         Group by Purchase_DetailID
      ) tmp on pd.Purchase_DetailID = tmp.Purchase_DetailID	  
   End

   `, req.body);
   //console.log(strSQL)

   req.body.Flag = false;
   db.sql(req.SiteDB, strSQL)
      .then((result) => {
         //console.log(result.recordsets[0])         
         //res.send({Flag:result.recordsets[0][0].Flag > 0});  
         req.body.Flag = result.recordsets[0][0].Flag > 0            
         req.body.Purchase_Detail =  result.recordsets[1]
         next()
      }).catch((err) => {
         console.log(err);
         next()
      })
},  function (req, res, next) {
     
   var strSQL = `Declare @ROWCOUNT int=0; 
   Declare @tmpDetail Table (Material_ColorID Int, Qty float); `;

   req.body.Purchase_Detail.forEach((item)=>{
      strSQL += format(` Insert into @tmpDetail (Material_ColorID, Qty) values ({Material_ColorID}, {Qty}); `,item)
   })

   strSQL += format(`
   Update [dbo].[Material_Color] set [Require_Qty] = isnull([Require_Qty],0) + isnull(t.Qty,0)
   , Date = GetDate()
   From [dbo].[Material_Color] mc      
   Inner Join (Select Material_ColorID, sum(Qty) as Qty From @tmpDetail Group by Material_ColorID) t on mc.Material_ColorID = t.Material_ColorID;
      
   Set @ROWCOUNT = @@ROWCOUNT;
   `, req.body);   
   //console.log(strSQL)
   db.sql(req.Enterprise, strSQL)
      .then((result) => {
         //console.log(result.recordsets[0])
         res.send({Flag:req.body.Flag > 0 });
      }).catch((err) => {
         console.log(err);
         res.status(500).send(err);
      })
});

 //Get Purchase_Project_Report_Info
router.post('/Purchase_Project_Report_Info',  function (req, res, next) {
   console.log("Call Purchase_Project_Report_Info Api:",req.body);
 
   req.body.Mode = req.body.Mode ? req.body.Mode : 0;
   req.body.Purchase_Project_No = req.body.Purchase_Project_No ? `N'${req.body.Purchase_Project_No.trim().substring(0,15).replace(/'/g, '')}'` : `''`;
   req.body.Without_Cost = req.body.Without_Cost ? req.body.Mode : 0;
   req.body.FactoryID = req.body.FactoryID ? `N'${req.body.FactoryID.trim().replace(/'/g, "''")}'` : `''`;
   req.body.SupplierID = req.body.SupplierID != '' ? `N'${req.body.SupplierID.trim().replace(/'/g, "''")}'` : `''`;
   req.body.OrganizationID = req.body.OrganizationID ? `N'${req.body.OrganizationID.trim().replace(/'/g, "''")}'` : `''`;
   req.body.Country = req.body.Country ? `N'${req.body.Country.trim().replace(/'/g, "''")}'` : `''`;
   req.body.Produce_Info = req.body.Produce_Info ? req.body.Produce_Info : [];
   
   
   //Mode == 0 Get Report Data: Project Sheet List By Category
   //Mode == 1 Get Report Data: Project Sheet List By Supplier
   //Mode == 2 Get Report Data: Order Detail QTY
   //Mode == 3 Get Report Data: Color Swatch
   //Mode == 4 Get Report Data: Virtual Purchase Project For Factory
   //Mode == 5 Get Report Data: Virtual Purchase Data For Factory
   //Mode == 6 Get Report Data: Purchase Detail For Production
   //Mode == 7 Get Report Data: Supplier Packing Memo
   var strSQL = format(`
   Declare @Mode int = {Mode}, @Purchase_Project_No varchar(15) = {Purchase_Project_No}
   `, req.body) ;

   switch(req.body.Mode) {
      case 0:
         strSQL += format(`
         --0 Purchase_Project
         Select Purchase_Project_No
         , convert(varchar(10), p.Require_Date,111) as Require_Date
         FROM Purchase_Project p with(NoWait,NoLock)
         Where p.Purchase_Project_No = @Purchase_Project_No
         
         --1 Produce Info
         SELECT p.Produce_No, p.Qty 
         FROM Produce p with(NoWait,NoLock)
         Where p.Purchase_Project_No = @Purchase_Project_No
         
         --2 Detail
         SELECT pd.Purchase_Project_No
         , mg.Material_GroupID
         , mg.Material_Group
         , pd.Purchase_DetailID
         , pd.Master_Purchase_DetailID
         , pd.SupplierID AS SupplierID
         , pd.Material_ColorID
         , pd.Material_Category + ' ' + pd.Material_Specific + ' ' + pd.Material_Color + ' ' + isnull([M_Rmk],'') AS Material
         , pd.Unit
         , isnull(pd.Unit_Price,0) AS Unit_Price
         , isnull(pd.Project_Qty,0) as Project_Qty
         , isnull(pd.Unit_Price,0) * isnull(pd.Project_Qty,0) as Amount
         , abs(isnull(pd.Unpurchase,0)) as Unpurchase
         , IIf([Sub_Purchase_Item]=-1,'*','') AS Sub_Purchase_Item_Mark
         FROM Purchase_Detail pd with(NoLock,NoWait)
         Left Outer Join Material m with(NoLock,NoWait) ON pd.MaterialID = m.MaterialID
         Left Outer Join Material_Control mc with(NoLock,NoWait)  ON m.Material_ControlID = mc.Material_ControlID
         Left Outer Join Material_Group mg with(NoLock,NoWait) ON mg.Material_GroupID = mc.Material_GroupID
         Where pd.Purchase_Project_No = @Purchase_Project_No
         ORDER BY pd.Material_Category + ' ' + pd.Material_Specific + ' ' + pd.Material_Color + ' ' + [M_Rmk];
         
         --3 Detail_Sub
         SELECT Purchase_Detail.Purchase_DetailID
         , [Purchase_Detail_1].[Material_Category] + ' ' + [Purchase_Detail_1].[Material_Specific] + ' ' + [Purchase_Detail_1].[Material_Color] AS Process_Way
         , [Purchase_Detail].[Material_Category] + ' ' + [Purchase_Detail].[Material_Specific] + ' ' + [Purchase_Detail].[Material_Color] AS Material
         , Purchase_Detail_1.SupplierID 
         FROM Purchase_Detail AS Purchase_Detail_1 with(NoLock,NoWait)
         RIGHT JOIN Purchase_Detail with(NoLock,NoWait) ON Purchase_Detail_1.Master_Purchase_DetailID = Purchase_Detail.Purchase_DetailID 
         WHERE Purchase_Detail.Purchase_Project_No = @Purchase_Project_No
         And Purchase_Detail_1.Material_Category Like 'Process%';
         
         --4 Purchase Produce Info
         SELECT pds.Purchase_DetailID, pds.Produce_No, pds.Qty
         FROM Purchase_Detail pd with(NoLock,NoWait)
         inner Join Purchase_Detail_Sub pds with(NoLock,NoWait) on pd.Purchase_DetailID = pds.Purchase_DetailID
         WHERE pd.Purchase_Project_No = @Purchase_Project_No
         And pds.Produce_No <> '[None]';
      
         `, req.body) ;
      break;
      case 1:
         strSQL += format(`
         --0 Purchase_Project
         Select Purchase_Project_No
         , convert(varchar(10), p.Require_Date,111) as Require_Date
         FROM Purchase_Project p with(NoWait,NoLock)
         Where p.Purchase_Project_No = @Purchase_Project_No
         
         --1 Produce Info
         SELECT p.Produce_No, p.Qty 
         FROM Produce p with(NoWait,NoLock)
         Where p.Purchase_Project_No = @Purchase_Project_No
         And p.Produce_No in ('${req.body.Produce_Info.join("','")}')
         
         --2 Detail
         SELECT pd.Purchase_DetailID
         , pd.Master_Purchase_DetailID
         , pd.SupplierID
         , pd.Material_ColorID
         , pd.Material_Category + ' ' + pd.Material_Specific + ' ' + pd.Material_Color + ' ' + isnull([M_Rmk],'') as Material
         , pd.Unit
         , isnull(pd.Unit_Price,0) as Unit_Price
         , isnull(pd.Project_Qty,0) as Project_Qty
         , tmp.Qty
         , isnull(pd.Unit_Price,0) * isnull(tmp.Qty,0) as Amount
         , abs(isnull(pd.Unpurchase,0)) as Unpurchase
         , IIf([Sub_Purchase_Item]=-1,'*','') as Sub_Purchase_Item_Mark
         FROM Purchase_Detail pd with(NoLock,NoWait)
         Left Outer Join (
          Select p.Purchase_DetailID, Sum(Qty) as Qty
          From Purchase_Detail_Sub p
          Where p.Produce_No in ('${req.body.Produce_Info.join("','")}')
          Group by Purchase_DetailID
         ) tmp on tmp.Purchase_DetailID = pd.Purchase_DetailID
         Where pd.Purchase_Project_No = @Purchase_Project_No
         ORDER BY abs(isnull(pd.Unpurchase,0)), SupplierID, pd.Material_Category + ' ' + pd.Material_Specific + ' ' + pd.Material_Color + ' ' + [M_Rmk];
         
         --3 Detail_Sub
         SELECT Purchase_Detail.Purchase_DetailID
         , [Purchase_Detail_1].[Material_Category] + ' ' + [Purchase_Detail_1].[Material_Specific] + ' ' + [Purchase_Detail_1].[Material_Color] AS Process_Way
         , [Purchase_Detail].[Material_Category] + ' ' + [Purchase_Detail].[Material_Specific] + ' ' + [Purchase_Detail].[Material_Color] AS Material
         , Purchase_Detail_1.SupplierID 
         FROM Purchase_Detail AS Purchase_Detail_1 with(NoLock,NoWait)
         RIGHT JOIN Purchase_Detail with(NoLock,NoWait) ON Purchase_Detail_1.Master_Purchase_DetailID = Purchase_Detail.Purchase_DetailID 
         WHERE Purchase_Detail.Purchase_Project_No = @Purchase_Project_No
         And Purchase_Detail_1.Material_Category Like 'Process%'
         Order by SupplierID;
         
         --4 Purchase Produce Info
         SELECT pds.Purchase_DetailID, pds.Produce_No, pds.Qty
         FROM Purchase_Detail pd with(NoLock,NoWait)
         inner Join Purchase_Detail_Sub pds with(NoLock,NoWait) on pd.Purchase_DetailID = pds.Purchase_DetailID
         WHERE pd.Purchase_Project_No = @Purchase_Project_No
         And pds.Produce_No <> '[None]'
         And pds.Produce_No in ('${req.body.Produce_Info.join("','")}');
      
         `, req.body) ;
      break;
      case 2:
         strSQL += format(`
         --0 Order Detail
         SELECT pt.[Name] as Article_Name
         , s.Gender
         , s.Style_No
         , p.Produce_No
         , convert(varchar(10),od.Est_Shipping_Date,111) as Est_Shipping_Date
         , o.Order_No
         , case when isnull(o.Order_No_Title,'') = '' then 'Order No' else o.Order_No_Title end as Order_No_Title
         , isnull(o.Ref_No_Title,'') as Ref_No_Title
         , IIf(odr.[Ref_No] is null,'', rtrim(odr.[Ref_No])) AS Ref_No
         , od.Order_DetailID
         , od.Product_No
         , od.Factory_Price as Price
         , pt.Color
         , s.Main_Material
         , od.Customer_Product_No
         , od.Destination
         , fs.Port
         , s.Unit
         , od.Qty
         , s.CCC_Code
         FROM Produce p with(NoLock,NoWait)
         INNER JOIN Order_Detail od with(NoLock,NoWait) on p.Produce_No = od.Produce_No 
         INNER JOIN Orders o with(NoLock,NoWait) on od.Order_No = o.Order_No
         Left Outer Join Order_Detail_Ref odr with(NoLock,NoWait) on odr.Order_Detail_RefID = od.Order_Detail_RefID
         Left Outer Join Product pt with(NoLock,NoWait) on pt.Product_No = p.Product_No
         Left Outer Join Factory_Sub fs with(NoLock,NoWait) on p.Factory_SubID = fs.Factory_SubID 
         Left Outer Join Style s with(NoLock,NoWait) on pt.Style_No = s.Style_No
         Where p.Purchase_Project_No = @Purchase_Project_No;
         
         --1 Order Size
         SELECT IIf(odr.[Ref_No] is null,' ',odr.[Ref_No]) AS Ref_No
         , od.Produce_No
         , oq.Size
         , Sum(oq.Qty) AS T_Qty
         , oq.Prerange
         , od.Order_No
         , rtrim(ps.Size_Name) as Size_Name
         FROM Produce p with(NoLock,NoWait)
         Inner Join Order_Detail od with(NoLock,NoWait) on od.Produce_No = p.Produce_No
         Left Outer Join Order_Detail_Ref odr with(NoLock,NoWait) on odr.Order_Detail_RefID = od.Order_Detail_RefID
         Inner Join Order_Qty oq with(NoLock,NoWait) on oq.Order_DetailID = od.Order_DetailID 
         Inner Join Product_Size ps with(NoLock,NoWait) on oq.Size = ps.SizeID
         Where p.Purchase_Project_No = @Purchase_Project_No
         GROUP BY IIf(odr.[Ref_No] is null,' ',odr.[Ref_No]), od.Produce_No, oq.Size, oq.Prerange, od.Order_No, ps.Size_Name;
         `, req.body) ;
      break;
      case 3:
         strSQL += format(`
         --0 Report Info
         SELECT [Material_Category] + ' ' + [Material_Specific] + ' ' + pd.[Material_Color] AS Material
         , pd.Purchase_DetailID
         , pd.Material_ColorID
         , pd.SupplierID
         FROM Purchase_Detail pd with(NoLock,NoWait)
         Left Outer Join Material_Color mc with(NoLock,NoWait) on pd.Material_ColorID = mc.Material_ColorID
         Where pd.Purchase_Project_No = @Purchase_Project_No
         And ABS(isnull(mc.Swatch,0)) = 1
         GROUP BY mc.Swatch, pd.SupplierID, [Material_Category] + ' ' + [Material_Specific] + ' ' + pd.[Material_Color], pd.Purchase_DetailID, pd.Material_ColorID
         Order by pd.SupplierID, [Material_Category] + ' ' + [Material_Specific] + ' ' + pd.[Material_Color], pd.Material_ColorID, pd.Purchase_DetailID;

         --1 OrganizationID
         Select OrganizationID From Control;

         --2 Purchase Project Info
         Select pp.Season
         , pp.CustomerID 
         From Purchase_Project pp with(NoLock,NoWait)
         Where pp.Purchase_Project_No = @Purchase_Project_No;

          `, req.body) ;
      break;
      case 4:
         strSQL += format(`         
         Declare @FactoryID varchar(20) = {FactoryID}, @OrganizationID varchar(20) = {OrganizationID}
         Declare @MTR_Declare_Rate float, @Apply_Date varchar(10), @Purpose varchar(10), @CustomerID varchar(20), @Season varchar(10), @Require_Date varchar(10)
         Declare @MESSRS varchar(100), @MESSRS_Address varchar(256), @Organization_Name varchar(100)
         Declare @Currency Table(Currency varchar(4), Currency_Rate float)
         Declare @TmpDetail Table(MUnit_Price float, Amount float, SupplierID varchar(20), Material_ColorID int, Master_Purchase_DetailID int
         , Material nvarchar(255), Purchase_ResponsibleID int, Unit varchar(10), Project_Qty float, Purchase_DetailID int, Unpurchase int
         , Sub_Purchase_Item_Mark varchar(4), Region nvarchar(50), Description nvarchar(50))
         
         Select @Organization_Name = o.Organization_Name 
         From Organization o 
         where o.OrganizationID = @FactoryID
         
         Select @MESSRS = o.Organization_Name 
         , @MESSRS_Address = o.Address
         From Organization o 
         where o.OrganizationID = @OrganizationID
         
         Select @MTR_Declare_Rate = isnull(pp.MTR_Declare_Rate,0)
         , @Apply_Date = convert(varchar(10),pp.Apply_Date,111)
         , @Purpose = pp.Purpose
         , @CustomerID = pp.CustomerID
         , @Season =  pp.Season
         , @Require_Date = convert(varchar(10),pp.Require_Date,111)
         From Purchase_Project pp with(NoLock,NoWait)
         Where pp.Purchase_Project_No = @Purchase_Project_No
         
         Insert @Currency(Currency, Currency_Rate)
         Select cr.Currency, cr.Currency_Rate
         From [@Currency_Rate] cr
         Where convert(varchar(10),cr.Exchange_Date,111) = @Apply_Date

         Insert @TmpDetail 
         SELECT pd.[Unit_Price] * r_Currency.Currency_Rate * @MTR_Declare_Rate / isnull(m_Currency.Currency_Rate,1) as MUnit_Price
         , isnull(pd.[Unit_Price],0) * r_Currency.Currency_Rate * @MTR_Declare_Rate / isnull(m_Currency.Currency_Rate,1) * isnull(pd.Project_Qty,0) as Amount
         , pd.SupplierID 
         , pd.Material_ColorID
         , pd.Master_Purchase_DetailID
         , pd.[Material_Category] + ' ' + pd.[Material_Specific] + ' ' + pd.[Material_Color] + ' ' + isnull([M_Rmk],'') AS Material
         , pd.Purchase_ResponsibleID
         , pd.Unit
         , isnull(pd.Project_Qty,0) as Project_Qty
         , pd.Purchase_DetailID
         , pd.Unpurchase
         , IIf(abs(pd.[Sub_Purchase_Item])=1,'*','') AS Sub_Purchase_Item_Mark
         , CCC_Code.Region
         , CCC_Code.Description 
         FROM Purchase_Detail pd with(NoLock,NoWait) 
         Left Outer Join @Currency as m_Currency on m_Currency.Currency = 'USD'
         Left Outer Join @Currency as r_Currency on r_Currency.Currency = pd.Currency
         Left Outer JOIN Material_CCC_Code ON pd.MaterialID = Material_CCC_Code.MaterialID
         Left Outer JOIN CCC_Code ON Material_CCC_Code.CCC_CodeID = CCC_Code.CCC_CodeID AND CCC_Code.Region = 'INDONESIA'
         WHERE pd.Purchase_Project_No = @Purchase_Project_No
         And pd.Purchase_ResponsibleID <> 1
          AND Abs(pd.[Unpurchase]) <> 1
         ORDER BY pd.Material_Category + ' ' + pd.Material_Specific + ' ' + pd.Material_Color;         
         
         --0 Report_Info
         Select @Purchase_Project_No as Purchase_Project_No
         , @Apply_Date as Apply_Date
         , @Purpose as Purpose
         , @CustomerID as CustomerID
         , @Season as Season
         , @Require_Date as Require_Date
         , @Organization_Name as Organization_Name
         , @MESSRS as MESSRS
         , @MESSRS_Address as MESSRS_Address
         , dbo.RecurseNumber(round(isnull((Select Sum(Amount) From @TmpDetail),0),2)) as EngNum_TTL_Amount
         
         --1 Produce Info
         SELECT p.Produce_No, p.Qty 
         FROM Produce p with(NoWait,NoLock)
         Where p.Purchase_Project_No = @Purchase_Project_No

         --2 Detail_Info
         Select * From @TmpDetail

         --3 Purchase Produce Info
         SELECT pds.Purchase_DetailID, pds.Produce_No, pds.Qty
         FROM Purchase_Detail pd with(NoLock,NoWait)
         inner Join Purchase_Detail_Sub pds with(NoLock,NoWait) on pd.Purchase_DetailID = pds.Purchase_DetailID
         WHERE pd.Purchase_Project_No = @Purchase_Project_No
         And pds.Produce_No <> '[None]';         
          `, req.body) ;
      break;
      case 5:
         strSQL += format(`
         Declare @Country varchar(20) = {Country}
         Declare @MTR_Declare_Rate float, @Apply_Date varchar(10), @Purpose varchar(10), @CustomerID varchar(20), @Season varchar(10), @Require_Date varchar(10)
         Declare @Currency Table(Currency varchar(4), Currency_Rate float)
         
         Select @MTR_Declare_Rate = isnull(pp.MTR_Declare_Rate,0)
         , @Apply_Date = convert(varchar(10),pp.Apply_Date,111)
         , @Purpose = pp.Purpose
         , @CustomerID = pp.CustomerID
         , @Season =  pp.Season
         , @Require_Date = convert(varchar(10),pp.Require_Date,111)
         From Purchase_Project pp with(NoLock,NoWait)
         Where pp.Purchase_Project_No = @Purchase_Project_No
         
         Insert @Currency(Currency, Currency_Rate)
         Select cr.Currency, cr.Currency_Rate
         From [@Currency_Rate] cr
         Where convert(varchar(10),cr.Exchange_Date,111) = @Apply_Date
         
         --0 Report_Info
         Select @Purchase_Project_No as Purchase_Project_No
         , Convert(varchar(4), @Require_Date, 12) + ' ' +  @CustomerID + ' ' + @Purchase_Project_No + ' - ' + Upper(@Country) as Caption
         , @Apply_Date as Apply_Date
         , @Purpose as Purpose
         , @CustomerID as CustomerID
         , @Season as Season
         , @Require_Date as Require_Date
         
         --1 Detail_Info
         SELECT pd.[Unit_Price] * r_Currency.Currency_Rate * @MTR_Declare_Rate / isnull(m_Currency.Currency_Rate,1) as MUnit_Price
         , isnull(pd.[Unit_Price],0) * r_Currency.Currency_Rate * @MTR_Declare_Rate / isnull(m_Currency.Currency_Rate,1) * isnull(pd.Project_Qty,0) as Amount         
         , pd.SupplierID
         , s.Country
         , pd.Material_ColorID
         , pd.Master_Purchase_DetailID
         , pd.[Material_Category] + ' ' + pd.[Material_Specific] + ' ' + pd.[Material_Color] + ' ' + isnull([M_Rmk],'') AS Material
         , pd.Purchase_ResponsibleID
         , pd.Unit
         , isnull(pd.Project_Qty,0) as Project_Qty
         , pd.Purchase_DetailID
         , pd.Unpurchase
         , IIf(abs(pd.[Sub_Purchase_Item])=1,'*','') AS Sub_Purchase_Item_Mark
         FROM Purchase_Detail pd with(NoLock,NoWait) 
         Left Outer Join @Currency as m_Currency on m_Currency.Currency = 'USD'
         Left Outer Join @Currency as r_Currency on r_Currency.Currency = pd.Currency
         Inner JOIN Supplier s with(NoLock,NoWait) on s.SupplierID = pd.SupplierID And s.Country = @Country
         WHERE pd.Purchase_Project_No = @Purchase_Project_No
         And pd.Purchase_ResponsibleID <> 1
          AND Abs(pd.[Unpurchase]) <> 1
         ORDER BY pd.Material_Category + ' ' + pd.Material_Specific + ' ' + pd.Material_Color;
          `, req.body) ;
      break;
      case 6:
         strSQL += format(`
         Declare @SupplierID nvarchar(15) = {SupplierID}
         
         Select ppd.Material_ColorID
         , iif(ppd.Material_Specific is null, ppd.Material_Category, ppd.Material_Category + ' ' + ppd.Material_Specific) as Material
         , ppd.Material_Color
         , Sum(ppd.Qty) as Qty
         , ppd.SupplierID
         From Purchase_Project pp with(NoLock, NoWait)
         Inner Join Purchase_Detail ppd with(NoLock, NoWait) on pp.Purchase_Project_No = ppd.Purchase_Project_No
         Inner Join Material_Color mc with(NoLock, NoWait) on mc.Material_ColorID = ppd.Material_ColorID And ABS(isnull(mc.Swatch,0)) = 1
         --Inner Join Produce p with(NoLock, NoWait) on pp.Purchase_Project_No = p.Purchase_Project_No
         Where pp.Purchase_Project_No = @Purchase_Project_No
         And (@SupplierID = '' or ppd.SupplierID = @SupplierID)
         --And ppd.Purchase_No is not null
         Group by ppd.Material_ColorID
         , iif(ppd.Material_Specific is null, ppd.Material_Category, ppd.Material_Category + ' ' + ppd.Material_Specific) 
         , ppd.Material_Color, ppd.SupplierID
         Order by ppd.SupplierID
         , iif(ppd.Material_Specific is null, ppd.Material_Category, ppd.Material_Category + ' ' + ppd.Material_Specific)
         , ppd.Material_Color;
         
         Select distinct pd.Material_ColorID
         , pd.ComponentID
         , pc.Component
         , p.Product_No
         , p.Produce_No
         , pd.SupplierID
         From Produce p with(NoLock, NoWait) 
         Inner Join Produce_Detail pd with(NoLock, NoWait) on p.Produce_No = pd.Produce_No
         Inner Join Product_Component pc with(NoLock, NoWait) on pc.ComponentID = pd.ComponentID 
         Where p.Purchase_Project_No = @Purchase_Project_No
         And (@SupplierID = '' or pd.SupplierID = @SupplierID)
         Order by pd.Material_ColorID, pd.ComponentID, p.Produce_No;
          `, req.body) ;
      break;
      case 7:
         strSQL += format(`
         Declare @SupplierID nvarchar(15) = {SupplierID}
         
         SELECT pd.Purchase_Project_No
         , pd.Project_Qty
         , pd.Qty
         , pd.Unpurchase
         , p.Purchase_Date
         , pd.SupplierID
         , p.Delivery_Date
         , p.Purchase_No
         , pd.MaterialID
         , pd.Material_DetailID
         , pd.Material_Category
         , pd.Material_Specific
         , pd.Material_Color
         , pd.M_Rmk
         , pd.Memo
         , pd.Purchase_DetailID
         , pd.Unit
         , m.Material_Category + ' ' + pd.Material_Specific + ' ' + pd.Material_Color as Material
         , m.L2_Material_Category + ' ' + pd.Material_Specific + ' ' + pd.Material_Color as L2_Material
         , pd.Sub_Purchase_Item
         FROM Purchase_Detail pd with(NoLock,NoWait)
         Left Outer Join Purchase p with(NoLock,NoWait) on p.Purchase_No = pd.Purchase_No 
         Left Outer Join Material m with(NoLock,NoWait) on pd.MaterialID = m.MaterialID
         WHERE pd.Purchase_Project_No = @Purchase_Project_No
         And (@SupplierID = '' or pd.SupplierID = @SupplierID)
         And ABS(pd.Unpurchase) <> 1
         Order by SupplierID, L2_Material;
          `, req.body) ;
      break;
   }
   //console.log(strSQL)
   db.sql(req.SiteDB, strSQL)
      .then((result) => {
      var DataSet = { };
 
      switch(req.body.Mode) {
         case 0:
            DataSet = {Report_Info: result.recordsets[0]
               , Produce_Info: result.recordsets[1]
               , Detail_Info: []
               , Grand_Total_Amount: 0
               , Grand_Total_Qty: 0
            };

            DataSet.Detail_Info = [...result.recordsets[2].reduce((r, e) => {
               let k = `${e.Unpurchase}`;
               if (!r.has(k)) {
                 r.set(k, { Unpurchase: e.Unpurchase,
                     Sub_Total_Amount: e.Amount,
                     Sub_Total_Qty: e.Project_Qty,
                  })
               } else {
                  r.get(k).Sub_Total_Amount += e.Amount;
                  r.get(k).Sub_Total_Qty += e.Project_Qty;
               }
               return r;
             }, new Map).values()];

            DataSet.Detail_Info.forEach((item)=>{
               var Detail = result.recordsets[2].filter((data)=>(data.Unpurchase == item.Unpurchase));
               Detail.forEach((data)=>{
                  data.Detail_Sub = result.recordsets[3].filter((obj)=>(obj.Purchase_DetailID == data.Master_Purchase_DetailID));
                  data.Detail_Sub_Produce = result.recordsets[4].filter((obj)=>(obj.Purchase_DetailID == data.Purchase_DetailID));
               });
               item.Material_Group =  [...Detail.reduce((r, e) => {
                  let k = `${e.Material_GroupID}`;
                  if (!r.has(k)) {
                    // console.log(r)
                    r.set(k, {Material_GroupID: e.Material_GroupID, 
                     Material_Group: e.Material_Group,                     
                     Total_Amount: e.Amount
                    })
                  } else {
                     r.get(k).Total_Amount += e.Amount;
                  }
                  return r;
                }, new Map).values()];
               item.Material_Group.forEach((data)=>{
                  data.Detail_Group = Detail.filter((obj)=>(obj.Material_GroupID == data.Material_GroupID));
               });
               DataSet.Grand_Total_Amount += item.Sub_Total_Amount;
               DataSet.Grand_Total_Qty += item.Sub_Total_Qty;               
            })

            DataSet.Grand_Total_Amount = Math.round((DataSet.Grand_Total_Amount)*10000)/10000;
            DataSet.Grand_Total_Qty = Math.round((DataSet.Grand_Total_Qty)*10000)/10000;
         break;
         case 1:
            DataSet = {Report_Info: result.recordsets[0]
               , Produce_Info: result.recordsets[1]
               , Detail_Info: []
               , Grand_Total_Amount: 0
               , Grand_Total_Qty: 0
            };

            DataSet.Detail_Info = [...result.recordsets[2].reduce((r, e) => {
               let k = `${e.Unpurchase}`;
               if (!r.has(k)) {
                 r.set(k, { Unpurchase: e.Unpurchase,
                     Sub_Total_Amount: e.Amount,
                     Sub_Total_Qty: e.Project_Qty,
                  })
               } else {
                  r.get(k).Sub_Total_Amount += e.Amount;
                  r.get(k).Sub_Total_Qty += e.Project_Qty;
               }
               return r;
             }, new Map).values()];

            DataSet.Detail_Info.forEach((item)=>{
               var Detail = result.recordsets[2].filter((data)=>(data.Unpurchase == item.Unpurchase));

               Detail.forEach((data)=>{
                  data.Detail_Sub = result.recordsets[3].filter((obj)=>(obj.Purchase_DetailID == data.Master_Purchase_DetailID));
                  data.Detail_Sub_Produce = result.recordsets[4].filter((obj)=>(obj.Purchase_DetailID == data.Purchase_DetailID));
               });

               item.Material_Group =  [...Detail.reduce((r, e) => {
                  let k = `${e.SupplierID}`;
                  if (!r.has(k)) {
                    // console.log(r)
                    r.set(k, {SupplierID: e.SupplierID,                      
                     Total_Amount: e.Amount
                    })
                  } else {
                     r.get(k).Total_Amount += e.Amount;
                  }
                  return r;
                }, new Map).values()];

               item.Material_Group.forEach((data)=>{
                  data.Detail_Group = Detail.filter((obj)=>(obj.SupplierID == data.SupplierID));
               });
               DataSet.Grand_Total_Amount += item.Sub_Total_Amount;
               DataSet.Grand_Total_Qty += item.Sub_Total_Qty;  
            })

            DataSet.Grand_Total_Amount = Math.round((DataSet.Grand_Total_Amount)*10000)/10000;
            DataSet.Grand_Total_Qty = Math.round((DataSet.Grand_Total_Qty)*10000)/10000;
         break;
         case 2:
            DataSet = {Report_Info: []
               , Grand_Total_Qty: 0
            };

            DataSet.Report_Info = [...result.recordsets[0].reduce((r, e) => {
               let k = `${e.Port}`;
               if (!r.has(k)) {
                 r.set(k, { Port: e.Port,
                     Sub_Total_Qty: e.Qty
                  })
               } else {
                  r.get(k).Sub_Total_Qty += e.Qty;
               }
               return r;
             }, new Map).values()];

            DataSet.Report_Info.forEach((item)=>{
               item.Detail = result.recordsets[0].filter((data)=>(data.Port == item.Port));

               item.Detail.forEach((data)=>{
                  data.Size_Info = result.recordsets[1].filter((obj)=>(obj.Order_No == data.Order_No && obj.Produce_No == data.Produce_No && obj.Ref_No == data.Ref_No)).map((o)=>({Size:o.Size, Size_Name:o.Size_Name, Qty:o.T_Qty}));
                  var size = data.Size_Info.map((obj)=>(obj.Size));
                  var min = data.Size_Info.filter((o)=>(o.Size == Math.min(...size))).map((o)=>(o.Size_Name))
                  var max = data.Size_Info.filter((o)=>(o.Size == Math.max(...size))).map((o)=>(o.Size_Name))
                  data.Size_Range = data.Size_Info.length > 0 ? format(`#{0}~{1}`,min ,max) : ''
               });

               DataSet.Grand_Total_Qty += item.Sub_Total_Qty;
            })

            DataSet.Grand_Total_Qty = Math.round((DataSet.Grand_Total_Qty)*10000)/10000;
         break;
         case 3:
            DataSet = {Report_Info: []
               , OrganizationID: result.recordsets[1][0].OrganizationID
               , Season: result.recordsets[2][0].Season
               , CustomerID: result.recordsets[2][0].CustomerID
            };
            DataSet.Report_Info = [...result.recordsets[0].reduce((r, e) => {
              let k = `${e.Material_ColorID}`;
              if (!r.has(k)) {
                // console.log(r) 
                r.set(k, { 
                  Material: e.Material,
                  Material_ColorID: e.Material_ColorID,
                  SupplierID: e.SupplierID,
                })
              } else {
              }
              return r;
            }, new Map).values()] 
            DataSet.Report_Info.forEach((item)=>{
              item.Serial_No = result.recordsets[0].filter((obj)=>(obj.Material_ColorID == item.Material_ColorID)).map((obj)=>(obj.Purchase_DetailID))
            })
         break;
         case 4:
            DataSet = {Report_Info: result.recordsets[0]
               , Produce_Info: result.recordsets[1]
               , Detail_Info: result.recordsets[2]
               , Grand_Total_Amount: 0
            };

            DataSet.Detail_Info.forEach((item)=>{
               item.Detail_Sub_Produce = result.recordsets[3].filter((obj)=>(obj.Purchase_DetailID == item.Purchase_DetailID));
               DataSet.Grand_Total_Amount += item.Amount;
            })

            DataSet.Grand_Total_Amount = Math.round((DataSet.Grand_Total_Amount)*10000)/10000;         
         break;
         case 5:
            DataSet = {Report_Info: result.recordsets[0]
               , Detail_Info: result.recordsets[1]
               , Grand_Total_Amount: 0
            };

            DataSet.Detail_Info.forEach((item)=>{
               DataSet.Grand_Total_Amount += item.Amount;
            })

            DataSet.Grand_Total_Amount = Math.round((DataSet.Grand_Total_Amount)*10000)/10000;         
         break;
         case 6:
            DataSet = {Report_Info: []
               , Grand_Total_Qty: 0
            };

            DataSet.Report_Info = [...result.recordsets[0].reduce((r, e) => {
               let k = `${e.SupplierID}`;
               if (!r.has(k)) {
                 // console.log(r)
                 r.set(k, { SupplierID: e.SupplierID,
                  Total_Qty: e.Qty
                 })
               } else {
                  r.get(k).Total_Qty += e.Qty;
               }
               return r;
             }, new Map).values()]
     

            DataSet.Report_Info.forEach((item)=>{
               item.Detail_Info = result.recordsets[0].filter((obj)=>(obj.SupplierID == item.SupplierID))
               item.Detail_Info.forEach((data)=>{
                  var Data = result.recordsets[1].filter((obj)=>(obj.Material_ColorID == data.Material_ColorID )).map((obj)=>({Component:obj.Component, Product_No:obj.Product_No, Produce_No:obj.Produce_No}))
                  var Component_Info = [...Data.reduce((r, e) => {
                     let k = `${e.Component}|${e.Product_No}`;
                     if (!r.has(k)) {
                       // console.log(r)
                       r.set(k, { Product_No: e.Product_No,
                        Component: e.Component,
                       })
                     } 
                     return r;
                   }, new Map).values()]
                  var Product_Info = [...Data.reduce((r, e) => {
                     let k = `${e.Product_No}`;
                     if (!r.has(k)) {
                       // console.log(r)
                       r.set(k, { Product_No: e.Product_No,
                       })
                     } 
                     return r;
                   }, new Map).values()]

                   var Produce_Info = [...Data.reduce((r, e) => {
                     let k = `${e.Product_No}|${e.Produce_No}`;
                     if (!r.has(k)) {
                       // console.log(r)
                       r.set(k, { Product_No: e.Product_No,
                        Produce_No: e.Produce_No,
                       })
                     } 
                     return r;
                   }, new Map).values()]

                   Product_Info.forEach((obj)=>{
                     obj.Component = Component_Info.filter((o)=>(obj.Product_No == o.Product_No )).map((i)=>(i.Component)).join(', ')
                     obj.Produce_No = Produce_Info.filter((o)=>(obj.Product_No == o.Product_No )).map((i)=>(i.Produce_No)).join(', ')
                  })
                  data.Component_Info = Product_Info;
               });
               DataSet.Grand_Total_Qty += item.Total_Qty;
            })

            DataSet.Grand_Total_Qty = Math.round((DataSet.Grand_Total_Qty)*10000)/10000;         
         break;
         case 7:
            DataSet = {Report_Info: []
               , Grand_Total_Qty: 0
            };

            DataSet.Report_Info = [...result.recordsets[0].reduce((r, e) => {
               let k = `${e.SupplierID}`;
               if (!r.has(k)) {
                 // console.log(r)
                 r.set(k, { SupplierID: e.SupplierID,
                  Total_Qty: e.Qty
                 })
               } else {
                  r.get(k).Total_Qty += e.Qty;
               }
               return r;
             }, new Map).values()]
     

            DataSet.Report_Info.forEach((item)=>{
               item.Detail_Info = result.recordsets[0].filter((obj)=>(obj.SupplierID == item.SupplierID))
               DataSet.Grand_Total_Qty += item.Total_Qty;
            })

            DataSet.Grand_Total_Qty = Math.round((DataSet.Grand_Total_Qty)*10000)/10000;         
         break;
      }
        //console.log(DataSet)
        res.send(DataSet);
      }).catch((err) => {
         console.log(err);
         res.status(500).send(err);
      })
});

//Get Purchase_Project_Detail_Progress
router.post('/Purchase_Project_Detail_Progress',  function (req, res, next) {
   console.log("Call Purchase_Project_Detail_Progress Api:",req.body);
 
   req.body.Purchase_DetailID = req.body.Purchase_DetailID ? req.body.Purchase_DetailID : null;   
     
   var strSQL = format(`Declare @Purchase_DetailID int = {Purchase_DetailID}
   -- 0 Purchase_Detail
   SELECT pd.Purchase_Project_No
   , pd.Orig_Purchase_DetailID
   , pd.Transfer_Purchase_DetailID
   , pd.Purchase_DetailID
   , pd.Material_ColorID
   , pd.Material_Category
   , pd.Material_Specific
   , pd.Material_Color
   , isnull(pd.Material_Category,'') + ' ' + isnull(pd.Material_Specific,'') + ' ' + isnull(pd.Material_Color,'') as Material
   , pd.M_Rmk
   , pd.Memo
   , pd.Purchase_No
   , pd.SupplierID
   , pd.Unit
   , pd.Currency
   , isnull(pd.Quot_Price,0) as Quot_Price
   , isnull(pd.Orig_Price,0) as Orig_Price
   , isnull(pd.Unit_Price,0) as Unit_Price
   , isnull(pd.Project_Qty,0) as Project_Qty
   , isnull(pd.Qty,0) as Qty
   , pd.Update_User
   , Convert(varchar(20), pd.Update_Time,120) as Update_Time
   , cast(isnull(pd.Use_Stock_Qty,0) as decimal(18, 4)) as Use_Stock_Qty
   , isnull(pd.Short_Qty,0) as Short_Qty
   , isnull(pd.Stock_In_Qty,0) as Stock_In_Qty
   , isnull(pd.Qty,0) - isnull(pd.Stock_In_Qty,0) as Not_In_Qty
   , isnull(pd.Stock_Out_Qty,0) as Stock_Out_Qty
   , isnull(pd.Qty,0) - isnull(pd.Stock_Out_Qty,0) as Not_Out_Qty
   , isnull(mc.Stock_Qty,0) as Stock_Qty
   , isnull(mc.Order_Qty,0) as Order_Qty
   , isnull(mc.Order_Qty,0) - isnull(mc.Booking_QTY,0) as On_Hand_Qty
   , isnull(mc.Require_Qty,0) as Require_Qty
   , isnull(mc.Order_Qty,0) - isnull(mc.Booking_QTY,0) - isnull(mc.Require_Qty,0) as Count_Qty
   FROM Purchase_Detail pd WITH(NoLock, NoWait)
   Left Outer Join Material_Color mc WITH(NoLock, NoWait) on mc.Material_ColorID = pd.Material_ColorID
   WHERE pd.Purchase_DetailID = @Purchase_DetailID
   
   -- 1 Purchase_Detail_Sub (Produce Qty)
   Select pd.Produce_No
   , SUM(pd.Qty) as Produce_Qty
   from Purchase_Detail_Sub pd with(NoLock,NoWait)
   where pd.Purchase_DetailID = @Purchase_DetailID
   Group by pd.Produce_No;

   -- 2 Stock_In
   Select convert(varchar(10), si.Stock_In_Date, 111) as Stock_In_Date
   , si.Stock_In_No
   , si.WarehouseID
   , isnull(sd.Produce_No,'') as Produce_No
   , isnull(sd.In_Qty,0) as Stock_In_Qty
   , si.Currency
   , isnull(sd.Unit_Price,0) as Unit_Price
   , isnull(sd.Charge_Qty,0) as Charge_Qty
   , isnull(sd.Charge_Qty,0) * isnull(sd.Unit_Price,0) as Charge_Amount
   from Stock_In_Detail sd with(NoLock,NoWait)
   Inner Join Stock_In si with(NoLock,NoWait) on sd.Stock_In_No = si.Stock_In_No
   where sd.Purchase_DetailID = @Purchase_DetailID

   -- 3 Stock_Out
   Select convert(varchar(10), so.Stock_Out_Date, 111) as Stock_Out_Date
   , so.Stock_Out_No
   , so.WarehouseID
   , isnull(sd.Out_Qty,0) as Stock_Out_Qty   
   from Stock_Out_Detail sd with(NoLock,NoWait)
   Inner Join Stock_Out so with(NoLock,NoWait) on sd.Stock_Out_No = so.Stock_Out_No
   where sd.Purchase_DetailID = @Purchase_DetailID

   -- 4 Stock_Detail
   Select sd.Material_ColorID
   , wr.WarehouseID
   , sd.Warehouse_RankID
   , wr.Rank_Name
   , sd.Stock_Qty
   from Stock_Detail sd with(NoLock,NoWait)
   Inner Join Warehouse_Rank wr with(NoLock,NoWait) on wr.Warehouse_RankID = sd.Warehouse_RankID
   Inner Join Purchase_Detail pd WITH(NoLock, NoWait) on sd.Material_ColorID = pd.Material_ColorID
   where pd.Purchase_DetailID = @Purchase_DetailID
   And sd.Stock_Qty > 0;

   -- 5 Material CCC Code
   Select pd.Material_ColorID, m.L2_Material_Category, m.Packing_Unit, c.Material_Control, g.Material_Group
   , cc.CCC_CodeID, cc.Region, cc.CCC_Code, cc.[Description], cc.Unit
   From Purchase_Detail pd with(NoLock,NoWait) 
   Inner Join Material_Color mc on pd.Material_ColorID = mc.Material_ColorID
   Inner Join Material_Detail md on mc.Material_DetailID = md.Material_DetailID
   Inner Join Material m on m.MaterialID = md.MaterialID
   Inner Join Material_Control c on m.Material_ControlID = c.Material_ControlID
   Inner Join Material_Group g on c.Material_GroupID = g.Material_GroupID
   Inner Join Material_CCC_Code mcc on mcc.MaterialID = m.MaterialID
   Inner Join CCC_Code cc on mcc.CCC_CodeID = cc.CCC_CodeID
   Where pd.Purchase_DetailID = @Purchase_DetailID
   `, req.body) ;
   //console.log(strSQL)
   db.sql(req.SiteDB, strSQL)
      .then((result) => {
         var DataSet = {Purchase_Detail: result.recordsets[0]
           , Purchase_Detail_Sub: result.recordsets[1]
           , Stock_In: result.recordsets[2]
           , Stock_Out: result.recordsets[3]
           , Stock_Detail: result.recordsets[4]
           , Material_CCC_Code: []
           , Category_Info: []
           , G_Produce_Qty: 0
           , G_Stock_In_Qty: 0
           , G_Charge_In_Amount: 0
           , G_Stock_Out_Qty: 0
           , G_Stock_Qty: 0
        };

         DataSet.Purchase_Detail.forEach((item,idx) => {
            item.Quot_Price = Math.round((item.Quot_Price)*100)/100;
            item.Orig_Price = Math.round((item.Orig_Price)*100)/100;
            item.Unit_Price = Math.round((item.Unit_Price)*100)/100;
            item.Project_Qty = Math.round((item.Project_Qty)*100)/100;
            item.Qty = Math.round((item.Qty)*100)/100;
            item.Use_Stock_Qty = Math.round((item.Use_Stock_Qty)*100)/100;
            item.Short_Qty = Math.round((item.Short_Qty)*100)/100;
            item.Stock_In_Qty = Math.round((item.Stock_In_Qty)*100)/100;
            item.Stock_Out_Qty = Math.round((item.Stock_Out_Qty)*100)/100;
            item.Stock_Qty = Math.round((item.Stock_Qty)*100)/100;
            item.Order_Qty = Math.round((item.Order_Qty)*100)/100;
            item.On_Hand_Qty = Math.round((item.On_Hand_Qty)*100)/100;
            item.Require_Qty = Math.round((item.Require_Qty)*100)/100;
            item.Count_Qty = Math.round((item.Count_Qty)*100)/100;            
         });        

         DataSet.Purchase_Detail_Sub.forEach((item,idx) => {
            item.Produce_Qty = Math.round((item.Produce_Qty)*100)/100;
            DataSet.G_Produce_Qty += item.Produce_Qty;
         });
     
         DataSet.Stock_In.forEach((item,idx) => {
            item.Unit_Price = Math.round((item.Unit_Price)*100)/100;
            item.Charge_Qty = Math.round((item.Charge_Qty)*100)/100;            
            item.Stock_In_Qty = Math.round((item.Stock_In_Qty)*100)/100;            
            DataSet.G_Stock_In_Qty += item.Stock_In_Qty;
            DataSet.G_Charge_In_Amount += item.Charge_Amount;
         });

         DataSet.Stock_Out.forEach((item,idx) => {
            item.Stock_Out_Qty = Math.round((item.Stock_Out_Qty)*100)/100;
            DataSet.G_Stock_Out_Qty += item.Stock_Out_Qty;
         });

         DataSet.Stock_Detail.forEach((item,idx) => {
            item.Stock_Qty = Math.round((item.Stock_Qty)*100)/100;
            DataSet.G_Stock_Qty += item.Stock_Qty;
         });

         // Material_CCC_Code         
         DataSet.Material_CCC_Code = result.recordsets[5].map((obj)=>({CCC_CodeID: obj.CCC_CodeID,
            Region: obj.Region, CCC_Code: obj.CCC_Code, Description: obj.Description
         }))

         // Material_Category
         DataSet.Category_Info = [...result.recordsets[5].reduce((r, e) => {
            let k = `${e.L2_Material_Category}`;
            if (!r.has(k)) {
              // console.log(r)
              r.set(k, { L2_Material_Category: e.L2_Material_Category,
               Packing_Unit: e.Packing_Unit,
               Unit: e.Unit,
               Material_Control: e.Material_Control,
               Material_Group: e.Material_Group,
              })
            } else {
            }
            return r;
          }, new Map).values()]

         DataSet.G_Produce_Qty = Math.round((DataSet.G_Produce_Qty)*100)/100;
         DataSet.G_Stock_In_Qty = Math.round((DataSet.G_Stock_In_Qty)*100)/100;
         DataSet.G_Charge_In_Amount = Math.round((DataSet.G_Charge_In_Amount)*100)/100;
         DataSet.G_Stock_Out_Qty = Math.round((DataSet.G_Stock_Out_Qty)*100)/100;
         DataSet.G_Stock_Qty = Math.round((DataSet.G_Stock_Qty)*100)/100;        
         
         //console.log(DataSet)
         res.send(DataSet);
      }).catch((err) => {
         console.log(err);
         res.status(500).send(err);
      })
});

 //Get Material Used
 router.post('/Material_Used_Info',  function (req, res, next) {
   console.log("Call Material_Used_Info Api:",req.body);
 
   req.body.Material_ColorID = req.body.Material_ColorID ? req.body.Material_ColorID : null;   
     
   var strSQL = format(`Declare @Material_ColorID int = {Material_ColorID}   
   Declare @TmpDetail table (Apply_Date DateTime
   , Purchase_DetailID int, Purchase_Date DateTime
   , Unit_Price float, Purchase_Project_No varchar(15), Project_Qty float
   , Purchase_No int, Qty float, Stock_In_Qty float, Stock_Out_Qty float)
   
   Insert @TmpDetail
   Select pp.Apply_Date
   , pd.Purchase_DetailID
   , p.Purchase_Date
   , pd.Unit_Price
   , pd.Purchase_Project_No
   , pd.Project_Qty
   , p.Purchase_No
   , pd.Qty
   , pd.Stock_In_Qty
   , pd.Stock_Out_Qty
   From Purchase_Project pp with(NoLock,NoWait)
   Inner Join Purchase_Detail pd with(NoLock,NoWait) on pp.Purchase_Project_No = pd.Purchase_Project_No
   Left Outer Join Purchase p with(NoLock,NoWait) on pd.Purchase_No = p.Purchase_No
   where Material_ColorID = @Material_ColorID

   -- 0 Material_Used_Info
   Select t.Purchase_DetailID
   , case when t.Purchase_Date is null then '' else convert(varchar(10), t.Purchase_Date, 111)  end  as Purchase_Date
   , t.Unit_Price
   , t.Purchase_Project_No
   , t.Project_Qty
   , t.Purchase_No
   , t.Qty
   , t.Stock_In_Qty
   , t.Stock_Out_Qty 
   From @TmpDetail t
   --Order by Apply_Date desc, Purchase_Project_No, Purchase_Date desc,  Purchase_No desc
   Order by t.Purchase_DetailID desc

   -- 1 Material_Used_Total
   Select min(Unit_Price) as Unit_Price_min
   , max(Unit_Price) as Unit_Price_max
   , Sum(pd.Project_Qty) as Project_Qty
   , Sum(pd.Qty) as Qty
   , Sum(pd.Stock_In_Qty) as Stock_In_Qty
   , Sum(pd.Stock_Out_Qty) as Stock_Out_Qty
   From @TmpDetail pd    

   -- 2 Produce
   Select distinct isnull(pc.Product_No,'') as Product_No
   , pc.Produce_No
   From Produce_Detail pd with(NoLock,NoWait) 
   Left Outer Join Produce pc with(NoLock,NoWait) on pc.Produce_No = pd.Produce_No 
   Where pd.Material_ColorID = @Material_ColorID
   Order by Produce_No

   `, req.body) ;
   //console.log(strSQL)
   db.sql(req.SiteDB, strSQL)
      .then((result) => {
         var DataSet = {Material_Used_Info: result.recordsets[0]
           , Material_Used_Produce: []
           , Material_Used_Product: []
           , TTL_Unit_Price_min: 0
           , TTL_Unit_Price_max: 0
           , TTL_Project_Qty: 0
           , TTL_Qty: 0
           , TTL_Stock_In_Qty: 0
           , TTL_Stock_Out_Qty: 0
        };

         // Product
         DataSet.Material_Used_Produce = [...result.recordsets[2].reduce((r, e) => {
            let k = `${e.Produce_No}`;
            if (!r.has(k)) {
              // console.log(r)
              r.set(k, { Produce_No: e.Produce_No,
              })
            } else {
            }
            return r;
          }, new Map).values()]

          DataSet.Material_Used_Product = [...result.recordsets[2].reduce((r, e) => {
            let k = `${e.Product_No}`;
            if (!r.has(k)) {
              // console.log(r)
              r.set(k, { Product_No: e.Product_No,
              })
            } else {
            }
            return r;
          }, new Map).values()]

         result.recordsets[1].forEach((item,idx) => {
            DataSet.TTL_Unit_Price_min = Math.round((item.Unit_Price_min)*100)/100;
            DataSet.TTL_Unit_Price_max = Math.round((item.Unit_Price_max)*100)/100;
            DataSet.TTL_Project_Qty = Math.round((item.Project_Qty)*100)/100;
            DataSet.TTL_Qty = Math.round((item.Qty)*100)/100;
            DataSet.TTL_Stock_In_Qty = Math.round((item.Stock_In_Qty)*100)/100;
            DataSet.TTL_Stock_Out_Qty = Math.round((item.Stock_Out_Qty)*100)/100;
         });
         
         //console.log(DataSet)
         res.send(DataSet);
      }).catch((err) => {
         console.log(err);
         res.status(500).send(err);
      })
});

//Get Purchase_Order_List
router.post('/Purchase_Order_List',  function (req, res, next) {
   console.log("Call Purchase_Order_List Api:");
   
   req.body.Purchase_No = req.body.Purchase_No != null ? req.body.Purchase_No : '';
   req.body.Purchase_Project_No = req.body.Purchase_Project_No ? `${req.body.Purchase_Project_No.trim().substring(0,15).replace(/'/g, '')}` : '';
   req.body.SupplierID = req.body.SupplierID ? `${req.body.SupplierID.trim().substring(0,15).replace(/'/g, '')}` : '';    
   req.body.OrganizationID = req.body.OrganizationID ? `${req.body.OrganizationID.trim().substring(0,10).replace(/'/g, '')}` : '';    
   req.body.Purchase_Date = req.body.Purchase_Date ? `${req.body.Purchase_Date.trim().substring(0,10).replace(/'/g, '')}` : '';
   req.body.Delivery_Date = req.body.Delivery_Date ? `${req.body.Delivery_Date.trim().substring(0,10).replace(/'/g, '')}` : '';
   req.body.WarehouseID = req.body.WarehouseID ? `${req.body.WarehouseID.trim().substring(0,10).replace(/'/g, '')}` : '';
   req.body.Currency = req.body.Currency ? `${req.body.Currency.trim().substring(0,4).replace(/'/g, '')}` : '';
   req.body.UserID = req.body.UserID ? `${req.body.UserID.trim().substring(0,20).replace(/'/g, '')}` : '';
   req.body.Approve = req.body.Approve ? `${req.body.Approve.trim().substring(0,20).replace(/'/g, '')}` : '';

   var strSQL = format(`
   SELECT Top 3000 cast(case when isnull(Approve,'') = '' then 0 else 1 end as bit) as Approve_Flag
   , [Purchase_No]
   , [Purchase_Project_No]
   , [SupplierID]
   , [OrganizationID]
   , Convert(varchar(10), [Purchase_Date],111) as Purchase_Date
   , Convert(varchar(10), [Delivery_Date],111) as Delivery_Date
   , [WarehouseID]
   , [Currency]
   , [UserID]
   , [Approve]
   FROM [dbo].[Purchase] pp With(Nolock,NoWait)
   where (N'{Purchase_No}' = '' or cast([Purchase_No] as varchar) like N'%{Purchase_No}%')
   And (N'{Purchase_Project_No}' = '' or [Purchase_Project_No] like N'%{Purchase_Project_No}%')
   And (N'{SupplierID}' = '' or [SupplierID] like N'%{SupplierID}%')
   And (N'{OrganizationID}' = '' or [OrganizationID] like N'%{OrganizationID}%')
   And (N'{Purchase_Date}' = '' or CONVERT (varchar(10), [Purchase_Date], 111) LIKE N'{Purchase_Date}%')
   And (N'{Delivery_Date}' = '' or CONVERT (varchar(10), [Delivery_Date], 111) LIKE N'{Delivery_Date}%')
   And (N'{WarehouseID}' = '' or [WarehouseID] like N'%{WarehouseID}%')
   And (N'{Currency}' = '' or [Currency] like N'%{Currency}%')
   And (N'{UserID}' = '' or [UserID] like N'%{UserID}%')
   And (N'{Approve}' = '' or [Approve] like N'%{Approve}%')
   ORDER BY Purchase_No desc;
   `, req.body) ;
   //console.log(strSQL)
   db.sql(req.SiteDB, strSQL)
      .then((result) => {
         res.send(result.recordset);
      }).catch((err) => {
         console.log(err);
         res.status(500).send(err);
      })
});

 //Get Purchase_Order_Info
router.post('/Purchase_Order_Info',  function (req, res, next) {
   console.log("Call Purchase_Order_Info Api:",req.body);
 
   req.body.Purchase_No = req.body.Purchase_No != null ? req.body.Purchase_No : null;
   req.body.Mode = req.body.Mode ? req.body.Mode : 0;
 
   //Mode == 0 Get Purchase, Purchase_Detail
   //Mode == 1 Get Purchase Data
   //Mode == 2 Get Purchase_Detail Data      
   var strSQL = format(`
   Declare @Mode int = {Mode};
 
   if(@Mode = 0 or @Mode = 1)
   Begin
      SELECT p.[Purchase_No]
      , p.[Purchase_Project_No]
      , pp.[Purpose]
      , p.[SupplierID]
      , s.[Supplier_Name]
      , s.[Address]
      , p.[ContactID]
      , sc.[Contact]
      , p.[OrganizationID]
      , Convert(varchar(10), p.[Purchase_Date],111) as Purchase_Date
      , Convert(varchar(10), p.[Delivery_Date],111) as Delivery_Date
      , p.[WarehouseID]
      , p.[Payment_Terms]
      , p.[Term_Price] 
      , p.[Commodity]
      , Round(isnull(p.[Loss_Rate],0) * 100,2) as Loss_Rate
      , p.[Rcv_Type]
      , isnull(p.[Rcv_Days],0) as Rcv_Days
      , isnull(p.[By_Doc_Rcv],0) as By_Doc_Rcv
      , p.[Currency]
      , p.[Memo] 
      , p.[UserID]
      , p.[Approve]
      , cast(case when isnull(Approve,'') = '' then 0 else 1 end as bit) as Approve_Flag
      , cast(iif((Select Sum(pd.Stock_In_Qty) From Purchase_Detail pd with(NoLock,NoWait) Where pd.Purchase_No = {Purchase_No}) > 0, 1, 0) as bit) as Stock_In_Flag
      FROM [dbo].[Purchase] p With(Nolock,NoWait)
      Inner Join Supplier s With(Nolock,NoWait) on s.SupplierID = p.SupplierID
      Left Outer Join Supplier_Contacts sc With(Nolock,NoWait) on p.ContactID = sc.ContactID
      Left Outer Join Purchase_Project pp With(Nolock,NoWait) on pp.Purchase_Project_No = p.Purchase_Project_No
      where p.Purchase_No = {Purchase_No}
   End
   if(@Mode = 0 or @Mode = 2)
   Begin
      SELECT pd.Purchase_DetailID
      , pd.Master_Purchase_Item
      , pd.Sub_Purchase_Item
      , pd.Material_ColorID
      , pd.Material_Category
      , pd.Material_Specific
      , pd.Material_Color
      --, isnull(cast(pd.Material_ColorID as varchar),'') + ' ' + isnull(pd.Material_Category,'') +' '+ isnull(pd.Material_Specific,'') + ' ' + isnull(pd.Material_Color,'') as Material
      , isnull(cast(pd.Material_ColorID as nvarchar),'')
      + iif(isnull(cast(pd.Orig_Material_ColorID as nvarchar),'') = '', '', ' ('+ isnull(cast(pd.Orig_Material_ColorID as nvarchar),'') + ') ') 
      + ' ' + isnull(pd.Material_Category,'') + ' ' + isnull(pd.Material_Specific,'') + ' ' + isnull(pd.Material_Color,'') as Material
      , pd.M_Rmk
      , pd.Unit
      , isnull(pd.Project_Qty,0) as Project_Qty
      , isnull(pd.Qty,0) as Qty
      , isnull(pd.Stock_In_Qty,0) + isnull(pd.Stock_Out_Qty,0) as InOut_Qty
      , pd.Currency
      , isnull(pd.Unit_Price,0) as Unit_Price      
      , pd.Memo
      , case when Round(isnull(pd.[Unit_Price] / nullif(m.[Purchase_Price], 0 ) ,0),2) * 100 <> 100 And Round(isnull(pd.[Unit_Price] / nullif(m.[Purchase_Price], 0 ) ,0),2) * 100 <> 0 
         then '(' + cast(Round(isnull(pd.[Unit_Price] / nullif(m.[Purchase_Price], 0 ) ,0),2) * 100 as varchar)+'%)'
         else '' End as Price_Rate      
      , Cast(Case when (Select Count(*) From Stock_In_Detail si where si.Purchase_DetailID = pd.Purchase_DetailID) = 0 
         and pd.Close_Date is null
         then 1 else 0 End as bit) as Edit_Flag
      , Cast(Case when isnull(m.Composite,0) = 0 then 1 else 0 end as bit) as Material_Price_Update_Flag
      , Cast(Case when (Select Count(*) From Stock_In_Detail sid Inner Join Stock_In si on si.Stock_In_No = sid.Stock_In_No where sid.Purchase_DetailID = pd.Purchase_DetailID And isnull(si.Bill_No,'') != '') = 0 
      And abs(isnull(pd.Master_Purchase_Item,0)) = 0
      then 1 else 0 End as bit) as Edit_Purchase_Qty
      FROM Purchase_Detail pd WITH(NoLock, NoWait)
      Left outer Join Material_Color m on m.Material_ColorID = pd.Material_ColorID
      WHERE pd.Purchase_No = {Purchase_No}
   End
   `, req.body) ;
   //console.log(strSQL)
   db.sql(req.SiteDB, strSQL)
      .then((result) => {
         var DataSet = {Purchase_Order: (req.body.Mode == 0 || req.body.Mode == 1) ? result.recordsets[0] : []
           , Purchase_Order_Detail: (req.body.Mode == 0) ? result.recordsets[1] : (req.body.Mode == 2 ? result.recordsets[0] : [])
           , InOut_Qty:0
           , G_Total_Project_Qty: 0
           , G_Total_Qty: 0
        };

        DataSet.Purchase_Order_Detail.forEach((item,idx) => {
            item.Project_Qty = Math.round((item.Project_Qty)*10000)/10000;
            item.Qty = Math.round((item.Qty)*10000)/10000;
            DataSet.InOut_Qty += item.InOut_Qty;
            DataSet.G_Total_Project_Qty += item.Project_Qty;
            DataSet.G_Total_Qty += item.Qty;
        });

        DataSet.InOut_Qty = Math.round((DataSet.InOut_Qty)*10000)/10000;
        DataSet.G_Total_Project_Qty = Math.round((DataSet.G_Total_Project_Qty)*10000)/10000;
        DataSet.G_Total_Qty = Math.round((DataSet.G_Total_Qty)*10000)/10000;
        
        //console.log(DataSet)
        res.send(DataSet);
      }).catch((err) => {
         console.log(err);
         res.status(500).send(err);
      })
});

//Maintain Purchase Order
router.post('/Purchase_Order_Maintain',  function (req, res, next) {
   console.log("Call Purchase_Order_Maintain Api:",req.body);

   // req.body.Mode === 0 表示新增
   // req.body.Mode === 1 表示修改
   // req.body.Mode === 2 表示刪除
   var Size = 0;
   req.body.Purchase_No = req.body.Purchase_No ? req.body.Purchase_No : null;
   
   var strSQL = format(`Declare @ROWCOUNT int, @Purchase_No int = {Purchase_No} 
   `, req.body);
   switch(req.body.Mode){
      case 0:
         req.body.Purchase_Project_No = req.body.Purchase_Project_No ? `N'${req.body.Purchase_Project_No.trim().substring(0,15).replace(/'/g, "''")}'` : `''`;
         req.body.Currency = req.body.Currency ? `N'${req.body.Currency.trim().substring(0,4).replace(/'/g, "''")}'` : `'TWD'`;
         req.body.SupplierID = req.body.SupplierID ? `N'${req.body.SupplierID.trim().substring(0,15).replace(/'/g, "''")}'` : `''`;         
         //req.body.ContactID = req.body.ContactID ? req.body.ContactID : null;
         req.body.Delivery_Date = req.body.Delivery_Date ? `'${req.body.Delivery_Date.trim().substring(0,10)}'` : `'${moment().format('YYYY/MM/DD')}'`;         

         strSQL += format(`
            Insert [dbo].[Purchase] (Purchase_Date, Purchase_Project_No, [Currency], [SupplierID], [WarehouseID], [Delivery_Date], UserID, Data_Updater, Data_Update)
            Select GetDate() as Purchase_Date, {Purchase_Project_No} as Purchase_Project_No, {Currency} as [Currency], {SupplierID} as [SupplierID]
               , (Select Default_WarehouseID From Control) as WarehouseID
               , cast((Select IIf(pp.[Require_Date] = null, GetDate()+7, IIf(pp.[Require_Date]<GetDate()+5,GetDate()+7,(pp.[Require_Date])-5)) From Purchase_Project pp Where pp.Purchase_Project_No = {Purchase_Project_No}) as Date) as [Delivery_Date]
               , N'${req.UserID}' as UserID
               , N'${req.UserID}' as Data_Updater
               , GetDate() as Data_Update
            Set @ROWCOUNT = @@ROWCOUNT;
            Set @Purchase_No = scope_identity();
         `, req.body);
      break;
      case 1:
         switch(req.body.Name){
            case 'Rcv_Type':
            case 'Currency':
               Size = 4;
            break;
            case 'Purchase_Date':
            case 'Delivery_Date':
            case 'OrganizationID':
            case 'WarehouseID':
              Size = 10;
            break;
            case 'SupplierID':
            case 'Purchase_Project_No':
               Size = 15;
            break;
            case 'Approve':
               Size = 20;
            break;
            case 'Payment_Terms':
                  Size = 50;
            break;
            case 'Term_Price':
                  Size = 80;
            break;
            case 'Commodity':
                  Size = 100;
            break;
            case 'Memo':
               Size = 65535;
            break;
            case 'Loss_Rate':
               req.body.Value = req.body.Value / 100
            break;
            default:
            break;
         }
         req.body.Value = Size == 0 ? (req.body.Value != null ? req.body.Value : null) : (req.body.Value ? `N'${req.body.Value.trim().replace(/'/g, "''")}'` : `''`);

         switch(req.body.Name){
            case 'Delivery_Date':
               strSQL += format(`
               Declare @TmpDate DateTime; 
                             
               Select @TmpDate = case when {Value} = '' then Delivery_Date else iif({Value} >= Purchase_Date, {Value}, Purchase_Date) end 
               From Purchase p with(NoLock,NoWait)
               where p.Purchase_No = {Purchase_No} 

               Update [dbo].[Purchase] Set Delivery_Date = @TmpDate
               where Purchase_No = {Purchase_No} 
               And (Select Sum(pd.Stock_In_Qty)
                     From Purchase_Detail pd with(NoLock,NoWait) 
                     Where pd.Purchase_No = {Purchase_No} 
                  ) = 0;
   
               Set @ROWCOUNT = @@ROWCOUNT;

               if(@ROWCOUNT > 0)
               Begin
                  Update [dbo].[Purchase_Detail] Set Expected_Delivery = @TmpDate
                  , Update_User = N'${req.UserID}'
                  , Update_Time = GetDate()
                  where Purchase_No = {Purchase_No} 
                  And (Select Sum(pd.Stock_In_Qty)
                        From Purchase_Detail pd with(NoLock,NoWait) 
                        Where pd.Purchase_No = {Purchase_No} 
                     ) = 0;
               End
            `, req.body);
               
            break;
            case 'WarehouseID':
              strSQL += format(`Update Purchase set WarehouseID = {Value}
                Where Purchase_No = @Purchase_No
                And isnull((Select (Sum(pd.Stock_In_Qty) + Sum(pd.Stock_Out_Qty)) From Purchase_Detail pd with(NoLock,NoWait) Where pd.Purchase_No = @Purchase_No),0) = 0;

                Set @ROWCOUNT = @@ROWCOUNT;
                `, req.body);
            break;
            default:
            strSQL += format(`
               Update [dbo].[Purchase] Set [{Name}] = ${Size == 0 ? '{Value}': ` case when len({Value}) > 0 then substring({Value},1,${Size}) else null end`}
               ${req.body.Name == 'SupplierID' ? ', ContactID = null' : ''}
               where Purchase_No = @Purchase_No;

               Set @ROWCOUNT = @@ROWCOUNT;
            `, req.body);
            break;
         }
      break;
      case 2:
         strSQL += format(`
            Delete FROM [dbo].[Purchase] 
            where Purchase_No = @Purchase_No
            And (Select count(*) from Purchase_Detail pd with(Nowait,NoLock) Where pd.Purchase_No = @Purchase_No ) = 0;

            Set @ROWCOUNT = @@ROWCOUNT; 
         `, req.body);
      break;
        
   }

   strSQL += format(`
   Select @ROWCOUNT as Flag,  @Purchase_No as Purchase_No;

   if({Mode} = 1 and @ROWCOUNT > 0)
   Begin
      Update [dbo].[Purchase] Set UserID = isnull(UserID, N'${req.UserID}')
      , Data_Updater = N'${req.UserID}'
      , Data_Update = GetDate()
      where Purchase_No = @Purchase_No;
   End
   `, req.body);
   //console.log(strSQL)
   db.sql(req.SiteDB, strSQL)
      .then((result) => {
         //console.log(result.recordsets[0])
         res.send({Flag:result.recordsets[0][0].Flag > 0, Purchase_No: result.recordsets[0][0].Purchase_No});
      }).catch((err) => {
         console.log(err);
         res.status(500).send(err);
      })
});

//Maintain Purchase Order Detail
router.post('/Purchase_Order_Detail_Maintain',  function (req, res, next) {
   console.log("Call Purchase_Order_Detail_Maintain Api:",req.body);

   // req.body.Mode === 0 表示新增
   // req.body.Mode === 1 表示修改
   // req.body.Mode === 2 表示刪除
   var Size = 0;
   req.body.Purchase_No = req.body.Purchase_No ? req.body.Purchase_No : null;
   req.body.Purchase_DetailID = req.body.Purchase_DetailID ? req.body.Purchase_DetailID : null;
   req.body.Detail = req.body.Detail ? req.body.Detail : [];
   
   var strSQL = format(`Declare @ROWCOUNT int=0, @Project_Close DateTime, @ACC_Close DateTime ;
   Declare @tmpDetail Table (Purchase_DetailID Int, Material_ColorID Int, Qty float, Delivery_Date DateTime);

   Select @Project_Close = isnull(pp.Close_Date,''), @ACC_Close = isnull(pp.ACC_Close,'')
   From Purchase p
   Inner Join Purchase_Project pp on pp.Purchase_Project_No = p.Purchase_Project_No
   Where p.Purchase_No = {Purchase_No};

   if(@Project_Close <> '' or @ACC_Close <> '')
   Begin
      Select @ROWCOUNT as Flag;
      return;
   End

   `, req.body);

   switch(req.body.Mode){
      case 0:
         
         strSQL += format(`

         Insert into @tmpDetail (Purchase_DetailID, Material_ColorID, Qty, Delivery_Date)
         Select pd.Purchase_DetailID, pd.Material_ColorID
         --, Round(isnull(pd.Project_Qty,0) - isnull(pd.Use_Stock_Qty,0), 0) as Qty
         , CEILING(isnull(pd.Project_Qty,0)) - isnull(pd.Use_Stock_Qty,0) as Qty
         , p.Delivery_Date
         From Purchase_Detail pd with(NoLock,NoWait)
         Inner Join Supplier s with(NoLock,NoWait) on s.SupplierID = pd.SupplierID
         Inner Join Material_Color m with(NoLock,NoWait) on pd.Material_ColorID = m.Material_ColorID
         Inner Join Purchase p with(NoLock,NoWait) on p.Purchase_Project_No = pd.Purchase_Project_No And p.SupplierID = pd.SupplierID And p.Currency = pd.Currency   
         Where p.Purchase_No = {Purchase_No}
         And ABS(isnull(pd.Unpurchase,0)) <> 1
         And pd.Transfer_Purchase_DetailID is null
         And pd.Purchase_No is null
         And ABS(isnull(pd.Master_Purchase_Item,0)) <> 1
         And (isnull(pd.Project_Qty,0) - isnull(pd.Use_Stock_Qty,0)) > 0
         And isnull(pd.Stock_In_Qty,0) = 0      
         And m.Price_Approve is not null
         And pd.Close_Date is null
         --And s.History_Date is null
         And pd.Purchase_DetailID IN ('${req.body.Detail.join("','")}');

         Update [dbo].[Purchase_Detail] set Purchase_No = {Purchase_No}
         , Qty = t.Qty
         , Expected_Delivery = t.Delivery_Date
         From Purchase_Detail pd
         Inner Join @tmpDetail t on pd.Purchase_DetailID = t.Purchase_DetailID         
         Where pd.Purchase_No is null
         And pd.Close_Date is null;
         
         Set @ROWCOUNT = @@ROWCOUNT;

         `, req.body);

      break;
      case 1:
         switch(req.body.Name){
            case 'Qty':
               req.body.Value = (req.body.Value != null ? req.body.Value : 0) ;

               strSQL += format(`
               Update [dbo].[Purchase_Detail] Set Qty = case when CEILING(Project_Qty) >= ({Value}) then ({Value}) else CEILING(Project_Qty) end
               --, Use_Stock_Qty = case when (Project_Qty - ({Value})) <= 0  then 0 else Project_Qty - {Value} end 
               , Update_User = N'${req.UserID}'
               , Update_Time = GetDate()
               From Purchase_Detail pd with(NoLock,NoWait)
               Where (pd.Purchase_DetailID = {Purchase_DetailID}) 
               And abs(isnull(pd.Master_Purchase_Item,0)) = 0
               And (Select Count(*) 
                  From Stock_In_Detail sid 
                  Inner Join Stock_In si on si.Stock_In_No = sid.Stock_In_No 
                  where sid.Purchase_DetailID = pd.Purchase_DetailID 
                  And isnull(si.Bill_No,'') != ''
                  ) = 0 
               ; 
     
                  Set @ROWCOUNT = @@ROWCOUNT;
               `, req.body);
      
            break;
            case 'Memo':
               Size = 40
               req.body.Value = (req.body.Value ? `N'${req.body.Value.trim().replace(/'/g, "''")}'` : `''`);

               strSQL += format(`         
                  Update [dbo].[Purchase_Detail] Set [Memo] = substring({Value},1,${Size})
                  where Purchase_DetailID = {Purchase_DetailID};
      
                  Set @ROWCOUNT = @@ROWCOUNT;
               `, req.body);      
            break;            
            default:
               req.body.Value = Size == 0 ? (req.body.Value != null ? req.body.Value : null) : (req.body.Value ? `N'${req.body.Value.trim().replace(/'/g, "''")}'` : `''`);

               strSQL += format(`         
                  Update [dbo].[Purchase_Detail] Set [{Name}] = ${Size == 0 ? 'Round({Value},3)': `substring({Value},1,${Size})`}            
                  where Purchase_DetailID = {Purchase_DetailID};
      
                  Set @ROWCOUNT = @@ROWCOUNT;
               `, req.body);      
            break;               
         }

      break;
      case 2:
         strSQL += format(`

            Insert @tmpDetail(Purchase_DetailID, Material_ColorID, Qty)
            Select {Purchase_DetailID} as Purchase_DetailID, Material_ColorID, isnull(Qty,0) * -1
            From [dbo].[Purchase_Detail] 
            where Purchase_DetailID = {Purchase_DetailID};

            Update [dbo].[Purchase_Detail] Set Purchase_No = null
            , Qty = 0
            --, Use_Stock_Qty = 0
            where Purchase_DetailID = {Purchase_DetailID}
            And Close_Date is null
            And (Select count(*) from Stock_In_Detail si where si.Purchase_DetailID = {Purchase_DetailID}) = 0
            And (Select count(*) from Stock_Out_Detail si where si.Purchase_DetailID = {Purchase_DetailID}) = 0;
                                    
            Set @ROWCOUNT = @@ROWCOUNT;
                        
         `, req.body);
      break;
        
   }

   strSQL += format(`
   Select @ROWCOUNT as Flag;

   Select Purchase_DetailID, Material_ColorID, Qty From @tmpDetail;

   if(@ROWCOUNT > 0)
   Begin 
      Update [dbo].[Purchase] Set UserID = isnull(UserID, N'${req.UserID}')
      , Data_Updater = N'${req.UserID}'
      , Data_Update = GetDate()
      where Purchase_No = {Purchase_No};
   End
   `, req.body);
   //console.log(strSQL)
   req.body.Flag = false;
   db.sql(req.SiteDB, strSQL)
      .then((result) => {
         //console.log(result.recordsets[0])
         //res.send({Flag:result.recordsets[0][0].Flag > 0});
         req.body.Flag = result.recordsets[0][0].Flag > 0
         req.body.Purchase_Detail =  result.recordsets[1]
         next();
      }).catch((err) => {
         console.log(err);
         next();
      })

},  function (req, res, next) {
   //console.log("Call Purchase_Order_Detail_Maintain Api:",req.body);

   // req.body.Mode === 0 表示新增
   // req.body.Mode === 1 表示修改
   // req.body.Mode === 2 表示刪除 

   var strSQL = `Declare @ROWCOUNT int=0; 
   Declare @tmpDetail Table (Purchase_DetailID Int, Material_ColorID Int, Qty float); `;

   req.body.Purchase_Detail.forEach((item)=>{
      strSQL += format(` Insert into @tmpDetail (Material_ColorID, Qty) values ({Material_ColorID}, {Qty}); `,item)
   })

   switch(req.body.Mode){
      case 0:
      case 2:         
         strSQL += format(`
         Update [dbo].[Material_Color] set Order_Qty = isnull(Order_Qty,0) + isnull(t.Qty,0)
         , Date = GetDate()
         From [dbo].[Material_Color] mc      
         Inner Join (Select Material_ColorID, sum(Qty) as Qty From @tmpDetail Group by Material_ColorID) t on mc.Material_ColorID = t.Material_ColorID;
            
         Set @ROWCOUNT = @@ROWCOUNT;
         `, req.body);

      break;
      case 1:         
         strSQL += format(`         
            Select 1
            Set @ROWCOUNT = @@ROWCOUNT;
         `, req.body);
      break;        
   }

   //console.log(strSQL)
   db.sql(req.Enterprise, strSQL)
      .then((result) => {
         //console.log(result.recordsets[0])
         res.send({Flag:req.body.Flag});         
      }).catch((err) => {
         console.log(err);
         res.status(500).send(err);
      })
});

//Get Purchase Order Detail Add List
router.post('/Purchase_Order_Detail_Add_List',  function (req, res, next) {
   console.log("Call Purchase_Order_Detail_Add_List Api:",req.body);  
    
   req.body.Purchase_No = req.body.Purchase_No ? req.body.Purchase_No : null;
   req.body.Purchase_DetailID = req.body.Purchase_DetailID ? req.body.Purchase_DetailID : `''`;
   req.body.Material = req.body.Material ? `N'${req.body.Material.trim().replace(/'/g, '')}'` : `''`;
   req.body.Remark = req.body.Remark ? `N'${req.body.Remark.trim().replace(/'/g, '')}'` : `''`;
   req.body.Memo = req.body.Memo ? `N'${req.body.Memo.trim().replace(/'/g, '')}'` : `''`;
      
   var strSQL = format(`   
   Select cast(0 as bit) as flag, '' as Query
   , pd.Purchase_DetailID
   , pd.Master_Purchase_Item
   , pd.Sub_Purchase_Item
   , pd.Material_ColorID
   , pd.Material_Category
   , pd.Material_Specific
   , pd.Material_Color
   , isnull(pd.Material_Category,'') +' '+ isnull(pd.Material_Specific,'') + ' ' + isnull(pd.Material_Color,'') as Material
   , pd.M_Rmk
   , pd.Unit
   , isnull(pd.Project_Qty,0) as Project_Qty
   , isnull(pd.Qty,0) as Qty
   , pd.Currency
   , isnull(pd.Unit_Price,0) as Unit_Price      
   , pd.Memo
   From Purchase_Detail pd with(NoLock,NoWait)
   Inner Join Supplier s with(NoLock,NoWait) on s.SupplierID = pd.SupplierID
   Inner Join Material_Color m with(NoLock,NoWait) on pd.Material_ColorID = m.Material_ColorID
   Inner Join Purchase p with(NoLock,NoWait) on p.Purchase_Project_No = pd.Purchase_Project_No And p.SupplierID = pd.SupplierID And p.Currency = pd.Currency   
   Where p.Purchase_No = {Purchase_No}
   And ABS(isnull(pd.Unpurchase,0)) <> 1
   And pd.Transfer_Purchase_DetailID is null
   And pd.Purchase_No is null   
   And ABS(isnull(pd.Master_Purchase_Item,0)) <> 1
   And (isnull(pd.Project_Qty,0) - isnull(pd.Use_Stock_Qty,0)) > 0
   And isnull(pd.Stock_In_Qty,0) = 0
   And m.Price_Approve is not null
   And pd.Close_Date is null
   And s.History_Date is null
   And ({Purchase_DetailID} = '' or pd.Purchase_DetailID = {Purchase_DetailID})
   And ({Material} = '' or isnull( charindex({Material} , (isnull(pd.Material_Category,'') +' '+ isnull(pd.Material_Specific,'') + ' ' + isnull(pd.Material_Color,'')) ) ,0) > 0) 
   And ({Remark} = '' or isnull( charindex({Remark} , isnull(pd.M_Rmk,'')) ,0) > 0) 
   And ({Memo} = '' or isnull( charindex({Memo} , isnull(pd.Memo,'')) ,0) > 0) ;
   `, req.body) ;
   //console.log(strSQL)
   db.sql(req.SiteDB, strSQL)
      .then((result) => {
         var DataSet = {Detail_Add_List: result.recordsets[0]};
         //console.log(DataSet)
         res.send(DataSet);
      }).catch((err) => {
         console.log(err);
         res.status(500).send(err);
      })
});

//Get Material's Price Info
router.post('/Material_Price_Info',  function (req, res, next) {
   console.log("Call Material_Price_Info Api:",req.body);

   // req.body.Mode === 0 表示 Material_Color Price Info
   // req.body.Mode === 1 表示 Purchase_Detail Price Info
   // req.body.Mode === 2 表示 Product_structure Price Info

   req.body.Mode = req.body.Mode ? req.body.Mode : 0;   
   req.body.Material_ColorID = req.body.Material_ColorID != null ? req.body.Material_ColorID : null; 
   req.body.Purchase_DetailID = req.body.Purchase_DetailID != null ? req.body.Purchase_DetailID : null; 
   req.body.StructureID = req.body.StructureID != null ? req.body.StructureID : null; 
 
   var strSQL = format(`
   Declare @Mode int = {Mode};
 
   if(@Mode = 0 )
   Begin
      SELECT [Material_ColorID]
      , [SupplierID]
      , [Currency]
      , [Unit_Price] as Unit_Price_Src
      , [Unit_Price]
      , [Purchase_Price]
      , [Purchase_Price] as Purchase_Price_Src
      , Remark
      , Update_User
      , case when mc.Update_Date is null then '' else convert(varchar(10), mc.Update_Date, 111) End as Update_Date
      , case when mc.Date is null then '' else convert(varchar(10), mc.Date, 111) End as Access_Date 
      , Price_Approve
      , Cast(Case when isnull(mc.Composite,0) = 0 then 1 else 0 end as bit) as Material_Price_Update_Flag
      FROM [Material_Color] mc with(NoLock, NoWait)
      Where Material_ColorID = {Material_ColorID}
   End
   if(@Mode = 1 )
   Begin
      Declare @Bill_No_Count int = ( Select count(*) From Stock_In si Inner Join (Select distinct Stock_In_No From Stock_In_Detail sid Where sid.Purchase_DetailID = {Purchase_DetailID}) tmp on tmp.Stock_In_No = si.Stock_In_No Where isnull(si.Bill_No,'') <> '')
      --, @MPI_No_Count int = ( Select count(*) From Stock_Out so Inner Join (Select distinct Stock_Out_No From Stock_Out_Detail sid Where sid.Purchase_DetailID = {Purchase_DetailID}) tmp on tmp.Stock_Out_No = so.Stock_Out_No Where isnull(so.MPI_No,'') <> '')
      , @MPI_No_Count int = 0
      , @PP_ACC_Amount float = isnull((Select sum(p.[PP_ACC_Amount]) From [PP_ACC_Amount] p Inner Join Stock_Out_Detail sod on p.Stock_Out_No = sod.Stock_Out_No And sod.Purchase_DetailID = {Purchase_DetailID}),0)
      --, @PP_ACC_Amount int = 0

      SELECT [Material_ColorID]
      , {Purchase_DetailID} as Purchase_DetailID
      , pd.[SupplierID]
      , s.[Payment_Terms]
      , s.[Sample_Discount]
      , iif(s.[Payment_Terms] is null and s.[Sample_Discount] is null , '', '(' + isnull(s.[Payment_Terms],'') + ' ' + isnull(cast(s.[Sample_Discount] as nvarchar),'') + ')' ) as Payment_Terms_Info
      , [Currency]
      , [Quot_Price]
      , [Quot_Price] as Quot_Price_Src
      , [Unit_Price]
      , [Unit_Price] as Unit_Price_Src
      , @Bill_No_Count as Bill_No_Count
      , @MPI_No_Count as MPI_No_Count
      , @PP_ACC_Amount as PP_ACC_Amount
      , cast((case when @Bill_No_Count = 0 
          And @MPI_No_Count = 0
          And @PP_ACC_Amount = 0 
          then 1 else 0 end) as bit) as Target_Update_Flag
       FROM [Purchase_Detail] pd with(NoLock, NoWait)
      Left Outer Join Supplier s with(NoLock, NoWait) on s.SupplierID = pd.SupplierID
      Where pd.Purchase_DetailID = {Purchase_DetailID}
   End
   if(@Mode = 2 )
   Begin
      SELECT [Material_ColorID]
      , {StructureID} as StructureID
      , [SupplierID]
      , [Currency]
      , [Quot_Price]
      , [Quot_Price] as Quot_Price_Src
      , [Unit_Price]
      , [Unit_Price] as Unit_Price_Src
      FROM [Product_Structure] ps with(NoLock, NoWait)
      Where ps.StructureID = {StructureID}
   End   
    `, req.body) ;
   //console.log(strSQL)
   
    db.sql(req.SiteDB, strSQL)
       .then((result) => {
         res.send(result.recordsets[0]);
       }).catch((err) => {
          console.log(err);
          res.status(500).send(err);
       })
 });
 
 //Maintain Material Price
 router.post('/Material_Price_Maintain', async function ( req, res, next) {
   console.log("Call Material_Price_Maintain Api:",req.body);
   
   // req.body.Mode === 0 表示修改 Material_Color   
   // req.body.Mode === 1 表示對Purchase_Detail, Stock_In_Date, Stock_Out_Date 修改材料採購價

   var Size = 0;
   req.body.Mode = req.body.Mode ? req.body.Mode : 0;
   req.body.Material_ColorID = req.body.Material_ColorID != null ? req.body.Material_ColorID : null;
   req.body.Purchase_DetailID = req.body.Purchase_DetailID != null ? req.body.Purchase_DetailID : null;
   req.body.StructureID = req.body.StructureID != null ? req.body.StructureID : null;
   req.body.Unit_Price = req.body.Unit_Price != null ? req.body.Unit_Price : null;
   req.body.Purchase_Price = req.body.Purchase_Price != null ? req.body.Purchase_Price : null;
   req.body.Remark = req.body.Remark != null ? `N'${req.body.Remark.trim().substring(0,50).replace(/'/g, '')}'` : `''`;
       
      var strSQL = format(`Declare @Material_ColorID int = {Material_ColorID} , @Purchase_DetailID int = {Purchase_DetailID} 
   , @StructureID int = {StructureID}, @Unit_Price float = {Unit_Price}, @Purchase_Price float = {Purchase_Price};
   Declare @ROWCOUNT int = 0, @ROWCOUNT1 int = 0, @ROWCOUNT2 int = 0;
   `, req.body);

   var DataSet = {Flag: false};
   var Flag = 0;
   var Message = '';

   switch( req.body.Mode){
      case 0:
         req.body.Value = Size == 0 ? (req.body.Value != null ? req.body.Value : null) : (req.body.Value ? `N'${req.body.Value.trim().replace(/'/g, "''")}'` : `''`);
 
         strSQL += format(`
            Update [dbo].[Material_Color] Set Remark = case when len({Remark}) > 0 then substring({Remark},1,50) else {Remark} End       
            , Unit_Price = {Unit_Price} 
            , Purchase_Price = case when {Unit_Price} >= {Purchase_Price} then {Purchase_Price} else {Unit_Price} end
            where Material_ColorID = @Material_ColorID
            --And ({Unit_Price} > 0);
 
            Set @ROWCOUNT = @@ROWCOUNT;
            
            Select @ROWCOUNT as Flag            
         `, req.body);

         //console.log(strSQL)

         await db.sql(req.Enterprise, strSQL)
         .then((result) => {
            //console.log(result.recordsets)
            Flag = result.recordsets[0][0].Flag;
            DataSet.Flag = result.recordsets[0][0].Flag > 0;
         }).catch((err) => {
            Message = err
            console.log(err);
         })

      break;
      case 1:
         strSQL += format(`
         Declare @Bill_No_Count int = (Select count(si.Bill_No) From Stock_In si Inner Join Stock_In_Detail sid on si.Stock_In_No = sid.Stock_In_No And sid.Purchase_DetailID = {Purchase_DetailID} And isnull(si.Bill_No,'') != '')
         --, @MPI_No_Count int = ( Select count(*) From Stock_Out so Inner Join (Select distinct Stock_Out_No From Stock_Out_Detail sid Where sid.Purchase_DetailID = {Purchase_DetailID}) tmp on tmp.Stock_Out_No = so.Stock_Out_No Where isnull(so.MPI_No,'') <> '')
         , @MPI_No_Count int = 0
         , @PP_ACC_Amount float = (Select count(*) From [PP_ACC_Amount] p Inner Join Stock_Out_Detail sod on p.Stock_Out_No = sod.Stock_Out_No And sod.Purchase_DetailID = {Purchase_DetailID} And p.[PP_ACC_Amount] > 0)
         --, @PP_ACC_Amount int = 0

         if(@Bill_No_Count > 0 or @MPI_No_Count > 0 or  @PP_ACC_Amount > 0)
         Begin
            Select @ROWCOUNT + @ROWCOUNT1 + @ROWCOUNT2 as Flag
            return
         End
   
         --set @Unit_Price = isnull((Select Purchase_Price From Material_Color mc Where mc.Material_ColorID = {Material_ColorID}),0)
         Declare @Purchase_Project_No varchar(15), @Master_Purchase_DetailID int, @Master_Material_ColorID int, @Sub_Purchase_item int, @Apply_Date Date

         Select @Purchase_Project_No = Purchase_Project_No
         , @Master_Purchase_DetailID = Master_Purchase_DetailID
         , @Sub_Purchase_item = Sub_Purchase_item 
         , @Master_Material_ColorID = (Select Material_ColorID From Purchase_Detail t Where t.Purchase_DetailID = pd.Master_Purchase_DetailID)
         From Purchase_Detail pd with(NoLock,NoWait)
         Where pd.Purchase_DetailID = {Purchase_DetailID};

         Select @Apply_Date = Apply_Date 
         From Purchase_Project pp with(NoLock,NoWait) 
         Where pp.Purchase_Project_No = @Purchase_Project_No;

         BEGIN TRANSACTION;
         BEGIN TRY
            Update Purchase_detail set Unit_Price = @Unit_Price
            Where Purchase_DetailID = {Purchase_DetailID};

            Set @ROWCOUNT = @@ROWCOUNT;

            if(@ROWCOUNT > 0 And @Sub_Purchase_item = 1)
            Begin

               Update Purchase_Detail set Unit_Price = Round(isnull(tmp.Unit_Price,0) / isnull(CR.Currency_Rate,1),2)               
               From Purchase_Detail sd               
               Inner Join (
                  Select @Master_Purchase_DetailID as Purchase_DetailID
                  , sum(pd.Unit_Price * isnull(b.Currency_Rate,1) * MCS.Net_Consist) as Unit_Price
                  From Purchase_Detail pd with(NoLock,NoWait)
                  Inner Join Material_Composite MCS on mcs.Master_ColorID = @Master_Material_ColorID And pd.Material_ColorID = MCS.Detail_ColorID
                  left Outer Join [@Currency_Rate] b on pd.Currency = b.Currency and b.Exchange_Date = convert(Date,@Apply_Date)
                  Where pd.Master_Purchase_DetailID = @Master_Purchase_DetailID
                  And Purchase_DetailID <> @Master_Purchase_DetailID
               ) tmp on sd.Purchase_DetailID = tmp.Purchase_DetailID 
               left Outer Join [@Currency_Rate] CR on sd.Currency = CR.Currency and CR.Exchange_Date = convert(Date,@Apply_Date)
      
            End

            Update Stock_In_detail set Unit_Price = @Unit_Price
            Where Purchase_DetailID = {Purchase_DetailID};

            Set @ROWCOUNT1 = @@ROWCOUNT;
            
            Update Stock_Out_detail set Unit_Cost = @Unit_Price
            Where Purchase_DetailID = {Purchase_DetailID}
            --AND (isnull(Stock_Out_Detail.Unit_Cost,0) <> 0 )
            ;

            Set @ROWCOUNT2 = @@ROWCOUNT;
            
            Select @ROWCOUNT + @ROWCOUNT1 + @ROWCOUNT2 as Flag
            COMMIT;
         END TRY
         BEGIN CATCH
            Select @ROWCOUNT + @ROWCOUNT1 + @ROWCOUNT2 as Flag
            ROLLBACK;
         END CATCH

         `, req.body);

         //console.log(strSQL)
         await db.sql(req.SiteDB, strSQL)
         .then((result) => {
            //console.log(result.recordsets)
            Flag = result.recordsets[0][0].Flag;
            DataSet.Flag = result.recordsets[0][0].Flag > 0;
         }).catch((err) => {
            Message = err
            console.log(err);
         })
       
      break;
   }
 
  strSQL = format(`
   if(${Flag} > 0)
   Begin
      Update [dbo].[Material_Color] Set Update_User = N'${req.UserID}'
      , Update_Date = GetDate()
      ${req.body.Mode != 0 ? ', Date = GetDate() ': '' }
      where Material_ColorID = {Material_ColorID};
   End
   `, req.body);
   //console.log(strSQL)  
   
   await db.sql(req.Enterprise, strSQL)
      .then((result) => {         
         res.send(DataSet);
      }).catch((err) => {
         console.log(err);
         res.status(500).send(err);
      })
      
 });

//Get Purchase Project Material_Lack_List
router.post('/Purchase_Project_Material_Lack_List',  function (req, res, next) {
   console.log("Call Purchase_Project_Material_Lack_List-1 Api:",req.body);

   req.body.Purchase_Project_No = req.body.Purchase_Project_No ? `N'${req.body.Purchase_Project_No.trim().substring(0,15).replace(/'/g, '')}'` : `''`;
   req.body.Produce = [];
   req.body.Purchase_Detail = [];
   req.body.Produce_Detail = [];
   
   var strSQL = format(`Declare @Purchase_Project_No varchar(15) = {Purchase_Project_No};

   -- 0 Produce
   Select p.Produce_No, p.Product_No
   From Produce p 
   Where p.Purchase_Project_No = @Purchase_Project_No;
   
   -- 1 Purchase_Detail
   Select Purchase_DetailID, Material_Category, Material_Specific, Material_Color, Material_DetailID
   , MaterialID, Material_ColorID , Unit , M_Rmk, SupplierID
   , Orig_Price, Unit_Price
   From Purchase_Detail pd with(NoWait,NoLock)
   Where pd.Purchase_Project_No = @Purchase_Project_No;

   -- 2 Produce_Detail 
   SELECT pd.Produce_DetailID, pd.ComponentID, pd.Produce_No, pd.C_Rmk, pd.Material_Category, pd.Material_Specific, pd.Material_Color, pd.M_Rmk, pd.Size_From, pd.Size_End, pd.Unit
   , pd.Material_DetailID, pd.Material_ColorID, pd.MaterialID
   FROM Produce p with(NoLock,NoWait)
   Inner JOIN Produce_Detail pd with(NoLock,NoWait) ON p.Produce_No = pd.Produce_No     
   Where p.Purchase_Project_No = @Purchase_Project_No ;

   `, req.body);

   //console.log(strSQL)
   req.body.Flag = false;
   db.sql(req.SiteDB, strSQL)
      .then((result) => {
         //console.log(result.recordsets[0])
         //res.send({Flag:result.recordsets[0][0].Flag > 0});         
         req.body.Produce =  result.recordsets[0]
         req.body.Purchase_Detail =  result.recordsets[1]
         req.body.Produce_Detail = result.recordsets[2]
         next();
      }).catch((err) => {
         console.log(err);
         next();
      })

}, function (req, res, next) {
   console.log("Call Purchase_Project_Material_Lack_List-2 Api:");


   var strSQL = format(`Declare @Purchase_Project_No varchar(15) = {Purchase_Project_No};
   Declare @TmpTable table(Produce_No varchar(20), Product_No varchar(20));

   Declare @Purchase_Detail table(Purchase_DetailID int
   , Material_Category nvarchar(35), Material_Specific nvarchar(100), Material_Color nvarchar(70)
   , Material_DetailID int, MaterialID int, Material_ColorID int
   , Unit varchar(10), M_Rmk nvarchar(40), SupplierID nvarchar(15), Orig_Price float, Unit_Price float);

   Declare @Produce_Detail table(
      Produce_DetailID int, ComponentID int, Produce_No varchar(20), C_Rmk nvarchar(16), Material_Category nvarchar(35), Material_Specific nvarchar(100)
      , Material_Color nvarchar(70), M_Rmk nvarchar(40), Size_From real, Size_End real, Unit varchar(10) 
      , Material_DetailID int, Material_ColorID int, MaterialID int);
   `, req.body);

   req.body.Produce.forEach((item)=>{
      strSQL += format(` Insert into @TmpTable (Produce_No, Product_No) values (N'{Produce_No}', N'{Product_No}'); `,item)
   })

   req.body.Purchase_Detail.forEach((item)=>{
      strSQL += format(` Insert into @Purchase_Detail (
           Purchase_DetailID, Material_Category, Material_Specific, Material_Color, Material_DetailID
         , MaterialID, Material_ColorID, Unit, M_Rmk, SupplierID
         , Orig_Price, Unit_Price
         ) values (
           {Purchase_DetailID}, N'{Material_Category}', N'{Material_Specific}', N'{Material_Color}', {Material_DetailID}
         , {MaterialID}, {Material_ColorID}, N'{Unit}', N'{M_Rmk}', N'{SupplierID}'
         , {Orig_Price}, {Unit_Price}
         ); `,item)
   })

   req.body.Produce_Detail.forEach((item)=>{
      strSQL += format(` Insert into @Produce_Detail (
         Produce_DetailID, ComponentID, Produce_No, C_Rmk, Material_Category, Material_Specific
         , Material_Color, M_Rmk, Size_From, Size_End, Unit
         , Material_DetailID, Material_ColorID, MaterialID
         ) values (
           {Produce_DetailID}, {ComponentID}, N'{Produce_No}', N'{C_Rmk}', N'{Material_Category}', N'{Material_Specific}'
           , N'{Material_Color}', N'{M_Rmk}', {Size_From}, {Size_End}, N'{Unit}'
           , {Material_DetailID}, {Material_ColorID}, {MaterialID}
         ); `,item)
   })
   
   strSQL += format(`
   
   -- 0 Product Structure Material Lack
   SELECT  @Purchase_Project_No as Purchase_Project_No, ps.StructureID, Produce.Produce_No, pc.Component, ps.C_Rmk
   , ps.Material_Category + ' ' + ps.Material_Specific + ' ' + ps.Material_Color AS Material
   , (Select Size_Name From Product_Size s with(NoLock,NoWait) where s.SizeID = ps.Size_From) as Size_From
   , (Select Size_Name From Product_Size s with(NoLock,NoWait) where s.SizeID = ps.Size_End) as Size_End
   , Produce.Product_No
   --, mc.Material_ColorID
   , ps.Material_ColorID
   FROM (Material_Detail md with(NoLock,NoWait)
   RIGHT JOIN ( @TmpTable as Produce INNER JOIN (Material_Color mc with(NoLock,NoWait) RIGHT JOIN (Product_Component pc with(NoLock,NoWait) INNER JOIN Product_Structure ps with(NoLock,NoWait) ON pc.ComponentID = ps.ComponentID) ON mc.Material_ColorID = ps.Material_ColorID) ON Produce.Product_No = ps.Product_No) ON md.Material_DetailID = mc.Material_DetailID) LEFT JOIN Material m with(NoLock,NoWait) ON md.MaterialID = m.MaterialID
   Inner Join @Purchase_Detail p on ps.Material_ColorID = p.Material_ColorID
   WHERE (ps.Material_DetailID <> mc.[Material_DetailID])
   OR (ps.MaterialID <> md.[MaterialID])
   OR (mc.Material_ColorID Is Null)
   --OR (((ps.[Material_Category] + ' ' + ps.[Material_Specific] + ' ' + ps.[Material_Color])<>m.[Material_Category] + ' ' + md.[Material_Specific] + ' ' + mc.[Material_Color]))
   ORDER BY Produce.Produce_No, pc.Component, ps.C_Rmk, ps.Material_Category + ' ' + ps.Material_Specific + ' ' + ps.Material_Color, ps.Size_From;
   
   -- 1 Produce_Detail Material Lack
   SELECT pd.Produce_DetailID, @Purchase_Project_No as Purchase_Project_No, pd.Produce_No, pc.Component, pd.C_Rmk, m.Unit AS M_Unit
   , pd.Material_Category + ' ' + pd.Material_Specific + ' ' + pd.Material_Color + ' ' + pd.M_Rmk AS Material
   , pd.Size_From, pd.Size_End, Produce.Product_No, pd.Unit   
   , iif(mc.Material_ColorID = pd.Material_ColorID, mc.Material_ColorID, cast(mc.Material_ColorID as varchar) + '(' + cast(pd.Material_ColorID as varchar) + ')' ) as Material_ColorID   
   , IIf((m.[History_Date]) Is Not Null Or (md.[History_Date]) Is Not Null,-1,0) AS History
   FROM Product_Component pc with(NoLock,NoWait)
   Inner JOIN @Produce_Detail pd ON pc.ComponentID = pd.ComponentID 
   INNER JOIN @TmpTable as Produce on Produce.Produce_No = pd.Produce_No
   LEFT JOIN Material_Color mc with(NoLock,NoWait) ON pd.Material_ColorID = mc.Material_ColorID 
   LEFT JOIN Material_Detail md with(NoLock,NoWait) ON mc.Material_DetailID = md.Material_DetailID 
   LEFT JOIN Material m with(NoLock,NoWait) on md.MaterialID = m.MaterialID
   WHERE (pd.Material_DetailID <> mc.Material_DetailID) 
   OR (pd.MaterialID <> md.[MaterialID]) 
   OR (mc.Material_ColorID Is Null) 
   --OR ((pd.[Material_Category] + ' ' + pd.[Material_Specific] + ' ' + pd.[Material_Color]) <> (m.[Material_Category] + ' ' + md.[Material_Specific] + ' ' + mc.[Material_Color]) ) 
   OR (pd.Unit <> m.[Unit]) 
   OR (IIf(m.[History_Date] Is Not Null Or md.[History_Date] Is Not Null, -1, 0) = -1)
   ORDER BY pd.Produce_No, pc.Component, pd.C_Rmk, pd.Material_Category + ' ' + pd.Material_Specific + ' ' + pd.Material_Color + ' ' + pd.M_Rmk, pd.Size_From;
   
   -- 2 Purchase_Detail Material Lack
   SELECT pd.Purchase_DetailID, @Purchase_Project_No as Purchase_Project_No, pd.Material_Category + ' ' + pd.Material_Specific + ' ' + pd.Material_Color AS Material, pd.Unit, m.Unit AS Material_Unit, md.MaterialID, mc.Material_DetailID, pd.Material_ColorID, pd.M_Rmk, pd.SupplierID, pd.Orig_Price, pd.Unit_Price, IIf((m.[History_Date]) Is Not Null Or (md.[History_Date]) Is Not Null,-1,0) AS History
   FROM ((Material_Color mc with(NoLock,NoWait) RIGHT JOIN @Purchase_Detail pd ON mc.Material_ColorID = pd.Material_ColorID) LEFT JOIN Material_Detail md with(NoLock,NoWait) ON mc.Material_DetailID = md.Material_DetailID) LEFT JOIN Material m with(NoLock,NoWait) ON md.MaterialID = m.MaterialID
   WHERE (pd.Material_DetailID <> mc.[Material_DetailID]) 
   OR (pd.MaterialID <> md.[MaterialID]) 
   OR (mc.Material_ColorID Is Null)
   --OR (((pd.[Material_Category] + ' ' + pd.[Material_Specific] + ' ' + pd.[Material_Color] + ' ' + pd.[Unit])<>m.[Material_Category] + ' ' + md.[Material_Specific] + ' ' + mc.[Material_Color] + ' ' + m.[Unit])) 
   OR (pd.Unit <> m.[Unit]) 
   OR (((IIf((m.[History_Date]) Is Not Null Or (md.[History_Date]) Is Not Null,-1,0))=-1))
   ORDER BY pd.Material_Category + ' ' + pd.Material_Specific + ' ' + pd.Material_Color;

   -- 3 Purchase_Detail Material NonApprove
   SELECT pd.Purchase_DetailID
   , pd.Material_ColorID
   , pd.Material_Category + ' ' + pd.Material_Specific + ' ' + pd.Material_Color AS Material
   , pd.Unit
   , pd.SupplierID
   FROM @Purchase_Detail pd 
   Inner Join Material_Color mc with(NoLock,NoWait) On mc.Material_ColorID = pd.Material_ColorID
   Where isnull(mc.Price_Approve,'') = ''

   `, req.body) ;
   //console.log(strSQL)
   db.sql(req.Enterprise, strSQL)
      .then((result) => {
         var DataSet = {Structure_Material_Lack_Info: result.recordsets[0]
            , Produce_Material_Lack_Info: result.recordsets[1]
            , Purchase_Material_Lack_Info: result.recordsets[2]
            , Material_NonApprove_Info: result.recordsets[3]
         };
 
         res.send(DataSet);
      }).catch((err) => {
         console.log(err);
         res.status(500).send(err);
      })
});

//Get Produce Material Request
router.post('/Produce_Material_Request_Info',  function (req, res, next) {
   console.log("Call Produce_Material_Request_Info Api:");
   
   req.body.Produce_No = req.body.Produce_No ? `N'${req.body.Produce_No.trim().substring(0,20).replace(/'/g, '')}'` : `''`;
   req.body.QueryData = req.body.QueryData ? `N'${req.body.QueryData}'` : `''`;  

   var strSQL = format(`Declare @Produce_No nvarchar(20) = {Produce_No}
  , @Product_No varchar(25)
  , @Purchase_Project_No varchar(20)
  , @Order_Qty float
  , @Produce_Qty float
  , @Currency varchar(10)
  , @Currency_Rate float
  , @Apply_Date varchar(10)
   
   Select @Product_No = p.Product_No
   , @Purchase_Project_No = p.Purchase_Project_No
   , @Order_Qty = p.Order_Qty
   , @Produce_Qty = p.Qty
   , @Currency = case when p.Produce_Purpose = 'Order' then o.PO_Currency else s.Currency End 
   , @Currency_Rate = isnull(cr.Currency_Rate,0) 
   , @Apply_Date = convert(varchar(10), pp.Apply_Date, 120)
   From Produce p with(NoLock, NoWait)
   Left Outer Join Purchase_Project pp with(NoLock,NoWait) on pp.Purchase_Project_No = p.Purchase_Project_No
   Left Outer Join Order_Detail od with(NoLock,NoWait) on od.Produce_No = p.Produce_No
   Left Outer Join Orders o with(NoLock,NoWait) on o.Order_No = od.Order_No
   Left Outer Join Sample_Detail sd with(NoLock,NoWait) on sd.Produce_No = p.Produce_No
   Left Outer Join Samples s with(NoLock,NoWait) on s.ProduceID = sd.ProduceID
   Left Outer Join [@Currency_Rate] cr on cr.Currency = (case when p.Produce_Purpose = 'Order' then o.PO_Currency else s.Currency End) 
      And cast(cr.Exchange_Date as Date) = cast(pp.Apply_Date as Date)
   Where p.Produce_No = @Produce_No
   
   -- 0 Head Info
   Select @Produce_No as Produce_No
   , @Product_No as Product_No
   , @Purchase_Project_No as Purchase_Project_No
   , @Order_Qty as Order_Qty
   , @Produce_Qty as Produce_Qty
   , @Currency as Currency
   , @Currency_Rate as Currency_Rate
   , @Apply_Date as Apply_Date
   , (Select Photo_Month From Product p where p.Product_No = @Product_No) as Photo_Month

   -- 1 Detail Info
   Select 1 as Flag
   , ABS(isnull(pd.Master_Purchase_Item,0)) as Master_Purchase_Item
   , case when abs(isnull(pd.Master_Purchase_Item,0)) = 1 then 'Master_Material'
   else 
      case when abs(isnull(pd.Master_Purchase_Item,0)) = 0 and abs(isnull(pd.Sub_Purchase_Item,0)) = 1 then 'Sub_Material' 
      else 
         ''
      End
   end as Material_Type
   , pc.Component
   , cast(pd.Material_ColorID as varchar) + ' ' + isnull(pd.Material_Category,'') + ' ' + isnull(pd.Material_Specific,'') + ' ' + isnull(pd.Material_Color,'')  as Material
   , (Select RTRIM(ps.Size_Name) From Product_Size ps with(NoLock,NoWait) Where ps.SizeID = pd.Size_From) as Size_Fit_From
   , (Select RTRIM(ps.Size_Name) From Product_Size ps with(NoLock,NoWait) Where ps.SizeID = pd.Size_End) as Size_Fit_End
   , pd.T_Qty
   , pd.Net_Consist
   , isnull(pd.Lose,0) * 100 as Lose
   , pd.T_Net_Qty
   , pd.Unit
   , pd.SupplierID
   , pd.Currency
   , pd.Quot_Price
   , isnull(pd.Quot_Price,0) * isnull(pd.T_Net_Qty,0) as M_Amount
   , isnull(pd.Quot_Price,0) * isnull(pd.T_Net_Qty,0) * isnull(cr.Currency_Rate,0) as M_Amount_TWD
   , pd.Unit_Price
   , isnull(pd.Unit_Price,0) * isnull(pd.T_Net_Qty,0) as U_Amount
   , isnull(pd.Unit_Price,0) * isnull(pd.T_Net_Qty,0) * isnull(cr.Currency_Rate,0) as U_Amount_TWD
   From Produce_Detail pd with(NoLock, NoWait) 
   Inner Join Product_Component pc with(NoLock, NoWait) on pc.ComponentID = pd.ComponentID
   Left Outer Join [@Currency_Rate] cr on cr.Currency = pd.Currency
   And convert(varchar(10), cr.Exchange_Date, 120) = @Apply_Date
   Where pd.Produce_No = @Produce_No 
   And ({QueryData} = '' or charindex({QueryData}, ( isnull(pc.Component,'') + ' ' + cast(pd.Material_ColorID as varchar) + ' ' + isnull(pd.Material_Category,'') +' '+ isnull(pd.Material_Specific,'') + ' ' + isnull(pd.Material_Color,'')  + ' ' + isnull(pd.Unit,'') + ' ' + isnull(pd.SupplierID,'') + ' ' + isnull(pd.Currency,'') ) ,0) > 0) 
   Order by pc.ComponentID, pd.Master_StructureID, pd.Master_Purchase_Item

   `, req.body) ;
   //console.log(strSQL)
   db.sql(req.SiteDB, strSQL)
      .then((result) => {
         var DataSet = { Head_Info: result.recordsets[0]
            , Detail_Info: result.recordsets[1]
            , Order_Qty: result.recordsets[0] ? result.recordsets[0][0].Order_Qty : 0
            , Currency: result.recordsets[0] ? result.recordsets[0][0].Currency : 0
            , Currency_Rate: result.recordsets[0] ? result.recordsets[0][0].Currency_Rate : 0
            , Product_No: result.recordsets[0] ? result.recordsets[0][0].Product_No : 0
            , Produce_Qty: result.recordsets[0] ? result.recordsets[0][0].Produce_Qty : 0
            , Per_M_Price: 0
            , Per_U_Price: 0
            , Total_M_Amount: 0
            , Total_U_Amount: 0
         };
 
         DataSet.Detail_Info.forEach((item)=>{
            DataSet.Total_M_Amount += DataSet.Currency_Rate > 0 ? item.M_Amount_TWD / DataSet.Currency_Rate : 0
            DataSet.Total_U_Amount += DataSet.Currency_Rate > 0 ? item.U_Amount_TWD / DataSet.Currency_Rate : 0
         })

         DataSet.Per_M_Price = DataSet.Order_Qty > 0 ? DataSet.Total_M_Amount / DataSet.Order_Qty : 0;
         DataSet.Per_U_Price = DataSet.Order_Qty > 0 ? DataSet.Total_U_Amount / DataSet.Order_Qty : 0;

         res.send(DataSet);
      }).catch((err) => {
         console.log(err);
         res.status(500).send(err);
      })
});
 

 module.exports = router;