import fs from 'fs'
import express from 'express'
import { J, P, named_log, staticPath } from '../../util'
import path from 'path'

const log = named_log('donoboard')

const TARGET = 6000
const RATE = 2

const user_mapping = {
    'the dev': {
        'cyrus': 'cyrus',
    },
    'github.com': {
        // 'CyrusMom': 'mwiggin',
    },
}

let x = [{ "sponsor_handle": "CyrusMom", "sponsor_profile_name": null, "sponsor_public_email": null, "sponsorship_started_on": "2024-05-28T17:26:53.917-04:00", "is_public": true, "is_yearly": false, "transactions": [{ "transaction_id": "ch_3PWiLqEQsq43iHhX0F9eiEru", "tier_name": "$20 a month", "tier_monthly_amount": "$20.00", "processed_amount": "$20.00", "is_prorated": false, "status": "settled", "transaction_date": "2024-06-28T13:24:46.000-04:00", "billing_country": "USA", "billing_region": "Massachusetts", "vat": null }, { "transaction_id": "ch_3PLXXqEQsq43iHhX1vCWBboB", "tier_name": "$20 a month", "tier_monthly_amount": "$20.00", "processed_amount": "$20.00", "is_prorated": false, "status": "settled", "transaction_date": "2024-05-28T17:27:04.000-04:00", "billing_country": "USA", "billing_region": "Massachusetts", "vat": null }], "payment_source": "github", "metadata": {} }, { "sponsor_handle": "lauratsang", "sponsor_profile_name": null, "sponsor_public_email": null, "sponsorship_started_on": "2024-05-27T20:41:16.199-04:00", "is_public": false, "is_yearly": false, "transactions": [{ "transaction_id": "ch_3PWLxxEQsq43iHhX0Whd24nC", "tier_name": "$1 a month", "tier_monthly_amount": "$1.00", "processed_amount": "$1.00", "is_prorated": false, "status": "settled", "transaction_date": "2024-06-27T13:18:44.000-04:00", "billing_country": "USA", "billing_region": "New Jersey", "vat": null }, { "transaction_id": "ch_3PLE6OEQsq43iHhX1cUuWEdc", "tier_name": "$1 a month", "tier_monthly_amount": "$1.00", "processed_amount": "$1.00", "is_prorated": false, "status": "settled", "transaction_date": "2024-05-27T20:41:27.000-04:00", "billing_country": "USA", "billing_region": "New Jersey", "vat": null }], "payment_source": "github", "metadata": {} }, { "sponsor_handle": "sherfman", "sponsor_profile_name": null, "sponsor_public_email": null, "sponsorship_started_on": "2023-02-22T08:16:22.719-05:00", "is_public": false, "is_yearly": false, "transactions": [{ "transaction_id": "ch_3PZkOrEQsq43iHhX1DaZ9rfI", "tier_name": "$2 a month", "tier_monthly_amount": "$2.00", "processed_amount": "$1.07", "is_prorated": true, "status": "settled", "transaction_date": "2024-07-06T22:00:32.000-04:00", "billing_country": "USA", "billing_region": "Massachusetts", "vat": null }, { "transaction_id": "ch_3PZkOrEQsq43iHhX1DaZ9rfI", "tier_name": "$1 a month", "tier_monthly_amount": "$1.00", "processed_amount": "$-0.53", "is_prorated": true, "status": "settled", "transaction_date": "2024-07-06T22:00:32.000-04:00", "billing_country": "USA", "billing_region": "Massachusetts", "vat": null }, { "transaction_id": "ch_3PUXwiEQsq43iHhX0lmp2gVt", "tier_name": "$1 a month", "tier_monthly_amount": "$1.00", "processed_amount": "$1.00", "is_prorated": false, "status": "settled", "transaction_date": "2024-06-22T13:41:59.000-04:00", "billing_country": "USA", "billing_region": "Massachusetts", "vat": null }, { "transaction_id": "ch_3PJIveEQsq43iHhX0H5Els8D", "tier_name": "$1 a month", "tier_monthly_amount": "$1.00", "processed_amount": "$1.00", "is_prorated": false, "status": "settled", "transaction_date": "2024-05-22T13:41:10.000-04:00", "billing_country": "USA", "billing_region": "Massachusetts", "vat": null }, { "transaction_id": "ch_3P8Q9pEQsq43iHhX17pSGeQ7", "tier_name": "$1 a month", "tier_monthly_amount": "$1.00", "processed_amount": "$1.00", "is_prorated": false, "status": "settled", "transaction_date": "2024-04-22T13:12:21.000-04:00", "billing_country": "USA", "billing_region": "Massachusetts", "vat": null }, { "transaction_id": "ch_3OxBqnEQsq43iHhX1qleLQa8", "tier_name": "$1 a month", "tier_monthly_amount": "$1.00", "processed_amount": "$1.00", "is_prorated": false, "status": "settled", "transaction_date": "2024-03-22T13:26:01.000-04:00", "billing_country": "USA", "billing_region": "Massachusetts", "vat": null }, { "transaction_id": "ch_3OmgxmEQsq43iHhX1Eii82xl", "tier_name": "$1 a month", "tier_monthly_amount": "$1.00", "processed_amount": "$1.00", "is_prorated": false, "status": "settled", "transaction_date": "2024-02-22T13:35:16.000-05:00", "billing_country": "USA", "billing_region": "Massachusetts", "vat": null }, { "transaction_id": "ch_3ObS8GEQsq43iHhX13ZRV9gV", "tier_name": "$1 a month", "tier_monthly_amount": "$1.00", "processed_amount": "$1.00", "is_prorated": false, "status": "settled", "transaction_date": "2024-01-22T13:32:00.000-05:00", "billing_country": "USA", "billing_region": "Massachusetts", "vat": null }, { "transaction_id": "ch_3OQDBGEQsq43iHhX1moD1Ner", "tier_name": "$1 a month", "tier_monthly_amount": "$1.00", "processed_amount": "$1.00", "is_prorated": false, "status": "settled", "transaction_date": "2023-12-22T13:20:16.000-05:00", "billing_country": "USA", "billing_region": "Massachusetts", "vat": null }, { "transaction_id": "ch_3OFL3PEQsq43iHhX0pEvTXv3", "tier_name": "$1 a month", "tier_monthly_amount": "$1.00", "processed_amount": "$1.00", "is_prorated": false, "status": "settled", "transaction_date": "2023-11-22T13:21:50.000-05:00", "billing_country": "USA", "billing_region": "Massachusetts", "vat": null }, { "transaction_id": "ch_3O456TEQsq43iHhX15dkkqey", "tier_name": "$1 a month", "tier_monthly_amount": "$1.00", "processed_amount": "$1.00", "is_prorated": false, "status": "settled", "transaction_date": "2023-10-22T13:06:49.000-04:00", "billing_country": "USA", "billing_region": "Massachusetts", "vat": null }, { "transaction_id": "ch_3NtD7DEQsq43iHhX0iM766aJ", "tier_name": "$1 a month", "tier_monthly_amount": "$1.00", "processed_amount": "$1.00", "is_prorated": false, "status": "settled", "transaction_date": "2023-09-22T13:26:20.000-04:00", "billing_country": "USA", "billing_region": "Massachusetts", "vat": null }, { "transaction_id": "ch_3NhxxnEQsq43iHhX0VZAz7e7", "tier_name": "$1 a month", "tier_monthly_amount": "$1.00", "processed_amount": "$1.00", "is_prorated": false, "status": "settled", "transaction_date": "2023-08-22T13:02:09.000-04:00", "billing_country": "USA", "billing_region": "Massachusetts", "vat": null }, { "transaction_id": "ch_3NWij7EQsq43iHhX1AmAp640", "tier_name": "$1 a month", "tier_monthly_amount": "$1.00", "processed_amount": "$1.00", "is_prorated": false, "status": "settled", "transaction_date": "2023-07-22T12:32:28.000-04:00", "billing_country": "USA", "billing_region": "Massachusetts", "vat": null }, { "transaction_id": "ch_3NLqlYEQsq43iHhX1OdmOto6", "tier_name": "$1 a month", "tier_monthly_amount": "$1.00", "processed_amount": "$1.00", "is_prorated": false, "status": "settled", "transaction_date": "2023-06-22T12:54:00.000-04:00", "billing_country": "USA", "billing_region": "Massachusetts", "vat": null }, { "transaction_id": "ch_3NAc8OEQsq43iHhX0VgJXIrF", "tier_name": "$1 a month", "tier_monthly_amount": "$1.00", "processed_amount": "$1.00", "is_prorated": false, "status": "settled", "transaction_date": "2023-05-22T13:43:22.000-04:00", "billing_country": "USA", "billing_region": "Massachusetts", "vat": null }, { "transaction_id": "ch_3MzjksEQsq43iHhX0gXBfU0k", "tier_name": "$1 a month", "tier_monthly_amount": "$1.00", "processed_amount": "$1.00", "is_prorated": false, "status": "settled", "transaction_date": "2023-04-22T12:58:57.000-04:00", "billing_country": "USA", "billing_region": "Massachusetts", "vat": null }, { "transaction_id": "ch_3MoUAnEQsq43iHhX1ZVcEHOO", "tier_name": "$1 a month", "tier_monthly_amount": "$1.00", "processed_amount": "$1.00", "is_prorated": false, "status": "settled", "transaction_date": "2023-03-22T12:06:09.000-04:00", "billing_country": "USA", "billing_region": "Massachusetts", "vat": null }, { "transaction_id": "ch_3MeIBMEQsq43iHhX0eAiV9Z0", "tier_name": "$1 a month", "tier_monthly_amount": "$1.00", "processed_amount": "$1.00", "is_prorated": false, "status": "settled", "transaction_date": "2023-02-22T08:16:50.000-05:00", "billing_country": "USA", "billing_region": "Massachusetts", "vat": null }], "payment_source": "github", "metadata": {} }]

