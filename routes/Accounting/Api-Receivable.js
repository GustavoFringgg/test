var express = require('express');
var router = express.Router();
const format = require('string-format');
var db = require('../../config/DB_Connect');
const cloneDeep = require('lodash/cloneDeep');
let moment = require('moment');


/* Mark-Wang API Begin */

//Get Debit_List
router.post('/Debit_List',  function (req, res, next) {
   console.log("Call Debit List Api:", req.body);
  
   req.body.Debit_No = req.body.Debit_No ? `${req.body.Debit_No.trim().substring(0,20)}` : ``;
   req.body.Subject = req.body.Subject ? `${req.body.Subject.trim().substring(0,20)}` : ``;
   req.body.Debit_Date_From = req.body.Debit_Date_From ? `${req.body.Debit_Date_From.trim().substring(0,10).replace(/'/g, '')}` : ``;
   req.body.Debit_Date_To = req.body.Debit_Date_To ? `${req.body.Debit_Date_To.trim().substring(0,10).replace(/'/g, '')}` : ``;
   req.body.Department = req.body.Department ? `${req.body.Department.trim().substring(0,5).replace(/'/g, '')}` : '';
   req.body.CustomerID = req.body.CustomerID ? `${req.body.CustomerID.trim().substring(0,15)}` : ``;
   req.body.Season = req.body.Season ? `${req.body.Season.trim().substring(0,10).replace(/'/g, '')}` : '';   
   req.body.Commodity = req.body.Commodity ? `${req.body.Commodity.trim().substring(0,100)}` : ``;
   req.body.Expiry_Date_From = req.body.Expiry_Date_From ? `${req.body.Expiry_Date_From.trim().substring(0,10).replace(/'/g, '')}` : ``;
   req.body.Expiry_Date_To = req.body.Expiry_Date_To ? `${req.body.Expiry_Date_To.trim().substring(0,10).replace(/'/g, '')}` : ``;
   req.body.Currency = req.body.Currency ? `${req.body.Currency.trim().substring(0,3).replace(/'/g, '')}` : '';
   req.body.Received_Date_From = req.body.Received_Date_From ? `${req.body.Received_Date_From.trim().substring(0,10).replace(/'/g, '')}` : ``;
   req.body.Received_Date_To = req.body.Received_Date_To ? `${req.body.Received_Date_To.trim().substring(0,10).replace(/'/g, '')}` : ``;   
   req.body.UserID = req.body.UserID ? `${req.body.UserID.trim().substring(0,256).replace(/'/g, '')}` : '';
   
   
   var strSQL = format(`
   SELECT distinct d.[Debit_No]
   , isnull(d.[IsCredit_Note],0) as [IsCredit_Note]
   , d.Subject
   , convert(varchar(10) ,d.[Debit_Date] ,111) as [Debit_Date]
   , d.Department
   , d.CustomerID
   , d.Season
   , d.Commodity   
   , case when d.Debit_Date is null then '' else convert(varchar(10) ,DateAdd(Day,isnull(ms.Days,0), d.Debit_Date),111) end as [Expiry_Date]
   , d.Currency
   , d.Amount
   , case when MAX(m.Date) is null then '' else convert(varchar(10) ,MAX(m.Date),111) end AS Received_Date
   , d.Amount - d.Rcved_Amount AS Pending
   , d.Rcved_Amount AS Rcved_Amount
   , d.UserID
   , CONVERT (varChar(500), d.Remark) AS Remark 
   FROM Debit d with(NoLock,NoWait)
   Left Outer Join Money_Source ms with(NoLock,NoWait) on ms.Source_No = d.Debit_No
   LEFT OUTER JOIN Money m  with(NoLock,NoWait) on ms.MoneyID = m.MoneyID 
 where (N'{Debit_No}' = ''  or d.[Debit_No] like N'%{Debit_No}%')
   And (N'{Subject}' = ''  or d.[Subject] like N'%{Subject}%')
   And ((N'{Debit_Date_From}' = '' or N'{Debit_Date_To}' = '') or convert(date, d.[Debit_Date],111) between N'{Debit_Date_From}' And N'{Debit_Date_To}')
   And (N'{Department}' = '' or d.[Department] like N'{Department}%')
   And (N'{CustomerID}' = '' or d.[CustomerID] like N'%{CustomerID}%')
   And (N'{Season}' = '' or d.[Season] like N'%{Season}%')
   And (N'{Commodity}' = '' or d.[Commodity] like N'%{Commodity}%')
   And ((N'{Expiry_Date_From}' = '' or N'{Expiry_Date_To}' = '') or convert(varchar(10) ,DateAdd(Day,isnull(ms.Days,0),isnull(d.Debit_Date,GetDate())),111) between N'{Expiry_Date_From}' And N'{Expiry_Date_To}')
   And (N'{Currency}' = '' or d.[Currency] = N'{Currency}')
   And ((N'{Received_Date_From}' = '' or N'{Received_Date_To}' = '') or convert(date, m.[Date],111) between N'{Received_Date_From}' And N'{Received_Date_To}')   
   AND ({History} = case when isnull(m.MoneyID,0) > 0 then 1 else 0 end ) 
   And (N'{UserID}' = '' or d.[UserID] like N'%{UserID}%')
   And d.Debit_Date >= CONVERT (DATETIME, '2007-01-01 00:00:00', 102) 
   GROUP BY d.Debit_Date, d.Debit_No, d.[IsCredit_Note], d.Season, d.Amount, d.Amount - d.Rcved_Amount, d.Rcved_Amount 
   , case when d.Debit_Date is null then '' else convert(varchar(10) ,DateAdd(Day,isnull(ms.Days,0), d.Debit_Date),111) end
   , convert(varChar(500), d.Remark), d.Commodity, d.Subject, d.Currency, d.Department, d.CustomerID, d.UserID 
   
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
               Total_Pending_Amount: e.Pending,
              })
            } else {
               r.get(k).Total_Amount += e.Amount;
               r.get(k).Total_Pending_Amount += e.Pending;
            }
            return r;
          }, new Map).values()]

          DataSet.Currency_Info.forEach((item)=>{
            item.Total_Amount = Math.round(item.Total_Amount * 10000)/10000;
            item.Total_Pending_Amount = Math.round(item.Total_Pending_Amount * 10000)/10000;
         }) 

         res.send(DataSet);
      }).catch((err) => {
         console.log(err);
         res.status(500).send(err);
      })

});

//Get Debit_Receivable_List
router.post('/Debit_Receivable_List',  function (req, res, next) {
   console.log("Call Debit Receivable List Api:", req.body);

   req.body.MoneyID = req.body.MoneyID ? req.body.MoneyID : '';
   req.body.CustomerID = req.body.CustomerID ? `${req.body.CustomerID.trim().substring(0,15).replace(/'/g, '')}` : ``;
   req.body.Currency = req.body.Currency ? `${req.body.Currency.trim().substring(0,4).replace(/'/g, '')}` : ``;
   req.body.Reference_NO = req.body.Reference_NO ? `${req.body.Reference_NO.trim().substring(0,30).replace(/'/g, '')}` : ``;
   req.body.Type = req.body.Type ? `${req.body.Type.trim().substring(0,4).replace(/'/g, '')}` : ``;
   req.body.Source_Amount = req.body.Source_Amount ? req.body.Source_Amount : '';   
   req.body.Deposit = req.body.Deposit ? req.body.Deposit : '';   
   req.body.MasterID = req.body.MasterID ? `${req.body.MasterID.trim().substring(0,30).replace(/'/g, '')}` : ``;
   req.body.Date_From = req.body.Date_From ? `${req.body.Date_From.trim().substring(0,10).replace(/'/g, '')}` : ``;
   req.body.Date_To = req.body.Date_To ? `${req.body.Date_To.trim().substring(0,10).replace(/'/g, '')}` : ``;
   req.body.S_Name = req.body.S_Name ? `${req.body.S_Name.trim().substring(0,18).replace(/'/g, '')}` : ``;      
   req.body.UserID = req.body.UserID ? `${req.body.UserID.trim().substring(0,256).replace(/'/g, '')}` : '';   

   var strSQL = format(`
   SELECT MoneyID
   , Money.Type
   , CustomerID
   , Money.Accounting_Item_No
   , Money.Currency
   , Accounting_Item.Item
   , Money.Reference_NO
   , Money.BankID
   , ISNULL(Bank.S_Name, '') AS S_Name
   , ISNULL(Money.Source_Amount, 0) AS Source_Amount   
   , ISNULL(Money.Deposit, 0) AS Deposit
   , case when isnull(Money.Apply_Date,'') = '' then '' else convert(varchar(10), Money.Apply_Date,111) end as [Apply_Date]   
   , case when isnull(Money.Date,'') = '' then '' else convert(varchar(10), Money.Date,111) end as [Date]   
   , CONVERT(bit, Money.Bad_Debt) AS Bad_Debt
   , Money.UserID
   , Money.[MEMO]
   FROM Money with(NoLock,NoWait)
   INNER JOIN Bank with(NoLock,NoWait) ON Money.BankID = Bank.BankID 
   INNER JOIN Accounting_Item with(NoLock,NoWait) ON Money.Accounting_Item_No = Accounting_Item.Accounting_Item_No 
   Where (CONVERT (Varchar(20), Money.MoneyID) LIKE N'%{MoneyID}%') 
   And (N'{CustomerID}' = '' or Money.CustomerID like N'%{CustomerID}%')
   And (N'{Currency}' = '' or Money.Currency like N'%{Currency}%')
   And (N'{Reference_NO}' = '' or Money.Reference_NO like N'%{Reference_NO}%')   
   And ((N'{Date_From}' = '' or N'{Date_To}' = '') or convert(date, Money.[Date],111) between N'{Date_From}' And N'{Date_To}')
   AND (Money.Subject = 'Debit RCV') 
   And (N'{Type}' = '' or Money.Type like N'%{Type}%')
   And (N'{Source_Amount}' = '' or cast(ISNULL(Money.Source_Amount,0) as decimal(20,2)) LIKE N'%{Source_Amount}%')
   And (N'{Deposit}' = '' or cast(ISNULL(Money.Deposit,0) as decimal(20,2)) LIKE N'%{Deposit}%')
   AND (ISNULL(Money.MasterID, '') LIKE '%{MasterID}%') 
   AND (ISNULL(Bank.S_Name, '') LIKE '%{S_Name}%')    
   AND (0 = {OnlyBad_Debt} OR Money.Bad_Debt <> 0) 
   And (N'{UserID}' = '' or Money.UserID like N'%{UserID}%')
   ORDER BY Money.MoneyID DESC

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
               Total_Amount: e.Source_Amount,
               Total_Rcved_Amount: e.Deposit,
              })
            } else {
               r.get(k).Total_Amount += e.Source_Amount;
               r.get(k).Total_Rcved_Amount += e.Deposit;
            }
            return r;
          }, new Map).values()]

          DataSet.Currency_Info.forEach((item)=>{
            item.Total_Amount = Math.round(item.Total_Amount * 10000)/10000;
            item.Total_Rcved_Amount = Math.round(item.Total_Rcved_Amount * 10000)/10000;
         }) 
         res.send(DataSet);         
      }).catch((err) => {
         console.log(err);
         res.status(500).send(err);
      })

});

//Get Debit_Receivable_Info
 router.post('/Debit_Receivable_Info',  function (req, res, next) {
   console.log("Call Debit_Receivable_Info Api:",req.body);
 
   req.body.MoneyID = req.body.MoneyID ? req.body.MoneyID : null;
   req.body.Mode = req.body.Mode ? req.body.Mode : 0;
 
   //Mode == 0 Get Money and Money Source 
   //Mode == 1 Get Money Data
   //Mode == 2 Get Money Source Data
   //Mode == 3 Get Money Expense Data   
   var strSQL = format(`
   Declare @Mode int = {Mode};
 
   if(@Mode = 0 or @Mode = 1)
   Begin
      SELECT s.[MoneyID]
      , s.[Subject]
      , s.[Type]
      , s.[Accounting_Item_No]
      , ai.Item as Accounting_Item_Name
      , isnull(s.MasterID,'') as MasterID
      , s.[Currency]
      , c.Currency_Symbol
      , s.[BankID]
      , b.S_Name
      , s.[CustomerID]
      , s.[Reference_NO]
      , case when isnull(s.Apply_Date,'') = '' then '' else convert(varchar(10), s.Apply_Date,111) end as [Apply_Date]   
      , case when isnull(s.Date,'') = '' then '' else convert(varchar(10), s.Date,111) end as [Date] 
      , isnull(s.[Source_Amount],0) as Source_Amount
      , isnull(s.[Deposit],0) as Deposit
      , CONVERT (bit, s.Bad_Debt) AS Bad_Debt
      , s.[MEMO]
      , s.[UserID]
      , s.[Data_Updater]
      , Convert(varchar(20), s.[Data_Update],111) as [Data_Update]
      FROM Money s WITH (NoLock, NoWait)
      Inner Join Bank b with(NoLock,NoWait) On b.BankID = s.BankID
      Inner Join Accounting_Item ai with(NoLock,NoWait) On ai.Accounting_Item_No = s.Accounting_Item_No
      Inner Join currency c with(NoLock,NoWait) on c.Currency = s.[Currency]
      WHERE MoneyID = {MoneyID}
   End
   if(@Mode = 0 or @Mode = 2)
   Begin
       Select ms.Money_SourceID
       , ms.[MoneyID]
       , ms.[Source_No] as Debit_No
       , p.Commodity
       , p.Subject
       , isnull(ms.Days,0) as Days
       , Convert(varchar(10), p.[Debit_Date],111) as [Debit_Date]
       , Convert(varchar(10), DateAdd(Day, ms.Days, p.[Debit_Date]),111) as Expiry_Date
       , Convert(varchar(10), ms.Due_Date,111) as Due_Date
       , p.Currency       
       , isnull(p.Amount,0) as Rcv_Amount
       , isnull(p.Rcved_Amount,0) as Rcved_Amount
       , isnull(ms.Deposit,0) as Deposit
       , ms.Description
       From Money_Source ms with(NoLock, NoWait)
       Inner Join Debit p with(NoLock,NoWait) on ms.Source_No = p.Debit_No
       Where ms.MoneyID = {MoneyID}
       Order by ms.[Source_No], p.Subject
   End
   if(@Mode = 0 or @Mode = 3)
   Begin
       Select me.Money_ExpenseID
       , me.[MoneyID]
       , Convert(varchar(10), me.[Date],111) as [Date]       
       , rtrim(me.[Description]) as Description
       , isnull(me.[Deposit],0) as Deposit
       , me.Remark
       From Money_Expense me with(NoLock, NoWait)
       Where me.MoneyID = {MoneyID}
       Order by me.Date
   End
   `, req.body) ;
   //console.log(strSQL)
   db.sql(req.SiteDB, strSQL)
      .then((result) => {
         var DataSet = {Debit_Receivable: (req.body.Mode == 0 || req.body.Mode == 1) ? result.recordsets[0] : []
           , Debit_Receivable_Detail: (req.body.Mode == 0) ? result.recordsets[1] : (req.body.Mode == 2 ? result.recordsets[0] : [])
           , Debit_Receivable_Expense: (req.body.Mode == 0) ? result.recordsets[2] : (req.body.Mode == 3 ? result.recordsets[0] : [])
           , Total_Rcv_Amount:0
           , Total_Rcved_Amount:0
           , Total_Deposit_Amount:0
           , Total_Expense_Amount:0
        };

        DataSet.Debit_Receivable_Detail.forEach((item) => {
            item.Rcv_Amount = Math.round((item.Rcv_Amount)*10000)/10000;
            item.Rcved_Amount = Math.round((item.Rcved_Amount)*10000)/10000;
            item.Deposit = Math.round((item.Deposit)*10000)/10000;
            DataSet.Total_Rcv_Amount += item.Rcv_Amount;
            DataSet.Total_Rcved_Amount += item.Rcved_Amount;
            DataSet.Total_Deposit_Amount += item.Deposit;
        });

        DataSet.Debit_Receivable_Expense.forEach((item) => {
            item.Deposit = Math.round((item.Deposit)*10000)/10000;            
            DataSet.Total_Expense_Amount += item.Deposit;
        });

        DataSet.Total_Rcv_Amount = Math.round((DataSet.Total_Rcv_Amount)*10000)/10000;
        DataSet.Total_Rcved_Amount = Math.round((DataSet.Total_Rcved_Amount)*10000)/10000;
        DataSet.Total_Deposit_Amount = Math.round((DataSet.Total_Deposit_Amount)*10000)/10000;
        DataSet.Total_Expense_Amount = Math.round((DataSet.Total_Expense_Amount)*10000)/10000;        

        //console.log(DataSet)
        res.send(DataSet);
      }).catch((err) => {
         console.log(err);
         res.status(500).send(err);
      })
});

//Maintain Debit_Receivable
router.post('/Debit_Receivable_Maintain',  function (req, res, next) {
   console.log("Call Debit_Receivable_Maintain Api:",req.body);

   // req.body.Mode === 0 表示新增
   // req.body.Mode === 1 表示修改
   // req.body.Mode === 2 表示刪除
   var Size = 0;
   req.body.MoneyID = req.body.MoneyID ? req.body.MoneyID : null;
   
   var strSQL = format(`Declare @ROWCOUNT int, @MoneyID int = {MoneyID} 
   `, req.body);
   switch(req.body.Mode){
      case 0:
         
         req.body.Type = req.body.Type ? `N'${req.body.Type.trim().substring(0,4).replace(/'/g, "''")}'` : `'T/T'`;
         req.body.BankID = req.body.BankID ? req.body.BankID : 0;
         req.body.Currency = req.body.Currency ? `N'${req.body.Currency.trim().substring(0,4).replace(/'/g, "''")}'` : `'USD'`;
         req.body.CustomerID = req.body.CustomerID ? `N'${req.body.CustomerID.trim().substring(0,15).replace(/'/g, "''")}'` : `''`;         
         req.body.Date = req.body.Date ? `'${req.body.Date.trim().substring(0,10)}'` : `'${moment().format('YYYY/MM/DD')}'`;
         req.body.Apply_Date = req.body.Apply_Date ? `'${req.body.Apply_Date.trim().substring(0,10)}'` : `'${moment().format('YYYY/MM/DD')}'`;         

         strSQL += format(`
            Insert [dbo].[Money] (Type, Accounting_Item_No, [BankID], [Currency]
               , [Subject], Bad_Debt
               , [CustomerID], [Apply_Date]
               , UserID, Data_Updater, Data_Update)
            Select {Type} as Type, 5044 as [Accounting_Item_No], {BankID} as [BankID], {Currency} as [Currency]
               , 'Debit RCV' as Subject, 0 as Bad_Debt
               , case when {CustomerID} = '' then (Select top 1 CustomerID From Customer ) else {CustomerID} end as [CustomerID]
               , {Apply_Date} as [Apply_Date]
               , N'${req.UserID}' as UserID, N'${req.UserID}' as Data_Updater, GetDate() as Data_Update
            
            Set @ROWCOUNT = @@ROWCOUNT;
            Set @MoneyID = scope_identity();
         `, req.body);
      break;
      case 1:
         switch(req.body.Name){
            case 'Date':
            case 'Apply_Date':
            case 'Expiry_Date':
            case 'Unpay':
            case 'Acceptance':
               Size = 10;
            break;
            case 'CustomerID':
               Size = 15;
            break;
            case 'Type':
            case 'Currency':
               Size = 4;
            break;
            case 'Reference_NO':
            case 'MasterID':
                  Size = 30;
            break;
            case 'MEMO':
               Size = 65535;
            break;            
            default:
            break;
         }
         req.body.Value = Size == 0 ? (req.body.Value != null ? req.body.Value : null) : (req.body.Value ? `N'${req.body.Value.trim().replace(/'/g, "''")}'` : `''`);

         strSQL += format(`
            Update [dbo].[Money] Set [{Name}] = ${Size == 0 ? '{Value}': ` case when len({Value}) > 0 then substring({Value},1,${Size}) else null end`}
            where MoneyID = @MoneyID;

            Set @ROWCOUNT = @@ROWCOUNT;
         `, req.body);
      break;
      case 2:
         strSQL += format(`
            Delete FROM [dbo].[Money] where MoneyID = @MoneyID
            Set @ROWCOUNT = @@ROWCOUNT; 
            if(@ROWCOUNT > 0)
            Begin
               Delete FROM [dbo].[Money_Source] where MoneyID = @MoneyID
            End                         
         `, req.body);
      break;
        
   }

   strSQL += format(`
   Select @ROWCOUNT as Flag,  @MoneyID as MoneyID;

   if({Mode} = 1 and @ROWCOUNT > 0)
   Begin
      Update [dbo].[Money] Set UserID = isnull(UserID, N'${req.UserID}')
      , Data_Updater = N'${req.UserID}'
      , Data_Update = GetDate()
      where MoneyID = @MoneyID;
   End
   `, req.body);
   //console.log(strSQL)
   db.sql(req.SiteDB, strSQL)
      .then((result) => {
         //console.log(result.recordsets[0])
         res.send({Flag:result.recordsets[0][0].Flag > 0, MoneyID: result.recordsets[0][0].MoneyID});
      }).catch((err) => {
         console.log(err);
         res.status(500).send(err);
      })
});

//Maintain Debit Receivable Detail
router.post('/Debit_Receivable_Detail_Maintain',  function (req, res, next) {
   console.log("Call Debit_Receivable_Detail_Maintain Api:",req.body);

   // req.body.Mode === 0 表示新增
   // req.body.Mode === 1 表示修改
   // req.body.Mode === 2 表示刪除
   var Size = 0;
   req.body.MoneyID = req.body.MoneyID ? req.body.MoneyID: null;
   req.body.Money_SourceID = req.body.Money_SourceID ? req.body.Money_SourceID: null;
   
   var strSQL = format(`Declare @ROWCOUNT int=0
   `, req.body);
   switch(req.body.Mode){
      case 0:
         var strSQL1 = '';

         req.body.Money_Source.forEach((item)=>{
            strSQL1 += format(`Insert into @tmpDetail (Money_SourceID) values ({Money_SourceID});`,item)
         })

         strSQL += format(`         
         Declare @tmpDetail Table (Money_SourceID Int)

         ${strSQL1}

         Update [dbo].[Money_Source] set MoneyID = {MoneyID}
         From Money_Source ms
         Inner Join @tmpDetail t on ms.Money_SourceID = t.Money_SourceID
         Inner Join Debit p with(NoLock,NoWait) on ms.Source_No = p.Debit_No
         Inner Join [Money] m with(NoLock,NoWait) on m.CustomerID = p.CustomerID and m.Currency = p.Currency and m.type = ms.type And m.MoneyID = {MoneyID}
         Where ms.MoneyID is null;
        
         Set @ROWCOUNT = @@ROWCOUNT;
         `, req.body);

      break;
      case 1:
         
         switch(req.body.Name){
            case 'Deposit':

            break;
            default:
            break;               
         }

         req.body.Value = Size == 0 ? (req.body.Value != null ? req.body.Value : null) : (req.body.Value ? `N'${req.body.Value.trim().replace(/'/g, "''")}'` : `''`);

         strSQL += format(`         
            Update [dbo].[Money_Source] Set [{Name}] = ${Size == 0 ? 'Round({Value},3)': `substring({Value},1,${Size})`}            
            where Money_SourceID = {Money_SourceID};

            Set @ROWCOUNT = @@ROWCOUNT;
         `, req.body);
      break;
      case 2:
         strSQL += format(`
            Update [dbo].[Money_Source] Set MoneyID = null
            where Money_SourceID = {Money_SourceID}
                                    
            Set @ROWCOUNT = @@ROWCOUNT;
         `, req.body);
      break;
        
   }

   strSQL += format(`
   Select @ROWCOUNT as Flag;

   if(@ROWCOUNT > 0)
   Begin 
      Declare @Deposit float = isnull((Select sum(m.Deposit) From Money_Source m Where m.MoneyID = {MoneyID}),0) 
      , @Expense float = isnull((Select sum(me.Deposit) From Money_Expense me Where me.MoneyID = {MoneyID}),0)

      Update [dbo].[Money] Set UserID = isnull(UserID, N'${req.UserID}')
      , Data_Updater = N'${req.UserID}'
      , Data_Update = GetDate()
      , Deposit = Round((@Deposit + @Expense) ,3)
      , Source_Amount = Round(@Deposit,3)
      where MoneyID = {MoneyID};
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

//Maintain Debit Receivable Expense
router.post('/Debit_Receivable_Expense_Maintain',  function (req, res, next) {
   console.log("Call Debit_Receivable_Expense_Maintain Api:",req.body);

   // req.body.Mode === 0 表示新增
   // req.body.Mode === 1 表示修改
   // req.body.Mode === 2 表示刪除
   var Size = 0;
   req.body.MoneyID = req.body.MoneyID ? req.body.MoneyID: null;
   req.body.Money_ExpenseID = req.body.Money_ExpenseID ? req.body.Money_ExpenseID: null;
   
   var strSQL = format(`Declare @ROWCOUNT int=0, @Money_ExpenseID int = {Money_ExpenseID}
   `, req.body);
   switch(req.body.Mode){
      case 0:
         strSQL += format(`Declare @Date DateTime = isnull((Select Date From Money m Where m.MoneyID = {MoneyID}), GetDate());
         Insert [dbo].[Money_Expense] (MoneyID, Date, Deposit, Withdrawal)
         Select {MoneyID} as MoneyID, @Date as Date, 0 as Deposit, 0 as Withdrawal
                  
         Set @ROWCOUNT = @@ROWCOUNT; 
         Set @Money_ExpenseID = scope_identity();
         `, req.body);
      break;
      case 1:
         
         switch(req.body.Name){
            case 'Date':
               Size = 10;
            break;
            case 'Description':
               Size = 20;
            break;
            case 'Remark':
               Size = 30;
            break;
            default:
            break;               
         }

         req.body.Value = Size == 0 ? (req.body.Value != null ? req.body.Value : null) : (req.body.Value ? `N'${req.body.Value.trim().replace(/'/g, "''")}'` : `''`);

         strSQL += format(`         
            Update [dbo].[Money_Expense] Set [{Name}] = ${Size == 0 ? 'Round({Value},3)': `substring({Value},1,${Size})`}            
            where Money_ExpenseID = {Money_ExpenseID};

            Set @ROWCOUNT = @@ROWCOUNT;
         `, req.body);
      break;
      case 2:
         strSQL += format(`
            Delete From [dbo].[Money_Expense]
            where Money_ExpenseID = {Money_ExpenseID}
                                    
            Set @ROWCOUNT = @@ROWCOUNT;
         `, req.body);
      break;
        
   }

   strSQL += format(`
   Select @ROWCOUNT as Flag,  @Money_ExpenseID as Money_ExpenseID;

   if( ({Mode} = 1 or {Mode} = 2) and @ROWCOUNT > 0)
   Begin
      Declare @Deposit float = isnull((Select sum(m.Deposit) From Money_Source m Where m.MoneyID = {MoneyID}),0) 
      , @Expense float = isnull((Select sum(me.Deposit) From Money_Expense me Where me.MoneyID = {MoneyID}),0)

      Update [dbo].[Money] Set UserID = isnull(UserID, N'${req.UserID}')
      , Data_Updater = N'${req.UserID}'
      , Data_Update = GetDate()
      , Deposit = Round((@Deposit + @Expense) ,3)
      , Source_Amount = Round(@Deposit,3)
      where MoneyID = {MoneyID};
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

//Get Debit Receivable Detail Add List
router.post('/Debit_Receivable_Detail_Add_List',  function (req, res, next) {
console.log("Call Debit_Receivable_Detail_Add_List Api:",req.body);  

req.body.MoneyID = req.body.MoneyID ? req.body.MoneyID : null;
req.body.Debit_No = req.body.Debit_No ? `N'${req.body.Debit_No.trim().replace(/'/g, "''")}'` : `''`;
req.body.Debit_Date = req.body.Debit_Date ? `N'${req.body.Debit_Date.trim().replace(/'/g, "''")}'` : `''`;
req.body.Expiry_Date = req.body.Expiry_Date ? `N'${req.body.Expiry_Date.trim().replace(/'/g, "''")}'` : `''`;
req.body.Subject = req.body.Subject ? `'${req.body.Subject.trim().replace(/'/g, "''")}'` : `''`;
req.body.Commodity = req.body.Commodity ? `N'${req.body.Commodity.trim().replace(/'/g, "''")}'` : `''`;
req.body.Season = req.body.Season ? `N'${req.body.Season.trim().replace(/'/g, "''")}'` : `''`;
req.body.Amount = req.body.Amount ? `${req.body.Amount.trim()}` : ``;

