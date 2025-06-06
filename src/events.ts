import { Events, Schema } from '@livestore/livestore'

export const itemCreated = Events.synced({
  name: 'v1.ItemCreated',
  schema: Schema.Struct({ id: Schema.Number, label: Schema.String }),
})

export const itemDeleted = Events.synced({
  name: 'v1.ItemDeleted',
  schema: Schema.Struct({ id: Schema.Number }),
})

export const allItemsDeleted = Events.synced({
  name: 'v1.AllItemsDeleted',
  schema: Schema.Void,
})
