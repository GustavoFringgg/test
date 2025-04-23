var express = require("express");
var app = express();

var ApiRouter_Product_Shipment = require('./Api-Product_Shipment');
var ApiRouter_Packing_Order = require('./Api-Packing_Order');

app.use('/Product_Shipment', ApiRouter_Product_Shipment);
app.use('/PKO', ApiRouter_Packing_Order);

module.exports = app;