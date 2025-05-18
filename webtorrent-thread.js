import WebTorrent from 'webtorrent'
import Redis from 'ioredis'
import { config } from './config.js'
import {File} from './db.js'
const { redis: _redis } = config
import { Op } from 'sequelize'

const runSeed = async () => {
  const client = new WebTorrent()
  const redis = new Redis(_redis)
  const magnet = process.argv.join('').split('magnet=')[1]
  const magnetUri = decodeURIComponent(magnet)
  let torrentFile = undefined
  let cache;
  try {
    cache = (await File.findOne({where:{magnet:{[Op.eq]:magnetUri}}})).torrentFile
    torrentFile = Uint8Array.from(Object.values(cache))
  } catch (err) {

  }
  console.info('starting process with magnet uri', magnetUri)
  cache.status = "seeding"
  await cache.save()
  await cache.reload()
  client.add(
    torrentFile || magnetUri,
    { path: "/webtorrent/", skipVerify: false },
    (torrent) => {
      console.info('torrent created')
      torrent.rescanFiles(async () => {
        const file = torrent.files[0]
        console.info('after rescan', file.downloaded, file.length, file.name)
        if(file.downloaded === file.length) {
          console.info('torrent previously downloaded')
          cache.status = "done"
          await cache.save()
          await cache.reload()
          process.exit(0)
        }
        file.select()
        torrent.resume()
        torrent.on("done", async ()=>{
          console.info('torrent done')
          cache.status = "done"
          await cache.save()
          await cache.save()
          await cache.reload()
          process.exit(0)
        })
      })
    })
}

runSeed().then(() => {

})