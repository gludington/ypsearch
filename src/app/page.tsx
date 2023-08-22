"use client"
import axios from 'axios';
import { useEffect, useState, Fragment, JSXElementConstructor, PromiseLikeOfReactNode, ReactElement, ReactNode, ReactPortal, useMemo } from 'react';
import { Dialog, Menu, Transition } from '@headlessui/react'
import { ChevronDownIcon, QuestionMarkCircleIcon } from '@heroicons/react/20/solid'
import { VddwSession } from './api/sessions/route';

type ClientVddwSession = VddwSession & { sessionDate: Date }

function classNames(...classes: any) {
  return classes.filter(Boolean).join(' ')
}


const dateString = (date: Date) => {
  return date ? date.toLocaleString(navigator.language || 'en-us', { weekday: "long", month: "short", day: "numeric", hour: "numeric", minute: "numeric" }) : "";
}

const shortDateString = (date: Date) => {
  return date ? date.toLocaleString(navigator.language || 'en-us', { month: "short", day: "numeric", hour: "numeric", minute: "numeric" }) : "";
}

const filterToString = (filter: { name?: string | null, time?: number | null, vtt?: string | null, dm?: string | null, tier: number | null, tag?: string | null}) =>  {
  if (filter.time || filter.vtt || filter.dm || filter.name || filter.tag || filter.tier) {
    const ret = [];
    if (filter.tag) {
      ret.push(filter.tag)
    }
    if (filter.tier) {
      ret.push(`Tier ${filter.tier > 0 ? filter.tier : "Unknown"}`);
    }
    if (filter.name) {
      ret.push(filter.name)
    }
    if (filter.time) {
        ret.push(`at ${dateString(new Date(filter.time))}`)
    }
    if (filter.dm) {
      ret.push(`with ${filter.dm}`)
    }
    if (filter.vtt) {
      ret.push(`on ${filter.vtt}`)
    }
    return ret.join(", ");
  } else {
    return ""
  }
}