var strSQL = format(`
Select cast(0 as bit) as flag, '' as Query, ms.Money_SourceID, rtrim(p.Debit_No) as Debit_No, p.Subject
, p.Commodity
, p.CustomerID, p.Season
, isnull(ms.Days,0) as Days
, Convert(varchar(10), p.[Debit_Date],111) as [Debit_Date]
, Convert(varchar(10), DateAdd(Day, ms.Days, p.[Debit_Date]),111) as Expiry_Date
, ms.Deposit, ms.Description
From Money_Source ms with(NoLock, NoWait)
Inner Join Debit p with(NoLock,NoWait) on ms.Source_No = p.Debit_No
Inner Join [Money] m with(NoLock,NoWait) on m.CustomerID = p.CustomerID and m.Currency = p.Currency and m.type = ms.type And m.MoneyID = {MoneyID}
Where ms.Subject = 'Debit RCV'
And ms.MoneyID is null
And ({Debit_No} = '' or p.Debit_No like {Debit_No} + '%' )
And ({Debit_Date} = '' or p.Debit_Date like {Debit_Date} + '%' )
And ({Expiry_Date} = '' or Convert(varchar(10), DateAdd(Day, ms.Days, p.[Debit_Date]),111) like {Expiry_Date} + '%' )
And ({Subject} = '' or p.Subject like {Subject} + '%' )
And ({Commodity} = '' or p.Commodity like {Commodity} + '%' )
And ({Season} = '' or p.Season like {Season} + '%' )
And (N'{Amount}' = '' or cast(ISNULL(ms.Deposit,0) as decimal(20,2)) LIKE N'%{Amount}%')
;

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

//Get Product_Shipment_Receivable_List
router.post('/Product_Shipment_Receivable_List',  function (req, res, next) {
   console.log("Call Product Shipment Receivable List Api:", req.body);

   req.body.MoneyID = req.body.MoneyID ? req.body.MoneyID : '';
   req.body.CustomerID = req.body.CustomerID ? `${req.body.CustomerID.trim().substring(0,15).replace(/'/g, '')}` : ``;
   req.body.Currency = req.body.Currency ? `${req.body.Currency.trim().substring(0,4).replace(/'/g, '')}` : ``;
   req.body.Reference_NO = req.body.Reference_NO ? `${req.body.Reference_NO.trim().substring(0,30).replace(/'/g, '')}` : ``;
   req.body.Type = req.body.Type ? `${req.body.Type.trim().substring(0,4).replace(/'/g, '')}` : ``;
   req.body.Source_Amount = req.body.Source_Amount ? req.body.Source_Amount : '';   
   req.body.Deposit = req.body.Deposit ? req.body.Deposit : '';   
   req.body.MasterID = req.body.MasterID ? `${req.body.MasterID.trim().substring(0,30).replace(/'/g, '')}` : ``;
   req.body.Date_From = req.body.Date_From ? `${req.body.Date_From.trim().substring(0,10).replace(/'/g, '')}` : ``;
   req.body.Date_To = req.body.Date_To ? `${req.body.Date_To.trim().substring(0,10).replace(/'/g, '')}` : ``;
   req.body.S_Name = req.body.S_Name ? `${req.body.S_Name.trim().substring(0,18).replace(/'/g, '')}` : ``;      
   req.body.UserID = req.body.UserID ? `${req.body.UserID.trim().substring(0,256).replace(/'/g, '')}` : '';   

   var strSQL = format(`
   SELECT MoneyID
   , m.Type
   , CustomerID
   , m.Accounting_Item_No
   , m.Currency
   , ai.Item
   , m.Reference_NO
   , m.BankID
   , ISNULL(b.S_Name, '') AS S_Name
   , ISNULL(m.Source_Amount, 0) AS Source_Amount
   , case when isnull(m.Date,'') = '' then '' else convert(varchar(10), m.Date,111) end as [Date]
   , case when isnull(m.Unpay,'') = '' then '' else convert(varchar(10), m.Unpay,111) end as [Unpay]
   , case when isnull(m.Acceptance,'') = '' then '' else convert(varchar(10), m.Acceptance,111) end as [Acceptance]
   , case when isnull(m.Expiry_Date,'') = '' then '' else convert(varchar(10), m.Expiry_Date,111) end as [Expiry_Date]
   , ISNULL(m.Deposit, 0) AS Deposit
   , ISNULL(m.MasterID, '') AS MasterID
   , CONVERT (bit, m.Bad_Debt) AS Bad_Debt
   , m.UserID
   , m.[MEMO]
   FROM Money m with(NoLock,NoWait)
   INNER JOIN Bank b with(NoLock,NoWait) ON m.BankID = b.BankID 
   INNER JOIN Accounting_Item ai with(NoLock,NoWait) ON m.Accounting_Item_No = ai.Accounting_Item_No 
   Where (m.Accounting_Item_No <> '2131')
   And (CONVERT (Varchar(20), m.MoneyID) LIKE N'%{MoneyID}%') 
   And (N'{CustomerID}' = '' or m.CustomerID like N'%{CustomerID}%')
   And (N'{Currency}' = '' or m.Currency like N'%{Currency}%')
   And (N'{Reference_NO}' = '' or m.Reference_NO like N'%{Reference_NO}%')   
   And ((N'{Date_From}' = '' or N'{Date_To}' = '') or convert(date, m.[Date],111) between N'{Date_From}' And N'{Date_To}')
   AND (m.Subject = 'PDSP RCV') 
   And (N'{Type}' = '' or m.Type like N'%{Type}%')
   And (N'{Source_Amount}' = '' or cast(ISNULL(m.Source_Amount,0) as decimal(20,2)) LIKE N'%{Source_Amount}%')
   And (N'{Deposit}' = '' or cast(ISNULL(m.Deposit,0) as decimal(20,2)) LIKE N'%{Deposit}%')
   AND (ISNULL(m.MasterID, '') LIKE '%{MasterID}%') 
   AND (ISNULL(b.S_Name, '') LIKE '%{S_Name}%')    
   AND (0 = {OnlyBad_Debt} OR m.Bad_Debt <> 0) 
   And (N'{UserID}' = '' or m.UserID like N'%{UserID}%')
   ORDER BY m.MoneyID DESC

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
               Total_Amount: e.Source_Amount,
               Total_Rcved_Amount: e.Deposit,
              })
            } else {
               r.get(k).Total_Amount += e.Source_Amount;
               r.get(k).Total_Rcved_Amount += e.Deposit;
            }
            return r;
          }, new Map).values()]

          DataSet.Currency_Info.forEach((item)=>{
            item.Total_Amount = Math.round(item.Total_Amount * 10000)/10000;
            item.Total_Rcved_Amount = Math.round(item.Total_Rcved_Amount * 10000)/10000;
         }) 

         res.send(DataSet);         
      }).catch((err) => {
         console.log(err);
         res.status(500).send(err);
      })

});

//Get Accounting_Item  4110 銷貨收入, 2131 預收款
router.post('/Accounting_Item_Info',  function (req, res, next) {
   console.log("Call Accounting_Item_Info Api:", req.body);

   var strSQL = format(`
   SELECT Accounting_Item_No as Value, Item as Label
   FROM [Accounting_Item] ai with(NoLock,NoWait)
   Where ai.Accounting_Item_No in (2131, 4110);

   `, req.body) ;
//console.log(strSQL)
  
   db.sql(req.Enterprise, strSQL)
      .then((result) => {
         var DataSet = result.recordsets[0];
         res.send(DataSet);         
      }).catch((err) => {
         console.log(err);
         res.status(500).send(err);
      })

});

//Get Acc_RCV Info
router.post('/Acc_RCV_Info',  function (req, res, next) {
   console.log("Call Acc_RCV_Info Api:", req.body);

   req.body.MoneyID = req.body.MoneyID ? req.body.MoneyID : null;

   var strSQL = format(`
   SELECT RCV_No
   FROM Money m with(NoLock,NoWait)
   Inner Join Acc_RCV ar with(NoLock,NoWait) on ar.[Type] = m.[Type] 
   And ar.[CustomerID] = m.[CustomerID] 
   And ar.[Currency] = m.[Currency]
   Where m.MoneyID = {MoneyID}
   And isnull(ar.Closed,0) = 0;

   `, req.body) ;
//console.log(strSQL)
  
   db.sql(req.SiteDB, strSQL)
      .then((result) => {
         var DataSet = result.recordsets[0];
         res.send(DataSet);         
      }).catch((err) => {
         console.log(err);
         res.status(500).send(err);
      })

});

 //Get Product_Shipment_Receivable_Info
 router.post('/Product_Shipment_Receivable_Info',  function (req, res, next) {
   console.log("Call Product_Shipment_Receivable_Info Api:",req.body);
 
   req.body.MoneyID = req.body.MoneyID ? req.body.MoneyID : null;
   req.body.Mode = req.body.Mode ? req.body.Mode : 0;
 
   //Mode == 0 Get Money and Money Source 
   //Mode == 1 Get Money Data
   //Mode == 2 Get Money Source Data
   //Mode == 3 Get Money Expense Data
   
   var strSQL = format(`
   Declare @Mode int = {Mode};
 
   if(@Mode = 0 or @Mode = 1)
   Begin
      SELECT s.[MoneyID]
      , s.[Subject]
      , s.[Type]
      , s.[Department]
      , s.[Accounting_Item_No]
      , ai.Item as Accounting_Item_Name
      , isnull(s.MasterID,'') as MasterID
      , s.[Currency]
      , c.Currency_Symbol
      , s.[BankID]
      , b.S_Name
      , s.[CustomerID]
      , s.[Reference_NO]
      , case when isnull(s.Apply_Date,'') = '' then '' else convert(varchar(10), s.Apply_Date,111) end as [Apply_Date]
      , case when isnull(s.Unpay,'') = '' then '' else convert(varchar(10), s.Unpay,111) end as [Unpay]
      , case when isnull(s.Acceptance,'') = '' then '' else convert(varchar(10), s.Acceptance,111) end as [Acceptance]
      , case when isnull(s.Grant_Date,'') = '' then '' else convert(varchar(10), s.Grant_Date,111) end as [Grant_Date]
      , case when isnull(s.Expiry_Date,'') = '' then '' else convert(varchar(10), s.Expiry_Date,111) end as [Expiry_Date]
      , case when isnull(s.Date,'') = '' then '' else convert(varchar(10), s.Date,111) end as [Date]
      , isnull(s.[Deposit],0) as Deposit
      , isnull(s.[Source_Amount],0) as Source_Amount
      , isnull(s.[Progress_Amount],0) as Progress_Amount
      , isnull(s.[Source_Amount],0) - isnull(s.[Progress_Amount],0) as Balance
      , CONVERT (bit, s.Bad_Debt) AS Bad_Debt
      , s.[MEMO]
      , s.[UserID]
      , s.[Data_Updater]
      , Convert(varchar(20), s.[Data_Update],111) as [Data_Update]
      FROM Money s WITH (NoLock, NoWait)
      Inner Join Bank b with(NoLock,NoWait) On b.BankID = s.BankID
      Inner Join Accounting_Item ai with(NoLock,NoWait) On ai.Accounting_Item_No = s.Accounting_Item_No
      Inner Join currency c with(NoLock,NoWait) on c.Currency = s.[Currency]
      WHERE MoneyID = {MoneyID}
   End
   if(@Mode = 0 or @Mode = 2)
   Begin
      Select ms.Money_SourceID
      , ms.[MoneyID]
      , ms.[Source_No] as Invoice_No
      , isnull(ms.Days,0) as Days
      , cast(ABS(ms.By_Doc_Rcv) as bit) as By_Doc_Rcv
      , Convert(varchar(10), p.[Doc_Completed],111) as [Doc_Completed]
      , Convert(varchar(10), case when ABS(ms.By_Doc_Rcv) = 1 And p.[Doc_Completed] is not null then DateAdd(Day, ms.Days, p.[Doc_Completed]) else DateAdd(Day, ms.Days, p.[F_ETD]) end ,111) as Pre_RCV_Date
      , Convert(varchar(10), ms.Due_Date,111) as Due_Date
      , Convert(varchar(10), p.[F_ETD],111) as [F_ETD]
      , isnull(p.Qty,0) as Qty
      , p.Currency
      , isnull(p.Rcv_Amount,0) as Rcv_Amount
      , isnull(p.Rcved_Amount,0) as Rcved_Amount
      , isnull(ms.Deposit,0) as Deposit
      , ms.Description
      From Money_Source ms with(NoLock, NoWait)
       Inner Join PDSP p with(NoLock,NoWait) on ms.Source_No = p.Shipment_NO 
       Where ms.MoneyID = {MoneyID}
       Order by p.[F_ETD], ms.[Source_No]
   End
   if(@Mode = 0 or @Mode = 3)
   Begin
       Select me.Money_ExpenseID
       , me.[MoneyID]
       , Convert(varchar(10), me.[Date],111) as [Date]       
       , rtrim(me.[Description]) as Description
       , isnull(me.[Deposit],0) as Deposit
       , me.Remark
       From Money_Expense me with(NoLock, NoWait)
       Where me.MoneyID = {MoneyID}
       Order by me.Date
   End
   `, req.body) ;
   //console.log(strSQL)
   db.sql(req.SiteDB, strSQL)
      .then((result) => {
         var DataSet = {Product_Shipment_Receivable: (req.body.Mode == 0 || req.body.Mode == 1) ? result.recordsets[0] : []
           , Product_Shipment_Receivable_Detail: (req.body.Mode == 0) ? result.recordsets[1] : (req.body.Mode == 2 ? result.recordsets[0] : [])
           , Product_Shipment_Receivable_Expense: (req.body.Mode == 0) ? result.recordsets[2] : (req.body.Mode == 3 ? result.recordsets[0] : [])
           , Total_Qty:0
           , Total_Rcv_Amount:0
           , Total_Rcved_Amount:0
           , Total_Deposit_Amount:0
           , Total_Expense_Amount:0
        };

        DataSet.Product_Shipment_Receivable_Detail.forEach((item) => {
            item.Rcv_Amount = Math.round((item.Rcv_Amount)*10000)/10000;
            item.Rcved_Amount = Math.round((item.Rcved_Amount)*10000)/10000;
            item.Deposit = Math.round((item.Deposit)*10000)/10000;
            DataSet.Total_Qty += item.Qty;
            DataSet.Total_Rcv_Amount += item.Rcv_Amount;
            DataSet.Total_Rcved_Amount += item.Rcved_Amount;
            DataSet.Total_Deposit_Amount += item.Deposit;
        });

        DataSet.Product_Shipment_Receivable_Expense.forEach((item) => {
            item.Deposit = Math.round((item.Deposit)*10000)/10000;            
            DataSet.Total_Expense_Amount += item.Deposit;
        });

        DataSet.Total_Qty = Math.round((DataSet.Total_Qty)*10000)/10000;
        DataSet.Total_Rcv_Amount = Math.round((DataSet.Total_Rcv_Amount)*10000)/10000;
        DataSet.Total_Rcved_Amount = Math.round((DataSet.Total_Rcved_Amount)*10000)/10000;
        DataSet.Total_Deposit_Amount = Math.round((DataSet.Total_Deposit_Amount)*10000)/10000;
        DataSet.Total_Expense_Amount = Math.round((DataSet.Total_Expense_Amount)*10000)/10000;        

        //console.log(DataSet)
        res.send(DataSet);
      }).catch((err) => {
         console.log(err);
         res.status(500).send(err);
      })
});

//Maintain Product_Shipment_Receivable
router.post('/Product_Shipment_Receivable_Maintain',  function (req, res, next) {
   console.log("Call Product_Shipment_Receivable_Maintain Api:",req.body);

   // req.body.Mode === 0 表示新增
   // req.body.Mode === 1 表示修改
   // req.body.Mode === 2 表示刪除
   var Size = 0;
   req.body.MoneyID = req.body.MoneyID ? req.body.MoneyID : null;
   req.body.Accounting_Item_No = req.body.Accounting_Item_No != null ? req.body.Accounting_Item_No : '4110';
   
   var strSQL = format(`Declare @ROWCOUNT int, @MoneyID int = {MoneyID} 
   `, req.body);
   switch(req.body.Mode){
      case 0:
         req.body.Type = req.body.Type ? `N'${req.body.Type.trim().substring(0,4).replace(/'/g, "''")}'` : `'T/T'`;
         req.body.BankID = req.body.BankID ? req.body.BankID : 0;
         req.body.CustomerID = req.body.CustomerID ? `N'${req.body.CustomerID.trim().substring(0,15).replace(/'/g, "''")}'` : `''`;         
         req.body.Currency = req.body.Currency ? `N'${req.body.Currency.trim().substring(0,4).replace(/'/g, "''")}'` : `'USD'`;
         req.body.Apply_Date = req.body.Apply_Date ? `'${req.body.Apply_Date.trim().substring(0,10)}'` : `'${moment().format('YYYY/MM/DD')}'`;

         strSQL += format(`
            Insert [dbo].[Money] (Type, Accounting_Item_No, [BankID], [Currency]
               , [Subject], Bad_Debt
               , [CustomerID], [Apply_Date]
               , UserID, Data_Updater, Data_Update)
            Select {Type} as Type, {Accounting_Item_No} as [Accounting_Item_No], {BankID} as [BankID], {Currency} as [Currency]
               , 'PDSP RCV' as Subject, 0 as Bad_Debt
               , case when {CustomerID} = '' then (Select top 1 CustomerID From Customer ) else {CustomerID} end as [CustomerID]
               , {Apply_Date} as [Apply_Date]
               , N'${req.UserID}' as UserID, N'${req.UserID}' as Data_Updater, GetDate() as Data_Update
            
            Set @ROWCOUNT = @@ROWCOUNT;
            Set @MoneyID = scope_identity();
         `, req.body);
      break;
      case 1:
         switch(req.body.Name){
            case 'Date':
            case 'Apply_Date':
            case 'Expiry_Date':
            case 'Acceptance':
            case 'Unpay':
            case 'Grant_Date':            
               Size = 10;
            break;
            case 'CustomerID':
               Size = 15;
            break;
            case 'Type':
            case 'Currency':
               Size = 4;
            break;
            case 'Department':
               Size = 5;
            break;
            case 'Reference_NO':
            case 'MasterID':
                  Size = 30;
            break;
            case 'MEMO':
               Size = 65535;
            break;            
            default:
            break;
         }
         req.body.Value = Size == 0 ? (req.body.Value != null ? req.body.Value : null) : (req.body.Value ? `N'${req.body.Value.trim().replace(/'/g, "''")}'` : `''`);
        
         switch(req.body.Name){
            case 'Source_Amount':
               strSQL += format(`
                  Update [dbo].[Money] Set [Source_Amount] = {Value}
                   , Deposit = isnull({Value},0) + isnull((Select sum(Deposit) From Money_Expense me with(NoLock,NoWait) Where me.MoneyID = @MoneyID),0)
                  where MoneyID = @MoneyID                   
                  ${req.body.Accounting_Item_No == '2131' ? ' And (Select count(*) From Money_Source ms with(NoLock,NoWait) Where ms.MoneyID = @MoneyID) = 0':''}
                  ;
      
                  Set @ROWCOUNT = @@ROWCOUNT;
               `, req.body);   
            break;
            case 'Currency':
            case 'CustomerID':            
                  strSQL += format(`         
                  Update [dbo].[Money] Set [{Name}] = ${Size == 0 ? '{Value}': ` case when len({Value}) > 0 then substring({Value},1,${Size}) else null end`}            
                  where MoneyID = @MoneyID
                  And (Select count(*) From Money_Source ms with(NoLock,NoWait) Where ms.MoneyID = @MoneyID) = 0;
      
                  Set @ROWCOUNT = @@ROWCOUNT;
               `, req.body);   
            break;
            default:
               strSQL += format(`         
                  Update [dbo].[Money] Set [{Name}] = ${Size == 0 ? '{Value}': ` case when len({Value}) > 0 then substring({Value},1,${Size}) else null end`}            
                  where MoneyID = @MoneyID;
      
                  Set @ROWCOUNT = @@ROWCOUNT;
               `, req.body);   
            break;
         }

      break;
      case 2:
         strSQL += format(`
            Delete FROM [dbo].[Money] where MoneyID = @MoneyID
            Set @ROWCOUNT = @@ROWCOUNT; 
            if(@ROWCOUNT > 0)
            Begin
               Delete FROM [dbo].[Money_Source] where MoneyID = @MoneyID
            End                         
         `, req.body);
      break;
        
   }

   strSQL += format(`
   Select @ROWCOUNT as Flag,  @MoneyID as MoneyID;

   if({Mode} = 1 and @ROWCOUNT > 0)
   Begin
      Update [dbo].[Money] Set UserID = isnull(UserID, N'${req.UserID}')
      , Data_Updater = N'${req.UserID}'
      , Data_Update = GetDate()
      where MoneyID = @MoneyID;
   End
   `, req.body);

   //console.log(strSQL)
   db.sql(req.SiteDB, strSQL)
      .then((result) => {
         //console.log(result.recordsets[0])
         res.send({Flag:result.recordsets[0][0].Flag > 0, MoneyID: result.recordsets[0][0].MoneyID});
      }).catch((err) => {
         console.log(err);
         res.status(500).send(err);
      })
});

