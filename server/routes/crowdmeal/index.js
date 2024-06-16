import express from 'express'
import { readSecret } from '../../secrets'
import { fetch, J, P } from '../../util'
import * as M from './model'

let GOOGLE_MAPS_KEY
readSecret('maps.json').then(keys => {
    GOOGLE_MAPS_KEY = keys['key']
})

const R = express.Router()
R.get('/profile', J(rq => M.profile(rq.user)))
R.get('/calendar', J(rq => M.calendar(rq.user)))

R.post('/signup', J(rq => M.signup(rq.user, rq.body)))
R.get('/meals', J(rq => M.meals(P(rq, 'zipcode'))))
R.get('/location', J(async rq => {
    const search = new URLSearchParams(rq.query)
    const query = Array
        .from(search.keys())
        .map(k => `${k}=${search.get(k)}`)
        .join('&')
    // console.debug(rq.query, query)
    const { body } = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?key=${GOOGLE_MAPS_KEY}&${query}`)
    const result = (body?.results || [undefined])[0]
    // console.debug(result)
    /*
    {
        address_components: 
            { long_name: '01608', short_name: '01608', types: [ 'postal_code' ] }[],
        formatted_address: 'Worcester, MA 01608, USA',
        geometry:
            bounds: { northeast: [Object], southwest: [Object] },
            location: { lat: -79.93012999999999, lng: 52.00281 },
            location_type: 'GEOMETRIC_CENTER',
            viewport: { northeast: [Object], southwest: [Object] }
        place_id: 'ChIJazO8i0IG5IkRGytB2dnsw_8',
        types: [Array]
    }
    */
    if (!result) throw `Error fetching location details for "${address}"`
    const zipcode = result
        .address_components
        .find(x => x.types.includes('postal_code'))
    return {
        zipcode: zipcode?.short_name,
        location: result.geometry?.location,
    }
}))

export default {
    routes: R,
    model: M, ...M,
}
