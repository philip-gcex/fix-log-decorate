#!/usr/bin/env node

import { pipeline, Transform } from 'stream'
import chalk from 'chalk'
import minimist from 'minimist'

import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'

import { msgTypeLU, tagLU } from './fixlu.mjs'

const map = fn => new Transform({
  transform(chunk, encoding, callback) {
    try {
      callback(null, fn(chunk))
    } catch(e){
      callback(e)
    }
  }
})

const {
  usenumber,
  usename,
  usevalue,
  uselookup,
  usenewline,
  skip,
  keep,
  delim,
  help,
  version,
} = minimist(process.argv.slice(2), {
  default: {
    usenumber: 1,
    usename: 1,
    usevalue: 1,
    uselookup: 1,
    usenewline: 0,
    skip: '',
    keep: '',
    delim: '|',
    help: false,
    version: false,
  }
})

if (help || version) {
  const __dirname = path.dirname(fileURLToPath(import.meta.url))
  const readFile = f => fs.readFileSync(path.resolve(__dirname,f)).toString()  
  console.error(
    help ? readFile('README.md') + "\n" : '',
    'fix-log-decorate version:', JSON.parse(readFile('package.json')).version
  )
  process.exit()
}

const splitBySpace = a => a.split(' ').filter(x => x !== '')
const [skipArr, keepArr] = [skip, keep].map(splitBySpace)

const pipeAsDelim = x => ('' + x).replace(/\x01/g, '|')

const decorate = {
  name: x => chalk.green(x),
  lookup: x => chalk.inverse.blue(x),
  msgType: x => chalk.inverse[x === "Heartbeat" ? 'grey':'red'](x),
}

const fieldReplacer = (match, fieldNo, value) => {
  const newLine = fieldNo == 10 && usenewline ? '\n' : ''
  const skipField =
    (skipArr.includes(fieldNo) || skipArr.includes(tagLU?.[fieldNo]?.desc)) ||
    (keepArr.length > 0 && !keepArr.includes(fieldNo) && !keepArr.includes(tagLU?.[fieldNo]?.desc))
  return skipField
    ? newLine
    : [
        usenumber ? fieldNo : '',
        usename && tagLU?.[fieldNo] ? decorate['name'](tagLU?.[fieldNo]?.desc) : '',
        '=',
        usevalue || (!(tagLU?.[fieldNo]?.enum?.[value]) )? value : '',
        fieldNo == 35 ? decorate['msgType'](msgTypeLU[value]?.msgname) : '',
        fieldNo != 35 && uselookup && tagLU?.[fieldNo]?.enum?.[value] ? decorate['lookup'](tagLU?.[fieldNo]?.enum?.[value]) : '',
        delim,
        newLine
      ].join('')
}

const highlightFieldNames = x => {
  try {
    return ('' + x).replace(/(\d+)=([^|]*)\|/g, fieldReplacer)
  } catch (e){
    console.error("fix-log-decorate highFieldNames error:",e)
    return x;
  }
}

pipeline(
  process.stdin,
  map(pipeAsDelim),
  map(highlightFieldNames),
  process.stdout,
  err => err && console.error('fix-log-decorate error:', err)
)
