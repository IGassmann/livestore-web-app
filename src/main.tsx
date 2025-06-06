import { makePersistedAdapter } from '@livestore/adapter-web'
import LiveStoreSharedWorker from '@livestore/adapter-web/shared-worker?sharedworker'
import { LiveStoreProvider, useQuery, useStore } from '@livestore/react'
import React, { StrictMode } from 'react'
import { unstable_batchedUpdates as batchUpdates } from 'react-dom'
import { createRoot } from 'react-dom/client'

import LiveStoreWorker from './livestore.worker.js?worker'
import { allItems$, uiState$ } from './queries.js'
import { events, type Item, type Items, schema } from './schema.js'
import { makeTracer } from './otel.js'

const A = [
  'pretty',
  'large',
  'big',
  'small',
  'tall',
  'short',
  'long',
  'handsome',
  'plain',
  'quaint',
  'clean',
  'elegant',
  'easy',
  'angry',
  'crazy',
  'helpful',
  'mushy',
  'odd',
  'unsightly',
  'adorable',
  'important',
  'inexpensive',
  'cheap',
  'expensive',
  'fancy',
]
const C = ['red', 'yellow', 'blue', 'green', 'pink', 'brown', 'purple', 'brown', 'white', 'black', 'orange']
const N = [
  'table',
  'chair',
  'house',
  'bbq',
  'desk',
  'car',
  'pony',
  'cookie',
  'sandwich',
  'burger',
  'pizza',
  'mouse',
  'keyboard',
]

const random = (max: number) => Math.round(Math.random() * 1000) % max

let nextId = 1
const generateRandomItems = (count: number): Items => {
  const items: Items = Array.from({ length: count })
  for (let i = 0; i < count; i++) {
    items[i] = {
      id: nextId++,
      label: `${A[random(A.length)]} ${C[random(C.length)]} ${N[random(N.length)]}`,
    }
  }
  return items
}

const adapter = makePersistedAdapter({
  worker: LiveStoreWorker,
  sharedWorker: LiveStoreSharedWorker,
  storage: { type: 'opfs' },
})

const RemoveIcon = <span>X</span>

const ItemRow = React.memo(({ item }: { item: Item }) => {
  const { store } = useStore()
  const { selected } = useQuery(uiState$)
  const isSelected = selected === item.id
  return (
    <tr style={{ backgroundColor: isSelected ? 'lightblue' : 'white' }}>
      <td>{item.id}</td>
      <td>
        <Button
          onClick={() => {
            store.commit(events.uiStateSet({ selected: item.id }))
          }}
        >
          {item.label}
        </Button>
      </td>
      <td>
        <Button
          onClick={() => {
            store.commit(events.itemDeleted({ id: item.id }))
          }}
        >
          {RemoveIcon}
        </Button>
      </td>
      <td></td>
    </tr>
  )
})

const ItemRowList = React.memo(() => {
  const items = useQuery(allItems$)
  return items.map((item) => <ItemRow key={item.id} item={item} />)
})

const Button = React.memo(
  ({ onClick, children }: { onClick: () => void; children: React.ReactNode }) => (
    <button type="button" onClick={onClick}>
      {children}
    </button>
  ),
)

const Main = () => {
  const { store } = useStore()
  return (
    <div>
      <div>
        <h2>Reproduction Steps</h2>
        <ol>
          <li>
            Click ...
          </li>
        </ol>
        <h2>Observations</h2>
        <ul>
          <li>
            A "..." error is logged in the console
          </li>
        </ul>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <Button
            onClick={() => {
              store.commit(events.thousandItemsCreated(generateRandomItems(1000)))
            }}
          >
            Create 1,000 items (1 event)
          </Button>
          <Button
            onClick={() => {
              store.commit(...generateRandomItems(1000).map((item) => events.itemCreated(item)))
            }}
          >
            Create 1,000 items (n events, 1 commit)
          </Button>
          <Button
            onClick={() => {
              generateRandomItems(1000).map((item) => {
                store.commit(events.itemCreated(item))
              })
            }}
          >
            Create 1,000 items (n events, n commits)
          </Button>
          <Button
            onClick={() => {
              store.commit(events.tenThousandItemsCreated(generateRandomItems(10_000)))
            }}
          >
            Create 10,000 items
          </Button>
          <Button
            onClick={() => {
              store.commit(events.thousandItemsAppended(generateRandomItems(1000)))
            }}
          >
            Append 1,000 items
          </Button>
          <Button
            onClick={() => {
              store.commit(events.everyTenthItemUpdated())
            }}
          >
            Update every 10th items
          </Button>
          <Button
            onClick={() => {
              store.commit(events.allItemsDeleted())
            }}
          >
            Clear
          </Button>
        </div>
      </div>
      <table>
        <tbody>
          <ItemRowList />
        </tbody>
      </table>
    </div>
  )
}

const otelTracer = makeTracer('livestore-test-app')

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <LiveStoreProvider
      schema={schema}
      adapter={adapter}
      batchUpdates={batchUpdates}
      renderLoading={(bootStatus) => <p>Stage: {bootStatus.stage}</p>}
      otelOptions={{ tracer: otelTracer }}
    >
      <Main />
    </LiveStoreProvider>
  </StrictMode>,
)
