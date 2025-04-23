var express = require('express');
var router = express.Router();
var moment = require('moment');
const format = require('string-format');
var db = require('../../config/DB_Connect');
var formidable = require('formidable');
//var smb2 = require('../../config/New_smb2');
var smbClient = require('../../config/smb2_new');
//var SBMClient = require('@marsaud/smb2')
// var SMB2 = require('smb2')

var smb2 = smbClient.smb2();


//const FtpClient = require("ftp");
const fs = require("fs");
const { URL } = require('url');
//const fileUrl = new URL('file://Enterprise/Enterprise_Datas/Images/Assets/Photos');
//const client = new FtpClient();
const config = { 
  host: '192.168.252.7',
  port: 21,
  user:'mark-wang',
  password:"mw*2120",
  keepalive: 10000
}

function connect() {
  return new Promise((resolve, reject) => {

    client.on('ready', () => {
      console.log("ftp ready");
      resolve();
    });

    client.on('close', () => {
      console.log("ftp close");
    });

    client.on('end', () => {
      console.log("ftp end");
    });

    client.on('error', (err) => {
      console.log("ftp err",err);
      reject(err);
    });

    client.connect(config);
  })
}

async function upload(sourcePath, targetPath) {
console.log(sourcePath)
  var data = await ReadPhotoFile(sourcePath);

  
  if(!data) {
    return false;
  }
  
  await connect();
  return new Promise((resolve, reject) => {
    client.put(data, targetPath, (err)=> {
      client.end();
      if(err) {
        console.log(err);
        reject(false);
      } else {
        console.log(`upload file completed. filePath: ${targetPath}`);
        resolve(true);
      }
    })
  })

}



//Get Asset_Type
router.post('/Asset_Type',  function (req, res, next) {
    console.log("Call Asset_Type Api:");
    
    req.body.Asset_TypeID = req.body.Asset_TypeID != null ? req.body.Asset_TypeID : '';
    req.body.Asset_Type = req.body.Asset_Type ? `${req.body.Asset_Type.trim().replace(/'/g, '')}` : '';
    req.body.Asset_Type_ENG = req.body.Asset_Type_ENG ? `${req.body.Asset_Type_ENG.trim().replace(/'/g, '')}` : '';
    req.body.Description = req.body.Description ? `${req.body.Description.trim().replace(/'/g, '')}` : '';
 
    var strSQL = format(`
    SELECT Top 1000 [Asset_TypeID]
    , [Asset_Type]
    , [Asset_Type_ENG]    
    , [Description]
    FROM [dbo].[Asset_Type] s With(Nolock,NoWait)
    where (N'{Asset_TypeID}' = '' or Asset_TypeID like N'%{Asset_TypeID}%')
    And (N'{Asset_Type}' = '' or Asset_Type like N'%{Asset_Type}%')
    And (N'{Asset_Type_ENG}' = '' or [Asset_Type_ENG] like N'%{Asset_Type_ENG}%')
    And (N'{Description}' = '' or [Description] like N'%{Description}%')    
    Order By Asset_TypeID
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

 //Maintain Asset_Type
router.post('/Asset_Type_Maintain',  function (req, res, next) {
  console.log("Call Asset_Type_Maintain Api:",req.body);
 
  // req.body.Mode === 0 表示新增
  // req.body.Mode === 1 表示修改 
  // req.body.Mode === 2 表示刪除   
  req.body.Asset_TypeID = req.body.Asset_TypeID != null ? req.body.Asset_TypeID : null;

  var strSQL = format(`Declare  @ROWCOUNT int = 0, @Asset_TypeID int = {Asset_TypeID}; 
    `, req.body);
  
  switch(req.body.Mode){
     case 0:
        req.body.Asset_Type = req.body.Asset_Type ? `'${req.body.Asset_Type.trim().substring(0,10).replace(/'/g, '')}'` : '';
        req.body.Asset_Type_ENG = req.body.Asset_Type_ENG  ? `'${req.body.Asset_Type_ENG.trim().substring(0,20).replace(/'/g, '')}'` : '';
        req.body.Description = req.body.Description  ? `'${req.body.Description.trim().substring(0,65535).replace(/'/g, '')}'` : '';
    
        strSQL += format(`
        Insert into [dbo].[Asset_Type] (Asset_Type, Asset_Type_ENG, Description)
        Select {Asset_Type} as Asset_Type
        , {Asset_Type_ENG} as Asset_Type_ENG
        , {Description} as Description

        Set @ROWCOUNT = @@ROWCOUNT;
        Set @Asset_TypeID = scope_identity();
        `, req.body);
     break;
     case 1:
      var Size = 0;
      switch(req.body.Name){
        case 'Asset_Type':
           Size = 10;
        break;
        case 'Asset_Type_ENG':
           Size = 52;
        break;
        case 'Description':
            Size = 65535;
        break;
        default:
        break;
      }
      req.body.Value = Size == 0 ? (req.body.Value != null ? req.body.Value : null) : (req.body.Value != null ? `N'${req.body.Value.trim().replace(/'/g, "''")}'` : `''`);

      strSQL += format(`     
        Update [dbo].[Asset_Type] Set [{Name}] = ${Size == 0 ? '{Value}': `substring({Value},1,${Size})`} 
        where Asset_TypeID = {Asset_TypeID};
        Set @ROWCOUNT = @@ROWCOUNT;
        `, req.body);

        break;
     case 2:
        strSQL += format(`    
        Delete FROM [dbo].[Asset_Type]
        where Asset_TypeID = {Asset_TypeID};
        Set @ROWCOUNT = @@ROWCOUNT;
        `, req.body);      
        break;
  }

  strSQL += format(`    
    Select @ROWCOUNT as Flag, @Asset_TypeID as Asset_TypeID;
    `, req.body);       
  //console.log(strSQL)
  db.sql(req.Enterprise, strSQL)
     .then((result) => {
        //console.log(result)
        var DataSet = {Flag: result.recordsets[0][0].Flag > 0, Asset_TypeID: result.recordsets[0][0].Asset_TypeID} ;
        res.send(DataSet);
     }).catch((err) => {
        console.log(err);
        res.status(500).send(err);
     })

});

