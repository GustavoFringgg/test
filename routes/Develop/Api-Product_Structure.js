var express = require('express');
var router = express.Router();
var multer = require('multer');
var moment = require('moment');
const format = require('string-format');
const sharp = require('sharp');

var db = require('../../config/DB_Connect');
var smb2 = require('../../config/smb2');
var formidable = require('formidable');


var storage = multer.memoryStorage({
  // destination: function (req, file, cb) {
  //   cb(null, './upload')
  // },
  filename: function (req, file, cb) {
    cb(null, file.originalname)
  }
})
var upload = multer({
  storage: storage
})

/* Mark-Wang API Begin */

const Update_SQL = ` Update Product set Structure_Maker = isnull(Structure_Maker,'{1}') , Structure_Updater = '{1}', Structure_Update = Getdate()
Where Product_No = '{0}' \r\n `

//匯入Product Structure
router.post('/Import_Product_Structure', function (req, res, next) {
  console.log("Call Import_Product_Structure Api Product_No:", req.body.Product_No);
  
  var strSQL = format(` Declare @Structure_Completed datetime = null, @Import_Flag int = 0;
    Select @Structure_Completed = Structure_Completed 
    From Product 
    where Product_No = '{1}';
    Set @Import_Flag = case when @Structure_Completed is null then 0 else 1 end
    if(@Import_Flag = 1)
    begin 
      Delete From Product_Structure
      Where StructureID in (
        Select StructureID
        From Product_Structure p With(NoWait, Nolock) 
        Inner join Product_Component pc With(NoWait, Nolock) On pc.ComponentID = p.ComponentID
        Inner join Product_Component_Group pcg With(NoWait, Nolock) On pcg.Component_GroupID = pc.Component_GroupID
        Where Product_No = '{0}' 
        And (0 = {2} or p.Component_GroupID = {2})
      )

      INSERT Product_Structure ([Product_No],[ComponentID],[C_Rmk],[Master_Purchase_Item],[Sub_Purchase_Item],[Master_StructureID],[Master_Purchase_DetailID],[MaterialID],[Material_DetailID],[Material_ColorID],[Material_Category],[Material_Specific],[Material_Color],[M_Rmk],[Size_From],[Size_End],[W_L],[W_Q],[L_L],[L_Q],[Qty],[Net_Consist],[Lose],[Memo],[Unit],[SupplierID],[Quot_Price],[Unit_Price],[Part_No],[Mian_part],[Component_PhotoID],[Currency],[WorkshopID],[Component_GroupID],[SortID])
      Select '{0}' as [Product_No],p.[ComponentID],[C_Rmk],[Master_Purchase_Item],[Sub_Purchase_Item],[Master_StructureID],[Master_Purchase_DetailID],[MaterialID],[Material_DetailID],[Material_ColorID],[Material_Category],[Material_Specific],[Material_Color],[M_Rmk],[Size_From],[Size_End],[W_L],[W_Q],[L_L],[L_Q],[Qty],[Net_Consist],[Lose],[Memo],[Unit],[SupplierID],[Quot_Price],[Unit_Price],[Part_No],[Mian_part],[Component_PhotoID],[Currency],[WorkshopID],isnull(p.[Component_GroupID], pcg.[Component_GroupID]) as Component_GroupID, p.[SortID]
      FROM Product_Structure as p WITH (NoWait, Nolock) 
      Inner join Product_Component pc WITH (NoWait, Nolock) On pc.ComponentID = p.ComponentID
      Inner join Product_Component_Group pcg WITH (NoWait, Nolock) On pcg.Component_GroupID = pc.Component_GroupID
      Where Product_No = '{1}'
       and (0 = {2} or p.Component_GroupID = {2});

      Update Material_Color Set Date = GetDate()
      From Material_Color mc 
      Where mc.Material_ColorID in (
        Select distinct Material_ColorID
        From Product_Structure ps with(NoLock,NoWait)
        Where Product_No = '{0}'
      ) 
      or mc.Material_ColorID in (
        Select mcp.Detail_ColorID 
        From Material_Composite mcp 
        Inner Join (
          Select distinct Material_ColorID
          From Product_Structure ps with(NoLock,NoWait)
          Where Product_No = '{0}' 
        ) tmp on tmp.Material_ColorID = mcp.Master_ColorID 
      );
 
       {3}
    End    
    Select convert(bit,@Import_Flag) as Import_Flag
      `, req.body.Product_No, req.body.selected.Product_No, req.body.Component_GroupID, format(Update_SQL, req.body.Product_No, req.UserID) );
   
       //console.log(strSQL);

   db.sql(req.Enterprise, strSQL)
   .then((result)=>{
     //console.log(result)
      //result.recordset[0].Import_Flag ? res.send("success") : res.send("Fail");
      res.send({Flag:result.recordset[0].Import_Flag, Name:'Structure'});
   }).catch((err)=>{
     console.log(err);
     res.status(500).send(err);
   }) 

});


//匯出樣品單細項至產品結構
router.post('/Sample_Sheet_Export', function (req, res, next) {
  console.log("Call Sample_Sheet_Export Api Product_No:", req.body.Product_No);
  var strSQL = format(` Delete From Product_Structure Where Product_No = '{0}';
      insert Product_Structure ([Product_No] ,[Component_GroupID] ,[SortID],[ComponentID] ,[C_Rmk] ,[MaterialID] ,[Material_DetailID] ,[Material_ColorID],[Material_Category],[Material_Specific],[Material_Color], [Qty], [Net_Consist], [Unit], [SupplierID], [Quot_Price], [Unit_Price], [Currency] )
      Select '{0}' as [Product_No] ,[Component_GroupID] ,[SortID] ,[ComponentID] ,[C_Rmk] ,p.[MaterialID] ,p.[Material_DetailID] ,p.[Material_ColorID],m.[Material_Category],md.[Material_Specific],mc.[Material_Color], 0 as [Qty], 0 as Net_Consist, m.[Unit], mc.[SupplierID], mc.[Unit_Price] as Quot_Price, mc.[Purchase_Price] as Unit_Price, mc.Currency as Currency
      FROM Product_Technical_Sheet_Detail as p WITH (NoWait, Nolock) 
      Inner Join Material_Color mc WITH (NoWait, Nolock) on p.Material_ColorID = mc.Material_ColorID
      Inner Join Material_Detail md WITH (NoWait, Nolock) on mc.Material_DetailID = md.Material_DetailID
      Inner Join Material m WITH (NoWait, Nolock) on md.MaterialID = m.MaterialID
      Where Product_No = '{0}';
      
      Update Material_Color Set Date = GetDate()
      From Material_Color mc 
      Where mc.Material_ColorID in (
        Select distinct Material_ColorID
        From Product_Structure ps with(NoLock,NoWait)
        Where Product_No = '{0}'
      ) 
      or mc.Material_ColorID in (
        Select mcp.Detail_ColorID 
        From Material_Composite mcp 
        Inner Join (
          Select distinct Material_ColorID
          From Product_Structure ps with(NoLock,NoWait)
          Where Product_No = '{0}' 
        ) tmp on tmp.Material_ColorID = mcp.Master_ColorID 
      );

      `, req.body.Product_No );

  strSQL += format(Update_SQL, req.body.Product_No, req.UserID);
   
  //console.log(strSQL);

  db.sql(req.Enterprise, strSQL)
  .then((result)=>{
    res.send("success");
  }).catch((err)=>{
    console.log(err);
    res.status(500).send(err);
  })       

});


//取得Product_Size_Match
router.get('/Product_Size_Match/:Product_No', function (req, res, next) {
  console.log("Call Product_Size_Match Api Product_No:", req.params.Product_No);
  
  var strSQL = format(` Select (Select Size_Name From Product_Size s Where s.SizeID = m.Shoe_Size ) as Shoe_Size, 
  (Select Size_Name From Product_Size s Where s.SizeID = m.Cutting_Die_Size ) as Cutting_Die_Size,
  (Select Size_Name From Product_Size s Where s.SizeID = m.Last_Size ) as Last_Size,
  (Select Size_Name From Product_Size s Where s.SizeID = m.Outsole_Size ) as Outsole_Size
  From Product_Size_Match m with(NoLock, NoWait) 
  Inner Join Product p With(NoLock, NoWait) on p.Style_No = m.Style_No
  Where p.Product_No = '{Product_No}' 
  Order by m.Shoe_Size;      
   `, req.params);
   
  //console.log(strSQL);

   db.sql(req.Enterprise, strSQL)
   .then( async (result)=>{
    var Dataset = { 'Article Size':[], 'Cut. Die_Size':[], 'Last Size':[], 'Sole Size':[]  }
    await result.recordset.forEach((item)=>{
        Dataset['Article Size'].push(item.Shoe_Size);
        Dataset['Cut. Die_Size'].push(item.Cutting_Die_Size);
        Dataset['Last Size'].push(item.Last_Size);
        Dataset['Sole Size'].push(item.Outsole_Size);
     })
     await res.send(Dataset);
   }).catch((err)=>{
     console.log(err);
     res.status(500).send(err);
   }) 

});


