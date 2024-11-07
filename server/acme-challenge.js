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

0cavMLnJG4TivdLV2u-PoGyyabuFJhwdrpDMcHadU6w.A1pm8tDb58JdF_-gMNdkxU_WeVI-9PMwXQ9IdDt2xhk

And make it available on your web server at this URL:

http://nn.fo/.well-known/acme-challenge/0cavMLnJG4TivdLV2u-PoGyyabuFJhwdrpDMcHadU6w

(This must be set up in addition to the previous challenges; do not remove,
replace, or undo the previous challenge tasks yet.)

- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
Press Enter to Continue

- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
Create a file containing just this data:

pu7RNxhEMiCTfPYF3e5gLZSU3Imm7RQv0Mgi90Rz8qI.A1pm8tDb58JdF_-gMNdkxU_WeVI-9PMwXQ9IdDt2xhk

And make it available on your web server at this URL:

http://xn--uda.fo/.well-known/acme-challenge/pu7RNxhEMiCTfPYF3e5gLZSU3Imm7RQv0Mgi90Rz8qI

(This must be set up in addition to the previous challenges; do not remove,
replace, or undo the previous challenge tasks yet.)

- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
Press Enter to Continue`
 