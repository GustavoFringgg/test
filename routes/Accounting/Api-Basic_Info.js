var express = require('express');
var router = express.Router();
const format = require('string-format');
var db = require('../../config/DB_Connect');
const cloneDeep = require('lodash/cloneDeep');
let moment = require('moment');


/* Mark-Wang API Begin */

//Get Currency_Year
router.post('/Currency_Year',  function (req, res, next) {
   console.log("Call Currency Year Api:");
   
   var strSQL = format(`
   Select DatePart(Year,GetDate()) as [Year]
   union
   SELECT distinct DatePart(Year,[Exchange_Date]) as [Year]
   FROM [dbo].[@Currency_Rate] With(Nolock,NoWait)
   Order by Year desc
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

//Get Currency Info
router.post('/Currency_Info',  function (req, res, next) {   
   console.log("Call Currency Info Api:");
    
   req.body.Period = req.body.Period ? `${req.body.Period.trim().substring(0,7).replace(/'/g, '')}` : moment().format('YYYY/MM');
 
   var strSQL = format(`
   Declare @tmptable table (Exchange_Date varchar(10), Currency varchar(50), Currency_Rate float);
  
   Insert @tmptable
   SELECT SUBSTRING(Convert(varchar(10), [Exchange_Date], 111),6,5) as [Exchange_Date]
   --, SUBSTRING(Convert(varchar(10), [Exchange_Date], 111),9,2) as [Exchange_Date]
   , [Currency]
   , [Currency_Rate]
   FROM [dbo].[@Currency_Rate] With(Nolock,NoWait)
   where convert(varchar(07),[Exchange_Date],111) = '{Period}'
   Order By [Currency], [Exchange_Date];

   Select Currency, Currency_Symbol, Country From Currency With(Nolock,NoWait);

   Select Exchange_Date From @tmptable Group by Exchange_Date;

   Select * From @tmptable;

    `, req.body) ;
   //console.log(strSQL)
   
    db.sql(req.Enterprise, strSQL)
       .then((result) => {
          var Currency_Info = result.recordsets[0];
          var Exchange_Date = result.recordsets[1];
          var Detail =result.recordsets[2];

          var dataset = {Currency_Info:Currency_Info, Exchange_Date:Exchange_Date}

          Exchange_Date.forEach((element)=> { 
            Currency_Info.forEach((item)=> {
               element[`${item.Currency}`] = 0;
               Detail.forEach((data)=>{
                  if(data.Exchange_Date == element.Exchange_Date && data.Currency == item.Currency) {
                     element[`${item.Currency}`] = data.Currency_Rate;
                  }
               })
            })
          });
          res.send(dataset);
       }).catch((err) => {
          console.log(err);
          res.status(500).send(err);
       })
 
 });
 
//Maintain Currency Rate
router.post('/Currency_Rate_Maintain',  function (req, res, next) {
   console.log("Call Currency_Rate_Maintain Api:",req.body);

   // req.body.Mode === 0 表示新增
   // req.body.Mode === 1 表示修改 
   // req.body.Mode === 2 表示刪除   
   var strSQL = 'Declare @ROWCOUNT int;';
   
   switch(req.body.Mode){
      case 0:
         req.body.Currency_Info = req.body.Currency_Info ? req.body.Currency_Info : [];
         req.body.Exchange_Date = req.body.Exchange_Date ? req.body.Exchange_Date : moment().format('YYYY/MM/DD');

         strSQL += 'insert [dbo].[@Currency_Rate] (Exchange_Date, Currency, Currency_Rate)'
         req.body.Currency_Info.forEach((items, idx)=>{
            strSQL += idx > 0 ? ' union ' : ''
            strSQL += format(`            
            Select '${req.body.Exchange_Date}' as Exchange_Date, '{Currency}' as Currency, {Currency_Rate} as Currency_Rate`, items);   
         });

         strSQL += format(`Set @ROWCOUNT = @@ROWCOUNT;`); 
      break;
      case 1: 
         let DBAarry = [{DB:'ERP.ERP'},{DB:'HQ.PH'},{DB:'HQ.BM'},{DB:'HQ.HW'},{DB:'PHI.PHI'},{DB:'HQ.HQ'}];
         Deploy_StrSQL = ''

         DBAarry.forEach((item,idx)=>{
            req.body.DB = item.DB;
            Deploy_StrSQL += format(` Update {DB}.[dbo].[@Currency_Rate] Set [{Name}] = case when len({Value}) = 0 or {Value} is null then 0 else {Value} end
            where Exchange_Date = '{Exchange_Date}'
            And Currency = N'{Currency}';
            Set @ROWCOUNT = @@ROWCOUNT;
            if(@ROWCOUNT = 0)
            Begin
               insert {DB}.[dbo].[@Currency_Rate] (Exchange_Date, Currency, Currency_Rate)
               Select '{Exchange_Date}' as Exchange_Date, '{Currency}' as Currency, {Value} as Currency_Rate
            End;  
            `, req.body);   
         });

         strSQL += format(`
         Update [dbo].[@Currency_Rate] Set [{Name}] = case when len({Value}) = 0 or {Value} is null then 0 else {Value} end
         where Exchange_Date = '{Exchange_Date}'
         And Currency = N'{Currency}';
         Set @ROWCOUNT = @@ROWCOUNT;

         if(@ROWCOUNT = 0)
         Begin
            insert [dbo].[@Currency_Rate] (Exchange_Date, Currency, Currency_Rate)
            Select '{Exchange_Date}' as Exchange_Date, '{Currency}' as Currency, {Value} as Currency_Rate

            Set @ROWCOUNT = @@ROWCOUNT;
         End
         
         if(@ROWCOUNT = 1)
         Begin
            ${Deploy_StrSQL}
         End      

         `, req.body);
      break;
      case 2:
         strSQL += format(`         
         --Delete FROM [dbo].[@Currency_Rate] where Exchange_Date = '{Exchange_Date}';
         --Set @ROWCOUNT = @@ROWCOUNT;
         Set @ROWCOUNT = 1;
      `, req.body);      
      break;
   }

   strSQL += format(`
   Select @ROWCOUNT as Flag;
`, req.body);      

   //console.log(strSQL)
   db.sql(req.Enterprise, strSQL)
      .then((result) => {
         //res.send({Flag:false});
         res.send({Flag:result.recordsets[0][0].Flag > 0});
      }).catch((err) => {
         console.log(err);
         res.status(500).send(err);
      })

});

//Get Bank_List
router.post('/Bank_List',  function (req, res, next) {
   console.log("Call Bank_List Api:", req.body);
   req.body.BankID = req.body.BankID ? req.body.BankID : 0;
   req.body.S_Name = req.body.S_Name ? `${req.body.S_Name.trim().substring(0,18).replace(/'/g, '')}` : '';
   req.body.Name = req.body.Name ? `${req.body.Name.trim().substring(0,30).replace(/'/g, '')}` : '';
   req.body.E_Name = req.body.E_Name ? `${req.body.E_Name.trim().substring(0,100).replace(/'/g, '')}` : '';
   req.body.Catogory = req.body.Catogory ? `${req.body.Catogory.trim().substring(0,12).replace(/'/g, '')}` : '';
   req.body.Account_No = req.body.Account_No ? `${req.body.Account_No.trim().substring(0,13).replace(/'/g, '')}` : '';
   req.body.Account_Name = req.body.Account_Name ? `${req.body.Account_Name.trim().substring(0,50).replace(/'/g, '')}` : '';
   req.body.Currency = req.body.Currency ? `${req.body.Currency.trim().substring(0,4).replace(/'/g, '')}` : '';
   req.body.Address = req.body.Address ? `${req.body.Address.trim().substring(0,100).replace(/'/g, '')}` : '';
   req.body.E_Address = req.body.E_Address ? `${req.body.E_Address.trim().substring(0,150).replace(/'/g, '')}` : '';  
   req.body.UserID = req.body.UserID ? `${req.body.UserID.trim().substring(0,255).replace(/'/g, '')}` : '';
 
   var strSQL = format(` SELECT top 1000 row_number() Over(Order By o.BankID asc) as RecNo
   , o.[BankID]
   , o.[S_Name]
   , isnull(o.[Name], '') as Name
   , isnull(o.[E_Name], '') as E_Name
   , isnull(o.[Catogory], '') as Catogory
   , isnull(o.[Account_No], '') as Account_No
   , isnull(o.[Account_Name], '') as Account_Name
   , isnull(o.[Currency], '') as Currency
   , o.[Address]
   , o.[E_Address]
   , ABS(isnull(o.[Advising_Bank], 0)) Advising_Bank
   , ABS(isnull(o.[History], 0)) as History
   , o.[UserID]
   , o.[Data_Updater]
   , convert(varchar(20) ,[Data_Update] ,120) as [Data_Update]
   FROM [dbo].[Bank] o With(Nolock,NoWait)
   where ({BankID} = 0 or o.BankID = {BankID})
   And (N'{S_Name}' = '' or o.[S_Name] like N'%{S_Name}%')
   And (N'{Name}' = '' or o.[Name] like N'%{Name}%')
   And (N'{E_Name}' = '' or o.[E_Name] like N'%{E_Name}%')
   And (N'{Catogory}' = '' or o.[Catogory] like N'%{Catogory}%')
   And (N'{Account_No}' = '' or o.[Account_No] like N'%{Account_No}%')
   And (N'{Account_Name}' = '' or o.[Account_Name] like N'%{Account_Name}%')
   And (N'{Currency}' = '' or o.[Currency] like N'%{Currency}%')
   And (N'{Address}' = '' or o.[Address] like N'%{Address}%')
   And (N'{E_Address}' = '' or o.[E_Address] like N'%{E_Address}%')
   And ({Advising_Bank} = 0 or ABS(isnull(o.[Advising_Bank], 0)) = {Advising_Bank})
   And (N'{UserID}' = '' or o.[UserID] like N'{UserID}%')
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
 
//Get Bank_Info
 router.post('/Bank_Info',  function (req, res, next) {
   console.log("Call Bank_Info Api:", req.body);
   req.body.BankID = req.body.BankID ? req.body.BankID : null;
 
   var strSQL = format(` SELECT top 1000 row_number() Over(Order By o.S_Name desc) as RecNo
   , o.[BankID]
   , o.[S_Name]
   , o.[Name]
   , o.[E_Name]
   , o.[Catogory]
   , o.[Account_No]
   , o.[Account_Name]
   , o.[Currency]
   , o.[Address]
   , o.[E_Address]
   , ABS(isnull(o.[Advising_Bank], 0)) Advising_Bank
   , ABS(isnull(o.[History], 0)) as History
   , o.[UserID]
   , o.[Data_Updater]
   , convert(varchar(20) ,[Data_Update] ,120) as [Data_Update]
   FROM [dbo].[Bank] o With(Nolock,NoWait)
   where (o.BankID = {BankID})
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
 
 //Maintain Bank
 router.post('/Bank_Maintain',  function (req, res, next) {
   console.log("Call Bank_Maintain Api:",req.body);
 
   // req.body.Mode === 0 表示新增
   // req.body.Mode === 1 表示修改 
   // req.body.Mode === 2 表示刪除
   req.body.BankID = req.body.BankID ? req.body.BankID : null;
 
   var strSQL = format(`Declare @ROWCOUNT int, @BankID int = {BankID} `, req.body);
   switch(req.body.Mode){
      case 0:
         req.body.S_Name = req.body.S_Name ? `N'${req.body.S_Name.trim().substring(0,18).replace(/'/g, '')}'` : `''`;
         strSQL += format(`
           Set @BankID = ( SELECT top 1 t.NUMBER AS BankID
             FROM master.dbo.spt_values t
             left Outer Join Bank b on t.number = b.BankID
             WHERE b.BankID IS NULL And t.type = 'p'
           )
           Insert into [dbo].[Bank] (BankID, S_Name, UserID, Data_Updater, Data_Update)
           Select @BankID as BankID
             , {S_Name} as S_Name
             , '${req.UserID}' as [UserID]
             , '${req.UserID}' as [Data_Updater]
             , GetDate() as [Data_Update]          
           Where (Select count(*) From Bank c WITH(NoWait, Nolock) Where c.S_Name = {S_Name}) = 0 ;
           Set @ROWCOUNT = @@ROWCOUNT;
         `, req.body);
      break;
      case 1:        
       
         var Size = 0;
         switch(req.body.Name){
           case 'S_Name':
             Size = 18;
           break;
           case 'Name':
             Size = 30;
           break;
           case 'E_Name':
             Size = 100;
           break;
           case 'Catogory':
             Size = 12;
           break;
           case 'Account_No':
             Size = 13;
           break;
           case 'Account_Name':
             Size = 50;
           break;
           case 'Currency':
             Size = 4;
           break;
           case 'E_Address':
           case 'Address':
             Size = 256;
           break;
         }
         req.body.Value = Size == 0 ? (req.body.Value ? req.body.Value : null) : (req.body.Value ? `N'${req.body.Value.trim().replace(/'/g, "''")}'` : `''`);
  
         strSQL += format(`
            Update [dbo].[Bank] Set [{Name}] = ${Size == 0 ? '{Value}': `substring({Value},1,${Size})`}
            where BankID = {BankID}
            ${req.body.Name == 'S_Name' ? ' And (Select count(*) From Bank c WITH(NoWait, Nolock) Where c.S_Name = {Value}) = 0 ':''}  
            ;
            Set @ROWCOUNT = @@ROWCOUNT;
         `, req.body);
         break;
      case 2:
         strSQL += format(`
            Delete FROM [dbo].[Bank] 
            where BankID = {BankID} ; 
            Set @ROWCOUNT = @@ROWCOUNT;
         `, req.body);
      break;
   }
 
   strSQL += format(`
   Select @ROWCOUNT as Flag, @BankID as BankID;
   `, req.body);
    //console.log(strSQL)
   db.sql(req.SiteDB, strSQL)
      .then((result) => {
         //console.log(result.recordsets[0])
         res.send({Flag:result.recordsets[0][0].Flag > 0, BankID: result.recordsets[0][0].BankID});
      }).catch((err) => {
         console.log(err);
         res.status(500).send(err);
      })
 });
 
 //Check Bank S_Name
 router.post('/Check_Bank_S_Name',  function (req, res, next) {
   console.log("Call Check_Bank_S_Name Api:",req.body);
 
   req.body.S_Name = req.body.S_Name ? `${req.body.S_Name.trim().substring(0,18).replace(/'/g, '')}` : '';
 
   var strSQL = format(`
   SELECT Count(*) as RecCount
   FROM [dbo].[Bank] With(Nolock,NoWait)
   where ([S_Name] = N'{S_Name}')
   `, req.body) ;
   // console.log(strSQL)
   db.sql(req.SiteDB, strSQL)
      .then((result) => {
         //console.log(result.recordset[0].RecCount <= 0)
         res.send({Flag: result.recordset[0].RecCount <= 0});
      }).catch((err) => {
         console.log(err);
         res.status(500).send(err);
      })
 
 });

//Get Accounts_Receivables_List
router.post('/Accounts_Receivables_List',  function (req, res, next) {
   console.log("Call Accounts_Receivables_List Api:", req.body);
   
   req.body.Date_From = req.body.Date_From ? `${req.body.Date_From.trim().substring(0,10).replace(/'/g, '')}` : ``;
   req.body.Date_To = req.body.Date_To ? `${req.body.Date_To.trim().substring(0,10).replace(/'/g, '')}` : ``;
   req.body.Type = req.body.Type ? `${req.body.Type.trim().substring(0,4).replace(/'/g, '')}` : ``;
   req.body.RCV_No = req.body.RCV_No ? `${req.body.RCV_No.trim().substring(0,30).replace(/'/g, '')}` : ``;
   req.body.CustomerID = req.body.CustomerID ? `${req.body.CustomerID.trim().substring(0,15).replace(/'/g, '')}` : ``;
   req.body.Currency = req.body.Currency ? `${req.body.Currency.trim().substring(0,4).replace(/'/g, '')}` : ``;
   req.body.Closed = req.body.Closed ? req.body.Closed : 0;
   req.body.UserID = req.body.UserID ? `${req.body.UserID.trim().substring(0,256).replace(/'/g, '')}` : '';      
   
   var strSQL = format(`
   SELECT 
    case when isnull(a.Date,'') = '' then '' else CONVERT (varchar(10), a.Date, 111) end AS Date
   , a.[Type]
   , a.[Days]
   , a.[RCV_No]
   , a.[CustomerID]
   , case when isnull(a.Expiry_Date,'') = '' then '' else CONVERT (varchar(10), a.Expiry_Date, 111) end AS Expiry_Date   
   , a.[Currency]
   , ISNULL(a.Amount, 0) AS Amount
   , sum(m.Deposit) as Negotiation
   , sum(isnull((m.Deposit / nullif(a.Amount,0)),0)) * 100 as Negotiation_Rate
   , convert(bit, a.Closed) as  [Closed]
   , a.UserID
   , a.Data_Updater
   , CONVERT (varchar(20), a.Data_Update, 111) AS Data_Update
   FROM Acc_RCV a with(NoLock,NoWait)
   Left Outer Join Money m with(NoLock,NoWait) on a.RCV_No = m.MasterID
   Where ((N'{Date_From}' = '' or N'{Date_To}' = '') or convert(date, a.[Date],111) between N'{Date_From}' And N'{Date_To}')
   And  (CONVERT (Varchar(20), a.RCV_No) LIKE N'%{RCV_No}%') 
   And (N'{CustomerID}' = '' or a.CustomerID like N'%{CustomerID}%')
   And (N'{Currency}' = '' or a.Currency like N'%{Currency}%')   
   And (N'{Type}' = '' or a.Type like N'%{Type}%')
   And (N'{UserID}' = '' or a.UserID like N'%{UserID}%')
   And cast(isnull(a.Closed, 0) as bit) = cast({Closed} as bit)
   Group by a.Date, a.[Type]
   , a.[Days], a.[RCV_No], a.[CustomerID], a.Expiry_Date, a.[Currency]
   , a.Amount, a.Closed, a.UserID
   , a.Data_Updater, a.Data_Update
   ;
   `, req.body) ;
//console.log(strSQL)
  
   db.sql(req.SiteDB, strSQL)
      .then((result) => {
         var DataSet = {Detail_Info: result.recordsets[0]
            , Currency_Info: []
         };
         DataSet.Currency_Info = [...DataSet.Detail_Info.reduce((r, e) => {
            let k = `${e.Currency}`;
            if (!r.has(k)) {
              // console.log(r) 
              r.set(k, { Currency: e.Currency,
               Total_Amount: e.Amount,
               Total_Negotiation: e.Negotiation,
              })
            } else {
               r.get(k).Total_Amount += e.Amount;
               r.get(k).Total_Negotiation += e.Negotiation;
            }
            return r;
          }, new Map).values()]

          DataSet.Currency_Info.forEach((item)=>{
            item.Total_Amount = Math.round(item.Total_Amount * 10000)/10000;
            item.Total_Negotiation = Math.round(item.Total_Negotiation * 10000)/10000;
            item.Total_Negotiation_Rate = item.Total_Amount > 0 ? Math.round((item.Total_Negotiation / item.Total_Amount * 100) * 100)/100 : 0;
         }) 

         res.send(DataSet);         
      }).catch((err) => {
         console.log(err);
         res.status(500).send(err);
      })

});

//Check RCV_No
router.post('/Check_RCV_No',  function (req, res, next) {
   console.log("Call Check_RCV_No Api:",req.body);

   req.body.RCV_No = req.body.RCV_No ? `N'${req.body.RCV_No.trim().substring(0,30).replace(/'/g, '')}'` : `''`;

   var strSQL = format(`
   SELECT Count(*) as RecCount
   FROM [dbo].[Acc_RCV] With(Nolock,NoWait)
   where ([RCV_No] = {RCV_No})
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

 //Get Accounts Receivables Info
router.post('/Accounts_Receivables_Info',  function (req, res, next) {
   console.log("Call Accounts_Receivables_Info Api:",req.body);
 
   req.body.RCV_No = req.body.RCV_No ? `N'${req.body.RCV_No.replace(/'/g, '')}'` : `''`;
   req.body.Mode = req.body.Mode ? req.body.Mode : 0;
 
   //Mode == 0 Get Acc_RCV, Orders, Transfer and Payment
   //Mode == 1 Get Acc_RCV Data
   //Mode == 2 Get Orders Data
   //Mode == 3 Get Transfer Data
   //Mode == 4 Get Payment Data
   
   var strSQL = format(`
   Declare @Mode int = {Mode}, @RCV_No Nvarchar(30) = {RCV_No};
 
   if(@Mode = 0 or @Mode = 1)
   Begin
      SELECT 
      case when isnull(a.Date,'') = '' then '' else CONVERT (varchar(10), a.Date, 111) end AS Date
      , a.[CustomerID]
      , a.[Type]      
      , a.[Days]
      , a.[By_Doc_Rcv]
      , dbo.Get_Payment_Term(a.[Payment_Term], a.Type, isnull(a.Days,0), isnull(a.By_Doc_Rcv,0)) as Payment_Term
      , a.[RCV_No]
      , a.[Currency]      
      , ISNULL(a.Amount, 0) AS Amount
      , convert(bit, a.Closed) as  [Closed]
      , case when isnull(a.Latest_Day,'') = '' then '' else CONVERT (varchar(10), a.Latest_Day, 111) end AS Latest_Day
      , case when isnull(a.Expiry_Date,'') = '' then '' else CONVERT (varchar(10), a.Expiry_Date, 111) end AS Expiry_Date
      , a.Applicant
      , a.Ap_Address
      , a.Beneficiary
      , a.Bf_Address
      , a.Delivery_Term
      , convert(bit, a.Partial_Ship) as  [Partial_Ship]
      , convert(bit, a.Tranship) as  [Tranship]
      , Cast(a.Remark as Nvarchar) as Remark
      , a.UserID
      , a.Data_Updater
      , CONVERT (varchar(20), a.Data_Update, 111) AS Data_Update
      FROM Acc_RCV a with(NoLock,NoWait)      
      Where a.RCV_No = @RCV_No
   End
   if(@Mode = 0 or @Mode = 2)
   Begin
       Select o.Order_No
       , Convert(varchar(10), o.[Order_Date],111) as [Order_Date]
       , o.Currency
       , isnull(Sum(od.Qty * od.Unit_Price),0) as Amount
       , isnull(o.RCV_Est_Using_Amount,0) as RCV_Est_Using_Amount
       , o.RCV_Remark
       From dbo.[Orders] o with(NoLock, NoWait)
       Inner Join Order_Detail od with(NoLock, NoWait) on o.Order_No = od.Order_No       
       Where o.RCV_No = @RCV_No
       Group by o.Order_No
       , Convert(varchar(10), o.[Order_Date],111)
       , o.Currency
       , o.RCV_Est_Using_Amount
       , o.RCV_Remark
   End
   if(@Mode = 0 or @Mode = 3)
   Begin
      Select ms.Payment_No
      , ms.[Payment_Term]
      , ms.[Beneficiary]
      , case when isnull(ms.Latest_Day,'') = '' then '' else CONVERT (varchar(10), ms.Latest_Day, 111) end AS Latest_Day
      , case when isnull(ms.Expiry_Date,'') = '' then '' else CONVERT (varchar(10), ms.Expiry_Date, 111) end AS Expiry_Date
      , ms.Currency      
      , isnull(ms.Amount,0) as Amount
      From Credits ms with(NoLock, NoWait)      
      Where ms.Source_No = @RCV_No
      Order by ms.[Payment_No]
End
   if(@Mode = 0 or @Mode = 4)
   Begin
       Select m.MoneyID       
       , case when isnull(m.Apply_Date,'') = '' then '' else CONVERT (varchar(10), m.Apply_Date, 111) end AS Apply_Date
       , m.[BankID]
       , b.S_Name
       , m.Reference_NO
       , Convert(varchar(10), DateAdd(day, case when isnull(ar.Days,0) <= 14 then 14 else ar.Days end , m.[Apply_Date]),111) as RA_Date       
       , case when isnull(m.Date,'') = '' then '' else CONVERT (varchar(10), m.Date, 111) end AS Date
       , isnull((Select sum(ms.Deposit) From Money_Source ms with(NoLock,NoWait) Where ms.MoneyID = m.MoneyID) ,0) as Nego_Amonut
       , isnull((Select sum(me.Deposit) From Money_Expense me with(NoLock,NoWait) Where me.MoneyID = m.MoneyID) ,0) as Expense
       , isnull(m.Deposit,0) as Deposit
       , case when isnull(m.Expiry_Date,'') = '' then '' else CONVERT (varchar(10), m.Expiry_Date, 111) end AS Expiry_Date
       , case when isnull(m.Unpay,'') = '' then '' else CONVERT (varchar(10), m.Unpay, 111) end AS Unpay
       , case when isnull(m.Acceptance,'') = '' then '' else CONVERT (varchar(10), m.Acceptance, 111) end AS Acceptance
       From Money m with(NoLock, NoWait)
       Inner Join ACC_RCV ar with(NoLock, NoWait) on ar.RCV_No = m.MasterID
       Inner Join Bank b with(NoLock,NoWait) on m.BankID = b.BankID
       Where m.MasterID = @RCV_No
       Order by m.Apply_Date
   End
   `, req.body) ;
   //console.log(strSQL)
   db.sql(req.SiteDB, strSQL)
      .then((result) => {

         var DataSet = {Accounts_Receivables: (req.body.Mode == 0 || req.body.Mode == 1) ? result.recordsets[0] : []
           , Accounts_Receivables_Orders: (req.body.Mode == 0) ? result.recordsets[1] : (req.body.Mode == 2 ? result.recordsets[0] : [])
           , Accounts_Receivables_Transfer: (req.body.Mode == 0) ? result.recordsets[2] : (req.body.Mode == 3 ? result.recordsets[0] : [])
           , Accounts_Receivables_Payment: (req.body.Mode == 0) ? result.recordsets[3] : (req.body.Mode == 4 ? result.recordsets[0] : [])
           , Total_Order_Amount:0
           , Total_Order_Est_Amount:0
           , Total_Transfer_Amount:0
           , Total_Nego_Amonut_Amount:0
           , Total_Expense_Amount:0
           , Total_Deposit_Amount:0
        };

         DataSet.Accounts_Receivables.forEach((item) => {
            item.Amount = Math.round((item.Amount)*10000)/10000;
         });

         DataSet.Accounts_Receivables_Orders.forEach((item) => {
            DataSet.Total_Order_Amount += item.Amount;
            DataSet.Total_Order_Est_Amount += item.RCV_Est_Using_Amount;
            item.Amount = Math.round((item.Amount)*10000)/10000;
            item.RCV_Est_Using_Amount = Math.round((item.RCV_Est_Using_Amount)*10000)/10000;
         });


         DataSet.Accounts_Receivables_Transfer.forEach((item) => {
            DataSet.Total_Transfer_Amount += item.Amount;
            item.Amount = Math.round((item.Amount)*10000)/10000;
         });

         DataSet.Accounts_Receivables_Payment.forEach((item) => {
            DataSet.Total_Nego_Amonut_Amount += item.Nego_Amonut;
            DataSet.Total_Expense_Amount += item.Expense;
            DataSet.Total_Deposit_Amount += item.Deposit;
            item.Nego_Amonut = Math.round((item.Nego_Amonut)*10000)/10000;
            item.Expense = Math.round((item.Expense)*10000)/10000;
            item.Deposit = Math.round((item.Deposit)*10000)/10000;
         });

        DataSet.Total_Order_Amount = Math.round((DataSet.Total_Order_Amount)*10000)/10000;
        DataSet.Total_Order_Est_Amount = Math.round((DataSet.Total_Order_Est_Amount)*10000)/10000;
        DataSet.Total_Transfer_Amount = Math.round((DataSet.Total_Transfer_Amount)*10000)/10000;
        DataSet.Total_Nego_Amonut_Amount = Math.round((DataSet.Total_Nego_Amonut_Amount)*10000)/10000;
        DataSet.Total_Expense_Amount = Math.round((DataSet.Total_Expense_Amount)*10000)/10000;        
        DataSet.Total_Deposit_Amount = Math.round((DataSet.Total_Deposit_Amount)*10000)/10000;

        //console.log(DataSet)
        res.send(DataSet);
      }).catch((err) => {
         console.log(err);
         res.status(500).send(err);
      })
});

//Maintain Accounts Receivables
router.post('/Accounts_Receivables_Maintain',  function (req, res, next) {
   console.log("Call Accounts_Receivables_Maintain Api:",req.body);

   // req.body.Mode === 0 表示新增
   // req.body.Mode === 1 表示修改
   // req.body.Mode === 2 表示刪除
   var Size = 0;
   req.body.RCV_No = req.body.RCV_No ? `N'${req.body.RCV_No.trim().substring(0,30).replace(/'/g, '')}'` : `''`;
   
   var strSQL = format(`Declare @ROWCOUNT int, @RCV_No Varchar(30) = {RCV_No} 
   `, req.body);
   switch(req.body.Mode){
      case 0:
         req.body.Date = req.body.Date ? `'${req.body.Date.trim().substring(0,10)}'` : `'${moment().format('YYYY/MM/DD')}'`;         
         req.body.Type = req.body.Type ? `N'${req.body.Type.trim().substring(0,4).replace(/'/g, "''")}'` : `'L/C'`;
         req.body.Delivery_Term = req.body.Delivery_Term ? `N'${req.body.Delivery_Term.trim().substring(0,20).replace(/'/g, "''")}'` : `'FOB'`;
         req.body.CustomerID = req.body.CustomerID ? `N'${req.body.CustomerID.trim().substring(0,15).replace(/'/g, "''")}'` : `''`;         
         req.body.Currency = req.body.Currency ? `N'${req.body.Currency.trim().substring(0,4).replace(/'/g, "''")}'` : `'USD'`;

         strSQL += format(`
            Insert [dbo].[Acc_RCV] (RCV_No
               , [Date], Type, By_Doc_Rcv, [Delivery_Term], [CustomerID]
               , [Currency], [Days]
               , Applicant, Ap_Address
               , Amount
               , UserID, Data_Updater, Data_Update)
            Select @RCV_No as RCV_No
            , {Date} as Date, {Type} as Type, 0 as By_Doc_Rcv, {Delivery_Term} as Delivery_Term, {CustomerID} as CustomerID
            , {Currency} as Currency, 0 as Days
            , {CustomerID} as Applicant, (Select Address From Customer c with(NoLock,NoWait) Where c.CustomerID = {CustomerID}) as Ap_Address
            , 0 as Amount
            , N'${req.UserID}' as UserID, N'${req.UserID}' as Data_Updater, GetDate() as Data_Update
            Where (Select Count(*) From Acc_RCV m with(NoLock,NoWait) Where m.RCV_No = {RCV_No}) = 0;
                        
            Set @ROWCOUNT = @@ROWCOUNT;            
         `, req.body);
      break;
      case 1:
         switch(req.body.Name){
            case 'Date':
            case 'Latest_Day':
            case 'Expiry_Date':            
            case 'Property':
               Size = 10;
            break;
            case 'CustomerID':
               Size = 15;
            break;
            case 'Type':
            case 'Currency':
               Size = 4;
            break;
            case 'Delivery_Term':
                  Size = 20;
            break;
            case 'RCV_No':
                  Size = 30;
            break;
            case 'Beneficiary':
                  Size = 80;
            break;
            case 'Payment_Term':
            case 'Applicant':
                  Size = 50;
            break;
            case 'Ap_Address':
            case 'Bf_Address':
                  Size = 256;
            break;
            case 'Remark':
               Size = 65535;
            break;            
            default:
            break;
         }
         req.body.Value = Size == 0 ? (req.body.Value != null ? req.body.Value : null) : (req.body.Value ? `N'${req.body.Value.trim().replace(/'/g, "''")}'` : `''`);

         strSQL += format(`         
            Update [dbo].[Acc_RCV] Set [{Name}] = ${Size == 0 ? '{Value}': `substring({Value},1,${Size})`}
            , UserID = isnull(UserID, N'${req.UserID}')
            , Data_Updater = N'${req.UserID}'
            , Data_Update = GetDate()            
            ${req.body.Name == 'Type' ? ", Payment_Term = dbo.Get_Payment_Term('', {Value}, Days, 0)":''}
            ${req.body.Name == 'Days' ? ", Payment_Term = dbo.Get_Payment_Term('', Type, {Value}, 0)":''}
            ${req.body.Name == 'By_Doc_Rcv' ? ", Payment_Term = dbo.Get_Payment_Term('', Type, Days, {Value})":''}            
            ${req.body.Name == 'Applicant' ? ", Ap_Address = isnull((Select Address From Customer c with(NoLock,NoWait) Where c.CustomerID = {Value}), Ap_Address)":''}
            ${req.body.Name == 'Beneficiary' ? ", Bf_Address = isnull((SELECT Address FROM [dbo].[Credit_Accounts] p with(NoLock,NoWait) Where p.AccountID = {Value}), Bf_Address)":''}
            where RCV_No = @RCV_No
            ${req.body.Name == 'RCV_No' ? ' And (Select Count(*) From Acc_RCV m with(NoLock,NoWait) Where m.RCV_No = {Value}) = 0':''}
            ;

            Set @ROWCOUNT = @@ROWCOUNT;

            if(@ROWCOUNT > 0 And '${req.body.Name}' = 'RCV_No') 
            Begin 
               Update Orders Set RCV_No = {Value} Where RCV_No = @RCV_No; 
               Update Credits Set Source_No = {Value} Where Source_No = @RCV_No; 
               Update Money Set MasterID = {Value} Where MasterID = @RCV_No; 
               set @RCV_No = {Value};  
            End          

         `, req.body);
      break;
      case 2:
         strSQL += format(`
            Delete FROM [dbo].[Acc_RCV]             
            where RCV_No = @RCV_No
            And (Select Count(*) From dbo.[Orders] o with(NoLock,NoWait) Where o.RCV_No = @RCV_No) = 0
            And (Select Count(*) From dbo.[Credits] c with(NoLock,NoWait) Where c.Source_No = @RCV_No) = 0
            And (Select Count(*) From Money m with(NoLock,NoWait) Where m.MasterID = @RCV_No) = 0
            ;
            
            Set @ROWCOUNT = @@ROWCOUNT; 
         `, req.body);
      break;
        
   }

   strSQL += format(`
   Select @ROWCOUNT as Flag,  @RCV_No as RCV_No;

   `, req.body);
   //console.log(strSQL)
   db.sql(req.SiteDB, strSQL)
      .then((result) => {
         //console.log(result.recordsets[0])
         res.send({Flag:result.recordsets[0][0].Flag > 0, RCV_No: result.recordsets[0][0].RCV_No});
      }).catch((err) => {
         console.log(err);
         res.status(500).send(err);
      })
});

//Maintain Accounts Receivables Detail - Orser
router.post('/Accounts_Receivables_Orders_Maintain',  function (req, res, next) {
   console.log("Call Accounts_Receivables_Orders_Maintain Api:",req.body);

   // req.body.Mode === 0 表示新增
   // req.body.Mode === 1 表示修改
   // req.body.Mode === 2 表示刪除
   var Size = 0;
   req.body.RCV_No = req.body.RCV_No ? `N'${req.body.RCV_No.trim().substring(0,30).replace(/'/g, '')}'` : `''`;
   req.body.Mode = req.body.Mode ? req.body.Mode : 0;
   req.body.Orders = req.body.Orders ? req.body.Orders : [];
      
   var strSQL = format(`Declare @ROWCOUNT int=0, @Amount float=0
   `, req.body);
   switch(req.body.Mode){
      case 0:
         var strSQL1 = '';

         req.body.Orders.forEach((item)=>{
            strSQL1 += format(`Insert into @tmpDetail (Order_No) values (N'{Order_No}');`,item)
         })

         strSQL += format(`         
         Declare @tmpDetail Table (Order_No NVarchar(20))

         ${strSQL1}

         Update [dbo].[Orders] set RCV_No = {RCV_No}
         , RCV_Est_Using_Amount = tmp.Amount
         From Orders ms         
         Inner Join (
            Select o.Order_No
            , isnull(Sum(od.Qty * od.Unit_Price),0) as Amount
            From @tmpDetail o 
            Inner Join Order_Detail od with(NoLock, NoWait) on o.Order_No = od.Order_No            
            Group by o.Order_No
         ) tmp on ms.Order_No = tmp.Order_No
         Where ms.RCV_No is null; 
        
         Set @ROWCOUNT = @@ROWCOUNT;          
         `, req.body);

      break;
      case 1:
         req.body.Order_No = req.body.Order_No ? `N'${req.body.Order_No.trim().substring(0,65535).replace(/'/g, '')}'` : `''`;
         switch(req.body.Name){
            case 'RCV_Remark':
               Size = 65535;
            break;            
            default:
            break;
         }
         req.body.Value = Size == 0 ? (req.body.Value != null ? req.body.Value : null) : (req.body.Value ? `N'${req.body.Value.trim().replace(/'/g, "''")}'` : `''`);

         strSQL += format(`         
            Update [dbo].[Orders] Set [{Name}] = ${Size == 0 ? '{Value}': `substring({Value},1,${Size})`}
            where Order_No = {Order_No};

            Set @ROWCOUNT = @@ROWCOUNT;
         `, req.body);

      break;
      case 2:
         req.body.Order_No = req.body.Order_No ? `N'${req.body.Order_No.trim().substring(0,20).replace(/'/g, '')}'` : `''`;         
         strSQL += format(`
            Update [dbo].[Orders] set RCV_No = null
            where Order_No = {Order_No};
                                    
            Set @ROWCOUNT = @@ROWCOUNT;
         `, req.body);
      break;        
   }

   strSQL += format(`
   Select @ROWCOUNT as Flag;

   if(@ROWCOUNT > 0)
   Begin       
      Update [dbo].[Acc_RCV] Set UserID = isnull(UserID, N'${req.UserID}')
      , Data_Updater = N'${req.UserID}'
      , Data_Update = GetDate()
      where RCV_No = {RCV_No};       
   End
   --Select @Amount as Amount
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

//Maintain Accounts Receivables Detail - Transfer
router.post('/Accounts_Receivables_Transfer_Maintain',  function (req, res, next) {
   console.log("Call Accounts_Receivables_Transfer_Maintain Api:",req.body);

   // req.body.Mode === 0 表示新增
   // req.body.Mode === 1 表示修改
   // req.body.Mode === 2 表示刪除
   var Size = 0;
   req.body.RCV_No = req.body.RCV_No ? `N'${req.body.RCV_No.trim().substring(0,30).replace(/'/g, '')}'` : `''`;
   req.body.Mode = req.body.Mode ? req.body.Mode : 0;
   req.body.Credits = req.body.Credits ? req.body.Credits : [];
      
   var strSQL = format(`Declare @ROWCOUNT int=0
   `, req.body);
   switch(req.body.Mode){
      case 0:
         var strSQL1 = '';

         req.body.Credits.forEach((item)=>{
            strSQL1 += format(`Insert into @tmpDetail (Payment_No) values (N'{Payment_No}');`,item)
         })

         strSQL += format(`         
         Declare @tmpDetail Table (Payment_No varchar(20))

         ${strSQL1}

         Update [dbo].[Credits] set Source_No = {RCV_No}
         From Credits ms
         Inner Join @tmpDetail t on t.Payment_No = ms.Payment_No
         Where ms.Source_No is null; 
        
         Set @ROWCOUNT = @@ROWCOUNT;          
         `, req.body);

      break;
      case 1:
      break;
      case 2:
         req.body.Payment_No = req.body.Payment_No ? `N'${req.body.Payment_No.trim().substring(0,20).replace(/'/g, '')}'` : `''`;         
         strSQL += format(`
            Update [dbo].[Credits] set Source_No = null
            where Payment_No = {Payment_No};
                                    
            Set @ROWCOUNT = @@ROWCOUNT;
         `, req.body);
      break;
        
   }

   strSQL += format(`
   Select @ROWCOUNT as Flag;

   if(@ROWCOUNT > 0)
   Begin     
      Update [dbo].[Acc_RCV] Set UserID = isnull(UserID, N'${req.UserID}')
      , Data_Updater = N'${req.UserID}'
      , Data_Update = GetDate()
      where RCV_No = {RCV_No};      
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

//Get Accounts_Receivables Detail Add List
router.post('/Accounts_Receivables_Detail_Add_List',  function (req, res, next) {
console.log("Call Accounts_Receivables_Detail_Add_List Api:",req.body);

req.body.Mode = req.body.Mode ? req.body.Mode : 0;
req.body.RCV_No = req.body.RCV_No ? `N'${req.body.RCV_No.trim().replace(/'/g, "''")}'` : `''`;
req.body.CustomerID = req.body.CustomerID ? `N'${req.body.CustomerID.trim().replace(/'/g, "''")}'` : `''`;
req.body.Currency = req.body.Currency ? `N'${req.body.Currency.trim().replace(/'/g, "''")}'` : `''`;

var strSQL = format(`Declare @RCV_No varchar(30) = {RCV_No}, @CustomerID varchar(15) = {CustomerID}, @Currency varchar(4) = {Currency}`, req.body) ;

switch(req.body.Mode) {
   case 0:
      strSQL += format(`
      Select cast(0 as bit) as flag
      , o.Order_No
      , Convert(varchar(10), o.[Order_Date],111) as [Order_Date]
      , o.Currency
      , isnull(Sum(od.Qty * od.Unit_Price),0) as Amount
      From dbo.[Orders] o with(NoLock, NoWait)
      Inner Join Order_Detail od with(NoLock, NoWait) on o.Order_No = od.Order_No       
      Where isnull(o.RCV_No, '') = ''
      And o.CustomerID = {CustomerID}
      And o.Currency = {Currency}
      Group by o.Order_No
      , Convert(varchar(10), o.[Order_Date],111)
      , o.Currency;
      `, req.body) ;
   break;
   case 1:
      strSQL += format(`
      Select cast(0 as bit) as flag
      , ms.Payment_No
      , ms.[Payment_Term]
      , ms.[Beneficiary]
      , Convert(varchar(10), ms.[Latest_Day],111) as [Latest_Day]
      , Convert(varchar(10), ms.[Expiry_Date],111) as [Expiry_Date]
      , ms.Currency      
      , isnull(ms.Amount,0) as Amount
      From Credits ms with(NoLock, NoWait)      
      Where isnull(ms.Source_No, '') = ''
      And ms.Currency = {Currency}
      Order by ms.[Payment_No];
      `, req.body) ;
   break;
   case 2:
      strSQL += format(`
      Select cast(0 as bit) as flag;
      `, req.body) ;
   break;
}

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

//Get Credits_List
router.post('/Credits_List',  function (req, res, next) {
   console.log("Call Credits_List Api:", req.body);

   req.body.Payment_No = req.body.Payment_No ? `${req.body.Payment_No.trim().substring(0,20).replace(/'/g, '')}` : ``;
   req.body.FactoryID = req.body.FactoryID ? `${req.body.FactoryID.trim().substring(0,15).replace(/'/g, '')}` : ``;
   req.body.Date_From = req.body.Date_From ? `${req.body.Date_From.trim().substring(0,10).replace(/'/g, '')}` : ``;
   req.body.Date_To = req.body.Date_To ? `${req.body.Date_To.trim().substring(0,10).replace(/'/g, '')}` : ``;
   req.body.Payment_Term = req.body.Payment_Term ? `${req.body.Payment_Term.trim().substring(0,21).replace(/'/g, '')}` : ``;
   req.body.RCV_No = req.body.RCV_No ? `${req.body.RCV_No.trim().substring(0,20).replace(/'/g, '')}` : ``;
   req.body.Applicant = req.body.Applicant ? `${req.body.Applicant.trim().substring(0,80).replace(/'/g, '')}` : ``;
   req.body.Expiry_Date_From = req.body.Expiry_Date_From ? `${req.body.Expiry_Date_From.trim().substring(0,10).replace(/'/g, '')}` : ``;
   req.body.Expiry_Date_To = req.body.Expiry_Date_To ? `${req.body.Expiry_Date_To.trim().substring(0,10).replace(/'/g, '')}` : ``;
   req.body.Currency = req.body.Currency ? `${req.body.Currency.trim().substring(0,4).replace(/'/g, '')}` : ``;
   req.body.Beneficiary = req.body.Beneficiary ? `${req.body.Beneficiary.trim().substring(0,80).replace(/'/g, '')}` : ``;
   req.body.UserID = req.body.UserID ? `${req.body.UserID.trim().substring(0,256).replace(/'/g, '')}` : '';
   
   var strSQL = format(`
   SELECT a.[Payment_No]
   , a.[FactoryID]   
   , case when isnull(a.Date,'') = '' then '' else CONVERT (varchar(10), a.Date, 111) end AS Date
   , a.[Payment_Term]   
   , a.Source_No as [RCV_No]
   , a.[Applicant]   
   , case when isnull(a.Expiry_Date,'') = '' then '' else CONVERT (varchar(10), a.Expiry_Date, 111) end AS Expiry_Date
   , a.[Currency]
   , ISNULL(a.Amount, 0) AS Amount
   , a.[Beneficiary]
   , a.UserID
   , a.Data_Updater
   , CONVERT (varchar(20), a.Data_Update, 111) AS Data_Update
   FROM Credits a with(NoLock,NoWait)   
   Where (N'{Payment_No}' = '' or a.Payment_No like N'%{Payment_No}%' )
   And (N'{FactoryID}' = '' or a.FactoryID like N'%{FactoryID}%')
   And ((N'{Date_From}' = '' or N'{Date_To}' = '') or convert(date, a.[Date],111) between N'{Date_From}' And N'{Date_To}')
   And (N'{Payment_Term}' = '' or a.Payment_Term like N'%{Payment_Term}%' )
   And (N'{RCV_No}' = '' or a.Source_No like N'%{RCV_No}%' )
   And (N'{Applicant}' = '' or a.Applicant like N'%{Applicant}%' )
   And ((N'{Expiry_Date_From}' = '' or N'{Expiry_Date_To}' = '') or convert(date, a.[Expiry_Date],111) between N'{Expiry_Date_From}' And N'{Expiry_Date_To}')
   And (N'{Currency}' = '' or a.Currency like N'%{Currency}%')   
   And (N'{Beneficiary}' = '' or a.Beneficiary like N'%{Beneficiary}%')
   And (N'{UserID}' = '' or a.UserID like N'%{UserID}%')   
   ;
   `, req.body) ;
//console.log(strSQL)
  
   db.sql(req.SiteDB, strSQL)
      .then((result) => {
         var DataSet = {Detail_Info: result.recordsets[0]
            , Currency_Info: []
         };
         DataSet.Currency_Info = [...DataSet.Detail_Info.reduce((r, e) => {
            let k = `${e.Currency}`;
            if (!r.has(k)) {
              // console.log(r) 
              r.set(k, { Currency: e.Currency,
               Total_Amount: e.Amount,
              })
            } else {
               r.get(k).Total_Amount += e.Amount;
            }
            return r;
          }, new Map).values()]

          DataSet.Currency_Info.forEach((item)=>{
            item.Total_Amount = Math.round(item.Total_Amount * 10000)/10000;
         }) 

         res.send(DataSet);         
      }).catch((err) => {
         console.log(err);
         res.status(500).send(err);
      })

});

//Check Payment_No
router.post('/Check_Payment_No',  function (req, res, next) {
   console.log("Call Check_Payment_No Api:",req.body);

   req.body.Payment_No = req.body.Payment_No ? `N'${req.body.Payment_No.trim().substring(0,20).replace(/'/g, '')}'` : `''`;

   var strSQL = format(`
   SELECT Count(*) as RecCount
   FROM [dbo].[Credits] With(Nolock,NoWait)
   where ([Payment_No] = {Payment_No})
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

//Get Credits Info
router.post('/Credits_Info',  function (req, res, next) {
   console.log("Call Credits_Info Api:",req.body);
 
   req.body.Payment_No = req.body.Payment_No ? `N'${req.body.Payment_No.trim().substring(0,20).replace(/'/g, '')}'` : `''`;
   req.body.Mode = req.body.Mode ? req.body.Mode : 0;
 
   //Mode == 0 Get Credits, Orders Data
   //Mode == 1 Get Credits Data
   //Mode == 2 Get Orders Data
   
   var strSQL = format(`
   Declare @Mode int = {Mode}, @Payment_No Nvarchar(30) = {Payment_No};
 
   if(@Mode = 0 or @Mode = 1)
   Begin
      SELECT a.[Payment_No]      
      , case when isnull(a.Date,'') = '' then '' else CONVERT (varchar(10), a.Date, 111) end AS Date
      , a.[FactoryID]
      , a.[Payment_Term]      
      , a.[Currency]      
      , ISNULL(a.Amount, 0) AS Amount      
      , case when isnull(a.Latest_Day,'') = '' then '' else CONVERT (varchar(10), a.Latest_Day, 111) end AS Latest_Day
      , case when isnull(a.Expiry_Date,'') = '' then '' else CONVERT (varchar(10), a.Expiry_Date, 111) end AS Expiry_Date
      , a.Applicant
      , a.Ap_Address
      , a.Beneficiary
      , a.Bf_Address
      , a.Delivery_Term
      , convert(bit, a.Partial_Ship) as  [Partial_Ship]
      , convert(bit, a.Tranship) as  [Tranship]      
      , a.UserID
      , a.Data_Updater
      , CONVERT (varchar(20), a.Data_Update, 111) AS Data_Update
      FROM Credits a with(NoLock,NoWait)      
      Where a.Payment_No = @Payment_No
   End
   if(@Mode = 0 or @Mode = 2)
   Begin
      With tmpTable (Order_DetailID, Produce_No, Order_No, Order_Date, Currency, Amount) 
      as (
         Select od.Order_DetailID
         , p.Produce_No
         , o.Order_No
         , Convert(varchar(10), o.[Order_Date],111) as [Order_Date]
         , o.Currency
         , isnull((od.Qty * od.Unit_Price),0) as Amount         
         From dbo.[Orders] o with(NoLock, NoWait)
         Inner Join Order_Detail od with(NoLock, NoWait) on o.Order_No = od.Order_No          
         Inner Join Produce p with(NoWait, NoWait) on p.Produce_No = od.Produce_No
         Where p.Payment_No = @Payment_No
      )   
       Select o.Produce_No
       , o.Order_No
       , Convert(varchar(10), o.[Order_Date],111) as [Order_Date]
       , o.Currency
       , o.Amount
       , ode.Commission
       From tmpTable o 
       INNER JOIN (
         Select t.Order_DetailID, ROUND(isnull(sum(t.Amount * d.Rate),0),2) as Commission
         From tmpTable t
         Inner Join dbo.Order_Detail_Expense d WITH (NoLock, NoWait) ON d.Order_DetailID = t.Order_DetailID And d.Category = 'Commission'
         Group by t.Order_DetailID
       ) ode on ode.Order_DetailID = o.Order_DetailID  
   End
   `, req.body) ;
   //console.log(strSQL)
   db.sql(req.SiteDB, strSQL)
      .then((result) => {

         var DataSet = {Credits: (req.body.Mode == 0 || req.body.Mode == 1) ? result.recordsets[0] : []
           , Credits_Orders: (req.body.Mode == 0) ? result.recordsets[1] : (req.body.Mode == 2 ? result.recordsets[0] : [])
           , Total_Order_Amount:0
           , Total_Commission_Amount:0
        };

        DataSet.Credits.forEach((item) => {
         item.Amount = Math.round((item.Amount)*10000)/10000;
      });

         DataSet.Credits_Orders.forEach((item) => {
            DataSet.Total_Order_Amount += item.Amount;
            DataSet.Total_Commission_Amount += item.Commission;
            item.Amount = Math.round((item.Amount)*10000)/10000;
            item.Commission = Math.round((item.Commission)*10000)/10000;
         });

        DataSet.Total_Order_Amount = Math.round((DataSet.Total_Order_Amount)*10000)/10000;
        DataSet.Total_Commission_Amount = Math.round((DataSet.Total_Commission_Amount)*10000)/10000;

        //console.log(DataSet)
        res.send(DataSet);
      }).catch((err) => {
         console.log(err);
         res.status(500).send(err);
      })
});

//Maintain Credits
router.post('/Credits_Maintain',  function (req, res, next) {
   console.log("Call Credits_Maintain Api:",req.body);

   // req.body.Mode === 0 表示新增
   // req.body.Mode === 1 表示修改
   // req.body.Mode === 2 表示刪除
   var Size = 0;
   req.body.Payment_No = req.body.Payment_No ? `N'${req.body.Payment_No.trim().substring(0,20).replace(/'/g, '')}'` : `''`;
   
   var strSQL = format(`Declare @ROWCOUNT int, @Payment_No Varchar(30) = {Payment_No} 
   `, req.body);
   switch(req.body.Mode){
      case 0:
         req.body.Date = req.body.Date ? `'${req.body.Date.trim().substring(0,10)}'` : `'${moment().format('YYYY/MM/DD')}'`;         
         req.body.Payment_Term = req.body.Payment_Term ? `N'${req.body.Payment_Term.trim().substring(0,21).replace(/'/g, "''")}'` : `'L/C'`;
         req.body.Delivery_Term = req.body.Delivery_Term ? `N'${req.body.Delivery_Term.trim().substring(0,20).replace(/'/g, "''")}'` : `'FOB'`;
         req.body.FactoryID = req.body.FactoryID ? `N'${req.body.FactoryID.trim().substring(0,15).replace(/'/g, "''")}'` : `''`;         
         req.body.Currency = req.body.Currency ? `N'${req.body.Currency.trim().substring(0,4).replace(/'/g, "''")}'` : `'USD'`;

         strSQL += format(`
            Insert [dbo].[Credits] (Payment_No
               , [Date], Payment_Term, [Delivery_Term], [FactoryID]
               , [Currency], Amount
               , UserID, Data_Updater, Data_Update)
            Select @Payment_No as Payment_No
            , {Date} as Date            
            , dbo.Get_Payment_Term('', {Payment_Term}, 0, 0) as Payment_Term
            , {Delivery_Term} as Delivery_Term, {FactoryID} as FactoryID
            , {Currency} as Currency, 0 as Amount
            , N'${req.UserID}' as UserID, N'${req.UserID}' as Data_Updater, GetDate() as Data_Update
            Where (Select Count(*) From Credits m with(NoLock,NoWait) Where m.Payment_No = {Payment_No}) = 0;
                        
            Set @ROWCOUNT = @@ROWCOUNT;            
         `, req.body);
      break;
      case 1:
         switch(req.body.Name){
            case 'Date':
            case 'Latest_Day':
            case 'Expiry_Date':            
            case 'Property':
               Size = 10;
            break;
            case 'FactoryID':
               Size = 15;
            break;            
            case 'Currency':
               Size = 4;
            break;
            case 'Delivery_Term':
                  Size = 20;
            break;
            case 'Payment_No':
                  Size = 30;
            break;
            case 'Beneficiary':
                  Size = 80;
            break;
            case 'Payment_Term':
                  Size = 21;
            break;
            case 'Applicant':
                  Size = 50;
            break;
            case 'Ap_Address':
            case 'Bf_Address':
                  Size = 256;
            break;
            case 'Remark':
               Size = 65535;
            break;            
            default:
            break;
         }
         req.body.Value = Size == 0 ? (req.body.Value != null ? req.body.Value : null) : (req.body.Value ? `N'${req.body.Value.trim().replace(/'/g, "''")}'` : `''`);

         strSQL += format(`         
            Update [dbo].[Credits] Set [{Name}] = ${Size == 0 ? '{Value}': `substring({Value},1,${Size})`}
            , UserID = isnull(UserID, N'${req.UserID}')
            , Data_Updater = N'${req.UserID}'
            , Data_Update = GetDate()            
            ${req.body.Name == 'Applicant' ? ", Ap_Address = isnull((Select Address From Customer c with(NoLock,NoWait) Where c.CustomerID = {Value}), Ap_Address)":''}
            ${req.body.Name == 'Beneficiary' ? ", Bf_Address = isnull((SELECT Address FROM [dbo].[Credit_Accounts] p with(NoLock,NoWait) Where p.AccountID = {Value}), Bf_Address)":''}
            where Payment_No = @Payment_No
            ${req.body.Name == 'Payment_No' ? ' And (Select Count(*) From Credits m with(NoLock,NoWait) Where m.Payment_No = {Value}) = 0; set @Payment_No = {Value}; ':''}
            ;

            Set @ROWCOUNT = @@ROWCOUNT;
         `, req.body);
      break;
      case 2:
         strSQL += format(`
            Delete FROM [dbo].[Credits]             
            where Payment_No = @Payment_No
            And isnull(Source_No,'') = ''
            ;
            
            Set @ROWCOUNT = @@ROWCOUNT; 
         `, req.body);
      break;
        
   }

   strSQL += format(`
   Select @ROWCOUNT as Flag,  @Payment_No as Payment_No;

   `, req.body);
   //console.log(strSQL)
   db.sql(req.SiteDB, strSQL)
      .then((result) => {
         //console.log(result.recordsets[0])
         res.send({Flag:result.recordsets[0][0].Flag > 0, Payment_No: result.recordsets[0][0].Payment_No});
      }).catch((err) => {
         console.log(err);
         res.status(500).send(err);
      })
});

//Maintain Credits Orders Maintain
router.post('/Credits_Orders_Maintain',  function (req, res, next) {
   console.log("Call Credits_Orders_Maintain Api:",req.body);

   // req.body.Mode === 0 表示新增
   // req.body.Mode === 1 表示修改
   // req.body.Mode === 2 表示刪除
   var Size = 0;
   req.body.Payment_No = req.body.Payment_No ? `N'${req.body.Payment_No.trim().substring(0,30).replace(/'/g, '')}'` : `''`;
   req.body.Mode = req.body.Mode ? req.body.Mode : 0;
   req.body.Orders = req.body.Orders ? req.body.Orders : [];
      
   var strSQL = format(`Declare @ROWCOUNT int=0, @Amount float=0
   `, req.body);
   switch(req.body.Mode){
      case 0:
         var strSQL1 = '';

         req.body.Orders.forEach((item)=>{
            strSQL1 += format(`Insert into @tmpDetail (Produce_No) values (N'{Produce_No}');`,item)
         })

         strSQL += format(`         
         Declare @tmpDetail Table (Produce_No varchar(20))

         ${strSQL1}

         Update [dbo].[Produce] set Payment_No = {Payment_No}
         From Produce p
         Inner Join @tmpDetail t on t.Produce_No = p.Produce_No
         Where isnull(p.Payment_No,'') = ''; 
        
         Set @ROWCOUNT = @@ROWCOUNT;
         `, req.body);

      break;
      case 1:
      break;
      case 2:
         req.body.Produce_No = req.body.Produce_No ? `N'${req.body.Produce_No.trim().substring(0,20).replace(/'/g, '')}'` : `''`;         
         strSQL += format(`
            Update [dbo].[Produce] set Payment_No = null
            where Produce_No = {Produce_No};
                                    
            Set @ROWCOUNT = @@ROWCOUNT;
         `, req.body);
      break;
        
   }

   strSQL += format(`
   Select @ROWCOUNT as Flag;

   if(@ROWCOUNT > 0)
   Begin      
      Set @Amount = (Select Sum(od.Unit_Price * od.Qty) From Produce p with(NoLock,NoWait) Inner Join Order_Detail od with(NoLock,NoWait) on p.Produce_No = od.Produce_No Where p.Payment_No = {Payment_No} )

      Update [dbo].[Credits] Set UserID = isnull(UserID, N'${req.UserID}')
      , Data_Updater = N'${req.UserID}'
      , Data_Update = GetDate()
      , Amount = @Amount
      where Payment_No = {Payment_No};
   End
   Select @Amount as Amount
   `, req.body);
   //console.log(strSQL)
   db.sql(req.SiteDB, strSQL)
      .then((result) => {
         //console.log(result.recordsets[0])
         res.send({Flag:result.recordsets[0][0].Flag > 0
            , Amount: Math.round((result.recordsets[1][0].Amount)*10000)/10000
         });
      }).catch((err) => {
         console.log(err);
         res.status(500).send(err);
      })

});

//Get Credits Detail Add List
router.post('/Credits_Detail_Add_List',  function (req, res, next) {
console.log("Call Credits_Detail_Add_List Api:",req.body);

req.body.Mode = req.body.Mode ? req.body.Mode : 0;
req.body.Payment_No = req.body.Payment_No ? `N'${req.body.Payment_No.trim().replace(/'/g, "''")}'` : `''`;
req.body.FactoryID = req.body.FactoryID ? `N'${req.body.FactoryID.trim().replace(/'/g, "''")}'` : `''`;
req.body.Currency = req.body.Currency ? `N'${req.body.Currency.trim().replace(/'/g, "''")}'` : `''`;

var strSQL = format(`Declare @Payment_No varchar(20) = {Payment_No}, @FactoryID varchar(15) = {FactoryID}, @Currency varchar(4) = {Currency};`, req.body) ;

switch(req.body.Mode) {
   case 0:
      strSQL += format(`
      With tmpTable (Order_DetailID, Produce_No, Order_No, Order_Date, Currency, Amount) 
      as (
         Select od.Order_DetailID
         , p.Produce_No
         , o.Order_No
         , Convert(varchar(10), o.[Order_Date],111) as [Order_Date]
         , o.Currency
         , isnull((od.Qty * od.Unit_Price),0) as Amount         
         From dbo.[Orders] o with(NoLock, NoWait)
         Inner Join Order_Detail od with(NoLock, NoWait) on o.Order_No = od.Order_No          
         Inner Join Produce p with(NoWait, NoWait) on p.Produce_No = od.Produce_No
         Where isnull(p.Payment_No,'') = ''
         And p.FactoryID = {FactoryID}
         And o.Currency = {Currency}
      )
      Select cast(0 as bit) as flag
       , o.Produce_No
       , o.Order_No
       , Convert(varchar(10), o.[Order_Date],111) as [Order_Date]
       , o.Currency
       , o.Amount
       , ode.Commission
      From tmpTable o 
      INNER JOIN (
         Select t.Order_DetailID, ROUND(isnull(sum(t.Amount * d.Rate),0),2) as Commission
         From tmpTable t
         Inner Join dbo.Order_Detail_Expense d WITH (NoLock, NoWait) ON d.Order_DetailID = t.Order_DetailID And d.Category = 'Commission'
         Group by t.Order_DetailID
       ) ode on ode.Order_DetailID = o.Order_DetailID        
      `, req.body) ;
   break;
}

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

//Get Credit_Accounts_List
router.post('/Credit_Accounts_List',  function (req, res, next) {
   console.log("Call Credit_Accounts_List Api:", req.body);

   req.body.AccountID = req.body.AccountID ? `${req.body.AccountID.trim().substring(0,10).replace(/'/g, '')}` : ``;
   req.body.Name = req.body.Name ? `${req.body.Name.trim().substring(0,30).replace(/'/g, '')}` : ``;
   req.body.E_Name = req.body.E_Name ? `${req.body.E_Name.trim().substring(0,80).replace(/'/g, '')}` : ``;
   req.body.Address = req.body.Address ? `${req.body.Address.trim().substring(0,256).replace(/'/g, '')}` : ``;
   req.body.E_Address = req.body.E_Address ? `${req.body.E_Address.trim().substring(0,256).replace(/'/g, '')}` : ``;
   req.body.Tel = req.body.Tel ? `${req.body.Tel.trim().substring(0,15).replace(/'/g, '')}` : ``;
   req.body.Fax = req.body.Fax ? `${req.body.Fax.trim().substring(0,15).replace(/'/g, '')}` : ``;
   req.body.Create_Date_From = req.body.Create_Date_From ? `${req.body.Create_Date_From.trim().substring(0,10).replace(/'/g, '')}` : ``;
   req.body.Create_Date_To = req.body.Create_Date_To ? `${req.body.Create_Date_To.trim().substring(0,10).replace(/'/g, '')}` : ``;
   req.body.Closed = req.body.Closed ? req.body.Closed : 0;
   req.body.UserID = req.body.UserID ? `${req.body.UserID.trim().substring(0,256).replace(/'/g, '')}` : '';
   
   var strSQL = format(`
   SELECT TOP (1000) [AccountID]
   ,[Name]
   ,[E_Name]
   ,[Address]
   ,[E_Address]
   ,[Tel]
   ,[Fax]
   , convert(nvarchar(10),[Create_Date],111) as Create_Date
   , case when isnull(a.[Histiry_Date],'') = '' then 0 else 1 end as Closed
   ,[UserID]
   ,[Data_Update]
   ,[Data_Updater]
   FROM [Credit_Accounts] a with(NoLock,NoWait)   
   Where (N'{AccountID}' = '' or a.AccountID like N'%{AccountID}%' )
   And (N'{Name}' = '' or a.Name like N'%{Name}%')
   And (N'{E_Name}' = '' or a.E_Name like N'%{E_Name}%')
   And (N'{Address}' = '' or a.Address like N'%{Address}%')
   And (N'{E_Address}' = '' or a.E_Address like N'%{E_Address}%')
   And (N'{Tel}' = '' or a.Tel like N'%{Tel}%')
   And (N'{Fax}' = '' or a.Fax like N'%{Fax}%')
   And ((N'{Create_Date_From}' = '' or N'{Create_Date_To}' = '') or convert(date, a.[Create_Date],111) between N'{Create_Date_From}' And N'{Create_Date_To}')
   And ( case when isnull(a.[Histiry_Date], '') = '' then 0 else 1 end = {Closed})
   And (N'{UserID}' = '' or a.UserID like N'%{UserID}%')   
   ;
   `, req.body) ;
//console.log(strSQL)
  
   db.sql(req.SiteDB, strSQL)
      .then((result) => {
         var DataSet = {Detail_Info: result.recordsets[0]
         };

         res.send(DataSet);
      }).catch((err) => {
         console.log(err);
         res.status(500).send(err);
      })

});

//Get Credit_Accounts_Info
router.post('/Credit_Accounts_Info',  function (req, res, next) {
   console.log("Call Credit_Accounts_Info Api:", req.body);

   req.body.AccountID = req.body.AccountID ? `N'${req.body.AccountID.trim().substring(0,10).replace(/'/g, '')}'` : `''`;
   req.body.Mode = req.body.Mode ? req.body.Mode : 0;
 
   var strSQL = format(` Declare @Mode int = {Mode}, @AccountID Nvarchar(10) = {AccountID};
 
   if(@Mode = 0 or @Mode = 1)
   Begin
      SELECT TOP (1000) [AccountID]
      ,[Name]
      ,[E_Name]
      ,[Address]
      ,[E_Address]
      ,[Tel]
      ,[Fax]
      , convert(nvarchar(10),[Create_Date],111) as Create_Date
      , convert(nvarchar(10),[Histiry_Date],111) as History_Date
      , case when isnull(a.[Histiry_Date],'') = '' then 0 else 1 end as Closed
      ,[UserID]
      ,[Data_Update]
      ,[Data_Updater]
      FROM [Credit_Accounts] a with(NoLock,NoWait)      
      Where a.AccountID = @AccountID
   End   
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

//Maintain Credit_Accounts
 router.post('/Credit_Accounts_Maintain',  function (req, res, next) {
   console.log("Call Credit_Accounts_Maintain Api:",req.body);
 
   // req.body.Mode === 0 表示新增
   // req.body.Mode === 1 表示修改 
   // req.body.Mode === 2 表示刪除
   req.body.AccountID = req.body.AccountID ? `N'${req.body.AccountID.trim().substring(0,10).replace(/'/g, '')}'` : `''`;
 
   var strSQL = format(`Declare @ROWCOUNT int, @AccountID varchar(10) = {AccountID} `, req.body);
   switch(req.body.Mode){
      case 0:
         req.body.Name = req.body.Name ? `N'${req.body.Name.trim().substring(0,30).replace(/'/g, '')}'` : `''`;
         req.body.E_Name = req.body.E_Name ? `N'${req.body.E_Name.trim().substring(0,80).replace(/'/g, '')}'` : `''`;
         strSQL += format(`
           Insert into [dbo].[Credit_Accounts] (AccountID, Name, E_Name, UserID, Data_Updater, Data_Update)
           Select @AccountID as AccountID
             , {Name} as Name
             , {E_Name} as E_Name
             , '${req.UserID}' as [UserID]
             , '${req.UserID}' as [Data_Updater]
             , GetDate() as [Data_Update]          
           Where (Select count(*) From Credit_Accounts c WITH(NoWait, Nolock) Where c.AccountID = {AccountID}) = 0 ;
           Set @ROWCOUNT = @@ROWCOUNT;
         `, req.body);
      break;
      case 1:        
       
         var Size = 0;
         switch(req.body.Name){
           case 'AccountID':
               Size = 10;
           break;
           case 'Histiry_Date':
               Size = 0;
               req.body.Value = req.body.Value == 1 ? 'GetDate()' : null
           break;
           case 'Name':
             Size = 30;
           break;
           case 'E_Name':
             Size = 80;
           break;
           case 'Tel':
           case 'Fax':
             Size = 15;
           break;           
           case 'E_Address':
           case 'Address':
             Size = 256;
           break;
         }
         req.body.Value = Size == 0 ? (req.body.Value ? req.body.Value : null) : (req.body.Value ? `N'${req.body.Value.trim().replace(/'/g, "''")}'` : `''`);
  
         strSQL += format(`
            Update [dbo].[Credit_Accounts] Set [{Name}] = ${Size == 0 ? '{Value}': `substring({Value},1,${Size})`}
            where AccountID = {AccountID}
            ${req.body.Name == 'AccountID' ? ' And (Select count(*) From Credit_Accounts c WITH(NoWait, Nolock) Where c.AccountID = {Value}) = 0 ':''}  
            ;
            Set @ROWCOUNT = @@ROWCOUNT;
            ${req.body.Name == 'AccountID' ? ' if(@ROWCOUNT > 0) Begin Set @AccountID = {Value} End  ' :''}
         `, req.body);
         break;
      case 2:
         strSQL += format(`
            Delete FROM [dbo].[Credit_Accounts] 
            where AccountID = {AccountID} ; 
            Set @ROWCOUNT = @@ROWCOUNT;
         `, req.body);
      break;
   }
 
   strSQL += format(`
   Select @ROWCOUNT as Flag, @AccountID as AccountID;
   `, req.body);
    //console.log(strSQL)
   db.sql(req.SiteDB, strSQL)
      .then((result) => {
         //console.log(result.recordsets[0])
         res.send({Flag:result.recordsets[0][0].Flag > 0, AccountID: result.recordsets[0][0].AccountID});
      }).catch((err) => {
         console.log(err);
         res.status(500).send(err);
      })
 });
 
 //Check AccountID
 router.post('/Check_AccountID',  function (req, res, next) {
   console.log("Call Check_AccountID Api:",req.body);
 
   req.body.AccountID = req.body.AccountID ? `${req.body.AccountID.trim().substring(0,10).replace(/'/g, '')}` : '';
 
   var strSQL = format(`
   SELECT Count(*) as RecCount
   FROM [dbo].[Credit_Accounts] With(Nolock,NoWait)
   where ([AccountID] = N'{AccountID}')
   `, req.body) ;
   // console.log(strSQL)
   db.sql(req.SiteDB, strSQL)
      .then((result) => {
         //console.log(result.recordset[0].RecCount <= 0)
         res.send({Flag: result.recordset[0].RecCount <= 0});
      }).catch((err) => {
         console.log(err);
         res.status(500).send(err);
      })
 
 });

 /* Mark-Wang API End */


 /* Darren-Chang API Begin */
 /* Darren-Chang API End */

 module.exports = router;