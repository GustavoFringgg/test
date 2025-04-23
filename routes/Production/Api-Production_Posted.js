var express = require('express');
var router = express.Router();
var WebServer = require('../../config/WebServer');
const format = require('string-format');
var moment = require('moment');
var db = require('../../config/DB_Connect');
const cloneDeep = require('lodash/cloneDeep');

/* Mark-Wang API Begin */

//Get Posted Produce_No
router.post('/Get_Posted_Produce_No',  function (req, res, next) {
   console.log("Call Get_Posted_Produce_No Api:");

   req.body.Factory_SubID = req.body.Factory_SubID ? `N'${req.body.Factory_SubID.trim().substring(0,15).replace(/'/g, "''")}'` : `''`; 

   var strSQL = format(`  
   Select p.Produce_No
   from Produce p 
   where abs(isnull(p.Shipmented,0)) = 0
   And ({Factory_SubID} = '' or  p.Factory_SubID = {Factory_SubID})
   And isnull(p.Factory_SubID,'') <> ''
   And p.Plan_Month is not null
   --And p.Produce_Purpose = 'Order'
   And ABS(isnull(p.Exported,0)) = 1
   Order by p.Produce_No;
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

//Check Posted Produce_No
router.post('/Check_Posted_Produce_No',  function (req, res, next) {
   console.log("Call Check_Posted_Produce_No Api:");

   req.body.Produce_No = req.body.Produce_No ? `N'${req.body.Produce_No.trim().substring(0,20).replace(/'/g, "''")}'` : `''`; 

   var strSQL = format(` Declare @Exported int, @Shipmented int, @UnProduce int 
   Select @Exported = ABS(isnull(p.Exported,0)) 
   , @Shipmented = ABS(isnull(p.Shipmented,0))
   , @UnProduce = ABS(isnull(p.UnProduce,0))
   from Produce p 
   where p.Produce_No = {Produce_No} 
   --And p.Plan_Month is not null
   --And ABS(isnull(p.Exported,0)) = 1
   --And abs(isnull(p.Shipmented,0)) = 0;

   Select case when @Exported is null then 0 else 1 end Flag
   , case when @Exported is null then 0 else @Exported end as Exported
   , case when @Shipmented is null then 0 else @Shipmented end  as Shipmented
   , case when @UnProduce is null then 0 else @UnProduce end  as UnProduce;

   `, req.body) ;
   //console.log(strSQL)

   db.sql(req.SiteDB, strSQL)
      .then((result) => {
         var DataSet = {Produce_No_Flag: result.recordsets[0][0].Flag == 1
            , Exported_Flag: result.recordsets[0][0].Exported == 1
            , Shipmented_Flag: result.recordsets[0][0].Shipmented == 1
            , UnProduce_Flag: result.recordsets[0][0].UnProduce == 1
            
         }
         res.send(DataSet);
      }).catch((err) => {
         console.log(err);
         res.status(500).send(err);
      })
});


