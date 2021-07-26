const port = 3000

const Koa = require('koa')
const app = new Koa()
const route = require('koa-route')
const axios = require('axios')
const schedule = require('node-schedule')
const func = require('./func')
const { Telegraf, Telegram } = require('telegraf')

// const tgbotTelegraf = new Telegraf(process.env.ARK_TGBOT)
const tgbotTelegram = new Telegram(process.env.ARK_TGBOT)

app.use(route.get('/refresh', async ctx => {
  await refresh()
  ctx.response.status = 204
}))

app.listen(port, () => {
  console.log(`Application is running on port ${port}`)
})

async function refresh() {
  console.log('refresh!')
  let result = await axios.get('https://ak-conf.hypergryph.com/config/prod/announce_meta/IOS/announcement.meta.json')
  let list = result.data.announceList
  for (let i in list) {
    console.log(`The announcement which is processing is ${list[i].announceId}.`)
    console.log(`Finding announcement on database...`)
    let res = await func.dbread({announceId: list[i].announceId})
    if (!res.length) {
      console.log('New announcement!')
      console.log(list[i])
      await tgbotTelegram.sendMessage(
        process.env.ARK_CHATID,
        `*新游戏内公告*：[${list[i].title.replace(/[\r\n]/g,"")}](${list[i].webUrl})\n${list[i].group === 'SYSTEM' ? '\\#系统公告' : '\\#活动通知'}`,
        {
          parse_mode: 'MarkdownV2',
          disable_web_page_preview: true
        }
      )
      await func.dbwrite({announceId: list[i].announceId})
    }
  }
}

async function scheduleTask() {
  let rule = new schedule.RecurrenceRule()
  rule.minute = [0, 15, 30, 45]

  let job = schedule.scheduleJob(rule, async () => {
    await refresh()
  })
}

scheduleTask()