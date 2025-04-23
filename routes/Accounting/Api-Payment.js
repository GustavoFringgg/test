var express = require('express');
var router = express.Router();
const format = require('string-format');
var db = require('../../config/DB_Connect');
const cloneDeep = require('lodash/cloneDeep');
let moment = require('moment');


/* Mark-Wang API Begin */

//Get Model_Payment_List
router.post('/Model_Payment_List',  function (req, res, next) {
   console.log("Call Model Payment List Api:", req.body);

   req.body.MoneyID = req.body.MoneyID ? req.body.MoneyID : '';
   req.body.Item = req.body.Item ? `${req.body.Item.trim().replace(/'/g, '')}` : ``;
   req.body.CustomerID = req.body.CustomerID ? `${req.body.CustomerID.trim().substring(0,15).replace(/'/g, '')}` : ``;
   req.body.S_Name = req.body.S_Name ? `${req.body.S_Name.trim().substring(0,18).replace(/'/g, '')}` : ``;  
   req.body.Reference_NO = req.body.Reference_NO ? `${req.body.Reference_NO.trim().substring(0,30).replace(/'/g, '')}` : ``;
   req.body.Currency = req.body.Currency ? `${req.body.Currency.trim().substring(0,4).replace(/'/g, '')}` : ``;
   req.body.Source_Amount = req.body.Source_Amount ? req.body.Source_Amount : '';
   req.body.Withdrawal = req.body.Withdrawal ? req.body.Withdrawal : '';   
   req.body.Date_From = req.body.Date_From ? `${req.body.Date_From.trim().substring(0,10).replace(/'/g, '')}` : ``;
   req.body.Date_To = req.body.Date_To ? `${req.body.Date_To.trim().substring(0,10).replace(/'/g, '')}` : ``;       
   req.body.UserID = req.body.UserID ? `${req.body.UserID.trim().substring(0,256).replace(/'/g, '')}` : '';
   req.body.MEMO = req.body.MEMO ? `${req.body.MEMO.trim().replace(/'/g, '')}` : '';   

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
   , case when isnull(Money.[Date],'') = '' then '' else Convert(varchar(10),Money.[Date],111) end as [Date]
   , case when isnull(Money.[Apply_Date],'') = '' then '' else Convert(varchar(10),Money.[Apply_Date],111) end as [Apply_Date]
   , ISNULL(Money.Withdrawal, 0) AS Withdrawal
   , Money.UserID
   , Money.[MEMO]
   FROM Money with(NoLock,NoWait)
   INNER JOIN Bank with(NoLock,NoWait) ON Money.BankID = Bank.BankID 
   INNER JOIN Accounting_Item with(NoLock,NoWait) ON Money.Accounting_Item_No = Accounting_Item.Accounting_Item_No 
   Where (Money.Subject = 'Model PAY')
   AND (CONVERT (Varchar(20), Money.MoneyID) LIKE N'%{MoneyID}%')
   And (N'{Item}' = '' or Accounting_Item.Item like N'%{Item}%')
   And (N'{CustomerID}' = '' or Money.CustomerID like N'%{CustomerID}%')
   AND (ISNULL(Bank.S_Name, '') LIKE '%{S_Name}%')
   And (N'{Reference_NO}' = '' or Money.Reference_NO like N'%{Reference_NO}%')
   And (N'{Currency}' = '' or Money.Currency like N'%{Currency}%')
   And ((N'{Date_From}' = '' or N'{Date_To}' = '') or convert(date, Money.[Apply_Date],111) between N'{Date_From}' And N'{Date_To}')   
   And (N'{Source_Amount}' = '' or cast(ISNULL(Money.Source_Amount,0) as decimal(20,2)) LIKE N'%{Source_Amount}%')
   And (N'{Withdrawal}' = '' or cast(ISNULL(Money.Withdrawal,0) as decimal(20,2)) LIKE N'%{Withdrawal}%')
   And (N'{UserID}' = '' or Money.UserID like N'%{UserID}%')
   And (N'{MEMO}' = '' or Money.MEMO like N'%{MEMO}%')
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
               Total_Paid_Amount: e.Withdrawal,
              })
            } else {
               r.get(k).Total_Amount += e.Source_Amount;
               r.get(k).Total_Paid_Amount += e.Withdrawal;
            }
            return r;
          }, new Map).values()]

          DataSet.Currency_Info.forEach((item)=>{
            item.Total_Amount = Math.round(item.Total_Amount * 10000)/10000;
            item.Total_Paid_Amount = Math.round(item.Total_Paid_Amount * 10000)/10000;
         }) 

         res.send(DataSet);
      }).catch((err) => {
         console.log(err);
         res.status(500).send(err);
      })

});

