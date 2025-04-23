var express = require('express');
var router = express.Router();
var sql = require("mssql");
const WebServer = require('./WebServer');
let config = require('./DB_Setup');
let db = require('./DB_Connect');
let moment = require('moment');
const format = require('string-format');
let Permission = require('./Program_Cooperators');


 /* Mark-Wang API Begin */
//Get Program Group
function Program_Group(req, res, next) {
   console.log("Call Program_Group Api:",req.UserID);
   //console.log(req.body)

   let DataSet = { IsGroups: false, Groups: [], UserID: req.UserID};
   req.body.UserID = req.UserID;
   req.body.Groups = [];
   req.body.Program_Name = [];
   req.body.Table_Name = [];
   req.body.TableIDColumn = [];
   req.body.TableUserColumn = [];
   req.body.TableUpdaterColumn = [];
   req.body.TableUpdateColumn = [];
   req.body.Program_Tag = [];
   

   //console.log("Program_Name:",req.body.Program_Name);
  // console.log("items.Groups:",Groups);   
   let strSQL = format(`
   Select r.LoweredRoleName as Groups
   From Program p with(NoLock,NoWait)
   Inner Join ProgramsInRoles g with(NoLock,NoWait) on p.ProgramID = g.ProgramID
   Inner Join aspnet_Roles r with(NoLock,NoWait) on g.RoleId = r.RoleId
   Where p.ProgramID = {ProgramID}

   Select p.Program_Name
   , p.Table_Name
   , p.TableIDColumn
   , p.TableUserColumn
   , p.TableUpdaterColumn
   , p.TableUpdateColumn
   , isnull(p.Program_Tag,'') as Program_Tag
   From Program p with(NoLock,NoWait)
   Where p.ProgramID = {ProgramID}
   `, req.body); 
   //console.log(strSQL);
   
   db.sql(req.Enterprise, strSQL)
   .then((result)=>{
         req.body.Groups = result.recordsets[0].map((item)=>(item.Groups));

         result.recordsets[1].forEach((item)=>{
            req.body.Program_Name = item.Program_Name;
            req.body.Table_Name = item.Table_Name;
            req.body.TableIDColumn = item.TableIDColumn;
            req.body.TableUserColumn = item.TableUserColumn;
            req.body.TableUpdaterColumn = item.TableUpdaterColumn;
            req.body.TableUpdateColumn = item.TableUpdateColumn;
            req.body.Program_Tag = item.Program_Tag;
         })

         next();
   }).catch((err)=>{
     console.log(err);
     //console.log(DataSet)
     next(); 
   });     
}

 //Get User Privilege
