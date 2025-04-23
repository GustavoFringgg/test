var express = require('express');
var router = express.Router();
const format = require('string-format');
var db = require('../../config/DB_Connect');


//Get Supplier_List
router.post('/Supplier_List',  function (req, res, next) {
    console.log("Call Supplier_List Api:");
    
    req.body.SupplierID = req.body.SupplierID ? `${req.body.SupplierID.trim().substring(0,15).replace(/'/g, '')}` : '';
    req.body.AccountID = req.body.AccountID ? `${req.body.AccountID.trim().substring(0,3).replace(/'/g, '')}` : '';
    req.body.Uni_Tax_Code = req.body.Uni_Tax_Code ? `${req.body.Uni_Tax_Code.trim().substring(0,30).replace(/'/g, '')}` : '';
    req.body.Supplier_Name = req.body.Supplier_Name ? `${req.body.Supplier_Name.trim().substring(0,50).replace(/'/g, '')}` : '';
    req.body.Phone_Number = req.body.Phone_Number ? `${req.body.Phone_Number.trim().substring(0,30).replace(/'/g, '')}` : '';
    req.body.Fax_Number = req.body.Fax_Number ? `${req.body.Fax_Number.trim().substring(0,30).replace(/'/g, '')}` : '';
    req.body.Supply_Product = req.body.Supply_Product ? `${req.body.Supply_Product.trim().replace(/'/g, '')}` : '';
    req.body.Payment_Terms = req.body.Payment_Terms ? `${req.body.Payment_Terms.trim().replace(/'/g, '')}` : '';
    req.body.Sample_Discount = req.body.Sample_Discount ? `${req.body.Sample_Discount.trim().replace(/'/g, '')}` : '';
    req.body.Address = req.body.Address ? `${req.body.Address.trim().substring(0,150).replace(/'/g, '')}` : '';
    req.body.Country = req.body.Country ? `${req.body.Country.trim().substring(0,20).replace(/'/g, '')}` : '';
    req.body.Purchase_Responsible = req.body.Purchase_Responsible ? `${req.body.Purchase_Responsible.replace(/'/g, '')}` : '';
 
    var strSQL = format(`
    SELECT Top 1000 row_number() Over(Order By SupplierID desc) as RecNo
    , [SupplierID]
    , [AccountID]
    , [Uni_Tax_Code]    
    , [Supplier_Name]
    , [Phone_Number]
    , [Fax_Number]
    , [Supply_Product]
    , [Sample_Discount]
    , [Payment_Terms]
    , [Address]
    , [Country]
    , pr.Purchase_Responsible
    FROM [dbo].[Supplier] s With(Nolock,NoWait)
    Inner Join Purchase_Responsible pr With(Nolock,NoWait) on pr.Purchase_ResponsibleID = s.Purchase_ResponsibleID
    where (N'{SupplierID}' = '' or [SupplierID] like N'{SupplierID}%')
    And (N'{AccountID}' = '' or [AccountID] like N'%{AccountID}%')
    And (N'{Uni_Tax_Code}' = '' or [Uni_Tax_Code] like N'%{Uni_Tax_Code}%')    
    And (N'{Supplier_Name}' = '' or [Supplier_Name] like N'%{Supplier_Name}%')
    And (N'{Phone_Number}' = '' or [Phone_Number] like N'%{Phone_Number}%')
    And (N'{Fax_Number}' = '' or [Fax_Number] like N'%{Fax_Number}%')
    And (N'{Supply_Product}' = '' or cast([Supply_Product] as nvarchar) like N'%{Supply_Product}%')
    And (N'{Payment_Terms}' = '' or cast([Payment_Terms] as nvarchar) like N'%{Payment_Terms}%')
    And (N'{Sample_Discount}' = '' or cast([Sample_Discount] as nvarchar) like N'%{Sample_Discount}%')
    And (N'{Address}' = '' or [Address] like N'{Address}%')
    And (N'{Country}' = '' or [Country] like N'%{Country}%')
    And (N'{Purchase_Responsible}' = '' or pr.Purchase_Responsible like N'%{Purchase_Responsible}%')
    And (isnull(Delete_Flag,0) = 0)
    Order By SupplierID
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
 
//Check Su. Code
router.post('/Check_AccountID',  function (req, res, next) {
   console.log("Call Check_AccountID Api:",req.body);

   req.body.Check_AccountID = req.body.Check_AccountID ? `${req.body.Check_AccountID.trim().toUpperCase().substring(0,3).replace(/'/g, '')}` : '';

   var strSQL = format(`
   SELECT Count(*) as RecCount
   FROM [dbo].[Supplier] With(Nolock,NoWait)
   where ([Check_AccountID] = N'{Check_AccountID}')
   `, req.body) ;
   // console.log(strSQL)
   db.sql(req.Enterprise, strSQL)
      .then((result) => {
         //console.log(result.recordset[0].RecCount <= 0)
         res.send({Flag: result.recordset[0].RecCount <= 0});
      }).catch((err) => {
         console.log(err);
         res.status(500).send(err);
      })

});

//Check SupplierID
router.post('/Check_SupplierID',  function (req, res, next) {
   console.log("Call Check_SupplierID Api:",req.body);

   req.body.SupplierID = req.body.SupplierID ? `${req.body.SupplierID.trim().toUpperCase().substring(0,15).replace(/'/g, '')}` : '';

   var strSQL = format(`
   SELECT Count(*) as RecCount
   FROM [dbo].[Supplier] With(Nolock,NoWait)
   where ([SupplierID] = N'{SupplierID}')
   `, req.body) ;
   // console.log(strSQL)
   db.sql(req.Enterprise, strSQL)
      .then((result) => {
         //console.log(result.recordset[0].RecCount <= 0)
         res.send({Flag: result.recordset[0].RecCount <= 0});
      }).catch((err) => {
         console.log(err);
         res.status(500).send(err);
      })

});

//Get Su_Code_Info
router.post('/Su_Code_Info',  function (req, res, next) {
   console.log("Call Su_Code_Info Api:",req.body);

   var strSQL = format(`
      Select [AccountID]
      from Supplier o with(NoLock,NoWait)
      Order by [AccountID] Desc;
   `, req.body) ;
   //console.log(strSQL)
   db.sql(req.Enterprise, strSQL)
      .then((result) => {
         res.send(result.recordsets[0]);
      }).catch((err) => {
         console.log(err);
         res.status(500).send(err);
      })

});

//Get Supplier_Info
router.post('/Supplier_Info',  function (req, res, next) {
   console.log("Call Supplier_Info Api:",req.body);

   req.body.SupplierID = req.body.SupplierID ? `N'${req.body.SupplierID.trim().substring(0,15).replace(/'/g, "''")}'` : `''`; 

   //Mode == 0 Get Supplier , Contacts And Client Data
   //Mode == 1 Get Supplier Data
   //Mode == 2 Get Supplier Contacts Data

   var strSQL = format(`
   Declare @Mode int = {Mode}
   Declare @SupplierID nVarchar(15) = {SupplierID}
      
   --0 Get Supplier All Data
   --1 Get Supplier Master Data
   if(@Mode = 0 or @Mode = 1)
   Begin
      Select o.[SupplierID]
      ,[AccountID]
      ,[Uni_Tax_Code]
      ,[Supplier_Name]
      ,[Chairman]
      ,[Supply_Product]
      ,[Sample_Discount]
      ,[Phone_Number]
      ,[Fax_Number]
      ,[Payment_Terms]
      ,[Address]
      ,[City]
      ,[Postal_Code]
      ,[Region]
      ,[Country]
      ,o.[Memo]
      ,[Employees]
      ,o.Purchase_ResponsibleID
      ,pr.Purchase_Responsible
      ,[Selected]     
      , ABS(cast([Internal] as int)) as Internal
      ,[UserID]
      ,[Data_Updater] 
      ,convert(varchar(10),[Data_Update],111) as [Data_Update]
      ,convert(varchar(10),[Create_Date],111) as [Create_Date]
      , case when isnull(o.History_Date,'') = '' then 0 else 1 end as History_Chk
      , case when o.History_Date is null then '' else convert(varchar(10), o.[History_Date],111) End as [History_Date]
      , case when (Select count(*) From Material_Color mc with(NoLock,NoWait) Where mc.SupplierID = @SupplierID ) = 0 
      and (Select count(*) From Product_Structure ps with(NoLock,NoWait) Where ps.SupplierID = @SupplierID ) = 0 then 1 else 0 end as Used_Flag
      from Supplier o with(NoLock,NoWait)
      Inner Join Purchase_Responsible pr with(NoLock,NoWait) on o.Purchase_ResponsibleID = pr.Purchase_ResponsibleID
      Where o.SupplierID = @SupplierID;
   End
   
   --2 Get Supplier Contacts Data
   if(@Mode = 0 or @Mode = 2)
   Begin   
      Select row_number() Over(Order By c.[SortID]) as RecNo
      ,[ContactID]
      ,[SortID]
      ,[SupplierID]
      ,[Name]
      ,[Contact]
      ,[Contact_Title]
      ,[Sex]
      ,[Work_Phone]
      ,[Fax_Number]
      ,[Email]
      ,[Memo]
      ,[Selected]
      from Supplier_Contacts c with(NoLock,NoWait)
      Where SupplierID = @SupplierID ;
   End 
   
   `, req.body) ;
   //console.log(strSQL)
   db.sql(req.Enterprise, strSQL)
      .then((result) => {
         var DataSet = {
            Supplier_Info: (req.body.Mode == 0 || req.body.Mode == 1) ? result.recordsets[0] : []
            , Supplier_Contacts_Info: (req.body.Mode == 0) ? result.recordsets[1] : (req.body.Mode == 2 ? result.recordsets[0] : [])
         }
         res.send(DataSet);
      }).catch((err) => {
         console.log(err);
         res.status(500).send(err);
      })

});

//Maintain Supplier
router.post('/Supplier_Maintain',  function (req, res, next) {
   console.log("Call Supplier_Maintain Api:",req.body);

   // req.body.Mode === 0 表示新增
   // req.body.Mode === 1 表示修改 
   // req.body.Mode === 2 表示刪除   
   req.body.SupplierID = req.body.SupplierID ? `N'${req.body.SupplierID.trim().substring(0,15).replace(/'/g, "''")}'` : `''`;
  
   var strSQL = 'Declare @ROWCOUNT int '
   switch(req.body.Mode){
      case 0:
         req.body.AccountID = req.body.AccountID ? `N'${req.body.AccountID.trim().toUpperCase().substring(0,3).replace(/'/g, "''")}'` : `''`;
         strSQL += format(`
            Insert into [dbo].[Supplier] (SupplierID, AccountID, Purchase_ResponsibleID, Internal, Country, UserID, Data_Update, Data_Updater)
            Select Upper({SupplierID}) as SupplierID, {AccountID} as AccountID, 0 as Purchase_ResponsibleID, 0 as Internal, 'TAIWAN' as Country, N'${req.UserID}' as UserID, GetDate() as [Data_Update], N'${req.UserID}' as Data_Updater 
            Where ( SELECT Count(*) as RecCount FROM [dbo].[Supplier] With(Nolock,NoWait) where [SupplierID] = {SupplierID} ) = 0 ;
            Set @ROWCOUNT = @@ROWCOUNT;
         `, req.body);
         break;
      case 1: 
         var Size = 0;
         switch(req.body.Name){
            case 'SupplierID':
               Size = 15;
            break;
            case 'AccountID':
               Size = 3;
               req.body.Value = req.body.Value.toUpperCase()
            break;
            case 'Chairman':
            case 'Uni_Tax_Code':
            case 'Phone_Number':
            case 'Fax_Number':
                  Size = 30;
            break;
            case 'Supplier_Name':
            case 'Region':
            case 'City':
            case 'Payment_Terms':
               Size = 50;
            break;
            case 'Postal_Code':
            case 'Country':
               Size = 20;
            break;
            case 'Address':
               Size = 256;
            break;
            case 'Supply_Product':
            case 'Sample_Discount':
            case 'Memo':               
               Size = 65535;
            break;
            default:
            break;
         }
         req.body.Value = Size == 0 ? (req.body.Value ? req.body.Value : null) : (req.body.Value ? `N'${req.body.Value.trim().replace(/'/g, "''")}'` : `''`);
         if(req.body.Name == 'History_Date' ) {
            req.body.Value = req.body.Value ? `'${req.body.Value}'` : `null`;
         }

         strSQL += format(`
            Update [dbo].[Supplier] Set [{Name}] = ${Size == 0 ? '{Value}': `substring({Value},1,${Size})`}
            , UserID = isnull(UserID, N'${req.UserID}')
            , Data_Updater = N'${req.UserID}'
            , Data_Update = GetDate()
            where SupplierID = {SupplierID}
            ${ req.body.Name === 'SupplierID' ? ` And (SELECT Count(*) as RecCount FROM Supplier as p WITH (NoWait, Nolock) Where p.SupplierID = {Value}) = 0 
            And (Select count(*) From Material_Color mc with(NoLock,NoWait) Where mc.SupplierID = {SupplierID}) = 0 
            And (Select count(*) From Product_Structure ps with(NoLock,NoWait) Where ps.SupplierID = {SupplierID}) = 0` : "" }
            ${ req.body.Name === 'AccountID' ? ` And (SELECT Count(*) as RecCount FROM Supplier as p WITH (NoWait, Nolock) Where p.AccountID = {Value}) = 0 ` : "" }
            Set @ROWCOUNT = @@ROWCOUNT;
         `, req.body);
         break;
      case 2:
         strSQL += format(`
         /*
            Delete FROM [dbo].[Supplier] 
            where SupplierID = {SupplierID}
            And ( Select Count(*) From Material_Color mc with(NoLock,NoWait) where mc.SupplierID = {SupplierID} ) = 0
            And ( Select Count(*) From Product_Structure ps with(NoLock,NoWait) where ps.SupplierID = {SupplierID} ) = 0 ; 
         */

            Update Supplier set Delete_Flag = 1
            , Data_Updater = N'${req.UserID}'
            , Data_Update = GetDate()
            FROM [dbo].[Supplier] 
            where SupplierID = {SupplierID}
            And ( Select Count(*) From Material_Color mc with(NoLock,NoWait) where mc.SupplierID = {SupplierID} ) = 0
            And ( Select Count(*) From Product_Structure ps with(NoLock,NoWait) where ps.SupplierID = {SupplierID} ) = 0 ;  

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

//Maintain Supplier_Contacts
router.post('/Supplier_Contacts_Maintain',  function (req, res, next) {
   console.log("Call Supplier_Contacts_Maintain Api:",req.body);

   // req.body.Mode === 0 表示新增
   // req.body.Mode === 1 表示修改 
   // req.body.Mode === 2 表示刪除
   var Size = 0;
   req.body.SupplierID = req.body.SupplierID ? `N'${req.body.SupplierID.trim().substring(0,15).replace(/'/g, "''")}'` : `''`; 

   if(req.body.Mode === 0) {
      req.body.Name = req.body.Name ? `N'${req.body.Name.trim().substring(0,20).replace(/'/g, "''")}'` : `''`; 
      req.body.Contact = req.body.Contact ? `N'${req.body.Contact.trim().substring(0,50).replace(/'/g, "''")}'` : `''`; 
      req.body.Contact_Title = req.body.Contact_Title ? `N'${req.body.Contact_Title.trim().substring(0,30).replace(/'/g, "''")}'` : `''`; 
      req.body.Sex = req.body.Sex ? `N'${req.body.Sex.trim().substring(0,5).replace(/'/g, "''")}'` : `''`; 
      req.body.Work_Phone = req.body.Work_Phone ? `N'${req.body.Work_Phone.trim().substring(0,60).replace(/'/g, "''")}'` : `''`; 
      req.body.Fax_Number = req.body.Fax_Number ? `N'${req.body.Fax_Number.trim().substring(0,30).replace(/'/g, "''")}'` : `''`; 
      req.body.Email = req.body.Email ? `N'${req.body.Email.trim().substring(0,50).replace(/'/g, "''")}'` : `''`; 
   }

   if(req.body.Mode === 1 && 
      ( req.body.Name == 'Name' 
      || req.body.Name == 'Contact' || req.body.Name == 'Contact_Title'
      || req.body.Name == 'Sex' || req.body.Name == 'Work_Phone' || req.body.Name == 'Fax_Number'
      || req.body.Name == 'Email' || req.body.Name == 'Memo'  )
      ) {
      switch(req.body.Name){
         case 'Name':
            Size = 20;
         break;
         case 'Contact':
            Size = 50;
         break;
         case 'Contact_Title':
            Size = 20;
         break;
         case 'Sex':
               Size = 5;
         break;
         case 'Work_Phone':
               Size = 60;
         break;
         case 'Fax_Number':
            Size = 30;
         break;
         case 'Email':
               Size = 50;
         break;
      }
      req.body.Value = req.body.Value ? `N'${req.body.Value.trim().replace(/'/g, "''")}'` : `''`;      
   }
   
   var strSQL = 'Declare @ROWCOUNT int; '
   switch(req.body.Mode){
      case 0:
         strSQL += format(`
            Insert into [dbo].[Supplier_Contacts] ([SortID],[SupplierID]
               ,[Name], [Contact], [Contact_Title], [Sex]
               ,[Work_Phone], [Fax_Number], [Email], [Memo]
               ,[Selected])
            Select 0 as [SortID], {SupplierID} as [SupplierID]
               , {Name} as [Name], {Contact} as [Contact], {Contact_Title} as [Contact_Title], {Sex} as [Sex]
               , {Work_Phone} as [Work_Phone], {Fax_Number} as [Fax_Number], {Email} as [Email], null as [Memo]
               , 0 as [Selected];
            Set @ROWCOUNT = @@ROWCOUNT;
         `, req.body);
         break;
      case 1:        
         strSQL += format(`
            Update [dbo].[Supplier_Contacts] Set [{Name}] = ${Size == 0 ? '{Value}': `substring({Value},1,${Size})`}
            where ContactID = {ContactID};
            Set @ROWCOUNT = @@ROWCOUNT;
         `, req.body);
         break;
      case 2:
         strSQL += format(`
            Delete FROM [dbo].[Supplier_Contacts] 
            where ContactID = {ContactID}; 
            Set @ROWCOUNT = @@ROWCOUNT;
         `, req.body);
         break;
   }

   strSQL += format(`
   Select @ROWCOUNT as Flag;

   if(@ROWCOUNT > 0)
   begin
      Update Supplier set
         UserID = isnull(UserID, N'${req.UserID}')
         , Data_Updater = N'${req.UserID}'
         , Data_Update = GetDate()
      Where SupplierID = {SupplierID}
   End
   `, req.body);
   // console.log(strSQL)
   db.sql(req.Enterprise, strSQL)
      .then((result) => {
         //console.log(result.recordsets[0])
         res.send({Flag:result.recordsets[0][0].Flag > 0});
      }).catch((err) => {
         console.log(err);
         res.status(500).send(err);
      })
});



 module.exports = router;