var express = require("express");
var app = express();

var ApiRouter_Product = require('./API');
var ApiRouter_Model = require('./Api-Model');
var ApiRouter_Product_Component_Photo = require('./Api-Product_Component_Photo');
var ApiRouter_Sample_Sheet = require('./Api-Sample_Sheet');
var ApiRouter_Component_Material_Selector = require('./Api-Component_Material_Selector');
var ApiRouter_Product_Structure = require('./Api-Product_Structure');
var ApiRouter_Style_Size_Match = require('./Api-Style_Size_Match');
var ApiRouter_Samples = require('./Api-Samples');
var ApiRouter_Style = require('./Api-Style');
var ApiRouter_Payment_Term_Selector = require('./Api-Payment-Term-Selector');


app.use('/Product', ApiRouter_Product);
app.use('/Model', ApiRouter_Model);
app.use('/Product_Component_Photo', ApiRouter_Product_Component_Photo);
app.use('/Sample_Sheet', ApiRouter_Sample_Sheet);
app.use('/Component_Material_Selector', ApiRouter_Component_Material_Selector);
app.use('/Product_Structure', ApiRouter_Product_Structure);
app.use('/Style_Size_Match', ApiRouter_Style_Size_Match);
app.use('/Samples', ApiRouter_Samples);
app.use('/Style', ApiRouter_Style);
app.use('/Payment_Term', ApiRouter_Payment_Term_Selector);


module.exports = app;