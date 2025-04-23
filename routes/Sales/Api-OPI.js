var express = require('express');
var router = express.Router();
const format = require('string-format');
var db = require('../../config/DB_Connect');


/* Mark-Wang API Begin */

//Get Currency
router.post('/Currency', function (req, res, next) {
   console.log("Call Order Currency Api :", req.body);
   req.body.PI_No = req.body.PI_No ? req.body.PI_No.replace(/'/g, "''") : '';
   var strSQL = format(`
   Declare @Currency_Date DateTime = case when N'{PI_No}' = 'Insert' then GetDate() else isnull((Select Date from OPI Where PI_No = N'{PI_No}'),GetDate()) end
   
   SELECT p.[Currency]
   , (isnull(p.[Currency],'') + ' ' + isnull(cast(Currency_Rate as varchar),'')) as Currency_Rate
   , isnull(Currency_Rate,0) as Rate
     FROM Currency as p with(NoLock, NoWait)
   inner Join [dbo].[@Currency_Rate] c on c.Currency = p.Currency And c.Exchange_Date = convert(Date, @Currency_Date)
    `
   , req.body );
   //console.log(strSQL);  

   db.sql(req.SiteDB, strSQL)
      .then((result) => {
         res.send(result.recordset);
      }).catch((err) => {
         console.log(err);
         res.status(500).send(err);
      })

});

//Check PI_No
router.post('/Check_PI_No',  function (req, res, next) {
   console.log("Call Check_PI_No Api:",req.body);

   req.body.PI_No = req.body.PI_No ? `${req.body.PI_No.trim().substring(0,15).replace(/'/g, '')}` : '';

   var strSQL = format(`
   SELECT Count(*) as RecCount
   FROM [dbo].[OPI] With(Nolock,NoWait)
   where ([PI_No] = N'{PI_No}')
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

//Get OPI_List
router.post('/OPI_List',  function (req, res, next) {
   console.log("Call OPI_List Api:");
   
   req.body.PI_No = req.body.PI_No ? `${req.body.PI_No.trim().substring(0,15).replace(/'/g, '')}` : '';
   req.body.CustomerID = req.body.CustomerID ? `${req.body.CustomerID.trim().substring(0,15).replace(/'/g, '')}` : '';
   req.body.Date = req.body.Date ? `${req.body.Date.replace(/'/g, '')}` : '';
   req.body.UserID = req.body.UserID ? `${req.body.UserID.trim().substring(0,255).replace(/'/g, '')}` : '';

   var strSQL = format(`
   SELECT Top 1000 row_number() Over(Order By Date desc) as RecNo
   ,[PI_No]
   ,[CustomerID]
   ,convert(varchar(10) ,[Date] ,111) as [Date]
   ,[UserID]
   FROM [dbo].[OPI] With(Nolock,NoWait)
   where (N'{PI_No}' = '' or [PI_No] like N'{PI_No}%')
   And (N'{CustomerID}' = '' or [CustomerID] like N'%{CustomerID}%')
   And (N'{Date}' = '' or convert(varchar(10),[Date],111) like N'%{Date}%')
   And (N'{UserID}' = '' or [UserID] like N'{UserID}%')
   Order By Date desc, [CustomerID], PI_No, UserID
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

//OPI Detail Add
router.post('/OPI_Detail_Add', function (req, res, next) {
   console.log("Call OPI_Detail_Add Api :", req.body);

   req.body.PI_No = req.body.PI_No ? `N'${req.body.PI_No.trim().substring(0,15).replace(/'/g, "''")}'` : `''`; 
      
   var strSQL = format(` 
   Select 0 as Selected, s.Order_No, s.Season, Convert(varchar(20),s.Order_Date,111) as Order_Date, s.Department, '' as Query, s.UserID
   From OPI p with(NoLock,NoWait)
   Inner Join Orders s with(NoLock,NoWait) on p.CustomerID = s.CustomerID And p.Season = s.Season And p.Currency = s.Currency And isnull(s.PI_No,'') = ''
   Where p.PI_No = {PI_No};
   `, req.body);
   //console.log(strSQL);
   db.sql(req.SiteDB, strSQL)
   .then((result)=>{
      //console.log('Dataset:',result.recordset)
      res.send(result.recordset);
   }).catch((err)=>{
      console.log(err);
      res.status(500).send(err);
   })    
});   

//Get OPI_Info
router.post('/OPI_Info',  function (req, res, next) {
   console.log("Call OPI_Info Api:",req.body);

   req.body.PI_No = req.body.PI_No ? `N'${req.body.PI_No.trim().substring(0,15).replace(/'/g, "''")}'` : `''`; 

   //Mode == 0 Get OPI All Data
   //Mode == 1 Get OPI Master Data
   //Mode == 2 Get OPI Detail Data
   //Mode == 3 Get OPI Expense Data
   //Mode == 4 Get OPI Amount, Commodity Data
   var strSQL = format(`
   Declare @Mode int = {Mode}
   Declare @PI_No Varchar(18) = {PI_No}
      
   --0 Get OPI All Data
   --1 Get OPI Master Data
   if(@Mode = 0 or @Mode = 1)
   Begin
      Select [PI_No],[Revised_From],[Season], convert(varchar(10),[Date],111) as [Date],[UserID],[CustomerID],[OrganizationID],[Messrs],[Messrs_Address]
      ,[Payment_Term]
      --, dbo.Get_Payment_Term(o.Payment_Term, o.Rcv_Type, o.Rcv_Days, o.By_Doc_Rcv) as Payment_Term
      ,[Rcv_Type],[Rcv_Days],[By_Doc_Rcv],[Term_Price],convert(varchar(10),[Expiry_Date],111) as [Expiry_Date]
      , [Commodity]
      --, Format(Amount,'N2') as Amount
      ,[Beneficiary]
      ,[Remark], o.[Currency]
      , (Select Currency_Rate from dbo.[@Currency_Rate] r with(NoLock,NoWait) Where r.Currency = o.Currency and r.Exchange_Date = convert(Date, o.Date) ) as Currency_Rate
      , (Select r.Currency_Symbol from Currency r with(NoLock,NoWait) Where r.Currency = o.Currency ) as Currency_Symbol
      ,[ContactID]
      , (Select top 1 Contact From Customer_Contacts c with(NoLock,NoWait) Where c.ContactID = o.ContactID) as Contact
      , Advising_Bank
      , (Select top 1 b.S_Name From Bank b with(NoLock,NoWait) Where b.BankID = o.Advising_Bank) as Advising_Bank_Name
      , isnull(Approve,'') as Approve
      , case when len(isnull(Approve,'')) > 0 then 1 else 0 end as Approve_Chk
      ,convert(varchar(10),[Data_Update],111) as [Data_Update],[Data_Updater] 
      from OPI o with(NoLock,NoWait)
      Where PI_No = @PI_No
   End
   
   --2 Get OPI Detail Data
   if(@Mode = 0 or @Mode = 2)
   Begin   
      Select row_number() Over(Order By o.Order_No) as RecNo, o.Order_No
      from Orders o with(NoLock,NoWait)
      Where PI_No = @PI_No
   End 
   
   --3 Get OPI Expense Data
   if(@Mode = 0 or @Mode = 3)
   Begin
      Select o.OPI_ExpenseID, o.Description, Format(o.Amount,'N2') as Amount, o.Remark
      from OPI_Expense o with(NoLock,NoWait)
      Where PI_No = @PI_No     
   End

   --4 OPI Amount, Commodity Data
   if(@Mode = 0 or @Mode = 4)
   Begin
      
      Declare @S_Amount float, @Sum_Qty Float, @Order_Amount Float, @Fee_Amount float;
      Declare @Order_Detail table(Order_DetailID int, Qty Float, Unit_Price Float)
      
      Insert @Order_Detail
      Select Order_DetailID, Qty, [Unit_Price]
      From Orders o with(NoLock,NoWait)
      Inner Join Order_Detail od with(NoLock,NoWait) on o.Order_No = od.Order_No
      Where o.PI_No = @PI_No;
      
      Set @S_Amount = isnull( (Select sum(od.Unit_Price * od.Qty * Rate) From @Order_Detail od Inner Join Order_Detail_Expense ode on od.Order_DetailID = ode.Order_DetailID and ode.Doc = 'PI'),0);
      Set @Fee_Amount =	isnull( (Select sum(oe.Amount) From OPI_Expense oe Where oe.PI_No = @PI_No),0);
      
      SELECT @Sum_Qty = Sum(od.Qty), @Order_Amount = Sum(([Unit_Price]*[Qty])) FROM @Order_Detail od;
   
      Select Format(isnull(@Sum_Qty,0), 'N0') as Commodity_Qty
      , Format(isnull(@Order_Amount,0) + isnull(@S_Amount,0) + isnull(@Fee_Amount,0), 'N2') as Total_Amount

   End


   `, req.body) ;
   //console.log(strSQL)
   db.sql(req.SiteDB, strSQL)
      .then((result) => {
         var DataSet = {
            OPI: (req.body.Mode == 0 || req.body.Mode == 1) ? result.recordsets[0] : []
            , OPI_Detail: (req.body.Mode == 0) ? result.recordsets[1] : (req.body.Mode == 2 ? result.recordsets[0] : [])
            , OPI_Expense: (req.body.Mode == 0) ? result.recordsets[2] : (req.body.Mode == 3 ? result.recordsets[0] : [])
            , Commodity_Info: (req.body.Mode == 0) ? result.recordsets[3] : (req.body.Mode == 4 ? result.recordsets[0] : [])
         }
         res.send(DataSet);
      }).catch((err) => {
         console.log(err);
         res.status(500).send(err);
      })

});

//Maintain Order Proforma Invoice
router.post('/OPI_Maintain',  function (req, res, next) {
   console.log("Call OPI_Maintain Api:",req.body);

   // req.body.Mode === 0 表示新增
   // req.body.Mode === 1 表示修改 
   // req.body.Mode === 2 表示刪除
   // req.body.Mode === 3 表示訂單加入PI
   // req.body.Mode === 4 表示訂單移出PI
   // req.body.Mode === 5 表示重整PI訂單資訊
   // req.body.Mode === 6 表示整批加入PI
   req.body.PI_No = req.body.PI_No ? `N'${req.body.PI_No.trim().substring(0,15).replace(/'/g, "''")}'` : `''`; 

   if(req.body.Mode === 0 ) {
      req.body.Revised_From = req.body.Revised_From ? `N'${req.body.Revised_From.trim().substring(0,10).replace(/'/g, "''")}'` : `''`; 
      req.body.Season = req.body.Season ? `N'${req.body.Season.trim().substring(0,20).replace(/'/g, "''")}'` : `''`; 
      req.body.Date = req.body.Date ? `N'${req.body.Date.trim().substring(0,10).replace(/'/g, "''")}'` : `''`; 
      req.body.CustomerID = req.body.CustomerID ? `N'${req.body.CustomerID.trim().substring(0,15).replace(/'/g, "''")}'` : `''`; 
      req.body.Messrs = req.body.Messrs ? `N'${req.body.Messrs.trim().substring(0,100).replace(/'/g, "''")}'` : `''`; 
      req.body.Messrs_Address = req.body.Messrs_Address ? `N'${req.body.Messrs_Address.trim().substring(0,150).replace(/'/g, "''")}'` : `''`; 
      req.body.Rcv_Type = req.body.Rcv_Type ? `N'${req.body.Rcv_Type.trim().substring(0,4).replace(/'/g, "''")}'` : `'L/C'`; 
      req.body.Term_Price = req.body.Term_Price ? `N'${req.body.Term_Price.trim().substring(0,80).replace(/'/g, "''")}'` : `'FOB'`; 
      req.body.Expiry_Date = req.body.Expiry_Date ? `N'${req.body.Expiry_Date.trim().substring(0,10).replace(/'/g, "''")}'` : `''`; 
      req.body.Commodity = req.body.Commodity ? `N'${req.body.Commodity.trim().substring(0,100).replace(/'/g, "''")}'` : `'PRS OF SHOES'`; 
      req.body.Beneficiary = req.body.Beneficiary ? `N'${req.body.Beneficiary.trim().substring(0,10).replace(/'/g, "''")}'` : `''`; 
      req.body.Currency = req.body.Currency ? `N'${req.body.Currency.trim().substring(0,4).replace(/'/g, "''")}'` : `''`; 
   }

   if(req.body.Mode === 1 && 
      (req.body.Name == 'Season' || req.body.Name == 'Date' || req.body.Name == 'CustomerID'
      || req.body.Name == 'OrganizationID' 
      || req.body.Name == 'Rcv_Type' || req.body.Name == 'Term_Price' || req.body.Name == 'Expiry_Date' 
      || req.body.Name == 'Commodity' || req.body.Name == 'Beneficiary' || req.body.Name == 'Currency'
      || req.body.Name == 'Remark' || req.body.Name == 'Approve' )
      ) {
      req.body.Value = req.body.Value ? `N'${req.body.Value.trim().replace(/'/g, "''")}'` : `''`; 
   }

   if(req.body.Mode === 1 && 
      (req.body.Name == 'PI_No' || req.body.Name == 'Revised_From' || req.body.Name == 'Messrs'
      || req.body.Name == 'Messrs_Address' || req.body.Name == 'Payment_Term')
      ) {
      var Size = 0;
      switch(req.body.Name){
         case 'PI_No':
            Size = 15;
         break;
         case 'Revised_From':
            Size = 10;
         break;
         case 'Messrs':
            Size = 100;
         break;
         case 'Messrs_Address':
            Size = 256;
         break;
         case 'Payment_Term':
            Size = 50;
         break;
      }
      req.body.Value = req.body.Value ? `N'${req.body.Value.trim().substring(0,Size).replace(/'/g, "''")}'` : `''`;      
   }

   if(req.body.Mode === 3 || req.body.Mode === 4){
      req.body.Order_No = req.body.Order_No ? `N'${req.body.Order_No.trim().substring(0,18).replace(/'/g, "''")}'` : `''`; 
   }

   if(req.body.Mode === 6){
      req.body.QueryData = req.body.QueryData ? `N'${req.body.QueryData.trim().replace(/'/g, "''")}'` : `''`; 
   }
   
   var strSQL = 'Declare @ROWCOUNT int '
   switch(req.body.Mode){
      case 0:
         strSQL += format(`
            Declare @OrganizationID varchar(10), @Remark nvarchar(max)
            Declare @Messrs nvarchar(100), @Messrs_Address nvarchar(256), @ContactID int;

            Select @Messrs = c.Customer_Name, @Messrs_Address = c.Address
            From Customer c WITH (NoWait, Nolock) Where c.CustomerID = {CustomerID};
            Set @ContactID = (Select Top 1 ContactID From Customer_Contacts c WITH(NoWait, Nolock) Where c.CustomerID = {CustomerID}); 

            set @OrganizationID = (
               Select d.OrganizationID
               from Employee e 
                  Inner Join Department d on e.DepartmentID = d.DepartmentID
                  Inner Join aspnet_Users au on e.EmployeeID = au.EmployeeID
               Where au.LoweredUserName = N'${req.UserID}'
            );

            set @Remark = '1. IRREVOCABLE & TRANSFERABLE L/C.
2. PRESENTATION : WITHIN 21 DAYS AFTER B/L''S ON BOARD DATED.
3. TRANSSHIPMENT : ALLOWED.
4. PARTIAL SHIPMENTS : ALLOWED.
5. THE THIRD PARTY DOCUMENTS ACCEPTABLE.
6. FULL SET ORIGINAL OF CLEAN OF BILL OF LADING MADE OUT TO ORDER OF ISSUING 
   BANK MARKED FREIGHT COLLECT.
'
            Insert into [dbo].[OPI] (PI_No, Revised_From, Season, [Date], CustomerID, OrganizationID
            , Messrs, Messrs_Address, ContactID, Payment_Term, Rcv_Type, Rcv_Days, Term_Price, Expiry_Date
            , Commodity, Remark, Currency, UserID, Data_Update, Data_Updater  )
            Select {PI_No} as PI_No, {Revised_From} as Revised_From, {Season} as Season, GetDate() as [Date], {CustomerID} as CustomerID, @OrganizationID as OrganizationID
            , @Messrs as Messrs
            , @Messrs_Address as Messrs_Address
            , @ContactID as ContactID
            --, dbo.Get_Payment_Term('', {Rcv_Type}, 90, 0) as Payment_Term
            , '' as Payment_Term
            , {Rcv_Type} as Rcv_Type, 90 as Rcv_Days, {Term_Price} as Term_Price, GetDate() as Expiry_Date
            , {Commodity} as Commodity, @Remark as Remark, {Currency} as Currency            
            , N'${req.UserID}' as UserID, GetDate() as [Data_Update], N'${req.UserID}' as Data_Updater 
            Where (SELECT Count(*) as RecCount
            FROM [dbo].[OPI] With(Nolock,NoWait)
            where [PI_No] = {PI_No}) = 0 ; 
            Set @ROWCOUNT = @@ROWCOUNT;
         `, req.body);
         break;
      case 1:        
         strSQL += format(`
         ${ req.body.Name === 'CustomerID' ? `
         Declare @Messrs nvarchar(100), @Messrs_Address nvarchar(256), @ContactID int;
         Select @Messrs = c.Customer_Name, @Messrs_Address = c.Address
         From Customer c WITH (NoWait, Nolock) Where c.CustomerID = {Value};
         Set @ContactID = (Select Top 1 ContactID From Customer_Contacts c WITH(NoWait, Nolock) Where c.CustomerID = {Value});
         `:''}
            Update [dbo].[OPI] Set [{Name}] = {Value} 
            , UserID = isnull(UserID, N'${req.UserID}')
            , Data_Updater = N'${req.UserID}'
            , Data_Update = GetDate()
            ${ req.body.Name === 'CustomerID' ?  `, Messrs = @Messrs, Messrs_Address = @Messrs_Address, ContactID = @ContactID, Payment_Term = ''`:''}
            ${ req.body.Name === 'Rcv_Type' ?  `, Payment_Term = dbo.Get_Payment_Term(Payment_Term, {Value}, Rcv_Days, By_Doc_Rcv)  `:''}           
            ${ req.body.Name === 'Rcv_Days' ?  `, Payment_Term = dbo.Get_Payment_Term(Payment_Term, Rcv_Type, {Value}, By_Doc_Rcv)  `:''}           
            ${ req.body.Name === 'By_Doc_Rcv' ?  `, Payment_Term = dbo.Get_Payment_Term(Payment_Term, Rcv_Type, Rcv_Days, {Value})  `:''}           
            where PI_No = {PI_No}
            ${ req.body.Name === 'PI_No' ? ` And (SELECT Count(*) as RecCount FROM OPI as p WITH (NoWait, Nolock) Where p.PI_No = {Value}) = 0 ` : "" };
            Set @ROWCOUNT = @@ROWCOUNT;
         `, req.body);
         break;
      case 2:
         strSQL += format(`
            Delete FROM [dbo].[OPI] 
            where PI_No = {PI_No} 
            And (SELECT Count(*) as RecCount FROM Orders p WITH (NoWait, Nolock) Where p.PI_No = {PI_No}) = 0; 
            Set @ROWCOUNT = @@ROWCOUNT;
         `, req.body);
         break;
      case 3:
      case 4:
            strSQL += format(`
            Update Orders Set PI_No = ${ req.body.Mode == 3 ? '{PI_No}':'null' }
            Where Order_No = {Order_No};
            Set @ROWCOUNT = @@ROWCOUNT;
         `, req.body);      
         break;
      case 5:
            strSQL += format(`
            --Declare @PI_No varchar(15) = {PI_No};
            --Declare @S_Amount float, @Orig_Shipping_Date varchar(10), @Sum_Qty Float, @Order_Amount Float, @Fee_Amount float;
            --Declare @Order_Detail table(Order_DetailID int, Orig_Shipping_Date DateTime, Qty Float, Unit_Price Float)
            
            --Insert @Order_Detail
            --Select Order_DetailID, Orig_Shipping_Date, Qty, [Unit_Price]
            --From Orders o with(NoLock,NoWait)
            --Inner Join Order_Detail od with(NoLock,NoWait) on o.Order_No = od.Order_No
            --Where o.PI_No = @PI_No;
            
            --Set @S_Amount = isnull( (Select sum(od.Unit_Price * od.Qty * Rate) From @Order_Detail od Inner Join Order_Detail_Expense ode on od.Order_DetailID = ode.Order_DetailID and ode.Doc = 'PI'),0);
            --Set @Fee_Amount =	isnull( (Select sum(oe.Amount) From OPI_Expense oe Where oe.PI_No = @PI_No),0);
            
            --SELECT @Orig_Shipping_Date = isnull(convert(varchar(10), Dateadd(day,21,Max(od.Orig_Shipping_Date)),111), convert(varchar(10), GetDate(),111)), @Sum_Qty = Sum(od.Qty), @Order_Amount = Sum(([Unit_Price]*[Qty])) FROM @Order_Detail od;
          
            --Update OPI Set Commodity = Format(isnull(@Sum_Qty,0), 'N0') + ' PRS OF SHOES'
            --, Amount = isnull(@Order_Amount,0) + isnull(@S_Amount,0) + isnull(@Fee_Amount,0)
            --, Expiry_Date = @Orig_Shipping_Date
            --Where PI_No = @PI_No;


            Update OPI Set Expiry_Date = (
               SELECT isnull(convert(varchar(10), Dateadd(day,21,Max(od.Orig_Shipping_Date)),111), convert(varchar(10), GetDate(),111))
               From Orders o with(NoLock,NoWait)
               Inner Join Order_Detail od with(NoLock,NoWait) on o.Order_No = od.Order_No
               Where o.PI_No = {PI_No}
            )
            Where PI_No = {PI_No};
           
            Set @ROWCOUNT = @@ROWCOUNT;
      `, req.body);      
      break;
      case 6:
         strSQL += format(`
         Update Orders Set PI_No = {PI_No}
         From Orders s with(NoLock,NoWait)
         Inner Join OPI p with(NoLock,NoWait) on p.CustomerID = s.CustomerID And p.Season = s.Season And p.Currency = s.Currency And isnull(s.PI_No,'') = '' And p.PI_No = {PI_No}
           Where ({QueryData} = '' or charindex({QueryData}, isnull(Order_No,'') + ' ' + isnull(s.Season,'') + ' ' + isnull(Convert(varchar(10),Order_Date,111),'') + ' ' + isnull(s.UserID,'')) > 0);
 
         Set @ROWCOUNT = @@ROWCOUNT;
      `, req.body);         

      break;
   }

   strSQL += format(`
   Select @ROWCOUNT as Flag;
   Declare @Mode int = ${req.body.Mode}
   if(@ROWCOUNT > 0 and (@Mode = 3 or @Mode = 4 or @Mode = 5 or @Mode = 6))
   begin
      Update [dbo].[OPI] Set UserID = isnull(UserID, N'${req.UserID}')
      , Data_Updater = N'${req.UserID}'
      , Data_Update = GetDate()
      where PI_No = {PI_No}
   End         

   `, req.body);
   // console.log(strSQL)
   db.sql(req.SiteDB, strSQL)
      .then((result) => {
         //console.log(result.recordsets[0])
         res.send({Flag:result.recordsets[0][0].Flag > 0});
      }).catch((err) => {
         console.log(err);
         res.status(500).send(err);
      })

});

//Maintain OPI Expense
router.post('/OPI_Expense_Maintain',  function (req, res, next) {
   console.log("Call OPI_Expense_Maintain Api:",req.body);

   // req.body.Mode === 0 表示新增
   // req.body.Mode === 1 表示修改 
   // req.body.Mode === 2 表示刪除
   req.body.PI_No = req.body.PI_No ? `N'${req.body.PI_No.trim().substring(0,15).replace(/'/g, "''")}'` : `''`; 

   if(req.body.Mode === 0 ) {
      req.body.Description = req.body.Description ? `N'${req.body.Description.trim().substring(0,100).replace(/'/g, "''")}'` : `''`;       
      req.body.Amount = req.body.Amount ? req.body.Amount : 0;       
      req.body.Remark = req.body.Remark ? `N'${req.body.Remark.trim().replace(/'/g, "''")}'` : `''`; 
   }

   if(req.body.Mode === 1 && req.body.Name == 'Remark') {
      req.body.Value = req.body.Value ? `N'${req.body.Value.trim().replace(/'/g, "''")}'` : `''`;      
   }

   if(req.body.Mode === 1 && req.body.Name == 'Description' ) {
      var Size = 100;
      req.body.Value = req.body.Value ? `N'${req.body.Value.trim().substring(0,Size).replace(/'/g, "''")}'` : `''`;      
   }

   var strSQL = 'Declare @ROWCOUNT int; '
   switch(req.body.Mode){
      case 0:
         strSQL += format(`
            Insert into [dbo].[OPI_Expense] (PI_No, Description, Amount, Remark)
            Select {PI_No} as PI_No, {Description} as Description, {Amount} as Amount, {Remark} as Remark;
            Set @ROWCOUNT = @@ROWCOUNT;
         `, req.body);
         break;
      case 1:        
         strSQL += format(`     
            Update [dbo].[OPI_Expense] Set [{Name}] = {Value}
            where OPI_ExpenseID = {OPI_ExpenseID};
            Set @ROWCOUNT = @@ROWCOUNT;
         `, req.body);
         break;
      case 2:
         strSQL += format(`         
            Delete FROM [dbo].[OPI_Expense] 
            where OPI_ExpenseID = {OPI_ExpenseID}; 
            Set @ROWCOUNT = @@ROWCOUNT;
         `, req.body);      
         break;
   }

   strSQL += format(`
   Select @ROWCOUNT as Flag;   
   if(@ROWCOUNT > 0 )
   begin
      Update [dbo].[OPI] Set UserID = isnull(UserID, N'${req.UserID}')
      , Data_Updater = N'${req.UserID}'
      , Data_Update = GetDate()
      where PI_No = {PI_No}
   End 
   `, req.body);
    //console.log(strSQL)
   db.sql(req.SiteDB, strSQL)
      .then((result) => {
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