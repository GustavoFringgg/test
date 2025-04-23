var express = require('express');
var router = express.Router();
const format = require('string-format');
var db = require('../../config/DB_Connect');


// 通用的字符串處理函數
function sanitizeInput(input, maxLength) {
    return input ? input.trim().substring(0, maxLength).replace(/'/g, '') : '';
}


// Get Organization_List
router.post('/Organization_List', function (req, res, next) {
    console.log("Call Organization_List Api:", req.body);

    // 對輸入進行處理
    const OrganizationID = sanitizeInput(req.body.OrganizationID, 10);
    const Organization_Name_ENG = sanitizeInput(req.body.Organization_Name_ENG, 100);
    const Organization_Name_CHT = sanitizeInput(req.body.Organization_Name_CHT, 100);

    // 構建 SQL 語句
    const strSQL = `
        SELECT TOP 1000
            row_number() OVER (ORDER BY OrganizationID) AS RecNo,
            OrganizationID,
            Organization_Name_CHT,
            Organization_Name_ENG,
            Organization.Postcode + N' ' + Organization.State_City_CHT + Organization.Township_District_CHT + Organization.Street_CHT AS OrganizationAddress_CHT,
            Organization.Street_ENG + N', ' + Organization.Township_District_ENG + N', ' + Organization.State_City_ENG + N' ' + Organization.Postcode + N', ' + Organization.Region_ENG AS OrganizationAddress_ENG,
            '/Datas/Images/Organizations/Trademarks/' + OrganizationID + '.png' AS Org_Photo,
            Phone_Number,
            Fax_Number,
            History_Date,
            History_User
        FROM [dbo].[Organization] WITH (NOLOCK, NOWAIT)
        WHERE ('${OrganizationID}' = '' OR OrganizationID LIKE '${OrganizationID}%')
          AND ('${Organization_Name_ENG}' = '' OR Organization_Name_ENG LIKE '%${Organization_Name_ENG}%')
          AND ('${Organization_Name_CHT}' = '' OR Organization_Name_CHT LIKE '%${Organization_Name_CHT}%')
          ${req.body.History_Check ? '' : 'And [History_User] IS NULL'}
        ORDER BY RecNo;
    `;

    // 執行查詢並傳遞參數
    db.sql(req.Enterprise, strSQL)
        .then((result) => {
            res.send(result.recordset);
        })
        .catch((err) => {
            console.log(err);
            res.status(500).send(err);
        });
});


//Check OrganizationID
router.post('/Check_OrganizationID', function (req, res, next) {
    console.log("Call Check_OrganizationID Api:", req.body);

    const OrganizationID = sanitizeInput(req.body.OrganizationID, 10);

    var strSQL = `
     SELECT COUNT(*) AS RecCount
        FROM [dbo].[Organization] WITH (NOLOCK, NOWAIT)
        WHERE [OrganizationID] = N'${OrganizationID}'
    `;
    // 執行查詢
    db.sql(req.Enterprise, strSQL)
        .then((result) => {
            res.send({ Flag: result.recordset[0].RecCount <= 0 });
        })
        .catch((err) => {
            console.log(err);
            res.status(500).send(err);
        });
});


// 檢索 Organization 的詳細信息
router.post('/Organization_Info', function (req, res, next) {
    console.log("Call Organization_Info Api:", req.body);

    // 處理 OrganizationID
    const OrganizationID = sanitizeInput(req.body.OrganizationID, 10);

    // 構建 SQL 語句
    const strSQL = `
    SELECT
        [OrganizationID]
      ,[Organization_Name_CHT]
      ,[Organization_Name_ENG]
      ,[Organization_Name]
      ,[L2_Organization_Name]
      ,[Address]
      ,[L2_Address]
      ,[V1_Address]
      ,[Chairman_ENG]
      ,[Chairman_CHT]
      ,[Chairman]
      ,[L2_Chairman]
      ,[Business_No]
      ,[Phone_Number]
      ,[Fax_Number]
      ,[Create_Date]
      ,[History_User]
      ,[Website]
      ,[Region_CHT]
      ,[Region_ENG]
      ,[Postcode]
      ,[State_City_CHT]
      ,[State_City_ENG]
      ,[Township_District_CHT]
      ,[Township_District_ENG]
      ,[Street_CHT]
      ,[Street_ENG]
      ,'/Datas/Images/Organizations/Trademarks/' + OrganizationID + '.png' AS Org_Photo
      ,[Data_Updater]
      ,[Data_Update]
      ,[Purchasing]
      ,o.[UserID]
      , isnull(uos.[LoweredUserName], '') as [Superior]
      , case when History_Date is null then '' else convert(varchar(10), [History_Date],111) End as [History_Date]
      , cast(ABS(CASE WHEN [History_User] IS NOT NULL THEN 1 ELSE 0 END) as bit) as [History_Check]
      , cast(ABS(CASE WHEN uos.[LoweredUserName] IS NOT NULL THEN 1 ELSE 0 END) as bit) as [Basic_Info_Check]
        FROM [dbo].[Organization] o WITH (NOLOCK, NOWAIT)
        LEFT JOIN UsersOnSuperiors uos with(NoLock,NoWait) ON uos.OnSuperior = o.[Data_Updater]
        WHERE [OrganizationID] = N'${OrganizationID}';


 DECLARE @columns NVARCHAR(MAX), @sql NVARCHAR(MAX);

SELECT @columns = STUFF((
    SELECT ',' + QUOTENAME(COLUMN_NAME )
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_NAME = 'ORGANIZATION'
    FOR XML PATH(''), TYPE
).value('.', 'NVARCHAR(MAX)'), 1, 1, '');

SET @sql = '
SELECT ' + @columns + '
FROM (
    SELECT COLUMN_NAME, DATA_TYPE
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_NAME = ''ORGANIZATION''
) AS SourceTable
PIVOT (
    MAX(DATA_TYPE)
    FOR COLUMN_NAME IN (' + @columns + ')
) AS PivotTable';
EXEC sp_executesql @sql;

SELECT @columns = STUFF((
    SELECT ',' + QUOTENAME(COLUMN_NAME )
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_NAME = 'ORGANIZATION'
    FOR XML PATH(''), TYPE
).value('.', 'NVARCHAR(MAX)'), 1, 1, '');

SET @sql = '
SELECT ' + @columns + '
FROM (
    SELECT COLUMN_NAME, CHARACTER_MAXIMUM_LENGTH AS COL_SIZE
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_NAME = ''ORGANIZATION''
) AS SourceTable
PIVOT (
    MAX(COL_SIZE)
    FOR COLUMN_NAME IN (' + @columns + ')
) AS PivotTable';

EXEC sp_executesql @sql;

    `;

    // 執行查詢
    db.sql(req.Enterprise, strSQL)
        .then((result) => {

         var DataSet = {Data:result.recordsets[0]}
         DataSet.Data[0].DataType = result.recordsets[1]
         DataSet.Data[0].ColSize= result.recordsets[2]
          res.send(result.recordset);
       //  console.log(result.recordset);
        })
        .catch((err) => {
            console.log(err);
            res.status(500).send(err);
        });
});


//Maintain Organization
router.post('/Organization_Maintain', function (req, res, next) {
    console.log("Call Organization_Maintain Api:", req.body);

    // req.body.Mode === 0 表示新增
    // req.body.Mode === 1 表示修改
    // req.body.Mode === 2 表示刪除
    req.body.OrganizationID = req.body.OrganizationID ? `N'${req.body.OrganizationID.trim().substring(0, 15).replace(/'/g, "''")}'` : `''`;

    let strSQL = 'Declare @ROWCOUNT int '
    switch (req.body.Mode) {
        case 0:
            strSQL += format(`
             Insert into [dbo].[Organization] (OrganizationID, UserID, Data_Update, Data_Updater)
             Select {OrganizationID} as OrganizationID, N'${req.UserID}' as UserID, GetDate() as [Data_Update], N'${req.UserID}' as Data_Updater
             Where ( SELECT Count(*) as RecCount FROM [dbo].[Organization] With(Nolock,NoWait) where [OrganizationID] = {OrganizationID} ) = 0 ;
             Set @ROWCOUNT = @@ROWCOUNT;
          `, req.body);
            break;
        case 1:
           //const DATATYPE = req.body.DataType;
           console.log(req.body.DataType);
            //const Size = req.body.ColSize;
            console.log(req.body.ColSize);
          //  const IsText = (req.body.DataType == 'nvarchar' || req.body.DataType == 'varchar')?true:false;
            const columnTypes = {
                'Text':['nvarchar','varchar'],
                'Boolean': ['bit'],
                'Numeric': ['float', 'int'],
                'DateTime':['datetime']
            };
            let valueType = columnTypes['Text'].includes(req.body.DataType)
                ? 'Text': columnTypes['Boolean'].includes(req.body.DataType)
                    ? 'Boolean': columnTypes['Numeric'].includes(req.body.DataType)
                    ?'Numeric':'DateTime';

            switch (valueType) {
                 case 'Text':
                     req.body.Value = (req.body.Value.length == 0) ? null:"N'"+ req.body.Value.trim().replace(/'/g, "''") +"'";
                     break;
                 case 'Numeric':
                     req.body.Value = req.body.Value?req.body.Value:null;
                     break
                 case 'Boolean':
                     req.body.Value = (req.body.Value==true)?1:0;
                     break;
                 default:
                     break;
             }

             const Size = (req.body.ColSize===null)?0:((req.body.ColSize===-1)?65536:req.body.ColSize);
             const UserID = (req.UserID === 'aaron-ho'|| req.UserID === 'mark-wang') ? null : req.UserID;

            if (req.body.Name == 'History_Check') {
                strSQL += format(`
                Update [dbo].[Organization] Set ${req.body.Value === 0 ? ' History_User = null, History_Date = null ' : ` History_User = N'${req.UserID}', History_Date = GetDate() `}
                   where OrganizationID = {OrganizationID};
                   Set @ROWCOUNT = @@ROWCOUNT;
                `, req.body);
            } else {
                strSQL += format(`
                Update [dbo].[Organization] Set [{Name}] = ${Size === 0 ? '{Value}' : `SUBSTRING({Value},1,${Size})`}
                , UserID = '{UserID}'
                , Data_Updater = N'${req.UserID}'
                , Data_Update = GETDATE()
                where OrganizationID = {OrganizationID}
                ${req.body.Name === 'OrganizationID' ? ` And (SELECT Count(*) as RecCount FROM Organization as p WITH (NoWait, Nolock) Where p.OrganizationID = {Value}) = 0 ` : ""};
                Set @ROWCOUNT = @@ROWCOUNT;
             `, req.body);
            }
            break;
        case 2:
            strSQL += format(`
             Delete FROM [dbo].[Organization]
             where OrganizationID = {OrganizationID};
             Set @ROWCOUNT = @@ROWCOUNT;
          `, req.body);
            break;
    }

    strSQL += format(`
    Select @ROWCOUNT as Flag;
    `, req.body);
    console.log(strSQL)
    db.sql(req.Enterprise, strSQL)
        .then((result) => {
            //console.log(result.recordsets[0])
            res.send({ Flag: result.recordsets[0][0].Flag > 0 });
        }).catch((err) => {
            console.log(err);
            res.status(500).send(err);
        })

});


module.exports = router;
