import db from '.'

db.connect('mongodb://localhost/site', async () => {

    // nothing to initialize

    db.close()
})