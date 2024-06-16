export const APP_COOKIE = {
    HANGOUT_PREFILL: 'hangout-prefill',
}

export type meet = {
    id: string,
    users: [string, string],
    t: number,
    location: string,
    links: string[],
    icon: string,
    icon_url: string,
    public: { [key:string]:string },
    private: { [key:string]:string },
    group: { [key:string]:string },
    quiz: { [key:string]:{[key:string]:string} },
}

export type hangout = {
    id: string,
    users: string[],
    t: number,
    title: string,
    location: string,
    public: { [key:string]:string },
    links: string[],
    icon: string,
    icon_url: string,
    code?: string,
}