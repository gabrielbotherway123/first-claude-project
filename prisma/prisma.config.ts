const { defineConfig } = require('@prisma/internals')
const { createClient } = require('@libsql/client')
const { PrismaLibSQL } = require('@prisma/adapter-libsql')

const libsqlClient = createClient({ url: process.env.DATABASE_URL })
const adapter = new PrismaLibSQL(libsqlClient)

module.exports = defineConfig({
  datasources: {
    db: {
      adapter,
    },
  },
})
