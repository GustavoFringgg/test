var express = require('express');
var router = express.Router();
var moment = require('moment');
const format = require('string-format');
var db = require('../../config/DB_Connect');
//var smb2 = require('../../config/smb2');

/* Mark-Wang API Begin */

 //取得 Organization 資料
 router.post('/Organization', function (req, res, next) {
   console.log("Call Organization Api:", req.body);

   var strSQL = format(`
   SELECT 'ALL' AS Organization, '' AS OrganizationID 
   UNION 
   SELECT OrganizationID AS Organization, OrganizationID 
   FROM Department  
   GROUP BY OrganizationID 
   ORDER BY OrganizationID
   `, req.body);
 
   //console.log(strSQL)
   db.sql(req.Enterprise, strSQL)
   .then((result)=>{
     //console.log(result)
     res.send(result.recordset);
   }).catch((err)=>{
     console.log(err);
     res.status(500).send(err);
   })
 });

 //取得Department資料
 router.post('/Department', function (req, res, next) {
   console.log("Call Department Api Department:", req.body);

   req.body.OrganizationID = req.body.OrganizationID ? `'${req.body.OrganizationID}'` : `''`;

   var strSQL = format(`
   SELECT 'ALL' AS Department, 0 AS DepartmentID , '0' as sortID
   UNION 
   SELECT DISTINCT Department, DepartmentID, sortID
   FROM Department d with(Nolock,NoWait)
   WHERE ({OrganizationID} = '' or d.OrganizationID LIKE {OrganizationID} + '%') 
   AND d.History is null
   ORDER BY sortID
   `, req.body);
 
   //console.log(strSQL)
   db.sql(req.Enterprise, strSQL)
   .then((result)=>{
     //console.log(result)
     res.send(result.recordset);
   }).catch((err)=>{
     console.log(err);
     res.status(500).send(err);
   })
 });

 //取得Employee資料
 router.post('/Employee', function (req, res, next) {
  console.log("Call Employee Api:", req.body);

  req.body.OrganizationID = req.body.OrganizationID ? `'${req.body.OrganizationID}'` : `''`;

  var strSQL = format(`
  SELECT Chinese_Name, EmployeeID
  FROM Employee e with(Nolock,NoWait)
  Inner Join Department d with(Nolock,NoWait) on e.DepartmentID = d.DepartmentID
  WHERE ({OrganizationID} = '' or d.OrganizationID LIKE {OrganizationID} + '%') 
  AND e.Leave_Job_Date is null
  ORDER BY Chinese_Name
  `, req.body);

  //console.log(strSQL)
  db.sql(req.Enterprise, strSQL)
  .then((result)=>{
    //console.log(result)
    res.send(result.recordset);
  }).catch((err)=>{
    console.log(err);
    res.status(500).send(err);
  })
});

//Check_Attendance
router.post('/Check_Attendance', function (req, res, next) {
   console.log("Call Check_Attendance Api:", req.body);
 
   req.body.EmployeeID = req.body.EmployeeID ? `'${req.body.EmployeeID}'` : `''`;
   req.body.Attendance_Date = req.body.Attendance_Date ? `'${req.body.Attendance_Date}'` : `''`;
   
 
   var strSQL = format(`
   SELECT count(*) as Flag
   FROM Attendance a with(Nolock,NoWait)
   WHERE a.EmployeeID = {EmployeeID}
   And a.Attendance_Date = {Attendance_Date}      
   `, req.body);
 
   //console.log(strSQL)
   db.sql(req.Enterprise, strSQL)
   .then((result)=>{
     //console.log(result)
     res.send({Flag:result.recordsets[0][0].Flag <= 0});
   }).catch((err)=>{
     console.log(err);
     res.status(500).send(err);
   })
 });
 
