import { createServer } from 'http';
import { spawn } from 'node:child_process';
import path from 'path';
import { File, syncPromise } from './db.js'
import { Op } from 'sequelize'
const envInterval = parseInt(process.env.QUEUE_RUN_INTERVAL)
const queueRunInterval = !isNaN(envInterval) ? envInterval : 10000
const __dirname = path.resolve();
const children = {}
const threadPath = path.join(__dirname, "webtorrent-thread.js")
const baseUrl = process.env.BASE_URL || "http://localhost:8080"
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
const addFile = async (magnetUri, torrentFile) => {

  if (magnetUri === 'undefined' || magnetUri === undefined) {
    return;
  }
  if (torrentFile) {
    const file = await File.create({ 
      magnet: magnetUri, 
      torrentFile: (await torrentFile).toJSON(), 
      status: "leech" 
    })
    return file;
  }

}

const streamFile = async (id) => {


  if (children[id]) {
    if (process.env.ENABLE_LOGS === "true") {
      console.info(`child is already running for ${id}`)
    }
    children[id].kill()
  }


  console.info('before spawn')

  const child = spawn(
    "node",
    [threadPath, "--id=", id]
  )
  child.stderr.on('data', (data) => {
    console.error('error', data.toString())
  })
  child.once("spawn", () => {
    child.addListener("exit", () => {
      delete children[id]
      // streamFile(magnetUri)
    })
    if (process.env.ENABLE_LOGS === "true") {
      child.stdout.on('data', (data) => {
        console.info('logs', data.toString())
      });
    }
  })
  children[id] = child
}


createServer((req, res) => {
  if (req.url.search("/stream") > -1) {
    try {
      const urlParams = new URL(baseUrl + req.url).searchParams
      const magnetUri = urlParams.get("magnet")
      const torrentFile = getBody(req)
      const setCors = () => res.setHeader("Access-Control-Allow-Origin", req.headers.origin || baseUrl)
      addFile(magnetUri, torrentFile).then(() => {
        setCors()
        res.write(JSON.stringify({ "res": "done" }))
        return res.end()
      }).catch((err) => {
        console.error('stream file error', err?.message || err)
        setCors()
        res.write(JSON.stringify({ "res": "error" }))
        res.end()
      })
    } catch (err) {
      console.error('errror', err)
      setCors()
      res.write(JSON.stringify({ "res": "error" }))
      return res.end()
    }
  } else {
    setCors()
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

const runQueue = async () => {
  try {

    const newFiles = await File.findAll({ where: { status: { [Op.eq]: "leech" } } })
    await Promise.all(newFiles.map(async (nfile) =>
      streamFile(nfile.id)
    ))
  } catch (err) {
    console.error('err running queue',err)
  }
}

syncPromise.then(()=>{
  setInterval(runQueue, queueRunInterval)
})

