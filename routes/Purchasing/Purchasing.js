var express = require("express");
var app = express();

var ApiRouter_Supplier = require('./Api-Supplier');
var ApiRouter_Purchase_Project = require('./Api-Purchase_Project');
var ApiRouter_Material = require('./Api-Material');
var ApiRouter_Funds_Request = require('./Api-Funds_Request');

app.use('/Purchase_Project', ApiRouter_Purchase_Project);
app.use('/Supplier', ApiRouter_Supplier);
app.use('/Material', ApiRouter_Material);
app.use('/Funds_Request', ApiRouter_Funds_Request);

module.exports = app;