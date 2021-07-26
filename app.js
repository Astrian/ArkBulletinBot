const port = process.env.PORT

const Koa = require('koa')
const app = new Koa()
const route = require('koa-route')
const axios = require('axios')
const schedule = require('node-schedule')
const func = require('./func')
const { Telegraf, Telegram } = require('telegraf')
const { JSDOM } = require('jsdom')
const { all } = require('koa-route')

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
      let html = await axios.get(list[i].webUrl)
      html = (html.data)
      console.log(html)
      let dom = new JSDOM(html)
      let $ = jQuery = require('jquery')(dom.window)
      let title = $('.head-title').text()
      console.log(title)
      if (title) {
        console.log(`Title: ${title}`)
      } else {
        console.log('no title, set default...')
        title = list[i].title.replace(/[\r\n]/g,"")
      }
      if ($('a').length) {
        if ($('a').attr('href').includes('uniwebview://')) { 
          $('a').attr('href', '#')
        }
      }
      let content = $('.content').get(0) ? $('.content').get(0) : $('.cover').get(0)
      console.log(content)
      content = domToNode(content).children
      console.log(content)
      let data = ``
      data += `access_token=${process.env.ARK_TGPHTOKEN}&`
      data += `title=${title}&`
      data += `content=${JSON.stringify(content)}`
      console.log(data)
      let telegrapharticle = await axios.post('https://api.telegra.ph/createPage', data)
      console.log(telegrapharticle.data)
      
      await tgbotTelegram.sendMessage(
        process.env.ARK_CHATID,
        `*新游戏内公告*：${telegrapharticle.data.ok ? telegrapharticle.data.result.url.replace(/\./g, '\\.').replace(/-/g, '\\-') : list[i].webUrl}\n${list[i].group === 'SYSTEM' ? '\\#系统公告' : '\\#活动通知'}`,
        {
          parse_mode: 'MarkdownV2'
        }
      )
      await func.dbwrite({announceId: list[i].announceId})
    }
  }
}

function domToNode(domNode) {
  if (domNode.nodeType == domNode.TEXT_NODE) {
    return domNode.data;
  }
  if (domNode.nodeType != domNode.ELEMENT_NODE) {
    return false;
  }
  var nodeElement = {};
  nodeElement.tag = domNode.tagName.toLowerCase();
  for (var i = 0; i < domNode.attributes.length; i++) {
    var attr = domNode.attributes[i];
    if (attr.name == 'href' || attr.name == 'src') {
      if (!nodeElement.attrs) {
        nodeElement.attrs = {};
      }
      nodeElement.attrs[attr.name] = attr.value;
    }
  }
  if (domNode.childNodes.length > 0) {
    nodeElement.children = [];
    for (var i = 0; i < domNode.childNodes.length; i++) {
      var child = domNode.childNodes[i];
      nodeElement.children.push(domToNode(child));
    }
  }
  return nodeElement;
}

/* async function scheduleTask() {
  let rule = new schedule.RecurrenceRule()
  rule.minute = [0, 15, 30, 45]

  let job = schedule.scheduleJob(rule, async () => {
    await refresh()
  })
}

scheduleTask() */