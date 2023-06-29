import { NextResponse } from "next/server";

export type VddwSession = {
    title: string;
    name?: string;
    code?: string;
    dm?: string;
    vtt?: string;
    url: string;
    description: string;
    startDate: number;
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
    }

    return {
        title: session.title,
        name: name || undefined,
        code: code || undefined,
        dm: dm || undefined,
        vtt: vtt || undefined,
        url: session.url,
        description: session.description,
        startDate: isRedCarpet ? 0 :session.start_date ? Date.parse(session.start_date) : 0
    };
}

const url = "https://yawningportal.dnd.wizards.com/api/event?chapter=26&page_size=900&status=Live&include_cohosted_events=true&visible_on_parent_chapter_only=true&order_by=start_date&fields=title,start_date,event_type_title,cropped_picture_url,cropped_banner_url,url,cohost_registration_url,description,description_short&page=1";
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
        'content-type': 'application/json',
        'cache-control': 'public, s-maxage=1200, stale-while-revalidate=600',
      },
    },)
}