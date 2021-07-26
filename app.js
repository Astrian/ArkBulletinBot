const func = require('./func')
async function main (){
  await func.dbwrite({announcement: 444})
  console.log(await func.dbread({announcement: 444}))
}

main()