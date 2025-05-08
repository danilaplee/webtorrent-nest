import WebTorrent from 'webtorrent'
import Redis from 'ioredis'
import { config } from './config.js'
const { redis: _redis, fileKey } = config

const runSeed = async () => {
  const client = new WebTorrent()
  const redis = new Redis(_redis)
  const magnet = process.argv.join('').split('magnet=')[1]
  const magnetUri = decodeURIComponent(magnet)
  let torrentFile = undefined
  try {
    const cache = JSON.parse(await redis.get(fileKey + magnetUri))
    torrentFile = Uint8Array.from(Object.values(cache))
  } catch (err) {

  }
  console.info('starting process with magnet uri', magnetUri)
  client.add(
    torrentFile || magnetUri,
    { path: "/webtorrent/", skipVerify: false },
    (torrent) => {
      console.info('torrent created')
      torrent.rescanFiles(async () => {
        const file = torrent.files[0]
        console.info('after rescan', file)
        if(file.downloaded === file.length) {
          await redis.del(config.magnetKey+magnet)
          process.exit(0)
        }
        file.select()
        torrent.resume()
        torrent.on("done", async ()=>{
          console.info('torrent done')
          await redis.del(config.magnetKey+magnet)
          process.exit(0)
        })
      })
    })
}

runSeed().then(() => {

})