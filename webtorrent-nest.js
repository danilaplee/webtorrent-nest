const http = require('http');
const { spawn } = require('node:child_process');
const Redis = require('ioredis')
const config = require('./config')
const redis = new Redis(config.redis)
const path = require('path')
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
 
  if(children[magnetUri]) {
    if(process.env.ENABLE_LOGS === "true") {
      console.info(`child is already running for ${magnetUri}`)
    }
    return;
  }
  redis.set(config.magnetKey+magnetUri, child.pid.toString())
  
  if(torrentFile)
    redis.set(config.fileKey+magnetUri, await torrentFile)

  const child = spawn(
    "node", 
    [threadPath, "--magnet=", encodeURIComponent(magnetUri)]
  )
  children[magnetUri] = child
  child.addListener("exit", ()=>{
    delete children[magnetUri]
    streamFile(magnetUri)
  })
  if(process.env.ENABLE_LOGS === "true") {
    child.stdout.on('data', (data) => {
        console.info('logs', data.toString())
    });
  }
}


http.createServer((req, res)=> {
  if(req.url.search("/stream") > -1) {
    try {
      const magnetUri = decodeURIComponent(req.url.split('magnet=')?.[1]?.split('&')?.[0])
      const torrentFile = getBody(req)
      streamFile(magnetUri, torrentFile).then(()=>{
        res.write(JSON.stringify({"res":"done"}))
        res.end()
      }).catch((err)=>{
        console.error('stream file error', err?.message || err)
        res.write(JSON.stringify({"res":"error"}))
        res.end()
      })
    } catch(err) {
      console.error('errror', err)
      res.write(JSON.stringify({"res":"error"}))
      res.end()
    }
  } else {
    res.write(JSON.stringify({"res":"not_found"}))
    res.end()
  }
}).listen(process.env.PORT || 7071) 
.on('error',(err)=>{
  console.error('unhandled error', err?.message)
})
.addListener("error", (err)=>{
  console.error('unhandled error', err?.message)
})

const restartEverything = async () => {
  try {

    const keys = await redis.keys(config.magnetKey+'*');
    console.info('total amount of keys', keys.length)
    await Promise.all(keys.map(key=>streamFile(key)))

  } catch(err) {
    console.error('restart everything error', err)
  }
}

restartEverything()