router.post('/Get_UserPrivilege', Program_Group, function (req, res, next) {
   console.log("Call permission Api Get_UserPrivilege:",req.UserID);
   //console.log("Permission.SharePG:",req.body);

   //let SharePG = Permission.SharePG[`${req.body.Program_Name}`];
   //let Groups = Permission.Groups[`${req.body.Program_Name}`];

   //console.log("Get_UserPrivilege SharePG:",Permission.SharePG[`${req.body.Program_Name}`]);
   //console.log("Get_UserPrivilege Groups:",Permission.Groups[`${req.body.Program_Name}`]);
   //console.log("Get_UserPrivilege DataBase.Groups:",req.body.Groups);

   //req.body.Program_Name = req.body.Program_Name;
   // req.body.TableUserColumn = req.body.TableUserColumn;
   // req.body.TableUpdaterColumn = req.body.TableUpdaterColumn;
   // req.body.TableUpdateColumn = req.body.TableUpdateColumn;
   // req.body.Table_Name = req.body.Table_Name;
   // req.body.TableIDColumn = req.body.TableIDColumn;
   //req.body.Groups = Groups;
   //req.body.UserID = req.UserID;
   //console.log("Permission.SharePG:",SharePG);
   //console.log("Permission.Groups:",Groups);
   
   let items = { IsUserEmpty: false, IsOwner: false, IsSuperior: false, IsDeputy: false, IsCrew: false, IsCooperator: false, IsGroups: false, Groups:[], SharePG_Program: req.body.Program_Name, DataOwner:'', Owner_Photo_Large:'', Owner_Photo:'', DataUpdater:'', DataUpdate:'', UserID: req.UserID};
   let strSQL = format(`
Declare @IsUserEmpty int = 0, @IsOwner int = 0, @IsSuperior int = 0, @IsDeputy int = 0, @IsCrew int = 0, @IsCooperator int = 0, @Superior nvarchar(255)='', @Deputy nvarchar(255)='', @DataOwner nvarchar(255)='', @DataUpdater nvarchar(255)='', @DataUpdate nvarchar(20)='', @IsGroups int = 0, @Groups nvarchar(255)=''
${ req.body.Table_Name ? "SELECT @DataOwner = isnull({TableUserColumn},''), @DataUpdater = isnull({TableUpdaterColumn},''), @DataUpdate = case when {TableUpdateColumn} is null or {TableUpdateColumn} = '' then '' else Convert(varchar(20), {TableUpdateColumn}, 120) end  FROM {Table_Name} WHERE {TableIDColumn} = '{IDValue}'":'' }
Set @IsUserEmpty = case when len(@DataOwner) = 0 then 1 else 0 end
Set @IsOwner = case when @DataOwner = '{UserID}' then 1 else 0 end
Set @Superior = isnull((SELECT [LoweredUserName] FROM UsersOnSuperiors Where UsersOnSuperiors.OnSuperior = @DataOwner),'')
Set @IsSuperior = case when @Superior = '{UserID}' then 1 else 0 end
set @Deputy = isnull((SELECT [LoweredUserName] FROM UsersOnDeputies Where UsersOnDeputies.OnDeputy = @DataOwner),'')
Set @IsDeputy = case when @Deputy = '{UserID}' then 1 else 0 end
SELECT * FROM UsersOnCrews Where UsersOnCrews.OnCrew = @DataOwner AND (UsersOnCrews.LoweredUserName = '{UserID}')
Set @IsCrew = case when @@ROWCOUNT > 0 then 1 else 0 end
SELECT * From Program_Cooperator Where Program_Cooperator.UserID = @DataOwner And (Program_Cooperator.Program_Name = '{Program_Name}') AND (Program_Cooperator.Cooperator = '{UserID}')
Set @IsCooperator = case when @@ROWCOUNT > 0 then 1 else 0 end
Select @DataOwner as DataOwner
, @Superior as Superior
, @Deputy as Deputy
, @DataUpdater as DataUpdater
, @DataUpdate as DataUpdate
, cast(@IsUserEmpty as bit) as IsUserEmpty
, cast(@IsOwner as bit) as IsOwner 
, cast(@IsSuperior as bit) as IsSuperior
, cast(@IsDeputy as bit) as IsDeputy
, cast(@IsCrew as bit) as IsCrew
, cast(@IsCooperator as bit) as IsCooperator
--, cast(@IsGroups as bit) as IsGroups
--, @Groups as Groups
, case when len(@DataOwner) > 0 then '${WebServer.host}/Datas/Images/Users/Photos/Large/' + @DataOwner + '.jpg?tmp=' + convert(varchar(20), getDate(),120) else '' end as Owner_Photo_Large
, case when len(@DataOwner) > 0 then '${WebServer.host}/Datas/Images/Users/Photos/Thumb/' + @DataOwner + '.jpg?tmp=' + convert(varchar(20), getDate(),120) else '' end as Owner_Photo
;

SELECT [LoweredRoleName] as Groups 
FROM [dbo].[UserGroups] ar with(NoLock,NoWait) 
Inner Join [dbo].[UsersInUserGroups] aur with(NoLock,NoWait) on ar.RoleId = aur.RoleId 
Inner Join [dbo].[aspnet_Users] au with(NoLock,NoWait) on au.UserId = aur.UserId Where au.UserName = '{UserID}' 
Group by [LoweredRoleName];
   `, req.body); 
  //console.log(strSQL);

  db.sql(req.SiteDB, strSQL)
  .then((result)=>{
      let DataSet = result.recordsets[2][0];
      DataSet.UserID = req.UserID;
      DataSet.SharePG_Program = req.body.Program_Name;      
      DataSet.Groups = result.recordsets[3].map((item)=>(item.Groups));
      DataSet.IsGroups = req.body.Groups.includes('public')  ? true : DataSet.Groups.some((element) => (req.body.Groups.some((item) => (item === element))));
      //console.log(DataSet)
      //console.log(items)
      res.send(DataSet);    
  }).catch((err)=>{
    console.log(err);
    res.send(items);
  });  
}); 

