import React from 'react'
import { auth } from 'src/lib/api'
import { useF, useM, useR, useS } from 'src/lib/hooks'
import { useCachedScript } from 'src/lib/hooks_ext'
import { A, InfoLoginBlock, InfoSection } from '../../components/Info'
import { S } from 'src/lib/util'
import { store } from 'src/lib/store'
import { Scroller } from 'src/components/Scroller'
import { prompt_label, prompts } from './quiz'


const { named_log, list, strings, truthy, QQ, Q, objects, rand } = window as any
const log = named_log('greeter summary')

export const Summary = ({ user=undefined, handle=undefined }={}) => {

  const [{ user:viewer }] = auth.use()
  const self = user === viewer
  const [summary, set_summary] = useS(undefined)
  useF(user, () => handle.load_summary(user, set_summary))

  const comments = useM(user, summary, () => {
    if (!summary) return undefined
    const { meets } = summary
    return meets.map(meet => {
      const other = meet.users.find(x => x !== user)
      return {
        comment: meet.public[other],
        other,
      }
    }).filter(x => x.comment)
  })
  const quiz = useM(user, summary, () => {
    if (!summary) return undefined
    log({summary})
    const { meets } = summary
    const composed_quiz = {}
    meets.map(meet => {
      const other = meet.users.find(x => x !== user)
      const quiz = meet.quiz[other]
      quiz && prompts.map(k => {
        const v = quiz[k]
        composed_quiz[k] = (composed_quiz[k] || []).concat([{
          comment: v,
          other,
        }]).filter(x => x.comment)
      })
    })
    // shuffle each entry
    return objects.from(objects.entries(composed_quiz).map(e => [e[0], rand.shuffle(e[1])]))
  })

  const show_empty = useM(summary, comments, () => summary && comments && !comments.length)
  
  return <>
    <InfoSection className='section-calendar' labels={[
      self ? `your summary` : `${user}'s summary`,
      { [self ? 'view your meets' : `view ${user}'s meets`]: () => handle.setPath([user]) },
      !self && { [`view your meet`]: () => handle.setPath([viewer, 'met', user]) },
    ]}>
      <InfoLoginBlock inline to='view summary'>
        {summary === undefined ? <div>loading summary</div> : null}
        {show_empty ? <div>aggregate answers will show up here</div> : null}
        {comments?.length ? <div className='card' style={S(`width: 100%;`)}>
          COMMENTS
          <div className='column wide gap'>
            {comments?.map(({comment,other}) => <A href={`/greeter/${user}/met/${other}`} className='card-inner row wide'>
              {comment}
            </A>)}
          </div>
        </div> : null}
        {quiz ? objects.entries(quiz).map(([k,v]) => v.length ? <div className='card' style={S(`width: 100%;`)}>
          {prompt_label(k)}
          <div className='row gap wrap'>
            {v?.map(({comment,other}) => <A href={`/greeter/${user}/quiz/${other}`} className='card-inner' style={S(`
            display: inline-block;
            min-width: 0;
            `)}>
              {comment}
            </A>)}
          </div>
        </div> : null) : null}
      </InfoLoginBlock>
    </InfoSection>
  </>
}
