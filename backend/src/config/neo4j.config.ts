import neo4j from 'neo4j-driver'
import { env } from './env'

export const driver = (env.neo4jUrl && env.neo4jUser && env.neo4jPassword)
    ? neo4j.driver(env.neo4jUrl, neo4j.auth.basic(env.neo4jUser, env.neo4jPassword))
    : null as any;
