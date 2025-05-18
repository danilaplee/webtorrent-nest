import WebTorrent from 'webtorrent'
import {File as Files} from './db.js'
import { Op } from 'sequelize'

const runSeed = async () => {
  const client = new WebTorrent()
  client.on("error", (err)=>{
    console.error('client error', err)
    process.exit(1)
  })
  const magnet = process.argv.join('').split('magnet=')[1]
  const magnetUri = decodeURIComponent(magnet)
  let torrentFile = undefined
  let cache;
  try {
    cache = await Files.findOne({where:{magnet:{[Op.eq]:magnet}}})
    console.info('find cache for magnet', cache)
    torrentFile = Uint8Array.from(Object.values(cache.torrentFile.data))
  } catch (err) {
    console.error('torrentFile parsing error', err)
    // throw err;
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
        if(!cache.size) {
          cache.size = file.length
          cache.fileName = file.name
          await cache.save()
          await cache.reload()
        }
        console.info('after rescan', file.downloaded, file.length, file.name)
        if(file.downloaded === file.length) {
          console.info('torrent previously downloaded')
          cache.status = "done"
          await cache.save()
          await cache.reload()
          return process.exit(0)
        }
        file.select()
        torrent.resume()
        torrent.on("done", async ()=>{
          console.info('torrent done')
          cache.status = "done"
          await cache.save()
          await cache.reload()
          return process.exit(0)
        })
      })
    })
}

runSeed().then(() => {

}).catch(err=>{
  console.error('runSeed error', err)
})