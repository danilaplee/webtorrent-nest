const WebTorrent = require('webtorrent')

const magnetUri = decodeURIComponent(process.argv.join('').split('magnet=')[1])
console.info('starting process with magnet uri', magnetUri)
const config = require('./config')
const client = new WebTorrent()
const Redis = require('ioredis')
const redis = new Redis(config.redis)

const runSeed = async () => {
  let torrentFile = undefined
  try {
  torrentFile = JSON.parse(await redis.get(config.fileKey+magnetUri))
  } catch(err) {

  }
  client.add(
    torrentFile || magnetUri, 
    {path:"/webtorrent/", skipVerify:false}, 
    (torrent) => {
    console.info('torrent created')
    torrent.rescanFiles(()=>{
      console.info('after rescan')
      torrent.resume()
    })
  })
}

runSeed()