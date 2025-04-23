var express = require('express');
var router = express.Router();
const format = require('string-format');
var db = require('../../config/DB_Connect');


/* Mark-Wang API Begin */

 //取得Client資料
 router.post('/Client', function (req, res, next) {
   console.log("Call Customer Api Customer:", req.body);
   
   req.body.CustomerID = req.body.CustomerID ? `N'${req.body.CustomerID.trim().substring(0,15).replace(/'/g, "''")}'` : `''`; 
 
   var strSQL = format(`
   SELECT CustomerID as Client
   FROM Customer c With(NoWait, Nolock)
   Where Histiry_Date is null
   EXCEPT
   SELECT Client
   FROM Customer_Clients p WITH (NoWait, Nolock) 
   Where CustomerID = {CustomerID}
   Order by Client
   `, req.body);
 
   //console.log(strSQL)
   db.sql(req.Enterprise, strSQL)
   .then((result)=>{
     //console.log(result) 
     res.send(result.recordsets[0]);
   }).catch((err)=>{
     console.log(err);
     res.status(500).send(err);
   })
 });

 //取得Department資料
 router.post('/Department', function (req, res, next) {
  console.log("Call Department API:", req.body);
  
  var strSQL = format(`
   SELECT distinct ac.DepartmentID, d.Department_Code as Department
  FROM Approve_Control ac With(NoWait, Nolock)
  Inner Join Department d on ac.DepartmentID = d.DepartmentID
  Order by d.Department_Code
  `, req.body);

  //console.log(strSQL)
  db.sql(req.Enterprise, strSQL)
  .then((result)=>{
    //console.log(result) 
    res.send(result.recordsets[0]);
  }).catch((err)=>{
    console.log(err);
    res.status(500).send(err);
  })
});


