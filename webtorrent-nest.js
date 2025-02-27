const http = require('http');
const { spawn } = require('node:child_process');
const Redis = require('ioredis')
const redis = new Redis({
  port:6379, 
  host:process.env.REDIS_HOST || "127.0.0.1",
  password:process.env.REDIS_PASSWORD
})
const children = {}
const isRunning = (pid) => {
  try {
    return process.kill(parseInt(pid, 10),0)
  }
  catch (e) {
    return e.code === 'EPERM'
  }
}
const streamFile = async (magnetUri) => {
 
  if(children[magnetUri]) {
    if(process.env.ENABLE_LOGS === "true") {
      console.info(`child is already running for ${magnetUri}`)
    }
    return;
  }
  const child = spawn(
    "webtorrent", 
    ["download", magnetUri, "--keep-seeding"], 
    {cwd:"/webtorrent"}
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
  redis.set(magnetUri, child.pid.toString())
}


http.createServer((req, res)=> {
  if(req.url.search("/stream") > -1) {
    try {
      const magnetUri = decodeURIComponent(req.url.split('magnet=')?.[1]?.split('&')?.[0])
      streamFile(magnetUri).then(()=>{
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

    const keys = await redis.keys('*');
    console.info('total amount of keys', keys.length)
    await Promise.all(keys.map(key=>streamFile(key)))

  } catch(err) {
    console.error('restart everything error', err)
  }
}

restartEverything()