//取得Product_Cutting_Die_Size_Match
router.get('/Product_Cutting_Die_Size_Match/:Product_No/:Lang', function (req, res, next) {
  console.log("Call Product_Cutting_Die_Size_Match Api Product_No:", req.params.Product_No);
  
  var strSQL = format(` Select (Select Size_Name From Product_Size s Where s.SizeID = m.Shoe_Size ) as Shoe_Size, 
  (Select Size_Name From Product_Size s Where s.SizeID = m.Cutting_Die_Size ) as Cutting_Die_Size,
  (Select Size_Name From Product_Size s Where s.SizeID = m.Last_Size ) as Last_Size,
  (Select Size_Name From Product_Size s Where s.SizeID = m.Outsole_Size ) as Outsole_Size
  From Product_Size_Match m with(NoLock, NoWait) 
  Inner Join Product p With(NoLock, NoWait) on p.Style_No = m.Style_No
  Where p.Product_No = '{Product_No}'
  Order by m.Shoe_Size;      
   `, req.params);
   
  //console.log(strSQL);

   db.sql(req.Enterprise, strSQL)
   .then(async (result)=>{
    var Dataset = { }
    var Lang = [`鞋號SIZE;斬刀SIZE;楦頭SIZE;大底SIZE;鞋頭高度;助帶口高度;領口高度內腰;領口高度外腰;後踵高度`,
    `Shoes SIZE;Cuting Die SIZE;Last SIZE;OutSole SIZE;Ketinggian Toe Cap;Ketinggian Eyelet;Ketinggian Kun Luar Sisi Dalam;Ketinggian Kun Luar Sisi Luar;Ketinggian Back Ctr`
  ]
    var StringArray = (req.params.Lang == 'cht' ? Lang[0]:Lang[1]).split(';')
    await StringArray.forEach((obj)=>{ Dataset[`${obj}`]=[]; });
    await result.recordset.forEach((item)=>{
      StringArray.forEach((obj,idx)=>{ 
        switch(idx){
          case 0:
              Dataset[`${obj}`].push(item.Shoe_Size);         
            break;
          case 1:
              Dataset[`${obj}`].push(item.Cutting_Die_Size);         
            break;
          case 2:
              Dataset[`${obj}`].push(item.Last_Size);         
            break;
          case 3:
              Dataset[`${obj}`].push(item.Outsole_Size);         
            break;
          default:
              Dataset[`${obj}`].push(''); 
            break;
        }
        
      })
    })
     //console.log(Dataset)
     await res.send(Dataset);
   }).catch((err)=>{
     console.log(err);
     res.status(500).send(err);
   }) 

});


//取得Product_Color_Swatch
router.get('/Product_Color_Swatch/:Product_No', function (req, res, next) {
  console.log("Call Product_Color_Swatch Api Product_No:", req.params.Product_No);

  //第一個T-SQL 取得產品結構Material Color Swatch。 第二個T-SQL 取得產品結構中Material color Swatch的部位
  var strSQL = format(` 
  Select p.[Material_ColorID], isnull(p.[Material_Category],'') + ' ' + isnull(p.[Material_Specific],'') + ' ' + p.[Material_Color] as [Material]
  FROM Product_Structure as p WITH (NoWait, Nolock)
Inner Join Material_Color mc WITH (NoWait, Nolock) on p.Material_ColorID = mc.Material_ColorID
Where Product_No = N'{Product_No}' And ABS(isnull(mc.Swatch,0)) = 1
Group by p.[Material_ColorID], isnull(p.[Material_Category],'') + ' ' + isnull(p.[Material_Specific],'') + ' ' + p.[Material_Color] 
union
Select mc.[Material_ColorID], isnull(m.[Material_Category],'') + ' ' + isnull(md.[Material_Specific],'') + ' ' + mc.[Material_Color] as [Material]
From Material_Composite MCS
Inner Join Material_Color mc on mc.Material_ColorID = MCS.Detail_ColorID And ABS(isnull(mc.Swatch,0)) = 1
Inner Join Material_Detail md on md.Material_DetailID = mc.Material_DetailID
Inner Join Material m on m.MaterialID = md.MaterialID
Where MCS.Master_ColorID in 
(
	Select distinct p.[Material_ColorID]
		FROM Product_Structure as p WITH (NoWait, Nolock)
	Inner Join Material_Color mc WITH (NoWait, Nolock) on p.Material_ColorID = mc.Material_ColorID
	Where Product_No = N'{Product_No}' And ABS(isnull(mc.Composite,0)) = 1
)
Group by mc.[Material_ColorID], isnull(m.[Material_Category],'') + ' ' + isnull(md.[Material_Specific],'') + ' ' + mc.[Material_Color];

 Select  p.[ComponentID], pc.Component ,isnull([C_Rmk],'') as C_Rmk ,p.[Material_ColorID]
  FROM Product_Structure as p WITH (NoWait, Nolock)
Inner Join Material_Color mc WITH (NoWait, Nolock) on p.Material_ColorID = mc.Material_ColorID
Inner Join Product_Component pc WITH (NoWait, Nolock) on p.ComponentID = pc.ComponentID
Where Product_No = N'{Product_No}' And ABS(isnull(mc.Swatch,0)) = 1
Group by p.[ComponentID], pc.Component ,[C_Rmk] ,p.[Material_ColorID]
union
Select p.[ComponentID], pc.Component ,[C_Rmk] ,MCS.[Detail_ColorID] as [Material_ColorID]
From Product_Structure as p WITH (NoWait, Nolock)
Inner Join Product_Component pc WITH (NoWait, Nolock) on p.ComponentID = pc.ComponentID
Inner Join Material_Composite MCS on MCS.Master_ColorID = p.Material_ColorID
Inner Join Material_Color mc on mc.Material_ColorID = MCS.Detail_ColorID And ABS(isnull(mc.Swatch,0)) = 1
Inner Join (
	Select distinct p.[Material_ColorID]
		FROM Product_Structure as p WITH (NoWait, Nolock)
	Inner Join Material_Color mc WITH (NoWait, Nolock) on p.Material_ColorID = mc.Material_ColorID
	Where Product_No = N'{Product_No}' And ABS(isnull(mc.Composite,0)) = 1
 ) tmp on tmp.[Material_ColorID] = MCS.Master_ColorID
Group by p.[ComponentID], pc.Component ,[C_Rmk] ,MCS.[Detail_ColorID] ; 
   `, req.params);
   
  //console.log(strSQL);

   db.sql(req.Enterprise, strSQL)
   .then( async (result)=>{
    var Dataset = []
    //取得產品結構中用到相同Material color Swatch的部位
    await result.recordsets[0].forEach((item)=>{
      var Part = [];      
      result.recordsets[1].forEach((obj)=>{       
        if(item.Material_ColorID == obj.Material_ColorID) {
          Part.push(obj.Component);
        }
      })
      Dataset.push({'Material':item.Material, 'Part':Part});
    })
     //console.log('Dataset:',Dataset)
     await res.send(Dataset);
   }).catch((err)=>{
     console.log(err);
     res.status(500).send(err);
   }) 

});


//取得Structure Color Swatch Label
router.post('/Structure_Color_Swatch_Label',  function (req, res, next) {
  console.log("Call Structure_Color_Swatch_Label Api:",req.body);

  req.body.Product_No = req.body.Product_No ? `'${req.body.Product_No.trim().substring(0,20).replace(/'/g, '')}'` : ``;   

  var strSQL = format(`Declare @Product_No varchar(20) = {Product_No};
  Select p.[Material_ColorID], isnull(p.[Material_Category],'') + ' ' + isnull(p.[Material_Specific],'') as [Material]
  , p.[Material_Color]
  , p.SupplierID
   FROM Product_Structure as p WITH (NoWait, Nolock)
 Inner Join Material_Color mc WITH (NoWait, Nolock) on p.Material_ColorID = mc.Material_ColorID
 Where Product_No = @Product_No And ABS(isnull(mc.Swatch,0)) = 1
 Group by p.[Material_ColorID], isnull(p.[Material_Category],'') + ' ' + isnull(p.[Material_Specific],''), p.[Material_Color], p.SupplierID 
 union
 Select mc.[Material_ColorID], isnull(m.[Material_Category],'') + ' ' + isnull(md.[Material_Specific],'') as [Material]
 , mc.[Material_Color]
 , mc.SupplierID
 From Material_Composite MCS
 Inner Join Material_Color mc on mc.Material_ColorID = MCS.Detail_ColorID And ABS(isnull(mc.Swatch,0)) = 1
 Inner Join Material_Detail md on md.Material_DetailID = mc.Material_DetailID
 Inner Join Material m on m.MaterialID = md.MaterialID
 Where MCS.Master_ColorID in 
 (
   Select distinct p.[Material_ColorID]
     FROM Product_Structure as p WITH (NoWait, Nolock)
   Inner Join Material_Color mc WITH (NoWait, Nolock) on p.Material_ColorID = mc.Material_ColorID
   Where Product_No = @Product_No And ABS(isnull(mc.Composite,0)) = 1
 )
 Group by mc.[Material_ColorID], isnull(m.[Material_Category],'') + ' ' + isnull(md.[Material_Specific],''), mc.[Material_Color], mc.SupplierID
 Order by SupplierID, [Material], [Material_Color];

Select  p.[ComponentID], pc.Component ,isnull([C_Rmk],'') as C_Rmk ,p.[Material_ColorID]
FROM Product_Structure as p WITH (NoWait, Nolock)
Inner Join Material_Color mc WITH (NoWait, Nolock) on p.Material_ColorID = mc.Material_ColorID
Inner Join Product_Component pc WITH (NoWait, Nolock) on p.ComponentID = pc.ComponentID
Where Product_No = @Product_No And ABS(isnull(mc.Swatch,0)) = 1
Group by p.[ComponentID], pc.Component ,[C_Rmk] ,p.[Material_ColorID]
union
Select p.[ComponentID], pc.Component ,[C_Rmk] ,MCS.[Detail_ColorID] as [Material_ColorID]
From Product_Structure as p WITH (NoWait, Nolock)
Inner Join Product_Component pc WITH (NoWait, Nolock) on p.ComponentID = pc.ComponentID
Inner Join Material_Composite MCS on MCS.Master_ColorID = p.Material_ColorID
Inner Join Material_Color mc on mc.Material_ColorID = MCS.Detail_ColorID And ABS(isnull(mc.Swatch,0)) = 1
Inner Join (
	Select distinct p.[Material_ColorID]
		FROM Product_Structure as p WITH (NoWait, Nolock)
	Inner Join Material_Color mc WITH (NoWait, Nolock) on p.Material_ColorID = mc.Material_ColorID
	Where Product_No = @Product_No And ABS(isnull(mc.Composite,0)) = 1
 ) tmp on tmp.[Material_ColorID] = MCS.Master_ColorID
Group by p.[ComponentID], pc.Component ,[C_Rmk] ,MCS.[Detail_ColorID]
Order by [Material_ColorID], p.[ComponentID];  
`, req.body) ;
  //console.log(strSQL)
  db.sql(req.SiteDB, strSQL)
     .then((result) => {
        var DataSet = {Report_Info: result.recordsets[0]
        };
/*
        DataSet.Report_Info = [...result.recordsets[0].reduce((r, e) => {
          let k = `${e.Material_ColorID}`;
          if (!r.has(k)) {
            // console.log(r)
            r.set(k, { Material_ColorID: e.Material_ColorID,
              Material: e.Material,
              Material_Color: e.Material_Color,
              ComponentID: e.ComponentID,
              Component: e.Component,
              SupplierID: e.SupplierID
            })
          } else {
          }
          return r;
        }, new Map).values()]
  */      
        DataSet.Report_Info.forEach((item)=>{
          item.Component = (result.recordsets[1].filter((obj)=>(item.Material_ColorID == obj.Material_ColorID))).map((obj)=>(obj.Component)).toString()
       })
        
        res.send(DataSet);
     }).catch((err) => {
        console.log(err);
        res.status(500).send(err);
     })

});


