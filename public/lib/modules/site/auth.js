import api from './api.js';
import { getStored, setStored } from './store.js';

export async function sha256(message) {
    if (window.origin.includes('http://')) {
        // this is the development environment
        return message
    }
    const msgUint8 = new TextEncoder().encode(message);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    return hashHex;
}


const authTriggers = [
    auth => auth.user && verify(auth.user, auth.token).then(res => {
        if (!res.ok) {
            logout();
        }
    })
];
export function addAuthTrigger(callback) {
    authTriggers.push(callback);
    callback(auth);
}
export function removeAuthTrigger(callback) {
    let index = authTriggers.indexOf(callback);
    if (index > -1) authTriggers.splice(index, 1);
}

const AUTH_COOKIE = 'loginAuth'
function setAuth(user, token, /* opt */ dropdown) {
    Object.assign(auth, { user, token, dropdown });
    // console.log('auth', auth)
    setStored(AUTH_COOKIE, auth);
    authTriggers.forEach(callback => callback(auth));
}
export const auth = getStored(AUTH_COOKIE) || { user: undefined, token: undefined, dropdown: false };
setTimeout(() => setAuth(auth.user, auth.token), 500); // verify auth after api has loaded
setInterval(() => {
    let { user, token } = getStored(AUTH_COOKIE)
    if (user != auth.user) {
        setAuth(user, token)
    }
}, 500)

export function logout() {
    setAuth('', '');
}

export function openLogin() {
    setAuth(auth.user, auth.token, true);
}

export function handleAuth(data) {
    console.log(data);
    if (data.token) {
        Object.assign(auth, data);
        setTimeout(() => setAuth(data.user, data.token), 0);
    }
    return auth
}

function signin(path, user, pass) {
    return new Promise((resolve, reject) => {
        sha256(pass)
            .then(hash => api.post(path, {
                user,
                pass: hash,
            }))
            .then(data => resolve(handleAuth(data)))
            .catch(err => {
                console.log('err', err);
                reject(err);
            });
    });
}

export function login(user, pass) {
    return signin('/login', user, pass);
}

export function signup(user, pass) {
    return signin('/login/signup', user, pass);
}

export function verify(user, token) {
    return api.post('/login/verify', {
        user,
        token,
    });
}



window.parent?.openLogin && document.querySelectorAll('.login').forEach(el => {
    // console.log('here')

    function setLoginLink() {
        el.innerHTML = auth.user
        ? ``
        : `(<a href="#">log in</a>)`
    }
    setLoginLink()
    addAuthTrigger(setLoginLink)

    el.addEventListener('click', e => {
        // console.log('click')
        auth.user
        ? logout()
        : window.parent.openLogin()
    })
})