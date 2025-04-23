var express = require("express");
var app = express();

 var ApiRouter_Attendance = require('./Api-Attendance');
 app.use('/Attendance', ApiRouter_Attendance);

module.exports = app;