function Dropdown({ title, items =[], onSelect }: { title:string, items:{value:string | number, text: string}[], onSelect: (value: any) => void}) {
  return (
    <Menu as="div" className="relative inline-block text-left">
      <div>
        <Menu.Button className="inline-flex w-full justify-center gap-x-1.5 rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50">
          {title}
          <ChevronDownIcon className="-mr-1 h-5 w-5 text-gray-400" aria-hidden="true" />
        </Menu.Button>
      </div>

      <Transition
        as={Fragment}
        enter="transition ease-out duration-100"
        enterFrom="transform opacity-0 scale-95"
        enterTo="transform opacity-100 scale-100"
        leave="transition ease-in duration-75"
        leaveFrom="transform opacity-100 scale-100"
        leaveTo="transform opacity-0 scale-95"
      >
        <Menu.Items className="absolute left-0 z-10 mt-2 w-56 origin-top-right rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
          <div className="py-1">
            <Menu.Item key={"ANY"}>
                {({ active }) => (
                  <a
                    onClick={(evt) => onSelect(null)}
                    className={classNames(
                      active ? 'bg-gray-100 text-gray-900' : 'text-gray-700',
                      'block px-4 py-2 text-sm'
                    )}
                  >
                    Any
                  </a>
                )}
              </Menu.Item>
            {items.map(item => (
              <Menu.Item key={item.value}>
                {({ active }) => (
                  <a
                    onClick={(evt) => onSelect(item.value)}
                    className={classNames(
                      active ? 'bg-gray-100 text-gray-900' : 'text-gray-700',
                      'block px-4 py-2 text-sm'
                    )}
                  >
                    {item.text}
                  </a>
                )}
              </Menu.Item>
            ))}
          </div>
        </Menu.Items>
      </Transition>
    </Menu>
  )
}
export default function Home() {
  const [sessions, setSessions] = useState<ClientVddwSession[]>([]);
  const [fetchDate, setFetchDate] = useState<Date>(); 
  const [names, setNames] = useState<any>([]); 
  const [dms, setDms] = useState<any>([])
  const [vtts, setVtts] = useState<any>([]);
  const [times, setTimes] = useState<any>([]);
  const [filter, setFilter] = useState({ name: null, time: null, dm: null, vtt: null, tag: null, tier: null, hideSoldOut: false });
  const [filteredResults, setFilteredResults] = useState<ClientVddwSession[]>([]);
  const [tags, setTags] = useState<any>([])
  const tiers = useMemo(() => {
    return [-1, 1, 2, 3, 4].map(t => ({ value: t, text: t > 0 ? `Tier ${t}` : "Unknown"}))
  }, []); 
  
  useEffect(() => {
    axios.get('/api/sessions').then(rsp => {
      let newResults: any[] = [];
      let newDms = new Set();
      let newVtts = new Set();
      let newTimes = new Set();
      let newNames = new Set();
      let newTags = new Set();
      rsp.data.results.forEach((session: VddwSession) => {
        const sessionDate = session.startDate ? new Date(session.startDate as number) : 0
        newResults.push({ ...session, sessionDate: sessionDate });
        if (session.dm) {
          newDms.add(session.dm);
        }
        newNames.add(session.name);
        newVtts.add(session.vtt || 'Unknown');
        newTimes.add(session.startDate);
        if (session.tags?.length) {
          session.tags.forEach(tag => newTags.add(tag));
        }
      })
      setFetchDate(new Date(rsp.data.fetchDate));
      setSessions(newResults);
      setFilteredResults(newResults);
      setTimes(Array.from(newTimes).sort().map(time => { return { value: time || 0, text: time ? dateString(new Date(time as number)) : "No Time" } }));
      setDms(Array.from(newDms).sort().map(dm => { return { value: dm, text: dm } }));
      setNames(Array.from(newNames).sort().map(name => { return { value: name, text: name } }));
      setVtts(Array.from(newVtts).sort().map(vtt => { return { value: vtt, text: vtt } }));
      setTags(Array.from(newTags).sort().map(tag => { return { value: tag, text: tag } }));
    })
  }, []);

  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    if (filter.time || filter.time === 0 || filter.dm || filter.vtt || filter.name || filter.tag || filter.tier || filter.hideSoldOut) {
      let results = sessions;
      if (filter.hideSoldOut === true) {
        results = results.filter((session: ClientVddwSession) => {
          return session.soldOut === false;
        });
      }
      if (filter.tier) {
        results = results.filter((session: ClientVddwSession) => {
          return filter.tier === session.tier;
        });
      }
      if (filter.time || filter.time === 0) {
        results = results.filter((session: ClientVddwSession) => {
          return filter.time === session.startDate;
        })
      }
      if (filter.dm) {
        results = results.filter((session:ClientVddwSession) => {
          return session.dm ? filter.dm === session.dm : false;
        });
      }
      if (filter.vtt) {
        results = results.filter((session: ClientVddwSession) => {
          return session.vtt ? filter.vtt === session.vtt : false;
        });
      }
      if (filter.name) {
        results = results.filter((session: ClientVddwSession) => {
          return session.name ? filter.name === session.name : false;
        });
      }
      
      if (filter.tag) {
        results = results.filter((session: ClientVddwSession) => {
          return session.tags?.length && session.tags.find(tag => tag == filter.tag)
        });
      }
      setFilteredResults(results || []);
    } else {
      setFilteredResults(sessions);
    }
  }, [ filter, sessions])
  if (!sessions) {
    return <h2>Loading...</h2>
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-between">
      {showModal ? (
        <Transition.Root show={showModal} as={Fragment}>
      <Dialog as="div" className="relative z-10" onClose={() => setShowModal(false)}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" />
        </Transition.Child>

        <div className="fixed inset-0 z-10 overflow-y-auto">
          <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
              enterTo="opacity-100 translate-y-0 sm:scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 translate-y-0 sm:scale-100"
              leaveTo="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
            >
              <Dialog.Panel className="relative transform overflow-hidden rounded-lg bg-white px-4 pb-4 pt-5 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-sm sm:p-6">
                <div>
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
                    <img src="/d20.svg" alt="d20"/>
                  </div>
                  <div className="mt-3 sm:mt-5">
                    <Dialog.Title as="h3" className="text-base text-center font-semibold leading-6 text-gray-900">
                      VDDW Fan Site
                    </Dialog.Title>
                    <div className="mt-2">
                      <p className="text-sm mb-4 text-gray-500">
                            All data belongs to Baldman Games, and is fetched on a schedule to be a good citizen of this gaming community.
                            Some data may therefore be out of date until the next refresh; try refresing your page.
                      </p>
                      <p className="text-sm text-gray-500">This is a fan site created exclusively to help people find games at Baldman events,
                          and may be removed at their request</p>
                    </div>
                  </div>
                </div>
                <div className="mt-5 sm:mt-6">
                  <button
                    type="button"
                    className="inline-flex w-full justify-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
                    onClick={() => setShowModal(false)}
                  >
                    Back to the search
                  </button>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition.Root>
  ) : null}
    <div className="px-4 sm:px-6 lg:px-8">
      <div className="sm:flex sm:items-center">
          {fetchDate ? (
            <div className="flex flex-nowrap gap-4">
              <h1 className="text-sm font-semibold leading-6 text-gray-900 whitespace-nowrap">{sessions?.length ? `${sessions.length} ` : " "}VDDW Sessions (Fetched {shortDateString(fetchDate)})</h1>
              <QuestionMarkCircleIcon className="text-gray-900 h-4 w-4" onClick={() => setShowModal(true)}/>
            </div>
            ) : <div className="text-sm font-semibold leading-6 text-gray-900 whitespace-nowrap">Loading...</div>}
        </div>
        <div className="flex flex-wrap gap-4">
          <Dropdown title="Group" items={tags} onSelect={(value) => setFilter((prev) => { return { ...prev, tag: value } })} />
          <Dropdown title="Name" items={names} onSelect={(value) => setFilter((prev) => { return { ...prev, name: value } })} />
          <Dropdown title="Start" items={times} onSelect={(value) => setFilter((prev) => { return { ...prev, time: value } })} />
          <Dropdown title="Tier" items={tiers} onSelect={(value) => setFilter((prev) => { return { ...prev, tier: value } })} />
          <Dropdown title="DM" items={dms} onSelect={(value) => setFilter((prev) => { return { ...prev, dm: value } })} />
          <Dropdown title="VTT" items={vtts} onSelect={(value) => setFilter((prev) => { return { ...prev, vtt: value } })} />
          <div>
            <label htmlFor="soldOut" className="text-sm font-semibold leading-6 mr-2 text-gray-900">Hide Sold Out</label>
            <input
              id="soldOut"
              aria-describedby="comments-description"
              name="soldOut"
              type="checkbox"
              className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-600"
              onChange={evt => setFilter((prev) => { return { ...prev, hideSoldOut: evt.target.checked } })}
            />
          </div>
        </div>
        <div className="text-sm flex flex-col sm:flex-auto pt-2">
          <span className="leading-6 text-gray-900">Filters: {filterToString(filter)}</span>
          {filter.tag || filter.time || filter.dm || filter.vtt || filter.name || filter.tier || filter.hideSoldOut === true? <span className="leading-6 text-gray-900">{filteredResults.length} match{filteredResults.length === 1 ? "" : "es"}</span> : null}
        </div>
        <div>
        </div>
      <div className="mt-4 flow-root">
        <div className="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
          <div className="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
            <table className="min-w-full divide-y divide-gray-300">
              <thead>
                <tr>
                  <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-0">
                    Name
                  </th>
                  <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                    Start
                  </th>
                  <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                    DM
                  </th>
                  <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                    VTT
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredResults.map((session: ClientVddwSession, idx: any) => (
                  <tr key={`${session.name}-${idx}`}>
                    <td className="py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-0">
                      <a className="text-indigo-600 hover:text-indigo-900" href={session.url} target="_new">{session.title}</a>
                    </td>
                    <td className="text-sm text-gray-500">{dateString(session.sessionDate)}</td>
                    <td className="text-sm text-gray-500">{session.dm}</td>
                    <td className="text-sm text-gray-500">{session.vtt}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
    </main>
  )
}
