#!/usr/bin/env node

import { pipeline } from 'node:stream'
import map from 'through2-map'
import chalk from 'chalk'
import { msgTypeLU, tagLU } from './fixlu.mjs'
import minimist from 'minimist'

const {
  usenumber,
  usename,
  usevalue,
  uselookup,
  usenewline,
  skip,
  keep,
  delim
} = minimist(process.argv.slice(2), {
  default: {
    usenumber: 1,
    usename: 1,
    usevalue: 1,
    uselookup: 1,
    usenewline: 0,
    skip: '',
    keep: '',
    delim: '|'
  }
})
const [skipArr,keepArr] = [skip,keep]
  .map( a=>a.split(' ').filter(x => x !== '') )

const pipeAsDelim = x => ('' + x).replace(/\x01/g, '|')

const fieldReplacer = (match, fieldNo, value) => {
  const newLine = fieldNo == 10 && usenewline ? '\n' : ''
  if (
    (skipArr.includes(fieldNo) || skipArr.includes(tagLU?.[fieldNo]?.desc)) ||
        (keepArr.length > 0 && !keepArr.includes(fieldNo) && !keepArr.includes(tagLU?.[fieldNo]?.desc))
  ) {
    return newLine
  }
  return [
    usenumber ? fieldNo : '',
    usename && tagLU?.[fieldNo] ? chalk.green(tagLU?.[fieldNo]?.desc) : '',
    '=',
    usevalue || !(tagLU?.[fieldNo]?.enum?.[value]) || fieldNo != 35 ? value : '',
    fieldNo == 35 ? chalk.inverse.blue(msgTypeLU[value]?.msgname) : '',
    fieldNo != 35 && uselookup && tagLU?.[fieldNo]?.enum?.[value] ? chalk.inverse.red(tagLU?.[fieldNo]?.enum?.[value]) : '',
    delim,
    newLine
  ].join('')
}

const highlightFieldNames = x => ('' + x).replace(/(\d+)=([^|]*)\|/g, fieldReplacer)

pipeline(
  process.stdin,
  map(pipeAsDelim),
  map(highlightFieldNames),
  process.stdout,
  err => err && console.error('error', err)
)
