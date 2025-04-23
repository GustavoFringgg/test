const express = require('express');
const router = express.Router();
const format = require('string-format');
const db = require('../../config/DB_Connect');
var moment = require('moment');

/* Mark-Wang API Begin */

// Maintain Stock_In_Detail
router.post('/Stock_In_Detail_Maintain', function (req, res, next) {
  console.log("Call Stock_In_Detail_Maintain Api:", req.body);

  // req.body.Mode === 0 表示新增
  // req.body.Mode === 1 表示修改
  // req.body.Mode === 2 表示刪除
  req.body.Mode = req.body.Mode ? req.body.Mode : 0;
  req.body.Stock_In_No = req.body.Stock_In_No ? req.body.Stock_In_No : 0;
  let strSQL = format(`Declare @ROWCOUNT int = 0, @Mode int = {Mode}, @PD_In_Qty float = 0, @PD_Qty float = 0, @Purchase_DetailID int;


    `, req.body);

  switch (req.body.Mode) {
    case 0:
      req.body.Produce_No = req.body.Produce_No ? `N'${req.body.Produce_No.trim().substring(0, 20).replace(/'/g, "''")}'` : null;
      req.body.Purchase_DetailID = req.body.Purchase_DetailID ? req.body.Purchase_DetailID : null;
      req.body.Material_ColorID = req.body.Material_ColorID ? req.body.Material_ColorID : null;
      req.body.Unit_Price = req.body.Unit_Price ? req.body.Unit_Price : null;
      req.body.Warehouse_RankID = req.body.Warehouse_RankID ? req.body.Warehouse_RankID : 0;
      req.body.In_Qty = req.body.In_Qty ? req.body.In_Qty : null;
      req.body.Charge_Qty = req.body.Charge_Qty ? req.body.Charge_Qty : 0;

      strSQL += format(`
      Set @Purchase_DetailID = {Purchase_DetailID}

      UPDATE [Stock_In] 
      SET Purchase_Project_No = Stock_Info.Purchase_Project_No,
          Department = Stock_Info.Department,
          Purpose = Stock_Info.Purpose,
          SupplierID = Stock_Info.SupplierID,
          Currency = Stock_Info.Currency,
          Bill_NO = Stock_Info.Bill_NO
      FROM (
          SELECT pp.Purchase_Project_No, pp.Department, pp.Purpose, pd.SupplierID, pd.Currency, p.Bill_NO
          FROM [dbo].[Purchase_Detail] pd
          Inner Join Purchase_Project pp on pp.Purchase_Project_No = pd.Purchase_Project_No
          Inner Join Purchase p on p.Purchase_Project_No = pd.Purchase_Project_No
          Inner Join Stock_In si on si.WarehouseID = p.WarehouseID
          WHERE Purchase_DetailID = {Purchase_DetailID} AND si.Stock_In_No = {Stock_In_No}) AS Stock_Info
      WHERE
          Stock_In.Stock_In_No = {Stock_In_No} AND Stock_In.Purchase_Project_No is NULL
      
      INSERT INTO [dbo].[Stock_In_Detail] ([Stock_In_No], [Purchase_DetailID], [Material_ColorID], [Unit_Price], [Warehouse_RankID], [In_Qty], [Charge_Qty], [Produce_No]) 
      Select {Stock_In_No} as Stock_In_No, {Purchase_DetailID} as Purchase_DetailID, {Material_ColorID} as Material_ColorID, {Unit_Price} as Unit_Price, 
      {Warehouse_RankID} as Warehouse_RankID, {In_Qty} as In_Qty, {Charge_Qty} as Charge_Qty, {Produce_No} as Produce_No;

      Set @ROWCOUNT = @@ROWCOUNT;
        `, req.body);
      break;
    case 1:
      switch (req.body.Name) {
        case 'In_Qty':
        case 'Warehouse_RankID':
        case 'Charge_Qty':
        case 'Loss':
          req.body.Value = req.body.Value ? req.body.Value : 0;
          break;
        case 'Produce_No':
          req.body.Value = req.body.Value ? `N'${req.body.Value.trim().substring(0, 20).replace(/'/g, "''")}'` : `''`;
          break;
        default:
          req.body.Value = req.body.Value ? `N'${req.body.Value.trim().replace(/'/g, "''")}'` : `null`;
          break;
      }

      strSQL += format(`
      Select @PD_In_Qty = pd.Stock_In_Qty
      , @PD_Qty = pd.Qty
      , @Purchase_DetailID = sid.Purchase_DetailID
      From Stock_In_Detail sid
      Inner Join Purchase_Detail pd on sid.Purchase_DetailID = pd.Purchase_DetailID
      where Stock_In_DetailID = {Stock_In_DetailID} ;

      Update [dbo].[Stock_In_Detail] Set [{Name}] = {Value}
      ${req.body.Name == 'Produce_No' ? `, [In_Qty] = {In_Qty}` : ``}
      where Stock_In_DetailID = {Stock_In_DetailID}
      ${req.body.Name == 'In_Qty' ? `And (Select Stock_Qty - {Qty_Old} + {Value} From Stock_Detail With(NoLock,NoWait) Where Warehouse_RankID = {Warehouse_RankID} and Material_ColorID = {Material_ColorID} And Purchase_DetailID = @Purchase_DetailID) >= 0;` : ';'}
      
      Set @ROWCOUNT = @@ROWCOUNT;

      ${req.body.Name == 'Charge_Qty' ? `
      if(@ROWCOUNT > 0)
      Begin
        UPDATE [Stock_In_Detail] SET Charge_Qty = iif( In_Qty < Charge_Qty , In_Qty , Charge_Qty) 
        WHERE Stock_In_DetailID = {Stock_In_DetailID};
      End
      ` : ''}

      ${req.body.Name == 'In_Qty' ? `
      if(@ROWCOUNT > 0)
      Begin
        UPDATE [Stock_In_Detail] SET Loss = iif( In_Qty > @PD_Qty , 1 , 0 ) 
        , Charge_Qty = iif( In_Qty > @PD_Qty , @PD_Qty , In_Qty ) 
        WHERE Stock_In_DetailID = {Stock_In_DetailID};
      End
      ` : ''}


      ${req.body.Name == 'Loss'  ? `
         
      if(@ROWCOUNT > 0)
      Begin
        UPDATE [Stock_In_Detail] SET Charge_Qty = iif(ABS(Loss) =0, In_Qty, iif(Charge_Qty > (@PD_Qty - @PD_In_Qty) And (@PD_Qty - @PD_In_Qty) > 0, @PD_Qty - @PD_In_Qty, Charge_Qty )  )  
        WHERE Stock_In_DetailID = {Stock_In_DetailID};
      End
      ` : ''}
      
      `, req.body);
      break;
    case 2:
      strSQL += format(`
      Select @Purchase_DetailID = Purchase_DetailID from Stock_In_Detail sd where sd.Stock_In_DetailID = {Stock_In_DetailID} 

      Delete From [dbo].[Stock_In_Detail] 
      Where Stock_In_DetailID = {Stock_In_DetailID} 
      And (Select Bill_NO From Stock_In With(NoLock,NoWait) Where Stock_In_No = {Stock_In_No}) IS NULL
      And (Select Stock_Qty - {In_Qty} From Stock_Detail With(NoLock,NoWait) Where Warehouse_RankID = {Warehouse_RankID} and Material_ColorID = {Material_ColorID} And Purchase_DetailID = @Purchase_DetailID ) >= 0;

      Set @ROWCOUNT = @@ROWCOUNT;
      `, req.body);
      break;
  }
  strSQL += format(`
  if(@ROWCOUNT > 0)
  Begin
    UPDATE [Stock_In] SET Data_Updater = N'${req.UserID}', Data_Update = GetDate() WHERE Stock_In_No = {Stock_In_No};
  End
  Select @ROWCOUNT as Flag, @Purchase_DetailID as Purchase_DetailID;
  `, req.body);

   //console.log(strSQL)
  // if (req.body.Name === 'In_Qty' || req.body.Name === 'Warehouse_RankID' || req.body.Name === 'Produce_No' || req.body.Mode !== 1) {
  //   res.locals.Flag = true
  //   next();
  // } else {
  //   res.send({ Flag: false });
  // }
  db.sql(req.SiteDB, strSQL)
    .then((result) => {
      res.locals.Flag = result.recordsets[0][0].Flag > 0
      res.locals.Purchase_DetailID = result.recordsets[0][0].Purchase_DetailID;
      if (req.body.Name === 'In_Qty' || req.body.Name === 'Warehouse_RankID' || req.body.Name === 'Produce_No' || req.body.Mode !== 1) {
        next();
      } else {
        res.send({
          Flag: res.locals.Flag
        });
      }
    }).catch((err) => {
      console.log(err);
      res.status(500).send(err);
    })
}, function (req, res, next) {
  let strSQL = format(`Declare @ROWCOUNT int = 0, @Mode int = {Mode}; `, req.body);
  // StoreProcedure [dbo].[Update_Stock_Detail_Material_Qty]
  if (res.locals.Flag) {
    strSQL += format(`
    Declare @Rec_Count int

    if(@Mode=0) -- 新增入庫 > 代表庫存增加
    Begin
      Update Stock_Detail set Stock_Qty = Round(isnull(Stock_Qty,0) + (1 * isnull({Qty_New},0)),4), Update_Date = GetDate()
      From Stock_Detail sd
      Where sd.Material_ColorID = {Material_ColorID} and sd.Warehouse_RankID = {Warehouse_RankID_New} and sd.Purchase_DetailID = ${res.locals.Purchase_DetailID}
      And Round(isnull(Stock_Qty,0) + (1 * isnull({Qty_New},0)),4) >= 0
    end

    if(@Mode=1) -- 修改入庫數量 > 必須判斷與原先入庫數增減
    Begin
    ${req.body.Qty_New > req.body.Qty_Old ? // 入庫數增加 -> 跑第一段，庫存增加
      `
      Update Stock_Detail set Stock_Qty = Round(isnull(Stock_Qty,0) + (1 * isnull(${req.body.Qty_New - req.body.Qty_Old},0)),4), Update_Date = GetDate()
      From Stock_Detail sd
      Where sd.Material_ColorID = {Material_ColorID} and sd.Warehouse_RankID = {Warehouse_RankID_Old} and sd.Purchase_DetailID = ${res.locals.Purchase_DetailID}
      And Round(isnull(Stock_Qty,0) + (1 * isnull(${req.body.Qty_New - req.body.Qty_Old},0)),4) >= 0
      ` 
      : // 入庫數減少 -> 跑第二段，庫存減少
      `
      Update Stock_Detail set Stock_Qty = Round(isnull(Stock_Qty,0) - (1 * isnull(${req.body.Qty_Old - req.body.Qty_New},0)),4), Update_Date = GetDate()
      From Stock_Detail sd
      Where sd.Material_ColorID = {Material_ColorID} and sd.Warehouse_RankID = {Warehouse_RankID_New} and sd.Purchase_DetailID = ${res.locals.Purchase_DetailID}
      And Round(isnull(Stock_Qty,0) - (1 * isnull(${req.body.Qty_Old - req.body.Qty_New},0)),4) >= 0
      `
    }
    end

    if(@Mode=2) -- 刪除入庫 > 代表庫存減少
    Begin
      Update Stock_Detail set Stock_Qty = Round(isnull(Stock_Qty,0) - (1 * isnull({Qty_Old},0)),4), Update_Date = GetDate()
      From Stock_Detail sd
      Where sd.Material_ColorID = {Material_ColorID} and sd.Warehouse_RankID = {Warehouse_RankID_Old} and sd.Purchase_DetailID = ${res.locals.Purchase_DetailID}
      And Round(isnull(Stock_Qty,0) - (1 * isnull({Qty_Old},0)),4) >= 0
    end

    Select @Rec_Count = count(*) From Stock_Detail sd Where sd.Material_ColorID = {Material_ColorID} and sd.Warehouse_RankID = {Warehouse_RankID_New} and sd.Purchase_DetailID = ${res.locals.Purchase_DetailID}
    set @ROWCOUNT = @Rec_Count

    if(@Rec_Count = 0)
    Begin
      Insert into Stock_Detail(Material_ColorID, Warehouse_RankID, Stock_Qty, Update_Date, Purchase_DetailID )
      Select {Material_ColorID} as Material_ColorID, {Warehouse_RankID_New} as Warehouse_RankID, 1 * isnull({Qty_New},0) as Stock_Qty, GetDate() as Update_Date
      , ${res.locals.Purchase_DetailID} as Purchase_DetailID 
      set @ROWCOUNT = @@ROWCOUNT;
    End

    `, req.body);
  }
  strSQL += (`Select @ROWCOUNT as Flag;`)
  // console.log(strSQL)
  // res.send({Flag: false});

  db.sql(req.Enterprise, strSQL)
    .then((result) => {
      //console.log(result.recordsets[0])
      res.send({
        Flag: result.recordsets[0][0].Flag > 0
      });
    }).catch((err) => {
      console.log(err);
      res.status(500).send(err);
    })

});

// Batch Stock_In_Detail Maintain
router.post('/Batch_Stock_In_Detail_Maintain', function (req, res, next) {
  console.log("Call Batch_Stock_In_Detail_Maintain Api:", req.body);

  // req.body.Mode === 0 表示Stock In By Material
  // req.body.Mode === 1 表示Stock In By Purchase_Project_Qty
  // req.body.Mode === 2 表示Stock In only Master_Purchase_Item By Purchase_Project_Qty
  // req.body.Mode === 3 表示Stock In By Lot No
  req.body.Mode = req.body.Mode ? req.body.Mode : 0;
  req.body.Stock_In_No = req.body.Stock_In_No ? req.body.Stock_In_No : 0;
  req.body.QueryData = req.body.QueryData ? `${req.body.QueryData.trim().replace(/'/g, "''")}` : ``; 


  let strSQL = format(`Declare @ROWCOUNT int = 0, @ROWCOUNT1 int = 0, @ROWCOUNT2 int = 0, @Mode int = {Mode}, @Stock_In_No int = {Stock_In_No}
    , @Bill_No varchar(15), @PP_ACC_Amount int, @Purchase_Project_No varchar(15), @SupplierID nvarchar(15), @WarehouseID varchar(10);

    Select @Bill_No = isnull(si.Bill_No,'')
    , @Purchase_Project_No = si.Purchase_Project_No
    , @SupplierID = si.SupplierID
    , @WarehouseID = si.WarehouseID
    From Stock_In si with(NoLock,NoWait)
    Where si.Stock_In_No = @Stock_In_No;

    if ( (@Bill_No <> '') )
    Begin
      Select @ROWCOUNT + @ROWCOUNT1 as Flag
      return;
    End
    `, req.body);

  switch (req.body.Mode) {
    case 0:
      req.body.Material_ColorID = req.body.Material_ColorID ? req.body.Material_ColorID : null;
      req.body.Warehouse_RankID = req.body.Warehouse_RankID ? req.body.Warehouse_RankID : null;

      
      strSQL += format(`
        Insert Stock_Detail (Material_ColorID, Warehouse_RankID, Stock_Qty)
        Select ${req.body.Material_ColorID} as Material_ColorID, ${req.body.Warehouse_RankID} as Warehouse_RankID, 0 as Stock_Qty
        Where (select count(*) 
                From Stock_Detail 
                Where ${req.body.Material_ColorID} = Material_ColorID 
                  And ${req.body.Warehouse_RankID} = Warehouse_RankID ) = 0
        And ${req.body.Material_ColorID} is not null
        And ${req.body.Warehouse_RankID} is not null;

        INSERT INTO [dbo].[Stock_In_Detail] ([Stock_In_No], [Material_ColorID], [Unit_Price], [Warehouse_RankID], [In_Qty], [Charge_Qty]) 
        SELECT @Stock_In_No as Stock_In_No, mc.Material_ColorID, mc.Purchase_Price as Unit_Price, sd.Warehouse_RankID, 0 as In_Qty, 0 as Charge_Qty
        FROM Stock_Detail sd
        INNER JOIN Material_Color mc ON mc.Material_ColorID = sd.Material_ColorID
        Inner Join Material_Detail md on md.Material_DetailID = mc.Material_DetailID
        Inner Join Material m on md.MaterialID = m.MaterialID
        Inner Join Warehouse_Rank wr on wr.Warehouse_RankID = sd.Warehouse_RankID
        WHERE sd.Material_ColorID = ${req.body.Material_ColorID}
        And sd.Warehouse_RankID = ${req.body.Warehouse_RankID}
        And ('{QueryData}' = '' or charindex('{QueryData}', cast(isnull(mc.Material_ColorID,'') as varchar) + ' ' 
        + isnull(m.Material_Category,'') + ' ' + isnull(md.Material_Specific,'') + ' ' + isnull(mc.Material_Color,'') + ' ' 
        + isnull(wr.Rank_Name,'') + ' ' + isnull(mc.Currency,'') + ' ' + isnull(m.Unit,'') ) > 0)
        ORDER BY m.Material_Category, md.Material_Specific, mc.Material_Color;

        Set @ROWCOUNT = @@ROWCOUNT;
      `, req.body);
    break;
    case 1:
      req.body.Material_ColorID = req.body.Material_ColorID ? req.body.Material_ColorID : [];
      req.body.Purchase_DetailID = req.body.Purchase_DetailID ? req.body.Purchase_DetailID : [];
      req.body.isPending_Qty_Flag = req.body.isPending_Qty_Flag ? req.body.isPending_Qty_Flag : 1;

      strSQL += format(` Declare  @Country varchar(20) = (Select isnull(Country,'TAIWAN') From Control);
/*
        BEGIN TRANSACTION;
        BEGIN TRY
*/
          INSERT INTO Stock_In_Detail (Stock_In_No, Purchase_DetailID, Material_ColorID, Unit_Price
          , In_Qty, Charge_Qty, Warehouse_RankID)
          SELECT TOP 200 si.Stock_In_No
          , pd.Purchase_DetailID
          , pd.Material_ColorID
          , IIf(IsNull(pd.[Unit_Price],0)=0,0,pd.[Unit_Price]) AS Unit_Price
          , cast(IsNull(pd.[Qty],0)-IsNull(pd.[Stock_In_Qty],0) as Money) AS In_Qty
          , cast(IIf( abs(pd.[Master_Purchase_Item])=1,0, IsNull(pd.[Qty],0) - IsNull(pd.[Stock_In_Qty],0)) as Money) AS Charge_Qty
          , (Select top 1 mc.Warehouse_RankID From Warehouse_Rank mc Where mc.WarehouseID = si.WarehouseID And mc.Warehouse_RankID in (${req.body.Warehouse_RankID}) ) as Warehouse_RankID
          FROM Stock_In si
          INNER JOIN Purchase_Project pp ON si.Purchase_Project_No = pp.Purchase_Project_No
          Inner Join Purchase_Detail pd on pp.Purchase_Project_No = pd.Purchase_Project_No And si.SupplierID = pd.SupplierID and si.Currency = pd.Currency
          Inner Join Material_Color mc on pd.Material_ColorID = mc.Material_ColorID
          INNER JOIN Purchase p ON pd.Purchase_No = p.Purchase_No and p.WarehouseID = si.WarehouseID
          WHERE Stock_In_No = @Stock_In_No
          And pd.Project_Qty <>0 
          And ({isPending_Qty_Flag} = 0 or IsNull([Qty],0)-IsNull([Stock_In_Qty],0) > 0)
          AND (pd.Close_Date Is Null) 
          AND (pp.ACC_Close Is Null) 
          AND (pp.Close_Date Is Null)
          And pd.Purchase_DetailID in (${req.body.Purchase_DetailID})         
          And ('{QueryData}' = '' or charindex('{QueryData}', isnull(pd.SupplierID,'') + ' ' + cast(isnull(pd.Material_ColorID,'') as varchar) 
          + ' ' + isnull(pd.Material_Category,'') + ' ' + isnull(pd.Material_Specific,'') + ' ' + isnull(pd.Material_Color,'') + ' ' + isnull(pd.M_Rmk,'') 
          + ' ' + cast(isnull(pd.Purchase_DetailID,0) as varchar) + ' ' + isnull(pd.Unit,'') 
          + ' ' + isnull(pd.Currency,'') 
          ) > 0)
          ORDER BY [Material_Category] + ' ' + [Material_Specific] + ' ' + pd.Material_Color + ' ' + [M_Rmk];
              
          Set @ROWCOUNT = @@ROWCOUNT;

/*
          COMMIT;
        END TRY
        BEGIN CATCH
           Select @ROWCOUNT = 0, @ROWCOUNT1 = 0;
           ROLLBACK;
        END CATCH
*/    
        `, req.body);
    break;
    case 2:
      req.body.Material_ColorID = req.body.Material_ColorID ? req.body.Material_ColorID : [];
      req.body.Purchase_DetailID = req.body.Purchase_DetailID ? req.body.Purchase_DetailID : [];
      req.body.isPending_Qty_Flag = req.body.isPending_Qty_Flag ? req.body.isPending_Qty_Flag : 0;

      strSQL += format(` Declare  @Country varchar(20) = (Select isnull(Country,'TAIWAN') From Control);
/*
        BEGIN TRANSACTION;
        BEGIN TRY
*/
          INSERT INTO Stock_In_Detail (Stock_In_No, Purchase_DetailID, Material_ColorID, Unit_Price
          , In_Qty, Charge_Qty, Warehouse_RankID)
          SELECT TOP 200 si.Stock_In_No
          , pd.Purchase_DetailID
          , pd.Material_ColorID
          , IIf(IsNull(pd.[Unit_Price],0)=0,0,pd.[Unit_Price]) AS Unit_Price
          , cast(IIf(IsNull(pd.[Project_Qty],0)-IsNull(pd.[Stock_In_Qty],0) >0,IsNull(pd.[Project_Qty],0)-IsNull(pd.[Stock_In_Qty],0),0) as Money)  AS In_Qty
          , cast(IIf(abs(pd.[Master_Purchase_Item])=1,0, IsNull(pd.[Qty],0) - IsNull(pd.[Stock_In_Qty],0)) as Money) AS Charge_Qty
          , (Select top 1 mc.Warehouse_RankID From Warehouse_Rank mc Where mc.WarehouseID = si.WarehouseID And mc.Warehouse_RankID in (${req.body.Warehouse_RankID}) ) as Warehouse_RankID
          FROM Stock_In si
          INNER JOIN Purchase_Project pp ON si.Purchase_Project_No = pp.Purchase_Project_No
          Inner Join Purchase_Detail pd on pp.Purchase_Project_No = pd.Purchase_Project_No And si.SupplierID = pd.SupplierID and si.Currency = pd.Currency
          Inner Join Material_Color mc on pd.Material_ColorID = mc.Material_ColorID
          WHERE Stock_In_No = @Stock_In_No
          And (pd.Project_Qty <> 0) 
          AND (ABS(pd.Master_Purchase_Item)=1) 
          AND (pd.Close_Date Is Null) 
          AND (pp.ACC_Close Is Null) 
          AND (pp.Close_Date Is Null) 
          AND ((Abs([Unpurchase]))<>1)
          And pd.Purchase_DetailID in (${req.body.Purchase_DetailID})
          And ('{QueryData}' = '' or charindex('{QueryData}', isnull(pd.SupplierID,'') + ' ' + cast(isnull(pd.Material_ColorID,'') as varchar) 
          + ' ' + isnull(pd.Material_Category,'') + ' ' + isnull(pd.Material_Specific,'') + ' ' + isnull(pd.Material_Color,'') + ' ' + isnull(pd.M_Rmk,'') 
          + ' ' + cast(isnull(pd.Purchase_DetailID,0) as varchar) + ' ' + isnull(pd.Unit,'') 
          + ' ' + isnull(pd.Currency,'') 
          ) > 0)
          ORDER BY [Material_Category] + ' ' + [Material_Specific] + ' ' + pd.Material_Color + ' ' + [M_Rmk];
              
          Set @ROWCOUNT = @@ROWCOUNT;

/*
          COMMIT;
        END TRY
        BEGIN CATCH
           Select @ROWCOUNT = 0, @ROWCOUNT1 = 0;
           ROLLBACK;
        END CATCH
*/
        `, req.body);
    break;
    case 3:
      req.body.Material_ColorID = req.body.Material_ColorID ? req.body.Material_ColorID : [];
      req.body.Purchase_DetailID = req.body.Purchase_DetailID ? req.body.Purchase_DetailID : [];
      req.body.isPending_Qty_Flag = req.body.isPending_Qty_Flag ? req.body.isPending_Qty_Flag : 0;

      strSQL += format(` Declare  @Country varchar(20) = (Select isnull(Country,'TAIWAN') From Control);
/*
        BEGIN TRANSACTION;
        BEGIN TRY
*/
          INSERT INTO Stock_In_Detail (Stock_In_No, Purchase_DetailID, Material_ColorID, Unit_Price
          , In_Qty, Charge_Qty, Warehouse_RankID)
          SELECT TOP 200 si.Stock_In_No
          , pd.Purchase_DetailID
          , pd.Material_ColorID
          , IIf(IsNull(pd.[Unit_Price],0)=0,0,pd.[Unit_Price]) AS Unit_Price
          , Round(isnull(case when pd.Purchase_No is null then isnull(pd.Project_Qty,0) else (case when pds.Produce_No is null then isnull(pd.Qty,0) else isnull(pds.Qty,0) end) end, 0) - isnull(case when pds.Produce_No is null then isnull(pd.Stock_In_Qty,0) else isnull(pds.In_Qty,0) end,0),2) AS In_Qty
          , Round(isnull(case when pd.Purchase_No is null then isnull(pd.Project_Qty,0) else (case when pds.Produce_No is null then isnull(pd.Qty,0) else isnull(pds.Qty,0) end) end, 0) - isnull(case when pds.Produce_No is null then isnull(pd.Stock_In_Qty,0) else isnull(pds.In_Qty,0) end,0),2) AS Charge_Qty
          , (Select top 1 mc.Warehouse_RankID From Warehouse_Rank mc Where mc.WarehouseID = si.WarehouseID And mc.Warehouse_RankID in (${req.body.Warehouse_RankID}) ) as Warehouse_RankID
          From Stock_In si 
          Inner Join Purchase p on p.WarehouseID = si.WarehouseID 
          Inner Join Purchase_Project pp on pp.Purchase_Project_No = p.Purchase_Project_No
          Inner Join Purchase_Detail pd on pd.Purchase_Project_No = pp.Purchase_Project_No And pd.Purchase_No = p.Purchase_No
          And si.SupplierID = pd.SupplierID and si.Currency = pd.Currency and si.Purchase_Project_No = pp.Purchase_Project_No
          Inner Join Material_Color mc on pd.Material_ColorID = mc.Material_ColorID
          Inner Join Purchase_Detail_Sub pds on pds.Purchase_DetailID = pd.Purchase_DetailID
          Where si.Stock_In_No = @Stock_In_No
          And pp.ACC_Close is null 
          And pp.Close_Date is null
          And pd.Close_Date is null
          And ((isnull(case when pd.Purchase_No is null then pd.Project_Qty else pd.Qty end, 0) - isnull(pd.Stock_In_Qty, 0)) > 0 )
          And (Round(isnull(case when pd.Purchase_No is null then pd.Project_Qty else (case when pds.Produce_No is null then pd.Qty else pds.Qty end) end, 0) - isnull(case when pds.Produce_No is null then pd.Stock_In_Qty else pds.In_Qty end,0),2) > 0)
          And (pd.Purchase_No is null or (pd.Purchase_No is not null and p.WarehouseID = si.WarehouseID ))
          And ((Len(isnull(si.Bill_NO,'')) = 0 and p.Bill_No is null) or (Len(isnull(si.Bill_NO,'')) > 0 And si.Bill_No = p.Bill_No))
          And pd.Purchase_DetailID in (${req.body.Purchase_DetailID})
          And ('{QueryData}' = '' or charindex('{QueryData}', cast(isnull(pd.Purchase_DetailID,'') as varchar) + ' ' 
          + cast(isnull(pd.Material_ColorID,'') as varchar) + ' ' + isnull(pd.Unit,'') + ' '
          + isnull(pd.Material_Category,'') + ' ' + isnull(pd.Material_Specific,'') + ' ' + isnull(pd.Material_Color,'') ) > 0)
          ORDER BY CONCAT(Material_Category, ' ', Material_Specific, ' ', pd.Material_Color, ' ', M_Rmk);
              
          Set @ROWCOUNT = @@ROWCOUNT;

/*
          COMMIT;
        END TRY
        BEGIN CATCH
           Select @ROWCOUNT = 0, @ROWCOUNT1 = 0;
           ROLLBACK;
        END CATCH
*/
        `, req.body);
    break;
  }
  strSQL += format(`
    if(@ROWCOUNT > 0 and (@Mode <> 0) )
    Begin 
      Declare @tmp_In table(Material_ColorID int, Warehouse_RankID int, In_Qty float, Purchase_DetailID int)
      Declare @tmp_Out table(Material_ColorID int, Warehouse_RankID int, Out_Qty float)

      Insert @tmp_In (Material_ColorID, Warehouse_RankID, In_Qty, Purchase_DetailID) 
      Select sd.Material_ColorID, sd.Warehouse_RankID, sum(sd.In_Qty) as In_Qty, sd.Purchase_DetailID
      From Stock_In_Detail sd
      Where sd.Material_ColorID in (${req.body.Material_ColorID})
      And sd.Warehouse_RankID in (${req.body.Warehouse_RankID})
      And sd.Purchase_DetailID in (${req.body.Purchase_DetailID})   
      Group by sd.Material_ColorID, sd.Warehouse_RankID, sd.Purchase_DetailID
      
      Insert @tmp_Out (Material_ColorID, Warehouse_RankID, Out_Qty) 
      Select sd.Material_ColorID, sd.Warehouse_RankID, sum(sd.Out_Qty) as Out_Qty
      From Stock_Out_Detail sd
      Where sd.Material_ColorID in (${req.body.Material_ColorID})
      And sd.Warehouse_RankID in (${req.body.Warehouse_RankID})
      And sd.Purchase_DetailID in (${req.body.Purchase_DetailID})   
      Group by sd.Material_ColorID, sd.Warehouse_RankID
      
      Update Stock_Detail set Stock_Qty = cast((isnull(i.In_Qty,0) - isnull(o.Out_Qty,0)) as money)
      , Update_Date = GetDate()
      From Stock_Detail sd
      Left Outer Join @tmp_In i on i.Material_ColorID = sd.Material_ColorID and i.Warehouse_RankID = sd.Warehouse_RankID
      Left Outer Join @tmp_Out o on o.Material_ColorID = sd.Material_ColorID and o.Warehouse_RankID = sd.Warehouse_RankID
      Where sd.Material_ColorID in (${req.body.Material_ColorID})
      And sd.Warehouse_RankID in (${req.body.Warehouse_RankID})
      And sd.Purchase_DetailID in (${req.body.Purchase_DetailID})   
      
      Set @ROWCOUNT1 = @@ROWCOUNT;

      Insert Stock_Detail (Material_ColorID, Warehouse_RankID, Stock_Qty, Purchase_DetailID)
      Select i.Material_ColorID,  i.Warehouse_RankID, cast((isnull(i.In_Qty,0) - isnull(o.Out_Qty,0)) as money) as Stock_Qty, i.Purchase_DetailID
      From @tmp_In i
      Left Outer Join Stock_Detail sd on i.Material_ColorID = sd.Material_ColorID and i.Warehouse_RankID = sd.Warehouse_RankID And i.Purchase_DetailID = sd.Purchase_DetailID
      left Outer Join @tmp_Out o on o.Material_ColorID = sd.Material_ColorID and o.Warehouse_RankID = sd.Warehouse_RankID
      Where sd.Material_ColorID is null and sd.Warehouse_RankID is null;

      Set @ROWCOUNT2 = @@ROWCOUNT;
    End

    if(@ROWCOUNT + @ROWCOUNT1 + @ROWCOUNT2 > 0)
    Begin
      UPDATE [Stock_In] SET Data_Updater = N'${req.UserID}', Data_Update = GetDate() WHERE Stock_In_No = {Stock_In_No};
    End
    Select @ROWCOUNT + @ROWCOUNT1 + @ROWCOUNT2 as Flag;
  `, req.body);

   //console.log(strSQL)
   //res.send({ Flag: true });

  db.sql(req.SiteDB, strSQL)
    .then((result) => {
      res.send({ Flag: result.recordsets[0][0].Flag > 0 });
    }).catch((err) => {
      console.log(err);
      res.status(500).send(err);
    })

});

