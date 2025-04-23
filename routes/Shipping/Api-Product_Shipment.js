var express = require('express');
var router = express.Router();
const format = require('string-format');
var db = require('../../config/DB_Connect');
const cloneDeep = require('lodash/cloneDeep');
var moment = require('moment');
/* Mark-Wang API Begin */

//Check Commission
router.post('/Check_Commission', function (req, res, next) {
   console.log("Call Check_Commission Api :", req.body);
   req.body.Shipment_No = req.body.Shipment_No ? `N'${req.body.Shipment_No.trim().substring(0,18).replace(/'/g, "''")}'` : `''`; 

   var strSQL = format(`   
   Declare @Shipment_No varchar(20) = {Shipment_No}, @Value real, @Value1 real;

   Set @Value = isnull((SELECT ROUND(SUM(o.Unit_Price * ode.Rate * p.Qty * -1),2) 
   FROM (
      Select Order_DetailID, Sum(Qty) as Qty
      From PDSP_Detail pd With(NoLock, NoWait) 
      Where pd.Shipment_No = @Shipment_No
      Group by Order_DetailID
   ) p 
   INNER JOIN dbo.Order_Detail_Expense ode With(NoLock, NoWait) ON ode.Order_DetailID = p.Order_DetailID And ode.Category = 'Commission'
   INNER JOIN Order_Detail o with(NoLock,NoWait) ON o.Order_DetailID = p.Order_DetailID),0)
   
   Set @Value1 = isnull(( Select ROUND(SUM(ms.Withdrawal),2) 
      FROM Money_Source ms With(NoLock,NoWait) WHERE ms.Subject = 'Commission PAY' And ms.Source_No = @Shipment_No
   ),0)

   Select case when @Value = @Value1 then 1 else 0 end as Commission_Flag
   , iif(isnull(p.Doc_Completed,'') = '', 0 , 1) as Doc_Completed_Flag
   From PDSP p With(NoLock, NoWait) 
   Where p.Shipment_No = @Shipment_No;

   `, req.body );
   //console.log(strSQL); 

   db.sql(req.SiteDB, strSQL)
      .then((result) => {
         res.send({Commission_Flag: result.recordsets[0][0].Commission_Flag, Doc_Completed_Flag: result.recordsets[0][0].Doc_Completed_Flag});
         //res.send({Commission_Flag: 0});
      }).catch((err) => {
         console.log(err);
         res.status(500).send(err);
      })

});

//Revise PDSP RCV_Amount
router.post('/Revise_RCV_Amount', function (req, res, next) {
   console.log("Call Order Revise_RCV_Amount Api :", req.body);
   req.body.Shipment_No = req.body.Shipment_No ? `N'${req.body.Shipment_No.trim().substring(0,18).replace(/'/g, "''")}'` : `''`; 

   var strSQL = format(`   
   Declare @Shipment_No varchar(20) = {Shipment_No}

   Update PDSP Set Rcv_Amount = round(isnull(t.Rcv_Amount,0) + isnull(Others_PI.Expense,0) + isnull(fee.Rcv_Expense,0),2)
   from PDSP p 
   Inner Join (
      Select pd.Shipment_No, sum(od.Unit_Price * pd.Qty) as Rcv_Amount
         From PDSP_Detail pd with(NoLock,NoWait) 
       Inner Join Order_Detail od on pd.Order_DetailID = od.Order_DetailID
      Where pd.Shipment_No = @Shipment_No	
      Group by pd.Shipment_No
   ) t on p.Shipment_No = t.Shipment_No
      Left outer join (SELECT pd.Shipment_NO, SUM(od.Unit_Price * ode.Rate * pd.Qty) AS Expense
                  FROM Order_Detail_Expense ode
                  INNER JOIN PDSP_Detail pd ON ode.Order_DetailID = pd.Order_DetailID 							
                  INNER JOIN dbo.Order_Detail od ON ode.Order_DetailID = od.Order_DetailID
                  Where ode.Doc = 'PI' And pd.Shipment_No = @Shipment_No
                  GROUP BY pd.Shipment_NO, ode.Doc) as Others_PI on Others_PI.Shipment_NO = p.Shipment_NO 
   Left Outer Join (Select pe.shipment_No, sum(isnull(pe.Pay_Amount,0)) as Pay_Expense, sum(isnull(pe.Rcv_Amount,0)) as Rcv_Expense 
                  FROM PDSP_Expense pe 
                  Where pe.Shipment_No = @Shipment_No
                  Group by pe.shipment_No) as Fee on Fee.Shipment_NO = p.Shipment_NO 
   Where p.Shipment_No = @Shipment_No

   Select convert(bit,@@ROWCOUNT) as Flag
   `, req.body );
   //console.log(strSQL);  

   db.sql(req.SiteDB, strSQL)
      .then((result) => {
         res.send({Flag:result.recordset[0].Flag});
      }).catch((err) => {
         console.log(err);
         res.status(500).send(err);
      })

});

