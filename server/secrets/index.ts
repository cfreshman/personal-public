import fs from 'fs';
import path from 'path';
import { basedir } from '../util';

export const SECRETS_PATH = basedir() + '/secrets/files';
console.debug('SECRETS', SECRETS_PATH)

export async function readSecret(relativePath) {
    return new Promise((resolve, reject) => {
        fs.readFile(path.join(SECRETS_PATH, relativePath), (error, content) => {
            if (error) {
                let msg = `error loading secret ${relativePath}`
                console.log(msg, error)
                return reject({ msg, error })
            }
            return resolve(JSON.parse(content.toString()))
        })
    })
}
export async function writeSecret(relativePath, content) {
    return new Promise((resolve, reject) => {
        fs.writeFile(path.join(SECRETS_PATH, relativePath), JSON.stringify(content), (err) => {
            if (err) {
                console.error(err)
                return reject(err)
            }
            console.log(`wrote secret ${relativePath}`)
            return resolve(true)
        });
    })
}

export default { SECRETS_PATH, readSecret, writeSecret }