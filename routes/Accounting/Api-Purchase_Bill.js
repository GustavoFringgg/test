var express = require('express');
var router = express.Router();
const format = require('string-format');
var db = require('../../config/DB_Connect');
const cloneDeep = require('lodash/cloneDeep');
let moment = require('moment');


/* Mark-Wang API Begin */

//Revise AP_Summary
router.post('/Revise_AP_Summary', function (req, res, next) {
   console.log("Call Revise_AP_Summary Api :", req.body);
   req.body.Bill_No = req.body.Bill_No ? `N'${req.body.Bill_No.trim().substring(0,20).replace(/'/g, '')}'` : `''`;
   
   var strSQL = format(` exec Prepare_AP_Summary_New 'HQ','HQ'; exec Prepare_AP_Summary_New 'HQ', 'PH'; exec Prepare_AP_Summary_New 'HQ', 'BM'; exec Prepare_AP_Summary_New 'HQ','HW'exec Prepare_AP_Summary_New 'BM','ERP';
         
   Select 1 as Flag;
   `, req.body);

   //console.log(strSQL);  

   db.sql(req.Enterprise, strSQL)
      .then((result) => {
         res.send({Flag:result.recordset[0].Flag});
      }).catch((err) => {
         console.log(err);
         res.status(500).send(err);
      })

});

//Get Enterprise_Supplier_Account_Payment_Report_Info
router.post('/Enterprise_Supplier_Account_Payment_Report_Info',  function (req, res, next) {
   console.log("Call Enterprise_Supplier_Account_Payment_Report_Info Api:", req.body);

   req.body.Type = req.body.Type != null ? req.body.Type : '0';
   req.body.Term = req.body.Term ? `${req.body.Term.trim().substring(0,7)}` : moment().format('YYYY/MM');
   req.body.Currency = req.body.Currency ? `${req.body.Currency.trim().substring(0,3)}` : `TWD`;
   req.body.SupplierID = req.body.SupplierID ? `${req.body.SupplierID.trim().substring(0,15)}` : ``;

   var strSQL = format(`
   Declare @Type int = {Type}, @Term varchar(10) = '{Term}', @Currency varchar(4) = '{Currency}', @SupplierID Nvarchar(15) = N'{SupplierID}', @OrganizationID varchar(10) = '';
   Declare @StrSQL varchar(Max)
   Declare @Organization table (OrganizationID varchar(10))
   Declare @Bill table (OrganizationID varchar(10), Bill_No nvarchar(20), Currency varchar(4), Stock_In_No int, Purpose varchar(15), L2_Material_Category Nvarchar(35), Source_Amount float, Tax float, Amount float, Rate float, Expense float)

   Insert @Organization
   Select distinct ap.OrganizationID From AP_Summary ap with(NoLock,NoWait) Where ap.TargetID = @SupplierID And ap.Term = @Term

   While((Select count(*) From @Organization) > 0)
   Begin
      Set @OrganizationID = (Select top 1 OrganizationID From @Organization)
      if(@OrganizationID = 'ERP')
      Begin
        Set @StrSQL = ' SELECT distinct '''+@OrganizationID+''' as OrganizationID, b.Bill_No, b.Currency, si.Stock_In_No, isnull(b.Purpose, si.Purpose) as Purpose, m.L2_Material_Category
        , isnull(si.Price,0) as Source_Amount
        , isnull(si.Tax,0) as Tax
        , isnull(si.Price,0)
          + isnull(si.Tax,0)
          + isnull((isnull(si.Price,0) + isnull(si.Tax,0)) / nullif((isnull(b.Source_Amount,0) + isnull(b.Tax,0)),0) ,1) * isnull(b.Expense,0) as Amount
        , isnull((isnull(si.Price,0) + isnull(si.Tax,0)) / nullif((isnull(b.Source_Amount,0) + isnull(b.Tax,0)),0) ,1) as Rate
        , isnull((isnull(si.Price,0) + isnull(si.Tax,0)) / nullif((isnull(b.Source_Amount,0) + isnull(b.Tax,0)),0) ,1) * isnull(b.Expense,0) as Expense
        FROM bm.'+@OrganizationID+'.dbo.Bill b with(NoLock,NoWait)
        LEFT Outer JOIN bm.'+@OrganizationID+'.dbo.Stock_In si with(NoLock,NoWait) ON b.Bill_No = si.Bill_No
        LEFT Outer JOIN bm.'+@OrganizationID+'.dbo.Stock_In_Detail sd with(NoLock,NoWait) ON sd.Stock_In_No = si.Stock_In_No
        LEFT Outer JOIN bm.'+@OrganizationID+'.dbo.Purchase_Detail pd with(NoLock,NoWait) ON sd.Purchase_DetailID = pd.Purchase_DetailID
        LEFT Outer JOIN Material m with(NoLock,NoWait) ON m.MaterialID = pd.MaterialID
        WHERE (isnull(b.Purpose, si.Purpose) <> ''Adjust'')
        And b.SupplierID = '''+@SupplierID+'''
        And ('+cast(@Type as varchar)+' = 2 or case when isnull(b.IsAtSight,0) = 1 or b.Subject = ''Purchase Prepay'' then 1 else 0 end = '+cast(@Type as varchar)+')
        And b.Term = '''+@Term+'''
        --And b.Currency = '''+@Currency+''''
      End 
      else
      Begin
        Set @StrSQL = ' SELECT distinct '''+@OrganizationID+''' as OrganizationID, b.Bill_No, b.Currency, si.Stock_In_No, isnull(b.Purpose, si.Purpose) as Purpose, m.L2_Material_Category
        , isnull(si.Price,0) as Source_Amount
        , isnull(si.Tax,0) as Tax
        , isnull(si.Price,0)
          + isnull(si.Tax,0)
          + isnull((isnull(si.Price,0) + isnull(si.Tax,0)) / nullif((isnull(b.Source_Amount,0) + isnull(b.Tax,0)),0) ,1) * isnull(b.Expense,0) as Amount
        , isnull((isnull(si.Price,0) + isnull(si.Tax,0)) / nullif((isnull(b.Source_Amount,0) + isnull(b.Tax,0)),0) ,1) as Rate
        , isnull((isnull(si.Price,0) + isnull(si.Tax,0)) / nullif((isnull(b.Source_Amount,0) + isnull(b.Tax,0)),0) ,1) * isnull(b.Expense,0) as Expense
        FROM HQ.'+@OrganizationID+'.dbo.Bill b with(NoLock,NoWait)
        LEFT Outer JOIN HQ.'+@OrganizationID+'.dbo.Stock_In si with(NoLock,NoWait) ON b.Bill_No = si.Bill_No
        LEFT Outer JOIN HQ.'+@OrganizationID+'.dbo.Stock_In_Detail sd with(NoLock,NoWait) ON sd.Stock_In_No = si.Stock_In_No
        LEFT Outer JOIN HQ.'+@OrganizationID+'.dbo.Purchase_Detail pd with(NoLock,NoWait) ON sd.Purchase_DetailID = pd.Purchase_DetailID
        LEFT Outer JOIN Material m with(NoLock,NoWait) ON m.MaterialID = pd.MaterialID
        WHERE (isnull(b.Purpose, si.Purpose) <> ''Adjust'')
        And b.SupplierID = '''+@SupplierID+'''
        And ('+cast(@Type as varchar)+' = 2 or case when isnull(b.IsAtSight,0) = 1 or b.Subject = ''Purchase Prepay'' then 1 else 0 end = '+cast(@Type as varchar)+')
        And b.Term = '''+@Term+'''
        --And b.Currency = '''+@Currency+''''
      End
        --Select @StrSQL
      Insert @Bill
      exec(@StrSQL)

      Delete From @Organization where OrganizationID = @OrganizationID
   End

   ---0 Bill Info--
   Select case b.OrganizationID when 'HQ' then 0
   when 'PH' then 1
   when 'HW' then 2
   when 'BM' then 3 
   when 'ERP' then 4
   end as SortID
   , b.OrganizationID, b.Bill_No, b.Currency, b.Purpose
   , sum(b.Source_Amount) as Source_Amount
   , sum(b.Tax) as Tax
   , sum(b.Amount) as Amount
   , cast(sum(b.Rate) as decimal(6,5)) as Rate
   , cast(sum(b.Expense) as decimal(16,2)) as Expense
   from (Select distinct OrganizationID, Bill_No, Currency, Stock_In_No, Purpose, Source_Amount, Tax, Amount, Rate, Expense From @Bill ) b
   Group by b.OrganizationID, b.Bill_No, b.Currency, b.Purpose
   Order by SortID, b.Currency;

   ---1 Currency_Rate--
   Select c.Currency, c.Currency_Rate, cr.Currency_Symbol
   from [@Currency_Rate] c with(NoLock,NoWait)
   Inner Join [Currency] cr with(NoLock, NoWait) on c.Currency = cr.Currency
   Where c.Exchange_Date = cast(GetDate() as Date);

   ---2 Supplier Info--
   Select 0 as Expense, 0 as Source_Amount, 0 as Tax, 0 as Total_Amount
   , AccountID, Uni_Tax_Code, Payment_Terms, Sample_Discount, Supply_Product
   from [Supplier] s with(NoLock,NoWait)
   Where s.SupplierID = @SupplierID;
   `, req.body) ;
//console.log(strSQL)
  
   db.sql(req.Enterprise, strSQL)
      .then((result) => {
         var DataSet = {Report_Info: result.recordsets[0]
            , Currency_Info: []
            , Grand_Total_Info: result.recordsets[2]            
            , Currency_Rate: result.recordsets[1]
         };

         // Currency_Info
         DataSet.Currency_Info = [...DataSet.Report_Info.reduce((r, e) => {
            let k = `${e.Currency}`;
            if (!r.has(k)) {
              // console.log(r)
              r.set(k, { Currency: e.Currency,
               G_Expense: e.Expense,
               G_Source_Amount: e.Source_Amount,
               G_Tax: e.Tax,
               G_Amount: e.Amount,
              })
            } else {
               r.get(k).G_Expense += e.Expense;
               r.get(k).G_Source_Amount += e.Source_Amount;
               r.get(k).G_Tax += e.Tax;
               r.get(k).G_Amount += e.Amount ;
            }
            return r;
          }, new Map).values()]

         DataSet.Currency_Info.forEach((item,idx)=>{            
            var Currency_Rate = (result.recordsets[1].filter((obj)=>(item.Currency == obj.Currency))).map((obj)=>(obj.Currency_Rate))

            item.G_Expense = Math.round(item.G_Expense * 100)/100;
            item.G_Source_Amount = Math.round(item.G_Source_Amount * 100)/100;
            item.G_Tax = Math.round(item.G_Tax * 100)/100;            
            item.G_Amount = Math.round((item.G_Amount) * 100)/100;
         
            DataSet.Grand_Total_Info[0].Expense += item.G_Expense * Currency_Rate;
            DataSet.Grand_Total_Info[0].Source_Amount += item.G_Source_Amount * Currency_Rate;
            DataSet.Grand_Total_Info[0].Tax += item.G_Tax * Currency_Rate;
            DataSet.Grand_Total_Info[0].Total_Amount += item.G_Amount * Currency_Rate;
         }) 

         DataSet.Grand_Total_Info.forEach((item)=>{
            item.Expense = Math.round(item.Expense * 100)/100;
            item.Source_Amount = Math.round(item.Source_Amount * 100)/100;
            item.Tax = Math.round(item.Tax * 100)/100;
            item.Total_Amount = Math.round(item.Total_Amount * 100)/100;
         })

         res.send(DataSet);
      }).catch((err) => {
         console.log(err);
         res.status(500).send(err);
      })

});

//Get Enterprise_Account_Payment_Report_Info
router.post('/Enterprise_Account_Payment_Report_Info',  function (req, res, next) {
   console.log("Call Enterprise_Account_Payment_Report_Info Api:", req.body);

   req.body.Type = req.body.Type != null ? req.body.Type : '0';
   req.body.Term = req.body.Term ? `${req.body.Term.trim().substring(0,7)}` : moment().format('YYYY/MM');
   req.body.Currency = req.body.Currency ? `${req.body.Currency.trim().substring(0,3)}` : `TWD`;

   var strSQL = format(`
   Declare @Term varchar(10) = '{Term}', @Currency varchar(4) = '{Currency}';

   SELECT 
   s.AccountID
   , s.SupplierID
   , sum(isnull(HQ,0)) as HQ
   , sum(isnull(PH,0)) as PH
   , sum(isnull(HW,0)) as HW
   , sum(isnull(BM,0)) as BM
   , sum(isnull(ERP,0)) as ERP
   , sum(isnull(HQ,0) + isnull(PH,0) + isnull(HW,0) + isnull(BM,0) + isnull(ERP,0)) - sum(Tax) as AP_Amount
   , sum(Tax) as Tax
   , sum(isnull(HQ,0) + isnull(PH,0) + isnull(HW,0) + isnull(BM,0) + isnull(ERP,0)) as Total_Amount
   FROM  
   (
     SELECT OrganizationID, TargetID, Amount, Tax
     FROM [ENTERPRISE].[dbo].[AP_Summary]
     Where ({Type} = 2 or Type = {Type})
     And Term = @Term
     And Currency = @Currency
     And (Amount <> 0 or Tax <> 0)
   ) AS tmp  
   PIVOT  
   (  
     Sum(Amount) 
     FOR OrganizationID IN (HQ, PH, HW, BM, ERP)  
   ) AS PivotTable
   Inner Join Supplier s with(NoLock,NoWait) on PivotTable.TargetID = s.SupplierID
   Group by s.AccountID, s.SupplierID
   
   Select Currency_Rate 
   from [@Currency_Rate] c with(NoLock,NoWait)
   Where c.Currency = @Currency
   And c.Exchange_Date = cast(GetDate() as Date)

   `, req.body) ;
//console.log(strSQL)
  
   db.sql(req.Enterprise, strSQL)
      .then((result) => {
         var DataSet = {Report_Info: result.recordsets[0]
            , Grand_Total_Info: [{HQ:0, PH:0, HW:0, BM:0, AP_Amount:0, Tax:0, Total_Amount:0}]
            , NT_Grand_Total_Info: []
            , Currency_Rate: result.recordsets[1][0].Currency_Rate
         };

         DataSet.Report_Info.forEach((item,idx)=>{
            item.RecNo = idx+1;
            item.HQ = Math.round(item.HQ * 100)/100;
            item.PH = Math.round(item.PH * 100)/100;
            item.HW = Math.round(item.HW * 100)/100;
            item.BM = Math.round(item.BM * 100)/100;
            item.AP_Amount = Math.round(item.AP_Amount * 100)/100;
            item.Tax = Math.round(item.Tax * 100)/100;
            item.Total_Amount = Math.round(item.Total_Amount * 100)/100;

            DataSet.Grand_Total_Info[0].HQ += item.HQ;
            DataSet.Grand_Total_Info[0].PH += item.PH;
            DataSet.Grand_Total_Info[0].HW += item.HW;
            DataSet.Grand_Total_Info[0].BM += item.BM;
            DataSet.Grand_Total_Info[0].AP_Amount += item.AP_Amount;
            DataSet.Grand_Total_Info[0].Tax += item.Tax;
            DataSet.Grand_Total_Info[0].Total_Amount += item.Total_Amount;
         }) 

         if(req.body.Currency != 'TWD') {
            var DataItem = {HQ:0, PH:0, HW:0, BM:0, AP_Amount:0, Tax:0, Total_Amount:0};
            DataSet.Grand_Total_Info.forEach((item)=>{
               DataItem.HQ = Math.round(item.HQ * DataSet.Currency_Rate * 100)/100;
               DataItem.PH = Math.round(item.PH * DataSet.Currency_Rate * 100)/100;
               DataItem.HW = Math.round(item.HW * DataSet.Currency_Rate * 100)/100;
               DataItem.BM = Math.round(item.BM * DataSet.Currency_Rate * 100)/100;
               DataItem.AP_Amount = Math.round(item.AP_Amount * DataSet.Currency_Rate * 100)/100;
               DataItem.Tax = Math.round(item.Tax * DataSet.Currency_Rate * 100)/100;
               DataItem.Total_Amount = Math.round(item.Total_Amount * DataSet.Currency_Rate * 100)/100;
            })
            DataSet.NT_Grand_Total_Info.push(DataItem)
         }

         res.send(DataSet);
      }).catch((err) => {
         console.log(err);
         res.status(500).send(err);
      })

});

//Get AP_Summary Term
router.post('/AP_Summary_Term',  function (req, res, next) {
   console.log("Call AP_Summary_Term Api:", req.body);

   var strSQL = format(`
   SELECT distinct Term
   FROM [ENTERPRISE].[dbo].[AP_Summary]
   Where Amount > 0 
   Order by Term desc
   `, req.body) ;
//console.log(strSQL)
  
   db.sql(req.Enterprise, strSQL)
      .then((result) => {         
         res.send({Term: result.recordsets[0]});
      }).catch((err) => {
         console.log(err);
         res.status(500).send(err);
      })

});