router.post('/IsGroups', Program_Group, function (req, res, next) {
   console.log("Call IsGroups Api IsGroups:",req.UserID);
   //console.log(req.body)
   //let Groups = Permission.Groups[`${req.body.Program_Name}`];
      
   //console.log("IsGroups: Program_Name:",Permission.Groups[`${req.body.Program_Name}`]);
   //console.log("IsGroups: Groups:",req.body.Groups);

   let DataSet = { IsGroups: false, Groups: req.body.Groups, UserID: req.UserID};
   let strSQL = format(`
--Declare @tmpTable Table (Groups nvarchar(255))
Declare @Superior nvarchar(255), @Superior_Email nvarchar(255)
Set @Superior = isnull((SELECT [LoweredUserName] FROM UsersOnSuperiors u with(NoLock, NoWait) Where u.OnSuperior = '{UserID}'),'')
Set @Superior_Email = isnull((SELECT [Email] FROM Employee e with(NoLock, NoWait) Where e.LoweredUserName = @Superior),'')
--Insert @tmpTable

SELECT [LoweredRoleName] as Groups 
, @Superior as Superior
, @Superior_Email as Superior_Email
FROM [dbo].[UserGroups] ar with(NoLock,NoWait) 
Inner Join [dbo].[UsersInUserGroups] aur with(NoLock,NoWait) on ar.RoleId = aur.RoleId 
Inner Join [dbo].[aspnet_Users] au with(NoLock,NoWait) on au.UserId = aur.UserId Where au.UserName = '{UserID}' 
Group by [LoweredRoleName];

--Select cast((case when count(*) > 0 then 1 else 0 end) as bit) as IsGroups from @tmpTable tmp Where CHARINDEX(tmp.Groups , '{Groups}', 0) > 0;

--Select * from @tmpTable tmp;

   `, req.body); 
   //console.log(strSQL);
   
   db.sql(req.SiteDB, strSQL)
   .then((result)=>{         
         //DataSet.IsGroups = Groups.includes('public') ? true : result.recordsets[0][0].IsGroups;
         //DataSet.Groups = result.recordsets[1];
         DataSet.Program_Tag = req.body.Program_Tag;
         DataSet.SharePG_Program = req.body.Program_Name;
         DataSet.Groups = result.recordsets[0].map((item)=>(item.Groups));
         DataSet.IsGroups = req.body.Groups.includes('public')  ? true : DataSet.Groups.some((element) => (req.body.Groups.some((item) => (item === element))));
         DataSet.Superior = result.recordsets[0][0].Superior;
         DataSet.Superior_Email = result.recordsets[0][0].Superior_Email;
         //console.log(result.recordsets[0]);
         //console.log(Groups);
         //console.log(DataSet)
         res.send(DataSet);   
   }).catch((err)=>{
     console.log(err);
     res.send(DataSet);
   });     

});
 /* Mark-Wang API End */


 /* Darren-Chang API Begin */

 /* Darren-Chang API End */

module.exports = router;