var express = require('express');
var router = express.Router();
var moment = require('moment');
const format = require('string-format');
var db = require('../../config/DB_Connect');
var formidable = require('formidable');
var smb2 = require('../../config/New_smb2');
//var smb2 = require('../../config/smb2');
const sharp = require('sharp');

/* Mark-Wang API Begin */

//Check Check_Model_No
router.post('/Check_Model_No',  function (req, res, next) {
   console.log("Call Check_Model_No Api:",req.body);

   req.body.Model_No = req.body.Model_No ? `${req.body.Model_No.trim().replace(/'/g, '')}` : '';

   var strSQL = format(`
   SELECT Count(*) as RecCount
   FROM [dbo].[Model] With(Nolock,NoWait)
   where ([Model_No] = N'{Model_No}');   
   `, req.body) ;
   //console.log(strSQL)
   db.sql(req.Enterprise, strSQL)
      .then((result) => {
         //console.log(result.recordset[0].RecCount <= 0)
         res.send({Flag: result.recordset[0].RecCount > 0});
      }).catch((err) => {
         console.log(err);
         res.status(500).send(err);
      })

});

//Check Model Debit Debit_No
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

//Get Model_List
router.post('/Model_List',  function (req, res, next) {
   console.log("Call Model_List Api:");

   req.body.Model_No = req.body.Model_No ? `${req.body.Model_No.trim().substring(0,20)}` : ``;
   req.body.Brand = req.body.Brand ? `${req.body.Brand.trim().substring(0,30)}` : ``;
   req.body.Owner = req.body.Owner ? `${req.body.Owner.trim().substring(0,15).replace(/'/g, '')}` : '';
   req.body.Category = req.body.Category ? `${req.body.Category.trim().substring(0,15)}` : '';
   req.body.Process_Type = req.body.Process_Type ? `${req.body.Process_Type.trim().substring(0,10)}` : '';
   req.body.Raw_Material = req.body.Raw_Material ? `${req.body.Raw_Material.trim().substring(0,20)}` : '';
   req.body.Location = req.body.Location ? `${req.body.Location.trim().substring(0,15)}` : '';
   req.body.UserID = req.body.UserID ? `${req.body.UserID.trim().substring(0,256).replace(/'/g, '')}` : '';   
   
   var strSQL = format(`
   SELECT Top 1000 row_number() Over(Order By Data_Update desc, o.[Model_No] ) as RecNo
   , o.[Model_No]
   , o.[Brand]
   , o.[Owner]
   , o.[Category]
   , o.[Process_Type]
   , o.[Raw_Material]
   , o.[Location]
   , isnull(o.[Photo_Month],'') as Photo_Month
   , o.[UserID]
   , o.[Data_Updater]
   , Convert(varchar(20), o.[Data_Update],120) as [Data_Update]
   FROM [dbo].[Model] o With(Nolock,NoWait)   
   where (N'{Model_No}' = ''  or o.[Model_No] like N'%{Model_No}%')
   And (N'{Brand}' = '' or o.[Brand] like N'%{Brand}%')
   And (N'{Owner}' = '' or o.[Owner] like N'%{Owner}%')   
   And (N'{Category}' = '' or o.[Category] like N'{Category}%')
   And (N'{Process_Type}' = '' or o.[Process_Type] like N'%{Process_Type}%')
   And (N'{Raw_Material}' = '' or o.[Raw_Material] like N'%{Raw_Material}%')
   And (N'{Location}' = '' or o.[Location] like N'%{Location}%')
   And (N'{UserID}' = '' or o.[UserID] like N'%{UserID}%')   
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

 //Get Model Info
router.post('/Model_Info',  function (req, res, next) {
   console.log("Call Model_Debit_Info Api:",req.body);  
 
   req.body.Model_No = req.body.Model_No ? `N'${req.body.Model_No.replace(/'/g, "''")}'` : `''`;
   req.body.Mode = req.body.Mode ? req.body.Mode : 0;
 
   //Mode == 0 Get Model And Model_Range Data
   //Mode == 1 Get Model Data
   //Mode == 2 Get Model_Range Data   
   var strSQL = format(`
   Declare @Mode int = {Mode}, @Model_No varchar(20) = {Model_No};
 
   if(@Mode = 0 or @Mode = 1)
   Begin
      SELECT s.[Model_No]
      , s.[Product_Type]
      , (Select Workshop From Workshop w with(NoLock,NoWait) Where w.[WorkshopID] = s.[WorkshopID] ) as WorkshopID
      , s.[Size_Mode]
      , s.[Photo_Month]
      , Convert(varchar(20),s.[Photo_Upload],120) as [Photo_Upload]
      , s.[Photo_Uploader]
      , s.[SPI_NO]
      , s.[Brand]
      , s.[Owner]
      , s.[Category]
      , s.[Location]
      , s.[Process_Type]
      , s.[Raw_Material]     
      , s.[Unit_Daily_Output]
      , s.[Use_Charge]
      , s.[Sample_Size]
      , s.[Unit_Price]
      , s.[Unit]
      , s.[Quarlity_Demands]
      , s.[UserID]
      , Convert(varchar(20),s.[Update_Date],120) as [Update_Date]
      , Convert(varchar(20),s.[Data_Update],120) as [Data_Update]
      , s.[Data_Updater]
      FROM Model s WITH(NoLock, NoWait)
      WHERE s.Model_No = @Model_No;
   End 
   if(@Mode = 0 or @Mode = 2)
   Begin
      Select r.[Model_RangeID]
      , r.[Model_No]
      , r.[Model_Range]
      , (Select Size_Name From Product_Size ps with(NoLock,NoWait) Where ps.SizeID = r.[Size_From] ) as [Size_From]
      , (Select Size_Name From Product_Size ps with(NoLock,NoWait) Where ps.SizeID = r.[Size_End] ) as [Size_End]
      , case when r.Size_From = r.Size_End then 
         case when r.Size_From = 0 then '-' else (Select rtrim(isnull(ps.Size_Name,'')) From Product_Size ps with(NoLock,NoWait) Where r.Size_From = ps.SizeID) End   
      else
         case when r.Size_From = 0 then '-' else (Select rtrim(isnull(ps.Size_Name,'')) From Product_Size ps with(NoLock,NoWait) Where r.Size_From = ps.SizeID ) End
         + ' ~ ' + 
         case when r.Size_End = 0 then '-' else (Select rtrim(isnull(ps.Size_Name,'')) From Product_Size ps with(NoLock,NoWait) Where r.Size_End = ps.SizeID ) End       
      End as Size_Fit
      , isnull(r.[Model_Qty],0) as Model_Qty
      , isnull(r.[Output_Qty],0) as Output_Qty
      , isnull(r.[Parts],0) as Parts
      , isnull(r.[Prerange],0) as Prerange
      , isnull(r.[Disable],0) as Disable
      , r.[Remark]
      From Model_Range r with(NoLock, NoWait) 
      Where r.Model_No = @Model_No
      --Order by r.Model_No, r.Model_Range;
   End
   if(@Mode = 0 or @Mode = 3)
   Begin
      Select Product_No
      , [Photo_Month]
      , Convert(varchar(20), [Photo_Upload],120) as [Photo_Upload]
      , [Photo_Uploader]
      From Style s with(NoLock, NoWait)
      Inner Join Product p with(NoLock, NoWait) on p.Style_No = s.Style_No
      Where s.Outsole_No = @Model_No
      And p.Photo_Month is not null
      Order by p.Product_No;
   End
   `, req.body) ;
   //console.log(strSQL)
   db.sql(req.Enterprise, strSQL)
      .then((result) => {
         var DataSet = {Model: (req.body.Mode == 0 || req.body.Mode == 1) ? result.recordsets[0] : []
           , Model_Range: (req.body.Mode == 0) ? result.recordsets[1] : (req.body.Mode == 2 ? result.recordsets[0] : [])
           , Product_Photos: (req.body.Mode == 0) ? result.recordsets[2] : (req.body.Mode == 3 ? result.recordsets[0] : [])           
        };
         //console.log(DataSet)
         res.send(DataSet);
      }).catch((err) => {
         console.log(err);
         res.status(500).send(err);
      })
});

//Maintain Model
router.post('/Model_Maintain',  function (req, res, next) {
   console.log("Call Model_Maintain Api:",req.body);

   // req.body.Mode === 0 表示新增
   // req.body.Mode === 1 表示修改
   // req.body.Mode === 2 表示刪除
   var Size = 0;
   req.body.Model_No = req.body.Model_No ? `N'${req.body.Model_No.trim().substring(0,20)}'` : `''`;
   
   var strSQL = format(`Declare @ROWCOUNT int, @Model_No nvarchar(20) = {Model_No}`, req.body);
   switch(req.body.Mode){
      case 0:
         req.body.Product_Type = req.body.Product_Type ? `N'${req.body.Product_Type.trim().substring(0,10).replace(/'/g, "''")}'` : `''`;
         req.body.WorkshopID = req.body.WorkshopID ? req.body.WorkshopID : null
         req.body.Size_Mode = req.body.Size_Mode ? `N'${req.body.Size_Mode.trim().substring(0,3).replace(/'/g, "''")}'` : `''`;
         req.body.Brand = req.body.Brand ? `N'${req.body.Brand.trim().substring(0,30).replace(/'/g, "''")}'` : `''`;
         req.body.Owner = req.body.Owner ? `N'${req.body.Owner.trim().substring(0,15).replace(/'/g, "''")}'` : `''`;
         req.body.Category = req.body.Category ? `N'${req.body.Category.trim().substring(0,15).replace(/'/g, "''")}'` : `''`;
         req.body.Location = req.body.Location ? `N'${req.body.Location.trim().substring(0,15).replace(/'/g, "''")}'` : `''`;
         strSQL += format(`
            Insert [dbo].[Model] (Model_No, Product_Type, WorkshopID, Size_Mode
               , [Brand], [Owner], [Category], [Location], [Quarlity_Demands]
               , UserID, Data_Updater, Data_Update)
            Select @Model_No as [Model_No], {Product_Type} as Product_Type, {WorkshopID} as WorkshopID, {Size_Mode} as Size_Mode
               , {Brand} as [Brand], {Owner} as [Owner], {Category} as [Category], {Location} as [Location]
               , N'硬度:  抗拉:kg/cm2 延伸:% 撕裂:kg/cm 耐磨:mm3' as [Quarlity_Demands]
               , N'${req.UserID}' as UserID, N'${req.UserID}' as Data_Updater, GetDate() as Data_Update;

            Set @ROWCOUNT = @@ROWCOUNT;
         `, req.body);
      break;
      case 1:
         switch(req.body.Name){
            case 'Model_No':
            case 'Raw_Material':
               Size = 20;
            break;
            case 'Product_Type':
            case 'Process_Type':
            case 'Unit':
               Size = 10;
            break;
            case 'Size_Mode':
               Size = 3;
            break;            
            case 'Brand':
               Size = 30;
            break;
            case 'Owner':
            case 'Category':
            case 'Location':
            case 'Sample_Size':
               Size = 15;
            break;
            case 'Quarlity_Demands':
               Size = 65535
            break;
            default:
            break;
         }
         req.body.Value = Size == 0 ? (req.body.Value ? req.body.Value : null) : (req.body.Value ? `N'${req.body.Value.trim().replace(/'/g, "''")}'` : `''`);

         strSQL += format(`         
            Update [dbo].[Model] Set [{Name}] = ${Size == 0 ? '{Value}': `substring({Value},1,${Size})`}
            where Model_No = @Model_No 
            ${req.body.Name == 'Model_No' ?  'And (Len({Value}) > 0 And (Select count(*) From Model m with(NoLock,NoWait) where m.Model_No = {Value}) = 0) ' : ''};
            
            Set @ROWCOUNT = @@ROWCOUNT;
            ${req.body.Name == 'Model_No' ?  `Set @Model_No = case when @ROWCOUNT > 0 then substring({Value},1,${Size}) else @Model_No end ` : ''};

         `, req.body);
      break;
      case 2:
         strSQL += format(`
            Delete FROM [dbo].[Model] 
            where Model_No = @Model_No
            And ((Select count(*) From Model_Range mr with(NoLock,NoWait) Where mr.Model_No = @Model_No) = 0);
                        
            Set @ROWCOUNT = @@ROWCOUNT;
         `, req.body);
      break;
        
   }

   strSQL += format(`
   Select @ROWCOUNT as Flag,  @Model_No as Model_No;

   if({Mode} = 1 and @ROWCOUNT > 0)
   Begin
      Update [dbo].[Model] Set UserID = isnull(UserID, N'${req.UserID}')
      , Data_Updater = N'${req.UserID}'
      , Data_Update = GetDate()
      where Model_No = @Model_No;
   End
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

//Maintain Model_Range
router.post('/Model_Range_Maintain',  function (req, res, next) {
   console.log("Call Model_Range_Maintain Api:",req.body);

   // req.body.Mode === 0 表示新增
   // req.body.Mode === 1 表示修改
   // req.body.Mode === 2 表示刪除
   var Size = 0;
   req.body.Model_No = req.body.Model_No ? `N'${req.body.Model_No.trim().substring(0,20).replace(/'/g, "''")}'` : `''`;
   req.body.Model_RangeID = req.body.Model_RangeID ? req.body.Model_RangeID : null;
   
   var strSQL = format(`Declare @ROWCOUNT int, @Model_RangeID int = {Model_RangeID}`, req.body);
   switch(req.body.Mode){
      case 0:          
         strSQL += format(`
            Insert [dbo].[Model_Range] (Model_No, Size_From, Size_End)
            Select {Model_No} Model_No, 0 as Size_From, 0 as Size_End

            Set @ROWCOUNT = @@ROWCOUNT;
            Set @Model_RangeID = scope_identity();
         `, req.body);
      break;
      case 1:
         switch(req.body.Name){
            case 'Model_Range':
               Size = 20;
            break;
            case 'Remark':
               Size = 50;
            break;
            default:
            break;
         }
         req.body.Value = Size == 0 ? (req.body.Value ? req.body.Value : 0) : (req.body.Value ? `N'${req.body.Value.trim().replace(/'/g, "''")}'` : `''`);

         strSQL += format(`         
            Update [dbo].[Model_Range] Set [{Name}] = ${Size == 0 ? '{Value}': `substring({Value},1,${Size})`}            
            where Model_RangeID = @Model_RangeID ;

            Set @ROWCOUNT = @@ROWCOUNT;            

         `, req.body);
      break;
      case 2:
         strSQL += format(`
            Delete FROM [dbo].[Model_Range] 
            where Model_RangeID = @Model_RangeID;
                        
            Set @ROWCOUNT = @@ROWCOUNT;
         `, req.body);
      break;
        
   }

   strSQL += format(`
   Select @ROWCOUNT as Flag,  @Model_RangeID as Model_RangeID;

   if({Mode} = 1 and @ROWCOUNT > 0)
   Begin
      Update [dbo].[Model] Set UserID = isnull(UserID, N'${req.UserID}')
      , Data_Updater = N'${req.UserID}'
      , Data_Update = GetDate()
      where Model_No = {Model_No};
   End
   `, req.body);
   //console.log(strSQL)
   db.sql(req.Enterprise, strSQL)
      .then((result) => {
         //console.log(result.recordsets[0])
         res.send({Flag:result.recordsets[0][0].Flag > 0, Model_RangeID: result.recordsets[0][0].Model_RangeID});
      }).catch((err) => {
         console.log(err);
         res.status(500).send(err);
      })
});

 //Get Selected Model Range Info
 router.post('/Selected_Model_Range_Info', function (req, res, next) {
   console.log("Call Selected_Model_Range_Info Api :", req.body);

   req.body.Model_RangeID = req.body.Model_RangeID ? req.body.Model_RangeID : 0;

   var strSQL = format(`
   Select Model_SizeID, s.Model_RangeID, rtrim(isnull(ps.Size_Name,'')) as Model_Size, s.Qty
   From Model_Size s with(NoLock,NoWait)
   Left Outer Join Product_Size ps with(NoLock,NoWait) on s.Model_Size = ps.SizeID
   Where s.Model_RangeID = {Model_RangeID}

   `, req.body );
   //console.log(strSQL);  

   db.sql(req.Enterprise, strSQL)
      .then((result) => {
         res.send(result.recordsets[0]);
      }).catch((err) => {
         console.log(err);
         res.status(500).send(err);
      })

});

