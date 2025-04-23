var express = require('express');
var router = express.Router();
var WebServer = require('../../config/WebServer');
const format = require('string-format');
var moment = require('moment');
var db = require('../../config/DB_Connect');
const cloneDeep = require('lodash/cloneDeep');

/* Mark-Wang API Begin */

//Define Material_Group's Group_Symbol Match color for Schedule_List and Production_List 
//依Complete_Rate
let Urgent_Light_Info = [{min:0,max:25,color:'red'}
,{min:25,max:50,color:'goldenrod'}
,{min:50,max:75,color:'green'}
,{min:75,max:100,color:'blue'}];

//依Group_Symbol
let Type_Light_Info = [{Group_Symbol:'U',color:'#8CC036', bgColor: '#DEECC8'}
,{Group_Symbol:'B',color:'#23C483', bgColor: '#AAF5D7'}
,{Group_Symbol:'P',color:'#31BEDC', bgColor: '#C0E6EF'}
,{Group_Symbol:'O',color:'#a0d0dc'}
,{Group_Symbol:'Tech',color:'#ebb744', bgColor: '#FFE3BB'}
,{Group_Symbol:'Sample',color:'#c577ed', bgColor: '#D7BEDB'}
,{Group_Symbol:'Cutting',color:'#ff9300'}
,{Group_Symbol:'Stitching',color:'#ff9300'}
,{Group_Symbol:'Lasting',color:'#ff9300'}
,{Group_Symbol:'Packing',color:'#ff9300'}];