//Get Model_Payment_Info
router.post('/Model_Payment_Info',  function (req, res, next) {
   console.log("Call Model_Payment_Info Api:",req.body);
 
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
      , s.[Accounting_Item_No]
      , ai.Item as Accounting_Item_Name
      , s.[Currency]
      , c.Currency_Symbol
      , s.[BankID]
      , b.S_Name
      , s.[CustomerID]
      , s.[Reference_NO]
      , case when isnull(s.[Date],'') = '' then '' else Convert(varchar(10),s.[Date],111) end as [Date]
      , case when isnull(s.[Apply_Date],'') = '' then '' else Convert(varchar(10),s.[Apply_Date],111) end as [Apply_Date]
      , s.[Source_Amount]
      , s.[Withdrawal]
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
       , ms.[Source_No] as Model_Order_No
       , Convert(varchar(10), p.[Order_Date],111) as [Order_Date]
       , Convert(varchar(10), p.[Delivery_Date],111) as [Delivery_Date]
       , p.Currency
       , isnull(p.Qty,0) as Qty
       , isnull(p.Amount,0) as Pay_Amount
       , isnull(p.Paid_Amount,0) as Paid_Amount
       , isnull(ms.Withdrawal,0) as Withdrawal
       , rtrim(ms.[Description]) as Description
       From Money_Source ms with(NoLock, NoWait)
       Inner Join Model_Order p with(NoLock,NoWait) on ms.Source_No = cast(p.Model_Order_No as varchar)
       Where ms.MoneyID = {MoneyID}
       Order by ms.[Source_No]
   End
   if(@Mode = 0 or @Mode = 3)
   Begin
       Select me.Money_ExpenseID
       , me.[MoneyID]
       , Convert(varchar(10), me.[Date],111) as [Date]       
       , rtrim(me.[Description]) as Description
       , isnull(me.[Withdrawal],0) as Withdrawal
       , me.Remark
       From Money_Expense me with(NoLock, NoWait)
       Where me.MoneyID = {MoneyID}
       Order by me.Date
   End
   `, req.body) ;
   //console.log(strSQL)
   db.sql(req.SiteDB, strSQL)
      .then((result) => {
         var DataSet = {Model_Payment: (req.body.Mode == 0 || req.body.Mode == 1) ? result.recordsets[0] : []
           , Model_Payment_Detail: (req.body.Mode == 0) ? result.recordsets[1] : (req.body.Mode == 2 ? result.recordsets[0] : [])
           , Model_Payment_Expense: (req.body.Mode == 0) ? result.recordsets[2] : (req.body.Mode == 3 ? result.recordsets[0] : [])
           , Total_Qty:0
           , Total_Pay_Amount:0
           , Total_Paid_Amount:0
           , Total_Withdrawal_Amount:0
           , Total_Expense_Amount:0
        };

        DataSet.Model_Payment_Detail.forEach((item) => {
            item.Qty = Math.round((item.Qty)*10000)/10000;
            item.Pay_Amount = Math.round((item.Pay_Amount)*10000)/10000;
            item.Paid_Amount = Math.round((item.Paid_Amount)*10000)/10000;
            item.Withdrawal = Math.round((item.Withdrawal)*10000)/10000;
            DataSet.Total_Qty += item.Qty;
            DataSet.Total_Pay_Amount += item.Pay_Amount;
            DataSet.Total_Paid_Amount += item.Paid_Amount;
            DataSet.Total_Withdrawal_Amount += item.Withdrawal;
        });

        DataSet.Model_Payment_Expense.forEach((item) => {
            item.Withdrawal = Math.round((item.Withdrawal)*10000)/10000;
            DataSet.Total_Expense_Amount += item.Withdrawal;
        });

        DataSet.Total_Qty = Math.round((DataSet.Total_Qty)*10000)/10000;
        DataSet.Total_Pay_Amount = Math.round((DataSet.Total_Pay_Amount)*10000)/10000;
        DataSet.Total_Paid_Amount = Math.round((DataSet.Total_Paid_Amount)*10000)/10000;
        DataSet.Total_Withdrawal_Amount = Math.round((DataSet.Total_Withdrawal_Amount)*10000)/10000;
        //console.log(DataSet)
        res.send(DataSet);
      }).catch((err) => {
         console.log(err);
         res.status(500).send(err);
      })
});

//Maintain Model_Payment
router.post('/Model_Payment_Maintain',  function (req, res, next) {
   console.log("Call Model_Payment_Maintain Api:",req.body);

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
            Insert [dbo].[Money] (Accounting_Item_No, [BankID], [Currency]
               , [Subject], Bad_Debt
               , [CustomerID], [Date], [Apply_Date]
               , UserID, Data_Updater, Data_Update)
            Select 2122 as [Accounting_Item_No], {BankID} as [BankID], {Currency} as [Currency]
               , 'Model PAY' as Subject, 0 as Bad_Debt
               , case when {CustomerID} = '' then (Select top 1 SupplierID From Supplier) else {CustomerID} end as [CustomerID]
               , {Date} as [Date], {Apply_Date} as [Apply_Date]
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

//Maintain Model Payment Detail
router.post('/Model_Payment_Detail_Maintain',  function (req, res, next) {
   console.log("Call Model_Payment_Detail_Maintain Api:",req.body);

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
         Declare @tmpDetail Table (Money_SourceID int)

         ${strSQL1}

         Update [dbo].[Money_Source] set MoneyID = {MoneyID}
         From Money_Source ms
         Inner Join @tmpDetail t on ms.Money_SourceID = t.Money_SourceID
         Inner Join Model_Order p with(NoLock,NoWait) on ms.Source_No = cast(p.Model_Order_No as varchar)
         Inner Join [Money] m with(NoLock,NoWait) on m.CustomerID = p.Model_Maker and m.Currency = p.Currency and m.type = ms.type And m.MoneyID = {MoneyID}
         Where ms.MoneyID is null
         And ms.Subject = 'Model PAY';
        
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
            Update [dbo].[Money_Source] set MoneyID = null
            where Money_SourceID = {Money_SourceID}
                                    
            Set @ROWCOUNT = @@ROWCOUNT;
         `, req.body);
      break;
        
   }

   strSQL += format(`
   Select @ROWCOUNT as Flag;

   if(@ROWCOUNT > 0)
   Begin 
      Declare @Withdrawal float = isnull((Select sum(m.Withdrawal) From Money_Source m Where m.MoneyID = {MoneyID}),0) 
      , @Expense float = isnull((Select sum(me.Withdrawal) From Money_Expense me Where me.MoneyID = {MoneyID}),0)

      Update [dbo].[Money] Set UserID = isnull(UserID, N'${req.UserID}')
      , Data_Updater = N'${req.UserID}'
      , Data_Update = GetDate()      
      , Withdrawal = Round((@Withdrawal + @Expense) ,3)
      , Source_Amount = Round(@Withdrawal,3)
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

//Maintain Model Payment Expense
router.post('/Model_Payment_Expense_Maintain',  function (req, res, next) {
   console.log("Call Model_Payment_Expense_Maintain Api:",req.body);

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

   if(({Mode} = 1 or {Mode} = 2) and @ROWCOUNT > 0)
   Begin
      Declare @Withdrawal float = isnull((Select sum(m.Withdrawal) From Money_Source m Where m.MoneyID = {MoneyID}),0) 
      , @Expense float = isnull((Select sum(me.Withdrawal) From Money_Expense me Where me.MoneyID = {MoneyID}),0)

      Update [dbo].[Money] Set UserID = isnull(UserID, N'${req.UserID}')
      , Data_Updater = N'${req.UserID}'
      , Data_Update = GetDate()      
      , Withdrawal = Round((@Withdrawal + @Expense) ,3)
      , Source_Amount = Round(@Withdrawal,3)
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

//Get Model Payment Detail Add List
router.post('/Model_Payment_Detail_Add_List',  function (req, res, next) {
   console.log("Call Model_Payment_Detail_Add_List Api:",req.body);  
   
   req.body.MoneyID = req.body.MoneyID ? req.body.MoneyID : null;
   req.body.Model_Order_No = req.body.Model_Order_No ? req.body.Model_Order_No : null;   
   req.body.Delivery_Date = req.body.Delivery_Date ? `'${req.body.Delivery_Date.trim().replace(/'/g, "''")}'` : `''`;   
   req.body.Model_Maker = req.body.Model_Maker ? `N'${req.body.Model_Maker.trim().replace(/'/g, "''")}'` : `''`;
   req.body.CustomerID = req.body.CustomerID ? `N'${req.body.CustomerID.trim().replace(/'/g, "''")}'` : `''`;
      
   var strSQL = format(`   
   Select cast(0 as bit) as flag, '' as Query
   , ms.Money_SourceID
   , p.Model_Order_No, p.Model_Maker
   , p.CustomerID, convert(nvarchar(10), p.Delivery_Date,111) as Delivery_Date
   , p.Qty
   , p.Amount as Pay_Amount
   , p.Paid_Amount
   , ms.Withdrawal as Balance_Amount
   From Money_Source ms with(NoLock, NoWait)
   Inner Join Model_Order p with(NoLock,NoWait) on ms.Source_No = cast(p.Model_Order_No as varchar)
   Inner Join [Money] m with(NoLock,NoWait) on m.CustomerID = p.Model_Maker and m.Currency = p.Currency and m.type = ms.type And m.MoneyID = {MoneyID}
   Where ms.Subject = 'Model PAY'
   And ms.MoneyID is null   
   And ({Delivery_Date} = '' or convert(varchar(10),p.Delivery_Date,111) like {Delivery_Date} + '%' )    
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

//Get Product_Shipment_Payment_List
router.post('/Product_Shipment_Payment_List',  function (req, res, next) {
   console.log("Call Product Shipment Payment List Api:", req.body);

   req.body.MoneyID = req.body.MoneyID ? req.body.MoneyID : '';
   req.body.CustomerID = req.body.CustomerID ? `${req.body.CustomerID.trim().substring(0,15).replace(/'/g, '')}` : ``;
   req.body.Currency = req.body.Currency ? `${req.body.Currency.trim().substring(0,4).replace(/'/g, '')}` : ``;
   req.body.Reference_NO = req.body.Reference_NO ? `${req.body.Reference_NO.trim().substring(0,30).replace(/'/g, '')}` : ``;
   req.body.Type = req.body.Type ? `${req.body.Type.trim().substring(0,4).replace(/'/g, '')}` : ``;
   req.body.Source_Amount = req.body.Source_Amount ? req.body.Source_Amount : '';
   req.body.Withdrawal = req.body.Withdrawal ? req.body.Withdrawal : '';
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
   , case when isnull(Money.[Apply_Date],'') = '' then '' else Convert(varchar(10),Money.[Apply_Date],111) end as [Apply_Date]
   , case when isnull(Money.[Date],'') = '' then '' else Convert(varchar(10),Money.[Date],111) end as [Date]
   , ISNULL(Money.Withdrawal, 0) AS Withdrawal
   , ISNULL(Money.MasterID, '') AS MasterID
   , CONVERT (bit, Money.Bad_Debt) AS Bad_Debt
   , Money.UserID
   , Money.[MEMO]
   FROM Money with(NoLock,NoWait)
   INNER JOIN Bank with(NoLock,NoWait) ON Money.BankID = Bank.BankID 
   INNER JOIN Accounting_Item with(NoLock,NoWait) ON Money.Accounting_Item_No = Accounting_Item.Accounting_Item_No 
   Where (CONVERT (Varchar(20), Money.MoneyID) LIKE N'%{MoneyID}%') 
   And (N'{CustomerID}' = '' or Money.CustomerID like N'%{CustomerID}%')
   And (N'{Currency}' = '' or Money.Currency like N'%{Currency}%')
   And (N'{Reference_NO}' = '' or Money.Reference_NO like N'%{Reference_NO}%')   
   And ((N'{Date_From}' = '' or N'{Date_To}' = '') or convert(Date, Money.[Apply_Date],111) between N'{Date_From}' And N'{Date_To}')
   AND (Money.Subject = 'PDSP PAY') 
   And (N'{Type}' = '' or Money.Type like N'%{Type}%')
   And (N'{Source_Amount}' = '' or cast(ISNULL(Money.Source_Amount,0) as decimal(20,2)) LIKE N'%{Source_Amount}%')   
   And (N'{Withdrawal}' = '' or cast(ISNULL(Money.Withdrawal,0) as decimal(20,2)) LIKE N'%{Withdrawal}%')
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
               Total_Paid_Amount: e.Withdrawal,
              })
            } else {
               r.get(k).Total_Amount += e.Source_Amount;
               r.get(k).Total_Paid_Amount += e.Withdrawal;
            }
            return r;
          }, new Map).values()]

          DataSet.Currency_Info.forEach((item)=>{
            item.Total_Amount = Math.round(item.Total_Amount * 10000)/10000;
            item.Total_Paid_Amount = Math.round(item.Total_Paid_Amount * 10000)/10000;
         }) 

         res.send(DataSet);
      }).catch((err) => {
         console.log(err);
         res.status(500).send(err);
      })

});

