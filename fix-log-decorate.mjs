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
  highlight,
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
    highlight: '',
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
const [skipArr, keepArr, highlightArr] = [skip, keep, highlight].map(splitBySpace)

const pipeAsDelim = x => ('' + x).replace(/\x01/g, '|').replace(/\\x01/g, '|')

const decorate = {
  fieldNo: ({fieldSeen}) => 
    chalk[fieldSeen ? 'grey':'white'],  
  fieldName: ({}) => chalk.green,
  value: ({fieldName}) => 
    fieldName === "SenderCompID" ? chalk.inverse.magenta :
    fieldName === "TargetCompID" ? chalk.magenta :     // cyanBright
    fieldName === "MsgSeqNum" ? chalk.yellowBright :
    chalk.white,
  lookup: ({lookup, fieldName}) => chalk
    [fieldName ==="MsgType" ? 'inverse':'visible']
    [
      (fieldName ==="MsgType" && lookup === "HEARTBEAT") ? "grey" :
      (fieldName ==="MsgType") ? "red" :
      "blueBright"
    ],
}

const includes = (arr, vals) => vals.some(x=>arr.includes(x))

const fieldReplacer = (alreadySeen = {}) => (match, fieldNo, value) => {

  //alreadySeen is a closure state object for tracking items already seen per messsage
  if (fieldNo == 8){alreadySeen={}}    // reset seen records on new message   
  const valueSeenKey = `${fieldNo}_${value}`   

  const newLine = usenewline && fieldNo == 10 ? '\n' : ''
  const fieldName = tagLU?.[fieldNo]?.desc
  const lookup = tagLU?.[fieldNo]?.enum?.[value]

  const valuesByType = type => /^field/.test(type) ?
    [fieldNo, fieldName] : [value, lookup]

  const skipField = includes(skipArr, valuesByType("field")) ||
    (keepArr.length && !includes(keepArr, valuesByType("field"))) 
  
  const highlighter = ({type, chalk}) => 
    includes(highlightArr, valuesByType(type)) ? chalk.bgYellow.black : chalk
  const valueLookup = {
    fieldNo, fieldName, value, lookup, 
    fieldSeen: alreadySeen[fieldNo]
  }
  
  const outputField = (type, condition) => !condition ? '' : 
    highlighter({type, chalk: decorate[type](valueLookup)})(valueLookup[type])

  const notYetSeen = x => !skipseen || !alreadySeen[x]
  const output = skipField ? newLine : 
    [
      outputField('fieldNo', usenumber ),
      outputField('fieldName', usename && fieldName && notYetSeen(fieldNo) ),
      '=',
      outputField('value', usevalue || !lookup ),
      outputField('lookup', uselookup && lookup && notYetSeen(valueSeenKey) ),
      delim,
      newLine
    ].join('')
  
  // update state
  alreadySeen[fieldNo] = true
  alreadySeen[valueSeenKey] = true
      
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
