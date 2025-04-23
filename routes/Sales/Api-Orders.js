var express = require('express');
var router = express.Router();
const format = require('string-format');
var db = require('../../config/DB_Connect');
const cloneDeep = require('lodash/cloneDeep');

/* Mark-Wang API Begin */

//Move Order Detail 
router.post('/Move_Order_Detail', function (req, res, next) {
  console.log("Call Move_Order_Detail Api :");

  req.body.Order_No = req.body.Order_No ? `N'${req.body.Order_No.trim().substring(0,18).replace(/'/g, "''")}'` : `''`; 
  req.body.New_Order_No = req.body.New_Order_No ? `N'${req.body.New_Order_No.trim().substring(0,18).replace(/'/g, "''")}'` : `''`; 
  req.body.Order_DetailID = req.body.Order_DetailID ? req.body.Order_DetailID : [];
  
   var strSQL = format(` Declare @ROWCOUNT int = 0;

   Update Order_Detail set Order_No = {New_Order_No}
   Where Order_No = {Order_No} 
   And Order_DetailID in (${req.body.Order_DetailID})  ;

   Set @ROWCOUNT = @@ROWCOUNT;
   `, req.body );

   strSQL += format(`
    Select @ROWCOUNT as Flag;
  
    if(@ROWCOUNT > 0 )
    Begin
       Update [dbo].[Orders] Set UserID = isnull(UserID, N'${req.UserID}'), Data_Updater = N'${req.UserID}'
       , Data_Update = GetDate()
       where Order_No in ({Order_No}, {New_Order_No});
    End
    `, req.body)    

  //console.log(strSQL);  

  db.sql(req.SiteDB, strSQL)
     .then((result) => {
        res.send({Flag: result.recordsets[0][0].Flag > 0});
     }).catch((err) => {
        console.log(err);
        res.status(500).send(err);
     })

});

//Get Move Order No
router.post('/Move_Order_No', function (req, res, next) {
  console.log("Call Get Move_Order_No Api :");

  req.body.Order_No = req.body.Order_No ? `N'${req.body.Order_No.trim().substring(0,18).replace(/'/g, "''")}'` : `''`; 
  
   var strSQL = format(`
   Select s.Order_No 
   From Orders s 
   Inner Join Orders o on o.Order_No = {Order_No} 
   And o.Season = s.Season 
   And o.Brand = s.Brand
   And o.CustomerID = s.CustomerID
   And o.Currency = s.Currency
   Where s.Order_No <> {Order_No} ;
   `, req.body );

  //console.log(strSQL);  

  db.sql(req.SiteDB, strSQL)
     .then((result) => {
        res.send(result.recordsets[0]);
     }).catch((err) => {
        console.log(err);
        res.status(500).send(err);
     })

});

//Get Order Purpose
router.post('/Order_Purpose', function (req, res, next) {
   console.log("Call Order_Purpose Api :");
   
   // var strSQL = format(`
   // Select Purpose 
   // From Orders s 
   // group by Purpose
   // `, req.body );

   var strSQL = format(`
   Select 'Official' as Purpose
   union
   Select 'Sample' as Purpose    
   `, req.body );

   //console.log(strSQL);  

   db.sql(req.SiteDB, strSQL)
      .then((result) => {
         res.send(result.recordsets[0]);
      }).catch((err) => {
         console.log(err);
         res.status(500).send(err);
      })

});

//Revise Order Size
router.post('/Revise_Order_Size', function (req, res, next) {
   console.log("Call Order Revise_Order_Size Api :", req.body);
   req.body.Order_No = req.body.Order_No ? `N'${req.body.Order_No.trim().substring(0,18).replace(/'/g, "''")}'` : `''`; 

   var strSQL = format(`
   Declare @Order_Size Table (Size real);
   Declare @Order_Qty Table (Size real);
   Declare @RecNo int = 0, @SizeCount int = 0;
   
   Insert @Order_Size 
   Select Size From Order_Size Where Order_No = {Order_No}
   
   Insert @Order_Qty
   Select Size From Order_Qty oq With(NoLock, NoWait) 
   Inner Join Order_Detail od With(NoLock, NoWait) on oq.Order_DetailID = od.Order_DetailID
   Where Order_No = {Order_No}

   Set @SizeCount = (Select count(*) From @Order_Qty oq Left join @Order_Size os on os.Size = oq.Size Where os.Size is null)
   
   if(@SizeCount <> 0)
   Begin
      Insert Order_Size (Order_No, Size, Prerange)
      Select {Order_No} as Order_No, oq.Size, 0 as Prerange
      From @Order_Qty oq
      Left join @Order_Size os on os.Size = oq.Size
      Where os.Size is null
      Group by oq.Size

      Set @RecNo = @@ROWCOUNT
   End   
   Select convert(bit,@RecNo) as Flag
   `
   , req.body );
   //console.log(strSQL);  

   db.sql(req.SiteDB, strSQL)
      .then((result) => {
         res.send({Flag:result.recordset[0].Flag});
      }).catch((err) => {
         console.log(err);
         res.status(500).send(err);
      })

});

