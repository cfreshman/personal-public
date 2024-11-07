export const a_get_geo = async () => {
    return await new Promise<any>(resolve => {
        navigator.geolocation.getCurrentPosition(position => {
            resolve({ lat:position.coords.latitude, long:position.coords.longitude })
        }, error => {
            // default to Providence RI
            resolve({ lat:41.824286, long:-71.41254, fake:true })
        })
    })
}