//Get Production_Brand Info
router.post('/Production_Brand',  function (req, res, next) {   
  console.log("Call Production_Brand Api:");
  
  var strSQL = format(`  
  SELECT b.BrandID, o.Brand
  FROM Produce p with(NoLock,NoWait)
  INNER JOIN Order_Detail od with(NoLock,NoWait) ON p.Produce_No = od.Produce_No
  INNER JOIN Orders o with(NoLock,NoWait) ON od.Order_No = o.Order_No
  INNER JOIN Brand b with(NoLock,NoWait) ON o.Brand = b.Brand
  WHERE (ABS(isnull(p.Shipmented,0)) <> 1)
  AND (o.Purpose <> 'Forecast')
  Group by b.BrandID, o.Brand
  Order By Brand;
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

//Get Production_Factory Info
router.post('/Production_Factory',  function (req, res, next) {   
  console.log("Call Production_Factory Api:");
  
  var strSQL = format(`  
  SELECT p.Factory_SubID
  FROM Produce p with(NoLock,NoWait)
  INNER JOIN Order_Detail od with(NoLock,NoWait) ON p.Produce_No = od.Produce_No
  INNER JOIN Orders o with(NoLock,NoWait) ON od.Order_No = o.Order_No
  WHERE (ABS(isnull(p.Shipmented,0)) <> 1) 
  AND (o.Purpose <> 'Forecast')
  And isnull(p.Factory_SubID,'') <> ''
  Group by p.Factory_SubID
  Order By p.Factory_SubID;
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

//Get Plan_Month Info
router.post('/Plan_Month',  function (req, res, next) {   
  console.log("Call Plan_Month Api:");
  
  var strSQL = format(`  
  SELECT p.Plan_Month
  FROM Produce p with(NoLock,NoWait)
  INNER JOIN Order_Detail od with(NoLock,NoWait) ON p.Produce_No = od.Produce_No
  INNER JOIN Orders o with(NoLock,NoWait) ON od.Order_No = o.Order_No
  WHERE (ABS(isnull(p.Shipmented,0)) <> 1) 
  And (o.Purpose = 'Official' or o.Purpose = 'Sample')
  And p.Plan_Month <> ''
  And p.Plan_Month >= convert(varchar(7),DateAdd(year,-1, GetDate()),111 )
  Group by p.Plan_Month
  Order By convert(date,p.Plan_Month+'/01');
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

// 取得 Produce_Info 資料
router.post('/Produce_Info', function (req, res, next) {
  console.log("Call Produce Info Api in Production");

  req.body.Mode = req.body.Mode ? req.body.Mode : 0;
  req.body.Produce_No = req.body.Produce_No ? `N'${req.body.Produce_No.trim().substring(0,20).replace(/'/g, "''")}'` : ''; 

  //Mode == 0 Get Produce and Order Data
  //Mode == 1 Get Produce Data
  //Mode == 2 Get Order Data
  var strSQL = format(`
Declare @Mode int = {Mode}, @Produce_Purpose varchar(15); 
Select @Produce_Purpose = isnull(Produce_Purpose,'Order') From Produce p with(NoLock,NoWait) Where p.Produce_No = {Produce_No};

if(@Mode = 0 or @Mode = 1)
Begin
    SELECT distinct p.Produce_No, isnull(Produce_Purpose,'Order') as Produce_Purpose
    , case when isnull(Produce_Purpose,'Order') = 'Order' then 1 else 0 end as Produce_Purpose_Flag
    , p.Payment_No, p.Product_No, p.Purchase_Project_No
    , p.FactoryID, p.Factory_SubID, p.Produce_LineID, p.Material_Update_User
    , ABS(isnull(p.Exported, 0)) as Exported
    , Convert(varchar(10),p.Pattern_D,111) AS Pattern_D
    , Convert(varchar(10),p.Upper_D,111) AS Upper_D, Convert(varchar(10),p.Upper_A,111) AS Upper_A
    , Convert(varchar(10),p.Buttom_D,111) AS Buttom_D, Convert(varchar(10),p.Buttom_A,111) AS Buttom_A
    , Convert(varchar(10),p.Cutting_S,111) AS Cutting_S, Convert(varchar(10),p.Cutting_F,111) AS Cutting_F
    , Convert(varchar(10),p.Stitching_S,111) AS Stitching_S, Convert(varchar(10),p.Stitching_F,111) AS Stitching_F
    , Convert(varchar(10),p.Lasting_S,111) AS Lasting_S, Convert(varchar(10),p.Lasting_F,111) AS Lasting_F
    , pc.Photo_Month, pc.Sketch_Month, pc.Style_No, isnull(p.Packing_Attention, '') AS Packing_Attention
    , isnull((Select top 1 Customer_Product_No From Order_Detail Where dbo.Order_Detail.Produce_No = {Produce_No} Order By Order_DetailID DESC), '') AS Customer_Product_No
    , ABS(cast(p.UnProduce as int)) as UnProduce
    , Convert(varchar(20),p.Not_Producing_Date,111) AS Not_Producing_Date
    , ABS(cast(p.First_Produce as int)) as First_Produce
    , ABS(cast(p.Re_Order as int)) as Re_Order
    , ABS(cast(p.Packing_OK as int)) as Packing_OK
    , ABS(cast(p.Shipmented as int)) as Shipmented
    , (Select Top 1 p1.Produce_No From Produce p1 Where p1.Product_No = p.Product_No And ABS(cast(p1.First_Produce as int)) = 1) as First_Produce_No
    , Isnull(p.PP_Combine_Qty,0) AS PP_Combine_Qty
    , Convert(varchar(20),p.PP_Combine_Date,111) AS PP_Combine_Date
  FROM dbo.Produce p WITH (NOLOCK)
  LEFT OUTER JOIN dbo.Product pc WITH (NOLOCK) ON p.Product_No = pc.Product_No  
  Where p.Produce_No = {Produce_No}
End
if(@Mode = 0 or @Mode = 2)
Begin
  if(@Produce_Purpose = 'Order')
  Begin
    Declare @TmpTable table (Order_DetailID int, Order_No varchar(18), Product_No varchar(25), Qty float, Destination varchar(30), Orig_Shipping_Date varchar(10), Est_Shipping_Date varchar(10), PO_No varchar(10));
    insert @TmpTable
    SELECT od.Order_DetailID, od.Order_No, od.Product_No, od.Qty, od.Destination
      , Convert(varchar(10),od.Orig_Shipping_Date,111) as Orig_Shipping_Date
      , Convert(varchar(10),od.Est_Shipping_Date,111) as Est_Shipping_Date
      , od.PO_No
    FROM dbo.Order_Detail od WITH (NOLOCK)     
    Where od.Produce_No = {Produce_No};

    Select 0 as SortID, Order_DetailID, Order_No, Product_No, Format(isnull(Qty,0),'N0') as Qty, Destination, Orig_Shipping_Date, Est_Shipping_Date, PO_No From @TmpTable
    union
    Select 1 as SortID, 0 as Order_DetailID, '' as Order_No, 'Total:' as Product_No, Format(isnull(sum(Qty),0),'N0') as Qty, '' as Destination, '' as Orig_Shipping_Date, '' as Est_Shipping_Date, '' as PO_No From @TmpTable
  End
  else
  Begin
    Declare @TmpTable1 table (Sample_Produce_DetailID int, ProduceID varchar(18), Product_No varchar(25), Qty float);

    insert @TmpTable1
    SELECT od.Sample_Produce_DetailID, od.ProduceID, od.Product_No, isnull(od.Qty,0) + isnull(od.Agent_Qty,0) + isnull(od.Keep_Qty,0) as Qty
    FROM dbo.Sample_Detail od WITH (NOLOCK)     
    Where od.Produce_No = {Produce_No};

    Select 0 as SortID, Sample_Produce_DetailID, ProduceID, Product_No, Format(isnull(Qty,0),'N0') as Qty From @TmpTable1
    union
    Select 1 as SortID, 0 as Sample_Produce_DetailID, '' as ProduceID, 'Total:' as Product_No, Format(isnull(sum(Qty),0),'N0') as Qty From @TmpTable1
  End
End

`,req.body);

  //console.log(strSQL)
  db.sql(req.SiteDB, strSQL)
    .then((result) => {
      // console.log(result)
      var DataSet = {
        Produce_Info: (req.body.Mode == 0 || req.body.Mode == 1) ? result.recordsets[0] : []
        , Order_Info: (req.body.Mode == 0) ? result.recordsets[1] : (req.body.Mode == 2 ? result.recordsets[0] : [])        
     };

      res.send(DataSet);
    }).catch((err) => {
      console.log(err);
      res.status(500).send(err);
    })
});

// 取得 Detail_Add_List 資料
router.post('/Detail_Add_List', function (req, res, next) {
  console.log("Call Detail_Add_List Api in Production");

  req.body.Produce_No = req.body.Produce_No ? `N'${req.body.Produce_No.trim().substring(0,20).replace(/'/g, "''")}'` : ''; 

  var strSQL = format(`
  Declare @Produce_Purpose varchar(15); 
  Select @Produce_Purpose = isnull(Produce_Purpose,'Order') From Produce p with(NoLock,NoWait) Where p.Produce_No = {Produce_No};
  if(@Produce_Purpose = 'Order')
  Begin
    SELECT 0 as flag, od.Order_DetailID, od.Order_No, od.Product_No, od.Qty, od.Destination,
      Convert(varchar(10),od.Orig_Shipping_Date,111) as Orig_Shipping_Date, 
      Convert(varchar(10),od.Est_Shipping_Date,111) as Est_Shipping_Date
    FROM dbo.Order_Detail od with(NOLOCK) 
    INNER JOIN dbo.Produce p with(NoLock, NoWait) ON od.Product_No = p.Product_No and p.Produce_No = {Produce_No}
    Where isnull(od.Produce_No,'') = '' and od.Orig_Shipping_Date is NOT Null;
  End
  Else
  Begin
    SELECT 0 as flag, od.Sample_Produce_DetailID, od.ProduceID, od.Product_No, isnull(od.Qty,0) + isnull(od.Agent_Qty,0) + isnull(od.Keep_Qty,0) as Qty    
    FROM dbo.Sample_Detail od with(NOLOCK) 
    INNER JOIN dbo.Produce p with(NoLock, NoWait) ON od.Product_No = p.Product_No and p.Produce_No = {Produce_No}
    Inner Join dbo.Samples s with(NoLock, NoWait) ON od.ProduceID = s.ProduceID
    Where isnull(od.Produce_No,'') = '' 
    and DateAdd(Month, -6, GetDate()) <= s.Issue_Date;
  End
`,req.body);

  //console.log(strSQL)
  db.sql(req.SiteDB, strSQL)
    .then((result) => {
      // console.log(result)
      var DataSet = result.recordsets[0];
      res.send(DataSet);
    }).catch((err) => {
      console.log(err);
      res.status(500).send(err);
    })
});

//Produce Maintain
router.post('/Produce_Maintain',  function (req, res, next) {
  console.log("Call Produce Maintain Api:",req.body);

  // req.body.Mode === 0 表示新增
  // req.body.Mode === 1 表示修改
  // req.body.Mode === 2 表示刪除
  // req.body.Mode === 3 表示 Fill UP Value to Produce
  req.body.Produce_No = req.body.Produce_No ? `N'${req.body.Produce_No.trim().substring(0,20).replace(/'/g, "''")}'` : `''`; 
  req.body.Order_DetailID = req.body.Order_DetailID ? req.body.Order_DetailID : null;
  req.body.ProduceID = req.body.ProduceID ? req.body.ProduceID : null;
  req.body.Sample_Produce_DetailID = req.body.Sample_Produce_DetailID ? req.body.Sample_Produce_DetailID : null;
  strSQL = format(` Declare @ROWCOUNT int = 0, @Produce_Purpose varchar(15); 
  Select @Produce_Purpose = isnull(Produce_Purpose,'Order') From Produce p with(NoLock,NoWait) Where p.Produce_No = {Produce_No}; `, req.body);

  switch(req.body.Mode){
    case 0:
    case 2:      
        strSQL += format(`          
          if(@Produce_Purpose = 'Order')
          Begin
            Update [dbo].[Order_Detail] Set Produce_No = ${req.body.Mode == 0 ? '{Produce_No}': 'null' }
            ${req.body.Mode == 0 ? `, Factory_ID = '{FactoryID}'`: '' }
            where Order_DetailID = {Order_DetailID}; 
            Set @ROWCOUNT = @@ROWCOUNT;

            if(@ROWCOUNT > 0)
            Begin
              Declare @Date varchar(10) = (Select Min(convert(varchar(07), od.Orig_Shipping_Date, 111)) From Order_Detail od with(NoLock,NoWait) Where od.Produce_No = {Produce_No} )
              Update Produce set Plan_Month = case when isnull( @Date ,'') = '' then Plan_Month else @Date end
              where Produce_No = {Produce_No}
              and isnull(Est_Produce_Date,'') = '';
            End
          End
          Else
          Begin
            Update [dbo].[Sample_Detail] Set Produce_No = ${req.body.Mode == 0 ? '{Produce_No}': 'null' }          
            where Sample_Produce_DetailID = {Sample_Produce_DetailID}; 
            Set @ROWCOUNT = @@ROWCOUNT;
          End
          
          `, req.body);
    break;
    case 1:
        switch(req.body.Name) {
          case 'Factory_SubID':
              req.body.Value = req.body.Value ?  `N'${req.body.Value.trim().substring(0,15).replace(/'/g, "''")}'` : `''`; 
              req.body.FactoryID = req.body.FactoryID ?  `N'${req.body.FactoryID.trim().substring(0,15).replace(/'/g, "''")}'` : `''`; 
          break;
          case 'Cutting_LineID':
          case 'Stitching_LineID':
          case 'Produce_LineID':
              req.body.Value = req.body.Value ?  `N'${req.body.Value.trim().substring(0,15).replace(/'/g, "''")}'` : `''`; 
          break;
          case 'UnProduce':
          case 'First_Produce':
          case 'Re_Order':
          case 'Packing_OK':
          case 'Shipmented':
          case 'Queue_No':
              req.body.Value = req.body.Value ?  req.body.Value : 0; 
          break;
          default:
              req.body.Value = req.body.Value ?  `N'${req.body.Value.trim().replace(/'/g, "''")}'` : `null`; 
              req.body.autoValue = req.body.autoValue ?  `N'${req.body.autoValue.trim().replace(/'/g, "''")}'` : ``; 
          break;
        }

        strSQL += format(`
            ${ req.body.Name === 'First_Produce' && req.body.Value == 1 ? `
              Update Produce set First_Produce = 0
              Where Product_No = (Select Product_No From Produce Where Produce_No = {Produce_No})
              And ABS(cast(First_Produce as int)) = 1;
            ` : "" }
            Update [dbo].[Produce] Set [{Name}] = {Value} 
            ${ req.body.Name === 'Factory_SubID' ? `, FactoryID = {FactoryID}, Produce_LineID = null ` : "" } 
            ${ req.body.Name === 'First_Produce' && req.body.Value == 1 ? `, Re_Order = 0` : "" } 
            ${ req.body.Name === 'Re_Order' && req.body.Value == 1 ? `, First_Produce = 0` : "" }
            where Produce_No = {Produce_No}; 
            Set @ROWCOUNT = @@ROWCOUNT; 

            if('${ req.body.Name}' = 'Factory_SubID' And @Produce_Purpose = 'Order' And @ROWCOUNT > 0 )
            begin
              Update Order_Detail set Factory_ID = {Value}
              where Produce_No = {Produce_No}; 
            End

            if('${req.body.Name}' = 'Est_Produce_Date' And {Value} IS NOT NULL And @ROWCOUNT > 0 )
            begin
              Update Produce set Plan_Month = Convert(varchar(07), {Value}, 111), Queue_No = Cast(Cast(Convert(varchar(10), {Value}, 111) + ' ' + Convert(varchar(10), GETDATE(), 108) as DATETIME) as float)
              where Produce_No = {Produce_No}; 
            End
            
            if('${req.body.Name}' = 'UnProduce' And @ROWCOUNT > 0)
            begin
              Update Produce set Plan_Month = ${req.body.Value == 1 ? `NULL` : `Convert(varchar(7), Cast(Queue_No as DATETIME), 111)`}
              , Not_Producing_Date = ${req.body.Value == 0 ? `NULL` : `GetDate()`}
              where Produce_No = {Produce_No}; 
            End

            if('${req.body.Name}' = 'Produce_LineID' And @ROWCOUNT > 0)
            begin
              Update Produce set Cutting_LineID = {Value}
              where Produce_No = {Produce_No} AND Cutting_Qty = 0; 
              Update Produce set Stitching_LineID = {Value}
              where Produce_No = {Produce_No} AND Stitching_Qty = 0; 
              Update Produce set Lasting_LineID = {Value}
              where Produce_No = {Produce_No} AND Lasting_Qty = 0; 
            End
        `, req.body);

        if (req.body.autoValue) {
          strSQL += format(`
              Update [dbo].[Produce] Set [{autoName}] = {autoValue} 
              where Produce_No = {Produce_No}; 
              Set @ROWCOUNT = @@ROWCOUNT; 
          `, req.body);
        }
    break;
    case 3:
      strSQL += format(`
      DECLARE @tmp TABLE ({Name} varchar(10), Produce_No varchar(20), Schedule_Updater varchar(20), Schedule_Update datetime)
      insert into @tmp values `, req.body)
      let updateArray = req.body.updateArray
      updateArray.forEach((element, key) => {
        if (element.Est_Produce_Date) {
          strSQL += (`('${moment(element.Est_Produce_Date).add(req.body.Value, 'd').format('YYYY/MM/DD')}', '${element.Produce_No}', '${req.UserID}', GetDate()),`)
        }
        if (Object.is(updateArray.length - 1, key)) {
          strSQL = strSQL.substring(0, strSQL.length - 1)
          strSQL += `; \r\n`
        }
      });
      strSQL += format(`
      Update Produce SET [{Name}] = tmp.{Name}, Schedule_Updater = tmp.Schedule_Updater, Schedule_Update = tmp.Schedule_Update From Produce as p
      Inner Join (Select {Name}, Schedule_Updater, Schedule_Update, Produce_No from @tmp) AS tmp ON tmp.Produce_No = p.Produce_No;
      
      Set @ROWCOUNT = @@ROWCOUNT;
      Select @ROWCOUNT as Flag;
      `, req.body);
      break;
  }
  switch(req.body.Name) {
    case 'Cutting_LineID':
    case 'Stitching_LineID':
    case 'Produce_LineID':
    case 'SP_Sample':
    case 'Remark':
    case 'Upper_D':
    case 'Upper_A':
    case 'Buttom_D':
    case 'Buttom_A':
    case 'Cutting_S':
    case 'Cutting_F':
    case 'Stitching_S':
    case 'Stitching_F':
    case 'Queue_No':
    case 'Plan_Month':
    case 'Est_Produce_Date':
    case 'Material_Require_Date':
    case 'PP_Sample_Require_Date':
      if (req.body.Mode !== 3) {
        strSQL += format(` 
        Select @ROWCOUNT as Flag; 
        if(@ROWCOUNT > 0) 
        Begin
          Update [dbo].[Produce] Set Schedule_Updater = N'${req.UserID}'
          , Schedule_Update = GetDate()
          where Produce_No = {Produce_No};
        End
        `, req.body);
      }
    break;
    case 'UnProduce':
    case 'First_Produce':
    case 'Re_Order':
    case 'Packing_OK':
    case 'Shipmented':
    case 'Factory_SubID':
      strSQL += format(` 
      Select @ROWCOUNT as Flag; 
      if(@ROWCOUNT > 0) 
      Begin
        Update [dbo].[Produce] Set Data_Updater = N'${req.UserID}'
        , Data_Update = GetDate()
        where Produce_No = {Produce_No};
      End
      `, req.body);
    break;
    default:
      strSQL += format(` 
      Select @ROWCOUNT as Flag; 
      if(@ROWCOUNT > 0) 
      Begin
        Update [dbo].[Produce] Set Data_Updater = N'${req.UserID}'
        , Data_Update = GetDate()
        ${ req.body.Mode == 1 ? "" : `
        , Order_Qty = isnull( case when @Produce_Purpose = 'Order' then 
        (Select sum(Qty) From Order_Detail od with(NoLock, NoWait) Where od.Produce_No = {Produce_No})
        else
        (Select sum(isnull(Qty,0)+isnull(Agent_Qty,0)+isnull(Keep_Qty,0)) From Sample_Detail sd with(NoLock, NoWait) Where sd.Produce_No = {Produce_No})
        End,0 )`} 
        where Produce_No = {Produce_No}; 
    
        Declare @DeleteFlag int
        if(@Produce_Purpose = 'Order')
        Begin
          Set @DeleteFlag = (SELECT count(*) FROM Order_Detail where Produce_No = {Produce_No})
        End
        Else
        Begin
          Set @DeleteFlag = (SELECT count(*) FROM Sample_Detail where Produce_No = {Produce_No})
        End
        if (@DeleteFlag = 0)
            BEGIN
                Delete FROM [Produce] where Produce_No = {Produce_No} And isnull(Purchase_Project_No,'') = '' And isnull(Exported, 0) = 0;
            END
      End
      `, req.body);
    break;
  }

  // console.log(strSQL)
  // res.send({Flag:true});
  db.sql(req.SiteDB, strSQL)
     .then((result) => {
        //res.send({Flag:false});
        res.send({Flag: result.recordsets[0][0].Flag > 0});
     }).catch((err) => {
        console.log(err);
        res.status(500).send(err);
     })

});

// Get Product Shipment Detail
router.post('/Product_Shipment_Detail', function (req, res, next) {
  console.log("Call Product_Shipment_Detail Api:",req.body);
  req.body.F_ETD_From = req.body.F_ETD_From ? `N'${req.body.F_ETD_From.trim().substring(0,10).replace(/'/g, "''")}'` : ''; 
  req.body.F_ETD_To = req.body.F_ETD_To ? `N'${req.body.F_ETD_To.trim().substring(0,10).replace(/'/g, "''")}'` : ''; 
  req.body.Shipment_No = req.body.Shipment_No ? `N'${req.body.Shipment_No.trim().substring(0,18).replace(/'/g, "''")}'` : ''; 
  req.body.CustomerID = req.body.CustomerID ? `N'${req.body.CustomerID.trim().substring(0,15).replace(/'/g, "''")}'` : ''; 
  req.body.Factory_SubID = req.body.Factory_SubID ? `N'${req.body.Factory_SubID.trim().substring(0,15).replace(/'/g, "''")}'` : ''; 
  req.body.Produce_No = req.body.Produce_No ? `N'${req.body.Produce_No.trim().substring(0,20).replace(/'/g, "''")}'` : ''; 
  req.body.Product_No = req.body.Product_No ? `N'${req.body.Product_No.trim().substring(0,25).replace(/'/g, "''")}'` : ''; 
  req.body.Ref_No = req.body.Ref_No ? `N'${req.body.Ref_No.trim().substring(0,20).replace(/'/g, "''")}'` : ''; 
  req.body.Order_No = req.body.Order_No ? `N'${req.body.Order_No.trim().substring(0,18).replace(/'/g, "''")}'` : ''; 
  req.body.RCV_No = req.body.RCV_No ? `N'${req.body.RCV_No.trim().substring(0,30).replace(/'/g, "''")}'` : ''; 
  req.body.Department = req.body.Department ? `N'${req.body.Department.trim().substring(0,20).replace(/'/g, "''")}'` : ''; 

  var strSQL = format(`
  Select convert(varchar(10), p.F_ETD,111) as F_ETD
  , p.Shipment_No
  , case
      when p.Accounting_First_Lock is not null and len(isnull(p.Accounting,'')) = 0 then 'unlock'
      when p.Accounting_First_Lock is null and p.Accounting is null then ''
      when len(isnull(p.Accounting,'')) > 0 then 'lock'
    end as Record_Flag
  , p.CustomerID
  , p.Factory_SubID
  , od.Produce_No
  , od.Product_No
  , r.Ref_No
  , pd.Qty
  , Format(isnull(pd.Qty,0) * isnull(od.Unit_Price ,0),'N2') as O_Amount
  , Format(isnull(pd.Qty,0) * isnull(od.Factory_Price ,0),'N2') as F_Amount
  , o.Order_No
  , o.RCV_No
  , o.Department
  From orders o
  Left Outer Join Order_Detail od with(NoLock,NoWait) on o.Order_No = od.Order_No
  Left Outer Join PDSP_Detail pd with(NoLock,NoWait) on od.Order_DetailID = pd.Order_DetailID
  Left Outer Join Order_Detail_Ref r with(NoLock,NoWait) on od.Order_Detail_RefID = r.Order_Detail_RefID
  Left Outer Join PDSP p with(NoLock,NoWait) on pd.Shipment_NO = p.Shipment_NO
  where 1=1
  ${req.body.F_ETD_From ? 'And p.F_ETD >= {F_ETD_From}' : ''}
  ${req.body.F_ETD_To ? 'And p.F_ETD <= {F_ETD_To}' : ''}
  ${req.body.Shipment_No ? 'And p.Shipment_No = {Shipment_No}' : ''}
  ${req.body.CustomerID ? 'And p.CustomerID = {CustomerID}' : ''}
  ${req.body.Factory_SubID ? 'And p.Factory_SubID = {Factory_SubID}' : ''}
  ${req.body.Produce_No ? 'And od.Produce_No = {Produce_No}' : ''}
  ${req.body.Product_No ? 'And od.Product_No = {Product_No}' : ''}
  ${req.body.Ref_No ? 'And r.Ref_No = {Ref_No}' : ''}
  ${req.body.Order_No ? 'And o.Order_No = {Order_No}' : ''}
  ${req.body.RCV_No ? 'And o.RCV_No = {RCV_No}' : ''}
  ${req.body.Department ? 'And o.Department = {Department}' : ''}   
  Order By p.F_ETD desc
`,req.body);

//console.log(strSQL)
  db.sql(req.SiteDB, strSQL)
    .then((result) => {
       //console.log(result)
      var DataSet = result.recordsets[0];
      res.send(DataSet);
    }).catch((err) => {
      console.log(err);
      res.status(500).send(err);
    })
});

//Get Schedule_List
router.post('/Schedule_List',  function (req, res, next) {
  console.log("Call Schedule_List Api:");  

  req.body.Lasting_S_From = req.body.Lasting_S_From ? `'${req.body.Lasting_S_From.trim().substring(0,10).replace(/'/g, "''")}'` : `'1900/01/01'`; 
  req.body.Lasting_S_To = req.body.Lasting_S_To ? `'${req.body.Lasting_S_To.trim().substring(0,10).replace(/'/g, "''")}'` : `'3500/01/01'`; 
  req.body.Factory_SubID = req.body.Factory_SubID ? `N'${req.body.Factory_SubID.trim().substring(0,15).replace(/'/g, "''")}'` : `''`; 
  req.body.Cutting_LineID = req.body.Cutting_LineID ? `N'${req.body.Cutting_LineID.trim().substring(0,15).replace(/'/g, "''")}'` : `''`; 
  req.body.Stitching_LineID = req.body.Stitching_LineID ? `N'${req.body.Stitching_LineID.trim().substring(0,15).replace(/'/g, "''")}'` : `''`; 
  req.body.Lasting_LineID = req.body.Lasting_LineID ? `N'${req.body.Lasting_LineID.trim().substring(0,15).replace(/'/g, "''")}'` : `''`; 
  req.body.Produce_LineID = req.body.Produce_LineID ? `N'${req.body.Produce_LineID.trim().substring(0,15).replace(/'/g, "''")}'` : `''`; 
  req.body.Produce_No = req.body.Produce_No ? `N'${req.body.Produce_No.trim().substring(0,20).replace(/'/g, "''")}'` : `''`; 
  req.body.Purchase_Project_No = req.body.Purchase_Project_No ? `N'${req.body.Purchase_Project_No.trim().substring(0,15).replace(/'/g, "''")}'` : `''`; 
  req.body.Product_No = req.body.Product_No ? `N'${req.body.Product_No.trim().substring(0,25).replace(/'/g, "''")}'` : `''`; 
  //req.body.Order_No = req.body.Order_No ? `N'${req.body.Order_No.trim().substring(0,20).replace(/'/g, "''")}'` : `''`; 
  //req.body.PO_No = req.body.PO_No ? `N'${req.body.PO_No.trim().substring(0,10).replace(/'/g, "''")}'` : `''`; 
  req.body.Orig_Shipping_Date_From = req.body.Orig_Shipping_Date_From ? `'${req.body.Orig_Shipping_Date_From.trim().substring(0,10).replace(/'/g, "''")}'` : `'1900/01/01'`; 
  req.body.Orig_Shipping_Date_To = req.body.Orig_Shipping_Date_To ? `'${req.body.Orig_Shipping_Date_To.trim().substring(0,10).replace(/'/g, "''")}'` : `'3500/01/01'`; 
  //req.body.Est_Shipping_Date_From = req.body.Est_Shipping_Date_From ? `'${req.body.Est_Shipping_Date_From.trim().substring(0,10).replace(/'/g, "''")}'` : `'1900/01/01'`; 
  //req.body.Est_Shipping_Date_To = req.body.Est_Shipping_Date_To ? `'${req.body.Est_Shipping_Date_To.trim().substring(0,10).replace(/'/g, "''")}'` : `'3500/01/01'`; 
  req.body.BrandID = req.body.BrandID ? `N'${req.body.BrandID.trim().substring(0,3).replace(/'/g, "''")}'` : `''`; 
  req.body.Brand = req.body.Brand ? `N'${req.body.Brand.trim().substring(0,30).replace(/'/g, "''")}'` : `''`; 
  req.body.Outsole_No = req.body.Outsole_No ? `N'${req.body.Outsole_No.trim().substring(0,20).replace(/'/g, "''")}'` : `''`; 
  req.body.Last_No = req.body.Last_No ? `N'${req.body.Last_No.trim().substring(0,50).replace(/'/g, "''")}'` : `''`; 
  req.body.Season = req.body.Season ? `N'${req.body.Season.trim().substring(0,10).replace(/'/g, "''")}'` : `''`; 
  //req.body.CustomerID = req.body.CustomerID ? `N'${req.body.CustomerID.trim().substring(0,15).replace(/'/g, "''")}'` : `''`;
  req.body.Plan_Month = req.body.Plan_Month ? `N'${req.body.Plan_Month.trim().substring(0,15).replace(/'/g, "''")}'` : `''`; 
  req.body.isDelay = req.body.isDelay ? req.body.isDelay : null
  req.body.isInsufficient = req.body.isInsufficient ? req.body.isInsufficient : null

  var strSQL = format(`
  Declare @Schedule table (Order_No varchar(18), Queue_No float, BrandID varchar(3), Brand varchar(20), Product_No varchar(25), Factory_SubID varchar(15), Produce_LineID varchar(15)
  , Qty float, Remaining_CQty float, Remaining_SQty float, Remaining_LQty float
  , Cutting_S varchar(10), Cutting_F varchar(10), Cutting_Qty float, Cutting_LineID varchar(15)
  , Stitching_S varchar(10), Stitching_F varchar(10), Stitching_Qty float, Stitching_LineID varchar(15)
  , Lasting_S varchar(10), Lasting_F varchar(10), Lasting_Qty float, Lasting_LineID varchar(15)
  , Est_Produce_Date varchar(10), Produce_No varchar(20), Orig_Shipping_Date varchar(10)
  , Season varchar(10), Remark Nvarchar(max), Schedule_Updater Nvarchar(255), Schedule_Update Nvarchar(20)
  , Photo_Month varchar(10), Outsole_No varchar(20), Last_No varchar(50)
  , Style_No varchar(20)
  , Technical_Transfer_Require_Date varchar(10)
  , PP_Sample_Require_Date varchar(10)
  , All_Items float 
  , Finsh_Items float
  );

With tmpTable(Queue_No
  , Order_No
  , Brand
  , Season
  , Orig_Shipping_Date
  , Product_No
  , Factory_SubID
  , Produce_LineID
  , Qty, Remaining_CQty, Remaining_SQty, Remaining_LQty
  , Cutting_S, Cutting_F, Cutting_Qty, Cutting_LineID
  , Stitching_S, Stitching_F, Stitching_Qty, Stitching_LineID
  , Lasting_S, Lasting_F, Lasting_Qty, Lasting_LineID
  , Est_Produce_Date, Produce_No
  , Remark, Schedule_Updater, Schedule_Update
) as (
SELECT top 500 p.Queue_No
-- , case when p.Produce_Purpose = 'Order' then ISNULL(o.Order_No, N'') else  ISNULL(s.ProduceID, N'') end AS Order_No
-- , case when p.Produce_Purpose = 'Order' then ISNULL(o.Brand, N'') else  ISNULL(s.Brand, N'') end AS Brand
, o.Order_No, o.Brand, o.Season, CONVERT(VARCHAR(10), od.Orig_Shipping_Date, 111) as Orig_Shipping_Date
-- , case when p.Produce_Purpose = 'Order' then ISNULL(o.Season, N'') else  ISNULL(s.Season, N'') end AS Season
, ISNULL(p.Product_No, N'') AS Product_No
, ISNULL(p.Factory_SubID, N'') AS Factory_SubID
, ISNULL(p.Produce_LineID, N'') AS Produce_LineID
, sum(od.Qty) as Qty, sum(od.Qty) - Cutting_Qty as Remaining_CQty, sum(od.Qty) - Stitching_Qty as Remaining_SQty, sum(od.Qty) - Lasting_Qty as Remaining_LQty
, CONVERT(VARCHAR(10), p.Cutting_S, 111) as Cutting_S, CONVERT(VARCHAR(10), p.Cutting_F, 111) as Cutting_F, Cutting_Qty, ISNULL(p.Cutting_LineID, N'') AS Cutting_LineID
, CONVERT(VARCHAR(10), p.Stitching_S, 111) as Stitching_S, CONVERT(VARCHAR(10), p.Stitching_F, 111) as Stitching_F, Stitching_Qty, ISNULL(p.Stitching_LineID, N'') AS Stitching_LineID
, CONVERT(VARCHAR(10), p.Lasting_S, 111) as Lasting_S, CONVERT(VARCHAR(10), p.Lasting_F, 111) as Lasting_F, Lasting_Qty, ISNULL(p.Lasting_LineID, N'') AS Lasting_LineID
, CONVERT(VARCHAR(10), p.Est_Produce_Date, 111) as Est_Produce_Date
, ISNULL(p.Produce_No, N'') AS Produce_No
, p.Remark, p.Schedule_Updater, CONVERT(VARCHAR(20), p.Schedule_Update, 120) as Schedule_Update
FROM Produce p with(NoLock,NoWait)
Left Outer JOIN Order_Detail od with(NoLock,NoWait) ON p.Produce_No = od.Produce_No 
-- Left Outer Join Order_PKO PKO with(NoLock,NoWait) on PKO.Order_DetailID = od.Order_DetailID
Left Outer JOIN Orders o with(NoLock,NoWait) ON od.Order_No = o.Order_No AND (o.Purpose = 'Official' or o.Purpose = 'Internal')
Left Outer JOIN Sample_Detail sd with(NoLock,NoWait) ON p.Produce_No = sd.Produce_No 
-- Left Outer JOIN Samples s with(NoLock,NoWait) ON sd.ProduceID = s.ProduceID 
Left Outer JOIN Product pc with(NoLock,NoWait) ON pc.Product_No = p.Product_No 
Left Outer JOIN Style st with(NoLock,NoWait) ON st.Style_No = pc.Style_No 
Left Outer JOIN Brand b with(NoLock,NoWait) ON b.Brand = st.Brand
WHERE
({Produce_No} = '' or ISNULL(p.Produce_No, N'') LIKE '%' + {Produce_No} + '%')
AND ({Product_No} = '' or ISNULL(p.Product_No, N'') LIKE '%' + {Product_No} + '%')
AND (p.Produce_Purpose = 'Order' and ISNULL(b.BrandID, N'')  LIKE '%'+ {BrandID} +'%')
AND (p.Produce_Purpose = 'Order' and ISNULL(o.Season, N'')  LIKE '%'+ {Season} +'%')
-- AND (p.Produce_Purpose = 'Order' and ISNULL(b.BrandID, N'')  LIKE '%'+''+'%' or p.Produce_Purpose = 'Sample' and ISNULL(b.BrandID, N'')  LIKE '%'+''+'%')
-- AND (p.Produce_Purpose = 'Order' and ISNULL(o.Season, N'')  LIKE '%'+''+'%' or p.Produce_Purpose = 'Sample' and ISNULL(s.Season, N'')  LIKE '%'+''+'%')
AND ({Factory_SubID} = '' or ISNULL(p.Factory_SubID, N'') LIKE '%' + {Factory_SubID} + '%')
AND ({Cutting_LineID} = '' or ISNULL(p.Cutting_LineID, N'') LIKE '%' + {Cutting_LineID} + '%')
AND ({Stitching_LineID} = '' or ISNULL(p.Stitching_LineID, N'') LIKE '%' + {Stitching_LineID} + '%')
AND ({Lasting_LineID} = '' or ISNULL(p.Lasting_LineID, N'') LIKE '%' + {Lasting_LineID} + '%')
AND ({Produce_LineID} = '' or ISNULL(p.Produce_LineID, N'') LIKE '%' + {Produce_LineID} + '%')
AND ${req.body.Plan_Month === "\'\'" ? `ISNULL(p.Plan_Month, N'') >= '1900/01'` : `ISNULL(p.Plan_Month, N'') LIKE '%' + {Plan_Month} + '%'` }
AND (CONVERT(date, isnull(od.Orig_Shipping_Date,''),111) Between {Orig_Shipping_Date_From} AND {Orig_Shipping_Date_To})
AND (CONVERT(date, isnull(p.Lasting_S,''), 111) between {Lasting_S_From} AND {Lasting_S_To})
AND p.UnProduce = 0
Group by p.Queue_No, o.Order_No, o.Brand, o.Season
-- , case when p.Produce_Purpose = 'Order' then ISNULL(o.Order_No, N'') else  ISNULL(s.ProduceID, N'') end 
-- , case when p.Produce_Purpose = 'Order' then ISNULL(o.Brand, N'') else  ISNULL(s.Brand, N'') end 
-- , case when p.Produce_Purpose = 'Order' then ISNULL(o.Season, N'') else  ISNULL(s.Season, N'') end 
, ISNULL(p.Product_No, N''), ISNULL(p.Factory_SubID, N''), ISNULL(p.Produce_LineID, N'')
, CONVERT(VARCHAR(10), p.Cutting_S, 111), CONVERT(VARCHAR(10), p.Cutting_F, 111), Cutting_Qty, Cutting_LineID
, CONVERT(VARCHAR(10), p.Stitching_S, 111), CONVERT(VARCHAR(10), p.Stitching_F, 111), Stitching_Qty, Stitching_LineID
, CONVERT(VARCHAR(10), p.Lasting_S, 111), CONVERT(VARCHAR(10), p.Lasting_F, 111), Lasting_Qty, Lasting_LineID
, CONVERT(VARCHAR(10), p.Est_Produce_Date, 111)
, ISNULL(p.Produce_No, N''), ISNULL(p.Purchase_Project_No, N'')
, CONVERT(VARCHAR(10), od.Orig_Shipping_Date, 111)
, p.Remark
, p.Schedule_Updater, CONVERT(VARCHAR(20), p.Schedule_Update, 120)
Order by p.Queue_No, CONVERT(VARCHAR(10), od.Orig_Shipping_Date, 111), ISNULL(p.Produce_No, N'') )

Insert @Schedule
Select Order_No, tmp.Queue_No, b.BrandID, tmp.Brand, tmp.Product_No, tmp.Factory_SubID, tmp.Produce_LineID, tmp.Qty, tmp.Remaining_CQty, tmp.Remaining_SQty, tmp.Remaining_LQty
, tmp.Cutting_S, tmp.Cutting_F, tmp.Cutting_Qty, tmp.Cutting_LineID, tmp.Stitching_S, tmp.Stitching_F, tmp.Stitching_Qty, tmp.Stitching_LineID, tmp.Lasting_S, tmp.Lasting_F, tmp.Lasting_Qty, tmp.Lasting_LineID
, tmp.Est_Produce_Date, tmp.Produce_No, tmp.Orig_Shipping_Date
, tmp.Season , tmp.Remark, tmp.Schedule_Updater, tmp.Schedule_Update 
, isnull(pc.Photo_Month,'') as Photo_Month, s.Outsole_No, s.Last_No
, s.Style_No
, case when s.Technical_Transfer_Require_Date is null then '' else CONVERT(VARCHAR(10), s.Technical_Transfer_Require_Date, 111) end as Technical_Transfer_Require_Date
, case when pc.PP_Sample_Require_Date is null then '' else CONVERT(VARCHAR(10), pc.PP_Sample_Require_Date, 111) end as PP_Sample_Require_Date
, 5 as All_Items
, case when s.Pattern_Ship_Date is null or cast(s.Pattern_Ship_Date as date) > cast(GetDate() as date) then 0 else 1 end
+ case when s.Cutting_Dies_Detail_Ship_Date is null or cast(s.Cutting_Dies_Detail_Ship_Date as date) > cast(GetDate() as date) then 0 else 1 end
+ case when s.Operating_Instructions_Ship_Date is null or cast(s.Operating_Instructions_Ship_Date as date) > cast(GetDate() as date) then 0 else 1 end
+ case when s.Printing_Film_Ship_Date is null or cast(s.Printing_Film_Ship_Date as date) > cast(GetDate() as date) then 0 else 1 end
+ case when s.Copper_Mold_Film_Ship_Date is null or cast(s.Copper_Mold_Film_Ship_Date as date) > cast(GetDate() as date) then 0 else 1 end as Finsh_Items
From tmpTable tmp
Inner Join Brand b on tmp.Brand = b.Brand
INNER JOIN Product pc with(NoLock,NoWait) ON tmp.Product_No = pc.Product_No 
INNER JOIN Style s with(NoLock,NoWait) ON s.Style_No = pc.Style_No 
Where ({Outsole_No} = '' or ISNULL(s.Outsole_No, N'') LIKE N'%' + {Outsole_No} + N'%')
AND ({Last_No} = '' or ISNULL(s.Last_No, N'') LIKE '%' + {Last_No} + '%');

Select s.Queue_No, s.BrandID, s.Brand, s.Product_No, s.Factory_SubID, s.Produce_LineID, s.Qty, s.Remaining_CQty, s.Remaining_SQty, s.Remaining_LQty
, ISNULL(s.Cutting_S, '') as Cutting_S, s.Cutting_F, s.Cutting_Qty, s.Cutting_LineID, ISNULL(s.Stitching_S, '') as Stitching_S, s.Stitching_F, s.Stitching_Qty, s.Stitching_LineID, ISNULL(s.Lasting_S, '') as Lasting_S, s.Lasting_F, s.Lasting_Qty, s.Lasting_LineID
, s.Est_Produce_Date, s.Produce_No, s.Orig_Shipping_Date
, s.Season , s.Remark, s.Schedule_Updater, s.Schedule_Update 
, s.Photo_Month, s.Outsole_No, s.Last_No
, s.Style_No
, Substring(Convert(varchar(10), s.Technical_Transfer_Require_Date, 111),6,5) as Technical_Transfer_Require_Date
, Substring(Convert(varchar(10), s.PP_Sample_Require_Date, 111),6,5) as PP_Sample_Require_Date
, isnull(s.All_Items,0) + isnull(t.All_Items,0) + isnull(m.All_Items,0) as Tech_All_Items
, isnull(s.Finsh_Items,0) + isnull(t.Finsh_Items,0) + isnull(m.All_Items,0) as Tech_Finsh_Items
, isnull(round( (isnull(s.Finsh_Items,0) + isnull(t.Finsh_Items,0) + isnull(m.All_Items,0)) / nullif(cast((isnull(s.All_Items,0) + isnull(t.All_Items,0) + isnull(m.All_Items,0) ) as float),0) * 100 ,0 ),0) as Tech_Complete_Rate
, isnull(p.All_Items,0) as Sample_All_Items
, isnull(p.Finsh_Items,0) as Sample_Finsh_Items
, isnull(round( isnull(p.Finsh_Items,0) / nullif(cast(isnull(p.All_Items,0) as float),0) * 100 ,0 ) ,0 ) as Sample_Complete_Rate
-- , isnull(wh.All_Items,0) as Worksheet_All_Items
-- , isnull(wh.Finsh_Items,0) as Worksheete_Finsh_Items
-- , isnull(round( isnull(wh.Finsh_Items,0) / nullif(cast(isnull(wh.All_Items,0) as float),0) * 100 ,0 ) ,0 ) as Worksheet_Complete_Rate
-- , Substring(Convert(varchar(10), wh.Require_Date, 111),6,5) as Worksheet_Require_Date
-- , isnull(round( isnull(wdf.Qty,0) / nullif(cast(isnull(wdf.Goal_Qty,0) as float),0) * 100 ,0 ) ,0 ) as WD_Face_Complete_Rate
-- , isnull(round( isnull(wdb.Qty,0) / nullif(cast(isnull(wdb.Goal_Qty,0) as float),0) * 100 ,0 ) ,0 ) as WD_Bottom_Complete_Rate
-- , Substring(Convert(varchar(10), wdf.Require_Date, 111),6,5) as WD_Face_Require_Date
-- , Substring(Convert(varchar(10), wdb.Require_Date, 111),6,5) as WD_Bottom_Require_Date
From (
  Select s.Queue_No, s.BrandID, s.Brand, s.Product_No, s.Factory_SubID, s.Produce_LineID
  , sum(s.Qty) as Qty, sum(s.Qty) - Cutting_Qty as Remaining_CQty, sum(s.Qty) - Stitching_Qty as Remaining_SQty, sum(s.Qty) - Lasting_Qty as Remaining_LQty
  , s.Cutting_S, s.Cutting_F, s.Cutting_Qty, s.Cutting_LineID, s.Stitching_S, s.Stitching_F, s.Stitching_Qty, s.Stitching_LineID, s.Lasting_S, s.Lasting_F, s.Lasting_Qty, s.Lasting_LineID
  , s.Est_Produce_Date, s.Produce_No, Min(s.Orig_Shipping_Date) as Orig_Shipping_Date
  , s.Season , s.Remark, s.Schedule_Updater, s.Schedule_Update 
  , s.Photo_Month, s.Outsole_No, s.Last_No
  , s.Style_No
  , s.Technical_Transfer_Require_Date
  , s.PP_Sample_Require_Date
  , s.All_Items
  , s.Finsh_Items
  From @Schedule s
  Group by s.Queue_No, s.BrandID, s.Brand, s.Product_No, s.Factory_SubID, s.Produce_LineID
  , s.Cutting_S, s.Cutting_F, s.Cutting_Qty, s.Cutting_LineID, s.Stitching_S, s.Stitching_F, s.Stitching_Qty, s.Stitching_LineID, s.Lasting_S, s.Lasting_F, s.Lasting_Qty, s.Lasting_LineID
  , s.Est_Produce_Date, s.Produce_No
  , s.Season , s.Remark, s.Schedule_Updater, s.Schedule_Update 
  , s.Photo_Month, s.Outsole_No, s.Last_No
  , s.Style_No
  , s.Technical_Transfer_Require_Date
  , s.PP_Sample_Require_Date
  , s.All_Items
  , s.Finsh_Items
  ) s
Left Outer Join (  
  Select tmp.Style_No
  , count(sw.Style_WorkshopID) as All_Items
  , sum(case when sw.Tooling_Arrival_Date is null or cast(sw.Tooling_Arrival_Date as date) > cast(GetDate() as date) then 0 else 1 end) as Finsh_Items
  From (Select Style_No From @Schedule Group by Style_No) tmp
  Inner Join Style_Process sp with(NoLock,NoWait) On sp.Style_No = tmp.Style_No
  Inner Join Style_WorkShop sw with(NoLock,NoWait) On sw.Style_ProcessID = sp.Style_ProcessID
  WHERE sw.Tooling_Name is NOT NULL
  Group by tmp.Style_No
) t on t.Style_No = s.Style_No
Left Outer Join (   
  Select tmp.Style_No
  , count(sm.Style_MouldID) as All_Items
  , sum(case when sm.Arrival_Date is null or cast(sm.Arrival_Date as date) > cast(GetDate() as date) then 0 else 1 end) as Finsh_Items
  From (Select Style_No From @Schedule Group by Style_No) tmp
  Inner Join Style_Mould sm with(NoLock,NoWait) On sm.Style_No = tmp.Style_No
  WHERE sm.Mould_Name is NOT NULL
  Group by tmp.Style_No
) m on m.Style_No = s.Style_No
Left Outer Join (   
  Select tmp.Produce_No
  , count(sd.Product_No) as All_Items
  , sum(case when sd.Send_Out_Date is null or cast(sd.Send_Out_Date as date) > cast(GetDate() as date) then 0 else 1 end) as Finsh_Items
  From (Select Order_No, Produce_No, Product_No From @Schedule Group by Order_No, Produce_No, Product_No) tmp  
  Inner Join Samples s with(NoLock,NoWait) On s.Order_No = tmp.Order_No
  Inner Join Sample_Detail sd with(NoLock,NoWait) On s.ProduceID = sd.ProduceID and sd.Product_No = tmp.Product_No
  Inner Join Produce p with(NoLock,NoWait) On p.Produce_No = sd.Produce_No
  Group by tmp.Produce_No
) p on p.Produce_No = s.Produce_No
-- Left Outer Join (   
--   Select tmp.Produce_No
--   , min(s.Require_Date) as Require_Date
--   , count(s.WorksheetID) as All_Items
--   , sum(case when s.Est_Work_End is null or cast(s.Est_Work_End as date) > cast(GetDate() as date) then 0 else 1 end) as Finsh_Items
--   From (Select Produce_No From @Schedule Group by Produce_No) tmp  
--   Inner Join Worksheet s with(NoLock,NoWait) On s.Produce_No = tmp.Produce_No
--   Group by tmp.Produce_No
-- ) wh on wh.Produce_No = s.Produce_No
-- Left Outer Join (   
--     Select tmp.Produce_No
--     , min(w.Require_Date) as Require_Date
--     , sum(wd.Goal_Qty) as Goal_Qty
--     , sum(wd.Qty) as Qty
--     From (Select Produce_No From @Schedule Group by Produce_No) tmp 
--     Inner Join [Worksheet] w with(NoLock,NoWait) on tmp.Produce_No = w.Produce_No
--     Inner Join [Worksheet_Detail] wd with(NoLock,NoWait) on w.WorksheetID = wd.WorksheetID
--     Inner Join [Style_Workshop] sw with(NoLock,NoWait) on wd.Style_WorkshopID = sw.Style_WorkshopID 
--     Inner Join [Style_Process] sp with(NoLock,NoWait) on sw.Style_ProcessID = sp.Style_ProcessID 
--     Inner Join [Product_Component] pc with(NoLock,NoWait) on sp.ComponentID = pc.ComponentID 
--     Where pc.Component_GroupID in (1, 7, 9)
--     Group by tmp.Produce_No
-- ) wdf on wdf.Produce_No = s.Produce_No
-- Left Outer Join (   
--     Select tmp.Produce_No
--     , min(w.Require_Date) as Require_Date
--     , sum(wd.Goal_Qty) as Goal_Qty
--     , sum(wd.Qty) as Qty
--     From (Select Produce_No From @Schedule Group by Produce_No) tmp 
--     Inner Join [Worksheet] w with(NoLock,NoWait) on tmp.Produce_No = w.Produce_No
--     Inner Join [Worksheet_Detail] wd with(NoLock,NoWait) on w.WorksheetID = wd.WorksheetID
--     Inner Join [Style_Workshop] sw with(NoLock,NoWait) on wd.Style_WorkshopID = sw.Style_WorkshopID 
--     Inner Join [Style_Process] sp with(NoLock,NoWait) on sw.Style_ProcessID = sp.Style_ProcessID 
--     Inner Join [Product_Component] pc with(NoLock,NoWait) on sp.ComponentID = pc.ComponentID 
--     Where pc.Component_GroupID in (3)
--     Group by tmp.Produce_No
-- ) wdb on wdb.Produce_No = s.Produce_No
${req.body.isDelay ? `WHERE (Cutting_F > Orig_Shipping_Date) OR (Stitching_F > Orig_Shipping_Date) OR (Lasting_F > Orig_Shipping_Date)` : `` }
${req.body.isInsufficient ? `WHERE (s.Qty > s.Remaining_CQty AND s.Remaining_CQty > 0) OR (s.Qty > s.Remaining_SQty AND s.Remaining_SQty > 0) OR (s.Qty > s.Remaining_LQty AND s.Remaining_LQty > 0)` : `` }
ORDER BY Queue_No

Select '' as Factory_SubID, '' as Produce_LineID
union
Select Factory_SubID, Produce_LineID From Produce_Line;

Select case when p.Group_Symbol = 'U' then 1
            when p.Group_Symbol = 'B' then 2
            when p.Group_Symbol = 'P' then 3
            when p.Group_Symbol = 'O' then 4
       End  as SortID
, p.Produce_No
, p.Group_Symbol
--, Substring(Convert(varchar(10), isnull(p.Expected_Delivery, pp.Require_Date), 111),6,5) as Expected_Delivery
, case when p.Expected_Arrival is not null then Substring(Convert(varchar(10), p.Expected_Arrival, 111),6,5) else 
  case when p.Expected_Delivery is not null then Substring(Convert(varchar(10), p.Expected_Delivery, 111),6,5) end 
End as Expected_Delivery
, isnull(round( isnull((p.Closed_Items),0) / nullif(cast(p.Items as float),0) * 100 ,0 ),0) as Complete_Rate 
From [Produce_MTR_Completeness] p with(NoLock,NoWait)
Inner Join (Select Produce_No From @Schedule Group by Produce_No) t on p.Produce_No = t.Produce_No
Order by SortID, p.Produce_No;

Select case when p.Group_Symbol = 'U' then 1
            when p.Group_Symbol = 'B' then 2
            when p.Group_Symbol = 'P' then 3
            when p.Group_Symbol = 'O' then 4
       End  as SortID
, p.Produce_No
, p.Group_Symbol
, case when p.Est_Completed is not null then Substring(Convert(varchar(10), p.Est_Completed, 111),6,5) end as Est_Completed
, isnull(round( isnull((p.Closed_Items),0) / nullif(cast(p.Items as float),0) * 100 ,0 ),0) as Complete_Rate 
From [Produce_Preproduction_Completeness] p with(NoLock,NoWait)
Inner Join (Select Produce_No From @Schedule Group by Produce_No) t on p.Produce_No = t.Produce_No
Order by SortID, p.Produce_No;

  `, req.body) ;
  // console.log(strSQL)
  db.sql(req.SiteDB, strSQL)
     .then((result) => {
        
        var DataSet = {Data_Info:result.recordsets[0]
          ,Urgent_Light_Info: Urgent_Light_Info
          ,Type_Light_Info: Type_Light_Info};        

        result.recordsets[0].forEach((item)=>{          
          item.Factory_Line = result.recordsets[1].filter((data)=>(data.Factory_SubID == item.Factory_SubID));
          item.Factory_Line = item.Factory_Line.length > 0 ? item.Factory_Line : [{Factory_SubID:'',Produce_LineID:''}];          
          item.MTR_Status = result.recordsets[2].filter((data)=>(data.Produce_No == item.Produce_No));
          item.WorkSheet_Status = result.recordsets[3].filter((data)=>(data.Produce_No == item.Produce_No));
        })
        res.send(DataSet);
     }).catch((err) => {
        console.log(err);
        res.status(500).send(err);
     })
});

//Get Production_List
router.post('/Production_List',  function (req, res, next) {
  console.log("Call Production_List Api:");  

  req.body.Produce_No = req.body.Produce_No ? `N'${req.body.Produce_No.trim().substring(0,20).replace(/'/g, "''")}'` : `''`; 
  req.body.Order_No = req.body.Order_No ? `N'${req.body.Order_No.trim().substring(0,20).replace(/'/g, "''")}'` : `''`; 
  req.body.Ref_No = req.body.Ref_No ? `N'${req.body.Ref_No.trim().substring(0,20).replace(/'/g, "''")}'` : `''`; 
  req.body.PKO_No = req.body.PKO_No ? `N'${req.body.PKO_No.trim().substring(0,20).replace(/'/g, "''")}'` : `''`; 
  req.body.Brand = req.body.Brand ? `N'${req.body.Brand.trim().substring(0,30).replace(/'/g, "''")}'` : `''`; 
  req.body.CustomerID = req.body.CustomerID ? `N'${req.body.CustomerID.trim().substring(0,30).replace(/'/g, "''")}'` : `''`; 
  req.body.Season = req.body.Season ? `N'${req.body.Season.trim().substring(0,10).replace(/'/g, "''")}'` : `''`; 
  req.body.PI_No = req.body.PI_No ? `N'${req.body.PI_No.trim().substring(0,15).replace(/'/g, "''")}'` : `''`; 
  req.body.PO_No = req.body.PO_No ? `N'${req.body.PO_No.trim().substring(0,10).replace(/'/g, "''")}'` : `''`; 
  req.body.Factory_SubID = req.body.Factory_SubID ? `N'${req.body.Factory_SubID.trim().substring(0,15).replace(/'/g, "''")}'` : `''`; 
  req.body.Produce_LineID = req.body.Produce_LineID ? `N'${req.body.Produce_LineID.trim().substring(0,15).replace(/'/g, "''")}'` : `''`; 
  req.body.Purchase_Project_No = req.body.Purchase_Project_No ? `N'${req.body.Purchase_Project_No.trim().substring(0,15).replace(/'/g, "''")}'` : `''`; 
  req.body.Pattern_No = req.body.Pattern_No ? `N'${req.body.Pattern_No.trim().substring(0,20).replace(/'/g, "''")}'` : `''`; 
  req.body.Product_No = req.body.Product_No ? `N'${req.body.Product_No.trim().substring(0,25).replace(/'/g, "''")}'` : `''`; 
  req.body.Customer_Product_No = req.body.Customer_Product_No ? `N'${req.body.Customer_Product_No.trim().substring(0,25).replace(/'/g, "''")}'` : `''`; 
  req.body.Article_Name = req.body.Article_Name ? `N'${req.body.Article_Name.trim().substring(0,50).replace(/'/g, "''")}'` : `''`;
  req.body.Orig_Shipping_Date_From = req.body.Orig_Shipping_Date_From ? `'${req.body.Orig_Shipping_Date_From.trim().substring(0,10).replace(/'/g, "''")}'` : `'1900/01/01'`; 
  req.body.Orig_Shipping_Date_To = req.body.Orig_Shipping_Date_To ? `'${req.body.Orig_Shipping_Date_To.trim().substring(0,10).replace(/'/g, "''")}'` : `'3500/01/01'`; 
  req.body.Category = req.body.Category ? `N'${req.body.Category.trim().substring(0,15).replace(/'/g, "''")}'` : `''`;
  req.body.History = req.body.History ? 1 : 0;

  var strSQL = format(` Declare @TmpTable table (Produce_No varchar(20), UnProduce bit, Purpose varchar(15), Produce_Purpose varchar(15)
  , Ref_No varchar(20)
  , Order_No varchar(18), Brand varchar(20), CustomerID varchar(20), Season varchar(10)
  , PI_No varchar(15), PO_No varchar(10), Factory_SubID varchar(15), Produce_LineID varchar(15), Purchase_Project_No varchar(20)
  , Product_No varchar(25),  Orig_Shipping_Date varchar(10), SP_Sample bit
  --, Destination Nvarchar(30)
  , Shipmented bit, BOM_Status Nvarchar(20)
  , Qty float, Cutting_Qty float, Cutting_S varchar(10), Stitching_Qty float, Stitching_S varchar(10), Lasting_Qty float, Lasting_S varchar(10), Packing_Qty float
  , Order_ApproveID varchar(max), Approve_Date varchar(20), Approve_First_Date varchar(20), Approve_Flag int
  , Pattern_No Nvarchar(20), Customer_Product_No Nvarchar(25), Photo_Month Nvarchar(4), Low_Quality bit, Article_Name Nvarchar(50), Category Nvarchar(20), Style_No Nvarchar(20)
)

Insert @TmpTable
  SELECT TOP (500) ISNULL(p.Produce_No, N'') AS Produce_No
  , CONVERT(bit, CASE WHEN ISNULL(p.UnProduce, 0) = 0 THEN 0 ELSE 1 END) AS UnProduce
  , case when p.Produce_Purpose = 'Order' then ISNULL(o.Purpose, N'') else  N'Sample' end AS Purpose  
  , ISNULL(p.Produce_Purpose, N'Order') AS Produce_Purpose
  --, case when p.Produce_Purpose = 'Order' then ISNULL(r.Ref_No, N'') else  ISNULL(sd.Ref_No, N'') end AS Ref_No
  , '' as Ref_No
  , case when p.Produce_Purpose = 'Order' then ISNULL(o.Order_No, N'') else  ISNULL(s.ProduceID, N'') end AS Order_No
  , case when p.Produce_Purpose = 'Order' then ISNULL(o.Brand, N'') else  ISNULL(s.Brand, N'') end AS Brand  
  , case when p.Produce_Purpose = 'Order' then ISNULL(o.CustomerID, N'') else  ISNULL(s.CustomerID, N'') end AS CustomerID  
  , case when p.Produce_Purpose = 'Order' then ISNULL(o.Season, N'') else  ISNULL(s.Season, N'') end AS Season
  , case when p.Produce_Purpose = 'Order' then ISNULL(o.PI_No, N'') else  N'' end AS PI_No
  , case when p.Produce_Purpose = 'Order' then ISNULL(od.PO_No, N'') else  N'' end AS PO_No
  , ISNULL(p.Factory_SubID, N'') AS Factory_SubID  
  , ISNULL(p.Produce_LineID, N'') AS Produce_LineID
  , ISNULL(p.Purchase_Project_No, N'') AS Purchase_Project_No
  , ISNULL(p.Product_No, N'') AS Product_No  
  --, CONVERT(VARCHAR(10), od.Orig_Shipping_Date, 111) as Orig_Shipping_Date
  --, CONVERT(VARCHAR(10), min(case when p.Produce_Purpose = 'Order' then PKO.Shipping_Date else s.Require_Date end), 111)  as Orig_Shipping_Date
  , CONVERT(VARCHAR(10), min(case when p.Produce_Purpose = 'Order' then od.Orig_Shipping_Date else s.Require_Date end), 111)  as Orig_Shipping_Date
  , CONVERT(bit, CASE WHEN p.SP_Sample is null THEN 0 ELSE 1 END) AS SP_Sample
  --, isnull(PKO.Destination,od.Destination) AS Destination
  , CONVERT(bit, ISNULL(p.Shipmented, 0)) AS Shipmented 
  , (CASE WHEN p.Material_Update_User IS NOT NULL THEN 'bom-ready' ELSE 'bom-pending' END) AS BOM_Status
  , isnull(p.Qty,0) as Qty
  , isnull(p.Cutting_Qty,0) as Cutting_Qty
  , CONVERT(VARCHAR(10), p.Cutting_S, 111) as Cutting_S
  , isnull(p.Stitching_Qty,0) as Stitching_Qty
  , CONVERT(VARCHAR(10), p.Stitching_S, 111) as Stitching_S
  , isnull(p.Lasting_Qty,0) as Lasting_Qty
  , CONVERT(VARCHAR(10), p.Lasting_S, 111) as Lasting_S
  , isnull(p.Packing_Qty,0) as Packing_Qty
  , isnull(cast(oa.Order_ApproveID as varchar),'') as Order_ApproveID
  , isnull(convert(varchar(10), oa.Approve_Date,111),'') as Approve_Date
  , isnull(convert(varchar(10), oa.Approve_First_Date,111),'') as Approve_First_Date
  , case when oa.Approve_Date = '' or oa.Approve_Date is null then 0 else 1 end as Approve_Flag
, ISNULL(st.Pattern_No, N'') AS Pattern_No
, pt.Customer_Product_No
, isnull(pt.Photo_Month,'') as Photo_Month
, CONVERT(bit, CASE WHEN LEN(ISNULL(pt.Photo_Bad_Quality, '')) = 0 THEN 0 ELSE 1 END) AS Low_Quality
, ISNULL(pt.Name, N'') AS Article_Name
, ISNULL(st.Category, N'') AS Category
, st.Style_No  
FROM Produce p with(NoLock,NoWait)
INNER JOIN Product pt with(NoLock,NoWait) ON p.Product_No = pt.Product_No
INNER JOIN Style st with(NoLock,NoWait) ON st.Style_No = pt.Style_No
Left Outer JOIN Order_Detail od with(NoLock,NoWait) ON p.Produce_No = od.Produce_No
Left Outer Join Order_Detail_Ref r with(NoLock,NoWait) on od.Order_Detail_RefID = r.Order_Detail_RefID
Left Outer JOIN Orders o with(NoLock,NoWait) ON od.Order_No = o.Order_No
Left Outer JOIN Sample_Detail sd with(NoLock,NoWait) ON p.Produce_No = sd.Produce_No 
Left Outer JOIN Samples s with(NoLock,NoWait) ON sd.ProduceID = s.ProduceID 
Left outer Join Order_PKO PKO with(Nolock,NoWait) on od.Order_Detail_RefID = pko.Order_Detail_RefID
Left outer Join Order_Approve oa With(Nolock,NoWait) on p.Order_ApproveID = oa.Order_ApproveID
WHERE ( 1 = {History} or ISNULL(p.Shipmented, 0) = 0 )
And ({Produce_No} = '' or ISNULL(p.Produce_No, N'') LIKE '%' + {Produce_No} + '%')
AND (p.Produce_Purpose = 'Order' and ISNULL(o.Order_No, N'')  LIKE '%'+{Order_No}+'%' or p.Produce_Purpose = 'Sample' and ISNULL(s.ProduceID, N'')  LIKE '%'+{Order_No}+'%')
AND (p.Produce_Purpose = 'Order' and ISNULL(r.Ref_No, N'')  LIKE '%'+{Ref_No}+'%' or p.Produce_Purpose = 'Sample' and ISNULL(sd.Ref_No, N'')  LIKE '%'+{Ref_No}+'%')
AND (p.Produce_Purpose = 'Order' and ISNULL(o.Brand, N'')  LIKE '%'+{Brand}+'%' or p.Produce_Purpose = 'Sample' and ISNULL(s.Brand, N'')  LIKE '%'+{Brand}+'%')
AND (p.Produce_Purpose = 'Order' and ISNULL(o.CustomerID, N'')  LIKE '%'+{CustomerID}+'%' or p.Produce_Purpose = 'Sample' and ISNULL(s.CustomerID, N'')  LIKE '%'+{CustomerID}+'%')
AND (p.Produce_Purpose = 'Order' and ISNULL(o.Season, N'')  LIKE '%'+{Season}+'%' or p.Produce_Purpose = 'Sample' and ISNULL(s.Season, N'')  LIKE '%'+{Season}+'%')
AND ({PI_No} = '' or ISNULL(o.PI_No, N'') LIKE '%' + {PI_No} + '%')
AND ({PO_No} = '' or ISNULL(od.PO_No, N'') LIKE '%' + {PO_No} + '%')
AND ({Factory_SubID} = '' or ISNULL(p.Factory_SubID, N'') LIKE '%' + {Factory_SubID} + '%')
AND ({Produce_LineID} = '' or ISNULL(p.Produce_LineID, N'') LIKE '%' + {Produce_LineID} + '%')
AND ({Purchase_Project_No} = '' or ISNULL(p.Purchase_Project_No, N'') LIKE '%' + {Purchase_Project_No} + '%')
--AND (p.Produce_Purpose = 'Order' and ISNULL(od.Product_No, N'')  LIKE '%'+{Product_No}+'%' or p.Produce_Purpose = 'Sample' and ISNULL(sd.Product_No, N'')  LIKE '%'+{Product_No}+'%')
AND ({Product_No} = '' or ISNULL(p.Product_No, N'') LIKE '%' + {Product_No} + '%')
AND ({PKO_No} = '' or ISNULL(PKO.PKO_No, N'') LIKE '%' + {PKO_No} + '%')
And ({Pattern_No} = '' or ISNULL(st.Pattern_No, N'') LIKE '%' + {Pattern_No} + '%')
And ({Article_Name} = '' or pt.Name LIKE '%' + {Article_Name} + '%')
And ({Category} = '' or st.Category LIKE '%' + {Category} + '%')
AND ({Customer_Product_No} = '' or ISNULL(pt.Customer_Product_No, N'') LIKE '%' + {Customer_Product_No} + '%')
AND (p.Produce_Purpose = 'Order' and (CONVERT(date, isnull(od.Orig_Shipping_Date,'3000-01-01 00:00:00'),111) Between {Orig_Shipping_Date_From} AND {Orig_Shipping_Date_To})
or p.Produce_Purpose = 'Sample' and (CONVERT(date, isnull(s.Require_Date,'3000-01-01 00:00:00'),111) Between {Orig_Shipping_Date_From} AND {Orig_Shipping_Date_To}) )
GROUP by ISNULL(p.Produce_No, N''), CONVERT(bit, CASE WHEN ISNULL(p.UnProduce, 0) = 0 THEN 0 ELSE 1 END)
 , case when p.Produce_Purpose = 'Order' then ISNULL(o.Purpose, N'') else  N'Sample' end 
 , ISNULL(p.Produce_Purpose, N'Order') 
 --, case when p.Produce_Purpose = 'Order' then ISNULL(r.Ref_No, N'') else  ISNULL(sd.Ref_No, N'') end 
 , case when p.Produce_Purpose = 'Order' then ISNULL(o.Order_No, N'') else  ISNULL(s.ProduceID, N'') end 
 , case when p.Produce_Purpose = 'Order' then ISNULL(o.Brand, N'') else  ISNULL(s.Brand, N'') end   
 , case when p.Produce_Purpose = 'Order' then ISNULL(o.CustomerID, N'') else  ISNULL(s.CustomerID, N'') end
 , case when p.Produce_Purpose = 'Order' then ISNULL(o.Season, N'') else  ISNULL(s.Season, N'') end 
 , case when p.Produce_Purpose = 'Order' then ISNULL(o.PI_No, N'') else  N'' end 
 , case when p.Produce_Purpose = 'Order' then ISNULL(od.PO_No, N'') else  N'' end 
 , ISNULL(p.Factory_SubID, N'') 
 , ISNULL(p.Produce_LineID, N'') 
 , ISNULL(p.Purchase_Project_No, N'') 
 , ISNULL(p.Product_No, N'')  
 --, CONVERT(VARCHAR(10), od.Orig_Shipping_Date, 111) 
 , CONVERT(bit, CASE WHEN p.SP_Sample is null THEN 0 ELSE 1 END) 
 --, isnull(PKO.Destination,od.Destination) 
 , CONVERT(bit, ISNULL(p.Shipmented, 0))
 , (CASE WHEN p.Material_Update_User IS NOT NULL THEN 'bom-ready' ELSE 'bom-pending' END)
 , isnull(p.Qty,0) 
  , isnull(p.Cutting_Qty,0) 
  , CONVERT(VARCHAR(10), p.Cutting_S, 111) 
  , isnull(p.Stitching_Qty,0) 
  , CONVERT(VARCHAR(10), p.Stitching_S, 111) 
  , isnull(p.Lasting_Qty,0) 
  , CONVERT(VARCHAR(10), p.Lasting_S, 111) 
  , isnull(p.Packing_Qty,0) 
 , isnull(cast(oa.Order_ApproveID as varchar),'') 
 , isnull(convert(varchar(10), oa.Approve_Date,111),'') 
 , isnull(convert(varchar(10), oa.Approve_First_Date,111),'') 
 , case when oa.Approve_Date = '' or oa.Approve_Date is null then 0 else 1 end 
 , ISNULL(st.Pattern_No, N'') 
, pt.Customer_Product_No
, isnull(pt.Photo_Month,'') 
, CONVERT(bit, CASE WHEN LEN(ISNULL(pt.Photo_Bad_Quality, '')) = 0 THEN 0 ELSE 1 END) 
, ISNULL(pt.Name, N'') 
, ISNULL(st.Category, N'')
, st.Style_No 
 Order by Orig_Shipping_Date DESC, Produce_No;

Select Produce_No, UnProduce, tmp.Order_No, tmp.Purpose, tmp.Produce_Purpose, tmp.Ref_No
, tmp.Brand, tmp.CustomerID, Season, PI_No, PO_No, Factory_SubID, Produce_LineID, Purchase_Project_No, tmp.Product_No, Orig_Shipping_Date
, ISNULL(tmp.Pattern_No, N'') AS Pattern_No
, tmp.Customer_Product_No
, tmp.Photo_Month
, tmp.Low_Quality
, tmp.Article_Name
, tmp.Category
, SP_Sample
, tmp.Style_No
, Shipmented
, BOM_Status  
, tmp.Qty
, tmp.Cutting_Qty
, isnull(tmp.Qty,0) - isnull(tmp.Cutting_Qty,0) as Cutting_Qty_B
, isnull(round( isnull((tmp.Cutting_Qty),0) / nullif(cast(tmp.Qty as float),0) * 100 ,1 ),0) as Cutting_Rate
, case when tmp.Cutting_S is not null then Substring(tmp.Cutting_S,6,5) else '' end as Cutting_S
, tmp.Stitching_Qty
, isnull(tmp.Qty,0) - isnull(tmp.Stitching_Qty,0) as Stitching_Qty_B
, isnull(round( isnull((tmp.Stitching_Qty),0) / nullif(cast(tmp.Qty as float),0) * 100 ,1 ),0) as Stitching_Rate
, case when tmp.Stitching_S is not null then Substring(tmp.Stitching_S,6,5) else '' end as Stitching_S
, tmp.Lasting_Qty
, isnull(tmp.Qty,0) - isnull(tmp.Lasting_Qty,0) as Lasting_Qty_B
, isnull(round( isnull((tmp.Lasting_Qty),0) / nullif(cast(tmp.Qty as float),0) * 100 ,1 ),0) as Lasting_Rate
, case when tmp.Lasting_S is not null then Substring(tmp.Lasting_S,6,5) else '' end as Lasting_S
, tmp.Packing_Qty
, isnull(tmp.Qty,0) - isnull(tmp.Packing_Qty,0) as Packing_Qty_B
, isnull(round( isnull((tmp.Packing_Qty),0) / nullif(cast(tmp.Qty as float),0) * 100 ,1 ),0) as Packing_Rate
, tmp.Order_ApproveID
, tmp.Approve_Date
, tmp.Approve_First_Date
, tmp.Approve_Flag
From @TmpTable tmp;

Select case when p.Group_Symbol = 'U' then 1
            when p.Group_Symbol = 'B' then 2
            when p.Group_Symbol = 'P' then 3
            when p.Group_Symbol = 'O' then 4
       End  as SortID
, p.Produce_No
, p.Group_Symbol
--, Substring(Convert(varchar(10), isnull(p.Expected_Delivery, pp.Require_Date), 111),6,5) as Expected_Delivery
--, case when p.Expected_Delivery is not null then Substring(Convert(varchar(10), p.Expected_Delivery, 111),6,5) end as Expected_Delivery
, case when p.Expected_Arrival is not null then Substring(Convert(varchar(10), p.Expected_Arrival, 111),6,5) else 
  case when p.Expected_Delivery is not null then Substring(Convert(varchar(10), p.Expected_Delivery, 111),6,5) end 
End as Expected_Delivery
, isnull(round( isnull((p.Closed_Items),0) / nullif(cast(p.Items as float),0) * 100 ,0 ),0) as Complete_Rate 
From [Produce_MTR_Completeness] p with(Nolock,NoWait)
Inner Join (Select Produce_No, Purchase_Project_No From @TmpTable Group by Produce_No, Purchase_Project_No) t on p.Produce_No = t.Produce_No
--Inner Join Purchase_Project pp with(NoLock, NoWait) on t.Purchase_Project_No = pp.Purchase_Project_No
where p.Group_Symbol <> 'O'
Order by SortID, p.Produce_No;


Select distinct od.Produce_No
, case when p.Produce_Purpose = 'Order' then ISNULL(od.Order_No, N'') else  ISNULL(sd.ProduceID, N'') end AS Order_No
, isnull(PKO.Destination,isnull(od.Destination,'')) AS Destination
, case when p.Produce_Purpose = 'Order' then ISNULL(r.Ref_No, N'') else  ISNULL(sd.Ref_No, N'') end AS Ref_No
, isnull(PKO.PKO_No,'') as PKO_No
--, CONVERT(VARCHAR(10), PKO.Shipping_Date, 111) as Shipping_Date
, isnull(Format( case when p.Produce_Purpose = 'Order' then PKO.Shipping_Date else s.Require_Date End, 'yyyy/MM/dd'),'') as Shipping_Date
, isnull(PKO.Qty,0) as Qty
From @TmpTable p 
Left outer Join Order_Detail od with(Nolock,NoWait) on od.Produce_no = p.Produce_no and od.Order_No = p.Order_no
Left outer Join Order_PKO PKO with(Nolock,NoWait) on od.Order_Detail_RefID = pko.Order_Detail_RefID
Left Outer Join Order_Detail_Ref r with(NoLock,NoWait) on od.Order_Detail_RefID = r.Order_Detail_RefID
Left Outer JOIN Sample_Detail sd with(NoLock,NoWait) ON p.Produce_No = sd.Produce_No and sd.ProduceID = p.Order_No
Left Outer JOIN Samples s with(NoLock,NoWait) ON sd.ProduceID = s.Order_No
Order by Ref_No, isnull(PKO.PKO_No,'')
  `, req.body) ;
  //console.log(strSQL)
  db.sql(req.SiteDB, strSQL)
     .then((result) => {       
        let Purpose_BG = {Official:'', Forecast:'#ffcc66',Sample:'#ccffcc', Cancel:'Gray'};
        let Produce_Purpose_BG = {Order:'',Sample:'#ccffcc'};
        let UnProduce_BG = 'Gray';
        let SP_Sample_BG = 'LightCyan';
              
        var DataSet = {Data_Info: result.recordsets[0]
          ,Urgent_Light_Info: Urgent_Light_Info
          ,Type_Light_Info: Type_Light_Info};
         
        result.recordsets[0].forEach((item)=>{
          item.UnProduce_BG = item.UnProduce ? UnProduce_BG:'';
          item.Purpose_BG = Purpose_BG[item.Purpose];
          item.Produce_Purpose_BG = Produce_Purpose_BG[item.Produce_Purpose]
          item.SP_Sample_BG = item.SP_Sample ? SP_Sample_BG:'';
          item.MTR_Status = result.recordsets[1].filter((data)=>(data.Produce_No == item.Produce_No));
          var Ref_Detail = result.recordsets[2].filter((data)=>(data.Produce_No == item.Produce_No && data.Order_No == item.Order_No ));

           item.Ref_Info = [...Ref_Detail.reduce((r, e) => {
            let k = `${e.Ref_No}`;
            if (!r.has(k)) {
              // console.log(r)
              r.set(k, { Ref_No: e.Ref_No,
               Total_Qty: e.Qty,
              })
            } else {
               r.get(k).Total_Qty += e.Qty;
            }
            return r;
          }, new Map).values()];
          item.Ref_Info.forEach((data)=>{
            data.PKO_Info = Ref_Detail.filter((obj)=>(obj.Ref_No == data.Ref_No))
          })
        })
        res.send(DataSet);
     }).catch((err) => {
        console.log(err);
        res.status(500).send(err);
     })
});

//Get Production_Progress_Control_Info
router.post('/Production_Progress_Control_Info',  function (req, res, next) {
  console.log("Call Production_Progress_Control_Info Api:");  

  req.body.Factory_SubID = req.body.Factory_SubID ? `N'${req.body.Factory_SubID.trim().substring(0,15).replace(/'/g, "''")}'` : `''`; 
  req.body.Produce_LineID = req.body.Produce_LineID ? `N'${req.body.Produce_LineID.trim().substring(0,15).replace(/'/g, "''")}'` : `''`; 
  req.body.Plan_Month = req.body.Plan_Month ? `'${req.body.Plan_Month.trim().substring(0,7)}'` : `'${moment().format('YYYY/MM')}'`; 
  var strSQL = format(`
Declare @Schedule table (Queue_No float, Produce_No varchar(20), Product_No varchar(25), Qty float, Order_No varchar(18), Orig_Shipping_Date varchar(10), SP_Sample varchar(10)
, Prework varchar(20), Cutting varchar(20), Stitching varchar(20), Buttom varchar(20), Lasting varchar(20), Purchase_Project_No varchar(20))

Insert @Schedule
SELECT top 500 
p.Queue_No
, ISNULL(p.Produce_No, N'') AS Produce_No
, ISNULL(p.Product_No, N'') AS Product_No
, sum(od.Qty) as Qty
, o.Order_No
, CONVERT(VARCHAR(05), od.Orig_Shipping_Date, 101) as Orig_Shipping_Date
, CONVERT(VARCHAR(05), p.SP_Sample, 101) as SP_Sample
, case when isnull(p.Prework_S,'') = '' then '' else CONVERT(VARCHAR(05), p.Prework_S, 101) end + '-' 
  + case when isnull(p.Prework_F,'') = '' then '' else CONVERT(VARCHAR(05), p.Prework_F, 101) end as Prework
, case when isnull(p.Cutting_S,'') = '' then '' else CONVERT(VARCHAR(05), p.Cutting_S, 101) end + '-' 
  + case when isnull(p.Cutting_F,'') = '' then '' else CONVERT(VARCHAR(05), p.Cutting_F, 101) end as Cutting
, case when isnull(p.Stitching_S,'') = '' then '' else CONVERT(VARCHAR(05), p.Stitching_S, 101) end + '-' 
  + case when isnull(p.Stitching_F,'') = '' then '' else CONVERT(VARCHAR(05), p.Stitching_F, 101) end as Stitching
, case when isnull(p.Buttom_D,'') = '' then '' else CONVERT(VARCHAR(05), p.Buttom_D, 101) end + '-' 
  + case when isnull(p.Buttom_A,'') = '' then '' else CONVERT(VARCHAR(05), p.Buttom_A, 101) end as Buttom
, case when isnull(p.Lasting_S,'') = '' then '' else CONVERT(VARCHAR(05), p.Lasting_S, 101) end + '-' 
  + case when isnull(p.Lasting_F,'') = '' then '' else CONVERT(VARCHAR(05), p.Lasting_F, 101) end as Lasting
, ISNULL(p.Purchase_Project_No, N'') AS Purchase_Project_No
FROM Produce p with(NoLock,NoWait)
Inner JOIN Order_Detail od with(NoLock,NoWait) ON p.Produce_No = od.Produce_No 
INNER JOIN Orders o with(NoLock,NoWait) ON od.Order_No = o.Order_No AND (o.Department IS NOT NULL) AND (o.Purpose <> 'Forecast')
--Left Outer Join Order_PKO PKO with(NoLock,NoWait) on PKO.Order_DetailID = od.Order_DetailID
WHERE ({Factory_SubID} = '' or ISNULL(p.Factory_SubID, N'') LIKE '%' + {Factory_SubID} + '%')
AND ({Produce_LineID} = '' or ISNULL(p.Produce_LineID, N'') LIKE '%' + {Produce_LineID} + '%')
--AND ({Plan_Month} = '' or ISNULL(p.Plan_Month, N'') LIKE {Plan_Month} + '%')
Group by p.Queue_No
, ISNULL(p.Produce_No, N'')
, ISNULL(p.Product_No, N'') 
, o.Order_No
, CONVERT(VARCHAR(05), od.Orig_Shipping_Date, 101) 
, CONVERT(VARCHAR(05), p.SP_Sample, 101) 
, case when isnull(p.Prework_S,'') = '' then '' else CONVERT(VARCHAR(05), p.Prework_S, 101) end + '-' 
  + case when isnull(p.Prework_F,'') = '' then '' else CONVERT(VARCHAR(05), p.Prework_F, 101) end 
, case when isnull(p.Cutting_S,'') = '' then '' else CONVERT(VARCHAR(05), p.Cutting_S, 101) end + '-' 
  + case when isnull(p.Cutting_F,'') = '' then '' else CONVERT(VARCHAR(05), p.Cutting_F, 101) end 
, case when isnull(p.Stitching_S,'') = '' then '' else CONVERT(VARCHAR(05), p.Stitching_S, 101) end + '-' 
  + case when isnull(p.Stitching_F,'') = '' then '' else CONVERT(VARCHAR(05), p.Stitching_F, 101) end 
, case when isnull(p.Buttom_D,'') = '' then '' else CONVERT(VARCHAR(05), p.Buttom_D, 101) end + '-' 
  + case when isnull(p.Buttom_A,'') = '' then '' else CONVERT(VARCHAR(05), p.Buttom_A, 101) end 
, case when isnull(p.Lasting_S,'') = '' then '' else CONVERT(VARCHAR(05), p.Lasting_S, 101) end + '-' 
  + case when isnull(p.Lasting_F,'') = '' then '' else CONVERT(VARCHAR(05), p.Lasting_F, 101) end 
, ISNULL(p.Purchase_Project_No, N'') 
Order by p.Queue_No, ISNULL(p.Produce_No, N'');

Select tmp.Queue_No
, tmp.Produce_No
, tmp.Qty
, isnull(pc.Name,'') as Article_Name
, tmp.Order_No
, isnull(s.Last_No,'') as Last_No
, isnull(s.Outsole_No,'') as Outsole_No
, tmp.Orig_Shipping_Date
, tmp.SP_Sample
, tmp.Prework
, tmp.Cutting
, tmp.Stitching
, tmp.Buttom
, tmp.Lasting
, tmp.Purchase_Project_No
, isnull(pc.Photo_Month,'') as Photo_Month
From @Schedule tmp
INNER JOIN Product pc with(NoLock,NoWait) ON tmp.Product_No = pc.Product_No 
INNER JOIN Style s with(NoLock,NoWait) ON s.Style_No = pc.Style_No;

Select case when p.Group_Symbol = 'U' then 1
            when p.Group_Symbol = 'B' then 2
            when p.Group_Symbol = 'P' then 3
            when p.Group_Symbol = 'O' then 4
       End  as SortID
, p.Produce_No
, p.Group_Symbol
--, case when p.Expected_Delivery is not null then Substring(Convert(varchar(10), p.Expected_Delivery, 111),6,5) end as Expected_Delivery
, case when p.Expected_Arrival is not null then Substring(Convert(varchar(10), p.Expected_Arrival, 111),6,5) else 
  case when p.Expected_Delivery is not null then Substring(Convert(varchar(10), p.Expected_Delivery, 111),6,5) end 
End as Expected_Delivery
, isnull(round( isnull((p.Closed_Items),0) / nullif(cast(p.Items as float),0) * 100 ,0 ),0) as Complete_Rate 
From [Produce_MTR_Completeness] p
Inner Join (Select Produce_No, Purchase_Project_No From @Schedule Group by Produce_No, Purchase_Project_No) t on p.Produce_No = t.Produce_No
Order by p.Produce_No, SortID;
  `, req.body) ;
  //console.log(strSQL)
  db.sql(req.SiteDB, strSQL)
     .then((result) => {
        
        var DataSet = {Data_Info:result.recordsets[0]
          ,Urgent_Light_Info: Urgent_Light_Info
          ,Type_Light_Info: Type_Light_Info};

        result.recordsets[0].forEach((item)=>{          
          item.MTR_Status = result.recordsets[1].filter((data)=>(data.Produce_No == item.Produce_No));
        })
        res.send(DataSet);
     }).catch((err) => {
        console.log(err);
        res.status(500).send(err);
     })
});

//Get Production_Material_Deliver_Status_Info
router.post('/Production_Material_Deliver_Status_Info',  function (req, res, next) {
  console.log("Call Production_Material_Deliver_Status_Info Api:");  

  req.body.Brand = req.body.Brand ? `N'${req.body.Brand.trim().replace(/'/g, "''")}'` : `'All'`; 
  req.body.Factory_SubID = req.body.Factory_SubID ? `N'${req.body.Factory_SubID.trim().substring(0,15).replace(/'/g, "''")}'` : `'All'`; 
  req.body.Produce_LineID = req.body.Produce_LineID ? `N'${req.body.Produce_LineID.trim().substring(0,15).replace(/'/g, "''")}'` : `'All'`; 
  req.body.Plan_Month = req.body.Plan_Month ? `'${req.body.Plan_Month.trim().substring(0,7)}'` : `'${moment().format('YYYY/MM')}'`; 
  req.body.Order_Purpose = req.body.Order_Purpose ? `N'${req.body.Order_Purpose.trim().substring(0,20).replace(/'/g, "''")}'` : `'All'`; 
  req.body.Produce_No = req.body.Produce_No ? `N'${req.body.Produce_No.trim().substring(0,20).replace(/'/g, "''")}'` : `''`; 
   

  var strSQL = format(`
  Declare @TmpTable table (BrandID varchar(20), Brand varchar(20), Produce_No varchar(20), Product_No varchar(25), Factory_SubID varchar(15), Produce_LineID varchar(15)
  , Qty float, Plan_Month varchar(20), Purchase_Project_No varchar(20), Require_Date varchar(10) )

  Declare @TmpProduce_MTR_Completeness table (Produce_No varchar(20), Group_Symbol varchar(05), Items float, Closed_Items float )

Insert @TmpTable
  SELECT TOP (500) ISNULL(b.BrandID, N'') AS BrandID
  , ISNULL(b.Brand, N'') AS Brand
  , ISNULL(p.Produce_No, N'') AS Produce_No
  , ISNULL(p.Product_No, N'') AS Product_No
  , ISNULL(p.Factory_SubID, N'') AS Factory_SubID
  , ISNULL(p.Produce_LineID, N'') AS Produce_LineID
  , isnull(p.Qty,0) as Qty
  , ISNULL(p.Plan_Month, N'') AS Plan_Month 
  , ISNULL(p.Purchase_Project_No, N'') AS Purchase_Project_No 
  , convert(varchar(10),pp.Require_Date,111) as Require_Date
FROM Produce p with(NoLock,NoWait)
INNER JOIN Order_Detail od with(NoLock,NoWait) ON p.Produce_No = od.Produce_No
INNER JOIN Orders o with(NoLock,NoWait) ON od.Order_No = o.Order_No
INNER JOIN Brand b with(NoLock,NoWait) on o.Brand = b.Brand
Left outer Join Purchase_Project pp with(Nolock,NoWait) on p.Purchase_Project_No = pp.Purchase_Project_No
WHERE (ABS(isnull(p.Shipmented,0)) <> 1) 
AND ({Order_Purpose} = 'All' or o.Purpose = {Order_Purpose})
And ({Brand} = 'All' or ISNULL(b.Brand, N'') LIKE '%' + {Brand} + '%')
AND ({Plan_Month} = 'All' or ISNULL(p.Plan_Month, N'') LIKE '%' + {Plan_Month} + '%')
AND ({Factory_SubID} = 'All' or ISNULL(p.Factory_SubID, N'') LIKE '%' + {Factory_SubID} + '%')
AND ({Produce_LineID} = 'All' or ISNULL(p.Produce_LineID, N'') LIKE '%' + {Produce_LineID} + '%')
AND ({Produce_No} = '' or ISNULL(p.Produce_No, N'') LIKE '%' + {Produce_No} + '%')
GROUP by ISNULL(b.BrandID, N''), ISNULL(b.Brand, N''), ISNULL(p.Produce_No, N''), ISNULL(p.Product_No, N'')
, ISNULL(p.Factory_SubID, N'') , ISNULL(p.Produce_LineID, N''), isnull(p.Qty,0) , ISNULL(p.Plan_Month, N'')
, ISNULL(p.Purchase_Project_No, N''), convert(varchar(10),pp.Require_Date,111) 
Order by Plan_Month, Brand DESC, Produce_No, Product_No;

Insert @TmpProduce_MTR_Completeness
Select p.Produce_No
, p.Group_Symbol
, isnull((p.Items),0) as Items
, isnull((p.Closed_Items),0) as Closed_Items
From [Produce_MTR_Completeness] p with(Nolock,NoWait)
Inner Join (Select Produce_No From @TmpTable Group by Produce_No) t on p.Produce_No = t.Produce_No
Order by p.Produce_No;

Select tmp.BrandID, tmp.Brand, tmp.Produce_No, tmp.Product_No, s.Style_No, tmp.Factory_SubID, tmp.Produce_LineID, format(tmp.Qty,'N0') as Qty
, tmp.Plan_Month, tmp.Purchase_Project_No, tmp.Require_Date, isnull(pt.Photo_Month,'') as Photo_Month
, isnull(m.AllItems,0) as AllItems
From @TmpTable tmp
Inner Join Product pt on tmp.Product_No = pt.Product_No
Inner Join Style s on s.Style_No = pt.Style_No
Left Outer Join (Select Produce_No, sum(Items) as AllItems From @TmpProduce_MTR_Completeness group by Produce_No) m on tmp.Produce_No = m.Produce_No;

Select case when p.Group_Symbol = 'U' then 1
            when p.Group_Symbol = 'B' then 2
            when p.Group_Symbol = 'P' then 3
            when p.Group_Symbol = 'O' then 4
       End  as SortID
, p.Produce_No
, p.Group_Symbol
, isnull((p.Items),0) as Items
, isnull((p.Closed_Items),0) as Closed_Items
, isnull((p.Items),0) - isnull((p.Closed_Items),0) as Balance_Items
From @TmpProduce_MTR_Completeness p 
Order by SortID, p.Produce_No;
  `, req.body) ;
  //console.log(strSQL)
  db.sql(req.SiteDB, strSQL)
     .then((result) => {
              
        var DataSet = {Data_Info: result.recordsets[0]
          ,MTR_Status:[{Group_Symbol:'U',Name:'面部'},{Group_Symbol:'B', Name:'底部'},{Group_Symbol:'P',Name:'包材'},{Group_Symbol:'O',Name:'其他'}]
          ,Urgent_Light_Info: Urgent_Light_Info
          ,Type_Light_Info: Type_Light_Info};
         
        result.recordsets[0].forEach((item)=>{
          item.MTR_Info = [{Group_Symbol:'U'},{Group_Symbol:'B'},{Group_Symbol:'P'},{Group_Symbol:'O'}];                        
          var MTR_Info = result.recordsets[1].filter((data)=>(data.Produce_No == item.Produce_No));
          item.MTR_Info.forEach((obj)=>{
            MTR_Info.forEach((data,index)=>{
              if(obj.Group_Symbol == data.Group_Symbol){
                obj.Items = data.Items;
                obj.Closed_Items = data.Closed_Items;
                obj.Balance_Items = data.Balance_Items;
              }
            })  
          })
        })
        //console.log(DataSet)
        res.send(DataSet);
     }).catch((err) => {
        console.log(err);
        res.status(500).send(err);
     })
});

//Get Production_Material_Deliver_Status_Detail_Info
router.post('/Production_Material_Deliver_Status_Detail_Info',  function (req, res, next) {
  console.log("Call Production_Material_Deliver_Status_Detail_Info Api:",req.body);

  req.body.Produce_No = req.body.Produce_No ? `N'${req.body.Produce_No.trim().substring(0,20).replace(/'/g, "''")}'` : `''`;
  req.body.Group_Symbol = req.body.Group_Symbol ? `N'${req.body.Group_Symbol.trim()}'` : `'0'`;
  req.body.MTR_Status = req.body.MTR_Status ? req.body.MTR_Status : 1;
  

  var strSQL = format(`  
  Declare @tmp table(Purchase_DetailID int, Purchase_ResponsibleID int, Produce_No varchar(20), SupplierID nvarchar(15), MaterialID int, Material nvarchar(200), Supplement bit
  , Delivery_Date varchar(10), Expected_Delivery varchar(10), Unit varchar(10)
  , Project_Qty varchar(30), Purchase_Qty varchar(30), Not_In float, Ship_QTY varchar(30), Not_Out float, Use_Stock_Qty varchar(30), Short_Qty varchar(30)
  , Memo nvarchar(40), MTR_Status_Flag int )

  insert @tmp
  SELECT ps.Purchase_DetailID, pd.Purchase_ResponsibleID, ps.Produce_No, pd.SupplierID, pd.MaterialID, pd.Material_Category + SPACE(1) + pd.Material_Specific + SPACE(1) + pd.Material_Color AS Material, CONVERT(bit, pd.Supplement) AS Supplement 
  , (case when p.Delivery_Date is not null then convert(varchar(10), p.Delivery_Date,111) else '' end) as Delivery_Date, (case when pd.Expected_Delivery is not null then convert(varchar(10), pd.Expected_Delivery,111) else '' end) as Expected_Delivery, pd.Unit
  , Format(pd.Project_Qty,'N2') as Project_Qty, Format(pd.Qty,'N2') as Purchase_Qty, (pd.Qty - pd.Stock_In_Qty) as Not_In, Format(pd.Stock_Out_Qty,'N2') as Ship_QTY
  , (pd.Project_Qty - pd.Stock_Out_Qty) as Not_Out, Format(pd.Use_Stock_Qty,'N2') as Use_Stock_Qty, Format(pd.Short_Qty,'N2') as Short_Qty
  , pd.Memo, (case when pd.Close_Date IS NULL then 1 else 2 end) as MTR_Status_Flag
  FROM Purchase_Detail_Sub ps WITH (NoLock, NoWait)
  Inner Join Purchase_Detail pd WITH (NoLock, NoWait) ON ps.Purchase_DetailID = pd.Purchase_DetailID 
  Left Outer JOIN Purchase p WITH (NoLock, NoWait) ON pd.Purchase_No = p.Purchase_No 
  WHERE (ps.Produce_No = {Produce_No}) 
  And ({MTR_Status} = 0 or pd.Close_Date IS ${ req.body.MTR_Status == '2' ? 'not' : ''} NULL)
  

  SELECT 
  mg.Group_Symbol
  , tmp.Purchase_DetailID
  , pr.Purchase_Responsible
  , tmp.Purchase_ResponsibleID
  , tmp.MTR_Status_Flag
  , mg.Material_Class
  , tmp.Produce_No
  , tmp.SupplierID
  , tmp.Material
  , tmp.Supplement
  , tmp.Delivery_Date
  , tmp.Expected_Delivery
  , tmp.Unit
  , tmp.Project_Qty
  , tmp.Purchase_Qty
  , case when tmp.Not_In < 0 then '(' + Format(tmp.Not_In * -1 ,'N2') + ')' else Format(tmp.Not_In,'N2') end as Not_In
  , tmp.Ship_QTY
  , case when tmp.Not_Out < 0  then '(' + Format(tmp.Not_Out * -1 ,'N2') + ')' else Format(tmp.Not_Out,'N2') end as Not_Out
  , tmp.Use_Stock_Qty
  , tmp.Short_Qty
  , tmp.Memo  
  , case when (tmp.Not_In > 0 and tmp.Expected_Delivery < Convert(varchar(10), GetDate(), 111)) then 1 else 0 end as Expected_Delivery_Flag
  FROM @tmp Tmp
    Inner Join Material m WITH (NoLock, NoWait) ON tmp.MaterialID = m.MaterialID 
    Inner Join Material_Control mc WITH (NoLock, NoWait) ON m.Material_ControlID = mc.Material_ControlID 
    Inner Join Material_Group mg WITH (NoLock, NoWait) ON mc.Material_GroupID = mg.Material_GroupID
    Inner Join Purchase_Responsible pr WITH (NoLock, NoWait) on tmp.Purchase_ResponsibleID = pr.Purchase_ResponsibleID
    Where ({Group_Symbol} = '0' or mg.Group_Symbol = {Group_Symbol})
  ORDER BY tmp.MTR_Status_Flag, tmp.Purchase_ResponsibleID, mg.Material_GroupID, tmp.Purchase_DetailID, tmp.SupplierID, tmp.Material


  SELECT sd.Purchase_DetailID
  , M.MPI_No
  , isnull(m.Shipment_Port,'') as Shipment_Port
  , (case when m.M_ETA is not null then convert(varchar(10), m.M_ETA,111) else '' end) as M_ETA
  , (case when m.M_ETD is not null then convert(varchar(10), m.M_ETD,111) else '' end) as M_ETD
  , Format(sum(sd.Out_Qty),'N2') as Out_Qty
  FROM @tmp t 
  Inner Join Stock_Out_Detail sd WITH (NoLock, NoWait) ON sd.Purchase_DetailID = t.Purchase_DetailID 
  Inner Join Stock_Out s WITH (NoLock, NoWait) ON s.Stock_Out_No = sd.Stock_Out_No 
  Inner Join MPI m WITH (NoLock, NoWait) ON s.MPI_No = m.MPI_No 
  Group by sd.Purchase_DetailID
  , M.MPI_No
  , m.Shipment_Port
  , (case when m.M_ETA is not null then convert(varchar(10), m.M_ETA,111) else '' end) 
  , (case when m.M_ETD is not null then convert(varchar(10), m.M_ETD,111) else '' end) 

  `, req.body) ;
  //console.log(strSQL)
  db.sql(req.SiteDB, strSQL)
     .then((result) => {              
        var DataSet = {Data_Info: []
          ,MTR_Status:[{Group_Symbol:'U',Name:'面部'},{Group_Symbol:'B', Name:'底部'},{Group_Symbol:'P',Name:'包材'},{Group_Symbol:'O',Name:'其他'}]
          ,Group_Symbol_Color: {}
          };

        Type_Light_Info.forEach((item)=>{
          DataSet.Group_Symbol_Color[item.Group_Symbol] = item.color
        });

        result.recordsets[0].forEach((item)=>{
          let obj = result.recordsets[1].filter((obj)=>(item.Purchase_DetailID == obj.Purchase_DetailID))
          item.MPI_Info = obj
        })
         
                
        DataSet.Data_Info = [...result.recordsets[0].reduce((r, e) => { 
          let k = `${e.Purchase_ResponsibleID}`;
          if (!r.has(k)) {
          // console.log(r)
            let obj = result.recordsets[0].filter((obj)=>(e.Purchase_ResponsibleID == obj.Purchase_ResponsibleID))
            r.set(k, {Purchase_ResponsibleID: e.Purchase_ResponsibleID, Purchase_Responsible: e.Purchase_Responsible, Material_Info: cloneDeep(obj), RecCount:obj.length})
          } 
          return r;
        }, new Map).values()]

        // DataSet.Data_Info.forEach((item)=>{
        //   item.Material_Info = result.recordsets[0].filter((obj)=>(item.Purchase_ResponsibleID == obj.Purchase_ResponsibleID))
        // })
        
        res.send(DataSet);
     }).catch((err) => {
        console.log(err);
        res.status(500).send(err);
     })
});

//Get Technology Transfer Model Control Info
router.post('/Technology_Transfer_Model_Control_Info',  function (req, res, next) {
  console.log("Call Technology_Transfer_Model_Control_Info Api:",req.body);  

  req.body.Factory_SubID = req.body.Factory_SubID ? `N'${req.body.Factory_SubID.trim().substring(0,15).replace(/'/g, "''")}'` : `''`;
  req.body.Season = req.body.Season ? `N'${req.body.Season.trim().substring(0,10).replace(/'/g, "''")}'` : `''`;
  req.body.Brand = req.body.Brand ? `N'${req.body.Brand.trim().substring(0,30).replace(/'/g, "''")}'` : `''`;
  req.body.Shoe_Name = req.body.Shoe_Name ? `N'${req.body.Shoe_Name.trim().substring(0,30).replace(/'/g, "''")}'` : `''`;
  req.body.Product_No = req.body.Product_No ? `N'${req.body.Product_No.trim().substring(0,25).replace(/'/g, "''")}'` : `''`;
  req.body.Produce_No = req.body.Produce_No ? `N'${req.body.Produce_No.trim().substring(0,20).replace(/'/g, "''")}'` : `''`;
  req.body.Style_No = req.body.Style_No ? `N'${req.body.Style_No.trim().substring(0,20).replace(/'/g, "''")}'` : `''`;  
  req.body.Orig_Shipping_Date = req.body.Orig_Shipping_Date ? `N'${req.body.Orig_Shipping_Date.substring(0,10)}'` : `''`;
  req.body.New_PaperPattern_Flag = req.body.New_PaperPattern_Flag ? 1 : 0;
  

  var strSQL = format(`   
  Declare @Tmp table(RecNo int IDENTITY(1,1), Product_No nvarchar(25), Style_No Nvarchar(40), BrandID Nvarchar(4), Brand Nvarchar(20)
  , Photo_Month Nvarchar(4), Name Nvarchar(50), Outsole_No Nvarchar(20), Last_No Nvarchar(50), Orig_Shipping_Date DateTime, Technical_Transfer_Require_Date varchar(10)
  , Pattern_No Nvarchar(20), Pattern_Confirm_Date varchar(10), Pattern_Ship_Date varchar(10), Cutting_Dies_Detail_Ship_Date varchar(10)
  , Operating_Instructions_Ship_Date varchar(10), Printing_Film_Ship_Date varchar(10), Copper_Mold_Film_Ship_Date varchar(10));
  
  
  insert @Tmp(Product_No, Style_No, BrandID, Brand, Photo_Month, Name, Outsole_No, Last_No, Orig_Shipping_Date, Technical_Transfer_Require_Date
    , Pattern_No, Pattern_Confirm_Date, Pattern_Ship_Date, Cutting_Dies_Detail_Ship_Date, Operating_Instructions_Ship_Date, Printing_Film_Ship_Date
    , Copper_Mold_Film_Ship_Date)
  select od.Product_No
      , s.Style_No
      , b.BrandID
      , s.Brand    
      , isnull(p.Photo_Month,'') as Photo_Month
      , p.Name      
      , isnull(s.Outsole_No,'') as Outsole_No
      , isnull(s.Last_No,'') as Last_No
      , min(od.Orig_Shipping_Date) as Orig_Shipping_Date
      , case when s.Technical_Transfer_Require_Date is null then '' else Convert(varchar(10), s.Technical_Transfer_Require_Date,111) end as Technical_Transfer_Require_Date
      , isnull(s.Pattern_No,'') as Pattern_No
      , case when s.Pattern_Confirm_Date is null then '' else Convert(varchar(10), s.Pattern_Confirm_Date,111) end as Pattern_Confirm_Date
      , case when s.Pattern_Ship_Date is null then '' else Convert(varchar(10), s.Pattern_Ship_Date,111) end as Pattern_Ship_Date
      , case when s.Cutting_Dies_Detail_Ship_Date is null then '' else Convert(varchar(10), s.Cutting_Dies_Detail_Ship_Date,111) end as Cutting_Dies_Detail_Ship_Date
      , case when s.Operating_Instructions_Ship_Date is null then '' else Convert(varchar(10), s.Operating_Instructions_Ship_Date,111) end as Operating_Instructions_Ship_Date
      , case when s.Printing_Film_Ship_Date is null then '' else Convert(varchar(10), s.Printing_Film_Ship_Date,111) end as Printing_Film_Ship_Date
      , case when s.Copper_Mold_Film_Ship_Date is null then '' else Convert(varchar(10), s.Copper_Mold_Film_Ship_Date,111) end as Copper_Mold_Film_Ship_Date
  from style s
  Inner Join Brand b on s.Brand = b.Brand 
  Inner Join Product p on s.Style_No = p.Style_No
  Inner Join Order_detail od on p.Product_No = od.Product_No
  inner Join Orders o on o.Order_No = od.Order_No 
  where ({New_PaperPattern_Flag} = 0 or s.Style_Status = 'new')
  And ({Factory_SubID} = 'All' or od.Factory_ID = {Factory_SubID})
  And ({Season} = 'All' or o.Season = {Season})
  And ({Brand} = 'All' or o.Brand = {Brand})
  And ({Style_No} = '' or s.Style_No like '%' + {Style_No} + '%')
  --And ({Product_No} = '' or od.Product_No like '%' + {Product_No} + '%')
  --And ({Produce_No} = '' or od.Produce_No like '%' + {Produce_No} + '%') 
  And ({Shoe_Name} = '' or p.Name like '%' + {Shoe_Name} + '%')
  And ({Orig_Shipping_Date} = '' or convert(varchar(10), Orig_Shipping_Date,111) like '%' + {Orig_Shipping_Date} + '%')
/*  
  And ({New_PaperPattern_Flag} = 0 
      or (
            iif(od.Orig_Shipping_Date is null or s.Pattern_Ship_Date is null, 1
              , iif(od.Orig_Shipping_Date is not null 
                    And s.Pattern_Ship_Date is not null 
                    And ABS(datediff(day,od.Orig_Shipping_Date, s.Pattern_Ship_Date)) < 90 , 1,0)
            ) = 1
          ) 
      )
          */
  Group by od.Product_No, s.Style_No, BrandID, s.Brand, Photo_Month, Name, Outsole_No, Last_No, Technical_Transfer_Require_Date
    , Pattern_No, Pattern_Confirm_Date, Pattern_Ship_Date, Cutting_Dies_Detail_Ship_Date, Operating_Instructions_Ship_Date, Printing_Film_Ship_Date
    , Copper_Mold_Film_Ship_Date
  
  
  Select t.Style_No
  , (Select Top 1 Product_No From @tmp o where o.Style_No = t.Style_No Group by Product_No) as Product_No
  , (Select distinct Name From @tmp p where p.Product_No = (Select Top 1 Product_No From @tmp o where o.Style_No = t.Style_No Group by Product_No)) as Name
  , (Select distinct Photo_Month From @tmp p where p.Product_No = (Select Top 1 Product_No From @tmp o where o.Style_No = t.Style_No Group by Product_No)) as Photo_Month
  , t.BrandID
  , t.Brand     
  , t.Outsole_No
  , t.Last_No
  --, case when (Select min(o.Orig_Shipping_Date) From @tmp o where o.Style_No = t.Style_No) is null then '' else Convert(varchar(10), (Select min(o.Orig_Shipping_Date) From @tmp o where o.Style_No = t.Style_No),111) end as Orig_Shipping_Date
  , t.Orig_Shipping_Date
  , t.Technical_Transfer_Require_Date
  , t.Pattern_No
  , t.Pattern_Confirm_Date
  , t.Pattern_Ship_Date
  , t.Cutting_Dies_Detail_Ship_Date
  , t.Operating_Instructions_Ship_Date
  , t.Printing_Film_Ship_Date
  , t.Copper_Mold_Film_Ship_Date
  from @tmp t
  Group by Style_No, BrandID, t.Brand, Outsole_No, Last_No, Orig_Shipping_Date, Technical_Transfer_Require_Date
    , Pattern_No, Pattern_Confirm_Date, Pattern_Ship_Date, Cutting_Dies_Detail_Ship_Date, Operating_Instructions_Ship_Date, Printing_Film_Ship_Date
    , Copper_Mold_Film_Ship_Date

    
  Select distinct t.Style_No, sw.Style_WorkshopID, sw.Model_No, sw.Tooling_Name
  , case when sw.Tooling_Ship_Date is null then '' else Convert(varchar(10), sw.Tooling_Ship_Date,111) end as Tooling_Ship_Date
  , case when sw.Tooling_Arrival_Date is null then '' else Convert(varchar(10), sw.Tooling_Arrival_Date,111) end as Tooling_Arrival_Date
  From (Select Style_No From @Tmp Group by Style_No) t
  Inner Join Style_Process sp with(NoWait,NoLock) on t.Style_No = sp.Style_No
  Inner Join Style_Workshop sw with(NoWait,NoLock) on sp.Style_ProcessID = sw.Style_ProcessID And isnull(sw.Tooling_Name,'') <> ''
  Order by Style_No;

  Select distinct t.Style_No, st.Style_MouldID, st.Mould_No, st.Mould_Name
  , case when st.Est_Completion_Date is null then '' else Convert(varchar(10), st.Est_Completion_Date,111) end as Est_Completion_Date
  , case when st.Ship_Date is null then '' else Convert(varchar(10), st.Ship_Date,111) end as Ship_Date
  , case when st.Arrival_Date is null then '' else Convert(varchar(10), st.Arrival_Date,111) end as Arrival_Date
  From (Select Style_No From @Tmp Group by Style_No) t
  Inner Join Style_Mould st with(NoWait,NoLock) on t.Style_No = st.Style_No
  Order by Style_No;

  `, req.body) ;
  //console.log(strSQL)
  db.sql(req.SiteDB, strSQL)
     .then((result) => {              
        var DataSet = { Detail_Info: result.recordsets[0] //, Tooling_Info: result.recordsets[1], Mould_Info: result.recordsets[2]
        }
        
        result.recordsets[0].forEach((item,index)=>{
            item.RecNo = index + 1
            item.Tooling_Info = result.recordsets[1].filter((obj)=>(item.Style_No == obj.Style_No))
            item.Mould_Info = result.recordsets[2].filter((obj)=>(item.Style_No == obj.Style_No))
        })
        //console.log(DataSet)
        res.send(DataSet);
     }).catch((err) => {
        console.log(err);
        res.status(500).send(err);
     })
});

//Maintain Technology Transfer Model Control
router.post('/Technology_Transfer_Model_Control_Maintain',  function (req, res, next) {
  console.log("Call Technology_Transfer_Model_Control_Maintain Api:",req.body);

  // req.body.Mode === 0 表示修改 Style 欄位資料
  // req.body.Mode === 1 表示修改 Style_Workshop 欄位資料
  // req.body.Mode === 2 表示修改 Style_Mould 欄位資料
  var Size = 0;
  
  req.body.Value = req.body.Value ? `'${req.body.Value}'` : `null`;

  switch(req.body.Mode){
    case 0:
      req.body.Style_No = req.body.Style_No ? `N'${req.body.Style_No.trim().substring(0,20).replace(/'/g, "''")}'` : `''`; 
    break;
    case 1:
      req.body.Style_WorkshopID = req.body.Style_WorkshopID ? req.body.Style_WorkshopID : ``;
    break;
    case 2:
      req.body.Style_MouldID = req.body.Style_MouldID ? req.body.Style_MouldID : ``;
    break;
 }

  var strSQL = ``
  switch(req.body.Mode){
     case 0:
        strSQL = format(`
           Update Style Set [{Name}] = {Value}
           Where Style_No = {Style_No};
           Select @@ROWCOUNT as Flag;         
        `, req.body);
     break;
     case 1:
        strSQL = format(`         
           Update [dbo].[Style_Workshop] Set [{Name}] = {Value}
           where Style_WorkshopID = {Style_WorkshopID};
           Select @@ROWCOUNT as Flag;           
        `, req.body);
     break;
     case 2:
        strSQL = format(`
           Update Style_Mould Set [{Name}] = {Value}
           Where Style_MouldID = {Style_MouldID};
           Select @@ROWCOUNT as Flag;
        `, req.body);
     break;
  }

  //console.log(strSQL)
  db.sql(req.Enterprise , strSQL)
     .then((result) => {
        //console.log(result.recordsets[0])
        res.send({Flag:result.recordsets[0][0].Flag > 0});
     }).catch((err) => {
        console.log(err);
        res.status(500).send(err);
     })

});

//Get PreProcessing_Control_Info
router.post('/PreProcessing_Control_Info',  function (req, res, next) {
  console.log("Call PreProcessing_Control_Info Api:");  

  // req.body.Mode === 0 表示取得 面部前期加工 生產進度管制  面部 Component_GroupID: 1:Upper 7:Accessory 9:Vamp
  // req.body.Mode === 1 表示取得 底部前期加工 生產進度管制  底部 Component_GroupID: 1:Sole
  req.body.Mode = req.body.Mode ? req.body.Mode:0;
  req.body.Component_GroupID = req.body.Mode == 0 ? '1, 7 , 9': '3'
  req.body.Factory_SubID = req.body.Factory_SubID ? `N'${req.body.Factory_SubID.trim().substring(0,15).replace(/'/g, "''")}'` : `''`; 
  req.body.Produce_LineID = req.body.Produce_LineID ? `N'${req.body.Produce_LineID.trim().substring(0,15).replace(/'/g, "''")}'` : `''`; 
  req.body.Plan_Month = req.body.Plan_Month ? `'${req.body.Plan_Month.trim().substring(0,7)}'` : `'${moment().format('YYYY/MM')}'`; 
  req.body.Brand = req.body.Brand ? `N'${req.body.Brand.trim().substring(0,30).replace(/'/g, "''")}'` : `''`;
  req.body.Produce_No = req.body.Produce_No ? `N'${req.body.Produce_No.trim().substring(0,20).replace(/'/g, "''")}'` : `''`;  
  req.body.Work_GangID = req.body.Work_GangID ? `'${req.body.Work_GangID}'` : `'All'`;
  
  
  var strSQL = format(`
Declare @TmpProduce table (Produce_No varchar(20), Product_No varchar(25), Qty float, Produce_LineID varchar(20), Stitching_S DateTime, Lasting_S DateTime)

Insert @TmpProduce
SELECT top 500 ISNULL(p.Produce_No, N'') AS Produce_No
, ISNULL(p.Product_No, N'') AS Product_No
, p.Qty
, p.Produce_LineID
, p.Stitching_S
, p.Lasting_S
FROM Produce p with(NoLock,NoWait)
WHERE ({Factory_SubID} = 'All' or ISNULL(p.Factory_SubID, N'') LIKE '%' + {Factory_SubID} + '%')
AND ({Produce_LineID} = 'All' or ISNULL(p.Produce_LineID, N'') LIKE '%' + {Produce_LineID} + '%')
And ({Plan_Month} = 'All' or ISNULL(p.Plan_Month, N'') = {Plan_Month} )
And ({Produce_No} = '' or p.Produce_No = {Produce_No})
Order by p.Plan_Month desc, p.Stitching_S, ISNULL(p.Produce_No, N'');

Select isnull(pc.Photo_Month,'') as Photo_Month
, s.Style_No
, tmp.Produce_No
, tmp.Product_No
, tmp.Qty
, isnull(tmp.Produce_LineID,'') as Produce_LineID
, case when isnull(tmp.Stitching_S,'') = '' then '' else CONVERT(VARCHAR(05), tmp.Stitching_S, 101) end as Stitching_S
, case when isnull(tmp.Lasting_S,'') = '' then '' else CONVERT(VARCHAR(05), tmp.Lasting_S, 101) end as Lasting_S
From @TmpProduce tmp
INNER JOIN Product pc with(NoLock,NoWait) ON tmp.Product_No = pc.Product_No 
INNER JOIN Style s with(NoLock,NoWait) ON s.Style_No = pc.Style_No
Where ({Brand} = 'All' or ISNULL(s.Brand, N'') = {Brand} );

Declare @TmpPreProcessing table (Work_GangID int, Work_Gang_Name nvarchar(255), Style_WorkshopID int, Produce_No varchar(20), Tooling_Name varchar(30), Workshop nvarchar(50), Qty float, Est_Work_Start_Min Datetime, Est_Work_Start_Max Datetime)

Insert @TmpPreProcessing
Select w.Work_GangID
, fwg.Work_Gang_Name
, wd.Style_WorkshopID
, tmp.Produce_No
, sw.Tooling_Name
, wp.Workshop
, (wd.Goal_Qty) as Qty
, Min(w.Est_Work_Start) as Est_Work_Start_Min
, Max(w.Est_Work_Start) as Est_Work_Start_Max
From @TmpProduce tmp
Inner Join [Worksheet] w with(NoLock,NoWait) on tmp.Produce_No = w.Produce_No
Inner Join [Worksheet_Detail] wd with(NoLock,NoWait) on w.WorksheetID = wd.WorksheetID
Inner Join [Style_Workshop] sw with(NoLock,NoWait) on wd.Style_WorkshopID = sw.Style_WorkshopID 
Inner Join [Style_Process] sp with(NoLock,NoWait) on sw.Style_ProcessID = sp.Style_ProcessID 
Inner Join [Workshop] wp with(NoLock,NoWait) on sw.WorkshopID = wp.WorkshopID 
Inner Join [Product_Component] pc with(NoLock,NoWait) on sp.ComponentID = pc.ComponentID 
--Inner Join [Product_Component_Group] pg with(NoLock,NoWait) on pc.Component_GroupID = pg.Component_GroupID 
Inner Join Factory_Work_Gang fwg with(NoLock,NoLock) on fwg.Work_GangID = w.Work_GangID
Where pc.Component_GroupID in ({Component_GroupID})
And isnull(sw.Tooling_Name,'') <> ''
And ({Work_GangID} = 'All' or w.Work_GangID = {Work_GangID})
Group by w.Work_GangID, fwg.Work_Gang_Name, wd.Style_WorkshopID, tmp.Produce_No, wp.Workshop, sw.Tooling_Name, wd.Goal_Qty;

Select tmp.Style_WorkshopID
, tmp.Workshop
From @TmpPreProcessing tmp
Group by tmp.Style_WorkshopID, tmp.Workshop;

Select distinct tmp.Work_GangID
, tmp.Work_Gang_Name
, tmp.Style_WorkshopID
, tmp.Produce_No
, (tmp.Qty) as Qty
, case when tmp.Est_Work_Start_Min is not null then Substring(Convert(varchar(10), tmp.Est_Work_Start_Min, 111),6,5) end +
 case when Est_Work_Start_Min is not null and Est_Work_Start_Max is not null and tmp.Est_Work_Start_Min <> tmp.Est_Work_Start_Max then ' - ' else '' end +
 case when tmp.Est_Work_Start_Max is not null and tmp.Est_Work_Start_Min <> tmp.Est_Work_Start_Max then Substring(Convert(varchar(10), tmp.Est_Work_Start_Max, 111),6,5) else '' end
as Est_Work_Start
From @TmpPreProcessing tmp
Order by Produce_No, tmp.Style_WorkshopID, Est_Work_Start;
  `, req.body) ;
  //console.log(strSQL)
  db.sql(req.SiteDB, strSQL)
     .then((result) => {
        
        var DataSet = {Detail_Info:result.recordsets[0]
          ,PreProcessing: result.recordsets[1]};

        result.recordsets[0].forEach((item)=>{  
          var tmpWorkSheet = result.recordsets[2].filter((data)=>(data.Produce_No == item.Produce_No));
          item.Processing_Info = [];
          result.recordsets[1].forEach((info,idx)=>{
            tmpWorkSheet.forEach((o, index)=>{              
              if(o.Style_WorkshopID == info.Style_WorkshopID) {                 
                item.Processing_Info.push({Style_WorkshopID:o.Style_WorkshopID
                  , Qty:o.Qty
                  , Est_Work_Start:o.Est_Work_Start
                  , Work_GangID:o.Work_GangID
                  , Work_Gang_Name:o.Work_Gang_Name})
              }
           })  
          })
        })
        res.send(DataSet);
     }).catch((err) => {
        console.log(err);
        res.status(500).send(err);
     })
});

//取得 Produce_Wrapping Lot No
router.post('/Produce_Wrapping_Lot_No', function (req, res, next) {
  console.log("Call Produce_Wrapping_Lot_No API ")
  req.body.Produce_No = req.body.Produce_No ? `N'${req.body.Produce_No.trim().substring(0,20).replace(/'/g, "''")}'` : `''`;  

  var strSQL = format(`SELECT Produce_No
   FROM Produce with(NoLock,NoWait)
   Where Produce_Wrapping_Maker is not null
   And Produce_No <> {Produce_No}
   ORDER BY Produce_No `, req.body);
 
  //console.log(strSQL)
  db.sql(req.SiteDB, strSQL)
    .then((result) => {
      res.send(result.recordset);
    }).catch((err) => {
      console.log(err);
      res.status(500).send(err);
    })

});

//取得 Produce_Wrapping Component
router.post('/Produce_Wrapping_Component', function (req, res, next) {
  console.log("Call Produce_Wrapping_Component API ")
  var strSQL = format(`SELECT ComponentID
   , Component
   FROM Product_Component with(NoLock,NoWait)
   Where Component_GroupID in (4,5)
   ORDER BY Component `);

  db.sql(req.Enterprise, strSQL)
    .then((result) => {
      res.send(result.recordset);
    }).catch((err) => {
      console.log(err);
      res.status(500).send(err);
    })

});

//Get Produce_Wrapping_Info
router.post('/Produce_Wrapping_Info',  function (req, res, next) {
  console.log("Call Produce_Wrapping_Info Api:");  

  // req.body.Mode === 0 表示取得 Lot與Produce_Wrapping資料
  // req.body.Mode === 1 表示取得 Lot資料
  // req.body.Mode === 2 表示取得 Produce_Wrapping資料
  req.body.Mode = req.body.Mode ? req.body.Mode:0;
  req.body.Produce_No = req.body.Produce_No ? `N'${req.body.Produce_No.trim().substring(0,20).replace(/'/g, "''")}'` : `''`;  
  
  var strSQL = format(`Declare @Mode int = {Mode}, @Produce_No varchar(20) = {Produce_No}, @Product_No varchar(25)

if(@Mode = 0 or @Mode = 1)
Begin
  SELECT top 500 ISNULL(p.Produce_No, N'') AS Produce_No
  , ISNULL(p.Product_No, N'') AS Product_No
  , p.Qty
  , p.Produce_LineID
  , p.Stitching_S
  , p.Lasting_S
  FROM Produce p with(NoLock,NoWait)
  WHERE (p.Produce_No = @Produce_No);
End

if(@Mode = 0 or @Mode = 2)
Begin
  SELECT p.Produce_WrappingID
  , p.ComponentID
  , pc.Component
  , p.C_Rmk
  , p.MaterialID
  , p.Material_Category
  , p.Material_DetailID
  , p.Material_Specific
  , p.Material_ColorID
  , p.Material_Color
  , p.M_Rmk
  , p.Qty
  , iif(p.Size_From is null, '-', (Select Size_Name From Product_Size ps where ps.SizeID = p.Size_From) ) as Size_From
  , iif(p.Size_End is null, '-', (Select Size_Name From Product_Size ps where ps.SizeID = p.Size_End) ) as Size_End
  , p.Memo
  , p.Unit
  , p.SupplierID
  , p.Currency
  , p.Quot_Price
  , p.Unit_Price
  , p.Net_Consist
  , cast( IIf(p.[Net_Consist]=0,0,1/(p.[Net_Consist]*p.[Qty])) as money) AS PRS_Unit
  , cast((p.[Net_Consist]*p.[Qty]) as money) as Pair_Consist
  , p.T_Net_Qty
  FROM Produce_Wrapping p with(NoLock,NoWait)
  Left Outer Join Product_Component pc with(NoLock,NoWait) on p.ComponentID = pc.ComponentID
  WHERE p.Produce_No = @Produce_No;
End

  `, req.body) ;
  //console.log(strSQL)
  db.sql(req.SiteDB, strSQL)
     .then((result) => {
        
        var DataSet = {Head_Info:result.recordsets[0]
          ,Detail_Info: result.recordsets[1]};

        res.send(DataSet);
     }).catch((err) => {
        console.log(err);
        res.status(500).send(err);
     })
});

//Maintain Produce_Wrapping
router.post('/Produce_Wrapping_Maintain',  function (req, res, next) {
  console.log("Call Produce_Wrapping_Maintain Api:",req.body);

  // req.body.Mode === 0 表示新增
  // req.body.Mode === 1 表示修改 
  // req.body.Mode === 2 表示刪除
  // req.body.Mode === 3 表示全部刪除
  // req.body.Mode === 4 表示由選定的Produce_No匯入
  // req.body.Mode === 5 表示修改材料 
  req.body.Produce_WrappingID = req.body.Produce_WrappingID ? req.body.Produce_WrappingID : null;
  req.body.Produce_No = req.body.Produce_No ? `N'${req.body.Produce_No.trim().substring(0,20).replace(/'/g, "''")}'` : `''`;  
 
  var strSQL = format(`Declare @ROWCOUNT int = 0, @Produce_WrappingID int = {Produce_WrappingID}, @Produce_No varchar(20) = {Produce_No}`,req.body);
  switch(req.body.Mode){
    case 0:
      req.body.ComponentID = req.body.ComponentID ? req.body.ComponentID : null;
      req.body.Material_ColorID = req.body.Material_ColorID ? req.body.Material_ColorID : null;

      strSQL += format(`
      Insert into [dbo].[Produce_Wrapping] ( [Produce_No], [ComponentID], [MaterialID], [Material_DetailID], [Material_ColorID]
      ,[Material_Category], [Material_Specific], [Material_Color]
      , [Net_Consist], [Qty],[Size_From], [Size_End], [Unit], [SupplierID], [Currency]
      ,[Quot_Price], [Unit_Price],[T_Net_Qty])
      Select @Produce_No as Produce_No, {ComponentID}, m.MaterialID, md.Material_DetailID, mc.Material_ColorID
      , m.Material_Category, md.Material_Specific, mc.Material_Color
      , 0 as Net_Consist, 1 as Qty, null as Size_From, null as Size_End, m.Unit, mc.SupplierID, mc.Currency
      , mc.Unit_Price as Quot_Price, mc.Purchase_Price as Unit_Price, 0 as T_Net_Qty
      From Material m 
      Inner Join Material_Detail md on m.MaterialID = md.MaterialID
      Inner Join Material_Color mc on mc.Material_DetailID = md.Material_DetailID
      Where mc.Material_ColorID = {Material_ColorID}
      
      Set @ROWCOUNT = @@ROWCOUNT;
      `, req.body);
    break;
    case 1: 
      var Size = 0;
      switch(req.body.Name){
        case "C_Rmk":
          Size = 16;
        break;
        case "M_Rmk":
          Size = 50;
        break;
        default:
        break;
      }
      req.body.Value = Size == 0 ? (req.body.Value != null ? req.body.Value : null) : (req.body.Value ? `N'${req.body.Value.trim().replace(/'/g, "''")}'` : `''`);


      switch(req.body.Name){
        case "M_Rmk":
        case "C_Rmk":
          strSQL += format(`
            Update [dbo].[Produce_Wrapping] Set [{Name}] = ${Size == 0 ? '{Value}': `substring({Value},1,${Size})`}
            where Produce_WrappingID = {Produce_WrappingID};
  
            Set @ROWCOUNT = @@ROWCOUNT;
            `, req.body);
          break;
        case "Size_From":
          strSQL += format(`
            Update [dbo].[Produce_Wrapping] Set [{Name}] = ${Size == 0 ? '{Value}': `substring({Value},1,${Size})`}
            ${req.body.Value == -1 || req.body.Value == 0 || req.body.Value == null ? `, Size_End = ${ req.body.Value }`:''}
            where Produce_WrappingID = {Produce_WrappingID};
  
            Set @ROWCOUNT = @@ROWCOUNT;
            `, req.body);
          break;
        case "Size_End":
          strSQL += format(`
            Update [dbo].[Produce_Wrapping] Set [{Name}] = ${Size == 0 ? '{Value}': `substring({Value},1,${Size})`}
            ${req.body.Value == -1 || req.body.Value == 0 || req.body.Value == null ? `, Size_From = ${ req.body.Value }`:''}
            where Produce_WrappingID = {Produce_WrappingID};
  
            Set @ROWCOUNT = @@ROWCOUNT;
            `, req.body);
          break;
          case "Qty":
            strSQL += format(`
              Update [dbo].[Produce_Wrapping] Set [T_Net_Qty] = iif(Size_From is null, [T_Net_Qty], cast(Net_Consist * iif({Value}=0,1, {Value}) as Money))
              , Qty = iif(Size_From is null, 1, iif({Value}=0,1, {Value}))
              where Produce_WrappingID = {Produce_WrappingID};
    
              Set @ROWCOUNT = @@ROWCOUNT;
              `, req.body);
            break;
          case "Net_Consist":
            strSQL += format(`
              Update [dbo].[Produce_Wrapping] Set [T_Net_Qty] = iif(Size_From is null, [T_Net_Qty], cast({Value} * iif(Qty=0,1,Qty) as money))
              , Qty = iif(Size_From is null, 1 ,iif(Qty=0,1,Qty))
              , Net_Consist = iif(Size_From is null, 0, cast({Value} as money))
              where Produce_WrappingID = {Produce_WrappingID};
    
              Set @ROWCOUNT = @@ROWCOUNT;
              `, req.body);
            break;
          case "PRS_Unit":
            strSQL += format(`
              Update [dbo].[Produce_Wrapping] Set [T_Net_Qty] = case when iif([Net_Consist]=0, 0, iif({Value}=0,0, 1/{Value} / [Net_Consist]) ) = 0 then 1 else iif([Net_Consist]=0, 0, iif({Value}=0,0, 1/{Value} / [Net_Consist]) ) End 
              * iif({Value}=0, 0 , 1/{Value} / iif(Qty=0,1,Qty) )
              , Qty = case when iif([Net_Consist]=0, 0, iif({Value}=0,0, 1/{Value} / [Net_Consist]) ) = 0 then 1 else iif([Net_Consist]=0, 0, iif({Value}=0,0, 1/{Value} / [Net_Consist]) ) End
              , Net_Consist = iif({Value}=0, 0 , 1/{Value} / iif(Qty=0,1,Qty) )
              where Produce_WrappingID = {Produce_WrappingID};
    
              Set @ROWCOUNT = @@ROWCOUNT;
              `, req.body);
            break;
          case "Pair_Consist":
            strSQL += format(`
              Update [dbo].[Produce_Wrapping] Set [T_Net_Qty] = iif(Size_From is null, [T_Net_Qty], {Value})
              , Qty = iif(Size_From is null, 1, iif(isnull(Qty,0)=0, 1, Qty) )
              , Net_Consist = iif(Size_From is null, 0, ({Value} / iif(isnull(Qty,0)=0, 1, Qty)) )
              where Produce_WrappingID = {Produce_WrappingID};
    
              Set @ROWCOUNT = @@ROWCOUNT;
              `, req.body);
            break;
          case "T_Net_Qty":
            strSQL += format(`
              Update [dbo].[Produce_Wrapping] Set [T_Net_Qty] = {Value}
              , Qty = iif(Size_From is null, 1, iif(isnull(Qty,0)=0, 1, Qty))
              , Net_Consist =  iif(Size_From is null, 0, ({Value} / iif(isnull(Qty,0)=0, 1, Qty)) )
              where Produce_WrappingID = {Produce_WrappingID};
    
              Set @ROWCOUNT = @@ROWCOUNT;
              `, req.body);
            break;
          default:
          strSQL += format(`
          Update [dbo].[Produce_Wrapping] Set [{Name}] = ${Size == 0 ? '{Value}': `substring({Value},1,${Size})`}
          where Produce_WrappingID = {Produce_WrappingID};

          Set @ROWCOUNT = @@ROWCOUNT;
          `, req.body);
        break;
      }


    break;
    case 2:
      strSQL += format(`
      Delete From Produce_Wrapping 
      where Produce_WrappingID = {Produce_WrappingID};  

      Set @ROWCOUNT = @@ROWCOUNT;
      `, req.body);
    break;
    case 3:
      strSQL += format(`
      Delete From Produce_Wrapping 
      where Produce_No = {Produce_No};  

      Set @ROWCOUNT = @@ROWCOUNT;
      `, req.body);
    break;
    case 4:
      req.body.From_Produce_No = req.body.From_Produce_No ? `N'${req.body.From_Produce_No.replace(/'/g, "''")}'` : `''`;
      strSQL += format(`
      Insert into [dbo].[Produce_Wrapping] ( [Produce_No], [ComponentID], [C_Rmk], [MaterialID], [Material_DetailID], [Material_ColorID]
      ,[Material_Category], [Material_Specific], [Material_Color], [M_Rmk], [Net_Consist], [Qty]
      ,[Size_From], [Size_End], [Memo], [Unit], [SupplierID], [Currency]
      ,[Quot_Price], [Unit_Price],[T_Net_Qty])
      Select @Produce_No as Produce_No, ComponentID, C_Rmk, MaterialID, Material_DetailID, Material_ColorID
      , Material_Category, Material_Specific, Material_Color, M_Rmk, Net_Consist, Qty
      , Size_From, Size_End, Memo, Unit, SupplierID, Currency
      , Quot_Price, Unit_Price, T_Net_Qty
      From Produce_Wrapping p
      Where p.Produce_No = {From_Produce_No}

      Set @ROWCOUNT = @@ROWCOUNT;
      `, req.body);
    break;

    case 5:
      req.body.Material_ColorID = req.body.Material_ColorID ? req.body.Material_ColorID : null;

      strSQL += format(`
      Update [dbo].[Produce_Wrapping] set MaterialID = tmp.MaterialID, [Material_DetailID] = tmp.Material_DetailID, [Material_ColorID] = tmp.Material_ColorID
      ,[Material_Category] = tmp.Material_Category, [Material_Specific] = tmp.Material_Specific, [Material_Color] = tmp.Material_Color
      , [Unit] = tmp.Unit, [SupplierID] = tmp.SupplierID, [Currency] = tmp.Currency
      ,[Quot_Price] = tmp.Quot_Price, [Unit_Price] = tmp.Unit_Price
      From [dbo].[Produce_Wrapping] p
      Inner Join (
        Select @Produce_WrappingID as Produce_WrappingID, m.MaterialID, md.Material_DetailID, mc.Material_ColorID
        , m.Material_Category, md.Material_Specific, mc.Material_Color
        , m.Unit, mc.SupplierID, mc.Currency
        , mc.Unit_Price as Quot_Price, mc.Purchase_Price as Unit_Price
        From Material m 
        Inner Join Material_Detail md on m.MaterialID = md.MaterialID
        Inner Join Material_Color mc on mc.Material_DetailID = md.Material_DetailID
        Where mc.Material_ColorID = {Material_ColorID}
      ) tmp on p.Produce_WrappingID = tmp.Produce_WrappingID
      Where p.Produce_WrappingID = @Produce_WrappingID;  
      
      Set @ROWCOUNT = @@ROWCOUNT;
      `, req.body);
    break;    
  }

  strSQL += format(`
  Select @ROWCOUNT as Flag;

  if(@ROWCOUNT > 0) 
  Begin
    Update Produce set Produce_Wrapping_Maker = isnull(Produce_Wrapping_Maker, '${req.UserID}')
    , Produce_Wrapping_Data_Updater = '${req.UserID}'
    , Produce_Wrapping_Data_Update = GetDate()
    Where Produce_No = @Produce_No
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

//取得Customer資料
router.post('/Customer', function (req, res, next) {
  console.log("Call Customer Api:", req.body);

  var strSQL = format(`
  SELECT distinct CustomerID
  FROM [Orders] o with(NoLock,NoWait)
  Order by CustomerID;
  `, req.body);

  //console.log(strSQL)
  db.sql(req.SiteDB, strSQL)
    .then((result) => {
      //console.log(result)
      res.send(result.recordsets[0]);
    }).catch((err) => {
      console.log(err);
      res.status(500).send(err);
    })
});


//取得Season資料
router.post('/Season', function (req, res, next) {
  console.log("Call Season Api:", req.body);

  var strSQL = format(`
  SELECT distinct s.Season,s.SortID
  FROM [Orders] o with(NoLock,NoWait)
  Inner Join [Season] s on o.Season = s.Season
  Order by s.SortID desc;
  `, req.body);

  //console.log(strSQL)
  db.sql(req.SiteDB, strSQL)
    .then((result) => {
      //console.log(result)
      res.send(result.recordsets[0]);
    }).catch((err) => {
      console.log(err);
      res.status(500).send(err);
    })
});

//Get Production_Progress_List
router.post('/Production_Progress_List',  function (req, res, next) {
  console.log("Call Production_Progress_List Api:",req.body);  

  req.body.CustomerID = req.body.CustomerID ? `N'${req.body.CustomerID.trim().substring(0,30).replace(/'/g, "''")}'` : `''`; 
  req.body.Brand = req.body.Brand ? `N'${req.body.Brand.trim().substring(0,30).replace(/'/g, "''")}'` : `''`; 
  req.body.Season = req.body.Season ? `N'${req.body.Season.trim().substring(0,10).replace(/'/g, "''")}'` : `''`; 
  req.body.Purpose = req.body.Purpose ? `N'${req.body.Purpose.trim().substring(0,15).replace(/'/g, "''")}'` : `'All'`; 
  req.body.Factory_SubID = req.body.Factory_SubID ? `N'${req.body.Factory_SubID.trim().substring(0,20).replace(/'/g, "''")}'` : `''`; 
  req.body.Produce_LineID = req.body.Produce_LineID ? `N'${req.body.Produce_LineID.trim().substring(0,10).replace(/'/g, "''")}'` : `''`; 
  req.body.Purchase_Project_No = req.body.Purchase_Project_No ? `N'${req.body.Purchase_Project_No.trim().substring(0,25).replace(/'/g, "''")}'` : `''`; 
  req.body.Produce_No = req.body.Produce_No ? `N'${req.body.Produce_No.trim().substring(0,25).replace(/'/g, "''")}'` : `''`; 
  req.body.Delivery_From = req.body.Delivery_From ? `'${req.body.Delivery_From.trim().substring(0,10).replace(/'/g, "''")}'` : `'1900/01/01'`; 
  req.body.Delivery_To = req.body.Delivery_To ? `'${req.body.Delivery_To.trim().substring(0,10).replace(/'/g, "''")}'` : `'3500/01/01'`; 
  req.body.Est_Last_From = req.body.Est_Last_From ? `'${req.body.Est_Last_From.trim().substring(0,10).replace(/'/g, "''")}'` : `''`; 
  req.body.Est_Last_To = req.body.Est_Last_To ? `'${req.body.Est_Last_To.trim().substring(0,10).replace(/'/g, "''")}'` : `''`; 
  req.body.Last_From = req.body.Last_From ? `'${req.body.Last_From.trim().substring(0,10).replace(/'/g, "''")}'` : `''`; 
  req.body.Last_To = req.body.Last_To ? `'${req.body.Last_To.trim().substring(0,10).replace(/'/g, "''")}'` : `''`; 
  req.body.Shipment_Closed = req.body.Shipment_Closed ? 1 : 0;

  var strSQL = format(` Declare @CustomerID nvarchar(30) = {CustomerID}, @Brand nvarchar(30) = {Brand}
, @Season nvarchar(10) = {Season}, @Purpose nvarchar(15) = {Purpose}
, @Factory_SubID nvarchar(20) = {Factory_SubID}, @Produce_LineID nvarchar(10) = {Produce_LineID}
, @Purchase_Project_No nvarchar(25) = {Purchase_Project_No}, @Produce_No nvarchar(25) = {Produce_No}
, @Delivery_From nvarchar(10) = {Delivery_From}, @Delivery_To nvarchar(10) = {Delivery_To}
, @Est_Last_From nvarchar(10) = {Est_Last_From}, @Est_Last_To nvarchar(10) = {Est_Last_To}
, @Last_From nvarchar(10) = {Last_From}, @Last_To nvarchar(10) = {Last_To}

Declare @tmpTable table(Purchase_Project_No nvarchar(25), Produce_No nvarchar(25), Factory_SubID nvarchar(25),  Produce_LineID nvarchar(25)
, CustomerID nvarchar(25), Brand nvarchar(25), Product_No nvarchar(25), Qty float, Upper_A nvarchar(10), Buttom_A nvarchar(10)
, Photo_Month nvarchar(10), Name nvarchar(50)
, Last_No nvarchar(100), Outsole_No nvarchar(100) 
, Orig_Shipping_Date nvarchar(10), Est_Shipping_Date nvarchar(10)
, Order_No Nvarchar(25), Destination Nvarchar(50)
, P_Cutting_S Nvarchar(10), P_Cutting_F Nvarchar(10), P_Cutting_Qty float
, P_Stitching_S Nvarchar(10), P_Stitching_F Nvarchar(10),  P_Stitching_Qty float
, P_Lasting_S Nvarchar(10), P_Lasting_F Nvarchar(10), P_Lasting_Qty float
)

insert @tmpTable
Select p.Purchase_Project_No, p.Produce_No, p.Factory_SubID, p.Produce_LineID
, o.CustomerID, o.Brand, p.Product_No, Sum(od.Qty) as Qty
, convert(nvarchar(10),p.Upper_A,111) as Upper_A, convert(nvarchar(10),p.Buttom_A,111) as Buttom_A
, pt.Photo_Month, pt.[Name]
, s.Last_No, s.Outsole_No
, convert(nvarchar(10),od.Orig_Shipping_Date,111) as Orig_Shipping_Date
, convert(nvarchar(10),od.Est_Shipping_Date,111) as Est_Shipping_Date
, od.Order_No, od.Destination 
, convert(nvarchar(10),p.Cutting_S,111) as Cutting_S, convert(nvarchar(10),p.Cutting_F,111) as Cutting_F, isnull(p.Cutting_Qty,0) as Cutting_Qty
, convert(nvarchar(10),p.Stitching_S,111) as Stitching_S, convert(nvarchar(10),p.Stitching_F,111) as Stitching_F, isnull(p.Stitching_Qty,0) as Stitching_Qty
, convert(nvarchar(10),p.Lasting_S,111) as Lasting_S, convert(nvarchar(10),p.Lasting_F,111) as Lasting_F, isnull(p.Lasting_Qty,0) as Lasting_Qty
From Orders o with(NoLock,NoWait) 
Inner Join Order_Detail od with(NoLock,NoWait)  on o.Order_No = od.Order_No And o.Purpose <> 'Forecast'
Inner Join Produce p with(NoLock,NoWait)  on od.Produce_No = p.Produce_No And ABS(isnull(p.UnProduce,0)) <> 1
left outer Join Product pt with(NoLock,NoWait)  on pt.Product_No = od.Product_No
left outer Join Style s with(NoLock,NoWait) on s.Style_No = pt.Style_No
Where (@CustomerID = '' or o.CustomerID Like '%'+@CustomerID+'%')
And (@Brand = '' or o.Brand Like '%'+@Brand+'%')
And (@Season = '' or o.Season Like '%'+@Season+'%')
And (@Purpose = 'All' or o.Purpose Like '%'+@Purpose+'%')
And (@Factory_SubID = '' or p.Factory_SubID Like '%'+@Factory_SubID+'%')
And (@Produce_LineID = '' or p.Produce_LineID Like '%'+@Produce_LineID+'%')
And (@Purchase_Project_No = '' or p.Purchase_Project_No Like '%'+@Purchase_Project_No+'%')
And (@Produce_No = '' or p.Produce_No Like '%'+@Produce_No+'%')
And (od.Orig_Shipping_Date between @Delivery_From And @Delivery_To)
And (( {Est_Last_From} = '' or {Est_Last_To} = '' ) or p.Lasting_F between @Est_Last_From And @Est_Last_To)
And ( 1 = {Shipment_Closed} or (abs(isnull(p.Shipmented,0)) = 0) )
Group by p.Purchase_Project_No, p.Produce_No, p.Factory_SubID, p.Produce_LineID
, o.CustomerID, o.Brand, p.Product_No, p.Upper_A, p.Buttom_A
, pt.Photo_Month, pt.Name
, s.Last_No, s.Outsole_No
, od.Orig_Shipping_Date
, od.Est_Shipping_Date
, od.Order_No, od.Destination
, p.Cutting_S, p.Cutting_F, p.Cutting_Qty
, p.Stitching_S, p.Stitching_F, p.Stitching_Qty
, p.Lasting_S, p.Lasting_F, p.Lasting_Qty


--0 Order and Produce Info
Select t.Brand, t.Purchase_Project_No, t.Produce_No, t.Factory_SubID, t.Produce_LineID
, t.CustomerID, t.Product_No, Sum(t.Qty) as Qty, t.Upper_A, t.Buttom_A
, t.Photo_Month, t.[Name]
, t.Last_No, t.Outsole_No
, min(t.Orig_Shipping_Date) as Orig_Shipping_Date
, min(t.Est_Shipping_Date) as Est_Shipping_Date
, t.P_Cutting_S, t.P_Cutting_F, t.P_Cutting_Qty
, t.P_Stitching_S, t.P_Stitching_F, t.P_Stitching_Qty
, t.P_Lasting_S, t.P_Lasting_F, t.P_Lasting_Qty
from @tmpTable t
Inner Join (
    Select distinct tt.Produce_No
    From (Select distinct Produce_No From @tmpTable) tt
    Left Outer Join Produce_Daily_Detail pdd on pdd.Produce_No = tt.Produce_No
    Left Outer Join Produce_Daily pd on pd.Produce_DailyID = pdd.Produce_DailyID
    And (( @Last_From = '' or @Last_To = '' ) or (pd.Date between @Last_From And @Last_To and isnull(pdd.Lasting_Qty,0) <> 0))
)t1 on t1.Produce_No = t.Produce_No
Group by t.Brand, t.Purchase_Project_No, t.Produce_No, t.Factory_SubID, t.Produce_LineID
, t.CustomerID, t.Product_No, t.Upper_A, t.Buttom_A
, t.Photo_Month, t.[Name]
, t.Last_No, t.Outsole_No
--, t.Orig_Shipping_Date
--, t.Est_Shipping_Date
, t.P_Cutting_S, t.P_Cutting_F, t.P_Cutting_Qty
, t.P_Stitching_S, t.P_Stitching_F, t.P_Stitching_Qty
, t.P_Lasting_S, t.P_Lasting_F, t.P_Lasting_Qty
--Having min(t.Orig_Shipping_Date) >= @Delivery_From And min(t.Orig_Shipping_Date) <= @Delivery_To
Order by t.P_Lasting_F

--1 Order Destination Info
Select t.Produce_No, t.Order_No, t.Destination, Sum(t.Qty) as Qty
From @tmpTable t
Group by t.Produce_No, t.Order_No, t.Destination

--2 Produce Daily Cutting Info
Select pdd.Produce_No, convert(nvarchar(10),min(pd.[Date]),111) as D_Cutting_S, convert(nvarchar(10),Max(pd.date),111) as D_Cutting_F, sum(pdd.Cutting_Qty) as D_Cutting_Qty
From (Select distinct Produce_No From @tmpTable ) t
Left Outer Join Produce_Daily_Detail pdd on pdd.Produce_No = t.Produce_No
Left Outer Join Produce_Daily pd on pd.Produce_DailyID = pdd.Produce_DailyID
Where isnull(pdd.Cutting_Qty,0) <> 0
Group by pdd.Produce_No

--3 Produce Daily Stitching Info
Select pdd.Produce_No, convert(nvarchar(10),min(pd.[Date]),111) as D_Stitching_S, convert(nvarchar(10),Max(pd.date),111) as D_Stitching_F, sum(pdd.Stitching_Qty) as D_Stitching_Qty
From (Select distinct Produce_No From @tmpTable ) t
Left Outer Join Produce_Daily_Detail pdd on pdd.Produce_No = t.Produce_No
Left Outer Join Produce_Daily pd on pd.Produce_DailyID = pdd.Produce_DailyID
Where isnull(pdd.Stitching_Qty,0) <> 0
Group by pdd.Produce_No

--4 Produce Daily Lasting Info
Select pdd.Produce_No, convert(nvarchar(10),min(pd.[Date]),111) as D_Lasting_S, convert(nvarchar(10),Max(pd.date),111) as D_Lasting_F, sum(pdd.Lasting_Qty) as D_Lasting_Qty
From (Select distinct Produce_No From @tmpTable ) t
Left Outer Join Produce_Daily_Detail pdd on pdd.Produce_No = t.Produce_No
Left Outer Join Produce_Daily pd on pd.Produce_DailyID = pdd.Produce_DailyID
Where isnull(pdd.Lasting_Qty,0) <> 0
Group by pdd.Produce_No
  `, req.body) ;
//console.log(strSQL)
  db.sql(req.SiteDB, strSQL)
     .then((result) => {       
              
        var DataSet = {Data_Info: result.recordsets[0]
          , Total_Qty: 0
          , Total_Cutting_Qty: 0
          , Total_Stitching_Qty: 0
          , Total_Lasting_Qty: 0
        };
         
        DataSet.Data_Info.forEach((item)=>{
          item.Order_Destination_Info = result.recordsets[1].filter((data)=>(data.Produce_No == item.Produce_No));
          var Produce_Cutting_Info = result.recordsets[2].filter((data)=>(data.Produce_No == item.Produce_No));
          var Produce_Stitching_Info = result.recordsets[3].filter((data)=>(data.Produce_No == item.Produce_No));
          var Produce_Lasting_Info = result.recordsets[4].filter((data)=>(data.Produce_No == item.Produce_No));

          DataSet.Total_Qty += item.Qty;

          item.D_Cutting_S = '';
          item.D_Cutting_F = '';
          item.D_Cutting_Qty = 0;
          Produce_Cutting_Info.forEach((data)=>{
            item.D_Cutting_S = data.D_Cutting_S;
            item.D_Cutting_F = data.D_Cutting_F;
            item.D_Cutting_Qty = data.D_Cutting_Qty;
            DataSet.Total_Cutting_Qty += item.D_Cutting_Qty;
          })

          item.D_Stitching_S = '';
          item.D_Stitching_F = '';
          item.D_Stitching_Qty = 0;
          Produce_Stitching_Info.forEach((data)=>{
            item.D_Stitching_S = data.D_Stitching_S;
            item.D_Stitching_F = data.D_Stitching_F;
            item.D_Stitching_Qty = data.D_Stitching_Qty;
            DataSet.Total_Stitching_Qty += item.D_Stitching_Qty;
          })

          item.D_Lasting_S = '';
          item.D_Lasting_F = '';
          item.D_Lasting_Qty = 0;
          Produce_Lasting_Info.forEach((data)=>{
            item.D_Lasting_S = data.D_Lasting_S;
            item.D_Lasting_F = data.D_Lasting_F;
            item.D_Lasting_Qty = data.D_Lasting_Qty;
            DataSet.Total_Lasting_Qty += item.D_Lasting_Qty;
          })          
        })
        res.send(DataSet);
     }).catch((err) => {
        console.log(err);
        res.status(500).send(err);
     })
});


/* Mark-Wang API End */


/* Darren-Chang API Begin */

// 取得 Factory 資料
router.get('/Factory_Data', function (req, res, next) {
  console.log("Call Factory_Data Api in Production");

  var strSQL = format(`SELECT Factory_SubID, FactoryID, Factory_SubCode, OrganizationID
  FROM Factory_Sub WITH (NoWait, Nolock)
  Where History_Date is null
  Order by FactoryID

`);

  // console.log(strSQL)
  db.sql(req.Enterprise, strSQL)
    .then((result) => {
      // console.log(result)
      res.send(result.recordset);
    }).catch((err) => {
      console.log(err);
      res.status(500).send(err);
    })
});

// PPIC Factory with Lot info
router.get('/PPIC_Factory_Data', function (req, res, next) {
  console.log("Call Factory_Data Api in Production");

  var strSQL = format(`
  SELECT Factory_SubID, FactoryID, Factory_SubCode, (Select [OrganizationID] From Control) as OrganizationID
  FROM Factory_Sub WITH (NoWait, Nolock)
  Where Factory_SubID in (
   SELECT distinct p.Factory_SubID
   from Produce p with(NoLock,NoWait)
   where abs(isnull(p.Shipmented,0)) = 0
   And Plan_Month is not null 
   And Factory_SubID is not null     
  )
   And OrganizationID is not null
  Order by History_Date
`);

  // console.log(strSQL)
  db.sql(req.SiteDB, strSQL)
    .then((result) => {
      // console.log(result)
      res.send(result.recordset);
    }).catch((err) => {
      console.log(err);
      res.status(500).send(err);
    })
});


// 取得 Factory with OrganizationID 資料
router.get('/Factory_Org_Data', function (req, res, next) {
  console.log("Call Factory_Data Api in Production");

  var strSQL = format(`SELECT Factory_SubID, FactoryID, Factory_SubCode, OrganizationID
  FROM Factory_Sub WITH (NoWait, Nolock)
  Where OrganizationID is not null
  Order by History_Date
`);

  // console.log(strSQL)
  db.sql(req.Enterprise, strSQL)
    .then((result) => {
      // console.log(result)
      res.send(result.recordset);
    }).catch((err) => {
      console.log(err);
      res.status(500).send(err);
    })
});

// 取得 Produce_Line 資料
router.get('/Produce_Line', function (req, res, next) {
  console.log("Call Produce_Line Api in Production");

  var strSQL = format(`
  SELECT Produce_LineID, fs.FactoryID, pl.Factory_SubID, Lasting_Type, Pairs_Month, Outsider, 
  Workhours_Per_Day, Workday_Per_Month FROM Produce_Line as pl
  Inner Join Factory_Sub as fs ON pl.Factory_SubID = fs.Factory_SubID

  `);

  // console.log(strSQL)
  db.sql(req.Enterprise, strSQL)
    .then((result) => {
      // console.log(result)
      res.send(result.recordset);
    }).catch((err) => {
      console.log(err);
      res.status(500).send(err);
    })
});

// 取得 Produce_No 為 null 的資料 (且 Date 與 Factory 不可為 null)
router.post('/Auto_Produce_Data', function (req, res, next) {
  console.log("Call Auto_Produce_Data Api in Production");

  var strSQL = format(`SELECT Order_DetailID, isnull(Order_Detail_RefID, 0) as Order_Detail_RefID, o.Order_No, Produce_No, s.Style_No, od.Product_No, Orig_Shipping_Date, Factory_ID as Factory_SubID,
  b.BrandID, o.Brand, isnull(Qty, 0) as Qty, CASE when Produce_No is null then 1 else 0 end as readyForAutoLot FROM Order_Detail od
  Inner Join Orders o ON o.Order_No = od.Order_No
  Inner Join Brand b ON b.Brand = o.Brand
  Inner Join Product p with(NoLock,NoWait) on od.Product_No = p.Product_No      
  Inner Join Style s with(NoLock,NoWait) on p.Style_No = s.Style_No   
  WHERE Produce_No is null and Orig_Shipping_Date is not null and len(isnull(Factory_ID, '')) > 0
  and Orig_Shipping_Date > '2022'
  and (Order_Detail_RefID is null or Order_Detail_RefID = Order_DetailID)
  ${req.body.Date ? 'and convert(varchar(7), Orig_Shipping_Date, 111) = \'{Date}\'': ''}
  ${req.body.Brand ? 'and o.Brand = \'{Brand}\'': ''}
  ${req.body.Order_No ? 'and o.Order_No LIKE \'%{Order_No}%\'': ''}
  ${req.body.Product_No ? 'and od.Product_No LIKE \'%{Product_No}%\'': ''}
  ${req.body.Factory_SubID ? 'and Factory_ID = \'{Factory_SubID}\'': ''}
  Order by Orig_Shipping_Date desc, Factory_ID, s.Style_No

  `, req.body);

  // console.log(strSQL)
  db.sql(req.SiteDB, strSQL)
    .then((result) => {
      // console.log(result)
      result.recordset.forEach(element => {
        element.elements = []
        element.expand = true
      });
      res.send(result.recordset);
    }).catch((err) => {
      console.log(err);
      res.status(500).send(err);
    })
});

// Check Produce_No and Insert @Auto_Produce to [Produce].[Produce_No], [Order_Detail].[Produce_No]
router.post('/Auto_Produce_No', function (req, res, next) {
  console.log(`Call Auto_Produce_No Api, Produce_No: ${req.body.Produce_No}, Style_No: ${req.body.Style_No}, flag 1 = Upate; 2 = Insert.`);

  let strSQL = format(`
  Declare @Order_No varchar(30) = '{Order_No}'
  Declare @Style_No varchar(30) = '{Style_No}'
  Declare @Product_No varchar(30) = '{Product_No}'
  Declare @Auto_Produce varchar(30) = '{Produce_No}'
  Declare @Factory_SubID varchar(10) = '{Factory_SubID}'
  Declare @YYMMDate varchar(4) = '{YYMMDate}'
  Declare @YYYYMMDate varchar(7) = '{YYYYMMDate}'
  Declare @DATETIMEQueue DATETIME = '{DATETIMEQueue}'
  Declare @floatQueue float = Cast(@DATETIMEQueue as float)

  Declare @Detect_Produce varchar(20), @ProductNo_Produce varchar(20), @StyleNo_Produce varchar(20), @Detect_Style_No varchar(20)

  -- SELECT TOP 1 @ProductNo_Produce = Produce_No FROM Produce pdc
  -- Inner Join Product pdt with(NoLock,NoWait) on pdc.Product_No = pdt.Product_No
  -- where Produce_No like '%' + @Auto_Produce + '%' AND pdc.Product_No = @Product_No and pdt.Style_No = @Style_No

  if (@ProductNo_Produce IS NULL)
      BEGIN
          SELECT TOP 1 @StyleNo_Produce = pdc.Produce_No, @Detect_Style_No = pdt.Style_No FROM Produce pdc
          Inner Join Product pdt with(NoLock,NoWait) on pdt.Product_No = pdc.Product_No
          Inner Join Order_Detail od with(NoLock,NoWait) on od.Produce_No = pdc.Produce_No
          WHERE pdc.Produce_No like '%' + @YYMMDate + '%' and pdc.Produce_No NOT LIKE '%-%' and LEFT(pdc.Produce_No, 1) = LEFT(@Auto_Produce, 1)
            and pdt.Style_No = @Style_No and pdc.Factory_SubID = @Factory_SubID ORDER BY pdc.Produce_No DESC
      END
  
  if (@StyleNo_Produce IS NULL)
      BEGIN
          SELECT TOP 1 @Detect_Produce = Produce_No, @Detect_Style_No = pdt.Style_No FROM Produce pdc
          Inner Join Product pdt with(NoLock,NoWait) on pdt.Product_No = pdc.Product_No
          where Produce_No like '%' + @YYMMDate + '%' and Produce_No NOT LIKE '%-%' and LEFT(pdc.Produce_No, 1) = LEFT(@Auto_Produce, 1) and pdc.Factory_SubID = @Factory_SubID ORDER BY Produce_No DESC
      END
  else 
      BEGIN
          SET @Detect_Produce = @StyleNo_Produce
      END
  
  Declare @Eng_Idx int = CASE when @Detect_Produce is NOT NULL then PATINDEX('%[0-9][0-9][A-z]%', @Detect_Produce) else 0 end
  Declare @Int_Idx int = CASE when @Detect_Produce is NOT NULL then PATINDEX('%[0-9]', LEFT(@Detect_Produce, 11)) else 0 end
  Declare @Auto_Increment_ASCII varchar(1) = CASE when @Eng_Idx = 0 then NCHAR(65) else NCHAR((ASCII(SUBSTRING(@Detect_Produce, @Eng_Idx+2, 1)) +1 ))  end
  
  -- Select @Auto_Produce as Auto_Produce1, @Detect_Produce as Detect_Produce, @Detect_Style_No as Detect_Style_No, @ProductNo_Produce as ProductNo_Produce, @StyleNo_Produce as StyleNo_Produce, @Eng_Idx as Eng_Idx, @Int_Idx as Int_Idx, @Auto_Increment_ASCII as Auto_Increment_ASCII

  SET @Auto_Produce = CASE when @ProductNo_Produce IS NOT NULL
    then 
      @ProductNo_Produce
    else 
        (CASE when @Detect_Produce is NULL then @Auto_Produce + RIGHT('001', 3) else
            (CASE when @Auto_Increment_ASCII = '[' then (@Auto_Produce + Right('000' + Cast((CONVERT(int, SUBSTRING(@Detect_Produce, @Eng_Idx-1, 3)) + 1 ) as varchar), 3)) else
                (CASE when @Eng_Idx > @Int_Idx 
                    then -- 以字母結尾
                        (CASE when @Style_No = @Detect_Style_No 
                            then (SELECT SUBSTRING(@Detect_Produce, 1, @Eng_Idx+1) + @Auto_Increment_ASCII)
                            else (@Auto_Produce + Right('000' + Cast((CONVERT(int, SUBSTRING(@Detect_Produce, @Eng_Idx-1, 3)) + 1 ) as varchar), 3))
                        end)
                    else -- 以數字結尾
                        (CASE when @Style_No = @Detect_Style_No 
                            then (SELECT SUBSTRING(@Detect_Produce, 1, @Int_Idx) + @Auto_Increment_ASCII)  
                            else (@Auto_Produce + Right('000' + Cast((CONVERT(int, SUBSTRING(@Detect_Produce, @Int_Idx-2, 3)) + 1 ) as varchar), 3))
                        end)
                end)
            end)
        end)
    end
  
  -- Select @Auto_Produce as Auto_Produce2
  WHILE EXISTS (SELECT Produce_No From Produce WHERE Produce_No = @Auto_Produce)
      BEGIN
          SET @Auto_Increment_ASCII = NCHAR(ASCII(@Auto_Increment_ASCII) + 1)
          SET @Auto_Produce = LEFT(@Auto_Produce, 11) + @Auto_Increment_ASCII
      END
  -- Select @Auto_Produce as Auto_Produce3

  Declare @ROWCOUNT int=0
  Declare @flag int=0

  if(@Auto_Produce = @ProductNo_Produce)
      begin
          Set @flag = 1
          Update [dbo].[Produce] Set [Order_Qty] = [Order_Qty] + {Qty}
          where Produce_No = @Auto_Produce
      end 
  else 
      begin
          Set @flag = 2
          Insert into Produce (Produce_No, produce_Purpose, FactoryID, Factory_SubID, Data_Updater, Data_Update, Product_No, Order_Qty, First_Produce, Queue_No, Plan_Month)
          VALUES (@Auto_Produce, 'Order', '{FactoryID}', '{Factory_SubID}', N'${req.UserID}', GetDate(), '{Product_No}', {Qty}, -1, @floatQueue, @YYYYMMDate)
      end
    
  Set @ROWCOUNT = @@ROWCOUNT;
  if (@ROWCOUNT > 0)
  begin
    Update [dbo].[Order_Detail] Set [Produce_No] = @Auto_Produce
    where Order_DetailID = {Order_DetailID} or Order_Detail_RefID = {Order_Detail_RefID};
  end

  SELECT Produce_No as Auto_Produce, @flag as flag, Order_Qty From Produce where Produce_No = @Auto_Produce
  SELECT Order_DetailID, Order_No, Product_No, Qty FROM Order_Detail WHERE Produce_No = @Auto_Produce
  `, req.body);

  // console.log(strSQL)
  db.sql(req.SiteDB, strSQL)
    .then((result) => {
      // console.log(result.recordsets)
      res.send({
        Produce: result.recordsets[0][0],
        Produce_Detail: result.recordsets[1]
      });
    }).catch((err) => {
      // console.log(err);
      res.status(500).send(err.message);
    })
});

// 新增工廠線別或修改 Produce_No in autoLotData:Array
router.post('/AutoLot_Maintain', function (req, res, next) {
  console.log(`Call AutoLot_Maintain Api(POST) in Production:
  newProduce_No: ${req.body.newProduce_No}, Produce_No: ${req.body.Produce_No}, Produce_LineID: ${req.body.Produce_LineID}`);
  
  req.body.newProduce_No = req.body.newProduce_No ? `N'${req.body.newProduce_No.trim().substring(0,20).replace(/'/g, "''")}'` : `''`;
  // req.body.Produce_LineID = req.body.Produce_LineID && typeof req.body.Produce_LineID === 'string' ? `'${req.body.Produce_LineID}'` : `NULL`

  let strSQL = format(`
  Declare @ROWCOUNT int=0
  Declare @Order_ApproveID int 
  
  if ((Select Material_Update_User From Produce WHERE Produce_No = '{Produce_No}') is null)
    BEGIN
      Update Produce
      SET Produce_No = {newProduce_No}, Data_Updater = N'${req.UserID}', Data_Update = GetDate()
      ${req.body.Produce_LineID && typeof req.body.Produce_LineID === 'string' ? `, Produce_LineID = '{Produce_LineID}', Cutting_LineID = '{Produce_LineID}', Stitching_LineID = '{Produce_LineID}'` : ``}
      WHERE Produce_No = '{Produce_No}'
    END

  Declare @Flag int;
  Set @Flag = @@ROWCOUNT;
  Select @Flag as Flag;

  `, req.body);

  // console.log(strSQL)
  db.sql(req.SiteDB, strSQL)
    .then((result) => {
      let DataSet = {
        Flag: result.recordsets[0][0].Flag > 0
      }
      // console.log(DataSet)
      res.send(DataSet);
    }).catch((err) => {
      console.log(err.message);
      res.status(500).send(err.message);
    })
});

// 刪除新增的 Produce_No 並回寫至 Order_Detail
router.delete('/AutoLot_Maintain/:Produce_No', function (req, res, next) {
  console.log(`Call AutoLot_Maintain Api(DELETE) in Production, Produce_No: ${req.params.Produce_No}`);
  
  req.params.Produce_No = req.params.Produce_No ? `N'${req.params.Produce_No.trim().substring(0,20).replace(/'/g, "''")}'` : `''`; 
  let strSQL = format(`
  Declare @DeleteFlag int, @Flag int = 0;

  Update [Order_Detail] Set Produce_No = NULL where Produce_No = {Produce_No};

  Set @DeleteFlag = (SELECT count(*) FROM Order_Detail where Produce_No = {Produce_No}) + (SELECT count(*) FROM Sample_Detail where Produce_No = {Produce_No})

  if (@DeleteFlag = 0)
      BEGIN
          Delete FROM [Produce] where Produce_No = {Produce_No} And isnull(Purchase_Project_No,'') = '' And isnull(Exported, 0) = 0;
          Set @Flag = @@ROWCOUNT;
      END
          
  Select @Flag as Flag;

  `, req.params);

  // console.log(strSQL)
  db.sql(req.SiteDB, strSQL)
    .then((result) => {
      let DataSet = {
        Flag: result.recordsets[0][0].Flag > 0
      }
      // console.log(DataSet)
      res.send(DataSet);
    }).catch((err) => {
      console.log(err.message);
      res.status(500).send(err.message);
    })
});

// 拖曳同個 Product_No 後，更新 [Order_Detail].Produce_No 與 [Produce] 資料
router.post('/AutoLot_Maintain/dragUpdate', function (req, res, next) {
  console.log(`Call AutoLot_Maintain/dragUpdate API`)
  req.body.UserID = req.UserID

  var strSQL = format(`
  Declare @updateRowCount int, @odRowCount int, @Flag int = 0;

  Update [Order_Detail] Set Produce_No = '{new_Produce_No}' where Order_DetailID = {Order_DetailID}
  Set @updateRowCount = @@ROWCOUNT;

  SELECT Order_DetailID, Order_No, Product_No, Qty FROM Order_Detail WHERE Produce_No = '{old_Produce_No}'
  Set @odRowCount = @@ROWCOUNT;

  if (@odRowCount = 0)
      BEGIN
          Delete FROM [Produce] where Produce_No = '{old_Produce_No}';
      END
  else 
      BEGIN
          Update [Produce] Set Data_Updater = N'${req.UserID}', Data_Update = GetDate(),
          Order_Qty = isnull((Select sum(Qty) From Order_Detail od with(NoLock, NoWait) Where od.Produce_No = '{old_Produce_No}'), 0)
          where Produce_No = '{old_Produce_No}'; 
      END

  Update [Produce] Set Data_Updater = N'${req.UserID}', Data_Update = GetDate(),
  Order_Qty = isnull((Select sum(Qty) From Order_Detail od with(NoLock, NoWait) Where od.Produce_No = '{new_Produce_No}'), 0)
  where Produce_No = '{new_Produce_No}'; 

  SELECT Order_DetailID, Order_No, Product_No, Qty FROM Order_Detail WHERE Produce_No = '{new_Produce_No}'
  Select @updateRowCount as Flag;

  `, req.body);
  // console.log(strSQL)

  db.sql(req.SiteDB, strSQL)
    .then((result) => {
      // console.log(result.recordsets)
      let DataSet = {
        oldProduce_Detail: result.recordsets[0],
        newProduce_Detail: result.recordsets[1],
        Flag: result.recordsets[2][0].Flag > 0
      }
      res.send(DataSet);
    }).catch((err) => {
      console.log(err);
      res.status(500).send(err);
    })
});

// 儲存 Packing Attention
router.post('/Packing_Attention_Save', function (req, res, next) {
  console.log("Call Packing_Attention_Save Api Produce_No:", req.body.Produce_No);
  if (req.body['Packing_Attention'] != null)
    req.body['Packing_Attention'] = req.body['Packing_Attention'].replace(/'/g, "''");
  var strSQL = format(`Update Produce set Packing_Attention = N'{Packing_Attention}'
  , Data_Updater = '${req.UserID}'
  , Data_Update = Getdate()
   Where Produce_No = '{Produce_No}'`, req.body);
  // console.log(strSQL)
  db.sql(req.SiteDB, strSQL)
    .then((result) => {
      res.send("success");
    }).catch((err) => {
      console.log(err);
      res.status(500).send(err);
    })
});

// 取得 Produce Workshop Qty 資料
router.get('/Produce_Workshop_Order_Qty/:Produce_No/:WorkshopID', function (req, res, next) {
  console.log("Call Produce_Workshop_Order_Qty Api in Production");

  var strSQL = format(`
  Declare @qtyTable table (Shoe_Size varchar(10), Size real, Qty float);

  Insert @qtyTable
  Select (Select Size_Name From Product_Size s Where s.SizeID = oq.Size ) as Shoe_Size, oq.Size,
  SUM(oq.[Qty]) as Qty
  From Order_Qty oq with(NoLock, NoWait) 
  Inner Join Order_Detail od With(NoLock, NoWait) on od.Order_DetailID = oq.Order_DetailID
  Inner Join Product p With(NoLock, NoWait) on p.Product_No = od.Product_No
  Where od.Produce_No = '{Produce_No}'
  Group by oq.Size
  
  SELECT q.Shoe_Size, q.Size, Cutting_Die_Size, Last_Size, Outsole_Size, Middle_Sole_Size, Counter_Size, Qty from @qtyTable q
  Left Join (
  SELECT DISTINCT m.Style_No, oq.Size, Shoe_Size, 
  (Select Size_Name From Product_Size s Where s.SizeID = m.Cutting_Die_Size) as Cutting_Die_Size,
  (Select Size_Name From Product_Size s Where s.SizeID = m.Last_Size) as Last_Size,
  (Select Size_Name From Product_Size s Where s.SizeID = m.Outsole_Size) as Outsole_Size,
  (Select Size_Name From Product_Size s Where s.SizeID = m.Middle_Sole_Size) as Middle_Sole_Size,
  (Select Size_Name From Product_Size s Where s.SizeID = m.Cutting_Die_Size) as Counter_Size
  FROM Product_Size_Match m 
  Inner Join Product p With(NoLock, NoWait) on p.Style_No = m.Style_No
  Inner Join Order_Detail od With(NoLock, NoWait) on od.Product_No = p.Product_No
  Inner Join Order_Qty oq With(NoLock, NoWait) on oq.Order_DetailID = od.Order_DetailID
  Where od.Produce_No = '{Produce_No}' and oq.Size = Shoe_Size
  ) sz on sz.Size = q.Size

  SELECT p.WorkshopID, p.Size_Visible_Mode FROM Product_Size_Match_For_Workshop p Where p.WorkshopID = {WorkshopID}

  `, req.params);

  // console.log(strSQL)
  db.sql(req.SiteDB, strSQL)
    .then((result) => {
      // console.log(result)
      let DataSet = {
        Size_Match: result.recordsets[0],
        Size_Visible: result.recordsets[1],
      }
      res.send(DataSet);
    }).catch((err) => {
      console.log(err);
      res.status(500).send(err);
    })
});


// Add data into Worksheet & Worksheet_Detail
router.post('/Worksheet/:Produce_No', function (req, res, next) {
  console.log("Call Worksheet Api(POST) in Production");

  var strSQL = format(`
  DELETE FROM Worksheet WHERE Produce_No = '{Produce_No}';

  WITH tmp_Worksheet (Produce_No, Require_Date, Est_Work_Start, UserID, Data_Updater, Data_Update, Work_GangID) as
  (
    Select DISTINCT '{Produce_No}', GETDATE(), GETDATE(), '${req.UserID}' as UserID, '${req.UserID}', GETDATE(),
    (
      SELECT Work_GangID FROM [dbo].[Factory_Work_Gang]
      WHERE Factory_SubID = pe.Factory_SubID
      AND CHARINDEX(CAST(sw.WorkshopID as VARCHAR), WorkshopID) > 0
      AND
      ( -- 複合 WorkshopID 判斷
          (CHARINDEX(CAST(sw.WorkshopID as VARCHAR), WorkshopID) = 1 AND Len(CAST(sw.WorkshopID as VARCHAR)) = Len(WorkshopID))
          OR
          SUBSTRING(WorkshopID, CHARINDEX(CAST(sw.WorkshopID as VARCHAR), WorkshopID)-1, 1) = '' AND SUBSTRING(WorkshopID, CHARINDEX(CAST(sw.WorkshopID as VARCHAR), WorkshopID)+Len(CAST(sw.WorkshopID as VARCHAR)), 1) = ','
          OR
          SUBSTRING(WorkshopID, CHARINDEX(CAST(sw.WorkshopID as VARCHAR), WorkshopID)-1, 1) = ',' AND SUBSTRING(WorkshopID, CHARINDEX(CAST(sw.WorkshopID as VARCHAR), WorkshopID)+Len(CAST(sw.WorkshopID as VARCHAR)), 1) = ','
          OR 
          SUBSTRING(WorkshopID, CHARINDEX(CAST(sw.WorkshopID as VARCHAR), WorkshopID)-1, 1) = ',' AND SUBSTRING(WorkshopID, CHARINDEX(CAST(sw.WorkshopID as VARCHAR), WorkshopID)+Len(CAST(sw.WorkshopID as VARCHAR)), 1) = ''
      ) 
    ) AS Work_GangID
    From Produce pe
    Inner Join Product pt ON pt.Product_No = pe.Product_No
    Inner Join Style_Process sp ON sp.Style_No = pt.Style_No
    Inner Join Style_Workshop sw ON sw.Style_ProcessID = sp.Style_ProcessID
    Where Produce_No = '{Produce_No}'
  )
  
  Insert Into Worksheet (Produce_No, Require_Date, Est_Work_Start, UserID, Data_Updater, Data_Update, Work_GangID, Queue_No)
  Select *, ROW_NUMBER() Over(Order By Work_GangID) From tmp_Worksheet
  
  Declare @Flag int;
  Set @Flag = @@ROWCOUNT;
  Select @Flag as Flag;
  
  Insert Into Worksheet_Detail (WorksheetID, Style_WorkshopID, Component_PhotoID, Memo, Size, Goal_Qty, Pair_Qty, Qty, Work_Hour, Data_Updater, Data_Update)
  SELECT ws.WorksheetID, sw.Style_WorkshopID, pp.Component_PhotoID, pp.Memo, 0 as Size, SUM(oq.Qty) as Goal_Qty, MAX(DISTINCT ps.Qty) as Pair_Qty, 0 as Qty, sw.Work_Hour, '${req.UserID}' as Data_Updater, GETDATE() as Data_Update
  From dbo.Worksheet ws With(NoLock,NoWait) 
  Inner Join Order_Detail od With(NoLock, NoWait) on od.Produce_No = ws.Produce_No
  Inner Join Order_Qty oq With(NoLock, NoWait) on oq.Order_DetailID = od.Order_DetailID
  Inner Join dbo.Product_Process pp ON pp.Product_No = od.Product_No
  Inner Join dbo.Style_Workshop sw ON sw.Style_ProcessID = pp.Style_ProcessID
  Inner Join dbo.Style_Process sp ON sp.Style_ProcessID = sw.Style_ProcessID    
  Inner Join Product_Size_Match psm With(NoLock, NoWait) on psm.Style_No = sp.Style_No and psm.Shoe_Size = oq.Size
  Inner Join Product_Structure ps With(NoLock, NoWait) on ps.ComponentID = sp.ComponentID and ps.Product_No = od.Product_No
  Inner Join dbo.Factory_Work_Gang fwg ON fwg.Work_GangID = ws.Work_GangID AND CHARINDEX(CAST(sw.WorkshopID as VARCHAR), fwg.WorkshopID) > 0
    AND (CHARINDEX(CAST(sw.WorkshopID as VARCHAR), fwg.WorkshopID) = 1 OR SUBSTRING(fwg.WorkshopID, CHARINDEX(CAST(sw.WorkshopID as VARCHAR), fwg.WorkshopID)-1, 1) = ',')
  WHERE ws.Produce_No = '{Produce_No}'
  GROUP BY ws.WorksheetID, sw.Style_WorkshopID, pp.Component_PhotoID, pp.Memo, ws.Work_GangID, sw.Work_Hour;
  `,req.params);

  // console.log(strSQL)
  db.sql(req.SiteDB, strSQL)
    .then((result) => {
      // console.log(result)
      res.send({Flag: result.recordsets[0][0].Flag > 0});
    }).catch((err) => {
      console.log(err);
      res.status(500).send(err);
    })
});


// Get Work Sheet data
router.get('/Worksheet_List/:Produce_No', function (req, res, next) {
  console.log("Call Worksheet_List Api(GET) in Production");

  var strSQL = format(`
  SELECT ws.WorksheetID, ws.Produce_No, Product_No, ws.Queue_No, ws.WorkshopID, ws.Work_GangID, fwg.Work_Gang_Name,
  ws.Persons, Work_Hour, ws.Goal_Qty, ws.Qty, Require_Date, Est_Work_Start, Est_Work_End, Issue_Date, Work_Start, Work_End,
  Flow_Time, ws.Currency, Labor_Cost, Overhead, UserID, ws.Data_Updater, ws.Data_Update, 
  (SELECT COUNT(*) FROM Worksheet_Detail Where WorksheetID = ws.WorksheetID) as Add_Flag
  FROM Worksheet ws
  Inner Join Produce p on p.Produce_No = ws.Produce_No
  Inner Join Factory_Work_Gang fwg on fwg.Work_GangID = ws.Work_GangID
  WHERE ws.Produce_No = '{Produce_No}'
  Order by Queue_No
  `,req.params);

  // console.log(strSQL)
  db.sql(req.SiteDB, strSQL)
    .then((result) => {
      // console.log(result)
      res.send(result.recordset);
    }).catch((err) => {
      console.log(err);
      res.status(500).send(err);
    })
});

// 取得 Work Sheet Detail 資料
router.get('/Worksheet_Detail/:WorksheetID', function (req, res, next) {
  console.log("Call Worksheet_Detail Api in Production");

  var strSQL = format(`
  SELECT wsd.WorksheetID, sp.ComponentID, pc.Component + case when Len(isnull(sp.C_Rmk,'')) = 0 then '' else ' :' + sp.C_Rmk end as Component, wsd.Component_PhotoID,
  ROW_NUMBER() OVER(ORDER BY pc.Component) AS Rec_No, isnull(pd.Material_Color,'') as Color,
  isnull(pd.Material_Category,'') + ' ' + isnull(pd.Material_Specific,'') + case when DataLength(isnull(pd.Memo,'')) = 0 then '' else ' (' + cast(pd.Memo as Nvarchar(max)) + ')' end as Material_Description,
  pd.M_Rmk, pd.C_Rmk, pd.Unit, pd.Size_From, pd.Size_End, Format(isnull(pd.T_Net_Qty, 0) , 'N2') as Usage, 
  -- cast(isnull(pd.Size_From,0) as varchar) + '-' + cast(isnull(pd.Size_End,0) as varchar) as Size_Fit,
  wsd.Size as Size_Fit, wsd.Goal_Qty as wsdGoal_Qty, wsd.Work_Hour, wsd.Currency, wsd.Labor_Cost, wsd.Overhead, wsd.Memo, wsd.Divided,
  ISNULL('${WebServer.url}/datas/Images/Products/Components/' + pcp.Photo_Month + '/' + CONVERT(varchar(50), pcp.Component_PhotoID) + '.jpg?tmp=' + convert(varchar(20), getDate(),120), '${WebServer.url}/datas/Images/System/Blank.png') AS Photo_Src ,
  pd.Produce_No, p.Product_No, Issue_Date, wsd.Style_WorkshopID, sw.WorkshopID, w.Workshop, fwg.Work_Gang_Name,
  ws.Goal_Qty, Require_Date, Est_Work_Start, Est_Work_End, UserID
  FROM Worksheet_Detail wsd
  Inner Join Worksheet ws on ws.WorksheetID = wsd.WorksheetID
  Inner Join Factory_Work_Gang fwg on fwg.Work_GangID = ws.Work_GangID
  Inner Join Style_Workshop sw on sw.Style_WorkshopID = wsd.Style_WorkshopID
  Inner Join Workshop w on w.WorkshopID = sw.WorkshopID
  Inner Join Style_Process sp ON sp.Style_ProcessID = sw.Style_ProcessID
  Inner Join Product_Component pc on pc.ComponentID = sp.ComponentID
  Left Outer Join Product_Component_Photo as pcp WITH (NoWait, Nolock) on wsd.Component_PhotoID = pcp.Component_PhotoID
  Inner Join Produce_Detail pd on pd.ComponentID = sp.ComponentID AND pd.Produce_No = ws.Produce_No
  Inner Join Produce p on p.Produce_No = pd.Produce_No
  WHERE wsd.WorksheetID = {WorksheetID} AND ABS(Isnull(pd.Sub_Purchase_Item,0)) <> 1 

  `, req.params);

  // console.log(strSQL)
  db.sql(req.SiteDB, strSQL)
    .then((result) => {
      // console.log(result.recordsets)
      let DataSet = {
        Worksheet_Info: result.recordsets[0],
        // Composition_List: result.recordsets[1],
      }
      res.send(DataSet);
    }).catch((err) => {
      console.log(err);
      res.status(500).send(err);
    })
});


// Update Queue No in Worksheet
router.post('/Worksheet_dragUpdate', function (req, res, next) {
  console.log("Call Worksheet_dragUpdate Api(POST) in Production");

  let strSQL = `DECLARE @tmp TABLE (Queue_No INT, WorksheetID INT)
  insert into @tmp values `
  let updateArray = req.body
  updateArray.forEach((element, key) => {
    strSQL += (`(${element.Queue_No}, ${element.WorksheetID}),`)
    if (Object.is(updateArray.length - 1, key)) { // execute last item logic
      strSQL = strSQL.substring(0, strSQL.length - 1)
      strSQL += `; \r\n`
    }
  });
  strSQL += `Update Worksheet SET Queue_No = tmp.Queue_No From Worksheet as ws
  Inner Join (Select Queue_No, WorksheetID from @tmp) AS tmp ON tmp.WorksheetID = ws.WorksheetID;
  
  Declare @Flag int;
  Set @Flag = @@ROWCOUNT;
  Select @Flag as Flag;`

  // console.log(strSQL)
  db.sql(req.SiteDB, strSQL)
    .then((result) => {
      res.send({Flag: result.recordsets[0][0].Flag > 0});
    }).catch((err) => {
      console.log(err);
      res.status(500).send(err);
    })
});


// Add data into Work Sheet Detail
router.post('/Split_Worksheet_Detail/', function (req, res, next) {
  console.log("Call Split_Worksheet_Detail Api(POST) in Production");
  req.body.Memo = req.body.Memo ? `N'${req.body.Memo.replace(/'/g, "''")}'` : `''`;

  let strSQL = format(`  
  
  if({Mode} = 0)
  Begin
    Insert Into Worksheet_Detail (WorksheetID, Style_WorkshopID, Component_PhotoID, Memo, Goal_Qty, Pair_Qty, Qty, Currency, Labor_Cost, Overhead, Work_Hour, Data_Updater, Data_Update, Size, Divided)
    SELECT {WorksheetID} as WorksheetID, {Style_WorkshopID} as Style_WorkshopID, {Component_PhotoID} as Component_PhotoID, {Memo} as Memo
    , Sum(wsd.Goal_Qty) as Goal_Qty, max(distinct Pair_Qty) as Pair_Qty, 0 as Qty, '{Currency}' as Currency, {Labor_Cost} as Labor_Cost, {Overhead} as Overhead,
    {Work_Hour} as Work_Hour, '${req.UserID}' as Data_Updater, GETDATE() as Data_Update, 0 as Size, 0 as Divided
    From dbo.Worksheet_Detail wsd With(NoLock,NoWait)
    WHERE wsd.WorksheetID = {WorksheetID} and wsd.Style_WorkshopID = {Style_WorkshopID} and wsd.Component_PhotoID = {Component_PhotoID} And wsd.Divided = 1    
  End
  Else
  Begin
    Insert Into Worksheet_Detail (WorksheetID, Style_WorkshopID, Component_PhotoID, Memo, Goal_Qty, Pair_Qty, Qty, Currency, Labor_Cost, Overhead, Work_Hour, Data_Updater, Data_Update, Size, Divided)
    SELECT {WorksheetID} as WorksheetID, {Style_WorkshopID} as Style_WorkshopID, {Component_PhotoID} as Component_PhotoID, {Memo} as Memo,
    oq.Qty as Goal_Qty, MAX(DISTINCT ps.Qty) as Pair_Qty, 0 as Qty, '{Currency}' as Currency, {Labor_Cost} as Labor_Cost, {Overhead} as Overhead,
    {Work_Hour} as Work_Hour, '${req.UserID}', GETDATE(),
    psm.Outsole_Size as Size, 1 as Divided
    From dbo.Worksheet_Detail wsd With(NoLock,NoWait)
    Inner Join dbo.Worksheet ws With(NoLock,NoWait) ON ws.WorksheetID = wsd.WorksheetID
    Inner Join Order_Detail od With(NoLock, NoWait) on od.Produce_No = ws.Produce_No
    Inner Join Order_Qty oq With(NoLock, NoWait) on oq.Order_DetailID = od.Order_DetailID
    Inner Join Style_Workshop sw With(NoLock, NoWait) on sw.Style_WorkshopID = wsd.Style_WorkshopID
    Inner Join Style_Process sp With(NoLock, NoWait) on sp.Style_ProcessID = sw.Style_ProcessID
    Inner Join Product_Size_Match psm With(NoLock, NoWait) on psm.Style_No = sp.Style_No and psm.Shoe_Size = oq.Size 
    Inner Join Product_Structure ps With(NoLock, NoWait) on ps.ComponentID = sp.ComponentID and ps.Product_No = od.Product_No
    WHERE wsd.WorksheetID = {WorksheetID} and wsd.Style_WorkshopID = {Style_WorkshopID} and wsd.Component_PhotoID = {Component_PhotoID} 
    GROUP BY psm.Outsole_Size, oq.Qty
  End

  DELETE FROM Worksheet_Detail WHERE Divided = ${req.body.Mode === 0 ? 1:0} and WorksheetID = {WorksheetID} and Style_WorkshopID = {Style_WorkshopID} and Component_PhotoID = {Component_PhotoID}

  Declare @Flag int;
  Set @Flag = @@ROWCOUNT;
  Select @Flag as Flag;

  `,req.body);
  // res.send({Flag: 1});
   //console.log(strSQL)
  db.sql(req.SiteDB, strSQL)
    .then((result) => {
      // console.log(result) 
      res.send({Flag: result.recordsets[0][0].Flag > 0});
    }).catch((err) => {
      console.log(err);
      res.status(500).send(err);
    })
});

// Get Schedule_Plan data
router.post('/Schedule_Plan',  function (req, res, next) {
  console.log("Call Schedule_Plan Api:");  
  // console.table(req.body)
  req.body.Factory_SubID = req.body.Factory_SubID ? `N'${req.body.Factory_SubID.trim().substring(0,15).replace(/'/g, "''")}'` : `''`; 
  req.body.Produce_LineID = req.body.Produce_LineID ? `N'${req.body.Produce_LineID.trim().substring(0,15).replace(/'/g, "''")}'` : `''`; 
  req.body.Plan_Month = req.body.Plan_Month ? `N'${req.body.Plan_Month.trim().substring(0,15).replace(/'/g, "''")}'` : `''`; 
  req.body.Produce_No = req.body.Produce_No ? `N'${req.body.Produce_No.trim().substring(0,20).replace(/'/g, "''")}'` : `''`; 
  req.body.Purchase_Project_No = req.body.Purchase_Project_No ? `N'${req.body.Purchase_Project_No.trim().substring(0,15).replace(/'/g, "''")}'` : `''`; 
  req.body.Product_No = req.body.Product_No ? `N'${req.body.Product_No.trim().substring(0,25).replace(/'/g, "''")}'` : `''`; 
  req.body.Orig_Shipping_Date_From = req.body.Orig_Shipping_Date_From ? `'${req.body.Orig_Shipping_Date_From.trim().substring(0,10).replace(/'/g, "''")}'` : `'1900/01/01'`; 
  req.body.Orig_Shipping_Date_To = req.body.Orig_Shipping_Date_To ? `'${req.body.Orig_Shipping_Date_To.trim().substring(0,10).replace(/'/g, "''")}'` : `'3500/01/01'`; 
  req.body.Brand = req.body.Brand ? `N'${req.body.Brand.trim().substring(0,30).replace(/'/g, "''")}'` : `''`; 
  req.body.BrandID = req.body.BrandID ? `N'${req.body.BrandID.trim().substring(0,3).replace(/'/g, "''")}'` : `''`; 
  req.body.Outsole_No = req.body.Outsole_No ? `N'${req.body.Outsole_No.trim().substring(0,20).replace(/'/g, "''")}'` : `''`; 
  req.body.Last_No = req.body.Last_No ? `N'${req.body.Last_No.trim().substring(0,50).replace(/'/g, "''")}'` : `''`; 
  req.body.Season = req.body.Season ? `N'${req.body.Season.trim().substring(0,10).replace(/'/g, "''")}'` : `''`; 
  
  var strSQL = format(`
Declare @Schedule table (Queue_No float, Brand varchar(20), BrandID varchar(5), Product_No varchar(25), Factory_SubID varchar(15), Produce_LineID varchar(15)
, Qty float , Produce_No varchar(20), Purchase_Project_No varchar(20), Engineer varchar(20), PPIC_Date varchar(10), Purchaser varchar(20), Category varchar(15)
, Outsole_No varchar(20), Last_No varchar(50), Plan_Month varchar(7), Orig_Shipping_Date varchar(10), SP_Sample varchar(10)
, Season varchar(10), Photo_Month varchar(04), Remark Nvarchar(max), Est_Produce_Date varchar(10), Material_Require_Date varchar(10), PP_Sample_Require_Date varchar(10), Technical_Transfer_Require_Date varchar(10), Style_No varchar(20), Schedule_Updater Nvarchar(255), Schedule_Update Nvarchar(20)
)

Insert @Schedule
SELECT top 500 
p.Queue_No,
s.Brand, b.BrandID,
ISNULL(od.Product_No, N'') AS Product_No, 
ISNULL(p.Factory_SubID, N'') AS Factory_SubID,
ISNULL(p.Produce_LineID, N'') AS Produce_LineID,
sum(od.Qty) as Qty,
ISNULL(p.Produce_No, N'') AS Produce_No, 
ISNULL(p.Purchase_Project_No, N'') AS Purchase_Project_No, 
ISNULL(pp.Engineer, N'') AS Engineer,
Convert(varchar(10), pp.PPIC_Date, 111) AS PPIC_Date,
ISNULL(pp.Purchaser, N'') AS Purchaser, 
ISNULL(s.Category, N'') AS Category, 
ISNULL(s.Outsole_No, N'') AS Outsole_No, 
ISNULL(s.Last_No, N'') AS Last_No, 
CONVERT(VARCHAR(7), p.Plan_Month, 111) as Plan_Month,
MIN(CONVERT(VARCHAR(10), od.Orig_Shipping_Date, 111)) as Orig_Shipping_Date,
CONVERT(VARCHAR(10), p.SP_Sample, 111) as SP_Sample,
ISNULL(o.Season, N'') AS Season, 
isnull(Photo_Month,'') as Photo_Month,
p.Remark,
ISNULL(Convert(varchar(10), p.Est_Produce_Date, 111), '') AS Est_Produce_Date,
Convert(varchar(10), p.Material_Require_Date, 111) AS Material_Require_Date,
Convert(varchar(10), pc.PP_Sample_Require_Date, 111) AS PP_Sample_Require_Date,
Convert(varchar(10), s.Technical_Transfer_Require_Date, 111) AS Technical_Transfer_Require_Date, s.Style_No,
p.Schedule_Updater,
CONVERT(VARCHAR(20), p.Schedule_Update, 120) as Schedule_Update
FROM Produce p with(NoLock,NoWait)
Inner JOIN Order_Detail od with(NoLock,NoWait) ON p.Produce_No = od.Produce_No 
INNER JOIN Product pc with(NoLock,NoWait) ON od.Product_No = pc.Product_No 
INNER JOIN Style s with(NoLock,NoWait) ON s.Style_No = pc.Style_No 
INNER JOIN Brand b with(NoLock,NoWait) ON b.Brand = s.Brand
INNER JOIN Orders o with(NoLock,NoWait) ON od.Order_No = o.Order_No AND (o.Department IS NOT NULL)
AND (o.Purpose = 'Official' or o.Purpose = 'Internal' )
LEFT JOIN Purchase_Project pp with(NoLock,NoWait) ON pp.Purchase_Project_No = p.Purchase_Project_No
WHERE Queue_No > 44200
AND p.Factory_SubID IS NOT NULL
AND ({Factory_SubID} = '' or ISNULL(p.Factory_SubID, N'') LIKE '%' + {Factory_SubID} + '%')
AND ({Produce_LineID} = '' or ISNULL(p.Produce_LineID, N'') LIKE '%' + {Produce_LineID} + '%')
AND ${req.body.Plan_Month === "\'\'" ? `ISNULL(p.Plan_Month, N'') >= '1900/01'` : `ISNULL(p.Plan_Month, N'') LIKE '%' + {Plan_Month} + '%'` }
AND ({Produce_No} = '' or ISNULL(p.Produce_No, N'') LIKE '%' + {Produce_No} + '%')
AND ({Purchase_Project_No} = '' or ISNULL(p.Purchase_Project_No, N'') LIKE '%' + {Purchase_Project_No} + '%')
AND ({Product_No} = '' or ISNULL(od.Product_No, N'') LIKE '%' + {Product_No} + '%')
AND (CONVERT(date, isnull(od.Orig_Shipping_Date,''),111) Between {Orig_Shipping_Date_From} AND {Orig_Shipping_Date_To})
AND ({Brand} = '' or s.Brand LIKE '%' + {Brand} + '%')
AND ({BrandID} = '' or b.BrandID LIKE '%' + {BrandID} + '%')
AND ({Outsole_No} = '' or ISNULL(s.Outsole_No, N'') LIKE N'%' + {Outsole_No} + N'%')
AND ({Last_No} = '' or ISNULL(s.Last_No, N'') LIKE '%' + {Last_No} + '%')
AND ({Season} = '' or ISNULL(o.Season, N'') LIKE '%' + {Season} + '%')
AND p.UnProduce = 0
Group by
p.Queue_No, s.Brand, b.BrandID,
ISNULL(od.Product_No, N''), 
ISNULL(p.Factory_SubID, N''), 
ISNULL(p.Produce_No, N''), ISNULL(p.Purchase_Project_No, N''), ISNULL(pp.Engineer, N''), pp.PPIC_Date, ISNULL(pp.Purchaser, N''), ISNULL(s.Category, N''), ISNULL(s.Outsole_No, N''), ISNULL(s.Last_No, N''),
p.Produce_LineID, CONVERT(VARCHAR(7), p.Plan_Month, 111),
CONVERT(VARCHAR(10), p.SP_Sample, 111), ISNULL(o.Season, N''), isnull(Photo_Month,''),
p.Remark, p.Est_Produce_Date, p.Material_Require_Date, pc.PP_Sample_Require_Date, s.Technical_Transfer_Require_Date, s.Style_No, p.Schedule_Updater, CONVERT(VARCHAR(20), p.Schedule_Update, 120)

Select * From @Schedule Order by Est_Produce_Date, Queue_No, Plan_Month;

Select '' as Factory_SubID, '' as Produce_LineID
union
Select Factory_SubID, Produce_LineID From Produce_Line;

SELECT Produce_LineID, fs.FactoryID, pl.Factory_SubID, Lasting_Type, Pairs_Month, Outsider, Workhours_Per_Day as Daily_WorkingHours, Workday_Per_Month as Monthly_Workdays,
null as Hourly_Production_Capacity, null as Mohthly_Overtime, null as Produce_Line_Monthly_GoalID FROM Produce_Line as pl
Inner Join Factory_Sub as fs ON pl.Factory_SubID = fs.Factory_SubID
  `, req.body);

  // console.log(strSQL)
  db.sql(req.SiteDB, strSQL).then((result) => {
    let Data_Info = JSON.parse(JSON.stringify(result.recordsets[0]))
    let Report_Info = [...result.recordsets[0].reduce((r, e) => { // 取出相同 Plan_Month, Produce_LineID 的值並分類
        let k = `${e.Plan_Month}|${e.Produce_LineID}`;
        // let l = `${e.Produce_LineID}`;
        if (!r.has(k)) {
          r.set(k, {
            tPlan_Month: e.Plan_Month,
            tProduce_LineID: e.Produce_LineID,
            totalQty: e.Qty,
            entries: [e],
          })
        } else {
          r.get(k).totalQty += e.Qty
          r.get(k).entries.push(e)
        }
        return r;
      }, new Map).values()]
      .filter((data) => (data.tProduce_LineID))
      .sort((a, b) => (a.tProduce_LineID > b.tProduce_LineID) ? 1 : ((b.tProduce_LineID > a.tProduce_LineID) ? -1 : 0))
      // .sort((a, b) => (a.tPlan_Month > b.tPlan_Month) ? 1 : ((b.tPlan_Month > a.tPlan_Month) ? -1 : 0))
  
    Report_Info.forEach((element, index, array) => {
      Object.assign(element, ...result.recordsets[2].filter((data) => (data.Produce_LineID == element.tProduce_LineID)))
    });
  
    Data_Info.forEach((item) => {
      item.Factory_Line = result.recordsets[1].filter((data) => (data.Factory_SubID == item.Factory_SubID));
      item.Factory_Line = item.Factory_Line.length > 0 ? item.Factory_Line : [{
        Factory_SubID: '',
        Produce_LineID: ''
      }]
    })
    res.locals.Data_Info = Data_Info
    res.locals.Report_Info = Report_Info
    next();
  }).catch((err)=>{
    console.log(err);
    res.status(500).send(err);
  })       
}, function (req, res, next) {

  var strSQL2 = format(`
  SELECT pl.Produce_LineID, fs.FactoryID, pl.Factory_SubID, Lasting_Type, Pairs_Month, Outsider, Workhours_Per_Day,
  Produce_Month, Monthly_Workdays, Daily_WorkingHours, Hourly_Production_Capacity, Mohthly_Overtime, Produce_Line_Monthly_GoalID FROM Produce_Line as pl
  Inner Join Factory_Sub as fs ON pl.Factory_SubID = fs.Factory_SubID
  Left Join Produce_Line_Monthly_Goal as plmg ON plmg.Produce_LineID = pl.Produce_LineID
  Where Produce_Line_Monthly_GoalID is not null
  `)

  db.sql(req.Enterprise, strSQL2).then((result) => {
    // console.log(result.recordsets)
    res.locals.Report_Info.forEach((element, index, array) => {
      Object.assign(element, ...result.recordsets[0].filter((data) => (data.Produce_LineID == element.tProduce_LineID && data.Produce_Month == element.tPlan_Month)))
    });
    
    let DataSet = {
      Report_Info: res.locals.Report_Info,
      Data_Info: res.locals.Data_Info
    };
    res.send(DataSet);
  }).catch((err) => {
    console.log(err);
    res.status(500).send(err);
  })
});

// Maintain Purchase_Project
router.post('/Purchase_Project_Maintain', function (req, res, next) {
  console.log("Call Purchase_Project_Maintain Api:", req.body);

  // req.body.Mode === 0 表示新增
  // req.body.Mode === 1 表示修改 
  // req.body.Mode === 2 表示刪除
  // req.body.Mode === 3 表示執行合併
  // req.body.Mode === 4 表示解除合併

  req.body.Purchase_Project_No = req.body.Purchase_Project_No ? `N'${req.body.Purchase_Project_No.trim().substring(0, 15).replace(/'/g, "''")}'` : `''`;
  req.body.Department = req.body.Department ? `N'${req.body.Department.trim().substring(0, 5).replace(/'/g, "''")}'` : `''`;
  req.body.CustomerID = req.body.CustomerID ? `N'${req.body.CustomerID.trim().substring(0, 20).replace(/'/g, "''")}'` : `''`;
  req.body.Purpose = req.body.Purpose ? `N'${req.body.Purpose.trim().substring(0, 11).replace(/'/g, "''")}'` : `''`;
  req.body.Category = req.body.Category ? `N'${req.body.Category.trim().substring(0, 15).replace(/'/g, "''")}'` : `''`;
  req.body.Produce_No = req.body.Produce_No ? `N'${req.body.Produce_No.trim().substring(0, 20).replace(/'/g, "''")}'` : `''`;
  req.body.Produce_No_Array = req.body.Produce_No_Array ? JSON.parse(req.body.Produce_No_Array) : [];
  req.body.Require_Date = req.body.Require_Date ?  `N'${req.body.Require_Date.trim().replace(/'/g, "''")}'` : null; 
  if (req.body.Name === 'PPIC_Date') {
    req.body.Value = req.body.Value ? `GetDate()` : `NULL`;
  } else {
    req.body.Value = req.body.Value ? `N'${req.body.Value.trim().replace(/'/g, "''")}'` : `''`;
  }

  let strSQL = 'Declare @ROWCOUNT int;'
  switch (req.body.Mode) {
    case 0:
      strSQL += format(`
        Insert into [dbo].[Purchase_Project] (Purchase_Project_No, Department, CustomerID, Purpose, Category, Require_Date, PPIC_User, MTR_Declare_Rate)
        VALUES ({Purchase_Project_No}, {Department}, {CustomerID}, {Purpose}, {Category}, {Require_Date}, '${req.UserID}', 0.7)

        Set @ROWCOUNT = @@ROWCOUNT;
        `, req.body);
      break;
    case 1:
      strSQL += format(`
        Update [dbo].[Purchase_Project] Set [{Name}] = {Value}
        where Purchase_Project_No = {Purchase_Project_No}
        Set @ROWCOUNT = @@ROWCOUNT;
        `, req.body);
      break;
    case 2:
      strSQL += format(`
        Delete FROM [dbo].[Purchase_Project] 
        where Purchase_Project_No = {Purchase_Project_No}
        AND NOT EXISTS (
          SELECT 1 FROM Produce WHERE Produce.Purchase_Project_No = Purchase_Project.Purchase_Project_No
        );
        Set @ROWCOUNT = @@ROWCOUNT;
        `, req.body);
      break;
    case 3:
      strSQL += format(`
        Update [dbo].[Produce] Set Purchase_Project_No = {Purchase_Project_No}
        where Produce_No IN ('${req.body.Produce_No_Array.join("','")}');
        Set @ROWCOUNT = @@ROWCOUNT;
        `, req.body);
      if (req.body.Require_Date !== null) {
        strSQL += format(`
        Update [dbo].[Purchase_Project] Set Require_Date = {Require_Date}
        where Purchase_Project_No = {Purchase_Project_No}
        Set @ROWCOUNT = @@ROWCOUNT;
        `, req.body);
      }
      break;
    case 4:
      strSQL += format(`
        Update [dbo].[Produce] Set Purchase_Project_No = null
        where Produce_No IN ('${req.body.Produce_No_Array.join("','")}');
        Set @ROWCOUNT = @@ROWCOUNT;
        `, req.body);
      break;
  }

  strSQL += format(`
  Select @ROWCOUNT as Flag;
  `, req.body);
  // console.log(strSQL)
  // res.send({Flag: true});
  db.sql(req.SiteDB, strSQL)
    .then((result) => {
      //console.log(result.recordsets[0])
      res.send({
        Flag: result.recordsets[0][0].Flag > 0
      });
    }).catch((err) => {
      console.log(err);
      res.status(500).send(err);
    })
});


// 取得 PP_Planner_unsetPP_Detail_Data 資料
router.post('/PP_Planner_unsetPP_Detail_Data', function (req, res, next) {
  console.log("Call PP_Planner_unsetPP_Detail_Data Api in Production");

  req.body.Purchase_Project_No = req.body.Purchase_Project_No ? `N'${req.body.Purchase_Project_No.trim().substring(0, 15).replace(/'/g, "''")}'` : `''`;
  req.body.CustomerID = req.body.CustomerID ? `N'${req.body.CustomerID.trim().substring(0, 20).replace(/'/g, "''")}'` : `''`;
  req.body.Category = req.body.Category ? `N'${req.body.Category.trim().substring(0, 15).replace(/'/g, "''")}'` : `''`;

  let strSQL = format(`
  SELECT pe.Produce_No, pe.Purchase_Project_No
  , Convert(varchar(10), pe.Material_Require_Date, 111) AS Material_Require_Date
  , pe.Product_No, s.Brand, s.Category, pe.Produce_LineID, pp.Engineer, SUM(od.Qty) as Qty
  , o.Purpose, '' as flag
  FROM Produce pe
  INNER JOIN dbo.Product pt ON pt.Product_No = pe.Product_No
  INNER JOIN dbo.Style s ON s.Style_No = pt.Style_No
  INNER JOIN dbo.Order_Detail od ON od.Produce_No = pe.Produce_No
  INNER JOIN dbo.Orders o ON o.Order_No = od.Order_No
  INNER JOIN dbo.Order_Approve oa ON oa.Order_ApproveID = pe.Order_ApproveID
  LEFT JOIN Purchase_Project pp with(NoLock,NoWait) ON pp.Purchase_Project_No = pe.Purchase_Project_No
  WHERE pe.Purchase_Project_No IS NULL
      AND (s.Brand = {CustomerID})
      AND (ABS(pe.Shipmented) <> 1)
      AND (pe.BOM_Completed IS NOT NULL)
      AND (o.Purpose = 'Official' AND oa.Approve_Date IS NOT NULL) OR o.Purpose = 'Internal'
  GROUP BY pe.Produce_No, pe.Purchase_Project_No, pe.Material_Require_Date, pe.Product_No, s.Brand, s.Category, pe.Produce_LineID, pp.Engineer, o.Purpose
  ORDER BY pe.Material_Require_Date, pe.Product_No

  `, req.body);

  // console.log(strSQL)
  db.sql(req.SiteDB, strSQL)
    .then((result) => {
      // console.log(result)
      res.send(result.recordset);
    }).catch((err) => {
      console.log(err);
      res.status(500).send(err);
    })
});

// 取得 PP_Planner_combinedPP_Detail_Data 資料
router.post('/PP_Planner_combinedPP_Detail_Data', function (req, res, next) {
  console.log("Call PP_Planner_combinedPP_Detail_Data Api in Production");

  req.body.Purchase_Project_No = req.body.Purchase_Project_No ? `N'${req.body.Purchase_Project_No.trim().substring(0, 15).replace(/'/g, "''")}'` : `''`;
  req.body.CustomerID = req.body.CustomerID ? `N'${req.body.CustomerID.trim().substring(0, 20).replace(/'/g, "''")}'` : `''`;
  req.body.Category = req.body.Category ? `N'${req.body.Category.trim().substring(0, 15).replace(/'/g, "''")}'` : `''`;

  let strSQL = format(`
  SELECT pe.Produce_No, pe.Purchase_Project_No
  , Convert(varchar(10), pe.Material_Require_Date, 111) AS Material_Require_Date
  , pe.Product_No, s.Brand, s.Category, pe.Produce_LineID, pp.Engineer
  , SUM(od.Qty) as Qty, o.Purpose, '' as flag
  FROM Produce pe
  INNER JOIN dbo.Product pt ON pt.Product_No = pe.Product_No
  INNER JOIN dbo.Style s ON s.Style_No = pt.Style_No
  INNER JOIN dbo.Order_Detail od ON od.Produce_No = pe.Produce_No
  INNER JOIN dbo.Orders o ON o.Order_No = od.Order_No
  INNER JOIN dbo.Order_Approve oa ON oa.Order_ApproveID = pe.Order_ApproveID
  LEFT JOIN Purchase_Project pp with(NoLock,NoWait) ON pp.Purchase_Project_No = pe.Purchase_Project_No
  WHERE pe.Purchase_Project_No = {Purchase_Project_No}
      AND (s.Brand = {CustomerID})
      AND (ABS(pe.Shipmented) <> 1)
  GROUP BY pe.Produce_No, pe.Purchase_Project_No, pe.Material_Require_Date, pe.Product_No, s.Brand, s.Category, pe.Produce_LineID, pp.Engineer, o.Purpose
  ORDER BY pe.Material_Require_Date, pe.Product_No
  `, req.body);

  // console.log(strSQL)
  db.sql(req.SiteDB, strSQL)
    .then((result) => {
      // console.log(result)
      res.send(result.recordset);
    }).catch((err) => {
      console.log(err);
      res.status(500).send(err);
    })
});

// 取得尚未合併的 Purchase_Project 資料
router.get('/Purchase_Project_Data', function (req, res, next) {
  console.log("Call Purchase_Project_Data Api in Production");

  let strSQL = format(`
  SELECT Purchase_Project_No, Department, CustomerID, Purpose, Category, Convert(varchar(10), [Require_Date], 111) as Require_Date, Engineer, PPIC_User
  FROM Purchase_Project
  WHERE Manager IS NULL AND Purchaser IS NULL AND Close_Date IS NULL AND PPIC_User IS NOT NULL
  ORDER BY Purchase_Project_No, Department, CustomerID, Purpose, Category
`);

  // console.log(strSQL)
  db.sql(req.SiteDB, strSQL)
    .then((result) => {
      // console.log(result)
      res.send(result.recordset);
    }).catch((err) => {
      console.log(err);
      res.status(500).send(err);
    })
});

// Maintain Produce_Line
router.post('/Produce_Line_Maintain', function (req, res, next) {
  console.log("Call Produce_Line_Maintain Api:", req.body);

  // req.body.Mode === 0 表示新增
  // req.body.Mode === 1 表示修改 
  // req.body.Mode === 2 表示刪除

  req.body.tPlan_Month = req.body.tPlan_Month ? `N'${req.body.tPlan_Month.trim().substring(0, 7).replace(/'/g, "''")}'` : `''`;
  req.body.tProduce_LineID = req.body.tProduce_LineID ? `N'${req.body.tProduce_LineID.trim().substring(0, 15).replace(/'/g, "''")}'` : `''`; 

  let strSQL = 'Declare @ROWCOUNT int;'
  switch (req.body.Mode) {
    case 0:
      strSQL += format(`
        Insert into [dbo].[Produce_Line_Monthly_Goal] (Produce_LineID, Produce_Month, Monthly_Workdays, Daily_WorkingHours, Hourly_Production_Capacity, Mohthly_Overtime)
        VALUES ({tProduce_LineID}, {tPlan_Month}, 24, 7, 130, 0)

        Declare @ID int;
        Set @ID = SCOPE_IDENTITY();
        Update [dbo].[Produce_Line_Monthly_Goal] Set [{Name}] = {Value}
        where Produce_Line_Monthly_GoalID = @ID

        Set @ROWCOUNT = @@ROWCOUNT;
        `, req.body);
      break;
    case 1:
      strSQL += format(`
        Update [dbo].[Produce_Line_Monthly_Goal] Set [{Name}] = {Value}
        where Produce_Line_Monthly_GoalID = {Produce_Line_Monthly_GoalID}
        Set @ROWCOUNT = @@ROWCOUNT;
        `, req.body);
      break;
    case 2:
      strSQL += format(`
        Delete FROM [dbo].[Produce_Line_Monthly_Goal] 
        where Produce_Line_Monthly_GoalID = {Produce_Line_Monthly_GoalID} ; 
        Set @ROWCOUNT = @@ROWCOUNT;
        `, req.body);
      break;
  }

  strSQL += format(`
  Select @ROWCOUNT as Flag;
  `, req.body);
  // console.log(strSQL)
  // res.send({Flag: true});
  db.sql(req.Enterprise, strSQL)
    .then((result) => {
      res.send({
        Flag: result.recordsets[0][0].Flag > 0
      });
    }).catch((err) => {
      console.log(err);
      res.status(500).send(err);
    })
});

// 取得 產能總覽 資料
router.post('/Capacity_Data', function (req, res, next) {
  console.log("Call Capacity_Data Api in Production", req.body);

  req.body.Factory_SubID = req.body.Factory_SubID ? `N'${req.body.Factory_SubID.trim().substring(0,15).replace(/'/g, "''")}'` : `''`; 
  req.body.Plan_Month = req.body.Plan_Month ? `N'${req.body.Plan_Month.trim().substring(0,15).replace(/'/g, "''")}'` : `''`; 
  req.body.Last_Month = req.body.Last_Month ? `N'${req.body.Last_Month.trim().substring(0,15).replace(/'/g, "''")}'` : `''`; 

  let strSQL = format(`
    Declare @weekTable Table (Week int, Week_Start_Date date, Week_End_Date date, Week_Count int)
    Declare @tmpTable Table(Produce_LineID varchar(15), Qty int, Worked_Qty int, Week int)
    Declare @Week1 DATETIME = {Plan_Month} + '/01', @Week2 DATETIME = {Plan_Month} + '/08', @Week3 DATETIME = {Plan_Month} + '/15', @Week4 DATETIME = {Plan_Month} + '/22', 
            @Week5 DATETIME = {Plan_Month} + case when RIGHT({Plan_Month}, 2) = '02' then '/28' else '/29' end
    
    Insert @WeekTable
      SELECT datepart(Week, @Week1), DATEADD(DAY, 2 - DATEPART(WEEKDAY, @Week1), CAST(@Week1 AS DATE)) AS Week_Start_Date, DATEADD(DAY, 8 - DATEPART(WEEKDAY, @Week1), CAST(@Week1 AS DATE)) AS Week_End_Date, 1
      UNION
      SELECT datepart(Week, @Week2), DATEADD(DAY, 2 - DATEPART(WEEKDAY, @Week2), CAST(@Week2 AS DATE)) AS Week_Start_Date, DATEADD(DAY, 8 - DATEPART(WEEKDAY, @Week2), CAST(@Week2 AS DATE)) AS Week_End_Date, 2
      UNION
      SELECT datepart(Week, @Week3), DATEADD(DAY, 2 - DATEPART(WEEKDAY, @Week3), CAST(@Week3 AS DATE)) AS Week_Start_Date, DATEADD(DAY, 8 - DATEPART(WEEKDAY, @Week3), CAST(@Week3 AS DATE)) AS Week_End_Date, 3
      UNION
      SELECT datepart(Week, @Week4), DATEADD(DAY, 2 - DATEPART(WEEKDAY, @Week4), CAST(@Week4 AS DATE)) AS Week_Start_Date, DATEADD(DAY, 8 - DATEPART(WEEKDAY, @Week4), CAST(@Week4 AS DATE)) AS Week_End_Date, 4
      UNION
      SELECT datepart(Week, @Week5), DATEADD(DAY, 2 - DATEPART(WEEKDAY, @Week5), CAST(@Week5 AS DATE)) AS Week_Start_Date, DATEADD(DAY, 8 - DATEPART(WEEKDAY, @Week5), CAST(@Week5 AS DATE)) AS Week_End_Date, 5
    
    SELECT Week, Week_Start_Date, Week_End_Date, Week_Count From @WeekTable
  `, req.body);

  switch (req.body.Mode) {
    case 'C': // 取得 Cutting 加工生產資料
      strSQL += format(`
        SELECT p.Cutting_LineID as Produce_LineID, sum(p.Qty) as Qty, sum(p.Cutting_Qty) as Worked_Qty, CONVERT(VARCHAR(7), p.Cutting_S, 111) as Plan_Month
        FROM Produce p with(NoLock,NoWait)
        INNER JOIN Order_Detail od with(NoLock,NoWait) ON p.Produce_No = od.Produce_No
          AND od.Order_DetailID = (
              SELECT MAX(Order_DetailID) FROM Order_Detail WHERE Produce_No = p.Produce_No GROUP BY Produce_No
          )
        INNER JOIN Orders o with(NoLock,NoWait) ON od.Order_No = o.Order_No AND (o.Department IS NOT NULL) AND (o.Purpose = 'Official' or o.Purpose = 'Internal')
        WHERE 
        ({Factory_SubID} = '' or ISNULL(p.Factory_SubID, N'') LIKE '%' + {Factory_SubID} + '%') AND
        ${req.body.Last_Month === "\'\'" ? `Convert(varchar(7), p.Cutting_S, 111) LIKE '%' + {Plan_Month} + '%'` : `ISNULL(p.Plan_Month, N'') >= {Plan_Month} AND ISNULL(p.Plan_Month, N'') <= {Last_Month}` }
        Group by p.Cutting_LineID, Convert(varchar(7), p.Cutting_S, 111)

        SELECT p.Cutting_LineID AS Produce_LineID, sum(p.Qty) AS Qty, sum(p.Cutting_Qty) AS Worked_Qty, datepart(week, p.Cutting_S) AS Week
        , (SELECT Week_Count from @WeekTable wt Where datepart(week, p.Cutting_S) = wt.Week) AS Week_Count
        FROM Produce p with(NoLock,NoWait)
        INNER JOIN Order_Detail od with(NoLock,NoWait) ON p.Produce_No = od.Produce_No
            AND od.Order_DetailID = (
                SELECT MAX(Order_DetailID) FROM Order_Detail WHERE Produce_No = p.Produce_No GROUP BY Produce_No
            )
        INNER JOIN Orders o with(NoLock,NoWait) ON od.Order_No = o.Order_No AND (o.Department IS NOT NULL) AND (o.Purpose = 'Official' or o.Purpose = 'Internal')
        WHERE ({Factory_SubID} = '' or ISNULL(p.Factory_SubID, N'') LIKE '%' + {Factory_SubID} + '%')
        AND Convert(VARCHAR(7), p.Cutting_S, 111) LIKE '%' +{Plan_Month} + '%'
        GROUP BY p.Cutting_LineID, datepart(week, p.Cutting_S)
        ORDER BY Produce_LineID, Week
      `, req.body);
      break;
      case 'S': // 取得 Stitching 加工生產資料
      strSQL += format(`
        SELECT p.Stitching_LineID as Produce_LineID, sum(p.Qty) as Qty, sum(p.Stitching_Qty) as Worked_Qty, CONVERT(VARCHAR(7), p.Stitching_S, 111) as Plan_Month
        FROM Produce p with(NoLock,NoWait)
        INNER JOIN Order_Detail od with(NoLock,NoWait) ON p.Produce_No = od.Produce_No
          AND od.Order_DetailID = (
              SELECT MAX(Order_DetailID) FROM Order_Detail WHERE Produce_No = p.Produce_No GROUP BY Produce_No
          )
        INNER JOIN Orders o with(NoLock,NoWait) ON od.Order_No = o.Order_No AND (o.Department IS NOT NULL) AND (o.Purpose = 'Official' or o.Purpose = 'Internal')
        WHERE 
        ({Factory_SubID} = '' or ISNULL(p.Factory_SubID, N'') LIKE '%' + {Factory_SubID} + '%') AND
        ${req.body.Last_Month === "\'\'" ? `Convert(varchar(7), p.Stitching_S, 111) LIKE '%' + {Plan_Month} + '%'` : `ISNULL(p.Plan_Month, N'') >= {Plan_Month} AND ISNULL(p.Plan_Month, N'') <= {Last_Month}` }
        Group by p.Stitching_LineID, Convert(varchar(7), p.Stitching_S, 111)

        SELECT p.Stitching_LineID AS Produce_LineID, sum(p.Qty) AS Qty, sum(p.Stitching_Qty) AS Worked_Qty, datepart(week, p.Stitching_S) AS Week
        , (SELECT Week_Count from @WeekTable wt Where datepart(week, p.Stitching_S) = wt.Week) AS Week_Count
        FROM Produce p with(NoLock,NoWait)
        INNER JOIN Order_Detail od with(NoLock,NoWait) ON p.Produce_No = od.Produce_No
            AND od.Order_DetailID = (
                SELECT MAX(Order_DetailID) FROM Order_Detail WHERE Produce_No = p.Produce_No GROUP BY Produce_No
            )
        INNER JOIN Orders o with(NoLock,NoWait) ON od.Order_No = o.Order_No AND (o.Department IS NOT NULL) AND (o.Purpose = 'Official' or o.Purpose = 'Internal')
        WHERE ({Factory_SubID} = '' or ISNULL(p.Factory_SubID, N'') LIKE '%' + {Factory_SubID} + '%')
        AND Convert(VARCHAR(7), p.Stitching_S, 111) LIKE '%' + {Plan_Month} + '%'
        GROUP BY p.Stitching_LineID, datepart(week, p.Stitching_S)
        ORDER BY Produce_LineID, Week
        `, req.body);
      break;
      case 'L': // 取得 Lasting 加工生產資料
      strSQL += format(`
        SELECT p.Lasting_LineID as Produce_LineID, sum(p.Qty) as Qty, sum(p.Lasting_Qty) as Worked_Qty, CONVERT(VARCHAR(7), p.Lasting_S, 111) as Plan_Month
        FROM Produce p with(NoLock,NoWait)
        INNER JOIN Order_Detail od with(NoLock,NoWait) ON p.Produce_No = od.Produce_No
          AND od.Order_DetailID = (
              SELECT MAX(Order_DetailID) FROM Order_Detail WHERE Produce_No = p.Produce_No GROUP BY Produce_No
          )
        INNER JOIN Orders o with(NoLock,NoWait) ON od.Order_No = o.Order_No AND (o.Department IS NOT NULL) AND (o.Purpose = 'Official' or o.Purpose = 'Internal')
        WHERE 
        ({Factory_SubID} = '' or ISNULL(p.Factory_SubID, N'') LIKE '%' + {Factory_SubID} + '%') AND
        ${req.body.Last_Month === "\'\'" ? `Convert(varchar(7), p.Lasting_S, 111) LIKE '%' + {Plan_Month} + '%'` : `ISNULL(p.Plan_Month, N'') >= {Plan_Month} AND ISNULL(p.Plan_Month, N'') <= {Last_Month}` }
        Group by p.Lasting_LineID, Convert(varchar(7), p.Lasting_S, 111)

        SELECT p.Lasting_LineID AS Produce_LineID, sum(p.Qty) AS Qty, sum(p.Lasting_Qty) AS Worked_Qty, datepart(week, p.Lasting_S) AS Week
        , (SELECT Week_Count from @WeekTable wt Where datepart(week, p.Lasting_S) = wt.Week) AS Week_Count
        FROM Produce p with(NoLock,NoWait)
        INNER JOIN Order_Detail od with(NoLock,NoWait) ON p.Produce_No = od.Produce_No
            AND od.Order_DetailID = (
                SELECT MAX(Order_DetailID) FROM Order_Detail WHERE Produce_No = p.Produce_No GROUP BY Produce_No
            )
        INNER JOIN Orders o with(NoLock,NoWait) ON od.Order_No = o.Order_No AND (o.Department IS NOT NULL) AND (o.Purpose = 'Official' or o.Purpose = 'Internal')
        WHERE ({Factory_SubID} = '' or ISNULL(p.Factory_SubID, N'') LIKE '%' + {Factory_SubID} + '%')
        AND Convert(VARCHAR(7), p.Lasting_S, 111) LIKE '%' + {Plan_Month} + '%'
        GROUP BY p.Lasting_LineID, datepart(week, p.Lasting_S)
        ORDER BY Produce_LineID, Week
        `, req.body);
      break;
      default:
      strSQL += format(`
        SELECT p.Produce_LineID, sum(p.Qty) as Qty, CONVERT(VARCHAR(7), p.Plan_Month, 111) as Plan_Month
        FROM Produce p with(NoLock,NoWait)
        INNER JOIN Order_Detail od with(NoLock,NoWait) ON p.Produce_No = od.Produce_No
          AND od.Order_DetailID = (
              SELECT MAX(Order_DetailID) FROM Order_Detail WHERE Produce_No = p.Produce_No GROUP BY Produce_No
          )
        INNER JOIN Orders o with(NoLock,NoWait) ON od.Order_No = o.Order_No AND (o.Department IS NOT NULL) AND (o.Purpose = 'Official' or o.Purpose = 'Internal')
        WHERE 
        ({Factory_SubID} = '' or ISNULL(p.Factory_SubID, N'') LIKE '%' + {Factory_SubID} + '%') AND
        -- AND ${req.body.Plan_Month === "\'\'" ? `ISNULL(p.Plan_Month, N'') >= '${moment().format('YYYY/MM')}'` : `ISNULL(p.Plan_Month, N'') LIKE '%' + {Plan_Month} + '%'` }
        ${req.body.Last_Month === "\'\'" ? `ISNULL(p.Plan_Month, N'') LIKE '%' + {Plan_Month} + '%'` : `ISNULL(p.Plan_Month, N'') >= {Plan_Month} AND ISNULL(p.Plan_Month, N'') <= {Last_Month}` }
        Group by p.Produce_LineID, CONVERT(VARCHAR(7), p.Plan_Month, 111)

        SELECT p.Produce_LineID, sum(p.Qty) AS Qty, datepart(week, p.Est_Produce_Date) AS Week
        , (SELECT Week_Count from @WeekTable wt Where datepart(week, p.Est_Produce_Date) = wt.Week) AS Week_Count
        FROM Produce p with(NoLock,NoWait)
        INNER JOIN Order_Detail od with(NoLock,NoWait) ON p.Produce_No = od.Produce_No
            AND od.Order_DetailID = (
                SELECT MAX(Order_DetailID) FROM Order_Detail WHERE Produce_No = p.Produce_No GROUP BY Produce_No
            )
        INNER JOIN Orders o with(NoLock,NoWait) ON od.Order_No = o.Order_No AND (o.Department IS NOT NULL) AND (o.Purpose = 'Official' or o.Purpose = 'Internal')
        WHERE ({Factory_SubID} = '' or ISNULL(p.Factory_SubID, N'') LIKE '%' + {Factory_SubID} + '%')
        AND Convert(VARCHAR(7), p.Est_Produce_Date, 111) LIKE '%' + {Plan_Month} + '%'
        GROUP BY p.Produce_LineID, datepart(week, p.Est_Produce_Date)
        ORDER BY Produce_LineID, Week
      `, req.body);
      break;
  }

  // console.log(strSQL)
  db.sql(req.SiteDB, strSQL)
    .then((result) => {
      res.locals.Week_Info = result.recordsets[0]
      res.locals.Capacity_Info = result.recordsets[1]
      res.locals.Week_Capacity_Info = result.recordsets[2] ? result.recordsets[2] : []
      next();
    }).catch((err) => {
      console.log(err);
      res.status(500).send(err);
    })
}, function (req, res, next) {
    
  var strSQL2 = format(`
  SELECT pl.Produce_LineID, fs.FactoryID, pl.Factory_SubID, Lasting_Type, Outsider, 0 as Qty, 0 as totalCapacity,
  ISNULL(Produce_Month, {Plan_Month}) as Produce_Month, Monthly_Workdays, Daily_WorkingHours, Hourly_Production_Capacity, Mohthly_Overtime, Produce_Line_Monthly_GoalID FROM Produce_Line as pl
  Inner Join Factory_Sub as fs ON pl.Factory_SubID = fs.Factory_SubID
  Left Join Produce_Line_Monthly_Goal as plmg ON plmg.Produce_LineID = pl.Produce_LineID AND (Produce_Month IS NULL or Produce_Month = {Plan_Month})
  Where (pl.Factory_SubID = {Factory_SubID})
  AND ISNULL(DATEDIFF(Month, pl.Create_Date, CAST({Plan_Month} + '/01' AS datetime)), 999) >= 0
  AND ISNULL(DATEDIFF(Month, pl.Histiry_Date, CAST({Plan_Month} + '/01' AS datetime)), -999) < 0
  `, req.body);

  req.body.Plan_Month_Array.forEach(element => {
    strSQL2 += `
    UNION ALL
    SELECT pl.Produce_LineID, fs.FactoryID, pl.Factory_SubID, Lasting_Type, Outsider, 0 as Qty, 0 as totalCapacity,
    ISNULL(Produce_Month, N'${element}') as Produce_Month, Monthly_Workdays, Daily_WorkingHours, Hourly_Production_Capacity, Mohthly_Overtime, Produce_Line_Monthly_GoalID FROM Produce_Line as pl
    Inner Join Factory_Sub as fs ON pl.Factory_SubID = fs.Factory_SubID
    Left Join Produce_Line_Monthly_Goal as plmg ON plmg.Produce_LineID = pl.Produce_LineID AND (Produce_Month IS NULL or Produce_Month = N'${element}')
    Where (pl.Factory_SubID = ${req.body.Factory_SubID})
    AND ISNULL(DATEDIFF(Month, pl.Create_Date, CAST(N'${element}' + '/01' AS datetime)), 999) >= 0
    AND ISNULL(DATEDIFF(Month, pl.Histiry_Date, CAST(N'${element}' + '/01' AS datetime)), -999) < 0
    `
  });
  // console.log(strSQL2)
  db.sql(req.Enterprise, strSQL2).then((result) => {
    // console.log(res.locals.Capacity_Info)
    result.recordset.forEach((e, index, array) => {
      Object.assign(e, ...res.locals.Capacity_Info.filter((data) => (data.Produce_LineID == e.Produce_LineID && data.Plan_Month == e.Produce_Month)))
      if (e.Produce_Line_Monthly_GoalID) {
        e.totalCapacity = e.Monthly_Workdays * e.Daily_WorkingHours * e.Hourly_Production_Capacity + e.Mohthly_Overtime * e.Hourly_Production_Capacity 
        e.excessStandardCapacity = e.Hourly_Production_Capacity * 8 * 5
      }
    });
    result.recordset.push(...res.locals.Capacity_Info.filter((data) => (data.Produce_LineID === null))) // 處理未排線別的資料

    let wIndex = 0
    res.locals.Week_Capacity_Info.forEach(element => {
      wIndex = result.recordset.findIndex(x => x.Produce_LineID === element.Produce_LineID)
      result.recordset[wIndex]['Week' + element.Week_Count + '_Qty'] = element.Qty
      result.recordset[wIndex]['Week' + element.Week_Count + '_Worked_Qty'] = element.Worked_Qty
    });
    res.send({
      Capacity_Info: result.recordset,
      Week_Info: res.locals.Week_Info
    });
  }).catch((err) => {
    console.log(err);
    res.status(500).send(err);
  })
});

// Maintain Product
router.post('/Product_Maintain', function (req, res, next) {
  console.log("Call Product_Maintain(PPIC) Api:", req.body);

  // req.body.Mode === 1 表示修改
  req.body.Style_No = req.body.Style_No ? `N'${req.body.Style_No.trim().substring(0,20).replace(/'/g, "''")}'` : `''`;
  req.body.Product_No = req.body.Product_No ? `N'${req.body.Product_No.trim().substring(0,25).replace(/'/g, "''")}'` : `''`;

  var strSQL = `Declare @ROWCOUNT int = 0`
  switch (req.body.Mode) {
    case 1:
      var Size = 0;
      switch (req.body.Name) {
        case 'PP_Sample_Require_Date':
          Size = 10;
          req.body.Value = req.body.Value ? `N'${req.body.Value.trim().replace(/'/g, "''")}'` : `''`;
          break;
      }
      strSQL += format(`
        Update [dbo].[Product] Set [{Name}] = ${Size == 0 ? '{Value}': `substring({Value}, 1, ${Size})`}
        where Product_No = {Product_No}
        ${req.body.Name == 'Product_No' ? ' And (Select count(*) From Product p where Product_No = {Value}) = 0 ':'' };
        Set @ROWCOUNT = @@ROWCOUNT;
        `, req.body);
      break;
  }

  strSQL += format(`Select @ROWCOUNT as Flag;`, req.body);
  // console.log(strSQL)
  db.sql(req.Enterprise, strSQL)
    .then((result) => {
      //console.log(result.recordsets[0])
      res.send({
        Flag: result.recordsets[0][0].Flag > 0
      });
    }).catch((err) => {
      console.log(err);
      res.status(500).send(err);
    })
});

// Get Work Gang data
router.post('/Work_Gang_List', function (req, res, next) {
  console.log("Call Work_Gang_List Api(GET) in Production");

  var strSQL = format(`
  SELECT Work_GangID, Factory_SubID, Work_Gang_Name, Persons, Pairs_Day, WorkshopID FROM Factory_Work_Gang
  SELECT WorkshopID, Workshop, L2_Workshop FROM Workshop

  `,req.params);

  // console.log(strSQL)
  db.sql(req.SiteDB, strSQL)
    .then((result) => {
      // console.log(result)
      result.recordsets[0].forEach(element => {
        element.value = element.WorkshopID.split(',').map(function(x) {
          return result.recordsets[1].find(y => y.WorkshopID === parseInt(x));
        });
      });
      res.send(result.recordsets[0]);
    }).catch((err) => {
      console.log(err);
      res.status(500).send(err);
    })
});

// Maintain Factory_Work_Gang
router.post('/Work_Gang_Maintain', function (req, res, next) {
  console.log("Call Work_Gang_Maintain Api:", req.body);

  // req.body.Mode === 0 表示新增
  // req.body.Mode === 1 表示修改 
  // req.body.Mode === 2 表示刪除
  // Factory_Work_Gang Table WorkshopID type: nvarchar(-1)
  
  req.body.Factory_SubID = req.body.Factory_SubID ? `N'${req.body.Factory_SubID.trim().substring(0, 15).replace(/'/g, "''")}'` : `''`;
  req.body.Work_Gang_Name = req.body.Work_Gang_Name ? `N'${req.body.Work_Gang_Name.trim().substring(0, 20).replace(/'/g, "''")}'` : `''`;
  req.body.WorkshopID = req.body.Work_Gang_Name ? `N'${req.body.WorkshopID.trim().replace(/'/g, "''")}'` : `''`; 

  let strSQL = 'Declare @ROWCOUNT int;'
  switch (req.body.Mode) {
    case 0:
      strSQL += format(`
        Insert into [dbo].[Factory_Work_Gang] (Factory_SubID, Work_Gang_Name, WorkshopID)
        VALUES ({Factory_SubID}, {Work_Gang_Name}, {WorkshopID})

        Set @ROWCOUNT = @@ROWCOUNT;
        `, req.body);
      break;
    case 1:
      strSQL += format(`
        Update [dbo].[Factory_Work_Gang] Set [{Name}] = {Value}
        where Factory_Work_Gang = {Work_GangID}
        Set @ROWCOUNT = @@ROWCOUNT;
        `, req.body);
      break;
    case 2:
      strSQL += format(`
        Delete FROM [dbo].[Factory_Work_Gang] 
        where Factory_Work_Gang = {Work_GangID}; 
        Set @ROWCOUNT = @@ROWCOUNT;
        `, req.body);
      break;
  }

  strSQL += format(`
  Select @ROWCOUNT as Flag;
  `, req.body);
  // console.log(strSQL)
  // res.send({Flag: true});
  db.sql(req.Enterprise, strSQL)
    .then((result) => {
      res.send({
        Flag: result.recordsets[0][0].Flag > 0
      });
    }).catch((err) => {
      console.log(err);
      res.status(500).send(err);
    })
});


// Get Manufacturer_List
router.post('/Manufacturer_List', function (req, res, next) {
  console.log("Call Manufacturer_List Api:");

  req.body.FactoryID = req.body.FactoryID ? `${req.body.FactoryID.trim().substring(0, 15).replace(/'/g, '')}` : '';
  req.body.Factory_Name = req.body.Factory_Name ? `${req.body.Factory_Name.trim().substring(0, 100).replace(/'/g, '')}` : '';
  req.body.Country = req.body.Country ? `${req.body.Country.trim().substring(0, 15).replace(/'/g, '')}` : '';

  var strSQL = format(`
  SELECT Top 1000 row_number() Over(Order By FactoryID desc) as RecNo
  ,[FactoryID]
  ,[Factory_Name]
  ,[Country]
  ,[Phone_Number]
  ,[Fax_Number]
  ,[Contact]
  ,[Address]
  FROM [dbo].[Factory] With(Nolock,NoWait)
  where (N'{FactoryID}' = '' or [FactoryID] like N'{FactoryID}%')
  And (N'{Factory_Name}' = '' or [Factory_Name] like N'%{Factory_Name}%')
  And (N'{Country}' = '' or [Country] like N'%{Country}%')
  Order By FactoryID
  `, req.body);
  // console.log(strSQL)
  db.sql(req.Enterprise, strSQL)
    .then((result) => {
      res.send(result.recordset);
    }).catch((err) => {
      console.log(err);
      res.status(500).send(err);
    })
});


// Get Manufacturer_Info
router.post('/Manufacturer_Info', function (req, res, next) {
  console.log("Call Manufacturer_Info Api:", req.body);

  req.body.FactoryID = req.body.FactoryID ? `N'${req.body.FactoryID.trim().substring(0,15).replace(/'/g, "''")}'` : `''`;

  var strSQL = format(`
  SELECT TOP 100 PERCENT dbo.Factory.FactoryID, dbo.Factory.Factory_Name, dbo.Factory.Address, dbo.Factory.Country, dbo.Factory.Fax_Number, dbo.Factory.Phone_Number,
  dbo.Factory.Contact, dbo.Factory.Data_Updater, CONVERT(VARCHAR, dbo.Factory.Data_Update, 111) AS Data_Update, dbo.Factory_Sub.Factory_SubID, dbo.Factory_Sub.Port, dbo.Factory_Sub.Factory_Sub_Name, dbo.Factory_Sub.Address AS Sub_Address,
  dbo.Factory_Sub.Country AS Sub_Country, dbo.Factory_Sub.Fax_Number AS Sub_Fax_Number, dbo.Factory_Sub.Phone_Number AS Sub_Phone_Number, dbo.Factory_Sub.Contact AS Sub_Contact2, dbo.Factory_Sub.Data_Updater AS Sub_Data_Updater, CONVERT(VARCHAR, dbo.Factory_Sub.Data_Update, 111) AS Sub_Data_Update
  FROM dbo.Factory
  LEFT JOIN dbo.Factory_Sub ON dbo.Factory.FactoryID = dbo.Factory_Sub.FactoryID
  GROUP BY dbo.Factory.FactoryID, dbo.Factory.Factory_Name, dbo.Factory.Address, dbo.Factory.Country, dbo.Factory.Fax_Number, dbo.Factory.Phone_Number, dbo.Factory.Contact, dbo.Factory.Data_Updater, dbo.Factory.Data_Update, dbo.Factory_Sub.Factory_SubID, dbo.Factory_Sub.Port, dbo.Factory_Sub.Factory_Sub_Name, dbo.Factory_Sub.Address, dbo.Factory_Sub.Country, dbo.Factory_Sub.Fax_Number, dbo.Factory_Sub.Phone_Number, dbo.Factory_Sub.Contact, dbo.Factory_Sub.Data_Updater, dbo.Factory_Sub.Data_Update
  HAVING dbo.Factory.FactoryID = {FactoryID}
  ORDER BY dbo.Factory_Sub.Factory_SubID
  `, req.body);
  // console.log(strSQL)
  db.sql(req.Enterprise, strSQL)
    .then((result) => {
      res.send(result.recordset);
    }).catch((err) => {
      console.log(err);
      res.status(500).send(err);
    })
});
/* Darren-Chang API End */

// Manufacturer
router.post('/Manufacturer_Maintain', async (req, res, next) => {
  console.log("Call Manufacturer_Maintain Api:", req.body);
  // req.body.Mode === 0 表示新增
  // req.body.Mode === 1 表示修改 
  // req.body.Mode === 2 表示刪除
  // req.body.Mode === 3 表示查詢是否有資料
  req.body.FactoryID = req.body.FactoryID ? `N'${req.body.FactoryID.trim().substring(0,15).replace(/'/g, "''")}'` : null;
  req.body.Factory_Name = req.body.Factory_Name ? `N'${req.body.Factory_Name.trim().substring(0,100).replace(/'/g, "''")}'` : null;
  req.body.Country = req.body.Country ? `N'${req.body.Country.trim().substring(0,15).replace(/'/g, "''")}'` : null;
  req.body.Contact = req.body.Contact ? `N'${req.body.Contact.trim().substring(0,30).replace(/'/g, "''")}'` : null;
  req.body.Address = req.body.Address ? `N'${req.body.Address.trim().substring(0,256).replace(/'/g, "''")}'` : null;
  req.body.Fax_Number = req.body.Fax_Number ? `'${req.body.Fax_Number.trim().substring(0,30).replace(/'/g, "''")}'` : null;
  req.body.Phone_Number = req.body.Phone_Number ? `'${req.body.Phone_Number.trim().substring(0,30).replace(/'/g, "''")}'` : null;
  req.body.Data_Updater = req.body.Data_Updater ? `N'${req.body.Data_Updater.trim().substring(0,20).replace(/'/g, "''")}'` : null;
  
  let strSQL = 'Declare @ROWCOUNT int;'
  // 依據 req.body.Mode => strSQL 帶入資料庫語法
  switch (req.body.Mode) {
    case 0: //add
      strSQL += format(`
        IF NOT EXISTS (
          SELECT 1 FROM [ENTERPRISE].[dbo].[Factory] WHERE [FactoryID] = {FactoryID}  
        )
        BEGIN
          INSERT INTO [ENTERPRISE].[dbo].[Factory]
            ([FactoryID], [Factory_Name], [Address], [Country], [Fax_Number], [Phone_Number], [Contact], [UserID])
          VALUES
            ({FactoryID}, {Factory_Name}, {Address}, {Country}, {Fax_Number}, {Phone_Number}, {Contact}, N'${req.UserID}')
        END
      `, req.body)
      break
    case 1: //update
      // 改主鍵特殊處裡 
      if (req.body.keyName === 'FactoryID') {
        req.body.newFactoryID = req.body.newFactoryID ? `N'${req.body.newFactoryID.trim().substring(0,15).replace(/'/g, "''")}'` : null;
        strSQL += format(`
          IF NOT EXISTS (
            SELECT 1 FROM [ENTERPRISE].[dbo].[Factory] WHERE [FactoryID] = {newFactoryID}  
          )
          BEGIN
            UPDATE [ENTERPRISE].[dbo].[Factory]
            SET
              UserID = isnull(UserID, N'${req.UserID}'),
              [{keyName}] = {newFactoryID},
              [Data_Updater] = N'${req.UserID}',
              [Data_Update] = GETDATE()
            WHERE [FactoryID] = {FactoryID}
          END
        `, req.body)
      } else {
        strSQL += format(`
          UPDATE [ENTERPRISE].[dbo].[Factory] SET
            UserID = isnull(UserID, N'${req.UserID}'),
            [{keyName}] = {${req.body.keyName}},
            [Data_Updater] = N'${req.UserID}',
            [Data_Update] = GETDATE()
          WHERE [FactoryID] = {FactoryID}
          `, req.body)
      }
      break
    case 2: // delete
      strSQL += format(`DELETE FROM [ENTERPRISE].[dbo].[Factory] WHERE [FactoryID] = {FactoryID}`, req.body)
      break
    case 3:
      strSQL = format(`
        SELECT COUNT(*) AS count FROM [ENTERPRISE].[dbo].[Factory] WHERE [FactoryID] = {FactoryID} 
      `, req.body)
      break
    default:
      break
  }

  if (req.body.Mode != 3) {
    strSQL += format(`
      Set @ROWCOUNT = @@ROWCOUNT;
      Select @ROWCOUNT as Flag;
    `, req.body)
  }
  try {
    console.log('strSQL', strSQL)
    // 資料庫動作
    const result = await db.sql(req.Enterprise, strSQL)
    // 依據不同需求回傳
    if (req.body.Mode != 3) {
      res.send({Flag:result.recordsets[0][0].Flag > 0});
    } else {
      res.send(result);
    }
  }
  catch (err) {
    console.log(err)
    res.status(500).send(err)
  }
});

router.post('/Manufacturer_FactorySub', async (req, res, next) => {
  console.log("Call Manufacturer_FactorySub Api:", req.body);

  // req.body.Mode === 0 表示新增
  // req.body.Mode === 1 表示修改 
  // req.body.Mode === 2 表示刪除
  // req.body.Mode === 3 表示查詢是否有資料
  req.body.FactoryID = req.body.FactoryID ? `N'${req.body.FactoryID.trim().substring(0,15).replace(/'/g, "''")}'` : null;
  req.body.Factory_SubID = req.body.Factory_SubID ? `N'${req.body.Factory_SubID.trim().substring(0,15).replace(/'/g, "''")}'` : null;
  req.body.Country = req.body.Country ? `N'${req.body.Country.trim().substring(0,15).replace(/'/g, "''")}'` : null;
  req.body.Port = req.body.Port ? `N'${req.body.Port.trim().substring(0,25).replace(/'/g, "''")}'` : null;
  req.body.Fax_Number = req.body.Fax_Number ? `'${req.body.Fax_Number.trim().substring(0,30).replace(/'/g, "''")}'` : null;
  req.body.Phone_Number = req.body.Phone_Number ? `'${req.body.Phone_Number.trim().substring(0,30).replace(/'/g, "''")}'` : null;
  req.body.Contact = req.body.Contact ? `N'${req.body.Contact.trim().substring(0,30).replace(/'/g, "''")}'` : null;
  req.body.Factory_Sub_Name = req.body.Factory_Sub_Name ? `N'${req.body.Factory_Sub_Name.trim().substring(0,100).replace(/'/g, "''")}'` : null;
  req.body.Address = req.body.Address ? `N'${req.body.Address.trim().substring(0,256).replace(/'/g, "''")}'` : null;
  req.body.Data_Updater = req.body.Data_Updater ? `N'${req.body.Data_Updater.trim().substring(0,20).replace(/'/g, "''")}'` : null;

  let strSQL = 'Declare @ROWCOUNT int; '

  switch (req.body.Mode) {
    case 0: //新增
    strSQL += format(`
        IF NOT EXISTS (
          SELECT 1 FROM [ENTERPRISE].[dbo].[Factory_Sub] WHERE [Factory_SubID] = {Factory_SubID}
        )
        BEGIN
          INSERT INTO [ENTERPRISE].[dbo].[Factory_Sub]
            ([Factory_SubID], [FactoryID], [Port], [Country], [Create_Date], [Data_Updater], [Data_Update])
          VALUES
            ({Factory_SubID}, {FactoryID}, {Port}, {Country}, GETDATE(), N'${req.UserID}', GETDATE())
        END
      `, req.body)
      break
    case 1: //修改
      // 更改PK特殊處裡
      if (req.body.keyName === 'Factory_SubID') {
        req.body.value = req.body.value ? `N'${req.body.value.trim().substring(0,15).replace(/'/g, "''")}'` : null;
        strSQL += format(`
          IF NOT EXISTS (
            SELECT 1 FROM [ENTERPRISE].[dbo].[Factory_Sub] WHERE [Factory_SubID] = {value}
          )
          BEGIN
            UPDATE [ENTERPRISE].[dbo].[Factory_Sub]
            SET
              [{keyName}] = {value},
              [Data_Updater] = N'${req.UserID}',
              [Data_Update] = GETDATE()
            WHERE [Factory_SubID] = {Factory_SubID}
          END
        `, req.body)
          } else {
        strSQL += format(`
          UPDATE [ENTERPRISE].[dbo].[Factory_Sub]
          SET
            [{keyName}] = {${req.body.keyName}},
            [Data_Updater] = N'${req.UserID}',
            [Data_Update] = GETDATE()
          WHERE [Factory_SubID] = {Factory_SubID}
        `, req.body)
      }
      break
    case 2: //刪除
      strSQL += format(`
        DELETE FROM [ENTERPRISE].[dbo].[Factory_Sub] WHERE [Factory_SubID] = {Factory_SubID}
      `, req.body)
      break
    case 3: 
      strSQL = format(`
        SELECT COUNT(*) AS count FROM [ENTERPRISE].[dbo].[Factory_Sub] WHERE [Factory_SubID] = {Factory_SubID} 
      `, req.body)
      break
    default:
      break
  }

  if (req.body.Mode != 3) {
    strSQL += format(`
      Set @ROWCOUNT = @@ROWCOUNT;
      Select @ROWCOUNT as Flag;
    `, req.body)
  }
  try {
    const result = await db.sql(req.Enterprise, strSQL)
    // 依據不同需求回傳
    if (req.body.Mode != 3) {
      res.send({Flag:result.recordsets[0][0].Flag > 0});
    } else {
      res.send(result);
    }
  }
  catch (err) {
    res.status(500).send(err)
  }
})

module.exports = router;