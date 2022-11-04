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
  skipseen,
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
    skipseen: 1,
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
  fieldNo: ({fieldNo, fieldAlreadySeen}) => 
    fieldAlreadySeen ? chalk.grey(fieldNo) : fieldNo,  
  name: ({fieldName}) => 
    chalk.green(fieldName),
  value: ({value, fieldName}) => 
    fieldName === "SenderCompID" ? chalk.magenta(value) :
    fieldName === "TargetCompID" ? chalk.yellow(value) :
    fieldName === "MsgSeqNum" ? chalk.cyan(value) :
    value,
  lookup: ({lookup, fieldName}) =>
    chalk.inverse[
      (fieldName ==="MsgType" && lookup === "Heartbeat") ? "grey" :
      (fieldName ==="MsgType") ? "red" :
      "blue"
    ](lookup),
}

const fieldReplacer = (alreadySeen = {}) => (match, fieldNo, value) => {

  //alreadySeen is a closure state object for tracking items already seen per messsage
  if (fieldNo == 8){alreadySeen={}}    // reset seen records on new message   
  const valueAlreadySeenKey = `${fieldNo}_${value}`

  const newLine = fieldNo == 10 && usenewline ? '\n' : ''
  const fieldName = tagLU?.[fieldNo]?.desc
  const lookup = tagLU?.[fieldNo]?.enum?.[value]

  const includesField = arr => arr.includes(fieldNo) || arr.includes(fieldName)
  const skipField = includesField(skipArr) || (keepArr.length > 0 && !includesField(keepArr)) 

  const outputField = (type, condition) => condition ? decorate[type]({
    fieldNo, fieldName, value, lookup,
    fieldAlreadySeen: alreadySeen[fieldNo],
    valueAlreadySeen: alreadySeen[valueAlreadySeenKey],
  }) : ''

  const notYetSeen = x => !skipseen || !alreadySeen[x]
  const output = skipField ? newLine : 
    [
      outputField('fieldNo', usenumber ),
      outputField('name', usename && fieldName && notYetSeen(fieldNo) ),
      '=',
      outputField('value', usevalue || !lookup ),
      outputField('lookup', uselookup && lookup && notYetSeen(valueAlreadySeenKey) ),
      delim,
      newLine
    ].join('')
  
  alreadySeen[fieldNo] = true
  alreadySeen[valueAlreadySeenKey] = true
      
  return output
}

const highlightFieldNames = row => {
  try {
    return ('' + row).replace(/(\d+)=([^|]*)\|/g, fieldReplacer())
  } catch (e){
    console.error("fix-log-decorate highFieldNames error:",e)
    return row;
  }
}

pipeline(
  process.stdin,
  map(pipeAsDelim),
  map(highlightFieldNames),
  process.stdout,
  err => err && console.error('fix-log-decorate error:', err)
)
