var express = require('express');
var router = express.Router();
var moment = require('moment');
const format = require('string-format');
var db = require('../../config/DB_Connect');
var smb2 = require('../../config/smb2');

/* Mark-Wang API Begin */

//Check Style_No
router.post('/Check_Style_No',  function (req, res, next) {
   console.log("Call Check_Style_No Api:",req.body);

   req.body.Style_No = req.body.Style_No ? `${req.body.Style_No.trim().replace(/'/g, '')}` : '';

   var strSQL = format(` Declare @RecCount int, @LenCounter int;

   Set @LenCounter = Len(N'{Style_No}');

   SELECT @RecCount = Count(*)
   FROM [dbo].[Style] With(Nolock,NoWait)
   where ([Style_No] = N'{Style_No}');

   Select case when @LenCounter > 20 then @LenCounter else @RecCount end as RecCount;
   `, req.body) ;
   //console.log(strSQL)
   db.sql(req.Enterprise, strSQL)
      .then((result) => {
         //console.log(result.recordset[0].RecCount <= 0)
         res.send({Flag: result.recordset[0].RecCount <= 0});
      }).catch((err) => {
         console.log(err);
         res.status(500).send(err);
      })

});

//Check Style_No
router.post('/Check_Product_No',  function (req, res, next) {
   console.log("Call Check_Product_No Api:",req.body);

   req.body.Product_No = req.body.Product_No ? `${req.body.Product_No.trim().replace(/'/g, '')}` : '';

   var strSQL = format(` Declare @RecCount int, @LenCounter int;

   Set @LenCounter = Len(N'{Product_No}');

   SELECT @RecCount = Count(*)
   FROM [dbo].[Product] With(Nolock,NoWait)
   where ([Product_No] = N'{Product_No}');

   Select case when @LenCounter > 20 then @LenCounter else @RecCount end as RecCount;
   `, req.body) ;
   //console.log(strSQL)
   db.sql(req.Enterprise, strSQL)
      .then((result) => {
         //console.log(result.recordset[0].RecCount <= 0)
         res.send({Flag: result.recordset[0].RecCount <= 0});
      }).catch((err) => {
         console.log(err);
         res.status(500).send(err);
      })

});

