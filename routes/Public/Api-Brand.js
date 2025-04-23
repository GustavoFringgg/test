var express = require('express');
var router = express.Router();
const format = require('string-format');
var db = require('../../config/DB_Connect');


router.post('/Brand_List', function (req, res, next) {
    console.log("Call Brand_List Api", req.body);

    req.body.Brand = req.body.Brand ? `${req.body.Brand.trim().substring(0, 30).replace(/'/g, '')}` : '';
    req.body.BrandID = req.body.BrandID ? `${req.body.BrandID.trim().substring(0, 3).replace(/'/g, '')}` : '';
    req.body.History_User = req.body.History_User ? `${req.body.History_User.trim().substring(0, 20).replace(/'/g, '')}` : '';

    let strSQL = format(`
        SELECT *
          FROM [ERP].[dbo].[Brand]
          where 1 = 1
        `);

    if (req.body.Brand !== '') {
        req.body.Brand = req.body.Brand.toUpperCase()
        strSQL += `AND Brand like '%${req.body.Brand}%'`
    }
    if (req.body.BrandID !== '') {
        req.body.BrandID = req.body.BrandID.toUpperCase()
        strSQL += `AND BrandID like '%${req.body.BrandID}%'`
    }
    if (req.body.History_User !== '') {
        req.body.History_User = req.body.History_User.toUpperCase()
        strSQL += `AND BrandID like '%${req.body.History_User}%'`
    }
    strSQL += 'order by Brand'

    db.sql(req.SiteDB, strSQL)
        .then((result) => {
            res.send(result.recordset);
        })
        .catch((err) => {
            console.log(err);
            res.status(500).send(err);
        })
});

router.post('/Brand_Maintain', function (req, res, next) {
    console.log("Call Brand_Maintain Api:", req.body);

    switch (req.body.Mode) {
        case 0:
            let brand = req.body.insertData.Brand ? `${req.body.insertData.Brand.trim().substring(0, 30).replace(/'/g, '').toUpperCase()}` : '';
            let brandID = req.body.insertData.BrandID ? `${req.body.insertData.BrandID.trim().substring(0, 3).replace(/'/g, '').toUpperCase()}` : '';
            let History_User = req.body.insertData.History_User ? `${req.body.insertData.History_User.trim().substring(0, 20).replace(/'/g, '')}` : '';

            if (brand !== '' & brandID !== '') {

                let columnStr = ''
                let valueStr = ''

                if (brand) {
                    columnStr += `[brand],`
                    valueStr += `'${brand}',`
                }
                if (brandID) {
                    columnStr += `[brandID],`
                    valueStr += `'${brandID}',`
                }
                if (req.body.insertData.isHistoryCheck) {
                    columnStr += `[Histiry_Date],`
                    valueStr += `getdate(),`

                    columnStr += `[History_User],`
                    valueStr += `'${History_User}',`
                }

                columnStr = columnStr.slice(0, -1)
                valueStr = valueStr.slice(0, -1)

                let strSQL = format(`INSERT INTO [ERP].[dbo].[Brand]  (${columnStr}) 
                    VALUES (${valueStr})
                `);
                console.log(strSQL);

                db.sql(req.SiteDB, strSQL)
                    .then((result) => {
                        res.send(result);
                    })
                    .catch((err) => {
                        console.log(err);
                        res.status(500).send(err);
                    })
            } else {
                res.send('Required field is not filled in.')
            }
            break;
        case 1:
            let newBrand = req.body.newData.Brand ? `${req.body.newData.Brand.trim().substring(0, 30).replace(/'/g, '')} ` : '';
            let newBrandID = req.body.newData.BrandID ? `${req.body.newData.BrandID.trim().substring(0, 3).replace(/'/g, '')} ` : '';
            let newHistory_User = req.body.newData.History_User ? `${req.body.newData.History_User.trim().substring(0, 20).replace(/'/g, '')}` : '';

            let newValueStr = ''

            if (newBrand !== '' & newBrandID !== '') {
                if (newBrand) {
                    newValueStr += `Brand = '${newBrand}',`
                }
                if (newBrandID) {
                    newValueStr += `BrandID = '${newBrandID}',`
                }
                if (req.body.newData.isHistoryChange) {
                    if(req.body.originData.History_User){
                        newValueStr += `Histiry_Date = null,`
                        newValueStr += `History_User = null,`
                    }else{
                        newValueStr += `Histiry_Date = getdate(),`
                        newValueStr += `History_User = '${newHistory_User}',`
                    }
                }
                newValueStr = newValueStr.slice(0, -1)

                let strSQL = format(`
                UPDATE [ERP].[dbo].[Brand]
                SET ${newValueStr}
                WHERE Brand = '${req.body.originData.Brand}' And BrandID = '${req.body.originData.BrandID}'
                
            `);
                console.log(strSQL);


                db.sql(req.SiteDB, strSQL)
                    .then((result) => {
                        res.send(result);
                    })
                    .catch((err) => {
                        console.log(err);
                        res.status(500).send(err);
                    })
            } else {
                res.send('Required field is not filled in.')
            }
            break;
        case 2:
            let cancelBrand = req.body.cancelData.Brand ? `${req.body.cancelData.Brand.trim().substring(0, 25).replace(/'/g, '')}` : '';
            let cancelBrandID = req.body.cancelData.BrandID ? `${req.body.cancelData.BrandID.trim().substring(0, 25).replace(/'/g, '')}` : '';

            if (cancelBrand !== '' & cancelBrandID !== '') {
                let strSQL = format(`
                DELETE FROM [ERP].[dbo].[Brand]
                WHERE Brand = '${cancelBrand}' And BrandID = '${cancelBrandID}';
            `);

                db.sql(req.SiteDB, strSQL)
                    .then((result) => {
                        res.send(result);
                    })
                    .catch((err) => {
                        console.log(err);
                        res.status(500).send(err);
                    })
            } else {
                res.send('Required field is not filled in.')
            }
            break;


    }
})


module.exports = router;