//Get Attendance_List
router.post('/Attendance_List',  function (req, res, next) {
   console.log("Call Attendance_List Api:",moment().format('YYYY/MM/DD HH:mm:ss'));

   req.body.Attendance_Date = req.body.Attendance_Date ? `${req.body.Attendance_Date.trim().substring(0,10)}` : ``;
   req.body.EmployeeID = req.body.EmployeeID ? `${req.body.EmployeeID.trim().substring(0,8)}` : ``;
   req.body.Chinese_Name = req.body.Chinese_Name ? `${req.body.Chinese_Name.trim().substring(0,10).replace(/'/g, '')}` : '';
   req.body.Only_Abnormal = req.body.Only_Abnormal != null ? req.body.Only_Abnormal : '0';
   
   var strSQL = format(`
   Declare @Attendance_Date varchar(10) = '{Attendance_Date}'
   , @DepartmentID int = {DepartmentID}
   , @EmployeeID varchar(10) = '{EmployeeID}'
   , @Chinese_Name Nvarchar(20) = N'{Chinese_Name}'
   , @OrganizationID varchar(20) = '{OrganizationID}'
   , @Only_Abnormal int = {Only_Abnormal}
   
   SELECT a.RecNo
   , a.Real_WorkTime_Hour
   , a.Holiday_Type
   , case a.Holiday_Type when 0 then '平'
   when 1 then '休'
   when 2 then '例'
   End as Holiday_Type_Name
   , case a.Holiday_Type when 0 then 'Black'
   when 1 then 'Green'
   when 2 then 'Red'
   End as Holiday_Type_Color
  , a.Department
   , d.DepartmentID
   , ac.Attendance_Class_Name
   , a.EmployeeID
   , e.LoweredUserName
   , e.Chinese_Name
   , CONVERT (varchar(10), a.Attendance_Date, 111) AS Attendance_Date
   , '(' + case DATEPART(weekday, a.Attendance_Date) when 1 then '日' 
   when 2 then '一' 
   when 3 then '二' 
   when 4 then '三' 
   when 5 then '四' 
   when 6 then '五' 
   when 7 then '六' 
   End
    + ')' AS Week_Day
   , ISNULL(CONVERT (varchar(08), a.ClockIn, 114), '') AS ClockIn
   , ISNULL(CONVERT (varchar(08), a.ClockOut, 114), '') AS ClockOut
   , ISNULL(CONVERT (varchar(08), a.ClockIn_Orig, 114), '') AS ClockIn_Orig
   , ISNULL(CONVERT (varchar(08), a.ClockOut_Orig, 114), '') AS ClockOut_Orig
   , case when ISNULL(CONVERT (varchar(08), a.ClockIn, 114), '') = ISNULL(CONVERT (varchar(08), a.ClockIn_Orig, 114), '') then  1 else 0 end as ClockIn_Flag
   , case when ISNULL(CONVERT (varchar(08), a.ClockOut, 114), '') = ISNULL(CONVERT (varchar(08), a.ClockOut_Orig, 114), '') then  1 else 0 end as ClockOut_Flag
   , a.Meals
   , a.Rest_Time
   , CONVERT (Bit, ISNULL(a.PreWork, 0)) AS PreWork
   , e.Location
   , a.Late
   , a.Leave_Early
   , a.Worktime_Hour
   , a.Overtime_Hour
   , (SELECT Overtime_Hour_1 FROM dbo.Calculate_Attendance_OverTime_Segment(a.Holiday_Type, a.Real_WorkTime_Hour, a.Overtime_Hour) AS Calculate_Attendance_OverTime_Segment_6) AS OverTime_Hour_1
   , (SELECT Overtime_Hour_2 FROM dbo.Calculate_Attendance_OverTime_Segment(a.Holiday_Type, a.Real_WorkTime_Hour, a.Overtime_Hour) AS Calculate_Attendance_OverTime_Segment_5) AS OverTime_Hour_2
   , (SELECT Overtime_Hour_3 FROM dbo.Calculate_Attendance_OverTime_Segment(a.Holiday_Type, a.Real_WorkTime_Hour, a.Overtime_Hour) AS Calculate_Attendance_OverTime_Segment_4) AS OverTime_Hour_3
   , dbo.Attendance_OverTime_Base_Point(a.Holiday_Type
      , (SELECT Overtime_Hour_1 FROM dbo.Calculate_Attendance_OverTime_Segment(a.Holiday_Type, a.Real_WorkTime_Hour, a.Overtime_Hour) AS Calculate_Attendance_OverTime_Segment_3)
      , (SELECT Overtime_Hour_2 FROM dbo.Calculate_Attendance_OverTime_Segment(a.Holiday_Type, a.Real_WorkTime_Hour, a.Overtime_Hour) AS Calculate_Attendance_OverTime_Segment_2)
      , (SELECT Overtime_Hour_3 FROM dbo.Calculate_Attendance_OverTime_Segment(a.Holiday_Type, a.Real_WorkTime_Hour, a.Overtime_Hour) AS Calculate_Attendance_OverTime_Segment_1)) AS OverTime_Score
   , CASE WHEN a.[Personal_Leave] = 0 THEN NULL ELSE a.[Personal_Leave] END AS Personal_Leave
   , CASE WHEN a.[Annual_Leave] = 0 THEN NULL ELSE a.[Annual_Leave] END AS Annual_Leave
   , CASE WHEN a.[Sick_Leave] = 0 THEN NULL ELSE a.[Sick_Leave] END AS Sick_Leave
   , CASE WHEN a.[Marital_Leave] = 0 THEN NULL ELSE a.[Marital_Leave] END AS Marital_Leave
   , CASE WHEN a.[Funeral_Leave] = 0 THEN NULL ELSE a.[Funeral_Leave] END AS Funeral_Leave
   , CASE WHEN a.[Maternity_Leave] = 0 THEN NULL ELSE a.[Maternity_Leave] END AS Maternity_Leave
   , CASE WHEN a.[Duty_Leave] = 0 THEN NULL ELSE a.[Duty_Leave] END AS Duty_Leave
   , CASE WHEN a.[Bussiness_Trip] = 0 THEN NULL ELSE a.[Bussiness_Trip] END AS Bussiness_Trip
   , CASE WHEN a.[Absence_From_Work] = 0 THEN NULL ELSE a.[Absence_From_Work] END AS Absence_From_Work
   , case when isnull(a.Abnormal_Flag,0) = 1 And a.Attendance_Date < CONVERT(DATE , GETDATE()) then 1 else 0 end as Abnormal_Flag
   , isnull(a.Memo,'') as Memo
   , isnull(a.Modify_User,'') as Modify_User
   , CONVERT (varchar(20), a.Modify_Date, 120) AS Modify_Date
   , a.OrganizationID 
   FROM Attendance AS a 
   Left Outer JOIN Employee AS e ON e.EmployeeID = a.EmployeeID 
   Left Outer JOIN Attendance_Class AS ac ON a.Attendance_ClassID = ac.Attendance_ClassID 
   Left Outer JOIN Department AS d ON e.DepartmentID = d.DepartmentID 
   WHERE (@Attendance_Date = '' or CONVERT (varchar(10), a.Attendance_Date, 111) LIKE @Attendance_Date + '%') 
   AND (@DepartmentID = 0 or d.DepartmentID = @DepartmentID) 
   AND (@EmployeeID = '' or a.EmployeeID LIKE @EmployeeID + '%') 
   AND (@Chinese_Name = '' or e.Chinese_Name LIKE '%' + @Chinese_Name + '%') 
   And (@Only_Abnormal = 0 or (isnull(a.Abnormal_Flag,0) = @Only_Abnormal And (a.Attendance_Date < CONVERT(DATE , GETDATE()))))
   And (@OrganizationID = '' or a.OrganizationID = @OrganizationID)
   ORDER BY a.Attendance_Date DESC, d.Main_Group, d.SortID, e.Employee_TitleID, CASE WHEN e.Extension IS NULL THEN 1 ELSE 0 END, ISNULL(e.Extension, ''), e.Hired_Date
   `, req.body) ;
  //console.log(strSQL)
  
   db.sql(req.Enterprise, strSQL)
      .then((result) => {
         res.send(result.recordset);
         //console.log(result.recordset)
         console.log("End Attendance_List Api:",moment().format('YYYY/MM/DD HH:mm:ss'));
      }).catch((err) => {
         console.log(err);
         res.status(500).send(err);
      })
});

