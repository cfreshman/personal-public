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

5KZkxg_IaLgzjDw68k7GiIPV9LUEo4x-5qZ6cEDyMYI.A1pm8tDb58JdF_-gMNdkxU_WeVI-9PMwXQ9IdDt2xhk

And make it available on your web server at this URL:

http://tu.fo/.well-known/acme-challenge/5KZkxg_IaLgzjDw68k7GiIPV9LUEo4x-5qZ6cEDyMYI

- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
Press Enter to Continue`
 