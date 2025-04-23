var crypto = require('crypto'); // 加解密軟體 (內建模組)
var storage = require('dom-storage');
var moment = require('moment');
var localStorage = new storage('./salt.json');


module.exports = {
    check: function(item) {

    },
    salt: function (item) {
        //console.log("_salt")    
        //javascript: new Date().getDay() =>
        //0:星期日,1:星期一,2:星期二,3:星期三,4:星期四,5:星期五 6代表星期六
        //預定星期一產生新的Salt
        const ReGen_Week = 1; 
    
        //let item = localStorage.getItem('object');
        //let today = "2019-08-22";
        let today = moment().format("YYYY-MM-DD");
        let WeekOfDay = moment(today).day();
        //let ReGen = item ? item.date != today && ReGen_Week === new Date().getDay() : true;
        //let ReGen = item ? item.date != today && ReGen_Week === WeekOfDay : true;
        //let ReGen = item ? item.date != today : true;
        let ReGen = item ? false : true;
        if(ReGen) {
            console.log('call Generator: Salt ReGen');
            item = { date:today, uuid:this.uuid() };
            localStorage.setItem('object', item)
        } 
        //console.log('Return uuid=>',item.uuid)
        return item.uuid
    },    
    secret :function (item) {
        //console.log("_secret")
        //let salt = '*@9#!2#3c1302';
        let salt = this.salt(item);
        //console.log("_secret salt=>",salt)
    
        //let secret = `Shinymark@Pssword_Secret_Key.${salt}`;
        let secret = Buffer.from(`Shinymark@Pssword_Secret_Key.${salt}`).toString("base64")
        //console.log(secret + salt);
        //secret = crypto.createHash('md5').update(secret + salt).digest('hex');
        return crypto.createHash('md5').update(secret + salt).digest('hex');
    },
    
    uuid:function() {
        let d = Date.now();
        if (typeof performance !== 'undefined' && typeof performance.now === 'function'){
          d += performance.now(); //use high-precision timer if available
        }
        return 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
            let r = (d + Math.random() * 16) % 16 | 0;
          d = Math.floor(d / 16);
            return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
        });
    }, 
    // JWT 加上多少時間過期 (UNIX 時間戳) 3600秒=1小時, 86400秒 = 1天, 604800秒 = 7天, 2592000秒 = 30天
    increaseTime: 57600
};

