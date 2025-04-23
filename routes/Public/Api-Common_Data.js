var express = require('express');
var router = express.Router();
const format = require('string-format');
var db = require('../../config/DB_Connect');
var Mail = require('../../config/Mail');
var cloneDeep = require('lodash/cloneDeep');
let moment = require('moment');


/* Mark-Wang API Begin */


//Get Control Table Info
router.post('/Control_Info', function (req, res, next) {
  console.log("Call Control_Info Api:", req.body);

  var strSQL = format(`Select * From Control
  `, req.body);

  //console.log(strSQL)
  db.sql(req.SiteDB, strSQL)
    .then((result) => {
      //console.log(result)
      res.send(result.recordset);
    }).catch((err) => {
      console.log(err);
      res.status(500).send(err);
    })
});

//Get Organization
router.post('/Organization', function (req, res, next) {
  console.log("Call Organization Api Organization:", req.body);

  var strSQL = format(`SELECT OrganizationID, Organization_Name, L2_Organization_Name, History_Date, Purchasing
    FROM Organization as p WITH (NoWait, Nolock)
    Where History_Date is null;
    `, req.body);

  //console.log(strSQL)
  db.sql(req.Enterprise, strSQL)
    .then((result) => {
      //console.log(result)
      res.send(result.recordset);
    }).catch((err) => {
      console.log(err);
      res.status(500).send(err);
    })
});

//取得Department資料
router.post('/Department', function (req, res, next) {
  console.log("Call Department Api Department:", req.body);

  var strSQL = format(`
       SELECT [Department_Code] as Department, DepartmentID
    FROM [Department] d WITH (NoWait, Nolock)
    --Inner Join Control c WITH (NoWait, Nolock) on d.OrganizationID = c.OrganizationID
    where d.Department_Code is not null
    And d.History is null;
    `, req.body);

  //console.log(strSQL)
  db.sql(req.SiteDB, strSQL)
    .then((result) => {
      //console.log(result)
      res.send(result.recordset);
    }).catch((err) => {
      console.log(err);
      res.status(500).send(err);
    })
});

//取得Brand資料
router.post('/Brand', function (req, res, next) {
  console.log("Call Brand Api Brand:", req.body);

  req.body.Mode = req.body.Mode ? req.body.Mode : 0;
  var strSQL = format(`SELECT BrandID, p.Brand
    FROM Brand as p WITH (NoWait, Nolock)
    ${req.body.Mode == 0 ? '' : ' Inner Join [Orders] o on o.Brand = p.Brand '}
    Group by BrandID, p.Brand
    Order by BrandID, p.Brand
    `, req.body);

  //console.log(strSQL)
  db.sql(req.body.Mode == 0 ? req.Enterprise : req.SiteDB, strSQL)
    .then((result) => {
      //console.log(result)
      res.send(result.recordset);
    }).catch((err) => {
      console.log(err);
      res.status(500).send(err);
    })
});

//取得Product_Type資料
router.post('/Product_Type', function (req, res, next) {
  console.log("Call Product_Type Api :", req.body);

  var strSQL = format(`SELECT Product_Type
  FROM Product_Type WITH (NoWait, Nolock)
  Order by SortID;
  `, req.body);

  //console.log(strSQL)
  db.sql(req.Enterprise, strSQL)
    .then((result) => {
      //console.log(result)
      res.send(result.recordset);
    }).catch((err) => {
      console.log(err);
      res.status(500).send(err);
    })
});

//取得 Company資料    Company資料 = SupplierID + CustomerID
router.post('/Company', function (req, res, next) {
  console.log("Call Company Api Company:", req.body);

  var strSQL = format(`
  SELECT CustomerID FROM Customer c WITH (NoWait, Nolock)
  union
  SELECT SupplierID as CustomerID FROM Supplier s WITH (NoWait, Nolock)
  `, req.body);

  //console.log(strSQL)
  db.sql(req.Enterprise, strSQL)
    .then((result) => {
      //console.log(result)
      res.send(result.recordsets[0]);
    }).catch((err) => {
      console.log(err);
      res.status(500).send(err);
    })
});

//取得Agent資料
router.post('/Agent', function (req, res, next) {
  console.log("Call Agent Api Agent:", req.body);

  var strSQL = format(`
    Declare @Mode int = {Mode}

    --Mode 0 帶入全部的Agent 與 Client
    if(@Mode = 0)
    begin
      Select distinct CustomerID from Customer_Clients p WITH (NoWait, Nolock) Where CustomerID is not null
      Select distinct Client from Customer_Clients p WITH (NoWait, Nolock) Where Client is not null
    End

    --Mode 1 依據Customer 取得 Agent
    if(@Mode = 1)
    begin
      Select distinct CustomerID from Customer_Clients p WITH (NoWait, Nolock) Where p.Client = N'{Client}'
    End

    --Mode 2 依據Agent 取得 Client
    if(@Mode = 2)
    begin
      Select distinct Client from Customer_Clients p WITH (NoWait, Nolock) Where p.CustomerID = N'{Agent}'
    End


    `, req.body);

  //console.log(strSQL)
  db.sql(req.Enterprise, strSQL)
    .then((result) => {
      //console.log(result)
      res.send(result.recordsets);
    }).catch((err) => {
      console.log(err);
      res.status(500).send(err);
    })
});

