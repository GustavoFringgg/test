var express = require('express');
var router = express.Router();
const format = require('string-format');
var db = require('../../config/DB_Connect');


//Get Funds_Request_List
router.post('/Funds_Request_List',  function (req, res, next) {
    console.log("Call Funds_Request_List Api:",req.body);
    
    req.body.Funds_RequestID = req.body.Funds_RequestID ? req.body.Funds_RequestID : '';
    req.body.Brand = req.body.Brand ? `${req.body.Brand.trim().replace(/'/g, '')}` : '';
    req.body.SupplierID = req.body.SupplierID ? `${req.body.SupplierID.trim().replace(/'/g, '')}` : '';
    req.body.Currency = req.body.Currency ? `${req.body.Currency.trim().replace(/'/g, '')}` : '';
    req.body.Order_No = req.body.Order_No ? `${req.body.Order_No.trim().replace(/'/g, '')}` : '';
    req.body.Description = req.body.Description ? `${req.body.Description.trim().replace(/'/g, '')}` : '';
    req.body.UserID = req.body.UserID ? `${req.body.UserID.trim().replace(/'/g, '')}` : '';
    req.body.Date_From = req.body.Date_From ? `${req.body.Date_From.trim().replace(/'/g, '')}` : '2000/01/01';
    req.body.Date_To = req.body.Date_To ? `${req.body.Date_To.trim().replace(/'/g, '')}` : '3000/01/01';
 
    var strSQL = format(`
SELECT Top 1000 [Funds_RequestID]
, CONVERT(varchar(10), m.Update_Date, 111) AS Update_Date
, Brand
, SupplierID
, m.Order_No
, m.Description
, m.Qty
, m.Currency
, cast(isnull(m.Pay_Amount,0) as Money) as Pay_Amount
, cast(isnull(m.Paid_Amount,0) as Money) as Paid_Amount
, m.Payment_Terms
, CONVERT(varchar(10), m.Delivery_Date, 111) AS Delivery_Date
, CONVERT(varchar(10), m.Est_Pay_Date, 111) AS Est_Pay_Date
, m.Delivery_Term
, m.UserID
, m.Accounting
, iif(isnull(m.Accounting,'') = '' , 0 , 1) as Acc_Lock_Flag
, case when Accounting_Lock_Date is null then  case when Accounting_First_Lock is null then '' else convert(varchar(10),Accounting_First_Lock,111) end else convert(varchar(10),Accounting_Lock_Date,111) + '(' + convert(varchar(10),Accounting_First_Lock,111) + ')' end as Accounting_Lock_Date 
FROM Funds_Request m WITH (NoLock, NoWait) 
Where ('{Funds_RequestID}'='' or (cast(m.Funds_RequestID as Varchar) LIKE '%{Funds_RequestID}%') )
AND ('{Brand}'='' or ISNULL(m.Brand, '') LIKE '%{Brand}%') 
AND ('{SupplierID}'='' or ISNULL(m.SupplierID, '') LIKE '%{SupplierID}%') 
AND ('{Currency}'='' or ISNULL(m.Currency, '') LIKE '%{Currency}%') 
AND ('{Order_No}'='' or ISNULL(m.Order_No, '') LIKE '%{Order_No}%') 
AND ('{Description}'='' or ISNULL(m.Description, '') LIKE '%{Description}%') 
AND ('{UserID}'='' or ISNULL(m.UserID, '') LIKE '%{UserID}%') 
AND (m.Delivery_Date is null or (CONVERT(nvarchar(10), m.Delivery_Date,111) Between '{Date_From}' AND '{Date_To}' ))
Order by Funds_RequestID desc
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
 
//Get Funds_Request_Info
router.post('/Funds_Request_Info',  function (req, res, next) {
   console.log("Call Funds_Request_Info Api:",req.body);

   req.body.Funds_RequestID = req.body.Funds_RequestID ? req.body.Funds_RequestID : `''`; 

   //Mode == 0 Get Funds_Request , Purchase And Bill Data
   //Mode == 1 Get Funds_Request Data
   //Mode == 2 Get Purchase Data
   //Mode == 2 Get Bill Data

   var strSQL = format(`
   Declare @Mode int = {Mode}
   Declare @Funds_RequestID int = {Funds_RequestID}
   
    --1 Get Funds_Request Data
   if(@Mode = 0 or @Mode = 1)
   Begin
    SELECT m.[Funds_RequestID]
    , m.Department_Code
    , m.Brand
    , m.SupplierID
    , CONVERT(varchar(10), m.Apply_Date, 111) AS Apply_Date
    , m.Currency
    , isnull(m.Pay_Amount,0) as Pay_Amount
    , isnull(m.Paid_Amount,0) as Paid_Amount
    , m.Payment_Terms
    , m.Delivery_Term
    , CONVERT(varchar(10), m.Delivery_Date, 111) AS Delivery_Date
    , CONVERT(varchar(10), m.Est_Pay_Date, 111) AS Est_Pay_Date
    , m.Qty
    , m.UserID
    , CONVERT(varchar(10), m.Update_Date, 111) AS Update_Date
    , m.Order_No
    , m.Description
    , cast(m.Memo as nvarchar) as Memo
    , m.Accounting
    , iif(isnull(m.Accounting,'') = '' , 0 , 1) as Acc_Lock_Flag
    , case when Accounting_Lock_Date is null then  case when Accounting_First_Lock is null then '' else convert(varchar(10),Accounting_First_Lock,111) end else convert(varchar(10),Accounting_Lock_Date,111) + '(' + convert(varchar(10),Accounting_First_Lock,111) + ')' end as Accounting_Lock_Date 
    FROM Funds_Request m WITH (NoLock, NoWait) 
    Where m.Funds_RequestID = @Funds_RequestID ;
   End
   
    --2 Get Purchase Data
   if(@Mode = 0 or @Mode = 2)
   Begin   
    Select CONVERT(varchar(10),c.Purchase_Date,111) as Purchase_Date
    , c.Purchase_Project_No
    , c.Purchase_No
    , Sum(isnull(pd.Qty,0) * isnull(pd.Unit_Price,0)) as Amount
    From Purchase c
    Inner Join Purchase_Detail pd on c.Purchase_No = pd.Purchase_No
    Where c.Funds_RequestID = @Funds_RequestID
    Group by c.Purchase_Date, c.Purchase_Project_No, c.Purchase_No;
   End 
   
   --3 Get Bill Data
   if(@Mode = 0 or @Mode = 3)
   Begin
    Select Bill_No
    , convert(varchar(10),Bill_Date,111) as Bill_Date
    , convert(varchar(10),b.Est_Pay_Date,111) as Est_Pay_Date
    , convert(varchar(10),b.Delivery_Date,111) as Delivery_Date
    ,[Order_No]
    , [Description]
    , isnull(Amount,0) as Paid_Amount
    , Other_Fee
    From Bill b with(NoLock,NoWait) 
    Where Funds_RequestID = @Funds_RequestID
   End  
   `, req.body) ;
   //console.log(strSQL)
   db.sql(req.Enterprise, strSQL)
      .then((result) => {
         var DataSet = {
            Funds_Request_Info: (req.body.Mode == 0 || req.body.Mode == 1) ? result.recordsets[0] : []
            , Funds_Request_Purchase_Info: (req.body.Mode == 0) ? result.recordsets[1] : (req.body.Mode == 2 ? result.recordsets[0] : [])
            , Funds_Request_Bill_Info: (req.body.Mode == 0) ? result.recordsets[2] : (req.body.Mode == 3 ? result.recordsets[0] : [])
         }
         res.send(DataSet);
      }).catch((err) => {
         console.log(err);
         res.status(500).send(err);
      })

});

//Maintain Funds_Request
router.post('/Funds_Request_Maintain',  function (req, res, next) {
   console.log("Call Funds_Request_Maintain Api:",req.body);

   // req.body.Mode === 0 表示新增
   // req.body.Mode === 1 表示修改 
   // req.body.Mode === 2 表示刪除   
   req.body.Funds_RequestID = req.body.Funds_RequestID ? req.body.Funds_RequestID : `''`; 
  
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

//Maintain Funds_Request_Purchase
router.post('/Funds_Request_Purchase_Maintain',  function (req, res, next) {
   console.log("Call Supplier_Contacts_Maintain Api:",req.body);

   // req.body.Mode === 0 表示新增
   // req.body.Mode === 1 表示修改 
   // req.body.Mode === 2 表示刪除
   var Size = 0;
   req.body.Funds_RequestID = req.body.Funds_RequestID ? req.body.Funds_RequestID : `''`; 
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

//Maintain Funds_Request_Bill
router.post('/Funds_Request_Bill_Maintain',  function (req, res, next) {
  console.log("Call Supplier_Contacts_Maintain Api:",req.body);

  // req.body.Mode === 0 表示新增
  // req.body.Mode === 1 表示修改 
  // req.body.Mode === 2 表示刪除
  var Size = 0;
  req.body.Funds_RequestID = req.body.Funds_RequestID ? req.body.Funds_RequestID : `''`; 
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