//Maintain Model_Size
router.post('/Model_Size_Maintain',  function (req, res, next) {
   console.log("Call Model_Size_Maintain Api:",req.body);

   // req.body.Mode === 0 表示新增
   // req.body.Mode === 1 表示修改
   // req.body.Mode === 2 表示刪除
   var Size = 0;
   req.body.Model_No = req.body.Model_No ? `N'${req.body.Model_No.trim().substring(0,20).replace(/'/g, "''")}'` : `''`;
   req.body.Model_RangeID = req.body.Model_RangeID ? req.body.Model_RangeID : null;
   req.body.Model_SizeID = req.body.Model_SizeID ? req.body.Model_SizeID : null;  
   
   var strSQL = format(`Declare @ROWCOUNT int, @Model_RangeID int = {Model_RangeID}, @Model_SizeID int = {Model_SizeID}`, req.body);
   switch(req.body.Mode){
      case 0:          
         strSQL += format(`
            Insert [dbo].[Model_Size] (Model_RangeID, Model_Size, QTY)
            Select {Model_RangeID} Model_RangeID, 0 as Model_Size, 0 as QTY

            Set @ROWCOUNT = @@ROWCOUNT;
            Set @Model_SizeID = scope_identity();
         `, req.body);
      break;
      case 1:
         req.body.Value = Size == 0 ? (req.body.Value ? req.body.Value : 0) : (req.body.Value ? `N'${req.body.Value.trim().replace(/'/g, "''")}'` : `''`);

         strSQL += format(`         
            Update [dbo].[Model_Size] Set [{Name}] = ${Size == 0 ? '{Value}': `substring({Value},1,${Size})`}            
            where Model_SizeID = @Model_SizeID ;

            Set @ROWCOUNT = @@ROWCOUNT;
         `, req.body);
      break;
      case 2:
         strSQL += format(`
            Delete FROM [dbo].[Model_Size] 
            where Model_SizeID = @Model_SizeID;

            Set @ROWCOUNT = @@ROWCOUNT;
         `, req.body);
      break;
        
   }

   strSQL += format(`
   Select @ROWCOUNT as Flag,  @Model_SizeID as Model_SizeID;

   if(@ROWCOUNT > 0)
   Begin
      Update [dbo].[Model] Set UserID = isnull(UserID, N'${req.UserID}')
      , Data_Updater = N'${req.UserID}'
      , Data_Update = GetDate()
      where Model_No = {Model_No};

      Declare @Max real, @Min real, @Qty real;

      Select @Max = Max(Model_Size), @Min = Min(Model_Size), @Qty = sum(QTY)
      From Model_Size ms with(NoLock,NoWait)
      Where ms.Model_RangeID = @Model_RangeID;

      Update Model_Range set Size_End = isnull(@Max,0), Size_From = isnull(@Min,0), Output_Qty = isnull(@Qty,0)
      Where Model_RangeID = @Model_RangeID;
   End
   `, req.body);
   //console.log(strSQL)
   db.sql(req.Enterprise, strSQL)
      .then((result) => {
         //console.log(result.recordsets[0])
         res.send({Flag:result.recordsets[0][0].Flag > 0, Model_SizeID: result.recordsets[0][0].Model_SizeID});
      }).catch((err) => {
         console.log(err);
         res.status(500).send(err);
      })
});

//Get Model Report
router.post('/Model_Report_Info',  function (req, res, next) {
   console.log("Call Model_Report_Info Api:",req.body);  
 
   req.body.Mode = req.body.Mode ? req.body.Mode : 0;
   req.body.Model_No = req.body.Model_No ? `N'${req.body.Model_No.trim().substring(0,20).replace(/'/g, "''")}'` : `''`;
   req.body.Organization = req.body.Organization ? `N'${req.body.Organization.trim().replace(/'/g, "''")}'` : `''`;
   req.body.Supplier = req.body.Supplier ? `N'${req.body.Supplier.trim().replace(/'/g, "''")}'` : `''`;
    
   //Mode == 0 Shipping Sheet Report
   var strSQL = format(`Declare @Mode int = {Mode}, @Model_No Varchar(20) = {Model_No};   
   -- 0 Report Info
   SELECT @Model_No as Model_No
   , s.[Unit]
   , s.[Brand]
   , s.[Owner]
   , s.[Location]
   , s.[Photo_Month]
   , tmp_Org.Organization_Name, tmp_Org.Address
   , tmp_Org.[L2_Organization_Name], tmp_Org.[L2_Address]
   , tmp_Org.[Phone_Number]
   , tmp_Supplier.Supplier_Name, tmp_Supplier.Supplier_Address
   , tmp_Supplier.Supplier_Phone_Number
   FROM Model s WITH(NoLock, NoWait)
   left Outer Join (
      Select @Model_No as Model_No
      , o.Organization_Name, o.Address
      , o.[L2_Organization_Name], o.[L2_Address]
      , o.[Phone_Number]
      From Organization o with(NoLock,NoWait)
      Where o.OrganizationID = {Organization}
   ) tmp_Org on tmp_Org.Model_No = s.Model_No
   left Outer Join (
      Select @Model_No as Model_No
      , s.Supplier_Name, s.Address as Supplier_Address
      , s.Phone_Number as Supplier_Phone_Number
      From Supplier s with(NoLock,NoWait)
      Where s.SupplierID = {Supplier}
   ) tmp_Supplier on tmp_Supplier.Model_No = s.Model_No
   Where s.Model_No = @Model_No;
   
   -- 1 Report Detail
   Select r.Model_RangeID
   , r.[Model_Range]
   , isnull(r.Parts,0) as Parts
   , isnull(r.Output_Qty,0) as Output_Qty
   , isnull(r.Model_Qty,0) as Model_Qty 
   , case when r.Size_From = r.Size_End then 
      case when r.Size_From = 0 then '-' else (Select rtrim(isnull(ps.Size_Name,'')) From Product_Size ps with(NoLock,NoWait) Where r.Size_From = ps.SizeID) End   
   else
      case when r.Size_From = 0 then '-' else (Select rtrim(isnull(ps.Size_Name,'')) From Product_Size ps with(NoLock,NoWait) Where r.Size_From = ps.SizeID ) End
       + ' ~ ' + 
      case when r.Size_End = 0 then '-' else (Select rtrim(isnull(ps.Size_Name,'')) From Product_Size ps with(NoLock,NoWait) Where r.Size_End = ps.SizeID ) End       
   End as Size_Fit
   , Remark
   From Model_Range r with(NoLock, NoWait)
   Where r.Model_No = @Model_No
   Order by abs(r.Prerange) desc, r.Size_From, r.Size_End, r.Model_Range;

   -- 2 Model Size   
   Select Model_SizeID, s.Model_RangeID, rtrim(isnull(ps.Size_Name,'')) as Model_Size, s.Qty
   From Model_Size s with(NoLock,NoWait)
   Inner Join (
      Select distinct r.Model_RangeID
      From Model_Range r with(NoLock, NoWait)    
      Where r.Model_No = @Model_No
   ) d on s.Model_RangeID = d.Model_RangeID
   Left Outer Join Product_Size ps with(NoLock,NoWait) on s.Model_Size = ps.SizeID
   Where isnull(s.Qty,0) > 0;

   `, req.body) ;    
   //console.log(strSQL)
   db.sql(req.SiteDB, strSQL)
      .then((result) => {         
         var DataSet = {Report_Info: result.recordsets[0]
            , Report_Detail: result.recordsets[1]
            , G_Total_Part_Qty:0
            , G_Total_Output_Qty:0
            , G_Total_Model_Qty:0
         };
        
         DataSet.Report_Detail.forEach((item)=>{            
            item.Model_Size = (result.recordsets[2].filter((data)=>(data.Model_RangeID == item.Model_RangeID))).map((obj)=>(`#${obj.Model_Size} * ${obj.Qty}`)).join(', ')
            item.Unit = DataSet.Report_Info[0].Unit;
            DataSet.G_Total_Part_Qty += item.Parts;
            DataSet.G_Total_Output_Qty += item.Output_Qty;
            DataSet.G_Total_Model_Qty += item.Model_Qty;
         })        
         DataSet.G_Total_Part_Qty = Math.round(DataSet.G_Total_Part_Qty * 10000)/10000
         DataSet.G_Total_Output_Qty = Math.round(DataSet.G_Total_Output_Qty * 10000)/10000
         DataSet.G_Total_Model_Qty = Math.round(DataSet.G_Total_Model_Qty * 10000)/10000

      //console.log(DataSet)
         res.send(DataSet);
      }).catch((err) => {
         console.log(err);
         res.status(500).send(err);
      })
});