//取得Product_Cutting_Die
router.get('/Product_Structure_Cutting_Die/:Product_No/:Lang', function (req, res, next) {
  console.log("Call Product_Structure_Cutting_Die Api Product_No:", req.params.Product_No);
  
  var strSQL = format(`Select row_number() over(Order by p.[ComponentID]) as SortID
  , p.[ComponentID]
  , pc.Component + ' ' + isnull(p.C_Rmk,'') as Component
  , ${req.params.Lang == 'cht' ? 'pc.L2_Component':'pc.L3_Component'} + ' ' + isnull(p.C_Rmk,'') as L2_Component
   FROM Product_Structure as p WITH (NoWait, Nolock)
Inner Join Product_Component pc WITH (NoWait, Nolock) on p.ComponentID = pc.ComponentID 
 Where Product_No = '{Product_No}' --And Paper_Pattern = 1
 AND (pc.Component_GroupID <> '04')
 Group by p.[ComponentID], pc.Component + ' ' + isnull(p.C_Rmk,'') , ${req.params.Lang == 'cht' ? 'pc.L2_Component':'pc.L3_Component'} + ' ' + isnull(p.C_Rmk,'');
   `, req.params);
   
  //console.log(strSQL);

   db.sql(req.Enterprise, strSQL)
   .then((result)=>{
     //console.log('Dataset:',result.recordset)
     res.send(result.recordset);
   }).catch((err)=>{
     console.log(err);
     res.status(500).send(err);
   }) 

});


//檢查產品結構材料是否齊全
router.post('/ChkCompleted', function (req, res, next) {
  console.log("Call ChkCompleted Api Product_No:", req.body.Product_No);
  
  var strSQL = format(` Declare @Break_count bit, @Structure_Completed bit = convert(bit,'{2}');
  SELECT @Break_count = convert(bit, (case when count(1) > 0 then 0 else 1 end) )
  FROM Product_Structure ps with(NoLock, NoWait)
  LEFT JOIN Material_Color mc with(NoLock, NoWait) ON ps.Material_ColorID = mc.Material_ColorID 
  LEFT JOIN Product_Component pc with(NoLock, NoWait) ON ps.ComponentID = pc.ComponentID 
  LEFT JOIN Material_Detail md with(NoLock, NoWait) ON mc.Material_DetailID = md.Material_DetailID 
  LEFT JOIN Material m  with(NoLock, NoWait) ON md.MaterialID = m.MaterialID 
  WHERE
  (ps.Product_No = '{0}')
  and ( ps.Material_DetailID <> mc.[Material_DetailID] 
  OR ps.ComponentID is null
  OR ps.MaterialID <> md.[MaterialID] 
  OR mc.Material_ColorID Is Null 
  OR (ps.[Material_Category] + ' ' + Rtrim(LTRIM(ps.[Material_Specific])) + ' ' + Rtrim(LTRIM(ps.[Material_Color])) + ' ' + ps.[UNIT] <> m.[Material_Category] + ' ' + Rtrim(LTRIM(md.[Material_Specific])) + ' ' + Rtrim(LTRIM(mc.[Material_Color])) + ' ' + m.[UNIT])
  OR ps.SupplierID Is Null );

  Update Product Set Structure_Completed = case when @Structure_Completed = 1 then GetDate() else null end
  , Structure_Maker = isnull(Structure_Maker,'{1}') 
  , Structure_Updater = '{1}'
  , Structure_Update = Getdate()
  Where Product_No = '{0}'
  And (
    case when @Structure_Completed = 1 then
     @Break_count
    else
     convert(bit,1)
    End
  ) = 1
  And (case when len(Structure_Completed) > 0 then 1 else 0 end ) <> @Structure_Completed;

  Select case when @@ROWCOUNT > 0 then 1 else 0 end as Break_count
  , case when isnull(p.Structure_Completed,'') = '' then '' else convert(varchar(20),p.Structure_Completed,120) end as Structure_Completed 
  , isnull(p.Structure_Approver,'') as Structure_Approver
  , case when isnull(p.Structure_Approve,'') = '' then '' else convert(varchar(20),p.Structure_Approve,120) end as Structure_Approve
  From Product p with(NoLock,NoWait) 
  Where p.Product_No = '{0}'  
   `, req.body.Product_No, req.UserID, req.body.Structure_Completed);
   
  //console.log(strSQL);

   db.sql(req.Enterprise, strSQL)
   .then((result)=>{
     //console.log('Dataset:',result.recordset)
     res.send(result.recordset[0]);
   }).catch((err)=>{
     console.log(err);
     res.status(500).send(err);
   }) 

});


//檢查產品結構是否完成
router.post('/ChkApprove', function (req, res, next) {
  console.log("Call ChkApprove Api Product_No:", req.body.Product_No);
  
  var strSQL = format(` Declare @Break_count bit, @Structure_Approve bit = convert(bit,'{2}');
  Update Product Set Structure_Approver = case when @Structure_Approve = 1 then '{1}' else null end
  , Structure_Approve = case when @Structure_Approve = 1 then GetDate() else null end
  , Structure_Maker = isnull(Structure_Maker,'{1}') 
  , Structure_Updater = '{1}'
  , Structure_Update = Getdate()
  Where Product_No = '{0}'
  And (case when len(Structure_Approver) > 0 then 1 else 0 end ) <> @Structure_Approve;

  Select case when (case when len(Structure_Approver) > 0 then 1 else 0 end ) = @Structure_Approve  then 1 else 0 end as Break_count
  , case when isnull(p.Structure_Completed,'') = '' then '' else convert(varchar(20),p.Structure_Completed,120) end as Structure_Completed 
  , isnull(p.Structure_Approver,'') as Structure_Approver
  , case when isnull(p.Structure_Approve,'') = '' then '' else convert(varchar(20),p.Structure_Approve,120) end as Structure_Approve
  From Product p with(NoLock,NoWait) 
  Where p.Product_No = '{0}'

  `, req.body.Product_No, req.UserID, req.body.Structure_Approve);
   
  //console.log(strSQL);

   db.sql(req.Enterprise, strSQL)
   .then((result)=>{
     //console.log('Dataset:',result.recordset)
     res.send(result.recordset[0]);
   }).catch((err)=>{
     console.log(err);
     res.status(500).send(err);
   }) 

});


const strSQL_Structure_Component_Workshop = ` SELECT Product_Structure.StructureID
, Product_Structure.ComponentID
, Product_Component.Component + case when Len(Product_Structure.C_Rmk) > 0 then '(' + Product_Structure.C_Rmk + ')' else '' end AS Component
, Product_Structure.Memo
, dbo.Product_Component_Photo.Photo_Month
, CONVERT(varchar(30), dbo.Product_Component_Photo.Component_PhotoID) AS Component_PhotoID
FROM ((Product_Component INNER JOIN Product_Structure ON Product_Component.ComponentID = Product_Structure.ComponentID) LEFT JOIN Product_Component_Photo ON Product_Structure.Component_PhotoID = Product_Component_Photo.Component_PhotoID) LEFT JOIN (SELECT Product_Process.Product_No, Style_Workshop.ComponentID, Product_Process.Component_PhotoID
FROM Product_Process INNER JOIN Style_Workshop ON Product_Process.Style_ProcessID = Style_Workshop.Style_ProcessID
 ) AS Product_Process1 ON (Product_Structure.Component_PhotoID = Product_Process1.Component_PhotoID) AND (Product_Structure.ComponentID = Product_Process1.ComponentID) AND (Product_Structure.Product_No = Product_Process1.Product_No)
WHERE (Product_Structure.Product_No='{Product_No}') AND (Product_Process1.Product_No Is Null) AND (Product_Structure.Memo Is Not Null)
ORDER BY Product_Structure.Product_No, Product_Structure.StructureID, Product_Structure.ComponentID;
`;

//取得舊有產品結構的部位加工圖
router.post('/Structure_Component_Workshop', function (req, res, next) {
  console.log("Call Component_Workshop Api Product_No:", req.body.Product_No);
  
  var strSQL = format(strSQL_Structure_Component_Workshop, req.body);
  //console.log(strSQL);

   db.sql(req.Enterprise, strSQL)
   .then((result)=>{
     //console.log('Dataset:',result.recordset)
     res.send(result.recordset);
   }).catch((err)=>{
     console.log(err);
     res.status(500).send(err);
   }) 

});


//取得舊有產品結構的部位加工圖
router.post('/Remove_Component_Workshop', function (req, res, next) {
  console.log("Call Remove_Component_Workshop Api Product_No:", req.body.Product_No);
  
  var strSQL = format(` Update Product_Structure set Memo = null, Component_PhotoID = null Where StructureID = {StructureID};
  
  Select case when @@ROWCOUNT > 0 then 1 else 0 end as Update_Flag
  
  ${strSQL_Structure_Component_Workshop}

  `, req.body );
   
  //console.log(strSQL);

   db.sql(req.Enterprise, strSQL)
   .then((result)=>{
     res.send(result.recordsets);
   }).catch((err)=>{
     console.log(err);
     res.status(500).send(err);
   }) 

});




