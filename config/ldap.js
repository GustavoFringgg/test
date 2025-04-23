var ldap =  require("ldapjs");

// 创建客户端
var client = ldap.createClient({
  url: 'ldap://mail.shinymark.com:389'
});


// 绑定查询帐户
client.bind('cn=ldap,dc=shinymark,dc=com', 'll*8170', function (err, res1) {
    var opts = {
        filter: '(uid=mark-wang)', //查询条件过滤器，查找uid= xxx 的用户节点
        scope: 'sub',     //查询范围
        timeLimit: 500    //查询超时
    }
    // 处理查询到文档的事件
    client.search('dc=shinymark,dc=com', opts, function (err, res2) {
        if(err){
            console.log(err)
        }
        //标志位
        var SearchSuccess = false;
        //得到文档
        res2.on('searchEntry', function (entry) {
            SearchSuccess = true;
            // 解析文档
            var user = entry.object;
            console.log(user)
        });
        //查询错误事件
        res2.on('error', function(err) {
            SearchSuccess = false;
            client.unbind();
        });
        //查询结束
        res2.on('end', function(result) {
            client.unbind();
            if( false == SearchSuccess ) {
                console.log("搜尋失敗")
            }
            //console.log(result)
        });
    });
});