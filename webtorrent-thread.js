const WebTorrent = require('webtorrent')
const Redis = require('ioredis')
const config = require('./config')

const runSeed = async () => {
  const client = new WebTorrent()
  const redis = new Redis(config.redis)
  const magnetUri = decodeURIComponent(process.argv.join('').split('magnet=')[1])
  console.info('starting process with magnet uri', magnetUri)
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

runSeed().then(()=>{

})