function MKDir(path) {
  return new Promise((resolve, reject) => {
    smb2.exists(path, function (err, exists) {
      if (err) reject(err);
      if (!exists) {
        smb2.mkdir(path, (err) => {
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
}

function imgWriteFile(size, src, dest) {
  return new Promise(function (resolve, reject) {
    console.log(size, src, dest)
    sharp(src).resize(size, size, {
      fit: sharp.fit.inside, withoutEnlargement: true // 若原圖尺寸沒超過設定的大小，則不壓縮
    }).jpeg( {quality: 85} ).toBuffer().then(mBuffer => {
      smb2.writeFile(dest, mBuffer, { flags: 'w' }, function (err) {
        if (err) {
          reject(err);
        } else {
          console.log(format("{0} 儲存成功", dest));
          resolve(format("{0} 儲存成功", dest));
        }
      });
    });
  })
}


//儲存Product component 資料與圖檔
router.post('/UpLoad_CKEditor_Photo', function (req, res, next) {
  console.log("Call UpLoad_CKEditor_Photo API")
  //console.log(req)
  var form = new formidable.IncomingForm();
  var Photo_Month = `${moment().format('YYMM')}`;
  var FileName = `${moment().format('x')}.jpg`
  var Photo_Path = `Uploads\\${Photo_Month}\\${FileName}`
  var status = {uploaded:0,url:`/Datas/Uploads/${Photo_Month}/${FileName}`, msg:''}

  form.parse(req, function(err, fields, files){
    //console.log(files)
    var file = files.upload
    if(err){
      console.log(err);
      status.msg=err;
      status.uploaded=0; 
      smb2.disconnect();
      res.status(500).send(status);
    } else {      
        //console.log(file)

          runit(file.path)          
          //res.send(status);
         async function runit(file) {
    
          try {
            if(file.length > 0) {
              await MKDir(`Uploads\\${Photo_Month}`);
              await imgWriteFile(1920, file, Photo_Path);    
              status.uploaded=1;
              res.send(status);
            } else {
              console.log('files.length <= 0');            
              status.uploaded=0; 
              status.msg=`No File!`;
              res.status(503).send(status);  
              res.send(status);
            }
          } catch (error) {
            console.log(error)
            status.uploaded=0; 
            status.msg=`${error} Service Unavailable!`;
            smb2.disconnect();
            res.status(503).send(status);
          }
        }
    }
  });

  
});


//取得Product_Component
router.post('/Product_Component', function (req, res, next) {
  console.log("Call Product_Component Api:");
  
  var strSQL = format(` 
  Declare @Color Table(ID int IDENTITY(1,1), Color_No varchar(7))
  
  insert into @color (Color_No) values ('#EEB8B8');
  insert into @color (Color_No) values ('#909FA6');
  insert into @color (Color_No) values ('#A2B59F');
  insert into @color (Color_No) values ('#C9BA9B');
  insert into @color (Color_No) values ('#E3E2B4');
  insert into @color (Color_No) values ('#83B1C9');
  insert into @color (Color_No) values ('#BFC8D7');

  
  SELECT TOP (1000) row_number() Over(Order By pcg.SortID, pc.Component_GroupID, pc.ComponentID) AS [RecNo]
  ,pc.[ComponentID]
  ,pc.[Product_Type]
  ,pc.[Component]
  ,pc.[L2_Component]
  ,pc.[Component] + ' ' + pc.[L2_Component] as ComponentLabel
  ,pc.[L3_Component]
  ,pc.[Component_GroupID]
  ,pcg.[Component_Group]
  ,convert(bit, pc.[Paper_Pattern]) as Paper_Pattern
  , c.Color_No
  , '' as Query
  , '' as Class
/*  
  , cast((case when (Select count(*) From Product_Structure p with(NoLock,NoWait) Where p.ComponentID = pc.ComponentID) > 0 or  
              (Select count(*) From Product_Technical_Sheet_Detail p with(NoLock,NoWait) Where p.ComponentID = pc.ComponentID) > 0
     then 0 else 1 end
  ) as bit) as Delete_Flag
*/
  , cast(0 as bit) as Delete_Flag
  FROM [dbo].[Product_Component] pc with(NoLock, NoWait)
  Inner Join [dbo].[Product_Component_Group] pcg with(NoLock, NoWait) on pc.[Component_GroupID] = pcg.[Component_GroupID] 
  Inner Join @Color c on c.ID = pcg.[Component_GroupID]
  Order by SortID, Component_GroupID, ComponentID 

  Select pcg.[Component_GroupID], pcg.[Component_Group], c.Color_No 
  From @Color c
  Inner Join [dbo].[Product_Component_Group] pcg with(NoLock, NoWait) on c.ID = pcg.[Component_GroupID] And (CHARINDEX('SHOES', pcg.Product_Type) > 0)
  Order by SortID
   `);
   
  //console.log(strSQL);

   db.sql(req.Enterprise, strSQL)
   .then( (result)=>{
      res.send(result.recordsets);
   }).catch((err)=>{
     console.log(err);
     res.status(500).send(err);
   }) 

});


//取得Product_Component_Group
router.post('/Product_Component_Group', function (req, res, next) {
  console.log("Call Product_Component_Group Api:");
  
  var strSQL = format(` 
    Select pcg.[Component_GroupID], pcg.[Component_Group]
      From [dbo].[Product_Component_Group] pcg with(NoLock, NoWait) 
    Where (CHARINDEX('SHOES', pcg.Product_Type) > 0)
    Order by SortID
   `);
   
  //console.log(strSQL);

   db.sql(req.Enterprise, strSQL)
   .then( (result)=>{
      res.send(result.recordsets);
   }).catch((err)=>{
     console.log(err);
     res.status(500).send(err);
   }) 

});


//儲存與新增Product_Component_Save
router.post('/Product_Component_Save', function (req, res, next) {
  console.log("Call Product_Component_Save Api:");
  
  var strSQL = format(` 
    Declare @Modal_Type int      =  ${req.body.Modal_Type},
      @ComponentID_old int       =  ${req.body.ComponentID_old},
      @ComponentID int           =  ${req.body.ComponentID},
      @Component_GroupID int     =  ${req.body.Component_GroupID},
      @Component Nvarchar(30)    = N'${req.body.Component}',
      @L2_Component Nvarchar(30) = N'${req.body.L2_Component}',
      @L3_Component Nvarchar(30) = N'${req.body.L3_Component}',
      @Paper_Pattern int         =  ${req.body.Paper_Pattern},
      @Flag int = 0

      if( @Modal_Type = 1 or (@Modal_Type = 0 and @ComponentID_old <> @ComponentID) )
      begin
        Select * from Product_Component Where ComponentID = @ComponentID
        if(@@ROWCOUNT > 0)
          goto End1
      End

      if( @Modal_Type = 0)
      Begin
        Update Product_Component set 
          ComponentID = @ComponentID,
          Component_GroupID = @Component_GroupID,
          Component = @Component,
          L2_Component = @L2_Component,
          L3_Component = @L3_Component,
          Paper_Pattern = @Paper_Pattern
        Where ComponentID = @ComponentID_old
      end
      else
      Begin
        insert Product_Component (ComponentID, Component_GroupID, Component, L2_Component, L3_Component, Paper_Pattern)
        Select @ComponentID as ComponentID, @Component_GroupID as Component_GroupID, @Component as Component, @L2_Component as L2_Component, @L3_Component as L3_Component, @Paper_Pattern as Paper_Pattern
      End

      Set @Flag = 1

      End1:
      Select case when @Flag = 1 then 'success' else 'fail' end as Flag
   `);
   
  //console.log(strSQL);

  //res.send({Flag:'success'});
   db.sql(req.Enterprise, strSQL)
   .then( (result)=>{
      res.send({Flag:result.recordset[0].Flag});
   }).catch((err)=>{
     console.log(err);
     res.status(500).send(err);
   }) 

});


//刪除Product_Component
router.delete('/Product_Component_Delete/:ComponentID', function (req, res, next) {
  console.log("Call Product_Component_Delete Api:");
  
  var strSQL = format(` Delete from Product_Component 
  Where ComponentID = {ComponentID} 
  and (Select count(*) From Product_Structure p with(NoLock,NoWait) Where p.ComponentID = {ComponentID}) = 0 
  and (Select count(*) From Product_Technical_Sheet_Detail p with(NoLock,NoWait) Where p.ComponentID = {ComponentID}) = 0

  Select case when @@ROWCOUNT > 0 then 'success' else 'fail' end as Flag
   `,req.params);
   
  // console.log(strSQL);

  res.send({Flag:'success'});
  //  db.sql(req.Enterprise, strSQL)
  //  .then( (result)=>{
  //     res.send({Flag:result.recordset[0].Flag});
  //  }).catch((err)=>{
  //    console.log(err);
  //    res.status(500).send(err);
  //  }) 

});

/* Mark-Wang API End */


/* Darren-Chang API Begin */

const detailSQL = `SELECT StructureID, Product_No, SortID, SortID as id, ps.Component_GroupID, ps.ComponentID, Component, C_Rmk,
(pc.Component + case when len(isnull(C_Rmk,'')) = 0 then '' else ' ('+ C_Rmk +')' end) as Component_Rmk, Master_Purchase_Item,
abs(Sub_Purchase_Item) as Sub_Purchase_Item, Master_StructureID, abs(Master_Purchase_DetailID) as Master_Purchase_DetailID, ps.MaterialID, ps.Material_DetailID,
ps.Material_ColorID, ps.Material_Category + ' ' + ps.Material_Specific as Material, ps.Material_Color, isnull(M_Rmk, '') as M_Rmk,
ps.Size_From, (SELECT Size_Name from Product_Size as pSize where ps.Size_From = pSize.SizeID) as Size_From_Name,
ps.Size_End, (SELECT Size_Name from Product_Size as pSize where ps.Size_End = pSize.SizeID) as Size_End_Name,
W_L, W_Q, L_L, L_Q, Qty, Net_Consist, Round(Net_Consist * Qty, 4) as Pair_Consist,
Round(ISNULL(1 / NULLIF(Net_Consist * Qty,0), 0), 2) as Prs_Unit, Lose, Memo, ps.Unit, ps.SupplierID, Round(Quot_Price, 4) as Quot_Price,
Round(mc.Unit_Price, 4) as mc_QP, Round(ps.Unit_Price, 4) as Unit_Price, Round(mc.Purchase_Price, 4) as mc_UP,
mc.Price_Approve, Part_No, Mian_part, ps.Component_PhotoID, ps.Currency, WorkshopID,
case when ps.ComponentID IS NOT NULL then 'true' else 'false' end as isComponentIDExist,
case when ps.SupplierID IS NOT NULL then 'true' else 'false' end as isSupplierIDExist,
case when (md.Material_DetailID IS NOT NULL or ps.Material_DetailID IS NULL) and (ps.[Material_Category] + ' ' + Rtrim(LTRIM(ps.[Material_Specific])) = m.[Material_Category] + ' ' + Rtrim(LTRIM(md.[Material_Specific]))) and (ps.Material_DetailID = mc.Material_DetailID)
then 'true' else 'false' end as isDetailIDExist,
case when (mc.Material_ColorID IS NOT NULL or ps.Material_ColorID IS NULL) and Rtrim(LTRIM(ps.[Material_Color])) = Rtrim(LTRIM(mc.[Material_Color]))
then 'true' else 'false' end as isColorIDExist,
case when ps.[UNIT] = m.[UNIT] then 'true' else 'false' end as isUnitMatch,
case when md.History_Date IS NOT NULL then 'true' else 'false' end as isDetailHistoried,
case when mc.History_Date IS NOT NULL then 'true' else 'false' end as isColorHistoried,
mc.Swatch, ISNULL(mc.Composite, 0) as Composite FROM Product_Structure as ps
LEFT JOIN Product_Component as pc with(NoLock, NoWait) ON ps.ComponentID = pc.ComponentID
LEFT JOIN Material_Color as mc with(NoLock, NoWait) ON ps.Material_ColorID = mc.Material_ColorID
LEFT JOIN Material_Detail as md with(NoLock, NoWait) ON ps.Material_DetailID = md.Material_DetailID
LEFT JOIN Material m with(NoLock, NoWait) ON md.MaterialID = m.MaterialID 
Where Product_No = '{Product_No}'
and (ps.Component_GroupID = {Component_GroupID} or ps.Component_GroupID IS NULL) Order By SortID 

Select tmp.[Material_CompositeID]
, tmp.[Master_ColorID]
, tmp.[Detail_ColorID]
, m.[MaterialID] as MaterialID
, '' as Component
, (m.Material_Category + ' ' + md.Material_Specific) as Material
, tmp.[Net_Consist]
, mc.Price_Approve
, mc.Swatch
, isnull(m.[Material_Category],'') as Material_Category 
, isnull(md.[Material_Specific],'') as Material_Specific
, isnull(mc.[Material_ColorID],'') as Material_ColorID
, isnull(mc.[Material_Color],'') as Material_Color 
, isnull(mc.[SupplierID],'') as SupplierID
, isnull(mc.[Currency],'') as Currency
, isnull(mc.[Unit_Price],'') as Quot_Price
, isnull(mc.[Purchase_Price],'') as Unit_Price
, isnull(m.[Unit],'') as Unit
, c.[Currency_Rate]
, case when mc.History_Date IS NOT NULL then 'true' else 'false' end as isColorHistoried
, isnull(mc.[Unit_Price],0) * c.[Currency_Rate] as Unit_Price_TWD
From (Select [Material_CompositeID], [Master_ColorID], [Detail_ColorID], [Net_Consist], row_number() Over(Order By SortID) AS [SortID] 
        from Material_Composite with(NoLock,NoWait)
        Where Master_ColorID in (
          Select ps.Material_ColorID
          From Product_Structure ps with(NoLock,NoWait)
          Inner Join Product_Component pc with(NoLock,NoWait) ON ps.ComponentID = pc.ComponentID
          Inner Join Material_Color mc with(NoLock,NoWait) ON ps.Material_ColorID = mc.Material_ColorID          
          Where ps.Product_No = '{Product_No}' and ISNULL(mc.Composite, 0) = 1
          and (ps.Component_GroupID = {Component_GroupID} or ps.Component_GroupID IS NULL)
        ) 
  ) tmp
  inner Join Material_Color mc with(NoLock, NoWait) on mc.Material_ColorID = tmp.[Detail_ColorID] --and ISNULL(mc.Composite, 0) = 1
  Inner Join Material_Detail md with(NoLock, NoWait) on md.Material_DetailID = mc.Material_DetailID
  Inner Join Material m with(NoLock, NoWait) on m.MaterialID = md.MaterialID
  Left Outer Join [dbo].[@Currency_Rate] c on c.Currency = mc.Currency And c.Exchange_Date = convert(Date,GetDate())
Order by [SortID];

`

// 取得 Product_Structure 的所有資料（限定 Product_No 及 Component_GroupID）
router.get('/Product_Structure_Detail/:Product_No/:Component_GroupID', function (req, res, next) {
  console.log("Call Product_Structure_Detail API", req.params)

  var strSQL = format(detailSQL, req.params)

  // console.log(strSQL)
  db.sql(req.Enterprise, strSQL)
  .then((result)=>{        
    var DataSet = result.recordsets[0];
    var DataSet1 = result.recordsets[1];
    DataSet.forEach((data,idx,aaray)=>{      
      if(data.Composite === 1){
        data['children'] = []
        DataSet1.forEach((item,idx,aaray)=>{
          if(data.Material_ColorID === item.Master_ColorID){
            let tempObj = Object.assign({}, item);
            tempObj.Net_Consist = tempObj.Net_Consist * data.Net_Consist
            tempObj.Pair_Consist = parseFloat(tempObj.Net_Consist * data.Qty)
            tempObj.Prs_Unit = parseFloat(1 / (tempObj.Net_Consist * data.Qty))
            data['children'].push(tempObj);
            if (item.isColorHistoried === 'true') {
              data.isColorHistoried = 'true'
            }
            //console.log('DataSet=',data['children']);
          }
        })
      }
    });
    // console.log('DataSet=',DataSet);
    res.send(DataSet);
  }).catch((err)=>{
    console.log(err);
    res.status(500).send(err);
  })

});

// 取得 Product_No 的 Sample_Size 與 Size_Fit 資料
router.get('/Sample_Size/:Product_No', function (req, res, next) {
  console.log("Call Product_Structure_Detail_Sample_Size Api Product_No:",req.params.Product_No);

  var strSQL = format(`Select s.Style_No, p.Product_No, s.Sample_Size
    From Product as p WITH (NoWait, Nolock) 
    Inner Join Style as s WITH (NoLock, NoWait) on p.Style_No = s.Style_No
    Where Product_No = '{Product_No}';
    
    Select SizeID, Size_Name From Product_Size Order by SizeID`, req.params)

  // console.log(strSQL)

  db.sql(req.Enterprise, strSQL)
  .then((result)=>{
    // console.log(result.recordsets)
    res.send(result.recordsets);
  }).catch((err)=>{
    console.log(err);
    res.status(500).send(err);
  })

});

// 更新 Product_Structure 內指定 Product_No 的 Component_GroupID/SortID 資料
router.post('/Product_Structure_Detail_RefreshID/:Product_No/:Component_GroupID', function (req, res, next) {
  console.log("Call Product_Structure_Detail_RefreshID Api Product_No:",req.params.Product_No);

  var strSQL = format(`Update Product_Structure set Component_GroupID = tmp.Component_GroupID
    From Product_Structure as ps
    Inner Join 
    (Select ComponentID, Component_GroupID
    From Product_Component as p with(NoLock, NoWait)) as tmp 
    On tmp.ComponentID = ps.ComponentID
    Where Product_No = '{Product_No}';
    
    Update Product_Structure set SortID = tmp.SortID
    From Product_Structure as ps
    Inner Join 
    (Select row_number() over(Partition by Component_GroupID Order by ComponentID, C_Rmk) as SortID, StructureID
    From Product_Structure as p With(NoLock, NoWait)
    Where Product_No = '{Product_No}') as tmp 
    on tmp.StructureID = ps.StructureID;
    
    `, req.params)
    strSQL += format(Update_SQL, req.params.Product_No, req.UserID);
    strSQL += format(detailSQL, req.params)   

  
  // console.log(strSQL)

  db.sql(req.Enterprise, strSQL)
  .then((result)=>{
    var DataSet = result.recordsets[0];
    var DataSet1 = result.recordsets[1];
    DataSet.forEach((data,idx,aaray)=>{      
      if(data.Composite === 1){
        data['children'] = []
        DataSet1.forEach((item,idx,aaray)=>{            
          if(data.Material_ColorID === item.Master_ColorID){
            let tempObj = Object.assign({}, item);
            tempObj.Net_Consist = tempObj.Net_Consist * data.Net_Consist
            tempObj.Pair_Consist = parseFloat(tempObj.Net_Consist * data.Qty)
            tempObj.Prs_Unit = parseFloat(1 / (tempObj.Net_Consist * data.Qty))
            data['children'].push(tempObj);
            if (item.isColorHistoried === 'true') {
              data.isColorHistoried = 'true'
            }
            //console.log('DataSet=',data['children']);
          }
        })
      }
    });
    // console.log('DataSet=',DataSet);
    res.send(DataSet);
  }).catch((err)=>{
    console.log(err);
    res.status(500).send(err);
  })
});

// 校正 Product_Structure 內的 Price
router.post('/Product_Structure_Detail_RefreshPrice/:Product_No/:Component_GroupID', function (req, res, next) {
  console.log("Call Product_Structure_Detail_RefreshPrice Api Product_No:",req.params.Product_No);

  var strSQL = format(`UPDATE Product_Structure SET Unit_Price = tmp.Purchase_Price, Quot_Price = tmp.Unit_Price
    From Product_Structure as ps
    Inner Join 
    (Select Material_ColorID, Purchase_Price, Unit_Price
    From Material_Color as mc With(NoLock, NoWait)) as tmp 
    On ps.Material_ColorID = tmp.Material_ColorID
    WHERE Product_No = '{Product_No}'; `, req.params)

  strSQL += format(Update_SQL, req.params.Product_No, req.UserID);
  strSQL += format(detailSQL, req.params)   

  // console.log(strSQL)

  db.sql(req.Enterprise, strSQL)
  .then((result)=>{
    var DataSet = result.recordsets[0];
    var DataSet1 = result.recordsets[1];
    DataSet.forEach((data,idx,aaray)=>{      
      if(data.Composite === 1){
        data['children'] = []
        DataSet1.forEach((item,idx,aaray)=>{            
          if(data.Material_ColorID === item.Master_ColorID){
            let tempObj = Object.assign({}, item);
            tempObj.Net_Consist = tempObj.Net_Consist * data.Net_Consist
            tempObj.Pair_Consist = parseFloat(tempObj.Net_Consist * data.Qty)
            tempObj.Prs_Unit = parseFloat(1 / (tempObj.Net_Consist * data.Qty))
            data['children'].push(tempObj);
            if (item.isColorHistoried === 'true') {
              data.isColorHistoried = 'true'
            }
            //console.log('DataSet=',data['children']);
          }
        })
      }
    });
    // console.log('DataSet=',DataSet);
    res.send(DataSet);
  }).catch((err)=>{
    console.log(err);
    res.status(500).send(err);
  })
});

//Save Product_Structure Component
router.post('/Product_Structure_Detail/SaveData',  function (req, res, next) {
  console.log("Call Product_Structure SaveData Api Product_No:",req.body.condition.Product_No);
  // console.log('req.body:\n',req.body);

  var BaseData = [];
  req.body.condition.Material = req.body.condition.Material ? req.body.condition.Material.replace(/'/g, "''") : ''
  var Product_No = req.body.condition.Product_No
  var Component_GroupID = req.body.condition.Component_GroupID
  var MaterialID = req.body.Material.MaterialID
  var Material_DetailID = req.body.MDetail.Material_DetailID
  var Material_ColorID = req.body.MColor.Material_ColorID
  var Material_Category = req.body.Material.Material_Category.replace(/'/g, "''")
  var Material_Specific = req.body.MDetail.Material_Specific.replace(/'/g, "''")
  var Material_Color = req.body.MColor.Material_Color.replace(/'/g, "''")
  var SupplierID = req.body.MColor.SupplierID
  var Unit = req.body.Material.Unit
  var Currency = req.body.MColor.Currency
  var Purchase_Price = req.body.MColor.Purchase_Price
  var Unit_Price = req.body.MColor.Unit_Price

  var strSQL = format(`
  Select StructureID, ComponentID, C_Rmk 
  From Product_Structure as p with(NoLock, NoWait)
  where Product_No = '{Product_No}' 
  And Material_Category + ' ' + Material_Specific = N'{Material}' 
  And Component_GroupID = {Component_GroupID} ` , req.body.condition);
  // console.log(strSQL)

  if (!req.body.isMultiEdit && !req.body.isMaterialEdit) { // 選擇器是白底時 (Single Edit)
    strSQL += `And StructureID = ${req.body.condition.StructureID};`
  } else { // 其餘複選操作時
    strSQL += `;`
  }
  // console.log(`BaseData:${strSQL}`);
    
  db.sql(req.Enterprise, strSQL)
   .then((result)=>{
      var Resort = 0;
      BaseData = result.recordset;               
      var deleteArray = [];
      var updateArray = [];
      if (req.body.isMultiEdit && !req.body.isMaterialEdit) {
         BaseData.forEach((Data)=>{
            var flag = 0 // flag 0:代表使用者已經於介面上將Component刪除   1:代表需更新的Component
            req.body.Technical_Sheet_Detail.forEach((item)=>{
               if(Data.StructureID == item.StructureID){
                  flag = 1;
                  item.C_Rmk = item.C_Rmk ? item.C_Rmk:'';
                  updateArray.push(item);
               }
            });
            if(flag == 0){
               deleteArray.push(Data.StructureID);
            }                     
         });
      }
      var idx = 0;
      strSQL = 'Declare @ROWCOUNT int = 0, @ROWCOUNT1 int = 0; \r\n ';
      
      req.body.Technical_Sheet_Detail.forEach((item,index)=>{
        if(!item.StructureID){
          strSQL += idx == 0 ? `Insert Product_Structure (SortID, Product_No, Component_GroupID, ComponentID, C_Rmk, 
            MaterialID, Material_DetailID, Material_ColorID, Material_Category, Material_Specific, Material_Color, Unit, SupplierID, 
            Currency, Quot_Price, Unit_Price, Qty, Net_Consist, Lose)`:'union all';
          strSQL += `
          select (Select isnull(Max(SortID),0) + ${++idx} From Product_Structure Where Product_No='${Product_No}' 
          And Component_GroupID = ${Component_GroupID}) as SortID
          , '${Product_No}' as Product_No
          , ${Component_GroupID} as Component_GroupID
          , ${item.ComponentID} as ComponentID
          , N'${item.C_Rmk}' as C_Rmk
          ,  ${MaterialID} as MaterialID
          ,  ${Material_DetailID} as Material_DetailID
          ,  ${Material_ColorID} as Material_ColorID
          ,  N'${Material_Category}' as Material_Category
          ,  N'${Material_Specific}' as Material_Specific
          ,  N'${Material_Color}' as Material_Color
          ,  '${Unit}' as Unit
          ,  N'${SupplierID}' as SupplierID
          ,  '${Currency}' as Currency
          ,  ${Unit_Price} as Quot_Price
          ,  ${Purchase_Price} as Unit_Price 
          , 1 as Qty, 0 as Net_Consist, 0 as Lose
              `;   
          Resort = 1;
        }
        if(req.body.Technical_Sheet_Detail.length-1 == index)
          strSQL += '; \r\n'; 
      });

      strSQL += ' Set @ROWCOUNT = @@ROWCOUNT;  \r\n'
      //處理使用者刪除的Component
      if(deleteArray.length>0){
        Resort = 1;               
        strSQL += `delete from Product_Structure where StructureID in (${deleteArray}); \r\n`
      }
      //處理Component C_Mrk與材料更新
      if (req.body.isMultiEdit && !req.body.isMaterialEdit) {
        updateArray.forEach((item)=>{ // 多選編輯狀態
          strSQL += `
            update Product_Structure set 
            MaterialID = ${MaterialID},
            Material_DetailID = ${Material_DetailID}, 
            Material_ColorID = ${Material_ColorID},                                                 
            Material_Category = N'${Material_Category}', 
            Material_Specific = N'${Material_Specific}', 
            Material_Color = N'${Material_Color}',
            Unit = '${Unit}',
            SupplierID = N'${SupplierID}',
            C_Rmk = '${item.C_Rmk}',
            Currency = '${Currency}',
            Quot_Price = ${Unit_Price},
            Unit_Price = ${Purchase_Price}
            where StructureID = ${item.StructureID} ;  \r\n`;    
        })
      } else if (req.body.isMultiEdit && req.body.isMaterialEdit) { // 只編輯 Material Color/Size 的狀態
        strSQL += `
          update Product_Structure set 
          MaterialID = ${MaterialID},
          Material_DetailID = ${Material_DetailID}, 
          Material_ColorID = ${Material_ColorID},                                                 
          Material_Category = N'${Material_Category}', 
          Material_Specific = N'${Material_Specific}', 
          Material_Color = N'${Material_Color}',
          Unit = '${Unit}',
          SupplierID = N'${SupplierID}',
          Currency = '${Currency}',
          Quot_Price = ${Unit_Price},
          Unit_Price = ${Purchase_Price}
          where Product_No = '${req.body.condition.Product_No}' And Material_Category + ' ' + Material_Specific = N'${req.body.condition.Material}' 
          And Component_GroupID = ${Component_GroupID};   \r\n`;    
      } else { // 單一編輯狀態（加入 Update Component 相關資料）
        var ComponentID = req.body.Technical_Sheet_Detail[0].ComponentID ;
        var C_Rmk = req.body.Technical_Sheet_Detail[0].C_Rmk ;
        C_Rmk = C_Rmk ? C_Rmk:'';
        strSQL += `
            update Product_Structure set
            MaterialID = ${MaterialID},
            Material_DetailID = ${Material_DetailID}, 
            Material_ColorID = ${Material_ColorID}, 
            Material_Category = N'${Material_Category}', 
            Material_Specific = N'${Material_Specific}', 
            Material_Color = N'${Material_Color}',
            Unit = '${Unit}',
            SupplierID = N'${SupplierID}',
            ComponentID = ${ComponentID},
            C_Rmk = N'${C_Rmk}',
            Currency = '${Currency}',
            Quot_Price = ${Unit_Price},
            Unit_Price = ${Purchase_Price}
            where StructureID = ${req.body.condition.StructureID} ;  \r\n`
      }
      strSQL += ` Set @ROWCOUNT1 = @@ROWCOUNT; 

      Update Material_Color Set Date = GetDate() 
      Where (Material_ColorID = ${Material_ColorID}
      or Material_ColorID in (
         Select mcp.Detail_ColorID 
         From Material_Composite mcp 
         where mcp.Master_ColorID = ${Material_ColorID} ))
      And (@ROWCOUNT + @ROWCOUNT1) > 0;  \r\n `

      strSQL += ` Update Product set Structure_Maker = isnull(Structure_Maker,'${req.UserID}') , Structure_Updater = '${req.UserID}', Structure_Update = Getdate()
      Where Product_No = '${Product_No}' \r\n `

      //重整此component Group ID的SortID
      if(Resort){
        strSQL += `Update Product_Structure set SortID = tmp.SortID
        From Product_Structure as ps
        Inner Join 
        (Select row_number() over(Order by SortID) as SortID, StructureID
        From Product_Structure as p With(NoLock, NoWait)
        Where Product_No = '${Product_No}' And Component_GroupID = ${Component_GroupID}) as tmp 
        on tmp.StructureID = ps.StructureID;`
      }
      // console.log('--------------------------------------------------');  
      // console.log(strSQL);
      // console.log('--------------------------------------------------');  

      db.sql(req.Enterprise, strSQL)
      .then((result)=>{
        res.send('success');
      }).catch((err)=>{
        console.log(err);
        res.status(500).send(err);
      })

  }).catch((err)=>{
    console.log(err);
    res.status(500).send(err);
  })
});

//Update Product_Structure SizeFit
router.post('/Product_Structure_Detail_SizeFit/:Product_No',  function (req, res, next) {
  console.log("Call Product_Structure SizeFit Api Product_No:", req.params.Product_No, '\n', req.body);

  req.body.Product_No = req.params.Product_No
  var strSQL = format(`Update Product_Structure set Size_From = {Size_From}, Size_End = {Size_End}
  Where Product_No = '{Product_No}' And StructureID = {StructureID}`, req.body) ;   

  strSQL += format(Update_SQL, req.body.Product_No, req.UserID);
  
  // console.log(strSQL);  

  db.sql(req.Enterprise, strSQL)
  .then((result)=>{
    res.send('success');
  }).catch((err)=>{
    console.log(err);
    res.status(500).send(err);
  })
});

//Update Product_Structure Qty/Net_Consist
router.post('/Product_Structure_Detail_Qty/:Product_No',  function (req, res, next) {
  console.log("Call Product_Structure Qty Api Product_No:", req.params.Product_No, '\n', req.body);

  req.body.Product_No = req.params.Product_No
  var strSQL = format(`Update Product_Structure set Qty = {Qty}, Net_Consist = isNull({Net_Consist}, 0)
  Where Product_No = '{Product_No}' And StructureID = {StructureID}`, req.body) ;   

  strSQL += format(Update_SQL, req.body.Product_No, req.UserID);

  // console.log(strSQL);  

  db.sql(req.Enterprise, strSQL)
  .then((result)=>{
    res.send('success');
  }).catch((err)=>{
    console.log(err);
    res.status(500).send(err);
  })
});

//Update Product_Structure Lose
router.post('/Product_Structure_Detail_Lose/:Product_No',  function (req, res, next) {
  console.log("Call Product_Structure Lose Api Product_No:", req.params.Product_No, '\n', req.body);

  req.body.Product_No = req.params.Product_No
  var strSQL = format(`Update Product_Structure set Lose = {Lose}
  Where Product_No = '{Product_No}' And StructureID = {StructureID}`, req.body) ;   

  strSQL += format(Update_SQL, req.body.Product_No, req.UserID);

  // console.log(strSQL);  

  db.sql(req.Enterprise, strSQL)
  .then((result)=>{
    res.send('success');
  }).catch((err)=>{
    console.log(err);
    res.status(500).send(err);
  })
});

//Get Product_Structure's Component
router.post('/Product_Structure_Detail/Component_Detail',  function (req, res, next) {
  console.log("Call Product_Structure_Detail/Component_Detail Api Product_No:");

  req.body.Material = req.body.Material ? req.body.Material.replace(/'/g,"''") :'';
  var strSQL = format(`
  Select StructureID, ps.ComponentID, pc.Component, C_Rmk 
  From Product_Structure as ps with(NoLock, NoWait)
  LEFT JOIN Product_Component as pc
  ON ps.ComponentID = pc.ComponentID
  where Product_No = '{Product_No}' 
  And Material_Category + ' ' + Material_Specific = N'{Material}' 
  And ps.Component_GroupID = {Component_GroupID} ` , req.body) ;   
  // console.log(strSQL);  

  db.sql(req.Enterprise, strSQL)
  .then((result)=>{
     res.send(result.recordset);
  }).catch((err)=>{
     console.log(err);
     res.status(500).send(err);
  })
});

// 刪除指定的 Product_Structure_Detail_ID
router.post('/Product_Structure_Detail/:Product_No/:Component_GroupID/dataDelete', function (req, res, next) {
  console.log(`Call Product_Structure_Detail dataDelete API Product_No:`, req.params.Product_No)
  req.body.Product_No = req.params.Product_No
  req.body.Component_GroupID = req.params.Component_GroupID
  // req.body.UserID = req.UserID

  var strSQL = format(`DELETE FROM Product_Structure
  WHERE (StructureID = '{StructureID}') AND (Product_No = '{Product_No}'); \r\n `, req.body);
 
  strSQL += format(`Update Product_Structure set SortID = tmp.SortID
  From Product_Structure as ps
  Inner Join 
  (Select row_number() over(Order by SortID) as SortID, StructureID
  From Product_Structure as p With(NoLock, NoWait)
  Where Product_No = '{Product_No}' And Component_GroupID = {Component_GroupID}) as tmp 
  on tmp.StructureID = ps.StructureID;
`, req.params);
  
  strSQL += format(Update_SQL, req.body.Product_No, req.UserID);
  strSQL += format(detailSQL, req.params);  
  // console.log(strSQL)

  db.sql(req.Enterprise, strSQL)
  .then((result)=>{ 
    var DataSet = result.recordsets[0];
    var DataSet1 = result.recordsets[1];
    DataSet.forEach((data,idx,aaray)=>{      
      if(data.Composite === 1){
        data['children'] = []
        DataSet1.forEach((item,idx,aaray)=>{            
          if(data.Material_ColorID === item.Master_ColorID){
            let tempObj = Object.assign({}, item);
            tempObj.Net_Consist = tempObj.Net_Consist * data.Net_Consist
            tempObj.Pair_Consist = parseFloat(tempObj.Net_Consist * data.Qty)
            tempObj.Prs_Unit = parseFloat(1 / (tempObj.Net_Consist * data.Qty))
            data['children'].push(tempObj);
            if (item.isColorHistoried === 'true') {
              data.isColorHistoried = 'true'
            }
            //console.log('DataSet=',data['children']);
          }
        })
      }
    });
    // console.log('DataSet=',DataSet);
    res.send(DataSet);
  }).catch((err)=>{
    console.log(err);
    res.status(500).send(err);
  })
});

// 拖曳後的資料更新，只更新 SortID 排序
router.post('/Product_Structure_Detail/:Product_No/:Component_GroupID/dragUpdate', function (req, res, next) {
  console.log(`Call Product_Structure dragUpdate API Product_No:`, req.params.Product_No)
  req.body.Product_No = req.params.Product_No
  req.body.Component_GroupID = req.params.Component_GroupID == 0 ? 'IS NULL' : ` = ${req.params.Component_GroupID}`

  var strSQL = format(`UPDATE Product_Structure SET SortID = '{newSortID}'
                         WHERE (StructureID = '{StructureID}'); \r\n `, req.body);
  if (req.body.oldSortID > req.body.newSortID) { // 舊>新，代表由後往前拉
    strSQL += format(`UPDATE Product_Structure SET SortID = SortID+1 
        WHERE (Product_No = '{Product_No}') AND (SortID BETWEEN '{newSortID}' AND '{oldSortID}') 
        AND (Component_GroupID {Component_GroupID}) AND (StructureID <> '{StructureID}'); \r\n `, req.body);
  } else { // 由前往後拉
    req.body.oldSortID++
    strSQL += format(`UPDATE Product_Structure SET SortID = SortID-1 
        WHERE (Product_No = '{Product_No}') AND (SortID BETWEEN '{oldSortID}' AND '{newSortID}') 
        AND (Component_GroupID {Component_GroupID}) AND (StructureID <> '{StructureID}'); \r\n `, req.body);
  }

  strSQL += format(Update_SQL, req.body.Product_No, req.UserID);
  strSQL += format(detailSQL, req.params);

  // console.log(strSQL)
  // console.log(`Dragged Done, ${result.rowsAffected} row(s) Affected.`)      

  db.sql(req.Enterprise, strSQL)
  .then((result)=>{
    var DataSet = result.recordsets[0];
    var DataSet1 = result.recordsets[1];
    DataSet.forEach((data,idx,aaray)=>{      
      if(data.Composite === 1){
        data['children'] = []
        DataSet1.forEach((item,idx,aaray)=>{            
          if(data.Material_ColorID === item.Master_ColorID){
            let tempObj = Object.assign({}, item);
            tempObj.Net_Consist = tempObj.Net_Consist * data.Net_Consist
            tempObj.Pair_Consist = parseFloat(tempObj.Net_Consist * data.Qty)
            tempObj.Prs_Unit = parseFloat(1 / (tempObj.Net_Consist * data.Qty))
            data['children'].push(tempObj);
            if (item.isColorHistoried === 'true') {
              data.isColorHistoried = 'true'
            }
            //console.log('DataSet=',data['children']);
          }
        })
      }
    });
    // console.log('DataSet=',DataSet);
    res.send(DataSet);
  }).catch((err)=>{
    console.log(err);
    res.status(500).send(err);
  })

});

// 拖曳頁籤後的資料更新，更新 Component_GroupID 及 SortID 並排序
router.post('/Product_Structure_Detail/:Product_No/:Component_GroupID/dragTabUpdate', function (req, res, next) {
  console.log(`Call Product_Structure dragTabUpdate API Product_No:`, req.params.Product_No)
  req.body.Product_No = req.params.Product_No
  req.body.oldGroupID = req.params.Component_GroupID == 0 ? 'IS NULL' : ` = ${req.params.Component_GroupID}` // url 傳來的
  req.body.newGroupID = req.body.Component_GroupID 
  req.body.UserID = req.UserID
  // 前端 post 傳來的
  var strSQL = format(`UPDATE Product_Structure 
  SET SortID = (Select isnull(MAX(SortID),0) +1 From Product_Structure Where Product_No = '{Product_No}' And Component_GroupID = {Component_GroupID}),
      Component_GroupID = {newGroupID}
  WHERE (StructureID = {StructureID}); \r\n
  
  Update Product_Structure SET SortID = tmp.SortID
  From Product_Structure p
  Inner Join (SELECT row_number() Over(Order By SortID) AS SortID, StructureID
              FROM Product_Structure AS p with(NoLock, NoWait)
              WHERE Product_No = '{Product_No}'
              AND Component_GroupID {oldGroupID} ) AS tmp 
              ON tmp.StructureID = p.StructureID; \r\n`, req.body);

  strSQL += format(Update_SQL, req.body.Product_No, req.UserID);  
  strSQL += format(detailSQL, req.params);
  // console.log(strSQL)

  db.sql(req.Enterprise, strSQL)
  .then((result)=>{
    var DataSet = result.recordsets[0];
    var DataSet1 = result.recordsets[1];
    DataSet.forEach((data,idx,aaray)=>{      
      if(data.Composite === 1){
        data['children'] = []
        DataSet1.forEach((item,idx,aaray)=>{            
          if(data.Material_ColorID === item.Master_ColorID){
            let tempObj = Object.assign({}, item);
            tempObj.Net_Consist = tempObj.Net_Consist * data.Net_Consist
            tempObj.Pair_Consist = parseFloat(tempObj.Net_Consist * data.Qty)
            tempObj.Prs_Unit = parseFloat(1 / (tempObj.Net_Consist * data.Qty))
            data['children'].push(tempObj);
            if (item.isColorHistoried === 'true') {
              data.isColorHistoried = 'true'
            }
            //console.log('DataSet=',data['children']);
          }
        })
      }
    });
    // console.log('DataSet=',DataSet);
    res.send(DataSet);
  }).catch((err)=>{
    console.log(err);
    res.status(500).send(err);
  })

});

// 表格內編輯的資料更新，整列 Sort ID 一起更新
router.post('/Product_Structure_Detail/dataUpdate', function (req, res, next) {
  console.log('Call Product_Structure dataUpdate API Product_No:', req.body.Product_No)
  req.body.M_Rmk = req.body.M_Rmk ? `'${req.body.M_Rmk.replace(/'/g, "''")}'` : `''`
  req.body.UserID = req.UserID

  var strSQL = format(`UPDATE Product_Structure SET M_Rmk = N{M_Rmk}
        WHERE StructureID = {StructureID}; \r\n `, req.body);

  strSQL += format(Update_SQL, req.body.Product_No, req.UserID);   
  // console.log(strSQL)

  db.sql(req.Enterprise, strSQL)
  .then((result)=>{
    console.log(`Update Done, ${result.rowsAffected} row Affected.`)
    res.send('update ok')
  }).catch((err)=>{
    console.log(err);
    res.status(500).send(err);
  })
});

// 刪除全部 Product_Structure 資料
router.delete('/Product_Structure_Detail/:Product_No', function (req, res, next) {
  console.log('Call delete All Product_Structure Data API Product_No:', req.params.Product_No)
  req.params.UserID = req.UserID
  var strSQL = format(`DELETE FROM Product_Structure WHERE Product_No = '{Product_No}';`, req.params);    
  
  strSQL += format(Update_SQL, req.params.Product_No, req.UserID);   
  // console.log(strSQL)

  db.sql(req.Enterprise, strSQL)
  .then((result)=>{
    console.log(`Delete Product_Structure_Detail Done, ${result.rowsAffected} row Affected.`)
    res.send('Delete All ok')
  }).catch((err)=>{
    console.log(err);
    res.status(500).send(err);
  })
});

//取得 Product_Structure_Costing 資料
router.post('/Product_Structure_Costing', function (req, res, next) {
  console.log("Call Product_Structure_Costing Api Product_No:", req.body.Product_No);

// type:true for Product Pricing report;  use Quot_Price field.
// type:false for Product Costing report; use Unit_Price field.
var type = req.body.type == 'Pricing' ? true:false;
var strSQL = format(`
With TmpTable (Component_GroupID, Composite, SortID, SortID1, Component_Group, ComponentID, Component, Material_Color, Material, Unit, Currency, Currency_Symbol, Unit_Price, Lose1, Lose, Qty, Net_Consist, Net_Consist_YD, Ammount)
as (
SELECT pcg.Component_GroupID
, ABS(mc.Composite) AS Composite
, isnull(pcg.SortID,'AZZ') as SortID
, ps.SortID as SortID1
, pcg.Component_Group
, pc.ComponentID
, pc.Component + ' ' + isnull(ps.C_Rmk,'') AS Component
, ps.Material_Color
, isnull(ps.Material_Category,'') + ' ' + isnull(ps.Material_Specific,'') + ' ' + isnull(ps.M_Rmk,'') AS Material
, ps.Unit
, ps.Currency
, c.Currency_Symbol
, Format(${type ? 'ps.Quot_Price':'ps.Unit_Price'}, 'N2') as Unit_Price
, cast(round(ps.Lose * 100, 2) as varchar) + '%' as Lose1
, isnull(ps.Lose,0)  as Lose
, ps.Qty
, Format(Net_Consist * Qty * (1 + isnull([Lose],0)), 'N4') as Net_Consist
--, Format(case when (isnull(Net_Consist,0) * isnull(Qty,0) * (1+ isnull([Lose],0))) = 0 then 0 else 1 / (isnull(Net_Consist,0) * isnull(Qty,0) * (1+isnull([Lose],0))) end , 'N2') as Net_Consist_YD
, Format(isnull(1 / nullif( isnull(Net_Consist,0) * isnull(Qty,0) * (1+isnull([Lose],0)) ,0) ,0)  , 'N2') as Net_Consist_YD
, Round(${type ? 'ps.Quot_Price':'ps.Unit_Price'} * isnull((Loc.Currency_Rate/nullif(Frg.Currency_Rate,0)),1) * ps.Net_Consist * ps.Qty * (1 + ps.Lose),2) AS Ammount
--, ps.Size_From , ps.Size_End
FROM Product_Component pc with(NoLock, NoWait)
INNER JOIN Product_Structure ps with(NoLock, NoWait) ON pc.ComponentID = ps.ComponentID 
INNER JOIN Currency c with(NoLock, NoWait) ON ps.Currency = c.Currency 
INNER JOIN Product_Component_Group pcg with(NoLock, NoWait) ON pc.Component_GroupID = pcg.Component_GroupID 
INNER JOIN [@Currency_Rate] Loc ON ps.Currency = Loc.Currency AND (Loc.Exchange_Date = convert(Date,GetDate())) 
INNER JOIN [@Currency_Rate] Frg ON '{Currency}' = Frg.Currency AND (Frg.Exchange_Date = convert(Date,GetDate())) 
INNER JOIN Material_Color mc with(NoLock, NoWait) ON ps.Material_ColorID = mc.Material_ColorID
WHERE ({Size} = 0 or ({Size} between ps.Size_From AND ps.Size_End ) or (ps.Size_From = 0 and ps.Size_End = 0)) 
AND (ps.Product_No = '{Product_No}'))

Select 0 as Component_GroupID, 0 as Composite, '0' as SortID, 0 as SortID1, 'Total' as Component_Group, '' as Component, '' as Material_Color, '' as Material, '' as Unit, '' as Currency, '' as Currency_Symbol, '' as Unit_Price, '0%' as Lose1, 0 as Lose, 0 as Qty, '' as Net_Consist, '' as Net_Consist_YD, Format(sum(Ammount),'N2') as Amount From TmpTable 
union all
Select Component_GroupID, Composite, SortID, SortID1, Component_Group, Component, Material_Color, Material, Unit, Currency, Currency_Symbol, Unit_Price, Lose1, Lose, Qty, Net_Consist, Net_Consist_YD, Format(Ammount,'N2') as Amount From TmpTable
union all
Select Component_GroupID, 0 as Composite, 'Z' as SortID, 99999999999 as SortID1, Component_Group, '' as Component, '' as Material_Color, '' as Material, '' as Unit, '' as Currency, '' as Currency_Symbol, '' as Unit_Price, '0%' as Lose1, 0 as Lose, 0 as Qty, '' as Net_Consist, '' as Net_Consist_YD, Format(sum(Ammount),'N2') as Amount From TmpTable Group by Component_GroupID, Component_Group
ORDER BY Component_GroupID, Composite DESC, SortID1, Material, Material_Color, Component `, req.body);
  //console.log(strSQL)
  db.sql(req.Enterprise, strSQL)
  .then((result)=>{
    res.send(result.recordset);
  }).catch((err)=>{
    console.log(err);
    res.status(500).send(err);
  });
});

// 取得 Material_Color 細項資料
router.post('/Product_Structure_Detail_Color/:Material_ColorID', function (req, res, next) {

  var strSQL = format(`Select Material_ColorID, Material_DetailID, Material_Color, convert(char(10),[Date],111) as Access_Date, SupplierID, Currency,
  Unit_Price, Unit_Price as Unit_Price_Src, Purchase_Price, Remark, convert(char(10),Update_Date,111) as Update_Date, Update_User, ISNULL(Price_Approve, '') as Price_Approve, Composite
  From Material_Color Where Material_ColorID = {Material_ColorID}`, req.params);

  // console.log(strSQL)

  db.sql(req.Enterprise, strSQL)
  .then((result)=>{
    res.send(result.recordset)
  }).catch((err)=>{
    console.log(err);
    res.status(500).send(err);
  })
});

// 更新 Material_Color 單價/備註 以及該 Product_No 有用到的單價
router.post('/Product_Structure_Detail_PriceUpdate/:Product_No/:Component_GroupID', function (req, res, next) {
  console.log('Call Product_Structure_Detail_PriceUpdate API Product_No:', req.params.Product_No)

  req.body.UserID = req.UserID
  req.body.Product_No = req.params.Product_No
  req.body.Remark = req.body.Remark ? `'${req.body.Remark.replace(/'/g, "''")}'` : `''`// 有值 = 字串，沒值(null) = 空白字串

  var strSQL = format(`UPDATE Material_Color SET Unit_Price = {Unit_Price}, Purchase_Price = {Purchase_Price}, 
  Remark = N{Remark}, Update_Date = GetDate(), Update_User = '{UserID}'
  WHERE Material_ColorID = {Material_ColorID};
  UPDATE Product_Structure SET Unit_Price = {Purchase_Price}, Quot_Price = {Unit_Price}
  WHERE Product_No = '{Product_No}' and Material_ColorID = {Material_ColorID};  \r\n `, req.body);
  // console.log(strSQL)

  strSQL += format(Update_SQL, req.body.Product_No, req.UserID);
  strSQL += format(detailSQL, req.params);
  
  db.sql(req.Enterprise, strSQL)
  .then((result)=>{
    var DataSet = result.recordsets[0];
    var DataSet1 = result.recordsets[1];
    DataSet.forEach((data,idx,aaray)=>{      
      if(data.Composite === 1){
        data['children'] = []
        DataSet1.forEach((item,idx,aaray)=>{            
          if(data.Material_ColorID === item.Master_ColorID){
            let tempObj = Object.assign({}, item);
            tempObj.Net_Consist = tempObj.Net_Consist * data.Net_Consist
            tempObj.Pair_Consist = parseFloat(tempObj.Net_Consist * data.Qty)
            tempObj.Prs_Unit = parseFloat(1 / (tempObj.Net_Consist * data.Qty))
            data['children'].push(tempObj);
            if (item.isColorHistoried === 'true') {
              data.isColorHistoried = 'true'
            }
            //console.log('DataSet=',data['children']);
          }
        })
      }
    });
    // console.log('DataSet=',DataSet);
    res.send(DataSet);
  }).catch((err)=>{
    console.log(err);
    res.status(500).send(err);
  })
});

//Update Product_Structure Swatch
router.post('/Product_Structure_Detail_Swatch/:Product_No',  function (req, res, next) {
  console.log("Call Product_Structure_Detail_Swatch Api Product_No:", req.params.Product_No);

  req.body.UserID = req.UserID
  req.body.Product_No = req.params.Product_No

  var strSQL = format(`UPDATE Material_Color SET Swatch = {Swatch} WHERE Material_ColorID = {Material_ColorID}; \r\n`, req.body) ;   

  strSQL += format(Update_SQL, req.body.Product_No, req.UserID);

  // console.log(strSQL);
  db.sql(req.Enterprise, strSQL)
  .then((result)=>{
    res.send('success');
  }).catch((err)=>{
    console.log(err);
    res.status(500).send(err);
  })
});

// Update_Date = GetDate(), Update_User = '{UserID}'

/* Darren-Chang API End */

module.exports = router;