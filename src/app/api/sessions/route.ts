import { NextResponse } from "next/server";

const ORDINALS =
        [
        '1st',
        '2nd',
        '3rd',
        '4th',
        '5th',
        '6th',
        '7th',
        '8th',
        '9th',
        '10th',
        '11th',
        '12th',
        '13th',
        '14th',
        '15th',
        '16th',
        '17th',
        '18th',
        '19th',
        '20th'] as const;

const ORDINAL_REGEX: RegExp[] = ORDINALS.map(ord =>  new RegExp(`[^\\d](${ord}).*`));   
    
export type VddwSession = {
    title: string;
    name?: string;
    code?: string;
    tier?: number;
    dm?: string;
    vtt?: string;
    url: string;
    description: string;
    startDate: number;
    tags: string[];
    soldOut: boolean;
    cancelled: boolean;
}

type VddwSessionResponse = {
    results: VddwSession[];
}

const toVddwSession2 = (session: any): VddwSession => {
    // title
    // Table #1 - BMG-MOON-MD-04 - Lair of Deceit - Owlbear.Rodeo
    // Red Carpet Booking - Your Adventures - We Pick the DM
    // ttevents format: "#77 - WBW-DC-ZODIAC-03 - Revenge of the Rakshasa
    const titleLine = session.name.split(' - ')
    let code: string | null = null;
    let dm: string | null = null;
    let vtt: string | null = null;
    let name: string | null = null;
    let tier: number | null = null;
    let soldOut: boolean; 
    if (session?.remaining_tickets === undefined) {
        soldOut = false;
    } else {
        soldOut = session.remaining_tickets === 0;
    }
    const cancelled = session?.is_cancelled;
    if (titleLine.length > 0) {
        //does title contain Table #?
        if (titleLine.length > 2) {
            code = titleLine[1];
            name = titleLine[2];
            //vtt is always last
        } else if (titleLine.length > 1) {
            name = titleLine[1];
        } else {
            name = session.name;
        }
    } else {
        name = null;
        code = null;
        dm = null;
    }

    if (session.description?.length) {
        const ret = session.description.indexOf("\n");
        if (ret > -1) {
            const toReturn = session.description.substring(0, ret).trim();
            const lastHyp = toReturn.lastIndexOf('- ');
            if (lastHyp > -1) {
                vtt = toReturn.substring(lastHyp + 2);
            }
        }
    }
    if (session.room_name?.length) {
        dm = session.room_name.trim()
    }
    
    const shortDescriptionLine = session.description.split(' - ');
    if (shortDescriptionLine.length > 0) {
        const levels = ORDINAL_REGEX.map(ord => ord.exec(session.description))
            .filter(reg => reg?.length && reg.length > 1)
            // @ts-ignore - above prevents null
            .map(reg => /(\d+).*/.exec(reg[1]))
            .filter(reg => reg?.length && reg.length > 1)
            // @ts-ignore - above prevents null
            .map(reg => parseInt(reg[1]));
        if (levels.length) {
            if (levels[0] > 16) {
                tier = 4;
            } else if (levels[0] > 10) {
                tier = 3;
            } else if (levels[0] > 4) {
                tier = 2;
            } else {
                tier = 1;
            }
        } else {
            tier = -1;//unknown
        }
    }
    const ses = {
        title: name || "",
        name: name || undefined,
        code: code || undefined,
        tier: tier || undefined,
        dm: dm || undefined,
        vtt: vtt || undefined,
        url: "https://tabletop.events" + session.view_uri,
        description: session.description,
        startDate: session.start_date_epoch ? session.start_date_epoch * 1000 : 0,
        soldOut,
        cancelled: cancelled === 1,
        tags: [] //session.eventtype_name ? [ session.eventtype_name ] : []
            
    };
    return ses;
}

const ttUrl = "https://5v0bufdx8j-dsn.algolia.net/1/indexes/A0C0B534-037F-11EF-8263-629C9FB4545D_events/browse?x-algolia-agent=Algolia%20for%20JavaScript%20(3.33.0)%3B%20AngularJS%20(1.5.2)&x-algolia-application-id=5V0BUFDX8J&x-algolia-api-key=a25692c12853aea7a77c5a7125498512"
const ttParams = {
    params: "query=&filters=&hitsPerPage=1000&page=0&advancedSyntax=true"
}
export async function GET() {
    const { fetchDate, data } = await new Promise<{ fetchDate: number, data: any }>((resolve, reject) => {
        fetch(ttUrl, {
            method: "POST",
            body: JSON.stringify(ttParams)
        }).then(async rsp => {
            const ds = rsp.headers.get("date");
            const date = ds ? new Date(ds) : new Date();
            resolve({ fetchDate: date.getTime(), data: await rsp.json() })
        });
    });
    
    let results: VddwSession[];
    if (data?.hits) {
        results = data.hits.map(toVddwSession2);
    } else {
        results = [];
    }
  
  return NextResponse.json({ fetchDate, results: results }, {
      status: 200,
      headers: {
        'content-type': 'application/json'
      },
    },)
}