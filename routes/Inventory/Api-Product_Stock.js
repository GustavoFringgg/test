var express = require('express');
var router = express.Router();
const format = require('string-format');
var db = require('../../config/DB_Connect');
const cloneDeep = require('lodash/cloneDeep');
var moment = require('moment');

/* Mark-Wang API Begin */

//Check Produce_No
router.post('/Check_Produce_No',  function (req, res, next) {
   console.log("Call Check_Produce_No Api:",req.body);

   req.body.Produce_No = req.body.Produce_No ? `${req.body.Produce_No.trim().replace(/'/g, '')}` : '';

   var strSQL = format(`Declare @TmpTable table(Product_No varchar(25));
   Insert @TmpTable
   SELECT p.Product_No
   FROM [dbo].[Produce] p With(Nolock,NoWait)
   where p.[Produce_No] = N'{Produce_No}';

   Select (SELECT cast((case when Count(*) > 0 then 1 else 0 end) as bit) as Flag FROM @TmpTable) as Flag
   , isnull((SELECT Product_No FROM @TmpTable),'') as Product_No
   
   `, req.body) ;
   //console.log(strSQL)
   db.sql(req.SiteDB, strSQL)
      .then((result) => {
         //console.log(result.recordset[0].RecCount <= 0)
         res.send({Flag: result.recordset[0].Flag, Product_No: result.recordset[0].Product_No});
      }).catch((err) => {
         console.log(err);
         res.status(500).send(err);
      })

});

//Check Product_No
router.post('/Check_Product_No',  function (req, res, next) {
   console.log("Call Check_Product_No Api:",req.body);

   req.body.Product_No = req.body.Product_No ? `${req.body.Product_No.trim().replace(/'/g, '')}` : '';

   var strSQL = format(` 
   Declare @TmpTable table(Brand varchar(20));
   Insert @TmpTable   
   SELECT s.Brand
   FROM [dbo].[Product] p With(Nolock,NoWait) 
   Inner Join Style s With(Nolock,NoWait) on p.Style_No = s.style_No
   where (p.[Product_No] = N'{Product_No}');

   Select (SELECT cast((case when Count(*) > 0 then 1 else 0 end) as bit) as Flag FROM @TmpTable) as Flag
   , isnull((SELECT Brand FROM @TmpTable),'') as Brand

   `, req.body) ;
   //console.log(strSQL)
   db.sql(req.Enterprise, strSQL)
      .then((result) => {
         //console.log(result.recordset[0].RecCount <= 0)
         res.send({Flag: result.recordset[0].Flag, Brand: result.recordset[0].Brand});
      }).catch((err) => {
         console.log(err);
         res.status(500).send(err);
      })

});

//Check Product Packing
router.post('/Check_Product_Packing',  function (req, res, next) {
   console.log("Call Check_Product_Packing Api:",req.body);

   //req.body.Product_PackingID = req.body.Product_PackingID ? req.body.Product_PackingID : null;
   req.body.Brand = req.body.Brand ? `${req.body.Brand.trim().replace(/'/g, '')}` : '';
   req.body.Packing_Code = req.body.Packing_Code ? `${req.body.Packing_Code.trim().replace(/'/g, '')}` : '';   
   
   var strSQL = format(`Declare @tmpTable Table(Product_PackingID int, Unit_Qty Int)
   Insert @tmpTable
   SELECT Product_PackingID, Unit_Qty
   FROM [dbo].[Product_Packing] With(Nolock,NoWait)
   where ( Brand = N'{Brand}')  
   And ( Packing_Code = N'{Packing_Code}' ) ;

   Select (Select cast((case when Count(*) > 0 then 1 else 0 end) as bit) From @tmpTable) as Flag
   , isnull((Select Product_PackingID From @tmpTable), null) as Product_PackingID
   , isnull((Select Unit_Qty From @tmpTable),0) as Unit_Qty
   
   `, req.body) ;
   //console.log(strSQL)
   db.sql(req.SiteDB, strSQL)
      .then((result) => {
         //console.log(result.recordset[0].RecCount <= 0)
         res.send({Flag: result.recordset[0].Flag, Product_PackingID: result.recordset[0].Product_PackingID, Unit_Qty: result.recordset[0].Unit_Qty});
      }).catch((err) => {
         console.log(err);
         res.status(500).send(err);
      })

});

