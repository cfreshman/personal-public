import { writeFileSync } from "fs"

setTimeout(() => {
    console.debug('parse acme challenges')
    input.split('Create a file').map(x => /data:[\s\n]+(.+)\n/.exec(x)).filter(x=>x).map(x => {
        const file = x[1]
        const name = file.split('.')[0]
        writeFileSync(`./public/.well-known/acme-challenge/${name}`, file)
        console.debug(name, 'written')
    })
    console.debug('\nnow write challenge answers to server'.toUpperCase())
})

const input = `Create a file containing just this data:

ctJAA99DF2eP3B6XDB3gcMS02ATX8Vf_Sa8QHiYHICM.A1pm8tDb58JdF_-gMNdkxU_WeVI-9PMwXQ9IdDt2xhk

And make it available on your web server at this URL:

http://cyrusman.xyz/.well-known/acme-challenge/ctJAA99DF2eP3B6XDB3gcMS02ATX8Vf_Sa8QHiYHICM

(This must be set up in addition to the previous challenges; do not remove,
replace, or undo the previous challenge tasks yet.)

- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
Press Enter to Continue`
 