// Get Stock_In_Detail_Add_List
router.post('/Stock_In_Detail_Add_List', function (req, res, next) {
  console.log("Call Stock_In_Detail_Add_List Api:", req.body);

  req.body.Stock_In_No = req.body.Stock_In_No ? req.body.Stock_In_No : 'null';
  req.body.Mode = req.body.Mode ? req.body.Mode : 0;
  req.body.QueryData = req.body.QueryData ? req.body.QueryData.replace(/'/g, "''") : '';
  
  // req.body.Mode === 0 表示一般品項入庫
  // req.body.Mode === 1 表示由採購來源入庫
  // req.body.Mode === 2 表示由採購來源使用材料主品項入庫
  // req.body.Mode === 3 表示由採購來源使用製造令入庫

  let strSQL = format(`Declare @Mode int = {Mode}, @Purchase_Project_No varchar(15), @WarehouseID varchar(10), @SupplierID nvarchar(15), @Currency varchar(4)
    , @Bill_No varchar(15), @Warehouse_RankID int;

  Select @Purchase_Project_No = isnull(Purchase_Project_No,'')
  , @WarehouseID = WarehouseID
  , @SupplierID = SupplierID
  , @Currency = Currency
  , @Bill_No = isnull(Bill_No,'')
  , @Warehouse_RankID = (Select Top 1 Warehouse_RankID From Warehouse_Rank wr with(NoLock,NoWait) where wr.WarehouseID = s.WarehouseID)
  From Stock_In s 
  where s.Stock_In_No = {Stock_In_No};

if(@Mode = 0)
  Begin
    SELECT Top 200 
    '' as Query
    , mc.SupplierID, m.MaterialID, m.Material_ControlID, md.Material_DetailID, mc.Material_ColorID
    , m.Material_Category, md.Material_Specific, mc.Material_Color
    , isnull(m.Material_Category,'') + ' ' + isnull(md.Material_Specific,'') + ' ' + isnull(mc.Material_Color,'') as Material
    , mc.Unit_Price, mc.Purchase_Price
    , m.Unit, m.History_Date, md.History_Date, CAST(ABS(isnull(mc.Composite,0)) AS int) AS Composite_Flag, isnull(mc.Stock_Qty,0) as Stock_Qty
    , (Select Top 1 Warehouse_RankID From Warehouse_Rank wr with(NoLock,NoWait) where wr.WarehouseID = @WarehouseID) as Warehouse_RankID
    FROM Material_Color mc with(NoLock,NoWait)
    INNER JOIN Material_Detail md with(NoLock,NoWait) ON mc.Material_DetailID = md.Material_DetailID
    INNER JOIN Material m with(NoLock,NoWait) ON md.MaterialID = m.MaterialID
    WHERE m.History_Date Is Null 
    AND md.History_Date Is Null
    And mc.SupplierID = @SupplierID
    And mc.Currency = @Currency
    And ('{QueryData}' = '' or charindex('{QueryData}', cast(isnull(mc.Material_ColorID,'') as varchar) + ' ' + isnull(m.Unit,'') + ' '
    + isnull(m.Material_Category,'') + ' ' + isnull(md.Material_Specific,'') + ' ' + isnull(mc.Material_Color,'') ) > 0)
    ORDER BY  m.Material_Category, md.Material_Specific, mc.Material_Color;
  End

  if(@Mode = 1)
  Begin
    Select TOP(200) ROW_NUMBER() OVER(ORDER BY pd.Purchase_DetailID,pd.Material_ColorID) AS Rec, '' as flag, pd.Purchase_DetailID, pd.Material_ColorID
    , pd.Material_Category, pd.Material_Specific
    , isnull(pd.Material_Category,'') + ' ' + isnull(pd.Material_Specific,'') + ' ' + isnull(pd.Material_Color,'') as Material
    , pd.SupplierID,
    (Select Top 1 Warehouse_RankID From Warehouse_Rank wr With(NoLock,NoWait) Where wr.WarehouseID = @WarehouseID) as Warehouse_RankID, si.WarehouseID,
    pd.Material_Color, isnull(pd.Project_Qty,0) as Project_Qty
    , isnull(case when pd.Purchase_No is null then isnull(pd.Project_Qty,0) else isnull(pd.Qty,0) end, 0) - isnull(pd.Stock_In_Qty, 0) as Pending_Qty,
    pd.Currency, pd.Unit_Price, pd.M_Rmk, pp.Purchase_Project_No, '' as Produce_No
    From Stock_In si 
    Inner Join Purchase p on p.WarehouseID = si.WarehouseID And si.SupplierID = p.SupplierID and si.Currency = p.Currency and si.Purchase_Project_No = p.Purchase_Project_No
    Inner Join Purchase_Project pp on pp.Purchase_Project_No = p.Purchase_Project_No
    Inner Join Purchase_Detail pd on pd.Purchase_Project_No = pp.Purchase_Project_No And pd.Purchase_No = p.Purchase_No
    Inner Join Material_Color mc on pd.Material_ColorID = mc.Material_ColorID
    And pd.SupplierID = p.SupplierID and pd.Currency = p.Currency and pd.Purchase_Project_No = p.Purchase_Project_No
    Where si.Stock_In_No = {Stock_In_No} 
    And pp.ACC_Close is null 
    And pp.Close_Date is null
    And pd.Close_Date is null 
    --And (Round(isnull(case when pd.Purchase_No is null then isnull(pd.Project_Qty,0) else isnull(pd.Qty,0) end, 0) - isnull(pd.Stock_In_Qty, 0), 0) > 0 )
    And ((isnull(case when pd.Purchase_No is null then isnull(pd.Project_Qty,0) else isnull(pd.Qty,0) end, 0) - isnull(pd.Stock_In_Qty, 0)) > 0 )
    And (pd.Purchase_No is null or (pd.Purchase_No is not null and p.WarehouseID = si.WarehouseID ))
    And ((Len(isnull(si.Bill_NO,'')) = 0 and p.Bill_No is null) or (Len(isnull(si.Bill_NO,'')) > 0 And si.Bill_No = p.Bill_No))
    And ('{QueryData}' = '' or charindex('{QueryData}', cast(isnull(pd.Purchase_DetailID,'') as varchar) + ' ' 
    + cast(isnull(pd.Material_ColorID,'') as varchar) + ' ' + isnull(pd.Unit,'') + ' '
    + isnull(pd.Material_Category,'') + ' ' + isnull(pd.Material_Specific,'') + ' ' + isnull(pd.Material_Color,'') ) > 0)
  End

  if(@Mode = 2)
  Begin
    SELECT TOP 200 pd.SupplierID
    , '' as flag
    , pd.Purchase_DetailID
    , pd.Purchase_Project_No
    , pd.Material_ColorID
    , pd.Sub_Purchase_Item
    , IIf(IsNull([pd].[Unit_Price],0)=0,0,[pd].[Unit_Price]) AS Unit_Price
    , pd.Memo, isnull([Material_Category],'') + ' ' + isnull([Material_Specific],'') + ' ' + isnull(pd.Material_Color,'') + ' ' + isnull([M_Rmk],'') AS Material
    , (Select Top 1 Warehouse_RankID From Warehouse_Rank wr With(NoLock,NoWait) Where wr.WarehouseID = @WarehouseID) as Warehouse_RankID
    , IsNull([Project_Qty],0) as Project_Qty, IsNull([Stock_In_Qty],0) as Stock_In_Qty
    , pd.Master_Purchase_Item, pd.Master_Purchase_Item
    , IIf(ABS([Master_Purchase_Item])=1,IsNull([Project_Qty],0), IsNull([Project_Qty],0)-IsNull([Stock_In_Qty],0)) AS Qty_Not_Stock_In
    , pd.Close_Date, pp.ACC_Close, pp.Close_Date
    , IIf(ABS([Master_Purchase_Item])=1, 0, IsNull([Qty],0)-IsNull([Stock_In_Qty],0)) AS MCharge_In
    , pd.Master_Purchase_DetailID, pd.Currency
    FROM Stock_In si 
    Inner Join Purchase_Detail pd on si.Purchase_Project_No = pd.Purchase_Project_No And si.SupplierID = pd.SupplierID And si.Currency = pd.Currency
    Inner Join Material_Color mc on pd.Material_ColorID = mc.Material_ColorID
    INNER JOIN Purchase_Project pp ON si.Purchase_Project_No = pp.Purchase_Project_No
    WHERE si.Stock_In_No = {Stock_In_No} 
    And (IsNull([Project_Qty],0) <> 0) 
    AND (ABS(pd.Master_Purchase_Item)=1) 
    AND (pd.Close_Date Is Null) 
    AND (pp.ACC_Close Is Null) 
    AND (pp.Close_Date Is Null) 
    AND ((Abs([Unpurchase]))<>1)
    And ('{QueryData}' = '' or charindex('{QueryData}', cast(isnull(pd.Purchase_DetailID,'') as varchar) + ' ' 
    + cast(isnull(pd.Material_ColorID,'') as varchar) + ' ' + isnull(pd.Unit,'') + ' '
    + isnull(pd.Material_Category,'') + ' ' + isnull(pd.Material_Specific,'') + ' ' + isnull(pd.Material_Color,'') ) > 0)
    ORDER BY [Material_Category] + ' ' + [Material_Specific] + ' ' + pd.Material_Color + ' ' + [M_Rmk];    
  End
  if(@Mode = 3)
  Begin
    Select TOP(100) ROW_NUMBER() OVER(ORDER BY pd.Purchase_DetailID,pd.Material_ColorID) AS Rec, '' as flag, pd.Purchase_DetailID, pd.Material_ColorID, 
    pd.Material_Category, pd.Material_Specific, pd.SupplierID,
    isnull(pd.Material_Category,'') + ' ' + isnull(pd.Material_Specific,'') + ' ' + isnull(pd.Material_Color,'') as Material,
    (Select Top 1 Warehouse_RankID From Warehouse_Rank wr Where wr.WarehouseID = @WarehouseID) as Warehouse_RankID, si.WarehouseID,
    pd.Material_Color, isnull(pd.Project_Qty,0) as Project_Qty, pds.Produce_No,
    Round(isnull(case when pd.Purchase_No is null then isnull(pd.Project_Qty,0) else (case when pds.Produce_No is null then isnull(pd.Qty,0) else isnull(pds.Qty,0) end) end, 0) - isnull(case when pds.Produce_No is null then isnull(pd.Stock_In_Qty,0) else isnull(pds.In_Qty,0) end,0),2) as Pending_Qty,
    isnull(case when pd.Purchase_No is null then isnull(pd.Project_Qty,0) else (case when pds.Produce_No is null then isnull(pd.Qty,0) else isnull(pds.Qty,0) end) end, 0) - isnull(case when pds.Produce_No is null then isnull(pd.Stock_In_Qty,0) else isnull(pds.In_Qty,0) end,0) as Floating_Qty,
    pd.Currency, pd.Unit_Price, pd.M_Rmk, pp.Purchase_Project_No
    From Stock_In si 
    Inner Join Purchase p on p.WarehouseID = si.WarehouseID 
    Inner Join Purchase_Project pp on pp.Purchase_Project_No = p.Purchase_Project_No
    Inner Join Purchase_Detail pd on pd.Purchase_Project_No = pp.Purchase_Project_No And pd.Purchase_No = p.Purchase_No
    And si.SupplierID = pd.SupplierID and si.Currency = pd.Currency and si.Purchase_Project_No = pp.Purchase_Project_No
    Inner Join Material_Color mc on pd.Material_ColorID = mc.Material_ColorID
    Inner Join Purchase_Detail_Sub pds on pds.Purchase_DetailID = pd.Purchase_DetailID
    Where si.Stock_In_No = {Stock_In_No} 
    And pp.ACC_Close is null 
    And pp.Close_Date is null
    And pd.Close_Date is null
    And ((isnull(case when pd.Purchase_No is null then pd.Project_Qty else pd.Qty end, 0) - isnull(pd.Stock_In_Qty, 0)) > 0 )
    And (Round(isnull(case when pd.Purchase_No is null then pd.Project_Qty else (case when pds.Produce_No is null then pd.Qty else pds.Qty end) end, 0) - isnull(case when pds.Produce_No is null then pd.Stock_In_Qty else pds.In_Qty end,0),2) > 0)
    And (pd.Purchase_No is null or (pd.Purchase_No is not null and p.WarehouseID = si.WarehouseID ))
    And ((Len(isnull(si.Bill_NO,'')) = 0 and p.Bill_No is null) or (Len(isnull(si.Bill_NO,'')) > 0 And si.Bill_No = p.Bill_No))
    And ('{QueryData}' = '' or charindex('{QueryData}', cast(isnull(pd.Purchase_DetailID,'') as varchar) + ' ' 
    + cast(isnull(pd.Material_ColorID,'') as varchar) + ' ' + isnull(pd.Unit,'') + ' '
    + isnull(pd.Material_Category,'') + ' ' + isnull(pd.Material_Specific,'') + ' ' + isnull(pd.Material_Color,'') ) > 0)
    ORDER BY CONCAT(Material_Category, ' ', Material_Specific, ' ', pd.Material_Color, ' ', M_Rmk);
  End
  `, req.body);
   //console.log(strSQL)
  db.sql(req.SiteDB, strSQL)
    .then((result) => {
      res.send({
        Detail_Add_List: result.recordsets[0]
      });
    }).catch((err) => {
      console.log(err);
      res.status(500).send(err);
    })
});

// Maintain Stock_Out_Detail
router.post('/Stock_Out_Detail_Maintain', function (req, res, next) {
  console.log("Call Stock_Out_Detail_Maintain Api:", req.body);

  // req.body.Mode === 0 表示新增
  // req.body.Mode === 1 表示修改
  // req.body.Mode === 2 表示刪除
  req.body.Stock_Out_No = req.body.Stock_Out_No ? req.body.Stock_Out_No : 0;
  let strSQL = format(`Declare @ROWCOUNT int = 0, @Mode int = {Mode}, @Stock_Out_No int = {Stock_Out_No}, @MPI_No varchar(15), @PP_ACC_Amount int, @Purchase_DetailID int;
    Select @MPI_No = isnull(so.MPI_No,'')
    , @PP_ACC_Amount = isnull(acc.PP_ACC_Amount,0)
    From Stock_Out so with(NoLock,NoWait)
    Left Outer Join PP_ACC_Amount acc with(NoLock,NoWait) on acc.Stock_Out_No = so.Stock_Out_No
    Where so.Stock_Out_No = @Stock_Out_No;

    Select @Purchase_DetailID = Purchase_DetailID 
    From Stock_Out_Detail 
    Where Stock_Out_DetailID = {Stock_Out_DetailID};

    if ( ( @MPI_No <> '' And (@Mode = 0 or @Mode = 2) )
      or ( @MPI_No <> '' And (@Mode = 1 and '${req.body.Name}' <> 'Remark') ) 
      or @PP_ACC_Amount <> 0 )
    Begin
      Select @ROWCOUNT as Flag
      return;
    End
    `, req.body);

  switch (req.body.Mode) {
    case 0:
    break;

    case 1:
      switch (req.body.Name) {
        case 'Unit_Price':
        case 'Out_Qty':
        case 'Warehouse_RankID':
        case 'Charge_Qty':
          req.body.Value = req.body.Value ? req.body.Value : 0;
        break;
        default:
          req.body.Value = req.body.Value ? `N'${req.body.Value.trim().replace(/'/g, "''")}'` : `null`;
        break;
      }

      switch (req.body.Name) {
        case 'Unit_Price':
          strSQL += format(`
            Update [dbo].[Stock_Out_Detail] Set [{Name}] = {Value}
            where Stock_Out_DetailID = {Stock_Out_DetailID}
            Set @ROWCOUNT = @@ROWCOUNT;
          `, req.body); 
        break;
        case 'Out_Qty':
          strSQL += format(`
            Update [dbo].[Stock_Out_Detail] Set Out_Qty = {Value}
            From [dbo].[Stock_Out_Detail] d
            where Stock_Out_DetailID = {Stock_Out_DetailID}
            And (
              Select Stock_Qty + d.Out_Qty - {Value} 
              From Stock_Detail With(NoLock,NoWait) 
              Where Warehouse_RankID = d.Warehouse_RankID and Material_ColorID = d.Material_ColorID and Purchase_DetailID = d.Purchase_DetailID
              ) >= 0;
            Set @ROWCOUNT = @@ROWCOUNT;
          `, req.body); 
        break;
        case 'Warehouse_RankID':
          strSQL += format(`
            Update [dbo].[Stock_Out_Detail] Set [{Name}] = {Value}
            where Stock_Out_DetailID = {Stock_Out_DetailID}
            
            Set @ROWCOUNT = @@ROWCOUNT;
          `, req.body);    
        break;
        case 'Charge_Qty':
          strSQL += format(`
            Update [dbo].[Stock_Out_Detail] Set [{Name}] = iif( {Value} > Out_Qty, Out_Qty, {Value} )
            where Stock_Out_DetailID = {Stock_Out_DetailID}
            
            Set @ROWCOUNT = @@ROWCOUNT;
          `, req.body);
        break;
        default:
          strSQL += format(`
            Update [dbo].[Stock_Out_Detail] Set [{Name}] = {Value}
            where Stock_Out_DetailID = {Stock_Out_DetailID}
            
            Set @ROWCOUNT = @@ROWCOUNT;
          `, req.body);    
        break;
      }

    break;
    case 2:
      strSQL += format(`
        Delete From [dbo].[Stock_Out_Detail] 
        Where Stock_Out_DetailID = {Stock_Out_DetailID} 
        And (Select MPI_No From Stock_Out With(NoLock,NoWait) Where Stock_Out_No = {Stock_Out_No}) IS NULL

        Set @ROWCOUNT = @@ROWCOUNT;
      `, req.body);
      break;
  }
  strSQL += format(`
    if(@ROWCOUNT > 0)
    Begin
      UPDATE [Stock_Out] SET Data_Updater = N'${req.UserID}', Data_Update = GetDate() WHERE Stock_Out_No = {Stock_Out_No};
    End
    Select @ROWCOUNT as Flag, @Purchase_DetailID as Purchase_DetailID;
  `, req.body);

   //console.log(strSQL)

  db.sql(req.SiteDB, strSQL)
    .then((result) => {
      res.locals.Flag = result.recordsets[0][0].Flag > 0
      res.locals.Purchase_DetailID = result.recordsets[0][0].Purchase_DetailID
      if (req.body.Name === 'Out_Qty' || req.body.Name === 'Warehouse_RankID' || req.body.Mode !== 1) {
        next();
      } else {
        res.send({
          Flag: res.locals.Flag
        });
      }
    }).catch((err) => {
      console.log(err);
      res.status(500).send(err);
    })
}, function (req, res, next) {
  let strSQL = format(`Declare @ROWCOUNT int = 0, @Mode int = {Mode}; `, req.body);
  // StoreProcedure [dbo].[Update_Stock_Detail_Material_Qty]
  if (res.locals.Flag) {
    strSQL += format(`
    Declare @Rec_Count int

    if(@Mode=0) -- 新增出庫 > 代表庫存減少
    Begin
      Update Stock_Detail set Stock_Qty = Round(isnull(Stock_Qty,0) - (1 * isnull({Qty_New},0)),4), Update_Date = GetDate()
      From Stock_Detail sd
      Where sd.Material_ColorID = {Material_ColorID} and sd.Warehouse_RankID = {Warehouse_RankID_Old} And sd.Purchase_DetailID = ${res.locals.Purchase_DetailID}
      And Round(isnull(Stock_Qty,0) - (1 * isnull({Qty_New},0)),4) >= 0
    end

    if(@Mode=1) -- 修改出庫數量 > 必須判斷與原先出庫數增減
    Begin
    ${req.body.Qty_New > req.body.Qty_Old ? // 出庫數增加 -> 跑第一段，庫存減少
      `
      Update Stock_Detail set Stock_Qty = Round(isnull(Stock_Qty,0) - (1 * isnull(${req.body.Qty_New - req.body.Qty_Old},0)),4), Update_Date = GetDate()
      From Stock_Detail sd
      Where sd.Material_ColorID = {Material_ColorID} and sd.Warehouse_RankID = {Warehouse_RankID_Old} And sd.Purchase_DetailID = ${res.locals.Purchase_DetailID}
      And Round(isnull(Stock_Qty,0) - (1 * isnull(${req.body.Qty_New - req.body.Qty_Old},0)),4) >= 0
      ` 
      : // 出庫數減少 -> 跑第二段，庫存增加
      `
      Update Stock_Detail set Stock_Qty = Round(isnull(Stock_Qty,0) + (1 * isnull(${req.body.Qty_Old - req.body.Qty_New},0)),4), Update_Date = GetDate()
      From Stock_Detail sd
      Where sd.Material_ColorID = {Material_ColorID} and sd.Warehouse_RankID = {Warehouse_RankID_New} And sd.Purchase_DetailID = ${res.locals.Purchase_DetailID}
      And Round(isnull(Stock_Qty,0) + (1 * isnull(${req.body.Qty_Old - req.body.Qty_New},0)),4) >= 0
      `
    }
    end

    if(@Mode=2) -- 刪除出庫 > 代表庫存增加
    Begin
      Update Stock_Detail set Stock_Qty = Round(isnull(Stock_Qty,0) + (1 * isnull({Qty_Old},0)),4), Update_Date = GetDate()
      From Stock_Detail sd
      Where sd.Material_ColorID = {Material_ColorID} and sd.Warehouse_RankID = {Warehouse_RankID_New} And sd.Purchase_DetailID = ${res.locals.Purchase_DetailID}
      And Round(isnull(Stock_Qty,0) + (1 * isnull({Qty_Old},0)),4) >= 0
    end

    Select @Rec_Count = count(*) From Stock_Detail sd Where sd.Material_ColorID = {Material_ColorID} and sd.Warehouse_RankID = {Warehouse_RankID_New} And sd.Purchase_DetailID = ${res.locals.Purchase_DetailID}
    set @ROWCOUNT = @Rec_Count
    
    if(@Rec_Count = 0)
    Begin
      Insert into Stock_Detail(Material_ColorID, Warehouse_RankID, Stock_Qty, Update_Date, Purchase_DetailID )
      Select {Material_ColorID} as Material_ColorID, {Warehouse_RankID_New} as Warehouse_RankID, 1 * isnull({Qty_New},0) as Stock_Qty, GetDate() as Update_Date
      , ${res.locals.Purchase_DetailID} as Purchase_DetailID 
      set @ROWCOUNT = @@ROWCOUNT;
    End


    `, req.body);
  }
  strSQL += (`Select @ROWCOUNT as Flag;`)
  // console.log(strSQL)
  // res.send({ Flag: false });

  db.sql(req.Enterprise, strSQL)
    .then((result) => {
      // console.log(result.recordsets[0])
      res.send({
        Flag: result.recordsets[0][0].Flag > 0
      });
    }).catch((err) => {
      console.log(err);
      res.status(500).send(err);
    })
});

// Batch Stock_Out_Detail Maintain
router.post('/Batch_Stock_Out_Detail_Maintain', function (req, res, next) {
  console.log("Call Batch_Stock_Out_Detail_Maintain Api:", req.body);

  // req.body.Mode === 0 表示Stock Out By Stock
  // req.body.Mode === 1 表示Stock Out By Purchase_Project_Qty
  // req.body.Mode === 2 表示Stock Out By Purchase_Project
  req.body.Mode = req.body.Mode ? req.body.Mode : 0;
  req.body.Stock_Out_No = req.body.Stock_Out_No ? req.body.Stock_Out_No : 0;
  req.body.QueryData = req.body.QueryData ? `N'${req.body.QueryData.trim().replace(/'/g, "''")}'` : `''`; 
  req.body.Warehouse_RankID = req.body.Warehouse_RankID ? req.body.Warehouse_RankID : [];


  let strSQL = format(`Declare @ROWCOUNT int = 0, @ROWCOUNT1 int = 0, @Mode int = {Mode}, @Stock_Out_No int = {Stock_Out_No}
    , @MPI_No varchar(15), @PP_ACC_Amount int, @Purchase_Project_No varchar(15), @WarehouseID varchar(10);

    Select @MPI_No = isnull(so.MPI_No,'')
    , @Purchase_Project_No = so.Purchase_Project_No
    , @WarehouseID = WarehouseID
    , @PP_ACC_Amount = isnull(acc.PP_ACC_Amount,0)
    From Stock_Out so 
    Left Outer Join PP_ACC_Amount acc on acc.Stock_Out_No = so.Stock_Out_No
    Where so.Stock_Out_No = @Stock_Out_No;

    if ( (@MPI_No <> '' or @PP_ACC_Amount <> 0) )
    Begin
      Select @ROWCOUNT + @ROWCOUNT1 as Flag
      return;
    End
    `, req.body);

  switch (req.body.Mode) {
    case 0:
      req.body.Material_ColorID = req.body.Material_ColorID ? req.body.Material_ColorID : [];
      
      strSQL += format(`
        INSERT INTO [dbo].[Stock_Out_Detail] ([Stock_Out_No], [MaterialID], [Material_ColorID], [Material_DetailID], [Material_Specific]
        , [Material_Category], [Material_Color], [Unit_Cost], [Unit_Price], [Warehouse_RankID]
        , [Out_Qty], [Charge_Qty], [Currency], [Unit]) 
        SELECT @Stock_Out_No as Stock_Out_No, m.MaterialID, mc.Material_ColorID, md.Material_DetailID, md.Material_Specific
        , m.Material_Category, mc.Material_Color, mc.Purchase_Price as Unit_Cost, mc.Unit_Price, sd.Warehouse_RankID
        , 0 as Out_Qty, 0 as Charge_Qty, mc.Currency, m.Unit
        FROM Material_Color mc
        INNER JOIN Material_Detail md ON mc.Material_DetailID = md.Material_DetailID
        INNER JOIN Material m ON md.MaterialID = m.MaterialID
        INNER JOIN Stock_Detail sd ON mc.Material_ColorID = sd.Material_ColorID
        INNER JOIN Warehouse_Rank wr ON sd.Warehouse_RankID = wr.Warehouse_RankID 
        WHERE sd.Stock_Qty > 0 
        AND wr.WarehouseID = @WarehouseID
        And mc.Material_ColorID in (${req.body.Material_ColorID})
        And sd.Warehouse_RankID in (${req.body.Warehouse_RankID})
        And ({QueryData} = '' or charindex({QueryData}, isnull(mc.SupplierID,'') + ' ' + cast(isnull(mc.Material_ColorID,'') as varchar) + ' ' 
        + isnull(m.Material_Category,'') + ' ' + isnull(md.Material_Specific,'') + ' ' + isnull(mc.Material_Color,'') + ' ' 
        + isnull(wr.Rank_Name,'') + ' ' + isnull(mc.Currency,'') + ' ' + isnull(m.Unit,'') + ' ' + cast(isnull(sd.Stock_Qty,0) as varchar)) > 0)
        ORDER BY mc.SupplierID DESC , m.Material_Category, md.Material_Specific, mc.Material_Color;

        Set @ROWCOUNT = @@ROWCOUNT;
      `, req.body);
    break;
    case 1:
      req.body.Material_ColorID = req.body.Material_ColorID ? req.body.Material_ColorID : [];
      req.body.Purchase_DetailID = req.body.Purchase_DetailID ? req.body.Purchase_DetailID : [];
      req.body.isPending_Qty_Flag = req.body.isPending_Qty_Flag ? req.body.isPending_Qty_Flag : 0;

      strSQL += format(` Declare  @Country varchar(20) = (Select isnull(Country,'TAIWAN') From Control);
/*
        BEGIN TRANSACTION;
        BEGIN TRY
*/
          with tmp_Material( Material_ColorID, Country, Warehouse_RankID, Unit_Price, Stock_Qty ) as (
              Select sd.Material_ColorID , s.Country, Warehouse_RankID, Unit_Price, sd.Stock_Qty
              From Stock_Detail sd
              Inner Join Material_Color mc on sd.Material_ColorID = mc.Material_ColorID
              Inner Join Supplier s on mc.SupplierID = s.SupplierID
              Where sd.Material_ColorID in (${req.body.Material_ColorID})
              And sd.Warehouse_RankID in (${req.body.Warehouse_RankID})
              And sd.Purchase_DetailID in (${req.body.Purchase_DetailID})
          )
          , MSUM_Out_Charge_Qty(Purchase_DetailID, Charge_Qty) as (
              Select Purchase_DetailID, sum(sd.Charge_Qty) as Charge_Qty
              From Stock_Out_Detail sd
              Where sd.Purchase_DetailID in (${req.body.Purchase_DetailID})
              Group by Purchase_DetailID
          )
          INSERT INTO Stock_Out_Detail (Stock_Out_No, MaterialID, Material_ColorID, Material_DetailID, Material_Specific
          , Material_Category, Material_Color, Unit, Currency
          , Unit_Cost
          , Unit_Price
          , Warehouse_RankID
          , Out_Qty
          , Charge_Qty
          , Purchase_DetailID)
          SELECT so.Stock_Out_No
          , pd.MaterialID
          , pd.Material_ColorID
          , pd.Material_DetailID
          , pd.Material_Specific
          , pd.Material_Category
          , pd.Material_Color
          , pd.Unit
          , pd.Currency
          , iif(isnull(pd.Cost_Qty,0)=0, 0, pd.Unit_Price) as Unit_Cost
          , iif(isnull(pd.Unit_Price,0)=0, mc.Unit_Price, pd.Unit_Price) as Unit_Price
          , mc.Warehouse_RankID
          , cast( IIf(mc.[Stock_Qty] < (isnull(pd.[Stock_In_Qty],0) - isnull(pd.[Stock_Out_Qty],0))
              , IIf(mc.[Stock_Qty] > 0, mc.[Stock_Qty], 0)
              , IIf( (isnull(pd.[Stock_In_Qty],0) - isnull(pd.[Stock_Out_Qty],0)) < 0, 0, (isnull(pd.[Stock_In_Qty],0) - isnull(pd.[Stock_Out_Qty],0)) )
            ) as Money) as Out_Qty
          , cast( IIf(mc.[Stock_Qty] < (isnull(pd.[Stock_In_Qty],0) - isnull(pd.[Stock_Out_Qty],0))
              , IIf(mc.[Stock_Qty] > 0, mc.[Stock_Qty], 0)
              , IIf( (isnull(pd.[Stock_In_Qty],0) - isnull(pd.[Stock_Out_Qty],0)) < 0, 0, (isnull(pd.[Stock_In_Qty],0) - isnull(pd.[Stock_Out_Qty],0)) )
            ) as Money) as Charge_Qty
/*               
          , case when pd.Unit = 'NPR' or pd.Unit = 'PCE' or pd.Unit = 'PRS' or pd.Unit = 'PIECE' or pd.Unit = 'SET' then            
              IIf(mc.[Stock_Qty] < (isnull(pd.Project_Qty,0) - isnull((c.Charge_Qty),0))
              , IIf(mc.[Stock_Qty] > 0, mc.[Stock_Qty], 0)
              , (isnull(pd.Project_Qty,0) - isnull((c.Charge_Qty),0)) )
          Else
              IIf(mc.[Stock_Qty] < (isnull(pd.[Stock_In_Qty],0) - isnull(pd.[Stock_Out_Qty],0))
              , IIf(mc.[Stock_Qty] > 0, mc.[Stock_Qty], 0)
              , IIf( (isnull(pd.[Stock_In_Qty],0) - isnull(pd.[Stock_Out_Qty],0)) < 0, 0, (isnull(pd.[Stock_In_Qty],0) - isnull(pd.[Stock_Out_Qty],0)) ) )
          End as Charge_Qty
*/          
          , pd.Purchase_DetailID
          FROM Stock_Out so 
          Inner Join Purchase_Detail pd on so.Purchase_Project_No = pd.Purchase_Project_No
          INNER JOIN tmp_Material mc ON pd.Material_ColorID = mc.Material_ColorID
          INNER JOIN Purchase_Project pp ON pd.Purchase_Project_No = pp.Purchase_Project_No 
          left JOIN MSUM_Out_Charge_Qty c ON pd.Purchase_DetailID = c.Purchase_DetailID 
          WHERE so.Stock_Out_No = @Stock_Out_No
          And (pd.Project_Qty <> 0) 
          --AND IIf([Sub_Purchase_Item]=-1 Or [Require_Date] is null Or mc.Country<> @Country ,GetDate()-1,[Require_Date]-5) < GetDate() 
          AND ((pp.Close_Date) Is Null) 
          AND ((pp.ACC_Close) Is Null)
          And pd.Purchase_DetailID in (${req.body.Purchase_DetailID})
          And mc.Warehouse_RankID in (${req.body.Warehouse_RankID})
          And mc.Stock_Qty > 0  
          And ({isPending_Qty_Flag}=0 or ( isnull(pd.[Project_Qty],0) - isnull(pd.[Stock_Out_Qty],0) ) > 0)
          And ({QueryData} = '' or charindex({QueryData}, isnull(pd.SupplierID,'') + ' ' + cast(isnull(pd.Material_ColorID,'') as varchar) 
          + ' ' + isnull(pd.Material_Category,'') + ' ' + isnull(pd.Material_Specific,'') + ' ' + isnull(pd.Material_Color,'') + ' ' + isnull(pd.M_Rmk,'') 
          + ' ' + cast(isnull(pd.Purchase_DetailID,0) as varchar) + ' ' + isnull(pd.Unit,'') 
          + ' ' + cast(isnull(mc.Stock_Qty,0) as varchar) 
          + ' ' + cast(isnull((IIf(mc.[Stock_Qty]<([Stock_In_Qty]-isnull([Stock_Out_Qty],0)),IIf(mc.[Stock_Qty]>0,mc.[Stock_Qty],0),([Stock_In_Qty]-isnull([Stock_Out_Qty],0)))),0) as varchar) 
          + ' ' + cast(isnull(pd.Stock_In_Qty,0) as varchar) 
          + ' ' + cast(isnull((IIf(mc.[Stock_Qty]<([Project_Qty]-isnull([Stock_Out_Qty],0)),IIf(mc.[Stock_Qty]>0,mc.[Stock_Qty],0),([Project_Qty]-isnull([Stock_Out_Qty],0)))),0) as varchar) 
          + ' ' + isnull(pd.Currency,'') 
          ) > 0)
          ORDER BY pd.SupplierID;
              
          Set @ROWCOUNT = @@ROWCOUNT;

/*
          COMMIT;
        END TRY
        BEGIN CATCH
           Select @ROWCOUNT = 0, @ROWCOUNT1 = 0;
           ROLLBACK;
        END CATCH
*/    
        `, req.body);
    break;
    case 2:
      req.body.Material_ColorID = req.body.Material_ColorID ? req.body.Material_ColorID : [];
      req.body.Purchase_DetailID = req.body.Purchase_DetailID ? req.body.Purchase_DetailID : [];
      req.body.isPending_Qty_Flag = req.body.isPending_Qty_Flag ? req.body.isPending_Qty_Flag : 0;

      strSQL += format(` Declare  @Country varchar(20) = (Select isnull(Country,'TAIWAN') From Control);
/*
        BEGIN TRANSACTION;
        BEGIN TRY
*/
          with tmp_Material( Material_ColorID, Country, Warehouse_RankID, Unit_Price, Stock_Qty ) as (
              Select sd.Material_ColorID , s.Country, Warehouse_RankID, Unit_Price, sd.Stock_Qty
              From Stock_Detail sd
              Inner Join Material_Color mc on sd.Material_ColorID = mc.Material_ColorID
              Inner Join Supplier s on mc.SupplierID = s.SupplierID
              Where sd.Material_ColorID in (${req.body.Material_ColorID})
              And sd.Warehouse_RankID in (${req.body.Warehouse_RankID})
              And sd.Purchase_DetailID in (${req.body.Purchase_DetailID})
          )
          INSERT INTO Stock_Out_Detail (Stock_Out_No, MaterialID, Material_ColorID, Material_DetailID, Material_Specific
          , Material_Category, Material_Color, Unit, Currency
          , Unit_Cost
          , Unit_Price
          , Warehouse_RankID
          , Out_Qty
          , Charge_Qty
          , Purchase_DetailID)
          SELECT so.Stock_Out_No, pd.MaterialID, pd.Material_ColorID, pd.Material_DetailID, pd.Material_Specific
          , pd.Material_Category, pd.Material_Color, pd.Unit, pd.Currency
          , iif(isnull(pd.Cost_Qty,0)=0, 0, pd.Unit_Price) as Unit_Cost
          , iif(isnull(pd.Unit_Price,0)=0, mc.Unit_Price, pd.Unit_Price) as Unit_Price
          , mc.Warehouse_RankID
          , cast( IIf(mc.[Stock_Qty] < ( CEILING(isnull(pd.[Project_Qty],0)) - isnull(pd.[Stock_Out_Qty],0) ) 
              , IIf(mc.[Stock_Qty] > 0, mc.[Stock_Qty], 0)
              , ( CEILING(isnull(pd.[Project_Qty],0)) - isnull(pd.[Stock_Out_Qty],0) ) ) as Money) as Out_Qty
          , cast( IIf(mc.[Stock_Qty] < ( CEILING(isnull(pd.[Project_Qty],0)) - isnull(pd.[Stock_Out_Qty],0) ) 
              , IIf(mc.[Stock_Qty] > 0, mc.[Stock_Qty], 0)
              , ( CEILING(isnull(pd.[Project_Qty],0)) - isnull(pd.[Stock_Out_Qty],0) ) ) as Money) as Charge_Qty
          , pd.Purchase_DetailID
          FROM Stock_Out so 
          Inner Join Purchase_Detail pd on so.Purchase_Project_No = pd.Purchase_Project_No
          INNER JOIN tmp_Material mc ON pd.Material_ColorID = mc.Material_ColorID 
          INNER JOIN Purchase_Project pp ON pd.Purchase_Project_No = pp.Purchase_Project_No 
          WHERE so.Stock_Out_No = @Stock_Out_No
          And (pd.Project_Qty <> 0) 
          --AND IIf([Sub_Purchase_Item]=-1 Or [Require_Date] is null Or mc.[Country]<> @Country ,GetDate()-1,[Require_Date]-5) < GetDate() 
          AND ((pp.Close_Date) Is Null) 
          AND ((pp.ACC_Close) Is Null)
          And pd.Purchase_DetailID in (${req.body.Purchase_DetailID})
          And mc.Warehouse_RankID in (${req.body.Warehouse_RankID})
          And mc.Stock_Qty > 0  
          And ({isPending_Qty_Flag}=0 or ( isnull(pd.[Project_Qty],0) - isnull(pd.[Stock_Out_Qty],0) ) > 0 )
          And ({QueryData} = '' or charindex({QueryData}, isnull(pd.SupplierID,'') + ' ' + cast(isnull(pd.Material_ColorID,'') as varchar) 
          + ' ' + isnull(pd.Material_Category,'') + ' ' + isnull(pd.Material_Specific,'') + ' ' + isnull(pd.Material_Color,'') + ' ' + isnull(pd.M_Rmk,'') 
          + ' ' + cast(isnull(pd.Purchase_DetailID,0) as varchar) + ' ' + isnull(pd.Unit,'') 
          + ' ' + cast(isnull(mc.Stock_Qty,0) as varchar) 
          + ' ' + cast(isnull((IIf(mc.[Stock_Qty]<([Stock_In_Qty]-isnull([Stock_Out_Qty],0)),IIf(mc.[Stock_Qty]>0,mc.[Stock_Qty],0),([Stock_In_Qty]-isnull([Stock_Out_Qty],0)))),0) as varchar) 
          + ' ' + cast(isnull(pd.Stock_In_Qty,0) as varchar) 
          + ' ' + cast(isnull((IIf(mc.[Stock_Qty]<([Project_Qty]-isnull([Stock_Out_Qty],0)),IIf(mc.[Stock_Qty]>0,mc.[Stock_Qty],0),([Project_Qty]-isnull([Stock_Out_Qty],0)))),0) as varchar) 
          + ' ' + isnull(pd.Currency,'') 
          ) > 0)
          ORDER BY pd.SupplierID;
              
          Set @ROWCOUNT = @@ROWCOUNT;

/*
          COMMIT;
        END TRY
        BEGIN CATCH
           Select @ROWCOUNT = 0, @ROWCOUNT1 = 0;
           ROLLBACK;
        END CATCH
*/
        `, req.body);
    break;
  }
  strSQL += format(`
    if(@ROWCOUNT > 0 and (@Mode = 2 or @Mode = 1) )
    Begin 
      with tmp_In (Material_ColorID, Warehouse_RankID, In_Qty, Purchase_DetailID) as (
        Select sd.Material_ColorID, sd.Warehouse_RankID, sum(sd.In_Qty) as In_Qty, sd.Purchase_DetailID
        From Stock_In_Detail sd
        Where sd.Material_ColorID in (${req.body.Material_ColorID})
        And sd.Warehouse_RankID in (${req.body.Warehouse_RankID})
        And sd.Purchase_DetailID in (${req.body.Purchase_DetailID})
        Group by sd.Material_ColorID, sd.Warehouse_RankID, sd.Purchase_DetailID
      )
      , tmp_Out (Material_ColorID, Warehouse_RankID, Out_Qty, Purchase_DetailID) as (
        Select sd.Material_ColorID, sd.Warehouse_RankID, sum(sd.Out_Qty) as Out_Qty, sd.Purchase_DetailID
        From Stock_Out_Detail sd
        Where sd.Material_ColorID in (${req.body.Material_ColorID})
        And sd.Warehouse_RankID in (${req.body.Warehouse_RankID})
        And sd.Purchase_DetailID in (${req.body.Purchase_DetailID})
        Group by sd.Material_ColorID, sd.Warehouse_RankID, sd.Purchase_DetailID
      )            
      Update Stock_Detail set Stock_Qty = cast((isnull(i.In_Qty,0) - isnull(o.Out_Qty,0)) as money)
      , Update_Date = GetDate()
      From Stock_Detail sd
      Inner Join tmp_In i on i.Material_ColorID = sd.Material_ColorID and i.Warehouse_RankID = sd.Warehouse_RankID and i.Purchase_DetailID = sd.Purchase_DetailID
      Inner Join tmp_Out o on o.Material_ColorID = sd.Material_ColorID and o.Warehouse_RankID = sd.Warehouse_RankID and i.Purchase_DetailID = sd.Purchase_DetailID
      Set @ROWCOUNT1 = @@ROWCOUNT;
    End

    if(@ROWCOUNT + @ROWCOUNT1 > 0)
    Begin
      UPDATE [Stock_Out] SET Data_Updater = N'${req.UserID}', Data_Update = GetDate() WHERE Stock_Out_No = {Stock_Out_No};
    End
    Select @ROWCOUNT + @ROWCOUNT1 as Flag;
  `, req.body);

   //console.log(strSQL)
   //res.send({ Flag: true });

  db.sql(req.SiteDB, strSQL)
    .then((result) => {
      res.send({ Flag: result.recordsets[0][0].Flag > 0 });
    }).catch((err) => {
      console.log(err);
      res.status(500).send(err);
    })

});

// Get Stock_Out_Detail_Add_List
router.post('/Stock_Out_Detail_Add_List', function (req, res, next) {
  console.log("Call Stock_Out_Detail_Add_List Api:", req.body);

  // req.body.Mode === 0 表示由 Stock_Detail 出庫
  // req.body.Mode === 1 表示由 PP 出庫

  req.body.Stock_Out_No = req.body.Stock_Out_No ? req.body.Stock_Out_No : 'null';
  req.body.Mode = req.body.Mode ? req.body.Mode : 0;
  req.body.QueryData = req.body.QueryData ? `N'${req.body.QueryData.trim().replace(/'/g, "''")}'` : `''`; 

  let strSQL = format(`Declare @Mode int = {Mode}, @Purchase_Project_No varchar(15), @WarehouseID varchar(10);
    Select @Purchase_Project_No = Purchase_Project_No
    , @WarehouseID = WarehouseID
    From Stock_Out s 
    where s.Stock_Out_No = {Stock_Out_No};

  if(@Mode = 0)
  Begin
    SELECT Top 1000 
    0 as flag
    , mc.SupplierID, m.MaterialID, md.Material_DetailID, mc.Material_ColorID
    , m.Material_Category, md.Material_Specific, mc.Material_Color, mc.Unit_Price, mc.Purchase_Price, m.Unit
    , sd.Stock_Qty
    , isnull(m.Material_Category,'') + ' ' + isnull(md.Material_Specific,'') + ' ' + isnull(mc.Material_Color,'') AS Material
    , mc.History_Date
    , sd.Warehouse_RankID, wr.WarehouseID, wr.Rank_Name, mc.Currency
    FROM Material_Color mc with(NoLock,NoWait)
    INNER JOIN Material_Detail md with(NoLock,NoWait) ON mc.Material_DetailID = md.Material_DetailID
    INNER JOIN Material m with(NoLock,NoWait) ON md.MaterialID = m.MaterialID
    INNER JOIN Stock_Detail sd with(NoLock,NoWait) ON mc.Material_ColorID = sd.Material_ColorID
    INNER JOIN Warehouse_Rank wr with(NoLock,NoWait) ON sd.Warehouse_RankID = wr.Warehouse_RankID 
    WHERE sd.Stock_Qty > 0 
    AND wr.WarehouseID = @WarehouseID
    And ({QueryData} = '' or charindex({QueryData}, isnull(mc.SupplierID,'') + ' ' + cast(isnull(mc.Material_ColorID,'') as varchar) + ' ' 
    + isnull(m.Material_Category,'') + ' ' + isnull(md.Material_Specific,'') + ' ' + isnull(mc.Material_Color,'') + ' ' 
    + isnull(wr.Rank_Name,'') + ' ' + isnull(mc.Currency,'') + ' ' + isnull(m.Unit,'') + ' ' + cast(isnull(sd.Stock_Qty,0) as varchar)) > 0)
    ORDER BY mc.SupplierID DESC , m.Material_Category, md.Material_Specific, mc.Material_Color;  
  End

  if(@Mode = 1)
  Begin
    Declare @Country varchar(20) = (Select isnull(Country,'TAIWAN') From Control)

    SELECT 0 flag, pd.Purchase_DetailID, pd.Purchase_Project_No, pd.Master_Purchase_DetailID
    , abs(isnull(pd.Master_Purchase_Item,0)) as Master_Purchase_Item
    , abs(isnull(pd.Sub_Purchase_Item,0)) as Sub_Purchase_Item
    , abs(isnull(pd.Unpurchase,0)) as Unpurchase
    , pd.Purchase_No, pd.SupplierID
    , IIf(sd.[Stock_Qty]<(isnull([Stock_In_Qty],0)-isnull([Stock_Out_Qty],0)),IIf(sd.[Stock_Qty]>0,sd.[Stock_Qty],0),(isnull([Stock_In_Qty],0)-isnull([Stock_Out_Qty],0))) AS MEO_Qty
    , pd.MaterialID, pd.Material_DetailID, pd.Material_ColorID
    , isnull(pd.[Material_Category],'') + ' ' + isnull(pd.[Material_Specific],'') + ' ' + isnull(pd.[Material_Color],'') + ' ' + isnull(pd.[M_Rmk],'') AS Material
    , pd.Material_Category, pd.Material_Specific, pd.Material_Color, pd.M_Rmk
    , pd.Orig_Price, pd.Quot_Price, pd.Unit_Price, mc.Unit_Price AS Market_Price
    , pd.Unit, pd.Memo, wr.WarehouseID, sd.Warehouse_RankID
    , isnull(pd.Project_Qty,0) as Project_Qty, isnull(pd.Qty,0) as Qty, isnull(sd.Stock_Qty,0) as Stock_Qty, isnull(pd.Stock_Out_Qty,0) as Stock_Out_Qty, isnull(mc.Require_Qty,0) as Require_Qty
    , IIf(sd.[Stock_Qty]<(isnull([Project_Qty],0)-isnull([Stock_Out_Qty],0)),IIf(sd.[Stock_Qty]>0,sd.[Stock_Qty],0),(isnull([Project_Qty],0)-isnull([Stock_Out_Qty],0))) AS Qty_Not_Stock_Out
    , isnull(pd.Stock_In_Qty,0) as Stock_In_Qty, isnull(pd.Qty,0) AS Purchase_Qty
    , IIf([Sub_Purchase_Item]=-1 Or [Require_Date] is null Or s.[Country]<> @Country ,GetDate()-1,[Require_Date]-5) AS Expr1
    , pd.Close_Date, pp.Close_Date, pp.ACC_Close, wr.Rank_Name, pd.Currency, isnull(pd.Cost_Qty,0) as Cost_Qty
    FROM Purchase_Detail pd 
    INNER JOIN Material_Color mc ON pd.Material_ColorID = mc.Material_ColorID 
    INNER JOIN Purchase_Project pp ON pd.Purchase_Project_No = pp.Purchase_Project_No 
    INNER JOIN Supplier s ON pd.SupplierID = s.SupplierID 
    INNER JOIN Stock_Detail sd ON mc.Material_ColorID = sd.Material_ColorID and pd.Purchase_DetailID = sd.Purchase_DetailID
    INNER JOIN Warehouse_Rank wr ON  wr.WarehouseID = @WarehouseID And sd.Warehouse_RankID = wr.Warehouse_RankID
    WHERE pd.Purchase_Project_No = @Purchase_Project_No
    And (pd.Project_Qty <> 0) 
    --AND IIf([Sub_Purchase_Item]=-1 Or [Require_Date] is null Or s.[Country]<> @Country ,GetDate()-1,[Require_Date]-5) < GetDate() 
    AND ((pp.Close_Date) Is Null) 
    AND ((pp.ACC_Close) Is Null)
    And sd.Stock_Qty > 0
    --And ({isPending_Qty_Flag}=0 or (cast((isnull(pd.[Stock_In_Qty],0) - isnull(pd.[Stock_Out_Qty],0)) as int)) > 0)
    And ({QueryData} = '' or charindex({QueryData}, isnull(pd.SupplierID,'') + ' ' + cast(isnull(pd.Material_ColorID,'') as varchar) 
    + ' ' + isnull(pd.Material_Category,'') + ' ' + isnull(pd.Material_Specific,'') + ' ' + isnull(pd.Material_Color,'') + ' ' + isnull(pd.M_Rmk,'') 
     + ' ' + cast(isnull(pd.Purchase_DetailID,0) as varchar) + ' ' + isnull(pd.Unit,'') 
    + ' ' + cast(isnull(sd.Stock_Qty,0) as varchar) 
    + ' ' + cast(isnull((IIf(sd.[Stock_Qty]<([Stock_In_Qty]-isnull([Stock_Out_Qty],0)),IIf(sd.[Stock_Qty]>0,sd.[Stock_Qty],0),([Stock_In_Qty]-isnull([Stock_Out_Qty],0)))),0) as varchar) 
    + ' ' + cast(isnull(pd.Stock_In_Qty,0) as varchar) 
    + ' ' + cast(isnull((IIf(sd.[Stock_Qty]<([Project_Qty]-isnull([Stock_Out_Qty],0)),IIf(sd.[Stock_Qty]>0,sd.[Stock_Qty],0),([Project_Qty]-isnull([Stock_Out_Qty],0)))),0) as varchar) 
    + ' ' + isnull(pd.Currency,'') 
    ) > 0)
    ORDER BY pd.Purchase_DetailID;
  End
  `, req.body);
   //console.log(strSQL)
  db.sql(req.SiteDB, strSQL)
    .then((result) => {
      res.send({
        Detail_Add_List: result.recordsets[0]
      });
    }).catch((err) => {
      console.log(err);
      res.status(500).send(err);
    })
});

//Get Stock_Out_Report_Info
router.post('/Stock_Out_Report_Info',  function (req, res, next) {
  console.log("Call Stock_Out_Report_Info Api:",req.body);

  req.body.Mode = req.body.Mode ? req.body.Mode : 0;
  req.body.Stock_Out_No = req.body.Stock_Out_No ? req.body.Stock_Out_No : null;
  req.body.OrganizationID = req.body.OrganizationID ? `N'${req.body.OrganizationID.trim().replace(/'/g, "''")}'` : `''`; 
  
  //Mode == 0 Get Report Data: 出貨單
  //Mode == 1 Get Report Data: 出貨單(雙聯式)
     
  var strSQL = format(` Declare @Mode int = {Mode}, @Stock_Out_No int = {Stock_Out_No}, @OrganizationID varchar(20) = {OrganizationID}
  `, req.body) ;
  switch(req.body.Mode) {
     case 0:
     case 1:
        strSQL += format(` 
        -- 0 Report Info
        SELECT so.CustomerID
        , @OrganizationID as OrganizationID
        , so.UserID
        , so.WarehouseID
        , so.Purchase_Project_No
        , so.Stock_Out_No
        , convert(varchar(10), so.Stock_Out_Date, 111) as Stock_Out_Date
        FROM Stock_Out so with(NoLock,NoWait)
        Where so.Stock_Out_No = @Stock_Out_No;

        -- 1 Detail Info
        SELECT p.Purchase_No
        , pd.Purchase_DetailID
        , pd.Material_ColorID
        , isnull(pd.[Material_Category],'') + ' ' + isnull(pd.[Material_Specific],'') + ' ' + isnull(pd.[Material_Color],'') + ' ' + isnull(pd.[M_Rmk],'') AS Material
        , pd.Unit
        , sod.Out_Qty
        , p.Currency
        , sod.Unit_Price
        , pd.Master_Purchase_DetailID
        FROM Purchase_Detail pd with(NoLock,NoWait)
        Inner join Stock_Out_Detail sod with(NoLock,NoWait) on pd.Purchase_DetailID = sod.Purchase_DetailID
        Left Outer Join Purchase p with(NoLock,NoWait) on p.Purchase_No = pd.Purchase_No
        Where sod.Stock_Out_No = @Stock_Out_No;
        
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
          DataSet = {Report_Info: result.recordsets[0]
            , Detail_Info: []
          };

          DataSet.Detail_Info = [...result.recordsets[1].reduce((r, e) => {
            let k = `${e.Purchase_No}`;
            if (!r.has(k)) {
              // console.log(r) 
              r.set(k, {Purchase_No: e.Purchase_No})
            } else {
            }
            return r;
          }, new Map).values()]

          DataSet.Detail_Info.forEach((item)=>{
            item.Purchase_Info = result.recordsets[1].filter((obj)=>(obj.Purchase_No==item.Purchase_No))
            item.Purchase_Info.forEach((item)=>{
              item.Out_Qty = Math.round((item.Out_Qty)*10000)/10000;
              item.Unit_Price = Math.round((item.Unit_Price)*10000)/10000;
            })  
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

/**
 * Processes a property value from the request body.
 * @param {object} body - The request body.
 * @param {string} prop - The name of the property.
 * @param {number} length - The maximum length of the property value.
 * @param {*} [defaultValue=null] - The default value to return if the property is not found in the request body.
 * @returns {string|null} - The processed property value or the default value if not found.
 */
function processProperty(body, prop, length, defaultValue = null) {
  if (body[prop]) {
    return `N'${body[prop].trim().substring(0, length).replace(/'/g, "''")}'`;
  }
  return defaultValue;
}

// 取得 Customer & Supplier 資料
router.get('/Customer_Supplier', function (req, res, next) {
  console.log("Call Customer_Supplier Api:", req.body);

  let strSQL = format(`
    SELECT SupplierID as CustomerID FROM Supplier
    UNION
    SELECT CustomerID FROM Customer WITH (NOWAIT, NOLOCK)
    ORDER BY CustomerID
  `, req.body);

  // console.log(strSQL)
  db.sql(req.Enterprise, strSQL)
    .then((result) => {
      res.send(result.recordset);
    }).catch((err) => {
      console.log(err);
      res.status(500).send(err);
    })
});

// Get Stock_Purchase_Project Info
router.post('/Stock_Purchase_Project', function (req, res, next) {
  console.log("Call Stock_Purchase_Project Api", req.body);

  req.body.Mode = req.body.Mode ? req.body.Mode : 0;
  // Mode 1: 未入庫完畢的採購單
  // Mode 2: 未出庫完畢的採購單

  let strSQL
  if (req.body.Mode === 1) {
    strSQL = format(`  
      SELECT p.Purchase_Project_No, p.Department, p.Purpose, convert(VARCHAR(10), p.Require_Date, 111) AS Require_Date
      FROM Purchase_Project p WITH (NOWAIT, NOLOCK)
      INNER JOIN Purchase_Detail pd WITH (NOWAIT, NOLOCK) ON p.Purchase_Project_No = pd.Purchase_Project_No
      WHERE p.Close_Date IS NULL 
      AND p.Engineer_Date IS NOT NULL 
      AND p.Require_Date is not null
      And pd.Close_Date is null
      AND (
        (isnull(pd.Qty, 0) - isnull(pd.Stock_In_Qty, 0)) > 0
        OR (ABS(Master_Purchase_Item) = 1 AND Project_Qty > Stock_In_Qty)
      )
      GROUP BY p.Purchase_Project_No, p.Department, p.Purpose, p.Require_Date;
    `, req.body);
  } else if (req.body.Mode === 2) {
    strSQL = format(`  
      SELECT p.Purchase_Project_No, p.Department, p.Purpose, convert(VARCHAR(10), p.Require_Date, 111) AS Require_Date
      FROM Purchase_Project p WITH (NOWAIT, NOLOCK)
      INNER JOIN Purchase_Detail pd WITH (NOWAIT, NOLOCK) ON p.Purchase_Project_No = pd.Purchase_Project_No
      WHERE p.Close_Date IS NULL 
      AND p.Engineer_Date IS NOT NULL 
      AND p.Require_Date is not null
      And pd.Close_Date is null
      AND (isnull(pd.Project_Qty, 0) - isnull(pd.Stock_Out_Qty, 0)) > 0
      GROUP BY p.Purchase_Project_No, p.Department, p.Purpose, p.Require_Date;
    `, req.body);
  }

  // console.log(strSQL)
  db.sql(req.SiteDB, strSQL)
    .then((result) => {
      res.send(result.recordsets[0]);
    }).catch((err) => {
      console.log(err);
      res.status(500).send(err);
    })
});

// Get Supplier Info
router.post('/Supplier', function (req, res, next) {
  console.log("Call Supplier Api", req.body);

  req.body.Purchase_Project_No = req.body.Purchase_Project_No ? `N'${req.body.Purchase_Project_No.trim().substring(0, 15).replace(/'/g, "''")}'` : `''`;

  let strSQL = format(`  
  SELECT SupplierID
  FROM Purchase_Detail pd WITH (NOWAIT, NOLOCK)
  WHERE (isnull(Qty, 0) - isnull(Stock_In_Qty, 0) > 0 OR (ABS(Master_Purchase_Item) = 1 AND Project_Qty > Stock_In_Qty)) AND Purchase_Project_No = {Purchase_Project_No}
  GROUP BY SupplierID;
  `, req.body);

  // console.log(strSQL)
  db.sql(req.SiteDB, strSQL)
    .then((result) => {
      res.send(result.recordsets[0]);
    }).catch((err) => {
      console.log(err);
      res.status(500).send(err);
    })
});

// Get Warehouse Info
router.post('/Warehouse', function (req, res, next) {
  console.log("Call Warehouse Api", req.body);

  // Mode 1: Stock_In
  // Mode 2: Stock_Out

  req.body.Purchase_Project_No = req.body.Purchase_Project_No ? `N'${req.body.Purchase_Project_No.trim().substring(0, 15).replace(/'/g, "''")}'` : null;
  req.body.SupplierID = req.body.SupplierID ? `N'${req.body.SupplierID.trim().substring(0, 15).replace(/'/g, "''")}'` : null;

  let strSQL = ''

  if (req.body.Purchase_Project_No && req.body.SupplierID && req.body.Mode === 1) {
    strSQL += format(`
      SELECT WarehouseID FROM Purchase with(nowait,nolock) 
      Where Purchase_Project_No = {Purchase_Project_No} And SupplierID = {SupplierID} And WarehouseID is not null Group by WarehouseID
      union 
      Select WarehouseID FROM warehouse w 
      Where w.History_Date is null And WarehouseID in ('HQ','PH','BM','HW')
      And (select count(*) From Purchase_Detail p where p.Purchase_Project_No = {Purchase_Project_No} And ABS(isnull(p.Master_Purchase_Item,0))=1 ) > 0    
    `, req.body);
  } else if (req.body.Purchase_Project_No && req.body.Mode === 2) {
    strSQL += format(`
      SELECT WarehouseID FROM Purchase with(nowait,nolock)
      Where Purchase_Project_No = {Purchase_Project_No} And WarehouseID is not null Group by WarehouseID
      union 
      Select WarehouseID FROM warehouse w 
      Where w.History_Date is null And WarehouseID in ('HQ','PH','BM','HW')
      And (select count(*) From Purchase_Detail p where p.Purchase_Project_No = {Purchase_Project_No} And ABS(isnull(p.Master_Purchase_Item,0))=1 ) > 0    
    `, req.body);

  } else {
    strSQL += `Select WarehouseID from warehouse w inner Join Control c on w.OrganizationID = c.OrganizationID;`
  }

  // console.log(strSQL)
  db.sql(req.SiteDB, strSQL)
    .then((result) => {
      res.send(result.recordsets[0]);
    }).catch((err) => {
      console.log(err);
      res.status(500).send(err);
    })
});

// Get Currency Info
router.post('/Currency', function (req, res, next) {
  console.log("Call Currency Api", req.body);

  req.body.Purchase_Project_No = req.body.Purchase_Project_No ? `N'${req.body.Purchase_Project_No.trim().substring(0, 15).replace(/'/g, "''")}'` : `''`;
  req.body.SupplierID = req.body.SupplierID ? `N'${req.body.SupplierID.trim().substring(0, 15).replace(/'/g, "''")}'` : `''`;
  req.body.WarehouseID = req.body.WarehouseID ? `N'${req.body.WarehouseID.trim().substring(0, 10).replace(/'/g, "''")}'` : `''`;

  let strSQL = format(`  
  with tmp_currency (Currency) as (
  SELECT Currency FROM Purchase_Detail with(nowait,nolock) 
  Where Purchase_Project_No = {Purchase_Project_No} And SupplierID = {SupplierID} And Close_Date is null Group by Currency )
  Select Currency from tmp_currency
  union 
  Select Currency from Currency Where (Select Count(*) From tmp_currency) = 0;
  `, req.body);

  // console.log(strSQL)
  db.sql(req.SiteDB, strSQL)
    .then((result) => {
      res.send(result.recordsets[0]);
    }).catch((err) => {
      console.log(err);
      res.status(500).send(err);
    })
});

// Get Bill Info
router.post('/Bill', function (req, res, next) {
  console.log("Call Bill Api", req.body);

  req.body.Purchase_Project_No = req.body.Purchase_Project_No ? `N'${req.body.Purchase_Project_No.trim().substring(0, 15).replace(/'/g, "''")}'` : `''`;
  req.body.SupplierID = req.body.SupplierID ? `N'${req.body.SupplierID.trim().substring(0, 15).replace(/'/g, "''")}'` : `''`;
  req.body.Currency = req.body.Currency ? `N'${req.body.Currency.trim().substring(0, 4).replace(/'/g, "''")}'` : `''`;

  let strSQL = format(`  
  SELECT b.Bill_No
  FROM Purchase_Detail pd with(nowait,nolock) 
  Inner Join Purchase p with(nowait,nolock) on pd.Purchase_No = p.Purchase_No and pd.Purchase_Project_No = p.Purchase_Project_No 
  Inner Join Bill b with(nowait,nolock) on b.Bill_NO = p.Bill_NO and p.SupplierID = b.SupplierID and b.Currency = p.Currency 
  Where isnull(pd.Qty,0) - isnull(pd.Stock_In_Qty,0) > 0 
  And pd.Purchase_Project_No = {Purchase_Project_No} And b.SupplierID = {SupplierID} And b.Currency = {Currency} Group by b.Bill_No;

    `, req.body);

  // console.log(strSQL)
  db.sql(req.SiteDB, strSQL)
    .then((result) => {
      res.send(result.recordsets[0]);
    }).catch((err) => {
      console.log(err);
      res.status(500).send(err);
    })
});

// Get Produce_No Info
router.post('/Produce_No', function (req, res, next) {
  console.log("Call Produce_No Api", req.body);

  let strSQL = format(`  
  SELECT [Produce_No], Round([Qty] - [In_Qty], 2) as [Pending_Qty]
  FROM Purchase_Detail_Sub with(nowait,nolock) 
  WHERE Purchase_DetailID = {Purchase_DetailID} AND [In_Qty] < [Qty] AND [Produce_No] <> '[None]' AND (Round([Qty] - [In_Qty], 2) > 0)
  `, req.body);

  // console.log(strSQL)
  db.sql(req.SiteDB, strSQL)
    .then((result) => {
      res.send(result.recordsets[0]);
    }).catch((err) => {
      console.log(err);
      res.status(500).send(err);
    })
});

// Get Transfer Traget Stock_In_No
router.post('/Transfer_Stock_In_No_Info', function (req, res, next) {
  console.log("Call Transfer_Stock_In_No_Info Api", req.body);

  req.body.Stock_In_No = req.body.Stock_In_No ? req.body.Stock_In_No : 0;
  req.body.Purchase_Project_No = req.body.Purchase_Project_No ? `${req.body.Purchase_Project_No.trim().substring(0, 15).replace(/'/g, '')}` : ``;
  req.body.Purpose = req.body.Purpose ? `${req.body.Purpose.trim().substring(0, 15).replace(/'/g, '')}` : ``;
  req.body.SupplierID = req.body.SupplierID ? `${req.body.SupplierID.trim().substring(0, 15).replace(/'/g, '')}` : ``;
  req.body.WarehouseID = req.body.WarehouseID ? `${req.body.WarehouseID.trim().substring(0, 10).replace(/'/g, '')}` : ``;
  req.body.Currency = req.body.Currency ? `${req.body.Currency.trim().substring(0, 4).replace(/'/g, '')}` : ``;

  let strSQL = format(`
      Select s.Stock_In_No 
      from Stock_In s 
      Where s.Purchase_Project_No = '{Purchase_Project_No}'
        And s.Purpose = '{Purpose}'
        And s.SupplierID = '{SupplierID}'
        And s.WarehouseID = '{WarehouseID}'
        And s.Currency = '{Currency}'
        And s.Stock_In_No <> {Stock_In_No}
        And isnull(s.Bill_No,'') = '';
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

// Process_Transfer_Selected
router.post('/Process_Transfer_Selected', function (req, res, next) {
  console.log("Call Process_Transfer_Selected Api:", req.body);
  
  req.body.Mode = req.body.Mode ? req.body.Mode : 0;
  req.body.Stock_In_No = req.body.Stock_In_No ? req.body.Stock_In_No : 0;
  req.body.Target_Stock_In_No = req.body.Target_Stock_In_No ? req.body.Target_Stock_In_No : 0;
  req.body.Purchase_DetailID = req.body.Purchase_DetailID ? req.body.Purchase_DetailID : [];
  req.body.QueryData = req.body.QueryData ? `N'${req.body.QueryData.trim().replace(/'/g, "''")}'` : `''`; 


  let strSQL = format(`Declare @Mode int = {Mode}, @ROWCOUNT int = 0, @Stock_In_No int = {Stock_In_No}, @Target_Stock_In_No int = {Target_Stock_In_No};

  if ( ( @Mode = 0 and (Select isnull(Bill_No,'') From Stock_In si Where si.Stock_In_No = @Stock_In_No) <> ''
    or ( @Mode = 1 and (Select isnull(Bill_No,'') From Stock_In si Where si.Stock_In_No = @Stock_In_No) <> ''
        And (Select isnull(Bill_No,'') From Stock_In si Where si.Stock_In_No = @Target_Stock_In_No) <> '' ))
    or ( @Mode = 1 And (@Target_Stock_In_No = 0 ) )
    )
  Begin
    Select @ROWCOUNT as Flag, @Target_Stock_In_No as Target_Stock_In_No;
    return;
  End
  
  if(@Mode = 0)
  Begin
    Insert Stock_In (Delivery_No, Stock_In_Date, Creat_Date, Purchase_Project_No, Department
    , Purpose, WarehouseID, isIBL, Accounting, SupplierID
    , Invoice_No, Invoice_Date, Invoice_Price, Tax, Currency
    , Price, Term, Bill_No, Postponement, Leave_Unpaid
    , UserID, Data_Updater, Data_Update)
    Select Delivery_No, GetDate() as Stock_In_Date, GetDate() as Creat_Date, Purchase_Project_No, Department
    , Purpose, WarehouseID, isIBL, Accounting, SupplierID
    , Invoice_No, Invoice_Date, Invoice_Price, Tax, Currency
    , Price, Term, null as Bill_No, Postponement, Leave_Unpaid
    , N'${req.UserID}' as UserID, N'${req.UserID}' as Data_Updater, GetDate() as Data_Update
    From Stock_In
    Where Stock_In_No = @Stock_In_No;

    Set @Target_Stock_In_No = scope_identity();
  End
  
  Update Stock_In_Detail set Stock_In_No = @Target_Stock_In_No
  Where Stock_In_No = @Stock_In_No
  And Purchase_DetailID in (${req.body.Purchase_DetailID})

  Set @ROWCOUNT = @@ROWCOUNT;

  Select @ROWCOUNT as Flag, @Target_Stock_In_No as Target_Stock_In_No;
  `, req.body);

  //console.log(strSQL)
  db.sql(req.SiteDB, strSQL)
    .then((result) => {
      res.send({Flag:result.recordsets[0][0].Flag > 0, Target_Stock_In_No: result.recordsets[0][0].Target_Stock_In_No });      
    }).catch((err) => {
      console.log(err);
      res.status(500).send(err);
    })
});

