import React from 'react'
import styled from 'styled-components'
import { InfoBadges, InfoBody, InfoSection, InfoStyles, Loader } from '../../../components/Info'
import { useCachedScript, usePageSettings, usePathState } from 'src/lib/hooks_ext'
import { useE, useF, useM, useR, useS, useStyle } from 'src/lib/hooks'
import api, { auth } from 'src/lib/api'
import { S, server } from 'src/lib/util'
import { meta } from 'src/lib/meta'
import { Dangerous } from 'src/components/individual/Dangerous'
import { ACCENT, TEXT } from '../style'
import { store } from 'src/lib/store'
import { MODALS, PAGES } from '../common'
import { RGBA_ASTC_10x10_Format } from 'src/lib/three'
import url from 'src/lib/url'
import { a_get_geo } from '../func/general'

// import 'https://cdn.jsdelivr.net/npm/ol@v10.2.1/ol.css'

const { named_log, truthy, defer, range, rand, colors } = window as any
const NAME = 'vibe map'
const log = named_log(NAME)

const DEFAULT_ZOOM = 5000
const MAX_POST_RADIUS = 100000
let last_pixel = undefined

let id_to_color_i = {}
const get_color = (id, colors) => {
  if (!id_to_color_i[id]) {
    id_to_color_i[id] = rand.i(colors.length)
  }
  return colors[id_to_color_i[id] % colors.length]
}

