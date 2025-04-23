var express = require("express");
var app = express();

var ApiRouter_Knowledge = require('./Api-Knowledge');
var ApiRouter_Common_Data = require('./Api-Common_Data');
var ApiRouter_Goal_Setup = require('./Api-Goal_Setup')
var ApiRouter_City = require('./Api-City')
var ApiRouter_Region = require('./Api-Region')
var ApiRouter_Brand = require('./Api-Brand')
var ApiRouter_Season = require('./Api-Season')
var ApiRouter_Product = require('./Api-Product')

app.use('/Knowledge', ApiRouter_Knowledge);
app.use('/Common', ApiRouter_Common_Data);
app.use('/Goal_Setup', ApiRouter_Goal_Setup);
app.use('/City', ApiRouter_City);
app.use('/Region', ApiRouter_Region);
app.use('/Brand', ApiRouter_Brand);
app.use('/Season', ApiRouter_Season);
app.use('/Product',ApiRouter_Product)
module.exports = app;