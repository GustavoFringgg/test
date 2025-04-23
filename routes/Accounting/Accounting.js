var express = require("express");
var app = express();

var ApiRouter_Basic_Info = require('./Api-Basic_Info');
var ApiRouter_Payment = require('./Api-Payment');
var ApiRouter_Receivable = require('./Api-Receivable');
var ApiRouter_Purchase_Bill = require('./Api-Purchase_Bill');

app.use('/Basic_Info', ApiRouter_Basic_Info);
app.use('/Payment', ApiRouter_Payment);
app.use('/Receivable', ApiRouter_Receivable);
app.use('/Purchase_Bill', ApiRouter_Purchase_Bill);

module.exports = app;