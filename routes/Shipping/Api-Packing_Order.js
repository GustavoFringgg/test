var express = require('express');
var router = express.Router();
const format = require('string-format');
var db = require('../../config/DB_Connect');
const cloneDeep = require('lodash/cloneDeep');
var moment = require('moment');

/* Mark-Wang API Begin */

//Check PKO_No
router.post('/Check_PKO_No',  function (req, res, next) {
   console.log("Call Check_PKO_No Api:",req.body);

   req.body.PKO_No = req.body.PKO_No ? `N'${req.body.PKO_No.trim().substring(0,20).replace(/'/g, "''")}'` : `''`; 

   var strSQL = format(`
   SELECT Count(*) as RecCount
   FROM [dbo].[Order_PKO] With(Nolock,NoWait)
   where [PKO_No] = {PKO_No}
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

//Check Order_No
router.post('/Check_Order_No',  function (req, res, next) {
   console.log("Call Check_Order_No Api:",req.body);

   req.body.Order_No = req.body.Order_No ? `N'${req.body.Order_No.trim().substring(0,18).replace(/'/g, "''")}'` : `''`; 

   var strSQL = format(`
   SELECT Count(*) as RecCount
   FROM [dbo].[Orders] With(Nolock,NoWait)
   where [Order_No] = {Order_No}
   `, req.body) ;
   //console.log(strSQL)
   db.sql(req.SiteDB, strSQL)
      .then((result) => {
         //console.log(result.recordset[0].RecCount <= 0)
         res.send({Flag: result.recordset[0].RecCount > 0});
      }).catch((err) => {
         console.log(err);
         res.status(500).send(err);
      })
});

//Check Product_No
router.post('/Check_Product_No',  function (req, res, next) {
   console.log("Call Check_Product_No Api:",req.body);

   req.body.Product_No = req.body.Product_No ? `N'${req.body.Product_No.trim().substring(0,25).replace(/'/g, "''")}'` : `''`; 

   var strSQL = format(`
   SELECT Count(*) as RecCount
   FROM [dbo].[Product] With(Nolock,NoWait)
   where [Product_No] = {Product_No}
   `, req.body) ;
   //console.log(strSQL)
   db.sql(req.Enterprise, strSQL)
      .then((result) => {
         //console.log(result.recordset[0].RecCount <= 0)
         res.send({Flag: result.recordset[0].RecCount > 0});
      }).catch((err) => {
         console.log(err);
         res.status(500).send(err);
      })
});