//取得Customer資料
router.post('/Customer', function (req, res, next) {
  console.log("Call Customer Api Customer:", req.body);

  req.body.Mode = req.body.Mode ? req.body.Mode : 0;
  req.body.CustomerID = req.body.CustomerID ? req.body.CustomerID.replace(/'/g, "''") : '';

  //Mode = 0 只取得Customer
  //Mode = 1 取得Customer 加上 Agent 資料
  //Mode = 2 只取得Customer 加上 Contact 資料
  var strSQL = format(`
  Declare @Mode int = {Mode}

  SELECT CustomerID, Customer_Name, Address
  FROM Customer as p WITH (NoWait, Nolock)
  Order by CustomerID

  if(@Mode = 1)
  Begin
    SELECT CustomerID, Client
    FROM Customer_Clients as p WITH (NoWait, Nolock)
  End

  if(@Mode = 2)
  Begin
    SELECT p.ContactID, c.CustomerID, p.Name, p.Full_Name, p.Contact, p.Address
    FROM Customer c WITH (NoWait, Nolock)
    Left Outer Join Customer_Contacts p WITH (NoWait, Nolock) on c.CustomerID = p.CustomerID
    Where 1=1
    ${req.body.CustomerID.length > 0 ? " And c.CustomerID = N'{CustomerID}'" : ""}
    Order by c.CustomerID, ContactID
  End
  `, req.body);

  //console.log(strSQL)
  db.sql(req.Enterprise, strSQL)
    .then((result) => {
      //console.log(result)

      var DataSet = [];
      switch (req.body.Mode) {
        case 0:
          DataSet = result.recordsets[0];
          break;
        case 1:
          DataSet = result.recordsets[0];
          var data = result.recordsets[1];

          DataSet.forEach((item, idx) => {
            var Detail = [];
            //console.log(obj_Size_Run)
            data.forEach((data, idx) => {
              if (item.CustomerID === data['Client']) {
                Detail.push({ CustomerID: data.CustomerID })
              }
            })
            item['Agent'] = cloneDeep(Detail);
          });
          break;
        case 2:
          DataSet = result.recordsets[1];
          break;
      }
      //console.log(DataSet)
      res.send(DataSet);
    }).catch((err) => {
      console.log(err);
      res.status(500).send(err);
    })
});

// 取得 Approved Customer 資料
router.post('/Approved_Customer', function (req, res, next) {
  console.log("Call Approved_Customer Api:", req.body);

  req.body.Mode = req.body.Mode ? req.body.Mode : 0;
  req.body.CustomerID = req.body.CustomerID ? req.body.CustomerID.replace(/'/g, "''") : '';

  // Mode = 0 只取得財務已許可的 Customer 資料

  var strSQL = format(`
  Declare @Mode int = {Mode}

  SELECT CustomerID, Customer_Name, Address
  FROM Customer as p WITH (NoWait, Nolock)
  WHERE Financial_Approver IS NOT NULL AND History_User IS NULL
  Order by CustomerID

  `, req.body);

  // console.log(strSQL)
  db.sql(req.Enterprise, strSQL)
    .then((result) => {
      res.send(result.recordsets[0]);
    }).catch((err) => {
      console.log(err);
      res.status(500).send(err);
    })
});

//取得Supplier資料
router.post('/Supplier', function (req, res, next) {
  console.log("Call Supplier Api:", req.body);

  //Mode = 0 只取得Supplier
  //Mode = 1 只取得Supplier 加上 Contact 資料
  var strSQL = format(`
    SELECT SupplierID, Supplier_Name, Address
    FROM Supplier as p WITH (NoWait, Nolock)
    Where History_Date is null
    Order by SupplierID
  `, req.body);

  //console.log(strSQL)
  db.sql(req.Enterprise, strSQL)
    .then((result) => {
      //console.log(result)

      var DataSet = result.recordsets[0];
      //console.log(DataSet)
      res.send(DataSet);
    }).catch((err) => {
      console.log(err);
      res.status(500).send(err);
    })
});

//取得Supplier資料
router.post('/Supplier_Contacts', function (req, res, next) {
  console.log("Call Supplier Api:", req.body);

  req.body.Mode = req.body.Mode ? req.body.Mode : 0;
  req.body.SupplierID = req.body.SupplierID ? req.body.SupplierID.replace(/'/g, "''") : '';

  //Mode = 0 只取得Supplier
  //Mode = 1 只取得Supplier 加上 Contact 資料
  var strSQL = format(`
      SELECT p.ContactID, p.Contact
      FROM Supplier_Contacts p WITH (NoWait, Nolock)
      Where p.SupplierID = N'{SupplierID}'
      Order by p.ContactID;
  `, req.body);

  //console.log(strSQL)
  db.sql(req.Enterprise, strSQL)
    .then((result) => {
      //console.log(result)

      var DataSet = result.recordsets[0];
      //console.log(DataSet)
      res.send(DataSet);
    }).catch((err) => {
      console.log(err);
      res.status(500).send(err);
    })
});

//取得Unit資料
router.post('/Unit', function (req, res, next) {
  console.log("Call Unit Api :", req.body);

  var strSQL = format(`SELECT Unit
    FROM Unit as u WITH (NoWait, Nolock)
    Order by Unit
    `, req.body);

  //console.log(strSQL)
  db.sql(req.Enterprise, strSQL)
    .then((result) => {
      //console.log(result)
      res.send(result.recordset);
    }).catch((err) => {
      console.log(err);
      res.status(500).send(err);
    })
});

//Get Size Mode Info
router.post('/Size_Mode', function (req, res, next) {
  console.log("Call Size_Mode Api:");

  var strSQL = format(`
  SELECT DISTINCT Size_Mode
  FROM Size_Mode
  ORDER BY Size_Mode;
   `, req.body);
  //console.log(strSQL)

  db.sql(req.Enterprise, strSQL)
    .then((result) => {
      res.send(result.recordsets[0]);
    }).catch((err) => {
      console.log(err);
      res.status(500).send(err);
    })

});

//取得Product size資料
router.post('/Product_Size', function (req, res, next) {
  console.log("Call Product_Size Api Product_Size:");

  var strSQL = format(` SELECT [SizeID], Rtrim([Size_Name]) as [Size_Name]
  FROM [dbo].[Product_Size] p WITH (NoWait, Nolock)
  Order by SizeID
  `, req.body);

  //console.log(strSQL)
  db.sql(req.Enterprise, strSQL)
    .then((result) => {
      //console.log(result)
      res.send(result.recordset);
    }).catch((err) => {
      console.log(err);
      res.status(500).send(err);
    })
});

//取得Product_Gender資料
router.post('/Product_Gender', function (req, res, next) {
  console.log("Call Product_Gender Api:", req.body);

  var strSQL = format(`SELECT Gender
  FROM Product_Gender WITH (NoWait, Nolock)
  Order by Gender;
  `, req.body);

  //console.log(strSQL)
  db.sql(req.Enterprise, strSQL)
    .then((result) => {
      //console.log(result)
      res.send(result.recordset);
    }).catch((err) => {
      console.log(err);
      res.status(500).send(err);
    })
});

//取得Get_Outsole資料
router.post('/Outsole', function (req, res, next) {
  console.log("Call Outsole Api:", req.body);

  var strSQL = format(`SELECT Model_No as Outsole_No
  FROM Model WITH (NoWait, Nolock)
  Order by Model_No;
  `, req.body);

  //console.log(strSQL)
  db.sql(req.Enterprise, strSQL)
    .then((result) => {
      //console.log(result)
      res.send(result.recordset);
    }).catch((err) => {
      console.log(err);
      res.status(500).send(err);
    })
});

//取得Component資料
router.post('/Component', function (req, res, next) {
  console.log("Call Component Api Component:", req.body);

  req.body.Product_No = req.body.Product_No ? req.body.Product_No.replace(/'/g, "''") : '';

  var strSQL = format(`SELECT pc.Component_GroupID, pc.ComponentID, pc.Component
    FROM Product_Component as pc WITH (NoWait, Nolock)
    Inner Join Product_Component_Group pcg with(NoWait, NoLock) on pc.Component_GroupID = pcg.Component_GroupID
    Where pc.Product_Type = (
       Select Product_Type
       from Style s
       Inner Join Product p on s.style_No = p.style_No
       Where p.Product_No = N'{Product_No}'
       )
    Order by pcg.SortID
    `, req.body);

  //console.log(strSQL)
  db.sql(req.Enterprise, strSQL)
    .then((result) => {
      //console.log(result)
      res.send(result.recordset);
    }).catch((err) => {
      console.log(err);
      res.status(500).send(err);
    })
});

//取得Season資料
router.post('/Season', function (req, res, next) {
  console.log("Call Season Api Season:", req.body);

  var strSQL = format(`SELECT SortID
    , Season
    , case when substring(Season,3,2) > 17 then substring(Season,6,2) else substring(Season,6,1) + substring(Season,8,1) end + substring(Season,3,2) as label
    , Season as value
    FROM Season as p WITH (NoWait, Nolock)
    Order by SortID desc
    `, req.body);

  //console.log(strSQL)
  db.sql(req.Enterprise, strSQL)
    .then((result) => {
      //console.log(result)
      res.send(result.recordset);
    }).catch((err) => {
      console.log(err);
      res.status(500).send(err);
    })
});

//取得Factory資料
router.post('/Factory', function (req, res, next) {
  console.log("Call Factory Api Factory:", req.body);

  req.body.FactoryID = req.body.FactoryID ? req.body.FactoryID.replace(/'/g, "''") : '';
  req.body.Factory_SubID = req.body.Factory_SubID ? req.body.Factory_SubID.replace(/'/g, "''") : '';

  var strSQL = format(` SELECT p.[FactoryID]
  FROM [dbo].[Factory_Sub] p WITH (NoWait, Nolock)
  Where p.History_Date is null
  ${req.body.FactoryID.length > 0 ? " And p.FactoryID = N'{FactoryID}'" : ""}
  ${req.body.Factory_SubID.length > 0 ? " And p.Factory_SubID = N'{Factory_SubID}'" : ""}
  Group by p.FactoryID
  Order by p.FactoryID

  `, req.body);

  //console.log(strSQL)
  db.sql(req.Enterprise, strSQL)
    .then((result) => {
      //console.log(result)
      res.send(result.recordset);
    }).catch((err) => {
      console.log(err);
      res.status(500).send(err);
    })
});

//取得Factory_Sub資料
router.post('/Factory_Sub', function (req, res, next) {
  console.log("Call Factory_Sub Api:", req.body);

  req.body.Mode = req.body.Mode ? req.body.Mode : 0;
  req.body.FactoryID = req.body.FactoryID ? req.body.FactoryID.replace(/'/g, "''") : '';
  req.body.Factory_SubID = req.body.Factory_SubID ? req.body.Factory_SubID.replace(/'/g, "''") : '';

  var strSQL = format(` SELECT p.[FactoryID], p.[Factory_SubID]
  FROM [dbo].[Factory_Sub] p WITH (NoWait, Nolock)
  ${req.body.Mode == 0 ? '' : ' Inner Join Produce d on d.Factory_SubID = p.Factory_SubID '}
  Where p.History_Date is null
  ${req.body.FactoryID.length > 0 ? " And p.FactoryID = N'{FactoryID}'" : ""}
  ${req.body.Factory_SubID.length > 0 ? " And p.Factory_SubID = N'{Factory_SubID}'" : ""}
  Group by p.[FactoryID], p.[Factory_SubID]
  Order by p.FactoryID, p.Factory_SubID
  `, req.body);

  //console.log(strSQL)
  db.sql(req.body.Mode == 0 ? req.Enterprise : req.SiteDB, strSQL)
    .then((result) => {
      //console.log(result)
      res.send(result.recordset);
    }).catch((err) => {
      console.log(err);
      res.status(500).send(err);
    })
});

//取得Mould Location資料
router.post('/Mould_Location', function (req, res, next) {
  console.log("Call Mould_Location Api:", req.body);

  var strSQL = format(` SELECT p.[Factory_SubID] as location
  FROM [dbo].[Factory_Sub] p WITH (NoWait, Nolock)
  Where p.History_Date is null
  union
  Select SupplierID as location
  From Supplier s WITH (NoWait, Nolock)
  Where s.History_Date is null
  Order by location
  `, req.body);

  //console.log(strSQL)
  db.sql(req.Enterprise, strSQL)
    .then((result) => {
      //console.log(result)
      res.send(result.recordset);
    }).catch((err) => {
      console.log(err);
      res.status(500).send(err);
    })
});

//取得Produce Line資料
router.post('/Factory_Line', function (req, res, next) {
  console.log("Call Factory Line Api:", req.body);

  req.body.Produce_LineID = req.body.Produce_LineID ? `N'${req.body.Produce_LineID.trim().substring(0, 15).replace(/'/g, "''")}'` : '';
  req.body.Factory_SubID = req.body.Factory_SubID ? `N'${req.body.Factory_SubID.trim().substring(0, 15).replace(/'/g, "''")}'` : '';

  var strSQL = format(` SELECT p.[Produce_LineID], p.[Factory_SubID]
  FROM [dbo].[Produce_Line] p WITH (NoWait, Nolock)
  Where 1 = 1
  ${req.body.Produce_LineID.length > 0 ? " And p.Produce_LineID = {Produce_LineID}" : ""}
  ${req.body.Factory_SubID.length > 0 ? " And p.Factory_SubID = {Factory_SubID}" : ""}
  Order by p.Produce_LineID
  `, req.body);

  //console.log(strSQL)
  db.sql(req.Enterprise, strSQL)
    .then((result) => {
      //console.log(result)
      res.send(result.recordset);
    }).catch((err) => {
      console.log(err);
      res.status(500).send(err);
    })
});

//取得Produce_Line_Process資料
router.post('/Produce_Line_Process', function (req, res, next) {
  console.log("Call Produce_Line_Process Api:", req.body);

  req.body.Produce_LineID = req.body.Produce_LineID ? `N'${req.body.Produce_LineID.trim().substring(0, 15).replace(/'/g, "''")}'` : `''`;

  var strSQL = format(` SELECT p.[Produce_Line_ProcessID], p.[Produce_LineID], p.[Process_Name], p.[Process_Symbol]
  FROM [dbo].[Produce_Line_Process] p WITH (NoWait, Nolock)
  Where p.Produce_LineID = {Produce_LineID}
  Order by p.Process_Queue_No
  `, req.body);

  //console.log(strSQL)
  db.sql(req.Enterprise, strSQL)
    .then((result) => {
      //console.log(result)
      res.send(result.recordset);
    }).catch((err) => {
      console.log(err);
      res.status(500).send(err);
    })
});

//取得Beneficiary(Table Name: Credit_Accounts ) 資料
router.post('/Beneficiary', function (req, res, next) {
  console.log("Call Beneficiary Api:", req.body);
  req.body.AccountID = req.body.AccountID ? `${req.body.AccountID.trim().substring(0, 10).replace(/'/g, "''")}` : '';

  var strSQL = format(` SELECT p.[AccountID]
  FROM [dbo].[Credit_Accounts] p WITH (NoWait, Nolock)
  Where 1=1
  ${req.body.AccountID.length > 0 ? " And p.AccountID = N'{AccountID}'" : ""}
  Order by p.AccountID;
  `, req.body);

  //console.log(strSQL)
  db.sql(req.SiteDB, strSQL)
    .then((result) => {
      //console.log(result)
      res.send(result.recordset);
    }).catch((err) => {
      console.log(err);
      res.status(500).send(err);
    })
});

//Advising Bank (Table Name: Bank ) 資料
router.post('/Advising_Bank', function (req, res, next) {
  console.log("Call Advising_Bank Api:", req.body);

  req.body.Mode = req.body.Mode ? req.body.Mode : 0;
  req.body.S_Name = req.body.S_Name ? `${req.body.S_Name.trim().substring(0, 18).replace(/'/g, "''")}` : '';

  var strSQL = format(` SELECT p.[BankID], p.S_Name as Advising_Bank_Name, p.Account_No
  FROM [dbo].[Bank] p WITH (NoWait, Nolock)
  Where ABS(Advising_Bank) = 1
  ${req.body.S_Name.length > 0 ? " And p.S_Name = N'{S_Name}'" : ""}
  Order by p.S_Name;
  `, req.body);

  //console.log(strSQL)
  db.sql(req.SiteDB, strSQL)
    .then((result) => {
      //console.log(result)
      res.send(result.recordset);
    }).catch((err) => {
      console.log(err);
      res.status(500).send(err);
    })
});

//Get Bank
router.post('/Bank', function (req, res, next) {
  console.log("Call Bank Api:", req.body);

  var strSQL = format(` SELECT o.[BankID]
  , o.[S_Name]
  , o.[Name]
  , o.[E_Name]
  FROM [dbo].[Bank] o With(Nolock,NoWait)
  where ABS(isnull(o.[History], 0)) = 0
  `, req.body);
  //console.log(strSQL)
  db.sql(req.SiteDB, strSQL)
    .then((result) => {
      res.send(result.recordset);
    }).catch((err) => {
      console.log(err);
      res.status(500).send(err);
    })

});

//Get Currency Info
router.post('/Currency_Info', function (req, res, next) {
  console.log("Call Currency Info Api:");

  req.body.Period = req.body.Period ? `${req.body.Period.trim().substring(0, 10).replace(/'/g, '')}` : moment().format('YYYY/MM/DD');

  var strSQL = format(`
  SELECT Convert(varchar(10), cr.[Exchange_Date], 111) as [Exchange_Date]
  , cr.[Currency]
  , cr.[Currency_Rate]
  , c.Currency_Symbol
  , c.Country
  FROM [dbo].[@Currency_Rate] cr With(Nolock,NoWait)
  Inner Join Currency c With(Nolock,NoWait) on cr.Currency = c.Currency
  where cr.[Exchange_Date] = '{Period}'
  Order By cr.[Currency], cr.[Exchange_Date];
   `, req.body);
  //console.log(strSQL)

  db.sql(req.SiteDB, strSQL)
    .then((result) => {
      res.send(result.recordsets[0]);
    }).catch((err) => {
      console.log(err);
      res.status(500).send(err);
    })

});

//Check Region
router.post('/Check_Region', function (req, res, next) {
  console.log("Call Check_Region Api:", req.body);

  req.body.Region = req.body.Region ? `${req.body.Region.trim().toUpperCase().substring(0, 10).replace(/'/g, '')}` : '';

  var strSQL = format(`
  SELECT Count(*) as RecCount
  FROM [dbo].[Region] With(Nolock,NoWait)
  where ([Region] = N'{Region}')
  `, req.body);
  // console.log(strSQL)
  db.sql(req.Enterprise, strSQL)
    .then((result) => {
      //console.log(result.recordset[0].RecCount <= 0)
      res.send({ Flag: result.recordset[0].RecCount <= 0 });
    }).catch((err) => {
      console.log(err);
      res.status(500).send(err);
    })

});

//Get City Info
router.post('/City', function (req, res, next) {
  console.log("Call City Api:");

  req.body.City = req.body.City ? `${req.body.City.trim().substring(0, 20).replace(/'/g, '')}` : '';
  req.body.Country = req.body.Country ? `${req.body.Country.trim().substring(0, 15).replace(/'/g, '')}` : '';

  var strSQL = format(`
  SELECT Rtrim([Country]) as Country
  , Rtrim([City]) as City
  FROM [City] c with(NoLock, NoWait)
  where (1=1)
  And ('{City}' = '' or c.[City] like '{City}%')
  And ('{Country}' = '' or c.[Country] like '{Country}%')
  Order By c.[Country];
   `, req.body);
  //console.log(strSQL)

  db.sql(req.Enterprise, strSQL)
    .then((result) => {
      res.send(result.recordsets[0]);
    }).catch((err) => {
      console.log(err);
      res.status(500).send(err);
    })

});

//Get Region Info
router.post('/Region', function (req, res, next) {
  console.log("Call Region Api:");

  req.body.Region = req.body.Region ? `${req.body.Region.trim().substring(0, 10).replace(/'/g, '')}` : '';

  var strSQL = format(`
  SELECT Rtrim(r.[Region]) as Region
  FROM [Region] r with(NoLock, NoWait)
  where ('{Region}' = '' or r.[Region] like '{Region}%')
  Order By r.[Region];
   `, req.body);
  //console.log(strSQL)

  db.sql(req.Enterprise, strSQL)
    .then((result) => {
      res.send(result.recordsets[0]);
    }).catch((err) => {
      console.log(err);
      res.status(500).send(err);
    })

});

//Get Country Info
router.post('/Country', function (req, res, next) {
  console.log("Call Country Api:");

  req.body.Region = req.body.Region ? `${req.body.Region.trim().substring(0, 10).replace(/'/g, '')}` : '';

  var strSQL = format(`
  SELECT r.[Region] as Country
  FROM [Region] r with(NoLock, NoWait)
  where ('{Region}' = '' or r.[Region] like '{Country}%')
  Order By r.[Region];
   `, req.body);
  //console.log(strSQL)

  db.sql(req.Enterprise, strSQL)
    .then((result) => {
      res.send(result.recordsets[0]);
    }).catch((err) => {
      console.log(err);
      res.status(500).send(err);
    })

});

//Maintain Region
router.post('/Region_Maintain', function (req, res, next) {
  console.log("Call Region_Maintain Api:", req.body);

  // req.body.Mode === 0 表示新增
  // req.body.Mode === 1 表示修改
  // req.body.Mode === 2 表示刪除
  req.body.Region = req.body.Region ? `N'${req.body.Region.trim().substring(0, 10).replace(/'/g, "''")}'` : `''`;

  if (req.body.Mode === 1 && (req.body.Name == 'Region')) {
    var Size = 0;
    switch (req.body.Name) {
      case 'Region':
        Size = 10;
        break;
    }
    req.body.Value = req.body.Value ? `N'${req.body.Value.trim().substring(0, Size).replace(/'/g, "''")}'` : `''`;
  }

  var strSQL = 'Declare @ROWCOUNT int '
  switch (req.body.Mode) {
    case 0:
      strSQL += format(`
           Insert into [dbo].[Region] (Region)
           Select {Region} as Region
           Where (Select count(*) From Region c WITH(NoWait, Nolock) Where c.Region = {Region}) = 0 ;
           Set @ROWCOUNT = @@ROWCOUNT;
        `, req.body);
      break;
    case 1:
      strSQL += format(`
           Update [dbo].[Region] Set [{Name}] = {Value}
           where Region = {Region}
           And (SELECT Count(*) as RecCount FROM Region as p WITH (NoWait, Nolock) Where p.Region = {Value}) = 0 ;
           Set @ROWCOUNT = @@ROWCOUNT;
        `, req.body);
      break;
    case 2:
      strSQL += format(`
           Delete FROM [dbo].[Region]
           where Region = {Region} ;
           Set @ROWCOUNT = @@ROWCOUNT;
        `, req.body);
      break;
  }

  strSQL += format(`
  Select @ROWCOUNT as Flag;
  `, req.body);
  // console.log(strSQL)
  db.sql(req.Enterprise, strSQL)
    .then((result) => {
      //console.log(result.recordsets[0])
      res.send({ Flag: result.recordsets[0][0].Flag > 0 });
    }).catch((err) => {
      console.log(err);
      res.status(500).send(err);
    })
});

//Check Payment_Term
router.post('/Check_Payment_Term', function (req, res, next) {
  console.log("Call Check_Payment_Term Api:", req.body);

  req.body.Payment_Term = req.body.Payment_Term ? `${req.body.Payment_Term.trim().toUpperCase().substring(0, 20).replace(/'/g, '')}` : '';

  var strSQL = format(`
  SELECT Count(*) as RecCount
  FROM [dbo].[Payment_Term] With(Nolock,NoWait)
  where ([Payment_Terms] = N'{Payment_Term}')
  `, req.body);
  // console.log(strSQL)
  db.sql(req.Enterprise, strSQL)
    .then((result) => {
      //console.log(result.recordset[0].RecCount <= 0)
      res.send({ Flag: result.recordset[0].RecCount <= 0 });
    }).catch((err) => {
      console.log(err);
      res.status(500).send(err);
    })

});

//Get Payment_Term Info
router.post('/Payment_Term', function (req, res, next) {
  console.log("Call Payment_Term Api:");

  var strSQL = format(`
  SELECT p.Payment_Terms as Payment_Term
  FROM [dbo].[Payment_Term] p With(Nolock,NoWait)
  Order By p.Payment_Terms;
   `, req.body);
  //console.log(strSQL)

  db.sql(req.Enterprise, strSQL)
    .then((result) => {
      res.send(result.recordsets[0]);
    }).catch((err) => {
      console.log(err);
      res.status(500).send(err);
    })

});

//Maintain Payment Term
router.post('/Payment_Term_Maintain', function (req, res, next) {
  console.log("Call Payment_Term_Maintain Api:", req.body);

  // req.body.Mode === 0 表示新增
  // req.body.Mode === 1 表示修改
  // req.body.Mode === 2 表示刪除
  req.body.Payment_Term = req.body.Payment_Term ? `N'${req.body.Payment_Term.trim().substring(0, 20).replace(/'/g, "''")}'` : `''`;

  if (req.body.Mode === 1 && (req.body.Name == 'Payment_Terms')) {
    var Size = 0;
    switch (req.body.Name) {
      case 'Payment_Terms':
        Size = 20;
        break;
    }
    req.body.Value = req.body.Value ? `N'${req.body.Value.trim().substring(0, Size).replace(/'/g, "''")}'` : `''`;
  }

  var strSQL = 'Declare @ROWCOUNT int '
  switch (req.body.Mode) {
    case 0:
      strSQL += format(`
           Insert into [dbo].[Payment_Term] (Payment_Terms)
           Select {Payment_Term} as Payment_Terms
           Where (Select count(*) From Payment_Term c WITH(NoWait, Nolock) Where c.Payment_Terms = {Payment_Term}) = 0 ;
           Set @ROWCOUNT = @@ROWCOUNT;
        `, req.body);
      break;
    case 1:
      strSQL += format(`
           Update [dbo].[Payment_Term] Set [{Name}] = {Value}
           where Payment_Terms = {Payment_Term}
           And (SELECT Count(*) as RecCount FROM Payment_Term as p WITH (NoWait, Nolock) Where p.Payment_Terms = {Value}) = 0 ;
           Set @ROWCOUNT = @@ROWCOUNT;
        `, req.body);
      break;
    case 2:
      strSQL += format(`
           Delete FROM [dbo].[Payment_Term]
           where Payment_Terms = {Payment_Term} ;
           Set @ROWCOUNT = @@ROWCOUNT;
        `, req.body);
      break;
  }

  strSQL += format(`
  Select @ROWCOUNT as Flag;
  `, req.body);
  // console.log(strSQL)
  db.sql(req.Enterprise, strSQL)
    .then((result) => {
      //console.log(result.recordsets[0])
      res.send({ Flag: result.recordsets[0][0].Flag > 0 });
    }).catch((err) => {
      console.log(err);
      res.status(500).send(err);
    })
});

//Get Purchase_Responsible Info
router.post('/Purchase_Responsible', function (req, res, next) {
  console.log("Call Purchase_Responsible Api:");

  var strSQL = format(`
  SELECT p.Purchase_ResponsibleID, Purchase_Responsible
  FROM [dbo].[Purchase_Responsible] p With(Nolock,NoWait)
  Order By p.Purchase_ResponsibleID;
   `, req.body);
  //console.log(strSQL)

  db.sql(req.Enterprise, strSQL)
    .then((result) => {
      res.send(result.recordsets[0]);
    }).catch((err) => {
      console.log(err);
      res.status(500).send(err);
    })

});

//Get Sample_Type Info
router.post('/Sample_Type', function (req, res, next) {
  console.log("Call Sample_Type Api:");

  req.body.ProduceID = req.body.ProduceID ? `N'${req.body.ProduceID.trim().substring(0, 15).replace(/'/g, "''")}'` : `''`;
  req.body.Product_No = req.body.Product_No ? `N'${req.body.Product_No.trim().substring(0, 25).replace(/'/g, "''")}'` : `''`;

  var strSQL = format(`
  SELECT p.Sample_TypeID, p.Sample_Type
  FROM [dbo].[Sample_Type] p With(Nolock,NoWait)
  Order By p.SortID;
   `, req.body);
  //console.log(strSQL)

  db.sql(req.Enterprise, strSQL)
    .then((result) => {
      res.send(result.recordsets[0]);
    }).catch((err) => {
      console.log(err);
      res.status(500).send(err);
    })

});

//Get Currency
router.post('/Currency', function (req, res, next) {
  console.log("Call Currency Api :", req.body);

  var strSQL = format(`
    SELECT p.[Currency], p.[Currency_Symbol]
    FROM Currency as p with(NoLock, NoWait)
   `
    , req.body);
  //console.log(strSQL);

  db.sql(req.Enterprise, strSQL)
    .then((result) => {
      res.send(result.recordset);
    }).catch((err) => {
      console.log(err);
      res.status(500).send(err);
    })

});

// 取得 Factory_Work_Gang 資料
router.post('/Factory_Work_Gang', function (req, res, next) {
  console.log("Call Factory_Work_Gang Api");

  req.body.Factory_SubID = req.body.Factory_SubID ? `N'${req.body.Factory_SubID.trim().substring(0, 15).replace(/'/g, "''")}'` : `''`;

  var strSQL = format(`SELECT Work_GangID, Factory_SubID, Work_Gang_Name, Persons, Pairs_Day, WorkshopID
  FROM Factory_Work_Gang as p WITH (NoWait, Nolock)
  WHERE ({Factory_SubID} ='' or p.Factory_SubID = {Factory_SubID} )
  Order By Work_Gang_Name
  `, req.body);

  //console.log(strSQL)
  db.sql(req.Enterprise, strSQL)
    .then((result) => {
      //console.log(result)
      res.send(result.recordset);
    }).catch((err) => {
      console.log(err);
      res.status(500).send(err);
    })
});

//Get Product_Warehouse
router.post('/Product_Warehouse', function (req, res, next) {
  console.log("Call Product_Warehouse Api:");

  req.body.Product_WarehouseID = req.body.Product_WarehouseID ? `${req.body.Product_WarehouseID.trim().substring(0, 10).replace(/'/g, '')}` : '';

  var strSQL = format(`
  SELECT r.[Product_WarehouseID], r.[Product_Warehouse_RankID], r.[Rank_Name]
  FROM [Product_Warehouse_Rank] r with(NoLock, NoWait)
  where r.History_Date is null
  And ('{Product_WarehouseID}' = '' or r.[Product_WarehouseID] like '{Product_WarehouseID}%')
  Order By r.[Product_WarehouseID];
   `, req.body);
  //console.log(strSQL)

  db.sql(req.SiteDB, strSQL)
    .then((result) => {

      let Product_Warehouse = [...result.recordsets[0].reduce((r, e) => {
        let k = `${e.Product_WarehouseID}`;
        if (!r.has(k)) {
          // console.log(r)
          r.set(k, {
            Product_WarehouseID: e.Product_WarehouseID
          })
        }
        return r;
      }, new Map).values()]

      Product_Warehouse.forEach((item) => {
        item.Product_Warehouse_Rank = result.recordsets[0].filter((data) => (data.Product_WarehouseID == item.Product_WarehouseID))
      })
      res.send({ Product_Warehouse: Product_Warehouse });
    }).catch((err) => {
      console.log(err);
      res.status(500).send(err);
    })

});

//Get Warehouse
router.post('/Warehouse', function (req, res, next) {
  console.log("Call Warehouse Api:");

  var strSQL = format(`
  SELECT [WarehouseID], [Address_Cht], [Address_Eng]
  FROM [Warehouse] r with(NoLock, NoWait)
  where r.History_Date is null
  --And r.[OrganizationID] = (Select OrganizationID from Control)
  Order By r.[WarehouseID];
   `, req.body);
  //console.log(strSQL)

  db.sql(req.SiteDB, strSQL)
    .then((result) => {
      res.send(result.recordsets[0]);
    }).catch((err) => {
      console.log(err);
      res.status(500).send(err);
    })
});

//Get Warehouse_Rank
router.post('/Warehouse_Rank', function (req, res, next) {
  console.log("Call Warehouse_Rank Api:");

  var strSQL = format(`
  SELECT r.[WarehouseID]
  , wr.Warehouse_RankID
  , wr.Rank_Name
  FROM [Warehouse] r with(NoLock, NoWait)
  Inner Join Warehouse_Rank wr with(NoLock, NoWait) on r.[WarehouseID] = wr.WarehouseID
  where r.History_Date is null
  And r.[OrganizationID] = (Select OrganizationID from Control)
  And wr.History_Date is null
  Order By r.[WarehouseID];
   `, req.body);
  //console.log(strSQL)

  db.sql(req.SiteDB, strSQL)
    .then((result) => {
      res.send(result.recordsets[0]);
    }).catch((err) => {
      console.log(err);
      res.status(500).send(err);
    })
});

//Get Site_Switch
router.post('/Site_Switch', function (req, res, next) {
  console.log("Call Site_Switch Api:");

  req.body.ProgramID = req.body.ProgramID ? req.body.ProgramID : null;

  var strSQL = format(` Declare @ProgramID int = {ProgramID}, @Site_Switch int
  set @Site_Switch = isnull(
    (SELECT isnull(sm.Site_Switch,0) as Site_Switch
    FROM Shortcut_Menu sm with(NoLock,NoWait)
    INNER JOIN Program p with(NoLock,NoWait) ON sm.Shortcut_MenuID = p.Shortcut_MenuID
    WHERE p.ProgramID = @ProgramID) ,0);
  select cast(@Site_Switch as bit) as Site_Switch
    `, req.body);
  //console.log(strSQL)

  db.sql(req.Enterprise, strSQL)
    .then((result) => {
      //console.log(result.recordset[0])
      res.send({ Site_Switch_Flag: result.recordset[0].Site_Switch });
    }).catch((err) => {
      console.log(err);
      res.status(500).send(err);
    })

});

//Get Shortcut_Menu
router.post('/Shortcut_Menu', function (req, res, next) {
  console.log("Call Shortcut_Menu Api:");

  req.body.ProgramID = req.body.ProgramID ? req.body.ProgramID : null;

  var strSQL = format(` Declare @ProgramID int = {ProgramID}

  SELECT Shortcut_Menu_Detail.Shortcut_Menu_DetailID
  , Shortcut_Menu_Detail.Symbol
  , Shortcut_Menu_Detail.Name
  , isnull(Shortcut_Menu_Detail.Hint,'') as Hint
  , Shortcut_Menu_Detail.Menu_Type
  , Shortcut_Menu_Detail.Newcouple
  , Shortcut_Menu_Detail.ProgramID
  , Shortcut_Menu_Detail.URL
  , Shortcut_Menu_Detail.SortID
  , Shortcut_Menu_Detail.Win_Mode
  , ISNULL(Shortcut_Menu_Detail.Win_Width, 0) AS Win_Width
  , ISNULL(Shortcut_Menu_Detail.Win_Height, 0) AS Win_Height
  , ISNULL(Shortcut_Menu_Detail.Win_Top, 0) AS Win_Top
  , ISNULL(Shortcut_Menu_Detail.Win_Left, 0) AS Win_Left
  , Shortcut_Menu_Detail.Muilti_Win
  , Shortcut_Menu_Detail.Shortcut_MenuID
  , CASE WHEN Newcouple = 1 THEN 'menubox Newcouple' ELSE 'menubox' END AS CSSClass
  , CASE WHEN Menu_Type = 'Program' THEN App_Site.Sit_Name + N'-url:' + Program_1.App_Path ELSE N'url:' + URL END AS Link_Path
  , Shortcut_Menu_Detail.OutofLink
  , Program.ProgramID AS Expr1
  FROM Program
  LEFT OUTER JOIN Shortcut_Menu_Detail ON Program.Shortcut_MenuID = Shortcut_Menu_Detail.Shortcut_MenuID
  LEFT OUTER JOIN App_Site
  RIGHT OUTER JOIN Program AS Program_1 ON App_Site.App_SiteID = Program_1.App_SiteID ON Shortcut_Menu_Detail.ProgramID = Program_1.ProgramID
  WHERE (Program.ProgramID = @ProgramID) AND (Program.Shortcut_MenuID IS NOT NULL) ORDER BY Shortcut_Menu_Detail.SortID

   `, req.body);
  //console.log(strSQL)

  db.sql(req.Enterprise, strSQL)
    .then((result) => {

      res.send(result.recordset);
    }).catch((err) => {
      console.log(err);
      res.status(500).send(err);
    })

});

//Get Material's Quarlity_Demands
router.post('/Material_Quarlity_Demands', function (req, res, next) {
  console.log("Call Material_Quarlity_Demands Api:");

  var strSQL = format(`
  SELECT [Material_GroupID], [Material_Group], [Quarlity_Demands]
  FROM [Material_Group] mg with(NoLock, NoWait)
   `, req.body);
  //console.log(strSQL)

  db.sql(req.Enterprise, strSQL)
    .then((result) => {
      res.send(result.recordsets[0]);
    }).catch((err) => {
      console.log(err);
      res.status(500).send(err);
    })
});

//Get Location
router.post('/Location', function (req, res, next) {
  console.log("Call Location Api :", req.body);

  var strSQL = format(`
    SELECT og.[LocationID]
    , og.[Location]
    , cast(og.[LocationID] as varchar) + ' ' + og.[Location] as label
    , og.[OrganizationID]
    FROM Organization_Location as og with(NoLock, NoWait)
   `
    , req.body);
  //console.log(strSQL);

  db.sql(req.Enterprise, strSQL)
    .then((result) => {
      res.send(result.recordset);
    }).catch((err) => {
      console.log(err);
      res.status(500).send(err);
    })

});

//Get Material_Control
router.post('/Material_Control', function (req, res, next) {
  console.log("Call Material_Control Api:");

  var strSQL = format(`
SELECT TOP (1000) [Material_ControlID]
      ,[Material_Control]
      ,[Material_Category]
      ,[Category_Remark]
      ,[Material_Specific]
      ,[Specific_Remark]
      ,[Material_Color]
      ,[Color_Remark]
      , c.[Material_GroupID]
      , g.Material_Group
      ,[Material_Specific_Lock]
      ,[Size_Run_Ck]
      ,[Quality_Demands]
  FROM [ENTERPRISE].[dbo].[Material_Control] c
  Inner join Material_Group g on g.Material_GroupID = c.Material_GroupID
  Order By c.[Material_ControlID];
   `, req.body);
  //console.log(strSQL)

  db.sql(req.Enterprise, strSQL)
    .then((result) => {
      res.send(result.recordsets[0]);
    }).catch((err) => {
      console.log(err);
      res.status(500).send(err);
    })
});

//Get Approve Report
router.post('/Approve_Report', function (req, res, next) {
  console.log("Call Approve_Report Api :", req.body);

  //req.body.DepartmentID = req.body.DepartmentID ? req.body.DepartmentID : '';

  var strSQL = format(`WITH TEMPDATA AS (
      SELECT 0 AS ProgramID
      , Program_GroupID
      , CONVERT(nvarchar(50), ' -- ' + Program_Group + ' -- ') AS Program_Display
      , NULL AS Program_Name
      , 0 AS HLevel
      , SortID
      FROM dbo.Program_Group
      UNION
      SELECT TOP (100) PERCENT ProgramID
      , Program_GroupID
      , Program_Name AS Program_Display
      , Program_Name
      , 1 AS HLevel
      , SortID
      FROM dbo.Program
      WHERE (Program_Name like '%%')
    )
    SELECT TOP (100) PERCENT ProgramID, REPLICATE('      ', HLevel) + Program_Display AS Program_Display, Program_Name
     FROM TEMPDATA AS TEMPDATA_1
     ORDER BY Program_GroupID, HLevel, SortID
   `
    , req.body);
  //console.log(strSQL);

  db.sql(req.Enterprise, strSQL)
    .then((result) => {
      res.send(result.recordset);
    }).catch((err) => {
      console.log(err);
      res.status(500).send(err);
    })

});

//Check Report Department 
router.post('/Check_Report_Department', function (req, res, next) {
  console.log("Call Check_Report_Department Api :", req.body);

  req.body.ProgramID = req.body.ProgramID ? req.body.ProgramID : null;
  req.body.Doc_NO = req.body.Doc_NO ? req.body.Doc_NO : null;
  
  var strSQL = format(`
    Declare @Department_Code nvarchar(5)

    if({ProgramID} = 78 )
    Begin
      set @Department_Code = (Select Department from Order_Approve where Order_ApproveID = '{Doc_NO}')
    End 

    if({ProgramID} = 120 or {ProgramID} = 126 or {ProgramID} = 390)
    Begin
      set @Department_Code = (Select Department from Debit where Debit_NO = '{Doc_NO}')
    End 

    if({ProgramID} = 33 )
    Begin
/*    
          Set @Department_Code = (Select d.Department_Code 
                              From Customer c 
                              Inner Join aspnet_Users au on au.LoweredUserName = c.Data_Updater 
                              Inner Join Employee e on e.EmployeeID = au.EmployeeID
                              Inner Join Department d on e.DepartmentID = d.DepartmentID 
                              where c.CustomerID = '{Doc_NO}' )    
*/

          Set @Department_Code = (Select c.Department
                              From Customer c 
                              where c.CustomerID = '{Doc_NO}' )    

    End

    if({ProgramID} = 391)
    begin
/*
      Set @Department_Code = (Select d.Department_Code 
                          From Customer_Payment_Group c 
                          Inner Join aspnet_Users au on au.LoweredUserName = c.Data_Updater 
                          Inner Join Employee e on e.EmployeeID = au.EmployeeID
                          Inner Join Department d on e.DepartmentID = d.DepartmentID 
                          where c.Customer_Payment_GroupID = '{Doc_NO}' )
*/

      Set @Department_Code = (Select c.Department
                          From Customer_Payment_Group cpg 
                          Inner Join Customer c on c.CustomerID = cpg.CustomerID
                          where cpg.Customer_Payment_GroupID = '{Doc_NO}' )

    End
    SELECT iif(d.Department_Code = @Department_Code, 1, 0) as Flag
    FROM Employee e with(NoLock, NoWait)
    Inner Join aspnet_Users s on e.EmployeeID = s.EmployeeID
    Inner join Department d on e.DepartmentID = d.DepartmentID 
    Where s.LoweredUserName = '${req.UserID}';

    SELECT s.LoweredUserName, e.Email
    FROM Employee e with(NoLock, NoWait)
    Inner Join aspnet_Users s on e.EmployeeID = s.EmployeeID
    Inner join Department d on e.DepartmentID = d.DepartmentID 
    Where d.Department_Code = @Department_Code
    And e.Leave_Job_Date is null;    
   `
    , req.body);
  //console.log(strSQL);

  db.sql(req.SiteDB, strSQL)
    .then((result) => {
      res.send({Flag: result.recordsets[0][0].Flag, Department_Approve_Info: result.recordsets[1]});
    }).catch((err) => {
      console.log(err);
      res.status(500).send(err);
    })

});


//Get Department Employee
router.post('/Employee', function (req, res, next) {
  console.log("Call Employee Api :", req.body);

  req.body.DepartmentID = req.body.DepartmentID ? req.body.DepartmentID : '';

  var strSQL = format(`
    SELECT e.[EmployeeID]
    , e.[Chinese_Name]
    , e.DepartmentID
    FROM Employee e with(NoLock, NoWait)
    Inner JOIN Department d ON e.DepartmentID = d.DepartmentID 
    Inner Join aspnet_Users s on e.EmployeeID = s.EmployeeID
    Where ('{DepartmentID}' = '' or  e.DepartmentID = '{DepartmentID}')
    and e.Leave_Job_Date is null
    and e.Attendance_ClassID <> 4
    Order by e.Employee_TitleID
    --Order by d.Main_Group, d.SortID, e.Employee_TitleID, CASE WHEN e.Extension IS NULL THEN 1 ELSE 0 END, ISNULL(e.Extension, '')
   `
    , req.body);
  //console.log(strSQL);

  db.sql(req.Enterprise, strSQL)
    .then((result) => {
      res.send(result.recordset);
    }).catch((err) => {
      console.log(err);
      res.status(500).send(err);
    })

});

//Get Approve_Control List
router.post('/Approve_Control_List', function (req, res, next) {
  console.log("Call Approve_Control_List Api:",req.body);

  req.body.Approve_ControlID = req.body.Approve_ControlID ? req.body.Approve_ControlID : null;
  req.body.ProgramID = req.body.ProgramID ? req.body.ProgramID : null;
  req.body.Program_Name = req.body.Program_Name ? req.body.Program_Name.replace(/'/g, "''") : '';
  req.body.DepartmentID = req.body.DepartmentID ? req.body.DepartmentID : null;
  req.body.Department = req.body.Department ? req.body.Department.replace(/'/g, "''") : '';
  req.body.Department_Code = req.body.Department_Code ? req.body.Department_Code.replace(/'/g, "''") : '';
  req.body.Stage_No = req.body.Stage_No ? req.body.Stage_No : null;
  req.body.Approve_EmployeeID = req.body.Approve_EmployeeID ? req.body.Approve_EmployeeID.replace(/'/g, "''") : '';
  req.body.LoweredUserName = req.body.LoweredUserName ? req.body.LoweredUserName.replace(/'/g, "''") : '';
  req.body.Chinese_Name = req.body.Chinese_Name ? req.body.Chinese_Name.replace(/'/g, "''") : '';
  req.body.Approval_Limit = req.body.Approval_Limit ? req.body.Approval_Limit : null;
  req.body.Force_Approved = req.body.Force_Approved ? req.body.Force_Approved : null;
  req.body.Employee_Title = req.body.Employee_Title ? req.body.Employee_Title.replace(/'/g, "''") : '';
 
  var strSQL = format(`
SELECT distinct c.ProgramID
  , p.Program_Name
  , c.DepartmentID
  , d.Department
  , d.Department_Code
/*  
  , c.Stage_No
  , c.Approve_EmployeeID
  , u.LoweredUserName
  , e.Chinese_Name
  , c.Approval_Limit
  , c.Force_Approved
  , t.Employee_Title
*/  
  FROM [dbo].[Approve_Control] c
  Inner Join [dbo].[Department] d on c.DepartmentID = d.DepartmentID
  Inner Join [dbo].[Employee] e on c.Approve_EmployeeID = e.EmployeeID
  Inner Join [dbo].[Employee_Title] t on e.Employee_TitleID = t.Employee_TitleID
  Inner Join Aspnet_Users u on e.EmployeeID = u.EmployeeID
  Inner Join Program p on c.ProgramID = p.ProgramID
  Where (isnull({Approve_ControlID},0) = 0 or c.Approve_ControlID = {Approve_ControlID})
  And (isnull({ProgramID},0) = 0 or c.ProgramID = {ProgramID})
  And ('{Program_Name}' = '' or p.Program_Name like '%{Program_Name}%')
  And (isnull({DepartmentID},0) = 0 or c.DepartmentID = {DepartmentID})
  And ('{Department}' = '' or d.Department like '%{Department}%')
  And ('{Department_Code}' = '' or d.Department_Code like '%{Department_Code}%')
  And (isnull({Stage_No},0) = 0 or c.Stage_No = {Stage_No})
  And ('{Approve_EmployeeID}' = '' or c.Approve_EmployeeID like '%{Approve_EmployeeID}%')
  And ('{LoweredUserName}' = '' or u.LoweredUserName like '%{LoweredUserName}%')
  And ('{Chinese_Name}' = '' or e.Chinese_Name like '%{Chinese_Name}%')
  And (isnull({Approval_Limit},0) = 0 or c.Approval_Limit = {Approval_Limit})
  And (isnull({Force_Approved},0) = 0 or c.Force_Approved = {Force_Approved})
  And ('{Employee_Title}' = '' or t.Employee_Title like '%{Employee_Title}%')  
  Order By c.ProgramID, c.DepartmentID desc;
   `, req.body);
  console.log(strSQL)

  db.sql(req.Enterprise, strSQL)
    .then((result) => {
      res.send(result.recordsets[0]);
    }).catch((err) => {
      console.log(err);
      res.status(500).send(err);
    })
});

//Get Approve_Control Info
router.post('/Approve_Control_Info', function (req, res, next) {
  console.log("Call Approve_Control_Info Api:",req.body);

  req.body.Approve_ControlID = req.body.Approve_ControlID ? req.body.Approve_ControlID : null;
  req.body.ProgramID = req.body.ProgramID ? req.body.ProgramID : null;
  req.body.DepartmentID = req.body.DepartmentID ? req.body.DepartmentID : null;
 
  var strSQL = format(`Declare @UserID nvarchar(256) = '${req.UserID}'
    , @ProgramID int = {ProgramID}, @DepartmentID nvarchar(255) = '{DepartmentID}'

SELECT c.Approve_ControlID
  , c.ProgramID
  , p.Program_Name
  , c.DepartmentID
  , d.Department
  , d.Department_Code
  , c.Stage_No
  , c.Force_Approved
  , c.Approve_EmployeeID
  , e.Chinese_Name 
  , c.Approval_Limit
  , t.Employee_Title as Approval_Title
  , s.LoweredUserName
  FROM [dbo].[Approve_Control] c
  Inner Join Program p on c.ProgramID = p.ProgramID
  Inner Join Employee e on c.Approve_EmployeeID = e.EmployeeID
  Inner Join Employee_Title t on e.Employee_TitleID = t.Employee_TitleID
  Inner Join aspnet_Users s on e.EmployeeID = s.EmployeeID
  Inner Join Department d on d.DepartmentID = c.DepartmentID
  Where c.ProgramID = @ProgramID
  And c.DepartmentID = @DepartmentID
  Order By c.[Stage_No] desc;
   `, req.body);
  //console.log(strSQL)

  db.sql(req.Enterprise, strSQL)
    .then((result) => {
      res.send(result.recordsets[0]);
    }).catch((err) => {
      console.log(err);
      res.status(500).send(err);
    })
});

//Maintain Approve_Control
router.post('/Approve_Control_Maintain', function (req, res, next) {
  console.log("Call Approve_Control_Maintain Api:", req.body);

  // req.body.Mode === 0 表示新增 Approve_Control
  // req.body.Mode === 1 表示修改 Approve_Control
  // req.body.Mode === 2 表示刪除 Approve_Control
  // req.body.Mode === 3 表示產生系統組織產生控制流程 Approve_Control

  req.body.ProgramID = req.body.ProgramID ? req.body.ProgramID : null;
  req.body.Approve_ControlID = req.body.Approve_ControlID ? req.body.Approve_ControlID : null;
  req.body.DepartmentID = req.body.DepartmentID ? req.body.DepartmentID : '';


  var strSQL = 'Declare @ROWCOUNT int '
  switch (req.body.Mode) {
    case 0:
      req.body.EmployeeID = req.body.EmployeeID ? req.body.EmployeeID.replace(/'/g, "''") : '';
      strSQL += format(`
        Declare @ProgramID int = {ProgramID}
        ,@DepartmentID int = {DepartmentID}
        ,@EmployeeID nvarchar(256) = '{EmployeeID}'
        ,@UserID nvarchar(256) = '${req.UserID}'

        Insert Approve_Control(ProgramID, DepartmentID, Stage_No, Approve_EmployeeID, Approval_Limit, force_Approved)
        Select @ProgramID as ProgramID
        , @DepartmentID as DepartmentID
        , (Select count(*) From Approve_Control ac Where ac.ProgramID = @ProgramID and ac.DepartmentID = @DepartmentID) + 1 as Stage_No
        , @EmployeeID as Approve_EmployeeID
        , 0 as Approval_Limit
        , cast(0 as bit) as force_Approved

        Set @ROWCOUNT = @@ROWCOUNT;
        `, req.body);
      break;
    case 1:
      switch (req.body.Name) {
        case "Stage_No":
          strSQL += format(`
            Update [dbo].[Approve_Control] Set [Stage_No] = {Value}
            From [dbo].[Approve_Control] c
            where c.Approve_ControlID = {Approve_ControlID};

            Set @ROWCOUNT = @@ROWCOUNT;
          `, req.body);     
        break;
        case "Approval_Limit":
          strSQL += format(`
            Update [dbo].[Approve_Control] Set [Approval_Limit] = {Value}
            From [dbo].[Approve_Control] c
            where c.Approve_ControlID = {Approve_ControlID};

            Set @ROWCOUNT = @@ROWCOUNT;
          `, req.body);     
        break;
        case "Force_Approved":
          strSQL += format(`
            Update [dbo].[Approve_Control] Set [Force_Approved] = {Value}
            From [dbo].[Approve_Control] c
            where c.Approve_ControlID = {Approve_ControlID};

            Set @ROWCOUNT = @@ROWCOUNT;
          `, req.body);     
        break;
      }
      break;
    case 2:
      strSQL += format(`
           Delete FROM [dbo].[Approve_Control]
           where Approve_ControlID = {Approve_ControlID};
           Set @ROWCOUNT = @@ROWCOUNT;
        `, req.body);
      break;
    case 3:
      req.body.EmployeeID = req.body.EmployeeID ? req.body.EmployeeID.replace(/'/g, "''") : '';
      strSQL += format(`
Declare @UserID nvarchar(256) = '{EmployeeID}',@Superior nvarchar(256) = ''
Declare @tmpTable table(ID int IDENTITY(0,1), EmployeeID varchar(20), DepartmentID int, Account varchar(256), EMail varchar(256), Superior Varchar(20))

Set @Superior =  (Select LoweredUserName From aspnet_Users s Where s.EmployeeID = @UserID)

while(@Superior <> '')
Begin
    Insert @tmpTable(EmployeeID, DepartmentID, Account, EMail, Superior)
    Select e.EmployeeID, e.DepartmentID, s.LoweredUserName as Account, e.Email, us.LoweredUserName as Superior
    From Employee e 
    Inner Join aspnet_Users s on e.EmployeeID = s.EmployeeID
    Inner Join UsersOnSuperiors us on us.OnSuperior = s.LoweredUserName
    where s.LoweredUserName = @Superior;
    
    if(@@ROWCOUNT>0)
    Begin
        Select top 1 @Superior = Superior From @tmpTable Order by ID desc 
    End
    else 
    Begin 
        Insert @tmpTable(EmployeeID, DepartmentID, Account, EMail, Superior)
        Select e.EmployeeID, e.DepartmentID, s.LoweredUserName as Account, e.Email, null as Superior
        From Employee e 
        Inner Join aspnet_Users s on e.EmployeeID = s.EmployeeID
        where s.LoweredUserName = @Superior;
        Set @Superior = ''
    End
End

/*
Select EmployeeID, {DepartmentID} as DepartmentID, Account, EMail, Superior 
From @tmpTable t 
Inner join Department d on t.DepartmentID = d.DepartmentID
*/

Insert Approve_Control(ProgramID, DepartmentID, Stage_No, Approve_EmployeeID, Approval_Limit, Force_Approved)
Select {ProgramID} as ProgramID, {DepartmentID} as DepartmentID, t.ID as Stage_No, EmployeeID as Approve_EmployeeID, 0 as Approval_Limit, cast(0 as bit) as Force_Approved
From @tmpTable t 
Inner join Department d on t.DepartmentID = d.DepartmentID
Where id > 0

Set @ROWCOUNT = @@ROWCOUNT;
        `, req.body);
      break;
  }

  strSQL += format(`
  Select @ROWCOUNT as Flag;
  `, req.body);
  console.log(strSQL)

   db.sql(req.SiteDB, strSQL)
   .then(async (result) => {
     //console.log(result.recordsets[0])
     //res.send({ Flag: result.recordsets[0][0].Flag > 0 });

     res.send({ Flag: result.recordsets[0][0].Flag > 0 });  
      
   }).catch((err) => {
     console.log(err);
     res.status(500).send(err);
   })
});

//Get Approve_Detail Info
router.post('/Approve_Detail_Info', function (req, res, next) {
  console.log("Call Approve_Detail_Info Api:",req.body);

  req.body.ProgramID = req.body.ProgramID ? req.body.ProgramID : null;
  req.body.Doc_NO = req.body.Doc_NO ? req.body.Doc_NO : null;
  req.body.Site = req.body.Site ? req.body.Site : null;
 
  var strSQL = format(`Declare @UserID nvarchar(256) = '${req.UserID}'
    , @ProgramID int = {ProgramID}, @Doc_NO nvarchar(255) = '{Doc_NO}',  @Site nvarchar(10) = '{Site}'

SELECT c.Approve_DetailID
  , c.ProgramID
  , c.Doc_No
  , c.Stage_No
  , c.Force_Approved
  , c.Approver_UserID
  , c.Approver_Email
  , c.Approver_Title
  , c.Approver_Comment
  , cast(iif(c.Approved_Date is null,0,1) as bit) as Approver_CHK
  , iif(c.Stage_No = 0,
    cast({Approver_UserID_Flag} as bit)
  ,
  iif(c.Force_Approved = 0,
  cast((case when Approver_UserID =  @UserID
      And ( isnull( (Select iif( Approved_Date is null,1,0) a From [dbo].[Approve_Detail] a Where a.ProgramID = c.ProgramID And a.Doc_NO = c.Doc_NO And a.Site = @Site And a.Stage_No = c.Stage_No + 1),1) ) =1
      And ( isnull( (Select iif( Approved_Date is null,0,1) a From [dbo].[Approve_Detail] a Where a.ProgramID = c.ProgramID And a.Doc_NO = c.Doc_NO And a.Site = @Site And a.Stage_No = c.Stage_No - 1),1) ) =1
    then 1 else 0 end
  ) as bit) ,
  cast((case when Approver_UserID =  @UserID
      And ( isnull( (Select iif( Approved_Date is null,0,1) a From [dbo].[Approve_Detail] a Where a.ProgramID = c.ProgramID And a.Doc_NO = c.Doc_NO And a.Site = @Site And a.Stage_No = c.Stage_No - 1),1) ) =1
    then 1 else 0 end
  ) as bit)
  ) )as Approve_Flag
  , 0 as Approver_Reject
  , (case when Approver_UserID =  @UserID
      And ( isnull( (Select iif( Approved_Date is null,1,0) a From [dbo].[Approve_Detail] a Where a.ProgramID = c.ProgramID And a.Doc_NO = c.Doc_NO And  a.Stage_No = c.Stage_No + 1),1) ) =1
      And ( isnull( (Select iif( Approved_Date is null,0,1) a From [dbo].[Approve_Detail] a Where a.ProgramID = c.ProgramID And a.Doc_NO = c.Doc_NO And  a.Stage_No = c.Stage_No - 1),1) ) =1
      And isnull(Approver_Comment,'') <> ''
      then 1 else 0 end
     ) as Reject_Flag
  , (case when Approver_UserID =  @UserID or ({Approver_UserID_Flag} = 1)
      then 1 else 0 end
     ) as Comment_Flag      
  , Convert(nvarchar(20), Approved_Date,120) as Approved_Date
  , Convert(nvarchar(5), Approved_Date,114) as Approved_Date_S
  FROM [dbo].[Approve_Detail] c
  Where c.ProgramID = @ProgramID
  And Doc_NO = @Doc_NO
  And Site = @Site
  Order By c.[Stage_No] desc;
   `, req.body);
  //console.log(strSQL)

  db.sql(req.Enterprise, strSQL)
    .then((result) => {
      res.send(result.recordsets[0]);
    }).catch((err) => {
      console.log(err);
      res.status(500).send(err);
    })
});

//Maintain Approve Detail
router.post('/Approve_Detail_Maintain', function (req, res, next) {
  console.log("Call Approve_Detail_Maintain Api:", req.body);

  // req.body.Mode === 0 表示Generate Approve Detail
  // req.body.Mode === 1 表示修改Approve Detail
  // req.body.Mode === 2 表示刪除Approve Detail

  req.body.ProgramID = req.body.ProgramID ? req.body.ProgramID : null;
  req.body.Doc_NO = req.body.Doc_NO ? req.body.Doc_NO : null;
  req.body.Site = req.body.Site ? req.body.Site : null;

  var strSQL = 'Declare @ROWCOUNT int '
  switch (req.body.Mode) {
    case 0:
      req.body.Department = req.body.Department ? req.body.Department.replace(/'/g, "''") : '';
      req.body.Value = req.body.Value ? req.body.Value : 0;
      strSQL += format(`
        Declare @ProgramID int = {ProgramID}
        ,@DepartmentID int 
        ,@UserID nvarchar(256) = '${req.UserID}'
        ,@Doc_No nvarchar(256) = '{Doc_NO}'
        ,@Value float = {Value}
        ,@Department nvarchar(256) 

        -- Order Approve 訂單接受單
        if(@ProgramID = 78)
        begin
          Set @Department = (Select Department From Order_Approve oa where oa.Order_ApproveID = @Doc_No )
          Update Order_Approve set Approve_Date = null
          Where Order_ApproveID = @Doc_No;          
        End

        -- 120 Debit Note, 126 Model Debit, 390 Credit Note
        if(@ProgramID = 120 or {ProgramID} = 126 or @ProgramID = 390)
        begin
          Set @Department = (Select Department From Debit oa where oa.Debit_No = @Doc_No )
          Update Debit set Approve = null
          , Approve_Date = null
          Where Debit_NO = @Doc_No;
        End

        -- 33 Customer
        if(@ProgramID = 33)
        begin
/*        
          Set @Department = (Select d.Department_Code 
                              From Customer c 
                              Inner Join aspnet_Users au on au.LoweredUserName = c.Data_Updater 
                              Inner Join Employee e on e.EmployeeID = au.EmployeeID
                              Inner Join Department d on e.DepartmentID = d.DepartmentID 
                              where c.CustomerID = @Doc_No )
 */
          Set @Department = (Select c.Department
                              From Customer c 
                              where c.CustomerID = @Doc_No )    

          Update Customer set Financial_Approver = null
          , Financial_Approve_Date = null
          , Supervisor = null
          , Supervisor_Approved_Date = null
          Where CustomerID = @Doc_No;
        End


        -- 391 Customer Payment Group
        if(@ProgramID = 391)
        begin
/*        
          Set @Department = (Select d.Department_Code 
                              From Customer_Payment_Group c 
                              Inner Join aspnet_Users au on au.LoweredUserName = c.Data_Updater 
                              Inner Join Employee e on e.EmployeeID = au.EmployeeID
                              Inner Join Department d on e.DepartmentID = d.DepartmentID 
                              where c.Customer_Payment_GroupID = @Doc_No )
*/
      Set @Department = (Select c.Department
                          From Customer_Payment_Group cpg 
                          Inner Join Customer c on c.CustomerID = cpg.CustomerID
                          where cpg.Customer_Payment_GroupID = @Doc_No )


          Update Customer_Payment_Group set Financial_Approver = null
          , Financial_Approve_Date = null
          , Supervisor = null
          , Supervisor_Approved_Date = null
          Where Customer_Payment_GroupID = @Doc_No;
        End


        Set @DepartmentID = (Select DepartmentID From Department p Where p.Department_Code = @Department)
        if( (Select count(*) From Approve_Detail ad where ad.ProgramID = @ProgramID And ad.doc_NO = @Doc_No And ad.Site = '{Site}' ) = 0 )
        Begin
            Insert Approve_Detail(Site, ProgramID, Doc_No, Stage_NO, Force_Approved, Approver_UserID, Approver_Email, Approver_Title)
            Select '{Site}' as Site  
            , @ProgramID as ProgramID
            , @Doc_No as Doc_No
            , 0 as Stage_NO
            , cast(0 as bit)  as Force_Approved
            --, @UserID as Approver_UserID
            --, e.Email as Approver_Email
            , '' as Approver_UserID
            , '' as Approver_Email
            , 'Applicant' as Approver_Title
            --From Employee e 
            --Inner Join aspnet_Users au on au.EmployeeID = e.EmployeeID
            --Where au.LoweredUserName = @UserID
            union
            Select '{Site}' as Site  
            , ac.ProgramID
            , @Doc_No as Doc_No
            , ac.Stage_NO
            , ac.Force_Approved
            , au.LoweredUserName as Approver_UserID
            , e.Email as Approver_Email
            , t.Employee_Title as Approver_Title
            From Approve_Control ac
            Inner Join Employee e on ac.Approve_EmployeeID = e.EmployeeID
            Inner Join Employee_Title t on t.Employee_TitleID = e.Employee_TitleID
            Inner Join aspnet_Users au on au.EmployeeID = ac.Approve_EmployeeID
            Where ac.ProgramID = @ProgramID
            And ac.DepartmentID = @DepartmentID
            And ac.Approval_Limit <= @Value
        End

        Set @ROWCOUNT = @@ROWCOUNT;

        if(@ROWCOUNT > 0)
        Begin
          Update Approve_Detail Set Force_Approved = 1
          From Approve_Detail ad
          Where ad.ProgramID = @ProgramID
            And ad.Doc_NO = @Doc_NO
            And (Select count(Force_Approved) From Approve_Detail b where Force_Approved = 1 and b.ProgramID = @ProgramID And b.Doc_NO = @Doc_NO and b.Site = '{Site}') = 0
            And (Select max(Stage_NO) From Approve_Detail b where b.ProgramID = @ProgramID And b.Doc_NO = @Doc_NO and b.Site = '{Site}') = ad.Stage_NO
            And ad.Stage_NO > 0
        End

        `, req.body);
      break;
    case 1:
      req.body.Approve_DetailID = req.body.Approve_DetailID ? req.body.Approve_DetailID : null;
      req.body.Approver_CHK = req.body.Approver_CHK ? req.body.Approver_CHK : 0;
      req.body.Force_Approved = req.body.Force_Approved ? req.body.Force_Approved : 0;
      req.body.Approver_Comment = req.body.Approver_Comment ? `N'${req.body.Approver_Comment.trim().substring(0, 65535).replace(/'/g, "''")}'` : `''`;
      switch (req.body.Name) {
        case "Approver_CHK":
          strSQL += format(`
            Update [dbo].[Approve_Detail] Set [Approved_Date] = iif({Value} = 1, GetDate(),null)
            , Approver_UserID = iif({Approver_UserID_Flag} = 1 and c.Stage_No = 0 , '{Approver_UserID}', Approver_UserID)
            , Approver_Email = iif({Approver_UserID_Flag} = 1 and c.Stage_No = 0, '{Approver_Email}', Approver_Email)
            From [dbo].[Approve_Detail] c
            where c.Approve_DetailID = {Approve_DetailID}
            And iif({Approver_UserID_Flag} = 1 and c.Stage_No = 0, 1 ,
            iif(c.Force_Approved = 0,
              (case when Approver_UserID =   '${req.UserID}'
                  And ( isnull( (Select iif( Approved_Date is null,1,0) a From [dbo].[Approve_Detail] a Where a.ProgramID = c.ProgramID And a.Doc_NO = c.Doc_NO And a.Site = c.Site And a.Stage_No = c.Stage_No + 1),1) ) =1
                  And ( isnull( (Select iif( Approved_Date is null,0,1) a From [dbo].[Approve_Detail] a Where a.ProgramID = c.ProgramID And a.Doc_NO = c.Doc_NO And a.Site = c.Site And a.Stage_No = c.Stage_No - 1),1) ) =1
                then 1 else 0 end
                ) ,
              (case when Approver_UserID =   '${req.UserID}'
                  And ( isnull( (Select iif( Approved_Date is null,0,1) a From [dbo].[Approve_Detail] a Where a.ProgramID = c.ProgramID And a.Doc_NO = c.Doc_NO And a.Site = c.Site And a.Stage_No = c.Stage_No - 1),1) ) =1
                then 1 else 0 end
              )
            ) )= 1 ;

            Set @ROWCOUNT = @@ROWCOUNT;

            if({Force_Approved} > 0 and @ROWCOUNT > 0)
            begin
                --Order Approve Report
                if({ProgramID} = 78)
                Begin
                  Update Order_Approve set Approve_Date = iif({Value} = 1, GetDate(), null)
                  , Approve_First_Date = iif(Approve_First_Date is null and {Value} = 1 , GetDate() , Approve_First_Date )
                  Where Order_ApproveID = '{Doc_NO}';
                End

                --Sample Debit Note Report or Sample Credit Note Report
                if({ProgramID} = 120 or {ProgramID} = 126 or {ProgramID} = 390)
                Begin
                  Update Debit set Approve = iif({Value} = 1, '${req.UserID}', null)
                  , Approve_Date = iif({Value} = 1, GetDate(), null)
                  , Approve_First_Date = iif(Approve_First_Date is null and {Value} = 1 , GetDate() , Approve_First_Date )
                  Where Debit_NO = '{Doc_NO}';
                End

                -- Customer Basic Info
                if({ProgramID} = 33)
                begin   
                  Update Customer set Financial_Approver = iif({Value} = 1, '${req.UserID}', null)
                  , Financial_Approve_Date = iif({Value} = 1, GetDate(), null)
                  , Supervisor = iif({Value} = 1, '${req.UserID}', null)
                  , Supervisor_Approved_Date = iif({Value} = 1, GetDate(), null)
                  Where CustomerID = '{Doc_NO}';
                End

                -- Customer Payment Term
                if({ProgramID} = 391)
                begin   
                  Update Customer_Payment_Group set Financial_Approver = iif({Value} = 1, '${req.UserID}', null)
                  , Financial_Approve_Date = iif({Value} = 1, GetDate(), null)
                  , Supervisor = iif({Value} = 1, '${req.UserID}', null)
                  , Supervisor_Approved_Date = iif({Value} = 1, GetDate(), null)
                  Where Customer_Payment_GroupID = '{Doc_NO}';
                End

                if({Value} = 0) 
                Begin
                  if({Reset_Flow_Flag} = 1)
                  Begin
                    Delete FROM [dbo].[Approve_Detail]
                    where ProgramID = {ProgramID}
                    And Doc_NO = '{Doc_NO}'
                    And '{Site}' = Site
                  End
                  else
                  Begin
                    Update [dbo].[Approve_Detail] Set [Approved_Date] = null
                    where ProgramID = {ProgramID}
                    And Doc_NO = '{Doc_NO}'
                    And '{Site}' = Site
                  End
                End
            End

          `, req.body);     
        break;
        case "Approver_Reject":
          strSQL += format(`
              
              --Order Approve Report
              if({ProgramID} = 78)
              Begin
                Update Order_Approve set Approve_Date = null
                Where Order_ApproveID = '{Doc_NO}';
              End
            
              --Sample Debit Note Report or Sample Credit Note Report
              if({ProgramID} = 120 or {ProgramID} = 126 or {ProgramID} = 390)
              Begin
                Update Debit set Approve = null
                , Approve_Date = null
                Where Debit_NO = '{Doc_NO}';
              End

              -- Customer Basic Info
              if({ProgramID} = 33)
              begin   
                Update Customer set Financial_Approver = null
                , Financial_Approve_Date = null
                , Supervisor = null
                , Supervisor_Approved_Date = null
                Where CustomerID = '{Doc_NO}';
              End

              -- Customer Payment Term
              if({ProgramID} = 391)
              begin   
                Update Customer_Payment_Group set Financial_Approver = null
                , Financial_Approve_Date = null
                , Supervisor = null
                , Supervisor_Approved_Date = null
                Where Customer_Payment_GroupID = '{Doc_NO}';
              End
              
              Update [dbo].[Approve_Detail] Set [Approved_Date] = null
              where ProgramID = {ProgramID}
              And Doc_NO = '{Doc_NO}'
              And '{Site}' = Site;          
 
            Set @ROWCOUNT = 1;
          `, req.body);     
        break;
        case "Approver_Comment":
          strSQL += format(`
            Update [dbo].[Approve_Detail] Set [{Name}] = N'{Value}'
            where Approve_DetailID = {Approve_DetailID}
            And ({Approver_UserID_Flag} = 1 or Approver_UserID = '${req.UserID}');

            Set @ROWCOUNT = @@ROWCOUNT;
          `, req.body);     
        break;
      }
      break;
    case 2:
      strSQL += format(`
           Delete FROM [dbo].[Approve_Detail]
           where ProgramID = @ProgramID
           And Doc_NO = '{Doc_NO}'
           And '{Site}' = Site;  
           Set @ROWCOUNT = @@ROWCOUNT;
        `, req.body);
      break;
  }

  strSQL += format(`
  Select @ROWCOUNT as Flag;
  `, req.body);
  //console.log(strSQL)

   db.sql(req.SiteDB, strSQL)
   .then(async (result) => {
     //console.log(result.recordsets[0])
     //res.send({ Flag: result.recordsets[0][0].Flag > 0 });

/*
     if(req.body.Mode == 1 && req.body.Name != 'Approver_Comment') {

      var obj =  { To: req.body.Mail.To
        , Subject: req.body.Mail.Subject
        , MailBody: decodeURIComponent(req.body.Mail.MailBody)
       }          
       await Mail.mail(obj).catch((err)=>{
          console.log(err);
        });

     } else {

     }
*/     
     res.send({ Flag: result.recordsets[0][0].Flag > 0 });  
      
   }).catch((err) => {
     console.log(err);
     res.status(500).send(err);
   })
});

//Send Mail
router.post('/SendMail', async function (req, res, next) {
  console.log("Call SendMail Api:", req.body);

  // req.body.Mail.To 收件者
  // req.body.Mail.Subject 信件主旨
  // req.body.Mail.MailBody 信件內容

  req.body.Mail.To = req.body.Mail.To ? req.body.Mail.To : '';
  req.body.Mail.Subject = req.body.Mail.Subject ? req.body.Mail.Subject : '';
  req.body.Mail.MailBody = req.body.Mail.MailBody ? req.body.Mail.MailBody : '';


     var obj =  { To: req.body.Mail.To
        , Subject: req.body.Mail.Subject
        , MailBody: (req.body.Mail.MailBody)
       }   
       //res.send({ Flag: result.recordsets[0][0].Flag > 0 });
    try {       
       await Mail.mail(obj).catch((err)=>{
          console.log(err);
        });
      res.send({ Flag: true });  
      
    } catch(err) {
      console.log(err);
      res.status(500).send(err);
    }
});

/* Mark-Wang API End */


/* Darren-Chang API Begin */

// 取得 Category 資料
router.post('/Category', function (req, res, next) {
  console.log("Call Category Api");

  var strSQL = format(`SELECT Category, E_Category
  FROM Product_Category as p WITH (NoWait, Nolock)

  `, req.body);

  //console.log(strSQL)
  db.sql(req.Enterprise, strSQL)
    .then((result) => {
      //console.log(result)
      res.send(result.recordset);
    }).catch((err) => {
      console.log(err);
      res.status(500).send(err);
    })
});

// 取得 Workshop 資料
router.post('/Workshop', function (req, res, next) {
  console.log("Call Workshop Api");

  var strSQL = format(`SELECT WorkshopID, Workshop, L2_Workshop, Workshop + '(' + L2_Workshop + ')' as WorkshopLabel
  FROM Workshop as p WITH (NoWait, Nolock)
  WHERE History_Date IS NULL AND WorkshopID > 0
  Order By SortID
  `, req.body);

  //console.log(strSQL)
  db.sql(req.Enterprise, strSQL)
    .then((result) => {
      //console.log(result)
      res.send(result.recordset);
    }).catch((err) => {
      console.log(err);
      res.status(500).send(err);
    })
});

// Maintain Style in Production Planner
router.post("/Style_Maintain_in_Production_Planner", function (req, res, next) {
  console.log("Call Style_Maintain_in_Production_Planner Api:", req.body);

  // req.body.Mode === 0 表示新增
  // req.body.Mode === 1 表示修改
  // req.body.Mode === 2 表示刪除
  // req.body.Mode === 3 表示 Fill UP Value to Style
  req.body.Style_No = req.body.Style_No ? `N'${req.body.Style_No.trim().substring(0, 20).replace(/'/g, "''")}'` : `''`;
  req.body.Produce_No = req.body.Produce_No ? `N'${req.body.Produce_No.trim().substring(0, 20).replace(/'/g, "''")}'` : `''`;
  if (typeof req.body.Value == 'number') {
    req.body.Value = req.body.Value ? req.body.Value : 0;
  } else {
    req.body.Value = req.body.Value ? `N'${req.body.Value.trim().replace(/'/g, "''")}'` : `NULL`;
  }

  var strSQL = "Declare @ROWCOUNT int;";
  switch (req.body.Mode) {
    case 0:
      break;
    case 1:
      strSQL += format(`
          Update [dbo].[Style] Set [{Name}] = {Value}
          Where Style_No = {Style_No};
          Set @ROWCOUNT = @@ROWCOUNT;
        `, req.body);
      if (req.body.Name === 'Technical_Transfer_Require_Date') {
        strSQL += format(`
            if(@ROWCOUNT > 0)
            Begin
              Update [dbo].[Produce] Set Schedule_Updater = N'${req.UserID}'
              , Schedule_Update = GetDate()
              where Produce_No = {Produce_No};
            End
            Set @ROWCOUNT = @@ROWCOUNT;
        `, req.body);
      }
      break;
    case 2:
      strSQL += format(`
          Delete FROM [dbo].[Style]
          Where Style_No = {Style_No};
          Set @ROWCOUNT = @@ROWCOUNT;
        `, req.body);
      break;
    case 3:
      var strSQL_S = format(`Declare @ROWCOUNT int;
        DECLARE @tmpProduce TABLE (Produce_No varchar(20), Schedule_Updater varchar(20), Schedule_Update datetime)
        insert into @tmpProduce values `, req.body);

      var strSQL_E = format(`Declare @ROWCOUNT int;
        DECLARE @tmpStyle TABLE ({Name} varchar(10), Style_No varchar(20))
        insert into @tmpStyle values `, req.body);

      let updateArray = req.body.updateArray
      updateArray.forEach((element, key) => {
        if (element.Est_Produce_Date) {
          strSQL_S += (`('${element.Produce_No}', '${req.UserID}', GetDate()),`)
        }
        if (Object.is(updateArray.length - 1, key)) {
          strSQL_S = strSQL_S.substring(0, strSQL_S.length - 1)
          strSQL_S += `; \r\n`
        }
      });
      updateArray.forEach((element, key) => {
        if (element.Est_Produce_Date) {
          strSQL_E += (`('${moment(element.Est_Produce_Date).add(req.body.Value, 'd').format('YYYY/MM/DD')}', '${element.Style_No}'),`)
        }
        if (Object.is(updateArray.length - 1, key)) {
          strSQL_E = strSQL_E.substring(0, strSQL_E.length - 1)
          strSQL_E += `; \r\n`
        }
      });
      strSQL_S += format(`
        Update Produce SET Schedule_Updater = tmp.Schedule_Updater, Schedule_Update = tmp.Schedule_Update From Produce as p
        Inner Join (Select Schedule_Updater, Schedule_Update, Produce_No from @tmpProduce) AS tmp ON tmp.Produce_No = p.Produce_No;

        Set @ROWCOUNT = @@ROWCOUNT;
        Select @ROWCOUNT as Flag;
        `, req.body);

      strSQL_E += format(`
        Update Style SET [{Name}] = tmp.{Name} From Style as s
        Inner Join (Select {Name}, Style_No from @tmpStyle) AS tmp ON tmp.Style_No = s.Style_No;

        Set @ROWCOUNT = @@ROWCOUNT;
        Select @ROWCOUNT as Flag;
        `, req.body);
      break;
  }
  strSQL += format(`Select @ROWCOUNT as Flag;`);

  // console.log(strSQL_S, strSQL_E)
  // res.send({Flag: true});
  db.sql(req.SiteDB, req.body.Mode === 3 ? strSQL_S : strSQL)
    .then((result) => {
      // console.log(result.recordsets[0])
      if (req.body.Mode === 3) {
        db.sql(req.Enterprise, strSQL_E)
          .then((result) => {
            res.send({ Flag: result.recordsets[0][0].Flag > 0 });
          }).catch((err) => {
            console.log(err);
            res.status(500).send(err);
          })
      } else {
        res.send({ Flag: result.recordsets[0][0].Flag > 0 });
      }
    })
    .catch((err) => {
      console.log(err);
      res.status(500).send(err);
    });
});

// Get Style_Process Info
router.post('/Style_Process', function (req, res, next) {
  console.log("Call Style_Process Api:");

  req.body.Style_No = req.body.Style_No ? `N'${req.body.Style_No.trim().substring(0, 20).replace(/'/g, "''")}'` : `''`;

  var strSQL = format(`
  SELECT [Style_ProcessID], sp.[ComponentID], sp.[Style_No], [C_Rmk], [Component], [L2_Component], [L3_Component], [Processing_Updater], Convert(varchar(20), [Processing_Update], 120) AS Processing_Update
  FROM [dbo].[Style_Process] sp
  Inner Join [dbo].[Product_Component] pc ON pc.ComponentID = sp.ComponentID
  Inner Join [dbo].[Style] s ON s.Style_No = sp.Style_No
  WHERE sp.Style_No = {Style_No}

  SELECT [Style_WorkshopID], sp.[Style_ProcessID], [Queue_No], ws.[WorkshopID], Workshop, L2_Workshop, [Front_Workshop], [Behind_WorkShop], [Tooling_Name],
  Convert(varchar(10), [Tooling_Ship_Date], 111) AS Tooling_Ship_Date, Convert(varchar(10), [Tooling_Arrival_Date], 111) AS Tooling_Arrival_Date
  FROM [ENTERPRISE].[dbo].[Style_Workshop] sw
  Inner Join [dbo].[Style_Process] sp ON sp.Style_ProcessID = sw.Style_ProcessID
  Inner Join [dbo].[Workshop] ws ON ws.WorkshopID = sw.WorkshopID
  WHERE sp.Style_No = {Style_No}
  Order by Queue_No

  `, req.body);

  // console.log(strSQL)
  db.sql(req.Enterprise, strSQL)
    .then((result) => {
      let index = 0
      result.recordsets[0].forEach(element => {
        element.entries = []
      });
      let DataSet = result.recordsets[0]
      result.recordsets[1].forEach(element => {
        index = DataSet.findIndex(x => x.Style_ProcessID === element.Style_ProcessID)
        DataSet[index].entries.push(element)
      })
      res.send(DataSet);
    }).catch((err) => {
      console.log(err);
      res.status(500).send(err);
    })
});

// Maintain Style_Process
router.post("/Style_Process_Maintain", function (req, res, next) {
  console.log("Call Style_Process_Maintain Api:", req.body);

  // req.body.Mode === 0 表示新增
  // req.body.Mode === 1 表示修改
  // req.body.Mode === 2 表示刪除
  req.body.Style_No = req.body.Style_No ? `N'${req.body.Style_No.trim().substring(0, 20).replace(/'/g, "''")}'` : `''`;
  req.body.C_Rmk = req.body.C_Rmk ? `N'${req.body.C_Rmk.trim().substring(0, 16).replace(/'/g, "''")}'` : `''`;

  var strSQL = "Declare @ROWCOUNT int;";
  switch (req.body.Mode) {
    case 0:
      strSQL += format(`
          Insert into [dbo].[Style_Process] ([ComponentID], [Style_No], [C_Rmk])
          Values ({ComponentID}, {Style_No}, {C_Rmk})
          Set @ROWCOUNT = @@ROWCOUNT;
        `, req.body);
      break;
    case 1:
      switch (req.body.Name) {
        case 'ComponentID':
          req.body.Value = req.body.Value ? req.body.Value : 0;
          break;
        default:
          req.body.Value = req.body.Value ? `N'${req.body.Value.trim().replace(/'/g, "''")}'` : `NULL`;
          break;
      }
      strSQL += format(`
          Update [dbo].[Style_Process] Set [{Name}] = {Value}
          Where Style_ProcessID = {Style_ProcessID};
          Set @ROWCOUNT = @@ROWCOUNT;
        `, req.body);
      break;
    case 2:
      strSQL += format(`
          Delete FROM [dbo].[Style_Process]
          Where Style_ProcessID = {Style_ProcessID};
          Set @ROWCOUNT = @@ROWCOUNT;
        `, req.body);
      break;
  }
  strSQL += format(`Select @ROWCOUNT as Flag;
  if(@ROWCOUNT > 0)
  begin
    Update Style SET Processing_Updater = N'${req.UserID}', Processing_Update = GetDate()
    Where Style_No = {Style_No};
  End
  `, req.body);

  // console.log(strSQL)
  // res.send({Flag: true});
  db.sql(req.Enterprise, strSQL)
    .then((result) => {
      // console.log(result.recordsets[0])
      res.send({ Flag: result.recordsets[0][0].Flag > 0 });
    })
    .catch((err) => {
      console.log(err);
      res.status(500).send(err);
    });
});

// Update Queue No in Style_Workshop
router.post('/Style_Workshop_dragUpdate', function (req, res, next) {
  console.log("Call Style_Workshop_dragUpdate Api(POST) in Production");

  let strSQL = `DECLARE @tmp TABLE (Queue_No INT, Style_WorkshopID INT)
  insert into @tmp values `
  let updateArray = req.body
  updateArray.forEach((element, key) => {
    strSQL += (`(${element.Queue_No}, ${element.Style_WorkshopID}),`)
    if (Object.is(updateArray.length - 1, key)) {
      strSQL = strSQL.substring(0, strSQL.length - 1)
      strSQL += `; \r\n`
    }
  });
  strSQL += `Update Style_Workshop SET Queue_No = tmp.Queue_No From Style_Workshop as sw
  Inner Join (Select Queue_No, Style_WorkshopID from @tmp) AS tmp ON tmp.Style_WorkshopID = sw.Style_WorkshopID;

  Declare @Flag int;
  Set @Flag = @@ROWCOUNT;
  Select @Flag as Flag;`

  // console.log(strSQL)
  // res.send({Flag: true});
  db.sql(req.Enterprise, strSQL)
    .then((result) => {
      res.send({ Flag: result.recordsets[0][0].Flag > 0 });
    }).catch((err) => {
      console.log(err);
      res.status(500).send(err);
    })
});

// Get Style_Workshop Info
router.get('/Style_Workshop', function (req, res, next) {
  console.log("Call Style_Workshop Api:");

  var strSQL = format(`
  SELECT [Style_WorkshopID], sp.[ComponentID], [Style_No], [C_Rmk], [Component], [L2_Component], [L3_Component]
  FROM [dbo].[Style_Workshop] sp
  Inner Join [dbo].[Product_Component] pc ON pc.ComponentID = sp.ComponentID

   `, req.body);

  // console.log(strSQL)
  db.sql(req.Enterprise, strSQL)
    .then((result) => {
      res.send(result.recordsets[0]);
    }).catch((err) => {
      console.log(err);
      res.status(500).send(err);
    })
});

// Maintain Style_Workshop
router.post("/Style_Workshop_Maintain", function (req, res, next) {
  console.log("Call Style_Workshop_Maintain Api:", req.body);

  // req.body.Mode === 0 表示新增
  // req.body.Mode === 1 表示修改
  // req.body.Mode === 2 表示刪除
  req.body.Style_No = req.body.Style_No ? `N'${req.body.Style_No.trim().substring(0, 20).replace(/'/g, "''")}'` : `''`;
  req.body.C_Rmk = req.body.C_Rmk ? `N'${req.body.C_Rmk.trim().substring(0, 16).replace(/'/g, "''")}'` : `''`;
  if (req.body.Name !== 'WorkshopID') {
    let Size = 0
    switch (req.body.Name) {
      case 'Tooling_Name':
        Size = 30
        break;
      case 'Tooling_Ship_Date':
      case 'Tooling_Arrival_Date':
        Size = 10
        break;
      default:
        break;
    }
    req.body.Value = req.body.Value ? `N'${req.body.Value.trim(0, Size).replace(/'/g, "''")}'` : `''`;
  }

  var strSQL = "Declare @ROWCOUNT int;";
  switch (req.body.Mode) {
    case 0:
      strSQL += format(`
          Insert into [dbo].[Style_Workshop] ([Style_ProcessID], [Queue_No], [WorkshopID])
          Values ({Style_ProcessID}, {Queue_No}, 0)
          Set @ROWCOUNT = @@ROWCOUNT;
        `, req.body);
      break;
    case 1:
      strSQL += format(`
          Update [dbo].[Style_Workshop] Set [{Name}] = {Value}
          Where Style_WorkshopID = {Style_WorkshopID};
          Set @ROWCOUNT = @@ROWCOUNT;
        `, req.body);
      break;
    case 2:
      strSQL += format(`
          Delete FROM [dbo].[Style_Workshop]
          Where Style_WorkshopID = {Style_WorkshopID};
          Set @ROWCOUNT = @@ROWCOUNT;
        `, req.body);
      break;
  }
  strSQL += format(`Select @ROWCOUNT as Flag;
  if(@ROWCOUNT > 0)
  begin
    Update Style SET Processing_Updater = N'${req.UserID}', Processing_Update = GetDate()
    Where Style_No = {Style_No};
  End
  `, req.body);

  // console.log(strSQL)
  // res.send({Flag: true});
  db.sql(req.Enterprise, strSQL)
    .then((result) => {
      res.send({
        Flag: result.recordsets[0][0].Flag > 0
      });
    })
    .catch((err) => {
      console.log(err);
      res.status(500).send(err);
    });
});

// Get Style_Mould Info
router.post('/Style_Mould', function (req, res, next) {
  console.log("Call Style_Mould Api:");

  req.body.Style_No = req.body.Style_No ? `N'${req.body.Style_No.trim().substring(0, 20).replace(/'/g, "''")}'` : `''`;

  var strSQL = format(`
  SELECT [Style_MouldID], sm.[Style_No], [Mould_Name], [Mould_No], [Mould_Status], [Unit_Price], [Qty], [Remark], [Mould_Updater], Convert(varchar(20), [Mould_Update], 120) AS Mould_Update,
  Convert(varchar(10), [Est_Completion_Date], 111) AS Est_Completion_Date, Convert(varchar(10), [Ship_Date], 111) AS Ship_Date,
  Convert(varchar(10), [Arrival_Date], 111) AS Arrival_Date
  FROM [dbo].[Style_Mould] sm
  Inner Join [dbo].[Style] s ON s.Style_No = sm.Style_No
  WHERE sm.Style_No = {Style_No}

   `, req.body);

  // console.log(strSQL)
  db.sql(req.Enterprise, strSQL)
    .then((result) => {
      res.send(result.recordsets[0]);
    }).catch((err) => {
      console.log(err);
      res.status(500).send(err);
    })
});

// Maintain Style_Mould
router.post("/Style_Mould_Maintain", function (req, res, next) {
  console.log("Call Style_Mould_Maintain Api:", req.body);

  // req.body.Mode === 0 表示新增
  // req.body.Mode === 1 表示修改
  // req.body.Mode === 2 表示刪除
  req.body.Style_No = req.body.Style_No ? `N'${req.body.Style_No.trim().substring(0, 20).replace(/'/g, "''")}'` : `''`;
  if (req.body.Name !== 'Unit_Price' && req.body.Name !== 'Qty') {
    let Size = 0
    switch (req.body.Name) {
      case 'Mould_Name':
        Size = 30
        break;
      case 'Mould_No':
      case 'Mould_Status':
      case 'Remark':
        Size = 20
        break;
      case 'Tooling_Ship_Date':
      case 'Tooling_Arrival_Date':
        Size = 10
        break;
      default:
        break;
    }
    req.body.Value = req.body.Value ? `N'${req.body.Value.trim(0, Size).replace(/'/g, "''")}'` : ``;
  }

  var strSQL = "Declare @ROWCOUNT int;";
  switch (req.body.Mode) {
    case 0:
      strSQL += format(`
          Insert into [dbo].[Style_Mould] ([Style_No], [Mould_name], [Qty])
          Values ({Style_No}, 'New Mould', 1)
          Set @ROWCOUNT = @@ROWCOUNT;
        `, req.body);
      break;
    case 1:
      strSQL += format(`
          Update [dbo].[Style_Mould] Set [{Name}] = {Value}
          Where Style_MouldID = {Style_MouldID};
          Set @ROWCOUNT = @@ROWCOUNT;
        `, req.body);
      break;
    case 2:
      strSQL += format(`
          Delete FROM [dbo].[Style_Mould]
          Where Style_MouldID = {Style_MouldID};
          Set @ROWCOUNT = @@ROWCOUNT;
        `, req.body);
      break;
  }
  strSQL += format(`Select @ROWCOUNT as Flag;
  if(@ROWCOUNT > 0)
  begin
    Update Style SET Mould_Updater = N'${req.UserID}', Mould_Update = GetDate()
    Where Style_No = {Style_No};
  End
  `, req.body);

  // console.log(strSQL)
  // res.send({Flag: true});
  db.sql(req.Enterprise, strSQL)
    .then((result) => {
      res.send({
        Flag: result.recordsets[0][0].Flag > 0
      });
    })
    .catch((err) => {
      console.log(err);
      res.status(500).send(err);
    });
});

/* Darren-Chang API End */

module.exports = router;
