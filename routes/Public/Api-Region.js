var express = require('express');
var router = express.Router();
const format = require('string-format');
var db = require('../../config/DB_Connect');


router.post('/Region_List', function (req, res, next) {
    console.log("Call Region_List Api",req.body);

    req.body.Region = req.body.Region ? `${req.body.Region.trim().substring(0, 50).replace(/'/g, '')}` : '';

    let strSQL = format(`
        SELECT [Region]
          FROM [ERP].[dbo].[Region]
          where 1 = 1
        `);

    if (req.body.Region !== '') {
        req.body.Region = req.body.Region.toUpperCase()
        strSQL += `AND Region = '${req.body.Region}'`
    }    

    db.sql(req.SiteDB, strSQL)
        .then((result) => {
            res.send(result.recordset);
        })
        .catch((err) => {
            console.log(err);
            res.status(500).send(err);
        })



});

router.post('/Region_Maintain', function (req, res, next) {
    console.log("Call Region_Maintain Api:",req.body);

    switch (req.body.Mode) {
        case 0:
            let region = req.body.insertData.Region ? `${req.body.insertData.Region.trim().substring(0, 15).replace(/'/g, '')}` : '';
            if (region !== '') {

                region = region.toUpperCase()

                let strSQL = format(`
                        INSERT INTO [ERP].[dbo].[Region] (Region)
                        VALUES ('${region}');
                    `);

                db.sql(req.SiteDB, strSQL)
                    .then((result) => {
                        res.send(result);
                    })
                    .catch((err) => {
                        console.log(err);
                        res.status(500).send(err);
                    })
            }
            break;
        case 1:
            newRegion = req.body.newData.Region ? `${req.body.newData.Region.trim().substring(0, 25).replace(/'/g, '')}` : '';

            if (newRegion !== '') {
                newRegion = newRegion.toUpperCase()

                let strSQL = format(`
                UPDATE [ERP].[dbo].[Region]
                SET Region = '${newRegion}'
                WHERE Region = '${req.body.originData.Region}';

            `);

                db.sql(req.SiteDB, strSQL)
                    .then((result) => {
                        res.send(result);
                    })
                    .catch((err) => {
                        console.log(err);
                        res.status(500).send(err);
                    })
            }
            break;
        case 2:


            cancelRegion = req.body.cancelData.Region ? `${req.body.cancelData.Region.trim().substring(0, 25).replace(/'/g, '')}` : '';

            if (cancelRegion !== '') {
                cancelRegion = cancelRegion.toUpperCase()

                let strSQL = format(`
                DELETE FROM [ERP].[dbo].[Region]
                WHERE Region = '${cancelRegion}';
            `);

                db.sql(req.SiteDB, strSQL)
                    .then((result) => {
                        res.send(result);
                    })
                    .catch((err) => {
                        console.log(err);
                        res.status(500).send(err);
                    })
            }
            break;


    }
})


module.exports = router;