var express = require('express');
var router = express.Router();
const format = require('string-format');
var db = require('../../config/DB_Connect');
const cloneDeep = require('lodash/cloneDeep');


/* Mark-Wang API Begin */

//Get Currency
router.post('/Currency', function (req, res, next) {
   console.log("Call Order Currency Api :", req.body);
   req.body.PO_No = req.body.PO_No ? req.body.PO_No.replace(/'/g, "''") : '';
   var strSQL = format(`
   Declare @Currency_Date DateTime;

   Select @Currency_Date = case when N'{PO_No}' = 'Insert' then GetDate() else isnull((Select Date from PPO Where PO_No = N'{PO_No}'),GetDate()) end
   
   SELECT p.[Currency]
   , (isnull(p.[Currency],'') + ' ' + isnull(cast(Currency_Rate as varchar),'')) as Currency_Rate
   , isnull(Currency_Rate,0) as Rate
     FROM Currency as p with(NoLock, NoWait)
   inner Join [dbo].[@Currency_Rate] c on c.Currency = p.Currency And c.Exchange_Date = convert(Date, @Currency_Date)
    `
   , req.body );
   //console.log(strSQL);  

   db.sql(req.SiteDB, strSQL)
      .then((result) => {
         res.send(result.recordset);
      }).catch((err) => {
         console.log(err);
         res.status(500).send(err);
      })

});

//Check PO_No
router.post('/Check_PO_No',  function (req, res, next) {
   console.log("Call Check_PO_No Api:",req.body);

   req.body.PO_No = req.body.PO_No ? `${req.body.PO_No.trim().substring(0,10).replace(/'/g, '')}` : '';

   var strSQL = format(`
   SELECT Count(*) as RecCount
   FROM [dbo].[PPO] With(Nolock,NoWait)
   where ([PO_No] = N'{PO_No}')
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


//Get PPO_List
router.post('/PPO_List',  function (req, res, next) {
   console.log("Call PPO_List Api:");
   req.body.PO_No = req.body.PO_No ? `${req.body.PO_No.trim().substring(0,10).replace(/'/g, '')}` : '';
   req.body.FactoryID = req.body.FactoryID ? `${req.body.FactoryID.trim().substring(0,15).replace(/'/g, '')}` : '';
   req.body.Date = req.body.Date ? `${req.body.Date.replace(/'/g, '')}` : '';
   req.body.UserID = req.body.UserID ? `${req.body.UserID.trim().substring(0,255).replace(/'/g, '')}` : '';

   var strSQL = format(`
   SELECT Top 1000 row_number() Over(Order By Date desc) as RecNo
   ,[PO_No] 
   ,PPO.[FactoryID]
   ,convert(varchar(10) ,[Date] ,111) as [Date] 
   ,[UserID]
   , (case When f.FactoryID = 'PH' then '1' else '0' end) as Print_UI_Flag
   FROM [dbo].[PPO] With(Nolock,NoWait)
   Left Outer Join Factory_Sub f with(NoLock,NoWait) on PPO.FactoryID = f.Factory_SubID
   where (N'{PO_No}' = '' or [PO_No] like N'{PO_No}%')
   And (N'{FactoryID}' = '' or PPO.FactoryID like N'{FactoryID}%')
   And (N'{Date}' = '' or convert(varchar(10),[Date],111) like N'%{Date}%')
   And (N'{UserID}' = '' or [UserID] like N'{UserID}%')
   Order By Date desc, PO_No, UserID
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

//PPO Detail Add
router.post('/PPO_Detail_Add', function (req, res, next) {
   console.log("Call PPO_Detail_Add Api :", req.body);

   req.body.PO_No = req.body.PO_No ? `N'${req.body.PO_No.trim().substring(0,10).replace(/'/g, "''")}'` : `''`; 
   req.body.QueryData = req.body.QueryData ? `N'${req.body.QueryData.trim().replace(/'/g, "''")}'` : `''`; 

   var strSQL = format(` 
   Select top 1000 row_number() Over(Order By od.Order_No, od.Product_No, od.Produce_No) as RecNo
  , od.Order_DetailID
  , 0 as Selected
  , od.Destination
  , odr.Ref_No
  , od.Order_No, od.Produce_No, s.Purchase_Project_No, od.Product_No, o.PO_Currency, o.Department, '' as Query, o.UserID
   From PPO p with(NoLock,NoWait)
   Inner Join Order_Detail od with(NoLock,NoWait) on p.FactoryID = od.Factory_ID And isnull(od.PO_No,'') = ''
   Inner Join Order_Detail_Ref odr with(NoLock,NoWait) on od.Order_Detail_RefID = odr.Order_Detail_RefID
   Inner Join Orders o with(NoLock,NoWait) on o.Order_No = od.Order_No And p.Currency = o.PO_Currency
   Left Outer Join Produce s with(NoLock,NoWait) on od.Produce_No = s.Produce_No
   Left Outer Join Order_Approve oa with(NoLock,NoWait) on s.Order_ApproveID = oa.Order_ApproveID --And oa.Approve_Date is not null
   Where p.PO_No = {PO_No}
   And ({QueryData} = '' or charindex({QueryData}, isnull(o.Order_No,'') + ' ' + isnull(od.Destination,'') + ' ' + ' ' + isnull(odr.Ref_No,'') + ' ' + ' ' + isnull(s.Produce_No,'') + ' ' + isnull(s.Purchase_Project_No,'') + ' ' + isnull(s.Product_No,'') + ' ' + isnull(o.PO_Currency,'') + ' ' + isnull(o.Department,'') + ' ' + isnull(o.UserID,'')) > 0)
   Group by od.Order_DetailID, od.Order_No, od.Destination, odr.Ref_No, od.Produce_No, s.Purchase_Project_No, od.Product_No, o.PO_Currency, o.Department, o.UserID;
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

//Get PPO_Info
router.post('/PPO_Info',  function (req, res, next) {
   console.log("Call PPO_Info Api:",req.body);

   req.body.PO_No = req.body.PO_No ? `N'${req.body.PO_No.trim().substring(0,10).replace(/'/g, "''")}'` : `''`; 

   //Mode == 0 Get PPO All Data
   //Mode == 1 Get PPO Master Data
   //Mode == 2 Get PPO Detail Data
   //Mode == 3 Get PPO Amount and Commodity Data
   var strSQL = format(`
   Declare @Mode int = {Mode}
   Declare @PO_No Varchar(18) = {PO_No}
      
   --0 Get PPO All Data
   --1 Get PPO Master Data
   if(@Mode = 0 or @Mode = 1)
   Begin
      Select [PO_No]
      , convert(varchar(10),[Date],111) as [Date]
      , [UserID]
      , o.[FactoryID] as Factory_SubID
      , o.[OrganizationID]
      , [Messrs]
      , [Messrs_Address]
      , [Payment_Term]
      , [Pay_Type]
      , [Pay_Days]
      , [By_Doc_Rcv]
      , [Term_Price]
      , [Shipment_Port] 
      , [Destination_Port] 
      --, Format(Amount,'N2') as Amount
      , [Commodity]
      , [Main_Mark]
      , [Side_Mark]
      , [Remark]
      , o.[Currency]
      , (case When f.FactoryID = 'PH' then '1' else '0' end) as Print_UI_Flag
      , (Select Currency_Rate from dbo.[@Currency_Rate] r with(NoLock,NoWait) Where r.Currency = o.Currency and r.Exchange_Date = convert(Date, o.Date) ) as Currency_Rate
      , (Select r.Currency_Symbol from Currency r with(NoLock,NoWait) Where r.Currency = o.Currency ) as Currency_Symbol
      , isnull(Approve,'') as Approve
      , case when len(isnull(Approve,'')) > 0 then 1 else 0 end as Approve_Chk
      , convert(varchar(10),o.[Data_Update],111) as [Data_Update]
      , o.[Data_Updater] 
      from PPO o with(NoLock,NoWait)
      Left Outer Join Factory_Sub f with(NoLock,NoWait) on o.FactoryID = f.Factory_SubID
      Where PO_No = @PO_No
   End
   
   --2 Get PPO Detail Data
   if(@Mode = 0 or @Mode = 2)
   Begin   
      Select row_number() Over(Order By od.Order_No, od.Product_No, od.Produce_No) as RecNo
      , od.Order_DetailID
      , od.Order_No
      , od.Product_No
      , od.Produce_No
      , od.Destination
      , odr.Ref_No    
      , Convert(varchar(10),od.Orig_Shipping_Date,111) as Orig_Shipping_Date
      --, Convert(varchar(10),od.Est_Shipping_Date,111) as Est_Shipping_Date
      , Convert(varchar(10),oa.Approve_Date,111) as Approve_Date
      from Order_Detail od with(NoLock,NoWait) 
      Inner Join Order_Detail_Ref odr with(NoLock,NoWait) on od.Order_Detail_RefID = odr.Order_Detail_RefID
      Left Outer Join Produce p with(NoLock,NoWait) on p.Produce_No = od.Produce_No
      Left Outer Join Order_Approve oa with(NoLock,NoWait) on oa.Order_ApproveID = p.Order_ApproveID
      Where od.PO_No = @PO_No
      Group by od.Order_DetailID, od.Order_No, od.Destination, odr.Ref_No, od.Product_No, od.Produce_No, od.Orig_Shipping_Date
      --, od.Est_Shipping_Date
      , oa.Approve_Date
   End

   --3 Get PPO Amount and Commodity Data
   if(@Mode = 0 or @Mode = 3)
   Begin   
      
      Declare @S_Amount float, @Sum_Qty Float, @Order_Amount Float;
      Declare @Order_Detail table(Order_DetailID int, Qty Float, Factory_Price Float)
      
      Insert @Order_Detail
      Select od.Order_DetailID, isnull(od.Qty,0) as Qty, isnull(od.[Factory_Price],0) as [Factory_Price]
      From Orders o with(NoLock,NoWait)
      Inner Join Order_Detail od with(NoLock,NoWait) on o.Order_No = od.Order_No
      Where od.PO_No = @PO_No;
      
      Set @S_Amount = isnull( (Select sum(od.Factory_Price * od.Qty * Rate) From @Order_Detail od Inner Join Order_Detail_Expense ode on od.Order_DetailID = ode.Order_DetailID and ode.Doc = 'PO'),0);
                  
      SELECT @Sum_Qty = Sum(od.Qty), @Order_Amount = Sum(([Factory_Price]*[Qty])) FROM @Order_Detail od;
      
      Select Format(isnull(@Sum_Qty,0), 'N0') as Commodity_Qty
      , Format(isnull(@Order_Amount,0) + isnull(@S_Amount,0), 'N2') as Total_Amount
   
   End


   `, req.body) ;
   //console.log(strSQL)
   db.sql(req.SiteDB, strSQL)
      .then((result) => {
         var DataSet = {
            PPO: (req.body.Mode == 0 || req.body.Mode == 1) ? result.recordsets[0] : []
            , PPO_Detail: (req.body.Mode == 0) ? result.recordsets[1] : (req.body.Mode == 2 ? result.recordsets[0] : [])
            , Commodity_Info: (req.body.Mode == 0) ? result.recordsets[2] : (req.body.Mode == 3 ? result.recordsets[0] : [])
         }
         res.send(DataSet);
      }).catch((err) => {
         console.log(err);
         res.status(500).send(err);
      })

});

//Maintain Order Proforma Invoice
router.post('/PPO_Maintain',  function (req, res, next) {
   console.log("Call PPO_Maintain Api:",req.body);

   // req.body.Mode === 0 表示新增
   // req.body.Mode === 1 表示修改 
   // req.body.Mode === 2 表示刪除
   // req.body.Mode === 3 表示訂單加入PO
   // req.body.Mode === 4 表示訂單移出PO
   // req.body.Mode === 5 表示重整PO訂單資訊
   // req.body.Mode === 6 表示整批加入PO
   req.body.PO_No = req.body.PO_No ? `N'${req.body.PO_No.trim().substring(0,10).replace(/'/g, "''")}'` : `''`; 

   if(req.body.Mode === 0 ) {
      req.body.FactoryID = req.body.FactoryID ? `N'${req.body.FactoryID.trim().substring(0,15).replace(/'/g, "''")}'` : `''`; 
      req.body.Currency = req.body.Currency ? `N'${req.body.Currency.trim().substring(0,4).replace(/'/g, "''")}'` : `''`; 
   }

   if(req.body.Mode === 1 && 
      (req.body.Name == 'Season' || req.body.Name == 'Date' || req.body.Name == 'FactoryID'
      || req.body.Name == 'OrganizationID' 
      || req.body.Name == 'Pay_Type' || req.body.Name == 'Expiry_Date' 
      || req.body.Name == 'Commodity' || req.body.Name == 'Beneficiary' || req.body.Name == 'Currency'
      || req.body.Name == 'Remark' || req.body.Name == 'Approve') 
      ) {
      req.body.Value = req.body.Value ? `N'${req.body.Value.trim().replace(/'/g, "''")}'` : `''`; 
   }

   if(req.body.Mode === 1 && 
      (req.body.Name == 'PO_No' || req.body.Name == 'Revised_From' || req.body.Name == 'Messrs' || req.body.Name == 'Messrs_Address'
      || req.body.Name == 'Shipment_Port' || req.body.Name == 'Destination_Port' || req.body.Name == 'Term_Price' 
       )
      ) {
      var Size = 0;
      switch(req.body.Name){
         case 'PO_No':
            Size = 15;
         break;
         case 'Revised_From':
            Size = 10;
         break;
         case 'Messrs':
            Size = 100;
         break;
         case 'Messrs_Address':
            Size = 256;
         break;
         case 'Term_Price':
            Size = 80;
         break;
         case 'Shipment_Port':
            Size = 60;
         break;
         case 'Destination_Port':
            Size = 60;
         break;
      }
      req.body.Value = req.body.Value ? `N'${req.body.Value.trim().substring(0,Size).replace(/'/g, "''")}'` : `''`;      
   }

   if(req.body.Mode === 3 || req.body.Mode === 4){
      req.body.Produce_No = req.body.Produce_No ? `N'${req.body.Produce_No.trim().substring(0,20).replace(/'/g, "''")}'` : `''`; 
   }

   if(req.body.Mode === 6){
      req.body.QueryData = req.body.QueryData ? `N'${req.body.QueryData.trim().replace(/'/g, "''")}'` : `''`; 
   }

   var strSQL = 'Declare @ROWCOUNT int = 0; '
   switch(req.body.Mode){
      case 0:
         strSQL += format(`
            Declare @OrganizationID varchar(10), @Remark nvarchar(max), @Messrs nvarchar(100), @Messrs_Address nvarchar(256), @Deliver_Days_By_Sea int, @Port Varchar(25), @Country varchar(15);

            Select @Port = c.Port
            , @Country = c.Country
            , @Messrs = c.Factory_Sub_Name
            , @Messrs_Address = c.Address
            , @Deliver_Days_By_Sea = isnull(Deliver_Days_By_Sea,0)
            From Factory_Sub c WITH (NoWait, Nolock) Where c.Factory_SubID = {FactoryID};          

            set @OrganizationID = (
               Select d.OrganizationID
               from Employee e 
                  Inner Join Department d on e.DepartmentID = d.DepartmentID
                  Inner Join aspnet_Users au on e.EmployeeID = au.EmployeeID
               Where au.LoweredUserName = N'${req.UserID}'
            );

            set @Remark = '(1) 請先來確認鞋各2雙，經確認後始可下式生產。
(2) 貨品出貨前需經我方驗貨人員驗貨核準始可出貨。
(3) 如有品質不合或粗劣等現象而遭客戶索賠時應由貴方負責。
(4) 因未能準時交貨時所發生之損失由貴方負擔。
(5) 本訂單經貴方同意後視同契約。
(6) 請準時出貨，如未能準時出貨而遭客戶要求空運時，空運費由貴方承擔。
(7) 貴方同意後請於一星期內簽回此訂單。
(8) 毒物檢測必需符合歐盟規定標準，若有不符合時，一切後果由貴司負責。
';
            Insert into [dbo].[PPO] (PO_No, [Date], FactoryID, OrganizationID, Messrs, Messrs_Address
            , Pay_Type, Pay_Days, Term_Price
            , Destination_Port, Shipment_Port
            , Commodity
            , Remark, Currency, UserID, Data_Update, Data_Updater  )
            Select {PO_No} as PO_No, GetDate() as [Date], {FactoryID} as FactoryID, @OrganizationID as OrganizationID, @Messrs as Messrs, @Messrs_Address as Messrs_Address
            , 'T/T' as Pay_Type, 0 as Pay_Days, 'FOB' as Term_Price
            , 'ANY PORT' as Destination_Port, 'ANY PORT OF ' + isnull(@Country,'') as Shipment_Port
            , 'PRS OF SHOES' as Commodity
            , @Remark as Remark, {Currency} as Currency            
            , N'${req.UserID}' as UserID, GetDate() as [Data_Update], N'${req.UserID}' as Data_Updater 
            Where (SELECT Count(*) as RecCount
            FROM [dbo].[PPO] With(Nolock,NoWait)
            where [PO_No] = {PO_No}) = 0 ; 
            Set @ROWCOUNT = @@ROWCOUNT;
         `, req.body);
         break;
      case 1:        
         strSQL += format(`
         ${ req.body.Name === 'FactoryID' ? `
         Declare @Port varchar(25), @Country varchar(15), @Messrs nvarchar(100), @Messrs_Address nvarchar(256);
         Select @Port = c.Port, @Country = c.Country, @Messrs = c.Factory_Sub_Name, @Messrs_Address = c.Address
         From Factory_Sub c WITH (NoWait, Nolock) Where c.Factory_SubID = {Value};         
         `:''}
            Update [dbo].[PPO] Set [{Name}] = {Value}
            , UserID = isnull(UserID, N'${req.UserID}')
            , Data_Updater = N'${req.UserID}'
            , Data_Update = GetDate()
            ${ req.body.Name === 'FactoryID' ?  `, Destination_Port = isnull(Destination_Port,'ANY PORT'), Shipment_Port = 'ANY PORT OF ' + isnull(@Country,''), Messrs = @Messrs, Messrs_Address = @Messrs_Address `:''}
            where PO_No = {PO_No}
            ${ req.body.Name === 'PO_No' ? ` And (SELECT Count(*) as RecCount FROM PPO as p WITH (NoWait, Nolock) Where p.PO_No = {Value}) = 0 ` : "" };
            Set @ROWCOUNT = @@ROWCOUNT;
         `, req.body);
         break;
      case 2:
         strSQL += format(`
            Update Order_Detail set PO_No = null
            Where PO_No = {PO_No}
            
            Delete FROM [dbo].[PPO] 
            where PO_No = {PO_No} 
            And (Select count(*) From Order_Detail o with(NoLock,NoWait) Where o.PO_No = {PO_No}) = 0

            Set @ROWCOUNT = @@ROWCOUNT; 
         `, req.body);
         break;
      case 3:
      case 4:
         strSQL += format(`
         Update Order_Detail Set PO_No = ${ req.body.Mode == 3 ? '{PO_No}':'null' }
         Where Order_DetailID = {Order_DetailID};
         Set @ROWCOUNT = @@ROWCOUNT;
         `, req.body);      
         break;
      case 5:
         strSQL += format(`
         Declare @PO_No varchar(15) = {PO_No};
         Declare @S_Amount float, @Sum_Qty Float, @Order_Amount Float;
         Declare @Order_Detail table(Order_DetailID int, Qty Float, Factory_Price Float)
         
         Insert @Order_Detail
         Select od.Order_DetailID, isnull(od.Qty,0) as Qty, isnull(od.[Factory_Price],0) as [Factory_Price]
         From Orders o with(NoLock,NoWait)
         Inner Join Order_Detail od with(NoLock,NoWait) on o.Order_No = od.Order_No
         Where od.PO_No = @PO_No;
         
         Set @S_Amount = isnull( (Select sum(od.Factory_Price * od.Qty * Rate) From @Order_Detail od Inner Join Order_Detail_Expense ode on od.Order_DetailID = ode.Order_DetailID and ode.Doc = 'PO'),0);
                     
         SELECT @Sum_Qty = Sum(od.Qty), @Order_Amount = Sum(([Factory_Price]*[Qty])) FROM @Order_Detail od;
         
         --Update PPO Set Commodity = case when len(isnull(Commodity,'')) = 0 then Format(isnull(@Sum_Qty,0), 'N0') + ' PRS OF SHOES' else Commodity end, 
         Update PPO Set Commodity = case when isnull(Commodity,'') = '' then ' PRS OF SHOES' else Commodity end, 
         Amount = isnull(@Order_Amount,0) + isnull(@S_Amount,0) 
         Where PO_No = @PO_No;
         Set @ROWCOUNT = @@ROWCOUNT;
      `, req.body);      
      break;
      case 6:                        
         strSQL += format(`      
         Update Order_Detail Set PO_No = {PO_No}
         From PPO p with(NoLock,NoWait)
         Inner Join Order_Detail od with(NoLock,NoWait) on p.FactoryID = od.Factory_ID And isnull(od.PO_No,'') = ''
         Inner Join Order_Detail_Ref odr with(NoLock,NoWait) on od.Order_Detail_RefID = odr.Order_Detail_RefID
         Inner Join Orders o with(NoLock,NoWait) on o.Order_No = od.Order_No And p.Currency = o.PO_Currency
         Left Outer Join Produce ps on od.Produce_No = ps.Produce_No
         Where p.PO_No = {PO_No}
         And ({QueryData} = '' or charindex({QueryData}, isnull(o.Order_No,'') + ' ' + isnull(od.Destination,'') + ' ' + ' ' + isnull(odr.Ref_No,'') + ' ' + isnull(od.Produce_No,'') + ' ' + isnull(ps.Purchase_Project_No,'') + ' ' + isnull(od.Product_No,'') + ' ' + isnull(o.PO_Currency,'') + ' ' + isnull(o.Department,'') + ' ' + isnull(o.UserID,'')) > 0)

         Set @ROWCOUNT = @@ROWCOUNT;
      `, req.body);
      break;
   }

   strSQL += format(`
   Select @ROWCOUNT as Flag;
   Declare @Mode int = ${req.body.Mode}
   if(@ROWCOUNT > 0 and (@Mode = 3 or @Mode = 4 or @Mode = 5 or @Mode = 6))
   begin
      Update [dbo].[PPO] Set UserID = isnull(UserID, N'${req.UserID}')
      , Data_Updater = N'${req.UserID}'
      , Data_Update = GetDate()
      where PO_No = {PO_No}
   End         

   `, req.body);
    //console.log(strSQL)
   db.sql(req.SiteDB, strSQL)
      .then((result) => {
         //console.log(result.recordsets[0])
         res.send({Flag:result.recordsets[0][0].Flag > 0});
      }).catch((err) => {
         console.log(err);
         res.status(500).send(err);
      })

});

//Get PO_For_Order_Info
router.post('/PO_For_Order_Info',  function (req, res, next) {
   console.log("Call PO_For_Order_Info Api:",req.body);

   req.body.PO_No = req.body.PO_No ? `N'${req.body.PO_No.trim().substring(0,10).replace(/'/g, "''")}'` : `''`; 

   var strSQL = format(`
   Declare @PO_No varchar(10) = {PO_No};
   Declare @TmpDetail Table (Order_No varchar(18), Order_DetailID int, Factory_ID varchar(15), Product_No varchar(25), Customer_Product_No varchar(25)
   , Orig_Shipping_Date varchar(20)
   , Destination varchar(30)
   , Est_Shipping_Date varchar(20)
   , Qty float
   , Order_Detail_RefID int
   , Ref_No varchar(20)
   , PO_No varchar(10)
   , Produce_No varchar(20)
   , Unit_Price float
   , Factory_Price float
   , Overhead float
   , PCost_Standard float
   , PCost_Others float   
   , Est_Process_Cost float
   , MTR_Declare_Rate float
   );
    
   Insert @TmpDetail
   SELECT od.Order_No, od.Order_DetailID, od.Factory_ID, od.Product_No, od.Customer_Product_No
   , case when od.Orig_Shipping_Date is null then null else Convert(varchar(20), od.Orig_Shipping_Date,111) end as Orig_Shipping_Date
   , od.Destination
   , case when od.Est_Shipping_Date is null then null else Convert(varchar(20), od.Est_Shipping_Date,120) end as Est_Shipping_Date
   , od.Qty
   , od.Order_Detail_RefID
   , r.Ref_No
   , '' as PO_No
   , od.Produce_No 
   , Isnull(od.Factory_Price,0) as Unit_Price
   , Isnull(od.Factory_Price,0) as Factory_Price
   , 0 as Overhead
   , Isnull(od.PCost_Standard,0) as PCost_Standard
   , Isnull(od.PCost_Others,0) as PCost_Others
   , Isnull(od.Est_Process_Cost,0) as Est_Process_Cost
   , Isnull(od.MTR_Declare_Rate,0) as MTR_Declare_Rate
   From Order_Detail od with(nolock,nowait)
   Inner Join Order_Detail_Ref r with(NoLock,NoWait) on od.Order_Detail_RefID = r.Order_Detail_RefID
   Where od.PO_No = @PO_No;
   
   ---0 Order 
   SELECT top 1 @PO_No as Order_No, 'Internal' as Purpose, Sample_Purpose, Brand, OrganizationID, isnull(Currency,'USD') as Currency, isnull(PO_Currency,'USD') as PO_Currency, Season, CustomerID, Agent, Ref_No_Title, Packing_No_Title, Order_No_Title, Remark, UserID 
   FROM Orders o with(nolock,nowait) 
   Inner Join (Select Order_No From @TmpDetail Group by Order_No) t on t.Order_No = o.Order_No;

   ---1 Order Detail
   SELECT * From @TmpDetail;

   ---2 Order Qty
   SELECT t.Order_DetailID, Size, oq.Qty, Prerange 
   FROM Order_Qty oq with(nolock,nowait) 
   Inner Join @TmpDetail t on t.Order_DetailID = oq.Order_DetailID;
   
   ---3 Assortment
   SELECT t.Order_DetailID, AssortmentID, Cartons, PrepackID, Prepack, Unit_Qty, T_Qty 
   FROM Assortment a with(nolock,nowait) 
   Inner Join @TmpDetail t on t.Order_DetailID = a.Order_DetailID;
   
   ---4 Assortment_Detail
   SELECT a.AssortmentID, Size, ad.Qty, Prerange 
   FROM Assortment_Detail ad with(nolock,nowait) 
   Inner Join Assortment a with(nolock,nowait) on ad.AssortmentID = a.AssortmentID
   Inner Join @TmpDetail t on t.Order_DetailID = a.Order_DetailID;

   ---5 Order_PKO
   SELECT a.Order_PKOID, t.Order_DetailID, a.PKO_No, a.Destination, Convert(varchar(10), a.Shipping_Date,111) as Shipping_Date
   FROM Order_PKO a with(nolock,nowait) 
   Inner Join @TmpDetail t on t.Order_DetailID = a.Order_DetailID;
   
   ---6 Order_PKO_Qty
   SELECT a.Order_PKOID, Size, ad.Qty 
   FROM Order_PKO_Qty ad with(nolock,nowait) 
   Inner Join Order_PKO a with(nolock,nowait) on ad.Order_PKOID = a.Order_PKOID
   Inner Join @TmpDetail t on t.Order_DetailID = a.Order_DetailID;

   ---7 Produce
   Select p.Produce_No, Produce_Purpose, Product_No, Plan_Month, FactoryID, Factory_SubID, Order_Qty, Qty
   From Produce p with(NoWait,NoLock)
   Inner Join (Select Produce_No From @TmpDetail Group By Produce_No) tmp on tmp.Produce_No = p.Produce_No;

   ---8 Order Detail Ref
   SELECT distinct Order_Detail_RefID, Ref_No
   From @TmpDetail;

   `, req.body) ;
   //console.log(strSQL)
   db.sql(req.SiteDB, strSQL)
      .then(async (result) => {
         var DataSet = result.recordsets[0];

         DataSet[0].Order_Detail= result.recordsets[1];
         DataSet[0].Produce= result.recordsets[7];
         DataSet[0].Order_Detail_Ref= result.recordsets[8];
         DataSet[0].Order_Detail.forEach((item)=> {
            item['Order_Qty'] = result.recordsets[2].filter((data)=>(data.Order_DetailID == item.Order_DetailID));

            item['Assortment'] = result.recordsets[3].filter((data)=>(data.Order_DetailID == item.Order_DetailID));
            item['Assortment'].forEach((Assortment)=> {
               Assortment['Assortment_Detail'] = result.recordsets[4].filter((data)=>(data.AssortmentID == Assortment.AssortmentID))
            });

            item['Order_PKO'] = result.recordsets[5].filter((data)=>(data.Order_DetailID == item.Order_DetailID));
            item['Order_PKO'].forEach((Order_PKO)=> {
               Order_PKO['Order_PKO_Qty'] = result.recordsets[6].filter((data)=>(data.Order_PKOID == Order_PKO.Order_PKOID))
            });

         });
         
         //console.log(DataSet)
         await res.send(DataSet);
      }).catch((err) => {
         console.log(err);
         res.status(500).send(err);
      })

});


/* Mark-Wang API End */


/* Darren-Chang API Begin */

/* Darren-Chang API End */

module.exports = router;
