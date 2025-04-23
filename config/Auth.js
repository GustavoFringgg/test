var sql = require("mssql");
var db = require('./DB_Setup');
var jwt = require('jsonwebtoken');  // JWT 簽名和驗證
var conf = require('./Generator');
const format = require('string-format');
var moment = require('moment');
var ldap =  require("ldapjs");
// 引入crypto模块
const crypto = require('crypto');


 
module.exports = {
    // 使用者登入認證
    login: function (req, callback) {
        var strSql = format(`SELECT * FROM Password WHERE UserID = '{UserID}' AND password = '{password}'`, req.body);
        //console.log(strSql)
         var connection1 = new sql.ConnectionPool(db.SiteDB, function (err) {
               var request = new sql.Request(connection1);
               request.query(strSql, callback)
         });
    },
    login_ldap: function (req, callback) {
      var passwd = Buffer.from(req.body.password, 'base64').toString();
      var Domain = req.body.Domain;
      var UserInfo = {UserID: req.body.UserID, isLdapAuth: false };

      const config = {
        ldapURL: 'ldap://192.168.252.31:389',
        adminDN: `cn=ldap,dc=${Domain},dc=com`,
        bashDN: `dc=${Domain},dc=com`,
        adminPwd: 'll*8170',
        userDN: ''
      };

      var opts = {
          filter: `(uid=${UserInfo.UserID})`, //查询条件过滤器，查找uid= xxx 的用户节点
          scope: 'sub',     //查询范围
          timeLimit: 500    //查询超时
      }
      
      // 创建客户端
      const client = ldap.createClient({
        url: config.ldapURL,
        //reconnect: true,
      });
      
      client.on("error", (err) => {
        console.log("client error", err);
        //client.unbind();
        client.destroy();
        return callback(UserInfo)
      }); 

      // 绑定查询帐户
      client.bind(config.adminDN, config.adminPwd, function (err, res1) {

        if(err){
          console.log(`LDAP Bind=>`,err)
          return callback(UserInfo)
        }
        
        // 查询员工信息
        client.search(config.bashDN, opts, function (err, res) {
          
          if(err){
            console.log(`LDAP Search=>`,err)
            return callback(UserInfo)
          }

          var SearchSuccess = false;
          //查到员工信息
          res.on("searchEntry", function (entry) {
            SearchSuccess = true;
            // 解析结果
            // 获取用户DN
            config.userDN = entry.object.dn;
          });

          // 验证密码错误
          res.on("error", function (err) {
            console.log(`LDAP Search err=>`,err)
            SearchSuccess = false;
            client.unbind();
            return callback(UserInfo)
          });

          // 验证密码结束
          res.on("end", err => {
            if(!SearchSuccess) {
              //console.log(err);
              // 切勿在这里解除客户端绑定
              //console.log('資料獲取失敗') 
              console.log(`UserID:${UserInfo.UserID} LDAP中無此帳號!`)
              return callback(UserInfo);
            } else {
              // 校验登录员工密码
              client.bind(config.userDN, passwd, (err, res) => {
                // 没报错即校验成功
                if (err) {
                  //console.log("验证失败！" + err);
                  console.log(`LDAP Check [${UserInfo.UserID}] password verification: User's password invalid! Access denied!`)
                } else {
                  //console.log("验证通过！" + res);
                  UserInfo.isLdapAuth = true;
                  console.log(`LDAP Check [${UserInfo.UserID}] password verification: Pass!`)
                }
                // 查询完成，解除绑定
                client.unbind();
                return callback(UserInfo);
              });
            }
          })
        });
      });
    },
    login_ldap_Old: function (req, callback) {
        
        var passwd = Buffer.from(req.body.password, 'base64').toString();
        var Domain = req.body.Domain;
        var UserInfo = {UserID: req.body.UserID, isLdapAuth: false };

        var opts = {
            filter: `(uid=${UserInfo.UserID})`, //查询条件过滤器，查找uid= xxx 的用户节点
            scope: 'sub',     //查询范围
            timeLimit: 500    //查询超时
        }
        //var client = ldap.createClient({url: 'ldap://mail.shinymark.com:389'});
        var client = ldap.createClient({url: 'ldap://192.168.252.31:389'});
        // 绑定查询帐户
        // client.bind(`cn=ldap,dc=shinymark,dc=com`, 'll*8170', function (err, res1) {
        client.bind(`cn=ldap,dc=${Domain},dc=com`, 'll*8170', function (err, res1) {
            var LDAP_userinfo = {}

            if(err){
                console.log(`LDAP Bind=>`,err)
                return callback(UserInfo)
            }

            // 处理查询到文档的事件
            //client.search('dc=shinymark,dc=com', opts, callback );

            // 处理查询到文档的事件
            client.search(`dc=${Domain},dc=com`, opts, function (err, res2) {
//            client.search(`dc=shinymark,dc=com`, opts, function (err, res2) {
                if(err){
                    console.log(`LDAP Search=>`,err)
                    return callback(UserInfo)
                }

                //标志位
                var SearchSuccess = false;
                //得到文档
                res2.on('searchEntry', function (entry) {
                    SearchSuccess = true;
                    // 解析文档
                    LDAP_userinfo = entry.object;
                });
                //查询错误事件
                res2.on('error', function(err) {                    
                    console.log(`LDAP Search err=>`,err)
                    SearchSuccess = false;
                    client.unbind();
                    return callback(UserInfo)

                });
                //查询结束
                res2.on('end', function(result) {
                    //console.log('LDAP Search End =>',result)
                    client.unbind();
                    if(SearchSuccess ) {

                        // LDAP服务器中存储的密码
                        var realPasswd = LDAP_userinfo.userPassword;
                        // 返回查询失败的通知
                        //console.log(realPasswd)
                        // 获取加密算法
                        const reg = /^\{(\w+)\}/;
                        var temp = reg.exec(realPasswd);
                        if(null != temp) {
                            /* 加密密码 */
                            // 加密算法
                            var hash_type = temp[1];
                            var raw = realPasswd.replace(temp[0], "");
                            //console.log("  LDAP:",raw)

                            // 将加密后的字符串base64解码
                            // 注意，不要转为字符串，因为salt长度为4个字节，但转为字符串后长度不一定为4
                            var decoded_64 = new Buffer.from(raw, 'base64')
                            //console.log("decode",decoded_64)
                            var input_data = passwd;
                            var C_input = ""

                            // 根据加密算法选择
                            var cipher = "sha1";
                            switch(hash_type) {
                                case "SHA":
                                case "SSHA":
                                        cipher = "sha1";
                                    break;
                                case "SHA256":
                                case "SSHA256":
                                    cipher = "sha256";
                                    break;
                                case "SHA384":
                                case "SSHA384":
                                    cipher = "sha384";
                                    break;
                                case "SHA512":
                                case "SSHA512":
                                    cipher = "sha512";
                                    break;
                                default:
                                    cipher = "sha1";
                                    break;
                            }
                            if("NORMAOL_TYPE" != hash_type) {
                                // 使用buffer的slice方法
                                var C = decoded_64.slice(0, 20);
                                //console.log(C)
                                // 20位之后的为随机明文 salt(盐)，长度为4位
                                var salt = decoded_64.slice(20, decoded_64.length);
                                //console.log(salt)
                                input_data = Buffer.concat([new Buffer.from(passwd), salt]);
                                //console.log(input_data)

                                // 加盐干扰：计算 C_input = SHA1(input+salt)
                                C_input = crypto.createHash(cipher)
                                                .update(input_data)
                                                .digest('base64')
                                                .toString('utf8');
                            }
                            else {
                                //input_data = new Buffer(passwd); 
                                input_data = new Buffer.from(passwd);
                                // 普通哈希：计算 C_input = SHA1(input)
                                C_input = crypto.createHash(cipher)
                                                .update(input_data)
                                                .digest('base64')
                                                .toString('utf8');
                            }
                            //console.log("key-in:",Buffer.concat([new Buffer.from(C_input,"base64"), salt]).toString("base64"))
                            UserInfo.isLdapAuth = Buffer.concat([new Buffer.from(C_input,"base64"), salt]).toString("base64") === raw
                            console.log(`LDAP Check [${UserInfo.UserID}] password verification:${UserInfo.isLdapAuth ? " Pass!" : " User's password invalid! Access denied!" }`)
                            return callback(UserInfo)

                        }
                        else {
                            // 明文密码
                            console.log("明文密码")
                            return callback(UserInfo)

                        }
                    } else {
                        console.log(`UserID:${UserInfo.UserID} LDAP中無此帳號!`)
                        return callback(UserInfo)
                    
                    }
                });
            });

        });       
  
    },
    // 產生 OAuth 2.0 和 JWT 的 JSON 格式令牌訊息
    createToken: function (req, callback) {
        //console.log(req.results)
        let payload = {
            iss: req.results.UserID,
            sub: 'Shinymark Web ERP API',
            //role: req.results[0].Rank   // 自訂聲明。用來讓伺服器確認使用者的角色權限 (決定使用者能使用 Web API 的權限)
        };
        //console.log("createToken=>",conf.secret())

        // 產生 JWT
        let token = jwt.sign(payload, conf.secret(req.ObjItem), {
            algorithm: 'HS256',
            expiresIn: conf.increaseTime + 's'  // JWT 的到期時間 (當前 UNIX 時間戳 + 設定的時間)。必須加上時間單位，否則預設為 ms (毫秒)
        })
        
        // JSON 格式符合 OAuth 2.0 標準，除自訂 info 屬性是為了讓前端取得額外資訊 (例如使用者名稱)，
        return callback({
            access_token: token,
            token_type: 'bearer',
            expires_in: Math.floor(Date.now() / 1000) + conf.increaseTime,    // UNIX 時間戳 + conf.increaseTime
            //scope: req.results[0].Rank,
            UserID: req.results.UserID
            //, User_Roles: req.User_Roles
        });
    },
    // 驗證 JWT
    tokenVerify: function (req, res, next) {
        //console.log("tokenVerify")
       // console.log(conf.secret)

        // 沒有 JWT
        if (!req.headers.authorization && req.method !="OPTIONS") {
            //console.log('req.headers.authorization', req.headers.authorization)
            res.customStatus = 401;
            res.customError = { error: 'invalid_client', error_description: '沒有 token！' };
        }
     
        if (req.headers.authorization && req.headers.authorization.split(' ')[0] == 'Bearer') {
            //console.log('req.headers.authorization', req.headers.authorization)

            //console.log("tokenVerify=>",conf.secret())
            //console.log(Buffer.from(conf.secret,'base64').toString('ascii'))
            //console.log(Buffer.from(req.headers.authorization.split(' ')[1],'base64').toString('ascii'))
            jwt.verify(req.headers.authorization.split(' ')[1], conf.secret(req.ObjItem), function (err, decoded) {
                if (err) {
                    res.customStatus = 400;
                    //console.log('jwt.verify')
                    switch (err.name) {
                        // JWT 過期
                        case 'TokenExpiredError':
                            res.customError = { error: 'invalid_grant', error_description: 'token 過期！' };
                            break;
                        // JWT 無效
                        case 'JsonWebTokenError':
                            res.customError = { error: 'invalid_grant', error_description: 'token 無效！' };
                            break;
                    }
                } else {
                    req.UserID = decoded.iss.trim();              
                    //console.log(decoded)      
                }
            });
        }


        next();
    },
    // Web API 存取控制
    accessControl: function (req, res, next) {
        console.log(req.user);
 
        // 如不是 admin，則無權限
        switch (req.user.role) {
            case null:
            case 'user':
            case 'guest':
                res.customStatus = 400;
                res.customError = { error: 'unauthorized_client', error_description: '無權限！' };
                break;
        }
 
        next();
    }
};