//Get Enterprise_Account_Payment_Summary_Report_Info
router.post('/Enterprise_Account_Payment_Summary_Report_Info',  function (req, res, next) {
   console.log("Call Enterprise_Account_Payment_Summary_Report_Info Api:", req.body);

   req.body.Type = req.body.Type != null ? req.body.Type : '0';
   req.body.Term = req.body.Term ? `${req.body.Term.trim().substring(0,7)}` : moment().format('YYYY/MM');

   var strSQL = format(`
   Declare @Term varchar(10) = '{Term}';  
   --0 Report 
   SELECT 
   Currency
   , sum(isnull(HQ,0)) as HQ
   , sum(isnull(PH,0)) as PH
   , sum(isnull(HW,0)) as HW
   , sum(isnull(BM,0)) as BM
   , sum(isnull(ERP,0)) as ERP
   , sum(isnull(HQ,0) + isnull(PH,0) + isnull(HW,0) + isnull(BM,0) + isnull(ERP,0)) as Total_Amount
   FROM  
   (
      SELECT OrganizationID, Currency, Amount
      FROM [ENTERPRISE].[dbo].[AP_Summary]
      Where ({Type} = 2 or Type = {Type})
      And Term = @Term  
      And (Amount <> 0 or Tax <> 0)
   ) AS tmp  
   PIVOT  
   (  
      Sum(Amount) 
      FOR OrganizationID IN (HQ, PH, HW, BM, ERP)  
   ) AS PivotTable
   Group by Currency

   --1 Report
   SELECT 
   Currency
   , sum(isnull([01],0)) as [01]
   , sum(isnull([02],0)) as [02]
   , sum(isnull([03],0)) as [03]
   , sum(isnull([04],0)) as [04]
   , sum(isnull([05],0)) as [05]
   , sum(isnull([06],0)) as [06]
   , sum(isnull([07],0)) as [07]
   , sum(isnull([08],0)) as [08]
   , sum(isnull([09],0)) as [09]
   , sum(isnull([10],0)) as [10]
   , sum(isnull([11],0)) as [11]
   , sum(isnull([12],0)) as [12]
   , sum(isnull([01],0) + isnull([02],0) + isnull([03],0) + isnull([04],0) + isnull([05],0) + isnull([06],0) + isnull([07],0) + isnull([08],0) + isnull([09],0) + isnull([10],0) + isnull([11],0) + isnull([12],0)) as Total_Amount
   FROM  
   (
      SELECT substring(Term,6,2) as [Month], Currency, Amount
      FROM [ENTERPRISE].[dbo].[AP_Summary]
      Where ({Type} = 2 or Type = {Type})
      And substring(Term,1,4) = substring(@Term,1,4)
      And (Amount <> 0 or Tax <> 0)
   ) AS tmp  
   PIVOT  
   (  
      Sum(Amount) 
      FOR [Month] IN ([01], [02], [03], [04], [05], [06], [07], [08], [09], [10], [11], [12])  
   ) AS PivotTable
   Group by Currency;

   --2 Currency 
   Select cr.Currency, cr.Currency_Rate, c.Currency_Symbol, c.zh_tw
   from [@Currency_Rate] cr with(NoLock,NoWait)
   Inner Join Currency c with(NoLock,NoWait) on c.Currency = cr.Currency
   Where cr.Exchange_Date = cast(GetDate() as Date);
   `, req.body) ;
//console.log(strSQL)
  
   db.sql(req.Enterprise, strSQL)
      .then((result) => {
         var DataSet = {Report_Info: result.recordsets[0]
            , Monthly_Report_Info: result.recordsets[1]
            , Report_NT_Grand_Total: 0
            , Monthly_NT_Grand_Total: [{'01':0, '02':0, '03':0, '04':0, '05':0, '06':0, '07':0, '08':0, '09':0, '10':0, '11':0, '12':0, Total_Amount:0}]
         };

         DataSet.Report_Info.forEach((item,idx)=>{
            var DataItem =  result.recordsets[2].filter((obj)=>(item.Currency == obj.Currency))
            item.Total_Amount = Math.round(item.Total_Amount * 100)/100;
            item.NT_Total_Amount = Math.round((item.Total_Amount * DataItem[0].Currency_Rate) * 100)/100;
            item.Currency_Rate = DataItem[0].Currency_Rate;
            item.Currency_Symbol = DataItem[0].Currency_Symbol;
            item.zh_tw = DataItem[0].zh_tw;
            DataSet.Report_NT_Grand_Total += item.NT_Total_Amount;
         }) 
         
         DataSet.Monthly_Report_Info.forEach((item,idx)=>{            
            var DataItem =  result.recordsets[2].filter((obj)=>(item.Currency == obj.Currency))
            item.Total_Amount = Math.round(item.Total_Amount * 100)/100;
            item.NT_Total_Amount = Math.round((item.Total_Amount * DataItem[0].Currency_Rate) * 100)/100;
            item.Currency_Rate = DataItem[0].Currency_Rate;
            item.Currency_Symbol = DataItem[0].Currency_Symbol;
            item.zh_tw = DataItem[0].zh_tw;
            DataSet.Monthly_NT_Grand_Total[0]['01'] += Math.round(item['01'] * item.Currency_Rate * 100)/100;
            DataSet.Monthly_NT_Grand_Total[0]['02'] += Math.round(item['02'] * item.Currency_Rate * 100)/100;
            DataSet.Monthly_NT_Grand_Total[0]['03'] += Math.round(item['03'] * item.Currency_Rate * 100)/100;
            DataSet.Monthly_NT_Grand_Total[0]['04'] += Math.round(item['04'] * item.Currency_Rate * 100)/100;
            DataSet.Monthly_NT_Grand_Total[0]['05'] += Math.round(item['05'] * item.Currency_Rate * 100)/100;
            DataSet.Monthly_NT_Grand_Total[0]['06'] += Math.round(item['06'] * item.Currency_Rate * 100)/100;
            DataSet.Monthly_NT_Grand_Total[0]['07'] += Math.round(item['07'] * item.Currency_Rate * 100)/100;
            DataSet.Monthly_NT_Grand_Total[0]['08'] += Math.round(item['08'] * item.Currency_Rate * 100)/100;
            DataSet.Monthly_NT_Grand_Total[0]['09'] += Math.round(item['09'] * item.Currency_Rate * 100)/100;
            DataSet.Monthly_NT_Grand_Total[0]['10'] += Math.round(item['10'] * item.Currency_Rate * 100)/100;
            DataSet.Monthly_NT_Grand_Total[0]['11'] += Math.round(item['11'] * item.Currency_Rate * 100)/100;
            DataSet.Monthly_NT_Grand_Total[0]['12'] += Math.round(item['12'] * item.Currency_Rate * 100)/100;
            DataSet.Monthly_NT_Grand_Total[0].Total_Amount += item.NT_Total_Amount;
         }) 


         res.send(DataSet);
      }).catch((err) => {
         console.log(err);
         res.status(500).send(err);
      })

});

//Revise Bill Amount
router.post('/Revise_Bill_Amount', function (req, res, next) {
   console.log("Call Revise_Bill_Amount Api :", req.body);
   req.body.Bill_No = req.body.Bill_No ? `N'${req.body.Bill_No.trim().substring(0,20).replace(/'/g, '')}'` : `''`;
   
   var strSQL = format(` Declare @Bill_No nvarchar(20) = {Bill_No};
      
   ${format(UpDate_Amount_SQL)}
         
   Select @@ROWCOUNT as Flag;
   `, req.body);

   //console.log(strSQL);  

   db.sql(req.SiteDB, strSQL)
      .then((result) => {
         res.send({Flag:result.recordset[0].Flag});
      }).catch((err) => {
         console.log(err);
         res.status(500).send(err);
      })

});