//Get Attendance_Info
router.post('/Attendance_Info',  function (req, res, next) {
  console.log("Call Attendance_Info Api:",req.body);

  req.body.RecNo = req.body.RecNo ? req.body.RecNo : null;
  req.body.Mode = req.body.Mode ? req.body.Mode : 0;

  //Mode == 0 Get Attendance Source 
  
  var strSQL = format(`
  Declare @Mode int = {Mode};

  if(@Mode = 0 or @Mode = 1)
  Begin
     SELECT a.RecNo
     , a.Real_WorkTime_Hour
     , a.Holiday_Type     
     , case a.Holiday_Type when 0 then '平'
     when 1 then '休'
     when 2 then '例'
     End as Holiday_Type_Name
     , case a.Holiday_Type when 0 then 'Black'
     when 1 then 'Green'
     when 2 then 'Red'
     End as Holiday_Type_Color
     , case when len(a.Memo) > 0 then 1 else 0 end as Memo_Flag
     , a.Department
     , d.DepartmentID
     , a.Attendance_ClassID
     , ac.Attendance_Class_Name
     , a.EmployeeID
     , e.LoweredUserName
     , e.Chinese_Name
     , CONVERT (varchar(10), a.Attendance_Date, 111) AS Attendance_Date
     , '(' + case DATEPART(weekday, a.Attendance_Date) when 1 then '日' 
     when 2 then '一' 
     when 3 then '二' 
     when 4 then '三' 
     when 5 then '四' 
     when 6 then '五' 
     when 7 then '六' 
     End
      + ')' AS Week_Day
     , ISNULL(CONVERT (varchar(08), a.ClockIn, 114), '') AS ClockIn
     , ISNULL(CONVERT (varchar(08), a.ClockOut, 114), '') AS ClockOut
     , ISNULL(CONVERT (varchar(08), a.ClockIn_Orig, 114), '') AS ClockIn_Orig
     , ISNULL(CONVERT (varchar(08), a.ClockOut_Orig, 114), '') AS ClockOut_Orig
     , case when ISNULL(CONVERT (varchar(08), a.ClockIn, 114), '') = ISNULL(CONVERT (varchar(08), a.ClockIn_Orig, 114), '') then  1 else 0 end as ClockIn_Flag
     , case when ISNULL(CONVERT (varchar(08), a.ClockOut, 114), '') = ISNULL(CONVERT (varchar(08), a.ClockOut_Orig, 114), '') then  1 else 0 end as ClockOut_Flag
     , a.Meals
     , a.Rest_Time
     , CONVERT (Bit, ISNULL(a.PreWork, 0)) AS PreWork
     , e.Location
     , a.Late
     , a.Leave_Early
     , a.Worktime_Hour
     , a.Overtime_Hour
     , (SELECT Overtime_Hour_1 FROM dbo.Calculate_Attendance_OverTime_Segment(a.Holiday_Type, a.Real_WorkTime_Hour, a.Overtime_Hour) AS Calculate_Attendance_OverTime_Segment_6) AS OverTime_Hour_1
     , (SELECT Overtime_Hour_2 FROM dbo.Calculate_Attendance_OverTime_Segment(a.Holiday_Type, a.Real_WorkTime_Hour, a.Overtime_Hour) AS Calculate_Attendance_OverTime_Segment_5) AS OverTime_Hour_2
     , (SELECT Overtime_Hour_3 FROM dbo.Calculate_Attendance_OverTime_Segment(a.Holiday_Type, a.Real_WorkTime_Hour, a.Overtime_Hour) AS Calculate_Attendance_OverTime_Segment_4) AS OverTime_Hour_3
     , dbo.Attendance_OverTime_Base_Point(a.Holiday_Type
        , (SELECT Overtime_Hour_1 FROM dbo.Calculate_Attendance_OverTime_Segment(a.Holiday_Type, a.Real_WorkTime_Hour, a.Overtime_Hour) AS Calculate_Attendance_OverTime_Segment_3)
        , (SELECT Overtime_Hour_2 FROM dbo.Calculate_Attendance_OverTime_Segment(a.Holiday_Type, a.Real_WorkTime_Hour, a.Overtime_Hour) AS Calculate_Attendance_OverTime_Segment_2)
        , (SELECT Overtime_Hour_3 FROM dbo.Calculate_Attendance_OverTime_Segment(a.Holiday_Type, a.Real_WorkTime_Hour, a.Overtime_Hour) AS Calculate_Attendance_OverTime_Segment_1)) AS OverTime_Score
     , CASE WHEN a.[Personal_Leave] = 0 THEN NULL ELSE a.[Personal_Leave] END AS Personal_Leave
     , CASE WHEN a.[Annual_Leave] = 0 THEN NULL ELSE a.[Annual_Leave] END AS Annual_Leave
     , CASE WHEN a.[Sick_Leave] = 0 THEN NULL ELSE a.[Sick_Leave] END AS Sick_Leave
     , CASE WHEN a.[Marital_Leave] = 0 THEN NULL ELSE a.[Marital_Leave] END AS Marital_Leave
     , CASE WHEN a.[Funeral_Leave] = 0 THEN NULL ELSE a.[Funeral_Leave] END AS Funeral_Leave
     , CASE WHEN a.[Maternity_Leave] = 0 THEN NULL ELSE a.[Maternity_Leave] END AS Maternity_Leave
     , CASE WHEN a.[Duty_Leave] = 0 THEN NULL ELSE a.[Duty_Leave] END AS Duty_Leave
     , CASE WHEN a.[Bussiness_Trip] = 0 THEN NULL ELSE a.[Bussiness_Trip] END AS Bussiness_Trip
     , CASE WHEN a.[Absence_From_Work] = 0 THEN NULL ELSE a.[Absence_From_Work] END AS Absence_From_Work
     , case when isnull(a.Abnormal_Flag,0) = 1 And a.Attendance_Date < CONVERT(DATE , GETDATE()) then 1 else 0 end as Abnormal_Flag
     , a.Memo
     , a.Modify_User
     , CONVERT (varchar(20), a.Modify_Date, 120) AS Modify_Date
     , a.OrganizationID 
     FROM Attendance a WITH (NoLock, NoWait)
     Left Outer JOIN Employee AS e ON e.EmployeeID = a.EmployeeID 
     Left Outer JOIN Attendance_Class AS ac ON a.Attendance_ClassID = ac.Attendance_ClassID 
     Left Outer JOIN Department AS d ON e.DepartmentID = d.DepartmentID 
     WHERE a.RecNo = {RecNo}
  End
  `, req.body) ;
  //console.log(strSQL)
  db.sql(req.Enterprise, strSQL)
     .then((result) => {
        var DataSet = {Attendance_Info: (req.body.Mode == 0 || req.body.Mode == 1) ? result.recordsets[0] : []          
       };
       //console.log(DataSet)
       res.send(DataSet);
     }).catch((err) => {
        console.log(err);
        res.status(500).send(err);
     })
});