//Get Model_Purchase_Order_List
router.post('/Model_Purchase_Order_List',  function (req, res, next) {
   console.log("Call Model Purchase Order List Api:");

   req.body.Model_Order_No = req.body.Model_Order_No ? req.body.Model_Order_No : null;
   req.body.Master_Model_No = req.body.Master_Model_No ? `${req.body.Master_Model_No.trim().substring(0,17).replace(/'/g, '')}` : '';
   req.body.Model_Maker = req.body.Model_Maker ? `${req.body.Model_Maker.trim().substring(0,10).replace(/'/g, '')}` : '';
   req.body.Delivery_Place = req.body.Delivery_Place ? `${req.body.Delivery_Place.trim().substring(0,10).replace(/'/g, '')}` : '';   
   req.body.Order_Date = req.body.Order_Date ? `${req.body.Order_Date.trim().substring(0,10)}` : '';
   req.body.Delivery_Date = req.body.Delivery_Date ? `${req.body.Delivery_Date.trim().substring(0,10)}` : '';
   req.body.CustomerID = req.body.CustomerID ? `${req.body.CustomerID.trim().substring(0,15).replace(/'/g, '')}` : '';   
   req.body.Department = req.body.Department ? `${req.body.Department.trim().substring(0,5).replace(/'/g, '')}` : '';
   req.body.Debit_No = req.body.Debit_No ? `${req.body.Debit_No.trim().substring(0,20)}` : ``;
   req.body.Currency = req.body.Currency ? `${req.body.Currency.trim().substring(0,4)}` : ``;
   req.body.Amount = req.body.Amount ? req.body.Amount : '';
   req.body.Progress_Amount = req.body.Progress_Amount ? req.body.Progress_Amount : '';
   req.body.Paid_Amount = req.body.Paid_Amount ? req.body.Paid_Amount : '';   
   req.body.UserID = req.body.UserID ? `${req.body.UserID.trim().substring(0,256).replace(/'/g, '')}` : '';   

   var strSQL = format(`
   SELECT Top 1000 row_number() Over(Order By o.[Model_Order_No] desc) as RecNo
   , case when (Select Count(*) From Money_Source ms with(NoLock,NoWait) Where ms.Source_No = cast(o.[Model_Order_No] as varchar) And ms.Subject = 'Model PAY') > 0  then 'lock' else 'unlock' end as Record_Flag
   , o.[Model_Order_No]
   , o.[Master_Model_No]
   , o.[Model_Maker]
   , o.[Delivery_Place]
   , convert(varchar(10) ,o.[Order_Date] ,111) as [Order_Date]
   , convert(varchar(10) ,o.[Delivery_Date] ,111) as [Delivery_Date]
   , o.[CustomerID]   
   , o.[Department]
   , o.[Debit_No]
   , o.[Currency]
   , o.[Amount]
   , o.[Progress_Amount]
   , o.[Paid_Amount]
   , o.[UserID]   
   FROM [dbo].[Model_Order] o With(Nolock,NoWait)
   Left Outer Join [dbo].[Debit] d With(Nolock,NoWait) on o.Debit_No = d.Debit_No
   where ({Model_Order_No} is null  or o.[Model_Order_No] like N'%{Model_Order_No}%')
   And (N'{Master_Model_No}' = '' or o.[Master_Model_No] like N'%{Master_Model_No}%')
   And (N'{Model_Maker}' = '' or o.[Model_Maker] like N'%{Model_Maker}%')
   And (N'{Delivery_Place}' = '' or o.[Delivery_Place] like N'%{Delivery_Place}%')
   And (N'{Order_Date}' = '' or convert(varchar(10),o.[Order_Date],111) like N'%{Order_Date}%')
   And (N'{Delivery_Date}' = '' or convert(varchar(10),o.[Delivery_Date],111) like N'%{Delivery_Date}%')
   And (N'{CustomerID}' = '' or o.[CustomerID] like N'%{CustomerID}%')
   And (N'{Department}' = '' or o.[Department] like N'{Department}%')
   And (N'{Debit_No}' = '' or o.[Debit_No] like N'%{Debit_No}%')
   And (N'{Currency}' = '' or o.[Currency] like N'%{Currency}%')
   And (N'{Amount}' = '' or cast(ISNULL(o.Amount,0) as decimal(20,3)) LIKE N'%{Amount}%')
   And (N'{Progress_Amount}' = '' or cast(ISNULL(o.Progress_Amount,0) as decimal(20,3)) LIKE N'%{Progress_Amount}%')
   And (N'{Paid_Amount}' = '' or cast(ISNULL(o.Paid_Amount,0) as decimal(20,3)) LIKE N'%{Paid_Amount}%')
   And (N'{UserID}' = '' or o.[UserID] like N'%{UserID}%')
   --Order By o.[Model_Order_No] desc, o.Delivery_Date desc, o.[CustomerID], o.[Model_Order_No], o.UserID
   `, req.body) ;
  //console.log(strSQL)
  
   db.sql(req.SiteDB, strSQL)
      .then((result) => {

         var DataSet = {Detail_Info: result.recordsets[0]
            , Currency_Info: []
         };

         DataSet.Currency_Info = [...DataSet.Detail_Info.reduce((r, e) => {
            let k = `${e.Currency}`;
            if (!r.has(k)) {
              // console.log(r) 

              r.set(k, { Currency: e.Currency,
               Total_Amount: e.Amount,
               Total_Progress_Amount: e.Progress_Amount,
               Total_Paid_Amount: e.Paid_Amount,
              })
            } else {
               r.get(k).Total_Amount += e.Amount;
               r.get(k).Total_Progress_Amount += e.Progress_Amount;
               r.get(k).Total_Paid_Amount += e.Paid_Amount;
            }
            return r;
          }, new Map).values()]

          DataSet.Currency_Info.forEach((item)=>{
            item.Total_Amount = Math.round(item.Total_Amount * 10000)/10000;
            item.Total_Progress_Amount = Math.round(item.Total_Progress_Amount * 10000)/10000;
            item.Total_Paid_Amount = Math.round(item.Total_Paid_Amount * 10000)/10000;
         }) 

         res.send(DataSet);
      }).catch((err) => {
         console.log(err);
         res.status(500).send(err);
      })

});

 //Get Model_Purchase_Order_Info
router.post('/Model_Purchase_Order_Info',  function (req, res, next) {
   console.log("Call Model_Purchase_Order_Info Api:",req.body);
 
   req.body.Model_Order_No = req.body.Model_Order_No ? req.body.Model_Order_No : null;
   req.body.Mode = req.body.Mode ? req.body.Mode : 0;    
 
   //Mode == 0 Get Model Order and Model Order Detail 
   //Mode == 1 Get Model Order Data
   //Mode == 2 Get Model Order Detail Data
   
   var strSQL = format(`
   Declare @Mode int = {Mode};
 
   if(@Mode = 0 or @Mode = 1)
   Begin
       SELECT s.[Model_Order_No]
       , s.[Department]
       , s.[Debit_No]
       , case when isnull(s.[Debit_No],'') = '' then 1 else 0 End as Debit_No_Flag       
       , s.[OrganizationID]
       , s.[Master_Model_No]
       , s.[Model_Maker]
       , s.[Factory_SubID]
       , Convert(varchar(10),s.[Order_Date],111) as [Order_Date]
       , Convert(varchar(10),s.[PI_Date],111) as [PI_Date]
       , s.[Currency]
       , s.[Invoice_Currency]
       , s.[Remark]
       , Convert(varchar(10),s.[Delivery_Date],111) as [Delivery_Date]
       , s.[Delivery_Place]
       , s.[Manager]
       , s.[Vice_Manager]
       , s.[UserID]
       , s.[CustomerID]
       , s.[Messrs]
       , s.[Messrs_Address]
       , s.[Commodity]
       , s.[Payment_Term]
       , s.[Purchase_Payment_Term]
       , s.[Beneficiary]
       , s.[Advising_Bank]
       , (Select top 1 b.S_Name From Bank b with(NoLock,NoWait) Where b.BankID = s.Advising_Bank) as Advising_Bank_Name
       , Convert(varchar(10),s.[Patterning],111) as [Patterning]
       , Convert(varchar(10),s.[Preparing],111) as [Preparing]
       , Convert(varchar(10),s.[Draft],111) as [Draft]
       , Convert(varchar(10),s.[Module],111) as [Module]
       , Convert(varchar(10),s.[Casting],111) as [Casting]
       , Convert(varchar(10),s.[Planing],111) as [Planing]
       , Convert(varchar(10),s.[Milling],111) as [Milling]
       , Convert(varchar(10),s.[Discharging],111) as [Discharging]
       , Convert(varchar(10),s.[Assembling],111) as [Assembling]
       , Convert(varchar(10),s.[Testing],111) as [Testing]
       , Convert(varchar(10),s.[Texturing],111) as [Texturing]
       , Convert(varchar(10),s.[Plating],111) as [Plating]
       , Convert(varchar(10),s.[Tefloning],111) as [Tefloning]
       , Convert(varchar(10),s.[Delivered],111) as [Delivered]
       , s.[Data_Updater]
       , Convert(varchar(20), s.[Data_Update],120) as [Data_Update]
       FROM Model_Order s WITH (NoLock, NoWait)
       WHERE Model_Order_No = {Model_Order_No}
   End
   if(@Mode = 0 or @Mode = 2)
   Begin
       Select mod.Model_Order_DetailID
       , mod.[Model_Order_No]
       , mod.[Model_RangeID]
       , mr.Model_No
       , mr.Model_Range
       , isnull(mod.[Qty],0) as Qty
       , isnull(mod.[Unit_Price],0) as Unit_Price
       , mod.[Unit_Price] as Unit_Price_D
       , isnull(mod.[Sale_Price],0) as Sale_Price
       , mod.[Sale_Price] as Sale_Price_D
       , case when isnull(mr.Acceptance_Date,'') = '' then '' else Convert(varchar(10),mr.[Acceptance_Date],111) end as [Acceptance_Date]
       , case when isnull(mr.Acceptance_Date,'') = '' then 0 else 1 end as Acceptance_Chk
       , mod.[Remark]
       From Model_Order_Detail mod with(NoLock, NoWait)
       Left Outer Join Model_Range mr with(NoLock, NoWait) on mod.Model_RangeID = mr.Model_RangeID
       --Inner Join Model m with(NoLock, NoWait) on m.Model_No = mr.Model_No
       Where mod.Model_Order_No = {Model_Order_No}
       Order by mod.Model_Order_DetailID
   End
   --3 Model Order Expense List
   if(@Mode = 0 or @Mode = 3)
   Begin
      Select moe.Model_Order_ExpenseID, moe.Model_Order_No, moe.Description
      , moe.Qty, moe.Unit_Price
      , (isnull(moe.Qty,0) * isnull(moe.Unit_Price,0)) as Amount
      , moe.Remark
      From [Model_Order_Expense] moe with(NoLock,NoWait)
      Where moe.Model_Order_No = {Model_Order_No}      
   End
   --4 Model_Pay_List
   if(@Mode = 0 or @Mode = 4)
   Begin
      Select ms.Money_SourceID, ms.Type, ms.Days, ms.By_Doc_Rcv, ms.Withdrawal, ms.Description, ms.MoneyID
      , ms.Update_User
      , Convert(varchar(20), ms.Update_Date, 120) as Update_Date
      from Money_Source ms With(NoLock,NoWait)
      where ms.Source_No = '{Model_Order_No}'
      and ms.Subject = 'Model PAY'
   End
   
   `, req.body) ;
   //console.log(strSQL)
   db.sql(req.SiteDB, strSQL)
      .then((result) => {
         var DataSet = {Model_Purchase_Order: (req.body.Mode == 0 || req.body.Mode == 1) ? result.recordsets[0] : []
           , Model_Purchase_Order_Detail: (req.body.Mode == 0) ? result.recordsets[1] : (req.body.Mode == 2 ? result.recordsets[0] : [])
           , Model_Purchase_Order_Expense: (req.body.Mode == 0) ? result.recordsets[2] : (req.body.Mode == 3 ? result.recordsets[0] : [])
           , Model_Pay_List: (req.body.Mode == 0) ? result.recordsets[3] : (req.body.Mode == 4 ? result.recordsets[0] : [])
           , Detail_Total: {Qty:0, Unit_Price_Amount:0, Sale_Price_Amount:0}
        };
        if(req.body.Mode == 0 || req.body.Mode == 2){
            var Qty = 0, Unit_Price_Amount = 0, Sale_Price_Amount = 0
            DataSet.Model_Purchase_Order_Detail.forEach((item) => {
               Qty += item.Qty;
               item.Unit_Price = Math.round((item.Unit_Price)*10000)/10000;
               item.Sale_Price = Math.round((item.Sale_Price)*10000)/10000;

               item.Unit_Price_Amount = Math.round((item.Unit_Price * item.Qty)*10000)/10000;
               item.Sale_Price_Amount = Math.round((item.Sale_Price * item.Qty)*10000)/10000;

               Unit_Price_Amount += item.Unit_Price_Amount;
               Sale_Price_Amount += item.Sale_Price_Amount;
            });
            DataSet.Detail_Total = {Qty:Qty, Unit_Price_Amount:Math.round((Unit_Price_Amount)*10000)/10000, Sale_Price_Amount:Math.round((Sale_Price_Amount)*10000)/10000}
        }
        if(req.body.Mode == 0 || req.body.Mode == 3){
         var Amount = 0, Qty=0;
         DataSet.Model_Purchase_Order_Expense.forEach((item) => {
            Qty += item.Qty;
            item.Qty = Math.round((item.Qty)*10000)/10000;
            Amount += item.Amount;
            item.Amount = Math.round((item.Amount)*10000)/10000;
         });
         Qty = Math.round((Qty)*10000)/10000;
         Amount = Math.round((Amount)*10000)/10000;
         DataSet.Expense_Total = {Amount:Amount, Qty:Qty}
      }
     if(req.body.Mode == 0 || req.body.Mode == 4){
            var Amount = 0;
            DataSet.Model_Pay_List.forEach((item) => {
               Amount += item.Withdrawal;
               item.Withdrawal = Math.round((item.Withdrawal)*10000)/10000;
            });
            Amount = Math.round((Amount)*10000)/10000;
            DataSet.Model_Pay_Total = {Amount:Amount}
      }

         //console.log(DataSet)
         res.send(DataSet);
      }).catch((err) => {
         console.log(err);
         res.status(500).send(err);
      })
});

