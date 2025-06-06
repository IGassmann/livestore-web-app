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
  const [eventsToBeCreated, setEventsToBeCreated] = React.useState(1000)
  return (
    <div>
      <div>
        <h2>Reproduction Steps</h2>
        <ol>
          <li>
            Open two tabs of this app in the same browser, and display them side by side.
          </li>
          <li>
            Click "Create 1,000 events (n events, 1 commit)" or "Create 1,000 items (n events, n commits)" in one of the tabs
          </li>
        </ol>
        <h2>Observations</h2>
        <ul>
          <li>
            The other tab only received ~2-3 events instead of the expected 1,000 events.
          </li>
          <li>
            No errors are shown in the console of either tab.
          </li>
          <li>
            An error/exception can be observed in the <code>@livestore/adapter-web:client-session:runInWorker:PushToLeader</code> OTel span:
            <pre>
              <code>
{`exception
├──exception.message: { "minimumExpectedNum": {"global":2,"client":0}, "providedNum": {"global":2,"client":0} }
├──exception.stacktrace: LeaderAheadError: { "minimumExpectedNum": {"global":2,"client":0}, "providedNum": {"global":2,"client":0} }
└──exception.type: LeaderAheadError`}
              </code>
            </pre>
          </li>
          <li>
            If you commit any event on the other tab, it will then receive all the previously created events from the first tab.
          </li>
          <li>
            If you commit another event on the first tab, it won't be received by the other tab.
          </li>
          <li>
            The issue only occurs when opening fresh new tabs of the app.
          </li>
          <li>
            The issue only occurs when the number of events created is approximately greater than 247 events. At around 247 events, the issue occurs sporadically.
          </li>
        </ul>
        <div>
          <label>
            Number of events to be created:
            <input
              type="range"
              value={eventsToBeCreated}
              min={1}
              max={1000}
              onChange={(e) => setEventsToBeCreated(Number(e.target.value))}
            />
          </label>
        </div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <Button
            onClick={() => {
              store.commit(...generateRandomItems(eventsToBeCreated).map((item) => events.itemCreated(item)))
            }}
          >
            Create {eventsToBeCreated} events (n events, 1 commit)
          </Button>
          <Button
            onClick={() => {
              generateRandomItems(eventsToBeCreated).map((item) => {
                store.commit(events.itemCreated(item))
              })
            }}
          >
            Create {eventsToBeCreated} events (n events, n commits)
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