//Maintain Attendance_Maintain
router.post('/Attendance_Maintain',  function (req, res, next) {
  console.log("Call Attendance_Maintain Api:",req.body);

  // req.body.Mode === 0 表示新增
  // req.body.Mode === 1 表示修改
  // req.body.Mode === 2 表示刪除
  var Size = 0;
  req.body.RecNo = req.body.RecNo ? req.body.RecNo : null;
  req.body.Mode = req.body.Mode ? req.body.Mode : 0;
  req.body.Flexible_WorkHour_Flag = req.body.Flexible_WorkHour_Flag ? req.body.Flexible_WorkHour_Flag : 0;
  req.body.Real_WorkTime_Hour = req.body.Real_WorkTime_Hour ? req.body.Real_WorkTime_Hour : 1;
  req.body.Attendance_ClassID = req.body.Attendance_ClassID ? req.body.Attendance_ClassID : 1;
  req.body.Holiday_Type = req.body.Holiday_Type ? req.body.Holiday_Type : 0;
  req.body.ClockIn = req.body.ClockIn ? `'${req.body.ClockIn}'` : null;
  req.body.ClockOut = req.body.ClockOut ? `'${req.body.ClockOut}'` : null;
  req.body.PreWork = req.body.PreWork ? req.body.PreWork : 0;
  req.body.Rest_Time = req.body.Rest_Time != null ? req.body.Rest_Time : 0;
  req.body.Duty_Leave = req.body.Duty_Leave != null ? req.body.Duty_Leave : 0;
  req.body.Personal_Leave = req.body.Personal_Leave != null ? req.body.Personal_Leave : 0;
  req.body.Annual_Leave = req.body.Annual_Leave != null ? req.body.Annual_Leave : 0;
  req.body.Sick_Leave = req.body.Sick_Leave != null ? req.body.Sick_Leave : 0;
  req.body.Bussiness_Trip = req.body.Bussiness_Trip != null ? req.body.Bussiness_Trip : 0;
  req.body.Marital_Leave = req.body.Marital_Leave != null ? req.body.Marital_Leave : 0;
  req.body.Maternity_Leave = req.body.Maternity_Leave != null ? req.body.Maternity_Leave : 0;
  req.body.Funeral_Leave = req.body.Funeral_Leave != null ? req.body.Funeral_Leave : 0;
  req.body.Absence_From_Work = req.body.Absence_From_Work != null ? req.body.Absence_From_Work : 0;
    
  var strSQL = format(`Declare @ROWCOUNT int, @RecNo int = {RecNo} `, req.body);
  var strSQL_Save = format(`Declare @Flexible_WorkHour_Flag int = {Flexible_WorkHour_Flag}, 
  @Real_WorkTime_Hour int = {Real_WorkTime_Hour},
  @Attendance_ClassID int = {Attendance_ClassID},
  @Holiday_Type int = {Holiday_Type},
  @ClockIn varchar(08) = {ClockIn},
  @ClockOut varchar(08) = {ClockOut},
  @PreWork int = {PreWork},
  @Rest_Time numeric(18,1) = {Rest_Time},
  @Duty_Leave numeric(2,1) = {Duty_Leave},
  @Personal_Leave numeric(2,1) = {Personal_Leave},
  @Annual_Leave numeric(2,1) = {Annual_Leave},
  @Sick_Leave	numeric(2,1) = {Sick_Leave},
  @Bussiness_Trip numeric(2,1) = {Bussiness_Trip},
  @Marital_Leave numeric(2,1) = {Marital_Leave},
  @Maternity_Leave numeric(2,1) = {Maternity_Leave},
  @Funeral_Leave numeric(2,1) = {Funeral_Leave},
  @Absence_From_Work numeric(2,1) = {Absence_From_Work};
  
  Declare @Late int = 0,
  @Leave_Early int = 0,
  @WorkTime_Hour	numeric(8,4) = 0.0,
  @OverTime_Hour	numeric(18,1) = 0.0,
  @OverTime_Hour_1 varchar(4) = '0.0',
  @OverTime_Hour_2 varchar(4) = '0.0',
  @OverTime_Hour_3 varchar(4) = '0.0',
  @OverTime_Score float = 0.0,
  @Abnormal_Flag int = 0;
  
  ${req.body.Name == 'Holiday_Type' || req.body.Name == 'ClockIn' || req.body.Name == 'ClockOut' ? ' Set @Rest_Time = dbo.Get_Attendance_Rest_Time(@Attendance_ClassID, @ClockIn, @ClockOut); ' : '' } 
  
  Select @Late = Late,
     @Leave_Early = Leave_Early,
     @WorkTime_Hour = WorkTime_Hour,
     @OverTime_Hour = OverTime_Hour,
     @OverTime_Hour_1 = OverTime_Hour_1,
     @OverTime_Hour_2 = OverTime_Hour_2,
     @OverTime_Hour_3 = OverTime_Hour_3, 
     @OverTime_Score = OverTime_Score,
     @Abnormal_Flag = Abnormal_Flag
  From Check_Attendance_Rules_Table_New (@Flexible_WorkHour_Flag, @Real_WorkTime_Hour, @Attendance_ClassID, @Holiday_Type, @ClockIn, @ClockOut, @PreWork, @Rest_Time
     , @Duty_Leave, @Personal_Leave, @Annual_Leave, @Sick_Leave, @Bussiness_Trip, @Marital_Leave, @Maternity_Leave, @Funeral_Leave, @Absence_From_Work) 
      

  Update Attendance set Real_WorkTime_Hour = @Real_WorkTime_Hour,     
     Holiday_Type = @Holiday_Type,
     ClockIn = @ClockIn,
     ClockOut = @ClockOut,
     PreWork = @PreWork,
     Rest_Time = @Rest_Time,
     Duty_Leave = case when @Duty_Leave = 0 then null else @Duty_Leave end,
     Personal_Leave = case when @Personal_Leave = 0 then null else @Personal_Leave end,     
     Annual_Leave = case when @Annual_Leave = 0 then null else @Annual_Leave end,
     Sick_Leave = case when @Sick_Leave = 0 then null else @Sick_Leave end,
     Bussiness_Trip = case when @Bussiness_Trip = 0 then null else @Bussiness_Trip end,
     Marital_Leave = case when @Marital_Leave = 0 then null else @Marital_Leave end,
     Maternity_Leave = case when @Maternity_Leave = 0 then null else @Maternity_Leave end,
     Funeral_Leave = case when @Funeral_Leave = 0 then null else @Funeral_Leave end,
     Absence_From_Work = case when @Absence_From_Work = 0 then null else @Absence_From_Work end,    
     Late = @Late, 
     Leave_Early = @Leave_Early,
     Worktime_Hour = @WorkTime_Hour,
     Overtime_Hour = @OverTime_Hour,
     Overtime_Hour_1 = @OverTime_Hour_1,
     Overtime_Hour_2 = @OverTime_Hour_2,
     Overtime_Hour_3 = @OverTime_Hour_3,
     OverTime_Score = @OverTime_Score,
     Abnormal_Flag = @Abnormal_Flag
     , Modify_User = case when N'${req.UserID}' = 'aaron-ho' or N'${req.UserID}' = 'mark-wang' then Modify_User else N'${req.UserID}' end
     , Modify_Date = case when N'${req.UserID}' = 'aaron-ho' or N'${req.UserID}' = 'mark-wang' then Modify_Date else GetDate() end
  Where RecNo = @RecNo; `, req.body);
  switch(req.body.Mode){
     case 0:
        req.body.EmployeeID = req.body.EmployeeID ? `'${req.body.EmployeeID}'` : `''`;
        req.body.Attendance_Date = req.body.Attendance_Date ? `'${req.body.Attendance_Date.trim().substring(0,10)}'` : moment().format('YYYY/MM/DD');

        strSQL += format(`Declare @EmployeeID varchar(10) = {EmployeeID} , @Attendance_Date Nvarchar(20) = {Attendance_Date};
                   
        Insert [dbo].[Attendance] (Holiday_Type, OrganizationID, DepartmentID, Department, Employee_TitleID
        , EmployeeID, Attendance_Date, Attendance_ClassID, Rest_Time, Prework, Late, Leave_Early, Overtime_Hour
        , Duty_Leave, Personal_Leave, Annual_Leave, Sick_Leave, Bussiness_Trip, Marital_Leave, Maternity_Leave, Funeral_Leave, Absence_From_Work
        , Modify_User, Modify_Date)
        Select 
        --dbo.[CheckHoliday](@Attendance_Date) as Holiday_Type, 
        isnull(dbo.CheckAttendanceIDHoliday(@Attendance_Date,e.Attendance_ClassID) ,0) as HoliDay_Type,
        d.OrganizationID, e.DepartmentID, d.Department, e.Employee_TitleID
        , e.EmployeeID, @Attendance_Date as Attendance_Date, e.Attendance_ClassID, 0 as Rest_Time, e.Prework, 0 as Late, 0 as Leave_Early, 0 as Overtime_Hour
        , 0 as Duty_Leave, 0 as Personal_Leave, 0 as Annual_Leave, 0 as Sick_Leave, 0 as Bussiness_Trip, 0 as Marital_Leave, 0 as Maternity_Leave, 0 as Funeral_Leave, 0 as Absence_From_Work
        , N'${req.UserID}' as Modify_User, GetDate() as Modify_Date
        from Employee e with(NoLock,NoWait)
        Inner Join Department d with(NoLock,NoWait) on e.DepartmentID = d.DepartmentID
        Where e.EmployeeID = @EmployeeID
        And (Select count(*) From Attendance b with(NoLock,NoWait) Where b.EmployeeID = @EmployeeID And b.Attendance_Date = @Attendance_Date) = 0;
          
        Set @ROWCOUNT = @@ROWCOUNT;
        Set @RecNo = scope_identity();
        `, req.body);
     break;
     case 1:
        switch(req.body.Name){
           case 'OrganizationID':
              Size = 10;
           break;
           case 'ClockIn':
           case 'ClockOut':
              Size = 8;
           break;
           case 'Memo':
              Size = 255;
           break;
           default:
           break;
        }
        req.body.Value = Size == 0 ? (req.body.Value != null ? req.body.Value : null) : (req.body.Value != null ? `N'${req.body.Value.trim().replace(/'/g, "''")}'` : null);

        switch(req.body.Name){
            case 'OrganizationID':
               strSQL += format(`Declare @DepartmentID int, @Department Nvarchar(20)
                  Select Top 1 @DepartmentID = DepartmentID, @Department = Department From dbo.Department d where d.OrganizationID = N'{OrganizationID}'
                  Update [dbo].[Attendance] Set [OrganizationID] = substring({Value},1,${Size})
                  , DepartmentID = @DepartmentID
                  , Department = @Department
                  , Modify_User = case when N'${req.UserID}' = 'aaron-ho' or N'${req.UserID}' = 'mark-wang' then Modify_User else N'${req.UserID}' end
                  , Modify_Date = case when N'${req.UserID}' = 'aaron-ho' or N'${req.UserID}' = 'mark-wang' then Modify_Date else GetDate() end
                  where RecNo = @RecNo;
                  Set @ROWCOUNT = @@ROWCOUNT;
               `, req.body);
            break;
            case 'DepartmentID':
               strSQL += format(`
                  Update [dbo].[Attendance] Set [DepartmentID] = {Value}
                  , Department = (Select Department From dbo.Department d where d.DepartmentID = {Value})
                  , Modify_User = case when N'${req.UserID}' = 'aaron-ho' or N'${req.UserID}' = 'mark-wang' then Modify_User else N'${req.UserID}' end
                  , Modify_Date = case when N'${req.UserID}' = 'aaron-ho' or N'${req.UserID}' = 'mark-wang' then Modify_Date else GetDate() end
                  where RecNo = @RecNo;
                  Set @ROWCOUNT = @@ROWCOUNT;
               `, req.body);
            break;
            case 'Memo':
            case 'Meals':
               strSQL += format(`
                  Update [dbo].[Attendance] Set [{Name}] = ${Size == 0 ? '{Value}': `substring({Value},1,${Size})` } 
                  , Modify_User = case when N'${req.UserID}' = 'aaron-ho' or N'${req.UserID}' = 'mark-wang' then Modify_User else N'${req.UserID}' end
                  , Modify_Date = case when N'${req.UserID}' = 'aaron-ho' or N'${req.UserID}' = 'mark-wang' then Modify_Date else GetDate() end
                  where RecNo = @RecNo;
                  Set @ROWCOUNT = @@ROWCOUNT;
               `, req.body);
            break;
            default:
               strSQL += format(`
                  ${strSQL_Save}

                  Set @ROWCOUNT = @@ROWCOUNT;
               `, req.body);
            break;
         }
     break;
     case 2:
        strSQL += format(`
           Delete FROM [dbo].[Attendance] 
           where RecNo = @RecNo;
           
           Set @ROWCOUNT = @@ROWCOUNT;
        `, req.body);
     break;
     case 3:
        strSQL += format(`
            ${strSQL_Save}

           Set @ROWCOUNT = @@ROWCOUNT;
        `, req.body);
     break;       
  }

  strSQL += format(`
  Select @ROWCOUNT as Flag,  @RecNo as RecNo;
  `, req.body);
  //console.log(strSQL)
  db.sql(req.Enterprise, strSQL)
     .then((result) => {
        //console.log(result.recordsets[0][0])
        res.send({Flag:result.recordsets[0][0].Flag > 0, RecNo: result.recordsets[0][0].RecNo});
     }).catch((err) => {
        console.log(err);
        res.status(500).send(err);
     })
});

