import React from "react"
import { A, HalfLine, InfoBadges, InfoSection, Multiline } from "src/components/Info"
import api from "src/lib/api"
import { useF, useM, useS } from "src/lib/hooks"
import { store } from "src/lib/store"
import { S } from "src/lib/util"
import { Rating } from "./common"
import { InputLabelled } from "src/components/inputs"
const { named_log } = window as any
const log = named_log('was AppEdit')


export default ({ app, handle }) => {
  const { a } = handle
  
  const [review, set_review] = useS({ rating:0, comment:'' })
  const [reviews, set_reviews] = useS(undefined)

  handle = {
    ...handle,
    load_reviews: async (id) => {
      log('load reviews', id)
      const { list } = await api.get(`/was/app/${id}/ratings`)
      set_reviews(list)
      const review = list.find(r => r.user === a.user)
      if (review) set_review(review)
    },
    set_review: (ob) => {
      const existing = reviews.find(review => review.id === ob.id)
      if (existing) {
        Object.assign(existing, ob)
        set_reviews(reviews.slice())
      } else {
        set_reviews([...reviews, ob])
      }
    },
    del_review: (id) => {
      set_reviews(reviews.filter(review => review.id !== id))
    },
  }
  useF(app.id, handle.load_reviews)

  const saved_review = useM(a.user, reviews, review, () => reviews?.find(r => r.user === a.user))
  const has_update = useM(saved_review, review, reviews, () => {
    return saved_review?.rating !== review.rating || saved_review?.comment !== review.comment
  })

  const owned = app.user === a.user

  return <>
    <InfoSection className='section-max'>
      <div className='row wide between'>
        <InfoBadges labels={[
          { '← back': e => handle.nav(e, handle.option) },
        ]} />
        <InfoBadges labels={[
          owned && { 'delete': async () => {
            if (confirm('are you sure? this cannot be undone')) {
              const { item } = await api.delete(`/was/app/${app.id}`)
              handle.del_app(item.id)
              handle.to('', handle.option)
            }
          } },
          owned && { 'edit': e => handle.nav(e, app.id, 'edit') },
          { text: 'open app', href: app.url },
        ]} />
      </div>
      <div className='column gap app-tile' style={S(`
      width: 100%;
      align-items: stretch;
      `)}>
        <div style={S(`
        font-size: 1.5em;
        `)}><b>{app.name}</b>{app.title ? <>: {app.title}</> : null}</div>
        <div className='row wide' style={S(`
        align-items: stretch;
        gap: .5em;
        `)}>
          <div className='column'>
            <img src={app.icon} style={S(`
            height: 10em;
            `)} />
          </div>
          <div className='column'>
            <div style={S(`font-size: 1.25em`)}><Rating rating={app.rating} /></div>
            <div>made by <A tab={`/u/${app.user}`}>{handle.users[app.user].name}</A></div>
            <HalfLine />
            <div>{app.description}</div>
            <div className='spacer' />
          </div>
        </div>
      </div>
      <HalfLine ratio={.25} />
      {review ? <div className='column gap app-review' style={S(`
      width: 100%;
      align-items: stretch;
      `)}>
        <InputLabelled area min_rows={5} label='leave a review' value={review.comment} onChange={e => set_review({ ...review, comment: e.target.value })} />
        {/* <div className='row wide gap'>
          
        </div> */}
        <div className='row wide between'>
          {/* <div /> */}
          <div className='row'>
            {Array.from('★'.repeat(review.rating) + /*'☆'*/'★'.repeat(5-review.rating)).map((star, i) => {
              return <span style={S(`
              color: ${i < review.rating ? '#000' : '#ccc'};
              font-family: duospace, system-ui;
              cursor: pointer;
              font-size: 3em;
              user-select: none;
              `)} onClick={e => {
                set_review({ ...review, rating:i+1 })
              }}>{star}</span>
            })}
          </div>
          <InfoBadges style={S(`align-self: flex-end`)} labels={[
            saved_review && { 'delete': async e => {
              const { item, app:new_app } = await api.delete(`/was/app/${app.id}/rate`)
              handle.del_review(item.id)
              handle.set_app(new_app)
            } },
            !review.rating ? 'select rating' : has_update ? { 'submit': async e => {
              e.target.style['pointer-events'] = 'none'
              const { item, app:new_app } = await api.post(`/was/app/${app.id}/rate`, review)
              handle.set_review(item)
              handle.set_app(new_app)
              e.target.style['pointer-events'] = 'all'
            } } : 'saved',
          ]} />
        </div>
      </div> : null}
      <HalfLine ratio={.25} />
      {reviews ? <>
        {reviews.map(review => {
          return <div className='column gap app-review' style={S(`
          width: 100%;
          align-items: stretch;
          `)}>
            <div className='center-row'>
              <A tab={`/u/${review.user}`}>{review.user}</A>
              &nbsp;
              <div className='row'>
                {Array.from('★'.repeat(review.rating) + /*'☆'*/'★'.repeat(5-review.rating)).map((star, i) => {
                  return <span style={S(`
                  color: ${i < review.rating ? '#000' : '#ccc'};
                  font-family: duospace, system-ui;
                  cursor: pointer;
                  user-select: none;
                  `)}>{star}</span>
                })}
              </div>
            </div>
            <div>{review.comment}</div>
          </div>
        })}
      </> : null}
    </InfoSection>
  </>
}