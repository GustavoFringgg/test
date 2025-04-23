var express = require('express');
var oauth2 = require('./Auth');
var moment = require('moment');
var router = express.Router();
var storage = require('dom-storage');
var localStorage = new storage('./upload/salt.json');
const OverTimes = 1000, Recount_Mins = 1
 
router.route('/')
    .post(
        function (req, res, next) {
          /*
            try {
              req.body = JSON.parse((Buffer.from(req.body.param, 'base64').toString()));
            } catch(err) {
              res.status(401).json({ error: '登入格式錯誤，疑似入侵!' });
              console.log(`登入格式錯誤，疑似入侵測試!`)
              return;
            }
          */
            //console.log(req.body)
            //console.log("oauth2.login_ldap",req)
            var obj = localStorage.getItem(`${req.body.UserID}`) 
            //console.log(obj.Date)
            //console.log(moment(obj.Date,"YYYY/MM/DD HH:mm:ss").valueOf() , moment().valueOf() )
            if(!obj || moment(obj.Date,"YYYY/MM/DD HH:mm:ss").valueOf() < moment().valueOf() ) {
              obj = {Date: moment().add(Recount_Mins,'minutes').format("YYYY/MM/DD HH:mm:ss"), Count: 0}
              localStorage.setItem(`${req.body.UserID}`, obj)
              //console.log(`obj:${obj.Date}`)
            } 
            
            // 驗證 OAuth 2.0 授權類型
            if(obj.Count++ < OverTimes) {
              oauth2.login_ldap(req, function(results){
                  //console.log("oauth2.login_ldap",results.UserID)
                  if (!results.isLdapAuth) {
                      res.status(401).json({ error: 'invalid_client', error_description: '登入驗證失敗！' });
                      localStorage.setItem(`${results.UserID}`, obj)  
                      return;
                  }
                  req.results = results;
                  next();
              });
            } else {
              console.log(`UserID:${req.body.UserID} 目前登入${obj.Count}, 超過LDAP驗證次數!`)
              res.status(401).json({ error: '超過LDAP驗證次數', error_description: `目前登入${obj.Count}, 超過LDAP驗證次數!` });
              localStorage.setItem(`${req.body.UserID}`, obj)  
              return;
            }
        }, 
        function (req, res) {
            oauth2.createToken(req, function (results) {
                // 確保客戶端瀏覽器不緩存此請求 (OAuth 2.0 標準)
                res.header('Cache-Control', 'no-store');
                res.header('Pragma', 'no-cache');
                res.json(results);
            });
        });
 
module.exports = router;