//Get Posted Factory Info
router.post('/Get_Posted_Factory',  function (req, res, next) {
   console.log("Call Get_Posted_Factory Api:");
   
   var strSQL = format(`  
    
/*    
   SELECT distinct p.Factory_SubID, fs.OrganizationID
   from Produce p with(NoLock,NoWait)
   Inner Join Factory_Sub fs with(NoLock,NoWait) on fs.Factory_SubID = p.Factory_SubID
   where abs(isnull(p.Shipmented,0)) = 0
   And Plan_Month is not null        
   And (fs.OrganizationID = (Select [OrganizationID] From Control) or fs.OrganizationID is null)
   Order by p.Factory_SubID;
*/   
   SELECT distinct p.Factory_SubID, fs.OrganizationID
   from Produce p with(NoLock,NoWait)
   Left Outer Join Factory_Sub fs with(NoLock,NoWait) on fs.Factory_SubID = p.Factory_SubID
   where abs(isnull(p.Shipmented,0)) = 0
   And Plan_Month is not null 
   And p.Factory_SubID is not null       
   union
   SELECT fs.Factory_SubID, fs.OrganizationID
   from Factory_Sub fs with(NoLock,NoWait)
   Inner join Produce_Line pl with(NoLock,NoWait) on pl.Factory_SubID = fs.Factory_SubID
   where fs.History_Date is null
   Order by Factory_SubID

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

// 取得 Produce_Daily_Info 資料
router.post('/Produce_Daily_Info', function (req, res, next) {   
   console.log("Call Produce_Daily_Info Api:", req.body);
 
   req.body.Mode = req.body.Mode ? req.body.Mode : 0;   
    
   //Mode == 0 Get Produce_Daily 
   //Mode == 1 Get Produce_Daily_Detail Data and Produce_Daily_Detail_Size Data
   switch(req.body.Mode){
      case 0:
         req.body.Posted_Date = req.body.Posted_Date ? `N'${req.body.Posted_Date.trim().substring(0,10).replace(/'/g, "''")}'` : `''`; 
         req.body.Factory_SubID = req.body.Factory_SubID ? `N'${req.body.Factory_SubID.trim().substring(0,15).replace(/'/g, "''")}'` : `''`; 
         
         var strSQL = format(`
            with tmp_Produce_Daily (Produce_DailyID, Date, Over_Time, Produce_LineID
               , Cutting_Hour, Cutting_Person
               , Stitching_Hour, Stitching_Person
               , Lasting_Hour, Lasting_Person
               , Packing_Hour, Packing_Person
               , Data_Updater, Data_Update)
            as (
             SELECT p.Produce_DailyID
             , Convert(varchar(10),p.Date,111) as Date
             , ABS(cast(p.Over_Time as int)) as Over_Time
             , p.Produce_LineID
             , p.Cutting_Hour
             , p.Cutting_Person
             , p.Stitching_Hour
             , p.Stitching_Person
             , p.Lasting_Hour
             , p.Lasting_Person
             , p.Packing_Hour
             , p.Packing_Person
             , p.Data_Updater
             , Convert(varchar(20),p.Data_Update,120) as Data_Update
             FROM Produce_Daily p with(NoLock,NoWait)
             Inner Join Produce_Line pl with(NoLock,NoWait) on pl.Produce_LineID = p.Produce_LineID
             Where p.Date = {Posted_Date}             
             And pl.Factory_SubID = {Factory_SubID}
             ),
             tmp_Produce_Daily_Detail (Produce_DailyID, Cutting_Qty, Stitching_Qty, Lasting_Qty, Packing_Qty) 
             as (
                Select p.Produce_DailyID
                , sum(Cutting_Qty) as Cutting_Qty
                , sum(Stitching_Qty) as Stitching_Qty
                , sum(Lasting_Qty) as Lasting_Qty
                , sum(Packing_Qty) as Packing_Qty
                From Produce_Daily_Detail pd with(NoLock, NoWait)                
                Inner Join tmp_Produce_Daily p on pd.Produce_DailyID = p.Produce_DailyID
                Group by p.Produce_DailyID
             )

            Select tmp.Produce_DailyID, Date, Over_Time, Produce_LineID
             , Cutting_Hour, Cutting_Person
             , Stitching_Hour, Stitching_Person
             , Lasting_Hour, Lasting_Person
             , Packing_Hour, Packing_Person
             , Format(isnull(d.Cutting_Qty,0),'N0') as Cutting_Qty
             , Format(isnull(d.Stitching_Qty,0),'N0') as Stitching_Qty
             , Format(isnull(d.Lasting_Qty,0),'N0') as Lasting_Qty
             , Format(isnull(d.Packing_Qty,0),'N0') as Packing_Qty
             , Data_Updater, Data_Update
            From tmp_Produce_Daily tmp
            Left Outer Join tmp_Produce_Daily_Detail d on tmp.Produce_DailyID = d.Produce_DailyID
            Order by tmp.Produce_LineID;

         `,req.body);
      break;
      case 1:
         req.body.Produce_DailyID = req.body.Produce_DailyID ? req.body.Produce_DailyID : 0; 
         req.body.Processing_Type = req.body.Processing_Type ? req.body.Processing_Type : 0; 
         var strSQL = format(`            
            Declare @Produce_Daily_Detail table (Produce_Daily_DetailID int, Produce_DailyID int, Produce_No nvarchar(20), Produce_Purpose_Flag int, Produce_Qty float, Qty float)

            Insert @Produce_Daily_Detail
            SELECT d.Produce_Daily_DetailID
            , d.Produce_DailyID
            , d.Produce_No
            , case when p.Produce_Purpose = 'Order' then 1 else 0 end as Produce_Purpose_Flag
            , isnull(p.Qty,0) as Produce_Qty
            , case 
               when {Processing_Type} = 0 then isnull(d.Cutting_Qty,0)
               when {Processing_Type} = 1 then isnull(d.Stitching_Qty,0)
               when {Processing_Type} = 2 then isnull(d.Lasting_Qty,0)
               when {Processing_Type} = 3 then isnull(d.Packing_Qty,0)
            end as Qty
            FROM Produce_Daily_Detail d with(NoLock ,NoWait)
            Inner Join Produce p with(NoLock ,NoWait) on d.Produce_No = p.Produce_No
            Where d.Produce_DailyID = {Produce_DailyID}
            Order by d.Produce_No;

            SELECT tmp.* 
            , isnull(tmp.Produce_Qty,0) - isnull(tmp2.Qty ,0) as Balance_Qty
            FROM @Produce_Daily_Detail tmp
            Left Outer Join (
               Select t.Produce_No, Sum(case
                  when {Processing_Type} = 0 then isnull(p.Cutting_Qty,0)
                  when {Processing_Type} = 1 then isnull(p.Stitching_Qty,0)
                  when {Processing_Type} = 2 then isnull(p.Lasting_Qty,0)
                  when {Processing_Type} = 3 then isnull(p.Packing_Qty,0)
               end) as Qty			 
               From Produce_Daily_Detail p 
               Inner Join (Select distinct Produce_No From @Produce_Daily_Detail) t on p.Produce_No = t.Produce_No
               Group by t.Produce_No
            ) as tmp2 on tmp.Produce_No = tmp2.Produce_No;

            Select distinct pp.Produce_Daily_DetailID
            , case when pp.Produce_Purpose_Flag = 1 then oq.Prerange else sdq.Prerange end as Prerange
            , case when pp.Produce_Purpose_Flag = 1 then oq.Size else sdq.Size end as Size
            , REPLACE(case when pp.Produce_Purpose_Flag = 1 then ps_o.Size_Name else ps_s.Size_Name end , ' ', '') as Size_Name            
            , null as Produce_Daily_Detail_Size_ID
            , 0 as Qty            
            From @Produce_Daily_Detail pp
            Left Outer Join Order_Detail od with(NoLock, NoWait) on pp.Produce_No = od.Produce_No
            Left Outer Join Order_Qty oq with(NoLock, NoWait) on od.Order_DetailID = oq.Order_DetailID
            Left Outer Join Product_Size ps_o with(NoLock, NoWait) on ps_o.SizeID = oq.Size
            Left Outer Join Sample_Detail sd with(NoLock, NoWait) on pp.Produce_No = sd.Produce_No
            Left Outer Join Sample_Detail_Qty sdq with(NoLock, NoWait) on sd.Sample_Produce_DetailID = sdq.Sample_Produce_DetailID
            Left Outer Join Product_Size ps_s with(NoLock, NoWait) on ps_s.SizeID = sdq.Size     
            Order by pp.Produce_Daily_DetailID
            , case when pp.Produce_Purpose_Flag = 1 then oq.Prerange else sdq.Prerange end
            , case when pp.Produce_Purpose_Flag = 1 then oq.Size else sdq.Size end;

            SELECT pd.Produce_Daily_DetailID
            , pd.Produce_Daily_Detail_Size_ID
            , pd.Size
            , pd.Qty            
            FROM dbo.Produce_Daily_Detail_Size pd WITH (NOLOCK, NoWait) 
            Inner Join @Produce_Daily_Detail pp on pp.Produce_Daily_DetailID = pd.Produce_Daily_DetailID 
            Where pd.Processing_Type = {Processing_Type}
            Order by pd.Produce_Daily_DetailID, pd.Size;

         `,req.body);
      break;
   }
 
   //console.log(strSQL)
   db.sql(req.SiteDB, strSQL)
     .then((result) => {
       // console.log(result)
       var DataSet = {}
       switch(req.body.Mode) {
         case 0:
            DataSet['Produce_Daily'] = result.recordsets[0];
         break;
         case 1:
            DataSet['Produce_Daily_Detail'] = result.recordsets[0];
            DataSet.Produce_Daily_Detail.forEach((item) => {
               item.SizeInfo = result.recordsets[1].filter((data)=>(data.Produce_Daily_DetailID == item.Produce_Daily_DetailID));
               item.SizeInfo.forEach((obj)=>{
                  var Produce_Daily_Detail_Size = result.recordsets[2].find((data)=>(data.Produce_Daily_DetailID == item.Produce_Daily_DetailID && data.Size == obj.Size))
                  obj['Produce_Daily_Detail_Size_ID'] = Produce_Daily_Detail_Size ? Produce_Daily_Detail_Size.Produce_Daily_Detail_Size_ID:0;
                  obj['Qty'] = Produce_Daily_Detail_Size ? Produce_Daily_Detail_Size.Qty:0;            
               });
            });
         break;
       }
 
      res.send(DataSet);
     }).catch((err) => {
       console.log(err);
       res.status(500).send(err);
     })
 });