//Get Style_No
router.post('/Get_Style_No',  function (req, res, next) {
   console.log("Call Style List Api:"); 

   req.body.Style_No = req.body.Style_No ? `N'${req.body.Style_No.trim().substring(0,20).replace(/'/g, "''")}'` : `''`;

   var strSQL = format(`
   SELECT o.[Style_No]
   FROM [dbo].[Style] o With(Nolock,NoWait)
   where (o.[Brand] = (Select Brand From Style Where Style_No = {Style_No}))
   Order By o.Date desc, o.[Style_No]
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

//Get Style_List
router.post('/Style_List',  function (req, res, next) {
    console.log("Call Style List Api:");   

    req.body.Product_Type = req.body.Product_Type ? req.body.Product_Type : 'Shoes'
    req.body.Style_No = req.body.Style_No ? `${req.body.Style_No.trim().substring(0,20).replace(/'/g, '')}` : '';
    req.body.Date_From = req.body.Date_From ? `${req.body.Date_From.trim().substring(0,10)}` : '';
    req.body.Date_To = req.body.Date_To ? `${req.body.Date_To.trim().substring(0,10)}` : '';
    req.body.Pattern_No = req.body.Pattern_No ? `${req.body.Pattern_No.trim().substring(0,20).replace(/'/g, '')}` : '';
    req.body.Brand = req.body.Brand ? `${req.body.Brand.trim().substring(0,30).replace(/'/g, '')}` : '';
    req.body.Category = req.body.Category ? `${req.body.Category.trim().substring(0,15).replace(/'/g, '')}` : '';
    req.body.Gender = req.body.Gender ? `${req.body.Gender.trim().substring(0,10).replace(/'/g, '')}` : '';
    req.body.Last_No = req.body.Last_No ? `${req.body.Last_No.trim().substring(0,50).replace(/'/g, '')}` : '';
    req.body.Outsole_No = req.body.Outsole_No ? `${req.body.Outsole_No.trim().substring(0,20).replace(/'/g, '')}` : '';
    req.body.UserID = req.body.UserID ? `${req.body.UserID.trim().substring(0,20).replace(/'/g, '')}` : '';
 
    var strSQL = format(`
    SELECT Top 1000 row_number() Over(Order By o.[Date] desc) as RecNo
    , o.[Style_No]
    , convert(varchar(10) ,o.[Date] ,111) as [Date]
    , ISNULL((SELECT TOP (1) '/Datas/Images/Products/Sketches/' + Sketch_Month + '/Thumb/' + Product_No + '.jpg?tmp=' + CONVERT (varchar(25), GETDATE(), 126) AS Expr1 FROM Product WITH (NoLock , NoWait) WHERE (Style_No = o.Style_No) ORDER BY Sketch_Month DESC), '/Images/System/Blank.png') AS Sketch
    , ISNULL(Pattern_No, '') AS Pattern_No
    , ISNULL(b.BrandID, '') AS BrandID
    , ISNULL(b.Brand, '') AS Brand
    , ISNULL(Size_Mode, N'') AS Size_Mode
    , ISNULL(Size_Run, '') AS Size_Run
    , Sample_Size
    , (Select rtrim(Size_Name) From Product_Size p with(Nolock,NoWait) Where o.[Sample_Size] = p.SizeID) as [Size_Name]
    , ISNULL(Category, '') AS Category
    , ISNULL(Gender, '') AS Gender
    , ISNULL(Outsole_No, '') AS Outsole_No
    , ISNULL(Last_No, '') AS Last_No
    , ISNULL(Unit, '') AS Unit
    , Fitting_Approve
    , ISNULL(UserID, '') AS UserID
    , CCC_Code
    FROM [dbo].[Style] o With(Nolock,NoWait)
    Inner Join Brand b with(NoLock,NoWait) on o.Brand = b.Brand
    where o.Product_Type = '{Product_Type}'
    And (N'{Style_No}' = '' or o.[Style_No] like N'%{Style_No}%')
    And ((N'{Date_From}' = '' or N'{Date_To}' = '') or convert(date,o.[Date],111) between N'{Date_From}' And N'{Date_To}')
    And (N'{Pattern_No}' = '' or o.[Pattern_No] like N'%{Pattern_No}%')
    And (N'{Brand}' = '' or o.[Brand] like N'%{Brand}%')
    And (N'{Category}' = '' or o.[Category] like N'%{Category}%')
    And (N'{Gender}' = '' or o.[Gender] like N'%{Gender}%')    
    And (N'{Last_No}' = '' or o.[Last_No] like N'%{Last_No}%')
    And (N'{Outsole_No}' = '' or o.[Outsole_No] like N'{Outsole_No}%')
    And (N'{UserID}' = '' or o.[UserID] like N'%{UserID}%')
    Order By o.Date desc, o.[Style_No]
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

 //Get Style_Info
router.post('/Style_Info',  function (req, res, next) {
    console.log("Call Style_Info Api:",req.body);  
  
    req.body.Style_No = req.body.Style_No ? `N'${req.body.Style_No.trim().substring(0,20).replace(/'/g, "''")}'` : `''`;
    req.body.Mode = req.body.Mode ? req.body.Mode : 0;
    
  
    //Mode == 0 Get Style and Style Detail Data
    //Mode == 1 Get Style Data
    //Mode == 2 Get Style Detail Data
    var strSQL = format(`
    Declare @Mode int = {Mode}
  
    if(@Mode = 0 or @Mode = 1)
    Begin
        SELECT [Style_No]
        ,case when [Date] is null then '' else Convert(varchar(20),[Date],120) end as [Date]
        ,[Pattern_No]
        ,[Brand]
        ,[Product_Type]
        ,[Size_Mode]
        ,[Size_Run]
        ,[Sample_Size]
        , (Select rtrim(Size_Name) From Product_Size p with(Nolock,NoWait) Where s.[Sample_Size] = p.SizeID) as [Size_Name]
        ,[Category]
        ,[Gender]
        ,[Outsole_No]
        ,[Last_No]
        ,[Construction]
        ,[Unit]
        ,[UserID]
        ,[Data_Updater]        
        ,Convert(varchar(10),[Data_Update],111) as [Data_Update]
        , rtrim([CCC_Code]) as [CCC_Code]
        ,[Main_Material]
        ,Convert(varchar(10),[Technical_Transfer_Require_Date],111) as [Technical_Transfer_Require_Date]
        ,Convert(varchar(10),[Pattern_Confirm_Date],111) as [Pattern_Confirm_Date]
        ,Convert(varchar(10),[Fitting_Approve],111) as [Fitting_Approve]
        ,Convert(varchar(10),[Pattern_Ship_Date],111) as [Pattern_Ship_Date]
        ,Convert(varchar(10),[Cutting_Dies_Detail_Ship_Date],111) as [Cutting_Dies_Detail_Ship_Date]
        ,Convert(varchar(10),[Operating_Instructions_Ship_Date],111) as [Operating_Instructions_Ship_Date]
        ,Convert(varchar(10),[Printing_Film_Ship_Date],111) as [Printing_Film_Ship_Date]
        ,Convert(varchar(10),[Copper_Mold_Film_Ship_Date],111) as [Copper_Mold_Film_Ship_Date]
        ,[Producing_Cost]
        FROM Style s WITH (NoLock, NoWait)
        WHERE Style_No = {Style_No}
    End            
    if(@Mode = 0 or @Mode = 2)
    Begin
        Select [Product_No]
        ,[Customer_Product_No]
        ,[Style_No]
        , Convert(varchar(10),[Date],111) as [Date]
        ,[Color]
        ,[Color_Code]
        ,[Name]
        ,[Product_Attention]        
        , [UserID]
        , ISNULL('/Datas/Images/Users/Photos/Thumb/' + UserID + '.jpg?tmp=' + CONVERT(varchar(25), GETDATE(), 126), '/Images/System/Blank.png') AS Product_Owner
        , ISNULL('/Datas/Images/Products/Photos/' + Photo_Month + '/Thumb/' + Product_No + '.jpg?tmp=' + CONVERT(varchar(25), GETDATE(), 126), '/Images/System/Blank.png') AS Product_Photo        
        , ISNULL('/Datas/Images/Products/Sketches/' + Sketch_Month + '/Thumb/' + Product_No + '.jpg?tmp=' + CONVERT(varchar(25), GETDATE(), 126), '/Images/System/Blank.png') AS Sketch_Photo
        , ISNULL('/Datas/Images/Users/Photos/Thumb/' + Structure_Maker + '.jpg?tmp=' + CONVERT(varchar(25), GETDATE(), 126), '/Images/System/Blank.png') AS Structure_Owner
        ,[CFM_Approve]
        ,[Data_Updater]
        ,[Data_Update]
        ,[Technical_Sheet_Maker]
        ,[Technical_Sheet_Updater]
        ,[Technical_Sheet_Update]
        ,[Structure_Maker]
        ,[Structure_Updater]
        ,[Structure_Update]
        ,[Structure_Completed]
        ,[Structure_Approver]
        ,[Structure_Approve]
        ,[Sketch_Month]
        ,[Sketch_Drawing_Objects]
        ,[Orig_Sketch_Uploader]
        ,[Orig_Sketch_Upload]
        ,[Sketch_Uploader]
        ,[Sketch_Upload]
        ,[Photo_Month]
        From Product p with(NoLock, NoWait)
        Where p.Style_No = {Style_No}
        Order by Date desc
    End

    `, req.body) ;
    //console.log(strSQL)
    db.sql(req.Enterprise, strSQL)
       .then((result) => {
          var DataSet = {Style: (req.body.Mode == 0 || req.body.Mode == 1) ? result.recordsets[0] : []
            , Product: (req.body.Mode == 0) ? result.recordsets[1] : (req.body.Mode == 2 ? result.recordsets[0] : [])            
         };
          //console.log(DataSet)
          res.send(DataSet);
       }).catch((err) => {
          console.log(err);
          res.status(500).send(err);
       })
});

//Maintain Style
router.post('/Style_Maintain',  function (req, res, next) {
   console.log("Call Style_Maintain Api:",req.body);

   // req.body.Mode === 0 表示新增
   // req.body.Mode === 1 表示修改
   // req.body.Mode === 2 表示刪除
   var Size = 0;
   req.body.Style_No = req.body.Style_No ? `N'${req.body.Style_No.trim().substring(0,20).replace(/'/g, "''")}'` : `''`; 
   
   var strSQL = `Declare @ROWCOUNT int `
   switch(req.body.Mode){
      case 0:
         req.body.Brand = req.body.Brand ? `N'${req.body.Brand.trim().substring(0,30).replace(/'/g, "''")}'` : `''`;
         req.body.Product_Type = req.body.Product_Type ? `N'${req.body.Product_Type.trim().substring(0,10).replace(/'/g, "''")}'` : `''`;   
         req.body.Size_Mode = req.body.Size_Mode ? `N'${req.body.Size_Mode.trim().substring(0,3).replace(/'/g, "''")}'` : `''`;
         req.body.Category = req.body.Category ? `N'${req.body.Category.trim().substring(0,15).replace(/'/g, "''")}'` : `''`;   
         req.body.Gender = req.body.Gender ? `N'${req.body.Gender.trim().substring(0,10).replace(/'/g, "''")}'` : `''`;   
         req.body.Unit = req.body.Unit ? `N'${req.body.Unit.trim().substring(0,10).replace(/'/g, "''")}'` : `''`;   

         strSQL += format(`
            if ((Select count(*) From [dbo].[Style] s Where s.Style_No = {Style_No}) = 0)
            begin

               Insert [dbo].[Style] ([Style_No], [Date], [Brand], [Product_Type], [Size_Mode], [Category], [Gender], [Unit], [UserID], [Data_Updater], [Data_Update])
               Select {Style_No} as [Style_No]
               , GetDate() as [Date]
               , {Brand} as [Brand]
               , {Product_Type} as [Product_Type]
               , {Size_Mode} as [Size_Mode]
               , {Category} as [Category]
               , {Gender} as [Gender]
               , {Unit} as [Unit]               
               , N'${req.UserID}' as UserID
               , N'${req.UserID}' as Data_Updater
               , GetDate() as [Data_Update]
               Where (Select count(*) From [dbo].[Style] s Where s.Style_No = {Style_No}) = 0
            End

            Set @ROWCOUNT = @@ROWCOUNT;
         `, req.body);
      break;
      case 1:
         switch(req.body.Name){
            case 'Style_No':
               Size = 20;
               req.body.Value = req.body.Value ? `N'${req.body.Value.trim().substring(0,20).replace(/'/g, "''")}'` : `''`;
            break;
            case 'Pattern_No':
               Size = 20;
               req.body.Value = req.body.Value ? `N'${req.body.Value.trim().substring(0,20).replace(/'/g, "''")}'` : `''`;
            break;
            case 'Last_No':
               Size = 50;
               req.body.Value = req.body.Value ? `N'${req.body.Value.trim().substring(0,20).replace(/'/g, "''")}'` : `''`;
            break;
            case 'CCC_Code':
               Size = 15;
               req.body.Value = req.body.Value ? `N'${req.body.Value.trim().substring(0,20).replace(/'/g, "''")}'` : `''`;
            break;
            case 'CCC_Code':
               Size = 15;
               req.body.Value = req.body.Value ? `N'${req.body.Value.trim().substring(0,20).replace(/'/g, "''")}'` : `''`;
            break;
            case 'Sample_Size':
               req.body.Value = req.body.Value ? req.body.Value : 0;
            break;
            default:
               req.body.Value = req.body.Value ? `N'${req.body.Value.trim().replace(/'/g, "''")}'` : `''`;
            break;
         }
         strSQL += format(`         
            Update [dbo].[Style] Set [{Name}] = ${Size == 0 ? '{Value}': `substring({Value},1,${Size})`}
            , UserID = isnull(UserID, N'${req.UserID}')
            , Data_Updater = N'${req.UserID}'
            , Data_Update = GetDate()
            where Style_No = {Style_No}
            ${ req.body.Name === 'Style_No' ? ` And (SELECT Count(*) as RecCount FROM Style as p WITH (NoWait, Nolock) Where p.Style_No = {Value}) = 0 ` : "" }
            ;
            Set @ROWCOUNT = @@ROWCOUNT;
         `, req.body);
      break;
      case 2:
         strSQL += format(`
            Delete FROM [dbo].[Style] 
            where Style_No = {Style_No} 
            And (Select count(*) 
                  From Product sd with(NoLock,NoWait)                  
                  Where sd.Style_No = {Style_No} ) = 0;
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

//Maintain Product
router.post('/Product_Maintain',  function (req, res, next) {
    console.log("Call Product_Maintain Api:",req.body);
 
    // req.body.Mode === 0 表示新增
    // req.body.Mode === 1 表示修改
    // req.body.Mode === 2 表示刪除
    req.body.Style_No = req.body.Style_No ? `N'${req.body.Style_No.trim().substring(0,20).replace(/'/g, "''")}'` : `''`; 
    req.body.Product_No = req.body.Product_No ? `N'${req.body.Product_No.trim().substring(0,25).replace(/'/g, "''")}'` : `''`;
 
    var strSQL = `Declare @ROWCOUNT int = 0 `
    switch(req.body.Mode){ 
       case 0:
         req.body.Customer_Product_No = req.body.Customer_Product_No ? `N'${req.body.Customer_Product_No.trim().substring(0,25).replace(/'/g, "''")}'` : `''`; 
         req.body.Name = req.body.Name ? `N'${req.body.Name.trim().substring(0,30).replace(/'/g, "''")}'` : `''`; 
         req.body.Color = req.body.Color ? `N'${req.body.Color.trim().substring(0,70).replace(/'/g, "''")}'` : `''`; 
         req.body.Color_Code = req.body.Color_Code ? `N'${req.body.Color_Code.trim().substring(0,20).replace(/'/g, "''")}'` : `''`; 
  
          strSQL += format(`
         INSERT INTO [dbo].[Product] ([Style_No], [Product_No], [Customer_Product_No]
            , [Name], [Color], [Color_Code]
            , [UserID], [Data_Updater], [Data_Update])
         Select {Style_No} as [Style_No], {Product_No} as [Product_No], {Customer_Product_No} as [Customer_Product_No]
         , {Name} as [Name], {Color} as [Color], {Color_Code} as [Color_Code]
         , N'${req.UserID}' as UserID, N'${req.UserID}' as Data_Updater, GetDate() as Data_Update

         Set @ROWCOUNT = @@ROWCOUNT;
      `, req.body);
       break;
       case 1:
         var Size = 0;
         switch(req.body.Name){
            case 'Product_No':
            case 'Color_Code':
               Size = 20;
               req.body.Value = req.body.Value ? `N'${req.body.Value.trim().replace(/'/g, "''")}'` : `''`;
            break;
            case 'Name':
               Size = 30;
               req.body.Value = req.body.Value ? `N'${req.body.Value.trim().replace(/'/g, "''")}'` : `''`;
            break;         
            case 'Color':
               Size = 70;
               req.body.Value = req.body.Value ? `N'${req.body.Value.trim().replace(/'/g, "''")}'` : `''`;
            break;         
            case 'Customer_Product_No':
               Size = 25;
               req.body.Value = req.body.Value ? `N'${req.body.Value.trim().replace(/'/g, "''")}'` : `''`;
            break;
         }
   
         strSQL += format(`
            Update [dbo].[Product] Set [{Name}] = ${Size == 0 ? '{Value}': `substring({Value},1,${Size})`}
            , UserID = isnull(UserID, N'${req.UserID}')
            , Data_Updater = N'${req.UserID}'
            , Data_Update = GetDate()
            where Product_No = {Product_No}
            ${req.body.Name == 'Product_No' ? ' And (Select count(*) From Product p where Product_No = {Value}) = 0 ':'' };
            Set @ROWCOUNT = @@ROWCOUNT;
         `, req.body);
       break;
       case 2:
         strSQL += format(`
            Delete FROM [dbo].[Product] 
            where Product_No = {Product_No} 
            And (Select count(*) From Product_Process ps with(NoLock,NoWait) Where ps.Product_No = {Product_No}) = 0
            And (Select count(*) From Product_Structure ps with(NoLock,NoWait) Where ps.Product_No = {Product_No}) = 0
            And (Select count(*) From Product_Technical_Sheet_Detail ps with(NoLock,NoWait) Where ps.Product_No = {Product_No}) = 0;
            
            Set @ROWCOUNT = @@ROWCOUNT;
         `, req.body);
       break;
    }
 
    strSQL += format(`
    Select @ROWCOUNT as Flag; 
    `, req.body);
   //  console.log(strSQL)
    db.sql(req.Enterprise, strSQL)
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

/* Darren-Chang API End */

module.exports = router;