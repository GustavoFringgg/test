var SMB2 = require('smb2')
// var SMB2 = require('smb2')

var smb2 = new SMB2({
    share: '\\\\192.168.252.7\\Enterprise_Datas',
    domain: 'WORKGROUP',
    username: 'shinymark-agent',
    password: 'sa*-8170',
    autoCloseTimeout: 0
});


module.exports = smb2;