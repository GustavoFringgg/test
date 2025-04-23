//Initiallising node modules
var express = require("express");
var fs = require('fs')
const path = require('path')
var https = require('https')
var app = express();
var proxy = require('http-proxy-middleware')
//var bodyParser = require("body-parser");
var WebServer = require('./config/WebServer');
app.use(express.json({"limit":"102400kb"})); // 提高 post 接收的大小(10MB)

app.use("/",express.static(path.resolve(__dirname, '.')));
app.use("/Datas",express.static('\\\\enterprise\\Enterprise_Datas'));
app.get('*',function(req,res){
   const html = fs.readFileSync('./index.html', 'utf-8')
  res.send(html)
});


https.createServer({
   key: fs.readFileSync(`${WebServer.SSLkey}`),
   cert: fs.readFileSync(`${WebServer.SSLCRT}`),
 }, app)
 .listen(3443)
