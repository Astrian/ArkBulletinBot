import dotenv from "dotenv"
import Debug from "debug"
import schedule from "node-schedule"
import axios from "axios"
import { Bot } from "grammy"
import mysql, { RowDataPacket } from "mysql2"
import { JSDOM } from "jsdom"

dotenv.config()

const print = Debug("abb:app.ts")

const bot = new Bot(process.env.ARK_BOTTOKEN ?? "")

let rule = new schedule.RecurrenceRule()
rule.second = [0, 10, 20, 30, 40, 50]

/* const job = schedule.scheduleJob(rule, () => {
  refresh()
}) */

refresh()

async function refresh() {
  print('refresh!')
  let result
  try {
    result = await axios.get('https://ak-conf.hypergryph.com/config/prod/announce_meta/IOS/announcement.meta.json')
  } catch (e) {
    console.log(`OOPS! Error occured. Details:`)
    console.log(e)
    await bot.api.sendMessage(
      process.env.ARK_TGMGR ?? 0,
      `未能正确获取公告，请检查系统输出的错误信息。`
    )
    return
  }
  let list = result.data.announceList
  for (let i in list) {
    print("====")
    print(`The announcement which is processing is ${list[i].announceId}.`)
    print(`Finding announcement on database...`)
    
    const conn = mysql.createConnection({
      host: process.env.ARK_DBHOST ?? "",
      user: process.env.ARK_DBUSER ?? "",
      port: parseInt(process.env.ARK_DBPORT ?? "3306"),
      password: process.env.ARK_DBPWD ?? "",
      database: process.env.ARK_DBNAME ?? "",
      charset: "utf8mb4_general_ci",
    })

    const resRaw = await conn.promise().query(`SELECT * FROM bulletins WHERE bulletin = ?`, [list[i].announceId])
    const res = <RowDataPacket[]>resRaw[0]
    print(res)

    if (!res.length) {
      print('New announcement!')
      print("Processing html content...")
      let html = <string>(await axios.get(list[i].webUrl)).data
      let jsdom = new JSDOM(html)

      print("Processing title...")
      let title = (jsdom.window.document.getElementsByClassName("head-title")).item(0)?.textContent
      title = title?.replace("\n", "").replace(/(^\s*)/g, "").replace(/(\s*$)/g, "")
      if (!title) {
        print('no title, set default...')
        title = list[i].title.replace(/[\r\n]/g,"")
      }
      print(title)
      
      // Process links
      print("Processing links")
      let links = jsdom.window.document.getElementsByTagName("a")
      if (links.length) {
        print("This bulletin has links")
        for (let i = 0; i < links.length; i++) {
          print(`Link ${i}`)
          if (links[i].href.startsWith("uniwebview://")) {
            links[i].href = "#"
          }
          print(links[i].href)
        }
      }

      // Parse content
      print("Parsing content...")
      let contentRaw = jsdom.window.document.getElementsByClassName("content").item(0) ? jsdom.window.document.getElementsByClassName("content").item(0) : jsdom.window.document.getElementsByClassName("cover").item(0)
      let content: (JsonNode | string | null)[] = (<JsonNode>await domParser(contentRaw || new Element())).children ?? []
      content.push({"tag":"p","children":[{"tag": "a", "attrs": { "href": list[i].webUrl }, "children": ["查看原公告"]}]})
      print(JSON.stringify(content))
      let data = ``
      data += `access_token=${process.env.ARK_TGPHTOKEN}&`
      data += `title=${title}&`
      data += `content=${JSON.stringify(content)}`
      print(data)
      let telegrapharticle = await axios.post('https://api.telegra.ph/createPage', data)
      console.log(telegrapharticle.data)
      
      await bot.api.sendMessage(
        process.env.ARK_CHATID ?? 0,
        `*新游戏内公告*：${telegrapharticle.data.ok ? telegrapharticle.data.result.url.replace(/\./g, '\\.').replace(/-/g, '\\-') : list[i].webUrl}\n${list[i].group === 'SYSTEM' ? '\\#系统公告' : '\\#活动通知'}`,
        {
          parse_mode: 'MarkdownV2'
        }
      )
      await conn.promise().query(`INSERT INTO bulletins (bulletin) VALUES (?)`, [list[i].announceId])
    }
  }
}

async function domParser(dom: Element): Promise<JsonNode | null | string> {
  if (dom.nodeType === dom.TEXT_NODE) {
    return dom.textContent ?? ""
  }
  if (dom.nodeType !== dom.ELEMENT_NODE) {
    return null
  }
  let res: JsonNode = {
    tag: ""
  }
  res.tag = (dom.nodeName ?? "").toLowerCase()

  for (let i in dom.attributes) {
    let attr = dom.attributes[parseInt(i)]
    if (!res.attrs) {
      res.attrs = {}
    }
    if (attr?.name === "href") {
      res.attrs.href = attr?.value
    } else if (attr?.name === "src") {
      res.attrs.src = attr?.value
    }
  }

  if (dom.childNodes.length > 0) {
    res.children = []
    for (let i = 0; i < dom.childNodes.length; i++) {
      let child = <Element>dom.childNodes[i]
      res.children.push(await domParser(child))
    }
  }
  return res
}

type JsonNode = {
  tag: string,
  attrs?: Attrs,
  children?: (JsonNode | string | null)[] 
}
  
type Attrs = {
  href?: string,
  src?: string
}