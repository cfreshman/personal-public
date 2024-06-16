{
    const TWITTER_EMBED_WIDGET_MARGIN = '8px', TEWM = TWITTER_EMBED_WIDGET_MARGIN
    window['TE'] = window['iframe_twitter_embed'] = {
        TWITTER_EMBED_WIDGET_MARGIN, TEWM,
        render: 
        (value) => 
        `<iframe height=760 width=550`
        +` style="border:0;margin:-${TEWM};clip-path:polygon(${TEWM} ${TEWM}, ${TEWM} calc(100% - ${TEWM}), calc(100% - ${TEWM}) calc(100% - ${TEWM}), calc(100% - ${TEWM}) ${TEWM})"`
        +` src=data:text/html;charset=utf-8,`
        + encodeURIComponent(
            `<style>:root{font-family:monospace;padding:0}</style>`
            +value
            )
        +`></iframe>`
    }
    console.debug({iframe_twitter_embed})
}
