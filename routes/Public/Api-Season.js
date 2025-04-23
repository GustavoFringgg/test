var express = require('express');
var router = express.Router();
const format = require('string-format');
var db = require('../../config/DB_Connect');


router.post('/Season_List', function (req, res, next) {
    console.log("Call Season_List Api",req.body);

    req.body.Season = req.body.Season ? `${req.body.Season.trim().substring(0, 10).replace(/'/g, '').toUpperCase()}` : '';
    req.body.SortID = req.body.SortID ? `${req.body.SortID.trim().substring(0, 5).replace(/'/g, '').toUpperCase()}` : '';

    var strSQL = format(`
        SELECT [Season]
        , [SortID]
        , [Data_Updater]
        , [Data_Update]
        FROM [dbo].[Season] s With(Nolock,NoWait)
        where (N'{Season}' = '' or Season like N'%{Season}%')
        And (N'{SortID}' = '' or SortID like N'%{SortID}%')  
        Order By SortID
        `, req.body) ;
        //console.log(strSQL)
        db.sql(req.Enterprise, strSQL)
           .then((result) => {
              res.send(result.recordset);
           }).catch((err) => {
              console.log(err);
              res.status(500).send(err);
           })
});

//Check sortID
router.post('/Check_SortID',  function (req, res, next) {
    console.log("Call Check_SortID Api:", req.body);
    
    req.body.SortID = req.body.SortID ? `${req.body.SortID.trim().substring(0, 5).replace(/'/g, '').toUpperCase()}` : '';
  
    var strSQL = format(`
    SELECT *
    FROM [dbo].[Season]
    where SortID = '{SortID}'
    `, req.body) ;
    db.sql(req.Enterprise, strSQL)
       .then((result) => {
          let isDataExist = null
          result.recordset.length > 0 ? isDataExist = true: isDataExist = false;
          res.send(isDataExist)
          
       }).catch((err) => {
          console.log(err);
          res.status(500).send(err);
       })
  }); 

router.post('/Season_Maintain', function (req, res, next) {
    console.log("Call Season_Maintain Api:",req.body);
 
  // req.body.mode === 0 表示新增
  // req.body.mode === 1 表示修改 
  // req.body.mode === 2 表示刪除   
  req.body.SortID = req.body.SortID != null ? req.body.SortID : null;

  let strSQL = format(`Declare  @ROWCOUNT int = 0, @SortID NVARCHAR = '{SortID}'; 
    `, req.body);
    // console.log(strSQL);

  
  switch(req.body.mode){
     case 0:
        req.body.Season = req.body.Season != null ? `N'${req.body.Season.trim().substring(0,10).replace(/'/g, '').toUpperCase()}'` : `''`;
        req.body.SortID = req.body.SortID != null ? `N'${req.body.SortID.trim().substring(0,5).replace(/'/g, '').toUpperCase()}'` : `''`;
        req.body.Data_Updater = req.body.Data_Updater != null ? `N'${req.body.Data_Updater.trim().substring(0,20).replace(/'/g, '')}'` : `''`;

        strSQL += format(`
        Insert into [dbo].[Season] (Season, SortID, Data_Updater)
        VALUES ({Season}, {SortID}, {Data_Updater});

        Set @ROWCOUNT = @@ROWCOUNT;
        `, req.body);
        // console.log(strSQL);
        
        break;
     case 1:
        req.body.value = req.body.value != null ? `N'${req.body.value.trim().substring(0,10).replace(/'/g, '').toUpperCase()}'` : `''`;
        req.body.SortID = req.body.SortID != null ? `N'${req.body.SortID.trim().substring(0,5).replace(/'/g, '').toUpperCase()}'` : `''`;
        req.body.Data_Updater = req.body.Data_Updater != null ? `N'${req.body.Data_Updater.substring(0,20).replace(/'/g, '')}'` : `''`;

      strSQL += format(`     
        Update [dbo].[Season] 
        Set {columnName} = {value}, Data_Updater = {Data_Updater}, Data_Update = getdate()
        where SortID = {SortID}
        Set @ROWCOUNT = @@ROWCOUNT;
        `, req.body);
        // console.log(strSQL);
        
        break;
     case 2:
        strSQL += format(`    
        Delete FROM [dbo].[season]
        where SortID = '{SortID}';
        Set @ROWCOUNT = @@ROWCOUNT;
        `, req.body);    
        // console.log(strSQL);
          
        break;
    }


    strSQL += format(`    
        Select @ROWCOUNT as Flag, @SortID as SortID;
        `, req.body);
    //console.log(strSQL)
    db.sql(req.Enterprise, strSQL)
        .then((result) => {
        //console.log(result)
        var dataSet = {Flag: result.recordsets[0][0].Flag > 0, SortID: result.recordsets[0].SortID} ;
        res.send(dataSet);
        }).catch((err) => {
        console.log(err);
        res.status(500).send(err);
        })

})


module.exports = router;