//Maintain Model_Purchase_Order
router.post('/Model_Purchase_Order_Maintain',  function (req, res, next) {
   console.log("Call Model_Purchase_Order_Maintain Api:",req.body);

   // req.body.Mode === 0 表示新增
   // req.body.Mode === 1 表示修改
   // req.body.Mode === 2 表示刪除
   var Size = 0;
   req.body.Model_Order_No = req.body.Model_Order_No ? req.body.Model_Order_No : null;
   
   var strSQL = format(`Declare @ROWCOUNT int, @Model_Order_No int = {Model_Order_No};    
   `, req.body);
   switch(req.body.Mode){
      case 0:          
         req.body.Master_Model_No = req.body.Master_Model_No ? `N'${req.body.Master_Model_No.trim().substring(0,17)}'` : `''`;
         req.body.Model_Maker = req.body.Model_Maker ? `N'${req.body.Model_Maker.trim().substring(0,10).replace(/'/g, "''")}'` : `''`;
         req.body.Factory_SubID = req.body.Factory_SubID ? `N'${req.body.Factory_SubID.trim().substring(0,10).replace(/'/g, "''")}'` : `''`;
         req.body.Delivery_Place = req.body.Delivery_Place ? `N'${req.body.Delivery_Place.trim().substring(0,10).replace(/'/g, "''")}'` : `''`;
         req.body.CustomerID = req.body.CustomerID ? `N'${req.body.CustomerID.trim().substring(0,15).replace(/'/g, "''")}'` : `''`;
         req.body.Currency = req.body.Currency ? `N'${req.body.Currency.trim().substring(0,4).replace(/'/g, "''")}'` : `''`;
         req.body.Order_Date = req.body.Order_Date ? `'${req.body.Order_Date.trim().substring(0,10)}'` : `'${moment().format('YYYY/MM/DD')}'`;
         req.body.PI_Date = req.body.PI_Date ? `'${req.body.PI_Date.trim().substring(0,10)}'` : `'${moment().format('YYYY/MM/DD')}'`;
         req.body.Delivery_Date = req.body.Delivery_Date ? `'${req.body.Delivery_Date.trim().substring(0,10)}'` : `'${moment().format('YYYY/MM/DD')}'`;

         strSQL += format(`
            Declare @Department nvarchar(50), @OrganizationID nvarchar(50)
            
            Select @Department = d.Department_Code, @OrganizationID = d.OrganizationID
            from Employee e 
               Inner Join Department d on e.DepartmentID = d.DepartmentID
               Inner Join aspnet_Users au on e.EmployeeID = au.EmployeeID
            Where au.LoweredUserName = N'${req.UserID}'

            Insert [dbo].[Model_Order] (Master_Model_No, [OrganizationID], [Department]
               , Model_Maker, Factory_SubID, Delivery_Place
               , [CustomerID], [Messrs], [Messrs_Address]
               , [Order_Date], [PI_Date], [Delivery_Date]
               , [Currency], [Invoice_Currency]
               , Remark
               , Purchase_Payment_Term
               , UserID, Data_Updater, Data_Update)
            Select {Master_Model_No} as [Master_Model_No], @OrganizationID as [OrganizationID], @Department as [Department]
               , {Model_Maker} as Model_Maker, {Factory_SubID} as Factory_SubID, {Delivery_Place} as Delivery_Place
               , {CustomerID} as [CustomerID], c.Customer_Name as [Messrs], c.Address as [Messrs_Address]
               , {Order_Date} as [Order_Date], {PI_Date} as [PI_Date], {Delivery_Date} as [Delivery_Date]
               , {Currency} as [Currency], {Currency} as [Invoice_Currency]
               , N'1. 工程圖需本公司完成確認後, 始可進行施工.
2. 模具需負責到完全可量產.
3. 模具交貨時請附正確大底各一雙.' as Remark
               ,N'(一)所訂購之物品需待確認後才可生產, 否則本公司不予負責, 如品質未達允收條件原貨退回。
(二)交貨日期務必準時, 如有延誤或影響生產進度 需接受本公司合理要求賠償,不得異議。
(三)每月帳款需於5日以前送至本公司整理, 逾期延後一月付款。
(四)隔月付現扣 5 %
(五)請款時需附本訂購單正本。' as Purchase_Payment_Term
               , N'${req.UserID}' as UserID, N'${req.UserID}' as Data_Updater, GetDate() as Data_Update
            From Customer c with(NoLock,NoWait)
            Where c.CustomerID = {CustomerID};
            
            Set @ROWCOUNT = @@ROWCOUNT;
            Set @Model_Order_No = scope_identity();            
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
            case 'Model_Maker':
            case 'Factory_SubID':
            case 'OrganizationID':
            case 'Beneficiary':
            case 'Delivery_Place':
               Size = 10;
            break;
            case 'Master_Model_No':
            case 'Factory_SubID':
               Size = 17;
            break;
            case 'Department':
               Size = 5;
            break;
            case 'Invoice_Currency':
            case 'Currency':
               Size = 4;
            break;
            case 'Order_Date':
            case 'PI_Date':
            case 'Delivery_Date':
               Size = 20;
            break;
            case 'Messrs':
            case 'Commodity':
               Size = 100;
            break;
            case 'Messrs_Address':
               Size = 256;
            break;
            case 'Payment_Term':
               Size = 50;
            break;
            case 'Remark':
            case 'Purchase_Payment_Term':                                 
               Size = 655535;
            break;
            default:
            break;
         }
         req.body.Value = Size == 0 ? (req.body.Value ? req.body.Value : null) : (req.body.Value ? `N'${req.body.Value.trim().replace(/'/g, "''")}'` : `''`);

         strSQL += format(`         
            Update [dbo].[Model_Order] Set [{Name}] = ${Size == 0 ? '{Value}': `substring({Value},1,${Size})`}            
            ${req.body.Name == 'CustomerID'? ', Messrs = @Messrs, Messrs_Address = @Messrs_Address ':''}
            where Model_Order_No = @Model_Order_No             
            ${req.body.Name == 'CustomerID' || req.body.Name == 'Invoice_Currency'  || req.body.Name == 'Messrs'
            || req.body.Name == 'Messrs_Address'  || req.body.Name == 'PI_Date'  || req.body.Name == 'Payment_Term'
            || req.body.Name == 'Commodity' || req.body.Name == 'Beneficiary' || req.body.Name == 'Advising_Bank'            
             ? " And isnull(Debit_No,'') = '' ": " And (Select Count(*) From [dbo].[Money_Source] d with(NoLock,NoWait) Where d.Source_No = '{Model_Order_No}' And d.Subject = 'Model PAY' And d.MoneyID is not null) = 0 "}
            ${req.body.Name == 'Master_Model_No' ?  'And (Len({Value}) = 0 or (Select count(*) From Model m with(NoLock,NoWait) where m.Model_No = {Value}) > 0) And (Select count(*) From Model_Order_Detail m with(NoLock,NoWait) where m.Model_Order_No = @Model_Order_No) = 0' : ''}
            ;

            Set @ROWCOUNT = @@ROWCOUNT;
         `, req.body);
      break;
      case 2:
         strSQL += format(`
            Delete FROM [dbo].[Model_Order] 
            where Model_Order_No = @Model_Order_No
            And (Select count(*) From Model_Order_Detail od with(NoLock,NoWait) Where od.Model_Order_No = @Model_Order_No ) = 0
            And (Select count(*) From Model_Order_Expense sd with(NoLock,NoWait) Where sd.Model_Order_No = @Model_Order_No ) = 0
            And (select count(*) From Money_Source c WITH (NoLock, NoWait) Where c.Source_No = '{Model_Order_No}' And Subject = 'Model PAY' ) = 0
                        
            Set @ROWCOUNT = @@ROWCOUNT;
         `, req.body);
      break;
        
   }

   strSQL += format(`
   Select @ROWCOUNT as Flag,  @Model_Order_No as Model_Order_No;

   if({Mode} = 1 and @ROWCOUNT > 0)
   Begin
      Update [dbo].[Model_Order] Set UserID = isnull(UserID, N'${req.UserID}')
      , Data_Updater = N'${req.UserID}'
      , Data_Update = GetDate()
      where Model_Order_No = @Model_Order_No;
   End
   `, req.body);
   //console.log(strSQL)
   db.sql(req.SiteDB, strSQL)
      .then((result) => {
         //console.log(result.recordsets[0])
         res.send({Flag:result.recordsets[0][0].Flag > 0, Model_Order_No: result.recordsets[0][0].Model_Order_No});
      }).catch((err) => {
         console.log(err);
         res.status(500).send(err);
      })
});

//Maintain Model Purchase Order Detail
router.post('/Model_Purchase_Order_Detail_Maintain',  function (req, res, next) {
   console.log("Call Model_Purchase_Order_Detail_Maintain Api:",req.body);

   // req.body.Mode === 0 表示新增
   // req.body.Mode === 1 表示修改
   // req.body.Mode === 2 表示刪除
   var Size = 0;
   req.body.Model_Order_No = req.body.Model_Order_No ? req.body.Model_Order_No: null;
   
   var strSQL = format(`Declare @ROWCOUNT int=0;  
   
   if((Select Count(*) From [dbo].[Money_Source] d with(NoLock,NoWait) Where d.Source_No = '{Model_Order_No}' And d.Subject = 'Model PAY' And d.MoneyID is not null) > 0 )
   begin
      Select 0 as Flag;
      return;
   End
   `, req.body);
   switch(req.body.Mode){
      case 0:
         req.body.QueryData = req.body.QueryData ? `N'${req.body.QueryData.replace(/'/g, "''")}'` : `''`; 
         req.body.Master_Model_No = req.body.Master_Model_No ? `N'${req.body.Master_Model_No.replace(/'/g, "''")}'` : `''`;         

         strSQL += format(`
         Declare @tmpTable Table (Model_RangeID int, Qty float, Unit_Price float, Sale_Price float);
         Declare @Import_Mode int = {Import_Mode}, @Currency_Rate float = 0;
               
         Select @Currency_Rate = isnull(cr.[Currency_Rate],0 )
         From Model_Order c WITH(NoLock, NoWait) 
         Left Outer Join dbo.[@Currency_Rate] cr WITH(NoLock, NoWait) on cr.Currency = c.Currency And cr.Exchange_Date = convert(Date, c.Order_Date)
         Where c.Model_Order_No = {Model_Order_No};     

         if(@Import_Mode = 0)
         begin         
            Insert @TmpTable            
            Select mr.Model_RangeID
            , 1 as Qty
            , Round(isnull(m.Unit_Price / nullif(@Currency_Rate,0), m.Unit_Price), 3, 1) as Unit_Price
            , 0 as Sale_Price
            From Model m with(NoLock,NoWait) 
            Inner Join Model_Range mr With(NoLock,NoWait) on m.Model_No = mr.Model_No  
            Left Outer Join (
               Select distinct Model_RangeID
               From Model_Order_Detail m with(NoLock, NoWait)
               Where m.Model_Order_No = {Model_Order_No}
            ) t on t.Model_RangeID = mr.Model_RangeID          
            Where m.Model_No = {Master_Model_No}
            And t.Model_RangeID is null
            And ({QueryData} = '' or charindex({QueryData}, cast(isnull(m.Model_No,'') as nvarchar) + ' ' + cast(isnull(mr.Model_Range,'') as nvarchar)) > 0);             
         end
         else
         begin 
            Insert @TmpTable
            Select {Model_RangeID} as Model_RangeID
            , 1 as Qty
            , Round(isnull({Unit_Price} / nullif(@Currency_Rate,0), {Unit_Price}), 3, 1) as Unit_Price
            , 0 as Sale_Price
         end

         Insert [dbo].[Model_Order_Detail] (Model_Order_No, Model_RangeID, Qty, Unit_Price, Sale_Price)
         Select {Model_Order_No} as Model_Order_No, d.Model_RangeID, 1 as Qty, d.Unit_Price, 0 as Sale_Price
         From @tmpTable d 
         Left Outer Join (
            Select distinct Model_RangeID
            From Model_Order_Detail m with(NoLock, NoWait)
            Where m.Model_Order_No = {Model_Order_No}
         ) t on t.Model_RangeID = d.Model_RangeID          
         Where t.Model_RangeID is null;
         
         Set @ROWCOUNT = @@ROWCOUNT;          
         `, req.body);
      break;
      case 1:
         switch(req.body.Name){
            case 'Acceptance_Date':
               Size=10;
               req.body.Value = Size == 0 ? (req.body.Value ? req.body.Value : null) : (req.body.Value ? `N'${req.body.Value.trim().replace(/'/g, "''")}'` : `''`);

               strSQL += format(`         
                  Update [dbo].[Model_Range] Set [{Name}] = ${Size == 0 ? '{Value}': `substring({Value},1,${Size})`}            
                  where Model_RangeID = {Model_RangeID};
      
                  Set @ROWCOUNT = @@ROWCOUNT;
               `, req.body);
      
            break;
            default:
               switch(req.body.Name){
                  case 'Remark':
                     Size=65535;
                  break;
               }
               
               req.body.Value = Size == 0 ? (req.body.Value != null ? req.body.Value : null) : (req.body.Value ? `N'${req.body.Value.trim().replace(/'/g, "''")}'` : `''`);

               strSQL += format(`         
                  Update [dbo].[Model_Order_Detail] Set [{Name}] = ${Size == 0 ? '{Value}': `substring({Value},1,${Size})`}            
                  where Model_Order_DetailID = {Model_Order_DetailID};
   
                  Set @ROWCOUNT = @@ROWCOUNT;
               `, req.body);      
            break;

         }
      break;
      case 2:
         strSQL += format(`
            Delete From [dbo].[Model_Order_Detail]
            where Model_Order_DetailID = {Model_Order_DetailID}
                                    
            Set @ROWCOUNT = @@ROWCOUNT;
         `, req.body);
      break;
        
   }

   strSQL += format(`
   Select @ROWCOUNT as Flag;

   if(@ROWCOUNT > 0)
   Begin 
      Declare @Amount float = 0, @Qty float = 0;

      Select @Qty = Sum(isnull(Qty,0)), @Amount = Sum(isnull(Qty,0) * isnull(Unit_Price,0))
      From [Model_Order_Detail] od with(NoLock,NoWait)
      Where od.Model_Order_No = {Model_Order_No}

      Set @Amount = isnull(@Amount,0) 
      + isnull((Select Sum(isnull(Qty,0) * isnull(Unit_Price,0))
         From [Model_Order_Expense] od with(NoLock,NoWait)
         Where od.Model_Order_No = {Model_Order_No}),0)

      Update [dbo].[Model_Order] Set UserID = isnull(UserID, N'${req.UserID}')
      , Data_Updater = N'${req.UserID}'
      , Data_Update = GetDate()
      , Qty = @Qty
      , Amount = @Amount      
      where Model_Order_No = {Model_Order_No};
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

//Maintain Model_Purchase_Order Expense
router.post('/Model_Purchase_Order_Expense_Maintain',  function (req, res, next) {
   console.log("Call Model_Purchase_Order_Expense_Maintain Api:",req.body);

   // req.body.Mode === 0 表示新增
   // req.body.Mode === 1 表示修改
   // req.body.Mode === 2 表示刪除
   var Size = 0;
   req.body.Model_Order_No = req.body.Model_Order_No ? req.body.Model_Order_No: null;
   req.body.Model_Order_ExpenseID = req.body.Model_Order_ExpenseID ? req.body.Model_Order_ExpenseID: null;
   req.body.Name = req.body.Name ? req.body.Name: null;
   
   var strSQL = format(`Declare @ROWCOUNT int=0, @Model_Order_ExpenseID int = {Model_Order_ExpenseID}
   if((Select Count(*) From [dbo].[Money_Source] d with(NoLock,NoWait) Where d.Source_No = '{Model_Order_No}' And d.Subject = 'Model PAY' And d.MoneyID is not null) > 0 )
   begin
      Select 0 as Flag;
      return;
   End

   `, req.body);
   switch(req.body.Mode){
      case 0:
         strSQL += format(`
         Insert [dbo].[Model_Order_Expense] (Model_Order_No, Qty)
         Select {Model_Order_No} as Model_Order_No, 1 as Qty
                  
         Set @ROWCOUNT = @@ROWCOUNT; 
         Set @Model_Order_ExpenseID = scope_identity();
         `, req.body);
      break;
      case 1:
         
         switch(req.body.Name){
            case 'Remark':
            case 'Description':
               Size = 256;
            break;
            default:
            break;               
         }

         req.body.Value = Size == 0 ? (req.body.Value != null ? req.body.Value : null) : (req.body.Value ? `N'${req.body.Value.trim().replace(/'/g, "''")}'` : `''`);

         strSQL += format(`         
            Update [dbo].[Model_Order_Expense] Set [{Name}] = ${Size == 0 ? '{Value}': `substring({Value},1,${Size})`}            
            where Model_Order_ExpenseID = {Model_Order_ExpenseID};

            Set @ROWCOUNT = @@ROWCOUNT;
         `, req.body);
      break;
      case 2:
         strSQL += format(`
            Delete From [dbo].[Model_Order_Expense]
            where Model_Order_ExpenseID = {Model_Order_ExpenseID}
                                    
            Set @ROWCOUNT = @@ROWCOUNT;
         `, req.body);
      break;
        
   }

   strSQL += format(`   
   Select @ROWCOUNT as Flag,  @Model_Order_ExpenseID as Model_Order_ExpenseID;

   if(({Mode} = 0) or ({Mode} = 1 And '(${req.body.Name}' = 'Qty' or '${req.body.Name}' = 'Unit_Price') or ({Mode} = 2) and @ROWCOUNT > 0)
   Begin

      Declare @Amount float = 
      isnull((Select Sum(isnull(Qty,0) * isnull(Unit_Price,0))
         From [Model_Order_Detail] od with(NoLock,NoWait)
         Where od.Model_Order_No = {Model_Order_No}),0) 
      + isnull((Select Sum(isnull(Qty,0) * isnull(Unit_Price,0))
         From [Model_Order_Expense] od with(NoLock,NoWait)
         Where od.Model_Order_No = {Model_Order_No}),0)

      Update [dbo].[Model_Order] Set UserID = isnull(UserID, N'${req.UserID}')
      , Data_Updater = N'${req.UserID}'
      , Data_Update = GetDate()
      , Amount = @Amount      
      where Model_Order_No = {Model_Order_No};
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

//Get Model Purchase Order Detail Add List
router.post('/Model_Purchase_Order_Detail_Add_List',  function (req, res, next) {
console.log("Call Model_Purchase_Order_Detail_Add_List Api:",req.body);  

req.body.Model_Order_No = req.body.Model_Order_No ? req.body.Model_Order_No : null;
req.body.Master_Model_No = req.body.Master_Model_No ? `N'${req.body.Master_Model_No.trim().replace(/'/g, "''")}'` : `''`;