//Get Product_Shipment_Payment_Info
router.post('/Product_Shipment_Payment_Info',  function (req, res, next) {
   console.log("Call Product_Shipment_Payment_Info Api:",req.body);
 
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
      , s.[Accounting_Item_No]
      , ai.Item as Accounting_Item_Name
      , s.[Currency]
      , s.[BankID]
      , b.S_Name
      , s.[CustomerID]
      , s.[Reference_NO]      
      , case when isnull(s.[Apply_Date],'') = '' then '' else Convert(varchar(10),s.[Apply_Date],111) end as [Apply_Date]      
      , case when isnull(s.[Date],'') = '' then '' else Convert(varchar(10),s.[Date],111) end as [Date]
      , s.[Source_Amount]
      , s.[Withdrawal]
      , s.[MEMO]
      , s.[UserID]
      , s.[Data_Updater]
      , Convert(varchar(20), s.[Data_Update],111) as [Data_Update]
      FROM Money s WITH (NoLock, NoWait)
      Inner Join Bank b with(NoLock,NoWait) On b.BankID = s.BankID
      Inner Join Accounting_Item ai with(NoLock,NoWait) On ai.Accounting_Item_No = s.Accounting_Item_No
      WHERE MoneyID = {MoneyID}
   End
   if(@Mode = 0 or @Mode = 2)
   Begin
       Select ms.Money_SourceID
       , ms.[MoneyID]
       , ms.[Source_No] as Invoice_No
       , Convert(varchar(10), p.[Est_Payable_Date],111) as [Est_Payable_Date]
       , Convert(varchar(10), p.[F_ETD],111) as [F_ETD]
       , isnull(p.Qty,0) as Qty
       , p.Currency
       , isnull(p.Pay_Amount,0) as Pay_Amount
       , isnull(p.Paid_Amount,0) as Paid_Amount
       , isnull(ms.Withdrawal,0) as Withdrawal
       From Money_Source ms with(NoLock, NoWait)
       Inner Join PDSP p with(NoLock,NoWait) on ms.Source_No = p.Shipment_NO 
       Where ms.MoneyID = {MoneyID}
       Order by ms.[Source_No]
   End
   if(@Mode = 0 or @Mode = 3)
   Begin
       Select me.Money_ExpenseID
       , me.[MoneyID]
       , Convert(varchar(10), me.[Date],111) as [Date]       
       , rtrim(me.[Description]) as Description
       , isnull(me.[Withdrawal],0) as Withdrawal
       , me.Remark
       From Money_Expense me with(NoLock, NoWait)
       Where me.MoneyID = {MoneyID}
       Order by me.Date
   End
   `, req.body) ;
   //console.log(strSQL)
   db.sql(req.SiteDB, strSQL)
      .then((result) => {
         var DataSet = {Product_Shipment_Payment: (req.body.Mode == 0 || req.body.Mode == 1) ? result.recordsets[0] : []
           , Product_Shipment_Payment_Detail: (req.body.Mode == 0) ? result.recordsets[1] : (req.body.Mode == 2 ? result.recordsets[0] : [])
           , Product_Shipment_Payment_Expense: (req.body.Mode == 0) ? result.recordsets[2] : (req.body.Mode == 3 ? result.recordsets[0] : [])
           , Total_Qty:0
           , Total_Pay_Amount:0
           , Total_Paid_Amount:0
           , Total_Withdrawal_Amount:0
           , Total_Expense_Amount:0
        };

        DataSet.Product_Shipment_Payment_Detail.forEach((item) => {
            item.Pay_Amount = Math.round((item.Pay_Amount)*1000)/1000;
            item.Paid_Amount = Math.round((item.Paid_Amount)*1000)/1000;
            item.Withdrawal = Math.round((item.Withdrawal)*1000)/1000;
            DataSet.Total_Qty += item.Qty;
            DataSet.Total_Pay_Amount += item.Pay_Amount;
            DataSet.Total_Paid_Amount += item.Paid_Amount;
            DataSet.Total_Withdrawal_Amount += item.Withdrawal;
        });

        DataSet.Product_Shipment_Payment_Expense.forEach((item) => {
            item.Withdrawal = Math.round((item.Withdrawal)*1000)/1000;
            DataSet.Total_Expense_Amount += item.Withdrawal;
        });

        DataSet.Total_Qty = Math.round((DataSet.Total_Qty)*1000)/1000;
        DataSet.Total_Pay_Amount = Math.round((DataSet.Total_Pay_Amount)*1000)/1000;
        DataSet.Total_Paid_Amount = Math.round((DataSet.Total_Paid_Amount)*1000)/1000;
        DataSet.Total_Withdrawal_Amount = Math.round((DataSet.Total_Withdrawal_Amount)*1000)/1000;
        DataSet.Total_Expense_Amount = Math.round((DataSet.Total_Expense_Amount)*1000)/1000;
        //console.log(DataSet)
        res.send(DataSet);
      }).catch((err) => {
         console.log(err);
         res.status(500).send(err);
      })
});

//Maintain Product_Shipment_Payment
router.post('/Product_Shipment_Payment_Maintain',  function (req, res, next) {
   console.log("Call Product_Shipment_Payment_Maintain Api:",req.body);

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
         req.body.Date = req.body.Date ? `'${req.body.Date.trim().substring(0,10)}'` : `'${moment().format('YYYY/MM/DD')}'`;
         req.body.Apply_Date = req.body.Apply_Date ? `'${req.body.Apply_Date.trim().substring(0,10)}'` : `'${moment().format('YYYY/MM/DD')}'`;         

         strSQL += format(`
            Insert [dbo].[Money] (Accounting_Item_No, [BankID], [Currency]
               , [Subject], Bad_Debt
               , [CustomerID], [Date], [Apply_Date]
               , UserID, Data_Updater, Data_Update)
            Select 2122 as [Accounting_Item_No], {BankID} as [BankID], {Currency} as [Currency]
               , 'PDSP PAY' as Subject, 0 as Bad_Debt
               , case when {CustomerID} = '' then (Select top 1 Factory_SubID From Factory_Sub Where FactoryID = 'PTPH') else {CustomerID} end as [CustomerID]
               , {Date} as [Date], {Apply_Date} as [Apply_Date]
               , N'${req.UserID}' as UserID, N'${req.UserID}' as Data_Updater, GetDate() as Data_Update
            
            Set @ROWCOUNT = @@ROWCOUNT;
            Set @MoneyID = scope_identity();
         `, req.body);
      break;
      case 1:
         switch(req.body.Name){
            case 'Date':
            case 'Apply_Date':
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
            default:
            break;
         }
         req.body.Value = Size == 0 ? (req.body.Value != '' ? req.body.Value : null) : (req.body.Value ? `N'${req.body.Value.trim().replace(/'/g, "''")}'` : `''`);

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