//Maintain Product Shipment Receivable Detail
router.post('/Product_Shipment_Receivable_Detail_Maintain',  function (req, res, next) {
   console.log("Call Product_Shipment_Receivable_Detail_Maintain Api:",req.body);

   // req.body.Mode === 0 表示新增
   // req.body.Mode === 1 表示修改
   // req.body.Mode === 2 表示刪除
   var Size = 0;
   req.body.MoneyID = req.body.MoneyID ? req.body.MoneyID: null;
   req.body.Money_SourceID = req.body.Money_SourceID ? req.body.Money_SourceID: null;
   req.body.Accounting_Item_No = req.body.Accounting_Item_No != null ? req.body.Accounting_Item_No : '4110';
   
   var strSQL = format(`Declare @ROWCOUNT int=0, @Accounting_Item_No varchar(10) = {Accounting_Item_No}
   `, req.body);
   switch(req.body.Mode){
      case 0:
         var strSQL1 = '';

         req.body.Money_Source.forEach((item)=>{
            strSQL1 += format(`Insert into @tmpDetail (Money_SourceID) values (N'{Money_SourceID}');`,item)
         })

         strSQL += format(`         
         Declare @tmpDetail Table (RecNo int IDENTITY(1, 1), Money_SourceID int)
         Declare @Money_SourceID int
         , @RecNo int = 0
         

         ${strSQL1}

         if(@Accounting_Item_No = '4110' or @Accounting_Item_No = '2131')
         Begin
            Update [dbo].[Money_Source] set MoneyID = {MoneyID}
            From Money_Source ms
            Inner Join @tmpDetail t on t.Money_SourceID = ms.Money_SourceID      
            Inner Join PDSP p with(NoLock,NoWait) on ms.Source_No = p.Shipment_No
            Inner Join [Money] m with(NoLock,NoWait) on m.CustomerID = p.CustomerID and m.Currency = p.Currency and m.type = ms.type And m.MoneyID = {MoneyID}
            Where ms.MoneyID is null; 

            Set @ROWCOUNT += @@ROWCOUNT;

            Update [dbo].[Money] Set 
            Progress_Amount = Round(isnull((Select sum(m.Deposit) From Money_Source m Where m.MoneyID = {MoneyID}),0),3)
            where MoneyID = {MoneyID};
            
         End
/*
         if(@Accounting_Item_No = '2131')
         Begin

            Set @RecNo = (Select count(*) From @tmpDetail);

            while(@RecNo > 0)
            begin
               Select @Money_SourceID = Money_SourceID From @tmpDetail t Where t.RecNo = @RecNo;

               Update [dbo].[Money_Source] set MoneyID = {MoneyID}
               From [dbo].[Money_Source] ms
               Where ms.Money_SourceID = @Money_SourceID
               And isnull((Select isnull(Source_Amount,0) - isnull(Progress_Amount,0) From Money m where m.MoneyID = {MoneyID}) ,0) >= ms.Deposit
               And ms.Deposit > 0;

               Set @ROWCOUNT += @@ROWCOUNT;

               Update [dbo].[Money] Set 
               Progress_Amount = Round(isnull((Select sum(m.Deposit) From Money_Source m Where m.MoneyID = {MoneyID}),0),3)
               where MoneyID = {MoneyID};
               
               set @RecNo = @RecNo -1
            End            
         End         
         */

         `, req.body);

      break;
      case 1:
         
         switch(req.body.Name){
            case 'Deposit':

            break;
            default:
            break;               
         }

         req.body.Value = Size == 0 ? (req.body.Value != null ? req.body.Value : null) : (req.body.Value ? `N'${req.body.Value.trim().replace(/'/g, "''")}'` : `''`);

         strSQL += format(`         
            Update [dbo].[Money_Source] Set [{Name}] = ${Size == 0 ? 'Round({Value},3)': `substring({Value},1,${Size})`}            
            where Money_SourceID = {Money_SourceID};

            Set @ROWCOUNT = @@ROWCOUNT;
         `, req.body);
      break;
      case 2:
         strSQL += format(`
            Update [dbo].[Money_Source] set MoneyID = null
            where Money_SourceID = {Money_SourceID};
            Set @ROWCOUNT = @@ROWCOUNT;

            Update [dbo].[Money] Set 
            Progress_Amount = Round(isnull((Select sum(m.Deposit) From Money_Source m Where m.MoneyID = {MoneyID}),0),3)
            where MoneyID = {MoneyID};
      
         `, req.body);
      break;
        
   }

   strSQL += format(`
   Select @ROWCOUNT as Flag;

   if(@ROWCOUNT > 0)
   Begin
      Update [dbo].[Money] Set UserID = isnull(UserID, N'${req.UserID}')
      , Data_Updater = N'${req.UserID}'
      , Data_Update = GetDate()
      where MoneyID = {MoneyID};
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

//Maintain Product Shipment Receivable Expense
router.post('/Product_Shipment_Receivable_Expense_Maintain',  function (req, res, next) {
   console.log("Call Product_Shipment_Receivable_Expense_Maintain Api:",req.body);

   // req.body.Mode === 0 表示新增
   // req.body.Mode === 1 表示修改
   // req.body.Mode === 2 表示刪除
   var Size = 0;
   req.body.MoneyID = req.body.MoneyID ? req.body.MoneyID: null;
   req.body.Money_ExpenseID = req.body.Money_ExpenseID ? req.body.Money_ExpenseID: null;
   
   var strSQL = format(`Declare @ROWCOUNT int=0, @Money_ExpenseID int = {Money_ExpenseID}
   `, req.body);
   switch(req.body.Mode){
      case 0:
         strSQL += format(`Declare @Date DateTime = isnull((Select m.[Date] From Money m Where m.MoneyID = {MoneyID}), GetDate());
         Insert [dbo].[Money_Expense] (MoneyID, Date, Deposit, Withdrawal)
         Select {MoneyID} as MoneyID, @Date as Date, 0 as Deposit, 0 as Withdrawal
                  
         Set @ROWCOUNT = @@ROWCOUNT; 
         Set @Money_ExpenseID = scope_identity();
         `, req.body);
      break;
      case 1:
         
         switch(req.body.Name){
            case 'Date':
               Size = 10;
            break;
            case 'Description':
               Size = 20;
            break;
            case 'Remark':
               Size = 30;
            break;
            default:
            break;               
         }

         req.body.Value = Size == 0 ? (req.body.Value != null ? req.body.Value : null) : (req.body.Value ? `N'${req.body.Value.trim().replace(/'/g, "''")}'` : `''`);

         strSQL += format(`         
            Update [dbo].[Money_Expense] Set [{Name}] = ${Size == 0 ? 'Round({Value},3)': `substring({Value},1,${Size})`}            
            where Money_ExpenseID = {Money_ExpenseID};

            Set @ROWCOUNT = @@ROWCOUNT;
         `, req.body);
      break;
      case 2:
         strSQL += format(`
            Delete From [dbo].[Money_Expense]
            where Money_ExpenseID = {Money_ExpenseID}
                                    
            Set @ROWCOUNT = @@ROWCOUNT;
         `, req.body);
      break;
        
   }

   strSQL += format(`   
   Select @ROWCOUNT as Flag,  @Money_ExpenseID as Money_ExpenseID;

   if( @ROWCOUNT > 0)
   Begin
      Declare @Expense float = isnull((Select sum(me.Deposit) From Money_Expense me Where me.MoneyID = {MoneyID}),0)

      Update [dbo].[Money] Set UserID = isnull(UserID, N'${req.UserID}')
      , Data_Updater = N'${req.UserID}'
      , Data_Update = GetDate()
      , Deposit = Round((isnull(Source_Amount,0) + @Expense) ,3)
      , Expense = @Expense
      where MoneyID = {MoneyID};
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

//Get Product Shipment Receivable Detail Add List
router.post('/Product_Shipment_Receivable_Detail_Add_List',  function (req, res, next) {
console.log("Call Product_Shipment_Receivable_Detail_Add_List Api:",req.body);  

req.body.MoneyID = req.body.MoneyID ? req.body.MoneyID : null;
req.body.Shipment_No = req.body.Shipment_No ? `N'${req.body.Shipment_No.trim().replace(/'/g, "''")}'` : `''`;
req.body.F_ETD = req.body.F_ETD ? `'${req.body.F_ETD.trim().replace(/'/g, "''")}'` : `''`;
req.body.Amount = req.body.Amount ? `${req.body.Amount.trim()}` : ``;
req.body.Accounting_Item_No = req.body.Accounting_Item_No != null ? req.body.Accounting_Item_No : '4110';
req.body.Days_Flag = req.body.Days_Flag != null ? req.body.Days_Flag : 1;

