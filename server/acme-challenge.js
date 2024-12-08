import { writeFileSync } from "fs"

setTimeout(() => {
    console.debug('parse acme challenges')
    input.split('Create a file').map(x => /data:[\s\n]+(.+)\n/.exec(x)).filter(x=>x).map(x => {
        const file = x[1]
        const name = file.split('.')[0]
        writeFileSync(`./public/.well-known/acme-challenge/${name}`, file)
        console.debug(name, 'written')
    })
    console.debug('\nnow write challenge answers to server\n'.toUpperCase())
})

const input = `Create a file containing just this data:

wsr6oKw8L7BPyQOB65ueD9vxazD0tnt2XPLj2HTgKbw.A1pm8tDb58JdF_-gMNdkxU_WeVI-9PMwXQ9IdDt2xhk

And make it available on your web server at this URL:

http://nn.fo/.well-known/acme-challenge/wsr6oKw8L7BPyQOB65ueD9vxazD0tnt2XPLj2HTgKbw

(This must be set up in addition to the previous challenges; do not remove,
replace, or undo the previous challenge tasks yet.)

- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
Press Enter to Continue

- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
Create a file containing just this data:

vDtTblXBvnR75Ga-y2hQr4p8IGVtc6WWp_Eah5rp96I.A1pm8tDb58JdF_-gMNdkxU_WeVI-9PMwXQ9IdDt2xhk

And make it available on your web server at this URL:

http://tu.fo/.well-known/acme-challenge/vDtTblXBvnR75Ga-y2hQr4p8IGVtc6WWp_Eah5rp96I

(This must be set up in addition to the previous challenges; do not remove,
replace, or undo the previous challenge tasks yet.)

- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
Press Enter to Continue`
 