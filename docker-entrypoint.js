#!/usr/bin/env node

const { spawn } = require('node:child_process')

const env = { ...process.env }
const PRISMA_SCHEMA_PATH = '/app/prisma/schema.prisma'

;(async() => {
  const commandToRun = process.argv.slice(2).join(' ')
  // If running the web server then migrate existing database
  if (isApiServerCommand(commandToRun)) {
    await exec(`npx prisma migrate deploy --schema=${PRISMA_SCHEMA_PATH}`)
  }

  // launch application
  await exec(commandToRun)
})()

function exec(command) {
  const child = spawn(command, { shell: true, stdio: 'inherit', env })
  return new Promise((resolve, reject) => {
    child.on('exit', code => {
      if (code === 0) {
        resolve()
      } else {
        reject(new Error(`${command} failed rc=${code}`))
      }
    })
  })
}

function isApiServerCommand(command) {
  return (
    command === 'node dist/server.js' ||
    command === 'node apps/api/dist/server.js'
  )
}
