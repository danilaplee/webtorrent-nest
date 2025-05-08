import { createServer } from 'http';
import { spawn } from 'node:child_process';
import Redis from 'ioredis';
import path from 'path';
import { config } from './config.js'
const { redis: _redis, fileKey, magnetKey } = config
const __dirname = path.resolve();
const redis = new Redis(_redis)
const children = {}
const threadPath = path.join(__dirname, "webtorrent-thread.js")
function getBody(request) {
  return new Promise((resolve, reject) => {
    const bodyParts = [];

    request.on('error', (error) => {
      console.log(error);
      reject(error);
    })

    request.on('data', (chunk) => {
      bodyParts.push(chunk);
    })

    request.on('end', () => {
      const body = Buffer.concat(bodyParts)
      resolve(body);
    });
  });
}

const streamFile = async (magnetUri, torrentFile) => {
  const isOriginal = magnetUri.search(magnetKey) === -1
  magnetUri = magnetUri.replaceAll(magnetKey, '')
  if (children[magnetUri]) {
    if (process.env.ENABLE_LOGS === "true") {
      console.info(`child is already running for ${magnetUri}`)
    }
    return;
  }
  if(isOriginal)
    await redis.set(magnetKey + magnetUri, "true")
  
  if (torrentFile)
    await redis.set(fileKey + magnetUri, await torrentFile)
  console.info('before spawn')
  const child = spawn(
    "node",
    [threadPath, "--magnet=", encodeURIComponent(magnetUri)]
  )
  console.info('after spawn', child.pid)
  child.stderr.on('data', (data) => {
    console.error('error', data.toString())
  })
  child.once("spawn", () => {
    child.addListener("exit", () => {
      delete children[magnetUri]
      streamFile(magnetUri)
    })
    if (process.env.ENABLE_LOGS === "true") {
      child.stdout.on('data', (data) => {
        console.info('logs', data.toString())
      });
    }
  })
  children[magnetUri] = child
}


createServer((req, res) => {
  if (req.url.search("/stream") > -1) {
    try {
      const magnetUri = decodeURIComponent(req.url.split('magnet=')?.[1]?.split('&')?.[0])
      const torrentFile = getBody(req)
      streamFile(magnetUri, torrentFile).then(() => {
        res.write(JSON.stringify({ "res": "done" }))
        res.end()
      }).catch((err) => {
        console.error('stream file error', err?.message || err)
        res.write(JSON.stringify({ "res": "error" }))
        res.end()
      })
    } catch (err) {
      console.error('errror', err)
      res.write(JSON.stringify({ "res": "error" }))
      res.end()
    }
  } else {
    res.write(JSON.stringify({ "res": "not_found" }))
    res.end()
  }
}).listen(process.env.PORT || 7071)
  .on('error', (err) => {
    console.error('unhandled error', err?.message)
  })
  .addListener("error", (err) => {
    console.error('unhandled error', err?.message)
  })

const restartEverything = async () => {
  try {

    const keys = await redis.keys(magnetKey + '*');
    console.info('total amount of keys', keys.length)
    await Promise.all(keys.map(key => key && key.search("magnet:") > -1 ? streamFile(key) : null))

  } catch (err) {
    console.error('restart everything error', err)
  }
}

restartEverything()