var strSQL = format(`
Select cast(0 as bit) as flag, '' as Query, d.Model_RangeID, s.Brand
, d.Model_No, d.Model_Range, s.Unit_Price, d.Remark
From Model_Range d with(NoLock,NoWait)
Inner Join Model s with(NoLock,NoWait) on s.Model_No = d.Model_No
Left Outer Join (
   Select distinct Model_RangeID
   From Model_Order_Detail m with(NoLock, NoWait)
   Where m.Model_Order_No = {Model_Order_No}
) t on t.Model_RangeID = d.Model_RangeID
Where d.Model_No like {Master_Model_No} + '%' 
And t.Model_RangeID is null
And isnull(d.Disable,0) = 0;
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

//Maintain Model PAY
router.post('/Model_Pay_Maintain',  function (req, res, next) {
   console.log("Call Model_Pay_Maintain Api:",req.body);

   // req.body.Mode === 0 表示新增
   // req.body.Mode === 1 表示修改 
   // req.body.Mode === 2 表示刪除
   // req.body.Mode === 3 表示拆分金額
   req.body.Model_Order_No = req.body.Model_Order_No ? req.body.Model_Order_No : null;

   var strSQL = format(`Declare @Accounting int = 0, @ROWCOUNT int=0, @Balance_Amount float=0;

   Set @Balance_Amount = (Select isnull(Amount,0) From Model_Order d with(Nolock,NoWait) Where d.Model_Order_No = '{Model_Order_No}') 
   - isnull((Select Sum(Withdrawal) From Money_Source c WITH (NoLock, NoWait) Where c.Source_No = '{Model_Order_No}' And Subject = 'Model PAY'),0)

   `, req.body);

   switch(req.body.Mode){
      case 0:
         req.body.Type = req.body.Type ? `N'${req.body.Type.trim().substring(0,10).replace(/'/g, "''")}'` : `''`; 
         req.body.Description = req.body.Description ? `N'${req.body.Description.trim().substring(0,30).replace(/'/g, "''")}'` : `''`;    
         strSQL += format(`         
         if(@Accounting = 0)
         begin   
            Insert into [dbo].[Money_Source] (Type, Days, By_Doc_Rcv, Withdrawal, Subject, Source_No, Description, [Update_User] ,[Update_Date] )
            Select {Type} as Type, {Days} as Days, {By_Doc_Rcv} as By_Doc_Rcv
            --, case when @Balance_Amount < 0 then 0 else @Balance_Amount End as Withdrawal
            , @Balance_Amount as Withdrawal
            , 'Model PAY' as Subject
            , '{Model_Order_No}' as Source_No
            , {Description} as Description
            , N'${req.UserID}' as [Update_User]
            , GetDate() as [Update_Date]

            Set @ROWCOUNT = @@ROWCOUNT;
         end
         `, req.body);
      break;
      case 1:
         var Size = 0;
         switch(req.body.Name) {
            case 'Type':
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

         strSQL += format(`Declare @Split_Amount float = {Split_Amount};

         Insert into [dbo].[Money_Source] (Type, Days, By_Doc_Rcv, Withdrawal, Subject, Source_No, Description, [Update_User] ,[Update_Date] )
         Select ms.Type as Type, ms.Days as Days, ms.By_Doc_Rcv as By_Doc_Rcv 
         , @Split_Amount as Withdrawal
         , ms.Subject as Subject, ms.Source_No as Source_No, ms.Description as Description, N'${req.UserID}' as [Update_User], GetDate() as [Update_Date]
         From Money_Source ms with(NoLock,NoWait) 
         Where ms.Money_SourceID = {Money_SourceID}
         And ms.MoneyID is null 
         And ABS(isnull(ms.Withdrawal,0)) - ABS(isnull(@Split_Amount,0)) > 0

         Set @ROWCOUNT = @@ROWCOUNT;

         if (@ROWCOUNT > 0)
         Begin
            Update Money_Source set Withdrawal = Withdrawal - @Split_Amount
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
      Update [dbo].[Model_Order] Set UserID = isnull(UserID, N'${req.UserID}'), Data_Updater = N'${req.UserID}'
      , Data_Update = GetDate()
      where Model_Order_No = {Model_Order_No}
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

//Get Model Purchase Order Info
router.post('/Model_Purchase_Order_Report_Info',  function (req, res, next) {
   console.log("Call Sample_Debit_Note_Report_Info Api:",req.body);
 
   req.body.Mode = req.body.Mode ? req.body.Mode : 0;
   req.body.Model_Order_No = req.body.Model_Order_No ? req.body.Model_Order_No : null;
    
   //Mode == 0 Model Purchase Order Report
   var strSQL = format(`Declare @Mode int = {Mode}, @Model_Order_No Int = {Model_Order_No};
   Declare @Detail table(RecNo int identity(1,1), Brand varchar(30), Photo_Month varchar(4), Model_No nvarchar(20), Model_RangeID int, Model_Range nvarchar(20), Size_Fit varchar(20), Qty float, Unit varchar(10), Unit_Price float, Unit_Amount float, [Remark] nvarchar(1000) )
   Declare @Expense table(RecNo int identity(1,1), Model_Order_ExpenseID int, Model_Order_No int, Description nvarchar(256), Qty float, Unit_Price float, Unit_Amount float, [Remark] nvarchar(256) )
   
   -- 0 Report Info 
   SELECT s.[Model_Order_No]
   , s.[OrganizationID]
   , g.[Organization_Name]
   , g.[Address]
   , g.[L2_Organization_Name]
   , g.[L2_Address]
   , g.[Phone_Number]
   , g.[Fax_Number]
   , s.Model_Maker
   , sp.Supplier_Name
   , sp.Address as Supplier_Address
   , Convert(varchar(10),s.[Delivery_Date],111) as Delivery_Date
   , s.Delivery_Place
   , case when @Mode = 0 then s.[Currency]
            when @Mode = 1 then s.[Invoice_Currency]
      End as Currency
   , case when @Mode = 0 then cr.Currency_Symbol
            when @Mode = 1 then Invoice_cr.Currency_Symbol
      End as Currency_Symbol
   , case when @Mode = 0 then cr.en
            when @Mode = 1 then Invoice_cr.en
      End as Currency_en
   , s.[Messrs]
   , s.[Messrs_Address]
   , Convert(varchar(10),s.[Order_Date],111) as [Order_Date]
   , Convert(varchar(10),s.[PI_Date],111) as [PI_Date]
   , s.[Beneficiary]
   , p.[E_Name] as Beneficiary_Name
   , p.[E_Address] as Beneficiary_Address
   , s.[Advising_Bank]
   , b.[E_Name] as Advising_Bank_Name
   , b.[E_Address] as Advising_Bank_Address
   , b.[Account_No] as Advising_Account_No
   , case when @Mode = 0 then '訂購單' 
          when @Mode = 1 then 'Proforma Invoice'
      End as Report_Title   
   , case 
         when @Mode = 0 then s.[Purchase_Payment_Term] 
         when @Mode = 1 then s.[Payment_Term]
      End as [Payment_Term]   
   , s.[Commodity]
   , s.[Remark]
   , s.[UserID]
   FROM Model_Order s WITH (NoLock, NoWait)
   Left Outer Join [dbo].[Organization] g with(NoLock,NoWait) on g.OrganizationID = s.OrganizationID
   Left Outer Join [dbo].[Supplier] sp with(NoLock,NoWait) on sp.SupplierID = s.Model_Maker
   Left Outer Join [dbo].[Bank] b with(NoLock,NoWait) on b.BankID = s.Advising_Bank
   Left Outer Join [dbo].[Credit_Accounts] p WITH (NoWait, Nolock) on p.AccountID = s.Beneficiary
   Left Outer Join Currency cr WITH (NoWait, Nolock) on s.Currency = cr.Currency
   Left Outer Join Currency Invoice_cr WITH (NoWait, Nolock) on s.Invoice_Currency = Invoice_cr.Currency
   WHERE Model_Order_No = @Model_Order_No;

   -- 1 Report Detail Info 
   Insert @Detail
   Select m.[Brand]
   , m.Photo_Month
   , r.Model_No
   , r.Model_RangeID
   , r.Model_Range
   , case when r.Size_From = r.Size_End then 
      case when r.Size_From = 0 then '-' else (Select rtrim(isnull(ps.Size_Name,'')) From Product_Size ps with(NoLock,NoWait) Where r.Size_From = ps.SizeID) End   
   else
      case when r.Size_From = 0 then '-' else (Select rtrim(isnull(ps.Size_Name,'')) From Product_Size ps with(NoLock,NoWait) Where r.Size_From = ps.SizeID ) End
       + ' ~ ' + 
      case when r.Size_End = 0 then '-' else (Select rtrim(isnull(ps.Size_Name,'')) From Product_Size ps with(NoLock,NoWait) Where r.Size_End = ps.SizeID ) End       
   End as Size_Fit
   , isnull(mod.[Qty],0) as Qty
   , m.Unit
   , case when @Mode = 0 then isnull(mod.[Unit_Price],0) 
          when @Mode = 1 then isnull(mod.[Sale_Price],0) 
      End as Unit_Price
   , case when @Mode = 0 then isnull(mod.Qty,0) * isnull(mod.[Unit_Price],0) 
          when @Mode = 1 then isnull(mod.Qty,0) * isnull(mod.[Sale_Price],0) 
      End as Unit_Amount
   , mod.[Remark]
   From Model_Order_Detail mod 
   Inner Join Model_Range r with(NoLock, NoWait) on r.Model_RangeID = mod.Model_RangeID
   Inner Join Model m with(NoLock,NoWait) on m.Model_No = r.Model_No
   Where mod.Model_Order_No = @Model_Order_No;
      
   Select * from @Detail;

   -- 2 Report Expense Info    
   Insert @Expense(Model_Order_ExpenseID, Model_Order_No, Description, Qty, Unit_Price, Unit_Amount, [Remark])
   Select moe.[Model_Order_ExpenseID]
   , moe.Model_Order_No
   , moe.Description
   , isnull(moe.[Qty],0) as Qty   
   , isnull(moe.[Unit_Price],0) as Unit_Price
   , isnull(moe.[Qty],0) * isnull(moe.[Unit_Price],0) as Unit_Amount
   , moe.[Remark]
   From Model_Order_Expense moe with(NoLock, NoWait)
   Where moe.Model_Order_No = @Model_Order_No;

   Select * from @Expense;

   -- 3 Grand Total
   Declare @Detail_Total_Qty float, @Detail_Total_Amount float
   Declare @Expense_Total_Qty float, @Expense_Total_Amount float

   Select @Detail_Total_Qty = sum(Qty), @Detail_Total_Amount = sum(Unit_Amount) From @Detail
   Select @Expense_Total_Qty = sum(Qty), @Expense_Total_Amount = sum(Unit_Amount) From @Expense
   
   Select isnull(@Detail_Total_Qty,0) as Detail_Total_Qty
   , isnull(@Detail_Total_Amount,0) as Detail_Total_Amount
   , isnull(@Expense_Total_Qty,0) as Expense_Total_Qty
   , isnull(@Expense_Total_Amount,0) as Expense_Total_Amount
   , case when @Mode = 0 then isnull(@Detail_Total_Qty,0) + isnull(@Expense_Total_Qty,0) else isnull(@Detail_Total_Qty,0) end as Grand_Qty_Total
   , case when @Mode = 0 then isnull(@Detail_Total_Amount,0) + isnull(@Expense_Total_Amount,0) else isnull(@Detail_Total_Amount,0) end as Grand_Amount_Total
   , case when @Mode = 0 then dbo.RecurseNumber(isnull(@Detail_Total_Amount, 0) + isnull(@Expense_Total_Amount, 0)) else dbo.RecurseNumber(isnull(@Detail_Total_Amount, 0)) end as EngNum_TTL_Amount
   ;

   -- 4 Model Size   
   Select Model_SizeID, s.Model_RangeID, rtrim(isnull(ps.Size_Name,'')) as Model_Size, s.Qty
   From Model_Size s with(NoLock,NoWait)
   Inner Join (Select distinct Model_RangeID from @Detail) d on s.Model_RangeID = d.Model_RangeID
   Left Outer Join Product_Size ps with(NoLock,NoWait) on s.Model_Size = ps.SizeID
   Where isnull(s.Qty,0) > 0;

   `, req.body) ;    
   //console.log(strSQL)
   db.sql(req.SiteDB, strSQL)
      .then((result) => {
         var DataSet = {Report_Info: result.recordsets[0]
            , Report_Detail: []
            , Report_Expense: result.recordsets[2]
            , OrganizationID: result.recordsets[0][0].OrganizationID
            , Beneficiary_Name: result.recordsets[0][0].Beneficiary_Name
            , Report_Title: result.recordsets[0][0].Report_Title
            , Payment_Term: result.recordsets[0][0].Payment_Term
            , Currency: result.recordsets[0][0].Currency
            , Currency_Symbol: result.recordsets[0][0].Currency_Symbol
            , Currency_en: result.recordsets[0][0].Currency_en
            , EngNum_TTL_Amount: result.recordsets[3][0].EngNum_TTL_Amount
            , Detail_Total_Qty: 0
            , Detail_Total_Amount: 0
            , Expense_Total_Qty: Math.round(result.recordsets[3][0].Expense_Total_Qty * 10000)/10000
            , Expense_Total_Amount: Math.round(result.recordsets[3][0].Expense_Total_Amount * 10000)/10000
            , G_Total_Qty: Math.round(result.recordsets[3][0].Grand_Qty_Total * 10000)/10000
            , G_Total_Amount: Math.round(result.recordsets[3][0].Grand_Amount_Total * 10000)/10000
            , Model_Photo: []
         }; 

         DataSet.Model_Photo = [...result.recordsets[1].reduce((r, e) => {
            let k = `${e.Model_No}`;
            if (!r.has(k)) {
              // console.log(r) 

              r.set(k, { Model_No: e.Model_No,
               Photo_Month: e.Photo_Month,
              })
            } else {
            }
            return r;
          }, new Map).values()]
         
         result.recordsets[1].forEach((item)=>{
            item.Model_Size = (result.recordsets[4].filter((data)=>(data.Model_RangeID == item.Model_RangeID))).map((obj)=>(`#${obj.Model_Size} * ${obj.Qty}`)).join(', ')
         });
     
         DataSet.Report_Detail = [...result.recordsets[1].reduce((r, e) => {
            let k = `${e.Brand}|${e.Model_No}`;
            if (!r.has(k)) {
              // console.log(r)
              r.set(k, { Brand: e.Brand,
               Model_No: e.Model_No,
               Sub_Qty: e.Qty,
               Sub_Unit_Amount: e.Unit_Amount,
              })
            } else {
               r.get(k).Sub_Qty += e.Qty;
               r.get(k).Sub_Unit_Amount += e.Unit_Amount;
            }
            return r;
          }, new Map).values()]         

          DataSet.Report_Detail.forEach((item)=>{
            item.Detail_Info = result.recordsets[1].filter((data)=>(data.Brand == item.Brand && data.Model_No == item.Model_No))
            item.Sub_Qty = Math.round(item.Sub_Qty * 10000)/10000;
            item.Sub_Unit_Amount = Math.round(item.Sub_Unit_Amount * 10000)/10000;
            DataSet.Detail_Total_Qty += item.Sub_Qty;
            DataSet.Detail_Total_Amount += item.Sub_Unit_Amount;
         });

         DataSet.Detail_Total_Qty = Math.round(DataSet.Detail_Total_Qty * 10000)/10000
         DataSet.Detail_Total_Amount = Math.round(DataSet.Detail_Total_Amount * 10000)/10000

         //console.log(DataSet)
         res.send(DataSet);
      }).catch((err) => {
         console.log(err);
         res.status(500).send(err);
      })
});

