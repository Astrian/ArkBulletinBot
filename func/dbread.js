const config = require('../config.json')
const { MongoClient } = require('mongodb')
// or as an es module:
// import { MongoClient } from 'mongodb'

// Connection URL
const url = `mongodb+srv://${config.database.username}:${config.database.password}@cluster0.4yupq.mongodb.net/?retryWrites=true&w=majority`
const client = new MongoClient(url)

module.exports = async (condition) => {
  // Use connect method to connect to the server
  await client.connect()
  const db = client.db(config.database.name)
  const collection = db.collection('announcements')

  // the following code examples can be pasted here...
  const findResult = await collection.find(condition).toArray()

  client.close()

  return findResult
}