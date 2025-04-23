var express = require('express');
var router = express.Router();
const format = require('string-format');
var db = require('../../config/DB_Connect');


router.post('/City_List', function (req, res, next) {
    console.log("Call City_List Api",req.body);

    req.body.Country = req.body.Country ? `${req.body.Country.trim().substring(0, 15).replace(/'/g, '')}` : '';
    req.body.City = req.body.City ? `${req.body.City.trim().substring(0, 25).replace(/'/g, '')}` : '';

    let strSQL = format(`
        SELECT [Country]
          ,[City]
          FROM [ERP].[dbo].[City]
          where 1 = 1
        `);

    if (req.body.Country !== '') {
        req.body.Country = req.body.Country.toUpperCase()
        strSQL += `AND Country = '${req.body.Country}'`
    }
    if (req.body.City !== '') {
        req.body.City = req.body.City.toUpperCase()
        strSQL += `AND City = '${req.body.City}'`
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

router.post('/City_Maintain', function (req, res, next) {
    console.log("Call City_Maintain Api:",req.body);

    switch (req.body.Mode) {
        case 0:
            let country = req.body.insertData.Country ? `${req.body.insertData.Country.trim().substring(0, 15).replace(/'/g, '')}` : '';
            let city = req.body.insertData.City ? `${req.body.insertData.City.trim().substring(0, 15).replace(/'/g, '')}` : '';
            if (country !== '' && city !== '') {

                country = country.toUpperCase()
                city = city.toUpperCase()

                let strSQL = format(`
                        INSERT INTO [ERP].[dbo].[City] (Country, City)
                        VALUES ('${country}', '${city}');
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
            newCountry = req.body.newData.Country ? `${req.body.newData.Country.trim().substring(0, 15).replace(/'/g, '')}` : '';
            newCity = req.body.newData.City ? `${req.body.newData.City.trim().substring(0, 25).replace(/'/g, '')}` : '';

            if (newCountry !== '' && newCity !== '') {
                newCountry = newCountry.toUpperCase()
                newCity = newCity.toUpperCase()

                let strSQL = format(`
                UPDATE [ERP].[dbo].[City]
                SET Country = '${newCountry}', City = '${newCity}'
                WHERE Country = '${req.body.originData.Country}' AND City = '${req.body.originData.City}';

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


            cancelCountry = req.body.cancelData.Country ? `${req.body.cancelData.Country.trim().substring(0, 15).replace(/'/g, '')}` : '';
            cancelCity = req.body.cancelData.City ? `${req.body.cancelData.City.trim().substring(0, 25).replace(/'/g, '')}` : '';

            if (cancelCountry !== '' && cancelCity !== '') {
                cancelCountry = cancelCountry.toUpperCase()
                cancelCity = cancelCity.toUpperCase()

                let strSQL = format(`
                DELETE FROM [ERP].[dbo].[City]
                WHERE Country = '${cancelCountry}' AND City = '${cancelCity}';
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