//Get Model_Debit_List
router.post('/Model_Debit_List',  function (req, res, next) {
   console.log("Call Model_Debit_List Api:");

   req.body.Debit_No = req.body.Debit_No ? `${req.body.Debit_No.trim().substring(0,20)}` : ``;
   req.body.Debit_Date = req.body.Debit_Date ? `${req.body.Debit_Date.trim().substring(0,10)}` : '';
   req.body.CustomerID = req.body.CustomerID ? `${req.body.CustomerID.trim().substring(0,15)}` : ``;
   req.body.Season = req.body.Season ? `${req.body.Season.trim().substring(0,10).replace(/'/g, '')}` : '';
   req.body.Amount = req.body.Amount ? req.body.Amount : null;
   req.body.Department = req.body.Department ? `${req.body.Department.trim().substring(0,5).replace(/'/g, '')}` : '';   
   req.body.Rcved_Amount = req.body.Rcved_Amount ? req.body.Rcved_Amount : null;
   req.body.UserID = req.body.UserID ? `${req.body.UserID.trim().substring(0,256).replace(/'/g, '')}` : '';
   req.body.Approve = req.body.Approve ? `${req.body.Approve.trim().substring(0,20).replace(/'/g, '')}` : '';
   
   var strSQL = format(`
   SELECT Top 1000 row_number() Over(Order By o.[Debit_Date] desc) as RecNo
   , o.[Debit_No]
   , isnull(o.[IsCredit_Note],0) as [IsCredit_Note]
   , convert(varchar(10) ,o.[Debit_Date] ,111) as [Debit_Date]
   , o.[CustomerID]
   , o.[Season]
   , isnull(o.[Amount],0) as [Amount]
   , o.[Department]
   , isnull(o.[Progress_Amount],0) as [Progress_Amount]
   , isnull(o.[Rcved_Amount],0) as [Rcved_Amount]
   , o.[UserID]
   , o.[Approve]
   FROM [dbo].[Debit] o With(Nolock,NoWait)   
   where (N'{Debit_No}' = ''  or o.[Debit_No] like N'%{Debit_No}%')
   And (N'{Debit_Date}' = '' or convert(varchar(10),o.[Debit_Date],111) like N'%{Debit_Date}%')
   And (N'{CustomerID}' = '' or o.[CustomerID] like N'%{CustomerID}%')
   And (N'{Season}' = '' or o.[Season] like N'%{Season}%')
   And ({Amount} is null or o.[Amount] ={Amount})
   And (N'{Department}' = '' or o.[Department] like N'{Department}%')
   And ({Rcved_Amount} is null or o.[Rcved_Amount] ={Rcved_Amount})
   And (N'{UserID}' = '' or o.[UserID] like N'%{UserID}%')
   And (N'{Approve}' = '' or o.[Approve] like N'%{Approve}%')
   And o.Subject = 'Model'
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

 //Get Model Debit Info
router.post('/Model_Debit_Info',  function (req, res, next) {
   console.log("Call Model_Debit_Info Api:",req.body);  
 
   req.body.Debit_No = req.body.Debit_No ? `N'${req.body.Debit_No.trim().replace(/'/g, "''")}'` : `''`;
   req.body.Mode = req.body.Mode ? req.body.Mode : 0;
 
   //Mode == 0 Get Model Debit, Model Debit Detail and Model Debit Expense Data
   //Mode == 1 Get Model Debit Data
   //Mode == 2 Get Model Debit Detail Data
   //Mode == 3 Get Model Debit Expense Data
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
      , s.[Approve] as [Approve_Name]
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
      FROM Debit s WITH(NoLock, NoWait)
      Left Outer Join Customer_Contacts c WITH(NoLock, NoWait) on s.ContactID = c.ContactID
      WHERE s.Debit_No = @Debit_No;
   End 
   if(@Mode = 0 or @Mode = 2)
   Begin
      Select d.[Model_Order_DetailID]
      , d.[Model_Order_No]
      , d.[Model_RangeID]
      , r.[Model_No]
      , r.[Model_Range]
      , case when r.Size_From = r.Size_End then 
         case when r.Size_From = 0 then '-' else (Select rtrim(isnull(ps.Size_Name,'')) From Product_Size ps with(NoLock,NoWait) Where r.Size_From = ps.SizeID) End   
      else
         case when r.Size_From = 0 then '-' else (Select rtrim(isnull(ps.Size_Name,'')) From Product_Size ps with(NoLock,NoWait) Where r.Size_From = ps.SizeID ) End
         + ' ~ ' + 
         case when r.Size_End = 0 then '-' else (Select rtrim(isnull(ps.Size_Name,'')) From Product_Size ps with(NoLock,NoWait) Where r.Size_End = ps.SizeID ) End       
      End as Size_Fit
      , isnull(d.[Qty],0) as Qty
      , isnull(d.[Unit_Price],0) as Unit_Price
      , Round(isnull(d.[Qty],0) * isnull(d.[Unit_Price],0), 2) AS Unit_Price_Amount
      , s.Currency
      , isnull(d.[Qty],0) * isnull(d.[Unit_Price],0) * cr_O.Currency_Rate / cr_D.Currency_Rate AS Debit_Unit_Price_Amount 
      , isnull(d.[Sale_Price],0) as Sale_Price
      , Round(isnull(d.Qty,0) * isnull(d.[Sale_Price],0), 2) AS Sale_Price_Amount
      , d.[Remark]
      , d.[Remark_For_Debit]
      From Model_Order o with(NoLock,NoWait)
      Inner Join Model_Order_Detail d with(NoLock, NoWait) on o.Model_Order_No = d.Model_Order_No
      Inner Join Model_Range r with(NoLock, NoWait) on r.Model_RangeID = d.Model_RangeID
      Inner Join Debit s WITH(NoLock, NoWait) on s.Debit_No = o.Debit_No
      Left Outer Join dbo.[@Currency_Rate] cr_O WITH(NoLock, NoWait) on cr_o.Currency = o.Currency And cr_O.Exchange_Date = convert(Date, o.Order_Date)
      Left Outer Join dbo.[@Currency_Rate] cr_D WITH(NoLock, NoWait) on cr_d.Currency = s.Currency And cr_D.Exchange_Date = convert(Date, s.Debit_Date)

      Where o.Debit_No = @Debit_No
      Order by Model_Order_No, r.Model_No, r.Model_Range;
   End
   if(@Mode = 0 or @Mode = 3)
   Begin      
      SELECT de.Debit_ExpenseID
      , de.Debit_No
      , de.Description
      , isnull(de.Qty,0) AS Qty
      , isnull(de.Doc_Price,0) AS Doc_Price
      , Round(isnull(de.Qty,0) * isnull(de.Doc_Price,0), 2) AS Amount
      , isnull(de.Unit_Price,0) AS Unit_Price
      , Round(isnull(de.Qty,0) * isnull(de.Unit_Price,0), 2) AS Unit_Amount
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
         var DataSet = {Model_Debit: (req.body.Mode == 0 || req.body.Mode == 1) ? result.recordsets[0] : []
           , Model_Debit_Detail: (req.body.Mode == 0) ? result.recordsets[1] : (req.body.Mode == 2 ? result.recordsets[0] : [])
           , Model_Debit_Expense: (req.body.Mode == 0) ? result.recordsets[2] : (req.body.Mode == 3 ? result.recordsets[0] : [])
           , Debit_RCV_List: (req.body.Mode == 0) ? result.recordsets[3] : (req.body.Mode == 4 ? result.recordsets[0] : [])
        };
        if(req.body.Mode == 0 || req.body.Mode == 2){
            var Qty = 0, Unit_Price_Amount = 0, Debit_Unit_Price_Amount = 0, Sale_Price_Amount = 0
            DataSet.Model_Debit_Detail.forEach((item) => {
               Qty += item.Qty;               
               item.Unit_Price_Amount = Math.round((item.Unit_Price_Amount)*10000)/10000;
               item.Sale_Price_Amount = Math.round((item.Sale_Price_Amount)*10000)/10000;
               Debit_Unit_Price_Amount += item.Debit_Unit_Price_Amount;
               Unit_Price_Amount += item.Unit_Price_Amount;
               Sale_Price_Amount += item.Sale_Price_Amount;
            });
            Debit_Unit_Price_Amount = Math.round((Debit_Unit_Price_Amount)*10000)/10000
            Unit_Price_Amount = Math.round((Unit_Price_Amount)*10000)/10000
            Sale_Price_Amount = Math.round((Sale_Price_Amount)*10000)/10000
            DataSet.Detail_Total = {Qty:Qty, Unit_Price_Amount:Unit_Price_Amount, Debit_Unit_Price_Amount:Debit_Unit_Price_Amount, Sale_Price_Amount:Sale_Price_Amount}
        }
        if(req.body.Mode == 0 || req.body.Mode == 3){
            var Qty = 0, Amount = 0, Unit_Amount = 0
            DataSet.Model_Debit_Expense.forEach((item) => {
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
               Amount += item.Deposit;
               item.Deposit = Math.round((item.Deposit)*10000)/10000;
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

//Maintain Model Debit 
router.post('/Model_Debit_Maintain',  function (req, res, next) {
   console.log("Call Model_Debit_Maintain Api:",req.body);

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
            Select @Debit_No as [Debit_No], 'Model' as Subject, @OrganizationID as [OrganizationID], @Department as [Department]
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
            ${(req.body.Name == 'Debit_No') ? " And (Select Count(*) From [dbo].[Money_Source] d with(NoLock,NoWait) Where Source_No = @Debit_No And d.Subject = 'Debit RCV' ) = 0":" And (Select Count(*) From [dbo].[Money_Source] d with(NoLock,NoWait) Where Source_No = @Debit_No And d.Subject = 'Debit RCV' And d.MoneyID is not null) = 0"}
            ${(req.body.Name == 'Debit_No' || req.body.Name == 'CustomerID') ? ' And (Select count(*) From Model_Order sp with(NoLock,NoWait) Where sp.Debit_No = @Debit_No ) = 0':''}
            ${(req.body.Name == 'Debit_No') ? ' And (Select Count(*) From [dbo].[Debit] d with(NoLock,NoWait) Where Debit_No = {Value}) = 0':''}
            ;

            Set @ROWCOUNT = @@ROWCOUNT;
         `, req.body);
      break;
      case 2:
         strSQL += format(`
            Delete FROM [dbo].[Debit] 
            where Debit_No = @Debit_No
            And (Select count(*) From Model_Order sp with(NoLock,NoWait) Where sp.Debit_No = @Debit_No ) = 0
            And (Select count(*) From Debit_Expense sd with(NoLock,NoWait) Where sd.Debit_No = @Debit_No ) = 0
            And (select count(*) From Money_Source c WITH (NoLock, NoWait) Where c.Source_No = @Debit_No And Subject = 'Debit RCV' And c.MoneyID is not null) = 0
            
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

//Maintain Model Debit Detail
router.post('/Model_Debit_Detail_Maintain',  function (req, res, next) {
   console.log("Call Model_Debit_Detail_Maintain Api:",req.body);

   // req.body.Mode === 0 表示新增
   // req.body.Mode === 1 表示修改
   // req.body.Mode === 2 表示刪除
   var Size = 0;
   req.body.Debit_No = req.body.Debit_No ? `N'${req.body.Debit_No.trim().replace(/'/g, "''")}'` : `''`;
   
   var strSQL = format(`Declare @ROWCOUNT int=0, @Debit_No Varchar(20) = {Debit_No}

   if((select count(*) From Money_Source c WITH (NoLock, NoWait) Where c.Source_No = @Debit_No And Subject = 'Debit RCV' And c.MoneyID is not null) > 0 )
   begin
      Select @ROWCOUNT as Flag;
      return;
   End
   `, req.body);
   switch(req.body.Mode){
      case 0:
         req.body.QueryData = req.body.QueryData ? `N'${req.body.QueryData.replace(/'/g, "''")}'` : `''`; 

         strSQL += format(`
         Declare @tmpTable Table (Model_Order_No int)
         Declare @Import_Mode int = {Import_Mode}

         if(@Import_Mode = 0)
         begin
            Insert @TmpTable
            Select distinct d.[Model_Order_No]
            From Debit s with(NoLock,NoWait)
            Inner Join Model_Order o with(NoLock,NoWait) on s.CustomerID = o.CustomerID
            Inner Join Model_Order_Detail d with(NoLock, NoWait) on o.Model_Order_No = d.Model_Order_No
            Inner Join Model_Range r with(NoLock, NoWait) on r.Model_RangeID = d.Model_RangeID
            Where s.Debit_No = {Debit_No}
            And Isnull(o.Debit_No,'') = ''
            And ({QueryData} = '' or charindex({QueryData}, cast(isnull(d.Model_Order_No,'') as nvarchar) + ' ' + cast(isnull(r.Model_No,'') as nvarchar) + ' ' + cast(isnull(r.Model_Range,'') as nvarchar) ) > 0);         
         end
         else
         begin 
            Insert @TmpTable
            Select {Model_Order_No} as [Model_Order_No]
         end

         Update [dbo].[Model_Order] set Debit_No = @Debit_No
         From [dbo].[Model_Order] s
         Inner Join @tmpTable d on s.Model_Order_No = d.Model_Order_No
         where isnull(s.Debit_No,'') = ''

         Set @ROWCOUNT = @@ROWCOUNT;          
         `, req.body);
      break;
      case 1:
         switch(req.body.Name){
            case 'Remark_For_Debit':
            case 'Remark':
               Size=65535;
            break;
         }

         req.body.Value = Size == 0 ? (req.body.Value ? req.body.Value : null) : (req.body.Value ? `N'${req.body.Value.trim().replace(/'/g, "''")}'` : `''`);
         req.body.Model_Order_DetailID = req.body.Model_Order_DetailID ? req.body.Model_Order_DetailID : null;
         
         strSQL += format(`         
            Update [dbo].[Model_Order_Detail] Set [{Name}] = ${Size == 0 ? '{Value}': `substring({Value},1,${Size})`}            
            where Model_Order_DetailID = {Model_Order_DetailID};

            Set @ROWCOUNT = @@ROWCOUNT;
         `, req.body);
      break;
      case 2:
         req.body.Model_Order_No = req.body.Model_Order_No ? req.body.Model_Order_No : null;
         strSQL += format(`
            Update [dbo].[Model_Order] set Debit_No = null
            where Model_Order_No = {Model_Order_No}
            And Debit_No = @Debit_No;
                        
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
      , Amount = isnull((Select sum(Round(isnull(sd.Qty,0) * isnull(sd.Sale_Price,0),2)) 
                        From Model_Order_Detail sd with(NoLock,NoWait) 
                        Inner Join Model_Order s with(NoLock,NoWait) on s.Model_Order_No = sd.Model_Order_No 
                        Where s.Debit_No = @Debit_No), 0) 
               + isnull((Select sum(Round(isnull(pe.Qty,0) * isnull(pe.Unit_Price,0),2)) 
                        From Debit_Expense pe with(NoLock,NoWait) 
                        Where pe.Debit_No = @Debit_No),0)
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

//Maintain Model Debit Expense
router.post('/Model_Debit_Expense_Maintain',  function (req, res, next) {
   console.log("Call Model_Debit_Expense_Maintain Api:",req.body);

   // req.body.Mode === 0 表示新增
   // req.body.Mode === 1 表示修改
   // req.body.Mode === 2 表示刪除
   var Size = 0;
   req.body.Debit_No = req.body.Debit_No ? `N'${req.body.Debit_No.trim().replace(/'/g, "''")}'` : `''`;
   req.body.Debit_ExpenseID = req.body.Debit_ExpenseID ? req.body.Debit_ExpenseID : null; 
   
   var strSQL = format(`Declare @ROWCOUNT int=0, @Debit_ExpenseID int = {Debit_ExpenseID}, @Debit_No varchar(20) = {Debit_No};

      if((select count(*) From Money_Source c WITH (NoLock, NoWait) Where c.Source_No = @Debit_No And Subject = 'Debit RCV' And c.MoneyID is not null) > 0 )
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
      , Amount = isnull((Select sum(Round(isnull(sd.Qty,0) * isnull(sd.Sale_Price,0),2)) 
                        From Model_Order_Detail sd with(NoLock,NoWait) 
                        Inner Join Model_Order s with(NoLock,NoWait) on s.Model_Order_No = sd.Model_Order_No 
                        Where s.Debit_No = @Debit_No), 0) 
               + isnull((Select sum(Round(isnull(pe.Qty,0) * isnull(pe.Unit_Price,0),2)) 
                        From Debit_Expense pe with(NoLock,NoWait) 
                        Where pe.Debit_No = @Debit_No),0)
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

 //Get Model Debit Detail Add List
 router.post('/Model_Debit_Detail_Add_List',  function (req, res, next) {
   console.log("Call Model_Debit_Detail_Add_List Api:",req.body);  
 
   req.body.Debit_No = req.body.Debit_No ? `N'${req.body.Debit_No.trim().replace(/'/g, "''")}'` : `''`;
 
   var strSQL = format(`
   Select cast(0 as bit) as flag, '' as Query
   , d.[Model_Order_DetailID]
   , d.[Model_Order_No]
   , d.[Model_RangeID]
   , r.[Model_No]
   , r.[Model_Range]      
   , isnull(d.[Qty],0) as Qty
   , isnull(d.[Unit_Price],0) as Unit_Price
   , isnull(d.[Qty],0) * isnull(d.[Unit_Price],0) AS Unit_Price_Amount
   , isnull(d.[Sale_Price],0) as Sale_Price
   , isnull(d.Qty,0) * isnull(d.[Sale_Price],0) AS Sale_Price_Amount
   , d.[Remark]
   From Debit s with(NoLock,NoWait)
   Inner Join Model_Order o with(NoLock,NoWait) on s.CustomerID = o.CustomerID And s.Currency = o.Invoice_Currency
   Inner Join Model_Order_Detail d with(NoLock, NoWait) on o.Model_Order_No = d.Model_Order_No
   Inner Join Model_Range r with(NoLock, NoWait) on r.Model_RangeID = d.Model_RangeID
   Where s.Debit_No = {Debit_No}
   And Isnull(o.Debit_No,'') = ''
   And isnull(d.Qty,0) * isnull(d.[Sale_Price],0) > 0
   Order by Model_Order_No, r.Model_No, r.Model_Range;     
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
   - isnull((Select Sum(Round(isnull(Deposit,0),2)) From Money_Source c WITH (NoLock, NoWait) Where c.Source_No = {Debit_No} And Subject = 'Debit RCV'),0)

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
            , 'Debit RCV' as Subject
            , {Debit_No} as Source_No
            , {Description} as Description
            , N'${req.UserID}' as [Update_User]
            , GetDate() as [Update_Date]

            Set @ROWCOUNT = @@ROWCOUNT;
         end
         `, req.body);
      break;
      case 1:
         var Size = 0;
         switch(req.body.Name) {
            case 'Type':
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
         And ABS(isnull(ms.Deposit,0)) - ABS(@Split_Amount) > 0

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

//Get Model Debit Info
router.post('/Model_Debit_Report_Info',  function (req, res, next) {
   console.log("Call Sample_Debit_Note_Report_Info Api:",req.body);  
 
   req.body.Mode = req.body.Mode ? req.body.Mode : 0;
   req.body.Debit_No = req.body.Debit_No ? `N'${req.body.Debit_No.trim().replace(/'/g, "''")}'` : `''`;
    
   //Mode == 0 Shipping Sheet Report
   var strSQL = format(`Declare @Mode int = {Mode}, @Debit_No Varchar(20) = {Debit_No};   
   SELECT s.[Debit_No]
   , s.[OrganizationID]
   , isnull(s.[Approve],'') as Approve
   , isnull(Convert(varchar(20), [Approve_Date], 120),'') as Approve_Date
   , isnull(Convert(varchar(20), [Approve_First_Date], 120),'') as Approve_First_Date
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
     End as Debit_Doc_Title
   , s.[Payment_Term]
   , s.[Commodity]
   , dbo.RecurseNumber(isnull(s.Amount,0) * (case when isnull(s.Amount,0) < 0 then -1 else 1 end)) as EngNum_TTL_Amount
   , s.[Payment_Term_Debit]
   , s.[Remark]
   FROM Debit s WITH (NoLock, NoWait)
   Left Outer Join [dbo].[Customer_Contacts] c WITH (NoLock, NoWait) on s.ContactID = c.ContactID
   Left Outer Join [dbo].[Bank] b with(NoLock,NoWait) on b.BankID = s.Advising_Bank
   Left Outer Join [dbo].[Credit_Accounts] p WITH (NoWait, Nolock) on p.AccountID = s.Beneficiary
   Left Outer Join Currency cr WITH (NoWait, Nolock) on s.Currency = cr.Currency
   WHERE Debit_No = @Debit_No;

   Select d.[Model_Order_No]
   , r.Model_No
   , r.Model_RangeID
   , r.Model_Range
   , case when r.Size_From = r.Size_End then 
      case when r.Size_From = 0 then '-' else (Select rtrim(isnull(ps.Size_Name,'')) From Product_Size ps with(NoLock,NoWait) Where r.Size_From = ps.SizeID) End   
   else
      case when r.Size_From = 0 then '-' else (Select rtrim(isnull(ps.Size_Name,'')) From Product_Size ps with(NoLock,NoWait) Where r.Size_From = ps.SizeID ) End
       + ' ~ ' + 
      case when r.Size_End = 0 then '-' else (Select rtrim(isnull(ps.Size_Name,'')) From Product_Size ps with(NoLock,NoWait) Where r.Size_End = ps.SizeID ) End       
   End as Size_Fit
   , m.[Brand]
   , m.[Unit]
   , isnull(d.[Qty],0) as Qty
   , isnull(d.[Unit_Price],0) * (case when @Mode = 0 then -1 else 1 end) as Unit_Price
   , isnull(d.[Qty],0) * isnull(d.[Unit_Price],0) * (case when @Mode = 0 then -1 else 1 end) AS Unit_Price_Amount
   , isnull(d.[Sale_Price],0) * (case when @Mode = 0 then -1 else 1 end) as Sale_Price
   , isnull(d.Qty,0) * isnull(d.[Sale_Price],0) * (case when @Mode = 0 then -1 else 1 end) AS Sale_Price_Amount
   , d.[Remark]
   , d.[Remark_For_Debit]
   From Model_Order o with(NoLock,NoWait)
   Inner Join Model_Order_Detail d with(NoLock, NoWait) on o.Model_Order_No = d.Model_Order_No
   Inner Join Model_Range r with(NoLock, NoWait) on r.Model_RangeID = d.Model_RangeID
   Inner Join Model m with(NoLock, NoWait) on r.Model_No = m.Model_No
   Where o.Debit_No = @Debit_No
   Order by Model_Order_No, r.Model_No, r.Model_Range;

   SELECT de.Description
   , isnull(de.Qty,0) AS Qty
   , isnull(de.Doc_Price,0) * (case when @Mode = 0 then -1 else 1 end) AS Doc_Price
   , isnull(de.Qty,0) * isnull(de.Doc_Price,0) * (case when @Mode = 0 then -1 else 1 end) AS Amount
   , isnull(de.Unit_Price,0) * (case when @Mode = 0 then -1 else 1 end) AS Unit_Price
   , isnull(de.Qty,0) * isnull(de.Unit_Price,0) * (case when @Mode = 0 then -1 else 1 end) AS Unit_Amount
   , de.Remark
   FROM Debit_Expense de with(NoLock, NoWait)
   Where de.Debit_No = @Debit_No;

   --3 Money Source: Payment_Term
   select CASE WHEN m.Payment_Term IS NULL THEN dbo.Get_Payment_Term('', m.Type, m.Days, m.By_Doc_Rcv) ELSE m.Payment_Term END + ' ' + p.Currency + ' ' + FORMAT(Round(m.Deposit * (case when ABS(isnull(p.IsCredit_Note,0)) = 1 then -1 else 1 end), case when p.Currency = 'TWD' then 0 else 2 end), '#,###.00')  as Payment_Term
   from Money_Source m With(NoLock,NoWait)
   Inner Join Debit p With(NoLock,NoWait) on m.Source_No = p.Debit_No
   where m.Source_No = @Debit_No and m.Subject = 'Debit RCV';

   `, req.body) ;    
   //console.log(strSQL)
   db.sql(req.SiteDB, strSQL)
      .then((result) => {         
         var DataSet = {Report_Info: result.recordsets[0]
            , Report_Detail: result.recordsets[1]
            , Report_Expense: result.recordsets[2]
            , Payment_Term: result.recordsets[3]
            , OrganizationID: result.recordsets[0][0].OrganizationID
            , Approve: result.recordsets[0][0].Approve
            , Approve_Date: result.recordsets[0][0].Approve_Date
            , Approve_First_Date: result.recordsets[0][0].Approve_First_Date
            , Beneficiary_Name: result.recordsets[0][0].Beneficiary_Name
            , Debit_Doc_Title: result.recordsets[0][0].Debit_Doc_Title
            , Payment_Term_Debit: result.recordsets[0][0].Payment_Term_Debit
            , Currency: result.recordsets[0][0].Currency
            , Currency_Symbol: result.recordsets[0][0].Currency_Symbol
            , Currency_en: result.recordsets[0][0].Currency_en
            , EngNum_TTL_Amount: result.recordsets[0][0].EngNum_TTL_Amount
            , G_Detail_Total: {Qty:0, Amount:0}
            , G_Expense_Total: {Qty:0, Amount:0}
            , G_Total_Qty:0
            , G_Total_Amount:0
         };
        
         DataSet.Report_Detail.forEach((item)=>{
            DataSet.G_Detail_Total.Qty += item.Qty;
            item.Sale_Price_Amount = Math.round(item.Sale_Price_Amount * 10000)/10000
            DataSet.G_Detail_Total.Amount += item.Sale_Price_Amount;
         })
         
         DataSet.Report_Expense.forEach((item)=>{
            DataSet.G_Expense_Total.Qty += item.Qty;
            item.Unit_Amount = Math.round(item.Unit_Amount * 10000)/10000
            DataSet.G_Expense_Total.Amount += item.Unit_Amount;
         })

         DataSet.G_Total_Qty = DataSet.G_Detail_Total.Qty + DataSet.G_Expense_Total.Qty;
         DataSet.G_Total_Amount = Math.round(DataSet.G_Detail_Total.Amount * 10000)/10000 + Math.round(DataSet.G_Expense_Total.Amount * 10000)/10000;
         DataSet.G_Detail_Total.Amount = Math.round(DataSet.G_Detail_Total.Amount * 10000)/10000
         DataSet.G_Expense_Total.Amount = Math.round(DataSet.G_Expense_Total.Amount * 10000)/10000         

      //console.log(DataSet)
         res.send(DataSet);
      }).catch((err) => {
         console.log(err);
         res.status(500).send(err);
      })
});

//Save photo to Model folder.
router.post('/Save_Model_Photo_to_Model', function (req, res, next) {
   console.log("Call Save_Model_Photo_to_Model API")
   var form = new formidable.IncomingForm();
   var File = [];
   var Fields = {};
   //var path = "Z:\\Images\\Products\\Components";
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
     var file = format(`{0}.jpg`, Fields.Model_No);     
     var comp_path = `Images\\Models\\Photos`;
     var path = format("{0}\\{1}", comp_path, Fields.Photo_Month);
     var strSQL = format(`Update Model set Photo_Month = '{Photo_Month}'
     , Photo_Uploader = '{UserID}'
     , Photo_Upload = getdate()
     Where Model_No = N'{Model_No}';
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
                   await MKDir(path);
                   await MKDir(`${path}\\Large`);
                   await MKDir(`${path}\\Thumb`);                   
                   await imgWriteFile(1500, File[0], `${path}\\Large\\${file}`);
                   await imgWriteFile(320, File[0], `${path}\\${file}`);
                   await imgWriteFile(120, File[0], `${path}\\Thumb\\${file}`);                   
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


 function MKDir(path) {
   return new Promise(function(resolve, reject) {
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

 function DelFile(path) {
   return new Promise( function(resolve, reject) {
     smb2.exists(path, function (err, exists) {
       if (err) reject(err);
       if (exists) {
           smb2.unlink(path, (err) => {
           if (err) {
             console.log(`${path}:無法刪除`);
             reject(err);
           } else {
             console.log(`${path}:已刪除`);
             resolve('success');
           }
         });
       } else {
         console.log(`${path}:檔案不存在`);
         resolve(`${path}:檔案不存在`);
       }
     });
   });
 }
 function WritePhotoFile(dest, data) {
   return new Promise(function(resolve, reject) {
     smb2.writeFile(dest, data, {flags: 'w'}, function (err, callback) {
       if (err) {
         console.log('WRITE ERROR!')
         reject(err);
       } else {
         // console.log(callback)
         resolve(callback);
       }
     });
   })
 }

 function ReadPhotoFile(src) {
   return new Promise(function (resolve, reject) {
     smb2.readFile(src, function (err, data) {
       if (err) {
         reject(err);
       } else {
         resolve(data);
       }
     });
   })
 }

 async function CopyFile(src, dest) {
   try {
     let data = await ReadPhotoFile(src)
     await WritePhotoFile(dest, data)
   } catch (error) {
     console.error(error);
   }
 }

//Copyas photo of Product to Model folder.
//匯入產品圖-6(底圖)至模具
router.post('/CopyAs_Photo', function (req, res, next) {
   console.log("Call CopyAs_Photo Api", req.body);

   req.body.Model_No = req.body.Model_No ? `${req.body.Model_No.replace(/'/g, "''")}` : ``;
   req.body.Product_No = req.body.Product_No ? `${req.body.Product_No.replace(/'/g, "''")}` : ``;

   var file_d = format(`{Model_No}.jpg`, req.body);
   // var Sketch_Month_Old = req.body.Sketch_Month;
   var Photo_Month_d = moment().format("YYMM");
   var Photo_Month_s = '';   
   var file_s = format(`{Product_No}-6.jpg`, req.body);   
   var Product_Photo_path = "Images\\Products\\Photos"
   var path = "Images\\Models\\Photos"
 
   var strSQL = format(` Declare @Photo_Month_s varchar(4), @Photo_Month_d varchar(4)
     SELECT @Photo_Month_s = Photo_Month From Product with(Nolock,NoWait) where Product_No = N'{Product_No}'
     SELECT @Photo_Month_d = isnull([Photo_Month],'${Photo_Month_d}') FROM Model WHERE Model_No = N'{Model_No}'

     UPDATE Model SET [Photo_Month] = @Photo_Month_d, Photo_Uploader = '${req.UserID}', Photo_Upload = Getdate() WHERE Model_No = N'{Model_No}'
     Select @Photo_Month_s as Photo_Month_s, @Photo_Month_d as Photo_Month_d
   `, req.body);
 

   db.sql(req.Enterprise, strSQL)
   .then((result)=>{
     Photo_Month_s = result.recordset[0].Photo_Month_s;
     Photo_Month_d = result.recordset[0].Photo_Month_d;
   
     if (Photo_Month_s.length <= 0) {
       console.log('Soruce Photo Month null!')
       res.status(500).send('Something Wrong! Soruce Photo Month null!');
       return;
     }
     
     smb2.exists(`${Product_Photo_path}`, function (err, exists) { // 執行檢查資料夾及建立檔案
       if (err) {
         console.log(err)
         //smb2.close();
         //smb2.disconnect();
         res.status(503).send('Service Unavailable!')
       } else {
         const Smb2Practice = async () => {
           try {
             console.log(format('Save photo to Server:{0}', path));
             await MKDir(`${path}\\${Photo_Month_d}\\Large`);
             console.log(format('Copy photo From {0} to {1}', `${Product_Photo_path}\\${Photo_Month_s}\\Large\\${file_s}`, `${path}\\${Photo_Month_d}\\Large\\${file_d}`));
             await CopyFile(`${Product_Photo_path}\\${Photo_Month_s}\\Large\\${file_s}`, `${path}\\${Photo_Month_d}\\Large\\${file_d}`);
             await MKDir(`${path}\\${Photo_Month_d}`);
             console.log(format('Copy photo From {0} to {1}', `${Product_Photo_path}\\${Photo_Month_s}\\${file_s}`, `${path}\\${Photo_Month_d}\\${file_d}`));
             await CopyFile(`${Product_Photo_path}\\${Photo_Month_s}\\${file_s}`, `${path}\\${Photo_Month_d}\\${file_d}`);
             await MKDir(`${path}\\${Photo_Month_d}\\Thumb`);
             console.log(format('Copy photo From {0} to {1}', `${Product_Photo_path}\\${Photo_Month_s}\\Thumb\\${file_s}`, `${path}\\${Photo_Month_d}\\Thumb\\${file_d}`));
             await CopyFile(`${Product_Photo_path}\\${Photo_Month_s}\\Thumb\\${file_s}`, `${path}\\${Photo_Month_d}\\Thumb\\${file_d}`);             
             await res.send("success");
           } catch (error) {
             console.log(error)
             //smb2.close();
             //smb2.disconnect();
             res.status(503).send('Service Unavailable!')
           }
         }
         Smb2Practice()
       }
     })    
   }).catch((err)=>{
     console.log(err);
     res.status(500).send(err);
   }) 
 
 
 });
 

/* Mark-Wang API End */


/* Darren-Chang API Begin */

/* Darren-Chang API End */

module.exports = router;