//Get Currency
router.post('/Currency', function (req, res, next) {
   console.log("Call Shipment Currency Api :", req.body);
   req.body.Shipment_No = req.body.Shipment_No ? req.body.Shipment_No.replace(/'/g, "''") : '';
   var strSQL = format(`
   Declare @Currency_Date DateTime;

   Select @Currency_Date = case when N'{Shipment_No}' = 'Insert' then GetDate() else isnull((Select Date from PDSP Where Shipment_No = N'{Shipment_No}'),GetDate()) end
   
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

//Get Fee_Target
router.post('/Fee_Target', function (req, res, next) {
   console.log("Call Fee Target Api :", req.body);
   var strSQL = format(`   
   SELECT CustomerID as Target FROM Customer p with(NoLock, NoWait)
   union 
   SELECT Factory_SubID as Target FROM Factory_Sub p with(NoLock, NoWait)
   Order by Target  `
   , req.body );
   //console.log(strSQL);  

   db.sql(req.Enterprise, strSQL)
      .then((result) => {
         res.send(result.recordset);
      }).catch((err) => {
         console.log(err);
         res.status(500).send(err);
      })

});

//Check Shipment_No
router.post('/Check_Shipment',  function (req, res, next) {
   console.log("Call Check_Shipment_No Api:",req.body);

   req.body.Shipment_No = req.body.Shipment_No ? `${req.body.Shipment_No.trim().substring(0,18).replace(/'/g, '')}` : '';

   var strSQL = format(`
   SELECT Count(*) as RecCount
   FROM [dbo].[PDSP] With(Nolock,NoWait)
   where ([Shipment_No] = N'{Shipment_No}')
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

//Get Shipment_List
router.post('/Product_Shipment_List',  function (req, res, next) {
   console.log("Call Shipment_List Api:");   
   req.body.Shipment_No = req.body.Shipment_No ? `N'${req.body.Shipment_No.trim().substring(0,18).replace(/'/g, "''")}'` : `''`; 
   req.body.Stuffing_Date = req.body.Stuffing_Date ? `'${req.body.Stuffing_Date.trim().substring(0,10).replace(/'/g, "''")}'` : `''`; 
   req.body.F_ETD = req.body.F_ETD ? `'${req.body.F_ETD.trim().substring(0,10).replace(/'/g, "''")}'` : `''`; 
   req.body.Season = req.body.Season ? `N'${req.body.Season.trim().substring(0,10).replace(/'/g, "''")}'` : `''`; 
   req.body.FactoryID = req.body.FactoryID ? `N'${req.body.FactoryID.trim().substring(0,15).replace(/'/g, "''")}'` : `''`; 
   req.body.Factory_SubID = req.body.Factory_SubID ? `N'${req.body.Factory_SubID.trim().substring(0,15).replace(/'/g, "''")}'` : `''`; 
   req.body.CustomerID = req.body.CustomerID ? `N'${req.body.CustomerID.trim().substring(0,15).replace(/'/g, "''")}'` : `''`; 
   req.body.Brand = req.body.Brand ? `N'${req.body.Brand.trim().substring(0,30).replace(/'/g, "''")}'` : `''`; 
   req.body.Department = req.body.Department ? `N'${req.body.Department.trim().substring(0,5).replace(/'/g, "''")}'` : `''`; 
   req.body.Doc_Completed = req.body.Doc_Completed ? `N'${req.body.Doc_Completed.trim().substring(0,10).replace(/'/g, "''")}'` : `''`; 
   req.body.Doc_Delivery_No = req.body.Doc_Delivery_No ? `N'${req.body.Doc_Delivery_No.trim().substring(0,25).replace(/'/g, "''")}'` : `''`; 
   req.body.Currency = req.body.Currency ? `N'${req.body.Currency.trim().substring(0,18).replace(/'/g, "''")}'` : `''`; 
   req.body.Approve = req.body.Approve ? `N'${req.body.Approve.trim().substring(0,20).replace(/'/g, "''")}'` : `''`; 
   req.body.UserID = req.body.UserID ? `N'${req.body.UserID.trim().substring(0,25).replace(/'/g, "''")}'` : `''`; 
   req.body.Rcv_Amount = req.body.Rcv_Amount ? req.body.Rcv_Amount : 0; 
   req.body.islitigation = req.body.islitigation ? req.body.islitigation : 0;

   var strSQL = format(`  
   Declare @Table table(Source_No nvarchar(18))

   Insert @Table
   SELECT ms.Source_No 
   FROM Money_Source ms with(NoLock,NoWait)
   LEFT JOIN Money_Source AS ms1 with(NoLock,NoWait) ON ms.BindID = ms1.Money_SourceID
   Where ms.Subject='Commission Pay' And ms1.Money_SourceID is null
   Group by ms.Source_No;

   SELECT Top 500 p.Shipment_No, p.OrganizationID, p.Advising_Bank
   , (Select top 1 b.S_Name From Bank b with(NoLock,NoWait) Where b.BankID = p.Advising_Bank) as Advising_Bank_Name,
   Convert(varchar(10),p.Stuffing_Date,111) as Stuffing_Date, 
   Convert(varchar(10),p.F_ETD,111) as F_ETD,  
   p.Season, 
   p.FactoryID,
   p.Factory_SubID, 
   p.CustomerID, 
   p.Brand, 
   p.Department , 
   Convert(varchar(10),p.Doc_Completed,111) as Doc_Completed, 
   p.Doc_Delivery_No, 
   Format(p.Qty,'N0') as Qty, 
   p.Currency, 
   Format(p.Rcved_Amount, 'N2') as Rcv_Amount, 
   ( 
      Case When isnull(p.Rcv_Amount,0) = 0 then 'black'   
           When isnull(p.Rcv_Amount,0) > isnull(p.Rcved_Amount,0) then 'red' 
           When isnull(p.Rcv_Amount,0) < isnull(p.Rcved_Amount,0) then 'green' 
      end  
   ) as RCV_Flag,   
   p.Approve, 
   p.UserID,
   case
      when p.Accounting_First_Lock is not null and len(isnull(p.Accounting,'')) = 0 then 'unlock'
      when p.Accounting_First_Lock is null and p.Accounting is null then ''
      when len(isnull(p.Accounting,'')) > 0 then 'lock'
   end as Record_Flag ,
   case when p.F_ETD is null then 1 else 0 end ETD_Flag ,
   case when p.Rcved_Amount > p.Rcv_Amount then 1 else 0 end Rcv_Amount_Flag,
   case when isnull(tmp.Source_No,'') = '' then 0 else 1 end CB_Flag,
   ABS(cast(p.islitigation as int)) as islitigation
   FROM PDSP p With(NoLock, NoWait)
   Left outer Join @Table tmp on p.Shipment_No = tmp.Source_No
   Where ({Shipment_No} = '' or Shipment_No like  '%'+ {Shipment_No} + '%') 
   And ({Stuffing_Date} = '' or Convert(varchar(10),p.Stuffing_Date,111) like '%'+ {Stuffing_Date} + '%')
   And ({F_ETD} = '' or Convert(varchar(10),p.F_ETD,111) like '%'+ {F_ETD} + '%')
   And ({Season} = '' or p.Season like '%'+ {Season} + '%')
   And ({FactoryID} = '' or p.FactoryID like '%'+ {FactoryID} + '%')
   And ({Factory_SubID} = '' or p.Factory_SubID like '%'+ {Factory_SubID} + '%')
   And ({CustomerID} = '' or p.CustomerID like '%'+ {CustomerID} + '%')
   And ({Brand} = '' or p.Brand like '%'+ {Brand} + '%')
   And ({Department} = '' or p.Department like '%'+ {Department} + '%')
   And ({Doc_Completed} = '' or Convert(varchar(10),p.Doc_Completed,111) like '%'+ {Doc_Completed} + '%')
   And ({Doc_Delivery_No} = '' or p.Doc_Delivery_No like '%'+ {Doc_Delivery_No} + '%')
   And ({Currency} = '' or p.Currency like  '%'+ {Currency} + '%') 
   And ({Approve} = '' or p.Approve like  '%'+ {Approve} + '%') 
   And ({UserID} = '' or p.UserID like  '%'+ {UserID} + '%') 
   And ({Rcv_Amount} = 0 or p.Rcv_Amount = {Rcv_Amount}) 
   And ({islitigation} = 0 or ABS(cast(p.islitigation as int)) = {islitigation} )
   Order by case when (p.Accounting_First_Lock is not null and p.Accounting_Lock_Date is null) then '1' else '0' end + ' ' +  case when p.F_ETD is null then '3000/01/01' else convert(varchar(10),p.F_ETD,111) end desc   
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

//Get Shipment Detail add Data (出貨細項)
router.post('/Detail_Add_List',  function (req, res, next) {
   console.log("Call Detail_Add_List Api:");   
   req.body.Shipment_No = req.body.Shipment_No ? `N'${req.body.Shipment_No.trim().substring(0,18).replace(/'/g, "''")}'` : `''`; 

   var strSQL = format(`  
   Declare @Shipment_No Varchar(20) = {Shipment_No}
	  
   Declare @Order_Detail table(Order_DetailID int, Order_No varchar(18), CustomerID varchar(15), Agent varchar(15), FactoryID varchar(15), Factory_SubID varchar(15)
    , Produce_No varchar(20), Product_No varchar(25), Customer_Product_No varchar(25), Destination varchar(30), Orig_Shipping_Date DateTime, Unit_Price float, Factory_Price float
    , Shipmented int, Order_Detail_RefID int, Ref_No varchar(20), Season varchar(10), Brand varchar(20), Currency varchar(4), PO_Currency varchar(4))

   Declare @Order_Qty Table(Order_DetailID int, Size float, Qty float)
   Declare @PDSP_Qty Table(Order_DetailID int, Qty float)
	Declare @PDSP_PKO_Qty Table(Order_DetailID int, Order_PKOID int, Qty float)
	Declare @PKO_Qty Table(Order_DetailID int, Order_PKOID int, PKO_No varchar(20), Destination nvarchar(30), Shipping_Date DateTime, Qty float)

   Insert @Order_Detail
   SELECT od.Order_DetailID, od.Order_No, o.CustomerID, o.Agent, p.FactoryID, p.Factory_SubID
   , od.Produce_No, od.Product_No, od.Customer_Product_No, od.Destination, od.Orig_Shipping_Date, od.Unit_Price, od.Factory_Price
   , p.Shipmented, od.Order_Detail_RefID, r.Ref_No, o.Season, o.Brand, o.Currency, o.PO_Currency
   FROM PDSP With(NoLock, NoWait)
   INNER JOIN dbo.Orders o With(NoLock, NoWait) ON (o.CustomerID = pdsp.CustomerID or o.Agent = pdsp.CustomerID)and o.Brand = pdsp.Brand and o.Season = pdsp.Season and o.Currency = pdsp.Currency and o.PO_Currency = pdsp.PO_Currency
   INNER JOIN dbo.Order_Detail od With(NoLock, NoWait) ON o.Order_No = od.Order_No
   Inner Join Order_Detail_Ref r with(NoLock,NoWait) on od.Order_Detail_RefID = r.Order_Detail_RefID
   INNER JOIN dbo.Produce p With(NoLock, NoWait) ON od.Produce_No = p.Produce_No
   Inner Join Order_Approve oa With(NoLock, NoWait) ON p.Order_ApproveID = oa.Order_ApproveID
   WHERE PDSP.Shipment_No = @Shipment_No
   And (ABS(isnull(p.Shipmented,0)) <> 1)
   And (ABS(isnull(p.UnProduce,0)) <> 1)
   AND oa.Approve_Date is not null
   And p.FactoryID = pdsp.FactoryID

   Insert @Order_Qty
   Select tmp.Order_DetailID, Size, sum(oq.Qty)
   From @Order_Detail tmp
   Inner Join dbo.Order_Qty oq With(NoLock, NoWait) on tmp.Order_DetailID = oq.Order_DetailID
   Group by tmp.Order_DetailID, Size

   Insert @PDSP_Qty
   Select tmp.Order_DetailID, sum(oq.Qty)
   From @Order_Detail tmp
   Inner Join dbo.PDSP_Detail oq With(NoLock, NoWait) on tmp.Order_DetailID = oq.Order_DetailID
   Group by tmp.Order_DetailID, oq.Order_PKOID

	Insert @PKO_Qty
	Select Order_DetailID, Order_PKOID, PKO_No, Destination, Shipping_Date, Sum(Qty) as Qty
	From (
	Select distinct t.Order_DetailID, t.Order_No, t.Product_No, t.Ref_No, opq.Size, op.Order_PKOID, op.PKO_No, op.Destination, op.Shipping_Date, opq.Qty
	From @Order_Detail t
	Inner Join @Order_Qty oq on oq.Order_DetailID = t.Order_DetailID
	Inner Join Order_PKO op with(NoLock,NoWait) on t.Order_Detail_RefID = op.Order_Detail_RefID
	Left Outer join Order_PKO_Qty opq with(NoWait,NoLock) on op.Order_PKOID = opq.Order_PKOID And oq.Size = opq.Size) tmp
	Group by Order_DetailID, Order_PKOID, PKO_No, Destination, Shipping_Date

	Insert @PDSP_PKO_Qty
	Select pd.Order_DetailID, tmp.Order_PKOID, Sum(pd.Qty) as Qty
	From (Select Order_PKOID From @PKO_Qty Group by Order_PKOID) tmp
	Inner Join PDSP_Detail pd with(NoLock, NoWait) on pd.Order_PKOID = tmp.Order_PKOID
	Group by pd.Order_DetailID, tmp.Order_PKOID
  
   Select cast(0 as bit) as flag, tmp.Order_DetailID, tmp.CustomerID, tmp.Factory_SubID, tmp.Order_No, tmp.Produce_No, tmp.Product_No, tmp.Customer_Product_No
   --, tmp.Destination
   , tmp.Season, s.CCC_Code
   , case when tmp.Orig_Shipping_Date is null then '' else convert(varchar(10),tmp.Orig_Shipping_Date, 111)  end as Orig_Shipping_Date
   , Format(tmp.Unit_Price,'N2') as Unit_Price
   , Format(tmp.Factory_Price,'N2') as Factory_Price
   , tmp.Ref_No
   , PKO.Order_PKOID
   , PKO.PKO_No
   , convert(varchar(10),PKO.Shipping_Date,111) as Shipping_Date
   , isnull(PKO.Destination,tmp.Destination) as Destination
   , isnull(PKO.Qty,0) - isnull(PDSP_PKO.Qty,0) as PKO_Qty
   , isnull(pq.Qty,0) as PDSP_Qty
   , isnull(PDSP_PKO.Qty,0) as PDSP_PKO_Qty	
   , (isnull(oq.Qty,0) - isnull(pq.Qty,0)) as Balance_Qty
   , '' as Query
   From @Order_Detail tmp
   INNER JOIN dbo.Product pt With(NoLock, NoWait) ON tmp.Product_No = pt.Product_No
   INNER JOIN dbo.Style s With(NoLock, NoWait) ON pt.Style_No = s.Style_No
   Left outer Join @PKO_Qty PKO on tmp.Order_DetailID = pko.Order_DetailID
   Left outer Join @PDSP_PKO_Qty PDSP_PKO on PDSP_PKO.Order_PKOID = pko.Order_PKOID And PDSP_PKO.Order_DetailID = pko.Order_DetailID
   Left outer Join (Select Order_DetailID, Sum(Qty) as Qty From @Order_Qty Group by Order_DetailID) oq on tmp.Order_DetailID = oq.Order_DetailID
   Left outer Join (Select Order_DetailID, Sum(Qty) as Qty From @PDSP_Qty Group by Order_DetailID) pq  on tmp.Order_DetailID = pq.Order_DetailID	
   --Where ((PKO.Order_PKOID is null And isnull(oq.Qty,0) - isnull(pq.Qty,0) <> 0) or (PKO.Order_PKOID is not null And isnull(PKO.Qty,0) - isnull(PDSP_PKO.Qty,0) <> 0))
   Where ((isnull(oq.Qty,0) - isnull(pq.Qty,0) <> 0) or (isnull(PKO.Qty,0) - isnull(PDSP_PKO.Qty,0) <> 0))
   ORDER BY CustomerID, Order_No, Factory_SubID DESC, Ref_No, PKO_No, Produce_No;

   `, req.body) ;
   //console.log(strSQL)
   db.sql(req.SiteDB, strSQL)
      .then((result) => {
         res.send({Detail_Add_List: result.recordsets[0]});
      }).catch((err) => {
         console.log(err);
         res.status(500).send(err);
      })

});

//Get PKO Shipment Detail additems Info (PKO出貨細項)
router.post('/PKO_Detail_Add_List',  function (req, res, next) {
   console.log("Call PKO_Detail_Add_List Api:");   
   req.body.Shipment_No = req.body.Shipment_No ? `N'${req.body.Shipment_No.trim().substring(0,18).replace(/'/g, "''")}'` : `''`; 

   var strSQL = format(`  
   Declare @Shipment_No Varchar(20) = {Shipment_No}
	Declare @PKO Table (Order_No varchar(18), Order_DetailID int, Product_No varchar(25), Produce_No varchar(20), Unit_Price float, Order_PKOID int, PKO_No varchar(20),  Out_Qty float, Delivered_Qty float, Order_Qty float, PKO_Qty float)
			
	Insert @PKO(Order_No, Order_DetailID, Product_No, Produce_No, Unit_Price, Order_PKOID, PKO_No, Out_Qty, Delivered_Qty, Order_Qty, PKO_Qty)
	Select distinct od.Order_No, od.Order_DetailID, od.Product_No, od.Produce_No, od.Unit_Price, t.Order_PKOID, t.PKO_No, t.Out_Qty, t.Delivered_Qty, od.Qty as Order_Qty, t.PKO_Qty
	From (
		Select distinct Order_PKOID, Order_Detail_RefID, PKO_No, Size, Out_Qty, Delivered_Qty, PKO_Qty
		from (
			Select op.Order_PKOID, opd.Order_PKO_DetailID, op.Order_Detail_RefID, op.PKO_No, op.Qty as PKO_Qty, op.Delivered_Qty, pod.Cartons * opd.Unit_Qty as Out_Qty, opd.Carton_No, opd.Carton_Code, pod.Cartons, opd.Unit_Qty
			From Product_Out po with(NoLock,NoWait)
			Inner Join Product_Out_Detail pod with(NoLock,NoWait) on po.Product_Out_No = pod.Product_Out_No	
			Inner Join dbo.Order_PKO_Detail opd with(NoLock,NoWait) on opd.Order_PKO_DetailID = pod.Order_PKO_DetailID 
			Inner Join dbo.Order_PKO op with(NoLock,NoWait) on op.Order_PKOID = po.Order_PKOID and opd.Order_PKOID = op.Order_PKOID			
			Where po.Shipment_NO = @Shipment_No
		) p
		Inner Join Order_PKO_Detail_Qty pd with(NoLock,NoWait) on p.Order_PKO_DetailID = pd.Order_PKO_DetailID
	) t
	Inner Join Order_Detail od with(NoLock,NoWait) on t.Order_Detail_RefID = od.Order_Detail_RefID
	Inner Join Order_Qty oq with(NoLock,NoWait) on od.Order_DetailID = oq.Order_DetailID and t.Size = oq.Size

	
	Select p.Order_No, p.Order_DetailID, p.Product_No, p.Produce_No, p.Unit_Price, p.Order_Qty, p.Order_PKOID, d.PKO_No, d.Out_Qty, d.Delivered_Qty, d.PKO_Qty , s.CCC_Code, isnull(t.PDSP_Qty,0) as PDSP_Qty
	from (
		Select distinct Order_No, Order_DetailID, Product_No, Produce_No, Unit_Price, Order_Qty, Order_PKOID From @PKO
	) p
	Inner Join 
	(
		Select Order_PKOID, PKO_No, sum( distinct Out_Qty) as Out_Qty, Delivered_Qty, PKO_Qty From @PKO Group by  Order_PKOID, PKO_No, Delivered_Qty, PKO_Qty
	) d on p.Order_PKOID = d.Order_PKOID
	Inner Join Product pt with(NoLock,NoWait) on p.Product_No = pt.Product_No
	Inner Join Style s with(NoWait, NoLock) on pt.Style_No = s.Style_No
	Left Outer Join (
		Select tmp.Order_DetailID, Order_PKOID, sum(oq.Qty) as PDSP_Qty
		From (Select distinct Order_DetailID From @PKO ) tmp
		Inner Join dbo.PDSP_Detail oq WITH (NoLock, NoWait) on tmp.Order_DetailID = oq.Order_DetailID
		Group by tmp.Order_DetailID, oq.Order_PKOID
	) t on p.Order_DetailID = t.Order_DetailID And p.Order_PKOID = t.Order_PKOID
	Where d.PKO_Qty > isnull(t.PDSP_Qty,0);
   `, req.body) ;
   //console.log(strSQL)
   db.sql(req.SiteDB, strSQL)
      .then((result) => {
         res.send({Detail_Add_List: result.recordsets[0]});
      }).catch((err) => {
         console.log(err);
         res.status(500).send(err);
      })

});

//Get Shipment_Info
router.post('/Shipment_Info',  function (req, res, next) {
   console.log("Call Shipment_Info Api:",req.body);

   req.body.Shipment_No = req.body.Shipment_No ? `N'${req.body.Shipment_No.trim().substring(0,18).replace(/'/g, "''")}'` : `''`; 

   //Mode == 0 Get Shipment and Shipment Data
   //Mode == 1 Get Shipment Data
   //Mode == 2 Get Shipment Detail Data
   //Mode == 3 Get Fee List Data
   //Mode == 4 Get RCV List Data
   //Mode == 5 Get Commission List Data
   var strSQL = format(`
   Declare @Mode int = {Mode};
   --Declare @Shipment_No Varchar(18) = 'B20-139B'
   Declare @Shipment_No Varchar(18) = {Shipment_No};
   Declare @MessrsID Varchar(15); 
   Declare @PDSP_Currency varchar(4), @PDSP_Currency_Symbol nvarchar(5), @PDSP_PO_Currency varchar(4), @PDSP_PO_Currency_Symbol nvarchar(5), @PI_Other_Expense float, @PO_Other_Expense float, @RCV_FEE float, @PAY_FEE float;

   Declare @PDSP_Detail table(Shipment_DetailID int, Order_DetailID int, Qty int, PKO_No varchar(18), CCC_Code char(15), Cartons int, Order_PKOID int);
   Declare @Order_Detail table(Order_DetailID int, Order_No varchar(18), Produce_No varchar(20), Product_No varchar(25), Unit_Price float, Factory_Price float, Order_Qty int, Destination varchar(30), Season varchar(10), Brand varchar(20));
   Declare @Tmp_Fee table(PDSP_ExpenseID int, Date varchar(10), Target varchar(15), Decription varchar(30),Rcv_Amount float, Pay_Amount float);
   
   
   Select @PDSP_Currency = p.Currency
   , @PDSP_Currency_Symbol = (Select Currency_Symbol From Currency c With(NoLock,NoWait) Where c.Currency = p.Currency)
   , @PDSP_PO_Currency = PO_Currency
   , @PDSP_PO_Currency_Symbol = (Select Currency_Symbol From Currency c With(NoLock,NoWait) Where c.Currency = p.PO_Currency)
   , @MessrsID = MessrsID 
   From PDSP p With(NoLock,NoWait) 
   Inner Join Currency o With(NoLock,NoWait) on p.Currency = o.Currency
   Where p.Shipment_No = @Shipment_No;

   Insert @PDSP_Detail
   Select pd.Shipment_DetailID, Order_DetailID, Qty, PKO_No, CCC_Code, Cartons, Order_PKOID
   From PDSP_Detail pd With(NoLock, NoWait) 
   Where pd.Shipment_No = @Shipment_No;

   Insert @Order_Detail (Order_DetailID, Order_No, Produce_No, Product_No, Unit_Price, Factory_Price, Order_Qty, Destination, Season, Brand)
   Select od.Order_DetailID, od.Order_No, od.Produce_No, od.Product_No, od.Unit_Price, od.Factory_Price, od.Qty as Order_Qty, od.Destination, o.Season, o.Brand
   From (Select Order_DetailID From @PDSP_Detail Group by Order_DetailID) pd
   Inner Join Order_Detail od With(NoLock, NoWait) on pd.Order_DetailID = od.Order_DetailID
   Inner Join Orders o With(NoLock, NoWait) on od.Order_No = o.Order_No;
   
   Set @PI_Other_Expense = isnull((SELECT SUM(od.Unit_Price * ode.Rate * pd.Qty) 
						FROM Order_Detail_Expense ode
						INNER JOIN @PDSP_Detail pd ON ode.Order_DetailID = pd.Order_DetailID 
						INNER JOIN @Order_Detail od ON ode.Order_DetailID = od.Order_DetailID 						
						Where ode.Doc = 'PI' 
						GROUP BY ode.Doc),0);

   Set @PO_Other_Expense = isnull((SELECT SUM(od.Unit_Price * ode.Rate * pd.Qty) 
						FROM Order_Detail_Expense ode
						INNER JOIN @PDSP_Detail pd ON ode.Order_DetailID = pd.Order_DetailID 
						INNER JOIN @Order_Detail od ON ode.Order_DetailID = od.Order_DetailID 						
						Where ode.Doc = 'PO' 
						GROUP BY ode.Doc),0);

   Insert @Tmp_Fee   
   Select PDSP_ExpenseID, Rtrim(Ltrim(Date)) as Date, Rtrim(Ltrim(pe.Target)) as Target, Rtrim(Ltrim(pe.Decription)) as Decription, isnull(pe.Rcv_Amount,0) as Rcv_Amount, isnull(pe.Pay_Amount,0) as Pay_Amount
   From PDSP_Expense pe With(NoLock,NoWait)
   Where pe.Shipment_No = @Shipment_No;

   Set @RCV_FEE = Isnull((Select Sum(Rcv_Amount) From @Tmp_Fee),0);
   Set @PAY_FEE = Isnull((Select Sum(Pay_Amount) From @Tmp_Fee),0);
       
   --0 Order Master
   if(@Mode = 0 or @Mode = 1)
   Begin

      Declare @MessrsTable table(ContactID int, Name varchar(35), Contact varchar(50));
      Insert @MessrsTable (ContactID, Name, Contact)
      Select ContactID, Name, Contact
      From Customer_Contacts s 
      Where s.CustomerID = @MessrsID;

      Select Shipment_No, Convert(varchar(10),p.Date,111) as Date, p.OrganizationID, p.Department
      , p.CustomerID, p.Season, p.Brand, p.Currency, o.Currency_Rate, (Select Currency_Symbol From Currency c where c.Currency = o.Currency) as Currency_Symbol
      , (case when p.Doc_Completed is null then '' else Convert(varchar(10),p.Doc_Completed,111) end) as Doc_Completed, (case when p.Doc_Delively is null then '' else Convert(varchar(10),p.Doc_Delively,111) end) as Doc_Delively, p.Doc_Delivery_No, p.PO_Currency, po.Currency_Rate as PO_Currency_Rate, (Select Currency_Symbol From Currency c where c.Currency = po.Currency) as PO_Currency_Symbol
      , ABS(cast(p.Discrepancy as int)) as Discrepancy
      , ABS(cast(p.islitigation as int)) as islitigation
      , p.Approve, case when isnull(p.Approve,'') = '' then 0 else 1 end as Approve_Chk, p.Accounting, case when isnull(p.Accounting,'') = '' then 0 else 1 end as Accounting_Chk, p.UserID, (case when p.Accounting_First_Lock is null then '' else case when p.Accounting_Lock_Date is null then '('+convert(varchar(10),p.Accounting_First_Lock,111)+')' else convert(varchar(10),p.Accounting_Lock_Date,111) + ' ('+convert(varchar(10),p.Accounting_First_Lock,111)+')' end end) as Accounting_Lock
      , p.FactoryID, p.Factory_SubID
      , p.MessrsID, p.Messrs, p.Messrs_Address
      , isnull(p.Invoice_To_Title,'INVOICE TO') as Invoice_To_Title
      , p.Invoice_ToID
      , (Select Name From @MessrsTable m Where m.ContactID = p.Invoice_ToID ) as Invoice_To_Name
      , p.Invoice_To, p.Invoice_To_Address
      , isnull(p.Buyer_Title, 'CONSIGNEE') as Buyer_Title
      , p.BuyerID
      , (Select Name From @MessrsTable m Where m.ContactID = p.BuyerID ) as Buyer_Name
      , p.Buyer, p.Buyer_Address
      , isnull(p.Notify_Party_Title,'NOTIFY PARTY') as Notify_Party_Title
      , p.Notify_PartyID
      , (Select Name From @MessrsTable m Where m.ContactID = p.Notify_PartyID ) as Notify_Party_Name
      , p.Notify_Party, p.Notify_Party_Address
      , p.Beneficiary
      , p.Advising_Bank
      , (Select top 1 b.S_Name From Bank b with(NoLock,NoWait) Where b.BankID = p.Advising_Bank) as Advising_Bank_Name
      , p.Comment, p.Term_Price, p.Commodity
      , p.Forwarder, p.Cartons, p.Qty, p.Measurement, p.Container
      , case when p.Stuffing_Date is null then '' else Convert(varchar(10),p.Stuffing_Date,111) end as Stuffing_Date
      , isnull( p.F_Vessel,'') as F_Vessel, case when p.F_ETD is null then '' else Convert(varchar(10),p.F_ETD,111) end as F_ETD, isnull(p.S_Port,'') as S_Port, isnull(p.T_Port,'') as T_Port
      , isnull( p.M_Vessel,'') as M_Vessel, case when p.M_ETD is null then '' else Convert(varchar(10),p.M_ETD,111) end as M_ETD, isnull(p.Destination,'') as Destination, (case when p.M_ETA is null then '' else Convert(varchar(10),p.M_ETA,111) end) as M_ETA	
      , Format(round(Isnull((SELECT sum(isnull(od.Unit_Price * pd.Qty,0)) FROM @PDSP_Detail pd Inner Join @Order_Detail od ON pd.Order_DetailID = od.Order_DetailID),0),2),'N2') as RCV_Amount
      , Format(@PI_Other_Expense,'N2') as PI_Other_Expense
      , Format(@RCV_FEE,'N2') as RCV_FEE
      , Format(p.Rcv_Amount,'N2') as G_RCV_Amount
      , Format(p.Rcved_Amount,'N2') as RCV_Progress
      , Format(round(Isnull((SELECT sum(isnull(od.Factory_Price * pd.Qty,0)) FROM @PDSP_Detail pd Inner Join @Order_Detail od ON pd.Order_DetailID = od.Order_DetailID),0),2),'N2') as PAY_Amount
      , Format(@PO_Other_Expense,'N2') as PO_Other_Expense
      , Format(@PAY_FEE,'N2') as PAY_FEE
      , Format(p.Pay_Amount,'N2') as G_PAY_Amount
      , Format(p.Paid_Amount,'N2') as PAY_Progress
      , p.Pay_Days
      , ABS(cast(p.Pay_By_Doc_Completed as int)) as Pay_By_Doc_Completed
      , (case when p.Est_Payable_Date is null then '' else Convert(varchar(10),p.Est_Payable_Date,111) End) as Est_Payable_Date
      , p.PayableID
      , p.Remark
      ,( 
         Case When isnull(p.Rcv_Amount,0) = 0 And isnull(p.Rcved_Amount,0) = 0 then 'white'
              When isnull(p.Rcv_Amount,0) > isnull(p.Rcved_Amount,0) then 'red' 
              When isnull(p.Rcv_Amount,0) < isnull(p.Rcved_Amount,0) then 'green' 
         end  
      ) as RCV_Flag
      ,(
         Case When isnull(p.Pay_Amount,0) = 0 then 'white'   
              When isnull(p.Pay_Amount,0) > isnull(p.Paid_Amount,0) then 'red' 
              When isnull(p.Pay_Amount,0) < isnull(p.Paid_Amount,0) then 'green' 
         end  
      ) as PAY_Flag
      , case when (Select count(*) From Product_Out out with(NoLock,NoWait) Where out.Shipment_No = @Shipment_No) = 0 then 1 else 0 end as Product_Out_Flag
      From PDSP p With(NoLock,NoWait)
         Left outer Join [@Currency_Rate] O on p.currency = o.Currency and o.Exchange_Date = Convert(Date, p.Date)
         Left outer Join [@Currency_Rate] po on p.PO_currency = po.Currency and po.Exchange_Date = Convert(Date, p.Date)
      Where p.Shipment_No = @Shipment_No;
      
   End
   
   --1 Shipment Detail
   if(@Mode = 0 or @Mode = 2)
   Begin
      Declare @PKO_Qty Table(Order_PKOID int, Qty float)
      Declare @PDSP_PKO_Qty Table(Order_PKOID int, Qty float)

      Insert @PKO_Qty
      Select t.Order_PKOID, Sum(opq.Qty) as Qty
      From (Select distinct Order_PKOID From @PDSP_Detail) t            
      Inner Join Order_PKO op with(NoLock,NoWait) on t.Order_PKOID = op.Order_PKOID
      Inner join Order_PKO_Qty opq with(NoWait,NoLock) on op.Order_PKOID = opq.Order_PKOID
      Group by t.Order_PKOID;

      Insert @PDSP_PKO_Qty
      Select tmp.Order_PKOID, Sum(pd.Qty) as Qty
      From (Select distinct Order_PKOID From @PDSP_Detail) tmp
      Inner Join PDSP_Detail pd with(NoLock, NoWait) on pd.Order_PKOID = tmp.Order_PKOID
      Group by tmp.Order_PKOID;

      Declare @Ship_Remainder table(Order_DetailID int, Remainder_Qty float)
      Insert @Ship_Remainder
      Select od.Order_DetailID, isnull(od.Order_Qty,0) - sum(isnull(pd.Qty,0)) as Remainder_Qty
      From @Order_Detail od
      Inner Join PDSP_Detail pd With(NoLock, NoWait) on pd.Order_DetailID = od.Order_DetailID
      Group by od.Order_DetailID, od.Order_Qty;

      SELECT '0' as SortID, pd.Shipment_DetailID, od.Order_No, od.Product_No, od.Produce_No
      , isnull(od.Unit_Price,0) as Unit_Price
      , isnull(od.Factory_Price,0) as PO_Price
      , isnull(pd.Qty,0) as Qty
      , pd.Cartons
      , cast((case when pd.Order_PKOID is null then 1 else 0 end) as bit) as PKO_Flag
      , pd.Order_PKOID
      , case when pd.Order_PKOID is null then pd.PKO_No else PKO.PKO_No end as PKO_No
      , case when pd.Order_PKOID is null then od.Destination else PKO.Destination end as Destination      
      , pd.CCC_Code
      , od.Season, od.Brand
      , @PDSP_Currency_Symbol + ' ' + Format(isnull(od.Unit_Price * pd.Qty,0), 'N2') as Amount
      , @PDSP_PO_Currency_Symbol + ' ' + Format(isnull(od.Factory_Price * pd.Qty,0), 'N2') as PO_Amount
      , sr.Remainder_Qty
      , case when (isnull(pq.Qty,0) - isnull(ppq.Qty,0)) < 0 then 1 else 0 end as Over_Ship_Flag
      FROM @PDSP_Detail pd
      Inner Join @Order_Detail od ON pd.Order_DetailID = od.Order_DetailID
      Inner Join @Ship_Remainder sr on pd.Order_DetailID = sr.Order_DetailID
      Left Outer Join Order_PKO PKO ON pd.Order_PKOID = PKO.Order_PKOID
      Left Outer Join @PKO_Qty pq ON pq.Order_PKOID = pd.Order_PKOID
      Left Outer Join @PDSP_PKO_Qty ppq ON ppq.Order_PKOID = pd.Order_PKOID
      union
      SELECT '1' as SortID, 0 as Shipment_DetailID, '' as Product_No,'' as Produce_No,  '' as Order_No
      , 0 as Unit_Price
      , 0 as PO_Price
      , sum(isnull(pd.Qty,0)) as Qty
      , 0 as Cartons
      , cast(0 as bit) as PKO_Flag
      , 0 as Order_PKOID
      , '' as PKO_No
      , '' as Destination
      , '' as CCC_Code
      , '' as Season, '' as Brand
      , @PDSP_Currency_Symbol + ' ' + Format(Round(sum(isnull(od.Unit_Price * pd.Qty,0)),2), 'N2') as Amount
      , @PDSP_PO_Currency_Symbol + ' ' + Format(Round(sum(isnull(od.Factory_Price * pd.Qty,0)),2), 'N2') as PO_Amount
      , 0 as Remainder_Qty
      , 0 as Over_Ship_Flag
      FROM @PDSP_Detail pd
      Inner Join @Order_Detail od ON pd.Order_DetailID = od.Order_DetailID;
   End

   --2 Fee
   if(@Mode = 0 or @Mode = 3)
   Begin
      Select * 
      From @Tmp_Fee;
   End 
   
   --3 RCV List
   if(@Mode = 0 or @Mode = 4)
   Begin
      Select m.Money_SourceID, m.Type, m.Days, m.By_Doc_Rcv, m.Deposit, m.Description, m.MoneyID
      , m.[Update_User]
      , Convert(varchar(20), m.[Update_Date],120) as [Update_Date]
      , m.Payment_Term
      , Convert(varchar(10),m.[Due_Date],111) as [Due_Date]
      from Money_Source m With(NoLock,NoWait)
      where m.Source_No = @Shipment_No 
      and m.Subject = 'PDSP RCV';
   End

   --4 Commission List
   if(@Mode = 0 or @Mode = 5)
   Begin
      SELECT ms.Money_SourceID, ms.CustomerID, Format(ms.Withdrawal,'N2') as Withdrawal, ms.Description, ms.BindID,  ms1.Money_SourceID AS ReceivableID, ms.MoneyID as Pay_No, ms.Update_User, convert(varchar(10), ms.Update_Date,111) as Update_Date
      FROM Money_Source ms With(NoLock,NoWait)
      Left Outer Join Money_Source ms1 With(NoLock,NoWait) ON ms.BindID = ms1.Money_SourceID
      WHERE (ms.Subject = 'Commission PAY')
	   And ms.Source_No = @Shipment_No
      ORDER BY ms.BindID;
   End

   --5 Payment List
   if(@Mode = 0 or @Mode = 6)
   Begin
      Select ms.Money_SourceID
      , Convert(varchar(10), m.Apply_Date,111) as Apply_Date
      , Convert(varchar(10), m.Date,111) as Date      
      , ms.Withdrawal
      , m.MoneyID
      from Money_Source ms With(NoLock,NoWait)
      Inner Join [Money] m With(NoLock,NoWait) on m.MoneyID = ms.MoneyID
      where ms.Source_No = @Shipment_No
      and m.Subject = 'PDSP PAY'
   End
      `, req.body) ;
   //console.log(strSQL)
   db.sql(req.SiteDB, strSQL)
      .then((result) => {

         var DataSet = {
            Head: (req.body.Mode == 0 || req.body.Mode == 1) ? result.recordsets[0] : []
            , Detail_List: (req.body.Mode == 0) ? result.recordsets[1] : (req.body.Mode == 2 ? result.recordsets[0] : [])
            , Fee_List: (req.body.Mode == 0) ? result.recordsets[2] : (req.body.Mode == 3 ? result.recordsets[0] : [])
            , RCV_List: (req.body.Mode == 0) ? result.recordsets[3] : (req.body.Mode == 4 ? result.recordsets[0] : [])
            , Commission_List: (req.body.Mode == 0) ? result.recordsets[4] : (req.body.Mode == 5 ? result.recordsets[0] : [])
            , Payment_List: (req.body.Mode == 0) ? result.recordsets[5] : (req.body.Mode == 6 ? result.recordsets[0] : [])
         }
         
         DataSet.Detail_List.forEach((item)=>{
            item.PO_Price = Math.round(item.PO_Price*10000)/10000
         })
         //console.log(itmes) 
         //console.log(result) 
         //console.log(DataSet) 
         res.send(DataSet);
      }).catch((err) => {
         console.log(err);
         res.status(500).send(err);
      })

});

//Get Product_Out
router.post('/Product_Out',  function (req, res, next) {
   console.log("Call Product_Out Api:");   

   req.body.Shipment_No = req.body.Shipment_No ? `N'${req.body.Shipment_No.trim().substring(0,18).replace(/'/g, "''")}'` : `''`; 

   var strSQL = format(`  
   Select distinct Product_Out_No, o.PKO_No
   From Product_Out p with(NoLock,NoWait)
   Inner Join Order_PKO o with(NoLock,NoWait) on p.Order_PKOID = o.Order_PKOID
   Inner Join Order_Detail od with(NoLock,NoWait) on o.Order_Detail_RefID = od.Order_Detail_RefID
   Inner Join Orders s with(NoLock,NoWait) on od.Order_No = s.Order_No
  Inner Join PDSP pd with(NoLock,NoWait) on pd.Brand = s.Brand and s.Season = pd.Season And s.CustomerID = pd.CustomerID and s.Currency = pd.Currency 
  Where pd.Shipment_NO = {Shipment_No}
   And isnull(p.shipment_No,'') = '';
   `, req.body) ;
   //console.log(strSQL)
   db.sql(req.SiteDB, strSQL)
      .then((result) => {
         res.send({Product_Out: result.recordsets[0]});
      }).catch((err) => {
         console.log(err);
         res.status(500).send(err);
      })
});

//Get Product_Out
router.post('/Product_Out_Info',  function (req, res, next) {
   console.log("Call Product_Out_Info Api:"); 

   req.body.Shipment_No = req.body.Shipment_No ? `N'${req.body.Shipment_No.trim().substring(0,18).replace(/'/g, "''")}'` : `''`; 
   var strSQL = format(`  
    Select Product_Out_No, o.PKO_No, o.Delivered_Qty
    From Product_Out p with(NoLock,NoWait)
    Inner Join Order_PKO o with(NoLock,NoWait) on p.Order_PKOID = o.Order_PKOID
    --Where isnull(p.shipment_No,'') = {Shipment_No} 
   `, req.body) ;
   //console.log(strSQL)
   db.sql(req.SiteDB, strSQL)
      .then((result) => {
         res.send({Product_Out_Info: result.recordsets[0]});
      }).catch((err) => {
         console.log(err);
         res.status(500).send(err);
      })
});

//Maintain Shipment
router.post('/Shipment_Maintain',  function (req, res, next) {
   console.log("Call Shipment_Maintain Api:",req.body);

   // req.body.Mode === 0 表示新增
   // req.body.Mode === 1 表示修改 
   // req.body.Mode === 2 表示刪除   
   // req.body.Mode === 3 表示CopyAS
   // req.body.Mode === 4 表示將Product Out加入Shipment No
   // req.body.Mode === 5 表示將Product Out移出Shipment No
   // req.body.Mode === 6 表示將Product Out Detail 匯入 Shipment No
   req.body.Shipment_No = req.body.Shipment_No ? `N'${req.body.Shipment_No.trim().substring(0,18).replace(/'/g, "''")}'` : `''`; 

   var strSQL = format(`Declare @Accounting int 
   Declare @ROWCOUNT int=0;  
   Set @Accounting =  ${req.body.Name === 'Accounting' ? "0": "(SELECT case when isnull(p.Accounting,'') = '' then 0 else 1 end FROM PDSP as p WITH (NoWait, Nolock) Where p.Shipment_No = {Shipment_No})" }      
   `, req.body);

   switch(req.body.Mode){
      case 0:
         req.body.CustomerID = req.body.CustomerID ? `N'${req.body.CustomerID.trim().substring(0,15).replace(/'/g, "''")}'` : `''`; 
         req.body.Brand = req.body.Brand ? `N'${req.body.Brand.trim().substring(0,30).replace(/'/g, "''")}'` : `''`; 
         req.body.Season = req.body.Season ? `N'${req.body.Season.trim().substring(0,10).replace(/'/g, "''")}'` : `''`; 
         req.body.Currency = req.body.Currency ? `N'${req.body.Currency.trim().substring(0,4).replace(/'/g, "''")}'` : `''`; 
         req.body.PO_Currency = req.body.PO_Currency ? `N'${req.body.PO_Currency.trim().substring(0,4).replace(/'/g, "''")}'` : `''`; 
   
         strSQL = format(`
         with tmpTable(Department, OrganizationID) as (
            Select d.Department_Code as Department, d.OrganizationID
            from Employee e 
               Inner Join Department d on e.DepartmentID = d.DepartmentID
               Inner Join aspnet_Users au on e.EmployeeID = au.EmployeeID
            Where au.LoweredUserName = N'${req.UserID}'
         )
         Insert into [dbo].[PDSP] (Shipment_No, OrganizationID, [Date] ,[Data_Update], [Brand], [CustomerID], [Season], [Currency], [PO_Currency], [Notify_Party_Title], [Invoice_To_Title], [Buyer_Title], [Department] ,[UserID] ,[Data_Updater] )
         Select {Shipment_No} as Shipment_No, OrganizationID, GetDate() as [Date], GetDate() as [Data_Update], {Brand} as Brand, {CustomerID} as CustomerID, {Season} as Season, {Currency}, {PO_Currency}, 'Notify Party' as Notify_Party_Title, 'Invoice To' as Invoice_To_Title, 'Buyer' as Buyer_Title, Department, N'${req.UserID}' as UserID, N'${req.UserID}' as Data_Updater 
         From tmpTable
         Where (SELECT Count(*) as RecCount FROM [dbo].[PDSP] With(Nolock,NoWait) where ([Shipment_No] = {Shipment_No})) = 0 ; 

         Select @@ROWCOUNT as Flag;
         `, req.body);
      break;
      case 1:
              
         if(
            (req.body.Name == 'Shipment_No' || req.body.Name == 'Season' || req.body.Name == 'OrganizationID'
            || req.body.Name == 'Department' || req.body.Name == 'Date' || req.body.Name == 'Brand'
            || req.body.Name == 'Currency' || req.body.Name == 'PO_Currency' || req.body.Name == 'CustomerID'
            || req.body.Name == 'Doc_Completed' || req.body.Name == 'Doc_Delively' || req.body.Name == 'Doc_Delivery_No' 
            || req.body.Name == 'FactoryID' || req.body.Name == 'Factory_SubID' || req.body.Name == 'Beneficiary' 
            || req.body.Name == 'Remark' || req.body.Name == 'Approve' || req.body.Name == 'Accounting'
            || req.body.Name == 'Attn' || req.body.Name == 'F_Vessel' || req.body.Name == 'S_Port'      
            || req.body.Name == 'Destination' || req.body.Name == 'M_Vessel' || req.body.Name == 'T_Port'      
            || req.body.Name == 'Term_Price' || req.body.Name == 'Commodity' || req.body.Name == 'Comment'
            || req.body.Name == 'Measurement' || req.body.Name == 'Forwarder' || req.body.Name == 'Container'
            || req.body.Name == 'Stuffing_Date' || req.body.Name == 'F_ETD' || req.body.Name == 'Est_Payable_Date'     
            || req.body.Name == 'Notify_Party_Title' || req.body.Name == 'Invoice_To_Title' || req.body.Name == 'Buyer_Title'
            || req.body.Name == 'M_ETD' || req.body.Name == 'M_ETA' || req.body.Name == 'Messrs' || req.body.Name == 'Messrs_Address'      
            || req.body.Name == 'Notify_Party' || req.body.Name == 'Invoice_To' || req.body.Name == 'Buyer'
            || req.body.Name == 'Notify_Party_Address' || req.body.Name == 'Invoice_To_Address' || req.body.Name == 'Buyer_Address'
            )
            ) {
            var Size_Flag = true;
            var Size = 0;
            switch(req.body.Name) {
               case 'Beneficiary':
                  Size = 10;
               break;
               case 'Measurement':
                  Size = 15;
               break;
               case 'Attn':
                  Size = 20;
               break;
               case 'Doc_Delivery_No':
                  Size = 25;
               break;
               case 'Forwarder':
               case 'Notify_Party_Title':
               case 'Invoice_To_Title':
               case 'Buyer_Title':
               case 'T_Port':
               case 'S_Port':
               case 'Destination':                
                  Size = 30;
               break;
               case 'M_Vessel':
               case 'F_Vessel':
                  Size = 40;
               break;
               case 'Term_Price':
                  Size = 80;
               break;         
               case 'Messrs':
               case 'Notify_Party':
               case 'Invoice_To':
               case 'Buyer':
               case 'Commodity':
                  Size = 100;
               break;
               case 'Messrs_Address':
               case 'Notify_Party_Address':
               case 'Invoice_To_Address':
               case 'Buyer_Address':
                  Size = 256;
               break;
               default:
                  Size_Flag = false;
               break;
               case 'Container':
                  Size = 65535;
               break;
            }
            req.body.Value = req.body.Value ?  (  Size_Flag ? `N'${req.body.Value.trim().substring(0,Size).replace(/'/g, "''")}'` :  `N'${req.body.Value.trim().replace(/'/g, "''")}'` ): `''`;
         }      
      
         if( req.body.Name == 'MessrsID' || req.body.Name == 'Invoice_ToID' || req.body.Name == 'BuyerID' || req.body.Name == 'Notify_PartyID' )
         {
            switch(req.body.Name) {
               case 'MessrsID':
                  req.body.Value = req.body.Value ?  `N'${req.body.Value.trim().substring(0,15).replace(/'/g, "''")}'` : `''`; 
                  req.body.Messrs = req.body.Messrs ?  `N'${req.body.Messrs.trim().substring(0,100).replace(/'/g, "''")}'` : `''`; 
                  req.body.Messrs_Address = req.body.Messrs_Address ?  `N'${req.body.Messrs_Address.trim().substring(0,150).replace(/'/g, "''")}'` : `''`; 
               break;
               case 'Invoice_ToID':
                  req.body.Invoice_To = req.body.Invoice_To ?  `N'${req.body.Invoice_To.trim().substring(0,100).replace(/'/g, "''")}'` : `''`; 
                  req.body.Invoice_To_Address = req.body.Invoice_To_Address ?  `N'${req.body.Invoice_To_Address.trim().substring(0,150).replace(/'/g, "''")}'` : `''`; 
               break;
               case 'BuyerID':
                  req.body.Buyer = req.body.Buyer ?  `N'${req.body.Buyer.trim().substring(0,100).replace(/'/g, "''")}'` : `''`; 
                  req.body.Buyer_Address = req.body.Buyer_Address ?  `N'${req.body.Buyer_Address.trim().substring(0,150).replace(/'/g, "''")}'` : `''`; 
               break;
               case 'Notify_PartyID':
                  req.body.Notify_Party = req.body.Notify_Party ?  `N'${req.body.Notify_Party.trim().substring(0,100).replace(/'/g, "''")}'` : `''`; 
                  req.body.Notify_Party_Address = req.body.Notify_Party_Address ?  `N'${req.body.Notify_Party_Address.trim().substring(0,150).replace(/'/g, "''")}'` : `''`; 
               break;
            }
         }      

         strSQL += format(`     
         if(@Accounting = 0)
         begin 
            Update [dbo].[PDSP] Set [{Name}] = case when len({Value}) = 0 or {Value} is null then null else isnull({Value},0) end
            ${ req.body.Name === 'Accounting' ? `, Accounting_First_Lock = isnull(Accounting_First_Lock, GetDate()), Accounting_Lock_Date = case when Len({Value}) > 0 then GetDate() else null end ` : "" }
            ${ req.body.Name === 'FactoryID' ? `, Factory_SubID = null ` : "" }
            ${ req.body.Name === 'MessrsID' ? `,Messrs = {Messrs}, Messrs_Address = {Messrs_Address} 
            ,BuyerID = null, Buyer = null, Buyer_Address = null
            ,Invoice_ToID = null, Invoice_To = null, Invoice_To_Address = null
            ,Notify_PartyID = null, Notify_Party = null, Notify_Party_Address = null 
            ` : "" }
            ${ req.body.Name === 'Notify_PartyID' ? `,Notify_Party = {Notify_Party}, Notify_Party_Address = {Notify_Party_Address}` : "" }
            ${ req.body.Name === 'Invoice_ToID' ? `,Invoice_To = {Invoice_To}, Invoice_To_Address = {Invoice_To_Address}` : "" }
            ${ req.body.Name === 'BuyerID' ? `,Buyer = {Buyer}, Buyer_Address = {Buyer_Address}` : "" }
            , UserID = isnull(UserID, N'${req.UserID}')
            , Data_Updater = N'${req.UserID}'
            , Data_Update = GetDate()
            where Shipment_No = {Shipment_No}
            ${ req.body.Name === 'Shipment_No' ? ` And (SELECT Count(*) as RecCount FROM PDSP as p WITH (NoWait, Nolock) Where p.Shipment_No = {Value}) = 0 ` : "" }
            ${ req.body.Name === 'CustomerID' || req.body.Name === 'Season' || req.body.Name === 'Brand' || req.body.Name === 'Currency' || req.body.Name === 'PO_Currency' ? ` And (SELECT Count(*) as RecCount FROM PDSP_Detail p WITH (NoWait, Nolock) Where p.Shipment_No = {Shipment_No}) = 0 ` : "" }
            ${ req.body.Name === 'Accounting' ? ` And (isnull(Accounting,'') <> '' or isnull(Doc_Completed,'') <> '') ` : "" } ;
            Set @ROWCOUNT = @@ROWCOUNT; 

            ${ req.body.Name === 'Shipment_No' ? ` if(@ROWCOUNT <> 0) Begin Update [dbo].[Money_Source] Set Source_No = {Value} where Source_No = {Shipment_No} End; ` : "" }            
            
         End 
         else
         begin
            if '${req.body.Name}' = 'Doc_Delivery_No' or '${req.body.Name}' = 'Discrepancy' or '${req.body.Name}' = 'islitigation' 
            begin
               Update [dbo].[PDSP] Set [{Name}] = case when len({Value}) = 0 or {Value} is null then null else isnull({Value},0) end
               , UserID = isnull(UserID, N'${req.UserID}')
               , Data_Updater = N'${req.UserID}'
               , Data_Update = GetDate()
               where Shipment_No = {Shipment_No}
               Set @ROWCOUNT = @@ROWCOUNT;    
            end
         end

         Select @ROWCOUNT as Flag; 
         `, req.body);
      break;
      case 2:
         strSQL += format(`         
         if(@Accounting = 0)
         begin 
            Delete FROM [dbo].[PDSP] 
            where Shipment_No = {Shipment_No} 
            And (SELECT Count(*) as RecCount FROM PDSP_Detail p WITH (NoWait, Nolock) Where p.Shipment_No = {Shipment_No}) = 0; 
            Set @ROWCOUNT = @@ROWCOUNT;
            if(@ROWCOUNT <> 0)
            begin
               Delete FROM [dbo].[Money_Source] 
               where Source_No = {Shipment_No} 
            end 
         End
         Select @ROWCOUNT as Flag;
      `, req.body);      
      break;
      case 3:
         req.body.Shipment_To = req.body.Shipment_To ? `N'${req.body.Shipment_To.trim().substring(0,18).replace(/'/g, "''")}'` : `''`;    
         strSQL = format(`
         Declare @Department varchar(5), @OrganizationID varchar(10);

         Select @Department = d.Department_Code, @OrganizationID = d.OrganizationID
         from Employee e 
             Inner Join Department d on e.DepartmentID = d.DepartmentID
             Inner Join aspnet_Users au on e.EmployeeID = au.EmployeeID
         Where au.LoweredUserName = N'${req.UserID}';
 
         Insert into [dbo].[PDSP] (Shipment_No, OrganizationID, Department, [Date], Season, [Brand], Stuffing_Date, FactoryID, Factory_SubID, [CustomerID], Attn, F_Vessel, F_ETD, S_Port, M_Vessel, T_Port, Destination, M_ETD, M_ETA, Cartons, Measurement, Forwarder, Container, Order_No_Title, Doc_Completed, Doc_Delively, Discrepancy, Doc_Delivery_No, Qty, Currency, PO_Currency, MessrsID, Messrs,Messrs_Address, Notify_Party_Title, Notify_PartyID, Notify_Party, Notify_Party_Address, Invoice_To_Title, Invoice_ToID, Invoice_To, Invoice_To_Address, Buyer_Title, BuyerID, Buyer, Buyer_Address, Term_Price, Commodity, Beneficiary, Advising_Bank, Comment, Remark ,[UserID] ,[Data_Updater] ,[Data_Update] )
         Select {Shipment_To} as Shipment_No, @OrganizationID as OrganizationID, @Department as Department, [Date], Season, Brand, Stuffing_Date, FactoryID, Factory_SubID, CustomerID, Attn, F_Vessel, F_ETD, S_Port, M_Vessel, T_Port, Destination, M_ETD, M_ETA, Cartons, Measurement, Forwarder, Container, Order_No_Title, Doc_Completed, Doc_Delively, Discrepancy, Doc_Delivery_No, Qty, Currency, PO_Currency, MessrsID, Messrs,Messrs_Address, Notify_Party_Title, Notify_PartyID, Notify_Party, Notify_Party_Address, Invoice_To_Title, Invoice_ToID, Invoice_To, Invoice_To_Address, Buyer_Title, BuyerID, Buyer, Buyer_Address, Term_Price, Commodity, Beneficiary, Advising_Bank, Comment, Remark, N'${req.UserID}' as UserID, N'${req.UserID}' as Data_Updater, GetDate() as [Data_Update]
         From PDSP with(NoLock, NoWait) 
         Where [Shipment_No] = {Shipment_No}
         And (SELECT Count(*) as RecCount FROM [dbo].[PDSP] With(Nolock,NoWait) where ([Shipment_No] = {Shipment_To})) = 0 ;

         Select @@ROWCOUNT as Flag;
         `, req.body);
      break;
      case 4:
      case 5:
         strSQL += format(`
         if(@Accounting = 0)
         begin 
           Update [dbo].[Product_Out] Set Shipment_No = ${req.body.Mode == 4 ? '{Shipment_No}': 'null' }           
           where Product_Out_No = {Product_Out_No}; 
           Set @ROWCOUNT = @@ROWCOUNT;
           if(@ROWCOUNT > 0)
           Begin
               Delete From PDSP_Detail 
               Where Shipment_NO = {Shipment_No};

               Insert [dbo].[PDSP_Detail] (Shipment_No, Order_DetailID, Qty, CCC_Code, Order_PKOID)
               SELECT dbo.Product_Out.Shipment_NO
               , PKO_Price.Order_DetailID
               , SUM(dbo.Order_PKO_Detail_Qty.Qty * dbo.Product_Out_Detail.Cartons) AS QTY
               , s.CCC_Code
               , dbo.Product_Out.Order_PKOID
               FROM  dbo.Product_Out 
               INNER JOIN dbo.Product_Out_Detail ON dbo.Product_Out.Product_Out_No = dbo.Product_Out_Detail.Product_Out_No 
               INNER JOIN dbo.Order_PKO_Detail ON dbo.Product_Out_Detail.Order_PKO_DetailID = dbo.Order_PKO_Detail.Order_PKO_DetailID 
               INNER JOIN dbo.Order_PKO_Detail_Qty ON dbo.Product_Out_Detail.Order_PKO_DetailID = dbo.Order_PKO_Detail_Qty.Order_PKO_DetailID 
               Inner Join Product p on dbo.Product_Out_Detail.Product_No = p.Product_No 
               Inner Join Style s on s.Style_No = p.Style_No
               LEFT OUTER JOIN (
                     SELECT dbo.Order_PKO.Order_No, dbo.Order_PKO.Order_PKOID, dbo.Order_PKO.Product_No, 
                     MAX(dbo.Order_Detail.Unit_Price) AS Unit_Price, MIN(dbo.Order_Detail.Order_DetailID) AS Order_DetailID, dbo.Order_Qty.Size, dbo.Order_Detail.Qty - ISNULL(Shipped_Rec.Shiped_QTY, 0) AS Remaining_QTY, dbo.Order_Detail.Produce_No
                     FROM  dbo.Order_Qty 
                     INNER JOIN dbo.Order_Detail ON dbo.Order_Qty.Order_DetailID = dbo.Order_Detail.Order_DetailID 
                     INNER JOIN dbo.Order_PKO ON dbo.Order_Detail.Order_No = dbo.Order_PKO.Order_No AND dbo.Order_Detail.Product_No = dbo.Order_PKO.Product_No 
                     LEFT OUTER JOIN (
                           SELECT Order_DetailID, SUM(Qty) AS Shiped_QTY
                           FROM  dbo.PDSP_Detail
                           GROUP BY Order_DetailID
                     ) AS Shipped_Rec ON dbo.Order_Detail.Order_DetailID = Shipped_Rec.Order_DetailID
                     GROUP BY dbo.Order_PKO.Order_No, dbo.Order_PKO.Order_PKOID, dbo.Order_PKO.Product_No, dbo.Order_Detail.Qty - ISNULL(Shipped_Rec.Shiped_QTY, 0), dbo.Order_Qty.Size, dbo.Order_Detail.Produce_No
                     HAVING (dbo.Order_Detail.Qty - ISNULL(Shipped_Rec.Shiped_QTY, 0) > 0)
               ) AS PKO_Price ON dbo.Product_Out_Detail.Produce_No = PKO_Price.Produce_No 
               AND dbo.Order_PKO_Detail_Qty.Size = PKO_Price.Size 
               AND dbo.Product_Out.Order_PKOID = PKO_Price.Order_PKOID 
               AND dbo.Product_Out_Detail.Product_No = PKO_Price.Product_No
               GROUP BY   dbo.Product_Out.Shipment_NO, PKO_Price.Order_DetailID, dbo.Product_Out.Order_PKOID, s.CCC_Code
               HAVING  (dbo.Product_Out.Shipment_NO = {Shipment_No}) And Order_DetailID is not null;
           End           
         End  
         Select @ROWCOUNT as Flag;
         `, req.body);
      break;
      case 6:
         strSQL += format(`
         if(@Accounting = 0)
         begin 
            Delete From PDSP_Detail 
            Where Shipment_NO = {Shipment_No};

            Insert [dbo].[PDSP_Detail] (Shipment_No, Order_DetailID, Qty, CCC_Code, Order_PKOID)
            SELECT dbo.Product_Out.Shipment_NO
            , PKO_Price.Order_DetailID
            , SUM(dbo.Product_Packing_Detail.Qty * dbo.Product_Out_Detail.Cartons) AS QTY
            , s.CCC_Code
            , dbo.Product_Out.Order_PKOID
            FROM  dbo.Product_Out 
            INNER JOIN dbo.Product_Out_Detail ON dbo.Product_Out.Product_Out_No = dbo.Product_Out_Detail.Product_Out_No 
            INNER JOIN dbo.Product_Packing_Detail ON dbo.Product_Out_Detail.Product_PackingID = dbo.Product_Packing_Detail.Product_PackingID 
            Inner Join Product p on dbo.Product_Out_Detail.Product_No = p.Product_No 
            Inner Join Style s on s.Style_No = p.Style_No
            LEFT OUTER JOIN (SELECT dbo.Order_PKO.Order_No, dbo.Order_PKO.Order_PKOID, dbo.Order_PKO.Product_No, 
                                                                          MAX(dbo.Order_Detail.Unit_Price) AS Unit_Price, MIN(dbo.Order_Detail.Order_DetailID) 
                                                                          AS Order_DetailID, dbo.Order_Qty.Size, dbo.Order_Detail.Qty - ISNULL(Shipped_Rec.Shiped_QTY, 0) 
                                                                          AS Remaining_QTY, dbo.Order_Detail.Produce_No
                                              FROM               dbo.Order_Qty INNER JOIN
                                                                          dbo.Order_Detail ON dbo.Order_Qty.Order_DetailID = dbo.Order_Detail.Order_DetailID INNER JOIN
                                                                          dbo.Order_PKO ON dbo.Order_Detail.Order_No = dbo.Order_PKO.Order_No AND 
                                                                          dbo.Order_Detail.Product_No = dbo.Order_PKO.Product_No LEFT OUTER JOIN
                                                                              (SELECT          Order_DetailID, SUM(Qty) AS Shiped_QTY
                                                                                FROM               dbo.PDSP_Detail
                                                                                GROUP BY    Order_DetailID) AS Shipped_Rec ON 
                                                                          dbo.Order_Detail.Order_DetailID = Shipped_Rec.Order_DetailID
                                              GROUP BY    dbo.Order_PKO.Order_No, dbo.Order_PKO.Order_PKOID, dbo.Order_PKO.Product_No, 
                                                                          dbo.Order_Detail.Qty - ISNULL(Shipped_Rec.Shiped_QTY, 0), dbo.Order_Qty.Size, 
                                                                          dbo.Order_Detail.Produce_No
                                              HAVING            (dbo.Order_Detail.Qty - ISNULL(Shipped_Rec.Shiped_QTY, 0) > 0)) AS PKO_Price ON dbo.Product_Out_Detail.Produce_No = PKO_Price.Produce_No 
                                      AND dbo.Product_Packing_Detail.Size = PKO_Price.Size 
                                      AND dbo.Product_Out.Order_PKOID = PKO_Price.Order_PKOID 
                                      AND dbo.Product_Out_Detail.Product_No = PKO_Price.Product_No
            GROUP BY   dbo.Product_Out.Shipment_NO, PKO_Price.Order_DetailID, dbo.Product_Out.Order_PKOID, s.CCC_Code
            HAVING           (dbo.Product_Out.Shipment_NO = {Shipment_No}) And Order_DetailID is not null
         End  
         Select @@ROWCOUNT as Flag;
         `, req.body);

      break;
   }
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

//Maintain Shipment Detail
router.post('/Shipment_Detail_Maintain',  function (req, res, next) {
   console.log("Call Shipment_Detail_Maintain Api:",req.body);   
   var strSQL = "";
   
   // req.body.Mode === 0 表示新增
   // req.body.Mode === 1 表示修改
   // req.body.Mode === 2 表示刪除
   req.body.Shipment_No = req.body.Shipment_No ? `N'${req.body.Shipment_No.replace(/'/g, "''")}'` : `''`; 
   
   strSQL = format(`Declare @Accounting int 
   Set @Accounting = (SELECT case when isnull(p.Accounting,'') = '' then 0 else 1 end FROM PDSP as p WITH (NoWait, Nolock) Where p.Shipment_No = {Shipment_No})
   `,req.body);
   
   switch(req.body.Mode){
      case 0:
         req.body.QueryData = req.body.QueryData ? `N'${req.body.QueryData.replace(/'/g, "''")}'` : `''`; 
         req.body.Order_PKOID = req.body.Order_PKOID ? req.body.Order_PKOID : 'null'; 
         
         strSQL += format(`
         Declare @Key int
   
         if(@Accounting = 0)
         begin
            Declare @Import_Mode int = {Import_Mode}
            if(@Import_Mode = 0)
            begin
               Declare @Shipment_No Varchar(20) = {Shipment_No}
      
               Declare @Order_Detail table(Order_DetailID int, Order_No varchar(18), CustomerID varchar(15), Agent varchar(15), FactoryID varchar(15), Factory_SubID varchar(15)
               , Produce_No varchar(20), Product_No varchar(25), Customer_Product_No varchar(25), Destination varchar(30), Orig_Shipping_Date DateTime, Unit_Price float, Factory_Price float
               , Shipmented int, Order_Detail_RefID int, Ref_No varchar(20), Season varchar(10), Brand varchar(20), Currency varchar(4), PO_Currency varchar(4))
            
               Declare @Order_Qty Table(Order_DetailID int, Size float, Qty float)
               Declare @PDSP_Qty Table(Order_DetailID int, Qty float)
               Declare @PDSP_PKO_Qty Table(Order_DetailID int, Order_PKOID int, Qty float)
               Declare @PKO_Qty Table(Order_DetailID int, Order_PKOID int, PKO_No varchar(20), Destination nvarchar(30), Shipping_Date DateTime, Qty float)
            
               Insert @Order_Detail
               SELECT od.Order_DetailID, od.Order_No, o.CustomerID, o.Agent, p.FactoryID, p.Factory_SubID
               , od.Produce_No, od.Product_No, od.Customer_Product_No, od.Destination, od.Orig_Shipping_Date, od.Unit_Price, od.Factory_Price
               , p.Shipmented, od.Order_Detail_RefID, r.Ref_No, o.Season, o.Brand, o.Currency, o.PO_Currency
               FROM PDSP With(NoLock, NoWait)
               INNER JOIN dbo.Orders o With(NoLock, NoWait) ON (o.CustomerID = pdsp.CustomerID or o.Agent = pdsp.CustomerID)and o.Brand = pdsp.Brand and o.Season = pdsp.Season and o.Currency = pdsp.Currency and o.PO_Currency = pdsp.PO_Currency
               INNER JOIN dbo.Order_Detail od With(NoLock, NoWait) ON o.Order_No = od.Order_No
               Inner Join Order_Detail_Ref r with(NoLock,NoWait) on od.Order_Detail_RefID = r.Order_Detail_RefID
               INNER JOIN dbo.Produce p With(NoLock, NoWait) ON od.Produce_No = p.Produce_No
               Inner Join Order_Approve oa With(NoLock, NoWait) ON p.Order_ApproveID = oa.Order_ApproveID
               WHERE PDSP.Shipment_No = @Shipment_No
               And (ABS(isnull(p.Shipmented,0)) <> 1)
               And (ABS(isnull(p.UnProduce,0)) <> 1)               
               AND oa.Approve_Date is not null
               And p.Factory_SubID = pdsp.Factory_SubID
            
               Insert @Order_Qty
               Select tmp.Order_DetailID, Size, sum(oq.Qty)
               From @Order_Detail tmp
               Inner Join dbo.Order_Qty oq With(NoLock, NoWait) on tmp.Order_DetailID = oq.Order_DetailID
               Group by tmp.Order_DetailID, Size
            
               Insert @PDSP_Qty
               Select tmp.Order_DetailID, sum(oq.Qty)
               From @Order_Detail tmp
               Inner Join dbo.PDSP_Detail oq With(NoLock, NoWait) on tmp.Order_DetailID = oq.Order_DetailID
               Group by tmp.Order_DetailID, oq.Order_PKOID
            
               Insert @PKO_Qty
               Select Order_DetailID, Order_PKOID, PKO_No, Destination, Shipping_Date, Sum(Qty) as Qty
               From (
               Select distinct t.Order_DetailID, t.Order_No, t.Product_No, t.Ref_No, opq.Size, op.Order_PKOID, op.PKO_No, op.Destination, op.Shipping_Date, opq.Qty
               From @Order_Detail t
               Inner Join @Order_Qty oq on oq.Order_DetailID = t.Order_DetailID
               Inner Join Order_PKO op with(NoLock,NoWait) on t.Order_Detail_RefID = op.Order_Detail_RefID
               Inner join Order_PKO_Qty opq with(NoWait,NoLock) on op.Order_PKOID = opq.Order_PKOID And oq.Size = opq.Size) tmp
               Group by Order_DetailID, Order_PKOID, PKO_No, Destination, Shipping_Date
            
               Insert @PDSP_PKO_Qty
               Select pd.Order_DetailID, tmp.Order_PKOID, Sum(pd.Qty) as Qty
               From (Select Order_PKOID From @PKO_Qty Group by Order_PKOID) tmp
               Inner Join PDSP_Detail pd with(NoLock, NoWait) on pd.Order_PKOID = tmp.Order_PKOID
               Group by pd.Order_DetailID, tmp.Order_PKOID
                     
               Insert [dbo].[PDSP_Detail] (Shipment_No, Order_DetailID, Qty, CCC_Code, Order_PKOID)
               Select @Shipment_No as Shipment_No, tmp.Order_DetailID
               , case when PKO.Order_PKOID is not null and (isnull(PKO.Qty,0) - isnull(PDSP_PKO.Qty,0)) > 0 
               then
                  (isnull(PKO.Qty,0) - isnull(PDSP_PKO.Qty,0)) 
               else 
                  (isnull(oq.Qty,0) - isnull(pq.Qty,0))
               End	as Qty
               , s.CCC_Code, PKO.Order_PKOID    
               From @Order_Detail tmp
               INNER JOIN dbo.Product pt With(NoLock, NoWait) ON tmp.Product_No = pt.Product_No
               INNER JOIN dbo.Style s With(NoLock, NoWait) ON pt.Style_No = s.Style_No
               Left outer Join @PKO_Qty PKO on tmp.Order_DetailID = pko.Order_DetailID
               Left outer Join @PDSP_PKO_Qty PDSP_PKO on PDSP_PKO.Order_PKOID = pko.Order_PKOID And PDSP_PKO.Order_DetailID = pko.Order_DetailID
               Left outer Join (Select Order_DetailID, Sum(Qty) as Qty From @Order_Qty Group by Order_DetailID) oq on tmp.Order_DetailID = oq.Order_DetailID
               Left outer Join (Select Order_DetailID, Sum(Qty) as Qty From @PDSP_Qty Group by Order_DetailID) pq  on tmp.Order_DetailID = pq.Order_DetailID	
/*               
               Where ((PKO.Order_PKOID is null And isnull(oq.Qty,0) - isnull(pq.Qty,0) <> 0) or (PKO.Order_PKOID is not null And isnull(PKO.Qty,0) - isnull(PDSP_PKO.Qty,0) <> 0))               And ({QueryData} = '' or charindex({QueryData}, isnull(tmp.CustomerID,'') + ' ' + isnull(tmp.Factory_SubID,'') + ' ' + isnull(tmp.Order_No,'') + ' ' + isnull(tmp.Ref_No,'') + ' ' + isnull(PKO.PKO_No,'') + ' ' + isnull(tmp.Produce_No,'') + ' ' +  isnull(tmp.Product_No,'') + ' ' + isnull(tmp.Customer_Product_No,'') + ' ' + isnull(tmp.Destination,'') + ' ' + isnull(Convert(varchar(20),tmp.Orig_Shipping_Date,111),'') + ' ' + isnull(tmp.Season,'')) > 0)
                  And ({PKO_Only_Flag}=0 or PKO.PKO_No is not null )
*/
               Where ((isnull(oq.Qty,0) - isnull(pq.Qty,0) <> 0) or (isnull(PKO.Qty,0) - isnull(PDSP_PKO.Qty,0) <> 0))
               And ({QueryData} = '' or charindex({QueryData}, isnull(tmp.CustomerID,'') + ' ' + isnull(tmp.Factory_SubID,'') + ' ' + isnull(tmp.Order_No,'') + ' ' + isnull(tmp.Ref_No,'') + ' ' + isnull(PKO.PKO_No,'') + ' ' + isnull(tmp.Produce_No,'') + ' ' +  isnull(tmp.Product_No,'') + ' ' + isnull(tmp.Customer_Product_No,'') + ' ' + isnull(tmp.Destination,'') + ' ' + isnull(Convert(varchar(20),tmp.Orig_Shipping_Date,111),'') + ' ' + isnull(tmp.Season,'')) > 0)
               And ({PKO_Only_Flag}=0 or PKO.PKO_No is not null )

                  ORDER BY CustomerID, tmp.Order_No, Factory_SubID DESC , Produce_No; 
               end
            else
            begin 
               Insert [dbo].[PDSP_Detail] (Shipment_No, Order_DetailID, Qty, CCC_Code, Order_PKOID)
               Select {Shipment_No} as Shipment_No, {Order_DetailID} as Order_DetailID, {Qty} as Qty , N'{CCC_Code}' as CCC_Code, {Order_PKOID} as Order_PKOID
            end 
         end
            `,req.body);
      break;
      case 1: 
   
         if((req.body.Name === 'CCC_Code' || req.body.Name === 'PKO_No')) 
         {      
            var fieldSize = 0;
            switch(req.body.Name) {
               case 'CCC_Code':
                  fieldSize = 15;
               break;
               case 'PKO_No':
                  fieldSize = 18;
               break;
               
            }
            req.body.Value = req.body.Value ? `N'${req.body.Value.trim().substring(0,fieldSize).replace(/'/g, "''")}'` : `''`; 
         }
   
         strSQL += format(`
         if(@Accounting = 0)
         begin
            Update [dbo].[PDSP_Detail] Set [{Name}] = {Value} 
            where Shipment_DetailID = {Shipment_DetailID};
         End
         `,req.body);      
      break;
      case 2:
         strSQL += format(`
         if(@Accounting = 0)
         begin
            Delete From PDSP_Detail 
            Where Shipment_DetailID = {Shipment_DetailID};
         end
         `,req.body);
      break;
   }   
   
   strSQL += format(`
   Declare @Flag int;
   Set @Flag = @@ROWCOUNT;
   Select @Flag as Flag;
   Declare @Check int = ${req.body.Mode == 0 || (req.body.Mode == 1 && req.body.Name === 'Qty') || req.body.Mode == 2 ? 1 : 0}; 
   
   if(@Flag > 0 )
   Begin
      Update [dbo].[PDSP] Set UserID = isnull(UserID, N'${req.UserID}'), Data_Updater = N'${req.UserID}'
      , Data_Update = GetDate()
      where Shipment_No = {Shipment_No}
      
      --判定製令是否出完貨 進行Shipmented
      if(@Check > 0)
      Begin
         Declare @tmpProduce Table(Produce_No Varchar(20)) ;
         Declare @TmpTable table (Produce_No Varchar(20), Order_DetailID int, O_Qty float, P_Qty float);
         
         Insert @tmpProduce
         Select od.Produce_No
         From PDSP_Detail pd  with(NoLock, NoWait)
         Inner Join Order_Detail od with(NoLock, NoWait) on od.Order_DetailID = pd.Order_DetailID
         Where pd.Shipment_No = {Shipment_No}
         Group by od.Produce_No
            
         Insert @TmpTable(Produce_No, Order_DetailID, O_Qty)
         Select t.Produce_No, od.Order_DetailID, Sum(os.Qty) as O_Qty
         From @tmpProduce  t
         Inner Join Order_Detail od with(NoLock, NoWait) on t.Produce_No = od.Produce_No
         Inner Join Order_Qty os with(NoLock, NoWait) on od.Order_DetailID = os.Order_DetailID
         Group by t.Produce_No, od.Order_DetailID
         
         Insert @TmpTable (Produce_No, Order_DetailID, P_Qty)
         Select t.Produce_No, pd.Order_DetailID, sum(pd.Qty) as P_Qty
         From PDSP_Detail pd with(NoLock, NoWait)
         Inner Join  @TmpTable t on t.Order_DetailID = pd.Order_DetailID
         Group by t.Produce_No, pd.Order_DetailID
         
         
         Update Produce set Shipmented = case when isnull(O_Qty,0) <= isnull(P_Qty,0) and isnull(O_Qty,0) > 0 then 1 else 0 end
         From Produce p
         inner Join ( Select Produce_No, sum(O_Qty) as O_Qty, sum(P_Qty) as P_Qty From @TmpTable t Group by t.Produce_No
         ) tmp on p.Produce_No = tmp.Produce_No
      End
   End
   `, req.body)    
    //console.log(strSQL)
   db.sql(req.SiteDB, strSQL)
      .then((result) => {
         var DataSet = {Flag:result.recordsets[0][0].Flag > 0}
         switch(req.body.Mode){
            case 1:
               if(req.body.Name == 'Product_No'){
                  DataSet.Product_No_Flag = result.recordsets[1][0].Product_No_Flag
                  DataSet.Customer_Product_No = result.recordsets[1][0].Customer_Product_No
                  DataSet.Pattern_No = result.recordsets[1][0].Pattern_No
                  DataSet.CCC_Code = result.recordsets[1][0].CCC_Code
                  DataSet.Article_Name = result.recordsets[1][0].Article_Name
               }
               if(req.body.Name == 'MTR_Declare_Rate' || req.body.Name == 'Est_Process_Cost'){
                  DataSet.Factory_Price = result.recordsets[1][0].Factory_Price
               }      
               break;
            case 3:
               DataSet.Qty = result.recordsets[1][0].Qty
               DataSet.Size_Status = result.recordsets[1][0].Size_Status
               break;
         }
         //console.log(DataSet)
         res.send(DataSet);
      }).catch((err) => {
         console.log(err);
         res.status(500).send(err);
      })
   
});
 
//Maintain Shipment Fee
router.post('/Fee_Maintain',  function (req, res, next) {
   console.log("Call Fee_Maintain Api:",req.body);

   // req.body.Mode === 0 表示新增
   // req.body.Mode === 1 表示修改 
   // req.body.Mode === 2 表示刪除
   req.body.Shipment_No = req.body.Shipment_No ? `N'${req.body.Shipment_No.trim().substring(0,18).replace(/'/g, "''")}'` : `''`; 

   var strSQL = format(`Declare @Accounting int 
   Declare @ROWCOUNT int=0;  
   Set @Accounting =  ${req.body.Name === 'Accounting' ? "0": "(SELECT case when isnull(p.Approve,'') = '' or isnull(p.Accounting,'') = '' then 0 else 1 end FROM PDSP as p WITH (NoWait, Nolock) Where p.Shipment_No = {Shipment_No})" }      
   `, req.body);

   if(req.body.Mode === 0 ) {
      req.body.Date = req.body.Date ? `N'${req.body.Date.trim().substring(0,10).replace(/'/g, "''")}'` : `''`; 
      req.body.Target = req.body.Target ? `N'${req.body.Target.trim().substring(0,15).replace(/'/g, "''")}'` : `''`; 
      req.body.Rcv_Amount = req.body.Rcv_Amount ? req.body.Rcv_Amount : 0; 
      req.body.Pay_Amount = req.body.Pay_Amount ? req.body.Pay_Amount : 0; 
      req.body.Decription = req.body.Decription ? `N'${req.body.Decription.trim().substring(0,30).replace(/'/g, "''")}'` : `''`; 
   }

   if(req.body.Mode === 1 && (req.body.Name == 'Date' || req.body.Name == 'Target' || req.body.Name == 'Decription' )) {
      var Size = 0;
      switch(req.body.Name) {
         case 'Date':
            Size = 10;
         break;
         case 'Target':
            Size = 15;
         break;
         case 'Decription':
            Size = 30;
         break;
      }
      req.body.Value = req.body.Value ? `N'${req.body.Value.trim().substring(0,Size).replace(/'/g, "''")}'` : `''`;      
   }


   switch(req.body.Mode){
      case 0:
         strSQL += format(`
         if(@Accounting = 0)
         begin
            Insert into [dbo].[PDSP_Expense] (Shipment_No, [Date], [Target], Rcv_Amount, Pay_Amount, [Decription] )
            Select {Shipment_No} as Shipment_No, {Date} as [Date], {Target} as Target, {Rcv_Amount} as Rcv_Amount, {Pay_Amount} as Pay_Amount, {Decription} as Decription 
            Set @ROWCOUNT = @@ROWCOUNT;            
         end
         `, req.body);
      break;
      case 1:        
         strSQL += format(`     
         if(@Accounting = 0)
         begin   
            Update [dbo].[PDSP_Expense] Set [{Name}] = {Value}
            where PDSP_ExpenseID = {PDSP_ExpenseID};
            Set @ROWCOUNT = @@ROWCOUNT;            
         End
         `, req.body);
      break;
      case 2:
         strSQL += format(`         
         if(@Accounting = 0)
         begin      
            Delete FROM [dbo].[PDSP_Expense] 
            where PDSP_ExpenseID = {PDSP_ExpenseID};
            Set @ROWCOUNT = @@ROWCOUNT;
         End
         `, req.body);      
      break;      
   }

   strSQL += format(`
   Select @ROWCOUNT as Flag;   
   if(@ROWCOUNT > 0 )
   Begin
      Update [dbo].[PDSP] Set UserID = isnull(UserID, N'${req.UserID}'), Data_Updater = N'${req.UserID}'
      , Data_Update = GetDate()
      where Shipment_No = {Shipment_No}
   End
   `, req.body)    
   
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

//Maintain Shipment RCV
router.post('/RCV_Maintain',  function (req, res, next) {
   console.log("Call RCV_Maintain Api:",req.body);

   // req.body.Mode === 0 表示新增
   // req.body.Mode === 1 表示修改 
   // req.body.Mode === 2 表示刪除
   // req.body.Mode === 3 表示拆分金額
   req.body.Shipment_No = req.body.Shipment_No ? `N'${req.body.Shipment_No.trim().substring(0,18).replace(/'/g, "''")}'` : `''`; 

   var strSQL = format(`Declare @Accounting int 
   Declare @ROWCOUNT int=0;  
   Set @Accounting =  ${req.body.Name === 'Accounting' ? "0": "(SELECT case when isnull(p.Accounting,'') = '' or {IsAccounting} = 1 then 0 else 1 end FROM PDSP as p WITH (NoWait, Nolock) Where p.Shipment_No = {Shipment_No})" }
   `, req.body);

   switch(req.body.Mode){
      case 0:
         req.body.Type = req.body.Type ? `N'${req.body.Type.trim().substring(0,10).replace(/'/g, "''")}'` : `''`; 
         req.body.Description = req.body.Description ? `N'${req.body.Description.trim().substring(0,30).replace(/'/g, "''")}'` : `''`;    
         strSQL += format(`         
         if(@Accounting = 0)
         begin   
            Insert into [dbo].[Money_Source] (Type, Days, By_Doc_Rcv, Deposit, Subject, Source_No, Description, [Update_User] ,[Update_Date] )
            Select {Type} as Type, {Days} as Days, {By_Doc_Rcv} as By_Doc_Rcv, {Deposit} as Deposit, 'PDSP RCV' as Subject, {Shipment_No} as Source_No, {Description} as Description, N'${req.UserID}' as [Update_User], GetDate() as [Update_Date]
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

         strSQL += format(`Declare  @Split_Amount float = {Split_Amount};

         Insert into [dbo].[Money_Source] (Type, Days, By_Doc_Rcv, Payment_Term, IsEOM, EOM_Day, Initial_Date, Deposit, Subject, Source_No, Description, [Update_User] ,[Update_Date])
         Select ms.Type as Type, ms.Days as Days, ms.By_Doc_Rcv as By_Doc_Rcv, ms.Payment_Term as Payment_Term, ms.IsEOM as IsEOM, ms.EOM_Day as EOM_Day, ms.Initial_Date as Initial_Date
         , @Split_Amount as Deposit
         , ms.Subject as Subject, ms.Source_No as Source_No, ms.Description as Description, N'${req.UserID}' as [Update_User], GetDate() as [Update_Date]
         From Money_Source ms with(NoLock,NoWait) 
         Where ms.Money_SourceID = {Money_SourceID}
         And ms.MoneyID is null 
         And ABS(isnull(ms.Deposit,0)) - ABS(isnull(@Split_Amount,0)) > 0

         Set @ROWCOUNT = @@ROWCOUNT;

         if (@ROWCOUNT > 0)
         Begin
            Update Money_Source set Deposit = Deposit - @Split_Amount
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
      Update [dbo].[PDSP] Set UserID = isnull(UserID, N'${req.UserID}'), Data_Updater = N'${req.UserID}'
      , Data_Update = GetDate()
      where Shipment_No = {Shipment_No}
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

//Maintain Shipment Commission
router.post('/Commission_Maintain',  function (req, res, next) {
   console.log("Call Commission_Maintain Api:",req.body);

   // req.body.Mode === 0 表示重整Commission
   // req.body.Mode === 1 表示選擇用哪一個ReceivableID來付款
   req.body.Shipment_No = req.body.Shipment_No ? `N'${req.body.Shipment_No.trim().substring(0,18).replace(/'/g, "''")}'` : `''`; 

   var strSQL = format(`Declare @Accounting int; 
   Declare @ROWCOUNT int=0;  
   Set @Accounting =  ${req.body.Name === 'Accounting' ? "0": "(SELECT case when isnull(p.Accounting,'') = '' then 0 else 1 end FROM PDSP as p WITH (NoWait, Nolock) Where p.Shipment_No = {Shipment_No})" }      
   `, req.body);


   switch(req.body.Mode){
      case 0:
         strSQL += format(`
         if(@Accounting = 0)
         begin
            Declare @PDSP_Detail Table (Order_DetailID int, Qty int);
            Declare @RecCount int = 0;
         
            insert @PDSP_Detail(Order_DetailID, Qty)
            Select p.Order_DetailID, sum(isnull(p.Qty,0)) as Qty
            From PDSP_Detail p  With(NoLock,NoWait) 
            Where p.Shipment_No = {Shipment_No}
            Group by p.Order_DetailID;        
               
            Select @RecCount = count(*)
            From Money_Source ms with(NoLock, NoWait) 
            Where ms.Source_No = {Shipment_No}
            And ms.Subject = 'Commission PAY' 
            And (ms.MoneyID is not null or isnull(ms.MoneyID, '') != '')
               
            if(@RecCount = 0 )
            Begin
               DELETE FROM Money_Source WHERE Source_No = {Shipment_No} and Subject = 'Commission PAY' And isnull(MoneyID, '') = '';
               INSERT INTO Money_Source ( CustomerID, Withdrawal, Subject, Source_No, Description )
               --SELECT ode.CustomerID, CEILING(SUM(o.Unit_Price * ode.Rate * p.Qty * -1)) AS Withdrawal, 'Commission PAY' as Subject, {Shipment_No} as Source_No, ode.Description
               SELECT ode.CustomerID, ROUND(SUM(o.Unit_Price * ode.Rate * p.Qty * -1),2) AS Withdrawal, 'Commission PAY' as Subject, {Shipment_No} as Source_No, ode.Description
               FROM @PDSP_Detail p 
               INNER JOIN dbo.Order_Detail_Expense ode With(NoLock, NoWait) ON ode.Order_DetailID = p.Order_DetailID And ode.Category = 'Commission'
               INNER JOIN Order_Detail o WITH(NoLock, NoWait) ON o.Order_DetailID = p.Order_DetailID
               GROUP BY ode.CustomerID, ode.Description
               Set @ROWCOUNT = @@ROWCOUNT;
            End
         End
         `, req.body);
      break;
      case 1:        
         strSQL += format(`     
         if(@Accounting = 0)
         begin   
            Update [dbo].[Money_Source] Set [{Name}] = {Value}
            , Update_User = N'${req.UserID}'
            , Update_Date = GetDate()
            where Money_SourceID = {Money_SourceID}
            Set @ROWCOUNT = @@ROWCOUNT;            
         End
         `, req.body);
      break;
   }

   strSQL += format(`     
   Select @ROWCOUNT as Flag;   
   if(@ROWCOUNT > 0 )
   Begin
      Update [dbo].[PDSP] Set UserID = isnull(UserID, N'${req.UserID}'), Data_Updater = N'${req.UserID}'
      , Data_Update = GetDate()
      where Shipment_No = {Shipment_No}
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

//Get Shipping Advice
router.post('/Shipping_Advice',  function (req, res, next) {
   console.log("Call Shipping_Advice Api:",req.body);   
   req.body.Shipment_No = req.body.Shipment_No ? `N'${req.body.Shipment_No.trim().substring(0,18).replace(/'/g, "''")}'` : `''`; 

   var strSQL = format(`  
   --Declare @Shipment_No Varchar(18) = 'B20-139B'
   Declare @Shipment_No Varchar(18) = {Shipment_No}
   Declare @PDSP_Currency varchar(4)   
   Declare @TmpPDSP table (Shipment_No nvarchar(18), Currency Varchar(4), Date varchar(10), Forwarder varchar(30), Messrs nvarchar(100), S_Port nvarchar(100) , F_Vessel nvarchar(40), T_Port nvarchar(100), M_Vessel nvarchar(40), Destination nvarchar(50), Packages nvarchar(30), Measurement nvarchar(50), Container nvarchar(50), Organization_Name nvarchar(70))
   Declare @TmpOrder table(PI_No Varchar(15), Order_No_Title varchar(20), Ref_No_Title varchar(20), Order_No nvarchar(18), Ref_No varchar(20), Product_No varchar(25), Color varchar(70), Name varchar(50), Unit_Price float, Qty float, Unit varchar(10), Amount float)
  
   Insert @TmpPDSP
   Select Shipment_No, p.Currency, Convert(varchar(10),GetDate(),111) as Date, p.Forwarder, p.Messrs
   , 'ETD ' + isnull(p.S_Port,'') + ' : ' + case when p.F_ETD is null then '' else Convert(varchar(10),p.F_ETD,111) end as S_Port
   , isnull( p.F_Vessel,'') as F_Vessel
   , 'ETD ' + isnull(p.T_Port,'') + ' : ' + case when p.M_ETD is null then '' else Convert(varchar(10),p.M_ETD,111) end as T_Port
   , isnull( p.M_Vessel,'') as M_Vessel
   , 'ETA '+ isnull(p.Destination,'') + ' : ' + case when p.M_ETA is null then '' else Convert(varchar(10),p.M_ETA,111) end as Destination
   , p.Cartons as Packages, p.Measurement, p.Container
   , (Select o.Organization_Name From Organization o Where p.OrganizationID = o.OrganizationID) as Organization_Name
   From PDSP p With(NoLock,NoWait)
   Where p.Shipment_No = @Shipment_No

   set @PDSP_Currency = isnull( (Select Currency From @TmpPDSP) ,'USD')
   
   --0 Head
   Select * From @TmpPDSP
   
   Insert @TmpOrder
   SELECT isnull(o.PI_No,'') as PI_No, isnull(o.Order_No_Title,'Order No') as Order_No_Title, isnull(o.Ref_No_Title,'') as Ref_No_Title, o.Order_No, r.Ref_No, od.Product_No, pt.Color, pt.Name, isnull(od.Unit_Price,0) as Unit_Price, sum(isnull(pd.Qty,0)) as Qty, isnull(st.Unit,'PRS') as Unit, sum(isnull(od.Unit_Price * pd.Qty,0)) as Amount
   FROM PDSP_Detail pd with(NoLock,NoWait) 
   Inner Join Order_Detail od with(NoLock,NoWait) ON pd.Order_DetailID = od.Order_DetailID
   Inner Join Order_Detail_Ref r with(NoLock,NoWait) on od.Order_Detail_RefID = r.Order_Detail_RefID
   Inner Join Product pt with(NoLock,NoWait) ON pt.Product_No = od.Product_No
   Inner Join Style st with(NoLock,NoWait) ON st.Style_No = pt.Style_No
   Inner Join Orders o with(NoLock, NoWait) on o.Order_No = od.Order_No
   Where pd.Shipment_No = @Shipment_No
   Group by o.PI_No, o.Order_No_Title, o.Ref_No_Title, o.Order_No, r.Ref_No, od.Product_No, pt.Color, pt.Name, od.Unit_Price, st.Unit;
   
   --1 PI
   Select o.PI_No, o.Order_No_Title, o.Ref_No_Title From @TmpOrder o Group by o.PI_No, o.Order_No_Title, o.Ref_No_Title
   
   --2 Detail
   Select o.PI_No + '_0' as SortID,0 as Sort_Flag, o.PI_No, o.Order_No, o.Ref_No, o.Product_No, o.Color, o.Name, @PDSP_Currency + ' ' + Format(o.Unit_Price,'N2') as Unit_Price, Format(o.Qty,'N0') + ' ' + o.Unit as Qty, @PDSP_Currency + ' ' + Format(o.Amount, 'N2') as Amount From @TmpOrder o
   union
   Select o.PI_No + '_1' as SortID,1 as Sort_Flag, o.PI_No,  '' as Order_No, '' as Ref_No, '' as Product_No, '' as Color, '' as Name, '' as Unit_Price, Format(sum(o.Qty),'N0') + ' ' + o.Unit as Qty, @PDSP_Currency + ' ' + Format(sum(o.Amount), 'N2') as Amount From @TmpOrder o Group by o.PI_No, o.Unit
   Order by SortID, Sort_Flag
   --3 Grand Total
   Select Format(sum(o.Qty),'N0') + ' ' + o.Unit as Grand_Qty, @PDSP_Currency + ' ' + Format(Sum(o.Unit_Price * o.Qty),'N2') as Grand_Total From @TmpOrder o Group by o.Unit

   --4 Payment Term
   Select dbo.Get_Payment_Term('', m.Type, m.Days, m.By_Doc_Rcv) as Payment_Term  
   , p.Currency + ' ' + FORMAT(Round(m.Deposit, case when p.Currency = 'TWD' then 0 else 2 end), 'N2') as Amount
   from Money_Source m With(NoLock,NoWait) 
   Inner Join PDSP p With(NoLock,NoWait) on m.Source_No = p.Shipment_No 
   where m.Source_No = @Shipment_No and m.Subject = 'PDSP RCV' 
   `, req.body) ;
   //console.log(strSQL)
   db.sql(req.SiteDB, strSQL)
      .then((result) => {
         result.recordsets[1].forEach((obj) => {
            var Detail = [];
            result.recordsets[2].forEach((item) => {
               if(obj.PI_No == item.PI_No) {
                  Detail.push(item);
               }
            });
            obj.Order_Info = Detail;
         });

         var DataSet = {
            Head:result.recordsets[0],
            Detail:result.recordsets[1],
            Grand_Qty:result.recordsets[3][0] ? result.recordsets[3][0].Grand_Qty:0,
            Grand_Total:result.recordsets[3][0] ? result.recordsets[3][0].Grand_Total:0,
            Organization_Name:result.recordsets[0] ? result.recordsets[0][0].Organization_Name:'',
            Payment_Term:result.recordsets[4],
         }
         //console.log(DataSet)
         res.send(DataSet);
      }).catch((err) => {
         console.log(err);
         res.status(500).send(err);
      })

});

//Get PKO Shipping Status (PKO出貨狀態)
router.post('/PKO_Shipping_Status_Info',  function (req, res, next) {
   console.log("Call PKO_Shipping_Status_Info Api:",req.body);   
   req.body.Department = req.body.Department ? `N'${req.body.Department.trim().substring(0,20).replace(/'/g, "''")}'` : `'%'`; 
   req.body.Season = req.body.Season ? `N'${req.body.Season.trim().substring(0,10).replace(/'/g, "''")}'` : `'All'`; 
   req.body.Brand = req.body.Brand ? `N'${req.body.Brand.trim().substring(0,30).replace(/'/g, "''")}'` : `'%'`; 
   req.body.CustomerID = req.body.CustomerID ? `N'${req.body.CustomerID.trim().substring(0,15).replace(/'/g, "''")}'` : `'%'`; 

   var strSQL = format(`  
   Declare @Department varchar(20) = {Department}
   , @Season varchar(10) = {Season}
   , @Brand varchar(30) = {Brand}
   , @CustomerID varchar(15) = {CustomerID};
   
   SELECT TOP (100) PERCENT o.CustomerID, o.Brand, o.Currency, o.Season
   , SUM(op.QTY) AS PKO_QTY
   , SUM(CASE WHEN o.Purpose = 'Official' THEN op.QTY ELSE 0 END) AS PKO_Official_QTY
   , Round(SUM(CASE WHEN o.Purpose = 'Official' THEN (p.Lasting_QTY * CASE WHEN p.QTY = 0 THEN 0 ELSE op.QTY / p.QTY END) ELSE 0 END),0) AS Produced_QTY
   , Round(SUM(CASE WHEN o.Purpose = 'Official' THEN (p.Lasting_QTY * CASE WHEN p.QTY = 0 THEN 0 ELSE op.QTY / p.QTY END) ELSE 0 END),0) / SUM(op.QTY) AS Produced_Rate
   , SUM(CASE WHEN o.Purpose = 'Cancel' THEN op.QTY ELSE 0 END) AS Canceled_QTY
   , ISNULL(SUM(ISNULL(pd.SP_PKO_QTY, 0)) / SUM(op.QTY), 0) AS SP_Rate
   , SUM(ISNULL(pd.SP_PKO_QTY, 0)) AS SP_PKO_QTY
   , SUM(CASE WHEN (CASE WHEN o.Purpose = 'Official' THEN op.QTY ELSE 0 END) >= ISNULL(SP_PKO_QTY, 0) AND ABS(isnull(p.Shipmented,0)) = 1 THEN (CASE WHEN o.Purpose = 'Official' THEN op.QTY ELSE 0 END) - ISNULL(SP_PKO_QTY, 0) ELSE 0 END) AS Shortage_QTY
   , SUM((CASE WHEN (CASE WHEN o.Purpose = 'Official' THEN op.QTY ELSE 0 END) >= ISNULL(SP_PKO_QTY, 0) AND ABS(isnull(p.Shipmented,0)) = 0 THEN (CASE WHEN o.Purpose = 'Official' THEN op.QTY ELSE 0 END) - ISNULL(SP_PKO_QTY, 0) ELSE 0 END))  AS NO_SP_QTY
   , CASE WHEN Round(SUM(CASE WHEN o.Purpose = 'Official' THEN (p.Lasting_QTY * CASE WHEN p.QTY = 0 THEN 0 ELSE op.QTY / p.QTY END) ELSE 0 END),0) - SUM(ISNULL(pd.SP_PKO_QTY, 0)) <= 0 THEN 0 ELSE Round(SUM(CASE WHEN o.Purpose = 'Official' THEN (p.Lasting_QTY * CASE WHEN p.QTY = 0 THEN 0 ELSE op.QTY / p.QTY END) ELSE 0 END),0) - SUM(ISNULL(pd.SP_PKO_QTY, 0)) END AS PKO_Pending
   FROM Order_Detail od with(Nolock, NoWait)
   INNER JOIN Orders o with(Nolock, NoWait) ON od.Order_No = o.Order_No 
   INNER JOIN Produce p with(Nolock, NoWait) ON od.Produce_No = p.Produce_No
   Inner Join Order_PKO op with(Nolock, NoWait) on op.Order_Detail_RefID = od.Order_Detail_RefID
   LEFT OUTER JOIN ( SELECT pd1.Order_PKOID, SUM(pd1.QTY) AS SP_PKO_QTY
                      FROM PDSP_Detail AS pd1
             INNER JOIN PDSP ON pd1.Shipment_NO = PDSP.Shipment_NO
                   WHERE (PDSP.F_ETD <= GETDATE())
                   GROUP BY pd1.Order_PKOID) AS pd ON op.Order_PKOID = pd.Order_PKOID
   WHERE (op.QTY <> 0) 
   AND (@Department = '%' or o.Department LIKE '%' + @Department + '%') 
   AND (o.Purpose = 'Official' OR o.Purpose = 'Cancel')
   AND ABS(isnull(p.Shipmented,0)) <> 1
   GROUP BY o.Season, o.Currency, o.Brand, LEFT(o.Season, 4), o.CustomerID
   HAVING (@Season = 'All' or o.Season LIKE '%' + @Season + '%') 
   AND (@Brand = '%' or o.Brand LIKE '%' + @Brand + '%') 
   AND (LEFT(o.Season, 4) > '2012') 
   AND (@CustomerID = '%' or o.CustomerID LIKE '%' + @CustomerID + '%') 
   AND (SUM((CASE WHEN (CASE WHEN o.Purpose = 'Official' THEN op.QTY ELSE 0 END) >= ISNULL(SP_PKO_QTY, 0) AND ABS(isnull(p.Shipmented,0)) = 0 THEN (CASE WHEN o.Purpose = 'Official' THEN op.QTY ELSE 0 END) - ISNULL(SP_PKO_QTY, 0) ELSE 0 END)) > 0)
   ORDER BY o.CustomerID, o.Brand

   `, req.body) ;
   //console.log(strSQL)
   db.sql(req.SiteDB, strSQL)
      .then((result) => {
         var DataSet = {Detail_Info:result.recordsets[0], 
            Foot_Info:{PKO_QTY:0, Canceled_QTY:0, Produced_QTY:0, SP_PKO_QTY:0, PKO_Pending:0, Shortage_QTY:0, NO_SP_QTY:0}
         };
         result.recordsets[0].forEach((item)=>{
            DataSet.Foot_Info.PKO_QTY += item.PKO_QTY;
            DataSet.Foot_Info.Canceled_QTY += item.Canceled_QTY;
            DataSet.Foot_Info.Produced_QTY += item.Produced_QTY;
            DataSet.Foot_Info.SP_PKO_QTY += item.SP_PKO_QTY;
            DataSet.Foot_Info.PKO_Pending += item.PKO_Pending;
            DataSet.Foot_Info.Shortage_QTY += item.Shortage_QTY;
            DataSet.Foot_Info.NO_SP_QTY += item.NO_SP_QTY;
         })
         res.send(DataSet);
      }).catch((err) => {
         console.log(err);
         res.status(500).send(err);
      })

});

//Get PKO Shipping Status Detail (PKO出貨狀態)
router.post('/PKO_Shipping_Status_Detail_Info',  function (req, res, next) {
   console.log("Call PKO_Shipping_Status_Detail_Info Api:");   
   req.body.CustomerID = req.body.CustomerID ? `N'${req.body.CustomerID.trim().substring(0,15).replace(/'/g, "''")}'` : `'%'`; 
   req.body.Brand = req.body.Brand ? `N'${req.body.Brand.trim().substring(0,30).replace(/'/g, "''")}'` : `'%'`; 
   req.body.Season = req.body.Season ? `N'${req.body.Season.trim().substring(0,10).replace(/'/g, "''")}'` : `'All'`; 
   req.body.Order_No = req.body.Order_No ? `N'${req.body.Order_No.trim().substring(0,18).replace(/'/g, "''")}'` : `'%'`; 
   req.body.Product_No = req.body.Product_No ? `N'${req.body.Product_No.trim().substring(0,25).replace(/'/g, "''")}'` : `'%'`; 
   req.body.Name = req.body.Name ? `N'${req.body.Name.trim().substring(0,30).replace(/'/g, "''")}'` : `'%'`; 
   req.body.Produce_No = req.body.Produce_No ? `N'${req.body.Produce_No.trim().substring(0,20).replace(/'/g, "''")}'` : `'%'`; 

   var strSQL = format(`  
   Declare @Season varchar(10) = {Season}
   , @Brand varchar(30) = {Brand}
   , @CustomerID varchar(15) = {CustomerID}
   , @Order_No varchar(18) = {Order_No}
   , @Product_No varchar(25) = {Product_No}
   , @Name varchar(50) = {Name}
   , @Produce_No varchar(20) = {Produce_No}
   
   SELECT TOP (100) PERCENT o.CustomerID, o.Brand, o.Currency, o.Season, o.Order_No, p.Product_No, p.Produce_No, pt.Name
   , SUM(op.QTY) AS PKO_QTY
   , SUM(CASE WHEN o.Purpose = 'Official' THEN op.QTY ELSE 0 END) AS PKO_Official_QTY
   , Round(SUM(CASE WHEN o.Purpose = 'Official' THEN (p.Lasting_QTY * CASE WHEN p.QTY = 0 THEN 0 ELSE op.QTY / p.QTY END) ELSE 0 END),0) AS Produced_QTY
   , Round(SUM(CASE WHEN o.Purpose = 'Official' THEN (p.Lasting_QTY * CASE WHEN p.QTY = 0 THEN 0 ELSE op.QTY / p.QTY END) ELSE 0 END),0) / SUM(op.QTY) AS Produced_Rate
   , SUM(CASE WHEN o.Purpose = 'Cancel' THEN op.QTY ELSE 0 END) AS Canceled_QTY
   , ISNULL(SUM(ISNULL(pd.SP_PKO_QTY, 0)) / SUM(op.QTY), 0) AS SP_Rate
   , SUM(ISNULL(pd.SP_PKO_QTY, 0)) AS SP_PKO_QTY
   , SUM(CASE WHEN (CASE WHEN o.Purpose = 'Official' THEN op.QTY ELSE 0 END) >= ISNULL(SP_PKO_QTY, 0) AND ABS(isnull(p.Shipmented,0)) = 1 THEN (CASE WHEN o.Purpose = 'Official' THEN op.QTY ELSE 0 END) - ISNULL(SP_PKO_QTY, 0) ELSE 0 END) AS Shortage_QTY
   , SUM((CASE WHEN (CASE WHEN o.Purpose = 'Official' THEN op.QTY ELSE 0 END) >= ISNULL(SP_PKO_QTY, 0) AND ABS(isnull(p.Shipmented,0)) = 0 THEN (CASE WHEN o.Purpose = 'Official' THEN op.QTY ELSE 0 END) - ISNULL(SP_PKO_QTY, 0) ELSE 0 END))  AS NO_SP_QTY
   , CASE WHEN Round(SUM(CASE WHEN o.Purpose = 'Official' THEN (p.Lasting_QTY * CASE WHEN p.QTY = 0 THEN 0 ELSE op.QTY / p.QTY END) ELSE 0 END),0) - SUM(ISNULL(pd.SP_PKO_QTY, 0)) <= 0 THEN 0 ELSE Round(SUM(CASE WHEN o.Purpose = 'Official' THEN (p.Lasting_QTY * CASE WHEN p.QTY = 0 THEN 0 ELSE op.QTY / p.QTY END) ELSE 0 END),0) - SUM(ISNULL(pd.SP_PKO_QTY, 0)) END AS PKO_Pending
   FROM Order_Detail od with(Nolock, NoWait)
   INNER JOIN Orders o with(Nolock, NoWait) ON od.Order_No = o.Order_No 
   INNER JOIN Produce p with(Nolock, NoWait) ON od.Produce_No = p.Produce_No 
   LEFT OUTER JOIN Product pt with(Nolock, NoWait) ON pt.Product_No = p.Product_No   
   Inner Join Order_PKO op with(Nolock, NoWait) on op.Order_Detail_RefID = od.Order_Detail_RefID   
   LEFT OUTER JOIN ( SELECT pd1.Order_PKOID, SUM(pd1.QTY) AS SP_PKO_QTY
                      FROM PDSP_Detail AS pd1
             INNER JOIN PDSP ON pd1.Shipment_NO = PDSP.Shipment_NO
                   WHERE (PDSP.F_ETD <= GETDATE())
                   GROUP BY pd1.Order_PKOID) AS pd ON op.Order_PKOID = pd.Order_PKOID
   WHERE (op.QTY <> 0)    
   AND (o.Purpose = 'Official' OR o.Purpose = 'Cancel')
   AND ABS(isnull(p.Shipmented,0)) <> 1
   GROUP BY o.Season, o.Currency, o.Brand, LEFT(o.Season, 4), o.CustomerID, o.Order_No, p.Product_No, p.Produce_No, pt.Name
   HAVING (SUM((CASE WHEN (CASE WHEN o.Purpose = 'Official' THEN op.QTY ELSE 0 END) >= ISNULL(SP_PKO_QTY, 0) AND ABS(isnull(p.Shipmented,0)) = 0 THEN (CASE WHEN o.Purpose = 'Official' THEN op.QTY ELSE 0 END) - ISNULL(SP_PKO_QTY, 0) ELSE 0 END)) > 0)
   AND (@Season = 'All' or o.Season LIKE '%' + @Season + '%') 
   AND (@Brand = '%' or o.Brand LIKE '%' + @Brand + '%') 
   AND (LEFT(o.Season, 4) > '2012') 
   AND (@CustomerID = '%' or o.CustomerID LIKE '%' + @CustomerID + '%') 
   AND (@Order_No = '%' or o.Order_No LIKE '%' + @Order_No + '%') 
   AND (@Product_No = '%' or p.Product_No LIKE '%' + @Product_No + '%')
   AND (@Name = '%' or pt.Name LIKE '%' + @Name + '%') 
   AND (@Produce_No = '%' or p.Produce_No LIKE '%' + @Produce_No + '%') 
   ORDER BY o.CustomerID, o.Brand

   `, req.body) ;
   //console.log(strSQL)
   db.sql(req.SiteDB, strSQL)
      .then((result) => {
         var DataSet = {Detail_Info:result.recordsets[0], 
            Foot_Info:{PKO_QTY:0, Canceled_QTY:0, Produced_QTY:0, SP_PKO_QTY:0, PKO_Pending:0, Shortage_QTY:0, NO_SP_QTY:0}
         };
         result.recordsets[0].forEach((item)=>{
            DataSet.Foot_Info.PKO_QTY += item.PKO_QTY;
            DataSet.Foot_Info.Canceled_QTY += item.Canceled_QTY;
            DataSet.Foot_Info.Produced_QTY += item.Produced_QTY;
            DataSet.Foot_Info.SP_PKO_QTY += item.SP_PKO_QTY;
            DataSet.Foot_Info.PKO_Pending += item.PKO_Pending;
            DataSet.Foot_Info.Shortage_QTY += item.Shortage_QTY;
            DataSet.Foot_Info.NO_SP_QTY += item.NO_SP_QTY;
         })
         res.send(DataSet);
      }).catch((err) => {
         console.log(err);
         res.status(500).send(err);
      })

});

//Get Shipment_Commercial_Invoice_Report
router.post('/Shipment_Commercial_Invoice_Report',function (req, res, next) {
   console.log("Call Shipment_Commercial_Invoice_Report Api :", req.body);
   
   req.body.Mode = req.body.Mode ? req.body.Mode : '0';    
   req.body.Shipment_No = req.body.Shipment_No ? `N'${req.body.Shipment_No.trim().substring(0,18).replace(/'/g, "''")}'` : null; 
      
   var strSQL = format(` Declare @Mode int = {Mode}, @Shipment_No Varchar(18) = {Shipment_No}
   Declare @PDSP_Detail Table(Order_PKOID int, Order_DetailID int, Order_No varchar(20), Produce_No varchar(20), Product_No varchar(25), Customer_Product_No varchar(25), Unit_Price float, Factory_Price float, Qty float
	, PKO_No varchar(20), Order_Detail_RefID int, Ref_No varchar(20)	
	, Shipping_Date varchar(10)
	, Detail_Remark_Title nvarchar(20)
	, Packing_No_Title nvarchar(20)
	, Ref_No_Title nvarchar(20)
	, Order_No_Title nvarchar(20)
	, Destination nvarchar(30)
	, Style_No varchar(20), CCC_Code varchar(15), Shoe_Name varchar(30), Color_Code Nvarchar(100)
    , Category nvarchar(30)
    , Gender nvarchar(30)
    , Main_Material nvarchar(Max)
   )
   
   Insert @PDSP_Detail
   Select pd.Order_PKOID, od.Order_DetailID, od.Order_No, od.Produce_No, od.Product_No, od.Customer_Product_No, od.Unit_Price, od.Factory_Price, sum(pd.Qty) as Qty
   , op.PKO_No, op.Order_Detail_RefID, r.Ref_No   
   , case when op.Shipping_Date is not null then convert(varchar(10), op.Shipping_Date,111) else null end as Shipping_Date
   , isnull(op.Detail_Remark_Title,'Remark') as Detail_Remark_Title
   , isnull(o.Packing_No_Title,'') as Packing_No_Title
   , isnull(o.Ref_No_Title,'') as Ref_No_Title
   , isnull(o.Order_No_Title,'Order No') as Order_No_Title
   , op.Destination
   , p.Style_No, s.CCC_Code, p.[Name] as Shoe_Name, isnull(p.Color,'') + ' ' + isnull(p.Color_Code,'') as Color_Code
   , s.Category, s.Gender, s.Main_Material
   From PDSP_Detail pd with(NoLock, NoWait)
   Inner Join Order_Detail od with(NoLock, NoWait) on od.Order_DetailID = pd.Order_DetailID
   Left Outer Join Order_PKO op with(NoLock, NoWait) on op.Order_PKOID = pd.Order_PKOID
   Inner Join Order_Detail_Ref r with(NoLock,NoWait) on od.Order_Detail_RefID = r.Order_Detail_RefID
   Inner Join [Orders] o with(NoLock, NoWait) on o.Order_No = od.Order_No  
   Inner Join Product p with(NoLock, NoWait) on p.Product_No = od.Product_No
   Inner Join Style s with(NoLock, NoWait) on s.Style_No = p.Style_No
   Where pd.Shipment_NO = @Shipment_NO
   Group by pd.Order_PKOID, od.Order_DetailID, od.Order_No, od.Produce_No, od.Product_No, od.Customer_Product_No, od.Unit_Price, od.Factory_Price
   , op.PKO_No, op.Order_Detail_RefID, r.Ref_No   
   , case when op.Shipping_Date is not null then convert(varchar(10), op.Shipping_Date,111) else null end 
   , isnull(op.Detail_Remark_Title,'Remark')
   , isnull(o.Packing_No_Title,'') 
   , isnull(o.Ref_No_Title,'') 
   , isnull(o.Order_No_Title,'Order No') 
   , op.Destination, p.Style_No, s.CCC_Code, p.[Name], p.Color, p.Color_Code
   , s.Category, s.Gender, s.Main_Material;

   Declare @Order_PKO_Detail Table(Order_PKOID int, Order_PKO_DetailID int, Cartons int
   , IL float, IW float, IH float, Unit_Qty smallint, Total_Qty int
   , Carton_No nvarchar(10), Carton_Code nvarchar(13)
   , CL_IBEdge nchar(2), CL_Items int
   , CW_IBEdge nchar(2), CW_Items int
   , CH_IBEdge nchar(2), CH_Items int
   , CL float, CW float, CH float
   , CW_Separator_Items int, CH_Separator_Items int, CL_Separator_Items int
   , Carton_NW float, Carton_NW_TTL float, PK_MATL_WT float, Carton_GW float, Carton_GW_TTL float, Meas float
   , Detail_Remark Nvarchar(50)
   , Produce_No varchar(20)
   )

   Insert @Order_PKO_Detail(Order_PKOID, Order_PKO_DetailID, Cartons
   ,IL, IW, IH, Unit_Qty, Total_Qty
   , Carton_No, Carton_Code
   , CL_IBEdge, CL_Items
   , CW_IBEdge, CW_Items
   , CH_IBEdge, CH_Items
   , CL, CW, CH
   , CW_Separator_Items, CH_Separator_Items, CL_Separator_Items
   , Carton_NW, Carton_NW_TTL, PK_MATL_WT, Carton_GW, Carton_GW_TTL, Meas
   , Detail_Remark
   , Produce_No
   )
   Select po.Order_PKOID, pd.Order_PKO_DetailID, pd.Cartons
   , pd.IL, pd.IW, pd.IH, pd.Unit_Qty, 0 as Total_Qty
   , pd.Carton_No, pd.Carton_Code
   , pd.CL_IBEdge, pd.CL_Items
   , pd.CW_IBEdge, pd.CW_Items
   , pd.CH_IBEdge, pd.CH_Items
   , pd.CL, pd.CW, pd.CH
   , pd.CW_Separator_Items, pd.CH_Separator_Items, pd.CL_Separator_Items
   , 0 as Carton_NW, 0 as Carton_NW_TTL, isnull(pd.PK_MATL_WT,0) as PK_MATL_WT
   , 0 as Carton_GW, 0 as Carton_GW_TTL, 0 as Meas
   , isnull(pd.Detail_Remark,'') as Detail_Remark
   , po.Produce_No
   From (Select distinct Order_PKOID, Produce_No From @PDSP_Detail) po
   Inner Join Order_PKO_Detail pd with(NoWait,NoLock) on pd.Order_PKOID = po.Order_PKOID



   Declare @Order_PKO_Detail_Qty Table(Order_PKO_DetailID int, Size float, Size_Name nvarchar(5), Qty float)

   Insert @Order_PKO_Detail_Qty
   SELECT od.Order_PKO_DetailID
   , oq.Size
   , Rtrim(ps.Size_Name) as Size_Name
   , oq.Qty
   FROM @Order_PKO_Detail od
   Inner Join Order_PKO_Detail_Qty oq with(NoLock,NoWait) on od.Order_PKO_DetailID = oq.Order_PKO_DetailID
   Inner Join Product_Size ps with(NoLock,NoWait) on oq.Size = ps.SizeID
   Order by Order_PKO_DetailID, oq.Size;  
   `, req.body );
   //console.log(strSQL);
   switch(req.body.Mode){
      case '0':
         strSQL += format(`       
         Declare @Order_Qty Table(Order_PKOID int, Order_DetailID int, Order_Detail_RefID int, Size real, Qty float);

         Insert @Order_Qty
         Select distinct op.Order_PKOID, op.Order_DetailID, op.Order_Detail_RefID, oq.Size, oq.Qty
         FROM (Select distinct Order_PKOID, Order_DetailID, Order_Detail_RefID, Qty From @PDSP_Detail ) op
         Inner Join Order_Qty oq with(NoLock,NoWait) on op.Order_DetailID = oq.Order_DetailID;

         Declare @tmp_Amount Table(PKO_No varchar(20), Order_DetailID int, Size_Range Nvarchar(20), Unit_Price float, Factory_Price float, Qty float, Amount_O float, Amount_F float)
         Declare @Amount_O float, @Amount_F float, @Expense_O float, @Expense_F float

         Insert @tmp_Amount
         Select distinct tmp1.PKO_No, tmp.Order_DetailID
            , (Select rtrim(ps.Size_Name) From Product_Size ps with(NoLock,NoWait) Where ps.SizeID = tmp.Min_Size) + '~'
            + (Select rtrim(ps.Size_Name) From Product_Size ps with(NoLock,NoWait) Where ps.SizeID = tmp.Max_Size) as Size_Range
         , tmp1.Unit_Price
         , tmp1.Factory_Price
         , tmp1.Qty
         , (tmp1.Qty * tmp1.Unit_Price) as Amount_O
         , (tmp1.Qty * tmp1.Factory_Price) as Amount_F
         From (
               Select op.Order_Detail_RefID, op.Order_PKOID, op.Order_DetailID
               , Min(op.Size) as Min_Size
               , Max(op.Size) as Max_Size			
               from @Order_Qty op
               Group by op.Order_Detail_RefID, op.Order_PKOID, op.Order_DetailID
         ) tmp
         Inner Join (
            Select distinct PKO_No, Order_Detail_RefID, Order_PKOID, Order_DetailID, Unit_Price, Factory_Price, Qty From @PDSP_Detail 
         ) tmp1 on tmp.Order_DetailID = tmp1.Order_DetailID;

         Select @Amount_O = sum(Amount_O), @Amount_F = sum(Amount_F)    From @tmp_Amount

         Declare @tmp_Expense Table(Decription Nvarchar(30), Expense_O float, Expense_F float)

         Insert @tmp_Expense
         Select RTrim(ode.Description) AS Decription
         , Round(Sum(oq.[Unit_Price]* ode.[Rate] * oq.Qty),2) AS Expense_O
         , Round(Sum(oq.Factory_Price * ode.[Rate] * oq.Qty),2) AS Expense_F
         FROM ( Select Order_DetailID, Unit_Price, Factory_Price, sum(Qty) as Qty From @PDSP_Detail Group by  Order_DetailID, Unit_Price, Factory_Price) oq
         INNER JOIN Order_Detail_Expense ode with(NoLock,NoWait) ON oq.Order_DetailID = ode.Order_DetailID
         Where ode.Doc = 'PI'
         Group by ode.Description
         union
         Select RTrim(pe.Decription) as Decription
         , Round( Sum(pe.Rcv_Amount), 2) AS Expense_O
         , Round( Sum(pe.Pay_Amount), 2) AS Expense_F
         FROM PDSP_Expense pe with(NoLock,NoWait)
         Where pe.Shipment_No = @Shipment_No
         And pe.Rcv_Amount <> 0
         Group by pe.Decription;

         Select @Expense_O = sum(Expense_O), @Expense_F = sum(Expense_F) From @tmp_Expense;

         --0 Shipment Info
         Select p.OrganizationID
         , p.[Brand]
         , p.[Shipment_No]
         , Convert(varchar(10),p.Date,111) as Date
         , p.CustomerID
         , o.Currency as O_Currency
         , o.Currency_Rate as O_Currency_Rate
         , (Select Currency_Symbol From Currency c where c.Currency = p.Currency) as O_Currency_Symbol
         , p.PO_Currency
         , po.Currency_Rate as PO_Currency_Rate
         , (Select Currency_Symbol From Currency c where c.Currency = p.PO_Currency) as PO_Currency_Symbol
         , p.UserID
         , p.FactoryID
         , p.MessrsID, p.Messrs, p.Messrs_Address
         , isnull(p.Invoice_To_Title,'INVOICE TO') as Invoice_To_Title
         , p.Invoice_ToID
         , (Select Contact From Customer_Contacts m Where m.ContactID = p.Invoice_ToID ) as Invoice_To_Name
         , p.Invoice_To, p.Invoice_To_Address
         , isnull(p.Buyer_Title, 'CONSIGNEE') as Buyer_Title
         , p.BuyerID
         , (Select Contact From Customer_Contacts m Where m.ContactID = p.BuyerID ) as Buyer_Name
         , p.Buyer, p.Buyer_Address
         , isnull(p.Notify_Party_Title,'NOTIFY PARTY') as Notify_Party_Title
         , p.Notify_PartyID
         , (Select Contact From Customer_Contacts m Where m.ContactID = p.Notify_PartyID ) as Notify_Party_Name
         , p.Notify_Party, p.Notify_Party_Address
         , isnull(p.Beneficiary,'') as Beneficiary
         , isnull(ca.E_Name,'') as Beneficiary_Name
         , isnull(ca.E_Address,'') as Beneficiary_Address
         , isnull(b.E_Name,'') as Advising_Bank
         , isnull(b.e_Address,'') as Bank_Address
         , isnull(b.Account_No,'') as Account_No
         , isnull(b.Account_Name,'') as Account_Name
         , isnull(b.S_Name,'') as Advising_Bank_Name
         , p.Comment, p.Term_Price, p.Commodity
         , p.Forwarder, p.Cartons, p.Measurement, p.Container
         , isnull( p.F_Vessel,'') as F_Vessel, case when p.F_ETD is null then '' else Convert(varchar(10),p.F_ETD,111) end as F_ETD
         , isnull(p.S_Port,'') as S_Port, isnull(p.T_Port,'') as T_Port
         , isnull( p.M_Vessel,'') as M_Vessel, case when p.M_ETD is null then '' else Convert(varchar(10),p.M_ETD,111) end as M_ETD
         , isnull(p.Destination,'') as Destination
         , (case when p.M_ETA is null then '' else Convert(varchar(10),p.M_ETA,111) end) as M_ETA
         , p.Data_Updater
         , convert(varchar(20) ,p.[Data_Update] ,120) as [Data_Update]
         , 0 as Carton_NW
         , 0 as Carton_GW
         , s.Factory_Name
         , s.Address as Factory_Address
         , dbo.RecurseNumber(isnull((Select sum(Unit_Qty * Cartons) From @Order_PKO_Detail),0)) as EngNum_TTL_Qty
         , dbo.RecurseNumber(isnull((Select sum(Cartons) From @Order_PKO_Detail),0)) as EngNum_TTL_Cartons
         , dbo.RecurseNumber(isnull(@Amount_O,0) + isnull(@Expense_O,0)) as EngNum_TTL_Amount_O
         , dbo.RecurseNumber(isnull(@Amount_F,0) + isnull(@Expense_F,0)) as EngNum_TTL_Amount_F
         , p.Remark as Memo, 0 as PL_Carton_NW, 0 as PL_Carton_GW
         From PDSP p with(NoLock, NoWait)
         Left outer Join Factory s with(NoLock, NoWait) on s.FactoryID = p.FactoryID
         Left outer Join [@Currency_Rate] o on p.Currency = o.Currency and o.Exchange_Date = Convert(Date, p.Date)
         Left outer Join [@Currency_Rate] po on p.PO_currency = po.Currency and po.Exchange_Date = Convert(Date, p.Date)
         left Outer Join Bank b with(NoLock,NoWait) on p.Advising_Bank = b.BankID
         left Outer Join Credit_Accounts ca with(NoLock,NoWait) on ca.AccountID = p.Beneficiary
         Where p.Shipment_No = @Shipment_No;

         --1 PKO Detail
         select distinct pd.Order_Detail_RefID, pd.Order_DetailID, pd.Order_No, pd.CCC_Code, pd.Shoe_Name, pd.Product_No, pd.Color_Code
         , pd.Customer_Product_No, pd.Ref_No, pd.Gender, pd.Category, pd.Main_Material, pd.Ref_No_Title, pd.Packing_No_Title, pd.Destination
         , t.PKO_No, t.Size_Range, t.Qty, t.Unit_Price, t.Amount_O, t.Factory_Price, t.Amount_F
         From @PDSP_Detail pd
         Inner Join @tmp_Amount t on pd.Order_DetailID = t.Order_DetailID
         Order by pd.Order_No, pd.Ref_No, t.PKO_No, t.Size_Range;
        
         --2 Order and Shipment Expense
         Select * From @tmp_Expense

         --3 Money Source: Payment_Term
         select CASE WHEN m.Payment_Term IS NULL THEN dbo.Get_Payment_Term('', m.Type, m.Days, m.By_Doc_Rcv) ELSE m.Payment_Term END + ' ' + p.Currency + ' ' + FORMAT(Round(m.Deposit, case when p.Currency = 'TWD' then 0 else 2 end), '#,###.00')  as Payment_Term
         from Money_Source m With(NoLock,NoWait)
         Inner Join PDSP p With(NoLock,NoWait) on m.Source_No = p.Shipment_No
         where m.Source_No = @Shipment_No and m.Subject = 'PDSP RCV';
          `, req.body );
      break;
      case '1':
         strSQL += format(`       
         Declare @Order_Qty Table(Order_PKOID int, Order_DetailID int, Order_Detail_RefID int, Size real, Qty float);

         Insert @Order_Qty
         Select distinct op.Order_PKOID, op.Order_DetailID, op.Order_Detail_RefID, oq.Size, oq.Qty
         FROM (Select distinct Order_PKOID, Order_DetailID, Order_Detail_RefID, Qty From @PDSP_Detail ) op
         Inner Join Order_Qty oq with(NoLock,NoWait) on op.Order_DetailID = oq.Order_DetailID;

         Declare @tmp_Amount Table(PKO_No varchar(20), Order_DetailID int, Size_Range Nvarchar(20), Unit_Price float, Factory_Price float, Qty float, Amount_O float, Amount_F float)
         Declare @Amount_O float, @Amount_F float, @Expense_O float, @Expense_F float

         Insert @tmp_Amount
         Select distinct tmp1.PKO_No, tmp.Order_DetailID
            , (Select rtrim(ps.Size_Name) From Product_Size ps with(NoLock,NoWait) Where ps.SizeID = tmp.Min_Size) + '~'
            + (Select rtrim(ps.Size_Name) From Product_Size ps with(NoLock,NoWait) Where ps.SizeID = tmp.Max_Size) as Size_Range
         , tmp1.Unit_Price
         , tmp1.Factory_Price
         , tmp1.Qty
         , (tmp1.Qty * tmp1.Unit_Price) as Amount_O
         , (tmp1.Qty * tmp1.Factory_Price) as Amount_F
         From (
               Select op.Order_Detail_RefID, op.Order_PKOID, op.Order_DetailID
               , Min(op.Size) as Min_Size
               , Max(op.Size) as Max_Size			
               from @Order_Qty op
               Group by op.Order_Detail_RefID, op.Order_PKOID, op.Order_DetailID
         ) tmp
         Inner Join (
            Select distinct PKO_No, Order_Detail_RefID, Order_PKOID, Order_DetailID, Unit_Price, Factory_Price, Qty From @PDSP_Detail 
         ) tmp1 on tmp.Order_DetailID = tmp1.Order_DetailID;

         Select @Amount_O = sum(Amount_O), @Amount_F = sum(Amount_F)    From @tmp_Amount

         Declare @tmp_Expense Table(Decription Nvarchar(30), Expense_O float, Expense_F float)

         Insert @tmp_Expense
         Select RTrim(ode.Description) AS Decription
         , Sum(oq.[Unit_Price]* ode.[Rate] * oq.Qty) AS Expense_O
         , Sum(oq.Factory_Price * ode.[Rate] * oq.Qty) AS Expense_F
         FROM ( Select distinct Order_DetailID, Unit_Price, Factory_Price, Qty From @PDSP_Detail ) oq
         INNER JOIN Order_Detail_Expense ode with(NoLock,NoWait) ON oq.Order_DetailID = ode.Order_DetailID
         Where ode.Doc = 'PI'
         Group by ode.Description
         union
         Select RTrim(pe.Decription) as Decription
         , Round( Sum(pe.Rcv_Amount), 2) AS Expense_O
         , Round( Sum(pe.Pay_Amount), 2) AS Expense_F
         FROM PDSP_Expense pe with(NoLock,NoWait)
         Where pe.Shipment_No = @Shipment_No
         And pe.Rcv_Amount <> 0
         Group by pe.Decription;

         Select @Expense_O = sum(Expense_O), @Expense_F = sum(Expense_F) From @tmp_Expense;

         --0 Shipment Info
         Select p.OrganizationID
         , p.[Brand]
         , p.[Shipment_No]
         , Convert(varchar(10),p.Date,111) as Date
         , p.CustomerID
         , o.Currency as O_Currency
         , o.Currency_Rate as O_Currency_Rate
         , (Select Currency_Symbol From Currency c where c.Currency = p.Currency) as O_Currency_Symbol
         , p.PO_Currency
         , po.Currency_Rate as PO_Currency_Rate
         , (Select Currency_Symbol From Currency c where c.Currency = p.PO_Currency) as PO_Currency_Symbol
         , p.UserID
         , p.FactoryID
         , p.MessrsID, p.Messrs, p.Messrs_Address
         , isnull(p.Invoice_To_Title,'INVOICE TO') as Invoice_To_Title
         , p.Invoice_ToID
         , (Select Contact From Customer_Contacts m Where m.ContactID = p.Invoice_ToID ) as Invoice_To_Name
         , p.Invoice_To, p.Invoice_To_Address
         , isnull(p.Buyer_Title, 'CONSIGNEE') as Buyer_Title
         , p.BuyerID
         , (Select Contact From Customer_Contacts m Where m.ContactID = p.BuyerID ) as Buyer_Name
         , p.Buyer, p.Buyer_Address
         , isnull(p.Notify_Party_Title,'NOTIFY PARTY') as Notify_Party_Title
         , p.Notify_PartyID
         , (Select Contact From Customer_Contacts m Where m.ContactID = p.Notify_PartyID ) as Notify_Party_Name
         , p.Notify_Party, p.Notify_Party_Address
         , isnull(p.Beneficiary,'') as Beneficiary
         , isnull(ca.E_Name,'') as Beneficiary_Name
         , isnull(ca.E_Address,'') as Beneficiary_Address
         , isnull(b.E_Name,'') as Advising_Bank
         , isnull(b.e_Address,'') as Bank_Address
         , isnull(b.Account_No,'') as Account_No
         , isnull(b.Account_Name,'') as Account_Name
         , isnull(b.S_Name,'') as Advising_Bank_Name
         , p.Comment, p.Term_Price, p.Commodity
         , p.Forwarder, p.Cartons, p.Measurement, p.Container
         , isnull( p.F_Vessel,'') as F_Vessel, case when p.F_ETD is null then '' else Convert(varchar(10),p.F_ETD,111) end as F_ETD
         , isnull(p.S_Port,'') as S_Port, isnull(p.T_Port,'') as T_Port
         , isnull( p.M_Vessel,'') as M_Vessel, case when p.M_ETD is null then '' else Convert(varchar(10),p.M_ETD,111) end as M_ETD
         , isnull(p.Destination,'') as Destination
         , (case when p.M_ETA is null then '' else Convert(varchar(10),p.M_ETA,111) end) as M_ETA
         , p.Data_Updater
         , convert(varchar(20) ,p.[Data_Update] ,120) as [Data_Update]
         , 0 as Carton_NW
         , 0 as Carton_GW
         , s.Factory_Name
         , s.Address as Factory_Address
         , dbo.RecurseNumber(isnull((Select sum(Unit_Qty * Cartons) From @Order_PKO_Detail),0)) as EngNum_TTL_Qty
         , dbo.RecurseNumber(isnull((Select sum(Cartons) From @Order_PKO_Detail),0)) as EngNum_TTL_Cartons
         , dbo.RecurseNumber(isnull(@Amount_O,0) + isnull(@Expense_O,0)) as EngNum_TTL_Amount_O
         , dbo.RecurseNumber(isnull(@Amount_F,0) + isnull(@Expense_F,0)) as EngNum_TTL_Amount_F
         , p.Remark as Memo, 0 as PL_Carton_NW, 0 as PL_Carton_GW
         From PDSP p with(NoLock, NoWait)
         Left outer Join Factory s with(NoLock, NoWait) on s.FactoryID = p.FactoryID
         Left outer Join [@Currency_Rate] o on p.Currency = o.Currency and o.Exchange_Date = Convert(Date, p.Date)
         Left outer Join [@Currency_Rate] po on p.PO_currency = po.Currency and po.Exchange_Date = Convert(Date, p.Date)
         left Outer Join Bank b with(NoLock,NoWait) on p.Advising_Bank = b.BankID
         left Outer Join Credit_Accounts ca with(NoLock,NoWait) on ca.AccountID = p.Beneficiary
         Where p.Shipment_No = @Shipment_No;

         --1 PKO Detail
         select distinct pd.Order_Detail_RefID, pd.Order_DetailID, pd.Order_No, pd.CCC_Code, pd.Shoe_Name, pd.Product_No, pd.Color_Code
         , pd.Customer_Product_No, pd.Ref_No, pd.Gender, pd.Category, pd.Main_Material, pd.Ref_No_Title, pd.Packing_No_Title, pd.Destination
         , t.PKO_No, t.Size_Range, t.Qty, t.Unit_Price, t.Amount_O, t.Factory_Price, t.Amount_F
         From @PDSP_Detail pd
         Inner Join @tmp_Amount t on pd.Order_DetailID = t.Order_DetailID
         Order by pd.Order_No, pd.Ref_No, t.PKO_No, t.Size_Range;
        
         --2 Order and Shipment Expense
         Select * From @tmp_Expense

         --3 Money Source: Payment_Term
         select CASE WHEN m.Payment_Term IS NULL THEN dbo.Get_Payment_Term('', m.Type, m.Days, m.By_Doc_Rcv) ELSE m.Payment_Term END + ' ' + p.Currency + ' ' + FORMAT(Round(m.Deposit, case when p.Currency = 'TWD' then 0 else 2 end), '#,###.00')  as Payment_Term
         from Money_Source m With(NoLock,NoWait)
         Inner Join PDSP p With(NoLock,NoWait) on m.Source_No = p.Shipment_No
         where m.Source_No = @Shipment_No and m.Subject = 'PDSP RCV';

         --4 Organization_Info
         Select o.OrganizationID, Organization_Name, L2_Organization_Name, Address, L2_Address
         From Organization o with(NoLock,NoWait)
         Where o.OrganizationID = '{OrganizationID}'

         --5 Advising_Bank_Info
         Select BankID, E_Address, E_Name as Advising_Bank_Name, Account_No, Account_Name
         From Bank o with(NoLock,NoWait)
         Where o.BankID = {BankID}

          `, req.body );
      break;
   }
   //console.log(strSQL)
   db.sql(req.SiteDB, strSQL)
      .then((result) => { 
         var DataSet = {Shipment_Info: result.recordsets[0] ? result.recordsets[0]:[],
            Expense_Detail: result.recordsets[2] ? result.recordsets[2]:[],
            Payment_Term: result.recordsets[3] ? result.recordsets[3]:[],
            Organization_Info: result.recordsets[4] ? result.recordsets[4][0]:{OrganizationID:'', Organization_Name:'', L2_Organization_Name:'', Address:'', L2_Address:''},
            Advising_Bank_Info: result.recordsets[5] ? result.recordsets[5][0]:{BankID:0, E_Address:'', Advising_Bank_Name:'', Account_No:'', Account_Name:''},
            G_Carton_NW_TTL: 0,
            G_Carton_GW_TTL: 0,
            G_Total_Qty: 0,
            G_Total_Cartons: 0,
            G_Total_Meas: 0,
            Total_Amount_O: 0,
            Total_Amount_F: 0,
            G_Total_Amount_O: 0,
            G_Total_Amount_F: 0,
            G_Total_Expense_O: 0,
            G_Total_Expense_F: 0,
            Packing_Size: [],
            Packing_Detail_Head: [],
            Packing_Detail: [],
            Packing_Remark: '',            
         };

         switch(req.body.Mode){
            case '0':
            case '1':
            case '2':
               DataSet.Packing_Detail = result.recordsets[1];
               DataSet.Packing_Remark = result.recordsets[0][0].Memo;
      
               DataSet.Packing_Detail_Head = [...DataSet.Packing_Detail.reduce((r, e) => {                  
                  let k = `${e.Order_No}|${e.Ref_No}|${e.Product_No}|${e.Customer_Product_No}`;
                  if (!r.has(k)) {
                    // console.log(r)          
                    r.set(k, { Order_Detail_RefID: e.Order_Detail_RefID,
                     Ref_No: e.Ref_No,
                     PKO_No: e.PKO_No,                     
                     Shoe_Name: e.Shoe_Name,
                     Color_Code: e.Color_Code,
                     CCC_Code: e.CCC_Code,
                     Category: e.Category,
                     Gender: e.Gender,
                     Main_Material: e.Main_Material,
                     Product_No: e.Product_No,
                     Customer_Product_No: e.Customer_Product_No,
                     Order_No: e.Order_No,                     
                     Packing_No_Title: e.Packing_No_Title,
                     Ref_No_Title: e.Ref_No_Title,                     
                     Destination:e.Destination,
                     Total_Qty: e.Qty,
                     Total_Amount_O: e.Amount_O,
                     Total_Amount_F: e.Amount_F,
                    })
                  } else {
                     r.get(k).Total_Qty += e.Qty;
                     r.get(k).Total_Amount_O += e.Amount_O;
                     r.get(k).Total_Amount_F += e.Amount_F;
                     r.get(k).Total_Expense_O += e.Expense_O;
                     r.get(k).Total_Expense_F += e.Expense_F;
                  }
                  return r;
                }, new Map).values()]
      
                DataSet.Packing_Detail_Head.forEach((item)=>{
                  DataSet.G_Total_Qty += item.Total_Qty;
                  DataSet.Total_Amount_O += item.Total_Amount_O;
                  DataSet.Total_Amount_F += item.Total_Amount_F;
                  item.Total_Qty = Math.round(item.Total_Qty * 10000)/10000;
                  item.Total_Amount_O = Math.round(item.Total_Amount_O * 10000)/10000;
                  item.Total_Amount_F = Math.round(item.Total_Amount_F * 10000)/10000;
               }) 

               DataSet.Expense_Detail.forEach((item)=>{
                  DataSet.G_Total_Expense_O += item.Expense_O;
                  DataSet.G_Total_Expense_F += item.Expense_F;
                  item.Expense_O = Math.round(item.Expense_O * 10000)/10000;
                  item.Expense_F = Math.round(item.Expense_F * 10000)/10000;
               }) 

               DataSet.G_Total_Qty = Math.round(DataSet.G_Total_Qty * 10000)/10000;
               DataSet.G_Total_Amount_O = Math.round((DataSet.Total_Amount_O + DataSet.G_Total_Expense_O) * 10000)/10000;
               DataSet.G_Total_Amount_F = Math.round((DataSet.Total_Amount_F + DataSet.G_Total_Expense_F) * 10000)/10000;
               DataSet.Total_Amount_O = Math.round(DataSet.Total_Amount_O * 10000)/10000;
               DataSet.Total_Amount_F = Math.round(DataSet.Total_Amount_F * 10000)/10000;
               DataSet.G_Total_Expense_O = Math.round(DataSet.G_Total_Expense_O * 10000)/10000;
               DataSet.G_Total_Expense_F = Math.round(DataSet.G_Total_Expense_F * 10000)/10000;
            break;
         }
         //console.log(DataSet)
         res.send(DataSet);
      }).catch((err) => {
         console.log(err);
         res.status(500).send(err);
      })

});

//Get Packing_List_Report
router.post('/Packing_List_Report',function (req, res, next) {
   console.log("Call Shipment_Packing_List Api :", req.body);
   
   req.body.Mode = req.body.Mode ? req.body.Mode : '0'; 
   req.body.PDSP_PackingID = req.body.PDSP_PackingID ? req.body.PDSP_PackingID : null; 
   req.body.Shipment_No = req.body.Shipment_No ? `N'${req.body.Shipment_No.trim().substring(0,18).replace(/'/g, "''")}'` : null; 
      
   var strSQL = format(` Declare @Mode int = {Mode}, @PDSP_PackingID int = {PDSP_PackingID}
   , @Shipment_No Varchar(18) = {Shipment_No}
   Declare @Memo nvarchar(max)
   , @Carton_NW float
   , @Carton_GW float
   , @Meas varchar(15)   
   
   Select @PDSP_PackingID = PDSP_PackingID, @Shipment_No = Shipment_No, @Memo = isnull(pp.Memo,''), @Carton_NW = isnull(pp.Carton_NW,0)
   , @Carton_GW = isnull(pp.Carton_GW,0)
   , @Meas = isnull(pp.Measurement,'')
   From PDSP_Packing pp with(NoLock, NoWait)
   Where 1=1
   ${ req.body.PDSP_PackingID ? ' And pp.PDSP_PackingID = @PDSP_PackingID':'' }
   ${ req.body.Shipment_No ? ' And pp.Shipment_No = @Shipment_No':'' }

   Declare @Product_Out Table(Order_PKOID int, Order_PKO_DetailID int, Produce_No varchar(20), Cartons int)

   Insert @Product_Out
   Select po.Order_PKOID, pod.Order_PKO_DetailID, pod.Produce_No, sum(Cartons) as Cartons
   From Product_Out po with(NoLock, NoWait)
   Inner Join Product_Out_Detail pod with(NoLock, NoWait) on po.Product_Out_No = pod.Product_Out_No
   Where po.PDSP_PackingID = @PDSP_PackingID
   Group by po.Order_PKOID, pod.Order_PKO_DetailID, pod.Produce_No

   Declare @Order_PKO_Detail Table(Order_PKOID int, Order_PKO_DetailID int, Cartons int
   , IL float, IW float, IH float, Unit_Qty smallint, Total_Qty int
   , Carton_No nvarchar(10), Carton_Code nvarchar(13)
   , CL_IBEdge nchar(2), CL_Items int
   , CW_IBEdge nchar(2), CW_Items int
   , CH_IBEdge nchar(2), CH_Items int
   , CL float, CW float, CH float
   , CW_Separator_Items int, CH_Separator_Items int, CL_Separator_Items int
   , Carton_NW float, Carton_NW_TTL float, PK_MATL_WT float, Carton_GW float, Carton_GW_TTL float, Meas float
   , Detail_Remark Nvarchar(50)
   , Produce_No varchar(20)
   )

   Insert @Order_PKO_Detail(Order_PKOID, Order_PKO_DetailID, Cartons
   ,IL, IW, IH, Unit_Qty, Total_Qty
   , Carton_No, Carton_Code
   , CL_IBEdge, CL_Items
   , CW_IBEdge, CW_Items
   , CH_IBEdge, CH_Items
   , CL, CW, CH
   , CW_Separator_Items, CH_Separator_Items, CL_Separator_Items
   , Carton_NW, Carton_NW_TTL, PK_MATL_WT, Carton_GW, Carton_GW_TTL, Meas
   , Detail_Remark
   , Produce_No
   )
   Select po.Order_PKOID, pd.Order_PKO_DetailID, po.Cartons
   , pd.IL, pd.IW, pd.IH, pd.Unit_Qty, 0 as Total_Qty
   , pd.Carton_No, pd.Carton_Code
   , pd.CL_IBEdge, pd.CL_Items
   , pd.CW_IBEdge, pd.CW_Items
   , pd.CH_IBEdge, pd.CH_Items
   , pd.CL, pd.CW, pd.CH
   , pd.CW_Separator_Items, pd.CH_Separator_Items, pd.CL_Separator_Items
   , 0 as Carton_NW, 0 as Carton_NW_TTL, isnull(pd.PK_MATL_WT,0) as PK_MATL_WT
   , 0 as Carton_GW, 0 as Carton_GW_TTL, 0 as Meas
   , isnull(pd.Detail_Remark,'') as Detail_Remark
   , po.Produce_No
   From @Product_Out po
   Inner Join Order_PKO_Detail pd with(NoWait,NoLock) on pd.Order_PKO_DetailID = po.Order_PKO_DetailID

   Declare @Order_PKO Table(Order_PKOID int, PKO_No varchar(20), Order_Detail_RefID int, Ref_No varchar(20), Order_No varchar(18)
   , Style_No varchar(20), CCC_Code varchar(15), Shoe_Name varchar(30), Product_No varchar(25), Color_Code Nvarchar(100), Customer_Product_No Nvarchar(25)
   , Shipping_Date varchar(10)
   , Detail_Remark_Title nvarchar(20)
   , Packing_No_Title nvarchar(20)
   , Ref_No_Title nvarchar(20)
   , Order_No_Title nvarchar(20)
   , Destination nvarchar(30)
   , Category nvarchar(30)
   , Gender nvarchar(30)
   , Main_Material nvarchar(Max)
   );

   Insert @Order_PKO
   Select distinct op.Order_PKOID, op.PKO_No, op.Order_Detail_RefID, r.Ref_No, od.Order_No
   , p.Style_No, s.CCC_Code, p.[Name] as Shoe_Name, od.Product_No, isnull(p.Color,'') + ' ' + isnull(p.Color_Code,'') as Color_Code, od.Customer_Product_No
   , case when op.Shipping_Date is not null then convert(varchar(10), op.Shipping_Date,111) else null end as Shipping_Date
   , isnull(op.Detail_Remark_Title,'Remark') as Detail_Remark_Title
   , isnull(o.Packing_No_Title,'') as Packing_No_Title
   , isnull(o.Ref_No_Title,'') as Ref_No_Title
   , isnull(o.Order_No_Title,'Order No') as Order_No_Title
   , op.Destination
   , s.Category
   , s.Gender
   , s.Main_Material
   From Order_PKO op with(NoLock, NoWait)
   Inner Join Order_Detail od with(NoLock,NoWait) on op.Order_Detail_RefID = od.Order_Detail_RefID 
   Inner Join Order_Detail_Ref r with(NoLock,NoWait) on op.Order_Detail_RefID = r.Order_Detail_RefID
   Inner Join [Orders] o with(NoLock, NoWait) on o.Order_No = od.Order_No
   Inner Join Product p with(NoLock, NoWait) on p.Product_No = od.Product_No
   Inner Join Style s with(NoLock, NoWait) on s.Style_No = p.Style_No
   Where op.Order_PKOID in (Select distinct Order_PKOID From @Order_PKO_Detail );

   Declare @Order_PKO_Detail_Qty Table(Order_PKO_DetailID int, Size float, Size_Name nvarchar(5), Qty float)

   Insert @Order_PKO_Detail_Qty
   SELECT od.Order_PKO_DetailID
   , oq.Size
   , Rtrim(ps.Size_Name) as Size_Name
   , oq.Qty
   FROM @Order_PKO_Detail od
   Inner Join Order_PKO_Detail_Qty oq with(NoLock,NoWait) on od.Order_PKO_DetailID = oq.Order_PKO_DetailID
   Inner Join Product_Size ps with(NoLock,NoWait) on oq.Size = ps.SizeID
   Order by Order_PKO_DetailID, oq.Size;   
   `, req.body );
   //console.log(strSQL);
   switch(req.body.Mode){
      case '0':
      case '1':
      case '2':
         strSQL += format(` 
         
         --0 Shipment Info
         Select p.PDSP_PackingID
         , (Select OrganizationID From PDSP p1 with(NoLock,NoWait) where p1.Shipment_No = p.Shipment_No) as OrganizationID
         , p.[Brand]
         , p.[Shipment_No]
         , Convert(varchar(10),p.Date,111) as Date      
         , p.CustomerID
         , p.PO_Currency
         , po.Currency_Rate as PO_Currency_Rate
         , (Select Currency_Symbol From Currency c where c.Currency = p.PO_Currency) as PO_Currency_Symbol
         , p.UserID
         , p.FactoryID
         , p.MessrsID, p.Messrs, p.Messrs_Address
         , isnull(p.Invoice_To_Title,'INVOICE TO') as Invoice_To_Title
         , p.Invoice_ToID
         --, (Select Contact From Customer_Contacts m Where m.ContactID = p.Invoice_ToID ) as Invoice_To_Name
         , p.Invoice_To, p.Invoice_To_Address
         , isnull(p.Buyer_Title, 'CONSIGNEE') as Buyer_Title
         , p.BuyerID
         , (Select Contact From Customer_Contacts m Where m.ContactID = p.BuyerID ) as Buyer_Name
         , p.Buyer, p.Buyer_Address
         , isnull(p.Notify_Party_Title,'NOTIFY PARTY') as Notify_Party_Title
         , p.Notify_PartyID
         , (Select Contact From Customer_Contacts m Where m.ContactID = p.Notify_PartyID ) as Notify_Party_Name
         , p.Notify_Party, p.Notify_Party_Address
         , isnull(p.Beneficiary,'') as Beneficiary
         , isnull(ca.E_Name,'') as Beneficiary_Name
         , isnull(ca.E_Address,'') as Beneficiary_Address
         , isnull(b.E_Name,'') as Advising_Bank
         , isnull(b.e_Address,'') as Bank_Address
         , isnull(b.Account_No,'') as Account_No
         , isnull(b.Account_Name,'') as Account_Name
         , isnull(b.S_Name,'') as Advising_Bank_Name
         , p.Comment, p.Term_Price, p.Commodity
         , p.Forwarder, p.Cartons, p.Measurement, p.Container      
         , isnull( p.F_Vessel,'') as F_Vessel, case when p.F_ETD is null then '' else Convert(varchar(10),p.F_ETD,111) end as F_ETD
         , isnull(p.S_Port,'') as S_Port, isnull(p.T_Port,'') as T_Port
         , isnull( p.M_Vessel,'') as M_Vessel, case when p.M_ETD is null then '' else Convert(varchar(10),p.M_ETD,111) end as M_ETD
         , isnull(p.Destination,'') as Destination
         , (case when p.M_ETA is null then '' else Convert(varchar(10),p.M_ETA,111) end) as M_ETA	
         , p.Data_Updater
         , convert(varchar(20) ,p.[Data_Update] ,120) as [Data_Update]         
         , isnull(p.Carton_NW,0) as Carton_NW
         , isnull(p.Carton_GW,0) as Carton_GW   
         , s.Factory_Name
         , s.Address as Factory_Address
         , dbo.RecurseNumber(isnull((Select sum(Unit_Qty * Cartons) From @Order_PKO_Detail),0)) as EngNum_TTL_Qty
         , dbo.RecurseNumber(isnull((Select sum(Cartons) From @Order_PKO_Detail),0)) as EngNum_TTL_Cartons
         , @Memo as Memo, @Carton_NW as PL_Carton_NW, @Carton_GW as PL_Carton_GW, @Meas as Meas
         From PDSP_Packing p with(NoLock, NoWait)
         Inner Join Factory s with(NoLock, NoWait) on s.FactoryID = p.FactoryID
         Left outer Join [@Currency_Rate] po on p.PO_currency = po.Currency and po.Exchange_Date = Convert(Date, p.Date)
         left Outer Join Bank b with(NoLock,NoWait) on p.Advising_Bank = b.BankID
         left Outer Join Credit_Accounts ca with(NoLock,NoWait) on ca.AccountID = p.Beneficiary      
         Where 1=1
         ${ req.body.PDSP_PackingID ? ' And p.PDSP_PackingID = @PDSP_PackingID':'' }
         ${ req.body.Shipment_No ? ' And p.Shipment_No = @Shipment_No':'' }
      
         
         --1 Packing_Size
         SELECT distinct Size
         , Size_Name
         , 0 as Qty
         FROM @Order_PKO_Detail_Qty
         Order by Size;
         
         --2 PKO Detail Size
         SELECT distinct Order_PKO_DetailID
         , Size   
         , Qty
         FROM @Order_PKO_Detail_Qty
         Order by Order_PKO_DetailID, Size;
         
         --3 Product Net Weight
         Select distinct p.Style_No
         , m.Shoe_Size as Size
         , isnull(m.Net_Weight,0) as Net_Weight
         From @Order_PKO p
         Inner Join @Order_PKO_Detail od on p.Order_PKOID = od.Order_PKOID
         Inner Join @Order_PKO_Detail_Qty oq on od.Order_PKO_DetailID = oq.Order_PKO_DetailID
         Inner Join Product_Size_Match m with(NoLock,NoWait) on m.Style_No = p.Style_No And m.Shoe_Size = oq.Size 
         
         --4 PKO Detail
         SELECT p.*, pd.Order_PKO_DetailID, pd.Cartons,  pd.IL, pd.IW, pd.IH,  pd.Unit_Qty, isnull(pd.Cartons,0) * isnull(pd.Unit_Qty,0) as Total_Qty
         , pd.Carton_No, pd.Carton_Code
         , pd.CL_IBEdge, pd.CL_Items, pd.CW_IBEdge, pd.CW_Items, pd.CH_IBEdge, pd.CH_Items, pd.CL, pd.CW, pd.CH
         , pd.CW_Separator_Items, pd.CH_Separator_Items, pd.CL_Separator_Items
         , 0 as Carton_NW, 0 as Carton_NW_TTL, pd.PK_MATL_WT, 0 as Carton_GW, 0 as Carton_GW_TTL
         , Round(((pd.CL * pd.CW * pd.CH) / 1000000),3) * isnull(pd.Cartons,0) as Meas
         , pd.Produce_No         
         , pd.Detail_Remark         
         FROM @Order_PKO p
         Inner Join @Order_PKO_Detail pd on p.Order_PKOID = pd.Order_PKOID
         Order By p.Order_No, p.Product_No , Order_PKO_DetailID;      
      
          `, req.body );
      break;
   }
    //console.log(strSQL)
   db.sql(req.SiteDB, strSQL)
      .then((result) => { 
         var DataSet = {Shipment_Info: result.recordsets[0] ? result.recordsets[0]:[],
            G_Carton_NW_TTL: 0,
            G_Carton_GW_TTL: 0,
            G_Total_Qty: 0,
            G_Total_Cartons: 0,
            G_Total_Meas: 0,
            G_Total_Amount_O: 0,
            G_Total_Amount_F: 0,
            G_Total_Expense_O: 0,
            G_Total_Expense_F: 0,
            Packing_Size: [],
            Packing_Detail_Head: [],
            Packing_Detail: [],
            Packing_Remark: '',            
         };

         switch(req.body.Mode){
            case '0':
            case '1':
            case '2':
               DataSet.Packing_Size = result.recordsets[1];
               var PKO_Detail_Size = result.recordsets[2];
               var Product_Net_Weight = result.recordsets[3];
               DataSet.Packing_Detail = result.recordsets[4];
               DataSet.Packing_Remark = result.recordsets[0][0].Memo;
               var PL_Carton_NW = result.recordsets[0][0].PL_Carton_NW;
               var PL_Carton_GW = result.recordsets[0][0].PL_Carton_GW;
               var Meas = result.recordsets[0][0].Meas;
               var G_Carton_NW_TTL = 0;
               var G_Carton_GW_TTL = 0;
               var G_Total_Qty = 0;
               var G_Total_Cartons = 0;
               var G_Total_Meas = 0;
               
               DataSet.Packing_Detail.forEach((item,idx)=>{
                  item.Packing_Size = cloneDeep(DataSet.Packing_Size);
      
                  var PKO_Detail_Qty = PKO_Detail_Size.filter((data)=>(data.Order_PKO_DetailID == item.Order_PKO_DetailID));
                  var Net_Weight = Product_Net_Weight.filter((data)=>(data.Style_No == item.Style_No));
                  
                  //console.log(PKO_Detail_Size, item.Order_PKO_DetailID)
                  item.Packing_Size.forEach((dataset)=>{                     
                     PKO_Detail_Qty.forEach((data)=>{
                        if(dataset.Size == data.Size){
                           dataset.Qty = data.Qty                           
                        }
                     })
                     Net_Weight.forEach((data)=>{
                        if(dataset.Size == data.Size){
                           item.Carton_NW += data.Net_Weight * dataset.Qty;
                        }
                     })
                  })            
                  
                  item.Carton_NW = Math.round((item.Carton_NW)*10000)/10000 
                  item.Carton_GW = Math.round((item.Carton_NW + item.PK_MATL_WT)*10000)/10000;
                  item.Carton_NW_TTL = Math.round((item.Cartons * item.Carton_NW)*10000)/10000;
                  item.Carton_GW_TTL = Math.round((item.Cartons * item.Carton_GW)*10000)/10000;
                  item.Meas = Math.round((item.Meas)*1000)/1000
      
                  item.Total_Qty = item.Cartons * item.Unit_Qty;
                  G_Carton_NW_TTL += item.Carton_NW_TTL;
                  G_Carton_GW_TTL += item.Carton_GW_TTL;
                  G_Total_Qty += item.Total_Qty;
                  G_Total_Cartons += item.Cartons;
                  G_Total_Meas += item.Meas;
               });
      
               DataSet.Packing_Detail_Head = [...DataSet.Packing_Detail.reduce((r, e) => {
                  let k = `${e.Order_PKOID}`;
                  if (!r.has(k)) {
                    // console.log(r) 

                    r.set(k, { Order_PKOID: e.Order_PKOID,
                     Ref_No: e.Ref_No,
                     PKO_No: e.PKO_No,
                     Produce_No: e.Produce_No,
                     Shoe_Name: e.Shoe_Name,
                     Color_Code: e.Color_Code,
                     CCC_Code: e.CCC_Code,
                     Category: e.Category,
                     Gender: e.Gender,
                     Product_No: e.Product_No,
                     Customer_Product_No: e.Customer_Product_No,
                     Order_No: e.Order_No,
                     Detail_Remark_Title: e.Detail_Remark_Title,
                     Packing_No_Title: e.Packing_No_Title,
                     Ref_No_Title: e.Ref_No_Title,
                     Order_No_Title: e.Order_No_Title,
                     Destination:e.Destination,
                     G_Carton_NW_TTL: e.Carton_NW_TTL,
                     G_Carton_GW_TTL: e.Carton_GW_TTL,
                     G_Total_Qty: e.Total_Qty,
                     G_Total_Cartons: e.Cartons,
                     G_Total_Meas: e.Meas,
                    })
                  } else {
                     r.get(k).G_Carton_NW_TTL += e.Carton_NW_TTL;
                     r.get(k).G_Carton_GW_TTL += e.Carton_GW_TTL;
                     r.get(k).G_Total_Qty += e.Total_Qty;
                     r.get(k).G_Total_Cartons += e.Cartons;
                     r.get(k).G_Total_Meas += e.Meas;
                  }
                  return r;
                }, new Map).values()]
           
               DataSet.Packing_Detail_Head.forEach((item)=>{
                  item.G_Carton_NW_TTL = Math.round(item.G_Carton_NW_TTL * 10000)/10000;
                  item.G_Carton_GW_TTL = Math.round(item.G_Carton_GW_TTL * 10000)/10000;
                  item.G_Total_Qty = Math.round(item.G_Total_Qty * 10000)/10000;
                  item.G_Total_Cartons = Math.round(item.G_Total_Cartons * 10000)/10000;
                  item.G_Total_Meas = Math.round(item.G_Total_Meas * 10000)/10000;     
               }) 

               DataSet.G_Carton_NW_TTL = PL_Carton_NW ? Math.round(PL_Carton_NW*10000)/10000 : Math.round(G_Carton_NW_TTL*10000)/10000;
               DataSet.G_Carton_GW_TTL = PL_Carton_GW ? Math.round(PL_Carton_GW*10000)/10000 : Math.round(G_Carton_GW_TTL*10000)/10000;
               DataSet.G_Total_Qty = G_Total_Qty;
               DataSet.G_Total_Cartons = G_Total_Cartons;               
               DataSet.G_Total_Meas = Meas ? Meas : Math.round(G_Total_Meas*1000)/1000;               
               //console.log(DataSet.Packing_Detail[0].Packing_Size)
            break;
         }
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