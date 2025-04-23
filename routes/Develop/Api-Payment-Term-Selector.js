const express = require('express');
const router = express.Router();
const format = require('string-format');
const db = require('../../config/DB_Connect');

/* Mark-Wang API Begin */

/* Mark-Wang API End */


/* Darren-Chang API Begin */

// Get Payment Term Data
router.post('/Payment_Info', function (req, res, next) {
  console.log("Call Payment_Info Api:", req.body);

  req.body.CustomerID = req.body.CustomerID ? `N'${req.body.CustomerID.trim().substring(0, 15).replace(/'/g, "''")}'` : `''`;
  req.body.Debit_No = req.body.Debit_No ? `N'${req.body.Debit_No.trim().substring(0, 20).replace(/'/g, "''")}'` : `''`;

  // req.body.Mode === 1 Debit RCV
  // req.body.Mode === 2 PDSP RCV
  // req.body.Mode === 3 PI Term of Payment
  req.body.Mode = req.body.Mode ? req.body.Mode : 0
  if (req.body.Mode === 1) req.body.Financial_Category = `N'Develop'`
  else if (req.body.Mode === 2 || req.body.Mode === 3) req.body.Financial_Category = `N'Sales'`

  let strSQL = format(`
    Select cpg.[Customer_Payment_GroupID], cpt.[Payment_Term]
    FROM [dbo].[Customer_Payment_Group] as cpg
    LEFT JOIN [dbo].[Customer_Payment_Term] as cpt ON cpt.[Customer_Payment_GroupID] = cpg.[Customer_Payment_GroupID]
    WHERE CustomerID = {CustomerID} AND cast(ABS(CASE WHEN cpg.[Financial_Approver] IS NOT NULL THEN 1 ELSE 0 END) as bit) = 1
    ${req.body.Mode ? `AND cpg.[Financial_Category] = {Financial_Category}` : ``}
    ORDER BY cpt.[Customer_Payment_TermID]
  `, req.body);

  // console.log(strSQL)
  db.sql(req.Enterprise, strSQL)
    .then((result) => {
      let groupedData = result.recordset.reduce(function (acc, item) {
        let existingItem = acc.find(function (group) {
          return group.Customer_Payment_GroupID === item.Customer_Payment_GroupID
        });

        if (existingItem) {
          existingItem.Payment_Term += "<br>" + item.Payment_Term
        } else {
          acc.push({
            "Customer_Payment_GroupID": item.Customer_Payment_GroupID,
            "Payment_Term": item.Payment_Term
          })
        }
        return acc
      }, [])
      res.send(groupedData);
    }).catch((err) => {
      console.log(err);
      res.status(500).send(err);
    })
});

