var os= require("os");
var hostname = os.hostname().toLowerCase();
var DBserver = hostname == 'ph' ? "192.168.252.11\\SQLEXPRESS" 
        : hostname == 'bm' ? "192.168.252.12\\SQLEXPRESS"
        : hostname == 'hw' ? "192.168.252.13\\SQLEXPRESS"
        : hostname == 'td' ? "192.168.252.15\\SQLEXPRESS"
        : hostname == 'hq' ? "192.168.252.19\\SQLEXPRESS"
        : "192.168.252.8\\SQLEXPRESS";
// var host = ['ph','bm','hw','td','hq'];       
// const DataBase = (host.indexOf(hostname) > -1 ? "Aaprodt" : "ERP") ;       

var EnterpriseDB = {
   user: "erp",
   password: "ep*4582",
   server: "192.168.252.7\\Enterprise",
   database: "ENTERPRISE",
   connectionTimeout: 10000,
   requestTimeout: 3000000,
   retryTimes: 3,
   options: {
       encrypt: false 
   },
   pool: {
       max: 1024,
       min: 0,
       //idleTimeoutMillis: 3000
       evictionRunIntervalMillis: 5000,
       idleTimeoutMillis: 120000       
   }
};

var SiteDB = 
  {
   user: "aaprodt",
   password: "ap*4582",
   server: DBserver,
   database: "erp",
   connectionTimeout: 10000,
   requestTimeout: 3000000,
   retryTimes: 3,
   options: {
       encrypt: false
   },
   pool: {
       max: 1024,
       min: 0,
       //idleTimeoutMillis: 3000
       evictionRunIntervalMillis: 5000,
       idleTimeoutMillis: 120000      
   }
};

const db = 
 {
  Enterprise: EnterpriseDB,
  SiteDB: SiteDB
 };
    

module.exports = db;