//Get Packing_Info
router.post('/Packing_Info',  function (req, res, next) {
   console.log("Call Packing_Info Api:");
   
   req.body.Brand = req.body.Brand ? `${req.body.Brand.trim().substring(0,20).replace(/'/g, '')}` : ``;
   req.body.Packing_Code = req.body.Packing_Code ? `${req.body.Packing_Code.trim().substring(0,13).replace(/'/g, '')}` : ``;

   var strSQL = format(`
   SELECT Top 1000 row_number() Over(Order By o.Brand, Packing_Code desc) as RecNo
   , o.[Product_PackingID]
   , o.[Brand]
   , o.[Packing_Code]
   , o.[Unit_Qty]
   FROM [dbo].[Product_Packing] o With(Nolock,NoWait)
   where (N'{Brand}' = '' or o.[Brand] like N'%{Brand}%')
   And (N'{Packing_Code}' = '' or o.[Packing_Code] like N'%{Packing_Code}%')
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

//Get PKO_No
router.post('/Order_PKO',  function (req, res, next) {
   console.log("Call Order_PKO Api:");
   
   var strSQL = format(`
   SELECT distinct o.[Order_PKOID]
   , od.[Order_No]
   , o.[PKO_No]    
   FROM [dbo].[Order_PKO] o With(Nolock,NoWait)
   Inner Join Order_Detail od With(Nolock,NoWait) on od.Order_Detail_RefID = o.Order_Detail_RefID
   where o.[Qty] <> o.[Delivered_Qty]
   Order by od.[Order_No], o.[PKO_No] ;
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

//Get Product In's Produce_No data from Order Detail.
router.post('/Product_In_Produce_No',  function (req, res, next) {
   console.log("Call Product_In_Produce_No Api:");   
   req.body.Product_In_No = req.body.Product_In_No ? req.body.Product_In_No : 'null'; 
   
   var strSQL = format(`
   Select distinct pd.Produce_No
   From Product_In po with(NoWait, NoLock)
   Inner Join Order_PKO p with(NoLock,NoWait) on p.Order_PKOID = po.Order_PKOID
   Inner Join Order_Detail pd with(NoLock,NoWait) on p.Order_Detail_RefID = pd.Order_Detail_RefID
   where po.Product_In_No = {Product_In_No}
   Order by pd.Produce_No;
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

//Get Product_In_Detail_AddItems_List (出貨細項)
router.post('/Product_In_Detail_AddItems_List',  function (req, res, next) {
   console.log("Call Product_In_Detail_AddItems_List Api:");   
   req.body.Product_In_No = req.body.Product_In_No ? req.body.Product_In_No : 'null'; 
   req.body.Produce_No = req.body.Produce_No ? `N'${req.body.Produce_No.trim().substring(0,20).replace(/'/g, "''")}'` : `''`; 

   var strSQL = format(`
   Declare @tmp table(Order_PKO_DetailID int, PKO_No varchar(20), Order_No varchar(20), Product_No varchar(25), Cartons float, Unit_Qty float, Total_Qty float
   , Carton_No varchar(20), Carton_Code varchar(20));

   Insert @tmp
   Select distinct pd.Order_PKO_DetailID, p.PKO_No, od.Order_No, od.Product_No, pd.Cartons, pd.Unit_Qty
   , isnull(pd.Cartons,0) * isnull(pd.Unit_Qty,0) as Total_Qty
   , pd.Carton_No, pd.Carton_Code
   From Product_In pi with(NoLock,NoWait) 
   Inner Join Order_PKO p with(NoLock,NoWait) on pi.Order_PKOID = p.Order_PKOID
   Inner Join Order_Detail od with(NoLock,NoWait) on od.Order_Detail_RefID = p.Order_Detail_RefID
   Inner Join Order_PKO_Detail pd with(NoLock,NoWait) on p.Order_PKOID = pd.Order_PKOID
   where pi.Product_In_No = {Product_In_No}
   And (od.Produce_No = {Produce_No});

   Select t.*
   From @tmp t
   Left Outer Join (
      Select ps.Order_PKO_DetailID, sum(ps.Cartons) as Cartons
      From Product_Stock ps with(NoLock,NoWait)
      Inner Join (Select distinct Order_PKO_DetailID From @tmp) o on ps.Order_PKO_DetailID = o.Order_PKO_DetailID
      Group by ps.Order_PKO_DetailID
   ) st on t.Order_PKO_DetailID = st.Order_PKO_DetailID
   Where t.Cartons >= isnull(st.Cartons,0);
      
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

//Get Product_In_List
router.post('/Product_In_List',  function (req, res, next) {
   console.log("Call Product_In List Api:");
   
   req.body.Product_In_No = req.body.Product_In_No ? `${req.body.Product_In_No.trim().substring(0,18).replace(/'/g, '')}` : '';
   req.body.Product_In_Date = req.body.Product_In_Date ? `${req.body.Product_In_Date.trim().substring(0,10).replace(/'/g, '')}` : ``;
   req.body.Delivery_No = req.body.Delivery_No ? `${req.body.Delivery_No.trim().substring(0,20).replace(/'/g, '')}` : ``;
   req.body.WarehouseID = req.body.WarehouseID ? `${req.body.WarehouseID.trim().substring(0,10).replace(/'/g, '')}` : ``;
   req.body.UserID = req.body.UserID ? `${req.body.UserID.trim().substring(0,255).replace(/'/g, '')}` : ``;

   var strSQL = format(`
   SELECT Top 1000 row_number() Over(Order By o.Product_In_Date desc) as RecNo
   , o.[Product_In_No]
   , convert(varchar(10) ,o.[Product_In_Date] ,111) as [Product_In_Date]
   , o.[Delivery_No]
   , o.[WarehouseID]
   , o.[UserID]
   FROM [dbo].[Product_In] o With(Nolock,NoWait)
   where (N'{Product_In_No}' = '' or o.[Product_In_No] like N'%{Product_In_No}%')
   And (N'{Product_In_Date}' = '' or convert(varchar(10),o.[Product_In_Date],111) like N'%{Product_In_Date}%')
   And (N'{Delivery_No}' = '' or o.[Delivery_No] like N'%{Delivery_No}%')
   And (N'{WarehouseID}' = '' or o.[WarehouseID] like N'%{WarehouseID}%')
   And (N'{UserID}' = '' or o.[UserID] like N'%{UserID}%')
   Order By o.Product_In_Date desc, o.[Product_In_No], o.[Delivery_No], o.WarehouseID, o.UserID
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

//Get Product_In_Info
router.post('/Product_In_Info',  function (req, res, next) {
   console.log("Call Product_In_Info Api:",req.body);

   req.body.Product_In_No = req.body.Product_In_No ? req.body.Product_In_No : 0; 

   //Mode == 0 Get Product_In , Contacts And Client Data
   //Mode == 1 Get Product_In Data
   //Mode == 2 Get Product_In Contacts Data
   var strSQL = format(`
   Declare @Mode int = {Mode}
   Declare @Product_In_No int = {Product_In_No}
      
   --0 Get Product_In All Data
   --1 Get Product_In Master Data
   if(@Mode = 0 or @Mode = 1)
   Begin
      Select distinct o.[Product_In_No]      
      ,convert(varchar(10),[Product_In_Date],111) as [Product_In_Date]
      ,[Delivery_No]
      ,[WarehouseID] as Product_WarehouseID
      ,o.[Order_PKOID]
      ,isnull(op.[PKO_No],'') as PKO_No
      ,isnull(od.[Order_No],'') as Order_No
      ,isnull(od.[Product_No],'') as Product_No
      ,o.[UserID]
      ,convert(varchar(10),[Create_Date],111) as [Create_Date]
      ,o.[Data_Updater]
      ,convert(varchar(10),o.[Data_Update],111) as [Data_Update]
      from Product_In o with(NoLock,NoWait)
      Left Outer Join Order_PKO op with(NoLock,Nowait) on op.Order_PKOID = o.Order_PKOID
      Left Outer Join Order_Detail od with(NoLock,NoWait) on od.Order_Detail_RefID = op.Order_Detail_RefID
      Where o.Product_In_No = @Product_In_No;
   End
   
   --2 Get Product_In Detail Data
   if(@Mode = 0 or @Mode = 2)
   Begin   
      Select row_number() Over(Order By c.[Product_In_DetailID]) as RecNo
      , c.[Product_In_DetailID]
      , c.[Product_In_No]
      , c.[Warehouse_RankID] as Product_Warehouse_RankID
      , (Select Rank_Name From Product_Warehouse_Rank p with(NoLock,NoWait) Where p.Product_Warehouse_RankID = c.Warehouse_RankID) as [Rank_Name]
      , isnull(c.Produce_No,'') as [Produce_No]
      , c.[Product_No]
      , c.[Order_PKO_DetailID]
      , p.[Carton_No]
      , p.[Carton_Code]
      , p.[Unit_Qty]
      , c.Cartons
      , c.[Size]
      , (Select Size_Name From Product_Size ps with(NoLock,NoWait) Where ps.SizeID = c.Size) as [Size_Name]
      , case when c.Order_PKO_DetailID is null then c.[In_Qty] 
         else
         c.Cartons * p.[Unit_Qty] 
         End as In_Qty
      , c.[Remark]
      , case when c.Order_PKO_DetailID is null then 
            ( case when c.In_Qty <= ps.Stock_Qty then 1 else 0 end )
         else 
            ( case when c.Cartons <= ps.Cartons then 1 else 0 end )
      End as Stock_Flag
      from Product_In_Detail c with(NoLock,NoWait)
      Left Outer Join Product_Stock ps with(NoLock,NoWait) on c.Warehouse_RankID = ps.Product_Warehouse_RankID 
         And c.Produce_No = ps.Produce_No And c.Product_No = ps.Product_No 
	      And c.Size = ps.Size And (c.Order_PKO_DetailID is null or c.Order_PKO_DetailID = ps.Order_PKO_DetailID)
      Left Outer Join Order_PKO_Detail p with(NoLock,NoWait)on p.Order_PKO_DetailID = c.Order_PKO_DetailID      
      Where Product_In_No = @Product_In_No;
   End    
   `, req.body) ;
   //console.log(strSQL)
   db.sql(req.SiteDB, strSQL)
      .then((result) => {
         var DataSet = {
            Product_In_Info: (req.body.Mode == 0 || req.body.Mode == 1) ? result.recordsets[0] : []
            , Product_In_Detail_Info: req.body.Mode == 0 ? result.recordsets[1] : (req.body.Mode == 2 ? result.recordsets[0] : [])
         }
         res.send(DataSet);
      }).catch((err) => {
         console.log(err);
         res.status(500).send(err);
      })

});

//Maintain Product_In
router.post('/Product_In_Maintain',  function (req, res, next) {
   console.log("Call Product_In_Maintain Api:",req.body);

   // req.body.Mode === 0 表示新增
   // req.body.Mode === 1 表示修改 
   // req.body.Mode === 2 表示刪除
   req.body.Product_In_No = req.body.Product_In_No ? req.body.Product_In_No : 0; 
   var strSQL = format(`Declare @ROWCOUNT int, @Product_In_No int = {Product_In_No}`,req.body)
   switch(req.body.Mode){
      case 0:
         req.body.Delivery_No = req.body.Delivery_No ? `N'${req.body.Delivery_No.trim().substring(0,20).replace(/'/g, "''")}'` : `''`; 
         req.body.Product_WarehouseID = req.body.Product_WarehouseID ? `N'${req.body.Product_WarehouseID.trim().substring(0,10).replace(/'/g, "''")}'` : `''`; 

         strSQL += format(`
            Insert into [dbo].[Product_In] (Product_In_Date, Delivery_No, WarehouseID, UserID, Create_Date, Data_Update, Data_Updater)
            Select GetDate() as [Product_In_Date], {Delivery_No} as Delivery_No, {Product_WarehouseID} as WarehouseID, N'${req.UserID}' as UserID, GetDate() as [Create_Date], GetDate() as [Data_Update], N'${req.UserID}' as [Data_Updater];         
            Set @ROWCOUNT = @@ROWCOUNT;
            set @Product_In_No = scope_identity();
         `, req.body);
         break;
      case 1: 
         var Size = 0;
         switch(req.body.Name){
            case 'Product_In_Date':
               Size = 10;
            break;
            case 'Delivery_No':
               Size = 20;
            break;
            case 'WarehouseID':
               Size = 10;
            break;
            default:
            break;
         }
         req.body.Value = Size > 0 ? `N'${req.body.Value.trim().substring(0,Size).replace(/'/g, "''")}'` : req.body.Value;      

         strSQL += format(`
            Update [dbo].[Product_In] Set [{Name}] = ${Size == 0 ? '{Value}': `substring({Value},1,${Size})`}            
            , Data_Updater = N'${req.UserID}'
            , Data_Update = GetDate()
            where Product_In_No = @Product_In_No
            ${(req.body.Name == 'Product_In_Date' || req.body.Name == 'WarehouseID' || req.body.Name == 'Order_PKOID') ? 'And (Select count(*) From Product_In_Detail pd with(NoLock,NoWait) Where pd.Product_In_No = {Product_In_No}) = 0':'' };
            Set @ROWCOUNT = @@ROWCOUNT;
         `, req.body);
         break;
      case 2:
         strSQL += format(`
            Delete FROM [dbo].[Product_In] 
            where Product_In_No = @Product_In_No
            And (Select count(*) From Product_In_Detail pd with(NoLock,NoWait) Where pd.Product_In_No = {Product_In_No}) = 0;
            Set @ROWCOUNT = @@ROWCOUNT;
         `, req.body);
         break;
   }

   strSQL += format(`
   Select @ROWCOUNT as Flag, @Product_In_No as Product_In_No;
   `, req.body);
   //console.log(strSQL)
   db.sql(req.SiteDB, strSQL)
      .then((result) => {
         //console.log(result.recordsets[0])
         var datset = result.recordsets[0][0];
         res.send({Flag:datset.Flag > 0, Product_In_No: datset.Product_In_No});
      }).catch((err) => {
         console.log(err);
         res.status(500).send(err);
      })

});

//Maintain Product_In_Detail
router.post('/Product_In_Detail_Maintain',  function (req, res, next) {
   console.log("Call Product_In_Detail_Maintain Api:",req.body);

   // req.body.Mode === 0 表示新增
   // req.body.Mode === 1 表示修改
   // req.body.Mode === 2 表示刪除
   // req.body.Mode === 3 表示PKO入庫
   req.body.Product_In_No = req.body.Product_In_No ? req.body.Product_In_No : 0; 
   
   var strSQL = format(`Declare @ROWCOUNT int = 0, @Mode int = {Mode}, @Check_Product_WarehouseID int = 0; `, req.body);

   switch(req.body.Mode){
      case 0:
         req.body.Produce_No = req.body.Produce_No ? `N'${req.body.Produce_No.trim().substring(0,20).replace(/'/g, "''")}'` : null;
         req.body.Order_PKO_DetailID = req.body.Order_PKO_DetailID ? req.body.Order_PKO_DetailID : null;
         strSQL += format(`
         Declare @Update int = 0;

         Set @Check_Product_WarehouseID = (
          Select Count(*) 
         From Product_In pi with(NoLock,NoWait)
         Inner Join Product_Warehouse_Rank r with(NoLock,NoWait) on pi.WarehouseID = r.Product_WarehouseID
         Where pi.Product_In_No = {Product_In_No} 
         and r.Product_Warehouse_RankID = {Warehouse_RankID} )

         if(@Check_Product_WarehouseID > 0)
         Begin
            Update Product_Stock Set Stock_QTY = Stock_QTY + case when isnull({Order_PKO_DetailID},'') = '' then {In_Qty} else 0 End
            , Cartons = Cartons + {Cartons}
            , Update_Date = GetDate()
            Where Product_Warehouse_RankID = {Warehouse_RankID}
            And isnull(Produce_No,'') = isnull({Produce_No},'')
            And Product_No = N'{Product_No}'
            And isnull(Order_PKO_DetailID,'') = isnull({Order_PKO_DetailID},'')
            And Size = {Size};
            Set @Update = @@ROWCOUNT;

            if(@Update = 0)
            Begin
               Insert Into Product_Stock(Product_Warehouse_RankID, Produce_No, Product_No, Order_PKO_DetailID, Cartons, Size, Stock_QTY, Update_Date)
               Select {Warehouse_RankID} as [Product_Warehouse_RankID], UPPER({Produce_No}) as [Produce_No], N'{Product_No}' as [Product_No], {Order_PKO_DetailID} as [Order_PKO_DetailID], {Cartons} as [Cartons], {Size} as [Size], case when isnull({Order_PKO_DetailID},'') = '' then {In_Qty} else 0 End as [Stock_QTY], GetDate() as Update_Date
               Where (Select count(*) From Product_Stock ps Where Product_Warehouse_RankID = {Warehouse_RankID}
               And isnull(Produce_No,'') = isnull({Produce_No},'')
               And Product_No = N'{Product_No}'
               And isnull(Order_PKO_DetailID,'') = isnull({Order_PKO_DetailID},'')
               And Size = {Size}) = 0;
               set @Update = @@ROWCOUNT;
            End

            if(@Update > 0)
            Begin
               INSERT INTO [dbo].[Product_In_Detail] ([Product_In_No], [Warehouse_RankID], [Produce_No], [Product_No], Order_PKO_DetailID, Cartons, [Size], [In_Qty])
               Select {Product_In_No} as [Product_In_No], {Warehouse_RankID} as [Warehouse_RankID], UPPER({Produce_No}) as [Produce_No], N'{Product_No}' as [Product_No], {Order_PKO_DetailID} as [Order_PKO_DetailID], {Cartons} as [Cartons], {Size} as [Size], case when isnull({Order_PKO_DetailID},'') = '' then {In_Qty} else 0 End as [In_Qty]
               Set @ROWCOUNT = @@ROWCOUNT;
            End
         End
         `, req.body);
      break;
      case 1:
        strSQL += format(`
        Update Product_Stock Set 
        ${req.body.Name =='In_Qty' ? 'Stock_QTY = Stock_QTY + ({Value} - pid.In_Qty)':''}
        ${req.body.Name =='Cartons' ? 'Cartons = ps.Cartons + ({Value} - pid.Cartons)' : ''}
        , Update_Date = GetDate()
        From Product_Stock ps
        Inner Join Product_In_Detail pid on ps.Product_Warehouse_RankID = pid.Warehouse_RankID
        And isnull(ps.Produce_No,'') = isnull(pid.Produce_No,'')
        And ps.Product_No = pid.Product_No
        And isnull(ps.Order_PKO_DetailID,'') = isnull(pid.Order_PKO_DetailID,'')
        And ps.Size = pid.Size
        Where pid.Product_In_DetailID = {Product_In_DetailID}
        ${req.body.Name =='In_Qty' ? 'And (Stock_QTY + ({Value} - pid.In_Qty)) >= 0' : ''}
        ${req.body.Name =='Cartons' ? 'And (ps.Cartons + ({Value} - pid.Cartons)) >= 0':''}
        ;

        if(@@ROWCOUNT > 0)
        Begin
           Update [dbo].[Product_In_Detail] Set 
           ${req.body.Name =='In_Qty' ? 'In_Qty = {Value}':''}
           ${req.body.Name =='Cartons' ? 'Cartons = {Value}':''}
           where Product_In_DetailID = {Product_In_DetailID};
           Set @ROWCOUNT = @@ROWCOUNT;
        End
        `, req.body);
      break;
      case 2:
        strSQL += format(`
        Update Product_Stock Set Stock_QTY = Stock_QTY - isnull(pid.In_Qty,0)
        , Cartons = ps.Cartons - isnull(pid.Cartons,0)
        , Update_Date = GetDate()
        From Product_Stock ps
        Inner Join Product_In_Detail pid on ps.Product_Warehouse_RankID = pid.Warehouse_RankID
        And isnull(ps.Produce_No,'') = isnull(pid.Produce_No,'')
        And ps.Product_No = pid.Product_No
        And isnull(ps.Order_PKO_DetailID,'') = isnull(pid.Order_PKO_DetailID,'')
        And ps.Size = pid.Size
        Where pid.Product_In_DetailID = {Product_In_DetailID}
        And (ps.Stock_QTY - isnull(pid.In_Qty,0)) >= 0
        And (ps.Cartons - isnull(pid.Cartons,0)) >= 0;

        if(@@ROWCOUNT > 0)
        Begin
           Delete FROM [dbo].[Product_In_Detail]
           where Product_In_DetailID = {Product_In_DetailID};
           Set @ROWCOUNT = @@ROWCOUNT;
        End
        `, req.body);
      break;
      case 3:
         req.body.Produce_No = req.body.Produce_No ? `N'${req.body.Produce_No.trim().substring(0,20).replace(/'/g, "''")}'` : null;
         req.body.Order_PKO_DetailID = req.body.Order_PKO_DetailID ? req.body.Order_PKO_DetailID : null;
         strSQL += format(`
         Declare @Update int = 0;

         Set @Check_Product_WarehouseID = (
          Select Count(*) 
         From Product_In pi with(NoLock,NoWait)
         Inner Join Product_Warehouse_Rank r with(NoLock,NoWait) on pi.WarehouseID = r.Product_WarehouseID
         Where pi.Product_In_No = {Product_In_No} 
         and r.Product_Warehouse_RankID = {Warehouse_RankID} )

         if(@Check_Product_WarehouseID > 0)
         Begin
            Update Product_Stock Set Cartons = Cartons + {Cartons}
            , Update_Date = GetDate()
            Where Product_Warehouse_RankID = {Warehouse_RankID}
            And isnull(Produce_No,'') = isnull({Produce_No},'')
            And Product_No = N'{Product_No}'
            And isnull(Order_PKO_DetailID,'') = isnull({Order_PKO_DetailID},'')
            And Size = 0;
            Set @Update = @@ROWCOUNT;

            if(@Update = 0)
            Begin
               Insert Into Product_Stock(Product_Warehouse_RankID, Produce_No, Product_No, Order_PKO_DetailID, Cartons, Size, Stock_QTY, Update_Date)
               Select {Warehouse_RankID} as [Product_Warehouse_RankID], UPPER({Produce_No}) as [Produce_No], N'{Product_No}' as [Product_No], {Order_PKO_DetailID} as [Order_PKO_DetailID], {Cartons} as [Cartons], {Size} as [Size],  0 as [Stock_QTY], GetDate() as Update_Date
               Where (
                  Select count(*) From Product_Stock ps Where Product_Warehouse_RankID = {Warehouse_RankID}
                  And isnull(Produce_No,'') = isnull({Produce_No},'')
                  And Product_No = N'{Product_No}'                  
                  And isnull(Order_PKO_DetailID,'') = isnull({Order_PKO_DetailID},'')
                  And Size = {Size}
               ) = 0;
               set @Update = @@ROWCOUNT;
            End

            if(@Update > 0)
            Begin
               INSERT INTO [dbo].[Product_In_Detail] ([Product_In_No], [Warehouse_RankID], [Produce_No], [Product_No], Order_PKO_DetailID, Cartons, [Size], [In_Qty])
               Select {Product_In_No} as [Product_In_No], {Warehouse_RankID} as [Warehouse_RankID], UPPER({Produce_No}) as [Produce_No], N'{Product_No}' as [Product_No], {Order_PKO_DetailID} as [Order_PKO_DetailID], {Cartons} as [Cartons], {Size} as [Size], 0 as [In_Qty]
               Set @ROWCOUNT = @@ROWCOUNT;
            End
         End
         `, req.body);
      break;
   }

   strSQL += format(`
   Select @ROWCOUNT as Flag, @Check_Product_WarehouseID as Check_Product_WarehouseID;

   if(@ROWCOUNT > 0 )
   Begin
      Update [dbo].[Product_In] Set UserID = isnull(UserID, N'${req.UserID}')
      , Data_Updater = N'${req.UserID}'
      , Data_Update = GetDate()
      where Product_In_No = {Product_In_No};
   End
   `, req.body);
   //console.log(strSQL)
   db.sql(req.SiteDB, strSQL)
      .then((result) => {
         //console.log(result.recordsets[0])
         res.send({Flag: result.recordsets[0][0].Flag > 0, Check_Product_WarehouseID: result.recordsets[0][0].Check_Product_WarehouseID});
      }).catch((err) => {
         console.log(err);
         res.status(500).send(err);
      })

});

//Get Product Out's Produce_No data from Product_Stock.
router.post('/Product_Out_Produce_No',  function (req, res, next) {
   console.log("Call Product_Out_Produce_No Api:");   
   req.body.Product_Out_No = req.body.Product_Out_No ? req.body.Product_Out_No : 'null'; 
   
   var strSQL = format(`
   Select distinct ps.Produce_No
   From Product_Out po with(NoWait, NoLock)
   Inner Join Order_PKO p with(NoLock,NoWait) on p.Order_PKOID = po.Order_PKOID
   Inner Join Order_PKO_Detail pd with(NoLock,NoWait) on p.Order_PKOID = pd.Order_PKOID
   Inner Join Order_Detail od with(NoLock,NoWait) on od.Order_Detail_RefID = p.Order_Detail_RefID   
   Inner Join Product_Stock ps with(NoWait,NoLock) on ps.Produce_No = od.Produce_No And ps.Product_No = od.Product_No And pd.Order_PKO_DetailID = ps.Order_PKO_DetailID
   Inner Join Product_Warehouse_Rank pw with(NoLock,NoWait) on pw.Product_WarehouseID = po.WarehouseID And ps.Product_Warehouse_RankID = pw.Product_Warehouse_RankID 
   where po.Product_Out_No = {Product_Out_No}   
   And ps.Cartons > 0;      
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

//Get Product_Out_Detail_AddItems_List (出貨細項)
router.post('/Product_Out_Detail_AddItems_List',  function (req, res, next) {
   console.log("Call Product_Out_Detail_AddItems_List Api:", req.body);   
   req.body.Product_Out_No = req.body.Product_Out_No ? req.body.Product_Out_No : 'null'; 
   req.body.Produce_No = req.body.Produce_No ? `N'${req.body.Produce_No.trim().substring(0,20).replace(/'/g, "''")}'` : `''`; 

   var strSQL = format(`
   Select distinct p.Order_PKOID
   , pd.Order_PKO_DetailID
   , pw.Product_Warehouse_RankID, pw.Rank_Name
   , pd.Carton_No, pd.Carton_Code, od.Order_No, od.Produce_No, od.Product_No
   , case when (isnull(pd.Cartons,0) - isnull(pd.Delivered_Cartons,0)) > ps.Cartons then ps.Cartons else (isnull(pd.Cartons,0) - isnull(pd.Delivered_Cartons,0)) end as Cartons
   , pd.Unit_Qty, pd.Delivered_Cartons, ps.Cartons as Stock_Cartons
   From Product_Out po with(NoWait, NoLock)
   Inner Join Order_PKO p with(NoLock,NoWait) on p.Order_PKOID = po.Order_PKOID
   Inner Join Order_Detail od with(NoLock,NoWait) on od.Order_Detail_RefID = p.Order_Detail_RefID
   Inner Join Order_PKO_Detail pd with(NoLock,NoWait) on p.Order_PKOID = pd.Order_PKOID      
   Inner Join Product_Stock ps with(NoWait,NoLock) on ps.Produce_No = od.Produce_No And ps.Product_No = od.Product_No And pd.Order_PKO_DetailID = ps.Order_PKO_DetailID
   Inner Join Product_Warehouse_Rank pw with(NoLock,NoWait) on pw.Product_WarehouseID = po.WarehouseID And ps.Product_Warehouse_RankID = pw.Product_Warehouse_RankID
   where po.Product_Out_No = {Product_Out_No}
   And (od.Produce_No = {Produce_No})   
   And ps.Cartons > 0
      
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

//Get Product_Out_List
router.post('/Product_Out_List',  function (req, res, next) {
   console.log("Call Product_Out_List Api:");
   
   req.body.Product_Out_No = req.body.Product_Out_No ? `${req.body.Product_Out_No.trim().substring(0,18).replace(/'/g, '')}` : ``;
   req.body.Product_Out_Date = req.body.Product_Out_Date ? `${req.body.Product_Out_Date.trim().substring(0,10).replace(/'/g, '')}` : ``;
   req.body.Shipment_NO = req.body.Shipment_NO ? `${req.body.Shipment_NO.trim().substring(0,18).replace(/'/g, '')}` : ``;
   req.body.WarehouseID = req.body.WarehouseID ? `${req.body.WarehouseID.trim().substring(0,10).replace(/'/g, '')}` : ``;
   req.body.UserID = req.body.UserID ? `${req.body.UserID.trim().substring(0,255).replace(/'/g, '')}` : ``;

   var strSQL = format(`
   SELECT Top 1000 row_number() Over(Order By o.Product_Out_Date desc) as RecNo
   , o.[Product_Out_No]
   , convert(varchar(10) ,o.[Product_Out_Date] ,111) as [Product_Out_Date]
   , o.[Shipment_NO]
   , o.[WarehouseID]
   , o.[UserID]
   FROM [dbo].[Product_Out] o With(Nolock,NoWait)
   where (N'{Product_Out_No}' = '' or o.[Product_Out_No] like N'%{Product_Out_No}%')
   And (N'{Product_Out_Date}' = '' or convert(varchar(10),o.[Product_Out_Date],111) like N'%{Product_Out_Date}%')
   And (N'{Shipment_NO}' = '' or o.[Shipment_NO] like N'%{Shipment_NO}%')
   And (N'{WarehouseID}' = '' or o.[WarehouseID] like N'%{WarehouseID}%')
   And (N'{UserID}' = '' or o.[UserID] like N'%{UserID}%')
   Order By o.Product_Out_Date desc, o.[Product_Out_No], o.[Shipment_NO], o.WarehouseID, o.UserID
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

//Get Product_Out_Info
router.post('/Product_Out_Info',  function (req, res, next) {
   console.log("Call Product_Out_Info Api:",req.body);

   req.body.Product_Out_No = req.body.Product_Out_No ? req.body.Product_Out_No : 0; 

   //Mode == 0 Get Product_Out , Contacts And Client Data
   //Mode == 1 Get Product_Out Data
   //Mode == 2 Get Product_Out Contacts Data

   var strSQL = format(`
   Declare @Mode int = {Mode}
   Declare @Product_Out_No int = {Product_Out_No}
      
   --0 Get Product_Out All Data
   --1 Get Product_Out Master Data
   if(@Mode = 0 or @Mode = 1)
   Begin
      Select distinct o.[Product_Out_No]      
      ,convert(varchar(10),[Product_Out_Date],111) as [Product_Out_Date]
      ,[Shipment_NO]
      , case when isnull([Shipment_NO],'') = '' then 1 else 0 end as Shipment_NO_Flag
      ,[WarehouseID] as Product_WarehouseID
      ,o.[Order_PKOID]
      ,isnull(op.[PKO_No],'') as PKO_No
      ,isnull(od.[Order_No],'') as Order_No
      ,isnull(od.[Product_No],'') as Product_No
      ,o.[UserID]
      ,convert(varchar(10),o.[Create_Date],111) as [Create_Date]
      ,o.[Data_Updater]
      ,convert(varchar(10),o.[Data_Update],111) as [Data_Update]
      from Product_Out o with(NoLock,NoWait)
      Left Outer Join Order_PKO op with(NoLock,Nowait) on op.Order_PKOID = o.Order_PKOID
      Left Outer Join Order_Detail od with(NoLock,NoWait) on od.Order_Detail_RefID = op.Order_Detail_RefID
      Where o.Product_Out_No = @Product_Out_No;
   End
   
   --2 Get Product_Out Detail Data
   if(@Mode = 0 or @Mode = 2)
   Begin   
      Select row_number() Over(Order By c.[Product_Out_DetailID]) as RecNo
      , c.[Product_Out_DetailID]
      , c.[Product_Out_No]
      , c.[Warehouse_RankID] as Product_Warehouse_RankID
      , (Select Rank_Name From Product_Warehouse_Rank p with(NoLock,NoWait) Where p.Product_Warehouse_RankID = c.Warehouse_RankID) as [Rank_Name]
      , c.[Produce_No]
      , c.[Product_No]
      , c.[Order_PKO_DetailID]      
      , p.[Carton_No]
      , p.[Carton_Code]
      , p.[Unit_Qty]
      , c.Cartons
      , c.[Size]
      , (Select Size_Name From Product_Size ps with(NoLock,NoWait) Where ps.SizeID = c.Size) as [Size_Name]      
      , case when c.Order_PKO_DetailID is null then c.[Out_Qty] 
         else
         c.Cartons * p.[Unit_Qty] 
         End as Out_Qty
      , c.[Remark]
      from Product_Out_Detail c with(NoLock,NoWait)
      Left Outer Join Order_PKO_Detail p with(NoLock,NoWait)on p.Order_PKO_DetailID = c.Order_PKO_DetailID
      Where Product_Out_No = @Product_Out_No;
   End 
   
   `, req.body) ;
   //console.log(strSQL)
   db.sql(req.SiteDB, strSQL)
      .then((result) => {
         var DataSet = {
            Product_Out_Info: (req.body.Mode == 0 || req.body.Mode == 1) ? result.recordsets[0] : []
            , Product_Out_Detail_Info: req.body.Mode == 0 ? result.recordsets[1] : (req.body.Mode == 2 ? result.recordsets[0] : [])
         }
         res.send(DataSet);
      }).catch((err) => {
         console.log(err);
         res.status(500).send(err);
      })

});

//Maintain Product_Out
router.post('/Product_Out_Maintain',  function (req, res, next) {
   console.log("Call Product_Out_Maintain Api:",req.body);

   // req.body.Mode === 0 表示新增
   // req.body.Mode === 1 表示修改 
   // req.body.Mode === 2 表示刪除
   req.body.Product_Out_No = req.body.Product_Out_No ? req.body.Product_Out_No : 0; 
   var strSQL = format(`Declare @ROWCOUNT int, @Product_Out_No int = {Product_Out_No}`,req.body)
   switch(req.body.Mode){
      case 0:
         req.body.Shipment_NO = req.body.Shipment_NO ? `N'${req.body.Shipment_NO.trim().substring(0,18).replace(/'/g, "''")}'` : `''`; 
         req.body.Product_WarehouseID = req.body.Product_WarehouseID ? `N'${req.body.Product_WarehouseID.trim().substring(0,10).replace(/'/g, "''")}'` : `''`; 

         strSQL += format(`
            Insert into [dbo].[Product_Out] (Product_Out_Date
               , WarehouseID, UserID, Create_Date, Data_Update, Data_Updater)
            Select GetDate() as [Product_Out_Date]
            , {Product_WarehouseID} as WarehouseID, N'${req.UserID}' as UserID, GetDate() as [Create_Date], GetDate() as [Data_Update], N'${req.UserID}' as [Data_Updater];         
            Set @ROWCOUNT = @@ROWCOUNT;
            set @Product_Out_No = scope_identity();
         `, req.body);
         break;
      case 1: 
         var Size = 0;
         switch(req.body.Name){
            case 'Product_Out_Date':
               Size = 10;
            break;
            case 'Shipment_NO':
               Size = 18;
            break;
            case 'WarehouseID':
               Size = 10;
            break;
            default:
            break;
         }
         req.body.Value = Size > 0 ? `N'${req.body.Value.trim().substring(0,Size).replace(/'/g, "''")}'` : req.body.Value;      

         strSQL += format(`
            Update [dbo].[Product_Out] Set [{Name}] = ${Size == 0 ? '{Value}': `substring({Value},1,${Size})`}            
            , Data_Updater = N'${req.UserID}'
            , Data_Update = GetDate()
            where Product_Out_No = @Product_Out_No
            --And isnull([Shipment_NO],'') = ''
            ${(req.body.Name == 'Product_Out_Date' || req.body.Name == 'WarehouseID' || req.body.Name == 'Order_PKOID'  ) ? 'And (Select count(*) From Product_Out_Detail pd with(NoLock,NoWait) Where pd.Product_Out_No = {Product_Out_No}) = 0':'' };
            Set @ROWCOUNT = @@ROWCOUNT;
         `, req.body);
         break;
      case 2:
         strSQL += format(`
            Delete FROM [dbo].[Product_Out] 
            where Product_Out_No = @Product_Out_No
            --And isnull([Shipment_NO],'') = ''
            And (Select count(*) From Product_Out_Detail pd with(NoLock,NoWait) Where pd.Product_Out_No = {Product_Out_No}) = 0;
            Set @ROWCOUNT = @@ROWCOUNT;
         `, req.body);
         break;
   }

   strSQL += format(`
   Select @ROWCOUNT as Flag, @Product_Out_No as Product_Out_No;
   `, req.body);
   //console.log(strSQL)
   db.sql(req.SiteDB, strSQL)
      .then((result) => {
         //console.log(result.recordsets[0])
         var datset = result.recordsets[0][0];
         res.send({Flag:datset.Flag > 0, Product_Out_No: datset.Product_Out_No});
      }).catch((err) => {
         console.log(err);
         res.status(500).send(err);
      })

});

//Maintain Product_Out_Detail
router.post('/Product_Out_Detail_Maintain',  function (req, res, next) {
   console.log("Call Product_Out_Detail_Maintain Api:",req.body);

   // req.body.Mode === 0 表示新增
   // req.body.Mode === 1 表示修改
   // req.body.Mode === 2 表示刪除
   // req.body.Mode === 3 表示PKO出庫
   req.body.Product_Out_No = req.body.Product_Out_No ? req.body.Product_Out_No : 0; 
   req.body.Warehouse_RankID = req.body.Warehouse_RankID ? req.body.Warehouse_RankID : 0; 
   req.body.Order_PKOID = req.body.Order_PKOID ? req.body.Order_PKOID : 'null'; 
   
      
   var strSQL = format(`Declare @ROWCOUNT int = 0, @Mode int = {Mode}, @Check_Product_WarehouseID int = 0, @Edit_Flag int = 0 ; 
   if(@Mode = 0 or @Mode = 3)
   Begin
      Set @Check_Product_WarehouseID = (
         Select Count(*) 
      From Product_Out pi with(NoLock,NoWait)
      Inner Join Product_Warehouse_Rank r with(NoLock,NoWait) on pi.WarehouseID = r.Product_WarehouseID
      Where pi.Product_Out_No = {Product_Out_No} 
      and r.Product_Warehouse_RankID = {Warehouse_RankID}
      --And isnull([Shipment_NO],'') = ''
      )
   End 

   if(@Mode = 1 or @Mode = 2)
   Begin
   /*
      Select @Edit_Flag = case when isnull([Shipment_NO],'') = '' then 1 else 0 end      
      From Product_Out pi with(NoLock,NoWait)
      Where pi.Product_Out_No = {Product_Out_No};
   */      
      Set @Edit_Flag = 1
   End
      
   `, req.body);

   switch(req.body.Mode){
      case 0:
         req.body.Produce_No = req.body.Produce_No ? `N'${req.body.Produce_No.trim().substring(0,20).replace(/'/g, "''")}'` : null;
         req.body.Order_PKO_DetailID = req.body.Order_PKO_DetailID ? req.body.Order_PKO_DetailID: null;

         strSQL += format(`
         if(@Check_Product_WarehouseID > 0)
         Begin
            Update Product_Stock Set Stock_QTY = isnull(Stock_QTY,0) - case when isnull({Order_PKO_DetailID},'') = '' then {Out_Qty} else 0 End
            , Cartons = isnull(Cartons,0) - {Cartons} 
            , Update_Date = GetDate()
            Where Product_Warehouse_RankID = {Warehouse_RankID}
            And isnull(Produce_No,'') = isnull({Produce_No},'')
            And Product_No = N'{Product_No}'
            And isnull(Order_PKO_DetailID,'') = isnull({Order_PKO_DetailID},'')
            And Size = {Size}
            And isnull(Stock_QTY,0) - case when isnull({Order_PKO_DetailID},'') = '' then {Out_Qty} else 0 End >= 0
            And isnull(Cartons,0) - {Cartons} >= 0;

            if(@@ROWCOUNT > 0)
            Begin
               INSERT INTO [dbo].[Product_Out_Detail] ([Product_Out_No], [Warehouse_RankID], [Produce_No], [Product_No], Order_PKO_DetailID, Cartons, [Size], [Out_Qty])
               Select {Product_Out_No} as [Product_Out_No], {Warehouse_RankID} as [Warehouse_RankID], {Produce_No} as [Produce_No], N'{Product_No}' as [Product_No], {Order_PKO_DetailID} as [Order_PKO_DetailID], {Cartons} as [Cartons], {Size} as [Size], case when isnull({Order_PKO_DetailID},'') = '' then {Out_Qty} else 0 End as [Out_Qty]
               Set @ROWCOUNT = @@ROWCOUNT;
            End
         End
         `, req.body);
      break;
      case 1:
         var Size = 0;
        strSQL += format(`
        if(@Edit_Flag = 1)
        Begin
           Update Product_Stock Set 
           ${req.body.Name =='Out_Qty' ? 'Stock_QTY = Stock_QTY - ({Value} - pid.Out_Qty)':''}
           ${req.body.Name =='Cartons' ? 'Cartons = ps.Cartons - ({Value} - pid.Cartons)' : ''}  
           , Update_Date = GetDate()
           From Product_Stock ps
           Inner Join Product_Out_Detail pid on ps.Product_Warehouse_RankID = pid.Warehouse_RankID
           And isnull(ps.Produce_No,'') = isnull(pid.Produce_No,'')
           And ps.Product_No = pid.Product_No
           And isnull(ps.Order_PKO_DetailID,'') = isnull(pid.Order_PKO_DetailID,'')
           And ps.Size = pid.Size
           Where pid.Product_Out_DetailID = {Product_Out_DetailID}
           ${req.body.Name =='Out_Qty' ? 'And (Stock_QTY - ({Value} - pid.Out_Qty)) >= 0' : ''}         
           ${req.body.Name =='Cartons' ? 'And ( ps.Cartons - (isnull({Value},0) - isnull(pid.Cartons,0)) ) >= 0' : ''}
           ;
   
           if(@@ROWCOUNT > 0)
           Begin
              Update [dbo].[Product_Out_Detail] Set 
              ${req.body.Name =='Out_Qty' ? 'Out_Qty = {Value}':''}
              ${req.body.Name =='Cartons' ? 'Cartons = {Value}':''}
              where Product_Out_DetailID = {Product_Out_DetailID};
              Set @ROWCOUNT = @@ROWCOUNT;   
           End
         End
        `, req.body);
      break;
      case 2:
        strSQL += format(`
        if(@Edit_Flag = 1)
        Begin
           Update Product_Stock Set Stock_QTY = Stock_QTY + isnull(pid.Out_Qty,0)
           , Cartons = ps.Cartons + isnull(pid.Cartons,0)
           , Update_Date = GetDate()
           From Product_Stock ps
           Inner Join Product_Out_Detail pid on ps.Product_Warehouse_RankID = pid.Warehouse_RankID
           And isnull(ps.Produce_No,'') = isnull(pid.Produce_No,'')
           And ps.Product_No = pid.Product_No        
           And isnull(ps.Order_PKO_DetailID,'') = isnull(pid.Order_PKO_DetailID,'')
           And ps.Size = pid.Size
           Where pid.Product_Out_DetailID = {Product_Out_DetailID};
   
           if(@@ROWCOUNT > 0)
           Begin
              Delete FROM [dbo].[Product_Out_Detail] 
              where Product_Out_DetailID = {Product_Out_DetailID} ;
              Set @ROWCOUNT = @@ROWCOUNT;
           End
         End
        `, req.body);
      break;
      case 3:
         req.body.Produce_No = req.body.Produce_No ? `N'${req.body.Produce_No.trim().substring(0,20).replace(/'/g, "''")}'` : null;
         req.body.Product_No = req.body.Product_No ? `N'${req.body.Product_No.trim().substring(0,25).replace(/'/g, "''")}'` : null;
         req.body.Order_PKO_DetailID = req.body.Order_PKO_DetailID ? req.body.Order_PKO_DetailID: null;

         strSQL += format(`
         if(@Check_Product_WarehouseID > 0)
         Begin
            Update Product_Stock Set Cartons = isnull(Cartons,0) - {Cartons} 
            , Update_Date = GetDate()
            Where Product_Warehouse_RankID = {Warehouse_RankID}
            And isnull(Produce_No,'') = isnull({Produce_No},'')
            And Product_No = {Product_No}
            And isnull(Order_PKO_DetailID,'') = isnull({Order_PKO_DetailID},'')
            And Size = {Size}            
            And isnull(Cartons,0) - {Cartons} >= 0;

            if(@@ROWCOUNT > 0)
            Begin
               INSERT INTO [dbo].[Product_Out_Detail] ([Product_Out_No], [Warehouse_RankID], [Produce_No], [Product_No], Order_PKO_DetailID, Cartons, [Size], [Out_Qty])
               Select {Product_Out_No} as [Product_Out_No], {Warehouse_RankID} as [Warehouse_RankID], UPPER({Produce_No}) as [Produce_No], {Product_No} as [Product_No], {Order_PKO_DetailID} as [Order_PKO_DetailID], {Cartons} as [Cartons], {Size} as [Size], 0 as [Out_Qty]
               Set @ROWCOUNT = @@ROWCOUNT;
            End
         End
         `, req.body);
      break;
      }
     

   strSQL += format(`
   Select @ROWCOUNT as Flag, @Check_Product_WarehouseID as Check_Product_WarehouseID;

   if(@ROWCOUNT > 0 And ((@Mode = 1 And '{Name}' = 'Cartons' ) or @Mode = 2  or @Mode = 3))
   Begin
      Update Order_PKO_Detail set Delivered_Cartons = isnull((Select sum(Cartons) From Product_Out_Detail p with(NoLock,NoWait) Where p.Order_PKO_DetailID = {Order_PKO_DetailID}  ),0)
      Where Order_PKO_DetailID = {Order_PKO_DetailID};

      Update Order_PKO set Delivered_Qty = isnull(tmp.Qty,0)
      From Order_PKO o with(NoLock,NoWait)
      Left Outer Join (
         Select d.Order_PKOID, sum(isnull(d.Delivered_Cartons,0) * isnull(d.Unit_Qty,0)) as Qty
        From Order_PKO_Detail d with(NoLock,NoWait)
        Where d.Order_PKOID = {Order_PKOID}
        Group by d.Order_PKOID
      ) tmp on o.Order_PKOID = tmp.Order_PKOID
      Where o.Order_PKOID = {Order_PKOID}
   End

   if(@ROWCOUNT > 0 )
   Begin
      Update [dbo].[Product_Out] Set UserID = isnull(UserID, N'${req.UserID}')
      , Data_Updater = N'${req.UserID}'
      , Data_Update = GetDate()
      where Product_Out_No = {Product_Out_No};
   End
   `, req.body);
   //console.log(strSQL)
   db.sql(req.SiteDB, strSQL)
      .then((result) => {
         //console.log(result.recordsets[0])
         res.send({Flag: result.recordsets[0][0].Flag > 0, Check_Product_WarehouseID: result.recordsets[0][0].Check_Product_WarehouseID});
      }).catch((err) => {
         console.log(err);
         res.status(500).send(err);
      })

});

//Get Product_Packing_Info
router.post('/Product_Packing_Info',  function (req, res, next) {
   console.log("Call Product_Packing_Info Api:",req.body);

   req.body.Product_PackingID = req.body.Product_PackingID ? req.body.Product_PackingID : 0;
   
   req.body.Brand = req.body.Brand ? `${req.body.Brand.trim().substring(0,30).replace(/'/g, '')}` : '';
   req.body.Packing_Code = req.body.Packing_Code ? `${req.body.Packing_Code.trim().substring(0,13).replace(/'/g, '')}` : '';

   //Mode == 0 Get Product_Packing Data
   //Mode == 1 Get Product_Packing_Detail Data

   var strSQL = format(`
   Declare @Mode int = {Mode}
   Declare @Product_PackingID int = {Product_PackingID}
      
   --0 Get Product_Packing Data
   if(@Mode = 0)
   Begin
      Select o.[Product_PackingID]
      , o.[Brand]
      , o.[Packing_Code]
      , o.[Unit_Qty]
      , o.[UserID]
      , convert(varchar(20),o.[Create_Date],120) as [Create_Date]
      , o.[Data_Updater]
      , convert(varchar(20),o.[Data_Update],120) as [Data_Update]
      --, cast((case when (Select Count(*) From Product_Stock ps with(NoLock,NoWait) Where o.[Product_PackingID] = ps.[Product_PackingID]) = 0 then 1 else 0 end) as bit) as Edit_Flag
      , 1 as Edit_Flag
      from Product_Packing o with(NoLock,NoWait)
      Where (N'{Brand}' = 'All' or o.[Brand] like N'%{Brand}%')      
      And (N'{Packing_Code}' = '' or o.[Packing_Code] like N'%{Packing_Code}%');
   End
   
   --1 Get Product_Packing_Detail Data
   if(@Mode = 1)
   Begin
      Select row_number() Over(Order By c.[Product_Packing_DetailID]) as RecNo
      ,[Product_Packing_DetailID]
      ,[Product_PackingID]
      ,[Size]
      , (Select Rtrim([Size_Name]) as Size_Name From Product_Size ps with(NoLock,NoWait) Where ps.SizeID = c.Size) as [Size_Name]
      ,[Qty]
      from Product_Packing_Detail c with(NoLock,NoWait)
      Where Product_PackingID = @Product_PackingID;
   End
   `, req.body);
   //console.log(strSQL)
   db.sql(req.SiteDB, strSQL)
      .then((result) => {
         var DataSet = req.body.Mode == 0 ? {Product_Packing_Info: result.recordsets[0]} : {Product_Packing_Detail_Info: result.recordsets[0]}
         res.send(DataSet);
      }).catch((err) => {
         console.log(err);
         res.status(500).send(err);
      })

});

//Maintain Product_Packing
router.post('/Product_Packing_Maintain',  function (req, res, next) {
   console.log("Call Product_Packing_Maintain Api:",req.body);

   // req.body.Mode === 0 表示新增
   // req.body.Mode === 1 表示修改 
   // req.body.Mode === 2 表示刪除
   req.body.Product_PackingID = req.body.Product_PackingID ? req.body.Product_PackingID : 0; 
   var strSQL = format(`Declare @ROWCOUNT int, @Product_PackingID int = {Product_PackingID}`,req.body)
   switch(req.body.Mode){
      case 0:
         req.body.Brand = req.body.Brand ? `N'${req.body.Brand.toUpperCase().trim().substring(0,30).replace(/'/g, "''")}'` : `''`;
         req.body.Packing_Code = req.body.Packing_Code ? `N'${req.body.Packing_Code.trim().substring(0,13).replace(/'/g, "''")}'` : `''`; 

         strSQL += format(`
            Insert into [dbo].[Product_Packing] (Brand, Packing_Code, Unit_Qty, UserID, Create_Date, Data_Update, Data_Updater)
            Select {Brand} as Brand, {Packing_Code} as Packing_Code, {Unit_Qty} as [Unit_Qty], N'${req.UserID}' as UserID, GetDate() as [Create_Date], GetDate() as [Data_Update], N'${req.UserID}' as [Data_Updater]
            Where (Select count(*) From Product_Packing Where {Brand} = Brand And {Packing_Code} = Packing_Code) = 0;
            Set @ROWCOUNT = @@ROWCOUNT;
            set @Product_PackingID = scope_identity();
         `, req.body);
         break;
      case 1: 
         var Size = 0;
         switch(req.body.Name){
            case 'Brand':
               Size = 20;
            break;
            case 'Packing_Code':
               Size = 13;
            break;
            default:
            break;
         }
         req.body.Value = Size > 0 ? `N'${req.body.Value.trim().substring(0,Size).replace(/'/g, "''")}'` : req.body.Value;

         strSQL += format(`
            Update [dbo].[Product_Packing] Set [{Name}] = ${Size == 0 ? '{Value}': `substring({Value},1,${Size})`}            
            , Data_Updater = N'${req.UserID}'
            , Data_Update = GetDate()
            where Product_PackingID = @Product_PackingID;
            Set @ROWCOUNT = @@ROWCOUNT;
         `, req.body);
         break;
      case 2:
         strSQL += format(`
            Delete FROM [dbo].[Product_Packing] 
            where Product_PackingID = @Product_PackingID             
            --And (Select count(*) From Product_Stock ps with(NoLock,NoWait) Where ps.[Product_PackingID] = {Product_PackingID}) = 0; 
            Set @ROWCOUNT = @@ROWCOUNT;
         `, req.body);
         break;
   }

   strSQL += format(`
   Select @ROWCOUNT as Flag, @Product_PackingID as Product_PackingID;
   `, req.body);
   //console.log(strSQL)
   db.sql(req.SiteDB, strSQL)
      .then((result) => {
         //console.log(result.recordsets[0])
         var datset = result.recordsets[0][0];
         res.send({Flag:datset.Flag > 0, Product_PackingID: datset.Product_PackingID});
      }).catch((err) => {
         console.log(err);
         res.status(500).send(err);
      })

});

//Maintain Product_Packing_Detail
router.post('/Product_Packing_Detail_Maintain',  function (req, res, next) {
   console.log("Call Product_Packing_Detail_Maintain Api:",req.body);

   // req.body.Mode === 0 表示新增
   // req.body.Mode === 1 表示修改
   // req.body.Mode === 2 表示刪除   
   req.body.Product_PackingID = req.body.Product_PackingID ? req.body.Product_PackingID : 0; 
   
   var strSQL = format(`Declare @ROWCOUNT int = 0, @Mode int = {Mode} `, req.body);

   switch(req.body.Mode){      
      case 0:         
         req.body.Size = req.body.Size ? req.body.Size : 0;
         req.body.Qty = req.body.Qty ? req.body.Qty : 0;
         strSQL += format(`
         INSERT INTO [dbo].[Product_Packing_Detail] ([Product_PackingID], [Size], [Qty])
         Select {Product_PackingID} as [Product_PackingID], {Size} as [Size], {Qty} as [Qty]
         --Where (Select count(*) From Product_Stock ps with(NoLock,NoWait) Where ps.[Product_PackingID] = {Product_PackingID}) = 0
         Set @ROWCOUNT = @@ROWCOUNT;
         `, req.body);
      break;
      case 1:
         strSQL += format(`
         Update [dbo].[Product_Packing_Detail] Set [{Name}] = {Value}
         where Product_Packing_DetailID = {Product_Packing_DetailID}
         --And (Select count(*) From Product_Stock ps with(NoLock,NoWait) Where ps.[Product_PackingID] = {Product_PackingID}) = 0;
         Set @ROWCOUNT = @@ROWCOUNT;
        `, req.body);
      break;
      case 2:         
         strSQL += format(`
         Delete FROM [dbo].[Product_Packing_Detail] 
         where Product_Packing_DetailID = {Product_Packing_DetailID} 
         --And (Select count(*) From Product_Stock ps with(NoLock,NoWait) Where ps.[Product_PackingID] = {Product_PackingID}) = 0;           
         Set @ROWCOUNT = @@ROWCOUNT;
        `, req.body);
      break;
   }

   strSQL += format(`
   Select @ROWCOUNT as Flag;

   if(@ROWCOUNT > 0 )
   Begin
      Update [dbo].[Product_Packing] Set UserID = isnull(UserID, N'${req.UserID}')
      , Data_Updater = N'${req.UserID}'
      , Data_Update = GetDate()
      where Product_PackingID = {Product_PackingID};
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

//Get Product_Stock_List
router.post('/Product_Stock_List',  function (req, res, next) {
   console.log("Call Product_Stock_List Api:");
   
   req.body.Product_No = req.body.Product_No ? `${req.body.Product_No.trim().substring(0,25).replace(/'/g, '')}` : ``;
   req.body.Produce_No = req.body.Produce_No ? `${req.body.Produce_No.trim().substring(0,20).replace(/'/g, '')}` : ``;
   req.body.Product_Warehouse_RankID = req.body.Product_Warehouse_RankID ? `${req.body.Product_Warehouse_RankID}` : ``;
   req.body.PKO_No = req.body.PKO_No ? `${req.body.Packing_Code.trim().substring(0,20).replace(/'/g, '')}` : ``;

   var strSQL = format(`
   SELECT Top 1000 row_number() Over(Order By o.Product_No desc) as RecNo
   , r.[Rank_Name]
   , o.[Product_No]
   , o.[Produce_No]
   , p.[PKO_No]
   , o.[Cartons]
   , (Select case when o.[Size] = 0 then '-' else rtrim(s.Size_Name) end From Product_Size s Where SizeID = o.[Size]) as [Size]
   , o.[Stock_QTY]
   , convert(varchar(20) ,o.[Update_Date] ,120) as [Update_Date]
   FROM [dbo].[Product_Stock] o With(Nolock,NoWait)
   Inner Join Product_Warehouse_Rank r with(NoLock,NoWait) on o.Product_Warehouse_RankID = r.Product_Warehouse_RankID
   Left Outer Join Order_PKO_Detail pd with(NoLock,NoWait) on o.Order_PKO_DetailID = pd.Order_PKO_DetailID
   Left Outer Join Order_PKO p with(NoLock,NoWait) on p.Order_PKOID = pd.Order_PKOID And o.Product_No = p.Product_No
   where (N'{Product_No}' = '' or o.[Product_No] like N'{Product_No}%')
   And (N'{Produce_No}' = '' or o.[Produce_No] like N'{Produce_No}%')
   And (N'{PKO_No}' = '' or p.[PKO_No] like N'%{PKO_No}%')
   And (N'{Product_Warehouse_RankID}' = '' or r.[Product_Warehouse_RankID] = N'{Product_Warehouse_RankID}')
   And o.[Stock_QTY] > 0
   Order By o.Product_No desc, o.[Produce_No], p.[PKO_No]
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

//Check Packing_List Shipment_No
router.post('/Check_Shipment',  function (req, res, next) {
   console.log("Call Check_Shipment_No Api:",req.body);

   req.body.Shipment_No = req.body.Shipment_No ? `${req.body.Shipment_No.trim().substring(0,18).replace(/'/g, '')}` : '';

   var strSQL = format(`
   SELECT Count(*) as RecCount
   FROM [dbo].[PDSP_Packing] With(Nolock,NoWait)
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

//Get PDSP_Packing data for Packing List
router.post('/Packing_List',  function (req, res, next) {
   console.log("Call Packing_List Api:", req.body);
   req.body.PDSP_PackingID = req.body.PDSP_PackingID ? req.body.PDSP_PackingID : 0;
   req.body.Product_Out_No = req.body.Product_Out_No ? req.body.Product_Out_No : 0;
   req.body.Brand = req.body.Brand ? `${req.body.Brand.trim().substring(0,30).replace(/'/g, '')}` : '';
   req.body.Shipment_No = req.body.Shipment_No ? `${req.body.Shipment_No.trim().substring(0,18).replace(/'/g, '')}` : '';
   req.body.PKO_No = req.body.PKO_No ? `${req.body.PKO_No.trim().substring(0,20).replace(/'/g, '')}` : '';   
   req.body.Order_No = req.body.Order_No ? `${req.body.Order_No.trim().substring(0,18).replace(/'/g, '')}` : '';   
   req.body.Product_No = req.body.Product_No ? `${req.body.Product_No.trim().substring(0,25).replace(/'/g, '')}` : '';   
   req.body.Ref_No = req.body.Ref_No ? `${req.body.Ref_No.trim().substring(0,20).replace(/'/g, '')}` : '';   
   req.body.Shipping_Date = req.body.Shipping_Date ? `${req.body.Shipping_Date}` : '';   
   req.body.Destination = req.body.Destination ? `${req.body.Destination.trim().substring(0,30).replace(/'/g, '')}` : '';   
   req.body.UserID = req.body.UserID ? `${req.body.UserID.trim().substring(0,255).replace(/'/g, '')}` : '';
   req.body.Date = req.body.Date ? `${req.body.Date.trim().substring(0,10).replace(/'/g, '')}` : '';

   var strSQL = format(`
   Declare @TmpTable Table (PDSP_PackingID int, Brand nvarchar(30), Shipment_No nvarchar(18), UserID nvarchar(255), Date nvarchar(20) )

   Insert @TmpTable
   SELECT pp.[PDSP_PackingID]
   , pp.[Brand]
   , pp.[Shipment_No]   
   , pp.[UserID]
   , convert(varchar(20) ,pp.[Date] ,120) as [Date]
   FROM [dbo].[PDSP_Packing] pp With(Nolock,NoWait)
   where ({PDSP_PackingID} = 0 or pp.PDSP_PackingID = {PDSP_PackingID})
   And (N'{Brand}' = '' or pp.[Brand] like N'%{Brand}%')
   And (N'{Shipment_No}' = '' or pp.[Shipment_No] like N'%{Shipment_No}%')
/*   
   or Exists (
      Select op.* 
      From Product_Out po with(NoLock,NoWait)
      Inner Join Order_PKO op with(NoLock,NoWait) on po.Order_PKOID = op.Order_PKOID
      Where po.PDSP_PackingID = pp.PDSP_PackingID
      And ({Product_Out_No} = 0 or po.Product_Out_No = {Product_Out_No})
      And (N'{PKO_No}' = '' or op.PKO_No = N'{PKO_No}')
      And (N'{Order_No}' = '' or op.Order_No = N'{Order_No}')
      And (N'{Product_No}' = '' or op.Product_No = N'{Product_No}')
      And (N'{Ref_No}' = '' or op.Ref_No = N'{Ref_No}')
      And ('{Shipping_Date}' = '' or convert(varchar(10), op.Shipping_Date,120) Like '{Shipping_Date}%')
      And ('{Destination}' = '' or op.Destination Like '{Destination}%')
      
   )
*/   
   And (N'{UserID}' = '' or pp.[UserID] like N'%{UserID}%')
   And ('{Date}' = '' or convert(varchar(10), pp.[Date],120) Like '{Date}%' );

   SELECT Top 1000 row_number() Over(Order By pp.PDSP_PackingID desc) as RecNo
   , pp.[PDSP_PackingID]
   , pp.[Brand]
   , pp.[Shipment_No]   
   , pp.[UserID]
   , pp.[Date]
   FROM @TmpTable pp;
/*
   Select po.PDSP_PackingID, po.Product_Out_No, op.PKO_No, op.Order_No, op.Product_No, op.Ref_No
   , convert(varchar(10), op.[Shipping_Date] ,111) as [Shipping_Date], op.Destination
   , op.Qty, op.Delivered_Qty
   From @TmpTable t
   Inner Join Product_Out po with(NoLock,NoWait) on t.PDSP_PackingID = po.PDSP_PackingID
   Inner Join Order_PKO op with(NoLock,NoWait) on po.Order_PKOID = op.Order_PKOID;
   */

   `, req.body) ;
   //console.log(strSQL)
   db.sql(req.SiteDB, strSQL)
      .then((result) => {
         var DataSet = result.recordsets[0]
         // DataSet.forEach((item)=>{
         //    item.Product_Out_Info = result.recordsets[1].filter((obj)=>(item.PDSP_PackingID == obj.PDSP_PackingID))
         // })
         res.send(DataSet);
      }).catch((err) => {
         console.log(err);
         res.status(500).send(err);
      })

});

//Get PDSP_Packing data for Packing List
router.post('/Packing_List_Info',  function (req, res, next) {
   console.log("Call Packing_List_Info Api:", req.body);

   req.body.Mode = req.body.Mode ? req.body.Mode : 0;
   req.body.PDSP_PackingID = req.body.PDSP_PackingID ? req.body.PDSP_PackingID : 0;

   var strSQL = format(`Declare @Mode int = {Mode}, @PDSP_PackingID int = {PDSP_PackingID}
   
   if(@Mode = 0 or @Mode = 1)
   Begin
      SELECT p.PDSP_PackingID
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
      --, (Select Name From Customer_Contacts m Where m.ContactID = p.Invoice_ToID ) as Invoice_To_Name
      , p.Invoice_To, p.Invoice_To_Address
      , isnull(p.Buyer_Title, 'CONSIGNEE') as Buyer_Title
      , p.BuyerID
      , (Select Name From Customer_Contacts m Where m.ContactID = p.BuyerID ) as Buyer_Name
      , p.Buyer, p.Buyer_Address
      , isnull(p.Notify_Party_Title,'NOTIFY PARTY') as Notify_Party_Title
      , p.Notify_PartyID
      , (Select Name From Customer_Contacts m Where m.ContactID = p.Notify_PartyID ) as Notify_Party_Name
      , p.Notify_Party, p.Notify_Party_Address
      , p.Beneficiary
      , p.Advising_Bank
      , (Select top 1 b.S_Name From Bank b with(NoLock,NoWait) Where b.BankID = p.Advising_Bank) as Advising_Bank_Name
      , p.Comment, p.Term_Price, p.Commodity
      , p.Forwarder, p.Cartons, p.Measurement, p.Container
      , isnull( p.F_Vessel,'') as F_Vessel, case when p.F_ETD is null then '' else Convert(varchar(10),p.F_ETD,111) end as F_ETD
      , isnull(p.S_Port,'') as S_Port, isnull(p.T_Port,'') as T_Port
      , isnull( p.M_Vessel,'') as M_Vessel, case when p.M_ETD is null then '' else Convert(varchar(10),p.M_ETD,111) end as M_ETD
      , isnull(p.Destination,'') as Destination
      , (case when p.M_ETA is null then '' else Convert(varchar(10),p.M_ETA,111) end) as M_ETA	
      , p.Data_Updater
      , convert(varchar(20) ,p.[Data_Update] ,120) as [Data_Update]
      , isnull(p.Memo,'') as Memo
      , isnull(p.Carton_NW,0) as Carton_NW
      , isnull(p.Carton_GW,0) as Carton_GW
      FROM [dbo].[PDSP_Packing] p With(Nolock,NoWait)
      Left outer Join [@Currency_Rate] po on p.PO_currency = po.Currency and po.Exchange_Date = Convert(Date, p.Date)
      where p.PDSP_PackingID = @PDSP_PackingID;
   End

   if(@Mode = 0 or @Mode = 2)
   Begin
      Declare @TmpTable table(Product_Out_No int, PDSP_PackingID int, PKO_No nvarchar(20), Ref_No nvarchar(20), Order_Detail_RefID int
      , Destination nvarchar(30), Shipping_Date Nvarchar(10), Qty float, Delivered_Qty float, Cartons float)

      Insert @TmpTable
      Select po.Product_Out_No
      , po.PDSP_PackingID
      , op.PKO_No
      , r.Ref_No
      , op.Order_Detail_RefID
      , op.Destination
      , convert(varchar(10), op.[Shipping_Date] ,111) as [Shipping_Date]
      , sum(isnull(pd.Unit_Qty,0) * isnull(pod.Cartons,0)) as Qty
      , op.Delivered_Qty
      , sum(isnull(pod.Cartons,0)) as Cartons
      From Product_Out po with(NoLock,NoWait)
      Inner Join Product_Out_Detail pod with(NoLock, NoWait) on po.Product_Out_No = pod.Product_Out_No
      Inner Join Order_PKO_Detail pd with(NoWait,NoLock) on pd.Order_PKO_DetailID = pod.Order_PKO_DetailID
      Inner Join Order_PKO op with(NoLock,NoWait) on op.Order_PKOID = pd.Order_PKOID
      Inner Join Order_Detail_Ref r with(NoLock,NoWait) on op.Order_Detail_RefID = r.Order_Detail_RefID
      Where po.PDSP_PackingID = @PDSP_PackingID
      Group by po.Product_Out_No, po.PDSP_PackingID, op.PKO_No
      , r.Ref_No, op.Order_Detail_RefID, op.Destination
      , op.[Shipping_Date], op.Delivered_Qty;

      Select distinct p.*, od.Order_No, od.Product_No
      From @TmpTable p
      Inner Join Order_Detail od with(NoLock, NoWait) on p.Order_Detail_RefID = od.Order_Detail_RefID;

   End
   `, req.body) ;
   // console.log(strSQL)
   db.sql(req.SiteDB, strSQL)
      .then((result) => {
         var DataSet = { Packing_List_Info: (req.body.Mode == 0 || req.body.Mode == 1) ? result.recordsets[0] : [],
            Detail_Info: (req.body.Mode == 0) ? result.recordsets[1] : (req.body.Mode == 2) ? result.recordsets[0]: []
         }
         res.send(DataSet);
      }).catch((err) => {
         console.log(err);
         res.status(500).send(err);
      })

});

//Maintain PDSP_Packing data
router.post('/PDSP_Packing_Maintain',  function (req, res, next) {
   console.log("Call PDSP_Packing_Maintain Api:",req.body);

   // req.body.Mode === 0 表示新增 PDSP_Packing
   // req.body.Mode === 1 表示修改 PDSP_Packing 資料
   // req.body.Mode === 2 表示刪除 PDSP_Packing 資料
   // req.body.Mode === 3 表示將Product Out 加入 PDSP_Packing
   // req.body.Mode === 4 表示將Product Out 移出 PDSP_Packing
   // req.body.Mode === 5 表示將Product Out的Packing Net and Gross Weight
   req.body.PDSP_PackingID = req.body.PDSP_PackingID ? req.body.PDSP_PackingID : null; 
   
   var strSQL = format(`Declare @ROWCOUNT int, @Mode int = {Mode}, @PDSP_PackingID int = {PDSP_PackingID}, @Carton_NW float = 0, @Carton_GW float = 0, @Meas float = 0`, req.body);
   switch(req.body.Mode){
      case 0:
         req.body.Brand = req.body.Brand ? `N'${req.body.Brand.trim().substring(0,30).replace(/'/g, "''")}'` : `''`;        
         req.body.Shipment_No = req.body.Shipment_No ? `N'${req.body.Shipment_No.trim().substring(0,18).replace(/'/g, "''")}'` : `''`; 
         req.body.Date = req.body.Date ? `${req.body.Date.trim().substring(0,10).replace(/'/g, '')}` : moment().format('YYYY/MM/DD');
         req.body.PO_Currency = req.body.PO_Currency ? `N'${req.body.PO_Currency.trim().substring(0,4).replace(/'/g, "''")}'` : `'USD'`; 
      
         strSQL += format(`
            Insert into [dbo].[PDSP_Packing] (Brand, Shipment_No, PO_Currency, Date, UserID, Data_Updater, Data_Update)
            Select {Brand} as Brand
            , {Shipment_No} as Shipment_No
            , {PO_Currency} as PO_Currency
            , '{Date}' as Date
            , N'${req.UserID}' as UserID
            , N'${req.UserID}' as Data_Updater
            , GetDate() as Data_Update
            Set @PDSP_PackingID = scope_identity();

            Set @ROWCOUNT = @@ROWCOUNT;
         `, req.body);
      break;
      case 1:
         var Size = 0;
         switch(req.body.Name){
            case 'Shipment_No':
               Size = 18;
            break;
            case 'Date':
            case 'F_ETD':
            case 'M_ETD':
            case 'M_ETA':
            case 'Beneficiary':
               Size = 10;
            break;
            case 'FactoryID':
            case 'Measurement':
               Size = 15;
            break;
            case 'Attn':
               Size = 20;
            break;
            case 'Brand':
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
            case 'Memo':
            case 'Container':
               Size = 65535;
            break;
            case 'MessrsID':
               req.body.Messrs = req.body.Messrs ?  `N'${req.body.Messrs.trim().substring(0,100).replace(/'/g, "''")}'` : `''`; 
               req.body.Messrs_Address = req.body.Messrs_Address ?  `N'${req.body.Messrs_Address.trim().substring(0,150).replace(/'/g, "''")}'` : `''`; 
               Size = 15;
            break;
            case 'Invoice_ToID':
               req.body.Invoice_To = req.body.Invoice_To ?  `N'${req.body.Invoice_To.trim().substring(0,100).replace(/'/g, "''")}'` : `''`; 
               req.body.Invoice_To_Address = req.body.Invoice_To_Address ?  `N'${req.body.Invoice_To_Address.trim().substring(0,150).replace(/'/g, "''")}'` : `''`; 
               Size = 15;
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
         req.body.Value = Size == 0 ? (req.body.Value ? req.body.Value : null) : (req.body.Value ? `N'${req.body.Value.trim().replace(/'/g, "''")}'` : `''`);

         strSQL += format(`
            Update [dbo].[PDSP_Packing] Set [{Name}] = ${Size == 0 ? '{Value}': `substring({Value},1,${Size})`}
            ${ req.body.Name === 'MessrsID' ? `,Messrs = {Messrs}, Messrs_Address = {Messrs_Address} 
            --,BuyerID = null, Buyer = null, Buyer_Address = null
            ,Invoice_ToID = ${Size == 0 ? '{Value}': `substring({Value},1,${Size})`}, Invoice_To = {Messrs}, Invoice_To_Address = {Messrs_Address} 
            --,Notify_PartyID = null, Notify_Party = null, Notify_Party_Address = null 
            ` : "" }
            ${ req.body.Name === 'Notify_PartyID' ? `,Notify_Party = {Notify_Party}, Notify_Party_Address = {Notify_Party_Address}` : "" }
            ${ req.body.Name === 'Invoice_ToID' ? `,Invoice_To = {Invoice_To}, Invoice_To_Address = {Invoice_To_Address}` : "" }
            ${ req.body.Name === 'BuyerID' ? `,Buyer = {Buyer}, Buyer_Address = {Buyer_Address}` : "" }

            where PDSP_PackingID = @PDSP_PackingID;

            Set @ROWCOUNT = @@ROWCOUNT;
         `, req.body);         
      break;
      case 2:
         strSQL += format(`
            Delete From [dbo].[PDSP_Packing] 
            Where PDSP_PackingID = @PDSP_PackingID;

            Set @ROWCOUNT = @@ROWCOUNT;
         `, req.body);
      break;
      case 3:
      case 4:
         req.body.Product_Out_No = req.body.Product_Out_No ? req.body.Product_Out_No : null; 
         strSQL += format(`
            Update [dbo].[Product_Out] Set PDSP_PackingID = ${req.body.Mode == 3 ? '{PDSP_PackingID}': 'null' }            
            where Product_Out_No = {Product_Out_No}; 

            Set @ROWCOUNT = @@ROWCOUNT;
         `, req.body);
      break;
      case 5:
         strSQL += format(`
         Declare @Order_PKO Table(Style_No varchar(20), Order_PKO_DetailID int, PK_MATL_WT float, Cartons float);
         Declare @Product_Size_Match Table(Style_No varchar(20), Size float, Net_Weight float);

         Insert @Order_PKO
         Select distinct p.Style_No, tmp.Order_PKO_DetailID, tmp.PK_MATL_WT, tmp.Cartons
         From( 
            Select op.Order_Detail_RefID, opd.Order_PKO_DetailID, isnull(opd.PK_MATL_WT,0) as PK_MATL_WT, sum(opd.Cartons) as Cartons
            From Product_Out po with(NoLock, NoWait)
               Inner Join Product_Out_Detail pod with(NoLock, NoWait) on po.Product_Out_No = pod.Product_Out_No
            Inner Join Order_PKO_Detail opd with(Nolock, NoWait) on opd.Order_PKO_DetailID = pod.Order_PKO_DetailID
            Inner Join Order_PKO op with(Nolock, NoWait) on op.Order_PKOID = opd.Order_PKOID
            Where po.PDSP_PackingID = @PDSP_PackingID
            Group by op.Order_Detail_RefID, opd.Order_PKO_DetailID, opd.PK_MATL_WT
         ) tmp
         Inner Join Order_Detail od with(NoLock,NoWait) on tmp.Order_Detail_RefID = od.Order_Detail_RefID
         Inner Join Product p on p.Product_No = od.Product_No;

         Insert @Product_Size_Match
         Select tmp.Style_No, m.Shoe_Size , Net_Weight
         From ( Select distinct Style_No From @Order_PKO ) tmp
         Inner Join Product_Size_Match m on m.Style_No = tmp.Style_No; 

         Select @Carton_NW = Sum(tmp.Cartons * round(tmp.Carton_NW,2))
         , @Carton_GW = Sum(tmp.Cartons * (round(tmp.Carton_NW,2) + tmp.PK_MATL_WT))
         From
         (Select opd.Order_PKO_DetailID, opd.Cartons, opd.PK_MATL_WT
            , sum(isnull(m.Net_Weight,0) * isnull(oq.Qty,0)) as Carton_NW
            From @Order_PKO opd
            Inner Join Order_PKO_Detail_Qty oq on opd.Order_PKO_DetailID = oq.Order_PKO_DetailID
            Left Outer Join @Product_Size_Match m on m.Style_No = opd.Style_No And m.Size = oq.Size
            Group by opd.Order_PKO_DetailID, opd.Cartons, opd.PK_MATL_WT) tmp;

         Select @Meas = SUM(Round(((opd.CL * opd.CW * opd.CH ) / 1000000),3) * isnull(op.Cartons,0))
         From @Order_PKO op
         Inner Join Order_PKO_Detail opd with(Nolock, NoWait) on opd.Order_PKO_DetailID = op.Order_PKO_DetailID
         Set @ROWCOUNT = 1;
         `, req.body);
      break;
   }

   strSQL += format(`
   set @Carton_NW = round(@Carton_NW*100,0)/100;
   set @Carton_GW = round(@Carton_GW*100,0)/100;
   set @Meas = round(@Meas*10000,0)/10000;

   Select @ROWCOUNT as Flag, @PDSP_PackingID as PDSP_PackingID, @Carton_NW as Carton_NW, @Carton_GW as Carton_GW, @Meas as Meas;

   if(@ROWCOUNT > 0 And (@Mode <> 0 or @Mode <> 2))
   Begin      
      Update [dbo].[PDSP_Packing] set Data_Update = GetDate(), Data_Updater = N'${req.UserID}'
      ${req.body.Mode == 5 ? ',Carton_NW = @Carton_NW, Carton_GW = @Carton_GW, Measurement = @Meas':''}
      Where PDSP_PackingID = @PDSP_PackingID;
   End
   `, req.body);
   //console.log(strSQL)
   db.sql(req.SiteDB, strSQL)
      .then((result) => {
         //console.log(result.recordsets[0])
         res.send({Flag:result.recordsets[0][0].Flag > 0
            , PDSP_PackingID: result.recordsets[0][0].PDSP_PackingID
            , Carton_NW: result.recordsets[0][0].Carton_NW
            , Carton_GW: result.recordsets[0][0].Carton_GW
            , Meas: result.recordsets[0][0].Meas
         });
      }).catch((err) => {
         console.log(err);
         res.status(500).send(err);
      })

});

//Get Packing List Detail add Data (成品出貨包裝細項)
router.post('/Detail_Add_List',  function (req, res, next) {
   console.log("Call Detail_Add_List Api:");
   req.body.PDSP_PackingID = req.body.PDSP_PackingID ? req.body.PDSP_PackingID : 0; 

   var strSQL = format(`
   Select distinct cast(0 as bit) as flag, po.Product_Out_No, op.PKO_No, od.Order_No, od.Product_No, r.Ref_No
   , op.Destination, convert(varchar(10), op.[Shipping_Date] ,111) as [Shipping_Date]
   , op.Qty, op.Delivered_Qty
   , '' as Query
   From Product_Out po with(NoLock,NoWait) 
   Inner Join Order_PKO op with(NoLock,NoWait) on po.Order_PKOID = op.Order_PKOID
   Inner Join Order_Detail od with(NoLock,NoWait) on op.Order_Detail_RefID = od.Order_Detail_RefID 
   Inner Join Order_Detail_Ref r with(NoLock,NoWait) on op.Order_Detail_RefID = r.Order_Detail_RefID
   Inner Join Orders o with(NoLock,NoWait) on od.Order_No = o.Order_No
   Where po.PDSP_PackingID is null
   And o.Brand = (Select Brand From PDSP_Packing pp with(NoLock,NoWait) Where pp.PDSP_PackingID = {PDSP_PackingID} );
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
   , Style_No varchar(20), CCC_Code varchar(15), Shoe_Name varchar(100), Product_No varchar(25), Color_Code Nvarchar(120), Customer_Product_No Nvarchar(50)
   , Shipping_Date varchar(10)
   , Detail_Remark_Title nvarchar(50)
   , Packing_No_Title nvarchar(50)
   , Ref_No_Title nvarchar(50)
   , Order_No_Title nvarchar(50)
   , Destination nvarchar(50)
   , Category nvarchar(30)
   , Gender nvarchar(30)
   , Main_Material nvarchar(Max)
   , Main_Mark nvarchar(Max)
   , Side_Mark nvarchar(Max)
   , Memo nvarchar(Max)
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
   , op.Main_Mark
   , op.Side_Mark
   , op.Memo
   From Order_PKO op with(NoLock, NoWait)
   Inner Join Order_Detail od with(NoLock,NoWait) on op.Order_Detail_RefID = od.Order_Detail_RefID 
   Inner Join Order_Detail_Ref r with(NoLock,NoWait) on op.Order_Detail_RefID = r.Order_Detail_RefID
   Inner Join [Orders] o with(NoLock, NoWait) on o.Order_No = od.Order_No
   Inner Join Product p with(NoLock, NoWait) on od.Product_No = p.Product_No
   Inner Join Style s with(NoLock, NoWait) on s.Style_No = p.Style_No
   Where op.Order_PKOID in (Select distinct Order_PKOID From @Order_PKO_Detail )
   Order by od.Order_No, r.Ref_No, op.PKO_No;

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
         Order By p.Order_No, p.Ref_No, p.PKO_No, p.Product_No ;

         --5 PKO Main_Mark, Side_Mark, Memo
         Select distinct Order_PKOID, Main_Mark, Side_Mark, Memo
         FROM @Order_PKO p
      
          `, req.body );
      break;
      case '3':
      case '4':
      case '5':
         strSQL += format(` 
      
         Declare @Order_Qty Table(Order_DetailID int, Order_No varchar(20), Order_Detail_RefID int, Ref_No varchar(20), Product_No varchar(25), Size real, Unit_Price float, Factory_Price float, Qty float);

         Insert @Order_Qty(Order_DetailID, Order_No, Order_Detail_RefID, Ref_No, Product_No, Size, Unit_Price, Factory_Price, Qty)
         Select distinct od.Order_DetailID, od.Order_No, op.Order_Detail_RefID, op.Ref_No, od.Product_No, oq.Size, od.Unit_Price, od.Factory_Price, oq.Qty
         FROM (Select distinct Order_Detail_RefID, Ref_No From @Order_PKO) op
         Inner Join Order_Detail od with(NoLock,NoWait) on od.Order_Detail_RefID = op.Order_Detail_RefID
         Inner Join Order_Qty oq with(NoLock,NoWait) on od.Order_DetailID = oq.Order_DetailID;
      
         Declare @PKO_Qty Table(Order_PKOID int, Size real, Qty float);
      
         Insert @PKO_Qty
         Select tmp.Order_PKOID, pdq.Size, sum(isnull(pdq.Qty,0) * isnull(pd.Cartons,0)) as Qty
         From (Select distinct Order_PKOID From @Order_PKO) tmp
         Inner Join @Order_PKO_Detail pd on tmp.Order_PKOID = pd.Order_PKOID
         Inner Join @Order_PKO_Detail_Qty pdq on pd.Order_PKO_DetailID = pdq.Order_PKO_DetailID
         Group by tmp.Order_PKOID, pdq.Size
         Order by Order_PKOID, Size;
      
         Declare @tmp_Amount Table(Order_PKOID int, Size_Range Nvarchar(20), Unit_Price float, Factory_Price float, Qty float, Amount_O float, Amount_F float)
         Declare @Amount_O float, @Amount_F float, @Expense_O float, @Expense_F float
      
         Insert @tmp_Amount
         Select tmp.Order_PKOID,
         (Select rtrim(ps.Size_Name) From Product_Size ps with(NoLock,NoWait) Where ps.SizeID = tmp.Min_Size) + '~' 
         + (Select rtrim(ps.Size_Name) From Product_Size ps with(NoLock,NoWait) Where ps.SizeID = tmp.Max_Size) as Size_Range         
         , tmp.Unit_Price
         , tmp.Factory_Price
         , tmp.Qty
         , tmp.Amount_O
         , tmp.Amount_F
         From (
         Select op.Order_PKOID         
         , Min(pq.Size) as Min_Size
         , Max(pq.Size) as Max_Size
         , oq.Unit_Price
         , oq.Factory_Price
         , Sum(pq.Qty) as Qty
         , Sum(pq.Qty * oq.Unit_Price) as Amount_O
         , Sum(pq.Qty * oq.Factory_Price) as Amount_F
         from @Order_PKO op
         Inner Join @PKO_Qty pq on op.Order_PKOID = pq.Order_PKOID
         Inner Join @Order_Qty oq on oq.Order_Detail_RefID = op.Order_Detail_RefID And pq.Size = oq.Size
         Group by op.Order_PKOID, oq.Unit_Price, oq.Factory_Price) tmp;
      
         Select @Amount_O = sum(Amount_O), @Amount_F = sum(Amount_F)	From @tmp_Amount
      
          Declare @tmp_Expense Table(Order_PKOID int, Decription Nvarchar(30), Expense_O float, Expense_F float)
      
         Insert @tmp_Expense
         Select op.Order_PKOID, RTrim(ode.Description) AS Decription
         , Sum(oq.[Unit_Price]*ode.[Rate]*pq.Qty) AS Expense_O
         , Sum(oq.Factory_Price *ode.[Rate]*pq.Qty) AS Expense_F
         FROM @Order_PKO op
         Inner Join @PKO_Qty pq on op.Order_PKOID = pq.Order_PKOID
         Inner Join @Order_Qty oq on oq.Order_Detail_RefID = op.Order_Detail_RefID And pq.Size = oq.Size
         INNER JOIN Order_Detail_Expense ode with(NoLock,NoWait) ON oq.Order_DetailID = ode.Order_DetailID 
         Where ode.Doc = 'PI' 
         Group by op.Order_PKOID, ode.Description, ode.Doc
      
         Select @Expense_O = sum(Expense_O), @Expense_F = sum(Expense_F)	From @tmp_Expense;

         --0 Shipment Info
         Select p.PDSP_PackingID
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
         , dbo.RecurseNumber(isnull(@Amount_O,0)) as EngNum_TTL_Amount_O
         , dbo.RecurseNumber(isnull(@Amount_F,0)) as EngNum_TTL_Amount_F
         , @Memo as Memo, @Carton_NW as PL_Carton_NW, @Carton_GW as PL_Carton_GW, @Meas as Meas
         From PDSP_Packing p with(NoLock, NoWait)
         Inner Join Factory s with(NoLock, NoWait) on s.FactoryID = p.FactoryID
         Left outer Join [@Currency_Rate] po on p.PO_currency = po.Currency and po.Exchange_Date = Convert(Date, p.Date)
         left Outer Join Bank b with(NoLock,NoWait) on p.Advising_Bank = b.BankID
         left Outer Join Credit_Accounts ca with(NoLock,NoWait) on ca.AccountID = p.Beneficiary      
         Where 1=1
         ${ req.body.PDSP_PackingID ? ' And p.PDSP_PackingID = @PDSP_PackingID':'' }
         ${ req.body.Shipment_No ? ' And p.Shipment_No = @Shipment_No':'' }
      
         --1 PKO Detail
         Select op.*, tmp.Size_Range
         , isnull(tmp.Unit_Price,0) as Unit_Price
         , isnull(tmp.Factory_Price,0) as Factory_Price
         , isnull(tmp.Qty,0) as Qty
         , isnull(tmp.Amount_O,0) as Amount_O
         , isnull(tmp.Amount_F,0) as Amount_F
         , isnull(tmp_Exp.Expense_O,0) as Expense_O
         , isnull(tmp_Exp.Expense_F,0) as Expense_F
         , (select distinct Produce_No From @Order_PKO_Detail pd where op.Order_PKOID = pd.Order_PKOID) as Produce_No
         From @Order_PKO op
         Left Outer Join @tmp_Amount tmp on op.Order_PKOID = tmp.Order_PKOID
         Left Outer Join @tmp_Expense tmp_Exp on tmp.Order_PKOID = tmp_Exp.Order_PKOID;
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
                  var obj = result.recordsets[5].filter((data)=>(data.Order_PKOID == item.Order_PKOID))
                  item.Main_Mark = obj ? obj[0].Main_Mark:'';
                  item.Side_Mark = obj ? obj[0].Side_Mark:'';
                  item.Memo = obj ? obj[0].Memo:'';
                  item.G_Carton_NW_TTL = Math.round(item.G_Carton_NW_TTL * 10000)/10000;
                  item.G_Carton_GW_TTL = Math.round(item.G_Carton_GW_TTL * 10000)/10000;
                  item.G_Total_Qty = Math.round(item.G_Total_Qty * 10000)/10000;
                  item.G_Total_Cartons = Math.round(item.G_Total_Cartons * 10000)/10000;
                  item.G_Total_Meas = Math.round(item.G_Total_Meas * 1000)/1000;
               }) 

               DataSet.G_Carton_NW_TTL = PL_Carton_NW ? Math.round(PL_Carton_NW*10000)/10000 : Math.round(G_Carton_NW_TTL*10000)/10000;
               DataSet.G_Carton_GW_TTL = PL_Carton_GW ? Math.round(PL_Carton_GW*10000)/10000 : Math.round(G_Carton_GW_TTL*10000)/10000;
               DataSet.G_Total_Qty = G_Total_Qty;
               DataSet.G_Total_Cartons = G_Total_Cartons;
               DataSet.G_Total_Meas = Meas ? Meas : Math.round(G_Total_Meas*1000)/1000;
               //console.log(DataSet.Packing_Detail[0].Packing_Size)
            break;
            case '3':
            case '4':
            case '5':
               DataSet.Packing_Detail = result.recordsets[1];
               DataSet.Packing_Remark = result.recordsets[0][0].Memo;
      
               DataSet.Packing_Detail_Head = [...DataSet.Packing_Detail.reduce((r, e) => {                  
                  let k = `${e.Order_PKOID}`;
                  if (!r.has(k)) {
                    // console.log(r)
                    r.set(k, {
                     Order_PKOID: e.Order_PKOID,
                     Ref_No: e.Ref_No,
                     PKO_No: e.PKO_No,
                     Produce_No: e.Produce_No,
                     Shoe_Name: e.Shoe_Name,
                     Color_Code: e.Color_Code,
                     CCC_Code: e.CCC_Code,
                     Category: e.Category,
                     Gender: e.Gender,
                     Main_Material: e.Main_Material,
                     Product_No: e.Product_No,
                     Customer_Product_No: e.Customer_Product_No,
                     Order_No: e.Order_No,
                     Detail_Remark_Title: e.Detail_Remark_Title,
                     Packing_No_Title: e.Packing_No_Title,
                     Ref_No_Title: e.Ref_No_Title,
                     Order_No_Title: e.Order_No_Title,
                     Destination:e.Destination,
                     Total_Qty: e.Qty,
                     Total_Amount_O: e.Amount_O,
                     Total_Amount_F: e.Amount_F,
                     Total_Expense_O: e.Expense_O,
                     Total_Expense_F: e.Expense_F,                     
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
                  DataSet.G_Total_Amount_O += item.Total_Amount_O;
                  DataSet.G_Total_Amount_F += item.Total_Amount_F;
                  DataSet.G_Total_Expense_O += item.Total_Expense_O;
                  DataSet.G_Total_Expense_F += item.Total_Expense_F;
                  item.Total_Qty = Math.round(item.Total_Qty * 1000)/1000;
                  item.Total_Amount_O = Math.round(item.Total_Amount_O * 1000)/1000;
                  item.Total_Amount_F = Math.round(item.Total_Amount_F * 1000)/1000;
                  item.Total_Expense_O = Math.round(item.Total_Expense_O * 1000)/1000;
                  item.Total_Expense_F = Math.round(item.Total_Expense_F * 1000)/1000;
               }) 

               DataSet.G_Total_Qty = Math.round(DataSet.G_Total_Qty * 1000)/1000;
               DataSet.G_Total_Amount_O = Math.round(DataSet.G_Total_Amount_O * 1000)/1000;
               DataSet.G_Total_Amount_F = Math.round(DataSet.G_Total_Amount_F * 1000)/1000;
               DataSet.G_Total_Expense_O = Math.round(DataSet.G_Total_Expense_O * 1000)/1000;
               DataSet.Total_Expense_F = Math.round(DataSet.Total_Expense_F * 1000)/1000;
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