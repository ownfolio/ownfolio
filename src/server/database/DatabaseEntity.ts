import { DatabaseError } from './DatabaseError'
import { DatabaseTable } from './DatabaseTable'

export type Entity = { id: string }

export abstract class DatabaseEntity<E extends Entity, P extends keyof E = never> extends DatabaseTable<E> {
  public async create(template: Omit<E, 'id' | P>): Promise<E> {
    const entity: E = this.schema.parse(this.prepare(template))
    await this.sql`INSERT INTO ${this.sql(this.table)} ${this.sql(entity as any)}`
    return entity
  }

  public async update(entity: E): Promise<E> {
    const entity2 = this.schema.parse(entity)
    const res = await this.sql`UPDATE ${this.sql(this.table)} SET ${this.sql(entity2 as any)} WHERE "id" = ${
      entity2.id
    }`
    DatabaseError.ensureHit(res, this.table, entity2.id)
    return entity2
  }

  public async delete(id: string): Promise<void> {
    const res = await this.sql`DELETE FROM ${this.sql(this.table)} WHERE "id" = ${id}`
    DatabaseError.ensureHit(res, this.table, id)
  }

  public async retrieve(id: string): Promise<E> {
    const rows = await this.sql`SELECT * FROM ${this.sql(this.table)} WHERE "id" = ${id}`
    DatabaseError.ensureHit(rows, this.table, id)
    return this.schema.parse(rows[0])
  }

  public async find(id: string): Promise<E | undefined> {
    const rows = await this.sql`SELECT * FROM ${this.sql(this.table)} WHERE "id" = ${id}`
    return rows.length > 0 ? this.schema.parse(rows[0]) : undefined
  }

  public async list(skip: number = 0, top: number = 2147483647): Promise<E[]> {
    const rows = await this.sql`SELECT * FROM ${this.sql(this.table)} ORDER BY "id" OFFSET ${skip} LIMIT ${top}`
    return rows.map(row => this.schema.parse(row))
  }

  protected abstract prepare(template: Omit<E, 'id' | P>): E
}
