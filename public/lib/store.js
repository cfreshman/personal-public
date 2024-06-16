function fetchCookie(name) {
  const namedCookie = document.cookie
    .split(';').reverse()
    .find(cookie => cookie.startsWith(name));
  const cookieValue = namedCookie ? namedCookie.split('=')[1] : false
  return cookieValue ? JSON.parse(cookieValue) : undefined;
}
function saveCookie(name, value, str=false) {
  // save cookie for ten years
  document.cookie = `${name}=${str ? value : JSON.stringify(value)};expires=${60*60*24*365*10};domain=${location.host.split('.').slice(-2).join('.')}`;
    // fetchCookie(name);
}

function fetchCookies(names) {
  return {...names.map(name => ({ [name]: fetchCookie(name) }))}
}
function saveCookies(object) {
  Object.entries(object).map(entry => saveCookie(...entry));
}

function getStored(key) {
  let str = window.localStorage.getItem(key);
  return str ? JSON.parse(str) : fetchCookie(key)
}
function setStored(key, value) {
  const str = JSON.stringify(value)
  window.localStorage.setItem(key, str)
  saveCookie(key, str, true)
  // return getStored(key)
  return value
}
function clearStored(key) {
  window.localStorage.removeItem(key)
  document.cookie = `${key}=;expires=0`;
}

window.store = {
  get: getStored,
  set: setStored,
  clear: clearStored,
}