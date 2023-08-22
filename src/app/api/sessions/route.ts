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
}

type VddwSessionResponse = {
    results: VddwSession[];
}

const toVddwSession = (session: any): VddwSession => {
    // title
    // Table #1 - BMG-MOON-MD-04 - Lair of Deceit - Owlbear.Rodeo
    // Red Carpet Booking - Your Adventures - We Pick the DM
    const titleLine = session.title.split(' - ')
    let isRedCarpet: boolean;
    let code: string | null = null;
    let dm: string | null = null;
    let vtt: string | null = null;
    let name: string | null = null;
    let tier: number | null = null;
    
    let soldOut: boolean = session.total_attendees && session.total_attendees >= 5 ? true : false ;
    if (titleLine.length > 0) {
        //does title contain Table #?
        if (titleLine[0].indexOf("Table #") > -1) {
            isRedCarpet = false;
            code = titleLine[1];
            name = titleLine[1] + ' - ' + titleLine[2];
            //vtt is always last
            const vttCandidate = titleLine[titleLine.length - 1];
            vtt = vttCandidate;
        } else {
            isRedCarpet = true;
            name = session.title;
        }
    } else {
        isRedCarpet = true;
        name = null;
        code = null;
        dm = null;
        vtt = null;
    }

    const shortDescriptionLine = session.description_short.split(' - ');
    if (shortDescriptionLine.length > 0) {
        const dmSegment = shortDescriptionLine.find((desc: string | string[]) => desc.indexOf("DM: ") > -1)
        dm = dmSegment ? dmSegment.substring("DM :".length) : undefined;
        const levels = ORDINAL_REGEX.map(ord => ord.exec(session.description_short))
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

    return {
        title: session.title,
        name: name || undefined,
        code: code || undefined,
        tier: tier || undefined,
        dm: dm || undefined,
        vtt: vtt || undefined,
        url: session.url,
        description: session.description,
        startDate: isRedCarpet ? 0 : session.start_date ? Date.parse(session.start_date) : 0,
        soldOut,
        tags: session.tags ? session.tags.filter((tag: string) => tag.indexOf("day") === -1 && tag.indexOf("UTC") === -1) : []
    };
}

const url = "https://yawningportal.dnd.wizards.com/api/event?chapter=26&page_size=900&status=Live&include_cohosted_events=true&visible_on_parent_chapter_only=true&order_by=start_date&fields=title,start_date,event_type_title,url,cohost_registration_url,total_attendees,tags,description_short&page=1";
export async function GET() {
    const { fetchDate, data } = await new Promise<{ fetchDate: number, data: any }>((resolve, reject) => {
        fetch(url, { next: { revalidate: 120 } }).then(async rsp => {
            const ds = rsp.headers.get("date");
            const date = ds ? new Date(ds) : new Date();
            resolve({ fetchDate: date.getTime(), data: await rsp.json() });
        })
    });
    let results: VddwSession[];
    if (data?.results?.length) {
        results = data.results.map(toVddwSession);
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