var express = require('express');
var router = express.Router();
const format = require('string-format');
var db = require('../../config/DB_Connect');


/* Mark-Wang API Begin */

var strSQL_Updater = ` Update Quotation set UserID = isnull(UserID,'{0}'), Data_Update = GetDate(), Data_Updater = '{0}' Where Quotation_No = '{1}';  `

//Get Currency
router.post('/Load_Currency', function (req, res, next) {
   console.log("Call Currency Api :", req.body);
   req.body.Quotation_No = req.body.Search ? req.body.Quotation_No.replace(/'/g, "''") : '';
   var strSQL = format(`
   Declare @Currency_Date DateTime;

   Select @Currency_Date = case when '{Quotation_No}' = 'Insert' then GetDate() else isnull((Select [Date] from Quotation Where Quotation_No = '{Quotation_No}'),GetDate()) end
   
   SELECT p.[Currency]
   , (isnull(p.[Currency],'') + ' ' + isnull(cast(Currency_Rate as varchar),'')) as Currency_Rate
   , isnull(Currency_Rate,0) as Rate
     FROM Currency as p with(NoLock, NoWait)
   inner Join [dbo].[@Currency_Rate] c on c.Currency = p.Currency And c.Exchange_Date = convert(Date, @Currency_Date)
    `
   , req.body );
   // console.log(strSQL)  

   db.sql(req.SiteDB, strSQL)
      .then((result) => {
         res.send(result.recordset);
      }).catch((err) => {
         console.log(err);
         res.status(500).send(err);
      })

});


//取得Product資料
router.post('/Product_Info', function (req, res, next) {
   console.log("Call Product_Info Api Product_Info:", req.body);

   req.body.Product_No = req.body.Product_No ? `${req.body.Product_No.replace(/'/g, "''")}` : '%';
   req.body.Quotation_No = req.body.Quotation_No ? `${req.body.Quotation_No.replace(/'/g, "''")}` : '';
   var strSQL = format(`SELECT top 1000 p.Product_No
   , case when isnull(p.Customer_Product_No,'') = '' then p.Product_No else p.Customer_Product_No end as Customer_Product_No
   , isnull(p.Color,'') as Color
   , isnull(s.Size_Run,'') as Size_Run
   , isnull(s.Main_Material,'') as Main_Material
   , isnull(Photo_Month,'') as Photo_Month
   , isnull(Sketch_Month,'') as Sketch_Month
   FROM Product as p WITH (NoWait, Nolock) 
   Inner Join Style as s WITH (NoLock, NoWait) on p.Style_No = s.Style_No
   Inner Join Quotation q WITH(NoLock, NoWait) on s.Brand = q.Brand
   Where q.Quotation_No = N'{Quotation_No}'   
   --Where s.Brand = N'{Brand}'
   And ('{Product_No}' = '%' or Product_No like N'%{Product_No}%')`, req.body);
 
   // console.log(strSQL)
   db.sql(req.SiteDB, strSQL)
   .then((result)=>{
     //console.log(result)
     res.send(result.recordset);
   }).catch((err)=>{
     console.log(err);
     res.status(500).send(err);
   })
 });
 

//Quotation Approve
router.post('/ChkApprove', function (req, res, next) {
   console.log("Call Quotation ChkApprove Api Quotation No:", req.body.Quotation_No);
   
   var strSQL = format(` Declare @Approve bit = convert(bit,'{Approve}');
   Update Quotation Set Approve = case when @Approve = 1 then N'${req.UserID}' else null end
   , Approve_Date = case when @Approve = 1 then GetDate() else null end
   Where Quotation_No = '{Quotation_No}';
   
   Declare @Flag int;
   Set @Flag = @@ROWCOUNT;
   
   if(@Flag > 0 )
   Begin
      Update [dbo].[Quotation] Set UserID = isnull(UserID, N'${req.UserID}')
      , Data_Updater = N'${req.UserID}'
      , Data_Update = GetDate()
      where Quotation_No = N'{Quotation_No}'
   End

   Select case when @Flag > 0 then 1 else 0 end as Break_count
   , isnull(p.Approve,'') as Approve
   , isnull(convert(varchar(20),p.Approve_Date,120),'') as Approve_Date
   From Quotation p with(NoLock,NoWait) 
   Where p.Quotation_No = '{Quotation_No}';

   `, req.body);

   // console.log(strSQL)
 
    db.sql(req.SiteDB, strSQL)
    .then((result)=>{
      //console.log('Dataset:',result.recordset)
      res.send(result.recordset);
    }).catch((err)=>{
      console.log(err);
      res.status(500).send(err);
    }) 
 
 });


 //Get Quotation_List
router.post('/Quotation_List',  function (req, res, next) {
   console.log("Call Quotation_List Api:");
   req.body.Quotation_No = req.body.Quotation_No ? `${req.body.Quotation_No.replace(/'/g, "''")}` : '';
   req.body.OrganizationID = req.body.OrganizationID ? `${req.body.OrganizationID.replace(/'/g, "''")}` : '';
   req.body.Date = req.body.Date ? `${req.body.Date.replace(/'/g, "''")}` : '';
   req.body.Brand = req.body.Brand ? `${req.body.Brand.replace(/'/g, "''")}` : '';
   req.body.Season = req.body.Season ? `${req.body.Season.replace(/'/g, "''")}` : '';
   req.body.CustomerID = req.body.CustomerID ? `${req.body.CustomerID.replace(/'/g, "''")}` : '';
   req.body.Attn = req.body.Attn ? `${req.body.Attn.replace(/'/g, "''")}` : '';
   req.body.Buyer = req.body.Buyer ? `${req.body.Buyer.replace(/'/g, "''")}` : '';
   req.body.Department = req.body.Department ? `${req.body.Department.replace(/'/g, "''")}` : '';
   req.body.UserID = req.body.UserID ? `${req.body.UserID.replace(/'/g, "''")}` : '';
   req.body.Approve = req.body.Approve ? `${req.body.Approve.replace(/'/g, "''")}` : '';
   req.body.Memo = req.body.Memo ? `${req.body.Memo.replace(/'/g, "''")}` : '';
   req.body.Subject = req.body.Subject ? `${req.body.Subject.replace(/'/g, "''")}` : '';

   var strSQL = format(`
   SELECT Top 1000 row_number() Over(Order By Date desc, Quotation_No) as RecNo
   ,[Quotation_No] ,[OrganizationID] ,convert(varchar(10) ,[Date] ,111) as [Date] ,[Brand] ,[Season] ,[CustomerID]  ,[Attn]  ,[Buyer]
   ,[Currency] ,[Department] ,[UserID] ,[Approve] ,convert(varchar(20),[Approve_Date],111) as [Approve_Date] ,[Memo] ,[Subject]
  FROM [dbo].[Quotation] With(Nolock,NoWait)
   where (N'{Quotation_No}' = '' or [Quotation_No] like N'{Quotation_No}%')
   And (N'{OrganizationID}' = '' or [OrganizationID] like N'{OrganizationID}%')
   And (N'{Date}' = '' or convert(varchar(10),[Date],111) like N'%{Date}%')
   And (N'{Brand}' = '' or [Brand] like N'{Brand}%')
   And (N'{Season}' = '' or [Season] like N'{Season}%')
   And (N'{CustomerID}' = '' or [CustomerID] like N'{CustomerID}%')
   And (N'{Attn}' = '' or [Attn] like N'{Attn}%')
   And (N'{Buyer}' = '' or [Buyer] like N'{Buyer}%')
   --And (N'{Currency}' = '' or [Currency] like N'{Currency}%')
   And (N'{Department}' = '' or [Department] like N'{Department}%')
   And (N'{UserID}' = '' or [UserID] like N'{UserID}%')
   And (N'{Approve}' = '' or [Approve] like N'{Approve}%')
   --And (N'{Approve_Date}' = '' or convert(varchar(10),[Approve_Date],111) like N'{Approve_Date}%')
   And (N'{Memo}' = '' or [Memo] like N'{Memo}%')
   And (N'{Subject}' = '' or [Subject] like N'{Subject}%');
   `, req.body) ;
   // console.log(strSQL)
   db.sql(req.SiteDB, strSQL)
      .then((result) => {
         res.send(result.recordset);
      }).catch((err) => {
         console.log(err);
         res.status(500).send(err);
      })

});

 //Get Quotation_Info
 router.post('/Quotation_Info',  function (req, res, next) {
   console.log("Call Quotation_Info Api:",req.body);
   //Mode == 0 Get Quotatoin and Quotatoin_Detail Data
   //Mode == 1 Get Quotatoin Data
   //Mode == 2 Get Quotatoin_Detail Data
   var strSQL = format(`
      SELECT q.[Quotation_No]
      , isnull(q.[OrganizationID],'') as OrganizationID
      , isnull(org.[Organization_Name],'') as Organization_Name
      , isnull(org.[Address],'') as [Address]
      , isnull(org.[Phone_Number],'') as Phone_Number
      , isnull(org.[Fax_Number],'') as Fax_Number
      , convert(varchar(20),q.[Date],120) as [Create_Date] 
      , isnull(q.[Brand],'') as Brand
      , isnull(q.[Season],'') as Season
      , isnull(q.[CustomerID],'') as CustomerID
      , isnull(q.[Attn],'') as Attn
      , isnull(q.[Buyer],'') as Buyer
      , isnull(q.[Currency],'') as Currency
      , isnull(Curr.Currency_Rate,0) as Currency_Rate
      , isnull(q.[Department],'') as Department
      , isnull(q.[UserID],'') as UserID
      , isnull(q.[Approve],'') as Approve
      , isnull(convert(varchar(20),q.[Approve_Date],120),'') as Approve_Date
      , isnull(q.[Memo],'') as Memo
      , q.[Subject]
      FROM [dbo].[Quotation] q With(Nolock,NoWait) 
      INNER JOIN dbo.[@Currency_Rate] curr WITH(NoLock, NoWait) ON q.Currency = Curr.Currency And Convert(Date, q.[Date]) = curr.Exchange_Date
      INNER JOIN dbo.[Organization] org WITH(NoLock, NoWait) ON q.OrganizationID = org.OrganizationID      
      where q.[Quotation_No] = '{Quotation_No}';      

      SELECT row_number() Over(Order By Quotation_DetailID) as RecNo
         , '' as Class
         ,qd.[Quotation_DetailID]
         ,qd.[Product_No]
         ,qd.[Customer_Product_No]
         ,p.[Color]
         ,p.[Name]
         ,s.[Sample_Size]
         ,isnull(p.Photo_Month,'') as Photo_Month
         ,isnull(p.Sketch_Month,'') as Sketch_Month
         ,qd.[Unit_Price]
         ,qd.[Size_Run]
         ,s.[Last_No]
         ,s.[Outsole_No]
         ,qd.[Main_Material]
         ,qd.[Remark]
         ,isnull(qd.Labor_Cost,0) as Labor_Cost
         ,isnull(qd.Overhead_Cost,0) as Overhead_Cost
         ,isnull(qd.Transportation_Cost,0) as Transportation_Cost
         ,isnull(qd.Profit_Charge,0) as Profit_Charge
         ,isnull(nullif(qd.MTR_Net_Consist_Rate,0),1) as MTR_Net_Consist_Rate
      FROM [dbo].[Quotation_Detail] qd With(Nolock,NoWait)
      Left outer Join [dbo].[Product] p With(Nolock,NoWait) on qd.Product_No = p.Product_No
      Left outer Join [dbo].[Style] s With(Nolock,NoWait) on s.Style_No = p.Style_No
      where [Quotation_No] = '{Quotation_No}'
      Order by Quotation_DetailID; 
      `, req.body) ;
   // console.log(strSQL)
   db.sql(req.SiteDB, strSQL)
      .then((result) => {
         var DataSet = {Quotation: req.body.Mode == 0 || req.body.Mode == 1 ? result.recordsets[0] : []  
         , Quotation_Detail: req.body.Mode == 0 || req.body.Mode == 2 ? result.recordsets[1] : []
         }        
         //console.log(result) 
         //console.log(DataSet) 
         res.send(DataSet);
      }).catch((err) => {
         console.log(err);
         res.status(500).send(err);
      })

});


//Maintain Quotation 
router.post('/Quotation_Maintain',  function (req, res, next) {
   console.log("Call Quotation_Maintain Api:",req.body);   
   var strSQL = "";

   // req.body.Mode === 0 表示新增 ,  req.body.Mode === 1 表示修改 , req.body.Mode === 2 表示刪除
   req.body.Quotation_No = req.body.Quotation_No ? `N'${req.body.Quotation_No.trim().substring(0,15).replace(/'/g, "''")}'` : `''`; 


   if(req.body.Mode === 0) {
      req.body.OrganizationID = req.body.OrganizationID ? `N'${req.body.OrganizationID.trim().substring(0,10).replace(/'/g, "''")}'` : `''`; 
      req.body.Brand = req.body.Brand ? `N'${req.body.Brand.trim().substring(0,30).replace(/'/g, "''")}'` : `''`; 
      req.body.CustomerID = req.body.CustomerID ? `N'${req.body.CustomerID.trim().substring(0,15).replace(/'/g, "''")}'` : `''`; 
      req.body.Attn = req.body.Attn ? `N'${req.body.Attn.trim().substring(0,20).replace(/'/g, "''")}'` : `''`; 
      req.body.Buyer = req.body.Buyer ? `N'${req.body.Buyer.trim().substring(0,50).replace(/'/g, "''")}'` : `''`; 
      req.body.Currency = req.body.Currency ? `N'${req.body.Currency.trim().substring(0,4).replace(/'/g, "''")}'` : `''`; 
      req.body.Department = req.body.Department ? `N'${req.body.Department.trim().substring(0,5).replace(/'/g, "''")}'` : `''`; 
      req.body.Subject = req.body.Subject ? `N'${req.body.Subject.trim().substring(0,80).replace(/'/g, "''")}'` : `''`; 
      req.body.Memo = req.body.Memo ? `N'${req.body.Memo.trim().substring(0,65535).replace(/'/g, "''")}'` : `''`; 
      req.body.Season = req.body.Season ? `N'${req.body.Season.trim().substring(0,10).replace(/'/g, "''")}'` : `''`; 
   }

   if(req.body.Mode === 1) {
      var fieldSize = 0;
      switch(req.body.Name) {
         case 'Quotation_No':
            fieldSize = 15;
            break;
         case 'OrganizationID':
            fieldSize = 10;
            break;
         case 'Brand':
            fieldSize = 20;
            break;
         case 'CustomerID':
            fieldSize = 15;
            break;
         case 'Attn':
            fieldSize = 20;
            break;
         case 'Season':
            fieldSize = 10;
            break;   
         case 'Buyer':
            fieldSize = 50;
            break;
         case 'Currency':
            fieldSize = 4;
            break;   
         case 'Department':
            fieldSize = 5;
            break;   
         case 'Subject':
            fieldSize = 80;
            break;   
         case 'Memo':
            fieldSize = 65535;
            break;   
      }
      req.body.Value = req.body.Value ? `N'${req.body.Value.trim().substring(0,fieldSize).replace(/'/g, "''")}'` : `''`; 
   }

   switch(req.body.Mode){
      case 0:
         strSQL = format(`
         with tmpTable(Department, OrganizationID) as (
            Select d.Department_Code as Department, d.OrganizationID
            from Employee e 
               Inner Join Department d on e.DepartmentID = d.DepartmentID
               Inner Join aspnet_Users au on e.EmployeeID = au.EmployeeID
            Where au.LoweredUserName = N'${req.UserID}'
         )
         Insert into [dbo].[Quotation] ([Quotation_No] ,[OrganizationID] ,[Date] ,[Data_Update] ,[Brand] ,[CustomerID] ,[Attn] ,[Buyer] ,[Currency] ,[Department] ,[UserID] ,[Data_Updater] ,[Subject] ,[Memo] ,[Season])
         Select {Quotation_No} as Quotation_No, OrganizationID, GetDate() as [Date], GetDate() as [Data_Update], {Brand} as Brand, {CustomerID} as CustomerID, {Attn} as Attn, {Buyer} as Buyer, {Currency} as Currency, Department, N'${req.UserID}' as UserID, N'${req.UserID}' as Data_Updater, {Subject} as Subject, {Memo} as Memo, {Season} as Season From tmpTable; `
         , req.body);
         break;
      case 1:        
         strSQL = format(`     
         Update [dbo].[Quotation] Set [{Name}] = {Value}
         , UserID = isnull(UserID, N'${req.UserID}')
         , Data_Updater = N'${req.UserID}'
         , Data_Update = GetDate()
         where Quotation_No = {Quotation_No}
         ${ req.body.Name === 'Quotation_No' ? ` And (SELECT Count(*) as RecCount FROM Quotation as p WITH (NoWait, Nolock) Where p.Quotation_No = {Value}) = 0 ` : "" }
         ${ req.body.Name === 'Brand' || req.body.Name === 'Currency' ? ` And (SELECT Count(*) as RecCount FROM Quotation_Detail as p WITH (NoWait, Nolock) Where p.Quotation_No = {Quotation_No}) = 0 ` : "" };
         `, req.body);
         break;
      case 2:
         strSQL = format(`
         Delete FROM [dbo].[Quotation] where Quotation_No = {Quotation_No}; 
         `, req.body);      
         break;
      }

      strSQL += format(`
      Declare @Flag int;
      Set @Flag = @@ROWCOUNT;
      Select @Flag as Flag;`)

   // console.log(strSQL)
   db.sql(req.SiteDB, strSQL)
      .then((result) => {
         res.send({Flag:result.recordsets[0][0].Flag > 0});
      }).catch((err) => {
         console.log(err);
         res.status(500).send(err);
      })

});

 //Maintain Quotation Detail
 router.post('/Quotation_Detail_Maintain',  function (req, res, next) {
   console.log("Call Quotation_Detail_Maintain Api:",req.body);   

   req.body.Quotation_No = req.body.Quotation_No ? `N'${req.body.Quotation_No.trim().substring(0,15).replace(/'/g, "''")}'` : `''`; 

   if(req.body.Mode === 0) {
      req.body.Product_No = req.body.Product_No ? `N'${req.body.Product_No.trim().substring(0,25).replace(/'/g, "''")}'` : `''`; 
      req.body.Customer_Product_No = req.body.Customer_Product_No ? `N'${req.body.Customer_Product_No.trim().substring(0,25).replace(/'/g, "''")}'` : `''`; 
      req.body.Main_Material = req.body.Main_Material ? `N'${req.body.Main_Material.trim().substring(0,100).replace(/'/g, "''")}'` : `''`; 
      req.body.Size_Run = req.body.Size_Run ? `N'${req.body.Size_Run.trim().substring(0,20).replace(/'/g, "''")}'` : `''`; 
      req.body.Unit_Price = req.body.Unit_Price ? `N'${req.body.Unit_Price.trim().substring(0,60).replace(/'/g, "''")}'` : `''`; 
      req.body.Remark = req.body.Remark ? `N'${req.body.Remark.trim().substring(0,100).replace(/'/g, "''")}'` : `''`; 
   }

   if(req.body.Mode === 1) {
      var fieldSize = 0;
      switch(req.body.Name) {
         case 'Product_No':
            fieldSize = 20;
            break;
         case 'Customer_Product_No':
            fieldSize = 20;
            break;
         case 'Main_Material':
            fieldSize = 100;
            break;
         case 'Size_Run':
            fieldSize = 20;
            break;
         case 'Unit_Price':
            fieldSize = 60;
            break;
         case 'Remark':
            fieldSize = 100;
            break;   
      }
      req.body.Value = req.body.Value ? `N'${req.body.Value.trim().substring(0,fieldSize).replace(/'/g, "''")}'` : `''`; 
   }
   
   // req.body.Mode === 0 表示新增 ,  req.body.Mode === 1 表示修改 , req.body.Mode === 2 表示刪除
   var strSQL = req.body.Mode === 0 ? format(`
   Insert into [dbo].[Quotation_Detail] (Quotation_No, Product_No, Customer_Product_No, Main_Material, Size_Run, Unit_Price, Remark)
   values ({Quotation_No}, {Product_No}, {Customer_Product_No}, {Main_Material}, {Size_Run}, {Unit_Price}, {Remark}); `
   , req.body) 
   : req.body.Mode === 1 ? format(`
   ${ req.body.Name === 'Product_No' ? ` with tmpTable(Customer_Product_No, Size_Run, Main_Material) as (
      SELECT case when isnull(p.Customer_Product_No,'') = '' then p.Product_No else p.Customer_Product_No end as Customer_Product_No
      , isnull(s.Size_Run,'') as Size_Run
      , isnull(s.Main_Material,'') as Main_Material
      FROM Product as p WITH (NoWait, Nolock)
      Inner Join Style as s WITH (NoLock, NoWait) on p.Style_No = s.Style_No      
      Inner Join Quotation q WITH(NoLock, NoWait) on s.Brand = q.Brand
      Where p.Product_No = {Value} And q.Quotation_No = {Quotation_No} ) ` : ""  }

   Update [dbo].[Quotation_Detail] Set [{Name}] = {Value}
   ${ req.body.Name === 'Product_No' ? `
   , Customer_Product_No = isnull(nullif(Customer_Product_No,''), (Select Customer_Product_No from tmpTable))
   , Size_Run = isnull(nullif(Size_Run,''), (Select Size_Run from tmpTable))
   , Main_Material = isnull(nullif(Main_Material,''), (Select Main_Material from tmpTable))
   where Quotation_DetailID = {Quotation_DetailID} And (Select count(*) from tmpTable) > 0 
   `:" where Quotation_DetailID = {Quotation_DetailID} " }
   
   `, req.body)    
   : format(`
   Delete FROM [dbo].[Quotation_Detail] 
   where Quotation_DetailID = {Quotation_DetailID}; 
   `, req.body) ;

   strSQL += format(`
   Declare @Flag int;
   Set @Flag = @@ROWCOUNT;
   Select @Flag as Flag;
   if(@Flag > 0)
   Begin
      Update [dbo].[Quotation] Set UserID = isnull(UserID, N'${req.UserID}'), Data_Updater = N'${req.UserID}'
      , Data_Update = GetDate()
      where Quotation_No = {Quotation_No}
   End
   `, req.body)    
   // console.log(strSQL)
   db.sql(req.SiteDB, strSQL)
      .then((result) => {
         res.send({Flag:result.recordsets[0][0].Flag > 0});
      }).catch((err) => {
         console.log(err);
         res.status(500).send(err);
      })

});


 //Maintain Quotation Detail Tooling
 router.post('/Quotation_Detail_Tooling_Maintain',  function (req, res, next) {
   console.log("Call Quotation_Detail_Tooling_Maintain Api:",req.body);   

   // req.body.Mode === 0 表示新增 ,  req.body.Mode === 1 表示修改 , req.body.Mode === 2 表示刪除
   var fieldSize = 30;
   req.body.Mold_Type = req.body.Mold_Type ? `N'${req.body.Mold_Type.trim().substring(0,fieldSize).replace(/'/g, "''")}'` : `''`;
   var strSQL = req.body.Mode === 0 ? format(`
   Insert into [dbo].[Quotation_Detail_Tooling] ([Quotation_DetailID] ,[Mold_Type] ,[Unit_Price] ,[Qty] ,[Size_Section] ,[Mini_Qty])
   values ({Quotation_DetailID}, {Mold_Type}, {Unit_Price}, {Qty}, {Size_Section}, {Mini_Qty}); `
   , req.body) 
   :
   req.body.Mode === 1 ? format(`
   Update [dbo].[Quotation_Detail_Tooling] Set [Mold_Type] = N'{Mold_Type}'
   , Unit_Price = {Unit_Price}
   , Qty = {Qty}
   , Size_Section = {Size_Section}
   , Mini_Qty = {Mini_Qty}   
   where Quotation_Detail_ToolingID = {Quotation_Detail_ToolingID}; 
   `, req.body)    
   : format(`
   Delete FROM [dbo].[Quotation_Detail_Tooling] 
   where Quotation_Detail_ToolingID = {Quotation_Detail_ToolingID}; 
   `, req.body) ;

   strSQL += format(`
   Declare @Flag int;
   Set @Flag = @@ROWCOUNT;
   Select @Flag as Flag;
   if(@Flag > 0)
   Begin
      Update [dbo].[Quotation] Set UserID = isnull(UserID, N'${req.UserID}'), Data_Updater = N'${req.UserID}'
      , Data_Update = GetDate()
      where Quotation_No = N'{Quotation_No}'
   End
   `, req.body)    
   // console.log(strSQL)
   db.sql(req.SiteDB, strSQL)
      .then((result) => {
         //console.log(result.recordsets[0][0].Flag > 0)
         res.send({Flag:result.recordsets[0][0].Flag > 0});
      }).catch((err) => {
         console.log(err);
         res.status(500).send(err);
      })

});


 //Update Quotation Detail Cost
 router.post('/Update_Quotation_Cost',  function (req, res, next) {
   console.log("Call Update_Quotation_Cost Api:",req.body);   
  
   var strSQL = format(`
   Update [dbo].[Quotation_Detail] Set [{Name}] = {Value}
   where Quotation_DetailID = {Quotation_DetailID}; 

   Declare @Flag int;
   Set @Flag = @@ROWCOUNT;
   Select @Flag as Flag;
   if(@Flag > 0)
   Begin
      Update [dbo].[Quotation] Set UserID = isnull(UserID, N'${req.UserID}'), Data_Updater = N'${req.UserID}'
      , Data_Update = GetDate()
      where Quotation_No = N'{Quotation_No}'
   End
   `, req.body)    
   // console.log(strSQL)
   db.sql(req.SiteDB, strSQL)
      .then((result) => {
         //console.log(result.recordsets[0][0].Flag > 0)
         res.send({Flag:result.recordsets[0][0].Flag > 0});
      }).catch((err) => {
         console.log(err);
         res.status(500).send(err);
      })

});


//取得 Product_Cost_Breakdown 資料
router.post('/Product_Cost_Breakdown', function (req, res, next) {
   console.log("Call Product_Cost_Breakdown Api Quotation_DetailID:", req.body.Quotation_DetailID);
 
   var strSQL = format(`
Declare @Quotation_Cost table (Material_Cost float,Tooling_Cost float, Labor_Cost float, Overhead_Cost float, Transportation_Cost float, Profit_Charge float, Total_Cost float, Tmp_Total_Cost float)
Declare @Quotation_Rate table (Currency nvarchar(50), currency_Rate float, Currency_Symbol Nvarchar(5))
Declare @Quotation_Material table (SortID varchar(25), Component_GroupID int, Component_Group varchar(25), ComponentID int, Component varchar(35), Material nvarchar(100), Unit varchar(10), Currency varchar(05), Currency_Symbol_M varchar(05), Currency_Q varchar(05), Currency_Symbol_Q varchar(05), Unit_Price varchar(20), Net_Consist varchar(10), Net_Consist_YD varchar(10), Loss float, Transportation_Rate float, Net_Consist_Loss varchar(10), Loss1 varchar(10), Part_No float, StructureID float, Material_ColorID float, Ammount float)
Declare @Quotation_Tooling table (Mold_Type varchar(30), Unit_Price float, Qty int, Size_Section float, Amount float, Mini_Qty float, Cost_PR float)
Declare @Quo_Currency varchar(5), @Quotation_Date varchar(10), @Quo_Exchange_Date varchar(10), @Currency_Symbol Nvarchar(5), @Quo_Currency_Rate float, @Product_No varchar(25), @Material_Cost float, @Tooling_Cost float;

Select @Quo_Currency = q.Currency , @Quo_Exchange_Date = convert(varchar(10), q.Date,111), @Product_No = qd.Product_No, @Quotation_Date = convert(varchar(10), q.Date,111)
FROM Quotation q
Inner Join Quotation_Detail qd with(NoLock, NoWait) ON q.Quotation_No = qd.Quotation_No
Where qd.Quotation_DetailID = {Quotation_DetailID};


insert @Quotation_Cost(Labor_Cost, Overhead_Cost, Transportation_Cost, Profit_Charge)
Select Labor_Cost, Overhead_Cost, Transportation_Cost, Profit_Charge
FROM Quotation_Detail qd with(NoLock, NoWait)
Where qd.Quotation_DetailID = {Quotation_DetailID};


insert @Quotation_Rate
Select q_Rate.Currency, q_Rate.Currency_Rate, c.Currency_Symbol
FROM [@Currency_Rate] q_Rate with(NoLock, NoWait) 
INNER JOIN Currency c with(NoLock, NoWait) ON q_Rate.Currency = c.Currency
Where q_Rate.Exchange_Date = @Quo_Exchange_Date;


Select @Currency_Symbol = q_Rate.Currency_Symbol, @Quo_Currency_Rate = q_Rate.currency_Rate
FROM @Quotation_Rate q_Rate 
Where q_Rate.Currency = @Quo_Currency

--0 Currency_Info
Select * From @Quotation_Rate

--1 Product_Info
Select s.Style_No
, p.Product_No
, s.Brand
, isnull(p.Customer_Product_No,'') as Customer_Product_No
, isnull(p.Color_Code,'') as Color_Code
, isnull(p.Color,'') as Color
, isnull(p.Name,'') as Name
, s.Pattern_No, s.Category, s.Gender, s.Size_Mode, s.Size_Run, s.Sample_Size, s.Construction, s.Last_No, s.Outsole_No, s.Main_Material
, Convert(varchar(10),p.Date,111) as Create_Date
, isnull(Photo_Month,'') as Photo_Month
, isnull(Sketch_Month,'') as Sketch_Month
, @Currency_Symbol as Currency_Symbol
, @Quotation_Date as Quotation_Date
FROM Product p with(NoLock, NoWait)
Inner Join Style s with(NoLock, NoWait) ON p.Style_No = s.Style_No
Where p.Product_No = @Product_No;


insert @Quotation_Material
  SELECT isnull(pcg.SortID,'AZZ') as SortID
  , pcg.Component_GroupID
  , pcg.Component_Group
  , pc.ComponentID
  , isnull(qm.Component,'') AS Component
  , isnull(qm.Material,'') AS Material
  , qm.Unit
  , m_Rate.Currency as Currency
  , m_Rate.Currency_Symbol as Currency_Symbol_M
  , @Quo_Currency as Currency_Q
  , @Currency_Symbol as Currency_Symbol_Q
  , Format(qm.Unit_Price * m_Rate.Currency_Rate / @Quo_Currency_Rate , 'N3') as Unit_Price
  , Format(isnull(qm.Net_Consist ,0), 'N3') as Net_Consist
  , Format(case when isnull(qm.Net_Consist,0) = 0 then 0 else 1 / isnull(qm.Net_Consist,0) end , 'N2') as Net_Consist_YD
  , isnull(qm.Loss,0) as Loss
  , isnull(qm.Transportation_Rate,0) as Transportation_Rate
  , Format(isnull(qm.Net_Consist ,0) * (1 + isnull([Loss],0)), 'N3') as Net_Consist_Loss
  , cast(round(qm.Loss * 100, 2) as varchar) + '%' as Loss1
  , isnull(qm.Part_No,0) as Part_No
  , isnull(qm.StructureID,0) as StructureID
  , isnull(qm.Material_ColorID,0) as Material_ColorID
  , round(qm.Unit_Price * m_Rate.Currency_Rate * qm.Net_Consist * (1 + qm.Loss) * (1 + isnull(qm.Transportation_Rate, 0)) / @Quo_Currency_Rate ,3) AS Ammount
  FROM Quotation_Detail_Material qm with(NoLock, NoWait) 
  INNER JOIN Product_Component pc with(NoLock, NoWait) ON pc.ComponentID = qm.ComponentID
  INNER JOIN Product_Component_Group pcg with(NoLock, NoWait) ON pc.Component_GroupID = pcg.Component_GroupID
  INNER JOIN @Quotation_Rate m_Rate ON qm.Currency = m_Rate.Currency   
 WHERE qm.Quotation_DetailID = {Quotation_DetailID}
 

Select @Material_Cost = sum(Ammount) From @Quotation_Material
Update @Quotation_Cost set Material_Cost = @Material_Cost

--2 Quotation_Detail_Material
Select '0' as SortID, 0 as Component_GroupID, 'Total' as Component_Group, 0 as ComponentID, '' as Component, '' as Material, '' as Unit, '' as Currency,  '' as Currency_Symbol_M,  '' as Currency_Q,  '' as Currency_Symbol_Q, '' as Unit_Price, '' as Net_Consist, '' as Net_Consist_YD, 0 as Loss, 0 as Transportation_Rate, '' as Net_Consist_Loss, '0%' as Loss1, 0 as Part_No,  0 as StructureID,  0 as Material_ColorID, Format(@Material_Cost,'N3') as Amount 
union all
Select SortID, Component_GroupID, Component_Group, ComponentID, Component, Material, Unit, Currency, Currency_Symbol_M, Currency_Q, Currency_Symbol_Q, Unit_Price, Net_Consist, Net_Consist_YD, Loss, Transportation_Rate, Net_Consist_Loss, Loss1, Part_No, StructureID, Material_ColorID, Format(Ammount,'N3') as Amount From @Quotation_Material
union all
Select 'ZZZ' as SortID, Component_GroupID, Component_Group, 0 as ComponentID, '' as Component, '' as Material, '' as Unit, '' as Currency,  '' as Currency_Symbol_M,  '' as Currency_Q,  '' as Currency_Symbol_Q, '' as Unit_Price, '' as Net_Consist, '' as Net_Consist_YD, 0 as Loss, 0 as Transportation_Rate, '' as Net_Consist_Loss, '0%' as Loss1, 0 as Part_No,  0 as StructureID,  0 as Material_ColorID , Format(sum(Ammount),'N3') as Amount From @Quotation_Material Group by Component_GroupID, Component_Group
ORDER BY SortID, ComponentID, Material, Component;

--3 Material_Cost
Select Component_GroupID, Component_Group, Format(sum(Ammount),'N2') as Amount, Format(sum(Ammount) / nullif(@Material_Cost * 100, 0),'N2') as Rate From @Quotation_Material Group by Component_GroupID, Component_Group
union all
Select 9999 as Component_GroupID, 'Total:' as Component_Group, Format(@Material_Cost,'N2') as Amount, case when isnull(@Material_Cost,0) = 0 then '0' else '100' end as Rate From @Quotation_Cost 
ORDER BY Component_GroupID, Component_Group;


insert @Quotation_Tooling  
Select Mold_Type, Unit_Price, Qty, Size_Section, isnull(Unit_Price,0) * isnull(Size_Section,0) as Amount, Mini_Qty, case when isnull(Mini_Qty,0) = 0 then 0 else isnull(Unit_Price,0) * isnull(Size_Section,0) / Mini_Qty end  as Cost_PR
FROM Quotation_Detail_Tooling qt with(NoLock, NoWait)
Where qt.Quotation_DetailID = {Quotation_DetailID};

Select @Tooling_Cost = sum(Cost_PR) From @Quotation_Tooling
Update @Quotation_Cost set Tooling_Cost = @Tooling_Cost / @Quo_Currency_Rate

--4 Tooling_Cost
Select '0' as SortID, Mold_Type, isnull(Unit_Price,0) as Unit_Price, isnull(Qty,0) as Qty, Size_Section, Format(isnull(Amount,0),'N0') as Amount, Format(isnull(Mini_Qty,0),'N0') as Mini_Qty, Format(isnull(Cost_PR,0),'N2') as Cost_PR From @Quotation_Tooling
union all
Select 'ZZZ' as SortID, '' as Mold_Type, 0 as Unit_Price, 0 as Qty,0 as Size_Section,'0' as Amount, Format(isnull(@Tooling_Cost,0) / @Quo_Currency_Rate,'N2') as Mini_Qty, Format(isnull(@Tooling_Cost,0),'N2') as Cost_PR 
ORDER BY SortID, Mold_Type;


Update @Quotation_Cost set Total_Cost = round(isnull(Material_Cost,0) + isnull(Tooling_Cost,0) + isnull(Labor_Cost,0) + isnull(Overhead_Cost,0) + isnull(Transportation_Cost,0) + isnull(Profit_Charge,0), 2);
Update @Quotation_Cost set Tmp_Total_Cost = round(isnull(Material_Cost,0) + isnull(Tooling_Cost,0) + isnull(Labor_Cost,0) + isnull(Overhead_Cost,0) + isnull(Transportation_Cost,0), 2);

--5 Cost_Analysis
Select 0 as sortID, 'Material' as Type, Format(isnull(qc.Material_Cost,0),'N2') as cost, format(case when qc.Tmp_Total_Cost > 0 then (isnull(qc.Material_Cost,0) / qc.Tmp_Total_Cost * 100) else 0 end, 'N2') as Rate from @Quotation_Cost qc
union 
Select 1 as sortID, 'Tooling' as Type, Format(isnull(qc.Tooling_Cost,0),'N2') as cost, format(case when  qc.Tmp_Total_Cost > 0 then (isnull(qc.Tooling_Cost,0) / qc.Tmp_Total_Cost * 100) else 0 end, 'N2') as  Rate from @Quotation_Cost qc
union 
Select 2 as sortID, 'Labor' as Type, Format(isnull(qc.Labor_Cost,0),'N2') as cost, format(case when  qc.Tmp_Total_Cost > 0 then (isnull(qc.Labor_Cost,0) / qc.Tmp_Total_Cost * 100) else 0 end, 'N2') as  Rate from @Quotation_Cost qc
union 
Select 3 as sortID, 'Overhead' as Type, Format(isnull(qc.Overhead_Cost,0),'N2') as cost, format(case when  qc.Tmp_Total_Cost > 0 then (isnull(qc.Overhead_Cost,0) / qc.Tmp_Total_Cost * 100) else 0 end, 'N2') as  Rate from @Quotation_Cost qc
union 
Select 4 as sortID, 'Transportation' as Type, Format(isnull(qc.Transportation_Cost,0),'N2') as cost, format(case when  qc.Tmp_Total_Cost > 0 then (isnull(qc.Transportation_Cost,0) / qc.Tmp_Total_Cost * 100) else 0 end, 'N2') as  Rate from @Quotation_Cost qc
union 
Select 5 as sortID, 'Profit' as Type, Format(isnull(qc.Profit_Charge,0),'N2') as cost , format(case when  qc.Tmp_Total_Cost > 0 then ((qc.Total_Cost - qc.Tmp_Total_Cost) / qc.Tmp_Total_Cost * 100) else 0 end, 'N2') as Rate from @Quotation_Cost qc
union 
Select 6 as sortID, 'Total' as Type, Format(isnull(qc.Total_Cost,0),'N2') as cost, '' as Rate from @Quotation_Cost qc
 
 `, req.body);
   
   // console.log(strSQL)
   db.sql(req.SiteDB, strSQL)
   .then((result)=>{
      var Obj = { Currency_Info: result.recordsets[0], 
         Product_Info: result.recordsets[1], 
         Quotation_Detail_Material: result.recordsets[2], 
         Material_Cost: result.recordsets[3], 
         Tooling_Cost: result.recordsets[4],
         Cost_Analysis: result.recordsets[5] }
         //console.log(Obj.Cost_Analysis)
     res.send( Obj );
   }).catch((err)=>{
     console.log(err);
     res.status(500).send(err);
   });
 });


//Maintain Quotation_Detail_Material 
router.post('/Quotation_Detail_Material_Maintain',  function (req, res, next) {
   console.log("Call Quotation_Detail_Material_Maintain Api:",req.body);   
   var strSQL = "";

   // req.body.Mode === 0 表示新增 ,  req.body.Mode === 1 表示修改 , req.body.Mode === 2 表示刪除

   if(req.body.Mode === 0) {
      req.body.Material = req.body.Material ? `N'${req.body.Material.trim().substring(0,100).replace(/'/g, "''")}'` : `''`; 
      req.body.Unit = req.body.Unit ? `N'${req.body.Unit.trim().substring(0,100).replace(/'/g, "''")}'` : `''`; 
      req.body.Currency = req.body.Currency ? `N'${req.body.Currency.trim().substring(0,100).replace(/'/g, "''")}'` : `''`; 
   }

   if(req.body.Mode === 1 && (req.body.Name === 'Material' || req.body.Name === 'Unit'|| req.body.Name === 'Currency' )) {
      var fieldSize = 0;
      switch(req.body.Name) {
         case 'Material':
            fieldSize = 100;
            break;
         case 'Unit':
            fieldSize = 10;
            break;
         case 'Currency':
            fieldSize = 4;
            break;
      }
      req.body.Value = req.body.Value ? `N'${req.body.Value.trim().substring(0,fieldSize).replace(/'/g, "''")}'` : ``; 
   }

   switch(req.body.Mode){
      case 0:
         strSQL = format(`
         with tmpTable(Component_Group, Component, ComponentID) as (
            Select pcg.Component_Group, pc.Component as Component, pc.ComponentID
            from Product_Component pc 
               Inner Join Product_Component_Group pcg on pc.Component_GroupID = pcg.Component_GroupID               
            Where pc.ComponentID = {ComponentID}
         )
         Insert into [dbo].[Quotation_Detail_Material] ([Quotation_DetailID],
            [Component_Group], [ComponentID], [Component], [Material], [Unit], [Structure_Quot_Price], [Unit_Price],
            [Structure_Net_Consist], [Net_Consist], [Loss], [Transportation_Rate], [Currency])
         Select {Quotation_DetailID} as [Quotation_DetailID],
         [Component_Group], [ComponentID], [Component], {Material} as Material, {Unit} as Unit, 0 as Structure_Quot_Price, {Unit_Price} as Unit_Price,
         0 as Structure_Net_Consist, {Net_Consist} as Net_Consist, {Loss} as Loss,
         {Transportation_Rate} as Transportation_Rate, {Currency} as Currency From tmpTable; `
         , req.body);
         break;
      case 1:        
         strSQL = format(`     
         Update [dbo].[Quotation_Detail_Material] Set [{Name}] = {Value}
         where Quotation_Detail_MaterialID = {Quotation_Detail_MaterialID}
         `, req.body);
         break;
      case 2:
         strSQL = format(`
         Delete FROM [dbo].[Quotation_Detail_Material] where Quotation_Detail_MaterialID = {Quotation_Detail_MaterialID}; 
         `, req.body);      
         break;
      }

   strSQL += format(`
   Declare @Flag int;
   Set @Flag = @@ROWCOUNT;
   Select @Flag as Flag;
   if(@Flag > 0)
   Begin
      Update [dbo].[Quotation] Set UserID = isnull(UserID, N'${req.UserID}'), Data_Updater = N'${req.UserID}'
      , Data_Update = GetDate()
      where Quotation_No = N'{Quotation_No}'
   End
   `, req.body);

   // console.log(strSQL)
   db.sql(req.SiteDB, strSQL)
      .then((result) => {
         res.send({Flag:result.recordsets[0][0].Flag > 0});
      }).catch((err) => {
         console.log(err);
         res.status(500).send(err);
      })

}); 

 //Import_Quotation_Detail_Material
 router.post('/Import_Quotation_Detail_Material',  function (req, res, next) {
   console.log("Call Import_Quotation_Detail_Material Api:",req.body);   

   strSQL = format(`
   if {Mode} = 1
      begin
         Delete From [dbo].[Quotation_Detail_Material] Where Quotation_DetailID = {Quotation_DetailID};
      end
   else if {Mode} = 2
      begin
         Update [dbo].[Quotation_Detail_Material] Set Net_Consist = Structure_Net_Consist * {MTR_Net_Consist_Rate}
         Where Quotation_DetailID = {Quotation_DetailID} and Structure_Net_Consist <> 0;
      end
   else
      begin   
         Delete From [dbo].[Quotation_Detail_Material] Where Quotation_DetailID = {Quotation_DetailID} And (Select count(*) from Product_Structure ps Where ps.Product_No = '{Product_No}' ) > 0;
         INSERT INTO [dbo].[Quotation_Detail_Material]
         ([Quotation_DetailID]
         ,[Component_Group]
         ,[ComponentID]
         ,[Component]
         ,[Material]
         ,[Unit]
         ,[Structure_Quot_Price]
         ,[Unit_Price]
         ,[Structure_Net_Consist]
         ,[Net_Consist]
         ,[Loss]
         ,[Part_No]
         ,[StructureID]
         ,[Material_ColorID]
         ,[Currency])
         Select {Quotation_DetailID} as [Quotation_DetailID]
         ,pg.[Component_Group]
         ,ps.[ComponentID]
         ,pc.[Component]
         , substring( (isnull(ps.Material_Category,'') + ' ' + isnull(ps.Material_Specific,'') + ' ' + isnull(ps.Material_Color,'')), 1, 100) as [Material]
         ,ps.[Unit]
         ,ps.[Quot_Price] as [Structure_Quot_Price]
         ,ps.[Quot_Price] as [Unit_Price]
         ,ps.[Net_Consist] as [Structure_Net_Consist]
         ,ps.[Net_Consist] * {MTR_Net_Consist_Rate} as [Net_Consist]
         ,ps.Lose as [Loss]
         ,ps.[Part_No]
         ,ps.[StructureID]
         ,ps.[Material_ColorID]
         ,ps.[Currency]
         From Product_Structure ps
         Inner Join Product_Component pc on ps.ComponentID = pc.ComponentID
         Inner Join Product_Component_Group pg on pc.Component_GroupID = pg.Component_GroupID
         Where ps.Product_No = N'{Product_No}'
      end

   Declare @Flag int;
   Set @Flag = @@ROWCOUNT;
   Select case when @Flag > 0 then 1 else 0 end as Flag;

   if(@Flag > 0)
   Begin
      Update [dbo].[Quotation_Detail] Set MTR_Net_Consist_Rate = {MTR_Net_Consist_Rate}
      Where Quotation_DetailID = {Quotation_DetailID};

      Update [dbo].[Quotation] Set Data_Updater = '${req.UserID}'
      , Data_Update = GetDate()
      where Quotation_No = N'{Quotation_No}';
   End
   `, req.body)    
   // console.log(strSQL)
   db.sql(req.SiteDB, strSQL)
      .then((result) => {
         res.send({Flag:result.recordset[0].Flag});
      }).catch((err) => {
         console.log(err);
         res.status(500).send(err);
      })

});


 //Get Load_Quotation_Detail_Material
 router.post('/Load_Quotation_Detail_Material',  function (req, res, next) {
   console.log("Call Load_Quotation_Detail_Material Api:",req.body);
   
   var strSQL = format(`
   SELECT q.[Component_Group]
   ,q.[ComponentID]
   ,q.[Component]
   ,q.[Material]
   ,q.[Unit]
   ,q.[Currency]
   ,Format(q.[Pre_Unit_Price],'N3') as Pre_Unit_Price
   ,Format(m.[Purchase_Price],'N3') as Unit_Price_Orig_P
   ,Format(m.[Unit_Price],'N3') as Unit_Price_Orig_M
   ,Format(q.[Unit_Price],'N3') as Unit_Price
   ,Format(q.[Pre_Net_Consist],'N3') as Pre_Net_Consist
   ,Format(q.[Net_Consist],'N3') as Net_Consist
   ,Format(q.[Structure_Net_Consist],'N3') as Structure_Net_Consist
   ,(Select Format(s.Net_Consist,'N3') from Product_Structure s where s.StructureID = q.StructureID)  as Net_Consist_Orig
   ,isnull(q.[Loss],0) as Loss
   , cast(round(q.Loss * 100, 2) as varchar) + '%' as Loss1
   , Format(isnull(q.Net_Consist ,0) * (1 + isnull(q.[Loss],0)), 'N3') as Net_Consist_Loss
   ,q.[Part_No]
   ,q.[StructureID]
   ,q.[Material_ColorID]
   ,Format(q.[Unit_Price] * q.Net_Consist * (1 + isnull(q.Loss,0)),'N3') as Cost
   FROM [dbo].[Quotation_Detail_Material] q With(Nolock,NoWait)
   Inner Join Material_Color m With(Nolock,NoWait) on m.Material_ColorID = q.Material_ColorID
   Inner Join Product_Component pc With(Nolock,NoWait) on pc.[ComponentID] = q.[ComponentID]
   Inner Join Product_Component_Group pcg With(Nolock,NoWait) on pcg.[Component_GroupID] = pc.[Component_GroupID]
   where Quotation_DetailID = {Quotation_DetailID}
   Order by pcg.SortID,pc.ComponentID;
   `, req.body) ;
   // console.log(strSQL)
   db.sql(req.SiteDB, strSQL)
      .then((result) => {
         res.send(result.recordset);
      }).catch((err) => {
         console.log(err);
         res.status(500).send(err);
      })

});


//取得 Quotation Detail Cost 資料
router.post('/Quotation_Detail_Cost_Info', function (req, res, next) {
   console.log("Call Quotation_Detail_Cost_Info Api Quotation_DetailID:", req.body.Quotation_DetailID);
 
 var strSQL = format(`
Declare @Quo_Currency varchar(5)
, @Quotation_Date varchar(10)
, @Quo_Exchange_Date varchar(10)
, @Currency_Symbol Nvarchar(5)
, @Quo_Currency_Rate float
, @Product_No varchar(25)

, @Material_Cost float
, @Tooling_Cost float
, @Labor_Cost float
, @Overhead_Cost float
, @Transportation_Cost float
, @Profit_Charge float
, @Total_Cost float
, @Tmp_Total_Cost float;

Declare @Quotation_Rate table (Currency nvarchar(50), currency_Rate float, Currency_Symbol Nvarchar(5))

Declare @Quotation_Material table (SortID varchar(25), Quotation_Detail_MaterialID int, Component_GroupID int, Component_Group varchar(25), ComponentID int, Component varchar(35), Material nvarchar(100), Unit varchar(10), Currency varchar(05), Currency_Symbol_M varchar(05), Currency_Q varchar(05), Currency_Symbol_Q varchar(05), Unit_Price_Q varchar(15), Structure_Quot_Price float, Unit_Price float, Structure_Net_Consist float, Net_Consist float, Net_Consist_YD varchar(10), Loss float, Transportation_Rate float, Net_Consist_Loss varchar(10), Loss1 varchar(10), Part_No float, StructureID float, Material_ColorID float, Ammount float)
Declare @Quotation_Tooling table (Quotation_Detail_ToolingID int, Mold_Type varchar(30), Unit_Price float, Qty int, Size_Section float, Amount float, Mini_Qty float, Cost_PR float)

Select @Quo_Currency = q.Currency
, @Quo_Exchange_Date = convert(varchar(10), q.Date,111)
, @Quotation_Date = convert(varchar(10), q.Date,111)
, @Labor_Cost = isnull(Labor_Cost,0)
, @Overhead_Cost = isnull(Overhead_Cost,0)
, @Transportation_Cost = isnull(Transportation_Cost,0)
, @Profit_Charge = isnull(Profit_Charge,0)
FROM Quotation q
Inner Join Quotation_Detail qd with(NoLock, NoWait) ON q.Quotation_No = qd.Quotation_No
Where qd.Quotation_DetailID = {Quotation_DetailID};


insert @Quotation_Rate
Select q_Rate.Currency, q_Rate.Currency_Rate, c.Currency_Symbol
FROM [@Currency_Rate] q_Rate with(NoLock, NoWait) 
INNER JOIN Currency c with(NoLock, NoWait) ON q_Rate.Currency = c.Currency
Where q_Rate.Exchange_Date = @Quo_Exchange_Date;


Select @Currency_Symbol = q_Rate.Currency_Symbol, @Quo_Currency_Rate = q_Rate.currency_Rate
FROM @Quotation_Rate q_Rate 
Where q_Rate.Currency = @Quo_Currency


insert @Quotation_Material
  SELECT isnull(pcg.SortID,'AZZ') as SortID
  , qm.Quotation_Detail_MaterialID
  , pcg.Component_GroupID
  , pcg.Component_Group
  , pc.ComponentID
  , isnull(qm.Component,'') AS Component
  , isnull(qm.Material,'') AS Material
  , qm.Unit
  , m_Rate.Currency as Currency
  , m_Rate.Currency_Symbol as Currency_Symbol_M
  , @Quo_Currency as Currency_Q
  , @Currency_Symbol as Currency_Symbol_Q
  , Format(qm.Unit_Price * m_Rate.Currency_Rate / @Quo_Currency_Rate , 'N3') as Unit_Price_Q
  , Round(isnull(qm.Structure_Quot_Price,0),4) as Structure_Quot_Price
  , Round(isnull(qm.Unit_Price,0),3) as Unit_Price
  , Round(isnull(qm.Structure_Net_Consist,0),4) as Structure_Net_Consist
  , Round(isnull(qm.Net_Consist,0),4) as Net_Consist
  , Format(case when isnull(qm.Net_Consist,0) = 0 then 0 else 1 / isnull(qm.Net_Consist,0) end , 'N2') as Net_Consist_YD
  , isnull(qm.Loss,0) as Loss
  , isnull(qm.Transportation_Rate,0) as Transportation_Rate
  , Format(isnull(qm.Net_Consist ,0) * (1 + isnull([Loss],0)), 'N3') as Net_Consist_Loss
  , cast(round(qm.Loss * 100, 2) as varchar) + '%' as Loss1
  , isnull(qm.Part_No,0) as Part_No
  , isnull(qm.StructureID,0) as StructureID
  , isnull(qm.Material_ColorID,0) as Material_ColorID
  , round(qm.Unit_Price * m_Rate.Currency_Rate * qm.Net_Consist * (1 + qm.Loss) * (1 + isnull(qm.Transportation_Rate, 0)) / @Quo_Currency_Rate ,3) AS Ammount
  FROM Quotation_Detail_Material qm with(NoLock, NoWait) 
  INNER JOIN Product_Component pc with(NoLock, NoWait) ON pc.ComponentID = qm.ComponentID
  INNER JOIN Product_Component_Group pcg with(NoLock, NoWait) ON pc.Component_GroupID = pcg.Component_GroupID
  INNER JOIN @Quotation_Rate m_Rate ON qm.Currency = m_Rate.Currency   
 WHERE qm.Quotation_DetailID = {Quotation_DetailID}
 

Select @Material_Cost = isnull(sum(Ammount),0) From @Quotation_Material

--0
Select @Currency_Symbol as Currency_Symbol

--1 Quotation_Detail_Material
Select '0' as SortID, 0 as Quotation_Detail_MaterialID, 0 as Component_GroupID, 'Total' as Component_Group, 0 as ComponentID, '' as Component, '' as Material, '' as Unit, '' as Currency,  '' as Currency_Symbol_M,  '' as Currency_Q,  '' as Currency_Symbol_Q, '' as Unit_Price_Q, 0 as Structure_Quot_Price, 0 as Unit_Price, 0 as Structure_Net_Consist, 0 as Net_Consist, '' as Net_Consist_YD, 0 as Loss, 0 as Transportation_Rate, '' as Net_Consist_Loss, '0%' as Loss1, 0 as Part_No,  0 as StructureID,  0 as Material_ColorID, Format(@Material_Cost,'N3') as Amount 
union all
Select SortID, Quotation_Detail_MaterialID, Component_GroupID, Component_Group, ComponentID, Component, Material, Unit, Currency, Currency_Symbol_M, Currency_Q, Currency_Symbol_Q, Unit_Price_Q, Structure_Quot_Price, Unit_Price, Structure_Net_Consist, Net_Consist, Net_Consist_YD, Loss, Transportation_Rate, Net_Consist_Loss, Loss1, Part_No, StructureID, Material_ColorID, Format(Ammount,'N3') as Amount From @Quotation_Material
union all
Select 'ZZZ' as SortID, 0 as Quotation_Detail_MaterialID, Component_GroupID, Component_Group, 0 as ComponentID, '' as Component, '' as Material, '' as Unit, '' as Currency,  '' as Currency_Symbol_M,  '' as Currency_Q,  '' as Currency_Symbol_Q, '' as Unit_Price_Q, 0 as Structure_Quot_Price, 0 as Unit_Price, 0 as Structure_Net_Consist, 0 as Net_Consist, '' as Net_Consist_YD, 0 as Loss, 0 as Transportation_Rate, '' as Net_Consist_Loss, '0%' as Loss1, 0 as Part_No,  0 as StructureID,  0 as Material_ColorID , Format(sum(Ammount),'N3') as Amount From @Quotation_Material Group by Component_GroupID, Component_Group
ORDER BY SortID, ComponentID, Material, Component;

--2 Material_Cost
Select Component_GroupID, Component_Group, Format(sum(Ammount),'N2') as Amount, Format(sum(Ammount) / nullif(@Material_Cost * 100, 0),'N2') as Rate From @Quotation_Material Group by Component_GroupID, Component_Group
union all
Select 9999 as Component_GroupID, 'Total:' as Component_Group, Format(@Material_Cost,'N2') as Amount, case when isnull(@Material_Cost,0) = 0 then '0' else '100' end as Rate 
ORDER BY Component_GroupID, Component_Group;


insert @Quotation_Tooling  
Select Quotation_Detail_ToolingID, Mold_Type, Unit_Price, Qty, Size_Section, isnull(Unit_Price,0) * isnull(Size_Section,0) as Amount, Mini_Qty, case when isnull(Mini_Qty,0) = 0 then 0 else isnull(Unit_Price,0) * isnull(Size_Section,0) / Mini_Qty end  as Cost_PR
FROM Quotation_Detail_Tooling qt with(NoLock, NoWait)
Where qt.Quotation_DetailID = {Quotation_DetailID};

Select @Tooling_Cost = isnull(sum(Cost_PR),0) From @Quotation_Tooling


--3 Tooling_Cost
Select '0' as SortID, Quotation_Detail_ToolingID, Mold_Type, isnull(Unit_Price,0) as Unit_Price, isnull(Qty,0) as Qty, Size_Section, Format(isnull(Amount,0),'N0') as Amount, Format(isnull(Mini_Qty,0),'N0') as Mini_Qty, Format(isnull(Cost_PR,0),'N2') as Cost_PR, Format(isnull(Cost_PR / nullif(@Quo_Currency_Rate,0),0),'N2') as Cost_PR_1 From @Quotation_Tooling
union all
Select 'ZZZ' as SortID, 0 as Quotation_Detail_ToolingID, '' as Mold_Type, 0 as Unit_Price, 0 as Qty,0 as Size_Section,'0' as Amount, '0' as Mini_Qty, Format(isnull(@Tooling_Cost,0),'N2') as Cost_PR, Format(isnull(@Tooling_Cost / nullif(@Quo_Currency_Rate,0),0),'N2') as Cost_PR_1 
ORDER BY SortID, Mold_Type;


Set @Total_Cost = round( (@Material_Cost + isnull(@Tooling_Cost / nullif(@Quo_Currency_Rate,0),0) + @Labor_Cost + @Overhead_Cost + @Transportation_Cost + @Profit_Charge) , 2);
Set @Tmp_Total_Cost = round( (@Material_Cost + isnull(@Tooling_Cost / nullif(@Quo_Currency_Rate,0),0) + @Labor_Cost + @Overhead_Cost + @Transportation_Cost) , 2);

--4 Cost_Analysis
Select 0 as sortID, 'Material' as Type, '' as Name, Format(@Material_Cost,'N2') as cost, @Material_Cost as Cost_Value, format(isnull(@Material_Cost / nullif(@Tmp_Total_Cost,0) * 100,0), 'N2') as Rate 
union 
Select 1 as sortID, 'Tooling' as Type, '' as Name, Format(isnull(@Tooling_Cost / nullif(@Quo_Currency_Rate,0),0),'N2') as cost, isnull(@Tooling_Cost / nullif(@Quo_Currency_Rate,0),0) as Cost_Value, format(isnull(isnull(@Tooling_Cost / nullif(@Quo_Currency_Rate,0),0) / nullif(@Tmp_Total_Cost,0) * 100,0), 'N2') as Rate 
union 
Select 2 as sortID, 'Labor' as Type, 'Labor_Cost' as Name, Format(@Labor_Cost,'N2') as cost, @Labor_Cost as Cost_Value, format(isnull(@Labor_Cost / nullif(@Tmp_Total_Cost,0) * 100,0), 'N2') as Rate 
union 
Select 3 as sortID, 'Overhead' as Type, 'Overhead_Cost' as Name, Format(@Overhead_Cost,'N2') as cost, @Overhead_Cost as Cost_Value, format(isnull(@Overhead_Cost / nullif(@Tmp_Total_Cost,0) * 100,0), 'N2') as Rate 
union 
Select 4 as sortID, 'Transportation' as Type, 'Transportation_Cost' as Name, Format(@Transportation_Cost,'N2') as cost, @Transportation_Cost as Cost_Value, format(isnull(@Transportation_Cost / nullif(@Tmp_Total_Cost,0) * 100,0), 'N2') as Rate 
union 
--Select 5 as sortID, 'Profit' as Type, 'Profit_Charge' as Name, Format(@Profit_Charge,'N2') as cost, @Profit_Charge as Cost_Value , format(isnull(@Profit_Charge / nullif(@Total_Cost,0) * 100,0), 'N2') as Rate 
Select 5 as sortID, 'Profit' as Type, 'Profit_Charge' as Name, Format(@Profit_Charge,'N2') as cost, @Profit_Charge as Cost_Value , format(isnull((@Total_Cost - @Tmp_Total_Cost) / nullif(@Tmp_Total_Cost,0) * 100,0), 'N2') as Rate
union 
Select 6 as sortID, 'Total' as Type, '' as Name, Format(@Total_Cost,'N2') as cost, @Total_Cost as Cost_Value, '' as Rate  
 
 `, req.body);
   // console.log(strSQL)
   db.sql(req.SiteDB, strSQL)
   .then((result)=>{
      var Obj = { 
         Currency_Symbol: result.recordsets[0][0].Currency_Symbol, 
         Quotation_Detail_Material: result.recordsets[1], 
         Material_Cost: result.recordsets[2], 
         Tooling_Cost: result.recordsets[3],
         Cost_Analysis: result.recordsets[4] }
     res.send( Obj );
   }).catch((err)=>{
     console.log(err);
     res.status(500).send(err);
   });
 });

 

/* Mark-Wang API End */


/* Darren-Chang API Begin */

/* Darren-Chang API End */

module.exports = router;