//Get Order_No
router.post('/Get_Order_No',  function (req, res, next) {
   console.log("Call Get_Order_No Api:",req.body);

   var strSQL = format(` select Order_No
   From Orders o 
   Where o.Order_Date is not null 
   and year(o.Order_Date) between year(GetDate()) - 2 and year(GetDate())
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

//Get Product_No
router.post('/Get_Product_No',  function (req, res, next) {
   console.log("Call Get_Product_No Api:",req.body);

   var strSQL = format(`Select Product_No
   From Order_Detail od 
   Where od.Order_No = '{Order_No}'
   Group by Product_No;
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

//Get Ref_No
router.post('/Ref_No', function (req, res, next) {
   console.log("Call Ref_No Api :", req.body);

   req.body.Mode = req.body.Mode ? req.body.Mode : 0;
   req.body.Order_Detail_RefID = req.body.Order_Detail_RefID ? req.body.Order_Detail_RefID : null; 
   req.body.Order_No = req.body.Order_No ? `N'${req.body.Order_No.trim().substring(0,18).replace(/'/g, "''")}'` : `''`; 
   req.body.Product_No = req.body.Product_No ? `N'${req.body.Product_No.trim().substring(0,25).replace(/'/g, "''")}'` : `''`; 

   var strSQL = '';
   switch(req.body.Mode){
      case 0:
         strSQL = format(`
         Select distinct o.Order_Detail_RefID, o.Ref_No
         from Order_Detail_Ref o with(NoLock,NoWait)
         Inner Join Order_Detail od with(NoLock,NoWait) on o.Order_Detail_RefID = od.Order_Detail_RefID 
         Where od.Order_No = {Order_No}
         And od.Product_No = {Product_No}
         Order by o.Ref_No;
         `, req.body );
      break;
      case 1:
         strSQL = format(`
         Select distinct o.Order_Detail_RefID, o.Ref_No
         from Order_Detail_Ref o with(NoLock,NoWait)
         Inner Join Order_Detail od with(NoLock,NoWait) on o.Order_Detail_RefID = od.Order_Detail_RefID 
         Inner Join (Select distinct Order_No, Product_No 
                     From Order_Detail d with(NoLock,NoWait) 
                     Where d.Order_Detail_RefID = {Order_Detail_RefID} 
                  ) tmp on od.Order_No = tmp.Order_No And od.Product_No = tmp.Product_No
         Order by o.Ref_No;
         `, req.body );
      break;
   }

   //console.log(strSQL);

   db.sql(req.SiteDB, strSQL)
      .then((result) => {
         res.send(result.recordsets[0]);
      }).catch((err) => {
         console.log(err);
         res.status(500).send(err);
      })
});

//Fill_Up_Maintain
router.post('/Fill_Up_Maintain', function (req, res, next) {
   console.log("Call Fill_Up_Maintain Api :", req.body);

   req.body.Order_PKOID = req.body.Order_PKOID ? req.body.Order_PKOID : null;
   req.body.Order_Detail_RefID = req.body.Order_Detail_RefID ? req.body.Order_Detail_RefID : null;   
   req.body.Value = req.body.Value ? req.body.Value : 1;
   req.body.Size = req.body.Size ? req.body.Size : null; 
   req.body.Mix_Size = req.body.Mix_Size ? req.body.Mix_Size : []; 

   var Size = 0;
   var strSQL = format(`Declare @Order_PKOID int = {Order_PKOID}, @Order_Detail_RefID int = {Order_Detail_RefID}, @ROWCOUNT int = 0, @ROWCOUNT1 int = 0`, req.body);
   var tmpStr = 'Declare @tmpTable Table(RecNo int identity(1,1), Size real, Qty int, Cartons int); '

   // req.body.Mode === 0 表示產生Carton Code
   // req.body.Mode === 1 表示產生Carton No
   // req.body.Mode === 2 表示產生FillUp Packing Material Weight.
   // req.body.Mode === 3 表示自動計算每個Carton幾雙以PKO Remaining 產生所有Size的 Order_PKO_Detail和 Order_PKO_Detail_Qty .
   // req.body.Mode === 4 表示自動計算每個Carton幾雙以PKO Remaining 依單號Size產生Order_PKO_Detail和 Order_PKO_Detail_Qty .
   // req.body.Mode === 5 Balance Qty fillup to Goal Qty
   // req.body.Mode === 6 處理Mix Size Qty.
   // req.body.Mode === 7 Update Size Qty

   req.body.Mix_Size.forEach((item,idx,aaray)=>{
      //var Qty = Math.abs(item.Qty ? item.Qty : 0)
      var Qty = item.Qty ? item.Qty : 0
      var Remaining_Qty = item.Remaining_Qty ? item.Remaining_Qty : 0
      switch(req.body.Mod){
         case 3:            
            Qty = Remaining_Edit_Flage ? Qty : Remaining_Qty;
         break;
         case 4:            
            Qty = Remaining_Qty;
         break;
         case 6:            
            Qty = Qty <= Remaining_Qty ? Qty : Remaining_Qty;
         break;
         case 7:
         break;
      }

      if(idx == 0){
         tmpStr += ` Insert @tmpTable Select ${item.Size} as Size, ${Qty} as Qty, 0 as Cartons`
      } else {
         tmpStr +=  ` Union Select ${item.Size} as Size, ${Qty} as Qty, 0 as Cartons`
      }
   })

   switch(req.body.Mode){
      case 0:
         strSQL += format(`Declare @B_CNo bigint = {Value}         
         , @RecNo int = 1
         , @Rec int = 0
         
         Declare @tmpTable table (RecNo int identity(1,1),  Order_PKO_DetailID int, Carton_Code bigint)
         
         Insert @tmpTable(Order_PKO_DetailID)
         Select Order_PKO_DetailID
         From Order_PKO_Detail s with(NoLock,NoWait)
         Where s.Order_PKOID = @Order_PKOID
         
         Select @Rec = count(*) From @tmpTable
         
         While(@RecNo <= @Rec)
         Begin
            Update @tmpTable set Carton_Code = @B_CNo
            Where RecNo = @RecNo
            Set @B_CNo += 1
            Set @RecNo += 1
         End
      
         Update Order_PKO_Detail set Carton_Code = CAST(t.Carton_Code as varchar) 
         from Order_PKO_Detail pd with(NoWait, NoLock)
         Inner Join @tmpTable t on pd.Order_PKO_DetailID = t.Order_PKO_DetailID;
      
         Set @ROWCOUNT = @@ROWCOUNT
         `, req.body);      
      break;
      case 1:
         strSQL += format(`Declare @B_CNo int = {Value}   
         , @RecNo int = 1
         , @Rec int = 0
         , @Cartons int = 0
         , @Carton_Count int = 0
         , @C_Way int = 0
         , @All_Cartons int = 0 ;
         
         Declare @tmpTable table (RecNo int identity(1,1),  Order_PKO_DetailID int, Cartons int, Carton_No1 int, Carton_No2 int)
         
         Insert @tmpTable(Order_PKO_DetailID,Cartons)
         Select Order_PKO_DetailID, Cartons
         From Order_PKO_Detail s with(NoLock,NoWait)
         Where s.Order_PKOID = @Order_PKOID;
         
         Select @Rec = count(*) From @tmpTable;
         Set @All_Cartons = isnull((Select sum(Cartons) From @tmpTable),0)
         --Set @C_Way = case when isnull((Select Brand From Orders o with(NoLock,NoWait) Inner Join Order_PKO op with(NoLock,NoWait) on o.Order_No = op.Order_No Where op.Order_PKOID = @Order_PKOID),'') = 'HOFF' then 1 else 0 end
         
         
         While(@RecNo <= @Rec)
         Begin
            Select @Cartons = Cartons From  @tmpTable Where RecNo = @RecNo

            Set @Carton_Count = case when @C_Way = 0 then
                                   case when @RecNo = 1 then @B_CNo + @Cartons -1 else @Carton_Count + @Cartons end
                                else 
                                   @Carton_Count + @Cartons
                                end 
            
            Update @tmpTable set 
            Carton_No1 = case when @C_Way = 0 then
                              case when @Cartons = 0 then 0 else @Carton_Count - @Cartons + 1 end
                         else                              
                              case when @Cartons = 0 then 0 else @Carton_Count end
                         End     
            , Carton_No2 = case when @C_Way = 0 then
                              case when @Cartons = 0 then 0 else @Carton_Count end
                        else 
                              @All_Cartons
                        End
            Where RecNo = @RecNo
         
            Set @RecNo += 1
         End
         
         Update Order_PKO_Detail set Carton_No = CAST(t.Carton_No1 as varchar) 
         + case when @C_Way = 0 then ' - ' else ' of ' end
         + CAST(t.Carton_No2 as varchar)
         from Order_PKO_Detail pd with(NoWait, NoLock)
         Inner Join @tmpTable t on pd.Order_PKO_DetailID = t.Order_PKO_DetailID;
      
         set @ROWCOUNT = @@ROWCOUNT
         `, req.body);      
      break;
      case 2:
         strSQL += format(`
            Update [dbo].[Order_PKO_Detail] Set [{Name}] = ${Size == 0 ? '{Value}': `substring({Value},1,${Size})`}
            where Order_PKOID = {Order_PKOID};

            Set @ROWCOUNT = @@ROWCOUNT;
         `, req.body);         
      break;
      case 3:
      case 4:
         strSQL += format(`
         Declare @Qty int = {Value}, @RecNo int = 1, @Rec int = 0 ;

         Declare @IL float, @IW float, @IH float, @CC_Thickness float, @SP_Thickness float, @CC_Hemming float, @CCL float, @CCW float
         , @CL_Space float, @CW_Space float, @CH_Space float
         , @CL float, @CW float, @CH float
         , @CL_Items int, @CL_IBEdge nchar(2), @CW_Items int, @CW_IBEdge nchar(2), @CH_Items int, @CH_IBEdge nchar(2)

         Declare @Size Real, @Cartons int, @Order_PKO_DetailID int 
         
         ${ tmpStr }

         Delete from @tmpTable Where Qty = 0 or Qty < @Qty ${req.body.Mode == 4 ? ' or Size <> {Size} ':''};

         Update @tmpTable set Cartons = cast(Qty / @Qty as int)
         
         DECLARE _cursor CURSOR FOR   
         SELECT Size, Cartons
         FROM @tmpTable  
           
         OPEN _cursor  
         FETCH NEXT FROM _cursor INTO @Size, @Cartons  
            
         WHILE @@FETCH_STATUS = 0  
         BEGIN 
            Select Top 1 @IL = IL, @IW = IW, @IH = IH, @CC_Thickness = CC_Thickness, @SP_Thickness = SP_Thickness, @CC_Hemming = CC_Hemming
            , @CCL = CCL, @CCW = CCW
            , @CL_Space = CL_Space, @CW_Space = CW_Space, @CH_Space = CH_Space
            , @CL= CL, @CW = CW, @CH = CH
            , @CL_Items = CL_Items, @CL_IBEdge = @CL_IBEdge
            , @CW_Items = CW_Items, @CW_IBEdge = @CW_IBEdge
            , @CH_Items = CH_Items, @CH_IBEdge = @CH_IBEdge
            From [dbo].[Order_PKO_Detail] with(NoLock, NoWait)
            Where Order_PKOID = {Order_PKOID}
            Order by Order_PKO_DetailID desc;

            Insert into [dbo].[Order_PKO_Detail] (Order_PKOID, Cartons, Unit_Qty
            , IL, IW, IH, CC_Thickness, SP_Thickness, CC_Hemming
            , CCL, CCW
            , CL_Space, CW_Space, CH_Space
            , CL, CW, CH
            , CL_Items, CL_IBEdge
            , CW_Items, CW_IBEdge
            , CH_Items, CH_IBEdge)
            Select {Order_PKOID} as Order_PKOID, @Cartons as Cartons, @Qty as Unit_Qty
            , isnull(@IL,0) as IL, isnull(@IW,0) as IW, isnull(@IH,0) as IH, isnull(@CC_Thickness,0.5) as CC_Thickness, isnull(@SP_Thickness,0.5) as SP_Thickness, isnull(@CC_Hemming,3) as CC_Hemming
            , isnull(@CCL,0) as CCL, isnull(@CCW,0) as CCW
            , isnull(@CL_Space,0) as CL_Space, isnull(@CW_Space,0) as CW_Space, isnull(@CH_Space,0) as CH_Space
            , isnull(@CL,0) as CL, isnull(@CW,0) as CW, isnull(@CH,0) as CH
            , isnull(@CL_Items,4) as CL_Items, isnull(@CL_IBEdge,'IH') as CL_IBEdge
            , isnull(@CW_Items,3) as CW_Items, isnull(@CW_IBEdge,'IW') as CW_IBEdge
            , isnull(@CH_Items,1) as CH_Items, isnull(@CH_IBEdge,'IL') as CH_IBEdge;
                     
            Set @Order_PKO_DetailID = scope_identity();

            Insert into [dbo].[Order_PKO_Detail_Qty] (Order_PKO_DetailID, Size, Qty)
            Select @Order_PKO_DetailID as Order_PKO_DetailID, @Size as Size, @Qty as Qty 

            Set @ROWCOUNT += @@ROWCOUNT;

            FETCH NEXT FROM _cursor INTO @Size, @Cartons  
         END  
           
         CLOSE _cursor  
         DEALLOCATE _cursor  

         `, req.body);
      break;
      case 5:
         strSQL += format(` Declare @Order_Qty Table(Size real, Qty float);        

         Insert @Order_Qty(Size, Qty)
         Select Size, sum(oq.Qty) as Qty
         FROM Order_Detail od with(NoLock,NoWait)
         Inner Join Order_Qty oq with(NoLock,NoWait) on od.Order_DetailID = oq.Order_DetailID
         Where od.Order_Detail_RefID = @Order_Detail_RefID
         Group by Size;

         Insert [dbo].[Order_PKO_Qty] (Order_PKOID, Size, Qty, Delivered_Qty)
         Select {Order_PKOID} as Order_PKOID, o.Size, (isnull(o.Qty,0) - isnull(q.Qty,0)) as Qty, 0 as Delivered_Qty
         From @Order_Qty o 
         Left Outer Join (
            Select pq.Size, Sum(pd.Cartons * pq.Qty) as Qty
            From Order_PKO op with(NoLock,NoWait) 
            Inner Join Order_PKO_Detail pd with(NoLock,NoWait) on op.Order_PKOID = pd.Order_PKOID
            Inner Join Order_PKO_Detail_Qty pq with(NoLock,NoWait) on pq.Order_PKO_DetailID = pd.Order_PKO_DetailID
            Where op.Order_Detail_RefID = @Order_Detail_RefID
            Group by pq.Size 
          ) q on q.Size = o.Size 
          Left Outer Join [dbo].[Order_PKO_Qty] opq with(NoLock,NoWait) on opq.Size = o.Size And opq.Order_PKOID = @Order_PKOID
          Where opq.Size is null
          And (isnull(o.Qty,0) - isnull(q.Qty,0)) > 0;
 
         Set @ROWCOUNT1 = @@ROWCOUNT;
         `, req.body);         
      break;
      case 6:
         strSQL += format(` Declare @Unit_Qty int = {Value}, @Rec int = 0 ;

         Declare @IL float, @IW float, @IH float, @CC_Thickness float, @SP_Thickness float, @CC_Hemming float, @CCL float, @CCW float
         , @CL_Space float, @CW_Space float, @CH_Space float
         , @CL float, @CW float, @CH float
         , @CL_Items int, @CL_IBEdge nchar(2), @CW_Items int, @CW_IBEdge nchar(2), @CH_Items int, @CH_IBEdge nchar(2)
         
         Declare @Order_PKO_DetailID int 
         
         ${ tmpStr }

         Select @Rec = count(*), @Unit_Qty = sum(Qty) From @tmpTable
         
         if((@Rec) > 0 And @Unit_Qty > 0)
         Begin

            Select Top 1 @IL = IL, @IW = IW, @IH = IH, @CC_Thickness = CC_Thickness, @SP_Thickness = SP_Thickness, @CC_Hemming = CC_Hemming
            , @CCL = CCL, @CCW = CCW
            , @CL_Space = CL_Space, @CW_Space = CW_Space, @CH_Space = CH_Space
            , @CL= CL, @CW = CW, @CH = CH
            , @CL_Items = CL_Items, @CL_IBEdge = @CL_IBEdge
            , @CW_Items = CW_Items, @CW_IBEdge = @CW_IBEdge
            , @CH_Items = CH_Items, @CH_IBEdge = @CH_IBEdge
            From [dbo].[Order_PKO_Detail] with(NoLock, NoWait)
            Where Order_PKOID = {Order_PKOID}
            Order by Order_PKO_DetailID desc;

            Insert into [dbo].[Order_PKO_Detail] (Order_PKOID, Cartons, Unit_Qty
            , IL, IW, IH, CC_Thickness, SP_Thickness, CC_Hemming
            , CCL, CCW
            , CL_Space, CW_Space, CH_Space
            , CL, CW, CH
            , CL_Items, CL_IBEdge
            , CW_Items, CW_IBEdge
            , CH_Items, CH_IBEdge)
            Select {Order_PKOID} as Order_PKOID, 1 as Cartons, @Unit_Qty as Unit_Qty
            , isnull(@IL,0) as IL, isnull(@IW,0) as IW, isnull(@IH,0) as IH, isnull(@CC_Thickness,0.5) as CC_Thickness, isnull(@SP_Thickness,0.5) as SP_Thickness, isnull(@CC_Hemming,3) as CC_Hemming
            , isnull(@CCL,0) as CCL, isnull(@CCW,0) as CCW
            , isnull(@CL_Space,0) as CL_Space, isnull(@CW_Space,0) as CW_Space, isnull(@CH_Space,0) as CH_Space
            , isnull(@CL,0) as CL, isnull(@CW,0) as CW, isnull(@CH,0) as CH
            , isnull(@CL_Items,4) as CL_Items, isnull(@CL_IBEdge,'IH') as CL_IBEdge
            , isnull(@CW_Items,3) as CW_Items, isnull(@CW_IBEdge,'IW') as CW_IBEdge
            , isnull(@CH_Items,1) as CH_Items, isnull(@CH_IBEdge,'IL') as CH_IBEdge;
                      
            Set @Order_PKO_DetailID = scope_identity();

            Insert into [dbo].[Order_PKO_Detail_Qty] (Order_PKO_DetailID, Size, Qty)
            Select @Order_PKO_DetailID as Order_PKO_DetailID, t.Size, t.Qty
            From @tmpTable t
            Where t.Qty > 0

            Set @ROWCOUNT = @@ROWCOUNT;
            
         End
         `, req.body);         
      break;
      case 7:     
         strSQL += format(` Declare @Unit_Qty int = 0, @Rec int = 0 ;         
         
         Declare @tmpDetail Table(RecNo int identity(1,1), Size real, Qty int)
         Declare @Order_PKO_DetailID int 
         
         ${ tmpStr }

         Select @Rec = count(*), @Unit_Qty = sum(Qty) From @tmpTable
         
         if((@Rec) > 0 )
         Begin

            Insert @tmpDetail
            Select Size, sum(isnull(Qty,0) * isnull(opd.Cartons,0)) as Qty
            From Order_PKO_Detail opd with(NoWait, NoLock)
            Inner Join Order_PKO_Detail_Qty opq with(NoWait, NoLock) on opd.Order_PKO_DetailID = opq.Order_PKO_DetailID
            Where opd.Order_PKOID = {Order_PKOID}
            Group by Size;          

            Update Order_PKO_Qty set Qty = isnull(tmp.Qty,0) + isnull(t.Qty,0)
            From Order_PKO_Qty opq with(NoLock,NoWait)
            Left outer join @tmpTable t on opq.Size = t.Size
            Left outer Join @tmpDetail tmp on opq.Size = tmp.Size
            Where opq.Order_PKOID = {Order_PKOID};

            Set @ROWCOUNT = @@ROWCOUNT;
			
            Insert Order_PKO_Qty (Order_PKOID , Size, Qty)
            Select {Order_PKOID} as Order_PKOID, t.Size, isnull(tmp.Qty,0) + isnull(t.Qty,0) as Qty
            From @tmpTable t
   			Left outer Join @tmpDetail tmp on t.Size = tmp.Size
            left outer join Order_PKO_Qty opq with(NoLock,NoWait) on opq.Size = t.Size And opq.Order_PKOID = {Order_PKOID}
            Where opq.Size is null;

            Set @ROWCOUNT1 = @@ROWCOUNT;
         End
         `, req.body);         
      break;
   }

   strSQL += format(`
   Select @ROWCOUNT + @ROWCOUNT1 as Flag;

   if(@ROWCOUNT > 0)
   Begin
      Update [dbo].[Order_PKO] Set UserID = isnull(UserID, N'${req.UserID}')
      , Data_Updater = N'${req.UserID}'
      , Data_Update = GetDate()
      where Order_PKOID = {Order_PKOID};
   End
   `, req.body);   
   //console.log(strSQL);

   db.sql(req.SiteDB, strSQL)
      .then((result) => {
         //console.log(result.recordsets[0][0].Flag > 0)
         res.send({Flag:result.recordsets[0][0].Flag > 0});
      }).catch((err) => {
         console.log(err);
         res.status(500).send(err);
      })
});

//Get PKO_List
router.post('/PKO_List',  function (req, res, next) {
   console.log("Call PKO_List Api:", req.body);
   req.body.Order_PKOID = req.body.Order_PKOID ? req.body.Order_PKOID : 0;
   req.body.PKO_No = req.body.PKO_No ? `${req.body.PKO_No.trim().substring(0,20).replace(/'/g, '')}` : '';
   req.body.Order_No = req.body.Order_No ? `${req.body.Order_No.trim().substring(0,20).replace(/'/g, '')}` : '';
   req.body.Product_No = req.body.Product_No ? `${req.body.Product_No.trim().substring(0,25).replace(/'/g, '')}` : '';
   req.body.Produce_No = req.body.Produce_No ? `${req.body.Produce_No.trim().substring(0,20).replace(/'/g, '')}` : '';
   req.body.Ref_No = req.body.Ref_No ? `${req.body.Ref_No.trim().substring(0,20).replace(/'/g, '')}` : '';
   req.body.Destination = req.body.Destination ? `${req.body.Destination.trim().substring(0,30).replace(/'/g, '')}` : '';
   req.body.Shipping_Date_F = req.body.Shipping_Date_F ? `${req.body.Shipping_Date_F.trim().substring(0,10).replace(/'/g, '')}` : '';
   req.body.Shipping_Date_T = req.body.Shipping_Date_T ? `${req.body.Shipping_Date_T.trim().substring(0,10).replace(/'/g, '')}` : '';   
   req.body.UserID = req.body.UserID ? `${req.body.UserID.trim().substring(0,255).replace(/'/g, '')}` : '';

   var strSQL = format(` SELECT top 1000 row_number() Over(Order By o.Shipping_Date desc) as RecNo
   , o.[Order_PKOID]
   , o.[PKO_No]
   , f.[Ref_No]
   , f.Order_Detail_RefID
   , od.[Order_No]
   , od.[Product_No]
   , od.[Produce_No]
   , convert(varchar(10) ,o.[Shipping_Date] ,111) as [Shipping_Date]
   , o.[Destination]
   , o.[Qty]
   , o.[Delivered_Qty]
   , o.[UserID]
   , o.[Data_Updater]
   , convert(varchar(20) ,[Data_Update] ,120) as [Data_Update]
   FROM [dbo].[Order_PKO] o With(Nolock,NoWait)
   Inner Join [dbo].[Order_Detail_Ref] f With(Nolock,NoWait) on o.Order_Detail_RefID = f.Order_Detail_RefID
   Inner Join Order_Detail od with(NoLock,NoWait) on od.Order_Detail_RefID = f.Order_Detail_RefID
   where ({Order_PKOID} = 0 or o.Order_PKOID = {Order_PKOID})
   And (N'{PKO_No}' = '' or o.[PKO_No] like N'%{PKO_No}%')
   And (N'{Order_No}' = '' or od.[Order_No] like N'%{Order_No}%')
   And (N'{Product_No}' = '' or od.[Product_No] like N'%{Product_No}%')
   And (N'{Produce_No}' = '' or od.[Produce_No] like N'%{Produce_No}%')
   And (N'{Ref_No}' = '' or f.[Ref_No] like N'%{Ref_No}%')
   And (( '{Shipping_Date_F}' = '' or '{Shipping_Date_T}' = '' )  or (o.[Shipping_Date] between '{Shipping_Date_F}' And '{Shipping_Date_T}'))
   And (N'{Destination}' = '' or o.[Destination] like N'%{Destination}%')   
   And (N'{UserID}' = '' or o.[UserID] like N'{UserID}%')
   Group by o.[Order_PKOID], o.[PKO_No], f.[Ref_No], f.Order_Detail_RefID, od.[Order_No], od.[Product_No], od.[Produce_No], [Data_Update]
   , o.[Shipping_Date], o.[Destination], o.[Qty], o.[Delivered_Qty], o.[UserID], o.[Data_Updater]
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

//Get InnerBox Info
router.post('/InnerBox_Info',function (req, res, next) {
   console.log("Call InnerBox_Info Api :", req.body);

   req.body.Order_PKOID = req.body.Order_PKOID ? req.body.Order_PKOID : null;
   req.body.Order_PKO_DetailID = req.body.Order_PKO_DetailID ? req.body.Order_PKO_DetailID : null;   
      
   var strSQL = format(`
   SELECT distinct {Order_PKO_DetailID} as Order_PKO_DetailID
   , mc.Material_ColorID
   , pd.Material_Specific
   , pd.Material_Color
   , case when pd.Size_From = 0 or pd.Size_End = 0 then 'ALL' Else
   (Select Rtrim(Size_Name) From Product_Size t where t.SizeID = pd.Size_From) + '~' 
   + (Select Rtrim(Size_Name) From Product_Size t where t.SizeID = pd.Size_End) End as Size_Range
   , mc.Width
   , mc.Length
   , mc.Height
   FROM dbo.Order_PKO ok with(NoLock,NoWait)
   INNER JOIN dbo.Order_Detail od with(NoLock,NoWait) On ok.Order_Detail_RefID = od.Order_Detail_RefID
   INNER JOIN dbo.Produce p with(NoLock,NoWait) ON od.Produce_No = p.Produce_No 
   INNER JOIN dbo.Produce_Detail pd with(NoLock,NoWait) ON p.Produce_No = pd.Produce_No 
   INNER JOIN dbo.Material_Color mc with(NoLock,NoWait) ON pd.Material_ColorID = mc.Material_ColorID
   Where pd.Material_Category LIKE N'BOX%'
   And ok.Order_PKOID = {Order_PKOID}
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

//Maintain InnerBox_Maintain
router.post('/InnerBox_Maintain',  function (req, res, next) {
   console.log("Call InnerBox_Maintain Api:",req.body);

   // req.body.Mode === 0 表示修改 Material 內盒長寬高
   // req.body.Mode === 1 表示修改 PKO 內盒長寬高
   
   req.body.Order_PKOID = req.body.Order_PKOID ? req.body.Order_PKOID : null; 
   req.body.Material_ColorID = req.body.Material_ColorID ? req.body.Material_ColorID : null;
   
   var strSQL = format(`Declare @ROWCOUNT int, @Mode int = {Mode}`, req.body);
   switch(req.body.Mode){
      case 0:
         req.body.Value = req.body.Value ? req.body.Value : null;
         strSQL += format(`
            Update [dbo].[Material_Color] Set [{Name}] = {Value}
            where Material_ColorID = {Material_ColorID};

            Set @ROWCOUNT = @@ROWCOUNT;
         `, req.body);
      break;
      case 1:
         req.body.Order_PKO_DetailID = req.body.Order_PKO_DetailID ? req.body.Order_PKO_DetailID : null;
         
         strSQL += format(`
         Declare @IL float, @IW float, @IH float, @CC_Thickness float, @SP_Thickness float, @CC_Hemming float, @CCL float, @CCW float
         , @CL_Space float, @CW_Space float, @CH_Space float
         , @CL_IBEdge nchar(2), @CL_Items int, @CW_IBEdge nchar(2), @CW_Items int, @CH_IBEdge nchar(2), @CH_Items int, @CL float, @CW float, @CH float
         , @CW_Separator_Items int, @CH_Separator_Items int, @CL_Separator_Items int

         Select @IL = Length, @IW = Width, @IH = Height
         From Material_Color mc with(NoLock,NoWait)
         Where Material_ColorID = {Material_ColorID}

         Update [dbo].[Order_PKO_Detail] Set IL = @IL, IW = @IW, IH = @IH
         where Order_PKO_DetailID = {Order_PKO_DetailID};

         Set @ROWCOUNT = @@ROWCOUNT;
         if(@ROWCOUNT > 0)
         Begin

            Select @IL = isnull(IL,0)
            , @IW = isnull(IW,0) 
            , @IH = isnull(IH,0)
            , @CL_Space = isnull(CL_Space, 0)
            , @CW_Space = isnull(CW_Space, 0)
            , @CH_Space = isnull(CH_Space, 0)
            , @CL_IBEdge = isnull(CL_IBEdge, '')
            , @CL_Items = isnull(CL_Items, 0)
            , @CW_IBEdge = isnull(CW_IBEdge, '')
            , @CW_Items = isnull(CW_Items, 0)
            , @CH_IBEdge = isnull(CH_IBEdge, '')
            , @CH_Items = isnull(CH_Items, 0)
            , @CC_Thickness = isnull(CC_Thickness,0)
            , @SP_Thickness = isnull(SP_Thickness,0)
            , @CC_Hemming = isnull(CC_Hemming,0)
            , @CW_Separator_Items = isnull(CW_Separator_Items,0)
            , @CH_Separator_Items = isnull(CH_Separator_Items,0)
            , @CL_Separator_Items = isnull(CL_Separator_Items,0)
            From [dbo].[Order_PKO_Detail] With(NoLock, NoWait)
            Where Order_PKO_DetailID = {Order_PKO_DetailID}; 

            Set @CL = (@CL_Items * (case @CL_IBEdge when 'IL' then @IL when 'IW' then @IW when 'IH' then @IH else 0 End)) + @CL_Space + (@CC_Thickness * 2) + (@CL_Separator_Items * @SP_Thickness)
            Set @CW = (@CW_Items * (case @CW_IBEdge when 'IL' then @IL when 'IW' then @IW when 'IH' then @IH else 0 End)) + @CW_Space + (@CC_Thickness * 2) + (@CW_Separator_Items * @SP_Thickness)
            Set @CH = (@CH_Items * (case @CH_IBEdge when 'IL' then @IL when 'IW' then @IW when 'IH' then @IH else 0 End)) + @CH_Space + (@CC_Thickness * 4) + (@CH_Separator_Items * @SP_Thickness)

            Set @CL = Round(@CL, 1)
            Set @CW = Round(@CW, 1)
            Set @CH = Round(@CH, 1)

            Declare @decimal int, @tmpValue float
                           
            Set @decimal = @CL;
            Set @tmpValue = Round((@CL - @decimal),1);
            Set @CL = @decimal + case when @tmpValue between 0.6 and 0.9 then 1 when @tmpValue between 0.1 and 0.5 then 0.5 when @tmpValue = 0 then 0 End;
            
            Set @decimal = @CW;
            Set @tmpValue = Round((@CW - @decimal),1);
            Set @CW = @decimal + case when @tmpValue between 0.6 and 0.9 then 1 when @tmpValue between 0.1 and 0.5 then 0.5 when @tmpValue = 0 then 0 End;
         
            Set @decimal = @CH;
            Set @tmpValue = Round((@CH - @decimal),1);
            Set @CH = @decimal + case when @tmpValue between 0.6 and 0.9 then 1 when @tmpValue between 0.1 and 0.5 then 0.5 when @tmpValue = 0 then 0 End;

            Set @CCL = ((@CL + @CW) * 2) + (@CC_Thickness * 4 * 2) + @CC_Hemming
            Set @CCW = (@CH + @CW) + (@CC_Thickness * 2 * 2)

            Update [dbo].[Order_PKO_Detail] Set CL = @CL
            , CW = @CW
            , CH = @CH
            , CCL = Round(@CCL, 1)
            , CCW = Round(@CCW, 1)
            where Order_PKO_DetailID = {Order_PKO_DetailID}; 
         End
         `, req.body);
      break;

   }

   strSQL += format(`
   Select @ROWCOUNT as Flag;

   if(@mode = 1 and @ROWCOUNT > 0)
   Begin
      Update [dbo].[Order_PKO] Set UserID = isnull(UserID, N'${req.UserID}')
      , Data_Updater = N'${req.UserID}'
      , Data_Update = GetDate()
      where Order_PKOID = {Order_PKOID};
   End
   `, req.body);
   //console.log(strSQL)
   db.sql(req.body.Mode == 0 ? req.Enterprise : req.SiteDB, strSQL)
      .then((result) => {
         //console.log(result.recordsets[0])
         res.send({Flag:result.recordsets[0][0].Flag > 0, Order_PKOID: result.recordsets[0][0].Order_PKOID});
      }).catch((err) => {
         console.log(err);
         res.status(500).send(err);
      })

});

//Get Order_PKO_List
router.post('/Order_PKO_List',  function (req, res, next) {
   console.log("Call Order_PKO_List Api:", req.body);
   
   req.body.Order_Detail_RefID = req.body.Order_Detail_RefID ? req.body.Order_Detail_RefID : null;   

   var strSQL = format(`
   SELECT Top 1000 row_number() Over(Order By o.PKO_No desc) as RecNo
   ,o.[Order_PKOID]
   ,o.[PKO_No]
   ,f.[Ref_No]
   ,convert(varchar(10) ,o.[Shipping_Date] ,111) as [Shipping_Date]
   ,o.[Destination]
   ,o.[Qty]
   ,o.[Delivered_Qty]   
   ,o.[UserID]
   ,o.[Data_Updater]
   ,convert(varchar(10) ,o.[Data_Update] ,111) as [Data_Update]
   FROM [dbo].[Order_PKO] o With(Nolock,NoWait)
   Inner Join [dbo].[Order_Detail_Ref] f with(NoLock,NoWait) on o.Order_Detail_RefID = f.Order_Detail_RefID   
   where o.Order_Detail_RefID = {Order_Detail_RefID}
   Order By PKO_No
   `, req.body) ;
   //console.log(strSQL)
   db.sql(req.SiteDB, strSQL)
      .then((result) => {
         var DataSet = {Order_PKO_Info: result.recordset
            ,Order_PKO_Total:0
         }            
         result.recordset.forEach((item)=>(DataSet.Order_PKO_Total += item.Qty))
         //console.log(DataSet)
         res.send(DataSet);
      }).catch((err) => {
         console.log(err);
         res.status(500).send(err);
      })
});

//Get PKO Info
router.post('/PKO_Info',function (req, res, next) {
   console.log("Call PKO_Info Api :", req.body);

   req.body.Mode = req.body.Mode ? req.body.Mode : 0;
   req.body.Order_PKOID = req.body.Order_PKOID ? req.body.Order_PKOID : null;
   req.body.Produce_No = req.body.Produce_No ? req.body.Produce_No : null;
      
   var strSQL = format(`Declare @Mode int = {Mode}, @Order_PKOID int = {Order_PKOID}, @Produce_No Nvarchar(20) = '{Produce_No}';
Declare @PKO_No varchar(20), @Main_Mark nvarchar(max), @Side_Mark nvarchar(max), @Memo nvarchar(max)
, @Order_Detail_RefID int
, @Ref_No varchar(20), @Order_No varchar(18), @Style_No varchar(20), @Shoe_Name Nvarchar(50), @Color varchar(70), @Product_No varchar(25), @Shipping_Date varchar(10)
, @Destination nvarchar(30), @Detail_Remark_Title nvarchar(20), @Data_Update varchar(20), @Data_Updater Nvarchar(255);
Declare @Order_Qty Table(Size real, Qty float);
Declare @Order_PKO_Qty Table(Order_PKO_QtyID int, Size real, Qty float);

Declare @Order_PKO_Detail Table(Order_PKO_DetailID int, Cartons int, Delivered_Cartons int, Unit_Qty smallint, Total_Qty int
   , Carton_No nvarchar(10), Carton_Code nvarchar(13)
   , IL float, IW float, IH float, CL_Space float, CW_Space float, CH_Space float, CC_Thickness float, SP_Thickness float, CC_Hemming float, CCL float, CCW float
   , CL_IBEdge nchar(2), CL_Items int, CW_IBEdge nchar(2), CW_Items int, CH_IBEdge nchar(2), CH_Items int
   , ICL float, ICW float, ICH float
   , CL float, CW float, CH float
   , CW_Separator_Items int, CH_Separator_Items int, CL_Separator_Items int
   , Carton_NW float, Carton_NW_TTL float, PK_MATL_WT float, Carton_GW float, Carton_GW_TTL float, Meas float
   , Detail_Remark Nvarchar(50)
   , Delete_Flag int, Stacking_Methods_CheckSum int)

if(@Mode = 0)
Begin
   Select @PKO_No = op.PKO_No
   , @Main_Mark = isnull(op.Main_Mark,'')
   , @Side_Mark = isnull(op.Side_Mark,'')
   , @Memo = isnull(op.Memo,'')
   , @Order_Detail_RefID = op.Order_Detail_RefID
   , @Ref_No = odf.Ref_No
   , @Order_No = od.Order_No
   , @Product_No = od.Product_No
   , @Produce_No = od.Produce_No
   , @Shipping_Date = case when op.Shipping_Date is not null then convert(varchar(10),op.Shipping_Date,111) else null end
   , @Destination = op.Destination
   , @Detail_Remark_Title = isnull(op.Detail_Remark_Title,'Remark')
   , @Data_Update = case when op.Data_Update is not null then convert(varchar(20),op.Data_Update,120) else null end
   , @Data_Updater = isnull(op.Data_Updater,'')
   From Order_PKO op with(NoLock, NoWait)
   Inner Join Order_Detail_Ref odf with(NoLock,NoWait) on op.Order_Detail_RefID = odf.Order_Detail_RefID
   Inner Join Order_Detail od with(NoLock,NoWait) on od.Order_Detail_RefID = odf.Order_Detail_RefID
   Where op.Order_PKOID = @Order_PKOID;
End
Else
Begin
   Select @Order_PKOID = op.Order_PKOID
   , @PKO_No = op.PKO_No
   , @Main_Mark = isnull(op.Main_Mark,'')
   , @Side_Mark = isnull(op.Side_Mark,'')
   , @Memo = isnull(op.Memo,'')
   , @Order_Detail_RefID = op.Order_Detail_RefID
   , @Ref_No = odf.Ref_No
   , @Order_No = op.Order_No
   , @Product_No = op.Product_No
   , @Shipping_Date = case when op.Shipping_Date is not null then convert(varchar(10),op.Shipping_Date,111) else null end
   , @Destination = op.Destination
   , @Detail_Remark_Title = isnull(op.Detail_Remark_Title,'Remark')
   , @Data_Update = case when op.Data_Update is not null then convert(varchar(20), op.Data_Update,120) else null end
   , @Data_Updater = isnull(op.Data_Updater,'')
   From Order_PKO op with(NoLock,NoWait)
   Inner Join Order_Detail od with(NoLock,NoWait) on op.Order_Detail_RefID = od.Order_Detail_RefID
   Inner Join Order_Detail_Ref odf with(NoLock,NoWait) on op.Order_Detail_RefID = odf.Order_Detail_RefID
   Where od.Produce_No = @Produce_No
   Order by Order_PKOID
End

--Set @Style_No = (Select Style_No From Product p with(NoLock,NoWait) Where p.Product_No = @Product_No)
Select @Style_No = Style_No, @Shoe_Name = Name, @Color = Color From Product p with(NoLock,NoWait) Where p.Product_No = @Product_No

Insert @Order_Qty(Size, Qty)
Select Size, sum(oq.Qty) as Qty
FROM Order_Detail od with(NoLock,NoWait)
Inner Join Order_Qty oq with(NoLock,NoWait) on od.Order_DetailID = oq.Order_DetailID
Where od.Order_Detail_RefID = @Order_Detail_RefID
Group by Size;

Insert @Order_PKO_Qty
Select opq.Order_PKO_QtyID, opq.Size, opq.Qty
From Order_PKO_Qty opq with(NoLock,NoWait) 
Where opq.Order_PKOID = @Order_PKOID

--0 Ref_No_Title && Packing_No_Title
Select isnull(o.Ref_No_Title,'') as Ref_No_Title
, isnull(o.Packing_No_Title,'') as Packing_No_Title 
, Brand
, @Style_No as Style_No
, @Detail_Remark_Title as Detail_Remark_Title
, @Data_Updater as Data_Updater
, @Data_Update as Data_Update
From Orders o	Where o.Order_No = @Order_No;

--1 Order Size
SELECT distinct oq.Size
, Rtrim(ps.Size_Name) as Size_Name
, 0 as Qty
, isnull(m.Net_Weight,0) as Net_Weight
, case when m.Shoe_Size is not null then 1 else 0 end as Net_Weight_Flag
, pko.Qty as PKO_Qty
, (Select top 1 Order_PKO_QtyID From @Order_PKO_Qty t Where t.Size = oq.Size) as Order_PKO_QtyID
, 0 as Balance_Qty
, isnull(oq.Qty,0) as Order_Qty
, isnull(COMMESSA.Qty,0) as COMMESSA_Qty
, isnull(oq.Qty,0) - isnull(COMMESSA.Qty,0) as COMMESSA_Remaining
FROM @Order_Qty oq 
Inner Join Product_Size ps with(NoLock,NoWait) on oq.Size = ps.SizeID
Left Outer Join Product_Size_Match m with(NoLock,NoWait) on m.Style_No = @Style_No And m.Shoe_Size = oq.Size
Left Outer Join (
   Select distinct Size, Qty
   From @Order_PKO_Qty 
) as pko on pko.Size = oq.Size
Left Outer Join (
   Select pq.Size, Sum(pd.Cartons * pq.Qty) as Qty
   From Order_PKO op with(NoLock,NoWait) 
   Inner Join Order_PKO_Detail pd with(NoLock,NoWait) on op.Order_PKOID = pd.Order_PKOID
   Inner Join Order_PKO_Detail_Qty pq with(NoLock,NoWait) on pq.Order_PKO_DetailID = pd.Order_PKO_DetailID
   Where op.Order_Detail_RefID = @Order_Detail_RefID
   Group by pq.Size
) as COMMESSA on COMMESSA.Size = oq.Size;

--2 PKO Info
Select @Order_PKOID as Order_PKOID
, @PKO_No as PKO_No
, @Main_Mark as Main_Mark
, @Side_Mark as Side_Mark
, @Memo as Memo
, @Order_Detail_RefID as Order_Detail_RefID
, @Ref_No as Ref_No
, @Order_No as Order_No
, @Product_No as Product_No
, @Produce_No as Produce_No
, @Shoe_Name as Shoe_Name
, @Color as Color
, @Shipping_Date as Shipping_Date
, @Destination as Destination
, convert(bit,(Select case when rtrim(isnull(o.Order_No,'')) = '' then 0 else 1 end From Orders o with(NoLock,NoWait) Where o.Order_No = @Order_No)) as Check_Order_No_Flag
, convert(bit,(Select case when rtrim(isnull(@Style_No,'')) = '' then 0 else 1 end)) as Check_Product_No_Flag

--3 PKO Detail
Insert @Order_PKO_Detail
SELECT pd.Order_PKO_DetailID, pd.Cartons,  pd.Delivered_Cartons, pd.Unit_Qty, isnull(pd.Cartons,0) * isnull(pd.Unit_Qty,0) as Total_Qty
, pd.Carton_No, pd.Carton_Code
, pd.IL, pd.IW, pd.IH, CL_Space, CW_Space, CH_Space
, pd.CC_Thickness, pd.SP_Thickness, pd.CC_Hemming, pd.CCL, pd.CCW
, pd.CL_IBEdge, pd.CL_Items, pd.CW_IBEdge, pd.CW_Items, pd.CH_IBEdge, pd.CH_Items
, (CL_Items * (case CL_IBEdge when 'IL' then IL when 'IW' then IW when 'IH' then IH else 0 End)) + CL_Space as ICL
, (CW_Items * (case CW_IBEdge when 'IL' then IL when 'IW' then IW when 'IH' then IH else 0 End)) + CW_Space as ICW
, (CH_Items * (case CH_IBEdge when 'IL' then IL when 'IW' then IW when 'IH' then IH else 0 End)) + CH_Space as ICH
, pd.CL, pd.CW, pd.CH
, pd.CW_Separator_Items, pd.CH_Separator_Items, pd.CL_Separator_Items
, 0 as Carton_NW, 0 as Carton_NW_TTL, isnull(pd.PK_MATL_WT,0) as PK_MATL_WT, 0 as Carton_GW, 0 as Carton_GW_TTL
, Round(((pd.CL * pd.CW * pd.CH ) / 1000000),3) * isnull(pd.Cartons,0) as Meas
, isnull(pd.Detail_Remark,'') as Detail_Remark
, (case when pod.Order_PKO_DetailID is null then 1 else 0 end) as Delete_Flag
, (case when isnull(pd.Unit_Qty,0) <= isnull(pd.CL_Items,0) * isnull(pd.CW_Items,0) * isnull(pd.CH_Items,0) then 1 else 0 end) as Stacking_Methods_CheckSum
FROM Order_PKO_Detail pd With(NoLock,NoWait) 
Left Outer Join Product_In_Detail pod With(NoLock,NoWait) on pod.Order_PKO_DetailID = pd.Order_PKO_DetailID
Where pd.Order_PKOID = @Order_PKOID
Order By Order_PKO_DetailID;

Select * from @Order_PKO_Detail;

--4 Packing Size
SELECT q.Order_PKO_Detail_QtyID, pd.Order_PKO_DetailID, q.Size, q.Qty, isnull(q.Qty , 0) * isnull(pd.Cartons,0) as Real_Qty
FROM @Order_PKO_Detail pd 
Inner Join Order_PKO_Detail_Qty q With(NoLock,NoWait) on pd.Order_PKO_DetailID = q.Order_PKO_DetailID;

--5 CARDBOARD INFO - Carton
Select distinct Sum(Cartons) as Cartons, CCL, CCW, CL, CW, CH
From @Order_PKO_Detail
Group by CCL, CCW, CL, CW, CH
Order By CCL, CCW, CL, CW, CH, Cartons

--6 CARDBOARD INFO - Separator
Select ICH as W
, ICL as L
, Sum(CL_Separator_Items * Cartons) as PCS
From @Order_PKO_Detail
Group by ICH, ICL
Having (sum(CL_Separator_Items) > 0)
union
Select ICW as W
, ICL as L
, Sum(CH_Separator_Items * Cartons) as PCS
From @Order_PKO_Detail
Group by ICL, ICW
Having (sum(CH_Separator_Items) > 0)
union
Select ICH as W
, ICW as L
, Sum(CW_Separator_Items * Cartons) as PCS
From @Order_PKO_Detail
Group by ICH, ICW
Having (sum(CW_Separator_Items) > 0)

--7 CARDBOARD INFO - InnerBox
Select sum(Total_Qty) as Qty, IL, IW, IH
From @Order_PKO_Detail
Where isnull(IL,0) > 0 
And isnull(IW,0) > 0 
And isnull(IH,0) > 0
Group by IL, IW, IH
    `, req.body );
   //console.log(strSQL);

   db.sql(req.SiteDB, strSQL)
      .then((result) => { 
         var Order_Size = result.recordsets[1];
         var PKO_Info = result.recordsets[2];
         var PKO_Detail = result.recordsets[3];
         var Carton_Group = result.recordsets[5]
         var Separator_Group = result.recordsets[6]
         var InnerBox_Group =  result.recordsets[7]
         var G_Total_CB_Cartons = 0;
         var G_Total_CB_Separator = 0;
         var G_Total_CB_InnerBox = 0;
         var G_Carton_NW_TTL = 0;
         var G_Carton_GW_TTL = 0;
         var G_Total_Qty = 0;
         var G_Total_Cartons = 0;
         var G_Total_Meas = 0;
        
         PKO_Detail.forEach((item,idx)=>{
            item.Packing_Size = cloneDeep(Order_Size);

            var Packing_Size = result.recordsets[4].filter((data)=>(data.Order_PKO_DetailID == item.Order_PKO_DetailID));
            item.Packing_Size.forEach((dataset)=>{
               dataset.Order_PKO_Detail_QtyID = null
               Packing_Size.forEach((data)=>{
                  if(dataset.Size == data.Size){
                     dataset.Qty = data.Qty
                     dataset.Order_PKO_Detail_QtyID = data.Order_PKO_Detail_QtyID;
                     item.Carton_NW += dataset.Net_Weight * data.Qty;
                  }
               })
            })
            item.Carton_NW = Math.round((item.Carton_NW)*10000)/10000;
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

         Order_Size.forEach((item)=>{
            var Packing_Size = result.recordsets[4].filter((data)=>(data.Size == item.Size));
            Packing_Size.forEach((data)=>{
               item.Qty += data.Real_Qty
            })
            item.Balance_Qty = item.PKO_Qty - item.Qty
         })
        
         Carton_Group.forEach((item)=>{
            G_Total_CB_Cartons += item.Cartons
         })

         Separator_Group.forEach((item)=>{
            item.W = Math.round(item.W * 10000)/10000
            item.L = Math.round(item.L * 10000)/10000
            G_Total_CB_Separator += item.PCS
         })

         InnerBox_Group.forEach((item)=>{
            G_Total_CB_InnerBox += item.Qty
         })
         

         var DataSet = {Ref_No_Title: result.recordsets[0][0] ? result.recordsets[0][0].Ref_No_Title:'',
            Packing_No_Title: result.recordsets[0][0] ? result.recordsets[0][0].Packing_No_Title:'',
            Brand: result.recordsets[0][0] ? result.recordsets[0][0].Brand:'',
            Style_No: result.recordsets[0][0] ? result.recordsets[0][0].Style_No:'',
            Detail_Remark_Title: result.recordsets[0][0] ? result.recordsets[0][0].Detail_Remark_Title:'Remark',  
            Data_Updater: result.recordsets[0][0] ? result.recordsets[0][0].Data_Updater:'',
            Data_Update: result.recordsets[0][0] ? result.recordsets[0][0].Data_Update:'',
            Main_Mark: result.recordsets[0][0] ? result.recordsets[2][0].Main_Mark:'', 
            Side_Mark: result.recordsets[0][0] ? result.recordsets[2][0].Side_Mark:'', 
            Memo: result.recordsets[0][0] ? result.recordsets[2][0].Memo:'',
            Check_Order_No_Flag: result.recordsets[2][0] ? result.recordsets[2][0].Check_Order_No_Flag:'',
            Check_Product_No_Flag: result.recordsets[2][0] ? result.recordsets[2][0].Check_Product_No_Flag:'',
            G_Carton_NW_TTL: Math.round(G_Carton_NW_TTL*10000)/10000,
            G_Carton_GW_TTL: Math.round(G_Carton_GW_TTL*10000)/10000,
            G_Total_Qty: G_Total_Qty,
            G_Total_Cartons: G_Total_Cartons,
            G_Total_Meas: Math.round(G_Total_Meas*1000)/1000,
            Order_Size: Order_Size,
            PKO_Info: PKO_Info,
            PKO_Detail: PKO_Detail,
            Carton_Group: Carton_Group,
            Separator_Group: Separator_Group,
            InnerBox_Group: InnerBox_Group,
            G_Total_CB_Cartons: G_Total_CB_Cartons,
            G_Total_CB_Separator: G_Total_CB_Separator,
            G_Total_CB_InnerBox: G_Total_CB_InnerBox,
         };
         
         res.send(DataSet);
      }).catch((err) => {
         console.log(err);
         res.status(500).send(err);
      })

});

//Maintain PKO
router.post('/PKO_Maintain',  function (req, res, next) {
   console.log("Call PKO_Maintain Api:", req.body);

   // req.body.Mode === 0 表示新增
   // req.body.Mode === 1 表示修改
   // req.body.Mode === 2 表示刪除PKO
   
   req.body.Order_PKOID = req.body.Order_PKOID ? req.body.Order_PKOID : null; 

   var strSQL = format(`Declare @ROWCOUNT int, @Order_PKOID int = {Order_PKOID}, @Mode int = {Mode}`, req.body);
   switch(req.body.Mode){
      case 0:
         req.body.PKO_No = req.body.PKO_No ? `N'${req.body.PKO_No.trim().substring(0,20).replace(/'/g, "''")}'` : `''`;        
         req.body.Order_No = req.body.Order_No ? `N'${req.body.Order_No.trim().substring(0,18).replace(/'/g, "''")}'` : `''`; 
         req.body.Product_No = req.body.Product_No ? `N'${req.body.Product_No.trim().substring(0,25).replace(/'/g, "''")}'` : `''`;
         req.body.Ref_No = req.body.Ref_No ? `N'${req.body.Ref_No.trim().substring(0,20).replace(/'/g, "''")}'` : `''`;
         req.body.Order_Detail_RefID = req.body.Order_Detail_RefID ? req.body.Order_Detail_RefID : null;
         req.body.Destination = req.body.Destination ? `N'${req.body.Destination.trim().substring(0,30).replace(/'/g, "''")}'` : `''`;
         req.body.Shipping_Date = req.body.Shipping_Date ? `${req.body.Shipping_Date.trim().substring(0,10).replace(/'/g, '')}` : ``;
      
         strSQL += format(`Declare @Orig_Shipping_Date Nvarchar(20), @Destination Nvarchar(30)

            Select top 1 @Orig_Shipping_Date = case when '{Shipping_Date}' = '' 
               then (od.Orig_Shipping_Date) 
               else '{Shipping_Date}' end ,
               @Destination = case when {Destination} = '' 
               then (od.Destination) 
               else {Destination} end 
            From Order_Detail od with(NoLock,NoWait) 
            Where od.Order_Detail_RefID = {Order_Detail_RefID}

            Insert into [dbo].[Order_PKO] (PKO_No, Order_Detail_RefID, Shipping_Date, Destination)
            Select {PKO_No} as PKO_No
            , {Order_Detail_RefID} as Order_Detail_RefID
            , @Orig_Shipping_Date as Shipping_Date
            , @Destination as Destination
            Set @Order_PKOID = scope_identity();

            Set @ROWCOUNT = @@ROWCOUNT;
         `, req.body);
      break;
      case 1:
         var Size = 0;
         switch(req.body.Name){
            case 'PKO_No':
            case 'Detail_Remark_Title':
               Size = 20;
            break;
            case 'Shipping_Date':
               Size = 10;
            break;
            case 'Destination':
               Size = 30;
            break;
            case 'Main_Mark':
            case 'Side_Mark':
            case 'Memo':
               Size = 65535;
            break;
         }
         req.body.Value = Size > 0 ? (req.body.Value ? `N'${req.body.Value.trim().replace(/'/g, "''")}'` : `''`) : (req.body.Value ? req.body.Value : null);
         strSQL += format(`
            Update [dbo].[Order_PKO] Set [{Name}] = ${Size == 0 ? '{Value}': `substring({Value},1,${Size})`}
            where Order_PKOID = {Order_PKOID};

            Set @ROWCOUNT = @@ROWCOUNT;
         `, req.body);
      break;
      case 2:
         strSQL += format(`
            Delete FROM [dbo].[Order_PKO] 
            where Order_PKOID = {Order_PKOID} 
            --And (Select count(*) From PDSP_Detail pd with(NoLock,NoWait) Where pd.Order_PKOID = {Order_PKOID}) = 0;

            Set @ROWCOUNT = @@ROWCOUNT;
         `, req.body);
      break;
   }

   strSQL += format(`
   Select @ROWCOUNT as Flag, @Order_PKOID as Order_PKOID;

   if(@ROWCOUNT > 0)
   Begin
      Update [dbo].[Order_PKO] Set UserID = isnull(UserID, N'${req.UserID}')
      , Data_Updater = N'${req.UserID}'
      , Data_Update = GetDate()
      where Order_PKOID = @Order_PKOID;
   End
   `, req.body);
   //console.log(strSQL)
   db.sql(req.SiteDB, strSQL)
      .then((result) => {
         //console.log(result.recordsets[0])
         res.send({Flag:result.recordsets[0][0].Flag > 0, Order_PKOID: result.recordsets[0][0].Order_PKOID});
      }).catch((err) => {
         console.log(err);
         res.status(500).send(err);
      })

});

//Maintain PKO Detail
router.post('/PKO_Detail_Maintain',  function (req, res, next) {
   console.log("Call PKO_Detail_Maintain Api:",req.body);

   // req.body.Mode === 0 表示新增 PKO Detail
   // req.body.Mode === 1 表示修改 PKO Detail
   // req.body.Mode === 2 表示刪除 PKO Detail
   // req.body.Mode === 3 表示編輯 PKO Detail Qty
   // req.body.Mode === 4 表示編輯 PKO Size Shipment G.Total Qty
   req.body.Order_PKOID = req.body.Order_PKOID ? req.body.Order_PKOID : null; 
   req.body.Order_PKO_DetailID = req.body.Order_PKO_DetailID ? req.body.Order_PKO_DetailID : null; 
   req.body.Order_PKO_QtyID = req.body.Order_PKO_QtyID ? req.body.Order_PKO_QtyID : null; 
   req.body.Order_Detail_RefID = req.body.Order_Detail_RefID ? req.body.Order_Detail_RefID : null;
   
   
   var strSQL = format(`Declare @ROWCOUNT int, @Order_PKO_DetailID int = {Order_PKO_DetailID}, @Order_PKO_QtyID int = {Order_PKO_QtyID}, @Mode int = {Mode}`, req.body);
   switch(req.body.Mode){
      case 0:
         strSQL += format(`
            Declare @Product_PackingID int = {Product_PackingID}
            , @IL float, @IW float, @IH float, @CC_Thickness float, @SP_Thickness float, @CC_Hemming float, @CCL float, @CCW float
            , @CL float, @CW float, @CH float
            , @CL_Space float, @CW_Space float, @CH_Space float
            , @CL_Items int, @CL_IBEdge nchar(2), @CW_Items int, @CW_IBEdge nchar(2), @CH_Items int, @CH_IBEdge nchar(2)
            , @CW_Separator_Items int, @CH_Separator_Items int, @CL_Separator_Items int
            
            Select Top 1 @IL = IL, @IW = IW, @IH = IH, @CC_Thickness = CC_Thickness, @SP_Thickness = SP_Thickness, @CC_Hemming = CC_Hemming
            , @CCL = CCL, @CCW = CCW, @CL= CL, @CW = CW, @CH = CH
            , @CL_Space= CL_Space, @CW_Space = CW_Space, @CH_Space = CH_Space
            , @CL_Items = CL_Items, @CL_IBEdge = @CL_IBEdge
            , @CW_Items = CW_Items, @CW_IBEdge = @CW_IBEdge
            , @CH_Items = CH_Items, @CH_IBEdge = @CH_IBEdge
            , @CW_Separator_Items = CW_Separator_Items, @CH_Separator_Items = CH_Separator_Items, @CL_Separator_Items = CL_Separator_Items
            From [dbo].[Order_PKO_Detail] with(NoLock, NoWait)
            Where Order_PKOID = {Order_PKOID}
            Order by Order_PKO_DetailID desc;

            Insert into [dbo].[Order_PKO_Detail] (Order_PKOID
            , Carton_Code
            , Cartons
            , IL, IW, IH, CC_Thickness, SP_Thickness, CC_Hemming
            , CCL, CCW, CL, CW, CH
            , CL_Space, CW_Space, CH_Space
            , CL_Items, CL_IBEdge
            , CW_Items, CW_IBEdge
            , CH_Items, CH_IBEdge
            , CW_Separator_Items, CH_Separator_Items, CL_Separator_Items)
            Select {Order_PKOID} as Order_PKOID
            , (Select Packing_Code From Product_Packing p with(NoLock,NoWait) Where p.Product_PackingID = @Product_PackingID) as Carton_Code
            , 1 as Cartons
            , isnull(@IL,0) as IL, isnull(@IW,0) as IW, isnull(@IH,0) as IH, isnull(@CC_Thickness,0.5) as CC_Thickness, isnull(@SP_Thickness,0.5) as SP_Thickness, isnull(@CC_Hemming,3) as CC_Hemming
            , isnull(@CCL,0) as CCL, isnull(@CCW,0) as CCW, isnull(@CL,0) as CL, isnull(@CW,0) as CW, isnull(@CH,0) as CH
            , isnull(@CL_Space,1) as CL_Space, isnull(@CW_Space,1) as CW_Space, isnull(@CH_Space,1) as CH_Space
            , isnull(@CL_Items,4) as CL_Items, isnull(@CL_IBEdge,'IW') as CL_IBEdge
            , isnull(@CW_Items,3) as CW_Items, isnull(@CW_IBEdge,'IH') as CW_IBEdge
            , isnull(@CH_Items,1) as CH_Items, isnull(@CH_IBEdge,'IL') as CH_IBEdge
            , isnull(@CW_Separator_Items,0) as CW_Separator_Items, isnull(@CH_Separator_Items,0) as CH_Separator_Items, isnull(@CL_Separator_Items,0) as CL_Separator_Items;

            Set @ROWCOUNT = @@ROWCOUNT;            
            Set @Order_PKO_DetailID = scope_identity();

            if(@Product_PackingID is not null And @ROWCOUNT > 0)
            Begin

               Declare @tmp_Product_Packing_Detail table(Size real, Qty float)
               
               Insert @tmp_Product_Packing_Detail
               Select Size, Qty
               From Product_Packing_Detail pd with(NoLock,NoWait)
               Where pd.Product_PackingID = @Product_PackingID

               Insert into [dbo].[Order_Qty] (Order_DetailID, Size, Qty, Prerange)
               Select od.Order_DetailID, t.Size, 0 as Qty, 0 as Prerange
               From @tmp_Product_Packing_Detail t
               Inner Join Order_Detail od with(NoLock, NoWait) on  od.Order_Detail_RefID = {Order_Detail_RefID}
               left outer Join (
                  Select od.Order_DetailID, os.Size, os.Qty as Qty
                  From Order_Detail od with(NoLock, NoWait)            
                  Inner Join Order_Qty os WITH (NoWait, Nolock) on os.Order_DetailID = od.Order_DetailID
                  Where od.Order_Detail_RefID = {Order_Detail_RefID}
               ) tmp on od.Order_DetailID = tmp.Order_DetailID and t.Size = tmp.Size
               Where tmp.Size is null
               Order by od.Order_DetailID, t.Size;

               Insert into [dbo].[Order_PKO_Detail_Qty] (Order_PKO_DetailID, Size, Qty)
               Select @Order_PKO_DetailID as Order_PKO_DetailID, pd.Size, pd.Qty
               From @tmp_Product_Packing_Detail pd 
           
            End            
         `, req.body);
      break;
      case 1:
         var Size = 0;
         switch(req.body.Name){
            case 'Carton_No':
               Size = 10;
            break;
            case 'Carton_Code':
               Size = 13;
            break;
            case 'Detail_Remark':
               Size = 50;
            break;
            case 'CL_IBEdge':
            case 'CW_IBEdge':
            case 'CH_IBEdge':
               Size = 2;
               strSQL += format(`
               Update [dbo].[Order_PKO_Detail] Set 
               CL_IBEdge = case when CL_IBEdge = '{Value}' then [{Name}] else CL_IBEdge end,
               CW_IBEdge = case when CW_IBEdge = '{Value}' then [{Name}] else CW_IBEdge end,
               CH_IBEdge = case when CH_IBEdge = '{Value}' then [{Name}] else CH_IBEdge end                
               where Order_PKO_DetailID = {Order_PKO_DetailID}; 
            `, req.body);
            break;
         }
         req.body.Value = Size > 0 ? `N'${req.body.Value.trim().replace(/'/g, "''")}'` : req.body.Value;

         strSQL += format(`
            Update [dbo].[Order_PKO_Detail] Set [{Name}] = ${Size == 0 ? '{Value}': `substring({Value},1,${Size})`}
            where Order_PKO_DetailID = {Order_PKO_DetailID};

            Set @ROWCOUNT = @@ROWCOUNT;
         `, req.body);

         switch(req.body.Name){
            case 'IL':
            case 'IW':
            case 'IH':
            case 'CL_Space':
            case 'CW_Space':
            case 'CH_Space':
            case 'CL_Items':
            case 'CW_Items':
            case 'CH_Items':
            case 'CL_IBEdge':
            case 'CW_IBEdge':
            case 'CH_IBEdge':
            case 'CC_Thickness':
            case 'SP_Thickness':
            case 'CC_Hemming':
            case 'CW_Separator_Items':
            case 'CH_Separator_Items':
            case 'CL_Separator_Items':

               strSQL += format(`Declare @IL float, @IW float, @IH float, @CC_Thickness float, @SP_Thickness float, @CC_Hemming float, @CCL float, @CCW float
               , @CL_Space float, @CW_Space float, @CH_Space float
               , @CL_IBEdge nchar(2), @CL_Items int, @CW_IBEdge nchar(2), @CW_Items int, @CH_IBEdge nchar(2), @CH_Items int, @CL float, @CW float, @CH float
               , @CW_Separator_Items int, @CH_Separator_Items int, @CL_Separator_Items int

               Select @IL = isnull(IL,0)
               , @IW = isnull(IW,0)
               , @IH = isnull(IH,0)
               , @CL_Space = isnull(CL_Space, 0)
               , @CW_Space = isnull(CW_Space, 0)
               , @CH_Space = isnull(CH_Space, 0)
               , @CL_IBEdge = isnull(CL_IBEdge, '')
               , @CW_IBEdge = isnull(CW_IBEdge, '')
               , @CH_IBEdge = isnull(CH_IBEdge, '')
               , @CL_Items = isnull(CL_Items, 0)
               , @CW_Items = isnull(CW_Items, 0)
               , @CH_Items = isnull(CH_Items, 0)
               , @CC_Thickness = isnull(CC_Thickness,0)
               , @SP_Thickness = isnull(SP_Thickness,0)
               , @CC_Hemming = isnull(CC_Hemming,0)
               , @CW_Separator_Items = isnull(CW_Separator_Items,0)
               , @CH_Separator_Items = isnull(CH_Separator_Items,0)
               , @CL_Separator_Items = isnull(CL_Separator_Items,0)
               From [dbo].[Order_PKO_Detail] With(NoLock, NoWait)
               Where Order_PKO_DetailID = {Order_PKO_DetailID}; 

               Set @CL = (@CL_Items * (case @CL_IBEdge when 'IL' then @IL when 'IW' then @IW when 'IH' then @IH else 0 End)) + @CL_Space + (@CC_Thickness * 2) + (@CL_Separator_Items * @SP_Thickness)
               Set @CW = (@CW_Items * (case @CW_IBEdge when 'IL' then @IL when 'IW' then @IW when 'IH' then @IH else 0 End)) + @CW_Space + (@CC_Thickness * 2) + (@CW_Separator_Items * @SP_Thickness)
               Set @CH = (@CH_Items * (case @CH_IBEdge when 'IL' then @IL when 'IW' then @IW when 'IH' then @IH else 0 End)) + @CH_Space + (@CC_Thickness * 4) + (@CH_Separator_Items * @SP_Thickness)

               Set @CL = Round(@CL, 1)
               Set @CW = Round(@CW, 1)
               Set @CH = Round(@CH, 1)

               Declare @decimal int, @tmpValue float
                              
               Set @decimal = @CL;
               Set @tmpValue = Round((@CL - @decimal),1);
               Set @CL = @decimal + case when @tmpValue between 0.6 and 0.9 then 1 when @tmpValue between 0.1 and 0.5 then 0.5 when @tmpValue = 0 then 0 End;
               
               Set @decimal = @CW;
               Set @tmpValue = Round((@CW - @decimal),1);
               Set @CW = @decimal + case when @tmpValue between 0.6 and 0.9 then 1 when @tmpValue between 0.1 and 0.5 then 0.5 when @tmpValue = 0 then 0 End;
              
               Set @decimal = @CH;
               Set @tmpValue = Round((@CH - @decimal),1);
               Set @CH = @decimal + case when @tmpValue between 0.6 and 0.9 then 1 when @tmpValue between 0.1 and 0.5 then 0.5 when @tmpValue = 0 then 0 End;

               Set @CCL = ((@CL + @CW) * 2) + (@CC_Thickness * 4 * 2) + @CC_Hemming
               Set @CCW = (@CH + @CW) + (@CC_Thickness * 2 * 2)

               Update [dbo].[Order_PKO_Detail] Set CL = @CL
               , CW = @CW
               , CH = @CH
               , CCL = Round(@CCL, 1)
               , CCW = Round(@CCW, 1)
               where Order_PKO_DetailID = {Order_PKO_DetailID}; 
               `, req.body);
            break;
            case 'CL':
            case 'CW':
            case 'CH':
               strSQL += format(`
               Update [dbo].[Order_PKO_Detail] Set CCL = ((isnull(CL,0) + isnull(CW,0)) * 2) + (isnull(CC_Thickness,0) * 4 * 2) + isnull(CC_Hemming,0)
               , CCW = (isnull(CL,0) + isnull(CW,0)) + (isnull(CC_Thickness,0) * 2 * 2)
               where Order_PKO_DetailID = {Order_PKO_DetailID}; 
               `, req.body);
            break;
         }
      break;
      case 2:
         strSQL += format(`
            Delete FROM [dbo].[Order_PKO_Detail] 
            where Order_PKO_DetailID = {Order_PKO_DetailID} 
            And (Select count(*) From Product_In_Detail pd with(NoLock,NoWait) Where pd.Order_PKO_DetailID = {Order_PKO_DetailID}) = 0;

            Set @ROWCOUNT = @@ROWCOUNT;
         `, req.body);
      break;
      case 3:
         strSQL += format(`
            Declare @Order_PKO_Detail_QtyID int = {Order_PKO_Detail_QtyID}         
            , @Size float = {Size}
            , @Qty float = {Value}
   
            Update [dbo].[Order_PKO_Detail_Qty] Set Qty = @Qty
            where Order_PKO_Detail_QtyID = @Order_PKO_Detail_QtyID
              And Size = @Size And @Qty <> 0;
            set @ROWCOUNT = @@ROWCOUNT;

            if(@ROWCOUNT = 0 And @Qty > 0)
            begin
               Insert [dbo].[Order_PKO_Detail_Qty] (Order_PKO_DetailID, Size, Qty)
               Select @Order_PKO_DetailID as Order_PKO_DetailID, @Size as Size, @Qty as Qty
               Where ( Select Count(*) From [dbo].[Order_PKO_Detail_Qty] oq with(NoLock,NoWait)
               Where oq.Order_PKO_DetailID = @Order_PKO_DetailID And oq.Size = @Size) = 0
              
               set @ROWCOUNT = @@ROWCOUNT;
               Set @Order_PKO_Detail_QtyID = scope_identity();
            end

            if(@Qty = 0)
            begin
               Delete From Order_PKO_Detail_Qty
               Where Size = @Size
                And Order_PKO_Detail_QtyID = @Order_PKO_Detail_QtyID;
               set @ROWCOUNT = @@ROWCOUNT;
            End 

         `,req.body);
      break;
      case 4:
         strSQL += format(`
            Declare @Size float = {Size}
            , @Qty float = {Value}
   
            Update [dbo].[Order_PKO_Qty] Set Qty = @Qty
            where Order_PKO_QtyID = @Order_PKO_QtyID
              And Size = @Size And @Qty <> 0;
            set @ROWCOUNT = @@ROWCOUNT;

            if(@ROWCOUNT = 0 And @Qty > 0)
            begin
               Insert [dbo].[Order_PKO_Qty] (Order_PKOID, Size, Qty)
               Select {Order_PKOID} as Order_PKOID, @Size as Size, @Qty as Qty
               Where ( Select Count(*) From [dbo].[Order_PKO_Qty] oq with(NoLock,NoWait)
               Where oq.Order_PKOID = {Order_PKOID} And oq.Size = @Size) = 0

               set @ROWCOUNT = @@ROWCOUNT;
               Set @Order_PKO_QtyID = scope_identity();
            end

            if(@Qty = 0)
            begin
               Delete From Order_PKO_Qty
               Where Size = @Size
                And Order_PKO_QtyID = @Order_PKO_QtyID;
               set @ROWCOUNT = @@ROWCOUNT;
            End 

         `,req.body);
      break;
   }

   strSQL += format(`
   Select @ROWCOUNT as Flag, @Order_PKO_DetailID as Order_PKO_DetailID, @Order_PKO_QtyID as Order_PKO_QtyID;

   if ((@Mode = 0 or @Mode = 3) and @ROWCOUNT > 0)
   begin
      Update Order_PKO_Detail set Unit_Qty = isnull((Select Sum(Qty) From Order_PKO_Detail_Qty q with(NoLock, NoWait) Where Order_PKO_DetailID = @Order_PKO_DetailID),0)
      Where Order_PKO_DetailID = @Order_PKO_DetailID
   End

   if(@ROWCOUNT > 0)
   Begin
      Update [dbo].[Order_PKO] Set UserID = isnull(UserID, N'${req.UserID}')
      , Data_Updater = N'${req.UserID}'
      , Data_Update = GetDate()
      ${req.body.Mode == 2 ?  ', Qty = (Select Sum(od.Cartons * od.Unit_Qty) From Order_PKO_Detail od with(Nolock,NoWait) Where Order_PKOID = {Order_PKOID} )' : '' }
      where Order_PKOID = {Order_PKOID};
   End
   `, req.body);
   //console.log(strSQL)
   db.sql(req.SiteDB, strSQL)
      .then((result) => {
         //console.log(result.recordsets[0])
         res.send({Flag:result.recordsets[0][0].Flag > 0, Order_PKOID: result.recordsets[0][0].Order_PKOID});
      }).catch((err) => {
         console.log(err);
         res.status(500).send(err);
      })

});

//Maintain PKO Carton data
router.post('/Carton_Maintain',  function (req, res, next) {
   console.log("Call Carton_Maintain Api:",req.body);

   // req.body.Mode === 0 表示編輯Article Size Weight   
   req.body.Style_No = req.body.Style_No ? `N'${req.body.Style_No.trim().replace(/'/g, "''")}'` : `''`; 
   
   var strSQL = format(`Declare @ROWCOUNT int, @Mode int = {Mode}`, req.body);
   switch(req.body.Mode){
      case 0:
         strSQL += format(`
            UpDate Product_Size_Match set [{Name}] = {Value}
            Where Style_No = {Style_No}
            And Shoe_Size = {Size};

            Set @ROWCOUNT = @@ROWCOUNT;
         `, req.body);
      break;
   }

   strSQL += format(`
   Select @ROWCOUNT as Flag;
   `, req.body);
   //console.log(strSQL)
   db.sql(req.Enterprise, strSQL)
      .then((result) => {
         //console.log(result.recordsets[0])
         res.send({Flag:result.recordsets[0][0].Flag > 0});
      }).catch((err) => {
         console.log(err);
         res.status(500).send(err);
      })

});

//Maintain PKO Size
router.post('/PKO_Size_Maintain',  function (req, res, next) {
   console.log("Call PKO_Size_Maintain Api:",req.body);   
   var strSQL = "";
   
   // req.body.Mode === 0 表示新增 
   // req.body.Mode === 1 表示修改 
   // req.body.Mode === 2 表示刪除 
   // req.body.Mode === 3 表示刪除全部
      
   req.body.Order_PKOID = req.body.Order_PKOID ? req.body.Order_PKOID : 0;
   req.body.Order_Detail_RefID = req.body.Order_Detail_RefID ? req.body.Order_Detail_RefID : 0;
  
   strSQL = format(`
   Declare @ROWCOUNT int; 
   `,req.body);

   switch(req.body.Mode){
      case 0:
         var strSQL1 = '';

         req.body.Size.forEach((item)=>{
            strSQL1 += format(`Insert into @tmpTable (Size) values ({0});`,item)
         })

         strSQL += format(`
            Declare @tmpTable table(RecNo int IDENTITY(1,1), Size real)

            ${strSQL1}

            Insert into [dbo].[Order_Qty] (Order_DetailID, Size, Qty, Prerange)
            Select od.Order_DetailID, t.Size, 0 as Qty, 0 as Prerange
            From @tmpTable t
            Inner Join Order_Detail od with(NoLock, NoWait) on  od.Order_Detail_RefID = {Order_Detail_RefID}
            left outer Join (
               Select od.Order_DetailID, os.Size, os.Qty as Qty
               From Order_Detail od with(NoLock, NoWait)            
               Inner Join Order_Qty os WITH (NoWait, Nolock) on os.Order_DetailID = od.Order_DetailID
               Where od.Order_Detail_RefID = {Order_Detail_RefID}
            ) tmp on od.Order_DetailID = tmp.Order_DetailID and t.Size = tmp.Size
            Where tmp.Size is null
            Order by od.Order_DetailID, t.Size;

            set @ROWCOUNT = @@ROWCOUNT;
            `,req.body);
      break;
      case 1:
      break;
      case 2:
         strSQL += format(`
         Delete from Order_Qty
         Where Order_QtyID in (
         Select Order_QtyID
         From Order_Detail od with(NoLock, NoWait)            
         Inner Join Order_Qty os WITH (NoWait, Nolock) on os.Order_DetailID = od.Order_DetailID And os.Size = {Size}
         Where od.Order_Detail_RefID = {Order_Detail_RefID}
         And isnull(os.Qty,0) = 0)

         set @ROWCOUNT = @@ROWCOUNT;
         `,req.body);
      break;
      case 3:
         strSQL += format(`
         Delete from Order_Qty
         Where Order_QtyID in (
         Select Order_QtyID
         From Order_Detail od with(NoLock, NoWait)            
         Inner Join Order_Qty os WITH (NoWait, Nolock) on os.Order_DetailID = od.Order_DetailID 
         Where od.Order_Detail_RefID = {Order_Detail_RefID}
         And isnull(os.Qty,0) = 0)

         set @ROWCOUNT = @@ROWCOUNT;
      `,req.body);
      break;
   }   
   
   strSQL += format(`
   Select @ROWCOUNT as Flag;
   if(@ROWCOUNT > 0 )
   Begin
      Update [dbo].[Order_PKO] Set UserID = isnull(UserID, N'${req.UserID}'), Data_Updater = N'${req.UserID}'
      , Data_Update = GetDate()
      where Order_PKOID = {Order_PKOID}
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

//Get Produce_PKO_Report
router.post('/Produce_PKO_Report',function (req, res, next) {
   console.log("Call Produce_PKO_Report Api :", req.body);

   req.body.Mode = req.body.Mode ? req.body.Mode : 0;
   req.body.Order_PKOID = req.body.Order_PKOID ? req.body.Order_PKOID : null;
   req.body.Produce_No = req.body.Produce_No ? req.body.Produce_No : null;
      
   var strSQL = format(`Declare @Mode int = {Mode}, @Order_PKOID int = {Order_PKOID}, @Produce_No Nvarchar(20) = '{Produce_No}';
   Declare @Order_Qty Table(Order_PKOID int, Style_No varchar(20), Size real);
   Declare @Product_Size_Match Table(Style_No varchar(20), Size real, Net_Weight float)
   Declare @Order_Size Table(Order_PKOID int, Size real, Net_Weight float)
   Declare @Size_Name Table(Size real, Size_Name varchar(10))

   Declare @Order_PKO Table(Order_PKOID int, PKO_No varchar(20), Main_Mark nvarchar(max), Side_Mark nvarchar(max), Memo nvarchar(max), Order_Detail_RefID int
   , Ref_No varchar(20), Order_No varchar(18), Style_No varchar(20), Shoe_Name Nvarchar(50), Color varchar(70), Product_No varchar(25), Shipping_Date varchar(10)
   , Destination nvarchar(30), Detail_Remark_Title nvarchar(20), Ref_No_Title nvarchar(30), Packing_No_Title nvarchar(30)
   , Data_Update varchar(20), Data_Updater Nvarchar(255)
   )
   
   Declare @Order_PKO_Detail Table(Order_PKOID int, Order_PKO_DetailID int, Cartons int, Delivered_Cartons int, Unit_Qty smallint, Total_Qty int
   , Carton_No nvarchar(10), Carton_Code nvarchar(13)
   , CL float, CW float, CH float
   , PK_MATL_WT float, Meas float
   , Detail_Remark Nvarchar(50) )
   
   Insert @Order_PKO
   Select distinct op.Order_PKOID as Order_PKOID
   , op.PKO_No
   , isnull(Main_Mark,'') as Main_Mark
   , isnull(Side_Mark,'') as Side_Mark
   , isnull(Memo,'') as Memo
   , op.Order_Detail_RefID
   , od.Ref_No
   , od.Order_No
   , '' as Style_No
   , '' as Shoe_Name
   , '' as Color
   , od.Product_No
   , case when op.Shipping_Date is not null then convert(varchar(10),op.Shipping_Date,111) else null end as Shipping_Date
   , op.Destination
   , isnull(op.Detail_Remark_Title,'Remark') as Detail_Remark_Title
   , '' as Ref_No_Title
   , '' as Packing_No_Title   
   , case when op.Data_Update is not null then convert(varchar(20), op.Data_Update,120) else null end as Data_Update
   , isnull(op.Data_Updater,'') as Data_Updater
   From Order_PKO op with(NoLock,NoWait)
   Inner Join (Select distinct o.Order_No, r.Ref_No, r.Order_Detail_RefID, o.Product_No From Order_Detail o with(NoLock,NoWait) Inner Join Order_Detail_Ref r with(NoLock,NoWait) on o.Order_Detail_RefID = r.Order_Detail_RefID Where o.Produce_No = @Produce_No ) od on op.Order_Detail_RefID = od.Order_Detail_RefID
   Order by Order_PKOID
   
   Update @Order_PKO set Style_No = p.Style_No, Shoe_Name = p.Name, Color = p.Color
   From @Order_PKO t
   Inner Join Product p with(NoLock,NoWait) on t.Product_No = p.Product_No
   
   Update @Order_PKO set Ref_No_Title = isnull(o.Ref_No_Title,'')
   , Packing_No_Title = isnull(o.Packing_No_Title,'') 
   From @Order_PKO t
   Inner Join Orders o with(NoLock,NoWait) on t.Order_No = o.Order_No
   
   Insert @Order_Qty(Order_PKOID, Style_No, Size)
   Select distinct Order_PKOID, Style_No, Size
   FROM (Select distinct Order_PKOID, Style_No, Order_Detail_RefID From @Order_PKO) op
   Inner Join Order_Detail od with(NoLock,NoWait) on od.Order_Detail_RefID = op.Order_Detail_RefID
   Inner Join Order_Qty oq with(NoLock,NoWait) on od.Order_DetailID = oq.Order_DetailID;

   Insert @Size_Name
   Select Size, Size_Name
   From (Select distinct Size From @Order_Qty) t
   Inner Join Product_Size ps with(NoWait, NoLock) on ps.SizeID = t.Size;
      
   --0 PKO Info
   Select *
   From @Order_PKO;
   
   --1 PKO Detail
   Insert @Order_PKO_Detail(Order_PKOID, Order_PKO_DetailID, Cartons, Delivered_Cartons, Unit_Qty, Total_Qty, Carton_No, Carton_Code, CL, CW, CH, PK_MATL_WT, Meas, Detail_Remark)
   SELECT pd.Order_PKOID, pd.Order_PKO_DetailID, pd.Cartons,  pd.Delivered_Cartons, pd.Unit_Qty, isnull(pd.Cartons,0) * isnull(pd.Unit_Qty,0) as Total_Qty
   , pd.Carton_No, pd.Carton_Code
   , pd.CL, pd.CW, pd.CH
   , isnull(pd.PK_MATL_WT,0) as PK_MATL_WT
   , Round(((pd.CL * pd.CW * pd.CH ) / 1000000),3) * isnull(pd.Cartons,0) as Meas
   , isnull(pd.Detail_Remark,'') as Detail_Remark   
   FROM @Order_PKO op
   Inner Join Order_PKO_Detail pd With(NoLock,NoWait) on pd.Order_PKOID = op.Order_PKOID
   Order By Order_PKOID, Order_PKO_DetailID;
   
   Select * from @Order_PKO_Detail;
   
   --2 Order Size
   Insert @Product_Size_Match
   Select m.Style_No, oq.Size, m.Net_Weight
   From (Select distinct Style_No, Size From @Order_Qty) oq
   Inner Join Product_Size_Match m with(NoLock,NoWait) on oq.Style_No = m.Style_No And m.Shoe_Size = oq.Size
   Insert @Order_Size
   Select Order_PKOID, oq.Size 
   , isnull(m.Net_Weight,0) as Net_Weight
   From @Order_Qty oq
   Left Outer Join @Product_Size_Match m on m.Style_No = oq.Style_No And m.Size = oq.Size;
   Select Order_PKOID, Size From @Order_Size
     
   --3 Packing Size
   SELECT pd.Order_PKOID, pd.Order_PKO_DetailID, q.Order_PKO_Detail_QtyID, q.Size, n.Size_Name, q.Qty
   , isnull(q.Qty , 0) * isnull(pd.Cartons,0) as Real_Qty
   , isnull(os.Net_Weight,0) * isnull(q.Qty , 0) as Shoe_Weight   
   FROM @Order_PKO_Detail pd 
   Inner Join Order_PKO_Detail_Qty q With(NoLock,NoWait) on pd.Order_PKO_DetailID = q.Order_PKO_DetailID
   Inner Join @Order_Size os on os.Order_PKOID = pd.Order_PKOID And os.Size = q.Size
   Inner Join @Size_Name n on q.Size = n.Size
   Order by Order_PKOID, pd.Order_PKO_DetailID, q.Size;

    `, req.body );
   //console.log(strSQL);

   db.sql(req.SiteDB, strSQL)
      .then((result) => { 
         var PKO_Info = result.recordsets[0];         

         PKO_Info.forEach((item)=>{
            item.Carton_NW_TTL = 0;
            item.Carton_GW_TTL = 0;
            item.Total_Qty = 0;
            item.Total_Cartons = 0;
            item.Total_Meas = 0;   
            item.PKO_Detail = result.recordsets[1].filter((data)=>(data.Order_PKOID == item.Order_PKOID));
            //item.Order_Size = result.recordsets[2].filter((data)=>(data.Order_PKOID == item.Order_PKOID));

            item.PKO_Detail.forEach((data)=>{
               data.Carton_NW = 0 
               data.Carton_GW = 0 
               data.Packing_Size = result.recordsets[3].filter((obj)=>(data.Order_PKO_DetailID == obj.Order_PKO_DetailID  && data.Order_PKOID == item.Order_PKOID));

               data.Packing_Size.forEach((obj)=>{
                  data.Carton_NW += obj.Shoe_Weight;
                  data.Carton_GW += obj.Shoe_Weight;                  
               })
               data.Carton_NW = Math.round((data.Carton_NW * data.Cartons)*10000)/10000;
               data.Carton_GW = Math.round(((data.Carton_GW + data.PK_MATL_WT) * data.Cartons)*10000)/10000;

               item.Carton_NW_TTL += data.Carton_NW;
               item.Carton_GW_TTL += data.Carton_GW;
               item.Total_Qty += data.Total_Qty;
               item.Total_Cartons += data.Cartons;
               item.Total_Meas += data.Meas;
            })
            item.Carton_NW_TTL = Math.round((item.Carton_NW_TTL)*10000)/10000;
            item.Carton_GW_TTL = Math.round((item.Carton_GW_TTL)*10000)/10000;
            item.Total_Qty = Math.round((item.Total_Qty)*10000)/10000;
            item.Total_Cartons = Math.round((item.Total_Cartons)*10000)/10000;
            item.Total_Meas = Math.round((item.Total_Meas)*10000)/10000;

         })

         var DataSet = {
            G_Carton_NW_TTL: 0,
            G_Carton_GW_TTL: 0,
            G_Total_Qty: 0,
            G_Total_Cartons: 0,
            G_Total_Meas: 0,
            PKO_Info: PKO_Info,
         };
         
         res.send(DataSet);
      }).catch((err) => {
         console.log(err);
         res.status(500).send(err);
      })

});

//Get Shipment Plan List
router.post('/Shipment_Plan_List',  function (req, res, next) {
   console.log("Call Shipment_Plan_List Api:", req.body);
   req.body.PDSP_PlanID = req.body.PDSP_PlanID ? req.body.PDSP_PlanID : 0;
   req.body.Booking_Date = req.body.Booking_Date ? `${req.body.Booking_Date.trim().substring(0,10)}` : '';   
   req.body.CustomerID = req.body.CustomerID ? `${req.body.CustomerID.trim().substring(0,15).replace(/'/g, '')}` : '';
   req.body.Brand = req.body.Brand ? `${req.body.Brand.trim().substring(0,30).replace(/'/g, '')}` : '';
   req.body.Destination = req.body.Destination ? `${req.body.Destination.trim().substring(0,30).replace(/'/g, '')}` : '';
   req.body.F_ETD = req.body.F_ETD ? `${req.body.F_ETD.trim().substring(0,10)}` : '';   
   req.body.Forwarder = req.body.Forwarder ? `${req.body.Forwarder.trim().substring(0,30).replace(/'/g, '')}` : '';
   req.body.Container = req.body.Container ? `${req.body.Container.trim().substring(0,65535).replace(/'/g, '')}` : '';

   var strSQL = format(`
   SELECT Top 500 pp.[PDSP_PlanID]
   , convert(varchar(10) ,pp.[Booking_Date] ,111) as [Booking_Date]
   , pp.[CustomerID]
   , pp.[Brand]
   , pp.[Destination]
   , convert(varchar(10) ,pp.[F_ETD] ,111) as [F_ETD]
   , pp.[F_Vessel]
   , pp.[S_Port]
   , pp.[M_Vessel]
   , pp.[T_Port]
   , pp.[Forwarder]
   , pp.[Container]
   , pp.[Data_Updater]
   , convert(varchar(20) ,pp.[Data_Update] ,120) as [Data_Update]
   FROM [dbo].[PDSP_Plan] pp With(Nolock,NoWait)
   where ({PDSP_PlanID} = 0 or pp.PDSP_PlanID = {PDSP_PlanID})
   And ('{Booking_Date}' = '' or convert(varchar(10), pp.[Booking_Date],111) Like '%{Booking_Date}%' )
   And (N'{CustomerID}' = '' or pp.[CustomerID] like N'%{CustomerID}%')
   And (N'{Brand}' = '' or pp.[Brand] like N'%{Brand}%')
   And (N'{Destination}' = '' or pp.[Destination] like N'%{Destination}%') 
   And ('{F_ETD}' = '' or convert(varchar(10), pp.[F_ETD],111) Like '%{F_ETD}%' )
   And (N'{Forwarder}' = '' or pp.[Forwarder] like N'%{Forwarder}%')
   And (N'{Container}' = '' or pp.[Container] like N'%{Container}%') 
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

//Get Shipmen_Plan Info
router.post('/Shipment_Plan_Info',  function (req, res, next) {
   console.log("Call Shipment_Plan_Info Api:", req.body);

   req.body.Mode = req.body.Mode ? req.body.Mode : 0;
   req.body.PDSP_PlanID = req.body.PDSP_PlanID ? req.body.PDSP_PlanID : 0;

   var strSQL = format(`Declare @Mode int = {Mode}, @PDSP_PlanID int = {PDSP_PlanID}
   
   if(@Mode = 0 or @Mode = 1)
   Begin
      SELECT pp.PDSP_PlanID
      , convert(varchar(20) ,pp.[Booking_Date] ,111) as [Booking_Date]
      , pp.[OrganizationID]
      , pp.[CustomerID]
      , pp.[Brand]
      , pp.[Destination]
      , convert(varchar(20) ,pp.[F_ETD] ,111) as [F_ETD]
      , pp.[F_Vessel]
      , pp.[S_Port]
      , pp.[T_Port]
      , pp.[Forwarder]
      , pp.[Container]
      , pp.[Total_NW]
      , pp.[Total_GW]
      , convert(varchar(20), pp.[Cargo_Ready_Date], 111) as [Cargo_Ready_Date]
      , pp.[Shipment_NO], pp.[FactoryID], pp.[Measurement], pp.[MessrsID], pp.[Messrs], pp.[Messrs_Address], pp.[Notify_Party_Title], pp.[Notify_PartyID], pp.[Notify_Party], pp.[Notify_Party_Address]
      , pp.[Buyer_Title], pp.[BuyerID], pp.[Buyer], pp.[Buyer_Address], pp.[Shipping_Mode], pp.[Bill_Of_Loading], pp.[Term_Price], pp.[Commodity], pp.[Remark]
      , (Select Name From Customer_Contacts cc Where cc.ContactID = pp.BuyerID) as Buyer_Name
      , (Select Name From Customer_Contacts cc Where cc.ContactID = pp.Notify_PartyID) as Notify_Party_Name
      , convert(varchar(20) ,pp.[Data_Update] ,120) as [Data_Update]
      , pp.Data_Updater
      FROM [dbo].[PDSP_Plan] pp With(Nolock,NoWait)
      where pp.PDSP_PlanID = @PDSP_PlanID;
   End

   if(@Mode = 0 or @Mode = 2)
   Begin   
   
   Declare @Pln_Detail table(Order_PKO_DetailID int, Cartons int)
   Declare @PKO_Detail table(RecNo int identity(1,1),PDSP_Plan_DetailID int, Order_PKOID int, Produce_No varchar(20), PKO_No varchar(20), Order_No varchar(18), Product_No varchar(25)
   , Order_PKO_DetailID int, Unit_Qty float, Carton_No varchar(20), Cartons int, Meas float
   , Plan_Carton int
   , Plan_Qty float
   , Plan_Meas float, Produce_LineID varchar(20)
   , Ref_No varchar(20), Destination varchar(30), Shipping_Date varchar(10), [Week] int)
     
   Insert @PKO_Detail(PDSP_Plan_DetailID, Order_PKOID, Produce_No, PKO_No, Order_No, Product_No, Order_PKO_DetailID
      , Unit_Qty
      , Carton_No
      , Cartons
      , Meas
      , Plan_Carton
      , Plan_Qty
      , Plan_Meas
      , Produce_LineID
      , Ref_No
      , Destination
      , Shipping_Date
      , [Week])
   Select o.PDSP_Plan_DetailID, op.Order_PKOID, od.Produce_No, op.PKO_No, od.Order_No, od.Product_No, opd.Order_PKO_DetailID
   , opd.Unit_Qty
   , opd.Carton_No
   , opd.Cartons
   , Round(((opd.CL * opd.CW * opd.CH ) / 1000000),3) * isnull(opd.Cartons,0) as Meas
   , o.Cartons as Plan_Carton
   , isnull(opd.Unit_Qty,0) * isnull(o.Cartons,0) as Plan_Qty
   , Round(((opd.CL * opd.CW * opd.CH ) / 1000000),3) * isnull(o.Cartons,0) as Plan_Meas
   , p.Produce_LineID
   , odf.Ref_No
   , op.Destination
   , case when op.Shipping_Date is null then '' else convert(varchar(10),op.Shipping_Date, 111)  end as Shipping_Date
   , DATEPART(week, op.Shipping_Date) as [Week]
   From PDSP_Plan_Detail o with(NoLock,NoWait)
   Inner Join Order_PKO_Detail opd with(NoLock,NoWait) on opd.Order_PKO_DetailID = o.Order_PKO_DetailID
   Inner Join Order_PKO op with(NoLock,NoWait) on op.Order_PKOID = opd.Order_PKOID
   Inner Join Order_Detail_Ref odf with(NoLock,NoWait) on op.Order_Detail_RefID = odf.Order_Detail_RefID
   Inner Join Order_Detail od with(NoLock,NoWait) on od.Order_Detail_RefID = odf.Order_Detail_RefID
   Inner Join Produce p with(NoLock,NoWait) on p.Produce_No = od.Produce_No
   Where o.PDSP_PlanID = @PDSP_PlanID
   Order by od.Produce_No, od.Order_No, op.PKO_No;

   Insert @Pln_Detail
   Select pd.Order_PKO_DetailID, sum(Cartons) as Cartons
   From dbo.PDSP_Plan_Detail pd with(NoLock,NoWait)
   Inner Join (Select distinct Order_PKO_DetailID From @PKO_Detail ) tmp on tmp.Order_PKO_DetailID = pd.Order_PKO_DetailID
   Group by pd.Order_PKO_DetailID;
      
   Select d.RecNo, cast(0 as bit) as flag, d.PDSP_Plan_DetailID, d.Order_PKOID, d.Produce_No, d.PKO_No, d.Order_No, d.Product_No, d.Order_PKO_DetailID
   , isnull(d.Unit_Qty * d.Cartons,0) as PKO_Qty
   , isnull(d.Cartons,0) as PKO_Cartons
   , d.Carton_No
   , d.Cartons - isnull(pd.Cartons,0) as Balance_Cartons
   , isnull(d.Unit_Qty * (d.Cartons - isnull(pd.Cartons,0)),0) as Balance_Qty
   , isnull(pd.Cartons,0) as Shiped_Cartons
   , isnull(d.Unit_Qty * pd.Cartons,0) as Shiped_Qty
   , d.Meas
   , d.Plan_Carton
   , d.Plan_Qty
   , d.Plan_Meas
   , d.Produce_LineID
   , d.Ref_No
   , d.Destination
   , d.Shipping_Date
   , d.[Week]
   , isnull(p.Color,'') + ' ' + isnull(p.Color_Code,'') as Color
   , p.Name as Shoe_Name
   From @PKO_Detail d
   Inner Join Product p with(NoWait, NoLock) on d.Product_No = p.Product_No
   Left Outer Join @Pln_Detail pd on d.Order_PKO_DetailID = pd.Order_PKO_DetailID ;

   End
   `, req.body) ;
   //console.log(strSQL)
   db.sql(req.SiteDB, strSQL)
      .then((result) => {
         var DataSet = { Shipment_Plan_Info: (req.body.Mode == 0 || req.body.Mode == 1) ? result.recordsets[0] : [],
            Detail_Info: (req.body.Mode == 0) ? result.recordsets[1] : (req.body.Mode == 2) ? result.recordsets[0]: []
         }
         res.send(DataSet);
      }).catch((err) => {
         console.log(err);
         res.status(500).send(err);
      })

});

//Maintain PDSP_Plan_Maintain data
router.post('/PDSP_Plan_Maintain',  function (req, res, next) {
   console.log("Call PDSP_Plan_Maintain Api:",req.body);

   // req.body.Mode === 0 表示新增 PDSP_Plan
   // req.body.Mode === 1 表示修改 PDSP_Plan 資料
   // req.body.Mode === 2 表示刪除 PDSP_Plan 資料
   // req.body.Mode === 3 Order_PKO 加入 PDSP_Plan
   // req.body.Mode === 4 表示將Order_PKO 移出 PDSP_Plan
   // req.body.Mode === 5 表示將Order_PKO的Packing Net and Gross Weight
   req.body.PDSP_PlanID = req.body.PDSP_PlanID ? req.body.PDSP_PlanID : null; 
   
   var strSQL = format(`Declare @ROWCOUNT int, @Mode int = {Mode}, @PDSP_PlanID int = {PDSP_PlanID}, @Total_NW float = 0, @Total_GW float = 0, @Total_Meas varchar(15); `, req.body);
   switch(req.body.Mode){
      case 0:
         req.body.CustomerID = req.body.CustomerID ? `N'${req.body.CustomerID.trim().substring(0,15).replace(/'/g, "''")}'` : `''`;
         req.body.Brand = req.body.Brand ? `N'${req.body.Brand.trim().substring(0,30).replace(/'/g, "''")}'` : `''`;
         req.body.Booking_Date = req.body.Booking_Date ? `${req.body.Booking_Date.trim().substring(0,10).replace(/'/g, '')}` : moment().format('YYYY/MM/DD');
         req.body.F_ETD = req.body.F_ETD ? `${req.body.F_ETD.trim().substring(0,10).replace(/'/g, '')}` : moment().format('YYYY/MM/DD');
      
         strSQL += format(`
            Insert into [dbo].[PDSP_Plan] (Brand, CustomerID, F_ETD, Booking_Date, Notify_Party_Title, Data_Updater, Data_Update)
            Select {Brand} as Brand
            , {CustomerID} as CustomerID
            , '{F_ETD}' as F_ETD
            , '{Booking_Date}' as Booking_Date
            , 'Notify Party' as Notify_Party_Title
            , N'${req.UserID}' as Data_Updater
            , GetDate() as Data_Update
            Set @PDSP_PlanID = scope_identity();

            Set @ROWCOUNT = @@ROWCOUNT;
         `, req.body);
      break;
      case 1:
         var Size = 0;
         switch(req.body.Name){
            case 'Brand':
            case 'Destination':
            case 'S_Port':
            case 'T_Port':
            case 'Forwarder':
            case 'Notify_Party_Title':
            case 'Buyer_Title':
                  Size = 30;
            break;            
            case 'CustomerID':
            case 'FactoryID':
            case 'Measurement':
               Size = 15;
            break;
            case 'OrganizationID':
            case 'Booking_Date':
            case 'F_ETD':
            case 'Cargo_Ready_Date':
            case 'Stuffing_Date':
               Size = 10;
            break;
            case 'Shipment_NO':
               Size = 18;
            break;
            case 'F_Vessel':
            case 'M_Vessel':
               Size = 40;
            break;
            case 'Bill_Of_Loading':
            case 'Shipping_Mode':
               Size = 50;
            break;
            case 'Term_Price':
               Size = 80;
            break;
            case 'Messrs':
            case 'Notify_Party':
            case 'Buyer':
            case 'Commodity':
               Size = 100;
            break;
            case 'Messrs_Address':
            case 'Notify_Party_Address':
            case 'Buyer_Address':
               Size = 256;
            break;
            case 'Remark':
               Size = 1000;
            break;
            case 'Container':
               Size = 65535;
            break;
         }
         req.body.Value = Size == 0 ? (req.body.Value ? req.body.Value : null) : (req.body.Value ? `N'${req.body.Value.trim().replace(/'/g, "''")}'` : `''`);

         if( req.body.Name == 'MessrsID' || req.body.Name == 'BuyerID' || req.body.Name == 'Notify_PartyID' ){
            switch(req.body.Name) {
               case 'MessrsID':
                  req.body.Value = req.body.Value ?  `N'${req.body.Value.trim().substring(0,15).replace(/'/g, "''")}'` : `''`; 
                  req.body.Messrs = req.body.Messrs ?  `N'${req.body.Messrs.trim().substring(0,100).replace(/'/g, "''")}'` : `''`; 
                  req.body.Messrs_Address = req.body.Messrs_Address ?  `N'${req.body.Messrs_Address.trim().substring(0,150).replace(/'/g, "''")}'` : `''`; 
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
            Update [dbo].[PDSP_Plan] Set [{Name}] = ${Size == 0 ? '{Value}': `substring({Value},1,${Size})`}
            ${ req.body.Name === 'MessrsID' ? `, Messrs = {Messrs}, Messrs_Address = {Messrs_Address} 
            ,BuyerID = null, Buyer = null, Buyer_Address = null
            ,Notify_PartyID = null, Notify_Party = null, Notify_Party_Address = null 
            ` : "" }
            ${ req.body.Name === 'Notify_PartyID' ? `,Notify_Party = {Notify_Party}, Notify_Party_Address = {Notify_Party_Address}` : "" }
            ${ req.body.Name === 'BuyerID' ? `,Buyer = {Buyer}, Buyer_Address = {Buyer_Address}` : "" }
            where PDSP_PlanID = @PDSP_PlanID;

            Set @ROWCOUNT = @@ROWCOUNT;
         `, req.body);         
      break;
      case 2:
         strSQL += format(`
            Delete From [dbo].[PDSP_Plan] 
            Where PDSP_PlanID = @PDSP_PlanID;

            Set @ROWCOUNT = @@ROWCOUNT;
         `, req.body);
      break;
      case 3:
      case 4:
         req.body.Order_PKOID = req.body.Order_PKOID ? req.body.Order_PKOID : null; 
         strSQL += format(`
            Update [dbo].[Order_PKO] Set PDSP_PlanID = ${req.body.Mode == 3 ? '{PDSP_PlanID}': 'null' }            
            where Order_PKOID = {Order_PKOID}; 

            Set @ROWCOUNT = @@ROWCOUNT;
         `, req.body);
      break;
      case 5:
         strSQL += format(`Declare @Order_PKO Table(Style_No varchar(20), Order_PKO_DetailID int, PK_MATL_WT float, Cartons float, Total_Meas float);
         Declare @Product_Size_Match Table(Style_No varchar(20), Size float, Net_Weight float);

         Insert @Order_PKO
         Select distinct p.Style_No, tmp.Order_PKO_DetailID, tmp.PK_MATL_WT, tmp.Cartons, isnull(tmp.Meas,0) * isnull(tmp.Cartons,0) as Total_Meas
         From( 
            Select op.Order_Detail_RefID, opd.Order_PKO_DetailID, isnull(opd.PK_MATL_WT,0) as PK_MATL_WT, sum(ppd.Cartons) as Cartons
            , Round(((opd.CL * opd.CW * opd.CH ) / 1000000),3) as Meas
            From PDSP_Plan_Detail ppd with(Nolock, NoWait)            
            Inner Join Order_PKO_Detail opd with(Nolock, NoWait) on ppd.Order_PKO_DetailID = opd.Order_PKO_DetailID
            Inner Join Order_PKO op with(Nolock, NoWait) on op.Order_PKOID = opd.Order_PKOID
            Where ppd.PDSP_PlanID = @PDSP_PlanID
            Group by op.Order_Detail_RefID, opd.Order_PKO_DetailID, opd.PK_MATL_WT, opd.CL, opd.CW, opd.CH
         ) tmp
         Inner Join Order_Detail od with(NoLock,NoWait) on tmp.Order_Detail_RefID = od.Order_Detail_RefID
         Inner Join Product p on p.Product_No = od.Product_No;

         Insert @Product_Size_Match
         Select tmp.Style_No, m.Shoe_Size , Net_Weight
         From ( Select distinct Style_No From @Order_PKO ) tmp
         Inner Join Product_Size_Match m on m.Style_No = tmp.Style_No; 

         Select @Total_NW = Sum(tmp.Cartons * round(tmp.Carton_NW,2))
         , @Total_GW = Sum(tmp.Cartons * (round(tmp.Carton_NW,2) + tmp.PK_MATL_WT))
         From
         (Select opd.Order_PKO_DetailID, opd.Cartons, opd.PK_MATL_WT
            , sum(isnull(m.Net_Weight,0) * isnull(oq.Qty,0)) as Carton_NW
            From @Order_PKO opd
            Inner Join Order_PKO_Detail_Qty oq on opd.Order_PKO_DetailID = oq.Order_PKO_DetailID
            Left Outer Join @Product_Size_Match m on m.Style_No = opd.Style_No And m.Size = oq.Size
            Group by opd.Order_PKO_DetailID, opd.Cartons, opd.PK_MATL_WT) tmp;

         Select @Total_Meas = SUM(isnull(op.Total_Meas,0))
         From @Order_PKO op

         Set @ROWCOUNT = 1;
         `, req.body);
      break;
   }

   strSQL += format(`
   set @Total_NW = round(@Total_NW*100,0)/100;
   set @Total_GW = round(@Total_GW*100,0)/100;

   Select @ROWCOUNT as Flag, @PDSP_PlanID as PDSP_PlanID, @Total_NW as Total_NW, @Total_GW as Total_GW, @Total_Meas as Measurement;

   if(@ROWCOUNT > 0 And (@Mode <> 0 or @Mode <> 2))
   Begin
      Update [dbo].[PDSP_Plan] set Data_Update = GetDate()
      , Data_Updater = N'${req.UserID}'
      ${req.body.Mode == 5 ? ',Total_NW = @Total_NW, Total_GW = @Total_GW, Measurement = @Total_Meas':''}
      Where PDSP_PlanID = @PDSP_PlanID;
   End
   `, req.body);
   //console.log(strSQL)
   db.sql(req.SiteDB, strSQL)
      .then((result) => {
         //console.log(result.recordsets[0])
         res.send({Flag:result.recordsets[0][0].Flag > 0
            , PDSP_PlanID: result.recordsets[0][0].PDSP_PlanID
            , Total_NW: result.recordsets[0][0].Total_NW
            , Total_GW: result.recordsets[0][0].Total_GW
            , Measurement: result.recordsets[0][0].Measurement
         });
      }).catch((err) => {
         console.log(err);
         res.status(500).send(err);
      })

});

//Maintain PDSP_Plan_Detail_Maintain data
router.post('/PDSP_Plan_Detail_Maintain',  function (req, res, next) {
   console.log("Call PDSP_Plan_Detail_Maintain Api:",req.body);

   // req.body.Mode === 0 表示新增 PDSP_Plan_Detail
   // req.body.Mode === 1 表示修改 PDSP_Plan_Detail 資料
   // req.body.Mode === 2 表示刪除 PDSP_Plan_Detail 資料
   req.body.PDSP_PlanID = req.body.PDSP_PlanID ? req.body.PDSP_PlanID : null; 
   req.body.PDSP_Plan_DetailID = req.body.PDSP_Plan_DetailID ? req.body.PDSP_Plan_DetailID : null;    
   
   var strSQL = format(`Declare @ROWCOUNT int, @Mode int = {Mode}, @Total_NW float = 0, @Total_GW float = 0, @Total_Meas varchar(15); `, req.body);
   switch(req.body.Mode){
      case 0:
         
         req.body.Order_PKO_DetailID = req.body.Order_PKO_DetailID ? req.body.Order_PKO_DetailID : null;
         strSQL += format(`
            Insert into [dbo].[PDSP_Plan_Detail] (PDSP_PlanID, Order_PKO_DetailID, Cartons)
            Select {PDSP_PlanID} as PDSP_PlanID
            , {Order_PKO_DetailID} as Order_PKO_DetailID
            , (
               isnull(( Select Sum(o.Cartons) From Order_PKO_Detail o with(NoLock,NoWait) Where Order_PKO_DetailID = {Order_PKO_DetailID}),0) 
              - isnull(( Select Sum(o.Cartons) From PDSP_Plan_Detail o with(NoLock,NoWait) Where Order_PKO_DetailID = {Order_PKO_DetailID}),0) 
              )
            as Cartons
            
            Set @ROWCOUNT = @@ROWCOUNT;
         `, req.body);
      break;
      case 1:
         var Size = 0;
         switch(req.body.Name){
            case 'Container':
               Size = 65535;
            break;
            default:
            break;
         }
         req.body.Value = Size == 0 ? (req.body.Value ? req.body.Value : null) : (req.body.Value ? `N'${req.body.Value.trim().replace(/'/g, "''")}'` : `''`);


         switch(req.body.Name){
            case 'Cartons':
               strSQL += format(`Declare @Balance_Qty float;
               Set @Balance_Qty = (
                  isnull(( Select Sum(o.Cartons) From Order_PKO_Detail o with(NoLock,NoWait) Where Order_PKO_DetailID = {Order_PKO_DetailID}),0) 
               - isnull(( Select Sum(o.Cartons) From PDSP_Plan_Detail o with(NoLock,NoWait) Where Order_PKO_DetailID = {Order_PKO_DetailID} And PDSP_Plan_DetailID <> {PDSP_Plan_DetailID}),0) 
               - isnull({Value} ,0)
               )
               
               Update [dbo].[PDSP_Plan_Detail] Set [{Name}] = isnull({Value},0) 
               where PDSP_Plan_DetailID = {PDSP_Plan_DetailID}
               And @Balance_Qty >= 0;

               Set @ROWCOUNT = @@ROWCOUNT;
            `, req.body);
            break;
            default:
               strSQL += format(`
               Update [dbo].[PDSP_Plan_Detail] Set [{Name}] = ${ Size == 0 ? '{Value}': `substring({Value},1,${Size})` }
               where PDSP_Plan_DetailID = {PDSP_Plan_DetailID}; 

               Set @ROWCOUNT = @@ROWCOUNT;
            `, req.body);

            break;
         }

      break;
      case 2:
         strSQL += format(`
            Delete From [dbo].[PDSP_Plan_Detail] 
            Where PDSP_Plan_DetailID = {PDSP_Plan_DetailID};

            Set @ROWCOUNT = @@ROWCOUNT;
         `, req.body);
      break;
   }

   strSQL += format(`

   Select @ROWCOUNT as Flag;

   if(@ROWCOUNT > 0 And (@Mode <> 0 or @Mode <> 2))
   Begin
      Update [dbo].[PDSP_Plan] set Data_Update = GetDate()
      , Data_Updater = N'${req.UserID}'      
      Where PDSP_PlanID = {PDSP_PlanID};
   End
   `, req.body);
   //console.log(strSQL)
   db.sql(req.SiteDB, strSQL)
      .then((result) => {
         //console.log(result.recordsets[0])
         res.send({Flag:result.recordsets[0][0].Flag > 0
         });
      }).catch((err) => {
         console.log(err);
         res.status(500).send(err);
      })

});

//Get Shipment Plan Detail add Data (成品出貨包裝細項)
router.post('/Shipment_Plan_Detail_Add_List',  function (req, res, next) {
   console.log("Call Shipment_Plan_Detail_Add_List Api:");

   req.body.PDSP_PlanID = req.body.PDSP_PlanID ? req.body.PDSP_PlanID : null;
   req.body.QueryData = req.body.QueryData ? `N'${req.body.QueryData.trim()}'` : `''`;   

   var strSQL = format(`Declare @PDSP_PlanID int= {PDSP_PlanID}, @FactoryID varchar(20), @CustomerID varchar(20), @Brand varchar(20)
   Declare @Pln_Detail table(Order_PKO_DetailID int, Cartons int)
   Declare @PKO_Detail table(Produce_No varchar(20), PKO_No varchar(20), Order_No varchar(18), Product_No varchar(25)
   , Order_PKO_DetailID int, Unit_Qty float, Carton_No varchar(20), Cartons int, Meas float, Produce_LineID varchar(20)
   , Ref_No varchar(20), Destination varchar(30), Shipping_Date varchar(10), [Week] int)
  
   SELECT @FactoryID = [FactoryID], @CustomerID = [CustomerID], @Brand = [Brand]
   FROM [dbo].[PDSP_Plan] with(NoLock,NoWait)
   Where PDSP_PlanID = @PDSP_PlanID;
   
   Insert @PKO_Detail
   Select od.Produce_No, op.PKO_No, o.Order_No, od.Product_No, opd.Order_PKO_DetailID
   , opd.Unit_Qty
   , opd.Carton_No
   , opd.Cartons
   , Round(((opd.CL * opd.CW * opd.CH ) / 1000000),3) * isnull(opd.Cartons,0) as Meas
   , p.Produce_LineID
   , odf.Ref_No
   , op.Destination
   , case when op.Shipping_Date is null then '' else convert(varchar(10),op.Shipping_Date, 111)  end as Shipping_Date
   , DATEPART(week, op.Shipping_Date) as [Week]
   From Orders o with(NoLock,NoWait)
   Inner Join Order_Detail od with(NoLock,NoWait) on o.Order_No = od.Order_No
   Inner Join Order_Detail_Ref odf with(NoLock,NoWait) on od.Order_Detail_RefID = odf.Order_Detail_RefID
   Inner Join Produce p with(NoLock,NoWait) on p.Produce_No = od.Produce_No
   Inner Join Order_PKO op with(NoLock,NoWait) on od.Order_Detail_RefID = op.Order_Detail_RefID
   Inner Join Order_PKO_Detail opd with(NoLock,NoWait) on op.Order_PKOID = opd.Order_PKOID
   Where o.Brand = @Brand And o.CustomerID = @CustomerID --and p.FactoryID = @FactoryID
   Order by od.Produce_No, o.Order_No;

   Insert @Pln_Detail
   Select pd.Order_PKO_DetailID, sum(Cartons) as Cartons
   From dbo.PDSP_Plan_Detail pd with(NoLock,NoWait)
   Inner Join (Select distinct Order_PKO_DetailID From @PKO_Detail ) tmp on tmp.Order_PKO_DetailID = pd.Order_PKO_DetailID
   Group by pd.Order_PKO_DetailID;
      
   Select cast(0 as bit) as flag, d.Produce_No, d.PKO_No, d.Order_No, d.Product_No, d.Order_PKO_DetailID
   , isnull(d.Unit_Qty * d.Cartons,0) as PKO_Qty
   , isnull(d.Cartons,0) as PKO_Cartons
   , d.Carton_No
   , d.Cartons - isnull(pd.Cartons,0) as Balance_Cartons
   , isnull(d.Unit_Qty * (d.Cartons - isnull(pd.Cartons,0)),0) as Balance_Qty
   , isnull(pd.Cartons,0) as Shiped_Cartons
   , isnull(d.Unit_Qty * pd.Cartons,0) as Shiped_Qty
   , d.Meas
   , d.Produce_LineID
   , d.Ref_No
   , d.Destination
   , d.Shipping_Date
   , d.[Week]
   , isnull(p.Color,'') + ' ' + isnull(p.Color_Code,'') as Color
   , p.Name as Shoe_Name
   From @PKO_Detail d
   Inner Join Product p with(NoWait, NoLock) on d.Product_No = p.Product_No
   Left Outer Join @Pln_Detail pd on d.Order_PKO_DetailID = pd.Order_PKO_DetailID
   Where d.Cartons - isnull(pd.Cartons,0) > 0
   And ({QueryData} = '' or charindex({QueryData}, isnull(d.PKO_No,'') + ' ' + isnull(d.Order_No,'') + ' ' + isnull(p.Name,'') + ' ' + isnull(d.Product_No,'') + ' ' + isnull(d.Produce_No,'') + ' ' + isnull(d.Ref_No,'')  + ' ' + isnull(d.Destination, '') + ' ' + isnull(d.Shipping_Date,'') ) > 0)


   Order by d.Produce_No, d.Order_No, d.PKO_No;
   `, req.body) ;
   //console.log(strSQL)
   db.sql(req.SiteDB, strSQL)
      .then((result) => {
         res.send({Shipment_Plan_Detail_Add_List: result.recordsets[0]});
      }).catch((err) => {
         console.log(err);
         res.status(500).send(err);
      })

});

//Get Shipment_Plan_Report
router.post('/Shipment_Plan_Report',function (req, res, next) {
   console.log("Call Shipment_Plan_Report Api :", req.body);
   
   req.body.Mode = req.body.Mode ? req.body.Mode : 0; 
   req.body.PDSP_PlanID = req.body.PDSP_PlanID ? req.body.PDSP_PlanID : null;    
   var strSQL = format(`Declare @Mode int = {Mode}, @PDSP_PlanID int = {PDSP_PlanID}; 
   --0 Shipment Plan Info
   SELECT  convert(varchar(10) ,pp.[Booking_Date] ,111) as [Booking_Date]
   , pp.[OrganizationID]
   , pp.[CustomerID]
   , pp.[Brand]
   , pp.[Destination]
   , convert(varchar(20) ,pp.[F_ETD] ,111) as [F_ETD]
   , pp.[F_Vessel]
   , pp.[S_Port]
   , pp.[T_Port]
   , pp.[Forwarder]
   , pp.[Container]
   , pp.[Total_NW]
   , pp.[Total_GW]
   , convert(varchar(20), pp.[Cargo_Ready_Date], 111) as [Cargo_Ready_Date]
   , convert(varchar(20), pp.[Stuffing_Date], 111) as [Stuffing_Date]   
   , pp.[Shipment_NO], pp.[FactoryID], pp.[Measurement], pp.[MessrsID], pp.[Messrs], pp.[Messrs_Address], pp.[Notify_Party_Title], pp.[Notify_PartyID], pp.[Notify_Party], pp.[Notify_Party_Address]
   , pp.[Buyer_Title], pp.[BuyerID], pp.[Buyer], pp.[Buyer_Address], pp.[Shipping_Mode], pp.[Bill_Of_Loading], pp.[Term_Price], pp.[Commodity], pp.[Remark]
   , (Select Name From Customer_Contacts cc Where cc.ContactID = pp.BuyerID) as Buyer_Name
   , (Select Name From Customer_Contacts cc Where cc.ContactID = pp.Notify_PartyID) as Notify_Party_Name
   , (Select Factory_Name From Factory f Where f.FactoryID = pp.FactoryID) as Factory_Name
   , (Select Address From Factory f Where f.FactoryID = pp.FactoryID) as Factory_Address
   FROM [dbo].[PDSP_Plan] pp With(Nolock,NoWait)
   where pp.PDSP_PlanID = @PDSP_PlanID;
   `, req.body );
   switch(req.body.Mode){
      case 0:
         strSQL += format(`
         Declare @Order_Qty Table(Order_PKOID int, Style_No varchar(20), Size real);
         Declare @Product_Size_Match Table(Style_No varchar(20), Size real, Net_Weight float)
         Declare @Order_Size Table(Order_PKOID int, Size real, Net_Weight float)
         Declare @Size_Name Table(Size real, Size_Name varchar(10))
      
         Declare @Order_PKO Table(Order_PKOID int, PKO_No varchar(20), Main_Mark nvarchar(max), Side_Mark nvarchar(max), Memo nvarchar(max), Order_Detail_RefID int
         , Ref_No varchar(20), Order_No varchar(18), Style_No varchar(20), Shoe_Name Nvarchar(50), Color varchar(70), Product_No varchar(25), Shipping_Date varchar(10)
         , Destination nvarchar(30), Detail_Remark_Title nvarchar(20), Ref_No_Title nvarchar(30), Packing_No_Title nvarchar(30)
         , Data_Update varchar(20), Data_Updater Nvarchar(255)
         )
         
         Declare @Order_PKO_Detail Table(Order_PKOID int, Order_PKO_DetailID int, Cartons int, Delivered_Cartons int, Unit_Qty smallint, Total_Qty int
         , Carton_No nvarchar(10), Carton_Code nvarchar(13)
         , CL float, CW float, CH float
         , PK_MATL_WT float, Meas float
         , Detail_Remark Nvarchar(50) )
         
         Insert @Order_PKO
         Select distinct op.Order_PKOID as Order_PKOID
         , op.PKO_No
         , isnull(Main_Mark,'') as Main_Mark
         , isnull(Side_Mark,'') as Side_Mark
         , isnull(Memo,'') as Memo
         , op.Order_Detail_RefID
         , r.Ref_No
         , od.Order_No
         , '' as Style_No
         , '' as Shoe_Name
         , '' as Color
         , od.Product_No
         , case when op.Shipping_Date is not null then convert(varchar(10),op.Shipping_Date,111) else null end as Shipping_Date
         , op.Destination
         , UPPER(isnull(op.Detail_Remark_Title,'Remark')) as Detail_Remark_Title
         , '' as Ref_No_Title
         , '' as Packing_No_Title   
         , case when op.Data_Update is not null then convert(varchar(20), op.Data_Update,120) else null end as Data_Update
         , isnull(op.Data_Updater,'') as Data_Updater
         From PDSP_Plan_Detail ppd with(NoLock,NoWait)
         Inner Join Order_PKO_Detail opd with(NoLock,NoWait) on ppd.Order_PKO_DetailID = opd.Order_PKO_DetailID
         Inner Join Order_PKO op with(NoLock,NoWait) on opd.Order_PKOID = op.Order_PKOID
         Inner Join Order_Detail od with(NoLock,NoWait) on op.Order_Detail_RefID = od.Order_Detail_RefID 
         Inner Join Order_Detail_Ref r with(NoLock,NoWait) on op.Order_Detail_RefID = r.Order_Detail_RefID
         Where ppd.PDSP_PlanID = @PDSP_PlanID
         Order by op.Order_PKOID;
         
         Update @Order_PKO set Style_No = p.Style_No, Shoe_Name = p.Name, Color = p.Color
         From @Order_PKO t
         Inner Join Product p with(NoLock,NoWait) on t.Product_No = p.Product_No
         
         Update @Order_PKO set Ref_No_Title = UPPER(isnull(o.Ref_No_Title,''))
         , Packing_No_Title = UPPER(isnull(o.Packing_No_Title,''))
         From @Order_PKO t
         Inner Join Orders o with(NoLock,NoWait) on t.Order_No = o.Order_No
         
         Insert @Order_Qty(Order_PKOID, Style_No, Size)
         Select distinct op.Order_PKOID, op.Style_No, oq.Size
         FROM (Select distinct Order_PKOID, Style_No, Order_Detail_RefID From @Order_PKO) op
         Inner Join Order_Detail od with(NoLock,NoWait) on od.Order_Detail_RefID = op.Order_Detail_RefID
         Inner Join Order_Qty oq with(NoLock,NoWait) on od.Order_DetailID = oq.Order_DetailID;
      
         Insert @Size_Name
         Select Size, Size_Name
         From (Select distinct Size From @Order_Qty) t
         Inner Join Product_Size ps with(NoWait, NoLock) on ps.SizeID = t.Size;
            
         --1 PKO Info
         Select *
         From @Order_PKO;
         
         Insert @Order_PKO_Detail(Order_PKOID, Order_PKO_DetailID, Cartons, Delivered_Cartons, Unit_Qty, Total_Qty, Carton_No, Carton_Code, CL, CW, CH, PK_MATL_WT, Meas, Detail_Remark)
         SELECT pd.Order_PKOID, pd.Order_PKO_DetailID, pd.Cartons,  pd.Delivered_Cartons, pd.Unit_Qty, isnull(pd.Cartons,0) * isnull(pd.Unit_Qty,0) as Total_Qty
         , pd.Carton_No, pd.Carton_Code
         , pd.CL, pd.CW, pd.CH
         , isnull(pd.PK_MATL_WT,0) as PK_MATL_WT
         , Round(((pd.CL * pd.CW * pd.CH ) / 1000000),3) * isnull(pd.Cartons,0) as Meas
         , isnull(pd.Detail_Remark,'') as Detail_Remark   
         FROM @Order_PKO op
         Inner Join Order_PKO_Detail pd With(NoLock,NoWait) on pd.Order_PKOID = op.Order_PKOID
         Order By Order_PKOID, Order_PKO_DetailID;        
                  
         Insert @Product_Size_Match
         Select m.Style_No, oq.Size, m.Net_Weight
         From (Select distinct Style_No, Size From @Order_Qty) oq
         Inner Join Product_Size_Match m with(NoLock,NoWait) on oq.Style_No = m.Style_No And m.Shoe_Size = oq.Size
         
         Insert @Order_Size
         Select distinct Order_PKOID, oq.Size 
         , isnull(m.Net_Weight,0) as Net_Weight
         From @Order_Qty oq
         Inner Join @Product_Size_Match m on m.Style_No = oq.Style_No And m.Size = oq.Size;       
               
		--2 PKO Detail
		Select o.Ref_No, o.PKO_No, o.Product_No
		, sum(opd.Cartons) as Cartons
		, sum(opd.Meas) as MEAS
		, Sum(isnull(nt.Net_Weight,0) * isnull(opd.Cartons,0)) as Net_Weight
		, Sum((isnull(nt.Net_Weight,0) + isnull(opd.PK_MATL_WT,0)) * isnull(opd.Cartons,0)) as Gross_Weight
		, Sum(isnull(nt.Qty,0) * isnull(opd.Cartons,0)) as Total_Qty
		from @Order_PKO o
		Inner Join @Order_PKO_Detail opd on o.Order_PKOID = opd.Order_PKOID
		Left Outer Join (
			SELECT pd.Order_PKOID, pd.Order_PKO_DetailID
			, sum(q.Qty) as Qty
			, sum(isnull(os.Net_Weight,0) * isnull(q.Qty , 0)) as Net_Weight
			FROM @Order_PKO_Detail pd 
			Inner Join Order_PKO_Detail_Qty q With(NoLock,NoWait) on pd.Order_PKO_DetailID = q.Order_PKO_DetailID
			Inner Join @Order_Size os on os.Order_PKOID = pd.Order_PKOID And os.Size = q.Size
			Group by pd.Order_PKOID, pd.Order_PKO_DetailID
		) nt on opd.Order_PKOID = nt.Order_PKOID And opd.Order_PKO_DetailID = nt.Order_PKO_DetailID
		Group By o.Ref_No, o.PKO_No, o.Product_No;
      
           `, req.body );
      break;
      case 1:
         strSQL += format(`
         Declare @Order_PKO Table(Order_PKOID int, PKO_No varchar(20), Main_Mark nvarchar(max), Side_Mark nvarchar(max), Memo nvarchar(max), Order_Detail_RefID int
         , Ref_No varchar(20), Order_No varchar(18), Style_No varchar(20), Shoe_Name Nvarchar(50), Color varchar(70), Product_No varchar(25), Shipping_Date varchar(10)
         , Destination nvarchar(30), Detail_Remark_Title nvarchar(20), Ref_No_Title nvarchar(30), Packing_No_Title nvarchar(30)
         , Currency varchar(4), PO_Currency varchar(4)
         );
         Declare @Order_PKO_Detail Table(Order_PKOID int, Order_PKO_DetailID int, Size Real, Qty float );
         Declare @Order_Qty Table(Order_Detail_RefID int, Order_No varchar(20), Ref_No varchar(20), Product_No varchar(25), Size real, Unit_Price float, Factory_Price float, Qty float);
         Declare @PKO_Qty Table(Order_PKOID int, Size real, Qty float);
         Declare @Total_Qty real, @Total_Amount_O real, @Total_Amount_F real;
                  
         Insert @Order_PKO
         Select distinct op.Order_PKOID as Order_PKOID
         , op.PKO_No
         , isnull(Main_Mark,'') as Main_Mark
         , isnull(Side_Mark,'') as Side_Mark
         , isnull(Memo,'') as Memo
         , op.Order_Detail_RefID
         , r.Ref_No
         , od.Order_No
         , p.Style_No as Style_No
         , p.Name as Shoe_Name
         , p.Color as Color
         , od.Product_No
         , case when op.Shipping_Date is not null then convert(varchar(10),op.Shipping_Date,111) else null end as Shipping_Date
         , op.Destination
         , UPPER(isnull(op.Detail_Remark_Title,'Remark')) as Detail_Remark_Title
         , UPPER(isnull(o.Ref_No_Title,'')) as Ref_No_Title
         , UPPER(isnull(o.Packing_No_Title,'')) as Packing_No_Title
         , isnull(o.Currency,'USD') as Currency
         , isnull(o.PO_Currency,'USD') as PO_Currency
         From Order_PKO op with(NoLock,NoWait)
         Inner Join Order_Detail od with(NoLock,NoWait) on op.Order_Detail_RefID = od.Order_Detail_RefID 
         Inner Join Order_Detail_Ref r with(NoLock,NoWait) on op.Order_Detail_RefID = r.Order_Detail_RefID   
         Inner Join Product p with(NoLock,NoWait) on od.Product_No = p.Product_No
         Inner Join Orders o with(NoLock,NoWait) on od.Order_No = o.Order_No
         Where op.PDSP_PlanID = @PDSP_PlanID
         Order by Order_PKOID;
         
         Insert @Order_Qty(Order_Detail_RefID, Order_No, Ref_No, Product_No, Size, Unit_Price, Factory_Price, Qty)
         Select distinct od.Order_Detail_RefID, od.Order_No, op.Ref_No, od.Product_No, oq.Size, od.Unit_Price, od.Factory_Price, oq.Qty
         FROM (Select distinct Order_Detail_RefID, Ref_No, Order_Detail_RefID From @Order_PKO) op
         Inner Join Order_Detail od with(NoLock,NoWait) on od.Order_Detail_RefID = op.Order_Detail_RefID
         Inner Join Order_Qty oq with(NoLock,NoWait) on od.Order_DetailID = oq.Order_DetailID;

         Insert @PKO_Qty
         Select tmp.Order_PKOID, pdq.Size, sum(isnull(pdq.Qty,0) * isnull(pd.Cartons,0)) as Qty
         From (Select distinct Order_PKOID From @Order_PKO) tmp
         Inner Join Order_PKO_Detail pd with(NoLock,NoWait) on tmp.Order_PKOID = pd.Order_PKOID
         Inner Join Order_PKO_Detail_Qty pdq with(NoLock,NoWait) on pd.Order_PKO_DetailID = pdq.Order_PKO_DetailID
         Group by tmp.Order_PKOID, pdq.Size
         Order by Order_PKOID, Size;       
         
         --1 PKO_Detail
         Select op.*
      , (Select rtrim(ps.Size_Name) From Product_Size ps with(NoLock,NoWait) Where ps.SizeID = tmp.Min_Size) + '~' 
      + (Select rtrim(ps.Size_Name) From Product_Size ps with(NoLock,NoWait) Where ps.SizeID = tmp.Max_Size) as Size_Range         
       , isnull(tmp.Unit_Price,0) as Unit_Price
		 , isnull(tmp.Factory_Price,0) as Factory_Price
		 , isnull(tmp.Qty,0) as Qty
		 , isnull(tmp.Amount_O,0) as Amount_O
		 , isnull(tmp.Amount_F,0) as Amount_F
         From @Order_PKO op
		 Left Outer Join (        
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
         Group by op.Order_PKOID, oq.Unit_Price, oq.Factory_Price) tmp on op.Order_PKOID = tmp.Order_PKOID;
         
         --2 Total Qty And Amount
         Select @Total_Qty = Sum(pq.Qty), @Total_Amount_O = Sum(pq.Qty * oq.Unit_Price), @Total_Amount_F = Sum(pq.Qty * oq.Factory_Price)
         from @Order_PKO op
         Inner Join @PKO_Qty pq on op.Order_PKOID = pq.Order_PKOID
         Inner Join @Order_Qty oq on oq.Order_Detail_RefID = op.Order_Detail_RefID And pq.Size = oq.Size
         
         Select @Total_Qty as Total_Qty
         , @Total_Amount_O as Total_Amount_O
         , [dbo].[RecurseNumber](@Total_Amount_O) as Total_Amount_Eng_O
         , @Total_Amount_F as Total_Amount_F
         , [dbo].[RecurseNumber](@Total_Amount_F) as Total_Amount_Eng_F; 
         `, req.body );
      break;
      case 2:
         strSQL += format(`
         Declare @Pln_Detail table(Order_PKO_DetailID int, Cartons int)
         Declare @PKO_Detail table(RecNo int identity(1,1),PDSP_Plan_DetailID int, Order_PKOID int, Produce_No varchar(20), PKO_No varchar(20), Order_No varchar(18), Product_No varchar(25)
         , Order_PKO_DetailID int, Unit_Qty float, Carton_No varchar(20), Cartons int, Meas float
         , Plan_Carton int
         , Plan_Qty float
         , Plan_Meas float, Produce_LineID varchar(20)
         , Ref_No varchar(20), Destination varchar(30), Shipping_Date varchar(10), [Week] int, PK_MATL_WT float, Ref_No_Title nvarchar(20)
         , Packing_No_Title nvarchar(20)
         , Detail_Remark_Title nvarchar(20))
           
         Insert @PKO_Detail(PDSP_Plan_DetailID, Order_PKOID, Produce_No, PKO_No, Order_No, Product_No, Order_PKO_DetailID
            , Unit_Qty
            , Carton_No
            , Cartons
            , Meas
            , Plan_Carton
            , Plan_Qty
            , Plan_Meas
            , Produce_LineID
            , Ref_No
            , Destination
            , Shipping_Date
            , [Week]
            , PK_MATL_WT
            , Ref_No_Title
            , Packing_No_Title
            , Detail_Remark_Title )
         Select o.PDSP_Plan_DetailID, op.Order_PKOID, od.Produce_No, op.PKO_No, od.Order_No, od.Product_No, opd.Order_PKO_DetailID
         , opd.Unit_Qty
         , opd.Carton_No
         , opd.Cartons
         , Round(((opd.CL * opd.CW * opd.CH ) / 1000000),3) * isnull(opd.Cartons,0) as Meas
         , o.Cartons as Plan_Carton
         , isnull(opd.Unit_Qty,0) * isnull(o.Cartons,0) as Plan_Qty
         , Round(((opd.CL * opd.CW * opd.CH ) / 1000000),3) * isnull(o.Cartons,0) as Plan_Meas
         , p.Produce_LineID
         , odf.Ref_No
         , op.Destination
         , case when op.Shipping_Date is null then '' else convert(varchar(10),op.Shipping_Date, 111)  end as Shipping_Date
         , DATEPART(week, op.Shipping_Date) as [Week]
         , isnull(opd.PK_MATL_WT,0) as PK_MATL_WT
         , os.Ref_No_Title
         , os.Packing_No_Title
         , op.Detail_Remark_Title
         From PDSP_Plan_Detail o with(NoLock,NoWait)
         Inner Join Order_PKO_Detail opd with(NoLock,NoWait) on opd.Order_PKO_DetailID = o.Order_PKO_DetailID
         Inner Join Order_PKO op with(NoLock,NoWait) on op.Order_PKOID = opd.Order_PKOID
         Inner Join Order_Detail_Ref odf with(NoLock,NoWait) on op.Order_Detail_RefID = odf.Order_Detail_RefID
         Inner Join Order_Detail od with(NoLock,NoWait) on od.Order_Detail_RefID = odf.Order_Detail_RefID
         Inner Join Orders os with(NoLock,NoWait) on od.Order_No = os.Order_No
         Inner Join Produce p with(NoLock,NoWait) on p.Produce_No = od.Produce_No
         Where o.PDSP_PlanID = @PDSP_PlanID
         Order by od.Produce_No, od.Order_No, op.PKO_No;
      
         Insert @Pln_Detail
         Select pd.Order_PKO_DetailID, sum(Cartons) as Cartons
         From dbo.PDSP_Plan_Detail pd with(NoLock,NoWait)
         Inner Join (Select distinct Order_PKO_DetailID From @PKO_Detail ) tmp on tmp.Order_PKO_DetailID = pd.Order_PKO_DetailID
         Group by pd.Order_PKO_DetailID;
            
         Select d.RecNo, cast(0 as bit) as flag, d.PDSP_Plan_DetailID, d.Order_PKOID, d.Produce_No, d.PKO_No, d.Order_No, d.Product_No, d.Order_PKO_DetailID
         , isnull(d.Unit_Qty * d.Cartons,0) as PKO_Qty
         , isnull(d.Cartons,0) as PKO_Cartons
         , d.Carton_No
         , d.Cartons - isnull(pd.Cartons,0) as Balance_Cartons
         , isnull(d.Unit_Qty * (d.Cartons - isnull(pd.Cartons,0)),0) as Balance_Qty
         , isnull(pd.Cartons,0) as Shiped_Cartons
         , isnull(d.Unit_Qty * pd.Cartons,0) as Shiped_Qty
         , d.Meas
         , d.Plan_Carton
         , d.Plan_Qty
         , d.Plan_Meas
         , d.Produce_LineID
         , d.Ref_No
         , d.Destination
         , d.Shipping_Date
         , d.[Week]
         , d.[PK_MATL_WT]
         , d.Ref_No_Title
         , d.Packing_No_Title
         , d.Detail_Remark_Title          
         , isnull(p.Color,'') + ' ' + isnull(p.Color_Code,'') as Color
         , p.Name as Shoe_Name
         From @PKO_Detail d
         Inner Join Product p with(NoWait, NoLock) on d.Product_No = p.Product_No
         Left Outer Join @Pln_Detail pd on d.Order_PKO_DetailID = pd.Order_PKO_DetailID ;
         `, req.body );
      break;
   }

   //console.log(strSQL);
   db.sql(req.SiteDB, strSQL)
      .then((result) => { 
         var DataSet = {
            G_Carton_NW_TTL: 0,
            G_Carton_GW_TTL: 0,
            G_Total_Qty: req.body.Mode == 1 ? Math.round(result.recordsets[2][0].Total_Qty*1000)/1000 : 0,
            G_Total_Cartons: 0,
            G_Total_Meas: 0,
            PKO_Info: req.body.Mode == 0 ? result.recordsets[2] : [],            
            G_Total_Amount: req.body.Mode == 1 ? Math.round(result.recordsets[2][0].Total_Amount_F*1000)/1000 : 0,
            G_Total_Amount_Eng: req.body.Mode == 1 ? result.recordsets[2][0].Total_Amount_Eng_F : 0,
            Shipment_PLan_Info: result.recordsets[0] ,
         };

         switch(req.body.Mode) {
            case 0:
               DataSet.PKO_Info.forEach((item)=>{
                  item.Net_Weight = Math.round((item.Net_Weight)*10000)/10000;
                  item.Gross_Weight = Math.round((item.Gross_Weight)*10000)/10000;
                  item.Total_Qty = Math.round((item.Total_Qty)*10000)/10000;
                  item.Cartons = Math.round((item.Cartons)*10000)/10000;
                  item.MEAS = Math.round((item.MEAS)*10000)/10000;

                  DataSet.G_Carton_NW_TTL += item.Net_Weight;
                  DataSet.G_Carton_GW_TTL += item.Gross_Weight;
                  DataSet.G_Total_Qty += item.Total_Qty;
                  DataSet.G_Total_Cartons += item.Cartons;
                  DataSet.G_Total_Meas += item.MEAS;
               })
               DataSet.G_Carton_NW_TTL = Math.round((DataSet.G_Carton_NW_TTL)*10000)/10000;
               DataSet.G_Carton_GW_TTL = Math.round((DataSet.G_Carton_GW_TTL)*10000)/10000;
               DataSet.G_Total_Qty = Math.round((DataSet.G_Total_Qty)*10000)/10000;
               DataSet.G_Total_Cartons = Math.round((DataSet.G_Total_Cartons)*10000)/10000;
               DataSet.G_Total_Meas = Math.round((DataSet.G_Total_Meas)*10000)/10000;
            break;
            case 1:
               DataSet.PKO_Info = [...result.recordsets[1].reduce((r, e) => {
                  let k = `${e.Ref_No}|${e.Product_No}|${e.Order_No}|${e.Ref_No_Title}|${e.Packing_No_Title}|${e.Detail_Remark_Title}`;
                  if (!r.has(k)) {
                    // console.log(r)
                    r.set(k, { Ref_No: e.Ref_No,                     
                     Color: e.Color,
                     Shoe_Name: e.Shoe_Name,
                     Product_No: e.Product_No,
                     Order_No: e.Order_No,
                     Ref_No_Title: e.Ref_No_Title,
                     Packing_No_Title: e.Packing_No_Title,
                     Detail_Remark_Title: e.Detail_Remark_Title,
                     PKO_Detail: []                   
                    })
                  } else {
                  }
                  return r;
                }, new Map).values()]
               //console.log(result.recordsets[1])
               DataSet.PKO_Info.forEach((item)=>{                  
                  var PKO_Detail = result.recordsets[1].filter((data)=>(data.Ref_No == item.Ref_No && data.Product_No == item.Product_No && data.Order_No == item.Order_No
                     && data.Ref_No_Title == item.Ref_No_Title && data.Packing_No_Title == item.Packing_No_Title && data.Detail_Remark_Title == item.Detail_Remark_Title));
                  PKO_Detail.forEach((obj)=>{ 
                     item.PKO_Detail.push({
                        PKO_No: obj.PKO_No,
                        Size_Range: obj.Size_Range,
                        Unit_Price: Math.round(obj.Unit_Price * 10000)/10000,
                        Factory_Price: Math.round(obj.Factory_Price * 10000)/10000,
                        Qty: obj.Qty,
                        Amount_O: Math.round(obj.Amount_O * 10000)/10000,
                        Amount_F: Math.round(obj.Amount_F * 10000)/10000,
                        Shipping_Date: obj.Shipping_Date,
                     })
                  })
                  
               })
            break;
            case 2:
               DataSet.PKO_Info = [...result.recordsets[1].reduce((r, e) => {
                  let k = `${e.Order_No}`;
                  if (!r.has(k)) {
                    // console.log(r)
                    r.set(k, { 
                     Order_No: e.Order_No,
                     Ref_No_Title: e.Ref_No_Title,
                     Packing_No_Title: e.Packing_No_Title,
                     Detail_Remark_Title: e.Detail_Remark_Title,
                     Sub_Total_Qty: e.Plan_Qty,
                     Sub_Total_Cartons: e.Plan_Carton,
                     Sub_Total_Meas: e.Plan_Meas,
                     PKO_Detail: []
                    })
                  } else {
                     r.get(k).Sub_Total_Qty += e.Plan_Qty;
                     r.get(k).Sub_Total_Cartons += e.Plan_Carton;
                     r.get(k).Sub_Total_Meas += e.Plan_Meas;
                  }
                  return r;
                }, new Map).values()]
               //console.log(result.recordsets[1])
               DataSet.PKO_Info.forEach((item)=>{                  
                  item.PKO_Detail = result.recordsets[1].filter((data)=>(data.Order_No == item.Order_No));
                  item.PKO_Detail.forEach((obj)=>{ 
                     DataSet.G_Total_Qty += obj.Plan_Qty;
                     DataSet.G_Total_Cartons += obj.Plan_Carton;
                     DataSet.G_Total_Meas += obj.Plan_Meas;
                  })
                  item.Sub_Total_Qty = Math.round(item.Sub_Total_Qty * 10000)/10000;
                  item.Sub_Total_Cartons = Math.round(item.Sub_Total_Cartons * 10000)/10000;
                  item.Sub_Total_Meas = Math.round(item.Sub_Total_Meas * 10000)/10000;
               })
               DataSet.G_Total_Qty = Math.round(DataSet.G_Total_Qty * 10000)/10000;
               DataSet.G_Total_Cartons = Math.round(DataSet.G_Total_Cartons * 10000)/10000;
               DataSet.G_Total_Meas = Math.round(DataSet.G_Total_Meas * 10000)/10000;
            break;
         }
         
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