//Initiallising node modules
var express = require("express");
const sql = require('mssql');
var fs = require('fs')
var config = require('./config/DB_Setup');
var https = require('https')
var app = express();
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

//var cors = require('cors');  
//app.use(cors());

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
   max: 100, // start blocking after 5 requests
   message:
     "Too many accounts created from this IP, please try again after an hour"
 });


const Enterprise = new sql.ConnectionPool(config.Enterprise, function(err){
   if (err){
   console.log(err);
   }
 })

const SiteDB = new sql.ConnectionPool(config.SiteDB, function(err){
   if (err){
   console.log(err);
   }
 })

// 使用 bodyparser.json() 將 HTTP 請求方法 POST、DELETE、PUT 和 PATCH，放在 HTTP 主體 (body) 發送的參數存放在 req.body
app.use(express.urlencoded({ extended: false }));
app.use(express.json({"limit":"102400kb"})); // 提高 post 接收的大小(10MB)


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
app.use(function (req, res, next) {
   req.ObjItem = item;
   req.Enterprise = Enterprise;   
   req.SiteDB = SiteDB;
   //Enabling CORS 
   res.header('Access-Control-Allow-Origin', '*');
   res.header('Access-Control-Allow-Headers', 'Authorization, Origin, X-Requested-With, Content-Type, Accept');
   res.header('Access-Control-Allow-Methods', 'GET, PUT, POST, DELETE, OPTIONS');
   res.header('Access-Control-Allow-Credentials', 'true');
   next();
})

//app.use(functions.passwdCrypto);
app.use('/api/login',LoginAccountLimiter, oauth2Token);
 
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



// SSLkey:`${HOSTNAME}-key.pem`,
// SSLCRT:`${HOSTNAME}-crt.pem`
// const Option_PEM = {
//    key: fs.readFileSync(`${WebServer.SSLkey}`),
//    cert: fs.readFileSync(`${WebServer.SSLCRT}`),
//  };

 const Option_PFX = {
   pfx: fs.readFileSync('certificate.pfx'),
   passphrase: 'IZbp9X5Sh5dRPTn7J3FOIoVol2NQ1XD3G0hhwKNq1dI='
 };


https.createServer( Option_PFX , app)
 .listen(3433)

app.get("/", apiLimiter, function (req, res) {
   res.send('<h1>Node.js Backend Server</h1>');
});