// Get Stock_In_List
router.post('/Stock_In_List', function (req, res, next) {
  console.log("Call Stock_In_List List Api:",req.body);

  req.body.Stock_In_No = req.body.Stock_In_No ? `${req.body.Stock_In_No.trim().substring(0, 18).replace(/'/g, '')}` : '';
  req.body.Stock_In_Date_From = req.body.Stock_In_Date_From ? `'${moment(req.body.Stock_In_Date_From).format('YYYY/MM/DD')}'` : `'2000/01/01'`;
  req.body.Stock_In_Date_To = req.body.Stock_In_Date_To ? `'${moment(req.body.Stock_In_Date_To).format('YYYY/MM/DD')}'` : `'3000/12/31'`;
  req.body.Term = req.body.Term ? `${req.body.Term.trim().substring(0, 10).replace(/'/g, '')}` : ``;
  req.body.Delivery_No = req.body.Delivery_No ? `${req.body.Delivery_No.trim().substring(0, 20).replace(/'/g, '')}` : ``;
  req.body.SupplierID = req.body.SupplierID ? `${req.body.SupplierID.trim().substring(0, 15).replace(/'/g, '')}` : ``;
  req.body.Purchase_Project_No = req.body.Purchase_Project_No ? `${req.body.Purchase_Project_No.trim().substring(0, 15).replace(/'/g, '')}` : ``;
  req.body.Department = req.body.Department ? `${req.body.Department.trim().substring(0, 5).replace(/'/g, '')}` : ``;
  req.body.Purpose = req.body.Purpose ? `${req.body.Purpose.trim().substring(0, 15).replace(/'/g, '')}` : ``;
  req.body.WarehouseID = req.body.WarehouseID ? `${req.body.WarehouseID.trim().substring(0, 10).replace(/'/g, '')}` : ``;
  req.body.Invoice_No = req.body.Invoice_No ? `${req.body.Invoice_No.trim().substring(0, 20).replace(/'/g, '')}` : ``;
  req.body.UserID = req.body.UserID ? `${req.body.UserID.trim().substring(0, 20).replace(/'/g, '')}` : ``;
  req.body.Currency = req.body.Currency ? `${req.body.Currency.trim().substring(0, 4).replace(/'/g, '')}` : ``;
  req.body.Bill_NO = req.body.Bill_NO ? `${req.body.Bill_NO.trim().substring(0, 20).replace(/'/g, '')}` : ``;
  req.body.Bill_NO_Flag = req.body.Bill_NO_Flag ? 1 : 0;
  req.body.Amoney_Flag = req.body.Amoney_Flag ? 1 : 0;

  let strSQL = format(`
  SELECT Top 1000 Stock_In_No, convert(varchar(10), [Stock_In_Date] ,111) as [Stock_In_Date], Term
  , case when isnull(Term,'') = '' then Convert(varchar(07), DATEADD(month, 1, GetDate()),111) else Convert(varchar(07),DATEADD(month, 1, (substring(Term,1,7) + '/01')),111) end as New_Term
  , Delivery_No,  isnull(SupplierID,'') as SupplierID, 
  ISNULL(Purchase_Project_No, '') AS Purchase_Project_No, Department, Purpose, WarehouseID, ISNULL(Invoice_No, '') AS Invoice_No, 
  UserID, Currency, Tax, ISNULL(Price, 0) + ISNULL(Tax, 0) AS Amount, ISNULL(Bill_NO, '') AS Bill_NO, Accounting, Update_Stock 
  FROM [dbo].[Stock_In] With(Nolock,NoWait)
  where (N'{Stock_In_No}' = '' or [Stock_In_No] like N'%{Stock_In_No}%')
  And (convert(varchar(10),[Stock_In_Date],111) between isnull({Stock_In_Date_From},'1900/01/01') And isnull({Stock_In_Date_To},'3500/12/31'))
  And (N'{Term}' = '' or [Term] like N'%{Term}%')
  And (N'{Delivery_No}' = '' or [Delivery_No] like N'%{Delivery_No}%')
  And (N'{SupplierID}' = '' or [SupplierID] like N'%{SupplierID}%')
  And (N'{Purchase_Project_No}' = '' or [Purchase_Project_No] like N'%{Purchase_Project_No}%')
  And (N'{Department}' = '' or [Department] like N'%{Department}%')
  And (N'{Purpose}' = '' or [Purpose] like N'%{Purpose}%')
  And (N'{WarehouseID}' = '' or [WarehouseID] like N'%{WarehouseID}%')
  And (N'{Invoice_No}' = '' or [Invoice_No] like N'%{Invoice_No}%')
  And (N'{UserID}' = '' or [UserID] like N'%{UserID}%')
  And (N'{Currency}' = '' or [Currency] like N'%{Currency}%')
  And ( ({Bill_NO_Flag} = 1 And isnull([Bill_NO],'') = '') or
        ({Bill_NO_Flag} = 0 And (N'{Bill_NO}' = '' or [Bill_NO] like N'%{Bill_NO}%')) 
      )
  And ( {Amoney_Flag} = 0 or (ISNULL(Price, 0) + ISNULL(Tax, 0)) > 0 ) 
  ORDER BY Stock_In_No DESC
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

// Get Stock_In Info
router.post('/Stock_In_Info', function (req, res, next) {
  console.log("Call Stock_In_Info Api:", req.body);

  req.body.Mode = req.body.Mode ? req.body.Mode : 0;
  req.body.Stock_In_No = req.body.Stock_In_No ? req.body.Stock_In_No : 0;

  let strSQL = format(`Declare @Mode int = {Mode}, @Stock_In_No int = {Stock_In_No};
   
  if(@Mode = 0 or @Mode = 1)
  Begin    
    Declare @Rec_Flag int ;
    Select @Rec_Flag = case when count(*) = 0 then 1 else 0 end from Stock_In_Detail sid with(NoLock,NoWait) Where (sid.Stock_In_No = @Stock_In_No);

    SELECT si.Stock_In_No
    , si.Delivery_No
    , Convert(Varchar(10),si.Stock_In_Date,111) as Stock_In_Date
    , si.Stock_In_Date_ERR
    , Convert(Varchar(10),si.Creat_Date,111) as Create_Date
    , si.Purchase_Project_No
    , isnull(si.Department,'') as Department
    , iif(isnull(si.Department,'') = '', '', (Select distinct isnull(si.Department,'') + ' (' + OrganizationID + ')' From Department d with(NoLock,NoWait) Where d.Department_Code = isnull(si.Department,''))  ) as Department_D
    , si.Purpose
    , si.WarehouseID
    , si.Accounting
    , si.UserID
    , si.Update_Stock
    , si.SupplierID
    , s.Country
    , isnull(s.Payment_Terms,'') as Payment_Terms
    , isnull(s.Sample_Discount,'') as Sample_Discount
    , si.Invoice_No
    , Convert(Varchar(10),si.Invoice_Date,111) as Invoice_Date
    , si.Invoice_Price
    , si.Tax
    , si.Currency
    , Round(si.Price, 2) as Price
    , si.Term
    , isnull(si.Bill_NO,'') as Bill_NO
    , isnull(si.Postponement,0) as Postponement
    , isnull(si.isIBL,0) as isIBL
    , (Select convert(varchar(10), p.Require_Date,111) From Purchase_Project p with(NoLock,NoWait) where p.Purchase_Project_No = si.Purchase_Project_No) as Require_Date
    , cast((case when Len(ISNULL(Purchase_Project_No,'')) = 0 and Len(ISNULL(si.SupplierID,'')) > 0 and Len(ISNULL(si.WarehouseID,'')) > 0 and Len(ISNULL(si.Currency,'')) > 0 then 1 else 0 end) as bit) as Material_Stock_Item_Flag
    , cast((case when Len(ISNULL(Purchase_Project_No,'')) > 0 and Len(ISNULL(si.SupplierID,'')) > 0 and Len(ISNULL(si.WarehouseID,'')) > 0 and Len(ISNULL(si.Currency,'')) > 0 then 1 else 0 end) as bit) as Stock_Item_Flag
    , cast(1 as bit) as Save_Flag
    , cast((case when @Rec_Flag = 1 And Len(ISNULL(Purchase_Project_No,'')) =0 then 1 else 0 end) as bit) as Edit_Project_Relation_Flag
    , cast((case when @Rec_Flag = 1 then 1 else 0 end) as bit) as Edit_Flag
    , cast((case when @Rec_Flag = 1 then 1 else 0 end) as bit) as Delete_Flag
    , cast((case when @Rec_Flag = 0 then 1 else 0 end) as bit) as Barcode_Flag
    , isnull(si.Data_Updater,'') as Data_Updater
    , case when si.Data_Update is not null then FORMAT(si.Data_Update, 'yyyy/MM/dd tt hh:mm:ss') else '' end as Data_Update
    FROM Stock_In si with(NoLock,NoWait)
    Inner Join Supplier s with(NoLock,NoWait) on s.SupplierID = si.SupplierID
    Where (si.Stock_In_No = @Stock_In_No)
  End

  if(@Mode = 0 or @Mode = 2)
  Begin
    With tmp_Stock_In(UserID) as (
        Select UserID FROM Stock_IN with(nowait,nolock) WHERE Stock_IN_No = @Stock_In_No
    )
    SELECT 0 as flag 
    , sid.Stock_In_DetailID
    , pd.Master_Purchase_DetailID
    , pd.Sub_Purchase_Item
    , sid.Stock_In_No
    , sid.Purchase_DetailID
    , sid.Material_ColorID
    , mc.Currency
    , ROUND(sid.Unit_Price, 2) as Unit_Price
    , pd.Qty
    , sid.Produce_No, sid.Produce_No as [Produce]
    , sid.Warehouse_RankID
    , (Select Rank_Name From Warehouse_Rank w with(NoLock,NoWait) Where w.Warehouse_RankID = sid.Warehouse_RankID) as [Rank_Name]
    , sid.In_Qty
    , CONVERT (bit, ISNULL(sid.Loss, 0)) AS Loss
    , sid.Charge_Qty
    , sid.Remark, m.Material_Category
    , md.Material_Specific
    , mc.Material_Color
    , pd.M_Rmk
    , m.Unit
    , cast((Select Stock_Qty From Stock_Detail sd with(NoLock,NoWait) Where sd.Warehouse_RankID = sid.Warehouse_RankID and sd.Material_ColorID = sid.Material_ColorID And sd.Purchase_DetailID = sid.Purchase_DetailID) as money) as [Stock_Qty]
    , mc.Order_Qty
    , pd.Purchase_No
    , m.Material_Category + ' ' + md.Material_Specific + ' ' + mc.Material_Color + CASE WHEN pd.M_Rmk IS NOT NULL THEN ' (' + pd.M_Rmk + ')' ELSE '' END AS Material
    , pd.Memo as Delivery_Note
    , mc.Purchase_Price
    , pd.Close_Date
    , pd.Stock_Out_Qty
    , CONVERT (bit, ISNULL(sid.Selected, 0)) AS Selected 
    , CONVERT (bit, case when (Select UserID From tmp_Stock_In) = '${req.UserID}' then 1 else 0 end ) AS Edit_Flag 
    , case 
      when ABS(pd.Master_Purchase_Item) = 1 then ROUND(pd.Project_Qty - pd.Stock_In_Qty, 2) 
      when sid.Produce_No is null then ROUND(pd.Qty - pd.Stock_In_Qty, 2) 
      else (Select ROUND(pds.Qty - pds.In_Qty, 2) From Purchase_Detail_Sub pds Where pds.Purchase_DetailID = pd.Purchase_DetailID and pds.Produce_No = sid.Produce_No) 
      end AS Not_In_Qty
    FROM Stock_In_Detail sid with(NoLock,NoWait)
    LEFT OUTER Join Material_Color mc with(NoLock,NoWait) ON sid.Material_ColorID = mc.Material_ColorID 
    LEFT OUTER Join Material_Detail md with(NoLock,NoWait) ON md.Material_DetailID = mc.Material_DetailID 
    LEFT OUTER Join Material m with(NoLock,NoWait) ON m.MaterialID = md.MaterialID 
    LEFT OUTER JOIN Purchase_Detail pd with(NoLock,NoWait) ON sid.Purchase_DetailID = pd.Purchase_DetailID 
    WHERE (sid.Stock_In_No = @Stock_In_No) 
    ORDER BY sid.Stock_In_DetailID; 

    SELECT w.Warehouse_RankID, w.Rank_Name
    FROM Warehouse_Rank w with(NoLock,NoWait) 
    LEFT JOIN Stock_In si with(NoLock,NoWait) ON si.WarehouseID = w.WarehouseID 
    WHERE (si.Stock_In_No = @Stock_In_No)
  End
  `, req.body);
  //console.log(strSQL)
  db.sql(req.SiteDB, strSQL)
    .then((result) => {
      let DataSet = {
        Stock_In_Info: (req.body.Mode == 0 || req.body.Mode == 1) ? result.recordsets[0] : [],
        Detail_Info: (req.body.Mode == 0) ? result.recordsets[1] : (req.body.Mode == 2) ? result.recordsets[0] : [],
        Warehouse_Rank_Option: (req.body.Mode == 0) ? result.recordsets[2] : (req.body.Mode == 2) ? result.recordsets[1] : []
      }
      res.send(DataSet);
    }).catch((err) => {
      console.log(err);
      res.status(500).send(err);
    })

});

// Maintain Stock_In
router.post('/Stock_In_Maintain', function (req, res, next) {
  console.log("Call Stock_In_Maintain Api:", req.body);

  // req.body.Mode === 0 表示新增
  // req.body.Mode === 1 表示修改 
  // req.body.Mode === 2 表示刪除
  // req.body.Mode === 3 表示整組 Project No 一次更新

  req.body.Mode = req.body.Mode ? req.body.Mode : 0;
  req.body.Stock_In_No = req.body.Stock_In_No ? req.body.Stock_In_No : 0;

  let strSQL = format(`Declare @ROWCOUNT int, @Stock_In_No int = {Stock_In_No}`, req.body)
  switch (req.body.Mode) {
    case 0:
      req.body.Delivery_No = req.body.Delivery_No ? `N'${req.body.Delivery_No.trim().substring(0, 20).replace(/'/g, "''")}'` : `''`;
      req.body.Stock_In_Date = req.body.Stock_In_Date ? `N'${req.body.Stock_In_Date.trim().substring(0, 10).replace(/'/g, '')}'` : ``;
      req.body.Purchase_Project_No = req.body.Purchase_Project_No ? `N'${req.body.Purchase_Project_No.trim().substring(0, 15).replace(/'/g, "''")}'` : null;
      req.body.Department = req.body.Department ? `N'${req.body.Department.trim().substring(0, 5).replace(/'/g, "''")}'` : null;
      req.body.Purpose = req.body.Purpose ? `N'${req.body.Purpose.trim().substring(0, 15).replace(/'/g, "''")}'` : null;
      req.body.WarehouseID = req.body.WarehouseID ? `N'${req.body.WarehouseID.trim().substring(0, 10).replace(/'/g, "''")}'` : `''`;
      req.body.SupplierID = req.body.SupplierID ? `N'${req.body.SupplierID.trim().substring(0, 15).replace(/'/g, "''")}'` : null;
      req.body.Invoice_No = req.body.Invoice_No ? `N'${req.body.Invoice_No.trim().substring(0, 20).replace(/'/g, "''")}'` : `''`;
      req.body.Invoice_Date = req.body.Invoice_Date ? `N'${req.body.Invoice_Date.trim().substring(0, 10).replace(/'/g, "''")}'` : null;
      req.body.Invoice_Price = req.body.Invoice_Price ? req.body.Invoice_Price : 0;
      req.body.Tax = req.body.Tax ? req.body.Tax : 0;
      req.body.Currency = req.body.Currency ? `N'${req.body.Currency.trim().substring(0, 4).replace(/'/g, "''")}'` : null;
      req.body.Price = req.body.Price ? req.body.Price : 0;
      req.body.Bill_NO = req.body.Bill_NO ? `N'${req.body.Bill_NO.trim().substring(0, 20).replace(/'/g, "''")}'` : null;
      req.body.Term = req.body.Term ? `'${req.body.Term.trim().substring(0,7)}'` : `'${this.moment().format('YYYY/MM')}'`;
      req.body.Postponement = req.body.Postponement ? 1 : 0;

      strSQL += format(`
      INSERT INTO Stock_In (Delivery_No, Stock_In_Date, Creat_Date, Purchase_Project_No, Department, Purpose, WarehouseID, UserID, SupplierID, Invoice_No, Invoice_Date, Invoice_Price, Tax, Currency, Price, Bill_NO, Term, Postponement, Data_Updater, Data_Update)
      Select {Delivery_No} as Delivery_No, {Stock_In_Date} as [Stock_In_Date], GetDate() as [Creat_Date], {Purchase_Project_No} as [Purchase_Project_No], 
            {Department} as [Department], {Purpose} as [Purpose], {WarehouseID} as [WarehouseID], N'${req.UserID}' as UserID, {SupplierID} as [SupplierID], 
            {Invoice_No} as [Invoice_No], {Invoice_Date} as [Invoice_Date], {Invoice_Price} as [Invoice_Price], {Tax} as [Tax], {Currency} as [Currency], 
            {Price} as [Price], {Bill_NO} as [Bill_NO], {Term} as [Term], {Postponement} as [Postponement], N'${req.UserID}' as [Data_Updater], GetDate() as [Data_Update]
      
      Set @ROWCOUNT = @@ROWCOUNT;
      set @Stock_In_No = scope_identity();
         `, req.body);
      break;
    case 1:
      let Size = 0;
      switch (req.body.Name) {
        case 'Stock_In_Date':
        case 'Invoice_Date':
          Size = 10;
          break;
        case 'Delivery_No':
        case 'Invoice_No':
          Size = 20;
          break;
        case 'WarehouseID':
          Size = 10;
          break;
        case 'Term':
          Size = 10;
          break;
        default:
          break;
      }
      req.body.Value = Size > 0 ? `N'${req.body.Value.trim().substring(0, Size).replace(/'/g, "''")}'` : req.body.Value;

      switch (req.body.Name) {
        case 'Purchase_Project_No':
        case 'SupplierID':
        case 'Currency':
        case 'WarehouseID':
          strSQL += format(`
          Update [dbo].[Stock_In] Set [{Name}] = ${Size == 0 ? '{Value}' : `substring({Value},1,${Size})`}
          where Stock_In_No = @Stock_In_No
          And (Select count(*) From Stock_In_Detail pd with(NoLock,NoWait) Where pd.Stock_In_No = @Stock_In_No) = 0
          And isnull(Bill_No,'') = '';

          Set @ROWCOUNT = @@ROWCOUNT;
          `, req.body);
          break;
        case 'Term':
          strSQL += format(`
          Update [dbo].[Stock_In] Set [{Name}] = ${Size == 0 ? '{Value}' : `substring({Value},1,${Size})`}
          where Stock_In_No = @Stock_In_No
          And isnull(Bill_No,'') = '';

          Set @ROWCOUNT = @@ROWCOUNT;
          `, req.body);
          break;
        default:
          strSQL += format(`
          Update [dbo].[Stock_In] Set [{Name}] = ${Size == 0 ? '{Value}' : `substring({Value},1,${Size})`}
          where Stock_In_No = @Stock_In_No
          And isnull(Bill_No,'') = '';

          Set @ROWCOUNT = @@ROWCOUNT;
          `, req.body);
    
          break;
      }

      strSQL += format(`
      if (@ROWCOUNT > 0)
      Begin
        Update Stock_In set Data_Updater = N'${req.UserID}', Data_Update = GetDate() Where Stock_In_No = @Stock_In_No;
      End
         `, req.body);
      break;
    case 2:
      strSQL += format(`
      Delete FROM [dbo].[Stock_In] 
      where Stock_In_No = @Stock_In_No
      And (Select count(*) From Stock_In_Detail pd with(NoLock,NoWait) Where pd.Stock_In_No = {Stock_In_No}) = 0
      And isnull(Bill_No,'') = '';

      Set @ROWCOUNT = @@ROWCOUNT;
    `, req.body);
      break;

    case 3:
      req.body.Purchase_Project_No = req.body.Purchase_Project_No ? `N'${req.body.Purchase_Project_No.trim().substring(0, 15).replace(/'/g, "''")}'` : null;
      req.body.Department = req.body.Department ? `N'${req.body.Department.trim().substring(0, 5).replace(/'/g, "''")}'` : null;
      req.body.Purpose = req.body.Purpose ? `N'${req.body.Purpose.trim().substring(0, 15).replace(/'/g, "''")}'` : null;
      req.body.WarehouseID = req.body.WarehouseID ? `N'${req.body.WarehouseID.trim().substring(0, 10).replace(/'/g, "''")}'` : `''`;
      req.body.SupplierID = req.body.SupplierID ? `N'${req.body.SupplierID.trim().substring(0, 15).replace(/'/g, "''")}'` : null;
      req.body.Currency = req.body.Currency ? `N'${req.body.Currency.trim().substring(0, 4).replace(/'/g, "''")}'` : null;
      req.body.Bill_NO = req.body.Bill_NO ? `N'${req.body.Bill_NO.trim().substring(0, 20).replace(/'/g, "''")}'` : null;

      strSQL += format(`
      Update [dbo].[Stock_In] Set Purchase_Project_No = {Purchase_Project_No}, Department = {Department}, Purpose = {Purpose},
      WarehouseID = {WarehouseID}, SupplierID = {SupplierID}, Currency = {Currency}
      --, Bill_NO = {Bill_NO}
      where Stock_In_No = @Stock_In_No
      And (Select count(*) From Stock_In_Detail pd with(NoLock,NoWait) Where pd.Stock_In_No = {Stock_In_No}) = 0
      And isnull(Bill_No,'') = '';
      Set @ROWCOUNT = @@ROWCOUNT;
    `, req.body);
  }

  strSQL += format(`
  Select @ROWCOUNT as Flag, @Stock_In_No as Stock_In_No;
   `, req.body);
  // console.log(strSQL)
  // res.send({
  //   Flag: false,
  //   Stock_In_No: req.body.Stock_In_No
  // });
  db.sql(req.SiteDB, strSQL)
    .then((result) => {
      //console.log(result.recordsets[0])
      let DataSet = result.recordsets[0][0];
      res.send({
        Flag: DataSet.Flag > 0,
        Stock_In_No: DataSet.Stock_In_No
      });
    }).catch((err) => {
      console.log(err);
      res.status(500).send(err);
    })

});

