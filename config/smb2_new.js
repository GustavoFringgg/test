 var SMB2 = require('@marsaud/smb2')
// var SMB2 = require('smb2')
const sharp = require('sharp');
const format = require('string-format');

var smb2_Client = new SMB2({
  share: '\\\\192.168.252.7\\Enterprise_Datas',
  domain: 'WORKGROUP',
  username: 'shinymark-agent',
  password: 'sa*-8170',
  autoCloseTimeout: 0
});


function imgWriteFile(size, src, dest) {
  return new Promise(function (resolve, reject) {
    sharp(src).resize(size, size, {
      fit: sharp.fit.inside,
      withoutEnlargement: true // 若原圖尺寸沒超過設定的大小，則不壓縮
    }).jpeg({
      quality: 85
    }).toBuffer().then(mBuffer => {
      smb2_Client.writeFile(dest, mBuffer, {
        flags: 'w'
      }, function (err) {
        if (err) {
          reject(err);
        } else {
          console.log(format("{0} 儲存成功", dest));
          resolve(format("{0} 儲存成功", dest));
        }
      });
    });
  })
};

function MKDir(path) {
  return new Promise((resolve, reject) => {
    smb2_Client.exists(path, function (err, exists) {
      if (err) reject(err);
      if (!exists) {
        smb2_Client.mkdir(path, (err) => {
          if (err) {
            console.log(`${path}:無法建立`);
            reject(err);
          } else {
            console.log(`${path}:已建立`);
            resolve('success');
          }
        });
      } else {
        console.log(`${path}:已存在`);
        resolve(`${path}:已存在`);
      }
    });
  });
};

function WritePhotoFile(dest, data) {
  return new Promise(function(resolve, reject) {
    smb2_Client.writeFile(dest, data, {flags: 'w'}, function (err, callback) {
      if (err) {
        console.log('WRITE ERROR!')
        reject(err);
      } else {
        // console.log(callback)
        resolve(callback);
      }
    });
  })
}

function ReadPhotoFile(src) {
  return new Promise(function (resolve, reject) {
    smb2_Client.readFile(src, function (err, data) {
      if (err) {
        reject(err);
      } else {
        resolve(data);
      }
    });
  })
};

 async function CopyFile(src, dest) {
  try {
    let data = await ReadPhotoFile(src)
    await WritePhotoFile(dest, data)
  } catch (error) {
    console.error(error);
  }
};

async function _CopyFile(src, dest) {
  try {

  smb2_Client.exists(src, function (err, exists) {
    if (err) 
    { 
      console.log(exists)
      console.log(err)
      //throw err;
    }
    console.log(exists ? "it's there" : "it's not there!");
    if(exists) {
      smb2_Client.readFile(src, function (err, data) {
        if (err) throw err;
          smb2_Client.writeFile(dest, data, {flags: 'w'}, function (err) {
            if (err) throw err;
          })
      })
    }
  });
} catch (error) {
  console.error(error);
}

};

function DelFile (path) {
  return new Promise( function(resolve, reject) {
    smb2_Client.exists(path, function (err, exists) {
      if (err) reject(err);
      if (exists) {
        smb2_Client.unlink(path, (err) => {
          if (err) {
            console.log(`${path}:無法刪除`);
            reject(err);
          } else {
            console.log(`${path}:已刪除`);
            resolve('success');
          }
        });
      } else {
        console.log(`${path}:檔案不存在`);
        resolve(`${path}:檔案不存在`);
      }
    });
  });
}

 async function DelFile_ (path) {
     await smb2_Client.exists(path, async function (err, exists) {
      if (err) {console.log(err);  throw(err)};
      if (exists) {
        await smb2_Client.unlink(path, (err) => {
          if (err) {
            console.log(`${path}:無法刪除`);
            throw(err);
          } else {
            console.log(`${path}:已刪除`);
          }
        });
      } else {
        console.log(`${path}:檔案不存在`);
        return false;
      }
    });
}







module.exports = {
 smb2 : function() { return smb2_Client},
 DelFile_: DelFile_,
 _CopyFile: _CopyFile,
 DelFile: DelFile,
 CopyFile: CopyFile,
 ReadPhotoFile:ReadPhotoFile,
 WritePhotoFile:WritePhotoFile,
 MKDir:MKDir,
 imgWriteFile:imgWriteFile,

};