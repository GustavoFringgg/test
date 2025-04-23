var moment = require('moment');

module.exports = {
  sql : async function(connection, strSQL) {    
    if(!(connection && connection.connected)) {
      await connection.connect();
    }

    return new Promise( (resolve,reject) =>{
       
        var request = connection.request()

        request.query(strSQL, async function (err, result) {
          if (err){
           console.log(`${moment().format("YYYY-MM-DD HH:mm:ss.SS")} : `,err);
           reject(err);
          }
          //await connection1.close();
          resolve(result);
       });

    })
  }
};