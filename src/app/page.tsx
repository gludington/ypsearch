"use client"
import axios from 'axios';
import { useEffect, useState, Fragment, JSXElementConstructor, PromiseLikeOfReactNode, ReactElement, ReactNode, ReactPortal } from 'react';
import { Menu, Transition } from '@headlessui/react'
import { ChevronDownIcon } from '@heroicons/react/20/solid'

function classNames(...classes: any) {
  return classes.filter(Boolean).join(' ')
}


const dateString = (date: Date) => {
  return date ? date.toLocaleString(navigator.language || 'en-us', { weekday: "long", month: "short", day: "numeric", hour: "numeric", minute: "numeric" }) : "";
}

const filterToString = (filter: { time?: number | null, vtt?: string | null, dm?: string | null }) =>  {
  if (filter.time || filter.vtt || filter.dm) {
    const ret = [];
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

function Dropdown({ title, items =[], onSelect }: { title:string, items:{value:string, text: string}[], onSelect: (value: any) => void}) {
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
  const [sessions, setSessions] = useState<any>([]);
  const [dms, setDms] = useState<any>([])
  const [vtts, setVtts] = useState<any>([]);
  const [times, setTimes] = useState<any>([]);
  const [filter, setFilter] = useState({ time: null, dm: null, vtt: null });
  const [filteredResults, setFilteredResults] = useState<any>([]);
  
  useEffect(() => {
    axios.get('/api/sessions').then(rsp => {
      let newResults: any[] = [];
      let newDms = new Set();
      let newVtts = new Set();
      let newTimes = new Set();
      rsp.data.results.forEach((session: { startDate: unknown; dm: unknown; vtt: any; }) => {
        const sessionDate = session.startDate ? new Date(session.startDate as number) : null
        newResults.push({ ...session, startDate: sessionDate });
        if (session.dm) {
          newDms.add(session.dm);
        }
        newVtts.add(session.vtt || 'Unknown');
        newTimes.add(session.startDate);
      })
      setSessions(newResults);
      setFilteredResults(newResults);
      setTimes(Array.from(newTimes).sort().map(time => { return { value: time || 0, text: time ? dateString(new Date(time as number)) : "No Time" } }));
      setDms(Array.from(newDms).sort().map(dm => { return { value: dm, text: dm } }));
      setVtts(Array.from(newVtts).sort().map(vtt => { return { value: vtt, text: vtt } }));
    })
  }, []);
  useEffect(() => {
    if (filter.time || filter.dm || filter.vtt) {
      let results = sessions;
      if (filter.time) {
        results = results.filter((session: { startDate: { getTime: () => null; }; }) => {
          return session.startDate ? filter.time === session.startDate.getTime() : false;
        })
      }
      if (filter.dm) {
        results = results.filter((session: { dm: null; }) => {
          return session.dm ? filter.dm === session.dm : false;
        });
      }
      if (filter.vtt) {
        results = results.filter((session: { vtt: null; }) => {
          return session.vtt ? filter.vtt === session.vtt : false;
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
    <div className="px-4 sm:px-6 lg:px-8">
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
            <h1 className="text-base font-semibold leading-6 text-gray-900">{sessions?.length ? `${sessions.length} ` : ""}Sessions at VDDW</h1>
        </div>
        </div>
        <div className="flex gap-4">
          <Dropdown title="Start Time" items={times} onSelect={(value) => setFilter((prev) => { return { ...prev, time: value } })} />
          <Dropdown title="DM" items={dms} onSelect={(value) => setFilter((prev) => { return { ...prev, dm: value } })} />
          <Dropdown title="VTT" items={vtts} onSelect={(value) => setFilter((prev) => { return { ...prev, vtt: value } })} />
        </div>
        <div className="flex flex-col sm:flex-auto pt-2">
          <span className="leading-6 text-gray-900">Filters: {filterToString(filter)}</span>
          {filter.time || filter.dm || filter.vtt ? <span className="text-sm leading-6 text-gray-900">{filteredResults.length} matches</span> : null}
        </div>
        <div>
        </div>
      <div className="mt-8 flow-root">
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
                {filteredResults.map((session: { name: any; url: string | undefined; title: string | number | boolean | ReactElement<any, string | JSXElementConstructor<any>> | Iterable<ReactNode> | ReactPortal | PromiseLikeOfReactNode | null | undefined; startDate: Date; dm: string | number | boolean | ReactElement<any, string | JSXElementConstructor<any>> | Iterable<ReactNode> | ReactPortal | PromiseLikeOfReactNode | null | undefined; vtt: string | number | boolean | ReactElement<any, string | JSXElementConstructor<any>> | Iterable<ReactNode> | ReactPortal | PromiseLikeOfReactNode | null | undefined; }, idx: any) => (
                  <tr key={`${session.name}-${idx}`}>
                    <td className="py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-0">
                      <a className="text-indigo-600 hover:text-indigo-900" href={session.url} target="_new">{session.title}</a>
                    </td>
                    <td className="text-sm text-gray-500">{dateString(session.startDate)}</td>
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
