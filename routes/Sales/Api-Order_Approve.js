var express = require('express');
var router = express.Router();
const format = require('string-format');
var db = require('../../config/DB_Connect');


/* Mark-Wang API Begin */

//Get Order_No
router.post('/Orders',  function (req, res, next) {
  console.log("Call Orders Api:");
  req.body.Order_ApproveID = req.body.Order_ApproveID ? req.body.Order_ApproveID : null;

  var strSQL = format(`
  SELECT distinct o.[Order_No] 
  FROM [dbo].[Order_Approve] oa With(Nolock,NoWait)
  Inner Join Orders o With(Nolock,NoWait) on o.CustomerID = oa.CustomerID And o.Season = oa.Season
  Inner Join Order_Detail od With(NoLock,NoWait) on o.Order_No = od.Order_No
  Inner Join Produce p With(NoLock,NoWait) on p.Produce_No = od.Produce_No And p.Order_ApproveID is null
  where oa.Order_ApproveID = {Order_ApproveID};
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

//Get Order_Approve_List
router.post('/Order_Approve_List',  function (req, res, next) {
  console.log("Call Order_Approve_List Api:");
  req.body.Order_ApproveID = req.body.Order_ApproveID ? `${req.body.Order_ApproveID.replace(/'/g, "''")}` : '';
  req.body.Create_Date = req.body.Create_Date ? `${req.body.Create_Date.replace(/'/g, "''")}` : '';
  req.body.Order_No = req.body.Order_No ? `${req.body.Order_No.replace(/'/g, "''")}` : '';
  req.body.Season = req.body.Season ? `${req.body.Season.replace(/'/g, "''")}` : '';
  req.body.CustomerID = req.body.CustomerID ? `${req.body.CustomerID.replace(/'/g, "''")}` : '';
  req.body.Department = req.body.Department ? `${req.body.Department.replace(/'/g, "''")}` : '';
  req.body.UserID = req.body.UserID ? `${req.body.UserID.replace(/'/g, "''")}` : '';
  req.body.Approve_Date = req.body.Approve_Date ? `${req.body.Approve_Date.replace(/'/g, "''")}` : '';

  var strSQL = format(`
  SELECT Top 1000 row_number() Over(Order By  IIf([Approve_Date] is null,'99999999', convert(varchar(10),[Approve_Date],112)) desc, Order_ApproveID  desc) as RecNo
  ,[Order_ApproveID] ,convert(varchar(10) ,[Create_Date] ,111) as [Create_Date] ,[Season], [Order_No] ,[CustomerID]  
  ,[Department] ,[UserID] ,convert(varchar(20),[Approve_Date],111) as [Approve_Date]
  FROM [dbo].[Order_Approve] With(Nolock,NoWait)
  where (N'{Order_ApproveID}' = '' or [Order_ApproveID] like N'{Order_ApproveID}%')
  And (N'{Create_Date}' = '' or convert(varchar(10),[Create_Date],120) like N'{Create_Date}%')
  And (N'{Order_No}' = '' or [Order_No] like N'%{Order_No}%')
  And (N'{Season}' = '' or [Season] like N'{Season}%')
  And (N'{CustomerID}' = '' or [CustomerID] like N'%{CustomerID}%')
  And (N'{Department}' = '' or [Department] like N'{Department}%')
  And (N'{UserID}' = '' or [UserID] like N'%{UserID}%')
  And (N'{Approve_Date}' = '' or convert(varchar(10),[Approve_Date],111) like N'{Approve_Date}%')
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
 
//Get Order_Approve_Info
router.post('/Order_Approve_Info',  function (req, res, next) {
  console.log("Call Order_Approve_Info Api:",req.body);
  //Mode == 0 Get Order Approve and Order Approve Detail Data
  //Mode == 1 Get Order Approve Data
  //Mode == 2 Get Order Approve Detail Data
  var strSQL = format(`

  Declare @TmpTable Table (Order_ApproveID int, Create_Date Varchar(20), Season Varchar(10), CustomerID Varchar(15), Order_No Varchar(18), Department Varchar(5), UserID Varchar(20), Approve_Date varchar(20), Approve_First_Date varchar(20) )
  Declare @TmpPDSPTable Table (Shipment_No Varchar(20), Qty float, Accounting_Lock_Date varchar(20))
  Declare @TmpOrderTable Table (Order_No varchar(18), Style_No Varchar(20), Factory Varchar(15), Produce_No Varchar(20), Re_Order int, Product_No varchar(25), Name Varchar(50), Qty float, Est_Shipping_Date varchar(20), Unit_Price float, Factory_Price float, Currency_Date Varchar(10), Currency varchar(5), PO_Currency varchar(5), Producing_Cost float)

  if({Mode} = 0 or {Mode} = 1)
  Begin
  Insert @TmpTable
  SELECT q.[Order_ApproveID]
  , convert(varchar(20),q.[Create_Date],120) as [Create_Date] 
  , isnull(q.[Season],'') as Season
  , isnull(q.[CustomerID],'') as CustomerID
  , isnull(q.[Order_No],'') as Order_No
  , isnull(q.[Department],'') as Department
  , isnull(q.[UserID],'') as UserID
  , isnull(convert(varchar(20),q.Approve_Date,120),'') as Approve_Date
  , isnull(convert(varchar(20),q.Approve_First_Date,120),'') as Approve_First_Date   
  FROM [dbo].[Order_Approve] q With(Nolock,NoWait) 
  where q.[Order_ApproveID] = {Order_ApproveID}; 

  Select * From @TmpTable

  Select c.Currency, b.Currency_Symbol, c.Currency_Rate
  From @TmpTable q
  INNER JOIN dbo.[@Currency_Rate] c WITH(NoLock, NoWait) ON Convert(Date, q.[Create_Date]) = c.Exchange_Date
  Inner Join dbo.Currency b On c.Currency = b.Currency

  Insert @TmpPDSPTable
  SELECT p.Shipment_No
  , Sum(pd.Qty) as Qty
  , isnull(convert(varchar(20),p.Accounting_Lock_Date,120),'') as Accounting_Lock_Date
  FROM Produce t with(NoLock,NoWait)
  Inner Join Order_Detail od With(Nolock,NoWait) on t.Produce_No = od.Produce_No 
  Inner Join PDSP_Detail pd With(Nolock,NoWait) on od.Order_DetailID = pd.Order_DetailID
  Inner Join [dbo].[PDSP] p With(Nolock,NoWait) on p.Shipment_No = pd.Shipment_No
  where t.[Order_ApproveID] = {Order_ApproveID}-- And Accounting_Lock_Date is not null
  Group by p.Shipment_No, Accounting_Lock_Date;

  Select 0 as SortID, Shipment_No, Format(Qty, 'N0') as Qty, Accounting_Lock_Date From @TmpPDSPTable
  union
  Select 1 as SortID, '' as Shipment_No, Format(sum(Qty), 'N0') as Qty, '' as Accounting_Lock_Date From @TmpPDSPTable
  Order by Shipment_No

  End

  if({Mode} = 0 or {Mode} = 2)
  Begin
  insert @TmpOrderTable
  Select o.Order_No, p.Style_No, pe.Factory_SubID as Factory
  , pe.Produce_No, ABS(Isnull(pe.Re_Order,0)) as Re_Order
  , p.Product_No, p.Name, sum(od.Qty) as Qty
  , Convert(Varchar(10),od.Est_Shipping_Date,111) as Est_Shipping_Date
  , od.Unit_Price
  , od.Factory_Price
  , Convert(varchar(07), o.Order_Date, 111) + '/01' as Currency_Date
  , (Select c.Currency_Symbol From [Currency] c Where c.Currency = o.Currency) as Currency 
  , (Select c.Currency_Symbol From [Currency] c Where c.Currency = o.PO_Currency) PO_Currency
  , isnull(od.Producing_Cost,0) as Producing_Cost
  From [Orders] o With(Nolock,NoWait)
  INNER JOIN Order_Detail od With(Nolock,NoWait) on o.Order_No = od.Order_No
  INNER JOIN Product p With(Nolock,NoWait) on p.Product_No = od.Product_No
  INNER JOIN Produce pe With(Nolock,NoWait) on pe.Produce_No = od.Produce_No
  Where pe.Order_ApproveID = {Order_ApproveID}
  Group by o.Order_No, p.Style_No, pe.Factory_SubID 
  , pe.Produce_No, pe.Re_Order, p.Product_No, p.Name
  , od.Est_Shipping_Date
  , od.Unit_Price
  , od.Factory_Price
  , o.Order_Date
  , od.Producing_Cost, o.Currency, o.PO_Currency

  Select 0 as SortID, Order_No, Style_No, Factory, Produce_No, Re_Order, Product_No, Name, Format(Qty,'N0') as Qty, Est_Shipping_Date, Currency, Format(Unit_Price,'N2') as Unit_Price, PO_Currency, Format(Factory_Price,'N2') as Factory_Price, 0 as Print_Flag From @TmpOrderTable
  Union
  Select 1 as SortID, '' as Order_No, '' as Style_No, '' as Factory, '' as Produce_No, 0 as Re_Order, '' as Product_No, '' as Name, Format(Sum(Qty),'N0') as Qty, '' as Est_Shipping_Date, Currency, Format(Sum(Unit_Price * Qty), 'N2') as Unit_Price, PO_Currency, Format(Sum(Factory_Price * Qty),'N2') as Factory_Price, case when sum(Producing_Cost) > 0 then 0 else 1 end as Print_Flag From @TmpOrderTable Group by Currency, PO_Currency
  Order by SortID, Order_No, Style_No, Factory, Produce_No, Product_No
  End 
  `, req.body) ;
  //console.log(strSQL)
  db.sql(req.SiteDB, strSQL)
    .then((result) => {
        var DataSet = {Order_Approve: req.body.Mode == 0 || req.body.Mode == 1 ? result.recordsets[0] : []
        , Currency: req.body.Mode == 0 || req.body.Mode == 1 ? result.recordsets[1] : []
        , Shipment_Info: req.body.Mode == 0 || req.body.Mode == 1 ? result.recordsets[2] : []
        , Order_Approve_Detail: (req.body.Mode == 0) ? result.recordsets[3] : req.body.Mode == 2 ? result.recordsets[0] : [] 
    }
        //console.log(result) 
        //console.log(DataSet) 
        res.send(DataSet);
    }).catch((err) => {
        console.log(err);
        res.status(500).send(err);
    })
});

//Maintain Approve 
router.post('/Order_Approve_Maintain',  function (req, res, next) {
   console.log("Call Order_Approve_Maintain Api:",req.body);   

   req.body.Order_ApproveID = req.body.Order_ApproveID ? req.body.Order_ApproveID : 'null'; 

   var strSQL = format(`Declare @ROWCOUNT int=0; `, req.body);

   // req.body.Mode === 0 表示新增
   // req.body.Mode === 1 表示修改
   // req.body.Mode === 2 表示刪除

   switch(req.body.Mode){
      case 0:
        req.body.Season = req.body.Season ? `N'${req.body.Season.trim().substring(0,10).replace(/'/g, "''")}'` : `''`; 
        req.body.CustomerID = req.body.CustomerID ? `N'${req.body.CustomerID.trim().substring(0,15).replace(/'/g, "''")}'` : `''`; 
  
         strSQL += format(` Declare @Order_ApproveID int = 0;

         with tmpTable(Department, OrganizationID) as (
            Select d.Department_Code as Department, d.OrganizationID
            from Employee e 
               Inner Join Department d on e.DepartmentID = d.DepartmentID
               Inner Join aspnet_Users au on e.EmployeeID = au.EmployeeID
            Where au.LoweredUserName = N'${req.UserID}'
         )
         Insert into [dbo].[Order_Approve] ([Create_Date] ,[Data_Update] ,[CustomerID], [Season] ,[Department] ,[UserID] ,[Data_Updater] )
         Select GetDate() as [Create_Date], GetDate() as [Data_Update], {CustomerID} as CustomerID, {Season} as Season, Department, N'${req.UserID}' as UserID, N'${req.UserID}' as Data_Updater From tmpTable; 
         
         Set @ROWCOUNT = @@ROWCOUNT; 
         Set @Order_ApproveID = IDENT_CURRENT('Order_Approve');
         `, req.body);
         break;
      case 1:
        var fieldSize = 0;
        switch(req.body.Name) {
          case 'CustomerID':
            fieldSize = 15;
            break;
          case 'Season':
            fieldSize = 10;
            break;   
          case 'Department':
            fieldSize = 5;
            break;
          case 'Order_No':
            fieldSize = 18;
            break;
        }
        req.body.Value = req.body.Value ? `N'${req.body.Value.trim().substring(0,fieldSize).replace(/'/g, "''")}'` : `''`; 
  
         strSQL += format(`Declare @Order_ApproveID int = {Order_ApproveID};

         Update [dbo].[Order_Approve] Set [{Name}] = {Value}
         ${ req.body.Name === 'CustomerID' || req.body.Name === 'Season' ? ', Order_No = null':'' }
         , UserID = isnull(UserID, N'${req.UserID}')
         , Data_Updater = N'${req.UserID}'
         , Data_Update = GetDate()
         where Order_ApproveID = @Order_ApproveID
         ${ req.body.Name === 'CustomerID' || req.body.Name === 'Season' || req.body.Name === 'Order_No' ? ` And (SELECT Count(*) as RecCount FROM Produce p WITH (NoWait, Nolock) Where p.Order_ApproveID = {Order_ApproveID}) = 0 ` : "" };

         Set @ROWCOUNT = @@ROWCOUNT;
         `, req.body);
         break;
      case 2:
         strSQL += format(`Declare @Order_ApproveID int = {Order_ApproveID};

         Delete FROM [dbo].[Order_Approve] 
         where Order_ApproveID = @Order_ApproveID
         And (SELECT Count(*) as RecCount FROM Produce p WITH (NoWait, Nolock) Where p.Order_ApproveID = {Order_ApproveID}) = 0; 
         Set @ROWCOUNT = @@ROWCOUNT;
         `, req.body);
         break;
      }

      strSQL += format(`    
        Select @ROWCOUNT as Flag, @Order_ApproveID AS Order_ApproveID;
        `, req.body);
     
    //console.log(strSQL)
   db.sql(req.SiteDB, strSQL)
      .then((result) => {
         res.send({Flag:result.recordsets[0][0].Flag > 0, Order_ApproveID:result.recordsets[0][0].Order_ApproveID});
      }).catch((err) => {
         console.log(err);
         res.status(500).send(err);
      })
});

//Maintain Approve Detail
router.post('/Order_Approve_Detail_Maintain',  function (req, res, next) {
console.log("Call Order_Approve_Detail_Maintain Api:",req.body);   
var strSQL = "";

// req.body.Mode === 0 表示新增 
// req.body.Mode === 1 表示修改 
// req.body.Mode === 2 表示刪除
req.body.Order_ApproveID = req.body.Order_ApproveID ? req.body.Order_ApproveID : null; 
req.body.Produce_No = req.body.Produce_No ? `N'${req.body.Produce_No.replace(/'/g, "''")}'` : []; 
req.body.QueryData = req.body.QueryData ? `N'${req.body.QueryData.replace(/'/g, "''")}'` : `''`; 


var strSQL = format(`Declare @Flag int;`,req.body);

switch(req.body.Mode){
   case 0:
   case 1:
      strSQL += format(`
      Update Produce set Order_ApproveID = {Order_ApproveID}
      From Order_Approve oa with(NoLock,NoWait)
      Inner Join Orders o with(NoLock,NoWait) on oa.Order_No = o.Order_No And oa.CustomerID = o.CustomerID And oa.Season = o.Season
      Inner Join Order_Detail od with(NoLock,NoWait) on o.Order_No = od.Order_No
      Inner Join Produce p with(NoLock,NoWait) on p.Produce_No = od.Produce_No And isnull(p.Order_ApproveID,0) = 0       
      Where oa.Order_ApproveID = {Order_ApproveID}
      And p.Produce_No in ('${req.body.Detail.join(`','`)}')
      And ({QueryData} = '' or charindex({QueryData}, isnull(od.Product_No,'') + ' ' + isnull(od.Customer_Product_No,'') + ' ' + cast(isnull(od.Unit_Price,'') as varchar) 
      + ' ' + cast(isnull(od.Qty,'') as varchar) + ' ' + isnull(od.Produce_No,'') + ' ' + isnull(Convert(varchar(10),od.Orig_Shipping_Date,111),'')) > 0);

      Set @Flag = @@ROWCOUNT;

      `,req.body);
   break;
   case 2:
      strSQL += format(`
         Update Produce set Order_ApproveID = null
         Where Produce_No = {Produce_No};
         
         Set @Flag = @@ROWCOUNT;
      `,req.body);
   break;
}   

strSQL += format(`
Select @Flag as Flag;

if(@Flag > 0 )
Begin
   Update [dbo].[Order_Approve] Set UserID = isnull(UserID, N'${req.UserID}'), Data_Updater = N'${req.UserID}'
   , Data_Update = GetDate()
   where Order_ApproveID = {Order_ApproveID}
End
`, req.body)    
 //console.log(strSQL)
db.sql(req.SiteDB, strSQL)
   .then((result) => {
      res.send({Flag:result.recordsets[0][0].Flag > 0});
   }).catch((err) => {
      console.log(err);
      res.status(500).send(err);
   })

});

//Order Approve
router.post('/ChkApprove', function (req, res, next) {
console.log("Call Order ChkApprove Api Approve ID:", req.body);

req.body.Mode = req.body.Mode ? req.body.Mode : 0; 
req.body.WebServer = req.body.WebServer ? `N'${req.body.WebServer.trim()}'` : `'ERP'`; 

var strSQL = format(` Declare @Approve bit = convert(bit,'{Value}'),  @Flag int, @Locked_Count int = 0;

SELECT @Locked_Count = count(*) 
FROM Produce o With(Nolock,NoWait)
Inner Join Order_Detail od With(Nolock,NoWait) on o.Produce_No = od.Produce_No
Inner Join PDSP_Detail pd With(Nolock,NoWait) on od.Order_DetailID = pd.Order_DetailID
Inner Join [dbo].[PDSP] p With(Nolock,NoWait) on p.Shipment_No = pd.Shipment_No
where o.[Order_ApproveID] = {Order_ApproveID}
And isnull(convert(varchar(20),p.Accounting_Lock_Date,120),'') != '';

`, req.body);

switch(req.body.Mode){
   case 0:
      strSQL += format(` 
      Update Order_Approve Set First_Level_Supervisor_Approved_Date = case when @Approve = 1 then GetDate() else null end
      , First_Level_Supervisor = case when @Approve = 1 then N'${req.UserID}' else null end
      Where Order_ApproveID = {Order_ApproveID}
      --And (({WebServer} = 'ERP' or {WebServer} = 'PH' or {WebServer} = 'BM') or CEO is null)
      And Department_Supervisor is not null
      And @Locked_Count = 0;
      
      `, req.body);
   break;
   case 1:
      strSQL += format(` 
      Update Order_Approve Set Department_Supervisor_Approved_Date = case when @Approve = 1 then GetDate() else null end
      , Department_Supervisor = case when @Approve = 1 then N'${req.UserID}' else null end     
      , CEO_Approved_Date = case when @Approve = 1 then CEO_Approved_Date else null end
      , CEO = case when @Approve = 1 then CEO else null end
      , First_Level_Supervisor_Approved_Date = case when @Approve = 1 then First_Level_Supervisor_Approved_Date else null end
      , First_Level_Supervisor = case when @Approve = 1 then First_Level_Supervisor else null end
      , Approve_Date = case when @Approve = 1 then GetDate() else null end
      , Approve_First_Date = isnull(Approve_First_Date, GetDate()) 
      , Section_Supervisor = case when @Approve = 1 then Section_Supervisor else null end
      , Section_Supervisor_Approved_Date = case when @Approve = 1 then Section_Supervisor_Approved_Date else null end  
      , User_Compeleted_Date = case when @Approve = 1 then User_Compeleted_Date else null end 
      Where Order_ApproveID = {Order_ApproveID} 
      --And First_Level_Supervisor is null
      And Section_Supervisor is not null
      And @Locked_Count = 0;
      `, req.body);
   break;
   case 2:
      strSQL += format(` 
      Update Order_Approve Set Section_Supervisor_Approved_Date = case when @Approve = 1 then GetDate() else null end
      , Section_Supervisor = case when @Approve = 1 then N'${req.UserID}' else null end
      Where Order_ApproveID = {Order_ApproveID} 
      And First_Level_Supervisor is null 
      And Department_Supervisor is null
      And User_Compeleted_Date is not null
      And @Locked_Count = 0;
      `, req.body);
   break;
   case 3:
      strSQL += format(` 
      Update Order_Approve Set CEO_Approved_Date = case when @Approve = 1 then GetDate() else null end
      , CEO = case when @Approve = 1 then N'${req.UserID}' else null end
      Where Order_ApproveID = {Order_ApproveID} 
      And First_Level_Supervisor is not null
      And @Locked_Count = 0;
      `, req.body);
   break;
   case 4:
      strSQL += format(` 
      Update Order_Approve Set User_Compeleted_Date = case when @Approve = 1 then GetDate() else null end
      Where Order_ApproveID = {Order_ApproveID}       
      And @Locked_Count = 0;
      `, req.body);
   break;
}  

strSQL += format(` 
Set @Flag = @@ROWCOUNT;
     
Select case when @Flag > 0 then 1 else 0 end as Break_count
, isnull(convert(varchar(20),p.Approve_Date,120),'') as Approve_Date
, isnull(convert(varchar(20),p.Approve_First_Date,120),'') as Approve_First_Date
, isnull(CEO,'') as CEO
, isnull(convert(varchar(20),p.CEO_Approved_Date,120),'') as CEO_Approved_Date
, isnull(First_Level_Supervisor,'') as First_Level_Supervisor
, isnull(convert(varchar(20),p.First_Level_Supervisor_Approved_Date,120),'') as First_Level_Supervisor_Approved_Date
, isnull(Department_Supervisor,'') as Department_Supervisor
, isnull(convert(varchar(20),p.Department_Supervisor_Approved_Date,120),'') as Department_Supervisor_Approved_Date
, isnull(Section_Supervisor,'') as Section_Supervisor
, isnull(convert(varchar(20),p.Section_Supervisor_Approved_Date,120),'') as Section_Supervisor_Approved_Date
, isnull(Convert(varchar(20), p.[User_Compeleted_Date], 120),'') as User_Compeleted_Date
, isnull((Select Email From Employee e with(NoLock,NoWait) where e.LoweredUserName = p.UserID) ,'') as User_Email
, isnull((Select Email From Employee e with(NoLock,NoWait) where e.LoweredUserName = p.First_Level_Supervisor) ,'') as First_Level_Supervisor_Email
, isnull((Select Email From Employee e with(NoLock,NoWait) where e.LoweredUserName = p.Department_Supervisor) ,'') as Department_Supervisor_Email
, isnull((Select Email From Employee e with(NoLock,NoWait) where e.LoweredUserName = p.Section_Supervisor) ,'') as Section_Supervisor_Email
From Order_Approve p with(NoLock,NoWait) 
Where p.Order_ApproveID = {Order_ApproveID};

`, req.body);


//console.log(strSQL);
   db.sql(req.SiteDB, strSQL)
   .then((result)=>{
   //console.log('Dataset:',result.recordset)
   res.send(result.recordset);
   }).catch((err)=>{
   console.log(err);
   res.status(500).send(err);
   }) 

});

//Order Approve Detail Add
router.post('/Order_Approve_Detail_Add', function (req, res, next) {
console.log("Call Order_Approve_Detail_Add Api Approve ID:", req.body);

req.body.QueryData = req.body.QueryData ? `N'${req.body.QueryData.replace(/'/g, "''")}'` : `''`;


var strSQL = format(` 
Select 0 as Selected
, od.Produce_No
, od.Product_No
, od.Customer_Product_No
, od.Unit_Price
, od.Qty
, Convert(varchar(10),od.Orig_Shipping_Date,111) as Orig_Shipping_Date
From Order_Approve oa with(NoLock,NoWait)
Inner Join Orders o with(NoLock,NoWait) on o.Order_No = oa.Order_No And oa.CustomerID = o.CustomerID And oa.Season = o.Season
Inner Join Order_detail od with(NoLock,NoWait) on o.Order_No = od.Order_No
Inner Join Produce p with(NoLock,NoWait) on p.Produce_No = od.Produce_No And isnull(p.Order_ApproveID,0) = 0
Where oa.Order_ApproveID = {Order_ApproveID}
  And ({QueryData} = '' or charindex({QueryData}, isnull(od.Product_No,'') + ' ' + isnull(od.Customer_Product_No,'') + ' ' + cast(isnull(od.Unit_Price,'') as varchar) 
  + ' ' + cast(isnull(od.Qty,'') as varchar) + ' ' + isnull(od.Produce_No,'') + ' ' + isnull(Convert(varchar(10),od.Orig_Shipping_Date,111),'')) > 0);

`, req.body);
//console.log(strSQL);
   db.sql(req.SiteDB, strSQL)
   .then((result)=>{
   //console.log('Dataset:',result.recordset)
   res.send(result.recordset);
   }).catch((err)=>{
   console.log(err);
   res.status(500).send(err);
   }) 

});

//Order Approve Detail report
router.post('/Order_Approve_Report', function (req, res, next) {
console.log("Call Order_Approve_Report Api Approve ID:", req.body);

req.body.Mode = req.body.Mode ? req.body.Mode : 0;
//Mode:0 Order Approve Report Sales Format 
//Mode:1 Order Approve Report Manufacturer Format
var strSQL = format(` 
Declare @Mode int = {Mode};
Declare @Order_ApproveID int = {Order_ApproveID};

Declare @Create_Date DateTime, @Department nvarchar(20), @UserID nvarchar(20), @Approve_Date nvarchar(20), @Approve_First_Date nvarchar(20), @User_Compeleted_Date nvarchar(20)
, @CEO nvarchar(255), @CEO_Approved_Date nvarchar(20)
, @First_Level_Supervisor nvarchar(255), @First_Level_Supervisor_Approved_Date nvarchar(20)
, @Department_Supervisor nvarchar(255), @Department_Supervisor_Approved_Date nvarchar(20)
, @Section_Supervisor nvarchar(255), @Section_Supervisor_Approved_Date nvarchar(20)
, @First_Level_Supervisor_Email nvarchar(255)
, @Department_Supervisor_Email nvarchar(255)
, @Section_Supervisor_Email nvarchar(255)
, @User_Email nvarchar(255)
, @CEO_Comment nvarchar(max)
, @First_Level_Supervisor_Comment nvarchar(max)
, @Department_Supervisor_Comment nvarchar(max)
, @Section_Supervisor_Comment nvarchar(max)
, @User_Comment nvarchar(max)
Declare @tmpCurrency_Rate table (Currency nvarchar(50), Currency_Rate float, Currency_Symbol nvarchar(5))
Declare @Orders table (Order_No varchar(20), Season Varchar(10), CustomerID varchar(15), Agent Varchar(15), Currency Varchar(15), PO_Currency Varchar(15))
Declare @Order_Detail table (Order_DetailID int, Order_No varchar(20), Product_No varchar(25), Produce_No varchar(20), Qty float, Unit_Price float, Factory_Price float, Orig_Shipping_Date DateTime, Producing_Cost float, Overhead float,PCost_Standard float,PCost_Print float,PCost_Embroidery float,PCost_Wash_Repacking float,PCost_Handmade float,PCost_Outsole_Assembling float,PCost_Double_Lasting float,PCost_Finishing float, PCost_Others float)
Declare @Commission table (Order_DetailID int, CustomerID varchar(15), Category varchar(10), T_Commission_Rate float, Description Nvarchar(30))
Declare @Expense table (Order_DetailID int, CustomerID varchar(15), Category varchar(10), T_Rate float, Description Nvarchar(30))
Declare @Produce table (Produce_No varchar(20), Factory_SubID varchar(15), G_Manager varchar(20), Purchase_Project_No varchar(20), Qty float, MTR_Amount float, Re_Order int)
Declare @Product table (Style_No varchar(20), Product_Type varchar(10), Product_No varchar(25), Name varchar(50), Sketch_Month varchar(4), Photo_Month varchar(4))
Declare @Product_Process table (Order_No varchar(20), Product_No varchar(25), Factory_SubID varchar(20), Style_No varchar(20), Workshop_Abbreviation varchar(2), Workshop Nvarchar(20), Labor_Cost float)
Declare @Approve_Detail table (Order_No varchar(20), Produce_No varchar(20), Orig_Shipping_Date varchar(10), Style_No Varchar(20), Product_Type varchar(10), Product_No varchar(25), Article_Name Varchar(50), Sketch_Month varchar(4), Photo_Month varchar(4), Qty float, Unit_Price float, O_Expense float, O_Commission float, Mater_Cost float, Factory_Price float, Producing_Cost float,PCost_Standard float,PCost_Print float,PCost_Embroidery float,PCost_Wash_Repacking float,PCost_Handmade float,PCost_Outsole_Assembling float,PCost_Double_Lasting float,PCost_Finishing float, PCost_Others float, Overhead float, Unit_Income float, Income float, Factory_SubID varchar(15), Re_Order int, Order_Currency_Symbol nvarchar(5), PO_Currency_Symbol nvarchar(5))

Select @Create_Date = Create_Date, @Department = Department, @UserID = UserID 
, @User_Email = isnull((Select Email From Employee e with(NoLock,NoWait) where e.LoweredUserName = oa.UserID) ,'')
, @Approve_Date = isnull(Convert(varchar(20), [Approve_Date], 120),'')
, @Approve_First_Date = isnull(Convert(varchar(20), [Approve_First_Date], 120),'')
, @CEO = isnull([CEO],'')
, @CEO_Approved_Date = isnull(Convert(varchar(20), [CEO_Approved_Date], 120),'')
, @CEO_Comment = isnull(CEO_Comment, '')
, @First_Level_Supervisor = isnull([First_Level_Supervisor],'')
, @First_Level_Supervisor_Approved_Date = isnull(Convert(varchar(20), [First_Level_Supervisor_Approved_Date], 120),'')
, @First_Level_Supervisor_Email = isnull((Select Email From Employee e with(NoLock,NoWait) where e.LoweredUserName = oa.First_Level_Supervisor) ,'')
, @First_Level_Supervisor_Comment = isnull(First_Level_Supervisor_Comment, '')
, @Department_Supervisor = isnull([Department_Supervisor],'') 
, @Department_Supervisor_Approved_Date = isnull(Convert(varchar(20), [Department_Supervisor_Approved_Date], 120),'')
, @Department_Supervisor_Email = isnull((Select Email From Employee e with(NoLock,NoWait) where e.LoweredUserName = oa.Department_Supervisor) ,'')
, @Department_Supervisor_Comment  = isnull(Department_Supervisor_Comment, '')
, @Section_Supervisor = isnull([Section_Supervisor],'')
, @Section_Supervisor_Approved_Date = isnull(Convert(varchar(20), [Section_Supervisor_Approved_Date], 120),'')
, @Section_Supervisor_Email = isnull((Select Email From Employee e with(NoLock,NoWait) where e.LoweredUserName = oa.Section_Supervisor) ,'')
, @Section_Supervisor_Comment  = isnull(Section_Supervisor_Comment, '')
, @User_Comment  = isnull(User_Comment, '')
, @User_Compeleted_Date = isnull(Convert(varchar(20), [User_Compeleted_Date], 120),'')
From Order_Approve oa Where oa.Order_ApproveID = @Order_approveID

Insert @tmpCurrency_Rate
Select cr.Currency, cr.Currency_Rate, c.Currency_Symbol
From [@Currency_Rate] cr with(NoLock, NoWait)
Inner Join [Currency] c with(NoLock, NoWait) on c.Currency = cr.Currency
Where convert(Date,@Create_Date) = cr.Exchange_Date 

Insert @Produce
Select p.Produce_No, Factory_SubID, G_Manager, Purchase_Project_No, p.Qty, MTR_Amount, Re_Order
From Produce p with(NoLock, NoWait)
where p.Order_ApproveID = @Order_approveID

Insert @Order_Detail
Select od.Order_DetailID, od.Order_No, od.Product_No, od.Produce_No, od.Qty, od.Unit_Price, od.Factory_Price
, Convert(varchar(10), od.Orig_Shipping_Date,111) as Orig_Shipping_Date
, od.Producing_Cost, od.Overhead
, od.PCost_Standard, od.PCost_Print, od.PCost_Embroidery, od.PCost_Wash_Repacking, od.PCost_Handmade, od.PCost_Outsole_Assembling
, od.PCost_Double_Lasting, od.PCost_Finishing, od.PCost_Others
from Order_Detail od with(NoLock, NoWait) 
Inner Join @Produce o On  od.Produce_No = o.Produce_No

Insert @Orders
Select distinct o.Order_No, o.Season, o.CustomerID, o.Agent, o.Currency, o.PO_Currency 
From Orders o with(NoLock, NoWait) 
Inner Join @Order_Detail od on o.Order_No = od.Order_No

Insert @Product
Select p.Style_No, s.Product_Type, od.Product_No , p.Name, p.Sketch_Month, p.Photo_Month
From @Order_Detail od
Inner Join Product p with(NoLock, NoWait) on od.Product_No = p.Product_No
Inner Join Style s with(NoLock, NoWait) on s.Style_No = p.Style_No
Group by p.Style_No, s.Product_Type, od.Product_No , p.Name, p.Sketch_Month, p.Photo_Month

Insert @Commission
Select e.Order_DetailID, CustomerID, Category, e.Rate as T_Commission_Rate, Description
From Order_Detail_Expense e with(NoLock, NoWait)
Inner Join @Order_Detail d on e.Order_DetailID = d.Order_DetailID
Where e.Category = 'Commission'

Insert @Expense
Select e.Order_DetailID, CustomerID, Category, e.Rate as T_Rate, Description
From Order_Detail_Expense e with(NoLock, NoWait)
Inner Join @Order_Detail d on e.Order_DetailID = d.Order_DetailID
Where e.Category = 'Other'

/*
Insert @Product_Process 
Select o.Order_No, od.Product_No, p.Factory_SubID, isnull(w.Workshop_Abbreviation,'') as Workshop_Abbreviation, sum(sw.Labor_Cost * isnull(Order_Currency.Currency_Rate / nullif(PO_Currency.Currency_Rate,0),1)) as Labor_Cost
from @Orders o
Inner Join @Order_Detail od on o.Order_No = od.Order_No
Inner Join @Product pc on od.Product_No = pc.Product_No	
Inner Join @Produce p on od.Produce_No = p.Produce_No
Inner Join Style_Process sp with(NoLock,NoWait)	on pc.Style_No = sp.Style_No
Inner Join Style_Workshop sw with(NoLock,NoWait) on sp.Style_ProcessID = sw.Style_ProcessID
Inner Join Workshop w with(NoLock,NoWait) on sw.WorkshopID = w.WorkshopID
INNER JOIN @tmpCurrency_Rate Order_Currency ON o.Currency = Order_Currency.Currency
INNER JOIN @tmpCurrency_Rate PO_Currency ON o.PO_Currency = PO_Currency.Currency
Group by o.Order_No, od.Product_No, Factory_SubID, w.Workshop_Abbreviation
*/

Insert @Product_Process (Factory_SubID, Style_No, Workshop_Abbreviation, Workshop)
Select p.Factory_SubID, pc.Style_No, isnull(w.Workshop_Abbreviation,'') as Workshop_Abbreviation, isnull(w.Workshop,'') as Workshop
from @Order_Detail od 
Inner Join @Product pc on od.Product_No = pc.Product_No	
Inner Join @Produce p on od.Produce_No = p.Produce_No 
Inner Join Style_Process sp with(NoLock,NoWait)	on pc.Style_No = sp.Style_No
Inner Join Style_Workshop sw with(NoLock,NoWait) on sp.Style_ProcessID = sw.Style_ProcessID
Inner Join Workshop w with(NoLock,NoWait) on sw.WorkshopID = w.WorkshopID
Where w.Major_Daisplay = 1
Group by p.Factory_SubID, pc.Style_No, w.Workshop_Abbreviation, w.Workshop

-- 0 Report Head
Select distinct @Order_ApproveID as Order_ApproveID, convert(varchar(20),@Create_Date,111) as Apply_Date, Season, @Department as Department, CustomerID, Agent, @UserID as Report_Maker, p.Factory_SubID , Convert(Varchar(10),GetDate(),111) as Print_Date
, @Approve_Date as Approve_Date
, @Approve_First_Date as Approve_First_Date
, @CEO as CEO
, @CEO_Approved_Date as CEO_Approved_Date
, @CEO_Comment as CEO_Comment
, @First_Level_Supervisor as First_Level_Supervisor
, @First_Level_Supervisor_Approved_Date as First_Level_Supervisor_Approved_Date
, @First_Level_Supervisor_Comment as First_Level_Supervisor_Comment
, @Department_Supervisor as Department_Supervisor
, @Department_Supervisor_Approved_Date as Department_Supervisor_Approved_Date
, @Department_Supervisor_Comment as Department_Supervisor_Comment
, @Section_Supervisor as Section_Supervisor
, @Section_Supervisor_Approved_Date as Section_Supervisor_Approved_Date
, @Section_Supervisor_Comment as Section_Supervisor_Comment
, @User_Comment as User_Comment
, @First_Level_Supervisor_Email as First_Level_Supervisor_Email
, @Department_Supervisor_Email as Department_Supervisor_Email
, @Section_Supervisor_Email as Section_Supervisor_Email
, @User_Email as User_Email
, @User_Compeleted_Date as User_Compeleted_Date
from @Orders o
Inner Join @Order_Detail d on o.Order_No = d.Order_No
Inner Join @Produce p on d.Produce_No = p.Produce_No

-- 1 Report Currency_Rate
Select * from @tmpCurrency_Rate Where Currency <> 'TWD'

-- 2 Report Expense and Commission
Select p.Factory_SubID, CustomerID, Category, Format(Sum(c.T_Commission_Rate * d.Qty * d.Unit_Price),'N2') as O_Expense, Description 
from @Commission c 
Inner Join @Order_Detail d on d.Order_DetailID = c.Order_DetailID 
Inner Join @Produce p on d.Produce_No = p.Produce_No
Group by p.Factory_SubID, CustomerID, Category, Description
union
Select p.Factory_SubID, CustomerID, Category, Format(Sum(c.T_Rate * d.Qty * d.Unit_Price),'N2') as O_Expense, Description 
from @Expense c 
Inner Join @Order_Detail d on d.Order_DetailID = c.Order_DetailID 
Inner Join @Produce p on d.Produce_No = p.Produce_No
Group by p.Factory_SubID, CustomerID, Category, Description

-- 3 Report Detail
if @Mode = 0
Begin
      Insert @Approve_Detail (Order_No, Orig_Shipping_Date, Style_No, Product_Type, Article_Name, Qty, Unit_Price, O_Expense, O_Commission, Factory_Price, Unit_Income , Income, Factory_SubID , Re_Order, Order_Currency_Symbol, PO_Currency_Symbol)
      Select Order_No, Orig_Shipping_Date, Style_No, Product_Type, Article_Name, Qty, Unit_Price, O_Expense, O_Commission, Factory_Price, Unit_Income
      , (IsNull(tmp.Unit_Price,0) + (isnull(tmp.O_Expense,0) ) - (IsNull(tmp.O_Commission,0)) - (isnull(tmp.[Factory_Price] * tmp.Passing_Rate,0))) * isnull(tmp.Qty,0) as Income
      , Factory_SubID , Re_Order, Order_Currency_Symbol, PO_Currency_Symbol
      From (
      SELECT od.Order_No, convert(varchar(10),od.Orig_Shipping_Date,111) as Orig_Shipping_Date, pc.Style_No, pc.Product_Type, pc.Name AS Article_Name
      , Sum(od.Qty) AS Qty
      , IsNull(od.Unit_Price,0) as Unit_Price
      , isnull([T_Rate],0) * isnull(od.[Unit_Price],0) as O_Expense
      , IsNull([T_Commission_Rate],0) * od.[Unit_Price] * -1 as O_Commission
      , IsNull(od.[Factory_Price] ,0) as Factory_Price
      , isnull(isnull([PO_Currency].[Currency_Rate],0)/nullif([Order_Currency].[Currency_Rate],0),0) as Passing_Rate
      , IsNull(od.Unit_Price,0)
         + (isnull([T_Rate],0) * isnull(od.[Unit_Price],0))
         + (IsNull([T_Commission_Rate],0) * isnull(od.[Unit_Price],0) )
         - (isnull(od.[Factory_Price],0) * isnull([PO_Currency].[Currency_Rate],0)/nullif([Order_Currency].[Currency_Rate],0))  as Unit_Income
      , p.Factory_SubID
      , p.Re_Order
      , Order_Currency.Currency_Symbol AS Order_Currency_Symbol
      , PO_Currency.Currency_Symbol AS PO_Currency_Symbol
      FROM @Orders o
      INNER JOIN @Order_Detail od On  od.Order_No = o.Order_No
      INNER JOIN @Produce p On p.Produce_No = od.Produce_No
      INNER JOIN @Product pc ON od.Product_No = pc.Product_No
      LEFT JOIN (Select Order_DetailID, sum([T_Commission_Rate]) as T_Commission_Rate from @Commission Group by Order_DetailID) as c ON od.Order_DetailID = c.Order_DetailID
      LEFT JOIN (Select Order_DetailID, sum([T_Rate]) as T_Rate from @Expense Group by Order_DetailID) as e ON od.Order_DetailID = e.Order_DetailID
      INNER JOIN @tmpCurrency_Rate Order_Currency ON o.Currency = Order_Currency.Currency
      INNER JOIN @tmpCurrency_Rate PO_Currency ON o.PO_Currency = PO_Currency.Currency
      GROUP BY p.Factory_SubID, od.Order_No, od.Orig_Shipping_Date, pc.Style_No, pc.Product_Type, pc.Name
      , od.Unit_Price, [T_Rate], [T_Commission_Rate], od.[Factory_Price]
      , Order_Currency.Currency_Rate, p.Re_Order, Order_Currency.Currency_Symbol, PO_Currency.Currency_Symbol
      , PO_Currency.Currency_Rate
            ) tmp
      SELECT
      0 as SortID, ad.Order_No, convert(varchar(10),ad.Orig_Shipping_Date,111) as Orig_Shipping_Date, ad.Style_No, ad.Article_Name
      , (Select Top 1 Product_No From @Product p where p.Style_No = ad.Style_No) as Product_No
      , (Select Top 1 Sketch_Month From @Product p where p.Style_No = ad.Style_No) as Sketch_Month 
      , (Select Top 1 Photo_Month From @Product p where p.Style_No = ad.Style_No) as Photo_Month 
      , case when isnull(ad.Qty,0) = 0 then '' else Format(ad.Qty,'N0') end AS Qty
      , case when isnull(ad.Unit_Price,0) = 0 then '' else ad.Order_Currency_Symbol + ' ' + Format(ad.Unit_Price,'N2') end as Unit_Price
      , case when isnull(ad.O_Expense,0) = 0 then '' else ad.Order_Currency_Symbol + ' ' + Format(ad.O_Expense,'N2') end as O_Expense
      , case when isnull(ad.O_Commission,0) = 0 then '' else ad.Order_Currency_Symbol + ' ' + Format(ad.O_Commission,'N2') end as O_Commission
      , case when isnull(ad.Factory_Price,0) = 0 then '' else ad.PO_Currency_Symbol + ' ' + Format(ad.Factory_Price,'N2') end as Factory_Price
      , ad.Order_Currency_Symbol + ' ' + Format(ad.Unit_Income,'N2') as Unit_Income
      , ad.Order_Currency_Symbol + ' ' + Format(ad.Income,'N2') as Income
      , ad.Factory_SubID , ad.Re_Order, isnull((ad.Income) / nullif((ad.Unit_Price * ad.Qty),0),0) * 100 as Income_Rate
      FROM @Approve_Detail ad
   union
   Select
      1 as SortID, '' as Order_No, '' as Orig_Shipping_Date, ad.Product_Type as Style_No, 'Total:' as Article_Name
      , '' as Product_No
      , '' as Sketch_Month
      , '' as Photo_Month
      , Format(isnull(sum(ad.Qty),0),'N0') + ' PRS' AS Qty
      , ad.Order_Currency_Symbol + ' ' + Format(isnull(Sum(ad.Unit_Price * ad.Qty),0) ,'N2') as Unit_Price
      , ad.Order_Currency_Symbol + ' ' + Format(isnull(Sum(ad.O_Expense * ad.Qty),0),'N2') as O_Expense
      , ad.Order_Currency_Symbol + ' ' + Format(isnull(Sum(ad.O_Commission * ad.Qty),0),'N2') as O_Commission
      , ad.PO_Currency_Symbol + ' ' + Format(isnull(Sum(ad.Factory_Price * ad.Qty),0),'N2') as Factory_Price
      , '' AS Unit_Income
      , ad.Order_Currency_Symbol + ' ' + Format(isnull(Sum(ad.Income),0), 'N2') as Income
      , ad.Factory_SubID , 0 as Re_Order, 0 as Income_Rate
      FROM @Approve_Detail ad
      Group by Factory_SubID, ad.Order_Currency_Symbol, ad.PO_Currency_Symbol, ad.Product_Type
   union
   Select
      2 as SortID, '' as Order_No, '' as Orig_Shipping_Date, 'Grand' as Style_No, 'Total:' as Article_Name
      , '' as Product_No
      , '' as Sketch_Month
      , '' as Photo_Month
      , Format(isnull(sum(ad.Qty),0),'N0') + ' PRS' AS Qty
      , ad.Order_Currency_Symbol + ' ' + Format(isnull(Sum(ad.Unit_Price * ad.Qty),0) ,'N2') as Unit_Price
      , ad.Order_Currency_Symbol + ' ' + Format(isnull(Sum(ad.O_Expense * ad.Qty),0),'N2') as O_Expense
      , ad.Order_Currency_Symbol + ' ' + Format(isnull(Sum(ad.O_Commission * ad.Qty),0),'N2') as O_Commission
      , ad.PO_Currency_Symbol + ' ' + Format(isnull(Sum(ad.Factory_Price * ad.Qty),0),'N2') as Factory_Price
      , '' AS Unit_Income
      , ad.Order_Currency_Symbol + ' ' + Format(isnull(Sum(ad.Income),0), 'N2') as Income
      , ad.Factory_SubID , 0 as Re_Order, 0 as Income_Rate
      FROM @Approve_Detail ad
      Group by Factory_SubID, ad.Order_Currency_Symbol, ad.PO_Currency_Symbol
   union
   Select
      3 as SortID, '' as Order_No, '' as Orig_Shipping_Date, '' as Style_No, 'Average:' as Article_Name
      , '' as Product_No
      , '' as Sketch_Month
      , '' as Photo_Month
      , '' AS Qty
      , ad.Order_Currency_Symbol + ' ' + Format(isnull(Sum(ad.Unit_Price * ad.Qty) / nullif(sum(ad.Qty),0),0) ,'N2') as Unit_Price
      , ad.Order_Currency_Symbol + ' ' + Format(isnull(Sum(ad.O_Expense * ad.Qty) / nullif(sum(ad.Qty),0),0),'N2') as O_Expense
      , ad.Order_Currency_Symbol + ' ' + Format(isnull(Sum(ad.O_Commission * ad.Qty) / nullif(sum(ad.Qty),0),0),'N2') as O_Commission
      , ad.PO_Currency_Symbol + ' ' + Format(isnull(Sum(ad.Factory_Price * ad.Qty) / nullif(sum(ad.Qty),0),0),'N2') as Factory_Price
      , '' AS Unit_Income
      , ad.Order_Currency_Symbol + ' ' + Format(isnull(Sum(ad.Income) / nullif(sum(ad.Qty),0),0), 'N2') as Income
      , ad.Factory_SubID , 0 as Re_Order, 0 as Income_Rate
      FROM @Approve_Detail ad
      Group by Factory_SubID, ad.Order_Currency_Symbol, ad.PO_Currency_Symbol
   union
   Select
      4 as SortID, '' as Order_No, '' as Orig_Shipping_Date, '' as Style_No, 'Rate:' as Article_Name
      , '' as Product_No
      , '' as Sketch_Month
      , '' as Photo_Month
      , '' AS Qty
      , '' as Unit_Price
      , Format(isnull(Sum(ad.O_Expense * ad.Qty) / nullif(Sum(ad.Unit_Price * ad.Qty),0),0) * 100,'N2') + '%' as O_Expense
      , Format(isnull(Sum(ad.O_Commission * ad.Qty) / nullif(Sum(ad.Unit_Price * ad.Qty),0),0) * 100,'N2') + '%' as O_Commission
      , Format(isnull(Sum(ad.Factory_Price * ad.Qty) / nullif(Sum(ad.Unit_Price * ad.Qty),0),0) * 100,'N2') + '%' as Factory_Price
      , '' AS Unit_Income
      , Format(isnull(Sum(ad.Income) / nullif(Sum(ad.Unit_Price * ad.Qty),0),0) * 100, 'N2') + '%' as Income
      , ad.Factory_SubID , 0 as Re_Order, 0 as Income_Rate
      FROM @Approve_Detail ad
      Group by Factory_SubID
      Order by Factory_SubID, SortID, Order_No, Orig_Shipping_Date, Style_No, Article_Name
End
Else
Begin
      Insert @Approve_Detail (Order_No, Produce_No, Orig_Shipping_Date, Product_No, Style_No, Product_Type, Article_Name, Sketch_Month, Photo_Month, Qty, Unit_Price, O_Expense, O_Commission, Mater_Cost, Factory_Price, Producing_Cost, PCost_Standard, PCost_Others , Overhead, Unit_Income, Income, Factory_SubID, Re_Order, Order_Currency_Symbol, PO_Currency_Symbol)
      Select Order_No, Produce_No, Orig_Shipping_Date, Product_No, Style_No, Product_Type, Article_Name, Sketch_Month, Photo_Month, Qty, Unit_Price, O_Expense, O_Commission, Mater_Cost, Factory_Price, Producing_Cost, PCost_Standard, PCost_Others, Overhead, Unit_Income
      , (IsNull(tmp.Unit_Price,0) + isnull(tmp.O_Expense,0) - (IsNull(tmp.O_Commission,0)) - (isnull(tmp.Mater_Cost,0)) - (tmp.Factory_Price * tmp.Passing_Rate) - (tmp.Producing_Cost * tmp.Passing_Rate) - (IsNull(tmp.Overhead,0)* tmp.Passing_Rate) ) * isnull(tmp.Qty,0) as Income
      , Factory_SubID , Re_Order, Order_Currency_Symbol, PO_Currency_Symbol
      From (
         SELECT od.Order_No, od.Produce_No, convert(varchar(10),od.Orig_Shipping_Date,111) as Orig_Shipping_Date, od.Product_No, pc.Style_No, pc.Product_Type, pc.Name AS Article_Name, pc.Sketch_Month, pc.Photo_Month
            , Sum(isnull(od.Qty,0)) AS Qty, IsNull(od.Unit_Price,0) as Unit_Price
            , isnull([T_Rate],0) * isnull(od.[Unit_Price],0) as O_Expense
            , IsNull([T_Commission_Rate],0) * od.[Unit_Price] * -1 as O_Commission
--            , (case when MTR_Amount <> 0 And p.[Purchase_Project_No] is not null then isnull(p.[MTR_Amount]/nullif(p.[Qty],0)/nullif([Order_Currency].[Currency_Rate],0) ,0) else 0 end)  as Mater_Cost
            , (case when MTR_Amount <> 0 then isnull(p.[MTR_Amount]/nullif(p.[Qty],0)/nullif([Order_Currency].[Currency_Rate],0) ,0) else 0 end)  as Mater_Cost
            , case when IsNull(Producing_Cost,0) <> 0 then 0 else od.[Factory_Price] end as Factory_Price
            , IsNull([Producing_Cost],0) AS Producing_Cost
            , IsNull(od.PCost_Standard,0) AS PCost_Standard, IsNull(od.PCost_Others,0) AS PCost_Others
            , IsNull(od.[Overhead],0) AS Overhead
            , isnull(isnull([PO_Currency].[Currency_Rate],0)/nullif([Order_Currency].[Currency_Rate],0),0) as Passing_Rate
            , IsNull(od.Unit_Price,0) 
            + (isnull([T_Rate],0) * isnull(od.[Unit_Price],0)) 
            + (IsNull([T_Commission_Rate],0) * isnull(od.[Unit_Price],0)) 
            -- - (case when MTR_Amount <> 0 And p.[Purchase_Project_No] is not null then isnull(p.[MTR_Amount]/nullif(p.[Qty],0)/nullif([Order_Currency].[Currency_Rate],0) ,0) else 0 end) 
            - isnull(p.[MTR_Amount]/nullif(p.[Qty],0)/nullif([Order_Currency].[Currency_Rate],0) ,0) 
            - (case when IsNull(Producing_Cost,0) <> 0 then 0 else isnull(od.[Factory_Price] * isnull([PO_Currency].[Currency_Rate],0)/nullif([Order_Currency].[Currency_Rate],0) ,0) end) 
            - (IsNull([Producing_Cost] * isnull([PO_Currency].[Currency_Rate],0)/nullif([Order_Currency].[Currency_Rate],0),0)) 
            - (IsNull(od.[Overhead] * isnull([PO_Currency].[Currency_Rate],0)/nullif([Order_Currency].[Currency_Rate],0),0)) as Unit_Income
         , p.Factory_SubID , p.Re_Order, Order_Currency.Currency_Symbol AS Order_Currency_Symbol, PO_Currency.Currency_Symbol AS PO_Currency_Symbol
         FROM @Orders o
         INNER JOIN @Order_Detail od On  od.Order_No = o.Order_No
         INNER JOIN @Produce p On p.Produce_No = od.Produce_No
         INNER JOIN @Product pc ON od.Product_No = pc.Product_No
         LEFT JOIN (Select Order_DetailID, sum([T_Commission_Rate]) as T_Commission_Rate from @Commission Group by Order_DetailID) as c ON od.Order_DetailID = c.Order_DetailID
         LEFT JOIN (Select Order_DetailID, sum([T_Rate]) as T_Rate from @Expense Group by Order_DetailID) as e ON od.Order_DetailID = e.Order_DetailID
         INNER JOIN @tmpCurrency_Rate Order_Currency ON o.Currency = Order_Currency.Currency
         INNER JOIN @tmpCurrency_Rate PO_Currency ON o.PO_Currency = PO_Currency.Currency
         GROUP BY od.Order_No, od.Produce_No, Orig_Shipping_Date, od.Product_No, pc.Style_No, pc.Product_Type, pc.name, pc.Sketch_Month, pc.Photo_Month, T_Rate, T_Commission_Rate, p.Qty, Unit_Price, Factory_Price
         , Producing_Cost, PCost_Standard, PCost_Others , Overhead , Factory_SubID , Re_Order, p.MTR_Amount, p.Purchase_Project_No
         , Order_Currency.Currency_Rate, PO_Currency.Currency_Rate, Order_Currency.Currency_Symbol, PO_Currency.Currency_Symbol
      ) tmp
      SELECT
      0 as SortID, ad.Order_No, ad.Produce_No, convert(varchar(10),ad.Orig_Shipping_Date,111) as Orig_Shipping_Date, ad.Product_No, ad.Style_No, ad.Article_Name, ad.Sketch_Month, ad.Photo_Month
      , case when isnull(ad.Qty,0) = 0 then '' else Format(ad.Qty,'N0') End AS Qty
      , case when isnull(ad.Unit_Price,0) = 0 then '' else ad.Order_Currency_Symbol + ' ' + Format(ad.Unit_Price,'N2') End as Unit_Price
      , case when isnull(ad.O_Expense,0) = 0 then '' else ad.Order_Currency_Symbol + ' ' + Format(ad.O_Expense,'N2') End as O_Expense
      , case when isnull(ad.O_Commission,0) = 0 then '' else ad.Order_Currency_Symbol + ' ' + Format(ad.O_Commission,'N2') End as O_Commission
      , case when isnull(ad.Mater_Cost,0) = 0 then '' else ad.Order_Currency_Symbol + ' ' + Format(ad.Mater_Cost ,'N2') End as Mater_Cost
      , cast(ad.Mater_Cost as varchar) as Mater_Cost1
      , case when isnull(ad.Factory_Price,0) = 0 then '' else ad.PO_Currency_Symbol + ' ' + Format(ad.Factory_Price,'N2') End as Factory_Price
      , case when isnull(ad.Producing_Cost,0) = 0 then '' else ad.PO_Currency_Symbol + ' ' + Format(ad.Producing_Cost,'N2') End AS Producing_Cost
      , case when isnull(ad.PCost_Standard,0) = 0 then '' else Format(ad.PCost_Standard,'N2') End AS PCost_Standard
      , case when isnull(ad.PCost_Others,0) = 0 then '' else Format(ad.PCost_Others,'N2') End AS PCost_Others
      , case when isnull(ad.Overhead,0) = 0 then '' else ad.PO_Currency_Symbol + ' ' + Format(ad.[Overhead],'N2') End AS Overhead
      , case when isnull(ad.Unit_Income,0) = 0 then '' else ad.Order_Currency_Symbol + ' ' + Format(ad.Unit_Income,'N2') End as Unit_Income
      , case when isnull(ad.Income,0) = 0 then '' else ad.Order_Currency_Symbol + ' ' + Format(ad.Income,'N2') End as Income
      , ad.Factory_SubID , ad.Re_Order, isnull((ad.Income) / nullif((ad.Unit_Price * ad.Qty),0),0) * 100 as Income_Rate
      FROM @Approve_Detail ad
   union
   Select
      1 as SortID, '' as Order_No, '' as Produce_No, '' as Orig_Shipping_Date, '' as Product_No, ad.Product_Type as Style_No, 'Total:' as Article_Name, '' as Sketch_Month, '' as Photo_Month
   , Format(isnull(sum(ad.Qty),0),'N0') + ' PRS' AS Qty
   , ad.Order_Currency_Symbol + ' ' + Format(isnull(Sum(ad.Unit_Price * ad.Qty),0) ,'N2') as Unit_Price
   , ad.Order_Currency_Symbol + ' ' + Format(isnull(Sum(ad.O_Expense * ad.Qty),0),'N2') as O_Expense
   , ad.Order_Currency_Symbol + ' ' + Format(isnull(Sum(ad.O_Commission * ad.Qty),0),'N2') as O_Commission
   , ad.Order_Currency_Symbol + ' ' + Format(isnull(Sum(ad.Mater_Cost * ad.Qty),0),'N2') as Mater_Cost
   , ad.Order_Currency_Symbol + ' ' + Format(isnull(Sum(ad.Mater_Cost * ad.Qty),0),'N2') as Mater_Cost1
   , ad.PO_Currency_Symbol + ' ' + Format(isnull(Sum(ad.Factory_Price * ad.Qty),0),'N2') as Factory_Price
   , ad.PO_Currency_Symbol + ' ' + Format(isnull(Sum(ad.Producing_Cost * ad.Qty),0),'N2') AS Producing_Cost
   , '' AS PCost_Standard, '' AS PCost_Others, '' AS Overhead
   , '' AS Unit_Income
   , ad.Order_Currency_Symbol + ' ' + Format(isnull(Sum(ad.Income),0), 'N2') as Income
   , ad.Factory_SubID , 0 as Re_Order, 0 as Income_Rate
   FROM @Approve_Detail ad
   Group by Factory_SubID, ad.Order_Currency_Symbol, ad.PO_Currency_Symbol, ad.Product_Type
   union
   Select
      2 as SortID, '' as Order_No, '' as Produce_No, '' as Orig_Shipping_Date, '' as Product_No, 'Grand' as Style_No, 'Total:' as Article_Name, '' as Sketch_Month, '' as Photo_Month
   , Format(isnull(sum(ad.Qty),0),'N0') + ' PRS' AS Qty
   , ad.Order_Currency_Symbol + ' ' + Format(isnull(Sum(ad.Unit_Price * ad.Qty),0) ,'N2') as Unit_Price
   , ad.Order_Currency_Symbol + ' ' + Format(isnull(Sum(ad.O_Expense * ad.Qty),0),'N2') as O_Expense
   , ad.Order_Currency_Symbol + ' ' + Format(isnull(Sum(ad.O_Commission * ad.Qty),0),'N2') as O_Commission
   , ad.Order_Currency_Symbol + ' ' + Format(isnull(Sum(ad.Mater_Cost * ad.Qty),0),'N2') as Mater_Cost
   , ad.Order_Currency_Symbol + ' ' + Format(isnull(Sum(ad.Mater_Cost * ad.Qty),0),'N2') as Mater_Cost1
   , ad.PO_Currency_Symbol + ' ' + Format(isnull(Sum(ad.Factory_Price * ad.Qty),0),'N2') as Factory_Price
   , ad.PO_Currency_Symbol + ' ' + Format(isnull(Sum(ad.Producing_Cost * ad.Qty),0),'N2') AS Producing_Cost
   , '' AS PCost_Standard, '' AS PCost_Others, '' AS Overhead
   , '' AS Unit_Income
   , ad.Order_Currency_Symbol + ' ' + Format(isnull(Sum(ad.Income),0), 'N2') as Income
   , ad.Factory_SubID , 0 as Re_Order, 0 as Income_Rate
   FROM @Approve_Detail ad
   Group by Factory_SubID, ad.Order_Currency_Symbol, ad.PO_Currency_Symbol
   union
   Select
      3 as SortID, '' as Order_No, '' as Produce_No, '' as Orig_Shipping_Date, '' as Product_No, '' as Style_No, 'Average:' as Article_Name, '' as Sketch_Month, '' as Photo_Month
   , '' AS Qty
   , ad.Order_Currency_Symbol + ' ' + Format(isnull(Sum(ad.Unit_Price * ad.Qty) / nullif(sum(ad.Qty),0),0) ,'N2') as Unit_Price
   , ad.Order_Currency_Symbol + ' ' + Format(isnull(Sum(ad.O_Expense * ad.Qty) / nullif(sum(ad.Qty),0),0),'N2') as O_Expense
   , ad.Order_Currency_Symbol + ' ' + Format(isnull(Sum(ad.O_Commission * ad.Qty) / nullif(sum(ad.Qty),0),0),'N2') as O_Commission
   , ad.Order_Currency_Symbol + ' ' + Format(isnull(Sum(ad.Mater_Cost * ad.Qty) / nullif(sum(ad.Qty),0),0) ,'N2') as Mater_Cost
   , ad.Order_Currency_Symbol + ' ' + Format(isnull(Sum(ad.Mater_Cost * ad.Qty) / nullif(sum(ad.Qty),0),0) ,'N2') as Mater_Cost1
   , ad.PO_Currency_Symbol + ' ' + Format(isnull(Sum(ad.Factory_Price * ad.Qty) / nullif(sum(ad.Qty),0),0),'N2') as Factory_Price
   , ad.PO_Currency_Symbol + ' ' + Format(isnull(Sum(ad.Producing_Cost * ad.Qty) / nullif(sum(ad.Qty),0),0),'N2') AS Producing_Cost
   , '' AS PCost_Standard, '' AS PCost_Others, '' AS Overhead
   , '' AS Unit_Income
   , ad.Order_Currency_Symbol + ' ' + Format(isnull(Sum(ad.Income) / nullif(sum(ad.Qty),0),0), 'N2') as Income
   , ad.Factory_SubID , 0 as Re_Order, 0 as Income_Rate
   FROM @Approve_Detail ad
   Group by Factory_SubID, ad.Order_Currency_Symbol, ad.PO_Currency_Symbol
   union
   Select
      4 as SortID, '' as Order_No, '' as Produce_No, '' as Orig_Shipping_Date, '' as Product_No, '' as Style_No, 'Rate:' as Article_Name, '' as Sketch_Month, '' as Photo_Month
   , '' AS Qty
   , '' as Unit_Price
   , Format(isnull(Sum(ad.O_Expense * ad.Qty) / nullif(Sum(ad.Unit_Price * ad.Qty),0),0) * 100,'N2') + '%' as O_Expense
   , Format(isnull(Sum(ad.O_Commission * ad.Qty) / nullif(Sum(ad.Unit_Price * ad.Qty),0),0) * 100,'N2') + '%' as O_Commission
   , Format(isnull(Sum(ad.Mater_Cost * ad.Qty) / nullif(Sum(ad.Unit_Price * ad.Qty),0),0) * 100,'N2') + '%' as Mater_Cost
   , Format(isnull(Sum(ad.Mater_Cost * ad.Qty) / nullif(Sum(ad.Unit_Price * ad.Qty),0),0) * 100,'N2') + '%' as Mater_Cost1
   , Format(isnull(Sum(ad.Factory_Price * ad.Qty) / nullif(Sum(ad.Unit_Price * ad.Qty),0),0) * 100,'N2') + '%' as Factory_Price
   , Format(isnull(Sum(ad.Producing_Cost * ad.Qty) / nullif(Sum(ad.Unit_Price * ad.Qty),0),0) * 100,'N2') + '%' AS Producing_Cost
   , '' AS PCost_Standard, '' AS PCost_Others, '' AS Overhead
   , '' AS Unit_Income
   , Format(isnull(Sum(ad.Income) / nullif(Sum(ad.Unit_Price * ad.Qty),0),0) * 100, 'N2') + '%' as Income
   , ad.Factory_SubID , 0 as Re_Order, 0 as Income_Rate
   FROM @Approve_Detail ad
   Group by Factory_SubID
   Order by Factory_SubID, SortID, Order_No, Produce_No, Orig_Shipping_Date, Product_No, Style_No, Article_Name
End  

-- 4 Report Detail's WorkShop name
Select Style_No, Workshop_Abbreviation, Workshop from @Product_Process Group by Style_No, Workshop_Abbreviation, Workshop

-- 5 Report Detail's WorkShop Summary
Select Factory_SubID, Workshop_Abbreviation, Workshop from @Product_Process Group by Factory_SubID, Workshop_Abbreviation, Workshop

--6
SELECT count(*) as Locked_Count
FROM (Select distinct Order_DetailID From @Order_Detail) od 
Inner Join PDSP_Detail pd With(Nolock,NoWait) on od.Order_DetailID = pd.Order_DetailID
Inner Join [dbo].[PDSP] p With(Nolock,NoWait) on p.Shipment_No = pd.Shipment_No
where isnull(convert(varchar(20),p.Accounting_Lock_Date,120),'') != '';

--7 Other Expense Group by Order_No
if(@Mode = 0)
Begin
   Select p.Factory_SubID, od.Order_No, convert(varchar(10),od.Orig_Shipping_Date,111) as Orig_Shipping_Date, pc.Style_No, pc.Name AS Article_Name
   , case when isnull(od.Qty,0) = 0 then '' else Format(od.Qty,'N0') End AS Qty
   , case when isnull(od.Unit_Price,0) = 0 then '' else Order_Currency.Currency_Symbol + ' ' + Format(od.Unit_Price,'N2') End as Unit_Price
   , case when isnull(od.Factory_Price,0) = 0 then '' else PO_Currency.Currency_Symbol + ' ' + Format(od.Factory_Price,'N2') End as Factory_Price
   , c.CustomerID, c.Category, Format(IsNull((c.T_Rate * od.Unit_Price),0),'N3')as O_Expense, c.Description
   from @Expense c
   Inner Join @Order_Detail od on od.Order_DetailID = c.Order_DetailID
   Inner Join @Orders o on o.Order_No = od.Order_No
   INNER JOIN @tmpCurrency_Rate Order_Currency ON o.Currency = Order_Currency.Currency
   INNER JOIN @tmpCurrency_Rate PO_Currency ON o.PO_Currency = PO_Currency.Currency
   INNER JOIN @Produce p On p.Produce_No = od.Produce_No
   INNER JOIN @Product pc ON od.Product_No = pc.Product_No
   Group by p.Factory_SubID, od.Order_No, od.Orig_Shipping_Date, pc.Style_No, pc.Name
   , case when isnull(od.Unit_Price,0) = 0 then '' else Order_Currency.Currency_Symbol + ' ' + Format(od.Unit_Price,'N2') End
   , case when isnull(od.Factory_Price,0) = 0 then '' else PO_Currency.Currency_Symbol + ' ' + Format(od.Factory_Price,'N2') End
   , c.CustomerID, c.Category, c.Description
   , Format(IsNull((c.T_Rate * od.Unit_Price),0),'N3')
   , case when isnull(od.Qty,0) = 0 then '' else Format(od.Qty,'N0') End
End
Else 
Begin
   Select p.Factory_SubID, od.Order_No, p.Produce_No, od.Product_No, convert(varchar(10),od.Orig_Shipping_Date,111) as Orig_Shipping_Date, pc.Style_No, pc.Name AS Article_Name
   , case when isnull(od.Unit_Price,0) = 0 then '' else Order_Currency.Currency_Symbol + ' ' + Format(od.Unit_Price,'N2') End as Unit_Price
   , case when isnull(od.Factory_Price,0) = 0 then '' else PO_Currency.Currency_Symbol + ' ' + Format(od.Factory_Price,'N2') End as Factory_Price
   , case when isnull(od.Producing_Cost,0) = 0 then '' else PO_Currency.Currency_Symbol + ' ' + Format(od.Producing_Cost,'N2') End AS Producing_Cost
   , case when isnull(od.PCost_Standard,0) = 0 then '' else Format(od.PCost_Standard,'N2') End AS PCost_Standard
   , case when isnull(od.PCost_Others,0) = 0 then '' else Format(od.PCost_Others,'N2') End AS PCost_Others
   , case when isnull(od.Overhead,0) = 0 then '' else PO_Currency.Currency_Symbol + ' ' + Format(od.[Overhead],'N2') End AS Overhead
   , c.CustomerID, c.Category, Format(IsNull(Sum(c.T_Rate * od.Unit_Price),0),'N3') as O_Expense, c.Description 
   from @Expense c 
   Inner Join @Order_Detail od on od.Order_DetailID = c.Order_DetailID 
   Inner Join @Orders o on o.Order_No = od.Order_No
   INNER JOIN @tmpCurrency_Rate Order_Currency ON o.Currency = Order_Currency.Currency
   INNER JOIN @tmpCurrency_Rate PO_Currency ON o.PO_Currency = PO_Currency.Currency
   INNER JOIN @Produce p On p.Produce_No = od.Produce_No
   INNER JOIN @Product pc ON od.Product_No = pc.Product_No  
   Group by p.Factory_SubID, od.Order_No, p.Produce_No, od.Product_No, od.Orig_Shipping_Date, pc.Style_No, pc.Name
   , case when isnull(od.Unit_Price,0) = 0 then '' else Order_Currency.Currency_Symbol + ' ' + Format(od.Unit_Price,'N2') End 
   , case when isnull(od.Factory_Price,0) = 0 then '' else PO_Currency.Currency_Symbol + ' ' + Format(od.Factory_Price,'N2') End 
   , case when isnull(od.Producing_Cost,0) = 0 then '' else PO_Currency.Currency_Symbol + ' ' + Format(od.Producing_Cost,'N2') End 
   , case when isnull(od.PCost_Standard,0) = 0 then '' else Format(od.PCost_Standard,'N2') End 
   , case when isnull(od.PCost_Others,0) = 0 then '' else Format(od.PCost_Others,'N2') End 
   , case when isnull(od.Overhead,0) = 0 then '' else PO_Currency.Currency_Symbol + ' ' + Format(od.[Overhead],'N2') End    
   , c.CustomerID, c.Category, c.Description 
End

--8 Part of Material Cost 
if(@Mode = 1)
Begin
  Select tmp.Order_No, tmp.Produce_No, pcg.Component_GroupID, case when pcg.Component_GroupID = 4 then 'Others' else pcg.Component_Group End as Component_Group
  , SUM(sd.Material_Cost / isnull(tmp.Currency_Rate,1)) as Part_MTR_Cost
  From (
    Select p.Produce_No
    , case 
        when pd.Component_GroupID = 1 then 1
        when pd.Component_GroupID = 2 then 1
        when pd.Component_GroupID = 6 then 1
        when pd.Component_GroupID = 7 then 1
        when pd.Component_GroupID = 9 then 1
        when pd.Component_GroupID = 13 then 1
        when pd.Component_GroupID = 14 then 1
        when pd.Component_GroupID = 3 then 3
        when pd.Component_GroupID = 4 then 4
        when pd.Component_GroupID = 5 then 4
      End as Component_GroupID
    , case when p.Qty = 0 then 0 else ( pd.T_Net_Qty * pd.Unit_Price / p.Qty * isnull(P_Currency.Currency_Rate,1) ) End as Material_Cost
    From @Produce p 
    Inner Join Produce_Detail pd with(NoLock,NoWait) on p.Produce_No = pd.Produce_No
    INNER JOIN @tmpCurrency_Rate P_Currency ON pd.Currency = P_Currency.Currency
    Where ABS(pd.Master_Purchase_Item) <> 1
  ) sd
  Inner Join ( 
    Select distinct o.Order_No, od.Produce_No, Order_Currency.Currency_Rate
    From @Produce t
    Inner Join @Order_Detail od on t.Produce_No = od.Produce_No
    Inner Join @Orders o on o.Order_No = od.Order_No
    Inner Join @tmpCurrency_Rate Order_Currency ON o.Currency = Order_Currency.Currency
  ) tmp on tmp.Produce_No = sd.Produce_No
  Inner Join Product_Component_Group pcg with(NoLock,NoWait) on pcg.Component_GroupID = sd.Component_GroupID
  Group by tmp.Order_No, tmp.Produce_No, pcg.Component_GroupID, pcg.Component_Group;
End

--9
Select sum(Income) as Total_Amount From @Approve_Detail
`, req.body);
//console.log(strSQL);
   db.sql(req.SiteDB, strSQL)
   .then(async(result)=>{
   var Total_Amount = req.body.Mode == 1 ? result.recordsets[9][0].Total_Amount : result.recordsets[8][0].Total_Amount;
   await result.recordsets[0].forEach((item)=>{
      var Detail = [];  
      var Detail_Total = [];        
      var Dataset = {}
      
   //    result.recordsets[4].forEach((obj)=>{ 
   //    if(item.Factory_SubID == obj.Factory_SubID) {
   //       Dataset[`${obj.Workshop_Abbreviation}`] = 0
   //    }           
   //   });

      result.recordsets[3].forEach((obj)=>{ 
      // var WorkShop = [];
      obj.Income_Rate = Math.round((obj.Income_Rate)*100)/100;
      // result.recordsets[5].forEach((obj5)=>{
      //    if(obj.Order_No == obj5.Order_No && obj.Product_No == obj5.Product_No && obj.Factory_SubID == obj5.Factory_SubID) {
      //       Dataset[`${obj.Workshop_Abbreviation}`] = obj.Labor_Cost
      //       WorkShop.push(Dataset)
      //    }            
      // });

      // if(item.Factory_SubID == obj.Factory_SubID && obj.SortID === 0) {
      //    obj.WorkShop = WorkShop;
      // }

      //依工廠分類
      //將報表細項內容(obj.SortID === 0) 
      //以提供前端顯示                
      if(item.Factory_SubID == obj.Factory_SubID && obj.SortID === 0 ) {
         obj.Order_Other_Expense = [];
         result.recordsets[7].forEach((data)=>{
            if((req.body.Mode == 0 &&
            (data.Factory_SubID == obj.Factory_SubID 
            && data.Order_No == obj.Order_No 
            && data.Orig_Shipping_Date == obj.Orig_Shipping_Date
            && data.Style_No == obj.Style_No
            && data.Name == obj.Name
            && data.Qty == obj.Qty
            && data.Unit_Price == obj.Unit_Price
            && data.Factory_Price == obj.Factory_Price)) ||
            (req.body.Mode == 1 &&
               (data.Factory_SubID == obj.Factory_SubID 
                  && data.Order_No == obj.Order_No 
                  && data.Produce_No == obj.Produce_No
                  && data.Product_No == obj.Product_No
                  && data.Orig_Shipping_Date == obj.Orig_Shipping_Date
                  && data.Style_No == obj.Style_No
                  && data.Name == obj.Name
                  && data.Unit_Price == obj.Unit_Price
                  && data.Factory_Price == obj.Factory_Price
                  && data.Producing_Cost == obj.Producing_Cost
                  && data.PCost_Standard == obj.PCost_Standard
                  && data.PCost_Others == obj.PCost_Others
                  && data.Overhead == obj.Overhead
                  ))
            ) {
               obj.Order_Other_Expense.push({CustomerID:data.CustomerID
                  , Description:data.Description
                  , O_Expense:data.O_Expense
                  , CustomerID:data.CustomerID
                })
            }
            })
         obj.Part_Material = req.body.Mode == 1 ? result.recordsets[8].filter((data)=>(data.Order_No == obj.Order_No && data.Produce_No == obj.Produce_No)).map((o)=>({Component_Group:o.Component_Group, Part_MTR_Cost: Math.floor(o.Part_MTR_Cost * 100)/100}))  : [];
         
         var cost = 0
         obj.Part_Material.forEach((o)=>{
          if(o.Component_Group != 'Others'){
            cost += o.Part_MTR_Cost;
          }
         })
         obj.Part_Material.forEach((o)=>{
          if(o.Component_Group == 'Others'){
             o.Part_MTR_Cost =  obj.Mater_Cost1 - cost;
             o.Part_MTR_Cost = o.Part_MTR_Cost > 0 ? Math.round(o.Part_MTR_Cost * 100) / 100 : 0  
          }
         })
         
         Detail.push(obj);
      }
      //依工廠分類 
      //將報表細項的Total (obj.SortID = 1) , Average (obj.SortID = 2) , Rate (obj.SortID = 3) 
      //以提供前端顯示
      if(item.Factory_SubID == obj.Factory_SubID && obj.SortID > 0) {
         Detail_Total.push(obj);
      }
      })
      item.Detail = Detail;
      item.Detail_Total = Detail_Total;
   })
      //console.log('Dataset:',Dataset)
      await res.send({Dataset: result.recordsets[0]
         , Currency_Rate: result.recordsets[1]
         , Expense: result.recordsets[2]
         , Style_Process_Detail: result.recordsets[4]
         , Style_Process: result.recordsets[5]
         , Locked_Count: result.recordsets[6][0].Locked_Count
         , Total_Amount: Math.round((Total_Amount)*100)/100
      });
   }).catch((err)=>{
   console.log(err);
   res.status(500).send(err);
   }) 

}); 

//Maintain Approve Comment
router.post('/OA_Comment_Maintain',  function (req, res, next) {
   console.log("Call OA_Comment_Maintain Api:",req.body);   
   var strSQL = "";

   // req.body.Mode === 0 表示新增 
   // req.body.Mode === 1 表示修改 
   // req.body.Mode === 2 表示刪除

   switch(req.body.Mode) {
      case 0:
      break;
      case 1:
         var fieldSize = 0;
         switch(req.body.Name) {
            case 'CEO_Comment':
            case 'First_Level_Supervisor_Comment':
            case 'Department_Supervisor_Comment':
            case 'Section_Supervisor_Comment':
            case 'User_Comment':
               fieldSize = 65535;
            break;
         }         
         req.body.Value = fieldSize > 0 ? (req.body.Value ? `N'${req.body.Value.trim().substring(0,fieldSize).replace(/'/g, "''")}'` : `''`) : req.body.Value;

         strSQL = format(` Declare @Locked_Count int = 0;
         SELECT @Locked_Count = count(*) 
         FROM Produce o With(Nolock,NoWait)
         Inner Join Order_Detail od With(Nolock,NoWait) on o.Produce_No = od.Produce_No
         Inner Join PDSP_Detail pd With(Nolock,NoWait) on od.Order_DetailID = pd.Order_DetailID
         Inner Join [dbo].[PDSP] p With(Nolock,NoWait) on p.Shipment_No = pd.Shipment_No
         where o.[Order_ApproveID] = {Order_ApproveID}
         And isnull(convert(varchar(20),p.Accounting_Lock_Date,120),'') != '';

         Update [dbo].[Order_Approve] Set [{Name}] = {Value}
         where Order_ApproveID = {Order_ApproveID}
         ;
         
         `, req.body);

      break;
      case 2:
      break;
   }

   strSQL += format(`
   Select @@ROWCOUNT as Flag, {Order_ApproveID} AS Order_ApproveID;
   `, req.body);

   //console.log(strSQL)
   db.sql(req.SiteDB, strSQL)
      .then((result) => {
         res.send({Flag:result.recordsets[0][0].Flag > 0, Order_ApproveID:result.recordsets[0][0].Order_ApproveID});
      }).catch((err) => {
         console.log(err);
         res.status(500).send(err);
      })

});


/* Mark-Wang API End */


/* Darren-Chang API Begin */

/* Darren-Chang API End */

module.exports = router;