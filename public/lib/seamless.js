(() => {
    if (window.self !== window.top) {
        // document.body.style.background = 'none'; add to css instead
        document.body.classList.add('seamless');
        window.parent.document.querySelector('iframe').parentElement.classList.add('seamless');
        window.embedded = true
    }
})()