//Get Asset_Category
router.post('/Asset_Category',  function (req, res, next) {
  console.log("Call Asset_Category Api:");
  
  req.body.Asset_CategoryID = req.body.Asset_CategoryID != null ? req.body.Asset_CategoryID : '';
  req.body.Asset_Category = req.body.Asset_Category ? `${req.body.Asset_Category.trim().replace(/'/g, '')}` : '';
  req.body.Asset_Type = req.body.Asset_Type ? `${req.body.Asset_Type.trim().replace(/'/g, '')}` : '';

  var strSQL = format(`
  SELECT Top 1000 ac.Asset_CategoryID
  , ac.Asset_CategoryID as Asset_CategoryID_O
  , ac.Asset_Category
  , cast(ac.Asset_CategoryID as varchar) +' '+ ac.[Asset_Category] as label
  , at.[Asset_TypeID]
  , [Asset_Type]
  FROM Asset_Category ac With(Nolock,NoWait)
  Inner Join [dbo].[Asset_Type] at With(Nolock,NoWait) on at.Asset_TypeID = ac.Asset_TypeID
  where (N'{Asset_CategoryID}' = '' or ac.Asset_CategoryID like N'%{Asset_CategoryID}%')
  And (N'{Asset_Category}' = '' or ac.Asset_Category like N'%{Asset_Category}%')
  And (N'{Asset_Type}' = '' or at.Asset_Type like N'%{Asset_Type}%')
  Order By Asset_CategoryID
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

//Get Asset_Status
router.post('/Asset_Status',  function (req, res, next) {
  console.log("Call Asset_Status Api:");
  
  req.body.In_Column = req.body.In_Column ? `${req.body.In_Column.trim().replace(/'/g, '')}` : '';

  var strSQL = format(`
  SELECT Top 1000 ac.Asset_StatusID
  , ac.Asset_Status_ENG
  , ac.Asset_Status_CHT
  , ac.In_Column
  , ac.RT_TO_Main
  , ac.MT_TO_Main
  FROM Asset_Status ac With(Nolock,NoWait)
  where 1=1
  Order By Asset_StatusID
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

//Maintain Asset_Category
router.post('/Asset_Category_Maintain',  function (req, res, next) {
  console.log("Call Asset_Category_Maintain Api:",req.body);
 
  // req.body.Mode === 0 表示新增
  // req.body.Mode === 1 表示修改 
  // req.body.Mode === 2 表示刪除   
  req.body.Asset_CategoryID = req.body.Asset_CategoryID != null ? req.body.Asset_CategoryID : null;

  var strSQL = format(`Declare  @ROWCOUNT int = 0, @Asset_CategoryID int = {Asset_CategoryID}; 
    `, req.body);
  
  switch(req.body.Mode){
     case 0:
        req.body.Asset_Category = req.body.Asset_Category != null ? `N'${req.body.Asset_Category.trim().substring(0,20).replace(/'/g, '')}'` : `''`;

        strSQL += format(`
        Insert into [dbo].[Asset_Category] (Asset_CategoryID, Asset_Category, Asset_TypeID)
        Select {Asset_CategoryID} as Asset_CategoryID
        , {Asset_Category} as Asset_Category
        , {Asset_TypeID} as Asset_TypeID

        Set @ROWCOUNT = @@ROWCOUNT;
        --Set @Asset_CategoryID = scope_identity();
        `, req.body);
        break;
     case 1:
      var Size = 0;
      switch(req.body.Name){
        case 'Asset_Category':
           Size = 20;
        break;
        default:
        break;
      }
      req.body.Value = Size == 0 ? (req.body.Value != null ? req.body.Value : null) : (req.body.Value != null ? `N'${req.body.Value.trim().replace(/'/g, "''")}'` : `''`);

      strSQL += format(`     
        Update [dbo].[Asset_Category] Set [{Name}] = ${Size == 0 ? '{Value}': `substring({Value},1,${Size})`} 
        where Asset_CategoryID = {Asset_CategoryID}
        ${req.body.Name == 'Asset_CategoryID' ?  ' And (Select count(*) From [dbo].[Asset_Category] Where {Value} = Asset_CategoryID) = 0' : ''  };
        Set @ROWCOUNT = @@ROWCOUNT;
        `, req.body);

        break;
     case 2:
        strSQL += format(`    
        Delete FROM [dbo].[Asset_Category]
        where Asset_CategoryID = {Asset_CategoryID};
        Set @ROWCOUNT = @@ROWCOUNT;
        `, req.body);      
        break;
  }

  strSQL += format(`    
    Select @ROWCOUNT as Flag, @Asset_CategoryID as Asset_CategoryID;
    `, req.body);       
//console.log(strSQL)
  db.sql(req.Enterprise, strSQL)
     .then((result) => {
        //console.log(result)
        var DataSet = {Flag: result.recordsets[0][0].Flag > 0, Asset_CategoryID: result.recordsets[0][0].Asset_CategoryID} ;
        res.send(DataSet);
     }).catch((err) => {
        console.log(err);
        res.status(500).send(err);
     })

});

//Check Asset_CategoryID
router.post('/Check_Asset_CategoryID',  function (req, res, next) {
  console.log("Call Check_Asset_CategoryID Api:");
  
  req.body.Asset_CategoryID = req.body.Asset_CategoryID ? req.body.Asset_CategoryID : null;

  var strSQL = format(`
  SELECT iif(count(*)>0 , 0, isnull({Asset_CategoryID},0)) as Asset_CategoryID
  FROM Asset_Category With(Nolock,NoWait)
  where Asset_CategoryID = {Asset_CategoryID}
  `, req.body) ;
  //console.log(strSQL)
  db.sql(req.Enterprise, strSQL)
     .then((result) => {
        res.send({Asset_CategoryID: result.recordset[0].Asset_CategoryID});
     }).catch((err) => {
        console.log(err);
        res.status(500).send(err);
     })
}); 

// Get Asset_List
router.post('/Asset_List', function (req, res, next) {
  console.log("Call Asset List Api:", req.body);

  req.body.AssetID = req.body.AssetID != null ? req.body.AssetID : ``;
  req.body.Asset_Name = req.body.Asset_Name != null ? `${req.body.Asset_Name.trim().substring(0, 65535).replace(/'/g, '')}` : ``;
  req.body.Brand_Model = req.body.Brand_Model != null ? `${req.body.Brand_Model.trim().substring(0, 10).replace(/'/g, '')}` : ``;
  req.body.Asset_Category = req.body.Asset_Category != null ? `${req.body.Asset_Category.trim().substring(0, 10).replace(/'/g, '')}` : ``;
  req.body.Asset_Type = req.body.Asset_Type  != null? `${req.body.Asset_Type.trim().substring(0, 10).replace(/'/g, '')}` : ``;
  req.body.Serial_NO = req.body.Serial_NO != null ? `${req.body.Serial_NO.trim().substring(0, 20).replace(/'/g, '')}` : ``;
  req.body.Acquisition_Date = req.body.Acquisition_Date != null ? `${req.body.Acquisition_Date.trim().substring(0, 10).replace(/'/g, '')}` : ``;
  req.body.Current_Status = req.body.Current_Status != null ? `${req.body.Current_Status.trim().substring(0, 65535).replace(/'/g, '')}` : ``;
  req.body.Custodian = req.body.Custodian ? `${req.body.Custodian.trim().substring(0, 20).replace(/'/g, '')}` : ``;
  req.body.Acquisition_Cost = req.body.Acquisition_Cost != null ? req.body.Acquisition_Cost : ``;
  req.body.Useful_Life = req.body.Useful_Life != null ? req.body.Useful_Life : ``;
  req.body.Residual_Value = req.body.Residual_Value != null ? req.body.Residual_Value : ``;
  req.body.Location = req.body.Location != null ? `${req.body.Location.trim().substring(0, 15).replace(/'/g, '')}` : ``;
  req.body.Purchase_OrganizationID = req.body.Purchase_OrganizationID != null ? `${req.body.Purchase_OrganizationID.trim().substring(0, 10).replace(/'/g, '')}` : ``;
  req.body.UserID = req.body.UserID != null ? `${req.body.UserID.trim().substring(0, 20).replace(/'/g, '')}` : ``;
  req.body.Histiry_Date = req.body.Histiry_Date != null ? `${req.body.Histiry_Date.trim().substring(0, 10).replace(/'/g, '')}` : ``;
  req.body.Useful_Life_Date = req.body.Useful_Life_Date != null ? `${req.body.Useful_Life_Date.trim().substring(0, 10).replace(/'/g, '')}` : ``;
  req.body.Warranty_Exp_Date = req.body.Warranty_Exp_Date != null ? `${req.body.Warranty_Exp_Date.trim().substring(0, 10).replace(/'/g, '')}` : ``;
  req.body.Maintenance_Date = req.body.Maintenance_Date != null ? `${req.body.Maintenance_Date.trim().substring(0, 10).replace(/'/g, '')}` : ``;
  req.body.History = req.body.History ? 1 : 0;
  req.body.Useful_Life_Date_Flag = req.body.Useful_Life_Date_Flag ? 1 : 0;
  req.body.Warranty_Exp_Flag = req.body.Warranty_Exp_Flag ? 1 : 0;
  req.body.Maintenance_Date_Flag = req.body.Maintenance_Date_Flag ? 1 : 0;
  

  let strSQL = format(`
  SELECT a.[AssetID]      
  , a.Asset_Name
  , a.Brand_Model
  , a.Asset_CategoryID
  , c.Asset_Category
  , t.Asset_Type
  , a.Specification
  , a.Ancillary_Equipment
  , a.Serial_NO
  , Convert(varchar(20), a.[Acquisition_Date],111) as [Acquisition_Date]
  , a.Acquisition_Method
  , a.Acquisition_Cost
  , a.Useful_Life
  , Convert(varchar(20), DateAdd(year, isnull(a.Useful_Life,0), a.[Acquisition_Date]) ,111) as [Useful_Life_Date]
  , iif(DateAdd(year, isnull(a.Useful_Life,0), a.[Acquisition_Date]) < getdate(), 1, 0) as [Useful_Life_Date_Flag]
  , a.Residual_Value
  , iif(isnull(a.Useful_Life,0) = 0 ,0 , isnull(a.Acquisition_Cost,0) 
    - Round( (isnull(a.Acquisition_Cost,0) - isnull(a.Residual_Value,0)) 
        * iif( DATEDIFF(month, a.[Acquisition_Date], getdate()) / cast( 12 as money) > isnull(a.Useful_Life,0), isnull(a.Useful_Life,0),  
               DATEDIFF(month, a.[Acquisition_Date], getdate()) / cast( 12 as money)
          ) / cast(a.Useful_Life as money)
      ,0)  
    ) as Present_Value 
  , a.Photo_Month
  , Convert(varchar(20), a.[Photo_Upload],111) as [Photo_Upload]
  , a.[Photo_Uploader]
  , a.[Current_Status]
  , a.[Custodian]
  , ol.[Location]
  , isnull(a.Purchase_OrganizationID,'') as Purchase_OrganizationID 
  , a.[Maintenance_VendorID]
  , a.[Warranty_Method]
  , Convert(varchar(20), a.[Warranty_Exp_Date],111) as [Warranty_Exp_Date]
  , iif(a.[Warranty_Exp_Date] < getdate(), 1, 0) as [Warranty_Exp_Date_Flag]
  , iif( DateAdd(day, isnull(a.Maintenance_Cycle,0), a.Maintenance_Date) < GetDate(), null,  a.Maintenance_Method + ' ' + Convert(varchar(20), a.[Maintenance_Date],111) ) as Maintenance_Date
  , a.[UserID]
  , a.[Data_Updater]
  , Convert(varchar(20), a.[Data_Update],111) as [Data_Update]
  , a.[History_User]
  , Convert(varchar(20), a.[Histiry_Date],111) as [Histiry_Date]
  FROM Asset a WITH (NoLock, NoWait)
  left Outer Join Organization_Location ol on ol.LocationID = a.LocationID
  Inner Join Asset_Category c with(NoLock,NoWait) on c.Asset_CategoryID = a.[Asset_CategoryID]
  Inner Join Asset_Type t with(NoLock,NoWait) on c.Asset_TypeID = t.[Asset_TypeID]
  where (N'{AssetID}' = '' or a.[AssetID] like N'%{AssetID}%')
  And (N'{Asset_Name}' = '' or a.[Asset_Name] like N'%{Asset_Name}%')
  And (N'{Brand_Model}' = '' or a.[Brand_Model] like N'%{Brand_Model}%')
  And (N'{Asset_Category}' = '' or c.[Asset_Category] like N'%{Asset_Category}%')
  And (N'{Asset_Type}' = '' or t.[Asset_Type] like N'%{Asset_Type}%')
  And (N'{Serial_NO}' = '' or a.[Serial_NO] like N'%{Serial_NO}%')
  And (N'{Acquisition_Date}' = '' or convert(varchar(10),a.[Acquisition_Date],111) like N'%{Acquisition_Date}%')
  And (N'{Current_Status}' = '' or a.[Current_Status] like N'%{Current_Status}%')
  And (N'{Custodian}' = '' or a.[Custodian] like N'%{Custodian}%')
  And (N'{Acquisition_Cost}' = '' or a.[Acquisition_Cost] like N'%{Acquisition_Cost}%')
  And (N'{Useful_Life}' = '' or a.[Useful_Life] like N'%{Useful_Life}%')
  And (N'{Residual_Value}' = '' or a.[Residual_Value] like N'%{Residual_Value}%')
  And (N'{Location}' = '' or ol.[Location] like N'%{Location}%')
  And (N'{Purchase_OrganizationID}' = '' or a.[Purchase_OrganizationID] like N'%{Purchase_OrganizationID}%')
  And (N'{UserID}' = '' or a.[UserID] like N'%{UserID}%')
  And ( 1 = {History} or (a.Histiry_Date is null) )
  And ( 0 = {Useful_Life_Date_Flag} or (DateAdd(year, isnull(a.Useful_Life,0), a.[Acquisition_Date]) < getdate()) )
  And ( 0 = {Warranty_Exp_Flag} or (DateAdd(month, 2, a.[Warranty_Exp_Date]) >= getdate()) )
  And ( 0 = {Maintenance_Date_Flag} or (DateAdd(day, isnull(a.Maintenance_Cycle,0), a.[Maintenance_Date]) < getdate()) )
  And (N'{Histiry_Date}' = '' or convert(varchar(10),a.[Histiry_Date],111) like N'%{Histiry_Date}%')
  And (N'{Useful_Life_Date}' = '' or Convert(varchar(20), DateAdd(year, isnull(a.Useful_Life,0), a.[Acquisition_Date]) ,111) like N'%{Useful_Life_Date}%')
  And (N'{Warranty_Exp_Date}' = '' or convert(varchar(10),a.[Warranty_Exp_Date],111) like N'%{Warranty_Exp_Date}%') 
  And (N'{Maintenance_Date}' = '' or convert(varchar(10),a.[Maintenance_Date],111) like N'%{Maintenance_Date}%') 
  ORDER BY a.[AssetID] DESC
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

 //Asset Info
router.post('/Asset_Info',  function (req, res, next) {
  console.log("Call Asset_Info Api:",req.body);
  var strSQL = "";

  // req.body.Mode === 0 表示取得Asset和Asset_Maintenance資料
  // req.body.Mode === 1 表示取得Asset資料
  // req.body.Mode === 2 表示取得Asset_Maintenance資料
  // req.body.Mode === 3 表示取得Asset_Custody_Log資料
  // req.body.Mode === 4 表示取得Asset_Borrowing_Log資料
  req.body.AssetID = req.body.AssetID != null ? req.body.AssetID : null;
  req.body.Mode = req.body.Mode ? req.body.Mode : 0;
  
  var strSQL = format(`
    Declare @Mode int = {Mode};
  
    if(@Mode = 0 or @Mode = 1)
    Begin
       SELECT a.[AssetID]      
       , a.Asset_Name
       , a.Brand_Model
       , a.Asset_CategoryID
       , cast(a.Asset_CategoryID as varchar) +' '+ c.[Asset_Category] as Asset_Category
       , t.Asset_Type
       , a.Specification
       , a.Ancillary_Equipment
       , a.Serial_NO
       , Convert(varchar(20), a.[Acquisition_Date],111) as [Acquisition_Date]
       , a.Acquisition_Method
       , a.Acquisition_Cost
       , a.Useful_Life
       , a.Residual_Value
       , iif(isnull(a.Useful_Life,0) = 0 ,0 , isnull(a.Acquisition_Cost,0) 
        - Round( (isnull(a.Acquisition_Cost,0) - isnull(a.Residual_Value,0)) 
            * iif( DATEDIFF(month, a.[Acquisition_Date], getdate()) / cast( 12 as money) > isnull(a.Useful_Life,0), isnull(a.Useful_Life,0),  
                  DATEDIFF(month, a.[Acquisition_Date], getdate()) / cast( 12 as money)
              ) / cast(a.Useful_Life as money)
          ,0)  
        ) as Present_Value        
       , a.Photo_Month
       , Convert(varchar(20), a.[Photo_Upload],111) as [Photo_Upload]
       , a.[Photo_Uploader]
       , a.[Current_Status]
       , a.[Custodian]
       , cast(a.LocationID as varchar) +' '+ ol.[Location] as Location
       , a.LocationID
        , a.Purchase_OrganizationID
       , a.[Maintenance_VendorID]
       , v.Maintenance_Vendor
       , v.Address
       , v.Phone_Number
       , v.Contact_Person
       , v.Remark
       , a.[Warranty_Method]
       , Convert(varchar(20), a.[Warranty_Exp_Date],111) as [Warranty_Exp_Date]       
       , a.[UserID]
       , a.[Data_Updater]
       , Convert(varchar(20), a.[Data_Update],111) as [Data_Update]
       , a.[History_User]
       , Convert(varchar(20), a.[Histiry_Date],120) as [Histiry_Date]
       , iif(History_User is null, 0, 1) as History  
       , a.Maintenance_Method
       , isnull(a.Maintenance_Cycle,0) as Maintenance_Cycle
       , Convert(varchar(10), a.[Maintenance_Date],111) as [Maintenance_Date]
       , s.Asset_StatusID
       , s.Asset_Status_ENG
       , s.Asset_Status_CHT
       FROM Asset a WITH (NoLock, NoWait)
       left Outer Join Organization_Location ol on ol.LocationID = a.LocationID
       Inner Join Asset_Category c with(NoLock,NoWait) on c.Asset_CategoryID = a.[Asset_CategoryID]
       Inner Join Asset_Type t with(NoLock,NoWait) on c.Asset_TypeID = t.[Asset_TypeID]
       Left Outer Join Maintenance_Vendor v with(NoLock,NoWait) on v.Maintenance_VendorID = a.[Maintenance_VendorID]
       Left Outer Join Asset_Status s with(NoLock,NoWait) on a.Asset_StatusID = s.[Asset_StatusID]
       WHERE AssetID = {AssetID}
    End
    if(@Mode = 0 or @Mode = 2)
    Begin
       SELECT am.Asset_MaintenanceID
       , am.Maintenance_Method
       , Convert(varchar(10), am.Maintenance_Date,111) as Maintenance_Date
       , am.Maintenance_No
       , am.Maintenance_Cost
       , am.Maintenance_VendorID
       , v.Maintenance_Vendor
       , am.Maintenance_Person
       , am.Condition_Description
       , am.Mantenance_Condition
       , a.Asset_Status_ENG
       , a.Asset_Status_CHT
       FROM Asset_Maintenance am WITH (NoLock, NoWait)
       Left Outer Join Maintenance_Vendor v with(NoLock,NoWait) on v.Maintenance_VendorID = am.[Maintenance_VendorID]
       Left Outer Join Asset_Status a with(NoLock,NoWait) on a.Asset_StatusID = am.[Mantenance_Condition]
       WHERE am.AssetID = {AssetID}
    End
    if(@Mode = 0 or @Mode = 3)
    Begin
       SELECT acl.Asset_Location_LogID
       , acl.AssetID
       , convert(varchar(10), acl.Date, 120) as [Date]
       , acl.LocationID
       , ol.Location
       , acl.Custodian
       , acl.Asset_Relocation_DetailID
       , ard.Asset_RelocationID
       FROM Asset_Custody_Log acl WITH (NoLock, NoWait)
       left Outer Join Organization_Location ol with(NoWait,NoLock) on ol.LocationID = acl.LocationID
       Left Outer Join Asset_Relocation_Detail ard with(NoLock,NoWait) on ard.Asset_Relocation_DetailID = acl.Asset_Relocation_DetailID
       WHERE acl.AssetID = {AssetID}
    End
    if(@Mode = 0 or @Mode = 4)
    Begin
       SELECT abl.Asset_Loan_LogID
       , abl.AssetID
       , Borrower
       , convert(varchar(10), abl.Borrow_Date, 120) as [Borrow_Date]
       , abl.[Borrow_Condition] as Borrow_Condition
       , a.Asset_Status_CHT as Borrow_Condition_CHT
       , a.Asset_Status_ENG as Borrow_Condition_ENG
       , convert(varchar(10), abl.Return_Date, 120) as [Return_Date]
       , abl.[Return_Condition]
       , b.Asset_Status_CHT as Return_Condition_CHT
       , b.Asset_Status_ENG as Return_Condition_ENG
       , abl.Remark
       FROM Asset_Borrowing_Log abl WITH (NoLock, NoWait)
       Left Outer Join Asset_Status a with(NoLock,NoWait) on a.Asset_StatusID = abl.[Borrow_Condition]
       Left Outer Join Asset_Status b with(NoLock,NoWait) on a.Asset_StatusID = abl.[Return_Condition]
       WHERE abl.AssetID = {AssetID}
    End

    `, req.body) ;
 
  //console.log(strSQL)
  db.sql(req.Enterprise, strSQL)
     .then((result) => {
        //console.log(result)
        var DataSet = {Asset: (req.body.Mode == 0 || req.body.Mode == 1) ? result.recordsets[0] : []
          , Asset_Maintenance: (req.body.Mode == 0) ? result.recordsets[1] : (req.body.Mode == 2 ? result.recordsets[0] : [])
          , Asset_Custody_Log: (req.body.Mode == 0) ? result.recordsets[2] : (req.body.Mode == 3 ? result.recordsets[0] : [])
          , Asset_Borrowing_Log: (req.body.Mode == 0) ? result.recordsets[3] : (req.body.Mode == 4 ? result.recordsets[0] : [])
       };
        res.send(DataSet);
     }).catch((err) => {
        console.log(err);
        res.status(500).send(err);
     })

});

 //Maintain Asset
 router.post('/Asset_Maintain',  function (req, res, next) {
  console.log("Call Asset_Maintain Api:",req.body);
  
  // req.body.Mode === 0 表示新增
  // req.body.Mode === 1 表示修改 
  // req.body.Mode === 2 表示刪除
  // req.body.Mode === 3 表示複製產生相同Asset資料
  req.body.AssetID = req.body.AssetID != null ? req.body.AssetID : '';

  var strSQL = format(`Declare  @ROWCOUNT int = 0, @AssetID int = {AssetID}; 
    `, req.body);

  switch(req.body.Mode){
     case 0:
        req.body.Asset_Name = req.body.Asset_Name != null ? `${req.body.Asset_Name.substring(0,65535).trim().replace(/'/g, '')}` : '';
        strSQL += format(`
        Insert into [dbo].[Asset] (Asset_Name, [Asset_CategoryID], Currency, UserID, Data_Updater, Data_Update)
        Select '{Asset_Name}' as Asset_Name
        , {Asset_CategoryID} as Asset_CategoryID
        , '{Currency}' as Currency
        , N'${req.UserID}' as UserID
        , N'${req.UserID}' as Data_Updater
        , GetDate() as Data_Update; 

        Set @ROWCOUNT = @@ROWCOUNT;
        Set @AssetID = scope_identity();
        `, req.body);
        break;
     case 1:
      var Size = 0;
      switch(req.body.Name){
        case 'Maintenance_No':
        case 'Acquisition_Date':
        case 'Acquisition_Method':
        case 'Warranty_Exp_Date':
        case 'Purchase_OrganizationID':
           Size = 10;
        break;
        case 'Brand_Model':
           Size = 30;
        break;
        case 'Serial_NO':
        case 'Custodian':
           Size = 20;
        break;
        case 'Warranty_Method':
           Size = 30;
        break;
        case 'Asset_Name':
        case 'Specification':
        case 'Current_Status':
        case 'Ancillary_Equipment':
           Size = 65535;
        break;
        default:
        break;
      }
      req.body.Value = Size == 0 ? (req.body.Value != null ? req.body.Value : null) : (req.body.Value != null ? `N'${req.body.Value.trim().replace(/'/g, "''")}'` : `''`);

      switch(req.body.Name){
        case "Custodian":
        case "LocationID":
          strSQL += format(`
            Update [dbo].[Asset] Set [{Name}] = {Value}
            , UserID = isnull(UserID, N'${req.UserID}')
            , Data_Updater = N'${req.UserID}'
            , Data_Update = GetDate()
            where AssetID = {AssetID}
            And (select count(*) From Asset_Custody_Log acl where acl.AssetID = {AssetID}) = 0;
    
            Set @ROWCOUNT = @@ROWCOUNT;
            `, req.body);

        break;
        case 'Acquisition_Cost':
          strSQL += format(`
            Update [dbo].[Asset] Set [Acquisition_Cost] = {Value}
            , Residual_Value = Round({Value} / (Useful_Life + 1),0)
            , UserID = isnull(UserID, N'${req.UserID}')
            , Data_Updater = N'${req.UserID}'
            , Data_Update = GetDate()
            where AssetID = {AssetID};
    
            Set @ROWCOUNT = @@ROWCOUNT;
            `, req.body);
        break;
        case 'Useful_Life':
          strSQL += format(`
            Update [dbo].[Asset] Set [Useful_Life] = {Value}
            , Residual_Value = Round(Acquisition_Cost / ({Value} + 1),0)
            , UserID = isnull(UserID, N'${req.UserID}')
            , Data_Updater = N'${req.UserID}'
            , Data_Update = GetDate()
            where AssetID = {AssetID};
    
            Set @ROWCOUNT = @@ROWCOUNT;
            `, req.body);
        break;
        case 'Histiry_Date':
          strSQL += format(`
            Update [dbo].[Asset] Set [{Name}] = iif({Value} = 1, GetDate(),Null)
            , History_User = iif({Value} = 1, N'${req.UserID}',Null)
            , UserID = isnull(UserID, N'${req.UserID}')
            , Data_Updater = N'${req.UserID}'
            , Data_Update = GetDate()
            where AssetID = {AssetID};
    
            Set @ROWCOUNT = @@ROWCOUNT;
            `, req.body);
        break;
        default:
          strSQL += format(`     
            Update [dbo].[Asset] Set [{Name}] = ${Size == 0 ? '{Value}': `substring({Value},1,${Size})`} 
            , UserID = isnull(UserID, N'${req.UserID}')
            , Data_Updater = N'${req.UserID}'
            , Data_Update = GetDate()
            where AssetID = {AssetID};
    
            Set @ROWCOUNT = @@ROWCOUNT;
            `, req.body);
        break;
      }
      break;
     case 2:
        strSQL += format(`    
        Delete FROM [dbo].[Asset]
        where AssetID = {AssetID};

        Set @ROWCOUNT = @@ROWCOUNT;
        `, req.body);      
        break;
     case 3:
        req.body.Copy_Qty = req.body.Copy_Qty != null ? req.body.Copy_Qty : 0;
        req.body.Photo_Month = req.body.Photo_Month != null ? req.body.Photo_Month : null;

        strSQL += format(`Declare @Copy_Qty int = {Copy_Qty};
        Declare @tmpTable table(AssetID int)

        while(@Copy_Qty != 0)
        Begin
          Insert into [dbo].[Asset] ([Asset_Name] ,[Brand_Model] ,[Asset_CategoryID] ,[Specification] ,[Ancillary_Equipment]
          ,[Serial_NO] ,[Acquisition_Date] ,[Acquisition_Method] ,[Acquisition_Cost] ,[Useful_Life]
          ,[Residual_Value] ,[Photo_Month] ,[Photo_Upload] ,[Photo_Uploader] ,[Current_Status]
          ,[Custodian] ,[LocationID] ,[Maintenance_VendorID] ,[Warranty_Method] ,[Warranty_Exp_Date]
          ,[UserID] ,[Data_Updater] ,[Data_Update] ,[History_User] ,[Histiry_Date]
          ,[Asset_StatusID] ,[Currency] ,[Asset_Relocation_DetailID] ,[Purchase_OrganizationID] ,[Purchase_DetailID])
          Select [Asset_Name] ,[Brand_Model] ,[Asset_CategoryID] ,[Specification] ,[Ancillary_Equipment]
          ,[Serial_NO] ,[Acquisition_Date] ,[Acquisition_Method] ,[Acquisition_Cost] ,[Useful_Life]
          ,[Residual_Value] ,[Photo_Month] ,[Photo_Upload] ,[Photo_Uploader] ,[Current_Status]
          ,[Custodian] ,[LocationID] ,[Maintenance_VendorID] ,[Warranty_Method] ,[Warranty_Exp_Date]
          ,[UserID] ,[Data_Updater] ,[Data_Update] ,[History_User] ,[Histiry_Date]
          ,[Asset_StatusID] ,[Currency] ,[Asset_Relocation_DetailID] ,[Purchase_OrganizationID] ,[Purchase_DetailID]
          From [Asset] a
          Where a.AssetID = {AssetID}

          Set @AssetID = scope_identity();
          Insert @tmpTable
          Select @AssetID as AssetID

          Set @Copy_Qty = @Copy_Qty -1;
        End

        Select * from @tmpTable;
        set @ROWCOUNT = @@ROWCOUNT;
        `, req.body);
      break;
    }

  strSQL += format(`    
    Select @ROWCOUNT as Flag, @AssetID as AssetID;
    `, req.body);     

  //console.log(strSQL) 
  db.sql(req.Enterprise, strSQL)
     .then(async (result) => {
        //console.log(result)
        var DataSet = {} ;
        var arr = []

        switch(req.body.Mode) {
          case 0:
          case 1:
            DataSet = {Flag: result.recordsets[0][0].Flag > 0, AssetID: result.recordsets[0][0].AssetID} ;
            await res.send(DataSet);  
          break;
          case 2:
            var path = `Images\\Assets\\Photos\\${req.body.Photo_Month}`;
            var file_s = req.body.AssetID;

            async function Todo() {
              try {
                await smbClient.DelFile(`${path}\\${file_s}.jpg`)
                await smbClient.DelFile(`${path}\\Thumb\\${file_s}.jpg`)
                await smbClient.DelFile(`${path}\\Large\\${file_s}.jpg`)
                
              } catch(err) {
                console.log(err)
                //smb2.disconnect();
                //res.status(503).send('Service Unavailable!')
              } finally {
               
              }
            } 
            await Todo();
            await console.log('res.send(DataSet)')
            await res.send({Flag: result.recordsets[0][0].Flag > 0, AssetID: result.recordsets[0][0].AssetID});  
/*

            arr.push(await smbClient.DelFile(`${path}\\Large\\${file_s}.jpg`)) 
            arr.push(await smbClient.DelFile(`${path}\\${file_s}.jpg`))
            arr.push(await smbClient.DelFile(`${path}\\Thumb\\${file_s}.jpg`))


            Promise.all(arr).then((value) => {
              //smb2.close();
            }).catch(function(err){
              smb2.disconnect();
            }).finally( function(){

              console.log('res.send(DataSet)')
              DataSet = {Flag: result.recordsets[1][0].Flag > 0, AssetID: result.recordsets[1][0].AssetID} ;
              //smb2.disconnect();

              res.send(DataSet);

            }) 
*/
          break;
          case 3:
            var path = `Images\\Assets\\Photos\\${req.body.Photo_Month}`;
            var file_s = `${path}\\Large\\${req.body.AssetID}.jpg`;
            //let data = null;
            const filename = ''
            const sourcePath_L = `./Assets/Photos/${req.body.Photo_Month}/Large/${req.body.AssetID}.jpg`
            const sourcePath = `./Assets/Photos/${req.body.Photo_Month}/${req.body.AssetID}.jpg`
            const sourcePath_S = `./Assets/Photos/${req.body.Photo_Month}/Thumb/${req.body.AssetID}.jpg`

            //await smb2.disconnect();
            await result.recordsets[0].forEach(async (item)=>{
              await ToDo(item.AssetID)
            })

            async function ToDo(dest) {
              try {

                  //console.log(item.AssetID
                  await smbClient.CopyFile(`${path}\\Thumb\\${req.body.AssetID}.jpg`, `${path}\\Thumb\\${dest}.jpg`);
                  await console.log(`CopyFile:${path}\\Thumb\\${dest}.jpg`)
                  await smbClient.CopyFile(`${path}\\${req.body.AssetID}.jpg`, `${path}\\${dest}.jpg`);
                  await console.log(`CopyFile:${path}\\${dest}.jpg`)
                  await smbClient.CopyFile(`${path}\\Large\\${req.body.AssetID}.jpg`, `${path}\\Large\\${dest}.jpg`);               
                  await console.log(`CopyFile:${path}\\Large\\${dest}.jpg`)
 
              } catch(err){
                console.log(err)
                //smb2.disconnect();
              } finally {


              }
            
            }

            await console.log('res.send(DataSet)')
            await res.send({Flag: result.recordsets[1][0].Flag > 0, AssetID: result.recordsets[1][0].AssetID});




            
/*
            async function ToDo() {
              try {

                await result.recordsets[0].forEach(async (item)=>{
                  var file_d = item.AssetID;
                  //console.log(item.AssetID
                  await smbClient.CopyFile(`${path}\\Thumb\\${req.body.AssetID}.jpg`, `${path}\\Thumb\\${file_d}.jpg`);
                  await smbClient.CopyFile(`${path}\\${req.body.AssetID}.jpg`, `${path}\\${file_d}.jpg`);
                  await smbClient.CopyFile(`${path}\\Large\\${req.body.AssetID}.jpg`, `${path}\\Large\\${file_d}.jpg`);
            
                })
                //smb2.disconnect();
  
              } catch(err){
                console.log(err)
                smb2.disconnect();
                res.status(503).send('Service Unavailable!')
              } finally {

                console.log('res.send(DataSet)')
                await res.send({Flag: result.recordsets[1][0].Flag > 0, AssetID: result.recordsets[1][0].AssetID});

              }
            
            }
            ToDo()
*/            
/*
            var A = await smb2.readFile(file_s,  async function (err, data) {
              if (err) {
                console.log(err)
              } else {
                //data = data1;
                await result.recordsets[0].forEach(async (item)=>{
                  var file_d = item.AssetID;
                  //console.log(item.AssetID
                  arr.push(await smbClient.imgWriteFile(1500, data, `${path}\\Large\\${file_d}.jpg`));
                  console.log('imgWriteFile 1500')
                  arr.push(await smbClient.imgWriteFile(320, data, `${path}\\${file_d}.jpg`));
                  console.log('imgWriteFile 320')
                  arr.push(await smbClient.imgWriteFile(120, data, `${path}\\Thumb\\${file_d}.jpg`));                   
                  console.log('imgWriteFile 120')
             
                })
                //await smb2.disconnect();

                  //await smb2.close();
              }
            });
            arr.push(A)
            
            Promise.all(arr).then((value) => {
              //smb2.close();
            }).catch(function(err){
              smb2.disconnect();
            }).finally( function(){

              console.log('res.send(DataSet)')
              DataSet = {Flag: result.recordsets[1][0].Flag > 0, AssetID: result.recordsets[1][0].AssetID} ;
              //smb2.disconnect();

              res.send(DataSet);

            }) 
*/

 /*           
            try {
            
            await result.recordsets[0].forEach(async (item)=>{
              //console.log(item.AssetID
              console.log('FTP Large')
              arr.push( upload(`Images\\Assets\\Photos\\${req.body.Photo_Month}\\Large\\${req.body.AssetID}.jpg`, `./Assets/Photos/${req.body.Photo_Month}/Large/${item.AssetID}.jpg`));
              console.log('FTP middle')
              arr.push(upload(`Images\\Assets\\Photos\\${req.body.Photo_Month}\\${req.body.AssetID}.jpg`, `./Assets/Photos/${req.body.Photo_Month}/${item.AssetID}.jpg`));
              console.log('FTP Large')
              arr.push(upload(`Images\\Assets\\Photos\\${req.body.Photo_Month}\\Thumb\\${req.body.AssetID}.jpg`, `./Assets/Photos/${req.body.Photo_Month}/Thumb/${item.AssetID}.jpg`));
         
            })
          } finally {
            Promise.all(arr).then((value) => {
              console.log('res.send(DataSet)')
              DataSet = {Flag: result.recordsets[1][0].Flag > 0, AssetID: result.recordsets[1][0].AssetID} ;
            
              res.send(DataSet);
 
            })

          }
*/


 /*          

            try {
              //data = await ReadPhotoFile(file_s)
              console.log(`ReadPhotoFile: ${file_s}`)
            
              arr.push( smb2.readFile(file_s,  async function (err, data) {
                if (err) {
                  console.log(err)
                } else {
                  //data = data1;
                  await result.recordsets[0].forEach(async (item)=>{
                    var file_d = item.AssetID;
                    //console.log(item.AssetID
                    arr.push( imgWriteFile(1500, data, `${path}\\Large\\${file_d}.jpg`));
                    console.log('imgWriteFile 1500')
                    arr.push( imgWriteFile(320, data, `${path}\\${file_d}.jpg`));
                    console.log('imgWriteFile 320')
                    arr.push( imgWriteFile(120, data, `${path}\\Thumb\\${file_d}.jpg`));                   
                    console.log('imgWriteFile 120')
               
                  })
                  //await smb2.disconnect();

                    //await smb2.close();
                }
              }));
            
              
  
            } catch( err){
              console.log(err)
              
            }   
             finally {
              Promise.all(arr).then(async (arr)=>{

                console.log('res.send(DataSet)')
                DataSet = {Flag: result.recordsets[1][0].Flag > 0, AssetID: result.recordsets[1][0].AssetID} ;
                
                await res.send(DataSet);

              })
            } 
*/
          break;
        }  

     }).catch((err) => {
        console.log(err);
        res.status(500).send(err);
     })


    const Smb2Practice = async () => {
      try {  
        //console.log(format('Save photo to Server:{0}', path));
        //await MKDir(`${path}\\Large`);
        console.log(format('Copy photo From {0} to {1}', `${path}\\Large\\${file_s}.jpg`, `${path}\\Large\\${file_d}.jpg`));
        await CopyFile(`${path}\\Large\\${file_s}.jpg`, `${path}\\Large\\${file_d}.jpg`);
        //await MKDir(`${path}`);
        console.log(format('Copy photo From {0} to {1}', `${path}\\${file_s}.jpg`, `${path}\\${file_d}.jpg`));
        await CopyFile(`${path}\\${file_s}.jpg`, `${path}\\${file_d}.jpg`);
        //await MKDir(`${path}\\Thumb`);
        console.log(format('Copy photo From {0} to {1}', `${path}\\Thumb\\${file_s}.jpg`, `${path}\\Thumb\\${file_d}.jpg`));
        await CopyFile(`${path}\\Thumb\\${file_s}.jpg`, `${path}\\Thumb\\${file_d}.jpg`);
      } catch (error) {
        console.log(error)
        //await smb2.unlink(`${path}\\Large\\${file_s}.jpg`);
        //await smb2.unlink(`${path}\\${file_s}.jpg`);
        //await smb2.unlink(`${path}\\Thumb\\${file_s}.jpg`);
      }
    }

});

//Maintain Asset_Maintenance
router.post('/Asset_Maintenance_Maintain',  function (req, res, next) {
  console.log("Call Asset_Maintenance_Maintain Api:",req.body);
  var strSQL = "";

  // req.body.Mode === 0 表示新增
  // req.body.Mode === 1 表示修改 
  // req.body.Mode === 2 表示刪除   
  req.body.AssetID = req.body.AssetID != null ? req.body.AssetID : null;
  req.body.Asset_MaintenanceID = req.body.Asset_MaintenanceID != null ? req.body.Asset_MaintenanceID : null;

  strSQL = format(`Declare @ROWCOUNT int = 0;
    `, req.body);    
  
  switch(req.body.Mode){
     case 0:
      
        req.body.Maintenance_Method = req.body.Maintenance_Method != null ? `N'${req.body.Maintenance_Method.trim().substring(0,10).replace(/'/g, '')}'` : `''`;
        req.body.Maintenance_VendorID = req.body.Maintenance_VendorID != null ? req.body.Maintenance_VendorID : 0;
        req.body.Maintenance_Date = req.body.Maintenance_Date != null ? `N'${req.body.Maintenance_Date.trim().substring(0,10).replace(/'/g, '')}'` : `''`;
        req.body.Maintenance_No = req.body.Maintenance_No != null ? `N'${req.body.Maintenance_No.trim().substring(0,10).replace(/'/g, '')}'` : `''`;
        req.body.Maintenance_Cost = req.body.Maintenance_Cost != null ? req.body.Maintenance_Cost : 0;
        req.body.Maintenance_Person = req.body.Maintenance_Person != null ? `N'${req.body.Maintenance_Person.trim().substring(0,30).replace(/'/g, '')}'` : `''`;
        req.body.Condition_Description = req.body.Condition_Description != null ? req.body.Condition_Description : `''`;

        strSQL += format(`
        Insert into [dbo].[Asset_Maintenance] (AssetID, Maintenance_Method, Maintenance_VendorID, Maintenance_Date, Maintenance_No, Maintenance_Cost, Maintenance_Person, Condition_Description)
        Select {AssetID} as AssetID
        , {Maintenance_Method} as Maintenance_Method
        , {Maintenance_VendorID} as Maintenance_VendorID
        , {Maintenance_Date} as Maintenance_Date
        , {Maintenance_No} as Maintenance_No
        , {Maintenance_Cost} as Maintenance_Cost
        , {Maintenance_Person} as Maintenance_Person
        , '{Condition_Description}' as Condition_Description

        Set @ROWCOUNT = @@ROWCOUNT;
        `, req.body);
        break;
     case 1:
      var Size = 0;
      switch(req.body.Name){
        case 'Maintenance_Date':
        case 'Maintenance_No':
           Size = 10;
        break;
        case 'Maintenance_Person':
          Size = 30;
        break;
        case 'Maintenance_Method':
          Size = 10;
        break;
        default:
        break;
      }
      req.body.Value = Size == 0 ? (req.body.Value != null ? req.body.Value : null) : (req.body.Value != null ? `N'${req.body.Value.trim().replace(/'/g, "''")}'` : `''`);

      strSQL += format(`     
        Update [dbo].[Asset_Maintenance] Set [{Name}] = ${Size == 0 ? '{Value}': `substring({Value},1,${Size})`} 
        where Asset_MaintenanceID = {Asset_MaintenanceID}
        Set @ROWCOUNT = @@ROWCOUNT;
        `, req.body);

        break;
     case 2:
        strSQL += format(`    
        Delete FROM [dbo].[Asset_Maintenance]
        where Asset_MaintenanceID = {Asset_MaintenanceID};
        Set @ROWCOUNT = @@ROWCOUNT;
        `, req.body);      
        break;
  }

  strSQL += format(`
    Select @ROWCOUNT as Flag;

    if(@ROWCOUNT > 0)
    begin
      Update Asset set Maintenance_Date = tmp.Maintenance_Date
      , Maintenance_Method = tmp.Maintenance_Method
      From Asset a
      Inner Join (
        SELECT top 1 am.AssetID, Maintenance_Method, am.Maintenance_Date
        FROM Asset_Maintenance am WITH (NoLock, NoWait)
        WHERE am.AssetID = {AssetID}
        Order by am.Maintenance_Date desc 
      ) tmp on a.AssetID = tmp.AssetID 
     End
    `, req.body);
  //console.log(strSQL)
  db.sql(req.Enterprise, strSQL)
     .then((result) => {
        //console.log(result)
        var DataSet = {Flag:result.recordsets[0][0].Flag > 0} ;
        res.send(DataSet);
     }).catch((err) => {
        console.log(err);
        res.status(500).send(err);
     })

});

//Get Maintenance_Vendor
router.post('/Maintenance_Vendor',  function (req, res, next) {
  console.log("Call Maintenance_Vendor Api:");
  
  req.body.Maintenance_VendorID = req.body.Maintenance_VendorID != null ? req.body.Maintenance_VendorID : `''`;
  req.body.Maintenance_Vendor = req.body.Maintenance_Vendor != null ? `${req.body.Maintenance_Vendor.trim().replace(/'/g, '')}` : '';

  var strSQL = format(`
  SELECT Top 1000 mv.Maintenance_VendorID
  , mv.Maintenance_Vendor
  , mv.[Address]
  , mv.[Phone_Number]
  , mv.[Contact_Person]
  , mv.[Remark]
  FROM Maintenance_Vendor mv With(Nolock,NoWait)
  where ({Maintenance_VendorID} = '' or mv.Maintenance_VendorID = {Maintenance_VendorID})
  Order By Maintenance_VendorID
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

//Maintain Maintenance_Vendor
router.post('/Maintenance_Vendor_Maintain',  function (req, res, next) {
  console.log("Call Maintenance_Vendor_Maintain Api:",req.body);
 
  // req.body.Mode === 0 表示新增
  // req.body.Mode === 1 表示修改 
  // req.body.Mode === 2 表示刪除   
  req.body.Maintenance_VendorID = req.body.Maintenance_VendorID != null ? req.body.Maintenance_VendorID : null;

  var strSQL = format(`Declare  @ROWCOUNT int = 0, @Maintenance_VendorID int = {Maintenance_VendorID}; 
    `, req.body);
  
  switch(req.body.Mode){
     case 0:
        req.body.Maintenance_Vendor = req.body.Maintenance_Vendor != null ? `N'${req.body.Maintenance_Vendor.trim().substring(0,50).replace(/'/g, '')}'` : `''`;
        req.body.Address = req.body.Address != null ? `N'${req.body.Address.trim().substring(0,65535).replace(/'/g, '')}'` : `''`;
        req.body.Phone_Number = req.body.Phone_Number != null ? `N'${req.body.Phone_Number.trim().substring(0,30).replace(/'/g, '')}'` : `''`;
        req.body.Contact_Person = req.body.Contact_Person != null ? `N'${req.body.Contact_Person.trim().substring(0,30).replace(/'/g, '')}'` : `''`;
        req.body.Remark = req.body.Remark != null ? `N'${req.body.Remark.trim().substring(0,65535).replace(/'/g, '')}'` : `''`;

        strSQL += format(`
        Insert into [dbo].[Maintenance_Vendor] (Maintenance_Vendor, Address, Phone_Number, Contact_Person, Remark)
        Select {Maintenance_Vendor} as Maintenance_Vendor
        , {Address} as Address
        , {Phone_Number} as Phone_Number
        , {Contact_Person} as Contact_Person
        , {Remark} as Remark

        Set @ROWCOUNT = @@ROWCOUNT;
        Set @Maintenance_VendorID = scope_identity();
        `, req.body);
        break;
     case 1:
      var Size = 0;
      switch(req.body.Name){
        case 'Phone_Number':
        case 'Contact_Person':
           Size = 30;
        break;
        case 'Maintenance_Vendor':
           Size = 50;
        break;
        case 'Address':
        case 'Remark':
            Size = 65535;
        break;
        default:
        break;
      }
      req.body.Value = Size == 0 ? (req.body.Value != null ? req.body.Value : null) : (req.body.Value != null ? `N'${req.body.Value.trim().replace(/'/g, "''")}'` : `''`);

      strSQL += format(`     
        Update [dbo].[Maintenance_Vendor] Set [{Name}] = ${Size == 0 ? '{Value}': `substring({Value},1,${Size})`} 
        where Maintenance_VendorID = {Maintenance_VendorID};
        Set @ROWCOUNT = @@ROWCOUNT;
        `, req.body);

        break;
     case 2:
        strSQL += format(`    
        Delete FROM [dbo].[Maintenance_Vendor]
        where Maintenance_VendorID = {Maintenance_VendorID};
        Set @ROWCOUNT = @@ROWCOUNT;
        `, req.body);      
        break;
  }

  strSQL += format(`    
    Select @ROWCOUNT as Flag, @Maintenance_VendorID as Maintenance_VendorID;
    `, req.body);       
  //console.log(strSQL)
  db.sql(req.Enterprise, strSQL)
     .then((result) => {
        //console.log(result)
        var DataSet = {Flag: result.recordsets[0][0].Flag > 0, Maintenance_VendorID: result.recordsets[0][0].Maintenance_VendorID} ;
        res.send(DataSet);
     }).catch((err) => {
        console.log(err);
        res.status(500).send(err);
     })

});

//Save photo to Asset folder.
router.post('/Save_Asset_Photo_to_Asset', function (req, res, next) {
  console.log("Call Save_Asset_Photo_to_Asset API")
  var form = new formidable.IncomingForm();
  var File = [];
  var Fields = {};
  //var path = "Z:\\Images\\Assets\\Photos";
  form.parse(req);
  form.on('field', function (name, value) {
    Fields = JSON.parse(value);
    //console.log(Fields)
    Fields.Photo_Month = Fields.Photo_Month === 'null' ? moment().format('YYMM') : Fields.Photo_Month;
    Fields['UserID'] = req.UserID;
    //console.log(Fields)
  });

  form.on('file', function (name, file) {
    File.push(file.path);
  });

  form.on('end', function () {
    var file = format(`{0}.jpg`, Fields.AssetID);     
    var comp_path = `Images\\Assets\\Photos`;
    var path = format("{0}\\{1}", comp_path, Fields.Photo_Month);
    var strSQL = format(`Update Asset set Photo_Month = '{Photo_Month}'
    , Photo_Uploader = '{UserID}'
    , Photo_Upload = getdate()
    Where AssetID = N'{AssetID}';
    `, Fields);    
     
    // console.log(strSQL);
    db.sql(req.Enterprise, strSQL)
      .then((result) => {
        smb2.exists(`${comp_path}`, function (err, exists) { // 執行檢查資料夾及建立檔案
          if (err) {
            console.log(err)
            //smb2.disconnect();
            //smb2.close();
            res.status(503).send('Service Unavailable!')
          } else {
            const Smb2Practice = async () => {
              try {
                if (File.length > 0) {
                  console.log(format('Save photo to Server:{0}', path));
                  await smbClient.MKDir(path);
                  await smbClient.MKDir(`${path}\\Large`);
                  await smbClient.MKDir(`${path}\\Thumb`);                   
                  await smbClient.imgWriteFile(1500, File[0], `${path}\\Large\\${file}`);
                  await smbClient.imgWriteFile(320, File[0], `${path}\\${file}`);
                  await smbClient.imgWriteFile(120, File[0], `${path}\\Thumb\\${file}`);                   
                  await res.send({
                    flag: "success",
                    Photo_Month: Fields.Photo_Month
                  });                   
                } else {
                  res.send({
                    flag: "success",
                    Photo_Month: Fields.Photo_Month
                  });
                }
              } catch (error) {
                console.log(error)
                //smb2.close();
                //smb2.disconnect();
                res.status(503).send('Service Unavailable!');
              }
            }
            Smb2Practice()
          }
        });
      }).catch((err) => {
        console.log(err);
        //smb2.close();
        //smb2.disconnect();
        res.status(500).send(err);
      })

    function MKDir(path) {
      return new Promise((resolve, reject) => {
        smb2.exists(path, function (err, exists) {
          if (err) reject(err);
          if (!exists) {
            smb2.mkdir(path, (err) => {
              if (err) {
                console.log(`${path}:無法建立`);
                reject(err);
              } else {
                console.log(`${path}:已建立`);
                resolve('success');
              }
            });
          } else {
            console.log(`${path}:已存在`);
            resolve(`${path}:已存在`);
          }
        });
      });
    }

    function imgWriteFile(size, src, dest) {
      return new Promise(function (resolve, reject) {
        sharp(src).resize(size, size, {
          fit: sharp.fit.inside,
          withoutEnlargement: true // 若原圖尺寸沒超過設定的大小，則不壓縮
        }).jpeg({
          quality: 85
        }).toBuffer().then(mBuffer => {
          smb2.writeFile(dest, mBuffer, {
            flags: 'w'
          }, function (err) {
            if (err) {
              reject(err);
            } else {
              console.log(format("{0} 儲存成功", dest));
              resolve(format("{0} 儲存成功", dest));
            }
          });
        });
      })
    }
  });
});

//Get Asset_Report_Info
router.post('/Asset_Report_Info',  function (req, res, next) {
  console.log("Call Asset_Report_Info Api:",req.body);

  req.body.Mode = req.body.Mode ? req.body.Mode : 0;
  req.body.AssetID = req.body.AssetID ? req.body.AssetID : null;
  req.body.Acquisition_Date = req.body.Acquisition_Date ? req.body.Acquisition_Date : ``; 
  req.body.Histiry_Date = req.body.Histiry_Date ? req.body.Histiry_Date : ``; 
  req.body.Warranty_Exp_Date = req.body.Warranty_Exp_Date ? req.body.Warranty_Exp_Date : ``; 
  req.body.Maintenance_Date = req.body.Maintenance_Date ? req.body.Maintenance_Date : ``; 
  
  //Mode == 0 Get Report Data: 財產目錄
  //Mode == 1 Get Report Data: 固定資產轉移單
     
  var strSQL = format(` Declare @Mode int = {Mode}, @AssetID int = {AssetID};
  `, req.body) ;
  switch(req.body.Mode) {
     case 0:
      strSQL += format(`
        SELECT a.[AssetID]
        , a.Asset_Name
        , a.Brand_Model
        , a.Asset_CategoryID
        , c.Asset_Category
        , t.Asset_Type
        , a.Specification
        , a.Ancillary_Equipment
        , a.Serial_NO
        , Convert(varchar(20), a.[Acquisition_Date],111) as [Acquisition_Date]
        , a.Acquisition_Method
        , a.Acquisition_Cost
        , a.Useful_Life
        , Convert(varchar(20), DateAdd(year, isnull(a.Useful_Life,0), a.[Acquisition_Date]) ,111) as [Useful_Life_Date]
        , iif(DateAdd(year, isnull(a.Useful_Life,0), a.[Acquisition_Date]) < getdate(), 1, 0) as [Useful_Life_Date_Flag]
        , a.Residual_Value
        , iif(isnull(a.Useful_Life,0) = 0 ,0 , isnull(a.Acquisition_Cost,0) 
          - Round( (isnull(a.Acquisition_Cost,0) - isnull(a.Residual_Value,0)) 
              * iif( DATEDIFF(month, a.[Acquisition_Date], getdate()) / cast( 12 as money) > isnull(a.Useful_Life,0), isnull(a.Useful_Life,0),  
                     DATEDIFF(month, a.[Acquisition_Date], getdate()) / cast( 12 as money)
                ) / cast(a.Useful_Life as money)
            ,0)  
          ) as Present_Value 
        , a.Photo_Month
        , Convert(varchar(20), a.[Photo_Upload],111) as [Photo_Upload]
        , a.[Photo_Uploader]
        , a.[Current_Status]
        , a.[Custodian]
        , ol.[Location]
        , a.[Maintenance_VendorID]
        , a.[Warranty_Method]
        , Convert(varchar(20), a.[Warranty_Exp_Date],111) as [Warranty_Exp_Date]
        , iif(a.[Warranty_Exp_Date] < getdate(), 1, 0) as [Warranty_Exp_Date_Flag]
        , iif( DateAdd(day, isnull(a.Maintenance_Cycle,0), a.Maintenance_Date) < GetDate(), null,  Convert(varchar(20), a.[Maintenance_Date],111) ) as Maintenance_Date
        , a.[UserID]
        , a.[Data_Updater]
        , Convert(varchar(20), a.[Data_Update],111) as [Data_Update]
        , a.[History_User]
        , Convert(varchar(20), a.[Histiry_Date],111) as [Histiry_Date]
        FROM Asset a WITH (NoLock, NoWait)
        left Outer Join Organization_Location ol on ol.LocationID = a.LocationID
        Inner Join Asset_Category c with(NoLock,NoWait) on c.Asset_CategoryID = a.[Asset_CategoryID]
        Inner Join Asset_Type t with(NoLock,NoWait) on c.Asset_TypeID = t.[Asset_TypeID]
        where (N'{Acquisition_Date}' = '' or convert(varchar(10),a.[Acquisition_Date],111) like N'%{Acquisition_Date}%')
        And (N'{Histiry_Date}' = '' or convert(varchar(10),a.[Histiry_Date],111) like N'%{Histiry_Date}%')
        And (N'{Useful_Life_Date}' = '' or Convert(varchar(20), DateAdd(year, isnull(a.Useful_Life,0), a.[Acquisition_Date]) ,111) like N'%{Useful_Life_Date}%')
        And (N'{Warranty_Exp_Date}' = '' or convert(varchar(10),a.[Warranty_Exp_Date],111) like N'%{Warranty_Exp_Date}%') 
        And (N'{Maintenance_Date}' = '' or convert(varchar(10),a.[Maintenance_Date],111) like N'%{Maintenance_Date}%') 
        ORDER BY t.[Asset_Type] DESC
        `, req.body);
           break;
     case 1:
        strSQL += format(` 
      SELECT a.[AssetID]      
       , a.Asset_Name
       , a.Brand_Model
       , a.Asset_CategoryID
       , c.Asset_Category
       , t.Asset_Type
       , a.Specification
       , a.Ancillary_Equipment
       , a.Serial_NO
       , Convert(varchar(20), a.[Acquisition_Date],111) as [Acquisition_Date]
       , a.Acquisition_Method
       , a.Acquisition_Cost
       , a.Useful_Life
       , a.Residual_Value
       , iif(isnull(a.Useful_Life,0) = 0 ,0 , isnull(a.Acquisition_Cost,0) 
        - Round( (isnull(a.Acquisition_Cost,0) - isnull(a.Residual_Value,0)) 
            * iif( DATEDIFF(month, a.[Acquisition_Date], getdate()) / cast( 12 as money) > isnull(a.Useful_Life,0), isnull(a.Useful_Life,0),  
                  DATEDIFF(month, a.[Acquisition_Date], getdate()) / cast( 12 as money)
              ) / cast(a.Useful_Life as money)
          ,0)  
        ) as Present_Value
       , isnull(DATEDIFF(year, a.Acquisition_Date, getdate()) ,0) as Used_Years
       , isnull(DATEDIFF(month, a.Acquisition_Date, getdate()) -  DATEDIFF(year, a.Acquisition_Date, getdate()) * 12 ,0)  as Used_Months
       , a.Photo_Month
       , Convert(varchar(20), a.[Photo_Upload],111) as [Photo_Upload]
       , a.[Photo_Uploader]
       , a.[Current_Status]
       , a.[Custodian]
       , ol.[Location]
       , a.[Maintenance_VendorID]
       , v.Maintenance_Vendor
       , v.Address
       , v.Phone_Number
       , v.Contact_Person
       , v.Remark
       , a.[Warranty_Method]
       , Convert(varchar(20), a.[Warranty_Exp_Date],111) as [Warranty_Exp_Date]       
       , a.[UserID]
       , a.[Data_Updater]
       , Convert(varchar(20), a.[Data_Update],111) as [Data_Update]
       , a.[History_User]
       , Convert(varchar(20), a.[Histiry_Date],120) as [Histiry_Date]
       , iif(History_User is null, 0, 1) as History  
       , a.Maintenance_Method
       , isnull(a.Maintenance_Cycle,0) as Maintenance_Cycle
       , Convert(varchar(10), a.[Maintenance_Date],111) as [Maintenance_Date]
       FROM Asset a WITH (NoLock, NoWait)
       left Outer Join Organization_Location ol on ol.LocationID = a.LocationID
       Inner Join Asset_Category c with(NoLock,NoWait) on c.Asset_CategoryID = a.[Asset_CategoryID]
       Inner Join Asset_Type t with(NoLock,NoWait) on c.Asset_TypeID = t.[Asset_TypeID]
       Left Outer Join Maintenance_Vendor v with(NoLock,NoWait) on v.Maintenance_VendorID = a.[Maintenance_VendorID]
       WHERE AssetID = {AssetID}      
        
        `, req.body) ;
     break;
  }
  //console.log(strSQL)
  db.sql(req.Enterprise, strSQL)
     .then((result) => {
     var DataSet = { };

     switch(req.body.Mode) {
        case 0:
          DataSet = {Report_Info: []
          };

          DataSet.Report_Info = [...result.recordsets[0].reduce((r, e) => {
            let k = `${e.Asset_Category}`;
            if (!r.has(k)) {
              // console.log(r) 
              r.set(k, {Asset_Type: e.Asset_Type
                , Asset_Category: e.Asset_Category
                , Total_Acquisition_Cost: e.Acquisition_Cost
                , Total_Residual_Value: e.Residual_Value
                , Total_Present_Value: e.Present_Value
                
              })
            } else {
              r.get(k).Total_Acquisition_Cost += e.Acquisition_Cost;
              r.get(k).Total_Residual_Value += e.Residual_Value;
              r.get(k).Total_Present_Value += e.Present_Value;
            }
            return r;
          }, new Map).values()]

          DataSet.Report_Info.forEach((item)=>{
            item.Detail_Info = result.recordsets[0].filter((obj)=>(obj.Asset_Category==item.Asset_Category))
            item.Detail_Info.forEach((item)=>{
              item.Acquisition_Cost = Math.round((item.Acquisition_Cost)*10000)/10000;
              item.Residual_Value = Math.round((item.Residual_Value)*10000)/10000;
              item.Present_Value = Math.round((item.Present_Value)*10000)/10000;
            })  
          })


        break;
        case 1:
          DataSet = {Report_Info: result.recordsets[0]
          };

        break;
     }
     //console.log(DataSet)
       res.send(DataSet);
     }).catch((err) => {
        console.log(err);
        res.status(500).send(err);
     })
});

//Maintain Asset_Custody_Log
router.post('/Asset_Custody_Log_Maintain',  function (req, res, next) {
  console.log("Call Asset_Custody_Log_Maintain Api:",req.body);
  var strSQL = "";

  // req.body.Mode === 0 表示新增
  // req.body.Mode === 1 表示修改 
  // req.body.Mode === 2 表示刪除   
  req.body.Asset_Location_LogID = req.body.Asset_Location_LogID != null ? req.body.Asset_Location_LogID : null;
  req.body.Mode = req.body.Mode != null ? req.body.Mode : 0;

  strSQL = format(`Declare @Mode int = {Mode},  @ROWCOUNT int = 0, @Asset_Location_LogID int = {Asset_Location_LogID};
    `, req.body);    
  
  switch(req.body.Mode){
     case 0:
      
        req.body.AssetID = req.body.AssetID != null ? req.body.AssetID : 0;
        req.body.Date = req.body.Date != null ? `N'${req.body.Date.trim().substring(0,10).replace(/'/g, '')}'` : `'${moment().format('YYYY/MM/DD')}'`;
        req.body.LocationID = req.body.LocationID != null ? req.body.LocationID : 0;
        req.body.Custodian = req.body.Custodian != null ? `N'${req.body.Custodian.trim().substring(0,20).replace(/'/g, '')}'` : `''`;

        strSQL += format(`
        Insert into [dbo].[Asset_Custody_Log] (AssetID, [Date], LocationID, Custodian)
        Select {AssetID} as AssetID
        , {Date} as [Date]
        , {LocationID} as LocationID
        , {Custodian} as Custodian

        Set @ROWCOUNT = @@ROWCOUNT;
        Set @Asset_Location_LogID = scope_identity();

        `, req.body);
        break;
     case 1:
      var Size = 0;
      switch(req.body.Name){
        case 'Require_Date':
           Size = 10;
        break;
        case 'Task_Description':
          Size = 50;
        break;
        case 'Task_Owner':
          Size = 20;
        break;
        case 'Memo':
           Size = 65535;
        break;
        default:
        break;
      }
      req.body.Value = Size == 0 ? (req.body.Value != null ? req.body.Value : null) : (req.body.Value != null ? `N'${req.body.Value.trim().replace(/'/g, "''")}'` : `''`);

        switch(req.body.Name){
          default:
            strSQL += format(`
              Update [dbo].[Asset_Custody_Log] Set [{Name}] = ${Size == 0 ? '{Value}': `substring({Value},1,${Size})`} 
              where Asset_Location_LogID = {Asset_Location_LogID}
              Set @ROWCOUNT = @@ROWCOUNT;
              `, req.body);    
          break;
        }
        break;
     case 2:
        strSQL += format(`    
        Delete FROM [dbo].[Asset_Custody_Log]
        where Asset_Location_LogID = {Asset_Location_LogID};
        Set @ROWCOUNT = @@ROWCOUNT;

        `, req.body);      
        break;
  }

  strSQL += format(`
    Select @ROWCOUNT as Flag, @Asset_Location_LogID as Asset_Location_LogID;

    if(@ROWCOUNT > 0 And (@Mode = 0 or @Mode = 2))
    Begin
      Update Asset set LocationID = tmp.LocationID
      , Custodian = tmp.Custodian
      From Asset a
      Inner Join (
        SELECT Top 1 {AssetID} as AssetID, acl.LocationID, acl.Custodian, Convert(varchar(20), (acl.[Date]),111) as [Date]
        FROM Asset_Custody_Log acl WITH (NoLock, NoWait)
        WHERE acl.AssetID = {AssetID}
        Order by acl.[Date] desc
      ) tmp on a.AssetID = tmp.AssetID 
    End

    `, req.body);
  //console.log(strSQL)
  db.sql(req.Enterprise, strSQL)
     .then((result) => {
        //console.log(result)
        var DataSet = {Flag:result.recordsets[0][0].Flag > 0, Asset_Location_LogID: result.recordsets[0][0].Asset_Location_LogID} ;
        res.send(DataSet);
     }).catch((err) => {
        console.log(err);
        res.status(500).send(err);
     })

});

//Maintain Asset_Borrowing_Log
router.post('/Asset_Borrowing_Log_Maintain',  function (req, res, next) {
  console.log("Call Asset_Borrowing_Log_Maintain Api:",req.body);
  var strSQL = "";

  // req.body.Mode === 0 表示新增
  // req.body.Mode === 1 表示修改 
  // req.body.Mode === 2 表示刪除   
  req.body.Asset_Loan_LogID = req.body.Asset_Loan_LogID != null ? req.body.Asset_Loan_LogID : null;
  req.body.Mode = req.body.Mode != null ? req.body.Mode : 0;

  strSQL = format(`Declare @Mode int = {Mode},  @ROWCOUNT int = 0, @Asset_Loan_LogID int = {Asset_Loan_LogID};
    `, req.body);    
  
  switch(req.body.Mode){
     case 0:
      
        req.body.AssetID = req.body.AssetID != null ? req.body.AssetID : 0;
        req.body.Borrower = req.body.Borrower != null ? `N'${req.body.Borrower.trim().substring(0,20).replace(/'/g, '')}'` : `''`;
        req.body.Borrow_Date = req.body.Borrow_Date != null ? `N'${req.body.Borrow_Date.trim().substring(0,10).replace(/'/g, '')}'` : `'${moment().format('YYYY/MM/DD hh:mm:ss')}'`;
        req.body.Return_Date = req.body.Return_Date != null ? `N'${req.body.Return_Date.trim().substring(0,10).replace(/'/g, '')}'` : `''`;
        req.body.Remark = req.body.Remark != null ? `N'${req.body.Remark.trim().substring(0,50).replace(/'/g, '')}'` : `''`;

        strSQL += format(`
        Insert into [dbo].[Asset_Borrowing_Log] (AssetID, [Borrow_Date], Borrower, [Return_Date], [Remark])
        Select {AssetID} as AssetID
        , {Borrow_Date} as [Borrow_Date]
        , {Borrower} as Borrower
        , {Return_Date} as [Return_Date]
        , {Remark} as [Remark]

        Set @ROWCOUNT = @@ROWCOUNT;
        Set @Asset_Loan_LogID = scope_identity();

        `, req.body);
        break;
     case 1:
      var Size = 0;
      switch(req.body.Name){
        case 'Borrow_Date':
        case 'Return_Date':
           Size = 10;
        break;
        case 'Borrower':
          Size = 20;
        break;
        case 'Remark':
           Size = 50;
        break;
        default:
        break;
      }
      req.body.Value = Size == 0 ? (req.body.Value != null ? req.body.Value : null) : (req.body.Value != null ? `N'${req.body.Value.trim().replace(/'/g, "''")}'` : `''`);

        switch(req.body.Name){
          default:
            strSQL += format(`
              Update [dbo].[Asset_Borrowing_Log] Set [{Name}] = ${Size == 0 ? '{Value}': `substring({Value},1,${Size})`} 
              where Asset_Loan_LogID = {Asset_Loan_LogID}
              Set @ROWCOUNT = @@ROWCOUNT;
              `, req.body);    
          break;
        }
        break;
     case 2:
        strSQL += format(`    
        Delete FROM [dbo].[Asset_Borrowing_Log]
        where Asset_Loan_LogID = {Asset_Loan_LogID};
        Set @ROWCOUNT = @@ROWCOUNT;

        `, req.body);      
        break;
  }


  strSQL += format(`
    Select @ROWCOUNT as Flag, @Asset_Loan_LogID as Asset_Loan_LogID;
/*
    if(@ROWCOUNT > 0 And (@Mode = 0 or @Mode = 2))
    Begin
      Update Asset set LocationID = tmp.LocationID
      , Custodian = tmp.Custodian
      From Asset a
      Inner Join (
        SELECT Top 1 {AssetID} as AssetID, acl.LocationID, acl.Custodian, Convert(varchar(20), (acl.[Date]),111) as [Date]
        FROM Asset_Borrowing_Log acl WITH (NoLock, NoWait)
        WHERE acl.AssetID = {AssetID}
        Order by acl.[Date] desc
      ) tmp on a.AssetID = tmp.AssetID 
    End
*/
    `, req.body);
  //console.log(strSQL)
  db.sql(req.Enterprise, strSQL)
     .then((result) => {
        //console.log(result)
        var DataSet = {Flag:result.recordsets[0][0].Flag > 0, Asset_Loan_LogID: result.recordsets[0][0].Asset_Loan_LogID} ;
        res.send(DataSet);
     }).catch((err) => {
        console.log(err);
        res.status(500).send(err);
     })

});

// Get Asset_Relocation_List
router.post('/Asset_Relocation_List', function (req, res, next) {
  console.log("Call Asset Relocation List Api:", req.body);

  req.body.Asset_RelocationID	 = req.body.Asset_RelocationID	 != null ? req.body.Asset_RelocationID	 : ``;
  req.body.AssetID = req.body.AssetID != null ? req.body.AssetID : ``;
  req.body.Source_Location = req.body.Source_Location != null ? `${req.body.Source_Location.trim().substring(0, 10).replace(/'/g, '')}` : ``;
  req.body.Target_Location = req.body.Target_Location != null ? `${req.body.Target_Location.trim().substring(0, 10).replace(/'/g, '')}` : ``;
  req.body.Require_Date = req.body.Require_Date != null ? `${req.body.Require_Date.trim().substring(0, 10).replace(/'/g, '')}` : ``;
  req.body.Task_Owner = req.body.Task_Owner != null ? `${req.body.Task_Owner.trim().substring(0, 20).replace(/'/g, '')}` : ``;
  req.body.Memo = req.body.Memo != null ? `${req.body.Memo.trim().substring(0, 65535).replace(/'/g, '')}` : ``;


  let strSQL = format(`
  SELECT ar.Asset_RelocationID
  , a.[AssetID]      
  , a.Asset_Name
  , Source_Location.Location as Source_Location
  , Target_Location.Location as Target_Location
  , Convert(varchar(20), ar.[Require_Date],111) as [Require_Date]
  , ar.Task_Owner
  , ar.Memo
  FROM Asset_Relocation ar WITH (NoLock, NoWait)
  Left Outer Join Asset_Relocation_Detail ard WITH (NoLock, NoWait) on ar.Asset_RelocationID = ard.Asset_RelocationID
  Left Outer Join Asset a WITH (NoLock, NoWait) on a.[AssetID] = ard.[AssetID] 
  left Outer Join Organization_Location Source_Location on Source_Location.LocationID = ar.Source_LocationID
  left Outer Join Organization_Location Target_Location on Target_Location.LocationID = ar.Target_LocationID
  where (N'{Asset_RelocationID}' = '' or ar.[Asset_RelocationID] like N'%{Asset_RelocationID}%')
  And (N'{AssetID}' = '' or a.[AssetID] like N'%{AssetID}%')
  And (N'{Asset_Name}' = '' or a.[Asset_Name] like N'%{Asset_Name}%')
  And (N'{Source_Location}' = '' or Source_Location.Location like N'%{Source_Location}%')
  And (N'{Target_Location}' = '' or Target_Location.Location like N'%{Target_Location}%')
  And (N'{Require_Date}' = '' or convert(varchar(10),ar.[Require_Date],111) like N'%{Require_Date}%')
  And (N'{Task_Owner}' = '' or ar.[Task_Owner] like N'%{Task_Owner}%')
  And (N'{Memo}' = '' or ar.[Memo] like N'%{Memo}%')
  ORDER BY ar.[Asset_RelocationID] DESC
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

 //Asset Relocation Info
 router.post('/Asset_Relocation_Info',  function (req, res, next) {
  console.log("Call Asset_Relocation_Info Api:",req.body);
  var strSQL = "";

  // req.body.Mode === 0 表示取得Asset_Relocationt和Asset_Relocation_Detail資料
  // req.body.Mode === 1 表示取得Asset_Relocationt資料
  // req.body.Mode === 2 表示取得Asset_Relocation_Detail資料
  req.body.Asset_RelocationID = req.body.Asset_RelocationID != null ? req.body.Asset_RelocationID : null;
  req.body.Mode = req.body.Mode ? req.body.Mode : 0;
  
  var strSQL = format(`
    Declare @Mode int = {Mode};
  
    if(@Mode = 0 or @Mode = 1)
    Begin
      Select ar.Asset_RelocationID
      , Convert(varchar(20), ar.[Create_Date],111) as [Create_Date]
      , Convert(varchar(20), ar.[Require_Date],111) as [Require_Date]
      , Source_Location.Location as Source_Location
      , Target_Location.Location as Target_Location
      , ar.Task_Description
      , ar.Memo
      , ar.UserID
      , ar.Task_Owner
      From Asset_Relocation ar with(NoLock,NoWait)
      left Outer Join Organization_Location Source_Location on Source_Location.LocationID = ar.Source_LocationID
      left Outer Join Organization_Location Target_Location on Target_Location.LocationID = ar.Target_LocationID
      where ar.[Asset_RelocationID] = {Asset_RelocationID};

    End
    if(@Mode = 0 or @Mode = 2)
    Begin
       SELECT ard.Asset_Relocation_DetailID
       , ard.Asset_RelocationID
       , a.[AssetID]      
       , a.Asset_Name
       , a.Brand_Model
       , ard.[Custodian]
       , a.Asset_StatusID
       , v.Asset_Status_ENG
       , v.Asset_Status_CHT
       , iif(acl.Asset_Relocation_DetailID is null,1,0) as Exec_Flag
       FROM Asset_Relocation_Detail ard with(NoLock,NoWait)
       Inner Join Asset a WITH (NoLock, NoWait) on ard.AssetID = a.AssetID
       left Outer Join Asset_Custody_Log acl on acl.AssetID = a.AssetID and acl.Asset_Relocation_DetailID = ard.Asset_Relocation_DetailID
       Left Outer Join Asset_Status v with(NoLock,NoWait) on v.Asset_StatusID = a.[Asset_StatusID]
       WHERE ard.Asset_RelocationID = {Asset_RelocationID}
    End


    `, req.body) ;
 
  //console.log(strSQL)
  db.sql(req.Enterprise, strSQL)
     .then((result) => {
        //console.log(result)
        var DataSet = {Asset_Relocation: (req.body.Mode == 0 || req.body.Mode == 1) ? result.recordsets[0] : []
          , Asset_Relocation_Detail: (req.body.Mode == 0) ? result.recordsets[1] : (req.body.Mode == 2 ? result.recordsets[0] : [])
       };
        res.send(DataSet);
     }).catch((err) => {
        console.log(err);
        res.status(500).send(err);
     })

});

//Maintain Asset Relocation
router.post('/Asset_Relocation_Maintain',  function (req, res, next) {
  console.log("Call Asset_Relocation_Maintain Api:",req.body);
  var strSQL = "";

  // req.body.Mode === 0 表示新增
  // req.body.Mode === 1 表示修改 
  // req.body.Mode === 2 表示刪除   
  req.body.Asset_RelocationID = req.body.Asset_RelocationID != null ? req.body.Asset_RelocationID : null;
  req.body.Mode = req.body.Mode != null ? req.body.Mode : 0;

  strSQL = format(`Declare @ROWCOUNT int = 0, @Asset_RelocationID int = {Asset_RelocationID};
    `, req.body);    
  
  switch(req.body.Mode){
     case 0:
      
        req.body.Require_Date = req.body.Require_Date != null ? `N'${req.body.Require_Date.trim().substring(0,10).replace(/'/g, '')}'` : `''`;
        req.body.Source_LocationID = req.body.Source_LocationID != null ? req.body.Source_LocationID : 0;
        req.body.Target_LocationID = req.body.Target_LocationID != null ? req.body.Target_LocationID : 0;
        req.body.Task_Description = req.body.Task_Description != null ? `N'${req.body.Task_Description.trim().substring(0,50).replace(/'/g, '')}'` : `''`;
        req.body.Memo = req.body.Memo != null ? `N'${req.body.Memo.trim().substring(0,65535).replace(/'/g, '')}'` : `''`;
        req.body.Task_Owner = req.body.Task_Owner != null ? `N'${req.body.Task_Owner.trim().substring(0,20).replace(/'/g, '')}'` : `''`;

        strSQL += format(`
        Insert into [dbo].[Asset_Relocation] (Create_Date, Require_Date, Source_LocationID, Target_LocationID, Task_Description, Memo, Task_Owner, UserID)
        Select GetDate() as Create_Date
        , {Require_Date} as Require_Date
        , {Source_LocationID} as Source_LocationID
        , iif({Target_LocationID} = {Source_LocationID}, null, {Target_LocationID}) as Target_LocationID
        , {Task_Description} as Task_Description
        , {Memo} as Memo
        , {Task_Owner} as Task_Owner
        , '${req.UserID}' as UserID

        Set @ROWCOUNT = @@ROWCOUNT;
        Set @Asset_RelocationID = scope_identity();
        `, req.body);
        break;
     case 1:
      var Size = 0;
      switch(req.body.Name){
        case 'Require_Date':
           Size = 10;
        break;
        case 'Task_Description':
          Size = 50;
        break;
        case 'Task_Owner':
          Size = 20;
        break;
        case 'Memo':
           Size = 65535;
        break;
        default:
        break;
      }
      req.body.Value = Size == 0 ? (req.body.Value != null ? req.body.Value : null) : (req.body.Value != null ? `N'${req.body.Value.trim().replace(/'/g, "''")}'` : `''`);

        switch(req.body.Name){
          case 'Source_LocationID':
            strSQL += format(`
              Update [dbo].[Asset_Relocation] Set [{Name}] = ${Size == 0 ? '{Value}': `substring({Value},1,${Size})`} 
              , Target_LocationID =  iif(Target_LocationID = {Value}, null, Target_LocationID)
              where Asset_RelocationID = {Asset_RelocationID}
              And (Select count(*) From Asset_Relocation_Detail Where Asset_RelocationID = {Asset_RelocationID}) = 0
              Set @ROWCOUNT = @@ROWCOUNT;
              `, req.body);    
          break;
          case 'Target_LocationID':
            strSQL += format(`
              Update [dbo].[Asset_Relocation] Set [{Name}] = ${Size == 0 ? '{Value}': `substring({Value},1,${Size})`} 
              , Source_LocationID =  iif(Source_LocationID = {Value}, null, Source_LocationID)
              where Asset_RelocationID = {Asset_RelocationID}
              And (Select count(*) From Asset_Relocation_Detail Where Asset_RelocationID = {Asset_RelocationID}) = 0
              Set @ROWCOUNT = @@ROWCOUNT;
              `, req.body);    
          break;
          default:
            strSQL += format(`
              Update [dbo].[Asset_Relocation] Set [{Name}] = ${Size == 0 ? '{Value}': `substring({Value},1,${Size})`} 
              where Asset_RelocationID = {Asset_RelocationID}
              Set @ROWCOUNT = @@ROWCOUNT;
              `, req.body);    
          break;
        }
        break;
     case 2:
        strSQL += format(`    
        Delete FROM [dbo].[Asset_Relocation]
        where Asset_RelocationID = {Asset_RelocationID};
        Set @ROWCOUNT = @@ROWCOUNT;
        `, req.body);      
        break;
  }

  strSQL += format(`
    Select @ROWCOUNT as Flag, @Asset_RelocationID as Asset_RelocationID;

    `, req.body);
  //console.log(strSQL)
  db.sql(req.Enterprise, strSQL)
     .then((result) => {
        //console.log(result)
        var DataSet = {Flag:result.recordsets[0][0].Flag > 0, Asset_RelocationID: result.recordsets[0][0].Asset_RelocationID} ;
        res.send(DataSet);
     }).catch((err) => {
        console.log(err);
        res.status(500).send(err);
     })

});

