var os= require("os");
var hostname = os.hostname().toLowerCase();

var host = ['ph','bm','hw','td','hq']

const HOSTNAME = (host.indexOf(hostname) > -1 ? hostname : "erp") + ".shinymark.com";

const WebServer = {
    url: `https://${HOSTNAME}:3443`,
    host: `https://${HOSTNAME}`,
}    

module.exports = WebServer;