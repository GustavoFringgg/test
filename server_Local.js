//Initiallising node modules
var express = require("express");
const compression = require('compression');
var app = express();
const sql = require('mssql');
var fs = require('fs')
var config = require('./config/DB_Setup');
var https = require('https')
//var proxy = require('http-proxy-middleware');
//var bodyParser = require("body-parser");
var WebServer = require('./config/WebServer');
var oauth2Token = require('./config/oauth2-token');
var tokenVerify = require('./config/token-verify');
var storage = require('dom-storage');
var localStorage = new storage('./salt.json');
var item = localStorage.getItem('object');
const rateLimit = require("express-rate-limit");
const path = require('path')
var proxy = require('http-proxy-middleware')
var functions = require('./config/functions');
var url = require("url");
var moment = require('moment');
var Params = process.argv.splice(2);

// var net = require("net");
//var cors = require('cors');  
app.use(compression());


// Enable if you're behind a reverse proxy (Heroku, Bluemix, AWS ELB, Nginx, etc)
// see https://expressjs.com/en/guide/behind-proxies.html
// app.set('trust proxy', 1);

const apiLimiter = rateLimit({
  windowMs: 1 * 1 * 1000, // 1 minutes
  max: 1000,
  message:
    "Too many accounts created from this IP, please try again after an hour"
});


const LoginAccountLimiter = rateLimit({
  windowMs: 1 * 1 * 1000, // 1 min window
  max: 10, // start blocking after 5 requests
  message:
    "Too many accounts created from this IP, please try again after an hour"
});


const Enterprise = new sql.ConnectionPool(config.Enterprise, function(err){
   if (err){
      console.log(`${moment().format("YYYY-MM-DD HH:mm:ss.SS")} : `,err);
   }
 })

const SiteDB = new sql.ConnectionPool(config.SiteDB, function(err){
   if (err){
      console.log(`${moment().format("YYYY-MM-DD HH:mm:ss.SS")} : `,err);
   }
 })

//app.use(cors());

// 使用 bodyparser.json() 將 HTTP 請求方法 POST、DELETE、PUT 和 PATCH，放在 HTTP 主體 (body) 發送的參數存放在 req.body
app.use(express.urlencoded({ extended: false }));
app.use(express.json({"limit":"102400kb"})); // 提高 post 接收的大小(10MB)

// var options = {
//    target: 'https://erp.shinymark.com:3433', // 目標主機 
//    changeOrigin: true, // 需要虛擬主機站點 
// };
// var exampleProxy = proxy(options);

var Accounting = require('./routes/Accounting/Accounting');
var Develop = require('./routes/Develop/Develop');
var Inventory = require('./routes/Inventory/Inventory');
var Personnel = require('./routes/Personnel/Personnel');
var Purchasing = require('./routes/Purchasing/Purchasing');
var Production = require('./routes/Production/Production');
var Public = require('./routes/Public/Public');
var Sales = require('./routes/Sales/Sales');
var Shipping = require('./routes/Shipping/Shipping');
var System = require("./routes/System/System");
var ApiRouter_permission = require('./config/permission');


//CORS Middleware
// app.use(function (err, req, res, next) {
//    console.log("========================================== Begin =============================================================")
//    console.log(`${moment().format("YYYY-MM-DD HH:mm:ss.SS")} : ${err.status || 500} - ${err.message} - ${req.originalUrl} - ${req.method} - ${req.ip}`);   
//    console.log("=========================================== END ==============================================================")
//    console.error(err.stack);
//    next(err);
// })


//CORS Middleware
app.use(function (req, res, next) {
   req.ObjItem = item;
   req.Enterprise = Enterprise;   
   req.SiteDB = SiteDB;
   // console.log("ips = " , JSON.stringify(req.ips));// 相當於(req.header('x-forwarded-for') || '').split(',')
   // console.log("remote Address = " , req.connection.remoteAddress);// 未發生代理時，請求的ip
   // console.log("ip = " , req.ip);// 同req.connection.remoteAddress, 但是格式要好一些
   //console.log(req);
   //Enabling CORS 
   //if(err)
   //console.log(`${err.status || 500} - ${err.message} - ${req.originalUrl} - ${req.method} - ${req.ip}`);   
   res.header('Access-Control-Allow-Origin', '*');
   res.header('Access-Control-Allow-Headers', 'Authorization, Origin, X-Requested-With, Content-Type, Accept');
   res.header('Access-Control-Allow-Methods', 'GET, PUT, POST, DELETE, OPTIONS');
   res.header('Access-Control-Allow-Credentials', 'true');
   next();
})


//app.use(functions.passwdCrypto);
app.use('/api/login',LoginAccountLimiter, oauth2Token);


app.get("/", LoginAccountLimiter, function (req, res) {
   res.send('<h1>Node.js Backend Server</h1>');
});

 
// 不須 token 即可訪問的 Web API 須定義在此上面，通常登入頁面 (此例為登入驗證取得 token 頁面的 /auth2/token)
app.use(tokenVerify);


// Router Setting
app.use('/api/Accounting', apiLimiter, Accounting);
app.use('/api/Develop', apiLimiter, Develop);
app.use('/api/Inventory', apiLimiter, Inventory);
app.use('/api/Personnel', apiLimiter, Personnel);
app.use('/api/Purchasing', apiLimiter, Purchasing);
app.use('/api/Production', apiLimiter, Production);
app.use('/api/Public', apiLimiter, Public);
app.use('/api/Sales', apiLimiter, Sales);
app.use('/api/Shipping', apiLimiter, Shipping);
app.use("/api/System", apiLimiter, System);
app.use('/api/permission', apiLimiter, ApiRouter_permission);


//Setting up server

// SSLkey:`${HOSTNAME}-key.pem`,
// SSLCRT:`${HOSTNAME}-crt.pem`
// const Option_PEM = {
//    key: fs.readFileSync(`${WebServer.SSLkey}`),
//    cert: fs.readFileSync(`${WebServer.SSLCRT}`),
//  };

   // app.listen(process.env.PORT || 3433)
   var server = app.listen(process.env.PORT || 7702, function () {
      var port = server.address().port;
      console.log(`[Dev] App now running on port ${port} [dev]`);
      //console.log("App now Arguments", Params);
   });

