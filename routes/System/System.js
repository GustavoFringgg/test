var express = require("express");
var app = express();

var ApiRouter_Organization = require('./Api-Organization');

app.use('/Organization', ApiRouter_Organization);

module.exports = app;