//Maintain Product Shipment Payment Detail
router.post('/Product_Shipment_Payment_Detail_Maintain',  function (req, res, next) {
   console.log("Call Product_Shipment_Payment_Detail_Maintain Api:",req.body);

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

         req.body.Shipment_No.forEach((item)=>{
            strSQL1 += format(`Insert into @tmpDetail (Source_No) values (N'{Shipment_No}');`,item)
         })

         strSQL += format(`
         Declare @tmpDetail Table (Source_No varchar(20))

         ${strSQL1}

         Insert [dbo].[Money_Source] (MoneyID, Subject, Source_No, Days, Deposit, Withdrawal)
         Select {MoneyID} as MoneyID, 'PDSP PAY' as Subject, tmp.Source_No , 0 as Days, 0 as Deposit, (isnull(p.Pay_Amount ,0) - isnull(p.Paid_Amount,0)) as Withdrawal
         From @tmpDetail tmp
         Inner Join PDSP p with(NoLock,NoWait) on tmp.Source_No = p.Shipment_No
         Inner Join Money m with(NoLock,NoWait) on p.FactoryID = m.CustomerID And p.PO_Currency = m.Currency And m.MoneyID = {MoneyID}
         Left Outer Join (
            Select distinct d.Source_No 
            From Money_Source m with(NoLock, NoWait)
            Inner Join @tmpDetail d on d.Source_No = m.Source_No
            Where m.MoneyID = {MoneyID}
         ) t on t.Source_No = p.Shipment_No
         Where t.Source_No is null
         And isnull(p.Pay_Amount, 0) - isnull(p.Paid_Amount,0) > 0
        
         Set @ROWCOUNT = @@ROWCOUNT;          
         `, req.body);

      break;
      case 1:
         
         switch(req.body.Name){
            case 'Withdrawal':

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
            Delete From [dbo].[Money_Source]
            where Money_SourceID = {Money_SourceID}
                                    
            Set @ROWCOUNT = @@ROWCOUNT;
         `, req.body);
      break;
        
   }

   strSQL += format(`
   Select @ROWCOUNT as Flag;

   if(@ROWCOUNT > 0)
   Begin
      Declare @Withdrawal float = isnull((Select sum(m.Withdrawal) From Money_Source m Where m.MoneyID = {MoneyID}),0) 
      , @Expense float = isnull((Select sum(me.Withdrawal) From Money_Expense me Where me.MoneyID = {MoneyID}),0)
   
      Update [dbo].[Money] Set UserID = isnull(UserID, N'${req.UserID}')
      , Data_Updater = N'${req.UserID}'
      , Data_Update = GetDate()      
      , Withdrawal = Round((@Withdrawal + @Expense) ,3)
      , Source_Amount = Round(@Withdrawal,3)
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

//Maintain Product Shipment Payment Expense
router.post('/Product_Shipment_Payment_Expense_Maintain',  function (req, res, next) {
   console.log("Call Product_Shipment_Payment_Expense_Maintain Api:",req.body);

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

   if(@ROWCOUNT > 0)
   Begin
      Declare @Withdrawal float = isnull((Select sum(m.Withdrawal) From Money_Source m Where m.MoneyID = {MoneyID}),0) 
      , @Expense float = isnull((Select sum(me.Withdrawal) From Money_Expense me Where me.MoneyID = {MoneyID}),0)
   
      Update [dbo].[Money] Set UserID = isnull(UserID, N'${req.UserID}')
      , Data_Updater = N'${req.UserID}'
      , Data_Update = GetDate()      
      , Withdrawal = Round((@Withdrawal + @Expense) ,3)
      , Source_Amount = Round(@Withdrawal,3)
      where MoneyID = {MoneyID};
   End
   `, req.body);
   //console.log(strSQL)
   db.sql(req.SiteDB, strSQL)
      .then((result) => {
         console.log(result.recordsets[1])
         res.send({Flag:result.recordsets[0][0].Flag > 0});
      }).catch((err) => {
         console.log(err);
         res.status(500).send(err);
      })

});

//Get Product Shipment Payment Detail Add List
router.post('/Product_Shipment_Payment_Detail_Add_List',  function (req, res, next) {
console.log("Call Product_Shipment_Payment_Detail_Add_List Api:",req.body);  

req.body.MoneyID = req.body.MoneyID ? req.body.MoneyID : null;
req.body.FactoryID = req.body.FactoryID ? `N'${req.body.FactoryID.trim().replace(/'/g, "''")}'` : `''`;
req.body.Currency = req.body.Currency ? `N'${req.body.Currency.trim().replace(/'/g, "''")}'` : `''`;
req.body.Shipment_No = req.body.Shipment_No ? `N'${req.body.Shipment_No.trim().replace(/'/g, "''")}'` : `''`;
req.body.F_ETD = req.body.F_ETD ? `'${req.body.F_ETD.trim().replace(/'/g, "''")}'` : `''`;
req.body.Brand = req.body.Brand ? `N'${req.body.Brand.trim().replace(/'/g, "''")}'` : `''`;
req.body.CustomerID = req.body.CustomerID ? `N'${req.body.CustomerID.trim().replace(/'/g, "''")}'` : `''`;
req.body.Season = req.body.Season ? `N'${req.body.Season.trim().replace(/'/g, "''")}'` : `''`;


var strSQL = format(`
Declare @tmpDetail table(Shipment_No varchar(18))
Insert @tmpDetail
Select distinct Source_No as Shipment_No
From Money_Source m with(NoLock, NoWait)
Where m.MoneyID = {MoneyID};

Select distinct Top 1000 cast(0 as bit) as flag, '' as Query, rtrim(p.Shipment_No) as Shipment_No, p.Brand, p.CustomerID, p.Season,  convert(nvarchar(10), p.F_ETD,111) as F_ETD
, p.Pay_Amount, p.Paid_Amount, isnull(p.Pay_Amount, 0) - isnull(p.Paid_Amount,0) as Balance_Amount
From PDSP p with(NoLock,NoWait)
Inner Join Money m with(NoLock,NoWait) on p.FactoryID = m.CustomerID And p.PO_Currency = m.Currency And m.MoneyID = {MoneyID}
Left Outer Join @tmpDetail t on t.Shipment_No = p.Shipment_No
Where p.FactoryID = {FactoryID}
And p.Currency = {Currency}
And t.Shipment_No is null
And isnull(p.Pay_Amount, 0) - isnull(p.Paid_Amount,0) > 0
And ({Shipment_No} = '' or p.Shipment_No like {Shipment_No} + '%' )
And ({F_ETD} = '' or convert(varchar(10),p.F_ETD,111) like {F_ETD} + '%' )
And ({Brand} = '' or p.Brand like {Brand} + '%' )
And ({CustomerID} = '' or p.CustomerID like {CustomerID} + '%' )
And ({Season} = '' or p.Season like {Season} + '%' )
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