var strSQL = format(`
Select cast(0 as bit) as flag
, ms.Money_SourceID
, ms.[MoneyID]
, p.[Shipment_No] as Shipment_No
, isnull(ms.Days,0) as Days
, cast(ABS(ms.By_Doc_Rcv) as bit) as By_Doc_Rcv
, Convert(varchar(10), p.[Doc_Completed],111) as [Doc_Completed]
, Convert(varchar(10), case when ABS(ms.By_Doc_Rcv) = 1 And p.[Doc_Completed] is not null then DateAdd(Day, ms.Days, p.[Doc_Completed]) else DateAdd(Day, ms.Days, p.[F_ETD]) end ,111) as Pre_RCV_Date
, Convert(varchar(10), p.[Accounting_Lock_Date],111) as [Accounting_Lock_Date]
, Convert(varchar(10), p.[F_ETD],111) as [F_ETD]
, Convert(varchar(10), ms.[Due_Date],111) as [Due_Date]
, isnull(p.Qty,0) as Qty
, p.Currency
, isnull(p.Rcv_Amount,0) as Rcv_Amount
, isnull(p.Rcved_Amount,0) as Rcved_Amount
, isnull(ms.Deposit,0) as Deposit
, ms.Description
From Money_Source ms with(NoLock, NoWait)
Inner Join PDSP p with(NoLock,NoWait) on ms.Source_No = p.Shipment_No
Inner Join [Money] m with(NoLock,NoWait) on m.CustomerID = p.CustomerID and m.Currency = p.Currency and m.type = ms.type And m.MoneyID = {MoneyID}
Where ms.Subject = 'PDSP RCV'
And ms.MoneyID is null
And p.Accounting_Lock_Date is not null
And ({Shipment_No} = '' or p.Shipment_No like {Shipment_No} + '%' )
And ({F_ETD} = '' or convert(varchar(10),p.F_ETD,111) like {F_ETD} + '%' )
And (N'{Amount}' = '' or cast(ISNULL(ms.Deposit,0) as decimal(20,2)) LIKE N'%{Amount}%')
--And ({Accounting_Item_No} != '2131' or ({Accounting_Item_No} = '2131' And ({Days_Flag} = 0 or ms.Days <= 0) And ms.Deposit <= (isnull(m.Source_Amount,0) - isnull(m.Progress_Amount,0))) )
And ({Accounting_Item_No} != '2131' or ({Accounting_Item_No} = '2131' And ({Days_Flag} = 0 or ms.Days <= 0)) )
And ms.Deposit > 0
Order by p.[F_ETD], p.[Shipment_No]
;
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

//Get Department's OrganizationID
router.post('/Organization', function (req, res, next) {
  console.log("Call Organization Api Organization:", req.body);

  var strSQL = format(`SELECT distinct [OrganizationID]
  FROM [dbo].[Department] d WITH (NoWait, Nolock)
  Where d.Department_Code in (
    Select distinct Department From PDSP with (NoWait, Nolock)
    union
    Select distinct Department From Debit with (NoWait, Nolock)
    union
    Select distinct Department From Money with (NoWait, Nolock) Where Accounting_Item_No = '2131'
  )
  --And (d.History is null);
    `, req.body);

  //console.log(strSQL)
  db.sql(req.SiteDB, strSQL)
    .then((result) => {
      //console.log(result)
      res.send(result.recordset);
    }).catch((err) => {
      console.log(err);
      res.status(500).send(err);
    })
});

//Get Account_Receivable_Report_Info
router.post('/Company_Account_Receivable_Report_Info',  function (req, res, next) {
   console.log("Call Account_Receivable_Report_Info Api:",req.body);  
 
   req.body.Mode = req.body.Mode ? req.body.Mode : 0;
   req.body.OrganizationID = req.body.OrganizationID != null ? `N'${req.body.OrganizationID.trim().replace(/'/g, "''")}'` : `''`;
       
   //Mode == 0 Shipping Sheet Report
   var strSQL = format(`Declare @Mode int = {Mode}, @OrganizationID varchar(10) = {OrganizationID};   
   Declare @TmpTable Table (CustomerID varchar(15), islitigation int default(0), Subject varchar(20), Type varchar(100), Currency varchar(4), Amount float, Due_Date DateTime)

   --T/T 未送件
   Insert @TmpTable (CustomerID, islitigation, Subject, Type, Currency, Amount, Due_Date)
    SELECT p.CustomerID
   , isnull(p.islitigation,0) as islitigation
   , case when ms.Due_Date <= GetDate() And ms.Due_Date is not null then 'PDSP_OverDue' else 'PDSP' End as Subject   
   , isnull(ms.Type,'T/T') as Type
   , p.Currency
   , Round(sum(isnull(ms.Deposit,0)),2)  as Amount
   , ms.Due_Date
    FROM Money_Source ms with(NoLock,NoWait)
    INNER JOIN PDSP p with(NoLock,NoWait) ON ms.Source_No = p.Shipment_NO
    Left Outer Join Department d with(NoLock,NoWait) ON p.Department = d.Department_Code
    WHERE (ms.Subject = 'PDSP RCV') 
    AND (ms.Type = 'T/T')       
    AND (p.Doc_Completed IS NULL)
    And (ms.MoneyID IS NULL)
    And (p.F_ETD between '2007-01-01' And GETDATE())
    And (@OrganizationID = '' or d.OrganizationID = @OrganizationID)
    Group by p.CustomerID
   , isnull(p.islitigation,0) 
   , case when ms.Due_Date <= GetDate() And ms.Due_Date is not null then 'PDSP_OverDue' else 'PDSP' End 
   , isnull(ms.Type,'T/T') 
   , p.Currency , ms.Due_Date

   --T/T 送件未回收
   Insert @TmpTable (CustomerID, islitigation, Subject, Type, Currency, Amount, Due_Date)
   SELECT p.CustomerID
   , isnull(p.islitigation,0) as islitigation
   , case when ms.Due_Date <= GetDate() And ms.Due_Date is not null then 'PDSP_OverDue' else 'PDSP' End as Subject   
   , isnull(ms.Type,'T/T') as Type
   , p.Currency
   , Round(sum(isnull(ms.Deposit,0)),2)  as Amount
   , ms.Due_Date
    FROM dbo.Money_Source ms with(NoLock,NoWait)
    LEFT OUTER JOIN dbo.Money m with(NoLock,NoWait) ON ms.MoneyID = m.MoneyID 
    INNER JOIN dbo.PDSP p with(NoLock,NoWait) ON ms.Source_No = p.Shipment_NO 
    Left Outer Join Department d with(NoLock,NoWait) ON p.Department = d.Department_Code
    LEFT OUTER JOIN dbo.[@MoneyID_TExpense] ON m.MoneyID = dbo.[@MoneyID_TExpense].MoneyID 
    WHERE (ms.Subject = 'PDSP RCV') 
    AND (ms.Type = 'T/T') 
    AND (p.Doc_Completed IS NOT NULL)        
    And (p.F_ETD between '2007-01-01' And GETDATE()) 
    AND (m.[Date] IS NULL)
    And (@OrganizationID = '' or d.OrganizationID = @OrganizationID)
    Group by p.CustomerID
   , isnull(p.islitigation,0) 
   , case when ms.Due_Date <= GetDate() And ms.Due_Date is not null then 'PDSP_OverDue' else 'PDSP' End 
   , isnull(ms.Type,'T/T') 
   , p.Currency , ms.Due_Date

   --未押匯
   Insert @TmpTable (CustomerID, islitigation, Subject, Type, Currency, Amount, Due_Date)
    SELECT p.CustomerID
   , isnull(p.islitigation,0) as islitigation
   , case when ms.Due_Date <= GetDate() And ms.Due_Date is not null then 'PDSP_OverDue' else 'PDSP' End as Subject   
   , ms.Type
   , p.Currency
   , Round(sum(isnull(ms.Deposit,0)),2)  as Amount
   , ms.Due_Date
    FROM dbo.Money_Source ms with(NoLock,NoWait)
    INNER JOIN dbo.PDSP p with(NoLock,NoWait) ON ms.Source_No = p.Shipment_NO 
    Left Outer Join Department d with(NoLock,NoWait) ON p.Department = d.Department_Code
    WHERE  (ms.Subject = 'PDSP RCV') 
    AND (ms.MoneyID IS NULL) 
    And (p.F_ETD between '2006-01-01' And GETDATE()) 
    AND (ms.Type <> 'T/T') 
    And (@OrganizationID = '' or d.OrganizationID = @OrganizationID)
    Group by p.CustomerID
   , isnull(p.islitigation,0) 
   , case when ms.Due_Date <= GetDate() And ms.Due_Date is not null then 'PDSP_OverDue' else 'PDSP' End 
   , ms.Type
   , p.Currency , ms.Due_Date
    
   --押匯未回收 and 押匯逾期未回收
	Insert @TmpTable (CustomerID, islitigation, Subject, Type, Currency, Amount, Due_Date)
    SELECT p.CustomerID
   , isnull(p.islitigation,0) as islitigation
   , case when ms.Due_Date <= GetDate() And ms.Due_Date is not null then 'PDSP_OverDue' else 'PDSP' End as Subject   
   , ms.Type
   , p.Currency
   , Round(sum(isnull(ms.Deposit,0)),2)  as Amount
   , ms.Due_Date
    FROM dbo.Money m with(NoLock,NoWait)
    LEFT OUTER JOIN dbo.[@MoneyID_TExpense] ON m.MoneyID = dbo.[@MoneyID_TExpense].MoneyID 
    INNER JOIN dbo.Bank b with(NoLock,NoWait) ON m.BankID = b.BankID 
    Left Outer JOIN dbo.Acc_RCV ar with(NoLock,NoWait) ON m.MasterID = ar.RCV_NO 
    INNER JOIN dbo.Money_Source ms with(NoLock,NoWait) ON m.MoneyID = ms.MoneyID 
    INNER JOIN dbo.PDSP p with(NoLock,NoWait) ON ms.Source_No = p.Shipment_NO 
    Left Outer Join Department d with(NoLock,NoWait) ON p.Department = d.Department_Code
    WHERE (m.Subject = 'PDSP RCV')       
    --AND (m.Expiry_Date IS NULL)
    AND (m.Date IS NULL)
    AND (ms.Type <> 'T/T')
    And (@OrganizationID = '' or d.OrganizationID = @OrganizationID)
    Group by p.CustomerID
   , isnull(p.islitigation,0) 
   , case when ms.Due_Date <= GetDate() And ms.Due_Date is not null then 'PDSP_OverDue' else 'PDSP' End 
   , ms.Type
   , p.Currency , ms.Due_Date
   
   --開發應收帳款
   Insert @TmpTable (CustomerID, islitigation, Subject, Type, Currency, Amount, Due_Date)
   Select p.CustomerID
   , isnull(p.islitigation,0) as islitigation
   , Case When ABS(isnull(p.IsCredit_Note,0)) = 0 Then
     Case When ms.Due_Date <= GetDate() And ms.Due_Date is not null Then 'Debit_OverDue' Else 'Debit' End
   Else 'Credit' End as Subject
   , isnull(ms.Type,'T/T') as Type
   , p.Currency
   , Round(sum(isnull(ms.Deposit,0)),2) as Amount
   , ms.Due_Date
   From Money_Source ms with(NoLock,NoWait)
   Inner join Debit p with(NoLock,NoWait) on p.Debit_No = ms.Source_No 
   Left Outer Join Department d with(NoLock,NoWait) ON p.Department = d.Department_Code
   Where ms.Subject = 'Debit RCV'
   And ms.MoneyID is null
   And p.Debit_Date is not null
   --And (ms.Type <> 'L/C' or (ms.Type = 'L/C' And p.Debit_Date BETWEEN CONVERT (DATETIME, '2007/01/01 00:00:00', 102) AND CONVERT (DATETIME, GetDate(), 102)))
   And p.Debit_Date BETWEEN CONVERT (DATETIME, '2007/01/01 00:00:00', 102) AND CONVERT (DATETIME, GetDate(), 102)
   And ms.Deposit <> 0
   And (@OrganizationID = '' or d.OrganizationID = @OrganizationID)
   Group by p.CustomerID
   , isnull(p.islitigation,0)
   , Case When ABS(isnull(p.IsCredit_Note,0)) = 0 Then
     Case When ms.Due_Date <= GetDate() And ms.Due_Date is not null Then 'Debit_OverDue' Else 'Debit' End
   Else 'Credit' End
   , isnull(ms.Type,'T/T') 
   , p.Currency
   , ms.Due_Date;

   --預收款
   Insert @TmpTable (CustomerID, islitigation, Subject, Type, Currency, Amount, Due_Date)
   Select m.CustomerID, 0 as islitigation, 'Advance_Receivable' as Subject, 'T/T' as Type, m.Currency, sum(isnull(m.Source_Amount,0) - isnull(m.Progress_Amount,0)) as Amount, null as Due_Date
   From Money m with(NoLock,NoWait)
   Left Outer Join Department d with(NoLock,NoWait) ON m.Department = d.Department_Code
   Where m.Accounting_Item_No = '2131'
   And (isnull(m.Source_Amount,0) - isnull(m.Progress_Amount,0)) > 0
   And (@OrganizationID = '' or d.OrganizationID = @OrganizationID)
   Group by m.CustomerID, m.Currency;

   Insert @TmpTable (CustomerID, islitigation, Subject, Type, Currency, Amount, Due_Date)
   Select tmp.CustomerID, 1 as islitigation, tmp.Subject, tmp.Type, tmp.Currency, tmp.Amount, tmp.Due_Date
   From @TmpTable tmp 
   Inner Join (
      Select distinct CustomerID, Type, Currency 
      From @TmpTable t1
      Where t1.Subject <> 'Advance_Receivable'
      And islitigation = 1
   ) tmp1 on tmp.CustomerID = tmp1.CustomerID And tmp.Type = tmp1.Type And tmp.Currency = tmp1.Currency
   Where tmp.Subject = 'Advance_Receivable'   

   --0 應收帳款
   SELECT 
   CustomerID
   , Type
   , Currency
   , sum(isnull(PDSP,0) + isnull(PDSP_OverDue,0)) as PDSP_Amount
   , sum(isnull(Debit,0) + isnull(Debit_OverDue,0)) as Debit_Note_Amount
   , sum(isnull(Credit,0)) as Credit_Amount
   , sum(isnull(PDSP_OverDue,0)) as PDSP_Expiry_Amount
   , sum(isnull(Debit_OverDue,0)) as Debit_Note_Expiry_Amount
   , sum(isnull(PDSP,0) + isnull(Debit,0) + isnull(PDSP_OverDue,0) + isnull(Debit_OverDue,0)) as Total_Amount
   , sum(isnull(PDSP_OverDue,0) + isnull(Debit_OverDue,0)) as Total_Expiry_Amount
   , sum(isnull(Advance_Receivable,0)) as Advance_Receivable_Amount
   FROM  
   (
      Select CustomerID, Subject, Type, Currency, Sum(Amount) as Amount
      from @TmpTable
      Where islitigation = 0
      Group by CustomerID, Subject, Type, Currency
   ) AS tmp  
   PIVOT  
   (  
       Sum(Amount) 
       FOR Subject IN (PDSP, PDSP_OverDue, Debit, Debit_OverDue, Credit, Advance_Receivable)  
   ) AS PivotTable
   Group by CustomerID, Type, Currency
   
   --1 應收帳款訴訟中
   SELECT 
   CustomerID
   , Type
   , Currency
   , sum(isnull(PDSP,0) + isnull(PDSP_OverDue,0)) as PDSP_Amount
   , sum(isnull(Debit,0) + isnull(Debit_OverDue,0)) as Debit_Note_Amount
   , sum(isnull(Credit,0)) as Credit_Amount
   , sum(isnull(PDSP_OverDue,0)) as PDSP_Expiry_Amount
   , sum(isnull(Debit_OverDue,0)) as Debit_Note_Expiry_Amount
   , sum(isnull(PDSP,0) + isnull(Debit,0) + isnull(PDSP_OverDue,0) + isnull(Debit_OverDue,0)) as Total_Amount
   , sum(isnull(PDSP_OverDue,0) + isnull(Debit_OverDue,0)) as Total_Expiry_Amount
   , sum(isnull(Advance_Receivable,0)) as Advance_Receivable_Amount
   FROM  
   (
      Select CustomerID, Subject, Type, Currency, Sum(Amount) as Amount
      from @TmpTable
      Where islitigation = 1
      Group by CustomerID, Subject, Type, Currency
   ) AS tmp  
   PIVOT  
   (  
       Sum(Amount) 
       FOR Subject IN (PDSP, PDSP_OverDue, Debit, Debit_OverDue, Credit, Advance_Receivable)  
   ) AS PivotTable
   Group by CustomerID, Type, Currency

   --2 應收帳款清單客人
   Select CustomerID from @TmpTable Group by CustomerID;

   --3 PDSP 逾期說明
   Select t.CustomerID
   , t.islitigation   
   , t.Type
   , t.Currency
   , sum(t.Amount) as Amount
   , convert(varchar(10),t.Due_Date,111) as Due_Date
   from @TmpTable t 
   where t.Due_Date <= GetDate()
   And t.Subject = 'PDSP_OverDue'
   Group by t.CustomerID, t.islitigation, t.Type, t.Currency, t.Due_Date
   Order by t.islitigation,t.CustomerID, t.Type, t.Currency, t.Due_Date;   
   
   --4 Debit 逾期說明
   Select t.CustomerID
   , t.islitigation   
   , t.Type
   , t.Currency
   , sum(t.Amount) as Amount
   , convert(varchar(10),t.Due_Date,111) as Due_Date
   from @TmpTable t 
   where t.Due_Date <= GetDate()
   And t.Subject = 'Debit_OverDue'
   Group by t.CustomerID, t.islitigation, t.Type, t.Currency, t.Due_Date
   Order by t.islitigation,t.CustomerID, t.Type, t.Currency, t.Due_Date; 
   `, req.body) ;    
   //console.log(strSQL)
   db.sql(req.SiteDB, strSQL)
      .then((result) => {         
         var DataSet = {Report_Info: result.recordsets[0]
            //, Grand_Total_Info: []
            , Report_litigation_Info: result.recordsets[1]
            //, Grand_Total_litigation_Info: []
            , CustomerID: result.recordsets[2]
         };

         DataSet.Report_Info.forEach((item)=>{
            item.Remark_PDSP_OverDuo = (result.recordsets[3].filter((obj)=>(item.CustomerID == obj.CustomerID && item.Type == obj.Type && item.Currency == obj.Currency && obj.islitigation == 0 ))).map((obj)=>({Amount: obj.Amount, Due_Date:obj.Due_Date}))
            item.Remark_Debit_OverDuo = (result.recordsets[4].filter((obj)=>(item.CustomerID == obj.CustomerID && item.Type == obj.Type && item.Currency == obj.Currency && obj.islitigation == 0 ))).map((obj)=>({Amount: obj.Amount, Due_Date:obj.Due_Date}))

            item.Total_PDSP_OverDuo_Amount = 0
            item.Total_Debit_OverDuo_Amount = 0
            item.Remark_PDSP_OverDuo.forEach((obj)=>{
               item.Total_PDSP_OverDuo_Amount += obj.Amount 
            })
            item.Remark_Debit_OverDuo.forEach((obj)=>{
               item.Total_Debit_OverDuo_Amount += obj.Amount
            })
         })

         DataSet.Report_litigation_Info.forEach((item)=>{
            item.Remark_PDSP_OverDuo = (result.recordsets[3].filter((obj)=>(item.CustomerID == obj.CustomerID && item.Type == obj.Type && item.Currency == obj.Currency && obj.islitigation == 1 ))).map((obj)=>({Amount: obj.Amount, Due_Date:obj.Due_Date}))
            item.Remark_Debit_OverDuo = (result.recordsets[4].filter((obj)=>(item.CustomerID == obj.CustomerID && item.Type == obj.Type && item.Currency == obj.Currency && obj.islitigation == 1 ))).map((obj)=>({Amount: obj.Amount, Due_Date:obj.Due_Date}))

            item.Total_PDSP_OverDuo_Amount = 0
            item.Total_Debit_OverDuo_Amount = 0
            item.Remark_PDSP_OverDuo.forEach((obj)=>{
               item.Total_PDSP_OverDuo_Amount += obj.Amount 
            })
            item.Remark_Debit_OverDuo.forEach((obj)=>{
               item.Total_Debit_OverDuo_Amount += obj.Amount
            })
         })

      //console.log(DataSet)
         res.send(DataSet);
      }).catch((err) => {
         console.log(err);
         res.status(500).send(err);
      })
});

