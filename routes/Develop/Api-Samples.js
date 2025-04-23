var express = require('express');
var router = express.Router();
var moment = require('moment');
const format = require('string-format');
var db = require('../../config/DB_Connect');

/* Mark-Wang API Begin */

//Get Payment_Term_Debit
router.post('/Payment_Term_Debit', function (req, res, next) {
   console.log("Call Payment_Term_Debit Api Product_Info:", req.body);
   
   req.body.Shipment_No = req.body.Shipment_No ? `N'${req.body.Shipment_No.trim().substring(0,18).replace(/'/g, "''")}'` : `''`;

   var strSQL = format(`           
   Select distinct isnull(Payment_Term_Debit,'') as Payment_Term_Debit
   From SPSP s with(NoLock,NoWait)  
   Where Shipment_No = {Shipment_No}
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

//取得ORder Product
router.post('/Order_Product', function (req, res, next) {
   console.log("Call Order_Product_Info Api Product_Info:", req.body);
   
   req.body.ProduceID = req.body.ProduceID ? `N'${req.body.ProduceID.trim().substring(0,18).replace(/'/g, "''")}'` : `''`;

   var strSQL = format(`

   Declare @Order_No Nvarchar(18), @Brand Nvarchar(30);
         
   Select @Order_No = isnull(s.Order_No,''), @Brand = isnull(s.Brand, s.CustomerID) 
   From Samples s with(NoLock,NoWait)  Where ProduceID = {ProduceID}

   if( len(@Order_No) = 0) 
   begin
      Select Product_No, p.Customer_Product_No as Ref_No
      From Style s with(NoLock,NoWait)
      Inner Join Product p with(NoLock,NoWait) on s.Style_No = p.Style_No
      Where s.Brand = @Brand
   End
   else
   Begin
      Select distinct Product_No, Customer_Product_No as Ref_No
      From Order_Detail s with(NoLock,NoWait)
      Where s.Order_No = @Order_No
   End
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

//Get Order_No
router.post('/Get_Order_No',  function (req, res, next) {
   console.log("Call Get_Order_No Api:",req.body);

   var strSQL = format(` 
   SELECT Top 1000 Order_No , Season, CustomerID, Brand
   FROM [dbo].[Orders] o With(Nolock,NoWait)
   Where DateAdd(Month, -6, GetDate()) <= o.Order_Date
   Order By Order_Date desc, Season, CustomerID, Brand ;
    `, req.body) ;
   //console.log(strSQL)
   db.sql(req.SiteDB, strSQL)
      .then((result) => {
         //console.log(result.recordset[0].RecCount <= 0)
         res.send(result.recordsets[0]);
      }).catch((err) => {
         console.log(err);
         res.status(500).send(err);
      })

});

//Check Sample Order ProduceID
router.post('/Check_ProduceID',  function (req, res, next) {
   console.log("Call Check_ProduceID Api:",req.body);

   req.body.ProduceID = req.body.ProduceID ? `${req.body.ProduceID.trim().replace(/'/g, '')}` : '';

   var strSQL = format(` Declare @RecCount int, @LenCounter int;

   Set @LenCounter = Len(N'{ProduceID}');

   SELECT @RecCount = Count(*)
   FROM [dbo].[Samples] With(Nolock,NoWait)
   where ([ProduceID] = N'{ProduceID}');

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

//Check Sample Debit Debit_No
router.post('/Check_Debit_No',  function (req, res, next) {
   console.log("Call Check_Debit_No Api:",req.body);

   req.body.Debit_No = req.body.Debit_No ? `${req.body.Debit_No.trim().replace(/'/g, '')}` : '';

   var strSQL = format(` Declare @RecCount int, @LenCounter int;
   Set @LenCounter = Len(N'{Debit_No}');

   SELECT @RecCount = Count(*)
   FROM [dbo].[Debit] With(Nolock,NoWait)
   where ([Debit_No] = N'{Debit_No}');

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

//Get Sample_Order_List
router.post('/Sample_Order_List',  function (req, res, next) {
    console.log("Call Sample Order List Api:",req.body);

    req.body.ProduceID = req.body.ProduceID ? `${req.body.ProduceID.trim().substring(0,18).replace(/'/g, '')}` : '';
    req.body.Issue_Date = req.body.Issue_Date ? `${req.body.Issue_Date.trim().substring(0,10)}` : '';
    req.body.BrandID = req.body.BrandID ? `${req.body.BrandID.trim().substring(0,3).replace(/'/g, '')}` : '';
    req.body.Brand = req.body.Brand ? `${req.body.Brand.trim().substring(0,30).replace(/'/g, '')}` : '';
    req.body.CustomerID = req.body.CustomerID ? `${req.body.CustomerID.trim().substring(0,15).replace(/'/g, '')}` : '';
    req.body.Season = req.body.Season ? `${req.body.Season.trim().substring(0,10).replace(/'/g, '')}` : '';
    req.body.Subject = req.body.Subject ? `${req.body.Subject.trim().substring(0,80).replace(/'/g, '')}` : '';
    req.body.Factory_SubID = req.body.Factory_SubID ? `${req.body.Factory_SubID.trim().substring(0,15).replace(/'/g, '')}` : '';
    req.body.Department = req.body.Department ? `${req.body.Department.trim().substring(0,5).replace(/'/g, '')}` : '';
    req.body.UserID = req.body.UserID ? `${req.body.UserID.trim().substring(0,256).replace(/'/g, '')}` : '';
    req.body.OrganizationID = req.body.OrganizationID ? `${req.body.OrganizationID.trim().substring(0,10).replace(/'/g, '')}` : '';
 
    var strSQL = format(`
    SELECT  row_number() Over(Order By o.[Issue_Date] desc) as RecNo
    , o.[ProduceID]
    , convert(varchar(10) ,o.[Issue_Date] ,111) as [Issue_Date]
    , o.[Brand]
    , b.[BrandID]
    , o.[CustomerID]
    , o.[Season]
    , o.[Subject]
    , o.[Order_No]
    , o.[Factory_SubID]
    , o.[Department]
    , o.[UserID]
    , o.[OrganizationID]
    FROM [dbo].[Samples] o With(Nolock,NoWait)
    left outer Join Brand b with(Nolock,NoWait) on b.Brand = o.Brand
    where (N'{ProduceID}' = '' or o.[ProduceID] like N'%{ProduceID}%')
    And (N'{Issue_Date}' = '' or convert(varchar(10),o.[Issue_Date],111) like N'%{Issue_Date}%')
    And (N'{Brand}' = '' or o.[Brand] like N'%{Brand}%')
    And (N'{BrandID}' = '' or b.[BrandID] like N'%{BrandID}%')
    And (N'{CustomerID}' = '' or o.[CustomerID] like N'%{CustomerID}%')
    And (N'{Season}' = '' or o.[Season] like N'%{Season}%')
    And (N'{Subject}' = '' or o.[Subject] like N'%{Subject}%')    
    And (N'{Order_No}' = '' or isnull(o.[Order_No],'') like N'%{Order_No}%')
    And (N'{Factory_SubID}' = '' or o.[Factory_SubID] like N'%{Factory_SubID}%')
    And (N'{Department}' = '' or o.[Department] like N'{Department}%')
    And (N'{UserID}' = '' or o.[UserID] like N'%{UserID}%')
    And (N'{OrganizationID}' = '' or o.[OrganizationID] like N'%{OrganizationID}%')
    Order By o.Issue_Date desc, o.[CustomerID], o.[ProduceID], o.UserID
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

 //Get Samples_Info
router.post('/Samples_Info',  function (req, res, next) {
    console.log("Call Sample_Order_Info Api:",req.body);  
  
    req.body.ProduceID = req.body.ProduceID ? `N'${req.body.ProduceID.trim().substring(0,18).replace(/'/g, "''")}'` : `''`;
    req.body.Mode = req.body.Mode ? req.body.Mode : 0;
    req.body.QueryData = req.body.QueryData ? `N'${req.body.QueryData.trim().replace(/'/g, "''")}'` : `''`;
    
  
    //Mode == 0 Get Sample Order and Sample Order Detail Data
    //Mode == 1 Get Sample Order Data
    //Mode == 2 Get Sample Order Detail Data
    var strSQL = format(`
    Declare @Mode int = {Mode}, @ProduceID nvarchar(20) = {ProduceID};
  
    if(@Mode = 0 or @Mode = 1)
    Begin
        SELECT [ProduceID]
        ,[OrganizationID]
        ,[Department]
        ,[Factory_SubID]
        ,[Size_Mode]
        ,Convert(varchar(10),[Issue_Date],111) as [Issue_Date]
        ,Convert(varchar(10),[Accept_Date],111) as [Accept_Date]
        ,Convert(varchar(10),[Require_Date],111) as [Require_Date]
        ,[Brand]
        ,[CustomerID]
        ,[Currency]
        ,[Season]
        ,[Order_No]
        , cast(case when isnull([Order_No],'') = '' then 0 else 1 end as bit) as Official_Order_No_Flag
        ,[Product_No_Title]
        ,[Ref_NO_Title]
        ,[Remark_Title]
        ,[Selected]
        ,[Shipmented]
        ,[Subject]
        ,[Charge_Price_Rate]
        ,(Select iif(count(*) = 0, 1, 0)
          From Sample_Detail sad with(NoLock,NoWait)
          Inner Join SPSP_Detail sd with(NoLock,NoWait) on sd.Sample_Produce_DetailID = sad.Sample_Produce_DetailID 
          Inner Join spsp s with(NoLock,NoWait) on s.Shipment_NO = sd.Shipment_NO 
          Inner Join Debit d with(NoLock,NoWait) on s.Debit_No = d.Debit_No
          Inner Join Money_Source ms with(NoLock,NoWait) on ms.Source_No = d.Debit_No and ms.MoneyID is not null
          Where sad.ProduceID = @ProduceID
        ) as Charge_Price_Rate_Edit_Flag
        ,[UserID]
        ,[Client_Selected]
        ,[Agent_Selected]
        ,[Keep_Selected]
        ,[Logo]
        ,[Contact_No]
        ,[Data_Updater]
        ,Convert(varchar(10),[Data_Update],111) as [Data_Update]
        FROM Samples s WITH (NoLock, NoWait)
        WHERE ProduceID = @ProduceID
    End            
    if(@Mode = 0 or @Mode = 2)
    Begin
         Declare @tmpProduct table (Product_No nvarchar(25));
         Declare @Order_No Nvarchar(18), @Brand Nvarchar(30);

         Select @Order_No = isnull(s.Order_No,''), @Brand = isnull(s.Brand, s.CustomerID) 
         From Samples s with(NoLock,NoWait)  Where ProduceID = @ProduceID;

         if( len(@Order_No) = 0 ) 
         begin
            insert @tmpProduct 
            Select Product_No
            From Style s with(NoLock,NoWait)
            Inner Join Product p with(NoLock,NoWait) on s.Style_No = p.Style_No
            Where s.Brand = @Brand
         End
         else
         Begin
            insert @tmpProduct 
            Select distinct Product_No
            From Order_Detail s with(NoLock,NoWait)
            Where s.Order_No = @Order_No
         End;

        with tmp_SPSP ( Sample_Produce_DetailID, SPD, Qty, Charge_Qty, Debit_NO, Money_SourceID) 
        as (
          Select t.Sample_Produce_DetailID
          , 1 as SPD
          , (t.Qty) as Qty
          , (t.Charge_Qty) as Charge_Qty
          , s.Debit_NO
          , ms.Money_SourceID
          From SPSP s with(NoLock,NoWait) 
          Inner Join SPSP_Detail t with(NoLock,NoWait) on s.Shipment_NO = t.Shipment_NO
          Inner join Sample_Detail sd with(NoLock,NoWait) on sd.Sample_Produce_DetailID = t.Sample_Produce_DetailID
          Left Outer Join Money_Source ms with(NoLock,NoWait) on ms.Source_No = s.Debit_NO
          Where sd.ProduceID = @ProduceID
        )
        Select sd.[Sample_Produce_DetailID]
        , iif(isnull(tmp1.RCV_Count,0) = 0, 1, 0) as Unit_Price_Edit_Flag
        , [ProduceID]
        , ct.Sample_Type as [Sample_Name]
        , ct.Sample_Type
        , sd.[Product_No]
        , s.Sample_Size
        , sd.[Qty]
        , sd.[Agent_Qty]
        , sd.[Keep_Qty]
        , sd.[Charge_Qty]
        , [Unit_Price]
        , [Ref_No]
        , [Patten_Status]
        , [Last_Status]
        , [Outsole_Status]
        , Convert(varchar(10),[Send_Out_Date],111) as [Send_Out_Date]
        , Convert(varchar(10),[Sample_Approved_Date],111) as [Sample_Approved_Date] 
        , Convert(varchar(10),[Est_Finish_Date],111) as [Est_Finish_Date]        
        , sd.[Remark]
        , [Produce_No]
        , CONVERT(bit, case when isnull([Produce_No],'') = '' then 1 else 0 end) as [Produce_No_Flag]
        , isnull((Select Exported From Produce e where e.Produce_No = sd.Produce_No),0) as Exported
        , P.Style_No
        , CONVERT(bit, ISNULL(sd.Selected, 1)) AS Selected
        , CONVERT(bit, CASE WHEN isnull(tp.Product_No,'') = '' THEN 1 ELSE 0 END) AS Product_No_Flag
        --, CONVERT(bit, CASE WHEN sz.Sample_Produce_DetailID IS NULL THEN 1 ELSE 0 END) AS No_SizeMatch
        , CONVERT(bit, CASE WHEN isnull(tmp.SPD,0) = 0 THEN 0 ELSE 1 END) AS SPD
        , isnull(tmp.Qty,0) as SPD_QTY
        , isnull(tmp.Charge_Qty,0) as SPD_Charge_QTY
        , case when isnull(tmp.SPD,0) = 0 then 'white' else 
          case when isnull(tmp.Qty,0) = isnull(sd.Qty,0) + isnull(sd.Agent_Qty,0)  then 'lightseagreen' else '#63dcd6' End
          End as SPD_BG_Color
        , CASE WHEN Structure_Completed IS NULL THEN 0 ELSE 1 END AS Has_Structure
        From Sample_Detail sd with(NoLock, NoWait)
        LEFT OUTER Join Sample_Type ct with(NoLock,NoWait) on ct.Sample_TypeID = sd.Sample_TypeID
        LEFT OUTER JOIN @tmpProduct tp On tp.Product_No = sd.Product_No
        LEFT OUTER JOIN Product p WITH (NoLock, NoWait) ON sd.Product_NO = p.Product_No
        LEFT OUTER JOIN Style s WITH (NoLock, NoWait) ON p.Style_No = s.Style_No
        Left Outer Join (
          Select Sample_Produce_DetailID
          , count(*) as SPD
          , sum(Qty) as Qty
          , sum(Charge_Qty) as Charge_Qty
          From tmp_SPSP 
          Group by Sample_Produce_DetailID
        ) tmp on tmp.Sample_Produce_DetailID = sd.Sample_Produce_DetailID
        Left Outer Join (
          Select Sample_Produce_DetailID
          , count(*) as RCV_Count
          From tmp_SPSP 
          Where Money_SourceID is not null
          Group by Sample_Produce_DetailID
        ) tmp1 on tmp1.Sample_Produce_DetailID = sd.Sample_Produce_DetailID
        Where sd.ProduceID = @ProduceID
        And ({QueryData} = '' or charindex({QueryData}, isnull(ct.Sample_Type,'') + ' ' + isnull(sd.Product_No,'')  + ' ' + isnull(sd.Ref_No,'')   + ' ' + isnull(sd.Produce_No,'') + ' ' + isnull(Convert(varchar(10),Send_Out_Date,111),'') + ' ' + isnull(Convert(varchar(10),Sample_Approved_Date,111),'') ) > 0)
        Order by Sample_Produce_DetailID
    End
    if(@Mode = 0 or @Mode = 3)
    Begin
      with tmpDetail (ProduceID, Sample_Produce_DetailID, Qty, Agent_Qty, Keep_Qty, Charge_Qty, Selected, Client_Selected, Agent_Selected, Keep_Selected) as(
         SELECT sd.ProduceID
         , sd.Sample_Produce_DetailID
         , isnull(sd.Qty,0) AS Qty
         , isnull(sd.Agent_Qty,0) AS Agent_Qty
         , isnull(sd.Keep_Qty,0) AS Keep_Qty
         , isnull(sd.Charge_Qty,0) AS Charge_Qty
         , ABS(isnull(sd.Selected,0)) AS Selected
         , isnull(s.Client_Selected,0) as Client_Selected
         , isnull(s.Agent_Selected,0) as Agent_Selected
         , isnull(s.Keep_Selected,0) as Keep_Selected
         FROM Sample_Detail sd with(NoLock,NoWait)
         INNER JOIN Samples s with(NoLock,NoWait) ON sd.ProduceID = s.ProduceID 
         WHERE (sd.ProduceID = @ProduceID)
      )
      SELECT SUM(sd.Qty) AS Client
      , SUM(sd.Agent_Qty) AS Agent
      , SUM(sd.Keep_Qty) AS Keep
      , SUM(sd.Qty + sd.Agent_Qty + sd.Keep_Qty) AS Total
      , SUM(sd.Charge_Qty) AS Chrarge
      , s.Selected
      , s.Labels AS Labels 
      FROM tmpDetail sd
      INNER JOIN (
         Select @ProduceID as ProduceID, sum(ABS(isnull(q.Selected,0))) AS Selected, sum((CASE WHEN t.Client_Selected = 0 THEN 0 ELSE q.Qty END) * 2 ) 
         + sum((CASE WHEN t.Agent_Selected = 0 THEN 0 ELSE q.Agent_Qty END) * 2 ) 
         + sum((CASE WHEN t.Keep_Selected = 0 THEN 0 ELSE q.Keep_Qty END) * 2 ) as Labels
           From [Sample_Detail_Qty] q 
           Inner Join (Select distinct Sample_Produce_DetailID, Client_Selected, Agent_Selected, Keep_Selected 
                        From tmpDetail) t on q.Sample_Produce_DetailID = t.Sample_Produce_DetailID
           Where ABS(isnull(q.Selected,0)) = 1  
      ) s ON sd.ProduceID = s.ProduceID 
      Group by s.Labels, s.Selected
    End
    `, req.body) ;
    //console.log(strSQL)
    db.sql(req.SiteDB, strSQL)
       .then((result) => {
          var DataSet = {Samples: (req.body.Mode == 0 || req.body.Mode == 1) ? result.recordsets[0] : []
            , Sample_Detail: (req.body.Mode == 0) ? result.recordsets[1] : (req.body.Mode == 2 ? result.recordsets[0] : [])
            , Label_Select_Info: (req.body.Mode == 0) ? result.recordsets[2] : (req.body.Mode == 3 ? result.recordsets[0] : [])
         };
          //console.log(DataSet)
          res.send(DataSet);
       }).catch((err) => {
          console.log(err);
          res.status(500).send(err);
       })
});

//Maintain Samples
router.post('/Samples_Maintain',  function (req, res, next) {
   console.log("Call Sample_Maintain Api:",req.body);

   // req.body.Mode === 0 表示新增
   // req.body.Mode === 1 表示修改
   // req.body.Mode === 2 表示刪除
   // req.body.Mode === 3 表示Labeld 全選
   // req.body.Mode === 4 表示Labeld 全取消
   var Size = 0;
   req.body.ProduceID = req.body.ProduceID ? `N'${req.body.ProduceID.trim().substring(0,18).replace(/'/g, "''")}'` : `''`; 
   
   var strSQL = `Declare @ROWCOUNT int `
   switch(req.body.Mode){
      case 0:
         req.body.Brand = req.body.Brand ? `N'${req.body.Brand.trim().substring(0,30).replace(/'/g, "''")}'` : `''`;
         req.body.CustomerID = req.body.CustomerID ? `N'${req.body.CustomerID.trim().substring(0,15).replace(/'/g, "''")}'` : `''`;
         req.body.Season = req.body.Season ? `N'${req.body.Season.trim().substring(0,10).replace(/'/g, "''")}'` : `''`;
         req.body.Factory_SubID = req.body.Factory_SubID ? `N'${req.body.Factory_SubID.trim().substring(0,15).replace(/'/g, "''")}'` : `''`;
         req.body.Currency = req.body.Currency ? `N'${req.body.Currency.trim().substring(0,4).replace(/'/g, "''")}'` : `''`;
         req.body.Size_Mode = req.body.Size_Mode ? `N'${req.body.Size_Mode.trim().substring(0,3).replace(/'/g, "''")}'` : `''`; 
         req.body.Order_No = req.body.Order_No ? `N'${req.body.Order_No.trim().substring(0,18).replace(/'/g, "''")}'` : `null`;   

         strSQL += format(`
            if ((Select count(*) From [dbo].[Samples] s Where s.ProduceID = {ProduceID}) = 0)
            begin
               Declare @Department nvarchar(50), @OrganizationID nvarchar(50)
               , @Brand nvarchar(30), @CustomerID nvarchar(15), @Season nvarchar(10), @Contact_No Nvarchar(255)
               if(len({Order_No}) > 0)
               Begin
                  Select @Brand = Brand, @CustomerID = CustomerID, @Season = Season 
                  From Orders s With(NoLock, NoWait)
                  where s.Order_No = {Order_No}
               End

               Select @Department = d.Department_Code, @OrganizationID = d.OrganizationID
               from Employee e 
                  Inner Join Department d on e.DepartmentID = d.DepartmentID
                  Inner Join aspnet_Users au on e.EmployeeID = au.EmployeeID
               Where au.LoweredUserName = N'${req.UserID}'

               Select @Contact_No = Contact_No From Control

               Insert [dbo].[Samples] ([ProduceID], [IS_PP_Sample], [Order_No], [OrganizationID], [Department]
                  , [Charge_Price_Rate]
                  , [Brand], [CustomerID], [Season], [Factory_SubID], [Currency], [Size_Mode]
                  , [Issue_Date], [Accept_Date], [Require_Date]
                  , [Logo], [Contact_No]
                  , [Product_No_Title], [Ref_NO_Title], [Remark_Title]
                  , [Selected],[Shipmented])
               Select {ProduceID} as [ProduceID], case when len({Order_No}) > 0 then 1 else 0 end as [IS_PP_Sample], {Order_No} as [Order_No], @OrganizationID as [OrganizationID], @Department as [Department]
                  , 1 as Charge_Price_Rate
                  , case when len({Order_No}) > 0 then @Brand else {Brand} End as [Brand]
                  , case when len({Order_No}) > 0 then @CustomerID else {CustomerID} End as [CustomerID]
                  , case when len({Order_No}) > 0 then @Season else {Season} End as [Season]  
                  , {Factory_SubID} as [Factory_SubID], {Currency} as [Currency], {Size_Mode} as [Size_Mode]
                  , GetDate() as [Issue_Date], GetDate() as [Accept_Date], GetDate() as [Require_Date]
                  , @OrganizationID as [Logo], @Contact_No as [Contact_No]
                  , 'Article No.' as [Product_No_Title], 'Ref No.' as [Ref_NO_Title], 'Remark' as [Remark_Title]
                  , convert(bit,0) as [Selected], convert(bit,0) as [Shipmented]
               Where (Select count(*) From [dbo].[Samples] s Where s.ProduceID = {ProduceID}) = 0
            End

            Set @ROWCOUNT = @@ROWCOUNT;
         `, req.body);
      break;
      case 1:
         switch(req.body.Name){
            case 'Charge_Price_Rate':            
              Size = 0;
              req.body.Value = req.body.Value <= 0 ? 1: req.body.Value;
              strSQL += format(`         
                Update [dbo].[Samples] Set [{Name}] = ${Size == 0 ? '{Value}': `substring({Value},1,${Size})`}
                where ProduceID = {ProduceID}
                And (
                  Select count(*)
                  From Sample_Detail sad with(NoLock,NoWait)
                  Inner Join SPSP_Detail sd with(NoLock,NoWait) on sd.Sample_Produce_DetailID = sad.Sample_Produce_DetailID 
                  Inner Join spsp s with(NoLock,NoWait) on s.Shipment_NO = sd.Shipment_NO 
                  Inner Join Debit d with(NoLock,NoWait) on s.Debit_No = d.Debit_No
                  Inner Join Money_Source ms with(NoLock,NoWait) on ms.Source_No = d.Debit_No and ms.MoneyID is not null
                  Where sad.ProduceID = {ProduceID}
                ) = 0;
                `, req.body);
            break;
            case 'Client_Selected':
            case 'Agent_Selected':
            case 'Keep_Selected':
              Size = 0;
              strSQL += format(`         
                Update [dbo].[Samples] Set [{Name}] = ${Size == 0 ? '{Value}': `substring({Value},1,${Size})`}
                where ProduceID = {ProduceID};
                `, req.body);
            break;
            case 'Product_No_Title':
            case 'Ref_NO_Title':
            case 'Remark_Title':
            case 'Logo':
               Size = 20;
               req.body.Value = req.body.Value ? `N'${req.body.Value.trim().replace(/'/g, "''")}'` : `''`;
               strSQL += format(`         
                Update [dbo].[Samples] Set [{Name}] = ${Size == 0 ? '{Value}': `substring({Value},1,${Size})`}
                where ProduceID = {ProduceID};
                `, req.body);
            break;
            case 'Contact_No':
               Size = 50;
               req.body.Value = req.body.Value ? `N'${req.body.Value.trim().replace(/'/g, "''")}'` : `''`;

               strSQL += format(`         
                Update [dbo].[Samples] Set [{Name}] = ${Size == 0 ? '{Value}': `substring({Value},1,${Size})`}
                where ProduceID = {ProduceID};
                `, req.body);
            break;
            case 'Order_No':
               Size = req.body.Value === null ? 0: 18;
               req.body.Value = req.body.Value ? `N'${req.body.Value.trim().replace(/'/g, "''")}'` : `null`;
               req.body.Brand = req.body.Brand ? `N'${req.body.Brand.trim().replace(/'/g, "''")}'` : `''`;
               req.body.CustomerID = req.body.CustomerID ? `N'${req.body.CustomerID.trim().replace(/'/g, "''")}'` : `''`;
               req.body.Season = req.body.Season ? `N'${req.body.Season.trim().replace(/'/g, "''")}'` : `''`;
               strSQL += format(`         
                Update [dbo].[Samples] Set [{Name}] = ${Size == 0 ? '{Value}': `substring({Value},1,${Size})`}
                , Brand = {Brand}, CustomerID = {CustomerID}, Season = {Season} 
                where ProduceID = {ProduceID};
                `, req.body);
            break;
            default:
               req.body.Value = req.body.Value ? `N'${req.body.Value.trim().replace(/'/g, "''")}'` : `''`;
               strSQL += format(`         
                Update [dbo].[Samples] Set [{Name}] = ${Size == 0 ? '{Value}': `substring({Value},1,${Size})`}
                ${req.body.Name == 'Brand' || req.body.Name == 'CustomerID' || req.body.Name == 'Season' ?  `, Order_No = null `:'' }
                where ProduceID = {ProduceID}
                ${ req.body.Name === 'ProduceID' ? ` And (SELECT Count(*) as RecCount FROM Sample_Detail as p WITH (NoWait, Nolock) Where p.ProduceID = {Value}) = 0 ` : "" }
                ${ req.body.Name === 'Currency' || req.body.Name === 'Season'  ? ` And (SELECT Count(*) as RecCount FROM Sample_Detail as p WITH (NoWait, Nolock) Inner Join SPSP_Detail t with(NoLock,NoWait) on t.Sample_Produce_DetailID = p.Sample_Produce_DetailID  Where p.ProduceID = {ProduceID}) = 0 ` : "" }
                
                `, req.body);
            break;
         }
         strSQL += format(`         
          Set @ROWCOUNT = @@ROWCOUNT;

            if(@ROWCOUNT > 0 and '${req.body.Name}' = 'Factory_SubID')
            Begin
               Update Produce set FactoryID = (Select FactoryID From Factory_Sub f where f.Factory_SubID = {Value})
               , Factory_SubID = {Value}
               From Produce p 
               Inner Join Sample_Detail sd on sd.Produce_No = p.Produce_No And sd.ProduceID = {ProduceID}
            End

            if(@ROWCOUNT > 0 and '${req.body.Name}' = 'Charge_Price_Rate')
            Begin

              With tmpTable(Debit_No) as (
                Select distinct t.Debit_No 
                From SPSP t
                inner join SPSP_Detail d on t.Shipment_No = d.Shipment_No
                Inner Join Sample_Detail e with(NoLock,NoWait) on e.Sample_Produce_DetailID = d.Sample_Produce_DetailID 
                Inner Join Samples sa with(NoLock,NoWait) on sa.ProduceID = e.ProduceID 
                Where sa.ProduceID = {ProduceID}
              ),               
              tmpDebit(Debit_No, Amount) as (
                Select s.Debit_NO 
                , sum(Floor( Cast( isnull(sd.Charge_Qty,0) * isnull(sad.Unit_Price,0) * isnull(sa.Charge_Price_Rate,0) as money) * 100) / 100 ) as Amount
                From tmpTable t
                Inner Join spsp s with(NoLock,NoWait) on t.Debit_No = s.Debit_No
                Inner Join SPSP_Detail sd with(NoLock,NoWait) on s.Shipment_NO = sd.Shipment_NO 
                Inner Join Sample_Detail sad with(NoLock,NoWait) on sd.Sample_Produce_DetailID = sad.Sample_Produce_DetailID 
                Inner Join Samples sa with(NoLock,NoWait) on sad.ProduceID = sa.ProduceID 
                Group by s.Debit_NO
              ),
              tmpExp(Debit_No, Expense) as (
                Select pe.Debit_No
                , sum( Floor( Cast( isnull(pe.Qty,0) * isnull(pe.Unit_Price,0) as money) * 100) / 100) as Expense
                From Debit_Expense pe with(NoLock,NoWait) 
                Inner Join tmpTable t on pe.Debit_No = t.Debit_No
                Group by pe.Debit_No
              )
              Update [dbo].[Debit] Set UserID = isnull(UserID, N'${req.UserID}')
              , Data_Updater = N'${req.UserID}'
              , Data_Update = GetDate()
              , Amount = isnull((t.Amount), 0) 
                      + isnull((ex.Expense), 0) 
              From Debit d
              Inner Join tmpTable e on d.Debit_No = e.Debit_No
              Left Outer Join tmpDebit t on d.Debit_No = t.Debit_No
              Left Outer Join tmpExp ex on d.Debit_No = ex.Debit_No;

            End
         `, req.body);
      break;
      case 2:
         strSQL += format(`
            Delete FROM [dbo].[Samples] 
            where ProduceID = {ProduceID} 
            And (Select count(*) 
                  From Sample_Detail sd with(NoLock,NoWait)  
                  Inner Join SPSP_Detail spd with(NoLock,NoWait) on spd.Sample_Produce_DetailID = sd.Sample_Produce_DetailID
                  Where sd.ProduceID = {ProduceID} ) = 0;
            Set @ROWCOUNT = @@ROWCOUNT;
         `, req.body);
      break;
      case 3:
      case 4:      
            strSQL += format(`
               Update [dbo].[Sample_Detail] Set Selected = ${req.body.Mode == 3 ? '1': '0' }               
               where ProduceID = {ProduceID}; 
               Set @ROWCOUNT = @@ROWCOUNT;
               if(@ROWCOUNT > 0)
               Begin
                  Update Sample_Detail_Qty set Selected = ${req.body.Mode == 3 ? '1': '0' } 
                  From Sample_Detail_Qty q 
                  Inner Join Sample_Detail d on d.Sample_Produce_DetailID = q.Sample_Produce_DetailID 
                  Where d.ProduceID = {ProduceID}; 
               End
            `, req.body);
      break;
        
   }

   strSQL += format(`
   Select @ROWCOUNT as Flag;

   if({Mode} <> 2 and @ROWCOUNT > 0)
   Begin
      Update [dbo].[Samples] Set UserID = isnull(UserID, N'${req.UserID}')
      , Data_Updater = N'${req.UserID}'
      , Data_Update = GetDate()
      where ProduceID = {ProduceID};
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

//Maintain Sample_Detail
router.post('/Sample_Detail_Maintain',  function (req, res, next) {
    console.log("Call Sample_Detail_Maintain Api:",req.body);
 
    // req.body.Mode === 0 表示新增
    // req.body.Mode === 1 表示修改
    // req.body.Mode === 2 表示刪除
    // req.body.Mode === 3 表示樣品產生製造令
    var Size = 0;
    req.body.ProduceID = req.body.ProduceID ? `N'${req.body.ProduceID.trim().substring(0,18).replace(/'/g, "''")}'` : `''`; 
 
    var strSQL = `Declare @ROWCOUNT int = 0 `
    switch(req.body.Mode){
       case 0:
         //req.body.Order_DetailID = req.body.Order_DetailID ? req.body.Order_DetailID : 0;      
         req.body.Unit_Price = req.body.Unit_Price ? req.body.Unit_Price : 0;
         req.body.Product_No = req.body.Product_No ? `N'${req.body.Product_No.trim().substring(0,25).replace(/'/g, "''")}'` : `''`; 
         req.body.Sample_TypeID = req.body.Sample_TypeID ? `${req.body.Sample_TypeID}` : `''`; 

          strSQL += format(`
 
             Declare @Factory_SubID varchar(20), @Size_Mode varchar(10), @Sample_Size real, @CustomerID varchar(15), @Currency varchar(4), @Season varchar(10)
             , @Product_No varchar(25), @Produce_No varchar(20), @new_style_Flag int
             , @Order_DetailID int 
 
             Set @Product_No = {Product_No}
 
             Set @new_style_Flag = (
                Select case when Count(*) = 0 then 1 else 0 end
                From Sample_Detail sd with(NoLock,NoWait) 
                Where sd.Product_No = {Product_No} and sd.ProduceID <> {ProduceID} ) 
 

             INSERT INTO [dbo].[Sample_Detail] ([ProduceID], [Product_NO]
                , [Qty], [Agent_Qty], [Keep_Qty], [Charge_Qty], [Unit_Price]
                , [Patten_Status]
                , [Outsole_Status] 
                , [Selected]
                , [Sample_TypeID]
                , [Sample_Name])
             Select {ProduceID} as [ProduceID], {Product_No} as [Product_NO]
                , 0 as [Qty], 0 as [Agent_Qty], 0 as [Keep_Qty], 0 as [Charge_Qty], {Unit_Price} as [Unit_Price]
                , case when @new_style_Flag = 1 then 'New' else 'Carry Over' End as [Patten_Status]
                , case when @new_style_Flag = 1 then 'New' else 'Carry Over' End as [Outsole_Status] 
                , 0 as [Selected]
                , {Sample_TypeID} as Sample_TypeID
                , (Select Sample_Type From Sample_Type s Where s.Sample_TypeID = {Sample_TypeID}) as [Sample_Name]                
 
             Set @ROWCOUNT = @@ROWCOUNT;
          `, req.body);
       break;
       case 1:
         switch(req.body.Name){
            case 'Product_No':
               Size = 25;
               req.body.Value = req.body.Value ? `N'${req.body.Value.trim().replace(/'/g, "''")}'` : `''`;
            break;
            case 'Ref_No':
            case 'Remark':
               Size = 20;
               req.body.Value = req.body.Value ? `N'${req.body.Value.trim().replace(/'/g, "''")}'` : `''`;
            break;
            case 'Send_Out_Date':
            case 'Sample_Approved_Date':
            case 'Patten_Status':
            case 'Outsole_Status':
               req.body.Value = req.body.Value ? `N'${req.body.Value.trim().replace(/'/g, "''")}'` : `''`;
            break;
         }       
       

         switch(req.body.Name){
            case 'Charge_Qty':
               req.body.Value = req.body.Value != null ? req.body.Value : 0;
               strSQL += format(`
               Update [dbo].[Sample_Detail] Set [Charge_Qty] = case when (isnull(Qty,0) + isnull(Agent_Qty,0)) < {Value} then (isnull(Qty,0) + isnull(Agent_Qty,0)) else {Value} end
               where Sample_Produce_DetailID = {Sample_Produce_DetailID}
               And (SELECT Count(*) FROM SPSP_Detail as p WITH (NoWait, Nolock) Where p.Sample_Produce_DetailID = {Sample_Produce_DetailID}) = 0;
               Set @ROWCOUNT = @@ROWCOUNT;   
   
               `, req.body);

            break;
            case 'Selected':
               strSQL += format(`
               Update [dbo].[Sample_Detail] Set [{Name}] = ${Size == 0 ? '{Value}': `substring({Value},1,${Size})`}
               where Sample_Produce_DetailID = {Sample_Produce_DetailID};
               Set @ROWCOUNT = @@ROWCOUNT;
   
               if(@ROWCOUNT > 0)
               begin
                  Update Sample_Detail_Qty set Selected = {Value}
                  From Sample_Detail_Qty s 
                  Where s.Sample_Produce_DetailID = {Sample_Produce_DetailID}; 
               End
               `, req.body);
            break;
            case 'Unit_Price':
              strSQL += format(`

              Update [dbo].[Sample_Detail] Set [{Name}] = ${Size == 0 ? '{Value}': `substring({Value},1,${Size})`}
              where Sample_Produce_DetailID = {Sample_Produce_DetailID};
              Set @ROWCOUNT = @@ROWCOUNT;   

              if(@ROWCOUNT > 0 )
              Begin

                With tmpTable(Debit_No) as (
                  Select distinct t.Debit_No 
                  From SPSP t
                  inner join SPSP_Detail d on t.Shipment_No = d.Shipment_No
                  Where d.Sample_Produce_DetailID = {Sample_Produce_DetailID}
                ), 
                tmpDebit(Debit_No, Amount) as (
                  Select s.Debit_NO 
                  , sum( Floor( Cast( isnull(sd.Charge_Qty,0) * isnull(sad.Unit_Price,0) * isnull(sa.Charge_Price_Rate,0) as money) * 100) / 100 ) as Amount
                  From tmpTable t 
                  Inner Join spsp s with(NoLock,NoWait) on t.Debit_NO = s.Debit_NO
                  Inner Join SPSP_Detail sd with(NoLock,NoWait) on s.Shipment_NO = sd.Shipment_NO 
                  Inner Join Sample_Detail sad with(NoLock,NoWait) on sd.Sample_Produce_DetailID = sad.Sample_Produce_DetailID 
                  Inner Join Samples sa with(NoLock,NoWait) on sad.ProduceID = sa.ProduceID 
                  Group by s.Debit_NO
                ),
                tmpExp(Debit_No, Expense) as (
                  Select pe.Debit_No
                  , sum( Floor( Cast( isnull(pe.Qty,0) * isnull(pe.Unit_Price,0) as money) * 100) / 100) as Expense
                  From Debit_Expense pe with(NoLock,NoWait) 
                  Inner Join tmpTable t on pe.Debit_No = t.Debit_No
                  Group by pe.Debit_No
                )
                Update [dbo].[Debit] Set UserID = isnull(UserID, N'${req.UserID}')
                , Data_Updater = N'${req.UserID}'
                , Data_Update = GetDate()
                , Amount = isnull((t.Amount), 0) + isnull((ep.Expense), 0) 
                From Debit d
                Inner Join tmpTable e on d.Debit_No = e.Debit_No
                Left Outer Join tmpDebit t on d.Debit_No = t.Debit_No
                Left Outer Join tmpExp ep on d.Debit_No = ep.Debit_No;

              End                
              `, req.body)
            
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
       case 3:
         strSQL += format(`
         Declare @ProduceID varchar(20) = {ProduceID};
         Declare @Order_No Nvarchar(18), @Sample_Produce_DetailID int, @Sample_Type_Group_Code varchar(3), @Product_No nvarchar(25), @Produce_No nvarchar(20), @RecCount int, @Qty float, @FactoryID varchar(15), @Factory_SubID varchar(15), @Factory_SubCode VARCHAR(1);
         Declare @tmpTable table(No int IDENTITY(1,1), Sample_Produce_DetailID int, Product_No nvarchar(25), Sample_Type_Group_Code varchar(3), Produce_No nvarchar(20), Qty float);
         Declare @tmpOrder table(Product_No nvarchar(25), Produce_No nvarchar(20));
 
         Select @Order_No = isnull(s.Order_No,'')
           , @FactoryID = f.FactoryID
           , @Factory_SubID = s.Factory_SubID
           , @Factory_SubCode = isnull(f.Factory_SubCode,'')
         From Samples s with(NoLock,NoWait)
           Left Outer Join Factory_Sub f on f.Factory_SubID = s.Factory_SubID
           Where ProduceID = @ProduceID;
 
         Insert @tmpTable (Sample_Produce_DetailID, Product_No, Sample_Type_Group_Code, Qty)
         Select s.Sample_Produce_DetailID, s.Product_No, stg.Sample_Type_Group_Code, sum(isnull(Qty,0) + isnull(Agent_Qty,0) + isnull(Keep_Qty,0)) as Qty
         From Sample_detail s with(NoLock,NoWait)
          Inner Join Sample_Type st with(NoLock,NoWait) on s.Sample_TypeID = st.Sample_TypeID
          Inner Join Sample_Type_Group stg with(NoLock,NoWait) on st.Sample_Type_GroupID = stg.Sample_Type_GroupID
           Where ProduceID = @ProduceID
           And isnull(Produce_No,'') = ''
           Group by s.Sample_Produce_DetailID, Product_No, stg.Sample_Type_Group_Code;
 
         Insert @tmpOrder
         Select od.Product_No, od.Produce_No
         From Order_Detail od with(NoLock, NoWait)
           Where od.Order_No = @Order_No
           And isnull(Produce_No,'') <> ''
           Group by od.Product_No, od.Produce_No;
 
         Select @RecCount = Count(*) From @tmpTable
 
         --  if(@Order_No <> '' and (Select Count(*) from @tmpOrder) > 0)
         --  begin
            while(@RecCount > 0 )
            begin
               Select @Sample_Produce_DetailID = Sample_Produce_DetailID, @Sample_Type_Group_Code = Sample_Type_Group_Code, @Product_No = Product_No , @Qty = Qty From @tmpTable Where No = @RecCount;

               Set @Produce_No = isnull((Select Top 1 t.Produce_No
               From @tmpOrder t
               Where t.Product_No = @Product_No),'')

               if(@Produce_No <> '' and @Order_No <> '' and (Select Count(*) from @tmpOrder) > 0)
               Begin
                  Set @Produce_No = SubString(@Produce_No + '-'+ @Sample_Type_Group_Code ,1,20);

                  Insert Produce (Produce_No, Produce_Purpose , Product_No, Plan_Month, FactoryID ,Factory_SubID ,Order_Qty ,Qty)
                  Select @Produce_No as Produce_No, 'Sample' as Produce_Purpose, @Product_No as Product_No, Convert(varchar(07),GetDate(), 111) as Plan_Month, @FactoryID as FactoryID, @Factory_SubID as Factory_SubID, @Qty as Order_Qty, @Qty as Qty
                  Where (Select Count(*) From Produce with(NoLock,NoWait) Where Produce_No = @Produce_No) = 0;

                  Update Sample_detail Set Produce_No = @Produce_No
                  From Sample_detail sd with(NoLock, NoWait)
                  Where sd.Sample_Produce_DetailID = @Sample_Produce_DetailID;

                  Set @ROWCOUNT = @ROWCOUNT + @@ROWCOUNT;
               End
               
               if(@Order_No = '') 
               Begin
                  Set @Produce_No = SubString(@Factory_SubCode + CAST(@Sample_Produce_DetailID AS VARCHAR(10)) + '-' + @Sample_Type_Group_Code, 1, 20);

                  Insert Produce (Produce_No, Produce_Purpose , Product_No, Plan_Month, FactoryID ,Factory_SubID ,Order_Qty ,Qty)
                  Select @Produce_No as Produce_No, 'Sample' as Produce_Purpose, @Product_No as Product_No, Convert(varchar(07),GetDate(), 111) as Plan_Month, @FactoryID as FactoryID, @Factory_SubID as Factory_SubID, @Qty as Order_Qty, @Qty as Qty
                  Where (Select Count(*) From Produce with(NoLock,NoWait) Where Produce_No = @Produce_No) = 0;

                  Update Sample_detail Set Produce_No = @Produce_No
                  From Sample_detail sd with(NoLock, NoWait)
                  Where sd.Sample_Produce_DetailID = @Sample_Produce_DetailID;

                  Set @ROWCOUNT = @ROWCOUNT + @@ROWCOUNT;
               End
               set @RecCount = @RecCount -1
            End
         -- End      
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
       where ProduceID = {ProduceID};
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
 
 //Get Selected Sample Detail Info
router.post('/Selected_Sample_Detail_Info', function (req, res, next) {
    console.log("Call Selected_Sample_Detail_Info Api :", req.body);
 
    req.body.Sample_Produce_DetailID = req.body.Sample_Produce_DetailID ? req.body.Sample_Produce_DetailID : 0;
 
    var strSQL = format(`
    Select s.Sample_Detail_QtyID, s.Prerange, s.Size, rtrim(ps.Size_Name) as Size_Name, s.Qty, s.Agent_Qty, s.Keep_Qty
    , CONVERT(bit, CASE WHEN sz.Size IS NULL THEN 1 ELSE 0 END) AS No_SizeMatch 
    , ABS(s.Selected) AS Selected
    From Sample_Detail_Qty s with(NoLock,NoWait)
    Inner Join Product_Size ps with(NoLock,NoWait) on s.Size = ps.SizeID
    LEFT OUTER JOIN (
      SELECT psm.Shoe_Size as Size
      FROM Sample_Detail sd WITH (NoLock, NoWait)
      INNER JOIN Product p WITH (NoLock, NoWait) ON p.Product_No = sd.Product_NO
      INNER JOIN Product_Size_Match psm WITH (NoLock, NoWait) ON p.Style_No = psm.Style_No 
      WHERE sd.Sample_Produce_DetailID = {Sample_Produce_DetailID}      
    ) AS sz ON sz.Size = s.Size
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
router.post('/Sample_Detail_Size_Maintain',  function (req, res, next) {
    console.log("Call Detail_Size_Maintain Api:", req.body);
    var strSQL = "";

    req.body.ProduceID = req.body.ProduceID ? `N'${req.body.ProduceID.trim().substring(0,18).replace(/'/g, "''")}'` : `''`;
    req.body.Sample_Produce_DetailID = req.body.Sample_Produce_DetailID ?  req.body.Sample_Produce_DetailID : `0`;      

    strSQL = format(`
    Declare @ROWCOUNT1 int=0
    , @SPSP_Flag int
    
    Set @SPSP_Flag = (SELECT Count(*) FROM SPSP_Detail as p WITH (NoWait, Nolock) Where p.Sample_Produce_DetailID = {Sample_Produce_DetailID})

    if(@SPSP_Flag = 0 OR '${req.body.Name}' = 'Selected')
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
            set @ROWCOUNT1 = 0;
            ROLLBACK;
        END CATCH        
        
        if(@ROWCOUNT1 > 0)
        Begin
            Update Sample_Detail set Qty = isnull(tmp.Qty,0)
            , Agent_Qty = isnull(tmp.Agent_Qty,0)
            , Charge_Qty = case when (isnull(tmp.Qty,0) + isnull(tmp.Agent_Qty,0)) <> Charge_Qty then (isnull(tmp.Qty,0) + isnull(tmp.Agent_Qty,0)) else Charge_Qty end
            --, Charge_Qty = case when isnull(tmp.Qty,0) <> Charge_Qty then isnull(tmp.Qty,0) else Charge_Qty end
            , Keep_Qty = isnull(tmp.Keep_Qty,0)
            , Selected = case when tmp.Selected_Count > 0 then 1 else 0 end
            From Sample_Detail sd with(NoLock, NoWait)
            Left Outer Join 
            ( Select {Sample_Produce_DetailID} as Sample_Produce_DetailID
               , Sum(q.Qty) as Qty
               , Sum(q.Agent_Qty) as Agent_Qty
               , Sum(q.Keep_Qty) as Keep_Qty
               , Sum(case when isnull(q.Selected, 0) = 0 then 0 else 1 end ) as Selected_Count
            From Sample_Detail_Qty q with(NoLock, NoWait)
            where q.Sample_Produce_DetailID = {Sample_Produce_DetailID} ) tmp on sd.Sample_Produce_DetailID = tmp.Sample_Produce_DetailID
            Where sd.Sample_Produce_DetailID = {Sample_Produce_DetailID};
        End

    End
        `, req.body)

    strSQL += format(`
    Select @ROWCOUNT1 as Flag, isnull(Qty, 0) as Qty, isnull(Agent_Qty, 0) as Agent_Qty, isnull(Keep_Qty, 0) as Keep_Qty, isnull(Charge_Qty, 0) as Charge_Qty, ABS(sd.Selected) AS Selected
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
            , Charge_Qty : result.recordsets[0][0].Charge_Qty 
            , Selected : result.recordsets[0][0].Selected 
            };
            res.send(dataset);
        }).catch((err) => {
            console.log(err);
            res.status(500).send(err);
        })
    
}); 

 //Get Sample_Order_Report_Info
 router.post('/Sample_Order_Report_Info',  function (req, res, next) {
  console.log("Call Sample_Order_Report_Info Api:",req.body);  

  req.body.ProduceID = req.body.ProduceID ? `N'${req.body.ProduceID.trim().substring(0,18).replace(/'/g, "''")}'` : `''`;
  req.body.Flag = req.body.Flag ? req.body.Flag : 0;
  req.body.Mode = req.body.Mode ? req.body.Mode : 0;

  //Mode == 0 Sample Detail Shipment Pending Query
  switch(req.body.Mode){
    case 0:
    var strSQL = format(`
    Declare @ProduceID varchar(25) = {ProduceID}, @Flag int = {Flag}
    Declare @tmpShip table(Shipment_NO int, Debit_NO varchar(20), Sample_Produce_DetailID int, SP_Qty float, SP_Charge_Qty float)

    Insert @tmpShip
    Select sp.Shipment_NO
    , sp.Debit_NO
    , spd.Sample_Produce_DetailID
    , sum(spd.Qty) as SP_Qty
    , Sum(spd.Charge_Qty) as SP_Charge_Qty
    From spsp sp with(NoLock,NoWait)
    Inner Join SPSP_Detail spd with(NoLock,NoWait) on sp.Shipment_NO = spd.Shipment_NO
    Inner Join Sample_Detail sd with(NoLock,NoWait) on spd.Sample_Produce_DetailID = sd.Sample_Produce_DetailID
    Where sd.ProduceID = @ProduceID
    Group by sp.Shipment_NO, sp.Debit_NO, spd.Sample_Produce_DetailID;

    Select sd.Sample_Produce_DetailID
    , sd.Product_No
    , isnull(sd.Unit_Price,0) as Unit_Price
    , isnull(sd.Qty,0) + isnull(sd.Agent_Qty,0) as Order_Qty
    , isnull(sd.Charge_Qty,0) as Charge_Qty
    , isnull(tmp.SP_Qty,0) as SP_Qty
    , isnull(tmp.SP_Charge_Qty,0) as SP_Charge_Qty
    From Sample_Detail sd with(NoLock,NoWait)
    Left Outer Join (
      Select Sample_Produce_DetailID
      , Sum(SP_Qty) as SP_Qty
      , sum(SP_Charge_Qty) as SP_Charge_Qty 
      From @tmpShip 
      Group by Sample_Produce_DetailID
    ) tmp on tmp.Sample_Produce_DetailID = sd.Sample_Produce_DetailID
    Where sd.ProduceID = @ProduceID
    And (@Flag = 1  
        or (isnull(sd.Qty,0) + isnull(sd.Agent_Qty,0) - isnull(tmp.SP_Qty,0) <>0  or isnull(sd.Charge_Qty,0) - isnull(tmp.SP_Charge_Qty,0) <> 0)  )
    Order by Sample_Produce_DetailID, Product_No;

    Select *
    From @tmpShip

    `, req.body) ;
    break;
  }

  //console.log(strSQL)
  db.sql(req.SiteDB, strSQL)
     .then((result) => {
        var DataSet = {};

        switch(req.body.Mode) {
          case 0:
            DataSet = {Detail_Info : result.recordsets[0]}

            DataSet.Detail_Info.forEach((item) => {
              var tmpData = result.recordsets[1].filter((obj)=>(obj.Sample_Produce_DetailID == item.Sample_Produce_DetailID))

              item.Ship_Info = [...tmpData.reduce((r, e) => {
                let k = `${e.Shipment_NO}`;
                if (!r.has(k)) {
                  // console.log(r) 
    
                  r.set(k, { 
                    Shipment_NO: e.Shipment_NO,
                    Total_SP_Qty: e.SP_Qty,
                    Total_SP_Charge_Qty: e.SP_Charge_Qty,
                  })
                } else {
                   r.get(k).Total_SP_Qty += e.SP_Qty;
                   r.get(k).Total_SP_Charge_Qty += e.SP_Charge_Qty;
                }
                return r;
              }, new Map).values()] 

              item.Debit_Info = [...tmpData.reduce((r, e) => {
                let k = `${e.Debit_NO}`;
                if (!r.has(k)) {
                  // console.log(r) 
    
                  r.set(k, { 
                    Debit_NO: e.Debit_NO,
                    Total_SP_Qty: e.SP_Qty,
                    Total_SP_Charge_Qty: e.SP_Charge_Qty,
                  })
                } else {
                   r.get(k).Total_SP_Qty += e.SP_Qty;
                   r.get(k).Total_SP_Charge_Qty += e.SP_Charge_Qty;
                }
                return r;
              }, new Map).values()] 
              
              item.Qty = Math.round((item.Qty)*10000)/10000;
              item.Charge_Qty = Math.round((item.Charge_Qty)*10000)/10000;
              item.SP_Qty = Math.round((item.SP_Qty)*10000)/10000;
              item.SP_Charge_Qty = Math.round((item.SP_Charge_Qty)*10000)/10000;
           });

          break;
        }
        //console.log(DataSet)
        res.send(DataSet);
     }).catch((err) => {
        console.log(err);
        res.status(500).send(err);
     })
});

//Get Sample_Shipment_List
router.post('/Sample_Shipment_List',  function (req, res, next) {
   console.log("Call Sample Shipment List Api:");

   req.body.Shipment_NO = req.body.Shipment_NO ? req.body.Shipment_NO : null;
   req.body.Shipping_Date = req.body.Shipping_Date ? `${req.body.Shipping_Date.trim().substring(0,10)}` : '';
   req.body.FactoryID = req.body.FactoryID ? `${req.body.FactoryID.trim().substring(0,15).replace(/'/g, '')}` : '';
   req.body.CustomerID = req.body.CustomerID ? `${req.body.CustomerID.trim().substring(0,15).replace(/'/g, '')}` : '';
   req.body.Season = req.body.Season ? `${req.body.Season.trim().substring(0,10).replace(/'/g, '')}` : '';
   req.body.Department = req.body.Department ? `${req.body.Department.trim().substring(0,5).replace(/'/g, '')}` : '';
   req.body.UserID = req.body.UserID ? `${req.body.UserID.trim().substring(0,256).replace(/'/g, '')}` : '';   

   var strSQL = format(`
   SELECT Top 1000 row_number() Over(Order By o.[Shipping_Date] desc) as RecNo
   , o.[Shipment_NO]
   , convert(varchar(10) ,o.[Shipping_Date] ,111) as [Shipping_Date]
   , o.[FactoryID]
   , o.[CustomerID]
   , o.[Season]
   , o.[Department]
   , o.[UserID]   
   FROM [dbo].[SPSP] o With(Nolock,NoWait)   
   where ({Shipment_NO} is null  or o.[Shipment_NO] like N'%{Shipment_NO}%')
   And (N'{Shipping_Date}' = '' or convert(varchar(10),o.[Shipping_Date],111) like N'%{Shipping_Date}%')
   And (N'{FactoryID}' = '' or o.[FactoryID] like N'%{FactoryID}%')
   And (N'{CustomerID}' = '' or o.[CustomerID] like N'%{CustomerID}%')
   And (N'{Season}' = '' or o.[Season] like N'%{Season}%')
   And (N'{Department}' = '' or o.[Department] like N'{Department}%')
   And (N'{UserID}' = '' or o.[UserID] like N'%{UserID}%')
   Order By o.Shipping_Date desc, o.[CustomerID], o.[Shipment_NO], o.UserID
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

 //Get Sample Shipment_Info
 router.post('/Sample_Shipment_Info',  function (req, res, next) {
   console.log("Call Sample_Shipment_Info Api:",req.body);  
 
   req.body.Shipment_NO = req.body.Shipment_NO ? req.body.Shipment_NO : null;
   req.body.Mode = req.body.Mode ? req.body.Mode : 0;    
 
   //Mode == 0 Get Sample Shipment, Sample Shipment Detail and Sample Shipment Expense Data
   //Mode == 1 Get Sample Shipment Data
   //Mode == 2 Get Sample Shipment Detail Data
   //Mode == 3 Get Sample Shipment Expense Data
   var strSQL = format(`
   Declare @Mode int = {Mode};
 
   if(@Mode = 0 or @Mode = 1)
   Begin
       SELECT s.[Shipment_NO]
       , s.[Express_No]
       , s.[OrganizationID]
       , s.[Department]
       , Convert(varchar(10),s.[Shipping_Date],111) as [Shipping_Date]
       , s.[CustomerID]
       , s.[Messrs]
       , s.[Messrs_Address]
       , s.[ContactID]
       , c.Contact
       , c.Work_Phone
       , s.[FactoryID]
       , s.[FactoryID] as Factory_SubID
       , s.[Season]
       , s.[Currency]
       , s.[Doc_Title]
       , s.[Payment_Term_Debit]
       , s.[AccountID]
       , s.[Advising_Bank]
       , s.[UserID]
       , s.[Remark]
       , s.[Data_Updater]
       , Convert(varchar(20), s.[Data_Update],111) as [Data_Update]
       , s.[Debit_No]
       , case when isnull(s.[Debit_No],'') = '' then 1 else 0 End as Invoice_Flag
       FROM SPSP s WITH (NoLock, NoWait)
       Left Outer Join Customer_Contacts c WITH (NoLock, NoWait) on s.ContactID = c.ContactID
       WHERE Shipment_NO = {Shipment_NO}
   End            
   if(@Mode = 0 or @Mode = 2)
   Begin
       Select spd.Shipment_DetailID
       , sd.[Sample_Produce_DetailID]
       , sd.[ProduceID]
       , s.[Brand]
       , sd.[Product_No]
       , ct.Sample_Type as [Sample_Name]
       , ct.Sample_Type
       , isnull(spd.[Qty],0) as Qty
       , isnull(spd.[Charge_Qty],0) as Charge_Qty
       , isnull(spd.[Doc_Price],0) as Doc_Price
       , Round(isnull(spd.[Charge_Qty],0) * isnull(spd.[Doc_Price],0),2) AS Amount
       --, spd.[Debit_No]
       , spd.[Remark]
       , sd.[Produce_No]
       From SPSP_Detail spd with(NoLock, NoWait)
       Inner Join Sample_Detail sd with(NoLock, NoWait) on spd.Sample_Produce_DetailID = sd.Sample_Produce_DetailID
       Inner Join Samples s with(NoLock, NoWait) on s.ProduceID = sd.ProduceID       
       LEFT OUTER Join Sample_Type ct with(NoLock,NoWait) on ct.Sample_TypeID = sd.Sample_TypeID
       Where spd.Shipment_NO = {Shipment_NO}
       Order by spd.Shipment_DetailID
   End
   if(@Mode = 0 or @Mode = 3)
   Begin
     SELECT spe.SDSP_Expense_DetailID
      , spe.Shipment_NO
      , spe.Description
      , isnull(spe.Qty,0) AS Qty
      , isnull(spe.Doc_Price,0) AS Doc_Price
      , isnull(spe.Unit_Price,0) AS Unit_Price
      , Round(isnull(spe.Qty,0) * isnull(spe.Doc_Price,0),2) AS Amount
      , spe.Remark
     FROM SPSP_Expense spe with(NoLock, NoWait)
     Where spe.Shipment_NO = {Shipment_NO}
   End
   `, req.body) ;
   //console.log(strSQL)
   db.sql(req.SiteDB, strSQL)
      .then((result) => {
         var DataSet = {Sample_Shipment: (req.body.Mode == 0 || req.body.Mode == 1) ? result.recordsets[0] : []
           , Sample_Shipment_Detail: (req.body.Mode == 0) ? result.recordsets[1] : (req.body.Mode == 2 ? result.recordsets[0] : [])
           , Sample_Shipment_Expense: (req.body.Mode == 0) ? result.recordsets[2] : (req.body.Mode == 3 ? result.recordsets[0] : [])
        };
        if(req.body.Mode == 0 || req.body.Mode == 2){
            var Qty = 0, Charge_Qty = 0, Amount = 0
            DataSet.Sample_Shipment_Detail.forEach((item) => {
               Qty += item.Qty;
               Charge_Qty += item.Charge_Qty;
               Amount += (item.Amount);
            });
            Amount = Math.round((Amount)*10000)/10000
            DataSet.Detail_Total = {Qty:Qty, Charge_Qty:Charge_Qty, Amount:Amount}
        }
        if(req.body.Mode == 0 || req.body.Mode == 3){
            var Qty = 0, Doc_Price = 0, Amount = 0
            DataSet.Sample_Shipment_Expense.forEach((item) => {
               Qty += item.Qty;
               Amount += item.Amount;               
            });
            Amount = Math.round((Amount)*10000)/10000
            DataSet.Expense_Total = {Qty:Qty, Amount:Amount}
         }
         //console.log(DataSet)
         res.send(DataSet);
      }).catch((err) => {
         console.log(err);
         res.status(500).send(err);
      })
});

//Maintain Sample Shipment
router.post('/Sample_Shipment_Maintain',  function (req, res, next) {
   console.log("Call Sample_Shipment_Maintain Api:",req.body);

   // req.body.Mode === 0 表示新增
   // req.body.Mode === 1 表示修改
   // req.body.Mode === 2 表示刪除
   var Size = 0;
   req.body.Shipment_NO = req.body.Shipment_NO != 'Insert' ? req.body.Shipment_NO : null; 
   
   var strSQL = format(`Declare @ROWCOUNT int, @Shipment_NO int = {Shipment_NO} `, req.body);
   switch(req.body.Mode){
      case 0:
         req.body.Factory_SubID = req.body.Factory_SubID ? `N'${req.body.Factory_SubID.trim().substring(0,15).replace(/'/g, "''")}'` : `''`;
         req.body.CustomerID = req.body.CustomerID ? `N'${req.body.CustomerID.trim().substring(0,15).replace(/'/g, "''")}'` : `''`;
         req.body.Season = req.body.Season ? `N'${req.body.Season.trim().substring(0,10).replace(/'/g, "''")}'` : `''`;
         req.body.Currency = req.body.Currency ? `N'${req.body.Currency.trim().substring(0,4).replace(/'/g, "''")}'` : `''`;         

         strSQL += format(`
            Declare @Department nvarchar(50), @OrganizationID nvarchar(50)
            
            Select @Department = d.Department_Code, @OrganizationID = d.OrganizationID
            from Employee e 
               Inner Join Department d on e.DepartmentID = d.DepartmentID
               Inner Join aspnet_Users au on e.EmployeeID = au.EmployeeID
            Where au.LoweredUserName = N'${req.UserID}'

            Insert [dbo].[SPSP] ([Shipping_Date], [OrganizationID], [Department]
               , [CustomerID], [Messrs], [Messrs_Address]
               , [FactoryID], [Season], [Currency]
               , UserID, Data_Updater, Data_Update)
            Select GetDate() as Shipping_Date, @OrganizationID as [OrganizationID], @Department as [Department]
               , {CustomerID} as [CustomerID], c.Customer_Name as [Messrs], c.Address as [Messrs_Address]
               , {Factory_SubID} as [FactoryID], {Season} as [Season], {Currency} as [Currency]
               , N'${req.UserID}' as UserID, N'${req.UserID}' as Data_Updater, GetDate() as Data_Update
            From Customer c with(NoLock,NoWait)
            Where c.CustomerID = {CustomerID}

            Set @Shipment_NO = scope_identity();

            Set @ROWCOUNT = @@ROWCOUNT;            

         `, req.body);
      break;
      case 1:
         switch(req.body.Name){
            case 'CustomerID':
               Size = 15;
               strSQL += format(`Declare @Messrs nvarchar(100), @Messrs_Address nvarchar(256); 
               Select @Messrs = Customer_Name
               , @Messrs_Address = c.Address 
               From Customer c with(NoLock,NoWait) 
               Where c.CustomerID = '{Value}'`, req.body);
            break;
            case 'Season':
            case 'Shipping_Date':
            case 'OrganizationID':
               Size = 10;
            break;
            case 'Department':
               Size = 5;
            break;
            case 'Currency':
               Size = 4;
            break;
            case 'FactoryID':
               Size = 15;
            break;
            case 'Express_No':
               Size = 20;
            break;
            case 'Messrs':
               Size = 100;
            break;
            case 'Messrs_Address':
               Size = 256;
            break;
            case 'Remark':
               Size = 1000;
            break;
            case 'Payment_Term_Debit':
               Size = 30;
            break;
            default:
            break;
         }
         req.body.Value = Size == 0 ? (req.body.Value ? req.body.Value : null) : (req.body.Value ? `N'${req.body.Value.trim().replace(/'/g, "''")}'` : `''`);

         strSQL += format(`         
            Update [dbo].[SPSP] Set [{Name}] = ${Size == 0 ? '{Value}': `substring({Value},1,${Size})`}            
            ${req.body.Name == 'CustomerID'? ', Messrs = @Messrs, Messrs_Address = @Messrs_Address, ContactID = null  ':''}
            where Shipment_NO = @Shipment_NO;

            Set @ROWCOUNT = @@ROWCOUNT;
         `, req.body);
      break;
      case 2:
         strSQL += format(`
            Delete FROM [dbo].[SPSP] 
            where Shipment_NO = @Shipment_NO
            And (Select count(*) From SPSP_Detail sd with(NoLock,NoWait) Where sd.Shipment_No = @Shipment_NO ) = 0
            And (Select count(*) From SPSP_Expense sd with(NoLock,NoWait) Where sd.Shipment_No = @Shipment_NO ) = 0
            And isnull(Debit_No,'') = ''
            
            Set @ROWCOUNT = @@ROWCOUNT;
         `, req.body);
      break;
        
   }

   strSQL += format(`
   Select @ROWCOUNT as Flag, @Shipment_NO as Shipment_NO;

   if({Mode} = 1 and @ROWCOUNT > 0)
   Begin
      Update [dbo].[SPSP] Set UserID = isnull(UserID, N'${req.UserID}')
      , Data_Updater = N'${req.UserID}'
      , Data_Update = GetDate()
      where Shipment_NO = @Shipment_NO;
   End
   `, req.body);
   //console.log(strSQL)
   db.sql(req.SiteDB, strSQL)
      .then((result) => {
         //console.log(result.recordsets[0])
         res.send({Flag:result.recordsets[0][0].Flag > 0, Shipment_NO: result.recordsets[0][0].Shipment_NO});
      }).catch((err) => {
         console.log(err);
         res.status(500).send(err);
      })

});

//Maintain Sample Shipment Detail
router.post('/Sample_Shipment_Detail_Maintain',  function (req, res, next) {
   console.log("Call Sample_Shipment_Detail_Maintain Api:",req.body);

   // req.body.Mode === 0 表示新增
   // req.body.Mode === 1 表示修改
   // req.body.Mode === 2 表示刪除   
   var Size = 0;
   req.body.Shipment_NO = req.body.Shipment_NO ? req.body.Shipment_NO : null; 
   req.body.Shipment_DetailID = req.body.Shipment_DetailID ? req.body.Shipment_DetailID : null; 
   req.body.Sample_Produce_DetailID = req.body.Sample_Produce_DetailID ? req.body.Sample_Produce_DetailID : null;
   
   var strSQL = format(`Declare @ROWCOUNT int = 0, @Shipment_NO int = {Shipment_NO}, @Shipment_DetailID int = {Shipment_DetailID}, @Debit_No varchar(20);

      Select @Debit_No = isnull(Debit_No,'')
      From SPSP sd with(NoLock,NoWait) 
      Where sd.Shipment_No = @Shipment_NO
      if(@Debit_No <> '')
      Begin
         Select @ROWCOUNT as Flag;
         return ;
      End
   `, req.body);
   switch(req.body.Mode){
      case 0:
         req.body.QueryData = req.body.QueryData ? `N'${req.body.QueryData.replace(/'/g, "''")}'` : `''`; 
         strSQL += format(`
            Declare @Import_Mode int = {Import_Mode}
            if(@Import_Mode = 0)
            begin
               Declare @CustomerID varchar(15), @Factory_SubID varchar(15), @Currency varchar(4), @Season varchar(10)
               Declare @TmpTable Table(Sample_Produce_DetailID int, ProduceID varchar(18), Sample_TypeID int
               , Product_NO varchar(25), Qty float, Charge_Qty float
               , Unit_Price float, Unit_Cost float, Ref_NO varchar(20), Produce_No varchar(20))
               
               Select @CustomerID = CustomerID
               , @Factory_SubID = FactoryID
               , @Currency = Currency
               , @Season = Season
               From SPSP s with(NoLock,NoWait)
               Where s.Shipment_NO = @Shipment_NO
               
               Insert @TmpTable
               SELECT  sd.[Sample_Produce_DetailID]
                     ,sd.[ProduceID]
                     ,sd.[Sample_TypeID]
                     ,sd.[Product_NO]
                     ,isnull(sd.[Qty],0) + isnull(sd.[Agent_Qty],0) as Qty                     
                     ,isnull(sd.[Charge_Qty],0) as Charge_Qty
                     ,isnull(sd.[Unit_Price],0) as Unit_Price
                     ,isnull(sd.[Unit_Cost],0) as Unit_Cost
                     ,sd.[Ref_NO]
                     ,sd.[Produce_No]
               FROM [dbo].[Samples] s
               Inner Join [dbo].[Sample_Detail] sd on s.ProduceID = sd.ProduceID
               Where s.CustomerID = @CustomerID
               And s.Factory_SubID = @Factory_SubID
               And s.Currency = @Currency
               And s.Season = @Season
               And (isnull(sd.[Qty],0) + isnull(sd.[Agent_Qty],0)) > 0; 
               
               Insert [dbo].[SPSP_Detail] ([Shipment_NO], [Sample_Produce_DetailID], [Qty], [Charge_Qty], [Doc_Price])
               Select @Shipment_NO as Shipment_NO, tmp.Sample_Produce_DetailID
               , tmp.Qty - isnull(TmpShip.Ship_Qty,0) as [Qty]
               , case when (tmp.Qty - isnull(TmpShip.Ship_Qty,0)) < (tmp.Charge_Qty - isnull(TmpShip.Charge_Qty,0)) 
                  then 
                     (tmp.Qty - isnull(TmpShip.Ship_Qty,0)) 
                  else 
                     (tmp.Charge_Qty - isnull(TmpShip.Charge_Qty,0)) 
                  end as [Charge_Qty]
               , tmp.Unit_Price as [Doc_Price]
               from @TmpTable tmp
               Left Outer Join (
                  Select sp.Sample_Produce_DetailID, Sum(sp.Qty) as Ship_Qty, Sum(sp.Charge_Qty) as Charge_Qty
                  From SPSP_Detail sp with(NoLock, NoWait) 
                  Inner Join (Select distinct Sample_Produce_DetailID from @TmpTable ) t on t.Sample_Produce_DetailID = sp.Sample_Produce_DetailID
                  Group by sp.Sample_Produce_DetailID
               ) TmpShip on tmp.Sample_Produce_DetailID = TmpShip.Sample_Produce_DetailID
               Where tmp.Qty - isnull(TmpShip.Ship_Qty,0) > 0
               And ({QueryData} = '' or charindex({QueryData}, isnull(tmp.ProduceID,'') + ' ' + isnull(tmp.Product_NO,'') + ' ' + isnull(tmp.Ref_NO,'') + ' ' + isnull(tmp.Produce_No,'') ) > 0); 
            end
            else
            begin 
               Insert [dbo].[SPSP_Detail] ([Shipment_NO], [Sample_Produce_DetailID], [Qty], [Charge_Qty], [Doc_Price])
               --Select @Shipment_NO as [Shipment_NO], {Sample_Produce_DetailID} as [Sample_Produce_DetailID], {Qty} as [Qty], {Charge_Qty} as [Charge_Qty], {Doc_Price} as [Doc_Price]

               Select @Shipment_NO as Shipment_NO
               , tmp.Sample_Produce_DetailID
               , tmp.Qty - isnull(TmpShip.Ship_Qty,0) as [Qty]
               , case when (tmp.Qty - isnull(TmpShip.Ship_Qty,0)) < (tmp.Charge_Qty - isnull(TmpShip.Charge_Qty,0)) 
                  then 
                     (tmp.Qty - isnull(TmpShip.Ship_Qty,0)) 
                  else 
                     (tmp.Charge_Qty - isnull(TmpShip.Charge_Qty,0)) 
                  end as [Charge_Qty]
               , tmp.Unit_Price as [Doc_Price]
               from (
                  SELECT  sd.[Sample_Produce_DetailID]
                  ,sd.[ProduceID]
                  ,sd.[Sample_TypeID]
                  ,sd.[Product_NO]
                  ,isnull(sd.[Qty],0) + isnull(sd.[Agent_Qty],0) as Qty                     
                  ,isnull(sd.[Charge_Qty],0) as Charge_Qty
                  ,isnull(sd.[Unit_Price],0) as Unit_Price
                  ,isnull(sd.[Unit_Cost],0) as Unit_Cost
                  ,sd.[Ref_NO]
                  ,sd.[Produce_No]
                  FROM [dbo].[Samples] s
                  Inner Join [dbo].[Sample_Detail] sd on s.ProduceID = sd.ProduceID
                  Where sd.Sample_Produce_DetailID = {Sample_Produce_DetailID}
                  And (isnull(sd.[Qty],0) + isnull(sd.[Agent_Qty],0)) > 0
               ) tmp
               Left Outer Join (
                  Select sp.Sample_Produce_DetailID, Sum(sp.Qty) as Ship_Qty, Sum(sp.Charge_Qty) as Charge_Qty
                  From SPSP_Detail sp with(NoLock, NoWait) 
                  Where sp.Sample_Produce_DetailID = {Sample_Produce_DetailID}
                  Group by sp.Sample_Produce_DetailID
               ) TmpShip on tmp.Sample_Produce_DetailID = TmpShip.Sample_Produce_DetailID
               Where tmp.Qty - isnull(TmpShip.Ship_Qty,0) > 0
            end             
            Set @ROWCOUNT = @@ROWCOUNT; 
         `, req.body);
      break;
      case 1:
         switch(req.body.Name){
            case 'Remark':
               Size = 1000;
               req.body.Value = Size == 0 ? (req.body.Value != null ? req.body.Value : null) : (req.body.Value ? `N'${req.body.Value.trim().replace(/'/g, "''")}'` : `''`);
            break;
            case 'Qty':
               req.body.Value = Size == 0 ? (req.body.Value ? req.body.Value : null) : (req.body.Value ? `N'${req.body.Value.trim().replace(/'/g, "''")}'` : `''`);               
            break;
            case 'Charge_Qty':
               req.body.Value = Size == 0 ? (req.body.Value != null ? req.body.Value : null) : (req.body.Value ? `N'${req.body.Value.trim().replace(/'/g, "''")}'` : `''`);
            break;
         }

         switch(req.body.Name) {
            case 'Qty':
               strSQL += format(`
                  Declare @Qty float = {Value}, 
                  @Order_Qty float, @Order_Charge_Qty float,
                  @Balance_Qty float = 0, @Balance_Charge_Qty float = 0;

                  Select @Order_Qty = isnull(sd.[Qty],0) + isnull(sd.[Agent_Qty],0), 
                  @Order_Charge_Qty = isnull(sd.[Charge_Qty],0) 
                  From Sample_Detail sd with(NoLock,NoWait) 
                  Where sd.Sample_Produce_DetailID = {Sample_Produce_DetailID}

                  Set @Balance_Qty = isnull(@Order_Qty,0) - isnull((Select sum(Qty) From SPSP_Detail sd with(NoLock,NoWait) Where sd.Sample_Produce_DetailID = {Sample_Produce_DetailID} And sd.Shipment_DetailID <> {Shipment_DetailID} ),0)
                  Set @Balance_Charge_Qty = isnull(@Order_Charge_Qty,0) - isnull((Select sum(Charge_Qty) From SPSP_Detail sd with(NoLock,NoWait) Where sd.Sample_Produce_DetailID = {Sample_Produce_DetailID} And sd.Shipment_DetailID <> {Shipment_DetailID} ),0)


                  Set @Balance_Qty = isnull((Select sum(isnull(sd.[Qty],0) + isnull(sd.[Agent_Qty],0)) From Sample_Detail sd with(NoLock,NoWait) Where sd.Sample_Produce_DetailID = {Sample_Produce_DetailID}),0)
                                   - isnull((Select sum(Qty) From SPSP_Detail sd with(NoLock,NoWait) Where sd.Sample_Produce_DetailID = {Sample_Produce_DetailID} And sd.Shipment_DetailID <> {Shipment_DetailID} ),0)
                  Set @Balance_Qty = case when @Balance_Qty > 0 then @Balance_Qty else 0 end
                  Set @Qty = case When @Balance_Qty >= @Qty then @Qty else @Balance_Qty end

                  Update [dbo].[SPSP_Detail] Set [Qty] = @Qty
                  , Charge_Qty = 
                     case when (@Balance_Qty - @Qty) >= @Balance_Charge_Qty or Charge_Qty >= @Balance_Charge_Qty - (@Balance_Qty - @Qty) then 
                        case when @Qty < Charge_Qty then @Qty else Charge_Qty end
                     else 
                        @Balance_Charge_Qty - (@Balance_Qty - @Qty) 
                     end
                  where Shipment_DetailID = @Shipment_DetailID;
      
                  Set @ROWCOUNT = @@ROWCOUNT;
               `, req.body);
            break;
            case 'Charge_Qty':
               strSQL += format(`
                  Declare @Charge_Qty float = {Value}, 
                  @Order_Qty float, @Order_Charge_Qty float,
                  @Balance_Qty float = 0, @Balance_Charge_Qty float = 0;

                  Select @Order_Qty = isnull(sd.[Qty],0) + isnull(sd.[Agent_Qty],0), 
                  @Order_Charge_Qty = isnull(sd.[Charge_Qty],0) 
                  From Sample_Detail sd with(NoLock,NoWait) 
                  Where sd.Sample_Produce_DetailID = {Sample_Produce_DetailID}

                  Set @Balance_Qty = isnull(@Order_Qty,0) - isnull((Select sum(Qty) From SPSP_Detail sd with(NoLock,NoWait) Where sd.Sample_Produce_DetailID = {Sample_Produce_DetailID} And sd.Shipment_DetailID <> {Shipment_DetailID} ),0)
                  Set @Balance_Charge_Qty = isnull(@Order_Charge_Qty,0) - isnull((Select sum(Charge_Qty) From SPSP_Detail sd with(NoLock,NoWait) Where sd.Sample_Produce_DetailID = {Sample_Produce_DetailID} And sd.Shipment_DetailID <> {Shipment_DetailID} ),0)

                  Set @Balance_Charge_Qty = case when @Balance_Charge_Qty > 0 then @Balance_Charge_Qty else 0 end
                  Set @Charge_Qty = case When @Balance_Charge_Qty >= @Charge_Qty then @Charge_Qty else @Balance_Charge_Qty end

                  Update [dbo].[SPSP_Detail] Set [Charge_Qty] = 
                  case when (@Balance_Qty - isnull(Qty,0)) >= @Balance_Charge_Qty or @Charge_Qty >= @Balance_Charge_Qty - (@Balance_Qty - isnull(Qty,0)) then 
                     case when isnull(Qty,0) < @Charge_Qty then isnull(Qty,0) else @Charge_Qty end
				      else 
						   @Balance_Charge_Qty - (@Balance_Qty - isnull(Qty,0)) 
				      end
                  where Shipment_DetailID = @Shipment_DetailID;
      
                  Set @ROWCOUNT = @@ROWCOUNT;
               `, req.body);
            break;
            default:
               strSQL += format(`
                  Update [dbo].[SPSP_Detail] Set [{Name}] = ${Size == 0 ? '{Value}': `substring({Value},1,${Size})`}
                  where Shipment_DetailID = @Shipment_DetailID;
      
                  Set @ROWCOUNT = @@ROWCOUNT;
               `, req.body);
            break;
         }

      break;
      case 2:
         strSQL += format(`
            Delete FROM [dbo].[SPSP_Detail] 
            where Shipment_DetailID = @Shipment_DetailID
            
            Set @ROWCOUNT = @@ROWCOUNT;
         `, req.body);
      break;
        
   }

   strSQL += format(`
   Select @ROWCOUNT as Flag  ;

   if(@ROWCOUNT > 0)
   Begin
      Update [dbo].[SPSP] Set UserID = isnull(UserID, N'${req.UserID}')
      , Data_Updater = N'${req.UserID}'
      , Data_Update = GetDate()
      where Shipment_NO = @Shipment_NO;
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

//Maintain Sample Shipment Expense
router.post('/Sample_Shipment_Expense_Maintain',  function (req, res, next) {
   console.log("Call Sample_Shipment_Expense_Maintain Api:",req.body);

   // req.body.Mode === 0 表示新增
   // req.body.Mode === 1 表示修改
   // req.body.Mode === 2 表示刪除
   var Size = 0;
   req.body.Shipment_NO = req.body.Shipment_NO ? req.body.Shipment_NO : null; 
   req.body.SDSP_Expense_DetailID = req.body.SDSP_Expense_DetailID ? req.body.SDSP_Expense_DetailID : null; 
   
   var strSQL = format(`Declare @ROWCOUNT int, @Shipment_NO int = {Shipment_NO}, @SDSP_Expense_DetailID int = {SDSP_Expense_DetailID}, @Debit_No varchar(20);
      Select @Debit_No = isnull(Debit_No,'')
      From SPSP sd with(NoLock,NoWait) 
      Where sd.Shipment_No = @Shipment_NO
      if(@Debit_No <> '')
      Begin
         return;
      End
   `, req.body);
   switch(req.body.Mode){
      case 0:
         strSQL += format(`
            Insert [dbo].[SPSP_Expense] ([Shipment_NO], [Qty], [Doc_Price])
            Select @Shipment_NO as [Shipment_NO], 0 as [Qty], 0 as [Doc_Price]            

            Set @ROWCOUNT = @@ROWCOUNT; 
         `, req.body);
      break;
      case 1:
         switch(req.body.Name){
            case 'Description':
               Size = 100;
            break;
            case 'Remark':
               Size = 1000;
            break;
            default:
            break;
         }
         req.body.Value = Size == 0 ? (req.body.Value ? req.body.Value : null) : (req.body.Value ? `N'${req.body.Value.trim().replace(/'/g, "''")}'` : `''`);

         strSQL += format(`         
            Update [dbo].[SPSP_Expense] Set [{Name}] = ${Size == 0 ? '{Value}': `substring({Value},1,${Size})`}            
            where SDSP_Expense_DetailID = @SDSP_Expense_DetailID;

            Set @ROWCOUNT = @@ROWCOUNT;
         `, req.body);
      break;
      case 2:
         strSQL += format(`
            Delete FROM [dbo].[SPSP_Expense] 
            where SDSP_Expense_DetailID = @SDSP_Expense_DetailID
            
            Set @ROWCOUNT = @@ROWCOUNT;
         `, req.body);
      break;
        
   }

   strSQL += format(`
   Select @ROWCOUNT as Flag;

   if(@ROWCOUNT > 0)
   Begin
      Update [dbo].[SPSP] Set UserID = isnull(UserID, N'${req.UserID}')
      , Data_Updater = N'${req.UserID}'
      , Data_Update = GetDate()
      where Shipment_NO = @Shipment_NO;
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

 //Get Sample_Shipment_Detail_Add_List
 router.post('/Sample_Shipment_Detail_Add_List',  function (req, res, next) {
   console.log("Call Sample_Shipment_Detail_Add_List Api:",req.body);  
 
   req.body.Shipment_NO = req.body.Shipment_NO ? req.body.Shipment_NO : null;
 
   var strSQL = format(`
   Declare @Shipment_NO int = {Shipment_NO}
   Declare @CustomerID varchar(15), @Factory_SubID varchar(15), @Currency varchar(4), @Season varchar(10)
   Declare @TmpTable Table(Sample_Produce_DetailID int, ProduceID varchar(18), Sample_TypeID int
   , Product_No varchar(25), Qty float, Charge_Qty float
   , Unit_Price float, Unit_Cost float, Ref_NO varchar(20), Produce_No varchar(20))
   
   Select @CustomerID = CustomerID
   , @Factory_SubID = FactoryID
   , @Currency = Currency
   , @Season = Season
   From SPSP s with(NoLock,NoWait)
   Where s.Shipment_NO = @Shipment_NO
   
   Insert @TmpTable
   SELECT  sd.[Sample_Produce_DetailID]
         ,sd.[ProduceID]
         ,sd.[Sample_TypeID]
         ,sd.[Product_No]
         , isnull(sd.[Qty],0) + isnull(sd.[Agent_Qty],0) as Qty
         , isnull(Charge_Qty,0) as Charge_Qty
         ,sd.[Unit_Price]
         ,sd.[Unit_Cost]
         ,sd.[Ref_NO]
         ,sd.[Produce_No]
     FROM [dbo].[Samples] s
     Inner Join [dbo].[Sample_Detail] sd on s.ProduceID = sd.ProduceID
     Where s.CustomerID = @CustomerID
     And s.Factory_SubID = @Factory_SubID
     And s.Currency = @Currency
     And s.Season = @Season
     And (isnull(sd.[Qty],0) + isnull(sd.[Agent_Qty],0)) > 0; 
   
   Select tmp.*
   , isnull(TmpShip.Ship_Qty,0) as Ship_Qty
   , tmp.Qty - isnull(TmpShip.Ship_Qty,0) as Balance_Qty
   , tmp.Charge_Qty - isnull(TmpShip.Charge_Qty,0) as Balance_Charge_Qty
   , (Select Sample_Type From Sample_Type s with(NoLock,NoWait) Where s.Sample_TypeID = tmp.Sample_TypeID) as Sample_Type
   from @TmpTable tmp
   Left Outer Join (
      Select sp.Sample_Produce_DetailID, Sum(sp.Qty) as Ship_Qty, Sum(sp.Charge_Qty) as Charge_Qty
      From SPSP_Detail sp with(NoLock, NoWait) 
      Inner Join (Select distinct Sample_Produce_DetailID from @TmpTable ) t on t.Sample_Produce_DetailID = sp.Sample_Produce_DetailID
      Group by sp.Sample_Produce_DetailID
   ) TmpShip on tmp.Sample_Produce_DetailID = TmpShip.Sample_Produce_DetailID
   Where tmp.Qty - isnull(TmpShip.Ship_Qty,0) > 0
   Order by ProduceID, Product_No;
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

//Get Sample_Shipment_Report_Info
router.post('/Sample_Shipment_Report_Info',  function (req, res, next) {
   console.log("Call Sample_Shipment_Report_Info Api:",req.body);  
 
   req.body.Mode = req.body.Mode ? req.body.Mode : 0;
   req.body.Shipment_NO = req.body.Shipment_NO ? req.body.Shipment_NO : null;
   req.body.Debit_No = req.body.Debit_No ? `N'${req.body.Debit_No.trim().replace(/'/g, "''")}'` : `''`;
    
   //Mode == 0 Shipping Sheet Report
   var strSQL = format(`Declare @Mode int = {Mode}, @Shipment_NO int = {Shipment_NO}, @Debit_No Varchar(20) = {Debit_No}, @Total_Amount float
   , @Detail_Qty float, @Detail_Charge_Qty float, @Detail_Amount float
   , @Expense_Qty float, @Expense_Amount float

   Declare @TmpTable table(Shipment_DetailID int, Sample_Produce_DetailID int, Sample_TypeID int, ProduceID varchar(18), Brand varchar(30), Product_No varchar(25)
   , Qty float, Charge_Qty float, Doc_Price float, Amount float, Remark Nvarchar(20), Produce_No varchar(20))

   Declare @TmpTable_Expense table(SDSP_Expense_DetailID int, Shipment_NO int, Description Nvarchar(100)
   , Qty float, Doc_Price float, Unit_Price float, Amount float, Remark Nvarchar(Max))

   Insert @TmpTable
   Select spd.Shipment_DetailID
   , sd.[Sample_Produce_DetailID]
   , sd.[Sample_TypeID]
   , sd.[ProduceID]
   , s.[Brand]
   , sd.[Product_No]
   , isnull(spd.[Qty],0) as Qty
   , isnull(spd.[Charge_Qty],0) as Charge_Qty
   , isnull(spd.[Doc_Price],0) as Doc_Price
   , Round(isnull(spd.Qty,0) * isnull(spd.Doc_Price,0),2) AS Amount   
   --, Round(isnull(spd.Charge_Qty,0) * isnull(spd.Doc_Price,0),2) AS Amount
   , spd.[Remark]
   , sd.[Produce_No]
   From SPSP_Detail spd with(NoLock, NoWait)
   Inner Join Sample_Detail sd with(NoLock, NoWait) on spd.Sample_Produce_DetailID = sd.Sample_Produce_DetailID
   Inner Join Samples s with(NoLock, NoWait) on s.ProduceID = sd.ProduceID       
   Where spd.Shipment_NO = @Shipment_NO
   Order by spd.Shipment_DetailID;

   insert @TmpTable_Expense
   Select spe.SDSP_Expense_DetailID
   , spe.Shipment_NO
   , spe.Description
   , isnull(spe.Qty,0) AS Qty
   , isnull(spe.Doc_Price,0) AS Doc_Price
   , isnull(spe.Unit_Price,0) AS Unit_Price
   , Round(isnull(spe.Qty,0) * isnull(spe.Doc_Price,0),2) AS Amount
   , spe.Remark
   FROM SPSP_Expense spe with(NoLock, NoWait)
   Where spe.Shipment_NO = @Shipment_NO;

   Select @Detail_Qty = sum(Qty) 
   , @Detail_Charge_Qty = sum(Charge_Qty)
   , @Detail_Amount = sum(Amount)
   From @TmpTable

   Select @Expense_Qty = sum(Qty) 
   , @Expense_Amount = sum(Amount)
   From @TmpTable_Expense

   Set @Total_Amount = isnull(@Detail_Amount, 0) + isnull(@Expense_Amount, 0)

   SELECT s.[Shipment_NO]
   , s.[Express_No]
   , s.[OrganizationID]
   , (Select Organization_Name From [Organization] o with(NoLock,NoWait) Where o.OrganizationID = s.OrganizationID) as Organization_Name
   , s.[Department]
   , cr.Currency_Symbol
   , cr.en as Currency_en
   , Convert(varchar(10),s.[Shipping_Date],111) as [Shipping_Date]
   , s.[CustomerID]
   , s.[Messrs]
   , s.[Messrs_Address]
   , s.[ContactID]
   , c.Contact
   , c.Work_Phone
   , s.[FactoryID]
   , s.[FactoryID] as Factory_SubID
   , s.[Season]
   , s.[Currency]
   , s.[Doc_Title]
   , case 
      when @Mode = 0 then 'Sample Shipment' 
      when @Mode = 1 then 'Proforma Invoice' 
      when @Mode = 2 then 'Invoice' 
   End as Debit_Doc_Title
   , @Detail_Qty as Detail_Qty, @Detail_Charge_Qty as Detail_Charge_Qty, @Detail_Amount as Detail_Amount
   , @Expense_Qty as Expense_Qty, @Expense_Amount as Expense_Amount
   , @Total_Amount as Total_Amount
   , dbo.RecurseNumber(@Total_Amount) as EngNum_TTL_Amount
   , s.[Payment_Term_Debit]
   , s.[AccountID]
   , s.[Advising_Bank]
   , s.[UserID]
   , s.[Remark]
   , s.[Data_Updater]
   , Convert(varchar(20), s.[Data_Update],111) as [Data_Update]
   , s.[Debit_No]
   , case when isnull(s.[Debit_No],'') = '' then 1 else 0 End as Invoice_Flag
   FROM SPSP s WITH (NoLock, NoWait)
   Left Outer Join Customer_Contacts c WITH (NoLock, NoWait) on s.ContactID = c.ContactID
   Left Outer Join Currency cr WITH (NoWait, Nolock) on s.Currency = cr.Currency
   WHERE Shipment_NO = @Shipment_NO;

   Select t.Shipment_DetailID
   , t.[Sample_Produce_DetailID]
   , t.[ProduceID]
   , t.[Brand]
   , t.[Product_No]
   , p.Name as Shoe_Name
   , p.Color as Color
   , ct.Sample_Type as [Sample_Name]
   , ct.Sample_Type
   , isnull(t.[Qty],0) as Qty
   , isnull(t.[Charge_Qty],0) as Charge_Qty
   , isnull(t.[Doc_Price],0) as Doc_Price
   , isnull(t.Amount,0) AS Amount
   , t.[Remark]
   , t.[Produce_No]
   From @TmpTable t      
   LEFT OUTER Join Sample_Type ct with(NoLock,NoWait) on ct.Sample_TypeID = t.Sample_TypeID
   LEFT OUTER Join Product p with(NoLock,NoWait) on p.Product_No = t.Product_No
   Order by t.Shipment_DetailID;

   SELECT spe.SDSP_Expense_DetailID
   , spe.Shipment_NO
   , spe.Description
   , isnull(spe.Qty,0) AS Qty
   , isnull(spe.Doc_Price,0) AS Doc_Price
   , isnull(spe.Unit_Price,0) AS Unit_Price
   , isnull(spe.Amount,0) AS Amount
   , spe.Remark
   FROM @TmpTable_Expense spe;   
   `, req.body) ;               
         
   //console.log(strSQL)
   db.sql(req.SiteDB, strSQL)
      .then((result) => {
         var DataSet = {Report_Info: result.recordsets[0]
           , Report_Detail: result.recordsets[1]
           , Report_Expense: result.recordsets[2]
           , Remark: result.recordsets[0][0].Remark
           , Currency_Symbol: result.recordsets[0][0].Currency_Symbol
           , OrganizationID: result.recordsets[0][0].OrganizationID
           , Organization_Name: result.recordsets[0][0].Organization_Name
           , Debit_Doc_Title: result.recordsets[0][0].Debit_Doc_Title
           , Payment_Term_Debit: result.recordsets[0][0].Payment_Term_Debit
           , EngNum_TTL_Amount: result.recordsets[0][0].EngNum_TTL_Amount
           , Currency_en: result.recordsets[0][0].Currency_en
           , G_Detail_Total: {Qty: result.recordsets[0][0].Detail_Qty, Charge_Qty: result.recordsets[0][0].Detail_Charge_Qty, Amount: result.recordsets[0][0].Detail_Amount}
           , G_Expense_Total: {Qty: result.recordsets[0][0].Expense_Qty, Amount: result.recordsets[0][0].Expense_Amount}
           , G_Total_Qty: result.recordsets[0][0].Detail_Qty + result.recordsets[0][0].Expense_Qty
           , G_Total_Charge_Qty: result.recordsets[0][0].Detail_Charge_Qty
           , G_Total_Amount: result.recordsets[0][0].Total_Amount
        };
        DataSet.G_Detail_Total.Qty = Math.round(DataSet.G_Detail_Total.Qty * 10000)/10000;
        DataSet.G_Detail_Total.Charge_Qty = Math.round(DataSet.G_Detail_Total.Charge_Qty * 10000)/10000;
        DataSet.G_Detail_Total.Amount = Math.round(DataSet.G_Detail_Total.Amount * 10000)/10000;

        DataSet.G_Expense_Total.Qty = Math.round(DataSet.G_Expense_Total.Qty * 10000)/10000;
        DataSet.G_Expense_Total.Amount = Math.round(DataSet.G_Expense_Total.Amount * 10000)/10000;

        DataSet.G_Total_Qty = Math.round(DataSet.G_Total_Qty * 10000)/10000;
        DataSet.G_Total_Charge_Qty = Math.round(DataSet.G_Total_Charge_Qty * 10000)/10000;
        DataSet.G_Total_Amount = Math.round(DataSet.G_Total_Amount * 10000)/10000;
         //console.log(DataSet)
         res.send(DataSet);
      }).catch((err) => {
         console.log(err);
         res.status(500).send(err);
      })
});

//Get Sample_Debit_Note_List
router.post('/Sample_Debit_Note_List',  function (req, res, next) {
   console.log("Call Sample_Debit_Note_List Api:");

   req.body.Debit_No = req.body.Debit_No ? `${req.body.Debit_No.trim().substring(0,20)}` : ``;
   req.body.Debit_Date = req.body.Debit_Date ? `${req.body.Debit_Date.trim().substring(0,10)}` : '';
   req.body.CustomerID = req.body.CustomerID ? `${req.body.CustomerID.trim().substring(0,15)}` : ``;
   req.body.Messrs = req.body.Messrs ? `${req.body.Messrs.trim().substring(0,100)}` : ``;
   req.body.Season = req.body.Season ? `${req.body.Season.trim().substring(0,10).replace(/'/g, '')}` : '';
   req.body.Currency = req.body.Currency ? `${req.body.Currency.trim().substring(0,3).replace(/'/g, '')}` : '';
   req.body.Amount = req.body.Amount ? req.body.Amount : null;
   req.body.Commodity = req.body.Commodity ? `${req.body.Commodity.trim().substring(0,100)}` : ``;
   req.body.Department = req.body.Department ? `${req.body.Department.trim().substring(0,5).replace(/'/g, '')}` : '';
   req.body.Progress_Amount = req.body.Progress_Amount ? req.body.Progress_Amount : null;   
   req.body.Rcved_Amount = req.body.Rcved_Amount ? req.body.Rcved_Amount : null;
   req.body.UserID = req.body.UserID ? `${req.body.UserID.trim().substring(0,256).replace(/'/g, '')}` : '';
   req.body.Approve = req.body.Approve ? `${req.body.Approve.trim().substring(0,20).replace(/'/g, '')}` : '';
   
   
   var strSQL = format(`
   SELECT Top 1000 row_number() Over(Order By o.[Debit_Date] desc) as RecNo
   , o.[Debit_No]
   , isnull(o.[IsCredit_Note],0) as [IsCredit_Note]
   , convert(varchar(10) ,o.[Debit_Date] ,111) as [Debit_Date]
   , o.[CustomerID]
   , o.[Messrs]
   , o.[Season]
   , o.[Currency]
   , isnull(o.[Amount],0) as [Amount]
   , o.[Commodity]
   , o.[Department]
   , isnull(o.[Progress_Amount],0) as [Progress_Amount]
   , isnull(o.[Rcved_Amount],0) as [Rcved_Amount]
   , o.[UserID]
   , o.[Approve]
   FROM [dbo].[Debit] o With(Nolock,NoWait)   
   where (N'{Debit_No}' = ''  or o.[Debit_No] like N'%{Debit_No}%')
   And (N'{Debit_Date}' = '' or convert(varchar(10),o.[Debit_Date],111) like N'%{Debit_Date}%')
   And (N'{CustomerID}' = '' or o.[CustomerID] like N'%{CustomerID}%')
   And (N'{Messrs}' = '' or o.[Messrs] like N'%{Messrs}%')
   And (N'{Season}' = '' or o.[Season] like N'%{Season}%')
   And (N'{Currency}' = '' or o.[Currency] = N'{Currency}')
   And ({Amount} is null or o.[Amount] ={Amount})
   And (N'{Commodity}' = '' or o.[Commodity] like N'%{Commodity}%')
   And (N'{Department}' = '' or o.[Department] like N'{Department}%')   
   And ({Progress_Amount} is null or o.[Progress_Amount] ={Progress_Amount})
   And ({Rcved_Amount} is null or o.[Rcved_Amount] ={Rcved_Amount})
   And (N'{UserID}' = '' or o.[UserID] like N'%{UserID}%')
   And (N'{Approve}' = '' or o.[Approve] like N'%{Approve}%')
   And o.Subject = 'Sample'
   Order By o.Debit_Date desc, o.[Season], o.[Debit_No], o.UserID
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

 //Get Sample Debit Note Info
 router.post('/Sample_Debit_Note_Info',  function (req, res, next) {
   console.log("Call Sample_Debit_Note_Info Api:",req.body);  
 
   req.body.Debit_No = req.body.Debit_No ? `N'${req.body.Debit_No.trim().replace(/'/g, "''")}'` : `''`;
   req.body.Mode = req.body.Mode ? req.body.Mode : 0;
 
   //Mode == 0 Get Sample Debit, Sample Debit Detail and Sample Debit Expense Data
   //Mode == 1 Get Sample Debit Data
   //Mode == 2 Get Sample Debit Detail Data
   //Mode == 3 Get Sample Debit Expense Data
   var strSQL = format(`
   Declare @Mode int = {Mode}, @Debit_No varchar(20) = {Debit_No};
   Declare @Sample_Type Table(Sample_TypeID int, Sample_Type nvarchar(50))

   Insert @Sample_Type
   Select Sample_TypeID, Sample_Type
   From Sample_Type
 
   if(@Mode = 0 or @Mode = 1)
   Begin
      SELECT s.[Debit_No]
      , s.[Subject]
      , s.[Express_No]
      , s.[Revised_From]
      , s.[OrganizationID]
      , s.[Department]
      , Convert(varchar(10),s.[Debit_Date],111) as [Debit_Date]
      , Convert(varchar(10),s.[Expiry_Date],111) as [Expiry_Date]
      , s.[CustomerID]
      , s.[Season]
      , s.[Currency]
      , s.[Messrs]
      , s.[Messrs_Address]
      , s.[ContactID]
      , c.Contact
      , c.Work_Phone
      , s.[Payment_Term_Invoice]
      , s.[Payment_Term_Debit]
      , s.[UserID]
      , case when len(isnull(s.[Approve],'')) > 0 then 1 else 0 end as Approve
      , case when ABS(isnull(s.[islitigation],0)) > 0 then 1 else 0 end as islitigation
      , isnull(s.[Approve],'') as [Approve_Name]
      , Convert(varchar(20), s.[Approve_Date],120) as [Approve_Date]
      , iif(s.[Approve_First_Date] is not null, '('+ Convert(varchar(20), s.[Approve_First_Date],120) + ')', '')  as [Approve_First_Date]
      , s.[Carton_Qty]
      , s.[Amount]
      , s.[Payment_Term]
      , s.[Rcv_Type]
      , s.[Rcv_Days]
      , s.[By_Doc_Rcv]
      , s.[Term_Price]
      , s.[Rcved_Amount]
      , s.[Commodity]
      , s.[Beneficiary] 
      , s.[Advising_Bank]
      , (Select top 1 b.S_Name From Bank b with(NoLock,NoWait) Where b.BankID = s.Advising_Bank) as Advising_Bank_Name
      , s.[Local_Export_Amount]
      , s.[Debit_Doc_Title]
      , isnull(s.[IsCredit_Note],0) as [IsCredit_Note]
      , isnull(s.[Debit_Without_Invoice_Amount],0) as [Debit_Without_Invoice_Amount]
      , s.[Remark]
      , s.[Memo]
      , s.[Data_Updater]
      , Convert(varchar(20), s.[Data_Update],120) as [Data_Update]
      , isnull([CEO],'') as CEO
      , isnull([First_Level_Supervisor],'') as First_Level_Supervisor
      , isnull([Department_Supervisor],'') as Department_Supervisor
      , isnull([Section_Supervisor],'') as Section_Supervisor
      FROM Debit s WITH(NoLock, NoWait)
      Left Outer Join Customer_Contacts c WITH(NoLock, NoWait) on s.ContactID = c.ContactID
      WHERE s.Debit_No = @Debit_No;
   End 
   if(@Mode = 0 or @Mode = 2)
   Begin
      Select sp.Shipment_NO
      , spd.Shipment_DetailID
      , sd.[Sample_Produce_DetailID]
      , sd.[ProduceID]
      , s.[Brand]
      , sd.[Product_No]
      , ct.Sample_Type as [Sample_Name]
      , ct.Sample_Type
      , isnull(spd.[Qty],0) as Qty
      , isnull(spd.[Charge_Qty],0) as Charge_Qty
      , isnull(spd.[Doc_Price],0) as Doc_Price
      , Floor( cast( isnull(spd.Qty,0) * isnull(spd.Doc_Price,0) as money ) * 100) / 100 AS Ship_Amount
      , isnull(sd.[Unit_Price],0) * isnull(s.Charge_Price_Rate,0) as Unit_Price
      , Floor( cast( isnull(spd.Charge_Qty,0) * isnull(sd.Unit_Price,0) * isnull(s.Charge_Price_Rate,0) as money )  * 100) / 100  AS Charge_Amount
      --, cast(isnull(spd.Charge_Qty / nullif(spd.[Qty],0),0 ) * 100 as int) as Charge_Rate 
      , isnull(s.Charge_Price_Rate,0) * 100 as Charge_Rate 
      , spd.[Remark]
      , sd.[Produce_No]
      From spsp sp with(NoLock,NoWait)
      Inner Join SPSP_Detail spd with(NoLock, NoWait) on sp.Shipment_NO = spd.Shipment_No
      left outer Join Sample_Detail sd with(NoLock, NoWait) on spd.Sample_Produce_DetailID = sd.Sample_Produce_DetailID
      left outer Join Samples s with(NoLock, NoWait) on s.ProduceID = sd.ProduceID       
      LEFT OUTER Join @Sample_Type ct on ct.Sample_TypeID = sd.Sample_TypeID
      Where sp.Debit_No = @Debit_No
      Order by Shipment_NO, spd.Shipment_DetailID;
   End
   if(@Mode = 0 or @Mode = 3)
   Begin 
      SELECT de.Debit_ExpenseID
      , de.Debit_No
      , de.Description
      , isnull(de.Qty,0) AS Qty
      , isnull(de.Doc_Price,0) AS Doc_Price
      , Floor( cast(isnull(de.Qty,0) * isnull(de.Doc_Price,0) as money) * 100 ) / 100 AS Amount
      , isnull(de.Unit_Price,0) AS Unit_Price
      , Floor( cast(isnull(de.Qty,0) * isnull(de.Unit_Price,0) as money) * 100 ) / 100 AS Unit_Amount
      , de.Remark
      FROM Debit_Expense de with(NoLock, NoWait)
      Where de.Debit_No = @Debit_No;
   End
   if(@Mode = 0 or @Mode = 4)
   Begin
      Select m.Money_SourceID, m.Type, m.Days, m.By_Doc_Rcv, m.Deposit, m.Description, m.MoneyID
      , Convert(varchar(20), s.Date, 111) as Date
      , m.Update_User      
      , Convert(varchar(20), m.Update_Date, 120) as Update_Date
      , m.Payment_Term
      , Convert(varchar(10),m.[Due_Date],111) as [Due_Date]
      from Money_Source m With(NoLock,NoWait)
      Left Outer Join Money s on s.MoneyID = m.MoneyID
      Where m.Source_No = @Debit_No
      And m.Subject = 'Debit RCV';
   End
   `, req.body) ;
   //console.log(strSQL)
   db.sql(req.SiteDB, strSQL)
      .then((result) => {
         var DataSet = {Sample_Debit_Note: (req.body.Mode == 0 || req.body.Mode == 1) ? result.recordsets[0] : []
           , Sample_Debit_Note_Detail: (req.body.Mode == 0) ? result.recordsets[1] : (req.body.Mode == 2 ? result.recordsets[0] : [])
           , Sample_Debit_Note_Expense: (req.body.Mode == 0) ? result.recordsets[2] : (req.body.Mode == 3 ? result.recordsets[0] : [])
           , Debit_RCV_List: (req.body.Mode == 0) ? result.recordsets[3] : (req.body.Mode == 4 ? result.recordsets[0] : [])
        };
        if(req.body.Mode == 0 || req.body.Mode == 2){
            var Qty = 0, Charge_Qty = 0, Ship_Amount = 0, Charge_Amount = 0
            DataSet.Sample_Debit_Note_Detail.forEach((item) => {
               Qty += item.Qty;
               Charge_Qty += item.Charge_Qty;
               item.Ship_Amount = Math.round((item.Ship_Amount)*10000)/10000;
               item.Charge_Amount = Math.round((item.Charge_Amount)*10000)/10000;
               Ship_Amount += item.Ship_Amount;
               Charge_Amount += item.Charge_Amount;
            });
            Ship_Amount = Math.round((Ship_Amount)*10000)/10000
            Charge_Amount = Math.round((Charge_Amount)*10000)/10000
            DataSet.Detail_Total = {Qty:Qty, Charge_Qty:Charge_Qty, Ship_Amount:Ship_Amount, Charge_Amount:Charge_Amount}
        }
        if(req.body.Mode == 0 || req.body.Mode == 3){
            var Qty = 0, Doc_Price = 0, Amount = 0, Unit_Amount = 0
            DataSet.Sample_Debit_Note_Expense.forEach((item) => {
               Qty += item.Qty;
               item.Amount = Math.round((item.Amount)*10000)/10000;
               item.Unit_Amount = Math.round((item.Unit_Amount)*10000)/10000;
               Amount += item.Amount;
               Unit_Amount += item.Unit_Amount;
            });
            Amount = Math.round((Amount)*10000)/10000;
            Unit_Amount = Math.round((Unit_Amount)*10000)/10000;
            DataSet.Expense_Total = {Qty:Qty, Amount:Amount, Unit_Amount:Unit_Amount}
         }
         if(req.body.Mode == 0 || req.body.Mode == 4){
            var  Amount = 0
            DataSet.Debit_RCV_List.forEach((item) => {
               item.Deposit = Math.round((item.Deposit)*10000)/10000;
               Amount += item.Deposit;
            });
            Amount = Math.round((Amount)*10000)/10000;            
            DataSet.Debit_RCV_Total = {Amount:Amount}
         }
         //console.log(DataSet)
         res.send(DataSet);
      }).catch((err) => {
         console.log(err);
         res.status(500).send(err);
      })
});

//Maintain Sample Debit Note
router.post('/Sample_Debit_Note_Maintain',  function (req, res, next) {
   console.log("Call Sample_Debit_Note_Maintain Api:",req.body);

   // req.body.Mode === 0 表示新增
   // req.body.Mode === 1 表示修改
   // req.body.Mode === 2 表示刪除
   var Size = 0;
   req.body.Debit_No = req.body.Debit_No ? `N'${req.body.Debit_No.trim().replace(/'/g, "''")}'` : `''`;
   
   var strSQL = format(`Declare @ROWCOUNT int, @Debit_No varchar(20) = {Debit_No} `, req.body);
   switch(req.body.Mode){
      case 0:
         req.body.Debit_Date = req.body.Debit_Date ? `'${req.body.Debit_Date.trim().substring(0,10)}'` : `'${this.moment().format('YYYY/MM/DD')}'`;
         req.body.Expiry_Date = req.body.Expiry_Date ? `'${req.body.Expiry_Date.trim().substring(0,10)}'` : `'${this.moment().format('YYYY/MM/DD')}'`;
         req.body.CustomerID = req.body.CustomerID ? `N'${req.body.CustomerID.trim().substring(0,15).replace(/'/g, "''")}'` : `''`;
         req.body.Season = req.body.Season ? `N'${req.body.Season.trim().substring(0,10).replace(/'/g, "''")}'` : `''`;
         req.body.Currency = req.body.Currency ? `N'${req.body.Currency.trim().substring(0,4).replace(/'/g, "''")}'` : `''`;
         req.body.Rcv_Type = req.body.Rcv_Type ? `N'${req.body.Rcv_Type.trim().substring(0,4).replace(/'/g, "''")}'` : `'T/T'`;
         req.body.Rcv_Days = req.body.Rcv_Days ? req.body.Rcv_Days : 0;

         strSQL += format(`
            Declare @Department nvarchar(50), @OrganizationID nvarchar(50)
            
            Select @Department = d.Department_Code, @OrganizationID = d.OrganizationID
            from Employee e 
               Inner Join Department d on e.DepartmentID = d.DepartmentID
               Inner Join aspnet_Users au on e.EmployeeID = au.EmployeeID
            Where au.LoweredUserName = N'${req.UserID}'

            Insert [dbo].[Debit] (Debit_No, Subject, [OrganizationID], [Department]
               , [CustomerID], [Messrs], [Messrs_Address]
               , [Debit_Date], [Expiry_Date], [Season], [Currency]
               , [Rcv_Type], [Rcv_Days], [By_Doc_Rcv], [Payment_Term]
               , UserID, Data_Updater, Data_Update)
            Select @Debit_No as [Debit_No], 'Sample' as Subject, @OrganizationID as [OrganizationID], @Department as [Department]
               , {CustomerID} as [CustomerID], c.Customer_Name as [Messrs], c.Address as [Messrs_Address]
               , {Debit_Date} as [Debit_Date], {Expiry_Date} as [Expiry_Date], {Season} as [Season], {Currency} as [Currency]
               , {Rcv_Type} as [Rcv_Type], {Rcv_Days} as [Rcv_Days], 0 as [By_Doc_Rcv]
               , dbo.Get_Payment_Term('', {Rcv_Type}, {Rcv_Days}, 0) as Payment_Term  
               , N'${req.UserID}' as UserID, N'${req.UserID}' as Data_Updater, GetDate() as Data_Update
            From Customer c with(NoLock,NoWait)
            Where c.CustomerID = {CustomerID}
            
            Set @ROWCOUNT = @@ROWCOUNT;
         `, req.body);
      break;
      case 1:
         switch(req.body.Name){
            case 'CustomerID':
               Size = 15;
               strSQL += format(`Declare @Messrs nvarchar(100), @Messrs_Address nvarchar(256); 
               Select @Messrs = Customer_Name
               , @Messrs_Address = c.Address 
               From Customer c with(NoLock,NoWait) 
               Where c.CustomerID = '{Value}'`, req.body);
            break;
            case 'Season':
            case 'Debit_Date':
            case 'Expiry_Date':
            case 'OrganizationID':
            case 'Beneficiary':
            case 'Revised_From':
               Size = 10;
            break;
            case 'Department':
               Size = 5;
            break;
            case 'Rcv_Type':
               Size = 4;
               req.body.Rcv_Type = req.body.Rcv_Type ? `N'${req.body.Rcv_Type.trim().substring(0,4).replace(/'/g, "''")}'` : `'T/T'`;
            break;
            case 'Currency':
               Size = 4;
            break;
            case 'Debit_No':
            case 'Express_No':
               Size = 20;
            break;
            case 'Messrs':
            case 'Commodity':
               Size = 100;
            break;
            case 'Messrs_Address':
               Size = 256;
            break;
            case 'Remark':
            case 'Memo':
               Size = 65535;
            break;
            case 'Payment_Term_Debit':
               Size = 30;
            break;
            case 'Payment_Term':
               Size = 50;
            break;
            case 'Rcv_Days':
               req.body.Rcv_Days = req.body.Rcv_Days ? req.body.Rcv_Days : 0;
            break;
            case 'Approve':
               req.body.Value = req.body.Value ? req.UserID : null;
               Size = 20;
            break;
            default:
            break;
         }
         req.body.Value = Size == 0 ? (req.body.Value ? req.body.Value : null) : (req.body.Value ? `N'${req.body.Value.trim().replace(/'/g, "''")}'` : `''`);

         strSQL += format(`         
            Update [dbo].[Debit] Set [{Name}] = ${Size == 0 ? '{Value}': `substring({Value},1,${Size})`}            
            ${req.body.Name == 'CustomerID'? ', Messrs = @Messrs, Messrs_Address = @Messrs_Address, ContactID = null  ':''}
            where Debit_No = @Debit_No             
            ${(req.body.Name == 'Debit_No') ? " And (Select Count(*) From [dbo].[Money_Source] d with(NoLock,NoWait) Where Source_No = @Debit_No And d.Subject = 'Debit RCV' ) = 0":""}
            ${(req.body.Name == 'CustomerID' || req.body.Name == 'Currency') ? " And (Select Count(*) From [dbo].[Money_Source] d with(NoLock,NoWait) Where Source_No = @Debit_No And d.Subject = 'Debit RCV' And d.MoneyID is not null) = 0" : ""}
            ${(req.body.Name == 'Debit_No' || req.body.Name == 'CustomerID' || req.body.Name == 'Season' || req.body.Name == 'Currency') ? ' And (Select count(*) From spsp sp with(NoLock,NoWait) Where sp.Debit_No = @Debit_No ) = 0':''}
            ${(req.body.Name == 'Debit_No') ? ' And (Select Count(*) From [dbo].[Debit] d with(NoLock,NoWait) Where Debit_No = {Value}) = 0':''}
            ;

            Set @ROWCOUNT = @@ROWCOUNT;
         `, req.body);
      break;
      case 2:
         strSQL += format(`
            Delete FROM [dbo].[Debit] 
            where Debit_No = @Debit_No
            And (Select count(*) From spsp sp with(NoLock,NoWait) Where sp.Debit_No = @Debit_No ) = 0
            And (Select count(*) From Debit_Expense sd with(NoLock,NoWait) Where sd.Debit_No = @Debit_No ) = 0
            And (Select Count(*) From [dbo].[Money_Source] d with(NoLock,NoWait) Where Source_No = @Debit_No And d.Subject = 'Debit RCV' And d.MoneyID is not null) = 0
            
            Set @ROWCOUNT = @@ROWCOUNT;
         `, req.body);
      break;
        
   }

   strSQL += format(`
   Select @ROWCOUNT as Flag,  ${(req.body.Mode == 1 && req.body.Name == 'Debit_No') ? '{Value}' : '@Debit_No'} as Debit_No;

   if({Mode} = 1 and @ROWCOUNT > 0)
   Begin
      Update [dbo].[Debit] Set UserID = isnull(UserID, N'${req.UserID}')
      , Data_Updater = N'${req.UserID}'
      , Data_Update = GetDate()
      where Debit_No = @Debit_No;
   End
   `, req.body);
   //console.log(strSQL)
   db.sql(req.SiteDB, strSQL)
      .then((result) => {
         //console.log(result.recordsets[0])
         res.send({Flag:result.recordsets[0][0].Flag > 0, Debit_No: result.recordsets[0][0].Debit_No});
      }).catch((err) => {
         console.log(err);
         res.status(500).send(err);
      })
});

//Maintain Sample Debit Note Detail
router.post('/Sample_Debit_Note_Detail_Maintain',  function (req, res, next) {
   console.log("Call Sample_Debit_Note_Detail_Maintain Api:",req.body);

   // req.body.Mode === 0 表示新增
   // req.body.Mode === 1 表示修改
   // req.body.Mode === 2 表示刪除
   var Size = 0;
   req.body.Debit_No = req.body.Debit_No ? `N'${req.body.Debit_No.trim().replace(/'/g, "''")}'` : `''`;
   
   var strSQL = format(`Declare @ROWCOUNT int=0, @Debit_No Varchar(20) = {Debit_No}

   if( (select count(*) From Money_Source c WITH (NoLock, NoWait) Where c.Source_No = @Debit_No And Subject = 'Debit RCV' And c.MoneyID is not null) > 0 )
   begin
      Select @ROWCOUNT as Flag;
      return;
   End
   `, req.body);
   switch(req.body.Mode){
      case 0:
         req.body.QueryData = req.body.QueryData ? `N'${req.body.QueryData.replace(/'/g, "''")}'` : `''`; 
         strSQL += format(`
         Declare @tmpTable Table (shipment_NO int)
         Declare @Import_Mode int = {Import_Mode}

         if(@Import_Mode = 0)
         begin                       
            Insert @TmpTable            
            Select distinct s.Shipment_NO
            From Debit d with(NoLock,NoWait)
            Inner Join SPSP s with(NoLock,NoWait) on s.CustomerID = d.CustomerID And s.Season = d.Season And s.Currency = d.Currency
            Inner Join SPSP_Detail spd With(NoLock,NoWait) on spd.Shipment_NO = s.Shipment_NO
            Inner Join Sample_Detail sd with(NoLock,NoWait) on spd.Sample_Produce_DetailID = sd.Sample_Produce_DetailID
            Where d.Debit_No = {Debit_No}
            And Isnull(s.Debit_No,'') = ''
            And isnull(sd.Charge_Qty,0) > 0
            And ({QueryData} = '' or charindex({QueryData}, isnull(s.Shipment_NO,'') + ' ' + isnull(sd.Product_NO,'') + ' ' + isnull(sd.ProduceID,'') ) > 0);             
         end
         else
         begin 
            Insert @TmpTable
            Select {Shipment_NO} as [Shipment_NO]
         end

         Update [dbo].[SPSP] set Debit_No = @Debit_No
         From [dbo].[SPSP] s
         Inner Join @tmpTable d on s.Shipment_NO = d.Shipment_NO
         where isnull(s.Debit_No,'') = ''

         Set @ROWCOUNT = @@ROWCOUNT;          
         `, req.body);
      break;
      case 1:

         req.body.Value = Size == 0 ? (req.body.Value != null ? req.body.Value : null) : (req.body.Value ? `N'${req.body.Value.trim().replace(/'/g, "''")}'` : `''`);

         switch(req.body.Name){
            case 'Charge_Qty':
               strSQL += format(`

                  Declare @Charge_Qty float = {Value}, 
                  @Order_Qty float, @Order_Charge_Qty float,
                  @Balance_Qty float = 0, @Balance_Charge_Qty float = 0;

                  Select @Order_Qty = isnull(sd.[Qty],0) + isnull(sd.[Agent_Qty],0), 
                  @Order_Charge_Qty = isnull(sd.[Charge_Qty],0) 
                  From Sample_Detail sd with(NoLock,NoWait) 
                  Where sd.Sample_Produce_DetailID = {Sample_Produce_DetailID}

                  Set @Balance_Qty = isnull(@Order_Qty,0) - isnull((Select sum(Qty) From SPSP_Detail sd with(NoLock,NoWait) Where sd.Sample_Produce_DetailID = {Sample_Produce_DetailID} And sd.Shipment_DetailID <> {Shipment_DetailID} ),0)
                  Set @Balance_Charge_Qty = isnull(@Order_Charge_Qty,0) - isnull((Select sum(Charge_Qty) From SPSP_Detail sd with(NoLock,NoWait) Where sd.Sample_Produce_DetailID = {Sample_Produce_DetailID} And sd.Shipment_DetailID <> {Shipment_DetailID} ),0)

                  Set @Balance_Charge_Qty = case when @Balance_Charge_Qty > 0 then @Balance_Charge_Qty else 0 end
                  Set @Charge_Qty = case When @Balance_Charge_Qty >= @Charge_Qty then @Charge_Qty else @Balance_Charge_Qty end

                  Update [dbo].[SPSP_Detail] Set [Charge_Qty] = 
                  case when (@Balance_Qty - isnull(Qty,0)) >= @Balance_Charge_Qty or @Charge_Qty >= @Balance_Charge_Qty - (@Balance_Qty - isnull(Qty,0)) then 
                     case when isnull(Qty,0) < @Charge_Qty then isnull(Qty,0) else @Charge_Qty end
				      else 
						   @Balance_Charge_Qty - (@Balance_Qty - isnull(Qty,0)) 
				      end
                  where Shipment_DetailID = {Shipment_DetailID};

                  Set @ROWCOUNT = @@ROWCOUNT;
                  
               `, req.body);

            break;
            case 'Doc_Price':
               strSQL += format(`
               Update [dbo].[SPSP_Detail] Set [{Name}] = ${Size == 0 ? '{Value}': `substring({Value},1,${Size})`}            
               where Shipment_DetailID = {Shipment_DetailID};
   
               Set @ROWCOUNT = @@ROWCOUNT;
            `, req.body);   
            break;
         }         
      break;
      case 2:
         strSQL += format(`
            Update [dbo].[SPSP] set Debit_No = null
            where Shipment_NO = {Shipment_NO}
            And Debit_No = @Debit_No
                        
            Set @ROWCOUNT = @@ROWCOUNT;
         `, req.body);
      break;
        
   }

   strSQL += format(`
   Select @ROWCOUNT as Flag;

   if(@ROWCOUNT > 0)
   Begin     
      Update [dbo].[Debit] Set UserID = isnull(UserID, N'${req.UserID}')
      , Data_Updater = N'${req.UserID}'
      , Data_Update = GetDate()
      , Amount = isnull((Select sum(Floor( Cast(isnull(sd.Charge_Qty,0) * isnull(sad.Unit_Price,0) * isnull(sa.Charge_Price_Rate,0) as money) * 100) / 100 ) 
                        From spsp s with(NoLock,NoWait) 
                        Inner Join SPSP_Detail sd with(NoLock,NoWait) on s.Shipment_NO = sd.Shipment_NO 
                        Inner Join Sample_Detail sad with(NoLock,NoWait) on sd.Sample_Produce_DetailID = sad.Sample_Produce_DetailID 
                        Inner Join Samples sa with(NoLock,NoWait) on sad.ProduceID = sa.ProduceID 
                        Where s.Debit_No = @Debit_No), 0) 
               + isnull( (Select sum( Floor( Cast( isnull(pe.Qty,0) * isnull(pe.Unit_Price,0) as money) * 100 ) / 100 ) 
                        From Debit_Expense pe with(NoLock,NoWait) 
                        Where pe.Debit_No = @Debit_No) ,0 )
      where Debit_No = @Debit_No;
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

//Maintain Sample Debit Note Expense
router.post('/Sample_Debit_Note_Expense_Maintain',  function (req, res, next) {
   console.log("Call Sample_Debit_Note_Expense_Maintain Api:",req.body);

   // req.body.Mode === 0 表示新增
   // req.body.Mode === 1 表示修改
   // req.body.Mode === 2 表示刪除
   var Size = 0;
   req.body.Debit_No = req.body.Debit_No ? `N'${req.body.Debit_No.trim().replace(/'/g, "''")}'` : `''`;
   req.body.Debit_ExpenseID = req.body.Debit_ExpenseID ? req.body.Debit_ExpenseID : null; 
   
   var strSQL = format(`Declare @ROWCOUNT int=0, @Debit_ExpenseID int = {Debit_ExpenseID}, @Debit_No varchar(20) = {Debit_No};

      if( (select count(*) From Money_Source c WITH (NoLock, NoWait) Where c.Source_No = @Debit_No And Subject = 'Debit RCV' And c.MoneyID is not null) > 0 )
      Begin 
         Select @ROWCOUNT as Flag;
         return;
      End
   `, req.body);
   switch(req.body.Mode){
      case 0:
         strSQL += format(`
            Insert [dbo].[Debit_Expense] ([Debit_No], [Qty], [Doc_Price], [Unit_Price])
            Select @Debit_No as [Debit_No], 0 as [Qty], 0 as [Doc_Price], 0 as [Unit_Price]

            Set @ROWCOUNT = @@ROWCOUNT; 
         `, req.body);
      break;
      case 1:
         switch(req.body.Name){
            case 'Description':
               Size = 100;
            break;
            case 'Remark':
               Size = 1000;
            break;
            default:
            break;
         }
         req.body.Value = Size == 0 ? (req.body.Value ? req.body.Value : null) : (req.body.Value ? `N'${req.body.Value.trim().replace(/'/g, "''")}'` : `''`);

         strSQL += format(`         
            Update [dbo].[Debit_Expense] Set [{Name}] = ${Size == 0 ? '{Value}': `substring({Value},1,${Size})`}            
            where Debit_ExpenseID = @Debit_ExpenseID;

            Set @ROWCOUNT = @@ROWCOUNT;
         `, req.body);
      break;
      case 2:
         strSQL += format(`
            Delete FROM [dbo].[Debit_Expense] 
            where Debit_ExpenseID = @Debit_ExpenseID
            
            Set @ROWCOUNT = @@ROWCOUNT;
         `, req.body);
      break;
        
   }

   strSQL += format(`
   Select @ROWCOUNT as Flag;

   if(@ROWCOUNT > 0)
   Begin
      Update [dbo].[Debit] Set UserID = isnull(UserID, N'${req.UserID}')
      , Data_Updater = N'${req.UserID}'
      , Data_Update = GetDate()
      , Amount = isnull((Select sum(Floor( Cast(isnull(sd.Charge_Qty,0) * isnull(sad.Unit_Price,0) * isnull(sa.Charge_Price_Rate,0) as money) * 100) / 100 ) 
                        From spsp s with(NoLock,NoWait) 
                        Inner Join SPSP_Detail sd with(NoLock,NoWait) on s.Shipment_NO = sd.Shipment_NO 
                        Inner Join Sample_Detail sad with(NoLock,NoWait) on sd.Sample_Produce_DetailID = sad.Sample_Produce_DetailID 
                        Inner Join Samples sa with(NoLock,NoWait) on sad.ProduceID = sa.ProduceID 
                        Where s.Debit_No = @Debit_No), 0) 
               + isnull( (Select sum( Floor( Cast( isnull(pe.Qty,0) * isnull(pe.Unit_Price,0) as money) * 100 ) / 100 ) 
                        From Debit_Expense pe with(NoLock,NoWait) 
                        Where pe.Debit_No = @Debit_No) ,0 )
      where Debit_No = @Debit_No;
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

//Maintain Debit RCV
router.post('/Debit_RCV_Maintain',  function (req, res, next) {
   console.log("Call Debit_RCV_Maintain Api:",req.body);

   // req.body.Mode === 0 表示新增
   // req.body.Mode === 1 表示修改 
   // req.body.Mode === 2 表示刪除
   // req.body.Mode === 3 表示拆分金額
   req.body.Debit_No = req.body.Debit_No ? `N'${req.body.Debit_No.trim().substring(0,20).replace(/'/g, "''")}'` : `''`; 

   var strSQL = format(`Declare @Accounting int = 0, @ROWCOUNT int=0, @Balance_Amount float=0;

   Set @Balance_Amount = (Select Round(isnull(Amount,0),2) From Debit d with(Nolock,NoWait) Where d.Debit_No = {Debit_No}) 
   - isnull((Select Sum(Round(Deposit,2)) From Money_Source c WITH (NoLock, NoWait) Where c.Source_No = {Debit_No} And Subject = 'Debit RCV'),0)
   
   `, req.body);

   switch(req.body.Mode){
      case 0:
         req.body.Type = req.body.Type ? `N'${req.body.Type.trim().substring(0,10).replace(/'/g, "''")}'` : `''`; 
         req.body.Description = req.body.Description ? `N'${req.body.Description.trim().substring(0,30).replace(/'/g, "''")}'` : `''`;    
         strSQL += format(`         
         if(@Accounting = 0)
         begin   
            Insert into [dbo].[Money_Source] (Type, Days, By_Doc_Rcv, Deposit, Subject, Source_No, Description, [Update_User] ,[Update_Date] )
            Select {Type} as Type, {Days} as Days, {By_Doc_Rcv} as By_Doc_Rcv
            --, case when @Balance_Amount < 0 then 0 else @Balance_Amount End as Deposit
            , @Balance_Amount as Deposit
            , 'Debit RCV' as Subject, {Debit_No} as Source_No, {Description} as Description, N'${req.UserID}' as [Update_User], GetDate() as [Update_Date]
            Set @ROWCOUNT = @@ROWCOUNT;
         end
         `, req.body);
      break;
      case 1:
         var Size = 0;
         switch(req.body.Name) {
            case 'Type':
            case 'Due_Date':
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
         req.body.Split_Amount = req.body.Split_Amount ? req.body.Split_Amount : 0;

         strSQL += format(`Declare @Split_Amount float = Round(isnull({Split_Amount},0),2);

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
      Update [dbo].[Debit] Set UserID = isnull(UserID, N'${req.UserID}'), Data_Updater = N'${req.UserID}'
      , Data_Update = GetDate()
      where Debit_No = {Debit_No}
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

 //Get Sample Debit Note Detail Add List
 router.post('/Sample_Debit_Note_Detail_Add_List',  function (req, res, next) {
   console.log("Call Sample_Debit_Note_Detail_Add_List Api:",req.body);  
 
   req.body.Debit_No = req.body.Debit_No ? `N'${req.body.Debit_No.trim().replace(/'/g, "''")}'` : `''`;
 
   var strSQL = format(`
   Select cast(0 as bit) as flag, '' as Query, s.Shipment_NO, spd.Shipment_DetailID
   , sd.ProduceID, sd.Product_No, sd.Unit_Price, spd.Charge_Qty
   From Debit d with(NoLock,NoWait)
   Inner Join SPSP s with(NoLock,NoWait) on s.CustomerID = d.CustomerID And s.Season = d.Season And s.Currency = d.Currency
   Inner Join SPSP_Detail spd With(NoLock,NoWait) on spd.Shipment_NO = s.Shipment_NO
   Inner Join Sample_Detail sd with(NoLock,NoWait) on spd.Sample_Produce_DetailID = sd.Sample_Produce_DetailID
   Where d.Debit_No = {Debit_No}
   And Isnull(s.Debit_No,'') = ''      
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

//Get Samples Debit Note Info
router.post('/Sample_Debit_Note_Report_Info',  function (req, res, next) {
   console.log("Call Sample_Debit_Note_Report_Info Api:",req.body);  
 
   req.body.Mode = req.body.Mode ? req.body.Mode : 0;
   req.body.Debit_No = req.body.Debit_No ? `N'${req.body.Debit_No.trim().replace(/'/g, "''")}'` : `''`;
    
   //Mode == 0 Shipping Sheet Report
   var strSQL = format(`Declare @Mode int = {Mode}, @Debit_No Varchar(20) = {Debit_No}, @Total_Amount float
   , @Department nvarchar(20), @UserID nvarchar(20), @Approve_Date nvarchar(20), @Approve_First_Date nvarchar(20), @User_Compeleted_Date nvarchar(20)
   , @CEO nvarchar(255), @CEO_Approved_Date nvarchar(20)
   , @First_Level_Supervisor nvarchar(255), @First_Level_Supervisor_Approved_Date nvarchar(20)
   , @Department_Supervisor nvarchar(255), @Department_Supervisor_Approved_Date nvarchar(20)
   , @Section_Supervisor nvarchar(255), @Section_Supervisor_Approved_Date nvarchar(20)
   , @First_Level_Supervisor_Email nvarchar(255)
   , @Department_Supervisor_Email nvarchar(255)
   , @Section_Supervisor_Email nvarchar(255)
   , @User_Email nvarchar(255)
   , @CEO_Comment nvarchar(max)
   , @First_Level_Supervisor_Comment nvarchar(max)
   , @Department_Supervisor_Comment nvarchar(max)
   , @Section_Supervisor_Comment nvarchar(max)
   , @User_Comment nvarchar(max);

   Select @Department = Department, @UserID = UserID 
   , @User_Email = isnull((Select Email From Employee e with(NoLock,NoWait) where e.LoweredUserName = d.UserID) ,'')
   , @Approve_Date = isnull(Convert(varchar(20), [Approve_Date], 120),'')
   , @Approve_First_Date = isnull(Convert(varchar(20), [Approve_First_Date], 120),'')
   , @CEO = isnull([CEO],'')
   , @CEO_Approved_Date = isnull(Convert(varchar(20), [CEO_Approved_Date], 120),'')
   , @CEO_Comment = isnull(CEO_Comment, '')
   , @First_Level_Supervisor = isnull([First_Level_Supervisor],'')
   , @First_Level_Supervisor_Approved_Date = isnull(Convert(varchar(20), [First_Level_Supervisor_Approved_Date], 120),'')
   , @First_Level_Supervisor_Email = isnull((Select Email From Employee e with(NoLock,NoWait) where e.LoweredUserName = d.First_Level_Supervisor) ,'')
   , @First_Level_Supervisor_Comment = isnull(First_Level_Supervisor_Comment, '')
   , @Department_Supervisor = isnull([Department_Supervisor],'') 
   , @Department_Supervisor_Approved_Date = isnull(Convert(varchar(20), [Department_Supervisor_Approved_Date], 120),'')
   , @Department_Supervisor_Email = isnull((Select Email From Employee e with(NoLock,NoWait) where e.LoweredUserName = d.Department_Supervisor) ,'')
   , @Department_Supervisor_Comment  = isnull(Department_Supervisor_Comment, '')
   , @Section_Supervisor = isnull([Section_Supervisor],'')
   , @Section_Supervisor_Approved_Date = isnull(Convert(varchar(20), [Section_Supervisor_Approved_Date], 120),'')
   , @Section_Supervisor_Email = isnull((Select Email From Employee e with(NoLock,NoWait) where e.LoweredUserName = d.Section_Supervisor) ,'')
   , @Section_Supervisor_Comment  = isnull(Section_Supervisor_Comment, '')
   , @User_Comment = isnull(Memo, '')
   , @User_Compeleted_Date = isnull(Convert(varchar(20), [User_Compeleted_Date], 120),'')
   From Debit d Where d.Debit_No = @Debit_No

   Set @Total_Amount = isnull(
   (
      Select Sum( Floor( cast( case when @Mode = 3 then isnull(spd.[Qty],0) else isnull(spd.[Charge_Qty],0) end 
      * case when @Mode = 3 then isnull(spd.[Doc_Price],0) 
         else 
            case when @Mode = 4 then 
               (isnull(sd.[Unit_Price],0) - isnull(spd.[Doc_Price],0)) * isnull(s.Charge_Price_Rate,0)
            else 
               isnull(sd.[Unit_Price],0) * isnull(s.Charge_Price_Rate,0)
            End
         end 
      * (case when @Mode = 0 then -1 else 1 end) as money) * 100 ) / 100 ) 
      From spsp sp with(NoLock,NoWait)
      Inner Join SPSP_Detail spd with(NoLock, NoWait) on sp.Shipment_NO = spd.Shipment_No
      Left outer Join Sample_Detail sd with(NoLock, NoWait) on spd.Sample_Produce_DetailID = sd.Sample_Produce_DetailID
      Left outer Join Samples s with(NoLock, NoWait) on s.ProduceID = sd.ProduceID 
      Where sp.Debit_No = @Debit_No
   ),0) 
   + isnull(
   (
      SELECT Sum( Floor( cast( isnull(de.Qty,0) 
      * case when @Mode = 3 then isnull(de.Doc_Price,0) 
         else 
            case when @Mode = 4 then 
               isnull(de.[Unit_Price],0) - isnull(de.[Doc_Price],0)
            else 
               isnull(de.[Unit_Price],0) 
            End
         End 
      * (case when @Mode = 0 then -1 else 1 end) as money) * 100 ) / 100  ) 
      FROM Debit_Expense de with(NoLock, NoWait)
      Where de.Debit_No = @Debit_No
   ) ,0);

   --set @Total_Amount = Floor(@Total_Amount *100)/100

   SELECT s.[Debit_No]
   , s.[OrganizationID]
   , isnull(s.Approve,'') as Approve
   , s.[Currency]
   , cr.Currency_Symbol
   , cr.en as Currency_en
   , s.[Season]
   , s.[Messrs]
   , s.[Messrs_Address]
   , Convert(varchar(10),s.[Debit_Date],111) as [Debit_Date]
   , c.Contact
   , c.Work_Phone 
   , s.[Express_No]
   , s.[Beneficiary]
   , p.[E_Name] as Beneficiary_Name
   , p.[E_Address] as Beneficiary_Address
   , s.[Advising_Bank]
   , b.[E_Name] as Advising_Bank_Name
   , b.[E_Address] as Advising_Bank_Address
   , b.[Account_No] as Advising_Account_No
   , case 
         when @Mode = 0 then 'Credit Note' 
         when @Mode = 1 then 'Debit Note' 
         when @Mode = 2 then 'Invoice' 
         when @Mode = 3 then 'Invoice'
         when @Mode = 4 then 'Invoice' 
     End as Debit_Doc_Title
   , s.[Payment_Term]
   , s.[Commodity]
   , dbo.RecurseNumber(@Total_Amount) as EngNum_TTL_Amount
   , s.[Payment_Term_Debit]
   , s.[Remark]
   , @Department as Department
   , @UserID as Report_Maker
   , @Approve_Date as Approve_Date
   , @Approve_First_Date as Approve_First_Date
   , @CEO as CEO
   , @CEO_Approved_Date as CEO_Approved_Date
   , @CEO_Comment as CEO_Comment
   , @First_Level_Supervisor as First_Level_Supervisor
   , @First_Level_Supervisor_Approved_Date as First_Level_Supervisor_Approved_Date
   , @First_Level_Supervisor_Comment as First_Level_Supervisor_Comment
   , @Department_Supervisor as Department_Supervisor
   , @Department_Supervisor_Approved_Date as Department_Supervisor_Approved_Date
   , @Department_Supervisor_Comment as Department_Supervisor_Comment
   , @Section_Supervisor as Section_Supervisor
   , @Section_Supervisor_Approved_Date as Section_Supervisor_Approved_Date
   , @Section_Supervisor_Comment as Section_Supervisor_Comment
   , @User_Comment as User_Comment
   , @First_Level_Supervisor_Email as First_Level_Supervisor_Email
   , @Department_Supervisor_Email as Department_Supervisor_Email
   , @Section_Supervisor_Email as Section_Supervisor_Email
   , @User_Email as User_Email
   , @User_Compeleted_Date as User_Compeleted_Date
   FROM Debit s WITH (NoLock, NoWait)
   Left Outer Join [dbo].[Customer_Contacts] c WITH (NoLock, NoWait) on s.ContactID = c.ContactID
   Left Outer Join [dbo].[Bank] b with(NoLock,NoWait) on b.BankID = s.Advising_Bank
   Left Outer Join [dbo].[Credit_Accounts] p WITH (NoWait, Nolock) on p.AccountID = s.Beneficiary
   Left Outer Join Currency cr WITH (NoWait, Nolock) on s.Currency = cr.Currency
   WHERE Debit_No = @Debit_No;

   Select sd.[ProduceID]
   , s.[Brand]
   , sd.[Product_No]
   , p.[Name] as [Shose_Name]
   , p.[Color]
   , ct.Sample_Type as [Sample_Name]
   , ct.Sample_Type
   , isnull(spd.[Qty],0) as Qty   
   , case when @Mode = 3 then isnull(spd.[Qty],0) else isnull(spd.[Charge_Qty],0) end as Charge_Qty
   , isnull(spd.[Doc_Price],0) * (case when @Mode = 0 then -1 else 1 end) as Doc_Price
   , Floor( cast( isnull(spd.Qty,0) * isnull(spd.Doc_Price,0) * (case when @Mode = 0 then -1 else 1 end) as money) * 100 ) / 100  AS Ship_Amount
   , case when @Mode = 3 then isnull(spd.[Doc_Price],0) 
      else 
         case when @Mode = 4 then 
            (isnull(sd.[Unit_Price],0) - isnull(spd.[Doc_Price],0)) * isnull(s.Charge_Price_Rate,0)
         else 
            isnull(sd.[Unit_Price],0) * isnull(s.Charge_Price_Rate,0)
         end
      end 
      * (case when @Mode = 0 then -1 else 1 end) as Unit_Price
   , Floor( cast( case when @Mode = 3 then isnull(spd.[Qty],0) else isnull(spd.[Charge_Qty],0) end 
      * case when @Mode = 3 then isnull(spd.[Doc_Price],0) 
      else 
         case when @Mode = 4 then 
            (isnull(sd.[Unit_Price],0) - isnull(spd.[Doc_Price],0)) * isnull(s.Charge_Price_Rate,0)
         else 
            isnull(sd.[Unit_Price],0) * isnull(s.Charge_Price_Rate,0)
         End      
      end 
      * (case when @Mode = 0 then -1 else 1 end) as money) * 100 ) / 100 AS Charge_Amount
   --, cast(isnull(spd.Charge_Qty / nullif(spd.[Qty],0),0 ) * 100 as int) as Charge_Rate 
   , isnull(s.Charge_Price_Rate,0) * 100 as Charge_Rate 
   , spd.[Remark]
   , sd.[Produce_No]
   From spsp sp with(NoLock,NoWait)
   Inner Join SPSP_Detail spd with(NoLock, NoWait) on sp.Shipment_NO = spd.Shipment_No
   Left outer Join Sample_Detail sd with(NoLock, NoWait) on spd.Sample_Produce_DetailID = sd.Sample_Produce_DetailID
   Left outer Join Product p with(NoLock,NoWait) on p.Product_No = sd.Product_No
   Left outer Join Samples s with(NoLock, NoWait) on s.ProduceID = sd.ProduceID       
   LEFT OUTER Join Sample_Type ct on ct.Sample_TypeID = sd.Sample_TypeID
   Where sp.Debit_No = @Debit_No
   Order by sd.ProduceID, s.[Brand], sd.Product_No;

   SELECT de.Description
   , isnull(de.Qty,0) AS Qty
   , isnull(de.Doc_Price,0) * (case when @Mode = 0 then -1 else 1 end) AS Doc_Price
   , Floor( cast( isnull(de.Qty,0) * isnull(de.Doc_Price,0) * (case when @Mode = 0 then -1 else 1 end) as money ) * 100 ) / 100  AS Amount
   , case when @Mode = 3 then isnull(de.Doc_Price,0) 
      else 
         case when @Mode = 4 then 
            isnull(de.Unit_Price,0) - isnull(de.Doc_Price,0) 
         else 
            isnull(de.Unit_Price,0) 
         End
      End 
      * (case when @Mode = 0 then -1 else 1 end) AS Unit_Price
   , Floor( Cast( isnull(de.Qty,0) 
      * case when @Mode = 3 then isnull(de.Doc_Price,0)    
         else 
            case when @Mode = 4 then 
               isnull(de.Unit_Price,0) - isnull(de.Doc_Price,0)
            else 
               isnull(de.Unit_Price,0)
            End
         End 
      * (case when @Mode = 0 then -1 else 1 end) as money) * 100 ) / 100 AS Unit_Amount
   , de.Remark
   FROM Debit_Expense de with(NoLock, NoWait)
   Where de.Debit_No = @Debit_No;

   --3 Money Source: Payment_Term
   -- select CASE WHEN m.Payment_Term IS NULL THEN dbo.Get_Payment_Term('', m.Type, m.Days, m.By_Doc_Rcv) ELSE m.Payment_Term END + ' ' + p.Currency + ' ' + FORMAT(Round(m.Deposit * (case when ABS(isnull(p.IsCredit_Note,0)) = 1 then -1 else 1 end), case when p.Currency = 'TWD' then 0 else 2 end), '#,###.00')  as Payment_Term
   Select iif(ABS(isnull(p.IsCredit_Note,0))=1, m.Type, m.Payment_Term) + ' ' + p.Currency + ' ' 
    + FORMAT(Round(m.Deposit * (case when ABS(isnull(p.IsCredit_Note,0)) = 1 then -1 else 1 end), case when p.Currency = 'TWD' then 0 else 2 end), '#,###.00')  as Payment_Term
   from Money_Source m With(NoLock,NoWait)
   Inner Join Debit p With(NoLock,NoWait) on m.Source_No = p.Debit_No
   where m.Source_No = @Debit_No and m.Subject = 'Debit RCV';
   `, req.body) ;    
   //console.log(strSQL)
   db.sql(req.SiteDB, strSQL)
      .then((result) => {         
         var DataSet = {Report_Info: result.recordsets[0]            
            , Report_Detail_Head: []
            , Report_Detail: result.recordsets[1]
            , Report_Expense: result.recordsets[2]
            , Payment_Term: result.recordsets[3]
            , OrganizationID: result.recordsets[0][0].OrganizationID
            , Approve: result.recordsets[0][0].Approve
            , Beneficiary_Name: result.recordsets[0][0].Beneficiary_Name
            , Debit_Doc_Title: result.recordsets[0][0].Debit_Doc_Title
            , Payment_Term_Debit: result.recordsets[0][0].Payment_Term_Debit
            , Currency_Symbol: result.recordsets[0][0].Currency_Symbol
            , Currency_en: result.recordsets[0][0].Currency_en
            , EngNum_TTL_Amount: result.recordsets[0][0].EngNum_TTL_Amount
            , G_Detail_Total: {Qty:0, Amount:0}
            , G_Expense_Total: {Qty:0, Amount:0}
            , G_Total_Qty:0
            , G_Total_Amount:0
         };
        
         DataSet.Report_Detail.forEach((item)=>{
            DataSet.G_Detail_Total.Qty += item.Charge_Qty;
            item.Charge_Amount = Math.round(item.Charge_Amount * 10000)/10000;
            DataSet.G_Detail_Total.Amount += item.Charge_Amount;            
         })
         
         DataSet.Report_Detail_Head = [...DataSet.Report_Detail.reduce((r, e) => {
            let k = `${e.ProduceID}`;
            if (!r.has(k)) {
              // console.log(r)
              r.set(k, { ProduceID: e.ProduceID,
               G_Sub_Total_Qty: e.Charge_Qty,
               G_Sub_Total_Amount: e.Charge_Amount
              })
            } else {
               r.get(k).G_Sub_Total_Qty += e.Charge_Qty;
               r.get(k).G_Sub_Total_Amount += e.Charge_Amount;
            }
            return r;
          }, new Map).values()]


         DataSet.Report_Detail_Head.forEach((item)=>{
            item.G_Sub_Total_Qty = Math.round(item.G_Sub_Total_Qty * 10000)/10000;
            item.G_Sub_Total_Amount = Math.round(item.G_Sub_Total_Amount * 10000)/10000;
         })

         DataSet.Report_Expense.forEach((item)=>{
            item.Unit_Amount = Math.round(item.Unit_Amount * 10000)/10000;
            DataSet.G_Expense_Total.Qty += item.Qty;
            DataSet.G_Expense_Total.Amount += item.Unit_Amount;
         })

         DataSet.G_Total_Qty = DataSet.G_Detail_Total.Qty + DataSet.G_Expense_Total.Qty;
         DataSet.G_Total_Amount = Math.round((DataSet.G_Detail_Total.Amount + DataSet.G_Expense_Total.Amount) * 10000)/10000;
         DataSet.G_Detail_Total.Amount = Math.round(DataSet.G_Detail_Total.Amount * 10000)/10000
         DataSet.G_Expense_Total.Amount = Math.round(DataSet.G_Expense_Total.Amount * 10000)/10000

      //console.log(DataSet)
         res.send(DataSet);
      }).catch((err) => {
         console.log(err);
         res.status(500).send(err);
      })
});


/* Mark-Wang API End */


/* Darren-Chang API Begin */

router.post('/ChkApprove', function (req, res, next) {
  console.log("Call Debit ChkApprove Api Approve ID:", req.body);

  req.body.Mode = req.body.Mode ? req.body.Mode : 0;
  req.body.WebServer = req.body.WebServer ? `N'${req.body.WebServer.trim()}'` : `'ERP'`;
  req.body.Debit_No = req.body.Debit_No ? `N'${req.body.Debit_No.trim().replace(/'/g, "''")}'` : `''`;

  let strSQL = format(`Declare @Approve bit = convert(bit,'{Value}'),  @Flag int;`, req.body);

  switch (req.body.Mode) {
    case 0:
      strSQL += format(`
        Update Debit Set 
        CEO_Approved_Date = case when @Approve = 1 then CEO_Approved_Date else null end
        , CEO = case when @Approve = 1 then CEO else null end
        , First_Level_Supervisor_Approved_Date = case when @Approve = 1 then GetDate() else null end
        , First_Level_Supervisor = case when @Approve = 1 then N'${req.UserID}' else null end
        , Approve_Date = case when @Approve = 1 then GetDate() else null end
        , Approve = case when @Approve = 1 then N'${req.UserID}' else null end
        , Approve_First_Date = isnull(Approve_First_Date, GetDate()) 
        , Department_Supervisor = case when @Approve = 1 then Department_Supervisor else null end
        , Department_Supervisor_Approved_Date = case when @Approve = 1 then Department_Supervisor_Approved_Date else null end
        , Section_Supervisor = case when @Approve = 1 then Section_Supervisor else null end
        , Section_Supervisor_Approved_Date = case when @Approve = 1 then Section_Supervisor_Approved_Date else null end  
        , User_Compeleted_Date = case when @Approve = 1 then User_Compeleted_Date else null end      
        Where Debit_No = {Debit_No}
        And Department_Supervisor is not null;
      `, req.body);
      break;
    case 1:
      strSQL += format(` 
        Update Debit Set Department_Supervisor_Approved_Date = case when @Approve = 1 then GetDate() else null end
        , Department_Supervisor = case when @Approve = 1 then N'${req.UserID}' else null end
        , Approve = CASE WHEN @Approve = 1 AND isnull(IsCredit_Note, 0) = 0 THEN N'${req.UserID}' ELSE NULL END
        Where Debit_No = {Debit_No} 
        And First_Level_Supervisor is null;
        -- And Section_Supervisor is not null;
      `, req.body);
      break;
    case 2:
      strSQL += format(` 
        Update Debit Set Section_Supervisor_Approved_Date = case when @Approve = 1 then GetDate() else null end
        , Section_Supervisor = case when @Approve = 1 then N'${req.UserID}' else null end
        Where Debit_No = {Debit_No} 
        And First_Level_Supervisor is null 
        -- And Department_Supervisor is null
        And User_Compeleted_Date is not null;
      `, req.body);
      break;
    case 3:
      strSQL += format(` 
        Update Debit Set CEO_Approved_Date = case when @Approve = 1 then GetDate() else null end
        , CEO = case when @Approve = 1 then N'${req.UserID}' else null end
        Where Debit_No = {Debit_No} 
        And First_Level_Supervisor is not null;
      `, req.body);
      break;
    case 4:
      strSQL += format(` 
        Update Debit Set User_Compeleted_Date = case when @Approve = 1 then GetDate() else null end
        Where Debit_No = {Debit_No};
      `, req.body);
      break;
  }

  strSQL += format(` 
    Set @Flag = @@ROWCOUNT;
        
    Select case when @Flag > 0 then 1 else 0 end as Break_count
    , isnull(convert(varchar(20),p.Approve_Date,120),'') as Approve_Date
    , isnull(convert(varchar(20),p.Approve_First_Date,120),'') as Approve_First_Date
    , isnull(CEO,'') as CEO
    , isnull(convert(varchar(20),p.CEO_Approved_Date,120),'') as CEO_Approved_Date
    , isnull(First_Level_Supervisor,'') as First_Level_Supervisor
    , isnull(convert(varchar(20),p.First_Level_Supervisor_Approved_Date,120),'') as First_Level_Supervisor_Approved_Date
    , isnull(Department_Supervisor,'') as Department_Supervisor
    , isnull(convert(varchar(20),p.Department_Supervisor_Approved_Date,120),'') as Department_Supervisor_Approved_Date
    , isnull(Section_Supervisor,'') as Section_Supervisor
    , isnull(convert(varchar(20),p.Section_Supervisor_Approved_Date,120),'') as Section_Supervisor_Approved_Date
    , isnull(Convert(varchar(20), p.[User_Compeleted_Date], 120),'') as User_Compeleted_Date
    , isnull((Select Email From Employee e with(NoLock,NoWait) where e.LoweredUserName = p.UserID) ,'') as User_Email
    , isnull((Select Email From Employee e with(NoLock,NoWait) where e.LoweredUserName = p.First_Level_Supervisor) ,'') as First_Level_Supervisor_Email
    , isnull((Select Email From Employee e with(NoLock,NoWait) where e.LoweredUserName = p.Department_Supervisor) ,'') as Department_Supervisor_Email
    , isnull((Select Email From Employee e with(NoLock,NoWait) where e.LoweredUserName = p.Section_Supervisor) ,'') as Section_Supervisor_Email
    From Debit p with(NoLock,NoWait) 
    Where p.Debit_No = {Debit_No};
   `, req.body);

  // console.log(strSQL);
  db.sql(req.SiteDB, strSQL)
    .then((result) => {
      //console.log('Dataset:',result.recordset)
      res.send(result.recordset);
    }).catch((err) => {
      console.log(err);
      res.status(500).send(err);
    })
});

// Maintain Credit Note Comment
router.post('/CN_Comment_Maintain', function (req, res, next) {
  console.log("Call CN_Comment_Maintain Api:", req.body);
  var strSQL = "";

  req.body.Debit_No = req.body.Debit_No ? `N'${req.body.Debit_No.trim().replace(/'/g, "''")}'` : `''`;
  // req.body.Mode === 0 表示新增 
  // req.body.Mode === 1 表示修改 
  // req.body.Mode === 2 表示刪除

  switch (req.body.Mode) {
    case 0:
      break;
    case 1:
      var fieldSize = 0;
      switch (req.body.Name) {
        case 'CEO_Comment':
        case 'First_Level_Supervisor_Comment':
        case 'Department_Supervisor_Comment':
        case 'Section_Supervisor_Comment':
        case 'Memo':
          fieldSize = 65535;
          break;
      }
      req.body.Value = fieldSize > 0 ? (req.body.Value ? `N'${req.body.Value.trim().substring(0, fieldSize).replace(/'/g, "''")}'` : `''`) : req.body.Value;

      strSQL = format(`
        Update [dbo].[Debit] Set [{Name}] = {Value}
        where Debit_No = {Debit_No} ;
      `, req.body);

      break;
    case 2:
      break;
  }

  strSQL += format(`
    Select @@ROWCOUNT as Flag;
  `, req.body);

  // console.log(strSQL)
  db.sql(req.SiteDB, strSQL)
    .then((result) => {
      res.send({ Flag: result.recordsets[0][0].Flag > 0, Debit_No: result.recordsets[0][0].Debit_No });
    }).catch((err) => {
      console.log(err);
      res.status(500).send(err);
    })
});
/* Darren-Chang API End */

module.exports = router;