//Produce_Daily Maintain
router.post('/Produce_Daily_Maintain',  function (req, res, next) {
   console.log("Call Produce Daily Maintain Api:",req.body);
 
   // req.body.Mode === 0 表示新增
   // req.body.Mode === 1 表示修改
   // req.body.Mode === 2 表示刪除 
   strSQL = format(` Declare @ROWCOUNT int = 0; `, req.body);
 
     switch(req.body.Mode){
      case 0:
         req.body.Posted_Date = req.body.Posted_Date ? `N'${req.body.Posted_Date.trim().substring(0,10).replace(/'/g, "''")}'` : this.moment().format('YYYY/MM/DD'); 
         req.body.Produce_LineID = req.body.Produce_LineID ? `N'${req.body.Produce_LineID.trim().substring(0,15).replace(/'/g, "''")}'` : `''`; 
         req.body.Over_Time = req.body.Over_Time ? req.body.Over_Time : 0; 
 
         strSQL += format(`
         Insert into [dbo].[Produce_Daily] ([Date], [Produce_LineID], [Over_Time], [Data_Updater], [Data_Update] )
         Select {Posted_Date} as Date, {Produce_LineID} as Produce_LineID, {Over_Time} as Over_Time, N'${req.UserID}' as [Data_Updater], GetDate() as [Data_Update]; 
 
         Set @ROWCOUNT = @@ROWCOUNT; 
         `, req.body);
      break;
      case 1:
         req.body.Produce_DailyID = req.body.Produce_DailyID ? req.body.Produce_DailyID : 0; 
                  
         var Size = 0;
         switch(req.body.Name) {
             case 'Produce_LineID':
                req.body.Produce_LineID = req.body.Produce_LineID ? `N'${req.body.Produce_LineID.trim().substring(0,15).replace(/'/g, "''")}'` : `''`; 
                Size = 15;
             break;
             default:
                Size = 0;
             break;
         }
         req.body.Value = Size > 0 ? `N'${req.body.Value.trim().substring(0,Size).replace(/'/g, "''")}'` :  req.body.Value; 
 
         strSQL += format(`     
            Update [dbo].[Produce_Daily] Set [{Name}] = case when len({Value}) = 0 or {Value} is null then null else {Value} end            
            , Data_Updater = N'${req.UserID}'
            , Data_Update = GetDate()
            where Produce_DailyID = {Produce_DailyID};
 
            Set @ROWCOUNT = @@ROWCOUNT;            
         `, req.body);
      break;
      case 2:
          req.body.Produce_DailyID = req.body.Produce_DailyID ? req.body.Produce_DailyID : 0;         
          strSQL += format(`
             Delete FROM [dbo].[Produce_Daily] 
             where Produce_DailyID = {Produce_DailyID} ;
                
             Set @ROWCOUNT = @@ROWCOUNT; 
             `, req.body);
      break;
   }
 
   strSQL += format(` Select @ROWCOUNT as Flag;`);
   //console.log(strSQL)
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

//Produce_Daily Detail Maintain
router.post('/Produce_Daily_Detail_Maintain',  function (req, res, next) {
   console.log("Call Produce Daily Detail Maintain Api:",req.body);
 
   req.body.Produce_DailyID = req.body.Produce_DailyID ? req.body.Produce_DailyID : 0; 
   req.body.Processing_Type = req.body.Processing_Type ? req.body.Processing_Type : 0;
   req.body.Produce_Daily_DetailID = req.body.Produce_Daily_DetailID ? req.body.Produce_Daily_DetailID : 0;

   // req.body.Mode === 0 表示新增
   // req.body.Mode === 1 表示修改
   // req.body.Mode === 2 表示刪除 
   strSQL = format(` 
   Declare @Mode int = ${req.body.Mode} , @ROWCOUNT int = 0, @Cutting_Qty float = 0, @Stitching_Qty float = 0, @Lasting_Qty float = 0, @Packing_Qty float = 0
   , @Qty float = 0, @Balance_Qty float = 0; 
   `, req.body);   
   switch(req.body.Mode){   
      case 0:
         req.body.Produce_No = req.body.Produce_No ? `N'${req.body.Produce_No.trim().substring(0,20).replace(/'/g, "''")}'` : `''`;
 
         strSQL += format(`
         Insert into [dbo].[Produce_Daily_Detail] ([Produce_DailyID], [Produce_No])
         Select {Produce_DailyID} as Produce_DailyID, {Produce_No} as Produce_No
         Where {Produce_No_Flag} = 1; 
 
         Set @ROWCOUNT = @@ROWCOUNT; 
         `, req.body);

      break;
      case 1:
         req.body.Produce_Daily_Detail_Size_ID = req.body.Produce_Daily_Detail_Size_ID ? req.body.Produce_Daily_Detail_Size_ID : 0;          
                  
         var Size = 0;
         switch(req.body.Name) {
             default:
                Size = 0;
             break;
         }
         req.body.Value = Size > 0 ? `N'${req.body.Value.trim().substring(0,Size).replace(/'/g, "''")}'` :  req.body.Value; 
 
         strSQL += format(`     
            Update [dbo].[Produce_Daily_Detail_Size] Set [Qty] = case when len({Value}) = 0 or {Value} is null then null else {Value} end
            where Produce_Daily_DetailID = {Produce_Daily_DetailID} And Processing_Type = {Processing_Type} And Size = {Size};
            Set @ROWCOUNT = @@ROWCOUNT;

            if(@ROWCOUNT = 0)
            Begin
               Insert [dbo].[Produce_Daily_Detail_Size] (Produce_Daily_DetailID, Processing_Type, Size, Qty)
               Select {Produce_Daily_DetailID} as Produce_Daily_DetailID, {Processing_Type} as Processing_Type, {Size} as Size, {Value} as Qty
               Where (Select count(*) From [dbo].[Produce_Daily_Detail_Size] with(NoLock,NoWait) Where Produce_Daily_DetailID = {Produce_Daily_DetailID} 
               And Processing_Type = {Processing_Type}
               And Size = {Size}) = 0;

               Set @ROWCOUNT = @@ROWCOUNT;
            End 

         `, req.body);
      break;
      case 2: 
          strSQL += format(`
             Delete FROM [dbo].[Produce_Daily_Detail] 
             where Produce_Daily_DetailID = {Produce_Daily_DetailID} ;
                
             Set @ROWCOUNT = @@ROWCOUNT; 
             `, req.body);
      break;
   }
 
   strSQL += format(` 
   if(@Mode = 1 and @ROWCOUNT > 0)
   Begin
      Declare @Produce_No varchar(20)
      Select @Qty = 
      case 
         when {Processing_Type} = 0 then Cutting_Qty
         when {Processing_Type} = 1 then Stitching_Qty
         when {Processing_Type} = 2 then Lasting_Qty
         when {Processing_Type} = 3 then Packing_Qty
      End,
      @Produce_No = Produce_No
      From Produce_Daily_Detail p with(NoLock,NoWait) 
      Where Produce_Daily_DetailID = {Produce_Daily_DetailID};

      Set @Balance_Qty = isnull((Select Qty From Produce p with(NoLock, NoWait) where p.Produce_No = @Produce_No) ,0) 
      - isnull((Select sum(case 
         when {Processing_Type} = 0 then Cutting_Qty
         when {Processing_Type} = 1 then Stitching_Qty
         when {Processing_Type} = 2 then Lasting_Qty
         when {Processing_Type} = 3 then Packing_Qty
      End) From Produce_Daily_Detail p with(NoLock, NoWait) where p.Produce_No = @Produce_No) ,0)
   End

   if((@Mode = 1 or @Mode = 2) and @ROWCOUNT > 0)
   Begin
      Select @Cutting_Qty = sum(Cutting_Qty)
      , @Stitching_Qty = sum(Stitching_Qty)
      , @Lasting_Qty = sum(Lasting_Qty)
      , @Packing_Qty = sum(Packing_Qty)      
      From Produce_Daily_Detail p with(NoLock,NoWait) 
      Where Produce_DailyID = {Produce_DailyID};
   End

   Select @ROWCOUNT as Flag, @Cutting_Qty as Cutting_Qty, @Stitching_Qty as Stitching_Qty, @Lasting_Qty as Lasting_Qty, @Packing_Qty as Packing_Qty, @Qty as Qty, @Balance_Qty as Balance_Qty;

   if(@ROWCOUNT > 0)
   Begin
      Update [dbo].[Produce_Daily] Set Data_Updater = N'${req.UserID}'
      , Data_Update = GetDate()
      where Produce_DailyID = {Produce_DailyID};
   End
   `, req.body);

   //console.log(strSQL)
   db.sql(req.SiteDB, strSQL)
      .then((result) => {
         //res.send({Flag:false});
         res.send({Flag: result.recordsets[0][0].Flag > 0
            , Cutting_Qty: result.recordsets[0][0].Cutting_Qty
            , Stitching_Qty: result.recordsets[0][0].Stitching_Qty
            , Lasting_Qty: result.recordsets[0][0].Lasting_Qty
            , Packing_Qty: result.recordsets[0][0].Packing_Qty
            , Qty: result.recordsets[0][0].Qty
            , Balance_Qty: result.recordsets[0][0].Balance_Qty
         });
      }).catch((err) => {
         console.log(err);
         res.status(500).send(err);
      })
 
 });
 

// 取得 Produce_Posted_Info 資料
router.post('/Produce_Posted_Info', function (req, res, next) {   
   console.log("Call Produce_Posted_Info Api in Production", req.body);
 
   req.body.Mode = req.body.Mode ? req.body.Mode : 0;
   req.body.Posted_Date = req.body.Posted_Date ? `N'${req.body.Posted_Date.trim().substring(0,10).replace(/'/g, "''")}'` : `''`; 
   req.body.Factory_SubID = req.body.Factory_SubID ? `N'${req.body.Factory_SubID.trim().substring(0,15).replace(/'/g, "''")}'` : `''`; 
   req.body.Produce_Line_ProcessID = req.body.Produce_Line_ProcessID ? req.body.Produce_Line_ProcessID : 0; 
   
    
   //Mode == 0 Get Produce_Posted and Produce_Posted_Detail Data
   //Mode == 1 Get Produce_Posted Data
   //Mode == 2 Get Produce_Posted_Detail Data
   var strSQL = format(`
 Declare @Mode int = {Mode};
 Declare @Produce_Posted table (Produce_PostedID int, Posted_Date datetime, IsOverTime smallint, Produce_No varchar(20), Produce_Purpose_Flag int,Produce_Line_ProcessID int, Work_Hour float, Work_Person float, Produce_LineID varchar(15), Production_QTY float, Data_Updater Nvarchar(20), Data_Update DateTime);
 
 Insert @Produce_Posted
 Select pp.Produce_PostedID, pp.Posted_Date, pp.IsOverTime, pp.Produce_No, case when isnull(p.Produce_Purpose,'Order') = 'Order' then 1 else 0 end as Produce_Purpose_Flag, pp.Produce_Line_ProcessID, pp.Work_Hour, pp.Work_Person, pp.Produce_LineID, pp.Production_QTY, pp.Data_Updater, pp.Data_Update
 From Produce_Posted pp with(NoLock, NoWait)
 Inner Join Produce_Line pl with(NoLock, NoWait) on pp.Produce_LineID = pl.Produce_LineID
 Inner Join Produce p with(NoLock, NoWait) on p.Produce_No = pp.Produce_No
 Where pp.Posted_Date = {Posted_Date}
   And pl.Factory_SubID = {Factory_SubID}
   And pp.Produce_Line_ProcessID = {Produce_Line_ProcessID};
 
 if(@Mode = 0 or @Mode = 1)
 Begin
     SELECT p.Produce_PostedID
     , Convert(varchar(10),p.Posted_Date,111) as Posted_Date
     , ABS(cast(p.IsOverTime as int)) as IsOverTime
     , p.Produce_No
     , p.Produce_Purpose_Flag
     , p.Produce_Line_ProcessID
     , (Select Process_Name From Produce_Line_Process pl with(NoLock, NoWait) Where pl.Produce_Line_ProcessID = p.Produce_Line_ProcessID ) as Process_Name
     , p.Work_Hour
     , p.Work_Person
     , p.Produce_LineID
     , Format(p.Production_QTY,'N0') as Production_QTY
     , p.Data_Updater
     , Convert(varchar(10),p.Data_Update,111) as Data_Update
     FROM @Produce_Posted p
     Order by p.Produce_No, p.Produce_Line_ProcessID;

     Select distinct pp.Produce_PostedID
     , case when pp.Produce_Purpose_Flag = 1 then oq.Prerange else sdq.Prerange end as Prerange
     , case when pp.Produce_Purpose_Flag = 1 then oq.Size else sdq.Size end as Size
     , REPLACE(case when pp.Produce_Purpose_Flag = 1 then ps_o.Size_Name else ps_s.Size_Name end , ' ', '') as Size_Name
     , null as Produce_Posted_DetailID
     , 0 as Qty
     , 0 as Defective
     From @Produce_Posted pp
     Left Outer Join Order_Detail od with(NoLock, NoWait) on pp.Produce_No = od.Produce_No
     Left Outer Join Order_Qty oq with(NoLock, NoWait) on od.Order_DetailID = oq.Order_DetailID
     Left Outer Join Product_Size ps_o with(NoLock, NoWait) on ps_o.SizeID = oq.Size
     Left Outer Join Sample_Detail sd with(NoLock, NoWait) on pp.Produce_No = sd.Produce_No
     Left Outer Join Sample_Detail_Qty sdq with(NoLock, NoWait) on sd.Sample_Produce_DetailID = sdq.Sample_Produce_DetailID
     Left Outer Join Product_Size ps_s with(NoLock, NoWait) on ps_s.SizeID = sdq.Size     
     Order by pp.Produce_PostedID
     , case when pp.Produce_Purpose_Flag = 1 then oq.Prerange else sdq.Prerange end
     , case when pp.Produce_Purpose_Flag = 1 then oq.Size else sdq.Size end;

 End
 if(@Mode = 0 or @Mode = 2)
 Begin
     SELECT pd.Produce_PostedID
     , pd.Produce_Posted_DetailID
     , pd.Size
     , pd.Qty
     , cast(pd.Defective as int) as Defective
     FROM dbo.Produce_Posted_Detail pd WITH (NOLOCK, NoWait) 
     Inner Join @Produce_Posted pp on pp.Produce_PostedID = pd.Produce_PostedID 
     Order by pd.Produce_PostedID, pd.Size;
 
 End
 
 `,req.body);
 
   //console.log(strSQL)
   db.sql(req.SiteDB, strSQL)
     .then((result) => {
       // console.log(result)
       var DataSet = {
         Produce_Posted: (req.body.Mode == 0 || req.body.Mode == 1) ? result.recordsets[0] : []
         , Produce_Posted_Detail: (req.body.Mode == 0) ? result.recordsets[2] : (req.body.Mode == 2 ? result.recordsets[0] : []) 
      };
 
      DataSet.Produce_Posted.forEach((item) => {
         item.SizeInfo = result.recordsets[1].filter((data)=>(data.Produce_PostedID == item.Produce_PostedID));
         item.SizeInfo.forEach((obj)=>{
            var Posted_Detail = DataSet.Produce_Posted_Detail.find((data)=>(data.Produce_PostedID == item.Produce_PostedID && data.Size == obj.Size))
            obj['Produce_Posted_DetailID'] = Posted_Detail ? Posted_Detail.Produce_Posted_DetailID:0;
            obj['Qty'] = Posted_Detail ? Posted_Detail.Qty:0;
            obj['Defective'] = Posted_Detail ? Posted_Detail.Defective:0;
         });
      });

      res.send(DataSet);
     }).catch((err) => {
       console.log(err);
       res.status(500).send(err);
     })
 });

//Produce_Posted Maintain
router.post('/Produce_Posted_Maintain',  function (req, res, next) {
  console.log("Call Produce Posted Maintain Api:",req.body);

  // req.body.Mode === 0 表示新增
  // req.body.Mode === 1 表示修改
  // req.body.Mode === 2 表示刪除
  // req.body.Mode === 3 表示修改數量

  strSQL = format(` Declare @ROWCOUNT int = 0; `, req.body);

    switch(req.body.Mode){
     case 0:
        req.body.Posted_Date = req.body.Posted_Date ? `N'${req.body.Posted_Date.trim().substring(0,10).replace(/'/g, "''")}'` : this.moment().format('YYYY/MM/DD'); 
        req.body.Produce_No = req.body.Produce_No ? `N'${req.body.Produce_No.trim().substring(0,20).replace(/'/g, "''")}'` : `''`; 
        req.body.Produce_LineID = req.body.Produce_LineID ? `N'${req.body.Produce_LineID.trim().substring(0,15).replace(/'/g, "''")}'` : `''`; 
        req.body.IsOverTime = req.body.IsOverTime ? req.body.IsOverTime : 0; 
        req.body.Produce_Line_ProcessID = req.body.Produce_Line_ProcessID ? req.body.Produce_Line_ProcessID : 0; 
        req.body.Work_Hour = req.body.Work_Hour ? req.body.Work_Hour : 8; 
        req.body.Work_Person = req.body.Work_Person ? req.body.Work_Person : 0; 
        req.body.Production_QTY = req.body.Production_QTY ? req.body.Production_QTY : 0; 

        strSQL += format(`
        Insert into [dbo].[Produce_Posted] ([Posted_Date], [IsOverTime], [Produce_No], [Produce_Line_ProcessID]
        , [Work_Hour], [Work_Person], [Produce_LineID], [Production_QTY], [Data_Updater], [Data_Update] )
        Select {Posted_Date} as Posted_Date, {IsOverTime} as IsOverTime, {Produce_No} as Produce_No, {Produce_Line_ProcessID} as Produce_Line_ProcessID
        , {Work_Hour} as [Work_Hour], {Work_Person} as [Work_Person], {Produce_LineID} as Produce_LineID, {Production_QTY} as [Production_QTY], N'${req.UserID}' as [Data_Updater], GetDate() as [Data_Update]
        Where (
            SELECT Count(*) as RecCount 
            FROM [dbo].[Produce_Posted] With(Nolock,NoWait) 
            where [Produce_No] = {Produce_No} 
            And [Posted_Date] = {Posted_Date} 
            And [Produce_Line_ProcessID] = {Produce_Line_ProcessID}
            And [Produce_LineID] = {Produce_LineID}
        ) = 0 ; 

        Set @ROWCOUNT = @@ROWCOUNT; 
        `, req.body);
     break;
     case 1:
        req.body.Produce_PostedID = req.body.Produce_PostedID ? req.body.Produce_PostedID : 0; 
                 
        var Size = 0;
        switch(req.body.Name) {
            case 'Posted_Date':
               req.body.Posted_Date = req.body.Posted_Date ? `N'${req.body.Posted_Date.trim().substring(0,10).replace(/'/g, "''")}'` : this.moment().format('YYYY/MM/DD'); 
               Size = 10;
            break;
            case 'Produce_No':
               req.body.Produce_No = req.body.Produce_No ? `N'${req.body.Produce_No.trim().substring(0,20).replace(/'/g, "''")}'` : `''`; 
               Size = 20;
            break;
            case 'Produce_LineID':
               req.body.Produce_LineID = req.body.Produce_LineID ? `N'${req.body.Produce_LineID.trim().substring(0,15).replace(/'/g, "''")}'` : `''`; 
               Size = 15;
            break;
            default:
               Size = 0;
            break;
        }
        req.body.Value = Size > 0 ? `N'${req.body.Value.trim().substring(0,Size).replace(/'/g, "''")}'` :  req.body.Value; 

        strSQL += format(`     
           Update [dbo].[Produce_Posted] Set [{Name}] = case when len({Value}) = 0 or {Value} is null then null else {Value} end
           , UserID = isnull(UserID, N'${req.UserID}')
           , Data_Updater = N'${req.UserID}'
           , Data_Update = GetDate()
           where Produce_PostedID = {Produce_PostedID};

           Set @ROWCOUNT = @@ROWCOUNT;            
        `, req.body);
     break;
     case 2:
         req.body.Produce_PostedID = req.body.Produce_PostedID ? req.body.Produce_PostedID : 0;         
         strSQL += format(`
            Delete FROM [dbo].[Produce_Posted] 
            where Produce_PostedID = {Produce_PostedID} 
            And ( SELECT Count(*) as RecCount 
               FROM [dbo].[Produce_Posted_Detail] With(Nolock,NoWait) 
               where [Produce_PostedID] = {Produce_PostedID}
               ) = 0;
               
            Set @ROWCOUNT = @@ROWCOUNT; 
            `, req.body);
     break;
     case 3:
         req.body.Produce_Posted_DetailID = req.body.Produce_Posted_DetailID ? req.body.Produce_Posted_DetailID : 0; 
         strSQL += format(`            
            Update Produce_Posted_Detail set Qty = {Value}
            Where Produce_PostedID = {Produce_PostedID} and Size = {Size};
            Set @ROWCOUNT = @@ROWCOUNT;

            if(@ROWCOUNT = 0)
            begin
               Insert Produce_Posted_Detail (Produce_PostedID, Size, Qty)
               Select {Produce_PostedID} as Produce_PostedID, {Size} as Size, {Value} as Qty; 
               Set @ROWCOUNT = @@ROWCOUNT;
            End
            
            `, req.body);
     break;
  }

  strSQL += format(` Select @ROWCOUNT as Flag;`);
  //console.log(strSQL)
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


/* Mark-Wang API End */


/* Darren-Chang API Begin */

// 取得 Produce_Accumulation_Info 資料
router.post('/Produce_Accumulation_Info', function (req, res, next) {   
   console.log("Call Produce_Accumulation_Info Api:", req.body);
 
   req.body.Produce_No = req.body.Produce_No ? `N'${req.body.Produce_No.trim().substring(0,20).replace(/'/g, "''")}'` : ''; 
   req.body.Processing_Type = req.body.Processing_Type ? req.body.Processing_Type : 0;
   
   var strSQL = format(`            
   Declare @Produce_Daily_Detail table (Produce_Daily_DetailID int, Produce_DailyID int, Produce_Date varchar(10), Produce_No nvarchar(20), Produce_Purpose_Flag int, Produce_Qty float, Qty float)

      Insert @Produce_Daily_Detail
      SELECT d.Produce_Daily_DetailID
      , d.Produce_DailyID
      , CONVERT(VARCHAR(5), pd.Date, 101) as Produce_Date
      , d.Produce_No
      , case when p.Produce_Purpose = 'Order' then 1 else 0 end as Produce_Purpose_Flag
      , isnull(p.Qty,0) as Produce_Qty
      , case 
         when {Processing_Type} = 0 then isnull(d.Cutting_Qty,0)
         when {Processing_Type} = 1 then isnull(d.Stitching_Qty,0)
         when {Processing_Type} = 2 then isnull(d.Lasting_Qty,0)
         when {Processing_Type} = 3 then isnull(d.Packing_Qty,0)
      end as Qty
      FROM Produce_Daily_Detail d with(NoLock ,NoWait)
      Inner Join Produce p with(NoLock ,NoWait) on d.Produce_No = p.Produce_No
      Inner Join Produce_Daily pd with(NoLock ,NoWait) on pd.Produce_DailyID = d.Produce_DailyID
      Where d.Produce_No = {Produce_No}
      Order by d.Produce_DailyID; 

      SELECT tmp.* 
      , isnull(tmp.Produce_Qty,0) - isnull(tmp2.Qty ,0) as Balance_Qty
      FROM @Produce_Daily_Detail tmp
      Left Outer Join (
         Select t.Produce_No, Sum(case
            when {Processing_Type} = 0 then isnull(p.Cutting_Qty,0)
            when {Processing_Type} = 1 then isnull(p.Stitching_Qty,0)
            when {Processing_Type} = 2 then isnull(p.Lasting_Qty,0)
            when {Processing_Type} = 3 then isnull(p.Packing_Qty,0)
         end) as Qty
         From Produce_Daily_Detail p 
         Inner Join (Select distinct Produce_No From @Produce_Daily_Detail) t on p.Produce_No = t.Produce_No
         Group by t.Produce_No
      ) as tmp2 on tmp.Produce_No = tmp2.Produce_No;

      Select distinct pp.Produce_Daily_DetailID
      , case when pp.Produce_Purpose_Flag = 1 then oq.Prerange else sdq.Prerange end as Prerange
      , case when pp.Produce_Purpose_Flag = 1 then oq.Size else sdq.Size end as Size
      , REPLACE(case when pp.Produce_Purpose_Flag = 1 then ps_o.Size_Name else ps_s.Size_Name end , ' ', '') as Size_Name            
      , null as Produce_Daily_Detail_Size_ID
      , 0 as Qty            
      From @Produce_Daily_Detail pp
      Left Outer Join Order_Detail od with(NoLock, NoWait) on pp.Produce_No = od.Produce_No
      Left Outer Join Order_Qty oq with(NoLock, NoWait) on od.Order_DetailID = oq.Order_DetailID
      Left Outer Join Product_Size ps_o with(NoLock, NoWait) on ps_o.SizeID = oq.Size
      Left Outer Join Sample_Detail sd with(NoLock, NoWait) on pp.Produce_No = sd.Produce_No
      Left Outer Join Sample_Detail_Qty sdq with(NoLock, NoWait) on sd.Sample_Produce_DetailID = sdq.Sample_Produce_DetailID
      Left Outer Join Product_Size ps_s with(NoLock, NoWait) on ps_s.SizeID = sdq.Size     
      Order by pp.Produce_Daily_DetailID
      , case when pp.Produce_Purpose_Flag = 1 then oq.Prerange else sdq.Prerange end
      , case when pp.Produce_Purpose_Flag = 1 then oq.Size else sdq.Size end;

      SELECT pd.Produce_Daily_DetailID
      , pd.Produce_Daily_Detail_Size_ID
      , pd.Size
      , pd.Qty            
      FROM dbo.Produce_Daily_Detail_Size pd WITH (NOLOCK, NoWait) 
      Inner Join @Produce_Daily_Detail pp on pp.Produce_Daily_DetailID = pd.Produce_Daily_DetailID 
      Where pd.Processing_Type = {Processing_Type}
      Order by pd.Produce_Daily_DetailID, pd.Size;
      
      SELECT od.Produce_No, oq.[Size], SUM(oq.Qty) as Goal_Qty
      FROM [dbo].[Order_Qty] oq WITH (NOLOCK, NOWAIT)
      INNER JOIN Order_Detail od ON od.Order_DetailID = oq.Order_DetailID
      WHERE od.Produce_No = {Produce_No}
      GROUP BY od.Produce_No, oq.[Size]

      SELECT pd.Size
      , SUM(pd.Qty) as Total_Qty
      FROM dbo.Produce_Daily_Detail_Size pd WITH (NOLOCK, NoWait) 
      Inner Join @Produce_Daily_Detail pp on pp.Produce_Daily_DetailID = pd.Produce_Daily_DetailID 
      Where pd.Processing_Type = {Processing_Type}
      Group by pd.Size
   `,req.body);
 
   // console.log(strSQL)
   db.sql(req.SiteDB, strSQL)
     .then((result) => {
       // console.log(result)
       var DataSet = {}

      DataSet['Accumulation_Info'] = result.recordsets[0];
      DataSet.Accumulation_Info.forEach((item) => {
         item.SizeInfo = result.recordsets[1].filter((data)=>(data.Produce_Daily_DetailID == item.Produce_Daily_DetailID));
         item.SizeInfo.forEach((obj)=>{
            var Produce_Daily_Detail_Size = result.recordsets[2].find((data)=>(data.Produce_Daily_DetailID == item.Produce_Daily_DetailID && data.Size == obj.Size))
            obj['Produce_Daily_Detail_Size_ID'] = Produce_Daily_Detail_Size ? Produce_Daily_Detail_Size.Produce_Daily_Detail_Size_ID:0;
            obj['Qty'] = Produce_Daily_Detail_Size ? Produce_Daily_Detail_Size.Qty:0;            
         });
      });
       
      DataSet['Sum_Info'] = result.recordsets[3].map((item) => {
         return {
           ...item,
           Total_Qty: result.recordsets[4].find(elem => elem.Size === item.Size) ? result.recordsets[4].find(elem => elem.Size === item.Size).Total_Qty : 0
         }
      });

      res.send({
         Accumulation_Info: DataSet.Accumulation_Info,
         Sum_Info: DataSet.Sum_Info
      });
     }).catch((err) => {
       console.log(err);
       res.status(500).send(err);
     })
 });

/* Darren-Chang API End */

module.exports = router;