var express = require("express");
var app = express();

var ApiRouter_Production = require('./Api-Production');
var ApiRouter_Production_Posted = require('./Api-Production_Posted');

app.use('/', ApiRouter_Production);
app.use('/Posted', ApiRouter_Production_Posted);

module.exports = app;