//Get Attendance_Source
router.post('/Attendance_Source',  function (req, res, next) {
  console.log("Call Attendance_Source Api:",req.body);

  req.body.RecNo = req.body.RecNo ? req.body.RecNo : null;
  req.body.Mode = req.body.Mode ? req.body.Mode : 0;  

  var strSQL = format(`
  Declare @Mode int = {Mode};

  if(@Mode = 0 or @Mode = 1)
  Begin
      SELECT a.EmployeeID
      , s.[Punch_Card_Type]
      , case when isnull(Punch_Card_Type,0) = 0 then '上班' else '下班' End as Punch_Card_Name
      , CONVERT (varchar(10), s.[Attendance_DateTime], 112) as Attendance_Date
      , CONVERT (varchar(08), s.[Attendance_DateTime], 114) as Attendance_Time
      , CONVERT (varchar(20), s.[Attendance_DateTime], 120) as Attendance_DateTime
      , tb.fsattfile as Photo
      , case when tb.fsattfile is not null then 'datas/ATTPHOTO/' + CONVERT (varchar(10), s.[Attendance_DateTime], 112) + '/'+ cast(isnull(tb.fimno,'1') as varchar) +'/' + tb.fsattfile else '' end as Photos
      FROM [Attendance_Source] s with(NoLock, NoWait)
      Inner Join Attendance a with(NoLock, NoWait) on s.EmployeeID = a.EmployeeID And a.Attendance_Date = cast(s.Attendance_DateTime as Date)
      Left Outer Join [HanAtt].dbo.[tbtowork] tb with(NoLock, NoWait) on tb.fsstano = a.EmployeeID And s.Attendance_DateTime = tb.[fdtime]
      Where a.RecNo = {RecNo} 
  End
  `, req.body) ;
  //console.log(strSQL)
  
  db.sql(req.Enterprise, strSQL)
     .then((result) => {
         var DataSet = { Attendance_Source: (req.body.Mode == 0) ? result.recordsets[0] : (req.body.Mode == 1 ? result.recordsets[0] : [])
         };
         res.send(DataSet);
     }).catch((err) => {
         console.log(err);
         res.status(500).send(err);
     });
});

/* Mark-Wang API End */


/* Darren-Chang API Begin */

/* Darren-Chang API End */

module.exports = router;