// Payment Maintain
router.post('/Payment_Maintain', function (req, res, next) {
  console.log("Call Payment_Maintain Api:", req.body);

  // req.body.Mode === 1 Debit RCV
  // req.body.Mode === 2 PDSP RCV
  // req.body.Mode === 3 PI Term of Payment

  req.body.Debit_No = req.body.Debit_No ? `N'${req.body.Debit_No.trim().substring(0, 20).replace(/'/g, "''")}'` : `''`;
  req.body.Shipment_No = req.body.Shipment_No ? `N'${req.body.Shipment_No.trim().substring(0, 18).replace(/'/g, "''")}'` : `''`;
  req.body.PI_No = req.body.PI_No ? `N'${req.body.PI_No.trim().substring(0, 15).replace(/'/g, "''")}'` : `''`;

  let strSQL = `Declare @Accounting int = 0, @ROWCOUNT int = 0, @Balance_Amount float = 0, @Debit_Date AS DATETIME, @PDSP_Date AS DATETIME, @Doc_Completed AS DATETIME`

  if (req.body.Mode === 1) {
    strSQL += format(`
      DELETE FROM [dbo].[Money_Source] WHERE Source_No = {Debit_No} AND Subject = 'Debit RCV' AND MoneyID IS NULL
      Set @Balance_Amount = (Select Round(isnull(Amount,0),2) From Debit d with(Nolock,NoWait) Where d.Debit_No = {Debit_No}) - isnull((Select Sum(Round(isnull(Deposit,0),2)) From Money_Source c WITH (NoLock, NoWait) Where c.Source_No = {Debit_No} And Subject = 'Debit RCV'),0)
      Set @Debit_Date = (SELECT Debit_Date FROM Debit WHERE Debit_No = {Debit_No})
    `, req.body);
  } else if (req.body.Mode === 2) {
    strSQL += format(`
      DELETE FROM [dbo].[Money_Source] WHERE Source_No = {Shipment_No} AND Subject = 'PDSP RCV' AND MoneyID IS NULL
      Set @Balance_Amount = (Select Round(isnull(Rcv_Amount,0),2) From PDSP d with(Nolock,NoWait) Where d.Shipment_No = {Shipment_No}) - isnull((Select Sum(Round(isnull(Deposit,0),2)) From Money_Source c WITH (NoLock, NoWait) Where c.Source_No = {Shipment_No} And Subject = 'PDSP RCV'),0)
      SET @PDSP_Date = COALESCE((SELECT F_ETD FROM PDSP WHERE Shipment_No = {Shipment_No}), '')
      SET @Doc_Completed = COALESCE((SELECT Doc_Completed FROM PDSP WHERE Shipment_No = {Shipment_No}), '')
    `, req.body);
  }

  switch (req.body.Mode) {
    case 1:
      strSQL += format(`
        if(@Accounting = 0)
        begin   
          Insert into [dbo].[Money_Source] (Type, Days, By_Doc_Rcv, Deposit, Payment_Term, IsEOM, EOM_Day, Subject, Source_No, Description, Initial_Date, [Update_User] ,[Update_Date])
          Select 
          cpt.[Type],
          cpt.[Days],
          cpt.[By_Doc_Rcv],
          CAST(cpt.[Rate] * @Balance_Amount as MONEY) as Deposit,
          cpt.[Payment_Term],
          cpt.[IsEOM],
          cpt.[EOM_Day],
          'Debit RCV' as Subject,
          {Debit_No} as Source_No,
          CONCAT(cpt.[Rate] * 100, '%') as Description,
          @Debit_Date AS Initial_Date,
          N'${req.UserID}' as [Update_User],
          GetDate() as [Update_Date]
          FROM [dbo].[Customer_Payment_Group] as cpg
          LEFT JOIN [dbo].[Customer_Payment_Term] as cpt ON cpt.[Customer_Payment_GroupID] = cpg.[Customer_Payment_GroupID]
          WHERE cpt.Customer_Payment_GroupID = {Customer_Payment_GroupID}

          Set @ROWCOUNT = @@ROWCOUNT;
        end
        `, req.body);

      strSQL += format(`
        Select @ROWCOUNT as Flag;
        if(@ROWCOUNT > 0)
        Begin
          Update [dbo].[Debit] Set UserID = isnull(UserID, N'${req.UserID}'), Data_Updater = N'${req.UserID}', Data_Update = GetDate() where Debit_No = {Debit_No}
        End
      `, req.body);
      break;
    case 2:
      strSQL += format(`
        if(@Accounting = 0)
        begin   
          Insert into [dbo].[Money_Source] (Type, Days, By_Doc_Rcv, Deposit, Payment_Term, IsEOM, EOM_Day, Subject, Source_No, Description, Initial_Date, [Update_User] ,[Update_Date])
          Select 
          cpt.[Type],
          cpt.[Days],
          cpt.[By_Doc_Rcv],
          cast(cpt.[Rate] * @Balance_Amount as MONEY) as Deposit,
          cpt.[Payment_Term],
          cpt.[IsEOM],
          cpt.[EOM_Day],
          'PDSP RCV' as Subject,
          {Shipment_No} as Source_No,
          CONCAT(cpt.[Rate] * 100, '%') as Description,
          case 
            when cpt.[Type] = 'L/C' then NULL
            when ABS(isnull(cpt.By_Doc_Rcv,0)) = 0 then @PDSP_Date
            else @Doc_Completed
          End AS Initial_Date,
          N'${req.UserID}' as [Update_User],
          GetDate() as [Update_Date]
          FROM [dbo].[Customer_Payment_Group] as cpg
          LEFT JOIN [dbo].[Customer_Payment_Term] as cpt ON cpt.[Customer_Payment_GroupID] = cpg.[Customer_Payment_GroupID]
          WHERE cpt.Customer_Payment_GroupID = {Customer_Payment_GroupID}

          Set @ROWCOUNT = @@ROWCOUNT;
        end
      `, req.body);

      strSQL += format(`         
        Select @ROWCOUNT as Flag;   
        if(@ROWCOUNT > 0 )
        Begin
          Update [dbo].[PDSP] Set UserID = isnull(UserID, N'${req.UserID}'), Data_Updater = N'${req.UserID}', Data_Update = GetDate() where Shipment_No = {Shipment_No}
        End
      `, req.body);    
      break;
    case 3:
      strSQL += format(`
        Update [dbo].[OPI]
        SET Payment_Term = (
          SELECT STUFF((
                SELECT ', ' + CAST(cpt.[Rate] * 100 AS NVARCHAR(5)) + '% ' + cpt.[Payment_Term]
                FROM [dbo].[Customer_Payment_Term] AS cpt
                WHERE cpt.[Customer_Payment_GroupID] = cpg.[Customer_Payment_GroupID]
                FOR XML PATH('')
                ), 1, 2, '') AS Combined_Payment_Terms
          FROM [dbo].[Customer_Payment_Group] AS cpg
          WHERE cpg.[Customer_Payment_GroupID] = {Customer_Payment_GroupID}
          )
        WHERE PI_No = {PI_No}
        Set @ROWCOUNT = @@ROWCOUNT;
      `, req.body);

      strSQL += format(`
        Select @ROWCOUNT as Flag;
        if(@ROWCOUNT > 0)
        Begin
          Update [dbo].[OPI] Set Data_Updater = N'${req.UserID}', Data_Update = GetDate() where PI_No = {PI_No}
        End
      `, req.body);
      break;
  }

  // console.log(strSQL)
  // res.send({ Flag: true })
  db.sql(req.SiteDB, strSQL)
    .then((result) => {
      res.send({ Flag: result.recordsets[0][0].Flag > 0 });
    }).catch((err) => {
      console.log(err);
      res.status(500).send(err);
    })
});

/* Darren-Chang API End */

module.exports = router;