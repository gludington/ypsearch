"use client"
import axios from 'axios';
import { useEffect, useState, Fragment, useMemo } from 'react';
import { Dialog, Menu, Transition, Combobox } from '@headlessui/react'
import { CheckIcon, ChevronDownIcon, QuestionMarkCircleIcon } from '@heroicons/react/20/solid'
import { VddwSession } from './api/sessions/route';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import Skeleton from 'react-loading-skeleton';
import 'react-loading-skeleton/dist/skeleton.css'

type ClientVddwSession = VddwSession & { sessionDate: Date, sessionDay?: string }

const Filters = [
  "name", "time", "vtt", "dm", "tier", "tag", "hideSoldOut"
] as const ;

type FilterType = {
  name?: string | null;
  time?: string | null;
  dt?: string | null;
  vtt?: string | null;
  dm?: string | null;
  tier?: number | null;
  tag?: string | null;
  hideSoldOut?: boolean | null;
}


function useFetchData() {
  const [isLoading, setIsLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  
  useEffect(() => {
    axios.get('/api/sessions').then(rsp => {
      let newResults: any[] = [];
      let newDms = new Set();
      let newVtts = new Set();
      let newTimes = new Set();
      let newNames = new Set();
      let newTags = new Set();
      rsp.data.results.forEach((session: VddwSession) => {
        let sessionFloor;
        let sessionDate;
        let sessionDay;
        if (session.startDate) {
          sessionFloor = session.startDate - session.startDate % 60000;
          sessionDate = new Date(sessionFloor);
          sessionDay = dateString(sessionDate);
        } else {
          sessionFloor = 0;
          sessionDate = 0;
          sessionDay = undefined;
        }
        newResults.push({ ...session, sessionDate, sessionDay});
      
        if (session.dm) {
          newDms.add(session.dm);
        }
        newNames.add(session.name);
        newVtts.add(session.vtt || 'Unknown');
        newTimes.add(sessionDay);
        newTimes.add(sessionFloor);
        if (session.tags?.length) {
          session.tags.forEach(tag => newTags.add(tag));
        }
      })
      let times:{value: string, text: string}[] = [];
      let prev: string | undefined = undefined;
      Array.from(newTimes).sort().forEach((time) => {
        let dayStr;
        let dateStr; 
        if (time) {
          const date = new Date(time as number);
          dayStr = dayString(date);
          dateStr = dateString(date);
          if (prev === undefined || dayStr !== prev) {
            times.push({ value: "all_" + dayStr, text: dayStr })
          }
          prev = dayStr;
        } else {
          dayStr = "No Time";
          dateStr = "No Time";
        }
        times.push({ value: dateStr, text: dateStr })
      })
      setData({
        fetchDate: new Date(rsp.data.fetchDate),
        sessions: newResults,
        times: Array.from(newTimes).sort().map(time => {
          return { value: time || 0, text: time ? dateString(new Date(time as number)) : "No Time" }
        }),
        dts: times,
        dms: Array.from(newDms).sort().map(dm => { return { value: dm, text: dm } }),
        names: Array.from(newNames).sort().map(name => { return { value: name, text: name } }),
        vtts: Array.from(newVtts).sort().map(vtt => { return { value: vtt, text: vtt } }),
        tags: Array.from(newTags).sort().map(tag => { return { value: tag, text: tag } })
      });
      setIsLoading(false);
    });
  }, []);

  return {
    isLoading,
    data
  }
}


function classNames(...classes: any) {
  return classes.filter(Boolean).join(' ')
}


const dateString = (date: Date) => {
  return date ? date.toLocaleString(navigator.language || 'en-us', { weekday: "long", month: "short", day: "numeric", hour: "numeric", minute: "numeric" }) : "";
}

const shortDateString = (date: Date) => {
  return date ? date.toLocaleString(navigator.language || 'en-us', { month: "short", day: "numeric", hour: "numeric", minute: "numeric" }) : "";
}

const dayString = (date: Date) => {
  return date ? date.toLocaleString(navigator.language || 'en-us', {weekday: "long", day: "numeric", month: "short", }) : "";
}


const filterToString = (filter: FilterType) =>  {
  if (filter.time || filter.dt || filter.vtt || filter.dm || filter.name || filter.tag || filter.tier) {
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
    if (filter.dt) {
      ret.push(filter.dt.indexOf("all_") > -1 ? `on ${filter.dt.substring(4)}` : filter.dt === "0" ? "No Time" : `at ${filter.dt}`)
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

function findByValue(items: { value: string | number, text: string }[], value: string | number) {
  return items.find(item => item.value === value);
}

function Dropdown({ title, initial, items =[], onSelect }: { title:string, initial: string | number, items:{value:string | number, text: string}[], onSelect: (value: any) => void}) {
  const [selected, setSelected] = useState(initial ? findByValue(items, initial) : { value: "", text:  `${title} (Any)` })
  const [query, setQuery] = useState('');
  const filteredItems = [{ value: "", text: `${title} (Any)` }, 
    ...(query === ''
      ? items
      : items.filter((item) => {
          return item.text.toLowerCase().includes(query.toLowerCase())
      }))]
  useEffect(() => {
    const item = findByValue(items, initial);
    if (item) {
      setQuery(item.text.toLowerCase())
      setSelected(item);
    } else {
      setQuery("")
    }
      
  }, [items, initial])
  
  return (
      <div className="relative inline-block text-left w-24">
      <Combobox value={selected} onChange={(item) => { setSelected(item); onSelect(item.value) }}>
        <div className="relative mt-1">
          <div className="relative cursor-default overflow-hidden rounded-lg bg-white text-left shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-white/75 focus-visible:ring-offset-2 focus-visible:ring-offset-indigo-300 sm:text-sm">
            <Combobox.Input
              className="w-full border-none py-2 pl-3 pr-10 text-sm leading-5 text-gray-900 focus:ring-0"
              displayValue={(item: { text: string }) => item.text}
              onFocusCapture={(evt) => evt.target.select()}
              onChange={(event) => setQuery(event.target.value)}
            />
            <Combobox.Button className="absolute inset-y-0 right-0 flex items-center pr-2">
              <ChevronDownIcon
                className="h-5 w-5 text-gray-400"
                aria-hidden="true"
              />
            </Combobox.Button>
          </div>
          <Transition
            as={Fragment}
            leave="transition ease-in duration-100"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
            afterLeave={() => setQuery('')}
          >
            <Combobox.Options className="absolute left-0 z-10 w-56 origin-top-right rounded-md bg-white text-base shadow-lg ring-1 ring-black/5 focus:outline-none sm:text-sm">
              {filteredItems.length === 0 && query !== '' ? (
                <div className="relative cursor-default select-none px-4 py-2 text-gray-700">
                  Nothing found.
                </div>
                ) : (
                    <>
                      {filteredItems.map((item: { value: string | number, text: string}) => (
                        <Combobox.Option
                          key={item.value}
                          className={({ active }) =>
                            `relative cursor-default select-none py-2 pl-10 pr-4 ${active ? 'bg-indigo-600 text-white' : 'text-gray-900'
                            }`
                          }
                          value={item}
                        >
                          {({ selected, active }) => (
                            <>
                              <span
                                className={`block truncate ${selected ? 'font-medium' : 'font-normal'
                                  }`}
                              >
                                {item.text}
                              </span>
                              {selected ? (
                                <span
                                  className={`absolute inset-y-0 left-0 flex items-center pl-3 ${active ? 'text-white' : 'text-indigo-600'
                                    }`}
                                >
                                  <CheckIcon className="h-5 w-5" aria-hidden="true" />
                                </span>
                              ) : null}
                            </>
                          )}
                        </Combobox.Option>
                      ))}
                      </>
              )}
            </Combobox.Options>
          </Transition>
        </div>
      </Combobox>
    </div>
  )
}
const emptyResult: ClientVddwSession = {
  title: "",
  url: "",
  description: "",
  startDate: 0,
  sessionDate: new Date(),
  sessionDay: undefined,
  tags: [],
  soldOut: false,
  cancelled: false,
}

export default function Home() {
  const { push } = useRouter();
  const searchParams = useSearchParams();
  const pathName = usePathname();
  const [filter, setFilter] = useState<FilterType>({
    name: searchParams.get("name"),
    time: searchParams.has("time") ? searchParams.get("time") : null,
    dt: searchParams.has("dt") ? searchParams.get("dt") : null,
    dm: searchParams.get("dm"), vtt: searchParams.get("vtt"), tag: searchParams.get("tag"),
    tier: searchParams.has("tier") ? parseInt(searchParams.get("tier") as string) : 0,
    hideSoldOut: searchParams.has("hideSoldOut")
  });
  const tiers = useMemo(() => {
    return [-1, 1, 2, 3, 4].map(t => ({ value: t, text: t > 0 ? `Tier ${t}` : "Unknown"}))
  }, []); 

  const { data, isLoading } = useFetchData();
  
  const [filteredResults, setFilteredResults] = useState<ClientVddwSession[]>([
    emptyResult, emptyResult, emptyResult, emptyResult, emptyResult, emptyResult, emptyResult]);
  
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    if (!isLoading) {
      if (filter.dt || filter.dt === "0" || filter.dm || filter.vtt || filter.name || filter.tag || filter.tier || filter.hideSoldOut) {
        let results = data.sessions;
        let qs: Partial<FilterType> = {};
        if (filter.hideSoldOut === true) {
          qs.hideSoldOut = true;
          results = results.filter((session: ClientVddwSession) => {
            return session.soldOut === false;
          });
        }
        if (filter.tier) {
          qs.tier = filter.tier;
          results = results.filter((session: ClientVddwSession) => {
            return filter.tier === session.tier;
          });
        }
        if (filter.dt || filter.dt === "0") {
          qs.dt = filter.dt;
          const eq = (session: ClientVddwSession) => session.sessionDay === filter.dt;
          const sw = (session: ClientVddwSession) => filter.dt && session.sessionDay?.startsWith(filter.dt.substring(4))
          const zero = (session: ClientVddwSession) => session.sessionDay === undefined;
          const dtF = filter.dt.startsWith("all_") ? sw : filter.dt === "0" ? zero : eq;
          results = results.filter((session: ClientVddwSession) => {
            return dtF(session); 
          })
        }
        if (filter.dm) {
          qs.dm = filter.dm;
          results = results.filter((session: ClientVddwSession) => {
            return session.dm ? filter.dm === session.dm : false;
          });
        }
        if (filter.vtt) {
          qs.vtt = filter.vtt;
          const filterVtt = filter.vtt === 'Unknown' ? undefined : filter.vtt;
          results = results.filter((session: ClientVddwSession) => {
            return filterVtt === session.vtt;
          });
        }
        if (filter.name) {
          qs.name = filter.name;
          results = results.filter((session: ClientVddwSession) => {
            return session.name ? filter.name === session.name : false;
          });
        }
      
        if (filter.tag) {
          qs.tag = filter.tag;
          results = results.filter((session: ClientVddwSession) => {
            return session.tags?.length && session.tags.find(tag => tag == filter.tag)
          });
        }
        push(`${pathName}?${new URLSearchParams(qs as any).toString()}`);
        setFilteredResults(results || []);
      } else {
        push(pathName);
        setFilteredResults(data.sessions);
      }
    }
  }, [ filter, isLoading, data?.sessions, push, pathName])


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
          {!isLoading ? (
            <div className="flex flex-nowrap gap-4">
              <h1 className="text-sm font-semibold leading-6 text-gray-900 whitespace-nowrap">{data.sessions.length ? `${data.sessions.length} ` : " "}VDDW Sessions (Fetched {shortDateString(data.fetchDate)})</h1>
              <QuestionMarkCircleIcon className="text-gray-900 h-4 w-4" onClick={() => setShowModal(true)}/>
            </div>
            ) : <div className="text-sm font-semibold leading-6 text-gray-900 whitespace-nowrap">Loading...</div>}
        </div>
        <div className="flex flex-wrap gap-4">
          <Dropdown title="Group" items={data?.tags ?? []} initial={filter.tag || ""}  onSelect={(value) => setFilter((prev) => { return { ...prev, tag: value } })} />
          <Dropdown title="Tier" items={tiers ?? []} initial={filter.tier ? filter.tier : ""}  onSelect={(value) => setFilter((prev) => { return { ...prev, tier: value } })} />
          <Dropdown title="Name" items={data?.names ?? []} initial={filter.name || ""}  onSelect={(value) => setFilter((prev) => { return { ...prev, name: value } })} />
          <Dropdown title="Start" items={data?.dts ?? []} initial={filter.dt ? filter.dt : ""} onSelect={(value) => setFilter((prev) => { return { ...prev, dt: value } })} />
          <Dropdown title="DM" items={data?.dms ?? []} initial={filter.dm || ""} onSelect={(value) => setFilter((prev) => { return { ...prev, dm: value } })} />
          <Dropdown title="VTT" items={data?.vtts ?? []} initial={filter.vtt || ""} onSelect={(value) => setFilter((prev) => { return { ...prev, vtt: value } })} />
          <div>
            <label htmlFor="soldOut" className="text-sm font-semibold leading-6 mr-2 text-gray-900">Hide Sold Out</label>
            <input
              id="soldOut"
              aria-describedby="comments-description"
              name="soldOut"
              type="checkbox"
              className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-600"
              checked={filter.hideSoldOut === true}
              onChange={evt => setFilter((prev) => { return { ...prev, hideSoldOut: evt.target.checked } })}
            />
          </div>
        </div>
        <div className="text-sm flex flex-col sm:flex-auto pt-2">
          <span className="leading-6 text-gray-900">Filters: {filterToString(filter)}</span>
          {filter.tag || filter.dt || filter.dm || filter.vtt || filter.name || filter.tier || filter.hideSoldOut === true ? <span className="leading-6 text-gray-900">{isLoading ? <Skeleton width={140} /> : <>{filteredResults.length} match{filteredResults.length === 1 ? "" : "es"}</>}</span> : null}
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
                      {isLoading ? <Skeleton width={300} /> : <a className="text-indigo-600 hover:text-indigo-900" href={session.url} target="_new">{session.title}</a>}
                    </td>
                    <td className="text-sm text-gray-500">{isLoading ? <Skeleton width={100}/> : dateString(session.sessionDate)}</td>
                    <td className="text-sm text-gray-500">{isLoading ? <Skeleton width={100}/> : session.dm}</td>
                    <td className="text-sm text-gray-500">{isLoading ? <Skeleton width={100}/> : session.vtt}</td>
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