//Check CustomerID
router.post('/Check_CustomerID',  function (req, res, next) {
   console.log("Call Check_CustomerID Api:",req.body);

   req.body.CustomerID = req.body.CustomerID ? `${req.body.CustomerID.trim().toUpperCase().substring(0,15).replace(/'/g, '')}` : '';

   var strSQL = format(`
   SELECT Count(*) as RecCount
   FROM [dbo].[Customer] With(Nolock,NoWait)
   where ([CustomerID] = N'{CustomerID}')
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

//Get Customer_List
router.post('/Customer_List',  function (req, res, next) {
   console.log("Call Customer_List Api:");
   
   req.body.CustomerID = req.body.CustomerID ? `${req.body.CustomerID.trim().substring(0,15).replace(/'/g, '')}` : '';
   req.body.Customer_Name = req.body.Customer_Name ? `${req.body.Customer_Name.trim().substring(0,100).replace(/'/g, '')}` : '';
   req.body.Item_Of_Business = req.body.Item_Of_Business ? `${req.body.Item_Of_Business.replace(/'/g, '')}` : '';
   req.body.Country = req.body.Country ? `${req.body.Country.trim().substring(0,50).replace(/'/g, '')}` : '';

   var strSQL = format(`
   SELECT Top 1000 row_number() Over(Order By CustomerID desc) as RecNo
   ,[CustomerID]
   ,[Customer_Name]
   ,[Country]
   ,[Phone_Number]
   ,[Fax_Number]
   ,[Item_Of_Business]
   ,[Memo]
   ,[History_User]
   FROM [dbo].[Customer] With(Nolock,NoWait)
   where (N'{CustomerID}' = '' or [CustomerID] like N'{CustomerID}%')
   And (N'{Customer_Name}' = '' or [Customer_Name] like N'%{Customer_Name}%')
   And (N'{Country}' = '' or [Country] like N'%{Country}%')
   And (N'{Item_Of_Business}' = '' or [Item_Of_Business] like N'{Item_Of_Business}%')
   ${req.body.History_Check ? '' : 'And [History_User] IS NULL'}
   Order By CustomerID
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

//Get Customer_Info
router.post('/Customer_Info',  function (req, res, next) {
   console.log("Call Customer_Info Api:",req.body);

   req.body.CustomerID = req.body.CustomerID ? `N'${req.body.CustomerID.trim().substring(0,15).replace(/'/g, "''")}'` : `''`; 

   //Mode == 0 Get Customer , Contacts And Client And Payment Data
   //Mode == 1 Get Customer Data
   //Mode == 2 Get Customer Contacts Data
   //Mode == 3 Get Agent And Client Data
   //Mode == 4 Get Payment Data

   var strSQL = format(`
   Declare @Mode int = {Mode}
   Declare @CustomerID Varchar(15) = {CustomerID}
      
   --0 Get Customer All Data
   --1 Get Customer Master Data
   if(@Mode = 0 or @Mode = 1)
   Begin
      Select [CustomerID]
      , [Department]
      , [Customer_Name]
      , [VAT_NO]
      , [Item_Of_Business]
      , [Phone_Number]
      , [Fax_Number]
      , [Payment_Term]
      , [Region]
      , [Address]
      , [Country]
      , [Memo]
      , [URL]
      , [PWD]
      , o.[UserID]
      , [Data_Updater] 
      , [Transaction_Currency]
      , [Transaction_Amount]
      , convert(varchar(10) ,[Establish_Date] ,111) as [Establish_Date]
      , CAST(DATEDIFF(YEAR, Establish_Date, GETDATE()) + DATEDIFF(MONTH, Establish_Date, GETDATE()) / 12.0 AS DECIMAL(3, 1)) AS YearDifference
      , [Annual_Sales_Amount]
      , [Annual_Sales_Units]
      , [Supervisor]
      , convert(varchar(10) ,[Supervisor_Approved_Date] ,111) as [Supervisor_Approved_Date]
      , cast(ABS(CASE WHEN [Supervisor] IS NOT NULL THEN 1 ELSE 0 END) as bit) as [Supervisor_Approver_Check]
      , [Financial_Approver]
      , convert(varchar(10) ,[Financial_Approve_Date] ,111) as [Financial_Approve_Date]
      , cast(ABS(CASE WHEN [Financial_Approver] IS NOT NULL THEN 1 ELSE 0 END) as bit) as [Financial_Approver_Check]
      , [Business_Geography]
      , [Largest_Suppliers]
      --, convert(varchar(10),[Data_Update],111) as [Data_Update]
      --, convert(varchar(10),[Create_Date],111) as [Create_Date]      
      , case when o.Data_Update is null then '' else convert(varchar(10), o.[Data_Update],111) End as [Data_Update]
      , case when o.Create_Date is null then '' else convert(varchar(10), o.[Create_Date],111) End as [Create_Date]
      , [History_User]
      , case when o.Histiry_Date is null then '' else convert(varchar(10), o.[Histiry_Date],111) End as [Histiry_Date]
      , cast(ABS(CASE WHEN [History_User] IS NOT NULL THEN 1 ELSE 0 END) as bit) as [History_Check]
      , cast(ABS(CASE WHEN [Supervisor] IS NOT NULL or [Financial_Approver] IS NOT NULL or [History_User] IS NOT NULL THEN 1 ELSE 0 END) as bit) as [Basic_Info_Check]
      , isnull(uos.[LoweredUserName], '') as [Superior]
      , isnull((SELECT [Email] FROM Employee e with(NoLock, NoWait) Where e.LoweredUserName = '${req.UserID}'),'') as [User_Email]
      , isnull((SELECT [Email] FROM Employee e with(NoLock, NoWait) Where e.LoweredUserName = uos.[LoweredUserName]),'') as [Superior_Email]
      , isnull((SELECT [Email] FROM Employee e with(NoLock, NoWait) Where e.LoweredUserName = o.[Data_Updater]),'') as [Data_Updater_Email]
      , isnull((SELECT Top 1 outE.[LoweredUserName] FROM Employee outE INNER JOIN Department d ON d.DepartmentID = outE.DepartmentID
         WHERE outE.Leave_Job_Date IS NULL 
         AND d.[OrganizationID] IN (
             SELECT d.[OrganizationID] FROM Employee e with(NoLock, NoWait) INNER JOIN Department d ON d.DepartmentID = e.DepartmentID WHERE e.LoweredUserName = o.[Data_Updater]
         ) order by Employee_TitleID ),'') as [Department_Superior]
      , isnull((SELECT Top 1 outE.[Email] FROM Employee outE INNER JOIN Department d ON d.DepartmentID = outE.DepartmentID
         WHERE outE.Leave_Job_Date IS NULL 
         AND d.[OrganizationID] IN (
             SELECT d.[OrganizationID] FROM Employee e with(NoLock, NoWait) INNER JOIN Department d ON d.DepartmentID = e.DepartmentID WHERE e.LoweredUserName = o.[Data_Updater]
         ) order by Employee_TitleID ),'') as [Department_Superior_Email]
      from Customer o with(NoLock,NoWait)
      LEFT JOIN UsersOnSuperiors uos with(NoLock,NoWait) ON uos.OnSuperior = o.[Data_Updater]
      Where CustomerID = @CustomerID;
   End
   
   --2 Get Customer Contacts Data
   if(@Mode = 0 or @Mode = 2)
   Begin   
      Select row_number() Over(Order By c.[ContactID]) as RecNo
      , ContactID
      , c.[SortID]
      , c.[Name]
      , c.[Full_Name]
      , c.[Contact]
      , c.[Contact_Title]
      , c.[Sex]
      , c.[Work_Phone]
      , c.[Fax_Number]
      , c.[Address]
      , c.[Email]
      , c.[Memo]
      , c.[Selected]
      from Customer_Contacts c with(NoLock,NoWait)
      Where CustomerID = @CustomerID;
   End 
   
   --3 Get Agent & Client Data
   if(@Mode = 0 or @Mode = 3)
   Begin
      Select row_number() Over(Order By c.CustomerID) as RecNo, c.Customer_ClientID, c.CustomerID
      from Customer_Clients c with(NoLock,NoWait)
      Where Client = @CustomerID;

      Select row_number() Over(Order By c.Client) as RecNo, c.Customer_ClientID, c.Client
      from Customer_Clients c with(NoLock,NoWait)
      Where CustomerID = @CustomerID;
   End

   --4 Get Payment Data
   if(@Mode = 0 or @Mode = 4)
   Begin   
      Select 
         cpg.[CustomerID],
         cpg.[Financial_Category],
         cpg.[Description],
         cpg.[Financial_Approver],
         cpg.[Supervisor],
         cast(ABS(CASE WHEN cpg.[Supervisor] IS NOT NULL THEN 1 ELSE 0 END) as bit) as [Supervisor_Approver_Check],
         convert(varchar(10), cpg.[Supervisor_Approved_Date], 111) as [Supervisor_Approved_Date],
         cast(ABS(CASE WHEN cpg.[Financial_Approver] IS NOT NULL THEN 1 ELSE 0 END) as bit) as [Financial_Approver_Check],
         convert(varchar(10), cpg.[Financial_Approve_Date], 111) as [Financial_Approve_Date],
         cpg.[Data_Updater] as cpg_Data_Updater,
         convert(varchar(10), cpg.[Data_Update], 111) as cpg_Data_Update,
         cpg.[Customer_Payment_GroupID],
         cpt.[Customer_Payment_TermID],
         cpt.[Type],
         isnull(cpt.[Condition], '') as [Condition],
         cpt.[Days],
         cast(ABS(cpt.[By_Doc_Rcv]) as bit) as [By_Doc_Rcv],
         cast(ABS(cpt.[IsEOM]) as bit) as [IsEOM],
         cpt.[EOM_Day],
         cpt.[Rate],
         cpt.[Data_Updater] as cpt_Data_Updater,
         convert(varchar(10), cpt.[Data_Update], 111) as cpt_Data_Update
      FROM [dbo].[Customer_Payment_Group] as cpg
      LEFT JOIN [dbo].[Customer_Payment_Term] as cpt ON cpt.[Customer_Payment_GroupID] = cpg.[Customer_Payment_GroupID]
      WHERE CustomerID = @CustomerID;
   End

   `, req.body) ;
   //console.log(strSQL)
   db.sql(req.Enterprise, strSQL)
      .then((result) => {
         var DataSet = {
            Customer_Info: (req.body.Mode == 0 || req.body.Mode == 1) ? result.recordsets[0] : []
            , Customer_Contacts_Info: (req.body.Mode == 0) ? result.recordsets[1] : (req.body.Mode == 2 ? result.recordsets[0] : [])
            , Agent_Info: (req.body.Mode == 0) ? result.recordsets[2] : (req.body.Mode == 3 ? result.recordsets[0] : [])
            , Client_Info: (req.body.Mode == 0) ? result.recordsets[3] : (req.body.Mode == 3 ? result.recordsets[1] : [])
            , Payment_Info: (req.body.Mode == 0) ? result.recordsets[4] : (req.body.Mode == 4 ? result.recordsets[0] : [])
         }
         res.send(DataSet);
      }).catch((err) => {
         console.log(err);
         res.status(500).send(err);
      })

});

//Maintain Customer
router.post('/Customer_Maintain',  function (req, res, next) {
   console.log("Call Customer_Maintain Api:",req.body);

   // req.body.Mode === 0 表示新增
   // req.body.Mode === 1 表示修改 
   // req.body.Mode === 2 表示刪除
   req.body.CustomerID = req.body.CustomerID ? `N'${req.body.CustomerID.trim().substring(0,15).replace(/'/g, "''")}'` : `''`; 

   var strSQL = 'Declare @ROWCOUNT int '
   switch(req.body.Mode){
      case 0:
         strSQL += format(`
            Insert into [dbo].[Customer] (CustomerID, UserID, Data_Update, Data_Updater)
            Select {CustomerID} as CustomerID, N'${req.UserID}' as UserID, GetDate() as [Data_Update], N'${req.UserID}' as Data_Updater 
            Where ( SELECT Count(*) as RecCount FROM [dbo].[Customer] With(Nolock,NoWait) where [CustomerID] = {CustomerID} ) = 0 ;
            Set @ROWCOUNT = @@ROWCOUNT;
         `, req.body);
         break;
      case 1:
         var Size = 0;
         switch(req.body.Name){
            case 'CustomerID':
            case 'VAT_NO':
               Size = 15;
            break;
            case 'Department':
                Size = 20;
            break
            case 'Customer_Name':
               Size = 100;
            break;
            case 'Payment_Term':
               Size = 50;
            break;         
            case 'Country':
               Size = 50;
            break;
            case 'Region':
            case 'Establish_Date':
               Size = 10;
            break;
            case 'URL':
            case 'Address':
            case 'Business_Geography':
            case 'Largest_Suppliers':
               Size = 256;
            break;
            case 'Phone_Number':
            case 'Fax_Number':
               Size = 30;
            break;
            case 'Memo':
            case 'Item_Of_Business':
               Size = 65535;
            break;
            case 'Transaction_Currency':
               Size = 4;
            break;
            case 'Supervisor':
            case 'Financial_Approver':
               Size = 20;
            break;
            default:
            break;
         }

         req.body.Value = Size == 0 ? (req.body.Value ? req.body.Value : null) : (req.body.Value ? `N'${req.body.Value.trim().replace(/'/g, "''")}'` : `''`);

         if (req.body.Name === 'Supervisor_Approver_Check') {
            strSQL += format(`
               Update [dbo].[Customer] Set ${req.body.Value === null ? 
               'Supervisor = null, Supervisor_Approved_Date = null, Financial_Approver = null, Financial_Approve_Date = null, History_User = null, Histiry_Date = null'
               : `Supervisor = N'${req.UserID}', Supervisor_Approved_Date = GetDate()`} 
               where CustomerID = {CustomerID};
               Set @ROWCOUNT = @@ROWCOUNT;
            `, req.body);
         } else if (req.body.Name === 'Financial_Approver_Check') {
            strSQL += format(`
               Update [dbo].[Customer] Set ${req.body.Value === null ? 'Financial_Approver = null, Financial_Approve_Date = null' : `Financial_Approver = N'${req.UserID}', Financial_Approve_Date = GetDate()`} 
               where CustomerID = {CustomerID};
               Set @ROWCOUNT = @@ROWCOUNT;
            `, req.body);
         } else if (req.body.Name === 'History_Check') {
            strSQL += format(`
               Update [dbo].[Customer] Set ${req.body.Value === null ? 'History_User = null, Histiry_Date = null' : `History_User = N'${req.UserID}', Histiry_Date = GetDate()`} 
               where CustomerID = {CustomerID};
               Set @ROWCOUNT = @@ROWCOUNT;
            `, req.body);
         } else {
            strSQL += format(`
               Update [dbo].[Customer] Set [{Name}] = ${Size == 0 ? '{Value}': `substring({Value},1,${Size})`}
               , UserID = isnull(UserID, N'${req.UserID}')
               , Data_Updater = N'${req.UserID}'
               , Data_Update = GetDate()
               where CustomerID = {CustomerID}
               ${ req.body.Name === 'CustomerID' ? ` And (SELECT Count(*) as RecCount FROM Customer as p WITH (NoWait, Nolock) Where p.CustomerID = {Value}) = 0 ` : "" };
               Set @ROWCOUNT = @@ROWCOUNT;
            `, req.body);
         }
         break;
      case 2:
         strSQL += format(`
            Delete FROM [dbo].[Customer] 
            where CustomerID = {CustomerID}; 
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

//Maintain Customer_Contacts
router.post('/Customer_Contacts_Maintain',  function (req, res, next) {
   console.log("Call Customer_Contacts_Maintain Api:",req.body);

   // req.body.Mode === 0 表示新增
   // req.body.Mode === 1 表示修改 
   // req.body.Mode === 2 表示刪除
   req.body.CustomerID = req.body.CustomerID ? `N'${req.body.CustomerID.trim().substring(0,15).replace(/'/g, "''")}'` : `''`; 
 
   var strSQL = 'Declare @ROWCOUNT int; '
   switch(req.body.Mode){
      case 0:
         req.body.Name = req.body.Name ? `N'${req.body.Name.trim().substring(0,35).replace(/'/g, "''")}'` : `''`; 
         req.body.Full_Name = req.body.Full_Name ? `N'${req.body.Full_Name.trim().substring(0,100).replace(/'/g, "''")}'` : `''`; 
         req.body.Contact = req.body.Contact ? `N'${req.body.Contact.trim().substring(0,50).replace(/'/g, "''")}'` : `''`; 
         req.body.Contact_Title = req.body.Contact_Title ? `N'${req.body.Contact_Title.trim().substring(0,30).replace(/'/g, "''")}'` : `''`; 
         req.body.Sex = req.body.Sex ? `N'${req.body.Sex.trim().substring(0,5).replace(/'/g, "''")}'` : `''`; 
         req.body.Work_Phone = req.body.Work_Phone ? `N'${req.body.Work_Phone.trim().substring(0,60).replace(/'/g, "''")}'` : `''`; 
         req.body.Fax_Number = req.body.Fax_Number ? `N'${req.body.Fax_Number.trim().substring(0,30).replace(/'/g, "''")}'` : `''`; 
         req.body.Address = req.body.Address ? `N'${req.body.Address.trim().substring(0,150).replace(/'/g, "''")}'` : `''`; 
         req.body.Email = req.body.Email ? `N'${req.body.Email.trim().substring(0,50).replace(/'/g, "''")}'` : `''`; 
   
         strSQL += format(`
            Insert into [dbo].[Customer_Contacts] ([SortID],[CustomerID]
               ,[Name], [Full_Name], [Contact], [Contact_Title], [Sex]
               ,[Work_Phone], [Fax_Number], [Address], [Email], [Memo]
               ,[Selected], [Data_Updater], [Data_Update])
            Select 0 as [SortID], {CustomerID} as [CustomerID]
               , {Name} as [Name], {Full_Name} as [Full_Name], {Contact} as [Contact], {Contact_Title} as [Contact_Title], {Sex} as [Sex]
               , {Work_Phone} as [Work_Phone], {Fax_Number} as [Fax_Number], {Address} as [Address], {Email} as [Email], null as [Memo]
               , 0 as [Selected], '${req.UserID}' as [Data_Updater], GetDate() as [Data_Update];
            Set @ROWCOUNT = @@ROWCOUNT;
         `, req.body);
         break;
      case 1:
         var Size = 0;
         switch(req.body.Name){
            case 'Name':
               Size = 35;
            break;
            case 'Full_Name':
               Size = 100;
            break;         
            case 'Contact':
               Size = 50;
            break;
            case 'Contact_Title':
               Size = 30;
            break;
            case 'Sex':
                  Size = 5;
            break;
            case 'Work_Phone':
                  Size = 60;
            break;
            case 'Email':
                  Size = 50;
            break;
            case 'Address':
            case 'Memo':
               Size = 256;
            break;
            default:
            break;
         }
         
         req.body.Value = Size == 0 ? (req.body.Value ? req.body.Value : null) : (req.body.Value ? `N'${req.body.Value.trim().replace(/'/g, "''")}'` : `''`);

         strSQL += format(`
            Update [dbo].[Customer_Contacts] Set [{Name}] = ${Size == 0 ? '{Value}': `substring({Value},1,${Size})`}, Data_Updater = N'${req.UserID}', Data_Update = GetDate()
            where ContactID = {ContactID};
            Set @ROWCOUNT = @@ROWCOUNT;
         `, req.body);
         break;
      case 2:
         strSQL += format(`
            Delete FROM [dbo].[Customer_Contacts] 
            where ContactID = {ContactID}; 
            Set @ROWCOUNT = @@ROWCOUNT;
         `, req.body);
         break;
   }

   strSQL += format(`
   Select @ROWCOUNT as Flag;

   if(@ROWCOUNT > 0)
   begin
      Update Customer set
         UserID = isnull(UserID, N'${req.UserID}')
         , Data_Updater = N'${req.UserID}'
         , Data_Update = GetDate()
      Where CustomerID = {CustomerID}
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

//Maintain Client
router.post('/Client_Maintain',  function (req, res, next) {
   console.log("Call Client_Maintain Api:",req.body);

   // req.body.Mode === 0 表示新增
   // req.body.Mode === 1 表示修改 
   // req.body.Mode === 2 表示刪除
   req.body.CustomerID = req.body.CustomerID ? `N'${req.body.CustomerID.trim().substring(0,15).replace(/'/g, "''")}'` : `''`; 

   if(req.body.Mode === 0) {
      req.body.Client = req.body.Client ? `N'${req.body.Client.trim().substring(0,15).replace(/'/g, "''")}'` : `''`; 
   }
   if(req.body.Mode === 1 && (req.body.Name == 'Client' ) ) {
      var Size = 0;
      switch(req.body.Name){
         case 'Client':
            Size = 15;
            break;
      }
      req.body.Value = req.body.Value ? `N'${req.body.Value.trim().substring(0,Size).replace(/'/g, "''")}'` : `''`;      
   }

   var strSQL = 'Declare @ROWCOUNT int '
   switch(req.body.Mode){
      case 0:
         strSQL += format(`
            Insert into [dbo].[Customer_Clients] (CustomerID, Client)
            Select {CustomerID} as CustomerID, {Client} as Client
            Where (Select count(*) From Customer_Clients c WITH(NoWait, Nolock) Where c.Client = {Client} and c.CustomerID = {CustomerID}) = 0 ;
            Set @ROWCOUNT = @@ROWCOUNT;
         `, req.body);
         break;
      case 1:        
         strSQL += format(`
            Update [dbo].[Customer_Clients] Set [{Name}] = {Value}
            where Customer_ClientID = {Customer_ClientID}
            Where (Select count(*) From Customer_Clients c WITH(NoWait, Nolock) Where c.Client = {Value} and c.CustomerID = {CustomerID}) = 0 ;
            Set @ROWCOUNT = @@ROWCOUNT;
         `, req.body);
         break;
      case 2:
         strSQL += format(`
            Delete FROM [dbo].[Customer_Clients] 
            where Customer_ClientID = {Customer_ClientID} ; 
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

/* Mark-Wang API End */


/* Darren-Chang API Begin */

// Maintain Customer_Payment_Group
router.post('/Customer_Payment_Group_Maintain', function (req, res, next) {
  console.log("Call Customer_Payment_Group_Maintain Api:", req.body);

  // req.body.Mode === 0 表示新增
  // req.body.Mode === 1 表示修改 
  // req.body.Mode === 2 表示刪除
  req.body.CustomerID = req.body.CustomerID ? `N'${req.body.CustomerID.trim().substring(0, 15).replace(/'/g, "''")}'` : `''`;

  var strSQL = 'Declare @ROWCOUNT int;'
  switch (req.body.Mode) {
    case 0:
      req.body.Financial_Category = req.body.Financial_Category ? `N'${req.body.Financial_Category.trim().substring(0, 10).replace(/'/g, "''")}'` : `''`;
      req.body.Description = req.body.Description ? `N'${req.body.Description.trim().substring(0, 20).replace(/'/g, "''")}'` : `''`;
      req.body.Financial_Approver = req.body.Financial_Approver ? `N'${req.body.Financial_Approver.trim().substring(0, 20).replace(/'/g, "''")}'` : `''`;
      req.body.Financial_Approve_Date = req.body.Financial_Approve_Date ? `N'${req.body.Financial_Approve_Date.trim().substring(0, 10).replace(/'/g, "''")}'` : `''`;

      strSQL += format(`
        Insert into [dbo].[Customer_Payment_Group] ([CustomerID], [Financial_Category], [Data_Updater], [Data_Update]) VALUES ({CustomerID}, 'Develop', N'${req.UserID}', GetDate())
        Set @ROWCOUNT = @@ROWCOUNT;
      `, req.body);
      break;
    case 1:
      var Size = 0;
      switch (req.body.Name) {
        case 'Financial_Category':
          Size = 10;
          break;
        case 'Description':
        case 'Financial_Approver':
          Size = 20;
          break;
        case 'Financial_Approve_Date':
          Size = 10;
          break;
        default:
          break;
      }

      req.body.Value = Size == 0 ? (req.body.Value ? req.body.Value : 0) : (req.body.Value ? `N'${req.body.Value.trim().replace(/'/g, "''")}'` : `''`);

      if (req.body.Name === 'Supervisor_Approver_Check') {
        strSQL += format(`
          Update [dbo].[Customer_Payment_Group] Set ${req.body.Value === 0 ? 
            'Supervisor = null, Supervisor_Approved_Date = null, Financial_Approver = null, Financial_Approve_Date = null'
            : `Supervisor = N'${req.UserID}', Supervisor_Approved_Date = GetDate()`} 
          where Customer_Payment_GroupID = {Customer_Payment_GroupID};
          Set @ROWCOUNT = @@ROWCOUNT;
      `, req.body);
      } else if (req.body.Name === 'Financial_Approver_Check') {
         strSQL += format(`
           Update [dbo].[Customer_Payment_Group] Set ${req.body.Value === 0 ? 'Financial_Approver = null, Financial_Approve_Date = null' : `Financial_Approver = N'${req.UserID}', Financial_Approve_Date = GetDate()`} 
           where Customer_Payment_GroupID = {Customer_Payment_GroupID};
           Set @ROWCOUNT = @@ROWCOUNT;
       `, req.body);
       } else {
        strSQL += format(`
          Update [dbo].[Customer_Payment_Group] Set [{Name}] = ${Size == 0 ? '{Value}' : `substring({Value},1,${Size})`}
          , Data_Updater = N'${req.UserID}'
          , Data_Update = GetDate()
          where Customer_Payment_GroupID = {Customer_Payment_GroupID};
          Set @ROWCOUNT = @@ROWCOUNT;
        `, req.body);
      }
      break;
    case 2:
      strSQL += format(`
        Delete FROM [dbo].[Customer_Payment_Group] 
        where Customer_Payment_GroupID = {Customer_Payment_GroupID}; 
        Set @ROWCOUNT = @@ROWCOUNT;
      `, req.body);
      break;
  }

  if (req.body.Name === 'Financial_Approver_Check' || req.body.Name === 'Supervisor_Approver_Check') {
    strSQL += `Select @ROWCOUNT as Flag;`
  } else {
    strSQL += format(`
      Select @ROWCOUNT as Flag;
  
      if(@ROWCOUNT > 0)
      begin
          Update Customer set
            UserID = isnull(UserID, N'${req.UserID}')
            , Data_Updater = N'${req.UserID}'
            , Data_Update = GetDate()
          Where CustomerID = {CustomerID}
      End
    `, req.body);
  }
  // console.log(strSQL)
  db.sql(req.Enterprise, strSQL)
    .then((result) => {
      // console.log(result.recordsets[0])
      res.send({ Flag: result.recordsets[0][0].Flag > 0 });
    }).catch((err) => {
      console.log(err);
      res.status(500).send(err);
    })
});

// Maintain Customer_Payment_Term
router.post('/Customer_Payment_Term_Maintain', function (req, res, next) {
  console.log("Call Customer_Payment_Term_Maintain Api:", req.body);

  // req.body.Mode === 0 表示新增
  // req.body.Mode === 1 表示修改 
  // req.body.Mode === 2 表示刪除
  req.body.CustomerID = req.body.CustomerID ? `N'${req.body.CustomerID.trim().substring(0, 15).replace(/'/g, "''")}'` : `''`;
  req.body.paymentString = req.body.paymentString ? `N'${req.body.paymentString.trim().replace(/'/g, "''")}'` : `''`;

  var strSQL = 'Declare @ROWCOUNT int;'
  switch (req.body.Mode) {
    case 0:
      req.body.Type = req.body.Type ? `N'${req.body.Type.trim().substring(0, 10).replace(/'/g, "''")}'` : `''`;

      strSQL += format(`
        Insert into [dbo].[Customer_Payment_Term] ([Customer_Payment_GroupID], [Type], [Condition], [Days], [EOM_Day], [Payment_Term]) VALUES ({Customer_Payment_GroupID}, 'T/T', 'DEPOSIT', 0, 0, 'T/T DEPOSIT')
        Set @ROWCOUNT = @@ROWCOUNT;
      `, req.body);
      break;
    case 1:
      var Size = 0;
      switch (req.body.Name) {
        case 'Type':
          Size = 10;
          break;
        case 'Condition':
          Size = 50;
          break;
        default:
          break;
      }
      
      req.body.Value = Size == 0 ? (req.body.Value ? req.body.Value : 0) : (req.body.Value ? `N'${req.body.Value.trim().replace(/'/g, "''")}'` : `''`);

      strSQL += format(`
        Update [dbo].[Customer_Payment_Term] Set [{Name}] = ${Size == 0 ? '{Value}' : `substring({Value},1,${Size})`}, Payment_Term = {paymentString}
        ${req.body.Name === 'Condition' ? ', Days = 0' : ''}
        where Customer_Payment_TermID = {Customer_Payment_TermID};
        Set @ROWCOUNT = @@ROWCOUNT;
      `, req.body);
      break;
    case 2:
      strSQL += format(`
        Delete FROM [dbo].[Customer_Payment_Term]
        where Customer_Payment_TermID = {Customer_Payment_TermID}; 
        Set @ROWCOUNT = @@ROWCOUNT;
      `, req.body);
      break;
  }

  strSQL += format(`
    Select @ROWCOUNT as Flag;

    if(@ROWCOUNT > 0)
    begin
        Update Customer set
          UserID = isnull(UserID, N'${req.UserID}')
          , Data_Updater = N'${req.UserID}'
          , Data_Update = GetDate()
        Where CustomerID = {CustomerID}
    End
  `, req.body);
  // console.log(strSQL)
  db.sql(req.Enterprise, strSQL)
    .then((result) => {
      // console.log(result.recordsets[0])
      res.send({ Flag: result.recordsets[0][0].Flag > 0 });
    }).catch((err) => {
      console.log(err);
      res.status(500).send(err);
    })
});
/* Darren-Chang API End */

module.exports = router;