var express = require('express');
var router = express.Router();
const format = require('string-format');
var db = require('../../config/DB_Connect');
let cloneDeep = require('lodash/cloneDeep');
let moment = require('moment');

/* Mark-Wang API Begin */

//Get Season_Year
router.post('/Season_Year',  function (req, res, next) {
    console.log("Call Season_Year Api:");
    
    var strSQL = format(`
    SELECT distinct Substring(Season,1,4) as [Year]
    FROM [dbo].[Season] With(Nolock,NoWait)
    Order by Year desc `, req.body) ;
   //console.log(strSQL)
   
    db.sql(req.Enterprise, strSQL)
       .then((result) => {
          res.send(result.recordset);
       }).catch((err) => {
          console.log(err);
          res.status(500).send(err);
       })
 
 }); 

//Get Brand Goal Info
router.post('/Brand_Goal_Info',  function (req, res, next) {   
    console.log("Call Brand_Goal_Info Api:");
     
    req.body.Season_Year = req.body.Season_Year ? req.body.Season_Year : moment().format('YYYY');
  
    var strSQL = format(`
    SELECT [Brand_GoalID]
    ,[Brand]
    ,[Season]
    , case when substring(Season,3,2) > 17 then substring(Season,6,2) else substring(Season,6,1) + substring(Season,8,1) end + substring(Season,3,2) as label
    , Season as value
    ,[Goal_Qty]
    ,[Forcast_Qty]
    ,[Data_Updater]
    ,[Data_Update]
    FROM [dbo].[Brand_Goal]
    Where Season like '%{Season_Year}%'
    Order by Brand
     `, req.body) ;
    //console.log(strSQL)
    
     db.sql(req.Enterprise, strSQL)
        .then((result) => {
           res.send({Brand_Goal_Info: result.recordsets[0]});
        }).catch((err) => {
           console.log(err);
           res.status(500).send(err);
        })  
 });
  
 //Maintain Brand_Goal
 router.post('/Brand_Goal_Maintain',  function (req, res, next) {
    console.log("Call Brand_Goal_Maintain Api:",req.body);
 
    // req.body.Mode === 0 表示新增
    // req.body.Mode === 1 表示修改 
    // req.body.Mode === 2 表示刪除   
    var strSQL = 'Declare @ROWCOUNT int;';
    
    switch(req.body.Mode){
       case 0:
         req.body.Brand = req.body.Brand ? `N'${req.body.Brand.trim().substring(0,30).replace(/'/g, "''")}'` : `''`; 
         req.body.Season = req.body.Season ? `N'${req.body.Season.trim().substring(0,10).replace(/'/g, "''")}'` : `''`; 
         req.body.Goal_Qty = req.body.Goal_Qty ? req.body.Goal_Qty : 0;
         strSQL += format(`
               insert [dbo].[Brand_Goal] (Brand, Season, Goal_Qty, [Data_Updater], [Data_Update])
               Select {Brand} as Brand, {Season} as Season, {Goal_Qty} as Goal_Qty, N'${req.UserID}' as [Data_Updater], GetDate() as [Data_Update]
               Where ( Select Count(*) From [dbo].[Brand_Goal] with(NoLock, NoWait) Where Brand = {Brand} And Season = {Season} ) = 0;
               Set @ROWCOUNT = @@ROWCOUNT;
            `,req.body);
       break;
       case 1:
         var Size = 0;
         switch(req.body.Name) {
            case 'Brand':               
               req.body.Value = req.body.Value ? `N'${req.body.Value.trim().substring(0,20).replace(/'/g, "''")}'` : `''`; 
               req.body.Season = req.body.Season ? `N'${req.body.Season.trim().substring(0,10).replace(/'/g, "''")}'` : `''`; 
               Size = 20;
            break;
            case 'Season':
               req.body.Brand = req.body.Brand ? `N'${req.body.Brand.trim().substring(0,30).replace(/'/g, "''")}'` : `''`; 
               req.body.Value = req.body.Value ? `N'${req.body.Value.trim().substring(0,10).replace(/'/g, "''")}'` : `''`; 
               Size = 10;
            break;
            default:
               req.body.Value = req.body.Value ? req.body.Value : 0;
            break;
         }
         strSQL += format(`
               Update [dbo].[Brand_Goal] set {Name} = {Value}
               , Data_Updater = N'${req.UserID}'
               , Data_Update = GetDate() 
               Where Brand_GoalID = {Brand_GoalID}
               ${req.body.Name == 'Brand' ? 'And (Select Count(*) From [dbo].[Brand_Goal] with(NoLock, NoWait) Where Brand = {Value} And Season = {Season}) = 0' :''}
               ${req.body.Name == 'Season' ? 'And (Select Count(*) From [dbo].[Brand_Goal] with(NoLock, NoWait) Where Brand = {Brand} And Season = {Value}) = 0' :''}
               Set @ROWCOUNT = @@ROWCOUNT;
            `, req.body);
       break;
       case 2:
         strSQL += format(`         
            Delete FROM [dbo].[Brand_Goal]
            Where Brand_GoalID = {Brand_GoalID};
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
          //res.send({Flag:false});
          res.send({Flag:result.recordsets[0][0].Flag > 0});
       }).catch((err) => {
          console.log(err);
          res.status(500).send(err);
       })
 
 }); 

//Get Brand Production Goal Info
router.post('/Brand_Production_Goal_Info',  function (req, res, next) {   
   console.log("Call Brand_Production_Goal_Info Api:");
    
   req.body.Brand_GoalID = req.body.Brand_GoalID ? req.body.Brand_GoalID : null;
 
   var strSQL = format(`
   SELECT bpg.[Brand_Production_GoalID]
   , [Brand]
   , case when substring(Season,3,2) > 17 then substring(Season,6,2) else substring(Season,6,1) + substring(Season,8,1) end + substring(Season,3,2) as Season
   , bpg.[Brand_GoalID]
   --, (Select Factory_SubID From Produce_Line pl with(NoLock,NoWait) Where pl.Produce_LineID = bpg.Produce_LineID ) as Factory_SubID
   , bpg.[Produce_LineID]   
   , bpg.[Month]
   , bpg.[Walkthrough_Qty]
   , bpg.[Order_Qty]
   , bpg.[Data_Updater]
   , bpg.[Data_Update]
   FROM [dbo].[Brand_Goal] bg with(NoLock,NoWait)
   Inner Join [dbo].[Brand_Production_Goal] bpg with(NoLock,NoWait) on bg.Brand_GoalID = bpg.Brand_GoalID
   Where bg.Brand_GoalID = {Brand_GoalID}

   --Select '' as Factory_SubID, '' as Produce_LineID
   --union
   --Select Factory_SubID, Produce_LineID From Produce_Line;   
   
    `, req.body) ;
   //console.log(strSQL)
   
    db.sql(req.Enterprise, strSQL)
       .then((result) => {
         // result.recordsets[0].forEach((item)=>{
         //    item.Factory_Line = result.recordsets[1].filter((data)=>(data.Factory_SubID == item.Factory_SubID));
         //    item.Factory_Line = item.Factory_Line.length > 0 ? item.Factory_Line : [{Factory_SubID:'',Produce_LineID:''}]
         //  })
          res.send({Brand_Production_Goal_Info: result.recordsets[0]});
       }).catch((err) => {
          console.log(err);
          res.status(500).send(err);
       })  
});

 //Maintain Brand_Production_Goal
 router.post('/Brand_Production_Goal_Maintain',  function (req, res, next) {
   console.log("Call Brand_Production_Goal_Maintain Api:",req.body);

   // req.body.Mode === 0 表示新增
   // req.body.Mode === 1 表示修改 
   // req.body.Mode === 2 表示刪除   
   var strSQL = 'Declare @ROWCOUNT int;';
   
   switch(req.body.Mode){
      case 0:
        req.body.Produce_LineID = req.body.Produce_LineID ? `N'${req.body.Produce_LineID.trim().substring(0,15).replace(/'/g, "''")}'` : `''`; 
        req.body.Month = req.body.Month ? `N'${req.body.Month.trim().substring(0,07).replace(/'/g, "''")}'` : `''`; 
        req.body.Walkthrough_Qty = req.body.Walkthrough_Qty ? req.body.Walkthrough_Qty : 0;
        strSQL += format(`
              insert [dbo].[Brand_Production_Goal] (Brand_GoalID, Produce_LineID, Month, Walkthrough_Qty, [Data_Updater], [Data_Update])
              Select {Brand_GoalID} as Brand_GoalID, {Produce_LineID} as Produce_LineID, {Month} as Month, {Walkthrough_Qty} as Walkthrough_Qty, N'${req.UserID}' as [Data_Updater], GetDate() as [Data_Update]
              Where ( Select Count(*) From [dbo].[Brand_Production_Goal] with(NoLock, NoWait) Where Brand_GoalID = {Brand_GoalID} And Produce_LineID = {Produce_LineID} And Month = {Month} ) = 0;
              Set @ROWCOUNT = @@ROWCOUNT;
           `,req.body);
      break;
      case 1:
        var Size = 0;
        switch(req.body.Name) {
           case 'Produce_LineID':
           case 'Month':
               req.body.Value = req.body.Value ? `N'${req.body.Value.trim().replace(/'/g, "''")}'` : `''`; 
           break;
           default:
               req.body.Value = req.body.Value ? req.body.Value : 0;
           break;
        }
        strSQL += format(`
              Update [dbo].[Brand_Production_Goal] set {Name} = {Value}
              , Data_Updater = N'${req.UserID}'
              , Data_Update = GetDate() 
              Where Brand_Production_GoalID = {Brand_Production_GoalID};
              Set @ROWCOUNT = @@ROWCOUNT;
           `, req.body);
      break;
      case 2:
        strSQL += format(`         
           Delete FROM [dbo].[Brand_Production_Goal]
           Where Brand_Production_GoalID = {Brand_Production_GoalID};
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
         //res.send({Flag:false});
         res.send({Flag:result.recordsets[0][0].Flag > 0});
      }).catch((err) => {
         console.log(err);
         res.status(500).send(err);
      })

}); 

 
/* Mark-Wang API End */


/* Darren-Chang API Begin */
/* Darren-Chang API End */

module.exports = router;
