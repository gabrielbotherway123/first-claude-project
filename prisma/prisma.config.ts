import { defineConfig } from '@prisma/internals'
import { createClient } from '@libsql/client'
import { PrismaLibSQL } from '@prisma/adapter-libsql'

const libsqlClient = createClient({ url: process.env.DATABASE_URL! })
const adapter = new PrismaLibSQL(libsqlClient)

export default defineConfig({
  datasources: {
    db: {
      adapter,
    },
  },
})