// Get Stock_In_Detail_AddItems_List
router.post('/Stock_In_Detail_AddItems_List', function (req, res, next) {
  console.log("Call Stock_In_Detail_AddItems_List Api:", req.body);

  req.body.Stock_In_No = req.body.Stock_In_No ? req.body.Stock_In_No : 'null';
  req.body.Mode = req.body.Mode ? req.body.Mode : 0;
  req.body.Search = req.body.Search ? req.body.Search.replace(/'/g, "''") : '';
  req.body.Currency = req.body.Currency ? `N'${req.body.Currency.trim().substring(0, 4).replace(/'/g, "''")}'` : `''`;
  req.body.SupplierID = req.body.SupplierID ? `N'${req.body.SupplierID.trim().substring(0, 15).replace(/'/g, "''")}'` : `''`;
  req.body.WarehouseID = req.body.WarehouseID ? `N'${req.body.WarehouseID.trim().substring(0, 10).replace(/'/g, "''")}'` : `''`;
  req.body.Purchase_Project_No = req.body.Purchase_Project_No ? `N'${req.body.Purchase_Project_No.trim().substring(0, 15).replace(/'/g, "''")}'` : `''`;

  // req.body.Mode === 0 表示一般品項入庫
  // req.body.Mode === 1 表示由製令入庫
  // req.body.Mode === 2 表示主品項入庫

  let strSQL = format(`Declare @Mode int = {Mode};
  if(@Mode = 0)
  Begin
    Select TOP(100) ROW_NUMBER() OVER(ORDER BY pd.Purchase_DetailID,pd.Material_ColorID) AS Rec, '' as flag, pd.Purchase_DetailID, pd.Material_ColorID, pd.Material_Category, pd.Material_Specific, pd.SupplierID,
    (Select Top 1 Warehouse_RankID From Warehouse_Rank wr With(NoLock,NoWait) Where wr.WarehouseID = si.WarehouseID) as Warehouse_RankID, p.WarehouseID,
    pd.Material_Color, pd.Project_Qty
    , isnull(case when pd.Purchase_No is null then pd.Project_Qty else pd.Qty end, 0) - isnull(pd.Stock_In_Qty, 0) as Pending_Qty,
    pd.Currency, pd.Unit_Price, pd.M_Rmk, pp.Purchase_Project_No, '' as Produce_No
    From Stock_In si with(NoLock,NoWait)
    Inner Join Purchase p with(NoLock,NoWait) on p.WarehouseID = si.WarehouseID 
    Inner Join Purchase_Project pp with(NoLock,NoWait) on pp.Purchase_Project_No = p.Purchase_Project_No
    Inner Join Purchase_Detail pd with(NoLock,NoWait) on pd.Purchase_Project_No = pp.Purchase_Project_No And pd.Purchase_No = p.Purchase_No
    ${req.body.isPPNo ? `And si.SupplierID = pd.SupplierID and si.Currency = pd.Currency and si.Purchase_Project_No = pp.Purchase_Project_No` : ``}
    Where si.Stock_In_No = {Stock_In_No} And si.UserID = '${req.UserID}'
    And pp.ACC_Close is null 
    And pp.Close_Date is null
    And pd.Close_Date is null 
    --And (Round(isnull(case when pd.Purchase_No is null then pd.Project_Qty else pd.Qty end, 0) - isnull(pd.Stock_In_Qty, 0), 0) > 0 )
    And ((isnull(case when pd.Purchase_No is null then pd.Project_Qty else pd.Qty end, 0) - isnull(pd.Stock_In_Qty, 0)) > 0 )
    And (pd.Purchase_No is null or (pd.Purchase_No is not null and p.WarehouseID = si.WarehouseID ))
    And ((Len(isnull(si.Bill_NO,'')) = 0 and p.Bill_No is null) or (Len(isnull(si.Bill_NO,'')) > 0 And si.Bill_No = p.Bill_No))
    ${req.body.Search ? `And cast(ISNULL(pd.[Purchase_DetailID],'') as varchar(max)) + ' ' + cast(ISNULL(pd.[Material_ColorID],'') as varchar(max)) + ' ' 
    + ISNULL(pd.[Material_Category],'') + ' ' + ISNULL(pd.[Material_Specific],'') + ' ' + ISNULL(pd.[Material_Color],'') + ' ' + ISNULL(pd.[Currency],'') 
    + ' ' + ISNULL(pd.[M_Rmk],'') + ' ' + ISNULL(pd.[SupplierID],'') + ' ' + ISNULL(pp.[Purchase_Project_No],'') like '%'+REPLACE('${req.body.Search}',' ','%')+'%'` : ``}
  End

  if(@Mode = 1)
  Begin
    Select TOP(100) ROW_NUMBER() OVER(ORDER BY pd.Purchase_DetailID,pd.Material_ColorID) AS Rec, '' as flag, pd.Purchase_DetailID, pd.Material_ColorID, pd.Material_Category, pd.Material_Specific, pd.SupplierID,
    (Select Top 1 Warehouse_RankID From Warehouse_Rank wr With(NoLock,NoWait) Where wr.WarehouseID = si.WarehouseID) as Warehouse_RankID, p.WarehouseID,
    pd.Material_Color, pd.Project_Qty, pds.Produce_No,
    -- CEILING(isnull(case when pd.Purchase_No is null then pd.Project_Qty else (case when pds.Produce_No is null then pd.Qty else pds.Qty end) end, 0) - isnull(case when pds.Produce_No is null then pd.Stock_In_Qty else pds.In_Qty end,0)) as Pending_Qty,
    Round(isnull(case when pd.Purchase_No is null then pd.Project_Qty else (case when pds.Produce_No is null then pd.Qty else pds.Qty end) end, 0) - isnull(case when pds.Produce_No is null then pd.Stock_In_Qty else pds.In_Qty end,0),2) as Pending_Qty,
    isnull(case when pd.Purchase_No is null then pd.Project_Qty else (case when pds.Produce_No is null then pd.Qty else pds.Qty end) end, 0) - isnull(case when pds.Produce_No is null then pd.Stock_In_Qty else pds.In_Qty end,0) as Floating_Qty,
    pd.Currency, pd.Unit_Price, pd.M_Rmk, pp.Purchase_Project_No
    From Stock_In si with(NoLock,NoWait)
    Inner Join Purchase p with(NoLock,NoWait) on p.WarehouseID = si.WarehouseID 
    Inner Join Purchase_Project pp with(NoLock,NoWait) on pp.Purchase_Project_No = p.Purchase_Project_No
    Inner Join Purchase_Detail pd with(NoLock,NoWait) on pd.Purchase_Project_No = pp.Purchase_Project_No And pd.Purchase_No = p.Purchase_No
    ${req.body.isPPNo ? `And si.SupplierID = pd.SupplierID and si.Currency = pd.Currency and si.Purchase_Project_No = pp.Purchase_Project_No` : ``}
    Inner Join Purchase_Detail_Sub pds with(NoLock,NoWait) on pds.Purchase_DetailID = pd.Purchase_DetailID
    Where si.Stock_In_No = {Stock_In_No} And si.UserID = '${req.UserID}'
    And pp.ACC_Close is null 
    And pp.Close_Date is null
    And pd.Close_Date is null
    --And (Round(isnull(case when pd.Purchase_No is null then pd.Project_Qty else pd.Qty end, 0) - isnull(pd.Stock_In_Qty, 0), 0) > 0 )
    And ((isnull(case when pd.Purchase_No is null then pd.Project_Qty else pd.Qty end, 0) - isnull(pd.Stock_In_Qty, 0)) > 0 )
    -- And (CEILING(isnull(case when pd.Purchase_No is null then pd.Project_Qty else (case when pds.Produce_No is null then pd.Qty else pds.Qty end) end, 0) - isnull(case when pds.Produce_No is null then pd.Stock_In_Qty else pds.In_Qty end,0)) > 0)
    And (Round(isnull(case when pd.Purchase_No is null then pd.Project_Qty else (case when pds.Produce_No is null then pd.Qty else pds.Qty end) end, 0) - isnull(case when pds.Produce_No is null then pd.Stock_In_Qty else pds.In_Qty end,0),2) > 0)
    And (pd.Purchase_No is null or (pd.Purchase_No is not null and p.WarehouseID = si.WarehouseID ))
    And ((Len(isnull(si.Bill_NO,'')) = 0 and p.Bill_No is null) or (Len(isnull(si.Bill_NO,'')) > 0 And si.Bill_No = p.Bill_No))
    ${req.body.Search ? `And cast(ISNULL(pd.[Purchase_DetailID],'') as varchar(max)) + ' ' + cast(ISNULL(pd.[Material_ColorID],'') as varchar(max)) + ' ' 
    + ISNULL(pd.[Material_Category],'') + ' ' + ISNULL(pd.[Material_Specific],'') + ' ' + ISNULL(pd.[Material_Color],'') + ' ' + ISNULL(pd.[Currency],'') 
    + ' ' + ISNULL(pd.[M_Rmk],'') + ' ' + ISNULL(pd.[SupplierID],'') + ' ' + ISNULL(pp.[Purchase_Project_No],'') + ISNULL(pds.[Produce_No],'') like '%'+REPLACE('${req.body.Search}',' ','%')+'%'` : ``}
  End

  if(@Mode = 2)
  Begin
    SELECT TOP 100 pd.SupplierID, pd.Purchase_DetailID, pd.Purchase_Project_No, pd.Material_ColorID, pd.Sub_Purchase_Item, '' as flag
    , (Select Top 1 Warehouse_RankID From Warehouse_Rank wr With(NoLock,NoWait) Where wr.WarehouseID = {WarehouseID}) as Warehouse_RankID
    , ROUND(pd.Unit_Price, 2) as Unit_Price, pd.Memo, CONCAT(Material_Category, ' ', Material_Specific, ' ', pd.Material_Color, ' ', M_Rmk) AS Material
    , pd.Project_Qty, pd.Stock_In_Qty, pd.Master_Purchase_Item
    , ROUND(COALESCE(Project_Qty, 0) - COALESCE(Stock_In_Qty, 0), 2) AS Pending_Qty
    , pd.Close_Date, pp.ACC_Close, pp.Close_Date
    , CASE WHEN ABS(Master_Purchase_Item) = 1 THEN 0 ELSE COALESCE(Qty, 0) - COALESCE(Stock_In_Qty, 0) END AS MCharge_In
    , pd.Master_Purchase_DetailID, pd.Currency, pd.M_Rmk
    , pd.Material_Category, pd.Material_Specific, pd.Material_Color
    FROM Purchase_Detail pd INNER JOIN Purchase_Project pp ON pd.Purchase_Project_No = pp.Purchase_Project_No
    WHERE pd.Project_Qty <> 0 AND ABS(pd.Master_Purchase_Item) = 1 
    AND pd.Close_Date IS NULL AND pp.ACC_Close IS NULL AND pp.Close_Date IS NULL AND ABS(Unpurchase) <> 1
    AND pd.SupplierID = {SupplierID} AND pd.Currency = {Currency} AND pd.Purchase_Project_No = {Purchase_Project_No}
    --AND ROUND(COALESCE(Project_Qty, 0) - COALESCE(Stock_In_Qty, 0), 2) > 0
    AND (COALESCE(Project_Qty, 0) - COALESCE(Stock_In_Qty, 0)) > 0
    ${req.body.Search ? `And cast(ISNULL(pd.[Purchase_DetailID],'') as varchar(max)) + ' ' + cast(ISNULL(pd.[Material_ColorID],'') as varchar(max)) + ' ' 
    + ISNULL(pd.[Material_Category],'') + ' ' + ISNULL(pd.[Material_Specific],'') + ' ' + ISNULL(pd.[Material_Color],'') + ' ' + ISNULL(pd.[Currency],'') 
    + ' ' + ISNULL(pd.[M_Rmk],'') + ' ' + ISNULL(pd.[SupplierID],'') + ' ' + ISNULL(pp.[Purchase_Project_No],'') like '%'+REPLACE('${req.body.Search}',' ','%')+'%'` : ``}
    ORDER BY CONCAT(Material_Category, ' ', Material_Specific, ' ', pd.Material_Color, ' ', M_Rmk);
  End
  `, req.body);
   //console.log(strSQL)
  db.sql(req.SiteDB, strSQL)
    .then((result) => {
      res.send({
        Detail_Add_List: result.recordsets[0]
      });
    }).catch((err) => {
      console.log(err);
      res.status(500).send(err);
    })
});

// Maintain Stock_In_Detail
router.post('/Stock_In_Detail_Maintain_Old', function (req, res, next) {
  console.log("Call Stock_In_Detail_Maintain Api:", req.body);

  // req.body.Mode === 0 表示新增
  // req.body.Mode === 1 表示修改
  // req.body.Mode === 2 表示刪除
  req.body.Mode = req.body.Mode ? req.body.Mode : 0;
  req.body.Stock_In_No = req.body.Stock_In_No ? req.body.Stock_In_No : 0;
  let strSQL = format(`Declare @ROWCOUNT int = 0, @Mode int = {Mode}; `, req.body);

  switch (req.body.Mode) {
    case 0:
      req.body.Produce_No = req.body.Produce_No ? `N'${req.body.Produce_No.trim().substring(0, 20).replace(/'/g, "''")}'` : null;
      req.body.Purchase_DetailID = req.body.Purchase_DetailID ? req.body.Purchase_DetailID : null;
      req.body.Material_ColorID = req.body.Material_ColorID ? req.body.Material_ColorID : null;
      req.body.Unit_Price = req.body.Unit_Price ? req.body.Unit_Price : null;
      req.body.Warehouse_RankID = req.body.Warehouse_RankID ? req.body.Warehouse_RankID : 0;
      req.body.In_Qty = req.body.In_Qty ? req.body.In_Qty : null;
      req.body.Charge_Qty = req.body.Charge_Qty ? req.body.Charge_Qty : 0;

      strSQL += format(`
      
      UPDATE [Stock_In] 
      SET Purchase_Project_No = Stock_Info.Purchase_Project_No,
          Department = Stock_Info.Department,
          Purpose = Stock_Info.Purpose,
          SupplierID = Stock_Info.SupplierID,
          Currency = Stock_Info.Currency,
          Bill_NO = Stock_Info.Bill_NO
      FROM (
          SELECT pp.Purchase_Project_No, pp.Department, pp.Purpose, pd.SupplierID, pd.Currency, p.Bill_NO
          FROM [dbo].[Purchase_Detail] pd
          Inner Join Purchase_Project pp on pp.Purchase_Project_No = pd.Purchase_Project_No
          Inner Join Purchase p on p.Purchase_Project_No = pd.Purchase_Project_No
          Inner Join Stock_In si on si.WarehouseID = p.WarehouseID
          WHERE Purchase_DetailID = {Purchase_DetailID} AND si.Stock_In_No = {Stock_In_No}) AS Stock_Info
      WHERE
          Stock_In.Stock_In_No = {Stock_In_No} AND Stock_In.Purchase_Project_No is NULL
      
      INSERT INTO [dbo].[Stock_In_Detail] ([Stock_In_No], [Purchase_DetailID], [Material_ColorID], [Unit_Price], [Warehouse_RankID], [In_Qty], [Charge_Qty], [Produce_No]) 
      Select {Stock_In_No} as Stock_In_No, {Purchase_DetailID} as Purchase_DetailID, {Material_ColorID} as Material_ColorID, {Unit_Price} as Unit_Price, 
      {Warehouse_RankID} as Warehouse_RankID, {In_Qty} as In_Qty, {Charge_Qty} as Charge_Qty, {Produce_No} as Produce_No;

      Set @ROWCOUNT = @@ROWCOUNT;
        `, req.body);
      break;
    case 1:
      switch (req.body.Name) {
        case 'In_Qty':
        case 'Warehouse_RankID':
        case 'Charge_Qty':
        case 'Loss':
          req.body.Value = req.body.Value ? req.body.Value : 0;
          break;
        case 'Produce_No':
          req.body.Value = req.body.Value ? `N'${req.body.Value.trim().substring(0, 20).replace(/'/g, "''")}'` : `''`;
          break;
        default:
          req.body.Value = req.body.Value ? `N'${req.body.Value.trim().replace(/'/g, "''")}'` : `null`;
          break;
      }

      strSQL += format(`
      Update [dbo].[Stock_In_Detail] Set [{Name}] = {Value}
      ${req.body.Name == 'Produce_No' ? `, [In_Qty] = {In_Qty}` : ``}
      where Stock_In_DetailID = {Stock_In_DetailID}
      ${req.body.Name == 'In_Qty' ? `And (Select Stock_Qty - {Qty_Old} + {Value} From Stock_Detail With(NoLock,NoWait) Where Warehouse_RankID = {Warehouse_RankID} and Material_ColorID = {Material_ColorID}) >= 0;` : ';'}
      
      Set @ROWCOUNT = @@ROWCOUNT;

      ${req.body.Name == 'In_Qty' || req.body.Name == 'Charge_Qty' ? `
      if(@ROWCOUNT > 0)
      Begin
        UPDATE [Stock_In_Detail] SET Loss = (CASE WHEN In_Qty > Charge_Qty THEN -1 ELSE 0 END) WHERE Stock_In_No = {Stock_In_No};
      End
      ` : ''}

      ${req.body.Name == 'Loss' && req.body.Value == 0 ? `
      if(@ROWCOUNT > 0)
      Begin
        UPDATE [Stock_In_Detail] SET Charge_Qty = In_Qty WHERE Stock_In_No = {Stock_In_No};
      End
      ` : ''}
      
      `, req.body);
      break;
    case 2:
      strSQL += format(`
      Delete From [dbo].[Stock_In_Detail] 
      Where Stock_In_DetailID = {Stock_In_DetailID} 
      And (Select Bill_NO From Stock_In With(NoLock,NoWait) Where Stock_In_No = {Stock_In_No}) IS NULL
      And (Select Stock_Qty - {In_Qty} From Stock_Detail With(NoLock,NoWait) Where Warehouse_RankID = {Warehouse_RankID} and Material_ColorID = {Material_ColorID}) >= 0;

      Set @ROWCOUNT = @@ROWCOUNT;
      `, req.body);
      break;
  }
  strSQL += format(`
  if(@ROWCOUNT > 0)
  Begin
    UPDATE [Stock_In] SET Data_Updater = N'${req.UserID}', Data_Update = GetDate() WHERE Stock_In_No = {Stock_In_No};
  End
  Select @ROWCOUNT as Flag;
  `, req.body);

  // console.log(strSQL)
  // if (req.body.Name === 'In_Qty' || req.body.Name === 'Warehouse_RankID' || req.body.Name === 'Produce_No' || req.body.Mode !== 1) {
  //   res.locals.Flag = true
  //   next();
  // } else {
  //   res.send({ Flag: false });
  // }
  db.sql(req.SiteDB, strSQL)
    .then((result) => {
      res.locals.Flag = result.recordsets[0][0].Flag > 0
      if (req.body.Name === 'In_Qty' || req.body.Name === 'Warehouse_RankID' || req.body.Name === 'Produce_No' || req.body.Mode !== 1) {
        next();
      } else {
        res.send({
          Flag: res.locals.Flag
        });
      }
    }).catch((err) => {
      console.log(err);
      res.status(500).send(err);
    })
}, function (req, res, next) {
  let strSQL = format(`Declare @ROWCOUNT int = 0, @Mode int = {Mode}; `, req.body);
  // StoreProcedure [dbo].[Update_Stock_Detail_Material_Qty]
  if (res.locals.Flag) {
    strSQL += format(`
    Declare @Rec_Count int

    if(@Mode=0) -- 新增入庫 > 代表庫存增加
    Begin
      Update Stock_Detail set Stock_Qty = Round(isnull(Stock_Qty,0) + (1 * isnull({Qty_New},0)),4), Update_Date = GetDate()
      From Stock_Detail sd
      Where sd.Material_ColorID = {Material_ColorID} and sd.Warehouse_RankID = {Warehouse_RankID_New}
      And Round(isnull(Stock_Qty,0) + (1 * isnull({Qty_New},0)),4) >= 0
    end

    if(@Mode=1) -- 修改入庫數量 > 必須判斷與原先入庫數增減
    Begin
    ${req.body.Qty_New > req.body.Qty_Old ? // 入庫數增加 -> 跑第一段，庫存增加
      `
      Update Stock_Detail set Stock_Qty = Round(isnull(Stock_Qty,0) + (1 * isnull(${req.body.Qty_New - req.body.Qty_Old},0)),4), Update_Date = GetDate()
      From Stock_Detail sd
      Where sd.Material_ColorID = {Material_ColorID} and sd.Warehouse_RankID = {Warehouse_RankID_Old}
      And Round(isnull(Stock_Qty,0) + (1 * isnull(${req.body.Qty_New - req.body.Qty_Old},0)),4) >= 0
      ` 
      : // 入庫數減少 -> 跑第二段，庫存減少
      `
      Update Stock_Detail set Stock_Qty = Round(isnull(Stock_Qty,0) - (1 * isnull(${req.body.Qty_Old - req.body.Qty_New},0)),4), Update_Date = GetDate()
      From Stock_Detail sd
      Where sd.Material_ColorID = {Material_ColorID} and sd.Warehouse_RankID = {Warehouse_RankID_New}
      And Round(isnull(Stock_Qty,0) - (1 * isnull(${req.body.Qty_Old - req.body.Qty_New},0)),4) >= 0
      `
    }
    end

    if(@Mode=2) -- 刪除入庫 > 代表庫存減少
    Begin
      Update Stock_Detail set Stock_Qty = Round(isnull(Stock_Qty,0) - (1 * isnull({Qty_Old},0)),4), Update_Date = GetDate()
      From Stock_Detail sd
      Where sd.Material_ColorID = {Material_ColorID} and sd.Warehouse_RankID = {Warehouse_RankID_Old}
      And Round(isnull(Stock_Qty,0) - (1 * isnull({Qty_Old},0)),4) >= 0
    end

    Select @Rec_Count = count(*) From Stock_Detail sd Where sd.Material_ColorID = {Material_ColorID} and sd.Warehouse_RankID = {Warehouse_RankID_New}
    set @ROWCOUNT = @Rec_Count

    if(@Rec_Count = 0)
    Begin
      Insert into Stock_Detail(Material_ColorID, Warehouse_RankID, Stock_Qty, Update_Date)
      Select {Material_ColorID} as Material_ColorID, {Warehouse_RankID_New} as Warehouse_RankID, 1 * isnull({Qty_New},0) as Stock_Qty, GetDate() as Update_Date
      set @ROWCOUNT = @@ROWCOUNT;
    End

    `, req.body);
  }
  strSQL += (`Select @ROWCOUNT as Flag;`)
  // console.log(strSQL)
  // res.send({Flag: false});

  db.sql(req.Enterprise, strSQL)
    .then((result) => {
      //console.log(result.recordsets[0])
      res.send({
        Flag: result.recordsets[0][0].Flag > 0
      });
    }).catch((err) => {
      console.log(err);
      res.status(500).send(err);
    })

});

// Get Stock_Out_List
router.post('/Stock_Out_List', function (req, res, next) {
  const nonEmptyEntries = Object.entries(req.body).filter(([_, value]) => value !== '' && value !== null); // 抓出不是空值的欄位，結果為陣列
  const filteredBody = nonEmptyEntries.reduce((obj, [key, value]) => { // 將陣列轉換成物件，以便在 log 中只顯示必要的資訊
    obj[key] = value;
    return obj;
  }, {});
  console.log("Call Stock_Out_List List Api:", filteredBody);

  req.body.Stock_Out_No = req.body.Stock_Out_No ? `${req.body.Stock_Out_No.trim().substring(0, 18).replace(/'/g, '')}` : '';
  req.body.Produce_No = req.body.Produce_No ? `${req.body.Produce_No.trim().substring(0, 20).replace(/'/g, '')}` : ``;
  req.body.Purchase_Project_No = req.body.Purchase_Project_No ? `${req.body.Purchase_Project_No.trim().substring(0, 15).replace(/'/g, '')}` : ``;
  req.body.MPI_No = req.body.MPI_No ? `${req.body.MPI_No.trim().substring(0, 13).replace(/'/g, '')}` : ``;
  req.body.CustomerID = req.body.CustomerID ? `${req.body.CustomerID.trim().substring(0, 15).replace(/'/g, '')}` : ``;
  req.body.WarehouseID = req.body.WarehouseID ? `${req.body.WarehouseID.trim().substring(0, 10).replace(/'/g, '')}` : ``;
  req.body.Shipping_Way = req.body.Shipping_Way ? `${req.body.Shipping_Way.trim().substring(0, 10).replace(/'/g, '')}` : ``;
  req.body.Stock_Out_Date = req.body.Stock_Out_Date ? `${req.body.Stock_Out_Date.trim().substring(0, 10).replace(/'/g, '')}` : ``;
  req.body.Cost = req.body.Cost ? req.body.Cost : ``;
  req.body.Price = req.body.Price ? req.body.Price : ``;
  req.body.PP_ACC_Amount = req.body.PP_ACC_Amount ? req.body.PP_ACC_Amount : ``;
  req.body.UserID = req.body.UserID ? `${req.body.UserID.trim().substring(0, 20).replace(/'/g, '')}` : ``;

  let strSQL = format(`
  SELECT Top 1000 so.[Stock_Out_No]
  , so.[MPI_No]
  , ISNULL(so.[Purchase_Project_No], '') AS Purchase_Project_No
  , ISNULL(so.[Produce_No], '') AS Produce_No
  , convert(varchar(10), [Stock_Out_Date] ,111) as Stock_Out_Date
  , so.[UserID]
  , so.[CustomerID]
  , so.[WarehouseID]
  , ISNULL(so.[Region], '') AS Region
  , so.[Shipping_Way]
  , isnull(so.[Cost],0) as [Cost]
  , isnull(so.[Price],0) as [Price]
  , isnull(paa.PP_ACC_Amount,0) as [PP_ACC_Amount]
  FROM [dbo].[Stock_Out] so With(Nolock,NoWait)
  LEFT JOIN PP_ACC_Amount paa with(NoLock,NoWait) ON so.[Stock_Out_No] = paa.Stock_Out_No
  where (N'{Stock_Out_No}' = '' or so.[Stock_Out_No] like N'%{Stock_Out_No}%')
  And (N'{Produce_No}' = '' or so.[Produce_No] like N'%{Produce_No}%')
  And (N'{Purchase_Project_No}' = '' or so.[Purchase_Project_No] like N'%{Purchase_Project_No}%')
  And (N'{MPI_No}' = '' or [MPI_No] like N'%{MPI_No}%')
  And (N'{CustomerID}' = '' or [CustomerID] like N'%{CustomerID}%')
  And (N'{WarehouseID}' = '' or [WarehouseID] like N'%{WarehouseID}%')
  And (N'{Shipping_Way}' = '' or [Shipping_Way] like N'%{Shipping_Way}%')
  And (N'{Stock_Out_Date}' = '' or convert(varchar(10),[Stock_Out_Date],111) like N'%{Stock_Out_Date}%')
  And (N'{Cost}' = '' or [Cost] like N'%{Cost}%')
  And (N'{Price}' = '' or [Price] like N'%{Price}%')
  And (N'{PP_ACC_Amount}' = '' or paa.PP_ACC_Amount like N'%{PP_ACC_Amount}%')
  And (N'{UserID}' = '' or [UserID] like N'%{UserID}%')
  ORDER BY so.[Stock_Out_No] DESC
  `, req.body);

  // console.log(strSQL)
  db.sql(req.SiteDB, strSQL)
    .then((result) => {
      res.send(result.recordset);
    }).catch((err) => {
      console.log(err);
      res.status(500).send(err);
    })
});

// Get Stock Out Info
router.post('/Stock_Out_Info', function (req, res, next) {
  console.log("Call Stock_Out_Info Api:", req.body);

  req.body.Mode = req.body.Mode ? req.body.Mode : 0;
  req.body.Stock_Out_No = req.body.Stock_Out_No ? req.body.Stock_Out_No : 0;

  let strSQL = format(`Declare @Mode int = {Mode}, @Stock_Out_No int = {Stock_Out_No}

  if(@Mode = 0 or @Mode = 1)
  Begin
    SELECT so.Stock_Out_No
    , Convert(Varchar(10),so.Stock_Out_Date,111) as Stock_Out_Date
    , FORMAT(so.Creat_Date, 'yyyy/MM/dd tt hh:mm:ss') as Create_Date
    , so.Purchase_Project_No
    , so.WarehouseID
    , so.UserID
    , Round(so.Price, 2) as Price
    , (Select convert(varchar(10), p.Require_Date,111) From Purchase_Project p with(NoLock,NoWait) where p.Purchase_Project_No = so.Purchase_Project_No) as Require_Date
    , isnull(so.MPI_No,'') as MPI_No
    , ISNULL(so.Produce_No, '') AS Produce_No
    , so.CustomerID
    , ISNULL(so.Region, '') AS Region
    , so.Shipping_Way
    , so.Cost
    , ISNULL(paa.PP_ACC_Amount, 0) AS PP_ACC_Amount
    , isnull(so.Data_Updater,'') as Data_Updater
    , case when Data_Update is not null then FORMAT(so.Data_Update, 'yyyy/MM/dd tt hh:mm:ss') else '' end as Data_Update
    FROM Stock_Out so with(NoLock,NoWait)
    LEFT JOIN PP_ACC_Amount paa with(NoLock,NoWait) ON so.[Stock_Out_No] = paa.Stock_Out_No
    Where (so.Stock_Out_No = @Stock_Out_No)
  End

  if(@Mode = 0 or @Mode = 2)
  Begin
    SELECT distinct sod.Stock_Out_DetailID, pd.Sub_Purchase_Item, sod.Stock_Out_No, pd.Purchase_No, sod.MaterialID, sod.Material_DetailID, sod.Material_ColorID
    , sod.Material_Category, sod.Material_Specific, sod.Material_Color, pd.Purchase_ResponsibleID, sd.Stock_Qty, pd.Stock_In_Qty
    , sod.Unit
    , pd.Master_Purchase_Item
    , isnull(sod.Unit_Cost,0) as Unit_Cost
    , isnull(sod.Unit_Price,0) as Unit_Price
    , Round(sod.Out_Qty, 2) as Out_Qty
    , sod.Purchase_DetailID
    , pd.M_Rmk
    , Round(sod.Charge_Qty, 2) as Charge_Qty
    , mc.Require_Qty
    , round(isnull(mc.Net_Weight,0),6) as Net_Weight
    , round(isnull(mc.Packaging_Weight, 0.1),6) as Packaging_Weight
    , Judge.UserID, Judge.Remark, pd.Close_Date, sod.Currency, pd.Memo as Delivery_Note
    , CONCAT (sod.Material_Category, ' ', sod.Material_Specific, ' ', sod.Material_Color, ' ', pd.M_Rmk) AS Material
    , sod.Warehouse_RankID
    , (Select Rank_Name From Warehouse_Rank w with(NoLock,NoWait) Where w.Warehouse_RankID = sod.Warehouse_RankID) as [Rank_Name]
    FROM (
      ( 
        Stock_Out_Detail sod with(NoLock,NoWait)
        LEFT JOIN Purchase_Detail pd with(NoLock,NoWait) ON sod.Purchase_DetailID = pd.Purchase_DetailID 
      ) LEFT JOIN Material_Color mc with(NoLock,NoWait) ON sod.Material_ColorID = mc.Material_ColorID
    )
    LEFT JOIN Judge with(NoLock,NoWait) ON sod.JudgeID = Judge.JudgeID
    LEFT JOIN Stock_Detail sd with(NoLock,NoWait) ON sod.Material_ColorID = sd.Material_ColorID AND sod.Warehouse_RankID = sd.Warehouse_RankID 
    AND sod.Purchase_DetailID = sd.Purchase_DetailID
    where sod.Stock_Out_No = @Stock_Out_No
    Order by sod.Stock_Out_DetailID

  End
   
   `, req.body);
  // console.log(strSQL)
  db.sql(req.SiteDB, strSQL)
    .then((result) => {
      let DataSet = {
        Stock_Out_Info: (req.body.Mode == 0 || req.body.Mode == 1) ? result.recordsets[0] : [],
        Detail_Info: (req.body.Mode == 0) ? result.recordsets[1] : (req.body.Mode == 2) ? result.recordsets[0] : [],
        Detail_Total: {Rec:0, Out_Qty:0, Charge_Qty:0}
      }
      DataSet.Detail_Info.forEach((item)=>{
        DataSet.Detail_Total.Rec++;
        DataSet.Detail_Total.Out_Qty += item.Out_Qty;
        DataSet.Detail_Total.Charge_Qty += item.Charge_Qty;
      })
      DataSet.Detail_Total.Out_Qty = Math.round(DataSet.Detail_Total.Out_Qty * 100000) / 100000;
      DataSet.Detail_Total.Charge_Qty = Math.round(DataSet.Detail_Total.Charge_Qty * 100000) / 100000;
      res.send(DataSet);
    }).catch((err) => {
      console.log(err);
      res.status(500).send(err);
    })
});

// Maintain Stock_Out
router.post('/Stock_Out_Maintain', function (req, res, next) {
  console.log("Call Stock_Out_Maintain Api:", req.body);

  // req.body.Mode === 0 表示新增
  // req.body.Mode === 1 表示修改 
  // req.body.Mode === 2 表示刪除
  // req.body.Mode === 3 表示整組 Project No 一次更新

  req.body.Stock_Out_No = req.body.Stock_Out_No ? req.body.Stock_Out_No : 0;

  let strSQL = format(`Declare @ROWCOUNT int, @Stock_Out_No int = {Stock_Out_No}`, req.body)
  switch (req.body.Mode) {
    case 0:
      req.body.Purchase_Project_No = processProperty(req.body, 'Purchase_Project_No', 15, `''`);
      req.body.Stock_Out_Date = processProperty(req.body, 'Stock_Out_Date', 10);
      req.body.CustomerID = processProperty(req.body, 'CustomerID', 15);
      req.body.WarehouseID = processProperty(req.body, 'WarehouseID', 10);
      req.body.Shipping_Way = processProperty(req.body, 'Shipping_Way', 20);

      strSQL += format(`
        INSERT INTO Stock_Out (Purchase_Project_No, Stock_Out_Date, CustomerID, WarehouseID, Shipping_Way, UserID, Data_Updater, Data_Update)
        Select {Purchase_Project_No} as Purchase_Project_No, {Stock_Out_Date} as Stock_Out_Date,
              {CustomerID} as CustomerID, {WarehouseID} as WarehouseID, {Shipping_Way} as Shipping_Way,
              N'${req.UserID}' as UserID, N'${req.UserID}' as [Data_Updater], GetDate() as [Data_Update]
              
        Set @ROWCOUNT = @@ROWCOUNT;
        Set @Stock_Out_No = scope_identity();
      `, req.body);
      break;
    case 1:
      const sizeMap = {
        'Purchase_Project_No': 15,
        'CustomerID': 15,
        'Produce_No': 20,
        'Stock_Out_Date': 10,
        'WarehouseID': 10,
        'Shipping_Way': 20,
        'Region': 50
      };
      let Size = sizeMap[req.body.Name] || 0;
      req.body.Value =  req.body.Value != null && Size > 0 ? `N'${req.body.Value.trim().substring(0, Size).replace(/'/g, "''")}'` : req.body.Value;

      switch(req.body.Name) {
        case "Purchase_Project_No":
          strSQL += format(`
            Declare @WarehouseID varchar(10) =  
            (
              SELECT top 1 p.WarehouseID 
              FROM Purchase p with(nowait,nolock) 
              Where p.Purchase_Project_No = {Value} 
              And p.WarehouseID is not null 
              Group by p.WarehouseID
            )
            
            Set @WarehouseID = iif( isnull(@WarehouseID,'') <> ''
              , @WarehouseID
              , ( Select c.OrganizationID Control c with(NoLock,NoWait) ) 
            ) 

            Update [dbo].[Stock_Out] Set [Purchase_Project_No] = ${Size == 0 ? '{Value}' : `substring({Value}, 1, ${Size})`}
            , WarehouseID = @WarehouseID
            where Stock_Out_No = @Stock_Out_No
            And (Select count(*) From Stock_Out_Detail pd with(NoLock,NoWait) Where pd.Stock_Out_No = @Stock_Out_No) = 0;
            Set @ROWCOUNT = @@ROWCOUNT;
          `, req.body);    
        break;
        case "WarehouseID":
          strSQL += format(`
            Update [dbo].[Stock_Out] Set [WarehouseID] = ${Size == 0 ? '{Value}' : `substring({Value}, 1, ${Size})`}
            where Stock_Out_No = @Stock_Out_No
            And (Select count(*) From Stock_Out_Detail pd with(NoLock,NoWait) Where pd.Stock_Out_No = @Stock_Out_No) = 0;
            Set @ROWCOUNT = @@ROWCOUNT;
          `, req.body);    
        break;
        case "Region":
        case "Shipping_Way":
          strSQL += format(`
            Update [dbo].[Stock_Out] Set [{Name}] =  {Value}
            where Stock_Out_No = @Stock_Out_No;

            Set @ROWCOUNT = @@ROWCOUNT;
          `, req.body);    
        break;        
        default:
          strSQL += format(`
            Update [dbo].[Stock_Out] Set [{Name}] = ${Size == 0 ? '{Value}' : `substring({Value}, 1, ${Size})`}
            where Stock_Out_No = @Stock_Out_No
            Set @ROWCOUNT = @@ROWCOUNT;
          `, req.body);    
        break;
      }

      strSQL += format(`
        if (@ROWCOUNT > 0)
        Begin
          Update Stock_Out set Data_Updater = N'${req.UserID}', Data_Update = GetDate() Where Stock_Out_No = @Stock_Out_No;
        End
      `, req.body);
      break;
    case 2:
      strSQL += format(`
        Delete FROM [dbo].[Stock_Out] 
        where Stock_Out_No = @Stock_Out_No
        And (Select count(*) From Stock_Out_Detail pd with(NoLock,NoWait) Where pd.Stock_Out_No = {Stock_Out_No}) = 0;
        Set @ROWCOUNT = @@ROWCOUNT;
      `, req.body);
      break;

    case 3:
      req.body.Purchase_Project_No = processProperty(req.body, 'Purchase_Project_No', 15);
      req.body.WarehouseID = processProperty(req.body, 'WarehouseID', 10, `''`);
      req.body.CustomerID = processProperty(req.body, 'CustomerID', 15, `''`);

      strSQL += format(`
        Update [dbo].[Stock_Out] Set Purchase_Project_No = {Purchase_Project_No}
        , WarehouseID = {WarehouseID}
        , CustomerID = {CustomerID}
        where Stock_Out_No = @Stock_Out_No
        And ( 
          (Purchase_Project_No = {Purchase_Project_No} And WarehouseID = {WarehouseID})
          or (Select count(*) From Stock_Out_Detail pd with(NoLock,NoWait) Where pd.Stock_Out_No = {Stock_Out_No}) = 0
        );

        Set @ROWCOUNT = @@ROWCOUNT;
      `, req.body);
  }

  strSQL += `Select @ROWCOUNT as Flag, @Stock_Out_No as Stock_Out_No;`

  //console.log(strSQL)
  db.sql(req.SiteDB, strSQL)
    .then((result) => {
      let DataSet = result.recordsets[0][0];
      res.send({
        Flag: DataSet.Flag > 0,
        Stock_Out_No: DataSet.Stock_Out_No
      });
    }).catch((err) => {
      console.log(err);
      res.status(500).send(err);
    })

});

// Maintain Stock_Out_Detail old
router.post('/Stock_Out_Detail_Maintain_old', function (req, res, next) {
  console.log("Call Stock_Out_Detail_Maintain Api:", req.body);

  // req.body.Mode === 0 表示新增
  // req.body.Mode === 1 表示修改
  // req.body.Mode === 2 表示刪除
  req.body.Stock_Out_No = req.body.Stock_Out_No ? req.body.Stock_Out_No : 0;
  let strSQL = format(`Declare @ROWCOUNT int = 0, @Mode int = {Mode}, @Stock_Out_No int = {Stock_Out_No}, @MPI_No varchar(15), @PP_ACC_Amount int;
    Select @MPI_No = isnull(so.MPI_No,'')
    , @PP_ACC_Amount = isnull(acc.PP_ACC_Amount,0)
    From Stock_Out so with(NoLock,NoWait)
    Left Outer Join PP_ACC_Amount acc with(NoLock,NoWait) on acc.Stock_Out_No = so.Stock_Out_No
    Where so.Stock_Out_No = @Stock_Out_No;

    if (
      ( (@Mode=0 or @Mode=2) And (@MPI_No <> '' or @PP_ACC_Amount <> 0) )
      or
      ( @Mode=1 And ('${req.body.Name}' <> '' ) And (@MPI_No <> '' or @PP_ACC_Amount <> 0) ) 
    )
    Begin
      Select @ROWCOUNT as Flag
      return;
    End
    `, req.body);

  switch (req.body.Mode) {
    case 0:
      req.body.Purchase_DetailID = req.body.Purchase_DetailID ? req.body.Purchase_DetailID : null;
      req.body.MaterialID = req.body.MaterialID ? req.body.MaterialID : null;
      req.body.Material_DetailID = req.body.Material_DetailID ? req.body.Material_DetailID : null;
      req.body.Material_ColorID = req.body.Material_ColorID ? req.body.Material_ColorID : null;
      req.body.Material_Category = req.body.Material_Category ? `N'${req.body.Material_Category.trim().replace(/'/g, "''")}'` : `''`;
      req.body.Material_Specific = req.body.Material_Specific ? `N'${req.body.Material_Specific.trim().replace(/'/g, "''")}'` : `''`;
      req.body.Material_Color = req.body.Material_Color ? `N'${req.body.Material_Color.trim().replace(/'/g, "''")}'` : `''`;
      req.body.Unit_Price = req.body.Unit_Price ? req.body.Unit_Price : 0;
      req.body.Market_Price = req.body.Market_Price ? req.body.Market_Price : 0;
      req.body.Cost_Qty = req.body.Cost_Qty ? req.body.Cost_Qty : 0;
      req.body.Warehouse_RankID = req.body.Warehouse_RankID ? req.body.Warehouse_RankID : 0;
      req.body.Out_Qty = req.body.Out_Qty ? req.body.Out_Qty : 0;
      req.body.Charge_Qty = req.body.Charge_Qty ? req.body.Charge_Qty : 0;
      req.body.Currency = req.body.Currency ? `N'${req.body.Currency.trim().substring(0, 4).replace(/'/g, "''")}'` : `''`;
      req.body.Unit = req.body.Unit ? `N'${req.body.Unit.trim().substring(0, 10).replace(/'/g, "''")}'` : `''`;
      
      strSQL += format(`
        INSERT INTO [dbo].[Stock_Out_Detail] ([Stock_Out_No], [Purchase_DetailID], [MaterialID], [Material_DetailID], [Material_ColorID], [Material_Category], [Material_Specific], [Material_Color], [Unit_Cost], [Unit_Price], [Warehouse_RankID], [Out_Qty], [Charge_Qty], [Currency], [Unit]) 
        Select {Stock_Out_No} as Stock_Out_No, {Purchase_DetailID} as Purchase_DetailID, {MaterialID} as MaterialID, {Material_DetailID} as Material_DetailID
        , {Material_ColorID} as Material_ColorID, {Material_Category} as Material_Category, {Material_Specific} as Material_Specific, {Material_Color} as Material_Color
        , IIf({Cost_Qty} = 0, 0, {Unit_Price}) as Unit_Cost
        , IIf({Unit_Price} = 0, {Market_Price}, {Unit_Price}) as Unit_Price
        , {Warehouse_RankID} as Warehouse_RankID, {Out_Qty} as Out_Qty, {Charge_Qty} as Charge_Qty, {Currency} as Currency, {Unit} as Unit;

        Set @ROWCOUNT = @@ROWCOUNT;
      `, req.body);
      break;

    case 1:
      switch (req.body.Name) {
        case 'Unit_Price':
        case 'Out_Qty':
        case 'Warehouse_RankID':
        case 'Charge_Qty':
          req.body.Value = req.body.Value ? req.body.Value : 0;
          break;
        case 'Produce_No':
          req.body.Value = req.body.Value ? `N'${req.body.Value.trim().substring(0, 20).replace(/'/g, "''")}'` : `''`;
          break;
        default:
          req.body.Value = req.body.Value ? `N'${req.body.Value.trim().replace(/'/g, "''")}'` : `null`;
          break;
      }

      strSQL += format(`
        Update [dbo].[Stock_Out_Detail] Set [{Name}] = {Value}
        ${req.body.Name == 'Produce_No' ? `, [Out_Qty] = {Out_Qty}` : ``}
        where Stock_Out_DetailID = {Stock_Out_DetailID}
        ${req.body.Name == 'Out_Qty' ? `And (Select Stock_Qty + {Qty_Old} - {Value} From Stock_Detail With(NoLock,NoWait) Where Warehouse_RankID = {Warehouse_RankID} and Material_ColorID = {Material_ColorID}) >= 0;` : ';'}
        
        Set @ROWCOUNT = @@ROWCOUNT;
      `, req.body);
      break;
    case 2:
      strSQL += format(`
        Delete From [dbo].[Stock_Out_Detail] 
        Where Stock_Out_DetailID = {Stock_Out_DetailID} 
        And (Select MPI_No From Stock_Out With(NoLock,NoWait) Where Stock_Out_No = {Stock_Out_No}) IS NULL

        Set @ROWCOUNT = @@ROWCOUNT;
      `, req.body);
      break;
  }
  strSQL += format(`
    if(@ROWCOUNT > 0)
    Begin
      UPDATE [Stock_Out] SET Data_Updater = N'${req.UserID}', Data_Update = GetDate() WHERE Stock_Out_No = {Stock_Out_No};
    End
    Select @ROWCOUNT as Flag;
  `, req.body);

   //console.log(strSQL)

  db.sql(req.SiteDB, strSQL)
    .then((result) => {
      res.locals.Flag = result.recordsets[0][0].Flag > 0
      if (req.body.Name === 'Out_Qty' || req.body.Name === 'Warehouse_RankID' || req.body.Mode !== 1) {
        next();
      } else {
        res.send({
          Flag: res.locals.Flag
        });
      }
    }).catch((err) => {
      console.log(err);
      res.status(500).send(err);
    })
}, function (req, res, next) {
  let strSQL = format(`Declare @ROWCOUNT int = 0, @Mode int = {Mode}; `, req.body);
  // StoreProcedure [dbo].[Update_Stock_Detail_Material_Qty]
  if (res.locals.Flag) {
    strSQL += format(`
    Declare @Rec_Count int

    if(@Mode=0) -- 新增出庫 > 代表庫存減少
    Begin
      Update Stock_Detail set Stock_Qty = Round(isnull(Stock_Qty,0) - (1 * isnull({Qty_New},0)),4), Update_Date = GetDate()
      From Stock_Detail sd
      Where sd.Material_ColorID = {Material_ColorID} and sd.Warehouse_RankID = {Warehouse_RankID_Old}
      And Round(isnull(Stock_Qty,0) - (1 * isnull({Qty_New},0)),4) >= 0
    end

    if(@Mode=1) -- 修改出庫數量 > 必須判斷與原先出庫數增減
    Begin
    ${req.body.Qty_New > req.body.Qty_Old ? // 出庫數增加 -> 跑第一段，庫存減少
      `
      Update Stock_Detail set Stock_Qty = Round(isnull(Stock_Qty,0) - (1 * isnull(${req.body.Qty_New - req.body.Qty_Old},0)),4), Update_Date = GetDate()
      From Stock_Detail sd
      Where sd.Material_ColorID = {Material_ColorID} and sd.Warehouse_RankID = {Warehouse_RankID_Old}
      And Round(isnull(Stock_Qty,0) - (1 * isnull(${req.body.Qty_New - req.body.Qty_Old},0)),4) >= 0
      ` 
      : // 出庫數減少 -> 跑第二段，庫存增加
      `
      Update Stock_Detail set Stock_Qty = Round(isnull(Stock_Qty,0) + (1 * isnull(${req.body.Qty_Old - req.body.Qty_New},0)),4), Update_Date = GetDate()
      From Stock_Detail sd
      Where sd.Material_ColorID = {Material_ColorID} and sd.Warehouse_RankID = {Warehouse_RankID_New}
      And Round(isnull(Stock_Qty,0) + (1 * isnull(${req.body.Qty_Old - req.body.Qty_New},0)),4) >= 0
      `
    }
    end

    if(@Mode=2) -- 刪除出庫 > 代表庫存增加
    Begin
      Update Stock_Detail set Stock_Qty = Round(isnull(Stock_Qty,0) + (1 * isnull({Qty_Old},0)),4), Update_Date = GetDate()
      From Stock_Detail sd
      Where sd.Material_ColorID = {Material_ColorID} and sd.Warehouse_RankID = {Warehouse_RankID_New}
      And Round(isnull(Stock_Qty,0) + (1 * isnull({Qty_Old},0)),4) >= 0
    end

    Select @Rec_Count = count(*) From Stock_Detail sd Where sd.Material_ColorID = {Material_ColorID} and sd.Warehouse_RankID = {Warehouse_RankID_New}
    set @ROWCOUNT = @Rec_Count

    `, req.body);
  }
  strSQL += (`Select @ROWCOUNT as Flag;`)
  // console.log(strSQL)
  // res.send({ Flag: false });

  db.sql(req.Enterprise, strSQL)
    .then((result) => {
      // console.log(result.recordsets[0])
      res.send({
        Flag: result.recordsets[0][0].Flag > 0
      });
    }).catch((err) => {
      console.log(err);
      res.status(500).send(err);
    })
});

// Get Stock_Out_Detail_AddItems_List
router.post('/Stock_Out_Detail_AddItems_List', function (req, res, next) {
  console.log("Call Stock_Out_Detail_AddItems_List Api:", req.body);

  // req.body.Mode === 0 表示由 PP 出庫
  // req.body.Mode === 1 表示由 庫存 出庫

  req.body.Stock_Out_No = req.body.Stock_Out_No ? req.body.Stock_Out_No : 'null';
  req.body.Mode = req.body.Mode ? req.body.Mode : 0;
  req.body.Search = req.body.Search ? req.body.Search.replace(/'/g, "''") : '';
  req.body.Purchase_Project_No = req.body.Purchase_Project_No ? `N'${req.body.Purchase_Project_No.trim().substring(0, 15).replace(/'/g, "''")}'` : `''`;
  req.body.WarehouseID = req.body.WarehouseID ? `N'${req.body.WarehouseID.trim().substring(0, 10).replace(/'/g, "''")}'` : `''`;

  let strSQL = format(`Declare @Mode int = {Mode}, @Purchase_Project_No varchar(15), @WarehouseID varchar(10);
    Select @Purchase_Project_No = Purchase_Project_No
    , @WarehouseID = WarehouseID
    From Stock_Out s 
    where s.Stock_Out_No = {Stock_Out_No};

  if(@Mode = 0)
  Begin
    SELECT 0 flag, pd.Purchase_DetailID, pd.Sub_Purchase_Item, pd.Purchase_Project_No, pd.Master_Purchase_Item, pd.Master_Purchase_DetailID, pd.Purchase_No, pd.SupplierID
    , CASE WHEN sd.Stock_Qty < (Stock_In_Qty - COALESCE(Stock_Out_Qty, 0)) THEN CASE WHEN sd.Stock_Qty > 0 THEN sd.Stock_Qty ELSE 0 END ELSE (Stock_In_Qty - COALESCE(Stock_Out_Qty, 0)) END AS Pending_Qty
    , pd.MaterialID, pd.Material_DetailID, pd.Material_ColorID, CONCAT ([Material_Category], ' ', [Material_Specific], ' ', mc.[Material_Color], ' ', [M_Rmk]) AS Material
    , pd.Material_Category, pd.Material_Specific, pd.Material_Color, pd.M_Rmk
    , pd.Orig_Price
    , pd.Quot_Price
    , pd.Unit_Price
    , mc.Unit_Price AS Market_Price
    , isnull(pd.Cost_Qty,0) as Cost_Qty
    , pd.Unit
    , pd.Project_Qty, pd.Qty, pd.Memo
    , wr.WarehouseID
    , sd.Warehouse_RankID
    , wr.Rank_Name
    , sd.Stock_Qty, pd.Stock_Out_Qty, mc.Require_Qty, pd.Unpurchase, pd.Currency
    FROM Purchase_Detail pd
    INNER JOIN Material_Color mc ON pd.Material_ColorID = mc.Material_ColorID
    INNER JOIN Purchase_Project pp ON pd.Purchase_Project_No = pp.Purchase_Project_No
    INNER JOIN Supplier s ON pd.SupplierID = s.SupplierID
    INNER JOIN Stock_Detail sd ON mc.Material_ColorID = sd.Material_ColorID
    INNER JOIN Warehouse_Rank wr ON sd.Warehouse_RankID = wr.Warehouse_RankID
    WHERE pd.Purchase_Project_No = @Purchase_Project_No AND pd.Project_Qty <> 0 AND wr.WarehouseID = @WarehouseID
    AND CASE WHEN sd.Stock_Qty < (Stock_In_Qty - COALESCE(Stock_Out_Qty, 0)) THEN CASE WHEN sd.Stock_Qty > 0 THEN sd.Stock_Qty ELSE 0 END ELSE (Stock_In_Qty - COALESCE(Stock_Out_Qty, 0)) END > 0
/*    
    AND CASE WHEN ABS(Sub_Purchase_Item) = 1 OR Require_Date IS NULL OR s.Country <> (
            SELECT Country
            FROM CONTROL
            ) THEN GETDATE() - 1 ELSE Require_Date - 5 END < GETDATE() 
*/
    AND pp.Close_Date IS NULL AND pp.ACC_Close IS NULL
    ORDER BY pd.SupplierID;
  End

  if(@Mode = 1)
  Begin
    SELECT 0 flag, mc.SupplierID, m.MaterialID, md.Material_DetailID, mc.Material_ColorID, m.Material_Category, md.Material_Specific, mc.Material_Color
    , mc.Unit_Price
    , mc.Unit_Price as Market_Price
    , 0 as Cost_Qty
    , mc.Purchase_Price
    , m.Unit, sd.Stock_Qty
    , m.[Material_Category] + ' ' + md.[Material_Specific] + ' ' + mc.[Material_Color] AS Material
    , sd.Warehouse_RankID, wr.WarehouseID, wr.Rank_Name, mc.Currency
    FROM Material_Color mc 
    INNER JOIN Material_Detail md ON mc.Material_DetailID = md.Material_DetailID
    INNER JOIN Material m ON md.MaterialID = m.MaterialID
    INNER JOIN Stock_Detail sd ON mc.Material_ColorID = sd.Material_ColorID And sd.Stock_Qty > 0
    INNER JOIN Warehouse_Rank wr ON sd.Warehouse_RankID = wr.Warehouse_RankID AND wr.WarehouseID = {WarehouseID}
    ORDER BY mc.SupplierID DESC, m.Material_Category, md.Material_Specific, mc.Material_Color;
  End
  `, req.body);
  // console.log(strSQL)
  db.sql(req.SiteDB, strSQL)
    .then((result) => {
      res.send({
        Detail_Add_List: result.recordsets[0]
      });
    }).catch((err) => {
      console.log(err);
      res.status(500).send(err);
    })
});

// Get Stock_Out_Packing_Info
router.post('/Stock_Out_Packing_Info', function (req, res, next) {
  console.log("Call Stock_Out_Packing_Info Api:", req.body);

  req.body.Stock_Out_DetailID = req.body.Stock_Out_DetailID ? req.body.Stock_Out_DetailID : null;

  let strSQL = format(`
    SELECT sodp.Stock_Out_Detail_PackingID
    , sodp.Stock_Out_DetailID
    , sodp.Stock_Out_PackageID
    , isnull(sodp.Per_Qty,0) as Per_Qty
    , ROUND(isnull(sodp.Unit_Net_Weight,0),6) as Unit_Net_Weight
    , ROUND(isnull(sodp.Unit_Packaging_Weight,0),6) as Unit_Packaging_Weight
    , sop.Packing_No, sop.Packing_Qty, sop.Packing_Unit
    , ROUND(isnull([Per_Qty], 0) * ROUND(isnull(sodp.Unit_Net_Weight,0),6), 2) AS Per_Net_Weight
    , ROUND(isnull([Packing_Qty], 0) * ROUND(isnull([Per_Qty], 0) * ROUND(isnull(sodp.Unit_Net_Weight,0),6), 2),2) AS TNet_Weight
    , ROUND(isnull(sodp.Unit_Packaging_Weight,0),6) + ROUND(isnull([Per_Qty], 0) * ROUND(isnull(sodp.Unit_Net_Weight,0),6), 2) AS Per_Gross_Weight
    , ROUND(isnull([Packing_Qty], 0) * (ROUND(isnull(sodp.Unit_Packaging_Weight,0),6) + ROUND(isnull([Per_Qty], 0) * ROUND(isnull(sodp.Unit_Net_Weight,0),6), 2)),2) AS Gross_Weight
    FROM Stock_Out_Detail_Packing sodp with(NoLock,NoWait)
    LEFT JOIN Stock_Out_Package sop with(NoLock,NoWait) ON sodp.Stock_Out_PackageID = sop.Stock_Out_PackageID
    WHERE sodp.Stock_Out_DetailID = {Stock_Out_DetailID}
  `, req.body);
  // console.log(strSQL)
  db.sql(req.SiteDB, strSQL)
    .then((result) => {
      result.recordsets[0].forEach((item) => {
        item.Per_Qty = Math.round(item.Per_Qty * 1000000)/1000000;
        item.Unit_Net_Weight = Math.round(item.Unit_Net_Weight * 1000000)/1000000;
        item.Unit_Packaging_Weight = Math.round(item.Unit_Packaging_Weight * 1000000)/1000000;
        item.Per_Net_Weight = Math.round(item.Per_Net_Weight * 1000000)/1000000;
        item.TNet_Weight = Math.round(item.TNet_Weight * 1000000)/1000000;
        item.Per_Gross_Weight = Math.round(item.Per_Gross_Weight * 1000000)/1000000;
        item.Gross_Weight = Math.round(item.Gross_Weight * 1000000)/1000000;
      })
      res.send(result.recordsets[0]);
    }).catch((err) => {
      console.log(err);
      res.status(500).send(err);
    })
});

// Maintain Stock_Out_Packing
router.post('/Stock_Out_Packing_Maintain', function (req, res, next) {
  console.log("Call Stock_Out_Packing_Maintain Api:", req.body);

  // req.body.Mode === 0 表示新增
  // req.body.Mode === 1 表示修改 
  // req.body.Mode === 2 表示刪除

  req.body.Stock_Out_No = req.body.Stock_Out_No ? req.body.Stock_Out_No : 0;
  req.body.Stock_Out_Detail_PackingID = req.body.Stock_Out_Detail_PackingID ? req.body.Stock_Out_Detail_PackingID : 0;
  req.body.Stock_Out_DetailID = req.body.Stock_Out_DetailID ? req.body.Stock_Out_DetailID : 0;
  req.body.Stock_Out_PackageID = req.body.Stock_Out_PackageID ? req.body.Stock_Out_PackageID : 0;
  req.body.Per_Qty = req.body.Per_Qty ? req.body.Per_Qty : null;
  req.body.Unit_Net_Weight = req.body.Unit_Net_Weight ? req.body.Unit_Net_Weight : 0;
  req.body.Unit_Packaging_Weight = req.body.Unit_Packaging_Weight ? req.body.Unit_Packaging_Weight : 0;
  req.body.Material_ColorID = req.body.Material_ColorID ? req.body.Material_ColorID : 0;

  let strSQL = format(`Declare @ROWCOUNT int = 0, @Mode int = {Mode}, @Stock_Out_PackageID int = {Stock_Out_PackageID}; `, req.body);

  switch (req.body.Mode) {
    case 0:
      strSQL += format(`
        Declare @Net_Weight float, @Packaging_Weight float

        Select @Net_Weight = isnull(m.Net_Weight,0)
        , @Packaging_Weight = iif(isnull(m.Packaging_Weight,0.1)=0, 0.1, isnull(m.Packaging_Weight,0.1))
        From Material_Color m
        Where m.Material_ColorID = {Material_ColorID}

        --Set @Stock_Out_PackageID = iif(@Stock_Out_PackageID > 0, @Stock_Out_PackageID, (Select Top 1 Stock_Out_PackageID From Stock_Out_Package t Where t.Stock_Out_No = {Stock_Out_No} Order by Stock_Out_PackageID desc) ) 

        INSERT INTO [dbo].[Stock_Out_Detail_Packing] ([Stock_Out_DetailID], [Stock_Out_PackageID], [Per_Qty]
        , [Unit_Net_Weight]
        , [Unit_Packaging_Weight]) 
        Select {Stock_Out_DetailID} as Stock_Out_DetailID
        , @Stock_Out_PackageID as Stock_Out_PackageID
        , {Per_Qty} as Per_Qty
        , Round(iif({Unit_Net_Weight}=0, @Net_Weight, {Unit_Net_Weight}),6) as Unit_Net_Weight
        , Round(iif({Unit_Packaging_Weight}=0, @Packaging_Weight, {Unit_Packaging_Weight}),6) as Unit_Packaging_Weight;

        Set @ROWCOUNT = @@ROWCOUNT;

        if( @ROWCOUNT > 0 
          And (  ({Unit_Net_Weight} > 0 And {Unit_Net_Weight} <> @Net_Weight)  
              or ({Unit_Packaging_Weight} >= 0.1 And {Unit_Packaging_Weight} <> @Packaging_Weight)
            )
        )
        Begin
          Update Material_Color set Net_Weight = Round({Unit_Net_Weight},6)
          , Packaging_Weight = Round({Unit_Packaging_Weight},6)
          Where Material_ColorID = {Material_ColorID};
        End        

      `, req.body);
      break;
    case 1:
      req.body.Value = req.body.Value ? req.body.Value : 0;

      switch(req.body.Name) {
        case "Unit_Net_Weight":
          strSQL += format(`
            Declare @Default float, @Value float;

            Select @Default = isnull(m.Net_Weight,0)
            From Material_Color m
            Where m.Material_ColorID = {Material_ColorID};
            
            Set @Value = round(iif( {Value} = 0, isnull(@Default,0), {Value} ),6);

            Update [dbo].[Stock_Out_Detail_Packing] Set [Unit_Net_Weight] = @Value
            where Stock_Out_Detail_PackingID = {Stock_Out_Detail_PackingID};

            Set @ROWCOUNT = @@ROWCOUNT;

            if(@ROWCOUNT > 0 And @Value > 0 And @Default <> @Value)
            Begin
              Update Material_Color set Net_Weight = @Value
              Where Material_ColorID = {Material_ColorID};
            End
          `, req.body);    
        break;
        case "Unit_Packaging_Weight":
          strSQL += format(`
            Declare @Default float, @Value float;
            Declare @Packaging_Weight float;

            Select @Default = isnull(m.Packaging_Weight,0)
            From Material_Color m
            Where m.Material_ColorID = {Material_ColorID};

            Set @Value = round(iif( {Value} = 0, iif(@Default=0, 0.1, @Default), {Value} ),6);

            Update [dbo].[Stock_Out_Detail_Packing] Set [Unit_Packaging_Weight] = @Value
            where Stock_Out_Detail_PackingID = {Stock_Out_Detail_PackingID};

            Set @ROWCOUNT = @@ROWCOUNT;

            if(@ROWCOUNT > 0 And @Value >= 0.1 And @Value <> @Default)
            Begin
              Update Material_Color set Packaging_Weight = @Value
              Where Material_ColorID = {Material_ColorID};
            End
          `, req.body);
        break;
        default:
          strSQL += format(`
            Update [dbo].[Stock_Out_Detail_Packing] Set [{Name}] = {Value}
            where Stock_Out_Detail_PackingID = {Stock_Out_Detail_PackingID}
            Set @ROWCOUNT = @@ROWCOUNT;
          `, req.body);    
        break; 
      }
      break;
    case 2:
      strSQL += format(`
        Delete FROM [dbo].[Stock_Out_Detail_Packing] 
        where Stock_Out_Detail_PackingID = {Stock_Out_Detail_PackingID};
        Set @ROWCOUNT = @@ROWCOUNT;
      `, req.body);
      break;
  }
  strSQL += format(`Select @ROWCOUNT as Flag;`, req.body);

   //console.log(strSQL)
  // res.send({ Flag: false })
  db.sql(req.SiteDB, strSQL)
    .then((result) => {
      res.send({
        Flag: result.recordsets[0][0].Flag > 0
      });
    }).catch((err) => {
      console.log(err);
      res.status(500).send(err);
    })
});

// Get Stock_Out_Package_Info
router.post('/Stock_Out_Package_Info', function (req, res, next) {
  console.log("Call Stock_Out_Package_Info Api:", req.body);

  req.body.Stock_Out_No = req.body.Stock_Out_No ? req.body.Stock_Out_No : null;

  let strSQL = format(`
    SELECT so.MPI_No, sop.Stock_Out_PackageID, sop.Stock_Out_No, sop.Packing_No, sop.Packing_Qty, sop.Packing_Unit, Count(sodp.Stock_Out_DetailID) AS Goods
    FROM Stock_Out_Package sop with(NoLock,NoWait)
    INNER JOIN Stock_Out so with(NoLock,NoWait) ON sop.Stock_Out_No = so.Stock_Out_No
    Left Outer JOIN Stock_Out_Detail_Packing sodp with(NoLock,NoWait) ON sop.Stock_Out_PackageID = sodp.Stock_Out_PackageID
    WHERE sop.Stock_Out_No = {Stock_Out_No}
    GROUP BY so.MPI_No, sop.Stock_Out_PackageID, sop.Stock_Out_No, sop.Packing_No, sop.Packing_Qty, sop.Packing_Unit
    ORDER BY sop.Stock_Out_No, sop.Packing_No
  `, req.body);
  // console.log(strSQL)
  db.sql(req.SiteDB, strSQL)
    .then((result) => {
      res.send(result.recordsets[0]);
    }).catch((err) => {
      console.log(err);
      res.status(500).send(err);
    })
});

// Maintain Stock_Out_Package
router.post('/Stock_Out_Package_Maintain', function (req, res, next) {
  console.log("Call Stock_Out_Package_Maintain Api:", req.body);

  // req.body.Mode === 0 表示新增
  // req.body.Mode === 1 表示修改 
  // req.body.Mode === 2 表示刪除

  req.body.Stock_Out_PackageID = req.body.Stock_Out_PackageID ? req.body.Stock_Out_PackageID : 0;
  req.body.Stock_Out_No = req.body.Stock_Out_No ? req.body.Stock_Out_No : 0;
  req.body.Packing_No = req.body.Packing_No ? `N'${req.body.Packing_No.trim().substring(0, 15).replace(/'/g, "''")}'` : `''`;
  req.body.Packing_Qty = req.body.Packing_Qty ? req.body.Packing_Qty : 0;
  req.body.Packing_Unit = req.body.Packing_Unit ? `N'${req.body.Packing_Unit.trim().substring(0, 10).replace(/'/g, "''")}'` : `''PCE''`;

  let strSQL = format(`Declare @ROWCOUNT int = 0, @Mode int = {Mode}; `, req.body);

  switch (req.body.Mode) {
    case 0:
      strSQL += format(`
        INSERT INTO [dbo].[Stock_Out_Package] ([Stock_Out_No], [Packing_No], [Packing_Qty], [Packing_Unit]) 
        Select {Stock_Out_No} as Stock_Out_No, {Packing_No} as Packing_No, {Packing_Qty} as Packing_Qty, {Packing_Unit} as Packing_Unit
        Where (Select count(*) From Stock_Out_Package p Where p.Stock_Out_No = {Stock_Out_No} And p.Packing_No = {Packing_No}) = 0;
        Set @ROWCOUNT = @@ROWCOUNT;
      `, req.body);
      break;
    case 1:
      let Size = 0;
      switch (req.body.Name) {
        case 'Packing_No':
          Size = 15;
          break;
        case 'Packing_Unit':
          Size = 10;
          break;
        default:
          break;
      }
      req.body.Value = Size > 0 ? `N'${req.body.Value.trim().substring(0, Size).replace(/'/g, "''")}'` : (req.body.Value != null ? req.body.Value : 0 );
      switch (req.body.Name) {
        case 'Packing_No':
          strSQL += format(`
            Update [dbo].[Stock_Out_Package] Set [{Name}] = {Value}
            where Stock_Out_PackageID = {Stock_Out_PackageID}
            And (select count(*) From Stock_Out_Package p where p.Stock_Out_No = {Stock_Out_No} And p.Packing_No = {Value}) = 0
            Set @ROWCOUNT = @@ROWCOUNT;
          `, req.body);    
          break;
        default:
          strSQL += format(`
            Update [dbo].[Stock_Out_Package] Set [{Name}] = {Value}
            where Stock_Out_PackageID = {Stock_Out_PackageID}
            Set @ROWCOUNT = @@ROWCOUNT;
          `, req.body);    
          break;
      }
      break;
    case 2:
      strSQL += format(`
        Delete FROM [dbo].[Stock_Out_Package] 
        where Stock_Out_PackageID = {Stock_Out_PackageID};
        Set @ROWCOUNT = @@ROWCOUNT;
      `, req.body);
      break;
  }
  strSQL += format(`Select @ROWCOUNT as Flag;`, req.body);

   //console.log(strSQL)
  // res.send({ Flag: false })
  db.sql(req.SiteDB, strSQL)
    .then((result) => {
      res.send({
        Flag: result.recordsets[0][0].Flag > 0
      });
    }).catch((err) => {
      console.log(err);
      res.status(500).send(err);
    })
});

// Get Selected_Stock_Out_Package_Info
router.post('/Selected_Stock_Out_Package_Info', function (req, res, next) {
  console.log("Call Selected_Stock_Out_Package_Info Api:", req.body);

  req.body.Stock_Out_PackageID = req.body.Stock_Out_PackageID ? req.body.Stock_Out_PackageID : null;

  let strSQL = format(`
  SELECT so.MPI_No
  , sodp.Stock_Out_Detail_PackingID
  , sodp.Stock_Out_DetailID
  , sodp.Stock_Out_PackageID
  , isnull(sodp.Per_Qty,0) as Per_Qty
  , round(isnull(sodp.Unit_Net_Weight,0),6) as Unit_Net_Weight
  , round(isnull(sodp.Unit_Packaging_Weight,0),6) as Unit_Packaging_Weight
  , sop.Packing_No
  , sop.Packing_Qty
  , sop.Packing_Unit
  , sod.Unit
  , Round(sodp.[Per_Qty] * round(isnull(sodp.Unit_Net_Weight,0),6),2) AS Per_Net_Weight
  , sop.[Packing_Qty] * Round(sodp.[Per_Qty] * round(isnull(sodp.Unit_Net_Weight,0),6),2) AS Net_Weight
  , round(isnull(sodp.Unit_Packaging_Weight,0),6) + Round(sodp.[Per_Qty] * round(isnull(sodp.Unit_Net_Weight,0),6),2) AS Per_Gross_Weight
  , sop.[Packing_Qty] * ( round(isnull(sodp.Unit_Packaging_Weight,0),6) + Round(sodp.[Per_Qty] * round(isnull(sodp.Unit_Net_Weight,0),6),2)) AS Gross_Weight
  , [Material_Category] + ' ' + [Material_Specific] + ' ' + [Material_Color] AS Material
  , sod.Purchase_DetailID
  , so.Stock_Out_No
  FROM Stock_Out_Detail_Packing sodp with(NoLock,NoWait)
  INNER JOIN Stock_Out_Package sop with(NoLock,NoWait) ON sodp.Stock_Out_PackageID = sop.Stock_Out_PackageID
  INNER JOIN Stock_Out so with(NoLock,NoWait) ON sop.Stock_Out_No = so.Stock_Out_No
  INNER JOIN Stock_Out_Detail sod with(NoLock,NoWait) ON sodp.Stock_Out_DetailID = sod.Stock_Out_DetailID
  Where sodp.Stock_Out_PackageID = {Stock_Out_PackageID}
  Order by sod.Stock_Out_DetailID;
  `, req.body);
  // console.log(strSQL)
  db.sql(req.SiteDB, strSQL)
    .then((result) => {
      result.recordsets[0].forEach((item) => {
        item.Per_Qty = Math.round(item.Per_Qty * 1000000)/1000000;
        item.Unit_Net_Weight = Math.round(item.Unit_Net_Weight * 1000000)/1000000;
        item.Unit_Packaging_Weight = Math.round(item.Unit_Packaging_Weight * 1000000)/1000000;
        item.Per_Net_Weight = Math.round(item.Per_Net_Weight * 1000000)/1000000;
        item.Net_Weight = Math.round(item.Net_Weight * 1000000)/1000000;
        item.Per_Gross_Weight = Math.round(item.Per_Gross_Weight * 1000000)/1000000;
        item.Gross_Weight = Math.round(item.Gross_Weight * 1000000)/1000000;
      })
      res.send(result.recordsets[0]);
    }).catch((err) => {
      console.log(err);
      res.status(500).send(err);
    })
});

// Get Stock_Out_Detail_No_Packing_Info
router.post('/Stock_Out_Detail_No_Packing_Info', function (req, res, next) {
  console.log("Call Stock_Out_Detail_No_Packing_Info Api:", req.body);

  req.body.Stock_Out_No = req.body.Stock_Out_No ? req.body.Stock_Out_No : null;

  let strSQL = format(`
    SELECT sod.Stock_Out_DetailID, sod.Stock_Out_No, sod.Material_Category, sod.Material_Specific, sod.Material_Color
    , sod.Unit
    , sod.Purchase_DetailID
    , sod.Charge_Qty
    , Round(ISNULL(Sum([Per_Qty] * [Packing_Qty]), 0), 10) AS Total_Packing_Qty
    , sod.Charge_Qty - Round(ISNULL(Sum([Per_Qty] * [Packing_Qty]), 0), 10) as Balance_Qty
    , sod.Material_Category + ' ' + sod.Material_Specific + ' ' + sod.Material_Color AS Material
    , round(isnull(mc.Net_Weight,0),6) as Unit_Net_Weight
    , round(isnull(mc.Packaging_Weight,0.1),6) as Unit_Packaging_Weight
    FROM Stock_Out_Detail sod with(NoLock,NoWait)
    LEFT JOIN Stock_Out_Detail_Packing sodp with(NoLock,NoWait) ON sod.Stock_Out_DetailID = sodp.Stock_Out_DetailID
    LEFT JOIN Stock_Out_Package sop with(NoLock,NoWait) ON sodp.Stock_Out_PackageID = sop.Stock_Out_PackageID
    Left Outer Join Material_color mc with(Nolock,NoWait) on mc.Material_ColorID = sod.Material_ColorID
    WHERE sod.Stock_Out_No = {Stock_Out_No}
    GROUP BY sod.Stock_Out_DetailID, sod.Stock_Out_No, sod.Material_Category, sod.Material_Specific, sod.Material_Color
    , sod.Unit
    , sod.Purchase_DetailID, sod.Charge_Qty
    , isnull(mc.Net_Weight,0), isnull(mc.Packaging_Weight,0.1)
    HAVING (ROUND(ISNULL(SUM([Per_Qty] * [Packing_Qty]), 0), 10) <> cast([Charge_Qty] as money))
    Order by sod.Stock_Out_DetailID;
  `, req.body);
  // console.log(strSQL)
  db.sql(req.SiteDB, strSQL)
    .then((result) => {
      result.recordsets[0].forEach((item) => {
        item.Charge_Qty = Math.round(item.Charge_Qty * 1000000)/1000000;
        item.Total_Packing_Qty = Math.round(item.Total_Packing_Qty * 1000000)/1000000;
        item.Balance_Qty = Math.round(item.Balance_Qty * 1000000)/1000000;
        item.Unit_Net_Weight = Math.round(item.Unit_Net_Weight * 1000000)/1000000;
        item.Unit_Packaging_Weight = Math.round(item.Unit_Packaging_Weight * 1000000)/1000000;
      })
      res.send(result.recordsets[0]);
    }).catch((err) => {
      console.log(err);
      res.status(500).send(err);
    })
});

/* Darren-Chang API End */

module.exports = router;