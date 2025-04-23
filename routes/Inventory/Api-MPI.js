var express = require('express');
var router = express.Router();
const format = require('string-format');
var db = require('../../config/DB_Connect');


/* Mark-Wang API Begin */

var Update_SQL = `
Update MPI set Amount = (
   Select sum(isnull(md.Unit_Price,0) * isnull(md.Qty ,0) * isnull(m.MTR_Declare_Rate,0) / cr.Currency_Rate)
   From MPI m with(NoWait,NoLock)
   Inner Join MPI_Detail md with(NoWait,NoLock) on m.MPI_No = md.MPI_No
   INNER JOIN dbo.[@Currency_Rate] cr with(NoLock,NoWait) ON m.Currency = cr.Currency And cast(cr.Exchange_Date as Date) = cast(m.[Date] as Date)
   Where m.MPI_No = {MPI_No}
)
Where MPI_No = {MPI_No}
`
//Check MPI_No
router.post('/Check_MPI_No',  function (req, res, next) {
   console.log("Call Check_MPI_No Api:",req.body);

   req.body.MPI_No = req.body.MPI_No ? `${req.body.MPI_No.trim().replace(/'/g, '')}` : '';

   var strSQL = format(` Declare @RecCount int, @LenCounter int;
   Set @LenCounter = Len(N'{MPI_No}');

   SELECT @RecCount = Count(*)
   FROM [dbo].[MPI] With(Nolock,NoWait)
   where ([MPI_No] = N'{MPI_No}');

   Select case when @LenCounter > 15 then @LenCounter else @RecCount end as RecCount;
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

//Get MPI_Material_CCC_Code_Check_List
router.post('/MPI_Material_CCC_Code_Check_List',  function (req, res, next) {
   console.log("Call MPI_Material_CCC_Code_Check_List Api:",req.body);  
    
   req.body.MPI_No = req.body.MPI_No ? req.body.MPI_No : ``;
      
   var strSQL = format(`   
   Declare @MPI_No varchar(20) = '{MPI_No}'

   Select DISTINCT iif(m.Unit <> cc.Unit,1,0) as Unit_Flag
   , m.MaterialID
   , m.Material_Category
   , m.Unit
   , cc.Region
   , cc.CCC_CodeID
   , cc.CCC_Code
   , cc.[Description]
   , cc.Unit as C_Unit
   , sod.Stock_Out_No
   From MPI with(NoLock,Nowait)
   Inner Join Stock_Out so with(NoLock,NoWait) on MPI.MPI_No = so.MPI_No
   inner Join Stock_Out_Detail sod with(NoLock,NoWait) on sod.Stock_Out_No = so.Stock_Out_No
   inner Join Material m with(NoLock, noWait) on sod.MaterialID = m.MaterialID
   inner Join Material_CCC_Code mcc with(NoLock, noWait) on mcc.MaterialID = m.MaterialID
   inner Join CCC_Code cc with(NoLock, noWait) on cc.CCC_CodeID = mcc.CCC_CodeID and MPI.Region = cc.Region
   Where MPI.MPI_No = @MPI_No
   Order by Unit_Flag;

   `, req.body) ;
   //console.log(strSQL)
   db.sql(req.SiteDB, strSQL)
      .then((result) => {
         var DataSet = result.recordsets[0];
         //console.log(DataSet)
         res.send(DataSet);
      }).catch((err) => {
         console.log(err);
         res.status(500).send(err);
      })
});

 //Get MPI_List
router.post('/MPI_List',  function (req, res, next) {
   console.log("Call MPI_List Api:",req.body);

   req.body.MPI_No = req.body.MPI_No ? `${req.body.MPI_No.trim().substring(0,13).replace(/'/g, '')}` : ``;   
   req.body.Date_From = req.body.Date_From ? `${req.body.Date_From.trim().substring(0,10).replace(/'/g, '')}` : ``;
   req.body.Date_To = req.body.Date_To ? `${req.body.Date_To.trim().substring(0,10).replace(/'/g, '')}` : ``;
   req.body.OrganizationID = req.body.OrganizationID ? `${req.body.OrganizationID.trim().substring(0,10).replace(/'/g, '')}` : ``;   
   req.body.CustomerID = req.body.CustomerID ? `${req.body.CustomerID.trim().substring(0,15).replace(/'/g, '')}` : ``;
   req.body.Shipment_Port = req.body.Shipment_Port ? `${req.body.Shipment_Port.trim().substring(0,60).replace(/'/g, '')}` : ``;
   req.body.Container = req.body.Container ? `${req.body.Container.trim().substring(0,65535).replace(/'/g, '')}` : ``;
   req.body.M_ETD_From = req.body.M_ETD_From ? `${req.body.M_ETD_From.trim().substring(0,10).replace(/'/g, '')}` : ``;
   req.body.M_ETD_To = req.body.M_ETD_To ? `${req.body.M_ETD_To.trim().substring(0,10).replace(/'/g, '')}` : ``;
   req.body.M_ETA_From = req.body.M_ETA_From ? `${req.body.M_ETA_From.trim().substring(0,10).replace(/'/g, '')}` : ``;
   req.body.M_ETA_To = req.body.M_ETA_To ? `${req.body.M_ETA_To.trim().substring(0,10).replace(/'/g, '')}` : ``;
   req.body.Memo = req.body.Memo ? `${req.body.Memo.trim().substring(0,50).replace(/'/g, '')}` : ``;
   req.body.UserID = req.body.UserID ? `${req.body.UserID.trim().substring(0,20).replace(/'/g, '')}` : ``;
   req.body.Currency = req.body.Currency ? `${req.body.Currency.trim().substring(0,4).replace(/'/g, '')}` : ``;

   var strSQL = format(`
   SELECT Top 1000 m.[MPI_No]      
   , Convert(varchar(10), m.[Date],111) as [Date]
   , isnull(m.[OrganizationID],'') as [OrganizationID]
   , isnull(m.[CustomerID],'') as [CustomerID]
   , isnull(m.[Shipment_Port],'') as [Shipment_Port]
   , isnull(m.[Container],'') as [Container]
   , Convert(varchar(10), m.M_ETD,111) as [M_ETD]
   , Convert(varchar(10), m.M_ETA,111) as [M_ETA]
   , isnull(m.[Memo],'') as [Memo]
   , m.[Sales]
   , m.[UserID]
   , m.[Data_Updater]
   , Convert(varchar(10), m.[Data_Update],111) as [Data_Update]      
   , m.[MTR_Declare_Rate]
   , m.[Currency]
   , m.[Packages]
   , m.[Amount]
   FROM [dbo].[MPI] m with(NoLock, NoWait)
   where (N'{MPI_No}' = '' or m.MPI_No like N'%{MPI_No}%')
   And ((N'{Date_From}' = '' or N'{Date_To}' = '') or convert(date, m.[Date],111) between N'{Date_From}' And N'{Date_To}')
   And (N'{OrganizationID}' = '' or m.OrganizationID like N'%{OrganizationID}%')   
   And (N'{CustomerID}' = '' or m.CustomerID like N'%{CustomerID}%')
   And (N'{Shipment_Port}' = '' or m.Shipment_Port like N'%{Shipment_Port}%')
   And (N'{Container}' = '' or m.Container like N'%{Container}%')
   And ((N'{M_ETD_From}' = '' or N'{M_ETD_To}' = '') or convert(date, m.[M_ETD],111) between N'{M_ETD_From}' And N'{M_ETD_To}')
   And ((N'{M_ETA_From}' = '' or N'{M_ETA_To}' = '') or convert(date, m.[M_ETA],111) between N'{M_ETA_From}' And N'{M_ETA_To}')
   And (N'{Memo}' = '' or m.Memo like N'%{Memo}%')
   And (N'{UserID}' = '' or m.UserID like N'%{UserID}%')
   And (N'{Currency}' = '' or m.Currency like N'%{Currency}%')
   Order by Date desc;`
   , req.body) ;
   //console.log(strSQL)
   db.sql(req.SiteDB, strSQL)
      .then((result) => {
         res.send(result.recordset);
      }).catch((err) => {
         console.log(err);
         res.status(500).send(err);
      })

});

 //Get MPI_Info
 router.post('/MPI_Info',  function (req, res, next) {
   console.log("Call MPI_Info Api:",req.body);
 
   req.body.MPI_No = req.body.MPI_No ? `N'${req.body.MPI_No.trim().substring(0,13).replace(/'/g, '')}'` : `''`;
   req.body.QueryData = req.body.QueryData ? `N'${req.body.QueryData.trim().replace(/'/g, "''")}'` : `''`;
   req.body.Mode = req.body.Mode ? req.body.Mode : 0;

   //Mode == 0 Get MPI, MPI_Detail, Stock_Out_Info and currency_Info
   //Mode == 1 Get MPI Data
   //Mode == 2 Get MPI_Detail Data
   //Mode == 3 Get Stock_Out_Info
   //Mode == 4 Get currency_Info
      
   var strSQL = format(`
   Declare @Mode int = {Mode}, @MPI_No Varchar(13) = {MPI_No};
 
   if(@Mode = 0 or @Mode = 1)
   Begin
      SELECT p.[MPI_No]
      , p.[Application_No]
      , Convert(varchar(10), p.[Date],111) as [Date]      
      , isnull(p.[CustomerID],'') as [CustomerID]
      , isnull(p.[Region],'') as [Region]
      , isnull(p.[OrganizationID],'') as [OrganizationID]
      , isnull(p.[Messrs],'') as [Messrs]
      , isnull(p.[Messrs_Address],'') as [Messrs_Address]
      , isnull(p.[Payment_Term],'') as [Payment_Term]
      , isnull(p.[Term_Price],'') as [Term_Price]
      , isnull(p.[Shipment_Port],'') as [Shipment_Port]
      , isnull(p.[Destination_Port],'') as [Destination_Port]
      , isnull(p.[M_Vessel],'') as [M_Vessel]
      , case when isnull(p.M_ETD,'') = '' then '' else Convert(varchar(10), p.[M_ETD],111) End as [M_ETD]
      , case when isnull(p.M_ETA,'') = '' then '' else Convert(varchar(10), p.[M_ETA],111) End as [M_ETA]
      , isnull(p.[Container],'') as [Container]
      , isnull(p.[Inspact_No],'') as [Inspact_No]
      , case when isnull(p.Expiry_Date,'') = '' then '' else Convert(varchar(10), p.[Expiry_Date],111) End as [Expiry_Date]
      , isnull(p.[Currency],'USD') as [Currency]
      , isnull(p.Exchange_Rate,0) as Exchange_Rate
      , isnull(p.MTR_Declare_Rate,0.7) as MTR_Declare_Rate
      , isnull(p.Price_Range,0) as Price_Range
      , isnull(p.Amount,0) as Amount
      , isnull(p.Packages,0) as Packages
      , isnull(p.[Commodity],'') as [Commodity]
      , isnull(p.[Beneficiary],'') as [Beneficiary]
      , isnull(p.Advising_Bank,0) as Advising_Bank
      , (Select top 1 b.S_Name From Bank b with(NoLock,NoWait) Where b.BankID = p.Advising_Bank) as Advising_Bank_Name      
      , isnull(p.[Memo],'') as [Memo]
      , isnull(cast(p.[Remark] as nvarchar),'') as [Remark]      
      , isnull(p.UserID,'') as UserID
      , isnull(p.Data_Updater,'') as Data_Updater
      , case when isnull(p.Data_Update,'') = '' then '' else Convert(varchar(20), p.[Data_Update],120) End as [Data_Update]
      FROM MPI p WITH (NoLock, NoWait)
      WHERE p.MPI_No = @MPI_No;
   End
   if(@Mode = 0 or @Mode = 2)
   Begin
      SELECT pd.MPI_DetailID
      , isnull(pd.CCC_CodeID, 0) as CCC_CodeID
      , isnull(pd.CCC_Code, '') as CCC_Code
      , isnull(pd.Description, '') as Description
      , isnull(pd.Unit, '') as Unit      
      , case when isnull(pd.Unit, '') != isnull(c.Unit,'') then 1 else 0 end as Unit_Flag
      , Round(isnull(pd.Unit_Price, 0),3) as Unit_Price
      , Round(isnull(pd.Max_Price, 0),3) as Max_Price
      , Round(isnull(pd.Min_Price, 0),3) as Min_Price
      , isnull(pd.Qty, 0) as Qty
      , case when isnull(pp.Exchange_Rate,0) = 0 then 0 else Round(Round(isnull(pd.Unit_Price, 0) / pp.Exchange_Rate ,4) * pd.[Qty],2) End as Sale_Amount
      , case when isnull(pp.Exchange_Rate,0) = 0 then 0 else Round(Round(isnull(pd.Unit_Price, 0) / pp.Exchange_Rate * isnull(pp.[MTR_Declare_Rate],1),4) * pd.[Qty],2) End as MPI_Amount
      , ( case when isnull(pp.Exchange_Rate,0) = 0 then 0 else Round(Round(isnull(pd.Unit_Price, 0) / pp.Exchange_Rate * isnull(pp.[MTR_Declare_Rate],1),4) * pd.[Qty],2) End ) -
        ( case when isnull(pp.Exchange_Rate,0) = 0 then 0 else isnull(pd.Unit_Price, 0) / pp.Exchange_Rate * isnull(pp.[MTR_Declare_Rate],1) * pd.[Qty] End)
        as Diff_Amount
      , Round(Round(isnull(pd.Unit_Price, 0),4) * pd.[Qty],2) as Sale_Amount_TWD
      , Round(Round(isnull(pd.Unit_Price, 0) * isnull(pp.[MTR_Declare_Rate],1),4) * pd.[Qty],2) as MPI_Amount_TWD
      , c.Unit AS Custom_Unit
      FROM MPI_Detail pd WITH(NoLock, NoWait)
      Inner Join MPI pp with(NoLock,NoWait) on pp.MPI_No = pd.MPI_No
      Left Outer JOIN [CCC_Code] c WITH(NoLock, NoWait) ON c.CCC_CodeID = pd.CCC_CodeID And c.Region = pp.Region
      --Left Outer JOIN dbo.[@Currency_Rate] c WITH(NoLock, NoWait) ON Convert(Date, pp.[Date]) = c.Exchange_Date and c.Currency =  pp.Currency      
      WHERE pd.MPI_No = @MPI_No
      Order by CCC_Code;
   End
   if(@Mode = 0 or @Mode = 3)
   Begin
      SELECT so.Stock_Out_No, so.Purchase_Project_No, pp.MTR_Declare_Rate
      FROM Stock_Out so with(NoLock,NoWait)
      INNER JOIN Purchase_Project pp with(NoLock,NoWait) ON so.Purchase_Project_No = pp.Purchase_Project_No
      where so.MPI_No = @MPI_No;
   End
   if(@Mode = 0 or @Mode = 4)
   Begin
      Select c.Currency, c.Currency_Rate
      From MPI p WITH(NoLock, NoWait)
      INNER JOIN dbo.[@Currency_Rate] c WITH(NoLock, NoWait) ON Convert(Date, p.[Date]) = c.Exchange_Date      
      Where p.MPI_No = @MPI_No;
   End

   `, req.body) ;
   //console.log(strSQL)
   db.sql(req.SiteDB, strSQL)
      .then((result) => {
         var DataSet = {MPI: (req.body.Mode == 0 || req.body.Mode == 1) ? result.recordsets[0] : []
           , MPI_Detail: (req.body.Mode == 0) ? result.recordsets[1] : (req.body.Mode == 2 ? result.recordsets[0] : [])
           , Stock_Out_Info: (req.body.Mode == 0) ? result.recordsets[2] : (req.body.Mode == 3 ? result.recordsets[0] : [])
           , currency_Info: (req.body.Mode == 0) ? result.recordsets[3] : (req.body.Mode == 4 ? result.recordsets[0] : [])
           , MPI_Detail_Total: { Diff_Amount: 0, Qty:0, Sale_Amount:0, MPI_Amount:0, Sale_Amount_TWD:0, MPI_Amount_TWD:0}
        };
        
        DataSet.MPI_Detail.forEach((item,idx) => {
            DataSet.MPI_Detail_Total.Qty += item.Qty;
            DataSet.MPI_Detail_Total.Sale_Amount += item.Sale_Amount;
            DataSet.MPI_Detail_Total.MPI_Amount += item.MPI_Amount;
            DataSet.MPI_Detail_Total.Diff_Amount += item.Diff_Amount;
            DataSet.MPI_Detail_Total.Sale_Amount_TWD += item.Sale_Amount_TWD;
            DataSet.MPI_Detail_Total.MPI_Amount_TWD += item.MPI_Amount_TWD;            

            item.Unit_Price = Math.round((item.Unit_Price)*1000)/1000;
            item.Qty = Math.round((item.Qty)*1000)/1000;
            item.Sale_Amount = Math.round((item.Sale_Amount)*1000)/1000;
            item.MPI_Amount = Math.round((item.MPI_Amount)*1000)/1000;
            item.Sale_Amount_TWD = Math.round((item.Sale_Amount_TWD)*1000)/1000;
            item.MPI_Amount_TWD = Math.round((item.MPI_Amount_TWD)*1000)/1000;
        });

        DataSet.MPI_Detail_Total.Diff_Amount = Math.round((DataSet.MPI_Detail_Total.Diff_Amount)*100000)/100000;
        DataSet.MPI_Detail_Total.Qty = Math.round((DataSet.MPI_Detail_Total.Qty)*1000)/1000;
        DataSet.MPI_Detail_Total.Sale_Amount = Math.round((DataSet.MPI_Detail_Total.Sale_Amount)*1000)/1000;
        DataSet.MPI_Detail_Total.MPI_Amount = Math.round((DataSet.MPI_Detail_Total.MPI_Amount)*1000)/1000;
        DataSet.MPI_Detail_Total.Sale_Amount_TWD = Math.round((DataSet.MPI_Detail_Total.Sale_Amount_TWD)*1000)/1000;
        DataSet.MPI_Detail_Total.MPI_Amount_TWD = Math.round((DataSet.MPI_Detail_Total.MPI_Amount_TWD)*1000)/1000;
        //console.log(DataSet)
        res.send(DataSet);
      }).catch((err) => {
         console.log(err);
         res.status(500).send(err);
      })
});

//Maintain MPI
router.post('/MPI_Maintain',  function (req, res, next) {
   console.log("Call MPI_Maintain Api:",req.body);

   // req.body.Mode === 0 表示新增
   // req.body.Mode === 1 表示修改
   // req.body.Mode === 2 表示刪除

   var Size = 0;
   req.body.MPI_No = req.body.MPI_No ? `N'${req.body.MPI_No.trim().substring(0,13).replace(/'/g, '')}'` : `''`;
   req.body.Name = req.body.Name != null ? req.body.Name:'';
   req.body.Mode = req.body.Mode ? req.body.Mode : 0;
   
   var strSQL = format(`Declare @Mode int = {Mode}, @ROWCOUNT int = 0, @MPI_No varchar(13) = {MPI_No};
   `, req.body);
   switch(req.body.Mode){
      case 0:
         req.body.CustomerID = req.body.CustomerID ? `N'${req.body.CustomerID.trim().substring(0,15).replace(/'/g, "''")}'` : `''`;
         req.body.Currency = req.body.Currency ? `'${req.body.Currency.trim().substring(0,11)}'` : `'USD'`;

         strSQL += format(`
         Declare @Messrs nvarchar(100), @Messrs_Address nvarchar(256)
         , @Exchange_Rate float, @MTR_Declare_Rate float, @OrganizationID nvarchar(10)

         Select @Messrs = c.Customer_Name
         , @Messrs_Address = c.Address
         From Customer c with(NoLock,NoWait)
         Where c.CustomerID = {CustomerID};

         Select @Exchange_Rate = cr.Currency_Rate
         From [@Currency_Rate] cr 
         Where cr.Currency = {Currency} and cast(cr.Exchange_Date as date) = cast(GetDate() as date)         

         Select @MTR_Declare_Rate = isnull([MTR_Declare_Rate],0.7) 
         , @OrganizationID = OrganizationID
         From [dbo].[Control]

         Insert [dbo].[MPI] (MPI_No, OrganizationID, CustomerID, Commodity, Currency, Exchange_Rate, Date, Messrs, Messrs_Address, MTR_Declare_Rate, Region, Destination_Port, UserID, Data_Updater, Data_Update)
         Select {MPI_No} as MPI_No
         , @OrganizationID as OrganizationID
         , {CustomerID} as CustomerID
         , 'Material Of Shoes' as Commodity
         , {Currency} as Currency
         , @Exchange_Rate as Exchange_Rate
         , GetDate() as Date
         , @Messrs as Messrs
         , @Messrs_Address as Messrs_Address
         , @MTR_Declare_Rate as MTR_Declare_Rate
         , 'INDONESIA' as Region
         , 'SURABAYA' as Destination_Port
         , '${req.UserID}' as UserID
         , '${req.UserID}' as Data_Updater
         , GetDate() as Data_Update

         Set @ROWCOUNT = @@ROWCOUNT;
         `, req.body);
       break;
      case 1:
         switch(req.body.Name){
            case 'MPI_No':
               Size = 13;
            break;
            case 'Currency':
               Size = 4;
            break;
            case 'Date':
            case 'OrganizationID':
            case 'M_ETD':
            case 'M_ETA':
            case 'Expiry_Date':
            case 'Beneficiary':
               Size = 10;
            break;
            case 'CustomerID':
            case 'Inspact_No':
               Size = 15;
            break;
            case 'Application_No':
               Size = 20;
            break;
            case 'Payment_Term':
               Size = 30;
            break;
            case 'M_Vessel':
               Size = 40;
            break;
            case 'Region':
            case 'Memo':
               Size = 50;
            break;
            case 'Shipment_Port':
            case 'Destination_Port':
               Size = 60;
            break;
            case 'Term_Price':
               Size = 80;
            break;
            case 'Messrs':
            case 'Commodity':               
               Size = 100;
            break;
            case 'Messrs_Address':
               Size = 256;
            break;            
            case 'Container':
            case 'Remark':
               Size = 65535;
            break;
            default:
            break;
         }
         req.body.Value = Size == 0 ? (req.body.Value != null ? req.body.Value : null) : (req.body.Value != null ? `N'${req.body.Value.trim().replace(/'/g, "''")}'` : `''`);
         
         switch(req.body.Name){
            case 'MPI_No':
               strSQL += format(`
                  Update [dbo].[MPI] Set [{Name}] = substring({Value},1,${Size})
                  where MPI_No = @MPI_No 
                  And (Select Count(*) From [dbo].[MPI] d with(NoLock,NoWait) Where MPI_No = {Value}) = 0 ;

                  Set @ROWCOUNT = @@ROWCOUNT;
                  if(@ROWCOUNT > 0)
                  Begin
                     set @MPI_No = substring({Value},1,${Size})
                  End
               `, req.body);   
            break;            
            case 'CustomerID':
               strSQL += format(`
                  Declare @Messrs nvarchar(100), @Messrs_Address nvarchar(256);

                  Select @Messrs = c.Customer_Name
                  ,  @Messrs_Address = c.Address
                  From Customer c with(NoLock,NoWait)
                  Where c.CustomerID = {Value};

                  Update [dbo].[MPI] Set [CustomerID] = substring({Value},1,${Size})
                  , Messrs = @Messrs
                  , Messrs_Address = @Messrs_Address
                  where MPI_No = @MPI_No
                  --And (Select count(*) From Stock_Out p with(NoLock,NoWait) where p.MPI_No = @MPI_No) = 0;
   
                  Set @ROWCOUNT = @@ROWCOUNT;
               `, req.body);
            break;
            case 'Date':
               strSQL += format(`
                  Declare @Value Date = case when cast({Value} as date) > GetDate() then GetDate() else cast({Value} as date) end;

                  Update [dbo].[MPI] Set [Date] = @Value 
                  , Exchange_Rate = cr.Currency_Rate
                  From MPI m
                  left Outer Join [@Currency_Rate] cr on cr.Currency = m.Currency and cast(cr.Exchange_Date as date) = @Value 
                  where m.MPI_No = @MPI_No;
   
                  Set @ROWCOUNT = @@ROWCOUNT;
               `, req.body);
            break;
            case 'M_ETD':
            case 'M_ETA':
            case 'Expiry_Date':
              strSQL += format(`
                Update [dbo].[MPI] Set [{Name}] = iif({Value} = '', null, {Value}) 
                From MPI m
                where m.MPI_No = @MPI_No;
 
                Set @ROWCOUNT = @@ROWCOUNT;
             `, req.body);
          break;
            case 'Currency':
               strSQL += format(`
                  Update [dbo].[MPI] Set [Currency] = substring({Value},1,${Size})
                  , Exchange_Rate = cr.Currency_Rate
                  From MPI m
                  left Outer Join [@Currency_Rate] cr on cr.Currency = {Value} and cast(cr.Exchange_Date as date) = cast(m.[date] as date)
                  where m.MPI_No = @MPI_No;
   
                  Set @ROWCOUNT = @@ROWCOUNT;
               `, req.body);
            break;
            case 'Region':
               strSQL += format(`
                  Update [dbo].[MPI] Set [{Name}] = ${(Size == 0 ? '{Value}': `substring({Value},1,${Size})`)}
                  , Destination_Port = null
                  where MPI_No = @MPI_No;

                  Set @ROWCOUNT = @@ROWCOUNT;
               `, req.body);
            break;
            default:
               strSQL += format(`
                  Update [dbo].[MPI] Set [{Name}] = ${(Size == 0 ? '{Value}': `substring({Value},1,${Size})`)}
                  where MPI_No = @MPI_No;   

                  Set @ROWCOUNT = @@ROWCOUNT;
               `, req.body);
            break;
         }         
         strSQL += format(`
         if(@ROWCOUNT > 0)
         Begin
           Update [dbo].[MPI] Set Data_Updater = '${req.UserID}'
           , Data_Update = GetDate()
           where MPI_No = @MPI_No;   
         End
        `, req.body);
      break;
      case 2:
         strSQL += format(`
            Delete FROM [dbo].[MPI] 
            where MPI_No = @MPI_No
            And (Select count(*) From MPI_Detail md with(NoLock,NoWait) Where md.MPI_No = @MPI_No) = 0;
            
            Set @ROWCOUNT = @@ROWCOUNT;
         `, req.body);
      break;   }

   strSQL += format(`   
   Select @ROWCOUNT as Flag,  @MPI_No as MPI_No;

   if(@Mode=1 And ('{Name}' = 'MTR_Declare_Rate' or '{Name}' = 'Currency' or '{Name}' = 'Date') ) And (@ROWCOUNT) > 0
   Begin
      ${Update_SQL}
   End

   `, req.body);
   //console.log(strSQL)

   db.sql(req.SiteDB, strSQL)
      .then((result) => {
         //console.log(result.recordsets[0])
         //res.send({Flag:result.recordsets[0][0].Flag > 0});
         res.send({Flag:result.recordsets[0][0].Flag > 0, MPI_No: result.recordsets[0][0].MPI_No });
      }).catch((err) => {
         console.log(err);
         res.status(500).send(err);
      })
   
});

//Get MPI_Detail_Add_List
router.post('/MPI_Detail_Add_List',  function (req, res, next) {
   console.log("Call MPI_Detail_Add_List Api:",req.body);  
    
   req.body.MPI_No = req.body.MPI_No ? req.body.MPI_No : ``;
   req.body.Stock_Out_No = req.body.Stock_Out_No ? req.body.Stock_Out_No.trim().replace(/'/g, '') : ``;
   req.body.Stock_Out_Date = req.body.Stock_Out_Date ? req.body.Stock_Out_Date.trim().replace(/'/g, '') : ``;
   req.body.WarehouseID = req.body.WarehouseID ? req.body.WarehouseID.trim().replace(/'/g, '') : ``;
   req.body.Purchase_Project_No = req.body.Purchase_Project_No ? req.body.Purchase_Project_No.trim().replace(/'/g, '') : ``;
   req.body.Shipping_Way = req.body.Shipping_Way ? req.body.Shipping_Way.trim().replace(/'/g, '') : ``;
      
   var strSQL = format(`   
   Declare @MPI_No varchar(20) = '{MPI_No}'

   SELECT 0 as flag
   , so.CustomerID
   , so.Stock_Out_No
   , so.WarehouseID
   , convert(varchar(10), so.Stock_Out_Date,111) as Stock_Out_Date
   , so.Purchase_Project_No
   , so.Shipping_Way
   , case when isnull(pp.Stock_Out_No,'') = '' then 1 else 0 end as PP_ACC_Amount_OK
   FROM Stock_Out so with(NoLock,NoWait)
   Inner Join MPI m with(NoLock,NoWait) on so.CustomerID = m.CustomerID And m.MPI_No = @MPI_No
   Left Outer Join PP_ACC_Amount pp with(NoLock,NoWait) on pp.Purchase_Project_No = so.Purchase_Project_No and pp.Stock_Out_No = so.Stock_Out_No   
   WHERE so.MPI_No Is Null 
   AND so.Shipping_Way in ('Sea', 'Air', 'Land', 'Local Express', 'Air Express', 'Proxy Express')
   And ('{Stock_Out_No}' = '' or isnull(so.Stock_Out_No,'') like '{Stock_Out_No}%'  ) 
   And ('{Stock_Out_Date}' = '' or convert(varchar(10),so.Stock_Out_Date,111) like '%{Stock_Out_Date}%'  ) 
   And ('{WarehouseID}' = '' or isnull(so.WarehouseID,'') like '%{WarehouseID}%'  ) 
   And ('{Purchase_Project_No}' = '' or isnull(so.Purchase_Project_No,'') like '%{Purchase_Project_No}%'  ) 
   And ('{Shipping_Way}' = '' or isnull(so.Shipping_Way,'') like '%{Shipping_Way}%'  ) 
   ORDER BY so.CustomerID, so.Stock_Out_No DESC, Purchase_Project_No;
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

//Maintain MPI_Detail
router.post('/MPI_Detail_Maintain',  async function (req, res, next) {
   console.log("Call MPI_Detail_Maintain Api:",req.body);

   // req.body.Mode === 0 表示將Stock Out 加入 MPI
   // req.body.Mode === 1 表示將Stock Out 移出 MPI
   // req.body.Mode === 2 表示產生MPI_Detail
   // req.body.Mode === 3 表示修改MPI_Detail
   // req.body.Mode === 4 表示刪除MPI_Detail
   var Size = 0;
   req.body.MPI_No = req.body.MPI_No ? `N'${req.body.MPI_No.trim().substring(0,13).replace(/'/g, '')}'` : `''`;
   req.body.MPI_DetailID = req.body.MPI_DetailID ? req.body.MPI_DetailID : null;
   req.body.Mode = req.body.Mode ? req.body.Mode : 0;
   
   var strSQL = format(`Declare @Mode int = {Mode}, @MPI_No varchar(13) = {MPI_No}, @MPI_DetailID int = {MPI_DetailID}
   , @ROWCOUNT int = 0, @ROWCOUNT1 int = 0, @ROWCOUNT2 int = 0, @ROWCOUNT3 int = 0

   `, req.body);

   switch(req.body.Mode){
      case 0:
         req.body.Detail = req.body.Detail ? req.body.Detail : [];

         strSQL += format(`   
         BEGIN TRANSACTION;
         BEGIN TRY 
            Update [dbo].[Stock_Out] set MPI_No = @MPI_No
            Where Stock_Out_No in ('${req.body.Detail.join("','")}')

            Set @ROWCOUNT = @@ROWCOUNT;

            if(@ROWCOUNT > 0)
            Begin
               Update MPI Set MTR_Declare_Rate = iif(isnull(MTR_Declare_Rate,0) <> 0, MTR_Declare_Rate, (Select Max(MTR_Declare_Rate) From Stock_Out so Inner Join Purchase_Project pp on pp.Purchase_Project_No = so.Purchase_Project_No Where so.MPI_No = @MPI_No)  )
               Where MPI_No = @MPI_No

               Set @ROWCOUNT1 = @@ROWCOUNT;
            End

         COMMIT;
         END TRY
         BEGIN CATCH
            Set @ROWCOUNT = 0;
            ROLLBACK;
         END CATCH      
         `, req.body);
      break;
      case 1:
         req.body.Stock_Out_No = req.body.Stock_Out_No ? req.body.Stock_Out_No : 0;

         strSQL += format(`
         BEGIN TRANSACTION;
         BEGIN TRY 
            Update [dbo].[Stock_Out] Set [MPI_No] = null
            Where Stock_Out_No = {Stock_Out_No};

            Set @ROWCOUNT = @@ROWCOUNT;
         COMMIT;
         END TRY
         BEGIN CATCH
            Set @ROWCOUNT = 0;
            ROLLBACK;
         END CATCH
         `, req.body);
      break;
      case 2:
         req.body.Import_Mode = req.body.Import_Mode != null ? req.body.Import_Mode : 0;

         strSQL += format(`
         Declare @Import_Mode int = {Import_Mode}, @OrganizationID varchar(20), @RndSerial varchar(20), @RecNo int = 0, @MPI_Date Date, @Region nvarchar(50);
         Declare @tmpTable table(RecNo int IDENTITY(1,1), MPI_DetailID int)

         Select @MPI_Date = [Date], @Region = Region From [MPI] m with(NoLock,NoWait) Where m.MPI_No = @MPI_No;

         Select @OrganizationID = OrganizationID From [Control];

         BEGIN TRANSACTION;
         BEGIN TRY 
            Delete FROM [dbo].[MPI_Detail] 
            where MPI_No = @MPI_No;
            
            --Import by Group
            if(@Import_Mode = 0)
            Begin
               INSERT INTO MPI_Detail ( MPI_No, CCC_CodeID, CCC_Code, Description, Unit, Unit_Price, Qty, Min_Price, Max_Price ) 
               SELECT so.MPI_No
               , cc.CCC_CodeID
               , cc.CCC_Code
               , cc.Description
               , cc.Unit
               , iif( SUM(sod.Charge_Qty) = 0, 0,SUM(sod.Charge_Qty * sod.Unit_Price * cr.Currency_Rate) / SUM(sod.Charge_Qty)) AS Unit_Price 
               , SUM(sod.Charge_Qty) AS Qty
               , MIN(sod.Unit_Price * cr.Currency_Rate) AS Min_Price
               , MAX(sod.Unit_Price * cr.Currency_Rate) AS Max_Price
               FROM dbo.Stock_Out so with(NoLock,NoWait) 
               INNER JOIN dbo.Stock_Out_Detail sod with(NoLock,NoWait) ON sod.Stock_Out_No = so.Stock_Out_No 
               INNER JOIN dbo.Material_CCC_Code mcc with(NoLock,NoWait) ON sod.MaterialID = mcc.MaterialID
               INNER JOIN dbo.CCC_Code cc with(NoLock,NoWait) ON mcc.CCC_CodeID = cc.CCC_CodeID And cc.Region = @Region
               INNER JOIN dbo.[@Currency_Rate] cr with(NoLock,NoWait) ON sod.Currency = cr.Currency And cast(cr.Exchange_Date as Date) = @MPI_Date
               Where so.MPI_No = @MPI_No
               GROUP BY so.MPI_No, cc.CCC_CodeID, cc.CCC_Code, cc.Description, cc.Unit;

               Set @ROWCOUNT = @@ROWCOUNT;

               UPDATE Stock_Out_Detail Set MPI_DetailID = md.MPI_DetailID
               FROM Stock_Out so
               INNER JOIN Stock_Out_Detail sod on so.Stock_Out_No = sod.Stock_Out_No
               INNER JOIN Material_CCC_Code mcc on mcc.MaterialID = sod.MaterialID
               INNER JOIN MPI_Detail md ON md.CCC_CodeID = mcc.CCC_CodeID And md.MPI_No = @MPI_No
               Where so.MPI_No = @MPI_No;

               Set @ROWCOUNT1 = @@ROWCOUNT;
            End

            --Import by Specific
            if(@Import_Mode = 1)
            Begin
               INSERT INTO MPI_Detail ( MPI_No, CCC_CodeID, CCC_Code, Description, Unit, Unit_Price, Qty, Min_Price, Max_Price ) 
               SELECT so.MPI_No 
               , cc.CCC_CodeID
               , cc.CCC_Code
               , cast(sod.MaterialID as varchar) + ' ' + cast(sod.Material_DetailID as varchar) AS Description
               , m.Unit
               , iif( SUM(sod.Charge_Qty) = 0, 0,SUM(sod.Charge_Qty * sod.Unit_Price * cr.Currency_Rate) / SUM(sod.Charge_Qty)) AS Unit_Price                
               , SUM(sod.Charge_Qty) AS Qty
               , MIN(sod.Unit_Price * cr.Currency_Rate) AS Min_Price
               , MAX(sod.Unit_Price * cr.Currency_Rate) AS Max_Price
               FROM dbo.Stock_Out so with(NoLock,NoWait)
               Inner Join dbo.Stock_Out_Detail sod with(NoLock,NoWait) ON sod.Stock_Out_No = so.Stock_Out_No 
               INNER JOIN dbo.Material_CCC_Code mcc with(NoLock,NoWait) ON sod.MaterialID = mcc.MaterialID
               INNER JOIN dbo.Material m ON sod.MaterialID = m.MaterialID
               INNER JOIN dbo.CCC_Code cc with(NoLock,NoWait) ON mcc.CCC_CodeID = cc.CCC_CodeID And cc.Region = @Region
               INNER JOIN dbo.[@Currency_Rate] cr with(NoLock,NoWait) ON sod.Currency = cr.Currency And cast(cr.Exchange_Date as Date) = @MPI_Date
               Where so.MPI_No = @MPI_No
               GROUP BY so.MPI_No, cc.CCC_CodeID, cc.CCC_Code, cast(sod.MaterialID as varchar) + ' ' + cast(sod.Material_DetailID as varchar), m.Unit
               , sod.Material_Category + sod.Material_Specific;

               Set @ROWCOUNT = @@ROWCOUNT;

               UPDATE Stock_Out_Detail Set MPI_DetailID = md.MPI_DetailID
               FROM Stock_Out so
               Inner Join Stock_Out_Detail sod on so.Stock_Out_No = sod.Stock_Out_No
               Inner Join MPI_Detail md on md.Description = cast(sod.MaterialID as varchar) + ' ' + cast(sod.Material_DetailID as varchar) And md.MPI_No = @MPI_No
               Where so.MPI_No = @MPI_No;

               Set @ROWCOUNT1 = @@ROWCOUNT;

               Update MPI_Detail set Description = cc.Description
               From MPI_Detail md
               Inner Join CCC_Code cc on md.CCC_CodeID = cc.CCC_CodeID And cc.Region = @Region
               Where md.MPI_No = @MPI_No;

               Set @ROWCOUNT2 = @@ROWCOUNT;
            End

            --Import by Detail
            if(@Import_Mode = 2)
            Begin
               INSERT INTO MPI_Detail ( MPI_No, CCC_CodeID, CCC_Code, Description, Unit, Unit_Price, Qty, Min_Price, Max_Price ) 
               SELECT so.MPI_No 
               , sod.Stock_Out_DetailID as CCC_CodeID
               , cc.CCC_Code
               , isnull(sod.Material_Category,'') + ' ' + isnull(sod.Material_Specific,'') + ' ' + isnull(sod.Material_Color,'') AS Description
               , m.Unit
               , iif( SUM(sod.Charge_Qty) = 0, 0,SUM(sod.Charge_Qty * sod.Unit_Price * cr.Currency_Rate) / SUM(sod.Charge_Qty)) AS Unit_Price                
               , SUM(sod.Charge_Qty) AS Qty
               , MIN(sod.Unit_Price * cr.Currency_Rate) AS Min_Price
               , MAX(sod.Unit_Price * cr.Currency_Rate) AS Max_Price
               FROM dbo.Stock_Out so with(NoLock,NoWait) 
               Inner Join dbo.Stock_Out_Detail sod with(NoLock,NoWait) ON sod.Stock_Out_No = so.Stock_Out_No 
               INNER JOIN dbo.Material_CCC_Code mcc with(NoLock,NoWait) ON sod.MaterialID = mcc.MaterialID
               INNER JOIN dbo.Material m ON sod.MaterialID = m.MaterialID
               INNER JOIN dbo.CCC_Code cc with(NoLock,NoWait) ON mcc.CCC_CodeID = cc.CCC_CodeID And cc.Region = @Region
               INNER JOIN dbo.[@Currency_Rate] cr with(NoLock,NoWait) ON sod.Currency = cr.Currency And cast(cr.Exchange_Date as Date) = @MPI_Date
               Where so.MPI_No = @MPI_No
               GROUP BY so.MPI_No, sod.Stock_Out_DetailID, cc.CCC_Code, isnull(sod.Material_Category,'') + ' ' + isnull(sod.Material_Specific,'') + ' ' + isnull(sod.Material_Color,''), m.Unit
               , sod.Material_Category + sod.Material_Specific;

               Set @ROWCOUNT = @@ROWCOUNT;

               UPDATE Stock_Out_Detail Set MPI_DetailID = md.MPI_DetailID
               FROM Stock_Out_Detail sod 
               INNER JOIN MPI_Detail md ON md.CCC_CodeID = sod.Stock_Out_DetailID And md.MPI_No = @MPI_No;

               Set @ROWCOUNT1 = @@ROWCOUNT;

               Update MPI_Detail set CCC_CodeID = cc.CCC_CodeID
               From MPI_Detail md
               INNER JOIN Stock_Out_Detail sod on md.MPI_DetailID = sod.MPI_DetailID
               INNER JOIN Material_CCC_Code mcc on mcc.MaterialID = sod.MaterialID
               Inner Join CCC_Code cc on mcc.CCC_CodeID = cc.CCC_CodeID And cc.Region = @Region
               Where md.MPI_No = @MPI_No;

               Set @ROWCOUNT2 = @@ROWCOUNT;
            End
            
            Insert @tmpTable (MPI_DetailID)
            Select MPI_DetailID
            From MPI_Detail md with(NoLock,NoWait)
            Where md.MPI_No = @MPI_No;
            
            Set @RecNo = (Select Count(*) From @tmpTable)
            While(@RecNo >0)
            Begin
               Select @MPI_DetailID = MPI_DetailID 
               , @RndSerial = ' (#' + @OrganizationID + Left(cast(Rand() * 10000000 as int),4) + ')'
               From @tmpTable Where RecNo = @RecNo

               Update MPI_Detail set Description = Description + @RndSerial
               Where MPI_DetailID = @MPI_DetailID
               
               Set @RecNo = @RecNo -1
            End

         COMMIT;
         END TRY
         BEGIN CATCH
            Select @ROWCOUNT = 0, @ROWCOUNT1 = 0, @ROWCOUNT2 = 0, @ROWCOUNT3 = 0;
            ROLLBACK;
         END CATCH            
         `, req.body);
      break;
      case 3:
            switch(req.body.Name){
            case 'CCC_Code':
               Size = 13;
            break;
            case 'Description':
               Size = 100;
            break;
            case 'Unit':
               Size = 10;
            break;
            default:
            break;
         }
         req.body.Value = Size == 0 ? (req.body.Value != null ? req.body.Value : null) : (req.body.Value ? `N'${req.body.Value.trim().replace(/'/g, "''")}'` : `''`);
      
         strSQL += format(`
         BEGIN TRANSACTION;
         BEGIN TRY 

            Update MPI_Detail set [{Name}] = ${(Size == 0 ? '{Value}': `substring({Value},1,${Size})`)}
            Where MPI_DetailID = @MPI_DetailID;
            
            Set @ROWCOUNT = @@ROWCOUNT;
            
         COMMIT;
         END TRY
         BEGIN CATCH
            Select @ROWCOUNT = 0, @ROWCOUNT1 = 0;
            ROLLBACK;
         END CATCH 
         `, req.body);
      break;
      case 4:
         strSQL += format(`
         BEGIN TRANSACTION;
         BEGIN TRY 

            Update Stock_Out_Detail set MPI_DetailID = null
            Where MPI_DetailID = @MPI_DetailID;
            
            Set @ROWCOUNT = @@ROWCOUNT;

            Delete FROM [dbo].[MPI_Detail] 
            where MPI_DetailID = @MPI_DetailID;
            
            Set @ROWCOUNT1 = @@ROWCOUNT;
            
         COMMIT;
         END TRY
         BEGIN CATCH
            Select @ROWCOUNT = 0, @ROWCOUNT1 = 0;
            ROLLBACK;
         END CATCH 
         `, req.body);
      break;
   }

   strSQL += format(`
   Select @ROWCOUNT + @ROWCOUNT1 + @ROWCOUNT2 + @ROWCOUNT3 as Flag,  @MPI_DetailID as MPI_DetailID;

    if((@ROWCOUNT + @ROWCOUNT1 + @ROWCOUNT2 + @ROWCOUNT3) > 0)
    Begin
      Update [dbo].[MPI] Set Data_Updater = '${req.UserID}'
      , Data_Update = GetDate()
      where MPI_No = @MPI_No;   
    End

   if((@Mode=0 And @ROWCOUNT1 > 0) 
      or (@Mode=2 And (@ROWCOUNT + @ROWCOUNT1 + @ROWCOUNT2 + @ROWCOUNT3) > 0) 
      or (@Mode=3 And ('{Name}'='Qty' or '{Name}'='Unit_Price') And (@ROWCOUNT + @ROWCOUNT1 + @ROWCOUNT2 + @ROWCOUNT3) > 0) 
      or (@Mode=4 And (@ROWCOUNT + @ROWCOUNT1 + @ROWCOUNT2 + @ROWCOUNT3) > 0)) 
   Begin
      ${Update_SQL}
   End

   `, req.body);
   //console.log(strSQL)

   await db.sql(req.SiteDB, strSQL)
      .then((result) => {
         //console.log(result.recordsets)
         var DataSet = {Flag: result.recordsets[0][0].Flag > 0
            , MPI_DetailID: result.recordsets[0][0].MPI_DetailID
         };
         res.send(DataSet)
      }).catch((err) => {
         console.log(err);
         res.status(500).send(err);   
      })   
});

 //Get MPI_Detail_Material_Info
 router.post('/MPI_Detail_Material_Info',  function (req, res, next) {
   console.log("Call MPI_Detail_Material_Info Api:",req.body);
 
   req.body.MPI_No = req.body.MPI_No ? `N'${req.body.MPI_No.trim().substring(0,13).replace(/'/g, '')}'` : `''`;
   req.body.MPI_DetailID = req.body.MPI_DetailID ? req.body.MPI_DetailID : null;
   req.body.Mode = req.body.Mode ? req.body.Mode : 0;

   //Mode == 0 Get MPI_Detail, Stock_Out_Detail and Stock_Out_Detail without MPI_DetailID
   //Mode == 1 Get MPI_Detail Data
   //Mode == 2 Get Stock_Out_Detail Data
   //Mode == 3 Get Stock_Out_Detail without MPI_DetailID
   //Mode == 4 Get currency_Info
      
   var strSQL = format(`
   Declare @Mode int = {Mode}, @MPI_No Varchar(13) = {MPI_No}, @MPI_DetailID int = {MPI_DetailID}, @Local_Currency varchar(5);
   Declare @Price_Range float, @Date Date, @Region nvarchar(50);
   Declare @tmpCurrency table (Currency varchar(5), Currency_Rate float, Exchange_Date DateTime)

   Select @Price_Range = Price_Range
   , @Date = m.Date
   , @Region = Region
   From MPI m with(NoLock,NoWait) 
   Where m.MPI_No = @MPI_No;

   Select @Local_Currency = isnull(Local_Currency,'TWD') From Control 

   if(@Mode = 0 or @Mode = 2 or @Mode = 3 or @Mode = 4)
   Begin
      insert @tmpCurrency
      Select c.Currency, c.Currency_Rate, c.Exchange_Date
      From dbo.[@Currency_Rate] c with(NoLock,NoWait)
      Where cast(c.Exchange_Date as Date) = @Date;
   End
 
   if(@Mode = 0 or @Mode = 1)
   Begin
      SELECT pd.MPI_DetailID
      , isnull(pd.CCC_CodeID, 0) as CCC_CodeID
      , isnull(pd.CCC_Code, '') as CCC_Code
      , isnull(pd.Description, '') as Description
      , isnull(pd.Qty, 0) as Qty
      , isnull(pd.Unit, '') as Unit      
      , Round(isnull(pd.Unit_Price, 0),3) as Unit_Price
      , Round(isnull(pd.Max_Price, 0),3) as Max_Price
      , Round(isnull(pd.Min_Price, 0),3) as Min_Price
      , case when (Round(isnull(pd.Max_Price, 0),3) - Round(isnull(pd.Min_Price, 0),3)) > Round(isnull(@Price_Range,0),3) And isnull(@Price_Range,0) <> 0 
         then 1 else 0 end as Unit_Price_Flag
      , @Local_Currency as Local_Currency
      , @Price_Range as Price_Range
      FROM MPI_Detail pd WITH(NoLock, NoWait) 
      WHERE pd.MPI_DetailID = @MPI_DetailID;
   End
   if(@Mode = 0 or @Mode = 2)
   Begin
      SELECT so.Purchase_Project_No
      , sod.MPI_DetailID
      , sod.Stock_Out_DetailID
      , sod.Stock_Out_No
      , sod.Material_Category
      , sod.Material_Specific
      , sod.Material_Color
      , isnull(sod.Material_Category,'') + ' ' + isnull(sod.Material_Specific,'') + ' ' + isnull(sod.Material_Color,'')  as Material
      , sod.Purchase_DetailID
      , sod.Unit_Price
      , isnull(sod.Unit_Price,0) * isnull(sod.Charge_Qty,0) as Amount
      , sod.Unit
      , isnull(sod.Charge_Qty,0) AS Qty
      , sod.Currency
      , case when sod.Currency <> @Local_Currency then 1 else 0 End as Currency_Flag
      , isnull(sod.Unit_Price,0) * cr.Currency_Rate as Local_Unint_Price
      , isnull(sod.Unit_Price,0) * cr.Currency_Rate * isnull(sod.Charge_Qty,0) as Local_Amount
      , cr.Exchange_Date
      , cr.Currency_Rate AS Detail_Exchange_Rate
      FROM Stock_Out_Detail sod with(NoLock,NoWait)
      INNER JOIN Stock_Out so with(NoLock,NoWait) on sod.Stock_Out_No = so.Stock_Out_No 
      INNER JOIN @tmpCurrency cr ON sod.Currency = cr.Currency 
      WHERE sod.MPI_DetailID = @MPI_DetailID
   End
   if(@Mode = 0 or @Mode = 3)
   Begin
      SELECT so.Purchase_Project_No
      , sod.Stock_Out_No
      , sod.MPI_DetailID
      , sod.Stock_Out_DetailID
      , sod.Material_Category
      , sod.Material_Specific
      , sod.Material_Color
      , isnull(sod.Material_Category,'') + ' ' + isnull(sod.Material_Specific,'') + ' ' + isnull(sod.Material_Color,'')  as Material
      , sod.Purchase_DetailID
      , sod.Unit_Price
      , isnull(sod.Unit_Price,0) * isnull(sod.Charge_Qty,0) as Amount
      , sod.Unit
      , isnull(sod.Charge_Qty,0) AS Qty
      , sod.Currency
      , case when sod.Currency <> @Local_Currency then 1 else 0 End as Currency_Flag
      , isnull(sod.Unit_Price,0) * cr.Currency_Rate as Local_Unint_Price
      , isnull(sod.Unit_Price,0) * cr.Currency_Rate * isnull(sod.Charge_Qty,0) as Local_Amount
      , cr.Exchange_Date
      , cr.Currency_Rate AS Detail_Exchange_Rate
      FROM Stock_Out_Detail sod with(NoLock,NoWait)
      INNER JOIN Stock_Out so with(NoLock,NoWait) on sod.Stock_Out_No = so.Stock_Out_No 
      INNER JOIN @tmpCurrency cr ON sod.Currency = cr.Currency
      --left outer JOIN dbo.Material_CCC_Code mcc with(NoLock,NoWait) ON sod.MaterialID = mcc.MaterialID
      --left outer JOIN dbo.CCC_Code cc with(NoLock,NoWait) ON mcc.CCC_CodeID = cc.CCC_CodeID And cc.Region = @Region
      WHERE so.MPI_No = @MPI_No
      AND sod.MPI_DetailID Is Null;
   End
   if(@Mode = 0 or @Mode = 4)
   Begin
      Select c.Currency, c.Currency_Rate
      From @tmpCurrency c;
   End

   `, req.body) ;
   //console.log(strSQL)
   db.sql(req.SiteDB, strSQL)
      .then((result) => {
         var DataSet = {MPI_Detail_Info: (req.body.Mode == 0 || req.body.Mode == 1) ? result.recordsets[0] : []
           , Stock_Out_Detail_Info: (req.body.Mode == 0) ? result.recordsets[1] : (req.body.Mode == 2 ? result.recordsets[0] : [])
           , Stock_Out_Detail_UnGroup_Info: (req.body.Mode == 0) ? result.recordsets[2] : (req.body.Mode == 3 ? result.recordsets[0] : [])
           , currency_Info: (req.body.Mode == 0) ? result.recordsets[3] : (req.body.Mode == 4 ? result.recordsets[0] : [])
           , Stock_Out_Detail_Total: { Qty:0, Amount:0, Local_Amount:0, Local_Unit_Price:0}
           , Stock_Out_Detail_UnGroup_Total: { Qty:0, Amount:0, Local_Amount:0, Local_Unit_Price:0}
        };

        DataSet.MPI_Detail_Info.forEach((item,idx) => {
         item.Qty = Math.round((item.Qty)*1000)/1000;
         item.Max_Price = Math.round((item.Max_Price)*1000)/1000;
         item.Min_Price = Math.round((item.Min_Price)*1000)/1000;
         item.Unit_Price = Math.round((item.Unit_Price)*1000)/1000;
        });        
        
        DataSet.Stock_Out_Detail_Info.forEach((item,idx) => {
         DataSet.Stock_Out_Detail_Total.Qty += item.Qty;
         DataSet.Stock_Out_Detail_Total.Amount += item.Amount;
         DataSet.Stock_Out_Detail_Total.Local_Amount += item.Local_Amount;

         item.Qty = Math.round((item.Qty)*1000)/1000;
         item.Amount = Math.round((item.Amount)*1000)/1000;
         item.Local_Amount = Math.round((item.Local_Amount)*1000)/1000;
        });

        DataSet.Stock_Out_Detail_Total.Local_Unit_Price = (DataSet.Stock_Out_Detail_Total.Qty) > 0 ? (DataSet.Stock_Out_Detail_Total.Local_Amount) / (DataSet.Stock_Out_Detail_Total.Qty) : 0;

        DataSet.Stock_Out_Detail_Total.Qty = Math.round((DataSet.Stock_Out_Detail_Total.Qty)*1000)/1000;
        DataSet.Stock_Out_Detail_Total.Amount = Math.round((DataSet.Stock_Out_Detail_Total.Amount)*1000)/1000;
        DataSet.Stock_Out_Detail_Total.Local_Amount = Math.round((DataSet.Stock_Out_Detail_Total.Local_Amount)*1000)/1000;
        DataSet.Stock_Out_Detail_Total.Local_Unit_Price = Math.round((DataSet.Stock_Out_Detail_Total.Local_Unit_Price)*1000)/1000;
        
        DataSet.Stock_Out_Detail_UnGroup_Info.forEach((item,idx) => {
            DataSet.Stock_Out_Detail_UnGroup_Total.Qty += item.Qty;
            DataSet.Stock_Out_Detail_UnGroup_Total.Amount += item.Amount;
            DataSet.Stock_Out_Detail_UnGroup_Total.Local_Amount += item.Local_Amount;

            item.Qty = Math.round((item.Qty)*1000)/1000;
            item.Amount = Math.round((item.Amount)*1000)/1000;
            item.Local_Amount = Math.round((item.Local_Amount)*1000)/1000;
        });

        DataSet.Stock_Out_Detail_UnGroup_Total.Local_Unit_Price = (DataSet.Stock_Out_Detail_UnGroup_Total.Qty) > 0 ? (DataSet.Stock_Out_Detail_UnGroup_Total.Local_Amount) / (DataSet.Stock_Out_Detail_UnGroup_Total.Qty) : 0;

        DataSet.Stock_Out_Detail_UnGroup_Total.Qty = Math.round((DataSet.Stock_Out_Detail_UnGroup_Total.Qty)*1000)/1000;
        DataSet.Stock_Out_Detail_UnGroup_Total.Amount = Math.round((DataSet.Stock_Out_Detail_UnGroup_Total.Amount)*1000)/1000;
        DataSet.Stock_Out_Detail_UnGroup_Total.Local_Amount = Math.round((DataSet.Stock_Out_Detail_UnGroup_Total.Local_Amount)*1000)/1000;
        DataSet.Stock_Out_Detail_UnGroup_Total.Local_Unit_Price = Math.round((DataSet.Stock_Out_Detail_UnGroup_Total.Local_Unit_Price)*1000)/1000;

        //console.log(DataSet)
        res.send(DataSet);
      }).catch((err) => {
         console.log(err);
         res.status(500).send(err);
      })
});

//Maintain MPI_Detail_Material_Maintain
router.post('/MPI_Detail_Material_Maintain',  async function (req, res, next) {
   console.log("Call MPI_Detail_Material_Maintain Api:",req.body);

   // req.body.Mode === 0 表示複製MPI Detail
   // req.body.Mode === 1 表示將Stock Out Detail 移出 MPI_Detail
   // req.body.Mode === 2 表示將Stock Out Detail 加入 MPI_Detail
   var Size = 0;
   req.body.MPI_No = req.body.MPI_No ? `N'${req.body.MPI_No.trim().substring(0,13).replace(/'/g, '')}'` : `''`;
   req.body.MPI_DetailID = req.body.MPI_DetailID ? req.body.MPI_DetailID : null;
   req.body.Stock_Out_No = req.body.Stock_Out_No ? req.body.Stock_Out_No : null;
   req.body.Stock_Out_DetailID = req.body.Stock_Out_DetailID ? req.body.Stock_Out_DetailID : null;
   req.body.Mode = req.body.Mode ? req.body.Mode : 0;
   
   var strSQL = format(`Declare @Mode int = {Mode}, @MPI_No varchar(13) = {MPI_No}, @MPI_DetailID int = {MPI_DetailID}
   , @ROWCOUNT int = 0, @ROWCOUNT1 int = 0, @ROWCOUNT2 int = 0, @ROWCOUNT3 int = 0

   `, req.body);

   switch(req.body.Mode){
      case 0:
         strSQL += format(`   
         BEGIN TRANSACTION;
         BEGIN TRY 

            Insert MPI_Detail (MPI_No, CCC_CodeID, CCC_Code, Description, Unit, Qty, Max_Price, Min_Price, OrigID)
            Select m.MPI_No
            , cc.CCC_CodeID
            , cc.CCC_Code
            , isnull(cc.Description,'') + ' (#' + (Select isnull(OrganizationID,'') From Control) + Left(cast(Rand() * 10000000 as int),4) + ')' as Description
            , md.Unit
            , 0 as Qty
            , 0 as Max_Price
            , 0 as Min_Price
            , {MPI_DetailID} as OrigID
            From [dbo].[MPI_Detail] md with(NoLock,NoWait)
            Inner Join MPI m with(NoLock,NoWait) on m.MPI_No = md.MPI_No
            INNER JOIN dbo.CCC_Code cc with(NoLock,NoWait) ON md.CCC_CodeID = cc.CCC_CodeID And cc.Region = m.Region
            Where md.MPI_DetailID = {MPI_DetailID};

            Set @MPI_DetailID = scope_identity();

            Set @ROWCOUNT = @@ROWCOUNT;

         COMMIT;
         END TRY
         BEGIN CATCH
            Set @ROWCOUNT = 0;
            ROLLBACK;
         END CATCH      
         `, req.body);
      break;
      case 1:
         strSQL += format(`
         BEGIN TRANSACTION;
         BEGIN TRY 
            Update [dbo].[Stock_Out_Detail] Set [MPI_DetailID] = null
            Where Stock_Out_DetailID = {Stock_Out_DetailID};

            Set @ROWCOUNT = @@ROWCOUNT;

            if(@ROWCOUNT > 0)
            Begin
               Update MPI_Detail set Unit_Price = tmp.Unit_Price
               , Qty = tmp.Qty
               , Min_Price = tmp.Min_Price
               , Max_Price = tmp.Max_Price
               From MPI_Detail md
               Left Outer Join (
                  SELECT sod.MPI_DetailID
                  , SUM(sod.Charge_Qty * sod.Unit_Price * cr.Currency_Rate) / SUM(sod.Charge_Qty) AS Unit_Price
                  , SUM(sod.Charge_Qty) AS Qty
                  , MIN(sod.Unit_Price * cr.Currency_Rate) AS Min_Price
                  , MAX(sod.Unit_Price * cr.Currency_Rate) AS Max_Price
                  FROM MPI m with(NoLock, NoWait)
                  Inner Join dbo.Stock_Out so with(NoLock,NoWait) on  m.MPI_No = so.MPI_No
                  INNER JOIN dbo.Stock_Out_Detail sod with(NoLock,NoWait) ON sod.Stock_Out_No = so.Stock_Out_No 
                  INNER JOIN dbo.[@Currency_Rate] cr with(NoLock,NoWait) ON sod.Currency = cr.Currency And cast(cr.Exchange_Date as Date) = cast(m.[Date] as Date)
                  Where sod.MPI_DetailID = @MPI_DetailID
                  Group by sod.MPI_DetailID
               ) tmp on tmp.MPI_DetailID = md.MPI_DetailID
               Where md.MPI_DetailID = @MPI_DetailID;

               Set @ROWCOUNT1 = @@ROWCOUNT;
            End

         COMMIT;
         END TRY
         BEGIN CATCH
            Select @ROWCOUNT = 0, @ROWCOUNT1 = 0;
            ROLLBACK;
         END CATCH
         `, req.body);
      break;
      case 2:
         strSQL += format(`
         BEGIN TRANSACTION;
         BEGIN TRY 
            Update [dbo].[Stock_Out_Detail] Set [MPI_DetailID] = @MPI_DetailID
            Where Stock_Out_DetailID = {Stock_Out_DetailID};

            Set @ROWCOUNT = @@ROWCOUNT;

            if(@ROWCOUNT > 0)
            Begin
               Update MPI_Detail set Unit_Price = tmp.Unit_Price
               , Qty = tmp.Qty
               , Min_Price = tmp.Min_Price
               , Max_Price = tmp.Max_Price
               From MPI_Detail md
               Left Outer Join (
                  SELECT sod.MPI_DetailID
                  , SUM(sod.Charge_Qty * sod.Unit_Price * cr.Currency_Rate) / SUM(sod.Charge_Qty) AS Unit_Price
                  , SUM(sod.Charge_Qty) AS Qty
                  , MIN(sod.Unit_Price * cr.Currency_Rate) AS Min_Price
                  , MAX(sod.Unit_Price * cr.Currency_Rate) AS Max_Price
                  FROM MPI m with(NoLock, NoWait)
                  Inner Join dbo.Stock_Out so with(NoLock,NoWait) on  m.MPI_No = so.MPI_No
                  INNER JOIN dbo.Stock_Out_Detail sod with(NoLock,NoWait) ON sod.Stock_Out_No = so.Stock_Out_No 
                  INNER JOIN dbo.[@Currency_Rate] cr with(NoLock,NoWait) ON sod.Currency = cr.Currency And cast(cr.Exchange_Date as Date) = cast(m.[Date] as Date)
                  Where sod.MPI_DetailID = @MPI_DetailID
                  Group by sod.MPI_DetailID
               ) tmp on tmp.MPI_DetailID = md.MPI_DetailID
               Where md.MPI_DetailID = @MPI_DetailID;

               Set @ROWCOUNT1 = @@ROWCOUNT;
            End

         COMMIT;
         END TRY
         BEGIN CATCH
            Select @ROWCOUNT = 0, @ROWCOUNT1 = 0;
            ROLLBACK;
         END CATCH
         `, req.body);
      break;

   }

   strSQL += format(`
   Select @ROWCOUNT + @ROWCOUNT1 + @ROWCOUNT2 + @ROWCOUNT3 as Flag,  @MPI_DetailID as MPI_DetailID;

   if(@Mode=1 or @Mode=2) And (@ROWCOUNT + @ROWCOUNT1 + @ROWCOUNT2 + @ROWCOUNT3) > 0
   Begin
      ${Update_SQL}
   End

   `, req.body);
   //console.log(strSQL)

   await db.sql(req.SiteDB, strSQL)
      .then((result) => {
         //console.log(result.recordsets)
         var DataSet = {Flag: result.recordsets[0][0].Flag > 0
            , MPI_DetailID: result.recordsets[0][0].MPI_DetailID
         };
         res.send(DataSet)
      }).catch((err) => {
         console.log(err);
         res.status(500).send(err);   
      })   
});

 //Get MPI_Combine_Packages_Info
 router.post('/MPI_Combine_Packages_Info',  function (req, res, next) {
   console.log("Call MPI_Combine_Packages_Info Api:",req.body);
 
   req.body.MPI_No = req.body.MPI_No ? `N'${req.body.MPI_No.trim().substring(0,13).replace(/'/g, '')}'` : `''`;
   req.body.Mode = req.body.Mode ? req.body.Mode : 0;

   //Mode == 0 Get Source_Supplier_Package and MPI_Combine_Package And Pending_Packages And Packing_Unit_Sum And Packing_Unit_Error
   //Mode == 1 Get Source_Supplier_Package
   //Mode == 2 Get MPI_Combine_Package 
   //Mode == 3 Get Pending_Packages
   //Mode == 4 Get Packing_Unit_Sum
   //Mode == 5 Get Packing_Unit_Error
      
   var strSQL = format(`
   Declare @Mode int = {Mode}, @MPI_No Varchar(13) = {MPI_No};
   Declare @tmpStock_Out table (Stock_Out_No int)
   Declare @tmpStock_Out_Package table (Stock_Out_PackageID int, Stock_Out_No int, Packing_No varchar(15), Packing_Qty int, Packing_Unit varchar(10))

   Insert @tmpStock_Out (Stock_Out_No)
   Select so.Stock_Out_No
   From Stock_Out so with(NoLock,NoWait) 
   Where so.MPI_No = @MPI_No;

   Insert @tmpStock_Out_Package (Stock_Out_PackageID, Stock_Out_No, Packing_No, Packing_Qty, Packing_Unit)
   Select sog.Stock_Out_PackageID, so.Stock_Out_No, sog.Packing_No, sog.Packing_Qty, sog.Packing_Unit 
   From @tmpStock_Out so 
   Inner Join Stock_Out_Package sog on so.Stock_Out_No = sog.Stock_Out_No;

   --Source_Supplier_Package
   if(@Mode = 0 or @Mode = 1)
   Begin
      SELECT Sum(([Rec_Count]-1)) AS Combine
      , Sum(Pkgs) AS Pkgs
      , SupplierID
      , Sum(Rec_Count) AS Recs
      FROM (
         SELECT sop.Packing_Qty AS Pkgs
         , pd.SupplierID
         , Count(sod.Stock_Out_DetailID) AS Rec_Count
         , sop.Packing_No
         FROM @tmpStock_Out_Package sop 
         INNER JOIN Stock_Out_Detail_Packing sodp with(NoLock, NoWait) ON sodp.Stock_Out_PackageID = sop.Stock_Out_PackageID 
         INNER JOIN Stock_Out_Detail sod with(NoLock, NoWait) ON sodp.Stock_Out_DetailID = sod.Stock_Out_DetailID And sop.Stock_Out_No = sod.Stock_Out_No
         LEFT JOIN Purchase_Detail pd with(NoLock, NoWait) ON sod.Purchase_DetailID = pd.Purchase_DetailID
         GROUP BY sop.Packing_Qty, pd.SupplierID, sop.Packing_No
      ) as tmp
      GROUP BY SupplierID
      ORDER BY Sum(([Rec_Count]-1)) DESC , Sum(Pkgs) DESC;
   End

   --MPI_Combine_Package  
   if(@Mode = 0 or @Mode = 2)
   Begin
      SELECT MPI_Combine_Package_PK_Material.Rec_Material
      , MPI_Combine_Package_PK_Supplier.Rec_Supplier
      , sop.Packing_No
      , sop.Packing_Qty
      , sop.Packing_Unit
      , Count(sodp.Stock_Out_DetailID) AS Rec_Count
      FROM @tmpStock_Out_Package sop
      LEFT JOIN Stock_Out_Detail_Packing sodp with(NoLock, NoWait) ON sodp.Stock_Out_PackageID = sop.Stock_Out_PackageID
      LEFT JOIN (
         SELECT tmp1.Packing_No, Count(tmp1.Rec_Material) AS Rec_Material
         FROM (
               SELECT sop.Packing_No, sod.Material_Category AS Rec_Material
               FROM @tmpStock_Out_Package sop 
               INNER JOIN Stock_Out_Detail_Packing sodp with(NoLock, NoWait) ON sodp.Stock_Out_PackageID = sop.Stock_Out_PackageID 
               INNER JOIN Stock_Out_Detail sod with(NoLock, NoWait) ON sodp.Stock_Out_DetailID = sod.Stock_Out_DetailID And sop.Stock_Out_No = sod.Stock_Out_No
               GROUP BY sop.Packing_No, sod.Material_Category
            ) AS tmp1
         GROUP BY tmp1.Packing_No
      ) as MPI_Combine_Package_PK_Material ON sop.Packing_No = MPI_Combine_Package_PK_Material.Packing_No
      LEFT JOIN (
         SELECT tmp2.Packing_No, Count(tmp2.Rec_Supplier) AS Rec_Supplier
         FROM (
            SELECT sop.Packing_No, pd.SupplierID AS Rec_Supplier
            FROM @tmpStock_Out_Package sop  
            INNER JOIN Stock_Out_Detail_Packing sodp with(NoLock, NoWait) ON sodp.Stock_Out_PackageID = sop.Stock_Out_PackageID 
            INNER JOIN Stock_Out_Detail sod with(NoLock, NoWait) ON sodp.Stock_Out_DetailID = sod.Stock_Out_DetailID And sop.Stock_Out_No = sod.Stock_Out_No
            INNER JOIN Purchase_Detail pd with(NoLock, NoWait) ON sod.Purchase_DetailID = pd.Purchase_DetailID
            GROUP BY sop.Packing_No, pd.SupplierID
         ) AS tmp2
         GROUP BY tmp2.Packing_No
      ) as MPI_Combine_Package_PK_Supplier ON sop.Packing_No = MPI_Combine_Package_PK_Supplier.Packing_No
      GROUP BY MPI_Combine_Package_PK_Material.Rec_Material, MPI_Combine_Package_PK_Supplier.Rec_Supplier, sop.Packing_No, sop.Packing_Qty, sop.Packing_Unit
      ORDER BY MPI_Combine_Package_PK_Material.Rec_Material DESC , MPI_Combine_Package_PK_Supplier.Rec_Supplier DESC , sop.Packing_No;
   End

   --Pending_Packages
   if(@Mode = 0 or @Mode = 3)
   Begin
      SELECT sod.Stock_Out_DetailID
      , sod.Stock_Out_No
      , sod.Material_Category
      , sod.Material_Specific
      , sod.Material_Color
      , sod.Purchase_DetailID
      , sod.Charge_Qty
      , Round(Sum([Per_Qty] * IIf([sodp].[Stock_Out_PackageID] Is Null,0,[Packing_Qty])),10) AS Total_Packing_Qty 
      FROM @tmpStock_Out so
      INNER JOIN Stock_Out_Detail sod with(NoLock,NoWait) ON sod.Stock_Out_No = so.Stock_Out_No 
      LEFT JOIN Stock_Out_Detail_Packing sodp with(NoLock,NoWait) ON sod.Stock_Out_DetailID = sodp.Stock_Out_DetailID
      LEFT JOIN @tmpStock_Out_Package sop ON sodp.Stock_Out_PackageID = sop.Stock_Out_PackageID
      GROUP BY sod.Stock_Out_DetailID, sod.Stock_Out_No, sod.Material_Category, sod.Material_Specific, sod.Material_Color, sod.Purchase_DetailID, sod.Charge_Qty   
      Having ( Round(Sum([Per_Qty] * IIf([sodp].[Stock_Out_PackageID] Is Null,0,[Packing_Qty])),10) <> [Charge_Qty]);
   End

   --Packing_Unit_Sum
   if(@Mode = 0 or @Mode = 4)
   Begin
      SELECT tmp.Packing_Unit
      , Sum(tmp.Packing_Qty) AS Packing_Qty 
      FROM (
         SELECT distinct sop.Packing_No, sop.Packing_Qty, sop.Packing_Unit
         FROM @tmpStock_Out_Package sop 
      ) as tmp
      GROUP BY tmp.Packing_Unit;
   End

   --Packing_Unit_Error
   if(@Mode = 0 or @Mode = 5)
   Begin
      SELECT tmp.Packing_No
      FROM (
         SELECT distinct sop.Packing_No, sop.Packing_Unit
         FROM @tmpStock_Out_Package sop 
      ) AS tmp
      GROUP BY tmp.Packing_No
      Having(Count(tmp.Packing_Unit) > 1);
   End

   `, req.body) ;
   //console.log(strSQL)
   db.sql(req.SiteDB, strSQL)
      .then((result) => {
         var DataSet = {Source_Supplier_Package: (req.body.Mode == 0 || req.body.Mode == 1) ? result.recordsets[0] : []
           , MPI_Combine_Package: (req.body.Mode == 0) ? result.recordsets[1] : (req.body.Mode == 2 ? result.recordsets[0] : [])
           , Pending_Packages: (req.body.Mode == 0) ? result.recordsets[2] : (req.body.Mode == 3 ? result.recordsets[0] : [])
           , Packing_Unit_Sum: (req.body.Mode == 0) ? result.recordsets[3] : (req.body.Mode == 4 ? result.recordsets[0] : [])
           , Packing_Unit_Error: (req.body.Mode == 0) ? result.recordsets[4] : (req.body.Mode == 5 ? result.recordsets[0] : [])
           , Source_Supplier_Package_Total: { Recs:0, Pkgs:0}
           , MPI_Combine_Package_Total: { Rec_Count:0, Packing_Qty:0}
           , Packing_Unit_Sum_Total: { Packing_Qty:0}
        };

        DataSet.Source_Supplier_Package.forEach((item,idx) => {
         DataSet.Source_Supplier_Package_Total.Recs += item.Recs;
         DataSet.Source_Supplier_Package_Total.Pkgs += item.Pkgs;

         item.Recs = Math.round((item.Recs)*1000)/1000;
         item.Pkgs = Math.round((item.Pkgs)*1000)/1000;
        });        
        
        DataSet.MPI_Combine_Package.forEach((item,idx) => {
         DataSet.MPI_Combine_Package_Total.Rec_Count += item.Rec_Count;
         DataSet.MPI_Combine_Package_Total.Packing_Qty += item.Packing_Qty;

         item.Rec_Count = Math.round((item.Rec_Count)*1000)/1000;
         item.Packing_Qty = Math.round((item.Packing_Qty)*1000)/1000;
        });

        DataSet.Packing_Unit_Sum.forEach((item,idx) => {
         DataSet.Packing_Unit_Sum_Total.Packing_Qty += item.Packing_Qty;

         item.Packing_Qty = Math.round((item.Packing_Qty)*1000)/1000;
        });

        DataSet.Source_Supplier_Package_Total.Recs = Math.round((DataSet.Source_Supplier_Package_Total.Recs)*1000)/1000;
        DataSet.Source_Supplier_Package_Total.Pkgs = Math.round((DataSet.Source_Supplier_Package_Total.Pkgs)*1000)/1000;
        
        DataSet.MPI_Combine_Package_Total.Rec_Count = Math.round((DataSet.MPI_Combine_Package_Total.Rec_Count)*1000)/1000;
        DataSet.MPI_Combine_Package_Total.Packing_Qty = Math.round((DataSet.MPI_Combine_Package_Total.Packing_Qty)*1000)/1000;

        DataSet.Packing_Unit_Sum_Total.Packing_Qty = Math.round((DataSet.Packing_Unit_Sum_Total.Packing_Qty)*1000)/1000;

        //console.log(DataSet)
        res.send(DataSet);
      }).catch((err) => {
         console.log(err);
         res.status(500).send(err);
      })
});

 //Get MPI_Packing_Select_Info
 router.post('/MPI_Packing_Select_Info',  function (req, res, next) {
   console.log("Call MPI_Packing_Select_Info Api:",req.body);
 
   req.body.MPI_No = req.body.MPI_No ? `N'${req.body.MPI_No.trim().substring(0,13).replace(/'/g, '')}'` : `''`;
   req.body.Packing_No = req.body.Packing_No ? `N'${req.body.Packing_No.trim().substring(0,15).replace(/'/g, '')}'` : `''`;
   req.body.SupplierID = req.body.SupplierID ? `N'${req.body.SupplierID.trim().substring(0,15).replace(/'/g, '')}'` : `''`;
   req.body.Mode = req.body.Mode ? req.body.Mode : 0;

   //Mode == 0 Get Source_Supplier_Packing
   //Mode == 1 Get Packing_No_Detail
   //Mode == 2 Get Packing_Unit_Error_Detail 
      
   var strSQL = format(`
   Declare @Mode int = {Mode}, @MPI_No Varchar(13) = {MPI_No}, @Packing_No nvarchar(15) = {Packing_No}, @SupplierID nvarchar(15) = {SupplierID};
   Declare @tmpStock_Out table (Stock_Out_No int)
   Declare @tmpStock_Out_Package table (Stock_Out_PackageID int, Stock_Out_No int, Packing_No varchar(15), Packing_Qty int, Packing_Unit varchar(10))

   Insert @tmpStock_Out (Stock_Out_No)
   Select so.Stock_Out_No
   From Stock_Out so with(NoLock,NoWait) 
   Where so.MPI_No = @MPI_No;

   Insert @tmpStock_Out_Package (Stock_Out_PackageID, Stock_Out_No, Packing_No, Packing_Qty, Packing_Unit)
   Select sog.Stock_Out_PackageID, so.Stock_Out_No, sog.Packing_No, sog.Packing_Qty, sog.Packing_Unit 
   From @tmpStock_Out so 
   Inner Join Stock_Out_Package sog on so.Stock_Out_No = sog.Stock_Out_No;
 
   --Source_Supplier_Packing
   if( @Mode = 0)
   Begin
      SELECT tmp.Count_Stock_Out_DetailID
      , sop.Packing_No
      , sop.Packing_Qty AS Pkgs
      , Max(sod.Stock_Out_No) AS Stock_Out_No
      , Max(sod.Stock_Out_DetailID) AS Stock_Out_DetailID
      , pd.SupplierID
      , (Ascii(Right(sop.[Packing_No],1))+Ascii(Right(sop.[Packing_No],2))+Ascii(Right(sop.[Packing_No],3))+Ascii(Right(sop.[Packing_No],4))+Ascii(Right(sop.[Packing_No],5))+Ascii(Right(sop.[Packing_No],6))+Ascii(Right(sop.[Packing_No],7))) % 4 AS G_Color 
      FROM @tmpStock_Out_Package sop 
      INNER JOIN Stock_Out_Detail_Packing sodp with(NoLock,NoWait) ON sodp.Stock_Out_PackageID = sop.Stock_Out_PackageID
      INNER JOIN Stock_Out_Detail sod with(NoLock,NoWait) ON sodp.Stock_Out_DetailID = sod.Stock_Out_DetailID And sop.Stock_Out_No = sod.Stock_Out_No
      INNER JOIN Purchase_Detail pd with(NoLock,NoWait) ON sod.Purchase_DetailID = pd.Purchase_DetailID
      INNER JOIN (
         SELECT sop.Packing_No, Count(sodp.Stock_Out_DetailID) AS Count_Stock_Out_DetailID
         FROM @tmpStock_Out_Package sop 
         INNER JOIN Stock_Out_Detail_Packing sodp with(NoLock,NoWait) on sop.Stock_Out_PackageID = sodp.Stock_Out_PackageID
         GROUP BY sop.Packing_No
      )  as tmp ON sop.Packing_No = tmp.Packing_No 
      Where pd.SupplierID = @SupplierID 
      GROUP BY tmp.Count_Stock_Out_DetailID, sop.Packing_No, sop.Packing_Qty, pd.SupplierID
      , (Ascii(Right(sop.[Packing_No],1))+Ascii(Right(sop.[Packing_No],2))+Ascii(Right(sop.[Packing_No],3))+Ascii(Right(sop.[Packing_No],4))+Ascii(Right(sop.[Packing_No],5))+Ascii(Right(sop.[Packing_No],6))+Ascii(Right(sop.[Packing_No],7))) % 4
      ORDER BY tmp.Count_Stock_Out_DetailID DESC , sop.Packing_No, sop.Packing_Qty DESC , Max(sod.Stock_Out_No);

      SELECT distinct top 1 Count(tmp1.Rec_Material) AS Rec_Material
      FROM (
            SELECT sop.Packing_No, sod.Material_Category AS Rec_Material
            FROM @tmpStock_Out_Package sop 
            INNER JOIN Stock_Out_Detail_Packing sodp with(NoLock, NoWait) ON sodp.Stock_Out_PackageID = sop.Stock_Out_PackageID 
            INNER JOIN Stock_Out_Detail sod with(NoLock, NoWait) ON sodp.Stock_Out_DetailID = sod.Stock_Out_DetailID And sop.Stock_Out_No = sod.Stock_Out_No
            INNER JOIN Purchase_Detail pd with(NoLock, NoWait) ON sod.Purchase_DetailID = pd.Purchase_DetailID
            Where pd.SupplierID = @SupplierID 
            GROUP BY sop.Packing_No, sod.Material_Category
         ) AS tmp1
      GROUP BY tmp1.Packing_No
      Order by Rec_Material desc

      SELECT distinct top 1 Count(tmp2.Rec_Supplier) AS Rec_Supplier
      FROM (
         SELECT sop.Packing_No, pd.SupplierID AS Rec_Supplier
         FROM @tmpStock_Out_Package sop  
         INNER JOIN Stock_Out_Detail_Packing sodp with(NoLock, NoWait) ON sodp.Stock_Out_PackageID = sop.Stock_Out_PackageID 
         INNER JOIN Stock_Out_Detail sod with(NoLock, NoWait) ON sodp.Stock_Out_DetailID = sod.Stock_Out_DetailID And sop.Stock_Out_No = sod.Stock_Out_No
         INNER JOIN Purchase_Detail pd with(NoLock, NoWait) ON sod.Purchase_DetailID = pd.Purchase_DetailID
         Where pd.SupplierID = @SupplierID 
         GROUP BY sop.Packing_No, pd.SupplierID
      ) AS tmp2
      GROUP BY tmp2.Packing_No
      Order by Rec_Supplier desc

   End

   --Packing_No_Detail
   if( @Mode = 1)
   Begin
      SELECT sop.Packing_No
      , pd.[SupplierID]
      , isnull(s.[AccountID],'') + pd.[SupplierID] AS Supplier
      , sod.Material_Category
      , sop.Stock_Out_No
      , sod.Purchase_DetailID
      , sod.Stock_Out_DetailID
      , (sop.[Stock_Out_No] % 4) AS G_Color
      , sop.Packing_Unit
      FROM @tmpStock_Out_Package sop 
      LEFT JOIN Stock_Out_Detail_Packing sodp with(NoLock,NoWait) ON sodp.Stock_Out_PackageID = sop.Stock_Out_PackageID
      LEFT JOIN Stock_Out_Detail sod with(NoLock,NoWait) ON sodp.Stock_Out_DetailID = sod.Stock_Out_DetailID
      LEFT JOIN Purchase_Detail pd with(NoLock,NoWait) ON sod.Purchase_DetailID = pd.Purchase_DetailID
      LEFT JOIN Supplier s with(NoLock,NoWait) ON pd.SupplierID = s.SupplierID
      Where sop.Packing_No = @Packing_No
      ORDER BY sop.Packing_No, isnull(s.[AccountID],'') + pd.[SupplierID], sod.Material_Category, sop.Stock_Out_No;
   End

   --Packing_Unit_Error_Detail
   if( @Mode = 2)
   Begin
      SELECT sop.Packing_No
      , sop.Packing_Unit
      , sop.Packing_Qty
      , sop.Stock_Out_No
      FROM @tmpStock_Out_Package sop 
      Where sop.Packing_No = @Packing_No 
      ORDER BY sop.Packing_No;
   End

   `, req.body) ;
   //console.log(strSQL)
   db.sql(req.SiteDB, strSQL)
      .then((result) => {
         var DataSet = {Source_Supplier_Packing: (req.body.Mode == 0 ? result.recordsets[0] : [])
           , Rec_Material: (req.body.Mode == 0 ? result.recordsets[1] : [])
           , Rec_Supplier: (req.body.Mode == 0 ? result.recordsets[2] : [])
           , Packing_No_Detail: (req.body.Mode == 1 ? result.recordsets[0] : [])
           , Packing_Unit_Error_Detail: (req.body.Mode == 2 ? result.recordsets[0] : [])
           , Source_Supplier_Packing_Total: { Pkgs:0}
        };

        DataSet.Source_Supplier_Packing.forEach((item,idx) => {
            DataSet.Source_Supplier_Packing_Total.Pkgs += item.Pkgs;
            item.Pkgs = Math.round((item.Pkgs)*1000)/1000;
        });        
        
        DataSet.Source_Supplier_Packing_Total.Pkgs = Math.round((DataSet.Source_Supplier_Packing_Total.Pkgs)*1000)/1000;

        //console.log(DataSet)
        res.send(DataSet);
      }).catch((err) => {
         console.log(err);
         res.status(500).send(err);
      })
});

 //Get MPI_Report_Info
router.post('/MPI_Report_Info',  function (req, res, next) {
   console.log("Call MPI_Report_Info Api:",req.body);
 
   req.body.Mode = req.body.Mode ? req.body.Mode : 0;
   req.body.MPI_No = req.body.MPI_No ? `N'${req.body.MPI_No.trim().substring(0,13).replace(/'/g, '')}'` : `''`;
   
   //Mode == 0 Get Report Data: Invoice
   //Mode == 1 Get Report Data: Invoice Local Price
   //Mode == 2 Get Report Data: Invoice Orig. Detail
   //Mode == 3 Get Report Data: Packing List Sort By CCC Code
   //Mode == 4 Get Report Data: Packing List Sort By PP NO And CCC Code
   //Mode == 5 Get Report Data: Packing List Sort By Packing No
   //Mode == 6 Get Report Data: Packing List (Orig. Goods)
   //Mode == 7 Get Report Data: Good List
   //Mode == 8 Get Report Data: Good List (Without Price)
   //Mode == 9 Get Report Data: Good List (Without Production)
   //Mode == 10 Get Report Data: Virtual Purchase Order For Factory
      
   var strSQL = format(`
   Declare @Mode int = {Mode}, @MPI_No varchar(15) = {MPI_No}

   Declare @Date Date, @Region nvarchar(50), @Exchange_Rate money, @Local_Currency_Rate money, @MTR_Declare_Rate money;

   Declare @tmp_MPI table(CustomerID NVarchar(15), Date nvarchar(10), Purchase_Date nvarchar(20), Messrs nvarchar(100), Messrs_Address nvarchar(256), Payment_Term nvarchar(30), Inspact_No nvarchar(30), Term_Price nvarchar(80)
   , Region nvarchar(50), Shipment_Port nvarchar(60), Destination_Port nvarchar(60), Expiry_Date nvarchar(10), Commodity nvarchar(100)
   , Bank_E_Name nvarchar(100), Bank_E_Address nvarchar(256)
   , Credit_Accounts_E_Name nvarchar(100), Credit_Accounts_E_Address nvarchar(256)
   , Remark nvarchar(max)
   , Amount money
   , ReportFile_OrgID nvarchar(10)
   , OrganizationID nvarchar(10), Organization_Name nvarchar(256), Organization_Path nvarchar(256)
   , Exchange_Rate money
   , MTR_Declare_Rate money
   , Container nvarchar(max)
   , Currency varchar(4)
   , Local_Currency varchar(4)
   , Local_Currency_Rate money
   , Account_No varchar(13)
   , Account_Name varchar(50)
   )
   
   Insert @tmp_MPI
   SELECT m.CustomerID
   , convert(varchar(10),m.Date,111) as Date
   , convert(varchar(20), DateAdd(day,-45, m.Date),120) as Purchase_Date
   , m.Messrs
   , m.Messrs_Address
   , m.Payment_Term
   , m.Inspact_No
   , m.Term_Price
   , m.Region
   , m.Shipment_Port
   , m.Destination_Port
   , convert(varchar(10),m.Expiry_Date,111) as Expiry_Date
   , m.Commodity
   , Bank.E_Name as Bank_E_Name
   , Bank.E_Address AS Bank_E_Address
   , Credit_Accounts.E_Name as Credit_Accounts_E_Name
   , Credit_Accounts.E_Address as Credit_Accounts_E_Address
   , (cast(m.Remark as nvarchar)) as Remark
   , m.Amount
   , (Select OrganizationID From Control) as ReportFile_OrgID
   , m.[OrganizationID]
   , Organization.Organization_Name AS Organization_Name
   , '\Organizations\TradeMarks\' + m.[OrganizationID] + '.png' AS Organization_Path
   , iif(isnull(m.Exchange_Rate,1)=0, 1, isnull(m.Exchange_Rate,1)) as Exchange_Rate
   , isnull(m.MTR_Declare_Rate,0.7) as MTR_Declare_Rate
   , m.Container
   , m.Currency
   , cr.Currency as Local_Currency
   , iif(isnull(cr.Currency_Rate,1)=0, 1, isnull(cr.Currency_Rate,1)) as Local_Currency_Rate
   , Bank.Account_No
   , Bank.Account_Name 
   FROM MPI m with(NoLock,NoWait)
   Left Outer Join Credit_Accounts with(NoLock,NoWait) ON Credit_Accounts.AccountID = m.Beneficiary 
   Left Outer Join Bank with(NoLock,NoWait) ON Bank.BankID = m.Advising_Bank 
   Left Outer JOIN Organization with(NoLock,NoWait) ON m.OrganizationID = Organization.OrganizationID 
   Left Outer Join [@Currency_Rate] cr with(NoLock,NoWait) on cr.Currency = (Select Local_Currency From Control) and cast(cr.Exchange_Date as date) = cast(m.Date as date)
   Where m.MPI_No = @MPI_No
   
   Select @Date = Date
   , @Region = Region
   , @Exchange_Rate = Exchange_Rate
   , @MTR_Declare_Rate = MTR_Declare_Rate 
   , @Local_Currency_Rate = Local_Currency_Rate
   from @tmp_MPI
   

   Declare @tmp_Packing_Detail table (Packing_No varchar(15), Packing_Qty int, Packing_Unit varchar(10) )
         
   Insert @tmp_Packing_Detail
   SELECT distinct s.Packing_No, s.Packing_Qty, s.Packing_Unit
   FROM Stock_Out o with(NoLock, NoWait)
   INNER JOIN Stock_Out_Package s with(NoLock, NoWait) ON s.Stock_Out_No = o.Stock_Out_No
   Where o.MPI_No = @MPI_No   

   `, req.body) ;
   switch(req.body.Mode) {
      case 0:
      case 1:
         strSQL += format(`
         Declare @tmp_MPI_Detail table(CCC_CodeID int, CCC_Code varchar(13), Description varchar(100), Qty money, Unit varchar(10), Unit_Price money
         , Sale_Price money, Sale_Amount money, Sale_Price_Local money, Sale_Amount_Local money
         , Max_Price float, Min_Price float)   
      
         Insert @tmp_MPI_Detail
         SELECT s.CCC_CodeID
         , s.CCC_Code
         , s.Description
         , s.Qty
         , s.Unit
         , s.Unit_Price
         , Round( cast(([Unit_Price] / @Exchange_Rate) * @MTR_Declare_Rate as money), 4) AS Sale_Price
         , Round( cast( Round( cast(([Unit_Price] / @Exchange_Rate) * @MTR_Declare_Rate as money), 4)  * [Qty] as money) , 2) AS Sale_Amount
         , Round( cast(([Unit_Price] / @Local_Currency_Rate) * @MTR_Declare_Rate as money), 4) AS Sale_Price_Local
         , Round( cast(Round(([Unit_Price] / @Local_Currency_Rate) * @MTR_Declare_Rate, 4) * [Qty] as money) , 2) AS Sale_Amount_Local
         , s.Max_Price
         , s.Min_Price
         FROM MPI_Detail s with(NoLock, NoWait)
         Where s.MPI_No = @MPI_No;        
         
         --MPI 
         Select * 
         , Round(isnull((Select sum(Sale_Amount) From @tmp_MPI_Detail),0),2) as TTL_Amount
         , dbo.RecurseNumber(Round(isnull((Select sum(Sale_Amount) From @tmp_MPI_Detail),0),2)) as EngNum_TTL_Amount
         , dbo.RecurseNumber(isnull((Select sum(Packing_Qty) From @tmp_Packing_Detail),0)) as EngNum_TTL_PKGS
         From @tmp_MPI        
         
         -- MPI Detail
         Select * From @tmp_MPI_Detail Order by CCC_Code, Description
         
         -- Stock Out Pack Info
         Select 0 as Flag, '0' + s.Packing_Unit as sort, sum(s.Packing_Qty) as Packing_Qty, s.Packing_Unit From @tmp_Packing_Detail s group by s.Packing_Unit
         Union
         Select 1 as Flag, 'Z' as sort, (Select sum(Packing_Qty) From @tmp_Packing_Detail) as Packing_Qty, 'PKGS' as Packing_Unit
         ORDER BY sort
         
         -- Detail Unit Info
         Select sum(s.Qty) as Qty, s.Unit 
         From @tmp_MPI_Detail s
         Group by s.Unit
         ORDER BY Unit
         
         `, req.body) ;
      break;
      case 2:
         strSQL += format(`
         Declare @tmp_MPI_Detail table(CCC_CodeID int, CCC_Code varchar(13), Description varchar(100), Qty float, Unit varchar(10), Unit_Price float
         , Sale_Price money, Sale_Amount money, Sale_Price_Local money, Sale_Amount_Local money
         , Max_Price float, Min_Price float)   

         Insert @tmp_MPI_Detail
         SELECT cc.CCC_CodeID
         , cc.CCC_Code
         , sd.Material_Category + ' ' + sd.Material_Specific as Description
         , Sum(sd.Out_Qty) as Qty
         , sd.Unit
         , s.Unit_Price 
         , Round(cast((s.[Unit_Price] / @Exchange_Rate) * @MTR_Declare_Rate as money), 4) AS Sale_Price
         , Round( cast(Round((s.[Unit_Price] / @Exchange_Rate) * @MTR_Declare_Rate, 4) * Sum(sd.Out_Qty) as Money), 2) AS Sale_Amount
         , Round(cast((s.[Unit_Price] / @Local_Currency_Rate) * @MTR_Declare_Rate as money), 4) AS Sale_Price_Local
         , Round( cast(Round((s.[Unit_Price] / @Local_Currency_Rate) * @MTR_Declare_Rate, 4) * Sum(sd.Out_Qty) as Money), 2) AS Sale_Amount_Local
         , s.Max_Price
         , s.Min_Price
         FROM MPI_Detail s with(NoLock, NoWait)
         Inner Join Stock_Out_Detail sd with(NoLock, NoWait) on sd.MPI_DetailID = s.MPI_DetailID
         Inner Join Material_CCC_Code mcc with(NoLock, NoWait) on sd.MaterialID = mcc.MaterialID
         Inner Join CCC_Code cc with(NoLock, NoWait) on cc.CCC_CodeID = mcc.CCC_CodeID and cc.Region = @Region
         --Left Outer Join [@Currency_Rate] cr with(NoLock,NoWait) on cr.Currency = sd.Currency and cast(cr.Exchange_Date as date) = @Date
         Where s.MPI_No = @MPI_No
         Group by cc.CCC_CodeID
         , cc.CCC_Code
         , sd.Material_Category + ' ' + sd.Material_Specific
         , sd.Unit
         , s.Unit_Price 
         --, sd.Out_Qty
         --, cr.Currency_Rate
         , s.Max_Price
         , s.Min_Price;
         
         --MPI 
         Select * 
         , Round(isnull((Select sum(Sale_Amount) From @tmp_MPI_Detail),0),2) as TTL_Amount
         , dbo.RecurseNumber(Round(isnull((Select sum(Sale_Amount) From @tmp_MPI_Detail),0),2)) as EngNum_TTL_Amount
         , dbo.RecurseNumber(isnull((Select sum(Packing_Qty) From @tmp_Packing_Detail),0)) as EngNum_TTL_PKGS
         From @tmp_MPI        
         
         -- MPI Detail
         Select * From @tmp_MPI_Detail Order by CCC_Code
         
         -- Stock Out Pack Info
         Select 0 as Flag, '0' + s.Packing_Unit as sort, sum(s.Packing_Qty) as Packing_Qty, s.Packing_Unit From @tmp_Packing_Detail s group by s.Packing_Unit
         Union
         Select 1 as Flag, 'Z' as sort, (Select sum(Packing_Qty) From @tmp_Packing_Detail) as Packing_Qty, 'PKGS' as Packing_Unit 
         ORDER BY sort
         
         -- Detail Unit Info
         Select sum(s.Qty) as Qty, s.Unit 
         From @tmp_MPI_Detail s
         Group by s.Unit
         ORDER BY Unit         
         `, req.body) ;
      break;   
      case 3:
      case 4:
      case 5:
      case 6:
         strSQL += format(`
         Declare @tmp_MPI_Detail table(MPI_DetailID int, Packing_No varchar(15), CCC_Code varchar(13), Description varchar(100)
         , Packing_Qty int, Packing_Unit varchar(10), Per_Qty money, Qty money, Unit varchar(10)
         , Per_Net_Weight money, Net_Weight money, Per_Gross_Weight money, Gross_Weight money)
               
         insert @tmp_MPI_Detail
         SELECT md.MPI_DetailID
         , sop.Packing_No
         , md.CCC_Code
         , md.Description
         , sop.Packing_Qty
         , sop.Packing_Unit
         , sum(sdp.Per_Qty) as Per_Qty
         , sum(sdp.Per_Qty * sop.Packing_Qty) as Qty
         , md.Unit
         , sum(Round(cast(sdp.[Per_Qty] * sdp.[Unit_Net_Weight] as money),2)) AS Per_Net_Weight
         , sum(sop.[Packing_Qty] * Round(cast(sdp.[Per_Qty] * sdp.[Unit_Net_Weight] as money),2)) AS Net_Weight
         , sum([Unit_Packaging_Weight] + Round(cast(sdp.[Per_Qty] * sdp.[Unit_Net_Weight] as money),2)) AS Per_Gross_Weight
         , sum(sop.[Packing_Qty] * (sdp.[Unit_Packaging_Weight] + Round(cast(sdp.[Per_Qty] * sdp.[Unit_Net_Weight] as money),2) )) AS Gross_Weight
         FROM MPI_Detail md with(NoLock, NoWait) 
         INNER JOIN Stock_Out_Detail sd with(NoLock, NoWait) ON sd.MPI_DetailID = md.MPI_DetailID
         INNER JOIN Stock_Out_Detail_Packing sdp with(NoLock, NoWait) ON sd.Stock_Out_DetailID = sdp.Stock_Out_DetailID 
         INNER JOIN Stock_Out_Package sop with(NoLock, NoWait) ON sdp.Stock_Out_PackageID = sop.Stock_Out_PackageID 
         WHERE md.MPI_No = @MPI_NO
         Group by md.MPI_DetailID, sop.Packing_No, md.CCC_Code, md.Description
         , sop.Packing_Qty, sop.Packing_Unit, md.Unit
         Order by Packing_No, CCC_Code;
         
         --MPI 
         Select * 
         , dbo.RecurseNumber(isnull((Select sum(Packing_Qty) From @tmp_Packing_Detail),0)) as EngNum_TTL_PKGS
         , isnull((Select sum(Net_Weight) From @tmp_MPI_Detail),0) as TTL_Net_Weight
         , isnull((Select sum(Gross_Weight) From @tmp_MPI_Detail),0) as TTL_Gross_Weight
         From @tmp_MPI
         
         -- MPI Detail
         Select  0 as Flag
         , Packing_No + cast(MPI_DetailID as varchar) + '0' as Sort
         , * 
         From @tmp_MPI_Detail 
         Order by CCC_Code, Description 
         
         -- Stock Out Pack Info
         Select 0 as Flag, '0' + s.Packing_Unit as sort, sum(s.Packing_Qty) as Packing_Qty, s.Packing_Unit From @tmp_Packing_Detail s group by s.Packing_Unit
         Union
         Select 1 as Flag, 'Z' as sort, (Select sum(Packing_Qty) From @tmp_Packing_Detail) as Packing_Qty, 'PKGS' as Packing_Unit 
         ORDER BY sort
         
         -- Detail Unit Info
         Select sum(s.Qty) as Qty, s.Unit 
         From @tmp_MPI_Detail s
         Group by s.Unit
         ORDER BY Unit
         `, req.body) ;
      break;
      case 7:
      case 8:
      case 9:
         strSQL += format(`
         --MPI 
         Select @MPI_No as MPI_No
         , OrganizationID
         , Container
         , Currency
         From @tmp_MPI;

         SELECT MPI_Detail.MPI_No, Stock_Out_Detail.MPI_DetailID, Stock_Out_Detail.Stock_Out_No, Stock_Out_Package.Packing_No
         , Stock_Out.Purchase_Project_No, Stock_Out_Package.Stock_Out_PackageID, MPI_Detail.CCC_CodeID, MPI_Detail.CCC_Code
         , (MPI_Detail.Description) AS Description
         , isnull(Stock_Out_Package.Packing_Qty,0) as Packing_Qty
         , Stock_Out_Package.Packing_Unit
         , Sum(Stock_Out_Detail_Packing.Per_Qty) AS Per_Qty, MPI_Detail.Unit
         , '\Organizations\TradeMarks\' + [MPI].[OrganizationID] + '.png' AS Organization_Path
         , Stock_Out_Detail.Purchase_DetailID, Purchase_Detail.Project_Qty, Purchase_Detail.Qty AS Purchase_Qty, Purchase_Detail.Stock_Out_Qty
         , MPI.Currency, Stock_Out_Detail.Unit_Price, MPI.MTR_Declare_Rate, MPI_Detail.Unit_Price
         , Round([Stock_Out_Detail].[Unit_Price]* [Detail_Currency_Rate].Currency_Rate *[MPI].[MTR_Declare_Rate] / nullif([Master_Currency_Rate].Currency_Rate, 0) ,3) AS Sale_Price
         , [Master_Currency_Rate].Currency_Rate AS Master_Currency_Rate, [Detail_Currency_Rate].Currency_Rate AS Detail_Currency_Rate
         , Round(([MPI_Detail].[Unit_Price]*[MPI].[MTR_Declare_Rate]) / nullif([Master_Currency_Rate].Currency_Rate, 0) ,4) AS Doc_Price
         FROM MPI with(NoLock, NoWait)
         INNER JOIN MPI_Detail with(NoLock, NoWait) ON MPI.MPI_No = MPI_Detail.MPI_No
         INNER JOIN Stock_Out_Detail with(NoLock, NoWait) on Stock_Out_Detail.MPI_DetailID = MPI_Detail.MPI_DetailID
         INNER JOIN Stock_Out with(NoLock, NoWait) ON Stock_Out_Detail.Stock_Out_No = Stock_Out.Stock_Out_No
         INNER JOIN Stock_Out_Detail_Packing with(NoLock, NoWait) ON Stock_Out_Detail.Stock_Out_DetailID = Stock_Out_Detail_Packing.Stock_Out_DetailID
         INNER JOIN Stock_Out_Package with(NoLock, NoWait) ON Stock_Out_Detail_Packing.Stock_Out_PackageID = Stock_Out_Package.Stock_Out_PackageID
         INNER JOIN Purchase_Detail with(NoLock, NoWait) ON Stock_Out_Detail.Purchase_DetailID = Purchase_Detail.Purchase_DetailID
         Left Outer Join [@Currency_Rate] [Master_Currency_Rate] with(NoLock, NoWait) ON [Master_Currency_Rate].Currency = MPI.Currency And cast(MPI.Date as Date) = [Master_Currency_Rate].Exchange_Date
         Left Outer Join [@Currency_Rate] [Detail_Currency_Rate] with(NoLock, NoWait) ON [Detail_Currency_Rate].Currency = Stock_Out_Detail.Currency And cast(Stock_Out.Stock_Out_Date as Date) = [Detail_Currency_Rate].Exchange_Date
         WHERE MPI.MPI_No = @MPI_No
         GROUP BY MPI_Detail.MPI_No, Stock_Out_Detail.MPI_DetailID, Stock_Out_Detail.Stock_Out_No, Stock_Out_Package.Packing_No
         , Stock_Out.Purchase_Project_No, Stock_Out_Package.Stock_Out_PackageID, MPI_Detail.CCC_CodeID, MPI_Detail.CCC_Code
         , (MPI_Detail.Description), Stock_Out_Package.Packing_Qty, Stock_Out_Package.Packing_Unit
         , MPI_Detail.Unit, '\Organizations\TradeMarks\' + [MPI].[OrganizationID] + '.png'
         , Stock_Out_Detail.Purchase_DetailID, Purchase_Detail.Project_Qty, Purchase_Detail.Qty, Purchase_Detail.Stock_Out_Qty
         , MPI.Currency, Stock_Out_Detail.Unit_Price, MPI.MTR_Declare_Rate, MPI_Detail.Unit_Price
         , Round([Stock_Out_Detail].[Unit_Price]* [Detail_Currency_Rate].Currency_Rate *[MPI].[MTR_Declare_Rate] / nullif([Master_Currency_Rate].Currency_Rate, 0),3)
         , [Master_Currency_Rate].Currency_Rate, [Detail_Currency_Rate].Currency_Rate 
         , Round(([MPI_Detail].[Unit_Price]*[MPI].[MTR_Declare_Rate]) / nullif([Master_Currency_Rate].Currency_Rate, 0),4)          
         Order by Packing_No, Purchase_Project_No, MPI_DetailID, Description;
         
         -- Link key MPI_DetailID;Packing_No;Purchase_DetailID
         SELECT Stock_Out_Detail.Material_ColorID
         , Stock_Out_Package.Stock_Out_PackageID
         , Stock_Out_Detail.MPI_DetailID
         , Stock_Out_Detail.Stock_Out_DetailID
         , Stock_Out_Detail.Material_Category
         , Purchase_Detail.SupplierID
         , Stock_Out_Detail.Material_Specific
         , Stock_Out_Detail.Material_Color
         , isnull(Purchase_Detail.[Material_category],'') + ' ' + isnull(Purchase_Detail.[Material_Specific],'') + ' ' + isnull(Purchase_Detail.[Material_Color],'') + ' (' + isnull(Purchase_Detail.[Memo],'') + ')' + ' ' + isnull(Purchase_Detail.[SupplierID],'') as Material
         , Stock_Out_Package.Packing_No
         , Stock_Out_Detail.Purchase_DetailID
         , Stock_Out_Detail.Unit_Price
         , Stock_Out_Detail.Unit
         , Stock_Out_Detail_Packing.Per_Qty
         , Stock_Out_Package.Packing_Qty
         , isnull([Per_Qty]*[Packing_Qty],0) AS Detail_Qty
         , round((isnull(([Out_Qty] / nullif([Project_Qty], null)),0) * 100),1) AS Current_Out_Rate
         , Purchase_Detail.M_Rmk
         , Purchase_Detail.Memo
         FROM Stock_Out with(NoLock, NoWait)
         INNER JOIN Stock_Out_Detail with(NoLock, NoWait) on Stock_Out.Stock_Out_No = Stock_Out_Detail.Stock_Out_No
         INNER JOIN Stock_Out_Detail_Packing with(NoLock, NoWait) ON Stock_Out_Detail.Stock_Out_DetailID = Stock_Out_Detail_Packing.Stock_Out_DetailID
         INNER JOIN Stock_Out_Package with(NoLock, NoWait) ON Stock_Out_Detail_Packing.Stock_Out_PackageID = Stock_Out_Package.Stock_Out_PackageID
         INNER JOIN Purchase_Detail with(NoLock, NoWait) ON Stock_Out_Detail.Purchase_DetailID = Purchase_Detail.Purchase_DetailID
         Where Stock_Out.MPI_No = @MPI_No;
         
         -- Link key MPI_DetailID;Packing_No;Purchase_DetailID
         SELECT Purchase_Detail_Sub.Purchase_DetailID, Purchase_Detail_Sub.Produce_No
         , Round(isnull([Stock_Out_Detail_Packing].[Per_Qty]*[Stock_Out_Package].[Packing_Qty]*[Purchase_Detail_Sub].[qty] / nullif([Purchase_Detail].[Qty], 0),0),1) AS Current_Out_Rate
         , Stock_Out_Detail.MPI_DetailID, Stock_Out_Package.Packing_No
         FROM Purchase_Detail_Sub with(NoLock, NoWait) 
         INNER JOIN Purchase_Detail with(NoLock, NoWait) ON Purchase_Detail_Sub.Purchase_DetailID = Purchase_Detail.Purchase_DetailID 
         INNER JOIN Stock_Out_Detail with(NoLock, NoWait)  ON Purchase_Detail.Purchase_DetailID = Stock_Out_Detail.Purchase_DetailID
         INNER JOIN Stock_Out_Detail_Packing with(NoLock, NoWait) ON Stock_Out_Detail_Packing.Stock_Out_DetailID = Stock_Out_Detail.Stock_Out_DetailID
         INNER JOIN Stock_Out_Package with(NoLock, NoWait) ON Stock_Out_Detail_Packing.Stock_Out_PackageID = Stock_Out_Package.Stock_Out_PackageID 
         INNER JOIN Stock_Out with(NoLock, NoWait) on Stock_Out.Stock_Out_No = Stock_Out_Detail.Stock_Out_No
         WHERE Stock_Out.MPI_No = @MPI_No
         And Purchase_Detail_Sub.Produce_No <>'[None]';         
         `, req.body)
      break;
      case 10:
         strSQL += format(`
         Declare @tmp_MPI_Detail table(CCC_CodeID int, CCC_Code varchar(13), Description varchar(max), Qty money, Unit varchar(10), Unit_Price money
         , Sale_Price money, Sale_Amount money, Sale_Price_Local money, Sale_Amount_Local money
         , Max_Price float, Min_Price float)   
      
         Insert @tmp_MPI_Detail
         SELECT s.CCC_CodeID
         , s.CCC_Code
         , sod.[Material_Category] + ' ' + sod.[Material_Specific] as Description
         , Sum(sod.Charge_Qty) AS Qty
         , s.Unit
         , s.Unit_Price
         , Round(cast((s.[Unit_Price] / @Exchange_Rate) * @MTR_Declare_Rate as money), 4) AS Sale_Price
         , Round( cast(Round((s.[Unit_Price] / @Exchange_Rate) * @MTR_Declare_Rate, 4) * [Qty] as Money),2) AS Sale_Amount
         , Round(cast((s.[Unit_Price] / @Local_Currency_Rate) * @MTR_Declare_Rate as money), 4) AS Sale_Price_Local
         , Round( cast(Round((s.[Unit_Price] / @Local_Currency_Rate) * @MTR_Declare_Rate, 4) * [Qty] as Money),2) AS Sale_Amount_Local
         , s.Max_Price
         , s.Min_Price
         FROM MPI_Detail s with(NoLock, NoWait)
         INNER JOIN Stock_Out_Detail sod with(NoLock, NoWait) ON s.MPI_DetailID = sod.MPI_DetailID
         Where s.MPI_No = @MPI_No
         Group by s.CCC_CodeID
         , s.CCC_Code
         , sod.[Material_Category] + ' ' + sod.[Material_Specific]
         , s.Unit
         , s.Unit_Price
        , [Qty]
         , s.Max_Price
         , s.Min_Price;
         
         --0 MPI 
         Select * 
         , isnull((Select sum(Qty) From @tmp_MPI_Detail),0) as TTL_Qty
         , Round(isnull((Select sum(Sale_Amount) From @tmp_MPI_Detail),0),2) as TTL_Amount
         , dbo.RecurseNumber(Round(isnull((Select sum(Sale_Amount) From @tmp_MPI_Detail),0),2)) as EngNum_TTL_Amount
         , dbo.RecurseNumber(isnull((Select sum(Packing_Qty) From @tmp_Packing_Detail),0)) as EngNum_TTL_PKGS
         From @tmp_MPI        
         
         --1 MPI Detail
         Select * From @tmp_MPI_Detail Order by CCC_Code                 
         
         `, req.body) ;
      break;
   }
   //console.log(strSQL)
   db.sql(req.SiteDB, strSQL)
      .then((result) => {
      var DataSet = { };
 
      switch(req.body.Mode) {
         case 0:
         case 1:
         case 2:
            DataSet = {Report_Info: result.recordsets[0]
               , Detail_Info: result.recordsets[1]
               , Stock_Out_Pack_Info: result.recordsets[2]
               , Detail_Unit_Info: result.recordsets[3]
            };

            DataSet.Detail_Info.forEach((item)=>{
               item.Qty = Math.round((item.Qty)*100000)/100000;
               item.Unit_Price = Math.round((item.Unit_Price)*100000)/100000;
               item.Sale_Price = Math.round((item.Sale_Price)*100000)/100000;
               item.Sale_Amount = Math.round((item.Sale_Amount)*100000)/100000;
               item.Sale_Price_Local = Math.round((item.Sale_Price_Local)*100000)/100000;
               item.Sale_Amount_Local = Math.round((item.Sale_Amount_Local)*100000)/100000;
            })

         break;
         case 3:
         case 4:
         case 5:
         case 6:
            DataSet = {Report_Info: result.recordsets[0]
               , Detail_Info: []
               , Stock_Out_Pack_Info: result.recordsets[2]
               , Detail_Unit_Info: result.recordsets[3]
            };

            DataSet.Detail_Info = [...result.recordsets[1].reduce((r, e) => {
               let k = `${e.Packing_Unit}|${e.Description}|${e.Unit}`;
               if (!r.has(k)) {
                 // console.log(r) 
   
                 r.set(k, { 
                  Packing_Unit: e.Packing_Unit,
                  Description: e.Description,
                  Unit: e.Unit,
                  Total_Packing_Qty: e.Packing_Qty,
                  Total_Qty: e.Qty,
                  Total_Net_Weight: e.Net_Weight,
                  Total_Gross_Weight: e.Gross_Weight,
                 })
               } else {
                  r.get(k).Total_Packing_Qty += e.Packing_Qty;
                  r.get(k).Total_Qty += e.Qty;
                  r.get(k).Total_Net_Weight += e.Net_Weight;
                  r.get(k).Total_Gross_Weight += e.Gross_Weight;
               }
               return r;
             }, new Map).values()] 

             result.recordsets[1].forEach((item)=>{
               item.Packing_Qty = Math.round((item.Packing_Qty)*100000)/100000;
               item.Per_Qty = Math.round((item.Per_Qty)*100000)/100000;
               item.Qty = Math.round((item.Qty)*100000)/100000;
               item.Per_Net_Weight = Math.round((item.Per_Net_Weight)*100000)/100000;
               item.Net_Weight = Math.round((item.Net_Weight)*100000)/100000;
               item.Per_Gross_Weight = Math.round((item.Per_Gross_Weight)*100000)/100000;
               item.Gross_Weight = Math.round((item.Gross_Weight)*100000)/100000;
            })
  
            DataSet.Detail_Info.forEach((item)=>{
               item.DataItem = result.recordsets[1].filter((data)=>(data.Packing_Unit == item.Packing_Unit && data.Description == item.Description && data.Unit == item.Unit));
               item.RowSpan = item.DataItem.length;
            })

         break;
         case 7:
         case 8:
         case 9:
            DataSet = {Report_Info: result.recordsets[0]
               , Detail_Info: []
            };

            DataSet.Detail_Info = result.recordsets[1].map((obj)=>({MPI_DetailID: obj.MPI_DetailID
               ,Purchase_DetailID: obj.Purchase_DetailID
               ,Packing_No: obj.Packing_No
               ,Packing_Qty: Math.round((obj.Packing_Qty)*100000)/100000
               ,Packing_Unit: obj.Packing_Unit
               ,CCC_Code: obj.CCC_Code
               ,Description: obj.Description
               ,Purchase_Project_No: obj.Purchase_Project_No
               ,Per_Qty: Math.round((obj.Per_Qty)*100000)/100000
               ,Detail_Qty:0
               ,Unit: obj.Unit
               ,Unit_Price: obj.Doc_Price
               ,Material_ColorID: 0
               ,Material:''
               ,Project_Qty: Math.round((obj.Project_Qty)*100000)/100000
               ,Purchase_Qty: Math.round((obj.Purchase_Qty)*100000)/100000
               ,Current_Out_Rate: 0
               ,Total_Out_Rate:0
               , Produce_Info: []
            }))

            DataSet.Detail_Info.forEach((item)=>{               
               var PP_Info = result.recordsets[2].filter((data)=>(data.MPI_DetailID == item.MPI_DetailID && data.Purchase_DetailID == item.Purchase_DetailID && data.Packing_No == item.Packing_No));
               PP_Info.forEach((obj)=>{ 
                  item.Detail_Qty = Math.round((obj.Detail_Qty)*100000)/100000;
                  item.Material_ColorID = obj.Material_ColorID;
                  item.Material = obj.Material;
                  item.Current_Out_Rate = Math.round((obj.Current_Out_Rate)*100000)/100000
               });
               item.Produce_Info = result.recordsets[3].filter((data)=>(data.MPI_DetailID == item.MPI_DetailID 
                  && data.Purchase_DetailID == item.Purchase_DetailID 
                  && data.Packing_No == item.Packing_No)).map((data)=>({Produce_No: data.Produce_No, Current_Out_Rate: Math.round((data.Current_Out_Rate)*100000)/100000 }));
            })
         break;         
         case 10:
            DataSet = {Report_Info: result.recordsets[0]
               , Detail_Info: result.recordsets[1]
            };

            var reg=/[\u4E00-\u9FA5]/g;
            DataSet.Detail_Info.forEach((item)=>{
               item.Description = item.Description.replace(reg,'').replace(/  /g,' ');
               item.Qty = Math.round((item.Qty)*100000)/100000;
               item.Unit_Price = Math.round((item.Unit_Price)*100000)/100000;
               item.Sale_Price = Math.round((item.Sale_Price)*100000)/100000;
               item.Sale_Amount = Math.round((item.Sale_Amount)*100000)/100000;
               item.Sale_Price_Local = Math.round((item.Sale_Price_Local)*100000)/100000;
               item.Sale_Amount_Local = Math.round((item.Sale_Amount_Local)*100000)/100000;
            })

         break;
      }
      //console.log(DataSet)
        res.send(DataSet);
      }).catch((err) => {
         console.log(err);
         res.status(500).send(err);
      })
});


/* Mark-Wang API End */


/* Darren-Chang API Begin */

/* Darren-Chang API End */

module.exports = router;