//Maintain Asset Relocation Detail
router.post('/Asset_Relocation_Detail_Maintain',  function (req, res, next) {
  console.log("Call Asset_Relocation_Detail_Maintain Api:",req.body);
  var strSQL = "";

  // req.body.Mode === 0 表示新增
  // req.body.Mode === 1 表示修改 
  // req.body.Mode === 2 表示刪除
  // req.body.Mode === 3 表示執行財產調轉功能
  // req.body.Mode === 4 表示執行財產回復調轉功能
  req.body.Asset_RelocationID = req.body.Asset_RelocationID != null ? req.body.Asset_RelocationID : null;
  req.body.Asset_Relocation_DetailID = req.body.Asset_Relocation_DetailID != null ? req.body.Asset_Relocation_DetailID : null;
  req.body.Mode = req.body.Mode != null ? req.body.Mode : 0;

  strSQL = format(`Declare @Mode int = {Mode}, @ROWCOUNT int = 0, @Asset_RelocationID int = {Asset_RelocationID}, @Asset_Relocation_DetailID int = {Asset_Relocation_DetailID};
    `, req.body);    
  
  switch(req.body.Mode){
     case 0:
        req.body.Detail = req.body.Detail ? req.body.Detail : [];      

        strSQL += format(`
        Insert into [dbo].[Asset_Relocation_Detail] (Asset_RelocationID, AssetID, Custodian)
        Select {Asset_RelocationID} as Asset_RelocationID, a.AssetID, a.Custodian
        From Asset a with(NoLock,NoWait)
        Where a.AssetID in ('${req.body.Detail.join("','")}')

        Set @ROWCOUNT = @@ROWCOUNT;
        Set @Asset_Relocation_DetailID = scope_identity();
        `, req.body);
        break;
     case 1:
      var Size = 0;
      switch(req.body.Name){
        case 'Custodian':
          Size = 20;
        break;
        default:
        break;
      }
      req.body.Value = Size == 0 ? (req.body.Value != null ? req.body.Value : null) : (req.body.Value != null ? `N'${req.body.Value.trim().replace(/'/g, "''")}'` : `''`);

        switch(req.body.Name){
          default:
            strSQL += format(`
              Update [dbo].[Asset_Relocation_Detail] Set [{Name}] = ${Size == 0 ? '{Value}': `substring({Value},1,${Size})`} 
              where Asset_Relocation_DetailID = {Asset_Relocation_DetailID}
              Set @ROWCOUNT = @@ROWCOUNT;
              `, req.body);    
          break;
        }
        break;
     case 2:
        strSQL += format(`    
        Delete FROM [dbo].[Asset_Relocation_Detail]
        where Asset_Relocation_DetailID = {Asset_Relocation_DetailID};
        Set @ROWCOUNT = @@ROWCOUNT;
        `, req.body);      
        break;
     case 3:
      
        strSQL += format(`
        Insert into [dbo].[Asset_Custody_Log] (AssetID, [Date], LocationID, Custodian, Asset_Relocation_DetailID)
        Select ard.AssetID, GetDate() as [Date], ar.Target_LocationID as LocationID, ard.Custodian, ard.Asset_Relocation_DetailID
        From Asset_Relocation_Detail ard 
        Inner Join Asset_Relocation ar on ard.Asset_RelocationID = ar.Asset_RelocationID
        Where ard.Asset_Relocation_DetailID = {Asset_Relocation_DetailID}

        Set @ROWCOUNT = @@ROWCOUNT;

        `, req.body);
        break;
        case 4:
      
        strSQL += format(`
        Delete from [dbo].[Asset_Custody_Log] 
        Where AssetID = {AssetID}
        And Asset_Relocation_DetailID = {Asset_Relocation_DetailID}

        Set @ROWCOUNT = @@ROWCOUNT;

        `, req.body);
        break;
  }

  strSQL += format(`
    Select @ROWCOUNT as Flag, @Asset_Relocation_DetailID as Asset_Relocation_DetailID;

    if(@ROWCOUNT > 0 And (@Mode = 3 or @Mode = 4))
    Begin
      Update Asset set LocationID = tmp.LocationID
      , Custodian = tmp.Custodian
      From Asset a
      Inner Join (
        SELECT Top 1 {AssetID} as AssetID, acl.LocationID, acl.Custodian, Convert(varchar(20), (acl.[Date]),111) as [Date]
        FROM Asset_Custody_Log acl WITH (NoLock, NoWait)
        WHERE acl.AssetID = {AssetID}
        Order by acl.[Date] desc
      ) tmp on a.AssetID = tmp.AssetID 
    End


    `, req.body);
  //console.log(strSQL)
  db.sql(req.Enterprise, strSQL)
     .then((result) => {
        //console.log(result)
        var DataSet = {Flag:result.recordsets[0][0].Flag > 0, Asset_Relocation_DetailID: result.recordsets[0][0].Asset_Relocation_DetailID} ;
        res.send(DataSet);
     }).catch((err) => {
        console.log(err);
        res.status(500).send(err);
     })

});

