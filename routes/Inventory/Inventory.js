var express = require("express");
var app = express();

var ApiRouter_MPI = require('./Api-MPI');
var ApiRouter_Product_Stock = require('./Api-Product_Stock');
var ApiRouter_Material_Stock = require('./Api-Material_Stock');
var ApiRouter_Asset = require('./Api-Asset');

app.use('/MPI', ApiRouter_MPI);
app.use('/Product_Stock', ApiRouter_Product_Stock);
app.use('/Material_Stock', ApiRouter_Material_Stock);
app.use('/Asset', ApiRouter_Asset);

module.exports = app;