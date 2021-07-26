const { MongoClient } = require('mongodb')
// or as an es module:
// import { MongoClient } from 'mongodb'

// Connection URL
const url = `mongodb+srv://${process.env.ARK_DBUSER}:${process.env.ARK_DBPWD}@cluster0.4yupq.mongodb.net/?retryWrites=true&w=majority`
const client = new MongoClient(url)

module.exports = async (data) => {
  // Use connect method to connect to the server
  await client.connect()
  const db = client.db(process.env.ARK_DBNAME)
  const collection = db.collection('announcements')

  // the following code examples can be pasted here...
  const insertResult = await collection.insertMany([data])

  client.close()

  return insertResult
}