// Get Asset_Relocation_Detail_Add_List
router.post('/Asset_Relocation_Detail_Add_List', function (req, res, next) {
  console.log("Call Asset Relocation Detail Add List Api:", req.body);

  req.body.Asset_RelocationID	 = req.body.Asset_RelocationID	 != null ? req.body.Asset_RelocationID	 : ``;

  let strSQL = format(`
       SELECT 0 as flag
       , ard.Asset_Relocation_DetailID
       , ar.Asset_RelocationID
       , a.[AssetID]      
       , a.Asset_Name
       , a.Brand_Model
       , a.[Custodian]
       , a.Asset_StatusID
       , v.Asset_Status_ENG
       , v.Asset_Status_CHT
       , a.Current_Status
       FROM Asset_Relocation ar with(NoLock,NoWait)
       Inner Join Asset a WITH (NoLock, NoWait) on ar.Source_LocationID = a.LocationID
       Left Outer Join Asset_Relocation_Detail ard with(NoLock,NoWait) on ard.AssetID = a.AssetID
       Left Outer Join Asset_Status v with(NoLock,NoWait) on v.Asset_StatusID = a.[Asset_StatusID]
       WHERE ar.Asset_RelocationID = {Asset_RelocationID}
       And ard.Asset_Relocation_DetailID is null
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


module.exports = router;