export const get_sponsors = () => {
    const sponsors = []

    // const raw_github_sponsors = await fetch('/raw/donoboard/cfreshman-sponsorships-all-time.json').then(r => r.json())
    const raw_github_sponsors = JSON.parse(fs.readFileSync(path.join(staticPath, 'raw/donoboard/cfreshman-sponsorships-all-time.json')).toString())
    raw_github_sponsors.map(x => {
        const last_transaction = x.transactions[0]
        sponsors.push({
            dono: Number(last_transaction.tier_monthly_amount.slice(1)),
            name: x.is_public && x.sponsor_handle,
            source: 'github.com',
            url: x.is_public && `https://github.com/${x.sponsor_handle}`,
        })
    })

    const total_taken = sponsors.map(x => x.dono).reduce((x, acc) => x + acc)
    const remaining = TARGET - total_taken

    if (remaining > 0) sponsors.push({
        // slots: 0,
        dono: TARGET - total_taken,
        name: 'cyrus',
        source: 'the dev',
        // url: `https://freshman.dev/u/cyrus`,
        url: 'https://freshman.dev',
    })
    sponsors.sort((a, b) => b.dono - a.dono)
    sponsors.map(sponsor => {
        sponsor.u = (user_mapping[sponsor.source]||{})[sponsor.name]
        sponsor.display = sponsor.u ? `@${sponsor.u}` : sponsor.name
        sponsor.slots = sponsor.dono / RATE
    })

    return sponsors
}

const R = express.Router();
R.get('/', J(async rq => {
    return get_sponsors()
}))

export default {
    routes: R,
    io: (io, socket, info) => {
        socket.emit('sponsors', get_sponsors())
    },
}