let ol
let name_to_activity // shouldn't need here but can't figure out scope issue with on_click
export default ({ handle }) => {
  const { posts, page, id, post_id, preserve_view } = handle.data

  const [ol_loaded, set_ol_loaded] = useS(false)
  useCachedScript('https://cdn.jsdelivr.net/npm/ol@v10.2.1/dist/ol.js', () => set_ol_loaded(true))

  const [a] = auth.use()

  const [zoom, set_zoom] = store.use('vibe-zoom', { default:12 })
  const [geo, set_geo] = store.use('vibe-geo', { default:undefined })

  const map = useR()
  const view = useR()
  const map_2 = useR()
  const pos_feat = useR()
  const set_lat_lang = (lat, lng) => {
    // reposition view without rescaling
    const zoom = view.current.getZoom()
    log({ zoom })
    pos_feat.current.setGeometry(new ol.geom.Circle([lng, lat], DEFAULT_ZOOM))
    view.current.fit(pos_feat.current.getGeometry() as any)
    view.current.setZoom(zoom)
    const center = view.current.getCenter()
    set_geo({ lat:center[1], lng:center[0] })
    set_zoom(view.current.getZoom())
  }

  const post = useM(posts, page, id, post_id, () =>  posts && (post_id || page === PAGES.MAP) && posts.find(x => x.id === (post_id || id) ))
  useF(post, () => log('map post', { post }))
  useE(ol_loaded, posts, post, async () => {
    const uns = []
    
    if (!ol_loaded) return
    ol = window['ol']

    if (!view.current) {
      view.current = new ol.View({
        center: [0, 0],
        zoom: zoom || 11,
      })
    }

    if (!pos_feat.current) {
      const circle = new ol.geom.Circle([0, 0], DEFAULT_ZOOM)
      pos_feat.current = new ol.Feature(circle)
    }

    if (!geo) {
      // get users location
      const generic_geo = await a_get_geo()
      const [lng, lat] = ol.proj.transform([generic_geo.long, generic_geo.lat], 'EPSG:4326', view.current.getProjection())
      set_lat_lang(lat, lng)
    } else {
      set_lat_lang(geo.lat, geo.lng)
    }

    if (!map.current) {
      map.current = new ol.Map({
        layers: [
          new ol.layer.Tile({
            source: new ol.source.OSM(),
          }),
        ],
        controls: [],
        target: 'vibe-map',
        view: view.current,
      })
    }

    // const geolocation = new ol.Geolocation({ projection: view.current.getProjection() })
    // geolocation.setTracking(true)
    // geolocation.on('change:position', () => {
    //   const [lng, lat] = geolocation.getPosition()
    //   console.debug('geoloc', [lng, lat], ol.proj.transform([lng, lat], geolocation.getProjection(), 'EPSG:4326'))
    //   set_lat_lang(lat, lng)
    //   api.get(`/crowdmeal/location?latlng=${
    //     ol.proj.transform([lng, lat], geolocation.getProjection(), 'EPSG:4326').reverse().join(',')
    //   }`).then(x => {
    //     handle.set_zip(x.zipcode)
    //   })
    // })

    if (!posts) return
    
    // index posts
    const activity_to_name = (x) => `activity-${x.id}`
    name_to_activity = Object.fromEntries(posts.map(x => [activity_to_name(x), x]))

    // create circles to simulate activity - small (100) dark purple for 1 activity, large (500) light purple for more
    // randomize location around user
    const PINK = '#ff00ff'
    // const color_steps = colors.gradient_hsl_hex(ACCENT, PINK, 12).slice(0, 6)
    // const color_steps = colors.gradient_hsl_hex(ACCENT, ACCENT, 12).slice(0, 6)
    const color_steps = colors.gradient_hsl_hex(TEXT, TEXT, 12).slice(0, 6)
    const COLOR = colors.gradient_hsl_hex(ACCENT, TEXT, 3)[1]
    const color_options = colors.gradient_hsl_hex(ACCENT, COLOR, 10).slice(5)

    const order = posts.slice()
    // order by time
    order.sort((a, b) => a.t - b.t)
    // put selected post on top
    post && order.sort((a, b) => a.id === post.id ? 1 : b.id === post.id ? -1 : 0)

    const image_features = order.map((activity, i) => {
      const [lng, lat] = ol.proj.transform([activity.long, activity.lat], 'EPSG:4326', view.current.getProjection())
      // const circle = new ol.geom.Circle([lng, lat], 200 + 50 * Math.min(5, activity.n))
      const circle = new ol.geom.Circle([lng, lat], Math.min(MAX_POST_RADIUS, 15 * view.current.getResolution()))
      const feature = new ol.Feature({
        geometry: circle, 
        name: activity_to_name(activity),
      })
      const style = new ol.style.Style({
        fill: new ol.style.Fill({
          color: post && post.id === activity.id ? TEXT+'ee' : get_color(activity.id, color_options)+'ee', // color_steps[Math.min(5, activity.hrefs.length)],
        }),
        
        // // use first post image as icon
        // image: new ol.style.Icon({
        //   anchor: [0.5, 0.5],
        //   anchorXUnits: 'fraction',
        //   anchorYUnits: 'fraction',
        //   color: '#fff',
        //   src: server + activity.hrefs[0],
        //   // crossOrigin: 'anonymous',
        //   width: 64,
        //   height: 64,
        //   rotateWithView: true,
        // }),
      })
      feature.setStyle(style)
      return feature
    })
    
    const source = new ol.source.Vector({ features:image_features })
    const layers = [new ol.layer.Vector({ source })]
    if (map_2.current) {
      map_2.current.setLayerGroup(new ol.layer.Group({ layers }))
    } else {
      map_2.current = new ol.Map({
        layers,
        controls: [],
        target: 'vibe-map-decor',
        view: view.current,
      })
    }

    const on_move = ((e=undefined) => {
      last_pixel = e ? e.pixel : last_pixel
      // set all features to default circle geometry, then increase scale of hovered feature
      let hit = false
      map_2.current.getLayers().forEach(layer => {
        layer.getSource().getFeatures().forEach(feature => {
          feature.getGeometry().setRadius(Math.min(MAX_POST_RADIUS, 15 * view.current.getResolution()))
        })
      })
      last_pixel && map_2.current.forEachFeatureAtPixel(last_pixel, (feature, layer) => {
        if (hit) return
        hit = true
        feature.getGeometry().setRadius(1.2 * Math.min(MAX_POST_RADIUS, 15 * view.current.getResolution()))
      })
      if (hit) {
        map_2.current.getTargetElement().style.cursor = 'pointer'
      } else {
        map_2.current.getTargetElement().style.cursor = ''
      }
    }).bind(this)
    map_2.current.on('pointermove', on_move)
    uns.push(() => map_2.current.un('pointermove', on_move))

    const on_click = e => {
      const features = map_2.current.getFeaturesAtPixel(e.pixel)
      if (features.length) {
        // handle.set_post_id(name_to_activity[feature.get('name')].id)
        // handle.set_modal(MODALS.POST)
        handle.set_path([MODALS.POST, features.map(feature => name_to_activity[feature.get('name')].id).join('&')])
      } else {
        handle.set_path([])
      }
    }
    map_2.current.on('click', on_click)
    uns.push(() => map_2.current.un('click', on_click))

    const update_size = () => {
      // resize features to match zoom
      const center = view.current.getCenter()
      set_geo({ lat:center[1], lng:center[0] })
      set_zoom(view.current.getZoom())

      on_move()
    }
    view.current.on('change', update_size)
    uns.push(() => view.current.un('change', update_size))

    update_size()
    if (post && !preserve_view) {
      const [lng, lat] = ol.proj.transform([post.long, post.lat], 'EPSG:4326', view.current.getProjection())
      // view.current.setZoom(20)
      set_lat_lang(lat, lng)
      handle.set_preserve_view(true)
    } else {
      // handle.set_preserve_view(true)
    }

    return () => uns.forEach(fn => fn())
  })
  // useF(ol_loaded, zip, async () => {
  //   if (!ol_loaded) return

  //   const { location } = await api.get(`/crowdmeal/location?address=${zip}`)
  //   log('zip', zip, location, ol.proj.transform([location.lng, location.lat], 'EPSG:4326', view.current.getProjection()))
  //   if (location) {
  //     const [lng, lat] = ol.proj.transform([location.lng, location.lat], 'EPSG:4326', view.current.getProjection())
  //     set_lat_lang(lat, lng)
  //   }
  // })

  return <>
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/ol@v10.2.1/ol.css" />
    <div className='column wide tall float' style={S(`
    position: relative;
    `)}>
      <div id="vibe-map" className="map cover" style={S(`
      filter: grayscale(1) contrast(1.2);
      filter: grayscale(1) brightness(80%) contrast(150%);
      filter: grayscale(1) invert(1);
      `)} />
      <div className='cover' style={S(`
      background: var(--id-color-accent);
      pointer-events: none;
      opacity: .025;
      `)} />
      <div id="vibe-map-decor" className="map cover" style={S(`
      ${!posts ? 'pointer-events: none;' : ''}
      `)}/>
      <div id='vibe-map-overlay' className='cover' style={S(`
      padding: .5em;
      pointer-events: none;
      `)}>
        <style>{`
        #vibe-map-overlay .badges > * {
          pointer-events: all;
        }
        `}</style>
        <InfoBadges labels={[
          { 'recenter': async () => {
            // reset view to user location
            const generic_geo = await a_get_geo()
            const [lng, lat] = ol.proj.transform([generic_geo.long, generic_geo.lat], 'EPSG:4326', view.current.getProjection())
            set_lat_lang(lat, lng)
            view.current.setRotation(0)
            handle.set_path([])
          } },
          post && { 'directions': () => {
            // open google maps
            url.new(`https://www.google.com/maps/dir/?api=1&destination=${post.lat},${post.long}`)
          } },
        ]} />
      </div>
      {!posts ? 
      <div className='cover center'>
        <div className='center-row spaced float'>loading map <Loader /></div>
      </div> : null}
    </div>
  </>
}