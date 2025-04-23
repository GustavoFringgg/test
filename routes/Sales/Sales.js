var express = require("express");
var app = express();

var ApiRouter_Customer = require('./Api-Customer');
var ApiRouter_OPI = require('./Api-OPI');
var ApiRouter_Order_Approve = require('./Api-Order_Approve');
var ApiRouter_Orders = require('./Api-Orders');
var ApiRouter_PPO = require('./Api-PPO');
var ApiRouter_Quotation = require('./Api-Quotation');


app.use('/Customer', ApiRouter_Customer);
app.use('/OPI', ApiRouter_OPI);
app.use('/Order_Approve', ApiRouter_Order_Approve);
app.use('/Orders', ApiRouter_Orders);
app.use('/PPO', ApiRouter_PPO);
app.use('/Quotation', ApiRouter_Quotation);

module.exports = app;