//取得 Department 資料
router.post('/Department', function (req, res, next) {
   console.log("Call Department Api Department:", req.body);

   var strSQL = format(`
   SELECT d.SortID, isnull([Department_Code],'') + ' (' + d.OrganizationID + ')' as Label
   , [Department_Code] as Value
   FROM [Department] d WITH (NoWait, Nolock) 
   --Inner Join Control c WITH (NoWait, Nolock) on d.OrganizationID = c.OrganizationID
   where d.Department_Code is not null
   And Department_Category = 'Sales'
   UNION 
   SELECT '0' as SortID, '%' as Label
   , '%' as Value
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

 //Get Accounts_Receivable_Statistics_Info
 router.post('/Accounts_Receivable_Statistics_Info',  function (req, res, next) {
   console.log("Call Accounts_Receivable_Statistics_Info Api:",req.body);
 
   req.body.Mode = req.body.Mode ? req.body.Mode : 0;
   req.body.Department = req.body.Department ? req.body.Department : '%';
   req.body.F_ETD = req.body.F_ETD ? req.body.F_ETD : '';
 
   //Mode == 0 Get T/T 未送件, T/T 送件未回收, 未押匯, 押匯未回收 and 預收款
   //Mode == 1 Get T/T 未送件
   //Mode == 2 Get T/T 送件未回收
   //Mode == 3 Get 未押匯
   //Mode == 4 Get 押匯未回收
   //Mode == 5 Get 預收款
   var strSQL = format(`
   Declare @Mode int = {Mode}, @Department varchar(20) = '{Department}', @F_ETD varchar(10) = '{F_ETD}';

   --T/T 未送件
   if(@Mode = 0 or @Mode = 1)
   Begin
      SELECT p.CustomerID
      , p.Currency
      , Sum(p.Qty) as TQTY
      , Sum(p.Rcv_Amount) as TRcv_Amount
      , Sum(tmp.Deposit) as TNot_Nego_Amount
      FROM PDSP p with(NoLock, NoWait)
      INNER JOIN (
         Select ms.Source_No as Shipment_NO
         , SUM(ms.Deposit) as Deposit
         From Money_Source ms with(NoLock, NoWait) 
         WHERE (ms.Type = 'T/T') 
         AND (ms.Subject = 'PDSP RCV')
         AND (ms.MoneyID IS NULL) 
         Group by ms.Source_No
      ) tmp ON tmp.Shipment_NO = p.Shipment_NO
      WHERE (p.Doc_Completed IS NULL)
      AND (p.F_ETD BETWEEN '2007/01/01' AND @F_ETD)
      AND (p.Department LIKE @department)
      Group by p.CustomerID, p.Currency
      Order by Currency desc, CustomerID;
   End
   --T/T 送件未回收
   if(@Mode = 0 or @Mode = 2)
   Begin
      SELECT p.CustomerID
      , p.Currency
      , SUM(p.Qty) AS TQTY
      , SUM(tmp.Deposit) AS TDeposit 
      FROM PDSP p with(NoLock, NoWait)
      INNER JOIN (
         Select ms.Source_No as Shipment_NO
         , SUM(ms.Deposit) as Deposit
         From Money_Source ms with(NoLock, NoWait) 
         LEFT OUTER JOIN Money m with(NoLock, NoWait) ON ms.MoneyID = m.MoneyID 
         WHERE (ms.Subject = 'PDSP RCV') 
         AND (ms.Type = 'T/T') 
         AND (m.Date IS NULL) 
         And ms.Deposit > 0
         Group by ms.Source_No
      ) tmp ON tmp.Shipment_NO = p.Shipment_NO 
      WHERE (p.Department LIKE @department)      
      AND (p.F_ETD BETWEEN '2007/01/01' AND @F_ETD)
      AND (p.Doc_Completed IS NOT NULL) 
      GROUP BY p.Currency, p.CustomerID
      Order by Currency desc, CustomerID
   End
   --未押匯
   if(@Mode = 0 or @Mode = 3)
   Begin
      Select p.CustomerID
      , p.Currency
      , SUM(p.Qty) AS TQTY
      , SUM(p.Rcv_Amount) AS TRcv_Amount
      , SUM(tmp.Deposit) AS TNot_Nego_Amount
      , SUM(p.Rcved_Amount) AS TRcved_Amount
      FROM PDSP p with(NoLock, NoWait)
      INNER JOIN (
         Select ms.Source_No as Shipment_NO
         , SUM(ms.Deposit) as Deposit
         From Money_Source ms with(NoLock, NoWait)
         WHERE (ms.Type <> 'T/T')
         AND (ms.MoneyID IS NULL)
         AND (ms.Subject = 'PDSP RCV')
         Group by ms.Source_No
      ) tmp ON tmp.Shipment_NO = p.Shipment_NO
      WHERE (p.F_ETD Between '2006-01-01' AND @F_ETD)
      AND (p.Department LIKE @department)
      GROUP BY p.Currency, p.CustomerID
      Order by Currency desc, CustomerID
   End
   --押匯未回收
   if(@Mode = 0 or @Mode = 4)
   Begin
      SELECT m.Currency
      , m.Type
      , b.S_Name AS Bank
      , m.CustomerID
      , SUM(m.Source_Amount) AS Amount
      , SUM(CASE WHEN Len(m.Date) > 0 THEN Source_Amount ELSE 0 END) AS Transfer_Amount
      , SUM(CASE WHEN Len(m.Date) > 0 THEN 0 ELSE Source_Amount END) AS Balance_Amount 
      FROM Bank b with(NoLock, NoWait)
      INNER JOIN Money m with(NoLock, NoWait) ON b.BankID = m.BankID 
      LEFT OUTER JOIN [@PDSP_RCV_Department_Group] ON m.MoneyID = [@PDSP_RCV_Department_Group].MoneyID 
      LEFT OUTER JOIN Acc_RCV ar with(NoLock, NoWait) ON m.MasterID = ar.RCV_NO 
      WHERE ([@PDSP_RCV_Department_Group].Department LIKE @department) 
      --AND (m.Expiry_Date IS NULL)
      AND (m.Date IS NULL)
      AND (m.Subject = 'PDSP RCV') 
      AND (m.Type <> 'T/T')
      GROUP BY m.Currency, b.S_Name, m.CustomerID, m.Subject, m.Type
      ORDER BY m.Currency desc, Bank, m.CustomerID
   End
   --預收款
   if(@Mode = 0 or @Mode = 5)
   Begin
      SELECT ISNULL(m.CustomerID, '') AS CustomerID
      , ISNULL(m.Currency, '') AS Currency      
      , ISNULL(b.S_Name, '') AS Bank
      , ISNULL(Sum(m.Source_Amount), 0) AS Source_Amount
      , ISNULL(Sum(m.Progress_Amount), 0) AS Progress_Amount
      , Sum(ISNULL(m.Source_Amount,0) - ISNULL(m.Progress_Amount,0)) AS Balance
      , ISNULL(Sum(m.Deposit),0) AS Deposit
      , ISNULL(Sum(m.Expense), 0) AS Expense
      FROM Money m with(NoLock,NoWait)
      INNER JOIN Bank b with(NoLock,NoWait) ON m.BankID = b.BankID 
      INNER JOIN Accounting_Item ai with(NoLock,NoWait) ON m.Accounting_Item_No = ai.Accounting_Item_No
      Where (m.Accounting_Item_No = '2131')
      And (ISNULL(m.Source_Amount,0) - ISNULL(m.Progress_Amount,0)) > 0
      Group By ISNULL(m.CustomerID, ''), ISNULL(m.Currency, ''), ISNULL(b.S_Name, '')
      ORDER BY Currency DESC;
   End
   `, req.body) ;
   //console.log(strSQL)
   db.sql(req.SiteDB, strSQL)
      .then((result) => {
         var DataSet = {TT_Doc_non_Completed:[]
            , TT_Doc_Completed:[]
            , Submit_Doc_non_Completed:[]
            , Submit_Doc_Completed:[]
            , Advance_Receivable:[]
          };

         if(req.body.Mode == 0 || req.body.Mode == 1) {
            DataSet.TT_Doc_non_Completed = [...result.recordsets[0].reduce((r, e) => {
               let k = `${e.Currency}`;
               if (!r.has(k)) {
               r.set(k, { Currency: e.Currency,
                     Total_Qty: e.TQTY,
                     Total_Rcv_Amount: e.TRcv_Amount,
                     Total_Nego_Amount: e.TNot_Nego_Amount
                  })
               } else {
                  r.get(k).Total_Qty += e.TQTY;
                  r.get(k).Total_Rcv_Amount += e.TRcv_Amount;
                  r.get(k).Total_Nego_Amount += e.TNot_Nego_Amount;
               }
               return r;
            }, new Map).values()];

            DataSet.TT_Doc_non_Completed.forEach((item) => {
               item.Detail = result.recordsets[0].filter((data)=>(data.Currency == item.Currency));
               item.Total_Qty = Math.round((item.Total_Qty)*10000)/10000;
               item.Total_Rcv_Amount = Math.round((item.Total_Rcv_Amount)*10000)/10000;
               item.Total_Nego_Amount = Math.round((item.Total_Nego_Amount)*10000)/10000;
            });
         }

         if(req.body.Mode == 0 || req.body.Mode == 2) {
            DataSet.TT_Doc_Completed = [...result.recordsets[1].reduce((r, e) => {
               let k = `${e.Currency}`;
               if (!r.has(k)) {
                  r.set(k, { Currency: e.Currency,
                     Total_Qty: e.TQTY,
                     Total_Deposit: e.TDeposit
                  })
               } else {
                  r.get(k).Total_Qty += e.TQTY;
                  r.get(k).Total_Deposit += e.TDeposit;
               }
               return r;
            }, new Map).values()];

            DataSet.TT_Doc_Completed.forEach((item) => {
               item.Detail = result.recordsets[1].filter((data)=>(data.Currency == item.Currency));
               item.Total_Qty = Math.round((item.Total_Qty)*10000)/10000;
               item.Total_Deposit = Math.round((item.Total_Deposit)*10000)/10000;         
            });
         }

         if(req.body.Mode == 0 || req.body.Mode == 3) {
            DataSet.Submit_Doc_non_Completed = [...result.recordsets[2].reduce((r, e) => {
               let k = `${e.Currency}`;
               if (!r.has(k)) {
                  r.set(k, { Currency: e.Currency,
                     Total_Qty: e.TQTY,
                     Total_Rcv_Amount: e.TRcv_Amount,
                     Total_Not_Nego_Amount: e.TNot_Nego_Amount,
                     Total_Rcved_Amount: e.TRcved_Amount,
                  })
               } else {
                  r.get(k).Total_Qty += e.TQTY;
                  r.get(k).Total_Rcv_Amount += e.TRcv_Amount;
                  r.get(k).Total_Not_Nego_Amount += e.TNot_Nego_Amount;
                  r.get(k).Total_Rcved_Amount += e.TRcved_Amount;
               }
               return r;
            }, new Map).values()];

            DataSet.Submit_Doc_non_Completed.forEach((item) => {
               item.Detail = result.recordsets[2].filter((data)=>(data.Currency == item.Currency));
               item.Total_Qty = Math.round((item.Total_Qty)*10000)/10000;
               item.Total_Rcv_Amount = Math.round((item.Total_Rcv_Amount)*10000)/10000;
               item.Total_Not_Nego_Amount = Math.round((item.Total_Not_Nego_Amount)*10000)/10000;
               item.Total_Rcved_Amount = Math.round((item.Total_Rcved_Amount)*10000)/10000;
            });
         }

         if(req.body.Mode == 0 || req.body.Mode == 4) {
            DataSet.Submit_Doc_Completed = [...result.recordsets[3].reduce((r, e) => {
               let k = `${e.Currency}`;
               if (!r.has(k)) {
                  r.set(k, { Currency: e.Currency,
                     Total_Amount: e.Amount,
                     Total_Transfer_Amount: e.Transfer_Amount,
                     Total_Balance_Amount: e.Balance_Amount,
                  })
               } else {
                  r.get(k).Total_Amount += e.Amount;
                  r.get(k).Total_Transfer_Amount += e.Transfer_Amount;
                  r.get(k).Total_Balance_Amount += e.Balance_Amount;               
               }
               return r;
            }, new Map).values()];

            DataSet.Submit_Doc_Completed.forEach((item) => {
               item.Detail = result.recordsets[3].filter((data)=>(data.Currency == item.Currency));
               item.Total_Amount = Math.round((item.Total_Amount)*10000)/10000;
               item.Total_Transfer_Amount = Math.round((item.Total_Transfer_Amount)*10000)/10000;
               item.Total_Balance_Amount = Math.round((item.Total_Balance_Amount)*10000)/10000;            
            });
         }

         if(req.body.Mode == 0 || req.body.Mode == 5) {
            DataSet.Advance_Receivable = [...result.recordsets[4].reduce((r, e) => {
               let k = `${e.Currency}`;
               if (!r.has(k)) {
                  r.set(k, { Currency: e.Currency,
                     Total_Deposit: e.Deposit,
                     Total_Source_Amount: e.Source_Amount,
                     Total_Balance: e.Balance,
                  })
               } else {
                  r.get(k).Total_Deposit += e.Deposit;
                  r.get(k).Total_Source_Amount += e.Source_Amount;
                  r.get(k).Total_Balance += e.Balance;               
               }
               return r;
            }, new Map).values()];

            DataSet.Advance_Receivable.forEach((item) => {
               item.Detail = result.recordsets[4].filter((data)=>(data.Currency == item.Currency));
               item.Total_Deposit = Math.round((item.Total_Deposit)*10000)/10000;
               item.Total_Source_Amount = Math.round((item.Total_Source_Amount)*10000)/10000;
               item.Total_Balance = Math.round((item.Total_Balance)*10000)/10000;            
            });
         }
         //console.log(DataSet)
         res.send(DataSet);
      }).catch((err) => {
         console.log(err);
         res.status(500).send(err);
      })
});

 //Get Accounts_Receivable_Statistics_List_Info
 router.post('/Accounts_Receivable_Statistics_List_Info',  function (req, res, next) {
   console.log("Call Accounts_Receivable_Statistics_List_Info Api:",req.body);
 
   req.body.Mode = req.body.Mode ? req.body.Mode : 0;
   req.body.Department = req.body.Department ? req.body.Department : '%';
   req.body.CustomerID = req.body.CustomerID ? req.body.CustomerID : '';
 
   //Mode == 0 Get T/T 未送件, T/T 送件未回收, 未押匯, 押匯未回收, 押匯逾期未回收 and 預收款
   //Mode == 1 Get T/T 未送件
   //Mode == 2 Get T/T 送件未回收
   //Mode == 3 Get 未押匯
   //Mode == 4 Get 押匯未回收
   //Mode == 5 Get 押匯逾期未回收  
   //Mode == 6 Get 預收款
   var strSQL = format(`
   Declare @Mode int = {Mode}, @Department varchar(20) = '{Department}', @CustomerID varchar(15) = '{CustomerID}';

	Declare @TmpTable_LC Table(MoneyID int, Type varchar(4), MasterID varchar(30), days int, Apply_Date Date
	, S_Name varchar(18), Reference_NO varchar(30), CustomerID varchar(15), Shipment_Amount money, TAmount money
	, Expense money, Deposit float, [Date] date, Unpay date, Acceptance date
	, Currency varchar(4), Memo varchar(500), Apply_Datea date, Due_Date Date
	)

	--T/T 文件未齊全 (未送件)
   if(@Mode = 0 or @Mode = 1)
   Begin
      SELECT distinct ms.Money_SourceID
      , p.Department
      , p.Brand
      , p.Season
      , convert(varchar(10), p.F_ETD, 111) as F_ETD
      , convert(varchar(10), ms.Initial_Date, 111) as Initial_Date
      , convert(varchar(10), ms.Due_Date, 111) as Due_Date
      , case when ms.Due_Date < GetDate() then 'red' else 'black' end as Due_Date_Flag
      , case when ms.Due_Date < GetDate() then isnull(ms.Deposit,0) else 0 end as Due_Date_Amount
      , ms.Days AS RCV_Days
      , p.Shipment_NO
      , p.FactoryID
      , p.Qty
      , p.Currency
      , p.Rcv_Amount
      , (isnull(ms.Deposit,0)) AS Not_Nego_Amount
      FROM Money_Source ms with(NoLock,NoWait)
      INNER JOIN PDSP p with(NoLock,NoWait) ON ms.Source_No = p.Shipment_NO
      --INNER JOIN [@PDSP_Source_Infor] ON p.Shipment_NO = [@PDSP_Source_Infor].Shipment_NO
      --INNER JOIN PDSP_Detail pd with(NoLock,NoWait) ON p.Shipment_NO = pd.Shipment_NO
      --INNER JOIN Order_Detail od with(NoLock,NoWait) on od.Order_DetailID = pd.Order_DetailID
      --INNER JOIN Produce pr with(NoLock,NoWait) on od.Produce_No = pr.Produce_No
      WHERE (ms.Subject = 'PDSP RCV') 
      AND (ms.Type = 'T/T') 
      AND (p.Department LIKE @Department) 
      AND (p.Doc_Completed IS NULL)
      And (ms.MoneyID IS NULL)
      And (p.F_ETD between '2007-01-01' And GETDATE())
      AND (p.CustomerID = @CustomerID)             
      ORDER BY p.Currency desc, p.Department, Due_Date, p.Shipment_NO
   End
   --T/T 送件未回收
   if(@Mode = 0 or @Mode = 2)
   Begin	
      SELECT distinct ms.Money_SourceID
      , p.Department
      , p.Brand 
      , p.Season
      , convert(varchar(10),p.F_ETD,111) as F_ETD
      , convert(varchar(10),p.Doc_Completed,111) as Doc_Completed
      , ms.Days AS RCV_Days
      , p.Shipment_NO
      , ms.Type AS Rcv_Type
      , p.FactoryID
      , p.Qty
      , p.Currency
      , p.Rcv_Amount      
      , (isnull(ms.Deposit,0)) AS Nego_Amount      
      , m.MoneyID
      , convert(varchar(10), m.Apply_Date,111) as Apply_Date
      , m.[Date]
      , convert(varchar(10),ms.Due_Date,111) as Due_Date
      , case when Due_Date < GetDate() then 'red' else 'black' end as Due_Date_Flag
      , case when Due_Date < GetDate() then isnull(ms.Deposit,0) else 0 end as Due_Date_Amount      
      FROM dbo.Money_Source ms with(NoLock,NoWait)
      LEFT OUTER JOIN dbo.Money m with(NoLock,NoWait) ON ms.MoneyID = m.MoneyID 
      INNER JOIN dbo.PDSP p with(NoLock,NoWait) ON ms.Source_No = p.Shipment_NO 
      WHERE (p.Department LIKE @Department) 
      AND (ms.Subject = 'PDSP RCV') 
      AND (ms.Type = 'T/T') 
      AND (p.Doc_Completed IS NOT NULL)        
      And (p.F_ETD between '2007-01-01' And GETDATE()) 
      AND (p.CustomerID = @CustomerID)       
      AND (m.[Date] IS NULL) 
      ORDER BY p.Currency desc, p.Department, Due_Date, p.Shipment_NO
   End
	--未押匯
   if(@Mode = 0 or @Mode = 3)
   Begin
      SELECT distinct ms.Money_SourceID
      , p.Department
      , p.Brand
      , p.Season
      , convert(varchar(10),p.F_ETD,111) as F_ETD
      , case when isnull(ms.By_Doc_Rcv,0) = 1 then 'red' else '#CCFFFF' end as By_Doc_Rcv_Flag
      , convert(varchar(10), ms.Initial_Date,111) as Initial_Date      
      , convert(varchar(10), ms.Due_Date,111) as Due_Date
      , ms.Days AS RCV_Days
      , p.Shipment_NO
      , p.FactoryID
      , p.Qty
      , p.Currency
      , ms.Type AS Rcv_Type
      , p.Rcv_Amount
      --,(CASE WHEN p.Pay_Amount IS NULL OR p.Rcv_Amount IS NULL THEN ms.Deposit ELSE (p.Pay_Amount / convert(float,p.Rcv_Amount)) * ms.Deposit END) AS Pay_Amount
      , ms.Deposit AS Not_Nego_Amount
      FROM dbo.Money_Source ms with(NoLock,NoWait)
      INNER JOIN dbo.PDSP p with(NoLock,NoWait) ON ms.Source_No = p.Shipment_NO 
      --INNER JOIN dbo.[@PDSP_Source_Infor] ON p.Shipment_NO = dbo.[@PDSP_Source_Infor].Shipment_NO 
      --LEFT OUTER JOIN dbo.PDSP_Detail pd with(NoLock,NoWait) ON p.Shipment_NO = pd.Shipment_NO 
      --INNER JOIN dbo.Order_Detail on dbo.Order_Detail.Order_DetailID = pd.Order_DetailID 
      --INNER JOIN dbo.Produce on dbo.Order_Detail.Produce_No = dbo.Produce.Produce_No 
      WHERE (p.Department LIKE @Department) 
      AND (ms.Subject = 'PDSP RCV') 
      AND (ms.MoneyID IS NULL) 
      And (p.F_ETD between '2006-01-01' And GETDATE()) 
      AND (p.CustomerID = @CustomerID) 
      --AND (p.Currency = '" & RSa2("Currency")&"') 
      AND (ms.Type <> 'T/T') 
      ORDER BY p.Currency desc, p.Department, F_ETD, p.Shipment_NO
   End

   --Get 押匯未回收 / 押匯逾期未回收 Data
   if(@Mode = 0 or @Mode = 4 or @Mode = 5)
   Begin
      Insert @TmpTable_LC
      SELECT m.MoneyID
      , ms.Type
      , m.MasterID
      , max(ms.Days) as days
      , m.Apply_Date
      , b.S_Name
      , m.Reference_NO
      , m.CustomerID
      , SUM(ISNULL(p.Rcv_Amount, 0)) AS Shipment_Amount
      --, Pay_Amount=sum(CASE WHEN p.Pay_Amount IS NULL OR p.Rcv_Amount IS NULL THEN ms.Deposit ELSE (p.Pay_Amount / convert(float,p.Rcv_Amount)) * ms.Deposit END)
      ,SUM(ms.Deposit) AS TAmount
      , isnull(dbo.[@MoneyID_TExpense].Expense,0) as Expense
      , isnull(m.Deposit,0) as Deposit
      , m.[Date]
      , m.Unpay
      , m.Acceptance
      , m.Currency
      , CAST(m.MEMO AS varchar(500)) AS Memo
      , Apply_Datea = case when isnull(ms.Days,0)<=14 then DATEADD(day,14, m.Apply_Date) else DATEADD(day, ms.Days,m.Apply_Date) end      
      , ms.Due_Date
      FROM dbo.Money m with(NoLock,NoWait)
      LEFT OUTER JOIN dbo.[@MoneyID_TExpense] ON m.MoneyID = dbo.[@MoneyID_TExpense].MoneyID 
      INNER JOIN dbo.Bank b with(NoLock,NoWait) ON m.BankID = b.BankID 
      Left Outer JOIN dbo.Acc_RCV ar with(NoLock,NoWait) ON m.MasterID = ar.RCV_NO 
      INNER JOIN dbo.Money_Source ms with(NoLock,NoWait) ON m.MoneyID = ms.MoneyID 
      INNER JOIN dbo.PDSP p with(NoLock,NoWait) ON ms.Source_No = p.Shipment_NO 
      WHERE (m.Subject = 'PDSP RCV') 
      AND (p.Department like @Department) 
      --AND (m.Expiry_Date IS NULL)
      AND (m.Date IS NULL)
      AND (m.CustomerID = @CustomerID) 
      AND (ms.Type <> 'T/T')
      --AND (case when isnull(ms.Days,0)<=14 then DATEADD(day,14, m.Apply_Date) else DATEADD(day, ms.Days, m.Apply_Date) end > GETDATE()) 
      --And ms.Due_Date > GetDate()
      GROUP BY m.MoneyID,ms.Type,m.MasterID,ms.Days,m.Apply_Date,b.S_Name,m.Reference_NO
      ,m.CustomerID,dbo.[@MoneyID_TExpense].Expense,m.Deposit, m.[Date],m.Unpay, m.Acceptance,m.Expiry_Date,m.Currency
      ,CAST(m.MEMO AS varchar(500)),ms.Days,m.Apply_Date 
      , ms.Due_Date
   End

	--押匯未回收 
   if(@Mode = 0 or @Mode = 4)
   Begin	
      Select 0 as Sort
      , MoneyID, Type, MasterID, days, convert(varchar(10), Apply_Date,111) as Apply_Date
      , S_Name, Reference_NO, CustomerID, Shipment_Amount, TAmount
      , Expense, Deposit
      --, (Expense + Deposit) as Cashable_Amount
      , Deposit as Cashable_Amount
      , case when [Date] is null then Deposit else 0 end as Available_Amount
      , convert(varchar(10), [Date],111) as [Date], convert(varchar(10), Unpay,111) as Unpay, convert(varchar(10), Acceptance,111) as Acceptance
      , Currency, Memo, convert(varchar(10), Apply_Datea,111) as Apply_Datea, convert(varchar(10), Due_Date,111) as Due_Date
      From @TmpTable_LC t
      Where t.Due_Date > GetDate()
      union
      Select 1 as Sort
      , MoneyID, Type, MasterID, days, convert(varchar(10), Apply_Date,111) as Apply_Date
      , S_Name, Reference_NO, CustomerID, 0 as Shipment_Amount, 0 as TAmount
      , 0 as Expense, 0 as Deposit
      , 0 as Cashable_Amount
      , 0 as Available_Amount
      , convert(varchar(10), [Date],111) as [Date], convert(varchar(10), Unpay,111) as Unpay, convert(varchar(10), Acceptance,111) as Acceptance
      , Currency, Memo, convert(varchar(10), Apply_Datea,111) as Apply_Datea, convert(varchar(10), Due_Date,111) as Due_Date
      From @TmpTable_LC t
      Where t.Due_Date > GetDate()
      And t.Memo is not null
      Order by Currency desc, MoneyID, Sort
   End

	--押匯逾期未回收
   if(@Mode = 0 or @Mode = 5)
   Begin
      Select 0 as Sort
      , MoneyID, Type, MasterID, days, convert(varchar(10), Apply_Date,111) as Apply_Date
      , S_Name, Reference_NO, CustomerID, Shipment_Amount, TAmount
      , Expense, Deposit
      --, (Expense + Deposit) as Cashable_Amount
      , Deposit as Cashable_Amount
      , case when [Date] is null then Deposit else 0 end as Available_Amount
      , convert(varchar(10), [Date],111) as [Date], convert(varchar(10), Unpay,111) as Unpay, convert(varchar(10), Acceptance,111) as Acceptance
      , Currency, Memo, convert(varchar(10), Apply_Datea,111) as Apply_Datea, convert(varchar(10), Due_Date,111) as Due_Date
      From @TmpTable_LC t
      Where t.Due_Date <= GetDate()
      union
      Select 1 as Sort
      , MoneyID, Type, MasterID, days, convert(varchar(10), Apply_Date,111) as Apply_Date
      , S_Name, Reference_NO, CustomerID, 0 as Shipment_Amount, 0 as TAmount
      , 0 as Expense, 0 as Deposit
      , 0 as Cashable_Amount
      , 0 as Available_Amount
      , convert(varchar(10), [Date],111) as [Date], convert(varchar(10), Unpay,111) as Unpay, convert(varchar(10), Acceptance,111) as Acceptance
      , Currency, Memo, convert(varchar(10), Apply_Datea,111) as Apply_Datea, convert(varchar(10), Due_Date,111) as Due_Date
      From @TmpTable_LC t
      Where t.Due_Date <= GetDate()
      And t.Memo is not null
      Order by Currency desc, MoneyID, Sort

   End

   --Get 押匯未回收 / 押匯逾期未回收 Money Data
   if(@Mode = 0 or @Mode = 4 or @Mode = 5)
   Begin
      Select ms.MoneyID, p.Shipment_NO, p.Brand, p.Season, p.Qty, ms.Deposit
      From Money_Source ms with(Nolock,NoWait) 
      Inner Join PDSP p with(Nolock,NoWait) on p.Shipment_NO = ms.Source_No
      Inner Join (Select MoneyID From @TmpTable_LC ) t on t.MoneyID = ms.MoneyID
      Order by ms.MoneyID, p.Shipment_NO, p.Brand, p.Season
   End

   --Get 預收款
   if(@Mode = 0 or @Mode = 6)
   Begin
      SELECT m.MoneyID
      , ISNULL(m.CustomerID, '') AS CustomerID
      , m.Accounting_Item_No
      , ISNULL(m.Currency, '') AS Currency
      , ai.Item
      , ISNULL(m.Reference_NO, '') AS Reference_NO
      , m.BankID
      , ISNULL(b.S_Name, '') AS S_Name
      , CONVERT (varchar(20), m.Date, 111) AS Date
      , ISNULL(m.Deposit,0) AS Deposit   
      , ISNULL(m.Source_Amount, 0) AS Source_Amount
      , ISNULL(m.Progress_Amount, 0) AS Progress_Amount
      , (ISNULL(m.Source_Amount, 0) - ISNULL(m.Progress_Amount,0)) AS Balance
      , ISNULL(m.Expense,0) AS Expense
      , isnull(m.Memo,'') as Memo
      FROM Money m with(NoLock,NoWait)
      INNER JOIN Bank b with(NoLock,NoWait) ON m.BankID = b.BankID 
      INNER JOIN Accounting_Item ai with(NoLock,NoWait) ON m.Accounting_Item_No = ai.Accounting_Item_No
      Where (m.Accounting_Item_No = '2131')
      AND (ISNULL(m.CustomerID, '') = @CustomerID)
      AND ((ISNULL(m.Source_Amount, 0) - ISNULL(m.Progress_Amount,0)) > 0)
      ORDER BY Currency DESC;
   End

   `, req.body) ;
   //console.log(strSQL)
   db.sql(req.SiteDB, strSQL)
      .then((result) => {
         var DataSet = {TT_Doc_non_Completed:[]
            , TT_Doc_Completed:[]
            , Submit_Doc_non_Completed:[]
            , Submit_Doc_Completed:[]
            , Submit_Doc_Completed_OverDuo:[]
            , Advance_Receivable:[]
            , Grand_Total_Info:[]
          };

         //押匯未回收 / 押匯逾期未回收 
         var Shipment_Info = (req.body.Mode == 0) ? result.recordsets[5] : ((req.body.Mode == 4 || req.body.Mode == 5) ? result.recordsets[1] :  [])         

         //Get Grand Total Info
         var tmp_Grand_Total = [];

         //T/T 未送件
         if(req.body.Mode == 0 || req.body.Mode == 1) {
            var DPSP = [...result.recordsets[0].reduce((r, e) => {
               let k = `${e.Currency}|${e.Shipment_NO}`;
               if (!r.has(k)) {
                  r.set(k, { Currency: e.Currency,
                     Shipment_NO: e.Shipment_NO,
                     TTl_Qty: e.Qty,
                     TTl_Rcv_Amount: e.Rcv_Amount,
                     TTl_Not_Nego_Amount: e.Not_Nego_Amount,
                     TTL_Due_Date_Amount: e.Due_Date_Amount,
                  })
               } else {
                  r.get(k).TTl_Not_Nego_Amount += e.Not_Nego_Amount;
                  r.get(k).TTL_Due_Date_Amount += e.Due_Date_Amount;
               }
               return r;
            }, new Map).values()];

            DataSet.TT_Doc_non_Completed = [...DPSP.reduce((r, e) => {
               let k = `${e.Currency}`;
               if (!r.has(k)) {
               r.set(k, { Currency: e.Currency,
                     Total_Qty: e.TTl_Qty,
                     Total_Rcv_Amount: e.TTl_Rcv_Amount,
                     Total_Not_Nego_Amount: e.TTl_Not_Nego_Amount,
                     Total_Due_Date_Amount: e.TTL_Due_Date_Amount,
                  })
               } else {
                  r.get(k).Total_Qty += e.TTl_Qty;
                  r.get(k).Total_Rcv_Amount += e.TTl_Rcv_Amount;
                  r.get(k).Total_Not_Nego_Amount += e.TTl_Not_Nego_Amount;
                  r.get(k).Total_Due_Date_Amount += e.TTL_Due_Date_Amount;
               }
               return r;
            }, new Map).values()];

            DataSet.TT_Doc_non_Completed.forEach((item) => {
               item.Detail = result.recordsets[0].filter((data)=>(data.Currency == item.Currency));

               tmp_Grand_Total.push({Currency:item.Currency, Advance_Amount:0, Rcv_Amount:item.Total_Rcv_Amount, Nego_Amount:item.Total_Not_Nego_Amount});

               item.Total_Qty = Math.round((item.Total_Qty)*10000)/10000;
               item.Total_Rcv_Amount = Math.round((item.Total_Rcv_Amount)*10000)/10000;
               item.Total_Not_Nego_Amount = Math.round((item.Total_Not_Nego_Amount)*10000)/10000;
               item.Total_Due_Date_Amount = Math.round((item.Total_Due_Date_Amount)*10000)/10000;
            });
         }

         //T/T 送件未回收
         if(req.body.Mode == 0 || req.body.Mode == 2) {
            var TT_Doc_Completed = (req.body.Mode == 0) ? result.recordsets[1] : ((req.body.Mode == 2) ? result.recordsets[0] :  [])

            var DPSP = [...TT_Doc_Completed.reduce((r, e) => {
               let k = `${e.Currency}|${e.Shipment_NO}`;
               if (!r.has(k)) {
                  r.set(k, { Currency: e.Currency,
                     Shipment_NO: e.Shipment_NO,
                     TTl_Qty: e.Qty,
                     TTl_Rcv_Amount: e.Rcv_Amount,
                     TTl_Nego_Amount: e.Nego_Amount,
                     TTl_Due_Date_Amount: e.Due_Date_Amount
                  })
               } else {
                  r.get(k).TTl_Nego_Amount += e.Nego_Amount;
                  r.get(k).TTl_Due_Date_Amount += e.Due_Date_Amount;
               }
               return r;
            }, new Map).values()];
            
            DataSet.TT_Doc_Completed = [...DPSP.reduce((r, e) => {
               let k = `${e.Currency}`;
               if (!r.has(k)) {
                  r.set(k, { Currency: e.Currency,
                     Total_Qty: e.TTl_Qty,
                     Total_Rcv_Amount: e.TTl_Rcv_Amount,
                     Total_Nego_Amount: e.TTl_Nego_Amount,
                     Total_Due_Date_Amount: e.TTl_Due_Date_Amount,
                  })
               } else {
                  r.get(k).Total_Qty += e.TTl_Qty;
                  r.get(k).Total_Rcv_Amount += e.TTl_Rcv_Amount;
                  r.get(k).Total_Nego_Amount += e.TTl_Nego_Amount;
                  r.get(k).Total_Due_Date_Amount += e.TTl_Due_Date_Amount;
               }
               return r;
            }, new Map).values()];

            DataSet.TT_Doc_Completed.forEach((item) => {
               item.Detail = TT_Doc_Completed.filter((data)=>(data.Currency == item.Currency));

               tmp_Grand_Total.push({Currency:item.Currency, Advance_Amount:0, Rcv_Amount:item.Total_Rcv_Amount, Nego_Amount:item.Total_Nego_Amount});

               item.Total_Qty = Math.round((item.Total_Qty)*10000)/10000;
               item.Total_Rcv_Amount = Math.round((item.Total_Rcv_Amount)*10000)/10000;
               item.Total_Nego_Amount = Math.round((item.Total_Nego_Amount)*10000)/10000;
               item.Total_Due_Date_Amount = Math.round((item.Total_Due_Date_Amount)*10000)/10000;
            });
         }

         //未押匯
         if(req.body.Mode == 0 || req.body.Mode == 3) {
            var Submit_Doc_non_Completed = (req.body.Mode == 0) ? result.recordsets[2] : ((req.body.Mode == 3) ? result.recordsets[0] :  [])

            var DPSP = [...Submit_Doc_non_Completed.reduce((r, e) => {
               let k = `${e.Currency}|${e.Shipment_NO}|${e.Qty}|${e.Rcv_Amount}`;
               if (!r.has(k)) {
               r.set(k, { Currency: e.Currency,
                     Shipment_NO: e.Shipment_NO,
                     TTl_Qty: e.Qty,
                     TTl_Rcv_Amount: e.Rcv_Amount,
                     TTl_Not_Nego_Amount: e.Not_Nego_Amount
                  })
               } else {
                  r.get(k).TTl_Not_Nego_Amount += e.Not_Nego_Amount;
               }
               return r;
            }, new Map).values()];

            DataSet.Submit_Doc_non_Completed = [...DPSP.reduce((r, e) => {
               let k = `${e.Currency}`;
               if (!r.has(k)) {
                  r.set(k, { Currency: e.Currency,
                     Total_Qty: e.TTl_Qty,
                     Total_Rcv_Amount: e.TTl_Rcv_Amount,
                     Total_Not_Nego_Amount: e.TTl_Not_Nego_Amount,
                  })
               } else {
                  r.get(k).Total_Qty += e.TTl_Qty;
                  r.get(k).Total_Rcv_Amount += e.TTl_Rcv_Amount;
                  r.get(k).Total_Not_Nego_Amount += e.TTl_Not_Nego_Amount;
               }
               return r;
            }, new Map).values()];

            DataSet.Submit_Doc_non_Completed.forEach((item) => {
               item.Detail = Submit_Doc_non_Completed.filter((data)=>(data.Currency == item.Currency));

               tmp_Grand_Total.push({Currency:item.Currency, Advance_Amount:0, Rcv_Amount:item.Total_Rcv_Amount, Nego_Amount:item.Total_Not_Nego_Amount});

               item.Total_Qty = Math.round((item.Total_Qty)*10000)/10000;
               item.Total_Rcv_Amount = Math.round((item.Total_Rcv_Amount)*10000)/10000;
               item.Total_Not_Nego_Amount = Math.round((item.Total_Not_Nego_Amount)*10000)/10000;
            });
         }

         //押匯未回收         
         if(req.body.Mode == 0 || req.body.Mode == 4) {
            var Submit_Doc_Completed = (req.body.Mode == 0) ? result.recordsets[3] : ((req.body.Mode == 4) ? result.recordsets[0] :  [])

            DataSet.Submit_Doc_Completed = [...Submit_Doc_Completed.reduce((r, e) => {
               let k = `${e.Currency}`;
               if (!r.has(k)) {
                  r.set(k, { Currency: e.Currency,
                     Total_Shipment_Amount: e.Shipment_Amount,
                     Total_TAmount: e.TAmount,
                     Total_Expense: e.Expense,
                     Total_Deposit: e.Deposit,                     
                     Total_Cashable_Amount: e.Cashable_Amount,
                     Total_Available_Amount: e.Available_Amount,
                  })
               } else {
                  r.get(k).Total_Shipment_Amount += e.Shipment_Amount;
                  r.get(k).Total_TAmount += e.TAmount;
                  r.get(k).Total_Expense += e.Expense;
                  r.get(k).Total_Deposit += e.Deposit;
                  r.get(k).Total_Cashable_Amount += e.Cashable_Amount;
                  r.get(k).Total_Available_Amount += e.Available_Amount;
               }
               return r;
            }, new Map).values()];

            DataSet.Submit_Doc_Completed.forEach((item) => {
               item.Detail = Submit_Doc_Completed.filter((data)=>(data.Currency == item.Currency));
               var tmpShipment_Info = []
               item.Detail.forEach((object) => {
                  object.Shipment_Info = object.Sort == 0 ? Shipment_Info.filter((data)=>(data.MoneyID == object.MoneyID)):[];
                  object.Sort == 0 ? tmpShipment_Info.push(...object.Shipment_Info):''
               })
               item.Shipment_Info_Total = [...tmpShipment_Info.reduce((r, e) => {
                  let k = `${e.Brand}|${e.Season}`;
                  if (!r.has(k)) {
                     r.set(k, { 
                        Brand: e.Brand,
                        Season: e.Season,
                        Total_Qty: e.Qty,
                        Total_Deposit: e.Deposit,
                     })
                  } else {
                     r.get(k).Total_Qty += e.Qty;
                     r.get(k).Total_Deposit += e.Deposit;
                  }
                  return r;
               }, new Map).values()];

               tmp_Grand_Total.push({Currency:item.Currency, Advance_Amount:0, Rcv_Amount:item.Total_TAmount, Nego_Amount:item.Total_Cashable_Amount});               

               item.Total_Shipment_Amount = Math.round((item.Total_Shipment_Amount)*10000)/10000;
               item.Total_TAmount = Math.round((item.Total_TAmount)*10000)/10000;
               item.Total_Expense = Math.round((item.Total_Expense)*10000)/10000;
               item.Total_Deposit = Math.round((item.Total_Deposit)*10000)/10000;
               item.Total_Cashable_Amount = Math.round((item.Total_Cashable_Amount)*10000)/10000;
               item.Total_Available_Amount = Math.round((item.Total_Available_Amount)*10000)/10000;
            });
         }

         //押匯逾期未回收
         if(req.body.Mode == 0 || req.body.Mode == 5) {
            var Submit_Doc_Completed_OverDuo = (req.body.Mode == 0) ? result.recordsets[4] : ((req.body.Mode == 5) ? result.recordsets[0] :  [])

            DataSet.Submit_Doc_Completed_OverDuo = [...Submit_Doc_Completed_OverDuo.reduce((r, e) => {
               let k = `${e.Currency}`;
               if (!r.has(k)) {
                  r.set(k, { Currency: e.Currency,
                     Total_Shipment_Amount: e.Shipment_Amount,
                     Total_TAmount: e.TAmount,
                     Total_Expense: e.Expense,
                     Total_Deposit: e.Deposit,
                     Total_Cashable_Amount: e.Cashable_Amount,
                     Total_Available_Amount: e.Available_Amount,
                  })
               } else {
                  r.get(k).Total_Shipment_Amount += e.Shipment_Amount;
                  r.get(k).Total_TAmount += e.TAmount;
                  r.get(k).Total_Expense += e.Expense;
                  r.get(k).Total_Deposit += e.Deposit;
                  r.get(k).Total_Cashable_Amount += e.Cashable_Amount;
                  r.get(k).Total_Available_Amount += e.Available_Amount;
               }
               return r;
            }, new Map).values()];

            DataSet.Submit_Doc_Completed_OverDuo.forEach((item) => {
               item.Detail = Submit_Doc_Completed_OverDuo.filter((data)=>(data.Currency == item.Currency));
               var tmpShipment_Info = []
               item.Detail.forEach((object) => {
                  object.Shipment_Info = object.Sort == 0 ? Shipment_Info.filter((data)=>(data.MoneyID == object.MoneyID)):[];
                  object.Sort == 0 ? tmpShipment_Info.push(...object.Shipment_Info):''
               })
               
               item.Shipment_Info_Total = [...tmpShipment_Info.reduce((r, e) => {
                  let k = `${e.Brand}|${e.Season}`;
                  if (!r.has(k)) {
                     r.set(k, { 
                        Brand: e.Brand,
                        Season: e.Season,
                        Total_Qty: e.Qty,                           
                        Total_Deposit: e.Deposit,
                     })
                  } else {
                     r.get(k).Total_Qty += e.Qty;
                     r.get(k).Total_Deposit += e.Deposit;
                  }
                  return r;
               }, new Map).values()];

               tmp_Grand_Total.push({Currency:item.Currency, Advance_Amount:0, Rcv_Amount:item.Total_TAmount, Nego_Amount:item.Total_Cashable_Amount});

               item.Total_Shipment_Amount = Math.round((item.Total_Shipment_Amount)*10000)/10000;
               item.Total_TAmount = Math.round((item.Total_TAmount)*10000)/10000;
               item.Total_Expense = Math.round((item.Total_Expense)*10000)/10000;
               item.Total_Deposit = Math.round((item.Total_Deposit)*10000)/10000;
               item.Total_Cashable_Amount = Math.round((item.Total_Cashable_Amount)*10000)/10000;
               item.Total_Available_Amount = Math.round((item.Total_Available_Amount)*10000)/10000;
            });
         }

         //預收款
         if(req.body.Mode == 0 || req.body.Mode == 6) {
            var Advance_Receivable = (req.body.Mode == 0) ? result.recordsets[6] : ((req.body.Mode == 6) ? result.recordsets[0] :  [])
     
            DataSet.Advance_Receivable = [...Advance_Receivable.reduce((r, e) => {
               let k = `${e.Currency}`;
               if (!r.has(k)) {
                  r.set(k, { Currency: e.Currency,
                     Total_Deposit: e.Deposit,
                     Total_Source_Amount: e.Source_Amount,
                     Total_Progress_Amount: e.Progress_Amount,
                     Total_Balance: e.Balance,
                     Total_Expense: e.Expense,
                  })
               } else {
                  r.get(k).Total_Deposit += e.Deposit;
                  r.get(k).Total_Source_Amount += e.Source_Amount;
                  r.get(k).Total_Progress_Amount += e.Progress_Amount;
                  r.get(k).Total_Balance += e.Balance;
                  r.get(k).Total_Expense += e.Expense;
               }
               return r;
            }, new Map).values()];

            DataSet.Advance_Receivable.forEach((item) => {
               item.Detail = Advance_Receivable.filter((data)=>(data.Currency == item.Currency));
               
               tmp_Grand_Total.push({Currency:item.Currency, Advance_Amount:item.Total_Balance, Rcv_Amount:0, Nego_Amount:0});

               item.Total_Deposit = Math.round((item.Total_Deposit)*10000)/10000;
               item.Total_Source_Amount = Math.round((item.Total_Source_Amount)*10000)/10000;
               item.Total_Progress_Amount = Math.round((item.Total_Progress_Amount)*10000)/10000;
               item.Total_Balance = Math.round((item.Total_Balance)*10000)/10000;
               item.Total_Expense = Math.round((item.Total_Expense)*10000)/10000;
            });
         }

         //Get Grand Total Info
         DataSet.Grand_Total_Info = [...tmp_Grand_Total.reduce((r, e) => {
            let k = `${e.Currency}`;
            if (!r.has(k)) {
            r.set(k, { Currency: e.Currency,
                  Total_Advance_Amount: e.Advance_Amount,
                  Total_Rcv_Amount: e.Rcv_Amount,
                  Total_Nego_Amount: e.Nego_Amount
               })
            } else {
               r.get(k).Total_Advance_Amount += e.Advance_Amount;
               r.get(k).Total_Rcv_Amount += e.Rcv_Amount;
               r.get(k).Total_Nego_Amount += e.Nego_Amount;
            }
            return r;
         }, new Map).values()];
        
         DataSet.Grand_Total_Info.forEach((item) => {
            item.Total_Advance_Amount = Math.round((item.Total_Advance_Amount)*10000)/10000;
            item.Total_Rcv_Amount = Math.round((item.Total_Rcv_Amount)*10000)/10000;
            item.Total_Nego_Amount = Math.round((item.Total_Nego_Amount)*10000)/10000;
         });         

         //console.log(DataSet)
         res.send(DataSet);
      }).catch((err) => {
         console.log(err);
         res.status(500).send(err);
      })
});

//Get Advance_Receivable_List
router.post('/Advance_Receivable_List',  function (req, res, next) {
   console.log("Call Advance Receivable List Api:", req.body);

   req.body.MoneyID = req.body.MoneyID ? req.body.MoneyID : '%';
   req.body.CustomerID = req.body.CustomerID ? `${req.body.CustomerID.trim().substring(0,15).replace(/'/g, '')}` : `%`;
   req.body.Reference_NO = req.body.Reference_NO ? `${req.body.Reference_NO.trim().substring(0,30).replace(/'/g, '')}` : `%`;
   req.body.Date_From = req.body.Date_From ? `${req.body.Date_From.trim().substring(0,10).replace(/'/g, '')}` : `2000/01/01`;
   req.body.Date_To = req.body.Date_To ? `${req.body.Date_To.trim().substring(0,10).replace(/'/g, '')}` : `3000/01/01`;
   req.body.Currency = req.body.Currency ? `${req.body.Currency.trim().substring(0,4).replace(/'/g, '')}` : `%`;
   req.body.Deposit = req.body.Deposit ? req.body.Deposit : '%';
   req.body.Source_Amount = req.body.Source_Amount ? req.body.Source_Amount : '%';
   req.body.Progress_Amount = req.body.Progress_Amount ? req.body.Progress_Amount : '%';
   req.body.Balance = req.body.Balance ? req.body.Balance : '%';
   req.body.S_Name = req.body.S_Name ? `${req.body.S_Name.trim().substring(0,18).replace(/'/g, '')}` : `%`;
   req.body.UserID = req.body.UserID ? `${req.body.UserID.trim().substring(0,20).replace(/'/g, '')}` : `%`;
   req.body.Memo = req.body.Memo ? req.body.Memo : '%';
   req.body.Not_History = req.body.Not_History ? req.body.Not_History : '0';      
   
   var strSQL = format(`
   SELECT CONVERT (Varchar(20), m.MoneyID) AS MoneyID
   , ISNULL(m.CustomerID, '') AS CustomerID
   , m.Accounting_Item_No
   , ISNULL(m.Currency, '') AS Currency
   , ai.Item
   , ISNULL(m.Reference_NO, '') AS Reference_NO
   , m.BankID
   , ISNULL(b.S_Name, '') AS S_Name
   , CONVERT (varchar(20), m.Date, 111) AS Date
   , ISNULL(m.Deposit,0) AS Deposit   
   , ISNULL(m.Source_Amount, 0) AS Source_Amount
   , ISNULL(m.Progress_Amount, 0) AS Progress_Amount
   , ISNULL(m.Source_Amount, 0) - ISNULL(m.Progress_Amount,0) AS Balance
   , m.UserID
   , isnull(m.Memo,'') as Memo
   FROM Money m with(NoLock,NoWait)
   INNER JOIN Bank b with(NoLock,NoWait) ON m.BankID = b.BankID 
   INNER JOIN Accounting_Item ai with(NoLock,NoWait) ON m.Accounting_Item_No = ai.Accounting_Item_No
   Where (m.Accounting_Item_No = '2131')
   AND (CONVERT(Varchar(20), m.MoneyID) LIKE '%{MoneyID}%')
   AND (ISNULL(m.CustomerID, '') LIKE '%{CustomerID}%')
   AND (ISNULL(m.Reference_NO, '') LIKE '%{Reference_NO}%')
   AND (m.Date is null or (CONVERT(Date, m.Date) between N'{Date_From}' AND  N'{Date_To}'))
   AND (ISNULL(m.Currency, '') LIKE '%{Currency}%')
   And (N'{Deposit}' = '%' or cast(ISNULL(m.Deposit,0) as decimal(20,2)) LIKE N'%{Deposit}%')
   And (N'{Source_Amount}' = '%' or cast(ISNULL(m.Source_Amount,0) as decimal(20,2)) LIKE N'%{Source_Amount}%')
   And (N'{Progress_Amount}' = '%' or cast(ISNULL(m.Progress_Amount,0) as decimal(20,2)) LIKE N'%{Progress_Amount}%')
   And (N'{Balance}' = '%' or cast((ISNULL(m.Source_Amount, 0) - ISNULL(m.Progress_Amount, 0)) as decimal(20,2)) LIKE N'%{Balance}%')
   AND (ISNULL(b.S_Name, '') LIKE '%{S_Name}%')
   AND (ISNULL(m.UserID, '') LIKE '%{UserID}%')
   AND (ISNULL(m.Memo, '') LIKE '%{Memo}%')
   AND (0 = {Not_History} OR (m.Date is null or (ISNULL(m.Source_Amount, 0) - ISNULL(m.Progress_Amount, 0)) > 0)) 
   ORDER BY Currency DESC;
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
               Total_Deposit: e.Deposit,
               Total_Source_Amount: e.Source_Amount,
               Total_Progress_Amount: e.Progress_Amount,
               Total_Balance_Amount: e.Balance,
              })
            } else {
               r.get(k).Total_Deposit += e.Deposit;
               r.get(k).Total_Source_Amount += e.Source_Amount;
               r.get(k).Total_Progress_Amount += e.Progress_Amount;
               r.get(k).Total_Balance_Amount += e.Balance;
            }
            return r;
          }, new Map).values()]

          DataSet.Currency_Info.forEach((item)=>{
            item.Total_Deposit = Math.round(item.Total_Deposit * 10000)/10000;
            item.Total_Source_Amount = Math.round(item.Total_Source_Amount * 10000)/10000;
            item.Total_Progress_Amount = Math.round(item.Total_Progress_Amount * 10000)/10000;
            item.Total_Balance_Amount = Math.round(item.Total_Balance_Amount * 10000)/10000;
         }) 

         res.send(DataSet);         
      }).catch((err) => {
         console.log(err);
         res.status(500).send(err);
      })

});

//Get Advance_Receivable_Info
router.post('/Advance_Receivable_Info',  function (req, res, next) {
   console.log("Call Advance_Receivable_Info Api:",req.body);
 
   req.body.MoneyID = req.body.MoneyID ? req.body.MoneyID : null;
   req.body.Mode = req.body.Mode ? req.body.Mode : 0;
 
   //Mode == 0 Get Money and Money Source 
   //Mode == 1 Get Money Data
   //Mode == 2 Get Money Source Data
   //Mode == 3 Get Money Expense Data
   
   var strSQL = format(`
   Declare @Mode int = {Mode};
 
   if(@Mode = 0 or @Mode = 1)
   Begin
      SELECT s.[MoneyID]
      , s.[Subject]
      , s.[Type]
      , s.[Accounting_Item_No]
      , ai.Item as Accounting_Item_Name
      , isnull(s.MasterID,'') as MasterID
      , s.[Currency]
      , c.Currency_Symbol
      , s.[BankID]
      , b.S_Name
      , s.[CustomerID]
      , s.[Reference_NO]
      , case when isnull(s.Date,'') = '' then '' else convert(varchar(10), s.Date,111) end as [Date]      
      , case when isnull(s.Apply_Date,'') = '' then '' else convert(varchar(10), s.Apply_Date,111) end as [Apply_Date]      
      , case when isnull(s.Expiry_Date,'') = '' then '' else convert(varchar(10), s.Expiry_Date,111) end as [Expiry_Date]      
      , case when isnull(s.Unpay,'') = '' then '' else convert(varchar(10), s.Unpay,111) end as [Unpay]      
      , case when isnull(s.Acceptance,'') = '' then '' else convert(varchar(10), s.Acceptance,111) end as [Acceptance]      
      , isnull(s.[Source_Amount],0) as Source_Amount
      , isnull(s.[Deposit],0) as Deposit
      , isnull(s.[Source_Amount],0) as Source_Amount
      , isnull(s.[Balance],0) as Balance
      , CONVERT (bit, s.Bad_Debt) AS Bad_Debt
      , s.[MEMO]
      , s.[UserID]
      , s.[Data_Updater]
      , Convert(varchar(20), s.[Data_Update],111) as [Data_Update]
      FROM Money s WITH (NoLock, NoWait)
      Inner Join Bank b with(NoLock,NoWait) On b.BankID = s.BankID
      Inner Join Accounting_Item ai with(NoLock,NoWait) On ai.Accounting_Item_No = s.Accounting_Item_No
      Inner Join currency c with(NoLock,NoWait) on c.Currency = s.[Currency]
      WHERE MoneyID = {MoneyID}
   End
   if(@Mode = 0 or @Mode = 2)
   Begin
      Select ms.Money_SourceID
      , ms.[MoneyID]
      , ms.[Source_No] as Invoice_No
      , isnull(ms.Days,0) as Days
      , cast(ABS(ms.By_Doc_Rcv) as bit) as By_Doc_Rcv
      , Convert(varchar(10), p.[Doc_Completed],111) as [Doc_Completed]
      , Convert(varchar(10), p.[F_ETD],111) as [F_ETD]
      , Convert(varchar(10), case when ABS(ms.By_Doc_Rcv) = 1 And p.[Doc_Completed] is not null then DateAdd(Day, ms.Days, p.[Doc_Completed]) else DateAdd(Day, ms.Days, p.[F_ETD]) end ,111) as Pre_RCV_Date
      , Convert(varchar(10), ms.[Initial_Date],111) as [Initial_Date]
      , Convert(varchar(10), ms.Due_Date,111) as Due_Date
      , isnull(p.Qty,0) as Qty
      , p.Currency
      , isnull(p.Rcv_Amount,0) as Rcv_Amount
      , isnull(p.Rcved_Amount,0) as Rcved_Amount
      , isnull(ms.Deposit,0) as Deposit
      , ms.Description
      From Money_Source ms with(NoLock, NoWait)
       Inner Join PDSP p with(NoLock,NoWait) on ms.Source_No = p.Shipment_NO 
       Where ms.MoneyID = {MoneyID}
       Order by p.[F_ETD], ms.[Source_No]
   End
   if(@Mode = 0 or @Mode = 3)
   Begin
       Select me.Money_ExpenseID
       , me.[MoneyID]
       , Convert(varchar(10), me.[Date],111) as [Date]       
       , rtrim(me.[Description]) as Description
       , isnull(me.[Deposit],0) as Deposit
       , me.Remark
       From Money_Expense me with(NoLock, NoWait)
       Where me.MoneyID = {MoneyID}
       Order by me.Date
   End
   `, req.body) ;
   //console.log(strSQL)
   db.sql(req.SiteDB, strSQL)
      .then((result) => {
         var DataSet = {Advance_Receivable: (req.body.Mode == 0 || req.body.Mode == 1) ? result.recordsets[0] : []
           , Advance_Receivable_Detail: (req.body.Mode == 0) ? result.recordsets[1] : (req.body.Mode == 2 ? result.recordsets[0] : [])
           , Advance_Receivable_Expense: (req.body.Mode == 0) ? result.recordsets[2] : (req.body.Mode == 3 ? result.recordsets[0] : [])
           , Total_Qty:0
           , Total_Rcv_Amount:0
           , Total_Rcved_Amount:0
           , Total_Deposit_Amount:0
           , Total_Expense_Amount:0
        };

        DataSet.Advance_Receivable_Detail.forEach((item) => {
            item.Rcv_Amount = Math.round((item.Rcv_Amount)*10000)/10000;
            item.Rcved_Amount = Math.round((item.Rcved_Amount)*10000)/10000;
            item.Deposit = Math.round((item.Deposit)*10000)/10000;
            DataSet.Total_Qty += item.Qty;
            DataSet.Total_Rcv_Amount += item.Rcv_Amount;
            DataSet.Total_Rcved_Amount += item.Rcved_Amount;
            DataSet.Total_Deposit_Amount += item.Deposit;
        });

        DataSet.Advance_Receivable_Expense.forEach((item) => {
            item.Deposit = Math.round((item.Deposit)*10000)/10000;            
            DataSet.Total_Expense_Amount += item.Deposit;
        });

        DataSet.Total_Qty = Math.round((DataSet.Total_Qty)*10000)/10000;
        DataSet.Total_Rcv_Amount = Math.round((DataSet.Total_Rcv_Amount)*10000)/10000;
        DataSet.Total_Rcved_Amount = Math.round((DataSet.Total_Rcved_Amount)*10000)/10000;
        DataSet.Total_Deposit_Amount = Math.round((DataSet.Total_Deposit_Amount)*10000)/10000;
        DataSet.Total_Expense_Amount = Math.round((DataSet.Total_Expense_Amount)*10000)/10000;        

        //console.log(DataSet)
        res.send(DataSet);
      }).catch((err) => {
         console.log(err);
         res.status(500).send(err);
      })
});

//Maintain Advance_Receivable
router.post('/Advance_Receivable_Maintain',  function (req, res, next) {
   console.log("Call Advance_Receivable_Maintain Api:",req.body);

   // req.body.Mode === 0 表示新增
   // req.body.Mode === 1 表示修改
   // req.body.Mode === 2 表示刪除
   var Size = 0;
   req.body.MoneyID = req.body.MoneyID ? req.body.MoneyID : null;
   
   var strSQL = format(`Declare @ROWCOUNT int, @MoneyID int = {MoneyID} 
   `, req.body);
   switch(req.body.Mode){
      case 0:
         
         req.body.BankID = req.body.BankID ? req.body.BankID : 0;         
         req.body.Currency = req.body.Currency ? `N'${req.body.Currency.trim().substring(0,4).replace(/'/g, "''")}'` : `'USD'`;
         req.body.CustomerID = req.body.CustomerID ? `N'${req.body.CustomerID.trim().substring(0,15).replace(/'/g, "''")}'` : `''`; 
         req.body.Apply_Date = req.body.Apply_Date ? `'${req.body.Apply_Date.trim().substring(0,10)}'` : `'${moment().format('YYYY/MM/DD')}'`;         

         strSQL += format(`
            Insert [dbo].[Money] (Accounting_Item_No, [BankID], [Currency], [CustomerID], [Apply_Date]
               , Type, Subject, Bad_Debt, UserID, Data_Updater
               , Data_Update)
            Select 2131 as [Accounting_Item_No], {BankID} as [BankID], {Currency} as [Currency], {CustomerID} as [CustomerID], {Apply_Date} as [Apply_Date]
               , 'T/T' as Type, 'PDSP RCV' as Subject, 0 as Bad_Debt, N'${req.UserID}' as UserID, N'${req.UserID}' as Data_Updater
               , GetDate() as Data_Update
            
            Set @ROWCOUNT = @@ROWCOUNT;
            Set @MoneyID = scope_identity();
         `, req.body);
      break;
      case 1:
         switch(req.body.Name){
            case 'Date':
            case 'Apply_Date':
            case 'Expiry_Date':
               Size = 10;
            break;
            case 'CustomerID':
               Size = 15;
            break;
            case 'Currency':
               Size = 4;
            break;
            case 'Reference_NO':
               Size = 30;
            break;
            case 'MEMO':
               Size = 65535;
            break;
            case 'Deposit':
               Size = 0;
            break;
         }
         req.body.Value = Size == 0 ? (req.body.Value != null ? req.body.Value : null) : (req.body.Value ? `N'${req.body.Value.trim().replace(/'/g, "''")}'` : `''`);

         switch(req.body.Name){
            case 'Deposit':
               strSQL += format(`         
                  Update [dbo].[Money] Set [Deposit] = {Value}
                  , Balance = isnull({Value},0) - isnull(Source_Amount,0)
                  where MoneyID = @MoneyID
                  And (isnull({Value},0) - isnull(Source_Amount,0)) >= 0
                  And (Select count(*) From Money_Source ms with(NoLock,NoWait) Where ms.MoneyID = @MoneyID) = 0;
      
                  Set @ROWCOUNT = @@ROWCOUNT;
               `, req.body);   
            break;
            case 'Currency':
            case 'CustomerID':
            case 'Date':
                  strSQL += format(`         
                  Update [dbo].[Money] Set [{Name}] = ${Size == 0 ? '{Value}': ` case when len({Value}) > 0 then substring({Value},1,${Size}) else null end`}            
                  where MoneyID = @MoneyID
                  And (Select count(*) From Money_Source ms with(NoLock,NoWait) Where ms.MoneyID = @MoneyID) = 0;
      
                  Set @ROWCOUNT = @@ROWCOUNT;
               `, req.body);   
            break;
            default:
               strSQL += format(`         
                  Update [dbo].[Money] Set [{Name}] = ${Size == 0 ? '{Value}': ` case when len({Value}) > 0 then substring({Value},1,${Size}) else null end`}            
                  where MoneyID = @MoneyID;
      
                  Set @ROWCOUNT = @@ROWCOUNT;
               `, req.body);   
            break;
         }
      break;
      case 2:
         strSQL += format(`
            Delete FROM [dbo].[Money] where MoneyID = @MoneyID
            Set @ROWCOUNT = @@ROWCOUNT; 
            if(@ROWCOUNT > 0)
            Begin
               Delete FROM [dbo].[Money_Source] where MoneyID = @MoneyID
            End                         
         `, req.body);
      break;
        
   }

   strSQL += format(`
   Select @ROWCOUNT as Flag,  @MoneyID as MoneyID;

   if({Mode} = 1 and @ROWCOUNT > 0)
   Begin
      Update [dbo].[Money] Set UserID = isnull(UserID, N'${req.UserID}')
      , Data_Updater = N'${req.UserID}'
      , Data_Update = GetDate()
      where MoneyID = @MoneyID;
   End
   `, req.body);
   //console.log(strSQL)
   db.sql(req.SiteDB, strSQL)
      .then((result) => {
         //console.log(result.recordsets[0])
         res.send({Flag:result.recordsets[0][0].Flag > 0, MoneyID: result.recordsets[0][0].MoneyID});
      }).catch((err) => {
         console.log(err);
         res.status(500).send(err);
      })
});

//Maintain Advance_Receivable_Detail
router.post('/Advance_Receivable_Detail_Maintain',  function (req, res, next) {
   console.log("Call Advance_Receivable_Detail_Maintain Api:",req.body);

   // req.body.Mode === 0 表示新增
   // req.body.Mode === 1 表示修改
   // req.body.Mode === 2 表示刪除
   var Size = 0;
   req.body.MoneyID = req.body.MoneyID ? req.body.MoneyID: null;
   req.body.Money_SourceID = req.body.Money_SourceID ? req.body.Money_SourceID: null;

   
   var strSQL = format(`Declare @ROWCOUNT int=0
   `, req.body);
   switch(req.body.Mode){
      case 0:
         var strSQL1 = '';

         req.body.Money_Source.forEach((item)=>{
            strSQL1 += format(`Insert into @tmpDetail (Money_SourceID) values (N'{Money_SourceID}');`,item)
         })

         strSQL += format(`         
         Declare @tmpDetail Table (RecNo int IDENTITY(1, 1), Money_SourceID int)
         Declare @Money_SourceID int
         , @RecNo int = 0
         , @Balance float = 0 
         , @Source_Amount float

         ${strSQL1}

         Set @RecNo = (Select count(*) From @tmpDetail);

         while(@RecNo > 0)
         begin
            Select @Money_SourceID = Money_SourceID From @tmpDetail t Where t.RecNo = @RecNo;

            Update [dbo].[Money_Source] set MoneyID = {MoneyID}
            From [dbo].[Money_Source] ms
            Where ms.Money_SourceID = @Money_SourceID
            And isnull((Select Balance From Money m where m.MoneyID = {MoneyID}) ,0) >= ms.Deposit
            And ms.Deposit > 0;

            Set @ROWCOUNT += @@ROWCOUNT;

            Set @Source_Amount = isnull((Select sum(m.Deposit) From Money_Source m Where m.MoneyID = {MoneyID}),0) 
      
            Update [dbo].[Money] Set Source_Amount = Round(@Source_Amount ,3)
            , Balance = Round(isnull(Deposit,0) - @Source_Amount ,3)            
            where MoneyID = {MoneyID};             
            
            set @RecNo = @RecNo -1  
         End            
         
         `, req.body);

      break;
      case 1:
         
         switch(req.body.Name){
            case 'Deposit':

            break;
            default:
            break;               
         }

         req.body.Value = Size == 0 ? (req.body.Value != null ? req.body.Value : null) : (req.body.Value ? `N'${req.body.Value.trim().replace(/'/g, "''")}'` : `''`);

         strSQL += format(`         
            Update [dbo].[Money_Source] Set [{Name}] = ${Size == 0 ? 'Round({Value},3)': `substring({Value},1,${Size})`}            
            where Money_SourceID = {Money_SourceID};

            Set @ROWCOUNT = @@ROWCOUNT;
         `, req.body);
      break;
      case 2:
         strSQL += format(`
            Update [dbo].[Money_Source] set MoneyID = null
            where Money_SourceID = {Money_SourceID};
                                    
            Set @ROWCOUNT = @@ROWCOUNT;

            Declare @Source_Amount float = isnull((Select sum(m.Deposit) From Money_Source m Where m.MoneyID = {MoneyID}),0)             
      
            Update [dbo].[Money] Set UserID = isnull(UserID, N'${req.UserID}')
            , Data_Updater = N'${req.UserID}'
            , Data_Update = GetDate()
            , Source_Amount = Round(@Source_Amount ,3)
            , Balance = Round(isnull(Deposit,0) - @Source_Amount ,3)
            , Source_Amount = Round(@Source_Amount,3)
            where MoneyID = {MoneyID};      

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
         res.send({Flag:result.recordsets[0][0].Flag > 0});
      }).catch((err) => {
         console.log(err);
         res.status(500).send(err);
      })

});

//Get Advance_Receivable_Detail Add List
router.post('/Advance_Receivable_Detail_Add_List',  function (req, res, next) {
console.log("Call Advance_Receivable_Detail_Add_List Api:",req.body);  

req.body.MoneyID = req.body.MoneyID ? req.body.MoneyID : null;
req.body.Shipment_No = req.body.Shipment_No ? `N'${req.body.Shipment_No.trim().replace(/'/g, "''")}'` : `''`;
req.body.F_ETD = req.body.F_ETD ? `'${req.body.F_ETD.trim().replace(/'/g, "''")}'` : `''`;
req.body.Amount = req.body.Amount ? `${req.body.Amount.trim()}` : ``;

var strSQL = format(`
Select cast(0 as bit) as flag
, ms.Money_SourceID
, ms.[MoneyID]
, p.[Shipment_No] as Shipment_No
, isnull(ms.Days,0) as Days
, cast(ABS(ms.By_Doc_Rcv) as bit) as By_Doc_Rcv
, Convert(varchar(10), p.[Doc_Completed],111) as [Doc_Completed]
, Convert(varchar(10), case when ABS(ms.By_Doc_Rcv) = 1 And p.[Doc_Completed] is not null then DateAdd(Day, ms.Days, p.[Doc_Completed]) else DateAdd(Day, ms.Days, p.[F_ETD]) end ,111) as Pre_RCV_Date
, Convert(varchar(10), p.[Accounting_Lock_Date],111) as [Accounting_Lock_Date]
, Convert(varchar(10), p.[F_ETD],111) as [F_ETD]
, Convert(varchar(10), ms.[Initial_Date],111) as [Initial_Date]
, Convert(varchar(10), ms.[Due_Date],111) as [Due_Date]
, isnull(p.Qty,0) as Qty
, p.Currency
, isnull(p.Rcv_Amount,0) as Rcv_Amount
, isnull(p.Rcved_Amount,0) as Rcved_Amount
, isnull(ms.Deposit,0) as Deposit
, ms.Description
From Money_Source ms with(NoLock, NoWait)
Inner Join PDSP p with(NoLock,NoWait) on ms.Source_No = p.Shipment_No
Inner Join [Money] m with(NoLock,NoWait) on m.CustomerID = p.CustomerID and m.Currency = p.Currency And m.MoneyID = {MoneyID}
Where ms.Subject = 'PDSP RCV'
And ms.MoneyID is null
And ms.Days <= 0
And ms.type = 'T/T'
And ms.Deposit <= (isnull(m.Source_Amount,0) - isnull(m.Progress_Amount,0))
And ms.Deposit > 0
And p.Accounting_Lock_Date is not null
And ({Shipment_No} = '' or p.Shipment_No like {Shipment_No} + '%' )
And ({F_ETD} = '' or convert(varchar(10),p.F_ETD,111) like {F_ETD} + '%' )
And ('{Amount}' = '' or cast(isnull(ms.Deposit,'') as varchar) like + '%{Amount}%' )
Order by p.[F_ETD], p.[Shipment_No]
;
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

 /* Mark-Wang API End */


 /* Darren-Chang API Begin */
 /* Darren-Chang API End */

 module.exports = router;