//Get Purchase_Invoice_List
router.post('/Purchase_Invoice_List',  function (req, res, next) {
   console.log("Call Purchase_Invoice_List Api:", req.body);
  
   req.body.Invoice_No = req.body.Invoice_No ? `${req.body.Invoice_No.trim().substring(0,20).replace(/'/g, '')}` : ``;
   req.body.Date_From = req.body.Date_From ? `${req.body.Date_From.trim().substring(0,10).replace(/'/g, '')}` : ``;
   req.body.Date_To = req.body.Date_To ? `${req.body.Date_To.trim().substring(0,10).replace(/'/g, '')}` : ``;
   req.body.Invoice_Price = req.body.Invoice_Price ? req.body.Invoice_Price : '';
   req.body.Tax = req.body.Tax ? req.body.Tax : '';   
   req.body.Bill_No = req.body.Bill_No ? `${req.body.Bill_No.trim().substring(0,20).replace(/'/g, '')}` : ``;
   req.body.Paid_Amount = req.body.Paid_Amount ? req.body.Paid_Amount : '';
   
   var strSQL = format(`
   SELECT Top 1000 pi.Invoice_No
   , CONVERT (varchar(10), pi.Invoice_Date, 111) AS Invoice_Date
   , pi.Invoice_Price
   , pi.Tax
   , b.Bill_No
   , b.Paid_Amount
   , b.UserID
   , b.Funds_RequestID
   FROM Purchase_Invoice pi with(NoLock,NoWait)
   Inner Join Bill b with(NoLock,NoWait) on pi.Bill_No = b.Bill_No
   Where 1=1
   And b.Funds_RequestID is null
   And (N'{Invoice_No}' = '' or pi.Invoice_No like N'%{Invoice_No}%')
   And ((N'{Date_From}' = '' or N'{Date_To}' = '') or convert(date, pi.Invoice_Date,111) between N'{Date_From}' And N'{Date_To}')
   And (N'{Tax}' = '' or cast(pi.Tax as Varchar) LIKE N'%{Tax}%')
   And (N'{Invoice_Price}' = '' or cast(pi.Invoice_Price as Varchar) LIKE N'%{Invoice_Price}%')
   And (N'{Tax}' = '' or cast(pi.Tax as Varchar) LIKE N'%{Tax}%')
   And (N'{Bill_No}' = '' or b.Bill_No like N'%{Bill_No}%')
   And (N'{Paid_Amount}' = '' or cast(ISNULL(b.Paid_Amount,0) as decimal(20,2)) LIKE N'%{Paid_Amount}%')
   Order by Bill_No desc
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

//Check Bill_No
router.post('/Check_Bill_No',  function (req, res, next) {
   console.log("Call Check_Bill_No Api:",req.body);

   req.body.Bill_No = req.body.Bill_No ? `${req.body.Bill_No.trim().replace(/'/g, '')}` : '';

   var strSQL = format(` Declare @RecCount int, @LenCounter int;
   Set @LenCounter = Len(N'{Bill_No}');

   SELECT @RecCount = Count(*)
   FROM [dbo].[Bill] With(Nolock,NoWait)
   where ([Bill_No] = N'{Bill_No}');

   Select case when @LenCounter > 20 then @LenCounter else @RecCount end as RecCount;
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

//Get Purchase_Bill_List
router.post('/Purchase_Bill_List',  function (req, res, next) {
   console.log("Call Purchase Bill List Api:", req.body);
  
   req.body.Bill_No = req.body.Bill_No ? `${req.body.Bill_No.trim().substring(0,20).replace(/'/g, '')}` : ``;
   req.body.Type = req.body.Type ? req.body.Type : 0;
   req.body.Date_From = req.body.Date_From ? `${req.body.Date_From.trim().substring(0,10).replace(/'/g, '')}` : ``;
   req.body.Date_To = req.body.Date_To ? `${req.body.Date_To.trim().substring(0,10).replace(/'/g, '')}` : ``;
   req.body.SupplierID = req.body.SupplierID ? `${req.body.SupplierID.trim().substring(0,15).replace(/'/g, '')}` : ``;
   req.body.Term = req.body.Term ? `${req.body.Term.trim().substring(0,10).replace(/'/g, '')}` : ``;
   req.body.Department = req.body.Department ? `${req.body.Department.trim().substring(0,5).replace(/'/g, '')}` : ``;   
   req.body.Currency = req.body.Currency ? `${req.body.Currency.trim().substring(0,4).replace(/'/g, '')}` : ``;
   req.body.Earlier_Amount = req.body.Earlier_Amount ? req.body.Earlier_Amount : '';
   req.body.Current_Amount = req.body.Current_Amount ? req.body.Current_Amount : '';
   req.body.Postpone_Amount = req.body.Postpone_Amount ? req.body.Postpone_Amount : '';
   req.body.Expense = req.body.Expense ? req.body.Expense : '';
   req.body.Amount = req.body.Amount ? req.body.Amount : '';
   req.body.Tax = req.body.Tax ? req.body.Tax : '';
   req.body.Invoice_Price = req.body.Invoice_Price ? req.body.Invoice_Price : '';
   req.body.Invoice_Tax = req.body.Invoice_Tax ? req.body.Invoice_Tax : '';   
   req.body.Progress_Amount = req.body.Progress_Amount ? req.body.Progress_Amount : '';
   req.body.Paid_Amount = req.body.Paid_Amount ? req.body.Paid_Amount : '';
   req.body.UserID = req.body.UserID ? `${req.body.UserID.trim().substring(0,256).replace(/'/g, '')}` : '';
   
   var strSQL = format(`
   SELECT Bill_No   
   , case when m.Subject = 'Purchase' then '一般採購' else '預付款' end as Subject
   , CONVERT (varchar(20), Bill_Date, 111) AS Bill_Date
   , SupplierID
   , Term   
   , Department
   , Currency
   , Earlier_Amount
   , Current_Amount
   , Postpone_Amount
   , Expense
   , Amount
   , Tax
   , Invoice_Price
   , Invoice_Tax
   , [Progress_Amount]
   , Paid_Amount
   , [Funds_RequestID]
   , UserID
   , Data_Updater
   , CONVERT (varchar(20), Data_Update, 111) AS Data_Update
   , case when isnull(m.[Reconciled_User],'') = '' then 0 else 1 end as Reconciled
   , m.[Reconciled_User]
   , m.[Reconciled_Date]
   FROM Bill m with(NoLock,NoWait)
   Where 1=1
   --AND (Subject = 'Purchase')
   And (N'{Bill_No}' = '' or Bill_No like N'%{Bill_No}%')
   --And (N'{Subject}' = '' or (case when m.Subject = 'Purchase' then '一般採購' else '預付款' end) like N'%{Subject}%')
   And ({Type} = 2 or ((case When m.Subject = 'Purchase Prepay' then 1 else isnull(m.IsAtSight,0) end) = {Type}) )
   And ((N'{Date_From}' = '' or N'{Date_To}' = '') or convert(date, [Bill_Date],111) between N'{Date_From}' And N'{Date_To}')
   And (N'{SupplierID}' = '' or SupplierID like N'%{SupplierID}%')
   And (N'{Term}' = '' or Term like N'{Term}%')
   And (N'{Department}' = '' or Department like N'%{Department}%')
   And (N'{Currency}' = '' or Currency like N'%{Currency}%')
   And (N'{Earlier_Amount}' = '' or cast(ISNULL(m.Earlier_Amount,0) as decimal(20,2)) LIKE N'%{Earlier_Amount}%')
   And (N'{Current_Amount}' = '' or cast(ISNULL(m.Current_Amount,0) as decimal(20,2)) LIKE N'%{Current_Amount}%')
   And (N'{Postpone_Amount}' = '' or cast(ISNULL(m.Postpone_Amount,0) as decimal(20,2)) LIKE N'%{Postpone_Amount}%')
   And (N'{Expense}' = '' or cast(ISNULL(m.Expense,0) as decimal(20,2)) LIKE N'%{Expense}%')
   And (N'{Amount}' = '' or cast(ISNULL(m.Amount,0) as decimal(20,2)) LIKE N'%{Amount}%')
   And (N'{Tax}' = '' or cast(ISNULL(m.Tax,0) as decimal(20,2)) LIKE N'%{Tax}%')
   And (N'{Invoice_Price}' = '' or cast(ISNULL(m.Invoice_Price,0) as decimal(20,2)) LIKE N'%{Invoice_Price}%')
   And (N'{Invoice_Tax}' = '' or cast(ISNULL(m.Invoice_Tax,0) as decimal(20,2)) LIKE N'%{Invoice_Tax}%')
   And (N'{Progress_Amount}' = '' or cast(ISNULL(m.Progress_Amount,0) as decimal(20,2)) LIKE N'%{Progress_Amount}%')
   And (N'{Paid_Amount}' = '' or cast(ISNULL(m.Paid_Amount,0) as decimal(20,2)) LIKE N'%{Paid_Amount}%')
   And (N'{UserID}' = '' or m.UserID like N'%{UserID}%')
   Order by Bill_No desc

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
               Total_Earlier_Amount: e.Earlier_Amount,
               Total_Current_Amount: e.Current_Amount,
               Total_Postpone_Amountt: e.Postpone_Amount,
               Total_Expense: e.Expense,
               Total_Amount: e.Amount,
               Total_Tax: e.Tax,
               Total_Invoice_Price: e.Invoice_Price,
               Total_Invoice_Tax: e.Invoice_Tax,
               Total_Progress_Amount: e.Progress_Amount,
               Total_Paid_Amount: e.Paid_Amount,
              })
            } else {
               r.get(k).Total_Earlier_Amount += e.Earlier_Amount;
               r.get(k).Total_Current_Amount += e.Current_Amount;
               r.get(k).Total_Postpone_Amountt += e.Postpone_Amount;
               r.get(k).Total_Expense += e.Expense;
               r.get(k).Total_Amount += e.Amount;
               r.get(k).Total_Tax += e.Tax;
               r.get(k).Total_Invoice_Price += e.Invoice_Price;
               r.get(k).Total_Invoice_Tax += e.Invoice_Tax;
               r.get(k).Total_Progress_Amount += e.Progress_Amount;
               r.get(k).Total_Paid_Amount += e.Paid_Amount;
            }
            return r;
          }, new Map).values()]

          DataSet.Currency_Info.forEach((item)=>{
            item.Total_Earlier_Amount = Math.round(item.Total_Earlier_Amount * 10000)/10000;
            item.Total_Current_Amount = Math.round(item.Total_Current_Amount * 10000)/10000;
            item.Total_Postpone_Amountt = Math.round(item.Total_Postpone_Amountt * 10000)/10000;
            item.Total_Expense = Math.round(item.Total_Expense * 10000)/10000;
            item.Total_Amount = Math.round(item.Total_Amount * 10000)/10000;
            item.Total_Tax = Math.round(item.Total_Tax * 10000)/10000;
            item.Total_Invoice_Price = Math.round(item.Total_Invoice_Price * 10000)/10000;
            item.Total_Invoice_Tax = Math.round(item.Total_Invoice_Tax * 10000)/10000;
            item.Total_Progress_Amount = Math.round(item.Total_Progress_Amount * 10000)/10000;
            item.Total_Paid_Amount = Math.round(item.Total_Paid_Amount * 10000)/10000;
         }) 

         res.send(DataSet);
      }).catch((err) => {
         console.log(err);
         res.status(500).send(err);
      })

});

//Get Purchase_Bill_Info
router.post('/Purchase_Bill_Info',  function (req, res, next) {
   console.log("Call Purchase_Bill_Info Api:",req.body);
 
   req.body.Bill_No = req.body.Bill_No ? `N'${req.body.Bill_No.trim().substring(0,20).replace(/'/g, '')}'` : `''`;
   req.body.Mode = req.body.Mode ? req.body.Mode : 0;
 
   //Mode == 0 Get Bill, Bill Expense And Purchase Invoice
   //Mode == 1 Get Bill Data
   //Mode == 2 Get Stock In Data
   //Mode == 3 Get Bill Expense Data
   //Mode == 4 Get Purchase Invoice Data
   //Mode == 5 Get Money_Source Data
      
   var strSQL = format(`
   Declare @Mode int = {Mode};
 
   if(@Mode = 0 or @Mode = 1)
   Begin
      SELECT [Bill_No]      
      , case when b.Subject = 'Purchase' then '一般採購' else '預付款' end as Subject
      , Convert(varchar(20), [Bill_Date],111) as [Bill_Date]
      , isnull(b.Purpose,'') as Purpose
      , b.[SupplierID]      
      , isnull(s.Uni_Tax_Code,'') as Uni_Tax_Code
      , isnull(s.Payment_Terms,'') as Payment_Terms
      , isnull(cast(s.Sample_Discount as nvarchar),'') as Sample_Discount   
      , case when ABS(isnull(b.[IsAtSight],0)) > 0 then 1 else 0 end as IsAtSight
      , [Term]
      , [Department]
      , b.[Currency]
      , c.Currency_Symbol
      , [Earlier_Amount]
      , [Current_Amount]
      , [Postpone_Amount]
      , [Source_Amount]
      , [Tax]
      , [Expense]
      , [Invoice_Price]
      , [Invoice_Tax]
      , [ITax_Dicount]
      , [Amount]
      , isnull([Progress_Amount],0) as Progress_Amount
      , isnull([Paid_Amount],0) as Paid_Amount
      , [Funds_RequestID]
      , [Description]      
      , Convert(varchar(20), [Delivery_Date],111) as [Delivery_Date]      
      , Convert(varchar(20), [Est_Pay_Date],111) as [Est_Pay_Date]
      , [Order_No]
      , [Other_Fee]
      , case when isnull(b.[Reconciled_User],'') = '' then 0 else 1 end as Reconciled
      , b.[Reconciled_User]
      , b.[Reconciled_Date]
      , b.[UserID]
      , b.[Data_Updater]
      , Convert(varchar(20), b.[Data_Update],111) as [Data_Update]
      FROM Bill b WITH (NoLock, NoWait)
      Inner Join currency c with(NoLock,NoWait) on c.Currency = b.[Currency]
      Left outer Join Supplier s with(nowait,NoLock) on b.SupplierID = s.SupplierID
      WHERE Bill_No = {Bill_No}
   End
   if(@Mode = 0 or @Mode = 2)
   Begin
      SELECT si.Stock_In_No
      , si.Purchase_Project_No
      , si.WarehouseID
      , si.Department
      , si.Purpose
      , iif((Select count(*) 
         From Stock_In_Detail sid 
         Inner Join Purchase_Detail pd on sid.Purchase_DetailID = pd.Purchase_DetailID
         Where sid.Stock_In_No = si.Stock_In_No
         And (isnull(pd.Qty,0) - isnull(pd.Stock_In_Qty,0) > 0)
         And sid.Produce_No is null
         ) +(Select count(*) 
         From Stock_In_Detail sid 
         Inner Join Purchase_Detail_Sub pd on sid.Purchase_DetailID = pd.Purchase_DetailID and sid.Produce_No = pd.Produce_No
         Where sid.Stock_In_No = si.Stock_In_No
         And (isnull(pd.Qty,0) - isnull(pd.In_Qty,0) > 0)
      ) > 0,1,0)as NotIn_Flag
      , Convert(varchar(10), si.Stock_In_Date,111) as Stock_In_Date
      , si.Price
      , si.Tax
      , (Select Purchaser From Purchase_Project pp WITH (NoLock, NoWait) Where pp.Purchase_Project_No = si.Purchase_Project_No) as Purchaser
      FROM Stock_In si WITH (NoLock, NoWait)
      WHERE si.Bill_No = {Bill_No}
   End
   if(@Mode = 0 or @Mode = 3)
   Begin
       Select b.Bill_ExpenseID
       , b.[Bill_NO]       
       , Convert(varchar(10), b.[Date],111) as [Date] 
       , b.Description
       , isnull(b.Expense,0) as Expense
       , b.Remark
       From Bill_Expense b with(NoLock,NoWait)
       Where b.Bill_No = {Bill_No}
       Order by b.[Bill_ExpenseID]
   End
   if(@Mode = 0 or @Mode = 4)
   Begin
       Select 1 as Flag
       , pi.Invoice_No
       , pi.Invoice_No as Invoice_No_o
       , Convert(varchar(10), pi.[Invoice_Date],111) as [Invoice_Date]
       , isnull(pi.[Invoice_Price],0) as Invoice_Price
       , isnull(pi.[Tax],0) as Tax
       From Purchase_Invoice pi with(NoLock, NoWait)
       Where pi.Bill_No = {Bill_No}
       Order by pi.Invoice_Date 
   End
   if(@Mode = 0 or @Mode = 5)
   Begin
      Select m.Money_SourceID, m.Type, m.Days, m.By_Doc_Rcv, m.Withdrawal, m.Description, m.MoneyID
      , m.Update_User      
      , Convert(varchar(20), m.Update_Date, 120) as Update_Date
      from Money_Source m With(NoLock,NoWait)
      Where m.Source_No = {Bill_No}
      And m.Subject = 'Purchase Bill';
   End

   `, req.body) ;
   //console.log(strSQL)
   db.sql(req.SiteDB, strSQL)
      .then((result) => {
         var DataSet = {Purchase_Bill: (req.body.Mode == 0 || req.body.Mode == 1) ? result.recordsets[0] : []
           , Purchase_Bill_Detail: (req.body.Mode == 0) ? result.recordsets[1] : (req.body.Mode == 2 ? result.recordsets[0] : [])
           , Bill_Expense: (req.body.Mode == 0) ? result.recordsets[2] : (req.body.Mode == 3 ? result.recordsets[0] : [])
           , Purchase_Invoice: (req.body.Mode == 0) ? result.recordsets[3] : (req.body.Mode == 4 ? result.recordsets[0] : [])
           , Bill_Pay_List: (req.body.Mode == 0) ? result.recordsets[4] : (req.body.Mode == 5 ? result.recordsets[0] : [])
           , Detail_Total: {Price:0, Tax:0}
           , Expense_Total: {Expense:0}
           , Invoice_Total: {Invoice_Price:0, Tax:0}
           , Bill_Pay_Total: {Withdrawal:0}
        };

        DataSet.Purchase_Bill_Detail.forEach((item) => {            
            item.Price = Math.round((item.Price)*10000)/10000;
            item.Tax = Math.round((item.Tax)*10000)/10000;
            DataSet.Detail_Total.Price += item.Price;
            DataSet.Detail_Total.Tax += item.Tax;
        });

        DataSet.Bill_Expense.forEach((item) => {
            item.Expense = Math.round((item.Expense)*10000)/10000;
            DataSet.Expense_Total.Expense += item.Expense;
        });

        DataSet.Purchase_Invoice.forEach((item) => {
            item.Invoice_Price = Math.round((item.Invoice_Price)*10000)/10000;
            item.Tax = Math.round((item.Tax)*10000)/10000;
            DataSet.Invoice_Total.Invoice_Price += item.Invoice_Price;
            DataSet.Invoice_Total.Tax += item.Tax;
        });

        DataSet.Bill_Pay_List.forEach((item) => {
            item.Withdrawal = Math.round((item.Withdrawal)*10000)/10000;
            DataSet.Bill_Pay_Total.Withdrawal += item.Withdrawal;
        });
     
        DataSet.Detail_Total.Price = Math.round((DataSet.Detail_Total.Price)*10000)/10000;
        DataSet.Detail_Total.Tax = Math.round((DataSet.Detail_Total.Tax)*10000)/10000;

        DataSet.Expense_Total.Expense = Math.round((DataSet.Expense_Total.Expense)*10000)/10000;

        DataSet.Invoice_Total.Invoice_Price = Math.round((DataSet.Invoice_Total.Invoice_Price)*10000)/10000;
        DataSet.Invoice_Total.Tax = Math.round((DataSet.Invoice_Total.Tax)*10000)/10000;

        DataSet.Bill_Pay_Total.Withdrawal = Math.round((DataSet.Bill_Pay_Total.Withdrawal)*10000)/10000;

        //console.log(DataSet)
        res.send(DataSet);
      }).catch((err) => {
         console.log(err);
         res.status(500).send(err);
      })
});

//Maintain Purchase_Bill_Maintain
router.post('/Purchase_Bill_Maintain',  function (req, res, next) {
   console.log("Call Purchase_Bill_Maintain Api:",req.body);

   // req.body.Mode === 0 表示新增
   // req.body.Mode === 1 表示修改
   // req.body.Mode === 2 表示刪除
   var Size = 0;
   req.body.Bill_No = req.body.Bill_No ? `N'${req.body.Bill_No.trim().substring(0,20).replace(/'/g, '')}'` : `''`;
   req.body.Mode = req.body.Mode ? req.body.Mode : 0;
   
   var strSQL = format(`Declare @ROWCOUNT int, @Bill_No nvarchar(20) = {Bill_No} `, req.body);
   switch(req.body.Mode){
      case 0:
         req.body.Bill_Date = req.body.Bill_Date ? `'${req.body.Bill_Date.trim().substring(0,10)}'` : `'${this.moment().format('YYYY/MM/DD')}'`;
         req.body.SupplierID = req.body.SupplierID ? `N'${req.body.SupplierID.trim().substring(0,15).replace(/'/g, "''")}'` : `''`;
         req.body.Currency = req.body.Currency ? `N'${req.body.Currency.trim().substring(0,4).replace(/'/g, "''")}'` : `''`;
         req.body.Term = req.body.Term ? `'${req.body.Term.trim().substring(0,7)}'` : `'${this.moment().format('YYYY/MM')}'`;

         strSQL += format(`
            Declare @Department nvarchar(50), @OrganizationID nvarchar(50)
            
            Select @Department = d.Department_Code, @OrganizationID = d.OrganizationID
            from Employee e 
               Inner Join Department d on e.DepartmentID = d.DepartmentID
               Inner Join aspnet_Users au on e.EmployeeID = au.EmployeeID
            Where au.LoweredUserName = N'${req.UserID}'

            Declare @SupplierID nvarchar(15) = {SupplierID}
            , @Term varchar(06) = left({Term},4)+right({Term},2)
            , @Rec_No int = 0

            set @Bill_No = @Term + @SupplierID
            while (Select Count(*) From Bill with(NoLock,NoWait) where Bill_NO = @Bill_No) = 1
            Begin
               Set @Rec_No = @Rec_No + 1
               Set @Bill_No = @Term + @SupplierID +  '_' + cast(@Rec_No as varchar)
            End

            Insert [dbo].[Bill] (Bill_No, Subject, [Department]
               , [SupplierID], [Bill_Date], [Currency], [Term]
               , Earlier_Amount 
               , Current_Amount 
               , Postpone_Amount 
               , Expense 
               , Tax 
               , Source_Amount 
               , Amount 
               , UserID, Data_Updater, Data_Update)
            Select @Bill_No as [Bill_No], 'Purchase' as Subject, '' as [Department]
               , {SupplierID} as [SupplierID], {Bill_Date} as [Bill_Date], {Currency} as [Currency], {Term} as Term
               , 0 as [Earlier_Amount] 
               , 0 as [Current_Amount] 
               , 0 as [Postpone_Amount] 
               , 0 as [Expense] 
               , 0 as [Tax] 
               , 0 as [Source_Amount] 
               , 0 as [Amount] 
               , N'${req.UserID}' as UserID, N'${req.UserID}' as Data_Updater, GetDate() as Data_Update
            Where (Select count(*) From Bill b with(NoLock,NoWait) Where b.Bill_No = @Bill_No) = 0;
            
            Set @ROWCOUNT = @@ROWCOUNT;
         `, req.body);
      break;
      case 1:
         switch(req.body.Name){
            case 'Bill_Date':
            case 'Term':
               Size = 10;
            break;
            case 'Department':
               Size = 5;
            break;
            case 'Currency':
               Size = 4;
            break;
            case 'Bill_No':
               Size = 20;
            break;
            case 'SupplierID':
            case 'Purpose':
               Size = 15;
            break;
            default:
            break;
         }
         req.body.Value = Size == 0 ? (req.body.Value != null ? req.body.Value : null) : ((req.body.Value != null) ? `N'${req.body.Value.trim().replace(/'/g, "''")}'` : `''`);

         switch(req.body.Name){
          case 'SupplierID':
          case 'Currency':
          case 'Term':
            strSQL += format(`
              Update [dbo].[Bill] Set [{Name}] = ${Size == 0 ? '{Value}': `substring({Value},1,${Size})`} 
              , UserID = isnull(UserID, N'${req.UserID}')
              , Data_Updater = N'${req.UserID}'
              , Data_Update = GetDate()
              where Bill_No = @Bill_No 
              And (Select Count(*) From [dbo].[Money_Source] d with(NoLock,NoWait) Where Source_No = @Bill_No And d.Subject = 'Purchase Bill' And d.MoneyID is not null) = 0
              And (Select count(*) From Stock_In si with(NoLock,NoWait) Where si.Bill_No = @Bill_No) = 0 ;
  
              Set @ROWCOUNT = @@ROWCOUNT;
           `, req.body);
          break;
          case 'Reconciled':
            strSQL += format(`
              Update [dbo].[Bill] Set Reconciled_User =  iif({Value} = 0, null, N'${req.UserID}')
              , Reconciled_Date = iif({Value} = 0, null, Convert(varchar(20), GetDate(),120))
              , UserID = isnull(UserID, N'${req.UserID}')
              , Data_Updater = N'${req.UserID}'
              , Data_Update = GetDate()
              where Bill_No = @Bill_No ;
  
              Set @ROWCOUNT = @@ROWCOUNT;
           `, req.body);        
          break;
          case 'Bill_No':
            strSQL += format(`
              Update [dbo].[Bill] Set [{Name}] = ${Size == 0 ? '{Value}': `substring({Value},1,${Size})`} 
              , UserID = isnull(UserID, N'${req.UserID}')
              , Data_Updater = N'${req.UserID}'
              , Data_Update = GetDate()
              where Bill_No = @Bill_No 
              And (Select Count(*) 
                    From [dbo].[Money_Source] d with(NoLock,NoWait) 
                    Where Source_No = @Bill_No 
                    And d.Subject = 'Purchase Bill' 
                    And d.MoneyID is not null) = 0
              And (Select Count(*) 
                    From [dbo].[Bill] d with(NoLock,NoWait) 
                    Where Bill_No = {Value}) = 0 ;
  
              Set @ROWCOUNT = @@ROWCOUNT;
  
              if(@ROWCOUNT > 0) 
              Begin 
                Update Stock_In set Bill_No = {Value} 
                Where Bill_No = @Bill_No; 
                Update Money_Source set Source_No = {Value} 
                Where Source_No = @Bill_No;  
              End;
  
           `, req.body);
          break;
          default:
            strSQL += format(`
              Update [dbo].[Bill] Set [{Name}] = ${Size == 0 ? '{Value}': `substring({Value},1,${Size})`} 
              , UserID = isnull(UserID, N'${req.UserID}')
              , Data_Updater = N'${req.UserID}'
              , Data_Update = GetDate()
              where Bill_No = @Bill_No 
              And (Select Count(*) From [dbo].[Money_Source] d with(NoLock,NoWait) Where Source_No = @Bill_No And d.Subject = 'Purchase Bill' And d.MoneyID is not null) = 0
              ${(req.body.Name == 'Bill_No') ? " And (Select Count(*) From [dbo].[Bill] d with(NoLock,NoWait) Where Bill_No = {Value}) = 0 ":""} 
              ${(req.body.Name == 'SupplierID' || req.body.Name == 'Currency' || req.body.Name == 'Term') ? " And (Select count(*) From Stock_In si with(NoLock,NoWait) Where si.Bill_No = @Bill_No) = 0 ":""}             
              ;
  
              Set @ROWCOUNT = @@ROWCOUNT;
  
              ${(req.body.Name == 'Bill_No') ? "if(@ROWCOUNT > 0) Begin Update Stock_In set Bill_No = {Value} Where Bill_No = @Bill_No; Update Money_Source set Source_No = {Value} Where Source_No = @Bill_No;  End ":""}
  
           `, req.body);
            break;
       }
      break;
      case 2:
         strSQL += format(`
            Delete FROM [dbo].[Bill] 
            where Bill_No = @Bill_No
            And (Select count(*) From Stock_In si with(NoLock,NoWait) Where si.Bill_No = @Bill_No ) = 0            
            And (select count(*) From Money_Source c WITH (NoLock, NoWait) Where c.Source_No = @Bill_No And Subject = 'Purchase Bill' ) = 0
            
            Set @ROWCOUNT = @@ROWCOUNT;
         `, req.body);
      break;
        
   }

   strSQL += format(`
   Select @ROWCOUNT as Flag,  ${(req.body.Mode == 1 && req.body.Name == 'Bill_No') ? '{Value}' : '@Bill_No'} as Bill_No;

   `, req.body);
   //console.log(strSQL)
   db.sql(req.SiteDB, strSQL)
      .then((result) => {
         //console.log(result.recordsets[0])
         res.send({Flag:result.recordsets[0][0].Flag > 0, Bill_No: result.recordsets[0][0].Bill_No});
      }).catch((err) => {
         console.log(err);
         res.status(500).send(err);
      })
});

var UpDate_Amount_SQL = `Declare @Next_Term_First_Date varchar(10), @Term varchar(10), @Year varchar(4), @Month varchar(2);
Declare @Earlier_Amount float, @Current_Amount float, @Postpone_Amount float
, @Expense float, @Tax float

Select @Term = isnull(Term, Convert(varchar(07),GetDate(),111)) 
From Bill b with(NoLock,NoWait) 
Where b.Bill_No = @Bill_No;

Set @Year = Substring(@Term,1,4);
Set @Month = Substring(@Term,6,2);

Set @Next_Term_First_Date = Convert(varchar(10), 
      Case When @Month = '12' then 
         DateAdd(Year, 1, cast(@Year + '/01/01' as date)) 
      else DateAdd(Month, 1, cast(@Term + '/01' as Date))  
      End , 111) 

Set @Earlier_Amount = isnull( (Select sum(Price) From Stock_In s with(NoLock,NoWait) Where s.Bill_No = @Bill_No And Stock_In_Date < @Term + '/01') ,0)
Set @Current_Amount = isnull( (Select sum(Price) From Stock_In s with(NoLock,NoWait) Where s.Bill_No = @Bill_No And Stock_In_Date >= @Term + '/01') ,0)
Set @Postpone_Amount = isnull( (Select sum(Price) From Stock_In s with(NoLock,NoWait) Inner Join Bill b with(NoLock,NoWait) on s.SupplierID = b.SupplierID And b.Currency = s.Currency And b.Bill_No = @Bill_No Where isnull(s.Bill_No,'') = '' And Stock_In_Date >= b.Term +'/01') ,0) 
Set @Expense = isnull( (Select sum(Expense) From Bill_Expense s with(NoLock,NoWait) Where s.Bill_No = @Bill_No) ,0)
Set @Tax = isnull( (Select sum(Tax) From Stock_In s with(NoLock,NoWait) Where s.Bill_No = @Bill_No) ,0)

Update [dbo].[Bill] Set Earlier_Amount = @Earlier_Amount
, Current_Amount = @Current_Amount
, Postpone_Amount = @Postpone_Amount
, Expense = @Expense
, Tax = @Tax
, Source_Amount = @Earlier_Amount + @Current_Amount 
, Amount = @Earlier_Amount + @Current_Amount + @Expense + @Tax
where Bill_No = @Bill_No;`

//Maintain Purchase Bill Detail
router.post('/Purchase_Bill_Detail_Maintain',  function (req, res, next) {
   console.log("Call Purchase_Bill_Detail_Maintain Api:",req.body);

   // req.body.Mode === 0 表示新增
   // req.body.Mode === 1 表示遞延帳款
   // req.body.Mode === 2 表示刪除
   // req.body.Mode === 3 表示一鍵匯入當期帳款
   // req.body.Mode === 4 Fill up Value to Stock In
   // req.body.Mode === 5 Edit Tax field for Stock In table
   req.body.Bill_No = req.body.Bill_No ? `N'${req.body.Bill_No.trim().replace(/'/g, "''")}'` : `''`;
      
   var strSQL = format(`Declare @Mode int = {Mode}, @ROWCOUNT int=0, @Bill_No nvarchar(20) = {Bill_No}

   if((select count(*) From Money_Source c WITH (NoLock, NoWait) Where c.Source_No = @Bill_No And Subject = 'Purchase Bill' And c.MoneyID is not null) > 0 )
   begin
      Select @ROWCOUNT as Flag;
      return;
   End
   `, req.body);
   switch(req.body.Mode){
      case 0:
         var strSQL1 = '';
         req.body.Bill_Detail.forEach((item)=>{
            strSQL1 += format(`Insert into @tmpDetail (Stock_In_No) values (N'{Stock_In_No}');`,item)
         })

         strSQL += format(`
         Declare @tmpDetail Table (Stock_In_No int)

         ${strSQL1}

         Update [dbo].[Stock_In] set Bill_No = @Bill_No
         From [dbo].[Stock_In] s with(NoLock,NoWait)
         --Inner Join Bill b with(NoLock,NoWait) on s.SupplierID = b.SupplierID And s.Currency = b.Currency And s.Term = b.Term
         Inner Join @tmpDetail d on s.Stock_In_No = d.Stock_In_No
         where isnull(s.Bill_No,'') = ''
     
         Set @ROWCOUNT = @@ROWCOUNT;
         `, req.body);

      break;
      case 1:
         var strSQL1 = '';
         req.body.Bill_Detail.forEach((item)=>{
            strSQL1 += format(`Insert into @tmpDetail (Stock_In_No) values (N'{Stock_In_No}');`,item)
         })

         strSQL += format(`
         Declare @tmpDetail Table (Stock_In_No int)

         ${strSQL1}

         Update [dbo].[Stock_In] set Term = '{Term}'
         From [dbo].[Stock_In] s with(NoLock,NoWait)
         --Inner Join Bill b with(NoLock,NoWait) on s.SupplierID = b.SupplierID And s.Currency = b.Currency And s.Term = b.Term
         Inner Join @tmpDetail d on s.Stock_In_No = d.Stock_In_No
         where isnull(s.Bill_No,'') = ''
     
         Set @ROWCOUNT = @@ROWCOUNT;
         `, req.body);
      break;
      case 2:
         req.body.Stock_In_No = req.body.Stock_In_No ? req.body.Stock_In_No : null;
         strSQL += format(`
            Update [dbo].[Stock_In] set Bill_No = null
            where Stock_In_No = {Stock_In_No};
                        
            Set @ROWCOUNT = @@ROWCOUNT;
         `, req.body);
      break;
      case 3:
         strSQL += format(`
            Update [dbo].[Stock_In] set Bill_No = @Bill_No
            From Stock_In s 
            Inner Join Bill b with(NoLock,NoWait) on s.SupplierID = b.SupplierID And s.Term = b.Term And s.Currency = b.Currency And b.Bill_No = @Bill_No        
            Where isnull(s.Bill_No,'') = ''
                        
            Set @ROWCOUNT = @@ROWCOUNT;
         `, req.body);
      break;
      case 4:
         req.body.Value = req.body.Value.length != 0 ? req.body.Value : 0;
         strSQL += format(`Declare @Value decimal(18,2) = {Value}, @Price decimal(18,2) = (Select sum(Price) From [dbo].[Stock_In] where Bill_No = @Bill_No)
            Update [dbo].[Stock_In] set [{Name}] = cast(isnull( (@Value / (nullif(@Price ,0) / nullif(Price,0)) ) ,0) as decimal(18,0))
            where Bill_No = @Bill_No;
                        
            Set @ROWCOUNT = @@ROWCOUNT;
         `, req.body);
      break;
      case 5:
         req.body.Stock_In_No = req.body.Stock_In_No ? req.body.Stock_In_No : 0;
         req.body.Value = req.body.Value.length != 0 ? req.body.Value : 0;
         strSQL += format(`
         Update [dbo].[Stock_In] Set [{Name}] = {Value}
         where Stock_In_No = {Stock_In_No};
         Set @ROWCOUNT = @@ROWCOUNT;
            `, req.body);
      break;
   }

   strSQL += format(`
   Select @ROWCOUNT as Flag;

   if(@ROWCOUNT > 0 And @Mode <> 1)
   Begin 
      ${format(UpDate_Amount_SQL)}

      Update [dbo].[Bill] Set UserID = isnull(UserID, N'${req.UserID}')
      , Data_Updater = N'${req.UserID}'
      , Data_Update = GetDate()
      where Bill_No = @Bill_No;
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

//Maintain Purchase Invoice
router.post('/Purchase_Invoice_Maintain',  function (req, res, next) {
   console.log("Call Purchase_Invoice_Maintain Api:",req.body);

   // req.body.Mode === 0 表示新增
   // req.body.Mode === 1 表示修改
   // req.body.Mode === 2 表示刪除
   var Size = 0;
   req.body.Bill_No = req.body.Bill_No ? `N'${req.body.Bill_No.trim().substring(0,20).replace(/'/g, "''")}'` : `''`;
   req.body.Invoice_No = req.body.Invoice_No ? `N'${req.body.Invoice_No.trim().substring(0,20).toUpperCase().replace(/'/g, "''")}'` : `''`;
      
   var strSQL = format(`Declare @ROWCOUNT int=0, @Invoice_No varchar(20) = {Invoice_No}, @Bill_No nvarchar(20) = {Bill_No};

      if((select count(*) From Money_Source c WITH (NoLock, NoWait) Where c.Source_No = @Bill_No And Subject = 'Purchase Bill' And c.MoneyID is not null) > 0 )
      Begin
         Select @ROWCOUNT as Flag;
         return;
      End
   `, req.body);
   switch(req.body.Mode){
      case 0:
         req.body.Invoice_Date = req.body.Invoice_Date ? `'${req.body.Invoice_Date.trim().substring(0,10)}'` : null;

         strSQL += format(`
            Insert [dbo].[Purchase_Invoice] ([Bill_No], [Invoice_No], [Invoice_Date], [Invoice_Price], [Tax])
            Select @Bill_No as [Bill_No], @Invoice_No as [Invoice_No], {Invoice_Date} as [Invoice_Date], {Invoice_Price} as [Invoice_Price], {Tax} as [Tax]
            Where (Select count(*) From Purchase_Invoice p with(NoLock,NoWait) Where p.Invoice_No = @Invoice_No) = 0

            Set @ROWCOUNT = @@ROWCOUNT; 
         `, req.body);
      break;
      case 1:
         switch(req.body.Name){
            case 'Invoice_No':
               Size = 20;
            break;
            case 'Invoice_Date':
               Size = 10;
            break;
            default:
            break;
         }
         req.body.Value = Size == 0 ? (req.body.Value ? req.body.Value : null) : (req.body.Value ? `N'${req.body.Value.trim().replace(/'/g, "''")}'` : `''`);

         strSQL += format(`         
            Update [dbo].[Purchase_Invoice] Set [{Name}] = ${Size == 0 ? '{Value}': `substring({Value},1,${Size})`}            
            where Invoice_No = @Invoice_No
            ${req.body.Name == 'Invoice_No' ? ' And (Select count(*) From Purchase_Invoice p with(NoLock,NoWait) Where p.Invoice_No = {Value}) = 0' :'' } 
            ;

            Set @ROWCOUNT = @@ROWCOUNT;
         `, req.body);
      break;
      case 2:
         strSQL += format(`
            Delete FROM [dbo].[Purchase_Invoice] 
            where Invoice_No = @Invoice_No
            
            Set @ROWCOUNT = @@ROWCOUNT;
         `, req.body);
      break;
        
   }

   strSQL += format(`
   Select @ROWCOUNT as Flag;

   if(@ROWCOUNT > 0)
   Begin     
      Declare @Invoice_Price float, @Invoice_Tax float
      
      Select @Invoice_Price = sum(Invoice_Price) , @Invoice_Tax = sum(Tax)
      From Purchase_Invoice s with(NoLock,NoWait) 
      Where s.Bill_No = @Bill_No;

      Update [dbo].[Bill] Set UserID = isnull(UserID, N'${req.UserID}')
      , Data_Updater = N'${req.UserID}'
      , Data_Update = GetDate()
      , Invoice_Price = isnull(@Invoice_Price,0)
      , Invoice_Tax = isnull(@Invoice_Tax,0)
      where Bill_No = @Bill_No;
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

//Maintain Purchase Bill Expense
router.post('/Purchase_Bill_Expense_Maintain',  function (req, res, next) {
   console.log("Call Purchase_Bill_Expense_Maintain Api:",req.body);

   // req.body.Mode === 0 表示新增
   // req.body.Mode === 1 表示修改
   // req.body.Mode === 2 表示刪除
   var Size = 0;
   req.body.Bill_No = req.body.Bill_No ? `N'${req.body.Bill_No.trim().replace(/'/g, "''")}'` : `''`;
   req.body.Bill_ExpenseID = req.body.Bill_ExpenseID ? req.body.Bill_ExpenseID : null; 
   
   var strSQL = format(`Declare @ROWCOUNT int=0, @Bill_ExpenseID int = {Bill_ExpenseID}, @Bill_No nvarchar(20) = {Bill_No};

      if((select count(*) From Money_Source c WITH (NoLock, NoWait) Where c.Source_No = @Bill_No And Subject = 'Purchase Bill' And c.MoneyID is not null) > 0 )
      Begin
         Select @ROWCOUNT as Flag;
         return;
      End
   `, req.body);
   switch(req.body.Mode){
      case 0:
         strSQL += format(`
            Insert [dbo].[Bill_Expense] ([Bill_No], [Date], [Expense])
            Select @Bill_No as [Bill_No], GetDate() as [Date], 0 as [Expense]

            Set @ROWCOUNT = @@ROWCOUNT; 
         `, req.body);
      break;
      case 1:
         switch(req.body.Name){
            case 'Description':
               Size = 20;
            break;
            case 'Remark':
               Size = 50;
            break;
            case 'Date':
               Size = 50;
            break;
            default:
            break;
         }
         req.body.Value = Size == 0 ? (req.body.Value ? req.body.Value : null) : (req.body.Value ? `N'${req.body.Value.trim().replace(/'/g, "''")}'` : `''`);

         strSQL += format(`         
            Update [dbo].[Bill_Expense] Set [{Name}] = ${Size == 0 ? '{Value}': `substring({Value},1,${Size})`}            
            where Bill_ExpenseID = @Bill_ExpenseID;

            Set @ROWCOUNT = @@ROWCOUNT;
         `, req.body);
      break;
      case 2:
         strSQL += format(`
            Delete FROM [dbo].[Bill_Expense] 
            where Bill_ExpenseID = @Bill_ExpenseID
            
            Set @ROWCOUNT = @@ROWCOUNT;
         `, req.body);
      break;
        
   }

   strSQL += format(`
   Select @ROWCOUNT as Flag;

   if(@ROWCOUNT > 0)
   Begin
      ${format(UpDate_Amount_SQL, req.UserID)}
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

 //Get Purchase Bill Detail Add List
 router.post('/Purchase_Bill_Detail_Add_List',  function (req, res, next) {
   console.log("Call Purchase_Bill_Detail_Add_List Api:",req.body);  
 
   req.body.Bill_No = req.body.Bill_No ? `N'${req.body.Bill_No.trim().replace(/'/g, "''")}'` : `''`;
   req.body.Stock_In_No = req.body.Stock_In_No ? req.body.Stock_In_No.trim() : "";
   req.body.Purchase_Project_No = req.body.Purchase_Project_No ? `${req.body.Purchase_Project_No.trim().replace(/'/g, "")}` : ``;
   req.body.Department = req.body.Department ? `${req.body.Department.trim().replace(/'/g, "")}` : ``;
   req.body.Purpose = req.body.Purpose ? `${req.body.Purpose.trim().replace(/'/g, "")}` : ``;
   req.body.Stock_In_Date = req.body.Stock_In_Date ? `${req.body.Stock_In_Date.trim().replace(/'/g, "")}` : ``;
   req.body.Purchaser = req.body.Purchaser ? `${req.body.Purchaser.trim().replace(/'/g, "")}` : ``;
 
   var strSQL = format(`
   SELECT cast(0 as bit) as flag, '' as Query
   , si.Stock_In_No
   , si.Purchase_Project_No
   , si.WarehouseID
   , si.Department       
   , si.Purpose 
   , iif((Select count(*) 
      From Stock_In_Detail sid 
      Inner Join Purchase_Detail pd on sid.Purchase_DetailID = pd.Purchase_DetailID
      Where sid.Stock_In_No = si.Stock_In_No
      And (isnull(pd.Qty,0) - isnull(pd.Stock_In_Qty,0) > 0)
      And sid.Produce_No is null
      ) +(Select count(*) 
      From Stock_In_Detail sid 
      Inner Join Purchase_Detail_Sub pd on sid.Purchase_DetailID = pd.Purchase_DetailID and sid.Produce_No = pd.Produce_No
      Where sid.Stock_In_No = si.Stock_In_No
      And (isnull(pd.Qty,0) - isnull(pd.In_Qty,0) > 0)
   ) > 0,1,0)as NotIn_Flag
   , Convert(varchar(10), si.Stock_In_Date,111) as Stock_In_Date
   , si.Price
   , si.Tax 
   , p.Purchaser
   FROM Stock_In si WITH (NoLock, NoWait)
   Inner Join Bill b with(NoLock,NoWait) on si.SupplierID = b.SupplierID And si.Term = b.Term And si.Currency = b.Currency And b.Bill_No = {Bill_No}
   Left Outer Join Purchase_Project p WITH (NoLock, NoWait) on p.Purchase_Project_No = si.Purchase_Project_No
   Where isnull(si.Bill_No,'') = ''
   --And (isnull(b.Department,'') = '' or isnull(b.Department,'') = 'ACC' or si.Department = b.Department)
   And (isnull(b.Purpose,'') = ''or si.Purpose = b.Purpose)
   And ('{Stock_In_No}' = '' or cast(si.Stock_In_No as varchar) like '{Stock_In_No}%')
   And ('{Purchase_Project_No}' = '' or si.Purchase_Project_No like '%{Purchase_Project_No}%')
   And ('{Department}' = '' or si.Department like '%{Department}%')
   And ('{Purpose}' = '' or si.Purpose like '%{Purpose}%')
   And ('{Stock_In_Date}' = '' or Convert(varchar(10), si.Stock_In_Date,111) like '%{Stock_In_Date}%')
   And ('{Purchaser}' = '' or p.Purchaser like '%{Purchaser}%')

   `, req.body) ;
  // console.log(strSQL)
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

//Maintain Bill_Pay
router.post('/Bill_Pay_Maintain',  function (req, res, next) {
   console.log("Call Bill_Pay_Maintain Api:",req.body);

   // req.body.Mode === 0 表示新增
   // req.body.Mode === 1 表示修改 
   // req.body.Mode === 2 表示刪除
   // req.body.Mode === 3 表示拆分金額
   req.body.Bill_No = req.body.Bill_No ? `N'${req.body.Bill_No.trim().substring(0,20).replace(/'/g, "''")}'` : `''`; 

   var strSQL = format(`Declare @Accounting int = 0, @ROWCOUNT int=0, @Balance_Amount float=0;

   Set @Balance_Amount = (Select isnull(Amount,0) From Bill d with(Nolock,NoWait) Where d.Bill_No = {Bill_No}) 
   - isnull((Select Sum(Withdrawal) From Money_Source c WITH (NoLock, NoWait) Where c.Source_No = {Bill_No} And Subject = 'Purchase Bill'),0)

   `, req.body);

   switch(req.body.Mode){
      case 0:
         req.body.Type = req.body.Type ? `N'${req.body.Type.trim().substring(0,10).replace(/'/g, "''")}'` : `''`; 
         req.body.Description = req.body.Description ? `N'${req.body.Description.trim().substring(0,30).replace(/'/g, "''")}'` : `''`;    
         strSQL += format(`         
         if(@Accounting = 0)
         begin   
            Insert into [dbo].[Money_Source] (Type, Days, By_Doc_Rcv, Withdrawal, Subject, Source_No, Description, [Update_User] ,[Update_Date] )
            Select {Type} as Type, {Days} as Days, {By_Doc_Rcv} as By_Doc_Rcv
            --, case when @Balance_Amount < 0 then 0 else @Balance_Amount End as Withdrawal
            , @Balance_Amount as Withdrawal
            , 'Purchase Bill' as Subject
            , {Bill_No} as Source_No
            , {Description} as Description
            , N'${req.UserID}' as [Update_User]
            , GetDate() as [Update_Date]

            Set @ROWCOUNT = @@ROWCOUNT;
         end
         `, req.body);
      break;
      case 1:
         var Size = 0;
         switch(req.body.Name) {
            case 'Type':
               Size = 10;
            break;
            case 'Description':
               Size = 30;
            break;
         }
         
         req.body.Value = Size > 0 ? (req.body.Value ? `N'${req.body.Value.trim().substring(0,Size).replace(/'/g, "''")}'` : `''`) : ( req.body.Value ? req.body.Value : 0 );   
         strSQL += format(`     
         if(@Accounting = 0)
         begin   
            Update [dbo].[Money_Source] Set [{Name}] = {Value}
            , Update_User = N'${req.UserID}'
            , Update_Date = GetDate()
            where Money_SourceID = {Money_SourceID}
            And isnull(MoneyID,'') = ''
            Set @ROWCOUNT = @@ROWCOUNT;            
         End
         `, req.body);
      break;
      case 2:
         strSQL += format(`         
      if(@Accounting = 0)
      begin      
         Delete FROM [dbo].[Money_Source] 
         where Money_SourceID = {Money_SourceID} 
         And isnull(MoneyID,'') = ''
         Set @ROWCOUNT = @@ROWCOUNT;
      End
      `, req.body);      
      break;
      case 3:
         req.body.Type = req.body.Type ? `N'${req.body.Type.trim().substring(0,10).replace(/'/g, "''")}'` : `''`; 
         req.body.Description = req.body.Description ? `N'${req.body.Description.trim().substring(0,30).replace(/'/g, "''")}'` : `''`;    

         strSQL += format(`Declare @Split_Amount float = {Split_Amount};

         Insert into [dbo].[Money_Source] (Type, Days, By_Doc_Rcv, Withdrawal, Subject, Source_No, Description, [Update_User] ,[Update_Date] )
         Select ms.Type as Type, ms.Days as Days, ms.By_Doc_Rcv as By_Doc_Rcv 
         , @Split_Amount as Withdrawal
         , ms.Subject as Subject, ms.Source_No as Source_No, ms.Description as Description, N'${req.UserID}' as [Update_User], GetDate() as [Update_Date]
         From Money_Source ms with(NoLock,NoWait) 
         Where ms.Money_SourceID = {Money_SourceID}
         And ms.MoneyID is null 
         And ABS(isnull(ms.Withdrawal,0)) - ABS(isnull(@Split_Amount,0)) > 0

         Set @ROWCOUNT = @@ROWCOUNT;

         if (@ROWCOUNT > 0)
         Begin
            Update Money_Source set Withdrawal = Withdrawal - @Split_Amount
            , Update_User = N'${req.UserID}'
            , Update_Date = GetDate()
            Where Money_SourceID = {Money_SourceID};
         End
         
         `, req.body);
      break;
   }

   strSQL += format(`         
   Select @ROWCOUNT as Flag;   
   if(@ROWCOUNT > 0 )
   Begin
      Update [dbo].[Bill] Set UserID = isnull(UserID, N'${req.UserID}'), Data_Updater = N'${req.UserID}'
      , Data_Update = GetDate()
      where Bill_No = {Bill_No}
   End
   `, req.body);      
   //console.log(strSQL)
   db.sql(req.SiteDB, strSQL)
      .then((result) => {
         //res.send({Flag:false});
         res.send({Flag:result.recordsets[0][0].Flag > 0});
      }).catch((err) => {
         console.log(err);
         res.status(500).send(err);
      })

});

//Get Purchase Bill Report Info
router.post('/Purchase_Bill_Report_Info',  function (req, res, next) {
   console.log("Call Purchase_Bill_Report_Info Api:",req.body);  
 
   req.body.Mode = req.body.Mode ? req.body.Mode : '0';
   req.body.Bill_No = req.body.Bill_No ? `N'${req.body.Bill_No.trim().replace(/'/g, "''")}'` : `''`;
    
   //Mode == 0 Purchase Bill Report
   var strSQL = format(`Declare @Mode int = {Mode}, @Bill_No nvarchar(20) = {Bill_No};
   `, req.body) ; 

   switch(req.body.Mode) {
      case '0':
         strSQL += format(`
         --- 0 Report Info
         SELECT [Term]
         , [Bill_No]
         , b.[Currency]
         , c.Currency_Symbol
         , s.AccountID + ' (' + b.[SupplierID] + ' ' + isnull(s.Uni_Tax_Code,'') +')' as Supplier         
         , isnull(s.Uni_Tax_Code,'') as Uni_Tax_Code
         , isnull(s.Payment_Terms,'') as Payment_Terms
         , isnull(cast(s.Sample_Discount as nvarchar),'') as Sample_Discount
         , Convert(varchar(20), [Bill_Date],111) as [Bill_Date]
         , isnull([Source_Amount],0) as Source_Amount
         , isnull([Tax],0) as Tax
         , isnull([Expense],0) as Expense
         , isnull([Amount],0) as Amount
         , isnull([Invoice_Price],0) as Invoice_Price
         , isnull([Invoice_Tax],0) as Invoice_Tax
         , isnull([Invoice_Price],0) - isnull([Source_Amount],0) as Price_Diff
         , isnull([Invoice_Tax],0) - isnull([Tax],0) as Tax_Diff
         , case when ABS(isnull([ITax_Dicount],0)) = 1 then '★★稅額已扣%★★' else '' end as ITax_Dicount
         FROM Bill b WITH (NoLock, NoWait)
         Inner Join currency c with(NoLock,NoWait) on c.Currency = b.[Currency]
         Left outer Join Supplier s with(nowait,NoLock) on b.SupplierID = s.SupplierID
         WHERE Bill_No = {Bill_No};
   
         -- 1 Report Detail Info
         SELECT si.Stock_In_No
         , si.Purchase_Project_No
         , si.WarehouseID
         , si.Department
         , si.Purpose
         , Convert(varchar(10), si.Stock_In_Date,111) as Stock_In_Date
         , si.Price
         , si.Tax
         FROM Stock_In si WITH (NoLock, NoWait)       
         WHERE si.Bill_No = {Bill_No};
   
         -- 2 Bill_Expense Info
         Select b.Bill_ExpenseID
         , b.[Bill_NO]       
         , Convert(varchar(10), b.[Date],111) as [Date] 
         , b.Description
         , isnull(b.Expense,0) as Expense
         , b.Remark
         From Bill_Expense b with(NoLock,NoWait)
         Where b.Bill_No = {Bill_No}
         Order by b.[Bill_ExpenseID];
   
         -- 3 Purchase Invoice Info
         Select 1 as Flag
         , pi.Invoice_No
         , pi.Invoice_No as Invoice_No_o
         , Convert(varchar(10), pi.[Invoice_Date],111) as [Invoice_Date]
         , isnull(pi.[Invoice_Price],0) as Invoice_Price
         , isnull(pi.[Tax],0) as Tax
         From Purchase_Invoice pi with(NoLock, NoWait)
         Where pi.Bill_No = {Bill_No}
         Order by pi.Invoice_Date desc;
   
         -- 4 Money Source Info
         Select m.Money_SourceID, m.Type, m.Days, m.By_Doc_Rcv, m.Withdrawal, m.Description, m.MoneyID
         , m.Update_User      
         , Convert(varchar(20), m.Update_Date, 120) as Update_Date
         from Money_Source m With(NoLock,NoWait)
         Where m.Source_No = {Bill_No}
         And m.Subject = 'Purchase Bill';
         `, req.body) ;
      break;
      case '1':
         strSQL += format(`
          `, req.body) ;
      break;
      case '2':
         strSQL += format(`
          `, req.body) ;
      break;
   }    

   //console.log(strSQL)
   db.sql(req.SiteDB, strSQL)
      .then((result) => { 
         var DataSet = {}
         switch(req.body.Mode) {
            case '0':
               DataSet = {Report_Info: result.recordsets[0]
                  , Report_Detail: result.recordsets[1]
                  , Report_Expense: result.recordsets[2]
                  , Purchase_Invoice: result.recordsets[3]
                  , Money_Source: result.recordsets[4]
                  , Report_Detail_Purpose: []
                  , Report_Detail_Total: {Price:0, Tax:0}
                  , Report_Expense_Total: {Expense:0}
                  , Purchase_Invoice_Total: {Invoice_Price:0, Tax:0, Total_Amount:0}
                  , Money_Source_Total: {Withdrawal:0}
               };
              
               DataSet.Report_Detail_Purpose = [...DataSet.Report_Detail.reduce((r, e) => {
                  let k = `${e.Department}|${e.Purpose}`;
                  if (!r.has(k)) {
                    // console.log(r)
                    r.set(k, { Department: e.Department,
                     Purpose: e.Purpose,
                     Total_Price: e.Price,
                     Total_Tax: e.Tax,
                    })
                  } else {
                     r.get(k).Total_Price += e.Price;
                     r.get(k).Total_Tax += e.Tax;
                  }
                  return r;
                }, new Map).values()]

                DataSet.Report_Detail_Purpose.forEach((item)=>{
                  item.Total_Price = Math.round(item.Total_Price * 100)/100
                  item.Tax = Math.round(item.Tax * 100)/100
               })

               DataSet.Report_Detail.forEach((item)=>{
                  item.Price = Math.round(item.Price * 100)/100
                  item.Tax = Math.round(item.Tax * 100)/100
                  DataSet.Report_Detail_Total.Price += item.Price;
                  DataSet.Report_Detail_Total.Tax += item.Tax;
               })
               
               DataSet.Report_Expense.forEach((item)=>{
                  item.Expense = Math.round(item.Expense * 100)/100
                  DataSet.Report_Expense_Total.Expense += item.Expense;
               })

               DataSet.Purchase_Invoice.forEach((item)=>{
                  item.Invoice_Price = Math.round(item.Invoice_Price * 100)/100
                  item.Tax = Math.round(item.Tax * 100)/100
                  item.Total_Amount = Math.round((item.Invoice_Price + item.Tax) * 100)/100
                  DataSet.Purchase_Invoice_Total.Invoice_Price += item.Invoice_Price;
                  DataSet.Purchase_Invoice_Total.Tax += item.Tax;
                  DataSet.Purchase_Invoice_Total.Total_Amount += item.Total_Amount;
               })
      
               DataSet.Money_Source.forEach((item)=>{
                  item.Withdrawal = Math.round(item.Withdrawal * 100)/100
                  DataSet.Money_Source_Total.Withdrawal += item.Withdrawal;
               })

               DataSet.Report_Detail_Purpose.Price = Math.round(DataSet.Report_Detail_Purpose.Price * 100)/100 ;
               DataSet.Report_Detail_Purpose.Tax = Math.round(DataSet.Report_Detail_Purpose.Tax * 100)/100 ;

               DataSet.Report_Detail_Total.Price = Math.round(DataSet.Report_Detail_Total.Price * 100)/100;
               DataSet.Report_Detail_Total.Tax = Math.round(DataSet.Report_Detail_Total.Tax * 100)/100;

               DataSet.Report_Expense_Total.Expense = Math.round(DataSet.Report_Expense_Total.Expense * 100)/100;

               DataSet.Purchase_Invoice_Total.Invoice_Price = Math.round(DataSet.Purchase_Invoice_Total.Invoice_Price * 100)/100;
               DataSet.Purchase_Invoice_Total.Tax = Math.round(DataSet.Purchase_Invoice_Total.Tax * 100)/100;
               DataSet.Purchase_Invoice_Total.Total_Amount = Math.round(DataSet.Purchase_Invoice_Total.Total_Amount * 100)/100;

               DataSet.Money_Source_Total.Withdrawal = Math.round(DataSet.Money_Source_Total.Withdrawal * 100)/100;
            break;
            case '1':
            break;
            case '2':
            break;
         }    
      //console.log(DataSet)
         res.send(DataSet);
      }).catch((err) => {
         console.log(err);
         res.status(500).send(err);
      })
});

//Get Payment List Report Info
router.post('/Payment_List_Report_Info',  function (req, res, next) {
   console.log("Call Payment_List_Report Api:",req.body);  
 
   req.body.Mode = req.body.Mode ? req.body.Mode : '0';
   req.body.Bill_No = req.body.Bill_No ? `N'${req.body.Bill_No.trim().replace(/'/g, "''")}'` : `''`;
   req.body.Term = req.body.Term ? `N'${req.body.Term.trim().replace(/'/g, "''")}'` : `''`;
   req.body.SupplierID = req.body.SupplierID ? `N'${req.body.SupplierID.trim().replace(/'/g, "''")}'` : `''`;
   req.body.Produce_Info = req.body.Produce_Info ? req.body.Produce_Info : 0;    

   //Mode == 0 Purchase Bill Report
   var strSQL = format(`Declare @Mode int = {Mode}, @Bill_No nvarchar(20) = {Bill_No}, @Term varchar(10) = {Term}, @SupplierID nvarchar(15) = {SupplierID};

   -- 0 Bill Info
   Select * , (Select OrganizationID From [CONTROL]) AS OrganizationID
   , case when isnull(b.[Reconciled_User],'') = '' then 0 else 1 end as Reconciled
   From Bill b with(NoLock,NoWait) 
   Where b.Bill_No = @Bill_No;

   -- 1 Detail Info
   SELECT pd.Purchase_Project_No
   , s.AccountID
   , isnull(s.Uni_Tax_Code,'') as Uni_Tax_Code
   , isnull(s.Payment_Terms,'') as Payment_Terms
   , cast(s.Sample_Discount as nvarchar) as Sample_Discount
   , b.SupplierID
   , b.Currency
   , isnull(si.Department, b.Department) as Department
   , pd.Purchase_No
   , case when isnull(b.Purpose,'') = '' then si.Purpose else b.Purpose end as Purpose
   , b.Term
   , isnull(pd.Project_Qty,0) as Project_Qty
   , isnull(pd.Qty,0) as Qty
   , m.L2_Material_Category
   , pd.[Material_Category] + ' ' + pd.[Material_Specific] + ' ' + pd.[Material_Color] AS Material
   , pd.[Material_Category] + ' ' + pd.[Material_Specific] + ' ' + pd.[Material_Color] 
   + IIf(IsNull(pd.[M_Rmk],'') = '', '','  ★★' + pd.[M_Rmk] + '★★') AS Material_With_Rmk
   , pd.Unit
   , sd.Purchase_DetailID
   , Sum(Round(cast(isnull(sd.[Unit_Price]*[Charge_Qty],0) as decimal(18, 6) ),2)) AS S_Amount
   , IIf([Qty]-[Stock_In_Qty]<=0,'Delivery Finished','Delivery Pending') AS Status
   , isnull(pd.Stock_In_Qty,0) as Stock_In_Qty
   , Round(isnull([Qty]-[Stock_In_Qty],0),2) AS Not_In_Qty
   , isnull([Charge_In_Qty]-[Qty],0) AS Over_Charge_Qty
   , IIf(round(isnull([Qty],0)-isnull([Stock_In_Qty],0),2)>=0, Format(cast((isnull([Qty],0)-isnull([Stock_In_Qty],0)) as decimal(16,2)), 'N2') 
   , '(' + cast(isnull([Charge_In_Qty],0)-isnull([Qty],0) as varchar) + ' '+ cast(cast(isnull(isnull([Charge_In_Qty]-[Qty],0) / nullif([Qty],0) * 100 ,0) as int) as varchar) + '%)'
   ) AS Over_Charge_Qty_Rate
   , b.Bill_No
   , p.UserID
   , Right(convert(varchar(10), si.Stock_In_Date,111),5) as Stock_In_Date
   , isnull(sd.[Unit_Price],0) as Unit_Price
   , si.Stock_In_No
   , isnull(si.Tax,0) as Tax
   , sum(isnull(sd.Charge_Qty,0)) as Charge_Qty
   , isnull(mc.Purchase_Price,0) as Purchase_Price
   , case when Round(isnull(sd.[Unit_Price] / nullif(mc.[Purchase_Price], 0 ) ,0),2) * 100 <> 100 And Round(isnull(sd.[Unit_Price] / nullif(mc.[Purchase_Price], 0 ) ,0),2) * 100 <> 0 
      then '(' + cast(Round(isnull(sd.[Unit_Price] / nullif(mc.[Purchase_Price], 0 ) ,0),2) * 100 as varchar)+'%)'
      else '' End as Price_Rate   
   FROM Bill b
   INNER JOIN Supplier s ON b.SupplierID = s.SupplierID
   LEFT JOIN Stock_In si with(NoLock,NoWait) ON b.Bill_No = si.Bill_No
   LEFT JOIN Stock_In_Detail sd with(NoLock,NoWait) ON sd.Stock_In_No = si.Stock_In_No
   LEFT JOIN Purchase_Detail pd with(NoLock,NoWait) ON sd.Purchase_DetailID = pd.Purchase_DetailID
   LEFT JOIN Purchase p with(NoLock,NoWait) ON pd.Purchase_No = p.Purchase_No
   LEFT JOIN Material m with(NoLock,NoWait) ON m.MaterialID = pd.MaterialID
   LEFT JOIN Material_Color mc with(NoLock,NoWait) on mc.Material_ColorID = sd.Material_ColorID
   WHERE b.Bill_No = @Bill_No
   GROUP BY pd.Purchase_Project_No
  , s.AccountID
   , isnull(s.Uni_Tax_Code,'') 
   , isnull(s.Payment_Terms,'') 
   , cast(s.Sample_Discount as nvarchar) 
   , b.SupplierID
   , b.Currency
   , si.Department
   , b.Department
   , pd.Purchase_No
   , case when isnull(b.Purpose,'') = '' then si.Purpose else b.Purpose end
   , b.Term
   , pd.Project_Qty
   , pd.Qty
   , m.L2_Material_Category
   , pd.[Material_Category] + ' ' + pd.[Material_Specific] + ' ' + pd.[Material_Color]
   , pd.[Material_Category] + ' ' + pd.[Material_Specific] + ' ' + pd.[Material_Color] 
   + IIf(IsNull(pd.[M_Rmk],'') = '', '','  ★★' + pd.[M_Rmk] + '★★')
   , pd.Unit
   , sd.Purchase_DetailID
   , IIf([Qty]-[Stock_In_Qty]<=0,'Delivery Finished','Delivery Pending')
   , pd.Stock_In_Qty
   , Round([Qty]-[Stock_In_Qty],2)
   , isnull([Charge_In_Qty]-[Qty],0)
   , IIf(round(isnull([Qty],0)-isnull([Stock_In_Qty],0),2)>=0, Format(cast((isnull([Qty],0)-isnull([Stock_In_Qty],0)) as decimal(16,2)), 'N2') 
   , '(' + cast(isnull([Charge_In_Qty],0)-isnull([Qty],0) as varchar) + ' '+ cast(cast(isnull(isnull([Charge_In_Qty]-[Qty],0) / nullif([Qty],0) * 100 ,0) as int) as varchar) + '%)'
   )
   , b.Bill_No    
   , p.UserID
   , Right(convert(varchar(10), si.Stock_In_Date,111),5)
   , sd.[Unit_Price]
   , si.Stock_In_No
   , si.Tax
   , mc.Purchase_Price
   Order By SupplierID, Department, Currency, Purpose, Status, UserID, Purchase_Project_No, Purchase_No, Material, Purchase_detailID

   -- 2 Bill_Expense Info
   Select distinct isnull(si.Department, (Select OrganizationID From [CONTROL])) as Department
   , b.Currency
   , case when isnull(b.Purpose,'') = '' then si.Purpose else b.Purpose end as Purpose
   , isnull(be.[Description],'') as [Description]         
   , isnull(be.Expense,0) as Expense 
   , isnull(b.Source_Amount,0) as Source_Amount 
   from Bill b with(NoLock,NoWait)
   Inner Join Bill_Expense be with(NoLock,NoWait) on b.Bill_NO = be.Bill_NO
   Left outer Join Stock_In si with(NoLock,NoWait) on b.Bill_NO = si.Bill_NO   
   Where be.Bill_No = @Bill_No
   And isnull(be.Expense,0) <> 0;

   -- 3 Purchase_Invoice Info
   SELECT Convert(varchar(10), pi.[Invoice_Date],111) as Invoice_Date
   , pi.Invoice_No
   , pi.Invoice_Price
   , pi.Tax
   , b.SupplierID
   , b.Term
   , Convert(varchar(07), pi.[Invoice_Date],111) as Invoice_Month 
   --, Year([Invoice_Date]) + '/' + Right('0' + Month([Invoice_Date]),2) AS Invoice_Month 
   FROM Purchase_Invoice pi with(NoLock,NoWait) 
   INNER JOIN Bill b with(NoLock,NoWait) ON pi.Bill_NO = b.Bill_NO 
   WHERE b.Term = @Term and b.SupplierID = @SupplierID
   
   -- 4 Detail Produce Info
   SELECT pd.Purchase_DetailID,
   pd.Produce_No,
   round(sum(pd.Qty),0) as Qty   
   FROM Stock_In si with(NoLock,NoWait) 
   INNER JOIN Stock_In_Detail sd with(NoLock,NoWait) ON sd.Stock_In_No = si.Stock_In_No
   Inner Join Purchase_Detail_Sub pd with(NoLock,NoWait) ON sd.Purchase_DetailID = pd.Purchase_DetailID
   WHERE si.Bill_No = @Bill_No 
   And (si.Purpose <> 'Adjust')
   And sd.Charge_Qty <> 0 
   AND sd.Unit_Price <> 0 
   Group by pd.Purchase_DetailID, pd.Produce_No
   `, req.body) ; 

   //console.log(strSQL)
   db.sql(req.SiteDB, strSQL)
      .then((result) => { 
         var DataSet = {Bill_Info: result.recordsets[0]
            , Report_Purpose: []
            , Expense_Info: result.recordsets[2]
            , Purchase_Invoice_Info: result.recordsets[3]            
            , Report_Expense_Total: {Expense:0}
            , Purchase_Invoice_Purpose: {Invoice_Month:'', Total_Price:0, Total_Tax:0, Total_Amount:0}
            , Purchase_Invoice_Total: {Total_Price:0, Total_Tax:0, Total_Amount:0}
         };
         
         // Report_Purpose
         DataSet.Report_Purpose = [...result.recordsets[1].reduce((r, e) => {
            let k = `${e.Department}|${e.Currency}|${e.Purpose}`;
            if (!r.has(k)) {
              // console.log(r)
              r.set(k, { Department: e.Department,
               Currency: e.Currency,
               Purpose: e.Purpose,
               SupplierID: e.SupplierID,
               AccountID: e.AccountID,
               Uni_Tax_Code: e.Uni_Tax_Code,
               Term: e.Term,
               Payment_Terms: e.Payment_Terms,
               Sample_Discount: e.Sample_Discount,
               Total_Tax: e.Tax,
               Total_Amount: e.S_Amount,
               G_Total_Amount: e.S_Amount ,
              })
            } else {
               r.get(k).Total_Tax += e.Tax;
               r.get(k).Total_Amount += e.S_Amount;
               r.get(k).G_Total_Amount += e.S_Amount ;
            }
            return r;
          }, new Map).values()]

         // Report_Detail
         DataSet.Report_Purpose.forEach((item)=>{
            var Detail = result.recordsets[1].filter((data)=>(data.Department == item.Department && data.Currency == item.Currency && data.Purpose == item.Purpose && data.Stock_In_No != null));
            item.Expense = result.recordsets[2].filter((data)=>(data.Department == item.Department && data.Currency == item.Currency && data.Purpose == item.Purpose));

            item.G_Total_Amount = 0

            var Total_Expense = 0;
            item.Expense.forEach((d)=>{
               d.Expense = d.Expense * (d.Source_Amount == 0 ? 1 : (item.Total_Amount / d.Source_Amount))
               Total_Expense += d.Expense;
            })
            
            //item.Expense = Expense.map((obj)=>(`${obj.Description} ${obj.Expense}`)).join(', ');
            item.Total_Expense = Total_Expense;
            DataSet.Report_Expense_Total.Expense += item.Total_Expense;

            var Tax = [...Detail.reduce((r, e) => {
               let k = `${e.Stock_In_No}`;
               if (!r.has(k)) {
                 // console.log(r)
                 r.set(k, {Stock_In_No: e.Stock_In_No, 
                  Tax: e.Tax,
                 })
               } else {
                  
               }
               return r;
             }, new Map).values()];
            var Total_Tax = 0;
            Tax.forEach((d)=>{
               Total_Tax += d.Tax;
            })
            item.Total_Tax = Total_Tax;

            item.G_Total_Amount = Total_Tax + Total_Expense + item.Total_Amount;           

            var L2_Material_Category =  [...Detail.reduce((r, e) => {
               let k = `${e.L2_Material_Category}`;
               if (!r.has(k)) {
                 // console.log(r)
                 r.set(k, {
                  L2_Material_Category: e.L2_Material_Category,
                 })
               } else {
                  
               }
               return r;
             }, new Map).values()];

            item.L2_Material_Category = L2_Material_Category.map((obj)=>(obj.L2_Material_Category)).join(' + ');
            item.Report_Detail_Unit = [...Detail.reduce((r, e) => {
               let k = `${e.Unit}`;
               if (!r.has(k)) {
                 // console.log(r)
                 r.set(k, { Unit: e.Unit,
                  Total_Charge_Qty: e.Charge_Qty,
                 })
               } else {
                  r.get(k).Total_Charge_Qty += e.Charge_Qty;
               }
               return r;
             }, new Map).values()];
            item.Report_Detail_Purpose = [...Detail.reduce((r, e) => {
               let k = `${e.Status}`;
               if (!r.has(k)) {
                 // console.log(r)
                 r.set(k, { Status: e.Status,
                  Total_Amount: e.S_Amount,
                 })
               } else {
                  r.get(k).Total_Amount += e.S_Amount;
               }
               return r;
             }, new Map).values()];
            item.Report_Detail_Purpose.forEach((obj)=>{ 
                  var sub_Detail = Detail.filter((data)=>(data.Status == obj.Status && data.UserID != null));
                  obj.UserID_Purpose = [...sub_Detail.reduce((r, e) => {
                     let k = `${e.UserID}`;
                     if (!r.has(k)) {
                       // console.log(r)
                       r.set(k, { UserID: e.UserID,
                        Total_Amount: e.S_Amount,
                       })
                     } else {
                        r.get(k).Total_Amount += e.S_Amount;
                     }
                     return r;
                   }, new Map).values()];

                   obj.UserID_Purpose.forEach((data)=>{ 
                     var Detail_Info = sub_Detail.filter((dataitem)=>(dataitem.UserID == data.UserID));
                     data.Detail = []
                     Detail_Info.forEach((o)=>{
                        data.Detail.push({
                           Purchase_Project_No: o.Purchase_Project_No,
                           Purchase_DetailID: o.Purchase_DetailID,
                           Material_With_Rmk: o.Material_With_Rmk,
                           Unit: o.Unit,
                           Qty: o.Qty,
                           Project_Qty: o.Project_Qty,
                           Stock_In_Date: o.Stock_In_Date,
                           Stock_In_No: o.Stock_In_No,
                           Charge_Qty: o.Charge_Qty,
                           Unit_Price: o.Unit_Price,
                           Price_Rate: o.Price_Rate,
                           S_Amount: o.S_Amount,
                           Over_Charge_Qty_Rate: o.Over_Charge_Qty_Rate,
                           Difference:'',
                           Produce_Info:[]
                        })

                        if(o.Qty != o.Project_Qty) {
                           var dataitem = {
                              Purchase_Project_No: '',
                              Purchase_DetailID: '',
                              Material_With_Rmk: '',
                              Unit: '',
                              Qty: o.Qty,
                              Project_Qty: o.Project_Qty,
                              Stock_In_Date: '',
                              Stock_In_No: '',
                              Charge_Qty: '',
                              Unit_Price: '',
                              S_Amount: '',
                              Over_Charge_Qty_Rate: '',
                              Difference: `E.Purchase Qty=${Math.round(o.Project_Qty * 100)/100} Difference=${Math.round((o.Qty - o.Project_Qty)* 100)/100}`,
                              Produce_Info:[]
                           }                           
                           data.Detail.push(dataitem)
                        } 
                        if(req.body.Produce_Info == 1) {
                           var Produce_Info = result.recordsets[4].filter((d)=>(d.Purchase_DetailID == o.Purchase_DetailID))
                           var dataitem = {
                              Purchase_Project_No: '',
                              Purchase_DetailID: '',
                              Material_With_Rmk: '',
                              Unit: '',
                              Qty: '',
                              Project_Qty: '',
                              Stock_In_Date: '',
                              Stock_In_No: '',
                              Charge_Qty: '',
                              Unit_Price: '',
                              S_Amount: '',
                              Over_Charge_Qty_Rate: '',
                              Difference:'',
                              Produce_Info: Produce_Info
                           }                           
                           Produce_Info.length > 0 ? data.Detail.push(dataitem):''
                        }                        
                        
                      })
                   });
                  
             })
         })

         // Report_Expense_Total
         DataSet.Report_Expense_Total.Expense = Math.round(DataSet.Report_Expense_Total.Expense * 100)/100;         

         // Purchase_Invoice_Purpose
         DataSet.Purchase_Invoice_Purpose = [...DataSet.Purchase_Invoice_Info.reduce((r, e) => {
            let k = `${e.Invoice_Month}`;
            if (!r.has(k)) {
               // console.log(r)
               r.set(k, { Invoice_Month: e.Invoice_Month,
                Total_Price: e.Invoice_Price,
                Total_Tax: e.Tax,
                Total_Amount: e.Invoice_Price + e.Tax,
               })
             } else {
                r.get(k).Total_Price += e.Invoice_Price;
                r.get(k).Total_Tax += e.Tax;
                r.get(k).Total_Amount += e.Invoice_Price + e.Tax;
             }
             return r;
          }, new Map).values()]

          // Purchase_Invoice_Total
         DataSet.Purchase_Invoice_Purpose.forEach((item)=>{
            item.Total_Price = Math.round(item.Total_Price * 100)/100
            item.Total_Tax = Math.round(item.Total_Tax * 100)/100
            item.Total_Amount = Math.round(item.Total_Amount * 100)/100
            
            DataSet.Purchase_Invoice_Total.Total_Price += item.Total_Price;
            DataSet.Purchase_Invoice_Total.Total_Tax += item.Total_Tax;
            DataSet.Purchase_Invoice_Total.Total_Amount += item.Total_Amount;
         })
      //console.log(DataSet)
         res.send(DataSet);
      }).catch((err) => {
         console.log(err);
         res.status(500).send(err);
      })
});

//Get Term Payment List Report Info
router.post('/Term_Payment_List_Report_Info',  function (req, res, next) {
   console.log("Call Term_Payment_List_Report_Info Api:",req.body);  
 
   req.body.Mode = req.body.Mode ? req.body.Mode : '0';
   req.body.Bill_No = req.body.Bill_No ? `N'${req.body.Bill_No.trim().replace(/'/g, "''")}'` : `''`;
   req.body.Term = req.body.Term ? `N'${req.body.Term.trim().replace(/'/g, "''")}'` : `''`;
    
   //Mode == 0 Purchase Bill Report
   var strSQL = format(`Declare @Mode int = {Mode}, @Bill_No nvarchar(20) = {Bill_No}, @Term varchar(10) = {Term};
   `, req.body) ; 

   switch(req.body.Mode) {
      case '0':
      case '1':         
      strSQL += format(`
         SELECT AccountID
         , SupplierID
         , Department   
         , Currency 
         , sum(isnull(Merchandise,0)) as Merchandise
         , sum(isnull(Others,0)) as Others
         , sum(isnull(Sample,0)) as Sample
         , sum(isnull(Tax,0)) as Tax
         , sum(isnull(Merchandise,0)) + sum(isnull(Others,0)) + sum(isnull(Sample,0)) + sum(isnull(Tax,0)) as Amount
         FROM  
         (
            Select s.AccountID
            , si.SupplierID
            , si.Department
            , si.Currency
            , si.Purpose
            , si.Tax
            , sum(si.Price) as Amount
            From Stock_In si with(NoLock,NoWait)
            left outer join Supplier s with(NoLock,NoWait) ON si.SupplierID = s.SupplierID
            Where si.Purpose <> 'Adjust'
            And si.Term = @Term
            Group by s.AccountID, si.SupplierID, si.Department, si.Currency, si.Purpose, si.Tax
         ) AS tmp  
         PIVOT  
         (  
             Sum(Amount) 
             FOR Purpose IN (Merchandise, Others, Sample)  
         ) AS PivotTable
         Group by Department, Currency, AccountID, SupplierID
         Order by Department, Currency, AccountID, SupplierID;        
         
         SELECT Term
         , AccountID
         , SupplierID
         , Department   
         , Currency 
         , sum(isnull(Merchandise,0)) as Merchandise
         , sum(isnull(Others,0)) as Others
         , sum(isnull(Sample,0)) as Sample
         , sum(isnull(Tax,0)) as Tax
         , sum(isnull(Merchandise,0)) + sum(isnull(Others,0)) + sum(isnull(Sample,0)) + sum(isnull(Tax,0)) as Amount
         FROM  
         (
            Select substring(si.Term,1,7) as Term
            , s.AccountID
            , si.SupplierID
            , si.Department
            , si.Currency
            , si.Purpose
            , si.Tax
            , sum(si.Price) as Amount
            From Stock_In si with(NoLock,NoWait)
            left outer join Supplier s with(NoLock,NoWait) ON si.SupplierID = s.SupplierID
            Where si.Purpose <> 'Adjust'
            And substring(si.Term,1,7) > @Term
            And Convert(varchar(07), si.Stock_In_Date,111) <= @Term
            Group by substring(si.Term,1,7), s.AccountID, si.SupplierID, si.Department, si.Currency, si.Purpose, si.Tax
         ) AS tmp  
         PIVOT  
         (  
             Sum(Amount) 
             FOR Purpose IN (Merchandise, Others, Sample)  
         ) AS PivotTable
         Group by Term, AccountID, SupplierID, Department, Currency
         Order by  Currency, Term, Department, AccountID, SupplierID;

         Select (Select OrganizationID From [CONTROL]) AS OrganizationID         
         `, req.body) ;
      break;
      case '2':
         strSQL += format(`
          `, req.body) ;
      break;
   }    

   //console.log(strSQL)
   db.sql(req.SiteDB, strSQL)
      .then((result) => { 
         var DataSet = {}
         switch(req.body.Mode) {
            case '0':
               DataSet = {Report_Info: result.recordsets[0]
                  , Report_Info_Purpose: []
                  , Report_Info_Total: []
                  , OrganizationID: result.recordsets[2][0].OrganizationID
               };
              
               DataSet.Report_Info.forEach((item)=>{
                  item.Merchandise = Math.round(item.Merchandise * 100)/100
                  item.Others = Math.round(item.Others * 100)/100
                  item.Sample = Math.round(item.Sample * 100)/100
                  item.Tax = Math.round(item.Tax * 100)/100
                  item.Amount = Math.round(item.Amount * 100)/100
               })

               DataSet.Report_Info_Purpose = [...DataSet.Report_Info.reduce((r, e) => {
                  let k = `${e.Department}|${e.Currency}`;
                  if (!r.has(k)) {
                    // console.log(r)           
                    r.set(k, { Department: e.Department,
                     Currency: e.Currency,
                     Total_Merchandise: e.Merchandise,
                     Total_Others: e.Others,
                     Total_Sample: e.Sample,
                     Total_Tax: e.Tax,
                     Total_Amount: e.Amount,
                    })
                  } else {
                     r.get(k).Total_Merchandise += e.Merchandise;
                     r.get(k).Total_Others += e.Others;
                     r.get(k).Total_Sample += e.Sample;
                     r.get(k).Total_Tax += e.Tax;
                     r.get(k).Total_Amount += e.Amount;
                  }
                  return r;
                }, new Map).values()]

                DataSet.Report_Info_Purpose.forEach((item)=>{
                  item.Total_Merchandise = Math.round(item.Total_Merchandise * 100)/100
                  item.Total_Others = Math.round(item.Total_Others * 100)/100
                  item.Total_Sample = Math.round(item.Total_Sample * 100)/100
                  item.Total_Tax = Math.round(item.Total_Tax * 100)/100
                  item.Total_Amount = Math.round(item.Total_Amount * 100)/100
               })

               DataSet.Report_Info_Total = [...DataSet.Report_Info_Purpose.reduce((r, e) => {
                  let k = `${e.Currency}`;
                  if (!r.has(k)) {
                    // console.log(r)           
                    r.set(k, {
                     Currency: e.Currency,
                     G_Total_Merchandise: e.Total_Merchandise,
                     G_Total_Others: e.Total_Others,
                     G_Total_Sample: e.Total_Sample,
                     G_Total_Tax: e.Total_Tax,
                     G_Total_Amount: e.Total_Amount,
                    })
                  } else {
                     r.get(k).G_Total_Merchandise += e.Total_Merchandise;
                     r.get(k).G_Total_Others += e.Total_Others;
                     r.get(k).G_Total_Sample += e.Total_Sample;
                     r.get(k).G_Total_Tax += e.Total_Tax;
                     r.get(k).G_Total_Amount += e.Total_Amount;
                  }
                  return r;
                }, new Map).values()]

                DataSet.Report_Info_Total.forEach((item)=>{
                  item.G_Total_Merchandise = Math.round(item.G_Total_Merchandise * 100)/100
                  item.G_Total_Others = Math.round(item.G_Total_Others * 100)/100
                  item.G_Total_Sample = Math.round(item.G_Total_Sample * 100)/100
                  item.G_Total_Tax = Math.round(item.G_Total_Tax * 100)/100
                  item.G_Total_Amount = Math.round(item.G_Total_Amount * 100)/100
               })
            break;
            case '1':
               DataSet = {Report_Info: result.recordsets[0]
                  , Report_Info_Purpose: []
                  , Report_Info_Total: []
                  , Report_Detail: result.recordsets[1]
                  , Report_Detail_Purpose: []
                  , Report_Detail_Sub_Total: []
                  , Report_Detail_Total: []
                  , OrganizationID: result.recordsets[2][0].OrganizationID
               };
              
               DataSet.Report_Info.forEach((item)=>{
                  item.Merchandise = Math.round(item.Merchandise * 100)/100
                  item.Others = Math.round(item.Others * 100)/100
                  item.Sample = Math.round(item.Sample * 100)/100
                  item.Tax = Math.round(item.Tax * 100)/100
                  item.Amount = Math.round(item.Amount * 100)/100
               })

               DataSet.Report_Info_Purpose = [...DataSet.Report_Info.reduce((r, e) => {
                  let k = `${e.Department}|${e.Currency}`;
                  if (!r.has(k)) {
                    // console.log(r)           
                    r.set(k, { Department: e.Department,
                     Currency: e.Currency,
                     Total_Merchandise: e.Merchandise,
                     Total_Others: e.Others,
                     Total_Sample: e.Sample,
                     Total_Tax: e.Tax,
                     Total_Amount: e.Amount,
                    })
                  } else {
                     r.get(k).Total_Merchandise += e.Merchandise;
                     r.get(k).Total_Others += e.Others;
                     r.get(k).Total_Sample += e.Sample;
                     r.get(k).Total_Tax += e.Tax;
                     r.get(k).Total_Amount += e.Amount;
                  }
                  return r;
                }, new Map).values()]

               DataSet.Report_Info_Purpose.forEach((item)=>{
                  item.Total_Merchandise = Math.round(item.Total_Merchandise * 100)/100
                  item.Total_Others = Math.round(item.Total_Others * 100)/100
                  item.Total_Sample = Math.round(item.Total_Sample * 100)/100
                  item.Total_Tax = Math.round(item.Total_Tax * 100)/100
                  item.Total_Amount = Math.round(item.Total_Amount * 100)/100
               })

               DataSet.Report_Info_Total = [...DataSet.Report_Info_Purpose.reduce((r, e) => {
                  let k = `${e.Currency}`;
                  if (!r.has(k)) {
                    // console.log(r)           
                    r.set(k, {
                     Currency: e.Currency,
                     G_Total_Merchandise: e.Total_Merchandise,
                     G_Total_Others: e.Total_Others,
                     G_Total_Sample: e.Total_Sample,
                     G_Total_Tax: e.Total_Tax,
                     G_Total_Amount: e.Total_Amount,
                    })
                  } else {
                     r.get(k).G_Total_Merchandise += e.Total_Merchandise;
                     r.get(k).G_Total_Others += e.Total_Others;
                     r.get(k).G_Total_Sample += e.Total_Sample;
                     r.get(k).G_Total_Tax += e.Total_Tax;
                     r.get(k).G_Total_Amount += e.Total_Amount;
                  }
                  return r;
                }, new Map).values()]

               DataSet.Report_Info_Total.forEach((item)=>{
                  item.G_Total_Merchandise = Math.round(item.G_Total_Merchandise * 100)/100
                  item.G_Total_Others = Math.round(item.G_Total_Others * 100)/100
                  item.G_Total_Sample = Math.round(item.G_Total_Sample * 100)/100
                  item.G_Total_Tax = Math.round(item.G_Total_Tax * 100)/100
                  item.G_Total_Amount = Math.round(item.G_Total_Amount * 100)/100
               })

               DataSet.Report_Detail.forEach((item)=>{
                  item.Merchandise = Math.round(item.Merchandise * 100)/100
                  item.Others = Math.round(item.Others * 100)/100
                  item.Sample = Math.round(item.Sample * 100)/100
                  item.Tax = Math.round(item.Tax * 100)/100
                  item.Total_Amount = Math.round(item.Total_Amount * 100)/100
               })
                
               DataSet.Report_Detail_Total = [...DataSet.Report_Detail.reduce((r, e) => {
                  let k = `${e.Term}|${e.Currency}`;
                  if (!r.has(k)) {
                    // console.log(r)           
                    r.set(k, { Term: e.Term,
                      Currency: e.Currency,
                     Total_Merchandise: e.Merchandise,
                     Total_Others: e.Others,
                     Total_Sample: e.Sample,
                     Total_Tax: e.Tax,
                     Total_Amount: e.Amount,
                    })
                  } else {
                     r.get(k).Total_Merchandise += e.Merchandise;
                     r.get(k).Total_Others += e.Others;
                     r.get(k).Total_Sample += e.Sample;
                     r.get(k).Total_Tax += e.Tax;
                     r.get(k).Total_Amount += e.Amount;
                  }
                  return r;
               }, new Map).values()]

               DataSet.Report_Detail_Total.forEach((item)=>{
                  item.Total_Merchandise = Math.round(item.Total_Merchandise * 100)/100
                  item.Total_Others = Math.round(item.Total_Others * 100)/100
                  item.Total_Sample = Math.round(item.Total_Sample * 100)/100
                  item.Total_Tax = Math.round(item.Total_Tax * 100)/100
                  item.Total_Amount = Math.round(item.Total_Amount * 100)/100
               })


               DataSet.Report_Detail_Sub_Total = [...DataSet.Report_Detail.reduce((r, e) => {
                  let k = `${e.Term}|${e.Department}|${e.Currency}`;
                  if (!r.has(k)) {
                    // console.log(r)           
                    r.set(k, { Term: e.Term,            
                      Department: e.Department,
                      Currency: e.Currency,
                     Total_Merchandise: e.Merchandise,
                     Total_Others: e.Others,
                     Total_Sample: e.Sample,
                     Total_Tax: e.Tax,
                     Total_Amount: e.Amount,
                    })
                  } else {
                     r.get(k).Total_Merchandise += e.Merchandise;
                     r.get(k).Total_Others += e.Others;
                     r.get(k).Total_Sample += e.Sample;
                     r.get(k).Total_Tax += e.Tax;
                     r.get(k).Total_Amount += e.Amount;
                  }
                  return r;
               }, new Map).values()]

               DataSet.Report_Detail_Sub_Total.forEach((item)=>{
                  item.Total_Merchandise = Math.round(item.Total_Merchandise * 100)/100
                  item.Total_Others = Math.round(item.Total_Others * 100)/100
                  item.Total_Sample = Math.round(item.Total_Sample * 100)/100
                  item.Total_Tax = Math.round(item.Total_Tax * 100)/100
                  item.Total_Amount = Math.round(item.Total_Amount * 100)/100
               })

                DataSet.Report_Detail_Purpose = [...DataSet.Report_Detail_Total.reduce((r, e) => {
                  let k = `${e.Term}`;
                  if (!r.has(k)) {
                    // console.log(r)           
                    r.set(k, { Term: e.Term,
                    })
                  } else {
                  }
                  return r;
                }, new Map).values()]
            break;
            case '2':
            break;
         }    
      //console.log(DataSet)
         res.send(DataSet);
      }).catch((err) => {
         console.log(err);
         res.status(500).send(err);
      })
});
     
//Get Stock_In_Supplier_Monthly_Report_Info
router.post('/Stock_In_Supplier_Monthly_Report_Info',  function (req, res, next) {
   console.log("Call Stock_In_Supplier_Monthly_Report_Info Api:",req.body);  
 
   req.body.Mode = req.body.Mode ? req.body.Mode : 0;
   req.body.Stock_In_No = req.body.Stock_In_No ? req.body.Stock_In_No : null;

   //Mode == 0 Purchase Bill Report
   var strSQL = format(`Declare @Mode int = {Mode}, @Stock_In_No int = {Stock_In_No};

   -- 0 Detail Info
   SELECT s.AccountID
   , pd.Purchase_Project_No
   , si.SupplierID
   , isnull(s.Uni_Tax_Code,'') as Uni_Tax_Code
   , isnull(s.Payment_Terms,'') as Payment_Terms
   , p.Currency
   , si.Department
   , pd.Purchase_No
   , si.Purpose
   , si.Term
   , pd.Project_Qty
   , pd.Qty
   , [Material_Category] + ' ' + [Material_Specific] + ' ' + pd.[Material_Color] AS Material
   , [Material_Category] + ' ' + [Material_Specific] + ' ' + pd.[Material_Color] + IIf(IsNull([Memo],'') = '', '','  ★★' + [Memo] + '★★') AS Material_With_Rmk
   , pd.Unit
   , sd.Purchase_DetailID
   , Sum((sd.[Unit_Price]*[Charge_Qty])) AS S_Amount
   , IIf([Qty]-[Stock_In_Qty]<=0,'Delivery Finished','Delivery Pending') AS Status
   , pd.Stock_In_Qty
   , Round([Qty]-[Stock_In_Qty],2) AS Not_In_Qty
   , [Charge_In_Qty]-[Qty] AS Over_Charge_Qty
   , case when isnull([Charge_In_Qty],0)-isnull([Qty],0) >= 0 then '(+' + cast(isnull([Charge_In_Qty],0)-isnull([Qty],0) as varchar) else '(' + cast(isnull([Charge_In_Qty],0)-isnull([Qty],0) as varchar) End
   +' '+ cast(cast((isnull([Charge_In_Qty],0)-isnull([Qty],0)) / isnull([Qty],0) * 100 as int) as varchar) + '%)' AS Over_Charge_Qty_Rate
   , si.Bill_No
   , p.UserID    
   , Right(convert(varchar(10), si.Stock_In_Date,111),5) as Stock_In_Date
   , sd.[Unit_Price]
   , sd.Stock_In_No
   , si.Tax
   , sd.Charge_Qty
   , mc.Purchase_Price   
   FROM Stock_In_Detail sd with(NoLock,NoWait) 
   INNER JOIN Stock_In si with(NoLock,NoWait) ON sd.Stock_In_No = si.Stock_In_No
   LEFT JOIN Purchase_Detail pd with(NoLock,NoWait) ON sd.Purchase_DetailID = pd.Purchase_DetailID
   LEFT JOIN Purchase p with(NoLock,NoWait) ON pd.Purchase_No = p.Purchase_No 
   INNER JOIN Supplier s ON si.SupplierID = s.SupplierID 
   INNER JOIN Material_Color mc with(NoLock,NoWait) on mc.Material_ColorID = sd.Material_ColorID
   WHERE sd.Charge_Qty<>0 
   AND sd.Unit_Price <>0 
   And (si.Purpose <> 'Adjust') 
   AND (si.Bill_No Is Not Null)
   And si.Stock_In_No = @Stock_In_No
   GROUP BY  s.AccountID
   , pd.Purchase_Project_No
   , si.SupplierID
   , s.Uni_Tax_Code
   , s.Payment_Terms
   , p.Currency
   , si.Department
   , pd.Purchase_No
   , si.Purpose
   , si.Term
   , pd.Project_Qty
   , pd.Qty
   , [Material_Category] + ' ' + [Material_Specific] + ' ' + pd.[Material_Color] 
   , [Material_Category] + ' ' + [Material_Specific] + ' ' + pd.[Material_Color] + IIf(IsNull([Memo],'') = '', '','  ★★' + [Memo] + '★★')
   , pd.Unit
   , sd.Purchase_DetailID
   , IIf([Qty]-[Stock_In_Qty]<=0,'Delivery Finished','Delivery Pending') 
   , pd.Stock_In_Qty
   , Round([Qty]-[Stock_In_Qty],2) 
   , [Charge_In_Qty]-[Qty] 
   , case when isnull([Charge_In_Qty],0)-isnull([Qty],0) >= 0 then '(+' + cast(isnull([Charge_In_Qty],0)-isnull([Qty],0) as varchar) else '(' + cast(isnull([Charge_In_Qty],0)-isnull([Qty],0) as varchar) End
   +' '+ cast(cast((isnull([Charge_In_Qty],0)-isnull([Qty],0)) / isnull([Qty],0) * 100 as int) as varchar) + '%)'
   , si.Bill_No
   , p.UserID
   , Right(convert(varchar(10), si.Stock_In_Date,111),5)
   , sd.[Unit_Price]
   , sd.Stock_In_No
   , si.Tax
   , sd.Charge_Qty
   , mc.Purchase_Price
   Order By SupplierID, Department, Currency, Purpose, Status, UserID, Purchase_Project_No, Purchase_No, Material, Purchase_detailID
     
   -- 1 Detail Produce Info
   SELECT pd.Purchase_DetailID,
   pd.Produce_No,
   round(sum(pd.Qty),0) as Qty   
   FROM Stock_In si with(NoLock,NoWait) 
   INNER JOIN Stock_In_Detail sd with(NoLock,NoWait) ON sd.Stock_In_No = si.Stock_In_No
   Inner Join Purchase_Detail_Sub pd with(NoLock,NoWait) ON sd.Purchase_DetailID = pd.Purchase_DetailID
   WHERE si.Stock_In_No = @Stock_In_No
   And (si.Purpose <> 'Adjust')
   And sd.Charge_Qty <> 0 
   AND sd.Unit_Price <> 0 
   Group by pd.Purchase_DetailID, pd.Produce_No
   `, req.body) ; 

   //console.log(strSQL)
   db.sql(req.SiteDB, strSQL)
      .then((result) => { 
         var DataSet = {Report_Purpose: []            
         };
         
         // Report_Purpose
         DataSet.Report_Purpose = [...result.recordsets[0].reduce((r, e) => {
            let k = `${e.SupplierID}|${e.Currency}`;
            if (!r.has(k)) {
              // console.log(r)
              r.set(k, { Department: e.Department,
               Currency: e.Currency,
               SupplierID: e.SupplierID,
               Uni_Tax_Code: e.Uni_Tax_Code,
               Term: e.Term,
               Payment_Terms: e.Payment_Terms,
               Total_Tax: e.Tax,
               Total_Amount: e.S_Amount,
               G_Total_Amount: e.S_Amount + e.Tax,
              })
            } else {
               r.get(k).Total_Tax += e.Tax;
               r.get(k).Total_Amount += e.S_Amount;
               r.get(k).G_Total_Amount += e.S_Amount + e.Tax;
            }
            return r;
          }, new Map).values()]

         // Report_Detail
         DataSet.Report_Purpose.forEach((item)=>{
            var Report_Detail = result.recordsets[0].filter((data)=>(data.Currency == item.Currency));

            var Tax = [...Report_Detail.reduce((r, e) => {
               let k = `${e.Stock_In_No}`;
               if (!r.has(k)) {
                 // console.log(r)
                 r.set(k, {Stock_In_No: e.Stock_In_No, 
                  Tax: e.Tax,
                 })
               } else {
                  
               }
               return r;
             }, new Map).values()];
            var Total_Tax = 0;
            Tax.forEach((d)=>{
               Total_Tax += d.Tax;
            })
            item.Total_Tax = Total_Tax;

            item.Report_Detail = [];            
            Report_Detail.forEach((o, idx, arr)=>{               
               item.Report_Detail.push({
                  Purchase_Project_No: o.Purchase_Project_No,
                  Purchase_DetailID: o.Purchase_DetailID,
                  Material_With_Rmk: o.Material_With_Rmk,
                  Unit: o.Unit,
                  Qty: o.Qty,
                  Project_Qty: o.Project_Qty,
                  Stock_In_Date: o.Stock_In_Date,
                  Stock_In_No: o.Stock_In_No,
                  Charge_Qty: o.Charge_Qty,
                  Unit_Price: o.Unit_Price,
                  S_Amount: o.S_Amount,
                  Over_Charge_Qty_Rate: o.Over_Charge_Qty_Rate,
                  Difference:'',
                  Produce_Info:[]
               })

               if(o.Qty != o.Project_Qty) {
                  var dataitem = {
                     Purchase_Project_No: '',
                     Purchase_DetailID: '',
                     Material_With_Rmk: '',
                     Unit: '',
                     Qty: o.Qty,
                     Project_Qty: o.Project_Qty,
                     Stock_In_Date: '',
                     Stock_In_No: '',
                     Charge_Qty: '',
                     Unit_Price: '',
                     S_Amount: '',
                     Over_Charge_Qty_Rate: '',
                     Difference: `E.Purchase Qty=${Math.round(o.Project_Qty * 100)/100} Difference=${Math.round((o.Qty - o.Project_Qty)* 100)/100}`,
                     Produce_Info:[]
                  }
                  item.Report_Detail.push(dataitem)
               }

               var Produce_Info = result.recordsets[1].filter((d)=>(d.Purchase_DetailID == o.Purchase_DetailID))
               if(Produce_Info.length > 0) {
                  var dataitem = {
                     Purchase_Project_No: '',
                     Purchase_DetailID: '',
                     Material_With_Rmk: '',
                     Unit: '',
                     Qty: '',
                     Project_Qty: '',
                     Stock_In_Date: '',
                     Stock_In_No: '',
                     Charge_Qty: '',
                     Unit_Price: '',
                     S_Amount: '',
                     Over_Charge_Qty_Rate: '',
                     Difference: ``,
                     Produce_Info: Produce_Info
                  }                  
                  item.Report_Detail.push(dataitem)
               }
            })
         })
      //console.log(DataSet)
         res.send(DataSet);
      }).catch((err) => {
         console.log(err);
         res.status(500).send(err);
      })
});

//Get Purchase_Bill_Payment_List
router.post('/Stock_In_Supplier_Monthly_List',  function (req, res, next) {
   console.log("Call Stock_In_Supplier_Monthly_List Api:", req.body);

   req.body.Bill_No = req.body.Bill_No ? `N'${req.body.Bill_No.trim().replace(/'/g, "''")}'` : `''`;
   req.body.Term = req.body.Term ? `N'${req.body.Term.trim().replace(/'/g, "''")}'` : `''`;
   req.body.SupplierID = req.body.SupplierID ? `N'${req.body.SupplierID.trim().replace(/'/g, "''")}'` : `''`;

   var strSQL = format(`
   Declare @Bill_No nvarchar(20) = {Bill_No}, @Term varchar(10) = {Term}, @SupplierID nvarchar(15) = {SupplierID}

   Select s.Term
   , p.Purchase_Project_No
   , p.UserID as Purchaser
   , s.SupplierID
   , s.Stock_In_No
   , s.Department
   , s.Purpose
   , s.Currency
   , Sum((sd.[Unit_Price]*sd.[Charge_Qty])) AS S_Amount
   , s.Price
   , s.Tax
   , isnull(Sum((sd.[Unit_Price]*sd.[Charge_Qty])),0) + isnull(s.Tax,0) as Total
   , s.UserID
   From Stock_In s with(NoLock,NoWait)
   Inner Join Stock_In_Detail sd with(NoLock,NoWait) on s.Stock_In_No = sd.Stock_In_No
   Left Outer Join Purchase_Detail pd with(NoLock,NoWait) ON sd.Purchase_DetailID = pd.Purchase_DetailID
   Left Outer Join Purchase p with(NoLock,NoWait) ON pd.Purchase_No = p.Purchase_No
   Where (@Bill_No = '' or s.Bill_No = @Bill_No)
   And s.Term = @Term
   And s.SupplierID = @SupplierID
   Group by  s.Term
   , p.Purchase_Project_No
   , p.UserID
   , s.SupplierID
   , s.Stock_In_No
   , s.Department
   , s.Purpose
   , s.Currency
   , s.Price
   , s.Tax
   , s.UserID
   Order by p.Purchase_Project_No, Stock_In_No desc, S_Amount desc;
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
               Total_S_Amount: e.S_Amount,
               Total_Tax_Amount: e.Tax,
               Total_Amount: e.Total,
              })
            } else {
               r.get(k).Total_S_Amount += e.S_Amount;
               r.get(k).Total_Tax_Amount += e.Tax;
               r.get(k).Total_Amount += e.Total;
            }
            return r;
          }, new Map).values()]

          DataSet.Currency_Info.forEach((item)=>{
            item.Total_S_Amount = Math.round(item.Total_S_Amount * 10000)/10000;
            item.Total_Tax_Amount = Math.round(item.Total_Tax_Amount * 10000)/10000;
            item.Total_Amount = Math.round(item.Total_Amount * 10000)/10000;
         }) 

         res.send(DataSet);
      }).catch((err) => {
         console.log(err);
         res.status(500).send(err);
      })

});

//Get Bill Accounting_Item_No = 1140 and 2122
router.post('/Bill_Accounting_Item',  function (req, res, next) {
   console.log("Call Bill_Accounting_Item Api:",req.body);
  
   var strSQL = format(`
   SELECT ai.[Accounting_Item_No]
   , ai.Item as Accounting_Item_Name
   FROM Accounting_Item ai with(NoLock,NoWait) 
   Where ai.Accounting_Item_No in (1140,2122)
   `, req.body) ;
   //console.log(strSQL)
   db.sql(req.SiteDB, strSQL)
      .then((result) => {

        //console.log(DataSet)
        res.send(result.recordsets[0]);
      }).catch((err) => {
         console.log(err);
         res.status(500).send(err);
      })
});

//Get Purchase_Bill_Payment_List
router.post('/Purchase_Bill_Payment_List',  function (req, res, next) {
   console.log("Call Purchase Bill Payment List Api:", req.body);

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
   , m.Type
   , CustomerID
   , m.Accounting_Item_No
   , m.Currency
   , ai.Item
   , m.Reference_NO
   , m.BankID
   , ISNULL(b.S_Name, '') AS S_Name
   , ISNULL(m.Source_Amount, 0) AS Source_Amount   
   , ISNULL(m.Withdrawal, 0) AS Withdrawal
   , ISNULL(m.MasterID, '') AS MasterID
   , case when isnull(m.[Apply_Date],'') = '' then '' else Convert(varchar(10),m.[Apply_Date],111) end as [Apply_Date]
   , case when isnull(m.[Date],'') = '' then '' else Convert(varchar(10),m.[Date],111) end as [Date]
   , CONVERT (bit, m.Bad_Debt) AS Bad_Debt
   , m.UserID
   , m.[MEMO]
   FROM Money m with(NoLock,NoWait)
   INNER JOIN Bank b with(NoLock,NoWait) ON m.BankID = b.BankID 
   INNER JOIN Accounting_Item ai with(NoLock,NoWait) ON m.Accounting_Item_No = ai.Accounting_Item_No 
   Where 1=1
   --And m.Accounting_Item_No = 2122
   AND (m.Subject = 'Purchase Bill') 
   And (CONVERT (Varchar(20), m.MoneyID) LIKE N'%{MoneyID}%') 
   And (N'{Item}' = '' or ai.Item like N'%{Item}%')
   And (N'{CustomerID}' = '' or m.CustomerID like N'%{CustomerID}%')
   AND (ISNULL(b.S_Name, '') LIKE '%{S_Name}%')
   And (N'{Reference_NO}' = '' or m.Reference_NO like N'%{Reference_NO}%')
   And (N'{Currency}' = '' or m.Currency like N'%{Currency}%')   
   And (N'{Source_Amount}' = '' or cast(ISNULL(m.Source_Amount,0) as decimal(20,2)) LIKE N'%{Source_Amount}%')
   And ((N'{Date_From}' = '' or N'{Date_To}' = '') or convert(date, m.[Apply_Date],111) between N'{Date_From}' And N'{Date_To}')   
   And (N'{Withdrawal}' = '' or cast(ISNULL(m.Withdrawal,0) as decimal(20,2)) LIKE N'%{Withdrawal}%')
   And (N'{UserID}' = '' or m.UserID like N'%{UserID}%')
   And (N'{MEMO}' = '' or m.MEMO like N'%{MEMO}%')
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

//Get Purchase_Bill_Payment_Info
router.post('/Purchase_Bill_Payment_Info',  function (req, res, next) {
   console.log("Call Purchase_Bill_Payment_Info Api:",req.body);
 
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
      Inner Join currency c with(NoLock,NoWait) on c.Currency = s.[Currency]
      WHERE MoneyID = {MoneyID}
   End
   if(@Mode = 0 or @Mode = 2)
   Begin
       Select ms.Money_SourceID
       , ms.[MoneyID]
       , ms.[Source_No] as Bill_No
       , Convert(varchar(10), p.[Bill_Date],111) as [Bill_Date] 
       , p.Term
       , isnull(p.Amount,0) as Pay_Amount
       , isnull(p.Paid_Amount,0) as Paid_Amount
       , isnull(ms.Withdrawal,0) as Withdrawal
       From Money_Source ms with(NoLock, NoWait)
       Inner Join Bill p with(NoLock,NoWait) on ms.Source_No = cast(p.Bill_No as varchar)
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
         var DataSet = {Purchase_Bill_Payment: (req.body.Mode == 0 || req.body.Mode == 1) ? result.recordsets[0] : []
           , Purchase_Bill_Payment_Detail: (req.body.Mode == 0) ? result.recordsets[1] : (req.body.Mode == 2 ? result.recordsets[0] : [])
           , Purchase_Bill_Payment_Expense: (req.body.Mode == 0) ? result.recordsets[2] : (req.body.Mode == 3 ? result.recordsets[0] : [])           
           , Total_Pay_Amount:0
           , Total_Paid_Amount:0
           , Total_Withdrawal_Amount:0
           , Total_Expense_Amount:0
        };

        DataSet.Purchase_Bill_Payment_Detail.forEach((item) => {            
            item.Pay_Amount = Math.round((item.Pay_Amount)*10000)/10000;
            item.Paid_Amount = Math.round((item.Paid_Amount)*10000)/10000;
            item.Withdrawal = Math.round((item.Withdrawal)*10000)/10000;
            DataSet.Total_Pay_Amount += item.Pay_Amount;
            DataSet.Total_Paid_Amount += item.Paid_Amount;
            DataSet.Total_Withdrawal_Amount += item.Withdrawal;
        });

        DataSet.Purchase_Bill_Payment_Expense.forEach((item) => {
            item.Withdrawal = Math.round((item.Withdrawal)*10000)/10000;            
            DataSet.Total_Expense_Amount += item.Withdrawal;
        });
        
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

//Maintain Purchase_Bill_Payment
router.post('/Purchase_Bill_Payment_Maintain',  function (req, res, next) {
   console.log("Call Purchase_Bill_Payment_Maintain Api:",req.body);

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
               , 'Purchase Bill' as Subject, 0 as Bad_Debt
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

//Maintain Purchase_Bill Payment Detail
router.post('/Purchase_Bill_Payment_Detail_Maintain',  function (req, res, next) {
   console.log("Call Purchase_Bill_Payment_Detail_Maintain Api:",req.body);

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

         req.body.Bill.forEach((item)=>{
            strSQL1 += format(`Insert into @tmpDetail (Source_No) values (N'{Bill_No}');`,item)
         })

         strSQL += format(`
         Declare @tmpDetail Table (Source_No varchar(20))

         ${strSQL1}

         Insert [dbo].[Money_Source] (MoneyID, Subject, Source_No, Days, Deposit, Withdrawal)
         Select {MoneyID} as MoneyID, 'Purchase Bill' as Subject, tmp.Source_No , 0 as Days, 0 as Deposit, (isnull(p.Amount ,0) - isnull(p.Paid_Amount,0)) as Withdrawal
         From @tmpDetail tmp
         Inner Join Bill p with(NoLock,NoWait) on tmp.Source_No = p.Bill_No
         Inner Join [Money] m with(NoLock,NoWait) on m.Currency = p.Currency And m.CustomerID = p.SupplierID And m.MoneyID = {MoneyID}
         Left Outer Join (
            Select distinct d.Source_No 
            From Money_Source m with(NoLock, NoWait)
            Inner Join @tmpDetail d on d.Source_No = m.Source_No
            Where m.MoneyID = {MoneyID}
         ) t on t.Source_No = p.Bill_No
         Where t.Source_No is null
         And isnull(p.Amount, 0) - isnull(p.Paid_Amount,0) > 0
        
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

//Maintain Purchase_Bill Payment Expense
router.post('/Purchase_Bill_Payment_Expense_Maintain',  function (req, res, next) {
   console.log("Call Purchase_Bill_Payment_Expense_Maintain Api:",req.body);

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

   if({Mode} = 1 and @ROWCOUNT > 0)
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

//Get Purchase_Bill Payment Detail Add List
router.post('/Purchase_Bill_Payment_Detail_Add_List',  function (req, res, next) {
   console.log("Call Purchase_Bill_Payment_Detail_Add_List Api:",req.body);
   
   req.body.MoneyID = req.body.MoneyID ? req.body.MoneyID : null;
   req.body.Term = req.body.Term ? `'${req.body.Term.trim().replace(/'/g, "''")}'` : `''`;   
   req.body.Bill_No = req.body.Bill_No ? `N'${req.body.Bill_No.trim().replace(/'/g, "''")}'` : `''`;
   req.body.Bill_Date = req.body.Bill_Date ? `'${req.body.Bill_Date.trim().replace(/'/g, "''")}'` : `''`;
      
   var strSQL = format(`
   Declare @tmpDetail table(Bill_No nvarchar(20))
   Insert @tmpDetail
   Select distinct Source_No as Bill_No
   From Money_Source m with(NoLock, NoWait)
   Where m.MoneyID = {MoneyID};
   
   Select cast(0 as bit) as flag, '' as Query, p.Bill_No, p.Term
   , p.SupplierID, convert(nvarchar(10), p.Bill_Date,111) as Bill_Date
   , p.Amount as Pay_Amount, p.Paid_Amount, isnull(p.Amount, 0) - isnull(p.Paid_Amount,0) as Balance_Amount
   From Bill p with(NoLock,NoWait)
   Inner Join Money m with(NoLock,NoWait) on p.SupplierID = m.CustomerID And p.Currency = m.Currency And m.MoneyID = {MoneyID}
   Left Outer Join @tmpDetail t on t.Bill_No = p.Bill_No
   Where t.Bill_No is null
   --And ((m.Accounting_Item_No = 2122 And p.Funds_RequestID is null) or (m.Accounting_Item_No = 1140 And p.Funds_RequestID is not null))
   And ((m.Accounting_Item_No = 2122 And p.Subject = 'Purchase') or (m.Accounting_Item_No = 1140 And p.Subject = 'Purchase Prepay'))   
   And ({Bill_No} = '' or p.Bill_No like {Bill_No} + '%' ) 
   And isnull(p.Amount, 0) - isnull(p.Paid_Amount,0) > 0   
   And ({Bill_Date} = '' or convert(varchar(10),p.Bill_Date,111) like {Bill_Date} + '%' ) 
   And ({Term} = '' or p.Term like {Term} + '%' )    
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