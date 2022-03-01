const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))

async function db (id) {
  await sleep(100 + Math.floor(Math.random() * 100))
  console.log(`called for ${id}`)
  return { id, name: `NAME${id}` }
}

// ---------------------------------------

function Dataloader (batchFn, { cacheKeyFn = key => key } = {}) {
  let requested = []
  let started = false
  const cache = {}
  const cbs = {}

  const fetchData = async () => {
    const uniqKeys = requested
    requested = []
    started = false
    const results = await batchFn(uniqKeys)
    uniqKeys.forEach((key, i) => {
      const cacheKey = cacheKeyFn(key)
      cbs[cacheKey].forEach(cb => {
        cb(results[i])
      })
    })
  }

  const load = key => {
    const cacheKey = cacheKeyFn(key)
    if (!(cacheKey in cache)) {
      cache[cacheKey] = new Promise((resolve, reject) => {
        requested.push(key)
        if (!started) {
          started = true
          setTimeout(fetchData, 0)
        }
        cbs[cacheKey] = cbs[cacheKey] || []
        cbs[cacheKey].push(resolve)
      })
    }
    return cache[cacheKey]
  }

  return {
    load,
    loadMany: keys => Promise.all(keys.map(load)),
    prime: (key, value) => {
      const cacheKey = cacheKeyFn(key)
      cache[cacheKey] = Promise.resolve(value)
    }
  }
}

// ---------------------------------------

const dbLoader = new Dataloader(keys => Promise.all(keys.map(db)), {
  cacheKeyFn: key => ([1, 2, 3].includes(key) ? 'lol' : key)
})

// ---------------------------------------

async function main () {
  dbLoader.prime(1, 'ONEEE')
  dbLoader.prime(2, 'TWOOOO')
  const ids = [1, 2, 3, 4, 1, 2, 1, 1, 2, 5, 1, 1, 3, 2, 4]
  const results = await Promise.all(ids.map(dbLoader.load))
  const ids2 = [1, 2, 3, 4, 1, 2, 1, 1, 2, 5, 1, 1, 3, 2, 4, 6]
  const results2 = await Promise.all(ids2.map(dbLoader.load))
  const results3 = await dbLoader.loadMany([2, 1, 2])
  await dbLoader.load({ id: 5, transform: true })
  await dbLoader.load({ id: 5, transform: false })
  return { results, results2, results3 }
}