//Check Order_No
router.post('/Check_Order_No',  function (req, res, next) {
   console.log("Call Check_Order_No Api:",req.body);

   req.body.Order_No = req.body.Order_No ? `${req.body.Order_No.trim().replace(/'/g, '')}` : '';

   var strSQL = format(` Declare @RecCount int, @LenCounter int;

   Set @LenCounter = Len(N'{Order_No}');

   SELECT @RecCount = Count(*)
   FROM [dbo].[Orders] With(Nolock,NoWait)
   where ([Order_No] = N'{Order_No}');

   Select case when @LenCounter > 18 then @LenCounter else @RecCount end as RecCount;
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

//Get Order_List
router.post('/Order_List',  function (req, res, next) {
   console.log("Call Order List Api:");
   
   req.body.Order_No = req.body.Order_No ? `${req.body.Order_No.trim().substring(0,18).replace(/'/g, '')}` : '';
   req.body.Order_Date = req.body.Order_Date ? `${req.body.Order_Date.trim().substring(0,10)}` : '';
   req.body.Department = req.body.Department ? `${req.body.Department.trim().substring(0,20)}` : '';   
   req.body.CustomerID = req.body.CustomerID ? `${req.body.CustomerID.trim().substring(0,15).replace(/'/g, '')}` : '';
   req.body.Brand = req.body.Brand ? `${req.body.Brand.trim().substring(0,30).replace(/'/g, '')}` : '';
   req.body.Season = req.body.Season ? `${req.body.Season.trim().substring(0,10).replace(/'/g, '')}` : '';
   req.body.Subject = req.body.Subject ? `${req.body.Subject.trim().substring(0,80).replace(/'/g, '')}` : '';
   req.body.PI_No = req.body.PI_No ? `${req.body.PI_No.trim().substring(0,15).replace(/'/g, '')}` : '';
   req.body.RCV_No = req.body.RCV_No ? `${req.body.RCV_No.trim().substring(0,30).replace(/'/g, '')}` : '';
   req.body.Purpose = req.body.Purpose ? `${req.body.Purpose.trim().substring(0,15).replace(/'/g, '')}` : '';
   req.body.Order_ApproveID = req.body.Order_ApproveID ? req.body.Order_ApproveID : '';   
   req.body.UserID = req.body.UserID ? `${req.body.UserID.trim().substring(0,256).replace(/'/g, '')}` : '';

   var strSQL = format(`
   SELECT Top 1000 row_number() Over(Order By o.Order_Date desc) as RecNo
   , o.[Order_No]
   , convert(varchar(10) ,o.[Order_Date] ,111) as [Order_Date]
   , o.[Department]
   , o.[CustomerID]
   , o.[Brand]
   , o.[Season]
   , o.[Subject]
   , o.[PI_No]
   , o.[RCV_No]
   , o.[Purpose]
/*
   , o.[Order_ApproveID]
   , case
         when oa.Approve_Date is not null then 'lock'
         when oa.Approve_First_Date is not null and oa.Approve_Date is null then 'unlock'
         when oa.Approve_First_Date is null and oa.Approve_Date is null then ''
     end as Approve_Flag
*/  
   , o.[UserID]
   FROM [dbo].[Orders] o With(Nolock,NoWait)
   --Left Outer Join Order_Approve oa with(NoLock, NoWait) on oa.[Order_ApproveID] = o.[Order_ApproveID]
   where (N'{Order_No}' = '' or o.[Order_No] like N'%{Order_No}%')
   And (N'{Order_Date}' = '' or convert(varchar(10),o.[Order_Date],111) like N'%{Order_Date}%')
   And (N'{Department}' = '' or o.[Department] like N'{Department}%')
   And (N'{CustomerID}' = '' or o.[CustomerID] like N'%{CustomerID}%')
   And (N'{Brand}' = '' or o.[Brand] like N'%{Brand}%')
   And (N'{Season}' = '' or o.[Season] like N'%{Season}%')
   And (N'{Subject}' = '' or o.[Subject] like N'%{Subject}%')
   And (N'{PI_No}' = '' or o.[PI_No] like N'{PI_No}%')
   And (N'{RCV_No}' = '' or o.[RCV_No] like N'%{RCV_No}%')
   And (N'{Purpose}' = '' or o.[Purpose] like N'%{Purpose}%')
   --And (N'{Order_ApproveID}' = '' or o.[Order_ApproveID] like N'%{Order_ApproveID}%')
   And (N'{UserID}' = '' or o.[UserID] like N'%{UserID}%')
   Order By o.Order_Date desc, o.[CustomerID], o.[Order_No], o.PI_No, o.UserID
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

//Get Order_Json_Info
router.post('/Order_Json_Info',  function (req, res, next) {
   console.log("Call Order_Json_Info Api:",req.body);

   req.body.Order_No = req.body.Order_No ? `N'${req.body.Order_No.trim().substring(0,18).replace(/'/g, "''")}'` : `''`; 

   var strSQL = format(`
   Declare @Order_No varchar(18) = {Order_No};
   Declare @TmpDetail Table (Order_No varchar(18), Order_DetailID int, Factory_ID varchar(15), Product_No varchar(25), Customer_Product_No varchar(25)
   , Orig_Shipping_Date varchar(20)
   , Destination varchar(30)
   , Est_Shipping_Date varchar(20)
   , Qty float, Order_Detail_RefID int, Ref_No varchar(20), PO_No varchar(10)
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
   , od.Qty, od.Order_Detail_RefID, r.Ref_No, od.PO_No
   , od.Produce_No
   , Isnull(od.Unit_Price,0) as Unit_Price
   , Isnull(od.Factory_Price,0) as Factory_Price
   , 0 as Overhead
   , Isnull(od.PCost_Standard,0) as PCost_Standard
   , Isnull(od.PCost_Others,0) as PCost_Others
   , Isnull(od.Est_Process_Cost,0) as Est_Process_Cost
   , Isnull(od.MTR_Declare_Rate,0) as MTR_Declare_Rate
   From Order_Detail od with(nolock,nowait) 
   Inner Join Order_Detail_Ref r with(NoLock,NoWait) on od.Order_Detail_RefID = r.Order_Detail_RefID
   Where od.Order_No = @Order_No;
   
   ---0 Order 
   SELECT Order_No, Purpose, Sample_Purpose, Brand, OrganizationID, isnull(Currency,'USD') as Currency, isnull(PO_Currency,'USD') as PO_Currency, Season, CustomerID, Agent, Sales, Ref_No_Title, Packing_No_Title, Order_No_Title, Remark, UserID 
   FROM Orders o with(nolock,nowait) 
   Where o.Order_No = @Order_No;

   ---1 Order Detail
   SELECT * From @TmpDetail

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

//Get Currency
router.post('/Currency', function (req, res, next) {
   console.log("Call Order Currency Api :", req.body);
   req.body.Order_No = req.body.Search ? req.body.Order_No.replace(/'/g, "''") : '';
   var strSQL = format(`
   Declare @Currency_Date DateTime;

   Select @Currency_Date = case when '{Order_No}' = 'Insert' then GetDate() else isnull((Select Order_Date from Orders Where Order_No = '{Order_No}'),GetDate()) end
   
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

//Check Product_No
router.post('/CheckProduct', function (req, res, next) {
   console.log("Call Product_Info Api CheckProduct:", req.body);
   req.body.Product_No = req.body.Product_No ? `${req.body.Product_No.replace(/'/g, "''")}` : '%';
   req.body.Order_No = req.body.Order_No ? `N'${req.body.Order_No.trim().substring(0,18).replace(/'/g, "''")}'` : `''`;

   var strSQL = format(`SELECT count(*) as Rec
   FROM Product as p WITH (NoWait, Nolock)
   Where (Product_No = N'{Product_No}' ) 
   `, req.body);
 
   //console.log(strSQL)
   db.sql(req.SiteDB, strSQL)
   .then((result)=>{
     //console.log(result.recordset[0].Rec)
     res.send(result.recordset[0].Rec > 0);
   }).catch((err)=>{
     console.log(err);
     res.status(500).send(err);
   })
 });

//Get Prepack
router.post('/Prepack_Info', function (req, res, next) {
   console.log("Call Prepack Api :", req.body);
   req.body.PrepackID = req.body.PrepackID ? `N'${req.body.PrepackID.trim().substring(0,10).replace(/'/g, "''")}'` : `''`; 
   
   //Mode == 0 Get Prepack and Prepack Detail Data
   //Mode == 1 Get Prepack Data
   //Mode == 2 Get Prepack Detail Data
   var strSQL = format(`   
   Declare @Mode int = {Mode}
   Declare @PrepackID Varchar(10) = {PrepackID}

   --0 Prepack
   if(@Mode = 0)
   Begin
      SELECT p.[PrepackID], isnull(p.[Brand],'') as Brand, Qty
      FROM Prepack p with(NoLock, NoWait)
   End

   --1 Prepack Detail
   if(@Mode = 1)
   Begin
      SELECT p.[Prepack_DetailID], p.[PrepackID], ps.[Size_Name] as Size, Qty
      FROM Prepack_Detail p with(NoLock, NoWait)
      Inner Join Product_Size ps with(NoLock, NoWait) on p.Size = ps.SizeID
      Where p.PrepackID = @PrepackID
   End
    `
   , req.body );
   //console.log(strSQL);  

   db.sql(req.SiteDB, strSQL)
      .then((result) => {
         var DataSet = req.body.Mode == 0 ? {Prepack:result.recordsets[0]} : {Prepack_Detail:result.recordsets[0]};
         //console.log(result) 
         //console.log(DataSet) 
         res.send(DataSet);
      }).catch((err) => {
         console.log(err);
         res.status(500).send(err);
      })
});

//Maintain Prepack
router.post('/Prepack_Maintain',  function (req, res, next) {
   console.log("Call Prepack_Maintain Api:",req.body);
   var strSQL = "";

   // req.body.Mode === 0 表示新增
   // req.body.Mode === 1 表示修改 
   // req.body.Mode === 2 表示刪除   
   // req.body.Mode === 3 表示由Prepack 匯入Assortment 與 Assortment Detail 預設一定是混號裝 1 Carton
   req.body.PrepackID = req.body.PrepackID ? `N'${req.body.PrepackID.trim().substring(0,10).replace(/'/g, "''")}'` : `''`; 
   
   if(req.body.Mode === 0 ) {
      req.body.Brand = req.body.Brand ? `N'${req.body.Brand.trim().substring(0,30).replace(/'/g, "''")}'` : `''`; 
   }

   if(req.body.Mode === 1 && 
      (req.body.Name == 'PrepackID' || req.body.Name == 'Brand') 
      ) {
      req.body.Value = req.body.Value ? `N'${req.body.Value.trim().replace(/'/g, "''")}'` : `''`; 
   }

   switch(req.body.Mode){
      case 0:
         strSQL = format(`
         Insert into [dbo].[Prepack] (PrepackID, Brand)
         Select {PrepackID} as PrepackID, {Brand} as Brand; 
         Select @@ROWCOUNT as Flag;
         `, req.body);
         break;
      case 1:        
         strSQL = format(`     
         Update [dbo].[Prepack] Set [{Name}] = {Value}
         where PrepackID = {PrepackID}
         Select @@ROWCOUNT as Flag;
         `, req.body);
         break;
      case 2:
         strSQL = format(`    
         Delete FROM [dbo].[Prepack] 
         where PrepackID = {PrepackID};         
         Select @@ROWCOUNT as Flag;
         `, req.body);      
         break;
      case 3:
         req.body.Produce_No = req.body.Produce_No ? `N'${req.body.Produce_No.trim().substring(0,20).replace(/'/g, "''")}'` : `''`; 

         strSQL = format(`
         Declare @ROWCOUNT int=0
         , @ROWCOUNT1 int=0
         , @ROWCOUNT2 int=0
         , @ROWCOUNT3 int=0
         , @ROWCOUNT4 int=0
         , @Order_ApproveID int
         , @Size_Status int = 2    
         , @AssortmentID int = 0
         Set @Order_ApproveID = (SELECT case when a.Approve_Date is null then 0 else 1 end 
                                  FROM Produce as p WITH (NoWait, Nolock) 
                                  Left Outer Join Order_Approve a WITH (NoWait, Nolock) on p.Order_ApproveID = a.Order_ApproveID 
                                  Where p.Produce_No = {Produce_No})
      
         if(@Order_ApproveID = 0)
         begin
            update Order_Detail set Size_Status = 2
            Where isnull(Size_Status,0) = 0 And Order_DetailID = {Order_DetailID};
            set @ROWCOUNT = @@ROWCOUNT;

            Select @Size_Status = Size_Status 
            from Order_Detail 
            Where Order_DetailID = {Order_DetailID};

            BEGIN TRANSACTION;  
            BEGIN TRY 
               Insert into [dbo].[Assortment] (Order_DetailID, Cartons, PrepackID, Prepack, Unit_Qty, T_Qty)
               Select {Order_DetailID} as Order_DetailID, 1 as Cartons, {PrepackID} as PrepackID, 1 as Prepack, tmpDetail.Qty as Unit_Qty, tmpDetail.Qty as T_Qty
               From Prepack p with(NoLock, NoWait)
               Left outer join (Select PrepackID, Sum(Qty) as Qty From Prepack_Detail pd Where PrepackID = {PrepackID} group by PrepackID) tmpDetail on p.PrepackID = tmpDetail.PrepackID
               Where p.PrepackID = {PrepackID}; 

               set @ROWCOUNT1 = @@ROWCOUNT;
               
               set @AssortmentID = SCOPE_IDENTITY();
               Insert Assortment_Detail ([AssortmentID], [Size], [Qty], [Prerange])
               Select @AssortmentID as AssortmentID, pd.Size, pd.Qty, 0 as Prerange
               From Prepack_Detail pd
               Where pd.PrepackID = {PrepackID}; 

               set @ROWCOUNT2 = @@ROWCOUNT;

               if(@Size_Status = 2) 
               begin            
      
                  Delete from Order_Qty where Order_DetailID = {Order_DetailID};
                  insert Order_Qty(Order_DetailID, Size, Qty, Prerange)
                  Select {Order_DetailID} as Order_DetailID, Size, Sum(Qty) as Qty, Prerange
                  From
                  (Select Size, case when abs(a.Prepack) = 1 then a.Cartons else 1 end * Sum(Qty) as Qty, Prerange
                  From Assortment a
                  Inner Join Assortment_Detail ad on a.AssortmentID = ad.AssortmentID
                  where Order_DetailID = {Order_DetailID}
                  Group by Size, Prerange, a.Prepack, a.Cartons) tmp
                  Group by Size, Prerange;
         
                  set @ROWCOUNT3 = @@ROWCOUNT;
               
                  Insert Order_Size (Order_No, Size)
                  Select {Order_No} as Order_No, t.Size
                  From (
                     Select Size
                     From Order_Detail od with(NoLock, NoWait)
                     inner Join Assortment a with(NoLock, NoWait) on od.Order_DetailID = a.Order_DetailID
                     inner Join Assortment_Detail ad with(NoLock, NoWait) on a.AssortmentID = ad.AssortmentID
                     Where od.Order_No = {Order_No}
                     Group by Size
                  ) t
                  Left outer Join Order_Size os with(NoLock, NoWait) on os.Size = t.Size and os.Order_No = {Order_No}
                  Where os.Size is null
                  set @ROWCOUNT4 = @@ROWCOUNT;
               End
            COMMIT;
            END TRY
            BEGIN CATCH
               ROLLBACK;
            END CATCH      
         end

         Select @Size_Status,  @ROWCOUNT + @ROWCOUNT1 + @ROWCOUNT2 + @ROWCOUNT3 + @ROWCOUNT4 as Flag
         `, req.body);
         break;
   }

   //console.log(strSQL)
   db.sql(req.SiteDB, strSQL)
      .then((result) => {
         //console.log(result)
         var dataset = req.body.Mode != 3 ? {Flag:result.recordsets[0][0].Flag > 0} : {Flag:result.recordsets[0][0].Flag > 0, Size_Status:result.recordsets[0][0].Size_Status };
         res.send(dataset);
      }).catch((err) => {
         console.log(err);
         res.status(500).send(err);
      })

});

//Maintain Prepack Detail
router.post('/Prepack_Detail_Maintain',  function (req, res, next) {
   console.log("Call Prepack_Detail_Maintain Api:",req.body);
   var strSQL = "";

   // req.body.Mode === 0 表示新增
   // req.body.Mode === 1 表示修改 
   // req.body.Mode === 2 表示刪除   
   req.body.PrepackID = req.body.PrepackID ? `N'${req.body.PrepackID.trim().substring(0,10).replace(/'/g, "''")}'` : `''`; 
   
   switch(req.body.Mode){
      case 0:
         strSQL = format(`
         Insert into [dbo].[Prepack_Detail] (PrepackID, Size, Qty)
         Select {PrepackID} as PrepackID, {Size} as Size, {Qty} as Qty;
         Select @@ROWCOUNT as Flag;
         `, req.body);
         break;
      case 1:        
         strSQL = format(`
         Update [dbo].[Prepack_Detail] Set [{Name}] = {Value}
         where Prepack_DetailID = {Prepack_DetailID}
         Select @@ROWCOUNT as Flag;
         `, req.body);
         break;
      case 2:
         strSQL = format(`
         Delete FROM [dbo].[Prepack_Detail]
         where  Prepack_DetailID = {Prepack_DetailID};
         Select @@ROWCOUNT as Flag;
         `, req.body);      
         break;
      }
   // console.log(strSQL)
   db.sql(req.SiteDB, strSQL)
      .then((result) => {
         res.send({Flag:result.recordsets[0][0].Flag > 0});
      }).catch((err) => {
         console.log(err);
         res.status(500).send(err);
      })

});

//Get Order_Info
router.post('/Order_Info',  function (req, res, next) {
   console.log("Call Order_Info Api:",req.body);

   req.body.Order_No = req.body.Order_No ? `N'${req.body.Order_No.trim().substring(0,18).replace(/'/g, "''")}'` : `''`; 
   req.body.QueryData = req.body.QueryData ? `N'${req.body.QueryData.trim().replace(/'/g, "''")}'` : `''`;


   //Mode == 0 Get Order Master and Detail Data
   //Mode == 1 Get Order Master Data
   //Mode == 2 Get Order Detail Data
   var strSQL = format(`

   Declare @Mode int = {Mode}
   Declare @Order_No Varchar(18) = {Order_No}
   
   Declare @TmpTable Table (Order_No varchar(20), Subject nvarchar(80), Season Varchar(10), Department Varchar(20), Order_Date Varchar(20), Agent Varchar(15), CustomerID Varchar(15), Brand Varchar(20), UserID nvarchar(256), Purpose Varchar(15)
   , Order_No_Title varchar(20), Ref_No_Title varchar(20), Packing_No_Title varchar(20), PI_No varchar(15), Payment_Term nvarchar(255), Currency Varchar(4), PO_Currency Varchar(4), Remark nvarchar(1000)
   , RCV_No varchar(30), Data_Updater nvarchar(255), Data_Update Varchar(20))
   
   Declare @TmpDetail Table (Order_No varchar(20), Product_No varchar(25), Product_No_Flag tinyInt, Customer_Product_No varchar(25), CCC_Code varchar(15)
   , Unit_Price float, Commission float, Other_Expense float, Factory_Price float, Est_Process_Cost float, Producing_Cost float
   , PCost_Standard float, PCost_Print float, PCost_Embroidery float, PCost_Wash_Repacking float, PCost_Handmade float, PCost_Outsole_Assembling float, PCost_Double_Lasting float, PCost_Finishing float, PCost_Others float, Overhead float
--   , Orig_Shipping_Date datetime
--   , Est_Shipping_Date Datetime
   , Orig_Shipping_Date varchar(10)
   , Est_Shipping_Date varchar(10)
   , Destination nvarchar(30), Qty float, Order_Detail_RefID int, Ref_No varchar(20), Assortment_Title varchar(20), Packing_OK int
   , Factory_ID varchar(20)
   , Article_Name nvarchar(50), Pattern_No varchar(20), MTR_Declare_Rate float
   , Produce_No varchar(20), Order_ApproveID varchar(max), Approve_Date varchar(20), Approve_First_Date varchar(20), Approve_Flag int
   , Size_Status tinyint, Order_DetailID int
   , PO_No varchar(10)
   );
   
   Declare @tmpCurrency_Rate table (Currency nvarchar(50), Currency_Rate float, Currency_Symbol nvarchar(5))
   Declare @Producing_Cost float = 0, @Standard_Cost float = 0, @OverHead float = 0, @MTR_Declare_Rate float = 0   
   Declare @tmpRef_Qty table (Order_Detail_RefID int, Qty float)

   Select @Producing_Cost = Producing_Cost, @OverHead = Overhead, @MTR_Declare_Rate = MTR_Declare_Rate from Control
   
   Insert @TmpTable
   SELECT q.[Order_No]
   , isnull(q.Subject,'') as Subject
   , isnull(q.[Season],'') as Season
   , isnull(q.[Department],'') as Department
   , convert(varchar(10),q.[Order_Date],111) as [Order_Date] 
   , isnull(q.[Agent],'') as Agent
   , isnull(q.[CustomerID],'') as CustomerID
   , isnull(q.[Brand],'') as Brand
   , isnull(q.[UserID],'') as UserID
   , isnull(q.[Purpose],'') as Purpose
   , isnull(q.Order_No_Title,'Order No') as Order_No_Title
   , isnull(q.Ref_No_Title,'') as Ref_No_Title
   , isnull(q.Packing_No_Title,'') as Packing_No_Title 
   , isnull(q.[PI_No],'') as PI_No
   , isnull(o.[Payment_Term],'') as Payment_Term
   , isnull(q.Currency,'') as Currency
   , isnull(q.PO_Currency,'') as PO_Currency
   , isnull(q.Remark,'') as Remark
   , isnull(q.RCV_No,'') as RCV_No
   , isnull(q.[Data_Updater],'') as Data_Updater
   , isnull(convert(varchar(20),q.Data_Update,111),'') as Data_Update
   FROM [dbo].[Orders] q With(Nolock,NoWait)
   Left outer Join OPI o With(Nolock,NoWait) on o.PI_No = q.PI_No
   where q.[Order_No] = @Order_No;
      
   insert @tmpCurrency_Rate   
   Select c.Currency, c.Currency_Rate, b.Currency_Symbol
   From @TmpTable q
   Left outer JOIN dbo.[@Currency_Rate] c WITH(NoLock, NoWait) ON Convert(Date, q.[Order_Date]) = c.Exchange_Date
   INNER JOIN dbo.Currency b On c.Currency = b.Currency
   
   insert @TmpDetail
   Select o.Order_No, od.Product_No, case when pc.Product_No is not null and s.Brand = o.Brand then 1 else 0 end as Product_No_Flag, od.Customer_Product_No, rtrim(isnull(s.CCC_Code,'')) as CCC_Code, Unit_Price, od.Commission, od.Other_Expense, od.Factory_Price, od.Est_Process_Cost, od.Producing_Cost, od.PCost_Standard, od.PCost_Print
   , od.PCost_Embroidery, od.PCost_Wash_Repacking, od.PCost_Handmade, od.PCost_Outsole_Assembling, od.PCost_Double_Lasting, od.PCost_Finishing, od.PCost_Others, od.Overhead
   , isnull(Convert(varchar(10), od.Orig_Shipping_Date, 111),'')
   , isnull(Convert(varchar(10), od.Est_Shipping_Date, 111),'')
   , od.Destination, od.Qty, od.Order_Detail_RefID, odr.Ref_No, od.Assortment_Title, od.Packing_OK, od.Factory_ID, pc.Name as Article_Name
   , s.Pattern_No
   , case when od.MTR_Declare_Rate = 0 or od.MTR_Declare_Rate is null then (@MTR_Declare_Rate) else od.MTR_Declare_Rate end as MTR_Declare_Rate
   , od.Produce_No
   , isnull(cast(oa.Order_ApproveID as varchar),'') as Order_ApproveID
   , isnull(convert(varchar(10), oa.Approve_Date,111),'') as Approve_Date
   , isnull(convert(varchar(10), oa.Approve_First_Date,111),'') as Approve_First_Date
   , case when oa.Approve_Date = '' or oa.Approve_Date is null then 0 else 1 end as Approve_Flag
   , od.Size_Status
   , Order_DetailID
   , isnull(od.PO_No,'') as PO_No
   From @TmpTable o 
   INNER JOIN Order_Detail od With(Nolock,NoWait) on o.Order_No = od.Order_No
   Left outer Join Produce p With(Nolock,NoWait) on od.Produce_No = p.Produce_No
   Left outer Join Order_Approve oa With(Nolock,NoWait) on p.Order_ApproveID = oa.Order_ApproveID
   Left outer JOIN Product pc With(Nolock,NoWait) on pc.Product_No = od.Product_No
   Left outer Join Style s With(NoLock,NoWait) on s.Style_No = pc.Style_No
   Left outer Join Order_Detail_Ref odr on odr.Order_Detail_RefID = od.Order_Detail_RefID
   Where ({QueryData} = '' or charindex({QueryData}, isnull(od.Product_No,'') + ' ' + isnull(od.Customer_Product_No,'') + ' ' + isnull(pc.Name,'') + ' ' + rtrim(isnull(s.CCC_Code,'')) + ' ' + isnull(od.PO_No,'') + ' ' + isnull(convert(varchar(10),od.Orig_Shipping_Date,111), '')  + ' ' + isnull(convert(varchar(10),od.Est_Shipping_Date,111), '') + ' ' + isnull(odr.Ref_No,'') + ' ' + isnull(od.Destination,'') + ' ' + isnull(od.Factory_ID,'') + ' ' + isnull(od.Produce_No,'') ) > 0);
    
   insert @tmpRef_Qty(Order_Detail_RefID, Qty)
   Select tmp.Order_Detail_RefID, Sum(Unit_Qty * Cartons) as Qty
   From (Select distinct Order_Detail_RefID From @TmpDetail) tmp
   Inner Join Order_Pko op with(NoLock,NoWait) on tmp.Order_Detail_RefID = op.Order_Detail_RefID
   Inner Join Order_Pko_Detail opd with(NoLock,NoWait) on op.Order_PKOID = opd.Order_PKOID
   Group by tmp.Order_Detail_RefID

   --0 Order Master
   if(@Mode = 0 or @Mode = 1)
   Begin
   
   Select t.*
   , o.Currency_Rate as Order_Currency_Rate
   , p.Currency_Rate as PO_Currency_Rate
   , o.Currency_Symbol as Order_Currency_Symbol
   , p.Currency_Symbol as PO_Currency_Symbol
   , o.Currency_Rate / p.Currency_Rate as Passing_Rate
   , @Producing_Cost as Producing_Cost
   , @Standard_Cost as Standard_Cost
   , @OverHead as OverHead
   , @MTR_Declare_Rate as MTR_Declare_Rate
   , case when isnull((Select sum(case when isnull(Produce_No,'') = '' then 0 else 1 end) From @TmpDetail),0) = 0 then 1 else 0 end as Delete_Flag
   From @TmpTable t
   Left outer Join @tmpCurrency_Rate O on t.currency = o.Currency
   Left outer Join @tmpCurrency_Rate P on t.PO_Currency = p.Currency
   
   End
   
   --1 Order Detail
   if(@Mode = 0 or @Mode = 2)
   Begin
   
   Select row_number() Over(Order By od.Order_DetailID desc) as RecNo, od.Order_No, od.Product_No, od.Product_No_Flag , od.Customer_Product_No, od.CCC_Code, od.Qty
   , od.Orig_Shipping_Date
   , isnull(od.Factory_ID,'') as Factory_ID
   , isnull(Destination,'') as Destination
   , od.Est_Shipping_Date
   , od.Unit_Price
   , od.Factory_Price
   , Convert(varchar(07), o.Order_Date, 111) + '/01' as Currency_Date
   , Order_Currency.Currency_Rate as Order_Currency_Rate
   , PO_Currency.Currency_Rate as PO_Currency_Rate
   , Order_Currency.Currency_Symbol as Order_Currency_Symbol
   , PO_Currency.Currency_Symbol as PO_Currency_Symbol
   , isnull(od.Producing_Cost,0) as Producing_Cost
   , isnull(od.PCost_Standard,0) as PCost_Standard
   , isnull(od.PCost_Others,0) as PCost_Others
   , isnull(od.Overhead,0) as Overhead
   , format(isnull(od.Commission,0),'N3') as Commission
   , format(isnull(od.Other_Expense,0),'N3') as Other_Expense
   , format(isnull(od.Est_Process_Cost,0),'N3') as Est_Process_Cost
   , od.Article_Name
   , o.Ref_No_Title
   , o.Packing_No_Title
   , isnull(od.Ref_No,'') as Ref_No
   , od.Order_Detail_RefID
   , (Select Qty From @tmpRef_Qty t where t.Order_Detail_RefID = od.Order_Detail_RefID) as Ref_Qty
   , od.Pattern_No
   , od.MTR_Declare_Rate
   , isnull(od.Produce_No,'') as Produce_No
   , od.Order_ApproveID
   , od.Approve_Date
   , od.Approve_First_Date
   , od.Approve_Flag
   , isnull(od.Size_Status,0) as Size_Status
   , od.Order_DetailID
   , od.PO_No
   --, case when ABS(isnull(p.Shipmented,0)) = 1 then '#ecebeb' else 'white' end as Shipmented_Flag
   , ABS(isnull(p.Shipmented,0)) as Shipmented_Flag   
   , isnull(p.Material_Update_User, '') as Material_Update_User
   , isnull(p.Purchase_Project_No, '') as Purchase_Project_No
   , isnull(p.Exported, '') as Exported
   From @TmpTable o
   Inner Join @TmpDetail od on o.Order_No = od.Order_No
   Left Outer Join Produce p With(Nolock,NoWait) on p.Produce_No = od.Produce_No   
   Left outer Join @tmpCurrency_Rate Order_Currency on Order_Currency.currency = o.Currency
   Left outer Join @tmpCurrency_Rate PO_Currency on PO_Currency.currency = o.PO_Currency
   Order by od.Order_Detail_RefID desc, od.Order_DetailID desc


   SELECT [Order_SizeID], 0 as Order_QtyID, ps.[Size_Name], [Size],  0 as [Qty], abs([Prerange]) as Prerange
   FROM [dbo].[Order_Size] os with(NoLock, NoWait)
   inner Join [dbo].Product_Size ps with(NoLock, NoWait) on os.Size = ps.SizeID
   Where os.Order_No = @Order_No
   Order by os.Prerange desc, os.Size
   

   SELECT a.Order_QtyID, a.Order_DetailID, a.[Size], a.Qty
   FROM [dbo].[Order_Qty] a with(NoLock, NoWait)
   inner Join @TmpDetail od on a.Order_DetailID = od.Order_DetailID
   group by a.Order_QtyID, a.Order_DetailID, a.[Size], a.Qty   
      
   End 
   
   --2 Order Detail Expense
   if(@Mode = 0 or @Mode = 3)
   Begin   
      Select Calculate_By, Calculate_From, Category, CustomerID, Description, Doc, Value, Format(Sum(Expense_Amount),'N2') as Expense_Amount
      From (
         Select ode.Calculate_By, isnull(ode.Calculate_From,1) as Calculate_From, ode.Category, ode.CustomerID, ode.Description, ode.Doc,
            case when ode.Calculate_By = 1 then
            Format(case when isnull(ode.Calculate_From,1) = 1 then ode.Rate else isnull(ode.Expense / nullif(od.Factory_Price,0) , 0) end , 'P2')
            else
            Format(case when isnull(ode.Calculate_From,1) = 1 then isnull(ode.Rate * od.Unit_Price,0) else isnull(ode.Expense, 0) End, 'N3')
            End as Value
            , isnull(sum(ode.Rate * od.Unit_Price * od.Qty),0) as Expense_Amount
         From Order_Detail od With(Nolock,NoWait) 
         INNER JOIN Order_Detail_Expense ode With(Nolock,NoWait) on ode.Order_DetailID = od.Order_DetailID
         Where od.Order_No = @Order_No
         Group by ode.Calculate_By, ode.Calculate_From, ode.Category, ode.CustomerID, ode.Description, ode.Doc, ode.Rate, ode.Expense, od.Factory_Price, od.Unit_Price
      ) tmpTable
      Group by Calculate_By, Calculate_From, Category, CustomerID, Description, Doc, Value
      Order by Calculate_By, Calculate_From, Category, CustomerID, Description, Doc   
   End

   `, req.body) ;
   //console.log(strSQL)
   db.sql(req.SiteDB, strSQL)
      .then((result) => {

         function Detail() {
            var order_Info = [];
            var Size_Run = [];
            var Packing = [];
            var Expanse_Delivery = [];
            var Factory_Cost = [];

            var obj = (req.body.Mode == 0) ? result.recordsets[1] : (req.body.Mode == 2 ? result.recordsets[0] : []);
            var obj_Size_Range = (req.body.Mode == 0) ? result.recordsets[2] : (req.body.Mode == 2 ? result.recordsets[1] : [])
            var obj_Size_Run = (req.body.Mode == 0) ? result.recordsets[3] : (req.body.Mode == 2 ? result.recordsets[2] : []);
            var Order_Detail = {Order_Info:order_Info, Size_Run:Size_Run, Packing:Packing, Expanse_Delivery:Expanse_Delivery, Factory_Cost:Factory_Cost}; 
            //var Order_Detail = {Order_Info:order_Info, Size_Run:Size_Run, Packing:Packing, Factory_Cost:Factory_Cost};           

            obj.forEach((item) => {
               var Orders_Info_items = {
                  Move_Flag: false,         
                  Order_DetailID:item.Order_DetailID,
                  Product_No:item.Product_No,
                  Customer_Product_No:item.Customer_Product_No,
                  Product_No_Flag:item.Product_No_Flag,
                  CCC_Code:item.CCC_Code,
                  Article_Name:item.Article_Name,
                  Unit_Price:item.Unit_Price,
                  Qty:item.Qty,
                  Orig_Shipping_Date:item.Orig_Shipping_Date,
                  Est_Shipping_Date:item.Est_Shipping_Date,
                  Factory_ID:item.Factory_ID,
                  Destination:item.Destination,
                  Produce_No:item.Produce_No,
                  Order_ApproveID:item.Order_ApproveID,
                  Approve_Date:item.Approve_Date,
                  Approve_First_Date:item.Approve_First_Date,
                  Approve_Flag:item.Approve_Flag,
                  Order_Detail_RefID:item.Order_Detail_RefID,
                  Ref_No:item.Ref_No,
                  Ref_Qty:item.Ref_Qty,
                  PO_No:item.PO_No,
                  Shipmented_Flag:item.Shipmented_Flag,                  
                  Material_Update_User:item.Material_Update_User,
                  Purchase_Project_No:item.Purchase_Project_No,
                  Exported:item.Exported,
               };
               
               var Size_Run_items = {
                  Generate_Packing_Flag: item.Size_Status == 1 ? 1 : 0,
                  Factory_Price:item.Factory_Price,
                  Size_Status:item.Size_Status,
                  Qty:item.Qty,
                  Size_Qty_Info: []
               };
               

               var Size_Range = cloneDeep(obj_Size_Range);
               //console.log(obj_Size_Run)

               obj_Size_Run.forEach((sizeObj,idx)=>{
                  if(sizeObj.Order_DetailID === item.Order_DetailID) {
                     Size_Range.forEach((o, index)=>{
                        if(o.Size == sizeObj.Size) {
                           o.Order_QtyID = sizeObj.Order_QtyID;
                           o.Qty = sizeObj.Qty;
                           o.Qty1 = sizeObj.Qty == 0 ? '': sizeObj.Qty;
                        }
                     })
                  }
               })
               Size_Run_items.Size_Qty_Info = Size_Range;

               //console.log(Size_Run_items.Size_Qty_Info)

               var Packing_items = {
                  Size_Status:item.Size_Status,
                  Qty:item.Qty,
               }

               var Expanse_Delivery_items = {
                  Unit_Price:item.Unit_Price,
                  Factory_Price:Math.round(item.Factory_Price*10000)/10000,
                  Commission:item.Commission,
                  Other_Expense:item.Other_Expense,
                  //Qty:item.Qty,
               };

               var Factory_Cost_items = {
                  //Produce_No:item.Produce_No,
                  Producing_Cost:item.Producing_Cost,
                  PCost_Standard:item.PCost_Standard,
                  PCost_Others:item.PCost_Others,
                  Overhead:item.Overhead,
                  Est_Process_Cost:item.Est_Process_Cost,
                  MTR_Declare_Rate:item.MTR_Declare_Rate,
                  Factory_Price:Math.round(item.Factory_Price*10000)/10000
               }

               order_Info.push(Orders_Info_items)
               Size_Run.push(Size_Run_items)
               Packing.push(Packing_items)
               Expanse_Delivery.push(Expanse_Delivery_items)
               Factory_Cost.push(Factory_Cost_items)
            });
            //console.log(Order_Detail)
            return Order_Detail;
         } 

         var itmes = Detail();
         var DataSet = {
            Order: req.body.Mode == 0 || req.body.Mode == 1 ? result.recordsets[0] : []
           , Order_Detail: {Order_Info:itmes.Order_Info, Size_Run:itmes.Size_Run, Packing:itmes.Packing, Expanse_Delivery:itmes.Expanse_Delivery, Factory_Cost:itmes.Factory_Cost}
            // , Order_Detail: {Order_Info:itmes.Order_Info, Size_Run:itmes.Size_Run, Packing:itmes.Packing, Factory_Cost:itmes.Factory_Cost}
            , Order_Detail_Expense: (req.body.Mode == 0) ? result.recordsets[4] : (req.body.Mode == 3 ? result.recordsets[0] : [])
            , Order_Size_Range: (req.body.Mode == 0) ? result.recordsets[2] : (req.body.Mode == 2 ? result.recordsets[1] : [])
         }
               
         //console.log(itmes) 
         //console.log(result) 
         //console.log(DataSet) 
         res.send(DataSet);
      }).catch((err) => {
         console.log(err);
         res.status(500).send(err);
      })

});

//Maintain Order
router.post('/Order_Maintain',  function (req, res, next) {
   console.log("Call Order_Maintain Api:",req.body);

   // req.body.Mode === 0 表示新增
   // req.body.Mode === 1 表示修改 
   // req.body.Mode === 2 表示刪除
   // req.body.Mode === 3 表示Fill UP Value 到 Order detail
   // req.body.Mode === 4 Fill up Qty Per CTN to Assortment
   // req.body.Mode === 5 CopyAS Order Data
   // req.body.Mode === 6 Fill Up Ref No Data
   req.body.Order_No = req.body.Order_No ? `N'${req.body.Order_No.trim().substring(0,18).replace(/'/g, "''")}'` : `''`; 

   var strSQL = format(`Declare @Order_ApproveID_Count int = 0
   Declare @ROWCOUNT int=0;              
   Set @Order_ApproveID_Count = (SELECT count(p.Order_ApproveID)
                            FROM Order_Detail od
                            Left Outer Join Produce p WITH (NoWait, Nolock) on od.Produce_No = p.Produce_No
                            Left Outer Join Order_Approve a WITH (NoWait, Nolock) on p.Order_ApproveID = a.Order_ApproveID 
                            Where od.Order_No = {Order_No} 
                            And a.Approve_Date is not null
                            )`, req.body);

   switch(req.body.Mode){
      case 0:
        req.body.Purpose = req.body.Purpose ? `N'${req.body.Purpose.trim().substring(0,15).replace(/'/g, "''")}'` : `''`; 
        req.body.Brand = req.body.Brand ? `N'${req.body.Brand.trim().substring(0,30).replace(/'/g, "''")}'` : `''`; 
        req.body.Season = req.body.Season ? `N'${req.body.Season.trim().substring(0,10).replace(/'/g, "''")}'` : `''`; 
        req.body.Agent = req.body.Agent ? `N'${req.body.Agent.trim().substring(0,15).replace(/'/g, "''")}'` : `''`; 
        req.body.CustomerID = req.body.CustomerID ? `N'${req.body.CustomerID.trim().substring(0,15).replace(/'/g, "''")}'` : `''`; 
        req.body.Currency = req.body.Currency ? `N'${req.body.Currency.trim().substring(0,4).replace(/'/g, "''")}'` : `'USD'`; 
        req.body.PO_Currency = req.body.PO_Currency ? `N'${req.body.PO_Currency.trim().substring(0,4).replace(/'/g, "''")}'` : `'USD'`; 
  
         strSQL = format(`
         with tmpTable(Department, OrganizationID) as (
            Select d.Department_Code as Department, d.OrganizationID
            from Employee e 
               Inner Join Department d on e.DepartmentID = d.DepartmentID
               Inner Join aspnet_Users au on e.EmployeeID = au.EmployeeID
            Where au.LoweredUserName = N'${req.UserID}'
         )
         Insert into [dbo].[Orders] (Order_No, Purpose, OrganizationID, [Order_Date] ,[Data_Update] ,[Agent], [Brand], [CustomerID], [Season], [Currency], [PO_Currency], Ref_No_Title, Packing_No_Title, Order_No_Title, [Department] ,[UserID] ,[Data_Updater] )
         Select {Order_No} as Order_No, {Purpose} as Purpose, OrganizationID, GetDate() as [Order_Date], GetDate() as [Data_Update], {Agent} as Agent, {Brand} as Brand, {CustomerID} as CustomerID, {Season} as Season, {Currency}, {PO_Currency}, 'C. PO NO' as Ref_No_Title, 'COMMESSA NO' as Packing_No_Title, 'Order NO' as Order_No_Title, Department, N'${req.UserID}' as UserID, N'${req.UserID}' as Data_Updater From tmpTable; 
         Select @@ROWCOUNT as Flag;
         `, req.body);
      break;
      case 1:
        switch(req.body.Name) {
          case 'Order_No':
            req.body.Value = req.body.Value ? `N'${req.body.Value.trim().replace(/'/g, "''")}'` : `''`; 

            strSQL += format(` 
              if(@Order_ApproveID_Count = 0)
              begin   
                  Update [dbo].[Orders] Set [{Name}] = {Value}
                  , UserID = isnull(UserID, N'${req.UserID}')
                  , Data_Updater = N'${req.UserID}'
                  , Data_Update = GetDate()
                  where Order_No = {Order_No}
                  And (SELECT Count(*) as RecCount FROM Order_Detail as p WITH (NoWait, Nolock) Where p.Order_No = {Value}) = 0 
                  Set @ROWCOUNT = @@ROWCOUNT;
              End
             `, req.body);
    
          break;
          case 'Season':
            req.body.Value = req.body.Value ? `N'${req.body.Value.trim().replace(/'/g, "''")}'` : `''`; 
            strSQL += format(` 
              if(@Order_ApproveID_Count = 0)
              begin   
                  Update [dbo].[Orders] Set [{Name}] = {Value}
                  , UserID = isnull(UserID, N'${req.UserID}')
                  , Data_Updater = N'${req.UserID}'
                  , Data_Update = GetDate()
                  where Order_No = {Order_No}

                  Set @ROWCOUNT = @@ROWCOUNT;
              End
             `, req.body);    
          break;
          case 'Department':
            req.body.Value = req.body.Value ? `N'${req.body.Value.trim().replace(/'/g, "''")}'` : `''`; 

            strSQL += format(` 
              Update [dbo].[Orders] Set [{Name}] = {Value}
              , UserID = isnull(UserID, N'${req.UserID}')
              , Data_Updater = N'${req.UserID}'
              , Data_Update = GetDate()
              where Order_No = {Order_No}

              Set @ROWCOUNT = @@ROWCOUNT;
           `, req.body);

          break;
          case 'Order_Date':
            req.body.Value = req.body.Value ? `N'${req.body.Value.trim().replace(/'/g, "''")}'` : `''`; 
            strSQL += format(` 
              Update [dbo].[Orders] Set [{Name}] = {Value}
              , UserID = isnull(UserID, N'${req.UserID}')
              , Data_Updater = N'${req.UserID}'
              , Data_Update = GetDate()
              where Order_No = {Order_No}

              Set @ROWCOUNT = @@ROWCOUNT;
           `, req.body);

          break;
          case 'Brand':
            req.body.Value = req.body.Value ? `N'${req.body.Value.trim().replace(/'/g, "''")}'` : `''`; 
            strSQL += format(` 
                Update [dbo].[Orders] Set [{Name}] = {Value}
                , UserID = isnull(UserID, N'${req.UserID}')
                , Data_Updater = N'${req.UserID}'
                , Data_Update = GetDate()
                where Order_No = {Order_No}
                And (SELECT Count(*) as RecCount FROM Order_Detail p WITH (NoWait, Nolock) Where p.Order_No = {Order_No}) = 0 

                Set @ROWCOUNT = @@ROWCOUNT;
             `, req.body);    
          break;
          case 'Currency':
            req.body.Value = req.body.Value ? `N'${req.body.Value.trim().replace(/'/g, "''")}'` : `''`; 
            strSQL += format(` 
                 Update [dbo].[Orders] Set [{Name}] = {Value}
                 , UserID = isnull(UserID, N'${req.UserID}')
                 , Data_Updater = N'${req.UserID}'
                 , Data_Update = GetDate()
                 where Order_No = {Order_No}
                  And (SELECT Count(*) as RecCount FROM Order_Detail p WITH (NoWait, Nolock) Where p.Order_No = {Order_No}) = 0 ;
                 Set @ROWCOUNT = @@ROWCOUNT;
              `, req.body);
          break;
          case 'PO_Currency':
            req.body.Value = req.body.Value ? `N'${req.body.Value.trim().replace(/'/g, "''")}'` : `''`; 
            strSQL += format(` 
              Update [dbo].[Orders] Set [{Name}] = {Value}
              , UserID = isnull(UserID, N'${req.UserID}')
              , Data_Updater = N'${req.UserID}'
              , Data_Update = GetDate()
              where Order_No = {Order_No}
              And (SELECT Count(*) as RecCount FROM Order_Detail p WITH (NoWait, Nolock) Where p.Order_No = {Order_No} and isnull(p.PO_No,'') <> '' ) = 0 

              Set @ROWCOUNT = @@ROWCOUNT;
           `, req.body);
          break;
          case 'CustomerID':
            req.body.Value = req.body.Value ? `N'${req.body.Value.trim().replace(/'/g, "''")}'` : `''`; 
            strSQL += format(`     
              if(@Order_ApproveID_Count = 0)
              begin   
                 Update [dbo].[Orders] Set [{Name}] = {Value}
                 , Agent = ''
                 , UserID = isnull(UserID, N'${req.UserID}')
                 , Data_Updater = N'${req.UserID}'
                 , Data_Update = GetDate()
                 where Order_No = {Order_No}
                 Set @ROWCOUNT = @@ROWCOUNT; 
              End
              `, req.body);
          break;
          case 'Agent':
            req.body.Value = req.body.Value ? `N'${req.body.Value.trim().replace(/'/g, "''")}'` : `''`; 
            strSQL += format(` 
                 Update [dbo].[Orders] Set [{Name}] = {Value}
                 , UserID = isnull(UserID, N'${req.UserID}')
                 , Data_Updater = N'${req.UserID}'
                 , Data_Update = GetDate()
                 where Order_No = {Order_No}

                 Set @ROWCOUNT = @@ROWCOUNT;            
              `, req.body);     
          break;
          case 'Purpose':
            req.body.Value = req.body.Value ? `N'${req.body.Value.trim().replace(/'/g, "''")}'` : `''`; 
            strSQL += format(` 
                Update [dbo].[Orders] Set [{Name}] = {Value}
                , UserID = isnull(UserID, N'${req.UserID}')
                , Data_Updater = N'${req.UserID}'
                , Data_Update = GetDate()
                where Order_No = {Order_No}
                And (SELECT Count(*) as RecCount FROM Order_Detail p WITH (NoWait, Nolock) Where p.Order_No = {Order_No}) = 0 

                Set @ROWCOUNT = @@ROWCOUNT;
             `, req.body);
    
          break;
          case 'Remark':
            req.body.Value = req.body.Value ? `N'${req.body.Value.trim().replace(/'/g, "''")}'` : `''`; 
            strSQL += format(` 
              Update [dbo].[Orders] Set [{Name}] = {Value}
              , UserID = isnull(UserID, N'${req.UserID}')
              , Data_Updater = N'${req.UserID}'
              , Data_Update = GetDate()
              where Order_No = {Order_No}
              --And (SELECT Count(*) as RecCount FROM Order_Detail p WITH (NoWait, Nolock) Where p.Order_No = {Order_No}) = 0 

              Set @ROWCOUNT = @@ROWCOUNT;
           `, req.body);

          break;
          case 'Subject':
            req.body.Value = req.body.Value ? `N'${req.body.Value.trim().replace(/'/g, "''")}'` : `''`; 
            strSQL += format(` 
              Update [dbo].[Orders] Set [{Name}] = {Value}
              , UserID = isnull(UserID, N'${req.UserID}')
              , Data_Updater = N'${req.UserID}'
              , Data_Update = GetDate()
              where Order_No = {Order_No}

              Set @ROWCOUNT = @@ROWCOUNT;
           `, req.body);

          break;
          case 'Ref_No_Title':
          case 'Order_No_Title':
          case 'Packing_No_Title':
            size = 20;
            req.body.Value = req.body.Value ? `N'${req.body.Value.trim().substring(0,size).replace(/'/g, "''")}'` : `''`;
            strSQL += format(` 
              Update [dbo].[Orders] Set [{Name}] = {Value}
              , UserID = isnull(UserID, N'${req.UserID}')
              , Data_Updater = N'${req.UserID}'
              , Data_Update = GetDate()
              where Order_No = {Order_No}

              Set @ROWCOUNT = @@ROWCOUNT;
           `, req.body);
          break;
          case 'Orig_Shipping_Date':
          case 'Est_Shipping_Date':
            size = 10;
            req.body.Value = req.body.Value ? `N'${req.body.Value.trim().substring(0,size).replace(/'/g, "''")}'` : `''`;      
            strSQL += format(` 
              Update [dbo].[Orders] Set [{Name}] = {Value}
              , UserID = isnull(UserID, N'${req.UserID}')
              , Data_Updater = N'${req.UserID}'
              , Data_Update = GetDate()
              where Order_No = {Order_No}

              Set @ROWCOUNT = @@ROWCOUNT;
           `, req.body);
          break;
          case 'Destination':
            size = 30;
            req.body.Value = req.body.Value ? `N'${req.body.Value.trim().substring(0,size).replace(/'/g, "''")}'` : `''`;      
            strSQL += format(` 
              Update [dbo].[Orders] Set [{Name}] = {Value}
              , UserID = isnull(UserID, N'${req.UserID}')
              , Data_Updater = N'${req.UserID}'
              , Data_Update = GetDate()
              where Order_No = {Order_No}

              Set @ROWCOUNT = @@ROWCOUNT;
           `, req.body);
          break;
          case 'Factory_ID':
            size = 15;
            req.body.Value = req.body.Value ? `N'${req.body.Value.trim().substring(0,size).replace(/'/g, "''")}'` : `''`;      
            strSQL += format(` 
              Update [dbo].[Orders] Set [{Name}] = {Value}
              , UserID = isnull(UserID, N'${req.UserID}')
              , Data_Updater = N'${req.UserID}'
              , Data_Update = GetDate()
              where Order_No = {Order_No}

              Set @ROWCOUNT = @@ROWCOUNT;
           `, req.body);
          break;
          default:
            strSQL += format(`     
              Update [dbo].[Orders] Set [{Name}] = {Value}
              , UserID = isnull(UserID, N'${req.UserID}')
              , Data_Updater = N'${req.UserID}'
              , Data_Update = GetDate()
              where Order_No = {Order_No}

              Set @ROWCOUNT = @@ROWCOUNT;            
            `, req.body);   
          break;

        }
/*        
         strSQL += format(` 
          if(@Order_ApproveID_Count = 0)
          begin   
              Update [dbo].[Orders] Set [{Name}] = {Value}
              ${ req.body.Name === 'CustomerID' ? `, Agent = '' ` : "" }
              , UserID = isnull(UserID, N'${req.UserID}')
              , Data_Updater = N'${req.UserID}'
              , Data_Update = GetDate()
              where Order_No = {Order_No}
              ${ req.body.Name === 'Order_No' ? ` And (SELECT Count(*) as RecCount FROM Order_Detail as p WITH (NoWait, Nolock) Where p.Order_No = {Value}) = 0 ` : "" }
              ${ req.body.Name === 'Brand' || req.body.Name === 'Currency' ? ` And (SELECT Count(*) as RecCount FROM Order_Detail p WITH (NoWait, Nolock) Where p.Order_No = {Order_No}) = 0 ` : "" };
              Set @ROWCOUNT = @@ROWCOUNT;
          End
         `, req.body);
*/
         strSQL += format(`     
          Select @ROWCOUNT as Flag;         
          `, req.body);
 
      break;
      case 2:
         strSQL += format(`Declare @Offical_Order_Flag int = 0, @RecCount int = 0;
         SELECT @Offical_Order_Flag = count(*) From Samples where Order_No = {Order_No} ;
         SELECT @RecCount = Count(*) FROM Order_Detail p WITH (NoWait, Nolock) Where p.Order_No = {Order_No} And isnull(p.Produce_No,'') <> ''

         if(@Order_ApproveID_Count = 0 And @Offical_Order_Flag = 0 And @RecCount = 0)
         begin 
            Delete tmp_Ref FROM [dbo].[Order_Detail_Ref] as tmp_Ref
            Inner Join Order_Detail od with(NoLock,NoWait) on tmp_Ref.Order_Detail_RefID = od.Order_Detail_RefID
            where od.Order_No = {Order_No} 
            And @RecCount = 0
            And @Offical_Order_Flag = 0; 

            Delete FROM [dbo].[OrderS] 
            where Order_No = {Order_No} 
            And @RecCount = 0
            And @Offical_Order_Flag = 0; 
            Set @ROWCOUNT = @@ROWCOUNT;
         End
         Select @ROWCOUNT as Flag, @Offical_Order_Flag as Offical_Order_Flag;
         `, req.body);      
      break;
      case 3:
         switch(req.body.Name){
            case 'Est_Process_Cost':
            case 'MTR_Declare_Rate':
               strSQL += format(`
                  --if(@Order_ApproveID_Count = 0)
                  --begin
                     Declare @Material_Declare_Rate float = (case when 'Material_Declare_Rate' = '{Name}' then {Value} else (Select MTR_Declare_Rate from Control) end)

                     Update Order_Detail Set {Name} = {Value} 
                     Where Order_No = {Order_No};

                     Set @ROWCOUNT += @@ROWCOUNT;
                     
                     Update Order_Detail set Factory_Price = tmp.Factory_Price
                     From Order_Detail od With(NoWait,NoLock)
                     Inner Join (
                     Select od.Order_DetailID
                     , Round(sum( isnull((pd.Unit_Price * T_Net_Qty * (m_Rate.Currency_Rate / PO_Rate.Currency_Rate))  / nullif(p.Qty,0) ,0) 
                       * (case when Purchase_ResponsibleID = 1 
                         then 1 
                        else 
                           case when 'Material_Declare_Rate' = '{Name}' or isnull(od.MTR_Declare_Rate,0) = 0 then @Material_Declare_Rate else od.MTR_Declare_Rate end
                        end))
                       + case when 'Est_Process_Cost' = '{Name}' then {Value} else isnull(od.Est_Process_Cost ,0) end	
                        ,2) as Factory_Price
                     From Order_Detail od with(NoLock, NoWait)
                     Left Outer Join Produce p with(NoLock, NoWait)on  od.Produce_No = p.Produce_No
                     Left Outer Join Purchase_Project pp with(NoLock, NoWait)on pp.Purchase_Project_No = p.Purchase_Project_No
                     Left Outer Join Produce_Detail pd with(NoLock, NoWait) on od.Produce_No = pd.Produce_No and pd.Master_Purchase_Item <> -1
                     Left Outer Join Supplier s With(NoLock, NoWait) on pd.SupplierID = s.SupplierID
                     Inner Join Orders o with(NoLock, NoWait) on o.Order_No = od.Order_No
                     Left Outer Join [dbo].[@Currency_Rate] M_Rate on M_Rate.Currency = pd.Currency And M_Rate.Exchange_Date = convert(Date, pp.Apply_Date)
                     Left Outer Join [dbo].[@Currency_Rate] PO_Rate on PO_Rate.Currency = o.PO_Currency And PO_Rate.Exchange_Date = convert(Date, pp.Apply_Date)
                     Where o.Order_No = {Order_No}                     
                     Group by od.Order_DetailID, od.Est_Process_Cost) tmp on od.Order_DetailID = tmp.Order_DetailID

                     Set @ROWCOUNT += @@ROWCOUNT;
                  --End
                  Select @ROWCOUNT as Flag;
               `, req.body);      
            break;
            case 'Factory_ID':
              size = 15;
              req.body.Value = req.body.Value ? `N'${req.body.Value.trim().substring(0,size).replace(/'/g, "''")}'` : `''`;
               strSQL += format(`
                  --if(@Order_ApproveID_Count = 0)
                  --begin

                     Declare @FactoryID nvarchar(255) 
                     Select @FactoryID = FactoryID From Factory_Sub f with(NoLock,NoWait) Where f.Factory_SubID = {Value}

                     BEGIN TRANSACTION;
                     BEGIN TRY            

                        Update Order_Detail Set {Name} = {Value} 
                        From Order_Detail od
                          Left Outer Join (
                            Select distinct d.Produce_No , oa.Approve_Date
                            from Order_Detail d 
                            Inner Join Produce p on d.Produce_No = p.Produce_No
                            Left Outer Join Order_Approve oa on p.Order_ApproveID = oa.Order_ApproveID
                            Where d.Order_No = {Order_No}
                            --And oa.Approve_Date is null
                          ) tmp on tmp.Produce_No = od.Produce_No
                          Where Order_No = {Order_No} 
                          And tmp.Approve_Date is null;
                        
                        Set @ROWCOUNT = @@ROWCOUNT;

                        Update Produce set FactoryID = @FactoryID
                        , Factory_SubID = {Value}
                        , Produce_LineID = null
                        From Produce p 
                        Inner Join Order_Detail od on od.Produce_No = p.Produce_No And od.Order_No = {Order_No}
                        Left Outer Join Order_Approve oa on p.Order_ApproveID = oa.Order_ApproveID
                        Where oa.Approve_Date is null;                    

                        Update [dbo].[Orders] Set UserID = isnull(UserID, N'${req.UserID}')
                        , Data_Updater = N'${req.UserID}'
                        , Data_Update = GetDate()
                        From [Orders] o
                        Where o.Order_No = {Order_No}

                     COMMIT;
                     END TRY
                     BEGIN CATCH
                        Select @ROWCOUNT = 0;
                        ROLLBACK;
                     END CATCH

                  --End
                  Select @ROWCOUNT as Flag;
               `, req.body);      
            break;
            case 'Orig_Shipping_Date':
            case 'Est_Shipping_Date':
              size = 10;
              req.body.Value = req.body.Value ? `N'${req.body.Value.trim().substring(0,size).replace(/'/g, "''")}'` : `''`;
              strSQL += format(`
                --if(@Order_ApproveID_Count = 0)
                --begin
/*                
                    Update Order_Detail Set {Name} = {Value} 
                     From Order_Detail od
                      Left Outer Join (
                        Select distinct d.Produce_No , oa.Approve_Date
                        from Order_Detail d 
                        Inner Join Produce p on d.Produce_No = p.Produce_No
                        Left Outer Join Order_Approve oa on p.Order_ApproveID = oa.Order_ApproveID
                        Where d.Order_No = {Order_No}
                      ) tmp on tmp.Produce_No = od.Produce_No
                      Where Order_No = {Order_No} 
                      And tmp.Approve_Date is null;
*/

                    Update Order_Detail Set {Name} = {Value} 
                     From Order_Detail od
                      Where Order_No = {Order_No};

                   Set @ROWCOUNT = @@ROWCOUNT;
                   if(@ROWCOUNT > 0)
                   Begin
                      Update [dbo].[Orders] Set UserID = isnull(UserID, N'${req.UserID}')
                      , Data_Updater = N'${req.UserID}'
                      , Data_Update = GetDate()
                      where Order_No = {Order_No}
                   End
                --End
                Select @ROWCOUNT as Flag;
             `, req.body);
            break;
            case 'Destination':
              size = 30;
              req.body.Value = req.body.Value ? `N'${req.body.Value.trim().substring(0,size).replace(/'/g, "''")}'` : `''`;
              strSQL += format(`
                --if(@Order_ApproveID_Count = 0)
                --begin
                   Update Order_Detail Set {Name} = {Value} 
                     From Order_Detail od
                      Left Outer Join (
                        Select distinct d.Produce_No , oa.Approve_Date
                        from Order_Detail d 
                        Inner Join Produce p on d.Produce_No = p.Produce_No
                        Left Outer Join Order_Approve oa on p.Order_ApproveID = oa.Order_ApproveID
                        Where d.Order_No = {Order_No}
                        --And oa.Approve_Date is null
                      ) tmp on tmp.Produce_No = od.Produce_No
                      Where Order_No = {Order_No} 
                      And tmp.Approve_Date is null;

                   Set @ROWCOUNT = @@ROWCOUNT;
                   if(@ROWCOUNT > 0)
                   Begin
                      Update [dbo].[Orders] Set UserID = isnull(UserID, N'${req.UserID}')
                      , Data_Updater = N'${req.UserID}'
                      , Data_Update = GetDate()
                      where Order_No = {Order_No}
                   End
                --End
                Select @ROWCOUNT as Flag;
             `, req.body);
            break;
            default:
               strSQL += format(`
                  --if(@Order_ApproveID_Count = 0)
                  --begin
                     Update Order_Detail Set {Name} = {Value} 
                     From Order_Detail od
                      Left Outer Join (
                        Select distinct d.Produce_No , oa.Approve_Date
                        from Order_Detail d 
                        Inner Join Produce p on d.Produce_No = p.Produce_No
                        Left Outer Join Order_Approve oa on p.Order_ApproveID = oa.Order_ApproveID
                        Where d.Order_No = {Order_No}
                        --And oa.Approve_Date is null
                      ) tmp on tmp.Produce_No = od.Produce_No
                      Where Order_No = {Order_No} 
                      And tmp.Approve_Date is null;

                     Set @ROWCOUNT = @@ROWCOUNT;
                     if(@ROWCOUNT > 0)
                     Begin
                        Update [dbo].[Orders] Set UserID = isnull(UserID, N'${req.UserID}')
                        , Data_Updater = N'${req.UserID}'
                        , Data_Update = GetDate()
                        where Order_No = {Order_No}
                     End
                  --End
                  Select @ROWCOUNT as Flag;
               `, req.body);      
            break;
      }
   break;
      case 4:
         strSQL += format(`
         if(@Order_ApproveID_Count = 0)
         begin
            Update Assortment Set {Name} = {Value} , Cartons = CEILING(isnull(a.T_Qty / nullif({Value},0) ,0))
            From Assortment a
            Inner Join Order_Detail od on a.Order_DetailID = od.Order_DetailID
            Inner Join Produce p on p.Produce_No = od.Produce_No
            Left Outer Join Order_Approve oa on oa.Order_ApproveID = p.Order_ApproveID And oa.Approve_Date is null
            Where od.Order_No = {Order_No} and Size_Status = 1;
            Set @ROWCOUNT = @@ROWCOUNT;
            if(@ROWCOUNT > 0)
            Begin
               Update [dbo].[Orders] Set UserID = isnull(UserID, N'${req.UserID}')
               , Data_Updater = N'${req.UserID}'
               , Data_Update = GetDate()
               where Order_No = {Order_No}
            End
         End
         Select @ROWCOUNT as Flag;
         `, req.body);      
      break;
      case 5:
         req.body.Order_To = req.body.Order_To ? `N'${req.body.Order_To.trim().substring(0,18).replace(/'/g, "''")}'` : `''`;    
         strSQL = format(`
         Declare @Department varchar(5), @OrganizationID varchar(10);

         Select @Department = d.Department_Code, @OrganizationID = d.OrganizationID
         from Employee e 
             Inner Join Department d on e.DepartmentID = d.DepartmentID
             Inner Join aspnet_Users au on e.EmployeeID = au.EmployeeID
         Where au.LoweredUserName = N'${req.UserID}';
 
         INSERT INTO [dbo].[Orders] ([Order_No], [Subject], [Purpose], [Sample_Purpose], [Brand], [OrganizationID], [PI_No], [RCV_No], [Currency], [PO_Currency], [Order_Date], [Season], [CustomerID], [Agent], [Ref_No_Title], [Packing_No_Title], [Order_No_Title], [Remark], [UserID], [Data_Update], [Data_Updater], [Department])
         Select {Order_To} as Order_No, [Subject], [Purpose], [Sample_Purpose], [Brand], @OrganizationID as OrganizationID, [PI_No], [RCV_No], [Currency], [PO_Currency], GetDate() as [Order_Date], [Season], [CustomerID], [Agent], [Ref_No_Title], [Packing_No_Title], [Order_No_Title], [Remark], N'${req.UserID}' as UserID, GetDate() as [Data_Update], N'${req.UserID}' as Data_Updater, @Department as Department
         From Orders with(NoLock, NoWait) 
         Where [Order_No] = {Order_No}
         And (SELECT Count(*) as RecCount FROM [dbo].[Orders] With(Nolock,NoWait) where ([Order_No] = {Order_To})) = 0 ;

         Select @@ROWCOUNT as Flag;
         `, req.body);
      break;
      case 6:
         strSQL += format(`
         if(@Order_ApproveID_Count = 0)
         begin
            Update Order_Detail Set Ref_No =  (Select Server From Control) + cast(Order_DetailID as varchar)
            FROM Order_Detail od
            Left Outer Join Produce p WITH (NoWait, Nolock) on od.Produce_No = p.Produce_No
            Left Outer Join Order_Approve a WITH (NoWait, Nolock) on p.Order_ApproveID = a.Order_ApproveID 
            Where od.Order_No = {Order_No}
            And p.Approve_Date is null
            And isnull(Ref_No,'') = '';

            Set @ROWCOUNT = @@ROWCOUNT;
            if(@ROWCOUNT > 0)
            Begin
               Update [dbo].[Orders] Set UserID = isnull(UserID, N'${req.UserID}')
               , Data_Updater = N'${req.UserID}'
               , Data_Update = GetDate()
               where Order_No = {Order_No}
            End
         End
         Select @ROWCOUNT as Flag;
         `, req.body);         
      break;
   }
    //console.log(strSQL)
   db.sql(req.SiteDB, strSQL)
      .then((result) => {
         res.send({Flag:result.recordsets[0][0].Flag > 0, Offical_Order_Flag: result.recordsets[0][0].Offical_Order_Flag == 0});
      }).catch((err) => {
         console.log(err);
         res.status(500).send(err);
      })

});

//Maintain Order Detail
router.post('/Order_Detail_Maintain',  function (req, res, next) {
console.log("Call Order_Detail_Maintain Api:",req.body);   
var strSQL = "";

// req.body.Mode === 0 表示新增
// req.body.Mode === 1 表示修改
// req.body.Mode === 2 表示刪除
// req.body.Mode === 3 表示編輯[Size/Qty]Sheet Size field的數量
// req.body.Mode === 4 表示Generator Assortment solid Packing
// req.body.Mode === 5 表示Generator Order Size

req.body.Order_No = req.body.Order_No ? `N'${req.body.Order_No.replace(/'/g, "''")}'` : `''`; 

if(req.body.Mode === 0) {
   req.body.Product_No = req.body.Product_No ? `N'${req.body.Product_No.trim().substring(0,25).replace(/'/g, "''")}'` : `''`; 
   req.body.Destination = req.body.Destination ? `N'${req.body.Destination.trim().substring(0,30).replace(/'/g, "''")}'` : `''`; 
   //req.body.Factory_ID = req.body.Factory_ID ? `N'${req.body.Factory_ID.trim().substring(0,15).replace(/'/g, "''")}'` : `''`; 
   req.body.Ref_No = req.body.Ref_No ? `N'${req.body.Ref_No.trim().substring(0,20).replace(/'/g, "''")}'` : `''`; 
   req.body.Est_Shipping_Date = req.body.Est_Shipping_Date ? `'${req.body.Est_Shipping_Date}'` : 'null'; 
   req.body.Orig_Shipping_Date = req.body.Orig_Shipping_Date ? `'${req.body.Orig_Shipping_Date}'` : 'null';   
   req.body.Order_DetailID = req.body.Order_DetailID ? `'${req.body.Order_DetailID}'` : 'null';   
}

if(req.body.Mode === 1 && (
   req.body.Name === 'Est_Shipping_Date'
   || req.body.Name === 'Orig_Shipping_Date'))
{
   req.body.Value = req.body.Value ? `N'${req.body.Value.trim().replace(/'/g, "''")}'` : 'null'; 
}


if(req.body.Mode === 1 && (
   req.body.Name === 'Product_No'
   || req.body.Name === 'Customer_Product_No'
   || req.body.Name === 'Destination'
   || req.body.Name === 'Factory_ID'
   || req.body.Name === 'Ref_No'
   || req.body.Name === 'Produce_No'   
   )) 
{
      
   var fieldSize = 0;
   switch(req.body.Name) {
      case 'Product_No':
         fieldSize = 25;
         break;
      case 'Customer_Product_No':
         fieldSize = 20;
         break;
      case 'Destination':
         fieldSize = 30;
         break;
      case 'Factory_ID':
         fieldSize = 15;
         break;
      case 'Ref_No':
         fieldSize = 20;
         break;
      case 'Produce_No':
         fieldSize = 20;
         break;         
   }
   req.body.Value = req.body.Value ? `N'${req.body.Value.trim().substring(0,fieldSize).replace(/'/g, "''")}'` : `''`; 
}

if(req.body.Mode === 3 && req.body.Name === 'Qty')
{
   req.body.Order_QtyID = req.body.Order_QtyID ? req.body.Order_QtyID : null; 
}

strSQL = req.body.Mode === 0 ? format(`Declare @Order_ApproveID int = 0, @Customer_Product_No Nvarchar(25);
Select @Customer_Product_No = case when len(pc.Customer_Product_No) = 0 or pc.Customer_Product_No is null then pc.Product_No else pc.Customer_Product_No end
From Product pc with(NoLock,NoWait) 
where pc.Product_No = {Product_No};`, req.body) : format(`Declare @Order_ApproveID int 
Set @Order_ApproveID = isnull( (SELECT case when a.Approve_Date is null then 0 else 1 end 
                        FROM Order_Detail od with(NoLock, NoWait)
                        Left Outer Join Produce p with(NoWait, Nolock) on od.Produce_No = p.Produce_No
                        Left Outer Join Order_Approve a with(NoWait, Nolock) on p.Order_ApproveID = a.Order_ApproveID 
                        Where od.Order_DetailID = {Order_DetailID} ) ,0)



${(req.body.Mode === 1 && req.body.Name == 'Product_No') ? ` 
Declare @Product_No_Flag int, @Customer_Product_No Nvarchar(25), @Pattern_No varchar(20), @CCC_Code Nvarchar(15), @Article_Name Nvarchar(50);
Select @Product_No_Flag = case when pc.Product_No is not null and s.Brand = (Select Brand From Orders with(NoLock, NoWait) Where Order_No = {Order_No}) then 1 else 0 end
, @Customer_Product_No = case when len(pc.Customer_Product_No) = 0 or pc.Customer_Product_No is null then pc.Product_No else pc.Customer_Product_No end
, @Pattern_No = isnull(s.Pattern_No,'')
, @CCC_Code = rtrim(isnull(s.CCC_Code,''))
, @Article_Name = isnull(pc.Name,'')
From Product pc with(NoLock,NoWait) 
Inner Join Style s with(NoLock,NoWait) on pc.Style_No = s.Style_No 
where pc.Product_No = {Value};` :''}

`,req.body);

switch(req.body.Mode){
   case 0:
      strSQL += format(`
      Declare @Key int, @Order_Detail_RefID int

      if(@Order_ApproveID = 0)
      begin
         Insert into [dbo].[Order_Detail] (Order_No, Product_No, Customer_Product_No
            , Overhead
            , Unit_Price, Destination
            --, Factory_ID
            , Est_Shipping_Date, Orig_Shipping_Date)
         Select {Order_No} as Order_No, {Product_No} as Product_No, @Customer_Product_No as Customer_Product_No
            , (Select Overhead From Control) as Overhead
            , {Unit_Price} as Unit_Price, {Destination} as Destination
            --, {Factory_ID} as Factory_ID
            , {Est_Shipping_Date} as Est_Shipping_Date, {Orig_Shipping_Date} as Orig_Shipping_Date            
      end

      Set @Order_Detail_RefID = SCOPE_IDENTITY();
      
      if(@@ROWCOUNT > 0 AND @Order_Detail_RefID > 0)
      Begin
         Update [dbo].[Order_Detail] Set [Order_Detail_RefID] = @Order_Detail_RefID
         WHERE Order_DetailID = @Order_Detail_RefID

         Insert into [dbo].[Order_Detail_Ref] (Order_Detail_RefID, Ref_No)
         Select @Order_Detail_RefID as Order_Detail_RefID, {Ref_No} as Ref_No
      End

         `,req.body);
   break;
   case 1: 
      switch(req.body.Name){
         case 'MTR_Declare_Rate':
         case 'Est_Process_Cost':
            strSQL += format(`
            Declare @MTR_Declare_Rate float, @Factory_Price float 

            --if(@Order_ApproveID = 0)
            --begin
               set @MTR_Declare_Rate = (Select MTR_Declare_Rate from Control)
               set @Factory_Price = (
                  Select Round(sum( isnull((pd.Unit_Price * T_Net_Qty * (m_Rate.Currency_Rate / PO_Rate.Currency_Rate))  / nullif(p.Qty,0) ,0) 
                  * (case when Purchase_ResponsibleID = 1 
                     then 1 
                  else 
                     case when 'MTR_Declare_Rate' = '{Name}'
                     then {Value} 
                     else isnull(od.MTR_Declare_Rate, @MTR_Declare_Rate)
                     end
                  end))
                  + case when 'Est_Process_Cost' = '{Name}' then {Value} else isnull(od.Est_Process_Cost ,0) end	
                  ,2) 
                  From Order_Detail od with(NoLock, NoWait)
                  Left Outer Join Produce p with(NoLock, NoWait)on  od.Produce_No = p.Produce_No
                  Left Outer Join Purchase_Project pp with(NoLock, NoWait)on pp.Purchase_Project_No = p.Purchase_Project_No
                  Left Outer Join Produce_Detail pd with(NoLock, NoWait) on od.Produce_No = pd.Produce_No and pd.Master_Purchase_Item <> -1
                  Left Outer Join Supplier s With(NoLock, NoWait) on pd.SupplierID = s.SupplierID
                  Inner Join Orders o with(NoLock, NoWait) on o.Order_No = od.Order_No
                  Left Outer Join [dbo].[@Currency_Rate] M_Rate on M_Rate.Currency = pd.Currency And M_Rate.Exchange_Date = convert(Date, pp.Apply_Date)
                  Left Outer Join [dbo].[@Currency_Rate] PO_Rate on PO_Rate.Currency = o.PO_Currency And PO_Rate.Exchange_Date = convert(Date, pp.Apply_Date)
                  where Order_DetailID = {Order_DetailID}                   
                  Group by od.Est_Process_Cost
               );

               Update [dbo].[Order_Detail] Set [{Name}] = {Value}, Factory_Price = @Factory_Price
               where Order_DetailID = {Order_DetailID};               

            --End;
            `,req.body);
         break;
         case 'Ref_No':
            strSQL += format(`
            if(@Order_ApproveID = 0)
            begin
               INSERT INTO [dbo].[Order_Detail_Ref] (Order_Detail_RefID)
               SELECT {Order_Detail_RefID}
               WHERE NOT EXISTS (SELECT * FROM [dbo].[Order_Detail_Ref] WHERE Order_Detail_RefID = {Order_Detail_RefID});

               Update [dbo].[Order_Detail_Ref] Set [{Name}] = {Value}
               where Order_Detail_RefID = {Order_Detail_RefID}
            End
            `,req.body);
         break;
         case 'Orig_Shipping_Date':
            strSQL += format(`Declare @ROWCOUNT int = 0
            -- if(@Order_ApproveID = 0 )
            -- begin
               Update [dbo].[Order_Detail] Set [{Name}] = {Value}
               where Order_DetailID = {Order_DetailID};
               Set @ROWCOUNT = @@ROWCOUNT
               if(@ROWCOUNT > 0)
               begin
                  Declare @Date varchar(10) = (Select Min(convert(varchar(07), od.Orig_Shipping_Date, 111)) 
                                                From Order_Detail od with(NoLock,NoWait) 
                                                Where od.Produce_No = '{Produce_No}' )
                  Update Produce set Plan_Month = case when isnull( @Date ,'') = '' then Plan_Month else @Date end
                  where Produce_No = '{Produce_No}'
                  and isnull(Est_Produce_Date,'') = '';
               End
               -- End
            `,req.body);
         break;
         case 'Est_Shipping_Date':
         case 'Destination':
            strSQL += format(`
               Update [dbo].[Order_Detail] Set [{Name}] = {Value}
               where Order_DetailID = {Order_DetailID};
            `,req.body);
         break;
         default:
            strSQL += format(`
            if(@Order_ApproveID = 0 or '${req.body.Name}' = 'Customer_Product_No')
            begin
               Update [dbo].[Order_Detail] Set [{Name}] = {Value}
               ${req.body.Name === 'Product_No' ? ',Customer_Product_No=@Customer_Product_No ':''}
               where Order_DetailID = {Order_DetailID}
               ${req.body.Name == 'Product_No' ? ` And isnull(Produce_No,'') = '' ` : ''}
               ${(req.body.Name === 'Unit_Price' || req.body.Name === 'Factory_Price') ? `` : ` or Order_Detail_RefID = {Order_Detail_RefID}`} ;
               ${req.body.Name === 'Size_Status' ? ' Delete From Order_Qty Where Order_DetailID = {Order_DetailID};  Delete From Assortment Where Order_DetailID = {Order_DetailID};':'' } 
            End
            `,req.body);
         break;
      }  
   break;
   case 2:
      req.body.Order_Detail_RefID = req.body.Order_Detail_RefID ? req.body.Order_Detail_RefID : null;
      strSQL += format(`Declare @ROWCOUNT int = 0
      if(@Order_ApproveID = 0 )
      begin 
         Delete FROM [dbo].[Order_Detail] 
         where Order_DetailID = {Order_DetailID}
         And isnull(Produce_No,'') = ''; 

         Set @ROWCOUNT = @@ROWCOUNT;

         if(@ROWCOUNT > 0)
         Begin
            Delete FROM [dbo].[Order_Detail_Ref] 
            where Order_Detail_RefID = {Order_Detail_RefID}
            And (Select count(*) From Order_Detail od with(NoLock,NoWait) where od.Order_Detail_RefID = {Order_Detail_RefID}) = 0; 
         End
      End

      `,req.body);
   break;
   case 3:
      strSQL += format(`
      Declare @ROWCOUNT int = 0
      , @ROWCOUNT1 int = 0
      , @ROWCOUNT2 int = 0
      , @ROWCOUNT3 int = 0
      , @ROWCOUNT4 int = 0
      , @Size_Status int = 1
      , @Order_QtyID int = {Order_QtyID}
      , @Order_DetailID int = {Order_DetailID}
      , @Size float = {Size}
      , @Qty float = {Value}
      , @AssortmentID int

      if(@Order_ApproveID = 0)
      begin

         BEGIN TRANSACTION;  
         BEGIN TRY 

         update Order_Detail set Size_Status = 1
         Where isnull(Size_Status,0) = 0 And Order_DetailID = @Order_DetailID;         

         Select @Size_Status = Size_Status 
         from Order_Detail 
         Where Order_DetailID = @Order_DetailID;

         if(@Size_Status = 1) 
         begin
            
            Update [dbo].[Order_Qty] Set Qty = @Qty
            where Order_DetailID = @Order_DetailID
              And Size = @Size And @Qty <> 0;
            set @ROWCOUNT = @@ROWCOUNT;

            if(@ROWCOUNT = 0 And @Qty > 0)
            begin
               Insert [dbo].[Order_Qty] (Order_DetailID, Size, Qty, Prerange)
               Select @Order_DetailID as Order_DetailID, @Size as Size, @Qty as Qty, 0 as Prerange               
               set @ROWCOUNT = @@ROWCOUNT;
            end

            if(@Qty = 0)
            begin
               Delete From Order_Qty
               Where Size = @Size
                And Order_DetailID = @Order_DetailID;

               set @ROWCOUNT = @@ROWCOUNT;
/*               
               if(@ROWCOUNT > 0)
               Begin
                  Delete From Order_PKO_Detail_Qty 
                  From Order_PKO_Detail_Qty
                  Where Order_PKO_Detail_QtyID in
                  (Select opq.Order_PKO_Detail_QtyID
                  From ( Select distinct Order_No, Product_No, Ref_No From Order_Detail od with(NoLock,NoWait)
                  Where od.Order_DetailID = @Order_DetailID) tmp
                  Inner Join Order_PKO op with(NoLock,NoWait) on op.Order_No = tmp.Order_No And op.Product_No = tmp.Product_No And op.Ref_No = tmp.Ref_No
                  Inner Join Order_PKO_Detail opd with(NoLock,NoWait) on op.Order_PKOID = opd.Order_PKOID
                  Inner Join Order_PKO_Detail_Qty opq with(NoLock,NoWait) on opd.Order_PKO_DetailID = opq.Order_PKO_DetailID
                  left Outer Join (Select Size from Order_Qty Where Order_DetailID = @Order_DetailID) s on opq.Size = s.Size Where s.Size is null) 
               End
*/               
            End 
            
            --取消Trigger_Order_Qty 由改由API統計Total Qty
            if(@ROWCOUNT > 0)
            Begin
               Update Order_Detail set Qty = isnull((Select Sum(oq.Qty) From Order_Qty oq with(NoLock, NoWait) Where oq.Order_DetailID = @Order_DetailID) ,0)
               Where Order_DetailID = @Order_DetailID
            End

/*            
            Set @AssortmentID = (Select top 1 AssortmentID from [dbo].[Assortment] Where Order_DetailID = @Order_DetailID)
            if(isnull(@AssortmentID,0) = 0 )
            begin
               Insert into [dbo].[Assortment] (Order_DetailID, Cartons, PrepackID, Prepack, Unit_Qty)
               Select @Order_DetailID as Order_DetailID, 1 as Cartons, '-' as PrepackID, 0 as Prepack, 0 as Unit_Qty;
               set @AssortmentID = SCOPE_IDENTITY();
            end
            set @ROWCOUNT1 = @@ROWCOUNT;

            Update Assortment_Detail set Qty = @Qty
            Where AssortmentID = @AssortmentID
            And Size = @Size
            And @Qty <> 0;

            set @ROWCOUNT2 = @@ROWCOUNT;

            if(@ROWCOUNT2 = 0 And  @Qty > 0)
            Begin
               Insert Assortment_Detail (AssortmentID, Size, Qty, Prerange)
               Select @AssortmentID as AssortmentID, @Size, @Qty, 0 as Prerange                
               set @ROWCOUNT3 = @@ROWCOUNT;
            End

            if(@Qty = 0)
            Begin
               Delete From Assortment_Detail
               Where AssortmentID = @AssortmentID
               And Size = @Size;
               set @ROWCOUNT4 = @@ROWCOUNT;
            End   
*/
         end
         COMMIT;
         END TRY
         BEGIN CATCH
            ROLLBACK;
         END CATCH

      End
      
      `,req.body);
   break;
   case 4:
      req.body.Order_DetailID = req.body.Order_DetailID ? req.body.Order_DetailID.join() : '';
      strSQL += format(`
      Declare @ROWCOUNT int = 0, @ROWCOUNT1 int = 0, @ROWCOUNT2 int = 0;

      if(@Order_ApproveID = 0)
      begin
		   Declare @TmpTable table (AssortmentID int, Order_DetailID int, Prerange smallint, Size real, Qty float)

         Insert @TmpTable(Order_DetailID, Prerange, Size, Qty)
         Select od.Order_DetailID, Prerange, Size, oq.Qty
         From Order_Detail od With(NoLock,NoWait)
         Inner Join Order_Qty oq With(NoLock,NoWait) on od.Order_DetailID = oq.Order_DetailID
         Where od.Order_No = {Order_No} And od.Size_Status = 1 And od.Order_DetailID in ({Order_DetailID})
               
         Delete From [dbo].[Assortment]
         From [dbo].[Assortment] a With(NoLock,NoWait)
         Inner Join (Select Order_DetailID From @TmpTable Group by Order_DetailID) t on a.Order_DetailID = t.Order_DetailID
         set @ROWCOUNT = @@ROWCOUNT;

         Insert into [dbo].[Assortment] (Order_DetailID, Cartons, PrepackID, Prepack, Unit_Qty)
         Select t.Order_DetailID as Order_DetailID, 1 as Cartons, '-' as PrepackID, 0 as Prepack, 0 as Unit_Qty
         From @TmpTable t
         Left Outer Join [dbo].[Assortment] a With(NoLock,NoWait) on t.Order_DetailID = a.Order_DetailID
         Where a.AssortmentID is null
         Group by t.Order_DetailID;
         set @ROWCOUNT1 = @@ROWCOUNT;

         Update @TmpTable set AssortmentID = a.AssortmentID
         From @TmpTable t
         Inner Join Assortment a With(NoLock,NoWait) on t.Order_DetailID = a.Order_DetailID

         Insert Assortment_Detail (AssortmentID, Size, Qty, Prerange)
         Select t.AssortmentID as AssortmentID, t.Size, t.Qty, t.Prerange                
         From @TmpTable t
         Where t.Qty <> 0 
         set @ROWCOUNT2 = @@ROWCOUNT;

      End      
      `,req.body);
   break;
   case 5:
      strSQL += format(`
      Declare @ROWCOUNT int = 0, @ROWCOUNT1 int = 0, @ROWCOUNT2 int = 0;

      if(@Order_ApproveID = 0)
      begin
         Insert Order_Size (Order_No, Size)
         Select {Order_No} as Order_No, t.Size
         From (
            Select Size
            From Order_Detail od with(NoLock, NoWait)
            inner Join Assortment a with(NoLock, NoWait) on od.Order_DetailID = a.Order_DetailID
            inner Join Assortment_Detail ad with(NoLock, NoWait) on a.AssortmentID = ad.AssortmentID
            Where od.Order_No = {Order_No}
            Group by Size
         ) t
         Left outer Join Order_Size os with(NoLock, NoWait) on os.Size = t.Size and os.Order_No = {Order_No}
         Where os.Size is null
      End      
      `,req.body);
   break;
}   

strSQL += format(`
Declare @Flag int;

Set @Flag = ${ 
   req.body.Mode == 3 ? '@ROWCOUNT + @ROWCOUNT1 + @ROWCOUNT2 + @ROWCOUNT3 + @ROWCOUNT4' : req.body.Mode == 4 ?  '@ROWCOUNT + @ROWCOUNT1 + @ROWCOUNT2' : (req.body.Mode == 2 || (req.body.Mode == 1 && req.body.Name == 'Orig_Shipping_Date')  ) ?  '@ROWCOUNT':'@@ROWCOUNT'
};
Select @Flag as Flag;

${ req.body.Mode == 1 && req.body.Name == 'Product_No' ? `Select @Product_No_Flag as Product_No_Flag, @Customer_Product_No as Customer_Product_No, @Pattern_No as Pattern_No, @CCC_Code as CCC_Code,  @Article_Name as Article_Name;` : ''}
${ req.body.Mode == 1 && (req.body.Name == 'MTR_Declare_Rate' || req.body.Name == 'Est_Process_Cost') ? `Select @Factory_Price as Factory_Price; set @Flag = 0; ` : ''}
${ req.body.Mode == 3 ? 'Select od.Qty, od.Size_Status From Order_Detail od with(NoLock,NoWait) where od.Order_DetailID = {Order_DetailID};' : ''}

if(@Flag > 0 )
Begin
   Update [dbo].[Orders] Set UserID = isnull(UserID, N'${req.UserID}'), Data_Updater = N'${req.UserID}'
   , Data_Update = GetDate()
   where Order_No = {Order_No}
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

//Maintain Order Size
router.post('/Order_Size_Maintain',  function (req, res, next) {
   console.log("Call Order_Size_Maintain Api:",req.body);   
   var strSQL = "";
   
   // req.body.Mode === 0 表示新增 
   // req.body.Mode === 1 表示修改 
   // req.body.Mode === 2 表示刪除 
   // req.body.Mode === 3 表示刪除全部
   req.body.Order_No = req.body.Order_No ? `N'${req.body.Order_No.replace(/'/g, "''")}'` : `''`;      
  
   strSQL = format(`
   Declare @Order_ApproveID int , @RowCount int= 0
   Set @Order_ApproveID = (SELECT sum(case when a.Approve_Date is null then 0 else 1 end )
                            FROM Order_Detail od WITH (NoWait, Nolock) 
                            Left Outer Join Produce p with(NoLock,NoWait) on p.Produce_No = od.Produce_No
                            Left Outer Join Order_Approve a WITH (NoWait, Nolock) on p.Order_ApproveID = a.Order_ApproveID 
                            Where od.Order_No = {Order_No})
   `,req.body);

   switch(req.body.Mode){
      case 0:
         var strSQL1 = '';

         req.body.Size.forEach((item)=>{
            strSQL1 += format(`Insert into @tmpTable (Size) values ({0});`,item)
         })

         strSQL += format(`
         if(@Order_ApproveID = 0)
         begin 
            Declare @tmpTable table(RecNo int IDENTITY(1,1), Size real)

            ${strSQL1}

            Insert into [dbo].[Order_Size] (Order_No, Size, Prerange)
            Select {Order_No} as Order_No, t.Size, 0 as Prerange
            From @tmpTable t
            Left outer Join Order_Size os WITH (NoWait, Nolock) on t.Size = os.Size And os.Order_No = {Order_No}
            Where os.Size is null;
            set @RowCount = @@ROWCOUNT;
         End 
            `,req.body);
      break;
      case 1:
         strSQL += format(`
         if(@Order_ApproveID = 0)
         begin 
            Update [dbo].[Order_Size] Set [{Name}] = {Value}
            where Order_SizeID = {Order_SizeID};
            set @RowCount = @@ROWCOUNT;                         
         End
         `,req.body);
      break;
      case 2:
         strSQL += format(`
         if(@Order_ApproveID = 0)
         begin 
            Delete From Order_Size 
            Where Order_SizeID = {Order_SizeID};
            set @RowCount = @@ROWCOUNT;
         End
         `,req.body);
      break;
      case 3:
         strSQL += format(`
         if(@Order_ApproveID = 0)
         begin
            Delete From Order_Size
            Where Order_No = {Order_No};
            set @RowCount = @@ROWCOUNT;
         End
      `,req.body);
      break;
   }   
   
   strSQL += format(`
   Select @RowCount as Flag;
   if(@RowCount > 0 )
   Begin
      Update [dbo].[Orders] Set UserID = isnull(UserID, N'${req.UserID}'), Data_Updater = N'${req.UserID}'
      , Data_Update = GetDate()
      where Order_No = {Order_No}
   End
   `, req.body)    
    //console.log(strSQL)
   // res.send({Flag:true});

   db.sql(req.SiteDB, strSQL)
      .then((result) => {
         res.send({Flag:result.recordsets[0][0].Flag > 0});
      }).catch((err) => {
         console.log(err);
         res.status(500).send(err);
      })
   
});

//Maintain Expense
router.post('/Expense_Detail_Maintain',  function (req, res, next) {
   console.log("Call Expense_Detail_Maintain Api:",req.body);
   var strSQL = "";

   
   //Mode == 0 Insert Order Detail's Expense Data
   //Mode == 1 Modify Order Detail's Expense Data
   //Mode == 2 Delete Order Detail's Expense Data
   //Mode == 3 Insert Expense Data for Order
   //Mode == 4 Delete Expense Data for Order
   //Mode == 5 Delete Expense Detail Data

   req.body.Order_No = req.body.Order_No ? `N'${req.body.Order_No.replace(/'/g, "''")}'` : `''`;
   
   if(req.body.Mode === 0 || req.body.Mode === 3) {
      req.body.CustomerID = req.body.CustomerID ? `N'${req.body.CustomerID.trim().substring(0,15).replace(/'/g, "''")}'` : `''`;
      req.body.Category = req.body.Category ? `N'${req.body.Category.trim().substring(0,10).replace(/'/g, "''")}'` : `''`;
      req.body.Description = req.body.Description ? `N'${req.body.Description.trim().substring(0,30).replace(/'/g, "''")}'` : `''`;
      req.body.Doc = req.body.Doc ? `N'${req.body.Doc.trim().substring(0,10).replace(/'/g, "''")}'` : `''`;
      req.body.Rate = req.body.Rate ? parseFloat(req.body.Rate / 100) : 0;
      req.body.Expense = req.body.Expense ? parseFloat(req.body.Expense) : 0;
   }
   
   if(req.body.Mode === 1 && (req.body.Name == 'CustomerID' || req.body.Name == 'Category' || req.body.Name == 'Description' || req.body.Name == 'Doc')) {
      var fieldSize = 0;
      switch(req.body.Name) {
         case 'CustomerID':
            fieldSize = 15;
            break;
         case 'Category':
            fieldSize = 10;
            break;
         case 'Description':
            fieldSize = 30;
            break;
         case 'Doc':
            fieldSize = 10;
            break;
      }
      req.body.Value = req.body.Value ? `N'${req.body.Value.trim().substring(0,fieldSize).replace(/'/g, "''")}'` : `''`; 
      //console.log('req.body.Value=', req.body.Value)
   }

   if(req.body.Mode === 1 && (req.body.Name == 'Rate' || req.body.Name == 'Expense')) {
      req.body.Value = req.body.Value ? parseFloat(req.body.Value / (req.body.Name == 'Rate' ? 100:1)) : 0;
      //console.log('req.body.Value=', req.body.Value)
   }
   
   switch(req.body.Mode){
      case 0:
         strSQL = format(`
            Declare @Order_DetailID int = {Order_DetailID}, @Order_No varchar(18) = {Order_No}
            Declare @Calculate_By int = {Calculate_By}
            , @Calculate_From int = {Calculate_From}
            , @Rate float = {Rate}
            , @Expense float = {Expense}
           
            Insert into [dbo].[Order_Detail_Expense] ([Order_DetailID], [CustomerID], [Category] ,[Calculate_From] ,[Calculate_By] ,[Description] ,[Doc] ,[Rate] ,[Expense])
            Select {Order_DetailID} as Order_DetailID, {CustomerID} as CustomerID, {Category} as Category, {Calculate_From} as Calculate_From, {Calculate_By} as Calculate_By, {Description} as Description, {Doc} as Doc
            , (case when @Calculate_By = 1 
               then
                   case when @Calculate_From = 1
                     then @Rate
                     else isnull(@Rate * (isnull(od.Factory_Price / nullif(od.Unit_Price ,0),1)) * (isnull(c.Currency_Rate/nullif(p.Currency_Rate,0),0)) , 0)
                     end
               else
                     case when @Calculate_From = 1
                     then isnull(@Expense / nullif(Unit_Price, 0), 0)
                     else isnull(@Expense / nullif(Factory_Price, 0) * (isnull(od.Factory_Price / nullif(od.Unit_Price ,0),1)) * (isnull(c.Currency_Rate/nullif(p.Currency_Rate,0),0)) , 0)
                     end
               end
             ) as Rate
             , (case when @Calculate_By = 1
               then 
                (case when @Calculate_From = 1
                     then @Rate
                     else isnull(@Rate * (isnull(od.Factory_Price / nullif(od.Unit_Price ,0),1)) * (isnull(c.Currency_Rate/nullif(p.Currency_Rate,0),0)) , 0)
                     end	) * Unit_Price
               else @Expense
               end	
             ) as Expense
             From Order_Detail od with(NoLock, NoWait) 
             inner Join Orders o with(NoLock, NoWait) on od.Order_No = o.Order_No
             Left Outer Join Produce pe with(NoLock, NoWait) on pe.Produce_No = od.Produce_No
             Left outer Join Order_Approve a WITH (NoWait, Nolock) on pe.Order_ApproveID = a.Order_ApproveID
             inner Join [@Currency_Rate] c with(NoLock, NoWait) on o.Currency = c.Currency and Convert(Date, o.Order_Date) =  c.Exchange_Date
             inner Join [@Currency_Rate] p with(NoLock, NoWait) on o.PO_Currency = p.Currency and Convert(Date, o.Order_Date) = p.Exchange_Date
             Where od.Order_DetailID = @Order_DetailID And a.Approve_Date is null;
            `,req.body);
      break;
      case 1:
         switch(req.body.Name){
            case 'Calculate_By':
            case 'Calculate_From':
            case 'Rate':
            case 'Expense':
               strSQL = format(`
               Declare @Order_DetailID int = {Order_DetailID}, @Order_No varchar(18) = {Order_No}
               Declare @Calculate_By int
               , @Calculate_From int
               , @Rate float
               , @Expense float
               , @Unit_Price float
               , @Factory_Price float
               , @Passing_Rate float
               , @Price_Rate float
               
               Select @Calculate_By = ${req.body.Name == 'Calculate_By' ? '{Value}':'Calculate_By'}
               , @Calculate_From = ${req.body.Name == 'Calculate_From' ? '{Value}':'isnull(ode.Calculate_From,1)'}
               , @Rate = ${req.body.Name == 'Rate' ? '{Value}':'Rate'}
               , @Expense = ${req.body.Name == 'Expense' ? '{Value}':'Expense'}
               From Order_Detail_Expense ode with(Nolock,NoWait)
               Where Order_Detail_ExpenseID = {Order_Detail_ExpenseID}
               

               Set @Passing_Rate = isnull((Select c.Currency_Rate/nullif(p.Currency_Rate,0)
               From Orders o with(NoLock, NoWait) 
               inner Join [@Currency_Rate] c with(NoLock, NoWait) on o.Currency = c.Currency and Convert(Date,o.Order_Date) =  c.Exchange_Date
               inner Join [@Currency_Rate] p with(NoLock, NoWait) on o.PO_Currency = p.Currency and Convert(Date,o.Order_Date) = p.Exchange_Date
               Where Order_No = @Order_No),1)
               
               
               Select @Unit_Price = Unit_Price, @Factory_Price = Factory_Price
               From Order_Detail od with(NoLock, NoWait) 
               Where od.Order_DetailID = @Order_DetailID
               
               Set @Price_Rate = isnull(@Factory_Price / nullif(@Unit_Price ,0),1)
               
               
               if(@Calculate_By = 1)
               Begin
                  --print 'Calculate_By = 1'
                  Set @Rate = case when @Calculate_From = 1 
                  then @Rate
                  else isnull(@Rate * @Price_Rate * @Passing_Rate , 0)
                  end
               
                  Set @Expense = @Rate * @Unit_Price
               End
               Else
               Begin
                  --print 'Calculate_By = 2' 
                  Set @Rate = case when @Calculate_From = 1 
                  then isnull(@Expense / nullif(@Unit_Price, 0), 0)
                  else isnull(@Expense / nullif(@Factory_Price, 0) * @Price_Rate * @Passing_Rate , 0)
                  end               
               End
      
               Update [dbo].[Order_Detail_Expense] Set Calculate_From = @Calculate_From
               , Calculate_By = @Calculate_By
               , Rate = @Rate
               , Expense = @Expense
               where Order_Detail_ExpenseID = {Order_Detail_ExpenseID}
               And (SELECT case when a.Approve_Date is null then 0 else 1 end 
                    FROM Order_Detail od WITH (NoWait, Nolock) 
                    Left Outer Join Produce p with(NoLock,NoWait) on od.Produce_No = p.Produce_No
                    Left outer Join Order_Approve a WITH (NoWait, Nolock) on p.Order_ApproveID = a.Order_ApproveID 
                    Where od.Order_DetailID = @Order_DetailID) = 0;
               `,req.body);   
            break;
            default:
               strSQL = format(`
               Update [dbo].[Order_Detail_Expense] Set [{Name}] = {Value}
               where Order_Detail_ExpenseID = {Order_Detail_ExpenseID}
               And (SELECT case when a.Approve_Date is null then 0 else 1 end 
                    FROM Order_Detail od WITH (NoWait, Nolock) 
                    Left Outer Join Produce p with(NoLock,NoWait) on od.Produce_No = p.Produce_No
                    Left outer Join Order_Approve a WITH (NoWait, Nolock) on p.Order_ApproveID = a.Order_ApproveID 
                    Where od.Order_DetailID = {Order_DetailID}) = 0;
            `,req.body);   
            break;
         }
      break;
      case 2:
         strSQL = format(`
            Delete From Order_Detail_Expense 
            Where Order_Detail_ExpenseID = {Order_Detail_ExpenseID}
            And (SELECT case when a.Approve_Date is null then 0 else 1 end 
                    FROM Order_Detail od WITH (NoWait, Nolock) 
                    Left Outer Join Produce p with(NoLock,NoWait) on od.Produce_No = p.Produce_No
                    Left outer Join Order_Approve a WITH (NoWait, Nolock) on p.Order_ApproveID = a.Order_ApproveID 
                    Where od.Order_DetailID = {Order_DetailID}) = 0;
         `,req.body);
      break;
      case 3:
         strSQL = format(`
         Declare @Calculate_By int = {Calculate_By}
         , @Calculate_From int = {Calculate_From}
         , @Rate float = {Rate}
         , @Expense float = {Expense}

            Insert into [dbo].[Order_Detail_Expense] ([Order_DetailID], [CustomerID], [Category] ,[Calculate_From] ,[Calculate_By] ,[Description] ,[Doc] ,[Rate] ,[Expense])
            Select od.Order_DetailID, {CustomerID} as CustomerID, {Category} as Category, {Calculate_From} as Calculate_From, {Calculate_By} as Calculate_By, {Description} as Description, {Doc} as Doc
            , (case when @Calculate_By = 1 
               then
                   case when @Calculate_From = 1
                     then @Rate
                     else isnull(@Rate * (isnull(od.Factory_Price / nullif(od.Unit_Price ,0),1)) * (isnull(c.Currency_Rate/nullif(p.Currency_Rate,0),0)) , 0)
                     end
               else
                     case when @Calculate_From = 1
                     then isnull(@Expense / nullif(Unit_Price, 0), 0)
                     else isnull(@Expense / nullif(Factory_Price, 0) * (isnull(od.Factory_Price / nullif(od.Unit_Price ,0),1)) * (isnull(c.Currency_Rate/nullif(p.Currency_Rate,0),0)) , 0)
                     end
               end
             ) as Rate
             , (case when @Calculate_By = 1 
               then 
                (case when @Calculate_From = 1
                     then @Rate
                     else isnull(@Rate * (isnull(od.Factory_Price / nullif(od.Unit_Price ,0),1)) * (isnull(c.Currency_Rate/nullif(p.Currency_Rate,0),0)) , 0)
                     end	) * Unit_Price
               else @Expense
               end	
             ) as Expense
             From Order_Detail od with(NoLock, NoWait) 
             Inner Join Orders s with(NoLock,NoWait) on od.Order_No = s.Order_No
             Left outer Join Produce o with(NoLock, NoWait) on od.Produce_No = o.Produce_No
             Left outer Join Order_Approve a WITH (NoWait, Nolock) on o.Order_ApproveID = a.Order_ApproveID
             inner Join [@Currency_Rate] c with(NoLock, NoWait) on s.Currency = c.Currency and Convert(Date,s.Order_Date) = c.Exchange_Date
             inner Join [@Currency_Rate] p with(NoLock, NoWait) on s.PO_Currency = p.Currency and Convert(Date,s.Order_Date) = p.Exchange_Date
             Where od.Order_No = {Order_No} And a.Approve_Date is null;
            `,req.body);
      break;
      case 4:
         strSQL = format(`
            Delete From Order_Detail_Expense 
            Where Order_DetailID in (
            Select od.Order_DetailID
               From Order_Detail od 
               Left Outer Join Produce o on od.Produce_No = o.Produce_No
               Left outer Join Order_Approve a WITH (NoWait, Nolock) on o.Order_ApproveID = a.Order_ApproveID
            Where od.Order_No = {Order_No}
            And a.Approve_Date is null);
         `,req.body);
      break;
      case 5:
         strSQL = format(`
         Declare @Category varchar(10) = N'{Category}'
         , @CustomerID varchar(15) = N'{CustomerID}'
         , @Calculate_By int = {Calculate_By}
         , @Calculate_From int = {Calculate_From}
         , @Value varchar(255) = N'{Value}'
         , @Description varchar(30) = N'{Description}'
         , @Doc varchar(10) = N'{Doc}'
         
         Delete ode
         From Order_Detail_Expense ode WITH (NoWait, Nolock)
         Inner Join Order_Detail od WITH (NoWait, Nolock) on ode.Order_DetailID = od.Order_DetailID
         Left outer Join Produce o WITH (NoWait, Nolock) on od.Produce_No = o.Produce_No
         Left outer Join Order_Approve a WITH (NoWait, Nolock) on o.Order_ApproveID = a.Order_ApproveID
         Where ode.Category = @Category
         And ode.CustomerID = @CustomerID
         And ode.Calculate_By = @Calculate_By
         And isnull(ode.Calculate_From,1) = @Calculate_From
         And (
            case when ode.Calculate_By = 1 then
            Format(case when isnull(ode.Calculate_From,1) = 1 then ode.Rate else isnull(ode.Expense / nullif(od.Factory_Price,0) , 0) end , 'P2')
            else
            Format(case when isnull(ode.Calculate_From,1) = 1 then isnull(ode.Rate * od.Unit_Price,0) else isnull(ode.Expense, 0) End, 'N3')
            End
         ) = @Value
         And isnull(ode.Description,'') = @Description
         And isnull(ode.Doc,'') = @Doc
         And od.Order_No = {Order_No}
         And a.Approve_Date is null;
         `,req.body);
      break;
   }   
   
   strSQL += format(`
   Declare @Flag int;
   Set @Flag = @@ROWCOUNT;
   Select @Flag as Flag;
   if(@Flag > 0 )
   Begin
      Update [dbo].[Orders] Set UserID = isnull(UserID, N'${req.UserID}'), Data_Updater = N'${req.UserID}'
      , Data_Update = GetDate()
      where Order_No = {Order_No}
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

//Get Selected Detail Info
router.post('/Selected_Detail_Info', function (req, res, next) {
   console.log("Call Selected_Detail_Info Api :", req.body);

   req.body.Order_No = req.body.Order_No ? `N'${req.body.Order_No.trim().substring(0,18).replace(/'/g, "''")}'` : `''`;

   var strSQL = format(`
   Declare @Order_No varchar(20) = {Order_No}
   , @Order_DetailID int = {Order_DetailID}
   , @Material_Declare_Rate float
   , @PO_Currency varchar(4)   
   , @Produce_No varchar(20)
   , @MTR_Est_Cost_HeadQuarter float
   , @MTR_Est_Cost_Factory float
   , @MTR_Est_Cost_Customer float
  
   Declare @Material_Est_Cost table (Purchase_ResponsibleID int, Purchase_Responsible Nvarchar(20), Material_Cost float default(0))

   Select @PO_Currency = o.PO_Currency 
   from Orders o with(NoLock,NoWait)
   Where Order_No = @Order_No
   
   --0 Expense Detail
   Select ode.Order_Detail_ExpenseID, od.Order_DetailID, ode.Calculate_By, isnull(ode.Calculate_From,1) as Calculate_From, ode.Category, ode.CustomerID, ode.Description, ode.Doc
   , Format(case when isnull(ode.Calculate_From,1) = 1 then ode.Rate else isnull(ode.Expense / nullif(od.Factory_Price,0) , 0) end , 'P2') as Rate_F
   , case when isnull(ode.Calculate_From,1) = 1 then ode.Rate * 100 else isnull(ode.Expense / nullif(od.Factory_Price,0) , 0) * 100 end as Rate
   , Format(case when isnull(ode.Calculate_From,1) = 1 then isnull(ode.Rate * od.Unit_Price,0) else isnull(ode.Expense, 0) End, 'N3') as Expense_F
   , case when isnull(ode.Calculate_From,1) = 1 then isnull(ode.Rate * od.Unit_Price,0) else isnull(ode.Expense, 0) End as Expense
   , Format(isnull(Sum(ode.Rate * od.Unit_Price),0),'N3') as Expense_Amount
   From Order_Detail od With(Nolock,NoWait) 
   INNER JOIN Order_Detail_Expense ode With(Nolock,NoWait) on ode.Order_DetailID = od.Order_DetailID
   Where od.Order_DetailID = @Order_DetailID
   Group by ode.Order_Detail_ExpenseID, od.Order_DetailID, ode.Calculate_By, ode.Calculate_From, ode.Category, ode.CustomerID
   , ode.Description, ode.Doc, ode.Rate, od.Unit_Price, od.Factory_Price, ode.Expense

   --1 依會計室財稅需求 計算PO Price

   Select @Material_Declare_Rate = isnull(MTR_Declare_Rate, (Select MTR_Declare_Rate from Control))  
   , @Produce_No = Produce_No
   From Order_Detail 
   Where Order_DetailID = {Order_DetailID};
   
   Select @MTR_Est_Cost_HeadQuarter = isnull(MTR_Est_Cost_HeadQuarter,0) / PO_Rate.Currency_Rate
   , @MTR_Est_Cost_Factory = isnull(MTR_Est_Cost_Factory,0) / PO_Rate.Currency_Rate
   , @MTR_Est_Cost_Customer = isnull(MTR_Est_Cost_Customer,0) / PO_Rate.Currency_Rate
   From Produce p with(NoLock, NoWait)
   Inner Join Purchase_Project pp with(NoLock, NoWait)on pp.Purchase_Project_No = p.Purchase_Project_No
   Inner Join [dbo].[@Currency_Rate] PO_Rate on PO_Rate.Currency = @PO_Currency And PO_Rate.Exchange_Date = convert(Date, pp.Apply_Date)
   Where p.Produce_No = @Produce_No

   insert @Material_Est_Cost(Purchase_ResponsibleID, Purchase_Responsible, Material_Cost)
   Select s.Purchase_ResponsibleID, s.Purchase_Responsible, 
   case s.Purchase_ResponsibleID when 0 then @MTR_Est_Cost_HeadQuarter
   when 1 then @MTR_Est_Cost_Factory
   when 2 then @MTR_Est_Cost_Customer
   else 0 end as Material_Cost
   From Purchase_Responsible s with(NoLock,NoWait)

   Select 0 as SortID, t.Purchase_ResponsibleID, t.Purchase_Responsible, Round(t.Material_Cost,2) as Material_Cost, Round(Material_Cost * case when Purchase_ResponsibleID = 1 then 1 else @Material_Declare_Rate end ,2) as Material_Cost_New From @Material_Est_Cost t
   Union
   Select 1 as SortID, 99 as Purchase_ResponsibleID, 'Total' as Purchase_Responsible, Round(Sum(t.Material_Cost),2) as Material_Cost, Round(Sum(Material_Cost * case when Purchase_ResponsibleID = 1 then 1 else @Material_Declare_Rate end),2) as Material_Cost_New From @Material_Est_Cost t

   --2 依Order_DetailID 取得Assortment Data
--   Select a.AssortmentID, Prepack, PrepackID, Cartons, Unit_Qty, T_Qty
--   From Assortment a with(NoLock,NoWait)
--   Where a.Order_DetailID = @Order_DetailID

   `
   , req.body );
   //console.log(strSQL);

   db.sql(req.SiteDB, strSQL)
      .then((result) => {
         var DataSet = {Expense_Detail:result.recordsets[0]
            ,Factory_cost:result.recordsets[1]
            //,Assortment:result.recordsets[2]
         }
         res.send(DataSet);
      }).catch((err) => {
         console.log(err);
         res.status(500).send(err);
      })

});

//取得Product資料
router.post('/Product_Info', function (req, res, next) {
   console.log("Call Product_Info Api Product_Info:", req.body);
   req.body.Product_No = req.body.Product_No ? `${req.body.Product_No.replace(/'/g, "''")}` : '%';
   req.body.Order_No = req.body.Order_No ? `N'${req.body.Order_No.trim().substring(0,18).replace(/'/g, "''")}'` : `''`;

   var strSQL = format(`SELECT top 1000 p.Product_No
   , case when isnull(p.Customer_Product_No,'') = '' then p.Product_No else p.Customer_Product_No end as Customer_Product_No
   , isnull(s.Pattern_No,'') as Pattern_No
   , isnull(p.Color_Code,'') +' '+ isnull(p.Color,'') as Color
   , isnull(s.Size_Run,'') as Size_Run
   , isnull(s.Main_Material,'') as Main_Material
   , isnull(Photo_Month,'') as Photo_Month
   , isnull(Sketch_Month,'') as Sketch_Month
   FROM Product as p WITH (NoWait, Nolock)
   Inner Join Style as s WITH (NoLock, NoWait) on p.Style_No = s.Style_No
   Inner Join Orders q WITH(NoLock, NoWait) on s.Brand = q.Brand
   Where q.Order_No = {Order_No}
   And ('{Product_No}' = '%' or Product_No like N'{Product_No}%' )

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


//Get Assortment
router.post('/Assortment_Info', function (req, res, next) {
   console.log("Call Assortment Api :", req.body);

   req.body.Order_DetailID = req.body.Order_DetailID ? req.body.Order_DetailID : 0;
   req.body.AssortmentID = req.body.AssortmentID ? req.body.AssortmentID : 0;
   
   //Mode == 0 Get Assortment Data
   //Mode == 1 Get Assortment Detail Data
   var strSQL = format(`   
   Declare @Mode int = {Mode}
   
   --0 Assortment
   if(@Mode = 0)
   Begin
      Select a.AssortmentID, Prepack, PrepackID, Cartons, Unit_Qty, T_Qty
      From Assortment a with(NoLock,NoWait)
      Where a.Order_DetailID = {Order_DetailID}
   End

   --1 Assortment Detail
   if(@Mode = 1)
   Begin
      SELECT p.[Assortment_DetailID], p.[AssortmentID], ps.[Size_Name] as Size, Qty, Prerange
      FROM Assortment_Detail p with(NoLock, NoWait)
      Inner Join Product_Size ps with(NoLock, NoWait) on p.Size = ps.SizeID
      Where p.AssortmentID = {AssortmentID}
      --Order by p.Prerange desc, ps.SizeID
   End
    `
   , req.body );
   //console.log(strSQL);  

   db.sql(req.SiteDB, strSQL)
      .then((result) => {
         var DataSet = req.body.Mode == 0 ? {Assortment:result.recordsets[0]} : {Assortment_Detail:result.recordsets[0]};
         res.send(DataSet);
      }).catch((err) => {
         console.log(err);
         res.status(500).send(err);
      })
});

//Maintain Assortment
router.post('/Assortment_Maintain',  function (req, res, next) {
   console.log("Call Assortment_Maintain Api:",req.body);
   var strSQL = "";

   // req.body.Mode === 0 表示新增
   // req.body.Mode === 1 表示修改
   // req.body.Mode === 2 表示刪除

   req.body.Order_No = req.body.Order_No ? `N'${req.body.Order_No.trim().substring(0,18).replace(/'/g, "''")}'` : `''`; 
   
   if(req.body.Mode === 0 ) {
      req.body.PrepackID = req.body.PrepackID ? `N'${req.body.PrepackID.trim().substring(0,10).replace(/'/g, "''")}'` : `''`;
   }

   if(req.body.Mode === 1 && 
      (req.body.Name == 'PrepackID') 
      ) {
      req.body.Value = req.body.Value ? `N'${req.body.Value.trim().substring(0,10).replace(/'/g, "''")}'` : `''`; 
   }
   
   strSQL = format(`
   Declare @ROWCOUNT int=0
   , @ROWCOUNT1 int=0
   , @ROWCOUNT2 int=0
   , @Order_ApproveID int
   , @Size_Status int=0
   Set @Order_ApproveID = (SELECT case when a.Approve_Date is null then 0 else 1 end 
                          FROM Order_Detail od WITH (NoWait, Nolock) 
                          Left Outer Join Produce p with(NoLock,NoWait) on p.Prodce_No = od.Produce_No
                          Left Outer Join Order_Approve a WITH (NoWait, Nolock) on p.Order_ApproveID = a.Order_ApproveID 
                          Where od.Order_DetailID = {Order_DetailID})

   BEGIN TRANSACTION;  
   BEGIN TRY

   if(@Order_ApproveID = 0)
   begin
      update Order_Detail set Size_Status = 2
      Where isnull(Size_Status,0) = 0 And Order_DetailID = {Order_DetailID};
   end

   Select @Size_Status = Size_Status 
   from Order_Detail 
   Where Order_DetailID = {Order_DetailID};
   `, req.body);

   switch(req.body.Mode){
      case 0:
         strSQL += format(`
         if(@Order_ApproveID = 0)
         begin
            Insert into [dbo].[Assortment] (Order_DetailID, Cartons, PrepackID, Prepack, Unit_Qty)
            Select {Order_DetailID} as Order_DetailID, {Cartons} as Cartons, {PrepackID} as PrepackID, {Prepack} as Prepack, {Unit_Qty} as Unit_Qty; 
            set @ROWCOUNT = @@ROWCOUNT;
         End            
         
         `, req.body);
         break;
      case 1:        
         strSQL += format(`
         if(@Order_ApproveID = 0)
         begin
            Update [dbo].[Assortment] Set 
            T_Qty = isnull(t.Qty,0) * case when ${req.body.Name == 'Prepack' ? '{Value}':'Prepack'} = 1 then ${req.body.Name == 'Cartons' ? '{Value}': 'isnull(Cartons,0)'} else 1 end
            , Unit_Qty = case when ${req.body.Name == 'Prepack' ? '{Value}':'Prepack'} = 1 then isnull(t.Qty ,0) else ${req.body.Name == 'Unit_Qty' ? '{Value}':'Unit_Qty'} end
            , Cartons  = case when ${req.body.Name == 'Prepack' ? '{Value}':'Prepack'} = 1 then ${req.body.Name == 'Cartons' ? '{Value}': 'Cartons'} else CEILING(isnull(t.Qty / nullif(${req.body.Name == 'Unit_Qty' ? '{Value}': 'Unit_Qty'},0) ,0)) end                        
            ${req.body.Name == 'Prepack' ? ', Prepack = {Value}':''}
            ${req.body.Name == 'PrepackID' ? ', PrepackID = {Value}':''}
            From Assortment a
            Left outer Join (
               Select AssortmentID, Sum(Qty) as Qty
               From Assortment_Detail ad
               Where ad.AssortmentID = {AssortmentID}
               Group by AssortmentID
            ) t on t.AssortmentID = a.AssortmentID
            where a.AssortmentID = {AssortmentID}            
            ${req.body.Name == 'Cartons' ? 'And Prepack = 1': ''}
            ${req.body.Name == 'Unit_Qty' ? 'And Prepack = 0': ''};
            Set @ROWCOUNT = @@ROWCOUNT;
         End
         
         `, req.body);
         break;
      case 2:
         strSQL += format(`    
         if(@Order_ApproveID = 0)
         begin
            Delete FROM [dbo].[Assortment]
            where AssortmentID = {AssortmentID};
            Set @ROWCOUNT = @@ROWCOUNT;
         End
         
         `, req.body);
         break;
   }


      strSQL += format(`
      if(@Order_ApproveID = 0 and @Size_Status = 2)
      Begin

         Delete from Order_Qty where Order_DetailID = {Order_DetailID};
         insert Order_Qty(Order_DetailID, Size, Qty, Prerange)
         Select {Order_DetailID} as Order_DetailID, Size, Sum(Qty) as Qty, Prerange
         From
         (Select Size, case when abs(a.Prepack) = 1 then a.Cartons else 1 end * Sum(Qty) as Qty, Prerange
         From Assortment a
         Inner Join Assortment_Detail ad on a.AssortmentID = ad.AssortmentID
         where Order_DetailID = {Order_DetailID}
         Group by Size, Prerange, a.Prepack, a.Cartons) tmp
         Group by Size, Prerange;
       
         set @ROWCOUNT1 = @@ROWCOUNT;

         --取消Trigger_Order_Qty 由改由API統計Total Qty
         Update Order_Detail set Qty = isnull((Select Sum(oq.Qty) From Order_Qty oq with(NoLock, NoWait) Where oq.Order_DetailID = {Order_DetailID}) ,0)
         Where Order_DetailID = {Order_DetailID}
             
      End

      COMMIT;
      END TRY
      BEGIN CATCH
         ROLLBACK;
      END CATCH     

      `, req.body)

      strSQL += format(`
      Select @ROWCOUNT + @ROWCOUNT1 + @ROWCOUNT2 as Flag, @Size_Status as Size_Status;
      if(@ROWCOUNT > 0 )
      Begin
         Update [dbo].[Orders] Set UserID = isnull(UserID, N'${req.UserID}'), Data_Updater = N'${req.UserID}'
         , Data_Update = GetDate()
         where Order_No = {Order_No}
      End
      `, req.body)
      
    //console.log(strSQL)
   db.sql(req.SiteDB, strSQL)
      .then((result) => {
         res.send({Flag:result.recordsets[0][0].Flag > 0, Size_Status:result.recordsets[0][0].Size_Status});
      }).catch((err) => {
         console.log(err);
         res.status(500).send(err);
      })

});

//Maintain Assortment Detail
router.post('/Assortment_Detail_Maintain',  function (req, res, next) {
//   console.log("Call Assortment_Detail_Maintain Api:", req.body);
   console.log("Call Assortment_Detail_Maintain Api:");
   var strSQL = "";

   req.body.Order_No = req.body.Order_No ? `N'${req.body.Order_No.trim().substring(0,18).replace(/'/g, "''")}'` : `''`; 

   strSQL = format(`
   Declare @ROWCOUNT int=0
   , @ROWCOUNT1 int=0
   , @ROWCOUNT2 int=0
   , @ROWCOUNT3 int=0
   , @Order_ApproveID int
   , @Size_Status int=0
   Set @Order_ApproveID = (SELECT case when a.Approve_Date is null then 0 else 1 end 
                          FROM Order_Detail od WITH (NoWait, Nolock) 
                          Left Outer Join Produce p with(NoLock,NoWait) on p.Prodce_No = od.Produce_No
                          Left Outer Join Order_Approve a WITH (NoWait, Nolock) on p.Order_ApproveID = a.Order_ApproveID 
                          Where od.Order_DetailID = {Order_DetailID})

   BEGIN TRANSACTION;  
   BEGIN TRY


   if(@Order_ApproveID = 0)
   begin
      update Order_Detail set Size_Status = 2
      Where isnull(Size_Status,0) = 0 And Order_DetailID = {Order_DetailID};
      set @ROWCOUNT = @@ROWCOUNT;
   end

   Select @Size_Status = Size_Status 
   from Order_Detail 
   Where Order_DetailID = {Order_DetailID};
   `, req.body);


   // req.body.Mode === 0 表示新增
   // req.body.Mode === 1 表示修改
   // req.body.Mode === 2 表示刪除   
   switch(req.body.Mode){
      case 0:
         strSQL += format(`
         if(@Order_ApproveID = 0 )
         begin
            Insert into [dbo].[Assortment_Detail] (AssortmentID, Size, Qty)
            Select {AssortmentID} as AssortmentID, {Size} as Size, {Qty} as Qty;
            set @ROWCOUNT1 = @@ROWCOUNT;
         End         
         `, req.body);
         break;
      case 1:        
         strSQL += format(`
         if(@Order_ApproveID = 0 )
         begin
            Update [dbo].[Assortment_Detail] Set [{Name}] = {Value}
            where Assortment_DetailID = {Assortment_DetailID}
            set @ROWCOUNT1 = @@ROWCOUNT;
         End         
         `, req.body);
         break;
      case 2:
         strSQL += format(`
         if(@Order_ApproveID = 0 )
         begin
            Delete FROM [dbo].[Assortment_Detail]
            where  Assortment_DetailID = {Assortment_DetailID};
            set @ROWCOUNT1 = @@ROWCOUNT;
         End          
         `, req.body);      
         break;
      }


      strSQL += format(`
      if(@Order_ApproveID = 0 and @Size_Status = 2)
      Begin

         Delete from Order_Qty where Order_DetailID = {Order_DetailID};
         insert Order_Qty(Order_DetailID, Size, Qty, Prerange)
         Select {Order_DetailID} as Order_DetailID, Size, Sum(Qty) as Qty, 0 as Prerange
         From
         (Select Size, case when abs(a.Prepack) = 1 then a.Cartons else 1 end * Sum(Qty) as Qty
         From Assortment a
         Inner Join Assortment_Detail ad on a.AssortmentID = ad.AssortmentID
         where Order_DetailID = {Order_DetailID}
         Group by Size, a.Prepack, a.Cartons) tmp
         Group by Size;

         set @ROWCOUNT2 = @@ROWCOUNT;
/*
         if(@ROWCOUNT2 > 0)
         Begin
            Delete From Order_PKO_Detail_Qty 
            From Order_PKO_Detail_Qty
            Where Order_PKO_Detail_QtyID in
            (Select opq.Order_PKO_Detail_QtyID
            From ( Select distinct Order_No, Product_No, Ref_No From Order_Detail od with(NoLock,NoWait)
            Where od.Order_DetailID = {Order_DetailID}) tmp
            Inner Join Order_PKO op with(NoLock,NoWait) on op.Order_No = tmp.Order_No And op.Product_No = tmp.Product_No And op.Ref_No = tmp.Ref_No
            Inner Join Order_PKO_Detail opd with(NoLock,NoWait) on op.Order_PKOID = opd.Order_PKOID
            Inner Join Order_PKO_Detail_Qty opq with(NoLock,NoWait) on opd.Order_PKO_DetailID = opq.Order_PKO_DetailID
            left Outer Join (Select Size from Order_Qty Where Order_DetailID = {Order_DetailID}) s on opq.Size = s.Size Where s.Size is null) 
         End
*/         

         --取消Trigger_Order_Qty 由改由API統計Total Qty
         Update Order_Detail set Qty = isnull((Select Sum(oq.Qty) From Order_Qty oq with(NoLock, NoWait) Where oq.Order_DetailID = {Order_DetailID}) ,0)
         Where Order_DetailID = {Order_DetailID}

         --取消自動產生Order Size 由改由手動產生 Order Size         
/*       
         Insert Order_Size (Order_No, Size)
         Select {Order_No} as Order_No, t.Size
         From (
            Select Size
            From Order_Detail od with(NoLock, NoWait)
            inner Join Assortment a with(NoLock, NoWait) on od.Order_DetailID = a.Order_DetailID
            inner Join Assortment_Detail ad with(NoLock, NoWait) on a.AssortmentID = ad.AssortmentID
            Where od.Order_No = {Order_No}
            Group by Size
         ) t
         Left outer Join Order_Size os with(NoLock, NoWait) on os.Size = t.Size and os.Order_No = {Order_No}
         Where os.Size is null
         set @ROWCOUNT3 = @@ROWCOUNT;
*/       
      End

      COMMIT;
      END TRY
      BEGIN CATCH
         ROLLBACK;
      END CATCH     

      `, req.body)

      strSQL += format(`
      Select @ROWCOUNT + @ROWCOUNT1 + @ROWCOUNT2 + @ROWCOUNT3 as Flag, @Size_Status as Size_Status, isnull((Select Qty from Order_Detail where Order_DetailID = {Order_DetailID}),0) as Qty

      if(@ROWCOUNT + @ROWCOUNT1 + @ROWCOUNT2 + @ROWCOUNT3  > 0)
      Begin
         Update [dbo].[Orders] Set UserID = isnull(UserID, N'${req.UserID}'), Data_Updater = N'${req.UserID}'
         , Data_Update = GetDate()
         where Order_No = {Order_No}
      End
      `, req.body)

    // console.log(strSQL)
   db.sql(req.SiteDB, strSQL)
      .then((result) => {
         var dataset = { Flag : result.recordsets[0][0].Flag > 0
            , Size_Status : result.recordsets[0][0].Size_Status
            , Qty : result.recordsets[0][0].Qty 
         };
         res.send(dataset);
      }).catch((err) => {
         console.log(err);
         res.status(500).send(err);
      })

});

//Report Size Run Detail
router.post('/Order_Report_Size_Run_Detail', function (req, res, next) {
   console.log("Call Order_Report_Size_Run_Detail Api :", req.body);

   req.body.Order_No = req.body.Order_No ? `N'${req.body.Order_No.trim().substring(0,18).replace(/'/g, "''")}'` : `''`; 
   
   //Mode == 0 Get Order Detail Data - Solid
   //Mode == 1 Get Order Detail Data - Assortment
   var strSQL = format(`
   Declare @Mode int = {Mode}, @Order_No nvarchar(18) = {Order_No}, @ColumnGroup NVARCHAR(MAX), @ColumnGroup_Total NVARCHAR(MAX), @PivotSQL NVARCHAR(MAX) 
   
   SELECT o.Brand + ' ' + o.Season + ' ' + isnull(o.Subject, '') as Subject,
   Convert(varchar(10), o.Order_Date, 111) as Order_Date, isnull(o.Ref_No_Title,'') as Ref_No_Title, isnull(o.Packing_No_Title,'') as Packing_No_Title, isnull(o.Order_No_Title,'Order No') as Order_No_Title
   FROM Orders o with(NoLock,NoWait)
   Where o.Order_No = @Order_No

   Select distinct od.Factory_ID
   From Order_Detail od with(NoLock,NoWait)
   Left Outer Join Product p with(NoLock,NoWait) on od.Product_No = p.Product_No 
   Where od.Order_No = @Order_No

   SELECT os.Size, ps.Size_Name
   FROM Order_Size os with(NoLock,NoWait)
   Inner Join Product_Size ps with(NoLock,NoWait) on os.Size = ps.SizeID
   Where os.Order_No = @Order_No
   
   SELECT @ColumnGroup = COALESCE(@ColumnGroup + ',' ,'' ) + QUOTENAME(Size), @ColumnGroup_Total = COALESCE(@ColumnGroup_Total + ' + ' ,'' ) + 'isnull('+ QUOTENAME(Size) +',0)' 
   FROM Order_Size os with(NoLock,NoWait)
   Where os.Order_No = @Order_No
   GROUP BY (os.Size)   

   --0 Solid
   if(@Mode = 0)
   Begin
   
   SELECT @PivotSQL = N'
   SELECT *, sum('+@ColumnGroup_Total+') as Total_Qty FROM (
   Select od.Factory_ID, Convert(varchar(10),Est_Shipping_Date,111) as Est_Shipping_Date, isnull(Photo_Month, Sketch_Month) as Photo_Month
   , case when len(isnull(Photo_Month, '''')) > 0 then 0 else 1 end as Photo_Type
   , od.Product_No, isnull(p.Color_Code,'''') +'' ''+ isnull(p.Color,'''') as Color, isnull(p.[Name],'''') as [Name]
   , s.Last_No, s.Outsole_No, s.Pattern_No
   , od.Produce_No, oq.Size, odf.Ref_No, Sum(oq.Qty) as Qty
   From Order_Detail od with(NoLock,NoWait)
   Inner Join Order_Detail_Ref odf on od.Order_Detail_RefID = odf.Order_Detail_RefID
   Inner Join Order_Qty oq with(NoLock,NoWait) on od.Order_DetailID = oq.Order_DetailID
   Left Outer Join Product p with(NoLock,NoWait) on od.Product_No = p.Product_No
   Inner Join Style s with(NoLock,NoWait) on p.Style_No = s.Style_No
   Where od.Order_No = N'''+@Order_No+'''
   Group by  od.Factory_ID, Est_Shipping_Date, Photo_Month, Sketch_Month
   , od.Product_No, p.Color, p.Color_Code, p.[Name]
   , s.Last_No, s.Outsole_No, s.Pattern_No
   , od.Produce_No, oq.Size, odf.Ref_No
   ) tmp PIVOT (SUM(Qty) FOR Size 
    IN (' + @ColumnGroup +  N') ) AS pvt
    Group by Factory_ID, Pattern_No, Est_Shipping_Date, Photo_Month, Photo_Type, Product_No, Color, [Name], Last_No, Outsole_No, Produce_No, Ref_No, ' + @ColumnGroup
   
   End

   --1 Assortment
   if(@Mode = 1)
   Begin
   SELECT @PivotSQL = N'
   Declare @TmpTable table (Factory_ID varchar(15), Est_Shipping_Date varchar(10), Photo_Month varchar(04), Photo_Type int
   , Product_No varchar(25), Color varchar(70), [Name] nvarchar(50), Last_No varchar(50), Outsole_No varchar(20), Pattern_No varchar(20), Order_Detail_RefID int
   , Ref_No varchar(20), Produce_No varchar(20), Order_PKOID int, PKO_No varchar(20), Shipping_Date varchar(10), Destination nvarchar(30), Order_PKO_DetailID int, Carton_Code nvarchar(13), Size real
   , Cartons int
   , Qty float)

   Insert @TmpTable
   Select tmp.Factory_ID, tmp.Est_Shipping_Date, tmp.Photo_Month, tmp.Photo_Type
   , tmp.Product_No, tmp.Color , tmp.[Name], tmp.Last_No, tmp.Outsole_No, tmp.Pattern_No, tmp.Order_Detail_RefID
   , odf.Ref_No, tmp.Produce_No, a.Order_PKOID, a.PKO_No, Convert(varchar(10),a.Shipping_Date,111) as Shipping_Date, a.Destination, ad.Order_PKO_DetailID, ad.Carton_Code, aq.Size
   , sum(ad.Cartons) as Cartons
   , Sum(aq.Qty)  as Qty
   From 
   (
	   Select distinct od.Factory_ID, Convert(varchar(10),Est_Shipping_Date,111) as Est_Shipping_Date, isnull(Photo_Month, Sketch_Month) as Photo_Month, case when len(isnull(Photo_Month, '''')) > 0 then 0 else 1 end as Photo_Type, od.Product_No, isnull(p.Color_Code,'''') +'' ''+ isnull(p.Color,'''') as Color , isnull(p.[Name],'''') as [Name], s.Last_No, s.Outsole_No, s.Pattern_No, od.Order_Detail_RefID, od.Produce_No
	   From Order_Detail od with(NoLock,NoWait)
	   Left Outer Join Product p with(NoLock,NoWait) on od.Product_No = p.Product_No 
	   Inner Join Style s with(NoLock,NoWait) on p.Style_No = s.Style_No 
	   Where od.Order_No = N'''+@Order_No+''' 
   ) tmp
   inner Join Order_PKO a with(NoLock,NoWait) on a.Order_Detail_RefID = tmp.Order_Detail_RefID
   Inner Join Order_Detail_Ref odf on a.Order_Detail_RefID = odf.Order_Detail_RefID
   inner Join Order_PKO_Detail ad with(NoLock,NoWait) on ad.Order_PKOID = a.Order_PKOID
   inner Join Order_PKO_Detail_Qty aq with(NoLock,NoWait) on aq.Order_PKO_DetailID = ad.Order_PKO_DetailID   
   Group by tmp.Factory_ID, tmp.Est_Shipping_Date, tmp.Photo_Month, tmp.Photo_Type
   , tmp.Product_No, tmp.Color , tmp.[Name], tmp.Last_No, tmp.Outsole_No, tmp.Pattern_No, tmp.Order_Detail_RefID
   , odf.Ref_No, tmp.Produce_No, a.Order_PKOID, a.PKO_No, a.Shipping_Date, a.Destination, ad.Order_PKO_DetailID, ad.Carton_Code, aq.Size
   
   SELECT pvt.Factory_ID, pvt.Pattern_No, pvt.Est_Shipping_Date, pvt.Photo_Month, pvt.Photo_Type, pvt.Product_No, pvt.Color, pvt.[Name], pvt.Last_No, pvt.Outsole_No, pvt.Ref_No, pvt.Produce_No, pvt.Order_PKOID, pvt.PKO_No, pvt.Shipping_Date, pvt.Destination, CTN_Info.Carton_Code, CTN_Info.Cartons,' + @ColumnGroup +  N', sum('+@ColumnGroup_Total+') * CTN_Info.Cartons as Total_Qty 
   FROM (
      Select Factory_ID, Convert(varchar(10),Est_Shipping_Date,111) as Est_Shipping_Date, Photo_Month, Photo_Type, Product_No, Color, [Name], Last_No, Outsole_No, Pattern_No, Order_Detail_RefID, Ref_No, Produce_No, Order_PKOID, PKO_No, Shipping_Date, Destination, Order_PKO_DetailID, Size, Qty 
      from @TmpTable
   ) tmp PIVOT ( SUM(Qty) FOR Size IN (' + @ColumnGroup +  N') ) AS pvt
	Left Outer Join ( 
		Select Order_PKOID, Order_PKO_DetailID, Carton_Code, Sum(Cartons) as Cartons    
		from ( Select distinct Order_PKOID, Order_PKO_DetailID, Carton_Code, Cartons From @TmpTable ) tmp   
		Group by Order_PKOID, Order_PKO_DetailID, Carton_Code
	) as CTN_Info on pvt.Order_PKOID = CTN_Info.Order_PKOID And pvt.Order_PKO_DetailID = CTN_Info.Order_PKO_DetailID
    Group by pvt.Factory_ID, pvt.Pattern_No, pvt.Est_Shipping_Date, pvt.Photo_Month, pvt.Photo_Type, pvt.Product_No, pvt.Color, pvt.[Name], pvt.Last_No, pvt.Outsole_No, pvt.Ref_No, pvt.Produce_No, pvt.Order_PKOID, pvt.PKO_No, pvt.Shipping_Date, pvt.Destination, CTN_Info.Carton_Code, CTN_Info.Cartons,' + @ColumnGroup

   End

   --Select  @PivotSQL
   EXEC sp_executesql  @PivotSQL;
    `
   , req.body );
   //console.log(strSQL);  

   db.sql(req.SiteDB, strSQL)
      .then((result) => { 

         var DataSet = { Subject: result.recordsets[0][0].Subject
            ,Order_Date: result.recordsets[0][0].Order_Date
            ,Ref_No_Title: result.recordsets[0][0].Ref_No_Title
            ,Packing_No_Title: result.recordsets[0][0].Packing_No_Title
            ,Order_No_Title: result.recordsets[0][0].Order_No_Title
            ,Order_Size: result.recordsets[2]            
            ,Factory_Info: []
         };
         result.recordsets[1].forEach((item)=>{
            var Detail_Info = {FactoryID:item.Factory_ID, Detail:[]}            
            result.recordsets[3].forEach((obj)=>{
               if(item.Factory_ID == obj.Factory_ID) {
                  Detail_Info.Detail.push(obj);
               }
            })
            DataSet.Factory_Info.push(Detail_Info);
         })

         // let NOI_Detail = [...result.recordsets[3].reduce((r, e) => { 
            
         //    let k = `${e.Pattern_No}|${e.Factory_ID}|${e.Est_Shipping_Date}`;
         //    if (!r.has(k)) {
         //      // console.log(r)
         //      r.set(k, {
         //        rowSpan: 1,
         //        styleTotal: e.Total_Qty,
         //        Factory_ID: e.Factory_ID,
         //        Pattern_No: e.Pattern_No,
         //        Est_Shipping_Date: e.Est_Shipping_Date,
         //      })
         //    } else {
         //      r.get(k).rowSpan++
         //      r.get(k).styleTotal += e.Total_Qty
         //    }
         //    return r;
         //  }, new Map).values()]         
         //console.log(NOI_Detail)
         res.send(DataSet);
      }).catch((err) => {
         console.log(err);
         res.status(500).send(err);
      })
});

//Get Ref_No
router.post('/Ref_No', function (req, res, next) {
   console.log("Call Ref_No Api :", req.body);

   req.body.Order_No = req.body.Order_No ? `N'${req.body.Order_No.trim().substring(0,18).replace(/'/g, "''")}'` : `''`; 
   
   var strSQL = format(`Declare @Ref_Table table (Ref_No varchar(20), Qty float default(0) )   

   Insert @Ref_Table
   Select od.Ref_No, Sum(isnull(o.Qty,0)) as Qty
   from Order_Qty o with(NoLock,NoWait)
   Inner Join Order_Detail od with(NoLock,NoWait) on o.Order_DetailID = od.Order_DetailID 
   Where od.Order_No = {Order_No}
   Group by od.Ref_No
/*
   Declare @PKO_Table table (Ref_No varchar(20), Qty float default(0) )
   
   Insert @PKO_Table
   Select o.Ref_No, Sum(isnull(od.Qty,0)) as Qty
   from Order_PKO o with(NoLock,NoWait)
   Inner Join Order_PKO_Qty od with(NoLock,NoWait) on o.Order_PKOID = od.Order_PKOID
   Inner Join @Ref_Table tmp on tmp.Ref_No = o.Ref_No
   Where o.Order_No = {Order_No}
   Group by o.Ref_No
*/
   SELECT o.Ref_No
   FROM @Ref_Table o 
   --Left Outer Join @PKO_Table od  on o.Ref_No = od.Ref_No 
   --Where o.Qty > isnull(od.Qty,0)
    `
   , req.body );
   //console.log(strSQL);

   db.sql(req.SiteDB, strSQL)
      .then((result) => {
         res.send(result.recordsets[0]);
      }).catch((err) => {
         console.log(err);
         res.status(500).send(err);
      })
});

//Check PKO_No
router.post('/Check_PKO_No',  function (req, res, next) {
   console.log("Call Check_PKO_No Api:",req.body);

   //req.body.Order_No = req.body.Order_No ? `N'${req.body.Order_No.trim().substring(0,18).replace(/'/g, "''")}'` : `''`; 
   //req.body.Ref_No = req.body.Ref_No ? `N'${req.body.Ref_No.trim().substring(0,20).replace(/'/g, "''")}'` : `''`; 
   req.body.Order_DetailID = req.body.Order_DetailID ? req.body.Order_DetailID : 0;
   req.body.PKO_No = req.body.PKO_No ? `N'${req.body.PKO_No.trim().substring(0,20).replace(/'/g, "''")}'` : `''`; 

   var strSQL = format(`
   SELECT Count(*) as RecCount
   FROM [dbo].[Order_PKO] With(Nolock,NoWait)
   where [Order_DetailID] = {Order_DetailID}
   And [PKO_No] = {PKO_No}   
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

//PKO
router.post('/PKO',function (req, res, next) {
   console.log("Call PKO Api :", req.body);
   req.body.Order_No = req.body.Order_No ? `N'${req.body.Order_No.trim().substring(0,18).replace(/'/g, "''")}'` : `''`; 
   
   //Mode == 0 Get Order Detail Data - Solid
   //Mode == 1 Get Order Detail Data - Assortment
   var strSQL = format(`
   Declare @Order_No nvarchar(18) = {Order_No}, @ColumnGroup NVARCHAR(MAX), @ColumnGroup_Total NVARCHAR(MAX), @PivotSQL NVARCHAR(MAX);
   
   Select o.Ref_No_Title From Orders o	Where o.Order_No = @Order_No;

   SELECT os.Size, Rtrim(ps.Size_Name) as Size_Name
   FROM Order_Size os with(NoLock,NoWait)
   Inner Join Product_Size ps with(NoLock,NoWait) on os.Size = ps.SizeID
   Where os.Order_No = @Order_No;
   
   SELECT @ColumnGroup = COALESCE(@ColumnGroup + ',' ,'' ) + QUOTENAME(Size), @ColumnGroup_Total = COALESCE(@ColumnGroup_Total + ' + ' ,'' ) + 'isnull('+ QUOTENAME(Size) +',0)' 
   FROM Order_Size os with(NoLock,NoWait)
   Where os.Order_No = @Order_No
   GROUP BY (os.Size); 

   SELECT @PivotSQL = N'
   Declare @TmpTable table (Ref_No varchar(20), PKO_No varchar(20), Size real, Prepack smallint, Cartons int, Qty float)
			
   Insert @TmpTable
   Select od.Ref_No, a.PKO_No, ad.Size, ABS(isnull(a.Prepack,0)) as Prepack, isnull(a.Cartons,0) as Cartons, Sum(ad.Qty) * case when ABS(isnull(a.Prepack,1)) = 1 then a.Cartons else 1 end as Qty
   From Order_Detail od with(NoLock,NoWait)      
   Left Outer Join Product p with(NoLock,NoWait) on od.Product_No = p.Product_No      
   Inner Join Style s with(NoLock,NoWait) on p.Style_No = s.Style_No      
   inner Join Assortment a with(NoLock,NoWait) on od.Order_DetailID = a.Order_DetailID      
   inner Join Assortment_Detail ad with(NoLock,NoWait) on ad.AssortmentID = a.AssortmentID
   Where od.Order_No = N'''+@Order_No+'''
   Group by  od.Ref_No, a.PKO_No, ad.Size, a.Cartons, a.Prepack

   SELECT pvt.Ref_No, pvt.PKO_No, isnull(CTN_Info.Cartons,0) as Cartons, sum('+@ColumnGroup_Total+') as Total_Qty,' + @ColumnGroup +  N' 
   FROM (
      Select Ref_No, PKO_No, Size, Qty from @TmpTable
   ) tmp PIVOT ( SUM(Qty) FOR Size IN (' + @ColumnGroup +  N') ) AS pvt
   Left Outer Join (
		Select Ref_No, PKO_No, sum(cartons) as Cartons from (Select distinct Ref_No, PKO_No, Cartons From @TmpTable) t group by Ref_No, PKO_No 
    ) as CTN_Info on 
    (pvt.Ref_No is null or pvt.Ref_No = CTN_Info.Ref_No) 
    and (pvt.PKO_No is null or pvt.PKO_No = CTN_Info.PKO_No)
    Group by pvt.Ref_No, pvt.PKO_No, CTN_Info.Cartons,' + @ColumnGroup
 
   --Select  @PivotSQL
   EXEC sp_executesql  @PivotSQL;
    `, req.body );
   //console.log(strSQL);  

   db.sql(req.SiteDB, strSQL)
      .then((result) => { 
         var DataSet = {Ref_No_Title: result.recordsets[0][0].Ref_No_Title,
            Order_Size: result.recordsets[1],
            Detail:result.recordsets[2],
         };
         res.send(DataSet);
      }).catch((err) => {
         console.log(err);
         res.status(500).send(err);
      })

});

//PKO
router.post('/PKO_By_Ref_No',function (req, res, next) {
   console.log("Call PKO_By_Ref_No Api :", req.body);
   req.body.Order_No = req.body.Order_No ? `N'${req.body.Order_No.trim().substring(0,18).replace(/'/g, "''")}'` : `''`; 
   
   var strSQL = format(`
Declare @Order_No varchar(18) = {Order_No};
Declare @tmpTable table (Order_DetailID int, Ref_No nvarchar(20)) ;

Insert @tmpTable
Select Order_DetailID, Ref_No From Order_Detail od with(NoLock, NoWait) Where od.Order_No = @Order_No;

Select o.Ref_No_Title From Orders o	Where o.Order_No = @Order_No;
	 
SELECT os.Size, Rtrim( ps.Size_Name) as Size_Name
FROM Order_Size os with(NoLock,NoWait)
Inner Join Product_Size ps with(NoLock,NoWait) on os.Size = ps.SizeID
Where os.Order_No = @Order_No;

Select Ref_No From @tmpTable Group by Ref_No Order by Ref_No;

Select Ref_No, Order_DetailID From @tmpTable Group by Ref_No , Order_DetailID;
   
SELECT od.Order_DetailID, od.Ref_No, oq.Size, sum(oq.Qty) Qty
FROM @tmpTable od
Inner Join Order_Qty oq with(NoLock,NoWait) on od.Order_DetailID = oq.Order_DetailID
GROUP BY od.Order_DetailID, od.Ref_No, oq.Size
Order By Ref_No;

SELECT ad.Assortment_DetailID, od.Ref_No, a.PKO_No, ad.Size, sum(ad.Qty) Qty
FROM @tmpTable od 
Inner Join Assortment a With(NoLock,NoWait) on od.Order_DetailID = a.Order_DetailID
Inner Join Assortment_Detail ad With(NoLock,NoWait) on ad.AssortmentID = a.AssortmentID
GROUP BY  od.Ref_No, a.PKO_No, ad.Size, ad.Assortment_DetailID
Order By Ref_No;

    `, req.body );
   //console.log(strSQL);  

   db.sql(req.SiteDB, strSQL)
      .then((result) => { 
         var obj_Size_Run = result.recordsets[1];
         var Ref_No_Info = result.recordsets[2];
         var Detail_Info = result.recordsets[3];
         var Order_Detail = result.recordsets[4];
         var PKO = result.recordsets[5];
         Ref_No_Info.forEach((item,idx)=>{
            item.Detail = {Size_Run:[], Order_Detail:[],PKO:[]};

            //取得REF_No的Order_Detail
            var Order_DataSet = Order_Detail.filter((data)=>(data.Ref_No == item.Ref_No))
            //取得REF_No的Order_DetailID
            var DetailID_DataSet = Detail_Info.filter((data)=>(data.Ref_No == item.Ref_No))

            Order_DataSet.forEach((Detail)=>{
               item.Detail.Size_Run.push(obj_Size_Run.find((obj)=>(obj.Size == Detail.Size)))
            })
            

            DetailID_DataSet.forEach((dataset)=>{
               var _Detail = {Order_DetailID: dataset.Order_DetailID, Total_Qty:0, Size_Info:{}}
               item.Detail.Size_Run.forEach((obj)=>{
                  _Detail.Size_Info[obj.Size] = 0;
               })

               Order_DataSet.forEach((Detail)=>{
                  if(Detail.Order_DetailID == dataset.Order_DetailID) {
                     _Detail.Total_Qty += Detail.Qty;
                     _Detail.Size_Info[Detail.Size] = Detail.Qty;
                  }
               })   
               item.Detail.Order_Detail.push(_Detail)
            })           

         });

         var DataSet = {Ref_No_Title: result.recordsets[0][0].Ref_No_Title,
            Ref_No_Info: Ref_No_Info
         };
         
         res.send(DataSet);
      }).catch((err) => {
         console.log(err);
         res.status(500).send(err);
      })

});

//Get PKO Info
router.post('/PKO_Info',function (req, res, next) {
   console.log("Call PKO_Info Api :", req.body);
   req.body.Order_No = req.body.Order_No ? `N'${req.body.Order_No.trim().substring(0,18).replace(/'/g, "''")}'` : `''`;
   req.body.QueryData = req.body.QueryData ? `N'${req.body.QueryData.trim().replace(/'/g, "''")}'` : `''`;
      
   var strSQL = format(`
Declare @Order_No varchar(18) = {Order_No};
Declare @tmpTable table (Order_DetailID int, Ref_No nvarchar(20)) ;
Declare @tmpPKO table (Order_PKOID int, Ref_No nvarchar(20), Order_DetailID int, PKO_No varchar(20), Shipping_Date DateTime, Destination varchar(30), Qty float) ;

Insert @tmpTable
Select Order_DetailID, Ref_No From Order_Detail od with(NoLock, NoWait) 
Where od.Order_No = @Order_No
And ({QueryData} = '' or charindex({QueryData}, isnull(Ref_No,'') + ' ' + cast(Order_DetailID as varchar) ) > 0);

--0 Ref_No_Title && Packing_No_Title
Select isnull(o.Ref_No_Title,'') as Ref_No_Title, isnull(o.Packing_No_Title,'') as  Packing_No_Title From Orders o	Where o.Order_No = @Order_No;

--1 Order Size
SELECT os.Size, Rtrim( ps.Size_Name) as Size_Name
FROM Order_Size os with(NoLock,NoWait)
Inner Join Product_Size ps with(NoLock,NoWait) on os.Size = ps.SizeID
Where os.Order_No = @Order_No;

--2 Ref No Info
Select Ref_No, Order_DetailID From @tmpTable Group by Ref_No, Order_DetailID Order by Ref_No desc, Order_DetailID;

--3 Order Detail
SELECT od.Ref_No, od.Order_DetailID, oq.Size, sum(oq.Qty) Qty
FROM @tmpTable od
Inner Join Order_Qty oq with(NoLock,NoWait) on od.Order_DetailID = oq.Order_DetailID
GROUP BY od.Ref_No, od.Order_DetailID, oq.Size
Order By Ref_No, Order_DetailID;

insert @tmpPKO
SELECT a.Order_PKOID, a.Ref_No, od.Order_DetailID, a.PKO_No, a.Shipping_Date, a.Destination, isnull(a.Qty,0) as Qty
FROM (Select Ref_No, Order_DetailID From @tmpTable Group by Ref_No, Order_DetailID) od 
Inner Join Order_PKO a With(NoLock,NoWait) on od.Order_DetailID = a.Order_DetailID
Order By Ref_No, Order_DetailID, PKO_No;

--4 PKO Info
Select a.Order_PKOID, cast((case when ship.Order_PKOID is null then 1 else 0 end) as bit) as PKO_Shipmented_Flag, Ref_No, Order_DetailID, PKO_No, case when Shipping_Date is not null then convert(varchar(10),Shipping_Date,111) else null end as Shipping_Date, Destination, Qty
from @tmpPKO a
Left Outer Join (Select Order_PKOID From PDSP_Detail p with(NoLock,NoWait) Inner Join @tmpTable t on p.Order_DetailID = t.Order_DetailID Group by Order_PKOID) ship on ship.Order_PKOID = a.Order_PKOID
Order by a.Order_PKOID;

--5 PKO Detail
SELECT ad.Order_PKO_QtyID, od.Order_PKOID, od.PKO_No, ad.Size, ad.Qty
FROM @tmpPKO od 
Inner Join Order_PKO_Qty ad With(NoLock,NoWait) on od.Order_PKOID = ad.Order_PKOID
Order By PKO_No, Size;

    `, req.body );
   //console.log(strSQL);  

   db.sql(req.SiteDB, strSQL)
      .then((result) => { 
         var Order_Size = result.recordsets[1];
         var Ref_No_Info = result.recordsets[2];
         var Order_Detail = result.recordsets[3];
         var PKO_Info = result.recordsets[4];
         var PKO_Detail = result.recordsets[5];

         Ref_No_Info.forEach((item,idx)=>{
            item.Size_Run = []
            item.Order_Detail=[];
            item.PKO_Detail=[];
            item.Balance_Detail=[];

            //取得REF_No的Order_Detail
            var DataSet_Order = Order_Detail.filter((data)=>( data.Order_DetailID == item.Order_DetailID))

            DataSet_Order.forEach((data)=>{
               item.Size_Run.push(Order_Size.find((obj)=>(obj.Size == data.Size)))
            })
            
            var _Detail = {Total_Qty:0}
            item.Size_Run.forEach((obj)=>{
               _Detail[obj.Size] = 0;
            })

            DataSet_Order.forEach((data)=>{
                _Detail.Total_Qty += data.Qty;
                _Detail[data.Size] = data.Qty;
            })           
            item.Order_Detail.push(_Detail)
            var _Balance = cloneDeep(_Detail);

            //取得REF_No的PKO Info
            var DataSet_PKO = PKO_Info.filter((data)=>( data.Order_DetailID == item.Order_DetailID))

            DataSet_PKO.forEach((data)=>{
               var _PKO_Detail = {Order_PKOID:0, PKO_No:'', Shipping_Date:'', Destination:'', Total_Qty:0, Size_Qty_Info:[]}
               item.Size_Run.forEach((obj)=>{
                  _PKO_Detail.Size_Qty_Info.push({Order_PKO_QtyID:0, Size:obj.Size, Qty:0});
               })
               
               _PKO_Detail.Order_PKOID = data.Order_PKOID;
               _PKO_Detail.PKO_Shipmented_Flag = data.PKO_Shipmented_Flag;
               _PKO_Detail.Ref_No = data.Ref_No;
               _PKO_Detail.Order_DetailID = data.Order_DetailID;
               _PKO_Detail.PKO_No = data.PKO_No;
               _PKO_Detail.Shipping_Date = data.Shipping_Date;
               _PKO_Detail.Destination = data.Destination;
               _PKO_Detail.Total_Qty = data.Qty;
               _Balance.Total_Qty = _Balance.Total_Qty - data.Qty;
               var _PKO_Qty_Size = PKO_Detail.filter((dataset)=>(data.Order_PKOID == dataset.Order_PKOID))
               _PKO_Qty_Size.forEach((obj)=>{
                  _PKO_Detail.Size_Qty_Info.forEach((dest)=>{
                     if(obj.Size == dest.Size) {
                        _Balance[dest.Size] = _Balance[dest.Size] - obj.Qty;
                        dest.Qty = obj.Qty;
                        dest.Order_PKO_QtyID = obj.Order_PKO_QtyID;
                     }
                  })
               })
               item.PKO_Detail.push(_PKO_Detail)
            })
            item.Balance_Detail.push(_Balance)
         });

         var DataSet = {Ref_No_Title: result.recordsets[0][0].Ref_No_Title,
            Packing_No_Title: result.recordsets[0][0].Packing_No_Title,
            Ref_No_Info: Ref_No_Info
         };
         
         res.send(DataSet);
      }).catch((err) => {
         console.log(err);
         res.status(500).send(err);
      })

});

//Maintain PKO
router.post('/PKO_Maintain',  function (req, res, next) {
   console.log("Call PKO_Maintain Api:",req.body);

   // req.body.Mode === 0 表示新增
   // req.body.Mode === 1 表示修改
   // req.body.Mode === 2 表示刪除
   // req.body.Mode === 3 表示編輯PKO數量
   var Size = 0;
   req.body.Order_No = req.body.Order_No ? `N'${req.body.Order_No.trim().substring(0,18).replace(/'/g, "''")}'` : `''`; 

   if(req.body.Mode === 0 ) {
      req.body.Order_DetailID = req.body.Order_DetailID ? req.body.Order_DetailID : 0;
   }

   if(req.body.Mode === 1 && ( req.body.Name == 'Ref_No' || req.body.Name == 'PKO_No' || req.body.Name == 'Destination' || req.body.Name == 'Shipping_Date')
      ) {
      switch(req.body.Name){
         case 'Shipping_Date':
            Size = 10;
         break;         
         case 'PKO_No':
         case 'Ref_No':
            Size = 20;
            req.body.Ref_No = req.body.Ref_No ? `N'${req.body.Ref_No.trim().substring(0,20).replace(/'/g, "''")}'` : `''`;      
         break;
         case 'Destination':
            Size = 30;
         break;
      }
      req.body.Value = req.body.Value ? `N'${req.body.Value.trim().replace(/'/g, "''")}'` : `''`;
   }

   if(req.body.Mode === 3 && req.body.Name === 'Qty')
   {
      req.body.Order_PKO_QtyID = req.body.Order_PKO_QtyID ? req.body.Order_PKO_QtyID : 0;
      req.body.Ref_No = req.body.Ref_No ? `N'${req.body.Ref_No.trim().substring(0,20).replace(/'/g, "''")}'` : `''`;
   }   

   var strSQL = 'Declare @ROWCOUNT int '
   switch(req.body.Mode){
      case 0:
         strSQL += format(`
            Insert into [dbo].[Order_PKO] (PKO_No, Order_DetailID, Order_No, Product_No, Ref_No, Shipping_Date, Destination)
            Select '' as PKO_No            
            , {Order_DetailID} as Order_DetailID
            , od.Order_No
            , od.Product_No
            , od.Ref_No
            , od.Orig_Shipping_Date as Shipping_Date
            , '' as Destination
            FROM [dbo].[Order_Detail] od With(Nolock,NoWait) 
            where [Order_DetailID] = {Order_DetailID};

            Set @ROWCOUNT = @@ROWCOUNT;
         `, req.body);
      break;
      case 1:        
         strSQL += format(`
            Update [dbo].[Order_PKO] Set [{Name}] = ${Size == 0 ? '{Value}': `substring({Value},1,${Size})`}
            where Order_PKOID = {Order_PKOID};

            Set @ROWCOUNT = @@ROWCOUNT;
         `, req.body);
      break;
      case 2:
         strSQL += format(`
            Delete FROM [dbo].[Order_PKO] 
            where Order_PKOID = {Order_PKOID} And (Select count(*) From PDSP_Detail pd with(NoLock,NoWait) Where pd.Order_PKOID = {Order_PKOID}) = 0;
            Set @ROWCOUNT = @@ROWCOUNT;
         `, req.body);
      break;
      case 3:
         strSQL += format(`
         Declare @Order_No varchar(18) = {Order_No}
         , @Order_PKO_QtyID int = {Order_PKO_QtyID}
         , @Order_PKOID int = {Order_PKOID}
         , @Ref_No varchar(20) = {Ref_No}
         , @Size float = {Size}
         , @Value float = {Value}
         , @Old float = {Qty}
         , @Qty_Diff float = {Value} - {Qty}
         , @Ref_No_Qty float = 0
         , @PKO_Qty float = 0 
         , @Balance_Qty_Flag int = 0
/*        
         Set @Ref_No_Qty = isnull((
            Select Sum(o.Qty)
            from Order_Qty o with(NoLock,NoWait)
            Inner Join Order_Detail od with(NoLock,NoWait) on o.Order_DetailID = od.Order_DetailID And od.Ref_No = @Ref_No
            Where od.Order_No = @Order_No
            And o.Size = @Size
            ),0)
            
         Set @PKO_Qty =isnull((
            Select Sum(od.Qty)
            from Order_PKO o with(NoLock,NoWait)
            Inner Join Order_PKO_Qty od with(NoLock,NoWait) on o.Order_PKOID = od.Order_PKOID And od.Order_PKO_QtyID <> @Order_PKO_QtyID
            Where o.Order_No = @Order_No
            And o.Ref_No = @Ref_No
            And od.Size = @Size
           ),0) + @Value
            
         Select @Balance_Qty_Flag = case when (@Ref_No_Qty - @PKO_Qty) >= 0 then 1 else 0 End
*/
         BEGIN TRANSACTION;
         BEGIN TRY               
            Update [dbo].[Order_PKO_Qty] Set Qty = @Value
            where Order_PKO_QtyID = @Order_PKO_QtyID 
            And @Value <> 0 
            --And @Balance_Qty_Flag = 1 ;
            set @ROWCOUNT = @@ROWCOUNT;

            --if(@ROWCOUNT = 0 And @Value <> 0 And @Balance_Qty_Flag = 1)
            if(@ROWCOUNT = 0 And @Value <> 0 )
            begin
               Insert [dbo].[Order_PKO_Qty] (Order_PKOID, Size, Qty)
               Select @Order_PKOID as Order_PKOID, @Size as Size, {Value} as Qty
               set @ROWCOUNT = @@ROWCOUNT;
            end

            if(@Value <= 0)
            begin
               Delete From Order_PKO_Qty
               Where Order_PKO_QtyID = @Order_PKO_QtyID
               set @ROWCOUNT = @@ROWCOUNT;
            End 
         COMMIT;
         END TRY
         BEGIN CATCH
            ROLLBACK;
         END CATCH
         `,req.body);         
      break;
   }

   strSQL += format(`
   Select @ROWCOUNT as Flag;

   if(@ROWCOUNT > 0)
   Begin
      Update [dbo].[Orders] Set UserID = isnull(UserID, N'${req.UserID}')
      , Data_Updater = N'${req.UserID}'
      , Data_Update = GetDate()
      where Order_No = {Order_No};
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


//取得ORder Product
 router.post('/Order_Product', function (req, res, next) {
   console.log("Call Order_Product_Info Api Product_Info:", req.body);
   req.body.Product_No = req.body.Product_No ? `${req.body.Product_No.replace(/'/g, "''")}` : '%';
   req.body.Order_No = req.body.Order_No ? `N'${req.body.Order_No.trim().substring(0,18).replace(/'/g, "''")}'` : `''`;

   var strSQL = format(`
   Declare @TmpTable Table(Product_No varchar(25), Order_DetailID int)
   Insert @TmpTable (Product_No, Order_DetailID)
   Select Product_No, Order_DetailID
   From Order_Detail od With(NoLock,NoWait)
   Where od.Order_No = {Order_No}
   And ('{Product_No}' = '%' or Product_No like N'{Product_No}%' )
   Group by Product_No, Order_DetailID

   SELECT top 1000 p.Style_No, p.Product_No, t.Order_DetailID
   FROM @TmpTable t
   Inner Join Product p WITH (NoWait, Nolock) on t.Product_No = p.Product_No 
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


//取得ORder Product資料
router.post('/Order_Product_Info', function (req, res, next) {
   console.log("Call Order_Product_Info Api Product_Info:", req.body);
   req.body.Product_No = req.body.Product_No ? `${req.body.Product_No.replace(/'/g, "''")}` : '%';
   req.body.Order_No = req.body.Order_No ? `N'${req.body.Order_No.trim().substring(0,18).replace(/'/g, "''")}'` : `''`;

   var strSQL = format(`
   Declare @TmpTable Table(Product_No varchar(25), Order_DetailID int)
   Insert @TmpTable (Product_No, Order_DetailID)
   Select Product_No, Max(Order_DetailID)
   From Order_Detail od With(NoLock,NoWait)
   Where od.Order_No = {Order_No}
   And ('{Product_No}' = '%' or Product_No like N'{Product_No}%' )
   Group by Product_No

   SELECT top 1000 p.Style_No, p.Product_No, t.Order_DetailID
   FROM @TmpTable t
   Inner Join Product p WITH (NoWait, Nolock) on t.Product_No = p.Product_No 
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


//Get Selected Sample Detail Info
router.post('/Selected_Sample_Detail_Info', function (req, res, next) {
   console.log("Call Selected_Sample_Detail_Info Api :", req.body);

   req.body.Sample_Produce_DetailID = req.body.Sample_Produce_DetailID ? req.body.Sample_Produce_DetailID : 0;

   var strSQL = format(`
   Select s.Sample_Detail_QtyID, s.Prerange, s.Size, rtrim(ps.Size_Name) as Size_Name, s.Qty, s.Agent_Qty, s.Keep_Qty
   From Sample_Detail_Qty s with(NoLock,NoWait)
   Inner Join Product_Size ps with(NoLock,NoWait) on s.Size = ps.SizeID
   Where s.Sample_Produce_DetailID = {Sample_Produce_DetailID}

   `, req.body );
   //console.log(strSQL);  

   db.sql(req.SiteDB, strSQL)
      .then((result) => {
         res.send(result.recordsets[0]);
      }).catch((err) => {
         console.log(err);
         res.status(500).send(err);
      })

});


//Maintain Sample Detail Qty
router.post('/Detail_Size_Maintain',  function (req, res, next) {
      console.log("Call Detail_Size_Maintain Api:", req.body);
      var strSQL = "";
   
      req.body.ProduceID = req.body.ProduceID ? `N'${req.body.ProduceID.trim().substring(0,18).replace(/'/g, "''")}'` : `''`;
      req.body.Sample_Produce_DetailID = req.body.Sample_Produce_DetailID ?  req.body.Sample_Produce_DetailID : `0`;      
  
      strSQL = format(`
      Declare @ROWCOUNT1 int=0
      , @SPSP_Flag int
      
      Set @SPSP_Flag = (SELECT Count(*) FROM SPSP_Detail as p WITH (NoWait, Nolock) Where p.Sample_Produce_DetailID = {Sample_Produce_DetailID})
   
      if(@SPSP_Flag = 0 )
      begin
         BEGIN TRANSACTION;  
         BEGIN TRY

      `, req.body);
   
      // req.body.Mode === 0 表示新增
      // req.body.Mode === 1 表示修改
      // req.body.Mode === 2 表示刪除   
      switch(req.body.Mode){
         case 0:
            req.body.Sample_Size = req.body.Sample_Size ?  req.body.Sample_Size : `0`;
            strSQL += format(`
               Insert into [dbo].[Sample_Detail_Qty] (Sample_Produce_DetailID, Size, Qty, Agent_Qty, Keep_Qty, Prerange)
               Select {Sample_Produce_DetailID} as Sample_Produce_DetailID, {Sample_Size} as Size, 0 as Qty, 0 as Agent_Qty, 0 as Keep_Qty, 0 as Prerange;
               set @ROWCOUNT1 = @@ROWCOUNT;
            `, req.body);
            break;
         case 1:
            req.body.Sample_Detail_QtyID = req.body.Sample_Detail_QtyID ?  req.body.Sample_Detail_QtyID : `0`;
            strSQL += format(`
               Update [dbo].[Sample_Detail_Qty] Set [{Name}] = {Value}
               where Sample_Detail_QtyID = {Sample_Detail_QtyID}
               set @ROWCOUNT1 = @@ROWCOUNT;
            `, req.body);
            break;
         case 2:
            req.body.Sample_Detail_QtyID = req.body.Sample_Detail_QtyID ?  req.body.Sample_Detail_QtyID : `0`;
            strSQL += format(`
               Delete FROM [dbo].[Sample_Detail_Qty]
               where  Sample_Detail_QtyID = {Sample_Detail_QtyID};
               set @ROWCOUNT1 = @@ROWCOUNT;
            `, req.body);      
            break;
         }   
         strSQL += format(`   
         COMMIT;
         END TRY
         BEGIN CATCH
            ROLLBACK;
         END CATCH        
         
         if(@ROWCOUNT1 > 0)
         Begin
            Update Sample_Detail set Qty = isnull(tmp.Qty,0), Agent_Qty = isnull(tmp.Agent_Qty,0), Keep_Qty = isnull(tmp.Keep_Qty,0)
            From Sample_Detail sd with(NoLock, NoWait)
            Left Outer Join 
            ( Select {Sample_Produce_DetailID} as Sample_Produce_DetailID, Sum(Qty) as Qty, Sum(Agent_Qty) as Agent_Qty, Sum(Keep_Qty) as Keep_Qty
            From Sample_Detail_Qty with(NoLock, NoWait)
            where Sample_Produce_DetailID = {Sample_Produce_DetailID} ) tmp on sd.Sample_Produce_DetailID = tmp.Sample_Produce_DetailID
            Where sd.Sample_Produce_DetailID = {Sample_Produce_DetailID};
         End

      End
         `, req.body)
   
      strSQL += format(`
      Select @ROWCOUNT1 as Flag, isnull(Qty, 0) as Qty, isnull(Agent_Qty, 0) as Agent_Qty, isnull(Keep_Qty, 0) as Keep_Qty
      from Sample_Detail sd with(NoLock, NoWait)
      where Sample_Produce_DetailID = {Sample_Produce_DetailID};

      if(@ROWCOUNT1 > 0)
      Begin
         Update [dbo].[Samples] Set UserID = isnull(UserID, N'${req.UserID}'), Data_Updater = N'${req.UserID}'
         , Data_Update = GetDate()
         where ProduceID = {ProduceID};
      End
      `, req.body)
   
      //console.log(strSQL)
      db.sql(req.SiteDB, strSQL)
         .then((result) => {
            var dataset = { Flag : result.recordsets[0][0].Flag > 0               
               , Qty : result.recordsets[0][0].Qty 
               , Agent_Qty : result.recordsets[0][0].Agent_Qty 
               , Keep_Qty : result.recordsets[0][0].Keep_Qty 
            };
            res.send(dataset);
         }).catch((err) => {
            console.log(err);
            res.status(500).send(err);
         })
   
   }); 


//Get Pre_Production_Sample_Request_Info
router.post('/Pre_Production_Sample_Request_Info',  function (req, res, next) {
   console.log("Call Pre_Production_Sample_Request_Info Api:",req.body);  
 
   req.body.ProduceID = req.body.ProduceID ? `N'${req.body.ProduceID.trim().substring(0,18).replace(/'/g, "''")}'` : `''`;
   req.body.Product_No = req.body.Product_No ? `N'${req.body.Product_No.trim().substring(0,25).replace(/'/g, "''")}'` : `''`;
   req.body.Mode = req.body.Mode ? req.body.Mode : 0;
 
   //Mode == 0 Get Sample Order and Sample Order Detail Data
   //Mode == 1 Get Sample Order Data
   //Mode == 2 Get Sample Order Detail Data
   var strSQL = format(`
   Declare @Mode int = {Mode}
 
   if(@Mode = 0 or @Mode = 1)
   Begin
       SELECT [ProduceID]
       ,[OrganizationID]
       ,[Department]
       ,[Sample_Purpose]
       ,[Factory_SubID]
       ,[Size_Mode]
       ,Convert(varchar(10),[Issue_Date],111) as [Issue_Date]
       ,[CustomerID]
       ,Convert(varchar(10),[Accept_Date],111) as [Accept_Date]
       ,Convert(varchar(10),[Require_Date],111) as [Require_Date]
       ,Convert(varchar(10),[Est_Finish_Date],111) as [Est_Finish_Date]
       ,[Currency]
       ,[Season]
       ,[Logo]
       ,[Contact_No]
       ,[Product_No_Title]
       ,[Ref_NO_Title]
       ,[Remark_Title]
       ,[Selected]
       ,[Shipmented]
       ,[Subject]
       ,[Charge_Price_Rate]
       ,[UserID]
       ,[Client_Selected]
       ,[Agent_Selected]
       ,[Keep_Selected]
       ,[Data_Updater]
       ,Convert(varchar(10),[Data_Update],111) as [Data_Update]
       FROM Samples s WITH (NoLock, NoWait)
       WHERE ProduceID = {ProduceID}
   End            
   if(@Mode = 0 or @Mode = 2)
   Begin
       Select [Sample_Produce_DetailID]
       --,[Sample_TypeID]
       --,(Select Sample_Type From Sample_Type st with(NoLock,NoWait) where st.Sample_TypeID = sd.Sample_TypeID ) as [Sample_Type]
       ,[Sample_Name]
       ,[Product_No]
       --,[Size]
       --, (Select Size_Name From Product_Size ps where ps.SizeID = [Size]) as [Size_Name]
       ,(Select s.Sample_Size
         From Product p with(NoLock,NoWait) 
         Inner Join Style s with(NoLock,NoWait) on p.Style_No = s.Style_No
         Where p.Product_No = sd.Product_No) as Sample_Size
       ,s.[Factory_SubID]
       ,[Qty]
       ,[Agent_Qty]
       ,[Keep_Qty]
       ,[Charge_Qty]
       ,[Patten_Status]
       ,Convert(varchar(10),[Upper_Prepare],111) as [Upper_Prepare]
       ,[Last_Status]
       ,[Outsole_Status]
       ,Convert(varchar(10),[Bottom_Prepare],111) as [Bottom_Prepare]
       ,Convert(varchar(10),[Material_Prepare],111) as [Material_Prepare]
       ,Convert(varchar(10),[Stitching_Date],111) as [Stitching_Date]
       ,Convert(varchar(10),[Lastting_Date],111) as [Lastting_Date]
       ,Convert(varchar(10),[Finish_Date],111) as [Finish_Date]
       ,Convert(varchar(10),[Send_Out_Date],111) as [Send_Out_Date]
       ,Convert(varchar(10),[Sample_Approved_Date],111) as [Sample_Approved_Date]
       ,[Remark]
       ,[Order_No]       
       , (Select Produce_No From Order_Detail od with(NoLock,NoWait) Where od.Order_DetailID = sd.Order_DetailID) as [Produce_No]
       ,[Selected] 
       From Samples s with(NoLock,NoWait)
       Inner Join Sample_Detail sd with(NoLock, NoWait) on s.ProduceID = sd.ProduceID
       Where s.ProduceID = {ProduceID}
       And ({Product_No} = '' or sd.Product_No = {Product_No} )
       Order by Product_No, Produce_No
   End
   `, req.body) ;
   //console.log(strSQL)
   db.sql(req.SiteDB, strSQL)
      .then((result) => {              
         var DataSet = {Samples: (req.body.Mode == 0 || req.body.Mode == 1) ? result.recordsets[0] : []
           , Sample_Detail: (req.body.Mode == 0) ? result.recordsets[1] : (req.body.Mode == 2 ? result.recordsets[0] : [])};         
         //console.log(DataSet)
         res.send(DataSet);
      }).catch((err) => {
         console.log(err);
         res.status(500).send(err);
      })
 });


//Maintain Pre_Production_Sample_Request
router.post('/Pre_Production_Sample_Request_Maintain',  function (req, res, next) {
   console.log("Call Pre_Production_Sample_Request_Maintain Api:",req.body);

   // req.body.Mode === 0 表示新增
   // req.body.Mode === 1 表示修改
   // req.body.Mode === 2 表示刪除   
   var Size = 0;
   req.body.ProduceID = req.body.ProduceID ? `N'${req.body.ProduceID.trim().substring(0,18).replace(/'/g, "''")}'` : `''`; 
   
   if(req.body.Mode === 0 ) {
      //req.body.Order_DetailID = req.body.Order_DetailID ? req.body.Order_DetailID : 0;
      req.body.Product_No = req.body.Product_No ? `N'${req.body.Product_No.trim().substring(0,25).replace(/'/g, "''")}'` : `''`; 
      req.body.Sample_TypeID = req.body.Sample_TypeID ? `${req.body.Sample_TypeID}` : `''`; 
      
   }

   if(req.body.Mode === 1 && ( req.body.Name == 'Factory_SubID' || req.body.Name == 'Send_Out_Date' || req.body.Name == 'Sample_Approved_Date' )
      ) {
      switch(req.body.Name){
         case 'Factory_SubID':
            Size = 15;
         break;
      }
      req.body.Value = req.body.Value ? `N'${req.body.Value.trim().replace(/'/g, "''")}'` : `''`;
   }

   var strSQL = `Declare @ROWCOUNT int, @ProduceID Varchar(18)=${req.body.ProduceID} `
   switch(req.body.Mode){
      case 0:
         strSQL += format(`

            Declare @Factory_SubID varchar(20), @Size_Mode varchar(10), @Sample_Size real, @CustomerID varchar(15), @Currency varchar(4), @Season varchar(10)
            , @Product_No varchar(25), @Produce_No varchar(20), @new_style_Flag int
            , @Order_DetailID int 

            Set @Product_No = {Product_No}

            Set @new_style_Flag = (
               Select case when Count(*) = 0 then 1 else 0 end
               From Sample_Detail sd with(NoLock,NoWait) 
               Where sd.Product_No = @Product_No and sd.ProduceID <> @ProduceID ) 

            Select @Order_DetailID = tmp.Order_DetailID
            , @Factory_SubID = tmp.Factory_ID 
            , @CustomerID = tmp.CustomerID
            , @Currency = tmp.PO_Currency
            , @Season = tmp.Season            
            From (
               Select od.Factory_ID, o.CustomerID, o.PO_Currency, o.Season, Min(od.Order_DetailID) as Order_DetailID
               From Order_Detail od with(NoLock,NoWait) 
               Inner Join Orders o with(NoLock,NoWait) on o.Order_No = od.Order_No
               Where od.Product_No = @Product_No And o.Order_No = @ProduceID
               Group by od.Factory_ID, o.CustomerID, o.PO_Currency, o.Season
            ) tmp
            
            Select @Size_Mode = rtrim(s.Size_Mode)
            , @Sample_Size = s.Sample_Size
            From Product p with(NoLock,NoWait) 
            Inner Join Style s with(NoLock,NoWait) on p.Style_No = s.Style_No
            Where p.Product_No = @Product_No

            if ((Select count(*) From [dbo].[Samples] s Where s.ProduceID = @ProduceID) = 0)
            begin
               Declare @Department nvarchar(50), @OrganizationID nvarchar(50)
               Select @Department = d.Department_Code, @OrganizationID = d.OrganizationID
               from Employee e 
                  Inner Join Department d on e.DepartmentID = d.DepartmentID
                  Inner Join aspnet_Users au on e.EmployeeID = au.EmployeeID
               Where au.LoweredUserName = N'${req.UserID}'

               Insert [dbo].[Samples] ([ProduceID], [IS_PP_Sample], [OrganizationID], [Department]
                  , [Sample_Purpose], [Factory_SubID], [Size_Mode], [CustomerID]
                  , [Issue_Date], [Accept_Date], [Require_Date]
                  , [Currency], [Season], [Product_No_Title], [Ref_NO_Title], [Remark_Title]
                  , [Selected],[Shipmented])
               Select @ProduceID as [ProduceID], 1 as [IS_PP_Sample], @OrganizationID as [OrganizationID], @Department as [Department]
                  , 'CFM' as [Sample_Purpose], @Factory_SubID as [Factory_SubID], @Size_Mode as [Size_Mode], @CustomerID as [CustomerID]
                  , GetDate() as [Issue_Date], GetDate() as [Accept_Date], GetDate() as [Require_Date]
                  , @Currency as [Currency], @Season as [Season]
                  , 'Article No.' as [Product_No_Title], 'Ref NO' as [Ref_NO_Title], 'Remark' as [Remark_Title]
                  , convert(bit,0) as [Selected], convert(bit,0) as [Shipmented]
               Where (Select count(*) From [dbo].[Samples] s Where s.ProduceID = @ProduceID) = 0
            End

            INSERT INTO [dbo].[Sample_Detail] ([ProduceID], [Product_NO]
               , [Size], [Qty], [Agent_Qty], [Keep_Qty], [Charge_Qty]
               , [Patten_Status]
               , [Outsole_Status] 
               , [Selected]
               , [Sample_TypeID]
               , [Sample_Name]
               , [Order_DetailID])
            Select @ProduceID as [ProduceID], @Product_No as [Product_NO]
               , @Sample_Size as [Size], 0 as [Qty], 0 as [Agent_Qty], 0 as [Keep_Qty], 0 as [Charge_Qty]
               , case when @new_style_Flag = 1 then 'New' else 'Carry Over' End as [Patten_Status]
               , case when @new_style_Flag = 1 then 'New' else 'Carry Over' End as [Outsole_Status] 
               , 1 as [Selected]
               , {Sample_TypeID} as Sample_TypeID
               , (Select Sample_Type From Sample_Type s Where s.Sample_TypeID = {Sample_TypeID}) as [Sample_Name]
               , @Order_DetailID as [Order_DetailID]
/*            Where (
                     Select count(*) 
                     From [dbo].[Sample_Detail] s 
                     Where s.ProduceID = @ProduceID and Product_No = @Product_No and Sample_TypeID = {Sample_TypeID}
                  ) = 0;*/

            Set @ROWCOUNT = @@ROWCOUNT;
         `, req.body);
      break;
      case 1: 
         switch(req.body.Name){
            case 'Factory_SubID':
               strSQL += format(`
                  Update [dbo].[Samples] Set [{Name}] = ${Size == 0 ? '{Value}': `substring({Value},1,${Size})`}
                  where ProduceID = {ProduceID};
                  Set @ROWCOUNT = @@ROWCOUNT;
               `, req.body);
            break;
            default:
               strSQL += format(`
                  Update [dbo].[Sample_Detail] Set [{Name}] = ${Size == 0 ? '{Value}': `substring({Value},1,${Size})`}
                  where Sample_Produce_DetailID = {Sample_Produce_DetailID};
                  Set @ROWCOUNT = @@ROWCOUNT;
               `, req.body);
            break;
         }
      break;
      case 2:
         strSQL += format(`
            Delete FROM [dbo].[Sample_Detail] 
            where Sample_Produce_DetailID = {Sample_Produce_DetailID} 
            And (Select count(*) From SPSP_Detail spd with(NoLock,NoWait) Where spd.Sample_Produce_DetailID = {Sample_Produce_DetailID}) = 0;
            Set @ROWCOUNT = @@ROWCOUNT;
         `, req.body);
      break;
   }

   strSQL += format(`
   Select @ROWCOUNT as Flag;

   if(@ROWCOUNT > 0)
   Begin
      Update [dbo].[Samples] Set UserID = isnull(UserID, N'${req.UserID}')
      , Data_Updater = N'${req.UserID}'
      , Data_Update = GetDate()
      where ProduceID = @ProduceID;
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


//Get Pre-Production Sample Tracking control Info
router.post('/Pre_Production_Sample_Tracking_Control_Info',  function (req, res, next) {
   console.log("Call Pre_Production_Sample_Tracking_Control_Info Api:",req.body);  
 
   req.body.ProduceID = req.body.ProduceID ? `N'${req.body.ProduceID.trim().substring(0,18).replace(/'/g, "''")}'` : `''`;
   req.body.Factory_SubID = req.body.Factory_SubID ? `N'${req.body.Factory_SubID.trim().substring(0,15).replace(/'/g, "''")}'` : `''`;
   req.body.Season = req.body.Season ? `N'${req.body.Season.trim().substring(0,10).replace(/'/g, "''")}'` : `''`;
   req.body.Brand = req.body.Brand ? `N'${req.body.Brand.trim().substring(0,30).replace(/'/g, "''")}'` : `''`;
   req.body.Shoe_Name = req.body.Shoe_Name ? `N'${req.body.Shoe_Name.trim().substring(0,30).replace(/'/g, "''")}'` : `''`;
   req.body.Product_No = req.body.Product_No ? `N'${req.body.Product_No.trim().substring(0,25).replace(/'/g, "''")}'` : `''`;
   req.body.Produce_No = req.body.Produce_No ? `N'${req.body.Produce_No.trim().substring(0,20).replace(/'/g, "''")}'` : `''`;
   req.body.Orig_Shipping_Date_From = req.body.Orig_Shipping_Date_From ? `'${req.body.Orig_Shipping_Date_From.trim().substring(0,10).replace(/'/g, "''")}'` : `'1900/01/01'`; 
   req.body.Orig_Shipping_Date_To = req.body.Orig_Shipping_Date_To ? `'${req.body.Orig_Shipping_Date_To.trim().substring(0,10).replace(/'/g, "''")}'` : `'3500/01/01'`; 
   req.body.Orig_Shipping_Date = req.body.Orig_Shipping_Date ? `N'${req.body.Orig_Shipping_Date.substring(0,10)}'` : `''`;
 
 
   var strSQL = format(`   
   Declare @Tmp table(ProduceID Nvarchar(20), Sample_Produce_DetailID int, Product_No nvarchar(25)
   , Sample_TypeID Int, Factory_SubID Nvarchar(15)
   , Qty Float, Orig_Shipping_Date DateTime --, PP_Sample_Require_Date DateTime, PP_Sample_Remark Nvarchar(max)
   , Require_Date DateTime
   , Produce_No Nvarchar(20), Send_Out_Date DateTime, Sample_Approved_Date DateTime)

   Insert @Tmp 
   Select s.ProduceID
   , sd.Sample_Produce_DetailID
   , sd.Product_No   
   , sd.Sample_TypeID
   , s.Factory_SubID
   , (isnull(sd.Qty,0) + isnull(sd.Agent_Qty,0) + isnull(sd.Keep_Qty,0)) as Qty
   , Min(od.Orig_Shipping_Date) as Orig_Shipping_Date
   --, (Select p.PP_Sample_Require_Date From Produce p With(NoLock,NoWait) Where p.Produce_No = sd.Produce_No ) as PP_Sample_Require_Date
   --, (Select p.PP_Sample_Remark From Produce p With(NoLock,NoWait) Where p.Produce_No = sd.Produce_No ) as PP_Sample_Remark
   , s.Require_Date
   , sd.Produce_No
   , sd.Send_Out_Date
   , sd.Sample_Approved_Date
   From Samples s with(NoLock, NoWait)
   Inner Join Sample_Detail sd with(NoLock, NoWait) on s.ProduceID = sd.ProduceID
   Inner Join Order_Detail od with(NoLock,NoWait) on od.Order_No = s.Order_No and od.Product_No = sd.Product_No
   Where ({Factory_SubID} = 'All' or s.Factory_SubID = {Factory_SubID})
     And ({Season} = 'All' or s.Season = {Season})
     And ({Brand} = 'All' or s.Brand = {Brand})     
     And ({Product_No} = '' or sd.Product_No like '%' + {Product_No} + '%') 
     And (isnull(s.Order_No,'') <> '')
     AND (convert(varchar(10), Orig_Shipping_Date,111) like '%' + {Orig_Shipping_Date} + '%')
   Group by s.ProduceID
   , sd.Sample_Produce_DetailID
   , sd.Product_No   
   , sd.Sample_TypeID
   , s.Factory_SubID
   , (isnull(sd.Qty,0) + isnull(sd.Agent_Qty,0) + isnull(sd.Keep_Qty,0))
   , s.Require_Date
   , sd.Produce_No
   , sd.Send_Out_Date
   , sd.Sample_Approved_Date;

   Select pt.Style_No
   , b.BrandID
   , s.Brand
   , pt.Name
   , isnull(pt.Photo_Month,'') as Photo_Month
   , t.Product_No
   , s.Outsole_No   
   , s.Last_No
   , case when t.Require_Date is null then '' else Convert(varchar(10), t.Require_Date,111) end as Require_Date
   , min(case when pt.PP_Sample_Require_Date is null then '' else Convert(varchar(10), pt.PP_Sample_Require_Date,111) end) as PP_Sample_Require_Date
   , case when s.Fitting_Approve is null then '' else Convert(varchar(10), s.Fitting_Approve,111) end as Fitting_Approve
   , case when pt.CFM_Approve is null then '' else Convert(varchar(10), pt.CFM_Approve,111) end as CFM_Approve
   , min(case when t.Orig_Shipping_Date is null then '' else Convert(varchar(10), (t.Orig_Shipping_Date),111) end) as Orig_Shipping_Date
   , isnull(pt.PP_Sample_Remark,'') as PP_Sample_Remark
   , isnull(t.ProduceID,'') as ProduceID
   , sum(Qty) as Total_Qty
   From @Tmp t   
   Inner Join Product pt with(NoWait, NoLock) on pt.Product_No = t.Product_No
   Inner Join Style s with(NoLock,NoWait) on s.Style_No = pt.Style_No
   Inner Join Brand b with(NoLock,NoWait) on s.Brand = b.Brand
   Where ({Shoe_Name} = '' or pt.Name like '%' + {Shoe_Name} + '%')
   Group by pt.Style_No, b.BrandID, s.Brand, pt.Name, pt.Photo_Month, t.Product_No, s.Outsole_No , s.Last_No, t.Require_Date
   , s.Fitting_Approve, pt.CFM_Approve, pt.PP_Sample_Require_Date, pt.PP_Sample_Remark, t.ProduceID, t.Orig_Shipping_Date;
   
   Select t.ProduceID
   , t.Sample_Produce_DetailID   
   , t.Product_No
   , t.Produce_No
   , st.Sample_Type as Sample_Name
   , Factory_SubID
   , Qty
   , case when t.Send_Out_Date is null then '' else Convert(varchar(10), t.Send_Out_Date,111) end as Send_Out_Date
   , case when t.Sample_Approved_Date is null then '' else Convert(varchar(10), t.Sample_Approved_Date,111) end as Sample_Approved_Date
   From @Tmp t
   Inner Join Sample_Type st with(NoLock,NoWait) on st.Sample_TypeID = t.Sample_TypeID
   Group by t.ProduceID, t.Sample_Produce_DetailID, t.Product_No, t.Produce_No, st.Sample_Type, Factory_SubID, Qty
   , case when t.Send_Out_Date is null then '' else Convert(varchar(10), t.Send_Out_Date,111) end 
   , case when t.Sample_Approved_Date is null then '' else Convert(varchar(10), t.Sample_Approved_Date,111) end 
   Order by Product_No, Factory_SubID, Sample_Type;
   `, req.body) ;
   //console.log(strSQL)
   db.sql(req.SiteDB, strSQL)
      .then((result) => {              
         var DataSet = { Sample_Detail: result.recordsets[0] }
         
        result.recordsets[0].forEach((item)=>{
            item.Sample_Type_Info = result.recordsets[1].filter((obj)=>(item.ProduceID == obj.ProduceID && item.Product_No == obj.Product_No))
        })
         //console.log(DataSet)
         res.send(DataSet);
      }).catch((err) => {
         console.log(err);
         res.status(500).send(err);
      })
 });

//Maintain Pre_Production_Sample_Tracking_Control
router.post('/Pre_Production_Sample_Tracking_Control_Maintain',  function (req, res, next) {
   console.log("Call Pre_Production_Sample_Tracking_Control_Maintain Api:",req.body);

   // req.body.Mode === 0 表示修改 Produce 欄位資料
   // req.body.Mode === 1 表示修改 Sample_Detail 欄位資料
   // req.body.Mode === 2 表示修改 Style Fitting_Approve欄位資料
   // req.body.Mode === 3 表示修改 Produce CFM_Approve欄位資料
   var Size = 0;
   req.body.ProduceID = req.body.ProduceID ? `N'${req.body.ProduceID.trim().substring(0,18).replace(/'/g, "''")}'` : `''`; 
   
   if(req.body.Mode === 0 ) {
      //req.body.Order_DetailID = req.body.Order_DetailID ? req.body.Order_DetailID : 0;
      req.body.Produce_No = req.body.Produce_No ? `N'${req.body.Produce_No.trim().substring(0,20).replace(/'/g, "''")}'` : `''`;
      req.body.Value = req.body.Value ? `'${req.body.Value}'` : `null`;
   }

   if(req.body.Mode === 1 && ( req.body.Name == 'Send_Out_Date' || req.body.Name == 'Sample_Approved_Date' || req.body.Name == 'Sample_Name' )
      ) {
      switch(req.body.Name){
         case 'Send_Out_Date':
         case 'Sample_Approved_Date':
               Size = 10;
         break;
         case 'Sample_Name':
               Size = 50;
         break;
      }
      req.body.Value = req.body.Value ? `'${req.body.Value}'` : `null`;
   }

   if(req.body.Mode === 2 || req.body.Mode === 3  ) {
      switch(req.body.Name){
         case 'Fitting_Approve':
         case 'CFM_Approve':
               Size = 10;
         break;
      }
      req.body.Value = req.body.Value ? `'${req.body.Value}'` : `null`;
   }


   var strSQL = `Declare @ROWCOUNT int, @ProduceID Varchar(18)=${req.body.ProduceID} `
   switch(req.body.Mode){
      case 0:
         strSQL += format(`
            Update Produce Set [{Name}] = {Value}
            Where Produce_No = {Produce_No};
            Set @ROWCOUNT = @@ROWCOUNT;            
         `, req.body);
      break;
      case 1:
         strSQL += format(`         
            Update [dbo].[Sample_Detail] Set [{Name}] = {Value}
            where Sample_Produce_DetailID = {Sample_Produce_DetailID};
            Set @ROWCOUNT = @@ROWCOUNT;            
         `, req.body);
      break;
      case 2:
         strSQL += format(`
            Update Style Set Fitting_Approve = {Value}
            Where Style_No = '{Style_No}';
            Select @@ROWCOUNT as Flag;
         `, req.body);
      break;
      case 3:
         strSQL += format(`
            Update Product Set [{Name}] = {Value}
            Where Product_No = '{Product_No}';
            Select @@ROWCOUNT as Flag;
         `, req.body);
      break;
   }

   strSQL += (req.body.Mode == 0 || req.body.Mode == 1) ? format(`
   Select @@ROWCOUNT as Flag;
   if(@ROWCOUNT > 0 )
   Begin
      Update [dbo].[Samples] Set UserID = isnull(UserID, N'${req.UserID}')
      , Data_Updater = N'${req.UserID}'
      , Data_Update = GetDate()
      where ProduceID = @ProduceID;
   End
   `, req.body) : '';
   //console.log(strSQL)
   db.sql( (req.body.Mode == 0 || req.body.Mode == 1) ? req.SiteDB:req.Enterprise , strSQL)
      .then((result) => {
         //console.log(result.recordsets[0])
         res.send({Flag:result.recordsets[0][0].Flag > 0});
      }).catch((err) => {
         console.log(err);
         res.status(500).send(err);
      })

});


/* Mark-Wang API End */


/* Darren-Chang API Begin */

// Get SKU_Detail
router.get('/Order_Report_SKU_Detail/:Order_No', function (req, res, next) {
  console.log("Call Order_Report_SKU_Detail Api:", req.params.Order_No);

  var strSQL = format(`
Declare @Order_No nvarchar(25) = '${req.params.Order_No}'

Select distinct o.Order_No, o.Brand + ' ' + o.Season + ' ' + isnull(o.Subject, '') as Subject,
Convert(varchar(10),o.Order_Date,111) as Order_Date, od.Factory_ID From Orders o with(NoLock,NoWait)
Inner Join Order_Detail od with(NoLock,NoWait) on o.Order_No = od.Order_No
Where o.Order_No = @Order_No

Select od.Factory_ID, Est_Shipping_Date, isnull(Photo_Month, Sketch_Month) as Photo_Month
, case when len(isnull(Photo_Month, '')) > 0 then 0 else 1 end as Photo_Type
, od.Product_No, isnull(p.Color_Code,'') +' '+ isnull(p.Color,'') as Color, p.[Name]
, s.Last_No, s.Outsole_No, s.Pattern_No
, pe.Purchase_Project_No, pe.Produce_No, Sum(od.Qty) as Qty
From Order_Detail od with(NoLock,NoWait)
Inner Join Product p with(NoLock,NoWait) on od.Product_No = p.Product_No
Inner Join Style s with(NoLock,NoWait) on p.Style_No = s.Style_No
Left Outer Join Produce pe with(NoLock,NoWait) on pe.Produce_No = od.Produce_No
Where od.Order_No = @Order_No
Group by od.Factory_ID, Est_Shipping_Date, Photo_Month, Sketch_Month
, od.Product_No, p.Color_Code, p.Color, p.[Name]
, s.Last_No, s.Outsole_No, s.Pattern_No
, pe.Purchase_Project_No, pe.Produce_No
Order by od.Factory_ID, Est_Shipping_Date, s.Pattern_No

   `, req.body);
  // console.log(strSQL)
  db.sql(req.SiteDB, strSQL).then((result) => {
    let SKU_Title = [...result.recordsets[0].reduce((r, e) => {
      let k = `${e.Order_No}`;
      if (!r.has(k)) {
        // console.log(r)
        r.set(k, {
          ...e,
          Factory: [{
            Factory_ID: e.Factory_ID
          }]
        })
      } else {
        // console.log(r.get(k).Factory_ID, e.Factory_ID)
        r.get(k).Factory.push({
          Factory_ID: e.Factory_ID
        })
      }
      return r;
    }, new Map).values()]

    let SKU_Detail = [...result.recordsets[1].reduce((r, e) => { // 計算相同 Est_Shipping_Date 與 Factory_ID 重複的次數
      let k = `${e.Est_Shipping_Date}|${e.Factory_ID}`;
      if (!r.has(k)) {
        // console.log(r)
        r.set(k, {
          rowSpan: 1,
          tempIndex: 1,
          styleTotal: e.Qty,
          Factory_ID: e.Factory_ID,
          Est_Shipping_Date: e.Est_Shipping_Date,
          detailArray: [e],
        })
      } else {
        r.get(k).rowSpan++
        r.get(k).styleTotal += e.Qty
        r.get(k).detailArray.push(e)
      }
      return r;
    }, new Map).values()]

    SKU_Title[0].Factory.forEach(tEle => {
      tEle.Factory_Total = 0
      tEle.tempIndex = 0
      SKU_Detail.forEach((dEle, index, array) => {
        if (tEle.Factory_ID === dEle.Factory_ID) {
          tEle.Factory_Total += dEle.styleTotal
          dEle.tempIndex += tEle.tempIndex
          tEle.tempIndex += dEle.rowSpan
        }
      });
    });

    res.send({
      SKU_Title: SKU_Title,
      SKU_Detail: SKU_Detail
    });

  }).catch((err) => {
    console.log(err);
    res.status(500).send(err);
  })
});

// Get NOI_Detail
router.get('/Order_Report_New_Order_Info/:Order_No', function (req, res, next) {
  console.log("Call Order_Report_New_Order_Info Api:", req.params.Order_No);

  var strSQL = format(`
Declare @Order_No nvarchar(25) = '${req.params.Order_No}'

Select distinct o.Order_No, o.Brand + ' ' + o.Season + ' ' + isnull(o.Subject, '') as Subject,
Convert(varchar(10),o.Order_Date,111) as Order_Date, od.Factory_ID From Orders o with(NoLock,NoWait)
Inner Join Order_Detail od with(NoLock,NoWait) on o.Order_No = od.Order_No
Where o.Order_No = @Order_No

Select od.Factory_ID, s.Pattern_No, isnull(Photo_Month, Sketch_Month) as Photo_Month,
case when len(isnull(Photo_Month, '')) > 0 then 0 else 1 end as Photo_Type,
od.Product_No, isnull(p.Color_Code,'') +' '+ isnull(p.Color,'') as Color, p.[Name], s.Last_No, s.Outsole_No, pe.Purchase_Project_No, pe.Produce_No, s.Gender,
(SELECT MIN(Size) FROM Order_Qty as oq Inner Join Order_Detail as od
ON od.Order_DetailID = oq.Order_DetailID WHERE od.Product_No = p.Product_No GROUP BY od.Product_No) as MIN_Size,
(SELECT MAX(Size) FROM Order_Qty as oq Inner Join Order_Detail as od
ON od.Order_DetailID = oq.Order_DetailID WHERE od.Product_No = p.Product_No GROUP BY od.Product_No) as MAX_Size,
convert(varchar(10),Orig_Shipping_Date,111) as Orig_Shipping_Date, Est_Shipping_Date, Sum(od.Qty) as Qty From Order_Detail od with(NoLock,NoWait)
Inner Join Product p with(NoLock,NoWait) on od.Product_No = p.Product_No
Inner Join Style s with(NoLock,NoWait) on p.Style_No = s.Style_No
Left Outer Join Produce pe with(NoLock,NoWait) on pe.Produce_No = od.Produce_No
Where od.Order_No = @Order_No
Group by od.Factory_ID, s.Pattern_No, od.Product_No, p.Product_No, Orig_Shipping_Date, Est_Shipping_Date, Photo_Month, Sketch_Month, p.Color_Code, p.Color,
p.[Name], s.Last_No, s.Outsole_No, pe.Purchase_Project_No, pe.Produce_No, s.Gender
Order by od.Factory_ID, s.Pattern_No desc, s.Last_No, s.Outsole_No

   `, req.body);
  // console.log(strSQL)
  db.sql(req.SiteDB, strSQL).then((result) => {
    let NOI_Title = [...result.recordsets[0].reduce((r, e) => {
      let k = `${e.Order_No}`;
      if (!r.has(k)) {
        // console.log(r)
        r.set(k, {
          ...e,
          Factory: [{
            Factory_ID: e.Factory_ID
          }]
        })
      } else {
        // console.log(r.get(k).Factory_ID, e.Factory_ID)
        r.get(k).Factory.push({
          Factory_ID: e.Factory_ID
        })
      }
      return r;
    }, new Map).values()]

    let NOI_Detail = [...result.recordsets[1].reduce((r, e) => { // 計算相同 Pattern_No 與 Factory_ID 重複的次數
      let k = `${e.Pattern_No}|${e.Factory_ID}`;
      if (!r.has(k)) {
        // console.log(r)
        r.set(k, {
          rowSpan: 1,
          tempIndex: 1,
          styleTotal: e.Qty,
          Factory_ID: e.Factory_ID,
          Pattern_No: e.Pattern_No,
          detailArray: [e],
        })
      } else {
        r.get(k).rowSpan++
        r.get(k).styleTotal += e.Qty
        r.get(k).detailArray.push(e)
      }
      return r;
    }, new Map).values()]

    NOI_Title[0].Factory.forEach(tEle => {
      tEle.Factory_Total = 0
      tEle.tempIndex = 0
      NOI_Detail.forEach((dEle, index, array) => {
        if (tEle.Factory_ID === dEle.Factory_ID) {
          tEle.Factory_Total += dEle.styleTotal
          dEle.tempIndex += tEle.tempIndex
          tEle.tempIndex += dEle.rowSpan
        }
      });
    });

    res.send({
      NOI_Title: NOI_Title,
      NOI_Detail: NOI_Detail
    });

  }).catch((err) => {
    console.log(err);
    res.status(500).send(err);
  })
});

router.post('/Split_Price',  function (req, res, next) {
   console.log("Call Split_Price Api:",req.body);

   req.body.Order_No = req.body.Order_No ? `N'${req.body.Order_No.trim().substring(0,18).replace(/'/g, "''")}'` : `''`; 

   var strSQL = format(`
   Declare @New_Order_DetailID int, @Flag int
   , @ROWCOUNT int = 0
   , @ROWCOUNT1 int = 0
   , @ROWCOUNT2 int = 0
   , @ROWCOUNT3 int = 0
   , @ROWCOUNT4 int = 0

   Insert into [dbo].[Order_Detail] (Order_No, Produce_No, Product_No, Customer_Product_No, Order_Detail_RefID, Unit_Price, Other_Expense, Factory_Price, Est_Process_Cost, Producing_Cost
   , PCost_Others, Overhead, Orig_Shipping_Date, Destination, Est_Shipping_Date, Remark, Factory_ID, Commission, MTR_Declare_Rate, Size_Status, PO_No)
   Select Order_No, Produce_No, Product_No, Customer_Product_No, Order_Detail_RefID, {Split_Unit_Price} as Unit_Price, Other_Expense, Factory_Price, Est_Process_Cost, Producing_Cost
   , PCost_Others, Overhead, Orig_Shipping_Date, Destination, Est_Shipping_Date, Remark, Factory_ID, Commission, MTR_Declare_Rate, Size_Status, PO_No
   from [dbo].[Order_Detail] where Order_DetailID = {Order_DetailID}

   Set @New_Order_DetailID = SCOPE_IDENTITY()
   Set @ROWCOUNT = @@ROWCOUNT;
   
   Insert into [dbo].[Order_Detail_Expense] (Order_DetailID, CustomerID, Category, Calculate_From, Calculate_By, Rate, Expense, Description, Doc, OrigID)
   Select @New_Order_DetailID as Order_DetailID, CustomerID, Category, Calculate_From, Calculate_By, Rate, Expense, Description, Doc, OrigID
   from [dbo].[Order_Detail_Expense] where Order_DetailID = {Order_DetailID}

   Insert Order_Qty(Order_DetailID, Size, Qty, Prerange)
   Select @New_Order_DetailID as Order_DetailID, Size, Qty, Prerange
   from [dbo].[Order_Qty] where Order_DetailID = {Order_DetailID} And (Size = 999`, req.body) ;
   
   req.body.Size_Qty_Info.forEach(element => {
      if (element.isSplit) {
         strSQL += ` or Size = ${element.Size}`
      }
   });
   strSQL += `)

   Set @ROWCOUNT1 = @@ROWCOUNT;
   `

   strSQL += format(`
   Delete From Order_Qty Where Order_DetailID = {Order_DetailID} And (Size = 999`, req.body)

   req.body.Size_Qty_Info.forEach(element => {
      if (element.isSplit) {
         strSQL += ` or Size = ${element.Size}`
      }
   });

   strSQL += format(`)
   Set @ROWCOUNT2 = @@ROWCOUNT;

   Update Order_Detail set Qty = isnull((Select Sum(oq.Qty) From Order_Qty oq with(NoLock, NoWait) Where oq.Order_DetailID = {Order_DetailID}) ,0) Where Order_DetailID = {Order_DetailID}
   Set @ROWCOUNT3 = @@ROWCOUNT;

   Update Order_Detail set Qty = isnull((Select Sum(oq.Qty) From Order_Qty oq with(NoLock, NoWait) Where oq.Order_DetailID = @New_Order_DetailID) ,0) Where Order_DetailID = @New_Order_DetailID
   Set @ROWCOUNT4 = @@ROWCOUNT;
   
   Set @Flag = @ROWCOUNT + @ROWCOUNT1 + @ROWCOUNT2 + @ROWCOUNT3 + @ROWCOUNT4;
   Select @Flag as Flag;

   if(@Flag > 0)
   Begin
      Update [dbo].[Orders] Set UserID = isnull(UserID, N'${req.UserID}'), Data_Updater = N'${req.UserID}'
      , Data_Update = GetDate()
      where Order_No = {Order_No}
   End
   `, req.body)

   // console.log(strSQL)
   // res.send({Flag: true});
   db.sql(req.SiteDB, strSQL)
      .then((result) => {
         res.send({Flag:result.recordsets[0][0].Flag > 0});
      }).catch((err) => {
         console.log(err);
         res.status(500).send(err);
      })
});

router.post('/Import_PKO_QtyToOrder',  function (req, res, next) {
   console.log("Call Import_PKO_QtyToOrder Api:",req.body);

   req.body.Order_No = req.body.Order_No ? `N'${req.body.Order_No.trim().substring(0,18).replace(/'/g, "''")}'` : `''`; 

   var strSQL = format(`
   Declare @Flag int
   , @ROWCOUNT int = 0
   , @ROWCOUNT1 int = 0
   , @ROWCOUNT2 int = 0
   , @ROWCOUNT3 int = 0

   Delete From Order_Detail
   Where Order_Detail_RefID = {Order_Detail_RefID} And Order_DetailID <> {Order_DetailID};
   Set @ROWCOUNT = @@ROWCOUNT;

   Delete From Order_Qty Where Order_DetailID = {Order_DetailID}
   Set @ROWCOUNT1 = @@ROWCOUNT;

   Insert [dbo].[Order_Qty] ([Order_DetailID], [Size], [Qty], [Prerange])
   SELECT {Order_DetailID} as Order_DetailID, q.Size, SUM(isnull(q.Qty , 0) * isnull(pd.Cartons,0)) as Qty, 0 as Prerange
   FROM Order_PKO op
   Inner Join Order_PKO_Detail pd With(NoLock,NoWait) on op.Order_PKOID = pd.Order_PKOID
   Inner Join Order_PKO_Detail_Qty q With(NoLock,NoWait) on pd.Order_PKO_DetailID = q.Order_PKO_DetailID
   WHERE op.Order_Detail_RefID = {Order_Detail_RefID}
   GROUP BY q.Size
   Set @ROWCOUNT2 = @@ROWCOUNT;

   Update Order_Detail set Qty = isnull((Select Sum(oq.Qty) From Order_Qty oq with(NoLock, NoWait) Where oq.Order_DetailID = {Order_DetailID}) ,0)
   Where Order_DetailID = {Order_DetailID}
   Set @ROWCOUNT3 = @@ROWCOUNT;

   Set @Flag = @ROWCOUNT + @ROWCOUNT1 + @ROWCOUNT2 + @ROWCOUNT3;
   Select @Flag as Flag;

   if(@Flag > 0)
   Begin
      Update [dbo].[Orders] Set UserID = isnull(UserID, N'${req.UserID}'), Data_Updater = N'${req.UserID}'
      , Data_Update = GetDate()
      where Order_No = {Order_No}
   End
   `, req.body)

   // console.log(strSQL)
   // res.send({Flag: true});
   db.sql(req.SiteDB, strSQL)
      .then((result) => {
         res.send({Flag:result.recordsets[0][0].Flag > 0});
      }).catch((err) => {
         console.log(err);
         res.status(500).send(err);
      })

});

router.post('/Group_RefID',  function (req, res, next) {
   console.log("Call Group_RefID Api:", req.body);

   // req.body.Mode === 0 表示將訂單內相同 Product_No / Ref_No 合併為同一組 RefID, 若有 Order_PKO 也會合併
   // req.body.Mode === 1 表示將訂單內相同 Product_No / Ref_No 取消合併

   req.body.Order_No = req.body.Order_No ? `N'${req.body.Order_No.trim().substring(0, 18).replace(/'/g, "''")}'` : `''`;
   req.body.Product_No = req.body.Product_No ? `N'${req.body.Product_No.trim().substring(0, 20).replace(/'/g, "''")}'` : `''`; 
   req.body.Ref_No = req.body.Ref_No ? `N'${req.body.Ref_No.trim().substring(0, 20).replace(/'/g, "''")}'` : `''`; 

   var strSQL = format(`
   Declare @ROWCOUNT int = 0, @Mode int = {Mode}, @MIN_RefID int

   if(@Mode = 0)
   Begin
     SET @MIN_RefID = (SELECT MIN(od.[Order_Detail_RefID]) as MIN_RefID
     FROM [dbo].[Order_Detail] od
     INNER JOIN [dbo].[Order_Detail_Ref] odf ON odf.Order_Detail_RefID = od.Order_Detail_RefID
     WHERE Product_No = {Product_No} AND odf.[Ref_No] = {Ref_No} AND Order_No = {Order_No}
     Group by odf.[Ref_No], Product_No, Order_No)
 
     UPDATE [dbo].[Order_PKO]
     SET Order_Detail_RefID = @MIN_RefID
     FROM [dbo].[Order_PKO] op
     JOIN [dbo].[Order_Detail_Ref] odf ON odf.Order_Detail_RefID = op.Order_Detail_RefID
     JOIN [dbo].[Order_Detail] od ON od.Order_Detail_RefID = odf.Order_Detail_RefID
     WHERE od.[Product_No] = {Product_No} AND odf.[Ref_No] = {Ref_No} AND od.[Order_No] = {Order_No}

     
     UPDATE [dbo].[Order_Detail]
     SET Order_Detail_RefID = @MIN_RefID
     FROM [dbo].[Order_Detail] od
     JOIN [dbo].[Order_Detail_Ref] odf ON odf.Order_Detail_RefID = od.Order_Detail_RefID
     WHERE od.[Product_No] = {Product_No} AND odf.[Ref_No] = {Ref_No} AND od.[Order_No] = {Order_No}
     
     Set @ROWCOUNT = @@ROWCOUNT;
     
     if(@ROWCOUNT > 0)
     Begin
       Delete tmp_Ref FROM [dbo].[Order_Detail_Ref] as tmp_Ref
       Inner Join Order_Detail od with(NoLock,NoWait) on tmp_Ref.Order_Detail_RefID = od.Order_DetailID
       WHERE od.[Order_No] = {Order_No} AND od.[Product_No] = {Product_No} AND tmp_Ref.[Order_Detail_RefID] <> @MIN_RefID
     End
   End
 
   if(@Mode = 1)
   Begin
     UPDATE [dbo].[Order_Detail]
     SET Order_Detail_RefID = Order_DetailID
     FROM [dbo].[Order_Detail] od
     JOIN [dbo].[Order_Detail_Ref] odf ON odf.Order_Detail_RefID = od.Order_Detail_RefID
     WHERE od.[Product_No] = {Product_No} AND odf.[Ref_No] = {Ref_No} AND od.[Order_No] = {Order_No}

     Set @ROWCOUNT = @@ROWCOUNT;
   End

   Select @ROWCOUNT as Flag;
   if(@ROWCOUNT > 0)
   Begin
     Update [dbo].[Orders] Set UserID = isnull(UserID, N'${req.UserID}'), Data_Updater = N'${req.UserID}', Data_Update = GetDate()
     WHERE Order_No = {Order_No}
   End
   `, req.body)

   // console.log(strSQL)
   // res.send({Flag: true});
   db.sql(req.SiteDB, strSQL)
      .then((result) => {
         res.send({Flag:result.recordsets[0][0].Flag > 0});
      }).catch((err) => {
         console.log(err);
         res.status(500).send(err);
      })

});
/* Darren-Chang API End */

module.exports = router;